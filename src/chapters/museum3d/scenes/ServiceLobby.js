// Beat 1 (empty service lobby) + Beat 4 (reclassified lobby).
// One room, two variants, driven entirely by the narrative snapshot.
//
// Layout (meters): x ∈ [-8, 8], z ∈ [-6, 6], ceiling 3.4.
//   - player entry: west side, facing the room
//   - service desk: south wall (z ≈ +5), normal variant
//   - central glass case: (1.5, 0, 0), large enough to hold the whole desk
//   - archive corridor door: east wall (x = +8)
//   - reclassified variant: desk inside the case, former footprint is a
//     doorway in the south wall leading to a short unlit stub (Gate 6 site)

import * as THREE from 'three';
import { COLORS } from '../config.js';
import { mat, emissiveMat, flatMat, box, plane, label, fluorescentFixture, displayCase, glassMat, hitProxy } from '../util/graybox.js';
import { RoomReclassification } from '../systems/RoomReclassification.js';
import { createMuseumMaterialLibrary } from '../assets/MuseumMaterials.js';
import { loadMuseumModel } from '../assets/MuseumModelLoader.js';
import { createLastTrainExhibitElements } from '../assets/ChapterExhibitElements.js';
import { chapterExhibit, exhibitDialogue } from '../data/chapterExhibitCatalog.js';
import { loadFinalBossPaperAsset } from '../assets/FinalBossPaperAssetLoader.js';
import { createCentralJourneyDisplay } from '../assets/CentralJourneyDisplay.js';
import { magicStoneSnapshot, offerMagicStone } from '../../../shell/magicStones.js';
import {
  addAcousticCeilingGrid,
  createArchiveCart,
  createGuidePedestal,
  createPublicBench,
  createServiceDesk,
  createWallRadiator,
  createWasteBin,
} from '../assets/MuseumProps.js';

const WALL_H = 3.4;
const WALL_T = 0.3;

const LOCKED_GUIDE_LINE =
  'This archive contains four independent directions: the Borrowed Grid, Echo City, the Painted Country, and the Labyrinth. Each must return here without being placed inside another.';

const LOCKED_RECLASSIFY_LINE =
  'The service desk has been reclassified as evidence. You may continue through its former location.';

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
    // darker traffic lanes
    plane(g, { x: 0, y: 0.005, z: 0, w: 16, h: 2.2, material: this.materials.carpetLane, name: 'lane-x' });
    plane(g, { x: -5.5, y: 0.005, z: 0, w: 2.2, h: 12, material: this.materials.carpetLane, name: 'lane-z' });
    plane(g, { x: 0, y: WALL_H, z: 0, w: 16, h: 12, material: this.materials.ceilingTile, rotationX: Math.PI / 2, name: 'ceiling' });
    addAcousticCeilingGrid(g, { width: 16, depth: 12, y: WALL_H - 0.012 });

    const wall = this.materials.wall;
    // west (entry wall, solid)
    box(g, { x: -8, y: WALL_H / 2, z: 0, w: WALL_T, h: WALL_H, d: 12, material: wall, name: 'wall-west', collide: true, collisionWorld });
    // north (solid)
    box(g, { x: 0, y: WALL_H / 2, z: -6, w: 16.6, h: WALL_H, d: WALL_T, material: wall, name: 'wall-north', collide: true, collisionWorld });
    // east with corridor doorway z ∈ [-1.1, 1.1]
    box(g, { x: 8, y: WALL_H / 2, z: -3.55, w: WALL_T, h: WALL_H, d: 4.9, material: wall, name: 'wall-east-n', collide: true, collisionWorld });
    box(g, { x: 8, y: WALL_H / 2, z: 3.55, w: WALL_T, h: WALL_H, d: 4.9, material: wall, name: 'wall-east-s', collide: true, collisionWorld });
    box(g, { x: 8, y: 2.95, z: 0, w: WALL_T, h: 0.9, d: 2.2, material: wall, name: 'wall-east-lintel' });
    // south wall — normal variant is solid; reclassified cuts a doorway at
    // the former desk footprint (x ∈ [-1.1, 1.1]). Built as two swappable sets.
    this._southSolid = new THREE.Group();
    this._southDoorway = new THREE.Group();
    g.add(this._southSolid, this._southDoorway);
    box(this._southSolid, { x: 0, y: WALL_H / 2, z: 6, w: 16.6, h: WALL_H, d: WALL_T, material: wall, name: 'wall-south-solid' });
    box(this._southDoorway, { x: -4.4, y: WALL_H / 2, z: 6, w: 7.8, h: WALL_H, d: WALL_T, material: wall, name: 'wall-south-w' });
    box(this._southDoorway, { x: 4.4, y: WALL_H / 2, z: 6, w: 7.8, h: WALL_H, d: WALL_T, material: wall, name: 'wall-south-e' });
    box(this._southDoorway, { x: 0, y: 2.95, z: 6, w: 2.2, h: 0.9, d: WALL_T, material: wall, name: 'wall-south-lintel' });

    // Civic-museum wall finish: scrub-resistant olive wainscot below a metal
    // chair rail, with woven contract vinyl above. Keep each finish attached
    // to the wall variant it belongs to so the reclassified doorway remains
    // a real opening instead of being crossed by a cosmetic strip.
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
    box(this._southSolid, { x: 0, y: 0.63, z: 5.82, w: 15.7, h: 1.08, d: 0.05, material: lower, name: 'wainscot-south-solid' });
    box(this._southSolid, { x: 0, y: 0.18, z: 5.86, w: 15.7, h: 0.22, d: 0.08, material: dado, name: 'baseboard-south-solid' });
    box(this._southSolid, { x: 0, y: 1.18, z: 5.86, w: 15.7, h: 0.09, d: 0.07, material: dado, name: 'chair-rail-south-solid' });
    for (const x of [-4.4, 4.4]) {
      box(this._southDoorway, { x, y: 0.63, z: 5.82, w: 7.5, h: 1.08, d: 0.05, material: lower, name: `wainscot-south-${x}` });
      box(this._southDoorway, { x, y: 1.18, z: 5.86, w: 7.5, h: 0.09, d: 0.07, material: dado, name: `chair-rail-south-${x}` });
    }

    // fluorescent strips
    for (const fx of [-4, 0, 4]) {
      fluorescentFixture(g, { x: fx, z: 0, ceilingY: WALL_H, length: 3.2 });
    }

    // signage
    label(g, 'ROOM 101 — SERVICE HALL', { x: -7.8, y: 2.3, z: 0, w: 2.4, h: 0.5, rotationY: Math.PI / 2 });
    label(g, 'ARCHIVE WING →', { x: 7.8, y: 2.4, z: -2.2, w: 2.0, h: 0.45, rotationY: -Math.PI / 2 });
    label(g, 'EVACUATION OF OCTOBER 17\nFOUR DIRECTIONS · ONE ARCHIVE', {
      x: 0, y: 2.5, z: -5.8, w: 4.2, h: 0.9,
    });

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

    // Keep only the left-hand Chapter 1 ticket case. The right olive thread
    // vitrine is removed so the central Black Knife route has clear sightlines.
    this.lastTrainExhibit = chapterExhibit('last-train');
    const caseA = displayCase(g, { x: -5.5, z: -5.2, w: 1.6, d: 1.0, name: 'wall-case-a', collisionWorld });
    const ticketElements = createLastTrainExhibitElements();
    ticketElements.name = 'chapter-01-ticket-case-elements';
    ticketElements.scale.setScalar(0.82);
    ticketElements.traverse((object) => {
      if (/thread|spool|relay/.test(object.name)) object.visible = false;
    });
    caseA.add(ticketElements);
    label(caseA, 'CHAPTER 01 · THE LAST TRAIN\nPUNCHED TICKET A-1017', {
      x: 0, y: 0.88, z: 0.515, w: 1.34, h: 0.28,
      fg: '#e6ddc5', bg: '#17140f', font: 'bold 25px Georgia, serif',
    });
    this.lastTrainTicketProxy = hitProxy(caseA, { x: 0, y: 1.35, z: 0.5, w: 1.5, h: 1.5, d: 0.2, name: 'chapter-01-ticket-case-proxy' });
    label(g, 'ARCHIVE METHOD\nOBJECT · MEMORY · RECONSTRUCTION LAW', {
      x: 0, y: 1.5, z: -5.82, w: 3.8, h: 0.58,
      fg: '#d9c99d', bg: '#20231f', font: 'bold 29px Georgia, serif',
    });

    // Central case — two paper objects from two different chapters, both taken
    // directly from George's ALL WORLDS AT ONCE final boss. They occupy the
    // case until the room reclassifies the service desk as evidence.
    this.centralCase = displayCase(g, {
      x: 1.5, z: 0, w: 5.4, d: 2.8, plinthH: 1.0, glassH: 1.9,
      name: 'central-case',
    });
    this.centralCaseColliderSize = { x: 1.5, z: 0, w: 5.4, d: 2.8 };
    this.centralOriginalDisplay = new THREE.Group();
    this.centralOriginalDisplay.name = 'central-final-boss-two-world-display';
    this.centralCase.add(this.centralOriginalDisplay);
    const supportingArchive = createCentralJourneyDisplay(this.materials);
    this.centralJourneySupportingDisplay = supportingArchive.group;
    this._updateCentralJourneyDisplay = supportingArchive.update;
    this.centralOriginalDisplay.add(this.centralJourneySupportingDisplay);
    this.centralOriginalModelIds = [];
    this.centralOriginalModelFailures = [];
    this.centralOriginalDisplayProxy = hitProxy(this.centralCase, {
      x: -2.76, y: 1.74, z: 0, w: 0.12, h: 1.35, d: 2.58,
      name: 'central-original-model-display-proxy',
    });
    this.centralNormalLabel = label(g, 'TWO WORLDS · ONE JOURNEY\n01 · NIGHT TRAIN / 04 · INDIGO', {
      x: -1.23, y: 0.55, z: 0, w: 2.25, h: 0.5, rotationY: -Math.PI / 2,
      font: 'bold 25px Georgia, serif',
    });
    this._installCentralFinalBossAssets();
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

    // punched ticket on the desk (small object gets a generous hit volume)
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

    // ---- reclassified variant ----------------------------------------------
    this.reclassifiedGroup = new THREE.Group();
    this.reclassifiedGroup.name = 'lobby-reclassified';
    g.add(this.reclassifiedGroup);

    // the desk reappears inside the central case (built separately so the
    // normal desk can simply hide)
    this.casedDesk = this._buildDesk({ exhibit: true });
    this.casedDesk.position.set(1.5, 1.0, 0);
    this.casedDesk.rotation.y = Math.PI;
    this.reclassifiedGroup.add(this.casedDesk);
    label(this.reclassifiedGroup, 'ACC. 17-1017\nSERVICE DESK · EVIDENCE', {
      x: 1.5, y: 0.55, z: 1.65, w: 2.2, h: 0.5,
    });

    // former desk footprint: floor wear outline + open doorway into a stub
    plane(this.reclassifiedGroup, {
      x: 0, y: 0.01, z: 5.0, w: 4.4, h: 1.2,
      material: mat(0x4e4438), name: 'desk-footprint-wear',
    });
    const frame = mat(COLORS.doorFrame);
    box(this.reclassifiedGroup, { x: -1.2, y: 1.25, z: 6, w: 0.2, h: 2.5, d: 0.5, material: frame, name: 'frame-w' });
    box(this.reclassifiedGroup, { x: 1.2, y: 1.25, z: 6, w: 0.2, h: 2.5, d: 0.5, material: frame, name: 'frame-e' });
    label(this.reclassifiedGroup, 'CORRIDOR 101-B', { x: 0, y: 2.75, z: 5.8, w: 1.6, h: 0.35 });

    // stub corridor (Gate 6 site) beyond the former desk location
    this.stub = new THREE.Group();
    this.stub.name = 'collapse-stub';
    g.add(this.stub);
    plane(this.stub, { x: 0, z: 9, w: 2.4, h: 6.2, material: this.materials.rubberTile, name: 'stub-floor' });
    plane(this.stub, { x: 0, y: 2.6, z: 9, w: 2.4, h: 6.2, material: flatMat(0x3a362e), rotationX: Math.PI / 2, name: 'stub-ceiling' });
    box(this.stub, { x: -1.2, y: 1.3, z: 9, w: 0.2, h: 2.6, d: 6.2, material: mat(0x6b6252), name: 'stub-wall-w' });
    box(this.stub, { x: 1.2, y: 1.3, z: 9, w: 0.2, h: 2.6, d: 6.2, material: mat(0x6b6252), name: 'stub-wall-e' });
    box(this.stub, { x: 0, y: 1.3, z: 12, w: 2.6, h: 2.6, d: 0.2, material: mat(0x6b6252), name: 'stub-wall-end' });
    label(this.stub, 'SEQUENCE NOT YET INSTALLED', { x: 0, y: 1.5, z: 11.85, w: 1.8, h: 0.4, rotationY: Math.PI });
    // one bare flickering tube in the stub
    box(this.stub, { x: 0, y: 2.5, z: 9, w: 0.25, h: 0.06, d: 1.6, material: emissiveMat(0xd8e0c8), name: 'stub-tube' });
    this._archiveCartFallback = createArchiveCart(this.materials);
    this._archiveCartFallback.position.set(0, 0, 10.55);
    this._archiveCartFallback.rotation.y = Math.PI / 2;
    this.stub.add(this._archiveCartFallback);
    this._installArchiveCart();

    // ---- lights --------------------------------------------------------------
    // Fluorescent fixtures now light the room as fixtures rather than relying
    // on one omnidirectional bulb in the middle. The soft directional key is
    // deliberately weak; it exists to give furniture and cases readable
    // contact shadows under WebGL, while the three broad ceiling sources carry
    // the institutional flatness of the reference room.
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

    // ---- reclassification controller ----------------------------------------
    this.reclassification = new RoomReclassification({
      normalGroup: this.normalGroup,
      reclassifiedGroup: this.reclassifiedGroup,
      collisionWorld,
      registerColliders: (variant) => this._registerFurnitureColliders(variant),
    });

    // wall colliders are permanent; variant colliders are re-registered.
    collisionWorld.addBoxFromCenterSize(-4.5, -3, 0.5, 0.5, 'guide-stand');
    this._registerTriggers();

    this._phoneTimer = 0;
    this._reclassifyLinePlayed = false;

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

  _buildLobbyEvidence() {
    // The axe is emergency hardware, not a freestanding gallery prop: it hangs
    // in a red, wall-mounted fire-axe cabinet on the south wall.
    this.fireAxeEvidence = new THREE.Group();
    this.fireAxeEvidence.name = 'lobby-fire-axe-evidence';
    // East/north wall: clearly separate from the Black Knife case on the
    // south side, and not occluded by that foreground glass.
    // Keep clear of the nearby ARCHIVE WING placard.
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

    // The fifth stone is a small, ordinary rough stone inside the central
    // vitrine. It is intentionally quiet: no glow, pulse, or floating hint.
    this.blackKnifeCase = this.centralCase;
    this.blackKnifeStone = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.13, 1),
      new THREE.MeshStandardMaterial({ color: 0x585248, roughness: 1, metalness: 0, flatShading: true }),
    );
    this.blackKnifeStone.name = 'black-knife-magic-stone';
    // Keep this in a genuinely empty strip along the accessible long side.
    // The former coordinate shared depth with the pigment card and folded-paper
    // study, so the stone existed but was fully hidden from the player-facing
    // view. This spot stays quiet and normal-sized, but is not occluded by any
    // other display asset.
    this.blackKnifeStone.position.set(0.86, 1.22, 1.08);
    this.blackKnifeStone.rotation.z = Math.PI / 4;
    this.blackKnifeCase.add(this.blackKnifeStone);
    this.blackKnifeStoneLight = new THREE.PointLight(0x6b6254, 0, 1.1, 2);
    this.blackKnifeStoneLight.position.set(0.86, 1.26, 1.08);
    this.blackKnifeCase.add(this.blackKnifeStoneLight);
    this.blackKnifeStoneProxy = hitProxy(this.blackKnifeCase, { x: 0.86, y: 1.22, z: 1.46, w: 0.48, h: 0.46, d: 0.1, name: 'black-knife-stone-click-proxy' });
    // The player can start the break from anywhere along this visible long
    // side. The actual stone remains a quiet, normal-sized object to aim at
    // after the pane is gone.
    this.blackKnifeBreakProxy = hitProxy(this.blackKnifeCase, { x: 0, y: 1.65, z: 1.46, w: 5.0, h: 1.3, d: 0.1, name: 'black-knife-long-side-glass-break-proxy' });
    this.blackKnifeLongSideGlass = this.blackKnifeCase.getObjectByName('central-case-glass-front');
    this.blackKnifeGlassBroken = false;
    if (magicStoneSnapshot().collected.includes('black-knife')) {
      this.blackKnifeStone.visible = false;
      this.blackKnifeStoneLight.intensity = 0;
    }

    this.glassShardEvidence = new THREE.Group();
    this.glassShardEvidence.name = 'black-knife-case-glass-shards';
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

  async _installTelephone(placeholder, { exhibit = false } = {}) {
    try {
      const phone = await loadMuseumModel('telephone', {
        target: { x: 0.34, y: 0.2, z: 0.25 },
      });
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

  async _installArchiveCart() {
    try {
      const cart = await loadMuseumModel('archiveCart', {
        target: { x: 1.15, y: 1.05, z: 0.66 },
        tint: 0x8f927b,
      });
      cart.position.copy(this._archiveCartFallback.position);
      cart.rotation.copy(this._archiveCartFallback.rotation);
      this.stub.add(cart);
      this._archiveCartFallback.visible = false;
    } catch (error) {
      console.warn('[museum3d] archive cart model unavailable; using fallback', error);
    }
  }

  async _installCentralFinalBossAssets() {
    const specs = [
      {
        id: 'chapter01-night-service-train',
        width: 1.90,
        position: [-0.90, 1.075, -0.58],
        rotationX: -Math.PI / 2,
      },
      {
        id: 'chapter04-indigo-pigment',
        width: 1.00,
        position: [-1.28, 1.079, 0.55],
        rotationX: -Math.PI / 2,
      },
    ];
    await Promise.all(specs.map(async (spec) => {
      try {
        const model = await loadFinalBossPaperAsset(spec.id, { width: spec.width });
        model.position.set(...spec.position);
        model.rotation.x = spec.rotationX;
        this.centralOriginalDisplay.add(model);
        this.centralOriginalModelIds.push(spec.id);
      } catch (error) {
        this.centralOriginalModelFailures.push(spec.id);
        console.warn(`[museum3d] original model unavailable: ${spec.id}`, error);
      }
    }));
  }

  getCentralDisplayState() {
    return {
      visible: this.centralOriginalDisplay.visible,
      modelIds: [...this.centralOriginalModelIds].sort(),
      failures: [...this.centralOriginalModelFailures].sort(),
      sourceChapters: ['chapter01', 'chapter04'],
      sourceRuntime: 'final-boss-all-worlds-at-once',
      usesOriginalRuntimeAssets: true,
      paddingRatio: this.centralJourneySupportingDisplay?.userData.layout?.paddingRatio ?? null,
      supportingItems: this.centralJourneySupportingDisplay?.userData.items?.map(({ id, medium }) => ({ id, medium })) ?? [],
    };
  }

  _registerFurnitureColliders(variant) {
    const world = this.ctx.collisionWorld;
    world.removeById('service-desk');
    world.removeById('central-case');
    world.removeById('wall-south-solid');
    world.removeById('wall-south-w');
    world.removeById('wall-south-e');
    world.removeById('stub-wall-w');
    world.removeById('stub-wall-e');
    world.removeById('stub-wall-end');
    world.removeById('corridor-doors');

    const c = this.centralCaseColliderSize;
    world.addBoxFromCenterSize(c.x, c.z, c.w, c.d, 'central-case');

    if (variant === 'normal') {
      world.addBoxFromCenterSize(0, 5.0, 4, 0.7, 'service-desk');
      world.addBoxFromCenterSize(0, 6, 16.6, WALL_T, 'wall-south-solid');
      if (!this.ctx.model.getSnapshot().ticket.carried) {
        world.addBoxFromCenterSize(8, 0, 0.4, 2.2, 'corridor-doors');
      }
      this._southSolid.visible = true;
      this._southDoorway.visible = false;
      this.stub.visible = false;
    } else {
      world.addBoxFromCenterSize(-4.4, 6, 7.8, WALL_T, 'wall-south-w');
      world.addBoxFromCenterSize(4.4, 6, 7.8, WALL_T, 'wall-south-e');
      world.addBoxFromCenterSize(-1.2, 9, 0.2, 6.2, 'stub-wall-w');
      world.addBoxFromCenterSize(1.2, 9, 0.2, 6.2, 'stub-wall-e');
      world.addBoxFromCenterSize(0, 12, 2.6, 0.2, 'stub-wall-end');
      this._southSolid.visible = false;
      this._southDoorway.visible = true;
      this.stub.visible = true;
    }
  }

  // Re-registered by Museum3DApp each time this space becomes active.
  registerInteractions() {
    const { interaction, model, audioGuide, dialogue } = this.ctx;

    interaction.register('punched-ticket', {
      mesh: this.ticketProxy,
      enabled: () => {
        const s = model.getSnapshot();
        return s.phase === 'lobby' && !s.ticket.carried && !s.lobby.deskReclassified;
      },
      prompt: () => {
        const s = model.getSnapshot();
        return s.ticket.inspected ? 'E — CARRY THE PUNCHED TICKET' : 'E — INSPECT THE PUNCHED TICKET';
      },
      action: () => {
        const s = model.getSnapshot();
        if (!s.ticket.inspected) {
          model.dispatch({ type: 'inspectTicket' });
          dialogue.play([
            { speaker: null, text: 'A museum admission ticket, machine-punched: A-1017. The punch pattern matches no current issue.' },
          ]);
        } else {
          model.dispatch({ type: 'carryTicket' });
          this.ticketMesh.visible = false;
          dialogue.play([{ speaker: null, text: 'You carry the ticket. The archive wing turnstile will read it.' }]);
        }
      },
    });

    interaction.register('guide-receiver', {
      mesh: this.guideStand,
      enabled: () => model.getSnapshot().phase === 'lobby',
      prompt: 'E — LISTEN TO THE GUIDE RECEIVER',
      action: () => {
        audioGuide.sayArchivist([LOCKED_GUIDE_LINE]);
      },
    });

    interaction.register('central-original-model-display', {
      mesh: this.centralOriginalDisplayProxy,
      enabled: () => {
        const s = model.getSnapshot();
        return ['lobby', 'return'].includes(s.phase) && !s.lobby.deskReclassified;
      },
      prompt: 'E — INSPECT THE TWO-WORLD DISPLAY',
      action: () => dialogue.play([
        ...exhibitDialogue(chapterExhibit('last-train')),
        ...exhibitDialogue(chapterExhibit('painted-country')),
      ]),
    });

    interaction.register('fire-axe-evidence', {
      mesh: this.fireAxeProxy,
      enabled: () => ['lobby', 'return'].includes(model.getSnapshot().phase) && !this.fireAxeTaken,
      prompt: 'E — TAKE THE FIRE AXE',
      action: () => {
        this.fireAxeTaken = true;
        // Only the removable axe disappears; the emergency cabinet stays on
        // the wall as evidence, now visibly empty.
        this.fireAxeProxy.visible = false;
        this.fireAxeEvidence.getObjectByName('fire-axe-handle').visible = false;
        this.fireAxeEvidence.getObjectByName('fire-axe-head').visible = false;
        this.fireAxeEvidence.getObjectByName('fire-axe-neck').visible = false;
        this.heldFireAxe.visible = true;
        dialogue.play([{ speaker: null, text: 'The axe is still sharp. One long side of the central vitrine can be opened from this side.' }]);
      },
    });

    interaction.register('black-knife-long-side-glass', {
      mesh: this.blackKnifeBreakProxy,
      enabled: () => ['lobby', 'return'].includes(model.getSnapshot().phase)
        && !magicStoneSnapshot().collected.includes('black-knife')
        && this.fireAxeTaken && !this.blackKnifeGlassBroken,
      prompt: 'E — BREAK THE LONG SIDE GLASS',
      showWhenInactive: true,
      action: () => this.tryBreakBlackKnifeGlass(),
    });

    interaction.register('black-knife-stone', {
      mesh: this.blackKnifeStoneProxy,
      enabled: () => ['lobby', 'return'].includes(model.getSnapshot().phase)
        && this.blackKnifeGlassBroken && !magicStoneSnapshot().collected.includes('black-knife')
        && !this._claimingBlackKnifeStone,
      prompt: 'CLICK — TAKE THE BLACK KNIFE STONE',
      pointerOnly: true,
      showWhenInactive: true,
      action: async () => {
        this._claimingBlackKnifeStone = true;
        const taken = await offerMagicStone('black-knife');
        this._claimingBlackKnifeStone = false;
        if (!taken) return;
        this.blackKnifeStone.visible = false;
        this.blackKnifeStoneLight.intensity = 0;
        dialogue.play([{ speaker: null, text: 'The shard is cold in your hand. The hidden route now has a key.' }]);
      },
    });

    for (const [id, mesh] of [
      ['chapter-01-ticket-case', this.lastTrainTicketProxy],
    ]) {
      interaction.register(id, {
        mesh,
        enabled: () => ['lobby', 'return'].includes(model.getSnapshot().phase),
        prompt: 'E — READ CHAPTER 01 ACCESSION CARD',
        action: () => dialogue.play(exhibitDialogue(this.lastTrainExhibit)),
      });
    }

    interaction.register('cased-desk-phone', {
      mesh: this.casedDesk,
      enabled: () => model.getSnapshot().lobby.deskReclassified,
      prompt: 'E — READ THE OPEN REGISTER',
      action: () => {
        dialogue.play([
          { speaker: null, text: 'The register is open to the last entry. The name written there is BUTCH. The telephone keeps ringing. No one is coming to answer it.' },
        ]);
      },
    });
  }

  _registerTriggers() {
    // walk-through trigger handled in update(): corridor doorway zone.
    this._corridorZone = { minX: 7.0, maxX: 8.2, minZ: -1.1, maxZ: 1.1 };
    this._stubEndZone = { minX: -1.0, maxX: 1.0, minZ: 11.0, maxZ: 12.0 };
    this._doorHintCooldown = 0;
  }

  enter(snapshot) {
    const variant = this.reclassification.apply(snapshot);
    this.centralOriginalDisplay.visible = variant === 'normal';
    this.centralNormalLabel.visible = variant === 'normal';
    this.ticketMesh.visible = !snapshot.ticket.carried && variant === 'normal';
    if (variant === 'reclassified') {
      this.deskLampLight.intensity = 9;
      this._phoneTimer = 1.2;
      if (!this._reclassifyLinePlayed) {
        this._reclassifyLinePlayed = true;
        this.ctx.audioGuide.sayArchivist([LOCKED_RECLASSIFY_LINE]);
      }
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
      && player.x >= -0.25 && player.x <= 4.75
      && player.z >= 1.25 && player.z <= 3.25;
  }

  tryBreakBlackKnifeGlass() {
    if (!this.canBreakBlackKnifeGlass()) return false;
    this.blackKnifeGlassBroken = true;
    this.blackKnifeLongSideGlass.visible = false;
    this.glassShardEvidence.visible = true;
    this.ctx.dialogue.play([{ speaker: null, text: 'Only the long side pane breaks. The stone is exposed behind the missing glass.' }]);
    return true;
  }

  update(dt, snapshot) {
    const player = this.ctx.controller.position;
    this._updateCentralJourneyDisplay?.(performance.now() / 1000);

    // The case is large and its transparent surfaces make a precision
    // centre-reticle ray unreliable at arm's length. Once the axe is held,
    // proximity to the accessible long side intentionally supplies the break
    // prompt; collecting the exposed stone still requires an exact click.
    const atBlackKnifeLongSide = this.canBreakBlackKnifeGlass();
    const atExposedStone = this.canReachBlackKnifeStone();
    this.ctx.interaction.setFallback(
      this.fireAxeTaken && !this.blackKnifeGlassBroken && atBlackKnifeLongSide
        ? 'black-knife-long-side-glass'
        : this.blackKnifeGlassBroken && atExposedStone
          ? 'black-knife-stone'
          : null,
      { promptOnly: this.blackKnifeGlassBroken && atExposedStone },
    );

    // corridor doorway (normal route forward)
    if (
      snapshot.phase === 'lobby'
      && snapshot.ticket.carried
      && this._inZone(player, this._corridorZone)
    ) {
      this.ctx.goToCorridor();
    }

    // former desk location → collapse stub end (Gate 6 boundary)
    if (snapshot.phase === 'return' && this._inZone(player, this._stubEndZone)) {
      this.ctx.model.dispatch({ type: 'enterCollapse' });
      this.ctx.dialogue.play([
        { speaker: null, text: 'The corridor continues past the graybox. The collapse proof is built in Gate 6.' },
      ]);
    }

    // reclassified desk: ringing telephone (visual pulse + periodic ring)
    if (snapshot.lobby.deskReclassified) {
      this._phoneTimer -= dt;
      if (this._phoneTimer <= 0) {
        this._phoneTimer = 6;
        this.ctx.audioGuide.phoneRing();
      }
      const pulse = (Math.sin(performance.now() * 0.02) + 1) / 2;
      if (this._ringingPhone) {
        this._ringingPhone.position.y = this._ringingPhoneBaseY + pulse * 0.012;
      } else if (this._handset) {
        this._handset.position.y = 0.17 + pulse * 0.012;
      }
    }

    // The stone stays still and unlit until the player deliberately notices it.

    this._doorHintCooldown = Math.max(0, this._doorHintCooldown - dt);
    if (
      snapshot.phase === 'lobby' &&
      !snapshot.ticket.carried &&
      player.x > 6.2 && Math.abs(player.z) < 1.4 &&
      this._doorHintCooldown === 0
    ) {
      this._doorHintCooldown = 6;
      this.ctx.dialogue.play([
        { speaker: null, text: 'The archive wing doors read the punched ticket. Inspect it at the service desk, then carry it.' },
      ]);
    }
  }

  exit() {}

  dispose() {
    this.root.clear();
  }
}
