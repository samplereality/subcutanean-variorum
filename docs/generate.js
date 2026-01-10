// Subcutanean Generator - JavaScript port of the Quant source code
// Uses Rita.js for natural language processing

// RiTa is loaded globally via CDN script tag
// createGrammar is loaded from grammar.js

// ============================================================================
// GLOBAL STATE
// ============================================================================

let currentSeed = 45443;
let generatedText = '';

// Context object for passing variables to RiTa grammar
// You can add custom functions and values here that will be available
// in the grammar via $symbolName notation
let context = {
    pluralNoun: () => RiTa.randomWord({ pos: "nns" }),
    randomNoun: () => RiTa.randomWord({ pos: "nn" }),
    randomVerb: () => RiTa.randomWord({ pos: "vb" }),
    randomAdjective: () => RiTa.randomWord({ pos: "jj" }),
    randomAdverb: () => RiTa.randomWord({ pos: "rb" })
};

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
    outputEl.innerHTML = text;
    outputEl.classList.remove('empty');
}

function clearOutput() {
    const outputEl = document.getElementById('output-display');
    outputEl.innerHTML = 'Generated text will appear here...';
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

        // Load the grammar with context
        const grammar = createGrammar(RiTa, context);

        // Generate text from the grammar
        const output = grammar.expand();

        // Use <br> for on-screen display but keep plain text for downloads
        const plainText = output.replace(/<br\s*\/?>/gi, '\n');
        const htmlText = output;

        // Format the output
        generatedText = `Subcutanean - Generated with seed ${currentSeed}\n\n` + plainText;

        updateOutput(`Subcutanean - Generated with seed ${currentSeed}<br><br>${htmlText}`);

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
