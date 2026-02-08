#!/usr/bin/env python3
"""
Build rarity scores from 10,000 Subcutanean text variants.

Parses each txt file into chapters/paragraphs, normalizes text, hashes it,
and counts how many of the 10K variants contain each unique paragraph.
Outputs a JSON file for the browser to annotate paragraphs with rarity info.

Usage:
    python build_rarity_scores.py
"""

import hashlib
import json
import os
import re
import sys
from collections import defaultdict
from datetime import datetime


# Path to the 10K variant text files
VARIANTS_DIR = os.path.join(os.path.dirname(__file__), '..', 'sources', '10k_subcutaneans')

# Output path
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), 'extracted_text', 'rarity_scores.json')

# Chapter markers and their IDs (must match browser chapter IDs)
# Sections in each txt file, in order:
#   Header (skip) → PART ONE / DOWNSTAIRS / epigraph+prologue →
#   Chapter 1-9 → PART TWO / MULTIPLICIOUS / epigraph →
#   Chapter 10-15 → PART THREE / MANIFOLDWISE / epigraph →
#   Chapter 16-17 → EPILOGUE → ALTERNATE SCENE (skip) → ABOUT THIS COPY
SECTION_MARKERS = re.compile(
    r'^(PART ONE|PART TWO|PART THREE|Chapter (\d+)|EPILOGUE|ALTERNATE SCENE|ABOUT THIS COPY)$'
)


def normalize_paragraph(text):
    """Normalize paragraph text for consistent hashing.

    IMPORTANT: This normalization must be replicated exactly in JavaScript
    (normalizeForRarity function in compare.js).
    """
    # Strip italic markers: _text_ → text
    text = re.sub(r'_([^_]+)_', r'\1', text)
    # Strip any HTML tags (shouldn't appear in txt, but just in case)
    text = re.sub(r'<[^>]+>', '', text)
    # Lowercase
    text = text.lower()
    # Collapse all whitespace to single spaces
    text = re.sub(r'\s+', ' ', text)
    # Trim
    text = text.strip()
    return text


def hash_paragraph(normalized_text):
    """Hash normalized text using MD5 (first 12 hex chars).

    IMPORTANT: JavaScript side must produce identical hashes.
    """
    return hashlib.md5(normalized_text.encode('utf-8')).hexdigest()[:12]


def parse_txt_file(filepath):
    """Parse a Subcutanean txt file into chapters with paragraph lists.

    Returns dict of chapter_id → list of raw paragraph strings.
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    chapters = {}
    current_chapter = None
    current_lines = []
    skip_section = False

    # Find where content starts (after the header separator lines)
    content_start = 0
    separator_count = 0
    for i, line in enumerate(lines):
        if line.strip().startswith('=' * 10):
            separator_count += 1
            if separator_count >= 2:
                content_start = i + 1
                break

    for i in range(content_start, len(lines)):
        line = lines[i]
        stripped = line.strip()

        match = SECTION_MARKERS.match(stripped)
        if match:
            # Save current chapter before switching
            if current_chapter and not skip_section:
                paragraphs = split_into_paragraphs(current_lines)
                if paragraphs:
                    chapters[current_chapter] = paragraphs

            marker = match.group(1)
            chapter_num = match.group(2)

            if marker == 'PART ONE':
                current_chapter = 'prologue'
                current_lines = []
                skip_section = False
            elif marker == 'PART TWO':
                current_chapter = 'part2'
                current_lines = []
                skip_section = False
            elif marker == 'PART THREE':
                current_chapter = 'part3'
                current_lines = []
                skip_section = False
            elif chapter_num:
                n = int(chapter_num)
                current_chapter = f'chapter{n}'
                current_lines = []
                skip_section = False
            elif marker == 'EPILOGUE':
                current_chapter = 'chapter18'
                current_lines = []
                skip_section = False
            elif marker == 'ALTERNATE SCENE':
                # Save current before skipping
                if current_chapter and not skip_section:
                    paragraphs = split_into_paragraphs(current_lines)
                    if paragraphs:
                        chapters[current_chapter] = paragraphs
                current_chapter = None
                current_lines = []
                skip_section = True
            elif marker == 'ABOUT THIS COPY':
                current_chapter = 'notes'
                current_lines = []
                skip_section = False
            continue

        # Skip part subtitles (DOWNSTAIRS, MULTIPLICIOUS, MANIFOLDWISE)
        if stripped in ('DOWNSTAIRS', 'MULTIPLICIOUS', 'MANIFOLDWISE', 'UPSTAIRS'):
            continue

        if current_chapter and not skip_section:
            current_lines.append(line)

    # Save final chapter
    if current_chapter and not skip_section:
        paragraphs = split_into_paragraphs(current_lines)
        if paragraphs:
            chapters[current_chapter] = paragraphs

    return chapters


def split_into_paragraphs(lines):
    """Split lines into paragraphs (separated by blank lines).

    Returns list of paragraph strings (non-empty only).
    """
    paragraphs = []
    current_para = []

    for line in lines:
        stripped = line.strip()
        if stripped == '':
            if current_para:
                para_text = ' '.join(current_para)
                paragraphs.append(para_text)
                current_para = []
        else:
            current_para.append(stripped)

    # Don't forget last paragraph
    if current_para:
        para_text = ' '.join(current_para)
        paragraphs.append(para_text)

    return paragraphs


def main():
    # Find all txt files
    if not os.path.isdir(VARIANTS_DIR):
        print(f"Error: Directory not found: {VARIANTS_DIR}")
        print("Expected 10K variant files in sources/10k_subcutaneans/")
        sys.exit(1)

    txt_files = sorted([
        f for f in os.listdir(VARIANTS_DIR)
        if f.endswith('.txt') and f[:-4].isdigit()
    ])

    if not txt_files:
        print(f"Error: No txt files found in {VARIANTS_DIR}")
        sys.exit(1)

    total_files = len(txt_files)
    print(f"Found {total_files} variant files to process")

    # Count paragraph frequency per chapter
    # Structure: chapter_id → hash → { "count": int, "preview": str }
    rarity_data = defaultdict(lambda: defaultdict(lambda: {"count": 0, "preview": ""}))
    total_paragraphs = 0
    errors = 0

    for idx, filename in enumerate(txt_files):
        if (idx + 1) % 500 == 0 or idx == 0:
            print(f"  Processing {idx + 1}/{total_files}: {filename}")

        filepath = os.path.join(VARIANTS_DIR, filename)
        try:
            chapters = parse_txt_file(filepath)

            for chapter_id, paragraphs in chapters.items():
                for para in paragraphs:
                    normalized = normalize_paragraph(para)
                    if len(normalized) < 10:
                        continue

                    h = hash_paragraph(normalized)
                    entry = rarity_data[chapter_id][h]
                    entry["count"] += 1
                    if not entry["preview"]:
                        entry["preview"] = normalized[:80]
                    total_paragraphs += 1

        except Exception as e:
            errors += 1
            if errors <= 10:
                print(f"  Warning: Error processing {filename}: {e}")
            elif errors == 11:
                print("  (suppressing further error messages)")

    # Build output
    output = {
        "meta": {
            "total_variants": total_files,
            "variant_range": f"{txt_files[0][:-4]}-{txt_files[-1][:-4]}",
            "generated": datetime.now().isoformat()
        },
        "chapters": {}
    }

    for chapter_id in sorted(rarity_data.keys()):
        output["chapters"][chapter_id] = dict(rarity_data[chapter_id])

    # Write output
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    # Summary stats
    print(f"\nDone! Processed {total_files} files ({errors} errors)")
    print(f"Total paragraph occurrences: {total_paragraphs:,}")
    print(f"Output: {OUTPUT_FILE}")
    print(f"\nPer-chapter stats:")

    for chapter_id in sorted(output["chapters"].keys()):
        entries = output["chapters"][chapter_id]
        unique_count = len(entries)
        counts = [e["count"] for e in entries.values()]
        rare_count = sum(1 for c in counts if c < total_files * 0.01)
        common_count = sum(1 for c in counts if c >= total_files * 0.5)
        print(f"  {chapter_id:12s}: {unique_count:4d} unique paragraphs "
              f"({rare_count} rare <1%, {common_count} common >50%)")

    # Show some of the rarest passages
    print(f"\nRarest passages (appearing in fewest variants):")
    all_entries = []
    for chapter_id, entries in output["chapters"].items():
        for h, entry in entries.items():
            all_entries.append((entry["count"], chapter_id, entry["preview"]))
    all_entries.sort()
    for count, chapter, preview in all_entries[:10]:
        print(f"  {count:5d}/{total_files} ({count/total_files*100:.1f}%) "
              f"[{chapter}] {preview[:60]}...")


if __name__ == '__main__':
    main()
