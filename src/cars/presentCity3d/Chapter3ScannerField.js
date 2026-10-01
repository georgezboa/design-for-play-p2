import * as THREE from 'three';

import { createWalkBeside, PIPS_REQUIRED } from './chapter3WalkBesideModel.js';
import { SCANNER_WORDS } from './chapter3OpeningContent.js';

// World-space scanner arch + field for one crossing. Colour is never the only
// signal: every state also changes the word on the arch and the floor marks
// (ALONE = oxblood triangle marks, WARNING = amber narrowing brackets,
// PATTERN OK = teal paired footprints).

const COLORS = Object.freeze({
  idle: 0x1f3a3d,
  alone: 0x8a2a1e,
  warning: 0xe0a24a,
  flagged: 0xb02a1e,
  matching: 0x5aa89c,
  ok: 0x7fd6c8,
});

function makeWordTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return { canvas, texture };
}

function drawWord({ canvas, texture }, word, color) {
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'rgba(20, 13, 9, 0.92)';
  context.strokeStyle = '#b08a4a';
  context.lineWidth = 6;
  const radius = 18;
  context.beginPath();
  context.roundRect?.(6, 10, canvas.width - 12, canvas.height - 20, radius);
  if (!context.roundRect) context.rect(6, 10, canvas.width - 12, canvas.height - 20);
  context.fill();
  context.stroke();
  context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
  // Shrink long labels to the panel (MARKET WARD CROSSING was clipped to
  // "RKET WARD CROSSI").
  const room = canvas.width - 56;
  let size = 54;
  context.font = `700 ${size}px "Space Mono", ui-monospace, monospace`;
  while (size > 22 && context.measureText(word).width > room) {
    size -= 2;
    context.font = `700 ${size}px "Space Mono", ui-monospace, monospace`;
  }
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(word, canvas.width / 2, canvas.height / 2 + 2, room);
  texture.needsUpdate = true;
}

// Chevrons along the lane, pointing through the arch (repeats along V).
function laneArrowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  context.strokeStyle = '#ffffff';
  context.lineWidth = 16;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.beginPath();
  context.moveTo(22, 92); context.lineTo(64, 40); context.lineTo(106, 92);
  context.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function floorMarkTexture(kind) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  context.strokeStyle = '#ffffff';
  context.fillStyle = '#ffffff';
  context.lineWidth = 14;
  context.lineCap = 'round';
  if (kind === 'alone') {
    context.beginPath();
    context.moveTo(128, 40); context.lineTo(216, 200); context.lineTo(40, 200); context.closePath();
    context.stroke();
  } else if (kind === 'warning') {
    context.beginPath();
    context.moveTo(70, 50); context.lineTo(40, 128); context.lineTo(70, 206);
    context.moveTo(186, 50); context.lineTo(216, 128); context.lineTo(186, 206);
    context.stroke();
  } else {
    for (const [x, y] of [[92, 90], [164, 90], [92, 180], [164, 180]]) {
      context.beginPath();
      context.ellipse(x, y, 20, 30, 0, 0, Math.PI * 2);
      context.fill();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class Chapter3ScannerField {
  constructor(scene, field, { groundHeightAt = null } = {}) {
    this.field = field;
    this.logic = createWalkBeside(field);
    this.geometry = this.logic.geometry;
    this.group = new THREE.Group();
    this.group.name = `chapter3-scanner-${field.id}`;
    const gate = this.geometry.gate;
    const ground = groundHeightAt?.(gate.x, gate.z);
    this.groundY = Number.isFinite(ground) ? ground : 0.5;
    this.group.position.set(gate.x, this.groundY, gate.z);
    // Local +Z runs along the crossing; local X spans the arch.
    this.group.rotation.y = Math.atan2(this.geometry.u.x, this.geometry.u.z);
    scene.add(this.group);

    const brass = new THREE.MeshStandardMaterial({ color: 0xb08a4a, roughness: 0.38, metalness: 0.78 });
    const walnut = new THREE.MeshStandardMaterial({ color: 0x2a1d14, roughness: 0.7, metalness: 0.1 });
    const span = this.geometry.halfWidth * 2 - 0.6;
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 2.7, 12), brass);
      post.position.set(side * span / 2, 1.35, 0);
      post.castShadow = true;
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.16, 14), walnut);
      foot.position.set(side * span / 2, 0.08, 0);
      this.group.add(post, foot);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(span + 0.3, 0.2, 0.26), walnut);
    beam.position.set(0, 2.72, 0);
    beam.castShadow = true;
    this.group.add(beam);
    this.lensMaterial = new THREE.MeshBasicMaterial({ color: COLORS.idle });
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.32, 28), this.lensMaterial);
    lens.position.set(0, 2.72, 0.14);
    const lensRim = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.05, 8, 28), brass);
    lensRim.position.copy(lens.position);
    this.group.add(lens, lensRim);
    this.lensLight = new THREE.PointLight(COLORS.idle, 0, 7, 1.8);
    this.lensLight.position.set(0, 2.4, 0.4);
    this.group.add(this.lensLight);

    // Scan volume on the floor.
    this.floorMaterial = new THREE.MeshBasicMaterial({ color: COLORS.idle, transparent: true, opacity: 0.22, depthWrite: false });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(span, 2.2), this.floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.035;
    floor.renderOrder = 2;
    this.group.add(floor);
    this.markTextures = { alone: floorMarkTexture('alone'), warning: floorMarkTexture('warning'), ok: floorMarkTexture('ok') };
    this.markMaterial = new THREE.MeshBasicMaterial({ map: this.markTextures.alone, color: COLORS.idle, transparent: true, opacity: 0, depthWrite: false });
    this.marks = [];
    for (const x of [-0.9, 0.9]) {
      const mark = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), this.markMaterial);
      mark.rotation.x = -Math.PI / 2;
      mark.position.set(x, 0.04, 0);
      mark.renderOrder = 3;
      this.group.add(mark);
      this.marks.push(mark);
    }

    // Safe line where the walker waits: a painted brass queue line, like a
    // platform edge. A flagged crossing sends you back to it.
    const safeMaterial = new THREE.MeshBasicMaterial({ color: 0xb08a4a, transparent: true, opacity: 0.7, depthWrite: false });
    this.safeLine = new THREE.Mesh(new THREE.PlaneGeometry(span, 0.16), safeMaterial);
    this.safeLine.rotation.x = -Math.PI / 2;
    // Matches createWalkBeside().safeReturnPoint (scan entry − 1.4 m).
    this.safeLine.position.set(0, 0.04, -2.5);
    this.group.add(this.safeLine);

    // A chevron arrow down Butch's lane, from the safe line out past the
    // crossing: "in step" means along this, whatever the camera calls up.
    const laneX = (field.side ?? 1) * (field.sideOffset ?? 1);
    // From where the walker waits (the field's `from`) out past the crossing.
    const laneStart = -this.geometry.gateAlong - 0.4;
    const laneEnd = this.geometry.length - this.geometry.gateAlong + 0.4;
    const laneLength = laneEnd - laneStart;
    this.laneTexture = laneArrowTexture();
    this.laneTexture.repeat.set(1, laneLength / 1.1);
    this.laneMaterial = new THREE.MeshBasicMaterial({ map: this.laneTexture, color: 0xe0a24a, transparent: true, opacity: 0.55, depthWrite: false });
    this.laneArrow = new THREE.Mesh(new THREE.PlaneGeometry(0.8, laneLength), this.laneMaterial);
    // Plane +Y (the chevrons' point) → local +Z, along the crossing.
    this.laneArrow.rotation.x = -Math.PI / 2;
    this.laneArrow.rotation.z = Math.PI;
    this.laneArrow.position.set(laneX, 0.045, laneStart + laneLength / 2);
    this.laneArrow.renderOrder = 3;
    this.group.add(this.laneArrow);

    // The word panel above the arch.
    this.word = makeWordTexture();
    this.wordSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.word.texture, transparent: true, depthTest: false }));
    this.wordSprite.scale.set(2.6, 0.65, 1);
    this.wordSprite.position.set(0, 3.45, 0);
    this.wordSprite.renderOrder = 20;
    this.group.add(this.wordSprite);

    // Ribbon between Butch and the walker (world-space, rebuilt per frame).
    this.ribbonMaterial = new THREE.MeshBasicMaterial({ color: COLORS.ok, transparent: true, opacity: 0, depthWrite: false });
    const ribbonGeometry = new THREE.PlaneGeometry(1, 0.16);
    ribbonGeometry.rotateX(-Math.PI / 2);
    this.ribbon = new THREE.Mesh(ribbonGeometry, this.ribbonMaterial);
    this.ribbon.renderOrder = 4;
    this.ribbon.visible = false;
    scene.add(this.ribbon);
    const fillGeometry = new THREE.PlaneGeometry(1, 0.22);
    fillGeometry.rotateX(-Math.PI / 2);
    this.ribbonFill = new THREE.Mesh(fillGeometry, new THREE.MeshBasicMaterial({ color: 0xeadfc6, transparent: true, opacity: 0.9, depthWrite: false }));
    this.ribbonFill.renderOrder = 5;
    this.ribbonFill.visible = false;
    scene.add(this.ribbonFill);

    // Soft ring under the walker while E would match.
    this.walkerRing = new THREE.Mesh(
      new THREE.RingGeometry(0.62, 0.74, 36),
      new THREE.MeshBasicMaterial({ color: 0xe0a24a, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }),
    );
    this.walkerRing.rotation.x = -Math.PI / 2;
    this.walkerRing.visible = false;
    scene.add(this.walkerRing);

    this.active = false;
    this.flash = 0;
    this.shownState = null;
    this.setActive(false);
  }

  setActive(active) {
    this.active = Boolean(active);
    this.wordSprite.visible = this.active;
    this.safeLine.visible = this.active;
    this.laneArrow.visible = this.active;
    this.render('idle', true);
  }

  render(scanner, force = false) {
    const key = this.active ? scanner : 'off';
    if (!force && key === this.shownState) return;
    this.shownState = key;
    const color = COLORS[scanner] ?? COLORS.idle;
    this.lensMaterial.color.setHex(this.active ? color : 0x162224);
    this.lensLight.color.setHex(color);
    this.lensLight.intensity = this.active ? (scanner === 'idle' ? 1.2 : 5) : 0;
    this.floorMaterial.color.setHex(color);
    this.floorMaterial.opacity = this.active ? (scanner === 'ok' ? 0.3 : 0.2) : 0.06;
    const mark = scanner === 'ok' || scanner === 'matching' ? 'ok' : scanner === 'warning' ? 'warning' : 'alone';
    this.markMaterial.map = this.markTextures[mark];
    this.markMaterial.color.setHex(color);
    this.markMaterial.opacity = this.active && scanner !== 'idle' ? 0.85 : this.active ? 0.3 : 0;
    this.markMaterial.needsUpdate = true;
    const word = scanner === 'ok' ? SCANNER_WORDS.ok
      : scanner === 'warning' ? SCANNER_WORDS.warning
        : scanner === 'flagged' || scanner === 'alone' ? SCANNER_WORDS.alone
          : scanner === 'matching' ? 'IN STEP…'
            : this.field.label;
    if (this.active) drawWord(this.word, word, scanner === 'idle' ? 0xeadfc6 : color);
  }

  // The lane arrow drifts toward the arch while the pair walks, glows when
  // matched and flashes oxblood when Butch pulls the wrong way.
  updateLaneArrow({ matched = false, wrongWay = false, elapsed = 0 } = {}) {
    if (!this.active) return;
    this.laneTexture.offset.y = -(elapsed * (matched ? 0.9 : 0.35)) % 1;
    this.laneMaterial.color.setHex(wrongWay ? COLORS.flagged : matched ? COLORS.ok : 0xe0a24a);
    const pulse = 0.5 + 0.5 * Math.sin(elapsed * (wrongWay ? 12 : 3));
    this.laneMaterial.opacity = wrongWay ? 0.5 + 0.4 * pulse : matched ? 0.7 : 0.4 + 0.15 * pulse;
  }

  // Draw the ribbon between two world points; `progress` fills it (0..1).
  updateRibbon(a, b, progress, visible) {
    this.ribbon.visible = visible;
    this.ribbonFill.visible = visible && progress > 0;
    if (!visible) return;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const length = Math.max(0.05, Math.hypot(dx, dz));
    // rotation.y = θ maps local +X to (cos θ, -sin θ) on the ground.
    const angle = Math.atan2(-dz, dx);
    const y = this.groundY + 0.05;
    this.ribbon.position.set((a.x + b.x) / 2, y, (a.z + b.z) / 2);
    this.ribbon.scale.set(length, 1, 1);
    this.ribbon.rotation.set(0, angle, 0);
    this.ribbonMaterial.opacity = 0.55;
    const fill = Math.max(0.001, progress);
    this.ribbonFill.scale.set(length * fill, 1, 1);
    this.ribbonFill.position.set(a.x + dx * fill * 0.5, y + 0.005, a.z + dz * fill * 0.5);
    this.ribbonFill.rotation.set(0, angle, 0);
  }

  showWalkerRing(position, visible, elapsed = 0) {
    this.walkerRing.visible = visible;
    if (!visible) return;
    this.walkerRing.position.set(position.x, this.groundY + 0.045, position.z);
    const pulse = 1 + Math.sin(elapsed * 5) * 0.08;
    this.walkerRing.scale.setScalar(pulse);
  }

  pipsRequired() {
    return PIPS_REQUIRED;
  }

  dispose(scene) {
    scene.remove(this.group, this.ribbon, this.ribbonFill, this.walkerRing);
  }
}
