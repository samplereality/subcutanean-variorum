# Subcutanean Variorum

A web-based comparison tool for exploring textual variations across unique editions of Aaron Reed's novel *Subcutanean*.

## About the Project

*Subcutanean* (2020) is a novel where every copy is different. Using a combinatorial narrative system, Reed generated thousands of unique versions by varying word choices, sentence structures, and entire passages throughout the text. This browser allows readers to compare any two editions side-by-side to discover how the story shifts between versions.

In 2025 Reed released the “source code, source text and all prior, current, and future renderings of *Subcutanean*” under a Creative Commons CC-BY-4.0 license, meaning anyone is free to share, archive, copy, distribute *Subcutanean*, as long as credit is given to Aaron Reed.

## Features

**Multiple View Modes:**
- **Unified**: Read a single version as clean, uninterrupted text
- **Side-by-side**: Compare two or three versions in parallel columns
- **Track Changes**: Inline highlighting shows exact additions and deletions between two or three selected versions
- **Collation**: View textual variations across multiple witnesses in a variorum-style format
- **Source Code**: View the original source code alongside a variant
- **Gonzo Mode**: View 25 variants at once in parallel

**Search Functionality**: Find any word or phrase across all chapters
- Searches all chapters in the selected version(s)
- Navigate forward and backward through all occurrences
- Current result highlighted in orange, other matches in yellow
- Automatically switches chapters when navigating to matches in other sections
- Keyboard shortcuts: F3 (next), Shift+F3 (previous), Escape (clear search)

**Word Differential Analysis**: Compare the unique vocabulary between any two seeds
- Shows words that appear in one version but not the other
- Sort options: alphabetical or by frequency
- Frequency view displays word counts in parentheses (only shown when count > 1)
- Click any word to see which chapters it appears in
- Click a chapter name to jump directly to that chapter with the word highlighted

**Chapter Heatmap**: A heatmap of chapter variations between the selected seeds
- Chapters with the most variation between seeds show up as intense orange
- Tooltip also shows paragraph count variation
- Click any chapter to view the selected chapter in side-by-side mode with two or three variants

**25 Unique Editions**: This variorum includes 25 variations of *Subcutanean*, generated from unique seeds, numbered 60001-60025. 

**Generate New Variants**: Request a never-before-seen variant of the novel and receive it in PDF and epub formats in a matter of minutes.

**Upload Custom Versions**: Upload additional EPUB or TXT versions of *Subcutanean* to compare with built-in versions or other uploaded versions. The uploads are stored in your browser's localStorage (rather than the cloud). View all uploaded versions and delete them from localStorage with the Files button. If you've uploaded a plain text version, you can convert it to an EPUB format for e-readers using the Manage Uploads option under Files.

**Mobile-Friendly**: Fully responsive design optimized for phones, tablets, and desktop browsers

## How to Use

1. **Select two versions** using the dropdown menus (labeled "Compare" and "With")
2. **Choose a view mode**: Unified, Side-by-side, Track Changes, or Collation
3. **Navigate chapters** using the horizontal scrolling chapter menu
4. **Search for text**: Enter a word or phrase and click "Find" to highlight all matches (click "Clear" to remove highlights)
5. **Analyze word differences**: Click "Word Differential" to see which words are unique to each selected version
6. **Upload custom versions**: Click "Upload EPUB/TXT" to add your own version of the novel for comparison (supports both EPUB and plain text formats)
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