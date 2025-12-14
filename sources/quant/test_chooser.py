

import chooser

def test_oneOf():
	options = ["a", "b", "c"]
	for i in range(1,10):
		result = chooser.oneOf(options)
		assert result in options

def test_seed():
	seed = 42
	chooser.setSeed(seed)
	options = ["alpha", "beta", "gamma", "delta", "epsilon", "omega"]
	fixedResult1 = chooser.oneOf(options)
	fixedResult2 = chooser.oneOf(options)
	fixedResult3 = chooser.oneOf(options)
	for i in range(1,10):
		chooser.setSeed(seed)
		assert chooser.oneOf(options) == fixedResult1
		assert chooser.oneOf(options) == fixedResult2
		assert chooser.oneOf(options) == fixedResult3
	chooser.unSeed()