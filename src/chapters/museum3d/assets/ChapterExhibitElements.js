import * as THREE from 'three';

const COLORS = Object.freeze({
  cyan: 0x58e7e4,
  magenta: 0xf04eac,
  amber: 0xe0aa4d,
  paper: 0xe5d7b8,
  oil: 0x351d20,
  brass: 0xb98d49,
  iron: 0x4f5861,
  red: 0xb53c35,
  blue: 0x438bc7,
  yellow: 0xd8b73f,
});

function material(color, { emissive = false, metalness = 0.08, roughness = 0.72 } = {}) {
  if (emissive) return new THREE.MeshBasicMaterial({ color });
  return new THREE.MeshStandardMaterial({ color, metalness, roughness });
}

function add(group, geometry, color, name, position, options = {}) {
  const mesh = new THREE.Mesh(geometry, material(color, options));
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = true;
  group.add(mesh);
  return mesh;
}

export function createLastTrainExhibitElements() {
  const group = new THREE.Group();
  group.name = 'chapter-01-last-train-elements';

  const ticket = add(group, new THREE.BoxGeometry(0.52, 0.015, 0.24), COLORS.paper, 'chapter-01-punched-ticket', [-0.25, 1.22, 0.03]);
  ticket.rotation.y = -0.18;
  for (const x of [-0.38, -0.28, -0.18, -0.08]) {
    add(group, new THREE.CylinderGeometry(0.018, 0.018, 0.022, 10), 0x2b2720, 'chapter-01-ticket-punch', [x, 1.225, 0.03]).rotation.x = Math.PI / 2;
  }

  const spool = add(group, new THREE.CylinderGeometry(0.14, 0.14, 0.26, 18), COLORS.iron, 'chapter-01-thread-spool', [0.34, 1.34, 0]);
  spool.rotation.z = Math.PI / 2;
  for (let index = -3; index <= 3; index += 1) {
    const strand = new THREE.Mesh(new THREE.TorusGeometry(0.148, 0.008, 6, 24), material(COLORS.cyan, { emissive: true }));
    strand.name = 'chapter-01-cyan-thread';
    strand.position.set(0.34 + index * 0.027, 1.34, 0);
    strand.rotation.y = Math.PI / 2;
    group.add(strand);
  }
  const relay = add(group, new THREE.BoxGeometry(0.25, 0.3, 0.18), COLORS.brass, 'chapter-01-carriage-relay', [0, 1.48, -0.08], { metalness: 0.58, roughness: 0.42 });
  add(relay, new THREE.SphereGeometry(0.035, 10, 8), COLORS.cyan, 'chapter-01-relay-light', [0, 0.06, 0.11], { emissive: true });
  return group;
}

export function createChapterSupportingElements(id) {
  const group = new THREE.Group();
  group.name = `${id}-supporting-chapter-elements`;

  if (id === 'borrowed-grid') {
    const rung = add(group, new THREE.CylinderGeometry(0.025, 0.025, 0.54, 10), COLORS.iron, 'chapter-02-ladder-rung', [-0.37, 0.02, 0]);
    rung.rotation.z = Math.PI / 2;
    add(group, new THREE.BoxGeometry(0.28, 0.08, 0.05), COLORS.magenta, 'chapter-02-neon-hazard-plate', [0.36, 0.15, 0.02], { emissive: true });
    const transit = add(group, new THREE.ConeGeometry(0.10, 0.25, 4), COLORS.cyan, 'chapter-02-rooftop-transit-marker', [0.38, -0.12, 0.02], { emissive: true });
    transit.rotation.z = Math.PI / 2;
  } else if (id === 'echo-city') {
    const route = add(group, new THREE.BoxGeometry(0.26, 0.19, 0.025), COLORS.paper, 'chapter-03-oil-seam-map', [-0.42, 0.03, 0]);
    route.rotation.z = -0.12;
    const seam = add(group, new THREE.TorusGeometry(0.075, 0.009, 6, 18, Math.PI * 1.55), COLORS.oil, 'chapter-03-oil-route', [-0.42, 0.03, 0.018]);
    seam.rotation.z = 0.8;
    const workOrder = add(group, new THREE.BoxGeometry(0.23, 0.15, 0.022), 0xc8b58c, 'chapter-03-work-order-c441', [0.43, -0.04, 0]);
    workOrder.rotation.z = 0.1;
    for (const y of [-0.04, 0, 0.04]) add(workOrder, new THREE.BoxGeometry(0.16, 0.008, 0.012), 0x51483a, 'chapter-03-work-order-line', [0, y, 0.018]);
  } else if (id === 'painted-country') {
    const brush = add(group, new THREE.CylinderGeometry(0.018, 0.028, 0.5, 10), 0x6f452e, 'chapter-04-paint-brush', [-0.38, 0.02, 0]);
    brush.rotation.z = -0.72;
    add(group, new THREE.ConeGeometry(0.055, 0.15, 10), COLORS.cyan, 'chapter-04-brush-tip', [-0.56, -0.16, 0], { emissive: true }).rotation.z = -0.72;
    const pigmentColors = [COLORS.red, COLORS.yellow, COLORS.blue];
    pigmentColors.forEach((color, index) => add(group, new THREE.BoxGeometry(0.12, 0.055, 0.04), color, 'chapter-04-pigment-key', [0.32 + index * 0.13, -0.13 + index * 0.02, 0], { emissive: true }));
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 8, 20), material(COLORS.iron, { metalness: 0.55, roughness: 0.44 }));
    wheel.name = 'chapter-04-train-wheel-study';
    wheel.position.set(0.4, 0.13, 0);
    group.add(wheel);
  } else if (id === 'labyrinth') {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.018, 7, 22), material(COLORS.brass, { metalness: 0.65, roughness: 0.36 }));
    ring.name = 'chapter-05-eight-key-ring';
    ring.position.set(-0.38, 0, 0);
    group.add(ring);
    for (let index = 0; index < 4; index += 1) {
      const angle = (index / 4) * Math.PI * 2;
      const key = add(group, new THREE.BoxGeometry(0.025, 0.18, 0.025), COLORS.brass, 'chapter-05-archive-key', [-0.38 + Math.cos(angle) * 0.14, Math.sin(angle) * 0.13, 0]);
      key.rotation.z = angle;
    }
    const gaze = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.018, 8, 24, Math.PI), material(0xe7d9bb));
    gaze.name = 'chapter-05-gaze-index';
    gaze.position.set(0.4, 0.04, 0);
    gaze.rotation.z = Math.PI;
    group.add(gaze);
    add(group, new THREE.SphereGeometry(0.035, 10, 8), 0x09090b, 'chapter-05-gaze-pupil', [0.4, 0.04, 0.01]);
  }
  return group;
}
