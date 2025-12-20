#!/usr/bin/env python3
"""Build JSON representation of Quant source files defined in origin_text/manifest.txt."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List

BASE_DIR = Path(__file__).resolve().parent
ORIGIN_DIR = BASE_DIR / "origin_text"
MANIFEST_PATH = ORIGIN_DIR / "manifest.txt"
OUTPUT_PATH = ORIGIN_DIR / "origin_sources.json"


def load_manifest() -> List[str]:
    if not MANIFEST_PATH.exists():
        raise FileNotFoundError(f"Manifest not found: {MANIFEST_PATH}")

    entries: List[str] = []
    with MANIFEST_PATH.open("r", encoding="utf-8") as manifest_file:
        for raw_line in manifest_file:
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue
            entries.append(line)
    return entries


def friendly_title(stem: str) -> str:
    stem_lower = stem.lower()
    if stem_lower == "globals":
        return "Globals"
    if stem_lower.startswith("part"):
        numeral = stem_lower.replace("part", "")
        return f"Part {numeral}".strip()
    if stem_lower.startswith("ch") and stem_lower[2:].isdigit():
        number = int(stem_lower[2:])
        return f"Chapter {number}"
    if stem_lower == "epilogue":
        return "Epilogue"
    if stem_lower == "notes":
        return "Notes"
    return stem


def build_origin_data(manifest_entries: List[str]) -> Dict[str, object]:
    order: List[Dict[str, str]] = []
    chapters: Dict[str, Dict[str, object]] = {}

    for entry in manifest_entries:
        source_path = ORIGIN_DIR / entry
        if not source_path.exists():
            raise FileNotFoundError(f"Listed source file not found: {source_path}")

        stem = source_path.stem
        title = friendly_title(stem)
        content = source_path.read_text(encoding="utf-8")
        chapter_info = {
            "key": stem,
            "title": title,
            "filename": entry,
            "content": content,
        }
        order.append({"key": stem, "title": title, "filename": entry})
        chapters[stem] = chapter_info

    return {"order": order, "chapters": chapters}


def main() -> None:
    manifest_entries = load_manifest()
    origin_data = build_origin_data(manifest_entries)
    OUTPUT_PATH.write_text(
        json.dumps(origin_data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Wrote {OUTPUT_PATH} with {len(origin_data['chapters'])} entries.")


if __name__ == "__main__":
    main()
