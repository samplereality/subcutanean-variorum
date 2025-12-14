#!/usr/bin/env python3
"""
Better alignment using multi-sequence alignment.
Groups identical/similar paragraphs first, then handles insertions.
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


def are_paragraphs_similar(para1, para2, threshold=0.85):
    """Check if two paragraphs are similar enough to be considered the same."""
    norm1 = normalize_paragraph(para1)
    norm2 = normalize_paragraph(para2)

    if norm1 == norm2:
        return True

    similarity = SequenceMatcher(None, norm1, norm2).ratio()
    return similarity >= threshold


def build_paragraph_clusters(all_versions_paras):
    """
    Group similar paragraphs across all versions into clusters.
    Returns: list of clusters, where each cluster is a dict mapping version_id -> paragraph
    """
    version_ids = sorted(all_versions_paras.keys())

    # Collect all unique paragraphs with their positions
    all_paras = []
    for vid in version_ids:
        for idx, para in enumerate(all_versions_paras[vid]):
            all_paras.append({
                'version': vid,
                'index': idx,
                'text': para,
                'normalized': normalize_paragraph(para)
            })

    # Group identical normalized paragraphs
    norm_groups = defaultdict(list)
    for para_info in all_paras:
        norm_groups[para_info['normalized']].append(para_info)

    print(f"  Found {len(norm_groups)} unique normalized paragraphs")

    # Convert to clusters
    clusters = []
    for norm_text, para_list in norm_groups.items():
        cluster = {}
        for para_info in para_list:
            vid = para_info['version']
            # If multiple paragraphs from same version, keep them separate
            if vid not in cluster:
                cluster[vid] = {
                    'text': para_info['text'],
                    'index': para_info['index']
                }
        clusters.append(cluster)

    print(f"  Created {len(clusters)} paragraph clusters")
    return clusters


def order_clusters_by_position(clusters, version_ids):
    """
    Order clusters by their average position across versions.
    """
    cluster_positions = []

    for cluster in clusters:
        # Calculate average position
        positions = [info['index'] for info in cluster.values()]
        avg_position = sum(positions) / len(positions)

        cluster_positions.append({
            'cluster': cluster,
            'avg_position': avg_position,
            'version_count': len(cluster)
        })

    # Sort by average position
    cluster_positions.sort(key=lambda x: x['avg_position'])

    return [cp['cluster'] for cp in cluster_positions]


def create_variorum_structure(ordered_clusters, version_ids, base_version_id=None):
    """
    Convert ordered clusters to variorum structure.
    If base_version_id is provided, use that version as the base text when available.
    """
    result = []

    for idx, cluster in enumerate(ordered_clusters):
        versions_with_content = set(cluster.keys())

        # Group by actual text (not normalized, to preserve formatting)
        text_groups = defaultdict(list)
        for vid, info in cluster.items():
            text_groups[info['text']].append(vid)

        # Determine base text
        if base_version_id and base_version_id in cluster:
            # Use the specified base version if it has this paragraph
            base_text = cluster[base_version_id]['text']
            base_versions = [base_version_id]
        else:
            # Fall back to most common text
            base_text, base_versions = max(text_groups.items(), key=lambda x: len(x[1]))

        # Has variation if there are different texts OR if not all versions have it
        has_variation = len(text_groups) > 1 or len(versions_with_content) < len(version_ids)

        # Build variants
        variants = []

        # Add text variants (excluding base)
        for text, vids in text_groups.items():
            if text != base_text:
                variants.append({
                    'text': text,
                    'versions': sorted(vids),
                    'count': len(vids),
                    'type': 'variant'
                })
            elif base_version_id and len(vids) > 1:
                # If using single witness base, show other versions with same text
                other_vids = [v for v in vids if v != base_version_id]
                if other_vids:
                    variants.append({
                        'text': text,
                        'versions': sorted(other_vids),
                        'count': len(other_vids),
                        'type': 'agreement',
                        'note': 'Same text as base'
                    })

        # Add omissions
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
            'base_version': base_version_id if base_version_id and base_version_id in cluster else 'composite',
            'base_versions': sorted(base_versions) if not base_version_id else [base_version_id],
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
    print(f"Using paragraph clustering approach.\n")

    # Process prologue
    print("=== Processing prologue ===")
    prologue_by_version = {
        vid: all_versions[vid]['prologue']
        for vid in version_ids
    }

    prologue_clusters = build_paragraph_clusters(prologue_by_version)
    prologue_ordered = order_clusters_by_position(prologue_clusters, version_ids)

    # Process chapter 1
    print("\n=== Processing chapter 1 ===")
    chapter1_by_version = {
        vid: all_versions[vid]['chapter1']
        for vid in version_ids
    }

    chapter1_clusters = build_paragraph_clusters(chapter1_by_version)
    chapter1_ordered = order_clusters_by_position(chapter1_clusters, version_ids)

    # Generate variorums for multiple base versions
    print("\n=== Generating variorums for different base versions ===")

    # Select a few representative base versions
    # Using first, middle, and a couple others from the range
    base_version_options = [
        version_ids[0],   # First
        version_ids[len(version_ids)//2],  # Middle
        version_ids[-1],  # Last
        version_ids[len(version_ids)//4],  # Quarter way
    ]

    print(f"Creating variorums for base versions: {base_version_options}")

    variorums_by_base = {}
    for base_vid in base_version_options:
        print(f"  Generating with base {base_vid}...")
        variorums_by_base[base_vid] = {
            'prologue': create_variorum_structure(prologue_ordered, version_ids, base_vid),
            'chapter1': create_variorum_structure(chapter1_ordered, version_ids, base_vid)
        }

    # Create final variorum structure
    variorum = {
        'total_versions': len(version_ids),
        'version_ids': version_ids,
        'alignment_method': 'paragraph clustering by content similarity',
        'available_base_versions': base_version_options,
        'variorums_by_base': variorums_by_base
    }

    # Save variorum data
    output_file = output_dir / 'variorum.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(variorum, f, indent=2, ensure_ascii=False)

    print(f"\n=== Variorum data saved to {output_file} ===")

    # Print statistics for first base version
    first_base = base_version_options[0]
    prologue_variorum = variorums_by_base[first_base]['prologue']
    chapter1_variorum = variorums_by_base[first_base]['chapter1']

    prologue_variations = sum(1 for p in prologue_variorum if p['has_variation'])
    chapter1_variations = sum(1 for p in chapter1_variorum if p['has_variation'])

    prologue_positions = len(prologue_variorum)
    chapter1_positions = len(chapter1_variorum)

    print(f"\nStatistics (for base version {first_base}):")
    print(f"  Prologue: {prologue_positions} aligned positions, {prologue_variations} with variations")
    print(f"  Chapter 1: {chapter1_positions} aligned positions, {chapter1_variations} with variations")

    # Count omissions
    prologue_omissions = sum(1 for p in prologue_variorum for v in p['variants'] if v.get('type') == 'omission')
    chapter1_omissions = sum(1 for p in chapter1_variorum for v in p['variants'] if v.get('type') == 'omission')

    print(f"  Prologue: {prologue_omissions} positions with omissions")
    print(f"  Chapter 1: {chapter1_omissions} positions with omissions")
    print(f"\nAvailable base versions: {base_version_options}")

    return variorum


if __name__ == '__main__':
    create_variorum_data()
