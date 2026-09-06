// Editable primitive-geometry helpers for the P0 graybox. Every surface here
// is a box or plane with a shared material — no final art, no model files.

import * as THREE from 'three';
import { createMuseumMaterialLibrary } from '../assets/MuseumMaterials.js';

const materialCache = new Map();

// Invisible interaction hit-volume for small objects (tickets, knobs).
// Raycast ignores material visibility, so this stays clickable but unseen.
const proxyMaterial = new THREE.MeshBasicMaterial({ visible: false });

export function hitProxy(parent, { x = 0, y = 0, z = 0, w = 0.6, h = 0.6, d = 0.6, name = 'hit-proxy' } = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), proxyMaterial);
  mesh.position.set(x, y, z);
  mesh.name = name;
  parent.add(mesh);
  return mesh;
}

export function mat(color, options = {}) {
  const key = `${color}|${JSON.stringify(options)}`;
  if (!materialCache.has(key)) {
    materialCache.set(
      key,
      new THREE.MeshLambertMaterial({ color, ...options }),
    );
  }
  return materialCache.get(key);
}

// Uniformly lit surface material for ceilings — fluorescent-lit tile should
// not go dark just because the hemisphere ground color is dim.
export function flatMat(color) {
  const key = `flat|${color}`;
  if (!materialCache.has(key)) {
    materialCache.set(key, new THREE.MeshBasicMaterial({ color }));
  }
  return materialCache.get(key);
}

export function emissiveMat(color, intensity = 0.9) {
  const key = `em|${color}|${intensity}`;
  if (!materialCache.has(key)) {
    materialCache.set(
      key,
      new THREE.MeshBasicMaterial({ color }),
    );
  }
  return materialCache.get(key);
}

export function glassMat() {
  return createMuseumMaterialLibrary().museumGlass;
}

// Box centered at (x, z), sitting on the floor (y=0) unless y is given.
export function box(parent, { x = 0, y, z = 0, w, h, d, material, name, collide, collisionWorld, collideId }) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y ?? h / 2, z);
  if (name) mesh.name = name;
  parent.add(mesh);
  if (collide && collisionWorld) {
    collisionWorld.addBoxFromCenterSize(x, z, w, d, collideId ?? name);
  }
  return mesh;
}

export function plane(parent, { x = 0, y = 0, z = 0, w, h, material, rotationX = -Math.PI / 2, rotationY = 0, name }) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  mesh.rotation.x = rotationX;
  mesh.rotation.y = rotationY;
  mesh.position.set(x, y, z);
  if (name) mesh.name = name;
  parent.add(mesh);
  return mesh;
}

// Typed institutional label rendered onto a plane (canvas texture).
export function label(parent, text, {
  x = 0, y = 1.5, z = 0, w = 1.6, h = 0.4,
  fg = '#23211c', bg = '#efe9d8', font = 'bold 42px "Courier New", monospace',
  rotationY = 0, lines = null,
} = {}) {
  const rows = lines ?? String(text).split('\n');
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = Math.max(64, Math.round((512 * h) / w));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = fg;
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);
  ctx.fillStyle = fg;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lineHeight = canvas.height / (rows.length + 0.4);
  rows.forEach((row, i) => {
    ctx.fillText(row, canvas.width / 2, lineHeight * (i + 0.7));
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: texture }),
  );
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotationY;
  parent.add(mesh);
  return mesh;
}

// Fluorescent ceiling strip: emissive box + thin housing.
export function fluorescentFixture(parent, { x = 0, z = 0, ceilingY = 3.4, length = 2.4 }) {
  const housing = box(parent, {
    x, y: ceilingY - 0.04, z, w: 0.4, h: 0.08, d: length,
    material: mat(0x9a968c), name: 'fluorescent-housing',
  });
  const tube = box(parent, {
    x, y: ceilingY - 0.1, z, w: 0.3, h: 0.05, d: length - 0.2,
    material: emissiveMat(0xf4f7ee), name: 'fluorescent-tube',
  });
  return { housing, tube };
}

// Glass display case: plinth + glass box. Returns group so reclassification
// can move contents in and out.
export function displayCase(parent, { x = 0, z = 0, w = 1.6, d = 1.2, plinthH = 0.9, glassH = 1.5, name = 'display-case', collisionWorld }) {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(x, 0, z);
  parent.add(group);
  const materials = createMuseumMaterialLibrary();
  box(group, { x: 0, y: 0.055, z: 0, w: w - 0.14, h: 0.11, d: d - 0.14, material: materials.displayToeKick, name: `${name}-toe-kick` });
  box(group, { x: 0, y: plinthH / 2 + 0.08, z: 0, w, h: plinthH - 0.16, d, material: materials.displayPlinth, name: `${name}-plinth` });
  box(group, { x: 0, y: plinthH - 0.055, z: d / 2 + 0.007, w: w - 0.18, h: 0.45, d: 0.014, material: materials.displayDeck, name: `${name}-front-panel` });
  box(group, {
    x: 0, y: plinthH + 0.035, z: 0, w: w - 0.08, h: 0.07, d: d - 0.08,
    material: materials.displayDeck, name: `${name}-deck`,
  });

  // The old graybox used one transparent cube, which read as a tinted solid.
  // Real late-century museum vitrines are separate glass panes held by thin
  // channels. The small gaps, green edges and visible interior make the case
  // legible without turning it into a glowing aquarium.
  const paneT = 0.012;
  const paneY = plinthH + glassH / 2;
  const panes = [
    box(group, { x: 0, y: paneY, z: d / 2, w, h: glassH, d: paneT, material: glassMat(), name: `${name}-glass-front` }),
    box(group, { x: 0, y: paneY, z: -d / 2, w, h: glassH, d: paneT, material: glassMat(), name: `${name}-glass-back` }),
    box(group, { x: w / 2, y: paneY, z: 0, w: paneT, h: glassH, d, material: glassMat(), name: `${name}-glass-right` }),
    box(group, { x: -w / 2, y: paneY, z: 0, w: paneT, h: glassH, d, material: glassMat(), name: `${name}-glass-left` }),
    box(group, { x: 0, y: plinthH + glassH, z: 0, w, h: paneT, d, material: glassMat(), name: `${name}-glass-top` }),
  ];
  panes.forEach((pane, index) => { pane.renderOrder = 2 + index * 0.01; });

  const rail = 0.018;
  const edge = 0.012;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      box(group, {
        x: sx * (w / 2 - edge / 2), y: paneY, z: sz * (d / 2 - edge / 2),
        w: edge, h: glassH, d: edge,
        material: materials.glassEdge, name: `${name}-edge-${sx}-${sz}`,
      }).renderOrder = 7;
    }
  }
  for (const y of [plinthH + rail / 2, plinthH + glassH - rail / 2]) {
    box(group, { x: 0, y, z: d / 2, w, h: rail, d: rail, material: materials.caseChannel, name: `${name}-channel-front-${y}` });
    box(group, { x: 0, y, z: -d / 2, w, h: rail, d: rail, material: materials.caseChannel, name: `${name}-channel-back-${y}` });
    box(group, { x: w / 2, y, z: 0, w: rail, h: rail, d, material: materials.caseChannel, name: `${name}-channel-right-${y}` });
    box(group, { x: -w / 2, y, z: 0, w: rail, h: rail, d, material: materials.caseChannel, name: `${name}-channel-left-${y}` });
  }
  if (collisionWorld) collisionWorld.addBoxFromCenterSize(x, z, w, d, name);
  return group;
}
