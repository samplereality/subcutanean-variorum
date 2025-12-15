#!/usr/bin/env python3
"""
Align all chapters and create separate JSON files for each chapter.
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


def build_paragraph_clusters(all_versions_paras):
    """Group similar paragraphs across all versions into clusters."""
    version_ids = sorted(all_versions_paras.keys())

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

    # Convert to clusters
    clusters = []
    for norm_text, para_list in norm_groups.items():
        cluster = {}
        for para_info in para_list:
            vid = para_info['version']
            if vid not in cluster:
                cluster[vid] = {
                    'text': para_info['text'],
                    'index': para_info['index']
                }
        clusters.append(cluster)

    return clusters


def order_clusters_by_position(clusters, version_ids):
    """Order clusters by their average position across versions."""
    cluster_positions = []

    for cluster in clusters:
        positions = [info['index'] for info in cluster.values()]
        avg_position = sum(positions) / len(positions)

        cluster_positions.append({
            'cluster': cluster,
            'avg_position': avg_position,
            'version_count': len(cluster)
        })

    cluster_positions.sort(key=lambda x: x['avg_position'])
    return [cp['cluster'] for cp in cluster_positions]


def create_variorum_structure(ordered_clusters, version_ids, base_version_id=None):
    """Convert ordered clusters to variorum structure."""
    result = []

    for idx, cluster in enumerate(ordered_clusters):
        versions_with_content = set(cluster.keys())

        # Group by actual text
        text_groups = defaultdict(list)
        for vid, info in cluster.items():
            text_groups[info['text']].append(vid)

        # Determine base text
        if base_version_id and base_version_id in cluster:
            base_text = cluster[base_version_id]['text']
            base_versions = [base_version_id]
        else:
            base_text, base_versions = max(text_groups.items(), key=lambda x: len(x[1]))

        has_variation = len(text_groups) > 1 or len(versions_with_content) < len(version_ids)

        # Build variants
        variants = []

        for text, vids in text_groups.items():
            if text != base_text:
                variants.append({
                    'text': text,
                    'versions': sorted(vids),
                    'count': len(vids),
                    'type': 'variant'
                })
            elif base_version_id and len(vids) > 1:
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


def process_all_chapters():
    """Process all chapters and create separate JSON files."""

    extracted_dir = Path(__file__).parent / 'extracted_text'
    output_dir = Path(__file__).parent / 'variorum_data'
    output_dir.mkdir(exist_ok=True)

    # Load all versions
    with open(extracted_dir / 'all_versions.json', 'r', encoding='utf-8') as f:
        all_versions = json.load(f)

    version_ids = sorted(all_versions.keys())
    base_version_options = ['45451', '45452', '45453', '45457', '45462']

    print(f"Aligning {len(version_ids)} versions...")
    print(f"Base versions: {base_version_options}")

    # Get list of all chapters
    first_version = all_versions[version_ids[0]]
    chapter_ids = [key for key in first_version.keys() if key != 'version_id']

    print(f"Found {len(chapter_ids)} chapters: {chapter_ids}\n")

    # Create manifest
    manifest = {
        'total_versions': len(version_ids),
        'version_ids': version_ids,
        'base_version_options': base_version_options,
        'chapters': []
    }

    # Process each chapter
    for chapter_id in chapter_ids:
        print(f"=== Processing {chapter_id} ===")

        # Get paragraphs for this chapter from all versions
        chapter_by_version = {}
        for vid in version_ids:
            if chapter_id in all_versions[vid]:
                chapter_by_version[vid] = all_versions[vid][chapter_id]

        if not chapter_by_version:
            print(f"  Skipping {chapter_id} - no data found")
            continue

        # Cluster and order
        clusters = build_paragraph_clusters(chapter_by_version)
        ordered = order_clusters_by_position(clusters, version_ids)

        print(f"  Found {len(clusters)} unique paragraphs")

        # Generate variorums for all base versions
        variorums_by_base = {}
        for base_vid in base_version_options:
            variorums_by_base[base_vid] = create_variorum_structure(
                ordered, version_ids, base_vid
            )

        # Create chapter data structure
        chapter_data = {
            'chapter_id': chapter_id,
            'total_versions': len(version_ids),
            'version_ids': version_ids,
            'base_version_options': base_version_options,
            'variorums_by_base': variorums_by_base
        }

        # Save to separate file
        chapter_file = output_dir / f'{chapter_id}.json'
        with open(chapter_file, 'w', encoding='utf-8') as f:
            json.dump(chapter_data, f, indent=2, ensure_ascii=False)

        print(f"  Saved to {chapter_file.name}")

        # Add to manifest
        manifest['chapters'].append({
            'id': chapter_id,
            'file': f'{chapter_id}.json',
            'paragraph_count': len(ordered)
        })

    # Save manifest
    manifest_file = output_dir / 'manifest.json'
    with open(manifest_file, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    print(f"\n=== Manifest saved to {manifest_file} ===")
    print(f"Total chapters: {len(manifest['chapters'])}")


if __name__ == '__main__':
    process_all_chapters()
