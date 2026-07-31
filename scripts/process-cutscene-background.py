"""Convert a generated cutscene plate to the game's coarse pixel-art format.

The runtime cutscenes use a 160x90 logical canvas enlarged six times with
nearest-neighbour sampling. Keeping that contract here makes new environment
plates share one pixel grid and palette budget with the existing artwork.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


LOGICAL_SIZE = (160, 90)
RUNTIME_SIZE = (960, 540)
PALETTE_COLORS = 24


def reference_palette(path: Path) -> Image.Image:
    with Image.open(path) as opened:
        reference = opened.convert("RGB")
    colors = reference.getcolors(maxcolors=reference.width * reference.height)
    if colors is None:
        raise ValueError(f"{path} has too many colors to use as a fixed palette")
    rgb = [color for _, color in sorted(colors, reverse=True)]
    if len(rgb) > 256:
        raise ValueError(f"{path} has {len(rgb)} colors; expected at most 256")
    flat = [channel for color in rgb for channel in color]
    flat.extend([0] * (768 - len(flat)))
    palette = Image.new("P", (1, 1))
    palette.putpalette(flat)
    return palette


def process(source: Path, destination: Path, palette_path: Path | None = None) -> None:
    with Image.open(source) as opened:
        image = opened.convert("RGB")

    logical = image.resize(LOGICAL_SIZE, Image.Resampling.LANCZOS)
    if palette_path:
        logical = logical.quantize(
            palette=reference_palette(palette_path),
            dither=Image.Dither.FLOYDSTEINBERG,
        ).convert("RGB")
    else:
        logical = logical.quantize(
            colors=PALETTE_COLORS,
            method=Image.Quantize.MEDIANCUT,
            dither=Image.Dither.FLOYDSTEINBERG,
        ).convert("RGB")
    runtime = logical.resize(RUNTIME_SIZE, Image.Resampling.NEAREST)

    destination.parent.mkdir(parents=True, exist_ok=True)
    runtime.save(destination, "WEBP", lossless=True, method=6)

    colors = runtime.getcolors(maxcolors=RUNTIME_SIZE[0] * RUNTIME_SIZE[1])
    if runtime.size != RUNTIME_SIZE:
        raise ValueError(f"expected {RUNTIME_SIZE}, produced {runtime.size}")
    if colors is None or len(colors) > PALETTE_COLORS:
        raise ValueError(f"expected at most {PALETTE_COLORS} colors")
    print(f"Built {destination} ({runtime.width}x{runtime.height}, {len(colors)} colors)")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--palette-reference", type=Path)
    args = parser.parse_args()
    process(args.source, args.destination, args.palette_reference)


if __name__ == "__main__":
    main()
