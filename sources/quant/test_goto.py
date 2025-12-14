# coding=utf-8

# [@originalniko>{JUMP originalNikoFinale}]
# [LABEL originalNikoFinale]


import test_quantparse 
import quantlex
import quantparse
import pytest

def parse(text, params = None):
	return test_quantparse.parse(text, params)
def verifyEachIsFound(opts, text, params = None):
	return test_quantparse.verifyEachIsFound(opts, text, params)

def test_label_defs_are_recognized_and_stripped():
	text = "[LABEL test label]always show this"
	result = parse(text)
	assert result == "always show this"

def test_labels_cant_be_defined_twice():
	text = "[LABEL test label] text [LABEL another label] more text [LABEL test label]"
	with pytest.raises(Exception) as e_info:
		parse(text)

def test_labels_work():
	text = "Text: {JUMP myTestLabel}we should never see this   [LABEL myTestLabel]Instead we should see this."
	result = parse(text)
	assert result == "Text: Instead we should see this."	

def test_cant_jump_to_undefined_label():
	text = "Text: {JUMP fake_label} blah."
	with pytest.raises(Exception) as e_info:
		parse(text)

def test_cant_jump_backwards():
	text = "[LABEL myTestLabel]This comes first. {JUMP myTestLabel}"
	with pytest.raises(Exception) as e_info:
		parse(text)

def test_jump_to_very_end():
	text = "{JUMP theVeryEnd}  None of this text should ever be printed at all, in fact, we should print nothing, even if there are {JUMP bit2} some intermediary [LABEL bit2] bits in between. [LABEL theVeryEnd]"
	result = parse(text)
	assert result == ""

def test_jumps_work_within_conditions():
	text = "[DEFINE @alpha|@omega]Intro. [@alpha>{JUMP alphaBit}|@omega>{JUMP omegaBit}]. Disregard. [LABEL alphaBit]This is the alpha bit.{JUMP end}  [LABEL omegaBit]This is the omega bit.[LABEL end]"
	for i in range(10):
		assert parse(text) in ["Intro. This is the alpha bit.", "Intro. This is the omega bit."]

def test_jumps_work_within_macros():
	text = "Well that's a fine {howdoyado}. [MACRO howdoyado][~How do ya {JUMP finalDo}]    poopy    [LABEL finalDo]dooo."
	result = parse(text)
	assert result == "Well that's a fine How do ya dooo."

