#!/usr/bin/env python3
"""
Calculate Levenshtein distances between all pairs of Subcutanean versions.
This pre-calculates distances for the 25 built-in seeds to avoid runtime computation.
"""

import json
import Levenshtein
from itertools import combinations

# Chapters to include in distance calculation (narrative content only)
CHAPTERS_TO_INCLUDE = [
    'prologue',
    'chapter1', 'chapter2', 'chapter3', 'chapter4', 'chapter5', 'chapter6',
    'chapter7', 'chapter8', 'chapter9', 'chapter10', 'chapter11', 'chapter12',
    'chapter13', 'chapter14', 'chapter15', 'chapter16', 'chapter17', 'chapter18'
]

def get_text_for_version(version_data):
    """
    Concatenate all narrative chapters for a version into a single string.
    Excludes introduction, notes, and part dividers.
    """
    text_parts = []
    for chapter in CHAPTERS_TO_INCLUDE:
        if chapter in version_data:
            # Join paragraphs with space
            chapter_text = ' '.join(version_data[chapter])
            text_parts.append(chapter_text)

    return ' '.join(text_parts)

def calculate_all_distances(versions_data):
    """
    Calculate Levenshtein distance for all pairs of versions.
    Returns a dictionary with keys like "45443-45444" and distance values.
    """
    version_ids = sorted(versions_data.keys())
    distances = {}

    print(f"Calculating distances for {len(version_ids)} versions...")
    print(f"Total pairs to calculate: {len(list(combinations(version_ids, 2)))}")

    # Pre-compute text for all versions
    version_texts = {}
    for vid in version_ids:
        print(f"  Preparing text for seed {vid}...")
        version_texts[vid] = get_text_for_version(versions_data[vid])

    # Calculate distances for all pairs
    pair_count = 0
    total_pairs = len(list(combinations(version_ids, 2)))

    for vid1, vid2 in combinations(version_ids, 2):
        pair_count += 1
        print(f"  Computing distance {pair_count}/{total_pairs}: {vid1} vs {vid2}...")

        text1 = version_texts[vid1]
        text2 = version_texts[vid2]

        # Calculate Levenshtein distance
        distance = Levenshtein.distance(text1, text2)

        # Store with consistent key ordering (lower id first)
        key = f"{vid1}-{vid2}"
        distances[key] = distance

    return distances

def find_extremes(distances):
    """Find the most similar and most different pairs."""
    if not distances:
        return None, None

    min_pair = min(distances.items(), key=lambda x: x[1])
    max_pair = max(distances.items(), key=lambda x: x[1])

    return {
        'pair': min_pair[0],
        'distance': min_pair[1]
    }, {
        'pair': max_pair[0],
        'distance': max_pair[1]
    }

def main():
    print("Loading all_versions.json...")
    with open('extracted_text/all_versions.json', 'r', encoding='utf-8') as f:
        versions_data = json.load(f)

    print(f"Found {len(versions_data)} versions\n")

    # Calculate all pairwise distances
    distances = calculate_all_distances(versions_data)

    # Find extremes
    most_similar, most_different = find_extremes(distances)

    print("\n" + "="*60)
    print("RESULTS:")
    print("="*60)
    print(f"Most Similar: Seeds {most_similar['pair']} (distance: {most_similar['distance']:,})")
    print(f"Most Different: Seeds {most_different['pair']} (distance: {most_different['distance']:,})")
    print("="*60 + "\n")

    # Prepare output data
    output = {
        'most_similar': most_similar,
        'most_different': most_different,
        'all_distances': distances,
        'version_ids': sorted(versions_data.keys()),
        'chapters_included': CHAPTERS_TO_INCLUDE
    }

    # Save to JSON
    output_file = 'extracted_text/levenshtein_distances.json'
    print(f"Saving results to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2)

    print("Done!")

if __name__ == '__main__':
    main()
