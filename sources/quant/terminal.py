
import shlex
import subprocess
import re
import sys

def runCommand(command, paramString, shell=False):
	if shell:
		cmdArray = "%s %s" % (command, paramString)
	else:
		cmdArray = shlex.split(paramString)
		cmdArray.insert(0, command)

	result = {
		"success": False,
		"output": ""
	}

	try:
		output = subprocess.check_output(cmdArray, stderr=subprocess.STDOUT, shell=shell)
		result["success"] = True
		result["output"] = output
	except subprocess.CalledProcessError as e:
		result["success"] = False
		result["output"] = e.output

	return result


def rename(input, output):
	runCommand("mv", input + " " + output)

def delete(fn):
	runCommand("rm", fn)

def move(input, output):
	print "Moving %s to %s." % (input, output)
	runCommand("mv", input + " " + output)
