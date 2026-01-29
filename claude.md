# Subcutanean Variorum Browser - Development Notes

## Project Overview

A web-based variorum browser for exploring textual variations across 25 versions of Aaron Reed's novel *Subcutanean*. Each copy of the novel is unique, generated from Quant markup language with different variations. This tool allows scholars and readers to compare variations across different witnesses, as well as upload additional versions of *Subcutanean* that they can also compare.

## Current Status

### Core Features

1. **Two-Version Comparison Mode**
   - Compare any two versions side-by-side
   - Four view modes: Unified, Side-by-side, Track Changes, and Collation
   - 25 pre-loaded versions (seeds 45443-45467)
   - Upload additional EPUB or TXT versions

2. **Navigation & UI**
   - Persistent navigation bar with dropdowns for Bookmarks, Files, Source, and Generate
   - Mobile-responsive with hamburger toggle on small screens
   - Modal dialogs for About, Generate Copy, Jaccard Distance, and Macro Inspector

3. **Analysis Tools**
   - Cross-chapter search with keyboard shortcuts (F3, Shift+F3)
   - Word differential analysis showing unique vocabulary
   - Jaccard Distance similarity measurement between versions
   - Quant Macro Inspector for viewing source markup

4. **File Management**
   - Upload EPUB or TXT versions of Subcutanean
   - Convert TXT files to EPUB format
   - Manage uploaded files with delete capability
   - LocalStorage persistence for uploads and bookmarks

5. **Generate Copy Feature**
   - Modal form to request a freshly generated unique copy
   - Submits to Google Apps Script which logs to Google Sheets
   - User receives PDF and EPUB (optionally TXT/HTML) via email

6. **Gonzo Mode**
   - 5x5 grid view showing all 25 versions simultaneously for a single chapter
   - Each cell displays one version's text for the current paragraph range
   - Arrow key navigation (left/right) through paragraph windows, auto-advancing across chapters
   - Custom nav bar with About, Theme toggle, and Close buttons (z-index: 6000, above main nav)
   - Dedicated Gonzo About modal (z-index: 7000) explaining the feature
   - Click seed number in cell header to jump to unified view at that location
   - Scroll position preserved when reopening Gonzo Mode
   - Empty cells for versions with fewer paragraphs than others

7. **Source Code Mode** (enhanced)
   - Click code icon on any paragraph to view underlying Quant source
   - Text similarity matching replaces position-based paragraph-to-source mapping
   - Handles multi-paragraph conditionals, variable-driven content, and macro expansions
   - Pre-computed mapping cached per chapter/version for performance
   - Macro reference and definition lookup for cross-file source viewing

8. **Passage-level Annotations**
   - Double-click any paragraph to add research notes tied to specific text
   - Annotations stored in localStorage with version, chapter, and paragraph context
   - Uses double-click (not single-click) to prevent accidental creation when clicking source buttons

## Technical Implementation

### Architecture

```
docs/
├── index.html              # Main HTML structure with all modals
├── styles.css              # Base styling
├── compare.css             # Comparison UI and nav bar styles
├── compare.js              # Main application JavaScript (~8500 lines)
├── origin_text/            # Quant source files
│   ├── manifest.txt        # File listing in reading order
│   ├── globals.txt         # Global variable and macro definitions
│   ├── ch01.txt ... ch17.txt
│   └── origin_sources.json # Pre-built JSON of all sources
├── extracted_text/         # JSON of extracted paragraphs per version
│   ├── version_XXXXX.json  # Individual version files
│   ├── all_versions.json   # Combined file with all versions
│   ├── variable_info.json  # Variable metadata for inference
│   └── levenshtein_distances.json
├── build_variable_info.py  # Extract variable info from Quant sources
├── extract_text_all.py     # Convert EPUBs to JSON
├── calculate_levenshtein.py # Calculate similarity metrics
├── build_origin_sources.py # Build Quant source JSON
└── add_variables.py        # Add variables from generation log
```

### Key JavaScript Functions (compare.js)

**Navigation:**
- `initializeNavigation()` - Sets up nav bar click handlers
- `toggleNavDropdown(dropdownId, navItemId)` - Opens/closes dropdown panels
- `closeAllNavDropdowns()` - Closes all open dropdowns
- `toggleMobileNav()` / `closeMobileNav()` - Mobile menu handling

**Modals:**
- `openAboutModal()` / `closeAboutModal()` - About dialog
- `openGenerateModal()` / `closeGenerateModal()` - Generate copy form
- `initializeGenerateForm()` - Form submission to Google Apps Script

**Comparison:**
- `loadAllVersions()` - Loads version list and populates selectors
- `loadComparison()` - Main comparison renderer
- `renderUnifiedView()` / `renderSideBySideView()` / `renderTrackChangesView()` / `renderCollationView()`

**Search:**
- `performSearch()` - Cross-chapter text search
- `navigateSearchResults(direction)` - F3/Shift+F3 navigation

**Analysis:**
- `calculateJaccardDistance()` - Vocabulary similarity
- `analyzeWordDifferences()` - Unique words per version
- `inspectMacro(macroName)` - Quant source lookup

**File Management:**
- `handleEpubUpload(event)` - Process uploaded EPUB/TXT
- `parseEpub(arrayBuffer, filename)` - Extract text from EPUB
- `convertTxtToEpub(versionId)` - Generate EPUB from TXT

**Bookmarks:**
- `saveBookmark()` / `loadBookmark()` / `deleteBookmark()`
- `loadBookmarksFromStorage()` / `saveBookmarksToStorage()`

**Source Code Mode (text similarity matching):**
- `stripQuantMarkup(text)` - Strips Quant syntax to get comparable plain text
- `buildSourceMatchIndex(sourceData)` - Pre-computes normalized word sets for all source blocks
- `findBestSourceMatch(renderedText, matchIndex, startHint)` - Word overlap scoring with sequential proximity tiebreaker
- `buildChapterSourceMapping(versionId, chapterId)` - Full chapter mapping with caching
- `clearSourceMappingCache()` - Cache invalidation on chapter/version/mode changes
- `getSourceForRenderedParagraph()` - Uses fuzzy matching instead of position-based lookup
- `computeSourceAvailability()` - Uses pre-computed mapping for availability checks

**Gonzo Mode:**
- `openGonzoMode()` / `closeGonzoMode()` - Fullscreen 5x5 grid lifecycle
- `renderGonzoGrid()` - Renders all 25 version cells for current paragraph window
- `gonzoNavigateNext()` / `gonzoNavigatePrev()` - Arrow key navigation with chapter auto-advance
- `updateGonzoNavButtons()` - Disables nav at absolute start/end only
- `gonzoOpenInUnifiedView()` - Click seed to jump to unified view at that location
- `openGonzoAboutModal()` / `closeGonzoAboutModal()` - Dedicated Gonzo About modal
- `updateGonzoThemeIcon()` - Syncs theme toggle icon in Gonzo header

**Annotations:**
- `setupParagraphClickHandlers()` - Double-click handler for creating annotations on paragraphs

### HTML Structure (index.html)

```html
<!-- Navigation Bar -->
<nav class="main-nav">
    <div class="nav-brand">...</div>
    <div class="nav-links">
        <button id="nav-about">About</button>
        <button id="nav-bookmarks">Bookmarks</button>
        <button id="nav-files">Files</button>
        <button id="nav-source">Source</button>
        <button id="nav-generate">Generate</button>
    </div>
    <button class="nav-mobile-toggle">...</button>
</nav>

<!-- Dropdown Panels -->
<div class="nav-dropdown" id="bookmarks-dropdown">...</div>
<div class="nav-dropdown" id="files-dropdown">...</div>
<div class="nav-dropdown" id="source-dropdown">...</div>

<!-- Main Content -->
<header>...</header>
<main id="comparison-container">...</main>

<!-- Modals -->
<div id="about-modal" class="modal hidden">...</div>
<div id="generate-modal" class="modal hidden">...</div>
<div id="levenshtein-modal" class="modal hidden">...</div>
<div id="macro-inspector-modal" class="modal hidden">...</div>
<div id="manage-uploads-modal" class="modal hidden">...</div>

<!-- Gonzo Mode -->
<div id="gonzo-fullscreen" class="gonzo-fullscreen hidden">
    <div class="gonzo-header">...</div>    <!-- Custom nav bar (z-index: 6000) -->
    <div class="gonzo-grid">...</div>      <!-- 5x5 CSS grid -->
</div>
<div id="gonzo-about-modal" class="modal hidden gonzo-about-overlay">
    <!-- z-index: 7000, uses standard modal classes -->
</div>
```

### CSS Organization (compare.css)

- **Navigation Bar**: `.main-nav`, `.nav-brand`, `.nav-links`, `.nav-item`
- **Dropdowns**: `.nav-dropdown`, `.dropdown-header`, `.dropdown-body`
- **Modals**: `.modal`, `.modal-content`, `.modal-header`, `.modal-body`
- **Generate Form**: `.generate-modal-content`, `#subcutanean-form`
- **View Modes**: `.unified-view`, `.side-by-side-view`, `.track-changes-view`, `.collation-view`
- **Gonzo Mode**: `.gonzo-fullscreen` (z-index: 6000), `.gonzo-header`, `.gonzo-header-btn`, `.gonzo-grid`, `.gonzo-cell`, `.gonzo-cell-header-clickable`, `.gonzo-about-overlay` (z-index: 7000)
- **Source Code Mode**: `.source-toggle-btn`, `.source-code-panel`, `.source-highlight`
- **Responsive**: Media queries at 900px, 768px, 640px breakpoints

### Generate Copy Form

The generate form submits to a Google Apps Script endpoint:
```javascript
const scriptURL = 'https://script.google.com/macros/s/AKfycby.../exec';
// Sends: email, formats (optional: "plain text", "HTML (web)"), honeypot
```

The Apps Script logs requests to a Google Sheet, and a separate process generates and emails the unique variant.

## Data Structures

### Uploaded Versions (LocalStorage)

```javascript
// Key: 'subcutanean_uploaded_versions'
{
  "uploaded_12345": {
    "id": "uploaded_12345",
    "name": "My Copy",
    "chapters": {
      "prologue": ["paragraph1", "paragraph2", ...],
      "chapter-01": [...],
      ...
    }
  }
}
```

### Bookmarks (LocalStorage)

```javascript
// Key: 'subcutanean_bookmarks'
[
  {
    "name": "Ch5 comparison",
    "versionA": "45443",
    "versionB": "45467",
    "chapter": "chapter-05",
    "viewMode": "side-by-side"
  }
]
```

## UI/UX Design

### Navigation Bar
- Fixed position at top (z-index: 5000)
- Dark background (#0a1220) with orange accent
- Dropdown panels slide down with animation
- Mobile: collapses to hamburger menu at 640px

### Modals
- Dark overlay with centered content
- Close via X button or click outside
- Scrollable body for long content

### View Modes
1. **Unified**: Single column, differences highlighted inline
2. **Side-by-side**: Two columns, synchronized scrolling
3. **Track Changes**: Deletions struck through, additions highlighted
4. **Collation**: Table format showing all version texts

### Color Scheme & Theming

The app supports dark mode (default) and light mode via a toggle in the nav bar.

**Dark Mode (default):**
- Background: #0f1a2a (dark blue)
- Text: #e8e8e8 (light gray)
- Accent: #ff8800 (orange)
- Nav bar: #0a1220

**Light Mode:**
- Background: #f5f5f5
- Text: #2c2c2c
- Accent: #d96800 (darker orange for contrast)
- Nav bar: #2d2520 (stays dark for orange glow contrast)

**Theme Implementation:**
- CSS variables in `:root` and `[data-theme="light"]` selectors
- Theme state stored in localStorage (`subcutanean_theme`)
- Toggle button in nav bar with sun/moon icons
- `initializeTheme()`, `applyTheme()`, `toggleTheme()` functions in compare.js

**Diff highlighting (both themes):**
- Additions: green highlights
- Deletions: red/struck text

## Source Data

- **EPUB files** in `sources/subcutaneans/`
- **Quant source files** in `docs/origin_text/`
- Each chapter has its own source file with macro definitions

## Processing EPUB Seeds into Variorum Data

### Directory Structure

```
sources/subcutaneans/           # Source EPUB files
├── subcutanean-45443/         # Traditional format: subcutanean-XXXXX/
│   └── 45443.epub
├── 60001/                     # Also supports: numeric folder names
│   └── 60001.epub
└── 60002/
    └── anything.epub          # EPUB filename can vary

docs/extracted_text/            # Output JSON files
├── version_45443.json         # Individual version files
├── version_60001.json
├── all_versions.json          # Combined file with all versions
└── levenshtein_distances.json # Pre-calculated similarity metrics

docs/origin_text/               # Quant source files
├── manifest.txt               # File listing in reading order
├── globals.txt                # Global macro definitions
├── ch01.txt ... ch17.txt      # Chapter source files
└── origin_sources.json        # Pre-built JSON of all sources
```

### Processing Scripts

All scripts are in `docs/`:

| Script | Purpose | Command |
|--------|---------|---------|
| `extract_text_all.py` | Convert EPUBs to JSON | `python extract_text_all.py` |
| `calculate_levenshtein.py` | Calculate similarity metrics | `python calculate_levenshtein.py` |
| `build_origin_sources.py` | Build Quant source JSON | `python build_origin_sources.py` |

### Step-by-Step: Adding New Seeds

1. **Place EPUB files** in `sources/subcutaneans/`:
   - Format: `subcutanean-XXXXX/XXXXX.epub` OR `XXXXX/XXXXX.epub`
   - Numeric-only folder names are supported (e.g., `60001/60001.epub`)

2. **Run extraction script**:
   ```bash
   cd docs
   python extract_text_all.py
   ```
   This generates:
   - Individual `version_XXXXX.json` files
   - Combined `all_versions.json`

3. **Recalculate similarity metrics** (recommended):
   ```bash
   python calculate_levenshtein.py
   ```
   Updates `levenshtein_distances.json`

4. **Rebuild origin sources** (only if Quant source files changed):
   ```bash
   python build_origin_sources.py
   ```

### EPUB Chapter Mapping

The extraction script maps EPUB chapters to JSON keys:

| EPUB File | JSON Key | Content |
|-----------|----------|---------|
| ch001.xhtml | introduction | Book introduction |
| ch002.xhtml | prologue | Part One + prologue |
| ch003-ch011.xhtml | chapter1-9 | Chapters 1-9 |
| ch012.xhtml | part2 | Part Two header |
| ch013-ch018.xhtml | chapter10-15 | Chapters 10-15 |
| ch019.xhtml | part3 | Part Three header |
| ch020-ch022.xhtml | chapter16-18 | Chapters 16-18 |
| ch024.xhtml | notes | Author's notes |

**Excluded sections** (non-narrative, never vary):
- ch023.xhtml - Bonus content
- ch025.xhtml - Kickstarter backers
- ch026.xhtml - About the author

### Text Formatting Preservation

The extraction preserves inline HTML formatting:
- `<em>` and `<i>` tags for italics
- `<strong>` and `<b>` tags for bold
- Nested formatting is supported

### Version JSON Structure

```json
{
  "version_id": "60001",
  "introduction": ["paragraph1", "paragraph2 with <em>italics</em>", ...],
  "prologue": [...],
  "chapter1": [...],
  ...
  "notes": [...]
}
```

### Version ID Detection

The script extracts version IDs from (in priority order):
1. Folder name: `subcutanean-XXXXX` → XXXXX
2. Folder name: pure numeric (e.g., `60001`)
3. Folder name: any 4+ digit number
4. EPUB filename: pure numeric or contains 4+ digits

## Quant Background

Aaron Reed's Quant markup language allows:
- Conditional text based on variables
- Macro expansion with multiple variants
- Probabilistic selection
- Complex dependency trees

The Macro Inspector feature lets users view the original Quant source to understand how variations are generated.

### Quant Syntax Quick Reference

```
[DEFINE @varname]              # Define a variable (always on)
[DEFINE ^@varname]             # Define optional variable (may be off)
[DEFINE @var1|@var2]           # Mutually exclusive alternatives
[DEFINE 50>@var1|50>@var2]     # With probabilities

[@varname>text...]             # Conditional text (show if @varname active)
[^@varname>text...]            # Negated conditional (show if @varname NOT active)

[MACRO MacroName][@var1>text1|@var2>text2]  # Macro definition
{MacroName}                    # Macro usage in chapter text
```

### Chapter ID Mapping

Source files (in `origin_text/`) map to browser chapter IDs:

| Source File | Browser ID | Notes |
|-------------|------------|-------|
| part01.txt | prologue | Part One header + prologue |
| ch01.txt | chapter1 | |
| ch02.txt | chapter2 | |
| ... | ... | |
| ch09.txt | chapter9 | |
| part02.txt | part2 | Part Two header |
| ch10.txt | chapter10 | |
| ... | ... | |
| ch15.txt | chapter15 | |
| part03.txt | part3 | Part Three header |
| ch16.txt | chapter16 | |
| ch17.txt | chapter17 | |
| epilogue.txt | chapter18 | |
| notes.txt | notes | Author's notes |

This mapping is defined in `build_variable_info.py` as `CHAPTER_MAPPING`.

## Recent Changes (January 2026)

### Variables Panel & Variable Inference

A new "Variables" dropdown in the nav bar shows which Quant variables differ between compared versions:
- **Only in A/B**: Variables unique to each version (clickable to highlight affected text)
- **Shared**: Variables present in both versions
- Click a variable tag to highlight paragraphs containing text affected by that variable
- Highlighted paragraphs show a "View Source" button (Lucide `file-code` icon) to see underlying Quant markup

**Variable Inference for Uploaded EPUBs:**
When users upload an EPUB with a different seed, the system infers which variables are active:
- For mutually exclusive groups (e.g., `dadphone|bradphone`): scores each variable by pattern matches, picks highest
- For optional variables (e.g., `possibles`, `alcohol`): checks if any patterns match
- Inferred variables are stored with the uploaded version in `customVersions`

**Key Functions (compare.js):**
- `getVersionVariables(versionId)` - Returns variables for a version (checks both `allVersions` and `customVersions`)
- `updateVariableDiff()` - Populates the Variables panel
- `highlightVariableText(varName)` - Highlights paragraphs affected by a variable
- `inferVariablesFromText(chapters)` - Infers variables from uploaded EPUB text
- `addViewSourceButton()` - Adds clickable source button to highlighted paragraphs
- `showVariableSourcePanel(varName, paragraphEl)` - Shows Quant source for a variable

**CSS Classes:**
- `.variable-highlight` - Yellow highlight for affected paragraphs
- `.var-source-btn` - Circular button positioned outside paragraph bounds (`top: -12px; right: -12px`)
- `.var-source-panel` - Floating panel showing Quant source code

### Variable Info JSON Structure

The `docs/extracted_text/variable_info.json` file has a nested structure:

```json
{
  "variables": {
    "varname": {
      "description": "From globals.txt comments",
      "chapters": ["chapter1", "chapter5"],
      "usage_count": 5,
      "macros": ["MacroName"],
      "group": ["varname", "altvarname"],  // null if independent
      "optional": true,  // true if ^@varname in DEFINE
      "patterns": {
        "chapter1": ["text snippet for matching..."]
      }
    }
  },
  "groups": [
    {
      "variables": ["dadphone", "bradphone"],
      "description": "Mutually exclusive description",
      "type": "exclusive"
    }
  ],
  "macros": {
    "MacroName": ["var1", "var2"]
  }
}
```

### Processing Scripts Update

| Script | Purpose | Command |
|--------|---------|---------|
| `build_variable_info.py` | Extract variable info from Quant sources | `python3 build_variable_info.py` |

The `build_variable_info.py` script:
- Parses `globals.txt` for variable definitions, descriptions, and macros
- Tracks variable groups (mutually exclusive alternatives from `[DEFINE @a|@b]`)
- Tracks optional variables (from `[DEFINE ^@varname]`)
- Extracts text patterns from chapter conditionals (`[@varname>text...]`)
- Extracts text patterns from macro definitions (`[MACRO Name][@var>text...]`)
- Outputs to `docs/extracted_text/variable_info.json`

### Light/Dark Mode Toggle
- Added theme toggle button to navigation bar
- Dark mode remains default; light mode available
- Orange accent/glow preserved in both themes (darker in light mode)
- Nav bar stays dark in light mode for glow contrast
- Theme preference persists via localStorage
- Nav bar uses system sans-serif font for legibility

### UX Consolidation
- Replaced hamburger menu + FAB buttons with persistent navigation bar
- Moved Bookmarks, Files, and Source panels into nav dropdowns
- Added "Generate" button to nav bar

### Generate Copy Modal
- Converted separate generate.html page into modal on index.html
- Form submits to Google Apps Script for processing
- Users can request PDF, EPUB, TXT, or HTML formats

### Navigation Implementation
- `initializeNavigation()` sets up all nav handlers
- `initializeGenerateForm()` handles form submission
- Click-outside-to-close for dropdowns and modals
- Mobile toggle preserves functionality on small screens

### EPUB Processing Enhancements
- Support for numeric-only folder names (e.g., `60001/60001.epub`)
- Bold/strong tag preservation in text extraction
- Both Python script and JavaScript parser updated

### Gonzo Mode (5x5 Grid View)

A fullscreen 5x5 grid showing all 25 versions simultaneously for comparative reading.

**Features:**
- Each cell shows one version's text for the current paragraph window
- Arrow key navigation (left/right) moves through paragraph windows
- Auto-advances to next/previous chapter at boundaries
- Custom header bar with About, Theme toggle, and Close buttons
- Click seed number in cell header to open that version in unified view at the current location
- Scroll position preserved when reopening Gonzo Mode
- Empty cells shown for versions with fewer paragraphs

**Z-index layering:**
- Main nav bar: 5000
- Gonzo fullscreen: 6000 (covers main nav)
- Gonzo About modal: 7000 (above Gonzo mode)

**Light mode compatibility:**
- Gonzo header buttons use forced light text (`color: #e8e8e8`) since the header background stays dark in both themes

**Key constant:**
- `GONZO_CHAPTERS` — ordered array of all chapter IDs for cross-chapter navigation

**State variables:**
- `gonzoHasBeenOpened` — tracks if Gonzo has been opened before (for scroll position preservation)
- `savedScrollPosition` — stores scroll position when entering Gonzo Mode

### Source Code Mode: Text Similarity Matching

Replaced position-based paragraph-to-source mapping with text similarity matching to fix misalignment caused by Quant's multi-paragraph conditionals.

**Problem:** The original position-based mapping (paragraph N → source block N) broke because:
1. Multi-paragraph conditionals (e.g., `[@spiralhall>...70 lines...]`) split into ~35 source blocks but render as ~20 paragraphs (or 0 if inactive)
2. Alternative branches with multi-paragraph content create variable paragraph counts
3. Chapter 8 has 215 source blocks but seed 60001 renders only 132 paragraphs

**Solution:** Word overlap coefficient scoring:
1. `stripQuantMarkup()` removes Quant syntax from source text for comparison
2. `buildSourceMatchIndex()` pre-computes normalized word sets for all source blocks
3. `findBestSourceMatch()` scores each source block by `|intersection| / min(|rendered|, |source|)` with sequential proximity as tiebreaker
4. `buildChapterSourceMapping()` pre-computes full chapter mapping, cached per `versionId-chapterId`

**Cache invalidation:** `clearSourceMappingCache()` called when:
- Chapter changes (in `displayComparison()`)
- Version selector changes
- Source code mode is toggled

**Indexing change:** Uses `highlightedBlocks[]` (all blocks) instead of `contentOnlyHighlighted[]` since fuzzy matching naturally avoids comment/formatting blocks.

**Uploaded versions:** Source Code Mode works with uploaded versions — the matching is based on text content, so it handles any version regardless of how it was loaded.

### Double-click for Annotations

Changed annotation creation from single-click to double-click (`dblclick` event) in `setupParagraphClickHandlers()`. This prevents accidental annotation modal opens when clicking near the source toggle button or other interactive elements. Applied globally across all view modes for consistent behavior.

## Development Notes

### Icon Usage: Lucide Icons (NOT Emoji)

**IMPORTANT**: Always use Lucide icons, never emoji. The project uses the Lucide icon library.

```html
<!-- In HTML -->
<i data-lucide="file-code"></i>
<i data-lucide="search"></i>
<i data-lucide="bookmark"></i>
```

```javascript
// After adding icons dynamically, initialize them:
if (typeof lucide !== 'undefined') {
    lucide.createIcons({ nodes: [containerElement] });
}
```

Common icons used:
- `file-code` - View source
- `search` - Search
- `bookmark` - Bookmarks
- `upload` - File upload
- `sun` / `moon` - Theme toggle
- `x` - Close/delete
- `grid-3x3` - Gonzo Mode
- `info` - About (in Gonzo header)
- `chevron-left` / `chevron-right` - Navigation arrows

### Important Container IDs and Selectors

The main comparison display container is `comparison-display` (NOT `comparison-container`):
```javascript
const container = document.getElementById('comparison-display');
```

Paragraph selectors vary by view mode:
```javascript
// Select paragraphs in comparison views
const paragraphs = container.querySelectorAll('p, .comparison-paragraph, .source-paragraph');
```

### Adding New Modals
1. Add HTML structure with `class="modal hidden"`
2. Add open/close functions in compare.js
3. Add click handler for trigger button
4. Add close button and click-outside handlers

### Adding Nav Items
1. Add button in `.nav-links` div in index.html
2. Add dropdown panel if needed (`.nav-dropdown`)
3. Add click handler in `initializeNavigation()`

### Form Submission Pattern
```javascript
function initializeMyForm() {
    const form = document.getElementById('my-form');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('field', form.field.value);
        fetch(scriptURL, { method: 'POST', body: formData })
            .then(response => { /* success */ })
            .catch(error => { /* error */ });
    });
}
```

### Z-index Layering

The app uses a structured z-index hierarchy. Respect this when adding new overlays:

| Element | Z-index | Notes |
|---------|---------|-------|
| Main nav bar | 5000 | Fixed top position |
| Nav dropdowns | 5001 | Just above nav bar |
| Gonzo Mode fullscreen | 6000 | Covers entire page including nav |
| Gonzo About modal | 7000 | Above Gonzo mode |
| Standard modals | 2000 | Below nav bar (covered by Gonzo) |

### Event Handling: Annotations

Annotations use `dblclick` (double-click), not `click`, to prevent accidental creation when interacting with other clickable elements (source toggle buttons, variable highlights, etc.). This is set in `setupParagraphClickHandlers()`.

### Quant Syntax Highlighting

Use `highlightQuantSyntax(code)` for displaying Quant source code. It handles HTML escaping internally, so pass raw text (not pre-escaped):
```javascript
// Correct:
html += `<pre class="var-source-code">${highlightQuantSyntax(rawSnippet)}</pre>`;

// Wrong (causes double-escaping like &#039;):
html += `<pre class="var-source-code">${highlightQuantSyntax(escapeHtml(rawSnippet))}</pre>`;
```

## Planned Features

### Annotation & Scholarly Notes Feature (Partially Implemented)

A research layer for the browser enabling:
1. **Enhanced Bookmarks** - Add notes/commentary field to saved bookmarks (not yet implemented)
2. **Passage-level Annotations** - Double-click paragraphs to add notes tied to specific text (implemented)
3. **Export** - Export annotations in both JSON and Markdown formats (not yet implemented)

**Proposed Data Structures:**

```javascript
// Enhanced bookmark (extends existing bookmark)
{
    id: "bookmark-1705001234567",
    name: "Important variant in Ch 5",
    versionA: "45443",
    versionB: "45467",
    chapter: "chapter-05",
    mode: "sidebyside",
    scrollPosition: 1245.5,
    notes: "This passage shows significant divergence..."  // NEW
}

// New localStorage key: 'subcutanean_annotations'
{
    "annotation-1705001234567": {
        id: "annotation-1705001234567",
        created: "2026-01-18T12:00:00Z",
        modified: "2026-01-18T14:30:00Z",
        versionA: "45443",
        versionB: "45467",
        chapter: "chapter-05",
        paragraphIndex: 12,
        paragraphPreview: "The door creaked...",
        note: "Compare with seed 45450..."
    }
}
```

**Proposed Export Format (Markdown):**
```markdown
# Subcutanean Variorum - Research Notes
Exported: January 18, 2026

## Bookmarks
### Important variant in Ch 5
- Versions: Seed 45443 vs Seed 45467
- Chapter: Chapter 5
- Notes: This passage shows significant divergence...

## Passage Annotations
### Chapter 5, Paragraph 12
- Versions: Seed 45443 vs Seed 45467
- Text: "The door creaked..."
- Notes: Compare with seed 45450...
```

## Credits

- **Novel**: *Subcutanean* by Aaron Reed (CC-BY 4.0 as of 2025)
- **Quant Language**: Aaron Reed
- **Variorum Browser**: Mark Sample, developed with Claude Code
- **Book History Practices**: Following TEI/scholarly variorum standards

## License

*Subcutanean* source and text released under CC-BY 4.0 by Aaron Reed in 2025.
