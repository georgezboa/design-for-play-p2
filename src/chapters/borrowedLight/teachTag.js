// Chapter 2 · where a first-use key tag (HOLD Q · LISTEN) sits.
//
// Pure (no Phaser). The tag is anchored at its bottom centre (Phaser origin
// 0.5, 1). It goes just above Butch's head; if a hanging neon sign is there
// (alpha round 2, R2-1: the tag covered LAUNDRY), beside him at chest
// height; then just below his feet, on the roof edge's facade.

export const TEACH_TAG_HEAD_GAP = 16;
const SIDE_GAP = 40;
const SIGN_PAD = 10;
// Sign art heights (art/worldArt.js buildSigns): 60 px, the hotel 110 px;
// the hanging brackets reach 40 px above the board.
const SIGN_H = 60;
const HOTEL_SIGN_H = 110;
const BRACKET_H = 40;
const BOARD_PAD = 30;

// World rectangles of the playfield signs (the parallax 'far' signs scroll
// at another rate and are never next to Butch).
export function signRects(signs) {
  return signs
    .filter((sign) => !sign.scroll && sign.layer !== 'far')
    .map((sign) => {
      const h = sign.layer === 'hotel' ? HOTEL_SIGN_H : SIGN_H;
      // The painted board hangs BOARD_PAD below the sign's y (paintSign).
      return { x0: sign.x - sign.w / 2, x1: sign.x + sign.w / 2, y0: sign.y - BRACKET_H, y1: sign.y + BOARD_PAD + h, text: sign.text };
    });
}

const overlaps = (a, b, pad = SIGN_PAD) => a.x1 > b.x0 - pad && a.x0 < b.x1 + pad && a.y1 > b.y0 - pad && a.y0 < b.y1 + pad;

export function tagRect({ x, y }, tagW, tagH) {
  return { x0: x - tagW / 2, x1: x + tagW / 2, y0: y - tagH, y1: y };
}

export function placeTeachTag({ feetX, feetY, bodyH, tagW, tagH, rects }) {
  const chestY = feetY - bodyH * 0.35;
  const candidates = [
    { x: feetX, y: feetY - bodyH - TEACH_TAG_HEAD_GAP, at: 'head' },
    { x: feetX + SIDE_GAP + tagW / 2, y: chestY, at: 'right' },
    { x: feetX - SIDE_GAP - tagW / 2, y: chestY, at: 'left' },
    { x: feetX, y: feetY + 14 + tagH, at: 'feet' },
  ];
  const clear = candidates.find((candidate) => !rects.some((rect) => overlaps(tagRect(candidate, tagW, tagH), rect)));
  return clear ?? candidates[candidates.length - 1];
}
