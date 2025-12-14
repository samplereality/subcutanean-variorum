
import ctrlseq
import result
import re
import token_stream


class Macros:
	def __init__(self):
		self.macros = {}
		self.labels = {}
		self.sticky_macro_originals = {}
		self.sticky_macro_rendered = {}

	def isMacro(self, key):
		return key in self.macros or key in self.sticky_macro_originals

	def isLabel(self, key):
		return key in self.labels

	def defineLabel(self, key):
		self.labels[key] = True

	def defineMacro(self, isSticky, key, body):
		if isSticky:
			self.sticky_macro_originals[key] = body
		else:
			self.macros[key] = body

	def render(self, key, params):
		if key in self.sticky_macro_rendered:
			return self.sticky_macro_rendered[key]
		elif key in self.sticky_macro_originals:
			thingToRender = self.sticky_macro_originals[key]
			result = ctrlseq.render(thingToRender, params)
			self.sticky_macro_rendered[key] = result
			return result
		elif key in self.macros:
			thingToRender = self.macros[key]
			result = ctrlseq.render(thingToRender, params)
			return result
		else:		
			return None



__m = Macros()

def reset():
	global __m
	__m = Macros()

def isMacro(key):
	global __m
	return __m.isMacro(key)


def handleDefs(tokens, params):
	tokens = registerAndStripMacros(tokens, params)
	tokens = registerLabels(tokens, params)
	return tokens


def stripMacros(tokens, params):
	output = []
	ts = token_stream.TokenStream(tokens)
	while True:
		nextSection = ts.next()
		if nextSection is None:
			break
		if ts.wasText():
			output += nextSection
			continue
		ctrlParam = nextSection[1].type
		if ctrlParam != "MACRO":
			output += nextSection
			continue
		ts.next() # Skip the Macro contents.
	return output	

# Take in an array of tokens, register any macro definitions and the following control sequence, validate that they're being used correctly, and remove them both from the array before returning it. 
def registerAndStripMacros(tokens, params):
	output = []
	ts = token_stream.TokenStream(tokens)
	while True:
		nextSection = ts.next()
		if nextSection is None:
			break
		if ts.wasText():
			output += nextSection
			continue
		ctrlParam = nextSection[1].type
		if ctrlParam != "MACRO":
			output += nextSection
			continue

		assert len(nextSection) == 4 # CTRLBEGIN, MACRO, macroKey, CTRLEND
		macroKey = nextSection[2].value.lower()
		if __m.isMacro(macroKey):
			badResult = result.Result(result.PARSE_RESULT)
			badResult.flagBad("Macro '%s' is defined twice." % macroKey, params.originalText, ts.lastLexPos)
			raise result.ParseException(badResult)
		isSticky = nextSection[1].value == "STICKY_MACRO"
		nextSection = ts.next()
		if nextSection is None or ts.wasText():
			badResult = result.Result(result.PARSE_RESULT)
			badResult.flagBad("Macro '%s' must be immediately followed by a control sequence." % macroKey, params.originalText, ts.lastLexPos)
			raise result.ParseException(badResult)

		macroBody = nextSection[1:len(nextSection)-1] # Strip begin/end tags
		__m.defineMacro(isSticky, macroKey, macroBody)

	return output

# Register any label definitions but leave them in the array (they'll get stripped at the time we process the JUMP commands.)
def registerLabels(tokens, params):
	output = []
	ts = token_stream.TokenStream(tokens)
	while True:
		nextSection = ts.next()
		if nextSection is None:
			break
		output += nextSection
		if not ts.wasText() and nextSection[1].type == "LABEL":
			assert len(nextSection) == 4 # CTRLBEGIN, LABEL, id, CTRLEND
			labelKey = nextSection[2].value.lower()
			if __m.isLabel(labelKey):
				badResult = result.Result(result.PARSE_RESULT)
				badResult.flagBad("Label '%s' is defined twice." % labelKey, params.originalText, token.lexpos)
				raise result.ParseException(badResult)
			__m.defineLabel(labelKey)
	return output


formatting_codes = ["section_break", "chapter", "part", "end_part_page", "verse", "verse_inline", "verse_inline_sc", "epigraph", "pp", "i", "b", "vspace", "sc", "scwide", "start_colophon", "finish_colophon", "url", "alternate_scene", "columns", "end_columns", "endmatter", "stars"]

def getNextMacro(text, pos, params, isPartialText):
	# A macro can be in the form {this thing} or $that (one word). 
	text = text[pos:]
	found = re.search(r"[\{\$]", text)
	if not found:
		return None
	startPos = found.start()
	firstChar = text[startPos]
	if firstChar == "{":
		endPos = text.find("}", startPos+1)
	else:
		endFound = re.search(r"[^\w]", text[startPos+1:])
		if endFound:
			endPos = endFound.start() + startPos + 1
		else:
			endPos = len(text)
	if endPos == -1:
		if isPartialText:
			# In the case of rendering a truncated excerpt, don't freak out if it ends in the middle of a macro.
			return None
		else:
			badResult = result.Result(result.PARSE_RESULT)
			badResult.flagBad("Incomplete macro sequence in text '%s'" % text, params.originalText, pos)
			raise result.ParseException(badResult)
	if endPos - startPos == 1:
		badResult = result.Result(result.PARSE_RESULT)
		badResult.flagBad("Can't have empty macro sequence {}", params.originalText, startPos)
		raise result.ParseException(badResult)
	return [startPos + pos, endPos + pos]

# For a given text (possible truncated), return it with all the macros it contains expanded.
def expand(text, params, isPartialText = False):
	global __m
	MAX_MACRO_DEPTH = 6
	renderHadMoreMacrosCtr = 0
	startPos = 0
	while True:
		nextMacro = getNextMacro(text, startPos, params, isPartialText)
		if nextMacro is None:
			break
		startPos = nextMacro[0]
		endPos = nextMacro[1]
		macroName = text[startPos+1:endPos].lower()

		if macroName.split(" ")[0] == "jump":
			text = handleGoto(macroName, text, startPos, isPartialText)
			continue

		# Expand the macro
		rendered = __m.render(macroName, params)

		# If unrecognized, see if it's a formatting code; fail otherwise.
		if rendered == None:
			parts = macroName.split('/')
			if parts[0] not in formatting_codes:
				badResult = result.Result(result.PARSE_RESULT)
				badResult.flagBad("Unrecognized macro {%s}" % macroName, text, startPos)
				raise result.ParseException(badResult)
			startPos += 1
			continue

		# If the expansion itself contains macros, check for recursion then set the start position for the next loop iteration.
		if getNextMacro(rendered, 0, params, isPartialText) is not None:
			renderHadMoreMacrosCtr += 1
		else:
			renderHadMoreMacrosCtr = 0
		if renderHadMoreMacrosCtr > MAX_MACRO_DEPTH:
			badResult = result.Result(result.PARSE_RESULT)
			badResult.flagBad("Possibly recursive macro loop near here", text[startPos:startPos+20], startPos)
			raise result.ParseException(badResult)

		# For {this} format, we're trimming the final character; for $this one, we want to keep the final character.
		if endPos < len(text) and text[endPos] != '}':
			endPos -= 1
			
		text = text[:startPos] + rendered + text[endPos+1:]

	# Remove any unused labels.
	text = re.sub(r"\[LABEL .*\]", "", text)

	return text

def handleGoto(key, text, startPos, isPartialText):
	keyParts = key.split(" ")
	if len(keyParts) is not 2:
		badResult = result.Result(result.PARSE_RESULT)
		badResult.flagBad("Invalid GOTO: expected {JUMP labelToJumpTo}, found '%s'" % key, text, startPos)
		raise result.ParseException(badResult)
	labelId = keyParts[1].lower()
	if not __m.isLabel(labelId):
		badResult = result.Result(result.PARSE_RESULT)
		badResult.flagBad("Invalid GOTO: labelId '%s' is not defined." % key, text, startPos)
		raise result.ParseException(badResult)
	searchBit = "[label %s]" % labelId
	labelPos = text.lower().find(searchBit, startPos)
	labelLen = len("[LABEL %s]" % labelId) 
	if labelPos == -1:
		if not isPartialText:
			badResult = result.Result(result.PARSE_RESULT)
			badResult.flagBad("Found {JUMP %s} but no [LABEL %s] after this point, probably because you're trying to jump backward (only forward jumps are allowed)." % (labelId, labelId), text, startPos)
			raise result.ParseException(badResult)
		else:
			return text[:startPos] + text[startPos + labelLen:]
	postLabelPos = labelPos + labelLen
	return text[:startPos] + text[postLabelPos:]
