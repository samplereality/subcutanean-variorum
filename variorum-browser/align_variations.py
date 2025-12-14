#!/usr/bin/env python3
"""
Align text across all versions and identify variation points.
"""

import json
import re
from pathlib import Path
from difflib import SequenceMatcher
from collections import defaultdict


def tokenize(text):
    """Split text into words while preserving punctuation."""
    # Split on whitespace but keep the whitespace
    tokens = re.findall(r'\S+|\s+', text)
    return tokens


def find_variations_in_paragraph(base_para, all_paras):
    """
    Find variations within a set of corresponding paragraphs.
    Returns a list of segments with variation information.
    """
    if not all_paras:
        return [{'text': base_para, 'variants': []}]

    # Tokenize all paragraphs
    base_tokens = tokenize(base_para)
    other_tokens = [tokenize(p) for p in all_paras]

    # Find common and varying sections
    segments = []
    i = 0

    while i < len(base_tokens):
        # Check if this token varies across versions
        current_token = base_tokens[i]

        # Collect this token from all versions
        versions_tokens = [tokens[i] if i < len(tokens) else '' for tokens in other_tokens]

        # Check if there's variation
        all_tokens = [current_token] + versions_tokens
        unique_tokens = set(t.strip() for t in all_tokens if t.strip())

        if len(unique_tokens) > 1:
            # There's variation at this position
            # Try to find the extent of the variation
            var_end = i + 1

            # Look ahead to find where variation ends
            # (simplified version - we'll just capture single token variations for now)
            variants = list(unique_tokens - {current_token.strip()})

            segments.append({
                'text': current_token,
                'has_variation': True,
                'variants': variants
            })
        else:
            # No variation - add to current non-varying segment
            if segments and not segments[-1].get('has_variation'):
                segments[-1]['text'] += current_token
            else:
                segments.append({
                    'text': current_token,
                    'has_variation': False,
                    'variants': []
                })

        i += 1

    # Merge consecutive non-varying segments
    merged_segments = []
    for seg in segments:
        if merged_segments and not seg.get('has_variation') and not merged_segments[-1].get('has_variation'):
            merged_segments[-1]['text'] += seg['text']
        else:
            merged_segments.append(seg)

    return merged_segments


def align_paragraphs(base_paras, all_versions_paras):
    """
    Align paragraphs across all versions.
    Uses simple sequential alignment - assumes paragraphs are in the same order.
    """
    max_paras = max(len(base_paras), max(len(v) for v in all_versions_paras))

    aligned_result = []

    for i in range(len(base_paras)):
        base_para = base_paras[i]

        # Get corresponding paragraph from each version
        corresponding_paras = []
        for version_paras in all_versions_paras:
            if i < len(version_paras):
                corresponding_paras.append(version_paras[i])
            else:
                corresponding_paras.append('')

        # Find variations within this paragraph
        segments = find_variations_in_paragraph(base_para, corresponding_paras)

        aligned_result.append({
            'paragraph_index': i,
            'segments': segments
        })

    return aligned_result


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

    prologue_aligned = align_paragraphs(base_prologue, other_prologues)

    # Process chapter 1
    print("Processing chapter 1...")
    base_chapter1 = base_data['chapter1']
    other_chapter1s = [all_versions[vid]['chapter1'] for vid in version_ids[1:]]

    chapter1_aligned = align_paragraphs(base_chapter1, other_chapter1s)

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
    prologue_variations = sum(1 for p in prologue_aligned for s in p['segments'] if s.get('has_variation'))
    chapter1_variations = sum(1 for p in chapter1_aligned for s in p['segments'] if s.get('has_variation'))

    print(f"\nStatistics:")
    print(f"  Prologue: {len(prologue_aligned)} paragraphs, {prologue_variations} variation points")
    print(f"  Chapter 1: {len(chapter1_aligned)} paragraphs, {chapter1_variations} variation points")

    return variorum


if __name__ == '__main__':
    create_variorum_data()
