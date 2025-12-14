
LEX_RESULT = 10
PARSE_RESULT = 11

class Result:
	def __init__(self, resultType):
		self.resultType = resultType
		self.package = []
		self.isValid = True
		self.errorLineNumber = -1
		self.errorColumn = -1
		self.errorLineText = ""
		self.errorMessage = ""
		self.filename = ""

	def flagBad(self, msg, text, startPos):
		self.isValid = False
		self.errorMessage = msg
		self.errorLineNumber = find_line_number_for_file(text, startPos)
		self.errorColumn = find_column(text, startPos)
		self.errorLineText = find_line_text(text, startPos)
		self.filename = find_filename(text, startPos) if startPos != -1 else "unknown file"

	def showError(self):
		# Only show one line's worth of line
		col = self.errorColumn
		lineText = self.errorLineText
		if col > 80:
			if len(lineText) < 120:
				lineText = lineText + (" " * 40)
			lineText = lineText[col-40:col+40]
			col = 40
		elif len(lineText) > 80:
			lineText = lineText[0:80]

		caret = (" " * (col-1+2)) + "^"
		typeName = self.getPrintedTypeName().capitalize()
		return "******************************************************\n %s found a problem in %s line %d column %d:\n ** %s\n\n> %s\n%s" % (typeName, self.filename, self.errorLineNumber, self.errorColumn, self.errorMessage, lineText, caret)

	def getPrintedTypeName(self):
		if self.resultType == LEX_RESULT:
			return "lexer"
		elif self.resultType == PARSE_RESULT:
			return "parser"
		return "unknown result"

	def __str__(self):
		if self.isValid == False:
			return self.showError()
		else:
			output = ""
			for item in self.package:
				output += str(item) + ", "
			return output


__fn_mask = '% file '

# Compute stuff about the current position.
def find_column(input, pos):
    line_start = input.rfind('\n', 0, pos) + 1
    return (pos - line_start) + 1

def find_line_number(input, pos):
	return input[:pos].count('\n') + 1

def find_line_number_for_file(input, pos):
	fn_start = find_previous(input, __fn_mask, pos)
	return input[fn_start:pos].count('\n') - 1

def find_previous(input, txt, pos):
	return input.rfind(txt, 0, pos) + 1

def find_line_text(input, pos):
	line_start = find_previous(input, '\n', pos)
	line_end = input.find('\n', line_start)
	return input[line_start:line_end]

def find_filename(input, pos):
	fn_start = find_previous(input, __fn_mask, pos)
	fn_end = input.find('\n', fn_start)
	return input[fn_start+(len(__fn_mask)-1):fn_end]

class ParseException(Exception):
	def __init__(self, result):
		Exception.__init__(self, "ParseException")
		self.result = result


