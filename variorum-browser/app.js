// Subcutanean Variorum Browser
// JavaScript for interactive text display with variations

let variorumData = null;
let currentSection = 'prologue';
let currentBaseVersion = null;
let hideTooltipTimeout = null;

// Load the variorum data
async function loadVariorumData() {
    try {
        const response = await fetch('variorum_data/variorum.json');
        variorumData = await response.json();

        // Set up base version selector
        const selector = document.getElementById('base-version-select');
        variorumData.available_base_versions.forEach(vid => {
            const option = document.createElement('option');
            option.value = vid;
            option.textContent = `Version ${vid}`;
            selector.appendChild(option);
        });

        // Set default base version
        currentBaseVersion = variorumData.available_base_versions[0];
        selector.value = currentBaseVersion;

        // Add change handler
        selector.addEventListener('change', (e) => {
            currentBaseVersion = e.target.value;
            displaySection(currentSection);
        });

        // Update info panel
        document.getElementById('base-version').textContent = currentBaseVersion;
        document.getElementById('total-versions').textContent = variorumData.total_versions;

        // Display prologue by default
        displaySection('prologue');
    } catch (error) {
        console.error('Error loading variorum data:', error);
        document.getElementById('text-display').innerHTML =
            '<p class="loading">Error loading variorum data. Please ensure variorum.json is in the variorum_data folder.</p>';
    }
}

// Display a section (prologue or chapter1)
function displaySection(section) {
    currentSection = section;

    // Update active button
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`btn-${section}`).classList.add('active');

    // Get the section data for current base version
    const sectionData = variorumData.variorums_by_base[currentBaseVersion][section];

    // Update base version display
    document.getElementById('base-version').textContent = currentBaseVersion;

    // Count variations and omissions
    const variationCount = sectionData.filter(p => p.has_variation).length;
    const omissionCount = sectionData.filter(p =>
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

    sectionData.forEach((paragraph, paraIndex) => {
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

// Set up navigation
function setupNavigation() {
    document.getElementById('btn-prologue').addEventListener('click', () => {
        displaySection('prologue');
    });

    document.getElementById('btn-chapter1').addEventListener('click', () => {
        displaySection('chapter1');
    });
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    setupTooltipBehavior();
    loadVariorumData();
});
