"""Paint the title window plate: public/assets/ui/nightfall-title-window.jpg.

The key art (nightfall-title-background.png) has an old wordmark and menu
baked into its top-right sky. The title now draws its own wordmark on the
window glass (src/shell/titleMenu.css), so this paints the baked text out
(normalised-convolution fill plus the sky's own painterly grain), pushes the
cyan glows toward the game's teal and warms the mid-tones a little.

    python3 scripts/title-window-plate.py      # needs opencv-python + numpy
"""
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'public/assets/ui/nightfall-title-background.png')
OUT = os.path.join(ROOT, 'public/assets/ui/nightfall-title-window.jpg')
import cv2, numpy as np
src = cv2.imread(SRC)
h, w = src.shape[:2]
img = src.astype(np.float32)
gray = cv2.cvtColor(src, cv2.COLOR_BGR2GRAY).astype(np.float32)
bg = cv2.medianBlur(cv2.cvtColor(src, cv2.COLOR_BGR2GRAY), 61).astype(np.float32)
diff = gray - bg
mask = np.zeros((h, w), np.uint8)
boxes = [(985, 60, 1530, 236), (1015, 232, 1490, 318), (1060, 336, 1505, 556)]
for x0,y0,x1,y1 in boxes:
    sub = diff[y0:y1, x0:x1]
    m = (sub > 7).astype(np.uint8) * 255
    b,g,r = [src[y0:y1, x0:x1, i].astype(int) for i in range(3)]
    cy = ((b > r + 18) & (g > r + 10) & (b > 55)).astype(np.uint8) * 255
    mask[y0:y1, x0:x1] = cv2.bitwise_or(m, cy)
mask[352:422, 1078:1478] = 255  # the baked highlight box
mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((2,2), np.uint8))
mask = cv2.dilate(mask, np.ones((5,5), np.uint8), iterations=3)
m = mask.astype(np.float32)/255
keep = 1 - m
fill = np.zeros_like(img)
for s in (6, 14, 30):
    num = cv2.GaussianBlur(img * keep[...,None], (0,0), s)
    den = cv2.GaussianBlur(keep, (0,0), s)[...,None]
    est = num / np.maximum(den, 1e-3)
    # use the finest scale where enough known pixels exist
    ok = (den > 0.25).astype(np.float32)
    if s == 6: fill = est; have = ok
    else: fill = fill * have + est * (1 - have); have = np.maximum(have, ok)
# painterly grain from clean sky
tex_src = src[10:190, 620:980].astype(np.float32)
hp = tex_src - cv2.GaussianBlur(tex_src, (0,0), 2.5)
th, tw = hp.shape[:2]
tile = np.zeros_like(img)
for yy in range(0, h, th):
    for xx in range(0, w, tw):
        hh = min(th, h-yy); ww = min(tw, w-xx)
        tile[yy:yy+hh, xx:xx+ww] = hp[:hh, :ww]
fill = fill + tile
soft = cv2.GaussianBlur(m, (0,0), 2)[..., None]
res = img * (1 - soft) + fill * soft
res = np.clip(res, 0, 255).astype(np.uint8)
# warm grade: cool cyan glows pushed toward the game's teal, a little amber in the mids
hsv = cv2.cvtColor(res, cv2.COLOR_BGR2HSV).astype(np.float32)
H, S, V = hsv[...,0], hsv[...,1], hsv[...,2]
cyan = np.clip(1 - np.abs(H - 92) / 16, 0, 1)
S *= 1 - 0.55 * cyan
H[:] = H - 6 * cyan
hsv[...,1] = S
g = cv2.cvtColor(np.clip(hsv,0,255).astype(np.uint8), cv2.COLOR_HSV2BGR).astype(np.float32)
lum = g.mean(axis=2, keepdims=True) / 255
mid = 4 * lum * (1 - lum)
g[...,2] += 10 * mid[...,0]      # red
g[...,1] += 4 * mid[...,0]       # green
g[...,0] -= 6 * mid[...,0]       # blue
res = np.clip(g, 0, 255).astype(np.uint8)
cv2.imwrite(OUT, res, [cv2.IMWRITE_JPEG_QUALITY, 90, cv2.IMWRITE_JPEG_PROGRESSIVE, 1])
