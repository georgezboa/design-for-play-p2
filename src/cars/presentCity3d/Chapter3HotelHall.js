import * as THREE from 'three';

export const HOTEL_POSITIONS = Object.freeze({
  playerStart: [-2.85, 0.5, 0.30], lev: [-2.65, 0.5, -0.7], hana: [0, 0, -2.5], deskApproach: [-1.0, 0.5, -1.05],
  // Lobby guests are seated at the dining furniture and no longer wander.
  irena: [-1.98, 0, 0.84], irenaApproach: [-2.75, 0.5, 0.84],
  vesna: [-1.03, 0, 2.24], vesnaApproach: [-2.45, 0.5, 2.75],
  daro: [-0.60, 0, -0.38], daroApproach: [0.45, 0.5, -0.50],
  corridorEntrance: [0.4, 1.25, 3.0], corridorEntranceApproach: [-0.15, 0.5, 1.15],
  lobbyStairArrival: [-0.15, 0.5, 1.15],
  lobbyExit: [-3.0, 1.25, 0.0], lobbyExitApproach: [-2.55, 0.5, 0.0],
  corridorPlayerStart: [0, 0.5, 7.15], corridorLev: [-0.5, 0.5, 6.25],
  corridorRoomExitStart: [0, 0.5, -7.35],
  butchRoomDoor: [0, 1.25, -8.55], butchRoomDoorApproach: [0, 0.5, -7.35],
  corridorStairExit: [0, 1.25, 8.55], corridorStairExitApproach: [0, 0.5, 7.35],
  roomPlayerStart: [0.7, 0.5, -9.55], roomLev: [1.15, 0.5, -11.55],
  evidenceTable: [-1.0, 0.75, -10.55], evidenceApproach: [1.25, 0.5, -9.3],
  bed: [-0.25, 0.35, -13.65], bedApproach: [2.15, 0.5, -13.15],
  washstand: [2.0, 0.45, -10.55],
  roomExit: [0, 1.25, -8.55], roomExitApproach: [0, 0.5, -9.3],
  levDoorThreshold: [0, 0.5, -7.45],
  levCorridorExit: [0, 0.5, 7.65],
});

function actor(color, position) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.82, 5, 10), new THREE.MeshStandardMaterial({ color, roughness: 0.82 }));
  body.position.y = 0.92;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 12, 10), new THREE.MeshStandardMaterial({ color: 0xb88f70, roughness: 0.94 }));
  head.position.y = 1.7;
  group.add(body, head);
  group.position.set(...position);
  return group;
}

function addRoomShell(group, mat, { floorColor, wallColor, rugColor }) {
  const floor = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.18, 6.0), mat(floorColor));
  floor.position.y = -0.1;
  floor.name = 'lobby-floor';
  const rug = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.03, 4.6), mat(rugColor, 0.95));
  rug.position.set(0, 0.03, 0.3);
  rug.name = 'lobby-rug';
  group.add(floor, rug);
  const walls = [];
  for (const x of [-3.1, 3.1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.8, 6.0), mat(wallColor, 0.96));
    wall.position.set(x, 1.4, 0);
    wall.name = x < 0 ? 'lobby-left-wall' : 'lobby-right-wall';
    group.add(wall);
    walls.push(wall);
  }
  const back = new THREE.Mesh(new THREE.BoxGeometry(6.0, 2.8, 0.2), mat(wallColor, 0.96));
  back.position.set(0, 1.4, -3.0);
  back.name = 'lobby-back-wall';
  group.add(back);
  walls.push(back);
  return { floor, rug, walls };
}

export function createChapter3HotelHall(scene) {
  const roomCenterZ = -12.65;
  const group = new THREE.Group();
  group.name = 'chapter-03-copper-heron-greybox';
  const lobbyGroup = new THREE.Group();
  lobbyGroup.name = 'chapter-03-copper-heron-lobby-greybox';
  const corridorGroup = new THREE.Group();
  corridorGroup.name = 'chapter-03-copper-heron-corridor-greybox';
  const roomGroup = new THREE.Group();
  roomGroup.name = 'chapter-03-butch-private-room-greybox';
  const mat = (color, roughness = 0.9) => new THREE.MeshStandardMaterial({ color, roughness });

  const { floor: lobbyFloor, rug: lobbyRug, walls: lobbyWalls } = addRoomShell(lobbyGroup, mat, { floorColor: 0x574b3d, wallColor: 0x857965, rugColor: 0x6d3e37 });
  const desk = new THREE.Mesh(new THREE.BoxGeometry(5.8, 1.2, 1.15), mat(0x38271d, 0.78));
  desk.position.set(0, 0.6, -2.4);
  desk.name = 'lobby-desk';
  const register = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.08, 1.05), mat(0xc8b68f, 0.94));
  register.position.set(0.55, 1.04, -2.27);
  register.rotation.y = -0.12;
  const hana = actor(0x70574a, HOTEL_POSITIONS.hana);
  const irena = actor(0x4d6670, HOTEL_POSITIONS.irena);
  const vesna = actor(0x6e5b45, HOTEL_POSITIONS.vesna);
  const daro = actor(0x4c5145, HOTEL_POSITIONS.daro);
  const lobbyExit = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.5, 0.18), mat(0x38271d, 0.82));
  lobbyExit.position.set(...HOTEL_POSITIONS.lobbyExit);
  lobbyExit.rotation.y = Math.PI / 2;
  const corridorEntrance = new THREE.Mesh(new THREE.BoxGeometry(1.35, 2.5, 0.18), mat(0x4c3021, 0.82));
  corridorEntrance.position.set(...HOTEL_POSITIONS.corridorEntrance);
  const steps = [];
  for (let index = 0; index < 4; index += 1) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.18 + index * 0.16, 0.6), mat(0x665748, 0.9));
    step.position.set(-0.7 + index * 0.28, 0.09 + index * 0.08, 1.95 + index * 0.25);
    step.name = `lobby-stair-step-${index + 1}`;
    steps.push(step);
    lobbyGroup.add(step);
  }
  const lobbyLegacyFallbacks = [lobbyFloor, lobbyRug, ...lobbyWalls, desk, ...steps, lobbyExit, corridorEntrance];
  lobbyGroup.add(desk, register, hana, irena, vesna, daro, lobbyExit, corridorEntrance);
  lobbyGroup.add(new THREE.HemisphereLight(0xb9c9c5, 0x1b100b, 1.28));
  const lobbyKey = new THREE.PointLight(0xffb56f, 28, 18, 1.8);
  lobbyKey.position.set(-1.8, 4.2, 1.5);
  const lobbyWindowFill = new THREE.PointLight(0x6d9eaa, 17, 15, 1.9);
  lobbyWindowFill.position.set(4.0, 3.0, -2.5);
  const lobbyDeskLight = new THREE.PointLight(0xffd091, 24, 10, 1.9);
  lobbyDeskLight.position.set(0.4, 2.8, -0.4);
  const lobbyDoorLight = new THREE.PointLight(0xd7783c, 17, 11, 1.9);
  lobbyDoorLight.position.set(-2.4, 2.3, 0);
  lobbyGroup.add(lobbyKey, lobbyWindowFill, lobbyDeskLight, lobbyDoorLight);

  const corridorFloor = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.18, 15.2), mat(0x413c35, 0.95));
  corridorFloor.position.y = -0.1;
  const corridorRunner = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.03, 13.6), mat(0x603c36, 0.96));
  corridorRunner.position.set(0, 0.03, -0.1);
  corridorGroup.add(corridorFloor, corridorRunner);
  const corridorWalls = [];
  for (const x of [-3.6, 3.6]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.8, 15.2), mat(0x777063, 0.96));
    wall.position.set(x, 1.4, 0);
    corridorGroup.add(wall);
    corridorWalls.push(wall);
  }
  for (const x of [-2.65, 2.65]) {
    const endWall = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.8, 0.2), mat(0x777063, 0.96));
    endWall.position.set(x, 1.4, -7.5);
    corridorGroup.add(endWall);
    corridorWalls.push(endWall);
  }

  const backgroundDoors = [];
  const doorZs = [5.7, 2.0, -1.8, -5.5];
  for (const side of [-1, 1]) {
    for (const [index, z] of doorZs.entries()) {
      const door = new THREE.Mesh(new THREE.BoxGeometry(1.45, 2.45, 0.16), mat(0x493529, 0.88));
      door.position.set(side * 1.42, 1.23, z);
      door.rotation.y = Math.PI / 2;
      door.name = `copper-heron-background-room-${side < 0 ? 'left' : 'right'}-${index + 1}`;
      const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.04), mat(0x9a8762, 0.76));
      plaque.position.set(0, 0.48, -0.11);
      door.add(plaque);
      backgroundDoors.push(door);
      corridorGroup.add(door);
    }
  }
  const butchRoomDoor = new THREE.Group();
  butchRoomDoor.position.set(...HOTEL_POSITIONS.butchRoomDoor);
  butchRoomDoor.name = 'copper-heron-butch-room-door';
  const butchDoorPortal = new THREE.Mesh(
    new THREE.BoxGeometry(1.48, 2.45, 0.03),
    new THREE.MeshBasicMaterial({ color: 0x080605 }),
  );
  butchDoorPortal.position.z = -0.06;
  const butchDoorPivot = new THREE.Group();
  butchDoorPivot.position.x = -0.775;
  const butchDoorLeaf = new THREE.Mesh(new THREE.BoxGeometry(1.55, 2.55, 0.2), mat(0x5f3d2b, 0.8));
  butchDoorLeaf.position.set(0.775, 0, 0);
  const butchPlaque = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.22, 0.05), mat(0xc0a36a, 0.68));
  butchPlaque.position.set(-0.13, 0.52, 0);
  butchDoorLeaf.add(butchPlaque);
  butchDoorPivot.add(butchDoorLeaf);
  butchRoomDoor.add(butchDoorPortal, butchDoorPivot);
  const corridorStairExit = new THREE.Group();
  corridorStairExit.position.set(...HOTEL_POSITIONS.corridorStairExit);
  corridorStairExit.name = 'copper-heron-corridor-stair-door';
  const stairDoorPortal = butchDoorPortal.clone();
  stairDoorPortal.position.z = 0.06;
  const stairDoorPivot = new THREE.Group();
  stairDoorPivot.position.x = -0.775;
  const stairDoorLeaf = new THREE.Mesh(new THREE.BoxGeometry(1.55, 2.5, 0.18), mat(0x38271d, 0.82));
  stairDoorLeaf.position.x = 0.775;
  stairDoorPivot.add(stairDoorLeaf);
  corridorStairExit.add(stairDoorPortal, stairDoorPivot);
  const corridorLightFixtures = [];
  for (const [index, z] of [4.7, 1.6, -1.5, -4.6].entries()) {
    const light = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.08, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xe4c58a, emissive: 0x8e5b2f, emissiveIntensity: 1.2, roughness: 0.5 }),
    );
    light.name = `corridor-ceiling-fixture-${index + 1}`;
    light.position.set(0, 2.55, z);
    const pool = new THREE.PointLight(0xe8aa67, 12, 7.5, 1.85);
    pool.position.set(0, 2.3, z);
    corridorGroup.add(light, pool);
    corridorLightFixtures.push(light);
  }
  corridorGroup.add(butchRoomDoor, corridorStairExit);
  corridorGroup.add(new THREE.HemisphereLight(0x9fb0ae, 0x160c08, 1.25));
  const corridorNearLight = new THREE.PointLight(0xe9aa68, 26, 13, 1.85);
  corridorNearLight.position.set(-0.5, 2.35, 3.5);
  const corridorFarLight = new THREE.PointLight(0xb97952, 24, 13, 1.85);
  corridorFarLight.position.set(0.7, 2.35, -4.6);
  corridorGroup.add(corridorNearLight, corridorFarLight);
  corridorGroup.visible = false;

  const roomFloor = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.18, 7.4), mat(0x48443e, 0.94));
  roomFloor.position.set(0, -0.1, roomCenterZ);
  const roomRug = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.03, 4.6), mat(0x3f5860, 0.95));
  roomRug.position.set(0, 0.03, roomCenterZ);
  const roomWalls = [];
  for (const x of [-3.6, 3.6]) {
    const roomSideWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.8, 7.4), mat(0x766f63, 0.96));
    roomSideWall.position.set(x, 1.4, roomCenterZ);
    roomGroup.add(roomSideWall);
    roomWalls.push(roomSideWall);
  }
  const roomBackWall = new THREE.Mesh(new THREE.BoxGeometry(7.4, 2.8, 0.2), mat(0x766f63, 0.96));
  roomBackWall.position.set(0, 1.4, roomCenterZ - 3.7);
  roomGroup.add(roomFloor, roomRug, roomBackWall);
  roomWalls.push(roomBackWall);
  const evidenceTable = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.78, 1.7), mat(0x463126, 0.8));
  evidenceTable.position.set(...HOTEL_POSITIONS.evidenceTable);
  const evidencePapers = [];
  const paperLayouts = [
    ['oil-route', 'Oil route sketch', -0.78, 0.43, -0.34, -0.12, 0.82, 0.54, 0xcdbf9e],
    ['issue-copy', 'Municipal issue copy', 0.02, 0.44, -0.28, 0.08, 0.76, 0.58, 0xb9c7bd],
    ['order-c441', 'Maintenance order C-441', 0.75, 0.45, -0.18, -0.1, 0.8, 0.56, 0xd0b6a0],
    ['witness-notes', 'Witness notes', -0.42, 0.46, 0.38, 0.16, 0.9, 0.52, 0xc8c0a6],
    ['reservation', 'Eastbound reservation', 0.5, 0.47, 0.4, -0.06, 0.72, 0.5, 0xd7c89f],
  ];
  const evidencePaperSpecs = [];
  for (const [id, label, x, y, z, rotation, width, depth, color] of paperLayouts) {
    const paper = new THREE.Mesh(new THREE.BoxGeometry(width, 0.045, depth), mat(color, 0.96));
    paper.position.set(evidenceTable.position.x + x, evidenceTable.position.y + y, evidenceTable.position.z + z);
    paper.rotation.y = rotation;
    paper.name = `hotel-evidence-paper-${id}`;
    paper.userData.hotelPaperId = id;
    paper.userData.hotelPaperLabel = label;
    evidencePapers.push(paper);
    evidencePaperSpecs.push({ id, label, paper, approach: HOTEL_POSITIONS.evidenceApproach });
    roomGroup.add(paper);
  }
  const bed = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.55, 1.75), mat(0x6a7274, 0.96));
  bed.position.set(...HOTEL_POSITIONS.bed);
  const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.18, 1.25), mat(0xb9b1a1, 0.98));
  pillow.position.set(-0.95, 0.38, 0);
  bed.add(pillow);
  const washstand = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 0.7), mat(0x3e332b, 0.86));
  washstand.position.set(...HOTEL_POSITIONS.washstand);
  const roomExit = butchRoomDoor;
  roomGroup.add(evidenceTable, bed, washstand);
  roomGroup.add(new THREE.HemisphereLight(0xa8b8b5, 0x160b08, 1.45));
  const roomLamp = new THREE.PointLight(0xf2aa64, 40, 12, 1.8);
  roomLamp.position.set(-1.5, 2.2, roomCenterZ);
  const roomBedLight = new THREE.PointLight(0xffcf92, 30, 9, 1.9);
  roomBedLight.position.set(1.8, 2.25, roomCenterZ - 1.1);
  const roomNightFill = new THREE.PointLight(0x5d8792, 24, 12, 1.9);
  roomNightFill.position.set(2.7, 2.1, roomCenterZ + 2.2);
  roomGroup.add(roomLamp, roomBedLight, roomNightFill);
  roomGroup.visible = false;

  group.add(lobbyGroup, corridorGroup, roomGroup);
  group.visible = false;
  scene.add(group);
  return {
    group, lobbyGroup, corridorGroup, roomGroup, desk, register, hana, irena, vesna, daro,
    lobbyExit, corridorEntrance, corridorStairExit, backgroundDoors, butchRoomDoor,
    evidenceTable, evidencePapers, evidencePaperSpecs, bed, washstand, roomExit,
    butchDoorLeaf, butchDoorPivot, butchDoorPortal,
    stairDoorLeaf, stairDoorPivot, stairDoorPortal,
    corridorFloor, corridorRunner, corridorWalls, corridorLightFixtures,
    roomFloor, roomRug, roomWalls, lobbyLegacyFallbacks, steps,
  };
}
