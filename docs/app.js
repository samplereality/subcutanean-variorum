// Subcutanean Variorum Browser
// JavaScript for interactive text display with variations

let manifest = null;
let loadedChapters = {}; // Cache for loaded chapter data
let currentChapter = 'introduction';
let currentBaseVersion = null;
let hideTooltipTimeout = null;

// Load the manifest file
async function loadManifest() {
    try {
        const response = await fetch('variorum_data/manifest.json');
        manifest = await response.json();

        // Set up base version selector
        const selector = document.getElementById('base-version-select');
        manifest.base_version_options.forEach(vid => {
            const option = document.createElement('option');
            option.value = vid;
            option.textContent = `Version ${vid}`;
            selector.appendChild(option);
        });

        // Set default base version
        currentBaseVersion = manifest.base_version_options[0];
        selector.value = currentBaseVersion;

        // Add change handler
        selector.addEventListener('change', (e) => {
            currentBaseVersion = e.target.value;
            displayChapter(currentChapter);
        });

        // Update info panel
        document.getElementById('base-version').textContent = currentBaseVersion;
        document.getElementById('total-versions').textContent = manifest.total_versions;

        // Build chapter navigation
        buildChapterNavigation();

        // Load and display introduction by default
        await loadAndDisplayChapter('introduction');

    } catch (error) {
        console.error('Error loading manifest:', error);
        document.getElementById('text-display').innerHTML =
            '<p class="loading">Error loading manifest. Please ensure manifest.json is in the variorum_data folder.</p>';
    }
}

// Build chapter navigation buttons
function buildChapterNavigation() {
    const nav = document.getElementById('chapter-nav');
    nav.innerHTML = '';

    manifest.chapters.forEach(chapter => {
        const button = document.createElement('button');
        button.className = 'nav-btn';
        button.id = `btn-${chapter.id}`;

        // Format button text based on section type
        let buttonText;
        if (chapter.id === 'introduction') {
            buttonText = 'Intro';
        } else if (chapter.id === 'prologue') {
            buttonText = 'Prologue';
        } else if (chapter.id === 'part2') {
            buttonText = 'Part II';
        } else if (chapter.id === 'part3') {
            buttonText = 'Part III';
        } else if (chapter.id.startsWith('chapter')) {
            buttonText = `Ch ${chapter.id.replace('chapter', '')}`;
        } else {
            buttonText = chapter.id;
        }

        button.textContent = buttonText;
        button.addEventListener('click', () => loadAndDisplayChapter(chapter.id));
        nav.appendChild(button);
    });
}

// Load and display a chapter (with caching)
async function loadAndDisplayChapter(chapterId) {
    // Check if already loaded
    if (!loadedChapters[chapterId]) {
        try {
            // Find chapter info in manifest
            const chapterInfo = manifest.chapters.find(ch => ch.id === chapterId);
            if (!chapterInfo) {
                throw new Error(`Chapter ${chapterId} not found in manifest`);
            }

            // Show loading state
            document.getElementById('text-display').innerHTML =
                '<p class="loading">Loading chapter...</p>';

            // Fetch chapter data
            const response = await fetch(`variorum_data/${chapterInfo.file}`);
            const chapterData = await response.json();

            // Cache it
            loadedChapters[chapterId] = chapterData;

        } catch (error) {
            console.error(`Error loading chapter ${chapterId}:`, error);
            document.getElementById('text-display').innerHTML =
                `<p class="loading">Error loading chapter. Please try again.</p>`;
            return;
        }
    }

    // Display the chapter
    displayChapter(chapterId);
}

// Display a chapter (from cache)
function displayChapter(chapterId) {
    currentChapter = chapterId;

    // Update active button
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`btn-${chapterId}`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    // Get the chapter data for current base version
    const chapterData = loadedChapters[chapterId];
    if (!chapterData) {
        console.error(`Chapter ${chapterId} not loaded`);
        return;
    }

    const variorumData = chapterData.variorums_by_base[currentBaseVersion];

    // Update base version display
    document.getElementById('base-version').textContent = currentBaseVersion;

    // Count variations and omissions
    const variationCount = variorumData.filter(p => p.has_variation).length;
    const omissionCount = variorumData.filter(p =>
        p.variants.some(v => v.type === 'omission')
    ).length;

    let countText = variationCount + ' position' + (variationCount !== 1 ? 's' : '') + ' vary';
    if (omissionCount > 0) {
        countText += `, ${omissionCount} with omissions`;
    }

    document.getElementById('variation-count').textContent = countText;

    // Render the text
    const textDisplay = document.getElementById('text-display');
    textDisplay.innerHTML = '';

    variorumData.forEach((paragraph, paraIndex) => {
        const p = document.createElement('p');

        if (paragraph.has_variation && paragraph.variants.length > 0) {
            // This paragraph has variations - make it interactive
            p.className = 'variant';
            p.innerHTML = paragraph.base_text;
            p.dataset.variants = JSON.stringify(paragraph.variants);
            p.dataset.paraIndex = paraIndex;

            // Add hover events
            p.addEventListener('mouseenter', showVariantTooltip);
            p.addEventListener('mouseleave', hideVariantTooltip);
        } else {
            // Regular paragraph
            p.innerHTML = paragraph.base_text;
        }

        textDisplay.appendChild(p);
    });
}

// Show variant tooltip
function showVariantTooltip(event) {
    const tooltip = document.getElementById('variant-tooltip');
    const variantList = document.getElementById('variant-list');

    // Get variants from data attribute
    const variants = JSON.parse(event.target.dataset.variants);

    // Clear and populate variant list
    variantList.innerHTML = '';
    variants.forEach((variant, index) => {
        const li = document.createElement('li');
        li.className = 'variant-item';
        li.dataset.index = index;
        li.dataset.expanded = 'false';

        const needsTruncation = variant.text.length > 150;

        // Create variant text preview (truncate if too long)
        const variantTextShort = needsTruncation
            ? variant.text.substring(0, 150) + '...'
            : variant.text;

        // Show text and which versions have it
        let versionInfo = `(${variant.count} version${variant.count > 1 ? 's' : ''})`;
        if (variant.type === 'agreement') {
            versionInfo = `Same as base ${versionInfo}`;
        }

        const textSpan = document.createElement('span');
        textSpan.className = 'variant-text';
        textSpan.innerHTML = variantTextShort;

        const infoSpan = document.createElement('span');
        infoSpan.className = 'version-count';
        infoSpan.textContent = versionInfo;

        li.appendChild(textSpan);
        li.appendChild(infoSpan);

        // Style differently for omissions and agreements
        if (variant.type === 'omission') {
            li.classList.add('omission');
        } else if (variant.type === 'agreement') {
            li.classList.add('agreement');
        }

        // Add expand hint if text is truncated OR if we want to show version details
        const isExpandable = needsTruncation || variant.type === 'omission' || variant.count > 3;

        if (isExpandable) {
            li.classList.add('expandable');
            const expandHint = document.createElement('span');
            expandHint.className = 'expand-hint';
            expandHint.textContent = 'click to expand';
            li.appendChild(expandHint);

            // Add click handler to expand/collapse
            li.addEventListener('click', () => {
                const isExpanded = li.dataset.expanded === 'true';

                if (isExpanded) {
                    // Collapse
                    if (needsTruncation) {
                        textSpan.innerHTML = variantTextShort;
                    }
                    li.dataset.expanded = 'false';
                    li.classList.remove('expanded');
                    expandHint.textContent = 'click to expand';

                    // Remove version details
                    const oldDetails = li.querySelector('.version-details');
                    if (oldDetails) {
                        oldDetails.remove();
                    }
                } else {
                    // Expand - show full text and version IDs
                    const versionIds = variant.versions.join(', ');

                    if (needsTruncation) {
                        textSpan.innerHTML = variant.text;
                    }

                    // Show which specific versions have this variant
                    const versionDetails = document.createElement('div');
                    versionDetails.className = 'version-details';
                    versionDetails.textContent = `Versions: ${versionIds}`;

                    // Remove old version details if any
                    const oldDetails = li.querySelector('.version-details');
                    if (oldDetails) {
                        oldDetails.remove();
                    }

                    li.appendChild(versionDetails);
                    li.dataset.expanded = 'true';
                    li.classList.add('expanded');
                    expandHint.textContent = 'click to collapse';
                }
            });
        }

        variantList.appendChild(li);
    });

    // Position tooltip near the element
    const rect = event.target.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    tooltip.style.left = Math.min(rect.left, window.innerWidth - 400) + 'px';
    tooltip.style.top = (rect.bottom + scrollTop + 10) + 'px';

    // Show tooltip
    tooltip.classList.remove('hidden');
}

// Hide variant tooltip (with delay)
function hideVariantTooltip() {
    // Add a small delay before hiding to allow mouse to move to tooltip
    hideTooltipTimeout = setTimeout(() => {
        const tooltip = document.getElementById('variant-tooltip');
        tooltip.classList.add('hidden');
    }, 200);
}

// Cancel hiding the tooltip
function cancelHideTooltip() {
    if (hideTooltipTimeout) {
        clearTimeout(hideTooltipTimeout);
        hideTooltipTimeout = null;
    }
}

// Setup tooltip hover behavior
function setupTooltipBehavior() {
    const tooltip = document.getElementById('variant-tooltip');

    // Keep tooltip visible when hovering over it
    tooltip.addEventListener('mouseenter', () => {
        cancelHideTooltip();
    });

    // Hide tooltip when leaving it
    tooltip.addEventListener('mouseleave', () => {
        tooltip.classList.add('hidden');
    });
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    setupTooltipBehavior();
    loadManifest();
});
