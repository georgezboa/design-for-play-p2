#!/usr/bin/env python3
"""Cut George's painted Chapter 1 characters and props into runtime sprites.

    python3 -I scripts/ch1-art/sprites.py                 # regenerate everything
    python3 -I scripts/ch1-art/sprites.py --preview DIR   # also write QA strips

Sources: /home/claude/art-src/ch1/C-*.png (1536x1024, flat grey ground; read
only, never edited). Override with --src or NIGHTFALL_CH1_ART.

Outputs (all regenerated from scratch on every run; stale sprites removed):
  public/assets/ch1-painted/sprites/<character>/<frame>.webp   WebP + alpha
  public/assets/ch1-painted/sprites/atlas.json                 the atlas
  public/assets/ch1-painted/sprites/ASSET_MANIFEST.md          provenance
  src/chapters/nightService/spriteAtlas.js                     the same atlas
                                                               as an ES module
                                                               (the rigs import it)

Per frame the pipeline:
  1. keys the grey ground out of the whole sheet with a soft matte: a hard
     core (colour distance from the grey > T_HI), small enclosed grey pockets
     filled back in, then a BAND-px soft edge whose alpha is the projection of
     (pixel - grey) onto (nearest interior colour - grey). The edge colour is
     solved back out of the grey (decontaminated), so there is no grey halo.
     The figures' own soft floor shadows are thin grey darkening below the
     soles: they never reach the core and the band only fades outwards, so
     they stay out.
  2. keeps the figure's own connected pieces inside its search box (a
     neighbour's elbow or a second person's hand never comes along) and
     applies the frame's edits (erase / keep polygons, clone patches,
     overlays of another piece of the same sheet);
  3. measures its box, its floor line (the lowest paint; for a walk frame
     its planted foot) and its pivot x (the torso's centre by default);
  4. scales it so every frame of a character shares one figure scale: an
     upright frame to `height` x the character's standing height, a seated or
     reaching frame by its sheet's own standing figure (`ref`), so a sitting
     Butch is exactly as big as a standing one;
  5. writes the frame with a small padding, pivot = feet at the bottom
     centre of the figure, plus anchors (lantern glow, hand, ticket, case...)
     in frame pixels.
Then each walk cycle is solved (solve_cycle): the stride and per-frame
timing and pivot shifts that keep the planted feet planted, given that the
painted frames are not evenly spaced in time. The rig plays the result by
distance walked.

When George replaces a sheet: if the figures keep their places, just re-run.
If they move, update the frame's search `box` (and any edit polygons and
anchors, which are in sheet pixels), re-run with --preview and look at the
strips; for a new walk sheet also re-check each frame's `plant` tags.
"""

import argparse
import hashlib
import json
import os
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / 'public/assets/ch1-painted/sprites'
ATLAS_JS = ROOT / 'src/chapters/nightService/spriteAtlas.js'
URL_BASE = '/assets/ch1-painted/sprites'
WEBP_QUALITY = 88
PAD = 6

T_HI = 40.0   # colour distance from the ground that is surely paint
BAND = 2.5    # soft edge half-width (source px)
HOLE = 90     # enclosed grey pockets smaller than this (px) are paint

SHEETS = {
    'butch1': 'C-butch-poses.png',
    'butch2': 'C-butch-poses-2.png',
    'conductor': 'C-conductor.png',
    'mara': 'C-mara.png',
    'train': 'C-train.png',
    'props': 'C-props.png',
}

# ---------------------------------------------------------------------------
# Characters. `height`: the standing figure's height in output px (cap to
# soles); `rigHeight`: the rig's height in tile px at scale 1 (actorRig.js),
# so one output px is rigHeight/height tile px. `flip`: the sheet faces left,
# the runtime frames all face right (facing = +1).
CHARACTERS = {
    'butch': {'height': 448, 'rigHeight': 70},
    'conductor': {'height': 480, 'rigHeight': 110, 'flip': True},
    'mara': {'height': 440, 'rigHeight': 66},
}

# Each sheet's own standing figure (search box, x0 y0 x1 y1): the scale that
# seated and reaching frames on that sheet are drawn at.
REFS = {
    'butch1': (24, 500, 164, 950),
    'butch2': (110, 0, 262, 480),
    'conductor': (405, 110, 702, 890),
}


def frame(char, name, sheet, box, **opts):
    return {'char': char, 'name': name, 'sheet': sheet, 'box': box, **opts}


WALK_H = 0.945  # the walking figure stoops and dips: 94.5% of standing height

# Walk frames name the feet that are planted (on the floor, holding still)
# so the cycle can be solved for no skating (see solve_cycle):
#   (group, end, foot, weight): group 'front' / 'back' / 'only' (the feet in
#   the lowest rows, by x), end 'heel' / 'toe', foot 'A' / 'B' ('B-' is foot B
#   still planted from the previous lap, 'A-' likewise).
BUTCH_WALK = [
    # contact, down, passing, swing; then the same on the other foot
    ((10, 60, 219, 462), [('front', 'heel', 'A', 1.0), ('back', 'toe', 'B-', 0.6)]),
    ((219, 60, 432, 462), [('front', 'heel', 'A', 1.0), ('back', 'toe', 'B-', 0.4)]),
    ((434, 60, 570, 462), [('only', 'toe', 'A', 1.0)]),
    ((580, 60, 742, 462), [('only', 'toe', 'A', 1.0)]),
    ((760, 60, 968, 462), [('front', 'heel', 'B', 1.0), ('back', 'toe', 'A', 0.6)]),
    ((968, 60, 1158, 462), [('front', 'heel', 'B', 1.0)]),
    ((1158, 60, 1300, 462), [('only', 'toe', 'B', 1.0)]),
    ((1318, 60, 1520, 462), [('only', 'toe', 'B', 1.0)]),
]
# Mara's six walk frames are one step (the coat hides which leg leads), in
# step order: landing, loading, mid-stance, toe-off swing, then the next
# foot reaching forward. Sheet positions: top row 4, bottom 1, top 1,
# bottom 2, top 2, top 3.
MARA_WALK = [
    ((1180, 0, 1510, 492), [('front', 'heel', 'A', 0.5), ('back', 'toe', 'A-', 1.0)]),
    ((56, 494, 330, 995), [('front', 'heel', 'A', 1.0), ('back', 'toe', 'A-', 0.4)]),
    ((100, 0, 330, 492), [('front', 'heel', 'A', 1.0)]),
    ((432, 494, 690, 995), [('front', 'heel', 'A', 1.0)]),
    ((430, 0, 710, 492), [('back', 'toe', 'A', 1.0)]),
    ((776, 0, 1116, 492), [('back', 'toe', 'A', 1.0)]),
]

# The Conductor's lit lantern, cut from his lantern-up frame below his
# fingers (not his sleeve): hung from his free hand where a frame has none.
CONDUCTOR_LANTERN = [(1116, 179), (1186, 179), (1186, 236), (1197, 236), (1197, 314), (1116, 314)]

FRAMES = [
    *[frame('butch', f'walk-{i + 1}', 'butch1', box, scale=('height', WALK_H), plant=plant, baseline='plant', lantern=True)
      for i, (box, plant) in enumerate(BUTCH_WALK)],
    # --- Butch: standing and actions
    frame('butch', 'stand', 'butch1', (24, 500, 164, 950), scale=('height', 1.0), lantern=True),
    frame('butch', 'stand-large', 'butch2', (110, 0, 262, 480), scale=('height', 1.0), lantern=True),
    # asleep at a desk on a stool, and sitting up on the stool: pivot on the
    # stool, so the stool stays put when he wakes
    frame('butch', 'sleep', 'butch2', (430, 150, 750, 472), scale=('ref', 'butch2'), pivot=('src', 510), lantern=True),
    # the desk and its lantern alone, cut from the sleep frame (same pivot):
    # drawn over the sitting frame when he has sat up at it, so the desk does
    # not leave with the sleep frame
    frame('butch', 'desk', 'butch2', (430, 150, 750, 472), scale=('ref', 'butch2'), pivot=('src', 510), lantern=True,
          baseline=463, overlay=True,
          edits=[('keep', [
              [(588, 249), (744, 249), (744, 263), (588, 263)],     # the top
              [(596, 262), (732, 262), (732, 313), (596, 313)],     # the apron
              [(591, 262), (613, 262), (613, 441), (591, 441)],     # the near leg (his boot hides its foot)
              [(706, 262), (732, 262), (732, 463), (706, 463)],     # the far end's leg
              [(667, 156), (724, 156), (724, 252), (667, 252)],     # the lantern
          ], lambda rgb: rgb[..., 2] > rgb[..., 0] + 4)]),
    frame('butch', 'sit', 'butch2', (840, 70, 1066, 470), scale=('ref', 'butch2'), pivot=('src', 905)),
    # the same, the stool painted out: for a chair the plate already has
    frame('butch', 'sit-chair', 'butch2', (840, 70, 1066, 470), scale=('ref', 'butch2'), pivot=('src', 905),
          edits=[('erase-unless', [(842, 296), (917, 296), (917, 383), (970, 389), (972, 472), (842, 472)],
                  lambda rgb: rgb[..., 2] > rgb[..., 0] + 4, 2)]),
    frame('butch', 'lantern', 'butch2', (1196, 0, 1450, 478), scale=('ref', 'butch2'), lantern=True),
    frame('butch', 'reach', 'butch2', (144, 470, 466, 972), scale=('ref', 'butch2'), anchors={'hand': (430, 492)}),
    frame('butch', 'receive', 'butch2', (624, 490, 910, 972), scale=('ref', 'butch2'), lantern=True,
          anchors={'hand': (872, 645)}),
    frame('butch', 'carry', 'butch1', (1352, 540, 1528, 950), scale=('height', 0.975), anchors={'case': (1468, 695)}),
    frame('butch', 'carry-walk', 'butch2', (1040, 490, 1342, 970), scale=('ref', 'butch2'), anchors={'case': (1255, 635)}),
    # holding a ticket out: the other person's hand that gives it is painted out
    frame('butch', 'ticket', 'butch1', (1136, 550, 1340, 950), scale=('height', 0.99), lantern=True,
          edits=[('erase', [(1290.5, 640), (1345, 640), (1345, 720), (1290.5, 720)])],
          anchors={'ticket': (1282, 680), 'hand': (1272, 690)}),
    # --- the Conductor (the sheet faces left; frames are flipped to face right)
    frame('conductor', 'lantern', 'conductor', (1118, 110, 1520, 890), scale=('ref', 'conductor'), lantern=True),
    frame('conductor', 'offer', 'conductor', (14, 110, 400, 890), scale=('ref', 'conductor'), lantern=True,
          edits=[('overlay', CONDUCTOR_LANTERN, (220, 556))],
          anchors={'punch': (42, 318), 'hand': (70, 335)}),
    # the punch handed over: the same arm, empty
    frame('conductor', 'offer-empty', 'conductor', (14, 110, 400, 890), scale=('ref', 'conductor'),
          lantern=True,
          edits=[('erase', [(10, 290), (71, 290), (71, 319), (60, 322), (52, 331), (46, 346), (10, 346)]),
                 ('overlay', CONDUCTOR_LANTERN, (220, 556))],
          anchors={'hand': (70, 335)}),
    frame('conductor', 'stand', 'conductor', (405, 110, 702, 890), scale=('height', 1.0), anchors={'punch': (551, 585)}),
    # standing, the punch painted out of his hand (coat cloned over it)
    frame('conductor', 'stand-empty', 'conductor', (405, 110, 702, 890), scale=('height', 1.0),
          lantern=True,
          edits=[('clone', (572, 577, 32, 48), (534, 574)), ('clone', (505, 538, 24, 40), (537, 538)),
                 ('overlay', CONDUCTOR_LANTERN, (522, 566))]),
    frame('conductor', 'walk', 'conductor', (700, 110, 1122, 890), scale=('ref', 'conductor')),
    # --- Mara (never her face: side and back views only)
    *[frame('mara', f'walk-{i + 1}', 'mara', box, scale=('height', 1.0), plant=plant, baseline='plant')
      for i, (box, plant) in enumerate(MARA_WALK)],
    frame('mara', 'back', 'mara', (850, 494, 1050, 995), scale=('height', 1.0)),
    frame('mara', 'turn', 'mara', (1240, 494, 1440, 995), scale=('height', 1.0)),
]

# Walk cycles: frames in order, and how many steps one pass of them covers.
CYCLES = {
    'butch': {'walk': {'frames': [f'walk-{i + 1}' for i in range(8)], 'steps': 2}},
    'mara': {'walk': {'frames': [f'walk-{i + 1}' for i in range(6)], 'steps': 1}},
}
# Trade-off when the painted frames are unevenly spaced in time: weight of
# a torso surge against a planted foot sliding (see solve_cycle).
SURGE_WEIGHT = 1.0
# Within a held frame the image is held back by this share of the distance
# walked (the rig applies the same): a planted foot slides less, the torso
# moves in small surges instead. 0 = a plain glide.
WALK_LOCK = 0.5
# Pull towards even frame windows: a frame held long glides in one pose.
EVEN_WEIGHT = 1.0

# The night carriage (rig 'train'): `length` output px wide; the rig keeps its
# 150 tile px length (act3.js TRAIN_LENGTH), wheels on the rail.
TRAIN = {'length': 960, 'rigLength': 150, 'frames': {
    'dark': (10, 50, 1526, 470),
    'lit': (10, 536, 1526, 952),
}}

# Separate prop sprites (C-props.png), native size capped at `max` px.
PROPS = {
    'key': {'box': (50, 150, 552, 370), 'max': 384},
    'tag': {'box': (590, 50, 950, 476), 'max': 384},
    'punch': {'box': (1010, 84, 1516, 420), 'max': 384},
    'case': {'box': (16, 496, 640, 938), 'max': 512},
    'letter': {'box': (640, 560, 1144, 936), 'max': 384},
    'ember': {'box': (1190, 628, 1516, 872), 'max': 256},
}


# ---------------------------------------------------------------------------
# matting

_SHEET_CACHE = {}


def ground_colour(a):
    border = np.concatenate([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3), a[:, :6].reshape(-1, 3), a[:, -6:].reshape(-1, 3)])
    return np.median(border, axis=0)


def matte(path):
    """RGBA float32 (straight alpha 0..1 in channel 3) with the grey keyed out."""
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.float32)
    B = ground_colour(a)
    diff = a - B
    d = np.sqrt((diff ** 2).sum(2))
    core = ndi.binary_opening(d > T_HI, iterations=1) | (d > 70)
    lab, n = ndi.label(core)
    if n:
        sizes = ndi.sum(core, lab, range(1, n + 1))
        keep = np.zeros(n + 1, bool)
        keep[1:] = sizes >= 30
        core = keep[lab]
    holes = ndi.binary_fill_holes(core) & ~core
    hl, hn = ndi.label(holes)
    solid = core.copy()
    if hn:
        hs = ndi.sum(holes, hl, range(1, hn + 1))
        small = np.zeros(hn + 1, bool)
        small[1:] = hs < HOLE
        solid |= small[hl]
    din = ndi.distance_transform_edt(solid)
    dout = ndi.distance_transform_edt(~solid)
    interior = din > BAND
    _, (iy, ix) = ndi.distance_transform_edt(~interior, return_indices=True)
    F = a[iy, ix]
    FB = F - B
    den = (FB ** 2).sum(2)
    proj = np.clip((diff * FB).sum(2) / np.maximum(den, 1.0), 0, 1)
    weak = den < 30.0 ** 2
    pa = np.where(weak, np.clip(d / T_HI, 0, 1), proj)
    band = (~interior) & (dout <= BAND)
    alpha = np.where(interior, 1.0, np.where(band, pa, 0.0))
    # outside the painted region the edge may only fade (no floor shadow)
    fade = np.clip(1 - dout / (BAND + 0.5), 0, 1)
    alpha = np.where(band & ~solid, np.minimum(alpha, fade), alpha)
    sa = np.maximum(alpha, 1e-3)[..., None]
    solved = np.clip(B + diff / sa, 0, 255)
    w = np.clip((alpha - 0.15) / 0.45, 0, 1)[..., None]
    col = np.where(band[..., None], w * solved + (1 - w) * F, a)
    alpha = np.where(alpha < 0.02, 0.0, alpha)
    return np.dstack([col, alpha]).astype(np.float32)


MATTE_CACHE = os.environ.get('NIGHTFALL_MATTE_CACHE')  # dev only: a dir to keep keyed sheets in


def sheet(name, src_dir):
    if name not in _SHEET_CACHE:
        path = src_dir / SHEETS[name]
        cached = None
        if MATTE_CACHE:
            stamp = hashlib.sha256(path.read_bytes()).hexdigest()[:16]
            cached = Path(MATTE_CACHE) / f'{name}-{stamp}-{T_HI}-{BAND}-{HOLE}.npy'
            if cached.exists():
                _SHEET_CACHE[name] = np.load(cached)
                return _SHEET_CACHE[name]
        _SHEET_CACHE[name] = matte(path)
        if cached:
            cached.parent.mkdir(parents=True, exist_ok=True)
            np.save(cached, _SHEET_CACHE[name])
    return _SHEET_CACHE[name]


def isolate(rgba, box):
    """The figure inside `box`: its connected pieces only (a neighbour's
    elbow reaching into the box is dropped)."""
    x0, y0, x1, y1 = box
    sub = rgba[y0:y1, x0:x1].copy()
    a = sub[..., 3]
    grouped = ndi.binary_dilation(a > 0.05, iterations=3)
    lab, n = ndi.label(grouped)
    if n == 0:
        raise ValueError(f'nothing painted in {box}')
    areas = ndi.sum(a > 0.05, lab, range(1, n + 1))
    biggest = areas.max()
    keep = np.zeros(n + 1, bool)
    for i, area in enumerate(areas, start=1):
        if area < biggest * 0.004:
            continue
        ys, xs = np.nonzero(lab == i)
        # a piece mostly cut by the box edge belongs to the neighbour
        touches = (xs.min() == 0 or xs.max() == sub.shape[1] - 1)
        if touches and area < biggest * 0.5:
            continue
        keep[i] = True
    sub[..., 3] *= keep[lab]
    return sub


def polygon_mask(shape, pts, offset):
    from PIL import ImageDraw
    m = Image.new('L', (shape[1], shape[0]), 0)
    ImageDraw.Draw(m).polygon([(x - offset[0], y - offset[1]) for x, y in pts], fill=255)
    return np.asarray(m) > 127


def apply_edits(sub, fr, full=None):
    """Frame edits, all in sheet coordinates:
      ('erase', polygon)                      paint out (soft edge)
      ('erase-unless', polygon, rule, grow)   paint out all but pixels near `rule`-coloured paint
      ('keep', [polygons], drop_rule)         keep only the polygons, less `drop_rule` paint
      ('overlay', polygon, (x, y))            paste that piece of the sheet with its top-left at x, y
      ('clone', (sx, sy, w, h), (dx, dy))     feathered copy of a patch (paint over a small thing)"""
    x0, y0 = fr['box'][0], fr['box'][1]
    for edit in fr.get('edits', []):
        kind = edit[0]
        if kind == 'erase':
            m = polygon_mask(sub.shape, edit[1], (x0, y0))
            soft = ndi.gaussian_filter(m.astype(np.float32), 0.8)
            sub[..., 3] *= 1 - np.clip(soft * 1.2, 0, 1)
        elif kind == 'erase-unless':
            # erase inside the polygon except pixels within `grow` px of the
            # colour rule (e.g. keep the coat, drop the stool)
            m = polygon_mask(sub.shape, edit[1], (x0, y0))
            rule = edit[2]
            rgb = sub[..., :3]
            keep = rule(rgb) & (sub[..., 3] > 0.5)
            keep = ndi.binary_opening(keep, iterations=1)
            keep = ndi.binary_dilation(keep, iterations=edit[3] if len(edit) > 3 else 2)
            drop = m & ~keep
            soft = ndi.gaussian_filter(drop.astype(np.float32), 0.7)
            sub[..., 3] *= 1 - np.clip(soft * 1.3, 0, 1)
        elif kind == 'keep':
            # keep only what is inside the polygons, less pixels matching
            # `drop` (e.g. a sleeve resting on the desk top)
            m = np.zeros(sub.shape[:2], bool)
            for poly in edit[1]:
                m |= polygon_mask(sub.shape, poly, (x0, y0))
            if len(edit) > 2 and edit[2] is not None:
                m &= ~ndi.binary_dilation(edit[2](sub[..., :3]) & (sub[..., 3] > 0.3), iterations=1)
            sub[..., 3] *= ndi.gaussian_filter(m.astype(np.float32), 0.6)
        elif kind == 'overlay':
            # paste a painted piece of the same sheet (keyed), cut by a
            # polygon, with its top-left at `at` (both in sheet coordinates)
            poly, at = edit[1], edit[2]
            src_rgba = full
            xs = [x for x, _ in poly]
            ys = [y for _, y in poly]
            px0, py0, px1, py1 = int(min(xs)), int(min(ys)), int(max(xs)) + 1, int(max(ys)) + 1
            piece = src_rgba[py0:py1, px0:px1].copy()
            m = polygon_mask(piece.shape, poly, (px0, py0))
            piece[..., 3] *= ndi.gaussian_filter(m.astype(np.float32), 0.6)
            ox, oy = int(at[0]) - x0, int(at[1]) - y0
            h, w = piece.shape[:2]
            dst = sub[oy:oy + h, ox:ox + w]
            pa = piece[..., 3:4]
            out_a = pa + dst[..., 3:4] * (1 - pa)
            out_c = (piece[..., :3] * pa + dst[..., :3] * dst[..., 3:4] * (1 - pa)) / np.maximum(out_a, 1e-4)
            sub[oy:oy + h, ox:ox + w] = np.concatenate([out_c, out_a], axis=2)
        elif kind == 'clone':
            # copy a source rect onto a destination rect (feathered), both in
            # sheet coordinates: (sx, sy, w, h) -> (dx, dy)
            sx, sy, w, h = edit[1]
            dx, dy = edit[2]
            src = sub[sy - y0:sy - y0 + h, sx - x0:sx - x0 + w].copy()
            yy, xx = np.mgrid[0:h, 0:w]
            edge = np.minimum.reduce([xx + 1, w - xx, yy + 1, h - yy]).astype(np.float32)
            wgt = np.clip(edge / 4.0, 0, 1)[..., None]
            dst = sub[dy - y0:dy - y0 + h, dx - x0:dx - x0 + w]
            sub[dy - y0:dy - y0 + h, dx - x0:dx - x0 + w] = wgt * src + (1 - wgt) * dst
    return sub


def bbox(alpha, thresh=0.06):
    ys, xs = np.nonzero(alpha > thresh)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def torso_x(alpha, top, bottom, band=(0.16, 0.42)):
    h = bottom - top
    r0, r1 = int(top + band[0] * h), int(top + band[1] * h)
    rows = alpha[r0:r1]
    w = rows.sum(0)
    if w.sum() <= 0:
        return None
    return float((w * np.arange(rows.shape[1])).sum() / w.sum())


def warm_centroid(rgba):
    """The lit lantern's flame: centre of the largest blob of the frame's
    warmest bright pixels. Only asked of frames that hold a lit lantern."""
    r, g, b, a = (rgba[..., i] for i in range(4))
    score = np.where(a > 0.6, (r + g) / 2 - b, -255)
    m = score > score.max() * 0.82
    m = ndi.binary_closing(m, iterations=2)
    lab, n = ndi.label(m)
    if n == 0:
        return None
    areas = ndi.sum(m, lab, range(1, n + 1))
    i = int(np.argmax(areas)) + 1
    ys, xs = np.nonzero(lab == i)
    return float(xs.mean()), float(ys.mean())


def to_image(rgba):
    out = np.dstack([np.clip(rgba[..., :3], 0, 255), np.clip(rgba[..., 3] * 255, 0, 255)])
    return Image.fromarray(out.round().astype(np.uint8), 'RGBA')


def bleed(img):
    """Fill the colour of transparent pixels from their nearest painted
    neighbour, so filtering and WebP never pull grey or black into the edge."""
    a = np.asarray(img).astype(np.float32)
    alpha = a[..., 3]
    solid = alpha > 8
    if solid.all() or not solid.any():
        return img
    _, (iy, ix) = ndi.distance_transform_edt(~solid, return_indices=True)
    rgb = a[..., :3].copy()
    rgb[~solid] = a[iy[~solid], ix[~solid], :3]
    return Image.fromarray(np.dstack([rgb, alpha]).round().astype(np.uint8), 'RGBA')


def save_webp(img, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    bleed(img).save(path, 'WEBP', quality=WEBP_QUALITY, alpha_quality=100, method=4, exact=False)


# ---------------------------------------------------------------------------


def measure_ref(src_dir, sheet_name):
    sub = isolate(sheet(sheet_name, src_dir), REFS[sheet_name])
    _, top, _, bottom = bbox(sub[..., 3])
    return bottom - top


def cut_character_frame(fr, src_dir, refs):
    ch = CHARACTERS[fr['char']]
    full = sheet(fr['sheet'], src_dir)
    sub = isolate(full, fr['box'])
    sub = apply_edits(sub, fr, full)
    bx0, top, bx1, bottom = bbox(sub[..., 3])
    # the feet: the lowest paint, unless the frame names its floor line, or
    # (walk frames) stands on its planted foot: a swinging foot drawn lower
    # (nearer, in a three-quarter view) may dip below the floor line, but the
    # foot that carries the weight never hovers above it
    if fr.get('baseline') == 'plant':
        groups = sorted(feet_groups(sub[..., 3], top, bottom))
        lows = []
        for group, _end, _foot, wt in fr['plant']:
            if wt < 0.75 or not groups:
                continue
            g = min(groups, key=lambda f: bottom - f[2]) if group == 'only' else (groups[-1] if group == 'front' else groups[0])
            lows.append(g[2])
        base = (max(lows) + 1) if lows else bottom
    elif 'baseline' in fr:
        base = fr['baseline'] - fr['box'][1]
    else:
        base = bottom
    cap = fr.get('capTop')
    head_top = (cap - fr['box'][1]) if cap is not None else top
    kind, val = fr['scale']
    if kind == 'height':
        s = ch['height'] * val / (base - head_top)
    else:
        s = ch['height'] / refs[val]
    piv = fr.get('pivot', ('torso',))
    if piv[0] == 'src':
        px = piv[1] - fr['box'][0]
    elif piv[0] == 'torso':
        px = torso_x(sub[..., 3], head_top, base, piv[1] if len(piv) > 1 else (0.16, 0.42))
    else:
        px = (bx0 + bx1) / 2
    px += fr.get('nudge', 0)
    anchors = {}
    glow = warm_centroid(sub) if fr.get('lantern') else None
    if glow:
        anchors['glow'] = glow
    for k, (ax, ay) in fr.get('anchors', {}).items():
        anchors[k] = (ax - fr['box'][0], ay - fr['box'][1])
    flip = ch.get('flip', False)
    crop = sub[top:bottom, bx0:bx1]
    img = to_image(crop)
    if flip:
        img = img.transpose(Image.FLIP_LEFT_RIGHT)
    cw, chh = bx1 - bx0, bottom - top
    w, h = max(1, round(cw * s)), max(1, round(chh * s))
    img = img.resize((w, h), Image.LANCZOS)
    canvas = Image.new('RGBA', (w + 2 * PAD, h + 2 * PAD), (0, 0, 0, 0))
    canvas.paste(img, (PAD, PAD))

    def place(x, y):
        lx = x - bx0
        if flip:
            lx = cw - lx
        return (PAD + lx * w / cw, PAD + (y - top) * h / chh)

    pivot = place(px, base)
    feet = []
    if fr.get('plant'):
        for g0, g1, low in feet_groups(sub[..., 3], top, base):
            (a0, _), (a1, ly) = place(g0, low), place(g1, low)
            feet.append((min(a0, a1), max(a0, a1), pivot[1] - ly))
    out_anchors = {k: [round(v[0], 1), round(v[1], 1)] for k, v in ((k, place(*p)) for k, p in anchors.items())}
    return canvas, {
        'w': canvas.width,
        'h': canvas.height,
        'pivot': [round(pivot[0], 1), round(pivot[1], 1)],
        'anchors': out_anchors,
        'source': {'file': SHEETS[fr['sheet']], 'box': [int(fr['box'][0] + bx0), int(fr['box'][1] + top), int(fr['box'][0] + bx1), int(fr['box'][1] + bottom)], 'scale': round(s, 4), 'flipped': flip},
        **({'overlay': True} if fr.get('overlay') else {}),
        '_feet': feet,
    }


def feet_groups(alpha, top, base, frac=0.085):
    """The feet: runs of painted columns in the lowest rows of the figure,
    as (x0, x1, lowest row) in crop coordinates, left to right."""
    h = base - top
    r0 = int(base - frac * h)
    rows = alpha[r0:base + 1] > 0.3
    cols = np.nonzero(rows.any(0))[0]
    if len(cols) == 0:
        return []
    out = []
    for g in np.split(cols, np.nonzero(np.diff(cols) > 2)[0] + 1):
        if len(g) < 6:
            continue
        seg = rows[:, g[0]:g[-1] + 1]
        out.append((int(g[0]), int(g[-1]) + 1, int(np.nonzero(seg.any(1))[0].max() + r0)))
    return out


def cycle_points(frames, metas):
    """The planted-foot references of a walk cycle: (frame index, foot,
    foot centre relative to the frame's torso pivot (output px), weight)."""
    cons, widths = [], []
    for i, (fr, meta) in enumerate(zip(frames, metas)):
        feet = sorted(meta['_feet'])
        if not feet:
            raise ValueError(f"{fr['name']}: no feet found")
        torso = meta['pivot'][0]
        for group, end, foot, wt in fr['plant']:
            g = min(feet, key=lambda f: f[2]) if group == 'only' else (feet[-1] if group == 'front' else feet[0])
            widths.append(g[1] - g[0])
            cons.append((i, foot, end, (g[0] if end == 'heel' else g[1]) - torso, wt))
    foot_len = float(np.median(widths))
    return [(i, foot, rel + (foot_len / 2 if end == 'heel' else -foot_len / 2), wt) for i, foot, end, rel, wt in cons]


def solve_cycle(name, frames, metas, steps, unit, lock=0.0):
    """Pivots and timing for a walk cycle so the planted feet hold still.

    The actor moves at a steady speed; frame i is shown while the cycle
    distance s is in its window [a_i, a_i+1), its image shifted by c_i and,
    within the window, held back by lock x (s - window middle) (the rig's
    WALK_LOCK). The painted frames are not evenly spaced in time (two
    near-identical contact frames, then a long reach to the passing pose), so
    no single rule (torso pivots, even timing) keeps a planted foot planted.

    Stage 1 finds the stride: the distance per cycle that best explains how
    far the planted feet travel between frames (judged at each window's
    middle, so the unavoidable slide within a held frame cannot bias it).
    Stage 2, stride fixed, picks the windows and the c_i: it minimises the
    planted feet's slide integrated over each window, plus SURGE_WEIGHT x the
    torso's deviation from a steady glide, plus a pull to even windows."""
    from scipy.optimize import minimize
    n = len(frames)
    pts = cycle_points(frames, metas)
    feet_ids = sorted({f.rstrip('-') for _, f, _, _ in pts})
    I = np.array([p[0] for p in pts])
    LAP = np.array([-1.0 if p[1].endswith('-') else 0.0 for p in pts])
    REL = np.array([p[2] for p in pts])
    WT = np.array([p[3] for p in pts])
    FOOT = np.array([feet_ids.index(p[1].rstrip('-')) for p in pts])
    u = np.linspace(-0.5, 0.5, 9)  # samples across a window

    def windows(z, L):
        d = np.exp(np.clip(z, -3, 3))
        return np.concatenate([[0.0], np.cumsum(d / d.sum())]) * L

    def stage1(x):
        c, z, L, P = x[:n], x[n:2 * n], x[2 * n], x[2 * n + 1:]
        a = windows(z, L)
        mid = (a[I] + a[I + 1]) / 2 - LAP * L
        err = mid - c[I] + REL - P[FOOT]
        win = np.diff(a)
        cbar = np.average(c, weights=win)
        return float((WT * err ** 2).sum() + SURGE_WEIGHT * (win * (c - cbar) ** 2).sum() * n / L)

    def stage2(x, L):
        c, z, P = x[:n], x[n:2 * n], x[2 * n:]
        a = windows(z, L)
        win = np.diff(a)
        mid = (a[:-1] + a[1:]) / 2
        # foot slide, sampled across each window
        ss = mid[I][:, None] + win[I][:, None] * u[None, :]
        torso = ss - c[I][:, None] - lock * (ss - mid[I][:, None])
        err = torso - LAP[:, None] * L + REL[:, None] - P[FOOT][:, None]
        foot = (WT[:, None] * err ** 2).mean(1) @ win[I]
        # torso deviation from a steady glide
        cbar = np.average(c, weights=win)
        dev = ((c - cbar)[:, None] + lock * win[:, None] * u[None, :]) ** 2
        torso_cost = (dev.mean(1) * win).sum()
        even = ((win - L / n) ** 2).sum() * L / n * EVEN_WEIGHT
        return float(foot + SURGE_WEIGHT * torso_cost + even)

    # a step is a third of the figure's height or so: search 1/7 .. 2/3
    H = float(max(m['h'] for m in metas))
    L0 = steps * H / 3
    big = 10 * H
    bounds = [(-H, H)] * n + [(-3, 3)] * n + [(steps * H / 7, steps * H * 2 / 3)] + [(-big, big)] * len(feet_ids)
    x0 = np.concatenate([np.zeros(n), np.zeros(n), [L0], np.zeros(len(feet_ids))])
    opts = {'maxiter': 80000, 'xtol': 1e-4, 'ftol': 1e-10}
    r1 = minimize(stage1, x0, method='Powell', bounds=bounds, options=opts)
    r1 = minimize(stage1, r1.x, method='Powell', bounds=bounds, options=opts)
    L = float(r1.x[2 * n])
    x1 = np.concatenate([np.zeros(n), np.zeros(n), r1.x[2 * n + 1:]])
    b2 = bounds[:2 * n] + bounds[2 * n + 1:]
    r2 = minimize(stage2, x1, args=(L,), method='Powell', bounds=b2, options=opts)
    r2 = minimize(stage2, r2.x, args=(L,), method='Powell', bounds=b2, options=opts)
    c, z, P = r2.x[:n], r2.x[n:2 * n], r2.x[2 * n:]
    a = windows(z, L)
    win = np.diff(a)
    cbar = np.average(c, weights=win)
    # the worst slide of a firmly planted foot, at a window's ends
    mid = (a[:-1] + a[1:]) / 2
    slide = 0.0
    for k in np.nonzero(WT >= 0.75)[0]:
        i = I[k]
        for e in (-0.5, 0.5):
            sv = mid[i] + win[i] * e
            t = sv - c[i] - lock * (sv - mid[i])
            slide = max(slide, abs(t - LAP[k] * L + REL[k] - P[FOOT[k]]))
    for i, meta in enumerate(metas):
        meta['pivot'][0] = round(meta['pivot'][0] + float(c[i] - cbar), 1)
    return {
        'frames': [fr['name'] for fr in frames],
        'at': [round(float(v / L), 4) for v in a[:-1]],
        'stride': round(L * unit, 3),
        'steps': steps,
        'lock': lock,
        'maxSlide': round(slide * unit, 2),
        'maxSurge': round(float(np.abs(c - cbar).max() + lock * win.max() / 2) * unit, 2),
    }


def cut_train(name, box, src_dir):
    sub = isolate(sheet('train', src_dir), box)
    bx0, top, bx1, bottom = bbox(sub[..., 3])
    crop = sub[top:bottom + 1, bx0:bx1]
    img = to_image(crop)
    s = TRAIN['length'] / img.width
    w, h = TRAIN['length'], round(img.height * s)
    img = img.resize((w, h), Image.LANCZOS)
    canvas = Image.new('RGBA', (w + 2 * PAD, h + 2 * PAD), (0, 0, 0, 0))
    canvas.paste(img, (PAD, PAD))
    # the end lamps (the right end leads when the train faces right)
    anchors = {}
    for side, (u0, u1) in (('lamp', (0.93, 1.0)), ('tail', (0.0, 0.07))):
        part = crop[:, int(u0 * crop.shape[1]):int(u1 * crop.shape[1])]
        r, g, b = part[..., 0], part[..., 1], part[..., 2]
        if ((r > 200) & (r - b > 70) & (part[..., 3] > 0.5)).sum() >= 15:
            cx, cy = warm_centroid(part)
            anchors[side] = [round(PAD + (cx + int(u0 * crop.shape[1])) * s, 1), round(PAD + cy * s, 1)]
    return canvas, {
        'w': canvas.width, 'h': canvas.height,
        'pivot': [round(PAD + w / 2, 1), round(PAD + h, 1)],
        'anchors': anchors,
        'source': {'file': SHEETS['train'], 'box': [int(box[0] + bx0), int(box[1] + top), int(box[0] + bx1), int(box[1] + bottom + 1)], 'scale': round(s, 4), 'flipped': False},
    }


def cut_prop(name, spec, src_dir):
    sub = isolate(sheet('props', src_dir), spec['box'])
    bx0, top, bx1, bottom = bbox(sub[..., 3])
    crop = sub[top:bottom + 1, bx0:bx1]
    img = to_image(crop)
    s = min(1.0, spec['max'] / max(img.width, img.height))
    w, h = max(1, round(img.width * s)), max(1, round(img.height * s))
    if s != 1.0:
        img = img.resize((w, h), Image.LANCZOS)
    canvas = Image.new('RGBA', (w + 2 * PAD, h + 2 * PAD), (0, 0, 0, 0))
    canvas.paste(img, (PAD, PAD))
    return canvas, {
        'w': canvas.width, 'h': canvas.height,
        'pivot': [round(PAD + w / 2, 1), round(PAD + h / 2, 1)],
        'source': {'file': SHEETS['props'], 'box': [int(spec['box'][0] + bx0), int(spec['box'][1] + top), int(spec['box'][0] + bx1), int(spec['box'][1] + bottom + 1)], 'scale': round(s, 4)},
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', default=os.environ.get('NIGHTFALL_CH1_ART', '/home/claude/art-src/ch1'))
    ap.add_argument('--preview', default=None, help='write QA strips here')
    ap.add_argument('--only', default=None, help='comma list of characters to cut')
    args = ap.parse_args()
    src_dir = Path(args.src)
    for f in SHEETS.values():
        if not (src_dir / f).exists():
            sys.exit(f'missing source {src_dir / f}')
    refs = {k: measure_ref(src_dir, k) for k in REFS}
    atlas = {'version': 1, 'generator': 'scripts/ch1-art/sprites.py', 'urlBase': URL_BASE, 'pad': PAD, 'characters': {}, 'train': {}, 'props': {}}
    previews = {}
    for name, spec in CHARACTERS.items():
        atlas['characters'][name] = {'rigHeight': spec['rigHeight'], 'frameHeight': spec['height'], 'unit': round(spec['rigHeight'] / spec['height'], 6), 'frames': {}}
    if not args.only:
        for stale in OUT_DIR.rglob('*.webp'):
            stale.unlink()
    cut = {}
    for fr in FRAMES:
        if args.only and fr['char'] not in args.only.split(','):
            continue
        img, meta = cut_character_frame(fr, src_dir, refs)
        cut[(fr['char'], fr['name'])] = (fr, img, meta)
    for char, cycles in CYCLES.items():
        for cname, spec in cycles.items():
            if (char, spec['frames'][0]) not in cut:
                continue
            items = [cut[(char, f)] for f in spec['frames']]
            info = solve_cycle(cname, [it[0] for it in items], [it[2] for it in items], spec['steps'], atlas['characters'][char]['unit'], spec.get('lock', WALK_LOCK))
            atlas['characters'][char].setdefault('cycles', {})[cname] = info
            print(f"{char}.{cname}: stride {info['stride']} tile px, max slide {info['maxSlide']}, max surge {info['maxSurge']}, at {info['at']}")
    for (char, name), (fr, img, meta) in cut.items():
        meta.pop('_feet', None)
        rel = f'{char}/{name}.webp'
        save_webp(img, OUT_DIR / rel)
        atlas['characters'][char]['frames'][name] = {'file': rel, **meta}
        previews.setdefault(char, []).append((name, img, meta))
    atlas['train'] = {'rigLength': TRAIN['rigLength'], 'length': TRAIN['length'], 'unit': round(TRAIN['rigLength'] / TRAIN['length'], 6), 'frames': {}}
    for name, box in TRAIN['frames'].items():
        img, meta = cut_train(name, box, src_dir)
        rel = f'train/{name}.webp'
        save_webp(img, OUT_DIR / rel)
        atlas['train']['frames'][name] = {'file': rel, **meta}
        previews.setdefault('train', []).append((name, img, meta))
    for name, spec in PROPS.items():
        img, meta = cut_prop(name, spec, src_dir)
        rel = f'props/{name}.webp'
        save_webp(img, OUT_DIR / rel)
        atlas['props'][name] = {'file': rel, **meta}
        previews.setdefault('props', []).append((name, img, meta))
    if args.only:
        print('--only: atlas not written (partial run)')
    else:
        write_atlas(atlas)
        write_manifest(atlas)
    if args.preview:
        write_previews(previews, Path(args.preview))
    total = sum(p.stat().st_size for p in OUT_DIR.rglob('*.webp'))
    print(f'{sum(len(v) for v in previews.values())} sprites, {total / 1e6:.2f} MB -> {OUT_DIR.relative_to(ROOT)}')


def stamp_versions(atlas):
    """A short content hash per file (the runtime appends it as ?v=, so a
    re-cut sprite is never served stale from a cache)."""
    def visit(entry):
        entry['v'] = hashlib.sha256((OUT_DIR / entry['file']).read_bytes()).hexdigest()[:10]
    for char in atlas['characters'].values():
        for f in char['frames'].values():
            visit(f)
    for f in atlas['train']['frames'].values():
        visit(f)
    for f in atlas['props'].values():
        visit(f)


def write_atlas(atlas):
    stamp_versions(atlas)
    text = json.dumps(atlas, indent=1, sort_keys=False)
    (OUT_DIR / 'atlas.json').write_text(text + '\n')
    digest = hashlib.sha256(text.encode()).hexdigest()[:12]
    ATLAS_JS.write_text(
        '// GENERATED by scripts/ch1-art/sprites.py: do not edit by hand.\n'
        '// The painted Chapter 1 sprites (public/assets/ch1-painted/sprites/):\n'
        '// per frame its file, size, pivot (feet, frame px) and anchors.\n'
        f'// atlas sha256 {digest}\n\n'
        f'const SPRITE_ATLAS = Object.freeze({text});\n\nexport default SPRITE_ATLAS;\n'
    )


def write_manifest(atlas):
    rows = []

    def row(entry, kind):
        src = entry['source']
        box = ' '.join(str(v) for v in src['box'])
        notes = []
        if src.get('flipped'):
            notes.append('mirrored to face right')
        if entry.get('overlay'):
            notes.append('a piece drawn over another frame')
        rows.append(f"| `{entry['file']}` | {kind} | `{src['file']}` | {box} | {src['scale']} | {entry['w']}x{entry['h']} | {', '.join(notes)} |")

    for char, c in atlas['characters'].items():
        for name, f in c['frames'].items():
            row(f, char)
    for name, f in atlas['train']['frames'].items():
        row(f, 'train')
    for name, f in atlas['props'].items():
        row(f, 'prop')
    edited = sorted({f['char'] + '/' + f['name'] for f in FRAMES if f.get('edits')})
    text = '\n'.join([
        '# Chapter 1 painted sprites: provenance',
        '',
        'Generated by George with ChatGPT/Codex image generation (OpenAI), 2026-10-08.',
        'Cut, keyed and normalised by `scripts/ch1-art/sprites.py` (re-run it to regenerate',
        'every file here, `atlas.json` and `src/chapters/nightService/spriteAtlas.js`).',
        '',
        'Sources are the 1536x1024 sheets in the art drop (`C-*.png`), each on a flat grey ground.',
        'Crop box: the figure in source pixels (x0 y0 x1 y1) after keying; scale: output px per source px.',
        f"Frames edited beyond keying (see the script's FRAMES for the polygons): {', '.join(edited)}.",
        '',
        '| Output | Rig / kind | Source | Crop box (source px) | Scale | Size | Notes |',
        '| --- | --- | --- | --- | --- | --- | --- |',
        *rows,
        '',
    ])
    (OUT_DIR / 'ASSET_MANIFEST.md').write_text(text)


def write_previews(previews, out):
    out.mkdir(parents=True, exist_ok=True)
    for char, items in previews.items():
        scale = 0.5 if char != 'props' else 0.5
        tiles = []
        for name, img, meta in items:
            im = img.resize((max(1, int(img.width * scale)), max(1, int(img.height * scale))), Image.LANCZOS)
            tiles.append((name, im, meta))
        H = max(t[1].height for t in tiles) + 8
        W = sum(t[1].width + 8 for t in tiles) + 8
        for label, bg in (('dark', (16, 12, 14)), ('light', (214, 204, 186))):
            canvas = Image.new('RGBA', (W, H), bg + (255,))
            x = 8
            from PIL import ImageDraw
            dr = ImageDraw.Draw(canvas)
            base = H - 4
            for name, im, meta in tiles:
                py = (meta['pivot'][1] if char != 'props' else meta['h']) * scale
                y = int(base - py)
                canvas.alpha_composite(im, (x, max(0, y)))
                px = x + meta['pivot'][0] * scale
                dr.line([(px - 4, base), (px + 4, base)], fill=(255, 60, 60, 255))
                dr.line([(px, base - 4), (px, base)], fill=(255, 60, 60, 255))
                for k, (ax, ay) in meta.get('anchors', {}).items():
                    cx, cy = x + ax * scale, max(0, y) + ay * scale
                    dr.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], outline=(80, 255, 120, 255))
                x += im.width + 8
            canvas.convert('RGB').save(out / f'{char}-{label}.png')


if __name__ == '__main__':
    main()
