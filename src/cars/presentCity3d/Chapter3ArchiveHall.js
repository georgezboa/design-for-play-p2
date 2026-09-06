import * as THREE from 'three';

export const ARCHIVE_POSITIONS = Object.freeze({
  playerStart: [0, 0.5, 1.7],
  lev: [1.3, 0.5, 1.9],
  mila: [-2.3, 0.5, 1.35],
  ana: [2.0, 0.5, -0.6],
  anaApproach: [1.6, 0.5, 0.2],
  mapTable: [0.35, 1.15, -0.19],
  mapApproach: [0.35, 0.5, 1.3],
  workOrder: [2.7, 1.15, 0.9],
  workOrderApproach: [2.7, 0.5, 1.65],
  petar: [2.6, 0.5, -1.3],
  petarApproach: [2.0, 0.5, -1.3],
  timeline: [-3.04, 1.18, -0.92],
  timelineApproach: [-2.3, 0.5, -0.92],
});

function material(color, roughness = 0.84, metalness = 0.02) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function addBox(group, size, position, meshMaterial, name = '') {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), meshMaterial);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = name;
  group.add(mesh);
  return mesh;
}

function makeActor(group, { name, color, position, scale = 1 }) {
  const actor = new THREE.Group();
  actor.name = name;
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.38 * scale, 0.86 * scale, 5, 10),
    material(color),
  );
  body.position.y = 0.92 * scale;
  body.castShadow = true;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.27 * scale, 12, 10),
    material(0xc7a27f, 0.94),
  );
  head.position.y = 1.72 * scale;
  head.castShadow = true;
  actor.add(body, head);
  actor.position.fromArray(position);
  group.add(actor);
  return actor;
}

function makePaper(group, size, position, paper, name) {
  const sheet = addBox(group, [size[0], 0.035, size[1]], position, paper, name);
  sheet.rotation.y = -0.04;
  return sheet;
}

export function createChapter3ArchiveHall(scene) {
  const group = new THREE.Group();
  group.name = 'chapter-03-old-municipal-archive';
  group.visible = false;

  const floor = material(0x706d62, 0.96);
  const plaster = material(0x7c8279, 0.94);
  const darkWood = material(0x49362b, 0.88);
  const green = material(0x42584e, 0.8);
  const brass = material(0x987443, 0.48, 0.42);
  const paper = material(0xd8cfb6, 0.98);
  const redPaper = material(0xb78472, 0.96);

  // The imported reading-room shell carries the finished wooden floor; this
  // greybox slab now lives just beneath it as a gap-catcher, so it must sit
  // below y=0 instead of forming the walk surface itself.
  addBox(group, [17.5, 0.3, 18], [0, -0.16, 2.0], floor, 'archive-floor');
  addBox(group, [17.5, 5.2, 0.4], [0, 2.6, -6.8], plaster, 'archive-back-wall');
  addBox(group, [0.4, 2.2, 18], [-8.55, 1.1, 2], plaster, 'archive-left-wall');
  addBox(group, [0.4, 2.2, 18], [8.55, 1.1, 2], plaster, 'archive-right-wall');

  for (const x of [-6.7, -5.0, 5.0, 6.7]) {
    addBox(group, [1.25, 3.8, 0.75], [x, 1.9, -5.95], darkWood, 'archive-index-cabinet');
    for (const y of [0.65, 1.35, 2.05, 2.75, 3.45]) {
      addBox(group, [0.12, 0.05, 0.08], [x, y, -5.54], brass, 'archive-card-pull');
    }
  }

  addBox(group, [3.6, 0.9, 1.2], [-5.6, 0.75, 5.6], darkWood, 'archive-mila-desk');
  addBox(group, [1.9, 0.95, 1.1], [5.8, 0.76, 2.3], green, 'archive-map-cart');

  // The imported furniture kit now supplies every desk, shelf and the big map
  // board. The old greybox tables shrink to just their readable paper props,
  // re-seated on the kit's actual surfaces so nothing double-renders.
  const mapTable = new THREE.Group();
  mapTable.name = 'archive-map-table';
  makePaper(mapTable, [1.85, 1.35], [0, 0.02, 0], paper, 'archive-city-feed-plan');
  for (const [x, z, w, d] of [[-0.55, 0.19, 0.95, 0.03], [0.26, 0.19, 0.62, 0.03], [0.53, -0.06, 0.03, 0.46]]) {
    addBox(mapTable, [w, 0.02, d], [x, 0.045, z], green, 'archive-map-feed-line');
  }
  mapTable.position.fromArray(ARCHIVE_POSITIONS.mapTable);
  group.add(mapTable);

  const workOrderDesk = new THREE.Group();
  workOrderDesk.name = 'archive-work-order-desk';
  makePaper(workOrderDesk, [0.7, 0.9], [0, 0.02, 0], redPaper, 'archive-maintenance-order-c441');
  workOrderDesk.position.set(...ARCHIVE_POSITIONS.workOrder);
  group.add(workOrderDesk);

  const timeline = new THREE.Group();
  timeline.name = 'archive-material-timeline';
  for (let index = 0; index < 6; index += 1) {
    const z = -0.5 + index * 0.2;
    const card = makePaper(timeline, [0.22, 0.32], [0, 0.02, z], index === 4 ? redPaper : paper, `archive-timeline-card-${index + 1}`);
    card.rotation.y = (index - 2.5) * 0.018;
  }
  timeline.position.fromArray(ARCHIVE_POSITIONS.timeline);
  timeline.visible = false;
  group.add(timeline);

  const mila = makeActor(group, { name: 'archive-mila-placeholder', color: 0x665348, position: ARCHIVE_POSITIONS.mila, scale: 0.94 });
  const ana = makeActor(group, { name: 'archive-ana-placeholder', color: 0x496268, position: ARCHIVE_POSITIONS.ana, scale: 0.92 });
  const petar = makeActor(group, { name: 'archive-petar-placeholder', color: 0x5d6653, position: ARCHIVE_POSITIONS.petar, scale: 1.04 });

  const toolBox = new THREE.Group();
  toolBox.name = 'archive-petar-toolbox';
  addBox(toolBox, [1.45, 0.56, 0.72], [0, 0.28, 0], material(0x52605b, 0.62, 0.2), 'petar-toolbox-body');
  addBox(toolBox, [1.1, 0.1, 0.08], [0, 0.72, 0], brass, 'petar-toolbox-handle');
  for (const x of [-0.3, 0.3]) addBox(toolBox, [0.11, 0.62, 0.11], [x, 0.48, 0], brass, 'petar-tool');
  toolBox.position.set(3.5, 0, -2.2);
  group.add(toolBox);

  group.add(new THREE.HemisphereLight(0xcbd7d2, 0x352d28, 1.58));
  const windowLight = new THREE.DirectionalLight(0xffc781, 2.85);
  windowLight.position.set(-8, 9, 5);
  windowLight.castShadow = true;
  group.add(windowLight);
  const readingLamp = new THREE.PointLight(0xf0bc72, 28, 19, 1.8);
  readingLamp.position.set(0, 4.0, 1.5);
  group.add(readingLamp);
  const coolFill = new THREE.PointLight(0x7ea6aa, 19, 17, 1.8);
  coolFill.position.set(6, 3.5, -2.5);
  group.add(coolFill);
  const deskPractical = new THREE.PointLight(0xffd49a, 18, 9, 1.9);
  deskPractical.position.set(-5.2, 2.7, -2.0);
  group.add(deskPractical);

  scene.add(group);
  return {
    group,
    mila,
    ana,
    petar,
    mapTable,
    workOrderDesk,
    timeline,
    toolBox,
  };
}
