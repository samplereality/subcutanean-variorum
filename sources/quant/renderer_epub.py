# coding=utf-8


import renderer
import re
import fileio
import renderer_markdown
import sys
import terminal

class RendererEPub(renderer.Renderer):

	def render(self):
		self.makeStagedFile()
		self.makeOutputFile()

	def makeStagedFile(self):
		renderer = renderer_markdown.RendererMarkdown(self.collapsedText, self.params)
		renderer.render()

	def makeOutputFile(self):
		print "Rendering to epub."
		workDir = self.params.workDir
		outputDir = self.params.outputDir
		inputFile = "%s%s.md" % (outputDir, self.params.fileId)
		outputFile = "%s%s.epub" % (workDir, self.params.fileId)
		title = generateTitle(self.params.seed)
		fileio.writeOutputFile(workDir + "title.md", title)
		outputEPub(workDir, inputFile, outputFile)
		if self.params.finalOutput:
			terminal.move(outputFile, "%s%s.epub" % (outputDir, self.params.fileId))
			terminal.move("%s%s.md" % (outputDir, self.params.fileId), "%s%s.md" % (workDir, self.params.fileId))

	def renderFormattingSequence(self, contents):
		pass

	def suggestEndMatters(self):
		return renderer_markdown.RendererMarkdown(self.collapsedText, self.params).suggestEndMatters()


def generateTitle(seed):
	if seed == -1:
		seed = "01893-b"
	return """---
title: Subcutanean %s
author: Aaron A. Reed
rights: All Rights Reserved
language: en-US
date: 2020-02-02
cover-image: fragments/subcutanean-ebook-cover.jpg
...

""" % seed

# Note: This requires pandoc to be installed on the OS.
def outputEPub(outputDir, inputFile, outputFile):
	result = terminal.runCommand('pandoc', '%stitle.md %s -o %s --css=fragments/epub.css --toc' % (outputDir, inputFile, outputFile))
	if not result["success"]:
		print "*** Couldn't run pandoc; aborting."
		print result["output"]
		sys.exit()
