# Abstraction of Twitter interface via Twython.

from twython import Twython
import fileio

def getLastTweet(account):
	twitter = getTwitter(account)
	user_timeline = twitter.get_user_timeline()
	if len(user_timeline) > 0:
		lastTweet = user_timeline[0]
		return lastTweet["text"]

def verifyCredentials(account):
	twitter = getTwitter(account)
	return twitter.verify_credentials()

def tweet(account, msg):
	twitter = getTwitter(account)
	response = twitter.update_status(status=msg)
	# If we didn't crash:
	print "Successfully tweeted."



def getTwitter(account):
	creds = setCredentials(account)
	return Twython(creds["APP_KEY"], creds["APP_SECRET"], creds["OAUTH_ACCESS_TOKEN"], creds["OAUTH_ACCESS_TOKEN_SECRET"])

def setCredentials(account):
	credsRaw = fileio.readInputFile("collapser/keys/tw.%s.keys" % account)
	credsLines = credsRaw.split("\n")
	creds = {
		"APP_KEY": credsLines[0],
		"APP_SECRET": credsLines[1],
		"OAUTH_ACCESS_TOKEN": credsLines[2],
		"OAUTH_ACCESS_TOKEN_SECRET": credsLines[3]
	}
	return creds
