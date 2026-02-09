#!/usr/bin/env python3
"""
Build barcode visualization data from 10,000 Subcutanean text variants.

For each variant at each chapter, computes a per-paragraph rarity grade
(0=universal through 5=ultra-rare). Variants with identical grade sequences
are grouped together, producing compact barcode stripes for the browser to
render as a DNA-gel-style canvas visualization.

Outputs per-chapter JSON files (loaded on demand by the browser) plus a
meta file with chapter statistics.

Usage:
    python build_barcode_data.py
"""

import json
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

from build_tapestry_data import (
    load_rarity_lookup,
    load_prologue_clusters,
    compute_prologue_fingerprint,
)

RARITY_FILE = os.path.join(os.path.dirname(__file__), 'extracted_text', 'rarity_scores.json')
ALLUVIAL_FILE = os.path.join(os.path.dirname(__file__), 'extracted_text', 'alluvial_data.json')
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'extracted_text')

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

GRADE_LABELS = ["Universal", "Common", "Uncommon", "Rare", "Very rare", "Ultra rare"]

# Grade characters: '0'-'5' for grades, '.' for absent paragraphs
GRADE_CHARS = '012345'
ABSENT_CHAR = '.'


def compute_grade(count, total):
    """Assign a rarity grade (0-5) based on paragraph prevalence."""
    fraction = count / total
    if fraction >= 0.90:
        return 0  # Universal
    if fraction >= 0.50:
        return 1  # Common
    if fraction >= 0.20:
        return 2  # Uncommon
    if fraction >= 0.05:
        return 3  # Rare
    if fraction >= 0.01:
        return 4  # Very rare
    return 5      # Ultra rare


def grades_to_string(grades, max_length):
    """Encode grade list as a compact string. Pads with '.' for absent paragraphs."""
    chars = []
    for g in grades:
        chars.append(GRADE_CHARS[g] if 0 <= g <= 5 else ABSENT_CHAR)
    # Pad to max_length
    while len(chars) < max_length:
        chars.append(ABSENT_CHAR)
    return ''.join(chars)


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

    # Phase 1: Compute per-paragraph grades for each variant
    print(f"\nPhase 1 - Computing paragraph-level rarity grades...")

    variant_data = {}
    errors = 0
    max_paragraphs = {ch: 0 for ch in CHAPTER_ORDER}

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

            # Compute grades per chapter
            chapter_grades = {}
            for chapter_id in CHAPTER_ORDER:
                chapter_rarity = rarity_lookup.get(chapter_id, {})
                paras = chapters.get(chapter_id, [])

                grades = []
                for para in paras:
                    normalized = normalize_paragraph(para)
                    if len(normalized) < 10:
                        continue
                    h = hash_paragraph(normalized)
                    count = chapter_rarity.get(h, 1)
                    grades.append(compute_grade(count, rarity_total))

                chapter_grades[chapter_id] = grades
                if len(grades) > max_paragraphs[chapter_id]:
                    max_paragraphs[chapter_id] = len(grades)

            variant_data[variant_id] = {
                'cluster': cluster,
                'chapters': chapter_grades,
            }

        except Exception as e:
            errors += 1
            if errors <= 10:
                print(f"  Warning: Error processing {filename}: {e}")

    print(f"\n  Phase 1 complete: {len(variant_data)} variants ({errors} errors)")
    print(f"\n  Max paragraphs per chapter:")
    for ch in CHAPTER_ORDER:
        print(f"    {ch:12s}: {max_paragraphs[ch]}")

    # Phase 2: Group variants and write per-chapter files
    print(f"\nPhase 2 - Grouping and writing per-chapter files...")

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    chapter_stats = {}
    total_size = 0

    for chapter_id in CHAPTER_ORDER:
        max_paras = max_paragraphs[chapter_id]

        if max_paras == 0:
            chapter_stats[chapter_id] = {'max_paragraphs': 0, 'num_groups': 0}
            continue

        # Group by grade sequence string
        sequence_groups = defaultdict(list)
        for variant_id, vdata in variant_data.items():
            grades = vdata['chapters'].get(chapter_id, [])
            grade_str = grades_to_string(grades, max_paras)
            sequence_groups[grade_str].append(variant_id)

        # Build compact group list
        groups = []
        for grade_str, variant_ids in sequence_groups.items():
            # Most common cluster among the group's variants
            cluster_counts = defaultdict(int)
            for vid in variant_ids:
                cluster_counts[variant_data[vid]['cluster']] += 1
            cluster = max(cluster_counts, key=cluster_counts.get)

            groups.append({
                'c': len(variant_ids),
                'k': cluster,
                'g': grade_str,
            })

        # Sort lexicographically by grade string
        groups.sort(key=lambda g: g['g'])

        # Write per-chapter file
        chapter_output = {
            'max_paragraphs': max_paras,
            'groups': groups,
        }

        chapter_file = os.path.join(OUTPUT_DIR, f'barcode_ch_{chapter_id}.json')
        with open(chapter_file, 'w', encoding='utf-8') as f:
            json.dump(chapter_output, f, separators=(',', ':'), ensure_ascii=False)

        file_size = os.path.getsize(chapter_file)
        total_size += file_size

        chapter_stats[chapter_id] = {
            'max_paragraphs': max_paras,
            'num_groups': len(groups),
        }

        print(f"  {chapter_id:12s}: {max_paras:3d} paragraphs, "
              f"{len(groups):5d} groups, {file_size / 1024:.0f} KB")

    # Write meta file
    meta_output = {
        'meta': {
            'total_variants': total_files,
            'chapters': CHAPTER_ORDER,
            'chapter_labels': CHAPTER_LABELS,
            'grade_labels': GRADE_LABELS,
            'generated': datetime.now().isoformat(),
        },
        'chapter_stats': chapter_stats,
    }

    meta_file = os.path.join(OUTPUT_DIR, 'barcode_meta.json')
    with open(meta_file, 'w', encoding='utf-8') as f:
        json.dump(meta_output, f, indent=2, ensure_ascii=False)

    total_size += os.path.getsize(meta_file)

    print(f"\nDone!")
    print(f"  Meta file: {meta_file}")
    print(f"  Chapter files: barcode_ch_*.json")
    print(f"  Total size: {total_size / 1024 / 1024:.1f} MB")
    total_groups = sum(s['num_groups'] for s in chapter_stats.values())
    print(f"  Total groups: {total_groups}")


if __name__ == '__main__':
    main()
