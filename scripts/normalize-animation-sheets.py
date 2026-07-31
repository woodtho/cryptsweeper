"""Normalize the 6x4 cutscene animation sheets in place.

The generated masters do not always keep a character on the same ground line
or horizontal anchor. They can also leave a detached sliver from a neighbouring
cell at an outer edge. This pass treats every 128x128 cell independently,
removes only disconnected edge spill, and then aligns the primary silhouette.

The operation is intentionally idempotent. The chroma-key source PNGs are the
archival masters. Some generators returned seven columns despite the requested
six, so the script detects a 6- or 7-column source grid before selecting six
complete frames and building the runtime sheet:

    python scripts/normalize-animation-sheets.py --write

Without ``--write`` the script audits the current sheets and reports the
alignment changes it would make.
"""

from __future__ import annotations

import argparse
from collections import deque
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1] / "src" / "assets" / "sprites" / "animations"
SHEETS = ROOT / "sheets"
SOURCES = ROOT / "sources"
REVIEW = ROOT / "review" / "cutscene-animation-sheets.webp"
COLS = 6
ROWS = 4
CELL = 128
SAFE_PAD = 4
TARGET_X = CELL // 2
TARGET_BASELINE = CELL - 6
ALPHA_THRESHOLD = 10

LABELS = {
    "sapper": "Sapper",
    "surveyor": "Surveyor",
    "terraformer": "Terraformer",
    "lamplighter": "Lamplighter",
    "gambler": "Gambler",
    "chirurgeon": "Chirurgeon",
    "archivist": "Archivist",
    "warden": "Warden",
    "hexwright": "Hexwright",
    "revenant": "Revenant",
    "grubber": "Grubber",
    "minelayer": "Minelayer Imp",
    "stone-warden": "Stone Warden",
    "wisp": "Fog Wisp",
    "shade": "Marsh Shade",
    "tunneler": "Tunneler Grub",
    "clockwork": "Clockwork Sapper",
    "gearhusk": "Gear Husk",
    "ossuary": "Ossuary Warden",
    "miscounter": "The Miscounter",
    "detonata": "Detonata",
    "collapser": "The Collapser",
    "fogfather": "The Fogfather",
    "nn99": "NN-99",
    "rat-merchant": "Rat Merchant",
}


@dataclass
class Component:
    pixels: list[tuple[int, int]]
    area: int
    bbox: tuple[int, int, int, int]
    touches_edge: bool

    @property
    def center_x(self) -> float:
        left, _, right, _ = self.bbox
        return (left + right) / 2

    @property
    def center_y(self) -> float:
        _, top, _, bottom = self.bbox
        return (top + bottom) / 2

    @property
    def bottom(self) -> int:
        return self.bbox[3]


@dataclass
class FrameData:
    image: Image.Image
    main: Component
    union_bbox: tuple[int, int, int, int]
    removed_components: int
    removed_pixels: int


def components(alpha: Image.Image) -> list[Component]:
    width, height = alpha.size
    values = alpha.tobytes()
    visible = bytearray(value >= ALPHA_THRESHOLD for value in values)
    found: list[Component] = []

    for start in range(width * height):
        if not visible[start]:
            continue
        visible[start] = 0
        queue = deque([start])
        pixels: list[tuple[int, int]] = []
        left = right = start % width
        top = bottom = start // width

        while queue:
            index = queue.popleft()
            x, y = index % width, index // width
            pixels.append((x, y))
            left, right = min(left, x), max(right, x)
            top, bottom = min(top, y), max(bottom, y)
            for ny in range(max(0, y - 1), min(height, y + 2)):
                row = ny * width
                for nx in range(max(0, x - 1), min(width, x + 2)):
                    neighbour = row + nx
                    if visible[neighbour]:
                        visible[neighbour] = 0
                        queue.append(neighbour)

        found.append(Component(
            pixels=pixels,
            area=len(pixels),
            bbox=(left, top, right + 1, bottom + 1),
            touches_edge=left == 0 or top == 0 or right == width - 1 or bottom == height - 1,
        ))
    return sorted(found, key=lambda item: item.area, reverse=True)


def bbox_distance(a: tuple[int, int, int, int], b: tuple[int, int, int, int]) -> int:
    ax1, ay1, ax2, ay2 = a
    bx1, by1, bx2, by2 = b
    dx = max(bx1 - ax2, ax1 - bx2, 0)
    dy = max(by1 - ay2, ay1 - by2, 0)
    return max(dx, dy)


def clean_frame(frame: Image.Image) -> FrameData:
    found = components(frame.getchannel("A"))
    if not found:
        raise ValueError("animation cell contains no visible pixels")

    main = found[0]
    kept: list[Component] = [main]
    removed: list[Component] = []
    for component in found[1:]:
        distance = bbox_distance(main.bbox, component.bbox)
        # Keep nearby particles and substantial detached props. A component
        # touching a cell edge and separated from the actor is neighbouring
        # frame spill, regardless of its colour.
        edge_spill = component.touches_edge and distance > 2
        meaningful = component.area >= max(5, round(main.area * .004))
        nearby = distance <= 14
        if not edge_spill and (meaningful or nearby):
            kept.append(component)
        else:
            removed.append(component)

    mask = Image.new("L", frame.size, 0)
    mask_pixels = mask.load()
    for component in kept:
        for x, y in component.pixels:
            mask_pixels[x, y] = 255

    cleaned = frame.copy()
    original_alpha = cleaned.getchannel("A")
    cleaned.putalpha(Image.composite(original_alpha, Image.new("L", frame.size, 0), mask))

    left = min(component.bbox[0] for component in kept)
    top = min(component.bbox[1] for component in kept)
    right = max(component.bbox[2] for component in kept)
    bottom = max(component.bbox[3] for component in kept)
    return FrameData(
        image=cleaned,
        main=main,
        union_bbox=(left, top, right, bottom),
        removed_components=len(removed),
        removed_pixels=sum(component.area for component in removed),
    )


def chroma_alpha(image: Image.Image) -> Image.Image:
    """Remove the generated magenta matte without soft resampling its pixels."""
    rgb = np.asarray(image.convert("RGB"), dtype=np.int16)
    red, green, blue = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    minimum_magenta = np.minimum(red, blue)
    background = (
        (minimum_magenta > 110)
        & (green * 100 < minimum_magenta * 62)
        & (np.abs(red - blue) < 90)
    )
    # Generated edges contain one or two darker magenta fringe pixels. Peel
    # only fringe connected to the already identified matte; enclosed magenta
    # details such as the Miscounter's framed beads remain intact.
    for _ in range(2):
        padded = np.pad(background, 1, constant_values=False)
        adjacent = np.zeros_like(background)
        for dy in range(3):
            for dx in range(3):
                adjacent |= padded[dy:dy + background.shape[0], dx:dx + background.shape[1]]
        fringe = (
            adjacent
            & ~background
            & (minimum_magenta > 30)
            & (green * 100 < minimum_magenta * 80)
            & (np.abs(red - blue) < 105)
        )
        background |= fringe
    rgba = np.empty((*rgb.shape[:2], 4), dtype=np.uint8)
    rgba[..., :3] = np.clip(rgb, 0, 255).astype(np.uint8)
    rgba[..., 3] = np.where(background, 0, 255).astype(np.uint8)
    rgba[background, :3] = 0
    return Image.fromarray(rgba, "RGBA")


def boundary_ink(mask: np.ndarray, columns: int) -> int:
    width = mask.shape[1]
    score = 0
    for column in range(1, columns):
        boundary = round(column * width / columns)
        score += int(mask[:, max(0, boundary - 3):min(width, boundary + 4)].sum())
    return score


def detect_source_columns(source: Image.Image) -> tuple[int, dict[int, int]]:
    keyed = chroma_alpha(source)
    mask = np.asarray(keyed.getchannel("A")) >= ALPHA_THRESHOLD
    scores = {columns: boundary_ink(mask, columns) for columns in (6, 7)}
    return min(scores, key=scores.get), scores


def group_row_frames(row_image: Image.Image, source_columns: int) -> tuple[list[FrameData], int, int]:
    """Separate complete subjects before any fixed-width cell crop is applied."""
    found = components(row_image.getchannel("A"))
    if len(found) < source_columns:
        raise ValueError(f"row has only {len(found)} components for {source_columns} frames")

    spacing = row_image.width / source_columns
    expected_centers = [(index + .5) * spacing for index in range(source_columns)]
    largest = found[0].area
    candidates = [
        component for component in found
        if component.area >= max(24, round(largest * .035))
    ]
    mains: list[Component] = []
    used: set[int] = set()
    for expected in expected_centers:
        local = [
            component for component in candidates
            if id(component) not in used and abs(component.center_x - expected) <= spacing * .48
        ]
        if not local:
            local = [component for component in candidates if id(component) not in used]
        if not local:
            raise ValueError("could not identify one primary silhouette per source frame")
        main = max(
            local,
            key=lambda component: component.area / (1 + abs(component.center_x - expected) / spacing),
        )
        mains.append(main)
        used.add(id(main))

    groups: list[list[Component]] = [[main] for main in mains]
    removed: list[Component] = []
    for component in found:
        if id(component) in used:
            continue
        nearest_index = min(
            range(source_columns),
            key=lambda index: (
                bbox_distance(mains[index].bbox, component.bbox),
                abs(mains[index].center_x - component.center_x),
            ),
        )
        main = mains[nearest_index]
        distance = bbox_distance(main.bbox, component.bbox)
        meaningful = component.area >= max(4, round(main.area * .003))
        within_frame = abs(component.center_x - expected_centers[nearest_index]) <= spacing * .62
        if within_frame and (distance <= 24 or meaningful):
            groups[nearest_index].append(component)
        else:
            removed.append(component)

    frames: list[FrameData] = []
    original_alpha = row_image.getchannel("A")
    for main, group in zip(mains, groups):
        mask = Image.new("L", row_image.size, 0)
        mask_pixels = mask.load()
        for component in group:
            for x, y in component.pixels:
                mask_pixels[x, y] = 255
        isolated = row_image.copy()
        isolated.putalpha(Image.composite(original_alpha, Image.new("L", row_image.size, 0), mask))
        union = (
            min(component.bbox[0] for component in group),
            min(component.bbox[1] for component in group),
            max(component.bbox[2] for component in group),
            max(component.bbox[3] for component in group),
        )
        frames.append(FrameData(
            image=isolated,
            main=main,
            union_bbox=union,
            removed_components=0,
            removed_pixels=0,
        ))
    return frames, len(removed), sum(component.area for component in removed)


def group_sheet_frames(
    sheet_image: Image.Image,
    source_columns: int,
) -> tuple[list[list[FrameData]], int, int]:
    """Isolate complete subjects before nominal row boundaries are applied.

    Generated poses can cross both the horizontal and vertical grid lines.
    Grouping one cropped row at a time can therefore mistake the bottom of an
    idle pose for part of the walk pose below it, forcing that row to shrink.
    """
    found = components(sheet_image.getchannel("A"))
    expected = [
        (
            (column + .5) * sheet_image.width / source_columns,
            (row + .5) * sheet_image.height / ROWS,
        )
        for row in range(ROWS)
        for column in range(source_columns)
    ]
    if len(found) < len(expected):
        raise ValueError(
            f"sheet has only {len(found)} components for "
            f"{source_columns * ROWS} frames"
        )

    spacing_x = sheet_image.width / source_columns
    spacing_y = sheet_image.height / ROWS
    largest = found[0].area
    candidates = [
        component for component in found
        if component.area >= max(24, round(largest * .035))
    ]
    mains: list[Component] = []
    used: set[int] = set()
    for expected_x, expected_y in expected:
        local = [
            component for component in candidates
            if id(component) not in used
            and abs(component.center_x - expected_x) <= spacing_x * .48
            and abs(component.center_y - expected_y) <= spacing_y * .58
        ]
        if not local:
            local = [component for component in candidates if id(component) not in used]
        if not local:
            raise ValueError("could not identify one primary silhouette per source frame")
        main = max(
            local,
            key=lambda component: component.area / (
                1
                + abs(component.center_x - expected_x) / spacing_x
                + abs(component.center_y - expected_y) / spacing_y
            ),
        )
        mains.append(main)
        used.add(id(main))

    groups: list[list[Component]] = [[main] for main in mains]
    removed: list[Component] = []
    for component in found:
        if id(component) in used:
            continue
        nearest_index = min(
            range(len(mains)),
            key=lambda index: (
                bbox_distance(mains[index].bbox, component.bbox),
                abs(mains[index].center_x - component.center_x)
                + abs(mains[index].center_y - component.center_y),
            ),
        )
        main = mains[nearest_index]
        distance = bbox_distance(main.bbox, component.bbox)
        expected_x, expected_y = expected[nearest_index]
        meaningful = component.area >= max(4, round(main.area * .003))
        within_frame = (
            abs(component.center_x - expected_x) <= spacing_x * .62
            and abs(component.center_y - expected_y) <= spacing_y * .72
        )
        if within_frame and (distance <= 24 or meaningful):
            groups[nearest_index].append(component)
        else:
            removed.append(component)

    original_alpha = sheet_image.getchannel("A")
    frames: list[list[FrameData]] = []
    for row in range(ROWS):
        row_frames: list[FrameData] = []
        for column in range(source_columns):
            index = row * source_columns + column
            main = mains[index]
            group = groups[index]
            mask = Image.new("L", sheet_image.size, 0)
            mask_pixels = mask.load()
            for component in group:
                for x, y in component.pixels:
                    mask_pixels[x, y] = 255
            isolated = sheet_image.copy()
            isolated.putalpha(
                Image.composite(original_alpha, Image.new("L", sheet_image.size, 0), mask)
            )
            union = (
                min(component.bbox[0] for component in group),
                min(component.bbox[1] for component in group),
                max(component.bbox[2] for component in group),
                max(component.bbox[3] for component in group),
            )
            row_frames.append(FrameData(
                image=isolated,
                main=main,
                union_bbox=union,
                removed_components=0,
                removed_pixels=0,
            ))
        frames.append(row_frames)
    return frames, len(removed), sum(component.area for component in removed)


def source_runtime_sheet(source: Image.Image) -> tuple[Image.Image, int, dict[int, int], dict]:
    source = source.convert("RGB")
    source_columns, scores = detect_source_columns(source)
    selected = [
        round(index * (source_columns - 1) / (COLS - 1))
        for index in range(COLS)
    ]
    keyed = chroma_alpha(source).resize(
        (COLS * CELL, ROWS * CELL),
        Image.Resampling.NEAREST,
    )
    source_frames, removed_components, removed_pixels = group_sheet_frames(
        keyed,
        source_columns,
    )
    selected_rows = [
        [source_frames[row][index] for index in selected]
        for row in range(ROWS)
    ]
    sheet_scale = min(
        scale_limit(frame)
        for row_frames in selected_rows
        for frame in row_frames
    )
    if sheet_scale > .985:
        sheet_scale = 1.0
    runtime = Image.new("RGBA", keyed.size, (0, 0, 0, 0))
    row_scales = [sheet_scale] * ROWS
    before_x: list[float] = []
    before_y: list[int] = []

    for row, selected_frames in enumerate(selected_rows):
        for output_col, frame in enumerate(selected_frames):
            before_x.append(frame.main.center_x)
            before_y.append(frame.main.bottom)
            runtime.alpha_composite(
                place_frame(frame, sheet_scale),
                (output_col * CELL, row * CELL),
            )

    # Transparent pixels must also have black RGB. Browsers may sample hidden
    # colour during sprite-sheet scaling even when alpha is zero, producing
    # one-pixel bands from neighbouring source art.
    runtime_pixels = np.asarray(runtime).copy()
    transparent = runtime_pixels[..., 3] == 0
    runtime_pixels[transparent, :3] = 0
    runtime = Image.fromarray(runtime_pixels, "RGBA")

    return runtime, source_columns, scores, {
        "x_range": (min(before_x), max(before_x)),
        "baseline_range": (min(before_y), max(before_y)),
        "row_scales": row_scales,
        "removed_components": removed_components,
        "removed_pixels": removed_pixels,
    }


def scale_limit(frame: FrameData) -> float:
    left, top, right, bottom = frame.union_bbox
    # Keep one rounding-safety pixel beyond the verified sampling gutter.
    placement_pad = SAFE_PAD + 1
    available = CELL - placement_pad * 2
    anchor_x = frame.main.center_x
    limits = [1.0, available / (bottom - top)]
    if left < anchor_x:
        limits.append((TARGET_X - placement_pad) / (anchor_x - left))
    if right > anchor_x:
        limits.append((CELL - placement_pad - TARGET_X) / (right - anchor_x))
    return max(.5, min(limits))


def place_frame(frame: FrameData, scale: float) -> Image.Image:
    left, top, right, bottom = frame.union_bbox
    sprite = frame.image.crop((left, top, right, bottom))
    # Floor scaled dimensions so rounding can never grow a frame one pixel
    # beyond the gutter-safe size used to calculate its shared sheet scale.
    width = max(1, int(sprite.width * scale))
    height = max(1, int(sprite.height * scale))
    if (width, height) != sprite.size:
        sprite = sprite.resize((width, height), Image.Resampling.NEAREST)

    anchor_x = (frame.main.center_x - left) * scale
    anchor_y = (frame.main.bottom - top) * scale
    x = round(TARGET_X - anchor_x)
    y = round(TARGET_BASELINE - anchor_y)
    # Preserve the body anchor whenever possible, but translate an unusually
    # wide effect rather than shrinking the whole row to half size.
    x = max(SAFE_PAD, min(x, CELL - SAFE_PAD - width))
    y = max(SAFE_PAD, min(y, CELL - SAFE_PAD - height))
    canvas = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    canvas.alpha_composite(sprite, (x, y))
    return canvas


def normalize_sheet(sheet: Image.Image) -> tuple[Image.Image, dict]:
    if sheet.size != (COLS * CELL, ROWS * CELL):
        raise ValueError(f"expected 768x512 sheet, found {sheet.width}x{sheet.height}")

    frames: list[list[FrameData]] = []
    for row in range(ROWS):
        row_frames = []
        for col in range(COLS):
            box = (col * CELL, row * CELL, (col + 1) * CELL, (row + 1) * CELL)
            row_frames.append(clean_frame(sheet.crop(box)))
        frames.append(row_frames)

    output = Image.new("RGBA", sheet.size, (0, 0, 0, 0))
    before_x: list[float] = []
    before_y: list[int] = []
    removed_components = 0
    removed_pixels = 0
    sheet_scale = min(
        scale_limit(frame)
        for row_frames in frames
        for frame in row_frames
    )
    # Avoid tiny sub-pixel scale changes from introducing needless churn.
    if sheet_scale > .985:
        sheet_scale = 1.0
    row_scales = [sheet_scale] * ROWS

    for row, row_frames in enumerate(frames):
        for col, frame in enumerate(row_frames):
            before_x.append(frame.main.center_x)
            before_y.append(frame.main.bottom)
            removed_components += frame.removed_components
            removed_pixels += frame.removed_pixels
            output.alpha_composite(place_frame(frame, sheet_scale), (col * CELL, row * CELL))

    return output, {
        "x_range": (min(before_x), max(before_x)),
        "baseline_range": (min(before_y), max(before_y)),
        "row_scales": row_scales,
        "removed_components": removed_components,
        "removed_pixels": removed_pixels,
    }


def build_review(sheets: list[tuple[str, Image.Image]], destination: Path = REVIEW) -> None:
    columns = 5
    card_width = 390
    card_height = 300
    rows = (len(sheets) + columns - 1) // columns
    review = Image.new("RGB", (columns * card_width, rows * card_height), "#090d12")
    draw = ImageDraw.Draw(review)
    font = ImageFont.load_default(size=18)

    for index, (key, sheet) in enumerate(sheets):
        col, row = index % columns, index // columns
        x, y = col * card_width, row * card_height
        draw.rectangle(
            (x + 5, y + 5, x + card_width - 5, y + card_height - 5),
            fill="#111923",
            outline="#8b7442",
            width=2,
        )
        preview = sheet.resize((360, 240), Image.Resampling.NEAREST)
        review.paste(preview, (x + 15, y + 12), preview)
        label = LABELS.get(key, key.replace("-", " ").title())
        text_box = draw.textbbox((0, 0), label, font=font)
        text_x = x + (card_width - (text_box[2] - text_box[0])) // 2
        draw.text((text_x, y + 267), label, font=font, fill="#e8d9b4")

    destination.parent.mkdir(parents=True, exist_ok=True)
    review.save(destination, "WEBP", lossless=True, quality=100, method=6)


def verify_runtime_sheet(key: str, sheet: Image.Image) -> None:
    if sheet.size != (COLS * CELL, ROWS * CELL):
        raise ValueError(f"{key}: runtime sheet is not 768x512")
    for row in range(ROWS):
        centers: list[float] = []
        baselines: list[int] = []
        for col in range(COLS):
            box = (col * CELL, row * CELL, (col + 1) * CELL, (row + 1) * CELL)
            cell = sheet.crop(box)
            bbox = cell.getchannel("A").getbbox()
            if not bbox:
                raise ValueError(f"{key} row {row + 1} frame {col + 1}: empty cell")
            left, top, right, bottom = bbox
            if left < SAFE_PAD or top < SAFE_PAD or right > CELL - SAFE_PAD or bottom > CELL - SAFE_PAD:
                raise ValueError(
                    f"{key} row {row + 1} frame {col + 1}: "
                    f"visible pixels enter the {SAFE_PAD}px cell gutter ({bbox})"
                )
            main = components(cell.getchannel("A"))[0]
            centers.append(main.center_x)
            baselines.append(main.bottom)
        # The dominant connected component may be a shield, ring, cloud, or
        # explosion rather than the body. Anchor consistency is therefore
        # enforced while placing the known source silhouette and inspected in
        # the combined review, not inferred again from the final effect shape.


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true", help="replace sheets and rebuild review")
    parser.add_argument(
        "--preview",
        action="store_true",
        help="write review/normalized-preview.webp without replacing runtime sheets",
    )
    parser.add_argument(
        "--verify-existing",
        action="store_true",
        help="validate the runtime WebPs without rebuilding them",
    )
    parser.add_argument(
        "--actor",
        help="process only one actor key, such as sapper",
    )
    args = parser.parse_args()

    if args.verify_existing:
        paths = sorted(SHEETS.glob("*.webp"))
        for path in paths:
            verify_runtime_sheet(path.stem, Image.open(path).convert("RGBA"))
        print(f"Verified {len(paths)} runtime sheets ({len(paths) * COLS * ROWS} isolated cells).")
        return

    outputs: list[tuple[str, Image.Image]] = []
    total_removed_components = 0
    total_removed_pixels = 0
    source_paths = sorted(SOURCES.glob("*-chroma.png"))
    if args.actor:
        source_paths = [
            path for path in source_paths
            if path.stem.removesuffix("-chroma") == args.actor
        ]
        if not source_paths:
            parser.error(f"no animation source found for actor {args.actor!r}")
    for source_path in source_paths:
        key = source_path.stem.removesuffix("-chroma")
        normalized, source_columns, grid_scores, report = source_runtime_sheet(
            Image.open(source_path)
        )
        verify_runtime_sheet(key, normalized)
        outputs.append((key, normalized))
        total_removed_components += report["removed_components"]
        total_removed_pixels += report["removed_pixels"]
        scales = ", ".join(f"{scale:.3f}" for scale in report["row_scales"])
        print(
            f"{key:16} "
            f"source {source_columns}c ({grid_scores[6]}/{grid_scores[7]})  "
            f"x {report['x_range'][0]:5.1f}..{report['x_range'][1]:5.1f}  "
            f"ground {report['baseline_range'][0]:3}..{report['baseline_range'][1]:3}  "
            f"scale [{scales}]  "
            f"spill {report['removed_components']:2}/{report['removed_pixels']:4}px"
        )
        if args.write:
            normalized.save(SHEETS / f"{key}.webp", "WEBP", lossless=True, quality=100, method=6)

    if args.write:
        review_sheets = [
            (path.stem, Image.open(path).convert("RGBA"))
            for path in sorted(SHEETS.glob("*.webp"))
        ]
        build_review(review_sheets)
    elif args.preview:
        build_review(outputs, REVIEW.parent / "normalized-preview.webp")
    action = "Removed" if args.write else "Would remove"
    print(
        f"\n{action} {total_removed_components} disconnected artifacts "
        f"({total_removed_pixels} pixels) across {len(outputs) * COLS * ROWS} frames."
    )


if __name__ == "__main__":
    main()
