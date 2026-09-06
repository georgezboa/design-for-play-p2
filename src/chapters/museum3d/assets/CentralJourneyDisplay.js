import * as THREE from 'three';
import { box, mat } from '../util/graybox.js';

// The vitrine is 5.4 × 2.8 m. This footprint keeps every authored object at
// least 12% of the case dimension away from its glass edge.
export const CENTRAL_JOURNEY_SAFE_LAYOUT = Object.freeze({
  caseWidth: 5.4,
  caseDepth: 2.8,
  paddingRatio: 0.12,
  minX: -2.052,
  maxX: 2.052,
  minZ: -1.064,
  maxZ: 1.064,
});

export const CENTRAL_JOURNEY_ITEMS = Object.freeze([
  Object.freeze({ id: 'chapter01-night-service-train', medium: '2d-original', x: -0.90, z: -0.58, halfX: 0.95, halfZ: 0.275 }),
  Object.freeze({ id: 'chapter04-indigo-pigment', medium: '2d-original', x: -1.28, z: 0.55, halfX: 0.50, halfZ: 0.30 }),
  Object.freeze({ id: 'night-route-accession-panel', medium: '2d', x: 0.34, z: -0.63, halfX: 0.25, halfZ: 0.33 }),
  Object.freeze({ id: 'pigment-accession-panel', medium: '2d', x: 1.48, z: 0.62, halfX: 0.25, halfZ: 0.31 }),
  Object.freeze({ id: 'journey-motion-archive', medium: 'motion', x: 1.18, z: -0.55, halfX: 0.50, halfZ: 0.21 }),
  Object.freeze({ id: 'night-service-wheelset', medium: '3d', x: 0.20, z: 0.18, halfX: 0.18, halfZ: 0.14 }),
  Object.freeze({ id: 'punched-ticket-stack', medium: '3d', x: 0.76, z: 0.18, halfX: 0.16, halfZ: 0.13 }),
  Object.freeze({ id: 'indigo-pigment-vials', medium: '3d', x: 0.30, z: 0.74, halfX: 0.18, halfZ: 0.20 }),
  Object.freeze({ id: 'paper-fold-study', medium: '3d', x: 1.84, z: 0.92, halfX: 0.13, halfZ: 0.08 }),
  Object.freeze({ id: 'night-route-signal', medium: '3d', x: 1.82, z: 0.12, halfX: 0.11, halfZ: 0.10 }),
  Object.freeze({ id: 'six-pigment-palette', medium: '3d', x: -0.30, z: 0.88, halfX: 0.15, halfZ: 0.18 }),
]);

function canvasTexture(draw, width = 512, height = 320) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  draw(context, canvas);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  return { canvas, context, texture };
}

function panelMesh({ name, width, height, draw }) {
  const { texture } = canvasTexture(draw);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }),
  );
  mesh.name = name;
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

function drawCardBase(context, canvas, title, accession) {
  context.fillStyle = '#e9e1cb';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = '#35342e';
  context.lineWidth = 12;
  context.strokeRect(14, 14, canvas.width - 28, canvas.height - 28);
  context.fillStyle = '#292a27';
  context.font = 'bold 33px Georgia, serif';
  context.fillText(title, 38, 55);
  context.font = '22px "Courier New", monospace';
  context.fillText(accession, 38, canvas.height - 32);
}

function createRouteCard() {
  return panelMesh({
    name: 'night-route-accession-panel', width: 0.50, height: 0.66,
    draw: (context, canvas) => {
      drawCardBase(context, canvas, 'NIGHT ROUTE', 'ACC. 01 / 10·17');
      context.strokeStyle = '#b23a2f';
      context.lineWidth = 13;
      context.beginPath();
      context.moveTo(62, 190);
      context.bezierCurveTo(150, 105, 282, 245, 448, 125);
      context.stroke();
      for (const [x, y] of [[62, 190], [205, 162], [330, 190], [448, 125]]) {
        context.fillStyle = '#2f3435';
        context.beginPath();
        context.arc(x, y, 14, 0, Math.PI * 2);
        context.fill();
      }
    },
  });
}

function createPigmentCard() {
  return panelMesh({
    name: 'pigment-accession-panel', width: 0.42, height: 0.62,
    draw: (context, canvas) => {
      drawCardBase(context, canvas, 'PIGMENT LOG', 'ACC. 04 / INDIGO');
      const swatches = ['#cf5146', '#d59b31', '#e5c94c', '#4b9d7d', '#397daa', '#5d4d96'];
      swatches.forEach((color, index) => {
        context.fillStyle = color;
        context.fillRect(48 + (index % 3) * 145, 105 + Math.floor(index / 3) * 72, 92, 46);
        context.strokeStyle = '#eee7d3';
        context.lineWidth = 5;
        context.strokeRect(48 + (index % 3) * 145, 105 + Math.floor(index / 3) * 72, 92, 46);
      });
    },
  });
}

function createMotionArchive() {
  const state = canvasTexture(() => {}, 512, 256);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.74, 0.42),
    new THREE.MeshBasicMaterial({ map: state.texture, emissive: 0x201b12, emissiveIntensity: 0.3, side: THREE.DoubleSide }),
  );
  mesh.name = 'journey-motion-archive';
  mesh.rotation.x = -Math.PI / 2;

  const drawFrame = (time = 0) => {
    const { context, canvas } = state;
    context.fillStyle = '#171914';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#b7ad8b';
    context.lineWidth = 8;
    context.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
    context.fillStyle = '#d8cfb5';
    context.font = 'bold 25px "Courier New", monospace';
    context.fillText('MOVING ARCHIVE · 01 → 04', 30, 45);
    const shift = (time * 62) % 530;
    context.strokeStyle = '#c64b3c';
    context.lineWidth = 10;
    context.beginPath();
    for (let x = -20; x < 540; x += 18) {
      const y = 145 + Math.sin((x + shift) * 0.026) * 34;
      if (x === -20) context.moveTo(x, y); else context.lineTo(x, y);
    }
    context.stroke();
    context.fillStyle = '#435d99';
    context.fillRect(55 + (shift % 310), 92, 92, 44);
    context.fillStyle = '#d8cfb5';
    context.font = '19px "Courier New", monospace';
    context.fillText('ROUTE / COLOR / MEMORY', 30, 225);
    context.fillStyle = 'rgba(235, 225, 197, 0.11)';
    for (let y = 62; y < 220; y += 9) context.fillRect(18, y, canvas.width - 36, 2);
    state.texture.needsUpdate = true;
  };
  drawFrame(0);
  return { mesh, drawFrame };
}

function createWheelset(materials) {
  const group = new THREE.Group();
  group.name = 'night-service-wheelset';
  const wheelMaterial = materials?.darkMetal ?? mat(0x292b29);
  for (const z of [-0.105, 0.105]) {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.025, 10, 24), wheelMaterial);
    wheel.position.set(0, 0.105, z);
    wheel.rotation.y = Math.PI / 2;
    group.add(wheel);
  }
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.28, 12), wheelMaterial);
  axle.position.y = 0.105;
  axle.rotation.x = Math.PI / 2;
  group.add(axle);
  return group;
}

function createTicketStack() {
  const group = new THREE.Group();
  group.name = 'punched-ticket-stack';
  for (let index = 0; index < 4; index += 1) {
    const ticket = box(group, {
      x: index * 0.012, y: 0.018 + index * 0.012, z: index * -0.008,
      w: 0.28, h: 0.012, d: 0.15, material: mat(0xd8c89f), name: `ticket-${index}`,
    });
    ticket.rotation.y = index * 0.08;
  }
  return group;
}

function createPigmentVials() {
  const group = new THREE.Group();
  group.name = 'indigo-pigment-vials';
  const colors = [0x435d99, 0x6b4c8a, 0x35949a];
  colors.forEach((color, index) => {
    const vial = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.20 + index * 0.025, 14), mat(color));
    vial.position.set(index * 0.12 - 0.12, 0.10 + index * 0.012, (index % 2) * 0.055);
    group.add(vial);
    box(group, { x: vial.position.x, y: 0.225 + index * 0.024, z: vial.position.z, w: 0.075, h: 0.035, d: 0.075, material: mat(0xd5c59f), name: `vial-cap-${index}` });
  });
  return group;
}

function createPaperFold() {
  const group = new THREE.Group();
  group.name = 'paper-fold-study';
  const geometry = new THREE.ConeGeometry(0.12, 0.25, 3);
  const fold = new THREE.Mesh(geometry, mat(0xd7cdb6));
  fold.position.y = 0.125;
  fold.rotation.y = Math.PI / 6;
  group.add(fold);
  return group;
}

function createRouteSignal() {
  const group = new THREE.Group();
  group.name = 'night-route-signal';
  box(group, { x: 0, y: 0.16, z: 0, w: 0.045, h: 0.32, d: 0.045, material: mat(0x343634), name: 'signal-post' });
  const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.055, 18), mat(0x30312e));
  housing.position.set(0, 0.34, 0);
  housing.rotation.z = Math.PI / 2;
  group.add(housing);
  const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.052, 18), new THREE.MeshBasicMaterial({ color: 0xb63f35 }));
  lamp.position.set(-0.031, 0.34, 0);
  lamp.rotation.y = -Math.PI / 2;
  group.add(lamp);
  return group;
}

function createPigmentPalette() {
  const group = new THREE.Group();
  group.name = 'six-pigment-palette';
  const board = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.028, 18), mat(0xcbbd9c));
  board.scale.z = 0.72;
  board.position.y = 0.025;
  group.add(board);
  const colors = [0xc84b41, 0xd69631, 0xdfc84d, 0x3f9878, 0x397caa, 0x684d91];
  colors.forEach((color, index) => {
    const angle = (index / colors.length) * Math.PI * 2;
    const dab = new THREE.Mesh(new THREE.SphereGeometry(0.031, 10, 7), mat(color));
    dab.position.set(Math.cos(angle) * 0.092, 0.055, Math.sin(angle) * 0.065);
    dab.scale.y = 0.45;
    group.add(dab);
  });
  return group;
}

export function createCentralJourneyDisplay(materials) {
  const group = new THREE.Group();
  group.name = 'central-journey-supporting-archive';

  const routeCard = createRouteCard();
  routeCard.position.set(0.34, 1.075, -0.63);
  const pigmentCard = createPigmentCard();
  pigmentCard.position.set(1.48, 1.077, 0.62);
  const motion = createMotionArchive();
  motion.mesh.position.set(1.18, 1.079, -0.55);

  const wheelset = createWheelset(materials);
  wheelset.position.set(0.20, 1.045, 0.18);
  wheelset.scale.setScalar(1.25);
  const tickets = createTicketStack();
  tickets.position.set(0.76, 1.045, 0.18);
  tickets.scale.setScalar(1.20);
  const vials = createPigmentVials();
  vials.position.set(0.30, 1.045, 0.74);
  vials.scale.setScalar(1.22);
  const fold = createPaperFold();
  fold.position.set(1.84, 1.045, 0.92);
  fold.scale.setScalar(1.18);
  const signal = createRouteSignal();
  signal.position.set(1.82, 1.045, 0.12);
  const palette = createPigmentPalette();
  palette.position.set(-0.30, 1.045, 0.88);

  group.add(routeCard, pigmentCard, motion.mesh, wheelset, tickets, vials, fold, signal, palette);
  group.userData.layout = CENTRAL_JOURNEY_SAFE_LAYOUT;
  group.userData.items = CENTRAL_JOURNEY_ITEMS;
  return { group, update: motion.drawFrame };
}
