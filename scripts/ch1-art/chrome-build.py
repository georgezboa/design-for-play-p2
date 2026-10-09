#!/usr/bin/env python3
"""Chapter 1 chrome: the matte bezel atlas and the walnut wall tile.

Regenerates every runtime chrome asset from George's painted source sheet
(C-bezel.png: a worn brass bezel on the left and a walnut panel on the
right, both on flat grey #7F7F7F):

  public/assets/ch1-painted/chrome/bezel.webp   9-slice atlas (alpha)
  public/assets/ch1-painted/chrome/walnut.webp  seamless wall tile
  public/assets/ch1-painted/chrome/chrome.json  the atlas geometry

The atlas holds the bezel's four painted corners, one long seamless band
strip ("outer edge up") built from the straight runs of all four sides,
and the four painted slotted screws. src/chapters/nightService/art/wallArt.js
(CHROME_ATLAS) mirrors chrome.json; tests/nightService/chrome.test.mjs
checks that they agree.

Usage (from the repo root):
  python3 -I scripts/ch1-art/chrome-build.py [--src DIR] [--preview DIR]

--src defaults to $NIGHTFALL_ART_SRC or /home/claude/art-src/ch1. The
sources are read-only; nothing is written next to them. --preview writes
tiling and 9-slice test images (for a person to look at, not shipped).
"""

import argparse
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(REPO, 'public', 'assets', 'ch1-painted', 'chrome')

# ---------------------------------------------------------------------------
# tunables (source px unless named *_OUT)

T_OUT = 40            # band thickness in the atlas
CORNER_SRC = 180      # corner square, from the outer bbox corner (covers the curve)
FEATHER_SRC = 26      # straight run kept on each corner arm, faded out (joins the strip)
BLEND_OUT = 26        # crossfade between strip segments, atlas px
WRAP_OUT = 44         # crossfade that makes the strip seamless, atlas px
RIVET_CLEAR = 0.62    # straight runs stop this many band-thicknesses from a screw centre
# the matte, aged grade: a little darker and greyer, highlights pressed down
BRASS_GRADE = dict(gain=0.8, sat=1.16, knee=0.5, soft=0.5)
WOOD_GRADE = dict(gain=0.74, sat=0.9, knee=0.5, soft=0.6)
WOOD_INSET = 7        # inside the panel's own ink border
WOOD_WRAP_Y = 170     # vertical crossfade (the grain runs vertically)
WOOD_WRAP_X = 90      # overlap searched for the horizontal min-error seam
WOOD_FLATTEN = 0.55   # how much of the panel's broad light/dark banding is evened out


def log(*a):
    print('[chrome]', *a)


# ---------------------------------------------------------------------------
# helpers

def to_f(img):
    return np.asarray(img).astype(np.float32) / 255.0


def to_img(arr, mode):
    return Image.fromarray(np.clip(arr * 255.0 + 0.5, 0, 255).astype(np.uint8), mode)


def grade(rgb, gain, sat, knee, soft):
    """Matte: desaturate a touch, darken, and press highlights down (no shine)."""
    lum = rgb @ np.array([0.299, 0.587, 0.114], np.float32)
    out = lum[..., None] + (rgb - lum[..., None]) * sat
    out = out * gain
    hi = out > knee
    out = np.where(hi, knee + (out - knee) * soft, out)
    return np.clip(out, 0, 1)


def resize_rgba(arr, w, h):
    """Premultiplied resize so transparent edges never pick up the key colour."""
    a = arr[..., 3:4]
    pm = np.concatenate([arr[..., :3] * a, a], axis=2)
    img = to_img(pm, 'RGBA').resize((max(1, int(round(w))), max(1, int(round(h)))), Image.LANCZOS)
    out = to_f(img)
    a2 = out[..., 3:4]
    rgb = np.where(a2 > 1e-4, out[..., :3] / np.maximum(a2, 1e-4), 0)
    return np.concatenate([np.clip(rgb, 0, 1), a2], axis=2)


def runs(mask_line):
    idx = np.nonzero(mask_line)[0]
    if not len(idx):
        return []
    out, s, p = [], idx[0], idx[0]
    for i in idx[1:]:
        if i != p + 1:
            out.append((int(s), int(p)))
            s = i
        p = i
    out.append((int(s), int(p)))
    return out


# ---------------------------------------------------------------------------
# keying

def key_sheet(src):
    rgb = to_f(src.convert('RGB'))
    h, w, _ = rgb.shape
    border = np.concatenate([rgb[:8].reshape(-1, 3), rgb[-8:].reshape(-1, 3), rgb[:, :8].reshape(-1, 3), rgb[:, -8:].reshape(-1, 3)])
    keyc = np.median(border, axis=0)
    d = np.abs(rgb - keyc).max(axis=2)
    cand = (d < 10 / 255).astype(np.uint8) * 255
    # background = the grey connected to the sheet's edge or to the bezel's hole
    # (a copy: PIL cannot flood-fill an image that still wraps a numpy buffer)
    flood = Image.fromarray(cand).copy()
    seeds = [(2, 2), (w - 3, 2), (2, h - 3), (w - 3, h - 3)]
    for seed in seeds:
        if flood.getpixel(seed) == 255:
            ImageDraw.floodfill(flood, seed, 128)
    return rgb, keyc, d, np.asarray(flood)


def bezel_rgba(rgb, keyc, d, flood):
    h, w, _ = rgb.shape
    # the left half holds the bezel: its bbox from the non-grey pixels
    left = (d[:, : w // 2] > 18 / 255)
    ys, xs = np.nonzero(left)
    x0, x1, y0, y1 = int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())
    # the hole: the grey region at the bbox centre
    fl = Image.fromarray(flood.copy()).copy()
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    if fl.getpixel((cx, cy)) == 255:
        ImageDraw.floodfill(fl, (cx, cy), 128)
    bg = np.asarray(fl) == 128
    alpha = (~bg).astype(np.float32)
    # soft, decontaminated edge: the ink-to-grey pixels next to the background
    near = np.asarray(Image.fromarray((bg * 255).astype(np.uint8), 'L').filter(ImageFilter.MaxFilter(5))) > 0
    edge = near & ~bg
    a_edge = np.clip(d / (95 / 255), 0, 1)
    alpha = np.where(edge, a_edge, alpha)
    rgbc = np.where(edge[..., None], (rgb - (1 - alpha[..., None]) * keyc) / np.maximum(alpha[..., None], 0.05), rgb)
    rgbc = np.clip(rgbc, 0, 1)
    rgba = np.concatenate([rgbc, alpha[..., None]], axis=2)
    return rgba, (x0, y0, x1, y1)


# ---------------------------------------------------------------------------
# the bezel atlas

def band_thickness(rgba, box):
    x0, y0, x1, y1 = box
    a = rgba[..., 3] > 0.5
    mx, my = (x0 + x1) // 2, (y0 + y1) // 2
    probes = {}
    # sample a little off the screw (which sits at the middle of each side)
    for name, line in {
        'top': [a[y0:my, x] for x in (mx - 90, mx + 90)],
        'bottom': [a[my:y1 + 1, x][::-1] for x in (mx - 90, mx + 90)],
        'left': [a[y, x0:mx] for y in (my - 120, my + 120)],
        'right': [a[y, mx:x1 + 1][::-1] for y in (my - 120, my + 120)],
    }.items():
        ts = []
        for ln in line:
            r = runs(ln)
            ts.append(r[0][1] - r[0][0] + 1)
        probes[name] = float(np.mean(ts))
    return probes


def find_screw(rgba, cx, cy, t):
    """The slotted screw near (cx, cy): the dark ring with the strongest response."""
    lum = rgba[..., :3] @ np.array([0.299, 0.587, 0.114], np.float32)
    dark = (lum < 0.2).astype(np.float32)
    win = int(t * 0.35)
    cx, cy = int(round(cx)), int(round(cy))
    angles = np.linspace(0, 2 * np.pi, 72, endpoint=False)
    best = (-1.0, cx, cy, int(t * 0.28))
    for r in range(int(t * 0.22), int(t * 0.36) + 1):
        acc = np.zeros((2 * win + 1, 2 * win + 1), np.float32)
        for dx, dy in zip(np.round(r * np.cos(angles)).astype(int), np.round(r * np.sin(angles)).astype(int)):
            acc += dark[cy - win + dy:cy + win + dy + 1, cx - win + dx:cx + win + dx + 1]
        acc /= len(angles)
        k = int(np.argmax(acc))
        yy, xx = divmod(k, acc.shape[1])
        if acc[yy, xx] > best[0]:
            best = (float(acc[yy, xx]), cx - win + xx, cy - win + yy, r)
    return best


def build_bezel(rgba, box, preview=None):
    x0, y0, x1, y1 = box
    th = band_thickness(rgba, box)
    t_avg = float(np.mean(list(th.values())))
    s = T_OUT / t_avg
    log('bezel bbox', box, 'band', {k: round(v, 1) for k, v in th.items()}, 'scale', round(s, 4))
    graded = rgba.copy()
    graded[..., :3] = grade(rgba[..., :3], **BRASS_GRADE)

    C = int(round(CORNER_SRC * s))
    F = int(round(FEATHER_SRC * s))

    # --- corners, each arm normalised to T_OUT thick ---
    def corner(name):
        tv = th['left'] if 'l' in name[1] else th['right']
        thh = th['top'] if name[0] == 't' else th['bottom']
        cw = CORNER_SRC * tv / t_avg
        ch = CORNER_SRC * thh / t_avg
        xa = x0 if name[1] == 'l' else x1 + 1 - cw
        ya = y0 if name[0] == 't' else y1 + 1 - ch
        crop = graded[int(round(ya)):int(round(ya + ch)), int(round(xa)):int(round(xa + cw))]
        piece = resize_rgba(crop, C, C)
        # fade the straight ends of both arms (the strip runs in underneath)
        ramp = np.clip((C - np.arange(C) - 0.5) / max(F, 1), 0, 1).astype(np.float32)
        rx = ramp if name[1] == 'l' else ramp[::-1]
        ry = ramp if name[0] == 't' else ramp[::-1]
        piece[..., 3] *= ry[:, None] * rx[None, :]
        return piece

    corners = {n: corner(n) for n in ('tl', 'tr', 'bl', 'br')}

    # --- screws ---
    mx, my = (x0 + x1) / 2, (y0 + y1) / 2
    expect = {
        'top': (mx, y0 + th['top'] / 2, th['top']),
        'bottom': (mx, y1 - th['bottom'] / 2, th['bottom']),
        'left': (x0 + th['left'] / 2, my, th['left']),
        'right': (x1 - th['right'] / 2, my, th['right']),
    }
    screws = {}
    for side, (ex, ey, t) in expect.items():
        score, sx, sy, r = find_screw(rgba, ex, ey, t)
        screws[side] = (sx, sy, r)
        log('screw', side, (sx, sy), 'r', r, 'score', round(float(score), 2))
    r_out = max(r for (_, _, r) in screws.values()) + 4
    R = int(round(2 * r_out * s))
    rivets = []
    for side in ('top', 'bottom', 'left', 'right'):
        sx, sy, _ = screws[side]
        crop = graded[int(sy - r_out):int(sy + r_out), int(sx - r_out):int(sx + r_out)].copy()
        n = crop.shape[0]
        yy, xx = np.mgrid[0:n, 0:n]
        dist = np.hypot(xx - n / 2 + 0.5, yy - n / 2 + 0.5)
        crop[..., 3] *= np.clip((r_out - dist) / 2.5, 0, 1)
        rivets.append(resize_rgba(crop, R, R))

    # --- the strip: straight runs of all four sides, outer edge up ---
    segs = []

    def take(side, a, b):
        t = th[side]
        if side == 'top':
            seg = graded[y0:int(round(y0 + t)), a:b]
        elif side == 'bottom':
            seg = graded[int(round(y1 + 1 - t)):y1 + 1, a:b][::-1, ::-1]
        elif side == 'left':
            seg = np.rot90(graded[a:b, x0:int(round(x0 + t))], k=-1)
        else:
            seg = np.rot90(graded[a:b, int(round(x1 + 1 - t)):x1 + 1], k=1)
        seg = np.ascontiguousarray(seg)
        segs.append(resize_rgba(seg, seg.shape[1] * s, T_OUT))

    for side in ('top', 'right', 'bottom', 'left'):
        if side in ('top', 'bottom'):
            lo, hi = x0 + CORNER_SRC, x1 + 1 - CORNER_SRC
            c = screws[side][0]
        else:
            lo, hi = y0 + CORNER_SRC, y1 + 1 - CORNER_SRC
            c = screws[side][1]
        clear = RIVET_CLEAR * th[side]
        parts = [(lo, int(c - clear)), (int(c + clear), hi)]
        # bottom and right are read reversed (rotated), keep their order natural
        if side in ('bottom', 'left'):
            parts = parts[::-1]
        for a, b in parts:
            if b - a > 20:
                take(side, int(a), int(b))
    strip = segs[0]
    for seg in segs[1:]:
        o = min(BLEND_OUT, seg.shape[1] // 3, strip.shape[1] // 3)
        w = np.linspace(0, 1, o, dtype=np.float32)[None, :, None]
        joint = strip[:, -o:] * (1 - w) + seg[:, :o] * w
        strip = np.concatenate([strip[:, :-o], joint, seg[:, o:]], axis=1)
    # seamless wrap: the first WRAP_OUT columns crossfade from the tail
    o = WRAP_OUT
    L = strip.shape[1] - o
    w = np.linspace(0, 1, o, dtype=np.float32)[None, :, None]
    head = strip[:, L:] * (1 - w) + strip[:, :o] * w
    strip = np.concatenate([head, strip[:, o:L]], axis=1)
    L = strip.shape[1]
    log('strip', L, 'x', T_OUT, 'from', len(segs), 'runs')

    # --- pack ---
    width = max(L, 4 * C + 4 * R)
    height = C + T_OUT
    atlas = np.zeros((height, width, 4), np.float32)
    for i, n in enumerate(('tl', 'tr', 'bl', 'br')):
        atlas[0:C, i * C:(i + 1) * C] = corners[n]
    for i, rv in enumerate(rivets):
        atlas[0:R, 4 * C + i * R:4 * C + (i + 1) * R] = rv
    atlas[C:C + T_OUT, 0:L] = strip
    # inner corner radius (atlas px) where the hole's curve meets the straight edge
    a = corners['tl'][..., 3] > 0.5
    inner_r = None
    for yy in range(T_OUT, C):
        rr = runs(a[yy])
        if rr and rr[0][1] - rr[0][0] + 1 <= T_OUT + 1:
            inner_r = yy - T_OUT
            break
    meta = {
        'source': 'C-bezel.png',
        'sourceBox': [x0, y0, x1, y1],
        'sourceBand': {k: round(v, 2) for k, v in th.items()},
        'scale': round(s, 5),
        'size': [width, height],
        'T': T_OUT,
        'corner': {'size': C, 'feather': F, 'tl': [0, 0], 'tr': [C, 0], 'bl': [2 * C, 0], 'br': [3 * C, 0], 'innerRadius': inner_r},
        'rivet': {'size': R, 'at': [[4 * C + i * R, 0] for i in range(4)]},
        'strip': {'x': 0, 'y': C, 'w': L, 'h': T_OUT},
    }
    return atlas, meta


# ---------------------------------------------------------------------------
# the walnut tile

def min_seam(err):
    """Vertical min-error path through err (h × w): one column index per row."""
    h, w = err.shape
    cost = err.copy()
    back = np.zeros((h, w), np.int32)
    for y in range(1, h):
        prev = cost[y - 1]
        left = np.r_[np.inf, prev[:-1]]
        right = np.r_[prev[1:], np.inf]
        stack = np.stack([left, prev, right])
        k = np.argmin(stack, axis=0)
        back[y] = np.arange(w) + k - 1
        cost[y] += stack[k, np.arange(w)]
    path = np.zeros(h, np.int32)
    path[-1] = int(np.argmin(cost[-1]))
    for y in range(h - 1, 0, -1):
        path[y - 1] = back[y, path[y]]
    return path


def build_walnut(rgb, d):
    h, w, _ = rgb.shape
    right = d[:, w // 2:] > 18 / 255
    ys, xs = np.nonzero(right)
    x0, x1, y0, y1 = int(xs.min()) + w // 2, int(xs.max()) + w // 2, int(ys.min()), int(ys.max())
    box = (x0 + WOOD_INSET, y0 + WOOD_INSET, x1 - WOOD_INSET, y1 - WOOD_INSET)
    log('walnut panel', (x0, y0, x1, y1), 'used', box)
    tile = rgb[box[1]:box[3], box[0]:box[2]].copy()
    # even out the broad light/dark banding a little, so the repeat does not show
    img = to_img(tile, 'RGB')
    big = to_f(img.filter(ImageFilter.GaussianBlur(60)))
    mean = tile.reshape(-1, 3).mean(axis=0)
    tile = np.clip(tile * (1 - WOOD_FLATTEN) + tile * (mean / np.maximum(big, 1e-3)) * WOOD_FLATTEN, 0, 1)
    tile = grade(tile, **WOOD_GRADE)
    th, tw, _ = tile.shape
    # vertical wrap: a long crossfade (grain lines start and end, as in real wood)
    o = WOOD_WRAP_Y
    H = th - o
    wy = np.linspace(0, 1, o, dtype=np.float32)[:, None, None]
    head = tile[H:] * (1 - wy) + tile[:o] * wy
    tile = np.concatenate([head, tile[o:H]], axis=0)
    # horizontal wrap: cut along the grain where the two ends agree best
    o = WOOD_WRAP_X
    W = tile.shape[1] - o
    a = tile[:, W:]        # the tail (it continues into the head)
    b = tile[:, :o]
    err = ((a - b) ** 2).sum(axis=2)
    err = to_f(to_img(np.clip(err / max(err.max(), 1e-6), 0, 1), 'L').filter(ImageFilter.GaussianBlur(1.2)))
    path = min_seam(err)
    cols = np.arange(o)[None, :]
    feather = 3.0
    m = np.clip((cols - path[:, None]) / feather + 0.5, 0, 1)[..., None]  # 0: tail, 1: head
    head = a * (1 - m) + b * m
    tile = np.concatenate([head, tile[:, o:W]], axis=1)
    log('walnut tile', tile.shape[1], 'x', tile.shape[0])
    return tile, box


# ---------------------------------------------------------------------------
# previews (not shipped)

def preview_nine(atlas, meta, w, h, t, res=1.0):
    """A canvas-like 9-slice composite, to look at in a preview."""
    f = t / meta['T']
    C = meta['corner']['size']
    F = meta['corner']['feather']
    W, H = int(w * res), int(h * res)
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    atl = to_img(atlas, 'RGBA')
    st = meta['strip']
    strip = atl.crop((st['x'], st['y'], st['x'] + st['w'], st['y'] + st['h']))
    ts = max(1, int(round(t * res)))
    sl = max(1, int(round(st['w'] * f * res)))
    strip = strip.resize((sl, ts), Image.LANCZOS)
    cs = int(round(C * f * res))
    fs = int(round(F * f * res))

    def edge(length, rot):
        band = Image.new('RGBA', (length, ts), (0, 0, 0, 0))
        x = -int(sl * 0.37)
        while x < length:
            sx0 = max(0, -x)
            sx1 = min(sl, length - x)
            if sx1 > sx0:
                band.alpha_composite(strip.crop((sx0, 0, sx1, ts)), (x + sx0, 0))
            x += sl
        return band.rotate(rot, expand=True)

    hl = W - 2 * (cs - fs)
    vl = H - 2 * (cs - fs)
    out.alpha_composite(edge(hl, 0), (cs - fs, 0))
    out.alpha_composite(edge(hl, 180), (cs - fs, H - ts))
    out.alpha_composite(edge(vl, 90), (0, cs - fs))
    out.alpha_composite(edge(vl, -90), (W - ts, cs - fs))
    for n, (px, py) in (('tl', (0, 0)), ('tr', (W - cs, 0)), ('bl', (0, H - cs)), ('br', (W - cs, H - cs))):
        cx, cy = meta['corner'][n]
        piece = atl.crop((cx, cy, cx + C, cy + C)).resize((cs, cs), Image.LANCZOS)
        out.alpha_composite(piece, (px, py))
    R = meta['rivet']['size']
    rs = max(2, int(round(R * f * res)))
    for i, (px, py) in enumerate(((W // 2, ts // 2), (W // 2, H - ts // 2), (ts // 2, H // 2), (W - ts // 2, H // 2))):
        rx, ry = meta['rivet']['at'][i]
        rv = atl.crop((rx, ry, rx + R, ry + R)).resize((rs, rs), Image.LANCZOS)
        out.alpha_composite(rv, (px - rs // 2, py - rs // 2))
    return out


def write_previews(atlas, meta, walnut, folder):
    os.makedirs(folder, exist_ok=True)
    wal = to_img(walnut, 'RGB')
    tw, th = wal.size
    grid = Image.new('RGB', (tw * 3, th * 2))
    for i in range(3):
        for j in range(2):
            grid.paste(wal, (i * tw, j * th))
    grid.save(os.path.join(folder, 'walnut-tiled.jpg'), quality=88)
    big = preview_nine(atlas, meta, 771 * 2, 440 * 2, 14.5 * 2)
    bg = Image.new('RGBA', big.size, (28, 20, 14, 255))
    bg.alpha_composite(big)
    bg.convert('RGB').save(os.path.join(folder, 'bezel-9slice-2x.jpg'), quality=90)
    small = preview_nine(atlas, meta, 771, 440, 14.5)
    bg = Image.new('RGBA', small.size, (28, 20, 14, 255))
    bg.alpha_composite(small)
    bg.convert('RGB').save(os.path.join(folder, 'bezel-9slice-1x.jpg'), quality=90)
    to_img(atlas, 'RGBA').save(os.path.join(folder, 'atlas.png'))
    log('previews in', folder)


# ---------------------------------------------------------------------------

def main(argv):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--src', default=os.environ.get('NIGHTFALL_ART_SRC', '/home/claude/art-src/ch1'))
    ap.add_argument('--out', default=OUT)
    ap.add_argument('--preview', default=None)
    args = ap.parse_args(argv)
    src_path = os.path.join(args.src, 'C-bezel.png')
    src = Image.open(src_path)
    log('source', src_path, src.size)
    rgb, keyc, d, flood = key_sheet(src)
    log('key colour', tuple(int(round(v * 255)) for v in keyc))
    rgba, box = bezel_rgba(rgb, keyc, d, flood)
    atlas, meta = build_bezel(rgba, box)
    walnut, wbox = build_walnut(rgb, d)
    meta['walnut'] = {'source': 'C-bezel.png', 'sourceBox': list(wbox), 'size': [walnut.shape[1], walnut.shape[0]]}
    os.makedirs(args.out, exist_ok=True)
    to_img(atlas, 'RGBA').save(os.path.join(args.out, 'bezel.webp'), quality=90, method=6, exact=False)
    to_img(walnut, 'RGB').save(os.path.join(args.out, 'walnut.webp'), quality=86, method=6)
    with open(os.path.join(args.out, 'chrome.json'), 'w') as fh:
        json.dump(meta, fh, indent=2)
        fh.write('\n')
    for name in ('bezel.webp', 'walnut.webp', 'chrome.json'):
        log('wrote', os.path.relpath(os.path.join(args.out, name), REPO), os.path.getsize(os.path.join(args.out, name)), 'bytes')
    if args.preview:
        write_previews(atlas, meta, walnut, args.preview)


if __name__ == '__main__':
    main(sys.argv[1:])
