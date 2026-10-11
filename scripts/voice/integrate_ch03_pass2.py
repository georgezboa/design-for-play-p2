"""NIGHTFALL Chapter 3 voice pass 2 (2026-10-11): George's ElevenLabs takes → the game.

    python3 -I scripts/voice/integrate_ch03_pass2.py --in DIR [--dry-run]

Reads scripts/voice/ch03-pass2.json (the 48 lines written after the August voice pass) and the
takes in DIR, one per line, named <lineId>.<ext> (CH03_LEV_0199.mp3) or <NN>.<ext> (the sheet's
number, 01.mp3). Any of mp3 / wav / m4a / ogg / flac.

For each take: trim the silence at both ends, match the loudness of that character's existing
recordings (their mean integrated loudness), and encode Ogg Vorbis 44.1 kHz stereo like the rest:
public/assets/chapter03-3d/voice/ch03/<speaker>/<lineId>.ogg. Then add the lines to the voice
manifest and regenerate src/cars/presentCity3d/generated/chapter03VoiceAssets.js from it (byte for
byte what the manifest gives). A take whose length is far from its text's is reported (the wrong
line saved under a name).

The Chapter 3 source lock (tests/car03/chapter3TemporaryFinalLock.test.mjs) signs the generated
file: re-sign it after a real run.
"""
import argparse
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BATCH = Path(__file__).resolve().parent / 'ch03-pass2.json'
VOICE = ROOT / 'public/assets/chapter03-3d/voice/ch03'
MANIFEST = VOICE / 'manifest.json'
GENERATED = ROOT / 'src/cars/presentCity3d/generated/chapter03VoiceAssets.js'
EXTS = ('.mp3', '.wav', '.m4a', '.ogg', '.flac')


def folder_of(speaker):
    return re.sub(r'[^a-z0-9]+', '_', speaker.lower()).strip('_')


def loudness(path):
    """Integrated loudness (LUFS) of a file, by ffmpeg's loudnorm analysis."""
    out = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(path), '-af', 'loudnorm=print_format=json', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    m = re.search(r'\{[^{}]*"input_i"[^{}]*\}', out, re.S)
    return float(json.loads(m.group(0))['input_i']) if m else None


def duration(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(path)], capture_output=True, text=True).stdout
    return float(out.strip() or 0)


def generated_js(lines):
    entries = [f'  {json.dumps(l["key"], ensure_ascii=False)}: {{\n    "lineId": {json.dumps(l["lineId"])},\n    "url": {json.dumps(l["url"])}\n  }}' for l in lines]
    return '\n'.join([
        '// Generated from the locked NIGHTFALL voice manifest. Do not edit by hand.',
        'const ASSETS = Object.freeze({',
        ',\n'.join(entries),
        '});\n\nexport function chapter03VoiceAssetFor(speaker, text) {\n  return ASSETS[`${speaker}\\0${text}`] ?? null;\n}\n',
        f'export const CHAPTER03_VOICE_ASSET_COUNT = {len(lines)};\n',
    ])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--in', dest='src', required=True)
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()
    batch = json.loads(BATCH.read_text())
    manifest = json.loads(MANIFEST.read_text())
    # the generator must reproduce today's file before it may replace it
    if generated_js(manifest['lines']) != GENERATED.read_text() or json.dumps(manifest, ensure_ascii=False, indent=2) + '\n' != MANIFEST.read_text():
        sys.exit('the manifest or the generated voice table is not in the shape this script writes: stop')

    items = batch['items']
    by_id = {i['lineId'].lower(): i for i in items}
    by_n = {i['n']: i for i in items}
    takes = {}
    for f in sorted(Path(args.src).iterdir()):
        if f.suffix.lower() not in EXTS:
            continue
        stem = f.stem.strip()
        item = by_id.get(stem.lower())
        if not item and re.fullmatch(r'\d{1,2}', stem):
            item = by_n.get(int(stem))
        if not item:
            print(f'?? {f.name}: not a line of the sheet (name it CH03_..._0000 or 01–{len(items):02d})')
            continue
        if item['lineId'] in takes:
            print(f'?? {f.name}: a second take for {item["lineId"]}, using {takes[item["lineId"]].name}')
            continue
        takes[item['lineId']] = f
    missing = [i for i in items if i['lineId'] not in takes]
    gaps = ', '.join('%02d' % i['n'] for i in missing) or 'none'
    print(f'{len(takes)} takes for {len(items)} lines; missing: {gaps}')

    targets = {}
    known = {l['lineId'] for l in manifest['lines']}
    added = []
    with tempfile.TemporaryDirectory() as tmp:
        for item in items:
            take = takes.get(item['lineId'])
            if not take:
                continue
            sp = item['speaker']
            if sp not in targets:
                theirs = sorted((VOICE / folder_of(sp)).glob('*.ogg'))[:8]
                values = [v for v in (loudness(p) for p in theirs) if v is not None and v > -70]
                targets[sp] = sum(values) / len(values) if values else -20.0
            out = (Path(tmp) if args.dry_run else VOICE / folder_of(sp)) / f'{item["lineId"]}.ogg'
            out.parent.mkdir(parents=True, exist_ok=True)
            trim = 'silenceremove=start_periods=1:start_threshold=-55dB:start_silence=0.08,areverse,silenceremove=start_periods=1:start_threshold=-55dB:start_silence=0.12,areverse'
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(take), '-af', f'{trim},loudnorm=I={targets[sp]:.1f}:TP=-1.5:LRA=11',
                            '-ar', '44100', '-ac', '2', '-c:a', 'libvorbis', '-q:a', '4', str(out)], check=True)
            secs = duration(out)
            rate = len(item['text']) / max(0.1, secs)
            flag = '' if 7 <= rate <= 26 else f'   << {rate:.0f} chars/s: is this the right line?'
            print(f'{item["n"]:02d} {item["lineId"]:22s} {secs:5.1f} s  {targets[sp]:.1f} LUFS{flag}')
            if item['lineId'] in known:
                continue
            added.append({'key': f'{sp}\0{item["text"]}', 'lineId': item['lineId'], 'speaker': sp, 'text': item['text'],
                          'url': f'./assets/chapter03-3d/voice/ch03/{folder_of(sp)}/{item["lineId"]}.ogg'})
    if args.dry_run:
        print('dry run: nothing written')
        return
    manifest['lines'].extend(added)
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    GENERATED.write_text(generated_js(manifest['lines']))
    print(f'added {len(added)} lines → {MANIFEST.relative_to(ROOT)}, {GENERATED.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
