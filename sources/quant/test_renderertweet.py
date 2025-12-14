import pytest
import renderer_tweet

def test_getNearestPosToMiddle():
	txt = "Words;Words Words * Words;Words Words"
	result = renderer_tweet.getNearestPosToMiddle(txt, ";", 3)
	assert result == 25
	txt = "Words;Words Words * Words Words Words"
	result = renderer_tweet.getNearestPosToMiddle(txt, ";", 3)
	assert result == 5
	txt = "Words Words Words ; Words Words Words"
	result = renderer_tweet.getNearestPosToMiddle(txt, ";", 3)
	assert result == 18
	txt = "Words Words Words;*;Words Words Words"
	result = renderer_tweet.getNearestPosToMiddle(txt, ";", 3)
	assert result in [17, 19]

def test_getNearestPosToMiddle_EdgeCases():
	txt = "Words Words Words * Words Words Words"
	result = renderer_tweet.getNearestPosToMiddle(txt, ";", 3)
	assert result == -1
	txt = ""
	result = renderer_tweet.getNearestPosToMiddle(txt, ";", 3)
	assert result == -1

def test_getNearestPosToMiddle_LongEnough():
	txt = "Words Words Words * Words Words Words;"
	result = renderer_tweet.getNearestPosToMiddle(txt, ";", 3)
	assert result == -1
	txt = ";Words Words Words * Words Words Words"
	result = renderer_tweet.getNearestPosToMiddle(txt, ";", 3)
	assert result == -1
	txt = "Words Words Words * Words Words Wor;ds"
	result = renderer_tweet.getNearestPosToMiddle(txt, ";", 3)
	assert result == -1
	txt = "Wo;rds Words Words * Words Words Words"
	result = renderer_tweet.getNearestPosToMiddle(txt, ";", 3)
	assert result == -1

	txt = "Words;Words Words * Word;s"
	result = renderer_tweet.getNearestPosToMiddle(txt, ";", 3)
	assert result == 5
	txt = "W;ords * Words Words;Words"
	result = renderer_tweet.getNearestPosToMiddle(txt, ";", 3)
	assert result == 20


def test_breakSentenceIntoChunks():
	sen = renderer_tweet.Sentence("This is my; sample sentence.", "PARAGRAPH")
	result = renderer_tweet.breakSentenceIntoChunks(sen)
	assert len(result) == 2
	assert result[0].sentence == "This is my;"
	assert result[0].join == "SPACE"
	assert result[1].sentence == "sample sentence."
	assert result[1].join == "PARAGRAPH"

	sen = renderer_tweet.Sentence("This is my sample sentence.", "SPACE")
	result = renderer_tweet.breakSentenceIntoChunks(sen)
	assert len(result) == 1
	assert result[0].sentence == "This is my sample sentence."
	assert result[0].join == "SPACE"

	sen = renderer_tweet.Sentence(";Semicolons bad, but commas good", "SPACE")
	result = renderer_tweet.breakSentenceIntoChunks(sen)
	assert len(result) == 2
	assert result[0].sentence == ";Semicolons bad,"
	assert result[1].sentence == "but commas good"


def test_breakSentenceIntoChunks_Recursive():
	sen = renderer_tweet.Sentence("Verbose; verbose, verbose: verbose;", "PARAGRAPH")
	result = renderer_tweet.breakSentenceIntoChunks(sen, 10)
	assert len(result) == 4
	assert result[0].sentence == "Verbose;"
	assert result[0].join == "SPACE"
	assert result[1].sentence == "verbose,"
	assert result[1].join == "SPACE"
	assert result[2].sentence == "verbose:"
	assert result[2].join == "SPACE"
	assert result[3].sentence == "verbose;"
	assert result[3].join == "PARAGRAPH"

def test_splitIntoSentences():
	text = """What if Twitter? Only allowed 20.

Chars!"""
	result = renderer_tweet.splitIntoSentences(text)
	assert len(result) == 3
	assert result[0].sentence == "What if Twitter?"
	assert result[0].join == "SPACE"
	assert result[1].sentence == "Only allowed 20."
	assert result[1].join == "PARAGRAPH"
	assert result[2].sentence == "Chars!"
	assert result[2].join == "SPACE"

def test_splitIntoSentences_Breaks():
	text = """That was the end.\n\n\nChapter 3\n\nThe start of a new thing.\n\nAnd one more new thing."""
	result = renderer_tweet.splitIntoSentences(text)
	assert len(result) == 3
	assert result[0].sentence == "That was the end."
	assert result[0].join == "CHAPTERBREAK"
	assert result[1].sentence == "Chapter 3\n\nThe start of a new thing."
	assert result[1].join == "PARAGRAPH"

	text = """That was the end.\n\n\n#\n\n\nAnd then something else."""
	result = renderer_tweet.splitIntoSentences(text)
	assert len(result) == 2
	assert result[0].sentence == "That was the end."
	assert result[0].join == "SECTIONBREAK"
	assert result[1].sentence == "* * *\n\nAnd then something else."
	assert result[1].join == "SPACE"

	text = """That was the end.\n\n\nPART THREE\n\nDELICIOUSNESS\n\n\n\nThe first time I saw him..."""
	result = renderer_tweet.splitIntoSentences(text)
	assert len(result) == 2
	assert result[0].sentence == "That was the end."
	assert result[0].join == "PARTBREAK"
	assert result[1].sentence == "PART THREE\n\nDELICIOUSNESS\n\nThe first time I saw him..."
	assert result[1].join == "SPACE"


def test_splitIntoTweets_Basic():
	text = "What if Twitter? Only allowed 20. Chars!"
	result = renderer_tweet.splitIntoTweets(text, 20)
	assert len(result) == 3
	assert result[0] == "What if Twitter?"
	assert result[1] == "Only allowed 20."
	assert result[2] == "Chars!"

def test_splitActualCases():
	text = """"What you looking at?" Niko asked from behind me, and I _leapt_, fucking leapt to my feet like the floor was electric, whirling around to face him, body in full panic like all the building adrenalin had been released in an instant and I guess it probably had; panting and overwhelmed with terror and nausea and a terrible, stabbing relief at seeing him, seeing a him I could believe in instead of a me I couldn't."""
	result = renderer_tweet.breakSentenceIntoChunks(renderer_tweet.Sentence(text, "SPACE"))
	assert len(result) == 3
	assert result[0].sentence == """"What you looking at?" Niko asked from behind me, and I _leapt_, fucking leapt to my feet like the floor was electric,"""
	assert result[1].sentence == """whirling around to face him, body in full panic like all the building adrenalin had been released in an instant and I guess it probably had;"""
	assert result[2].sentence == """panting and overwhelmed with terror and nausea and a terrible, stabbing relief at seeing him, seeing a him I could believe in instead of a me I couldn't."""

	# result = renderer_tweet.splitIntoTweets(text)
	# assert len(result) == 3
	# assert result[0] == """"What you looking at?" Niko asked from behind me, and I _leapt_, fucking leapt to my feet like the floor was electric,"""
	# assert result[1] == """whirling around to face him, body in full panic like all the building adrenalin had been released in an instant and I guess it probably had;"""
	# assert result[2] == """panting and overwhelmed with terror and nausea and a terrible, stabbing relief at seeing him, seeing a him I could believe in instead of a me I couldn't."""



