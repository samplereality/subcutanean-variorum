// Subcutanean Variorum Browser
// JavaScript for interactive text display with variations

let variorumData = null;
let currentSection = 'prologue';

// Load the variorum data
async function loadVariorumData() {
    try {
        const response = await fetch('variorum_data/variorum.json');
        variorumData = await response.json();

        // Update info panel
        document.getElementById('base-version').textContent = variorumData.base_version;
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

    // Get the section data
    const sectionData = variorumData[section];

    // Count variations
    const variationCount = sectionData.reduce((count, para) => {
        return count + para.segments.filter(seg => seg.has_variation).length;
    }, 0);

    document.getElementById('variation-count').textContent =
        variationCount + ' variation point' + (variationCount !== 1 ? 's' : '');

    // Render the text
    const textDisplay = document.getElementById('text-display');
    textDisplay.innerHTML = '';

    sectionData.forEach((paragraph, paraIndex) => {
        const p = document.createElement('p');

        paragraph.segments.forEach((segment, segIndex) => {
            if (segment.has_variation && segment.variants.length > 0) {
                // Create a span for variant text
                const span = document.createElement('span');
                span.className = 'variant';
                span.textContent = segment.text;
                span.dataset.variants = JSON.stringify(segment.variants);
                span.dataset.paraIndex = paraIndex;
                span.dataset.segIndex = segIndex;

                // Add hover event
                span.addEventListener('mouseenter', showVariantTooltip);
                span.addEventListener('mouseleave', hideVariantTooltip);

                p.appendChild(span);
            } else {
                // Regular text
                const textNode = document.createTextNode(segment.text);
                p.appendChild(textNode);
            }
        });

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
    variants.forEach(variant => {
        const li = document.createElement('li');
        li.textContent = variant;
        variantList.appendChild(li);
    });

    // Position tooltip near the cursor
    const rect = event.target.getBoundingClientRect();
    tooltip.style.left = Math.min(rect.left, window.innerWidth - 370) + 'px';
    tooltip.style.top = (rect.bottom + 10) + 'px';

    // Show tooltip
    tooltip.classList.remove('hidden');
}

// Hide variant tooltip
function hideVariantTooltip() {
    const tooltip = document.getElementById('variant-tooltip');
    tooltip.classList.add('hidden');
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
    loadVariorumData();
});
