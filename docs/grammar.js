// Placeholder grammar for Subcutanean
// This will eventually be replaced with the full Quant source

function createGrammar(RiTa) {
    return RiTa.grammar({
        start: "$prologue $chapter1",

        prologue: "This is the prologue. [It was a dark night | The sun was shining | Rain fell steadily]. $sentence",

        chapter1: "Chapter 1 begins here. $sentence $sentence",

        sentence: "[The protagonist walked forward | She hesitated | He looked around]. [Everything seemed $adjective | Nothing felt right | The world was $adjective].",

        adjective: "[strange | familiar | unsettling | peaceful | mysterious]"
    });
}

export default createGrammar;
