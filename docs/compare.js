// Subcutanean Version Comparison Tool

let allVersions = null;
let versionIds = [];
let currentChapter = 'prologue';
let currentMode = 'sidebyside';
let versionA = null;
let versionB = null;
let versionC = null; // Optional third version for three-way comparison
let unifiedViewVersion = 'A'; // Which version to display in unified view (A, B, or C)
let customVersions = {}; // Store uploaded versions
let mostRecentUploadId = null; // Track most recently uploaded version for Jaccard analysis
let bookmarks = [];
let bookmarkPanelOpen = false;
let bookmarkPanelPosition = { x: null, y: null };
let filesPanelOpen = false;
let filesPanelPosition = { x: null, y: null };
let pendingBookmarkScroll = null;
let originSources = null;
let originSourcesLoaded = false;
let originSourcePanelOpen = false;
let currentSourceKey = null;
let sourcePanelPosition = { x: null, y: null };
let sourceSyncState = null;
let versionChapterTextCache = {};
let variableInfo = null; // Variable descriptions and usage patterns
let variableGroups = null; // Mutually exclusive variable groups for inference
let variableMacros = null; // Macro definitions for inference
let chapterVariables = null; // Chapter-local variable definitions
let scholarlyDescriptions = null; // Scholarly annotations (override variableInfo descriptions)
let sourceSyntaxHighlightingEnabled = false;
const SOURCE_VERSION_ID = 'quant_source';
const SOURCE_VERSION_LABEL = 'Source Code';
let sourceParagraphCache = {};

// Navigation state
let activeNavDropdown = null;
let mobileNavOpen = false;

// Theme state
let currentTheme = 'dark';

// Theme functions
function initializeTheme() {
    // Check localStorage for saved preference
    const savedTheme = localStorage.getItem('subcutanean_theme');
    if (savedTheme) {
        currentTheme = savedTheme;
    } else {
        // Default to dark mode
        currentTheme = 'dark';
    }
    applyTheme(currentTheme);
}

function applyTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeToggleUI();
    localStorage.setItem('subcutanean_theme', theme);
}

function toggleTheme() {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
}

function updateThemeToggleUI() {
    const themeIcon = document.getElementById('theme-icon');
    const themeLabel = document.getElementById('theme-label');

    if (themeIcon && themeLabel) {
        if (currentTheme === 'dark') {
            // Show sun icon to indicate "click for light mode"
            themeIcon.setAttribute('data-lucide', 'sun');
            themeLabel.textContent = 'Light';
        } else {
            // Show moon icon to indicate "click for dark mode"
            themeIcon.setAttribute('data-lucide', 'moon');
            themeLabel.textContent = 'Dark';
        }
        // Re-render Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
}

// Navigation functions
function initializeNavigation() {
    const navAbout = document.getElementById('nav-about');
    const navBookmarks = document.getElementById('nav-bookmarks');
    const navAnnotations = document.getElementById('nav-annotations');
    const navFiles = document.getElementById('nav-files');
    const navSource = document.getElementById('nav-source');
    const navMobileToggle = document.getElementById('nav-mobile-toggle');

    if (navAbout) {
        navAbout.addEventListener('click', (e) => {
            e.stopPropagation();
            closeAllNavDropdowns();
            closeMobileNav();
            // Toggle the About modal
            const modal = document.getElementById('about-modal');
            if (modal && !modal.classList.contains('hidden')) {
                closeAboutModal();
            } else {
                openAboutModal();
            }
        });
    }

    if (navBookmarks) {
        navBookmarks.addEventListener('click', (e) => {
            e.stopPropagation();
            closeMobileNav();
            toggleNavDropdown('bookmarks-dropdown', 'nav-bookmarks');
        });
    }

    if (navAnnotations) {
        navAnnotations.addEventListener('click', (e) => {
            e.stopPropagation();
            closeMobileNav();
            toggleNavDropdown('annotations-dropdown', 'nav-annotations');
        });
    }

    if (navFiles) {
        navFiles.addEventListener('click', (e) => {
            e.stopPropagation();
            closeMobileNav();
            toggleNavDropdown('files-dropdown', 'nav-files');
        });
    }

    if (navSource) {
        navSource.addEventListener('click', (e) => {
            e.stopPropagation();
            closeMobileNav();
            toggleNavDropdown('source-dropdown', 'nav-source');
            if (activeNavDropdown === 'source-dropdown') {
                syncSourceToCurrentChapter();
            }
        });
    }

    const navGenerate = document.getElementById('nav-generate');
    if (navGenerate) {
        navGenerate.addEventListener('click', (e) => {
            e.stopPropagation();
            closeAllNavDropdowns();
            closeMobileNav();
            // Toggle the Generate modal
            const modal = document.getElementById('generate-modal');
            if (modal && !modal.classList.contains('hidden')) {
                closeGenerateModal();
            } else {
                openGenerateModal();
            }
        });
    }

    if (navMobileToggle) {
        navMobileToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMobileNav();
        });
    }

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.nav-dropdown') && !e.target.closest('.nav-item')) {
            closeAllNavDropdowns();
        }
        if (!e.target.closest('.nav-links') && !e.target.closest('.nav-mobile-toggle')) {
            closeMobileNav();
        }
    });

    // Close mobile nav on window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth > 640 && mobileNavOpen) {
            closeMobileNav();
        }
    });
}

function toggleNavDropdown(dropdownId, navItemId) {
    const dropdown = document.getElementById(dropdownId);
    const navItem = document.getElementById(navItemId);

    // Close any open modals when opening a dropdown
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));

    if (activeNavDropdown === dropdownId) {
        closeAllNavDropdowns();
    } else {
        closeAllNavDropdowns();
        if (dropdown) dropdown.classList.add('open');
        if (navItem) navItem.classList.add('active');
        activeNavDropdown = dropdownId;
    }
}

function closeAllNavDropdowns() {
    document.querySelectorAll('.nav-dropdown').forEach(d => d.classList.remove('open'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    activeNavDropdown = null;
}

function toggleMobileNav() {
    const navLinks = document.getElementById('nav-links');
    mobileNavOpen = !mobileNavOpen;
    if (navLinks) {
        navLinks.classList.toggle('mobile-open', mobileNavOpen);
    }
}

function closeMobileNav() {
    const navLinks = document.getElementById('nav-links');
    mobileNavOpen = false;
    if (navLinks) {
        navLinks.classList.remove('mobile-open');
    }
}

function isSourceCodeVisible() {
    return versionA === SOURCE_VERSION_ID || versionB === SOURCE_VERSION_ID;
}

function getAllVersionIds() {
    const combined = new Set([...versionIds, ...Object.keys(customVersions)]);
    return Array.from(combined).sort();
}

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

const SOURCE_KEY_BY_CHAPTER = {
    introduction: 'globals',
    prologue: 'part01',
    part2: 'part02',
    part3: 'part03',
    chapter1: 'ch01',
    chapter2: 'ch02',
    chapter3: 'ch03',
    chapter4: 'ch04',
    chapter5: 'ch05',
    chapter6: 'ch06',
    chapter7: 'ch07',
    chapter8: 'ch08',
    chapter9: 'ch09',
    chapter10: 'ch10',
    chapter11: 'ch11',
    chapter12: 'ch12',
    chapter13: 'ch13',
    chapter14: 'ch14',
    chapter15: 'ch15',
    chapter16: 'ch16',
    chapter17: 'ch17',
    chapter18: 'epilogue',
    notes: 'notes'
};

const NON_NARRATIVE_SECTIONS = new Set([
    'introduction',
    'notes',
    'backers',
    'aboutauthor',
    'alternatescene'
]);

const SLANG_REGEX = /\b(thing|things|stuff|okay|ok|cool|guys|dude|junk|sucks|sucked|whatever|wanna|gonna|gotta|dunno|kinda|whatcha|lemme|outta|gimme|ain't|yeah|yep|yup|actually|shit|shitty|fuck|fucking|fucked|till|little|nope|huh|uh|um|umm|ah|ahh|aha|aww|eh|er|eww|hey|hmm|uh-huh|wow|yay|lot|lots|tons|'em|weird|jet|poke)\b/gi;
const ME_WORD_REGEX = /\b(i|i'm|i'll|i'd|me|my|myself|mine)\b/gi;
const SIMILE_REGEX = /\b(like|as if)\b/gi;

function isSourceVersion(versionId) {
    return versionId === SOURCE_VERSION_ID;
}

function formatVersionLabel(versionId) {
    if (!versionId) return 'Version';
    return isSourceVersion(versionId) ? SOURCE_VERSION_LABEL : `Seed ${versionId}`;
}

function getAvailableSourceChapters() {
    if (!originSourcesLoaded || !originSources || !originSources.chapters) return [];
    const chapters = [];
    Object.entries(SOURCE_KEY_BY_CHAPTER).forEach(([chapterId, key]) => {
        if (originSources.chapters[key]) {
            chapters.push(chapterId);
        }
    });
    return chapters;
}

function escapeHTML(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Lighter escaping for source code display - only escape HTML-significant chars
function escapeForDisplay(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function normalizePlainText(str) {
    if (!str) return '';
    return str
        .replace(/[\{\}\[\]\|]/g, ' ')
        .replace(/\\+/g, ' ')
        .replace(/[^a-z0-9\s]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

function normalizeHtmlContent(html) {
    if (!html) return '';
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return normalizePlainText(temp.textContent || '');
}

function convertSourceContentToParagraphs(content) {
    const normalized = (content || '').replace(/\r\n/g, '\n');
    const blocks = normalized.split(/\n{2,}/);
    const htmlBlocks = [];
    const highlightedBlocks = [];
    const normalizedBlocks = [];
    const rawBlocks = [];

    blocks.forEach(block => {
        const withoutLeadingNewlines = block.replace(/^\n+/, '').replace(/\n+$/, '');
        if (!withoutLeadingNewlines.trim()) return;
        const html = escapeHTML(withoutLeadingNewlines).replace(/\n/g, '<br>');
        htmlBlocks.push(`<div class="source-snippet">${html}</div>`);
        highlightedBlocks.push(`<div class="source-snippet">${highlightQuantSyntax(withoutLeadingNewlines)}</div>`);
        normalizedBlocks.push(normalizePlainText(withoutLeadingNewlines));
        rawBlocks.push(withoutLeadingNewlines);
    });
    const rawText = normalized;

    return {
        html: htmlBlocks,
        htmlHighlighted: highlightedBlocks,
        normalized: normalizedBlocks,
        raw: rawBlocks,
        rawText
    };
}

function highlightQuantSyntax(text) {
    if (!text) return '';
    const normalized = text.replace(/\r\n?/g, '\n');
    return normalized.split('\n').map(highlightQuantLine).join('<br>');
}

function highlightQuantLine(line) {
    if (!line) return '';
    if (/^\s*#/.test(line)) {
        return `<span class="quant-token quant-comment">${escapeHTML(line)}</span>`;
    }
    let result = '';
    let index = 0;
    while (index < line.length) {
        const char = line[index];
        if (char === '[') {
            const closeIndex = findMatchingDelimiter(line, index, '[', ']');
            if (closeIndex !== -1) {
                const content = line.slice(index + 1, closeIndex);
                result += wrapQuantControl('[');
                result += highlightQuantBlock(content);
                result += wrapQuantControl(']');
                index = closeIndex + 1;
                continue;
            }
        }
        if (char === '{') {
            const closeIndex = findMatchingDelimiter(line, index, '{', '}');
            if (closeIndex !== -1) {
                result += `<span class="quant-token quant-macro-inline">${escapeHTML(line.slice(index, closeIndex + 1))}</span>`;
                index = closeIndex + 1;
                continue;
            }
        }
        if (char === '$') {
            const macroMatch = line.slice(index).match(/^\$[A-Za-z0-9_-]+/);
            if (macroMatch) {
                result += `<span class="quant-token quant-macro-inline">${escapeHTML(macroMatch[0])}</span>`;
                index += macroMatch[0].length;
                continue;
            }
        }
        if (char === '@') {
            const variableMatch = line.slice(index).match(/^@[A-Za-z_][A-Za-z0-9_-]*/);
            if (variableMatch) {
                result += `<span class="quant-token quant-variable">${escapeHTML(variableMatch[0])}</span>`;
                index += variableMatch[0].length;
                continue;
            }
        }
        if (char === '*') {
            const labelMatch = line.slice(index).match(/^\*[^*]+\*/);
            if (labelMatch) {
                result += `<span class="quant-token quant-label">${escapeHTML(labelMatch[0])}</span>`;
                index += labelMatch[0].length;
                continue;
            }
        }
        if (isQuantControlChar(char)) {
            result += wrapQuantControl(char);
            index += 1;
            continue;
        }
        if (char === '^') {
            result += `<span class="quant-token quant-author">${escapeHTML(char)}</span>`;
            index += 1;
            continue;
        }
        result += escapeHTML(char);
        index += 1;
    }
    return result;
}

function highlightQuantBlock(content) {
    const trimmedUpper = content.trimStart().toUpperCase();
    let blockClass = 'quant-logic';
    if (trimmedUpper.startsWith('DEFINE')) {
        blockClass = 'quant-define';
    } else if (trimmedUpper.startsWith('MACRO') || trimmedUpper.startsWith('STICKY_MACRO')) {
        blockClass = 'quant-macro';
    } else if (trimmedUpper.startsWith('@')) {
        blockClass = 'quant-variable';
    }
    return `<span class="quant-token ${blockClass}">${tokenizeQuantContent(content)}</span>`;
}

function tokenizeQuantContent(content) {
    let html = '';
    let index = 0;
    while (index < content.length) {
        const remaining = content.slice(index);
        const stickyMatch = remaining.match(/^(STICKY_MACRO)/i);
        if (stickyMatch) {
            html += `<span class="quant-token quant-keyword">${escapeHTML(stickyMatch[0])}</span>`;
            index += stickyMatch[0].length;
            continue;
        }
        const macroMatch = remaining.match(/^(MACRO)/i);
        if (macroMatch) {
            html += `<span class="quant-token quant-keyword">${escapeHTML(macroMatch[0])}</span>`;
            index += macroMatch[0].length;
            continue;
        }
        const defineMatch = remaining.match(/^(DEFINE)/i);
        if (defineMatch) {
            html += `<span class="quant-token quant-keyword">${escapeHTML(defineMatch[0])}</span>`;
            index += defineMatch[0].length;
            continue;
        }
        const probabilityMatch = remaining.match(/^(\d{1,3})>(?!\d)/);
        if (probabilityMatch) {
            html += `<span class="quant-token quant-probability">${escapeHTML(probabilityMatch[1])}&gt;</span>`;
            index += probabilityMatch[0].length;
            continue;
        }
        const variableMatch = remaining.match(/^@[A-Za-z_][A-Za-z0-9_-]*/);
        if (variableMatch) {
            html += `<span class="quant-token quant-variable">${escapeHTML(variableMatch[0])}</span>`;
            index += variableMatch[0].length;
            continue;
        }
        const labelMatch = remaining.match(/^\*[^*]+\*/);
        if (labelMatch) {
            html += `<span class="quant-token quant-label">${escapeHTML(labelMatch[0])}</span>`;
            index += labelMatch[0].length;
            continue;
        }
        const controlChar = remaining[0];
        if (isQuantControlChar(controlChar)) {
            html += wrapQuantControl(controlChar);
            index += 1;
            continue;
        }
        if (controlChar === '^') {
            html += `<span class="quant-token quant-author">${escapeHTML(controlChar)}</span>`;
            index += 1;
            continue;
        }
        html += escapeHTML(controlChar);
        index += 1;
    }
    return html;
}

function isQuantControlChar(char) {
    return ['|', '>', '~', '/', '\\', '[', ']'].includes(char);
}

function wrapQuantControl(char) {
    return `<span class="quant-control">${escapeHTML(char)}</span>`;
}

function findMatchingDelimiter(text, startIndex, openChar, closeChar) {
    let depth = 0;
    for (let i = startIndex; i < text.length; i++) {
        if (text[i] === openChar) {
            depth += 1;
        } else if (text[i] === closeChar) {
            depth -= 1;
            if (depth === 0) {
                return i;
            }
        }
    }
    return -1;
}

function getSourceChapterParagraphs(chapterId, highlighted = false) {
    const key = getSourceKeyForChapter(chapterId);
    if (!key || !originSourcesLoaded || !originSources || !originSources.chapters[key]) {
        return [];
    }

    if (!sourceParagraphCache[key]) {
        sourceParagraphCache[key] = convertSourceContentToParagraphs(originSources.chapters[key].content || '');
    }

    const cache = sourceParagraphCache[key];
    return highlighted ? cache.htmlHighlighted : cache.html;
}

function getSourceChapterNormalizedParagraphs(chapterId) {
    const key = getSourceKeyForChapter(chapterId);
    if (!key || !originSourcesLoaded || !originSources || !originSources.chapters[key]) {
        return [];
    }

    if (!sourceParagraphCache[key]) {
        sourceParagraphCache[key] = convertSourceContentToParagraphs(originSources.chapters[key].content || '');
    }

    return sourceParagraphCache[key].normalized;
}

function getSourceChapterRawParagraphs(chapterId) {
    const key = getSourceKeyForChapter(chapterId);
    if (!key || !originSourcesLoaded || !originSources || !originSources.chapters[key]) {
        return [];
    }

    if (!sourceParagraphCache[key]) {
        sourceParagraphCache[key] = convertSourceContentToParagraphs(originSources.chapters[key].content || '');
    }

    return sourceParagraphCache[key].raw;
}

function getChapterContent(versionId, chapterId) {
    if (!versionId) {
        return { paragraphs: [], isSource: false };
    }
    if (isSourceVersion(versionId)) {
        return {
            paragraphs: getSourceChapterParagraphs(chapterId, sourceSyntaxHighlightingEnabled),
            isSource: true
        };
    }
    if (!allVersions || !allVersions[versionId]) {
        return { paragraphs: [], isSource: false };
    }
    const versionData = allVersions[versionId];
    return {
        paragraphs: (versionData && versionData[chapterId]) || [],
        isSource: false
    };
}

function updateToolbarVisibility() {
    const sourceSelected = isSourceCodeVisible();
    const diffBtn = document.getElementById('mode-diff');
    const comparisonBtn = document.getElementById('mode-comparison');
    const syntaxBtn = document.getElementById('syntax-toggle-btn');

    if (diffBtn) diffBtn.classList.toggle('hidden', sourceSelected);
    if (comparisonBtn) comparisonBtn.classList.toggle('hidden', sourceSelected);
    if (syntaxBtn) {
        syntaxBtn.classList.toggle('hidden', !sourceSelected);
        syntaxBtn.disabled = !sourceSelected;
        if (!sourceSelected && sourceSyntaxHighlightingEnabled) {
            sourceSyntaxHighlightingEnabled = false;
        }
        syntaxBtn.classList.toggle('syntax-active', sourceSyntaxHighlightingEnabled);
        syntaxBtn.textContent = sourceSyntaxHighlightingEnabled ? 'Disable Syntax Highlighting' : 'Enable Syntax Highlighting';
    }
}

function getChapterParagraphs(versionId, chapterId) {
    return getChapterContent(versionId, chapterId).paragraphs;
}

function getNormalizedParagraphsForVersion(versionId, chapterId) {
    const paragraphs = getChapterParagraphs(versionId, chapterId) || [];
    return paragraphs.map(para => normalizeHtmlContent(para));
}

function getChaptersForVersion(versionId) {
    if (isSourceVersion(versionId)) {
        return getAvailableSourceChapters();
    }
    if (!allVersions) return [];
    const versionData = allVersions[versionId];
    if (!versionData) return [];
    return Object.keys(versionData).filter(key => key !== 'version_id');
}

function getVersionChapterIds(versionId) {
    if (!allVersions || !allVersions[versionId]) return [];
    const versionData = allVersions[versionId];
    return Object.keys(versionData).filter(key => {
        if (key === 'version_id') return false;
        const value = versionData[key];
        return Array.isArray(value);
    });
}

function htmlToPlainText(html) {
    if (!html) return '';
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || '';
}

function getVersionChapterText(versionId, chapterId, normalized = false) {
    if (!versionId || !chapterId || !allVersions || !allVersions[versionId]) return '';
    if (!versionChapterTextCache[versionId]) {
        versionChapterTextCache[versionId] = { raw: {}, normalized: {} };
    }
    const bucket = normalized ? 'normalized' : 'raw';
    if (versionChapterTextCache[versionId][bucket][chapterId]) {
        return versionChapterTextCache[versionId][bucket][chapterId];
    }
    const paragraphs = getChapterParagraphs(versionId, chapterId);
    if (!paragraphs || !paragraphs.length) return '';
    const plain = paragraphs.map(htmlToPlainText).join('\n');
    const text = normalized ? normalizePlainText(plain) : plain;
    versionChapterTextCache[versionId][bucket][chapterId] = text;
    return text;
}

function invalidateVersionCaches(versionId) {
    if (!versionId) return;
    if (versionChapterTextCache[versionId]) {
        delete versionChapterTextCache[versionId];
    }
}

function isVersionSelectable(versionId) {
    if (isSourceVersion(versionId)) {
        return originSourcesLoaded;
    }
    return !!allVersions[versionId];
}

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
        refreshBookmarkUI();

    } catch (error) {
        console.error('Error loading versions:', error);
        document.getElementById('comparison-display').innerHTML =
            '<p class="loading">Error loading version data. Please ensure all_versions.json exists.</p>';
    }
}

function populateVersionSelectors() {
    const selectorA = document.getElementById('version-a-select');
    const selectorB = document.getElementById('version-b-select');
    const selectorC = document.getElementById('version-c-select');
    if (!selectorA || !selectorB) return;

    const previousValueA = selectorA.value;
    const previousValueB = selectorB.value;
    const previousValueC = selectorC ? selectorC.value : null;

    // Clear existing options
    selectorA.innerHTML = '';
    selectorB.innerHTML = '';
    if (selectorC) selectorC.innerHTML = '';

    const addSourceOption = (select) => {
        const option = document.createElement('option');
        option.value = SOURCE_VERSION_ID;
        option.textContent = originSourcesLoaded ? '⟨⟩ Source Code' : '⟨⟩ Source Code (loading...)';
        option.disabled = !originSourcesLoaded;
        select.appendChild(option);
    };

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

        if (selectorC) {
            const optionC = document.createElement('option');
            optionC.value = vid;
            optionC.textContent = `Seed ${vid}`;
            selectorC.appendChild(optionC);
        }
    });

    addSourceOption(selectorA);
    addSourceOption(selectorB);
    if (selectorC) addSourceOption(selectorC);

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

        if (selectorC) {
            const separatorC = document.createElement('option');
            separatorC.disabled = true;
            separatorC.textContent = '──────────';
            selectorC.appendChild(separatorC);
        }

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

            if (selectorC) {
                const optionC = document.createElement('option');
                optionC.value = vid;
                optionC.textContent = `📎 ${customVersions[vid].name || vid}`;
                selectorC.appendChild(optionC);
            }
        });
    }

    const desiredA = versionA || previousValueA;
    const desiredB = versionB || previousValueB;
    const desiredC = versionC || previousValueC;

    if (desiredA) {
        selectorA.value = desiredA;
    }

    if (!selectorA.value && selectorA.options.length > 0) {
        selectorA.value = selectorA.options[0].value;
    }

    if (desiredB) {
        selectorB.value = desiredB;
    }

    if (!selectorB.value && selectorB.options.length > 0) {
        selectorB.value = selectorB.options[0].value;
    }

    // Set selector C value if it exists and versionC is set
    if (selectorC && desiredC) {
        selectorC.value = desiredC;
    }

    // Add change handlers (only once)
    if (!selectorA.dataset.hasListener) {
        selectorA.addEventListener('change', (e) => {
            versionA = e.target.value;
            buildChapterNavigation();
            displayComparison();
            updateToolbarVisibility();
            updateVariableDiffIfVisible();
            updateChapterVariablesPanelIfVisible();
        });
        selectorA.dataset.hasListener = 'true';
    }

    if (!selectorB.dataset.hasListener) {
        selectorB.addEventListener('change', (e) => {
            versionB = e.target.value;
            buildChapterNavigation();
            displayComparison();
            updateToolbarVisibility();
            updateVariableDiffIfVisible();
            updateChapterVariablesPanelIfVisible();
        });
        selectorB.dataset.hasListener = 'true';
    }

    if (selectorC && !selectorC.dataset.hasListener) {
        selectorC.addEventListener('change', (e) => {
            versionC = e.target.value;
            buildChapterNavigation();
            displayComparison();
            updateToolbarVisibility();
            updateVariableDiffIfVisible();
            updateChapterVariablesPanelIfVisible();
        });
        selectorC.dataset.hasListener = 'true';
    }
}

function updateVariableDiffIfVisible() {
    const panel = document.getElementById('variable-diff-panel');
    if (panel && !panel.classList.contains('hidden')) {
        updateVariableDiff();
    }
}

// Toggle third version mode
function toggleThirdVersion(enable) {
    const group = document.getElementById('version-c-group');
    const addBtn = document.getElementById('add-version-c-btn');
    const selectorC = document.getElementById('version-c-select');
    const varDiffCSection = document.getElementById('var-diff-c-section');

    if (enable) {
        // Show version C selector
        if (group) group.classList.remove('hidden');
        if (addBtn) addBtn.classList.add('hidden');

        // Auto-select a version different from A and B
        if (!versionC && versionIds.length > 2) {
            versionC = versionIds.find(id => id !== versionA && id !== versionB) || versionIds[2];
            if (selectorC) selectorC.value = versionC;
        }

        // Show version C in variables panel
        if (varDiffCSection) varDiffCSection.classList.remove('hidden');

        // Initialize Lucide icons for the remove button
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    } else {
        // Hide version C selector
        if (group) group.classList.add('hidden');
        if (addBtn) addBtn.classList.remove('hidden');
        versionC = null;

        // Hide version C in variables panel
        if (varDiffCSection) varDiffCSection.classList.add('hidden');
    }

    // Re-render comparison with new version state
    buildChapterNavigation();
    displayComparison();
    updateVariableDiffIfVisible();
    updateChapterVariablesPanelIfVisible();
}

function initializeThirdVersionControls() {
    const addBtn = document.getElementById('add-version-c-btn');
    const removeBtn = document.getElementById('remove-version-c-btn');

    if (addBtn) {
        addBtn.addEventListener('click', () => toggleThirdVersion(true));
    }

    if (removeBtn) {
        removeBtn.addEventListener('click', () => toggleThirdVersion(false));
    }
}

// Variable diff panel functions
function getVersionVariables(versionId) {
    if (!versionId) return [];

    // First check allVersions (pre-loaded seeds)
    if (allVersions && allVersions[versionId]?.variables) {
        return allVersions[versionId].variables;
    }

    // Then check customVersions (uploaded EPUBs with inferred variables)
    if (customVersions && customVersions[versionId]?.variables) {
        return customVersions[versionId].variables;
    }

    return [];
}

function updateVariableDiff() {
    const varsOnlyA = document.getElementById('vars-only-a');
    const varsOnlyB = document.getElementById('vars-only-b');
    const varsOnlyC = document.getElementById('vars-only-c');
    const varsShared = document.getElementById('vars-shared');
    const labelA = document.getElementById('var-diff-a-label');
    const labelB = document.getElementById('var-diff-b-label');
    const labelC = document.getElementById('var-diff-c-label');
    const sharedLabel = document.getElementById('var-shared-label');

    if (!varsOnlyA || !varsOnlyB || !varsShared) return;

    // Helper to filter to only global variables (defined in globals.txt)
    const isGlobalVar = (v) => variableInfo && variableInfo[v];

    // Get version variables, filtered to only include global variables
    const varsA = new Set(getVersionVariables(versionA).filter(isGlobalVar));
    const varsB = new Set(getVersionVariables(versionB).filter(isGlobalVar));
    const varsC = versionC ? new Set(getVersionVariables(versionC).filter(isGlobalVar)) : null;

    // Update labels
    if (labelA) labelA.textContent = versionA || 'A';
    if (labelB) labelB.textContent = versionB || 'B';
    if (labelC) labelC.textContent = versionC || 'C';

    // Calculate differences
    let onlyInA, onlyInB, onlyInC, shared;

    if (versionC && varsC) {
        // Three-way comparison
        onlyInA = [...varsA].filter(v => !varsB.has(v) && !varsC.has(v)).sort();
        onlyInB = [...varsB].filter(v => !varsA.has(v) && !varsC.has(v)).sort();
        onlyInC = [...varsC].filter(v => !varsA.has(v) && !varsB.has(v)).sort();
        shared = [...varsA].filter(v => varsB.has(v) && varsC.has(v)).sort();
        if (sharedLabel) sharedLabel.textContent = 'In all three';
    } else {
        // Two-way comparison
        onlyInA = [...varsA].filter(v => !varsB.has(v)).sort();
        onlyInB = [...varsB].filter(v => !varsA.has(v)).sort();
        onlyInC = [];
        shared = [...varsA].filter(v => varsB.has(v)).sort();
        if (sharedLabel) sharedLabel.textContent = 'Shared';
    }

    // Render variable tags with tooltips and click handlers
    const renderVars = (vars) => {
        if (vars.length === 0) return '<span class="var-list-empty">none</span>';
        return vars.map(v => {
            const info = variableInfo ? variableInfo[v] : null;
            // Scholarly descriptions take precedence over source descriptions
            const scholarlyDesc = scholarlyDescriptions ? scholarlyDescriptions[v] : null;
            const sourceDesc = info?.description;
            const description = scholarlyDesc || sourceDesc || 'No description available';
            const chapters = info?.chapters || [];
            const inCurrentChapter = chapters.includes(currentChapter);
            const chapterHint = inCurrentChapter ? ' (used in this chapter)' : '';
            const clickable = inCurrentChapter ? 'var-tag-clickable' : '';
            return `<span class="var-tag ${clickable}" data-var="${v}" data-tooltip="${escapeHtml(description)}${chapterHint}">${v}</span>`;
        }).join('');
    };

    varsOnlyA.innerHTML = renderVars(onlyInA);
    varsOnlyB.innerHTML = renderVars(onlyInB);
    if (varsOnlyC) varsOnlyC.innerHTML = renderVars(onlyInC);
    varsShared.innerHTML = renderVars(shared);

    // Add click handlers for variable highlighting
    document.querySelectorAll('.var-tag-clickable').forEach(tag => {
        tag.addEventListener('click', () => {
            const varName = tag.dataset.var;
            highlightVariableText(varName);
        });
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/"/g, '&quot;');
}

// Track the currently highlighted variable for source viewing
let currentHighlightedVar = null;

function highlightVariableText(varName) {
    // Clear any existing variable highlights and source buttons
    document.querySelectorAll('.var-highlight').forEach(el => {
        el.classList.remove('var-highlight');
    });
    document.querySelectorAll('.var-source-btn').forEach(el => {
        el.remove();
    });
    closeVariableSourcePanel();

    if (!variableInfo || !variableInfo[varName]) {
        showNotification(`No pattern info available for variable "${varName}"`, 'info');
        return;
    }

    const info = variableInfo[varName];
    const patterns = info.patterns?.[currentChapter] || [];

    if (patterns.length === 0) {
        showNotification(`Variable "${varName}" has no text patterns in this chapter`, 'info');
        return;
    }

    currentHighlightedVar = varName;

    // Find paragraphs that contain any of the patterns
    // Match all paragraph types across different view modes:
    // - p elements in unified/side-by-side/diff views
    // - .comparison-paragraph in comparison view
    // - .source-paragraph in source view
    const container = document.getElementById('comparison-display');
    if (!container) {
        showNotification('Could not find comparison display', 'error');
        return;
    }
    const paragraphs = container.querySelectorAll('p, .comparison-paragraph, .source-paragraph');
    let matchCount = 0;
    let firstMatch = null;

    paragraphs.forEach(para => {
        const text = para.textContent || '';
        const hasMatch = patterns.some(pattern => {
            // Clean up pattern and check if paragraph contains it
            const cleanPattern = pattern.replace(/\s+/g, ' ').trim();
            const cleanText = text.replace(/\s+/g, ' ');
            // Use substring matching (patterns may be truncated)
            return cleanText.includes(cleanPattern.substring(0, 50));
        });

        if (hasMatch) {
            para.classList.add('var-highlight');
            matchCount++;
            if (!firstMatch) firstMatch = para;

            // Add a "View Source" button to the highlighted paragraph
            addViewSourceButton(para, varName);
        }
    });

    if (matchCount > 0) {
        showNotification(`Highlighted ${matchCount} paragraph${matchCount > 1 ? 's' : ''} affected by "${varName}" - click the code icon to view source`, 'success');
        if (firstMatch) {
            firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    } else {
        showNotification(`Could not find text matching "${varName}" patterns in this chapter`, 'info');
    }
}

function addViewSourceButton(paragraph, varName) {
    // Make the paragraph position relative if not already
    const currentPosition = window.getComputedStyle(paragraph).position;
    if (currentPosition === 'static') {
        paragraph.style.position = 'relative';
    }

    const btn = document.createElement('button');
    btn.className = 'var-source-btn';
    btn.innerHTML = '<i data-lucide="file-code"></i>';
    btn.title = `View Quant source for @${varName}`;
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        showVariableSourcePanel(varName, paragraph);
    });
    paragraph.appendChild(btn);

    // Initialize the Lucide icon
    if (typeof lucide !== 'undefined') {
        lucide.createIcons({ nodes: [btn] });
    }
}

function findVariableSourceSnippet(varName) {
    // Get the source key for the current chapter
    const sourceKey = SOURCE_KEY_BY_CHAPTER[currentChapter];
    if (!sourceKey || !originSources || !originSources.chapters[sourceKey]) {
        return null;
    }

    const sourceContent = originSources.chapters[sourceKey].content;
    if (!sourceContent) return null;

    // Find lines containing the variable conditional
    const lines = sourceContent.split('\n');
    const snippets = [];

    // Pattern to match variable conditionals: [@varname> or [^@varname> or [*tag*@varname>
    const varPattern = new RegExp(`\\[(?:\\*\\w+\\*)?[\\^]?@${varName}>`, 'i');

    for (let i = 0; i < lines.length; i++) {
        if (varPattern.test(lines[i])) {
            // Get context: 1 line before and 2 lines after
            const start = Math.max(0, i - 1);
            const end = Math.min(lines.length, i + 3);
            const snippet = lines.slice(start, end).join('\n');
            snippets.push({
                lineNumber: i + 1,
                snippet: snippet
            });
        }
    }

    // Also check globals.txt for macro definitions that use this variable
    if (originSources.chapters['globals']) {
        const globalsContent = originSources.chapters['globals'].content;
        const globalsLines = globalsContent.split('\n');

        for (let i = 0; i < globalsLines.length; i++) {
            const line = globalsLines[i];
            // Check for MACRO definitions containing this variable
            if (line.includes('[MACRO') && line.includes(`@${varName}`)) {
                snippets.push({
                    lineNumber: i + 1,
                    snippet: line,
                    isGlobal: true
                });
            }
            // Check for DEFINE statements with this variable
            if (line.includes('[DEFINE') && line.includes(`@${varName}`)) {
                // Get preceding comment for context
                let contextStart = i;
                while (contextStart > 0 && globalsLines[contextStart - 1].startsWith('#')) {
                    contextStart--;
                }
                const snippet = globalsLines.slice(contextStart, i + 1).join('\n');
                snippets.push({
                    lineNumber: contextStart + 1,
                    snippet: snippet,
                    isGlobal: true,
                    isDefinition: true
                });
            }
        }
    }

    return snippets.length > 0 ? snippets : null;
}

function showVariableSourcePanel(varName, anchorElement) {
    closeVariableSourcePanel();

    const snippets = findVariableSourceSnippet(varName);
    if (!snippets || snippets.length === 0) {
        showNotification(`No source found for @${varName} in this chapter`, 'info');
        return;
    }

    const panel = document.createElement('div');
    panel.className = 'var-source-panel';
    panel.id = 'var-source-panel';

    // Build the content
    let html = `
        <div class="var-source-header">
            <span class="var-source-title">Source: <code>@${varName}</code></span>
            <button class="var-source-close" title="Close">&times;</button>
        </div>
        <div class="var-source-body">
    `;

    // Group snippets by source file
    const globalSnippets = snippets.filter(s => s.isGlobal);
    const chapterSnippets = snippets.filter(s => !s.isGlobal);

    if (globalSnippets.length > 0) {
        const defSnippets = globalSnippets.filter(s => s.isDefinition);
        const macroSnippets = globalSnippets.filter(s => !s.isDefinition);

        if (defSnippets.length > 0) {
            html += `<div class="var-source-section"><span class="var-source-label">Definition (globals.txt):</span>`;
            defSnippets.forEach(s => {
                // highlightQuantSyntax handles escaping internally
                html += `<pre class="var-source-code">${highlightQuantSyntax(s.snippet)}</pre>`;
            });
            html += `</div>`;
        }

        if (macroSnippets.length > 0) {
            html += `<div class="var-source-section"><span class="var-source-label">Macro usage (globals.txt):</span>`;
            macroSnippets.forEach(s => {
                html += `<pre class="var-source-code">${highlightQuantSyntax(s.snippet)}</pre>`;
            });
            html += `</div>`;
        }
    }

    if (chapterSnippets.length > 0) {
        const sourceKey = SOURCE_KEY_BY_CHAPTER[currentChapter];
        html += `<div class="var-source-section"><span class="var-source-label">Chapter source (${sourceKey}.txt):</span>`;
        chapterSnippets.forEach(s => {
            html += `<pre class="var-source-code">${highlightQuantSyntax(s.snippet)}</pre>`;
        });
        html += `</div>`;
    }

    html += `</div>`;
    panel.innerHTML = html;

    // Position the panel near the anchor element
    document.body.appendChild(panel);

    const closeBtn = panel.querySelector('.var-source-close');
    closeBtn.addEventListener('click', closeVariableSourcePanel);

    // Position panel below the anchor
    const rect = anchorElement.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();

    let top = rect.bottom + window.scrollY + 10;
    let left = rect.left + window.scrollX;

    // Keep panel within viewport
    if (left + panelRect.width > window.innerWidth - 20) {
        left = window.innerWidth - panelRect.width - 20;
    }
    if (left < 20) left = 20;

    panel.style.top = `${top}px`;
    panel.style.left = `${left}px`;

    // Close when clicking outside
    setTimeout(() => {
        document.addEventListener('click', handleSourcePanelOutsideClick);
    }, 100);
}

function handleSourcePanelOutsideClick(e) {
    const panel = document.getElementById('var-source-panel');
    if (panel && !panel.contains(e.target) && !e.target.classList.contains('var-source-btn')) {
        closeVariableSourcePanel();
    }
}

function closeVariableSourcePanel() {
    const panel = document.getElementById('var-source-panel');
    if (panel) {
        panel.remove();
    }
    document.removeEventListener('click', handleSourcePanelOutsideClick);
}

function toggleVariablePanel() {
    const panel = document.getElementById('variable-diff-panel');
    const btn = document.getElementById('show-vars-btn');
    // Close chapter vars panel when opening global vars
    const chapterPanel = document.getElementById('chapter-vars-panel');
    const chapterBtn = document.getElementById('show-chapter-vars-btn');

    if (!panel) return;

    const isHidden = panel.classList.contains('hidden');
    panel.classList.toggle('hidden', !isHidden);

    if (btn) {
        btn.classList.toggle('active', isHidden);
    }

    // Close the other panel if we're opening this one
    if (isHidden && chapterPanel && !chapterPanel.classList.contains('hidden')) {
        chapterPanel.classList.add('hidden');
        if (chapterBtn) chapterBtn.classList.remove('active');
    }

    if (isHidden) {
        updateVariableDiff();
    }
}

function initializeVariablePanel() {
    const btn = document.getElementById('show-vars-btn');
    if (btn) {
        btn.addEventListener('click', toggleVariablePanel);
    }
}

// Chapter Variables Panel
function toggleChapterVariablesPanel() {
    const panel = document.getElementById('chapter-vars-panel');
    const btn = document.getElementById('show-chapter-vars-btn');
    // Close global vars panel when opening chapter vars
    const globalPanel = document.getElementById('variable-diff-panel');
    const globalBtn = document.getElementById('show-vars-btn');

    if (!panel) return;

    const isHidden = panel.classList.contains('hidden');
    panel.classList.toggle('hidden', !isHidden);

    if (btn) {
        btn.classList.toggle('active', isHidden);
    }

    // Close the other panel if we're opening this one
    if (isHidden && globalPanel && !globalPanel.classList.contains('hidden')) {
        globalPanel.classList.add('hidden');
        if (globalBtn) globalBtn.classList.remove('active');
    }

    if (isHidden) {
        updateChapterVariablesPanel();
    }
}

function extractChapterVariablePatterns(varName) {
    // Get the source for the current chapter
    const sourceKey = SOURCE_KEY_BY_CHAPTER[currentChapter];
    if (!sourceKey || !originSources || !originSources.chapters[sourceKey]) {
        return { activePatterns: [], inactivePatterns: [] };
    }

    const sourceContent = originSources.chapters[sourceKey].content;
    if (!sourceContent) return { activePatterns: [], inactivePatterns: [] };

    const activePatterns = [];
    const inactivePatterns = [];

    // Match conditional blocks: [@varname>active text|inactive text] or [@varname>active text]
    // Also handles: [^@varname>text...], [*tag*@varname>text...]
    const varPattern = new RegExp(
        `\\[(?:\\*\\w+\\*)?@${varName}>([^\\[\\]]+?)(?:\\|([^\\[\\]]+?))?\\]`,
        'g'
    );

    let match;
    while ((match = varPattern.exec(sourceContent)) !== null) {
        const activeText = match[1] ? match[1].trim() : '';
        const inactiveText = match[2] ? match[2].trim() : '';

        // Clean up Quant markup
        const cleanText = (text) => {
            return text
                .replace(/\{i\/([^}]+)\}/g, '$1')  // {i/text} -> text
                .replace(/\{[^}]+\}/g, '')          // Remove other macros
                .replace(/\s+/g, ' ')
                .trim();
        };

        const cleanActive = cleanText(activeText);
        const cleanInactive = cleanText(inactiveText);

        if (cleanActive.length >= 8) {
            activePatterns.push(cleanActive.substring(0, 80));
        }
        if (cleanInactive.length >= 8) {
            inactivePatterns.push(cleanInactive.substring(0, 80));
        }
    }

    return { activePatterns, inactivePatterns };
}

function detectChapterVariableInText(varName, chapterText) {
    const { activePatterns, inactivePatterns } = extractChapterVariablePatterns(varName);

    if (activePatterns.length === 0 && inactivePatterns.length === 0) {
        return 'unknown';
    }

    const textNormalized = chapterText.replace(/\s+/g, ' ');

    // Check for active patterns
    const hasActivePattern = activePatterns.some(pattern => {
        const patternNormalized = pattern.replace(/\s+/g, ' ');
        return textNormalized.includes(patternNormalized);
    });

    // Check for inactive patterns
    const hasInactivePattern = inactivePatterns.some(pattern => {
        const patternNormalized = pattern.replace(/\s+/g, ' ');
        return textNormalized.includes(patternNormalized);
    });

    if (hasActivePattern && !hasInactivePattern) return 'active';
    if (hasInactivePattern && !hasActivePattern) return 'inactive';
    if (hasActivePattern && hasInactivePattern) return 'both'; // Shouldn't happen normally
    return 'unknown';
}

function updateChapterVariablesPanel() {
    const content = document.getElementById('chapter-vars-content');
    if (!content) return;

    if (!chapterVariables || !currentChapter || !chapterVariables[currentChapter]) {
        content.innerHTML = '<span class="var-list-empty">No chapter-local variables defined in this chapter</span>';
        return;
    }

    const vars = chapterVariables[currentChapter];

    // Get chapter text for each version
    const chapterDataA = getChapterContent(versionA, currentChapter);
    const chapterDataB = getChapterContent(versionB, currentChapter);
    const chapterDataC = versionC ? getChapterContent(versionC, currentChapter) : null;

    const textA = (chapterDataA.paragraphs || []).join(' ');
    const textB = (chapterDataB.paragraphs || []).join(' ');
    const textC = chapterDataC ? (chapterDataC.paragraphs || []).join(' ') : '';

    // Collect all chapter variable names and detect which are active in each version
    const allVarNames = [];
    vars.forEach(def => {
        def.variables.forEach(v => allVarNames.push(v));
    });

    const varsInA = new Set();
    const varsInB = new Set();
    const varsInC = new Set();

    allVarNames.forEach(varName => {
        const statusA = detectChapterVariableInText(varName, textA);
        const statusB = detectChapterVariableInText(varName, textB);

        if (statusA === 'active') varsInA.add(varName);
        if (statusB === 'active') varsInB.add(varName);

        if (versionC && textC) {
            const statusC = detectChapterVariableInText(varName, textC);
            if (statusC === 'active') varsInC.add(varName);
        }
    });

    // Calculate differences
    let onlyInA, onlyInB, onlyInC, shared;

    if (versionC) {
        onlyInA = [...varsInA].filter(v => !varsInB.has(v) && !varsInC.has(v)).sort();
        onlyInB = [...varsInB].filter(v => !varsInA.has(v) && !varsInC.has(v)).sort();
        onlyInC = [...varsInC].filter(v => !varsInA.has(v) && !varsInB.has(v)).sort();
        shared = [...varsInA].filter(v => varsInB.has(v) && varsInC.has(v)).sort();
    } else {
        onlyInA = [...varsInA].filter(v => !varsInB.has(v)).sort();
        onlyInB = [...varsInB].filter(v => !varsInA.has(v)).sort();
        onlyInC = [];
        shared = [...varsInA].filter(v => varsInB.has(v)).sort();
    }

    // Find variables that couldn't be detected in either version
    const detected = new Set([...varsInA, ...varsInB, ...varsInC]);
    const undetected = allVarNames.filter(v => !detected.has(v)).sort();

    // Render function
    const renderVars = (varNames, clickable = true) => {
        if (varNames.length === 0) return '<span class="var-list-empty">none</span>';
        return varNames.map(v => {
            // Find the definition for this variable to get description
            let description = '';
            for (const def of vars) {
                if (def.variables.includes(v)) {
                    description = def.description || '';
                    break;
                }
            }
            const clickClass = clickable ? 'clickable' : '';
            const tooltip = description ? `title="${escapeHtml(description)}"` : `title="Click to highlight"`;
            return `<span class="chapter-var-tag ${clickClass}" data-varname="${v}" ${tooltip}>@${v}</span>`;
        }).join('');
    };

    // Column-based layout to align with comparison view
    let html = `<div class="chapter-vars-columns ${versionC ? 'three-col' : 'two-col'}">`;

    // Column A
    html += `
        <div class="chapter-vars-column var-list-a">
            <div class="chapter-vars-column-header">${versionA || 'A'}</div>
            <div class="chapter-vars-column-content">${renderVars(onlyInA)}</div>
        </div>
    `;

    // Column B
    html += `
        <div class="chapter-vars-column var-list-b">
            <div class="chapter-vars-column-header">${versionB || 'B'}</div>
            <div class="chapter-vars-column-content">${renderVars(onlyInB)}</div>
        </div>
    `;

    // Column C (if three-version mode)
    if (versionC) {
        html += `
            <div class="chapter-vars-column var-list-c">
                <div class="chapter-vars-column-header">${versionC}</div>
                <div class="chapter-vars-column-content">${renderVars(onlyInC)}</div>
            </div>
        `;
    }

    html += `</div>`; // Close columns container

    // Shared row (spans full width)
    html += `
        <div class="chapter-var-section chapter-vars-shared">
            <span class="chapter-var-section-label">${versionC ? 'In all:' : 'Shared:'}</span>
            <span class="chapter-var-section-content var-list-shared">${renderVars(shared)}</span>
        </div>
    `;

    if (undetected.length > 0) {
        html += `
            <div class="chapter-var-section undetected">
                <span class="chapter-var-section-label">Undetected:</span>
                <span class="chapter-var-section-content var-list-undetected">${renderVars(undetected, false)}</span>
            </div>
        `;
    }

    content.innerHTML = html;

    // Add click handlers to variable tags
    content.querySelectorAll('.chapter-var-tag.clickable').forEach(tag => {
        tag.addEventListener('click', () => {
            const varName = tag.dataset.varname;
            highlightChapterVariableText(varName);
        });
    });
}

function initializeChapterVariablesPanel() {
    const btn = document.getElementById('show-chapter-vars-btn');
    if (btn) {
        btn.addEventListener('click', toggleChapterVariablesPanel);
    }
}

function highlightChapterVariableText(varName) {
    // Clear any existing variable highlights and source buttons
    document.querySelectorAll('.var-highlight').forEach(el => {
        el.classList.remove('var-highlight');
    });
    document.querySelectorAll('.var-source-btn').forEach(el => {
        el.remove();
    });
    closeVariableSourcePanel();

    // Use the shared pattern extraction function
    const { activePatterns, inactivePatterns } = extractChapterVariablePatterns(varName);

    // Combine all patterns (both active and inactive text will help us find the right paragraphs)
    const patterns = [...activePatterns, ...inactivePatterns];

    if (patterns.length === 0) {
        showNotification(`Variable "@${varName}" has no text patterns in this chapter`, 'info');
        return;
    }

    currentHighlightedVar = varName;

    // Helper to check if text matches any pattern
    const matchesPattern = (text) => {
        const cleanText = (text || '').replace(/\s+/g, ' ');
        return patterns.some(pattern => {
            const cleanPattern = pattern.replace(/\s+/g, ' ').trim();
            return cleanText.includes(cleanPattern.substring(0, 50));
        });
    };

    // Get original paragraph data for each version
    const chapterDataA = getChapterContent(versionA, currentChapter);
    const chapterDataB = getChapterContent(versionB, currentChapter);
    const chapterDataC = versionC ? getChapterContent(versionC, currentChapter) : null;

    const paragraphsA = chapterDataA.paragraphs || [];
    const paragraphsB = chapterDataB.paragraphs || [];
    const paragraphsC = chapterDataC ? (chapterDataC.paragraphs || []) : [];

    // Find matching paragraph indices in original data
    const matchingIndicesA = new Set();
    const matchingIndicesB = new Set();
    const matchingIndicesC = new Set();

    paragraphsA.forEach((text, idx) => {
        if (matchesPattern(text)) matchingIndicesA.add(idx);
    });
    paragraphsB.forEach((text, idx) => {
        if (matchesPattern(text)) matchingIndicesB.add(idx);
    });
    paragraphsC.forEach((text, idx) => {
        if (matchesPattern(text)) matchingIndicesC.add(idx);
    });

    const container = document.getElementById('comparison-display');
    if (!container) {
        showNotification('Could not find comparison display', 'error');
        return;
    }

    let matchCount = 0;
    let firstMatch = null;

    if (currentMode === 'sidebyside' || currentMode === 'unified') {
        // In side-by-side and unified, paragraphs have data-version-id and data-paragraph-index
        const domParagraphs = container.querySelectorAll('p[data-paragraph-index], .source-paragraph[data-paragraph-index]');
        domParagraphs.forEach(para => {
            const idx = parseInt(para.dataset.paragraphIndex, 10);
            const version = para.dataset.versionId;

            let matches = false;
            if (version === versionA && matchingIndicesA.has(idx)) matches = true;
            if (version === versionB && matchingIndicesB.has(idx)) matches = true;
            if (version === versionC && matchingIndicesC.has(idx)) matches = true;

            if (matches) {
                para.classList.add('var-highlight');
                matchCount++;
                if (!firstMatch) firstMatch = para;
                addViewSourceButton(para, varName);
            }
        });
    } else if (currentMode === 'diff') {
        // In diff view, paragraph index is the alignment index
        // We need to map alignment indices to original paragraph indices
        const alignments = versionC
            ? alignThreeParagraphs(paragraphsA, paragraphsB, paragraphsC)
            : alignParagraphs(paragraphsA, paragraphsB);

        const domParagraphs = container.querySelectorAll('.diff-view p[data-paragraph-index]');
        domParagraphs.forEach(para => {
            const alignIdx = parseInt(para.dataset.paragraphIndex, 10);
            const alignment = alignments[alignIdx];
            if (!alignment) return;

            let matches = false;
            // Check if any of the aligned original paragraphs match
            if (alignment.indexA !== null && matchingIndicesA.has(alignment.indexA)) matches = true;
            if (alignment.indexB !== null && matchingIndicesB.has(alignment.indexB)) matches = true;
            if (alignment.indexC !== undefined && alignment.indexC !== null && matchingIndicesC.has(alignment.indexC)) matches = true;

            if (matches) {
                para.classList.add('var-highlight');
                matchCount++;
                if (!firstMatch) firstMatch = para;
                addViewSourceButton(para, varName);
            }
        });
    } else if (currentMode === 'comparison') {
        // In collation view, each alignment row has 2 or 3 .comparison-paragraph elements
        const alignments = versionC
            ? alignThreeParagraphs(paragraphsA, paragraphsB, paragraphsC)
            : alignParagraphs(paragraphsA, paragraphsB);

        const domParagraphs = container.querySelectorAll('.comparison-paragraph[data-paragraph-index]');
        const numVersions = versionC ? 3 : 2;

        domParagraphs.forEach((para, domIdx) => {
            const rowIndex = parseInt(para.dataset.paragraphIndex, 10);
            const versionInRow = domIdx % numVersions; // 0 = A, 1 = B, 2 = C
            const alignment = alignments[rowIndex];
            if (!alignment) return;

            let matches = false;
            if (versionInRow === 0 && alignment.indexA !== null && matchingIndicesA.has(alignment.indexA)) matches = true;
            if (versionInRow === 1 && alignment.indexB !== null && matchingIndicesB.has(alignment.indexB)) matches = true;
            if (versionInRow === 2 && alignment.indexC !== undefined && alignment.indexC !== null && matchingIndicesC.has(alignment.indexC)) matches = true;

            if (matches) {
                para.classList.add('var-highlight');
                matchCount++;
                if (!firstMatch) firstMatch = para;
                addViewSourceButton(para, varName);
            }
        });
    }

    if (matchCount > 0) {
        showNotification(`Highlighted ${matchCount} paragraph${matchCount > 1 ? 's' : ''} affected by "@${varName}" - click the code icon to view source`, 'success');
        // Scroll to first match
        if (firstMatch) {
            firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    } else {
        showNotification(`No paragraphs found matching patterns for "@${varName}"`, 'info');
    }
}

function updateChapterVariablesPanelIfVisible() {
    const panel = document.getElementById('chapter-vars-panel');
    if (panel && !panel.classList.contains('hidden')) {
        updateChapterVariablesPanel();
    }
}

function buildChapterNavigation() {
    const nav = document.getElementById('chapter-nav');
    nav.innerHTML = '';

    // Get chapters from both selected versions (to show all available chapters)
    const chaptersSet = new Set();

    getChaptersForVersion(versionA).forEach(chapterId => chaptersSet.add(chapterId));
    getChaptersForVersion(versionB).forEach(chapterId => chaptersSet.add(chapterId));

    // Convert to array and sort in a logical order
    // Exclude: epilogue, alternatescene, backers, aboutauthor, aboutcopy (per user request)
    // chapter18 is the Epilogue
    const chapterOrder = ['prologue',
                         'chapter1', 'chapter2', 'chapter3', 'chapter4', 'chapter5',
                         'chapter6', 'chapter7', 'chapter8', 'chapter9',
                         'part2', 'chapter10', 'chapter11', 'chapter12', 'chapter13',
                         'chapter14', 'chapter15',
                         'part3', 'chapter16', 'chapter17', 'chapter18',
                         'notes'];

    const chapters = chapterOrder.filter(ch => chaptersSet.has(ch));

    if (chapters.length > 0 && !chapters.includes(currentChapter)) {
        currentChapter = chapters[0];
    }

    chapters.forEach(chapterId => {
        const button = document.createElement('button');
        button.className = 'nav-btn';
        button.setAttribute('data-chapter', chapterId);
        if (chapterId === currentChapter) {
            button.classList.add('active');
        }

        // Format button text
        let buttonText;
        if (chapterId === 'introduction') {
            buttonText = 'Intro';
        } else if (chapterId === 'prologue') {
            buttonText = 'Part 1';
        } else if (chapterId === 'part2') {
            buttonText = 'Part 2';
        } else if (chapterId === 'part3') {
            buttonText = 'Part 3';
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
            updateVariableDiffIfVisible();
            updateChapterVariablesPanelIfVisible();
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
    if (!allVersions || !versionA || !versionB) {
        return;
    }
    if (isSourceCodeVisible() && (currentMode === 'diff' || currentMode === 'comparison')) {
        currentMode = 'sidebyside';
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
        const sideBtn = document.getElementById('mode-sidebyside');
        if (sideBtn) sideBtn.classList.add('active');
    }
    teardownSourceSync();
    updateToolbarVisibility();

    // Clear any search highlights when changing view (but preserve search state)
    const hadActiveSearch = currentSearchTerm !== '';
    const searchTerm = currentSearchTerm;
    clearSearchHighlights(false);

    // Get chapter text from both versions (and optionally third)
    const chapterDataA = getChapterContent(versionA, currentChapter);
    const chapterDataB = getChapterContent(versionB, currentChapter);
    const chapterDataC = versionC ? getChapterContent(versionC, currentChapter) : null;
    const textA = chapterDataA.paragraphs;
    const textB = chapterDataB.paragraphs;

    if (currentMode === 'unified') {
        displayUnified(display, chapterDataA, chapterDataB, chapterDataC);
    } else if (currentMode === 'sidebyside') {
        displaySideBySide(display, chapterDataA, chapterDataB, chapterDataC);
    } else if (currentMode === 'diff') {
        displayDiff(display, chapterDataA, chapterDataB, chapterDataC);
    } else if (currentMode === 'comparison') {
        displayParagraphComparison(display, chapterDataA, chapterDataB, chapterDataC);
    }

    // Re-apply search highlights if there was an active search
    if (hadActiveSearch && searchTerm) {
        setTimeout(() => {
            highlightSearchMatches(searchTerm);
        }, 0);
    }

    if (pendingBookmarkScroll !== null) {
        const targetScroll = pendingBookmarkScroll;
        pendingBookmarkScroll = null;
        requestAnimationFrame(() => {
            window.scrollTo({
                top: typeof targetScroll === 'number' ? targetScroll : 0,
                behavior: 'auto'
            });
        });
    }

    if (originSourcePanelOpen && originSources) {
        syncSourceToCurrentChapter();
    }

    // Mark paragraphs that have annotations
    markAnnotatedParagraphs();
}

function renderParagraphs(container, paragraphs, isSource, versionId) {
    if (!paragraphs || paragraphs.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'empty-note';
        empty.textContent = isSource ? 'Source code not available for this chapter.' : 'No content available for this chapter.';
        container.appendChild(empty);
        return;
    }

    paragraphs.forEach((para, index) => {
        const element = document.createElement(isSource ? 'div' : 'p');
        element.innerHTML = para;
        if (isSource) {
            element.classList.add('source-paragraph');
        }
        element.dataset.versionId = versionId || '';
        element.dataset.paragraphIndex = index;
        container.appendChild(element);
    });
}

function displayUnified(container, dataA, dataB, dataC = null) {
    container.innerHTML = '';
    container.className = '';

    const div = document.createElement('div');
    div.className = 'unified-view';

    // Determine which data to display based on unifiedViewVersion
    let activeData, activeVersion;
    if (dataC) {
        // Three versions - show tabs
        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'unified-tabs';

        const versions = [
            { key: 'A', version: versionA, data: dataA },
            { key: 'B', version: versionB, data: dataB },
            { key: 'C', version: versionC, data: dataC }
        ];

        versions.forEach(({ key, version }) => {
            const tab = document.createElement('button');
            tab.className = `unified-tab ${unifiedViewVersion === key ? 'active' : ''}`;
            tab.textContent = formatVersionLabel(version);
            tab.addEventListener('click', () => {
                unifiedViewVersion = key;
                displayComparison();
            });
            tabsContainer.appendChild(tab);
        });

        div.appendChild(tabsContainer);

        const selected = versions.find(v => v.key === unifiedViewVersion);
        activeData = selected.data;
        activeVersion = selected.version;
    } else {
        // Two versions - use version A by default (original behavior)
        activeData = dataA;
        activeVersion = versionA;
    }

    const { paragraphs, isSource } = activeData;

    const heading = document.createElement('h2');
    heading.textContent = formatVersionLabel(activeVersion);
    div.appendChild(heading);

    renderParagraphs(div, paragraphs, isSource, activeVersion);

    container.appendChild(div);
}

function displaySideBySide(container, dataA, dataB, dataC = null) {
    const { paragraphs: paragraphsA, isSource: isSourceA } = dataA;
    const { paragraphs: paragraphsB, isSource: isSourceB } = dataB;
    container.innerHTML = '';
    container.className = dataC ? 'side-by-side three-column' : 'side-by-side';

    // Version A panel
    const panelA = document.createElement('div');
    panelA.className = 'version-panel';

    const headingA = document.createElement('h2');
    headingA.textContent = formatVersionLabel(versionA);
    panelA.appendChild(headingA);

    renderParagraphs(panelA, paragraphsA, isSourceA, versionA);

    // Version B panel
    const panelB = document.createElement('div');
    panelB.className = 'version-panel';

    const headingB = document.createElement('h2');
    headingB.textContent = formatVersionLabel(versionB);
    panelB.appendChild(headingB);

    renderParagraphs(panelB, paragraphsB, isSourceB, versionB);

    container.appendChild(panelA);
    container.appendChild(panelB);

    // Version C panel (optional)
    if (dataC) {
        const { paragraphs: paragraphsC, isSource: isSourceC } = dataC;
        const panelC = document.createElement('div');
        panelC.className = 'version-panel';

        const headingC = document.createElement('h2');
        headingC.textContent = formatVersionLabel(versionC);
        panelC.appendChild(headingC);

        renderParagraphs(panelC, paragraphsC, isSourceC, versionC);

        container.appendChild(panelC);
    }

    initializeSourceSync({
        panelA,
        panelB,
        dataA,
        dataB
    });
}

function displayDiff(container, dataA, dataB, dataC = null) {
    const paragraphsA = dataA.paragraphs;
    const paragraphsB = dataB.paragraphs;
    const paragraphsC = dataC ? dataC.paragraphs : null;
    container.innerHTML = '';
    container.className = '';

    const div = document.createElement('div');
    div.className = 'diff-view';

    const heading = document.createElement('h2');
    if (dataC) {
        heading.textContent = `Tracking Changes: ${formatVersionLabel(versionA)} as base`;
    } else {
        heading.textContent = `Tracking Changes: ${formatVersionLabel(versionA)} → ${formatVersionLabel(versionB)}`;
    }
    div.appendChild(heading);

    if (dataC) {
        // Three-version track changes: A as base
        displayDiffThreeWay(div, paragraphsA, paragraphsB, paragraphsC);
    } else {
        // Two-version track changes (original behavior)
        displayDiffTwoWay(div, paragraphsA, paragraphsB);
    }

    container.appendChild(div);
}

function displayDiffTwoWay(div, paragraphsA, paragraphsB) {
    const alignments = alignParagraphs(paragraphsA, paragraphsB);

    alignments.forEach((alignment, index) => {
        const { textA, textB, type } = alignment;

        const p = document.createElement('p');
        p.dataset.paragraphIndex = index;

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
    });
}

function displayDiffThreeWay(div, paragraphsA, paragraphsB, paragraphsC) {
    // Use three-way alignment with A as anchor
    const alignments = alignThreeParagraphs(paragraphsA, paragraphsB, paragraphsC);

    // Add legend for three-way diff
    const legend = document.createElement('div');
    legend.className = 'diff-legend';
    legend.innerHTML = `
        <span class="legend-item"><span class="legend-swatch diff-added-b"></span> Only in ${formatVersionLabel(versionB)}</span>
        <span class="legend-item"><span class="legend-swatch diff-added-c"></span> Only in ${formatVersionLabel(versionC)}</span>
        <span class="legend-item"><span class="legend-swatch diff-removed"></span> Removed from ${formatVersionLabel(versionA)}</span>
    `;
    div.appendChild(legend);

    alignments.forEach((alignment, index) => {
        const { textA, textB, textC, type } = alignment;

        const p = document.createElement('p');
        p.dataset.paragraphIndex = index;

        if (type === 'abc-identical') {
            // All three match - show normal paragraph
            p.innerHTML = textA;
        } else if (type === 'unique-a') {
            // Only in A (removed from both B and C)
            p.innerHTML = `<span class="diff-removed">${textA}</span>`;
        } else if (type === 'unique-b') {
            // Only in B (added in B only)
            p.innerHTML = `<span class="diff-added-b">${textB}</span>`;
        } else if (type === 'unique-c') {
            // Only in C (added in C only)
            p.innerHTML = `<span class="diff-added-c">${textC}</span>`;
        } else if (type === 'ab-match') {
            // A and B match, C differs or missing
            if (textC) {
                // C has different text
                p.innerHTML = textA + ` <span class="diff-added-c">[C: ${textC}]</span>`;
            } else {
                // C doesn't have this paragraph
                p.innerHTML = textA;
            }
        } else if (type === 'ac-match') {
            // A and C match, B differs or missing
            if (textB) {
                // B has different text
                p.innerHTML = textA + ` <span class="diff-added-b">[B: ${textB}]</span>`;
            } else {
                // B doesn't have this paragraph
                p.innerHTML = textA;
            }
        } else if (type === 'bc-match') {
            // B and C match, A differs or missing - A is base so show B/C as additions
            if (textA) {
                // Show A as removed, B/C as what remains
                const cleanA = textA.replace(/<\/?(?:em|strong)>/g, '');
                const cleanBC = textB.replace(/<\/?(?:em|strong)>/g, '');
                const diff = Diff.diffWords(cleanA, cleanBC);
                diff.forEach(part => {
                    const span = document.createElement('span');
                    if (part.added) {
                        span.className = 'diff-added';
                        span.innerHTML = part.value;
                    } else if (part.removed) {
                        span.className = 'diff-removed';
                        span.innerHTML = part.value;
                    } else {
                        span.innerHTML = part.value;
                    }
                    p.appendChild(span);
                });
            } else {
                // A doesn't exist, B=C added
                p.innerHTML = `<span class="diff-added">${textB}</span>`;
            }
        } else if (type === 'all-different') {
            // All three differ - show A as base with B and C variants
            p.innerHTML = textA;
            if (textB) {
                const bSpan = document.createElement('span');
                bSpan.className = 'diff-variant-b';
                bSpan.innerHTML = ` [B: ${textB}]`;
                p.appendChild(bSpan);
            }
            if (textC) {
                const cSpan = document.createElement('span');
                cSpan.className = 'diff-variant-c';
                cSpan.innerHTML = ` [C: ${textC}]`;
                p.appendChild(cSpan);
            }
        }

        div.appendChild(p);
    });
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


function formatChapterLabel(chapterId) {
    if (!chapterId) return 'Chapter';
    if (chapterId === 'prologue') return 'Part 1';
    if (chapterId === 'part2') return 'Part 2';
    if (chapterId === 'part3') return 'Part 3';
    if (chapterId === 'chapter18') return 'Epilogue';
    if (chapterId === 'notes') return 'Notes';
    if (chapterId.startsWith('chapter')) {
        return `Ch ${chapterId.replace('chapter', '')}`;
    }
    return chapterId.charAt(0).toUpperCase() + chapterId.slice(1);
}

function formatModeLabel(mode) {
    const labels = {
        unified: 'Unified',
        sidebyside: 'Side-by-side',
        diff: 'Track Changes',
        comparison: 'Collation'
    };
    return labels[mode] || 'View';
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

// Align three sets of paragraphs using pairwise alignment approach
function alignThreeParagraphs(paragraphsA, paragraphsB, paragraphsC) {
    // Step 1: Get pairwise alignments using existing algorithm
    const alignAB = alignParagraphs(paragraphsA, paragraphsB);
    const alignAC = alignParagraphs(paragraphsA, paragraphsC);

    // Step 2: Build A-index maps from pairwise alignments
    const mapAB = new Map(); // indexA -> alignment object from AB
    const mapAC = new Map(); // indexA -> alignment object from AC
    const orphansB = []; // B paragraphs not matched to A
    const orphansC = []; // C paragraphs not matched to A

    alignAB.forEach(align => {
        if (align.indexA !== null) {
            mapAB.set(align.indexA, align);
        } else if (align.indexB !== null) {
            orphansB.push(align);
        }
    });

    alignAC.forEach(align => {
        if (align.indexA !== null) {
            mapAC.set(align.indexA, align);
        } else if (align.indexB !== null) {
            // In alignAC, indexB is actually indexC
            orphansC.push({
                indexC: align.indexB,
                textC: align.textB
            });
        }
    });

    // Step 3: Merge alignments using A as anchor
    const threeWay = [];

    for (let i = 0; i < paragraphsA.length; i++) {
        const ab = mapAB.get(i);
        const ac = mapAC.get(i);

        const textA = paragraphsA[i];
        const textB = ab?.textB ?? null;
        const textC = ac?.textB ?? null; // In alignAC result, textB is actually textC
        const indexB = ab?.indexB ?? null;
        const indexC = ac?.indexB ?? null; // In alignAC result, indexB is actually indexC

        threeWay.push({
            indexA: i,
            indexB: indexB,
            indexC: indexC,
            textA: textA,
            textB: textB,
            textC: textC,
            similarityAB: ab?.similarity ?? 0,
            similarityAC: ac?.similarity ?? 0,
            type: classifyThreeWay(textA, textB, textC)
        });
    }

    // Step 4: Append orphans (unique to B or C, not matched to A)
    orphansB.forEach(orphan => {
        threeWay.push({
            indexA: null,
            indexB: orphan.indexB,
            indexC: null,
            textA: null,
            textB: orphan.textB,
            textC: null,
            similarityAB: 0,
            similarityAC: 0,
            type: 'unique-b'
        });
    });

    orphansC.forEach(orphan => {
        threeWay.push({
            indexA: null,
            indexB: null,
            indexC: orphan.indexC,
            textA: null,
            textB: null,
            textC: orphan.textC,
            similarityAB: 0,
            similarityAC: 0,
            type: 'unique-c'
        });
    });

    return threeWay;
}

// Classify alignment type for three-way comparison
function classifyThreeWay(textA, textB, textC) {
    const normA = textA ? normalizeText(textA) : null;
    const normB = textB ? normalizeText(textB) : null;
    const normC = textC ? normalizeText(textC) : null;

    // All three present and match
    if (normA && normB && normC && normA === normB && normA === normC) {
        return 'abc-identical';
    }

    // A and B match, C differs or missing
    if (normA && normB && normA === normB && normA !== normC) {
        return 'ab-match';
    }

    // A and C match, B differs or missing
    if (normA && normC && normA === normC && normA !== normB) {
        return 'ac-match';
    }

    // B and C match, A differs
    if (normB && normC && normB === normC && normA !== normB) {
        return 'bc-match';
    }

    // Only in A (B and C both null/empty)
    if (normA && !normB && !normC) {
        return 'unique-a';
    }

    // Only in B (handled above in orphans, but just in case)
    if (!normA && normB && !normC) {
        return 'unique-b';
    }

    // Only in C (handled above in orphans, but just in case)
    if (!normA && !normB && normC) {
        return 'unique-c';
    }

    // All three different (or various partial combinations)
    return 'all-different';
}

function displayParagraphComparison(container, dataA, dataB, dataC = null) {
    const paragraphsA = dataA.paragraphs;
    const paragraphsB = dataB.paragraphs;
    const paragraphsC = dataC ? dataC.paragraphs : null;
    container.innerHTML = '';
    container.className = '';

    const div = document.createElement('div');
    div.className = 'comparison-view';

    const heading = document.createElement('h2');
    if (dataC) {
        heading.textContent = `Collation: ${formatVersionLabel(versionA)} vs ${formatVersionLabel(versionB)} vs ${formatVersionLabel(versionC)}`;
    } else {
        heading.textContent = `Collation: ${formatVersionLabel(versionA)} vs ${formatVersionLabel(versionB)}`;
    }
    div.appendChild(heading);

    if (dataC) {
        // Three-version collation
        displayParagraphComparisonThreeWay(div, paragraphsA, paragraphsB, paragraphsC);
    } else {
        // Two-version collation
        displayParagraphComparisonTwoWay(div, paragraphsA, paragraphsB);
    }

    container.appendChild(div);
}

function displayParagraphComparisonTwoWay(div, paragraphsA, paragraphsB) {
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
            <span>Unique to ${formatVersionLabel(versionA)}</span>
        </div>
        <div class="legend-item">
            <div class="legend-color unique-b"></div>
            <span>Unique to ${formatVersionLabel(versionB)}</span>
        </div>
    `;
    div.appendChild(legend);

    // Use alignment algorithm to match paragraphs intelligently
    const alignments = alignParagraphs(paragraphsA, paragraphsB);

    // Create grid for paragraphs
    const grid = document.createElement('div');
    grid.className = 'comparison-grid';

    alignments.forEach((alignment, rowIndex) => {
        const { indexA, indexB, textA, textB, similarity, type } = alignment;

        // Create paragraph A (or placeholder)
        const divA = document.createElement('div');
        divA.dataset.paragraphIndex = rowIndex;
        if (textA) {
            divA.className = `comparison-paragraph ${type === 'unique-b' ? 'placeholder' : type}`;

            if (type !== 'unique-b') {
                const numberA = document.createElement('div');
                numberA.className = 'comparison-paragraph-number';
                numberA.textContent = `${formatVersionLabel(versionA)} [${indexA + 1}]`;
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
        divB.dataset.paragraphIndex = rowIndex;
        if (textB) {
            divB.className = `comparison-paragraph ${type === 'unique-a' ? 'placeholder' : type}`;

            if (type !== 'unique-a') {
                const numberB = document.createElement('div');
                numberB.className = 'comparison-paragraph-number';
                numberB.textContent = `${formatVersionLabel(versionB)} [${indexB + 1}]`;
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
    });

    div.appendChild(grid);
}

function displayParagraphComparisonThreeWay(div, paragraphsA, paragraphsB, paragraphsC) {
    // Add legend for three-way comparison
    const legend = document.createElement('div');
    legend.className = 'comparison-legend three-way';
    legend.innerHTML = `
        <div class="legend-item">
            <div class="legend-color abc-identical"></div>
            <span>All identical</span>
        </div>
        <div class="legend-item">
            <div class="legend-color ab-match"></div>
            <span>A = B</span>
        </div>
        <div class="legend-item">
            <div class="legend-color ac-match"></div>
            <span>A = C</span>
        </div>
        <div class="legend-item">
            <div class="legend-color bc-match"></div>
            <span>B = C</span>
        </div>
        <div class="legend-item">
            <div class="legend-color unique-a"></div>
            <span>Only A</span>
        </div>
        <div class="legend-item">
            <div class="legend-color unique-b"></div>
            <span>Only B</span>
        </div>
        <div class="legend-item">
            <div class="legend-color unique-c"></div>
            <span>Only C</span>
        </div>
        <div class="legend-item">
            <div class="legend-color all-different"></div>
            <span>All differ</span>
        </div>
    `;
    div.appendChild(legend);

    // Use three-way alignment
    const alignments = alignThreeParagraphs(paragraphsA, paragraphsB, paragraphsC);

    // Create grid for paragraphs (3 columns)
    const grid = document.createElement('div');
    grid.className = 'comparison-grid three-column';

    alignments.forEach((alignment, rowIndex) => {
        const { indexA, indexB, indexC, textA, textB, textC, type } = alignment;

        // Determine placeholder states
        const aIsPlaceholder = !textA;
        const bIsPlaceholder = !textB;
        const cIsPlaceholder = !textC;

        // Create paragraph A
        const divA = createCollationCell(textA, indexA, versionA, type, aIsPlaceholder, rowIndex);

        // Create paragraph B
        const divB = createCollationCell(textB, indexB, versionB, type, bIsPlaceholder, rowIndex);

        // Create paragraph C
        const divC = createCollationCell(textC, indexC, versionC, type, cIsPlaceholder, rowIndex);

        grid.appendChild(divA);
        grid.appendChild(divB);
        grid.appendChild(divC);
    });

    div.appendChild(grid);
}

function createCollationCell(text, index, version, type, isPlaceholder, rowIndex) {
    const cell = document.createElement('div');
    cell.dataset.paragraphIndex = rowIndex;

    if (isPlaceholder) {
        cell.className = 'comparison-paragraph placeholder';
        cell.textContent = '—';
    } else {
        cell.className = `comparison-paragraph ${type}`;

        const numberDiv = document.createElement('div');
        numberDiv.className = 'comparison-paragraph-number';
        numberDiv.textContent = `${formatVersionLabel(version)} [${index + 1}]`;
        cell.appendChild(numberDiv);

        const contentDiv = document.createElement('div');
        contentDiv.innerHTML = text;
        cell.appendChild(contentDiv);
    }

    return cell;
}

function teardownSourceSync() {
    if (!sourceSyncState) return;
    window.removeEventListener('scroll', sourceSyncState.onScroll);
    if (sourceSyncState.sourcePanel) {
        sourceSyncState.sourcePanel.classList.remove('source-column');
        if (sourceSyncState.onSourceClick) {
            sourceSyncState.sourcePanel.removeEventListener('click', sourceSyncState.onSourceClick);
        }
    }
    if (sourceSyncState.seedPanel && sourceSyncState.onSeedClick) {
        sourceSyncState.seedPanel.removeEventListener('click', sourceSyncState.onSeedClick);
    }
    if (sourceSyncState.activeSourceEl) {
        sourceSyncState.activeSourceEl.classList.remove('active-source-snippet');
    }
    sourceSyncState = null;
}

function calculatePlainSimilarity(textA, textB) {
    if (!textA || !textB) return 0;
    if (textA === textB) return 1;
    const wordsA = new Set(textA.split(/\s+/).filter(Boolean));
    const wordsB = new Set(textB.split(/\s+/).filter(Boolean));
    if (wordsA.size === 0 || wordsB.size === 0) return 0;
    const intersection = new Set([...wordsA].filter(word => wordsB.has(word)));
    const union = new Set([...wordsA, ...wordsB]);
    return intersection.size / union.size;
}

function buildSourceMapping(seedTexts, sourceTexts) {
    const seedToSource = new Map();
    const sourceToSeed = new Map();
    for (let i = 0; i < seedTexts.length; i++) {
        const seedText = seedTexts[i];
        if (!seedText) continue;
        let bestIndex = -1;
        let bestScore = 0.35;
        for (let j = 0; j < sourceTexts.length; j++) {
            const sourceText = sourceTexts[j];
            if (!sourceText) continue;
            let score = 0;
            if (sourceText.includes(seedText)) {
                score = seedText.length / sourceText.length;
            } else if (seedText.includes(sourceText)) {
                score = sourceText.length / seedText.length;
            } else {
                score = calculatePlainSimilarity(seedText, sourceText);
            }
            if (score > bestScore) {
                bestScore = score;
                bestIndex = j;
            }
        }
        if (bestIndex !== -1) {
            seedToSource.set(i, bestIndex);
            if (!sourceToSeed.has(bestIndex)) {
                sourceToSeed.set(bestIndex, i);
            }
        }
    }

    const pairs = Array.from(seedToSource.entries()).map(([seedIndex, sourceIndex]) => ({
        seedIndex,
        sourceIndex
    })).sort((a, b) => a.sourceIndex - b.sourceIndex);
    const pairsBySeed = [...pairs].sort((a, b) => a.seedIndex - b.seedIndex);

    const getClosestSeedForSource = (sourceIndex) => {
        if (pairs.length === 0) return null;
        let closest = pairs[0];
        let minDiff = Math.abs(sourceIndex - closest.sourceIndex);
        for (let i = 1; i < pairs.length; i++) {
            const diff = Math.abs(sourceIndex - pairs[i].sourceIndex);
            if (diff < minDiff) {
                minDiff = diff;
                closest = pairs[i];
            }
        }
        return closest ? closest.seedIndex : null;
    };

    const getClosestSourceForSeed = (seedIndex) => {
        if (pairsBySeed.length === 0) return null;
        let closest = pairsBySeed[0];
        let minDiff = Math.abs(seedIndex - closest.seedIndex);
        for (let i = 1; i < pairsBySeed.length; i++) {
            const diff = Math.abs(seedIndex - pairsBySeed[i].seedIndex);
            if (diff < minDiff) {
                minDiff = diff;
                closest = pairsBySeed[i];
            }
        }
        return closest ? closest.sourceIndex : null;
    };

    return {
        hasMatches: seedToSource.size > 0,
        getSourceForSeed(index) {
            return seedToSource.has(index) ? seedToSource.get(index) : null;
        },
        getSeedForSource(index) {
            return sourceToSeed.has(index) ? sourceToSeed.get(index) : null;
        },
        getClosestSeedForSource,
        getClosestSourceForSeed,
        pairs
    };
}

function initializeSourceSync({ panelA, panelB, dataA, dataB }) {
    if (currentMode !== 'sidebyside') return;
    const sourcePanel = dataA.isSource ? panelA : (dataB.isSource ? panelB : null);
    const seedPanel = dataA.isSource ? panelB : (dataB.isSource ? panelA : null);
    if (!sourcePanel || !seedPanel) return;

    const seedVersionId = dataA.isSource ? versionB : versionA;
    if (!seedVersionId) return;

    const seedParagraphEls = Array.from(seedPanel.querySelectorAll('[data-paragraph-index]'));
    const sourceParagraphEls = Array.from(sourcePanel.querySelectorAll('[data-paragraph-index]'));
    if (seedParagraphEls.length === 0 || sourceParagraphEls.length === 0) return;

    const seedIndexToElement = new Map();
    seedParagraphEls.forEach(el => {
        const idx = parseInt(el.dataset.paragraphIndex || '-1', 10);
        if (!Number.isNaN(idx)) {
            seedIndexToElement.set(idx, el);
        }
    });

    const normalizedSeed = getNormalizedParagraphsForVersion(seedVersionId, currentChapter);
    const normalizedSource = getSourceChapterNormalizedParagraphs(currentChapter);
    const mapping = buildSourceMapping(normalizedSeed, normalizedSource);
    if (!mapping.hasMatches) return;

    sourcePanel.classList.add('source-column');

    const sourceIndexToElement = new Map();
    sourceParagraphEls.forEach(el => {
        const idx = parseInt(el.dataset.paragraphIndex || '-1', 10);
        if (!Number.isNaN(idx)) {
            sourceIndexToElement.set(idx, el);
        }
    });

    const getActiveSeedIndex = () => {
        const thresholdTop = window.innerHeight * 0.2;
        for (const el of seedParagraphEls) {
            const rect = el.getBoundingClientRect();
            if (rect.bottom >= thresholdTop) {
                const idx = parseInt(el.dataset.paragraphIndex || '-1', 10);
                if (!Number.isNaN(idx)) {
                    return idx;
                }
            }
        }
        return null;
    };

    const scrollSourceToIndex = (targetSourceIndex, options = { smooth: true }) => {
        if (targetSourceIndex === null || targetSourceIndex === undefined) return;
        const targetEl = sourceIndexToElement.get(targetSourceIndex);
        if (!targetEl) return;

        if (sourceSyncState.activeSourceEl !== targetEl) {
            if (sourceSyncState.activeSourceEl) {
                sourceSyncState.activeSourceEl.classList.remove('active-source-snippet');
            }
            targetEl.classList.add('active-source-snippet');
            sourceSyncState.activeSourceEl = targetEl;
        }

        const desiredTop = targetEl.offsetTop - 16;
        sourcePanel.scrollTo({
            top: desiredTop >= 0 ? desiredTop : 0,
            behavior: options.smooth === false ? 'auto' : 'smooth'
        });
    };

    const updateActiveSource = () => {
        if (!sourceSyncState) return;
        const activeSeedIndex = getActiveSeedIndex();
        if (activeSeedIndex === null) return;
        const targetSourceIndex = mapping.getSourceForSeed(activeSeedIndex);
        if (targetSourceIndex === null || targetSourceIndex === undefined) return;
        scrollSourceToIndex(targetSourceIndex);
    };

    const onScroll = () => {
        if (!sourceSyncState) return;
        if (sourceSyncState.rafId) {
            cancelAnimationFrame(sourceSyncState.rafId);
        }
        sourceSyncState.rafId = requestAnimationFrame(updateActiveSource);
    };

    const scrollSeedToIndex = (seedIndex) => {
        const targetSeedEl = seedIndexToElement.get(seedIndex);
        if (!targetSeedEl) return;
        const offset = targetSeedEl.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({
            top: offset >= 0 ? offset : 0,
            behavior: 'smooth'
        });
    };

    const onSourceClick = (event) => {
        if (!sourceSyncState) return;
        const target = event.target.closest('.source-paragraph');
        if (!target) return;
        const sourceIndex = parseInt(target.dataset.paragraphIndex || '-1', 10);
        if (Number.isNaN(sourceIndex)) return;
        const exactSeed = mapping.getSeedForSource(sourceIndex);
        const seedIndex = exactSeed !== null && exactSeed !== undefined
            ? exactSeed
            : mapping.getClosestSeedForSource(sourceIndex);
        if (seedIndex === null || seedIndex === undefined) return;
        scrollSeedToIndex(seedIndex);
    };

    const onSeedClick = (event) => {
        if (!sourceSyncState) return;
        const target = event.target.closest('[data-paragraph-index]');
        if (!target) return;
        const seedIndex = parseInt(target.dataset.paragraphIndex || '-1', 10);
        if (Number.isNaN(seedIndex)) return;
        const exactSource = mapping.getSourceForSeed(seedIndex);
        const sourceIndex = exactSource !== null && exactSource !== undefined
            ? exactSource
            : mapping.getClosestSourceForSeed(seedIndex);
        if (sourceIndex === null || sourceIndex === undefined) return;
        scrollSourceToIndex(sourceIndex);
    };

    sourceSyncState = {
        onScroll,
        sourcePanel,
        seedPanel,
        activeSourceEl: null,
        rafId: null,
        onSourceClick,
        onSeedClick
    };

    window.addEventListener('scroll', onScroll);
    sourcePanel.addEventListener('click', onSourceClick);
    seedPanel.addEventListener('click', onSeedClick);
    updateActiveSource();
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
            const paragraphs = getChapterParagraphs(versionA, chapterId);
            textToSearch = paragraphs.join(' ');
        } else if (currentMode === 'sidebyside') {
            const paragraphsA = getChapterParagraphs(versionA, chapterId);
            const paragraphsB = getChapterParagraphs(versionB, chapterId);
            textToSearch = paragraphsA.join(' ') + ' ' + paragraphsB.join(' ');
        } else if (currentMode === 'diff') {
            const paragraphsA = getChapterParagraphs(versionA, chapterId);
            const paragraphsB = getChapterParagraphs(versionB, chapterId);
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
let currentWordData = { uniqueToA: [], uniqueToB: [], uniqueToC: [], freqA: new Map(), freqB: new Map(), freqC: new Map() };

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
    if (isSourceVersion(seedId)) {
        const chapters = getChaptersForVersion(seedId).filter(ch => ch !== 'notes');
        let text = '';
        chapters.forEach(chapterId => {
            const paragraphs = getChapterParagraphs(seedId, chapterId);
            if (paragraphs && paragraphs.length > 0) {
                text += ' ' + paragraphs.join(' ');
            }
        });
        return text;
    }

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

// Jaccard Distance Functions for comparing uploaded files
function getVocabularySet(versionId) {
    // Get all text and extract unique words
    const text = getAllTextForSeed(versionId);
    const frequencies = extractWords(text);
    return new Set(frequencies.keys());
}

function calculateJaccardDistance(vocabA, vocabB) {
    // Calculate Jaccard distance: 1 - (intersection / union)
    const intersection = new Set([...vocabA].filter(word => vocabB.has(word)));
    const union = new Set([...vocabA, ...vocabB]);

    if (union.size === 0) return 0;

    const similarity = intersection.size / union.size;
    return 1 - similarity;
}

function findSimilarVersions(uploadedVersionId) {
    const uploadedVocab = getVocabularySet(uploadedVersionId);
    const results = [];

    // Compare against all versions (preloaded and uploaded)
    const allIds = getAllVersionIds();
    for (const versionId of allIds) {
        if (versionId === uploadedVersionId) continue;

        const compareVocab = getVocabularySet(versionId);
        const distance = calculateJaccardDistance(uploadedVocab, compareVocab);
        const similarity = ((1 - distance) * 100).toFixed(1);

        results.push({
            versionId,
            distance,
            similarity: parseFloat(similarity),
            isCustom: customVersions[versionId] !== undefined
        });
    }

    // Sort by distance (ascending = most similar first)
    results.sort((a, b) => a.distance - b.distance);

    return {
        mostSimilar: results[0],
        mostDifferent: results[results.length - 1],
        allResults: results
    };
}

function calculateWordDifferential() {
    const modal = document.getElementById('word-diff-modal');
    const seedALabel = document.getElementById('seed-a-label');
    const seedBLabel = document.getElementById('seed-b-label');
    const seedCLabel = document.getElementById('seed-c-label');
    const panelC = document.getElementById('unique-words-panel-c');
    const diffResults = document.getElementById('diff-results');

    // Get text for all seeds
    const textA = getAllTextForSeed(versionA);
    const textB = getAllTextForSeed(versionB);
    const textC = versionC ? getAllTextForSeed(versionC) : '';

    // Extract word frequencies
    const freqA = extractWords(textA);
    const freqB = extractWords(textB);
    const freqC = versionC ? extractWords(textC) : new Map();

    // Calculate unique words
    let uniqueToA, uniqueToB, uniqueToC;

    if (versionC) {
        // Three-way: unique means not in either of the other two
        uniqueToA = [...freqA.keys()].filter(word => !freqB.has(word) && !freqC.has(word));
        uniqueToB = [...freqB.keys()].filter(word => !freqA.has(word) && !freqC.has(word));
        uniqueToC = [...freqC.keys()].filter(word => !freqA.has(word) && !freqB.has(word));
    } else {
        // Two-way comparison (original)
        uniqueToA = [...freqA.keys()].filter(word => !freqB.has(word));
        uniqueToB = [...freqB.keys()].filter(word => !freqA.has(word));
        uniqueToC = [];
    }

    // Store data globally for sorting
    currentWordData = {
        uniqueToA: uniqueToA,
        uniqueToB: uniqueToB,
        uniqueToC: uniqueToC,
        freqA: freqA,
        freqB: freqB,
        freqC: freqC
    };

    // Update modal labels
    seedALabel.textContent = formatVersionLabel(versionA);
    seedBLabel.textContent = formatVersionLabel(versionB);

    // Show/hide third column
    if (versionC) {
        seedCLabel.textContent = formatVersionLabel(versionC);
        panelC.classList.remove('hidden');
        diffResults.classList.add('three-column');
    } else {
        panelC.classList.add('hidden');
        diffResults.classList.remove('three-column');
    }

    // Update description with seed numbers
    const description = document.getElementById('word-diff-description');
    if (versionC) {
        description.textContent = `Words unique to each version (not found in either of the other two). Select any word to see which chapters it appears in.`;
    } else {
        description.textContent = `Words in ${formatVersionLabel(versionA)} that are not in ${formatVersionLabel(versionB)}, and vice-versa. Select any word to see which chapters it appears in. Select the chapters to see the word in context.`;
    }

    // Display words with current sort mode
    displayWordLists();

    // Show modal
    modal.classList.remove('hidden');
}

function displayWordLists() {
    const uniqueACount = document.getElementById('unique-a-count');
    const uniqueBCount = document.getElementById('unique-b-count');
    const uniqueCCount = document.getElementById('unique-c-count');
    const uniqueWordsA = document.getElementById('unique-words-a');
    const uniqueWordsB = document.getElementById('unique-words-b');
    const uniqueWordsC = document.getElementById('unique-words-c');

    let sortedA, sortedB, sortedC;

    if (currentSortMode === 'alpha') {
        // Sort alphabetically
        sortedA = [...currentWordData.uniqueToA].sort();
        sortedB = [...currentWordData.uniqueToB].sort();
        sortedC = [...currentWordData.uniqueToC].sort();
    } else {
        // Sort by frequency (descending)
        sortedA = [...currentWordData.uniqueToA].sort((a, b) =>
            currentWordData.freqA.get(b) - currentWordData.freqA.get(a)
        );
        sortedB = [...currentWordData.uniqueToB].sort((a, b) =>
            currentWordData.freqB.get(b) - currentWordData.freqB.get(a)
        );
        sortedC = [...currentWordData.uniqueToC].sort((a, b) =>
            currentWordData.freqC.get(b) - currentWordData.freqC.get(a)
        );
    }

    // Update counts
    uniqueACount.textContent = sortedA.length;
    uniqueBCount.textContent = sortedB.length;
    if (uniqueCCount) uniqueCCount.textContent = sortedC.length;

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

    // Display version C words if available
    if (uniqueWordsC && versionC) {
        uniqueWordsC.innerHTML = '';
        sortedC.forEach(word => {
            const freq = currentWordData.freqC.get(word);
            const freqText = (currentSortMode === 'freq' && freq > 1) ? ` (${freq})` : '';
            const span = document.createElement('span');
            span.className = 'word-item';
            span.textContent = word + freqText;
            span.dataset.word = word;
            span.dataset.seed = versionC;
            span.addEventListener('click', (e) => showWordPopup(e, word, versionC));
            uniqueWordsC.appendChild(span);
        });
    }
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
    const chaptersWithWord = [];
    const searchRegex = new RegExp(`\\b${escapeRegex(word)}\\b`, 'i');

    const chapters = getChaptersForVersion(seedId);

    chapters.forEach(chapterId => {
        if (chapterId === 'notes') return;
        const paragraphs = getChapterParagraphs(seedId, chapterId);
        if (paragraphs && paragraphs.length > 0) {
            const allText = paragraphs.join(' ').replace(/<[^>]*>/g, ' ');
            if (searchRegex.test(allText)) {
                chaptersWithWord.push(chapterId);
            }
        }
    });

    return chaptersWithWord;
}

function formatChapterName(chapterId) {
    if (chapterId === 'introduction') return 'Introduction';
    if (chapterId === 'prologue') return 'Part 1';
    if (chapterId === 'part2') return 'Part 2';
    if (chapterId === 'part3') return 'Part 3';
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

function navigateToChapter(chapterId) {
    // Update current chapter
    currentChapter = chapterId;

    // Update active chapter button
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    const chapterButtons = document.querySelectorAll('.nav-btn');
    chapterButtons.forEach(btn => {
        // Match button by data attribute or text content
        const btnChapter = btn.getAttribute('data-chapter');
        if (btnChapter === chapterId) {
            btn.classList.add('active');
        }
    });

    // Display the chapter
    displayComparison();
    updateVariableDiffIfVisible();
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
        showNotification('Version data not found', 'error');
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
        showNotification('Error generating EPUB. See console for details.', 'error');
    }
}

// Manage Uploads functionality

function openManageUploadsModal() {
    closeAllModals();
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
    showConfirmDialog(
        'Delete Version',
        `Are you sure you want to delete Seed ${versionId}?`,
        () => {
            // Remove from customVersions
            delete customVersions[versionId];

            // Remove from allVersions
            delete allVersions[versionId];
            invalidateVersionCaches(versionId);

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
        },
        { confirmText: 'Delete', confirmIcon: 'trash-2', type: 'danger' }
    );
}

// Manage Uploads Info Modal functionality
function hasSeenManageInfoNotice() {
    return localStorage.getItem('subcutanean_manage_info_seen') === 'true';
}

function markManageInfoNoticeSeen() {
    localStorage.setItem('subcutanean_manage_info_seen', 'true');
}

function openManageInfoModal() {
    closeAllModals();
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

// Close all modals helper
function closeAllModals() {
    const modalIds = [
        'about-modal',
        'generate-modal',
        'globals-modal',
        'levenshtein-modal',
        'manage-uploads-modal',
        'manage-info-modal',
        'privacy-notice-modal',
        'annotation-modal',
        'export-modal'
    ];
    modalIds.forEach(id => {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.add('hidden');
        }
    });
    // Also close any open nav dropdowns
    closeAllNavDropdowns();
}

// About Modal functionality

function openAboutModal() {
    closeAllModals();
    const modal = document.getElementById('about-modal');
    modal.classList.remove('hidden');
}

function closeAboutModal() {
    const modal = document.getElementById('about-modal');
    modal.classList.add('hidden');
}

// Generate Copy Modal functionality

function openGenerateModal() {
    closeAllModals();
    const modal = document.getElementById('generate-modal');
    modal.classList.remove('hidden');
}

function closeGenerateModal() {
    const modal = document.getElementById('generate-modal');
    modal.classList.add('hidden');
}

// Globals Modal functionality

function openGlobalsModal() {
    closeAllModals();
    const modal = document.getElementById('globals-modal');
    const contentEl = document.getElementById('globals-content');

    // Load globals content from origin sources
    if (originSourcesLoaded && originSources && originSources.chapters && originSources.chapters.globals) {
        const globalsContent = originSources.chapters.globals.content || '';
        contentEl.innerHTML = highlightQuantSyntax(globalsContent);
    } else {
        contentEl.innerHTML = '<span style="color: #888;">Loading globals.txt...</span>';
        // Try to load origin sources if not loaded
        loadOriginSources().then(() => {
            if (originSources && originSources.chapters && originSources.chapters.globals) {
                contentEl.innerHTML = highlightQuantSyntax(originSources.chapters.globals.content || '');
            } else {
                contentEl.innerHTML = '<span style="color: #f66;">Could not load globals.txt</span>';
            }
        });
    }

    modal.classList.remove('hidden');
}

function closeGlobalsModal() {
    const modal = document.getElementById('globals-modal');
    modal.classList.add('hidden');
}

function initializeGlobalsModal() {
    const closeBtn = document.getElementById('globals-close-btn');
    const modal = document.getElementById('globals-modal');
    const link = document.getElementById('show-globals-link');

    if (link) {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            openGlobalsModal();
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closeGlobalsModal);
    }

    // Close on click outside modal content
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeGlobalsModal();
            }
        });
    }
}

function initializeGenerateForm() {
    const form = document.getElementById('subcutanean-form');
    const closeBtn = document.getElementById('close-generate-modal-btn');
    const modal = document.getElementById('generate-modal');

    if (closeBtn) {
        closeBtn.addEventListener('click', closeGenerateModal);
    }

    // Close on click outside modal content
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeGenerateModal();
            }
        });
    }

    if (form) {
        const scriptURL = 'https://script.google.com/macros/s/AKfycbyVPhAw1dq7B0aCkh12o19yrNrsu7ezzvfV0hXdkVoojoiST9ViBuaPT5p_rk-BERMS/exec';

        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const btn = document.getElementById('generate-submit-btn');
            btn.disabled = true;
            btn.innerText = 'Sending Request...';

            // Gather optional formats
            const checkboxes = document.querySelectorAll('input[name="format_choice"]:checked');
            const formatsString = Array.from(checkboxes).map(cb => cb.value).join(', ');

            // Prepare data for Apps Script
            const formData = new FormData();
            formData.append('email', document.getElementById('generate-email').value);
            formData.append('formats', formatsString);
            formData.append('honeypot', document.getElementById('generate-honeypot').value);

            // Post to Google Sheets
            fetch(scriptURL, { method: 'POST', body: formData })
                .then(response => {
                    form.style.display = 'none';
                    document.getElementById('generate-response-msg').classList.remove('hidden');
                    console.log('Success!', response);
                })
                .catch(error => {
                    console.error('Error!', error.message);
                    showNotification('Something went wrong. Please check your connection and try again.', 'error');
                    btn.disabled = false;
                    btn.innerText = 'Generate My Variant';
                });
        });
    }
}

// Bookmark functionality

function loadBookmarksFromStorage() {
    try {
        const stored = localStorage.getItem('subcutanean_bookmarks');
        bookmarks = stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Error loading bookmarks:', error);
        bookmarks = [];
    }
}

function saveBookmarksToStorage() {
    try {
        localStorage.setItem('subcutanean_bookmarks', JSON.stringify(bookmarks));
    } catch (error) {
        console.error('Error saving bookmarks:', error);
    }
}

function refreshBookmarkUI(selectedId) {
    const select = document.getElementById('bookmark-select');
    const emptyState = document.getElementById('bookmark-empty');
    const loadBtn = document.getElementById('load-bookmark-btn');
    const deleteBtn = document.getElementById('delete-bookmark-btn');
    const notesDisplay = document.getElementById('bookmark-notes-display');

    if (!select) return;

    select.innerHTML = '';

    if (bookmarks.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        select.disabled = true;
        if (loadBtn) loadBtn.disabled = true;
        if (deleteBtn) deleteBtn.disabled = true;
        if (notesDisplay) notesDisplay.classList.add('hidden');
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');
    select.disabled = false;
    if (loadBtn) loadBtn.disabled = false;
    if (deleteBtn) deleteBtn.disabled = false;

    bookmarks.forEach(bookmark => {
        const option = document.createElement('option');
        option.value = bookmark.id;
        option.textContent = bookmark.name;
        select.appendChild(option);
    });

    if (selectedId) {
        select.value = selectedId;
    }

    // Update notes display for selected bookmark
    updateBookmarkNotesDisplay();
}

function updateBookmarkNotesDisplay() {
    const select = document.getElementById('bookmark-select');
    const notesDisplay = document.getElementById('bookmark-notes-display');
    const notesText = document.getElementById('bookmark-notes-text');

    if (!select || !notesDisplay || !notesText) return;

    const selectedBookmark = getBookmarkById(select.value);
    if (selectedBookmark && selectedBookmark.notes && selectedBookmark.notes.trim()) {
        notesText.textContent = selectedBookmark.notes;
        notesDisplay.classList.remove('hidden');
    } else {
        notesDisplay.classList.add('hidden');
    }
}

function saveCurrentBookmark() {
    if (!versionA || !versionB) return;

    const openPanels = getOpenNotePanelsState();
    const panelInfo = openPanels.length > 0 ? ` + ${openPanels.length} note${openPanels.length > 1 ? 's' : ''}` : '';
    const versionLabel = versionC
        ? `${formatVersionLabel(versionA)} vs ${formatVersionLabel(versionB)} vs ${formatVersionLabel(versionC)}`
        : `${formatVersionLabel(versionA)} vs ${formatVersionLabel(versionB)}`;
    const defaultName = `${versionLabel} – ${formatChapterLabel(currentChapter)} (${formatModeLabel(currentMode)})${panelInfo}`;
    const label = prompt('Name this bookmark:', defaultName);
    if (label === null) return;
    const trimmed = label.trim();
    if (!trimmed) return;

    // Get notes from textarea
    const notesInput = document.getElementById('bookmark-notes-input');
    const notes = notesInput ? notesInput.value.trim() : '';

    const bookmark = {
        id: `bookmark-${Date.now()}`,
        name: trimmed,
        versionA: versionA,
        versionB: versionB,
        versionC: versionC || null, // Optional third version
        chapter: currentChapter,
        mode: currentMode,
        scrollPosition: window.scrollY,
        notes: notes,
        openNotePanels: openPanels // Save open note panels and their positions
    };

    bookmarks.push(bookmark);
    saveBookmarksToStorage();
    refreshBookmarkUI(bookmark.id);

    // Clear the notes input
    if (notesInput) {
        notesInput.value = '';
    }
}

function applyBookmark(bookmark) {
    if (!bookmark) return;
    const versionAAvailable = isVersionSelectable(bookmark.versionA);
    const versionBAvailable = isVersionSelectable(bookmark.versionB);
    const versionCAvailable = bookmark.versionC ? isVersionSelectable(bookmark.versionC) : true;

    if (!versionAAvailable || !versionBAvailable) {
        if (isSourceVersion(bookmark.versionA) || isSourceVersion(bookmark.versionB)) {
            showNotification('Source code data is still loading. Please try again in a moment.', 'info');
            return;
        }
        showNotification('One of the versions in this bookmark is no longer available.', 'warning');
        if (bookmark.id) {
            bookmarks = bookmarks.filter(b => b.id !== bookmark.id);
            saveBookmarksToStorage();
            refreshBookmarkUI();
        }
        return;
    }

    // Warn if third version is no longer available but continue with two-version mode
    if (bookmark.versionC && !versionCAvailable) {
        showNotification('Third version in this bookmark is no longer available. Restoring two-version comparison.', 'warning');
    }

    const selectA = document.getElementById('version-a-select');
    const selectB = document.getElementById('version-b-select');
    const selectC = document.getElementById('version-c-select');

    versionA = bookmark.versionA;
    versionB = bookmark.versionB;

    if (selectA) selectA.value = versionA;
    if (selectB) selectB.value = versionB;

    // Restore third version if available
    if (bookmark.versionC && versionCAvailable) {
        versionC = bookmark.versionC;
        if (selectC) selectC.value = versionC;
        toggleThirdVersion(true);
    } else {
        versionC = null;
        toggleThirdVersion(false);
    }

    currentChapter = bookmark.chapter;
    pendingBookmarkScroll = typeof bookmark.scrollPosition === 'number' ? bookmark.scrollPosition : 0;
    buildChapterNavigation();
    setViewMode(bookmark.mode || currentMode);

    // Restore open note panels if saved with this bookmark
    if (bookmark.openNotePanels && bookmark.openNotePanels.length > 0) {
        // Delay to allow the comparison to render first
        setTimeout(() => {
            restoreNotePanels(bookmark.openNotePanels);
        }, 600);
    }
}

function deleteSelectedBookmark() {
    const select = document.getElementById('bookmark-select');
    if (!select || !select.value) return;

    const bookmarkId = select.value;
    showConfirmDialog(
        'Delete Bookmark',
        'Are you sure you want to delete this bookmark?',
        () => {
            bookmarks = bookmarks.filter(b => b.id !== bookmarkId);
            saveBookmarksToStorage();
            refreshBookmarkUI();
        },
        { confirmText: 'Delete', confirmIcon: 'trash-2', type: 'danger' }
    );
}

function getBookmarkById(id) {
    return bookmarks.find(b => b.id === id);
}

// Annotation functionality

let annotations = {};
let openNotePanels = {}; // Track open floating note panels { panelId: { element, annotationKey, position } }
let notePanelZIndex = 6000; // Starting z-index for note panels

function loadAnnotationsFromStorage() {
    try {
        const stored = localStorage.getItem('subcutanean_annotations');
        annotations = stored ? JSON.parse(stored) : {};
    } catch (error) {
        console.error('Error loading annotations:', error);
        annotations = {};
    }
}

function saveAnnotationsToStorage() {
    try {
        localStorage.setItem('subcutanean_annotations', JSON.stringify(annotations));
    } catch (error) {
        console.error('Error saving annotations:', error);
    }
}

function createAnnotationKey(version, chapter, paragraphIndex) {
    return `${version}:${chapter}:${paragraphIndex}`;
}

function getAnnotationByKey(key) {
    return Object.values(annotations).find(a =>
        createAnnotationKey(a.version, a.chapter, a.paragraphIndex) === key
    );
}

function openAnnotationModal(paragraphIndex, paragraphText, version, clickEvent) {
    // Create a floating note panel instead of a modal
    const key = createAnnotationKey(version, currentChapter, paragraphIndex);

    // Check if panel for this annotation is already open
    const existingPanel = Object.values(openNotePanels).find(p => p.annotationKey === key);
    if (existingPanel) {
        // Bring to front
        bringNotePanelToFront(existingPanel.element);
        existingPanel.element.querySelector('.note-panel-textarea').focus();
        return;
    }

    const existing = getAnnotationByKey(key);
    // Strip HTML tags and the annotation indicator emoji
    const cleanText = paragraphText.replace(/<[^>]*>/g, '').replace(/📝\s*/g, '').trim();
    // Limit to ~80 chars to fit in 2 lines
    const previewText = cleanText.length > 80 ? cleanText.substring(0, 80) + '…' : cleanText;
    const locationText = `${formatVersionLabel(version)} — ${formatChapterLabel(currentChapter)}, ¶${paragraphIndex + 1}`;

    // Create the floating panel
    const panelId = `note-panel-${Date.now()}`;
    const panel = document.createElement('div');
    panel.className = 'note-panel';
    panel.id = panelId;
    panel.dataset.annotationKey = key;
    panel.dataset.paragraphIndex = paragraphIndex;
    panel.dataset.paragraphPreview = cleanText.substring(0, 50);
    panel.dataset.version = version;
    panel.dataset.chapter = currentChapter;
    panel.dataset.annotationId = existing ? existing.id : '';

    // Position panel near the click location, or use default offset
    const panelWidth = 320;
    const panelHeight = 250; // approximate
    let top, left;

    if (clickEvent && clickEvent.clientX !== undefined) {
        // Position near click, but ensure it stays on screen
        left = Math.min(clickEvent.clientX + 20, window.innerWidth - panelWidth - 20);
        top = Math.min(clickEvent.clientY - 50, window.innerHeight - panelHeight - 20);
        top = Math.max(20, top);
        left = Math.max(20, left);
    } else {
        // Fallback: offset from other panels
        const offset = Object.keys(openNotePanels).length * 30;
        top = 100 + offset;
        left = 100 + offset;
    }

    panel.style.top = `${top}px`;
    panel.style.left = `${left}px`;
    panel.style.zIndex = ++notePanelZIndex;

    panel.innerHTML = `
        <div class="note-panel-header">
            <span class="note-panel-location">${locationText}</span>
            <button class="note-panel-close" title="Close"><i data-lucide="x"></i></button>
        </div>
        <div class="note-panel-preview">${previewText}</div>
        <textarea class="note-panel-textarea" placeholder="Add your note..." ${existing ? 'readonly' : ''}>${existing ? existing.note : ''}</textarea>
        <div class="note-panel-actions">
            <button class="note-panel-delete ${existing ? '' : 'hidden'}" title="Delete annotation"><i data-lucide="trash-2"></i> Delete</button>
            <button class="note-panel-edit ${existing ? '' : 'hidden'}" title="Edit annotation"><i data-lucide="pencil"></i> Edit</button>
            <button class="note-panel-save ${existing ? 'hidden' : ''}"><i data-lucide="save"></i> Save</button>
        </div>
    `;

    document.body.appendChild(panel);

    // Render Lucide icons in the panel
    if (typeof lucide !== 'undefined') {
        lucide.createIcons({ nodes: [panel] });
    }

    // Track this panel
    openNotePanels[panelId] = {
        element: panel,
        annotationKey: key,
        position: { top: panel.style.top, left: panel.style.left }
    };

    // Set up event handlers
    setupNotePanelEvents(panel);

    // Focus the textarea
    panel.querySelector('.note-panel-textarea').focus();
}

function setupNotePanelEvents(panel) {
    const header = panel.querySelector('.note-panel-header');
    const closeBtn = panel.querySelector('.note-panel-close');
    const saveBtn = panel.querySelector('.note-panel-save');
    const editBtn = panel.querySelector('.note-panel-edit');
    const deleteBtn = panel.querySelector('.note-panel-delete');
    const textarea = panel.querySelector('.note-panel-textarea');

    // Drag functionality with click-to-jump detection
    let isDragging = false;
    let hasMoved = false;
    let dragOffset = { x: 0, y: 0 };
    let startPos = { x: 0, y: 0 };
    const DRAG_THRESHOLD = 5; // pixels - movement below this is a click, not a drag

    header.addEventListener('mousedown', (e) => {
        if (e.target === closeBtn) return;
        isDragging = true;
        hasMoved = false;
        startPos.x = e.clientX;
        startPos.y = e.clientY;
        dragOffset.x = e.clientX - panel.offsetLeft;
        dragOffset.y = e.clientY - panel.offsetTop;
        bringNotePanelToFront(panel);
        header.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        // Check if mouse has moved beyond threshold
        const deltaX = Math.abs(e.clientX - startPos.x);
        const deltaY = Math.abs(e.clientY - startPos.y);
        if (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD) {
            hasMoved = true;
        }

        const newLeft = e.clientX - dragOffset.x;
        const newTop = e.clientY - dragOffset.y;
        panel.style.left = `${Math.max(0, newLeft)}px`;
        panel.style.top = `${Math.max(0, newTop)}px`;
        // Update tracked position
        if (openNotePanels[panel.id]) {
            openNotePanels[panel.id].position = { top: panel.style.top, left: panel.style.left };
        }
    });

    document.addEventListener('mouseup', () => {
        if (isDragging && !hasMoved) {
            // It was a click, not a drag - jump to annotation
            jumpToAnnotationFromPanel(panel);
        }
        isDragging = false;
        hasMoved = false;
        header.style.cursor = 'grab';
    });

    // Click to bring to front
    panel.addEventListener('mousedown', () => {
        bringNotePanelToFront(panel);
    });

    // Close button
    closeBtn.addEventListener('click', () => {
        closeNotePanel(panel.id);
    });

    // Save button
    saveBtn.addEventListener('click', () => {
        saveNotePanel(panel);
    });

    // Edit button - enables editing mode
    editBtn.addEventListener('click', () => {
        textarea.removeAttribute('readonly');
        textarea.focus();
        editBtn.classList.add('hidden');
        saveBtn.classList.remove('hidden');
    });

    // Delete button - shows confirmation modal
    deleteBtn.addEventListener('click', () => {
        const annotationId = panel.dataset.annotationId;
        if (annotationId) {
            showDeleteConfirmModal(panel.id, annotationId);
        }
    });

    // Auto-save on Ctrl+Enter
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            saveNotePanel(panel);
        }
    });
}

function bringNotePanelToFront(panel) {
    panel.style.zIndex = ++notePanelZIndex;
}

function closeNotePanel(panelId) {
    const panel = document.getElementById(panelId);
    if (panel) {
        panel.remove();
    }
    delete openNotePanels[panelId];
}

function closeAllNotePanels() {
    Object.keys(openNotePanels).forEach(id => closeNotePanel(id));
}

// ============================================
// Notification and Confirmation Modals
// ============================================

// Show a notification toast/modal
function showNotification(message, type = 'info') {
    // Remove existing notification if any
    const existing = document.getElementById('notification-modal');
    if (existing) existing.remove();

    const icons = {
        success: 'check-circle',
        error: 'x-circle',
        warning: 'alert-triangle',
        info: 'info'
    };

    const modal = document.createElement('div');
    modal.id = 'notification-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content notification-modal-content notification-${type}">
            <div class="notification-icon">
                <i data-lucide="${icons[type] || icons.info}"></i>
            </div>
            <div class="notification-message">${message}</div>
            <button class="tool-btn notification-ok-btn">OK</button>
        </div>
    `;

    document.body.appendChild(modal);

    if (typeof lucide !== 'undefined') {
        lucide.createIcons({ nodes: [modal] });
    }

    const okBtn = modal.querySelector('.notification-ok-btn');
    okBtn.addEventListener('click', () => modal.remove());

    // Close on click outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    // Close on Escape
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);

    // Focus OK button
    okBtn.focus();
}

// Show a confirmation dialog
function showConfirmDialog(title, message, onConfirm, options = {}) {
    const {
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        confirmIcon = null,
        type = 'warning' // 'warning', 'danger', 'info'
    } = options;

    // Remove existing modal if any
    const existing = document.getElementById('confirm-dialog-modal');
    if (existing) existing.remove();

    const icons = {
        warning: 'alert-triangle',
        danger: 'trash-2',
        info: 'help-circle'
    };

    const modal = document.createElement('div');
    modal.id = 'confirm-dialog-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content confirm-dialog-content confirm-${type}">
            <div class="modal-header">
                <h3><i data-lucide="${icons[type] || icons.warning}"></i> ${title}</h3>
            </div>
            <div class="modal-body">
                <p>${message}</p>
            </div>
            <div class="modal-footer">
                <button class="tool-btn" id="confirm-cancel-btn">${cancelText}</button>
                <button class="tool-btn confirm-action-btn" id="confirm-action-btn">
                    ${confirmIcon ? `<i data-lucide="${confirmIcon}"></i> ` : ''}${confirmText}
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    if (typeof lucide !== 'undefined') {
        lucide.createIcons({ nodes: [modal] });
    }

    const cancelBtn = modal.querySelector('#confirm-cancel-btn');
    const confirmBtn = modal.querySelector('#confirm-action-btn');

    cancelBtn.addEventListener('click', () => modal.remove());

    confirmBtn.addEventListener('click', () => {
        modal.remove();
        if (onConfirm) onConfirm();
    });

    // Close on click outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    // Close on Escape
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);

    // Focus cancel button (safer default)
    cancelBtn.focus();
}

// Delete confirmation modal (specific for note panel delete)
function showDeleteConfirmModal(panelId, annotationId) {
    // Remove existing modal if any
    const existingModal = document.getElementById('delete-confirm-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'delete-confirm-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content delete-confirm-modal-content">
            <div class="modal-header">
                <h3><i data-lucide="alert-triangle"></i> Delete Annotation</h3>
            </div>
            <div class="modal-body">
                <p>Are you sure you want to delete this annotation? This cannot be undone.</p>
            </div>
            <div class="modal-footer">
                <button class="tool-btn" id="delete-cancel-btn">Cancel</button>
                <button class="tool-btn delete-confirm-btn" id="delete-confirm-btn"><i data-lucide="trash-2"></i> Delete</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Render Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons({ nodes: [modal] });
    }

    // Event handlers
    const cancelBtn = modal.querySelector('#delete-cancel-btn');
    const confirmBtn = modal.querySelector('#delete-confirm-btn');

    cancelBtn.addEventListener('click', () => {
        modal.remove();
    });

    confirmBtn.addEventListener('click', () => {
        delete annotations[annotationId];
        saveAnnotationsToStorage();
        closeNotePanel(panelId);
        refreshAnnotationsUI();
        markAnnotatedParagraphs();
        modal.remove();
    });

    // Close on click outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    // Close on Escape
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

function saveNotePanel(panel) {
    const textarea = panel.querySelector('.note-panel-textarea');
    const note = textarea.value.trim();

    if (!note) {
        showNotification('Please enter a note.', 'warning');
        return;
    }

    const paragraphIndex = parseInt(panel.dataset.paragraphIndex);
    const paragraphPreview = panel.dataset.paragraphPreview;
    const version = panel.dataset.version;
    const chapter = panel.dataset.chapter;
    const existingId = panel.dataset.annotationId;
    const now = new Date().toISOString();

    if (existingId) {
        // Update existing
        annotations[existingId].note = note;
        annotations[existingId].modified = now;
    } else {
        // Create new
        const id = `annotation-${Date.now()}`;
        annotations[id] = {
            id: id,
            created: now,
            modified: now,
            version: version,
            chapter: chapter,
            paragraphIndex: paragraphIndex,
            paragraphPreview: paragraphPreview,
            note: note
        };
        panel.dataset.annotationId = id;
        // Show delete button now that annotation exists
        panel.querySelector('.note-panel-delete').classList.remove('hidden');
    }

    saveAnnotationsToStorage();
    refreshAnnotationsUI();
    markAnnotatedParagraphs();

    // Visual feedback and switch to read-only mode
    const saveBtn = panel.querySelector('.note-panel-save');
    const editBtn = panel.querySelector('.note-panel-edit');
    saveBtn.textContent = 'Saved!';
    saveBtn.disabled = true;

    setTimeout(() => {
        // Switch to read-only mode
        textarea.setAttribute('readonly', '');
        saveBtn.textContent = 'Save';
        saveBtn.disabled = false;
        saveBtn.classList.add('hidden');
        editBtn.classList.remove('hidden');
    }, 800);
}

function getOpenNotePanelsState() {
    // Returns the state of all open note panels for saving with bookmarks
    return Object.values(openNotePanels).map(data => ({
        annotationKey: data.annotationKey,
        position: data.position
    }));
}

function restoreNotePanels(panelStates) {
    // Close any currently open panels
    closeAllNotePanels();

    // Restore panels from saved state
    panelStates.forEach(state => {
        const annotation = getAnnotationByKey(state.annotationKey);
        if (annotation) {
            // Open the panel
            openAnnotationModal(annotation.paragraphIndex, annotation.paragraphPreview, annotation.version);
            // Position it
            const panelId = Object.keys(openNotePanels).pop();
            if (panelId && state.position) {
                const panel = document.getElementById(panelId);
                if (panel) {
                    panel.style.top = state.position.top;
                    panel.style.left = state.position.left;
                    openNotePanels[panelId].position = state.position;
                }
            }
        }
    });
}

// Legacy function names for compatibility
function closeAnnotationModal() {
    // Close the most recently opened panel
    const panelIds = Object.keys(openNotePanels);
    if (panelIds.length > 0) {
        closeNotePanel(panelIds[panelIds.length - 1]);
    }
}

function saveAnnotation() {
    // Save the most recently opened panel
    const panelIds = Object.keys(openNotePanels);
    if (panelIds.length > 0) {
        const panel = document.getElementById(panelIds[panelIds.length - 1]);
        if (panel) saveNotePanel(panel);
    }
}

function deleteAnnotation(annotationId) {
    if (!annotationId) return;

    showConfirmDialog(
        'Delete Annotation',
        'Are you sure you want to delete this annotation?',
        () => {
            delete annotations[annotationId];
            saveAnnotationsToStorage();
            closeAnnotationModal();
            refreshAnnotationsUI();
            markAnnotatedParagraphs();
        },
        { confirmText: 'Delete', type: 'danger', confirmIcon: 'trash-2' }
    );
}

function getAnnotationsForCurrentView() {
    return Object.values(annotations).filter(a =>
        (a.version === versionA || a.version === versionB) &&
        a.chapter === currentChapter
    );
}

function getAllAnnotationsCount() {
    return Object.keys(annotations).length;
}

function refreshAnnotationsUI() {
    const list = document.getElementById('annotations-list');
    const empty = document.getElementById('annotations-empty');
    const countBadge = document.getElementById('annotations-count');

    if (!list) return;

    const allAnnotations = Object.values(annotations);
    const count = allAnnotations.length;

    // Update badge
    if (countBadge) {
        countBadge.textContent = count;
        if (count > 0) {
            countBadge.classList.remove('hidden');
        } else {
            countBadge.classList.add('hidden');
        }
    }

    // Update list
    list.innerHTML = '';

    if (count === 0) {
        if (empty) empty.style.display = 'block';
        return;
    }

    if (empty) empty.style.display = 'none';

    // Group annotations by version and chapter
    const byVersionChapter = {};
    allAnnotations.forEach(a => {
        const key = `${a.version}:${a.chapter}`;
        if (!byVersionChapter[key]) {
            byVersionChapter[key] = {
                version: a.version,
                chapter: a.chapter,
                annotations: []
            };
        }
        byVersionChapter[key].annotations.push(a);
    });

    // Render grouped annotations
    Object.values(byVersionChapter).forEach(group => {
        const groupEl = document.createElement('div');
        groupEl.className = 'annotation-group';

        const header = document.createElement('div');
        header.className = 'annotation-group-header';
        header.textContent = `${formatVersionLabel(group.version)} — ${formatChapterLabel(group.chapter)}`;
        groupEl.appendChild(header);

        group.annotations.sort((a, b) => a.paragraphIndex - b.paragraphIndex).forEach(ann => {
            const item = document.createElement('div');
            item.className = 'annotation-item';
            item.innerHTML = `
                <div class="annotation-item-header">
                    <span class="annotation-para-num">¶${ann.paragraphIndex + 1}</span>
                    <span class="annotation-preview-text">${ann.paragraphPreview}...</span>
                    <span class="annotation-item-actions">
                        <button class="annotation-action-btn edit-btn" title="Edit annotation"><i data-lucide="pencil"></i></button>
                        <button class="annotation-action-btn delete-btn" title="Delete annotation"><i data-lucide="trash-2"></i></button>
                    </span>
                </div>
                <div class="annotation-item-note">${ann.note.substring(0, 100)}${ann.note.length > 100 ? '...' : ''}</div>
            `;
            // Render Lucide icons in the new content
            if (typeof lucide !== 'undefined') {
                lucide.createIcons({ nodes: [item] });
            }

            // Click on item jumps to annotation
            item.addEventListener('click', (e) => {
                // Don't jump if clicking action buttons
                if (e.target.closest('.annotation-action-btn')) return;
                jumpToAnnotation(ann);
            });

            // Edit button
            const editBtn = item.querySelector('.edit-btn');
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeAllNavDropdowns();
                openAnnotationModal(ann.paragraphIndex, ann.paragraphPreview, ann.version);
            });

            // Delete button
            const deleteBtn = item.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const previewText = ann.note.substring(0, 50) + (ann.note.length > 50 ? '...' : '');
                showConfirmDialog(
                    'Delete Annotation',
                    `Are you sure you want to delete this annotation?\n\n"${previewText}"`,
                    () => {
                        delete annotations[ann.id];
                        saveAnnotationsToStorage();
                        refreshAnnotationsUI();
                        markAnnotatedParagraphs();
                    },
                    { confirmText: 'Delete', type: 'danger', confirmIcon: 'trash-2' }
                );
            });

            groupEl.appendChild(item);
        });

        list.appendChild(groupEl);
    });
}

function jumpToAnnotation(annotation) {
    // Navigate to the annotation's context
    // Set the annotated version as versionA if it's not already one of the current versions
    if (annotation.version !== versionA && annotation.version !== versionB) {
        // Load the annotated version as version A
        versionA = annotation.version;
        const selectA = document.getElementById('version-a-select');
        if (selectA) selectA.value = versionA;
    }

    currentChapter = annotation.chapter;

    buildChapterNavigation();
    displayComparison();

    // Close dropdown
    closeAllNavDropdowns();

    // Scroll to the annotated paragraph after render
    // Use longer timeout to ensure content is fully rendered
    setTimeout(() => {
        scrollToAnnotatedParagraph(annotation);
    }, 500);
}

function jumpToAnnotationFromPanel(panel) {
    // Extract annotation info from panel data attributes
    const annotation = {
        paragraphIndex: parseInt(panel.dataset.paragraphIndex),
        version: panel.dataset.version,
        chapter: currentChapter
    };

    // If we need to navigate to a different view, do that
    if (annotation.version !== versionA && annotation.version !== versionB) {
        versionA = annotation.version;
        const selectA = document.getElementById('version-a-select');
        if (selectA) selectA.value = versionA;
        displayComparison();
        setTimeout(() => {
            scrollToAnnotatedParagraph(annotation);
        }, 500);
    } else {
        // Just scroll to the paragraph
        scrollToAnnotatedParagraph(annotation);
    }
}

function scrollToAnnotatedParagraph(annotation) {
    const container = document.getElementById('comparison-display');
    if (!container) return;

    // Find the paragraph with matching index in the correct version panel
    const versionPanels = container.querySelectorAll('.version-panel');
    const comparisonGrid = container.querySelector('.comparison-grid');

    let targetPara = null;

    if (versionPanels.length === 2) {
        // Side-by-side view: find paragraph in the correct panel
        const panelIndex = annotation.version === versionA ? 0 : 1;
        const panel = versionPanels[panelIndex];
        if (panel) {
            targetPara = panel.querySelector(`[data-paragraph-index="${annotation.paragraphIndex}"]`);
        }
    } else if (comparisonGrid) {
        // Collation view: find paragraph in correct column
        const allDivs = Array.from(comparisonGrid.children);
        const startIndex = annotation.version === versionA ? 0 : 1;
        for (let i = startIndex; i < allDivs.length; i += 2) {
            if (allDivs[i].dataset.paragraphIndex === String(annotation.paragraphIndex)) {
                targetPara = allDivs[i];
                break;
            }
        }
    } else {
        // Diff or unified view - try multiple selectors
        targetPara = container.querySelector(`[data-paragraph-index="${annotation.paragraphIndex}"]`);

        // Fallback: try finding by paragraph number in any view
        if (!targetPara) {
            const allParas = container.querySelectorAll('[data-paragraph-index]');
            for (const p of allParas) {
                if (parseInt(p.dataset.paragraphIndex) === annotation.paragraphIndex) {
                    targetPara = p;
                    break;
                }
            }
        }
    }

    if (targetPara) {
        targetPara.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add a brief highlight effect
        targetPara.classList.add('annotation-jump-highlight');
        setTimeout(() => {
            targetPara.classList.remove('annotation-jump-highlight');
        }, 2000);
    }
}

function markAnnotatedParagraphs() {
    // Remove existing markers
    document.querySelectorAll('.annotation-indicator').forEach(el => el.remove());
    document.querySelectorAll('.has-annotation').forEach(el => el.classList.remove('has-annotation'));

    const currentAnnotations = getAnnotationsForCurrentView();
    if (currentAnnotations.length === 0) return;

    const container = document.getElementById('comparison-display');
    if (!container) return;

    // Get all version panels for side-by-side detection
    const versionPanels = container.querySelectorAll('.version-panel');
    const comparisonGrid = container.querySelector('.comparison-grid');

    currentAnnotations.forEach(ann => {
        // Find paragraphs with matching index
        const matchingParas = container.querySelectorAll(`[data-paragraph-index="${ann.paragraphIndex}"]`);

        matchingParas.forEach(para => {
            // Skip placeholders
            if (para.classList.contains('placeholder')) return;

            // Determine if this paragraph matches the annotation's version
            let paraVersion = null;

            if (para.dataset.versionId) {
                paraVersion = para.dataset.versionId;
            } else if (versionPanels.length === 2) {
                // Side-by-side view: determine by panel position
                const panel = para.closest('.version-panel');
                if (panel) {
                    const panelIndex = Array.from(versionPanels).indexOf(panel);
                    paraVersion = panelIndex === 0 ? versionA : versionB;
                }
            } else if (comparisonGrid) {
                // Collation view: even = A, odd = B
                const allDivs = Array.from(comparisonGrid.children);
                const divIndex = allDivs.indexOf(para);
                paraVersion = (divIndex % 2 === 0) ? versionA : versionB;
            } else if (para.closest('.diff-view')) {
                // Diff view: only mark for versionA annotations
                paraVersion = versionA;
            } else {
                // Unified or other view
                paraVersion = versionA;
            }

            // Only mark if the version matches
            if (paraVersion !== ann.version) return;

            para.classList.add('has-annotation');

            // Add indicator icon
            const indicator = document.createElement('span');
            indicator.className = 'annotation-indicator';
            indicator.innerHTML = '<i data-lucide="sticky-note"></i>';
            indicator.title = 'View/edit annotation';
            indicator.addEventListener('click', (e) => {
                e.stopPropagation();
                openAnnotationModal(ann.paragraphIndex, para.innerHTML || para.textContent, ann.version);
            });

            // Insert at beginning of paragraph
            para.insertBefore(indicator, para.firstChild);
            // Render Lucide icon
            if (typeof lucide !== 'undefined') {
                lucide.createIcons({ nodes: [indicator] });
            }
        });
    });
}

function setupParagraphClickHandlers() {
    const container = document.getElementById('comparison-display');
    if (!container) return;

    container.addEventListener('click', (e) => {
        // Don't open if clicking on the annotation indicator
        if (e.target.classList.contains('annotation-indicator')) return;

        // Find the clicked paragraph - check for various paragraph types
        // Priority: specific classes first, then general p elements in version panels/diff view
        let para = e.target.closest('.comparison-paragraph, .source-paragraph');

        if (!para) {
            // Check for regular p elements in version panels or diff view
            const pElement = e.target.closest('p');
            if (pElement) {
                // Make sure it's within a content area, not a header or other element
                const isInVersionPanel = pElement.closest('.version-panel');
                const isInDiffView = pElement.closest('.diff-view');
                const isInUnifiedView = pElement.closest('#comparison-display') && !pElement.closest('.modal');
                if (isInVersionPanel || isInDiffView || isInUnifiedView) {
                    // Exclude non-content paragraphs
                    if (!pElement.classList.contains('empty-note') &&
                        !pElement.classList.contains('word-count') &&
                        !pElement.closest('.modal')) {
                        para = pElement;
                    }
                }
            }
        }

        if (!para) return;

        // Find paragraph index - prefer the data attribute if available
        let index = -1;
        if (para.dataset.paragraphIndex !== undefined) {
            index = parseInt(para.dataset.paragraphIndex);
        } else {
            // Fallback: find index by searching in DOM
            const allParas = getParagraphsInCurrentView();
            index = Array.from(allParas).indexOf(para);
        }

        // Determine which version this paragraph belongs to
        let version = null;

        // Check for explicit version ID on the paragraph
        if (para.dataset.versionId) {
            version = para.dataset.versionId;
        } else {
            // Determine version by context
            const versionPanel = para.closest('.version-panel');
            if (versionPanel) {
                // In side-by-side view, check which panel (first = A, second = B)
                const allPanels = document.querySelectorAll('.version-panel');
                const panelIndex = Array.from(allPanels).indexOf(versionPanel);
                version = panelIndex === 0 ? versionA : versionB;
            } else if (para.closest('.comparison-grid')) {
                // In collation view, check if this is in an odd or even position
                const grid = para.closest('.comparison-grid');
                const allDivs = Array.from(grid.children);
                const divIndex = allDivs.indexOf(para);
                // Even indices (0, 2, 4...) are version A, odd (1, 3, 5...) are version B
                version = (divIndex % 2 === 0) ? versionA : versionB;
            } else if (para.closest('.diff-view')) {
                // In diff/track changes view - use versionA as the base
                version = versionA;
            } else if (para.closest('.unified-view')) {
                // Unified view shows one version - check current selector
                const selectA = document.getElementById('version-a-select');
                version = selectA ? selectA.value : versionA;
            } else {
                // Default fallback
                version = versionA;
            }
        }

        if (index >= 0 && version) {
            openAnnotationModal(index, para.innerHTML || para.textContent, version, e);
        }
    });
}

function getParagraphsInCurrentView() {
    const container = document.getElementById('comparison-display');
    if (!container) return [];

    // Get paragraphs based on current view mode
    const comparisonParas = container.querySelectorAll('.comparison-paragraph:not(.placeholder)');
    if (comparisonParas.length > 0) {
        return comparisonParas;
    }

    const sourceParas = container.querySelectorAll('.source-paragraph');
    if (sourceParas.length > 0) {
        return sourceParas;
    }

    // For side-by-side, diff, and unified views - get p elements
    // Exclude empty notes and other non-content paragraphs
    const pElements = container.querySelectorAll('.version-panel p:not(.empty-note), .diff-view p:not(.empty-note)');
    if (pElements.length > 0) {
        return pElements;
    }

    // Fallback for unified view
    return container.querySelectorAll('p:not(.empty-note):not(.word-count)');
}

// Export/Import functionality

function openExportModal() {
    closeAllModals();
    const modal = document.getElementById('export-modal');
    if (modal) modal.classList.remove('hidden');
}

function closeExportModal() {
    const modal = document.getElementById('export-modal');
    if (modal) modal.classList.add('hidden');
}

function exportToJSON() {
    const data = {
        exportDate: new Date().toISOString(),
        version: '1.0',
        bookmarks: bookmarks,
        annotations: annotations
    };

    const json = JSON.stringify(data, null, 2);
    downloadFile(json, 'subcutanean-notes.json', 'application/json');
    closeExportModal();
}

function exportToMarkdown() {
    let md = '# Subcutanean Variorum - Research Notes\n\n';
    md += `Exported: ${new Date().toLocaleDateString()}\n\n`;

    // Bookmarks section
    const bookmarksWithNotes = bookmarks.filter(b => b.notes && b.notes.trim());
    if (bookmarksWithNotes.length > 0) {
        md += '## Bookmarks\n\n';
        bookmarksWithNotes.forEach(b => {
            md += `### ${b.name}\n`;
            md += `- **Versions:** ${formatVersionLabel(b.versionA)} vs ${formatVersionLabel(b.versionB)}\n`;
            md += `- **Chapter:** ${formatChapterLabel(b.chapter)}\n`;
            md += `- **View:** ${formatModeLabel(b.mode)}\n`;
            md += `\n**Notes:**\n${b.notes}\n\n---\n\n`;
        });
    }

    // Annotations section
    const allAnnotations = Object.values(annotations);
    if (allAnnotations.length > 0) {
        md += '## Passage Annotations\n\n';

        // Group by version and chapter
        const byVersionChapter = {};
        allAnnotations.forEach(a => {
            const key = `${a.version}:${a.chapter}`;
            if (!byVersionChapter[key]) byVersionChapter[key] = [];
            byVersionChapter[key].push(a);
        });

        Object.values(byVersionChapter).forEach(anns => {
            const first = anns[0];
            md += `### ${formatVersionLabel(first.version)} — ${formatChapterLabel(first.chapter)}\n\n`;

            anns.sort((a, b) => a.paragraphIndex - b.paragraphIndex).forEach(a => {
                md += `**Paragraph ${a.paragraphIndex + 1}:** "${a.paragraphPreview}..."\n\n`;
                md += `${a.note}\n\n---\n\n`;
            });
        });
    }

    if (bookmarksWithNotes.length === 0 && allAnnotations.length === 0) {
        md += '*No annotations or bookmarks with notes to export.*\n';
    }

    downloadFile(md, 'subcutanean-notes.md', 'text/markdown');
    closeExportModal();
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importAnnotationsFromFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target.result;
        const isMarkdown = file.name.toLowerCase().endsWith('.md');

        try {
            if (isMarkdown) {
                importFromMarkdown(content);
            } else {
                importFromJSON(content);
            }
            showNotification('Import successful! Your annotations and bookmarks have been loaded.', 'success');
        } catch (error) {
            console.error('Import error:', error);
            showNotification(`Failed to import file. ${error.message || 'Please ensure it is a valid export file.'}`, 'error');
        }
    };
    reader.readAsText(file);
}

function importFromJSON(content) {
    const data = JSON.parse(content);

    // Import bookmarks
    if (data.bookmarks && Array.isArray(data.bookmarks)) {
        data.bookmarks.forEach(b => {
            // Check if bookmark with same ID exists
            if (!bookmarks.find(existing => existing.id === b.id)) {
                bookmarks.push(b);
            }
        });
        saveBookmarksToStorage();
        refreshBookmarkUI();
    }

    // Import annotations
    if (data.annotations && typeof data.annotations === 'object') {
        Object.entries(data.annotations).forEach(([id, ann]) => {
            // Check if annotation with same ID exists
            if (!annotations[id]) {
                annotations[id] = ann;
            }
        });
        saveAnnotationsToStorage();
        refreshAnnotationsUI();
        markAnnotatedParagraphs();
    }
}

function importFromMarkdown(content) {
    const lines = content.split('\n');
    let currentSection = null; // 'bookmarks' or 'annotations'
    let currentVersion = null;
    let currentChapter = null;
    let currentParagraphIndex = null;
    let currentParagraphPreview = null;
    let currentNote = [];
    let importedCount = 0;

    // Helper to parse version label back to ID (e.g., "Seed 45443" -> "45443")
    function parseVersionId(label) {
        const match = label.match(/Seed\s*(\d+)/i);
        return match ? match[1] : label;
    }

    // Helper to parse chapter label back to ID (e.g., "Ch 5" -> "chapter5")
    function parseChapterId(label) {
        // Handle "Ch 5" or "Chapter 5" format
        const chMatch = label.match(/Ch(?:apter)?\s*(\d+)/i);
        if (chMatch) {
            return `chapter${chMatch[1]}`;
        }
        // Handle special chapters
        if (label.toLowerCase().includes('part i') && !label.toLowerCase().includes('part ii')) return 'prologue';
        if (label.toLowerCase().includes('part ii') && !label.toLowerCase().includes('part iii')) return 'part2';
        if (label.toLowerCase().includes('part iii')) return 'part3';
        if (label.toLowerCase().includes('prologue')) return 'prologue';
        if (label.toLowerCase().includes('epilogue')) return 'chapter18';
        if (label.toLowerCase().includes('notes')) return 'notes';
        if (label.toLowerCase().includes('introduction')) return 'introduction';
        return label.toLowerCase().replace(/\s+/g, '');
    }

    // Save current annotation if we have one
    function saveCurrentAnnotation() {
        if (currentVersion && currentChapter && currentParagraphIndex !== null && currentNote.length > 0) {
            const noteText = currentNote.join('\n').trim();
            if (noteText) {
                const id = `annotation-import-${Date.now()}-${importedCount}`;
                const now = new Date().toISOString();
                annotations[id] = {
                    id: id,
                    created: now,
                    modified: now,
                    version: currentVersion,
                    chapter: currentChapter,
                    paragraphIndex: currentParagraphIndex,
                    paragraphPreview: currentParagraphPreview || '',
                    note: noteText
                };
                importedCount++;
            }
        }
        currentNote = [];
        currentParagraphIndex = null;
        currentParagraphPreview = null;
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Detect sections
        if (line.startsWith('## Bookmarks')) {
            saveCurrentAnnotation();
            currentSection = 'bookmarks';
            continue;
        }
        if (line.startsWith('## Passage Annotations')) {
            saveCurrentAnnotation();
            currentSection = 'annotations';
            continue;
        }

        // Skip if not in annotations section (bookmarks import from markdown not supported - use JSON)
        if (currentSection !== 'annotations') continue;

        // Parse version/chapter header: ### Seed 45443 — Chapter 5
        if (line.startsWith('### ')) {
            saveCurrentAnnotation();
            const headerMatch = line.match(/^###\s+(.+?)\s*[—–-]\s*(.+)$/);
            if (headerMatch) {
                currentVersion = parseVersionId(headerMatch[1].trim());
                currentChapter = parseChapterId(headerMatch[2].trim());
            }
            continue;
        }

        // Parse paragraph line: **Paragraph 12:** "The door creaked..."
        if (line.startsWith('**Paragraph ')) {
            saveCurrentAnnotation();
            const paraMatch = line.match(/^\*\*Paragraph\s+(\d+):\*\*\s*"?(.+?)"?\.{0,3}$/);
            if (paraMatch) {
                currentParagraphIndex = parseInt(paraMatch[1]) - 1; // Convert to 0-based
                currentParagraphPreview = paraMatch[2].replace(/\.{3}$/, '').replace(/"$/, '');
            }
            continue;
        }

        // Skip horizontal rules
        if (line.trim() === '---') {
            continue;
        }

        // Accumulate note content
        if (currentParagraphIndex !== null && line.trim()) {
            currentNote.push(line);
        }
    }

    // Save final annotation
    saveCurrentAnnotation();

    if (importedCount > 0) {
        saveAnnotationsToStorage();
        refreshAnnotationsUI();
        markAnnotatedParagraphs();
    }

    if (importedCount === 0) {
        throw new Error('No annotations found in the markdown file.');
    }
}

function openFilesPanel() {
    const panel = document.getElementById('files-panel');
    if (!panel) return;
    const defaultBottomOffset = 'calc(9.5rem + 4rem)';
    if (filesPanelPosition.x !== null && filesPanelPosition.y !== null) {
        panel.style.left = `${filesPanelPosition.x}px`;
        panel.style.top = `${filesPanelPosition.y}px`;
        panel.style.bottom = 'auto';
        panel.style.right = 'auto';
    } else {
        panel.style.left = '1.5rem';
        panel.style.bottom = defaultBottomOffset;
        panel.style.top = 'auto';
        panel.style.right = 'auto';
    }
    panel.classList.remove('hidden');
    filesPanelOpen = true;
}

function closeFilesPanel() {
    const panel = document.getElementById('files-panel');
    if (!panel) return;
    panel.classList.add('hidden');
    filesPanelOpen = false;
}

function toggleFilesPanel() {
    if (filesPanelOpen) {
        closeFilesPanel();
    } else {
        openFilesPanel();
    }
}

function setupFilesPanelDragging() {
    const panel = document.getElementById('files-panel');
    const header = panel ? panel.querySelector('.files-panel-header') : null;
    if (!panel || !header) return;

    let dragging = false;
    let startX = 0;
    let startY = 0;
    let panelX = 0;
    let panelY = 0;

    const onPointerMove = (event) => {
        if (!dragging) return;
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        const newX = panelX + dx;
        const newY = panelY + dy;
        panel.style.left = `${newX}px`;
        panel.style.top = `${newY}px`;
        panel.style.bottom = 'auto';
        panel.style.right = 'auto';
        filesPanelPosition = { x: newX, y: newY };
    };

    const onPointerUp = () => {
        dragging = false;
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
    };

    header.addEventListener('pointerdown', (event) => {
        const target = event.target;
        if (target && target.closest('.files-close-btn')) {
            return;
        }
        dragging = true;
        panelX = panel.offsetLeft;
        panelY = panel.offsetTop;
        startX = event.clientX;
        startY = event.clientY;
        panel.setPointerCapture(event.pointerId);
        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);
    });
}

function openBookmarkPanel() {
    const panel = document.getElementById('bookmark-panel');
    if (!panel) return;
    const defaultBottomOffset = 'calc(5.5rem + 4rem)';
    if (bookmarkPanelPosition.x !== null && bookmarkPanelPosition.y !== null) {
        panel.style.left = `${bookmarkPanelPosition.x}px`;
        panel.style.top = `${bookmarkPanelPosition.y}px`;
        panel.style.bottom = 'auto';
    } else {
        panel.style.left = '1.5rem';
        panel.style.bottom = defaultBottomOffset;
        panel.style.top = 'auto';
    }
    panel.classList.remove('hidden');
    bookmarkPanelOpen = true;
}

function closeBookmarkPanel() {
    const panel = document.getElementById('bookmark-panel');
    if (!panel) return;
    panel.classList.add('hidden');
    bookmarkPanelOpen = false;
}

function toggleBookmarkPanel() {
    if (bookmarkPanelOpen) {
        closeBookmarkPanel();
    } else {
        openBookmarkPanel();
    }
}

function setupBookmarkPanelDragging() {
    const panel = document.getElementById('bookmark-panel');
    const header = panel ? panel.querySelector('.bookmark-panel-header') : null;
    if (!panel || !header) return;

    let dragging = false;
    let startX = 0;
    let startY = 0;
    let panelX = 0;
    let panelY = 0;

    const onPointerMove = (event) => {
        if (!dragging) return;
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        const newX = panelX + dx;
        const newY = panelY + dy;
        panel.style.left = `${newX}px`;
        panel.style.top = `${newY}px`;
        panel.style.bottom = 'auto';
        bookmarkPanelPosition = { x: newX, y: newY };
    };

    const onPointerUp = () => {
        dragging = false;
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
    };

    header.addEventListener('pointerdown', (event) => {
        const target = event.target;
        if (target && target.closest('.bookmark-close-btn')) {
            return;
        }
        dragging = true;
        panelX = panel.offsetLeft;
        panelY = panel.offsetTop;
        startX = event.clientX;
        startY = event.clientY;
        panel.setPointerCapture(event.pointerId);
        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);
    });
}

function getSourceKeyForChapter(chapterId) {
    return SOURCE_KEY_BY_CHAPTER[chapterId] || null;
}

function updateSourceContent(key) {
    const contentEl = document.getElementById('source-content');
    const headerTitle = document.getElementById('source-panel-title');
    if (!contentEl) return;

    if (!originSources || !originSources.chapters[key]) {
        contentEl.textContent = 'Source not available for this selection.';
        if (headerTitle) {
            headerTitle.textContent = 'Source Unavailable';
        }
        return;
    }

    currentSourceKey = key;
    const chapter = originSources.chapters[key];
    contentEl.textContent = chapter.content;
    if (headerTitle) {
        headerTitle.textContent = `${chapter.title} Source Code`;
    }
}

function syncSourceToCurrentChapter() {
    if (!originSources) return;
    const key = getSourceKeyForChapter(currentChapter);
    if (!key || !originSources.chapters[key]) {
        const headerTitle = document.getElementById('source-panel-title');
        if (headerTitle) {
            headerTitle.textContent = 'No Source Mapping';
        }
        return;
    }
    updateSourceContent(key);
}

function openSourcePanel() {
    const panel = document.getElementById('source-panel');
    if (!panel) return;
    const defaultBottomOffset = 'calc(5.5rem + 4rem)';
    closeFilesPanel();
    if (sourcePanelPosition.x !== null && sourcePanelPosition.y !== null) {
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
        panel.style.left = `${sourcePanelPosition.x}px`;
        panel.style.top = `${sourcePanelPosition.y}px`;
    } else {
        panel.style.left = '1.5rem';
        panel.style.bottom = defaultBottomOffset;
        panel.style.top = 'auto';
        panel.style.right = 'auto';
    }
    panel.classList.remove('hidden');
    originSourcePanelOpen = true;
    const filesFloating = document.getElementById('files-floating');
    if (filesFloating) {
        filesFloating.classList.add('fab-hidden');
    }
    if (originSources) {
        syncSourceToCurrentChapter();
    }
}

function closeSourcePanel() {
    const panel = document.getElementById('source-panel');
    if (!panel) return;
    panel.classList.add('hidden');
    originSourcePanelOpen = false;
    const filesFloating = document.getElementById('files-floating');
    if (filesFloating) {
        filesFloating.classList.remove('fab-hidden');
    }
}

function toggleSourcePanel() {
    if (originSourcePanelOpen) {
        closeSourcePanel();
    } else {
        openSourcePanel();
    }
}

function setupSourcePanelDragging() {
    const panel = document.getElementById('source-panel');
    const header = document.getElementById('source-panel-header') || document.querySelector('.source-panel-header');
    if (!panel || !header) return;

    let dragging = false;
    let startX = 0;
    let startY = 0;
    let panelX = 0;
    let panelY = 0;

    const onPointerMove = (event) => {
        if (!dragging) return;
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        const newX = panelX + dx;
        const newY = panelY + dy;
        panel.style.left = `${newX}px`;
        panel.style.top = `${newY}px`;
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
        sourcePanelPosition = { x: newX, y: newY };
    };

    const onPointerUp = () => {
        dragging = false;
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
    };

    header.addEventListener('pointerdown', (event) => {
        const target = event.target;
        if (target && (target.closest('.source-close-btn') || target.closest('.tool-btn'))) {
            return;
        }
        dragging = true;
        panelX = panel.offsetLeft;
        panelY = panel.offsetTop;
        startX = event.clientX;
        startY = event.clientY;
        panel.setPointerCapture(event.pointerId);
        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);
    });
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
    closeAllModals();
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

async function loadOriginSources() {
    try {
        const originResponse = await fetch('origin_text/origin_sources.json');
        if (!originResponse.ok) {
            throw new Error(`HTTP ${originResponse.status}`);
        }
        originSources = await originResponse.json();
        originSourcesLoaded = true;
        sourceParagraphCache = {};
        versionChapterTextCache = {};
        currentSourceKey = getSourceKeyForChapter(currentChapter);
        if (originSourcePanelOpen) {
            syncSourceToCurrentChapter();
        }
        populateVersionSelectors();
        buildChapterNavigation();
        updateToolbarVisibility();
        displayComparison();
    } catch (error) {
        originSourcesLoaded = false;
        console.error('Error loading origin sources:', error);
    }
}

async function loadVariableInfo() {
    try {
        const response = await fetch('extracted_text/variable_info.json');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        // Handle new structure with variables, groups, macros, and chapter_variables
        if (data.variables) {
            variableInfo = data.variables;
            variableGroups = data.groups || [];
            variableMacros = data.macros || {};
            chapterVariables = data.chapter_variables || {};
        } else {
            // Fallback for old format (direct variable dict)
            variableInfo = data;
            variableGroups = [];
            variableMacros = {};
            chapterVariables = {};
        }
        const chapterVarCount = Object.values(chapterVariables).reduce((sum, defs) => sum + defs.length, 0);
        console.log(`Loaded info for ${Object.keys(variableInfo).length} variables, ${variableGroups.length} groups, ${chapterVarCount} chapter-local vars`);
    } catch (error) {
        console.error('Error loading variable info:', error);
        variableInfo = null;
        variableGroups = [];
        variableMacros = {};
        chapterVariables = {};
    }

    // Load scholarly descriptions (separate from source materials)
    try {
        const response = await fetch('scholarly_descriptions.json');
        if (response.ok) {
            const data = await response.json();
            scholarlyDescriptions = data.variables || {};
            console.log(`Loaded ${Object.keys(scholarlyDescriptions).length} scholarly descriptions`);
        }
    } catch (error) {
        // Scholarly descriptions are optional - don't log error
        scholarlyDescriptions = {};
    }
}

/**
 * Infer which variables are active in an uploaded EPUB based on text patterns.
 * This allows the Variables panel to work even with user-uploaded books.
 *
 * @param {Object} chapters - Object mapping chapter IDs to arrays of paragraphs
 * @returns {Array} - List of inferred variable names
 */
function inferVariablesFromText(chapters) {
    if (!variableInfo || !variableGroups) {
        console.warn('Variable info not loaded, cannot infer variables');
        return [];
    }

    const inferredVars = [];
    const allText = {};

    // Build searchable text for each chapter
    for (const [chapterId, paragraphs] of Object.entries(chapters)) {
        if (Array.isArray(paragraphs)) {
            // Strip HTML tags for pattern matching
            allText[chapterId] = paragraphs.map(p =>
                p.replace(/<[^>]+>/g, '').toLowerCase()
            ).join(' ');
        }
    }
    const fullText = Object.values(allText).join(' ');

    // Process each variable group (mutually exclusive alternatives)
    for (const group of variableGroups) {
        if (!group.variables || group.variables.length < 2) continue;

        let bestMatch = null;
        let bestScore = 0;

        for (const varName of group.variables) {
            const info = variableInfo[varName];
            if (!info || !info.patterns) continue;

            // Count pattern matches across all chapters
            let score = 0;
            for (const [chapterId, patterns] of Object.entries(info.patterns)) {
                const chapterText = allText[chapterId] || fullText;
                for (const pattern of patterns) {
                    // Normalize pattern for matching
                    const normalizedPattern = pattern
                        .replace(/<[^>]+>/g, '')
                        .toLowerCase()
                        .trim();

                    if (normalizedPattern.length >= 10 && chapterText.includes(normalizedPattern)) {
                        score += normalizedPattern.length; // Longer matches = higher confidence
                    }
                }
            }

            if (score > bestScore) {
                bestScore = score;
                bestMatch = varName;
            }
        }

        if (bestMatch) {
            inferredVars.push(bestMatch);
        }
    }

    // Check optional variables (those with ^@ prefix in DEFINE)
    for (const [varName, info] of Object.entries(variableInfo)) {
        if (!info.optional || !info.patterns) continue;

        // Check if any patterns match
        let found = false;
        for (const [chapterId, patterns] of Object.entries(info.patterns)) {
            const chapterText = allText[chapterId] || fullText;
            for (const pattern of patterns) {
                const normalizedPattern = pattern
                    .replace(/<[^>]+>/g, '')
                    .toLowerCase()
                    .trim();

                if (normalizedPattern.length >= 10 && chapterText.includes(normalizedPattern)) {
                    found = true;
                    break;
                }
            }
            if (found) break;
        }

        if (found) {
            inferredVars.push(varName);
        }
    }

    console.log(`Inferred ${inferredVars.length} variables from uploaded text:`, inferredVars);
    return inferredVars;
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

    extractParagraphWithFormatting(element) {
        let result = '';

        element.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
                result += node.textContent;
            } else if (node.nodeName === 'EM' || node.nodeName === 'I') {
                // Handle italics - check for nested bold
                const innerContent = this.extractParagraphWithFormatting(node);
                result += `<em>${innerContent}</em>`;
            } else if (node.nodeName === 'STRONG' || node.nodeName === 'B') {
                // Handle bold - check for nested italics
                const innerContent = this.extractParagraphWithFormatting(node);
                result += `<strong>${innerContent}</strong>`;
            } else if (node.childNodes.length > 0) {
                // Recursively handle other nested elements
                result += this.extractParagraphWithFormatting(node);
            }
        });

        return result.trim();
    }

    // Keep old method name as alias for compatibility
    extractParagraphWithEm(element) {
        return this.extractParagraphWithFormatting(element);
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

        // Infer variables from the uploaded text
        const inferredVariables = inferVariablesFromText(versionData);

        // Store in custom versions
        customVersions[versionId] = {
            name: `Seed ${versionId}`,
            data: versionData,
            uploadDate: new Date().toISOString(),
            variables: inferredVariables
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

        // Track most recently uploaded version
        mostRecentUploadId = versionId;

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

function formatPartHeading(partTitle, subtitleLine) {
    const subtitle = subtitleLine ? subtitleLine.trim() : '';
    const heading = subtitle ? `${partTitle}: ${subtitle.toUpperCase()}` : partTitle;
    return convertTextFormatting(normalizeTextToSmartPunctuation(heading));
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
        let collectingEpigraph = false;
        let epigraphLines = [];

        const finalizeEpigraphBlock = () => {
            if (collectingEpigraph) {
                if (epigraphLines.length > 0) {
                    const epigraphText = epigraphLines.join('<br>');
                    currentParagraphs.push(epigraphText);
                }
                collectingEpigraph = false;
                epigraphLines = [];
            }
        };

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
                let subtitleText = '';
                for (let j = i + 1; j < lines.length; j++) {
                    const nextLine = lines[j].trim();
                    if (nextLine) {
                        subtitleIndex = j;
                        subtitleText = nextLine;
                        break;
                    }
                }

                // Save any previous prologue content (shouldn't happen, but just in case)
                finalizeEpigraphBlock();
                if (currentParagraphs.length > 0) {
                    versionData.prologue = [...currentParagraphs];
                }

                currentSection = 'prologue';
                currentChapter = 'prologue';
                currentParagraphs = [];
                collectingEpigraph = true;
                epigraphLines = [];

                // Mark subtitle line to skip (it will be used in the title)
                if (subtitleIndex !== -1) {
                    skipLines.add(subtitleIndex);
                }

                const headingText = formatPartHeading(line, subtitleText);
                if (headingText) {
                    currentParagraphs.push(headingText);
                }

                continue;
            } else if (line === 'PART TWO') {
                // Look ahead for the subtitle on the next non-empty line to skip it
                let subtitleIndex = -1;
                let subtitleText = '';
                for (let j = i + 1; j < lines.length; j++) {
                    const nextLine = lines[j].trim();
                    if (nextLine) {
                        subtitleIndex = j;
                        subtitleText = nextLine;
                        break;
                    }
                }

                // Save previous chapter if any
                finalizeEpigraphBlock();
                if (currentChapter && currentParagraphs.length > 0) {
                    versionData[currentChapter] = [...currentParagraphs];
                }

                // Treat PART TWO as a chapter to collect its epigram
                currentChapter = 'part2';
                currentParagraphs = [];
                currentSection = 'part2';
                collectingEpigraph = true;
                epigraphLines = [];

                // Mark subtitle line to skip (it will be used in the title)
                if (subtitleIndex !== -1) {
                    skipLines.add(subtitleIndex);
                }

                const headingText = formatPartHeading(line, subtitleText);
                if (headingText) {
                    currentParagraphs.push(headingText);
                }

                continue;
            } else if (line === 'PART THREE') {
                // Look ahead for the subtitle on the next non-empty line to skip it
                let subtitleIndex = -1;
                let subtitleText = '';
                for (let j = i + 1; j < lines.length; j++) {
                    const nextLine = lines[j].trim();
                    if (nextLine) {
                        subtitleIndex = j;
                        subtitleText = nextLine;
                        break;
                    }
                }

                // Save previous chapter if any
                finalizeEpigraphBlock();
                if (currentChapter && currentParagraphs.length > 0) {
                    versionData[currentChapter] = [...currentParagraphs];
                }

                // Treat PART THREE as a chapter to collect its epigram
                currentChapter = 'part3';
                currentParagraphs = [];
                currentSection = 'part3';
                collectingEpigraph = true;
                epigraphLines = [];

                // Mark subtitle line to skip (it will be used in the title)
                if (subtitleIndex !== -1) {
                    skipLines.add(subtitleIndex);
                }

                const headingText = formatPartHeading(line, subtitleText);
                if (headingText) {
                    currentParagraphs.push(headingText);
                }

                continue;
            }

            // Detect chapter markers
            const chapterMatch = line.match(/^Chapter (\d+)$/);
            if (chapterMatch) {
                finalizeEpigraphBlock();
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
                finalizeEpigraphBlock();
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
                finalizeEpigraphBlock();
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
                finalizeEpigraphBlock();
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
                finalizeEpigraphBlock();
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
                finalizeEpigraphBlock();
                // Save previous section if any
                if (currentChapter && currentParagraphs.length > 0) {
                    versionData[currentChapter] = [...currentParagraphs];
                }

                currentChapter = 'aboutauthor';
                currentParagraphs = [];
                currentSection = 'aboutauthor';
                continue;
            }

            if (collectingEpigraph) {
                if (line) {
                    const formattedLine = convertTextFormatting(normalizeTextToSmartPunctuation(line));
                    epigraphLines.push(formattedLine);
                } else if (epigraphLines.length > 0) {
                    const epigraphText = epigraphLines.join('<br>');
                    currentParagraphs.push(epigraphText);
                    epigraphLines = [];
                    collectingEpigraph = false;
                }
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
        finalizeEpigraphBlock();
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

        // Infer variables from the uploaded text
        const inferredVariables = inferVariablesFromText(versionData);

        // Store in custom versions
        customVersions[versionId] = {
            name: `Seed ${versionId}`,
            data: versionData,
            uploadDate: new Date().toISOString(),
            variables: inferredVariables
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

        // Track most recently uploaded version
        mostRecentUploadId = versionId;

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
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    initializeTheme();
    setupViewModeButtons();
    loadBookmarksFromStorage();
    refreshBookmarkUI();
    loadAnnotationsFromStorage();
    refreshAnnotationsUI();
    setupParagraphClickHandlers();
    loadAllVersions();
    loadOriginSources();
    loadVariableInfo();
    initializeNavigation();
    initializeGenerateForm();
    initializeGlobalsModal();
    initializeVariablePanel();
    initializeChapterVariablesPanel();
    initializeThirdVersionControls();

    // Theme toggle event listener
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            closeMobileNav();
            toggleTheme();
        });
    }

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

    // Bookmark controls
    const saveBookmarkBtn = document.getElementById('save-bookmark-btn');
    const loadBookmarkBtn = document.getElementById('load-bookmark-btn');
    const deleteBookmarkBtn = document.getElementById('delete-bookmark-btn');
    const bookmarkSelect = document.getElementById('bookmark-select');

    if (saveBookmarkBtn) {
        saveBookmarkBtn.addEventListener('click', saveCurrentBookmark);
    }
    if (loadBookmarkBtn) {
        loadBookmarkBtn.addEventListener('click', () => {
            if (!bookmarkSelect || !bookmarkSelect.value) return;
            if (!allVersions) {
                showNotification('Please wait for the versions to finish loading.', 'info');
                return;
            }
            const bookmark = getBookmarkById(bookmarkSelect.value);
            if (bookmark) {
                applyBookmark(bookmark);
            }
        });
    }
    if (deleteBookmarkBtn) {
        deleteBookmarkBtn.addEventListener('click', deleteSelectedBookmark);
    }
    if (bookmarkSelect) {
        bookmarkSelect.addEventListener('change', updateBookmarkNotesDisplay);
    }

    // Annotation modal events
    const annotationModal = document.getElementById('annotation-modal');
    const closeAnnotationBtn = document.getElementById('close-annotation-modal-btn');
    const saveAnnotationBtn = document.getElementById('save-annotation-btn');
    const deleteAnnotationBtn = document.getElementById('delete-annotation-btn');
    const cancelAnnotationBtn = document.getElementById('cancel-annotation-btn');

    if (closeAnnotationBtn) {
        closeAnnotationBtn.addEventListener('click', closeAnnotationModal);
    }
    if (saveAnnotationBtn) {
        saveAnnotationBtn.addEventListener('click', saveAnnotation);
    }
    if (deleteAnnotationBtn) {
        deleteAnnotationBtn.addEventListener('click', () => {
            if (currentAnnotationId) {
                deleteAnnotation(currentAnnotationId);
            }
        });
    }
    if (cancelAnnotationBtn) {
        cancelAnnotationBtn.addEventListener('click', closeAnnotationModal);
    }
    if (annotationModal) {
        annotationModal.addEventListener('click', (e) => {
            if (e.target === annotationModal) {
                closeAnnotationModal();
            }
        });
    }

    // Export modal events
    const exportModal = document.getElementById('export-modal');
    const closeExportBtn = document.getElementById('close-export-modal-btn');
    const exportJsonBtn = document.getElementById('export-json-btn');
    const exportMarkdownBtn = document.getElementById('export-markdown-btn');
    const exportAnnotationsBtn = document.getElementById('export-annotations-btn');
    const importAnnotationsInput = document.getElementById('import-annotations-input');
    const closeAllNotesBtn = document.getElementById('close-all-notes-btn');

    if (closeAllNotesBtn) {
        closeAllNotesBtn.addEventListener('click', closeAllNotePanels);
    }
    if (exportAnnotationsBtn) {
        exportAnnotationsBtn.addEventListener('click', openExportModal);
    }
    if (closeExportBtn) {
        closeExportBtn.addEventListener('click', closeExportModal);
    }
    if (exportJsonBtn) {
        exportJsonBtn.addEventListener('click', exportToJSON);
    }
    if (exportMarkdownBtn) {
        exportMarkdownBtn.addEventListener('click', exportToMarkdown);
    }
    if (exportModal) {
        exportModal.addEventListener('click', (e) => {
            if (e.target === exportModal) {
                closeExportModal();
            }
        });
    }
    if (importAnnotationsInput) {
        importAnnotationsInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                importAnnotationsFromFile(e.target.files[0]);
                e.target.value = ''; // Reset to allow reimport of same file
            }
        });
    }

    const syntaxToggleBtn = document.getElementById('syntax-toggle-btn');
    if (syntaxToggleBtn) {
        syntaxToggleBtn.addEventListener('click', () => {
            if (!isSourceCodeVisible()) return;
            sourceSyntaxHighlightingEnabled = !sourceSyntaxHighlightingEnabled;
            updateToolbarVisibility();
            displayComparison();
        });
    }

    updateToolbarVisibility();


    // Manage uploads event listeners
    const manageUploadsBtn = document.getElementById('manage-uploads-btn');
    const closeManageModalBtn = document.getElementById('close-manage-modal-btn');
    const manageModal = document.getElementById('manage-uploads-modal');

    manageUploadsBtn.addEventListener('click', () => {
        closeAllNavDropdowns();
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
    const closeAboutModalBtn = document.getElementById('close-about-modal-btn');
    const aboutModal = document.getElementById('about-modal');

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

    // Jaccard Distance functionality
    function openJaccardModal() {
        closeAllModals();
        const modal = document.getElementById('levenshtein-modal');
        modal.classList.remove('hidden');

        displayJaccardAnalysis();
    }

    function closeJaccardModal() {
        const modal = document.getElementById('levenshtein-modal');
        modal.classList.add('hidden');

        // Hide matrix if it's showing
        const matrix = document.getElementById('distance-matrix');
        matrix.classList.add('hidden');

        const showMatrixBtn = document.getElementById('show-matrix-btn');
        showMatrixBtn.textContent = 'Show All Uploaded Files';
    }

    function displayJaccardAnalysis() {
        // Section 1: Jaccard distance between currently selected versions
        const vocabA = getVocabularySet(versionA);
        const vocabB = getVocabularySet(versionB);
        const currentDistance = calculateJaccardDistance(vocabA, vocabB);
        const currentSimilarity = ((1 - currentDistance) * 100).toFixed(1);

        document.getElementById('most-similar-seeds').textContent = `${formatVersionLabel(versionA)} & ${formatVersionLabel(versionB)}`;
        document.getElementById('most-similar-distance').textContent = `${currentSimilarity}% vocabulary overlap`;

        // Setup load button (disabled since these are already loaded)
        const loadSimilarBtn = document.getElementById('load-most-similar-btn');
        loadSimilarBtn.textContent = 'Currently Loaded';
        loadSimilarBtn.disabled = true;
        loadSimilarBtn.style.opacity = '0.5';

        // Section 2: Most recently uploaded file analysis
        const loadClosestBtn = document.getElementById('load-closest-btn');
        const loadFarthestBtn = document.getElementById('load-farthest-btn');

        if (mostRecentUploadId) {
            const uploadResults = findSimilarVersions(mostRecentUploadId);

            document.getElementById('most-different-seeds').textContent = `Seed ${mostRecentUploadId}`;

            const closestMatch = `Closest: Seed ${uploadResults.mostSimilar.versionId} (${uploadResults.mostSimilar.similarity}% overlap)`;
            const farthestMatch = `Farthest: Seed ${uploadResults.mostDifferent.versionId} (${uploadResults.mostDifferent.similarity}% overlap)`;

            document.getElementById('most-different-distance').innerHTML =
                `${closestMatch}<br>${farthestMatch}`;

            // Setup Load Closest Match button
            loadClosestBtn.style.display = '';
            loadClosestBtn.textContent = 'Load Closest Match';
            loadClosestBtn.disabled = false;
            loadClosestBtn.style.opacity = '1';
            loadClosestBtn.onclick = () => {
                closeJaccardModal();
                loadVersionPair(mostRecentUploadId, uploadResults.mostSimilar.versionId);
            };

            // Setup Load Farthest Match button
            loadFarthestBtn.style.display = ''; // Show button
            loadFarthestBtn.textContent = 'Load Farthest Match';
            loadFarthestBtn.disabled = false;
            loadFarthestBtn.style.opacity = '1';
            loadFarthestBtn.onclick = () => {
                closeJaccardModal();
                loadVersionPair(mostRecentUploadId, uploadResults.mostDifferent.versionId);
            };
        } else {
            // No uploads yet
            document.getElementById('most-different-seeds').textContent = 'No uploads yet';
            document.getElementById('most-different-distance').textContent = 'Upload a file to see similarity analysis';

            // Make upload buttons trigger file upload
            loadClosestBtn.textContent = 'Upload a File';
            loadClosestBtn.disabled = false;
            loadClosestBtn.style.opacity = '1';
            loadClosestBtn.onclick = () => {
                closeJaccardModal();
                document.getElementById('epub-upload').click();
            };

            loadFarthestBtn.style.display = 'none'; // Hide second button when no uploads
        }
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

    function toggleUploadedFilesMatrix() {
        const matrix = document.getElementById('distance-matrix');
        const showMatrixBtn = document.getElementById('show-matrix-btn');

        if (matrix.classList.contains('hidden')) {
            generateUploadedFilesMatrix();
            matrix.classList.remove('hidden');
            matrix.style.display = ''; // Ensure display is not set to none
            showMatrixBtn.textContent = 'Hide Uploaded Files';
        } else {
            matrix.classList.add('hidden');
            matrix.style.display = 'none'; // Explicitly hide
            showMatrixBtn.textContent = 'Show All Uploaded Files';
        }
    }

    function generateUploadedFilesMatrix() {
        const matrixContainer = document.getElementById('distance-matrix');

        // Get all uploaded versions
        const uploadedVersionIds = Object.keys(customVersions);

        if (uploadedVersionIds.length === 0) {
            matrixContainer.innerHTML = '<p style="padding: 20px; text-align: center;">No uploaded files yet. Upload a file to see similarity comparisons.</p>';
            return;
        }

        let html = '<div style="padding: 20px;"><h3>Uploaded Files Jaccard Distance Analysis</h3>';

        // For each uploaded file, show its closest and farthest matches
        uploadedVersionIds.forEach(uploadId => {
            const results = findSimilarVersions(uploadId);

            html += `<div style="margin-bottom: 30px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 5px;">`;
            html += `<h4>Seed ${uploadId}</h4>`;
            html += `<p><strong>Closest match:</strong> Seed ${results.mostSimilar.versionId} `;
            html += `(${results.mostSimilar.similarity}% vocabulary overlap)`;
            if (results.mostSimilar.isCustom) {
                html += ` 📎`;
            }
            html += ` <button onclick="loadVersionsFromMatrix('${uploadId}', '${results.mostSimilar.versionId}')" style="margin-left: 10px;" class="tool-btn">Load</button></p>`;

            html += `<p><strong>Farthest match:</strong> Seed ${results.mostDifferent.versionId} `;
            html += `(${results.mostDifferent.similarity}% vocabulary overlap)`;
            if (results.mostDifferent.isCustom) {
                html += ` 📎`;
            }
            html += ` <button onclick="loadVersionsFromMatrix('${uploadId}', '${results.mostDifferent.versionId}')" style="margin-left: 10px;" class="tool-btn">Load</button></p>`;

            html += `</div>`;
        });

        html += '</div>';
        matrixContainer.innerHTML = html;
    }

    // Make this function global so it can be called from onclick
    window.loadVersionsFromMatrix = function(version1, version2) {
        closeJaccardModal();
        loadVersionPair(version1, version2);
    };

    // Chapter Heatmap functionality
    function openHeatmapModal() {
        closeAllModals();
        const modal = document.getElementById('heatmap-modal');
        modal.classList.remove('hidden');
        displayChapterHeatmap();
    }

    function closeHeatmapModal() {
        const modal = document.getElementById('heatmap-modal');
        modal.classList.add('hidden');
    }

    function calculateChapterVariation(chapterId) {
        // Get paragraphs for all versions
        const dataA = allVersions[versionA];
        const dataB = allVersions[versionB];
        const dataC = versionC ? allVersions[versionC] : null;

        if (!dataA || !dataB) return { variation: 0, identical: 0, different: 0, total: 0, twoMatch: 0, allDiffer: 0 };

        const parasA = dataA[chapterId] || [];
        const parasB = dataB[chapterId] || [];
        const parasC = dataC ? (dataC[chapterId] || []) : null;

        if (versionC && parasC) {
            // Three-way comparison using proper alignment
            const alignments = alignThreeParagraphs(parasA, parasB, parasC);
            if (alignments.length === 0) return { variation: 0, identical: 0, different: 0, total: 0, twoMatch: 0, allDiffer: 0 };

            let allMatch = 0;
            let twoMatch = 0;
            let allDiffer = 0;

            alignments.forEach(alignment => {
                const type = alignment.type;
                if (type === 'abc-identical') {
                    allMatch++;
                } else if (type === 'ab-match' || type === 'ac-match' || type === 'bc-match') {
                    twoMatch++;
                } else {
                    // unique-a, unique-b, unique-c, all-different
                    allDiffer++;
                }
            });

            const total = allMatch + twoMatch + allDiffer;
            // Weighted variation: allDiffer counts fully, twoMatch counts as half
            const variation = total > 0 ? ((allDiffer + twoMatch * 0.5) / total) * 100 : 0;

            return { variation, identical: allMatch, different: allDiffer, total, twoMatch, allDiffer };
        } else {
            // Two-version comparison using proper alignment
            const alignments = alignParagraphs(parasA, parasB);
            if (alignments.length === 0) return { variation: 0, identical: 0, different: 0, total: 0, twoMatch: 0, allDiffer: 0 };

            let identical = 0;
            let different = 0;

            alignments.forEach(alignment => {
                if (alignment.type === 'identical') {
                    identical++;
                } else {
                    // modified, unique-a, unique-b all count as different
                    different++;
                }
            });

            const total = identical + different;
            const variation = total > 0 ? (different / total) * 100 : 0;

            return { variation, identical, different, total, twoMatch: 0, allDiffer: different };
        }
    }

    function getHeatmapColor(variation) {
        // variation is 0-100
        if (variation < 5) {
            return 'rgba(76, 175, 80, 0.6)'; // Green - nearly identical
        } else if (variation < 20) {
            return 'rgba(139, 195, 74, 0.6)'; // Light green
        } else if (variation < 40) {
            return 'rgba(255, 193, 7, 0.7)'; // Yellow
        } else if (variation < 60) {
            return 'rgba(255, 152, 0, 0.8)'; // Orange
        } else if (variation < 80) {
            return 'rgba(255, 87, 34, 0.8)'; // Deep orange
        } else {
            return 'rgba(244, 67, 54, 0.85)'; // Red - high variation
        }
    }

    function displayChapterHeatmap() {
        // Update version labels
        document.getElementById('heatmap-version-a').textContent = formatVersionLabel(versionA);
        document.getElementById('heatmap-version-b').textContent = formatVersionLabel(versionB);

        // Show/hide third version label
        const versionCEl = document.getElementById('heatmap-version-c');
        const versionCSeparator = document.getElementById('heatmap-version-c-separator');
        if (versionC) {
            if (versionCEl) {
                versionCEl.textContent = formatVersionLabel(versionC);
                versionCEl.style.display = 'inline';
            }
            if (versionCSeparator) versionCSeparator.style.display = 'inline';
        } else {
            if (versionCEl) versionCEl.style.display = 'none';
            if (versionCSeparator) versionCSeparator.style.display = 'none';
        }

        const container = document.getElementById('heatmap-container');
        const summaryEl = document.getElementById('heatmap-summary');

        // Chapter order for display
        const chapters = [
            { id: 'prologue', label: 'Part 1' },
            { id: 'chapter1', label: 'Chapter 1' },
            { id: 'chapter2', label: 'Chapter 2' },
            { id: 'chapter3', label: 'Chapter 3' },
            { id: 'chapter4', label: 'Chapter 4' },
            { id: 'chapter5', label: 'Chapter 5' },
            { id: 'chapter6', label: 'Chapter 6' },
            { id: 'chapter7', label: 'Chapter 7' },
            { id: 'chapter8', label: 'Chapter 8' },
            { id: 'chapter9', label: 'Chapter 9' },
            { id: 'part2', label: 'Part 2' },
            { id: 'chapter10', label: 'Chapter 10' },
            { id: 'chapter11', label: 'Chapter 11' },
            { id: 'chapter12', label: 'Chapter 12' },
            { id: 'chapter13', label: 'Chapter 13' },
            { id: 'chapter14', label: 'Chapter 14' },
            { id: 'chapter15', label: 'Chapter 15' },
            { id: 'part3', label: 'Part 3' },
            { id: 'chapter16', label: 'Chapter 16' },
            { id: 'chapter17', label: 'Chapter 17' },
            { id: 'chapter18', label: 'Chapter 18' },
            { id: 'notes', label: 'Notes' }
        ];

        let html = '';
        let totalIdentical = 0;
        let totalDifferent = 0;
        let totalTwoMatch = 0;
        let mostVariedChapter = { id: '', label: '', variation: 0 };
        let leastVariedChapter = { id: '', label: '', variation: 100 };

        chapters.forEach(ch => {
            const stats = calculateChapterVariation(ch.id);
            totalIdentical += stats.identical;
            totalDifferent += stats.different;
            totalTwoMatch += stats.twoMatch || 0;

            if (stats.total > 0) {
                if (stats.variation > mostVariedChapter.variation) {
                    mostVariedChapter = { ...ch, variation: stats.variation };
                }
                if (stats.variation < leastVariedChapter.variation) {
                    leastVariedChapter = { ...ch, variation: stats.variation };
                }
            }

            const color = getHeatmapColor(stats.variation);
            const barWidth = Math.max(5, stats.variation); // Minimum 5% width for visibility
            const tooltipText = `${stats.different} of ${stats.total} paragraphs differ (${stats.variation.toFixed(0)}%). Click to view ${ch.label}`;

            html += `
                <div class="heatmap-row" data-chapter="${ch.id}">
                    <span class="heatmap-label">${ch.label}</span>
                    <div class="heatmap-bar-container" onclick="navigateToChapter('${ch.id}'); closeHeatmapModal();" title="${tooltipText}">
                        <div class="heatmap-bar" style="width: ${barWidth}%; background-color: ${color};">
                            ${stats.variation >= 10 ? `<span class="heatmap-bar-value">${stats.variation.toFixed(0)}%</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        // Summary - different wording for two-way vs three-way comparison
        if (versionC) {
            const totalParagraphs = totalIdentical + totalTwoMatch + totalDifferent;
            const overallVariation = totalParagraphs > 0 ? (((totalDifferent + totalTwoMatch * 0.5) / totalParagraphs) * 100).toFixed(1) : 0;

            summaryEl.innerHTML = `
                <p><strong>${totalIdentical}</strong> paragraphs match in all three versions, <strong>${totalTwoMatch}</strong> match in two, <strong>${totalDifferent}</strong> all differ (${overallVariation}% variation)</p>
                <p>Most variation: <strong>${mostVariedChapter.label}</strong> (${mostVariedChapter.variation.toFixed(0)}%) ·
                   Least variation: <strong>${leastVariedChapter.label}</strong> (${leastVariedChapter.variation.toFixed(0)}%)</p>
            `;
        } else {
            const totalParagraphs = totalIdentical + totalDifferent;
            const overallVariation = totalParagraphs > 0 ? ((totalDifferent / totalParagraphs) * 100).toFixed(1) : 0;

            summaryEl.innerHTML = `
                <p><strong>${totalIdentical}</strong> paragraphs identical, <strong>${totalDifferent}</strong> differ (${overallVariation}% variation)</p>
                <p>Most variation: <strong>${mostVariedChapter.label}</strong> (${mostVariedChapter.variation.toFixed(0)}%) ·
                   Least variation: <strong>${leastVariedChapter.label}</strong> (${leastVariedChapter.variation.toFixed(0)}%)</p>
            `;
        }
    }

    // Make closeHeatmapModal available globally for onclick handlers
    window.closeHeatmapModal = closeHeatmapModal;

    // Event listeners for heatmap
    const heatmapBtn = document.getElementById('heatmap-btn');
    const closeHeatmapBtn = document.getElementById('close-heatmap-modal-btn');
    const heatmapModal = document.getElementById('heatmap-modal');

    if (heatmapBtn) {
        heatmapBtn.addEventListener('click', openHeatmapModal);
    }
    if (closeHeatmapBtn) {
        closeHeatmapBtn.addEventListener('click', closeHeatmapModal);
    }
    if (heatmapModal) {
        heatmapModal.addEventListener('click', (e) => {
            if (e.target === heatmapModal) {
                closeHeatmapModal();
            }
        });
    }

    // Keep Jaccard event listeners for backwards compatibility (if elements exist)
    const jaccardBtn = document.getElementById('levenshtein-btn');
    const closeJaccardBtn = document.getElementById('close-levenshtein-modal-btn');
    const jaccardModal = document.getElementById('levenshtein-modal');
    const showMatrixBtn = document.getElementById('show-matrix-btn');

    if (jaccardBtn) {
        jaccardBtn.addEventListener('click', openJaccardModal);
    }
    if (closeJaccardBtn) {
        closeJaccardBtn.addEventListener('click', closeJaccardModal);
    }
    if (showMatrixBtn) {
        showMatrixBtn.addEventListener('click', toggleUploadedFilesMatrix);
    }
    if (jaccardModal) {
        jaccardModal.addEventListener('click', (e) => {
            if (e.target === jaccardModal) {
                closeJaccardModal();
            }
        });
    }
});
