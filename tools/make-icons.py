from PIL import Image, ImageDraw

RED, GREEN, YELLOW, BLUE = "#F0544F", "#3FBF6F", "#FFC531", "#4A9BE8"
CREAM = "#FFF6E5"

def rounded(d, box, r, fill):
    d.rounded_rectangle(box, radius=r, fill=fill)

def board(size, pad_ratio=0.06, bg=CREAM, radius_ratio=0.20):
    S = size * 4  # supersample
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    rounded(d, (0, 0, S, S), int(S * radius_ratio), bg)

    p = int(S * pad_ratio)
    inner = S - 2 * p
    cell = inner / 15.0
    def C(a, b): return p + a * cell, p + b * cell

    yard = 5.6 * cell
    r = int(cell * 1.0)
    for (col, ox, oy) in [(RED, 0.2, 0.2), (GREEN, 9.2, 0.2), (YELLOW, 9.2, 9.2), (BLUE, 0.2, 9.2)]:
        x, y = C(ox, oy)
        rounded(d, (x, y, x + yard, y + yard), r, col)
        x2, y2 = C(ox + 1.0, oy + 1.0)
        rounded(d, (x2, y2, x2 + 3.6 * cell, y2 + 3.6 * cell), int(cell * 0.7), "#FFFDF6")

    # cross arms
    x, y = C(6, 0.2); rounded(d, (x, y, x + 3 * cell, y + 14.6 * cell), int(cell * .5), "#FFFDF6")
    x, y = C(0.2, 6); rounded(d, (x, y, x + 14.6 * cell, y + 3 * cell), int(cell * .5), "#FFFDF6")

    # coloured home columns
    x, y = C(1, 7); d.rectangle((x, y, x + 5 * cell, y + cell), fill=RED)
    x, y = C(7, 1); d.rectangle((x, y, x + cell, y + 5 * cell), fill=GREEN)
    x, y = C(9, 7); d.rectangle((x, y, x + 5 * cell, y + cell), fill=YELLOW)
    x, y = C(7, 9); d.rectangle((x, y, x + cell, y + 5 * cell), fill=BLUE)

    # centre
    cx, cy = C(7.5, 7.5)
    x0, y0 = C(6, 6); x1, y1 = C(9, 9)
    d.polygon([(cx, cy), (x0, y0), (x0, y1)], fill=RED)
    d.polygon([(cx, cy), (x0, y0), (x1, y0)], fill=GREEN)
    d.polygon([(cx, cy), (x1, y0), (x1, y1)], fill=YELLOW)
    d.polygon([(cx, cy), (x0, y1), (x1, y1)], fill=BLUE)

    return img.resize((size, size), Image.LANCZOS)

board(192).save("icons/icon-192.png")
board(512).save("icons/icon-512.png")
board(180, bg=CREAM).save("icons/apple-touch-icon.png")
# maskable: extra padding so the safe zone survives circular masks
board(512, pad_ratio=0.19, radius_ratio=0.0).save("icons/icon-maskable-512.png")
print("icons written")
