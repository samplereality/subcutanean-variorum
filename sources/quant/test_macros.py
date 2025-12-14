# coding=utf-8

import test_quantparse 
import quantlex
import quantparse
import pytest

def parse(text, params = None):
	return test_quantparse.parse(text, params)
def verifyEachIsFound(opts, text, params = None):
	return test_quantparse.verifyEachIsFound(opts, text, params)


def test_macro_defs_are_recognized_and_stripped():
	text = "[MACRO test macro][~always show this]"
	result = parse(text)
	assert result == ""
	assert quantparse.macros.isMacro("test macro") == True
	assert quantparse.macros.isMacro("nonsense") == False

def test_invalid_macro_def():
	text = "[MACRO test] A macro always must be followed by a CtrlSeq"
	with pytest.raises(Exception) as e_info:
		parse(text)
	text = "[MACRO test][20>always|50>never] doubly defined [MACRO test][~whatever]"
	with pytest.raises(Exception) as e_info:
		parse(text)
	text = "[STICKY_MACRO test][20>always|50>never] doubly defined [STICKY_MACRO test][~whatever]"
	with pytest.raises(Exception) as e_info:
		parse(text)

def test_macro_expansion():
	text = '''[MACRO test][~always show this]Hello, and {test}'''
	result = parse(text)
	assert result == "Hello, and always show this"	
	text = '''Thank you, and {bye bye}.[MACRO bye bye][~goodnight]'''
	result = parse(text)
	assert result == "Thank you, and goodnight."	
	text = '''{night}, and dream.[MACRO night][~Night]'''
	result = parse(text)
	assert result == "Night, and dream."	

def test_macro_never_defined():
	text = '''Thank you, and {goodnight}'''
	with pytest.raises(Exception) as e_info:
		parse(text)
	text = '''[MACRO goodnigh][~A]Thank you, and {goodnight}'''
	with pytest.raises(Exception) as e_info:
		parse(text)

def test_formatting_codes_okay():
	text = '''It was a {i/wonderful} night, {friend}.[MACRO friend][~Cal]'''
	result = parse(text)
	assert result == "It was a {i/wonderful} night, Cal."

def test_macro_bad():
	text = '''Thank you {} and whatever.'''
	with pytest.raises(Exception) as e_info:
		parse(text)
	text = '''[MACRO testtest][~A]We have to {testtest finish a macro when we start it'''
	with pytest.raises(Exception) as e_info:
		parse(text)

def test_macro_expansions():
	text = '''[MACRO options][alpha|beta|gamma|]{options}'''
	verifyEachIsFound(["alpha", "beta", "gamma", ""], text)
	text = '''[MACRO a1][A|B][MACRO a2][C|D]{a1}{a2}'''
	verifyEachIsFound(["AC", "AD", "BC", "BD"], text)
	text = '''[MACRO a1][50>alpha|25>cappa]{a1}'''
	verifyEachIsFound(["alpha", "cappa", ""], text)

def test_alt_macro_syntax():
	text = '''Some text and $junk here.[MACRO junk][~this is stuff]'''
	result = parse(text)
	assert result == "Some text and this is stuff here."
	text = '''Some text and $junk here. Want to make sure this still $works even with multiple $junk.[MACRO junk][~this is stuff][MACRO works][~functions and $junk.]'''
	result = parse(text)
	assert result == "Some text and this is stuff here. Want to make sure this still functions and this is stuff. even with multiple this is stuff."
	text = '''[MACRO stuffs][~el stufes]$stuffs'''
	result = parse(text)
	assert result == "el stufes"
	text = '''$stuffs[MACRO stuffs][~el stufes]'''
	result = parse(text)
	assert result == "el stufes"


def test_nested_macros():
	text = '''[DEFINE ^@alpha][@alpha>{mactest}][MACRO mactest][~beta]'''
	params = quantparse.ParseParams(chooseStrategy="author")
	result = parse(text, params)
	assert result == "beta"
	text = '''[MACRO firstname][^Aaron|Bob|Carly][MACRO lastname][^Alda|Brockovich|Clayton]{firstname} {lastname}, {firstname} {lastname}'''
	result = parse(text, params)
	assert result == "Aaron Alda, Aaron Alda"

def test_more_nested_macros():
	text = '''[MACRO alpha][~apple {beta}][MACRO beta][~bear {cappa}][MACRO cappa][@delta>dog][DEFINE ^@delta]{alpha}'''
	params = quantparse.ParseParams(chooseStrategy="author")
	result = parse(text, params)
	assert result == "apple bear dog"
	text = '''{alpha}[MACRO alpha][~apple {beta}][MACRO beta][~bear {cappa}][MACRO cappa][@delta>dog][DEFINE ^@delta]'''
	result = parse(text, params)
	assert result == "apple bear dog"
	text = '''[MACRO alpha][~apple {beta}]{alpha}[MACRO beta][~bear {cappa}][MACRO cappa][@delta>dog][DEFINE ^@delta]'''
	result = parse(text, params)
	assert result == "apple bear dog"

def test_layered_macros():
	text = '''[MACRO alpha][@zetta>Use {beta} macro.][MACRO beta][@yotta>this is yotta|not yotta][DEFINE ^@zetta][DEFINE @yotta]{alpha}'''
	params = quantparse.ParseParams(chooseStrategy="author")
	result = parse(text, params)
	assert result == "Use not yotta macro."

	# Expanding macros should work even if start pos stays the same each time for a few expansions.
	text = '''{alpha}[MACRO alpha][~{beta}][MACRO beta][~{gamma}][MACRO gamma][~asdf]'''
	result = parse(text)
	assert result == "asdf"

def test_recursive_macro_guard():
	text = '''{alpha}[MACRO alpha][~{alpha}]'''
	with pytest.raises(Exception) as e_info:
		result = parse(text)

	text = '''{alpha}[MACRO alpha][~{beta}][MACRO beta][~{gamma}][MACRO gamma][~{alpha}]'''
	with pytest.raises(Exception) as e_info:
		result = parse(text)


def test_sticky_macro():
	text = '''[MACRO Soda][25>Sprite|25>Pepsi|25>Coke|25>Fresca]{Soda} {Soda} {Soda} {Soda} {Soda} {Soda} {Soda} {Soda} {Soda} {Soda}'''
	params = quantparse.ParseParams(chooseStrategy="random")
	result = parse(text, params).split()
	assert result[0] != result[1] or result[1] != result[2] or result[2] != result[3] or result[3] != result[4] or result[4] != result[5] or result[5] != result[6] or result[6] != result[7] or result[7] != result[8] or result[8] != result[9]
	text = '''[STICKY_MACRO Soda][25>Sprite|25>Pepsi|25>Coke|25>Fresca]{Soda} {Soda} {Soda} {Soda} {Soda} {Soda} {Soda} {Soda} {Soda} {Soda}'''
	result = parse(text, params).split()
	assert result[0] == result[1] and result[1] == result[2] and result[2] == result[3] and result[3] == result[4] and result[4] == result[5] and result[5] == result[6] and result[6] == result[7] and result[7] == result[8] and result[8] == result[9]

def test_author_preferred_macro():
	text = '''[MACRO text1][Wendy's|McDonalds|Arby's]I love to eat at {text1}.'''
	params = quantparse.ParseParams(chooseStrategy="author")
	for i in range(10):
		assert parse(text, params) == "I love to eat at Wendy's."
	text = '''[MACRO text1][Wendy's|^McDonalds|Arby's]I love to eat at {text1}.'''
	params = quantparse.ParseParams(chooseStrategy="author")
	for i in range(10):
		assert parse(text, params) == "I love to eat at McDonalds."

def test_author_preferred_sticky_macro():
	text = '''[STICKY_MACRO text1][Wendy's|McDonalds|Arby's]I love to eat at {text1}.'''
	params = quantparse.ParseParams(chooseStrategy="author")
	for i in range(10):
		assert parse(text, params) == "I love to eat at Wendy's."
	text = '''[STICKY_MACRO text1][Wendy's|^McDonalds|Arby's]I love to eat at {text1}.'''
	params = quantparse.ParseParams(chooseStrategy="author")
	for i in range(10):
		assert parse(text, params) == "I love to eat at McDonalds."

def test_macros_not_case_sensitive():
	text = '''Text [alpha {niko and i}|beta {niko and i}][MACRO niko and I][~was gone]'''
	result = parse(text)
	assert result in ["Text alpha was gone", "Text beta was gone"]

	text = '''Text [alpha {niko and I}|beta {niko and i}][MACRO niko and I][~was gone]'''
	result = parse(text)
	assert result in ["Text alpha was gone", "Text beta was gone"]

	text = '''Text [alpha {niko and I}|beta {niko and I}][MACRO niko and i][~was gone]'''
	result = parse(text)
	assert result in ["Text alpha was gone", "Text beta was gone"]
