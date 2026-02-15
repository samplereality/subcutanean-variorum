#!/usr/bin/env python3
"""
Scan 10,000 Subcutanean variants to classify final fight variable combinations.

Uses signal text from macro_signals.json to detect which of the 7 final fight
variables are active in each variant.

Output: docs/extracted_text/ff_combinations.json
"""

import json
import os
from pathlib import Path
from collections import Counter

# Signal texts for each final fight variable (from macro_signals.json)
FF_SIGNALS = {
    # Group 1: Setting (mutually exclusive)
    "ffdropoff": "The door opened onto nothing",
    "ffthewalls": "Perspectives change. Architecture gets stretched",

    # Group 2: Physics (mutually exclusive)
    "fftubeweird": "forty-five-degree angle",
    "fftube": "skydived or bungee",
    "ffset": "dangled thirty or forty",

    # Group 3: Obstacle (mutually exclusive)
    "ffchandelier": "a filigreed structure",
    "ffbookshelves": "mountain of books",
}

GROUPS = {
    "setting": ["ffdropoff", "ffthewalls"],
    "physics": ["fftubeweird", "fftube", "ffset"],
    "obstacle": ["ffchandelier", "ffbookshelves"],
}

# Human-readable labels
LABELS = {
    "ffdropoff": "Endless Dropoff",
    "ffthewalls": "The Walls",
    "fftubeweird": "Broken Physics",
    "fftube": "Climbing Gym",
    "ffset": "Suspended Set",
    "ffchandelier": "Chandelier",
    "ffbookshelves": "Bookshelves",
}

DESCRIPTIONS = {
    "ffdropoff": "The floor drops away into blackness — an endless void beneath",
    "ffthewalls": "Endless walls of pink insulation foam stretch into the gloom",
    "fftubeweird": "Gravity breaks down — furniture shifts at impossible angles",
    "fftube": "A surreal climbing gym — Niko maps parkour routes up the cylinder",
    "ffset": "A giant bedroom set suspended on a platform over the void",
    "ffchandelier": "A massive crystal chandelier becomes anchor and salvation",
    "ffbookshelves": "A mountain of cascading books — avalanche and pathway at once",
}


def scan_variant(filepath):
    """Scan a single variant file for final fight variables."""
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()

    result = {}
    for group_name, variables in GROUPS.items():
        found = None
        for var in variables:
            signal = FF_SIGNALS[var]
            if signal in text:
                found = var
                break
        result[group_name] = found

    return result


def scan_builtin_seeds(extracted_text_dir):
    """Scan the 25 built-in seeds from their extracted JSON files."""
    all_versions_file = extracted_text_dir / 'all_versions.json'
    if not all_versions_file.exists():
        print("Warning: all_versions.json not found, skipping built-in seeds")
        return []

    with open(all_versions_file, 'r', encoding='utf-8') as f:
        versions = json.load(f)

    # Chapter mapping for signal lookups
    ff_chapters = {
        "ffdropoff": "chapter14",
        "ffthewalls": "chapter14",
        "fftubeweird": "chapter15",
        "fftube": "chapter15",
        "ffset": "chapter15",
        "ffchandelier": "chapter14",
        "ffbookshelves": "chapter14",
    }

    builtin = []
    for vid in sorted(versions.keys()):
        v = versions[vid]
        result = {}
        for group_name, variables in GROUPS.items():
            for var in variables:
                chapter = ff_chapters[var]
                text = ' '.join(v.get(chapter, []))
                if FF_SIGNALS[var].lower() in text.lower():
                    result[group_name] = var
                    break

        builtin.append({
            "seed": int(vid),
            "setting": result.get("setting"),
            "physics": result.get("physics"),
            "obstacle": result.get("obstacle"),
        })

    return builtin


def main():
    source_dir = Path(__file__).parent.parent / 'sources' / '10k_subcutaneans'
    output_dir = Path(__file__).parent / 'extracted_text'
    output_dir.mkdir(exist_ok=True)

    if not source_dir.exists():
        print(f"Error: {source_dir} not found")
        return

    txt_files = sorted(source_dir.glob('*.txt'))
    print(f"Found {len(txt_files)} variant files")

    variants = []
    combo_counter = Counter()
    group_counters = {g: Counter() for g in GROUPS}
    errors = []

    for i, filepath in enumerate(txt_files):
        seed = filepath.stem
        result = scan_variant(filepath)

        # Check for missing detections
        missing = [g for g, v in result.items() if v is None]
        if missing:
            errors.append({"seed": seed, "missing": missing})

        combo_key = f"{result['setting']}|{result['physics']}|{result['obstacle']}"
        combo_counter[combo_key] += 1

        for group_name, var in result.items():
            if var:
                group_counters[group_name][var] += 1

        variants.append({
            "seed": int(seed),
            "setting": result["setting"],
            "physics": result["physics"],
            "obstacle": result["obstacle"],
        })

        if (i + 1) % 1000 == 0:
            print(f"  Scanned {i + 1}/{len(txt_files)}...")

    # Build combination summary
    combinations = []
    for combo_key, count in combo_counter.most_common():
        parts = combo_key.split('|')
        combinations.append({
            "setting": parts[0],
            "physics": parts[1],
            "obstacle": parts[2],
            "count": count,
            "percentage": round(count / len(variants) * 100, 2),
        })

    # Scan built-in seeds
    builtin_seeds = scan_builtin_seeds(output_dir)
    print(f"Classified {len(builtin_seeds)} built-in seeds")

    output = {
        "total_variants": len(variants),
        "seed_range": [variants[0]["seed"], variants[-1]["seed"]],
        "groups": {
            group_name: {
                "label": group_name.title(),
                "variables": {
                    var: {
                        "label": LABELS[var],
                        "description": DESCRIPTIONS[var],
                        "count": group_counters[group_name][var],
                        "percentage": round(group_counters[group_name][var] / len(variants) * 100, 2),
                    }
                    for var in variables
                }
            }
            for group_name, variables in GROUPS.items()
        },
        "combinations": combinations,
        "builtin_seeds": builtin_seeds,
        "variants": variants,
        "errors": errors,
        "labels": LABELS,
        "descriptions": DESCRIPTIONS,
    }

    output_file = output_dir / 'ff_combinations.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2)

    # Print summary
    print(f"\n{'='*60}")
    print(f"FINAL FIGHT ANALYSIS — {len(variants)} variants")
    print(f"{'='*60}")

    for group_name, variables in GROUPS.items():
        print(f"\n{group_name.upper()}:")
        for var in variables:
            count = group_counters[group_name][var]
            pct = count / len(variants) * 100
            print(f"  {LABELS[var]:20s}  {count:5d}  ({pct:.1f}%)")

    print(f"\n{'='*60}")
    print(f"COMBINATIONS (12 possible):")
    print(f"{'='*60}")
    for combo in combinations:
        s = LABELS.get(combo['setting'], '?')
        p = LABELS.get(combo['physics'], '?')
        o = LABELS.get(combo['obstacle'], '?')
        print(f"  {s:16s} + {p:16s} + {o:16s}  {combo['count']:5d}  ({combo['percentage']:.1f}%)")

    if errors:
        print(f"\nWARNINGS: {len(errors)} variants with missing detections:")
        for e in errors[:10]:
            print(f"  Seed {e['seed']}: missing {', '.join(e['missing'])}")

    print(f"\nOutput saved to {output_file}")


if __name__ == '__main__':
    main()
