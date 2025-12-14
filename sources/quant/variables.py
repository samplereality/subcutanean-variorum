
import ctrlseq
import chooser
import result
import token_stream
import sys

class Variables:
	def __init__(self):
		self.variables = {}
		self.varGroups = {}   # key=groupname, val=array of var keys in that group

	# Note that this can be false EITHER if the variable has never been defined OR if it was set to false.
	def check(self, key):
		if key in self.variables:
			return self.variables[key]
		return False

	def exists(self, key):
		return key in self.variables

	def set(self, groupname, key, val = True):
		self.variables[key] = val
		if groupname not in self.varGroups:
			self.varGroups[groupname] = []
		if key not in self.varGroups[groupname]:
			self.varGroups[groupname].append(key)

	def getGroupFromVar(self, key):
		for groupKey, groupVal in self.varGroups.iteritems():
			if key in groupVal:
				return groupKey
		return ""

	def getSignature(self):
		groupKeys = sorted(self.varGroups.keys())
		output = ""
		for key in groupKeys:
			found = False
			keys = self.varGroups[key]
			for v in self.varGroups[key]:
				if self.check(v):
					sig = "%s: %s\n" % (key, v)
					output += sig
					found = True
					break
			if not found:
				output += "%s: False\n" % key

		return output

	def shuffleGroupVal(self, key):
		groupKey = self.getGroupFromVar(key)
		if groupKey == "":
			print "*** Error: Tried to call shuffleGroupVal('%s') but no such variable key was found." % key
			sys.exit()
		theSetOne = ""
		for v in self.getVarsInGroup(groupKey):
			if self.check(v):
				theSetOne = v
		remainders = self.getVarsInGroup(groupKey)
		if theSetOne != "":
			remainders.remove(theSetOne)
		choice = chooser.oneOf(remainders)
		for v in self.getVarsInGroup(groupKey):
			if v == choice:
				self.set(groupKey, v, True)
			else:
				self.set(groupKey, v, False)


	def getVarsInGroup(self, key):
		return [] + self.varGroups[key]

	# [ @alpha> A ]
	# [ @alpha> A | B ]
	# [ @alpha> | B ]
	# [ @alpha> A | @beta> B]

	def render(self, tokens, params):
		pos = 0
		# First ensure all vars are in same control group
		varCtrlGroup = ""
		posOfFreeText = -1
		while pos < len(tokens):
			if tokens[pos].type == "VARIABLE":
				varName = tokens[pos].value.lower()
				if not self.exists(varName):
					badResult = result.Result(result.PARSE_RESULT)
					badResult.flagBad("Text conditional on variable '%s' which has not been defined." % varName, params.originalText, tokens[pos].lexpos)
					raise result.ParseException(badResult)
				thisCtrlGroup = self.getGroupFromVar(varName)
				if varCtrlGroup == "":
					varCtrlGroup = thisCtrlGroup
				elif varCtrlGroup != thisCtrlGroup:
					badResult = result.Result(result.PARSE_RESULT)
					badResult.flagBad("Found variables from different groups", params.originalText, tokens[pos].lexpos)
					raise result.ParseException(badResult)
			elif tokens[pos].type == "TEXT" and pos > 0 and tokens[pos-1].type != "VARIABLE":
				posOfFreeText = pos
			pos += 1

		if posOfFreeText >= 0 and posOfFreeText != len(tokens) - 1:
			badResult = result.Result(result.PARSE_RESULT)
			badResult.flagBad("Found unexpected variable at pos %d" % posOfFreeText, params.originalText, tokens[0].lexpos)
			raise result.ParseException(badResult)

		# Now figure out how to render.
		pos = 0
		while pos < len(tokens):
			# For this group, if we have only text, this is an alternative where nothing previous matched; we should return it.
			if tokens[pos].type == "TEXT":
				return tokens[pos].value

			if tokens[pos].type == "DIVIDER":
				pos += 1
				continue

			#Otherwise, we must be at a variable.
			assert tokens[pos].type == "VARIABLE"
			varName = tokens[pos].value.lower()
			pos += 1

			# A variable can be followed by either text, or a divider or end of the stream. If text, return the text if that variable is true.
			if tokens[pos].type == "TEXT":
				if varName in params.setDefines or self.check(varName):
					return tokens[pos].value

			# If it's a divider, return an empty string if the variable is true.
			elif tokens[pos].type == "DIVIDER":
				if varName in params.setDefines or self.check(varName):
					return ""

			pos += 1

		return ""


__v = Variables()

def showAllVars():
	global __v
	return __v.variables.keys()

def showVars():
	global __v
	return {k for k, v in __v.variables.items() if v == True}

def showGroups():
	global __v
	return __v.varGroups

def reset():
	global __v
	__v = Variables()

def set(key, val):
	global __v
	if key in __v.variables:
		__v.variables[key] = val

def setAllTo(val):
	global __v
	for key in __v.variables:
		__v.variables[key] = val

def isSingularCopy():
	global __v
	for key in __v.variables:
		if __v.variables[key] == True and key[:8] == "singular":
			return True
	return False 

def render(tokens, params):
	global __v
	return __v.render(tokens, params)

def renderAll(tokens):
	global __v
	pos = 0
	alts = ctrlseq.Alts()
	varGroupKey = None
	varsInGroup = []
	while pos < len(tokens):
		if tokens[pos].type == "TEXT":
			if len(varsInGroup) == 1:
				# [DEFINE @A|@B|@C][@A>one|@B>two|three]
				alts.add(tokens[pos].value, fromVar = varsInGroup[0])
			else:
				# [DEFINE @A][@A>one|not one]
				alts.add(tokens[pos].value, fromVar = __v.getVarsInGroup(varGroupKey)[0])
			return alts.alts
		if tokens[pos].type == "DIVIDER":
			pos += 1
			continue
		assert tokens[pos].type == "VARIABLE"
		varName = tokens[pos].value.lower()
		if varGroupKey is None:
			varGroupKey = __v.getGroupFromVar(varName)
			if varGroupKey == "":
				badResult = result.Result(result.PARSE_RESULT)
				badResult.flagBad("Unrecognized variable found: '%s'" % varName, "", -1)
				raise result.ParseException(badResult)
			varsInGroup = __v.getVarsInGroup(varGroupKey)
		pos += 1
		if tokens[pos].type == "TEXT":
			alts.add(tokens[pos].value, fromVar = varName)
		elif tokens[pos].type == "DIVIDER":
			assert len(varsInGroup) >= 1
			alts.add("", fromVar = varsInGroup[0])
		if varName in varsInGroup:
			varsInGroup.remove(varName)
		pos += 1
	if len(alts.alts) == 1:
		alts.add("")
	return alts.alts

def check(key):
	global __v
	return __v.check(key)


def stripDefs(tokens, params):
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
		if ctrlParam != "DEFINE":
			output += nextSection
			continue
	return output

# Store all DEFINE definitions in "variables" and strip them from the token stream.
def handleDefs(tokens, params):
	output = []
	index = 0
	lastVarName = ""
	chooser.resetIter("groups")
	global __v
	params.setDefines = map(lambda x: x.lower(), params.setDefines)
	while index < len(tokens):
		foundAuthorPreferred = False
		token = tokens[index]
		if token.type != "CTRLBEGIN":
			output.append(token)
			index += 1
			continue
		index += 1
		token = tokens[index]
		if token.type != "DEFINE":
			output.append(tokens[index-1])
			output.append(token)
			index += 1
			continue
		index += 1
		token = tokens[index]
		alts = ctrlseq.Alts()
		probTotal = 0
		foundSetDefine = False
		groupName = "group%d" % chooser.iter("groups")
		while token.type != "CTRLEND":
			ctrl_contents = []
			while token.type not in ["DIVIDER", "CTRLEND"]:
				ctrl_contents.append(token)
				index += 1
				token = tokens[index]
			item = ctrlseq.parseItem(ctrl_contents, params)
			assert tokens[index-1].type == "VARIABLE"
			varname = item.txt.lower()
			lastVarName = varname
			if varname in __v.variables:
				badResult = result.Result(result.PARSE_RESULT)
				badResult.flagBad("Variable '@%s' is defined twice." % varname, params.originalText, tokens[index-1].lexpos)
				raise result.ParseException(badResult)
			if varname in params.setDefines:
				__v.set(groupName, varname)
				foundSetDefine = True
			elif "^" + varname in params.setDefines:
				__v.set(groupName, varname, False)
				foundSetDefine = True
			else:
				if item.authorPreferred:
					foundAuthorPreferred = True
					alts.setAuthorPreferred()
				if item.prob:
					probTotal += item.prob
				alts.add(varname, item.prob)

				__v.set(groupName, item.txt, False)

			if token.type == "DIVIDER":
				index += 1 
				token = tokens[index]

		if not foundSetDefine:
			if len(alts) > 1 and probTotal != 0 and probTotal != 100:
				badResult = result.Result(result.PARSE_RESULT)
				badResult.flagBad("Probabilities in a DEFINE must sum to 100: found %d instead in '%s'" % (probTotal, alts), params.originalText, tokens[index-1].lexpos)
				raise result.ParseException(badResult)
			if len(alts) == 0:
				__v.set(groupName, lastVarName, False)
			elif params.chooseStrategy == "author" and len(alts) == 1 and not foundAuthorPreferred:
				varPicked = alts.getAuthorPreferred()
				__v.set(groupName, varPicked, False)
			elif params.chooseStrategy == "author":
				varPicked = alts.getAuthorPreferred()
				__v.set(groupName, varPicked)
			elif len(alts) == 1:
				varPicked = alts.getRandom()
				__v.set(groupName, varPicked, chooser.percent(50))
			else:
				varPicked = alts.getRandom()
				__v.set(groupName, varPicked)

		index += 1 # skip over final CTRLEND
	return output

