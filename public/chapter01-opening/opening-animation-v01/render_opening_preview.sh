#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="${0:A:h}"
FRAME_DIR="$SCRIPT_DIR/frames"
OUTPUT_FILE="$SCRIPT_DIR/NIGHTFALL_OPENING_ANIMATION_PREVIEW_V01.mp4"
NARRATION_FILE="$SCRIPT_DIR/audio/opening-narration-v01.aiff"

if [[ ! -s "$NARRATION_FILE" ]]; then
  echo "Missing narration audio: $NARRATION_FILE" >&2
  exit 1
fi

cd "$SCRIPT_DIR"

/opt/homebrew/bin/ffmpeg -y \
  -loop 1 -framerate 30 -t 4.5 -i "$FRAME_DIR/intro-00.png" \
  -loop 1 -framerate 30 -t 4.5 -i "$FRAME_DIR/intro-01.png" \
  -loop 1 -framerate 30 -t 4.5 -i "$FRAME_DIR/intro-02.png" \
  -loop 1 -framerate 30 -t 4.5 -i "$FRAME_DIR/intro-03.png" \
  -loop 1 -framerate 30 -t 2.5 -i "$FRAME_DIR/world-00.png" \
  -loop 1 -framerate 30 -t 2.5 -i "$FRAME_DIR/world-01.png" \
  -loop 1 -framerate 30 -t 2.5 -i "$FRAME_DIR/world-02.png" \
  -loop 1 -framerate 30 -t 3.5 -i "$FRAME_DIR/world-03.png" \
  -loop 1 -framerate 30 -t 3.5 -i "$FRAME_DIR/ch01-target.png" \
  -loop 1 -framerate 30 -t 1.9 -i "$FRAME_DIR/ch01-gameplay.png" \
  -i "$NARRATION_FILE" \
  -f lavfi -t 30.8 -i "anoisesrc=color=brown:amplitude=0.25:sample_rate=48000" \
  -filter_complex "\
    [0:v]zoompan=z='min(zoom+0.00018,1.025)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=960x600:fps=30,trim=duration=4.5,setpts=PTS-STARTPTS[v0];\
    [1:v]zoompan=z='min(zoom+0.00016,1.022)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=960x600:fps=30,trim=duration=4.5,setpts=PTS-STARTPTS[v1];\
    [2:v]zoompan=z='min(zoom+0.00020,1.028)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=960x600:fps=30,trim=duration=4.5,setpts=PTS-STARTPTS[v2];\
    [3:v]zoompan=z='min(zoom+0.00024,1.032)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=960x600:fps=30,trim=duration=4.5,setpts=PTS-STARTPTS[v3];\
    [4:v]zoompan=z='min(zoom+0.00028,1.026)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=960x600:fps=30,trim=duration=2.5,setpts=PTS-STARTPTS[v4];\
    [5:v]zoompan=z='min(zoom+0.00028,1.026)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=960x600:fps=30,trim=duration=2.5,setpts=PTS-STARTPTS[v5];\
    [6:v]zoompan=z='min(zoom+0.00028,1.026)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=960x600:fps=30,trim=duration=2.5,setpts=PTS-STARTPTS[v6];\
    [7:v]zoompan=z='min(zoom+0.00024,1.028)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=960x600:fps=30,trim=duration=3.5,setpts=PTS-STARTPTS[v7];\
    [8:v]zoompan=z='min(zoom+0.00016,1.018)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=960x600:fps=30,trim=duration=3.5,setpts=PTS-STARTPTS[v8];\
    [9:v]scale=960:600,trim=duration=1.9,setpts=PTS-STARTPTS[v9];\
    [v0][v1]xfade=transition=fade:duration=0.4:offset=4.1[x1];\
    [x1][v2]xfade=transition=fade:duration=0.4:offset=8.2[x2];\
    [x2][v3]xfade=transition=fade:duration=0.4:offset=12.3[x3];\
    [x3][v4]xfade=transition=wipeleft:duration=0.4:offset=16.4[x4];\
    [x4][v5]xfade=transition=wipeleft:duration=0.4:offset=18.5[x5];\
    [x5][v6]xfade=transition=wipeleft:duration=0.4:offset=20.6[x6];\
    [x6][v7]xfade=transition=wipeleft:duration=0.4:offset=22.7[x7];\
    [x7][v8]xfade=transition=fade:duration=0.4:offset=25.8[x8];\
    [x8][v9]xfade=transition=fade:duration=0.4:offset=28.9[vout];\
    [10:a]volume=1.18,adelay=300|300[voice];\
    [11:a]lowpass=f=720,highpass=f=45,volume=0.075[amb];\
    [voice][amb]amix=inputs=2:duration=longest:dropout_transition=2,afade=t=out:st=29.9:d=0.9[aout]" \
  -map "[vout]" -map "[aout]" \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -r 30 \
  -c:a aac -b:a 192k -ar 48000 -t 30.8 -movflags +faststart \
  "$OUTPUT_FILE"

echo "$OUTPUT_FILE"
