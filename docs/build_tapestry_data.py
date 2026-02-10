#!/usr/bin/env python3
"""
Build tapestry visualization data from 10,000 Subcutanean text variants.

For each variant at each chapter, computes a "distance from consensus" score
based on average paragraph rarity, then converts to per-chapter percentile
ranks so values are comparable across chapters of different lengths.
Variants are bundled by Ch1 intro cluster and quantized percentile trajectory,
producing grouped thread paths for the browser to render as a tapestry diagram.

Usage:
    python build_tapestry_data.py
"""

import bisect
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
ALL_VERSIONS_FILE = os.path.join(os.path.dirname(__file__), 'extracted_text', 'all_versions.json')
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), 'extracted_text', 'tapestry_data.json')

# Chapter 1 intro detection patterns (from ch01.txt line 15: [DEFINE @clubintro|@makeupintro|@noodlesintro])
INTRO_PATTERNS = {
    'club': "I hadn't wanted to go to the club",
    'makeup': 'I was on the back porch',
    'noodles': 'I was in the kitchen making ramen',
}
INTRO_NAMES = ['club', 'makeup', 'noodles']  # Index order for cluster assignment

NUM_BINS = 3  # Bins per discriminating chapter (fewer needed with percentile values)
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


def detect_ch1_intro(chapters):
    """Detect which Chapter 1 intro variant a copy contains.

    Returns cluster index: 0=club, 1=makeup, 2=noodles.
    Based on [DEFINE @clubintro|@makeupintro|@noodlesintro] in ch01.txt.
    """
    ch1_text = ' '.join(chapters.get('chapter1', []))
    for idx, name in enumerate(INTRO_NAMES):
        if INTRO_PATTERNS[name] in ch1_text:
            return idx
    return 0  # Default to club if detection fails


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
    print(f"  Ch1 intro clusters: {', '.join(INTRO_NAMES)}")

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

            # Detect Chapter 1 intro type (club/makeup/noodles)
            cluster = detect_ch1_intro(chapters)

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

    # Phase 1b: Convert raw distances to per-chapter percentile ranks
    # This makes values comparable across chapters of different lengths
    # (short sections like prologue/part headers no longer dominate)
    print(f"\n  Converting to per-chapter percentile ranks...")
    chapter_sorted_dists = []
    for ci in range(len(CHAPTER_ORDER)):
        sorted_d = sorted(v['distances'][ci] for v in variant_data.values())
        chapter_sorted_dists.append(sorted_d)

    def to_percentile(raw_dist, ci):
        """Convert raw distance to percentile rank [0, 1] within chapter distribution."""
        sorted_d = chapter_sorted_dists[ci]
        n = len(sorted_d)
        if n <= 1:
            return 0.5
        pos = bisect.bisect_right(sorted_d, raw_dist)
        return pos / n

    for vid, vdata in variant_data.items():
        vdata['percentiles'] = []
        for ci in range(len(CHAPTER_ORDER)):
            p = to_percentile(vdata['distances'][ci], ci)
            vdata['percentiles'].append(p)

    # Show percentile stats to verify normalization
    print(f"\n  Percentile statistics per chapter:")
    for ci, chapter_id in enumerate(CHAPTER_ORDER):
        pcts = [v['percentiles'][ci] for v in variant_data.values()]
        avg = sum(pcts) / len(pcts)
        mn = min(pcts)
        mx = max(pcts)
        num_distinct = len(set(round(p, 4) for p in pcts))
        print(f"    {chapter_id:12s}: avg={avg:.3f}, min={mn:.3f}, max={mx:.3f}, distinct={num_distinct}")

    # Phase 2: Identify most discriminating chapters and bundle
    print(f"\nPhase 2 - Selecting {NUM_KEY_CHAPTERS} most discriminating chapters for bundling...")

    # Find chapters with highest percentile variance (most discriminating)
    # This naturally excludes degenerate short sections (part2, part3) that have
    # very few distinct percentile values and near-zero variance
    chapter_scores = []
    for ci, chapter_id in enumerate(CHAPTER_ORDER):
        pcts = [v['percentiles'][ci] for v in variant_data.values()]
        mean_p = sum(pcts) / len(pcts)
        variance = sum((p - mean_p) ** 2 for p in pcts) / len(pcts)
        chapter_scores.append((variance, ci, chapter_id))

    chapter_scores.sort(reverse=True)
    key_chapters = chapter_scores[:NUM_KEY_CHAPTERS]
    key_indices = [ci for _, ci, _ in key_chapters]

    print(f"  Key chapters (by percentile variance):")
    for var, ci, ch in key_chapters:
        print(f"    {ch:12s}: variance={var:.4f}")

    # Bundle by: (intro_cluster, bin_at_key_ch1, bin_at_key_ch2, ...)
    # Then compute mean percentiles for the full 22-chapter path
    print(f"\n  Bundling by Ch1 intro cluster + {NUM_BINS} bins at {NUM_KEY_CHAPTERS} key chapters...")

    bundle_groups = defaultdict(list)

    for variant_id, vdata in variant_data.items():
        key_bins = []
        for ci in key_indices:
            # Percentiles are already [0, 1], bin directly
            bin_idx = min(int(vdata['percentiles'][ci] * NUM_BINS), NUM_BINS - 1)
            key_bins.append(bin_idx)

        key = (vdata['cluster'], tuple(key_bins))
        bundle_groups[key].append(variant_id)

    # Convert to bundle list using mean percentiles across variants in each bundle
    bundles = []
    for (cluster, key_bins), variant_ids in bundle_groups.items():
        # Compute mean percentile at each chapter across all variants in this bundle
        path = []
        for ci in range(len(CHAPTER_ORDER)):
            mean_pct = sum(variant_data[vid]['percentiles'][ci] for vid in variant_ids) / len(variant_ids)
            path.append(round(mean_pct, 4))
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

    # Phase 3: Compute distance profiles for built-in browser versions
    # Only include versions from all_versions.json (the seeds actually loaded in the browser)
    print(f"\nPhase 3 - Computing distance profiles for built-in browser versions...")
    built_in_profiles = {}
    if os.path.isfile(ALL_VERSIONS_FILE):
        with open(ALL_VERSIONS_FILE, 'r', encoding='utf-8') as f:
            all_versions = json.load(f)
        for vid in sorted(all_versions.keys()):
            vdata = all_versions[vid]
            profile = []
            intro = detect_ch1_intro(vdata)
            for chapter_id in CHAPTER_ORDER:
                paras = vdata.get(chapter_id, [])
                chapter_rarity = rarity_lookup.get(chapter_id, {})
                dist = compute_chapter_distance(paras, chapter_rarity, rarity_total)
                profile.append(round(dist, 4))
            built_in_profiles[vid] = profile
            print(f"  {vid} ({INTRO_NAMES[intro]}): avg distance = {sum(profile)/len(profile):.3f}")
        print(f"  Computed profiles for {len(built_in_profiles)} built-in versions")
    else:
        print(f"  Warning: {ALL_VERSIONS_FILE} not found, skipping built-in profiles")

    # Build output
    output = {
        'meta': {
            'total_variants': total_files,
            'chapters': CHAPTER_ORDER,
            'chapter_labels': CHAPTER_LABELS,
            'cluster_names': INTRO_NAMES,
            'num_bins': NUM_BINS,
            'num_bundles': len(bundles),
            'generated': datetime.now().isoformat(),
        },
        'bundles': bundles,
        'built_in_profiles': built_in_profiles,
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
