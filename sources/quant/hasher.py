
import hashlib

def hash(text):
	# Return a unique hash for this string of text.
	return hashlib.md5(text).hexdigest()