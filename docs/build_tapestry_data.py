#!/usr/bin/env python3
"""
Build tapestry visualization data from 10,000 Subcutanean text variants.

For each variant at each chapter, computes a "distance from consensus" score
based on average paragraph rarity. Variants are then bundled by prologue
cluster and quantized distance trajectory, producing grouped thread paths
for the browser to render as a tapestry diagram.

Usage:
    python build_tapestry_data.py
"""

import json
import math
import os
import sys
from collections import defaultdict
from datetime import datetime

from build_rarity_scores import (
    VARIANTS_DIR,
    parse_txt_file,
    normalize_paragraph,
    hash_paragraph,
)

RARITY_FILE = os.path.join(os.path.dirname(__file__), 'extracted_text', 'rarity_scores.json')
ALLUVIAL_FILE = os.path.join(os.path.dirname(__file__), 'extracted_text', 'alluvial_data.json')
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), 'extracted_text', 'tapestry_data.json')

NUM_BINS = 5  # Bins per discriminating chapter (coarse for effective bundling)
NUM_KEY_CHAPTERS = 4  # Number of most-discriminating chapters to use for bundling

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


def load_rarity_lookup(rarity_file):
    """Load rarity scores into a lookup: chapter_id → hash → count."""
    with open(rarity_file, 'r', encoding='utf-8') as f:
        rarity = json.load(f)

    total = rarity['meta']['total_variants']
    lookup = {}
    for chapter_id, entries in rarity['chapters'].items():
        lookup[chapter_id] = {h: entry['count'] for h, entry in entries.items()}

    return lookup, total


def load_prologue_clusters(alluvial_file):
    """Load prologue cluster fingerprints and feature hashes from alluvial data.

    Returns:
        feature_hashes: list of paragraph hashes used as prologue features
        cluster_fps: dict mapping fingerprint string → cluster index
    """
    with open(alluvial_file, 'r', encoding='utf-8') as f:
        alluvial = json.load(f)

    # Get prologue feature hashes
    prologue_features = alluvial.get('features', {}).get('prologue', [])
    feature_hashes = [f['hash'] for f in prologue_features]

    # Build fingerprint → cluster index mapping from prologue nodes
    cluster_fps = {}
    for node in alluvial['nodes']:
        if node['chapter'] == 'prologue':
            cluster_fps[node['fingerprint']] = node['clusterIndex'] if 'clusterIndex' in node else node['index']

    return feature_hashes, cluster_fps


def compute_prologue_fingerprint(paragraphs, feature_hashes):
    """Compute binary fingerprint for prologue cluster assignment."""
    if not feature_hashes:
        return 'uniform'

    variant_hashes = set()
    for para in paragraphs:
        normalized = normalize_paragraph(para)
        if len(normalized) < 10:
            continue
        variant_hashes.add(hash_paragraph(normalized))

    bits = []
    for fh in feature_hashes:
        bits.append('1' if fh in variant_hashes else '0')

    return ''.join(bits)


def compute_chapter_distance(paragraphs, rarity_lookup, total):
    """Compute distance from consensus for a variant's chapter.

    distance = mean(1 - count/total) for each paragraph.
    0.0 = all paragraphs are universal, 1.0 = all paragraphs are unique.
    """
    if not paragraphs:
        return 0.0

    scores = []
    for para in paragraphs:
        normalized = normalize_paragraph(para)
        if len(normalized) < 10:
            continue
        h = hash_paragraph(normalized)
        count = rarity_lookup.get(h, 1)  # Default to 1 if not found (very rare)
        scores.append(1.0 - count / total)

    if not scores:
        return 0.0

    return sum(scores) / len(scores)


def quantize_distance(distance, num_bins):
    """Quantize a distance value [0, 1] into a bin index and return bin center."""
    bin_idx = min(int(distance * num_bins), num_bins - 1)
    bin_center = (bin_idx + 0.5) / num_bins
    return bin_idx, round(bin_center, 4)


def main():
    if not os.path.isdir(VARIANTS_DIR):
        print(f"Error: Directory not found: {VARIANTS_DIR}")
        sys.exit(1)

    if not os.path.isfile(RARITY_FILE):
        print(f"Error: Rarity scores not found: {RARITY_FILE}")
        print("Run build_rarity_scores.py first.")
        sys.exit(1)

    if not os.path.isfile(ALLUVIAL_FILE):
        print(f"Error: Alluvial data not found: {ALLUVIAL_FILE}")
        print("Run build_alluvial_data.py first.")
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

    # Phase 0: Load reference data
    print(f"\nPhase 0 - Loading reference data...")
    rarity_lookup, rarity_total = load_rarity_lookup(RARITY_FILE)
    print(f"  Rarity data: {rarity_total} variants, {len(rarity_lookup)} chapters")

    feature_hashes, cluster_fps = load_prologue_clusters(ALLUVIAL_FILE)
    print(f"  Prologue features: {len(feature_hashes)} hashes")
    print(f"  Prologue clusters: {len(cluster_fps)} fingerprints")
    for fp, idx in sorted(cluster_fps.items(), key=lambda x: x[1]):
        print(f"    Cluster {idx}: fingerprint '{fp}'")

    # Phase 1: Compute distances and cluster assignments
    print(f"\nPhase 1 - Computing distances for {total_files} variants...")
    variant_data = {}  # variant_id → { 'cluster': int, 'distances': [float] }
    errors = 0

    for idx, filename in enumerate(txt_files):
        if (idx + 1) % 500 == 0 or idx == 0:
            print(f"  Processing {idx + 1}/{total_files}: {filename}")

        variant_id = filename[:-4]
        filepath = os.path.join(VARIANTS_DIR, filename)

        try:
            chapters = parse_txt_file(filepath)

            # Compute prologue cluster
            prologue_paras = chapters.get('prologue', [])
            fp = compute_prologue_fingerprint(prologue_paras, feature_hashes)
            cluster = cluster_fps.get(fp, 0)

            # Compute distance per chapter
            distances = []
            for chapter_id in CHAPTER_ORDER:
                chapter_rarity = rarity_lookup.get(chapter_id, {})
                paras = chapters.get(chapter_id, [])
                dist = compute_chapter_distance(paras, chapter_rarity, rarity_total)
                distances.append(dist)

            variant_data[variant_id] = {
                'cluster': cluster,
                'distances': distances,
            }

        except Exception as e:
            errors += 1
            if errors <= 10:
                print(f"  Warning: Error processing {filename}: {e}")

    print(f"\n  Phase 1 complete: {len(variant_data)} variants ({errors} errors)")

    # Show distance statistics per chapter
    print(f"\n  Distance statistics per chapter:")
    for ci, chapter_id in enumerate(CHAPTER_ORDER):
        dists = [v['distances'][ci] for v in variant_data.values()]
        avg = sum(dists) / len(dists) if dists else 0
        mn = min(dists) if dists else 0
        mx = max(dists) if dists else 0
        print(f"    {chapter_id:12s}: avg={avg:.3f}, min={mn:.3f}, max={mx:.3f}")

    # Phase 2: Identify most discriminating chapters and bundle
    print(f"\nPhase 2 - Selecting {NUM_KEY_CHAPTERS} most discriminating chapters for bundling...")

    # Find chapters with widest distance ranges (most discriminating)
    chapter_ranges = []
    for ci, chapter_id in enumerate(CHAPTER_ORDER):
        dists = [v['distances'][ci] for v in variant_data.values()]
        dist_range = max(dists) - min(dists) if dists else 0
        chapter_ranges.append((dist_range, ci, chapter_id))

    chapter_ranges.sort(reverse=True)
    key_chapters = chapter_ranges[:NUM_KEY_CHAPTERS]
    key_indices = [ci for _, ci, _ in key_chapters]

    print(f"  Key chapters (by distance range):")
    for rng, ci, ch in key_chapters:
        print(f"    {ch:12s}: range={rng:.3f}")

    # Bundle by: (prologue_cluster, bin_at_key_ch1, bin_at_key_ch2, ...)
    # Then compute mean distances for the full 22-chapter path
    print(f"\n  Bundling by prologue cluster + {NUM_BINS} bins at {NUM_KEY_CHAPTERS} key chapters...")

    bundle_groups = defaultdict(list)

    for variant_id, vdata in variant_data.items():
        key_bins = []
        for ci in key_indices:
            # Normalize to chapter's own range for binning
            dists_at_ch = [v['distances'][ci] for v in variant_data.values()]
            ch_min = min(dists_at_ch)
            ch_max = max(dists_at_ch)
            ch_range = ch_max - ch_min if ch_max > ch_min else 1.0
            normalized = (vdata['distances'][ci] - ch_min) / ch_range
            bin_idx = min(int(normalized * NUM_BINS), NUM_BINS - 1)
            key_bins.append(bin_idx)

        key = (vdata['cluster'], tuple(key_bins))
        bundle_groups[key].append(variant_id)

    # Convert to bundle list using mean distances across variants in each bundle
    bundles = []
    for (cluster, key_bins), variant_ids in bundle_groups.items():
        # Compute mean distance at each chapter across all variants in this bundle
        path = []
        for ci in range(len(CHAPTER_ORDER)):
            mean_dist = sum(variant_data[vid]['distances'][ci] for vid in variant_ids) / len(variant_ids)
            path.append(round(mean_dist, 4))
        bundles.append({
            'count': len(variant_ids),
            'cluster': cluster,
            'path': path,
        })

    # Sort bundles: largest first for rendering order (small bundles on top)
    bundles.sort(key=lambda b: -b['count'])

    # Statistics
    cluster_counts = defaultdict(int)
    for b in bundles:
        cluster_counts[b['cluster']] += b['count']

    print(f"  Total bundles: {len(bundles)}")
    sizes = sorted(b['count'] for b in bundles)
    print(f"  Bundle sizes: min={sizes[0]}, max={sizes[-1]}, "
          f"median={sizes[len(sizes)//2]}, mean={sum(sizes)/len(sizes):.1f}")
    print(f"  Variants per cluster:")
    for cl in sorted(cluster_counts.keys()):
        print(f"    Cluster {cl}: {cluster_counts[cl]} variants")

    # Build output
    output = {
        'meta': {
            'total_variants': total_files,
            'chapters': CHAPTER_ORDER,
            'chapter_labels': CHAPTER_LABELS,
            'num_bins': NUM_BINS,
            'num_bundles': len(bundles),
            'generated': datetime.now().isoformat(),
        },
        'bundles': bundles,
    }

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\nDone! Output: {OUTPUT_FILE}")
    print(f"  Bundles: {len(bundles)}")
    total_variants = sum(b['count'] for b in bundles)
    print(f"  Total variants represented: {total_variants}")


if __name__ == '__main__':
    main()
