
import random
import fileio

def number(highest):
	return random.randint(1,highest)

__noRepeatTracker = {}
def numberNoRepeat(key, highest):
	global __noRepeatTracker
	num = 0
	if highest <= 1:
		return 1
	if key not in __noRepeatTracker:
		num = number(highest)
	else:
		lastTime = __noRepeatTracker[key]
		num = number(highest - 1)
		if num >= lastTime:
			num += 1
	__noRepeatTracker[key] = num
	return num

def oneOf(item, pure=False):
	if pure:
		saved_rng_state = random.getstate()
		unSeed()
		randomSeed()
	result = random.choice(item)
	if pure:
		random.setstate(saved_rng_state)
	return result

def oneOfNoRepeat(key, item):
	if len(item) == 0:
		return ""
	if len(item) == 1:
		return item[0]
	return item[numberNoRepeat(key, len(item))-1]

__iterators = {}
def iter(key):
	global __iterators
	if key not in __iterators:
		__iterators[key] = 0
	__iterators[key] += 1
	return __iterators[key]

def resetIter(key):
	global __iterators
	if key in __iterators:
		__iterators[key] = 0

def resetAllIters():
	global __iterators
	global __noRepeatTracker
	__iterators = {}
	__noRepeatTracker = {}


def percent(odds):
	return random.randint(1,100) <= odds

def setSeed(num):
	random.seed(num)

def randomSeed():
	series = 0

	rSeed = number(10000000)
	random.seed(rSeed)
	return rSeed

def nextSeed(generation):
	seed = fileio.getNextSeedFromFile(generation)
	setSeed(seed)
	return seed

def unSeed():
	random.seed()

# Alts is an array of quantparse.Item, each of which has a "txt" and "prob". Prob is the percent chance that option will be chosen.
def distributedPick(alts):
	pick = random.randint(1,100)
	measure = 0
	for item in alts:
		if item.prob is None:
			# Case of [X or|^]
			return item.txt
		measure += item.prob
		if pick <= measure:
			return item.txt

	# If we've run out of numbers but we're still here, it means we had empty space, i.e. [60>alpha|20>beta] which means the remaining probability space prints nothing.
	return ""