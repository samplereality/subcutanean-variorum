# Subcutanean Variorum Browser

A web-based comparison tool for exploring textual variations across 25 unique editions of Aaron Reed's novel *Subcutanean*.

## About the Project

*Subcutanean* is a novel where every copy is different. Using a combinatorial narrative system, Reed generated thousands of unique versions by varying word choices, sentence structures, and entire passages throughout the text. This browser allows readers to compare any two editions side-by-side to discover how the story shifts between versions.

## Features

- **Three View Modes:**
  - **Unified**: Read a single version as clean, uninterrupted text
  - **Side-by-side**: Compare two versions in parallel columns
  - **Diff**: Inline highlighting shows exact additions (green) and deletions (red/strikethrough) between versions

- **Complete Coverage**: Browse all 23 sections including:
  - Introduction and Prologue
  - Chapters 1-18
  - Part II and Part III dividers
  - Notes

- **25 Unique Editions**: Each "seed" represents a distinct version of the complete novel, numbered 45443-45467

- **Mobile-Friendly**: Fully responsive design optimized for phones, tablets, and desktop browsers

## How to Use

1. **Select two versions** using the dropdown menus (labeled "Compare" and "With")
2. **Choose a view mode**: Unified, Side-by-side, or Diff
3. **Navigate chapters** using the horizontal scrolling chapter menu
4. **Switch between versions** at any time to explore different comparisons

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
