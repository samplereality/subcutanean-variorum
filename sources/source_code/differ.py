# Code to compare two generated versions and determine how different they are from each other (used for purposes of generating pairs of distinct seeds).

import difflib
import itertools
import sys

def getTwoLeastSimilar(texts):

	# Find lowest similarity.
	# Similarity 1.0 means identical.
	# 0.0 means totally different (unlikely in practice). 

	if len(texts) <= 2:
		print "Error: differ.getTwoLeastSimilar was only sent %d texts; expected more." % len(texts)
		sys.exit()

	lowestSimilarityScore = 1.0
	leastSimilarPair = [-1, 1]

	for pair in itertools.combinations(range(len(texts)), 2):
		text1 = texts[pair[0]]
		text2 = texts[pair[1]]
		sm = difflib.SequenceMatcher(None, text1, text2, autojunk = False)
		similarity = sm.ratio()
		similarity += penaltyIfHaveTheSame(text1, text2, 0.05, ["dadphone", "bradphone"])
		similarity += penaltyIfHaveTheSame(text1, text2, 0.10, ["gayniko", "firmniko", "originalniko"])
		print "%s: Similarity is %f" % (pair, round(similarity, 3))
		if similarity < lowestSimilarityScore:
			print " --> lowest so far."
			lowestSimilarityScore = similarity
			leastSimilarPair = pair

	if lowestSimilarityScore >= 0.999:
		print "Error: lowestSimilarityScore was too close 1.0 indicating texts were not generated differently."
		sys.exit()

	print "Best match was pair %s with similarity %f" % (leastSimilarPair, round(lowestSimilarityScore, 3))

	return leastSimilarPair


def penaltyIfHaveTheSame(text1, text2, penalty, wordArr):
	for word in wordArr:
		if text1.find(word) >= 0 and text2.find(word) >= 0:
			# print "(Both have %s, so penalizing by 0.10)" % word
			return penalty
	return 0.0

