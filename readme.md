# Subcutanean Variorum

A web-based comparison tool for exploring textual variations across unique editions of Aaron Reed's novel *Subcutanean*.

## About the Project

*Subcutanean* (2020) is a novel where every copy is different. Using a combinatorial narrative system, Reed generated thousands of unique versions by varying word choices, sentence structures, and entire passages throughout the text. This browser allows readers to compare any two editions side-by-side to discover how the story shifts between versions.

In 2025 Reed released the “source code, source text and all prior, current, and future renderings of *Subcutanean*” under a Creative Commons CC-BY-4.0 license, meaning anyone is free to share, archive, copy, distribute *Subcutanean*, as long as credit is given to Aaron Reed.

## Features

**Four View Modes:**
- **Unified**: Read a single version as clean, uninterrupted text
- **Side-by-side**: Compare two versions in parallel columns
- **Track Changes**: Inline highlighting shows exact additions (green) and deletions (red/strikethrough) between two selected versions
- **Collation**: View textual variations across multiple witnesses in a variorum-style format

**Search Functionality**: Find any word or phrase across all chapters
- Searches all chapters in the selected version(s)
- Navigate forward and backward through all occurrences
- Current result highlighted in orange, other matches in yellow
- Shows total count and current position (e.g., "3 of 15")
- Automatically switches chapters when navigating to matches in other sections
- Keyboard shortcuts: F3 (next), Shift+F3 (previous), Escape (clear search)
- Floating navigation buttons stay visible while scrolling for easy access

**Word Differential Analysis**: Compare the unique vocabulary between any two seeds
- Shows words that appear in one version but not the other
- Excludes the Notes chapter for focused textual analysis
- Sort options: alphabetical or by frequency
- Frequency view displays word counts in parentheses (only shown when count > 1)
- Click any word to see which chapters it appears in
- Click a chapter name to jump directly to that chapter with the word highlighted

**Jaccard Distance Analysis**: Measure textual similarity between the 25 built-in versions
- Shows most similar and most different version pairs
- Interactive distance matrix showing all pairwise comparisons
- Pre-calculated distances for instant display
- Click any matrix cell or "Load These Versions" button to immediately compare those versions
- Note: Only available for the 25 built-in versions (seeds 45443-45467), not uploaded files

**Complete Coverage**: Browse the entire text of *Subcutanean*, including:
- Introduction and Prologue
- Chapters 1-18
- Part II and Part III dividers
- Notes

**25 Unique Editions**: This variorum includes 25 variations of *Subcutanean*, generated from unique seeds, numbered 45443-45467. Why these 25 variations? Because these are 25 copies I purchased for a course I taught at Davidson College called [Transmedia and Vast Narrative](https://docs.google.com/document/d/1SAFwyC6OS1WtbQcql81rMdjFS3JAiHwBSFU2gRd4YlY/edit?usp=sharing). Now that the novel and its source code have been released into the Creative Commons, these versions made a good starting point for the variorum.

**Upload Custom Versions**: Upload additional EPUB or TXT versions of *Subcutanean* to compare with built-in versions or other uploaded versions
- Drag and drop or click to select EPUB or TXT files
- Automatically extracts and parses text from all sections
- EPUB files: Extracts all 23 sections with full HTML formatting
- TXT files: Parses chapters using "Chapter X" markers and PART dividers, with smart punctuation normalization
- Stored in browser's localStorage for persistence
- Custom versions appear in dropdowns with a 📎 icon and seed number
- Supports both standard naming (subcutanean-XXXXX.epub, 50000.txt) and custom filenames
- Manage Uploads: View all uploaded versions and delete them from localStorage

**Download as EPUB**: Convert uploaded text files to properly formatted EPUB files
- Generate EPUB files from any uploaded TXT version
- Includes cover image, table of contents, and proper metadata
- Works on modern Kindles (August 2022 and later), Apple Books, Google Play Books, and most e-readers
- For older Kindles: Use free [Calibre](https://calibre-ebook.com/) software to convert EPUB to MOBI format
- Each EPUB follows the same structure as the original *Subcutanean* editions

**Mobile-Friendly**: Fully responsive design optimized for phones, tablets, and desktop browsers

## How to Use

1. **Select two versions** using the dropdown menus (labeled "Compare" and "With")
2. **Choose a view mode**: Unified, Side-by-side, Track Changes, or Collation
3. **Navigate chapters** using the horizontal scrolling chapter menu
4. **Search for text**: Enter a word or phrase and click "Find" to highlight all matches (click "Clear" to remove highlights)
5. **Analyze word differences**: Click "Word Differential" to see which words are unique to each selected version
6. **Compare textual similarity**: Click "Jaccard Distance" to see how similar or different the 25 built-in versions are
7. **Upload custom versions**: Click "Upload EPUB/TXT" to add your own version of the novel for comparison (supports both EPUB and plain text formats)
8. **Manage uploaded versions**: Click "Manage Uploads" to view all uploaded versions and delete any you no longer need
9. **Switch between versions** at any time to explore different comparisons

## Technical Details

### Data Format

All text is extracted from EPUB files and stored in JSON format:
- `extracted_text/all_versions.json` - Complete dataset (23 sections × 25 versions)
- Each version preserves `<em>` tags for italicized text

### File Structure

```
docs/
├── index.html              # Main comparison interface
├── compare.js              # Comparison logic and diff rendering
├── compare.css             # Comparison-specific styles
├── styles.css              # Base styles and responsive design
├── extracted_text/
│   ├── all_versions.json   # Complete dataset (23 sections × 25 versions)
│   └── version_*.json      # Individual version files
└── extract_text_all.py     # Script to regenerate data from EPUBs
```

### Technologies Used

- **Vanilla JavaScript** - No frameworks, just clean ES6+
- **diff.js** - Word-level difference algorithm (via CDN)
- **JSZip** - Client-side EPUB parsing (via CDN)
- **localStorage API** - Browser-based persistence for uploaded versions
- **DOMParser API** - HTML parsing for text extraction
- **CSS Grid & Flexbox** - Responsive layouts
- **GitHub Pages** - Free hosting for static site


## Regenerating Data

If you have access to the original EPUB files, you can regenerate the data:

```bash
cd docs
python3 extract_text_all.py
```

Place all 25 EPUB files in `sources/subcutaneans/subcutanean-XXXXX/` folders.

## Credits

- **Novel**: Aaron Reed ([*Subcutanean*](https://aaronareed.net/subcutanean/))
- **Variorum Browser**: Mark Sample
- **Diff Library**: [jsdiff](https://github.com/kpdecker/jsdiff) by Kevin Decker

## License

This browser tool is provided for scholarly and educational purposes. The text of *Subcutanean* is by Aaron Reed, CC-BY-4.0 license.