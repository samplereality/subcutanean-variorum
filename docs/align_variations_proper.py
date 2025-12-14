#!/usr/bin/env python3
"""
Proper content-based alignment of paragraphs across versions.
Uses sequence matching to handle insertions/deletions.
"""

import json
import re
from pathlib import Path
from difflib import SequenceMatcher
from collections import defaultdict


def normalize_paragraph(text):
    """Normalize a paragraph for comparison."""
    text = ' '.join(text.split())
    text = re.sub(r'</?em>', '', text)
    return text.strip()


def paragraph_similarity(para1, para2):
    """Calculate similarity between two paragraphs (0.0 to 1.0)."""
    norm1 = normalize_paragraph(para1)
    norm2 = normalize_paragraph(para2)
    return SequenceMatcher(None, norm1, norm2).ratio()


def align_all_versions(all_paragraphs_by_version):
    """
    Align paragraphs across all versions using progressive alignment.
    Returns a list of aligned positions, where each position contains
    paragraph variants from different versions.
    """
    version_ids = sorted(all_paragraphs_by_version.keys())

    # Start with the first version as reference
    alignment = []
    for para in all_paragraphs_by_version[version_ids[0]]:
        alignment.append({
            version_ids[0]: para
        })

    # Progressively align each additional version
    for vid in version_ids[1:]:
        print(f"  Aligning version {vid}...")
        version_paras = all_paragraphs_by_version[vid]
        alignment = align_version_to_alignment(alignment, version_paras, vid)

    return alignment


def align_version_to_alignment(current_alignment, new_version_paras, version_id):
    """
    Align a new version's paragraphs to the existing alignment.
    Uses similarity matching to find best positions.
    """
    aligned_result = []
    new_para_idx = 0

    for align_idx, aligned_position in enumerate(current_alignment):
        # Get a representative paragraph from current alignment
        representative = next(iter(aligned_position.values()))

        if new_para_idx < len(new_version_paras):
            new_para = new_version_paras[new_para_idx]

            # Check similarity with current position
            similarity = paragraph_similarity(representative, new_para)

            # Also check similarity with next position if it exists
            next_similarity = 0.0
            if align_idx + 1 < len(current_alignment):
                next_representative = next(iter(current_alignment[align_idx + 1].values()))
                next_similarity = paragraph_similarity(next_representative, new_para)

            # Decide where to place this paragraph
            if similarity > 0.6:  # Threshold for matching
                # Add to current position
                new_position = dict(aligned_position)
                new_position[version_id] = new_para
                aligned_result.append(new_position)
                new_para_idx += 1

            elif next_similarity > similarity and next_similarity > 0.6:
                # Skip current position (gap in this version)
                aligned_result.append(dict(aligned_position))
                # Will be added to next position in next iteration

            else:
                # This paragraph doesn't match well - might be unique
                # Add current position without this version
                aligned_result.append(dict(aligned_position))

                # Add new unique paragraph
                aligned_result.append({version_id: new_para})
                new_para_idx += 1
        else:
            # No more paragraphs in new version
            aligned_result.append(dict(aligned_position))

    # Add any remaining paragraphs from new version
    while new_para_idx < len(new_version_paras):
        aligned_result.append({version_id: new_version_paras[new_para_idx]})
        new_para_idx += 1

    return aligned_result


def create_variorum_structure(alignment, version_ids):
    """
    Convert alignment to variorum structure.
    Each position shows which versions have which text.
    """
    result = []

    for idx, aligned_position in enumerate(alignment):
        # Count how many versions have content at this position
        versions_with_content = set(aligned_position.keys())

        if not versions_with_content:
            continue

        # Group by normalized content
        content_groups = defaultdict(list)
        for vid, para in aligned_position.items():
            norm = normalize_paragraph(para)
            content_groups[norm].append({
                'version_id': vid,
                'text': para
            })

        # If all versions have the same content, it's not a variation
        has_variation = len(content_groups) > 1 or len(versions_with_content) < len(version_ids)

        # Pick the most common variant as base
        base_norm = max(content_groups.items(), key=lambda x: len(x[1]))[0]
        base_text = content_groups[base_norm][0]['text']
        base_versions = [v['version_id'] for v in content_groups[base_norm]]

        # Build variants list
        variants = []

        # Add variants with different content
        for norm, versions in content_groups.items():
            if norm != base_norm:
                variants.append({
                    'text': versions[0]['text'],
                    'versions': [v['version_id'] for v in versions],
                    'count': len(versions),
                    'type': 'variant'
                })

        # Add placeholder for versions missing this paragraph entirely
        missing_versions = set(version_ids) - versions_with_content
        if missing_versions:
            variants.append({
                'text': '[Paragraph not present in these versions]',
                'versions': sorted(list(missing_versions)),
                'count': len(missing_versions),
                'type': 'omission'
            })

        result.append({
            'position': idx,
            'base_text': base_text,
            'base_versions': base_versions,
            'has_variation': has_variation,
            'variants': variants,
            'total_versions_present': len(versions_with_content)
        })

    return result


def create_variorum_data():
    """Create properly aligned variorum data structure."""

    extracted_dir = Path(__file__).parent / 'extracted_text'
    output_dir = Path(__file__).parent / 'variorum_data'
    output_dir.mkdir(exist_ok=True)

    # Load all versions
    with open(extracted_dir / 'all_versions.json', 'r', encoding='utf-8') as f:
        all_versions = json.load(f)

    version_ids = sorted(all_versions.keys())

    print(f"Aligning {len(version_ids)} versions...")
    print(f"This uses content-based matching to handle insertions/deletions.")

    # Process prologue
    print("\n=== Processing prologue ===")
    prologue_by_version = {
        vid: all_versions[vid]['prologue']
        for vid in version_ids
    }
    prologue_alignment = align_all_versions(prologue_by_version)
    prologue_variorum = create_variorum_structure(prologue_alignment, version_ids)

    # Process chapter 1
    print("\n=== Processing chapter 1 ===")
    chapter1_by_version = {
        vid: all_versions[vid]['chapter1']
        for vid in version_ids
    }
    chapter1_alignment = align_all_versions(chapter1_by_version)
    chapter1_variorum = create_variorum_structure(chapter1_alignment, version_ids)

    # Create final variorum structure
    variorum = {
        'base_version': 'composite',
        'total_versions': len(version_ids),
        'version_ids': version_ids,
        'alignment_method': 'content-based sequence matching',
        'prologue': prologue_variorum,
        'chapter1': chapter1_variorum
    }

    # Save variorum data
    output_file = output_dir / 'variorum.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(variorum, f, indent=2, ensure_ascii=False)

    print(f"\n=== Variorum data saved to {output_file} ===")

    # Print statistics
    prologue_variations = sum(1 for p in prologue_variorum if p['has_variation'])
    chapter1_variations = sum(1 for p in chapter1_variorum if p['has_variation'])

    prologue_positions = len(prologue_variorum)
    chapter1_positions = len(chapter1_variorum)

    print(f"\nStatistics:")
    print(f"  Prologue: {prologue_positions} aligned positions, {prologue_variations} with variations ({prologue_variations/prologue_positions*100:.1f}%)")
    print(f"  Chapter 1: {chapter1_positions} aligned positions, {chapter1_variations} with variations ({chapter1_variations/chapter1_positions*100:.1f}%)")

    # Count omissions
    prologue_omissions = sum(1 for p in prologue_variorum for v in p['variants'] if v.get('type') == 'omission')
    chapter1_omissions = sum(1 for p in chapter1_variorum for v in p['variants'] if v.get('type') == 'omission')

    print(f"  Prologue: {prologue_omissions} positions with omissions in some versions")
    print(f"  Chapter 1: {chapter1_omissions} positions with omissions in some versions")

    return variorum


if __name__ == '__main__':
    create_variorum_data()
