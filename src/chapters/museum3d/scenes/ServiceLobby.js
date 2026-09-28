// Beat 1 (the service hall, Room 101) and Beat 4 (the lost desk).
// One room, two variants, driven entirely by the narrative snapshot.
//
// Layout (meters): x ∈ [-8, 8], z ∈ [-6, 6], ceiling 3.4.
//   - player entry: west side, facing the room
//   - service desk: south wall (z ≈ +5), normal variant
//   - central glass case (1.5, 0): OBJECT PENDING CLASSIFICATION — four
//     pieces of evidence and an empty plinth. E opens the one-answer exhibit
//     (one-answer.html, framed like the Labyrinth). Solving it reclassifies
//     the service desk: it reappears inside the case with the register open
//     at BUTCH, and the telephone rings.
//   - the Black Ticket stone: small, quiet, behind the pigment vials in the
//     case's south-east corner, reached with the fire axe
//   - archive corridor door: east wall (x = +8)

import * as THREE from 'three';
import { COLORS } from '../config.js';
import { mat, box, plane, label, fluorescentFixture, displayCase, glassMat, hitProxy } from '../util/graybox.js';
import { RoomReclassification } from '../systems/RoomReclassification.js';
import { createMuseumMaterialLibrary } from '../assets/MuseumMaterials.js';
import { loadMuseumModel } from '../assets/MuseumModelLoader.js';
import { createChapterCaseObject } from '../assets/ChapterCaseObjects.js';
import { MUSEUM_ACCESSION, MUSEUM_DATE } from '../data/chapterExhibitCatalog.js';
import { CHAPTER05_DIRECTIONS } from '../directions/directionRegistry.js';
import { magicStoneSnapshot, offerMagicStone } from '../../../shell/magicStones.js';
import {
  addAcousticCeilingGrid,
  createGuidePedestal,
  createPublicBench,
  createServiceDesk,
  createWallRadiator,
  createWasteBin,
} from '../assets/MuseumProps.js';

const WALL_H = 3.4;
const WALL_T = 0.3;

// The Archivist's guide lines: one useful sentence each, keyed to what is
// still left to do.
export const LOBBY_GUIDE_LINES = Object.freeze({
  welcome: [
    'Welcome to the Museum of One Answer. Your journey has already been filed.',
    'One object is still pending, in the case before you. One door remains open.',
  ],
  exhibitDone: ['The desk is evidence now. One door remains open, at the end of the wing.'],
  labyrinthDone: ['One object is still pending, here in Room 101.'],
  bothDone: ['This wing is being withdrawn.'],
});

export const HOUSE_RULES_CARD = Object.freeze({
  stamp: 'THE MUSEUM OF ONE ANSWER',
  title: 'HOUSE RULES',
  lines: ['Every object has one answer.', 'Contradictions are filed as errors.', 'The archive does not issue duplicates.'],
});

export const REGISTER_CARD = Object.freeze({
  stamp: `VISITOR REGISTER · ${MUSEUM_DATE}`,
  title: 'LAST ENTRY — BUTCH',
  lines: ['Lost property, night service.', 'Purpose of visit: return one case.'],
});

// Case-local layout of the pending exhibit (the case is 5.4 × 2.8).
const EVIDENCE_LAYOUT = Object.freeze([
  Object.freeze({ id: 'borrowed-light', x: -1.95, z: -0.42 }),
  Object.freeze({ id: 'echo-city', x: -0.95, z: -0.42 }),
  Object.freeze({ id: 'night-service', x: -1.95, z: 0.5 }),
  Object.freeze({ id: 'painted-country', x: -0.95, z: 0.5 }),
]);
export const BLACK_TICKET_STONE = Object.freeze({ x: 2.3, y: 1.105, z: 0.66, radius: 0.045 });
const PIGMENT_VIALS = Object.freeze({ x: 2.28, z: 0.9 });

export class ServiceLobby {
  constructor() {
    this.name = 'lobby';
    this.root = new THREE.Group();
    this.root.name = 'service-lobby';
    this.background = new THREE.Color(0x14120e);
  }

  build(ctx) {
    this.ctx = ctx;
    const { collisionWorld } = ctx;
    const g = this.root;
    this.materials = createMuseumMaterialLibrary();

    // ---- shell -------------------------------------------------------------
    plane(g, { x: 0, z: 0, w: 16, h: 12, material: this.materials.carpet, name: 'floor' });
    plane(g, { x: 0, y: 0.005, z: 0, w: 16, h: 2.2, material: this.materials.carpetLane, name: 'lane-x' });
    plane(g, { x: -5.5, y: 0.005, z: 0, w: 2.2, h: 12, material: this.materials.carpetLane, name: 'lane-z' });
    plane(g, { x: 0, y: WALL_H, z: 0, w: 16, h: 12, material: this.materials.ceilingTile, rotationX: Math.PI / 2, name: 'ceiling' });
    addAcousticCeilingGrid(g, { width: 16, depth: 12, y: WALL_H - 0.012 });

    const wall = this.materials.wall;
    box(g, { x: -8, y: WALL_H / 2, z: 0, w: WALL_T, h: WALL_H, d: 12, material: wall, name: 'wall-west', collide: true, collisionWorld });
    box(g, { x: 0, y: WALL_H / 2, z: -6, w: 16.6, h: WALL_H, d: WALL_T, material: wall, name: 'wall-north', collide: true, collisionWorld });
    box(g, { x: 8, y: WALL_H / 2, z: -3.55, w: WALL_T, h: WALL_H, d: 4.9, material: wall, name: 'wall-east-n', collide: true, collisionWorld });
    box(g, { x: 8, y: WALL_H / 2, z: 3.55, w: WALL_T, h: WALL_H, d: 4.9, material: wall, name: 'wall-east-s', collide: true, collisionWorld });
    box(g, { x: 8, y: 2.95, z: 0, w: WALL_T, h: 0.9, d: 2.2, material: wall, name: 'wall-east-lintel' });
    // The south wall stays solid in both variants: the reclassified desk
    // leaves only its worn footprint behind, not a corridor to nowhere.
    box(g, { x: 0, y: WALL_H / 2, z: 6, w: 16.6, h: WALL_H, d: WALL_T, material: wall, name: 'wall-south', collide: true, collisionWorld });

    const dado = this.materials.oliveSteel;
    const lower = this.materials.wall;
    box(g, { x: 0, y: 0.63, z: -5.82, w: 15.7, h: 1.08, d: 0.05, material: lower, name: 'wainscot-north' });
    box(g, { x: 0, y: 0.18, z: -5.86, w: 15.7, h: 0.22, d: 0.08, material: dado, name: 'baseboard-north' });
    box(g, { x: 0, y: 1.18, z: -5.86, w: 15.7, h: 0.09, d: 0.07, material: dado, name: 'chair-rail-north' });
    box(g, { x: -7.82, y: 0.63, z: 0, w: 0.05, h: 1.08, d: 11.55, material: lower, name: 'wainscot-west' });
    box(g, { x: -7.86, y: 0.18, z: 0, w: 0.08, h: 0.22, d: 11.55, material: dado, name: 'baseboard-west' });
    box(g, { x: -7.86, y: 1.18, z: 0, w: 0.08, h: 0.09, d: 11.55, material: dado, name: 'chair-rail-west' });
    for (const [z, id] of [[-3.55, 'north'], [3.55, 'south']]) {
      box(g, { x: 7.82, y: 0.63, z, w: 0.05, h: 1.08, d: 4.55, material: lower, name: `wainscot-east-${id}` });
      box(g, { x: 7.86, y: 0.18, z, w: 0.08, h: 0.22, d: 4.55, material: dado, name: `baseboard-east-${id}` });
      box(g, { x: 7.86, y: 1.18, z, w: 0.08, h: 0.09, d: 4.55, material: dado, name: `chair-rail-east-${id}` });
    }
    box(g, { x: 0, y: 0.63, z: 5.82, w: 15.7, h: 1.08, d: 0.05, material: lower, name: 'wainscot-south' });
    box(g, { x: 0, y: 0.18, z: 5.86, w: 15.7, h: 0.22, d: 0.08, material: dado, name: 'baseboard-south' });
    box(g, { x: 0, y: 1.18, z: 5.86, w: 15.7, h: 0.09, d: 0.07, material: dado, name: 'chair-rail-south' });

    for (const fx of [-4, 0, 4]) fluorescentFixture(g, { x: fx, z: 0, ceilingY: WALL_H, length: 3.2 });

    // signage — one date, one claim
    label(g, 'ROOM 101 — SERVICE HALL', { x: -7.8, y: 2.3, z: 0, w: 2.4, h: 0.5, rotationY: Math.PI / 2 });
    label(g, 'ARCHIVE WING →', { x: 7.8, y: 2.4, z: -2.2, w: 2.0, h: 0.45, rotationY: -Math.PI / 2 });
    label(g, `THE MUSEUM OF ONE ANSWER\nCLAIM 1978-0412 · ${MUSEUM_DATE}`, { x: 0, y: 2.5, z: -5.8, w: 4.2, h: 0.9 });

    const waitingBench = createPublicBench(this.materials);
    waitingBench.position.set(-5.8, 0, 4.9);
    waitingBench.rotation.y = Math.PI;
    g.add(waitingBench);
    collisionWorld.addBoxFromCenterSize(-5.8, 4.9, 1.75, 0.52, 'lobby-waiting-bench');
    const lobbyRadiator = createWallRadiator(this.materials, { width: 1.65 });
    lobbyRadiator.position.set(5.5, 0, -5.72);
    g.add(lobbyRadiator);
    const wasteBin = createWasteBin(this.materials);
    wasteBin.position.set(-7.2, 0, 4.8);
    g.add(wasteBin);

    this._buildHouseRules(g);
    this._buildPendingExhibit(g);
    this._buildLobbyEvidence();

    // guide receiver stand
    this.guideStand = new THREE.Group();
    this.guideStand.position.set(-4.5, 0, -3);
    g.add(this.guideStand);
    const guideAssembly = createGuidePedestal(this.materials);
    this.guideStand.add(guideAssembly.group);
    hitProxy(this.guideStand, { x: 0, y: 1.2, z: 0, w: 0.8, h: 0.9, d: 0.8, name: 'guide-proxy' });
    label(this.guideStand, 'AUDIO GUIDE', { x: 0, y: 0.75, z: 0.27, w: 0.5, h: 0.18 });

    // ---- normal variant: service desk at the south wall --------------------
    this.normalGroup = new THREE.Group();
    this.normalGroup.name = 'lobby-normal';
    g.add(this.normalGroup);
    this.deskGroup = this._buildDesk();
    this.deskGroup.position.set(0, 0, 5.0);
    this.normalGroup.add(this.deskGroup);
    this.ticketMesh = box(this.deskGroup, {
      x: -0.6, y: 1.14, z: -0.1, w: 0.22, h: 0.015, d: 0.1,
      material: mat(COLORS.paper), name: 'punched-ticket',
    });
    this.ticketProxy = hitProxy(this.deskGroup, { x: -0.6, y: 1.2, z: -0.1, w: 0.7, h: 0.45, d: 0.6, name: 'ticket-proxy' });

    // corridor glass doors (open once the ticket is carried)
    this.corridorDoors = new THREE.Group();
    this.corridorDoors.position.set(8, 0, 0);
    g.add(this.corridorDoors);
    const doorMat = glassMat();
    this.doorL = box(this.corridorDoors, { x: 0, y: 1.25, z: -0.55, w: 0.06, h: 2.5, d: 1.1, material: doorMat, name: 'door-l' });
    this.doorR = box(this.corridorDoors, { x: 0, y: 1.25, z: 0.55, w: 0.06, h: 2.5, d: 1.1, material: doorMat, name: 'door-r' });

    // ---- reclassified variant: the lost desk --------------------------------
    this.reclassifiedGroup = new THREE.Group();
    this.reclassifiedGroup.name = 'lobby-reclassified';
    g.add(this.reclassifiedGroup);
    this.casedDesk = this._buildDesk({ exhibit: true });
    this.casedDesk.position.set(1.5, 1.0, 0);
    this.casedDesk.rotation.y = Math.PI;
    this.reclassifiedGroup.add(this.casedDesk);
    this.casedDeskProxy = hitProxy(this.reclassifiedGroup, { x: 1.5, y: 1.55, z: 0, w: 4.4, h: 1.1, d: 1.4, name: 'cased-desk-register-proxy' });
    // The register itself lies above eye height on the plinth, so the case
    // label says what it is open at, on both faces the player approaches.
    const deskLabel = 'SERVICE DESK · ACC. 1978-0412 · 5\nREGISTER — LAST ENTRY: BUTCH';
    label(this.reclassifiedGroup, deskLabel, {
      x: 1.5, y: 0.55, z: 1.415, w: 2.25, h: 0.5, font: 'bold 25px Georgia, serif',
    });
    label(this.reclassifiedGroup, deskLabel, {
      x: -1.23, y: 0.55, z: 0, w: 2.25, h: 0.5, rotationY: -Math.PI / 2, font: 'bold 25px Georgia, serif',
    });
    // the desk's worn footprint on the carpet where it stood
    plane(this.reclassifiedGroup, {
      x: 0, y: 0.01, z: 5.0, w: 4.4, h: 1.2,
      material: mat(0x4e4438), name: 'desk-footprint-wear',
    });

    // ---- lights --------------------------------------------------------------
    g.add(new THREE.HemisphereLight(0xfff0d2, 0x40392f, 0.58));
    for (const fx of [-4, 0, 4]) {
      const fluorescent = new THREE.RectAreaLight(0xffedc4, 3.2, 0.48, 3.0);
      fluorescent.position.set(fx, WALL_H - 0.13, 0);
      fluorescent.rotation.x = -Math.PI / 2;
      g.add(fluorescent);
    }
    const key = new THREE.DirectionalLight(0xffe6bd, 1.65);
    key.position.set(-3.5, 7.5, 4.5);
    key.target.position.set(1.2, 0, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -10;
    key.shadow.camera.right = 10;
    key.shadow.camera.top = 8;
    key.shadow.camera.bottom = -8;
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 18;
    key.shadow.bias = -0.00025;
    key.shadow.normalBias = 0.035;
    g.add(key, key.target);
    // the reclassified desk lamp — the one important dynamic light in here
    this.deskLampLight = new THREE.PointLight(0xffe9b8, 0, 5, 1.8);
    this.deskLampLight.position.set(1.1, 2.2, 0.2);
    g.add(this.deskLampLight);

    this.reclassification = new RoomReclassification({
      normalGroup: this.normalGroup,
      reclassifiedGroup: this.reclassifiedGroup,
      collisionWorld,
      registerColliders: (variant) => this._registerFurnitureColliders(variant),
    });

    collisionWorld.addBoxFromCenterSize(-4.5, -3, 0.5, 0.5, 'guide-stand');
    this._corridorZone = { minX: 7.0, maxX: 8.2, minZ: -1.1, maxZ: 1.1 };
    this._phoneTimer = 0;
    this._welcomePlayed = false;

    g.traverse((object) => {
      if (!object.isMesh) return;
      object.receiveShadow = true;
      object.castShadow = !/(wall|floor|ceiling|lane|glass|tube)/i.test(object.name);
    });
  }

  _buildDesk({ exhibit = false } = {}) {
    const model = createServiceDesk(this.materials, { exhibit });
    this._installTelephone(model.phone, { exhibit });
    if (exhibit) {
      this._handset = model.handset;
      label(model.register, 'BUTCH', { x: 0.11, y: 0.035, z: 0, w: 0.2, h: 0.1, rotationY: 0 })
        .rotation.x = -Math.PI / 2;
    }
    return model.group;
  }

  // The small wall case by the entry: the museum's house rules, read as a card.
  _buildHouseRules(g) {
    const rulesCase = displayCase(g, { x: -5.5, z: -5.2, w: 1.6, d: 1.0, name: 'house-rules-case', collisionWorld: this.ctx.collisionWorld });
    const plaque = label(rulesCase, 'HOUSE RULES\nONE OBJECT · ONE ANSWER', {
      x: 0, y: 1.32, z: 0, w: 1.2, h: 0.5,
      fg: '#2a1d14', bg: '#efe4cc', font: 'bold 34px Georgia, serif',
    });
    plaque.rotation.x = -0.5;
    label(rulesCase, 'THE MUSEUM OF ONE ANSWER', {
      x: 0, y: 0.88, z: 0.515, w: 1.34, h: 0.2,
      fg: '#e6ddc5', bg: '#17140f', font: 'bold 25px Georgia, serif',
    });
    this.houseRulesProxy = hitProxy(rulesCase, { x: 0, y: 1.35, z: 0.5, w: 1.5, h: 1.5, d: 0.2, name: 'house-rules-proxy' });
  }

  // The central case before the reveal: four filed objects, an empty plinth,
  // and the accession the whole chapter is about.
  _buildPendingExhibit(g) {
    this.centralCase = displayCase(g, {
      x: 1.5, z: 0, w: 5.4, d: 2.8, plinthH: 1.0, glassH: 1.9,
      name: 'central-case',
    });
    this.centralCaseColliderSize = { x: 1.5, z: 0, w: 5.4, d: 2.8 };
    this.pendingExhibit = new THREE.Group();
    this.pendingExhibit.name = 'object-pending-classification';
    this.centralCase.add(this.pendingExhibit);
    this.pendingEvidence = EVIDENCE_LAYOUT.map(({ id, x, z }) => {
      const object = createChapterCaseObject(id, { small: true });
      object.position.set(x, 1.24, z);
      object.rotation.x = -0.72;
      this.pendingExhibit.add(object);
      return object;
    });
    // the empty plinth: the slot the museum saved for its one answer
    const walnut = this.materials.walnutDark;
    box(this.pendingExhibit, { x: 0.95, y: 1.13, z: 0, w: 1.1, h: 0.12, d: 0.8, material: walnut, name: 'pending-plinth' });
    const tent = label(this.pendingExhibit, 'OBJECT PENDING\nCLASSIFICATION', {
      x: 0.95, y: 1.34, z: 0.18, w: 0.78, h: 0.3,
      fg: '#2a1d14', bg: '#efe4cc', font: 'bold 44px Georgia, serif',
    });
    tent.rotation.x = -0.45;
    this.pendingLabel = label(g, `OBJECT PENDING CLASSIFICATION\n${MUSEUM_ACCESSION}`, {
      x: -1.23, y: 0.55, z: 0, w: 2.25, h: 0.5, rotationY: -Math.PI / 2,
      font: 'bold 25px Georgia, serif',
    });
    this.pendingLabelSouth = label(g, `OBJECT PENDING CLASSIFICATION\n${MUSEUM_ACCESSION}`, {
      x: 1.5, y: 0.55, z: 1.415, w: 2.25, h: 0.5,
      font: 'bold 25px Georgia, serif',
    });
    // The case answers E, plinth and glass alike — all but its south-east
    // corner, where the pigment vials (and what hides behind them) keep
    // their own click.
    this.pendingProxy = hitProxy(this.centralCase, { x: -0.43, y: 1.2, z: 0, w: 4.6, h: 2.2, d: 2.86, name: 'pending-exhibit-proxy' });
  }

  _buildLobbyEvidence() {
    // The axe is emergency hardware: it hangs in a red fire-axe cabinet on
    // the east wall, clear of the ARCHIVE WING placard.
    this.fireAxeEvidence = new THREE.Group();
    this.fireAxeEvidence.name = 'lobby-fire-axe-evidence';
    this.fireAxeEvidence.position.set(7.74, 0, -5.02);
    this.fireAxeEvidence.rotation.y = Math.PI / 2;
    this.root.add(this.fireAxeEvidence);
    const cabinetRed = mat(0xa82222);
    const cabinetInside = mat(0xf0e7d3);
    const axeHead = mat(0xb52d27);
    const axeHandle = mat(0x9d6a3e);
    box(this.fireAxeEvidence, { x: 0, y: 1.28, z: 0, w: 1.02, h: 1.55, d: 0.1, material: cabinetRed, name: 'fire-axe-cabinet' });
    box(this.fireAxeEvidence, { x: 0, y: 1.28, z: -0.062, w: 0.82, h: 1.26, d: 0.018, material: cabinetInside, name: 'fire-axe-cabinet-interior' });
    box(this.fireAxeEvidence, { x: -0.1, y: 1.27, z: -0.09, w: 0.07, h: 1.02, d: 0.055, material: axeHandle, name: 'fire-axe-handle' });
    box(this.fireAxeEvidence, { x: 0.04, y: 1.69, z: -0.095, w: 0.34, h: 0.13, d: 0.07, material: axeHead, name: 'fire-axe-head' });
    box(this.fireAxeEvidence, { x: -0.1, y: 1.75, z: -0.09, w: 0.07, h: 0.2, d: 0.055, material: axeHandle, name: 'fire-axe-neck' });
    label(this.fireAxeEvidence, 'FIRE\nAXE', { x: 0, y: 2.28, z: -0.075, w: 1.22, h: 0.46, rotationY: Math.PI, fg: '#ffffff', bg: '#b72222', font: 'bold 27px "Courier New", monospace' });
    this.fireAxeProxy = hitProxy(this.fireAxeEvidence, { x: 0, y: 1.3, z: -0.17, w: 1.08, h: 1.72, d: 0.18, name: 'fire-axe-evidence-proxy' });
    this.fireAxeTaken = false;

    // The fifth stone — the Black Ticket (code id `black-knife`) — is a small,
    // ordinary dark pebble tucked behind the pigment vials in the case's
    // south-east corner. It is deliberately the quietest object here: no
    // glow, no pulse, smaller than every vial.
    this.blackKnifeCase = this.centralCase;
    this.pigmentVials = this._buildPigmentVials();
    this.pigmentVials.position.set(PIGMENT_VIALS.x, 1.07, PIGMENT_VIALS.z);
    this.blackKnifeCase.add(this.pigmentVials);
    this.blackKnifeStone = new THREE.Mesh(
      new THREE.IcosahedronGeometry(BLACK_TICKET_STONE.radius, 1),
      new THREE.MeshStandardMaterial({ color: 0x3a3632, roughness: 1, metalness: 0, flatShading: true }),
    );
    this.blackKnifeStone.name = 'black-ticket-magic-stone';
    this.blackKnifeStone.position.set(BLACK_TICKET_STONE.x, BLACK_TICKET_STONE.y, BLACK_TICKET_STONE.z);
    this.blackKnifeStone.rotation.z = Math.PI / 4;
    this.blackKnifeStone.scale.set(1.2, 0.7, 1);
    this.blackKnifeCase.add(this.blackKnifeStone);
    this.blackKnifeStoneProxy = hitProxy(this.blackKnifeCase, { x: BLACK_TICKET_STONE.x, y: 1.16, z: BLACK_TICKET_STONE.z + 0.1, w: 0.3, h: 0.3, d: 0.36, name: 'black-ticket-stone-click-proxy' });
    // The player can start the break from anywhere along the visible south side.
    this.blackKnifeBreakProxy = hitProxy(this.blackKnifeCase, { x: 0, y: 1.65, z: 1.46, w: 5.0, h: 1.3, d: 0.1, name: 'black-ticket-long-side-glass-break-proxy' });
    this.blackKnifeLongSideGlass = this.blackKnifeCase.getObjectByName('central-case-glass-front');
    this.blackKnifeGlassBroken = false;
    if (magicStoneSnapshot().collected.includes('black-knife')) this.blackKnifeStone.visible = false;

    this.glassShardEvidence = new THREE.Group();
    this.glassShardEvidence.name = 'black-ticket-case-glass-shards';
    this.glassShardEvidence.position.set(0.14, 0.02, 1.62);
    this.root.add(this.glassShardEvidence);
    const shardMaterial = new THREE.MeshPhysicalMaterial({ color: 0xa9d8d7, transparent: true, opacity: 0.54, roughness: 0.08, metalness: 0.05, side: THREE.DoubleSide });
    for (const [index, [x, z, scale, turn]] of [[0, [-0.42, -0.26, 0.22, 0.3]], [1, [-0.18, 0.12, 0.16, -0.7]], [2, [0.16, -0.18, 0.28, 1.1]], [3, [0.43, 0.18, 0.13, -0.2]], [4, [0.06, 0.38, 0.18, 0.65]]]) {
      const shard = new THREE.Mesh(new THREE.CircleGeometry(scale, 3), shardMaterial);
      shard.name = `glass-shard-${index + 1}`;
      shard.rotation.x = -Math.PI / 2;
      shard.rotation.z = turn;
      shard.position.set(x, 0.008 + index * 0.002, z);
      this.glassShardEvidence.add(shard);
    }
    this.glassShardEvidence.visible = false;

    this.heldFireAxe = new THREE.Group();
    this.heldFireAxe.name = 'held-fire-axe';
    this.heldFireAxe.position.set(0.46, -0.34, -0.78);
    this.heldFireAxe.rotation.set(-0.68, 0.3, -0.16);
    const heldHandle = box(this.heldFireAxe, { y: 0, w: 0.045, h: 0.56, d: 0.045, material: axeHandle, name: 'held-fire-axe-handle' });
    heldHandle.rotation.z = -0.5;
    const heldHead = box(this.heldFireAxe, { x: 0.13, y: 0.2, w: 0.22, h: 0.1, d: 0.06, material: axeHead, name: 'held-fire-axe-head' });
    heldHead.rotation.z = -0.5;
    this.heldFireAxe.visible = false;
    this.ctx.camera.add(this.heldFireAxe);
  }

  // Three glass pigment vials (Chapter 4's colours) with ivory caps.
  _buildPigmentVials() {
    const group = new THREE.Group();
    group.name = 'pigment-vials';
    [[0x435d99, -0.1, 0.0], [0x8a2a1e, 0.0, -0.04], [0x35949a, 0.1, 0.01]].forEach(([color, x, z], index) => {
      const glass = new THREE.MeshStandardMaterial({ color, roughness: 0.25, metalness: 0.05, transparent: true, opacity: 0.88 });
      const h = 0.2 + index * 0.02;
      const vial = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.05, h, 14), glass);
      vial.position.set(x, h / 2, z);
      vial.name = `pigment-vial-${index}`;
      group.add(vial);
      box(group, { x, y: h + 0.016, z, w: 0.06, h: 0.032, d: 0.06, material: mat(0xd5c59f), name: `vial-cap-${index}` });
    });
    return group;
  }

  async _installTelephone(placeholder, { exhibit = false } = {}) {
    try {
      const phone = await loadMuseumModel('telephone', { target: { x: 0.34, y: 0.2, z: 0.25 } });
      phone.position.copy(placeholder.position);
      phone.rotation.y = Math.PI;
      placeholder.parent.add(phone);
      placeholder.visible = false;
      if (exhibit) {
        this._ringingPhone = phone;
        this._ringingPhoneBaseY = phone.position.y;
      }
    } catch (error) {
      console.warn('[museum3d] telephone model unavailable; using fallback', error);
    }
  }

  getCentralDisplayState() {
    return {
      pending: this.pendingExhibit.visible,
      evidence: EVIDENCE_LAYOUT.map(({ id }) => id),
      deskInCase: this.reclassifiedGroup.visible,
      stone: { visible: this.blackKnifeStone.visible, radius: BLACK_TICKET_STONE.radius, behind: 'pigment-vials' },
    };
  }

  _registerFurnitureColliders(variant) {
    const world = this.ctx.collisionWorld;
    world.removeById('service-desk');
    world.removeById('central-case');
    world.removeById('corridor-doors');
    const c = this.centralCaseColliderSize;
    world.addBoxFromCenterSize(c.x, c.z, c.w, c.d, 'central-case');
    if (variant === 'normal') {
      world.addBoxFromCenterSize(0, 5.0, 4, 0.7, 'service-desk');
      if (!this.ctx.model.getSnapshot().ticket.carried) {
        world.addBoxFromCenterSize(8, 0, 0.4, 2.2, 'corridor-doors');
      }
    }
  }

  guideLines(snapshot = this.ctx.model.getSnapshot()) {
    const labyrinth = snapshot.labyrinth?.complete === true;
    const exhibit = snapshot.exhibit?.solved === true;
    if (exhibit && labyrinth) return LOBBY_GUIDE_LINES.bothDone;
    if (exhibit) return LOBBY_GUIDE_LINES.exhibitDone;
    if (labyrinth) return LOBBY_GUIDE_LINES.labyrinthDone;
    return LOBBY_GUIDE_LINES.welcome;
  }

  /** The first time the player takes control in the hall, the guide greets them. */
  playWelcome() {
    if (this._welcomePlayed) return;
    this._welcomePlayed = true;
    this.ctx.audioGuide.sayArchivist(this.guideLines());
  }

  // Re-registered by Museum3DApp each time this space becomes active.
  registerInteractions() {
    const { interaction, model, audioGuide, dialogue } = this.ctx;
    const inLobby = () => ['lobby', 'return'].includes(model.getSnapshot().phase);

    interaction.register('punched-ticket', {
      mesh: this.ticketProxy,
      enabled: () => {
        const s = model.getSnapshot();
        return s.phase === 'lobby' && !s.ticket.carried && !s.lobby.deskReclassified;
      },
      prompt: () => (model.getSnapshot().ticket.inspected ? 'E · CARRY THE PUNCHED TICKET' : 'E · INSPECT THE PUNCHED TICKET'),
      action: () => {
        const s = model.getSnapshot();
        if (!s.ticket.inspected) {
          model.dispatch({ type: 'inspectTicket' });
          dialogue.play([{ speaker: null, text: 'A museum admission ticket, punched once. Claim 1978-0412.' }]);
        } else {
          model.dispatch({ type: 'carryTicket' });
          this.ticketMesh.visible = false;
          dialogue.play([{ speaker: null, text: 'You carry the ticket. The archive wing doors will read it.' }]);
        }
      },
    });

    interaction.register('guide-receiver', {
      mesh: this.guideStand,
      enabled: () => model.getSnapshot().phase === 'lobby',
      prompt: 'E · LISTEN TO THE GUIDE',
      action: () => audioGuide.sayArchivist(this.guideLines()),
    });

    interaction.register('house-rules', {
      mesh: this.houseRulesProxy,
      enabled: inLobby,
      prompt: 'E · READ THE HOUSE RULES',
      action: () => this.ctx.showCard(HOUSE_RULES_CARD),
    });

    interaction.register('pending-exhibit', {
      mesh: this.pendingProxy,
      enabled: () => model.getSnapshot().phase === 'lobby' && !model.getSnapshot().exhibit.solved,
      prompt: 'E · CLASSIFY THE OBJECT',
      action: () => this.ctx.openDirection(CHAPTER05_DIRECTIONS.ONE_ANSWER),
    });

    interaction.register('fire-axe-evidence', {
      mesh: this.fireAxeProxy,
      enabled: () => inLobby() && !this.fireAxeTaken,
      prompt: 'E · TAKE THE FIRE AXE',
      action: () => {
        this.fireAxeTaken = true;
        // Only the removable axe disappears; the cabinet stays, visibly empty.
        this.fireAxeProxy.visible = false;
        this.fireAxeEvidence.getObjectByName('fire-axe-handle').visible = false;
        this.fireAxeEvidence.getObjectByName('fire-axe-head').visible = false;
        this.fireAxeEvidence.getObjectByName('fire-axe-neck').visible = false;
        this.heldFireAxe.visible = true;
        dialogue.play([{ speaker: null, text: 'The axe is still sharp. The long south pane of the central case would give.' }]);
      },
    });

    interaction.register('black-ticket-long-side-glass', {
      mesh: this.blackKnifeBreakProxy,
      enabled: () => inLobby()
        && !magicStoneSnapshot().collected.includes('black-knife')
        && this.fireAxeTaken && !this.blackKnifeGlassBroken,
      prompt: 'E · BREAK THE SOUTH PANE',
      showWhenInactive: true,
      action: () => this.tryBreakBlackKnifeGlass(),
    });

    interaction.register('black-ticket-stone', {
      mesh: this.blackKnifeStoneProxy,
      enabled: () => inLobby()
        && this.blackKnifeGlassBroken && !magicStoneSnapshot().collected.includes('black-knife')
        && !this._claimingBlackKnifeStone,
      prompt: 'CLICK · TAKE THE SMALL DARK STONE',
      pointerOnly: true,
      showWhenInactive: true,
      action: async () => {
        this._claimingBlackKnifeStone = true;
        const taken = await offerMagicStone('black-knife');
        this._claimingBlackKnifeStone = false;
        if (!taken) return;
        this.blackKnifeStone.visible = false;
        dialogue.play([{ speaker: null, text: 'The stone is cold, and lighter than it looks.' }]);
      },
    });

    interaction.register('cased-desk-register', {
      mesh: this.casedDeskProxy,
      enabled: () => model.getSnapshot().lobby.deskReclassified,
      prompt: 'E · READ THE OPEN REGISTER',
      action: () => this.ctx.showCard(REGISTER_CARD, {
        onClose: () => dialogue.play([{ speaker: null, text: 'The telephone keeps ringing. No one is coming to answer it.' }]),
      }),
    });
  }

  enter(snapshot) {
    const variant = this.reclassification.apply(snapshot);
    this.pendingExhibit.visible = variant === 'normal';
    this.pendingLabel.visible = variant === 'normal';
    this.pendingLabelSouth.visible = variant === 'normal';
    this.ticketMesh.visible = !snapshot.ticket.carried && variant === 'normal';
    if (variant === 'reclassified') {
      this.deskLampLight.intensity = 9;
      this._phoneTimer = Math.min(this._phoneTimer || 1.2, 1.2);
    } else {
      this.deskLampLight.intensity = 0;
    }
    this._syncCorridorDoors(snapshot);
  }

  _syncCorridorDoors(snapshot) {
    const open = snapshot.ticket.carried || snapshot.lobby.deskReclassified;
    this.corridorDoors.visible = !open;
    if (open) this.ctx.collisionWorld.removeById('corridor-doors');
  }

  _inZone(pos, zone) {
    return pos.x >= zone.minX && pos.x <= zone.maxX && pos.z >= zone.minZ && pos.z <= zone.maxZ;
  }

  canBreakBlackKnifeGlass() {
    const player = this.ctx.controller.position;
    return this.fireAxeTaken
      && !this.blackKnifeGlassBroken
      && ['lobby', 'return'].includes(this.ctx.model.getSnapshot().phase)
      && player.x >= -1.25 && player.x <= 4.25
      && player.z >= 1.25 && player.z <= 3.25;
  }

  canReachBlackKnifeStone() {
    const player = this.ctx.controller.position;
    return this.blackKnifeGlassBroken
      && ['lobby', 'return'].includes(this.ctx.model.getSnapshot().phase)
      && player.x >= 1.75 && player.x <= 5.0
      && player.z >= 1.25 && player.z <= 3.25;
  }

  tryBreakBlackKnifeGlass() {
    if (!this.canBreakBlackKnifeGlass()) return false;
    this.blackKnifeGlassBroken = true;
    this.blackKnifeLongSideGlass.visible = false;
    this.glassShardEvidence.visible = true;
    this.putAxeAway();
    this.ctx.dialogue.play([{ speaker: null, text: 'The south pane gives. You set the axe down among the glass.' }]);
    return true;
  }

  /** Once used, or on leaving the hall, the axe is no longer in Butch's hand. */
  putAxeAway() {
    this.heldFireAxe.visible = false;
  }

  update(dt, snapshot) {
    const player = this.ctx.controller.position;

    // Proximity supplies the break / take prompt along the case's south
    // side: a centre-reticle ray through transparent panes is unreliable at
    // arm's length. Collecting the stone still requires a deliberate click
    // (the stone is pointerOnly: E never takes it), and the tag's CLICK
    // works from anywhere within reach, not only dead on the hidden stone.
    const atBlackKnifeLongSide = this.canBreakBlackKnifeGlass();
    const atExposedStone = this.canReachBlackKnifeStone() && !magicStoneSnapshot().collected.includes('black-knife');
    this.ctx.interaction.setFallback(
      this.fireAxeTaken && !this.blackKnifeGlassBroken && atBlackKnifeLongSide
        ? 'black-ticket-long-side-glass'
        : this.blackKnifeGlassBroken && atExposedStone
          ? 'black-ticket-stone'
          : null,
    );

    if (snapshot.phase === 'lobby' && snapshot.ticket.carried && this._inZone(player, this._corridorZone)) {
      this.ctx.goToCorridor();
    }

    // the lost desk: its telephone keeps ringing
    if (snapshot.lobby.deskReclassified) {
      this._phoneTimer -= dt;
      if (this._phoneTimer <= 0) {
        this._phoneTimer = 6;
        this.ctx.audioGuide.phoneRing();
      }
      const pulse = (Math.sin(performance.now() * 0.02) + 1) / 2;
      if (this._ringingPhone) this._ringingPhone.position.y = this._ringingPhoneBaseY + pulse * 0.012;
      else if (this._handset) this._handset.position.y = 0.17 + pulse * 0.012;
    }
  }

  exit() {
    // An unused axe goes back in its cabinet: it never follows Butch into
    // the corridor or the collapse.
    if (this.fireAxeTaken && !this.blackKnifeGlassBroken) {
      this.fireAxeTaken = false;
      this.fireAxeProxy.visible = true;
      for (const part of ['fire-axe-handle', 'fire-axe-head', 'fire-axe-neck']) this.fireAxeEvidence.getObjectByName(part).visible = true;
    }
    this.putAxeAway();
    this.ctx.interaction.setFallback(null);
  }

  dispose() {
    this.root.clear();
  }
}
