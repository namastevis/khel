"""Draws the Khel app icons. Run from the repo root:  python3 tools/make-icons.py

Four rounded tiles, one per colour, each with a simple white play shape —
a shelf of small things to play with, rather than any one game.
"""

from PIL import Image, ImageDraw

RED, GREEN, YELLOW, BLUE = "#F0544F", "#3FBF6F", "#FFC531", "#4A9BE8"
CREAM = "#FFF6E5"


def icon(size, pad_ratio=0.07, radius_ratio=0.22, bg=CREAM):
    S = size * 4                                   # supersample, then shrink
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((0, 0, S, S), radius=int(S * radius_ratio), fill=bg)

    p = int(S * pad_ratio)
    inner = S - 2 * p
    gap = inner * 0.055
    tile = (inner - gap) / 2
    r = int(tile * 0.26)

    def cell(col, row):
        x = p + col * (tile + gap)
        y = p + row * (tile + gap)
        return x, y, x + tile, y + tile

    # top-left: red, with a die pip pattern
    x0, y0, x1, y1 = cell(0, 0)
    d.rounded_rectangle((x0, y0, x1, y1), radius=r, fill=RED)
    pip = tile * 0.085
    for fx, fy in ((0.30, 0.30), (0.50, 0.50), (0.70, 0.70)):
        cx, cy = x0 + tile * fx, y0 + tile * fy
        d.ellipse((cx - pip, cy - pip, cx + pip, cy + pip), fill="#FFFDF6")

    # top-right: green, with a circle (a counter)
    x0, y0, x1, y1 = cell(1, 0)
    d.rounded_rectangle((x0, y0, x1, y1), radius=r, fill=GREEN)
    rr = tile * 0.22
    cx, cy = x0 + tile / 2, y0 + tile / 2
    d.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), outline="#FFFDF6", width=int(tile * 0.09))

    # bottom-left: blue, with a triangle
    x0, y0, x1, y1 = cell(0, 1)
    d.rounded_rectangle((x0, y0, x1, y1), radius=r, fill=BLUE)
    d.polygon([
        (x0 + tile * 0.50, y0 + tile * 0.26),
        (x0 + tile * 0.76, y0 + tile * 0.72),
        (x0 + tile * 0.24, y0 + tile * 0.72),
    ], fill="#FFFDF6")

    # bottom-right: yellow, with a star
    x0, y0, x1, y1 = cell(1, 1)
    d.rounded_rectangle((x0, y0, x1, y1), radius=r, fill=YELLOW)
    star(d, x0 + tile / 2, y0 + tile / 2, tile * 0.30, "#FFFDF6")

    return img.resize((size, size), Image.LANCZOS)


def star(d, cx, cy, r, fill):
    from math import cos, sin, pi
    pts = []
    for i in range(10):
        rad = r if i % 2 == 0 else r * 0.45
        a = pi / 5 * i - pi / 2
        pts.append((cx + cos(a) * rad, cy + sin(a) * rad))
    d.polygon(pts, fill=fill)


icon(192).save("icons/icon-192.png")
icon(512).save("icons/icon-512.png")
icon(180).save("icons/apple-touch-icon.png")
# maskable: extra padding, no rounding — the platform crops its own shape
icon(512, pad_ratio=0.20, radius_ratio=0.0).save("icons/icon-maskable-512.png")
print("icons written")
