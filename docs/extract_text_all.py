#!/usr/bin/env python3
"""
Extract all chapters from all Subcutanean EPUB files.
"""

import zipfile
import os
import json
from pathlib import Path
from html.parser import HTMLParser
import re

class TextExtractor(HTMLParser):
    """Extract text content from HTML, preserving paragraph structure and formatting."""

    def __init__(self):
        super().__init__()
        self.reset()
        self.text_parts = []
        self.current_paragraph = []
        self.in_paragraph = False
        self.in_em = False
        self.in_strong = False
        self.in_blockquote = False
        self.in_h1 = False
        self.title = None

    def handle_starttag(self, tag, attrs):
        if tag == 'p':
            self.in_paragraph = True
            self.current_paragraph = []
        elif tag == 'em' or tag == 'i':
            self.in_em = True
        elif tag == 'strong' or tag == 'b':
            self.in_strong = True
        elif tag == 'blockquote':
            self.in_blockquote = True
        elif tag == 'h1':
            self.in_h1 = True
            self.current_paragraph = []
        elif tag == 'br':
            # Preserve line breaks inside blockquotes (verse content)
            if self.in_paragraph and self.in_blockquote:
                self.current_paragraph.append('<br>')

    def handle_startendtag(self, tag, attrs):
        # Handle self-closing tags like <br />
        if tag == 'br':
            if self.in_paragraph and self.in_blockquote:
                self.current_paragraph.append('<br>')

    def handle_endtag(self, tag):
        if tag == 'p':
            if self.current_paragraph:
                para_text = ''.join(self.current_paragraph).strip()
                if para_text:
                    # Wrap blockquote content for verse-style rendering
                    if self.in_blockquote:
                        # Clean up: remove leading/trailing <br> and collapse whitespace around <br>
                        para_text = re.sub(r'\s*<br>\s*', '<br>', para_text)
                        para_text = re.sub(r'^(<br>)+|(<br>)+$', '', para_text)
                        para_text = f'<span class="verse-inline">{para_text}</span>'
                    self.text_parts.append(para_text)
            self.in_paragraph = False
            self.current_paragraph = []
        elif tag == 'em' or tag == 'i':
            self.in_em = False
        elif tag == 'strong' or tag == 'b':
            self.in_strong = False
        elif tag == 'blockquote':
            self.in_blockquote = False
        elif tag == 'h1':
            if self.current_paragraph:
                self.title = ''.join(self.current_paragraph).strip()
                # For PART sections, add the h1 content as the first paragraph
                # This captures the subtitle (e.g., "PART ONE: DOWNSTAIRS")
                if self.title.startswith('PART '):
                    self.text_parts.insert(0, self.title)
            self.in_h1 = False
            self.current_paragraph = []

    def handle_data(self, data):
        if self.in_paragraph or self.in_h1:
            # Preserve formatting markers for italics and bold
            if self.in_em and self.in_strong:
                self.current_paragraph.append(f'<strong><em>{data}</em></strong>')
            elif self.in_em:
                self.current_paragraph.append(f'<em>{data}</em>')
            elif self.in_strong:
                self.current_paragraph.append(f'<strong>{data}</strong>')
            else:
                self.current_paragraph.append(data)

    def get_paragraphs(self):
        return self.text_parts

    def get_title(self):
        return self.title


def extract_chapter_from_epub(epub_path, chapter_file):
    """Extract text from a specific chapter file within an EPUB."""
    try:
        with zipfile.ZipFile(epub_path, 'r') as zip_ref:
            # Read the chapter file
            chapter_path = f'EPUB/text/{chapter_file}'
            with zip_ref.open(chapter_path) as f:
                html_content = f.read().decode('utf-8')

                # Parse HTML and extract text
                parser = TextExtractor()
                parser.feed(html_content)
                return {
                    'paragraphs': parser.get_paragraphs(),
                    'title': parser.get_title()
                }
    except Exception as e:
        print(f"Error extracting {chapter_file} from {epub_path}: {e}")
        return None


def get_version_id_from_name(name):
    """Extract version ID from folder or file name.

    Supports formats:
    - subcutanean-45443
    - 45443
    - Any name containing digits
    """
    # Try subcutanean-XXXXX format
    if name.startswith('subcutanean-'):
        return name.split('-')[1]
    # Try pure numeric format
    if name.isdigit():
        return name
    # Try to extract digits from the name
    match = re.search(r'(\d{4,})', name)
    if match:
        return match.group(1)
    return None


def find_epub_files(base_dir):
    """Find all EPUB files, either directly in base_dir or in subfolders.

    Returns list of tuples: (epub_path, version_id)
    """
    epub_files = []

    # First, check for EPUBs directly in the base directory
    direct_epubs = list(base_dir.glob('*.epub'))
    for epub_path in direct_epubs:
        version_id = get_version_id_from_name(epub_path.stem)
        if version_id:
            epub_files.append((epub_path, version_id))

    # Then check subfolders (for backwards compatibility)
    for folder in base_dir.iterdir():
        if not folder.is_dir():
            continue
        folder_name = folder.name
        # Check if it's a valid version folder
        if not (folder_name.startswith('subcutanean-') or
                folder_name.isdigit() or
                re.search(r'\d{4,}', folder_name)):
            continue

        folder_epubs = list(folder.glob('*.epub'))
        if folder_epubs:
            epub_path = folder_epubs[0]
            version_id = get_version_id_from_name(folder_name)
            if not version_id:
                version_id = get_version_id_from_name(epub_path.stem)
            if version_id:
                epub_files.append((epub_path, version_id))

    return sorted(epub_files, key=lambda x: x[1])


def extract_all_versions():
    """Extract all sections from all EPUB versions."""

    base_dir = Path(__file__).parent.parent / 'sources' / 'subcutaneans'
    output_dir = Path(__file__).parent / 'extracted_text'
    output_dir.mkdir(exist_ok=True)

    # Find all EPUB files (supports direct files or subfolders)
    epub_files = find_epub_files(base_dir)

    print(f"Found {len(epub_files)} EPUB files")

    # Correct chapter mapping based on actual EPUB structure
    chapter_mapping = {
        'ch001.xhtml': 'introduction',
        'ch002.xhtml': 'prologue',
        'ch003.xhtml': 'chapter1',
        'ch004.xhtml': 'chapter2',
        'ch005.xhtml': 'chapter3',
        'ch006.xhtml': 'chapter4',
        'ch007.xhtml': 'chapter5',
        'ch008.xhtml': 'chapter6',
        'ch009.xhtml': 'chapter7',
        'ch010.xhtml': 'chapter8',
        'ch011.xhtml': 'chapter9',
        'ch012.xhtml': 'part2',
        'ch013.xhtml': 'chapter10',
        'ch014.xhtml': 'chapter11',
        'ch015.xhtml': 'chapter12',
        'ch016.xhtml': 'chapter13',
        'ch017.xhtml': 'chapter14',
        'ch018.xhtml': 'chapter15',
        'ch019.xhtml': 'part3',
        'ch020.xhtml': 'chapter16',
        'ch021.xhtml': 'chapter17',
        'ch022.xhtml': 'chapter18',
        # ch023 = Bonus content (excluded - not part of original novel)
        'ch024.xhtml': 'notes',
        # ch025 = Kickstarter backers (excluded - never changes)
        # ch026 = About the author (excluded - never changes)
    }

    all_versions = {}

    for epub_path, version_id in epub_files:
        print(f"Processing version {version_id}...")

        version_data = {'version_id': version_id}

        # Extract all sections
        for epub_file, section_id in chapter_mapping.items():
            result = extract_chapter_from_epub(epub_path, epub_file)
            if result:
                version_data[section_id] = result['paragraphs']

        all_versions[version_id] = version_data

        # Save individual version
        version_file = output_dir / f'version_{version_id}.json'
        with open(version_file, 'w', encoding='utf-8') as f:
            json.dump(version_data, f, indent=2, ensure_ascii=False)

    # Save combined data
    combined_file = output_dir / 'all_versions.json'
    with open(combined_file, 'w', encoding='utf-8') as f:
        json.dump(all_versions, f, indent=2, ensure_ascii=False)

    write_split_files(all_versions, output_dir)

    print(f"\nExtracted {len(all_versions)} versions")
    print(f"Each version has {len(chapter_mapping)} sections")
    print(f"Output saved to {output_dir}")

    return all_versions


def write_split_files(all_versions, output_dir):
    """Write per-chapter files and a versions index for progressive loading.

    The browser fetches versions_index.json plus the initial chapter's file
    at startup (instead of the ~9MB all_versions.json), then loads the
    remaining chapters in the background.

    chapters/<chapterId>.json: { versionId: [paragraphs], ... }
    versions_index.json: { versionId: { version_id, variables, chapters }, ... }

    NOTE: run this AFTER add_variables.py if variables need to be current
    (python extract_text_all.py --split-only re-splits from all_versions.json).
    """
    chapters_dir = output_dir / 'chapters'
    chapters_dir.mkdir(exist_ok=True)

    # Collect every chapter key present in any version (list-valued keys only)
    chapter_ids = []
    for version_data in all_versions.values():
        for key, value in version_data.items():
            if key != 'version_id' and isinstance(value, list) and key != 'variables':
                if key not in chapter_ids:
                    chapter_ids.append(key)

    for chapter_id in chapter_ids:
        chapter_data = {}
        for version_id, version_data in all_versions.items():
            paragraphs = version_data.get(chapter_id)
            if isinstance(paragraphs, list):
                chapter_data[version_id] = paragraphs
        with open(chapters_dir / f'{chapter_id}.json', 'w', encoding='utf-8') as f:
            json.dump(chapter_data, f, separators=(',', ':'), ensure_ascii=False)

    index = {}
    for version_id, version_data in all_versions.items():
        index[version_id] = {
            'version_id': version_data.get('version_id', version_id),
            'variables': version_data.get('variables', []),
            'chapters': [k for k in chapter_ids if isinstance(version_data.get(k), list)],
        }
    with open(output_dir / 'versions_index.json', 'w', encoding='utf-8') as f:
        json.dump(index, f, separators=(',', ':'), ensure_ascii=False)

    print(f"Wrote {len(chapter_ids)} chapter files to {chapters_dir}")
    print(f"Wrote versions_index.json ({len(index)} versions)")


if __name__ == '__main__':
    import sys
    if '--split-only' in sys.argv:
        # Re-split from the existing all_versions.json (e.g. after add_variables.py)
        out = Path(__file__).parent / 'extracted_text'
        with open(out / 'all_versions.json', encoding='utf-8') as f:
            write_split_files(json.load(f), out)
    else:
        extract_all_versions()
