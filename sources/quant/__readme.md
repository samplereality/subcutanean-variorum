# Collapser Source Code

The raw Python source code for the Collapser program used to generate Subcutanean is contained here. This has not been cleaned up for general purpose use and is likely to require some surgery to be used for a different project.

* This is Python 2 code which was on the verge of becoming obselete when written: sorry! The main entry point is "collapser.py". Invoke with:

> python collapser.py --help

* Collapser reads in a custom format "Quant", documented in the file _collapser-syntax.txt

* Several external libraries and command-line programs not included here are required for the code to run, including:

    - the PLY package by David Beazley (used for lexing)
    - the TextBlob package
    - KindleGen (to generate .mobi files)
    - For PDF output, pdftk

* The terminal.py module was designed for interfacing with Mac OS terminal and probably would need rewriting to work with a different OS.

* Unit tests exist in the test_*.py files and can be run on the command line with:

> pytest

* There are also two standalone programs:
    - tweetmaker.py (to make randomly varying promotional tweets)
    - tweet_teller.py (to perform a reading from a version of the text). This requires keys not included in this repo to run as designed, but can be simulated if the "tweeters" variable at the top is set to ["CONSOLE"]


