# Subcutanean Variorum Browser

A web-based comparison tool for exploring textual variations across 25 unique editions of Aaron Reed's novel *Subcutanean*.

## About the Project

*Subcutanean* is a novel where every copy is different. Using a combinatorial narrative system, Reed generated thousands of unique versions by varying word choices, sentence structures, and entire passages throughout the text. This browser allows readers to compare any two editions side-by-side to discover how the story shifts between versions.

## Features

- **Three View Modes:**
  - **Unified**: Read a single version as clean, uninterrupted text
  - **Side-by-side**: Compare two versions in parallel columns
  - **Diff**: Inline highlighting shows exact additions (green) and deletions (red/strikethrough) between versions

- **Search Functionality**: Find any word or phrase across all chapters
  - Searches all chapters in the selected version(s)
  - Navigate forward and backward through all occurrences
  - Current result highlighted in orange, other matches in yellow
  - Shows total count and current position (e.g., "3 of 15")
  - Automatically switches chapters when navigating to matches in other sections
  - Keyboard shortcuts: F3 (next), Shift+F3 (previous), Escape (clear search)
  - Floating navigation buttons stay visible while scrolling for easy access

- **Word Differential Analysis**: Compare the unique vocabulary between any two seeds
  - Shows words that appear in one version but not the other
  - Excludes the Notes chapter for focused textual analysis
  - Sort options: alphabetical or by frequency
  - Frequency view displays word counts in parentheses (only shown when count > 1)
  - Click any word to see which chapters it appears in
  - Click a chapter name to jump directly to that chapter with the word highlighted

- **Complete Coverage**: Browse all 23 sections including:
  - Introduction and Prologue
  - Chapters 1-18
  - Part II and Part III dividers
  - Notes

- **25 Unique Editions**: Each "seed" represents a distinct version of the complete novel, numbered 45443-45467

- **Upload Custom Versions**: Upload additional EPUB files to compare with built-in versions
  - Drag and drop or click to select EPUB files
  - Automatically extracts and parses text from all 23 sections
  - Stored in browser's localStorage for persistence
  - Custom versions appear in dropdowns with a 📎 icon
  - Supports both standard naming (subcutanean-XXXXX.epub) and custom filenames

- **Mobile-Friendly**: Fully responsive design optimized for phones, tablets, and desktop browsers

## How to Use

1. **Select two versions** using the dropdown menus (labeled "Compare" and "With")
2. **Choose a view mode**: Unified, Side-by-side, or Diff
3. **Navigate chapters** using the horizontal scrolling chapter menu
4. **Search for text**: Enter a word or phrase and click "Find" to highlight all matches (click "Clear" to remove highlights)
5. **Analyze word differences**: Click "Word Differential" to see which words are unique to each selected version
6. **Upload custom versions**: Click "Upload EPUB" to add your own version of the novel for comparison
7. **Switch between versions** at any time to explore different comparisons

## Technical Details

### Data Format

All text is extracted from EPUB files and stored in JSON format:
- `extracted_text/all_versions.json` - Complete dataset (23 sections × 25 versions)
- Each version preserves `<em>` tags for italicized text

### File Structure

```
docs/
├── index.html          # Main comparison interface
├── compare.js          # Comparison logic and diff rendering
├── compare.css         # Comparison-specific styles
├── styles.css          # Base styles and responsive design
├── extracted_text/
│   └── all_versions.json
└── extract_text_all.py # Script to regenerate data from EPUBs
```

### Technologies Used

- **Vanilla JavaScript** - No frameworks, just clean ES6+
- **diff.js** - Word-level difference algorithm (via CDN)
- **JSZip** - Client-side EPUB parsing (via CDN)
- **localStorage API** - Browser-based persistence for uploaded versions
- **DOMParser API** - HTML parsing for text extraction
- **CSS Grid & Flexbox** - Responsive layouts
- **GitHub Pages** - Free hosting for static site

### Excluded Content

The following sections are excluded as they don't contain textual variations:
- Chapter 19 (bonus content)
- Chapter 21 (Kickstarter backers list)
- Chapter 22 (about the author)

## Regenerating Data

If you have access to the original EPUB files, you can regenerate the data:

```bash
cd docs
python3 extract_text_all.py
```

Place all 25 EPUB files in `sources/subcutaneans/subcutanean-XXXXX/` folders.

## Credits

- **Novel**: Aaron Reed ([*Subcutanean*](https://aaronareed.net/subcutanean/))
- **Browser**: Mark Sample
- **Diff Library**: [jsdiff](https://github.com/kpdecker/jsdiff) by Kevin Decker

## License

This browser tool is provided for scholarly and educational purposes. The text of *Subcutanean* is © Aaron Reed.
