function createGrammar(RiTa) {
    return RiTa.grammar({
        start: "$part1",

        part1: "<h2>PART 1</h2>DOWNSTAIRS<br><br>$epigraph1<br><br>$opening",

        epigraph1: "$MacEwen (40) | $Mouawad (30) | $Teasdale (20) | $HerbertCalvino (7) | $Brunt (3)",

        MacEwen: "<em>This land like a mirror turns you inward<br>And you become a forest in a furtive lake;<br>The dark pines of your mind reach downward,<br>You dream in the green of your time,<br>Your memory is a row of sinking pines.</em><br><br>“Dark Pines Under Water,” Gwendolyn MacEwen (1941-1987)",

        Mouawad: "<em>Icarus should have waited for nightfall,<br>the moon would have never let him go.</em><br><br>Nina Mouawad",

        Teasdale: "<em>I am not yours, not lost in you,<br>Not lost, although I long to be<br>Lost as a candle lit at noon,<br>Lost as a snowflake in the sea.</em><br><br>Sarah Teasdale",

        HerbertCalvino: "<em>Deep in the human unconscious is a pervasive need for a logical universe that makes sense. But the real universe is always one step beyond logic.</em><br><br>Frank Herbert<br><br><em>One cannot write about something one is still inside.</em><br><br>Italo Calvino",

        Brunt: "<em>Maybe I was destined to forever fall in love with people I couldn’t have. Maybe there’s a whole assortment of impossible people waiting for me to find them. Waiting to make me feel the same impossibility over and over again.</em><br><br>From “Tell the Wolves I'm Home,” by Carol Rifka Brunt",

        opening: "<p>[I can't tell you this$maybech1Niko. I don't want|I don't know how to tell you this$maybech1Niko. I never wanted|I'm not sure how to tell you this$maybech1Niko. I don't want|I don't want to tell you this$maybech1Niko. I don't want] to gut you, reach inside and pull things out, not again. [Old wounds and sleeping dogs, you know. Tales|Some tales, I guess, are] better left untold. And you've [heard this one before, even|already heard this one, even|heard this one, haven't you? Even] if [your story wasn't quite the same as mine|our stories were never quite the same|your version never quite matched mine|our stories, our endings, never quite agreed].</p><p> [But that's what sat me down to write.|But that's why I'm sitting here, writing this.|But that's what this is for. Why I wrote it.|But that's what writing this is for.] If it's [just | only | ] a story, [ | you see,| nothing else,] maybe we can understand[&nbsp;it. You know | ], [come to terms. Make peace.|come to terms.|make peace.] [<br><br> | ]Pretend it's not ours.</p>",

        maybech1Niko: " | | | | | | | |, Niko|, Niko"
    });
}

export default createGrammar;
