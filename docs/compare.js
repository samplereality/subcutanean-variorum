// Subcutanean Version Comparison Tool

let allVersions = null;
let versionIds = [];
let currentChapter = 'prologue';
let currentMode = 'sidebyside';
let versionA = null;
let versionB = null;
let customVersions = {}; // Store uploaded versions

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
            displayComparison();
        });
        selectorA.dataset.hasListener = 'true';
    }

    if (!selectorB.dataset.hasListener) {
        selectorB.addEventListener('change', (e) => {
            versionB = e.target.value;
            displayComparison();
        });
        selectorB.dataset.hasListener = 'true';
    }
}

function buildChapterNavigation() {
    const nav = document.getElementById('chapter-nav');
    nav.innerHTML = '';

    // Get chapter list from first version
    const firstVersion = allVersions[versionIds[0]];
    const chapters = Object.keys(firstVersion).filter(key => key !== 'version_id');

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

    // Compare paragraph by paragraph
    const maxLength = Math.max(paragraphsA.length, paragraphsB.length);

    for (let i = 0; i < maxLength; i++) {
        const paraA = paragraphsA[i] || '';
        const paraB = paragraphsB[i] || '';

        // Remove HTML tags for comparison
        const cleanA = paraA.replace(/<\/?em>/g, '');
        const cleanB = paraB.replace(/<\/?em>/g, '');

        const p = document.createElement('p');

        if (cleanA === cleanB) {
            // No change - show normal paragraph
            p.innerHTML = paraA || paraB;
        } else if (!cleanA) {
            // Paragraph only in B (added)
            p.innerHTML = `<span class="diff-added">${paraB}</span>`;
        } else if (!cleanB) {
            // Paragraph only in A (removed)
            p.innerHTML = `<span class="diff-removed">${paraA}</span>`;
        } else {
            // Use word-level diff and show inline
            const diff = Diff.diffWords(cleanA, cleanB);

            diff.forEach(part => {
                const span = document.createElement('span');

                if (part.added) {
                    span.className = 'diff-added';
                    span.textContent = part.value;
                } else if (part.removed) {
                    span.className = 'diff-removed';
                    span.textContent = part.value;
                } else {
                    // Unchanged text
                    span.textContent = part.value;
                }

                p.appendChild(span);
            });
        }

        div.appendChild(p);
    }

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
    description.textContent = `Words that appear in Seed ${versionA} but which do not appear in Seed ${versionB}, and vice-versa`;

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

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-upload-btn';
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', () => deleteCustomVersion(versionId));

            item.appendChild(info);
            item.appendChild(deleteBtn);
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

// About Modal functionality

function openAboutModal() {
    const modal = document.getElementById('about-modal');
    modal.classList.remove('hidden');
}

function closeAboutModal() {
    const modal = document.getElementById('about-modal');
    modal.classList.add('hidden');
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

        // Extract version ID from filename (e.g., "subcutanean-45468.epub" -> "45468")
        const match = file.name.match(/subcutanean-(\d+)/i);
        let versionId;

        if (match) {
            versionId = match[1];
        } else {
            // Generate a custom ID if pattern doesn't match
            versionId = `custom-${Date.now()}`;
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

        showUploadStatus(`Successfully loaded version ${versionId}!`, 'success');

        // Auto-select the new version
        document.getElementById('version-b-select').value = versionId;
        versionB = versionId;
        displayComparison();

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
            versionId = match ? match[1] : `custom-${Date.now()}`;
        } else {
            // Try to extract from filename
            const filenameMatch = file.name.match(/(\d+)\.txt$/);
            versionId = filenameMatch ? filenameMatch[1] : `custom-${Date.now()}`;
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
                // Look ahead for the subtitle on the next non-empty line
                let subtitle = '';
                let subtitleIndex = -1;
                for (let j = i + 1; j < lines.length; j++) {
                    const nextLine = lines[j].trim();
                    if (nextLine) {
                        subtitle = nextLine;
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

                // Add combined PART + subtitle as first paragraph
                if (subtitle) {
                    currentParagraphs.push(`PART ONE: ${subtitle}`);
                    skipLines.add(subtitleIndex); // Mark subtitle line to skip
                }

                continue;
            } else if (line === 'PART TWO') {
                // Look ahead for the subtitle on the next non-empty line
                let subtitle = '';
                let subtitleIndex = -1;
                for (let j = i + 1; j < lines.length; j++) {
                    const nextLine = lines[j].trim();
                    if (nextLine) {
                        subtitle = nextLine;
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

                // Add combined PART + subtitle as first paragraph
                if (subtitle) {
                    currentParagraphs.push(`PART TWO: ${subtitle}`);
                    skipLines.add(subtitleIndex); // Mark subtitle line to skip
                }

                continue;
            } else if (line === 'PART THREE') {
                // Look ahead for the subtitle on the next non-empty line
                let subtitle = '';
                let subtitleIndex = -1;
                for (let j = i + 1; j < lines.length; j++) {
                    const nextLine = lines[j].trim();
                    if (nextLine) {
                        subtitle = nextLine;
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

                // Add combined PART + subtitle as first paragraph
                if (subtitle) {
                    currentParagraphs.push(`PART THREE: ${subtitle}`);
                    skipLines.add(subtitleIndex); // Mark subtitle line to skip
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

            // Stop at ALTERNATE SCENE or Kickstarter backers
            if (line === 'ALTERNATE SCENE' || (i > 3900 && /^[A-Z][a-z]+ [A-Z]/.test(line))) {
                break;
            }

            // Skip single # markers (scene breaks)
            if (line === '#') {
                continue;
            }

            // Collect paragraph content
            if (line && currentSection !== 'header') {
                currentParagraphs.push(normalizeTextToSmartPunctuation(line));
            }

            // Extract introduction from header
            if (currentSection === 'header' && i < 17 && line && !line.includes('***') && !line.includes('===') && !line.startsWith('by ')) {
                if (!versionData.introduction) {
                    versionData.introduction = [];
                }
                if (line.includes('seed #')) {
                    versionData.introduction.push(normalizeTextToSmartPunctuation(line));
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

        showUploadStatus(`Successfully loaded Seed ${versionId}!`, 'success');

        // Auto-select the new version
        document.getElementById('version-b-select').value = versionId;
        versionB = versionId;
        displayComparison();

    } catch (error) {
        console.error('Error processing text file:', error);
        showUploadStatus('Error processing text file', 'error');
    }
}

function handleEPUBUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.epub')) {
        processEPUBFile(file);
    } else if (fileName.endsWith('.txt')) {
        processTextFile(file);
    } else {
        showUploadStatus('Please select an EPUB or TXT file', 'error');
        return;
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

    manageUploadsBtn.addEventListener('click', openManageUploadsModal);
    closeManageModalBtn.addEventListener('click', closeManageUploadsModal);

    // Close modal when clicking outside
    manageModal.addEventListener('click', (e) => {
        if (e.target === manageModal) {
            closeManageUploadsModal();
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
});
