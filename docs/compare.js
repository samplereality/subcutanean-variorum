// Subcutanean Version Comparison Tool

let allVersions = null;
let versionIds = [];
let currentChapter = 'prologue';
let currentMode = 'sidebyside';
let versionA = null;
let versionB = null;
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
let globalMacroConfig = null;
let macroActivationCache = {};
let notesOptionLookup = null;
let macroSignalConfig = null;
let versionChapterTextCache = {};
let versionNarrativeStatsCache = {};
let coreVersionIds = [];
let narrativeMetricBaselines = null;
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
            themeIcon.innerHTML = '&#9788;'; // Sun symbol
            themeLabel.textContent = 'Light';
        } else {
            // Show moon icon to indicate "click for dark mode"
            themeIcon.innerHTML = '&#9790;'; // Moon symbol
            themeLabel.textContent = 'Dark';
        }
    }
}

// Navigation functions
function initializeNavigation() {
    const navAbout = document.getElementById('nav-about');
    const navBookmarks = document.getElementById('nav-bookmarks');
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
    const macroAvailable = sourceSelected && !!globalMacroConfig;
    const diffBtn = document.getElementById('mode-diff');
    const comparisonBtn = document.getElementById('mode-comparison');
    const macroBtn = document.getElementById('macro-inspector-btn');
    const syntaxBtn = document.getElementById('syntax-toggle-btn');

    if (diffBtn) diffBtn.classList.toggle('hidden', sourceSelected);
    if (comparisonBtn) comparisonBtn.classList.toggle('hidden', sourceSelected);
    if (macroBtn) {
        macroBtn.classList.toggle('hidden', !macroAvailable);
        macroBtn.disabled = !macroAvailable;
    }
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

function getVersionForMacroAnalysis() {
    const sourceOnA = isSourceVersion(versionA);
    const sourceOnB = isSourceVersion(versionB);
    if (sourceOnA && !sourceOnB) return versionB;
    if (sourceOnB && !sourceOnA) return versionA;
    return null;
}

function getMacroActivationData(versionId) {
    if (!versionId) return null;
    if (macroActivationCache[versionId]) {
        return macroActivationCache[versionId];
    }
    if (!allVersions || !allVersions[versionId]) {
        macroActivationCache[versionId] = null;
        return null;
    }

    const versionData = allVersions[versionId];
    const notes = Array.isArray(versionData.notes) ? versionData.notes : [];
    const normalizedNotes = notes
        .map(note => normalizePlainText(note))
        .filter(Boolean);

    const activation = {
        versionId,
        notesAvailable: normalizedNotes.length > 0,
        options: {}
    };

    if (!notesOptionLookup) {
        macroActivationCache[versionId] = activation;
        return activation;
    }

    const noteSet = new Set(normalizedNotes);
    Object.entries(notesOptionLookup.byOption).forEach(([optionId, cues]) => {
        const matchedCue = cues.find(cue => noteSet.has(cue.normalized));
        if (matchedCue) {
            activation.options[optionId] = {
                status: 'active',
                note: matchedCue.text
            };
        }
    });

    const signalMatches = detectMacroSignalsForVersion(versionId);
    Object.entries(signalMatches).forEach(([optionId, matchInfo]) => {
        if (!activation.options[optionId]) {
            activation.options[optionId] = matchInfo;
        }
    });

    const heuristicMatches = detectNarrativeStyleHeuristics(versionId, activation.options);
    Object.entries(heuristicMatches).forEach(([optionId, matchInfo]) => {
        if (!activation.options[optionId]) {
            activation.options[optionId] = matchInfo;
        }
    });

    macroActivationCache[versionId] = activation;
    return activation;
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

function detectMacroSignalsForVersion(versionId) {
    const matches = {};
    if (!macroSignalConfig || !allVersions || !allVersions[versionId]) return matches;
    Object.entries(macroSignalConfig).forEach(([optionKey, rules]) => {
        const optionId = normalizeOptionId(optionKey);
        if (!Array.isArray(rules) || rules.length === 0) return;
        const matched = rules.some(rule => {
            const matchText = (rule && rule.match) ? rule.match : '';
            if (!matchText) return false;
            if (rule.type && rule.type !== 'text') return false;
            const useNormalized = rule.normalized !== false;
            const chapters = Array.isArray(rule.chapters) && rule.chapters.length > 0
                ? rule.chapters
                : getVersionChapterIds(versionId);
            const preparedNeedle = useNormalized
                ? normalizePlainText(matchText)
                : (rule.caseSensitive ? matchText : matchText.toLowerCase());
            if (!preparedNeedle) return false;
            return chapters.some(chapterId => {
                const chapterText = getVersionChapterText(versionId, chapterId, useNormalized);
                if (!chapterText) return false;
                const haystack = useNormalized
                    ? chapterText
                    : (rule.caseSensitive ? chapterText : chapterText.toLowerCase());
                if (!haystack) return false;
                if (haystack.includes(preparedNeedle)) {
                    matches[optionId] = {
                        status: 'active',
                        note: rule.note || `Detected via signal in ${formatChapterName(chapterId)}`
                    };
                    return true;
                }
                return false;
            });
        });
        if (matched) {
            return;
        }
    });
    return matches;
}

function invalidateVersionCaches(versionId) {
    if (!versionId) return;
    if (macroActivationCache[versionId]) {
        delete macroActivationCache[versionId];
    }
    if (versionChapterTextCache[versionId]) {
        delete versionChapterTextCache[versionId];
    }
    if (versionNarrativeStatsCache[versionId]) {
        delete versionNarrativeStatsCache[versionId];
    }
}

function detectNarrativeStyleHeuristics(versionId, existingOptions = {}) {
    const stats = getNarrativeStats(versionId);
    if (!stats) return {};
    const matches = {};
    const hasOption = (optionId) => !!(existingOptions && existingOptions[optionId]);

    const setMatch = (optionId, note) => {
        matches[optionId] = {
            status: 'active',
            note
        };
    };

    const alliterationRate = stats.significantWordCount > 0 ? stats.alliterationCount / stats.significantWordCount : 0;
    if (!hasOption('alliteration') && !hasOption('noalliteration')) {
        if (narrativeMetricBaselines && narrativeMetricBaselines.alliteration.std > 0) {
            const z = (alliterationRate - narrativeMetricBaselines.alliteration.mean) / narrativeMetricBaselines.alliteration.std;
            if (z >= 1.25) {
                setMatch('alliteration', 'Frequent alliteration detected in narration');
            } else if (z <= -1.25) {
                setMatch('noalliteration', 'Alliteration is rarely used in narration');
            }
        }
    }

    const slangRate = stats.totalWords > 0 ? (stats.slangCount / stats.totalWords) * 1000 : 0;
    if (!hasOption('slang') && !hasOption('formal')) {
        if (slangRate >= 10) {
            setMatch('slang', 'High density of informal/slang vocabulary detected');
        } else if (slangRate <= 1.5) {
            setMatch('formal', 'Very little slang detected across narration');
        }
    }

    if (!hasOption('bigwords')) {
        const avgSignificantWordLength = stats.significantWordCount > 0 ? stats.significantWordLength / stats.significantWordCount : 0;
        if (avgSignificantWordLength >= 5.3) {
            setMatch('bigwords', 'Narrator favors longer word choices throughout the text');
        }
    }

    if (!hasOption('avoidme')) {
        const meWordRate = stats.totalWords > 0 ? (stats.meWordCount / stats.totalWords) * 1000 : 0;
        if (meWordRate <= 6) {
            setMatch('avoidme', 'First-person pronouns appear relatively rarely');
        }
    }

    if (!hasOption('likesimile') && !hasOption('dislikesimile')) {
        const simileRate = stats.totalWords > 0 ? (stats.simileCount / stats.totalWords) * 1000 : 0;
        if (narrativeMetricBaselines && narrativeMetricBaselines.simile.std > 0) {
            const z = (simileRate - narrativeMetricBaselines.simile.mean) / narrativeMetricBaselines.simile.std;
            if (z >= 1.25) {
                setMatch('likesimile', 'Similes and analogies appear frequently in narration');
            } else if (z <= -1.25) {
                setMatch('dislikesimile', 'Similes are rarely employed in narration');
            }
        }
    }

    if (!hasOption('avoiddialogue')) {
        const dialogueRatio = stats.totalParagraphs > 0 ? stats.dialogueParagraphs / stats.totalParagraphs : 0;
        if (dialogueRatio <= 0.08) {
            setMatch('avoiddialogue', 'Quoted dialogue is rarely present in this version');
        }
    }

    return matches;
}

function getNarrativeStats(versionId) {
    if (!versionId || !allVersions || !allVersions[versionId]) return null;
    if (versionNarrativeStatsCache[versionId]) {
        return versionNarrativeStatsCache[versionId];
    }
    const stats = {
        totalParagraphs: 0,
        totalWords: 0,
        significantWordCount: 0,
        significantWordLength: 0,
        alliterationCount: 0,
        slangCount: 0,
        meWordCount: 0,
        simileCount: 0,
        dialogueParagraphs: 0
    };
    const chapterIds = getVersionChapterIds(versionId).filter(ch => !NON_NARRATIVE_SECTIONS.has(ch));
    chapterIds.forEach(chapterId => {
        const paragraphs = getChapterParagraphs(versionId, chapterId) || [];
        paragraphs.forEach(html => {
            const plain = htmlToPlainText(html);
            if (!plain || plain.includes('{')) {
                return;
            }
            stats.totalParagraphs += 1;
            if (/“.*”/.test(plain)) {
                stats.dialogueParagraphs += 1;
            }
            const words = plain.match(/[\w']+/g) || [];
            if (!words.length) return;
            stats.totalWords += words.length;
            const significantWords = words.filter(word => word.length >= 4);
            stats.significantWordCount += significantWords.length;
            stats.significantWordLength += significantWords.reduce((sum, word) => sum + word.length, 0);
            stats.alliterationCount += countAlliteration(significantWords);
            stats.slangCount += countRegexMatches(SLANG_REGEX, plain);
            stats.meWordCount += countRegexMatches(ME_WORD_REGEX, plain);
            stats.simileCount += countRegexMatches(SIMILE_REGEX, plain);
        });
    });
    versionNarrativeStatsCache[versionId] = stats;
    return stats;
}

function countAlliteration(words) {
    if (!Array.isArray(words) || words.length === 0) return 0;
    let count = 0;
    let lastLetter = '';
    words.forEach(word => {
        const letter = word.charAt(0).toLowerCase();
        if (!letter) return;
        if (letter === lastLetter) {
            count += 1;
        }
        lastLetter = letter;
    });
    return count;
}

function countRegexMatches(regex, text) {
    if (!text) return 0;
    const re = new RegExp(regex.source, regex.flags);
    const matches = text.match(re);
    return matches ? matches.length : 0;
}

function computeNarrativeMetricBaselines() {
    if (!coreVersionIds.length) {
        narrativeMetricBaselines = null;
        return;
    }
    const simileRates = [];
    const alliterationRates = [];
    coreVersionIds.forEach(versionId => {
        const stats = getNarrativeStats(versionId);
        if (!stats || !stats.totalWords || !stats.significantWordCount) return;
        simileRates.push((stats.simileCount / stats.totalWords) * 1000);
        alliterationRates.push(stats.alliterationCount / stats.significantWordCount);
    });
    narrativeMetricBaselines = {
        simile: calculateMeanStd(simileRates),
        alliteration: calculateMeanStd(alliterationRates)
    };
}

function calculateMeanStd(values) {
    if (!values || values.length === 0) {
        return { mean: 0, std: 0 };
    }
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance = values.reduce((acc, value) => acc + Math.pow(value - mean, 2), 0) / values.length;
    return {
        mean,
        std: Math.sqrt(variance)
    };
}

const DEFAULT_OPTION_IDS = new Set([
    'noverbositypref',
    'nopolaritypref',
    'noslangpref',
    'neithersubjnorobj',
    'noalitpref',
    'nosimilepref'
]);

function createMacroOptionBadge(option, activation, assumedDefault = false) {
    const badge = document.createElement('div');
    badge.className = 'macro-option';
    const label = document.createElement('span');
    label.className = 'macro-option-label';
    label.textContent = option.display || formatOptionName(option.id);
    badge.appendChild(label);

    const statusEl = document.createElement('span');
    statusEl.className = 'macro-option-status';
    const optionState = activation && activation.options && activation.options[option.id];
    if (optionState && optionState.status === 'active') {
        badge.classList.add('macro-option-active');
        statusEl.textContent = 'Detected';
    } else {
        if (assumedDefault) {
            badge.classList.add('macro-option-assumed');
            statusEl.textContent = 'Assumed';
        } else {
            statusEl.textContent = activation && activation.notesAvailable ? 'Not detected' : 'Unknown';
        }
    }
    badge.appendChild(statusEl);

    if (optionState && optionState.note) {
        const noteEl = document.createElement('div');
        noteEl.className = 'macro-option-note';
        noteEl.textContent = optionState.note;
        badge.appendChild(noteEl);
    } else if (assumedDefault) {
        const noteEl = document.createElement('div');
        noteEl.className = 'macro-option-note';
        noteEl.textContent = 'Not listed; assuming default setting';
        badge.appendChild(noteEl);
    }

    return badge;
}

function createMacroCard(entry, activation) {
    const card = document.createElement('div');
    card.className = 'macro-card';
    const header = document.createElement('div');
    header.className = 'macro-card-header';

    const title = document.createElement('h4');
    title.textContent = entry.title || entry.description || entry.options.map(opt => opt.display).join(', ');
    header.appendChild(title);

    if (entry.description && entry.description !== entry.title) {
        const desc = document.createElement('p');
        desc.className = 'macro-card-description';
        desc.textContent = entry.description;
        header.appendChild(desc);
    }
    card.appendChild(header);

    const optionsWrap = document.createElement('div');
    optionsWrap.className = 'macro-options';
    const activeOptions = new Set();
    entry.options.forEach(option => {
        if (activation && activation.options && activation.options[option.id]) {
            activeOptions.add(option.id);
        }
    });
    const defaultOption = activeOptions.size === 0 ? getDefaultOption(entry.options) : null;
    entry.options.forEach(option => {
        const assumedDefault = defaultOption && defaultOption.id === option.id;
        optionsWrap.appendChild(createMacroOptionBadge(option, activation, assumedDefault));
    });
    card.appendChild(optionsWrap);

    return card;
}

function getDefaultOption(options) {
    if (!Array.isArray(options)) return null;
    return options.find(opt => DEFAULT_OPTION_IDS.has(opt.id));
}

function populateMacroInspector() {
    const contextEl = document.getElementById('macro-inspector-context');
    const container = document.getElementById('macro-inspector-body');
    const emptyState = document.getElementById('macro-empty-state');
    if (!container || !contextEl || !emptyState) return;

    container.innerHTML = '';

    const analysisVersion = getVersionForMacroAnalysis();
    const activation = analysisVersion ? getMacroActivationData(analysisVersion) : null;

    if (contextEl) {
        const versionLabel = analysisVersion ? formatVersionLabel(analysisVersion) : 'No version selected';
        contextEl.textContent = `Source chapter: ${formatChapterName(currentChapter)} · Compared with: ${versionLabel}`;
    }

    if (!globalMacroConfig || !analysisVersion || !activation) {
        emptyState.textContent = 'Load a seed alongside the Quant Source to inspect global macros.';
        emptyState.classList.remove('hidden');
        return;
    }

    if (activation.notesAvailable) {
        emptyState.classList.add('hidden');
    } else {
        emptyState.textContent = 'This version does not include the stats page, so detection may be incomplete.';
        emptyState.classList.remove('hidden');
    }

    globalMacroConfig.groups.forEach(group => {
        if (!group.entries || group.entries.length === 0) {
            return;
        }
        const groupEl = document.createElement('div');
        groupEl.className = 'macro-group';
        const heading = document.createElement('h3');
        heading.textContent = group.title || 'Global macros';
        groupEl.appendChild(heading);

        group.entries.forEach(entry => {
            if (entry.options.length === 0) return;
            groupEl.appendChild(createMacroCard(entry, activation));
        });

        container.appendChild(groupEl);
    });
}

function openMacroInspector() {
    if (!globalMacroConfig || !isSourceCodeVisible()) return;
    const modal = document.getElementById('macro-inspector-modal');
    if (!modal) return;
    populateMacroInspector();
    modal.classList.remove('hidden');
}

function closeMacroInspector() {
    const modal = document.getElementById('macro-inspector-modal');
    if (!modal) return;
    modal.classList.add('hidden');
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
        coreVersionIds = [...versionIds];
        computeNarrativeMetricBaselines();

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
    if (!selectorA || !selectorB) return;

    const previousValueA = selectorA.value;
    const previousValueB = selectorB.value;

    // Clear existing options
    selectorA.innerHTML = '';
    selectorB.innerHTML = '';

    const addSourceOption = (select) => {
        const option = document.createElement('option');
        option.value = SOURCE_VERSION_ID;
        option.textContent = originSourcesLoaded ? '📜 Source Code' : '📜 Source Code (loading...)';
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
    });

    addSourceOption(selectorA);
    addSourceOption(selectorB);

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

    const desiredA = versionA || previousValueA;
    const desiredB = versionB || previousValueB;

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

    // Add change handlers (only once)
    if (!selectorA.dataset.hasListener) {
        selectorA.addEventListener('change', (e) => {
            versionA = e.target.value;
            buildChapterNavigation();
            displayComparison();
            updateToolbarVisibility();
        });
        selectorA.dataset.hasListener = 'true';
    }

    if (!selectorB.dataset.hasListener) {
        selectorB.addEventListener('change', (e) => {
            versionB = e.target.value;
            buildChapterNavigation();
            displayComparison();
            updateToolbarVisibility();
        });
        selectorB.dataset.hasListener = 'true';
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
        if (chapterId === currentChapter) {
            button.classList.add('active');
        }

        // Format button text
        let buttonText;
        if (chapterId === 'introduction') {
            buttonText = 'Intro';
        } else if (chapterId === 'prologue') {
            buttonText = 'Part I';
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

    // Get chapter text from both versions
    const chapterDataA = getChapterContent(versionA, currentChapter);
    const chapterDataB = getChapterContent(versionB, currentChapter);
    const textA = chapterDataA.paragraphs;
    const textB = chapterDataB.paragraphs;

    if (currentMode === 'unified') {
        displayUnified(display, chapterDataA, versionA);
    } else if (currentMode === 'sidebyside') {
        displaySideBySide(display, chapterDataA, chapterDataB);
    } else if (currentMode === 'diff') {
        displayDiff(display, chapterDataA, chapterDataB);
    } else if (currentMode === 'comparison') {
        displayParagraphComparison(display, chapterDataA, chapterDataB);
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

function displayUnified(container, chapterData, version) {
    const { paragraphs, isSource } = chapterData;
    container.innerHTML = '';
    container.className = '';

    const div = document.createElement('div');
    div.className = 'unified-view';

    const heading = document.createElement('h2');
    heading.textContent = formatVersionLabel(version);
    div.appendChild(heading);

    renderParagraphs(div, paragraphs, isSource, version);

    container.appendChild(div);
}

function displaySideBySide(container, dataA, dataB) {
    const { paragraphs: paragraphsA, isSource: isSourceA } = dataA;
    const { paragraphs: paragraphsB, isSource: isSourceB } = dataB;
    container.innerHTML = '';
    container.className = 'side-by-side';

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

    initializeSourceSync({
        panelA,
        panelB,
        dataA,
        dataB
    });
}

function displayDiff(container, dataA, dataB) {
    const paragraphsA = dataA.paragraphs;
    const paragraphsB = dataB.paragraphs;
    container.innerHTML = '';
    container.className = '';

    const div = document.createElement('div');
    div.className = 'diff-view';

    const heading = document.createElement('h2');
    heading.textContent = `Tracking Changes: ${formatVersionLabel(versionA)} → ${formatVersionLabel(versionB)}`;
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


function formatChapterLabel(chapterId) {
    if (!chapterId) return 'Chapter';
    if (chapterId === 'prologue') return 'Part I';
    if (chapterId === 'part2') return 'Part II';
    if (chapterId === 'part3') return 'Part III';
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

function displayParagraphComparison(container, dataA, dataB) {
    const paragraphsA = dataA.paragraphs;
    const paragraphsB = dataB.paragraphs;
    container.innerHTML = '';
    container.className = '';

    const div = document.createElement('div');
    div.className = 'comparison-view';

    const heading = document.createElement('h2');
    heading.textContent = `Collation: ${formatVersionLabel(versionA)} vs ${formatVersionLabel(versionB)}`;
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

    for (const alignment of alignments) {
        const { indexA, indexB, textA, textB, similarity, type } = alignment;

        // Create paragraph A (or placeholder)
        const divA = document.createElement('div');
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
    }

    div.appendChild(grid);
    container.appendChild(div);
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
    seedALabel.textContent = formatVersionLabel(versionA);
    seedBLabel.textContent = formatVersionLabel(versionB);

    // Update description with seed numbers
    const description = document.getElementById('word-diff-description');
    description.textContent = `Words in ${formatVersionLabel(versionA)} that are not in ${formatVersionLabel(versionB)}, and vice-versa. Select any word to see which chapters it appears in. Select the chapters to see the word in context.`;

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

// Generate Copy Modal functionality

function openGenerateModal() {
    const modal = document.getElementById('generate-modal');
    modal.classList.remove('hidden');
}

function closeGenerateModal() {
    const modal = document.getElementById('generate-modal');
    modal.classList.add('hidden');
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
                    alert('Something went wrong. Please check your connection and try again.');
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

    if (!select) return;

    select.innerHTML = '';

    if (bookmarks.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        select.disabled = true;
        if (loadBtn) loadBtn.disabled = true;
        if (deleteBtn) deleteBtn.disabled = true;
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
}

function saveCurrentBookmark() {
    if (!versionA || !versionB) return;

    const defaultName = `${formatVersionLabel(versionA)} vs ${formatVersionLabel(versionB)} – ${formatChapterLabel(currentChapter)} (${formatModeLabel(currentMode)})`;
    const label = prompt('Name this bookmark:', defaultName);
    if (label === null) return;
    const trimmed = label.trim();
    if (!trimmed) return;

    const bookmark = {
        id: `bookmark-${Date.now()}`,
        name: trimmed,
        versionA: versionA,
        versionB: versionB,
        chapter: currentChapter,
        mode: currentMode,
        scrollPosition: window.scrollY
    };

    bookmarks.push(bookmark);
    saveBookmarksToStorage();
    refreshBookmarkUI(bookmark.id);
}

function applyBookmark(bookmark) {
    if (!bookmark) return;
    const versionAAvailable = isVersionSelectable(bookmark.versionA);
    const versionBAvailable = isVersionSelectable(bookmark.versionB);
    if (!versionAAvailable || !versionBAvailable) {
        if (isSourceVersion(bookmark.versionA) || isSourceVersion(bookmark.versionB)) {
            alert('Source code data is still loading. Please try again in a moment.');
            return;
        }
        alert('One of the versions in this bookmark is no longer available.');
        if (bookmark.id) {
            bookmarks = bookmarks.filter(b => b.id !== bookmark.id);
            saveBookmarksToStorage();
            refreshBookmarkUI();
        }
        return;
    }

    const selectA = document.getElementById('version-a-select');
    const selectB = document.getElementById('version-b-select');

    versionA = bookmark.versionA;
    versionB = bookmark.versionB;

    if (selectA) selectA.value = versionA;
    if (selectB) selectB.value = versionB;

    currentChapter = bookmark.chapter;
    pendingBookmarkScroll = typeof bookmark.scrollPosition === 'number' ? bookmark.scrollPosition : 0;
    buildChapterNavigation();
    setViewMode(bookmark.mode || currentMode);
}

function deleteSelectedBookmark() {
    const select = document.getElementById('bookmark-select');
    if (!select || !select.value) return;

    const confirmed = confirm('Delete this bookmark?');
    if (!confirmed) return;

    bookmarks = bookmarks.filter(b => b.id !== select.value);
    saveBookmarksToStorage();
    refreshBookmarkUI();
}

function getBookmarkById(id) {
    return bookmarks.find(b => b.id === id);
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
        const [originResponse, signalResponse] = await Promise.all([
            fetch('origin_text/origin_sources.json'),
            fetch('origin_text/macro_signals.json').catch(() => null)
        ]);
        if (!originResponse.ok) {
            throw new Error(`HTTP ${originResponse.status}`);
        }
        originSources = await originResponse.json();
        macroSignalConfig = signalResponse && signalResponse.ok ? await signalResponse.json() : null;
        originSourcesLoaded = true;
        sourceParagraphCache = {};
        globalMacroConfig = parseGlobalMacroConfig(originSources);
        notesOptionLookup = buildNotesOptionLookup(originSources, globalMacroConfig);
        macroActivationCache = {};
        versionChapterTextCache = {};
        versionNarrativeStatsCache = {};
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
    initializeTheme();
    setupViewModeButtons();
    loadBookmarksFromStorage();
    refreshBookmarkUI();
    loadAllVersions();
    loadOriginSources();
    initializeNavigation();
    initializeGenerateForm();

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
                alert('Please wait for the versions to finish loading.');
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

    // Macro Inspector events
    const macroBtn = document.getElementById('macro-inspector-btn');
    const macroModal = document.getElementById('macro-inspector-modal');
    const macroCloseBtn = document.getElementById('macro-inspector-close-btn');
    if (macroBtn) {
        macroBtn.addEventListener('click', () => {
            if (!globalMacroConfig || !isSourceCodeVisible()) return;
            openMacroInspector();
        });
    }
    if (macroCloseBtn) {
        macroCloseBtn.addEventListener('click', closeMacroInspector);
    }
    if (macroModal) {
        macroModal.addEventListener('click', (e) => {
            if (e.target === macroModal) {
                closeMacroInspector();
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

    // Event listeners
    const jaccardBtn = document.getElementById('levenshtein-btn');
    const closeJaccardBtn = document.getElementById('close-levenshtein-modal-btn');
    const jaccardModal = document.getElementById('levenshtein-modal');
    const showMatrixBtn = document.getElementById('show-matrix-btn');

    jaccardBtn.addEventListener('click', openJaccardModal);
    closeJaccardBtn.addEventListener('click', closeJaccardModal);
    showMatrixBtn.addEventListener('click', toggleUploadedFilesMatrix);

    jaccardModal.addEventListener('click', (e) => {
        if (e.target === jaccardModal) {
            closeJaccardModal();
        }
    });
});
function normalizeOptionId(name) {
    return (name || '').replace(/^@/, '').trim().toLowerCase();
}

function formatOptionName(id) {
    if (!id) return '';
    const cleaned = id.replace(/^@/, '').replace(/_/g, ' ').trim();
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function parseGlobalMacroConfig(originData) {
    if (!originData || !originData.chapters || !originData.chapters.globals) return null;
    const globalsContent = originData.chapters.globals.content || '';
    const lines = globalsContent.split(/\r?\n/);
    const groups = [];
    const optionIndex = {};
    let currentGroup = { title: 'Global Macros', entries: [] };
    groups.push(currentGroup);
    let pendingDescription = [];
    let awaitingGroupTitle = false;
    let previousLineWasTitle = false;

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) {
            return;
        }
        if (trimmed.startsWith('#')) {
            const text = trimmed.replace(/^#\s*/, '').trim();
            if (/^\*+/.test(text)) {
                if (previousLineWasTitle) {
                    previousLineWasTitle = false;
                } else {
                    awaitingGroupTitle = true;
                }
                return;
            }
            if (awaitingGroupTitle) {
                const title = text || 'Global Macros';
                currentGroup = { title, entries: [] };
                groups.push(currentGroup);
                pendingDescription = [];
                awaitingGroupTitle = false;
                previousLineWasTitle = true;
                return;
            }
            previousLineWasTitle = false;
            pendingDescription.push(text);
            return;
        }
        const defineMatch = trimmed.match(/^\[DEFINE\s+([^\]]+)\]/i);
        if (defineMatch) {
            const body = defineMatch[1].trim();
            const optionTokens = body.split('|').map(token => token.trim()).filter(Boolean);
            const options = [];
            optionTokens.forEach(token => {
                const withoutChance = token.replace(/^\d{1,3}>/, '').trim();
                const cleaned = withoutChance.replace(/^\^/, '').trim();
                if (!cleaned.startsWith('@')) return;
                const id = normalizeOptionId(cleaned);
                options.push({
                    id,
                    display: formatOptionName(id),
                    raw: cleaned
                });
            });
            const filteredOptions = options.filter(opt => !isSingularOption(opt.id));
            if (filteredOptions.length === 0) {
                pendingDescription = [];
                return;
            }
            const entry = {
                id: filteredOptions.map(opt => opt.id).join('-') || `define-${currentGroup.entries.length}`,
                title: pendingDescription[0] || filteredOptions.map(opt => formatOptionName(opt.id)).join(' vs '),
                description: pendingDescription.join(' ').trim(),
                options: filteredOptions
            };
            currentGroup.entries.push(entry);
            entry.options.forEach(opt => {
                optionIndex[opt.id] = entry;
            });
            pendingDescription = [];
            previousLineWasTitle = false;
        }
    });

    return { groups, optionIndex };
}

function isSingularOption(optionId) {
    return typeof optionId === 'string' && optionId.startsWith('singular');
}

function buildNotesOptionLookup(originData, config) {
    if (!originData || !originData.chapters || !originData.chapters.notes || !config) return null;
    const notesContent = originData.chapters.notes.content || '';
    const regex = /\[([\s\S]*?)\]/g;
    const cues = {};
    let match;

    while ((match = regex.exec(notesContent)) !== null) {
        const block = (match[1] || '').trim();
        if (!block) continue;
        if (/^(MACRO|STICKY_MACRO)\s/i.test(block)) {
            continue;
        }
        const segments = splitQuantOptions(block);
        if (!segments.length) continue;
        let entryContext = null;
        const assigned = [];

        segments.forEach(segment => {
            const trimmed = segment.trim();
            if (!trimmed) return;
            let optionId = null;
            let text = trimmed;
            const optMatch = trimmed.match(/^@([A-Za-z_][A-Za-z0-9_-]*)>([\s\S]*)$/);
            if (optMatch) {
                optionId = normalizeOptionId(optMatch[1]);
                text = optMatch[2];
                entryContext = config.optionIndex[optionId] || entryContext;
            } else if (entryContext && entryContext.options.length === 2) {
                const remaining = entryContext.options
                    .map(opt => opt.id)
                    .filter(id => !assigned.includes(id));
                if (remaining.length === 1) {
                    optionId = remaining[0];
                }
            }
            if (!optionId) return;
            assigned.push(optionId);
            const plain = quantOptionToPlain(text);
            const normalized = normalizePlainText(plain);
            if (!plain || !normalized) return;
            if (!cues[optionId]) cues[optionId] = [];
            cues[optionId].push({ text: plain, normalized });
        });
    }

    return { byOption: cues };
}

function splitQuantOptions(text) {
    if (!text) return [];
    const parts = [];
    let current = '';
    let braceDepth = 0;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '{') {
            braceDepth += 1;
            current += char;
            continue;
        }
        if (char === '}') {
            braceDepth = Math.max(0, braceDepth - 1);
            current += char;
            continue;
        }
        if (char === '|' && braceDepth === 0) {
            parts.push(current);
            current = '';
            continue;
        }
        current += char;
    }
    if (current) parts.push(current);
    return parts;
}

function quantOptionToPlain(text) {
    if (!text) return '';
    let output = text.replace(/~/g, '');
    output = output.replace(/\{([^{}]+)\}/g, (_, inner) => {
        const slashIndex = inner.indexOf('/');
        if (slashIndex !== -1) {
            return inner.slice(slashIndex + 1);
        }
        return inner;
    });
    return output.replace(/\s+/g, ' ').trim();
}
