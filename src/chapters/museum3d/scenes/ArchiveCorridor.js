// Beat 2 — V02 Chapter 5 archive corridor and collapse gauntlet.
// Only Door 4 (The Labyrinth) is playable in this route. The first three
// directions survive as pre-displayed records behind sealed archive shutters.
//
// Layout: x ∈ [8, 42], z ∈ [-2, 2], ceiling 3.2. Entrance from lobby at x=8.

import * as THREE from 'three';
import { COLORS } from '../config.js';
import { mat, emissiveMat, flatMat, box, plane, label, fluorescentFixture, glassMat, hitProxy } from '../util/graybox.js';
import { createMuseumMaterialLibrary } from '../assets/MuseumMaterials.js';
import { addAcousticCeilingGrid, createGuidePedestal, createPublicBench, createWallRadiator } from '../assets/MuseumProps.js';
import { CHAPTER05_DIRECTIONS, isDirectionPlayable } from '../directions/directionRegistry.js';
import { directionAtDoorway } from '../directions/directionDoorways.js';
import { animateReturnArtifact, createReturnArtifact } from '../assets/ReturnArtifacts.js';
import { createChapterSupportingElements } from '../assets/ChapterExhibitElements.js';
import { chapterExhibit, exhibitDialogue } from '../data/chapterExhibitCatalog.js';
import { CollapseGauntletDirector } from '../systems/CollapseGauntletDirector.js';
import { COLLAPSE_STRINGS } from '../state/collapseGauntlet.js';

const WALL_H = 3.2;
const WALL_T = 0.3;

export class ArchiveCorridor {
  constructor() {
    this.name = 'corridor';
    this.root = new THREE.Group();
    this.root.name = 'archive-corridor';
    this.background = new THREE.Color(0x12100c);
  }

  build(ctx) {
    this.ctx = ctx;
    const { collisionWorld } = ctx;
    const g = this.root;
    // Restore the authored dark archive look that existed before the V02
    // integration. The lobby HDR environment was washing the hall flat and
    // made emergency red read as a few isolated bulbs instead of a room state.
    this.root.userData.environment = null;
    this.root.userData.rendererExposure = 0.80;
    this.materials = createMuseumMaterialLibrary();
    const cx = 25; // corridor center x
    const len = 34;
    const roomStartX = 38.8;
    const roomEndX = 42;
    const roomCenterX = (roomStartX + roomEndX) / 2;
    const roomLength = roomEndX - roomStartX;
    const roomHalfDepth = 4.2;

    // shell
    plane(g, { x: cx, z: 0, w: len, h: 4, material: this.materials.carpet, name: 'floor' });
    plane(g, { x: cx, y: 0.005, z: 0, w: len, h: 1.6, material: this.materials.carpetLane, name: 'lane' });
    plane(g, { x: cx, y: WALL_H, z: 0, w: len, h: 4, material: this.materials.ceilingTile, rotationX: Math.PI / 2, name: 'ceiling' });
    addAcousticCeilingGrid(g, { width: len, depth: 4, y: WALL_H - 0.012, centerX: cx });
    // The last three metres flare into a real dodge room. The overlap with the
    // corridor floor/ceiling avoids a visible seam at the transition.
    plane(g, { x: roomCenterX, z: 0, w: roomLength + 0.18, h: roomHalfDepth * 2, material: this.materials.carpet, name: 'final-antechamber-floor' });
    plane(g, { x: roomCenterX, y: 0.006, z: 0, w: roomLength + 0.18, h: 6.8, material: this.materials.carpetLane, name: 'final-antechamber-lane' });
    plane(g, { x: roomCenterX, y: WALL_H, z: 0, w: roomLength + 0.18, h: roomHalfDepth * 2, material: this.materials.ceilingTile, rotationX: Math.PI / 2, name: 'final-antechamber-ceiling' });
    addAcousticCeilingGrid(g, { width: roomLength + 0.18, depth: roomHalfDepth * 2, y: WALL_H - 0.012, centerX: roomCenterX });

    const wall = this.materials.wallDark;
    const lower = this.materials.wallDark;
    const rail = this.materials.oliveSteel;
    // Main hall walls stop where the final dodge room flares outward.
    const mainWallLength = roomStartX - 8;
    const mainWallCenter = 8 + mainWallLength / 2;
    box(g, { x: mainWallCenter, y: WALL_H / 2, z: 2, w: mainWallLength, h: WALL_H, d: WALL_T, material: wall, name: 'wall-south', collide: true, collisionWorld });
    box(g, { x: mainWallCenter, y: 0.63, z: 1.82, w: mainWallLength - 0.3, h: 1.08, d: 0.05, material: lower, name: 'wainscot-south' });
    box(g, { x: mainWallCenter, y: 1.18, z: 1.86, w: mainWallLength - 0.3, h: 0.09, d: 0.07, material: rail, name: 'chair-rail-south' });
    for (const side of [-1, 1]) {
      const start = new THREE.Vector2(roomStartX, side * 2);
      const end = new THREE.Vector2(39.58, side * roomHalfDepth);
      const dx = end.x - start.x;
      const dz = end.y - start.y;
      const length = Math.hypot(dx, dz);
      const rotationY = -Math.atan2(dz, dx);
      const flare = new THREE.Mesh(new THREE.BoxGeometry(length, WALL_H, WALL_T), wall);
      flare.name = `final-room-flare-${side < 0 ? 'north' : 'south'}`;
      flare.position.set((start.x + end.x) / 2, WALL_H / 2, (start.y + end.y) / 2);
      flare.rotation.y = rotationY;
      g.add(flare);
      collisionWorld.addOrientedBoxFromCenterSize(flare.position.x, flare.position.z, length, WALL_T, rotationY, flare.name);
    }
    for (const side of [-1, 1]) {
      box(g, { x: 40.79, y: WALL_H / 2, z: side * roomHalfDepth, w: 2.42, h: WALL_H, d: WALL_T, material: wall, name: `final-room-wall-${side < 0 ? 'north' : 'south'}`, collide: true, collisionWorld });
    }
    // The east wall is split around the Final Archive doorway. The closed
    // leaves own the central collider and remove it only after key eight.
    for (const z of [-2.88, 2.88]) {
      box(g, { x: 42, y: WALL_H / 2, z, w: WALL_T, h: WALL_H, d: 2.64, material: wall, name: `wall-end-${z < 0 ? 'north' : 'south'}`, collide: true, collisionWorld });
    }

    // The open west threshold is the route back to the ordinary front lobby.
    // Warm spill and the continuing carpet lane make the return leg readable
    // without another sign.
    box(g, { x: 8.12, y: 2.85, z: 0, w: 0.28, h: 0.42, d: 3.1, material: this.materials.oliveSteel, name: 'lobby-return-lintel' });
    box(g, { x: 8.12, y: 1.4, z: -1.58, w: 0.28, h: 2.8, d: 0.16, material: this.materials.oliveSteel, name: 'lobby-return-frame-n' });
    box(g, { x: 8.12, y: 1.4, z: 1.58, w: 0.28, h: 2.8, d: 0.16, material: this.materials.oliveSteel, name: 'lobby-return-frame-s' });
    const lobbyGlow = new THREE.RectAreaLight(0xffd39a, 3.4, 2.7, 2.6);
    lobbyGlow.position.set(8.18, 1.45, 0);
    lobbyGlow.rotation.y = Math.PI / 2;
    g.add(lobbyGlow);

    // The four-number archive rhythm remains visible. Door 1 is sealed; the
    // side-on last door beneath the final light is the only playable route.
    const gaps = [14, 22, 30, 38];
    let cursor = 8;
    for (const gx of gaps) {
      const segW = gx - 1 - cursor;
      const segX = cursor + segW / 2;
      box(g, { x: segX, y: WALL_H / 2, z: -2, w: segW, h: WALL_H, d: WALL_T, material: wall, name: `wall-n-${cursor}`, collide: true, collisionWorld });
      box(g, { x: segX, y: 0.63, z: -1.82, w: Math.max(0.05, segW - 0.12), h: 1.08, d: 0.05, material: lower, name: `wainscot-n-${cursor}` });
      box(g, { x: segX, y: 1.18, z: -1.86, w: Math.max(0.05, segW - 0.12), h: 0.09, d: 0.07, material: rail, name: `chair-rail-n-${cursor}` });
      box(g, { x: gx, y: 2.85, z: -2, w: 2.0, h: 0.7, d: WALL_T, material: wall, name: `lintel-${gx}` });
      cursor = gx + 1;
    }
    // fluorescent strips
    this.ceilingFixtures = [];
    for (const fx of [11, 17, 23, 29, 35, 40]) {
      const fixture = fluorescentFixture(g, { x: fx, z: 0, ceilingY: WALL_H, length: 2.6 });
      fixture.x = fx;
      if (fx !== 40) fixture.tube.material = mat(0x24231f);
      this.ceilingFixtures.push(fixture);
    }
    for (const z of [-2.55, 2.55]) {
      const fixture = fluorescentFixture(g, { x: 40, z, ceilingY: WALL_H, length: 1.55 });
      fixture.x = 40;
      this.ceilingFixtures.push(fixture);
    }

    // ---- One sealed first door, two sealed records, then Door 4 Labyrinth. ----
    this._recordDoors = [];
    this._sealArchiveBay(g, { x: 14, id: 'record-1', number: '1' });
    this._sealArchiveBay(g, { x: 22, id: 'borrowed-grid', number: '2' });
    this._sealArchiveBay(g, { x: 30, id: 'echo-city', number: '3' });
    this.labyrinthScreen = this._numberedDoor(g, {
      x: 38,
      id: 'labyrinth',
      number: '4',
      screenColor: 0x21131a,
    });
    // Door 4 is the only playable museum door. Give it a visible interaction
    // point so the player does not have to guess which part of the panel owns E.
    this.labyrinthInteractPoint = new THREE.Group();
    this.labyrinthInteractPoint.name = 'door-4-interaction-point';
    this.labyrinthInteractPoint.position.set(38.62, 1.02, -1.77);
    const pointRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.11, 0.022, 10, 28),
      new THREE.MeshBasicMaterial({ color: 0xf0c56d, depthTest: false }),
    );
    pointRing.name = 'door-4-interact-ring';
    const pointCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0xffe4a0, depthTest: false }),
    );
    pointCore.position.z = 0.015;
    this.labyrinthInteractPoint.add(pointRing, pointCore);
    g.add(this.labyrinthInteractPoint);

    // The whole journey is already catalogued before the Labyrinth opens. Keep
    // the approved spatial order and collapse choreography; the new chapter
    // headings make each record's origin clear without moving its fixed case.
    this.artifactNiches = new Map();
    for (const [id, x] of [
      [CHAPTER05_DIRECTIONS.LABYRINTH, 38],
      [CHAPTER05_DIRECTIONS.BORROWED_GRID, 22],
      [CHAPTER05_DIRECTIONS.ECHO_CITY, 30],
      [CHAPTER05_DIRECTIONS.PAINTED_COUNTRY, 14],
    ]) {
      this.artifactNiches.set(id, this._artifactNiche(g, { id, x }));
    }
    label(g, 'MEMORY TRANSLATION INDEX\nTHE ARCHIVE PRESERVES EACH MEMORY AS A DIFFERENT LAW', {
      x: 10.6, y: 2.66, z: 1.81, w: 4.3, h: 0.62,
      fg: '#d8caa5', bg: '#171a18', font: 'bold 28px Georgia, serif',
      rotationY: Math.PI,
    });

    this.finalDoor = this._finalArchiveDoor(g);

    // guide stand — south side on pass 1, north side after the loop
    this.guideStand = new THREE.Group();
    g.add(this.guideStand);
    const guideAssembly = createGuidePedestal(this.materials);
    this.guideStand.add(guideAssembly.group);
    hitProxy(this.guideStand, { x: 0, y: 1.2, z: 0, w: 0.8, h: 0.9, d: 0.8, name: 'corridor-guide-proxy' });
    this._applyStandSide('south');

    // Waiting furniture is ordinary civic stock, not abstract gray boxes.
    for (const bx of [17.5, 26.5]) {
      const bench = createPublicBench(this.materials);
      bench.position.set(bx, 0, 1.62);
      g.add(bench);
      collisionWorld.addBoxFromCenterSize(bx, 1.62, 1.75, 0.52, `bench-${bx}`);
    }
    for (const rx of [10.5, 34.5]) {
      const radiator = createWallRadiator(this.materials, { width: 1.25 });
      radiator.position.set(rx, 0, 1.78);
      radiator.rotation.y = Math.PI;
      g.add(radiator);
    }

    // Exact dark-light foundation from the last approved archive pass: real
    // black environment, low neutral spill, and one dominant end fixture.
    const ambient = new THREE.HemisphereLight(0x77736a, 0x25231f, 1.15);
    const reflected = new THREE.AmbientLight(0x4c4942, 0.82);
    g.add(ambient, reflected);
    this.corridorLights = [ambient, reflected];
    for (const spillX of [14, 22, 30, 38]) {
      const spill = new THREE.PointLight(0x77736a, spillX === 14 ? 11 : 8.4, spillX === 38 ? 8.4 : 7.2, 2);
      spill.position.set(spillX, 2.25, 0.35);
      spill.userData.corridorX = spillX;
      g.add(spill);
      this.corridorLights.push(spill);
    }
    const finalFluorescent = new THREE.RectAreaLight(0xffedc5, 9.0, 3.0, 7.2);
    finalFluorescent.position.set(40.2, WALL_H - 0.13, 0);
    finalFluorescent.rotation.x = -Math.PI / 2;
    finalFluorescent.userData.corridorX = 40.2;
    g.add(finalFluorescent);
    const finalDoorPool = new THREE.PointLight(0xf4f0df, 12, 6.4, 2);
    finalDoorPool.position.set(40.3, 2.45, 0);
    finalDoorPool.userData.corridorX = 40.3;
    g.add(finalDoorPool);
    this.corridorLights.push(finalFluorescent, finalDoorPool);

    this.gauntlet = new CollapseGauntletDirector({
      ctx,
      root: g,
      materials: this.materials,
      cases: this.artifactNiches,
      corridorLights: this.corridorLights,
      ceilingFixtures: this.ceilingFixtures,
      finalDoor: this.finalDoor,
    });

    // trigger zones
    this._doorwayDirection = null;
    this._lobbyReturnZone = { minX: 7.6, maxX: 8.55, minZ: -1.55, maxZ: 1.55 };

    g.traverse((object) => {
      if (!object.isMesh) return;
      object.receiveShadow = true;
      object.castShadow = !/(wall|floor|ceiling|lane|glass|tube)/i.test(object.name);
    });
  }

  _numberedDoor(g, { x, id, number, screenColor }) {
    box(g, {
      x, y: 1.25, z: -1.98, w: 2.0, h: 2.5, d: 0.14,
      material: this.materials.walnutDark, name: `${id}-terminal`,
      collide: true, collisionWorld: this.ctx.collisionWorld,
    });
    box(g, {
      x, y: 1.25, z: -1.89, w: 1.58, h: 2.08, d: 0.025,
      material: emissiveMat(screenColor), name: `${id}-screen`,
    });
    box(g, {
      x: x + 0.62, y: 1.02, z: -1.85, w: 0.09, h: 0.09, d: 0.05,
      material: this.materials.brass, name: `${id}-control-rail`,
    });
    label(g, String(number), { x, y: 1.45, z: -1.84, w: 1.5, h: 0.44, fg: '#d8d4c9', bg: '#111416', font: 'bold 62px Georgia, serif' });
    // Keep the target broad, but leave it as a thin plane behind the player's
    // nearest legal standing position. A deep box reaches into the collision
    // boundary and lets the camera end up *inside* the proxy; Three's default
    // front-face raycast then cannot see a way back out of it.
    return hitProxy(g, {
      x, y: 1.35, z: -1.82, w: 2.4, h: 2.3, d: 0.12,
      name: `${id}-interaction-proxy`,
    });
  }

  _sealArchiveBay(g, { x, id, number }) {
    const shutter = new THREE.Group();
    shutter.name = `${id}-standalone-shutter`;
    shutter.position.set(x, 0, -1.73);
    g.add(shutter);
    box(shutter, {
      x: 0, y: 1.25, z: 0, w: 1.86, h: 2.32, d: 0.08,
      material: this.materials.oliveSteel,
      name: `${id}-standalone-panel`,
      collide: true,
      collisionWorld: this.ctx.collisionWorld,
    });
    for (const y of [0.38, 0.76, 1.14, 1.52, 1.9, 2.26]) {
      box(shutter, { x: 0, y, z: 0.055, w: 1.68, h: 0.028, d: 0.025, material: this.materials.brass, name: 'sealed-rail' });
    }
    box(shutter, { x: 0, y: 1.26, z: 0.085, w: 1.2, h: 0.46, d: 0.035, material: this.materials.walnutDark, name: 'sealed-accession-plate' });
    label(shutter, 'RECORD SEALED', { x: 0, y: 1.3, z: 0.112, w: 1.08, h: 0.32, fg: '#b6b09e', bg: '#111416', font: 'bold 46px Georgia, serif' });
    if (number) label(shutter, number, { x: 0, y: 2.52, z: 0.112, w: 0.58, h: 0.42, fg: '#d8d4c9', bg: '#111416', font: 'bold 62px Georgia, serif' });
    const lock = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 8, 20), this.materials.brass);
    lock.name = 'sealed-lock-ring';
    lock.position.set(0.59, 0.54, 0.11);
    lock.rotation.x = Math.PI / 2;
    shutter.add(lock);
  }

  _artifactNiche(g, { id, x }) {
    const exhibit = chapterExhibit(id);
    const group = new THREE.Group();
    group.name = `${id}-return-niche`;
    group.position.set(x, 0, 1.86);
    g.add(group);
    box(group, { x: 0, y: 1.42, z: 0.07, w: 2.25, h: 1.54, d: 0.16, material: this.materials.walnutDark, name: `${id}-niche-frame` });
    box(group, { x: 0, y: 1.42, z: -0.03, w: 2.02, h: 1.30, d: 0.08, material: emissiveMat(0x080a0b, 0.2), name: `${id}-niche-back` });
    const glass = box(group, { x: 0, y: 1.42, z: -0.24, w: 2.07, h: 1.34, d: 0.012, material: glassMat(), name: `${id}-niche-glass` });
    const artifact = createReturnArtifact(id);
    artifact.position.set(0, 1.48, -0.17);
    artifact.scale.setScalar(id === CHAPTER05_DIRECTIONS.LABYRINTH
      ? 1.1
      : id === CHAPTER05_DIRECTIONS.ECHO_CITY ? 1.3 : 1.22);
    artifact.rotation.y = Math.PI;
    artifact.visible = true;
    group.add(artifact);
    const supportingElements = createChapterSupportingElements(id);
    supportingElements.position.set(0, 1.40, -0.16);
    supportingElements.scale.setScalar(0.88);
    supportingElements.rotation.y = Math.PI;
    group.add(supportingElements);
    const light = new THREE.PointLight(id === CHAPTER05_DIRECTIONS.BORROWED_GRID ? 0x55ddd5 : 0xffd7a1, id === CHAPTER05_DIRECTIONS.BORROWED_GRID ? 2.4 : 1.8, 3.4, 2);
    light.position.set(0, 1.6, -0.55);
    group.add(light);
    const proxy = hitProxy(group, { x: 0, y: 1.42, z: -0.32, w: 2.25, h: 1.54, d: 0.12, name: `${id}-niche-interaction-proxy` });
    label(group, `${exhibit.chapter} · ${exhibit.title}\n${exhibit.mode}`, {
      x: 0, y: 0.54, z: -0.255, w: 2.05, h: 0.36,
      fg: '#eee4cb', bg: '#090b0c', font: 'bold 25px Georgia, serif',
    });
    label(group, exhibit.accession, {
      x: 0, y: 2.31, z: -0.255, w: 1.18, h: 0.18,
      fg: '#c9b681', bg: '#15120d', font: 'bold 26px Georgia, serif',
    });
    return { group, artifact, supportingElements, exhibit, light, glass, proxy, displayed: true, shattered: false };
  }

  _syncArtifacts() {
    const snapshot = this.ctx.directionProgress.getSnapshot();
    for (const [id, niche] of this.artifactNiches) {
      const displayed = snapshot.artifacts[id]?.displayed === true;
      niche.displayed = displayed;
      niche.artifact.visible = displayed;
      niche.supportingElements.visible = displayed;
      if (!niche.shattered) niche.light.intensity = displayed ? (id === CHAPTER05_DIRECTIONS.BORROWED_GRID ? 2.4 : 1.8) : 0;
    }
  }

  _finalArchiveDoor(g) {
    const root = new THREE.Group();
    root.name = 'final-archive-door';
    g.add(root);
    const voidPlane = new THREE.Mesh(new THREE.PlaneGeometry(3.05, 2.95), new THREE.MeshBasicMaterial({ color: 0x000000 }));
    voidPlane.name = 'final-archive-void';
    voidPlane.position.set(41.96, 1.47, 0);
    voidPlane.rotation.y = -Math.PI / 2;
    voidPlane.visible = false;
    root.add(voidPlane);
    box(root, { x: 41.72, y: 2.98, z: 0, w: 0.34, h: 0.34, d: 3.2, material: this.materials.walnutDark, name: 'final-door-lintel' });
    for (const z of [-1.52, 1.52]) box(root, { x: 41.72, y: 1.46, z, w: 0.34, h: 2.95, d: 0.24, material: this.materials.walnutDark, name: 'final-door-jamb' });
    const leftPivot = new THREE.Group();
    leftPivot.position.set(41.72, 0, -1.42);
    const leftLeaf = box(leftPivot, { x: 0, y: 1.46, z: 0.71, w: 0.18, h: 2.9, d: 1.4, material: this.materials.deskWoodDark, name: 'final-door-left-leaf' });
    const rightPivot = new THREE.Group();
    rightPivot.position.set(41.72, 0, 1.42);
    const rightLeaf = box(rightPivot, { x: 0, y: 1.46, z: -0.71, w: 0.18, h: 2.9, d: 1.4, material: this.materials.deskWoodDark, name: 'final-door-right-leaf' });
    root.add(leftPivot, rightPivot);
    for (const leaf of [leftLeaf, rightLeaf]) {
      leaf.castShadow = true;
      for (const y of [0.5, 1.25, 2]) {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.54, 0.98), this.materials.walnutDark);
        panel.position.set(-0.1, y - 1.46, 0);
        leaf.add(panel);
      }
    }
    const lockedPlaque = label(root, COLLAPSE_STRINGS.exitDoorPlaqueLocked, { x: 41.6, y: 2.32, z: 0, w: 2.55, h: 0.34, fg: '#d7c69c', bg: '#201b15', font: 'bold 15px Georgia, serif', rotationY: -Math.PI / 2 });
    const openPlaque = label(root, COLLAPSE_STRINGS.exitDoorPlaqueOpen, { x: 41.59, y: 2.32, z: 0, w: 2.55, h: 0.34, fg: '#d7c69c', bg: '#201b15', font: 'bold 14px Georgia, serif', rotationY: -Math.PI / 2 });
    openPlaque.visible = false;
    const keyRoot = new THREE.Group();
    keyRoot.name = 'final-archive-eight-keyholes';
    root.add(keyRoot);
    const keySlots = [];
    const ys = [0.72, 1.12, 1.52, 1.92];
    for (let column = 0; column < 2; column += 1) {
      for (let row = 0; row < 4; row += 1) {
        const z = column === 0 ? -0.23 : 0.23;
        const y = ys[row];
        const glow = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.018, 8, 18), new THREE.MeshBasicMaterial({ color: 0xd9b15c }));
        glow.position.set(41.59, y, z);
        glow.rotation.y = -Math.PI / 2;
        keyRoot.add(glow);
        const key = new THREE.Group();
        key.position.set(41.55, y, z);
        key.rotation.y = -Math.PI / 2;
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.015, 7, 16), this.materials.brass);
        const stem = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.14, 0.02), this.materials.brass);
        stem.position.y = -0.09;
        const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.025, 0.02), this.materials.brass);
        tooth.position.set(0.016, -0.15, 0);
        key.add(ring, stem, tooth);
        key.visible = false;
        keyRoot.add(key);
        keySlots.push({ glow, key });
      }
    }
    const proxy = hitProxy(root, { x: 41.42, y: 1.48, z: 0, w: 0.38, h: 2.85, d: 2.75, name: 'final-archive-interaction-proxy' });
    this.ctx.collisionWorld.addBoxFromCenterSize(41.72, 0, 0.34, 2.86, 'final-archive-door-closed');
    return { root, void: voidPlane, leftPivot, rightPivot, lockedPlaque, openPlaque, keyRoot, keySlots, proxy, openAmount: 0 };
  }

  _recordDoor(g, { x, id, title, status, description = null, doorColor }) {
    const door = box(g, { x, y: 1.25, z: -2, w: 2.0, h: 2.5, d: 0.12, material: mat(doorColor), name: `${id}-door`, collide: true, collisionWorld: this.ctx.collisionWorld });
    label(g, `${title}\n${status}`, { x, y: 2.55, z: -1.82, w: 2.4, h: 0.6 });
    label(g, status, { x, y: 1.4, z: -1.9, w: 1.5, h: 0.3, bg: '#e8dfc8', fg: '#5a1f1f' });
    box(g, { x: x + 0.7, y: 1.05, z: -1.9, w: 0.08, h: 0.08, d: 0.08, material: mat(COLORS.brass), name: `${id}-knob` });
    this._recordDoors.push({ id, title, status, description, knob: door });
  }

  // Re-registered by Museum3DApp each time this space becomes active.
  registerInteractions() {
    const registerDirection = (id, mesh) => {
      this.ctx.interaction.register(`direction-${id}`, {
        mesh,
        enabled: () => this.ctx.model.getSnapshot().phase === 'corridor',
        prompt: () => this.ctx.directionProgress.getSnapshot().completed[id]
          ? 'E — LABYRINTH FILED'
          : 'E — ENTER DOOR 4 · THE LABYRINTH',
        action: () => this._enterDirection(id),
      });
    };
    registerDirection(CHAPTER05_DIRECTIONS.LABYRINTH, this.labyrinthScreen);
    for (const [id, niche] of this.artifactNiches) {
      this.ctx.interaction.register(`gallery-artifact-${id}`, {
        mesh: niche.proxy,
        enabled: () => this.ctx.model.getSnapshot().phase === 'corridor',
        prompt: 'E — READ ACCESSION CARD',
        action: () => {
          this.ctx.dialogue.play(exhibitDialogue(niche.exhibit));
        },
      });
    }
    this.ctx.interaction.register('final-archive-door', {
      mesh: this.finalDoor.proxy,
      enabled: () => ['corridor', 'collapse'].includes(this.ctx.model.getSnapshot().phase)
        && this.ctx.controller.position.x >= 39.15,
      prompt: () => {
        const state = this.ctx.model.getSnapshot();
        if (state.phase !== 'collapse') return 'E — INSPECT EIGHT KEYHOLES';
        if (state.collapse.doorOpen) return COLLAPSE_STRINGS.promptJump;
        return `${COLLAPSE_STRINGS.promptSlotKey} / LMB — ${state.collapse.keysSlotted} / 8`;
      },
      action: () => {
        const state = this.ctx.model.getSnapshot();
        if (state.phase !== 'collapse') this.ctx.dialogue.play([{ speaker: null, text: COLLAPSE_STRINGS.exitDoorSealedNote }]);
        else if (state.collapse.doorOpen) {
          this.ctx.controller.setPose(41.28, this.ctx.controller.position.z, -Math.PI / 2);
        }
      },
    });
    for (const { id, title, status, description, knob } of this._recordDoors) {
      this.ctx.interaction.register(id, {
        mesh: knob,
        enabled: () => this.ctx.model.getSnapshot().phase === 'corridor',
        prompt: `E — ${title}`,
        action: () => {
          this.ctx.dialogue.play([
            { speaker: null, text: description ?? `${title}. ${status}. The label is printed, dated, and honest.` },
          ]);
        },
      });
    }
  }

  _applyStandSide(side) {
    if (side === 'south') {
      this.guideStand.position.set(11, 0, 1.4);
    } else {
      this.guideStand.position.set(11, 0, -1.4);
    }
    const world = this.ctx.collisionWorld;
    world.removeById('corridor-guide-stand');
    world.addBoxFromCenterSize(11, side === 'south' ? 1.4 : -1.4, 0.5, 0.5, 'corridor-guide-stand');
  }

  _inZone(pos, zone) {
    return pos.x >= zone.minX && pos.x <= zone.maxX && pos.z >= zone.minZ && pos.z <= zone.maxZ;
  }

  _enterDirection(id) {
    if (!isDirectionPlayable(id)) return false;
    // A returned artifact still has a dedicated niche and can be placed there
    // manually. If the player walks straight to another numbered door, file it
    // automatically instead of silently disabling every door in the corridor.
    return this.ctx.openDirection(id);
  }

  enter(snapshot) {
    this._applyStandSide(snapshot.corridor.guideStandSide);
    this._syncArtifacts();
    this.gauntlet.enter(snapshot);
  }

  update(dt, snapshot) {
    const player = this.ctx.controller.position;

    if (snapshot.phase === 'collapse') {
      this.gauntlet.update(dt, snapshot);
      return;
    }

    if (this._inZone(player, this._lobbyReturnZone)) this.ctx.goBackToLobby();

    // Doorways no longer auto-open on collision. Facing Door 4 displays the
    // interaction prompt; E / Enter is the sole way into the Labyrinth.
    this._doorwayDirection = directionAtDoorway(player);
    this.ctx.interaction.setFallback(
      this._doorwayDirection === CHAPTER05_DIRECTIONS.LABYRINTH
        ? `direction-${CHAPTER05_DIRECTIONS.LABYRINTH}`
        : null,
    );
    if (this.labyrinthInteractPoint) {
      const pulse = 1 + Math.sin(performance.now() / 220) * 0.12;
      this.labyrinthInteractPoint.scale.setScalar(pulse);
      this.labyrinthInteractPoint.visible = snapshot.phase === 'corridor'
        && this._doorwayDirection === CHAPTER05_DIRECTIONS.LABYRINTH;
    }
    const time = performance.now() / 1000;
    for (const niche of this.artifactNiches.values()) {
      if (niche.displayed) animateReturnArtifact(niche.artifact, time);
    }
  }

  exit() {
    this.ctx.interaction.setFallback(null);
  }

  dispose() {
    this.root.clear();
  }
}
