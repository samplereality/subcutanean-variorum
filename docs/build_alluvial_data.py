#!/usr/bin/env python3
"""
Build alluvial diagram data from 10,000 Subcutanean text variants.

For each chapter, identifies the top N most balanced paragraphs (closest to
50% prevalence) and uses their binary presence/absence as cluster keys.
This limits clusters to at most 2^N groups per chapter, creating readable
alluvial flows.

Groups variants into clusters, then tracks flows between adjacent chapters.
Outputs a JSON file for the browser to render an alluvial/Sankey diagram.

Usage:
    python build_alluvial_data.py
"""

import json
import os
import sys
from collections import defaultdict
from datetime import datetime

# Import shared functions from the rarity scores script
from build_rarity_scores import (
    VARIANTS_DIR,
    parse_txt_file,
    normalize_paragraph,
    hash_paragraph,
)


RARITY_FILE = os.path.join(os.path.dirname(__file__), 'extracted_text', 'rarity_scores.json')
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), 'extracted_text', 'alluvial_data.json')

MAX_CLUSTERS = 7  # Top 7 named clusters + 1 "Other" = 8 total

# Number of binary features (most-balanced paragraphs) per chapter.
# 3 features → at most 2^3 = 8 groups per chapter.
NUM_FEATURES = 3

# Paragraphs must be in 10-90% prevalence range to be considered as features
MIN_PREVALENCE = 0.10
MAX_PREVALENCE = 0.90

CHAPTER_ORDER = [
    'prologue', 'chapter1', 'chapter2', 'chapter3', 'chapter4',
    'chapter5', 'chapter6', 'chapter7', 'chapter8', 'chapter9',
    'part2', 'chapter10', 'chapter11', 'chapter12', 'chapter13',
    'chapter14', 'chapter15', 'part3', 'chapter16', 'chapter17',
    'chapter18', 'notes'
]

CHAPTER_LABELS = {
    'prologue': 'Prologue', 'chapter1': 'Ch 1', 'chapter2': 'Ch 2',
    'chapter3': 'Ch 3', 'chapter4': 'Ch 4', 'chapter5': 'Ch 5',
    'chapter6': 'Ch 6', 'chapter7': 'Ch 7', 'chapter8': 'Ch 8',
    'chapter9': 'Ch 9', 'part2': 'Part II', 'chapter10': 'Ch 10',
    'chapter11': 'Ch 11', 'chapter12': 'Ch 12', 'chapter13': 'Ch 13',
    'chapter14': 'Ch 14', 'chapter15': 'Ch 15', 'part3': 'Part III',
    'chapter16': 'Ch 16', 'chapter17': 'Ch 17', 'chapter18': 'Epilogue',
    'notes': 'Notes'
}


def load_feature_paragraphs(rarity_file):
    """Select the top N most balanced paragraphs per chapter as binary features.

    "Most balanced" = closest to 50% prevalence. These create the most even
    splits and represent the most significant structural choices.

    Returns dict of chapter_id → list of (hash, count, preview) tuples,
    sorted by distance from 50%.
    """
    with open(rarity_file, 'r', encoding='utf-8') as f:
        rarity = json.load(f)

    total = rarity['meta']['total_variants']
    target = total * 0.5  # 50% = most balanced split
    min_count = total * MIN_PREVALENCE
    max_count = total * MAX_PREVALENCE

    features = {}  # chapter_id → list of (hash, count, preview)
    for chapter_id, entries in rarity['chapters'].items():
        candidates = []
        for h, entry in entries.items():
            count = entry['count']
            if min_count <= count <= max_count:
                distance = abs(count - target)
                candidates.append((distance, h, count, entry.get('preview', '')))

        # Sort by distance from 50% (closest first), take top N
        candidates.sort()
        features[chapter_id] = [
            (h, count, preview) for (_, h, count, preview) in candidates[:NUM_FEATURES]
        ]

    return features, total


def compute_binary_fingerprint(paragraphs, feature_hashes):
    """Compute a binary fingerprint based on presence/absence of feature paragraphs.

    Returns a string like "101" where each bit represents whether that
    feature paragraph is present in this variant's chapter.
    """
    if not feature_hashes:
        return 'uniform'

    # Collect all paragraph hashes for this variant's chapter
    variant_hashes = set()
    for para in paragraphs:
        normalized = normalize_paragraph(para)
        if len(normalized) < 10:
            continue
        variant_hashes.add(hash_paragraph(normalized))

    # Build binary string: 1 if feature present, 0 if absent
    bits = []
    for fh in feature_hashes:
        bits.append('1' if fh in variant_hashes else '0')

    return ''.join(bits)


def fingerprint_label(fp, feature_info):
    """Generate a human-readable label for a binary fingerprint.

    Uses the feature previews to describe what's present/absent.
    """
    if fp == 'uniform' or fp == 'empty':
        return fp
    parts = []
    for i, bit in enumerate(fp):
        if i < len(feature_info):
            _, _, preview = feature_info[i]
            short = preview[:40].strip()
            if bit == '1':
                parts.append(f'+"{short}..."')
            else:
                parts.append(f'-"{short}..."')
    return ' '.join(parts)


def main():
    if not os.path.isdir(VARIANTS_DIR):
        print(f"Error: Directory not found: {VARIANTS_DIR}")
        sys.exit(1)

    if not os.path.isfile(RARITY_FILE):
        print(f"Error: Rarity scores not found: {RARITY_FILE}")
        print("Run build_rarity_scores.py first.")
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

    # Phase 0: Load feature paragraphs from rarity data
    print(f"\nPhase 0 - Selecting top {NUM_FEATURES} most balanced paragraphs per chapter...")
    features, rarity_total = load_feature_paragraphs(RARITY_FILE)

    for ch in CHAPTER_ORDER:
        feat = features.get(ch, [])
        if feat:
            counts_str = ', '.join(f"{c}/{rarity_total} ({c/rarity_total*100:.0f}%)" for _, c, _ in feat)
            print(f"  {ch:12s}: {len(feat)} features — prevalence: {counts_str}")
        else:
            print(f"  {ch:12s}: 0 features (chapter is uniform or has no balanced paragraphs)")

    # Phase 1: Compute binary fingerprints for each variant × chapter
    print(f"\nPhase 1 - Computing binary fingerprints...")
    variant_fingerprints = {}
    errors = 0

    for idx, filename in enumerate(txt_files):
        if (idx + 1) % 500 == 0 or idx == 0:
            print(f"  Fingerprinting {idx + 1}/{total_files}: {filename}")

        variant_id = filename[:-4]
        filepath = os.path.join(VARIANTS_DIR, filename)

        try:
            chapters = parse_txt_file(filepath)
            variant_fingerprints[variant_id] = {}
            for chapter_id in CHAPTER_ORDER:
                feat = features.get(chapter_id, [])
                feature_hashes = [h for h, _, _ in feat]
                if chapter_id in chapters and chapters[chapter_id]:
                    fp = compute_binary_fingerprint(chapters[chapter_id], feature_hashes)
                    variant_fingerprints[variant_id][chapter_id] = fp
                else:
                    variant_fingerprints[variant_id][chapter_id] = 'empty'
        except Exception as e:
            errors += 1
            if errors <= 10:
                print(f"  Warning: Error processing {filename}: {e}")

    print(f"\n  Phase 1 complete: {len(variant_fingerprints)} variants ({errors} errors)")

    # Phase 2: Cluster variants by fingerprint per chapter
    print(f"\nPhase 2 - Clustering variants per chapter...")
    chapter_clusters = {}
    variant_cluster_index = defaultdict(dict)

    for chapter_id in CHAPTER_ORDER:
        fp_groups = defaultdict(list)
        for variant_id, fps in variant_fingerprints.items():
            fp = fps.get(chapter_id, 'empty')
            fp_groups[fp].append(variant_id)

        sorted_clusters = sorted(fp_groups.items(), key=lambda x: len(x[1]), reverse=True)

        chapter_clusters[chapter_id] = []
        other_variants = []

        for i, (fp, variants) in enumerate(sorted_clusters):
            if i < MAX_CLUSTERS:
                chapter_clusters[chapter_id].append({
                    'fingerprint': fp,
                    'variants': variants,
                    'count': len(variants),
                })
                for v in variants:
                    variant_cluster_index[v][chapter_id] = i
            else:
                other_variants.extend(variants)

        if other_variants:
            other_idx = len(chapter_clusters[chapter_id])
            chapter_clusters[chapter_id].append({
                'fingerprint': 'other',
                'variants': other_variants,
                'count': len(other_variants),
            })
            for v in other_variants:
                variant_cluster_index[v][chapter_id] = other_idx

        num_distinct = len(sorted_clusters)
        top_size = len(sorted_clusters[0][1]) if sorted_clusters else 0
        print(f"  {chapter_id:12s}: {num_distinct:3d} distinct groups, "
              f"largest: {top_size:5d} ({top_size/total_files*100:.1f}%), "
              f"kept {len(chapter_clusters[chapter_id])} clusters")

    # Phase 3: Compute flows between adjacent chapters
    print(f"\nPhase 3 - Computing flows...")
    nodes = []
    links = []

    for chapter_id in CHAPTER_ORDER:
        clusters = chapter_clusters[chapter_id]
        feat = features.get(chapter_id, [])
        for i, cluster in enumerate(clusters):
            pct = (cluster['count'] / total_files) * 100
            fp = cluster['fingerprint']
            is_other = fp == 'other'
            if is_other:
                label = f"Other ({pct:.1f}%)"
            elif fp == 'uniform':
                label = f"Uniform ({pct:.1f}%)"
            elif fp == 'empty':
                label = f"Empty ({pct:.1f}%)"
            elif i == 0:
                label = f"Most common ({pct:.1f}%)"
            else:
                label = f"Variant {chr(65 + i)} ({pct:.1f}%)"

            nodes.append({
                'id': f"{chapter_id}_{i}",
                'chapter': chapter_id,
                'index': i,
                'count': cluster['count'],
                'label': label,
                'fingerprint': fp,
            })

    for ci in range(len(CHAPTER_ORDER) - 1):
        source_chapter = CHAPTER_ORDER[ci]
        target_chapter = CHAPTER_ORDER[ci + 1]

        flow_counts = defaultdict(int)
        for variant_id in variant_fingerprints:
            src_idx = variant_cluster_index[variant_id].get(source_chapter)
            tgt_idx = variant_cluster_index[variant_id].get(target_chapter)
            if src_idx is not None and tgt_idx is not None:
                flow_counts[(src_idx, tgt_idx)] += 1

        for (src_idx, tgt_idx), count in flow_counts.items():
            if count > 0:
                links.append({
                    'source': f"{source_chapter}_{src_idx}",
                    'target': f"{target_chapter}_{tgt_idx}",
                    'value': count,
                })

    # Build feature info for output (so browser can show what each cluster means)
    feature_info = {}
    for chapter_id in CHAPTER_ORDER:
        feat = features.get(chapter_id, [])
        if feat:
            feature_info[chapter_id] = [
                {'hash': h, 'count': c, 'preview': p}
                for h, c, p in feat
            ]

    # Build output
    output = {
        'meta': {
            'total_variants': total_files,
            'chapters': CHAPTER_ORDER,
            'chapter_labels': CHAPTER_LABELS,
            'max_clusters_per_chapter': MAX_CLUSTERS + 1,
            'num_features': NUM_FEATURES,
            'generated': datetime.now().isoformat(),
        },
        'features': feature_info,
        'nodes': nodes,
        'links': links,
    }

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\nDone! Output: {OUTPUT_FILE}")
    print(f"  Nodes: {len(nodes)}")
    print(f"  Links: {len(links)}")


if __name__ == '__main__':
    main()
