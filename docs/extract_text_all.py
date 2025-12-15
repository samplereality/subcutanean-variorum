#!/usr/bin/env python3
"""
Extract all chapters from all Subcutanean EPUB files.
Maps EPUB files to logical chapters:
  ch002 = prologue
  ch003-ch026 = chapters 1-24
"""

import zipfile
import json
from pathlib import Path
from html.parser import HTMLParser

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

    def handle_starttag(self, tag, attrs):
        if tag == 'p':
            self.in_paragraph = True
            self.current_paragraph = []
        elif tag == 'em':
            self.in_em = True
        elif tag == 'blockquote':
            self.in_blockquote = True

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

    def handle_data(self, data):
        if self.in_paragraph:
            if self.in_em:
                self.current_paragraph.append(f'<em>{data}</em>')
            else:
                self.current_paragraph.append(data)

    def get_paragraphs(self):
        return self.text_parts


def extract_chapter_from_epub(epub_path, chapter_file):
    """Extract text from a specific chapter file within an EPUB."""
    try:
        with zipfile.ZipFile(epub_path, 'r') as zip_ref:
            chapter_path = f'EPUB/text/{chapter_file}'
            with zip_ref.open(chapter_path) as f:
                html_content = f.read().decode('utf-8')
                parser = TextExtractor()
                parser.feed(html_content)
                return parser.get_paragraphs()
    except Exception as e:
        print(f"Error extracting {chapter_file} from {epub_path}: {e}")
        return None


def extract_all_versions():
    """Extract all chapters from all 25 EPUB versions."""

    base_dir = Path(__file__).parent.parent / 'sources' / 'subcutaneans'
    output_dir = Path(__file__).parent / 'extracted_text'
    output_dir.mkdir(exist_ok=True)

    # Find all EPUB folders
    epub_folders = sorted([d for d in base_dir.iterdir()
                          if d.is_dir() and d.name.startswith('subcutanean-')])

    print(f"Found {len(epub_folders)} EPUB folders")

    # Chapter mapping: ch002=prologue, ch003-ch026=chapters 1-24
    chapter_mapping = {
        'ch002.xhtml': 'prologue'
    }
    for i in range(1, 25):  # Chapters 1-24
        chapter_mapping[f'ch{i+2:03d}.xhtml'] = f'chapter{i}'

    all_versions = {}

    for folder in epub_folders:
        epub_files = list(folder.glob('*.epub'))
        if not epub_files:
            print(f"No EPUB found in {folder.name}")
            continue

        epub_path = epub_files[0]
        version_id = folder.name.split('-')[1]

        print(f"Processing version {version_id}...")

        version_data = {}

        # Extract all chapters
        for epub_file, chapter_id in chapter_mapping.items():
            paragraphs = extract_chapter_from_epub(epub_path, epub_file)
            if paragraphs:
                version_data[chapter_id] = paragraphs

        all_versions[version_id] = version_data

        # Save individual version
        version_file = output_dir / f'version_{version_id}.json'
        with open(version_file, 'w', encoding='utf-8') as f:
            json.dump({
                'version_id': version_id,
                **version_data
            }, f, indent=2, ensure_ascii=False)

    # Save combined data
    combined_file = output_dir / 'all_versions.json'
    with open(combined_file, 'w', encoding='utf-8') as f:
        json.dump(all_versions, f, indent=2, ensure_ascii=False)

    print(f"\nExtracted {len(all_versions)} versions")
    print(f"Extracted {len(chapter_mapping)} chapters per version")
    print(f"Output saved to {output_dir}")

    return all_versions


if __name__ == '__main__':
    extract_all_versions()
