# coding=utf-8
# Code to weight random choices towards consistent narratorial styles based on quick classifications of variants; variables set randomly in globals.txt affect which of these are turned on for any given generation. Blog post about this here: https://medium.com/@aareed/intentional-collapse-plausibly-human-randomized-text-e901220cbc3d

import re
import chooser
from textblob import TextBlob

dpStats = {}
showTrace = False

# Thoughts:
# - Narrator who prefers big words?

def resetStats():
	global dpStats
	dpStats = {"wordy": 0, "succinct": 0, "depressive": 0, "optimist": 0, "subjective": 0, "objective": 0, "bigwords": 0, "slang": 0, "formal": 0, "alliteration": 0, "noalliteration": 0, "avoidme": 0, "likesimile": 0, "dislikesimile": 0, "avoiddialogue": 0}


def showStats(vars):
	global dpStats
	# print "*******************************************************"
	# print "How many times set discourse variables changed text weight:"
	# print dpStats
	# filteredStats = {k, v for k, v in dpStats.items() if vars.check(k) }
	# filtered = dict(filter(lambda i: vars.check(i[0]), dpStats.items()))
	# print filtered
	# print "*******************************************************"

trace_output = ""
def trace(txt):
	global trace_output
	trace_output += "%s\n" % txt

def clear_trace():
	global trace_output
	trace_output = ""

def show_trace():
	global trace_output
	if showTrace:
		print trace_output

def getDiscoursePreferredVersion(alts, vars):
	# For each discourse variable set, rank each alt for desireability. Return something weighted for the highest-ranked options.
	# TODO only outside quoted dialogue.
	# TODO if we have one short and one long alternative, the longer one will tend to get penalized more, and less often chosen.
	global dpStats
	dpQuality = []
	tracker = dpStats["avoiddialogue"]
	clear_trace()
	trace("******** %s" % alts)
	if len(alts.alts) == 1:
		trace("/// YES OR NO ///")
	for pos, item in enumerate(alts.alts):
		dpQuality.append(0)

	# TODO: should these be scaled so they all have equal importance? If so how?

	posOfBiggestWordLen = -1
	biggestWordLen = -1
	skipBiggest = False

	for pos, item in enumerate(alts.alts):

		if vars.check("wordy"):
			if len(item.txt) == len(alts.getLongest()) and len(item.txt) > 30:
				trace("(Rewarding '%s' b/c @wordy and this is longest)" % item.txt)
				dpStats["wordy"] += 1
				dpQuality[pos] += 1
		elif vars.check("succinct"):
			if len(item.txt) == len(alts.getShortest()):
				trace("(Rewarding '%s' b/c @succinct and this is shortest)" % item.txt)
				dpStats["succinct"] += 1
				dpQuality[pos] += 1

		if vars.check("bigwords"):
			wordLen = getAvgWordLen(item.txt)
			if wordLen <= 2:
				skipBiggest = True
			elif wordLen > biggestWordLen:
				posOfBiggestWordLen = pos
				biggestWordLen = wordLen

		if vars.check("slang") or vars.check("formal"):
			slanginess = findSlangWords(item.txt)
			if slanginess > 0:
				if vars.check("slang"):
					trace("(Rewarding '%s' b/c @slang and %d informal words found." % (item.txt, slanginess))
					dpStats["slang"] += 1
					dpQuality[pos] += 1
				elif vars.check("formal"):
					trace("(Penalizing '%s' b/c @formal and %d slangy words found." % (item.txt, slanginess))
					dpStats["formal"] += 1
					dpQuality[pos] -= 1

		if vars.check("alliteration") or vars.check("noalliteration"):
			alliterations = findAlliteration(item.txt)
			if alliterations > 0:
				if vars.check("alliteration"):
					trace("(Rewarding '%s' b/c @alliteration and %d instances found." % (item.txt, alliterations))
					dpStats["alliteration"] += 1
					dpQuality[pos] += alliterations
				elif vars.check("noalliteration"):
					trace("(Penalizing '%s' b/c @noalliteration and %d instances found." % (item.txt, alliterations))
					dpStats["noalliteration"] += 1
					dpQuality[pos] -= alliterations

		if vars.check("avoidme"):
			mewords = findMeWords(item.txt)
			if mewords > 0:
				trace("(Penalizing '%s' b/c @avoidme and %d me words found." % (item.txt, mewords))
				dpStats["avoidme"] += 1
				dpQuality[pos] -= mewords

		if vars.check("likesimile") or vars.check("dislikesimile"):
			simileWords = findSimileWords(item.txt)
			if simileWords > 0:
				if vars.check("likesimile"):
					trace("(Rewarding '%s' b/c @likesimile and %d simile words found." % (item.txt, simileWords))
					dpStats["likesimile"] += 1
					# This won't find all of them so give it a bigger impact.
					dpQuality[pos] += 2 
				elif vars.check("dislikesimile"):
					trace("(Penalizing '%s' b/c @dislikesimile and %d simile words found." % (item.txt, simileWords))
					dpStats["dislikesimile"] += 1
					dpQuality[pos] -= 2

		if vars.check("avoiddialogue"):
			mayHaveDialogue = isSomethingQuoted(item.txt)
			if mayHaveDialogue:
				trace("(Penalizing '%s' b/c @avoiddialogue and some was found." % item.txt)
				dpStats["avoiddialogue"] += 1
				dpQuality[pos] -= 1

		if vars.check("depressive") or vars.check("optimist") or vars.check("subjective") or vars.check("objective"):
			safetxt = unicode(item.txt, "utf-8").encode('ascii', 'replace')
			tb = TextBlob(safetxt)
			polarity = tb.sentiment.polarity
			subjectivity = tb.sentiment.subjectivity
			POLARITY_CUTOFF = -0.35
			if polarity <= POLARITY_CUTOFF and vars.check("depressive"):
				trace("(Rewarding '%s' b/c @depressive and low polarity %f)" % (item.txt, polarity))
				dpStats["depressive"] += 1
				dpQuality[pos] += 1
			elif polarity <= POLARITY_CUTOFF and vars.check("optimist"):
				trace("(Penalizing '%s' b/c @optimist and low polarity %f)" % (item.txt, polarity))
				dpStats["optimist"] += 1
				dpQuality[pos] -= 1
			if subjectivity > 0.3 and vars.check("subjective"):
				trace("(Rewarding '%s' b/c @subjective and subjectivity %f)" % (item.txt, subjectivity))
				dpStats["subjective"] += 1
				dpQuality[pos] += 1
			elif subjectivity > 0.3 and vars.check("objective"):
				trace("(Penalizing '%s' b/c @objective and subjectivity %f)" % (item.txt, subjectivity))
				dpStats["objective"] += 1
				dpQuality[pos] -= 1

	# Loop ends

	if vars.check("bigwords") and not skipBiggest:
		if biggestWordLen > 7:
			trace("(Rewarding '%s' b/c @bigwords and avg word len is %d)" % (alts.alts[posOfBiggestWordLen].txt, biggestWordLen))
			dpStats["bigwords"] += 1
			dpQuality[posOfBiggestWordLen] += 1

	# TODO improve stats so if everything ranked the same, it doesn't count as a hit.
	firstVal = dpQuality[0]
	allSame = True
	for pos, item in enumerate(alts.alts):
		if dpQuality[pos] != firstVal:
			allSame = False
			break
	bestRankedPositions = getHighestPositions(dpQuality)
	selectedPos = chooser.oneOf(bestRankedPositions)
	if not allSame:
		trace("Final rankings:")
		for pos, item in enumerate(alts.alts):
			trace("%d: '%s'" % (dpQuality[pos], item.txt))
		trace("Best positions: %s" % bestRankedPositions)
		trace("Picked '%s'" % alts.alts[selectedPos].txt)

	# if dpStats["avoiddialogue"] > tracker:
	show_trace()

	return alts.alts[selectedPos].txt




# For an array of numbers, return an array with the position(s) of the highest values found (so if there are multiple equally high values, their positions will all be returned)
def getHighestPositions(arr):
	highestRank = None
	highestPositions = []
	for pos, item in enumerate(arr):
		if highestRank is None or item > highestRank:
			highestRank = item
			highestPositions = [pos]
		elif item == highestRank:
			highestPositions.append(pos)
	return highestPositions


def getAvgWordLen(txt):
	if txt.find("{") >= 0:
		return 0
	words = re.findall(r'\w+', txt)
	if len(words) <= 0:
		return 0
	onlySignificantWords = filter(lambda word: len(word) >= 4, words)
	if len(onlySignificantWords) <= 0:
		return 0
	wordLengths = map(lambda word: len(word), onlySignificantWords)
	avgWordLength = sum(wordLengths) / len(wordLengths)
	return avgWordLength

slangRegex = re.compile(r"\b(thing|things|stuff|okay|ok|cool|guys|dude|junk|sucks|sucked|whatever|wanna|gonna|gotta|dunno|kinda|whatcha|lemme|outta|gimme|ain't|yeah|yep|yup|actually|shit|shitty|fuck|fucking|fucked|till|little|nope|huh|uh|um|umm|ah|ahh|aha|aww|eh|er|eww|hey|hmm|uh-huh|wow|yay|lot|lots|tons|'em|actually|weird|jet|poke)\b", re.IGNORECASE)

def findSlangWords(txt):
	txt = txt.replace("‘", "'")
	txt = txt.replace("’", "'")
	return len(re.findall(slangRegex, txt))

def findAlliteration(txt):
	txt = txt.lower()
	if txt.find("{") >= 0:
		return 0
	words = re.findall(r'\w+', txt)
	if len(words) <= 0:
		return 0
	onlySignificantWords = filter(lambda word: len(word) >= 4, words)
	if len(onlySignificantWords) <= 0:
		return 0
	alliterationCount = 0
	lastFirstLetter = ""
	for word in onlySignificantWords:
		if len(word) == 0:
			continue
		if word[0] == lastFirstLetter:
			alliterationCount += 1
		lastFirstLetter = word[0]
	return alliterationCount

meWords = re.compile(r"\b(i|i'm|i'll|i'd|me|my|myself|mine)\b", re.IGNORECASE)

def findMeWords(txt):
	txt = txt.replace("‘", "'")
	txt = txt.replace("’", "'")
	return len(re.findall(meWords, txt))

# Welcome to the most ham-fisted way imaginable to check for analogy
simileWords = re.compile(r"\b(like|as if)\b", re.IGNORECASE)

def findSimileWords(txt):
	return len(re.findall(simileWords, txt))

def isSomethingQuoted(txt):
	numQuotes = re.findall(r"“.*”", txt)
	return len(numQuotes) > 0



