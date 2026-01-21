#!/usr/bin/env python3
"""
Parse seed generation output and add variables to version JSON files.

Expects input file with blocks like:
*** makeBook 90000 ****************************
Reading manifest...
...
vars: ['alcohol', 'alliteration', ...]
"""

import json
import re
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
EXTRACTED_DIR = BASE_DIR / "extracted_text"


def parse_generation_log(log_path):
    """Parse the generation log file and extract seed -> variables mapping."""

    seed_vars = {}
    current_seed = None

    with open(log_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()

            # Look for seed number: *** makeBook 90000 ****
            seed_match = re.search(r'\*\*\*\s*makeBook\s+(\d+)\s*\*', line)
            if seed_match:
                current_seed = seed_match.group(1)
                continue

            # Look for vars line: vars: ['var1', 'var2', ...]
            if line.startswith('vars:') and current_seed:
                # Extract the list part
                vars_match = re.search(r'vars:\s*(\[.*\])', line)
                if vars_match:
                    try:
                        # Parse the Python list literal
                        vars_list = eval(vars_match.group(1))
                        seed_vars[current_seed] = sorted(vars_list)
                        print(f"  Seed {current_seed}: {len(vars_list)} variables")
                    except Exception as e:
                        print(f"  Warning: Could not parse vars for seed {current_seed}: {e}")
                current_seed = None

    return seed_vars


def update_version_files(seed_vars):
    """Update individual version JSON files with variables."""

    updated = 0
    for seed_id, variables in seed_vars.items():
        version_file = EXTRACTED_DIR / f"version_{seed_id}.json"

        if not version_file.exists():
            print(f"  Warning: No version file for seed {seed_id}")
            continue

        with open(version_file, 'r', encoding='utf-8') as f:
            version_data = json.load(f)

        version_data['variables'] = variables

        with open(version_file, 'w', encoding='utf-8') as f:
            json.dump(version_data, f, indent=2, ensure_ascii=False)

        updated += 1

    return updated


def update_combined_file(seed_vars):
    """Update the combined all_versions.json file with variables."""

    combined_file = EXTRACTED_DIR / "all_versions.json"

    if not combined_file.exists():
        print("  Warning: all_versions.json not found")
        return 0

    with open(combined_file, 'r', encoding='utf-8') as f:
        all_versions = json.load(f)

    updated = 0
    for seed_id, variables in seed_vars.items():
        if seed_id in all_versions:
            all_versions[seed_id]['variables'] = variables
            updated += 1

    with open(combined_file, 'w', encoding='utf-8') as f:
        json.dump(all_versions, f, indent=2, ensure_ascii=False)

    return updated


def main():
    if len(sys.argv) < 2:
        print("Usage: python add_variables.py <generation_log.txt>")
        print("\nExpects a text file with generation output containing:")
        print("  *** makeBook XXXXX ***")
        print("  vars: ['var1', 'var2', ...]")
        sys.exit(1)

    log_path = Path(sys.argv[1])
    if not log_path.exists():
        print(f"Error: File not found: {log_path}")
        sys.exit(1)

    print(f"Parsing {log_path}...")
    seed_vars = parse_generation_log(log_path)

    if not seed_vars:
        print("No seed/variable data found in log file.")
        sys.exit(1)

    print(f"\nFound {len(seed_vars)} seeds with variables.")

    print("\nUpdating individual version files...")
    individual_count = update_version_files(seed_vars)
    print(f"  Updated {individual_count} individual files.")

    print("\nUpdating combined all_versions.json...")
    combined_count = update_combined_file(seed_vars)
    print(f"  Updated {combined_count} entries in all_versions.json.")

    print("\nDone!")


if __name__ == "__main__":
    main()
