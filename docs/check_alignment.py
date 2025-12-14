#!/usr/bin/env python3
"""
Check if different versions have different numbers of paragraphs.
"""

import json
from pathlib import Path

extracted_dir = Path(__file__).parent / 'extracted_text'

# Load all versions
with open(extracted_dir / 'all_versions.json', 'r', encoding='utf-8') as f:
    all_versions = json.load(f)

print("Checking paragraph counts across versions...\n")

# Check prologue
print("PROLOGUE:")
prologue_counts = {}
for version_id, data in sorted(all_versions.items()):
    count = len(data['prologue'])
    prologue_counts[count] = prologue_counts.get(count, []) + [version_id]
    print(f"  Version {version_id}: {count} paragraphs")

print(f"\nPrologue paragraph count distribution:")
for count, versions in sorted(prologue_counts.items()):
    print(f"  {count} paragraphs: {len(versions)} versions ({', '.join(versions[:3])}{'...' if len(versions) > 3 else ''})")

# Check chapter 1
print("\n\nCHAPTER 1:")
chapter1_counts = {}
for version_id, data in sorted(all_versions.items()):
    count = len(data['chapter1'])
    chapter1_counts[count] = chapter1_counts.get(count, []) + [version_id]
    print(f"  Version {version_id}: {count} paragraphs")

print(f"\nChapter 1 paragraph count distribution:")
for count, versions in sorted(chapter1_counts.items()):
    print(f"  {count} paragraphs: {len(versions)} versions ({', '.join(versions[:3])}{'...' if len(versions) > 3 else ''})")

# Check if we need better alignment
if len(prologue_counts) > 1 or len(chapter1_counts) > 1:
    print("\n⚠️  WARNING: Different versions have different paragraph counts!")
    print("   Current simple positional alignment may be incorrect.")
    print("   We need a more sophisticated alignment strategy.")
else:
    print("\n✓ All versions have the same number of paragraphs.")
    print("  Simple positional alignment should work.")
