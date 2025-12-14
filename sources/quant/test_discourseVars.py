# coding=utf-8

import discourseVars
import pytest



def test_getHighestPosition():
	assert discourseVars.getHighestPositions([]) == []
	assert discourseVars.getHighestPositions([1]) == [0]
	assert discourseVars.getHighestPositions([10, 9, 8]) == [0]
	assert discourseVars.getHighestPositions([9, 10, 8]) == [1]
	assert discourseVars.getHighestPositions([8, 9, 10]) == [2]
	assert discourseVars.getHighestPositions([8, 9, 10, 10, 10]) == [2, 3, 4]
	assert discourseVars.getHighestPositions([8, 9, 10, 11, 12, 10]) == [4]
	assert discourseVars.getHighestPositions([-500, 500, -500]) == [1]

