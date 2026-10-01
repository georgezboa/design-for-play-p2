#!/usr/bin/env python3
"""Chapter 4 // THE PAINTED COUNTRY: Butch's pencil sprite sheet.

Source: the pencil walk cycle Chapter 6 already uses
(src/chapters/finalBoss/assets/paper/ch4-butch-walk-0..3.png, 190x340, grey +
alpha). At gameplay size (about 72 design px tall) the soft pencil of those
drawings melts into the paper, so each frame is:

  1. scaled to its display size (the game canvas is 960x600, scaled up by CSS),
  2. given firmer graphite (a value curve that deepens the pencil lines and
     leaves the paper-white of the coat alone),
  3. tinted a warm paper tone, so the coat is a shade of the sheet rather
     than screen white,
  4. ringed with a soft graphite contour (the draughtsman's outline), which
     is what makes him read against the paper at a glance.

Frames: walk 0-3 (the source cycle, 0 is the standing pose), then two poses
derived from them for the air: JUMP (stride frame 1, leaning into the jump,
stretched a touch) and FALL (frame 0, tipped back, compressed a touch).

Usage: python3 scripts/art/build-chapter4-butch-pencil.py
Output: src/chapters/paintedCountry/assets/butch-pencil/butch-pencil-sheet.png
"""
import os
import sys
from PIL import Image, ImageChops, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'src/chapters/finalBoss/assets/paper')
OUT = os.path.join(ROOT, 'src/chapters/paintedCountry/assets/butch-pencil/butch-pencil-sheet.png')

FIGURE_H = 76          # px of figure in the sheet: shown 1:1 (the canvas is 960x600)
CELL_W, CELL_H = 50, 82
FEET_PAD = 2            # px from the cell bottom to the soles
PAPER = (247, 244, 236)
TONE = (226, 217, 201)  # the coat: a shade of the sheet
LEAD = (52, 49, 44)


def load(i):
    im = Image.open(os.path.join(SRC, f'ch4-butch-walk-{i}.png')).convert('LA')
    return im


def firm(la):
    """Deepen the pencil, tint the paper-white, keep the alpha."""
    lum, alpha = la.split()
    # value curve: lines (dark) go darker, whites stay
    lut = []
    for v in range(256):
        t = v / 255.0
        t = t ** 1.9 if t < 0.82 else t
        lut.append(int(round(t * 255)))
    lum = lum.point(lut)
    rgb = Image.merge('RGB', (lum, lum, lum))
    tone = Image.new('RGB', rgb.size, TONE)
    rgb = ImageChops.multiply(rgb, tone)
    # multiply darkens the lines too; lift them back toward LEAD rather than black
    lead = Image.new('RGB', rgb.size, LEAD)
    rgb = ImageChops.lighter(rgb, lead)
    out = rgb.convert('RGBA')
    out.putalpha(alpha)
    return out


def contour(img, width):
    """A soft graphite ring round the silhouette, under the drawing."""
    a = img.split()[3].point(lambda v: 255 if v > 40 else 0)
    grown = a.filter(ImageFilter.MaxFilter(width * 2 + 1)).filter(ImageFilter.GaussianBlur(0.55))
    ring = Image.new('RGBA', img.size, LEAD + (0,))
    ring.putalpha(grown.point(lambda v: int(v * 0.92)))
    ring.alpha_composite(img)
    return ring


def fit(img, rotate=0.0, stretch=1.0):
    bbox = img.split()[3].getbbox()
    img = img.crop(bbox)
    scale = FIGURE_H / img.height
    w = max(1, round(img.width * scale))
    h = max(1, round(img.height * scale * stretch))
    img = img.resize((w, h), Image.LANCZOS)
    if rotate:
        img = img.rotate(rotate, resample=Image.BICUBIC, expand=True)
        img = img.crop(img.split()[3].getbbox())
    return img


def place(sheet, img, index):
    cell = Image.new('RGBA', (CELL_W, CELL_H), (0, 0, 0, 0))
    x = (CELL_W - img.width) // 2
    y = CELL_H - FEET_PAD - img.height
    cell.alpha_composite(img, (max(0, x), max(0, y)))
    sheet.alpha_composite(cell, (index * CELL_W, 0))


def main():
    frames = [firm(load(i)) for i in range(4)]
    poses = [fit(f) for f in frames]
    poses.append(fit(frames[1], rotate=-7, stretch=1.03))   # jump: lean in
    poses.append(fit(frames[0], rotate=5, stretch=0.97))    # fall: tip back
    sheet = Image.new('RGBA', (CELL_W * len(poses), CELL_H), (0, 0, 0, 0))
    for i, p in enumerate(poses):
        if p.width > CELL_W or p.height > CELL_H - FEET_PAD:
            sys.exit(f'frame {i} {p.size} does not fit the {CELL_W}x{CELL_H} cell')
        place(sheet, contour(p, 1), i)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    sheet.save(OUT, optimize=True)
    print(OUT, sheet.size)


if __name__ == '__main__':
    main()
