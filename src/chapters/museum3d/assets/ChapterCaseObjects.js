// The four objects the Museum has "already filed" (docs/STORY_BIBLE.md §5),
// one per earlier chapter, in the corridor cases and — smaller — laid out as
// evidence in the lobby's central case:
//
//   night-service   — the orchard case, its BELLWETHER tag and hawthorn leaf
//   borrowed-light  — Mara's punched city-line ticket stub
//   echo-city       — the duplicate reservation (M. VENN) and Nika's torn page
//   painted-country — Plate IV, a print of Rosa's childhood drawing
//
// Every paper surface is a small canvas painting in the Chapter 1 ink
// language (ivory paper, walnut ink, one amber or oxblood accent), so the
// objects read as the same documents the one-answer exhibit shows up close.

import * as THREE from 'three';

const INK = '#2a1d14';
const PAPER = '#efe4cc';
const OXBLOOD = '#8a2a1e';
const AMBER = '#e0a24a';

function paperTexture(pxW, pxH, draw, { transparent = false } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = pxW;
  canvas.height = pxH;
  const c = canvas.getContext('2d');
  draw(c, pxW, pxH);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.userData = { transparent };
  return texture;
}

function paperMesh(name, width, height, texture, { transparent = false } = {}) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshStandardMaterial({
      map: texture, roughness: 0.95, metalness: 0, side: THREE.DoubleSide,
      transparent, alphaTest: transparent ? 0.4 : 0,
    }),
  );
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function grain(c, w, h, seed = 3) {
  let a = seed;
  const random = () => { a = (a * 16807) % 2147483647; return a / 2147483647; };
  c.save();
  for (let i = 0; i < (w * h) / 90; i += 1) {
    c.fillStyle = random() > 0.5 ? 'rgba(90,60,30,0.05)' : 'rgba(255,255,240,0.06)';
    c.fillRect(random() * w, random() * h, 1.4, 1.4);
  }
  c.restore();
}

function mono(c, text, x, y, size, { color = INK, align = 'left', weight = 700 } = {}) {
  c.fillStyle = color;
  c.font = `${weight} ${size}px "Space Mono", "Courier New", monospace`;
  c.textAlign = align;
  c.textBaseline = 'middle';
  c.fillText(text, x, y);
}

function serif(c, text, x, y, size, { color = INK, align = 'left', italic = false } = {}) {
  c.fillStyle = color;
  c.font = `${italic ? 'italic ' : ''}700 ${size}px Georgia, serif`;
  c.textAlign = align;
  c.textBaseline = 'middle';
  c.fillText(text, x, y);
}

/** A hawthorn sprig: a crooked twig, three lobed leaves, white blossom. */
export function drawHawthornLeaf(c, x, y, s = 1, { color = '#4f6b3a', blossom = true } = {}) {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.strokeStyle = '#3a2718';
  c.lineWidth = 2.2;
  c.lineCap = 'round';
  c.beginPath(); c.moveTo(-22, 16); c.quadraticCurveTo(-4, 4, 20, -14); c.stroke();
  for (const [lx, ly, a] of [[-8, 7, -0.9], [4, -1, 0.6], [14, -10, -0.5]]) {
    c.save();
    c.translate(lx, ly);
    c.rotate(a);
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(-7, -6, -2, -14);
    c.quadraticCurveTo(0, -9, 3, -15);
    c.quadraticCurveTo(8, -7, 0, 0);
    c.fill();
    c.restore();
  }
  if (blossom) {
    for (const [bx, by] of [[18, -18], [-14, 10]]) {
      c.fillStyle = '#f4eee4';
      for (let k = 0; k < 5; k += 1) {
        const ang = (k / 5) * Math.PI * 2;
        c.beginPath(); c.arc(bx + Math.cos(ang) * 3, by + Math.sin(ang) * 3, 2.4, 0, Math.PI * 2); c.fill();
      }
      c.fillStyle = '#c46a7a';
      c.beginPath(); c.arc(bx, by, 1.4, 0, Math.PI * 2); c.fill();
    }
  }
  c.restore();
}

// ---------------------------------------------------------------------------

function orchardCase({ small = false } = {}) {
  const group = new THREE.Group();
  group.name = 'case-object-orchard-case';
  const leather = new THREE.MeshStandardMaterial({ color: 0x6b4526, roughness: 0.78, metalness: 0.02 });
  const seam = new THREE.MeshStandardMaterial({ color: 0x4a2e18, roughness: 0.9 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xb08a4a, roughness: 0.4, metalness: 0.75 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.42, 0.2), leather);
  body.name = 'orchard-case-body';
  body.castShadow = true;
  group.add(body);
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.035, 0.205), seam);
  band.position.y = 0.09;
  group.add(band);
  for (const x of [-0.19, 0.19]) {
    const latch = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.02), brass);
    latch.position.set(x, 0.14, 0.11);
    group.add(latch);
    const corner = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.212), brass);
    corner.position.set(x * 1.45, -0.185, 0);
    group.add(corner);
  }
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.014, 8, 18, Math.PI), seam);
  handle.position.set(0, 0.21, 0);
  group.add(handle);
  // the luggage tag on its string, turned to face the visitor
  const tagTexture = paperTexture(320, 180, (c, w, h) => {
    c.fillStyle = PAPER;
    c.beginPath(); c.moveTo(34, 0); c.lineTo(w, 0); c.lineTo(w, h); c.lineTo(34, h); c.lineTo(0, h / 2); c.closePath(); c.fill();
    grain(c, w, h, 11);
    c.fillStyle = 'rgba(40,25,15,0.85)';
    c.beginPath(); c.arc(30, h / 2, 9, 0, Math.PI * 2); c.fill();
    serif(c, 'BELLWETHER', 70, 64, 36);
    mono(c, 'CLAIM 1978-0412', 72, 112, 18, { color: OXBLOOD });
    drawHawthornLeaf(c, 262, 128, 1.1);
  });
  const tag = paperMesh('orchard-case-bellwether-tag', 0.2, 0.112, tagTexture);
  tag.position.set(0.12, 0.02, 0.118);
  tag.rotation.z = -0.22;
  group.add(tag);
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.2, 5), new THREE.MeshBasicMaterial({ color: 0xd8c8a0 }));
  string.position.set(0.02, 0.13, 0.112);
  string.rotation.z = 1.15;
  group.add(string);
  group.userData.swing = tag;
  if (small) group.scale.setScalar(0.62);
  return group;
}

function drawTicketStub(c, w, h) {
  c.clearRect(0, 0, w, h);
  c.fillStyle = '#e9dcbc';
  c.fillRect(0, 0, w, h);
  grain(c, w, h, 21);
  // perforated right edge: the stub was torn off the ticket
  c.globalCompositeOperation = 'destination-out';
  for (let y = 8; y < h; y += 16) { c.beginPath(); c.arc(w, y, 6, 0, Math.PI * 2); c.fill(); }
  // the conductor's punch, through the paper
  c.beginPath(); c.arc(w * 0.8, h * 0.32, 15, 0, Math.PI * 2); c.fill();
  c.globalCompositeOperation = 'source-over';
  c.strokeStyle = 'rgba(40,25,15,0.55)';
  c.lineWidth = 2;
  c.beginPath(); c.arc(w * 0.8, h * 0.32, 16, 0, Math.PI * 2); c.stroke();
  c.fillStyle = '#23434a';
  c.fillRect(0, 0, w, 42);
  mono(c, 'CITY LINE', 22, 22, 24, { color: '#eadfc6' });
  mono(c, 'No 0412', w - 40, 22, 18, { color: AMBER, align: 'right' });
  serif(c, 'Terminal Row', 22, 84, 30);
  serif(c, '→ Bellwether', 22, 124, 30);
  mono(c, 'SINGLE · ADULT · 17 OCT 1978', 22, h - 26, 15, { color: OXBLOOD });
}

function ticketStub({ small = false } = {}) {
  const group = new THREE.Group();
  group.name = 'case-object-city-line-ticket-stub';
  const stub = paperMesh('city-line-ticket-stub', 0.42, 0.2, paperTexture(420, 200, drawTicketStub), { transparent: true });
  stub.rotation.z = 0.06;
  group.add(stub);
  // a small brass easel so the stub stands up in the case
  const brass = new THREE.MeshStandardMaterial({ color: 0xb08a4a, roughness: 0.4, metalness: 0.75 });
  const ledge = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.014, 0.05), brass);
  ledge.position.set(0, -0.11, 0.02);
  group.add(ledge);
  if (small) group.scale.setScalar(0.62);
  return group;
}

function drawReservation(c, w, h) {
  c.fillStyle = '#f1e8d2';
  c.fillRect(0, 0, w, h);
  grain(c, w, h, 31);
  c.strokeStyle = 'rgba(42,29,20,0.35)';
  c.lineWidth = 1;
  for (let y = 70; y < h - 20; y += 26) { c.beginPath(); c.moveTo(18, y); c.lineTo(w - 18, y); c.stroke(); }
  mono(c, 'ECHO CITY · RESERVATIONS', 20, 30, 17);
  mono(c, 'No 43', w - 20, 30, 17, { align: 'right', color: OXBLOOD });
  mono(c, 'M. VENN', 24, 92, 30);
  mono(c, '07:10 EASTBOUND · CASH', 24, 140, 17);
  // the rubber stamp
  c.save();
  c.translate(w * 0.66, h * 0.72);
  c.rotate(-0.16);
  c.strokeStyle = OXBLOOD;
  c.lineWidth = 4;
  c.strokeRect(-92, -24, 184, 48);
  mono(c, 'DUPLICATE', 0, 2, 26, { color: OXBLOOD, align: 'center' });
  c.restore();
}

function drawTornPage(c, w, h) {
  c.clearRect(0, 0, w, h);
  c.fillStyle = '#e6dcc2';
  c.beginPath();
  c.moveTo(0, 0); c.lineTo(w, 0);
  // the torn edge
  let y = 0;
  for (let k = 0; k <= 16; k += 1) { y = (k / 16) * h; c.lineTo(w - 18 + Math.sin(k * 2.7) * 14 + (k % 3) * 5, y); }
  c.lineTo(0, h); c.closePath(); c.fill();
  grain(c, w, h, 41);
  c.strokeStyle = 'rgba(42,29,20,0.3)';
  for (let yy = 40; yy < h - 10; yy += 24) { c.beginPath(); c.moveTo(14, yy); c.lineTo(w - 44, yy); c.stroke(); }
  mono(c, 'RES. 43 · M. VE', 16, 52, 17);
  mono(c, 'MARA V', 16, 100, 19, { color: OXBLOOD });
}

function duplicateReservation({ small = false } = {}) {
  const group = new THREE.Group();
  group.name = 'case-object-duplicate-reservation';
  const page = paperMesh('nika-torn-page', 0.26, 0.32, paperTexture(260, 320, drawTornPage), { transparent: true });
  page.position.set(-0.1, 0.04, -0.012);
  page.rotation.z = 0.18;
  group.add(page);
  const slip = paperMesh('reservation-m-venn', 0.36, 0.24, paperTexture(360, 240, drawReservation));
  slip.position.set(0.06, -0.03, 0.004);
  slip.rotation.z = -0.07;
  group.add(slip);
  if (small) group.scale.setScalar(0.62);
  return group;
}

/** Rosa's childhood drawing of the orchard: crayon lane, hawthorn, one walker. */
export function drawRosaDrawing(c, w, h, { credit = 'PLATE IV · ARTIST UNKNOWN' } = {}) {
  c.fillStyle = '#f3ead6';
  c.fillRect(0, 0, w, h);
  grain(c, w, h, 51);
  const crayon = (color, width, pts) => {
    c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x * w, y * h) : c.moveTo(x * w, y * h))); c.stroke();
  };
  // sky scribble and sun
  c.fillStyle = 'rgba(224,162,74,0.85)';
  c.beginPath(); c.arc(w * 0.84, h * 0.18, h * 0.07, 0, Math.PI * 2); c.fill();
  for (let k = 0; k < 8; k += 1) {
    const a = (k / 8) * Math.PI * 2;
    crayon('rgba(224,162,74,0.8)', 3, [[0.84 + Math.cos(a) * 0.05, 0.18 + Math.sin(a) * 0.09], [0.84 + Math.cos(a) * 0.075, 0.18 + Math.sin(a) * 0.135]]);
  }
  // green hills
  c.fillStyle = 'rgba(96,130,70,0.55)';
  c.beginPath(); c.moveTo(0, h * 0.62); c.quadraticCurveTo(w * 0.3, h * 0.48, w * 0.6, h * 0.6); c.quadraticCurveTo(w * 0.8, h * 0.66, w, h * 0.56); c.lineTo(w, h); c.lineTo(0, h); c.fill();
  // the lane
  crayon('#8a6a3a', 10, [[0.02, 0.9], [0.3, 0.78], [0.5, 0.74], [0.72, 0.66], [0.9, 0.6]]);
  // the orchard house, a red roof
  c.fillStyle = '#e6dcc2'; c.fillRect(w * 0.74, h * 0.4, w * 0.16, h * 0.2);
  crayon(INK, 3, [[0.74, 0.4], [0.9, 0.4], [0.9, 0.6], [0.74, 0.6], [0.74, 0.4]]);
  c.fillStyle = '#b53c35'; c.beginPath(); c.moveTo(w * 0.72, h * 0.41); c.lineTo(w * 0.82, h * 0.28); c.lineTo(w * 0.92, h * 0.41); c.fill();
  c.fillStyle = 'rgba(224,162,74,0.9)'; c.fillRect(w * 0.8, h * 0.46, w * 0.04, h * 0.06);
  // the hawthorn: Mara's mark
  crayon('#4a3121', 6, [[0.28, 0.76], [0.27, 0.55], [0.3, 0.42]]);
  c.fillStyle = 'rgba(79,107,58,0.9)';
  c.beginPath(); c.ellipse(w * 0.29, h * 0.38, w * 0.1, h * 0.13, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#fbf6ec';
  for (let k = 0; k < 16; k += 1) c.fillRect(w * (0.21 + ((k * 37) % 17) / 100), h * (0.28 + ((k * 23) % 19) / 100), 5, 5);
  // one figure walking home
  crayon(INK, 3.5, [[0.52, 0.64], [0.52, 0.72]]);
  crayon(INK, 3, [[0.52, 0.72], [0.5, 0.77]]);
  crayon(INK, 3, [[0.52, 0.72], [0.545, 0.77]]);
  crayon(INK, 3, [[0.49, 0.67], [0.555, 0.67]]);
  c.fillStyle = INK; c.beginPath(); c.arc(w * 0.52, h * 0.61, 5, 0, Math.PI * 2); c.fill();
  mono(c, credit, w * 0.04, h * 0.96, Math.round(h * 0.045), { color: '#6b5640' });
}

function rosaPlate({ small = false } = {}) {
  const group = new THREE.Group();
  group.name = 'case-object-plate-iv-rosa-drawing';
  const walnut = new THREE.MeshStandardMaterial({ color: 0x2c1d13, roughness: 0.7, metalness: 0.05 });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.42, 0.03), walnut);
  frame.castShadow = true;
  group.add(frame);
  const print = paperMesh('plate-iv-print', 0.5, 0.36, paperTexture(500, 360, (c, w, h) => drawRosaDrawing(c, w, h)));
  print.position.z = 0.017;
  group.add(print);
  if (small) group.scale.setScalar(0.62);
  return group;
}

const BUILDERS = Object.freeze({
  'night-service': orchardCase,
  'borrowed-light': ticketStub,
  'echo-city': duplicateReservation,
  'painted-country': rosaPlate,
});

export const CHAPTER_CASE_OBJECT_IDS = Object.freeze(Object.keys(BUILDERS));

export function createChapterCaseObject(id, options = {}) {
  const build = BUILDERS[id];
  if (!build) throw new Error(`No chapter case object for: ${id}`);
  return build(options);
}

export function animateChapterCaseObject(group, timeSeconds) {
  const swing = group?.userData?.swing;
  if (swing) swing.rotation.z = -0.22 + Math.sin(timeSeconds * 0.9) * 0.03;
}
