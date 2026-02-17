#!/usr/bin/env python3
"""
Build 3D constellation coordinates for the Subcutanean variant space.

Reads the 10,000 variant text files and 25 built-in seed texts, computes
TF-IDF vectors based on actual prose, then runs UMAP to reduce the
high-dimensional textual space to 3D coordinates.

Since ~90% of each novel's text is shared across all variants, TF-IDF
naturally downweights the common language and amplifies the passages
that differ — producing clusters based on genuine textual similarity.

Requires: umap-learn, scikit-learn, numpy
    pip install umap-learn scikit-learn

Output: docs/extracted_text/constellation_data.json
"""

import json
import re
import numpy as np
from pathlib import Path

try:
    import umap
except ImportError:
    print("Error: umap-learn is required. Install with: pip install umap-learn")
    raise SystemExit(1)

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
except ImportError:
    print("Error: scikit-learn is required. Install with: pip install scikit-learn")
    raise SystemExit(1)


# The 10 group keys and their variables (for categorical metadata)
GROUP_KEYS = [
    "intro", "phone", "rooms", "fridge", "memory",
    "attraction", "hall", "place", "ff_setting", "ending",
]

GROUP_VARS = {
    "intro":      ["clubintro", "makeupintro", "noodlesintro"],
    "phone":      ["dadphone", "bradphone"],
    "rooms":      ["empty", "furnished"],
    "fridge":     ["fridgetrapped", "fridgetunnel"],
    "memory":     ["cdrom", "gorilla"],
    "attraction": ["vortex", "gardens", "snakeoil", "caves"],
    "hall":       ["spiralhall", "nikofalls"],
    "place":      ["TheCity", "TheBasement"],
    "ff_setting": ["ffdropoff", "ffthewalls"],
    "ending":     ["gayniko", "firmniko", "originalniko"],
}


def load_10k_texts(source_dir):
    """Load all 10K variant .txt files, returning (seeds, texts) lists."""
    txt_files = sorted(source_dir.glob('*.txt'))
    seeds = []
    texts = []
    for i, filepath in enumerate(txt_files):
        seed = int(filepath.stem)
        with open(filepath, 'r', encoding='utf-8') as f:
            text = f.read()
        seeds.append(seed)
        texts.append(text)
        if (i + 1) % 2000 == 0:
            print(f"  Read {i + 1}/{len(txt_files)} files...")
    return seeds, texts


def load_builtin_texts(extracted_dir):
    """Load built-in seed texts from all_versions.json, returning (seeds, texts)."""
    all_versions_file = extracted_dir / 'all_versions.json'
    if not all_versions_file.exists():
        print("Warning: all_versions.json not found, skipping built-in seeds")
        return [], []

    with open(all_versions_file, 'r', encoding='utf-8') as f:
        versions = json.load(f)

    seeds = []
    texts = []
    for vid in sorted(versions.keys(), key=int):
        v = versions[vid]
        # Concatenate all chapter paragraphs into one text
        full_text = ' '.join(
            ' '.join(paras)
            for paras in v.values()
        )
        # Strip HTML tags from extracted text
        full_text = re.sub(r'<[^>]+>', ' ', full_text)
        seeds.append(int(vid))
        texts.append(full_text)

    return seeds, texts


def load_pathway_metadata(data_dir):
    """Load categorical pathway data for metadata on each point."""
    pathway_file = data_dir / 'pathway_data.json'
    if not pathway_file.exists():
        return None

    with open(pathway_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Build seed → pathway lookup
    lookup = {}
    for v in data['variants']:
        lookup[v['seed']] = v
    for v in data['builtin_seeds']:
        lookup[v['seed']] = v

    return data, lookup


def main():
    source_dir = Path(__file__).parent.parent / 'sources' / '10k_subcutaneans'
    extracted_dir = Path(__file__).parent / 'extracted_text'
    output_file = extracted_dir / 'constellation_data.json'

    if not source_dir.exists():
        print(f"Error: {source_dir} not found")
        return

    # ── Load texts ──
    print("Loading 10K variant texts...")
    scan_seeds, scan_texts = load_10k_texts(source_dir)
    print(f"  {len(scan_seeds)} variant texts loaded")

    print("Loading built-in seed texts...")
    builtin_seeds, builtin_texts = load_builtin_texts(extracted_dir)
    print(f"  {len(builtin_seeds)} built-in seed texts loaded")

    # Combine: 10K scanned first, then 25 built-in
    all_seeds = scan_seeds + builtin_seeds
    all_texts = scan_texts + builtin_texts
    n_scanned = len(scan_seeds)
    print(f"  {len(all_texts)} total texts")

    # ── TF-IDF vectorization ──
    print("Computing TF-IDF vectors...")
    vectorizer = TfidfVectorizer(
        max_features=5000,      # top 5K most informative terms
        min_df=5,               # term must appear in at least 5 docs
        max_df=0.98,            # skip terms in >98% of docs (shared text)
        sublinear_tf=True,      # log(1 + tf) — dampens high-frequency terms
        dtype=np.float32,
    )
    tfidf_matrix = vectorizer.fit_transform(all_texts)
    print(f"  TF-IDF matrix: {tfidf_matrix.shape} ({tfidf_matrix.nnz} non-zero entries)")

    vocab = vectorizer.get_feature_names_out()
    print(f"  Vocabulary: {len(vocab)} terms")
    print(f"  Sample terms: {list(vocab[:10])}...{list(vocab[-5:])}")

    # ── UMAP to 3D ──
    print("Running UMAP (3D)... this may take a few minutes")
    reducer = umap.UMAP(
        n_components=3,
        n_neighbors=30,         # broader neighborhoods for 10K points
        min_dist=0.05,          # allow tighter clusters
        metric='cosine',        # natural metric for TF-IDF vectors
        random_state=42,
    )
    coords_3d = reducer.fit_transform(tfidf_matrix)
    print(f"  Output shape: {coords_3d.shape}")

    # Normalize to [-1, 1] range
    mins = coords_3d.min(axis=0)
    maxs = coords_3d.max(axis=0)
    ranges = maxs - mins
    ranges[ranges == 0] = 1
    coords_3d = 2.0 * (coords_3d - mins) / ranges - 1.0

    # ── Compute per-point density (mean distance to k nearest neighbors) ──
    print("Computing local density scores...")
    from sklearn.neighbors import NearestNeighbors
    k = 15
    nn = NearestNeighbors(n_neighbors=k + 1, metric='euclidean')
    nn.fit(coords_3d)
    dists, _ = nn.kneighbors(coords_3d)
    # Mean distance to k nearest neighbors (skip self at index 0)
    mean_nn_dist = dists[:, 1:].mean(axis=1)
    # Normalize to [0, 1] — 0 = densest, 1 = most isolated
    isolation = (mean_nn_dist - mean_nn_dist.min()) / (mean_nn_dist.max() - mean_nn_dist.min())
    print(f"  Isolation range: [{isolation.min():.3f}, {isolation.max():.3f}]")
    print(f"  Mean isolation: {isolation.mean():.3f}")

    # ── Find nearest built-in seed for each point ──
    print("Computing nearest built-in seed for each point...")
    builtin_coords = coords_3d[n_scanned:]
    nearest_builtin = []
    for i in range(len(all_seeds)):
        dists_to_builtin = np.linalg.norm(builtin_coords - coords_3d[i], axis=1)
        closest_idx = int(np.argmin(dists_to_builtin))
        nearest_builtin.append(closest_idx)  # index into builtin_seeds list

    # ── Load pathway metadata ──
    print("Loading pathway metadata...")
    pathway_result = load_pathway_metadata(extracted_dir)
    if pathway_result:
        pathway_data, pathway_lookup = pathway_result
        labels = pathway_data.get('labels', {})
        descriptions = pathway_data.get('descriptions', {})
        groups_info = []
        for gk in GROUP_KEYS:
            for g in pathway_data['groups']:
                if g['key'] == gk:
                    groups_info.append({
                        "key": gk,
                        "label": g['label'],
                        "vars": GROUP_VARS[gk],
                    })
                    break
    else:
        pathway_lookup = {}
        labels = {}
        descriptions = {}
        groups_info = []

    # ── Build output ──
    points = []
    for i, seed in enumerate(all_seeds):
        point = {
            "seed": seed,
            "x": round(float(coords_3d[i, 0]), 4),
            "y": round(float(coords_3d[i, 1]), 4),
            "z": round(float(coords_3d[i, 2]), 4),
            "isolation": round(float(isolation[i]), 4),
            "nearest_builtin": nearest_builtin[i],
        }
        # Attach categorical pathway info if available
        pw = pathway_lookup.get(seed, {})
        for gk in GROUP_KEYS:
            point[gk] = pw.get(gk)
        points.append(point)

    builtin_indices = list(range(n_scanned, n_scanned + len(builtin_seeds)))

    output = {
        "total_variants": len(all_seeds),
        "points": points,
        "builtin_indices": builtin_indices,
        "labels": labels,
        "descriptions": descriptions,
        "groups": groups_info,
    }

    print(f"Writing {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f)

    size_mb = output_file.stat().st_size / (1024 * 1024)
    print(f"  Output size: {size_mb:.1f} MB")
    print("Done!")


if __name__ == '__main__':
    main()
