# Standalone program for generating promotional tweets. 

import chooser

generic_tags = ["#webnovel", "#amwriting", "#bookaddict", "#fiction", "#novel", "#indiewriter", "#bookworld", "#IReadEverywhere", "#freeread", "#bookboost", "#horror", "#horrorfiction", "#queerbooks", "#gaybooks", "#IndieBooksBeSeen", "#ownvoices", "#excerpt"]
tapas_tags = ["@tapas_app", "#tapasnovel", "#tapas", "#tapastic"]
royalroad_tags = ["@royalroadl", "#royalroad"]
wattpad_tags = ["@wattpad", "#wattpad", "#wattpadlife", "#wattpadstory", "#wattpadstories", "#wattpadbooks"]

intro = ["Read Chapter XXX of Subcutanean", "Chapter XXX of Subcutanean", "Subcutanean Chapter XXX"]
outtro = ["live now", "now posted", "available now", "free", "a queer horror novel", "a horror novel"]

tapas_link = "https://tapas.io/series/Subcutanean"
royalroad_link = "https://www.royalroad.com/fiction/27821/subcutanean"
wattpad_link = "https://www.wattpad.com/story/203725740-subcutanean"


def makeTweet():
	introBit = chooser.oneOf(intro)
	outtroBit = ""
	if chooser.percent(50):
		outtroBit = ", " + chooser.oneOf(outtro)
	tags = ""
	service = chooser.iter("service")
	if service == 3:
		chooser.resetIter("service")
	if service == 1:
		tagList = wattpad_tags
		link = wattpad_link
	elif service == 2:
		tagList = royalroad_tags
		link = royalroad_link
	elif service == 3:
		tagList = tapas_tags
		link = tapas_link
	tags = chooser.oneOfNoRepeat("tl", tagList) + " " + chooser.oneOfNoRepeat("tl", tagList)
	tags += " " + chooser.oneOfNoRepeat("gt", generic_tags)
	if chooser.percent(66):
		tags += " " + chooser.oneOfNoRepeat("gt", generic_tags)
	tags += " #subcutanean01893"

	tweet = introBit + outtroBit + " " + tags + "\n\n" + link

	print "\n\n%s" % tweet



for pos in range(30):
	chooser.resetIter("tl")
	chooser.resetIter("gt")
	makeTweet()
