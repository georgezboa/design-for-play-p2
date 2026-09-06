#!/usr/bin/env python3
"""Render narrative review cuts over the four existing transition videos.

The source pictures and embedded music/SFX are preserved. This script adds
subtitle/title overlays, reuses shipped character recordings, creates only the
few missing temporary voices with macOS `say`, and ducks the source audio under
dialogue. It writes review files outside public/cinematics.
"""

from __future__ import annotations

import json
import subprocess
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
SOURCE_DIR = ROOT / "public" / "cinematics"
OUT = ROOT / "output" / "transition-narrative-v04-butch"
CARDS = OUT / "cards"
VOICES = OUT / "voice"
FINAL = OUT / "final"
FONT = Path("/System/Library/Fonts/Avenir Next.ttc")
WIDTH, HEIGHT = 1280, 720


@dataclass(frozen=True)
class Line:
    start: float
    speaker: str
    text: str
    audio: Path
    color: tuple[int, int, int]


@dataclass(frozen=True)
class Overlay:
    start: float
    end: float
    kind: str
    text: str
    speaker: str = ""
    color: tuple[int, int, int] = (232, 239, 238)


CYAN = (104, 224, 227)
AMBER = (238, 181, 87)
IVORY = (232, 239, 238)
RED = (226, 112, 96)


CH3 = ROOT / "public" / "assets" / "chapter03-3d" / "voice" / "ch03"
CH5 = ROOT / "public" / "museum3d" / "voice" / "ch05"


SPECS = {
    "1-2": {
        "title": "THE TRAIN ACCEPTS THE SEARCH",
        "text": [
            (4.2, 6.7, "system", "ROUTE RESTORED."),
            (10.5, 13.7, "system", "LAST CONTACT // BORROWED GRID"),
        ],
        "lines": [
            (15.1, "BUTCH", "Have you seen this woman on the line?", CH3 / "butch" / "CH03_BUTCH_0012.ogg", CYAN),
            (18.2, "BUTCH", "No safe path on foot. The train is the only way through.", CH3 / "butch" / "CH03_BUTCH_0245.ogg", CYAN),
            (25.0, "BUTCH", "Every train leaves a little of itself here.", CH3 / "butch" / "CH03_BUTCH_0307.ogg", CYAN),
        ],
    },
    "2-3": {
        "title": "THE LETTER BECOMES EVIDENCE",
        "lines": [
            (1.0, "BUTCH", "Choice does not guarantee she is still safe. The message is already a day old.", CH3 / "butch" / "CH03_BUTCH_0151.ogg", CYAN),
            (7.2, "BUTCH", "She left voluntarily, or somebody made it look that way. Either way, someone here remembers the route.", CH3 / "butch" / "CH03_BUTCH_0227.ogg", CYAN),
            (14.2, "BUTCH", "No. Personal. Mara disappeared. Echo City is the first place anyone saw her afterward.", CH3 / "butch" / "CH03_BUTCH_0226.ogg", CYAN),
        ],
    },
    "3-4": {
        "title": "DIRECTION IS NOT PERMISSION",
        "lines": [
            (0.4, "BUTCH", "She was alive. She chose to leave. She built the message alone and travelled east.", CH3 / "butch" / "CH03_BUTCH_0175.ogg", CYAN),
            (6.8, "BUTCH", "If I continue, I need to know whether I am checking that she is safe or refusing to accept that she left. Those are not the same investigation.", CH3 / "butch" / "CH03_BUTCH_0206.ogg", CYAN),
        ],
    },
    "4-5": {
        "title": "THE ARCHIVE REMOVES THE COST",
        "text": [
            (16.0, 19.7, "system", "SUCCESS PRESERVED. COST OMITTED."),
        ],
        "lines": [
            (0.7, "BUTCH", "Someone always had to stay five minutes later.", CH5 / "butch" / "CH05_BUTCH_0003.ogg", CYAN),
            (10.2, "BUTCH", "When Mara crossed Echo City, people were lowering shutters, returning books, cleaning stone, and waiting for the last car.", CH5 / "butch" / "CH05_BUTCH_0007.ogg", CYAN),
            (20.0, "BUTCH", "She was not moving through a case file. She was moving through other people's evening.", CH5 / "butch" / "CH05_BUTCH_0008.ogg", CYAN),
            (31.0, "BUTCH", "That sounds more like a city than the museum labels do.", CH5 / "butch" / "CH05_BUTCH_0005.ogg", CYAN),
        ],
    },
}


def run(args: list[str]) -> None:
    print("+", " ".join(args[:8]), "..." if len(args) > 8 else "")
    subprocess.run(args, check=True)


def probe_duration(path: Path) -> float:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        check=True,
        capture_output=True,
        text=True,
    )
    return float(result.stdout.strip())


def make_tts(slug: str, index: int, text: str, voice: str, rate: int) -> Path:
    aiff = VOICES / f"{slug}-tts-{index:02d}.aiff"
    wav = VOICES / f"{slug}-tts-{index:02d}.wav"
    if not wav.exists() or wav.stat().st_size < 1000:
        if not aiff.exists() or aiff.stat().st_size <= 4096:
            run(["say", "-v", voice, "-r", str(rate), "-o", str(aiff), text])
        run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(aiff), "-ar", "48000", "-ac", "1", str(wav)])
    return wav


def font(size: int, index: int = 0) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT), size=size, index=index)


def wrap(draw: ImageDraw.ImageDraw, text: str, face: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        trial = f"{current} {word}".strip()
        if not current or draw.textbbox((0, 0), trial, font=face)[2] <= max_width:
            current = trial
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_card(path: Path, overlay: Overlay) -> None:
    image = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    if overlay.kind == "title":
        face = font(26)
        text = overlay.text
        box = draw.textbbox((0, 0), text, font=face)
        x = (WIDTH - (box[2] - box[0])) / 2
        draw.rounded_rectangle((x - 22, 34, x + (box[2] - box[0]) + 22, 82), 10, fill=(5, 11, 17, 150), outline=(104, 224, 227, 100), width=1)
        draw.text((WIDTH / 2, 58), text, font=face, fill=(228, 238, 238, 235), anchor="mm", stroke_width=1, stroke_fill=(0, 0, 0, 150))
    elif overlay.kind == "system":
        face = font(27)
        box = draw.textbbox((0, 0), overlay.text, font=face)
        tw = box[2] - box[0]
        draw.rounded_rectangle(((WIDTH - tw) / 2 - 24, 104, (WIDTH + tw) / 2 + 24, 156), 8, fill=(4, 10, 16, 165), outline=(104, 224, 227, 105), width=1)
        draw.text((WIDTH / 2, 130), overlay.text, font=face, fill=(188, 244, 241, 245), anchor="mm", stroke_width=1, stroke_fill=(0, 0, 0, 180))
    else:
        speaker_face = font(23)
        body_face = font(34)
        body_lines = wrap(draw, overlay.text, body_face, 1030)
        if len(body_lines) > 2:
            body_face = font(30)
            body_lines = wrap(draw, overlay.text, body_face, 1080)
        line_height = body_face.size + 8
        panel_h = 56 + len(body_lines) * line_height
        top = HEIGHT - 38 - panel_h
        draw.rounded_rectangle((76, top, WIDTH - 76, HEIGHT - 38), 16, fill=(3, 7, 11, 190), outline=(*overlay.color, 100), width=2)
        draw.text((WIDTH / 2, top + 25), overlay.speaker, font=speaker_face, fill=(*overlay.color, 255), anchor="mm")
        y = top + 51
        for body_line in body_lines:
            draw.text((WIDTH / 2, y), body_line, font=body_face, fill=(247, 247, 243, 255), anchor="ma", stroke_width=2, stroke_fill=(0, 0, 0, 220))
            y += line_height
    image.save(path)


def render_visual(slug: str, duration: float, overlays: list[Overlay]) -> Path:
    source = SOURCE_DIR / f"{slug}.mp4"
    out = OUT / f"{slug}-visual.mp4"
    inputs = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(source)]
    cards: list[Path] = []
    for i, overlay in enumerate(overlays):
        card = CARDS / f"{slug}-{i:02d}.png"
        draw_card(card, overlay)
        cards.append(card)
        inputs += ["-loop", "1", "-i", str(card)]
    chain = []
    previous = "0:v"
    for i, overlay in enumerate(overlays, start=1):
        label = f"v{i}"
        chain.append(f"[{previous}][{i}:v]overlay=0:0:enable='between(t,{overlay.start:.3f},{overlay.end:.3f})'[{label}]")
        previous = label
    run(inputs + ["-filter_complex", ";".join(chain), "-map", f"[{previous}]", "-an", "-t", f"{duration:.3f}", "-r", "30", "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p", str(out)])
    return out


def render_audio(slug: str, duration: float, lines: list[Line]) -> Path:
    source = SOURCE_DIR / f"{slug}.mp4"
    out = OUT / f"{slug}-mix.wav"
    args = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(source)]
    for line in lines:
        args += ["-i", str(line.audio)]
    filters = [f"[0:a]aresample=48000,volume=0.90,apad=whole_dur={duration:.3f}[bed]"]
    voice_labels = []
    for i, line in enumerate(lines, start=1):
        label = f"voice{i}"
        delay = int(round(line.start * 1000))
        filters.append(f"[{i}:a]aresample=48000,highpass=f=80,lowpass=f=12000,volume=1.10,adelay={delay}:all=1[{label}]")
        voice_labels.append(f"[{label}]")
    filters.append("".join(voice_labels) + f"amix=inputs={len(lines)}:duration=longest:normalize=0,apad=whole_dur={duration:.3f},asplit=2[voicekey][voicemix]")
    filters.append("[bed][voicekey]sidechaincompress=threshold=0.015:ratio=8:attack=15:release=420:makeup=1[ducked]")
    filters.append(f"[ducked][voicemix]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.88,loudnorm=I=-15:TP=-1.5:LRA=11,atrim=duration={duration:.3f}[aout]")
    run(args + ["-filter_complex", ";".join(filters), "-map", "[aout]", "-ar", "48000", "-ac", "2", str(out)])
    return out


def mux(slug: str, duration: float, visual: Path, audio: Path) -> Path:
    out = FINAL / f"{slug}-narrative-review-v04-butch.mp4"
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(visual), "-i", str(audio), "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-t", f"{duration:.3f}", "-movflags", "+faststart", str(out)])
    return out


def main() -> None:
    for directory in (OUT, CARDS, VOICES, FINAL):
        directory.mkdir(parents=True, exist_ok=True)
    manifest = {}
    for slug, spec in SPECS.items():
        duration = probe_duration(SOURCE_DIR / f"{slug}.mp4")
        lines = [Line(*item) for item in spec.get("lines", [])]
        for i, item in enumerate(spec.get("tts", []), start=1):
            start, speaker, text, voice, rate, color = item
            lines.append(Line(start, speaker, text, make_tts(slug, i, text, voice, rate), color))
        lines.sort(key=lambda item: item.start)
        overlays = [Overlay(0.35, 3.25, "title", spec["title"])]
        overlays.extend(Overlay(*item) for item in spec.get("text", []))
        for line in lines:
            end = min(duration - 0.08, line.start + probe_duration(line.audio) + 0.30)
            overlays.append(Overlay(line.start, end, "dialogue", line.text, line.speaker, line.color))
        overlays.sort(key=lambda item: (item.start, item.kind != "title"))
        visual = render_visual(slug, duration, overlays)
        audio = render_audio(slug, duration, lines)
        final = mux(slug, duration, visual, audio)
        manifest[slug] = {
            "source": str(SOURCE_DIR / f"{slug}.mp4"),
            "review": str(final),
            "duration": duration,
            "dialogue": [
                {"start": line.start, "end": min(duration, line.start + probe_duration(line.audio)), "speaker": line.speaker, "text": line.text, "audio": str(line.audio)}
                for line in lines
            ],
        }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
