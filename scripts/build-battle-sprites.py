"""Build compact battle animation sheets from the full cutscene sheets.

Battle tokens render at roughly 48 CSS pixels, where the 128px cutscene art is
too detailed. This tool reduces each selected frame to a 24px logical sprite,
limits its palette, adds a one-pixel contact outline, and enlarges it exactly
2x. Each output has four idle frames and four action frames.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageFilter


ROOT = Path(__file__).resolve().parents[1] / "src" / "assets" / "sprites"
SOURCE_DIR = ROOT / "animations" / "sheets"
OUTPUT_DIR = ROOT / "battle" / "sheets"
REVIEW_PATH = ROOT / "battle" / "review" / "battle-sprites.webp"

SOURCE_CELL = 128
LOGICAL_CELL = 24
RUNTIME_CELL = 48
COLS = 4
ROWS = 2
PALETTE_COLORS = 20
OUTLINE = (4, 7, 10, 255)

ACTORS = [
    "grubber",
    "minelayer",
    "stone-warden",
    "wisp",
    "shade",
    "tunneler",
    "clockwork",
    "gearhusk",
    "ossuary",
    "miscounter",
    "detonata",
    "collapser",
    "fogfather",
    "nn99",
]

FRAME_SELECTION = {
    "idle": (0, 1, 2, 1),
    "action": (0, 2, 4, 5),
}

ACTION_SELECTION_OVERRIDES = {
    # These source rows contain a transitional effects-only cell that is
    # readable at cutscene scale but makes the 48px battle token disappear.
    "minelayer": (0, 1, 3, 5),
    "shade": (0, 4, 0, 4),
}


def frame(source: Image.Image, row: int, column: int) -> Image.Image:
    left = column * SOURCE_CELL
    top = row * SOURCE_CELL
    return source.crop((left, top, left + SOURCE_CELL, top + SOURCE_CELL))


def simplify(source: Image.Image) -> Image.Image:
    logical = source.resize((LOGICAL_CELL, LOGICAL_CELL), Image.Resampling.BOX)
    rgba = logical.convert("RGBA")
    alpha = rgba.getchannel("A").point(lambda value: 255 if value >= 72 else 0)

    quantized = rgba.quantize(
        colors=PALETTE_COLORS,
        method=Image.Quantize.FASTOCTREE,
        dither=Image.Dither.NONE,
    ).convert("RGBA")
    quantized.putalpha(alpha)

    expanded = alpha.filter(ImageFilter.MaxFilter(3))
    outline_mask = ImageChops.subtract(expanded, alpha)
    outlined = Image.new("RGBA", logical.size, (0, 0, 0, 0))
    outlined.paste(OUTLINE, mask=outline_mask)
    outlined.alpha_composite(quantized)

    return outlined.resize((RUNTIME_CELL, RUNTIME_CELL), Image.Resampling.NEAREST)


def build_actor(actor: str) -> Image.Image:
    with Image.open(SOURCE_DIR / f"{actor}.webp") as opened:
        source = opened.convert("RGBA")
    if source.size != (SOURCE_CELL * 6, SOURCE_CELL * 4):
        raise ValueError(f"{actor}: unexpected source size {source.size}")

    output = Image.new(
        "RGBA",
        (RUNTIME_CELL * COLS, RUNTIME_CELL * ROWS),
        (0, 0, 0, 0),
    )
    for output_row, (motion, source_row) in enumerate((("idle", 0), ("action", 2))):
        selected = ACTION_SELECTION_OVERRIDES.get(actor, FRAME_SELECTION[motion]) \
            if motion == "action" else FRAME_SELECTION[motion]
        for output_column, source_column in enumerate(selected):
            output.alpha_composite(
                simplify(frame(source, source_row, source_column)),
                (output_column * RUNTIME_CELL, output_row * RUNTIME_CELL),
            )
    return output


def verify(sheet: Image.Image, actor: str) -> None:
    expected = (RUNTIME_CELL * COLS, RUNTIME_CELL * ROWS)
    if sheet.size != expected:
        raise ValueError(f"{actor}: expected {expected}, found {sheet.size}")
    alpha = sheet.getchannel("A")
    for row in range(ROWS):
        for column in range(COLS):
            box = (
                column * RUNTIME_CELL,
                row * RUNTIME_CELL,
                (column + 1) * RUNTIME_CELL,
                (row + 1) * RUNTIME_CELL,
            )
            cell = alpha.crop(box)
            if cell.getbbox() is None:
                raise ValueError(f"{actor}: empty frame at row {row}, column {column}")
            if any(cell.histogram()[1:255]):
                raise ValueError(f"{actor}: partial alpha at row {row}, column {column}")


def review_sheet(sheets: dict[str, Image.Image]) -> Image.Image:
    card_width = 220
    card_height = 132
    columns = 4
    rows = (len(sheets) + columns - 1) // columns
    review = Image.new("RGB", (columns * card_width, rows * card_height), "#0b1016")
    draw = ImageDraw.Draw(review)
    font = ImageFont.load_default()
    for index, (actor, sheet) in enumerate(sheets.items()):
        x = (index % columns) * card_width
        y = (index // columns) * card_height
        review.paste(sheet, (x + 14, y + 8), sheet)
        draw.rectangle(
            (x + 4, y + 4, x + card_width - 5, y + card_height - 5),
            outline="#9a7d3f",
        )
        draw.text((x + 14, y + 108), actor.replace("-", " ").title(), fill="#ddd3ba", font=font)
    return review


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--verify", action="store_true")
    args = parser.parse_args()

    if args.verify:
        for actor in ACTORS:
            path = OUTPUT_DIR / f"{actor}.webp"
            with Image.open(path) as opened:
                verify(opened.convert("RGBA"), actor)
        print(f"Verified {len(ACTORS)} battle sheets.")
        return

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    sheets: dict[str, Image.Image] = {}
    for actor in ACTORS:
        sheet = build_actor(actor)
        verify(sheet, actor)
        sheet.save(OUTPUT_DIR / f"{actor}.webp", "WEBP", lossless=True, method=6)
        sheets[actor] = sheet

    review = review_sheet(sheets)
    REVIEW_PATH.parent.mkdir(parents=True, exist_ok=True)
    review.save(REVIEW_PATH, "WEBP", lossless=True, method=6)
    print(f"Built {len(ACTORS)} battle sheets and {REVIEW_PATH}.")


if __name__ == "__main__":
    main()
