"""NIGHTFALL title screen, painted (round 10): George's title paintings → runtime plates.

    python3 -I scripts/title-art/build.py [--art DIR] [--standins DIR]

Inputs (read-only): George's TT-*.png (title-batch.json) in --art (default /home/claude/art-src/title);
any item not there yet is built from its stand-in in --standins (make_standins.py: the round-6 procedural
title captured at 1536 x 1024, and simple shapes), into public/assets/title/standin/ (git-ignored).

Outputs:
  public/assets/title/*.webp        the plates (real paintings only)
  src/shell/titlePlates.generated.js  TITLE_PLATES (sizes, keyed glass, strip bands, sprite anchors),
                                      TITLE_GEOMETRY (where things are in the carriage, as fractions),
                                      TITLE_COMPLETE (true once every plate is a real painting)
  scripts/title-art/manifest.json

The carriage: its two pure-green glasses are keyed to alpha (the big window and the end door's little
window: the two largest keyed regions). The lit twin is aligned onto it (the edit tool may shift a few px)
and takes the carriage's own glass. The outside layers are keyed (their sky), trimmed to their band and
made seamless (their ends cross-faded) so they scroll endlessly. The pole and the lamp are cut out and
trimmed; the pole's crossarm and the lamp's flame are found for the wires and the light.
"""
import argparse
import importlib.util
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/assets/title'
STAND_OUT = OUT / 'standin'
GEN = ROOT / 'src/shell/titlePlates.generated.js'
MANIFEST = Path(__file__).resolve().parent / 'manifest.json'
BATCH = Path(__file__).resolve().parent / 'title-batch.json'

# the cutscene build's keyer and pair aligner
_spec = importlib.util.spec_from_file_location('cutscene_build', ROOT / 'scripts/cutscene-art/build.py')
_cb = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_cb)
key_green, align_pair = _cb.key_green, _cb.align_pair

# Where things are in the carriage (fractions of its width and height). REAL is the brief's layout
# (title-batch.json layout_note) until measured on George's painting; STAND is the round-6 procedural
# title at 1536 x 1024, which the stand-in is a capture of.
REAL_GEOMETRY = {
    'butch': {'x': 0.395, 'headX': 0.425, 'headY': 0.42, 'capTop': 0.36},
    'lamp': [0.515, 0.585],
    'pendant': [0.73, 0.075],
    'wall': [0.585, 0.065, 0.28, 0.83],
    'narrow': [0.02, 0.10, 0.58, 0.68],
    # the moon in TT-sky (fractions of the sky plate)
    'moon': [0.32, 0.40],
}
STAND_GEOMETRY = {
    'butch': {'x': 0.306, 'headX': 0.313, 'headY': 0.4996, 'capTop': 0.428},
    'lamp': [0.4372, 0.6192],
    'pendant': [0.7547, 0.082],
    'wall': [0.6197, 0.13, 0.27, 0.77],
    'narrow': [0.015, 0.12, 0.6, 0.73],
    'moon': [0.392, 0.453],
}

SEAM = 96  # px cross-faded at the ends of each outside strip
WEBP_Q = 86


def load_items():
    return {it['id']: it for it in json.loads(BATCH.read_text())['items']}


def source(id, art, stand):
    real = art / f'{id}.png'
    if real.exists():
        return Image.open(real).convert('RGB'), False
    return Image.open(stand / f'{id}.png').convert('RGB'), True


def glass_regions(alpha):
    """The keyed regions, largest first: [x, y, w, h] px."""
    mask = (alpha < 128).astype(np.uint8)
    n, _, stats, _ = cv2.connectedComponentsWithStats(mask, 8)
    regions = sorted((stats[i] for i in range(1, n)), key=lambda s: -s[cv2.CC_STAT_AREA])
    return [[int(s[0]), int(s[1]), int(s[2]), int(s[3])] for s in regions if s[cv2.CC_STAT_AREA] > 400]


def seamless(rgba):
    """Cross-fade the last SEAM px over the first SEAM px and drop them: the strip then tiles.
    The blend is premultiplied, so the keyed (clear) green never tints the picture's edge."""
    a = rgba.astype(np.float32)
    alpha = a[..., 3:4] / 255
    pre = np.concatenate([a[..., :3] * alpha, alpha * 255], axis=2)
    w = a.shape[1]
    t = np.linspace(0, 1, SEAM, dtype=np.float32)[None, :, None]
    pre[:, :SEAM] = pre[:, w - SEAM:] * (1 - t) + pre[:, :SEAM] * t
    pre = pre[:, : w - SEAM]
    out_a = pre[..., 3:4] / 255
    rgb = np.where(out_a > 1e-3, pre[..., :3] / np.maximum(out_a, 1e-3), 0)
    return np.concatenate([rgb, pre[..., 3:4]], axis=2).clip(0, 255).astype(np.uint8)


def band_top(alpha):
    """The first row where the layer is solid across a fair share of the width."""
    solid = (alpha > 128).mean(axis=1)
    rows = np.where(solid > 0.02)[0]
    return int(rows[0]) if len(rows) else 0


def bbox(alpha):
    ys, xs = np.where(alpha > 24)
    return int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)


def save(img, name, stand):
    folder = STAND_OUT if stand else OUT
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f'{name}.webp'
    img.save(path, 'WEBP', quality=WEBP_Q, method=6)
    rel = '/' + str(path.relative_to(ROOT / 'public'))
    return rel, path.stat().st_size


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--art', default='/home/claude/art-src/title')
    ap.add_argument('--standins', default='/home/claude/art-src/title-standin')
    args = ap.parse_args()
    art, stand = Path(args.art), Path(args.standins)
    items = load_items()
    plates, manifest = {}, {}

    def record(id, name, img, is_stand, **info):
        src, size = save(img, name, is_stand)
        plates[name] = {'src': src, 'size': list(img.size), 'standIn': is_stand, **info}
        manifest[id] = {'out': src, 'bytes': size, 'standIn': is_stand, **info}
        print(f'{id:18s} {"stand-in" if is_stand else "painting"}  {img.size[0]}x{img.size[1]}  {size // 1024} KB')

    # the carriage and its lit twin
    rgb, carriage_stand = source('TT-carriage', art, stand)
    keyed, _, _ = key_green(np.array(rgb))
    regions = glass_regions(keyed[..., 3])
    if len(regions) < 2:
        raise SystemExit(f'TT-carriage: expected two green glasses, found {len(regions)}')
    big, door = regions[0], regions[1]
    record('TT-carriage', 'carriage', Image.fromarray(keyed), carriage_stand, glass=big, door=door)
    lit_rgb, lit_stand = source('TT-carriage-lit', art, stand)
    lit_rgb, align = align_pair(rgb, lit_rgb)
    lit = np.array(lit_rgb.convert('RGB'))
    lit_rgba = np.dstack([lit, keyed[..., 3]])
    record('TT-carriage-lit', 'carriage-lit', Image.fromarray(lit_rgba), lit_stand or carriage_stand, align=align)

    sky, sky_stand = source('TT-sky', art, stand)
    record('TT-sky', 'sky', sky, sky_stand)

    # the outside layers: keyed sky, trimmed to the band, seamless
    for id, name in (('TT-hills', 'hills'), ('TT-orchard', 'orchard'), ('TT-trackside', 'trackside')):
        img, is_stand = source(id, art, stand)
        rgba, _, _ = key_green(np.array(img))
        top = max(0, band_top(rgba[..., 3]) - 6)
        H = rgba.shape[0]
        tiled = seamless(rgba[top:])
        record(id, name, Image.fromarray(tiled), is_stand, top=round(top / H, 4), sourceSize=[img.size[0], H])

    # the pole and the lamp, cut out
    for id, name in (('TT-pole', 'pole'), ('TT-lamp', 'lamp')):
        img, is_stand = source(id, art, stand)
        rgba, _, _ = key_green(np.array(img))
        x0, y0, x1, y1 = bbox(rgba[..., 3])
        cut = rgba[y0:y1, x0:x1]
        info = {}
        alpha = cut[..., 3] > 128
        widths = alpha.sum(axis=1)
        if name == 'pole':
            # the crossarm: the first wide row from the top
            post = np.median(widths[len(widths) // 2:])
            rows = np.where(widths > post * 3)[0]
            info['arm'] = round(float(rows[0] / cut.shape[0]) if len(rows) else 0.06, 4)
        else:
            lum = cut[..., :3].astype(np.float32).mean(axis=2) * alpha
            ys, xs = np.where(lum >= np.percentile(lum[alpha], 99.5))
            info['flame'] = [round(float(xs.mean() / cut.shape[1]), 4), round(float(ys.mean() / cut.shape[0]), 4)]
        record(id, name, Image.fromarray(cut), is_stand, **info)

    # through the end door: only the middle of it shows, through a tall narrow window
    img, is_stand = source('TT-next-carriage', art, stand)
    w, h = img.size
    mid = img.crop((int(w * 0.3), 0, int(w * 0.7), h))
    record('TT-next-carriage', 'next-carriage', mid, is_stand)

    complete = not any(p['standIn'] for p in plates.values())
    geometry = STAND_GEOMETRY if carriage_stand else REAL_GEOMETRY
    lines = lambda d: '{\n' + ',\n'.join(f'  {json.dumps(k)}: {json.dumps(v)}' for k, v in d.items()) + '\n}'
    js = ['// Generated by scripts/title-art/build.py: do not edit by hand.',
          '// The painted title (round 10): George\'s plates, keyed and measured. Fractions are of each plate.',
          f'export const TITLE_PLATES = Object.freeze({lines(plates)});',
          f'export const TITLE_GEOMETRY = Object.freeze({lines(geometry)});',
          f'export const TITLE_COMPLETE = {"true" if complete else "false"};', '']
    GEN.write_text('\n'.join(js))
    MANIFEST.write_text(json.dumps({'complete': complete, 'items': manifest}, indent=1))
    print('complete' if complete else 'stand-ins in use', '→', GEN.relative_to(ROOT))


if __name__ == '__main__':
    main()
