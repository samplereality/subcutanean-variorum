#!/usr/bin/env python3
"""
Create true single-witness variorums where the base text comes entirely from one version.
"""

import json
import re
from pathlib import Path
from collections import defaultdict


def normalize_paragraph(text):
    """Normalize a paragraph for comparison."""
    text = ' '.join(text.split())
    text = re.sub(r'</?em>', '', text)
    return text.strip()


def create_base_witness_variorum(base_version_id, all_versions_paras, version_ids):
    """Create a variorum where base text comes entirely from one witness."""

    # Get base version paragraphs
    base_paras = all_versions_paras[base_version_id]

    # Pre-compute normalized paragraphs for all versions for faster lookup
    normalized_paras = {}
    for vid in version_ids:
        normalized_paras[vid] = [
            (idx, normalize_paragraph(para), para)
            for idx, para in enumerate(all_versions_paras[vid])
        ]

    # Track which paragraphs from other versions have been matched
    used_paragraphs = {vid: set() for vid in version_ids if vid != base_version_id}

    result = []

    # Process each paragraph in the base version
    for base_idx, base_para in enumerate(base_paras):
        base_norm = normalize_paragraph(base_para)

        # Find matches in other versions
        text_groups = defaultdict(list)
        text_groups[base_para].append(base_version_id)

        for vid in version_ids:
            if vid == base_version_id:
                continue

            # Find exact match using pre-computed normalized paragraphs
            for idx, norm_para, orig_para in normalized_paras[vid]:
                if idx in used_paragraphs[vid]:
                    continue

                if base_norm == norm_para:
                    # Mark this paragraph as used
                    used_paragraphs[vid].add(idx)
                    text_groups[orig_para].append(vid)
                    break

        # Build variant list
        variants = []
        versions_with_this_para = set()

        for text, vids in text_groups.items():
            versions_with_this_para.update(vids)

            if text != base_para:
                variants.append({
                    'text': text,
                    'versions': sorted(vids),
                    'count': len(vids),
                    'type': 'variant'
                })
            elif len(vids) > 1:
                # Other versions that agree with base
                other_vids = [v for v in vids if v != base_version_id]
                if other_vids:
                    variants.append({
                        'text': text,
                        'versions': sorted(other_vids),
                        'count': len(other_vids),
                        'type': 'agreement',
                        'note': 'Same text as base'
                    })

        # Add omissions (versions that don't have a match for this paragraph)
        missing_versions = set(version_ids) - versions_with_this_para
        if missing_versions:
            variants.append({
                'text': '[Paragraph not present in this version]',
                'versions': sorted(list(missing_versions)),
                'count': len(missing_versions),
                'type': 'omission'
            })

        has_variation = len(variants) > 0

        result.append({
            'position': base_idx,
            'base_text': base_para,
            'base_version': base_version_id,
            'has_variation': has_variation,
            'variants': variants,
            'total_versions_present': len(versions_with_this_para)
        })

    # Optional: Find paragraphs in other versions that weren't matched
    # (These are additions that don't appear in the base version)
    additional_paragraphs = []
    for vid in version_ids:
        if vid == base_version_id:
            continue

        unmatched = []
        for idx, para in enumerate(all_versions_paras[vid]):
            if idx not in used_paragraphs[vid]:
                unmatched.append({
                    'text': para,
                    'version': vid,
                    'index': idx
                })

        if unmatched:
            additional_paragraphs.extend(unmatched)

    return result, additional_paragraphs


def process_all_chapters():
    """Process all chapters and create true single-witness variorums."""

    extracted_dir = Path(__file__).parent / 'extracted_text'
    output_dir = Path(__file__).parent / 'variorum_data'
    output_dir.mkdir(exist_ok=True)

    # Load all versions
    with open(extracted_dir / 'all_versions.json', 'r', encoding='utf-8') as f:
        all_versions = json.load(f)

    version_ids = sorted(all_versions.keys())
    base_version_options = ['45451', '45452', '45453', '45457', '45462']

    print(f"Creating true single-witness variorums for {len(version_ids)} versions...")
    print(f"Base versions: {base_version_options}")

    # Get list of all chapters
    first_version = all_versions[version_ids[0]]
    chapter_ids = [key for key in first_version.keys() if key != 'version_id']

    print(f"Found {len(chapter_ids)} sections: {chapter_ids}\\n")

    # Create manifest
    manifest = {
        'total_versions': len(version_ids),
        'version_ids': version_ids,
        'base_version_options': base_version_options,
        'chapters': []
    }

    # Process each chapter
    for chapter_id in chapter_ids:
        print(f"=== Processing {chapter_id} ===")

        # Get paragraphs for this chapter from all versions
        chapter_by_version = {}
        for vid in version_ids:
            if chapter_id in all_versions[vid]:
                chapter_by_version[vid] = all_versions[vid][chapter_id]

        if not chapter_by_version:
            print(f"  Skipping {chapter_id} - no data found")
            continue

        # Generate variorums for all base versions
        variorums_by_base = {}
        for base_vid in base_version_options:
            variorum, additional = create_base_witness_variorum(
                base_vid, chapter_by_version, version_ids
            )
            variorums_by_base[base_vid] = variorum

            print(f"  Base {base_vid}: {len(variorum)} paragraphs, {len(additional)} additional in other versions")

        # Create chapter data structure
        chapter_data = {
            'chapter_id': chapter_id,
            'total_versions': len(version_ids),
            'version_ids': version_ids,
            'base_version_options': base_version_options,
            'variorums_by_base': variorums_by_base
        }

        # Save to separate file
        chapter_file = output_dir / f'{chapter_id}.json'
        with open(chapter_file, 'w', encoding='utf-8') as f:
            json.dump(chapter_data, f, indent=2, ensure_ascii=False)

        print(f"  Saved to {chapter_file.name}")

        # Add to manifest
        manifest['chapters'].append({
            'id': chapter_id,
            'file': f'{chapter_id}.json',
            'paragraph_count': len(variorums_by_base[base_version_options[0]])
        })

    # Save manifest
    manifest_file = output_dir / 'manifest.json'
    with open(manifest_file, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    print(f"\\n=== Manifest saved to {manifest_file} ===")
    print(f"Total sections: {len(manifest['chapters'])}")


if __name__ == '__main__':
    process_all_chapters()
