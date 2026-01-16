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

## Technical Implementation

### Architecture

```
docs/
├── index.html              # Main HTML structure with all modals
├── styles.css              # Base styling
├── compare.css             # Comparison UI and nav bar styles
├── compare.js              # Main application JavaScript (~4400 lines)
├── origin-sources/         # Quant source files for macro inspection
│   ├── prologue.txt
│   ├── chapter-01.txt
│   └── ... (all chapters)
├── extracted_text/         # JSON of extracted paragraphs per version
└── variorum_data/
    └── variorum.json       # Aligned variorum data
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
```

### CSS Organization (compare.css)

- **Navigation Bar**: `.main-nav`, `.nav-brand`, `.nav-links`, `.nav-item`
- **Dropdowns**: `.nav-dropdown`, `.dropdown-header`, `.dropdown-body`
- **Modals**: `.modal`, `.modal-content`, `.modal-header`, `.modal-body`
- **Generate Form**: `.generate-modal-content`, `#subcutanean-form`
- **View Modes**: `.unified-view`, `.side-by-side-view`, `.track-changes-view`, `.collation-view`
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

## Recent Changes (January 2026)

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

## Development Notes

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

## Credits

- **Novel**: *Subcutanean* by Aaron Reed (CC-BY 4.0 as of 2025)
- **Quant Language**: Aaron Reed
- **Variorum Browser**: Mark Sample, developed with Claude Code
- **Book History Practices**: Following TEI/scholarly variorum standards

## License

*Subcutanean* source and text released under CC-BY 4.0 by Aaron Reed in 2025.
