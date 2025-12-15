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
    """Extract text content from HTML, preserving paragraph structure."""

    def __init__(self):
        super().__init__()
        self.reset()
        self.text_parts = []
        self.current_paragraph = []
        self.in_paragraph = False
        self.in_em = False
        self.in_blockquote = False
        self.in_h1 = False
        self.title = None

    def handle_starttag(self, tag, attrs):
        if tag == 'p':
            self.in_paragraph = True
            self.current_paragraph = []
        elif tag == 'em':
            self.in_em = True
        elif tag == 'blockquote':
            self.in_blockquote = True
        elif tag == 'h1':
            self.in_h1 = True
            self.current_paragraph = []

    def handle_endtag(self, tag):
        if tag == 'p':
            if self.current_paragraph:
                para_text = ''.join(self.current_paragraph).strip()
                if para_text:
                    self.text_parts.append(para_text)
            self.in_paragraph = False
            self.current_paragraph = []
        elif tag == 'em':
            self.in_em = False
        elif tag == 'blockquote':
            self.in_blockquote = False
        elif tag == 'h1':
            if self.current_paragraph:
                self.title = ''.join(self.current_paragraph).strip()
            self.in_h1 = False
            self.current_paragraph = []

    def handle_data(self, data):
        if self.in_paragraph or self.in_h1:
            # Preserve formatting markers for italics
            if self.in_em:
                self.current_paragraph.append(f'<em>{data}</em>')
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


def extract_all_versions():
    """Extract all sections from all 25 EPUB versions."""

    base_dir = Path(__file__).parent.parent / 'sources' / 'subcutaneans'
    output_dir = Path(__file__).parent / 'extracted_text'
    output_dir.mkdir(exist_ok=True)

    # Find all EPUB folders
    epub_folders = sorted([d for d in base_dir.iterdir() if d.is_dir() and d.name.startswith('subcutanean-')])

    print(f"Found {len(epub_folders)} EPUB folders")

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
        'ch023.xhtml': 'chapter19',
        'ch024.xhtml': 'chapter20',
        'ch025.xhtml': 'chapter21',
        'ch026.xhtml': 'chapter22',
    }

    all_versions = {}

    for folder in epub_folders:
        epub_files = list(folder.glob('*.epub'))
        if not epub_files:
            print(f"No EPUB found in {folder.name}")
            continue

        epub_path = epub_files[0]
        version_id = folder.name.split('-')[1]

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

    print(f"\nExtracted {len(all_versions)} versions")
    print(f"Each version has {len(chapter_mapping)} sections")
    print(f"Output saved to {output_dir}")

    return all_versions


if __name__ == '__main__':
    extract_all_versions()
