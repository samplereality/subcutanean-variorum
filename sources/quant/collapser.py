#!/usr/bin/python
# coding=utf-8

# TODO: Proof 01915 has Part 3 starting on the wrong page. 

# TODO: Need to address the problem of authoring [DEFINE @A|@B], writing [A>text1|text2] somewhere, and then adding a @C and not catching the new edge case. On the one hand we ideally want to support [A>|] as a generic "else" clause (see @ffset vs the two tube options), but I'm really worried this will lead to a mistake slipping through. (The other version is also a problem, if we have [A>text1|B>text2], still printing nothing in the case of C.)

# TODO: add a sanity check for missing end punctuation, a la "ending Then". How to distinguish this from "following Niko" or "the Grapple" or "of Dhalgren"?

# TODO: add a confirm check for the pattern [MACRO x][y] (because generally with a macro like this we always want to print it.)

import sys
import getopt
import re

import fileio
import collapse
import quantparse
import chooser
import differ
import hasher
import variables
import result
import renderer
import renderer_latex
import renderer_text
import renderer_html
import renderer_markdown
import renderer_epub
import renderer_mobi
import renderer_tweet

outputDir = "output/"
workDir = "work/"
alternateOutputFile = "alternate"



def showUsage():
	print """Usage: collapser options
Arguments:
  --help              Show this message
  --input=x,y,z       Alternate file(s) or manifest file(s) to load
                        (default: full-book-manifest.txt)
  --only=x,y          A subset of loaded files to render. 
  --output=x	      Format to output (default none)
                      "pdf" (for POD), "pdfdigital" (for online use),
                      "txt", "html", "md", "epub", "mobi", "tweet"
  --file=x            Write output to this filename (default = seed/strategy)
  --seed=             What seed to use in book generation (default: next)
             N          Use the given integer
             random     Use a purely random seed
  --gen=x             What generation of seeds to use (default 9)
                        (0=ARC, 1=backers, 2=USB, 3=public, 9=test)
  --strategy=x        Selection strategy.
             "random"   default
             N          Make N copies with "random" strategy
             "author"   Author's preferred
             "pair"     Two versions optimizing for difference
             "longest"
             "shortest"
  --set=x,y,z	      A list of variables to set true for this run.
                      Preface with ^ to negate
  --discourseVarChance=x Likelihood to defer to a discourse var (default 80)
  --skipConfirm	      Skip variant confirmation
  --skipPadding       Skip padding to 232 pages
  --skipFront         Skip frontmatter
  --endMatter=x,y     Add specific end matter files (default auto)
  --skipEndMatter	  Don't add end matter
"""


def main():

	print """Collapser\n"""

	inputFiles = ["full-book-manifest.txt"]
	inputFileDir = "chapters/"
	outputFile = ""
	inputText = ""
	outputText = ""
	seed = -1
	generation = 9
	strategy = "random"
	outputFormat = ""
	doFront = True
	doConfirm = True
	setDefines = []
	discourseVarChance = 80
	skipPadding = False
	endMatter = ["auto"]
	randSeed = False
	isDigital = False
	copies = 1
	onlyShow = []

	VALID_OUTPUTS = ["pdf", "pdfdigital", "txt", "html", "md", "epub", "mobi", "tweet", "none"]

	opts, args = getopt.getopt(sys.argv[1:], "", ["help", "seed=", "strategy=", "output=", "skipConfirm", "skipFront", "set=", "discourseVarChance=", "skipPadding", "input=", "only=", "endMatter=", "skipEndMatter", "file=", "gen="])
	if len(args) > 0:
		print "Unrecognized arguments: %s" % args
		sys.exit()
	for opt, arg in opts:
		if opt == "--input":
			inputFiles = arg.split(',')
		elif opt == "--file":
			if len(re.findall(r"(\/|(\.(pdf|tex|txt)))", arg)) > 0:
				print "Please do not include paths or file extensions in output file (use --output to specify format)."
				sys.exit()
			outputFile = arg
		elif opt == "--help":
			print "Help."
			showUsage()
			sys.exit()
		elif opt == "--seed":
			if arg == "random":
				randSeed = True
			else:
				try:
					seed = int(arg)
				except:
					print "Invalid --seed parameter '%s': not an integer." % arg
					sys.exit()
		elif opt == "--gen":
			try:
				generation = int(arg)
			except:
				print "Invalid --gen parameter '%s': not an integer." % arg
				sys.exit()
		elif opt == "--strategy":
			try:
				copies = int(arg)
				strategy = "random"
			except:
				if arg not in quantparse.ParseParams.VALID_STRATEGIES:
					print "Invalid --strategy parameter '%s': must be one of %s" % (arg, quantparse.ParseParams.VALID_STRATEGIES)
				strategy = arg
		elif opt == "--output":
			if arg != "" and arg not in VALID_OUTPUTS:
				print "Invalid --output parameter '%s': must be one of %s" % (arg, VALID_OUTPUTS)
			if arg == "pdfdigital":
				arg = "pdf"
				isDigital = True
			outputFormat = arg
			if arg == "none":
				outputFormat = ""
		elif opt == "--skipConfirm":
			doConfirm = False
		elif opt == "--skipFront":
			doFront = False
		elif opt == "--set":
			setDefines = arg.split(',')
		elif opt == "--only":
			onlyShow = arg.split(',')
			print "Setting onlyShow: %s" % onlyShow
		elif opt == "--discourseVarChance":
			try:
				discourseVarChance = int(arg)
			except:
				print "Invalid --discourseVarChance parameter '%s': not an integer." % arg
				sys.exit()
		elif opt == "--skipPadding":
			skipPadding = True
		elif opt == "--endMatter":
			endMatter = arg.split(',')
			print "Setting endMatter: %s" % endMatter
		elif opt == "--skipEndMatter":
			if endMatter[0] != "auto":
				print "Can't set --endMatter and also --skipEndMatter."
				sys.exit()
			endMatter = []

	if seed is not -1 and strategy != "random":
		print "*** You set seed to %d but strategy to '%s'; a seed can only be used when strategy is 'random' ***\n" % (seed, strategy)
		sys.exit()

	if seed is not -1 and len(setDefines) is not 0:
		print "*** You set seed to %d but also set variables %s; you need to do one or the other ***\n" % (seed, setDefines)
		sys.exit()

	if strategy != "random" and strategy != "pair" and outputFile == "":
		outputFile = strategy
		print "Setting output file to strategy name '%s' (b/c we don't have a seed for strategies other than random and pair)" % outputFile

	parseParams = quantparse.ParseParams(chooseStrategy = strategy, setDefines = setDefines, doConfirm = doConfirm, discourseVarChance = discourseVarChance, onlyShow = onlyShow, endMatter = endMatter)
	renderParams = renderer.RenderParams(outputFormat = outputFormat, fileId = outputFile, seed = seed, randSeed = randSeed, doFront = doFront, skipPadding = skipPadding, workDir = workDir, outputDir = outputDir, isDigital = isDigital, copies = copies, parseParams = parseParams, finalOutput = True, pairInfo = [], generation = generation)

	makeBooks(inputFiles, inputFileDir, parseParams, renderParams)




def makeBooks(inputFiles, inputFileDir, parseParams, renderParams):
	if parseParams.chooseStrategy == "pair":
		try:
			makePairOfBooks(inputFiles, inputFileDir, parseParams, renderParams)
		except renderer.TooLongError as e:
			print "\n*** ERROR : %s\n" % e.strerror
			print "*** We could not generate both books, so halting."
			sys.exit()

	else:
		skippedSeeds = []
		copies = renderParams.copies
		origEndMatter = [] + parseParams.endMatter
		while copies >= 1:
			try:
				makeBookWithEndMatter(inputFiles, inputFileDir, parseParams, renderParams)
			except renderer.TooLongError as e:
				print "\n*** ERROR : %s\n" % e.strerror
				if copies > 1:
					print "*** Trying again with next seed."
				skippedSeeds.append(renderParams.seed)
			copies -= 1
			renderParams.seed = -1
			renderParams.fileId = ""
			parseParams.endMatter = [] + origEndMatter
			renderParams.finalOutput = False
			if copies > 0:
				print "\n\n%d cop%s left to generate.\n" % (copies, "y" if copies is 1 else "ies")

		if len(skippedSeeds) > 0:
			print "\n\n*** ERRORS (%d) prevented some copies being generated. Bad seeds were: %s\n" % (len(skippedSeeds), skippedSeeds)

def makeBookWithEndMatter(inputFiles, inputFileDir, parseParams, renderParams):
	doingEndMatter = len(parseParams.endMatter) == 1 and parseParams.endMatter[0] == "auto"
	if doingEndMatter:
		savedSkipPadding = renderParams.skipPadding
		renderParams.skipPadding = True
		renderParams.finalOutput = False

	makeBook(inputFiles, inputFileDir, parseParams, renderParams)

	#End Matter
	if doingEndMatter:
		endMatters = renderParams.renderer.suggestEndMatters()
		print "Suggested End Matter: %s" % endMatters
		if len(endMatters) > 0:
			print "Re-rendering..."
			parseParams.endMatter = endMatters
			renderParams.randSeed = False
			parseParams.doConfirm = False
			renderParams.skipPadding = savedSkipPadding
			renderParams.finalOutput = True
			makeBook(inputFiles, inputFileDir, parseParams, renderParams)	

def makePairOfBooks(inputFiles, inputFileDir, parseParams, renderParams):
	tries = 20
	texts = []
	seeds = []
	signatures = []
	origEndMatter = parseParams.endMatter
	seed = chooser.nextSeed(renderParams.generation)
	
	# Manually skip the ones we pulled out for Amazon.
	if renderer.isAmazonCopy(seed):
		seed = chooser.nextSeed(renderParams.generation)

	firstSeed = seed
	lastSeed = -1
	for x in range(tries):
		seeds.append(seed)
		renderParams.seed = seed
		collapsed = collapseInputText(inputFiles, inputFileDir, parseParams)
		texts.append(collapsed)
		signature = getSignature(collapsed)
		signatures.append(signature)
		# fileio.writeOutputFile("work/signature-%s.txt" % seed, signature)
		lastSeed = seed
		seed = chooser.nextSeed(renderParams.generation)
	leastSimilarPair = differ.getTwoLeastSimilar(signatures)
	text0 = texts[leastSimilarPair[0]]
	seed0 = seeds[leastSimilarPair[0]]
	text1 = texts[leastSimilarPair[1]]
	seed1 = seeds[leastSimilarPair[1]]
	print "Will now render %s and %s." % (seed0, seed1)

	renderParams.seed = seed0
	parseParams.chooseStrategy = "random"
	renderParams.fileId = ""
	renderParams.pairInfo = [firstSeed, lastSeed, seed0, seed1]
	setOutputFile(renderParams, parseParams)
	makeBookWithEndMatter(inputFiles, inputFileDir, parseParams, renderParams)

	renderParams.seed = seed1
	renderParams.fileId = ""
	parseParams.endMatter = origEndMatter
	setOutputFile(renderParams, parseParams)
	makeBookWithEndMatter(inputFiles, inputFileDir, parseParams, renderParams)


def getSignature(txt):
	sig = variables.__v.getSignature()
	return sig

def makeBook(inputFiles, inputFileDir, parseParams, renderParams):
	setFinalSeed(renderParams, parseParams)
	setOutputFile(renderParams, parseParams)
	chooser.resetAllIters()
	print "\n\n*** makeBook %s %s****************************\n" % (renderParams.fileId, "(prelim) " if not renderParams.finalOutput else "")
	collapsedText = collapseInputText(inputFiles, inputFileDir, parseParams)
	render(collapsedText, renderParams)

def setFinalSeed(renderParams, parseParams):
	thisSeed = renderParams.seed
	if parseParams.chooseStrategy != "random":
		print "Ignoring seed (b/c chooseStrategy = %s)" % parseParams.chooseStrategy
	elif renderParams.randSeed:
		print "(Ignoring --gen=%d because --seed=random)" % renderParams.generation
		renderParams.generation = -1
		thisSeed = chooser.randomSeed()
		print "Seed (purely random): %d" % thisSeed
	elif thisSeed is -1:
		thisSeed = chooser.nextSeed(renderParams.generation)
		print "Seed (next): %d" % thisSeed
	else:
		chooser.setSeed(thisSeed)
		print "Seed (requested): %d" % thisSeed
	renderParams.seed = thisSeed	

def setOutputFile(renderParams, parseParams):
	if renderParams.fileId == "":
		renderParams.fileId = renderParams.seed


def render(collapsedText, renderParams):
	outputFormat = renderParams.outputFormat
	if outputFormat != "":
		if outputFormat == "pdf":
			renderParams.renderer = renderer_latex.RendererLatex(collapsedText, renderParams)
		elif outputFormat == "txt":
			renderParams.renderer = renderer_text.RendererText(collapsedText, renderParams)
		elif outputFormat == "html":
			renderParams.renderer = renderer_html.RendererHTML(collapsedText, renderParams)
		elif outputFormat == "md":
			renderParams.renderer = renderer_markdown.RendererMarkdown(collapsedText, renderParams)
		elif outputFormat == "epub":
			renderParams.renderer = renderer_epub.RendererEPub(collapsedText, renderParams)
		elif outputFormat == "mobi":
			renderParams.renderer = renderer_mobi.RendererMobi(collapsedText, renderParams)
		elif outputFormat == "tweet":
			renderParams.renderer = renderer_tweet.RendererTweet(collapsedText, renderParams)

		if renderParams.renderer is None:
			print "No rendering requested or available."
		else:
			renderParams.renderer.render()



def collapseInputText(inputFiles, inputFileDir, parseParams):
	params = parseParams
	fileContents = []
	fileList = []
	for iFile in inputFiles:
		res = readManifestOrFile(iFile, inputFileDir, params)
		fileContents = fileContents + res["files"]
		fileList = fileList + res["fileList"]
	fileSetKey = hasher.hash(''.join(fileList))
	params.fileSetKey = fileSetKey

	selectionTexts = []
	if len(params.onlyShow) == 0:
		selectionTexts = fileContents
	else:
		for pos, file in enumerate(fileContents):
			if fileList[pos] in params.onlyShow:
				print "Selecting %s" % fileList[pos]
				selectionTexts.append(file)
		if len(selectionTexts) == 0:
			print "Something went wrong; nothing was selected for output. params.onlyShow was '%s'" % params.onlyShow
			sys.exit()
	
	# Add end matter.
	if len(params.endMatter) > 0 and params.endMatter[0] != "auto":
		for em in params.endMatter:
			em = readManifestOrFile(em, inputFileDir, params)
			emContents = em["files"][0]
			selectionTexts.append(emContents)

	joinedSelectionTexts = ''.join(selectionTexts)
	joinedAllTexts = ''.join(fileContents)
	try:
		res = collapse.go(joinedAllTexts, joinedSelectionTexts, params)
	except result.ParseException as e:
		print e.result
		sys.exit()
	if not res.isValid:
		print res
		sys.exit()
	collapsedText = res.package
	collapsedText = postCollapseCleanup(collapsedText)

	if len(variables.showVars()) < 4:
		print "Suspiciously low number of variables set (%d). At this point we should have set every variable defined in the whole project. Stopping."
		sys.exit()

	fileio.writeOutputFile(workDir + "collapsed.txt", collapsedText)

	return collapsedText

def postCollapseCleanup(txt):
	txt = txt.replace("AUTHOREMAIL", "aareed + subq @ gmail.com")
	return txt

def readManifestOrFile(inputFile, inputFileDir, params):
	filePath = inputFileDir + inputFile
	inputText = fileio.readInputFile(filePath)
	fileList = []
	files = []
	if inputText[:10] == "# MANIFEST":
		print "Reading manifest '%s'" % filePath
		fileList = fileio.getFilesFromManifest(inputText)
		files = fileio.loadManifestFromFileList(inputFileDir, fileList)
	else:
		print "Reading file '%s'" % filePath
		fileHeader = fileio.getFileId(inputFile)
		fileList = [inputFile]
		files = [fileHeader + inputText]
	return {
		"fileList": fileList,
		"files": files
	}




main()
