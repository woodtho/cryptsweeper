"""Build standardized transparent full-body sprites from generated roster sheets.

Requires Pillow. Source sheets are retained so crop boundaries can be adjusted
without regenerating the artwork.
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1] / "src" / "assets" / "sprites" / "fullbody"
FRAME = (192, 256)
EXPORT_SCALE = 2

SHEETS = [
    ("delvers-a.png", "delvers", [
        ("sapper", "Sapper", 0, 356),
        ("surveyor", "Surveyor", 356, 646),
        ("terraformer", "Terraformer", 646, 1015),
        ("lamplighter", "Lamplighter", 1015, 1357),
        ("gambler", "Gambler", 1357, 1717),
    ]),
    ("delvers-b.png", "delvers", [
        ("chirurgeon", "Chirurgeon", 0, 380),
        ("archivist", "Archivist", 380, 790),
        ("warden", "Warden", 790, 1225),
        ("hexwright", "Hexwright", 1225, 1600),
        ("revenant", "Revenant", 1600, 1983),
    ]),
    ("enemies-a.png", "enemies", [
        ("grubber", "Grubber", 0, 275),
        ("minelayer", "Minelayer Imp", 275, 550),
        ("stone-warden", "Stone Warden", 550, 900),
        ("wisp", "Fog Wisp", 900, 1058),
        ("shade", "Marsh Shade", 1058, 1320),
        ("tunneler", "Tunneler Grub", 1320, 1717),
    ]),
    ("enemies-b.png", "enemies", [
        ("clockwork", "Clockwork Sapper", 0, 330),
        ("gearhusk", "Gear Husk", 330, 725),
        ("ossuary", "Ossuary Warden", 725, 1084),
        ("miscounter", "The Miscounter", 1084, 1385),
        ("detonata", "Detonata", 1385, 1717),
    ]),
    ("rat-merchant-corrected.png", "npcs", [
        ("rat-merchant", "Rat Merchant", 0, 1088),
    ]),
    ("bosses-npc.png", "enemies", [
        ("collapser", "The Collapser", 421, 1058),
        ("fogfather", "The Fogfather", 1058, 1444),
        ("nn99", "NN-99", 1444, 1947),
    ]),
]

# A few source-sheet props cross an invisible cell boundary. These masks remove
# only the neighbouring subject's detached pixels while retaining the intended
# character's own silhouette and particles.
CLEANUPS = {
    ("delvers-a.png", "lamplighter"): [(0, 250, 15, 700)],  # Terraformer stone edge
    ("delvers-b.png", "archivist"): [(310, 500, 410, 793)],  # Warden's mace
    ("delvers-b.png", "warden"): [(0, 300, 35, 793)],       # clipped mace fragment
    ("enemies-a.png", "minelayer"): [(0, 450, 40, 916)],    # Grubber rubble
    ("enemies-b.png", "miscounter"): [(260, 450, 301, 916)],  # Detonata blade
}


def alpha_bbox(image: Image.Image):
    alpha = image.getchannel("A")
    # Ignore extremely faint matte pixels when trimming the generated sheet.
    mask = alpha.point(lambda value: 255 if value >= 12 else 0)
    return mask.getbbox()


def standardize(crop: Image.Image) -> Image.Image:
    bbox = alpha_bbox(crop)
    if not bbox:
        raise ValueError("Crop contains no visible sprite pixels")
    sprite = crop.crop(bbox)
    max_size = (FRAME[0] - 16, FRAME[1] - 16)
    ratio = min(max_size[0] / sprite.width, max_size[1] / sprite.height)
    size = (max(1, round(sprite.width * ratio)), max(1, round(sprite.height * ratio)))
    sprite = sprite.resize(size, Image.Resampling.NEAREST)
    canvas = Image.new("RGBA", FRAME, (0, 0, 0, 0))
    x = (FRAME[0] - size[0]) // 2
    y = FRAME[1] - 8 - size[1]
    canvas.alpha_composite(sprite, (x, y))
    return canvas.resize(
        (FRAME[0] * EXPORT_SCALE, FRAME[1] * EXPORT_SCALE),
        Image.Resampling.NEAREST,
    )


def build_review(entries):
    columns, card_w, card_h = 5, 420, 570
    rows = (len(entries) + columns - 1) // columns
    review = Image.new("RGB", (columns * card_w, rows * card_h), "#090d12")
    draw = ImageDraw.Draw(review)
    font = ImageFont.load_default(size=22)
    for index, (label, sprite) in enumerate(entries):
        col, row = index % columns, index // columns
        x, y = col * card_w, row * card_h
        draw.rectangle((x + 6, y + 6, x + card_w - 6, y + card_h - 6),
                       fill="#111923", outline="#8b7442", width=2)
        sprite_x = x + (card_w - sprite.width) // 2
        review.paste(sprite, (sprite_x, y + 18), sprite)
        text_box = draw.textbbox((0, 0), label, font=font)
        text_x = x + (card_w - (text_box[2] - text_box[0])) // 2
        draw.text((text_x, y + 530), label, font=font, fill="#e8d9b4")
    review_dir = ROOT / "review"
    review_dir.mkdir(parents=True, exist_ok=True)
    review.save(review_dir / "fullbody-roster.png", optimize=True)


def main():
    review_entries = []
    for sheet_name, category, sprites in SHEETS:
        sheet = Image.open(ROOT / "sheets" / sheet_name).convert("RGBA")
        output_dir = ROOT / category
        output_dir.mkdir(parents=True, exist_ok=True)
        for key, label, left, right in sprites:
            crop = sheet.crop((left, 0, right, sheet.height))
            for box in CLEANUPS.get((sheet_name, key), []):
                crop.paste((0, 0, 0, 0), box)
            frame = standardize(crop)
            frame.save(
                output_dir / f"{key}.webp",
                "WEBP",
                lossless=True,
                quality=100,
                method=6,
            )
            review_entries.append((label, frame))
    build_review(review_entries)
    print(f"Built {len(review_entries)} sprites and review/fullbody-roster.png")


if __name__ == "__main__":
    main()
