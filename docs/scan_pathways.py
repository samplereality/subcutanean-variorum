#!/usr/bin/env python3
"""
Scan 10,000 Subcutanean variants to classify key story-state variables
for the Pathway visualization (Sankey/alluvial diagram).

Detects 10 variable groups across the novel's arc, from the chapter 1 intro
through the final fight setting and ending. Produces flow data suitable for
rendering as a node-and-path diagram with ~25 colored seed paths.

Output: docs/extracted_text/pathway_data.json
"""

import json
from pathlib import Path
from collections import Counter

# ══════════════════════════════════════
#  VARIABLE GROUPS (in narrative order)
# ══════════════════════════════════════

# Each group is an ordered list of (key, signal_text) pairs.
# Signal texts are case-sensitive substrings searched in the full variant text.

# Each var is (name, signal_text, chapter_id).
# The 10K scanner searches the whole file; the chapter is used for built-in seed scanning.
GROUPS = [
    {
        "key": "intro",
        "label": "Chapter 1 Intro",
        "vars": [
            ("clubintro",    "I hadn't wanted to go to the club",            "chapter1"),
            ("makeupintro",  "I was on the back porch, looking over the dying", "chapter1"),
            ("noodlesintro", "I was in the kitchen making ramen",            "chapter1"),
        ],
    },
    {
        "key": "phone",
        "label": "The Phone Call",
        "vars": [
            ("dadphone",  "Do you want to talk to your father", "chapter10"),
            ("bradphone", "Do you want to talk to Bradley",     "chapter10"),
        ],
    },
    {
        "key": "rooms",
        "label": "The Rooms",
        "vars": [
            ("empty",     "Some of the rooms seemed like bedrooms", "chapter2"),
            ("furnished", "a piece or two of abandoned furniture",   "chapter1"),
        ],
    },
    {
        "key": "fridge",
        "label": "The Fridge",
        "vars": [
            ("fridgetrapped", "checked my pockets",          "chapter4"),
            ("fridgetunnel",  "pad of yellow sticky notes",  "chapter5"),
        ],
    },
    {
        "key": "memory",
        "label": "The Memory",
        "vars": [
            ("cdrom",   "a CD-ROM adventure set on a space station",       "chapter4"),
            ("gorilla", "I remembered something from a neurobiology class", "chapter9"),
        ],
    },
    {
        "key": "attraction",
        "label": "The Attraction",
        "vars": [
            ("vortex",   "THE VORTEX",                          "chapter6"),
            ("gardens",  "THE ENDLESS GARDENS",                 "chapter6"),
            ("snakeoil", "HENNESON'S MAGICAL TINCTURES",        "chapter6"),
            ("caves",    "gotten lost in an underground cave",  "chapter6"),
        ],
    },
    {
        "key": "hall",
        "label": "The Hall",
        "vars": [
            ("spiralhall", "one long hall that started leaning left",           "chapter8"),
            ("nikofalls",  "the grappling hook ripped through the molding",     "chapter8"),
        ],
    },
    {
        "key": "place",
        "label": "Elder Niko's Place",
        "vars": [
            ("TheCity",     "ten million houses",                  "chapter11"),
            ("TheBasement", "they open up into black empty spaces", "chapter11"),
        ],
    },
    {
        "key": "ff_setting",
        "label": "Final Fight: Setting",
        "vars": [
            ("ffdropoff",  "The door opened onto nothing",                          "chapter14"),
            ("ffthewalls", "Perspectives change. Architecture gets stretched",       "chapter14"),
        ],
    },
    {
        "key": "ending",
        "label": "The Ending",
        "vars": [
            ("gayniko",      "I sometimes saw him looking at me, out of the corner of my eye", "chapter16"),
            ("firmniko",     "dropped his arms to his sides. Fixed me with a look",            "chapter16"),
            ("originalniko", "I lost my grip on the flashlight",                               "chapter4"),
        ],
    },
]

# Human-readable labels for each variable
LABELS = {
    "clubintro": "Club", "makeupintro": "Makeup", "noodlesintro": "Noodles",
    "dadphone": "Dad", "bradphone": "Brad",
    "empty": "Empty", "furnished": "Furnished",
    "fridgetrapped": "Trapped", "fridgetunnel": "Tunnel",
    "cdrom": "CD-ROM", "gorilla": "Gorilla",
    "vortex": "Vortex", "gardens": "Gardens", "snakeoil": "Snake Oil", "caves": "Caves",
    "spiralhall": "Spiral Hall", "nikofalls": "Niko Falls",
    "TheCity": "The City", "TheBasement": "The Basement",
    "ffdropoff": "Endless Dropoff", "ffthewalls": "The Walls",
    "gayniko": "Gay Niko", "firmniko": "Firm Niko", "originalniko": "Original Niko",
}

# Short descriptions for tooltips
DESCRIPTIONS = {
    "clubintro": "Ryan reluctantly goes to a club with Niko",
    "makeupintro": "Niko apologizes to Ryan on the back porch after an argument",
    "noodlesintro": "Ryan is making ramen when Niko arrives",
    "dadphone": "Ryan's dead father impossibly speaks on the phone",
    "bradphone": "Ryan's ex Bradley is at Mom's house, acting like nothing happened",
    "empty": "The underground rooms are all empty",
    "furnished": "A piece or two of dusty, decades-old abandoned furniture",
    "fridgetrapped": "Ryan is trapped — the key is gone",
    "fridgetunnel": "Niko brings sticky notes to mark their way through the tunnel",
    "cdrom": "A hypnotic CD-ROM adventure set on a space station",
    "gorilla": "The invisible gorilla — an attention experiment from class",
    "vortex": "A newspaper ad for 'THE VORTEX' attraction",
    "gardens": "A newspaper ad for 'THE ENDLESS GARDENS'",
    "snakeoil": "A newspaper ad for Dr. Henneson's Magical Tinctures",
    "caves": "A newspaper story about boys lost in an underground cave",
    "spiralhall": "One long hall that leans left — walking on the ceiling",
    "nikofalls": "The grappling hook fails — Niko falls",
    "TheCity": "Elder Niko describes a city of ten million recursive houses",
    "TheBasement": "Elder Niko describes an endless empty basement",
    "ffdropoff": "The floor drops away into blackness",
    "ffthewalls": "Endless walls of pink insulation foam",
    "gayniko": "Romantic tension — Niko looks at Ryan from the corner of his eye",
    "firmniko": "Firm, platonic Niko — drops his arms, fixes Ryan with a look",
    "originalniko": "Ryan survives but wakes in the wrong universe, alone",
}


# ══════════════════════════════════════
#  SCANNING
# ══════════════════════════════════════

def normalize_quotes(text):
    """Normalize smart/curly quotes to ASCII for consistent matching.

    EPUB-extracted text uses typographic quotes (U+2018/2019/201C/201D)
    while the 10K .txt files use straight ASCII quotes.
    """
    return (text
        .replace('\u2018', "'").replace('\u2019', "'")   # smart single quotes
        .replace('\u201c', '"').replace('\u201d', '"')   # smart double quotes
        .replace('\u2014', '—').replace('\u2013', '-'))  # em/en dashes


def scan_variant(filepath):
    """Scan a single variant .txt file for all pathway variables."""
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()

    result = {}
    for group in GROUPS:
        found = None
        for var_name, signal, _chapter in group["vars"]:
            if signal in text:
                found = var_name
                break
        result[group["key"]] = found

    return result


def scan_builtin_seeds(extracted_text_dir):
    """Scan the 25 built-in seeds from their extracted JSON files."""
    all_versions_file = extracted_text_dir / 'all_versions.json'
    if not all_versions_file.exists():
        print("Warning: all_versions.json not found, skipping built-in seeds")
        return []

    with open(all_versions_file, 'r', encoding='utf-8') as f:
        versions = json.load(f)

    builtin = []
    for vid in sorted(versions.keys()):
        v = versions[vid]
        result = {}
        for group in GROUPS:
            for var_name, signal, chapter in group["vars"]:
                text = normalize_quotes(' '.join(v.get(chapter, [])))
                if signal.lower() in text.lower():
                    result[group["key"]] = var_name
                    break

        entry = {"seed": int(vid)}
        for group in GROUPS:
            entry[group["key"]] = result.get(group["key"])
        builtin.append(entry)

    return builtin


def build_flow_links(variants):
    """Build Sankey flow links between adjacent groups.

    Returns a list of {source, target, value} dicts where source/target
    are "groupKey:varName" strings and value is the count of variants
    that follow that path.
    """
    group_keys = [g["key"] for g in GROUPS]
    links = Counter()

    for v in variants:
        for i in range(len(group_keys) - 1):
            src_key = group_keys[i]
            tgt_key = group_keys[i + 1]
            src_val = v.get(src_key)
            tgt_val = v.get(tgt_key)
            if src_val and tgt_val:
                link_key = f"{src_key}:{src_val}|{tgt_key}:{tgt_val}"
                links[link_key] += 1

    result = []
    for link_key, count in links.most_common():
        src, tgt = link_key.split("|")
        result.append({
            "source": src,
            "target": tgt,
            "value": count,
        })

    return result


def main():
    source_dir = Path(__file__).parent.parent / 'sources' / '10k_subcutaneans'
    output_dir = Path(__file__).parent / 'extracted_text'
    output_dir.mkdir(exist_ok=True)

    if not source_dir.exists():
        print(f"Error: {source_dir} not found")
        return

    txt_files = sorted(source_dir.glob('*.txt'))
    print(f"Found {len(txt_files)} variant files")

    group_keys = [g["key"] for g in GROUPS]
    variants = []
    group_counters = {g["key"]: Counter() for g in GROUPS}
    errors = []

    for i, filepath in enumerate(txt_files):
        seed = filepath.stem
        result = scan_variant(filepath)

        # Check for missing detections
        missing = [g for g in group_keys if result[g] is None]
        if missing:
            errors.append({"seed": seed, "missing": missing})

        for gk in group_keys:
            if result[gk]:
                group_counters[gk][result[gk]] += 1

        entry = {"seed": int(seed)}
        for gk in group_keys:
            entry[gk] = result[gk]
        variants.append(entry)

        if (i + 1) % 1000 == 0:
            print(f"  Scanned {i + 1}/{len(txt_files)}...")

    total = len(variants)

    # Build flow links for Sankey
    print("Building flow links...")
    flow_links = build_flow_links(variants)

    # Scan built-in seeds
    builtin_seeds = scan_builtin_seeds(output_dir)
    print(f"Classified {len(builtin_seeds)} built-in seeds")

    # Build output
    output = {
        "total_variants": total,
        "seed_range": [variants[0]["seed"], variants[-1]["seed"]],
        "groups": [],
        "flow_links": flow_links,
        "builtin_seeds": builtin_seeds,
        "variants": variants,
        "errors": errors,
        "labels": LABELS,
        "descriptions": DESCRIPTIONS,
    }

    # Populate group summaries
    for group in GROUPS:
        gk = group["key"]
        group_summary = {
            "key": gk,
            "label": group["label"],
            "variables": [],
        }
        for var_name, _signal, chapter in group["vars"]:
            count = group_counters[gk][var_name]
            group_summary["variables"].append({
                "name": var_name,
                "label": LABELS[var_name],
                "description": DESCRIPTIONS[var_name],
                "chapter": chapter,
                "count": count,
                "percentage": round(count / total * 100, 2) if total > 0 else 0,
            })
        output["groups"].append(group_summary)

    output_file = output_dir / 'pathway_data.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2)

    # ── Print summary ──
    print(f"\n{'='*70}")
    print(f"PATHWAY ANALYSIS — {total} variants")
    print(f"{'='*70}")

    for group in GROUPS:
        gk = group["key"]
        print(f"\n{group['label'].upper()} ({gk}):")
        for var_name, _signal, _chapter in group["vars"]:
            count = group_counters[gk][var_name]
            pct = count / total * 100 if total > 0 else 0
            print(f"  {LABELS[var_name]:20s}  {count:5d}  ({pct:.1f}%)")

    if errors:
        print(f"\n{'='*70}")
        print(f"WARNINGS: {len(errors)} variants with missing detections:")
        for e in errors[:20]:
            print(f"  Seed {e['seed']}: missing {', '.join(e['missing'])}")

    print(f"\nFlow links: {len(flow_links)} unique edges")
    print(f"Output saved to {output_file}")

    # Also write a trimmed version for the web visualization (no per-variant data)
    viz_output = {k: v for k, v in output.items() if k != 'variants'}
    viz_file = output_dir / 'pathway_viz.json'
    with open(viz_file, 'w', encoding='utf-8') as f:
        json.dump(viz_output, f, indent=2)
    print(f"Visualization data saved to {viz_file}")


if __name__ == '__main__':
    main()
