
# Array of chunks. Each chunk is either text or a control sequence. A control sequence might have metadata and also a payload, which is an array of textons that each can have their own metadata. 



import macros
import variables
import ctrlseq
import result
import confirm
import discourseVars
import token_stream
import chooser

import sys


class ParseParams:

	VALID_STRATEGIES = ["random", "author", "longest", "shortest", "pair"]

	def __init__(self, chooseStrategy="random", setDefines=[], doConfirm=False, discourseVarChance=80, originalText="", fileSetKey="", onlyShow=[], endMatter=[]):
		if chooseStrategy not in self.VALID_STRATEGIES:
			raise ValueError("Unrecognized choose strategy '%s'" % chooseStrategy)
		self.chooseStrategy = chooseStrategy
		self.setDefines = setDefines
		self.doConfirm = doConfirm
		self.discourseVarChance = discourseVarChance
		self.originalText = ""
		self.fileSetKey = fileSetKey
		self.onlyShow = onlyShow
		self.endMatter = endMatter

	def __str__(self):
		return "chooseStrategy: %s, setDefines: %s, discourseVarChance: %d" % (self.chooseStrategy, self.setDefines, self.discourseVarChance)

	def copy(self):
		return ParseParams(chooseStrategy=self.chooseStrategy, setDefines=list(self.setDefines), discourseVarChance=self.discourseVarChance, originalText=self.originalText, fileSetKey=self.fileSetKey, onlyShow=self.onlyShow, endMatter=self.endMatter)


# Call with an object of type ParseParams.
def parse(preppedTokens, sourceText, parseParams):
	parseParams.originalText = sourceText

	# Handle the rendering.
	try:
		if parseParams.doConfirm:
			confirm.process(parseParams.fileSetKey, parseParams.onlyShow, preppedTokens, sourceText, ParseParams())
		renderedString = handleParsing(preppedTokens, parseParams)
	except result.ParseException, e:
		print e
		return e.result
	output = result.Result(result.PARSE_RESULT)
	output.package = renderedString
	return output

def handleParsing(tokens, params):
	renderedChunks = process(tokens, params)
	renderedString = ''.join(renderedChunks)
	renderedString = macros.expand(renderedString, params)
	return renderedString



# Save all the control sequences we process with a given key.

stored_ctrlseqs = {}

def reset_stored_ctrlseqs():
	global stored_ctrlseqs
	chooser.resetIter("ctrlSeqIds")
	stored_ctrlseqs = {}

def save_ctrlseq(id, ctrlseq):
	global stored_ctrlseqs
	stored_ctrlseqs[id] = ctrlseq

def get_ctrlseq(id):
	global stored_ctrlseqs
	if id in stored_ctrlseqs:
		return stored_ctrlseqs[id]
	return None


# The lexer should have guaranteed that we have a series of TEXT tokens interspersed with sequences of others nested between CTRLBEGIN and CTRLEND with no issues with nesting or incomplete tags.
def process(tokens, parseParams):
	output = []
	reset_stored_ctrlseqs()
	discourseVars.resetStats()
	tokenStream = token_stream.TokenStream(tokens)
	nextSection = tokenStream.next()
	while nextSection is not None:
		rendered = ""
		if tokenStream.wasText():
			rendered = nextSection[0].value
		else:
			if nextSection[1].type == "CTRLSEQ_LABEL":
				seqid = nextSection[1].value
			else:
				seqid = chooser.iter("ctrlSeqIds")
			save_ctrlseq(seqid, nextSection)
			rendered = ctrlseq.render(nextSection, parseParams)

		output.append(rendered)
		nextSection = tokenStream.next()
		
	discourseVars.showStats(variables)
	return output



