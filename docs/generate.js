// Subcutanean Generator - JavaScript port of the Quant source code
// Uses Rita.js for natural language processing

// Import Rita.js as ES module
import { RiTa } from "https://esm.sh/rita";

// Set up some context to use in the grammar
      let context = {
        pluralNoun: () => RiTa.randomWord({ pos: "nns" }),
        randomNoun: () => RiTa.randomWord({ pos: "nn" }),
        randomVerb: () => RiTa.randomWord({ pos: "vb" }),
        randomAdjective: () => RiTa.randomWord({ pos: "jj" }),
        randomAdverb: () => RiTa.randomWord({ pos: "rb" }),
        todaysDate: () => dayjs().format("MMMM D, YYYY"),
        todaysTime: () => dayjs().format("h:mma"),
      };
// Import the grammar definition
import createGrammar from "./grammar.js";

// ============================================================================
// GLOBAL STATE
// ============================================================================

let currentSeed = 45443;
let generatedText = '';

// ============================================================================
// RANDOM NUMBER GENERATOR (Seeded)
// ============================================================================

// Simple seeded random number generator (LCG algorithm)
// This ensures reproducible results for the same seed
class SeededRandom {
    constructor(seed) {
        this.seed = seed;
    }

    // Returns a random number between 0 and 1
    random() {
        this.seed = (this.seed * 1103515245 + 12345) % 2147483648;
        return this.seed / 2147483648;
    }

    // Returns a random integer between min (inclusive) and max (inclusive)
    randInt(min, max) {
        return Math.floor(this.random() * (max - min + 1)) + min;
    }

    // Returns a random element from an array
    choice(array) {
        return array[Math.floor(this.random() * array.length)];
    }
}

// ============================================================================
// QUANT PARSER AND COLLAPSER
// ============================================================================

// This will contain the main logic for parsing and collapsing Quant markup
// Port of the Python collapser.py functionality

class QuantCollapser {
    constructor(seed) {
        this.rng = new SeededRandom(seed);
        this.variables = {};
        this.macros = {};
    }

    // Parse and collapse Quant markup into plain text
    collapse(text) {
        // TODO: Implement Quant markup parsing
        // This is where we'll port the Python collapser logic

        // For now, return a placeholder
        return `[Generated text with seed ${this.rng.seed}]\n\nThis is a placeholder. The Quant parser will be implemented here.`;
    }

    // Handle variable assignments [@varname|option1|option2]
    handleVariable(match) {
        // TODO: Implement variable handling
        return '';
    }

    // Handle conditionals [condition>text]
    handleConditional(match) {
        // TODO: Implement conditional handling
        return '';
    }

    // Handle choices [option1|option2|option3]
    handleChoice(match) {
        // TODO: Implement choice handling
        const options = match.split('|');
        return this.rng.choice(options);
    }
}

// ============================================================================
// UI EVENT HANDLERS
// ============================================================================

function showStatus(message, type = 'info') {
    const statusEl = document.getElementById('status-message');
    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`;
    statusEl.style.display = 'block';
}

function hideStatus() {
    const statusEl = document.getElementById('status-message');
    statusEl.style.display = 'none';
}

function updateOutput(text) {
    const outputEl = document.getElementById('output-display');
    outputEl.textContent = text;
    outputEl.classList.remove('empty');
}

function clearOutput() {
    const outputEl = document.getElementById('output-display');
    outputEl.textContent = 'Generated text will appear here...';
    outputEl.classList.add('empty');
}

// Generate a random seed
function generateRandomSeed() {
    return Math.floor(Math.random() * 100000);
}

// Generate the novel with the current seed
async function generateNovel() {
    const seedInput = document.getElementById('seed-input');
    const generateBtn = document.getElementById('generate-btn');
    const downloadBtn = document.getElementById('download-btn');

    currentSeed = parseInt(seedInput.value) || 45443;

    try {
        generateBtn.disabled = true;
        showStatus('Loading grammar and generating novel...', 'info');

        // Set Rita's random seed for deterministic generation
        RiTa.randomSeed(currentSeed);

        // Load the grammar
        const grammar = createGrammar(RiTa);

        // Generate text from the grammar
        const output = grammar.expand();

        // Format the output
        generatedText = `Subcutanean - Generated with seed ${currentSeed}\n\n` + output;

        updateOutput(generatedText);

        downloadBtn.style.display = 'inline-block';
        showStatus('Generation complete!', 'success');

    } catch (error) {
        console.error('Generation error:', error);
        showStatus(`Error: ${error.message}`, 'error');
    } finally {
        generateBtn.disabled = false;
    }
}

// Download the generated text as a TXT file
function downloadText() {
    if (!generatedText) {
        showStatus('No text to download. Generate a novel first.', 'error');
        return;
    }

    const blob = new Blob([generatedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subcutanean-${currentSeed}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showStatus('Download started!', 'success');
}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Wire up event handlers
    document.getElementById('generate-btn').addEventListener('click', generateNovel);
    document.getElementById('download-btn').addEventListener('click', downloadText);

    document.getElementById('random-seed-btn').addEventListener('click', () => {
        const seedInput = document.getElementById('seed-input');
        seedInput.value = generateRandomSeed();
    });

    // Allow Enter key in seed input to trigger generation
    document.getElementById('seed-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            generateNovel();
        }
    });

    console.log('Subcutanean Generator initialized');
    console.log('Rita.js loaded:', typeof RiTa !== 'undefined');
});
