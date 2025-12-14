# coding=utf-8
# Manually confirm each use of variants.

import ctrlseq
import result
import re
import getch
import sys
import textwrap
import macros
import token_stream
import variables
import fileio
import copy


# We should have a series of text and CTRLBEGIN/END sequences.
# This is called from quantparse.parse
def process(fileSetKey, onlyShow, tokens, sourceText, parseParams):
	global SESSION_CTR
	parseParams.discourseVarChance = 0
	abortFlag = False
	SESSION_CTR = 0
	
	fileio.startConfirmKeys(fileSetKey)

	# If we're just rendering an excerpt, keep all the current confirm keys.
	if len(onlyShow) > 0:
		fileio.reconfirmAll()

	sequenceList = token_stream.SequenceStream(tokens)
	nxt = sequenceList.next()
	while nxt is not None:
		nextCtrlSeq = nxt[0]
		endPos = nxt[1]
		# Return 1 if newly confirmed, 0 otherwise; or -1 to abort further execution.
		result = confirmCtrlSeq(nextCtrlSeq, sequenceList, sourceText, parseParams, endPos)
		if result == 1:
			SESSION_CTR += 1
		if result == -1:
			abortFlag = True
		nxt = sequenceList.next()
	fileio.finishConfirmKeys()
	if abortFlag:
		sys.exit()



MAX_PER_SESSION = 5
SESSION_CTR = 0

DEFAULT_BUFFER_LEN = 850
FINAL_BUFFER_LEN = 60
KEY_PADDING_LEN = 60

def confirmCtrlSeq(ctrl_contents, sequenceList, sourceText, parseParams, ctrlEndPos):
	global MAX_PER_SESSION
	global SESSION_CTR

	# Return 1 if newly confirmed, 0 otherwise; or -1 to abort further execution.

	ctrlStartPos = sourceText.rfind("[", 0, ctrlEndPos)
	filename = result.find_filename(sourceText, ctrlStartPos)
	originalCtrlSeq = sourceText[ctrlStartPos:ctrlEndPos+1]
	key = makeKey(sourceText, filename, ctrlStartPos, ctrlEndPos, originalCtrlSeq)
	if fileio.isKeyConfirmed(key) == True:
		fileio.confirmKey(key)
		return 0

	if SESSION_CTR > MAX_PER_SESSION:
		return 2

	lineNumber = result.find_line_number_for_file(sourceText, ctrlStartPos)
	lineColumn = result.find_column(sourceText, ctrlStartPos)
	print "\n\n"
	print "#################################################################"
	print "VARIANT FOUND IN %s LINE %d COL %d:\n%s" % (filename, lineNumber, lineColumn, originalCtrlSeq)
	print "#################################################################"
	variants = ctrlseq.renderAll(ctrl_contents, parseParams, showAllVars=True)
	for v in variants.alts:
		print '''************************************'''
		print getContextualizedRenderedVariant(sourceText, parseParams, ctrlStartPos, ctrlEndPos, sequenceList, v)
	print "************************************"
	return askUserAboutVariant(key, ctrl_contents, sequenceList, sourceText, parseParams, ctrlEndPos)


def makeKey(sourceText, filename, ctrlStartPos, ctrlEndPos, originalCtrlSeq):
	pre = getCharsBefore(sourceText, ctrlStartPos, KEY_PADDING_LEN)
	post = getCharsAfter(sourceText, ctrlEndPos, KEY_PADDING_LEN)
	key = "%s:%s%s%s" % (filename, pre, originalCtrlSeq, post)
	key = re.sub(r'[\W_]', '', key) # remove non-alphanums
	return key

def getContextualizedRenderedVariant(sourceText, parseParams, ctrlStartPos, ctrlEndPos, sequenceList, variant, bufferLen = DEFAULT_BUFFER_LEN, truncStart = "...", truncEnd = "...", maxLineLength = 80):
	vTxt = variant.txt
	fromVar = variant.fromVariable
	oldSetDefines = parseParams.setDefines
	parseParams.setDefines = [fromVar]
	oldVariables = copy.deepcopy(variables.__v)
	variables.setAllTo(False)
	vTxt = getExpandedVariantText(vTxt, parseParams)
	pre = getRenderedPre(sourceText, parseParams, ctrlStartPos, sequenceList, bufferLen)
	post = getRenderedPost(sourceText, parseParams, ctrlEndPos, sequenceList, bufferLen)
	rendered = renderVariant(truncStart, pre, vTxt, post, truncEnd, maxLineLength, parseParams)
	parseParams.setDefines = oldSetDefines
	variables.__v = oldVariables
	return rendered

def getExpandedVariantText(variantTxt, parseParams):
	return macros.expand(variantTxt, parseParams, isPartialText = True)

def renderVariant(truncStart, pre, variant, post, truncEnd, maxLineLength,  parseParams):

	# Set up the variant text.
	variant = fixSpacing(variant)
	variant = fixUnicode(variant)
	variant = summarizeIfNecessary(variant, maxLineLength)

	# Get the variant in context.
	rendered = "%s%s%s%s%s" % (truncStart, pre, variant, post, truncEnd)
	rendered = fixSpacing(rendered)
	wrapped = wrap(rendered, maxLineLength)

	# Draw the carets highlighting the variant's position.
	startPos = len(truncStart + pre)
	prevNL = result.find_previous(wrapped, "\n", startPos)
	numSpaces = startPos - prevNL
	if numSpaces + len(variant + post + truncEnd) < maxLineLength and post.find("\n") == -1:
		wrapped = placeSingleLineCaret(wrapped, variant, numSpaces)
	else:
		wrapped = placeMultiLineCaretAbove(wrapped, prevNL, numSpaces)
		wrapped = placeMultiLineCaretBelow(wrapped, post, truncEnd)
	return wrapped

def summarizeIfNecessary(variant, maxLineLength):
	if len(variant) > maxLineLength * 5:
		startTruncPos = variant.rfind(" ", 0, maxLineLength * 2)
		endTruncPos = variant.find(" ", len(variant) - (maxLineLength * 2), len(variant))
		variant = variant[:startTruncPos] + ".... ... ...." + variant[endTruncPos:]
	return variant

def placeSingleLineCaret(wrapped, variant, numSpaces):
	spaces = " " * numSpaces
	numSpacesBetween = len(variant) - 2
	spacesBetween = " " * numSpacesBetween
	return wrapped + spaces + "^" + spacesBetween + "^\n"

def placeMultiLineCaretAbove(wrapped, prevNL, numSpaces):
	spaces = " " * numSpaces
	if prevNL == 0:
		return spaces + "v\n" + wrapped
	return wrapped[:prevNL-1] + "\n" + spaces + "v" + wrapped[prevNL-1:]

def placeMultiLineCaretBelow(wrapped, post, truncEnd):
	# Get the position of the last character in the variant (the spot we want the caret to point at)
	endVariantPos = len(wrapped) - len(post) - len(truncEnd) - 2

	# Find the new lines before and after this spot. Since we're working with already-wrapped text, we know this should be within a single printed line's width.
	variantEndsWithNewLine = wrapped[endVariantPos] == "\n"
	charAfterVariantIsNewLine = wrapped[endVariantPos+1] == "\n"

	if charAfterVariantIsNewLine:
		previousNewLinePos = result.find_previous(wrapped, "\n", endVariantPos + 1)
		pivot = endVariantPos + 2
	else:
		pivot = wrapped.find("\n", endVariantPos) + 1
		if variantEndsWithNewLine:
			previousNewLinePos = endVariantPos
		else:
			previousNewLinePos = result.find_previous(wrapped, "\n", endVariantPos + 2)

	# Count spaces from the previous newline, then subtract the positions of both newlines.
	numSpaces = endVariantPos - previousNewLinePos

	if numSpaces < 0:
		spaces = ""
	else:
		spaces = " " * numSpaces
		if variantEndsWithNewLine:
			spaces = "\n" + spaces

	# Insert the spaces, caret, and line break after caret.
	return wrapped[:pivot] + spaces + "^\n" + wrapped[pivot:]

def getRenderedPre(sourceText, parseParams, ctrlStartPos, sequenceList, bufferLen = DEFAULT_BUFFER_LEN):
	pre = getCharsBefore(sourceText, ctrlStartPos, bufferLen)
	pre = cleanAndExpandBit(pre, parseParams, True, DEFAULT_BUFFER_LEN)
	pre = renderContextExpansions(pre, sequenceList, parseParams, False)
	return cleanAndExpandBit(pre, parseParams, True, FINAL_BUFFER_LEN)

def getRenderedPost(sourceText, parseParams, ctrlEndPos, sequenceList, bufferLen = DEFAULT_BUFFER_LEN):
	post = getCharsAfter(sourceText, ctrlEndPos, bufferLen)
	post = cleanAndExpandBit(post, parseParams, False, DEFAULT_BUFFER_LEN)
	post = renderContextExpansions(post, sequenceList, parseParams, True)
	return cleanAndExpandBit(post, parseParams, False, FINAL_BUFFER_LEN)

def renderContextExpansions(snippet, sequenceList, parseParams, isAfter):
	offset = 0
	while True:
		nextCtrlSeq = sequenceList.following(offset) if isAfter else sequenceList.preceding(offset)
		if nextCtrlSeq is None:
			break
		startPos = snippet.find("[") if isAfter else snippet.rfind("[")
		if startPos == -1:
			break
		endPos = snippet.find("]", startPos) if isAfter else snippet.rfind("]")
		if endPos == -1 or endPos < startPos:
			if isAfter:
				endPos = len(snippet)
			else:
				break
		variants = ctrlseq.renderAll(nextCtrlSeq[0], parseParams, showAllVars=True)
		variantTxt = variants.getByFromVariable(parseParams.setDefines)
		snippet = snippet[:startPos] + variantTxt + snippet[endPos+1:]
		offset += 1
	return snippet	

def getCharsBefore(text, pos, count):
	assert count > 0
	assert pos >= 0
	assert pos < len(text)
	if count > pos:
		count = pos
	return text[pos-count:pos]

def getCharsAfter(text, pos, count):
	assert count > 0
	assert pos >= 0
	assert pos < len(text)
	if pos + count > len(text):
		count = len(text) - pos
	return text[pos+1:pos+count+1]

def cleanAndExpandBit(snippet, parseParams, isBefore, bufferLen = FINAL_BUFFER_LEN):
	snippet = cleanOutputForTerminalPresentation(snippet)
	snippet = macros.expand(snippet, parseParams, isPartialText = True)	
	snippet = fixSpacing(snippet)
	return snippet[-1*bufferLen:] if isBefore else snippet[:bufferLen]



def cleanOutputForTerminalPresentation(text):
	# Strip comments.
	text = re.sub(r"[#%].*\n", "\n", text)

	# Remove trailing spaces at end of lines
	text = re.sub(r"\s+\n", "\n\n", text)

	# Remove extra blank lines
	text = re.sub(r"\n{3,}", "\n\n", text) 

	# Replace common Unicode chars with ascii equivalents since wrap (for terminal) can't handle them.
	text = fixUnicode(text)

	# remove macro definitions.
	text = stripMacros(text)

	# remove DEFINEs.
	pos = text.find("[DEFINE")
	while pos is not -1:
		endDefPos = text.find("]", pos)
		if endDefPos is not -1:
			newText = ""
			if pos > 0:
				newText += text[:pos-1]
			newText += text[endDefPos+1:]
			text = newText
		pos = text.find("[DEFINE", pos+1)

	# remove partial control sequences at beginning
	cStart = text.find("[")
	cEnd = text.find("]")
	if cEnd >= 0 and (cStart == -1 or cEnd < cStart):
		text = text[cEnd+1:]
	# ...and end
	lStart = text.rfind("[")
	lEnd = text.rfind("]")
	if lStart >= 0 and (lEnd == -1 or lStart > lEnd):
		text = text[:lStart]

	return text

def fixUnicode(text):
	text = re.sub(r"’", "'", text)
	text = re.sub(r"‘", "'", text)
	text = re.sub(r"“", '"', text)
	text = re.sub(r"”", '"', text)

	# Show paragraph breaks.
	text = re.sub(r"\s*\{pp\}\s*", "\n\n", text)

	return text

def stripMacros(text):
	pos = text.find("[MACRO")
	while pos is not -1:
		endDefPos = text.find("]", pos)
		if endDefPos == -1:
			# Couldn't find end of MACRO definition
			text = text[:pos]
			break
		endBodyPos = text.find("]", endDefPos+1)
		if endBodyPos == -1:
			# Couldn't find end of MACRO body
			text = text[:pos]
			break
		newText = ""
		if pos > 0:
			newText += text[:pos]
		newText += text[endBodyPos+1:]
		text = newText
		pos = text.find("[MACRO")
	return text

def fixSpacing(text):
	# Remove doubled spaces (which won't be visible post-Latex and are therefore just a distraction). 
	text = re.sub(r"  +", " ", text)

	return text


def wrap(text, maxLineLength):
	output = ""
	for line in text.split('\n'):
		output += textwrap.fill(line, maxLineLength) + "\n"
	return output


def askUserAboutVariant(key, ctrl_contents, sequenceList, sourceText, parseParams, ctrlEndPos):
	global MAX_PER_SESSION
	global SESSION_CTR
	choice = -1
	while choice is not "1" and choice is not "2" and choice is not "3" and choice is not "4" and choice is not "5":
		sys.stdout.write("\n1) Confirm, 2) Skip, 3) Regen, 4) Done Confirming, 5) Quit > ")
		choice = getch.getch()
		if choice == "1":
			print "1\n >>> Confirmed."
			fileio.confirmKey(key)
			return 1
		elif choice == "2":
			print "2\n >>> Skipping."
			return 0
		elif choice == "3":
			print "3\n >>> Regenerating."
			res = confirmCtrlSeq(ctrl_contents, sequenceList, sourceText, parseParams, ctrlEndPos)
			return res
		elif choice == "4":
			print "4\n >>> Done Confirming."
			SESSION_CTR = MAX_PER_SESSION + 1
			return 0
		elif choice == "5":
			print "5\n >>> Quit."
			SESSION_CTR = MAX_PER_SESSION + 1
			return -1

