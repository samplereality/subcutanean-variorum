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


def parse_chapter_macros(global_variables):
    """Parse chapter files for local macro definitions.

    Chapter files can define macros with [MACRO name]... syntax.
    These macros may reference global variables in patterns like:
    [MACRO ch16possiblebit][@possibles>The possible|What]

    Returns:
        chapter_macros: dict mapping chapter_id -> macro_name -> {vars: [...], patterns: {var: [text]}}
    """
    chapter_macros = {}

    for source_file in ORIGIN_DIR.glob('*.txt'):
        if source_file.name in ('globals.txt', 'manifest.txt'):
            continue

        stem = source_file.stem
        chapter_id = CHAPTER_MAPPING.get(stem, stem)
        content = source_file.read_text(encoding='utf-8')

        macros_in_chapter = {}

        # Find all MACRO definitions in this chapter
        for macro_match in re.finditer(r'\[MACRO\s+([\w\s]+)\](.+)', content):
            macro_name = macro_match.group(1).strip()
            macro_content = macro_match.group(2)

            # Find all variables referenced in this macro (case-insensitive)
            vars_in_macro = [v.lower() for v in re.findall(r'@(\w+)', macro_content, re.IGNORECASE)]
            vars_in_macro = [v for v in vars_in_macro if v in global_variables]

            if not vars_in_macro:
                continue

            # Extract text patterns from macro definition: @varname>text|alternative
            # The text before | is for when the variable is active
            patterns = {}
            for var_match in re.finditer(r'@(\w+)>([^|\]\[]+)', macro_content, re.IGNORECASE):
                var_name = var_match.group(1).lower()
                if var_name not in global_variables:
                    continue
                text_snippet = var_match.group(2).strip()

                # Clean up the snippet (remove nested macros, keep italic text)
                clean_snippet = re.sub(r'\{i/([^}]+)\}', r'\1', text_snippet)
                clean_snippet = re.sub(r'\{[^}]+\}', '', clean_snippet)
                clean_snippet = clean_snippet.strip()

                # Strip leading ^ (Quant paragraph break marker)
                if clean_snippet.startswith('^'):
                    clean_snippet = clean_snippet[1:].strip()

                if clean_snippet and len(clean_snippet) >= 3:
                    if var_name not in patterns:
                        patterns[var_name] = []
                    patterns[var_name].append(clean_snippet)

            if patterns:
                macros_in_chapter[macro_name] = {
                    'vars': list(set(vars_in_macro)),
                    'patterns': patterns
                }

        if macros_in_chapter:
            chapter_macros[chapter_id] = macros_in_chapter

    return chapter_macros


def find_variable_usage(variables, macros):
    """Scan chapter files for variable usage (direct and via macros)."""

    for source_file in ORIGIN_DIR.glob('*.txt'):
        if source_file.name in ('globals.txt', 'manifest.txt'):
            continue

        stem = source_file.stem
        chapter_id = CHAPTER_MAPPING.get(stem, stem)
        content = source_file.read_text(encoding='utf-8')

        # Find direct variable references: @varname (case-insensitive)
        direct_refs = set(re.findall(r'@(\w+)', content, re.IGNORECASE))
        for var_name_raw in direct_refs:
            var_name = var_name_raw.lower()  # Normalize to lowercase
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


def extract_text_from_macro_call(macro_text):
    """Extract readable text from a macro call like {epigraph/text.../author}.

    Returns the text content, stripping macro name and handling special formats:
    - {i/text} -> text (italics)
    - {epigraph/quote text/author} -> quote text
    - {MacroName} -> '' (no argument)
    """
    if '/' not in macro_text:
        return ''

    # Split on first /
    parts = macro_text.split('/', 1)
    if len(parts) < 2:
        return ''

    macro_name = parts[0]
    content = parts[1]

    # For epigraph macro, content is "quote text/author" - extract quote
    if macro_name.lower() == 'epigraph':
        # Find last / to separate quote from author
        last_slash = content.rfind('/')
        if last_slash > 0:
            content = content[:last_slash]

    # Clean up escape sequences
    content = content.replace('\\\\', ' ').replace('\\', '')

    return content.strip()


def find_chapter_boundaries(content, default_chapter):
    """Find chapter boundaries within a source file.

    Some source files (like ch05.txt, ch08.txt) contain content for multiple chapters.
    This function finds {chapter/N} markers and returns a list of (position, chapter_id) tuples.

    Returns: List of (start_position, chapter_id) sorted by position
    """
    boundaries = [(0, default_chapter)]  # Start with default chapter at position 0

    # Find {chapter/N} markers (e.g., {chapter/6}, {chapter/9}, {chapter/EPILOGUE})
    for match in re.finditer(r'\{chapter/(\d+|EPILOGUE)\}', content):
        chapter_num = match.group(1)
        if chapter_num == 'EPILOGUE':
            chapter_id = 'chapter18'
        else:
            chapter_id = f'chapter{chapter_num}'
        boundaries.append((match.start(), chapter_id))

    # Sort by position
    boundaries.sort(key=lambda x: x[0])
    return boundaries


def get_chapter_for_position(position, boundaries):
    """Get the chapter ID for a given position based on chapter boundaries."""
    current_chapter = boundaries[0][1]
    for boundary_pos, chapter_id in boundaries:
        if position >= boundary_pos:
            current_chapter = chapter_id
        else:
            break
    return current_chapter


def extract_chapter_patterns(variables, macros, macro_patterns, chapter_macros=None):
    """Extract text patterns for each variable to help with highlighting.

    Patterns come from four sources:
    1. Direct conditionals in chapter source: [@varname>text...]
    2. Global macro definitions when the macro is used in a chapter: {MacroName}
    3. Text inside macro calls within conditionals: [@var>{macroname/text...}]
    4. Chapter-local macro definitions: [MACRO name][@var>text|alt]

    Handles cross-chapter content: some source files (ch05.txt, ch08.txt) contain
    content for multiple chapters. Patterns are assigned to the correct chapter
    based on their position relative to {chapter/N} markers.
    """
    if chapter_macros is None:
        chapter_macros = {}

    for var_name in variables:
        variables[var_name]['patterns'] = {}

    for source_file in ORIGIN_DIR.glob('*.txt'):
        if source_file.name in ('globals.txt', 'manifest.txt'):
            continue

        stem = source_file.stem
        default_chapter = CHAPTER_MAPPING.get(stem, stem)
        content = source_file.read_text(encoding='utf-8')

        # Find chapter boundaries within this file
        chapter_boundaries = find_chapter_boundaries(content, default_chapter)

        # Find conditional blocks: [@varname>text...] or |@varname>text...]
        # First form: starts with [ for initial conditional
        # Second form: starts with | for alternative branches in multi-variable conditionals
        # Pattern captures content including macro calls (allow { and } chars)
        pattern = r'(?:\[|\|)(?:\*\w+\*)?[\^]?@(\w+)>([^\[\]|]+(?:\{[^}]+\}[^\[\]|]*)*)'

        for match in re.finditer(pattern, content, re.IGNORECASE):
            var_name_raw = match.group(1)
            # Normalize to lowercase for matching (source may use dadPhone vs dadphone)
            var_name = var_name_raw.lower()
            text_snippet = match.group(2).strip()
            match_position = match.start()

            # Determine which chapter this pattern belongs to
            chapter_id = get_chapter_for_position(match_position, chapter_boundaries)

            if var_name in variables:
                if chapter_id not in variables[var_name]['patterns']:
                    variables[var_name]['patterns'][chapter_id] = []

                # First, extract text from any macro calls in the snippet
                macro_texts = []
                for macro_match in re.finditer(r'\{([^}]+)\}', text_snippet):
                    macro_content = macro_match.group(1)
                    extracted = extract_text_from_macro_call(macro_content)
                    if extracted and len(extracted) > 10:
                        macro_texts.append(extracted[:100])

                # Handle italics macro specially - keep the content
                clean_snippet = re.sub(r'\{i/([^}]+)\}', r'\1', text_snippet)

                # Split on other macros to get text segments before/after
                # This handles cases like "text {MacroName} more text"
                segments = re.split(r'\{[^}]+\}', clean_snippet)

                # Add extracted macro texts as patterns
                for mt in macro_texts:
                    if mt not in variables[var_name]['patterns'][chapter_id]:
                        variables[var_name]['patterns'][chapter_id].append(mt)

                # Add each substantial text segment as a pattern
                for segment in segments:
                    # Normalize whitespace
                    segment = re.sub(r'\s+', ' ', segment).strip()
                    # Strip leading ^ (Quant paragraph break marker)
                    if segment.startswith('^'):
                        segment = segment[1:].strip()
                    if segment and len(segment) > 15:  # Higher threshold for segments
                        if segment[:100] not in variables[var_name]['patterns'][chapter_id]:
                            variables[var_name]['patterns'][chapter_id].append(
                                segment[:100]
                            )

        # Find macro usage and add patterns from macro definitions
        # For macros, we need to track position too for cross-chapter assignment
        for macro_match in re.finditer(r'\{([\w\s]+)(?:/[^}]*)?\}', content):
            macro_name = macro_match.group(1).strip()
            macro_position = macro_match.start()
            chapter_id = get_chapter_for_position(macro_position, chapter_boundaries)

            # Check global macros (from globals.txt)
            if macro_name in macro_patterns:
                # Add patterns from this macro to the relevant variables
                for var_name, patterns in macro_patterns[macro_name].items():
                    if var_name in variables:
                        if chapter_id not in variables[var_name]['patterns']:
                            variables[var_name]['patterns'][chapter_id] = []
                        for pat in patterns:
                            if pat not in variables[var_name]['patterns'][chapter_id]:
                                variables[var_name]['patterns'][chapter_id].append(pat)

            # Check chapter-local macros
            # Note: chapter-local macros are defined in the same file where they're used
            if default_chapter in chapter_macros and macro_name in chapter_macros[default_chapter]:
                local_macro = chapter_macros[default_chapter][macro_name]
                for var_name, patterns in local_macro['patterns'].items():
                    if var_name in variables:
                        if chapter_id not in variables[var_name]['patterns']:
                            variables[var_name]['patterns'][chapter_id] = []
                        for pat in patterns:
                            if pat not in variables[var_name]['patterns'][chapter_id]:
                                variables[var_name]['patterns'][chapter_id].append(pat)

    return variables


def extract_patterns_for_chapter_variable(var_name, content):
    """Extract text patterns for a chapter-local variable from chapter content.

    Looks for conditional blocks: [@varname>text...] or |@varname>text...]
    Returns a list of text patterns.
    """
    patterns = []

    # Pattern for variable conditionals
    pattern = r'(?:\[|\|)(?:\*\w+\*)?[\^]?@' + re.escape(var_name) + r'>([^\[\]|]+(?:\{[^}]+\}[^\[\]|]*)*)'

    for match in re.finditer(pattern, content, re.IGNORECASE):
        text_snippet = match.group(1).strip()

        # Handle italics macro - keep the content
        clean_snippet = re.sub(r'\{i/([^}]+)\}', r'\1', text_snippet)

        # Remove other macros but keep segments
        segments = re.split(r'\{[^}]+\}', clean_snippet)

        for segment in segments:
            # Normalize whitespace
            segment = re.sub(r'\s+', ' ', segment).strip()
            # Strip leading ^ (Quant paragraph break marker)
            if segment.startswith('^'):
                segment = segment[1:].strip()
            # Add if substantial (but lower threshold for chapter-local vars)
            if segment and len(segment) >= 3:
                truncated = segment[:100]
                if truncated not in patterns:
                    patterns.append(truncated)

    return patterns


def extract_chapter_variables(global_variables):
    """Extract variables defined within chapter files (not in globals.txt).

    Returns a dict: chapter_id -> list of variable definitions with patterns
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
                local_vars = [v.lower() for v in var_names if v.lower() not in global_variables]
                if not local_vars:
                    current_comment = []
                    continue

                description = ' '.join(current_comment) if current_comment else None

                # Check if it's a group (mutually exclusive)
                is_group = len(local_vars) > 1

                # Check for optional (^) prefix
                is_optional = any(f'^@{v}' in define_content.lower() for v in local_vars)

                # Extract probabilities if present
                has_probabilities = bool(re.search(r'\d+>', define_content))

                # Extract text patterns for each variable in the group
                patterns = {}
                for var_name in local_vars:
                    var_patterns = extract_patterns_for_chapter_variable(var_name, content)
                    if var_patterns:
                        patterns[var_name] = var_patterns

                chapter_vars.append({
                    'variables': local_vars,
                    'description': description,
                    'is_group': is_group,
                    'is_optional': is_optional,
                    'has_probabilities': has_probabilities,
                    'raw': define_content.strip(),
                    'patterns': patterns
                })

                current_comment = []
                continue

            if line.strip():
                current_comment = []

        if chapter_vars:
            chapter_variables[chapter_id] = chapter_vars

    return chapter_variables


def extract_all_chapter_macros(global_variables, chapter_variables):
    """Extract ALL macro definitions from chapter files.

    Unlike parse_chapter_macros() which only extracts macros referencing global variables,
    this extracts every macro definition for display in the UI.

    Returns: dict mapping chapter_id -> macro_name -> macro info
    """
    # Build set of all known variables (global + chapter-local)
    all_vars = set(global_variables.keys())
    for chapter_id, var_defs in chapter_variables.items():
        for var_def in var_defs:
            all_vars.update(var_def['variables'])

    chapter_macros = {}

    for source_file in ORIGIN_DIR.glob('*.txt'):
        if source_file.name in ('globals.txt', 'manifest.txt'):
            continue

        stem = source_file.stem
        chapter_id = CHAPTER_MAPPING.get(stem, stem)
        content = source_file.read_text(encoding='utf-8')

        macros_in_chapter = {}

        # Find all MACRO definitions: [MACRO name][content]
        # The regex captures macro name and its content (which follows in square brackets)
        for macro_match in re.finditer(r'\[MACRO\s+([\w\s]+)\](\[[^\]]*\]|\S+)', content):
            macro_name = macro_match.group(1).strip()
            macro_content = macro_match.group(2)

            # Remove surrounding brackets if present
            if macro_content.startswith('[') and macro_content.endswith(']'):
                macro_content = macro_content[1:-1]

            # Extract text variants by splitting on | (but not inside nested brackets)
            # Simple approach: split on | that's not inside a conditional
            variants = []
            current_variant = ""
            bracket_depth = 0

            for char in macro_content:
                if char == '[':
                    bracket_depth += 1
                    current_variant += char
                elif char == ']':
                    bracket_depth -= 1
                    current_variant += char
                elif char == '|' and bracket_depth == 0:
                    if current_variant.strip():
                        variants.append(current_variant.strip())
                    current_variant = ""
                else:
                    current_variant += char

            if current_variant.strip():
                variants.append(current_variant.strip())

            # Clean up variants - remove probability prefixes like "80>" and variable conditionals
            clean_variants = []
            for v in variants:
                # Remove probability prefix
                v = re.sub(r'^\d+>', '', v).strip()
                # Remove variable conditional prefix like @varname>
                v = re.sub(r'^@\w+>', '', v).strip()
                # Clean up italics macro
                v = re.sub(r'\{i/([^}]+)\}', r'\1', v)
                # Handle ^ paragraph breaks
                if v.startswith('^'):
                    v = v[1:].strip()
                if v:
                    clean_variants.append(v)

            # Check for probabilities
            has_probabilities = bool(re.search(r'\d+>', macro_content))

            # Find variables referenced in this macro
            vars_referenced = []
            for var_match in re.findall(r'@(\w+)', macro_content, re.IGNORECASE):
                var_name = var_match.lower()
                if var_name in all_vars:
                    vars_referenced.append(var_name)
            vars_referenced = list(set(vars_referenced))

            # Find other macros referenced
            macros_referenced = []
            for ref_match in re.findall(r'\{([\w\s]+)(?:/[^}]*)?\}', macro_content):
                ref_name = ref_match.strip()
                # Skip common non-macro patterns like {i/text}
                if ref_name.lower() not in ('i', 'b', 'chapter', 'part', 'epigraph', 'vspace'):
                    macros_referenced.append(ref_name)
            macros_referenced = list(set(macros_referenced))

            macros_in_chapter[macro_name] = {
                'variants': clean_variants,
                'variant_count': len(clean_variants) if clean_variants else len(variants),
                'has_probabilities': has_probabilities,
                'references_vars': vars_referenced,
                'references_macros': macros_referenced,
                'raw': macro_content
            }

        if macros_in_chapter:
            chapter_macros[chapter_id] = macros_in_chapter

    return chapter_macros


def main():
    print("Parsing globals.txt for variables and macros...")
    variables, macros, macro_patterns, variable_groups = parse_globals()
    print(f"  Found {len(variables)} variables, {len(macros)} macros")
    print(f"  Found {len(variable_groups)} variable groups (mutually exclusive sets)")
    macros_with_patterns = sum(1 for mp in macro_patterns.values() if mp)
    print(f"  {macros_with_patterns} macros have extractable text patterns")

    print("\nParsing chapter files for local macro definitions...")
    chapter_macros = parse_chapter_macros(variables)
    total_chapter_macros = sum(len(m) for m in chapter_macros.values())
    print(f"  Found {total_chapter_macros} chapter-local macros in {len(chapter_macros)} chapters")

    print("\nScanning chapters for variable usage (direct + via macros)...")
    variables = find_variable_usage(variables, macros)

    print("\nExtracting text patterns (direct + from macros)...")
    variables = extract_chapter_patterns(variables, macros, macro_patterns, chapter_macros)

    with_chapters = sum(1 for v in variables.values() if v.get('chapters'))
    with_patterns = sum(1 for v in variables.values() if v.get('patterns'))
    print(f"  {with_chapters} variables are used in chapters")
    print(f"  {with_patterns} variables have text patterns for highlighting")

    print("\nExtracting chapter-local variable definitions...")
    chapter_variables = extract_chapter_variables(variables)
    total_chapter_vars = sum(len(defs) for defs in chapter_variables.values())
    print(f"  Found {total_chapter_vars} chapter-local variable definitions in {len(chapter_variables)} chapters")

    # Count chapter-local variables with patterns
    vars_with_patterns = sum(
        1 for defs in chapter_variables.values()
        for d in defs if d.get('patterns')
    )
    print(f"  {vars_with_patterns} definitions have text patterns for highlighting")

    print("\nExtracting all chapter-local macro definitions...")
    all_chapter_macros = extract_all_chapter_macros(variables, chapter_variables)
    total_all_macros = sum(len(m) for m in all_chapter_macros.values())
    print(f"  Found {total_all_macros} total chapter-local macros in {len(all_chapter_macros)} chapters")

    # Build final output with variables and groups for inference
    output_data = {
        'variables': variables,
        'groups': variable_groups,
        'macros': macros,
        'chapter_variables': chapter_variables,
        'chapter_macros': all_chapter_macros,
    }

    OUTPUT_PATH.parent.mkdir(exist_ok=True)
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)

    print(f"\nWrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
