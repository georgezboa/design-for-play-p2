"""Stand-ins for the painted title while George's paintings are not in (dev only, never shipped).

    python3 -I scripts/title-art/make_standins.py <art-src/title-standin> <art-src/ch1>

Reads proc-room.png / proc-outside.png (the round-6 procedural title captured at 1536x1024, the room with its
glass cut out) and writes TT-*.png in the brief's own format (pure green where the game keys), so the build
treats them exactly like the real paintings.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SRC = Path(sys.argv[1])
CH1 = Path(sys.argv[2])
GREEN = (0, 255, 0)
W, H = 1536, 1024
rng = np.random.default_rng(7)


def on_green(rgba):
    bg = Image.new('RGBA', rgba.size, GREEN + (255,))
    bg.alpha_composite(rgba)
    return bg.convert('RGB')


room = Image.open(SRC / 'proc-room.png').convert('RGBA')
# the end door's little window (the round-6 layout at 1536 x 1024) is painted in: key it too
a = np.array(room)
a[220:481, 1432:1510, 3] = 0
room = Image.fromarray(a)
carriage = on_green(room)
carriage.save(SRC / 'TT-carriage.png')

lit = np.array(carriage).astype(np.float32)
keyed = (lit[..., 1] > 250) & (lit[..., 0] < 5) & (lit[..., 2] < 5)
warm = np.array([255, 150, 70], np.float32)
screen = 255 - (255 - lit) * (255 - warm * 0.4) / 255
screen[keyed] = GREEN
Image.fromarray(screen.clip(0, 255).astype(np.uint8)).save(SRC / 'TT-carriage-lit.png')

Image.open(SRC / 'proc-outside.png').convert('RGB').resize((W, H), Image.LANCZOS).save(SRC / 'TT-sky.png')


def strip(name, top, bottom, amp, colour, bumps, seed):
    r = np.random.default_rng(seed)
    img = Image.new('RGB', (W, H), GREEN)
    d = ImageDraw.Draw(img)
    xs = np.arange(W + 1)
    y = np.full(W + 1, (top + bottom) / 2 * H)
    for k in range(1, 6):
        # whole periods across the width: the strip tiles
        y += amp * H / k * np.sin(2 * np.pi * k * xs / W + r.uniform(0, 6.28))
    pts = [(0, H)] + [(int(x), int(v)) for x, v in zip(xs, y)] + [(W, H)]
    d.polygon(pts, fill=colour)
    for _ in range(bumps):
        cx = r.uniform(0, W)
        cy = np.interp(cx, xs, y)
        rr = r.uniform(18, 46)
        for dx in (-W, 0, W):
            d.ellipse([cx + dx - rr, cy - rr * 1.6, cx + dx + rr, cy + rr * 0.4], fill=colour)
    img.save(SRC / f'TT-{name}.png')


strip('hills', 0.45, 0.60, 0.025, (22, 30, 44), 6, 1)
strip('orchard', 0.60, 0.72, 0.02, (12, 18, 22), 40, 2)
tr = Image.new('RGB', (W, H), GREEN)
band = Image.new('RGB', (W, int(H * 0.25)), (16, 20, 18))
noise = (rng.random((band.height, W)) * 40).astype(np.uint8)
band = Image.fromarray(np.dstack([noise // 2 + 10, noise // 2 + 14, noise // 2 + 12]).astype(np.uint8)).filter(ImageFilter.BoxBlur(1))
band = band.resize((W // 16, band.height)).resize((W, band.height), Image.BILINEAR)
tr.paste(band, (0, H - band.height))
tr.save(SRC / 'TT-trackside.png')

pole = Image.new('RGB', (1024, 1536), GREEN)
d = ImageDraw.Draw(pole)
d.rectangle([497, 120, 527, 1536], fill=(26, 20, 16))
d.rectangle([400, 170, 624, 190], fill=(26, 20, 16))
for x in (415, 465, 559, 609):
    d.ellipse([x - 7, 150, x + 7, 172], fill=(120, 140, 150))
pole.save(SRC / 'TT-pole.png')
lamp = Image.new('RGB', (1024, 1536), GREEN)
d = ImageDraw.Draw(lamp)
d.rectangle([502, 330, 522, 1536], fill=(24, 20, 18))
d.rectangle([470, 276, 554, 340], fill=(40, 30, 20))
d.rectangle([480, 286, 544, 330], fill=(250, 190, 110))
lamp.save(SRC / 'TT-lamp.png')

Image.open(CH1 / 'A2-aisle.png').convert('RGB').save(SRC / 'TT-next-carriage.png')
print('stand-ins written')
