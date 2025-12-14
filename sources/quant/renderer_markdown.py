# coding=utf-8


import renderer
import re
import fileio
import chooser

class RendererMarkdown(renderer.Renderer):

	def render(self):
		self.makeStagedFile()
		self.makeOutputFile()

	def makeStagedFile(self):
		pass

	def makeOutputFile(self):
		print "Rendering to Markdown."
		self.collapsedText = prepForMarkdownOutput(self.collapsedText)
		workFile = self.renderFormattingSequences(self.params)
		workFile = specialMarkdownFixes(workFile)
		if self.params.doFront:
			workFile = generateFrontMatter(self.params.seed) + workFile
		postMarkdownificationSanityCheck(workFile)
		outputFileName = "%s%s.md" % (self.params.outputDir, self.params.fileId)
		fileio.writeOutputFile(outputFileName, workFile)

	def suggestEndMatters(self):
		return renderer.suggestEndMatterWhenNoPageLimits(self.params.seed)

	def renderFormattingSequence(self, contents, renderParams):
		code = contents[0]
		if code == "part":
			partNum = contents[1]
			partTitle = contents[2]
			return "\n\n# " + partNum + ": " + partTitle
		if code == "endmatter":
			title = contents[1]
			return "\n\n# " + title
		if code == "epigraph":
			epigraph = contents[1]
			source = contents[2]
			return "\n\n" + indent(epigraph) + "\n>\n>" + source + "\n\n"
		if code == "end_part_page":
			return "\n\n"
		if code == "chapter":
			chapNum = contents[1]
			intro = "" if chapNum == "EPILOGUE" else "Chapter "
			return "\n\n# " + intro + chapNum + "\n\n"
		if code == "section_break":
			return "\n***\n"
		if code == "verse" or code == "url":
			text = indent(contents[1])
			return "\n\n" + text + "\n\n"
		if code == "verse_inline" or code == "verse_inline_sc":
			text = indent(contents[1])
			return "\n" + text + "\n"
		if code == "pp" or code == "finish_colophon":
			return "\n\n"
		if code == "i":
			text = contents[1]
			return "*" + text + "*"
		if code == "b":
			text = contents[1]
			return "**" + text + "**"
		if code == "sc" or code == "scwide":
			text = contents[1]
			return text.upper()
		if code == "vspace":
			# TODO: Make this work if there's a need.
			return "\n\n\n"
		if code == "start_colophon":
			header = contents[1]
			return "\n\n# " + header + "\n\n"
		if code == "columns":
			return "\n\n<div class='columns'>"
		if code == "end_columns":
			return "</div>\n\n"

		raise ValueError("Unrecognized command '%s' in formatting sequence '%s'" % (code, contents)) 


def indent(text):
	lines = text.split('\n')
	lines_indented = map(lambda line: "> " + line + "", lines)
	return '\n'.join(lines_indented)

def prepForMarkdownOutput(text):
	# Fixes that need to happen before we expand formatting sequences.

	# Fix extra spacing around {pp} tags.
	text = re.sub(r"[\n ]*\{pp\}[\n ]*", "{pp}", text)

	# Remove Latex explicit line break markers
	text = re.sub(r"\\\\[ ]*\n", "  \n", text)
	text = re.sub(r"\\\\[ ]*", "  \n", text)

	return text

def specialMarkdownFixes(text):
	# Fixes that should happen after all output is rendered.
	# Fix unicode quotes and special chars
	text = re.sub(r"…", "...", text)
	text = re.sub(r"—", "---", text)

	# Collapse multiple line breaks in a row (before formatter adds any)
	text = re.sub(r"[\n]{3,}", "\n\n", text)

	# Fix single spaces at start of new lines (we can't get rid of these earlier because we might have a tag like {pp} we haven't processed yet, but we only look for single spaces to avoid removing epigraph indents.)
	text = re.sub(r"\n (\w)", r"\n\1", text)

	return text

def postMarkdownificationSanityCheck(text):
	# Look for unexpected characters etc. here
	pos = text.find('{')
	if pos is not -1:
		raise ValueError("Found invalid underscore '{' character on line %d:\n%s" % (result.find_line_number(text, pos), result.find_line_text(text, pos)) )


def generateFrontMatter(seed):
	text = ""
	
	seedPrinted, msg = renderer.frontMatterSeedMessage(seed, [])
	msg = msg.replace("NUM_SIGN", "#")

	if seed == -1:
		text = """
This is a special Advance Reader Copy of *Subcutanean*. In the final version, each printing of the book will be unique, generated from a specific seed. Words, sentences, or whole scenes may appear in some printings but not in others, or vice versa. No two copies will be alike.

For now, each Advance Reader Copy in this printing shares the same seed, and the same text.

subcutanean.textories.com
"""
	elif renderer.isAmazonCopy(seed):
		text = """The book you're holding is just one version of this story. *Subcutanean* is a permutational novel: there are millions of ways it can be told. This is the version generated from seed %s.

If you're curious, you can find out in the back of the book how to get your own unique copy which might include words, sentences, even entire scenes that don't appear in this version, or play out in different ways.

But there's no need to worry about all that right now. All the books contain the same story, more or less. For now, this is the one you have.

This is the one that's happening to you.""" % seedPrinted
	else:
		text = """
The book you’re holding is unique. There is no other exactly like it.

Each printing of *Subcutanean* is different. This is the one and only version generated from seed #%s. Words, sentences, or whole scenes may appear in this printing but not in others, or vice versa. No two copies are alike.

But all of them are the same story, more or less. Don't worry about what's in the other versions. They don't matter. This is the one you have.

This is the one that's happening to you.

subcutanean.textories.com
""" % seedPrinted
	return text


