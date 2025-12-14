# coding=utf-8


import renderer
import re
import fileio
import renderer_epub
import sys
import terminal

class RendererMobi(renderer.Renderer):

	def render(self):
		self.makeStagedFile()
		self.makeOutputFile()

	def makeStagedFile(self):
		renderer = renderer_epub.RendererEPub(self.collapsedText, self.params)
		renderer.render()

	def makeOutputFile(self):
		print "Rendering to mobi."
		# We start with an .epub file in the outputDir.
		inputFile = "%s%s.epub" % (self.params.workDir, self.params.fileId)
		if self.params.finalOutput:
			inputFile = "%s%s.epub" % (self.params.outputDir, self.params.fileId)
		outputEPub(inputFile)
		# Now we also have a .mobi file in the outputDir.
		# If final output, move the .epub file to work.
		if self.params.finalOutput:
			terminal.move(inputFile, "%s%s.epub" % (self.params.workDir, self.params.fileId))

	def renderFormattingSequence(self, contents):
		pass

	def suggestEndMatters(self):
		return renderer_epub.RendererEPub(self.collapsedText, self.params).suggestEndMatters()



# Note: This requires KindleGen to be installed on the OS.
def outputEPub(inputFile):
	result = terminal.runCommand('./kindlegen/kindlegen', '%s' % (inputFile))
	if not result["success"]:
		print "*** Couldn't run kindlegen; aborting."
		print result["output"]
		sys.exit()
