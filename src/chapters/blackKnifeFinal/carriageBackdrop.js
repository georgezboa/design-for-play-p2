// THE BLACK TICKET's backdrop: the last carriage of the night service, seen
// from the line at night (round 3, the arena was an empty dark field). One
// Canvas 2D painting, made once into a Phaser canvas texture by BossScene.
//
// It is the Chapter 1 carriage from outside, in the finale palette: an
// oxblood-and-walnut body with a brass waist line, a row of lamp-lit windows
// (empty seats, luggage racks, half-drawn paper blinds, rain on the glass),
// the observation platform and a red tail lamp at its end, standing on a far
// track. It is painted dim and low in contrast on purpose: the fight is a
// bullet field, and every shot must still read over it.

const TAU = Math.PI * 2;

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function glow(c, x, y, r, rgb, alpha) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${alpha})`);
  g.addColorStop(0.4, `rgba(${rgb},${alpha * 0.4})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  c.fillStyle = g;
  c.fillRect(x - r, y - r, r * 2, r * 2);
}

function roundTopRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x, y + h);
  c.lineTo(x, y + r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.lineTo(x + w - r, y);
  c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h);
  c.closePath();
}

// Layout in a W×H field (the battle is 1100×560). Exported for tests/QA.
export function lastCarriageLayout(w = 1100, h = 560) {
  const bodyTop = Math.round(h * 0.215);
  const bodyBottom = Math.round(h * 0.64);
  const endX = Math.round(w * 0.11);
  const bayW = Math.round(w * 0.084);
  const gap = Math.round(w * 0.028);
  const windows = [];
  for (let x = endX + Math.round(w * 0.075); x + bayW < w + bayW; x += bayW + gap) {
    windows.push({ x, y: bodyTop + Math.round(h * 0.058), w: bayW, h: Math.round(h * 0.2) });
  }
  return { w, h, bodyTop, bodyBottom, endX, railY: bodyBottom + Math.round(h * 0.09), windows, tailLamp: { x: endX - 30, y: bodyTop + Math.round(h * 0.17) } };
}

export function paintLastCarriage(c, w = 1100, h = 560) {
  const L = lastCarriageLayout(w, h);
  const random = rng(1978);
  c.save();

  // ---- sky: walnut night, a moon behind rain cloud, far hills ----
  const sky = c.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#1a120c');
  sky.addColorStop(0.62, '#0e0a07');
  sky.addColorStop(1, '#070504');
  c.fillStyle = sky;
  c.fillRect(0, 0, w, h);
  glow(c, w * 0.2, h * 0.1, h * 0.42, '234,223,198', 0.07);
  c.fillStyle = '#0c0806';
  c.beginPath();
  c.moveTo(0, L.railY - 18);
  for (let x = 0; x <= w; x += 40) c.lineTo(x, L.railY - 40 - Math.sin(x * 0.011) * 14 - Math.sin(x * 0.031) * 6);
  c.lineTo(w, L.railY); c.lineTo(0, L.railY); c.closePath(); c.fill();
  for (let i = 0; i < 9; i += 1) glow(c, random() * w, L.railY - 36 + random() * 14, 6, '224,162,74', 0.5);

  // ---- far track and ballast ----
  const ground = c.createLinearGradient(0, L.railY - 6, 0, h);
  ground.addColorStop(0, '#120c08');
  ground.addColorStop(1, '#060403');
  c.fillStyle = ground;
  c.fillRect(0, L.railY - 6, w, h - L.railY + 6);
  for (let x = -10; x < w; x += 26) { c.fillStyle = '#21160f'; c.fillRect(x, L.railY + 2, 16, 5); }
  c.fillStyle = 'rgba(176, 138, 74, 0.55)';
  c.fillRect(0, L.railY, w, 2);

  // ---- underframe and bogies ----
  c.fillStyle = '#0d0907';
  c.fillRect(L.endX, L.bodyBottom, w - L.endX, L.railY - L.bodyBottom - 18);
  for (const bx of [L.endX + 120, L.endX + 220, w * 0.72, w * 0.82]) {
    for (const dx of [-26, 26]) {
      c.fillStyle = '#16100b';
      c.beginPath(); c.arc(bx + dx, L.railY - 17, 17, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(176, 138, 74, 0.35)';
      c.lineWidth = 2;
      c.stroke();
      c.fillStyle = 'rgba(176, 138, 74, 0.45)';
      c.beginPath(); c.arc(bx + dx, L.railY - 17, 3, 0, TAU); c.fill();
    }
    c.fillStyle = '#1b130d';
    c.fillRect(bx - 50, L.railY - 30, 100, 8);
  }

  // ---- the body: oxblood over walnut, brass cant rail and waist line ----
  const body = c.createLinearGradient(0, L.bodyTop, 0, L.bodyBottom);
  body.addColorStop(0, '#3a1b14');
  body.addColorStop(0.55, '#2c140f');
  body.addColorStop(1, '#1d0e0a');
  c.fillStyle = body;
  c.fillRect(L.endX, L.bodyTop, w - L.endX, L.bodyBottom - L.bodyTop);
  // roof and clerestory
  c.fillStyle = '#140d09';
  c.beginPath();
  c.moveTo(L.endX - 8, L.bodyTop + 2);
  c.quadraticCurveTo(L.endX - 4, L.bodyTop - 26, L.endX + 30, L.bodyTop - 28);
  c.lineTo(w, L.bodyTop - 28); c.lineTo(w, L.bodyTop + 2); c.closePath(); c.fill();
  c.fillStyle = '#1b120c';
  c.fillRect(L.endX + 40, L.bodyTop - 44, w - L.endX - 40, 18);
  for (let x = L.endX + 60; x < w; x += 46) {
    c.fillStyle = 'rgba(224, 162, 74, 0.28)';
    c.fillRect(x, L.bodyTop - 40, 24, 9);
  }
  c.fillStyle = 'rgba(176, 138, 74, 0.6)';
  c.fillRect(L.endX, L.bodyTop + 6, w - L.endX, 2);
  c.fillRect(L.endX, L.bodyBottom - 62, w - L.endX, 3);
  c.fillStyle = 'rgba(217, 181, 110, 0.25)';
  c.fillRect(L.endX, L.bodyBottom - 59, w - L.endX, 1);
  // panel seams and rivets between the bays
  for (const win of L.windows) {
    const sx = win.x - 15;
    c.fillStyle = 'rgba(0, 0, 0, 0.35)';
    c.fillRect(sx, L.bodyTop + 10, 2, L.bodyBottom - L.bodyTop - 14);
    for (let y = L.bodyTop + 18; y < L.bodyBottom - 6; y += 22) {
      c.fillStyle = 'rgba(176, 138, 74, 0.35)';
      c.beginPath(); c.arc(sx + 7, y, 1.4, 0, TAU); c.fill();
    }
  }

  // ---- the windows: the carriage is lit and empty ----
  L.windows.forEach((win, index) => {
    const { x, y, w: ww, h: wh } = win;
    // spill on the body under each window
    glow(c, x + ww / 2, y + wh + 24, ww * 0.9, '224,162,74', 0.12);
    c.save();
    roundTopRect(c, x, y, ww, wh, 12);
    c.clip();
    const inside = c.createLinearGradient(0, y, 0, y + wh);
    inside.addColorStop(0, 'rgba(255, 207, 122, 0.5)');
    inside.addColorStop(0.6, 'rgba(224, 162, 74, 0.4)');
    inside.addColorStop(1, 'rgba(138, 74, 30, 0.42)');
    c.fillStyle = '#1a0f09';
    c.fillRect(x, y, ww, wh);
    c.fillStyle = inside;
    c.fillRect(x, y, ww, wh);
    glow(c, x + ww / 2, y + 10, ww * 0.55, '255,226,170', 0.5);
    // luggage rack with one forgotten case, and the seat backs
    c.fillStyle = 'rgba(42, 29, 20, 0.85)';
    c.fillRect(x, y + wh * 0.26, ww, 3);
    if (index % 3 === 1) {
      c.fillStyle = 'rgba(109, 74, 44, 0.9)';
      c.fillRect(x + ww * 0.28, y + wh * 0.26 - 13, ww * 0.34, 13);
      c.fillStyle = 'rgba(176, 138, 74, 0.8)';
      c.fillRect(x + ww * 0.36, y + wh * 0.26 - 13, 3, 13);
    }
    c.fillStyle = 'rgba(28, 19, 13, 0.92)';
    for (const sx of [0.08, 0.56]) {
      roundTopRect(c, x + ww * sx, y + wh * 0.62, ww * 0.36, wh * 0.4, 7);
      c.fill();
    }
    // a paper blind, half drawn, on some windows
    if (index % 4 === 2 || index % 4 === 3) {
      const drop = wh * (index % 4 === 2 ? 0.42 : 0.3);
      c.fillStyle = 'rgba(239, 228, 204, 0.42)';
      c.fillRect(x, y, ww, drop);
      c.fillStyle = 'rgba(176, 138, 74, 0.7)';
      c.fillRect(x + ww / 2 - 4, y + drop - 2, 8, 3);
    }
    // rain on the glass
    for (let i = 0; i < 7; i += 1) {
      const rx = x + random() * ww;
      const ry = y + random() * wh * 0.7;
      c.fillStyle = 'rgba(234, 223, 198, 0.16)';
      c.fillRect(rx, ry, 1.2, 10 + random() * 22);
    }
    c.restore();
    c.strokeStyle = 'rgba(176, 138, 74, 0.7)';
    c.lineWidth = 2.5;
    roundTopRect(c, x, y, ww, wh, 12);
    c.stroke();
    c.fillStyle = 'rgba(176, 138, 74, 0.5)';
    c.fillRect(x - 3, y + wh, ww + 6, 4);
  });

  // ---- lettering on the waist panel ----
  c.save();
  c.font = `700 ${Math.round(h * 0.03)}px Georgia, "Times New Roman", serif`;
  c.textBaseline = 'middle';
  c.fillStyle = 'rgba(217, 181, 110, 0.5)';
  const lineY = L.bodyBottom - 34;
  const text = 'N I G H T   S E R V I C E';
  c.fillText(text, L.endX + 150, lineY);
  // kept left of the Black Ticket board, which hangs over the far bays
  const after = L.endX + 150 + c.measureText(text).width + 28;
  c.font = `700 ${Math.round(h * 0.02)}px "Space Mono", ui-monospace, monospace`;
  c.fillStyle = 'rgba(217, 181, 110, 0.42)';
  c.fillText('LAST CARRIAGE · No. 6', after, lineY + 1);
  c.restore();

  // ---- the end: observation platform, railing, the red tail lamp ----
  c.fillStyle = '#170d09';
  c.fillRect(L.endX - 6, L.bodyTop - 4, 10, L.bodyBottom - L.bodyTop + 8);
  c.fillStyle = '#100a07';
  c.fillRect(L.endX - 70, L.bodyBottom - 6, 76, 10);
  c.strokeStyle = 'rgba(176, 138, 74, 0.6)';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(L.endX - 68, L.bodyBottom - 70); c.lineTo(L.endX - 4, L.bodyBottom - 70);
  for (let x = L.endX - 66; x <= L.endX - 6; x += 12) { c.moveTo(x, L.bodyBottom - 70); c.lineTo(x, L.bodyBottom - 6); }
  c.stroke();
  // the rear door, ajar on a lit vestibule
  c.fillStyle = 'rgba(224, 162, 74, 0.32)';
  c.fillRect(L.endX - 2, L.bodyTop + 30, 5, L.bodyBottom - L.bodyTop - 40);
  const { x: lx, y: ly } = L.tailLamp;
  c.fillStyle = '#1b120c';
  c.fillRect(lx - 3, ly - 22, 6, 18);
  glow(c, lx, ly, 70, '208,64,46', 0.45);
  c.fillStyle = '#d0402e';
  c.beginPath(); c.arc(lx, ly, 8, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255, 210, 190, 0.9)';
  c.beginPath(); c.arc(lx - 2, ly - 2, 2.5, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(176, 138, 74, 0.8)';
  c.lineWidth = 2;
  c.beginPath(); c.arc(lx, ly, 10, 0, TAU); c.stroke();

  // ---- rain and a last darkening so the bullet field reads ----
  for (let i = 0; i < 160; i += 1) {
    c.fillStyle = `rgba(234, 223, 198, ${0.035 + random() * 0.05})`;
    c.fillRect(random() * w, random() * h, 1.2, 8 + random() * 16);
  }
  const veil = c.createLinearGradient(0, 0, 0, h);
  veil.addColorStop(0, 'rgba(7, 5, 4, 0.45)');
  veil.addColorStop(0.45, 'rgba(7, 5, 4, 0.25)');
  veil.addColorStop(1, 'rgba(7, 5, 4, 0.55)');
  c.fillStyle = veil;
  c.fillRect(0, 0, w, h);
  c.restore();
  return L;
}
