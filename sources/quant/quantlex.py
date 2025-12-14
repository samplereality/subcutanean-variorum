# file:///Users/aaron/projects/stories/subcutanean/Collapser/collapser/origply/doc/ply.html#ply_nn2

import ply.lex as lex
import result as res

__lexState = { "inCtrlSequence": False, "flaggedBad": False, "errorMessage": "" }

def resetLexState():
	__lexState["inCtrlSequence"] = False
	__lexState["flaggedBad"] = False
	__lexState["errorMessage"] = ""

# List of token names.   This is always required
tokens = (
   'CTRLBEGIN',
   'CTRLEND',
   'DIVIDER',
   'AUTHOR',
   'ALWAYS',
   'TEXT',
   'NUMBER',
   'COMMENT',
   'DEFINE',
   'VARIABLE',
   'MACRO',
   'LABEL',
   'CTRLSEQ_LABEL',
   'ERROR_LONE_GT',
   'ERROR_LONE_VAR'
)

# Regular expression rules for simple tokens
t_AUTHOR = r'\^'
t_ALWAYS = r'\~'

def t_VARIABLE(t):
	r'@[A-Za-z_\-][A-Za-z_\-0-9]*\>?'
	t.value = t.value[1:]
	t.value = t.value.rstrip('>')
	return t

def t_CTRLSEQ_LABEL(t):
	r'\*[A-Za-z_\-][A-Za-z_\-0-9]*\*'
	t.value = t.value[1:]
	t.value = t.value.rstrip('*')
	if not __lexState["inCtrlSequence"]:
		__lexState["flaggedBad"] = True
		__lexState["errorMessage"] = "CtrlSeq labels not allowed except at the start of control sequences. '*%s'" % t.value
		pass
	return t

def t_ERROR_LONE_VAR(t):
	r'@'
	__lexState["flaggedBad"] = True
	__lexState["errorMessage"] = "Variable op @ appeared but what came after was not recognized as a variable"
	pass

def t_NUMBER(t):
	r'[0-9]{1,2}\>'
	t.value = int(t.value[:-1])
	return t

def t_BAD_NUMBER(t):
	r'100'
	__lexState["flaggedBad"] = True
	__lexState["errorMessage"] = "Don't use NUMBER 100, just do the thing."
	pass

def t_ERROR_LONE_GT(t):
	r'\>'
	__lexState["flaggedBad"] = True
	__lexState["errorMessage"] = "Number op > appeared in unexpected spot"
	pass

def t_MACRO(t):
	r'(MACRO|STICKY_MACRO)\s*'
	t.value = t.value.rstrip()
	return t

def t_LABEL(t):
	r'LABEL\s*'
	return t

def t_DEFINE(t):
	r'DEFINE\s*'
	global __lexState
	__lexState["inDefine"] = True
	return t

def t_TEXT(t):
	r'[^\[\]\|\>\@\^\#\~\*]+'
	return t

def t_COMMENT(t):
	r'\#.*\n?'
	if __lexState["inCtrlSequence"]:
		__lexState["flaggedBad"] = True
		__lexState["errorMessage"] = "Comments not allowed within control sequences. Comment was: '%s'" % t.value
	pass # No return value. Token discarded

def t_EMPTY_CTRL_SEQ(t):
	r'\[\]'
	__lexState["flaggedBad"] = True
	__lexState["errorMessage"] = "Empty control sequence"
	pass

def t_CTRLBEGIN(t):
	r'\['
	global __lexState
	if __lexState["inCtrlSequence"]:
		__lexState["flaggedBad"] = True
		__lexState["errorMessage"] = "Illegal nested control sequence"
		pass
	__lexState["inCtrlSequence"] = True
	return t

def t_CTRLEND(t):
	r'\]'
	global __lexState
	if not __lexState["inCtrlSequence"]:
		__lexState["flaggedBad"] = True
		__lexState["errorMessage"] = "Unmatched closing control sequence character"
		pass
	__lexState["inCtrlSequence"] = False
	__lexState["inDefine"] = False
	return t

def t_DIVIDER(t):
	r'\|'
	global __lexState
	if not __lexState["inCtrlSequence"]:
		__lexState["flaggedBad"] = True
		__lexState["errorMessage"] = "Divider symbol found outside [ ]"
		pass
	return t


# Error handling rule
def t_error(t):
	print("Illegal character '%s'" % t.value[0])
	t.lexer.skip(1)



# Build the lexer
lexer = lex.lex()

def lex(text):
	resetLexState()
	lexer.input(text)
	result = res.Result(res.LEX_RESULT)
	prevTok = -1
	penultTok = -1
	while True:
		__lexState["flaggedBad"] = False
		tok = lexer.token()
		if __lexState["flaggedBad"]:
			result.flagBad(__lexState["errorMessage"], text, tok.lexpos)
			break
		if not tok: 
			if __lexState["inCtrlSequence"]:
				posOfCtrlStart = res.find_previous(text, '[', len(text)-1) - 1
				result.flagBad("No ending control sequence character", text, posOfCtrlStart)
			break
		if prevTok is not -1:
			onlyAllowedAtStart = ["AUTHOR", "ALWAYS"]
			apAfterText = tok.type in onlyAllowedAtStart and prevTok.type == "TEXT"
			apBeforeInvalid = tok.type != "TEXT" and tok.type != "DIVIDER" and tok.type != "VARIABLE" and tok.type != "CTRLEND" and prevTok.type in onlyAllowedAtStart
			if apAfterText or apBeforeInvalid:
				errMsg = ""
				if apAfterText:
					errMsg = "%s can only come at the start of a text" % tok.type
				else:
					errMsg = "Found '%s' but this is only allowed before TEXT, DIVIDER, VARIABLE, or CTRLEND" % tok.type
				result.flagBad(errMsg, text, tok.lexpos)
				break
		if tok.type == "DEFINE" and ( prevTok is -1 or prevTok.type != "CTRLBEGIN" ):
			result.flagBad("DEFINE can only appear at the start of a control sequence.", text, tok.lexpos)
			break;
		if tok.type == "VARIABLE" and ( prevTok is -1 or prevTok.type not in ["DEFINE", "AUTHOR", "NUMBER", "CTRLBEGIN", "DIVIDER", "CTRLSEQ_LABEL"] ):
			result.flagBad("Found a @variable but in an unexpected spot.", text, tok.lexpos)
			break;
		if prevTok is not -1:
			if prevTok.type == "DEFINE" and tok.type not in ["VARIABLE", "AUTHOR", "NUMBER"]:
				result.flagBad("DEFINE must be followed by a variable name, as in [DEFINE @var].", text, prevTok.lexpos)
				break;

			if tok.type == "DIVIDER" and prevTok.type == "NUMBER" and __lexState["inDefine"]:
				result.flagBad("A divider can't immediately follow a number within a define.", text, tok.lexpos)
				break;
			if __lexState["inCtrlSequence"]:
				if tok.type == "NUMBER" and prevTok.type == "NUMBER":
					result.flagBad("Two numbers immediately following each other is invalid.", text, tok.lexpos)
					break;
			if penultTok is not -1 and penultTok.type == "CTRLBEGIN" and prevTok.type == "VARIABLE" and tok.type == "CTRLEND":
				result.flagBad("Can't have a standalone [@variable]: must show text to print if true, i.e. [@var>hello].", text, tok.lexpos)
				break;
			if prevTok.type == "MACRO" and tok.type != "TEXT":
				result.flagBad("MACRO must be followed by text.", text, tok.lexpos)
			if prevTok.type == "LABEL" and tok.type != "TEXT":
				result.flagBad("LABEL must be followed by text.", text, tok.lexpos)
			if tok.type == "CTRLSEQ_LABEL" and prevTok.type != "CTRLBEGIN":
				result.flagBad("CTRLSEQ_LABEL can only appear as the first thing in a control sequence.", text, tok.lexpos)


		result.package.append(tok)
		penultTok = prevTok
		prevTok = tok
	return result


