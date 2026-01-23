#!/usr/bin/env python3
"""
Parse globals.txt and chapter source files to extract variable information:
1. Variable descriptions from comments in globals.txt
2. Macro definitions and which variables they use
3. Which chapters use each variable (directly or through macros)
4. Variable groups (mutually exclusive alternatives)
5. Inference patterns for detecting variables in uploaded EPUBs

Outputs: docs/extracted_text/variable_info.json
"""

import json
import re
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
ORIGIN_DIR = BASE_DIR / "origin_text"
OUTPUT_PATH = BASE_DIR / "extracted_text" / "variable_info.json"

# Minimum pattern length for inference (shorter patterns may cause false positives)
MIN_INFERENCE_PATTERN_LENGTH = 15

# Map source file stems to chapter IDs used in the browser
CHAPTER_MAPPING = {
    'part01': 'prologue',
    'ch01': 'chapter1',
    'ch02': 'chapter2',
    'ch03': 'chapter3',
    'ch04': 'chapter4',
    'ch05': 'chapter5',
    'ch06': 'chapter6',
    'ch07': 'chapter7',
    'ch08': 'chapter8',
    'ch09': 'chapter9',
    'part02': 'part2',
    'ch10': 'chapter10',
    'ch11': 'chapter11',
    'ch12': 'chapter12',
    'ch13': 'chapter13',
    'ch14': 'chapter14',
    'ch15': 'chapter15',
    'part03': 'part3',
    'ch16': 'chapter16',
    'ch17': 'chapter17',
    'epilogue': 'chapter18',
    'notes': 'notes',
}

CHAPTER_ORDER = [
    'prologue', 'chapter1', 'chapter2', 'chapter3', 'chapter4',
    'chapter5', 'chapter6', 'chapter7', 'chapter8', 'chapter9',
    'part2', 'chapter10', 'chapter11', 'chapter12', 'chapter13',
    'chapter14', 'chapter15', 'part3', 'chapter16', 'chapter17',
    'chapter18', 'notes'
]


def parse_globals():
    """Parse globals.txt to extract variable definitions, descriptions, and macros."""
    globals_path = ORIGIN_DIR / "globals.txt"

    if not globals_path.exists():
        print(f"Warning: {globals_path} not found")
        return {}, {}, {}, []

    variables = {}
    macros = {}  # macro_name -> list of variables it uses
    macro_patterns = {}  # macro_name -> {var_name: [text patterns]}
    variable_groups = []  # List of variable groups (mutually exclusive alternatives)
    current_comment = []

    with open(globals_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.rstrip()

            # Collect comment lines
            if line.startswith('#') and not line.startswith('# QUANT'):
                comment_text = line[1:].strip()
                if comment_text and not comment_text.startswith('***'):
                    current_comment.append(comment_text)
                continue

            # Look for DEFINE statements
            define_match = re.search(r'\[DEFINE\s+([^\]]+)\]', line)
            if define_match:
                define_content = define_match.group(1)
                var_names = re.findall(r'@(\w+)', define_content)
                description = ' '.join(current_comment) if current_comment else None

                # Track if this is a group of mutually exclusive variables
                # (more than one variable in the DEFINE, separated by |)
                if len(var_names) > 1:
                    variable_groups.append({
                        'variables': var_names,
                        'description': description,
                        'type': 'exclusive'  # exactly one is active
                    })

                for var_name in var_names:
                    # Check if it's optional (has ^ prefix)
                    is_optional = f'^@{var_name}' in define_content
                    variables[var_name] = {
                        'description': description,
                        'chapters': [],
                        'usage_count': 0,
                        'macros': [],
                        'group': var_names if len(var_names) > 1 else None,
                        'optional': is_optional,
                    }

                current_comment = []
                continue

            # Look for MACRO definitions
            macro_match = re.search(r'\[MACRO\s+(\w+)\](.+)', line)
            if macro_match:
                macro_name = macro_match.group(1)
                macro_content = macro_match.group(2)

                # Find all variables referenced in this macro
                vars_in_macro = re.findall(r'@(\w+)', macro_content)
                if vars_in_macro:
                    macros[macro_name] = list(set(vars_in_macro))

                    # Track which macros each variable is used in
                    for var_name in vars_in_macro:
                        if var_name in variables:
                            if macro_name not in variables[var_name]['macros']:
                                variables[var_name]['macros'].append(macro_name)

                # Extract text patterns from macro definition: @varname>text
                macro_patterns[macro_name] = {}
                for var_match in re.finditer(r'@(\w+)>([^|\]\[]+)', macro_content):
                    var_name = var_match.group(1)
                    text_snippet = var_match.group(2).strip()
                    # Clean up the snippet (remove nested macros, keep italic text)
                    clean_snippet = re.sub(r'\{i/([^}]+)\}', r'\1', text_snippet)
                    clean_snippet = re.sub(r'\{[^}]+\}', '', clean_snippet)
                    clean_snippet = clean_snippet.strip()
                    if clean_snippet and len(clean_snippet) >= 3:
                        if var_name not in macro_patterns[macro_name]:
                            macro_patterns[macro_name][var_name] = []
                        macro_patterns[macro_name][var_name].append(clean_snippet)

                current_comment = []
                continue

            if line.strip():
                current_comment = []

    return variables, macros, macro_patterns, variable_groups


def find_variable_usage(variables, macros):
    """Scan chapter files for variable usage (direct and via macros)."""

    for source_file in ORIGIN_DIR.glob('*.txt'):
        if source_file.name in ('globals.txt', 'manifest.txt'):
            continue

        stem = source_file.stem
        chapter_id = CHAPTER_MAPPING.get(stem, stem)
        content = source_file.read_text(encoding='utf-8')

        # Find direct variable references: @varname
        direct_refs = set(re.findall(r'@(\w+)', content))
        for var_name in direct_refs:
            if var_name in variables:
                if chapter_id not in variables[var_name]['chapters']:
                    variables[var_name]['chapters'].append(chapter_id)
                variables[var_name]['usage_count'] += 1

        # Find macro usage: {MacroName} or {MacroName/...}
        macro_refs = set(re.findall(r'\{(\w+)(?:/[^}]*)?\}', content))
        for macro_name in macro_refs:
            if macro_name in macros:
                for var_name in macros[macro_name]:
                    if var_name in variables:
                        if chapter_id not in variables[var_name]['chapters']:
                            variables[var_name]['chapters'].append(chapter_id)
                        variables[var_name]['usage_count'] += 1

    # Sort chapter lists
    for var_name in variables:
        variables[var_name]['chapters'].sort(
            key=lambda x: CHAPTER_ORDER.index(x) if x in CHAPTER_ORDER else 999
        )

    return variables


def extract_chapter_patterns(variables, macros, macro_patterns):
    """Extract text patterns for each variable to help with highlighting.

    Patterns come from two sources:
    1. Direct conditionals in chapter source: [@varname>text...]
    2. Macro definitions when the macro is used in a chapter: {MacroName}
    """

    for var_name in variables:
        variables[var_name]['patterns'] = {}

    for source_file in ORIGIN_DIR.glob('*.txt'):
        if source_file.name in ('globals.txt', 'manifest.txt'):
            continue

        stem = source_file.stem
        chapter_id = CHAPTER_MAPPING.get(stem, stem)
        content = source_file.read_text(encoding='utf-8')

        # Find direct conditional blocks: [@varname>text...]
        pattern = r'\[(?:\*\w+\*)?[\^]?@(\w+)>([^\[\]|]+)'

        for match in re.finditer(pattern, content):
            var_name = match.group(1)
            text_snippet = match.group(2).strip()

            if var_name in variables:
                if chapter_id not in variables[var_name]['patterns']:
                    variables[var_name]['patterns'][chapter_id] = []

                clean_snippet = re.sub(r'\{i/([^}]+)\}', r'\1', text_snippet)
                clean_snippet = re.sub(r'\{[^}]+\}', '', clean_snippet)
                clean_snippet = clean_snippet.strip()

                if clean_snippet and len(clean_snippet) > 10:
                    variables[var_name]['patterns'][chapter_id].append(
                        clean_snippet[:100]
                    )

        # Find macro usage and add patterns from macro definitions
        macro_refs = set(re.findall(r'\{(\w+)(?:/[^}]*)?\}', content))
        for macro_name in macro_refs:
            if macro_name in macro_patterns:
                # Add patterns from this macro to the relevant variables
                for var_name, patterns in macro_patterns[macro_name].items():
                    if var_name in variables:
                        if chapter_id not in variables[var_name]['patterns']:
                            variables[var_name]['patterns'][chapter_id] = []
                        for pat in patterns:
                            if pat not in variables[var_name]['patterns'][chapter_id]:
                                variables[var_name]['patterns'][chapter_id].append(pat)

    return variables


def extract_chapter_variables(global_variables):
    """Extract variables defined within chapter files (not in globals.txt).

    Returns a dict: chapter_id -> list of variable definitions
    """
    chapter_variables = {}

    for source_file in ORIGIN_DIR.glob('*.txt'):
        if source_file.name in ('globals.txt', 'manifest.txt'):
            continue

        stem = source_file.stem
        chapter_id = CHAPTER_MAPPING.get(stem, stem)
        content = source_file.read_text(encoding='utf-8')

        chapter_vars = []
        current_comment = []

        for line in content.split('\n'):
            line = line.rstrip()

            # Collect comment lines
            if line.startswith('#'):
                comment_text = line[1:].strip()
                if comment_text and not comment_text.startswith('***'):
                    current_comment.append(comment_text)
                continue

            # Look for DEFINE statements
            define_match = re.search(r'\[DEFINE\s+([^\]]+)\]', line)
            if define_match:
                define_content = define_match.group(1)
                var_names = re.findall(r'@(\w+)', define_content)

                # Skip if all variables are global (already in globals.txt)
                local_vars = [v for v in var_names if v not in global_variables]
                if not local_vars:
                    current_comment = []
                    continue

                description = ' '.join(current_comment) if current_comment else None

                # Check if it's a group (mutually exclusive)
                is_group = len(local_vars) > 1

                # Check for optional (^) prefix
                is_optional = any(f'^@{v}' in define_content for v in local_vars)

                # Extract probabilities if present
                has_probabilities = bool(re.search(r'\d+>', define_content))

                chapter_vars.append({
                    'variables': local_vars,
                    'description': description,
                    'is_group': is_group,
                    'is_optional': is_optional,
                    'has_probabilities': has_probabilities,
                    'raw': define_content.strip()
                })

                current_comment = []
                continue

            if line.strip():
                current_comment = []

        if chapter_vars:
            chapter_variables[chapter_id] = chapter_vars

    return chapter_variables


def main():
    print("Parsing globals.txt for variables and macros...")
    variables, macros, macro_patterns, variable_groups = parse_globals()
    print(f"  Found {len(variables)} variables, {len(macros)} macros")
    print(f"  Found {len(variable_groups)} variable groups (mutually exclusive sets)")
    macros_with_patterns = sum(1 for mp in macro_patterns.values() if mp)
    print(f"  {macros_with_patterns} macros have extractable text patterns")

    print("\nScanning chapters for variable usage (direct + via macros)...")
    variables = find_variable_usage(variables, macros)

    print("\nExtracting text patterns (direct + from macros)...")
    variables = extract_chapter_patterns(variables, macros, macro_patterns)

    with_chapters = sum(1 for v in variables.values() if v.get('chapters'))
    with_patterns = sum(1 for v in variables.values() if v.get('patterns'))
    print(f"  {with_chapters} variables are used in chapters")
    print(f"  {with_patterns} variables have text patterns for highlighting")

    print("\nExtracting chapter-local variable definitions...")
    chapter_variables = extract_chapter_variables(variables)
    total_chapter_vars = sum(len(defs) for defs in chapter_variables.values())
    print(f"  Found {total_chapter_vars} chapter-local variable definitions in {len(chapter_variables)} chapters")

    # Build final output with variables and groups for inference
    output_data = {
        'variables': variables,
        'groups': variable_groups,
        'macros': macros,
        'chapter_variables': chapter_variables,
    }

    OUTPUT_PATH.parent.mkdir(exist_ok=True)
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)

    print(f"\nWrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
