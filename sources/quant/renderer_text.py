# coding=utf-8


import renderer
import re
import fileio
import chooser

class RendererText(renderer.Renderer):

	def render(self):
		print "Rendering to plain text."
		self.makeStagedFile()
		self.makeOutputFile()

	def makeStagedFile(self):
		pass

	def makeOutputFile(self):
		self.collapsedText = prepForTextOutput(self.collapsedText)
		workFile = self.renderFormattingSequences(self.params)
		workFile = specialTextFixes(workFile)
		if self.params.doFront:
			workFile = addTextFrontMatter(workFile, self.params.seed, self.params.pairInfo)
		postTextificationSanityCheck(workFile)
		outputFileName = "%s%s.txt" % (self.params.outputDir, self.params.fileId)
		fileio.writeOutputFile(outputFileName, workFile)

	def suggestEndMatters(self):
		return renderer.suggestEndMatterWhenNoPageLimits(self.params.seed)

	def renderFormattingSequence(self, contents, renderParams):
		code = contents[0]
		if code == "part":
			partNum = contents[1]
			partTitle = contents[2]
			return "\n\n\n\n\n" + partNum + "\n\n" + partTitle + "\n\n"
		if code == "endmatter":
			title = contents[1]
			return "\n\n\n\n\n" + title + "\n\n"
		if code == "epigraph":
			epigraph = contents[1]
			source = contents[2]
			if renderParams.twitterEpigraph:
				# Wrap in quotes and cite up front, to avoid confusion.
				return "\n\nFrom " + source + ":\n\n\"" + epigraph + "\"\n\n"
			else:
				return "\n\n" + epigraph + "\n\n" + source + "\n\n"
		if code == "end_part_page":
			return "\n\n"
		if code == "chapter":
			chapNum = contents[1]
			intro = "" if chapNum == "EPILOGUE" else "Chapter "
			return "\n\n\n\n" + intro + chapNum + "\n\n\n"
		if code == "section_break":
			return "\n#\n"
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
			return "_" + text + "_"
		if code == "b":
			text = contents[1]
			return "*" + text + "*"			
		if code == "sc" or code == "scwide":
			text = contents[1]
			return text.upper()
		if code == "vspace":
			# TODO: Make this work if there's a need.
			return "\n\n\n"
		if code == "start_colophon":
			title = contents[1]
			return "\n\n\n\n\n" + title + "\n"
		if code == "columns" or code == "end_columns":
			return "\n"

		raise ValueError("Unrecognized command '%s' in control sequence '%s'" % (code, contents)) 


def indent(text):
	lines = text.split('\n')
	lines_indented = map(lambda line: "\t" + line, lines)
	return '\n'.join(lines_indented)

def prepForTextOutput(text):
	# Fixes that need to happen before we expand formatting sequences.

	# Get rid of extra whitespace on lines.
	text = re.sub(r"\n[ \t]*\n", "\n\n", text)

	# Collapse multiple line breaks in a row (before formatter adds any)
	text = re.sub(r"[\n ]{3,}", "\n\n", text)

	# Remove space at start of lines (before formatter adds any)
	text = re.sub(r"\n[ \t]*", "\n", text)

	# Fix extra spacing around {pp} tags.
	text = re.sub(r"[\n ]*\{pp\}[\n ]*", "{pp}", text)

	# Remove Latex explicit line break markers
	text = re.sub(r"\\\\[ ]*\n", "\n", text)
	text = re.sub(r"\\\\[ ]*", "\n", text)

	return text

def specialTextFixes(text):
	# Fixes that should happen after all output is rendered.
	# Fix unicode quotes and special chars
	text = re.sub(r"’", "'", text)
	text = re.sub(r"‘", "'", text)
	text = re.sub(r"“", '"', text)
	text = re.sub(r"”", '"', text)
	text = re.sub(r"…", "...", text)
	text = re.sub(r"—", "---", text)

	# Fix single spaces at start of new lines (we can't get rid of these earlier because we might have a tag like {pp} we haven't processed yet, but we only look for single spaces to avoid removing epigraph indents.)
	text = re.sub(r"\n (\w)", r"\n\1", text)

	# Fix doubled spaces.
	text = re.sub(r"[ ]{2,}", " ", text)

	return text

def addTextFrontMatter(text, seed, pairInfo):
	seedPrinted, msg = renderer.frontMatterSeedMessage(seed, pairInfo)
	msg = msg.replace("NUM_SIGN", "#")
	front = "*** SUBCUTANEAN ***\n\nby Aaron A. Reed\n\n\n========================\nEach rendering of Subcutanean is different. " + msg + "\n========================\n\n"
	return front + text

def postTextificationSanityCheck(text):
	# Look for unexpected characters etc. here
	pos = text.find('{')
	if pos is not -1:
		raise ValueError("Found invalid underscore '{' character on line %d:\n%s" % (result.find_line_number(text, pos), result.find_line_text(text, pos)) )



