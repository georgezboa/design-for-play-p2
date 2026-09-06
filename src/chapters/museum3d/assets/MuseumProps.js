import * as THREE from 'three';

function mesh(parent, geometry, material, name, position = [0, 0, 0]) {
  const part = new THREE.Mesh(geometry, material);
  part.name = name;
  part.position.set(...position);
  parent.add(part);
  return part;
}

function cuboid(parent, size, material, name, position = [0, 0, 0]) {
  return mesh(parent, new THREE.BoxGeometry(...size), material, name, position);
}

function cylinder(parent, radius, length, material, name, position = [0, 0, 0], rotation = [0, 0, 0], segments = 12) {
  const part = mesh(
    parent,
    new THREE.CylinderGeometry(radius, radius, length, segments),
    material,
    name,
    position,
  );
  part.rotation.set(...rotation);
  return part;
}

export function createDeskTelephone(materials) {
  const phone = new THREE.Group();
  phone.name = 'museum-desk-telephone';

  const base = cuboid(phone, [0.3, 0.09, 0.22], materials.blackPlastic, 'phone-base', [0, 0.045, 0]);
  base.scale.z = 0.92;
  cuboid(phone, [0.2, 0.055, 0.13], materials.blackPlastic, 'phone-keypad-slope', [0, 0.105, -0.01])
    .rotation.x = -0.14;

  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      cylinder(phone, 0.008, 0.009, materials.paper, `phone-key-${row}-${col}`, [
        (col - 1) * 0.04,
        0.139,
        -0.045 + row * 0.036,
      ], [0, 0, 0], 8);
    }
  }

  const handset = new THREE.Group();
  handset.name = 'phone-handset';
  handset.position.set(0, 0.17, 0);
  phone.add(handset);
  cuboid(handset, [0.26, 0.045, 0.06], materials.blackPlastic, 'handset-grip');
  cuboid(handset, [0.065, 0.07, 0.09], materials.blackPlastic, 'handset-left', [-0.115, 0, 0]);
  cuboid(handset, [0.065, 0.07, 0.09], materials.blackPlastic, 'handset-right', [0.115, 0, 0]);

  const cord = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0.13, 0.07, 0.08),
      new THREE.Vector3(0.2, 0.03, 0.11),
      new THREE.Vector3(0.23, 0.01, 0.02),
      new THREE.Vector3(0.17, 0.01, -0.12),
    ]),
    new THREE.LineBasicMaterial({ color: 0x111111 }),
  );
  cord.name = 'phone-cord';
  phone.add(cord);

  return { group: phone, handset };
}

export function createBankersLamp(materials, { lit = false } = {}) {
  const lamp = new THREE.Group();
  lamp.name = 'bankers-lamp';
  cylinder(lamp, 0.11, 0.025, materials.brass, 'lamp-base', [0, 0.0125, 0], [0, 0, 0], 20);
  cylinder(lamp, 0.018, 0.34, materials.brass, 'lamp-stem', [0, 0.19, 0], [0, 0, 0], 12);
  const shade = cuboid(lamp, [0.38, 0.12, 0.18], materials.lampGreen, 'lamp-shade', [0, 0.42, 0]);
  shade.rotation.x = -0.08;
  if (lit) {
    const glow = new THREE.PointLight(0xffdda1, 4, 2.5, 1.8);
    glow.position.set(0, 0.35, 0.12);
    glow.name = 'lamp-local-light';
    lamp.add(glow);
  }
  return lamp;
}

export function createVisitorRegister(materials, { showButch = false } = {}) {
  const register = new THREE.Group();
  register.name = 'visitor-register';
  const left = cuboid(register, [0.24, 0.018, 0.34], materials.paper, 'register-left', [-0.12, 0.01, 0]);
  const right = cuboid(register, [0.24, 0.018, 0.34], materials.paper, 'register-right', [0.12, 0.01, 0]);
  left.rotation.z = -0.025;
  right.rotation.z = 0.025;
  cylinder(register, 0.007, 0.34, materials.brass, 'register-spine', [0, 0.02, 0], [Math.PI / 2, 0, 0], 8);
  register.userData.showButch = showButch;
  return register;
}

export function createServiceDesk(materials, { exhibit = false } = {}) {
  const desk = new THREE.Group();
  desk.name = exhibit ? 'service-desk-exhibit' : 'service-desk';

  // Runtime dimensions follow the Gate 2 asset lock: a four-meter civic
  // service desk with a counter just over one meter high. The silhouette is
  // deliberately simple; the phone, lamp and register carry its identity.
  cuboid(desk, [4, 0.96, 0.72], materials.walnutDark, 'desk-carcass', [0, 0.48, 0]);
  cuboid(desk, [3.58, 0.67, 0.035], materials.walnut, 'desk-modesty-panel', [0, 0.53, -0.378]);
  cuboid(desk, [3.2, 0.035, 0.04], materials.brass, 'desk-panel-trim-top', [0, 0.82, -0.402]);
  cuboid(desk, [3.2, 0.035, 0.04], materials.brass, 'desk-panel-trim-bottom', [0, 0.2, -0.402]);
  cuboid(desk, [4.12, 0.08, 0.84], materials.walnut, 'desk-countertop', [0, 1.02, 0]);
  cuboid(desk, [0.88, 0.34, 0.045], materials.walnut, 'desk-drawer', [1.2, 0.72, -0.4]);
  cuboid(desk, [0.16, 0.025, 0.03], materials.brass, 'desk-drawer-pull', [1.2, 0.72, -0.43]);
  cuboid(desk, [0.08, 0.98, 0.76], materials.walnut, 'desk-side-left', [-1.92, 0.49, 0]);
  cuboid(desk, [0.08, 0.98, 0.76], materials.walnut, 'desk-side-right', [1.92, 0.49, 0]);

  const telephone = createDeskTelephone(materials);
  telephone.group.position.set(0.48, 1.08, 0.06);
  desk.add(telephone.group);

  const lamp = createBankersLamp(materials, { lit: exhibit });
  lamp.position.set(1.55, 1.08, 0.12);
  desk.add(lamp);

  const register = createVisitorRegister(materials, { showButch: exhibit });
  register.position.set(-0.48, 1.09, 0.08);
  desk.add(register);

  return {
    group: desk,
    phone: telephone.group,
    handset: telephone.handset,
    register,
    lamp,
  };
}

export function createPublicBench(materials) {
  const bench = new THREE.Group();
  bench.name = 'civic-museum-bench';
  cuboid(bench, [1.75, 0.12, 0.52], materials.olivePlastic, 'bench-seat', [0, 0.47, 0]);
  cuboid(bench, [1.75, 0.62, 0.1], materials.olivePlastic, 'bench-back', [0, 0.78, 0.24]);
  for (const x of [-0.68, 0.68]) {
    cuboid(bench, [0.08, 0.44, 0.08], materials.darkSteel, `bench-leg-${x}`, [x, 0.22, 0]);
    cuboid(bench, [0.44, 0.06, 0.08], materials.darkSteel, `bench-foot-${x}`, [x, 0.03, 0]);
  }
  return bench;
}

export function createWallRadiator(materials, { width = 1.5 } = {}) {
  const radiator = new THREE.Group();
  radiator.name = 'civic-wall-radiator';
  const count = Math.max(5, Math.round(width / 0.17));
  for (let i = 0; i < count; i += 1) {
    const x = (i - (count - 1) / 2) * (width / count);
    cuboid(radiator, [width / count - 0.025, 0.58, 0.12], materials.oliveSteel, `radiator-fin-${i}`, [x, 0.38, 0]);
  }
  cuboid(radiator, [width + 0.08, 0.06, 0.16], materials.darkSteel, 'radiator-top', [0, 0.7, 0]);
  cylinder(radiator, 0.04, 0.17, materials.brass, 'radiator-valve', [width / 2 + 0.08, 0.17, 0], [Math.PI / 2, 0, 0], 10);
  return radiator;
}

export function createWasteBin(materials) {
  const bin = new THREE.Group();
  bin.name = 'civic-waste-bin';
  cylinder(bin, 0.19, 0.48, materials.oliveSteel, 'bin-body', [0, 0.24, 0], [0, 0, 0], 12);
  cylinder(bin, 0.17, 0.025, materials.darkSteel, 'bin-rim', [0, 0.49, 0], [0, 0, 0], 12);
  return bin;
}

export function createAudioGuideReceiver(materials) {
  const receiver = new THREE.Group();
  receiver.name = 'museum-audio-guide-receiver';
  cuboid(receiver, [0.25, 0.15, 0.11], materials.olivePlastic, 'guide-body', [0, 0.02, 0]);
  cylinder(receiver, 0.035, 0.018, materials.brass, 'guide-play-button', [0, 0.105, 0.06], [Math.PI / 2, 0, 0], 16);
  for (let i = -2; i <= 2; i += 1) {
    cuboid(receiver, [0.012, 0.045, 0.008], materials.darkSteel, `guide-grille-${i}`, [i * 0.024, 0.02, 0.06]);
  }
  const grip = cuboid(receiver, [0.09, 0.16, 0.08], materials.olivePlastic, 'guide-grip', [0, -0.12, 0]);
  grip.rotation.z = -0.08;
  return receiver;
}

export function createGuidePedestal(materials) {
  const stand = new THREE.Group();
  stand.name = 'museum-guide-pedestal';
  cuboid(stand, [0.52, 1.08, 0.44], materials.oliveSteel, 'guide-pedestal', [0, 0.54, 0]);
  cuboid(stand, [0.4, 0.04, 0.32], materials.brass, 'guide-cradle', [0, 1.1, 0]);
  const receiver = createAudioGuideReceiver(materials);
  receiver.position.set(0, 1.28, 0);
  receiver.rotation.x = -0.12;
  stand.add(receiver);
  return { group: stand, receiver };
}

export function createArchiveCart(materials) {
  const cart = new THREE.Group();
  cart.name = 'automatic-archive-cart';
  cuboid(cart, [1.2, 0.18, 0.64], materials.oliveSteel, 'cart-base', [0, 0.28, 0]);
  cuboid(cart, [1.04, 0.78, 0.54], materials.oliveSteel, 'cart-body', [0, 0.73, 0]);
  cuboid(cart, [1.08, 0.06, 0.58], materials.darkSteel, 'cart-top', [0, 1.15, 0]);
  for (const y of [0.48, 0.76, 1.02]) {
    cuboid(cart, [0.9, 0.035, 0.58], materials.darkSteel, `cart-file-tray-${y}`, [0, y, 0]);
  }
  for (const x of [-0.5, 0.5]) {
    for (const z of [-0.24, 0.24]) {
      const wheel = cylinder(cart, 0.1, 0.055, materials.rubber, `cart-wheel-${x}-${z}`, [x, 0.1, z], [Math.PI / 2, 0, 0], 14);
      wheel.userData.isWheel = true;
    }
  }
  cylinder(cart, 0.045, 0.07, materials.brass, 'cart-route-lamp', [0.42, 1.23, 0], [0, 0, 0], 12);
  cuboid(cart, [1.24, 0.16, 0.08], materials.rubber, 'cart-front-bumper', [0, 0.28, -0.34]);
  cuboid(cart, [1.24, 0.16, 0.08], materials.rubber, 'cart-rear-bumper', [0, 0.28, 0.34]);
  return cart;
}

export function addAcousticCeilingGrid(parent, {
  width,
  depth,
  y,
  centerX = 0,
  centerZ = 0,
  tile = 1.2,
  color = 0x6f6b61,
} = {}) {
  const points = [];
  const x0 = centerX - width / 2;
  const z0 = centerZ - depth / 2;
  for (let x = x0; x <= centerX + width / 2 + 0.001; x += tile) {
    points.push(new THREE.Vector3(x, y, z0), new THREE.Vector3(x, y, centerZ + depth / 2));
  }
  for (let z = z0; z <= centerZ + depth / 2 + 0.001; z += tile) {
    points.push(new THREE.Vector3(x0, y, z), new THREE.Vector3(centerX + width / 2, y, z));
  }
  const lines = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.58 }),
  );
  lines.name = 'acoustic-ceiling-grid';
  parent.add(lines);
  return lines;
}
