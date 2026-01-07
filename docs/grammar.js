function createGrammar(RiTa) {
    return RiTa.grammar({
        start: "$part1",

        part1: "PART 1<br><br>DOWNSTAIRS<br><br>",

        chapter1: "Chapter 1 begins here. $sentence $sentence",

        sentence: "[The protagonist walked forward | She hesitated | He looked around]. [Everything seemed $adjective | Nothing felt right | The world was $adjective].",

        adjective: "[strange | familiar | unsettling | peaceful | mysterious]"
    });
}

export default createGrammar;
