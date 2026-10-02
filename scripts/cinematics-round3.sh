#!/bin/bash
# Round 3 (2026-10-01) edits to the transition films, as run. Input is the
# films from before this pass (release/1.0 @ 86ff01f), so running it again on
# the current public/cinematics would grade twice. Usage:
#   scripts/cinematics-round3.sh <dir with the original films> <out dir>
#
# 1-2, 2-3: regraded toward the game palette (neon magenta -> brass/amber,
#   cyan -> muted teal, calmer blues, lower saturation, warm mids and highs
#   over teal shadows, soft blacks, light temporal grain). Captions stay
#   burned in; the sound is copied untouched.
# 4-5: the black slate (14.5-17.4 s) has Butch's line still running over it
#   until 17.75 s, then 17.85-20.0 s is music only. So 1.8 s of black
#   (15.3-17.1) is cut from the picture and 1.8 s of the music-only gap
#   (17.85-19.65) from the sound; they meet again from 19.65 s and no speech
#   is cut. While the picture runs ahead, the line's caption box is held
#   from a slate frame until the voice ends. The silent held museum frame
#   after the last line (36.8-38.23 s) is trimmed with a short fade.
#   38.23 s -> 35.0 s. Nothing in the code times these films.
set -e
IN=${1:?original films dir}
OUT=${2:?output dir}
mkdir -p "$OUT"
G="huesaturation=hue=50:saturation=-0.7:intensity=-0.15:colors=m:strength=4,huesaturation=hue=5:saturation=-0.45:intensity=-0.16:colors=c:strength=4,huesaturation=saturation=-0.2:colors=b:strength=2,eq=saturation=0.82,colorbalance=bs=0.035:rm=0.065:gm=0.01:bm=-0.075:rh=0.07:gh=0.025:bh=-0.1,curves=all='0/0.015 0.5/0.49 1/0.95',noise=alls=5:allf=t"
for N in 1-2 2-3; do
  ffmpeg -v error -y -i "$IN/$N.mp4" -vf "$G" -c:v libx264 -preset slow -crf 23 -maxrate 1900k -bufsize 3800k -pix_fmt yuv420p -profile:v high -movflags +faststart -c:a copy "$OUT/$N.mp4"
done
ffmpeg -v error -y -i "$IN/1-2.mp4" -i "$IN/1-2.webm" -map 0:v -map 1:a -vf "$G" -c:v libvpx-vp9 -b:v 1050k -minrate 500k -maxrate 1600k -deadline good -cpu-used 3 -row-mt 1 -pix_fmt yuv420p -c:a copy "$OUT/1-2.webm"
ffmpeg -v error -y -i "$IN/2-3.mp4" -i "$IN/2-3.webm" -map 0:v -map 1:a -vf "$G" -c:v libvpx-vp9 -b:v 850k -minrate 400k -maxrate 1150k -deadline good -cpu-used 3 -row-mt 1 -pix_fmt yuv420p -c:a copy "$OUT/2-3.webm"

FC="[0:v]trim=0:15.3,setpts=PTS-STARTPTS[v1];\
[0:v]trim=17.1:36.8,setpts=PTS-STARTPTS[v2];\
[v1][v2]concat=n=2:v=1:a=0[vc];\
[0:v]trim=16.5:16.54,setpts=PTS-STARTPTS,crop=1130:142:75:541,loop=loop=-1:size=1:start=0,setpts=N/30/TB[cap];\
[vc][cap]overlay=75:541:enable='between(t,15.95,17.8)':eof_action=pass:shortest=0,fade=t=out:st=34.45:d=0.55,format=yuv420p[v];\
[0:a]atrim=0:17.85,asetpts=PTS-STARTPTS[a1];\
[0:a]atrim=19.45:36.8,asetpts=PTS-STARTPTS[a2];\
[a1][a2]acrossfade=d=0.2:c1=tri:c2=tri,afade=t=out:st=34.4:d=0.6[a]"
ffmpeg -v error -y -i "$IN/4-5.mp4" -filter_complex "$FC" -map "[v]" -map "[a]" -t 35.0 -r 30 \
  -c:v libx264 -preset slow -crf 22 -maxrate 1500k -bufsize 3000k -profile:v high -movflags +faststart \
  -c:a aac -b:a 160k -ar 48000 "$OUT/4-5.mp4"
ffmpeg -v error -y -i "$IN/4-5.mp4" -filter_complex "$FC" -map "[v]" -map "[a]" -t 35.0 -r 30 \
  -c:v libvpx-vp9 -b:v 800k -minrate 400k -maxrate 1300k -deadline good -cpu-used 3 -row-mt 1 -pix_fmt yuv420p \
  -c:a libopus -b:a 128k "$OUT/4-5.webm"

# Round 3b (alpha round 3): 1-2 ended on a 2 s crossfade into the old pixel
# prototype screen ("CHAPTER ONE // CYBERPUNK PARKOUR"). Cut at 31.0 s with a
# 0.7 s fade; run on the regraded film from above.
# ffmpeg -i 1-2.mp4 -t 31.0 -vf "fade=t=out:st=30.3:d=0.7" -af "afade=t=out:st=30.1:d=0.9" -c:v libx264 -crf 20 -preset slow -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 160k 1-2.cut.mp4
# ffmpeg -i 1-2.cut.mp4 -c:v libvpx-vp9 -crf 34 -b:v 0 -row-mt 1 -c:a libopus -b:a 112k 1-2.cut.webm
