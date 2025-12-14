#!/usr/bin/env python3
"""
Align text across all versions and identify variation points at paragraph level.
"""

import json
import re
from pathlib import Path
from collections import defaultdict


def normalize_paragraph(text):
    """Normalize a paragraph for comparison - remove extra whitespace, etc."""
    # Remove extra whitespace
    text = ' '.join(text.split())
    # Remove em tags for comparison purposes
    text = re.sub(r'</?em>', '', text)
    return text.strip()


def find_paragraph_variations(base_paras, all_versions_paras, version_ids):
    """
    Find paragraph-level variations across all versions.
    Returns paragraphs with their variants.
    """
    result = []

    # Assume paragraphs are in the same order, but content may vary
    max_paras = len(base_paras)

    for i in range(max_paras):
        base_para = base_paras[i]
        base_normalized = normalize_paragraph(base_para)

        # Collect this paragraph from all versions
        para_variants = {}

        for j, version_paras in enumerate(all_versions_paras):
            if i < len(version_paras):
                version_para = version_paras[i]
                version_normalized = normalize_paragraph(version_para)

                # Group by normalized content
                if version_normalized not in para_variants:
                    para_variants[version_normalized] = {
                        'text': version_para,
                        'versions': []
                    }
                para_variants[version_normalized]['versions'].append(version_ids[j + 1])

        # Check if there are variations
        has_variation = len(para_variants) > 0 and (
            base_normalized not in para_variants or
            len(para_variants) > 1
        )

        # Build variant list (excluding the base version)
        variants = []
        if has_variation:
            for norm_text, data in para_variants.items():
                if norm_text != base_normalized:
                    variants.append({
                        'text': data['text'],
                        'versions': data['versions'],
                        'count': len(data['versions'])
                    })

        result.append({
            'paragraph_index': i,
            'base_text': base_para,
            'has_variation': has_variation,
            'variants': variants
        })

    return result


def create_variorum_data():
    """Create the variorum data structure from extracted texts."""

    extracted_dir = Path(__file__).parent / 'extracted_text'
    output_dir = Path(__file__).parent / 'variorum_data'
    output_dir.mkdir(exist_ok=True)

    # Load all versions
    with open(extracted_dir / 'all_versions.json', 'r', encoding='utf-8') as f:
        all_versions = json.load(f)

    # Use first version as base
    version_ids = sorted(all_versions.keys())
    base_version_id = version_ids[0]
    base_data = all_versions[base_version_id]

    print(f"Using version {base_version_id} as base")
    print(f"Comparing against {len(version_ids) - 1} other versions")

    # Process prologue
    print("\nProcessing prologue...")
    base_prologue = base_data['prologue']
    other_prologues = [all_versions[vid]['prologue'] for vid in version_ids[1:]]

    prologue_aligned = find_paragraph_variations(base_prologue, other_prologues, version_ids)

    # Process chapter 1
    print("Processing chapter 1...")
    base_chapter1 = base_data['chapter1']
    other_chapter1s = [all_versions[vid]['chapter1'] for vid in version_ids[1:]]

    chapter1_aligned = find_paragraph_variations(base_chapter1, other_chapter1s, version_ids)

    # Create final variorum structure
    variorum = {
        'base_version': base_version_id,
        'total_versions': len(version_ids),
        'version_ids': version_ids,
        'prologue': prologue_aligned,
        'chapter1': chapter1_aligned
    }

    # Save variorum data
    output_file = output_dir / 'variorum.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(variorum, f, indent=2, ensure_ascii=False)

    print(f"\nVariorum data saved to {output_file}")

    # Print some statistics
    prologue_variations = sum(1 for p in prologue_aligned if p['has_variation'])
    chapter1_variations = sum(1 for p in chapter1_aligned if p['has_variation'])

    prologue_total = len(prologue_aligned)
    chapter1_total = len(chapter1_aligned)

    print(f"\nStatistics:")
    print(f"  Prologue: {prologue_variations}/{prologue_total} paragraphs vary ({prologue_variations/prologue_total*100:.1f}%)")
    print(f"  Chapter 1: {chapter1_variations}/{chapter1_total} paragraphs vary ({chapter1_variations/chapter1_total*100:.1f}%)")

    # Show some example variations
    print(f"\nExample variations in prologue:")
    count = 0
    for p in prologue_aligned:
        if p['has_variation'] and count < 3:
            print(f"  Paragraph {p['paragraph_index']}: {len(p['variants'])} variant(s)")
            count += 1

    return variorum


if __name__ == '__main__':
    create_variorum_data()
