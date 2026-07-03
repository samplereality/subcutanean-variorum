# Subcutanean Variorum Browser - Development Notes

## Project Overview

A web-based variorum browser for exploring textual variations across 25 versions of Aaron Reed's novel *Subcutanean*. Each copy of the novel is unique, generated from Quant markup language with different variations. This tool allows scholars and readers to compare variations across different witnesses, as well as upload additional versions of *Subcutanean* that they can also compare.

## Current Status

### Core Features

1. **Two-Version Comparison Mode**
   - Compare any two versions side-by-side
   - Four view modes: Unified, Side-by-side, Track Changes, and Collation
   - 25 pre-loaded versions (seeds 60001-60025)
   - Upload additional EPUB or TXT versions

2. **Navigation & UI**
   - Persistent navigation bar with dropdowns for Bookmarks, Notes, Files, and Generate
   - View dropdown menu: 6 view modes (Unified, Side-by-side, Track Changes, Collation, Gonzo, Gonzo CAVE)
   - Analyze dropdown menu: 7 tools (Source Code, Variables, Word Diff, Heatmap, Tapestry, Pathways, Final Fight)
   - Dropdowns auto-close after selection (150ms delay)
   - Hamburger menu at ≤968px (tablet/phone); mobile version tabs for side-by-side at ≤968px
   - Modal dialogs for About, Generate Copy, Jaccard Distance, Word Diff, and Macro Inspector

3. **Search**
   - Two search modes: "Chapter" (current chapter only) and "All" (cross-chapter)
   - Sticky search bar (position: sticky below nav bar, persists on scroll)
   - DOM-driven match counting (counts actual highlighted spans, always accurate)
   - Shows which seeds contain matches ("in both Seed X and Seed Y", "in Seed X only")
   - No auto-scroll on search; user clicks next arrow to navigate to matches
   - F3/Shift+F3 keyboard navigation; cross-chapter only in "All" mode

4. **Analysis Tools**
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

7. **Gonzo CAVE** (standalone page)
   - FPS-style immersive reading room using Three.js CSS3DRenderer
   - Inside-out cube: 4 walls + ceiling display 25 seeds (5 per face) in newspaper columns
   - Floor displays project info/about text
   - PointerLock mouselook with full 360° rotation in all directions
   - WASD 3D movement following camera gaze (look up + W = move toward ceiling)
   - Momentum-based scroll wheel text advancement with friction and chapter boundary resistance
   - Q/E chapter navigation with transition flash overlay
   - Chapter headers at paragraph index 0
   - HUD: crosshair, controls hint, click-to-enter prompt with styled box
   - About modal with CAVE history, layout diagram, and control reference
   - Light/dark theme toggle (walls switch between dark bg + glowing text and light bg + dark text)
   - Breadcrumb nav bar with chapter/paragraph indicator
   - Standalone `cave.html` page, accessed via View dropdown or direct URL

8. **Source Code Mode** (enhanced)
   - Click code icon on any paragraph to view underlying Quant source
   - Text similarity matching replaces position-based paragraph-to-source mapping
   - Handles multi-paragraph conditionals, variable-driven content, and macro expansions
   - Pre-computed mapping cached per chapter/version for performance
   - Macro reference and definition lookup for cross-file source viewing

9. **Passage-level Annotations** (enhanced)
   - Double-click any paragraph to add research notes tied to specific text
   - Floating draggable note panels with orange glow styling (position: absolute, scroll with page)
   - Leader lines (via leader-line-new) connect note panels to their annotated paragraphs
   - Toggle to show/hide leader lines (icon in Notes dropdown header)
   - Notes positioned to avoid obscuring the paragraph (right side preferred, left fallback, above/below for full-width views)
   - Notes fade out when scrolling behind sticky seed headers
   - Auto-close on first save; read-only mode for existing annotations
   - Notes close automatically on chapter change
   - Clicking a note in the Notes pane jumps to the paragraph and opens the note panel beside it
   - Annotations stored in localStorage with version, chapter, and paragraph context
   - Uses double-click (not single-click) to prevent accidental creation when clicking source buttons

## Technical Implementation

### Architecture

```
docs/
├── index.html              # Main HTML structure with all modals
├── styles.css              # Base styling
├── compare.css             # Comparison UI and nav bar styles
├── compare.js              # Main application JavaScript (~11500 lines)
├── origin_text/            # Quant source files
│   ├── manifest.txt        # File listing in reading order
│   ├── globals.txt         # Global variable and macro definitions
│   ├── ch01.txt ... ch17.txt
│   └── origin_sources.json # Pre-built JSON of all sources
├── extracted_text/         # JSON of extracted paragraphs per version
│   ├── version_XXXXX.json  # Individual version files
│   ├── all_versions.json   # Combined file (fallback + Python pipeline source; browser no longer fetches it at startup)
│   ├── versions_index.json # ~24KB startup index: version IDs, variables, chapter lists (progressive loading)
│   ├── chapters/           # Per-chapter files (all 25 seeds each) fetched on demand
│   │   └── <chapterId>.json
│   ├── variable_info.json  # Variable metadata for inference
│   └── levenshtein_distances.json
├── build_variable_info.py  # Extract variable info from Quant sources
├── extract_text_all.py     # Convert EPUBs to JSON
├── calculate_levenshtein.py # Calculate similarity metrics
├── build_origin_sources.py # Build Quant source JSON
├── add_variables.py        # Add variables from generation log
├── pathways.html           # Story Pathways Sankey/alluvial visualization
├── scan_pathways.py        # Preprocessing for pathways data
├── final_fight.html        # Final fight arena analysis visualization
├── build_final_fight.py    # Preprocessing for final fight data
└── cave.html         # FPS immersive CAVE reading room (Three.js CSS3DRenderer)
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
- `normalizeVerseParagraphs()` - Converts `\n`-containing paragraphs to verse-inline markup (in `getChapterContent()`)

**Track Changes (Diff):**
- `displayDiffTwoWay()` - Two-version word-level diff using `Diff.diffWords()`
- `displayDiffThreeWay()` - Three-version merged inline diff
- `renderWordDiffSpans()` - Simple two-text word diff with configurable CSS classes
- `renderMergedThreeWayDiff()` - Position-based merge of A→B and A→C diffs into single paragraph
- `stripHtmlForDiff()` - Strips all formatting/verse tags for plain-text comparison
- `alignParagraphs()` - Anchor-based paragraph alignment (Jaccard similarity, 0.3 threshold, 20-para window)
- `alignThreeParagraphs()` - Pairwise alignment merge with A as anchor
- `classifyThreeWay()` - Categorizes aligned triples (abc-identical, ab-match, ac-match, bc-match, all-different, unique-*)

**Search:**
- `performSearch()` - Runs search in current scope (chapter or global)
- `findChaptersWithMatches(searchTerm)` - Pre-scans chapters for matches (for cross-chapter F3)
- `highlightSearchMatches(searchTerm)` - Walks DOM text nodes and wraps matches in `.search-highlight` spans
- `scrollToCurrentHighlight()` - Scrolls to and marks the current highlight
- `goToNextOccurrence()` / `goToPreviousOccurrence()` - F3/Shift+F3 navigation (cross-chapter only in global mode)
- `getSearchSeedInfo(searchTerm)` - Returns which seeds contain the term in the current chapter
- `updateSearchPanelHeight()` - Updates `--search-panel-height` CSS variable for sticky seed header offset

**Analysis:**
- `calculateJaccardDistance()` - Vocabulary similarity
- `analyzeWordDifferences()` - Unique words per version
- `inspectMacro(macroName)` - Quant source lookup

**File Management:**
- `handleEpubUpload(event)` - Process uploaded EPUB/TXT
- `parseEpub(arrayBuffer, filename)` - Extract text from EPUB
- `convertTxtToEpub(versionId)` - Generate EPUB from TXT

**Bookmarks:**
- `saveCurrentBookmark()` - Opens bookmark name modal (replaces browser prompt)
- `confirmBookmarkSave()` / `closeBookmarkNameModal()` - Modal save/cancel handlers
- `applyBookmark()` / `deleteSelectedBookmark()`
- `loadBookmarksFromStorage()` / `saveBookmarksToStorage()`
- `saveViewState()` - Saves current view (seeds, chapter, mode) to sessionStorage before navigating away
- `consumeViewState()` - Reads and removes saved view state from sessionStorage on return

**Word Diff:**
- `calculateWordDifferential()` - Computes unique vocabulary per version
- `displayWordLists()` - Renders word items with `--i` CSS variable for staggered float animation
- `setupWordRepulsion(listEl)` - Mouse-proximity repulsion effect on word items in a `.word-list`
- `initWordRepulsion()` - Initializes repulsion on all `.word-list` containers
- `showWordPopup()` - Shows chapter occurrence popup on word click
- `jumpToChapterWithWord()` - Navigates to chapter and searches for clicked word

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
- `openAnnotationModal()` - Creates floating note panel with paragraph-relative positioning
- `closeNotePanel()` / `closeAllNotePanels()` - Panel lifecycle management
- `saveNotePanel()` - Saves annotation; auto-closes on first save
- `jumpToAnnotation()` - Navigates to annotation's chapter/paragraph and opens panel beside it
- `bringNotePanelToFront()` - Z-index management for overlapping panels

**Leader Lines (annotation connectors):**
- `createNoteLine(panelId)` - Creates LeaderLine between note panel and annotated paragraph
- `removeNoteLine(panelId)` / `removeAllNoteLines()` - Line cleanup
- `updateAllNoteLines()` - Repositions all lines (called on scroll)
- `recreateAllNoteLines()` - Rebuilds all lines (called on theme change, chapter render)
- `findAnnotatedParagraph()` - Finds DOM paragraph by index and version
- `updateNotePanelVisibility()` - Fades panels behind sticky headers

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
<header>
    <!-- Version selectors, chapter nav, View/Analyze dropdowns, Search toggle -->
</header>

<!-- Sticky search panel (outside header for proper sticky behavior) -->
<div id="search-panel">
    <input id="search-input" />
    <button id="search-chapter-btn">Chapter</button>  <!-- Search current chapter -->
    <button id="search-all-btn">All</button>           <!-- Search all chapters -->
    <div id="search-navigation">...</div>              <!-- Prev/next + count + seed info -->
</div>

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
- **Control Dropdowns**: `.control-dropdown`, `.dropdown-menu`, `.dropdown-item` (View/Analyze menus)
- **Modals**: `.modal`, `.modal-content`, `.modal-header`, `.modal-body`
- **Generate Form**: `.generate-modal-content`, `#subcutanean-form`
- **Search Panel**: `#search-panel` (sticky), `.search-box`, `.search-navigation`, `.search-highlight`
- **View Modes**: `.unified-view`, `.side-by-side-view`, `.track-changes-view`, `.collation-view`
- **Gonzo Mode**: `.gonzo-fullscreen` (z-index: 6000), `.gonzo-header`, `.gonzo-header-btn`, `.gonzo-grid`, `.gonzo-cell`, `.gonzo-cell-header-clickable`, `.gonzo-about-overlay` (z-index: 7000)
- **Source Code Mode**: `.source-toggle-btn`, `.source-code-panel`, `.source-highlight`
- **CSS Variables**: `--search-panel-height`, `--mobile-tabs-height` (set by JS, used by sticky headers)
- **Responsive**: Media queries at 968px (tablet/hamburger), 640px (mobile) breakpoints
- **Mobile Version Tabs**: `.mobile-version-tabs`, `.mobile-version-tab`, `.mobile-hidden`

### Generate Copy Form

The generate form submits to a Google Apps Script endpoint:
```javascript
const scriptURL = 'https://script.google.com/macros/s/AKfycby.../exec';
// Sends: email, formats (optional: "plain text", "HTML (web)"), honeypot
```

The Apps Script logs requests to a Google Sheet, and a separate process generates and emails the unique variant.

## Data Structures

### Uploaded Versions (IndexedDB)

Stored in IndexedDB — DB `subcutanean`, object store `customVersions`, single record under key `all` (moved from localStorage to escape its ~5MB quota; legacy localStorage key `subcutanean_custom_versions` migrates automatically on load):

```javascript
// IndexedDB 'subcutanean' → store 'customVersions' → key 'all'
{
  "12345": {
    "name": "Seed 12345",
    "data": {
      "version_id": "12345",
      "prologue": ["paragraph1", "paragraph2", ...],
      "chapter1": [...],
      ...
    },
    "uploadDate": "2026-07-03T...",
    "variables": [...]   // inferred on upload
  }
}
```

Access via async `loadCustomVersions()` / `saveCustomVersions()` in compare.js; `pathways.html` and `final_fight.html` read the same store with a read-only `readUploadedVersions()` helper.

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
   - Per-chapter files `chapters/<chapterId>.json` + `versions_index.json` (progressive loading — see below)

   If you later run `add_variables.py` (which adds `variables` to `all_versions.json`), re-split so the index picks up the variables:
   ```bash
   python extract_text_all.py --split-only
   ```

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
- `<blockquote>` content wrapped in `<span class="verse-inline">` with `<br>` for line breaks
- Verse/poetry content rendered with indentation and italics (CSS `.verse-inline`)

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

## Recent Changes (July 2026)

### Progressive Version Loading

Startup no longer fetches the ~9MB `all_versions.json`. Instead:
- `extracted_text/versions_index.json` (~24KB: version IDs, variables, chapter lists) and the initial chapter's file are fetched up front
- `extracted_text/chapters/<chapterId>.json` files (one per chapter, all 25 seeds' text) are loaded in the background after first render
- Chapter keys in the in-memory skeleton are `null` placeholders until their file arrives (keeps `buildChapterNavigation()` complete)
- `displayComparison()` and `renderGonzoGrid()` lazy-fetch a chapter's file if the user outruns the background load
- Whole-book features await `ensureFullVersionsLoaded()`: global search (`performSearch`), word differential, Jaccard modal, heatmap, EPUB export
- `cave.html` uses the same pattern (initial chapter + background load; `updateAllFaceText()` gates on chapter presence)
- Both pages fall back to the single-file `all_versions.json` load if the split files are missing
- Split files are generated by `extract_text_all.py` (or `--split-only` to re-split from an existing `all_versions.json`, e.g. after `add_variables.py`)

Key compare.js additions: `loadVersionsProgressive()`, `ensureChapterLoaded(chapterId)`, `ensureFullVersionsLoaded()`, `peekInitialChapter()`, state `progressiveMode` / `loadedChapters` / `fullVersionsPromise`.

### Uploaded Versions Moved to IndexedDB

Uploaded versions are stored in IndexedDB (DB `subcutanean`, store `customVersions`, key `all`) instead of localStorage, removing the ~5MB quota ceiling. Legacy localStorage data (`subcutanean_custom_versions`) migrates automatically on first load. `pathways.html` and `final_fight.html` read the same store via a read-only `readUploadedVersions()` helper (merges any unmigrated localStorage data). `saveCustomVersions()` / `loadCustomVersions()` are now async.

### Shareable Note Links

Annotations can be shared via URL — the note content travels IN the link (no server storage), so recipients see it without having it in their localStorage.

- **Share button** on saved note panels (`copyShareableNoteLink()`) copies a URL like `index.html?versionA=…&versionB=…&chapter=…&mode=…&note=<base64url payload>`
- Payload (`encodeSharedNote()`/`decodeSharedNote()`, UTF-8-safe base64url): `{ v: version, ch: chapter, p: paragraphIndex, pp: paragraphPreview, n: note text }`
- On load, the `note=` param (handled in `loadAllVersions` deep-link dispatch) opens a read-only floating panel (`openSharedNotePanel()`) beside the paragraph, with a "Shared" badge and a "Save to My Notes" button that writes it into the recipient's annotations
- Note text is URL-controlled: it is assigned via `value`/`textContent`, never interpolated into innerHTML (XSS)
- Warnings at share time: notes on uploaded versions (recipient needs the same upload), URLs > 2000 chars
- `positionNotePanel(panel, clickEvent)` was extracted from `openAnnotationModal()` and is shared by both panel types
- CSS: `.note-panel-share`, `.note-panel-shared-tag`, `.note-panel-save-shared`, `.shared-note-panel`

### Annotation Import/Export

Annotations support both export AND import (`importAnnotationsFromFile()`); bookmarks have neither import nor export yet.

## Earlier Changes (February 2026)

### View State Persistence Across Sub-Page Navigation

Navigating to visualization sub-pages (Pathways, Final Fight) and back now preserves the user's current view state (selected seeds, chapter, view mode, third version if active).

**Implementation:**
- `saveViewState()` writes `{ versionA, versionB, versionC?, chapter, mode }` to `sessionStorage` before navigating away
- `consumeViewState()` reads and removes the saved state on return (one-shot)
- URL params (deep links from sub-pages) take priority over saved state
- Saved state is consumed even when URL params are present, preventing stale restoration later
- View mode dropdown active state is synced on restore
- Third version is re-activated via `toggleThirdVersion(true)` if it was active

### Story Pathways Visualization (`pathways.html`)

Sankey/alluvial diagram showing how 10 key story-state variables flow across 10,000 generated variants. Built with D3.js.

**Features:**
- Nodes represent variable values; bands show how seeds flow between them
- Click a seed in the legend to reveal its path (animated trace); click again to hide (toggle)
- Click a node to reveal all seed paths through it; click again to hide them all (toggle)
- Hover nodes to highlight connected bands; hover paths for seed details
- Guided tour walks through the visualization step by step
- "Show All" / "Clear" buttons in legend
- Click a revealed seed path to navigate to that seed in the main variorum

**Key function:** `revealSeedsThroughNode(nodeId)` — toggles: if all seeds through the node are already revealed, removes them all; otherwise reveals any not yet shown.

**Preprocessing:** `scan_pathways.py` extracts pathway variables from 10K seeds → `extracted_text/pathway_data.json`

### Final Fight Arena Visualization (`final_fight.html`)

Interactive exploration of the 12 possible arenas for the novel's final fight scene, showing which variable combinations lead to each arena.

**Preprocessing:** `build_final_fight.py` → `extracted_text/final_fight_data.json`

### Word Diff: Animated Word Items

Word items in the Word Diff modal now have two interactive animations:

**Idle float:** Each `.word-item` gently bobs via a `word-float` CSS keyframe animation (3s cycle, 2px vertical). Staggered per-item via `--i` CSS variable set in JS (120ms offset per word), creating a wave ripple across the word cloud.

**Mouse repulsion:** `setupWordRepulsion()` adds a magnetic-repulsion effect — words within 80px of the cursor push away proportionally (max 6px displacement). Uses `requestAnimationFrame`-throttled mousemove on `.word-list` containers. Words get `.repulsed` class (pauses float, enables transform transition). All resets on mouseleave.

**CSS classes:**
- `.word-item` — base style with `animation: word-float`, `--i` variable for stagger
- `.word-item.repulsed` — `animation: none`, JS-controlled transform with 120ms ease-out transition

### Three-Way Track Changes: Merged Inline Diff

Rewrote the three-version Track Changes mode to show fine-grained, word-level diffs merged into single paragraphs, matching the quality of two-version diffs.

**Problem:** When three versions differed (even by a single word), the entire paragraph text for each variant was shown as a separate labeled block (`Seed X: [whole paragraph]`), instead of highlighting individual word changes inline.

**Solution: Position-based merged diff (`renderMergedThreeWayDiff()`)**
1. Runs `Diff.diffWords(A, B)` and `Diff.diffWords(A, C)` independently
2. Maps both diffs to character positions in A's text via `diffToOps()`
3. Builds character-level removal flags (`removedByB[]`, `removedByC[]`)
4. Walks through A once, emitting: B additions (green), C additions (purple), and base text styled by who removed it

**Version-specific colors:**
- `.diff-added-b` / `.diff-removed-b` — green highlights/strikethrough for B's changes
- `.diff-added-c` / `.diff-removed-c` — purple highlights/strikethrough for C's changes
- `.diff-removed` — red strikethrough when both B and C remove the same text

**Cases unified:** `ab-match`, `ac-match`, and `all-different` all go through `renderMergedThreeWayDiff()`. The `bc-match` case (B=C, A differs) uses simple two-way diff.

**Tag stripping:** New `stripHtmlForDiff()` utility strips all formatting tags (`em`, `strong`, `i`, `b`, `span.verse-inline`, `br`) for diff comparison. Replaces 6 separate inline regex patterns.

**Legend:** Updated to show five items — B additions, B removals, C additions, C removals, removed by both — with strikethrough-styled swatches for removal colors.

### Verse/Poetry Formatting (`{verse_inline/...}`)

Quant's `{verse_inline/...}` markup generates `<blockquote>` elements in EPUBs for poetry and verse content. Previously these were extracted as flat paragraphs with no visual distinction.

**Extraction changes (Python `extract_text_all.py`):**
- Added `handle_startendtag()` for self-closing `<br />` tags
- `<br>` tags inside blockquotes preserved as `<br>` in extracted text
- Paragraph text from `<blockquote>` elements wrapped in `<span class="verse-inline">...</span>`
- Cleanup: leading/trailing `<br>` stripped, whitespace around `<br>` collapsed

**Extraction changes (JavaScript `HTMLTextExtractor`):**
- `extractParagraphWithFormatting()` handles `BR` nodes
- Paragraphs with `p.closest('blockquote')` get the `verse-inline` span wrapper

**Render-time fallback (`normalizeVerseParagraphs()`):**
- In `getChapterContent()`, detects paragraphs with `\n` characters (legacy data) and converts to `<span class="verse-inline">line1<br>line2</span>`
- Skips paragraphs already wrapped with `verse-inline`

**CSS (`.verse-inline`):**
- `display: block`, left margin + padding, italic, left-aligned
- No border (removed orange left border to keep verse feeling like part of the narrative)

**Verse examples in the novel:**
- Single-line: `"something"`, `"for making it real"` (Ch 3)
- Multi-line with `<br>`: `"Hey, it's us.<br>Can we have a key?<br>We'd like a way back."` (Ch 5)
- Poetry epigraphs at chapter openings
- `{verse_inline_sc/...}` variant for small-caps verse (uppercase text)

### Control Panel UI Overhaul

Replaced the old View/Analyze panels (which competed for space) with dropdown menus:

**View/Analyze Dropdowns:**
- Click "View" button → dropdown with 5 modes (Unified, Side-by-side, Track Changes, Collation, Gonzo)
- Click "Analyze" button → dropdown with 7 tools (Source Code, Variables, Word Diff, Heatmap, Tapestry, Pathways, Final Fight)
- Dropdowns auto-close after selection (150ms delay)
- Click-outside-to-close behavior
- CSS classes: `.control-dropdown`, `.dropdown-menu`, `.dropdown-item`

**Search Overhaul:**
- Two buttons: "Chapter" (current chapter only, never jumps) and "All" (cross-chapter with F3 navigation)
- Sticky search bar (`position: sticky; top: 50px`) — moved outside `<header>` for proper sticky behavior
- DOM-driven counting — counts actual `.search-highlight` spans, not pre-computed regex matches
- Shows seed info: "in both Seed X and Seed Y" or "in Seed X only"
- No auto-scroll on search; user clicks next arrow to navigate
- State: `searchScope` ('chapter'|'global'), `searchMatchChapters`, `currentHighlightIndex`
- New functions: `findChaptersWithMatches()`, `scrollToCurrentHighlight()`, `getSearchSeedInfo()`, `updateSearchPanelHeight()`
- Removed: `findAllOccurrences()`, `goToOccurrence()`, floating search nav

**Sticky Seed Headers:**
- `.version-panel h2` uses `top: calc(50px + var(--search-panel-height, 0px) + var(--mobile-tabs-height, 0px))`
- JS function `updateSearchPanelHeight()` updates `--search-panel-height` CSS variable when search panel shows/hides
- `--mobile-tabs-height` set by `applyMobileSideBySideTabs()` when mobile version tabs are visible

**Removed:**
- Floating search nav (HTML, CSS, JS) — replaced by sticky search bar
- Feature toast calls from analyze tool handlers (`showFeatureToast()` no longer called)

### Word Diff → Search Integration

Clicking a word in Word Diff results now auto-opens search, runs a global whole-word search in the selected chapter, and scrolls to the first match.

**Implementation: Pending search pattern**
- State variable `pendingWordDiffSearch` set by `jumpToChapterWithWord()` before calling `displayComparison()`
- `displayComparison()` checks and executes the pending search synchronously after DOM render
- Avoids fragile `setTimeout` chains between render and search

**Key fix:** `updateSearchPanelHeight()` was defined inside `initializeControlPanel()` closure, making it inaccessible from global functions. Replaced with inline `document.documentElement.style.setProperty('--search-panel-height', ...)`.

**Word Diff bug fixes:**
- Sort tiebreaker: Added `|| a.localeCompare(b)` for deterministic alphabetical ordering when frequencies are equal
- Frequency display: Always shows count in freq mode (removed `freq > 1` gate)
- Modal z-index: `.modal` bumped to 5100 (above search panel at 4999), `.word-popup` to 5200

### Mobile Responsive Design

**Feature A: Mobile Version Tabs (≤968px side-by-side)**
- Tab bar appears above content in side-by-side mode, letting users switch between Version A/B/C panels
- CSS class `.mobile-hidden` hides non-selected panels; `.mobile-version-tab.active` highlights current tab
- `applyMobileSideBySideTabs()` manages tab state, panel visibility, and `--mobile-tabs-height` CSS variable
- Tab state resets to 'A' on chapter change; search auto-switches tabs when navigating to a match in a hidden panel
- Sticky tab bar uses `top: calc(50px + var(--search-panel-height, 0px))`; sticky h2 headers stack below via `--mobile-tabs-height`

**Feature B: Compact Mobile Toolbar (≤640px)**
- Version selectors side-by-side with labels hidden (CSS-only, no JS changes)
- View/Analyze/Search buttons share one horizontal row via `flex: 1`
- `.essential-controls` uses `flex-direction: row; flex-wrap: wrap` with version selectors and chapter nav forced to `width: 100%`

**Feature C: Tablet Layout (≤968px)**
- Essential controls fit in 2 rows: version selectors + chapter nav on row 1, View/Analyze/Search on row 2
- Version selector labels hidden; `align-items: flex-start` for flush-top alignment
- Header and comparison-display vertical spacing tightened
- Dropdown menus use `left: 0` instead of `right: 0` to prevent off-screen overflow

**Navigation Bar:**
- Hamburger menu now activates at 968px (was 640px) — covers tablet/iPad portrait widths
- Labels hidden at 768px breakpoint removed (hamburger handles it)

**Key CSS variables:**
- `--search-panel-height`: Height of sticky search panel (set by JS)
- `--mobile-tabs-height`: Height of mobile version tab bar (set by `applyMobileSideBySideTabs()`, reset to `0px` when not in side-by-side mode)

**Key JS functions:**
- `applyMobileSideBySideTabs()` — Manages tab active state, panel visibility, and CSS variable
- `jumpToChapterWithWord(chapterId, word)` — Rewritten to use pending search pattern

**Responsive breakpoints:**
| Breakpoint | What changes |
|-----------|-------------|
| ≤968px | Hamburger nav, side-by-side collapses to tabs, 2-row toolbar, dropdown menus left-aligned |
| ≤640px | Tighter spacing, version selectors horizontal with labels hidden, View/Analyze/Search share one row |

## Earlier Changes (January 2026)

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

### Gonzo CAVE (FPS Immersive Reading Room)

A standalone page (`docs/cave.html`) providing an FPS-style immersive reading experience inside a 3D cube, inspired by CAVE (Cave Automatic Virtual Environment) installations.

**Technology: Three.js CSS3DRenderer**
- CSS3DRenderer positions real DOM elements in 3D space — text is always pixel-perfect
- Supports inline HTML (`<em>`, `<span class="verse-inline">`) and CSS styling
- Three.js 0.170.0 via CDN importmap (no build step required)
- All CSS/JS inline in the standalone HTML file

**Room Geometry:**
- Cube half-size: 500 units (each face = 1000×1000px CSS3DObject)
- Camera at center (0, 0, 0), FOV 75
- 6 CSS3DObject faces, visible side facing inward:

| Face | Position | Rotation | Content |
|------|----------|----------|---------|
| Front | (0, 0, -500) | (0, 0, 0) | Seeds 60001-60005 |
| Right | (500, 0, 0) | (0, -π/2, 0) | Seeds 60006-60010 |
| Back | (0, 0, 500) | (0, π, 0) | Seeds 60011-60015 |
| Left | (-500, 0, 0) | (0, π/2, 0) | Seeds 60016-60020 |
| Ceiling | (0, 500, 0) | (π/2, 0, 0) | Seeds 60021-60025 |
| Floor | (0, -500, 0) | (-π/2, 0, 0) | About/Info |

**Wall Layout:**
- Each wall has 5 newspaper-style columns (flexbox), one per seed
- Column header: seed number (orange accent with glow)
- Column body: paragraph text (Georgia serif, 13px, cool white-blue glow in dark mode)
- Chapter heading shown at paragraph index 0 in each column
- `pointer-events: none` on all face elements (interaction via PointerLock only)
- `backface-visibility: hidden` on all faces

**FPS Controls:**
- **Click** → `requestPointerLock()` on `#cave-container`
- **Mouse** → yaw/pitch (no clamp — full 360° in all directions)
- **WASD** → 3D movement following camera quaternion (look up + W = move toward ceiling)
- **Boundary** → camera clamped to ±400 on all axes
- **Scroll wheel** → momentum-based text advancement (see below)
- **Q/E** → previous/next chapter with flash overlay
- **ESC** → release PointerLock

**Scroll Physics (momentum-based):**
- `scrollVelocity` accumulates from wheel events (normalized `deltaY * SCROLL_SENSITIVITY`)
- `scrollAccumulator` integrates velocity each frame; paragraphs advance when accumulator crosses `SCROLL_THRESHOLD` (1.0)
- `scrollVelocity *= SCROLL_FRICTION` (0.88) each frame provides momentum/drift after user stops scrolling
- Near chapter boundaries (`±2 paragraphs`), extra friction applied (`CHAPTER_BOUNDARY_FRICTION = 0.5`)
- At chapter transitions, momentum killed to 30% and `showChapterFlash()` displays chapter name
- Tuning: adjust `SCROLL_SENSITIVITY` (0.15), `SCROLL_FRICTION` (0.88), `CHAPTER_BOUNDARY_FRICTION` (0.5)

**Chapter Transition Flash:**
- `#chapter-flash` div with CSS transition (0.1s fade in, 0.3s fade out)
- Shows chapter name for 1.2s at center of viewport
- Triggered by scroll physics crossing chapter boundary and by Q/E keypress

**HUD Overlay (HTML, above 3D):**
- Crosshair (center, shown when PointerLock active)
- Chapter/paragraph indicator in nav bar breadcrumb: "Variorum / Gonzo CAVE / Chapter 3 — ¶ 15/132"
- Controls hint (bottom center, subtle)
- Click prompt ("Click to enter the CAVE") styled box when not locked

**About Modal:**
- Opened via About button in nav bar
- Contains CAVE history, room layout with seed assignments, control reference, *Subcutanean* context
- Click-outside-to-close, × button

**Visual Style:**
- Dark mode (default): Wall bg `#08080f`, text `#c8dce8` with `text-shadow` glow, headers orange `#ff8800` with glow
- Light mode: Wall bg `#f0ece8`, text `#2c2c2c` with no shadow, headers `#d96800`
- Nav bar stays dark in both modes (matches main app)
- Theme state via `data-theme` attribute on `<html>` element
- Icons: inline SVGs for info (About) and sun/moon (theme toggle)

**Integration (compare.js):**
- `setupViewModeButtons()` handles `gonzo-cave` mode: calls `saveViewState()` then navigates to `cave.html`
- View dropdown button in `index.html` with `data-mode="gonzo-cave"`, Lucide `box` icon

**Key Constants:**
- `HALF = 500` — cube half-size
- `BOUNDARY = 400` — movement boundary
- `MOVE_SPEED = 3` — movement speed per frame
- `PARAGRAPHS_PER_COLUMN = 8` — paragraphs shown per column
- `SEED_IDS` — array of 25 seed IDs (60001-60025)
- `CHAPTERS` — ordered array of chapter IDs for navigation
- `CHAPTER_NAMES` — display names for each chapter
- `FACE_SEEDS` — 5 arrays mapping seeds to each wall face

**Data Loading:**
- Fetches `extracted_text/all_versions.json` on init
- Versions keyed by seed ID directly (e.g., `allVersions['60001']`), NOT `version_60001`
- Replicates `normalizeVerseParagraphs()` inline for verse formatting

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

### Annotation Enhancements: Leader Lines, Floating Panels, Scroll Behavior

**Leader Lines (connector lines):**
- Uses `leader-line-new@1.1.9` CDN library to draw SVG connector lines between note panels and annotated paragraphs
- Lines are semi-transparent orange, fluid path, small disc plugs, theme-aware colors
- Toggle button in Notes dropdown header (icon-only, Lucide `link` icon)
- Lines update position on scroll (rAF-throttled) and during panel drag
- Lines recreated on theme change and chapter re-render (`setTimeout` 50ms for DOM settling)
- Global state: `noteLines` (map of panelId → LeaderLine), `noteLinesVisible` (toggle)

**Floating Note Panels:**
- `position: absolute` — panels scroll with page alongside their paragraphs
- Drag handler accounts for scroll offset (`window.scrollX`/`scrollY` added to `clientX`/`clientY`)
- Positioned to avoid obscuring the annotated paragraph: right side first, left side fallback, above/below for full-width views (Track Changes, Unified)
- Auto-close on first save (400ms delay with "Saved!" feedback); existing notes show read-only mode
- Panels close on chapter change (`closeAllNotePanels()` in `displayComparison()`)
- Clicking a note in the Notes pane: closes existing panel, scrolls to paragraph, reopens panel beside it using synthetic event for positioning
- Styled with warm background (`#1c1f2e`), orange glow box-shadow, distinct from cold blue version panels

**Scroll-Aware Hiding:**
- `updateNotePanelVisibility()` checks if note panels have scrolled behind sticky seed headers
- Adds `.behind-header` CSS class (opacity: 0, pointer-events: none, 0.2s transition)
- Leader lines hidden/shown via `line.hide('none')` / `line.show('none')` (instant, no animation)

**Bookmark Save Modal:**
- Replaced `prompt()` with styled `#bookmark-name-modal` matching other modals
- Text input pre-filled with default name, auto-selected on open
- Enter to save, Escape to cancel, click-outside-to-close
- `saveCurrentBookmark()` opens modal; `confirmBookmarkSave()` creates the bookmark

## Development Notes

### App Version (Semantic Versioning)

The single source of truth is the pair of constants at the top of compare.js:

```javascript
const APP_VERSION = '0.9.1';
const APP_UPDATED = 'April 28, 2026';
```

`renderAppVersion()` writes them into `#app-version-line` in the About modal on load. The hardcoded fallback text in index.html should be kept in sync when bumping (it shows briefly before JS runs).

### Script Loading (index.html)

All CDN scripts and compare.js use `defer` (execution order = document order, so compare.js always runs after its libraries). CDN versions are pinned — never use `@latest` (an upstream breaking change would break the live site). Current pins: lucide@1.23.0, leader-line-new@1.1.9, d3@7, diff@5.1.0, jszip 3.10.1.

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
- `link` - Leader lines toggle (Notes dropdown header)
- `share-2` - Copy shareable note link (note panel actions)
- `pencil` / `trash-2` / `save` - Annotation panel actions

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
| Sticky search panel | 4980 | Above page content, below View/Analyze menus |
| View/Analyze dropdown menus | 4990 | Above search panel, below nav bar (scroll behind it) |
| Main nav bar | 5000 | Fixed top position |
| Nav dropdowns (Bookmarks/Notes/Files) | 5001 | Above nav bar; position: fixed, never scroll |
| Modals (.modal) | 5100 | Above nav bar and search panel |
| Word popup | 5200 | Above Word Diff modal |
| Leader lines (SVG) | 5999 | Annotation connectors, below note panels |
| Note panels | 6001+ | Floating, incrementing z-index per panel |
| Gonzo Mode fullscreen | 6000 | Covers entire page including nav |
| Gonzo About modal | 7000 | Above Gonzo mode |

Key ordering constraints: the View/Analyze menus must stay BELOW the nav bar (so they slide behind it on scroll) but ABOVE the search panel (so an open menu isn't clipped). The Bookmarks/Notes/Files dropdowns are `position: fixed` pinned under the nav, so they sit above it without conflict.

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

### Annotation & Scholarly Notes Feature (Mostly Implemented)

A research layer for the browser enabling:
1. **Enhanced Bookmarks** - Add notes/commentary field to saved bookmarks (implemented — notes textarea in Bookmarks dropdown, styled save modal)
2. **Passage-level Annotations** - Double-click paragraphs to add notes tied to specific text (implemented — floating panels, leader lines, scroll behavior)
3. **Export/Import** - Export annotations in JSON and Markdown (`exportToMarkdown()`), import from JSON (`importAnnotationsFromFile()`) — implemented. Bookmarks have no import/export yet.

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

## Experimental Branch: `experimental-visualization`

The `experimental-visualization` branch contains in-progress visualization work not yet merged to master:

### Textual Hyperspace (`hyperspace.html`)

A Three.js first-person fly-through of the novel's textual variation space. You ride one seed's version forward through the narrative while unchosen alternatives float around you as readable text fragments.

**Architecture:**
- `build_hyperspace.py` — Python preprocessing: stratified sampling of 1000 seeds from 10K, paragraph alignment via `difflib.SequenceMatcher`, variant extraction (max 10 per variation point), significance scoring
- `hyperspace_data.json` — Generated data (~420KB, 212 variation points, 1000 seeds)
- `hyperspace.html` — Three.js 0.170.0 visualization with CSS2DRenderer for floating text

**Key features:**
- **FPS controls**: Pointer lock mouse look (click to engage, ESC to release), WASD movement, right-click drag fallback
- **360° spherical layout**: Variants distributed on spheres around each variation point using `acos(1-2*seed)` for uniform coverage; proximity-based radius (similar seeds closer, divergent seeds farther)
- **CSS2D label pool**: 250 pre-created DOM elements recycled each frame, with distance-based font size (14px–7px), opacity (1.0–0.2), truncation, and 2-line wrapping (`-webkit-line-clamp: 2`)
- **Center text box**: Current seed's text shown in a styled box at screen center with collision detection (`enforceExclusion()` runs per-frame, hides labels overlapping the box via `visibility: hidden`)
- **Per-label rotation**: Deterministic `rotate()` transforms (-5° to +5°) for visual variety
- **InstancedMesh dots**: Tiny ambient sparkle behind each text label
- **Transport controls**: Play/pause auto-fly, scrub bar, speed cycle, prev/next variation point jump
- **Seed picker**: Dropdown grouped by built-in seeds and sampled variants; changing seed recalculates all positions

**Preprocessing utilities** imported from `build_rarity_scores.py`: `VARIANTS_DIR`, `parse_txt_file`, `normalize_paragraph`, `hash_paragraph`

### Constellation Map (`constellation.html`)

3D point cloud of 10K variants positioned by variable similarity. Built with Three.js + OrbitControls. Aesthetically interesting but not analytically revealing — led to the Hyperspace concept.

## Credits

- **Novel**: *Subcutanean* by Aaron Reed (CC-BY 4.0 as of 2025)
- **Quant Language**: Aaron Reed
- **Variorum Browser**: Mark Sample, developed with Claude Code
- **Book History Practices**: Following TEI/scholarly variorum standards

## License

*Subcutanean* source and text released under CC-BY 4.0 by Aaron Reed in 2025.
