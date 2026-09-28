// Beat 2 — the archive corridor and the collapse gauntlet.
//
//   north wall (left walking east): three FILED CLAIM cabinets (x 14/22/30,
//     the archive's one clean answer, each a readable card), then Door 4 —
//     THE LABYRINTH (x 38), the only door that opens;
//   south wall (right): the four chapter cases, Chapter 1 → 4 (x 14/22/30/38);
//   east wall (x 42): the Final Archive door with the Labyrinth's eight keyholes.
//
// Layout: x ∈ [8, 42], z ∈ [-2, 2], ceiling 3.2. Entrance from lobby at x=8.

import * as THREE from 'three';
import { mat, emissiveMat, box, plane, label, fluorescentFixture, glassMat, hitProxy } from '../util/graybox.js';
import { createMuseumMaterialLibrary } from '../assets/MuseumMaterials.js';
import { addAcousticCeilingGrid, createPublicBench, createWallRadiator } from '../assets/MuseumProps.js';
import { CHAPTER05_DIRECTIONS, isDirectionPlayable } from '../directions/directionRegistry.js';
import { directionAtDoorway } from '../directions/directionDoorways.js';
import { animateChapterCaseObject, createChapterCaseObject } from '../assets/ChapterCaseObjects.js';
import { CHAPTER_EXHIBIT_ORDER, FILED_CLAIMS, MUSEUM_DATE, chapterExhibit, exhibitCard } from '../data/chapterExhibitCatalog.js';
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

    // ---- three filed claims, then Door 4 — the Labyrinth. ----
    this.filedCases = FILED_CLAIMS.map((claim, index) => this._filedCase(g, { x: 14 + index * 8, claim }));
    this.labyrinthScreen = this._numberedDoor(g, {
      x: 38,
      id: 'labyrinth',
      number: '4',
      screenColor: 0x21131a,
    });

    // The whole journey is already catalogued: Chapter 1 → 4 walking east.
    this.artifactNiches = new Map();
    CHAPTER_EXHIBIT_ORDER.forEach((id, index) => {
      this.artifactNiches.set(id, this._artifactNiche(g, { id, x: 14 + index * 8 }));
    });
    label(g, `CLAIM 1978-0412\nFILED ${MUSEUM_DATE}`, {
      x: 10.6, y: 2.66, z: 1.81, w: 3.4, h: 0.62,
      fg: '#d8caa5', bg: '#171a18', font: 'bold 30px Georgia, serif',
      rotationY: Math.PI,
    });

    this.finalDoor = this._finalArchiveDoor(g);

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
    const proxy = hitProxy(g, {
      x, y: 1.35, z: -1.82, w: 2.4, h: 2.3, d: 0.12,
      name: `${id}-interaction-proxy`,
    });
    proxy.userData.tagAnchor = 0.97; // over the door panel, above the numeral frame
    return proxy;
  }

  // A former sealed shutter, now a glass-fronted filing cabinet: drawers of
  // index cards and one claim card propped behind the glass. E reads it.
  _filedCase(g, { x, claim }) {
    const group = new THREE.Group();
    group.name = `${claim.id}-filed-case`;
    group.position.set(x, 0, -1.8);
    g.add(group);
    const m = this.materials;
    // close the old doorway behind it: this bay no longer leads anywhere
    box(g, { x, y: 1.25, z: -2, w: 2.02, h: 2.5, d: 0.3, material: m.wallDark, name: `${claim.id}-bay-infill-wall`, collide: true, collisionWorld: this.ctx.collisionWorld });
    box(group, { x: 0, y: 0.62, z: 0, w: 1.72, h: 1.24, d: 0.34, material: m.walnutDark, name: `${claim.id}-cabinet` });
    this.ctx.collisionWorld.addBoxFromCenterSize(x, -1.8, 1.72, 0.34, `${claim.id}-cabinet`);
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        const dx = (col - 1) * 0.54;
        const dy = 0.22 + row * 0.34;
        box(group, { x: dx, y: dy, z: 0.172, w: 0.5, h: 0.3, d: 0.02, material: m.walnut, name: `${claim.id}-drawer` });
        box(group, { x: dx, y: dy + 0.07, z: 0.186, w: 0.16, h: 0.028, d: 0.02, material: m.brass, name: `${claim.id}-drawer-pull` });
        label(group, '1978-0412', { x: dx, y: dy - 0.05, z: 0.184, w: 0.22, h: 0.07, fg: '#2a1d14', bg: '#e6dcc2', font: 'bold 44px "Courier New", monospace' });
      }
    }
    // the vitrine on top, holding the claim card
    box(group, { x: 0, y: 1.26, z: 0, w: 1.8, h: 0.05, d: 0.4, material: m.brass, name: `${claim.id}-cap` });
    box(group, { x: 0, y: 1.72, z: 0.02, w: 1.7, h: 0.86, d: 0.02, material: emissiveMat(0x0c0b09, 0.2), name: `${claim.id}-back` });
    box(group, { x: 0, y: 1.72, z: 0.19, w: 1.74, h: 0.9, d: 0.012, material: glassMat(), name: `${claim.id}-glass` });
    const card = label(group, `${claim.title}\n${claim.stamp}`, {
      x: 0, y: 1.74, z: 0.06, w: 1.3, h: 0.46,
      fg: '#2a1d14', bg: '#efe4cc', font: 'bold 30px Georgia, serif',
    });
    card.rotation.x = -0.05;
    const punch = new THREE.Mesh(new THREE.CircleGeometry(0.03, 16), new THREE.MeshBasicMaterial({ color: 0x050403 }));
    punch.position.set(0.56, 1.9, 0.064);
    group.add(punch);
    const light = new THREE.PointLight(0xffd7a1, 1.2, 2.4, 2);
    light.position.set(0, 2.1, 0.4);
    group.add(light);
    const proxy = hitProxy(group, { x: 0, y: 1.2, z: 0.24, w: 1.8, h: 2.1, d: 0.1, name: `${claim.id}-interaction-proxy` });
    proxy.userData.tagAnchor = 1; // above the vitrine, never on the claim card
    return { id: claim.id, claim, group, proxy };
  }

  _artifactNiche(g, { id, x }) {
    const exhibit = chapterExhibit(id);
    const group = new THREE.Group();
    group.name = `${id}-chapter-case`;
    group.position.set(x, 0, 1.86);
    g.add(group);
    box(group, { x: 0, y: 1.42, z: 0.07, w: 2.25, h: 1.54, d: 0.16, material: this.materials.walnutDark, name: `${id}-niche-frame` });
    box(group, { x: 0, y: 1.42, z: -0.03, w: 2.02, h: 1.30, d: 0.08, material: emissiveMat(0x080a0b, 0.2), name: `${id}-niche-back` });
    const glass = box(group, { x: 0, y: 1.42, z: -0.24, w: 2.07, h: 1.34, d: 0.012, material: glassMat(), name: `${id}-niche-glass` });
    const artifact = createChapterCaseObject(id);
    artifact.position.set(0, 1.46, -0.14);
    artifact.scale.multiplyScalar(1.45);
    artifact.rotation.y = Math.PI;
    artifact.visible = true;
    group.add(artifact);
    const light = new THREE.PointLight(0xffd7a1, 1.8, 3.4, 2);
    light.position.set(0, 1.6, -0.55);
    group.add(light);
    const proxy = hitProxy(group, { x: 0, y: 1.42, z: -0.32, w: 2.25, h: 1.54, d: 0.12, name: `${id}-niche-interaction-proxy` });
    // the cases hang on the south wall: their labels face north, into the corridor
    label(group, `${exhibit.chapter} · ${exhibit.title}\n${exhibit.object}`, {
      x: 0, y: 0.54, z: -0.255, w: 2.05, h: 0.36, rotationY: Math.PI,
      fg: '#eee4cb', bg: '#090b0c', font: 'bold 25px Georgia, serif',
    });
    // the accession plate sits under the chapter label, leaving the case's
    // top edge to the interaction tag
    label(group, exhibit.accession, {
      x: 0, y: 0.25, z: -0.255, w: 1.18, h: 0.16, rotationY: Math.PI,
      fg: '#c9b681', bg: '#15120d', font: 'bold 26px Georgia, serif',
    });
    proxy.userData.tagAnchor = 1; // on the case's top edge, clear of every label
    return { group, artifact, exhibit, light, glass, proxy, displayed: true, shattered: false };
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

  // Re-registered by Museum3DApp each time this space becomes active.
  registerInteractions() {
    const { interaction, model, directionProgress } = this.ctx;
    const labyrinthDone = () => directionProgress.getSnapshot().completed[CHAPTER05_DIRECTIONS.LABYRINTH];
    interaction.register(`direction-${CHAPTER05_DIRECTIONS.LABYRINTH}`, {
      mesh: this.labyrinthScreen,
      enabled: () => model.getSnapshot().phase === 'corridor',
      prompt: () => (labyrinthDone() ? 'DOOR 4 · EIGHT KEYS FILED' : 'E · ENTER DOOR 4 — THE LABYRINTH'),
      action: () => {
        if (labyrinthDone()) {
          this.ctx.dialogue.play([{ speaker: null, text: 'Door 4 is filed. You carry its eight keys.' }]);
          return;
        }
        this._enterDirection(CHAPTER05_DIRECTIONS.LABYRINTH);
      },
    });
    for (const [id, niche] of this.artifactNiches) {
      interaction.register(`chapter-case-${id}`, {
        mesh: niche.proxy,
        enabled: () => model.getSnapshot().phase === 'corridor',
        prompt: 'E · READ THE ACCESSION CARD',
        action: () => this.ctx.showCard(exhibitCard(niche.exhibit)),
      });
    }
    for (const filed of this.filedCases) {
      interaction.register(`filed-claim-${filed.id}`, {
        mesh: filed.proxy,
        enabled: () => model.getSnapshot().phase === 'corridor',
        prompt: 'E · READ THE FILED CLAIM',
        action: () => this.ctx.showCard(filed.claim),
      });
    }
    interaction.register('final-archive-door', {
      mesh: this.finalDoor.proxy,
      enabled: () => ['corridor', 'collapse'].includes(model.getSnapshot().phase)
        && this.ctx.controller.position.x >= 39.15,
      prompt: () => {
        const state = model.getSnapshot();
        if (state.phase !== 'collapse') return 'E · INSPECT THE EIGHT KEYHOLES';
        if (state.collapse.doorOpen) return COLLAPSE_STRINGS.promptJump;
        return `${COLLAPSE_STRINGS.promptSlotKey} · ${state.collapse.keysSlotted} / 8`;
      },
      action: () => {
        const state = model.getSnapshot();
        if (state.phase !== 'collapse') this.ctx.dialogue.play([{ speaker: null, text: COLLAPSE_STRINGS.exitDoorSealedNote }]);
        else if (state.collapse.doorOpen) {
          this.ctx.controller.setPose(41.28, this.ctx.controller.position.z, -Math.PI / 2);
        }
      },
    });
  }

  _inZone(pos, zone) {
    return pos.x >= zone.minX && pos.x <= zone.maxX && pos.z >= zone.minZ && pos.z <= zone.maxZ;
  }

  _enterDirection(id) {
    if (!isDirectionPlayable(id)) return false;
    return this.ctx.openDirection(id);
  }

  enter(snapshot) {
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
    const time = performance.now() / 1000;
    for (const niche of this.artifactNiches.values()) {
      if (!niche.shattered) animateChapterCaseObject(niche.artifact, time);
    }
  }

  exit() {
    this.ctx.interaction.setFallback(null);
  }

  dispose() {
    this.root.clear();
  }
}
