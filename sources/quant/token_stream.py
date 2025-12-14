
import result


# Abstraction over an array of parsed tokens, which will be text or control sequences.

# TODO: Refactor so all the places looping through TokenStreams can use a more advanced structure. We need a function like "nextUpToCtrlSeq(seq_type)". Then we can just keep iterating and appending, and either discarding or processing the final sequence we get. 

class TokenStream:

	def __init__(self, tokens):
		self.reset()
		self.tokens = tokens

	def reset(self):
		self.pos = 0
		self.lastLexPos = -1

	def wasText(self):
		if self.pos == 0:
			return False
		return self.tokens[self.pos-1].type == "TEXT"

	# Get an array of either a single text token (in which case calling wasText will be true) or an array consisting of a complete control sequence, from a CTRLBEGIN tag to a CTRLEND tag.
	def next(self):
		if self.pos >= len(self.tokens):
			return None
		tok = self.tokens[self.pos]
		if tok.type == "TEXT":
			self.pos += 1
			return [tok]
		if tok.type == "CTRLBEGIN":
			ctrl_contents = []
			ctrl_contents.append(tok)
			self.pos += 1
			tok = self.tokens[self.pos]
			while tok.type != "CTRLEND":
				ctrl_contents.append(tok)
				self.pos += 1
				tok = self.tokens[self.pos]
			ctrl_contents.append(tok)
			self.lastLexPos = tok.lexpos
			self.pos += 1
			return ctrl_contents
		badResult = result.Result(result.PARSE_RESULT)
		badResult.flagBad("Unexpected token type found '%s'" % tok.type, "", tok.lexpos)
		raise result.ParseException(badResult)


# Abstraction over an array of parsed tokens when we only care about the control sequences, including the ability to get the ones before and after the current one we're considering.

class SequenceStream:

	def __init__(self, tokens):
		self.reset()
		self.sequences = []
		self.parseCtrlSeqs(tokens)

	def parseCtrlSeqs(self, tokens):
		ts = TokenStream(tokens)
		nextSection = ts.next()
		while nextSection is not None:
			if not ts.wasText():
				self.addSequence(nextSection, ts.lastLexPos)
			nextSection = ts.next()

	def addSequence(self, tokens, lastLexPos):
		# Strip begin/end tokens if present.
		if tokens[0].type == "CTRLBEGIN":
			tokens = tokens[1:len(tokens)-1]
		self.sequences.append([tokens, lastLexPos])

	def reset(self):
		self.pos = 0

	def preceding(self, offset):
		if self.pos - offset <= 1:
			return None
		return self.sequences[self.pos - 2 - offset]
	
	def next(self):
		if self.pos >= len(self.sequences):
			return None
		nextSeq = self.sequences[self.pos]
		self.pos += 1
		return nextSeq

	def following(self, offset):
		if self.pos + offset >= len(self.sequences):
			return None
		return self.sequences[self.pos + offset]


