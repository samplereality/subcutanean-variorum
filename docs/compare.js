// Subcutanean Version Comparison Tool

let allVersions = null;
let versionIds = [];
let currentChapter = 'prologue';
let currentMode = 'sidebyside';
let versionA = null;
let versionB = null;

// Load all versions data
async function loadAllVersions() {
    try {
        const response = await fetch('extracted_text/all_versions.json');
        allVersions = await response.json();
        versionIds = Object.keys(allVersions).sort();

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

    // Add change handlers
    selectorA.addEventListener('change', (e) => {
        versionA = e.target.value;
        displayComparison();
    });

    selectorB.addEventListener('change', (e) => {
        versionB = e.target.value;
        displayComparison();
    });
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupViewModeButtons();
    loadAllVersions();
});
