# Standalone program that will read in an input file(s) of prepared Tweet-length contents, and output them spaced out over a given amount of time. 


import fileio
import chooser
import twitter

import sys
import getopt
import threading
import time
import re
import getch

def showUsage():
	print """
Tweet Teller
Usage: tweet_teller -i <inputs> -a <accounts> -d duration_in_minutes
          --range w-x,y-z  Start and stop tweets (optional)
          --test     Pull the latest tweet from @subcutanean
          --skipIntro, --skipOuttro
          --mainAnnounce    announce on @subcutanean that a reading is starting
"""

MAX_TWEET_CHARS = 280
TWITTER_RATE_LIMIT = 300
CONFIRMED_LIVE_TWEETS = False

# tweeters = ["TWITTER", "CONSOLE", "CONSOLE_WITH_ERRORS", "FILES"]
tweeters = ["CONSOLE"]

def main():
	inputFiles = []
	inputTweetStorms = []
	accounts = []
	ranges = []       # "25-115"
	parsedRanges = [] # [25, 115] 
	duration = -1
	skipIntro = False
	skipOuttro = False
	mainAnnounce = False

	opts, args = getopt.getopt(sys.argv[1:], "i:a:d:", ["help", "test", "range=", "skipIntro", "skipOuttro", "mainAnnounce"])
	if len(args) > 0:
		print "Unrecognized arguments: %s" % args
		showUsage()
		sys.exit()
	for opt, arg in opts:
		if opt == "-i":
			inputFiles = arg.split(',')
		elif opt == "-a":
			accounts = arg.split(',')
		elif opt == "-d":
			try:
				duration = int(arg)
			except:
				print "Invalid -d(uration) parameter '%s': not an integer (should be a number of minutes)." % arg
				sys.exit()
		elif opt == "--range":
			ranges = arg.split(',')
		elif opt == "--skipIntro":
			skipIntro = True
		elif opt == "--skipOuttro":
			skipOuttro = True
		elif opt == "--mainAnnounce":
			mainAnnounce = True
		elif opt == "--help":
			showUsage()
			sys.exit()
		elif opt == "--test":
			testIt()
			sys.exit()

	if len(inputFiles) == 0:
		print "*** No input files specified. ***\n"
		showUsage()
		sys.exit()

	if len(accounts) != len(inputFiles):
		print "*** Found %d input files but %d accounts; these must correspond 1-to-1. ***" % (len(inputFiles), len(accounts))
		sys.exit()

	if len(ranges) != 0 and len(ranges) != len(inputFiles):
		print "*** Found %d input files but %d ranges; if ranges are specified, they must correspond 1-to-1. ***" % (len(inputFiles), len(ranges))
		sys.exit()
	for theRange in ranges:
		matchObj = re.match(r'([0-9]{1,})-([0-9]{1,})', theRange)
		if matchObj	is None:
			print "*** Found range '%s' but could not read that as a range of tweet positions in the format '25-153'." % theRange
			sys.exit()
		try:
			lower = int(matchObj.groups()[0])
			upper = int(matchObj.groups()[1])
		except:
			print "*** Found range '%s' but could not parse one or both parts between the dash as integers." % theRange
			sys.exit()
		if lower > upper or lower < 0 or upper < 0:
			print "*** Found range of '%d-%d' but the lower value must be lower and both must be positions >= 0." % (lower, upper)
			sys.exit()
		parsedRanges.append([lower, upper])

	if duration <= 0:
		print "*** Duration %d must be > 0 minutes. ***" % duration
		sys.exit()

	for fPos, filename in enumerate(inputFiles):
		data = fileio.readInputFile(filename)
		tweetStorm = fileio.deserialize(data)
		for pos, tweet in enumerate(tweetStorm):
			if len(tweet) > MAX_TWEET_CHARS:
				print "*** Error: a tweet in this tweetstorm exceeded %d characters, was %d instead: '%s'" % (MAX_TWEET_CHARS, len(tweet), tweet)
				sys.exit()
		if len(ranges) > 0 and parsedRanges[fPos][1] >= len(tweetStorm):
			print "*** Error: this tweetstorm has %d tweets but the corresponding range was '%d-%d', which is outside its bounds." % (len(tweetStorm), parsedRanges[fPos][0], parsedRanges[fPos][1])
			sys.exit()
		inputTweetStorms.append(tweetStorm)

	if mainAnnounce and "TWITTER" not in tweeters:
		print "You set --mainAnnounce but not outputting to Twitter."
		sys.exit()

	for pos, tweetStorm in enumerate(inputTweetStorms):
		lower = 0 if len(parsedRanges) == 0 else parsedRanges[pos][0]
		upper = len(tweetStorm)-1 if len(parsedRanges) == 0 else parsedRanges[pos][1]
		print "*********************\nFor @%s, will tweet from %d to %d." % (accounts[pos], lower, upper)
		print "-> %d: '%s'" % (lower, tweetStorm[lower])
		print "##"
		print "-> %d: '%s" % (upper, tweetStorm[upper])
		print "\n"
	sys.stdout.write("*********************\n\nDoes this look right?> ")
	choice = getch.getch()
	if choice != "y":
		sys.exit()

	global CONFIRMED_LIVE_TWEETS
	if "TWITTER" in tweeters and not CONFIRMED_LIVE_TWEETS:
		sys.stdout.write("\n\nYou are about to tweet live to Twitter.\nPlease confirm you wish to do this> ")
		choice = getch.getch()
		if choice != "y":
			sys.exit()
		CONFIRMED_LIVE_TWEETS = True

	if mainAnnounce:
		tweetToTwitter("subcutanean", "About to start a live Twitter reading from two different versions of Subcutanean! Check out @subcutanean2160 and @subcutanean6621 to follow along.")
		bufferSeconds = 60
		print "Waiting %d seconds for pre-buffer..." % bufferSeconds
		time.sleep(bufferSeconds)
		print "Done waiting, beginning.\n"

	launch(inputTweetStorms, accounts, duration, parsedRanges, skipIntro, skipOuttro)


def launch(inputTweetStorms, accounts, duration, parsedRanges, skipIntro, skipOuttro):
	global tweeters

	print "TweetTeller"
	print "Ctrl-Z to halt all threads.\n"

	# inputTweetStorm is an array of tweetstorms, each of which is an array of tweets.

	# Truncate
	tweetStorms = []
	for pos, tweetStorm in enumerate(inputTweetStorms):
		if len(parsedRanges) > 0:
			lower = parsedRanges[pos][0]
			upper = parsedRanges[pos][1]
			tweetStorms.append(tweetStorm[lower:upper+1]) # inclusive
		else:
			tweetStorms.append(tweetStorms)

	# Intro/Outtro
	for pos, tweetStorm in enumerate(tweetStorms):
		seedNum = int(accounts[pos][11:])
		intro = "*****\nNow beginning a reading from seed #%d of Subcutanean, a novel by @aaronareed. Follow @subcutanean for general project news.\n*****" % seedNum
		outtro = "*****\nThat's the end of today's reading from this version of Subcutanean! Follow @subcutanean to find out how you can get your own unique copy.\n*****"
		if not skipIntro:
			tweetStorms[pos] = [intro] + tweetStorms[pos]
		if not skipOuttro:
			tweetStorms[pos] = tweetStorms[pos] + [outtro]

	# Validate
	totals = []
	for pos in range(0, len(accounts)):
		totals.append(len(tweetStorms[pos]))
	if sum(totals) > TWITTER_RATE_LIMIT:
		print "*** Error: input tweetstorms have lengths %s but that is a total of %d tweets, and the rate limit is %d, so this is too many to do in one performance." % (totals, sum(totals), TWITTER_RATE_LIMIT)
		sys.exit()
	print "Targets: %s" % tweeters
	print "Preparing %d tweets across %d files..." % (sum(totals), len(tweetStorms))

	# Go
	for pos in range(0, len(accounts)):
		setupTweetStorm(accounts[pos], tweetStorms[pos], duration)


tweetThreads = []

def setupTweetStorm(account, tweetStorm, duration):
	global tweet_threads
	timeInSecondsBetweenTweets = float(duration * 60) / float(len(tweetStorm))
	if timeInSecondsBetweenTweets < 10:
		print "To space %s tweets out over %s minutes would require %s seconds between tweets; this is below our minimum value of 10, so halting." % (len(tweetStorm), duration, timeInSecondsBetweenTweets)
		sys.exit()
	if timeInSecondsBetweenTweets > 120:
		print "To space %s tweets out over %s minutes would require %s seconds between tweets; this is higher than our predetermined threshold of 120, so halting." % (len(tweetStorm), duration, timeInSecondsBetweenTweets)
		sys.exit()
	timeInSecondsBetweenTweets = int(timeInSecondsBetweenTweets)

	print "For account @%s, will do %d tweets over %d minutes, with %d seconds between tweets." % (account, len(tweetStorm), duration, timeInSecondsBetweenTweets)
	thread = threading.Thread(target=tweetTickQueue, args=(account, tweetStorm, 0, timeInSecondsBetweenTweets))
	thread.do_run = True
	thread.start()
	tweetThreads.append(thread)


def tweetTickQueue(account, tweetStorm, pos, delayInSeconds):
	# Just a bit of a wait so all the startup messages clump together on the console.
	time.sleep(0.1)
	tweetTick(account, tweetStorm, pos, delayInSeconds)

def tweetTick(account, tweetStorm, pos, delayInSeconds):
	thread = threading.current_thread()
	if not thread.do_run:
		print "*** Halting thread for @%s." % account
		return
	tweet(account, tweetStorm[pos])
	time.sleep(delayInSeconds)
	pos += 1
	if pos < len(tweetStorm):
		tweetTick(account, tweetStorm, pos, delayInSeconds)

def tweet(account, tweet):
	global tweeters

	try:
		if "CONSOLE" in tweeters:
			tweetToConsole(account, tweet)
		if "CONSOLE_WITH_ERRORS" in tweeters:
			tweetToConsoleWithOccasionalErrors(account, tweet)
		if "TWITTER" in tweeters:
			tweetToTwitter(account, tweet)
		if "FILES" in tweeters:	
			tweetToFiles(account, tweet)

	# https://twython.readthedocs.io/en/latest/api.html#exceptions

	# except twython.TwythonAuthError as e:
	# 	print e
	# 	stopTweetThreads()
	# except twython.TwythonRateLimitError as e:
	# 	print e
	# 	stopTweetThreads()
	# except twython.TwythonError as e:
	# 	print e
	# 	stopTweetThreads()
	except Exception as e:
		print "\n*** EXCEPTION: %s" % e
		stopTweetThreads()


def stopTweetThreads():
	global tweetThreads
	print "*** Stopping all tweet threads."
	for thread in tweetThreads:
		print "***   Setting %s do_run to False." % thread
		thread.do_run = False



def tweetToConsole(account, tweet):
	print "> @%s: '%s'\n" % (account, tweet)

def tweetToConsoleWithOccasionalErrors(account, tweet):
	if chooser.percent(85):
		tweetToConsole(account, tweet)
	else:
		raise Exception("Test of an Exception for account @%s." % account) 
def tweetToFiles(account, tweet):
	fileio.append("work/at-%s.dat" % account, "\n\n@%s: '%s'" % (account, tweet))

def tweetToTwitter(account, tweet):
	twitter.tweet(account, tweet)



def testIt():
	# print twitter.verifyCredentials("subcutanean2160")
	print twitter.getLastTweet("subcutanean9999")
	# print twitter.tweet("subcutanean6621", "Test message for 6621")
	# print twitter.tweet("subcutanean9999", "its another test message")



main()
