# coding=utf-8


import renderer
import re
import fileio
import renderer_text
import terminal
import sys

class RendererTweet(renderer.Renderer):

	def render(self):
		self.makeStagedFile()
		self.makeOutputFile()

	def makeStagedFile(self):
		self.params.doFront = False
		self.params.twitterEpigraph = True
		renderer = renderer_text.RendererText(self.collapsedText, self.params)
		renderer.render()

	def makeOutputFile(self):
		print "Rendering to tweets."
		inputFile = "%s%s.txt" % (self.params.outputDir, self.params.fileId)
		inputText = fileio.readInputFile(inputFile)
		cleanedText = prepInputForTweets(inputText)
		tweets = splitIntoTweets(cleanedText)

		# Human readable version.
		humanOutput = []
		for pos, tweet in enumerate(tweets):
			humanOutput.append("[%d] %s" % (pos, tweet))
		humanOutputStr = "\n==============\n".join(humanOutput)
		outputFileName = "%s%s.tweets.txt" % (self.params.outputDir, self.params.fileId)
		fileio.writeOutputFile(outputFileName, humanOutputStr)

		# Serialized version.
		dataFileName = "%s%s.tweets.dat" % (self.params.outputDir, self.params.fileId)
		fileio.writeOutputFile(dataFileName, fileio.serialize(tweets))

		# Cleanup
		terminal.move(inputFile, "%s%s.txt" % (self.params.workDir, self.params.fileId))

	def suggestEndMatters(self):
		return []

	def renderFormattingSequence(self, contents):
		pass


def prepInputForTweets(text):
	text = text.replace("	", "    ")
	return text

# How to break tweets?
# - Break at paragraph breaks
# - Fit as many sentences as you can in one tweet.
# - If you can't fit a single sentence in a tweet, break it up in roughly the middle. Repeat if you still can't fit in a tweet.
# - Special handling for chapter/part breaks and quotations.


# Edge cases.
# What about an italics that splits across sentences, like "_Okay. Great. What now?_"
# Quoted dialogue with multiple sentences. Should try to keep together.

MAX_TWEET_SIZE = 240

class Sentence():
	def __init__(self, s, j):
		self.sentence = s
		self.join = j

	def __repr__(self):
		return "(Sentence: \"%s\", join: %s)" % (self.sentence, self.join)

def splitIntoTweets(text, max_size = MAX_TWEET_SIZE):
	sentences = splitIntoSentences(text)

	tweets = []
	sPos = 0
	while sPos < len(sentences):
		tweet = ""
		while len(tweet) <= max_size and sPos < len(sentences):
			nextSentence = sentences[sPos].sentence
			nextJoin = sentences[sPos].join

			if len(tweet) + len(nextSentence) <= max_size:
				tweet += nextSentence
				sPos += 1
				if nextJoin == "PARAGRAPH" and sentences[sPos].join == "PARAGRAPH":
					# Account for the case of two short paragraphs.
					if len(tweet) + len(sentences[sPos].sentence) + 2 <= max_size:
						tweet += "||" + sentences[sPos].sentence
						sPos += 1
						if nextJoin != "SPACE":
							break
				elif nextJoin != "SPACE":
					break
				tweet += " "
			else:
				chunks = breakSentenceIntoChunks(sentences[sPos])
				if len(tweet) < 15 and len(tweet) + len(chunks[0].sentence) <= max_size:
					chunks[0].sentence = tweet + chunks[0].sentence
				else:
					addTweet(tweets, tweet, max_size)
				tweet = ""
				if len(nextSentence) <= max_size:
					continue
				for chunk in chunks:
					addTweet(tweets, chunk.sentence, max_size)
				sPos += 1
				break

		addTweet(tweets, tweet, max_size)

	return tweets

def addTweet(tweets, tweet, max_size):
	if len(tweet.strip()) == 0:
		return
	tweet = tweet.strip()
	tweet = re.sub(r"([a-z])\n([a-z])", r"\1 \2", tweet)
	tweet = re.sub(r" +", " ", tweet)
	tweet = re.sub(r"\|\|", "\n\n", tweet)
	# print "Tweet (%d):\n\"%s\"\n\n" % (len(tweet), tweet)
	if len(tweet) > max_size:
		print "ERROR: Tried to append tweet with length %d" % len(tweet)
		sys.exit()
	tweets.append(tweet)



def breakSentenceIntoChunks(sentence, max_size = MAX_TWEET_SIZE):
	splitCharsInBestOrder = [';', ',', '---', ',"', ':', '...']
	text = sentence.sentence
	for spl in splitCharsInBestOrder:
		bestPos = getNearestPosToMiddle(text, spl)
		if bestPos == -1:
			continue
		left = [Sentence(text[:bestPos+len(spl)].strip(), "SPACE")]
		right = [Sentence(text[bestPos+len(spl):].strip(), sentence.join)]
		if len(left[0].sentence) > max_size:
			left = breakSentenceIntoChunks(left[0], max_size)
		if len(right[0].sentence) > max_size:
			right = breakSentenceIntoChunks(right[0], max_size)
		return left + right

	return [sentence]

def getNearestPosToMiddle(text, spl, MIN_VIABLE_SPLIT_DIFF = 6):
	midPos = len(text) / 2
	prevPos = text.rfind(spl, 0, midPos)
	nextPos = text.find(spl, midPos)
	if prevPos == -1 and nextPos == -1:
		return -1
	if prevPos == -1 and nextPos != -1:
		prevPos = -99999999
	if nextPos == -1 and prevPos != -1:
		nextPos = 99999999
	if midPos - prevPos <= nextPos - midPos:
		if prevPos >= MIN_VIABLE_SPLIT_DIFF:
			return prevPos
	else:
		if nextPos < len(text) - MIN_VIABLE_SPLIT_DIFF - 1:
			return nextPos
	return -1




# [("Sentence.", "SPACE"), ("Second sentence.", "PARAGRAPH"), ]

def splitIntoSentences(text):
	text = re.sub(r" +\n", "\n", text)
	text = re.sub(r"\n{2,}", "\n\n", text)
	outputArr = []
	pos = 0
	pattern = r"([\.!\?][_\"\)]*)([ \n\#]+)(?![a-z])(Chapter [0-9]+|PART .*\n\n.*)?"
	prevPos = 0
	savedBreak = ""
	for match in re.finditer(pattern, text):
		startPos = match.start()
		endPos = match.end()
		endPunc = match.group(1)
		endSpace = match.group(2)
		breakSpace = match.group(3)
		# print 'Sentence ended with endPunc "%s" and endSpace "%s" and breakSpace "%s" at %d:%d' % (endPunc, endSpace, breakSpace, startPos, endPos)

		sentence = text[prevPos:startPos + len(endPunc)]
		# print '-->sentence: "%s"' % sentence
		join = ""
		if endSpace == " " or endSpace == "  ":
			join = "SPACE"
		elif breakSpace != None and re.search(r"Chapter ", breakSpace):
			join = "CHAPTERBREAK"
		elif breakSpace != None and re.search(r"PART ", breakSpace):
			join = "PARTBREAK"
		elif re.search(r".*\#.*", endSpace):
			join = "SECTIONBREAK"
		elif re.search(r"(\n){2,}", endSpace):
			join = "PARAGRAPH"
		elif re.search(r"\n *", endSpace):
			join = "LINEBREAK"
		# print "-->join: %s" % join
		if join == "":
			print "ERROR. endSpace '%s', breakSpace '%s'" % (endSpace, breakSpace)
			sys.exit()

		sen = sentence
		if savedBreak != "":
			sentence = savedBreak + sentence
			savedBreak = ""
		outputArr.append(Sentence(sentence, join))
		if join == "CHAPTERBREAK":
			savedBreak = breakSpace
		elif join == "SECTIONBREAK":
			savedBreak = "* * *\n\n"
		elif join == "PARTBREAK":
			savedBreak = breakSpace

		prevPos = endPos

	last = text[prevPos:]
	if savedBreak != "":
		last = savedBreak + last
	outputArr.append(Sentence(last, "SPACE"))
	
	return outputArr



