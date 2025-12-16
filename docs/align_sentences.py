#!/usr/bin/env python3
"""
Sentence-level variorum alignment using Spacy.
Proof of concept for prologue and chapter 1.
"""

import json
import re
from pathlib import Path
from collections import defaultdict
import spacy

# Load Spacy model
nlp = spacy.load('en_core_web_sm')


def extract_sentences_from_paragraph(para_html):
    """Extract sentences from a paragraph, preserving <em> tags."""
    # Temporarily replace <em> tags with placeholders
    text = para_html
    em_pattern = re.compile(r'<em>(.*?)</em>')
    em_contents = []

    def replace_em(match):
        em_contents.append(match.group(1))
        return f"__EM{len(em_contents)-1}__"

    text = em_pattern.sub(replace_em, text)

    # Use Spacy to segment sentences
    doc = nlp(text)
    sentences = []

    for sent in doc.sents:
        sent_text = sent.text.strip()
        # Restore <em> tags
        for i, content in enumerate(em_contents):
            sent_text = sent_text.replace(f"__EM{i}__", f"<em>{content}</em>")
        if sent_text:
            sentences.append(sent_text)

    return sentences


def normalize_sentence(text):
    """Normalize a sentence for comparison."""
    # Remove HTML tags for comparison
    text = re.sub(r'</?em>', '', text)
    # Normalize whitespace
    text = ' '.join(text.split())
    return text.strip()


def create_sentence_level_variorum(base_version_id, all_versions_paras, version_ids):
    """Create a sentence-level variorum where base text comes from one witness."""

    print(f"  Extracting sentences for base {base_version_id}...")

    # Extract sentences from all versions
    version_sentences = {}
    for vid in version_ids:
        all_sentences = []
        for para in all_versions_paras[vid]:
            sentences = extract_sentences_from_paragraph(para)
            all_sentences.extend(sentences)
        version_sentences[vid] = all_sentences
        print(f"    Version {vid}: {len(all_sentences)} sentences")

    base_sentences = version_sentences[base_version_id]

    # Pre-compute normalized sentences for faster lookup
    normalized_sentences = {}
    for vid in version_ids:
        normalized_sentences[vid] = [
            (idx, normalize_sentence(sent), sent)
            for idx, sent in enumerate(version_sentences[vid])
        ]

    # Track which sentences from other versions have been matched
    used_sentences = {vid: set() for vid in version_ids if vid != base_version_id}

    result = []

    # Process each sentence in the base version
    for base_idx, base_sent in enumerate(base_sentences):
        base_norm = normalize_sentence(base_sent)

        # Find matches in other versions
        text_groups = defaultdict(list)
        text_groups[base_sent].append(base_version_id)

        for vid in version_ids:
            if vid == base_version_id:
                continue

            # Find exact match using pre-computed normalized sentences
            for idx, norm_sent, orig_sent in normalized_sentences[vid]:
                if idx in used_sentences[vid]:
                    continue

                if base_norm == norm_sent:
                    # Mark this sentence as used
                    used_sentences[vid].add(idx)
                    text_groups[orig_sent].append(vid)
                    break

        # Build variant list
        variants = []
        versions_with_this_sent = set()

        for text, vids in text_groups.items():
            versions_with_this_sent.update(vids)

            if text != base_sent:
                variants.append({
                    'text': text,
                    'versions': sorted(vids),
                    'count': len(vids),
                    'type': 'variant'
                })
            elif len(vids) > 1:
                # Other versions that agree with base
                other_vids = [v for v in vids if v != base_version_id]
                if other_vids:
                    variants.append({
                        'text': text,
                        'versions': sorted(other_vids),
                        'count': len(other_vids),
                        'type': 'agreement',
                        'note': 'Same text as base'
                    })

        # Add omissions (versions that don't have a match for this sentence)
        missing_versions = set(version_ids) - versions_with_this_sent
        if missing_versions:
            variants.append({
                'text': '[Sentence not present in this version]',
                'versions': sorted(list(missing_versions)),
                'count': len(missing_versions),
                'type': 'omission'
            })

        has_variation = len(variants) > 0

        result.append({
            'position': base_idx,
            'base_text': base_sent,
            'base_version': base_version_id,
            'has_variation': has_variation,
            'variants': variants,
            'total_versions_present': len(versions_with_this_sent)
        })

    return result


def process_test_chapters():
    """Process prologue and chapter 1 as proof of concept."""

    extracted_dir = Path(__file__).parent / 'extracted_text'
    output_dir = Path(__file__).parent / 'variorum_data'
    output_dir.mkdir(exist_ok=True)

    # Load all versions
    with open(extracted_dir / 'all_versions.json', 'r', encoding='utf-8') as f:
        all_versions = json.load(f)

    version_ids = sorted(all_versions.keys())
    base_version_options = ['45451', '45452', '45453', '45457', '45462']

    print(f"Creating sentence-level variorums (proof of concept)...")
    print(f"Base versions: {base_version_options}\n")

    # Test with prologue and chapter 1
    for chapter_id in ['prologue', 'chapter1']:
        print(f"=== Processing {chapter_id} ===")

        # Get paragraphs for this chapter from all versions
        chapter_by_version = {}
        for vid in version_ids:
            if chapter_id in all_versions[vid]:
                chapter_by_version[vid] = all_versions[vid][chapter_id]

        # Generate variorums for all base versions
        variorums_by_base = {}
        for base_vid in base_version_options:
            variorum = create_sentence_level_variorum(
                base_vid, chapter_by_version, version_ids
            )
            variorums_by_base[base_vid] = variorum

            # Count variations
            variations = sum(1 for item in variorum if item['has_variation'])
            print(f"  Base {base_vid}: {len(variorum)} sentences, {variations} with variations")

        # Create chapter data structure
        chapter_data = {
            'chapter_id': chapter_id,
            'total_versions': len(version_ids),
            'version_ids': version_ids,
            'base_version_options': base_version_options,
            'variorums_by_base': variorums_by_base,
            'alignment_type': 'sentence-level'
        }

        # Save to separate file
        chapter_file = output_dir / f'{chapter_id}_sentences.json'
        with open(chapter_file, 'w', encoding='utf-8') as f:
            json.dump(chapter_data, f, indent=2, ensure_ascii=False)

        print(f"  Saved to {chapter_file.name}\n")


if __name__ == '__main__':
    process_test_chapters()
