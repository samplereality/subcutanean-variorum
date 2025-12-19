// Subcutanean Version Comparison Tool

let allVersions = null;
let versionIds = [];
let currentChapter = 'prologue';
let currentMode = 'sidebyside';
let versionA = null;
let versionB = null;
let customVersions = {}; // Store uploaded versions

// Levenshtein Distance helper functions (global scope)
const NARRATIVE_CHAPTERS = [
    'prologue',
    'chapter1', 'chapter2', 'chapter3', 'chapter4', 'chapter5', 'chapter6',
    'chapter7', 'chapter8', 'chapter9', 'chapter10', 'chapter11', 'chapter12',
    'chapter13', 'chapter14', 'chapter15', 'chapter16', 'chapter17', 'chapter18'
];

function getTextForDistance(versionData) {
    // Concatenate narrative chapters (same as Python script)
    const textParts = [];
    NARRATIVE_CHAPTERS.forEach(chapter => {
        if (versionData[chapter]) {
            textParts.push(versionData[chapter].join(' '));
        }
    });
    return textParts.join(' ');
}

function calculateDistanceBetweenVersions(versionData1, versionData2) {
    const text1 = getTextForDistance(versionData1);
    const text2 = getTextForDistance(versionData2);

    // Use levenshtein function (defined inline in HTML)
    return typeof levenshtein === 'function' ? levenshtein(text1, text2) : 0;
}

// Chapter mapping from EPUB files to section IDs
const CHAPTER_MAPPING = {
    'ch001.xhtml': 'introduction',
    'ch002.xhtml': 'prologue',
    'ch003.xhtml': 'chapter1',
    'ch004.xhtml': 'chapter2',
    'ch005.xhtml': 'chapter3',
    'ch006.xhtml': 'chapter4',
    'ch007.xhtml': 'chapter5',
    'ch008.xhtml': 'chapter6',
    'ch009.xhtml': 'chapter7',
    'ch010.xhtml': 'chapter8',
    'ch011.xhtml': 'chapter9',
    'ch012.xhtml': 'part2',
    'ch013.xhtml': 'chapter10',
    'ch014.xhtml': 'chapter11',
    'ch015.xhtml': 'chapter12',
    'ch016.xhtml': 'chapter13',
    'ch017.xhtml': 'chapter14',
    'ch018.xhtml': 'chapter15',
    'ch019.xhtml': 'part3',
    'ch020.xhtml': 'chapter16',
    'ch021.xhtml': 'chapter17',
    'ch022.xhtml': 'chapter18',
    'ch024.xhtml': 'notes'
};

// Load all versions data
async function loadAllVersions() {
    try {
        const response = await fetch('extracted_text/all_versions.json');
        allVersions = await response.json();
        versionIds = Object.keys(allVersions).sort();

        // Load custom versions from localStorage
        loadCustomVersions();

        // Populate version selectors
        populateVersionSelectors();

        // Set default versions (first and last)
        versionA = versionIds[0];
        versionB = versionIds[versionIds.length - 1];
        document.getElementById('version-a-select').value = versionA;
        document.getElementById('version-b-select').value = versionB;

        // Build chapter navigation
        buildChapterNavigation();

        // Display initial comparison
        displayComparison();

    } catch (error) {
        console.error('Error loading versions:', error);
        document.getElementById('comparison-display').innerHTML =
            '<p class="loading">Error loading version data. Please ensure all_versions.json exists.</p>';
    }
}

function populateVersionSelectors() {
    const selectorA = document.getElementById('version-a-select');
    const selectorB = document.getElementById('version-b-select');

    // Clear existing options
    selectorA.innerHTML = '';
    selectorB.innerHTML = '';

    // Add built-in versions
    versionIds.forEach(vid => {
        const optionA = document.createElement('option');
        optionA.value = vid;
        optionA.textContent = `Seed ${vid}`;
        selectorA.appendChild(optionA);

        const optionB = document.createElement('option');
        optionB.value = vid;
        optionB.textContent = `Seed ${vid}`;
        selectorB.appendChild(optionB);
    });

    // Add separator if there are custom versions
    const customIds = Object.keys(customVersions);
    if (customIds.length > 0) {
        const separatorA = document.createElement('option');
        separatorA.disabled = true;
        separatorA.textContent = '──────────';
        selectorA.appendChild(separatorA);

        const separatorB = document.createElement('option');
        separatorB.disabled = true;
        separatorB.textContent = '──────────';
        selectorB.appendChild(separatorB);

        // Add custom versions
        customIds.sort().forEach(vid => {
            const optionA = document.createElement('option');
            optionA.value = vid;
            optionA.textContent = `📎 ${customVersions[vid].name || vid}`;
            selectorA.appendChild(optionA);

            const optionB = document.createElement('option');
            optionB.value = vid;
            optionB.textContent = `📎 ${customVersions[vid].name || vid}`;
            selectorB.appendChild(optionB);
        });
    }

    // Add change handlers (only once)
    if (!selectorA.dataset.hasListener) {
        selectorA.addEventListener('change', (e) => {
            versionA = e.target.value;
            buildChapterNavigation();
            displayComparison();
        });
        selectorA.dataset.hasListener = 'true';
    }

    if (!selectorB.dataset.hasListener) {
        selectorB.addEventListener('change', (e) => {
            versionB = e.target.value;
            buildChapterNavigation();
            displayComparison();
        });
        selectorB.dataset.hasListener = 'true';
    }
}

function buildChapterNavigation() {
    const nav = document.getElementById('chapter-nav');
    nav.innerHTML = '';

    // Get chapters from both selected versions (to show all available chapters)
    const chaptersSet = new Set();

    // Add chapters from version A
    if (allVersions[versionA]) {
        Object.keys(allVersions[versionA]).forEach(key => {
            if (key !== 'version_id') chaptersSet.add(key);
        });
    }

    // Add chapters from version B
    if (allVersions[versionB]) {
        Object.keys(allVersions[versionB]).forEach(key => {
            if (key !== 'version_id') chaptersSet.add(key);
        });
    }

    // Convert to array and sort in a logical order
    // Exclude: epilogue, alternatescene, backers, aboutauthor, aboutcopy (per user request)
    // chapter18 is the Epilogue
    const chapterOrder = ['introduction', 'prologue',
                         'chapter1', 'chapter2', 'chapter3', 'chapter4', 'chapter5',
                         'chapter6', 'chapter7', 'chapter8', 'chapter9',
                         'part2', 'chapter10', 'chapter11', 'chapter12', 'chapter13',
                         'chapter14', 'chapter15',
                         'part3', 'chapter16', 'chapter17', 'chapter18',
                         'notes'];

    const chapters = chapterOrder.filter(ch => chaptersSet.has(ch));

    chapters.forEach(chapterId => {
        const button = document.createElement('button');
        button.className = 'nav-btn';
        if (chapterId === currentChapter) {
            button.classList.add('active');
        }

        // Format button text
        let buttonText;
        if (chapterId === 'introduction') {
            buttonText = 'Intro';
        } else if (chapterId === 'prologue') {
            buttonText = 'Prologue';
        } else if (chapterId === 'part2') {
            buttonText = 'Part II';
        } else if (chapterId === 'part3') {
            buttonText = 'Part III';
        } else if (chapterId === 'chapter18') {
            buttonText = 'Epilogue';
        } else if (chapterId === 'notes') {
            buttonText = 'Notes';
        } else if (chapterId.startsWith('chapter')) {
            buttonText = `Ch ${chapterId.replace('chapter', '')}`;
        } else {
            buttonText = chapterId;
        }

        button.textContent = buttonText;
        button.addEventListener('click', () => {
            currentChapter = chapterId;
            document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            displayComparison();
        });

        nav.appendChild(button);
    });
}

function setupViewModeButtons() {
    document.getElementById('mode-unified').addEventListener('click', () => {
        setViewMode('unified');
    });

    document.getElementById('mode-sidebyside').addEventListener('click', () => {
        setViewMode('sidebyside');
    });

    document.getElementById('mode-diff').addEventListener('click', () => {
        setViewMode('diff');
    });

    document.getElementById('mode-comparison').addEventListener('click', () => {
        setViewMode('comparison');
    });
}

function setViewMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`mode-${mode}`).classList.add('active');
    displayComparison();
}

function displayComparison() {
    const display = document.getElementById('comparison-display');

    // Clear any search highlights when changing view (but preserve search state)
    const hadActiveSearch = currentSearchTerm !== '';
    const searchTerm = currentSearchTerm;
    clearSearchHighlights(false);

    // Get chapter text from both versions
    const textA = allVersions[versionA][currentChapter] || [];
    const textB = allVersions[versionB][currentChapter] || [];

    if (currentMode === 'unified') {
        displayUnified(display, textA, versionA);
    } else if (currentMode === 'sidebyside') {
        displaySideBySide(display, textA, textB);
    } else if (currentMode === 'diff') {
        displayDiff(display, textA, textB);
    } else if (currentMode === 'comparison') {
        displayParagraphComparison(display, textA, textB);
    }

    // Re-apply search highlights if there was an active search
    if (hadActiveSearch && searchTerm) {
        setTimeout(() => {
            highlightSearchMatches(searchTerm);
        }, 0);
    }
}

function displayUnified(container, paragraphs, version) {
    container.innerHTML = '';
    container.className = '';

    const div = document.createElement('div');
    div.className = 'unified-view';

    const heading = document.createElement('h2');
    heading.textContent = `Seed ${version}`;
    div.appendChild(heading);

    paragraphs.forEach(para => {
        const p = document.createElement('p');
        p.innerHTML = para;
        div.appendChild(p);
    });

    container.appendChild(div);
}

function displaySideBySide(container, paragraphsA, paragraphsB) {
    container.innerHTML = '';
    container.className = 'side-by-side';

    // Version A panel
    const panelA = document.createElement('div');
    panelA.className = 'version-panel';

    const headingA = document.createElement('h2');
    headingA.textContent = `Seed ${versionA}`;
    panelA.appendChild(headingA);

    paragraphsA.forEach(para => {
        const p = document.createElement('p');
        p.innerHTML = para;
        panelA.appendChild(p);
    });

    // Version B panel
    const panelB = document.createElement('div');
    panelB.className = 'version-panel';

    const headingB = document.createElement('h2');
    headingB.textContent = `Seed ${versionB}`;
    panelB.appendChild(headingB);

    paragraphsB.forEach(para => {
        const p = document.createElement('p');
        p.innerHTML = para;
        panelB.appendChild(p);
    });

    container.appendChild(panelA);
    container.appendChild(panelB);
}

function displayDiff(container, paragraphsA, paragraphsB) {
    container.innerHTML = '';
    container.className = '';

    const div = document.createElement('div');
    div.className = 'diff-view';

    const heading = document.createElement('h2');
    heading.textContent = `Comparing Seeds ${versionA} → ${versionB}`;
    div.appendChild(heading);

    // Use alignment algorithm to match paragraphs intelligently
    const alignments = alignParagraphs(paragraphsA, paragraphsB);

    for (const alignment of alignments) {
        const { textA, textB, type } = alignment;

        const p = document.createElement('p');

        if (type === 'identical') {
            // No change - show normal paragraph
            p.innerHTML = textA || textB;
        } else if (type === 'unique-b') {
            // Paragraph only in B (added)
            p.innerHTML = `<span class="diff-added">${textB}</span>`;
        } else if (type === 'unique-a') {
            // Paragraph only in A (removed)
            p.innerHTML = `<span class="diff-removed">${textA}</span>`;
        } else if (type === 'modified') {
            // Text is already formatted with HTML tags
            const formattedA = textA;
            const formattedB = textB;

            // Remove HTML tags for diff comparison
            const cleanA = formattedA.replace(/<\/?(?:em|strong)>/g, '');
            const cleanB = formattedB.replace(/<\/?(?:em|strong)>/g, '');

            const diff = Diff.diffWords(cleanA, cleanB);

            diff.forEach(part => {
                const span = document.createElement('span');

                if (part.added) {
                    span.className = 'diff-added';
                    span.innerHTML = part.value;
                } else if (part.removed) {
                    span.className = 'diff-removed';
                    span.innerHTML = part.value;
                } else {
                    // Unchanged text
                    span.innerHTML = part.value;
                }

                p.appendChild(span);
            });
        }

        div.appendChild(p);
    }

    container.appendChild(div);
}

// Collation View (intelligent paragraph alignment)
function calculateSimilarity(textA, textB) {
    // Remove HTML tags for comparison
    const cleanA = textA.replace(/<\/?em>/g, '').toLowerCase().trim();
    const cleanB = textB.replace(/<\/?em>/g, '').toLowerCase().trim();

    // Exact match
    if (cleanA === cleanB) return 1.0;

    // If either is empty, they're completely different
    if (!cleanA || !cleanB) return 0.0;

    // Calculate Jaccard similarity (intersection over union of words)
    const wordsA = new Set(cleanA.split(/\s+/));
    const wordsB = new Set(cleanB.split(/\s+/));

    const intersection = new Set([...wordsA].filter(word => wordsB.has(word)));
    const union = new Set([...wordsA, ...wordsB]);

    return intersection.size / union.size;
}

function normalizeText(text) {
    return text.replace(/<\/?em>/g, '').toLowerCase().trim();
}

// Align two sets of paragraphs using anchor-based approach
function alignParagraphs(paragraphsA, paragraphsB) {
    const alignments = [];
    const usedA = new Set();
    const usedB = new Set();

    // PHASE 1: Find exact matches as anchors
    const anchors = [];
    for (let i = 0; i < paragraphsA.length; i++) {
        if (usedA.has(i)) continue;
        const cleanA = normalizeText(paragraphsA[i]);
        if (!cleanA) continue;

        for (let j = 0; j < paragraphsB.length; j++) {
            if (usedB.has(j)) continue;
            const cleanB = normalizeText(paragraphsB[j]);

            if (cleanA === cleanB) {
                anchors.push({ indexA: i, indexB: j, similarity: 1.0 });
                usedA.add(i);
                usedB.add(j);
                break; // Move to next paragraph in A
            }
        }
    }

    // PHASE 2: Between anchors, find best similarity matches with sliding window
    const SIMILARITY_THRESHOLD = 0.3;
    const WINDOW_SIZE = 20; // Look ahead/behind up to 20 paragraphs

    for (let i = 0; i < paragraphsA.length; i++) {
        if (usedA.has(i)) continue;
        const cleanA = normalizeText(paragraphsA[i]);
        if (!cleanA) continue;

        let bestMatch = null;
        let bestSimilarity = SIMILARITY_THRESHOLD;

        // Determine search window based on nearby anchors
        const prevAnchor = anchors.filter(a => a.indexA < i).pop();
        const nextAnchor = anchors.find(a => a.indexA > i);

        const minJ = prevAnchor ? prevAnchor.indexB + 1 : 0;
        const maxJ = nextAnchor ? nextAnchor.indexB - 1 : paragraphsB.length - 1;

        // Search within window
        const searchStart = Math.max(minJ, i - WINDOW_SIZE);
        const searchEnd = Math.min(maxJ, i + WINDOW_SIZE);

        for (let j = searchStart; j <= searchEnd && j < paragraphsB.length; j++) {
            if (usedB.has(j)) continue;
            const cleanB = normalizeText(paragraphsB[j]);
            if (!cleanB) continue;

            const similarity = calculateSimilarity(cleanA, cleanB);
            if (similarity > bestSimilarity) {
                bestSimilarity = similarity;
                bestMatch = j;
            }
        }

        if (bestMatch !== null) {
            anchors.push({ indexA: i, indexB: bestMatch, similarity: bestSimilarity });
            usedA.add(i);
            usedB.add(bestMatch);
        }
    }

    // PHASE 3: Create final alignment array
    // Sort anchors by position in A
    anchors.sort((a, b) => a.indexA - b.indexA);

    let lastIndexA = -1;
    let lastIndexB = -1;

    for (const anchor of anchors) {
        // Add any unmatched paragraphs from A before this anchor
        for (let i = lastIndexA + 1; i < anchor.indexA; i++) {
            if (!usedA.has(i)) {
                alignments.push({
                    indexA: i,
                    indexB: null,
                    textA: paragraphsA[i],
                    textB: null,
                    similarity: 0,
                    type: 'unique-a'
                });
            }
        }

        // Add any unmatched paragraphs from B before this anchor
        for (let j = lastIndexB + 1; j < anchor.indexB; j++) {
            if (!usedB.has(j)) {
                alignments.push({
                    indexA: null,
                    indexB: j,
                    textA: null,
                    textB: paragraphsB[j],
                    similarity: 0,
                    type: 'unique-b'
                });
            }
        }

        // Add the matched pair
        const type = anchor.similarity === 1.0 ? 'identical' : 'modified';
        alignments.push({
            indexA: anchor.indexA,
            indexB: anchor.indexB,
            textA: paragraphsA[anchor.indexA],
            textB: paragraphsB[anchor.indexB],
            similarity: anchor.similarity,
            type: type
        });

        lastIndexA = anchor.indexA;
        lastIndexB = anchor.indexB;
    }

    // Add remaining unmatched paragraphs from A
    for (let i = lastIndexA + 1; i < paragraphsA.length; i++) {
        if (!usedA.has(i)) {
            alignments.push({
                indexA: i,
                indexB: null,
                textA: paragraphsA[i],
                textB: null,
                similarity: 0,
                type: 'unique-a'
            });
        }
    }

    // Add remaining unmatched paragraphs from B
    for (let j = lastIndexB + 1; j < paragraphsB.length; j++) {
        if (!usedB.has(j)) {
            alignments.push({
                indexA: null,
                indexB: j,
                textA: null,
                textB: paragraphsB[j],
                similarity: 0,
                type: 'unique-b'
            });
        }
    }

    return alignments;
}

function displayParagraphComparison(container, paragraphsA, paragraphsB) {
    container.innerHTML = '';
    container.className = '';

    const div = document.createElement('div');
    div.className = 'comparison-view';

    const heading = document.createElement('h2');
    heading.textContent = `Collation: Seed ${versionA} vs Seed ${versionB}`;
    div.appendChild(heading);

    // Add legend
    const legend = document.createElement('div');
    legend.className = 'comparison-legend';
    legend.innerHTML = `
        <div class="legend-item">
            <div class="legend-color identical"></div>
            <span>Identical</span>
        </div>
        <div class="legend-item">
            <div class="legend-color modified"></div>
            <span>Modified (similar)</span>
        </div>
        <div class="legend-item">
            <div class="legend-color unique-a"></div>
            <span>Unique to Seed ${versionA}</span>
        </div>
        <div class="legend-item">
            <div class="legend-color unique-b"></div>
            <span>Unique to Seed ${versionB}</span>
        </div>
    `;
    div.appendChild(legend);

    // Use alignment algorithm to match paragraphs intelligently
    const alignments = alignParagraphs(paragraphsA, paragraphsB);

    // Create grid for paragraphs
    const grid = document.createElement('div');
    grid.className = 'comparison-grid';

    for (const alignment of alignments) {
        const { indexA, indexB, textA, textB, similarity, type } = alignment;

        // Create paragraph A (or placeholder)
        const divA = document.createElement('div');
        if (textA) {
            divA.className = `comparison-paragraph ${type === 'unique-b' ? 'placeholder' : type}`;

            if (type !== 'unique-b') {
                const numberA = document.createElement('div');
                numberA.className = 'comparison-paragraph-number';
                numberA.textContent = `${versionA} [${indexA + 1}]`;
                if (type === 'modified' && similarity > 0) {
                    numberA.innerHTML += `<span class="similarity-score">${(similarity * 100).toFixed(0)}% similar</span>`;
                }
                divA.appendChild(numberA);

                const contentA = document.createElement('div');
                contentA.innerHTML = textA;
                divA.appendChild(contentA);
            } else {
                divA.textContent = '—';
            }
        } else {
            divA.className = 'comparison-paragraph placeholder';
            divA.textContent = '—';
        }

        // Create paragraph B (or placeholder)
        const divB = document.createElement('div');
        if (textB) {
            divB.className = `comparison-paragraph ${type === 'unique-a' ? 'placeholder' : type}`;

            if (type !== 'unique-a') {
                const numberB = document.createElement('div');
                numberB.className = 'comparison-paragraph-number';
                numberB.textContent = `${versionB} [${indexB + 1}]`;
                divB.appendChild(numberB);

                const contentB = document.createElement('div');
                contentB.innerHTML = textB;
                divB.appendChild(contentB);
            } else {
                divB.textContent = '—';
            }
        } else {
            divB.className = 'comparison-paragraph placeholder';
            divB.textContent = '—';
        }

        grid.appendChild(divA);
        grid.appendChild(divB);
    }

    div.appendChild(grid);
    container.appendChild(div);
}

// Search functionality
let currentSearchTerm = '';
let allSearchOccurrences = [];
let currentOccurrenceIndex = -1;

function highlightSearchMatches(searchTerm) {
    if (!searchTerm) return;

    currentSearchTerm = searchTerm.toLowerCase();
    const container = document.getElementById('comparison-display');

    // Get all text nodes
    const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );

    const nodesToHighlight = [];
    let node;

    while (node = walker.nextNode()) {
        // Skip if parent is already a highlight or script
        if (node.parentElement.classList.contains('search-highlight') ||
            node.parentElement.tagName === 'SCRIPT') {
            continue;
        }

        const text = node.textContent.toLowerCase();
        if (text.includes(currentSearchTerm)) {
            nodesToHighlight.push(node);
        }
    }

    // Highlight each matching node
    nodesToHighlight.forEach(node => {
        const text = node.textContent;
        const regex = new RegExp(`(${escapeRegex(searchTerm)})`, 'gi');
        const parts = text.split(regex);

        if (parts.length > 1) {
            const fragment = document.createDocumentFragment();
            parts.forEach(part => {
                if (part.toLowerCase() === searchTerm.toLowerCase()) {
                    const highlight = document.createElement('span');
                    highlight.className = 'search-highlight';
                    highlight.textContent = part;
                    fragment.appendChild(highlight);
                } else if (part) {
                    fragment.appendChild(document.createTextNode(part));
                }
            });
            node.parentNode.replaceChild(fragment, node);
        }
    });
}

function clearSearchHighlights(resetState = true) {
    const highlights = document.querySelectorAll('.search-highlight');
    highlights.forEach(highlight => {
        const text = highlight.textContent;
        const textNode = document.createTextNode(text);
        highlight.parentNode.replaceChild(textNode, highlight);
    });

    if (resetState) {
        currentSearchTerm = '';
        allSearchOccurrences = [];
        currentOccurrenceIndex = -1;

        // Hide navigation (both inline and floating)
        const navigation = document.getElementById('search-navigation');
        if (navigation) {
            navigation.classList.add('hidden');
        }
        const floatingNav = document.getElementById('floating-search-nav');
        if (floatingNav) {
            floatingNav.classList.add('hidden');
        }
    }
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findAllOccurrences(searchTerm) {
    const occurrences = [];
    const searchRegex = new RegExp(`\\b${escapeRegex(searchTerm)}\\b`, 'gi');

    // Get all chapters from the first version
    const firstVersion = allVersions[versionIds[0]];
    const chapters = Object.keys(firstVersion).filter(key => key !== 'version_id');

    chapters.forEach(chapterId => {
        // Get text based on current mode
        let textToSearch = '';

        if (currentMode === 'unified') {
            const paragraphs = allVersions[versionA][chapterId] || [];
            textToSearch = paragraphs.join(' ');
        } else if (currentMode === 'sidebyside') {
            const paragraphsA = allVersions[versionA][chapterId] || [];
            const paragraphsB = allVersions[versionB][chapterId] || [];
            textToSearch = paragraphsA.join(' ') + ' ' + paragraphsB.join(' ');
        } else if (currentMode === 'diff') {
            const paragraphsA = allVersions[versionA][chapterId] || [];
            const paragraphsB = allVersions[versionB][chapterId] || [];
            textToSearch = paragraphsA.join(' ') + ' ' + paragraphsB.join(' ');
        }

        // Remove HTML tags for searching
        const cleanText = textToSearch.replace(/<[^>]*>/g, ' ');

        // Find all matches in this chapter
        let match;
        searchRegex.lastIndex = 0;
        while ((match = searchRegex.exec(cleanText)) !== null) {
            occurrences.push({
                chapterId: chapterId,
                chapterName: formatChapterName(chapterId),
                index: match.index
            });
        }
    });

    return occurrences;
}

function performSearch() {
    const searchInput = document.getElementById('search-input');
    const searchTerm = searchInput.value.trim();

    if (!searchTerm) return;

    currentSearchTerm = searchTerm;

    // Find all occurrences across all chapters
    allSearchOccurrences = findAllOccurrences(searchTerm);

    if (allSearchOccurrences.length === 0) {
        updateSearchUI();
        return;
    }

    // Find the first occurrence in or after the current chapter
    let startIndex = allSearchOccurrences.findIndex(occ => occ.chapterId === currentChapter);
    if (startIndex === -1) {
        startIndex = 0;
    }

    currentOccurrenceIndex = startIndex;
    goToOccurrence(currentOccurrenceIndex);
}

function goToOccurrence(index) {
    if (index < 0 || index >= allSearchOccurrences.length) return;

    const occurrence = allSearchOccurrences[index];
    currentOccurrenceIndex = index;

    // Switch chapter if needed
    if (occurrence.chapterId !== currentChapter) {
        currentChapter = occurrence.chapterId;

        // Update active chapter button
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        const chapterButtons = document.querySelectorAll('.nav-btn');
        chapterButtons.forEach(btn => {
            const btnChapter = btn.textContent.toLowerCase();
            const occChapter = occurrence.chapterName.toLowerCase();
            if (btnChapter.includes(occChapter) || occChapter.includes(btnChapter)) {
                btn.classList.add('active');
            }
        });

        // Display the new chapter
        displayComparison();
    }

    // Wait for rendering, then highlight
    setTimeout(() => {
        clearSearchHighlights(false); // Don't reset state, just remove highlights
        highlightSearchMatches(currentSearchTerm);

        // Mark current occurrence
        const highlights = document.querySelectorAll('.search-highlight');
        if (highlights.length > 0) {
            // Find which highlight in this chapter corresponds to our occurrence
            let chapterOccurrences = allSearchOccurrences.filter(occ => occ.chapterId === currentChapter);
            let indexInChapter = chapterOccurrences.findIndex(occ => occ === occurrence);

            if (indexInChapter >= 0 && indexInChapter < highlights.length) {
                highlights[indexInChapter].classList.add('current');
                highlights[indexInChapter].scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else if (highlights[0]) {
                highlights[0].classList.add('current');
                highlights[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        updateSearchUI();
    }, occurrence.chapterId !== currentChapter ? 100 : 0);
}

function goToPreviousOccurrence() {
    if (currentOccurrenceIndex > 0) {
        goToOccurrence(currentOccurrenceIndex - 1);
    }
}

function goToNextOccurrence() {
    if (currentOccurrenceIndex < allSearchOccurrences.length - 1) {
        goToOccurrence(currentOccurrenceIndex + 1);
    }
}

function updateSearchUI() {
    const navigation = document.getElementById('search-navigation');
    const count = document.getElementById('search-results-count');
    const chapterLabel = document.getElementById('search-chapter-label');
    const prevBtn = document.getElementById('search-prev-btn');
    const nextBtn = document.getElementById('search-next-btn');

    // Also update floating navigation
    const floatingNav = document.getElementById('floating-search-nav');
    const floatingCount = document.getElementById('floating-count');
    const floatingChapterLabel = document.getElementById('floating-chapter-label');
    const floatingPrevBtn = document.getElementById('floating-prev-btn');
    const floatingNextBtn = document.getElementById('floating-next-btn');

    if (allSearchOccurrences.length === 0) {
        navigation.classList.add('hidden');
        floatingNav.classList.add('hidden');
        return;
    }

    navigation.classList.remove('hidden');
    floatingNav.classList.remove('hidden');

    const countText = `${currentOccurrenceIndex + 1} of ${allSearchOccurrences.length}`;
    const shortCountText = `${currentOccurrenceIndex + 1}/${allSearchOccurrences.length}`;

    count.textContent = countText;
    floatingCount.textContent = shortCountText;

    // Update chapter labels
    const currentOccurrence = allSearchOccurrences[currentOccurrenceIndex];
    if (currentOccurrence) {
        const chapterName = formatChapterName(currentOccurrence.chapterId);
        chapterLabel.textContent = `in ${chapterName}`;

        // Shorter version for floating nav
        let shortChapterName = chapterName;
        if (chapterName.startsWith('Chapter ')) {
            shortChapterName = 'Ch ' + chapterName.replace('Chapter ', '');
        }
        floatingChapterLabel.textContent = shortChapterName;
    }

    const isPrevDisabled = currentOccurrenceIndex <= 0;
    const isNextDisabled = currentOccurrenceIndex >= allSearchOccurrences.length - 1;

    prevBtn.disabled = isPrevDisabled;
    nextBtn.disabled = isNextDisabled;
    floatingPrevBtn.disabled = isPrevDisabled;
    floatingNextBtn.disabled = isNextDisabled;
}

// Word differential functionality
let currentSortMode = 'alpha'; // 'alpha' or 'freq'
let currentWordData = { uniqueToA: [], uniqueToB: [], freqA: new Map(), freqB: new Map() };

function extractWords(text) {
    // Remove HTML tags, lowercase, extract words (alphanumeric + apostrophes)
    const cleanText = text.replace(/<[^>]*>/g, ' ').toLowerCase();
    const words = cleanText.match(/[a-z]+(?:'[a-z]+)?/g) || [];

    // Count word frequencies
    const frequencies = new Map();
    words.forEach(word => {
        frequencies.set(word, (frequencies.get(word) || 0) + 1);
    });

    return frequencies;
}

function getAllTextForSeed(seedId) {
    const seedData = allVersions[seedId];
    if (!seedData) return '';

    let allText = '';
    // Exclude 'notes' chapter and version_id field
    for (const [chapterId, paragraphs] of Object.entries(seedData)) {
        if (chapterId === 'version_id' || chapterId === 'notes') continue;
        if (Array.isArray(paragraphs)) {
            allText += ' ' + paragraphs.join(' ');
        }
    }
    return allText;
}

function calculateWordDifferential() {
    const modal = document.getElementById('word-diff-modal');
    const seedALabel = document.getElementById('seed-a-label');
    const seedBLabel = document.getElementById('seed-b-label');

    // Get text for both seeds
    const textA = getAllTextForSeed(versionA);
    const textB = getAllTextForSeed(versionB);

    // Extract word frequencies
    const freqA = extractWords(textA);
    const freqB = extractWords(textB);

    // Calculate unique words
    const uniqueToA = [...freqA.keys()].filter(word => !freqB.has(word));
    const uniqueToB = [...freqB.keys()].filter(word => !freqA.has(word));

    // Store data globally for sorting
    currentWordData = {
        uniqueToA: uniqueToA,
        uniqueToB: uniqueToB,
        freqA: freqA,
        freqB: freqB
    };

    // Update modal labels
    seedALabel.textContent = versionA;
    seedBLabel.textContent = versionB;

    // Update description with seed numbers
    const description = document.getElementById('word-diff-description');
    description.textContent = `Words that appear in Seed ${versionA} but which do not appear in Seed ${versionB}, and vice-versa. Click any word to see which chapters it appears in.`;

    // Display words with current sort mode
    displayWordLists();

    // Show modal
    modal.classList.remove('hidden');
}

function displayWordLists() {
    const uniqueACount = document.getElementById('unique-a-count');
    const uniqueBCount = document.getElementById('unique-b-count');
    const uniqueWordsA = document.getElementById('unique-words-a');
    const uniqueWordsB = document.getElementById('unique-words-b');

    let sortedA, sortedB;

    if (currentSortMode === 'alpha') {
        // Sort alphabetically
        sortedA = [...currentWordData.uniqueToA].sort();
        sortedB = [...currentWordData.uniqueToB].sort();
    } else {
        // Sort by frequency (descending)
        sortedA = [...currentWordData.uniqueToA].sort((a, b) =>
            currentWordData.freqA.get(b) - currentWordData.freqA.get(a)
        );
        sortedB = [...currentWordData.uniqueToB].sort((a, b) =>
            currentWordData.freqB.get(b) - currentWordData.freqB.get(a)
        );
    }

    // Update counts
    uniqueACount.textContent = sortedA.length;
    uniqueBCount.textContent = sortedB.length;

    // Display unique words with frequencies if in frequency mode
    uniqueWordsA.innerHTML = '';
    sortedA.forEach(word => {
        const freq = currentWordData.freqA.get(word);
        const freqText = (currentSortMode === 'freq' && freq > 1) ? ` (${freq})` : '';
        const span = document.createElement('span');
        span.className = 'word-item';
        span.textContent = word + freqText;
        span.dataset.word = word;
        span.dataset.seed = versionA;
        span.addEventListener('click', (e) => showWordPopup(e, word, versionA));
        uniqueWordsA.appendChild(span);
    });

    uniqueWordsB.innerHTML = '';
    sortedB.forEach(word => {
        const freq = currentWordData.freqB.get(word);
        const freqText = (currentSortMode === 'freq' && freq > 1) ? ` (${freq})` : '';
        const span = document.createElement('span');
        span.className = 'word-item';
        span.textContent = word + freqText;
        span.dataset.word = word;
        span.dataset.seed = versionB;
        span.addEventListener('click', (e) => showWordPopup(e, word, versionB));
        uniqueWordsB.appendChild(span);
    });
}

function setSortMode(mode) {
    currentSortMode = mode;

    // Update button states
    document.querySelectorAll('.sort-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`sort-${mode}-btn`).classList.add('active');

    // Re-display with new sort
    displayWordLists();
}

function findChaptersWithWord(word, seedId) {
    const seedData = allVersions[seedId];
    if (!seedData) return [];

    const chaptersWithWord = [];
    const searchRegex = new RegExp(`\\b${escapeRegex(word)}\\b`, 'i');

    for (const [chapterId, paragraphs] of Object.entries(seedData)) {
        if (chapterId === 'version_id' || chapterId === 'notes') continue;
        if (Array.isArray(paragraphs)) {
            const allText = paragraphs.join(' ').replace(/<[^>]*>/g, ' ');
            if (searchRegex.test(allText)) {
                chaptersWithWord.push(chapterId);
            }
        }
    }

    return chaptersWithWord;
}

function formatChapterName(chapterId) {
    if (chapterId === 'introduction') return 'Introduction';
    if (chapterId === 'prologue') return 'Prologue';
    if (chapterId === 'part2') return 'Part II';
    if (chapterId === 'part3') return 'Part III';
    if (chapterId === 'chapter18') return 'Epilogue';
    if (chapterId === 'notes') return 'Notes';
    if (chapterId.startsWith('chapter')) {
        return `Chapter ${chapterId.replace('chapter', '')}`;
    }
    return chapterId;
}

function showWordPopup(event, word, seedId) {
    const popup = document.getElementById('word-popup');
    const popupWord = document.getElementById('popup-word');
    const chaptersList = document.getElementById('word-popup-chapters');

    // Find chapters containing this word
    const chapters = findChaptersWithWord(word, seedId);

    if (chapters.length === 0) {
        return; // No chapters found
    }

    // Update popup content
    popupWord.textContent = word;
    chaptersList.innerHTML = '';

    chapters.forEach(chapterId => {
        const li = document.createElement('li');
        li.textContent = formatChapterName(chapterId);
        li.addEventListener('click', () => jumpToChapterWithWord(chapterId, word));
        chaptersList.appendChild(li);
    });

    // Position popup near the clicked word
    const rect = event.target.getBoundingClientRect();
    popup.style.left = `${Math.min(rect.left, window.innerWidth - 320)}px`;
    popup.style.top = `${rect.bottom + 5}px`;

    // Show popup
    popup.classList.add('visible');
}

function jumpToChapterWithWord(chapterId, word) {
    // Close both popup and modal
    closeWordPopup();
    closeModal();

    // Update current chapter
    currentChapter = chapterId;

    // Update active chapter button
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    const chapterButtons = document.querySelectorAll('.nav-btn');
    chapterButtons.forEach(btn => {
        if (btn.textContent.toLowerCase().includes(chapterId.replace('chapter', '').replace('part', ''))) {
            btn.classList.add('active');
        }
    });

    // Display the chapter
    displayComparison();

    // Wait a moment for rendering, then highlight the word
    setTimeout(() => {
        // Start a new search for this word
        currentSearchTerm = word;
        allSearchOccurrences = findAllOccurrences(word);
        currentOccurrenceIndex = 0;

        clearSearchHighlights(false);
        highlightSearchMatches(word);

        // Mark first occurrence and scroll to it
        const firstHighlight = document.querySelector('.search-highlight');
        if (firstHighlight) {
            firstHighlight.classList.add('current');
            firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        updateSearchUI();
    }, 100);
}

function closeWordPopup() {
    const popup = document.getElementById('word-popup');
    popup.classList.remove('visible');
}

function closeModal() {
    const modal = document.getElementById('word-diff-modal');
    modal.classList.add('hidden');
}

// EPUB Generation functionality

async function generateEPUBForVersion(versionId, versionData) {
    const zip = new JSZip();

    // 1. Add mimetype (must be first, uncompressed)
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

    // 2. Add META-INF/container.xml
    const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="EPUB/content.opf" media-type="application/oebps-package+xml" />
  </rootfiles>
</container>`;
    zip.file('META-INF/container.xml', containerXml);

    // 3. Add stylesheet
    const css = `/* This defines styles and classes used in the book */
body { margin: 5%; }
code { font-family: monospace; }
h1 { text-align: left; }
h2 { text-align: left; }
h3 { text-align: left; }
h4 { text-align: left; }
h5 { text-align: left; }
h6 { text-align: left; }
em, em em em, em em em em em { font-style: italic;}
em em, em em em em { font-style: normal; }
code{ white-space: pre-wrap; }
span.smallcaps{ font-variant: small-caps; }
span.underline{ text-decoration: underline; }
div.hanging-indent{margin-left: 1.5em; text-indent: -1.5em;}`;
    zip.file('EPUB/styles/stylesheet1.css', css);

    // 4. Add cover image
    const coverImageResponse = await fetch('subcutanean-ebook-cover.jpg');
    const coverImageBlob = await coverImageResponse.blob();
    zip.file('EPUB/media/subcutanean-ebook-cover.jpg', coverImageBlob);

    // 5. Generate chapter files
    const chapters = generateChapterFiles(versionData);
    chapters.forEach((chapter, index) => {
        zip.file(chapter.filename, chapter.content);
    });

    // 6. Add cover and title page
    zip.file('EPUB/text/cover.xhtml', generateCoverPage(versionId));
    zip.file('EPUB/text/title_page.xhtml', generateTitlePage(versionId));

    // 7. Generate content.opf
    zip.file('EPUB/content.opf', generateContentOPF(versionId, chapters));

    // 8. Generate nav.xhtml
    zip.file('EPUB/nav.xhtml', generateNavigation(versionId, chapters));

    // Generate the EPUB file
    const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
    return blob;
}

function generateCoverPage(versionId) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <meta charset="utf-8" />
  <title>Subcutanean ${versionId}</title>
  <link rel="stylesheet" type="text/css" href="../styles/stylesheet1.css" />
</head>
<body id="cover">
<div id="cover-image">
<img src="../media/subcutanean-ebook-cover.jpg" alt="cover image" />
</div>
</body>
</html>`;
}

function generateTitlePage(versionId) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <meta charset="utf-8" />
  <title>Subcutanean ${versionId}</title>
  <link rel="stylesheet" type="text/css" href="../styles/stylesheet1.css" />
</head>
<body>
<section epub:type="titlepage">
  <h1 class="title">Subcutanean ${versionId}</h1>
  <p class="author">Aaron A. Reed</p>
  <p class="date">2020-02-02</p>
  <div class="rights">CC-BY-4.0</div>
</section>
</body>
</html>`;
}

function generateChapterFiles(versionData) {
    const chapters = [];
    const chapterMapping = {
        'introduction': { num: '001', title: 'Introduction', addCredit: true },
        'prologue': { num: '002', title: 'PART ONE: DOWNSTAIRS' },
        'chapter1': { num: '003', title: 'Chapter 1' },
        'chapter2': { num: '004', title: 'Chapter 2' },
        'chapter3': { num: '005', title: 'Chapter 3' },
        'chapter4': { num: '006', title: 'Chapter 4' },
        'chapter5': { num: '007', title: 'Chapter 5' },
        'chapter6': { num: '008', title: 'Chapter 6' },
        'chapter7': { num: '009', title: 'Chapter 7' },
        'chapter8': { num: '010', title: 'Chapter 8' },
        'chapter9': { num: '011', title: 'Chapter 9' },
        'part2': { num: '012', title: 'PART TWO: MULTIPLICIOUS' },
        'chapter10': { num: '013', title: 'Chapter 10' },
        'chapter11': { num: '014', title: 'Chapter 11' },
        'chapter12': { num: '015', title: 'Chapter 12' },
        'chapter13': { num: '016', title: 'Chapter 13' },
        'chapter14': { num: '017', title: 'Chapter 14' },
        'chapter15': { num: '018', title: 'Chapter 15' },
        'part3': { num: '019', title: 'PART THREE: MANIFOLDWISE' },
        'chapter16': { num: '020', title: 'Chapter 16' },
        'chapter17': { num: '021', title: 'Chapter 17' },
        'chapter18': { num: '022', title: 'EPILOGUE' },
        'alternatescene': { num: '023', title: 'ALTERNATE SCENE' },
        'backers': { num: '024', title: 'BACKER ACKNOWLEDGMENTS' },
        'aboutauthor': { num: '025', title: 'ABOUT THE AUTHOR' },
        'notes': { num: '026', title: 'Notes' }
    };

    Object.keys(chapterMapping).forEach(key => {
        if (versionData[key]) {
            const mapping = chapterMapping[key];
            const filename = `EPUB/text/ch${mapping.num}.xhtml`;
            const content = generateChapterXHTML(mapping.title, versionData[key], mapping.addCredit);
            chapters.push({ id: key, num: mapping.num, title: mapping.title, filename, content });
        }
    });

    return chapters;
}

function convertTextFormatting(text) {
    // Convert _text_ to <em>text</em> (italics)
    // Convert *text* to <strong>text</strong> (bold)
    // Use global replace to handle multiple occurrences
    let formatted = text.replace(/_([^_]+)_/g, '<em>$1</em>');
    formatted = formatted.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
    return formatted;
}

function generateChapterXHTML(title, paragraphs, addCredit = false) {
    const paragraphsHTML = paragraphs.map(p => {
        // Text is already formatted with HTML tags
        return `<p>${p}</p>`;
    }).join('\n');

    // Add credit line for Introduction
    const creditLine = addCredit ?
        `<p class="credit-line"><em>This EPUB was generated by the <a href="https://subcutanean.fugitivetexts.net">Subcutanean Variorum</a> designed by Mark Sample.</em></p>\n` : '';

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <link rel="stylesheet" type="text/css" href="../styles/stylesheet1.css" />
</head>
<body>
<section id="${title.toLowerCase().replace(/\s+/g, '-')}" class="level1">
<h1>${title}</h1>
${paragraphsHTML}
${creditLine}
</section>
</body>
</html>`;
}

function generateContentOPF(versionId, chapters) {
    const manifestItems = chapters.map(ch =>
        `    <item id="ch${ch.num}_xhtml" href="text/ch${ch.num}.xhtml" media-type="application/xhtml+xml" />`
    ).join('\n');

    const spineItems = chapters.map(ch =>
        `    <itemref idref="ch${ch.num}_xhtml" />`
    ).join('\n');

    const uuid = `urn:uuid:${crypto.randomUUID()}`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="epub-id-1">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="epub-id-1">${uuid}</dc:identifier>
    <dc:title id="epub-title-1">Subcutanean ${versionId}</dc:title>
    <dc:date id="epub-date">2020-02-02</dc:date>
    <dc:language>en-US</dc:language>
    <dc:creator id="epub-creator-1">Aaron A. Reed</dc:creator>
    <meta refines="#epub-creator-1" property="role" scheme="marc:relators">aut</meta>
    <dc:rights>CC-BY-4.0</dc:rights>
    <meta name="cover" content="subcutanean-ebook-cover_jpg" />
    <meta property="dcterms:modified">${new Date().toISOString().split('.')[0]}Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav" />
    <item id="style" href="styles/stylesheet1.css" media-type="text/css" />
    <item id="cover_xhtml" href="text/cover.xhtml" media-type="application/xhtml+xml" />
    <item id="title_page_xhtml" href="text/title_page.xhtml" media-type="application/xhtml+xml" />
${manifestItems}
    <item properties="cover-image" id="subcutanean-ebook-cover_jpg" href="media/subcutanean-ebook-cover.jpg" media-type="image/jpeg" />
  </manifest>
  <spine>
    <itemref idref="cover_xhtml" />
    <itemref idref="title_page_xhtml" linear="yes" />
    <itemref idref="nav" />
${spineItems}
  </spine>
  <guide>
    <reference type="toc" title="Subcutanean ${versionId}" href="nav.xhtml" />
    <reference type="cover" title="Cover" href="text/cover.xhtml" />
  </guide>
</package>`;
}

function generateNavigation(versionId, chapters) {
    const navItems = chapters.map(ch =>
        `          <li><a href="text/ch${ch.num}.xhtml">${ch.title}</a></li>`
    ).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <meta charset="utf-8" />
  <title>Subcutanean ${versionId}</title>
  <link rel="stylesheet" type="text/css" href="styles/stylesheet1.css" />
</head>
<body>
  <nav id="toc" epub:type="toc">
    <h1>Table of Contents</h1>
    <ol>
      <li><a href="text/cover.xhtml">Cover</a></li>
      <li><a href="text/title_page.xhtml">Title Page</a></li>
${navItems}
    </ol>
  </nav>
</body>
</html>`;
}

async function downloadEPUB(versionId) {
    const versionData = allVersions[versionId];
    if (!versionData) {
        alert('Version data not found');
        return;
    }

    try {
        const blob = await generateEPUBForVersion(versionId, versionData);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `subcutanean-${versionId}.epub`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error generating EPUB:', error);
        alert('Error generating EPUB. See console for details.');
    }
}

// Manage Uploads functionality

function openManageUploadsModal() {
    const modal = document.getElementById('manage-uploads-modal');
    const uploadsList = document.getElementById('uploads-list');
    const noUploadsMessage = document.getElementById('no-uploads-message');

    // Clear existing content
    uploadsList.innerHTML = '';

    const customIds = Object.keys(customVersions);

    if (customIds.length === 0) {
        noUploadsMessage.classList.remove('hidden');
        uploadsList.classList.add('hidden');
    } else {
        noUploadsMessage.classList.add('hidden');
        uploadsList.classList.remove('hidden');

        // Sort by upload date (newest first)
        customIds.sort((a, b) => {
            const dateA = new Date(customVersions[a].uploadDate);
            const dateB = new Date(customVersions[b].uploadDate);
            return dateB - dateA;
        });

        customIds.forEach(versionId => {
            const version = customVersions[versionId];
            const uploadDate = new Date(version.uploadDate);
            const formattedDate = uploadDate.toLocaleDateString() + ' ' + uploadDate.toLocaleTimeString();

            const item = document.createElement('div');
            item.className = 'upload-item';

            const info = document.createElement('div');
            info.className = 'upload-info';

            const seedLabel = document.createElement('div');
            seedLabel.className = 'upload-seed';
            seedLabel.textContent = version.name || `Seed ${versionId}`;

            const dateLabel = document.createElement('div');
            dateLabel.className = 'upload-date';
            dateLabel.textContent = `Uploaded: ${formattedDate}`;

            info.appendChild(seedLabel);
            info.appendChild(dateLabel);

            const buttonGroup = document.createElement('div');
            buttonGroup.className = 'upload-item-buttons';

            const downloadBtn = document.createElement('button');
            downloadBtn.className = 'download-epub-btn';
            downloadBtn.textContent = 'Download EPUB';
            downloadBtn.title = 'Download as EPUB (works on modern Kindles, e-readers, and most devices)';
            downloadBtn.addEventListener('click', () => downloadEPUB(versionId));

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-upload-btn';
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', () => deleteCustomVersion(versionId));

            buttonGroup.appendChild(downloadBtn);
            buttonGroup.appendChild(deleteBtn);

            item.appendChild(info);
            item.appendChild(buttonGroup);
            uploadsList.appendChild(item);
        });
    }

    modal.classList.remove('hidden');
}

function closeManageUploadsModal() {
    const modal = document.getElementById('manage-uploads-modal');
    modal.classList.add('hidden');
}

function deleteCustomVersion(versionId) {
    if (!confirm(`Are you sure you want to delete Seed ${versionId}?`)) {
        return;
    }

    // Remove from customVersions
    delete customVersions[versionId];

    // Remove from allVersions
    delete allVersions[versionId];

    // Save to localStorage
    saveCustomVersions();

    // If either selected version was deleted, reset to default versions
    if (versionA === versionId) {
        versionA = versionIds[0];
        document.getElementById('version-a-select').value = versionA;
    }
    if (versionB === versionId) {
        versionB = versionIds[versionIds.length - 1];
        document.getElementById('version-b-select').value = versionB;
    }

    // Refresh version selectors
    populateVersionSelectors();

    // Refresh the manage uploads modal
    openManageUploadsModal();

    // Refresh display if we changed the selected version
    displayComparison();

    showUploadStatus(`Deleted Seed ${versionId}`, 'success');
}

// Manage Uploads Info Modal functionality
function hasSeenManageInfoNotice() {
    return localStorage.getItem('subcutanean_manage_info_seen') === 'true';
}

function markManageInfoNoticeSeen() {
    localStorage.setItem('subcutanean_manage_info_seen', 'true');
}

function openManageInfoModal() {
    const modal = document.getElementById('manage-info-modal');
    modal.classList.remove('hidden');
}

function closeManageInfoModal() {
    const modal = document.getElementById('manage-info-modal');
    modal.classList.add('hidden');
}

function acceptManageInfoAndProceed() {
    markManageInfoNoticeSeen();
    closeManageInfoModal();
    openManageUploadsModal();
}

// About Modal functionality

function openAboutModal() {
    const modal = document.getElementById('about-modal');
    modal.classList.remove('hidden');
}

function closeAboutModal() {
    const modal = document.getElementById('about-modal');
    modal.classList.add('hidden');
}

// Privacy Notice Modal functionality

let pendingUploadFile = null;

function hasSeenPrivacyNotice() {
    return localStorage.getItem('subcutanean_privacy_notice_seen') === 'true';
}

function markPrivacyNoticeSeen() {
    localStorage.setItem('subcutanean_privacy_notice_seen', 'true');
}

function openPrivacyNoticeModal() {
    const modal = document.getElementById('privacy-notice-modal');
    modal.classList.remove('hidden');
}

function closePrivacyNoticeModal() {
    const modal = document.getElementById('privacy-notice-modal');
    modal.classList.add('hidden');
}

function acceptPrivacyNoticeAndProceed() {
    markPrivacyNoticeSeen();
    closePrivacyNoticeModal();

    // Process the pending file
    if (pendingUploadFile) {
        const fileName = pendingUploadFile.name.toLowerCase();

        if (fileName.endsWith('.epub')) {
            processEPUBFile(pendingUploadFile);
        } else if (fileName.endsWith('.txt')) {
            processTextFile(pendingUploadFile);
        }

        pendingUploadFile = null;
    }
}

// EPUB Upload and Processing

function loadCustomVersions() {
    try {
        const stored = localStorage.getItem('subcutanean_custom_versions');
        if (stored) {
            const parsed = JSON.parse(stored);
            customVersions = parsed;

            // Merge custom versions into allVersions
            Object.keys(customVersions).forEach(vid => {
                allVersions[vid] = customVersions[vid].data;
            });
        }
    } catch (error) {
        console.error('Error loading custom versions:', error);
    }
}

function saveCustomVersions() {
    try {
        localStorage.setItem('subcutanean_custom_versions', JSON.stringify(customVersions));
    } catch (error) {
        console.error('Error saving custom versions:', error);
        if (error.name === 'QuotaExceededError') {
            showUploadStatus('Storage limit exceeded. Try removing other uploaded versions.', 'error');
        }
    }
}

class HTMLTextExtractor {
    constructor() {
        this.paragraphs = [];
        this.currentParagraph = [];
        this.title = null;
    }

    parse(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Extract title from h1
        const h1 = doc.querySelector('h1');
        if (h1) {
            this.title = h1.textContent.trim();

            // For PART sections, add the h1 content as the first paragraph
            // This captures the subtitle (e.g., "PART ONE: DOWNSTAIRS")
            if (this.title.startsWith('PART ')) {
                this.paragraphs.push(this.title);
            }
        }

        // Extract paragraphs (including those in blockquotes)
        const paragraphElements = doc.querySelectorAll('p');
        paragraphElements.forEach(p => {
            const paraText = this.extractParagraphWithEm(p);
            if (paraText) {
                this.paragraphs.push(paraText);
            }
        });

        return {
            paragraphs: this.paragraphs,
            title: this.title
        };
    }

    extractParagraphWithEm(element) {
        let result = '';

        element.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
                result += node.textContent;
            } else if (node.nodeName === 'EM') {
                result += `<em>${node.textContent}</em>`;
            } else if (node.childNodes.length > 0) {
                // Recursively handle nested elements
                result += this.extractParagraphWithEm(node);
            }
        });

        return result.trim();
    }
}

async function extractChapterFromEPUB(zip, chapterFile) {
    try {
        const chapterPath = `EPUB/text/${chapterFile}`;
        const file = zip.file(chapterPath);

        if (!file) {
            console.warn(`Chapter file not found: ${chapterPath}`);
            return null;
        }

        const htmlContent = await file.async('text');
        const extractor = new HTMLTextExtractor();
        return extractor.parse(htmlContent);
    } catch (error) {
        console.error(`Error extracting ${chapterFile}:`, error);
        return null;
    }
}

async function processEPUBFile(file) {
    showUploadStatus('Processing EPUB...', 'processing');

    try {
        // Load the EPUB file as a zip
        const arrayBuffer = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);

        // Extract version ID from filename
        // Supports multiple patterns:
        // - subcutanean-45468.epub -> 45468
        // - 45468.epub -> 45468
        // - subcutanean_45468.epub -> 45468
        // - 45468-subcutanean.epub -> 45468
        let versionId;

        // Try pattern: subcutanean-XXXXX or subcutanean_XXXXX
        let match = file.name.match(/subcutanean[-_](\d+)/i);
        if (match) {
            versionId = match[1];
        } else {
            // Try pattern: XXXXX-subcutanean
            match = file.name.match(/(\d+)[-_]subcutanean/i);
            if (match) {
                versionId = match[1];
            } else {
                // Try pattern: just a number (e.g., 45468.epub or 45468.txt)
                match = file.name.match(/^(\d+)\./);
                if (match) {
                    versionId = match[1];
                } else {
                    // Try any 4+ digit number in the filename
                    match = file.name.match(/(\d{4,})/);
                    if (match) {
                        versionId = match[1];
                    } else {
                        // Generate a custom ID if no pattern matches
                        versionId = `custom-${Date.now()}`;
                    }
                }
            }
        }

        // Check if already exists
        if (allVersions[versionId] || customVersions[versionId]) {
            showUploadStatus(`Version ${versionId} already loaded`, 'error');
            return;
        }

        const versionData = { version_id: versionId };

        // Extract all chapters according to mapping
        for (const [epubFile, sectionId] of Object.entries(CHAPTER_MAPPING)) {
            const result = await extractChapterFromEPUB(zip, epubFile);
            if (result) {
                versionData[sectionId] = result.paragraphs;
            }
        }

        // Validate that this is actually a Subcutanean version
        const validation = validateSubcutaneanVersion(versionData);
        if (!validation.valid) {
            showUploadStatus(`Upload failed: ${validation.error}`, 'error');
            return;
        }

        // Store in custom versions
        customVersions[versionId] = {
            name: `Seed ${versionId}`,
            data: versionData,
            uploadDate: new Date().toISOString()
        };

        // Merge into allVersions
        allVersions[versionId] = versionData;

        // Save to localStorage
        saveCustomVersions();

        // Refresh version selectors
        populateVersionSelectors();

        // Auto-select the new version
        document.getElementById('version-b-select').value = versionId;
        versionB = versionId;

        // Rebuild chapter navigation to show all chapters
        buildChapterNavigation();
        displayComparison();

        // Show success message
        showUploadStatus(`Successfully loaded Seed ${versionId}!`, 'success');

    } catch (error) {
        console.error('Error processing EPUB:', error);
        showUploadStatus('Error processing EPUB file', 'error');
    }
}

function showUploadStatus(message, type) {
    const statusElement = document.getElementById('upload-status');
    statusElement.textContent = message;
    statusElement.className = `upload-status ${type}`;

    // Clear success/error messages after 5 seconds
    if (type === 'success' || type === 'error') {
        setTimeout(() => {
            statusElement.textContent = '';
            statusElement.className = 'upload-status';
        }, 5000);
    }
}

function normalizeTextToSmartPunctuation(text) {
    // Convert plain ASCII punctuation to Unicode smart punctuation to match EPUB format

    // Convert triple hyphens to em dash
    text = text.replace(/---/g, '\u2014');

    // Convert double hyphens to em dash
    text = text.replace(/--/g, '\u2014');

    // Convert straight apostrophes to curly apostrophes
    // This handles contractions like "he'd", "don't", "it's"
    text = text.replace(/(\w)'(\w)/g, '$1\u2019$2');

    // Convert straight double quotes to smart quotes
    // Opening quote: after whitespace or at start of line
    text = text.replace(/(^|[\s\(\[])"(\S)/gm, '$1\u201c$2');

    // Closing quote: before whitespace, punctuation, or at end of line
    text = text.replace(/(\S)"([\s\.,;:!\?\)\]]|$)/gm, '$1\u201d$2');

    // Convert straight single quotes to smart quotes (for dialogue within dialogue)
    // Opening single quote: after whitespace or at start
    text = text.replace(/(^|[\s\("])'(\S)/gm, '$1\u2018$2');

    // Closing single quote: before whitespace or punctuation
    text = text.replace(/(\S)'([\s\.,;:!\?\)"]|$)/gm, '$1\u2019$2');

    return text;
}

function validateSubcutaneanVersion(versionData) {
    // Light validation to ensure this is actually a Subcutanean version
    // Check 1: Must have version_id
    if (!versionData.version_id) {
        return { valid: false, error: 'Missing version ID' };
    }

    // Check 2: Count how many expected sections we found
    const expectedSections = ['introduction', 'prologue', 'chapter1', 'chapter2', 'chapter3',
                              'chapter4', 'chapter5', 'chapter6', 'chapter7', 'chapter8',
                              'chapter9', 'part2', 'chapter10', 'chapter11', 'chapter12',
                              'chapter13', 'chapter14', 'chapter15', 'part3', 'chapter16',
                              'chapter17', 'chapter18', 'notes'];

    let foundSections = 0;
    for (const section of expectedSections) {
        if (versionData[section] && Array.isArray(versionData[section]) && versionData[section].length > 0) {
            foundSections++;
        }
    }

    // Check 3: Must have at least 10 sections to be considered valid (about half the expected sections)
    if (foundSections < 10) {
        return {
            valid: false,
            error: `Only found ${foundSections} valid sections. This may not be a Subcutanean version.`
        };
    }

    // Check 4: Must have at least one of the key early sections
    const hasKeySection = versionData.prologue || versionData.chapter1 || versionData.introduction;
    if (!hasKeySection) {
        return {
            valid: false,
            error: 'Missing key sections (prologue/chapter1). This may not be a Subcutanean version.'
        };
    }

    return { valid: true, foundSections };
}

async function processTextFile(file) {
    showUploadStatus('Processing text file...', 'processing');

    try {
        const text = await file.text();
        const lines = text.split('\n');

        // Extract seed number from header (line 7: "seed #50000")
        const seedLine = lines.find(line => line.includes('seed #'));
        let versionId;

        if (seedLine) {
            const match = seedLine.match(/seed #(\d+)/);
            versionId = match ? match[1] : null;
        }

        // If not in header, try to extract from filename
        if (!versionId) {
            // Try pattern: subcutanean-XXXXX or subcutanean_XXXXX
            let match = file.name.match(/subcutanean[-_](\d+)/i);
            if (match) {
                versionId = match[1];
            } else {
                // Try pattern: XXXXX-subcutanean
                match = file.name.match(/(\d+)[-_]subcutanean/i);
                if (match) {
                    versionId = match[1];
                } else {
                    // Try pattern: just a number (e.g., 45468.txt or 56019.txt)
                    match = file.name.match(/^(\d+)\./);
                    if (match) {
                        versionId = match[1];
                    } else {
                        // Try any 4+ digit number in the filename
                        match = file.name.match(/(\d{4,})/);
                        if (match) {
                            versionId = match[1];
                        } else {
                            // Generate a custom ID if no pattern matches
                            versionId = `custom-${Date.now()}`;
                        }
                    }
                }
            }
        }

        // Check if already exists
        if (allVersions[versionId] || customVersions[versionId]) {
            showUploadStatus(`Version ${versionId} already loaded`, 'error');
            return;
        }

        const versionData = { version_id: versionId };

        // Parse the text file structure
        let currentSection = 'header';
        let currentChapter = null;
        let currentParagraphs = [];
        const skipLines = new Set(); // Track line indices to skip (used as PART subtitles)

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Skip lines that were used as PART subtitles
            if (skipLines.has(i)) continue;

            // Skip empty lines in most cases
            if (!line && currentSection === 'header') continue;

            // Detect PART markers
            if (line === 'PART ONE') {
                // Look ahead for the subtitle on the next non-empty line to skip it
                let subtitleIndex = -1;
                for (let j = i + 1; j < lines.length; j++) {
                    const nextLine = lines[j].trim();
                    if (nextLine) {
                        subtitleIndex = j;
                        break;
                    }
                }

                // Save any previous prologue content (shouldn't happen, but just in case)
                if (currentParagraphs.length > 0) {
                    versionData.prologue = [...currentParagraphs];
                }

                currentSection = 'prologue';
                currentChapter = 'prologue';
                currentParagraphs = [];

                // Mark subtitle line to skip (it will be used in the title)
                if (subtitleIndex !== -1) {
                    skipLines.add(subtitleIndex);
                }

                continue;
            } else if (line === 'PART TWO') {
                // Look ahead for the subtitle on the next non-empty line to skip it
                let subtitleIndex = -1;
                for (let j = i + 1; j < lines.length; j++) {
                    const nextLine = lines[j].trim();
                    if (nextLine) {
                        subtitleIndex = j;
                        break;
                    }
                }

                // Save previous chapter if any
                if (currentChapter && currentParagraphs.length > 0) {
                    versionData[currentChapter] = [...currentParagraphs];
                }

                // Treat PART TWO as a chapter to collect its epigram
                currentChapter = 'part2';
                currentParagraphs = [];
                currentSection = 'part2';

                // Mark subtitle line to skip (it will be used in the title)
                if (subtitleIndex !== -1) {
                    skipLines.add(subtitleIndex);
                }

                continue;
            } else if (line === 'PART THREE') {
                // Look ahead for the subtitle on the next non-empty line to skip it
                let subtitleIndex = -1;
                for (let j = i + 1; j < lines.length; j++) {
                    const nextLine = lines[j].trim();
                    if (nextLine) {
                        subtitleIndex = j;
                        break;
                    }
                }

                // Save previous chapter if any
                if (currentChapter && currentParagraphs.length > 0) {
                    versionData[currentChapter] = [...currentParagraphs];
                }

                // Treat PART THREE as a chapter to collect its epigram
                currentChapter = 'part3';
                currentParagraphs = [];
                currentSection = 'part3';

                // Mark subtitle line to skip (it will be used in the title)
                if (subtitleIndex !== -1) {
                    skipLines.add(subtitleIndex);
                }

                continue;
            }

            // Detect chapter markers
            const chapterMatch = line.match(/^Chapter (\d+)$/);
            if (chapterMatch) {
                // Save previous chapter if any
                if (currentChapter && currentParagraphs.length > 0) {
                    versionData[currentChapter] = [...currentParagraphs];
                } else if (currentSection === 'prologue' && currentParagraphs.length > 0) {
                    versionData.prologue = [...currentParagraphs];
                }

                currentChapter = `chapter${chapterMatch[1]}`;
                currentParagraphs = [];
                currentSection = 'chapter';
                continue;
            }

            // Detect Epilogue (handle both "Epilogue" and "EPILOGUE")
            // Store as chapter18 to match built-in versions
            if (line === 'Epilogue' || line === 'EPILOGUE') {
                // Save previous chapter if any
                if (currentChapter && currentParagraphs.length > 0) {
                    versionData[currentChapter] = [...currentParagraphs];
                }

                currentChapter = 'chapter18';
                currentParagraphs = [];
                currentSection = 'chapter18';
                continue;
            }

            // Detect end sections
            if (line === 'ALTERNATE SCENE') {
                // Save previous chapter/section if any
                if (currentChapter && currentParagraphs.length > 0) {
                    versionData[currentChapter] = [...currentParagraphs];
                }

                currentChapter = 'alternatescene';
                currentParagraphs = [];
                currentSection = 'alternatescene';
                continue;
            }

            if (line === 'ABOUT THIS COPY') {
                // Save previous section if any
                if (currentChapter && currentParagraphs.length > 0) {
                    versionData[currentChapter] = [...currentParagraphs];
                }

                // Append to existing 'notes' section if it exists
                currentChapter = 'notes';
                currentParagraphs = versionData['notes'] ? [...versionData['notes']] : [];
                currentSection = 'notes';
                continue;
            }

            if (line.startsWith('BACKER ACKNOWLEDGMENTS') || line === 'Kickstarter Backers') {
                // Save previous section if any
                if (currentChapter && currentParagraphs.length > 0) {
                    versionData[currentChapter] = [...currentParagraphs];
                }

                currentChapter = 'backers';
                currentParagraphs = [];
                currentSection = 'backers';
                continue;
            }

            if (line === 'ABOUT THE AUTHOR' || line === 'About the Author') {
                // Save previous section if any
                if (currentChapter && currentParagraphs.length > 0) {
                    versionData[currentChapter] = [...currentParagraphs];
                }

                currentChapter = 'aboutauthor';
                currentParagraphs = [];
                currentSection = 'aboutauthor';
                continue;
            }

            // Skip single # markers (scene breaks)
            if (line === '#') {
                continue;
            }

            // Collect paragraph content
            if (line && currentSection !== 'header') {
                // Convert formatting markers (_italics_, *bold*) to HTML tags
                const formattedLine = convertTextFormatting(normalizeTextToSmartPunctuation(line));
                currentParagraphs.push(formattedLine);
            }

            // Extract introduction from header
            if (currentSection === 'header' && i < 17 && line && !line.includes('***') && !line.includes('===') && !line.startsWith('by ')) {
                if (!versionData.introduction) {
                    versionData.introduction = [];
                }
                if (line.includes('seed #')) {
                    const formattedLine = convertTextFormatting(normalizeTextToSmartPunctuation(line));
                    versionData.introduction.push(formattedLine);
                }
            }
        }

        // Save final chapter
        if (currentChapter && currentParagraphs.length > 0) {
            versionData[currentChapter] = [...currentParagraphs];
        }

        // Ensure introduction exists
        if (!versionData.introduction || versionData.introduction.length === 0) {
            versionData.introduction = ['Introduction'];
        }

        // Validate that this is actually a Subcutanean version
        const validation = validateSubcutaneanVersion(versionData);
        if (!validation.valid) {
            showUploadStatus(`Upload failed: ${validation.error}`, 'error');
            return;
        }

        // Store in custom versions
        customVersions[versionId] = {
            name: `Seed ${versionId}`,
            data: versionData,
            uploadDate: new Date().toISOString()
        };

        // Merge into allVersions
        allVersions[versionId] = versionData;

        // Save to localStorage
        saveCustomVersions();

        // Refresh version selectors
        populateVersionSelectors();

        // Auto-select the new version
        document.getElementById('version-b-select').value = versionId;
        versionB = versionId;

        // Rebuild chapter navigation to show all chapters
        buildChapterNavigation();
        displayComparison();

        // Show success message
        showUploadStatus(`Successfully loaded Seed ${versionId}!`, 'success');

    } catch (error) {
        console.error('Error processing text file:', error);
        showUploadStatus('Error processing text file', 'error');
    }
}

function handleEPUBUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();

    // Check file type
    if (!fileName.endsWith('.epub') && !fileName.endsWith('.txt')) {
        showUploadStatus('Please select an EPUB or TXT file', 'error');
        event.target.value = '';
        return;
    }

    // Check if user has seen privacy notice
    if (!hasSeenPrivacyNotice()) {
        pendingUploadFile = file;
        openPrivacyNoticeModal();
        event.target.value = '';
        return;
    }

    // Process file immediately if privacy notice already seen
    if (fileName.endsWith('.epub')) {
        processEPUBFile(file);
    } else if (fileName.endsWith('.txt')) {
        processTextFile(file);
    }

    // Reset file input
    event.target.value = '';
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupViewModeButtons();
    loadAllVersions();

    // Search event listeners
    const searchBtn = document.getElementById('search-btn');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const searchInput = document.getElementById('search-input');

    searchBtn.addEventListener('click', performSearch);
    clearSearchBtn.addEventListener('click', () => {
        clearSearchHighlights();
        searchInput.value = '';
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    // Search navigation event listeners
    const searchPrevBtn = document.getElementById('search-prev-btn');
    const searchNextBtn = document.getElementById('search-next-btn');

    searchPrevBtn.addEventListener('click', goToPreviousOccurrence);
    searchNextBtn.addEventListener('click', goToNextOccurrence);

    // Word differential event listeners
    const wordDiffBtn = document.getElementById('word-diff-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const modal = document.getElementById('word-diff-modal');

    wordDiffBtn.addEventListener('click', calculateWordDifferential);
    closeModalBtn.addEventListener('click', closeModal);

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Sort button event listeners
    const sortAlphaBtn = document.getElementById('sort-alpha-btn');
    const sortFreqBtn = document.getElementById('sort-freq-btn');

    sortAlphaBtn.addEventListener('click', () => setSortMode('alpha'));
    sortFreqBtn.addEventListener('click', () => setSortMode('freq'));

    // Word popup event listeners
    const wordPopup = document.getElementById('word-popup');
    const wordPopupCloseBtn = document.getElementById('word-popup-close');

    wordPopupCloseBtn.addEventListener('click', closeWordPopup);

    // Close popup when clicking outside
    document.addEventListener('click', (e) => {
        if (wordPopup.classList.contains('visible') &&
            !wordPopup.contains(e.target) &&
            !e.target.classList.contains('word-item')) {
            closeWordPopup();
        }
    });

    // Floating search navigation event listeners
    const floatingPrevBtn = document.getElementById('floating-prev-btn');
    const floatingNextBtn = document.getElementById('floating-next-btn');

    floatingPrevBtn.addEventListener('click', goToPreviousOccurrence);
    floatingNextBtn.addEventListener('click', goToNextOccurrence);

    // Keyboard shortcuts for search navigation
    document.addEventListener('keydown', (e) => {
        // Only respond to keyboard shortcuts if there are active search results
        if (allSearchOccurrences.length === 0) return;

        // F3 - Next occurrence (standard browser find convention)
        if (e.key === 'F3' && !e.shiftKey) {
            e.preventDefault();
            goToNextOccurrence();
        }

        // Shift+F3 - Previous occurrence
        if (e.key === 'F3' && e.shiftKey) {
            e.preventDefault();
            goToPreviousOccurrence();
        }

        // Escape - Clear search
        if (e.key === 'Escape' && currentSearchTerm) {
            clearSearchHighlights();
            searchInput.value = '';
        }
    });

    // EPUB upload event listener
    const epubUpload = document.getElementById('epub-upload');
    epubUpload.addEventListener('change', handleEPUBUpload);

    // Manage uploads event listeners
    const manageUploadsBtn = document.getElementById('manage-uploads-btn');
    const closeManageModalBtn = document.getElementById('close-manage-modal-btn');
    const manageModal = document.getElementById('manage-uploads-modal');

    manageUploadsBtn.addEventListener('click', () => {
        // Show info modal on first use, then open manage uploads modal
        if (!hasSeenManageInfoNotice()) {
            openManageInfoModal();
        } else {
            openManageUploadsModal();
        }
    });
    closeManageModalBtn.addEventListener('click', closeManageUploadsModal);

    // Close modal when clicking outside
    manageModal.addEventListener('click', (e) => {
        if (e.target === manageModal) {
            closeManageUploadsModal();
        }
    });

    // Manage Info modal event listeners
    const closeManageInfoModalBtn = document.getElementById('close-manage-info-modal-btn');
    const manageInfoUnderstandBtn = document.getElementById('manage-info-understand-btn');
    const manageInfoModal = document.getElementById('manage-info-modal');

    closeManageInfoModalBtn.addEventListener('click', closeManageInfoModal);
    manageInfoUnderstandBtn.addEventListener('click', acceptManageInfoAndProceed);

    // Close manage info modal when clicking outside
    manageInfoModal.addEventListener('click', (e) => {
        if (e.target === manageInfoModal) {
            closeManageInfoModal();
        }
    });

    // About modal event listeners
    const aboutBtn = document.getElementById('about-btn');
    const closeAboutModalBtn = document.getElementById('close-about-modal-btn');
    const aboutModal = document.getElementById('about-modal');

    aboutBtn.addEventListener('click', openAboutModal);
    closeAboutModalBtn.addEventListener('click', closeAboutModal);

    // Close modal when clicking outside
    aboutModal.addEventListener('click', (e) => {
        if (e.target === aboutModal) {
            closeAboutModal();
        }
    });

    // Privacy notice modal event listeners
    const closePrivacyModalBtn = document.getElementById('close-privacy-modal-btn');
    const privacyUnderstandBtn = document.getElementById('privacy-understand-btn');
    const privacyModal = document.getElementById('privacy-notice-modal');

    closePrivacyModalBtn.addEventListener('click', () => {
        closePrivacyNoticeModal();
        pendingUploadFile = null; // Clear pending file if user closes without accepting
    });

    privacyUnderstandBtn.addEventListener('click', acceptPrivacyNoticeAndProceed);

    // Close modal when clicking outside
    privacyModal.addEventListener('click', (e) => {
        if (e.target === privacyModal) {
            closePrivacyNoticeModal();
            pendingUploadFile = null; // Clear pending file if user closes without accepting
        }
    });

    // Levenshtein Distance functionality
    let levenshteinData = null;

    // Load Levenshtein distance data (only for 25 built-in versions)
    async function loadLevenshteinData() {
        if (levenshteinData) {
            return levenshteinData;
        }

        try {
            const response = await fetch('extracted_text/levenshtein_distances.json');
            levenshteinData = await response.json();
            return levenshteinData;
        } catch (error) {
            console.error('Error loading Levenshtein distance data:', error);
            return null;
        }
    }

    function openLevenshteinModal() {
        const modal = document.getElementById('levenshtein-modal');
        modal.classList.remove('hidden');

        loadLevenshteinData().then(data => {
            if (data) {
                displayLevenshteinSummary(data);
            }
        });
    }

    function closeLevenshteinModal() {
        const modal = document.getElementById('levenshtein-modal');
        modal.classList.add('hidden');

        // Hide matrix if it's showing
        const matrix = document.getElementById('distance-matrix');
        matrix.classList.add('hidden');

        const showMatrixBtn = document.getElementById('show-matrix-btn');
        showMatrixBtn.textContent = 'Show Complete Distance Matrix';
    }

    function displayLevenshteinSummary(data) {
        // Display most similar
        const [seed1, seed2] = data.most_similar.pair.split('-');
        document.getElementById('most-similar-seeds').textContent = `${seed1} & ${seed2}`;
        document.getElementById('most-similar-distance').textContent = data.most_similar.distance.toLocaleString();

        // Display most different
        const [seed3, seed4] = data.most_different.pair.split('-');
        document.getElementById('most-different-seeds').textContent = `${seed3} & ${seed4}`;
        document.getElementById('most-different-distance').textContent = data.most_different.distance.toLocaleString();

        // Setup load buttons
        const loadSimilarBtn = document.getElementById('load-most-similar-btn');
        const loadDifferentBtn = document.getElementById('load-most-different-btn');

        loadSimilarBtn.onclick = () => {
            closeLevenshteinModal();
            loadVersionPair(seed1, seed2);
        };

        loadDifferentBtn.onclick = () => {
            closeLevenshteinModal();
            loadVersionPair(seed3, seed4);
        };
    }

    function loadVersionPair(version1, version2) {
        const selectA = document.getElementById('version-a-select');
        const selectB = document.getElementById('version-b-select');

        selectA.value = version1;
        selectB.value = version2;

        // Update the version variables
        versionA = version1;
        versionB = version2;

        // Rebuild navigation and trigger comparison update
        buildChapterNavigation();
        displayComparison();
    }

    function toggleDistanceMatrix() {
        const matrix = document.getElementById('distance-matrix');
        const showMatrixBtn = document.getElementById('show-matrix-btn');

        if (matrix.classList.contains('hidden')) {
            loadLevenshteinData().then(data => {
                if (data) {
                    generateDistanceMatrix(data);
                    matrix.classList.remove('hidden');
                    showMatrixBtn.textContent = 'Hide Distance Matrix';
                }
            });
        } else {
            matrix.classList.add('hidden');
            showMatrixBtn.textContent = 'Show Complete Distance Matrix';
        }
    }

    function generateDistanceMatrix(data) {
        const matrixContainer = document.getElementById('distance-matrix');
        const versionIds = data.version_ids;

        // Create table
        let html = '<table><thead><tr><th>Seeds</th>';

        // Header row
        versionIds.forEach(id => {
            html += `<th>${id}</th>`;
        });
        html += '</tr></thead><tbody>';

        // Data rows
        versionIds.forEach(rowId => {
            html += `<tr><td>${rowId}</td>`;

            versionIds.forEach(colId => {
                if (rowId === colId) {
                    html += '<td>—</td>';
                } else {
                    const key = rowId < colId ? `${rowId}-${colId}` : `${colId}-${rowId}`;
                    const distance = data.all_distances[key];

                    // Handle cases where distance hasn't been calculated yet
                    if (distance === undefined || distance === null) {
                        html += `<td class="uncalculated" title="Distance not yet calculated">N/A</td>`;
                    } else {
                        let className = '';
                        if (key === data.most_similar.pair) {
                            className = 'highlight-min';
                        } else if (key === data.most_different.pair) {
                            className = 'highlight-max';
                        }

                        html += `<td class="${className}" data-v1="${rowId}" data-v2="${colId}" onclick="loadVersionsFromMatrix('${rowId}', '${colId}')">${distance.toLocaleString()}</td>`;
                    }
                }
            });

            html += '</tr>';
        });

        html += '</tbody></table>';
        matrixContainer.innerHTML = html;
    }

    // Make this function global so it can be called from onclick
    window.loadVersionsFromMatrix = function(version1, version2) {
        closeLevenshteinModal();
        loadVersionPair(version1, version2);
    };

    // Event listeners
    const levenshteinBtn = document.getElementById('levenshtein-btn');
    const closeLevenshteinBtn = document.getElementById('close-levenshtein-modal-btn');
    const levenshteinModal = document.getElementById('levenshtein-modal');
    const showMatrixBtn = document.getElementById('show-matrix-btn');

    levenshteinBtn.addEventListener('click', openLevenshteinModal);
    closeLevenshteinBtn.addEventListener('click', closeLevenshteinModal);
    showMatrixBtn.addEventListener('click', toggleDistanceMatrix);

    levenshteinModal.addEventListener('click', (e) => {
        if (e.target === levenshteinModal) {
            closeLevenshteinModal();
        }
    });
});
