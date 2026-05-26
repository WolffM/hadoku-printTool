"""
Generate a Riftbound-styled cardback PNG.

Outputs `scripts/assets/cardback.png` — 750×1050 (2.5" × 3.5" @ 300 DPI).
Replace this file with a real cardback image if you have one; the print
script (`print_riftbound_deck.py`) picks up whatever is at this path.

Style: navy blue ground, gold ornamental double-line border, gold
LEAGUE OF LEGENDS text + a stylized hexagonal frame in the middle.
Inspired by the photographic reference at cardgamer.com without
attempting to copy it pixel-for-pixel — this is a clean placeholder.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

W, H = 750, 1050  # 2.5" × 3.5" @ 300 DPI
NAVY = (16, 32, 64)         # base background
NAVY_DARK = (8, 18, 40)     # for radial darkening
GOLD = (212, 175, 55)        # primary gold
GOLD_DIM = (148, 122, 38)    # secondary gold

OUT_PATH = Path(__file__).resolve().parent / 'assets' / 'cardback.png'


def find_font(size: int) -> ImageFont.FreeTypeFont:
    """Try a few common system fonts; fall back to PIL default if none exist."""
    candidates = [
        'C:/Windows/Fonts/trajanpro-bold.ttf',
        'C:/Windows/Fonts/Cinzel-Bold.ttf',
        'C:/Windows/Fonts/georgiab.ttf',  # Georgia Bold — close enough
        'C:/Windows/Fonts/arial.ttf',
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def draw_border(d: ImageDraw.ImageDraw) -> None:
    """Ornamental double-line border with corner accents."""
    outer = 32
    inner = 48
    d.rectangle((outer, outer, W - outer, H - outer), outline=GOLD, width=4)
    d.rectangle((inner, inner, W - inner, H - inner), outline=GOLD_DIM, width=2)
    # Small corner crosshair accents at each corner.
    for cx, cy in [(outer, outer), (W - outer, outer), (outer, H - outer), (W - outer, H - outer)]:
        d.line((cx - 16, cy, cx + 16, cy), fill=GOLD, width=3)
        d.line((cx, cy - 16, cx, cy + 16), fill=GOLD, width=3)


def draw_hexagon(d: ImageDraw.ImageDraw, cx: int, cy: int, r: int, width: int) -> None:
    """Pointy-top hexagon centered at (cx, cy), circumradius r."""
    import math
    pts = []
    for i in range(6):
        a = math.radians(60 * i - 30)
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    pts.append(pts[0])
    d.line(pts, fill=GOLD, width=width)


def main() -> None:
    img = Image.new('RGB', (W, H), NAVY)
    d = ImageDraw.Draw(img)

    # Subtle radial darkening at corners — paint a soft dark rectangle gradient
    # by stacking translucent edge tiles. Cheap approximation, no scipy needed.
    overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    o = ImageDraw.Draw(overlay)
    for r in range(80, 0, -8):
        alpha = int(120 * (1 - r / 80))
        o.rectangle((r, r, W - r, H - r), outline=(0, 0, 0, alpha))
    img = Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')
    d = ImageDraw.Draw(img)

    draw_border(d)

    # Central hex stack (three concentric hexagons) — riffs on the
    # geometric motif on real Riftbound backs without copying it.
    cx, cy = W // 2, H // 2
    draw_hexagon(d, cx, cy, 230, 5)
    draw_hexagon(d, cx, cy, 200, 3)
    draw_hexagon(d, cx, cy, 130, 4)

    # "LEAGUE OF LEGENDS" stacked text inside the hex.
    f_big = find_font(60)
    f_small = find_font(26)
    for text, font, dy in [
        ('LEAGUE', f_big, -64),
        ('of', f_small, -8),
        ('LEGENDS', f_big, 32),
    ]:
        bbox = d.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        d.text(((W - tw) // 2, cy + dy - (bbox[3] - bbox[1]) // 2), text, font=font, fill=GOLD)

    # Bottom flourish: "RIFTBOUND" centered just inside the lower border.
    f_brand = find_font(34)
    bbox = d.textbbox((0, 0), 'RIFTBOUND', font=f_brand)
    tw = bbox[2] - bbox[0]
    d.text(((W - tw) // 2, H - 100), 'RIFTBOUND', font=f_brand, fill=GOLD_DIM)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT_PATH, optimize=True)
    print(f'wrote {OUT_PATH}  ({W}×{H})')


if __name__ == '__main__':
    main()
