#!/usr/bin/env python3
"""
Build hyperspace fly-through data from Subcutanean text variants.

Samples 1000 of the 10K variants, aligns each against a reference seed,
identifies variation points where text diverges, extracts distinct text
alternatives, and outputs a compact JSON for the Three.js visualization.

Usage:
    python build_hyperspace.py

Output: docs/extracted_text/hyperspace_data.json
"""

import json
import math
import os
import random
import re
import sys
from collections import defaultdict
from datetime import datetime
from difflib import SequenceMatcher

# Import shared utilities
from build_rarity_scores import (
    VARIANTS_DIR,
    parse_txt_file,
    normalize_paragraph,
    hash_paragraph,
)

# ── Constants ──

SAMPLE_SIZE = 1000
RANDOM_SEED = 42
SNIPPET_MAX = 120  # max chars for variant text snippets
MAX_VARIANTS_PER_VP = 10  # cap distinct variants shown per variation point

CHAPTER_ORDER = [
    'prologue', 'chapter1', 'chapter2', 'chapter3', 'chapter4',
    'chapter5', 'chapter6', 'chapter7', 'chapter8', 'chapter9',
    'part2', 'chapter10', 'chapter11', 'chapter12', 'chapter13',
    'chapter14', 'chapter15', 'part3', 'chapter16', 'chapter17',
    'chapter18', 'notes'
]

CHAPTER_LABELS = {
    'prologue': 'Prologue', 'chapter1': 'Chapter 1', 'chapter2': 'Chapter 2',
    'chapter3': 'Chapter 3', 'chapter4': 'Chapter 4', 'chapter5': 'Chapter 5',
    'chapter6': 'Chapter 6', 'chapter7': 'Chapter 7', 'chapter8': 'Chapter 8',
    'chapter9': 'Chapter 9', 'part2': 'Part II', 'chapter10': 'Chapter 10',
    'chapter11': 'Chapter 11', 'chapter12': 'Chapter 12', 'chapter13': 'Chapter 13',
    'chapter14': 'Chapter 14', 'chapter15': 'Chapter 15', 'part3': 'Part III',
    'chapter16': 'Chapter 16', 'chapter17': 'Chapter 17', 'chapter18': 'Epilogue',
    'notes': 'Notes'
}

EXTRACTED_DIR = os.path.join(os.path.dirname(__file__), 'extracted_text')
OUTPUT_FILE = os.path.join(EXTRACTED_DIR, 'hyperspace_data.json')
PATHWAY_FILE = os.path.join(EXTRACTED_DIR, 'pathway_data.json')
ALL_VERSIONS_FILE = os.path.join(EXTRACTED_DIR, 'all_versions.json')


# ── Phase 1: Stratified sampling ──

def sample_seeds():
    """Sample 1000 seeds from 10K using stratified sampling by (intro, phone)."""
    print("Phase 1: Sampling seeds...")

    # Load pathway data for stratification
    with open(PATHWAY_FILE, 'r', encoding='utf-8') as f:
        pathway_data = json.load(f)

    # Build seed → category lookup
    seed_categories = {}
    for v in pathway_data['variants']:
        seed_categories[v['seed']] = v

    # Get built-in seeds
    builtin_seeds = set()
    for v in pathway_data['builtin_seeds']:
        builtin_seeds.add(v['seed'])
        seed_categories[v['seed']] = v

    # Group 10K seeds by (intro, phone) strata
    strata = defaultdict(list)
    for v in pathway_data['variants']:
        key = (v['intro'], v['phone'])
        strata[key].append(v['seed'])

    print(f"  Strata: {len(strata)} groups")
    for key, seeds in sorted(strata.items()):
        print(f"    {key}: {len(seeds)} seeds")

    # Sample proportionally from each stratum
    random.seed(RANDOM_SEED)
    sampled = set(builtin_seeds)  # always include built-in seeds
    remaining_quota = SAMPLE_SIZE - len(sampled)

    # Calculate proportional allocation
    total_10k = sum(len(s) for s in strata.values())
    for key, seeds in sorted(strata.items()):
        quota = max(1, round(len(seeds) / total_10k * remaining_quota))
        available = [s for s in seeds if s not in sampled]
        chosen = random.sample(available, min(quota, len(available)))
        sampled.update(chosen)

    # If we're short, fill randomly
    all_10k_seeds = [v['seed'] for v in pathway_data['variants']]
    while len(sampled) < SAMPLE_SIZE:
        s = random.choice(all_10k_seeds)
        sampled.add(s)

    # If we're over, trim (non-builtin only)
    sampled_list = sorted(sampled)
    if len(sampled_list) > SAMPLE_SIZE:
        non_builtin = [s for s in sampled_list if s not in builtin_seeds]
        random.shuffle(non_builtin)
        keep = set(builtin_seeds) | set(non_builtin[:SAMPLE_SIZE - len(builtin_seeds)])
        sampled_list = sorted(keep)

    print(f"  Sampled {len(sampled_list)} seeds ({len(builtin_seeds)} built-in)")

    # Build category data for output
    categories = {}
    for seed in sampled_list:
        cat = seed_categories.get(seed, {})
        categories[seed] = cat

    return sampled_list, categories, builtin_seeds


# ── Phase 2: Parse texts ──

def load_texts(sampled_seeds, builtin_seeds):
    """Load and parse texts for all sampled seeds."""
    print("Phase 2: Loading texts...")

    # Load built-in seeds from all_versions.json
    builtin_texts = {}
    if os.path.exists(ALL_VERSIONS_FILE):
        with open(ALL_VERSIONS_FILE, 'r', encoding='utf-8') as f:
            all_versions = json.load(f)
        for vid, vdata in all_versions.items():
            seed = int(vid)
            if seed in builtin_seeds:
                chapters = {}
                for chapter_id in CHAPTER_ORDER:
                    if chapter_id in vdata:
                        paras = vdata[chapter_id]
                        # Strip HTML tags (built-in data has HTML formatting)
                        cleaned = []
                        for p in paras:
                            p = re.sub(r'<[^>]+>', '', p)
                            p = p.strip()
                            if p:
                                cleaned.append(p)
                        chapters[chapter_id] = cleaned
                builtin_texts[seed] = chapters
        print(f"  Loaded {len(builtin_texts)} built-in seed texts")

    # Load 10K variant texts from .txt files
    texts = {}
    file_count = 0
    for seed in sampled_seeds:
        if seed in builtin_texts:
            texts[seed] = builtin_texts[seed]
            continue

        filepath = os.path.join(VARIANTS_DIR, f'{seed}.txt')
        if not os.path.exists(filepath):
            print(f"  Warning: {filepath} not found, skipping seed {seed}")
            continue

        chapters = parse_txt_file(filepath)
        texts[seed] = chapters
        file_count += 1
        if file_count % 200 == 0:
            print(f"  Parsed {file_count} txt files...")

    print(f"  Loaded {len(texts)} total texts ({file_count} from txt files)")
    return texts


# ── Phase 3: Hash paragraphs & detect variation points ──

def hash_all_paragraphs(texts, sampled_seeds):
    """Hash all paragraphs for all seeds, organized by chapter."""
    print("Phase 3: Hashing paragraphs...")

    # chapter_id → seed_idx → [hashes]
    chapter_hashes = {}
    # chapter_id → seed_idx → [raw paragraphs]
    chapter_paras = {}

    for chapter_id in CHAPTER_ORDER:
        hashes_by_seed = []
        paras_by_seed = []
        for seed in sampled_seeds:
            seed_chapters = texts.get(seed, {})
            paras = seed_chapters.get(chapter_id, [])
            h_list = []
            for p in paras:
                norm = normalize_paragraph(p)
                if len(norm) < 10:
                    h_list.append('_short_')  # placeholder for very short paras
                else:
                    h_list.append(hash_paragraph(norm))
            hashes_by_seed.append(h_list)
            paras_by_seed.append(paras)
        chapter_hashes[chapter_id] = hashes_by_seed
        chapter_paras[chapter_id] = paras_by_seed

    total_paras = sum(
        len(chapter_hashes[ch][0])
        for ch in CHAPTER_ORDER
        if chapter_hashes[ch] and chapter_hashes[ch][0]
    )
    print(f"  Reference seed has {total_paras} paragraphs total")

    return chapter_hashes, chapter_paras


def detect_variation_regions(chapter_hashes, sampled_seeds):
    """Align each seed against reference and find variation regions."""
    print("Phase 4: Aligning seeds against reference...")

    ref_idx = 0  # first seed is the reference
    n_seeds = len(sampled_seeds)

    # chapter_id → list of (ref_start, ref_end, seed_idx, other_start, other_end, tag)
    all_regions = defaultdict(list)
    alignment_count = 0

    for seed_idx in range(1, n_seeds):
        if (seed_idx) % 200 == 0:
            print(f"  Aligned {seed_idx}/{n_seeds - 1} seeds...")

        for chapter_id in CHAPTER_ORDER:
            ref_hashes = chapter_hashes[chapter_id][ref_idx]
            other_hashes = chapter_hashes[chapter_id][seed_idx]

            if not ref_hashes and not other_hashes:
                continue

            sm = SequenceMatcher(None, ref_hashes, other_hashes, autojunk=False)
            for tag, i1, i2, j1, j2 in sm.get_opcodes():
                if tag != 'equal':
                    all_regions[chapter_id].append((i1, i2, seed_idx, j1, j2, tag))
                    alignment_count += 1

    print(f"  Found {alignment_count} variation regions across all alignments")
    return all_regions


def merge_variation_regions(all_regions):
    """Merge overlapping variation regions into canonical variation points."""
    print("Phase 5: Merging variation regions into variation points...")

    variation_points = []  # list of (chapter_id, ref_start, ref_end)

    for chapter_id in CHAPTER_ORDER:
        regions = all_regions.get(chapter_id, [])
        if not regions:
            continue

        # Collect all reference ranges that have any variation
        ref_ranges = set()
        for (i1, i2, seed_idx, j1, j2, tag) in regions:
            for i in range(i1, max(i2, i1 + 1)):
                ref_ranges.add(i)

        if not ref_ranges:
            continue

        # Merge contiguous ref positions into spans
        sorted_positions = sorted(ref_ranges)
        spans = []
        span_start = sorted_positions[0]
        span_end = sorted_positions[0]

        for pos in sorted_positions[1:]:
            if pos <= span_end + 1:
                span_end = pos
            else:
                spans.append((span_start, span_end + 1))
                span_start = pos
                span_end = pos
        spans.append((span_start, span_end + 1))

        for (start, end) in spans:
            variation_points.append((chapter_id, start, end))

    print(f"  {len(variation_points)} canonical variation points")
    return variation_points


# ── Phase 4: Extract distinct text variants ──

def extract_variants(variation_points, chapter_hashes, chapter_paras, sampled_seeds):
    """For each variation point, extract the distinct text variants and assignments."""
    print("Phase 6: Extracting distinct text variants...")

    n_seeds = len(sampled_seeds)
    ref_idx = 0
    results = []

    for vp_idx, (chapter_id, ref_start, ref_end) in enumerate(variation_points):
        # For each seed, get the text at this variation point
        # We need to re-align to find what each seed has at this ref position
        ref_hashes = chapter_hashes[chapter_id][ref_idx]
        ref_paras = chapter_paras[chapter_id][ref_idx]

        # Get reference text
        ref_text_parts = ref_paras[ref_start:ref_end]
        ref_text = ' '.join(ref_text_parts).strip()

        # For each seed, find what they have at this position
        seed_texts = {}
        seed_texts[0] = ref_text  # reference seed

        for seed_idx in range(1, n_seeds):
            other_hashes = chapter_hashes[chapter_id][seed_idx]
            other_paras = chapter_paras[chapter_id][seed_idx]

            if not other_hashes:
                seed_texts[seed_idx] = ''
                continue

            # Quick check: if ref hashes at this range match other at same range
            # (optimization: avoid SequenceMatcher for seeds identical to ref here)
            if (ref_start < len(other_hashes) and ref_end <= len(other_hashes) and
                    ref_hashes[ref_start:ref_end] == other_hashes[ref_start:ref_end]):
                seed_texts[seed_idx] = ' '.join(other_paras[ref_start:ref_end]).strip()
                continue

            # Need to align to find corresponding position
            sm = SequenceMatcher(None, ref_hashes, other_hashes, autojunk=False)
            # Find what maps to the ref_start:ref_end range
            other_text_parts = []
            for tag, i1, i2, j1, j2 in sm.get_opcodes():
                # Check if this opcode overlaps with our ref range
                overlap_start = max(i1, ref_start)
                overlap_end = min(i2, ref_end)
                if overlap_start < overlap_end:
                    if tag == 'equal':
                        # Same text — use the corresponding other paragraphs
                        offset = overlap_start - i1
                        count = overlap_end - overlap_start
                        other_text_parts.extend(other_paras[j1 + offset:j1 + offset + count])
                    elif tag == 'replace':
                        # Different text — use what the other seed has
                        other_text_parts.extend(other_paras[j1:j2])
                    elif tag == 'delete':
                        # Ref has text, other doesn't
                        pass  # nothing to add
                elif tag == 'insert' and i1 >= ref_start and i1 <= ref_end:
                    # Other has extra text at this position
                    other_text_parts.extend(other_paras[j1:j2])

            seed_texts[seed_idx] = ' '.join(other_text_parts).strip()

        # Group seeds by normalized text hash
        text_groups = defaultdict(list)
        group_texts = {}  # hash → representative text
        for seed_idx, text in seed_texts.items():
            norm = normalize_paragraph(text) if text else ''
            h = hash_paragraph(norm) if norm else '_empty_'
            text_groups[h].append(seed_idx)
            if h not in group_texts:
                group_texts[h] = text

        # Build variant list, sorted by count (most common first)
        all_variants = []
        for h, seed_indices in sorted(text_groups.items(), key=lambda x: -len(x[1])):
            text = group_texts[h]
            # Truncate long text to a readable snippet
            if len(text) > SNIPPET_MAX:
                # Try to break at a word boundary
                truncated = text[:SNIPPET_MAX]
                last_space = truncated.rfind(' ')
                if last_space > SNIPPET_MAX * 0.7:
                    truncated = truncated[:last_space]
                text = truncated + '...'
            all_variants.append({
                'text': text,
                'seed_indices': seed_indices,
            })

        # Cap variants: keep top N most common, merge the rest into
        # the closest common variant (by seed count).
        if len(all_variants) > MAX_VARIANTS_PER_VP:
            kept = all_variants[:MAX_VARIANTS_PER_VP]
            overflow = all_variants[MAX_VARIANTS_PER_VP:]
            # Merge overflow seeds into the last kept variant
            # (these are the rarest micro-variations)
            for ov in overflow:
                kept[-1]['seed_indices'].extend(ov['seed_indices'])
            variants = kept
        else:
            variants = all_variants

        # Compute significance BEFORE capping (use all_variants for accuracy)
        # breadth: what fraction differs from the most common variant
        most_common_count = max(len(v['seed_indices']) for v in all_variants)
        breadth = 1.0 - (most_common_count / n_seeds)
        # diversity: how many distinct variants (original count)
        diversity = min(math.log2(len(all_variants) + 1) / 4, 1.0)
        # length: average word count of variant texts
        avg_words = sum(len(v['text'].split()) for v in all_variants) / len(all_variants)
        length = min(math.log2(avg_words + 1) / 6, 1.0)
        significance = 0.4 * breadth + 0.3 * diversity + 0.3 * length

        # Build assignment string: seed_idx → variant index
        assignment = ['a'] * n_seeds
        for vi, variant in enumerate(variants):
            char = chr(97 + vi)  # a, b, c, ...
            for seed_idx in variant['seed_indices']:
                assignment[seed_idx] = char
        assignment_str = ''.join(assignment)

        # Clean up variant data (remove seed_indices, keep only text)
        clean_variants = [{'text': v['text']} for v in variants]

        results.append({
            'chapter_id': chapter_id,
            'ref_start': ref_start,
            'ref_end': ref_end,
            'variants': clean_variants,
            'assignment': assignment_str,
            'significance': round(significance, 3),
            'variant_count': len(variants),
        })

        if (vp_idx + 1) % 100 == 0:
            print(f"  Processed {vp_idx + 1}/{len(variation_points)} variation points...")

    print(f"  Extracted variants for {len(results)} variation points")

    # Stats
    sig_values = [r['significance'] for r in results]
    var_counts = [r['variant_count'] for r in results]
    print(f"  Significance: min={min(sig_values):.3f}, max={max(sig_values):.3f}, "
          f"mean={sum(sig_values)/len(sig_values):.3f}")
    print(f"  Variants per point: min={min(var_counts)}, max={max(var_counts)}, "
          f"mean={sum(var_counts)/len(var_counts):.1f}")

    return results


# ── Phase 6: Build output ──

def build_output(results, sampled_seeds, categories, builtin_seeds, chapter_paras):
    """Assemble the final JSON output."""
    print("Phase 7: Building output...")

    ref_idx = 0

    # Compute chapter paragraph counts (for position normalization)
    chapter_para_counts = {}
    for chapter_id in CHAPTER_ORDER:
        paras = chapter_paras[chapter_id][ref_idx] if chapter_paras[chapter_id] else []
        chapter_para_counts[chapter_id] = len(paras)

    total_paras = sum(chapter_para_counts.values())

    # Compute chapter positions (cumulative fraction of total paragraphs)
    chapter_positions = {}
    cumulative = 0
    for chapter_id in CHAPTER_ORDER:
        chapter_positions[chapter_id] = cumulative / total_paras if total_paras > 0 else 0
        cumulative += chapter_para_counts[chapter_id]

    # Compute narrative position for each variation point
    for result in results:
        chapter_id = result['chapter_id']
        ch_start = chapter_positions[chapter_id]
        ch_count = chapter_para_counts[chapter_id]
        if ch_count > 0:
            within_chapter = result['ref_start'] / ch_count
        else:
            within_chapter = 0
        ch_weight = ch_count / total_paras if total_paras > 0 else 0
        result['pos'] = round(ch_start + within_chapter * ch_weight, 5)

    # Sort by position
    results.sort(key=lambda r: r['pos'])

    # Build chapter info
    chapters = []
    for chapter_id in CHAPTER_ORDER:
        chapters.append({
            'id': chapter_id,
            'label': CHAPTER_LABELS.get(chapter_id, chapter_id),
            'position': round(chapter_positions[chapter_id], 5),
        })

    # Build variation_points array (compact)
    chapter_idx_lookup = {ch: i for i, ch in enumerate(CHAPTER_ORDER)}
    variation_points = []
    for r in results:
        variation_points.append({
            'pos': r['pos'],
            'ch': chapter_idx_lookup[r['chapter_id']],
            'sig': r['significance'],
            'variants': r['variants'],
            'a': r['assignment'],
        })

    # Find built-in seed indices
    builtin_indices = []
    for i, seed in enumerate(sampled_seeds):
        if seed in builtin_seeds:
            builtin_indices.append(i)

    output = {
        'meta': {
            'total_sampled': len(sampled_seeds),
            'total_variants': 10000,
            'reference_seed_idx': 0,
            'num_variation_points': len(variation_points),
            'generated': datetime.now().isoformat(),
        },
        'seeds': sampled_seeds,
        'chapters': chapters,
        'variation_points': variation_points,
        'builtin_indices': builtin_indices,
    }

    # Write output
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False)

    size_mb = os.path.getsize(OUTPUT_FILE) / (1024 * 1024)
    print(f"\n  Output: {OUTPUT_FILE}")
    print(f"  Size: {size_mb:.1f} MB")
    print(f"  Seeds: {len(sampled_seeds)}")
    print(f"  Variation points: {len(variation_points)}")
    print(f"  Built-in seed indices: {builtin_indices}")


def main():
    if not os.path.isdir(VARIANTS_DIR):
        print(f"Error: {VARIANTS_DIR} not found")
        sys.exit(1)

    if not os.path.exists(PATHWAY_FILE):
        print(f"Error: {PATHWAY_FILE} not found")
        sys.exit(1)

    sampled_seeds, categories, builtin_seeds = sample_seeds()

    texts = load_texts(sampled_seeds, builtin_seeds)

    # Filter to seeds we actually loaded
    loaded_seeds = [s for s in sampled_seeds if s in texts]
    if len(loaded_seeds) < len(sampled_seeds):
        print(f"  Warning: only loaded {len(loaded_seeds)}/{len(sampled_seeds)} seeds")
        sampled_seeds = loaded_seeds

    chapter_hashes, chapter_paras = hash_all_paragraphs(texts, sampled_seeds)

    all_regions = detect_variation_regions(chapter_hashes, sampled_seeds)

    vp_list = merge_variation_regions(all_regions)

    results = extract_variants(vp_list, chapter_hashes, chapter_paras, sampled_seeds)

    build_output(results, sampled_seeds, categories, builtin_seeds, chapter_paras)

    print("\nDone!")


if __name__ == '__main__':
    main()
