
import quantlex


def dumpTokens(toks):
	print "DUMP"
	for pos, tok in enumerate(toks):
		print "%d: (%s) %s" % (pos, tok.type, tok.value)

def test_basic_count():
	text = "This is text with [some values] inside."
	result = quantlex.lex(text)
	assert result.isValid
	assert len(result.package) == 5  # text, ctrlbegin, text, ctrlend, text

def test_identify_text():
	text = "This is text."
	toks = quantlex.lex(text).package
	assert len(toks) == 1
	assert toks[0].type == "TEXT"
	assert toks[0].value == "This is text."

def test_full_line_comments_ignored():
	text = """# This is a comment. This is still a comment.
But this is text.
#And another # comment####.   # 
More normal text.
Even more normal text"""
	toks = quantlex.lex(text).package
	assert len(toks) == 2
	assert toks[0].type == "TEXT"
	assert toks[0].value == "But this is text.\n"
	assert toks[1].type == "TEXT"
	assert toks[1].value == "More normal text.\nEven more normal text"

def test_end_line_comments_ignored():
	text = "This is text. #and this is a comment."
	toks = quantlex.lex(text).package
	assert len(toks) == 1
	assert toks[0].type == "TEXT"
	assert toks[0].value == "This is text. "

def test_alternatives():
	text = "This is text with [some|alternatives] inside it."
	toks = quantlex.lex(text).package
	assert len(toks) == 7
	assert toks[0].type == "TEXT"
	assert toks[0].value == "This is text with "
	assert toks[1].type == "CTRLBEGIN"
	assert toks[2].type == "TEXT"
	assert toks[2].value == "some"
	assert toks[3].type == "DIVIDER"
	assert toks[4].type == "TEXT"
	assert toks[4].value == "alternatives"
	assert toks[5].type == "CTRLEND"
	assert toks[6].type == "TEXT"
	assert toks[6].value == " inside it."

def test_author_preferred():
	text = "[^author preferred|alt]"
	toks = quantlex.lex(text).package
	assert toks[0].type == "CTRLBEGIN"
	assert toks[1].type == "AUTHOR"
	assert toks[2].type == "TEXT"
	assert toks[2].value == "author preferred"

# Must be followed by a text block; can't be preceeded by a text block.
def test_bad_author_preferred():
	text = "[cant_be_at_end^|of block]"
	result = quantlex.lex(text)
	assert result.isValid == False
	text = "[cant_be_in_^middle|of block]"
	result = quantlex.lex(text)
	assert result.isValid == False

def test_always_print():
	text = "[~always print this]"
	toks = quantlex.lex(text).package
	assert toks[0].type == "CTRLBEGIN"
	assert toks[1].type == "ALWAYS"
	assert toks[2].type == "TEXT"
	assert toks[2].value == "always print this"

def test_prevent_nesting():
	text = "[don't allow [nested] sequences]"
	result = quantlex.lex(text)
	assert result.isValid == False

def test_multiline_sequences():
	text = """
This is the [start of a big
sequence that spans a number
of lines and goes on for a
while before ending] with the
last character."""
	result = quantlex.lex(text)
	assert result.isValid
	assert len(result.package) == 5
	assert result.package[2].value == "start of a big\nsequence that spans a number\nof lines and goes on for a\nwhile before ending"

def test_no_end_ctrl():
	text = """
This [is] the [start of a control
sequence that never ends, whoops,
we should do something about
that really."""
	result = quantlex.lex(text)
	assert result.isValid == False

def test_extra_end_ctrl():
	text = """
This is [a series of perfectly
legitimate] control [seqs] but
we've got an extra here] which
really shouldn't be there."""
	result = quantlex.lex(text)
	assert result.isValid == False

def test_bad_divider_pos():
	text = "A divider | can't be outside a [sequence]."
	result = quantlex.lex(text)
	assert result.isValid == False

def test_bad_empty_control_seq():
	text = "Can't [have] [] empty control sequence."
	result = quantlex.lex(text)
	assert result.isValid == False
	text = "An optional space[ ] is okay."
	result = quantlex.lex(text)
	assert result.isValid == True

def test_lex_probabilities():
	text = "Text [40>alpha|60>gamma] text"
	result = quantlex.lex(text)
	assert result.isValid == True
	toks = result.package
	assert toks[0].type == "TEXT"
	assert toks[1].type == "CTRLBEGIN"
	assert toks[2].type == "NUMBER"
	assert toks[2].value == 40
	assert toks[3].type == "TEXT"
	assert toks[3].value == "alpha"
	assert toks[4].type == "DIVIDER"
	assert toks[5].type == "NUMBER"
	assert toks[5].value == 60
	assert toks[6].type == "TEXT"
	assert toks[6].value == "gamma"
	assert toks[7].type == "CTRLEND"
	assert toks[8].type == "TEXT"
	assert toks[8].value == " text"

def test_lex_nums_with_alts():
	text = "[20> as mine|^]"
	result = quantlex.lex(text)
	assert result.isValid == True
	text = "[20>^ as mine|]"
	result = quantlex.lex(text)
	assert result.isValid == True

def test_numbers_one_or_two_digits():
	text = "[>test]"
	result = quantlex.lex(text)
	assert result.isValid == False
	text = "[1>test]"
	result = quantlex.lex(text)
	assert result.isValid == True
	text = "[10>test]"
	result = quantlex.lex(text)
	assert result.isValid == True
	text = "[100>test]"
	result = quantlex.lex(text)
	assert result.isValid == False
	text = "[999>test]"
	result = quantlex.lex(text)
	assert result.isValid == False
	text = "[837183735>test]"
	result = quantlex.lex(text)
	assert result.isValid == False

def test_variable_with_named_options():
	text = "[DEFINE 25>@alpha|25>@beta|25>@gamma|25>@epsilon][@alpha>Adam|@beta>Barney|@gamma>Gerald|@epsilon>Ernie]"
	result = quantlex.lex(text)
	assert result.isValid == True

def test_numbers_only_parsed_in_right_place():
	text = "I'm 40 years old! [50>alpha]"
	toks = quantlex.lex(text).package
	assert toks[0].type == "TEXT"
	assert toks[0].value == "I'm 40 years old! "
	
	text = "[10>I'm 50 years old.|90>I'm 90 years old.]"
	toks = quantlex.lex(text).package
	assert toks[2].value == "I'm 50 years old."
	assert toks[5].value == "I'm 90 years old."

	text = "[This > isn't right]"
	result = quantlex.lex(text)
	assert result.isValid == False

	text = "[alpha 50>|beta 60>]"
	result = quantlex.lex(text)
	assert result.isValid == False

def test_define_and_variable_lexing():
	text = "Should see [DEFINE @temp]."
	result = quantlex.lex(text)
	assert result.isValid == True
	toks = result.package
	assert toks[2].type == "DEFINE"
	assert toks[3].type == "VARIABLE"
	assert toks[3].value == "temp"
	assert toks[5].type == "TEXT"
	assert toks[5].value == "."

def test_bad_define_lexing():
	text = "Can't have [80>DEFINE @test] in unexpected places."
	result = quantlex.lex(text)
	assert result.isValid == False
	text = "Can't have [DEFINE] without a variable."
	result = quantlex.lex(text)
	assert result.isValid == False
	text = "Can't have [DEFINE @] without a variable name."
	result = quantlex.lex(text)
	assert result.isValid == False
	text = "Can't have [DEFINE @}] with an invalid variable name."
	result = quantlex.lex(text)
	assert result.isValid == False
	text = "Can't have [@DEFINE @pizza}] invalid define."
	result = quantlex.lex(text)
	assert result.isValid == False

def test_complex_defines():
	text = "[DEFINE @test1][DEFINE @test2]This is a test of [DEFINE @test3]stripping.[DEFINE   @test4]"
	result = quantlex.lex(text)
	assert result.isValid == True
	toks = result.package
	assert len(toks) == 18

def test_define_with_author_preferred():
	text = "Text [DEFINE ^@var] text."
	result = quantlex.lex(text)
	assert result.isValid == True
	toks = result.package
	assert toks[2].type == "DEFINE"
	assert toks[3].type == "AUTHOR"
	assert toks[4].type == "VARIABLE"
	assert toks[4].value == "var"
	assert toks[5].type == "CTRLEND"

def test_define_lone_probabilities():
	text = "Blah de blah [DEFINE 80>@wordy]."
	result = quantlex.lex(text)
	assert result.isValid == True
	toks = result.package
	assert toks[3].value == 80
	assert toks[4].value == "wordy"
	text = "Blah de blah [DEFINE 10>^@dorky]."
	result = quantlex.lex(text)
	assert result.isValid == True
	toks = result.package
	assert toks[3].value == 10
	assert toks[4].type == "AUTHOR"
	assert toks[5].value == "dorky"

def test_define_with_probabilities():
	text = "Text [DEFINE 80>@wordy|20>^@taciturn] end."
	result = quantlex.lex(text)
	assert result.isValid == True
	toks = result.package
	assert toks[2].type == "DEFINE"
	assert toks[3].type == "NUMBER"
	assert toks[3].value == 80
	assert toks[4].type == "VARIABLE"
	assert toks[4].value == "wordy"
	assert toks[5].type == "DIVIDER"
	assert toks[6].type == "NUMBER"
	assert toks[6].value == 20
	assert toks[7].type == "AUTHOR"
	assert toks[8].type == "VARIABLE"
	assert toks[8].value == "taciturn"
	assert toks[9].type == "CTRLEND"

def test_define_with_even_probabilities():
	text = "Text [DEFINE @wordy|@average|@taciturn] end."
	result = quantlex.lex(text)
	assert result.isValid == True

def test_bad_define_with_probabilities():
	text = "[DEFINE 80>|20>@test]"
	result = quantlex.lex(text)
	assert result.isValid == False
	text = "[DEFINE ^80>@blurb|20>@test]"
	result = quantlex.lex(text)
	assert result.isValid == False
	text = "[DEFINE 80>20>@test]"
	result = quantlex.lex(text)
	assert result.isValid == False
	text = "[DEFINE 80>@test]20>@oops]"
	result = quantlex.lex(text)
	assert result.isValid == False

def test_using_defines():
	text = "[DEFINE @using]test of [@using>defines]."
	result = quantlex.lex(text)
	assert result.isValid == True
	toks = result.package
	assert toks[0].type == "CTRLBEGIN"
	assert toks[1].type == "DEFINE"
	assert toks[2].type == "VARIABLE"
	assert toks[2].value == "using"
	assert toks[3].type == "CTRLEND"
	assert toks[4].type == "TEXT"
	assert toks[4].value == "test of "
	assert toks[5].type == "CTRLBEGIN"
	assert toks[6].type == "VARIABLE"
	assert toks[6].value == "using"
	assert toks[7].type == "TEXT"
	assert toks[7].value == "defines"
	assert toks[8].type == "CTRLEND"
	assert toks[9].type == "TEXT"
	assert toks[9].value == "."

def test_bad_using_defines():
	text = "[DEFINE @using]test of [@using]."
	result = quantlex.lex(text)
	assert result.isValid == False

def test_bad_variable_refs():
	text = "[DEFINE ^@test][@test>@alpha]Huzzah!"
	result = quantlex.lex(text)
	assert result.isValid == False

	text = "[DEFINE ^@test][@test>]"
	result = quantlex.lex(text)
	assert result.isValid == False

def test_lexing_define_with_else():
	text = "[DEFINE @test][@test>if text|else text]"
	result = quantlex.lex(text)
	assert result.isValid == True
	toks = result.package
	assert toks[5].type == "VARIABLE"
	assert toks[5].value == "test"
	assert toks[6].type == "TEXT"
	assert toks[6].value == "if text"
	assert toks[7].type == "DIVIDER"
	assert toks[8].type == "TEXT"
	assert toks[8].value == "else text"
	assert toks[9].type == "CTRLEND"

	text = "[DEFINE @test][@test>|else text only]"
	result = quantlex.lex(text)
	assert result.isValid == True
	toks = result.package
	assert toks[5].type == "VARIABLE"
	assert toks[5].value == "test"
	assert toks[6].type == "DIVIDER"
	assert toks[7].type == "TEXT"
	assert toks[7].value == "else text only"
	assert toks[8].type == "CTRLEND"

def test_lex_macro_defs():
	text = "[MACRO this is a macro][~some text]"
	result = quantlex.lex(text)
	assert result.isValid == True
	toks = result.package
	assert toks[1].type == "MACRO"
	assert toks[2].type == "TEXT"
	assert toks[2].value == "this is a macro"
	assert toks[3].type == "CTRLEND"
	assert toks[4].type == "CTRLBEGIN"

def test_bad_macro_lex():
	text = "[MACRO 80>This is fun.][~text]"
	result = quantlex.lex(text)
	assert result.isValid == False
	text = "[MACRO @test][~text]"
	result = quantlex.lex(text)
	assert result.isValid == False

def test_macro_triggers_lex_as_text():
	text = '''Some {macro trigger} fun'''
	result = quantlex.lex(text)
	assert result.isValid == True
	toks = result.package
	assert len(toks) == 1
	assert toks[0].type == "TEXT"
	assert toks[0].value == '''Some {macro trigger} fun'''

def test_lex_sticky_macro():
	text = "[STICKY_MACRO fun times]"
	result = quantlex.lex(text)
	assert result.isValid == True
	toks = result.package
	assert len(toks) == 4
	assert toks[0].type == "CTRLBEGIN"
	assert toks[1].type == "MACRO"
	assert toks[1].value == "STICKY_MACRO"
	assert toks[2].type == "TEXT"
	assert toks[2].value == "fun times"
	assert toks[3].type == "CTRLEND"
	text = "[MACRO fun times]"
	toks = quantlex.lex(text).package
	assert toks[1].value == "MACRO"

def test_lex_labels():
	text = "[LABEL labelName]"
	result = quantlex.lex(text)
	assert result.isValid == True
	toks = result.package
	assert len(toks) == 4
	assert toks[0].type == "CTRLBEGIN"
	assert toks[1].type == "LABEL"
	assert toks[2].type == "TEXT"
	assert toks[2].value == "labelName"
	assert toks[3].type == "CTRLEND"

def test_lex_ctrlseqlabel():
	text = "[*Label1*alpha|omega]"
	result = quantlex.lex(text)
	assert result.isValid == True
	toks = result.package
	assert len(toks) == 6
	assert toks[0].type == "CTRLBEGIN"
	assert toks[1].type == "CTRLSEQ_LABEL"
	assert toks[1].value == "Label1"
	assert toks[2].type == "TEXT"
	assert toks[2].value == "alpha"
	assert toks[3].type == "DIVIDER"
	assert toks[4].type == "TEXT"
	assert toks[4].value == "omega"
	assert toks[5].type == "CTRLEND"

	text = "[DEFINE @georgia]Hnnn[*MyLabel*@georgia>text1|text2]"
	result = quantlex.lex(text)
	assert result.isValid == True
	toks = result.package
	assert toks[5].type == "CTRLBEGIN"
	assert toks[6].type == "CTRLSEQ_LABEL"
	assert toks[6].value == "MyLabel"
	assert toks[7].type == "VARIABLE"
	assert toks[7].value == "georgia"
	assert toks[8].type == "TEXT"
	assert toks[8].value == "text1"

	text = "[*HurdyGurd*50>one|50>two]"
	result = quantlex.lex(text)
	assert result.isValid == True
	toks = result.package
	assert toks[0].type == "CTRLBEGIN"
	assert toks[1].type == "CTRLSEQ_LABEL"
	assert toks[1].value == "HurdyGurd"
	assert toks[2].type == "NUMBER"
	assert toks[2].value == 50
	assert toks[3].type == "TEXT"
	assert toks[3].value == "one"	

def test_bad_lex_ctrlseqlabel():
	text = "Hmm *Label1* [alpha|omega]"
	result = quantlex.lex(text)
	assert result.isValid == False

	text = "[alpha|*label*omega]"
	result = quantlex.lex(text)
	assert result.isValid == False

	text = "[DEFINE @georgia][@georgia>*label*alpha|omega]"
	result = quantlex.lex(text)
	assert result.isValid == False

