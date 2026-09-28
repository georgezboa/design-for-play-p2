// Chapter 6 · ALL WORLDS AT ONCE — the Conductor.
//
// Four movements, one per carriage Butch has already ridden:
//   I   NIGHT SERVICE · LOST PROPERTY — the Chapter 1 carriage wall laid flat,
//       four windows; trains run in the seams; the punch-hole lens reads the
//       1978 tags (and shows the ghost trains that only exist in 1978).
//   II  BORROWED LIGHT · ON THE BELL — Chapter 2's four-second bell and the
//       one-line rule: bridges, billboards and signal lamps fire on the bell.
//   III ECHO CITY · TWO TRUE THINGS — the voiced argument about Mara.
//   IV  THE PAINTED COUNTRY — absorb the colour, return it (8 / 17 / 28).
// Then the night service arrives and Butch boards it: the train keeps
// running, with Butch still aboard (docs/STORY_BIBLE.md, normal ending).
//
// The rules live in finaleModel.js (node-tested); the drawings come from
// finaleArt.js (the Chapter 1 / 2 canvas kits); the DOM HUD from
// shell/finaleUi.js. This file renders, reads input and wires audio.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

import paperTextureUrl from '../../assets/shared/painterly/paper-texture-ivory-v01.png?url';
import ch4ButchIdleUrl from './assets/paper/ch4-butch-walk-0.png?url';
import ch4ButchWalk1Url from './assets/paper/ch4-butch-walk-1.png?url';
import ch4ButchWalk2Url from './assets/paper/ch4-butch-walk-2.png?url';
import ch4ButchWalk3Url from './assets/paper/ch4-butch-walk-3.png?url';
import ch4SootUrl from './assets/paper/ch4-pigment-soot.png?url';
import ch4IndigoUrl from './assets/paper/ch4-pigment-indigo.png?url';
import ch4VerdigrisUrl from './assets/paper/ch4-pigment-verdigris.png?url';
import ch4ConductorUrl from './assets/paper/ch4-conductor.png?url';
import { music } from '../../shared/musicDirector.js';
import { audioFocus } from '../../shared/audioFocus.js';
import { CINEMATICS, playCinematic } from '../../shell/gameFlow.js';
import { showEndCredits } from '../../shell/endCredits.js';
import { installPauseMenu } from '../../shell/pauseMenu.js';
import { createSaveStore, readSettings, volumeForChannel } from '../../shell/saveSystem.js';
import { reducedMotionActive } from '../../shell/motion.js';
import {
  createBellMeter, createStoneRow, createTagLayer, createTicketBar, showArchiveCard, showTitleCard, stampAnnounce,
} from '../../shell/finaleUi.js';
import { DEV_MODE, devParam } from '../../devMode.js';
import * as bellAudio from '../borrowedLight/audio.js';
import {
  BELL_ARENA, CASE_REACH, DEFAULT_DIFFICULTY, ECHO_WINDOW_DAMAGE, ECHO_WINDOW_SECONDS, LANE_X, LENS_RADIUS, PANEL_SEAMS,
  createBellArena, createDeathLedger, createEchoDebate, difficultyPreset, ghostTrainRevealed, laneOf, orbitLens,
  paintReturnDamage, punchCase, trainHits, underLens,
} from './finaleModel.js';
import { ECHO_EXCHANGES } from './echoExchanges.js';
import {
  CONDUCTOR_RAIN_SPEC, LOST_FLOOR, RAIN_FLOOR, loadFinaleArtSources, paintBillboardFace, paintBridgeDeck,
  paintClaimCase, paintConductorCarBackdrop, paintInkButch, paintInkConductor, paintInkTrain, paintInkTrainFront, paintLampNode,
  paintGapWall, paintLensRimCanvas, paintLostPropertyFloor, paintRainFigure, paintRainSkyline, paintRoofSection, paintStreetBelow,
} from './finaleArt.js';

// Runtime files under public/ are referenced by their served path rather than
// imported with ?url (an import made Vite copy each GLB/MP3 a second time).
// Only what the fight draws is loaded: the two Chapter 3 rigs and their
// animation library for Movement III, and the three civic props the
// Conductor throws there.
const PUBLIC_ASSETS = Object.freeze({
  conductorUrl: '/assets/chapter03-3d/characters/male_municipal_shared_rig.glb',
  butchUrl: '/assets/chapter03-3d/characters/butch_shared_rig.glb',
  chapter3AnimationsUrl: '/assets/chapter03-3d/animations/quaternius_ual1_standard.glb',
  trashUrl: '/assets/chapter03-3d/models/ch03_crushed_trash_can.glb',
  benchUrl: '/assets/chapter03-3d/models/ch03_fountain_bench.glb',
  speakerUrl: '/assets/chapter03-3d/models/ch03_pa_speaker.glb',
  thresholdMusicUrl: '/assets/music/ch6/6.1_threshold_modern.mp3',
  gridMusicUrl: '/assets/music/ch6/6.2_grid_modern.mp3',
  echoCityMusicUrl: '/assets/music/ch6/6.3_dvorak_new_world_mvt4_theme.mp3',
  allLinesMusicUrl: '/assets/music/ch6/6.4_mussorgsky_kiev_gate.mp3',
  departureMusicUrl: '/assets/music/ch6/6.5_night_train_departure.mp3',
});
export const FINAL_BOSS_MODEL_URLS = Object.freeze([
  PUBLIC_ASSETS.conductorUrl, PUBLIC_ASSETS.butchUrl, PUBLIC_ASSETS.chapter3AnimationsUrl,
  PUBLIC_ASSETS.trashUrl, PUBLIC_ASSETS.benchUrl, PUBLIC_ASSETS.speakerUrl,
]);

const AMBER = 0xe0a24a;
const IVORY = 0xeadfc6;
const OXBLOOD = 0x8a2a1e;
const ROSE = 0xc98088;
const TEAL = 0x6fb7ad;
const LINE_HEX = { amber: AMBER, teal: TEAL, rose: ROSE };
const LINE_CSS = { amber: '#e0a24a', teal: '#6fb7ad', rose: '#c98088' };
const ARENA = { minX: -13.2, maxX: 13.2, minZ: -7.35, maxZ: 8.2 };
const CONDUCTOR_Z = -15.8;
const PHASE_START_HP = [400, 300, 200, 100];
const ECHO_COMBAT_INTERVAL = 10;
const PAINT_HOLD_SECONDS = 0.68;
const CLAIMS = [
  '1978-0388 · A. KOVAC', '1978-0391 · HAT BOX', '1978-0397 · E. MARSH', '1978-0402 · UMBRELLA',
  '1978-0405 · T. OKAFOR', '1978-0409 · VIOLIN CASE', '1978-0411 · I. BRANDT', '1978-0412 · VELEZ, M.',
  '1978-0415 · WINTER COAT', '1978-0418 · P. SANDOR', '1978-0421 · SEED TIN', '1978-0426 · L. QUAY',
];
const MACHINE_LABELS = Object.freeze(Object.fromEntries(BELL_ARENA.nodes.map((node) => [node.machine, node.label])));
const CONDUCTOR_TEST_MOVEMENTS = Object.freeze({ 'conductor-1': 0, 'conductor-2': 1, 'conductor-3': 2, 'conductor-4': 3 });

function requestedConductorTestMovement() {
  const movement = CONDUCTOR_TEST_MOVEMENTS[devParam('qa')];
  return Number.isInteger(movement) ? movement : null;
}

// Every movement has its own cue, all cleared: two project-owned renders,
// then the public-domain Musopen Dvořák and Mussorgsky.
const BOSS_SCORE = {
  threshold: { id: 'threshold-modern-pulse', src: PUBLIC_ASSETS.thresholdMusicUrl, volume: 0.44, fade: 1.4, outFade: 1.8, dialogueDuckDb: -9, loop: true },
  grid: { id: 'cut-current-grid', src: PUBLIC_ASSETS.gridMusicUrl, volume: 0.4, fade: 1.6, outFade: 1.8, dialogueDuckDb: -9, loop: true },
  echoCity: { id: 'echo-city-new-world-fire', src: PUBLIC_ASSETS.echoCityMusicUrl, volume: 0.5, fade: 2.4, outFade: 2.2, dialogueDuckDb: -11, loop: true },
  allLines: { id: 'mussorgsky-kiev-gate', src: PUBLIC_ASSETS.allLinesMusicUrl, volume: 0.54, fade: 1.65, outFade: 3.8, loop: true },
  departure: { id: 'departure', src: PUBLIC_ASSETS.departureMusicUrl, volume: 0.54, fade: 3.2, outFade: 5.5, loop: true },
};

export const PHASES = Object.freeze([
  { id: 'lost', number: 'I', title: 'I · NIGHT SERVICE', world: 'LOST PROPERTY', rule: 'Read the tag through the lens. Punch the case back to him.', form: 'CLERK', music: BOSS_SCORE.threshold },
  { id: 'borrowed', number: 'II', title: 'II · BORROWED LIGHT', world: 'ON THE BELL', rule: 'Punch a lamp. It fires on the bell.', form: 'CLERK', music: BOSS_SCORE.grid },
  { id: 'echo', number: 'III', title: 'III · ECHO CITY', world: 'TWO TRUE THINGS', rule: 'Answer him with both truths at once.', form: 'BUTCH', music: BOSS_SCORE.echoCity },
  { id: 'painted', number: 'IV', title: 'IV · THE PAINTED COUNTRY', world: 'TAKE BACK THE COLOUR', rule: 'The fuller the brush, the deeper it cuts.', form: 'INK FIGURE', music: BOSS_SCORE.allLines },
]);

let difficulty = DEFAULT_DIFFICULTY;
const D = () => difficultyPreset(difficulty);
let shakeEnabled = !reducedMotionActive();
let flashEnabled = false;
const globalBus = (channel) => volumeForChannel(globalThis.NIGHTFALL_SETTINGS ?? readSettings(), channel);
let soundEnabled = true;

function shadows(root) {
  root.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });
  return root;
}

function fitModel(root, targetHeight, targetWidth = Infinity) {
  root.updateMatrixWorld(true);
  const first = new THREE.Box3().setFromObject(root);
  const size = first.getSize(new THREE.Vector3());
  root.scale.multiplyScalar(Math.min(targetHeight / Math.max(size.y, 0.001), targetWidth / Math.max(size.x, size.z, 0.001)));
  root.updateMatrixWorld(true);
  const fitted = new THREE.Box3().setFromObject(root);
  const center = fitted.getCenter(new THREE.Vector3());
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= fitted.min.y;
  return shadows(root);
}

function flatBox(w, h, d, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function paperMaterial(color, map = null) {
  return new THREE.MeshStandardMaterial({ color, map, emissiveIntensity: 0.12, roughness: 0.96, metalness: 0, side: THREE.DoubleSide });
}

function canvasTexture(canvas, { repeat = false } = {}) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// Painted art is shown as painted: unlit, not tone-mapped.
function paintedMaterial(map, { transparent = true, opacity = 1, side = THREE.DoubleSide } = {}) {
  return new THREE.MeshBasicMaterial({ map, transparent, opacity, alphaTest: transparent ? 0.04 : 0, side, toneMapped: false, depthWrite: !transparent || opacity >= 1 });
}

function paintedCard(canvas, height, options = {}) {
  const width = height * (canvas.width / canvas.height);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), paintedMaterial(canvasTexture(canvas), options));
  mesh.userData.width = width;
  mesh.userData.height = height;
  return mesh;
}

// The 1978 layer seen only through the lens: a painted card that draws only
// where its footprint is inside the lens circle.
const lensUniforms = { uLens: { value: new THREE.Vector2(0, 99) }, uRadius: { value: LENS_RADIUS } };

function lensClipMaterial(map, { opacity = 1 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { map: { value: map }, uLens: lensUniforms.uLens, uRadius: lensUniforms.uRadius, uOpacity: { value: opacity } },
    vertexShader: 'varying vec2 vUv; varying vec3 vWorld; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform sampler2D map; uniform vec2 uLens; uniform float uRadius; uniform float uOpacity; varying vec2 vUv; varying vec3 vWorld;
      void main(){ vec4 t = texture2D(map, vUv); if (t.a < 0.05) discard; float d = distance(vWorld.xz, uLens); if (d > uRadius) discard;
        float edge = smoothstep(uRadius, uRadius - 0.35, d); gl_FragColor = linearToOutputTexel(vec4(t.rgb, t.a * uOpacity * edge)); }`,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

function lensFloorMaterial(present, past) {
  return new THREE.ShaderMaterial({
    uniforms: { mapA: { value: present }, mapB: { value: past }, uLens: lensUniforms.uLens, uRadius: lensUniforms.uRadius, uDim: { value: 0.92 } },
    vertexShader: 'varying vec2 vUv; varying vec3 vWorld; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform sampler2D mapA; uniform sampler2D mapB; uniform vec2 uLens; uniform float uRadius; uniform float uDim; varying vec2 vUv; varying vec3 vWorld;
      void main(){ vec4 a = texture2D(mapA, vUv); vec4 b = texture2D(mapB, vUv); float d = distance(vWorld.xz, uLens);
        float m = 1.0 - smoothstep(uRadius - 0.05, uRadius + 0.02, d); vec3 col = mix(a.rgb * uDim, b.rgb, m);
        gl_FragColor = linearToOutputTexel(vec4(col, 1.0)); }`,
  });
}

// A paper card that swaps frames: the Movement I/II/IV Butch and Conductor.
// A definition's frames are canvases (painted) or URLs (the Chapter 4 PNGs).
class PaperActor {
  constructor(loader, definitions) {
    this.root = new THREE.Group();
    this.root.userData.kind = 'chapter-paper-actor';
    this.time = 0;
    this.action = 'idle';
    this.phase = 0;
    this.form = PHASES[0].form;
    this.cards = definitions.map((definition) => {
      const group = new THREE.Group();
      if (!definition) { this.root.add(group); group.visible = false; return { group, definition: null }; }
      const maps = Object.fromEntries(Object.entries(definition.frames).map(([key, source]) => {
        const map = typeof source === 'string' ? loader.load(source) : canvasTexture(source);
        map.colorSpace = THREE.SRGBColorSpace;
        return [key, map];
      }));
      const geometry = new THREE.PlaneGeometry(definition.width, definition.height);
      let face;
      let edge = null;
      if (definition.painted) {
        face = new THREE.Mesh(geometry, paintedMaterial(maps.idle));
      } else {
        edge = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0x08090a, map: maps.idle, alphaMap: maps.idle, alphaTest: 0.08, transparent: true, side: THREE.DoubleSide }));
        edge.scale.set(1.1, 1.07, 1);
        edge.position.z = -0.055;
        face = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0xffffff, map: maps.idle, alphaTest: 0.08, transparent: true, roughness: 0.95, metalness: 0, side: THREE.DoubleSide }));
        face.castShadow = true;
        group.add(edge);
      }
      face.position.z = 0.025;
      group.add(face);
      group.position.y = definition.height * 0.5 + (definition.lift ?? 0);
      group.visible = false;
      this.root.add(group);
      return { group, face, edge, maps, definition };
    });
    this.setForm(0, true);
  }

  setForm(phase, immediate = false) {
    this.phase = phase;
    this.form = PHASES[phase].form;
    this.cards.forEach((card, index) => { card.group.visible = index === phase && Boolean(card.definition); });
    const card = this.cards[phase];
    if (!card?.definition) return;
    if (immediate) {
      this.transformTimer = 0;
      card.group.scale.set(1, 1, 1);
      card.group.rotation.set(0, 0, 0);
    } else {
      card.group.scale.set(0.03, 1.3, 1);
      card.group.rotation.y = Math.PI * 0.5;
      this.transformTimer = 0.68;
    }
  }

  setFrame(card, key) {
    const map = card.maps[key] || card.maps.idle;
    if (card.face.material.map === map) return;
    card.face.material.map = map;
    card.face.material.needsUpdate = true;
    if (card.edge) { card.edge.material.map = map; card.edge.material.alphaMap = map; card.edge.material.needsUpdate = true; }
  }

  update(dt, moving, grounded, attacking, hurt, facingX) {
    this.time += dt;
    this.action = hurt ? 'hurt' : attacking ? 'attack' : !grounded ? 'jump' : moving ? 'run' : 'idle';
    const card = this.cards[this.phase];
    if (!card?.definition) return;
    const walkFrames = ['walk0', 'walk1', 'walk2', 'walk3'].filter((key) => card.maps[key]);
    const frame = hurt && card.maps.hurt ? 'hurt'
      : attacking && card.maps.punch ? 'punch'
        : !grounded && card.maps.jump ? 'jump'
          : moving && walkFrames.length ? walkFrames[Math.floor(this.time * 8) % walkFrames.length] : 'idle';
    this.setFrame(card, frame);
    const flip = facingX < -0.1 ? -1 : 1;
    const base = card.definition.height * 0.5 + (card.definition.lift ?? 0);
    if (this.transformTimer > 0) {
      this.transformTimer -= dt;
      const t = 1 - Math.max(0, this.transformTimer) / 0.68;
      const open = THREE.MathUtils.smootherstep(t, 0, 1);
      card.group.rotation.y = (1 - open) * Math.PI * 0.5;
      card.group.scale.set(Math.max(0.03, open) * flip, 1 + Math.sin(t * Math.PI) * 0.18, 1);
    } else {
      card.group.scale.x = flip;
      card.group.scale.y = grounded ? 1 + Math.abs(Math.sin(this.time * 11)) * (moving ? 0.03 : 0.008) : 0.94;
      card.group.rotation.y = 0;
      card.group.rotation.z = hurt ? Math.sin(this.time * 48) * 0.16 : moving && !card.maps.walk0 ? Math.sin(this.time * 11) * 0.035 : 0;
      card.group.position.y = base + (moving && grounded && !card.maps.walk0 ? Math.abs(Math.sin(this.time * 11)) * 0.12 : 0);
    }
  }
}

function makeFloor(color, roughness = 0.9) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(32, 18), new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.12 }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.z = 1;
  mesh.receiveShadow = true;
  return mesh;
}

function makePortalDisc() {
  const root = new THREE.Group();
  const voidDisc = new THREE.Mesh(new THREE.CircleGeometry(1, 96), new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide }));
  voidDisc.rotation.x = -Math.PI / 2;
  voidDisc.position.y = 0.08;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.045, 10, 96), new THREE.MeshBasicMaterial({ color: AMBER }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.11;
  root.add(voidDisc, ring);
  return root;
}

function makeCollapsedFloor() {
  const root = new THREE.Group();
  const points = Array.from({ length: 18 }, (_, index) => {
    const angle = (index / 18) * Math.PI * 2;
    const radius = 0.78 + ((index * 17) % 7) * 0.045;
    return new THREE.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius);
  });
  const pit = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(points)), new THREE.MeshStandardMaterial({ color: 0x16191b, roughness: 1, metalness: 0, side: THREE.DoubleSide }));
  pit.rotation.x = -Math.PI / 2;
  pit.position.y = -0.34;
  root.add(pit);
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x3a3d3d, roughness: 1, side: THREE.DoubleSide });
  const rubbleMaterial = new THREE.MeshStandardMaterial({ color: 0x55534e, roughness: 1 });
  for (let i = 0; i < 18; i += 1) {
    const angle = (i / 18) * Math.PI * 2;
    const next = ((i + 1) / 18) * Math.PI * 2;
    const outer = 0.86 + ((i * 13) % 5) * 0.055;
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(Math.cos(angle) * outer, 0.04, Math.sin(angle) * outer),
      new THREE.Vector3(Math.cos(next) * outer, 0.04, Math.sin(next) * outer),
      new THREE.Vector3(Math.cos((angle + next) * 0.5) * 0.62, -0.32, Math.sin((angle + next) * 0.5) * 0.62),
    ]);
    geometry.setIndex([0, 1, 2]); geometry.computeVertexNormals();
    root.add(new THREE.Mesh(geometry, wallMaterial));
    if (i % 2 === 0) {
      const rubble = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12 + (i % 3) * 0.04, 0), rubbleMaterial);
      rubble.position.set(Math.cos(angle) * (0.92 + (i % 3) * 0.08), 0.07, Math.sin(angle) * (0.92 + (i % 3) * 0.08));
      rubble.rotation.set(i * 0.31, i * 0.47, i * 0.19);
      root.add(rubble);
    }
  }
  root.userData.kind = 'collapsed-cobbles';
  return root;
}

function makePaperCard(loader, url, width, height, { alpha = false } = {}) {
  const map = loader.load(url);
  map.colorSpace = THREE.SRGBColorSpace;
  const root = new THREE.Group();
  const geometry = new THREE.PlaneGeometry(width, height);
  const back = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x171512, map: alpha ? map : null, alphaMap: alpha ? map : null, alphaTest: alpha ? 0.08 : 0, transparent: alpha, roughness: 1, side: THREE.DoubleSide }));
  back.position.z = -0.075;
  back.scale.set(1.012, 1.012, 1);
  back.castShadow = true;
  const face = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0xffffff, map, alphaTest: alpha ? 0.08 : 0, transparent: alpha, roughness: 0.93, metalness: 0, side: THREE.DoubleSide }));
  face.position.z = 0.025;
  face.castShadow = true;
  root.add(back, face);
  root.userData.paperCard = true;
  return root;
}

const escapeHtml = (text) => String(text).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

class SpectacleBattle {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b0806);
    this.scene.fog = new THREE.FogExp2(0x0b0806, 0.014);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);
    this.camera = new THREE.PerspectiveCamera(47, container.clientWidth / container.clientHeight, 0.1, 160);
    this.camera.position.set(0, 10.8, 17.8);
    this.cameraTarget = new THREE.Vector3(0, 1.1, -1.5);
    this.camera.lookAt(this.cameraTarget);
    this.loader = new GLTFLoader();
    this.loader.setMeshoptDecoder(MeshoptDecoder);
    this.textureLoader = new THREE.TextureLoader();
    this.assets = new Map();
    this.assetErrors = [];
    this.assetsReady = false;
    this.worldRoots = [];
    this.hazards = [];
    this.projectiles = [];
    this.effects = [];
    this.keys = new Set();
    this.mode = 'menu';
    this.phase = 0;
    this.elapsed = 0;
    this.lastFrame = performance.now();
    this.transition = null;
    this.hitStop = 0;
    this.trauma = 0;
    this.dialoguePause = false;
    this.deaths = createDeathLedger();
    this.voiceAudio = typeof Audio === 'undefined' ? null : new Audio();
    if (this.voiceAudio) { this.voiceAudio.preload = 'auto'; this.voiceAudio.playsInline = true; this.voiceAudio.volume = 0.9 * globalBus('master'); }
    this.voiceState = { playing: false, speaker: null, tone: null, text: null };
    this.debate = createEchoDebate(ECHO_EXCHANGES);
    this.echo = { clock: ECHO_COMBAT_INTERVAL, window: 0, windowSpent: false, stage: 'combat', lastOutcome: null };
    this.paintTutorial = { stage: 'pending' };
    this.paintHold = { active: false, button: -1, elapsed: 0, point: null, target: null, completed: false };
    this.lost = { cases: [], trains: [], lens: { x: 0, z: 3 }, lensTarget: { x: 0, z: 3 }, lensMode: 'orbit', lastPointer: -Infinity, tutorial: 'pending', claimIndex: 0, returned: 0 };
    this.bell = { arena: null, listening: false, beamFlash: 0, beamLanes: [], telegraphLanes: [], tutorial: 'pending', falls: 0 };
    this.butchActionState = 'idle';
    this.butchLandTimer = 0;
    this.raycaster = new THREE.Raycaster();
    this.pointerNdc = new THREE.Vector2();
    this.buildLights();
    this.buildWorlds();
    this.buildActors();
    this.buildHud();
    this.bindEvents();
    bellAudio.installAudio();
    this.assetsPromise = this.loadAssets();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  // ------------------------------------------------------------------ build

  buildLights() {
    this.hemi = new THREE.HemisphereLight(0xffe2b8, 0x140c08, 2.2);
    this.key = new THREE.DirectionalLight(0xffe7c0, 3.6);
    this.key.position.set(-7, 16, 10);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    Object.assign(this.key.shadow.camera, { left: -18, right: 18, top: 16, bottom: -16 });
    this.rim = new THREE.PointLight(AMBER, 36, 30, 2);
    this.rim.position.set(0, 6, -7);
    this.scene.add(this.hemi, this.key, this.rim);
  }

  buildWorlds() {
    const texture = (url) => {
      const map = this.textureLoader.load(url);
      map.colorSpace = THREE.SRGBColorSpace;
      map.wrapS = map.wrapT = THREE.RepeatWrapping;
      return map;
    };
    this.paperTexture = texture(paperTextureUrl);

    // I · the carriage wall laid flat (textures are painted in loadAssets)
    const lost = new THREE.Group();
    const floorW = LOST_FLOOR.x1 - LOST_FLOOR.x0;
    const floorH = LOST_FLOOR.z1 - LOST_FLOOR.z0;
    this.lostFloor = new THREE.Mesh(new THREE.PlaneGeometry(floorW, floorH), new THREE.MeshBasicMaterial({ color: 0x1c130d }));
    this.lostFloor.rotation.x = -Math.PI / 2;
    this.lostFloor.position.set((LOST_FLOOR.x0 + LOST_FLOOR.x1) / 2, 0, (LOST_FLOOR.z0 + LOST_FLOOR.z1) / 2);
    lost.add(this.lostFloor);
    this.lensRim = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false }));
    this.lensRim.rotation.x = -Math.PI / 2;
    this.lensRim.position.y = 0.05;
    this.lensRim.renderOrder = 4;
    lost.add(this.lensRim);
    this.seamGlows = {
      x: new THREE.Mesh(new THREE.PlaneGeometry(PANEL_SEAMS.halfWidth * 1.8, ARENA.maxZ - ARENA.minZ + 1.4), new THREE.MeshBasicMaterial({ color: AMBER, transparent: true, opacity: 0, depthWrite: false, toneMapped: false })),
      z: new THREE.Mesh(new THREE.PlaneGeometry(ARENA.maxX - ARENA.minX + 1.4, PANEL_SEAMS.halfWidth * 1.8), new THREE.MeshBasicMaterial({ color: AMBER, transparent: true, opacity: 0, depthWrite: false, toneMapped: false })),
    };
    this.seamGlows.x.rotation.x = -Math.PI / 2; this.seamGlows.x.position.set(PANEL_SEAMS.x, 0.03, (ARENA.minZ + ARENA.maxZ) / 2);
    this.seamGlows.z.rotation.x = -Math.PI / 2; this.seamGlows.z.position.set(0, 0.03, PANEL_SEAMS.z);
    lost.add(this.seamGlows.x, this.seamGlows.z);
    this.lostBackdrop = new THREE.Mesh(new THREE.PlaneGeometry(44, 25), new THREE.MeshBasicMaterial({ color: 0x1c130d, toneMapped: false }));
    this.lostBackdrop.position.set(0, 9, -27);
    lost.add(this.lostBackdrop);
    this.worldRoots.push(lost);

    // II · rooftops in the rain over a street gap
    // Two roofs with a real street gap between them: the near roof Butch
    // starts on, and the far roof the Conductor stands at the end of.
    const borrowed = new THREE.Group();
    const rainW = RAIN_FLOOR.x1 - RAIN_FLOOR.x0;
    const roofPlane = (z0, z1) => {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(rainW, z1 - z0), new THREE.MeshBasicMaterial({ color: 0x1a2226, toneMapped: false }));
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set((RAIN_FLOOR.x0 + RAIN_FLOOR.x1) / 2, 0, (z0 + z1) / 2);
      borrowed.add(mesh);
      return mesh;
    };
    this.rainRoofNear = roofPlane(BELL_ARENA.gapNearZ, 10);
    this.rainRoofFar = roofPlane(CONDUCTOR_Z - 6, BELL_ARENA.gapFarZ);
    const gapDepth = BELL_ARENA.gapNearZ - BELL_ARENA.gapFarZ;
    this.rainStreet = new THREE.Mesh(new THREE.PlaneGeometry(rainW + 30, gapDepth + 2), new THREE.MeshBasicMaterial({ color: 0x0b1215, toneMapped: false }));
    this.rainStreet.rotation.x = -Math.PI / 2;
    this.rainStreet.position.set(0, -7, (BELL_ARENA.gapNearZ + BELL_ARENA.gapFarZ) / 2);
    borrowed.add(this.rainStreet);
    this.rainGapWalls = [BELL_ARENA.gapNearZ, BELL_ARENA.gapFarZ].map((z, index) => {
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(rainW + 30, 7), new THREE.MeshBasicMaterial({ color: 0x1a2024, toneMapped: false, side: THREE.DoubleSide }));
      wall.position.set(0, -3.5, z);
      if (index === 0) wall.rotation.y = Math.PI;
      borrowed.add(wall);
      return wall;
    });
    this.rainSkyline = new THREE.Mesh(new THREE.PlaneGeometry(96, 42), new THREE.MeshBasicMaterial({ color: 0x0b1418, toneMapped: false, fog: false }));
    this.rainSkyline.position.set(0, 5, -44);
    borrowed.add(this.rainSkyline);
    this.worldRoots.push(borrowed);

    const echo = new THREE.Group();
    echo.add(makeFloor(0x25292d, 0.98));
    this.worldRoots.push(echo);

    const painted = new THREE.Group();
    this.paperTexture.repeat.set(4, 3);
    const paperFloor = new THREE.Mesh(new THREE.PlaneGeometry(32, 18, 12, 8), paperMaterial(0xd8cbb3, this.paperTexture));
    paperFloor.rotation.x = -Math.PI / 2; paperFloor.position.z = 1; paperFloor.receiveShadow = true; painted.add(paperFloor);
    this.worldRoots.push(painted);
    this.worldRoots.forEach((root, index) => { root.visible = index === 0; this.scene.add(root); });

    this.buildBellArenaProps(borrowed);

    this.portal = makePortalDisc();
    this.portal.visible = false;
    this.scene.add(this.portal);
    this.holeVisuals = [];
    for (let i = 0; i < 8; i += 1) {
      const hole = makeCollapsedFloor();
      hole.visible = false;
      hole.scale.setScalar(1.15);
      this.scene.add(hole);
      this.holeVisuals.push(hole);
    }
    this.rain = this.buildRain();
    this.scene.add(this.rain);
  }

  buildRain() {
    const count = 900;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 6);
    for (let i = 0; i < count; i += 1) {
      const x = THREE.MathUtils.randFloat(-22, 22);
      const y = THREE.MathUtils.randFloat(0, 20);
      const z = THREE.MathUtils.randFloat(-24, 14);
      positions.set([x, y, z, x - 0.12, y - 0.7, z], i * 6);
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const lines = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: 0xc8d6dc, transparent: true, opacity: 0.22, toneMapped: false }));
    lines.visible = false;
    lines.frustumCulled = false;
    return lines;
  }

  buildBellArenaProps(root) {
    // Bridges: plank decks that telescope over the gap from the near roof.
    const gapLength = BELL_ARENA.gapNearZ - BELL_ARENA.gapFarZ + 0.6;
    this.bridgeMeshes = {};
    Object.entries(BELL_ARENA.bridges).forEach(([id, x]) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.04, BELL_ARENA.gapNearZ + 0.3);
      const deck = new THREE.Mesh(new THREE.PlaneGeometry(BELL_ARENA.bridgeHalfWidth * 2, gapLength), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }));
      deck.rotation.x = -Math.PI / 2;
      deck.position.z = -gapLength / 2;
      deck.receiveShadow = true;
      pivot.add(deck);
      const ghost = new THREE.Mesh(new THREE.PlaneGeometry(BELL_ARENA.bridgeHalfWidth * 2, gapLength), new THREE.MeshBasicMaterial({ color: AMBER, transparent: true, opacity: 0, wireframe: false, depthWrite: false, toneMapped: false }));
      ghost.rotation.x = -Math.PI / 2;
      ghost.position.set(x, 0.06, BELL_ARENA.gapNearZ + 0.3 - gapLength / 2);
      root.add(pivot, ghost);
      this.bridgeMeshes[id] = { pivot, deck, ghost };
    });
    // Billboards: they rise on posts and light up; a lit board shelters its lane.
    this.boardMeshes = {};
    Object.entries(BELL_ARENA.boards).forEach(([id, board]) => {
      const x = LANE_X[board.lane];
      const group = new THREE.Group();
      group.position.set(x, 0, board.z);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 2.25), new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide, toneMapped: false }));
      face.position.y = 2.2;
      const frame = flatBox(5.7, 2.5, 0.18, new THREE.MeshStandardMaterial({ color: 0x1a1d1f, roughness: 0.7, metalness: 0.3 }));
      frame.position.set(0, 2.2, -0.12);
      const postMaterial = new THREE.MeshStandardMaterial({ color: 0x15181a, roughness: 0.8 });
      const postA = flatBox(0.16, 1.2, 0.16, postMaterial); postA.position.set(-2.2, 0.6, -0.1);
      const postB = flatBox(0.16, 1.2, 0.16, postMaterial); postB.position.set(2.2, 0.6, -0.1);
      const panel = new THREE.Group();
      panel.add(frame, face);
      group.add(postA, postB, panel);
      const ghost = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 2.25), new THREE.MeshBasicMaterial({ color: TEAL, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
      ghost.position.set(x, 2.2, board.z + 0.02);
      root.add(group, ghost);
      this.boardMeshes[id] = { group, panel, face, ghost };
    });
    // Lamp nodes: lamp boxes on poles with paper tags (painted cards).
    this.nodeMeshes = {};
    BELL_ARENA.nodes.forEach((node) => {
      const card = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 3.0), paintedMaterial(null));
      card.position.set(node.x + 0.3, 1.5, node.z);
      root.add(card);
      this.nodeMeshes[node.id] = { card, line: node.line, state: null };
    });
    // Signal shafts: rose light down a lane when its lamp is powered.
    this.laneShafts = {};
    this.laneBeams = {};
    Object.entries(LANE_X).forEach(([lane, x]) => {
      const shaft = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 26), new THREE.MeshBasicMaterial({ color: ROSE, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }));
      shaft.rotation.x = -Math.PI / 2;
      shaft.position.set(x, 0.05, -6);
      const beam = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 34), new THREE.MeshBasicMaterial({ color: 0xffe6d8, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }));
      beam.rotation.x = -Math.PI / 2;
      beam.position.set(x, 0.08, -2);
      root.add(shaft, beam);
      this.laneShafts[lane] = shaft;
      this.laneBeams[lane] = beam;
    });
    this.nextLaneMarker = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.5, 40), new THREE.MeshBasicMaterial({ color: ROSE, transparent: true, opacity: 0.6, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
    this.nextLaneMarker.rotation.x = -Math.PI / 2;
    this.nextLaneMarker.position.set(0, 0.07, ARENA.minZ + 0.9);
    root.add(this.nextLaneMarker);
  }

  buildActors() {
    this.playerRoot = new THREE.Group();
    this.playerRoot.position.set(0, 0, 6.1);
    this.scene.add(this.playerRoot);
    this.butchRoot = new THREE.Group();
    this.butchRoot.visible = false;
    this.playerRoot.add(this.butchRoot);
    this.respawnAura = new THREE.Mesh(new THREE.RingGeometry(0.72, 0.9, 48), new THREE.MeshBasicMaterial({ color: AMBER, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    this.respawnAura.rotation.x = -Math.PI / 2;
    this.respawnAura.position.y = 0.08;
    this.respawnAura.visible = false;
    this.playerRoot.add(this.respawnAura);
    this.conductorRoot = new THREE.Group();
    this.conductorFallback = new THREE.Group();
    const coat = new THREE.Mesh(new THREE.ConeGeometry(0.82, 2.8, 8), new THREE.MeshStandardMaterial({ color: 0x15181c, roughness: 0.82 }));
    coat.position.y = 1.4;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 14), new THREE.MeshStandardMaterial({ color: 0xb58a6d, roughness: 0.75 }));
    head.position.y = 3.08;
    this.conductorFallback.add(coat, head);
    this.conductorRoot.add(this.conductorFallback);
    this.conductorRoot.position.set(0, -2.8, CONDUCTOR_Z);
    this.conductorRoot.scale.setScalar(3.8);
    this.scene.add(this.conductorRoot);
    this.paintFillUniform = { value: 0 };
    const bossAura = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.4, 64), new THREE.MeshBasicMaterial({ color: AMBER, transparent: true, opacity: 0, side: THREE.DoubleSide }));
    bossAura.rotation.x = -Math.PI / 2; bossAura.position.y = 0.04; this.conductorRoot.add(bossAura); this.bossAura = bossAura;
    this.conductorLight = new THREE.SpotLight(0xffc0c8, 0, 40, 0.34, 0.6, 1.4);
    this.conductorLight.position.set(0, 18, CONDUCTOR_Z + 8);
    this.conductorLight.target.position.set(0, 4, CONDUCTOR_Z);
    this.scene.add(this.conductorLight, this.conductorLight.target);
    this.paintCreep = new THREE.Group();
    const creepColors = [0x202126, 0x435d91, 0x4f8f7c, 0xff806f, 0xf2a541, 0x6fb7ad];
    for (let i = 0; i < 14; i += 1) {
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.24 + (i % 3) * 0.06, 0.34 + (i % 4) * 0.08), new THREE.MeshBasicMaterial({ color: creepColors[i % creepColors.length], transparent: true, opacity: 0.88, side: THREE.DoubleSide, depthWrite: false }));
      const row = Math.floor(i / 4);
      strip.position.set(((i % 4) - 1.5) * 0.31 + Math.sin(i * 1.7) * 0.08, 0.22 + row * 0.43, 0.18 + (i % 2) * 0.025);
      strip.rotation.z = Math.sin(i * 2.2) * 0.26;
      strip.visible = false;
      this.paintCreep.add(strip);
    }
    this.conductorRoot.add(this.paintCreep);
    this.paintTransfer = new THREE.Group();
    const transferColors = [0x202126, 0x435d91, 0x4f8f7c, 0xff806f, 0xf2a541];
    for (let i = 0; i < 5; i += 1) {
      const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]);
      const strand = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: transferColors[i], transparent: true, opacity: 0.96, depthWrite: false, depthTest: false }));
      strand.renderOrder = 40;
      strand.visible = false;
      this.paintTransfer.add(strand);
    }
    for (let i = 0; i < 9; i += 1) {
      const droplet = new THREE.Mesh(new THREE.CircleGeometry(0.075 + (i % 3) * 0.025, 9), new THREE.MeshBasicMaterial({ color: transferColors[i % transferColors.length], transparent: true, opacity: 0.96, depthWrite: false, depthTest: false, side: THREE.DoubleSide }));
      droplet.userData.paintDroplet = true;
      droplet.renderOrder = 41;
      droplet.visible = false;
      this.paintTransfer.add(droplet);
    }
    this.paintTransfer.visible = false;
    this.scene.add(this.paintTransfer);
    this.player = { x: 0, y: 0, z: 6.1, vy: 0, grounded: true, hp: 4, maxHp: 4, inv: 0, respawnInv: 0, respawns: 0, phaseHeals: 0, hitTimer: 0, dash: 0, dashCd: 0, attack: 0, attackCd: 0, facingX: 0, facingZ: -1, color: 0 };
    this.boss = { x: 0, z: CONDUCTOR_Z, hp: 400, maxHp: 400, phaseStartHp: 400, paintCoverage: 0, inv: 0, exposed: 0, attackClock: 1.4, stagger: 0, gesture: 'idle', gestureTime: 0, reaction: 'idle', flash: 0, rounds: 0, phaseRound: 0, targetX: 0 };
    this.departureTrain = new THREE.Group();
    const paperPlane = (width, height, color, x, y, z = 0.08) => {
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), paperMaterial(color, this.paperTexture));
      plane.position.set(x, y, z);
      return plane;
    };
    // The night service drawn in graphite on the Painted Country's paper.
    const outline = paperPlane(13.2, 3.2, 0x242528, 0, 2.08, -0.05);
    const body = paperPlane(12.9, 2.86, 0xd9d7cf, 0, 2.1);
    const roof = paperPlane(13.35, 0.42, 0x383a3d, 0, 3.72, 0.12);
    const lowerBand = paperPlane(12.95, 0.38, 0x8a2a1e, 0, 1.03, 0.13);
    const windows = [-4.9, -3.35, -1.8, -0.25, 1.3, 2.85, 4.4].map((x) => paperPlane(1.12, 0.72, 0xe0a24a, x, 2.48, 0.16));
    const wheels = [-4.45, -1.48, 1.48, 4.45].map((x) => {
      const wheel = new THREE.Mesh(new THREE.CircleGeometry(0.43, 16), paperMaterial(0x292b2d, this.paperTexture));
      wheel.position.set(x, 0.54, 0.18);
      return wheel;
    });
    this.departureTrain.add(outline, body, roof, lowerBand, ...windows, ...wheels);
    this.departureTrain.visible = false;
    this.scene.add(this.departureTrain);
  }

  // Painted actors, floors and props. Called once the paper grain and the
  // panorama chunks have loaded (and the fonts, for the claim names).
  paintWorldArt(sources) {
    const lostFront = paintLostPropertyFloor({ arena: ARENA, seams: PANEL_SEAMS, era: 'present', ...sources });
    const lostPast = paintLostPropertyFloor({ arena: ARENA, seams: PANEL_SEAMS, era: 'past', ...sources });
    this.lostFloor.material.dispose();
    this.lostFloor.material = lensFloorMaterial(canvasTexture(lostFront.canvas), canvasTexture(lostPast.canvas));
    const rim = paintLensRimCanvas(140);
    this.lensRim.material.map = canvasTexture(rim);
    this.lensRim.material.needsUpdate = true;
    const rimScale = (LENS_RADIUS * 2) * (rim.width / 280);
    this.lensRim.scale.set(rimScale, rimScale, 1);
    const backdrop = paintConductorCarBackdrop(sources);
    this.lostBackdrop.material.map = canvasTexture(backdrop);
    this.lostBackdrop.material.color.setHex(0x9a8a78);
    this.lostBackdrop.material.needsUpdate = true;
    this.trainArt = {
      side: canvasTexture(paintInkTrain({ era: 'present' })),
      sidePast: canvasTexture(paintInkTrain({ era: 'past' })),
      front: canvasTexture(paintInkTrainFront({ era: 'present' })),
      frontPast: canvasTexture(paintInkTrainFront({ era: 'past' })),
    };
    this.caseArt = CLAIMS.map((claim, index) => ({
      claim,
      present: canvasTexture(paintClaimCase({ era: 'present', claim, seed: index + 3, tone: ['#6d4a2c', '#5b3a24', '#7a5a3a', '#4a3a30'][index % 4] })),
      past: canvasTexture(paintClaimCase({ era: 'past', claim, seed: index + 3, tone: ['#6d4a2c', '#5b3a24', '#7a5a3a', '#4a3a30'][index % 4] })),
    }));
    // II
    const pools = BELL_ARENA.nodes.map((node) => ({ x: node.x, z: node.z + 0.4, r: 3.4, alpha: 0.36, color: node.line === 'rose' ? 'rgba(230, 170, 150, 0.9)' : 'rgba(255, 190, 110, 0.9)' }));
    const setMap = (mesh, canvas) => { mesh.material.map = canvasTexture(canvas); mesh.material.color.setHex(0xffffff); mesh.material.needsUpdate = true; };
    setMap(this.rainRoofNear, paintRoofSection({ z0: BELL_ARENA.gapNearZ, z1: 10, lanes: LANE_X, lights: pools, rim: 'top', seed: 5 }));
    setMap(this.rainRoofFar, paintRoofSection({ z0: CONDUCTOR_Z - 6, z1: BELL_ARENA.gapFarZ, lanes: LANE_X, lights: Object.values(LANE_X).map((x) => ({ x, z: CONDUCTOR_Z + 2, r: 4, alpha: 0.22 })), rim: 'bottom', seed: 9 }));
    setMap(this.rainStreet, paintStreetBelow({ width: RAIN_FLOOR.x1 - RAIN_FLOOR.x0 + 30, depth: BELL_ARENA.gapNearZ - BELL_ARENA.gapFarZ + 2 }));
    this.rainGapWalls.forEach((wall, index) => setMap(wall, paintGapWall({ width: RAIN_FLOOR.x1 - RAIN_FLOOR.x0 + 30, height: 7, seed: 4 + index })));
    this.rainSkyline.material.map = canvasTexture(paintRainSkyline());
    this.rainSkyline.material.color.setHex(0xffffff);
    this.rainSkyline.material.needsUpdate = true;
    const deck = canvasTexture(paintBridgeDeck(400, 150));
    Object.values(this.bridgeMeshes).forEach(({ deck: mesh }) => { mesh.material.map = deck; mesh.material.needsUpdate = true; });
    this.billboardArt = { dark: canvasTexture(paintBillboardFace(false)), lit: canvasTexture(paintBillboardFace(true)) };
    Object.values(this.boardMeshes).forEach(({ face }) => { face.material.map = this.billboardArt.dark; face.material.color.setHex(0xffffff); face.material.needsUpdate = true; });
    this.nodeArt = {};
    ['amber', 'teal', 'rose'].forEach((line) => {
      this.nodeArt[line] = Object.fromEntries(['idle', 'queued', 'powering'].map((state) => [state, canvasTexture(paintLampNode({ line, state }))]));
    });
    this.syncNodeArt(true);
    // Actors
    const butchInk = {
      idle: paintInkButch({ pose: 'idle' }),
      walk0: paintInkButch({ pose: 'walk', phase: 0 }), walk1: paintInkButch({ pose: 'walk', phase: 0.25 }),
      walk2: paintInkButch({ pose: 'walk', phase: 0.5 }), walk3: paintInkButch({ pose: 'walk', phase: 0.75 }),
      punch: paintInkButch({ pose: 'punch' }), hurt: paintInkButch({ pose: 'hurt' }), jump: paintInkButch({ pose: 'walk', phase: 0.12 }),
    };
    const butchRain = {
      idle: paintRainFigure({ pose: 'idle' }),
      walk0: paintRainFigure({ pose: 'run', phase: 0 }), walk1: paintRainFigure({ pose: 'run', phase: 0.25 }),
      walk2: paintRainFigure({ pose: 'run', phase: 0.5 }), walk3: paintRainFigure({ pose: 'run', phase: 0.75 }),
      punch: paintRainFigure({ pose: 'punch' }), hurt: paintRainFigure({ pose: 'hurt' }), jump: paintRainFigure({ pose: 'jump' }),
    };
    this.puppet = new PaperActor(this.textureLoader, [
      { painted: true, width: 2.4 * (64 / 86), height: 2.4, frames: butchInk },
      { painted: true, width: 2.6 * (butchRain.idle.width / butchRain.idle.height), height: 2.6, frames: butchRain, lift: -0.1 },
      null,
      { width: 1.5, height: 2.5, frames: { idle: ch4ButchIdleUrl, walk0: ch4ButchIdleUrl, walk1: ch4ButchWalk1Url, walk2: ch4ButchWalk2Url, walk3: ch4ButchWalk3Url, jump: ch4ButchWalk1Url } },
    ]);
    this.playerRoot.add(this.puppet.root);
    const conductorRain = paintRainFigure({ spec: CONDUCTOR_RAIN_SPEC, pose: 'idle', scale: 4 });
    const conductorRainLit = paintRainFigure({ spec: CONDUCTOR_RAIN_SPEC, pose: 'idle', scale: 4, lit: true });
    const conductorInk = paintInkConductor({});
    this.conductorPaper = new PaperActor(this.textureLoader, [
      { painted: true, width: 3.8 * (conductorInk.width / conductorInk.height), height: 3.8, frames: { idle: conductorInk } },
      { painted: true, width: 3.9 * (conductorRain.width / conductorRain.height), height: 3.9, frames: { idle: conductorRain, punch: conductorRainLit, hurt: conductorRainLit } },
      null,
      { width: 1.75, height: 3.8, frames: { idle: ch4ConductorUrl } },
    ]);
    const paintedConductorFace = this.conductorPaper.cards[3].face;
    paintedConductorFace.material.onBeforeCompile = (shader) => {
      shader.uniforms.uPaintCoverage = this.paintFillUniform;
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uPaintCoverage;');
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        float paintEdge = 1.0 - smoothstep(uPaintCoverage - 0.025, uPaintCoverage + 0.055, vMapUv.y);
        vec3 paintA = vec3(0.263, 0.365, 0.569);
        vec3 paintB = vec3(0.310, 0.561, 0.486);
        vec3 paintC = vec3(1.000, 0.502, 0.435);
        float band = fract(vMapUv.x * 2.7 + vMapUv.y * 1.35);
        vec3 paintColor = band < 0.34 ? paintA : band < 0.67 ? paintB : paintC;
        diffuseColor.rgb = mix(diffuseColor.rgb, paintColor, paintEdge * 0.82);`);
    };
    paintedConductorFace.material.customProgramCacheKey = () => 'paint-creep-v1';
    // He stands far back: keep the fog off his painted cards so he reads.
    this.conductorPaper.cards.forEach((card) => { if (card.face?.material) card.face.material.fog = false; });
    this.conductorRoot.add(this.conductorPaper.root);
    this.setConductorWorld(this.phase, true);
    this.puppet.setForm(this.phase, true);
    this.puppet.root.visible = this.phase !== 2;
  }

  buildHud() {
    this.hud = document.createElement('div');
    this.hud.className = 'battle-hud hidden';
    this.hud.style.cssText = 'position:absolute;inset:0;z-index:8;pointer-events:none;';
    this.container.appendChild(this.hud);
    this.ticketBar = createTicketBar(this.hud, { name: 'THE CONDUCTOR', serial: 'CLAIM 1978-0412' });
    this.plaque = document.createElement('div');
    this.plaque.className = 'nf-plaque';
    this.plaque.innerHTML = '<b></b><span></span>';
    this.hud.append(this.plaque);
    createStoneRow(this.hud);
    this.bellMeter = createBellMeter(this.hud);
    this.bellMeter.setVisible(false);
    this.layers = document.createElement('div');
    this.layers.className = 'nf-layers';
    this.layers.innerHTML = '<b></b><div class="nf-layers__row"></div><small></small>';
    this.hud.append(this.layers);
    this.toastEl = document.createElement('div');
    this.toastEl.className = 'nf-toast';
    this.hintEl = document.createElement('div');
    this.hintEl.className = 'nf-hint';
    this.hud.append(this.toastEl, this.hintEl);
    this.tags = createTagLayer(this.hud);
    this.caption = document.createElement('section');
    this.caption.className = 'nf-caption';
    this.caption.hidden = true;
    this.caption.innerHTML = '<p class="nf-caption__speaker"></p><p class="nf-caption__text"></p><div class="nf-caption__choices nf-caption__choices--pair"></div><span class="nf-caption__meta"></span>';
    this.caption.style.pointerEvents = 'auto';
    this.hud.append(this.caption);
    this.caption.addEventListener('click', (event) => {
      const button = event.target.closest('[data-choice]');
      if (button) this.chooseAnswer(Number(button.dataset.choice));
    });
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    });
    window.addEventListener('keydown', (event) => {
      if (globalThis.NIGHTFALL_PAUSED) return;
      this.keys.add(event.code);
      if (event.repeat) return;
      if (event.code === 'Space') { event.preventDefault(); this.spaceAction(); }
      if (event.code === 'ShiftLeft' || event.code === 'ShiftRight' || event.code === 'KeyX') this.dash();
      if (this.debate.isOpen && /^(Digit|Numpad)[12]$/.test(event.code)) this.chooseAnswer(Number(event.code.slice(-1)) - 1);
      if (event.code === 'KeyL' && this.phase === 0) { this.lost.lensMode = 'orbit'; this.lost.lastPointer = -Infinity; this.toast('LENS · CIRCLING BUTCH'); }
      if (event.code === 'KeyF' && this.mode !== 'menu') {
        if (!document.fullscreenElement) document.querySelector('.stage-wrap')?.requestFullscreen?.(); else document.exitFullscreen?.();
      }
    });
    window.addEventListener('keyup', (event) => this.keys.delete(event.code));
    window.addEventListener('blur', () => this.keys.clear());
    this.renderer.domElement.addEventListener('contextmenu', (event) => { if (this.mode === 'play') event.preventDefault(); });
    this.renderer.domElement.addEventListener('pointerdown', (event) => {
      if (this.mode === 'play' && this.phase === 0 && event.button === 0) { this.aimLensAt(event); this.spaceAction(); return; }
      this.handlePaintPointer(event);
    });
    this.renderer.domElement.addEventListener('pointermove', (event) => {
      if (this.phase === 0) this.aimLensAt(event);
      this.updatePaintPointer(event);
    });
    this.renderer.domElement.addEventListener('pointerup', (event) => this.releasePaintPointer(event));
    this.renderer.domElement.addEventListener('pointercancel', (event) => this.releasePaintPointer(event));
    this.renderer.domElement.addEventListener('pointerleave', () => { if (this.paintHold.active) this.releasePaintPointer({ button: this.paintHold.button }); });
  }

  groundPointFromPointer(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointerNdc.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const ray = this.raycaster.ray;
    if (Math.abs(ray.direction.y) < 0.0001) return null;
    const distance = -ray.origin.y / ray.direction.y;
    return distance > 0 ? ray.at(distance, new THREE.Vector3()) : null;
  }

  // ------------------------------------------------------------ utilities

  toast(text, hold = 2.2) {
    this.toastEl.textContent = text;
    this.toastEl.classList.remove('show');
    void this.toastEl.offsetWidth;
    this.toastEl.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastEl.classList.remove('show'), hold * 1000);
    this.lastToast = text;
  }

  hint(text) {
    if (!text) { this.hintEl.classList.remove('show'); this.hintText = ''; return; }
    if (this.hintText === text && this.hintEl.classList.contains('show')) return;
    this.hintText = text;
    this.hintEl.innerHTML = text;
    this.hintEl.classList.add('show');
  }

  screenPoint(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    if (v.z > 1) return null;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    return { x: (v.x + 1) * 0.5 * w, y: (1 - v.y) * 0.5 * h };
  }

  playVoice(cue, onEnded = null) {
    if (!cue?.url || !this.voiceAudio || !soundEnabled) { setTimeout(() => onEnded?.(), Math.min(4200, 900 + (cue?.text?.length ?? 0) * 45)); return false; }
    this.voiceAudio.pause();
    this.voiceAudio.src = cue.url;
    this.voiceAudio.currentTime = 0;
    this.voiceState = { playing: true, speaker: cue.speaker, tone: cue.tone, text: cue.text };
    music.setDialogueActive(true);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      this.voiceState.playing = false;
      music.setDialogueActive(false);
      onEnded?.();
    };
    this.voiceAudio.onended = finish;
    this.voiceAudio.onerror = finish;
    this.voiceAudio.play().catch(() => setTimeout(finish, Math.min(4200, 900 + (cue.text?.length ?? 0) * 45)));
    return true;
  }

  async loadAssets() {
    const artPromise = loadFinaleArtSources().then(async (sources) => {
      await (document.fonts?.ready ?? Promise.resolve());
      this.paintWorldArt(sources);
    }).catch((error) => this.assetErrors.push({ id: 'finale-art', message: error?.message || String(error) }));
    await MeshoptDecoder.ready;
    const urls = { conductor: PUBLIC_ASSETS.conductorUrl, butch: PUBLIC_ASSETS.butchUrl, chapter3Animations: PUBLIC_ASSETS.chapter3AnimationsUrl, trash: PUBLIC_ASSETS.trashUrl, bench: PUBLIC_ASSETS.benchUrl, speaker: PUBLIC_ASSETS.speakerUrl };
    await Promise.all([artPromise, ...Object.entries(urls).map(async ([id, url]) => {
      try {
        const gltf = await this.loader.loadAsync(url);
        this.assets.set(id, { root: shadows(gltf.scene), animations: gltf.animations });
      } catch (error) {
        this.assetErrors.push({ id, message: error?.message || String(error) });
      }
    })]);
    this.installConductor();
    this.installButch();
    this.assetsReady = true;
  }

  cloneAsset(id, height, width = Infinity) {
    const source = this.assets.get(id);
    return source ? fitModel(source.root.clone(true), height, width) : null;
  }

  installConductor() {
    const source = this.assets.get('conductor');
    if (!source) return;
    const root = fitModel(cloneSkeleton(source.root), 3.8);
    root.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      child.material = child.material.clone();
      child.material.color?.lerp(new THREE.Color(0x161a20), 0.55);
    });
    this.conductorFallback.visible = false;
    this.conductorRoot.add(root);
    this.conductorModel = root;
    if (source.animations.length) {
      this.conductorMixer = new THREE.AnimationMixer(root);
      this.conductorActions = Object.fromEntries(source.animations.map((clip) => [clip.name, this.conductorMixer.clipAction(clip)]));
      this.playConductorAction('Idle_Loop');
    }
    this.setConductorWorld(this.phase, true);
  }

  setConductorWorld(index, immediate = false) {
    const isEchoCity = index === 2;
    // Movement III uses the full 3D rig: kept small enough that his head
    // never slides under the ticket bar at the top of the screen.
    this.conductorRoot.scale.setScalar(isEchoCity ? 3.55 : 3.8);
    this.conductorPaper?.setForm(index, immediate);
    if (this.conductorPaper) this.conductorPaper.root.visible = !isEchoCity;
    this.conductorFallback.visible = isEchoCity ? !this.conductorModel : !this.conductorPaper;
    if (this.conductorModel) this.conductorModel.visible = isEchoCity;
    this.conductorRoot.userData.form = isEchoCity ? 'echo-city-3d' : `${PHASES[index].id}-paper`;
  }

  playConductorAction(name, once = false) {
    const action = this.conductorActions?.[name];
    if (!action) return;
    if (action === this.conductorAction && !once) return;
    this.conductorAction?.fadeOut(0.12);
    action.stop();
    action.reset().fadeIn(0.12);
    action.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
    action.clampWhenFinished = once;
    action.play();
    this.conductorAction = action;
  }

  installButch() {
    const source = this.assets.get('butch');
    if (!source) return;
    const root = fitModel(cloneSkeleton(source.root), 3.15);
    this.butchRoot.add(root);
    const sharedAnimations = this.assets.get('chapter3Animations')?.animations || [];
    const animationClips = [...sharedAnimations, ...source.animations];
    if (animationClips.length) {
      this.butchMixer = new THREE.AnimationMixer(root);
      this.butchActions = Object.fromEntries(animationClips.map((clip) => [clip.name.replace(/_Rig$/, ''), this.butchMixer.clipAction(clip)]));
      this.playButchAction('Idle_Loop', false, true);
    }
  }

  playButchAction(name, once = false, immediate = false) {
    const next = this.butchActions?.[name];
    if (!next || (this.butchAction === next && !once)) return Boolean(next);
    const previous = this.butchAction;
    next.enabled = true;
    next.reset();
    next.setEffectiveTimeScale(1);
    next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
    next.clampWhenFinished = once;
    if (previous && !immediate) previous.crossFadeTo(next, 0.14, true);
    else previous?.stop();
    next.play();
    this.butchAction = next;
    this.butchActionState = name;
    return true;
  }

  // ------------------------------------------------------------ lifecycle

  begin({ movement = 0 } = {}) {
    const startMovement = THREE.MathUtils.clamp(Math.round(movement), 0, PHASES.length - 1);
    this.clearCombat();
    this.mode = 'play';
    this.phase = startMovement;
    this.elapsed = 0;
    this.transition = null;
    this.tutorialShown = new Set();
    this.deaths.reset();
    this.player.maxHp = D().layers;
    this.player.hp = this.player.maxHp;
    Object.assign(this.player, { x: 0, y: 0, z: 6.1, vy: 0, grounded: true, inv: 1, respawnInv: 0, respawns: 0, phaseHeals: 0, hitTimer: 0, dash: 0, dashCd: 0, attack: 0, attackCd: 0, color: 0 });
    Object.assign(this.boss, { x: 0, targetX: 0, z: CONDUCTOR_Z, hp: PHASE_START_HP[startMovement], phaseStartHp: PHASE_START_HP[startMovement], paintCoverage: 0, inv: 0, exposed: 0, attackClock: 1.4, stagger: 0, gesture: 'idle', gestureTime: 0, reaction: 'idle', flash: 0, rounds: 0, phaseRound: 0 });
    this.playerRoot.position.set(0, 0, 6.1);
    this.conductorRoot.position.set(0, -2.8, CONDUCTOR_Z);
    this.conductorRoot.visible = true;
    this.setWorld(startMovement);
    this.puppet?.setForm(startMovement, true);
    this.hud.classList.remove('hidden');
    this.enterMovement(startMovement, { first: true });
    stampAnnounce(this.hud, 'DEPARTING');
    this.updateHud();
  }

  // Everything a movement needs the moment the player lands in it.
  enterMovement(index, { first = false } = {}) {
    const phase = PHASES[index];
    const card = () => showTitleCard({ kicker: `MOVEMENT ${phase.number}`, main: phase.world, sub: phase.rule, duration: 4000, parent: this.hud });
    clearTimeout(this.titleTimer);
    if (first) this.titleTimer = setTimeout(card, 1250); else card();
    if (index === 0) this.startLostProperty();
    if (index === 1) this.startBellArena();
    if (index === 2) this.startEchoCity();
    if (index === 3) this.startPaintOnboarding();
  }

  clearCombat() {
    [...this.hazards, ...this.projectiles, ...this.effects].forEach((item) => this.scene.remove(item.root || item));
    this.hazards = [];
    this.projectiles = [];
    this.effects = [];
    this.clearLostProperty();
    this.portal.visible = false;
    this.holeVisuals?.forEach((hole) => { hole.visible = false; });
    this.closeCaption();
    this.dialoguePause = false;
    this.activeHoles = [];
    this.playerRoot.visible = true;
    this.departureTrain.visible = false;
    if (this.paintTransfer) {
      this.paintTransfer.visible = false;
      this.paintTransfer.children.forEach((item) => { item.visible = false; });
    }
    this.stampScene?.remove();
    this.stampScene = null;
    this.hint('');
    this.stopMusic();
  }

  setWorld(index) {
    this.worldRoots.forEach((root, i) => { root.visible = i === index; });
    const phase = PHASES[index];
    const fogColors = [0x0f0a07, 0x070c10, 0x19242c, 0xe5dfce];
    const fogDensity = [0.012, 0.016, 0.018, 0.018];
    this.scene.background.setHex(fogColors[index]);
    this.scene.fog.color.setHex(fogColors[index]);
    this.scene.fog.density = fogDensity[index];
    this.rim.color.setHex([AMBER, ROSE, 0x9fd9cf, 0xff806f][index]);
    this.key.color.setHex(index === 3 ? 0xffedcf : index === 2 ? 0xd5efff : index === 1 ? 0xb8c8d0 : 0xffe7c0);
    this.key.intensity = index === 1 ? 1.6 : 3.6;
    this.hemi.intensity = index === 1 ? 0.9 : 2.2;
    this.rain.visible = index === 1;
    this.lensRim.visible = index === 0;
    if (this.puppet) this.puppet.root.visible = index !== 2;
    this.butchRoot.visible = index === 2;
    this.setConductorWorld(index);
    this.holeVisuals.forEach((hole) => { hole.visible = false; });
    this.activeHoles = [];
    this.paintTutorial = { stage: index === 3 ? 'await-pigment' : 'pending' };
    this.boss.phaseStartHp = PHASE_START_HP[index];
    this.boss.paintCoverage = index === 3 ? Math.max(0, (100 - this.boss.hp) / 88) : 0;
    this.conductorLight.intensity = 0;
    this.bellMeter.setVisible(index === 1);
    this.hud.classList.toggle('has-bell', index === 1);
    if (index !== 1) { bellAudio.setRain?.(0); }
    this.updatePaintCreep();
    this.playMusic(phase.music);
  }

  updatePaintCreep() {
    const coverage = THREE.MathUtils.clamp(this.boss.paintCoverage || 0, 0, 1);
    this.paintFillUniform.value = coverage;
    this.paintCreep.visible = this.phase === 3 && coverage > 0;
    this.paintCreep.children.forEach((strip, index) => {
      strip.visible = index < Math.ceil(coverage * this.paintCreep.children.length);
      strip.material.opacity = 0.72 + Math.sin(this.elapsed * 5 + index) * 0.12;
    });
  }

  // ------------------------------------------------------------ input verbs

  jump() {
    if (!['play', 'departure'].includes(this.mode) || this.transition || !this.player.grounded) return;
    this.player.vy = 8.7;
    this.player.grounded = false;
    this.tone(330, 0.08, 'triangle', 0.03);
  }

  dash() {
    if (this.mode !== 'play' || this.transition || this.player.dashCd > 0) return;
    this.player.dash = 0.18;
    this.player.dashCd = 0.72;
    this.player.inv = Math.max(this.player.inv, 0.3);
    this.trauma = Math.max(this.trauma, 0.12);
    this.tone(410, 0.09, 'sawtooth', 0.03);
  }

  spaceAction() {
    if (this.mode === 'departure') { this.jumpAboardDepartureTrain(); return; }
    if (this.mode !== 'play' || this.transition || this.dialoguePause) return;
    this.player.attack = 0.26;
    if (this.phase === 0) { this.punchLostProperty(); return; }
    if (this.phase === 1) { this.punchBellArena(); return; }
    if (this.phase === 2) { if (!this.punchEchoWindow()) this.jump(); return; }
    this.jump();
  }

  // ======================================================== Movement I

  aimLensAt(event) {
    if (this.mode !== 'play' || this.phase !== 0) return;
    const point = this.groundPointFromPointer(event);
    if (!point) return;
    this.lost.lensTarget = { x: THREE.MathUtils.clamp(point.x, ARENA.minX, ARENA.maxX), z: THREE.MathUtils.clamp(point.z, ARENA.minZ, ARENA.maxZ) };
    this.lost.lensMode = 'mouse';
    this.lost.lastPointer = this.elapsed;
  }

  startLostProperty() {
    this.clearLostProperty();
    this.lost.tutorial = 'lens';
    this.lost.returned = 0;
    this.boss.attackClock = 999;
    // One tagged case lands beside Butch; nothing else moves until it is read.
    this.spawnClaimCase({ x: 3.4, z: 4.2, tutorial: true, delay: 1.2 });
  }

  clearLostProperty() {
    [...(this.lost?.cases ?? []), ...(this.lost?.trains ?? [])].forEach((item) => { this.scene.remove(item.root); item.telegraph && this.scene.remove(item.telegraph); });
    if (this.lost) { this.lost.cases = []; this.lost.trains = []; }
    if (this.seamGlows) { this.seamGlows.x.material.opacity = 0; this.seamGlows.z.material.opacity = 0; }
  }

  spawnClaimCase({ x = null, z = null, tutorial = false, delay = 0 } = {}) {
    if (!this.caseArt) return null;
    const px = x ?? THREE.MathUtils.clamp(this.player.x + THREE.MathUtils.randFloatSpread(9), ARENA.minX + 1.5, ARENA.maxX - 1.5);
    let pz = z ?? THREE.MathUtils.clamp(this.player.z + THREE.MathUtils.randFloatSpread(6), ARENA.minZ + 1.2, ARENA.maxZ - 1.2);
    // never on a seam: cases lie on the pictures, the rails stay clear
    if (Math.abs(pz - PANEL_SEAMS.z) < 1.2) pz += pz >= PANEL_SEAMS.z ? 1.3 : -1.3;
    const art = this.caseArt[this.lost.claimIndex % this.caseArt.length];
    this.lost.claimIndex += 1;
    const root = new THREE.Group();
    root.position.set(px, 0, pz);
    const card = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 2.5 * (58 / 84)), paintedMaterial(art.present));
    card.position.set(0, 12, 0);
    root.add(card);
    const telegraph = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.25, 40), new THREE.MeshBasicMaterial({ color: AMBER, transparent: true, opacity: 0.3, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
    telegraph.rotation.x = -Math.PI / 2;
    telegraph.position.set(px, 0.06, pz);
    this.scene.add(root, telegraph);
    const item = {
      root, card, telegraph, art, claim: art.claim, x: px, z: pz, tagX: px + 0.65, tagZ: pz,
      timer: (tutorial ? 0.6 : D().telegraph + 0.35) + delay, landed: false, returned: false, life: tutorial ? Infinity : 8.5, tutorial, hitChecked: false, revealed: false,
    };
    this.lost.cases.push(item);
    return item;
  }

  spawnSeamTrain({ seam = 'z', dir = 1, ghost = false, delay = 0 } = {}) {
    if (!this.trainArt) return null;
    const along = seam === 'z' ? 'x' : 'z';
    const front = seam === 'x';
    const map = front ? (ghost ? this.trainArt.frontPast : this.trainArt.front) : (ghost ? this.trainArt.sidePast : this.trainArt.side);
    const height = front ? 3.1 : 3.2;
    const width = front ? height * (60 / 64) : height * (150 / 50);
    const material = ghost ? lensClipMaterial(map, { opacity: 0.95 }) : paintedMaterial(map);
    const card = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
    card.renderOrder = ghost ? 6 : 2;
    const root = new THREE.Group();
    root.add(card);
    card.position.y = height / 2 + 0.05;
    if (!front && dir < 0) card.scale.x = -1;
    const start = along === 'x' ? -24 * dir : -22 * dir;
    if (along === 'x') root.position.set(start, 0, PANEL_SEAMS.z);
    else root.position.set(PANEL_SEAMS.x, 0, start);
    root.visible = false;
    this.scene.add(root);
    const train = {
      root, card, seam, along, dir, ghost, front, length: front ? 4.2 : width * 0.94, progress: start,
      timer: D().telegraph + (ghost ? 0.9 : 0.55) + delay, running: false, hitChecked: false,
      speed: (ghost ? 13 : 17) * D().speedScale, life: 5,
      tailX: 0, tailZ: 0, headX: 0, headZ: 0, halfWidth: 0.6,
    };
    this.lost.trains.push(train);
    this.tone(ghost ? 880 : 62, ghost ? 0.4 : 0.22, ghost ? 'sine' : 'square', ghost ? 0.012 : 0.03);
    return train;
  }

  punchLostProperty() {
    const p = this.player;
    const nearest = this.lost.cases.filter((item) => item.landed && !item.returned)
      .map((item) => ({ item, d: Math.hypot(item.x - p.x, item.z - p.z) }))
      .sort((a, b) => a.d - b.d)[0];
    if (!nearest || nearest.d > CASE_REACH) { this.jump(); return; }
    const result = punchCase(nearest.item, this.lost.lens, p);
    if (result.result === 'unread') {
      bellAudio.refused();
      this.toast(this.lost.lensMode === 'mouse' ? 'READ THE TAG FIRST · PUT THE LENS ON IT' : 'READ THE TAG FIRST · WAIT FOR THE LENS');
      return;
    }
    if (result.result !== 'returned') return;
    const item = nearest.item;
    item.returned = true;
    bellAudio.punchClack();
    this.spawnImpact(item.x, 1, item.z, AMBER);
    this.lost.returned += 1;
    // the case flies back along the line to the Conductor
    const start = item.root.position.clone().add(new THREE.Vector3(0, 0.9, 0));
    const target = new THREE.Vector3(this.boss.x, 6.4, this.boss.z + 0.8);
    this.scene.remove(item.telegraph);
    item.root.remove(item.card);
    const flying = new THREE.Group();
    flying.add(item.card);
    item.card.position.set(0, 0, 0);
    flying.position.copy(start);
    this.scene.add(flying);
    this.projectiles.push({ root: flying, type: 'claim', damage: result.damage, tutorial: item.tutorial, life: 1.4, age: 0, duration: 0.9, start, target });
    this.scene.remove(item.root);
    this.lost.cases = this.lost.cases.filter((entry) => entry !== item);
    this.toast(`CLAIM ${item.claim.split('·')[0].trim()} · RETURNED`);
  }

  updateLostProperty(dt) {
    const L = this.lost;
    const p = this.player;
    // The lens: the mouse aims it; without a mouse it circles Butch.
    const mouseLive = L.lensMode === 'mouse' && this.elapsed - L.lastPointer < 3.5;
    const goal = mouseLive ? L.lensTarget : orbitLens(p, this.elapsed, { facingX: p.facingX, facingZ: p.facingZ });
    if (!mouseLive) L.lensMode = 'orbit';
    const k = 1 - Math.exp(-dt * (mouseLive ? 18 : 6));
    L.lens.x += (goal.x - L.lens.x) * k;
    L.lens.z += (goal.z - L.lens.z) * k;
    lensUniforms.uLens.value.set(L.lens.x, L.lens.z);
    this.lensRim.position.set(L.lens.x, 0.05, L.lens.z);
    this.lensRim.rotation.z += dt * 0.15;

    // cases
    L.cases.forEach((item) => {
      if (item.timer > 0) {
        item.timer -= dt;
        item.telegraph.material.opacity = 0.18 + Math.abs(Math.sin(item.timer * 10)) * 0.28;
        return;
      }
      if (!item.landed) {
        item.card.position.y = Math.max(0.86, item.card.position.y - 22 * D().speedScale * dt);
        item.card.rotation.z = Math.sin(this.elapsed * 12) * 0.18 * (item.card.position.y - 0.86) / 10;
        if (item.card.position.y <= 0.861) {
          item.landed = true;
          item.card.rotation.z = 0;
          item.telegraph.material.opacity = 0.12;
          this.spawnImpact(item.x, 0.4, item.z, AMBER);
          this.trauma = Math.max(this.trauma, 0.35);
          this.tone(96, 0.14, 'square', 0.03);
          if (!item.tutorial && Math.hypot(p.x - item.x, p.z - item.z) < 1.25 && p.y < 1) this.takeHit();
        }
        return;
      }
      item.life -= dt;
      const revealed = underLens(L.lens, item.tagX, item.tagZ);
      if (revealed !== item.revealed) {
        item.revealed = revealed;
        item.card.material.map = revealed ? item.art.past : item.art.present;
        item.card.material.needsUpdate = true;
        if (revealed) bellAudio.paper?.();
      }
      item.card.lookAt(this.camera.position.x, item.card.getWorldPosition(new THREE.Vector3()).y, this.camera.position.z);
      if (item.life < 1.2) item.card.material.opacity = Math.max(0, item.life / 1.2);
    });
    L.cases.filter((item) => item.life <= 0).forEach((item) => { this.scene.remove(item.root); this.scene.remove(item.telegraph); });
    L.cases = L.cases.filter((item) => item.life > 0);

    // trains in the seams
    let glowX = 0;
    let glowZ = 0;
    L.trains.forEach((train) => {
      if (!train.running) {
        train.timer -= dt;
        const pulse = 0.2 + Math.abs(Math.sin(train.timer * 9)) * 0.35;
        const strength = train.ghost ? pulse * 0.28 : pulse;
        if (train.seam === 'x') glowX = Math.max(glowX, strength); else glowZ = Math.max(glowZ, strength);
        if (train.timer <= 0) { train.running = true; train.root.visible = true; this.trauma = Math.max(this.trauma, train.ghost ? 0.08 : 0.2); }
        return;
      }
      train.progress += train.speed * train.dir * dt;
      train.life -= dt;
      if (train.along === 'x') train.root.position.x = train.progress;
      else train.root.position.z = train.progress;
      const head = train.progress + train.dir * (train.front ? 0.3 : train.length / 2);
      const tail = train.progress - train.dir * (train.front ? train.length : train.length / 2);
      if (train.along === 'x') Object.assign(train, { headX: head, tailX: tail, headZ: PANEL_SEAMS.z, tailZ: PANEL_SEAMS.z });
      else Object.assign(train, { headX: PANEL_SEAMS.x, tailX: PANEL_SEAMS.x, headZ: head, tailZ: tail });
      train.revealed = !train.ghost || ghostTrainRevealed(train, L.lens);
      if (train.front) train.card.lookAt(this.camera.position.x, train.card.getWorldPosition(new THREE.Vector3()).y, this.camera.position.z);
      if (!train.hitChecked && p.y < 1.05 && trainHits(train, p)) { train.hitChecked = true; this.takeHit(); }
    });
    L.trains.filter((train) => train.life <= 0).forEach((train) => this.scene.remove(train.root));
    L.trains = L.trains.filter((train) => train.life > 0);
    this.seamGlows.x.material.opacity += (glowX - this.seamGlows.x.material.opacity) * Math.min(1, dt * 12);
    this.seamGlows.z.material.opacity += (glowZ - this.seamGlows.z.material.opacity) * Math.min(1, dt * 12);

    // onboarding: read the first tag, then punch it back
    if (L.tutorial === 'lens') {
      const first = L.cases.find((item) => item.tutorial);
      if (first?.landed) {
        const read = underLens(L.lens, first.tagX, first.tagZ);
        const near = Math.hypot(p.x - first.x, p.z - first.z) <= CASE_REACH;
        this.hint(!read
          ? (this.lost.lensMode === 'mouse' ? 'MOVE THE LENS ONTO THE TAG · <kbd>MOUSE</kbd>' : 'THE LENS CIRCLES YOU · WALK UP TO THE CASE')
          : near ? '<kbd>SPACE</kbd> / <kbd>CLICK</kbd> · RETURN THE CASE' : 'WALK UP TO THE CASE');
      } else if (!first && L.returned > 0) {
        L.tutorial = 'done';
        this.hint('');
        this.boss.attackClock = 0.8;
        this.toast('HIS TRAINS RUN IN THE SEAMS · GHOST TRAINS ONLY SHOW IN THE LENS', 3.4);
      }
    }
  }

  spawnLostPropertyBeat() {
    const round = this.boss.phaseRound;
    const story = difficulty === 'story';
    const ghostEvery = story ? 3 : 2;
    const seam = round % 2 === 0 ? 'z' : 'x';
    const dir = round % 4 < 2 ? 1 : -1;
    this.spawnSeamTrain({ seam, dir, ghost: round >= 2 && round % ghostEvery === 0 });
    if (!story && round >= 4) this.spawnSeamTrain({ seam: seam === 'z' ? 'x' : 'z', dir: -dir, ghost: round % ghostEvery !== 0, delay: 0.7 });
    const live = this.lost.cases.filter((item) => !item.returned).length;
    const cases = Math.min(story ? 2 : 3, 4 - live);
    for (let i = 0; i < cases; i += 1) {
      const aimed = i === 0 && !story;
      this.spawnClaimCase(aimed ? { x: THREE.MathUtils.clamp(this.player.x + THREE.MathUtils.randFloatSpread(1.2), ARENA.minX + 1.4, ARENA.maxX - 1.4), z: THREE.MathUtils.clamp(this.player.z + THREE.MathUtils.randFloatSpread(1.2), ARENA.minZ + 1.2, ARENA.maxZ - 1.2), delay: i * 0.15 } : { delay: i * 0.18 });
    }
    this.boss.attackClock = Math.max(2.3, (story ? 4.4 : 3.3) - Math.min(0.9, round * 0.08));
  }

  // ======================================================== Movement II

  startBellArena() {
    this.bell.arena = createBellArena({ difficulty, seed: 17 + this.player.respawns, beams: false });
    this.bell.tutorial = 'lamp';
    this.bell.beamFlash = 0;
    this.bell.telegraphLanes = [];
    this.bell.listening = false;
    this.boss.targetX = LANE_X[this.bell.arena.conductorLane];
    bellAudio.setRain?.(0.5);
    this.syncNodeArt(true);
  }

  punchBellArena() {
    const arena = this.bell.arena;
    if (!arena) return;
    const p = this.player;
    if (arena.onFrontPlatform(p.z)) {
      const result = arena.punchConductor(p.x, p.z);
      if (result.result === 'hit') {
        bellAudio.punchClack();
        this.hitBoss(result.damage, 'pain');
        this.toast('THE BORROWED LIGHT GOES BACK TO HIM');
        if (this.bell.tutorial === 'punch') { this.bell.tutorial = 'done'; this.hint(''); arena.setBeams(true); this.toast('HE FIRES ON THE OFF-BEAT · A LIT BILLBOARD SHELTERS ITS LANE', 3.6); }
      } else if (result.result === 'wrong-lane') { bellAudio.refused(); this.toast(`STAND IN THE LIT LANE · ${result.lane.toUpperCase()}`); }
      else if (result.result === 'not-lit') { bellAudio.refused(); this.toast('HE IS NOT LIT · LIGHT HIS LANE ON THE BELL'); }
      else this.jump();
      return;
    }
    const node = arena.nearestNode(p.x, p.z);
    if (!node) { this.jump(); return; }
    const result = arena.punch(node.id);
    if (result.result === 'queued') { bellAudio.punchClack(); this.toast(`${node.label} · QUEUED FOR THE BELL`); }
    else if (result.result === 'replaced') { bellAudio.punchClack(); bellAudio.fizzle(); this.toast('ONE LINE, ONE BORROWED MOMENT · THE FIRST PUNCH SEALS'); }
    else if (result.result === 'unqueued') { bellAudio.fizzle(); this.toast(`${node.label} · UNPUNCHED`); }
    else if (result.result === 'busy') { bellAudio.refused(); this.toast(`THE ${result.line.toUpperCase()} LINE IS STILL BURNING`); }
    else if (result.result === 'cut') { bellAudio.cutLine(); this.toast(`${node.label} · CUT`); }
    this.syncNodeArt();
    if (this.bell.tutorial === 'lamp' && node.line === 'rose' && ['queued', 'replaced'].includes(result.result)) this.bell.tutorial = 'bridge';
    if (this.bell.tutorial === 'bridge' && node.line === 'amber' && ['queued', 'replaced'].includes(result.result)) this.bell.tutorial = 'bell';
  }

  syncNodeArt(force = false) {
    if (!this.nodeArt) return;
    const arena = this.bell.arena;
    BELL_ARENA.nodes.forEach((node) => {
      const status = arena?.timetable.nodeStatus(node.id);
      const state = status?.powering ? 'powering' : status?.queued ? 'queued' : 'idle';
      const mesh = this.nodeMeshes[node.id];
      if (!force && mesh.state === state) return;
      mesh.state = state;
      mesh.card.material.map = this.nodeArt[node.line][state];
      mesh.card.material.needsUpdate = true;
    });
  }

  updateBellArena(dt) {
    const arena = this.bell.arena;
    if (!arena) return;
    const events = arena.update(dt * 1000);
    for (const event of events) {
      if (event.type === 'bell') { bellAudio.bell(); this.bellMeter.ring(); this.trauma = Math.max(this.trauma, 0.08); }
      else if (event.type === 'power') {
        const kind = event.machineId.startsWith('bridge') ? 'bridge' : event.machineId.startsWith('board') ? 'billboard' : 'sign';
        bellAudio.machineOn(kind);
      } else if (event.type === 'off') bellAudio.machineOff(event.machineId.startsWith('bridge') ? 'bridge' : 'billboard');
      else if (event.type === 'flicker') bellAudio.flickerTick();
      else if (event.type === 'conductor-step') { this.boss.targetX = LANE_X[event.to]; }
      else if (event.type === 'exposed') {
        this.boss.exposed = D().lampMs / 1000;
        this.boss.reaction = 'pain'; this.boss.gestureTime = 0.8;
        this.toast(`HE IS LIT · ${event.lane.toUpperCase()} LANE · CROSS AND PUNCH`, 2.4);
        if (this.bell.tutorial === 'bell' || this.bell.tutorial === 'bridge' || this.bell.tutorial === 'lamp') this.bell.tutorial = 'punch';
      } else if (event.type === 'exposure-end') { this.boss.exposed = 0; }
      else if (event.type === 'beam-telegraph') { this.bell.telegraphLanes = event.lanes; if (event.fullSweep) this.toast('FULL SWEEP ON THE OFF-BEAT · FIND SHELTER', 2.2); }
      else if (event.type === 'beam-fire') {
        this.bell.telegraphLanes = [];
        this.bell.beamLanes = event.lanes;
        this.bell.beamFlash = 0.38;
        if (event.lanes.length) { this.tone(1100, 0.22, 'sawtooth', 0.03); this.trauma = Math.max(this.trauma, 0.18); }
        const verdict = arena.resolveBeam(event.lanes, this.player.x, this.player.z);
        if (verdict === 'hit' && this.player.y < 1.2) this.takeHit();
        else if (verdict === 'sheltered') this.toast('THE BILLBOARD HOLDS');
      }
    }
    if (events.length) this.syncNodeArt();

    // Machines follow their levels.
    Object.entries(this.bridgeMeshes).forEach(([id, mesh]) => {
      const level = arena.timetable.machineStatus(id).level;
      const status = arena.timetable.machineStatus(id);
      mesh.pivot.scale.z = Math.max(0.001, level);
      mesh.pivot.visible = level > 0.01;
      mesh.deck.material.color.setHex(status.flicker && Math.sin(this.elapsed * 40) > 0 ? 0x806040 : 0xffffff);
    });
    Object.entries(this.boardMeshes).forEach(([id, mesh]) => {
      const status = arena.timetable.machineStatus(id);
      mesh.panel.position.y = -1.6 + status.level * 1.6;
      const lit = status.level > 0.6 && !(status.flicker && Math.sin(this.elapsed * 40) > 0);
      const map = lit ? this.billboardArt?.lit : this.billboardArt?.dark;
      if (map && mesh.face.material.map !== map) { mesh.face.material.map = map; mesh.face.material.needsUpdate = true; }
    });
    Object.entries(BELL_ARENA.lamps).forEach(([id, lane]) => {
      const status = arena.timetable.machineStatus(id);
      const target = status.powered ? (status.flicker ? 0.18 : 0.34) : 0;
      const shaft = this.laneShafts[lane];
      shaft.material.opacity += (target - shaft.material.opacity) * Math.min(1, dt * 10);
    });
    this.bell.beamFlash = Math.max(0, this.bell.beamFlash - dt);
    Object.entries(this.laneBeams).forEach(([lane, beam]) => {
      const firing = this.bell.beamFlash > 0 && this.bell.beamLanes.includes(lane);
      const warning = this.bell.telegraphLanes.includes(lane);
      beam.material.color.setHex(firing ? 0xfff1e6 : ROSE);
      beam.material.opacity = firing ? 0.75 * (this.bell.beamFlash / 0.38) : warning ? 0.06 + Math.abs(Math.sin(this.elapsed * 7)) * 0.1 : 0;
    });
    const lit = arena.exposure;
    this.conductorLight.intensity += ((lit ? 260 : 0) - this.conductorLight.intensity) * Math.min(1, dt * 8);
    this.conductorLight.position.x = this.boss.x;
    this.conductorLight.target.position.x = this.boss.x;
    // next stop marker at the far edge
    const next = arena.plan.lane;
    this.nextLaneMarker.position.x += (LANE_X[next] - this.nextLaneMarker.position.x) * Math.min(1, dt * 6);
    this.nextLaneMarker.material.opacity = 0.35 + Math.abs(Math.sin(this.elapsed * 3)) * 0.3;

    // Listen (hold Q): ghost outlines of what the next bell moves.
    this.bell.listening = this.keys.has('KeyQ');
    const preview = this.bell.listening ? arena.preview() : null;
    const turningOn = new Set(preview?.machines.filter((change) => change.to === 'on').map((change) => change.machineId) ?? []);
    Object.entries(this.bridgeMeshes).forEach(([id, mesh]) => { mesh.ghost.material.opacity = turningOn.has(id) ? 0.25 + Math.sin(this.elapsed * 6) * 0.08 : 0; });
    Object.entries(this.boardMeshes).forEach(([id, mesh]) => { mesh.ghost.material.opacity = turningOn.has(id) ? 0.3 : 0; });
    if (preview) Object.entries(BELL_ARENA.lamps).forEach(([id, lane]) => { if (turningOn.has(id)) this.laneShafts[lane].material.opacity = Math.max(this.laneShafts[lane].material.opacity, 0.14); });
    if (preview) preview.beamLanes.forEach((lane) => { this.laneBeams[lane].material.opacity = Math.max(this.laneBeams[lane].material.opacity, 0.12); });

    // Falling into the street gap: one layer, then back on the near roof.
    const p = this.player;
    if (p.y < 0.2 && arena.fallsAt(p.x, p.z) && p.respawnInv <= 0) {
      this.bell.falls += 1;
      const before = p.respawns;
      this.takeHit({ force: true });
      if (p.respawns === before) {
        p.x = THREE.MathUtils.clamp(p.x, -9, 9); p.z = 1.2; p.vy = 0; p.y = 0;
        p.inv = Math.max(p.inv, 1.2);
        this.playerRoot.position.set(p.x, 0, p.z);
      }
      this.toast('THE STREET IS A LONG WAY DOWN · WAIT FOR A BRIDGE');
      bellAudio.fallWhoosh?.();
    }

    // Onboarding hints, in the fiction.
    const tut = this.bell.tutorial;
    const lane = arena.plan.lane;
    if (tut === 'lamp') this.hint(`HE STEPS ${lane.toUpperCase()} ON THE NEXT BELL · PUNCH THE <kbd>ROSE</kbd> LAMP IN THAT LANE`);
    else if (tut === 'bridge') this.hint('NOW PUNCH AN <kbd>AMBER</kbd> BRIDGE · IT CROSSES THE GAP ON THE BELL');
    else if (tut === 'bell') this.hint('WAIT FOR THE BELL · HOLD <kbd>Q</kbd> TO LISTEN');
    else if (tut === 'punch') this.hint(lit ? '<kbd>SPACE</kbd> · CROSS THE BRIDGE AND PUNCH HIM WHILE HE IS LIT' : 'LIGHT HIS LANE AGAIN · ROSE LAMP + AMBER BRIDGE');
  }

  // ======================================================== Movement III

  startEchoCity() {
    this.echo = { clock: 6, window: 0, windowSpent: false, stage: 'combat', lastOutcome: null };
    this.boss.attackClock = 1.4;
  }

  openExchange() {
    const exchange = this.debate.open();
    this.clearHazards();
    this.dialoguePause = true;
    this.echo.stage = 'claim';
    this.showCaption(exchange.exchange.claim, { meta: `EXCHANGE ${this.debate.opened}` });
    this.playVoice(exchange.exchange.claim, () => {
      if (!this.debate.isOpen) return;
      this.echo.stage = 'answer';
      this.showCaption({ speaker: 'BUTCH · ANSWER', text: exchange.exchange.claim.text }, { choices: exchange.replies, meta: 'TWO TRUE THINGS' });
    });
    this.showTutorialOnce('echo-argument', 'ANSWER WITH <kbd>1</kbd> OR <kbd>2</kbd> · THE ANSWER THAT HOLDS BOTH TRUTHS LANDS');
  }

  chooseAnswer(index) {
    if (this.echo.stage !== 'answer') return;
    const outcome = this.debate.choose(index);
    if (outcome.result === 'ignored') return;
    this.echo.stage = 'reply';
    this.echo.lastOutcome = { result: outcome.result, exchangeId: outcome.exchangeId, choice: index };
    const reply = outcome.reply;
    this.showCaption(reply.cue);
    this.playVoice(reply.cue, () => {
      if (outcome.result === 'window') {
        this.closeCaption();
        this.dialoguePause = false;
        this.echo.stage = 'window';
        this.echo.window = ECHO_WINDOW_SECONDS * D().bossWindow;
        this.echo.windowSpent = false;
        this.boss.exposed = this.echo.window;
        this.boss.reaction = reply.reaction ?? 'shame';
        this.boss.gestureTime = 1.4;
        this.playConductorAction('Fixing_Kneeling', true);
        this.toast('HE HAS NO ANSWER · GO TO THE FRONT EDGE', 2.6);
        return;
      }
      this.showCaption(reply.rebut);
      this.playVoice(reply.rebut, () => {
        this.closeCaption();
        this.dialoguePause = false;
        this.echo.stage = 'combat';
        this.echo.clock = ECHO_COMBAT_INTERVAL;
        this.toast('DEFLECTED · HE WILL COME BACK TO IT');
        // The deflection costs something: the square answers with a volley.
        this.boss.attackClock = 0.1;
      });
    });
  }

  punchEchoWindow() {
    if (this.echo.stage !== 'window' || this.echo.windowSpent) return false;
    if (this.player.z > -3.4) { this.toast('CLOSER · THE FRONT EDGE'); return true; }
    this.echo.windowSpent = true;
    this.hitBoss(ECHO_WINDOW_DAMAGE, 'shame');
    this.toast('SAID TO HIS FACE');
    this.endEchoWindow();
    return true;
  }

  endEchoWindow() {
    this.echo.stage = 'combat';
    this.echo.window = 0;
    this.echo.clock = ECHO_COMBAT_INTERVAL;
    this.boss.exposed = 0;
    this.boss.attackClock = 0.8;
  }

  showCaption(cue, { choices = null, meta = '' } = {}) {
    if (!cue) return;
    this.caption.hidden = false;
    this.caption.querySelector('.nf-caption__speaker').textContent = cue.speaker;
    this.caption.querySelector('.nf-caption__text').textContent = cue.text;
    this.caption.querySelector('.nf-caption__meta').textContent = meta;
    const box = this.caption.querySelector('.nf-caption__choices');
    box.innerHTML = choices ? choices.map((reply, index) => `<button class="nf-caption__choice" type="button" data-choice="${index}"><kbd>${index + 1}</kbd>${escapeHtml(reply.cue.text)}</button>`).join('') : '';
    box.hidden = !choices;
    this.caption.classList.toggle('has-choices', Boolean(choices));
  }

  closeCaption() {
    if (!this.caption) return;
    this.caption.hidden = true;
    this.caption.querySelector('.nf-caption__choices').innerHTML = '';
    this.voiceAudio?.pause();
    this.voiceState.playing = false;
    music.setDialogueActive(false);
  }

  updateEchoCity(dt) {
    if (this.echo.stage === 'combat') {
      this.echo.clock = Math.max(0, this.echo.clock - dt);
      if (this.echo.clock <= 0 && !this.transition) this.openExchange();
    } else if (this.echo.stage === 'window') {
      this.echo.window = Math.max(0, this.echo.window - dt);
      if (this.echo.window <= 0) { this.toast('THE MOMENT PASSED'); this.endEchoWindow(); }
    }
  }

  // ======================================================== Movement IV

  handlePaintPointer(event) {
    if (this.mode !== 'play' || this.phase !== 3 || this.transition || this.dialoguePause) return;
    if (![0, 2].includes(event.button)) return;
    event.preventDefault();
    const point = this.groundPointFromPointer(event);
    const target = event.button === 2 ? this.findAbsorbablePaint(point) : null;
    this.paintHold = { active: true, button: event.button, elapsed: 0, point, target, completed: false };
    this.renderer.domElement.setPointerCapture?.(event.pointerId);
    this.updatePaintTransfer(0);
  }

  updatePaintPointer(event) {
    if (!this.paintHold.active) return;
    this.paintHold.point = this.groundPointFromPointer(event);
    if (this.paintHold.button === 2) this.paintHold.target = this.findAbsorbablePaint(this.paintHold.point);
  }

  releasePaintPointer(event) {
    if (!this.paintHold.active || (event.button >= 0 && event.button !== this.paintHold.button)) return;
    this.paintHold.target?.asset?.scale.setScalar(1);
    this.paintHold = { active: false, button: -1, elapsed: 0, point: null, target: null, completed: false };
    this.paintTransfer.visible = false;
    this.paintTransfer.children.forEach((item) => { item.visible = false; });
  }

  updatePaintHold(dt) {
    if (!this.paintHold.active || this.phase !== 3 || this.mode !== 'play') return;
    this.paintHold.elapsed += dt;
    const progress = THREE.MathUtils.clamp(this.paintHold.elapsed / PAINT_HOLD_SECONDS, 0, 1);
    this.updatePaintTransfer(progress);
    if (progress < 1 || this.paintHold.completed) return;
    this.paintHold.completed = true;
    if (this.paintHold.button === 2) this.absorbPaint(this.paintHold.point);
    else this.usePaintBrush();
  }

  findAbsorbablePaint(point = null) {
    return this.hazards.find((hazard) => {
      if (hazard.type !== 'pigment' || !hazard.absorbable) return false;
      return Math.hypot(this.player.x - hazard.x, this.player.z - hazard.z) < 4.2 && point && Math.hypot(point.x - hazard.x, point.z - hazard.z) < 2.4;
    }) || null;
  }

  updatePaintTransfer(progress) {
    if (!this.paintHold.active) return;
    const absorbing = this.paintHold.button === 2;
    const target = absorbing ? (this.paintHold.target || this.findAbsorbablePaint(this.paintHold.point)) : null;
    if (absorbing && !target) { this.paintTransfer.visible = false; return; }
    if (!absorbing && this.player.color < 1) { this.paintTransfer.visible = false; return; }
    const from = absorbing ? new THREE.Vector3(target.x, 0.65, target.z) : new THREE.Vector3(this.player.x, 1.15 + this.player.y, this.player.z);
    const to = absorbing ? new THREE.Vector3(this.player.x, 1.1 + this.player.y, this.player.z) : new THREE.Vector3(this.boss.x, 6.7, this.boss.z + 0.7);
    this.paintTransfer.visible = true;
    const strands = this.paintTransfer.children.filter((item) => !item.userData.paintDroplet);
    const droplets = this.paintTransfer.children.filter((item) => item.userData.paintDroplet);
    strands.forEach((strand, index) => {
      const stagger = THREE.MathUtils.clamp(progress * 1.35 - index * 0.055, 0.025, 1);
      const end = from.clone().lerp(to, stagger);
      const middle = from.clone().lerp(end, 0.52);
      middle.x += Math.sin(this.elapsed * 13 + index * 1.8) * (0.08 + progress * 0.14) + (index - 2) * 0.065;
      middle.y += 0.18 + Math.sin(progress * Math.PI) * 0.42;
      middle.z += Math.cos(this.elapsed * 11 + index) * 0.08;
      strand.geometry.setFromPoints([from, middle, end]);
      strand.material.opacity = 0.42 + progress * 0.5;
      strand.visible = true;
    });
    droplets.forEach((droplet, index) => {
      const travel = (this.elapsed * 1.65 + index / droplets.length) % 1;
      const flow = absorbing ? travel : 1 - travel;
      droplet.position.lerpVectors(from, to, flow);
      droplet.position.y += Math.sin(flow * Math.PI) * (0.35 + progress * 0.55);
      droplet.scale.setScalar(0.72 + progress * 0.6 + Math.sin(this.elapsed * 20 + index) * 0.08);
      droplet.material.opacity = 0.5 + progress * 0.45;
      droplet.lookAt(this.camera.position);
      droplet.visible = true;
    });
    if (absorbing && target.asset) target.asset.scale.setScalar(Math.max(0.68, 1 - progress * 0.28 + Math.sin(this.elapsed * 18) * 0.025));
  }

  advancePaintHold(ms) {
    const steps = Math.max(1, Math.ceil(ms / (1000 / 60)));
    for (let i = 0; i < steps && !this.paintHold.completed; i += 1) this.updatePaintHold(1 / 60);
  }

  startPaintOnboarding() {
    if (this.phase !== 3 || this.paintTutorial?.stage !== 'await-pigment') return;
    this.clearHazards();
    this.boss.attackClock = 999;
    this.boss.exposed = 999;
    this.player.color = 0;
    this.spawnPigmentObject(0, { tutorial: true, x: 2.8, z: 3.2 });
  }

  absorbPaint(point = null) {
    const pigment = this.paintHold.target || this.findAbsorbablePaint(point);
    if (pigment && this.player.color < 3) {
      pigment.asset?.scale.setScalar(1);
      pigment.absorbable = false; pigment.life = 0;
      this.player.color += 1;
      this.spawnImpact(this.player.x, 1, this.player.z, pigment.color);
      this.toast(`COLOUR ${this.player.color} / 3 · RETURN IT FOR ${paintReturnDamage(this.player.color)}`);
      if (this.paintTutorial.stage === 'await-pigment') {
        this.paintTutorial.stage = 'absorbed';
        this.boss.exposed = Math.max(this.boss.exposed, 999);
      }
      return true;
    }
    this.toast(this.player.color >= 3 ? 'THE BRUSH IS FULL · RETURN IT' : 'HOLD RIGHT CLICK ON LANDED PIGMENT');
    return false;
  }

  usePaintBrush() {
    if (this.player.color < 1) { this.toast('ABSORB A COLOUR FIRST · HOLD RIGHT CLICK'); return; }
    const charge = this.player.color;
    const damage = paintReturnDamage(charge);
    this.player.color = 0;
    this.lastPaintReturn = { charge, damage };
    this.hitBoss(damage, 'rage');
    this.spawnImpact(this.boss.x, 6.7, this.boss.z + 0.7, 0xff806f);
    this.tone(480 + charge * 90, 0.16, 'triangle', 0.04);
    this.toast(`${charge} COLOUR${charge === 1 ? '' : 'S'} RETURNED · ${damage}`);
    if (this.paintTutorial.stage === 'absorbed') {
      this.paintTutorial.stage = 'complete';
      this.boss.exposed = Math.min(this.boss.exposed, 1.2);
      this.boss.attackClock = difficulty === 'story' ? 3.2 : 2.4;
    }
  }

  // ------------------------------------------------------------ combat core

  spawnPlayerProjectile(color, damage) {
    const root = new THREE.Mesh(new THREE.OctahedronGeometry(0.3), new THREE.MeshBasicMaterial({ color }));
    root.position.set(this.player.x, 1.2 + this.player.y, this.player.z);
    this.scene.add(root);
    const start = root.position.clone();
    const target = new THREE.Vector3(this.boss.x, 6.8, this.boss.z + 0.8);
    this.projectiles.push({ root, type: 'player-shot', damage, life: 1.2, age: 0, duration: 0.8, start, target });
  }

  hitBoss(amount, reaction = 'pain') {
    if (this.boss.hp <= 0 || this.mode !== 'play') return;
    const oldPhase = this.phase;
    this.boss.hp = Math.max(0, this.boss.hp - amount);
    this.boss.inv = 0.09 * D().bossWindow;
    this.boss.stagger = 0.18;
    this.boss.reaction = reaction;
    this.boss.lastDamageCause = ['returned-claim', 'borrowed-light', 'two-true-things', 'returned-pigment'][this.phase];
    this.boss.lastDamage = amount;
    if (this.phase === 3) {
      this.boss.paintCoverage = THREE.MathUtils.clamp((100 - this.boss.hp) / 88, 0, 1);
      this.updatePaintCreep();
    }
    this.boss.gestureTime = reaction === 'rage' ? 1.4 : 0.8;
    this.boss.flash = 0.18;
    this.playConductorAction(reaction === 'pain' ? 'Walk_Loop' : reaction === 'shame' ? 'Fixing_Kneeling' : 'Interact', true);
    this.hitStop = 0.055;
    this.trauma = Math.min(1, this.trauma + 0.3);
    this.spawnImpact(this.boss.x, 8.2, this.boss.z + 1, reaction === 'shame' ? 0xffd7d7 : AMBER);
    this.tone(72, 0.12, 'sawtooth', 0.05);
    const newPhase = Math.min(3, Math.floor((400 - this.boss.hp) / 100));
    if (this.phase === 3 && this.boss.hp <= 12) this.startRescueSequence();
    else if (this.boss.hp <= 0) this.startRescueSequence();
    else if (newPhase > oldPhase) this.startWorldTransition(newPhase);
  }

  spawnImpact(x, y, z, color) {
    for (let i = 0; i < 14; i += 1) {
      const shard = flatBox(0.05 + Math.random() * 0.13, 0.18 + Math.random() * 0.3, 0.04, new THREE.MeshBasicMaterial({ color, transparent: true }));
      shard.position.set(x, y, z);
      shard.userData.velocity = new THREE.Vector3(THREE.MathUtils.randFloatSpread(7), THREE.MathUtils.randFloat(2, 7), THREE.MathUtils.randFloatSpread(7));
      this.scene.add(shard);
      this.effects.push({ root: shard, life: 0.55, type: 'shard' });
    }
  }

  showTutorialOnce(key, text) {
    this.tutorialShown ||= new Set();
    if (this.tutorialShown.has(key)) return;
    this.tutorialShown.add(key);
    this.hint(text);
    clearTimeout(this.hintTimer);
    this.hintTimer = setTimeout(() => { if (this.hintText === text) this.hint(''); }, 3800);
  }

  // ------------------------------------------------------------ departure

  startRescueSequence() {
    if (this.mode === 'departure' || this.mode === 'cinematic') return;
    this.mode = 'departure';
    this.clearHazards();
    this.boss.hp = Math.max(1, this.boss.hp);
    this.boss.reaction = 'pain'; this.boss.gestureTime = 2;
    this.boss.attackClock = 999;
    this.player.inv = 99;
    this.departureTrain.visible = true;
    this.departureTrain.position.set(-24, 0, 1.2);
    this.departureTimer = 0;
    this.departureBoardable = false;
    this.hint('');
    this.toast('THE NIGHT SERVICE IS ARRIVING', 2.6);
    this.trauma = 0.9;
    this.tone(48, 0.8, 'sawtooth', 0.06);
  }

  jumpAboardDepartureTrain() {
    if (this.mode !== 'departure') return;
    if (!this.departureBoardable) { this.toast('WAIT FOR THE TRAIN TO SLOW'); return; }
    if (this.player.grounded) this.jump();
  }

  boardDepartureTrain() {
    if (this.mode !== 'departure') return;
    this.mode = 'cinematic';
    this.cinematicTime = 0;
    this.hint('');
    this.playerRoot.position.set(this.departureTrain.position.x + 1.2, 2.6, this.departureTrain.position.z);
    stampAnnounce(this.hud, 'DEPARTING', { holdMs: 1800 });
    this.playMusic(BOSS_SCORE.departure);
  }

  updateRescue(dt) {
    if (this.mode === 'departure') {
      this.departureTimer += dt;
      const speed = this.departureTrain.position.x < -3.2 ? 13.5 : 2.05;
      this.departureTrain.position.x = Math.min(-0.7, this.departureTrain.position.x + speed * dt);
      this.departureBoardable = this.departureTrain.position.x >= -3.2;
      if (this.departureBoardable) {
        const closeEnough = Math.abs(this.player.x - (this.departureTrain.position.x + 1.1)) < 4.8 && Math.abs(this.player.z - this.departureTrain.position.z) < 3.5;
        this.hint(closeEnough ? '<kbd>SPACE</kbd> · BOARD THE NIGHT SERVICE' : 'WALK TO THE TRAIN');
        if (closeEnough && this.player.y > 0.52) this.boardDepartureTrain();
      }
      return;
    }
    if (this.mode !== 'cinematic') return;
    this.cinematicTime += dt;
    const t = this.cinematicTime;
    if (t < 1.1) {
      const jump = Math.sin(Math.min(1, t / 1.1) * Math.PI) * 2.4;
      this.playerRoot.position.lerp(new THREE.Vector3(this.departureTrain.position.x + 1.2, jump, 1.2), 1 - Math.exp(-dt * 5));
    } else {
      this.playerRoot.visible = false;
      this.departureTrain.position.x += 11 * dt;
      this.cameraTarget.lerp(this.departureTrain.position.clone().add(new THREE.Vector3(0, 1.8, 0)), 1 - Math.exp(-dt * 4));
    }
    if (t > 5.2) this.finish();
  }

  // ------------------------------------------------------------ transitions

  startWorldTransition(nextPhase) {
    if (this.transition) return;
    clearTimeout(this.titleTimer);
    this.hud.querySelectorAll('.nf-title-card').forEach((card) => card.remove());
    this.clearHazards();
    this.clearLostProperty();
    this.closeCaption();
    this.dialoguePause = false;
    this.hint('');
    if (this.phase === 1 && nextPhase === 2) { this.startVerifiedTransition(nextPhase); return; }
    this.transition = { kind: 'world-fall', nextPhase, time: 0, duration: 3.25, switched: false };
    this.player.inv = 4;
    this.portal.visible = true;
    this.portal.position.set(0, 0, -0.2);
    this.portal.scale.setScalar(0.05);
    this.hitStop = 0.11;
    this.trauma = 0.75;
    this.tone(42, 0.8, 'sawtooth', 0.05);
  }

  // Borrowed Light → Echo City: the Conductor checks the ticket. Ten seconds,
  // in the fiction: the paper ticket is read, punched and stamped.
  startVerifiedTransition(nextPhase) {
    this.transition = { kind: 'verified', nextPhase, time: 0, duration: 10 };
    this.player.inv = 99;
    this.boss.attackClock = 999;
    this.bell.arena = null;
    this.bellMeter.setVisible(false);
    const scene = document.createElement('div');
    scene.className = 'nf-stamp-scene';
    scene.innerHTML = `
      <article class="nf-stamp-ticket">
        <h3>THE LAST ARCHIVE LINE · TICKET INSPECTION</h3>
        <h2>One passenger, changing carriages</h2>
        <dl>
          <dt>PASSENGER</dt><dd>BUTCH · LOST-PROPERTY CLERK</dd>
          <dt>FORM</dt><dd><s>INK CLERK</s> · <s>RAIN CLERK</s> · BUTCH</dd>
          <dt>FROM</dt><dd>BORROWED LIGHT</dd>
          <dt>TO</dt><dd>ECHO CITY</dd>
          <dt>CLAIM</dt><dd>1978-0412 · STILL OPEN</dd>
        </dl>
        <div class="nf-stamp">IDENTITY VERIFIED</div>
      </article>
      <small>THE CONDUCTOR READS YOUR TICKET · ENTER TO CONTINUE ONCE STAMPED</small>`;
    this.hud.append(scene);
    this.stampScene = scene;
    this.stampKey = (event) => {
      if (!['Enter', 'NumpadEnter', 'Space'].includes(event.code) || !this.transition || this.transition.kind !== 'verified') return;
      if (this.transition.time >= 3.6) { event.preventDefault(); this.transition.time = this.transition.duration; }
    };
    window.addEventListener('keydown', this.stampKey);
    this.hitStop = 0.12;
    this.trauma = 0.3;
    this.tone(46, 0.42, 'square', 0.04);
  }

  finishVerifiedTransition() {
    const tr = this.transition;
    window.removeEventListener('keydown', this.stampKey);
    this.stampScene?.remove();
    this.stampScene = null;
    this.phase = tr.nextPhase;
    this.boss.phaseRound = 0;
    this.setWorld(this.phase);
    this.puppet?.setForm(this.phase);
    this.player.x = 0; this.player.y = 0; this.player.z = 6.2; this.player.vy = 0; this.player.grounded = true;
    this.playerRoot.position.set(0, 0, 6.2);
    this.boss.x = 0; this.boss.targetX = 0; this.boss.z = CONDUCTOR_Z; this.boss.attackClock = 1.45; this.boss.exposed = 0;
    this.conductorRoot.position.set(0, -2.8, CONDUCTOR_Z);
    this.player.hp = this.player.maxHp; this.player.phaseHeals += 1; this.player.inv = 1.8;
    this.player.color = 0;
    this.transition = null;
    this.trauma = 0.42;
    this.enterMovement(this.phase);
  }

  updateTransition(dt) {
    if (!this.transition) return false;
    const tr = this.transition;
    if (tr.kind === 'verified') {
      tr.time += dt;
      const ticket = this.stampScene?.querySelector('.nf-stamp-ticket');
      if (tr.time > 1.6 && ticket && !ticket.classList.contains('is-punched')) { ticket.classList.add('is-punched'); bellAudio.punchClack(); }
      const stamp = this.stampScene?.querySelector('.nf-stamp');
      if (tr.time > 2.9 && stamp && !stamp.classList.contains('is-down')) { stamp.classList.add('is-down'); this.tone(70, 0.2, 'square', 0.05); this.trauma = 0.25; }
      if (tr.time >= tr.duration) this.finishVerifiedTransition();
      return true;
    }
    tr.time += dt;
    const t = Math.min(1, tr.time / tr.duration);
    if (t < 0.42) {
      const open = THREE.MathUtils.smootherstep(t, 0, 0.42);
      this.portal.scale.setScalar(0.05 + open * 8.8);
      this.portal.rotation.y += dt * 1.8;
      this.playerRoot.position.y = this.player.y - Math.max(0, open - 0.48) * 9;
      this.camera.position.lerp(new THREE.Vector3(0, 12.8, 11.2), 1 - Math.exp(-dt * 4));
      this.cameraTarget.lerp(new THREE.Vector3(0, -1.5, -0.2), 1 - Math.exp(-dt * 5));
    } else if (t < 0.64) {
      const fall = THREE.MathUtils.smootherstep(t, 0.42, 0.64);
      this.playerRoot.position.y = -fall * 12;
      this.conductorRoot.position.y = -fall * 5;
      this.camera.position.y = THREE.MathUtils.lerp(12.8, -7, fall);
      this.cameraTarget.y = -8 * fall;
      if (!tr.switched && t > 0.54) {
        tr.switched = true;
        this.phase = tr.nextPhase;
        this.boss.phaseRound = 0;
        this.setWorld(this.phase);
        this.puppet?.setForm(this.phase);
        this.portal.visible = false;
        this.playerRoot.position.set(0, 5, 6.2);
        this.conductorRoot.position.set(0, -2.8, CONDUCTOR_Z);
      }
    } else {
      const land = THREE.MathUtils.smootherstep(t, 0.64, 1);
      this.playerRoot.position.y = THREE.MathUtils.lerp(5, 0, land);
      this.camera.position.lerp(new THREE.Vector3(0, 10.8, 17.8), 1 - Math.exp(-dt * 5));
      this.cameraTarget.lerp(new THREE.Vector3(0, 1.1, -1.5), 1 - Math.exp(-dt * 5));
    }
    if (t >= 1) {
      this.player.x = 0; this.player.y = 0; this.player.z = 6.2; this.player.vy = 0; this.player.grounded = true;
      this.playerRoot.position.set(0, 0, 6.2);
      this.conductorRoot.position.set(0, -2.8, CONDUCTOR_Z);
      this.boss.x = 0; this.boss.targetX = 0; this.boss.z = CONDUCTOR_Z;
      this.boss.attackClock = 1.25;
      this.boss.exposed = 0;
      this.transition = null;
      this.trauma = 0.45;
      this.player.hp = this.player.maxHp;
      this.player.phaseHeals += 1;
      this.player.inv = Math.max(this.player.inv, 1.4);
      this.player.color = 0;
      this.enterMovement(this.phase);
    }
    return true;
  }

  clearHazards() {
    [...this.hazards, ...this.projectiles].forEach((item) => this.scene.remove(item.root));
    this.hazards = [];
    this.projectiles = [];
    this.pendingCommand = null;
  }

  // ------------------------------------------------------------ beats

  spawnBeat() {
    this.boss.rounds += 1;
    this.boss.phaseRound += 1;
    this.boss.gesture = 'point';
    this.boss.gestureTime = 0.82;
    this.playConductorAction('Interact', true);
    if (this.phase === 0) { this.spawnLostPropertyBeat(); return; }
    if (this.phase === 1) { this.boss.attackClock = 999; return; }
    const pressure = Math.min(4, Math.floor((this.boss.phaseRound - 1) / 2));
    const count = this.phase === 3 ? 1 : Math.min(5, D().overlap + 1 + pressure);
    this.pendingCommand = { phase: this.phase, count, time: 0.62 };
    this.boss.attackClock = this.phase === 3
      ? Math.max(2.15, (3.4 - Math.min(0.9, this.boss.phaseRound * 0.1)) * D().bossWindow)
      : Math.max(1.05, (D().beat - pressure * 0.16 - this.phase * 0.1) * THREE.MathUtils.randFloat(0.9, 1.06));
    if (this.phase === 3 && this.boss.rounds % 3 === 0) {
      this.boss.exposed = 2.65 * D().bossWindow;
      this.toast('HE IS OPEN · RETURN THE COLOUR');
    }
  }

  spawnEchoHole() {
    this.showTutorialOnce('echo-collapse', 'WHAT HE THROWS BREAKS THE FLOOR · KEEP MOVING');
    const x = THREE.MathUtils.clamp(this.player.x + THREE.MathUtils.randFloatSpread(7), -10.5, 10.5);
    const z = THREE.MathUtils.clamp(this.player.z + THREE.MathUtils.randFloatSpread(5), -6.5, 6.5);
    const root = this.telegraphPlane(0xb38a52, 3.6, 3.6, x, z);
    root.children[0].geometry.dispose(); root.children[0].geometry = new THREE.RingGeometry(1.35, 1.85, 18);
    const slam = this.cloneAsset(['trash', 'bench', 'speaker'][this.boss.rounds % 3], 2.2, 3.2);
    if (slam) { slam.position.y = 10; root.add(slam); }
    this.hazards.push({ root, asset: slam, assetId: ['crushed-trash-can', 'fountain-bench', 'pa-speaker'][this.boss.rounds % 3], type: 'echo-hole', x, z, timer: D().telegraph * 1.25, struck: false, landed: false, life: 0.9 });
  }

  spawnPigmentObject(index, options = {}) {
    const x = options.x ?? THREE.MathUtils.clamp(this.player.x + THREE.MathUtils.randFloatSpread(6), -10.5, 10.5);
    const z = options.z ?? THREE.MathUtils.clamp(this.player.z + THREE.MathUtils.randFloatSpread(4), -6.5, 6.5);
    const colors = [0x202126, 0x435d91, 0x4f8f7c];
    const color = colors[(this.boss.rounds + index) % colors.length];
    const root = this.telegraphPlane(color, 2.8, 2.8, x, z);
    const urls = [ch4SootUrl, ch4IndigoUrl, ch4VerdigrisUrl];
    const object = makePaperCard(this.textureLoader, urls[(this.boss.rounds + index) % urls.length], 2.6, 1.6, { alpha: true }); object.position.y = 9; root.add(object);
    this.hazards.push({ root, asset: object, assetId: ['bone-black-region', 'indigo-region', 'verdigris-region'][(this.boss.rounds + index) % 3], type: 'pigment', x, z, color, tutorial: Boolean(options.tutorial), persistentUntilLearned: Boolean(options.tutorial), timer: D().telegraph, struck: false, landed: false, absorbable: false, life: options.tutorial ? 999 : 3.2 });
  }

  spawnPaintSweep(index, options = {}) {
    const vertical = options.vertical ?? (this.boss.rounds + index) % 2 === 0;
    const offset = options.offset ?? (vertical ? THREE.MathUtils.randFloat(-10.5, 10.5) : THREE.MathUtils.randFloat(-5.8, 5.8));
    const colors = [0x202126, 0x435d91, 0x4f8f7c];
    const color = colors[(this.boss.rounds + index) % colors.length];
    const root = this.telegraphPlane(color, vertical ? 1.25 : 29, vertical ? 20 : 1.25, vertical ? offset : 0, vertical ? 0 : offset);
    root.children[0].material.opacity = 0.12;
    this.hazards.push({ root, asset: root.children[0], assetId: 'painted-country-color-sweep', type: 'paint-sweep', vertical, offset, timer: options.timer ?? D().telegraph * 0.82 + index * 0.05, struck: false, life: difficulty === 'story' ? 0.5 : 0.68, color });
  }

  spawnPaintCover(index, options = {}) {
    const existing = this.hazards.filter((hazard) => hazard.type === 'paint-cover' && !hazard.destroyed);
    if (existing.length >= 2) return existing[0];
    const x = THREE.MathUtils.clamp(options.x ?? this.player.x + (index % 2 === 0 ? 2.65 : -2.65), ARENA.minX + 1.5, ARENA.maxX - 1.5);
    const z = options.z ?? this.player.z;
    const yaw = options.yaw ?? (options.axis === 'x' ? Math.PI / 2 : 0);
    const root = this.telegraphPlane(0x46618c, 2.7, 2.7, x, z);
    const tile = makePaperCard(this.textureLoader, ch4IndigoUrl, 2.05, 2.05, { alpha: true });
    tile.position.y = 9;
    tile.rotation.y = yaw;
    tile.rotation.z = index % 2 === 0 ? -0.12 : 0.12;
    root.add(tile);
    const edge = flatBox(2.08, 2.08, 0.1, new THREE.MeshStandardMaterial({ color: 0x46618c, emissive: 0x1b315c, emissiveIntensity: 0.35, roughness: 0.92 }));
    edge.position.y = 9;
    edge.rotation.y = yaw;
    root.add(edge);
    const hazard = { root, asset: tile, edge, assetId: 'ch4-indigo-paper-grid-cover', type: 'paint-cover', x, z, yaw, timer: 0.16, struck: false, landed: false, life: 5.6, color: 0x46618c };
    this.hazards.push(hazard);
    return hazard;
  }

  spawnPaintCoverWave() {
    const round = this.boss.phaseRound;
    const makeGrid = (delay = 0) => {
      const seed = round * 2.399 + delay * 1.731;
      const x = THREE.MathUtils.clamp(this.player.x + Math.sin(seed) * 6.2, ARENA.minX + 1.6, ARENA.maxX - 1.6);
      const z = THREE.MathUtils.clamp(this.player.z - 3.1 - (Math.cos(seed * 1.37) + 1) * 0.55, ARENA.minZ + 1.6, ARENA.maxZ - 1.6);
      const yaw = THREE.MathUtils.euclideanModulo(seed * 1.61, Math.PI * 2);
      this.spawnPaintCover(round + delay, { x, z, yaw });
    };
    const sweepVertical = round % 2 === 0;
    const sweepOffset = sweepVertical ? THREE.MathUtils.clamp(this.player.x + Math.cos(round * 1.17) * 7.1, -10.5, 10.5) : THREE.MathUtils.clamp(this.player.z + Math.sin(round * 1.17) * 4.4, -5.8, 5.8);
    this.spawnPaintSweep(round, { vertical: sweepVertical, offset: sweepOffset, timer: 1.72 });
    makeGrid();
    if (round >= 3 && round % 2 === 0) makeGrid(0.5);
  }

  telegraphPlane(color, w, d, x, z) {
    const root = new THREE.Group();
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
    plane.rotation.x = -Math.PI / 2; plane.position.y = 0.04; root.add(plane); root.position.set(x, 0, z); this.scene.add(root); return root;
  }

  resolveHazard(hazard) {
    const p = this.player;
    let hit = false;
    if (p.y > 1.05) return;
    if (['echo-hole', 'pigment'].includes(hazard.type)) hit = Math.hypot(p.x - hazard.x, p.z - hazard.z) < 2.1;
    if (hazard.type === 'paint-sweep') hit = hazard.vertical ? Math.abs(p.x - hazard.offset) < 0.78 : Math.abs(p.z - hazard.offset) < 0.78;
    if (hit && !hazard.tutorial && !hazard.hitChecked) {
      hazard.hitChecked = true;
      this.takeHit();
    }
  }

  addPersistentHole(x, z, radius = 1.45) {
    if (this.activeHoles.length >= this.holeVisuals.length) return;
    const hole = this.holeVisuals[this.activeHoles.length];
    hole.position.set(x, 0.035, z); hole.scale.setScalar(radius); hole.rotation.y = this.activeHoles.length * 0.73; hole.visible = true;
    this.activeHoles.push({ x, z, radius, visual: hole });
  }

  updateHazards(dt) {
    this.hazards.forEach((hazard) => {
      hazard.timer -= dt;
      if (!hazard.struck && hazard.timer <= 0) {
        hazard.struck = true;
        hazard.root.children[0].material.opacity = 0.35;
        if (hazard.type === 'paint-sweep') this.resolveHazard(hazard);
        this.trauma = Math.max(this.trauma, ['echo-hole', 'pigment'].includes(hazard.type) ? 0.5 : 0.22);
        this.tone(96, 0.16, 'square', 0.03);
      }
      if (hazard.struck) {
        if (!hazard.persistentUntilLearned) hazard.life -= dt;
        if (['echo-hole', 'pigment', 'paint-cover'].includes(hazard.type) && !hazard.landed) {
          const landingY = hazard.type === 'paint-cover' ? 1.12 : 0.45;
          if (hazard.asset) {
            hazard.asset.position.y = Math.max(landingY, hazard.asset.position.y - 18 * D().speedScale * dt);
            hazard.asset.rotation.z += hazard.type === 'paint-cover' ? dt * 0.4 : dt * 5;
          }
          if (hazard.type === 'paint-cover') hazard.edge.position.y = hazard.asset.position.y;
          if (!hazard.asset || hazard.asset.position.y <= landingY + 0.01) {
            hazard.landed = true; hazard.absorbable = hazard.type === 'pigment';
            if (hazard.type !== 'paint-cover') this.resolveHazard(hazard);
            if (hazard.type === 'echo-hole') this.addPersistentHole(hazard.x, hazard.z, 1.45 + Math.min(0.35, this.boss.phaseRound * 0.045));
            this.spawnImpact(hazard.x, 0.4, hazard.z, hazard.color || AMBER);
          }
        }
        hazard.root.children[0].material.opacity = hazard.type === 'paint-sweep' ? Math.max(0, hazard.life * 2.1) : Math.max(0.04, hazard.life * 0.12);
      } else {
        hazard.root.children[0].material.opacity = 0.1 + Math.abs(Math.sin(hazard.timer * 14)) * 0.16;
      }
    });
    const expired = this.hazards.filter((hazard) => hazard.struck && hazard.life <= 0);
    expired.forEach((hazard) => this.scene.remove(hazard.root));
    this.hazards = this.hazards.filter((hazard) => !(hazard.struck && hazard.life <= 0));
  }

  updateProjectiles(dt) {
    this.projectiles.forEach((projectile) => {
      projectile.life -= dt;
      projectile.age += dt;
      const progress = Math.min(1, projectile.age / projectile.duration);
      projectile.root.position.lerpVectors(projectile.start, projectile.target, progress);
      projectile.root.position.y += Math.sin(progress * Math.PI) * 3.2;
      projectile.root.rotation.z += dt * 7;
      if (!projectile.hit && progress >= 1) {
        projectile.hit = true;
        this.hitBoss(projectile.damage, 'pain');
      }
    });
    const expired = this.projectiles.filter((projectile) => projectile.life <= 0 || projectile.hit);
    expired.forEach((projectile) => this.scene.remove(projectile.root));
    this.projectiles = this.projectiles.filter((projectile) => projectile.life > 0 && !projectile.hit);
  }

  takeHit({ force = false } = {}) {
    if ((!force && this.player.inv > 0) || this.mode !== 'play' || this.transition) return;
    if (force && this.player.respawnInv > 0) return;
    this.player.hp -= 1;
    this.player.inv = 0.95;
    this.player.hitTimer = 0.38;
    this.hitStop = 0.07;
    this.trauma = Math.min(1, this.trauma + 0.55);
    this.spawnImpact(this.player.x, 1.4 + this.player.y, this.player.z, OXBLOOD);
    if (flashEnabled && !reducedMotionActive()) { this.renderer.domElement.classList.add('hit-flash'); setTimeout(() => this.renderer.domElement.classList.remove('hit-flash'), 70); }
    this.tone(63, 0.22, 'sawtooth', 0.05);
    this.lastRespawnCount = this.player.respawns;
    if (this.player.hp <= 0) this.respawnPlayer();
  }

  respawnClearance([x, z]) {
    const clearances = [];
    (this.activeHoles || []).forEach((hole) => clearances.push(Math.hypot(x - hole.x, z - hole.z) - hole.radius - 0.42));
    (this.hazards || []).forEach((hazard) => {
      if (!hazard.struck && !hazard.landed) return;
      if (hazard.type === 'paint-sweep') clearances.push(hazard.vertical ? Math.abs(x - hazard.offset) - 1.2 : Math.abs(z - hazard.offset) - 1.2);
      else if (['echo-hole', 'pigment'].includes(hazard.type)) clearances.push(Math.hypot(x - hazard.x, z - hazard.z) - 2.35);
    });
    if (this.phase === 0) clearances.push(Math.abs(x - PANEL_SEAMS.x) - 1.2, Math.abs(z - PANEL_SEAMS.z) - 1.2);
    return clearances.length ? Math.min(...clearances) : 99;
  }

  findSafeRespawn() {
    if (this.phase === 1) return [0, 4.6];
    const candidates = [[-5.5, 5.2], [5.5, 5.2], [0, 5.2], [-10, 2.8], [10, 2.8], [-5, -3.5]];
    const safe = candidates.find((point) => this.respawnClearance(point) >= 1.65);
    if (safe) return safe;
    const search = [];
    for (let z = ARENA.maxZ - 0.9; z >= ARENA.minZ + 1.2; z -= 1.15) for (let x = ARENA.minX + 1.2; x <= ARENA.maxX - 1.2; x += 1.2) search.push([x, z]);
    search.sort((a, b) => this.respawnClearance(b) - this.respawnClearance(a));
    return search[0] || [0, ARENA.maxZ - 1];
  }

  respawnPlayer() {
    const p = this.player;
    const [x, z] = this.findSafeRespawn();
    this.clearHazards();
    p.hp = p.maxHp;
    p.x = x; p.y = 0; p.z = z; p.vy = 0; p.grounded = true;
    p.color = 0;
    p.attack = 0; p.attackCd = 0; p.dash = 0; p.dashCd = 0;
    p.respawns += 1;
    p.respawnInv = D().respawnInv;
    p.inv = Math.max(p.inv, p.respawnInv);
    this.playerRoot.position.set(x, 0, z);
    this.closeCaption();
    this.dialoguePause = false;
    this.boss.hp = this.boss.phaseStartHp ?? PHASE_START_HP[this.phase];
    this.boss.exposed = 0;
    this.boss.phaseRound = 0;
    this.boss.paintCoverage = this.phase === 3 ? THREE.MathUtils.clamp((100 - this.boss.hp) / 88, 0, 1) : 0;
    this.updatePaintCreep();
    this.boss.attackClock = Math.max(this.boss.attackClock, p.respawnInv + 0.55);
    if (this.phase === 0) { this.clearLostProperty(); this.lost.tutorial = 'done'; this.boss.attackClock = p.respawnInv + 0.4; }
    if (this.phase === 1) { const tutorial = this.bell.tutorial; this.startBellArena(); this.bell.tutorial = tutorial === 'done' ? 'done' : 'lamp'; if (tutorial === 'done') this.bell.arena.setBeams(true); }
    if (this.phase === 2) { this.echo.stage = 'combat'; this.echo.clock = 5; }
    this.hitStop = 0.1;
    this.trauma = 0.25;
    this.spawnImpact(x, 1.1, z, AMBER);
    this.tone(220, 0.28, 'triangle', 0.04);
    this.toast('A LAYER TORN · THE MOVEMENT STARTS AGAIN', 2.4);
    const record = this.deaths.record(this.phase, difficulty);
    if (record.offerStory) this.offerStory();
  }

  // After three deaths in one movement the line offers to go gentler.
  offerStory() {
    this.dialoguePause = true;
    this.storyOffer = true;
    const backdrop = document.createElement('div');
    backdrop.className = 'nf-card-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.innerHTML = `<article class="nf-card"><p class="nf-card__stamp">A NOTE FROM THE ARCHIVE</p><h2 class="nf-card__title">The line can wait for you.</h2><div class="nf-card__lines"><p>Switch to STORY: more paper layers, slower trains, longer windows.</p><p>Nothing is lost. The movement starts again either way.</p></div><div class="nf-board__actions" style="justify-content:flex-start"><button class="nf-ticket-button" data-story="yes" type="button">STORY <span>S</span></button><button class="nf-ticket-button nf-ticket-button--quiet" data-story="no" type="button">KEEP NORMAL <span>N</span></button></div></article>`;
    this.hud.append(backdrop);
    backdrop.style.pointerEvents = 'auto';
    const close = (toStory) => {
      window.removeEventListener('keydown', onKey, true);
      backdrop.remove();
      this.storyOffer = false;
      this.dialoguePause = false;
      if (toStory) {
        setDifficulty('story');
        this.player.maxHp = D().layers;
        this.player.hp = this.player.maxHp;
        if (this.phase === 1) { this.startBellArena(); this.bell.tutorial = 'done'; this.bell.arena.setBeams(true); }
        this.toast('STORY · THE LINE SLOWS DOWN');
      }
    };
    const onKey = (event) => {
      if (event.code === 'KeyS') { event.preventDefault(); event.stopImmediatePropagation(); close(true); }
      if (event.code === 'KeyN' || event.code === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close(false); }
    };
    window.addEventListener('keydown', onKey, true);
    backdrop.querySelector('[data-story="yes"]').addEventListener('click', () => close(true));
    backdrop.querySelector('[data-story="no"]').addEventListener('click', () => close(false));
    backdrop.querySelector('[data-story="yes"]').focus({ preventScroll: true });
  }

  resolvePaintWallMovement(fromX, fromZ, nextX, nextZ) {
    let x = nextX;
    let z = nextZ;
    this.hazards.filter((hazard) => hazard.type === 'paint-cover' && hazard.landed && !hazard.destroyed).forEach((wall) => {
      const normalX = Math.sin(wall.yaw);
      const normalZ = Math.cos(wall.yaw);
      const tangentX = Math.cos(wall.yaw);
      const tangentZ = -Math.sin(wall.yaw);
      const fromAcross = (fromX - wall.x) * normalX + (fromZ - wall.z) * normalZ;
      const nextAcross = (x - wall.x) * normalX + (z - wall.z) * normalZ;
      const nextAlong = (x - wall.x) * tangentX + (z - wall.z) * tangentZ;
      if (Math.abs(nextAlong) > 1.38) return;
      const crossed = fromAcross * nextAcross <= 0;
      const tooClose = Math.abs(nextAcross) < 0.4;
      if (!crossed && !tooClose) return;
      const side = Math.sign(fromAcross || nextAcross || 1);
      const correction = side * 0.4 - nextAcross;
      x += normalX * correction;
      z += normalZ * correction;
    });
    return { x, z };
  }

  updatePlayer(dt) {
    const p = this.player;
    const wasGrounded = p.grounded;
    p.inv = Math.max(0, p.inv - dt);
    p.respawnInv = Math.max(0, p.respawnInv - dt);
    p.hitTimer = Math.max(0, p.hitTimer - dt);
    p.dash = Math.max(0, p.dash - dt);
    p.dashCd = Math.max(0, p.dashCd - dt);
    p.attack = Math.max(0, p.attack - dt);
    p.attackCd = Math.max(0, p.attackCd - dt);
    const dx = Number(this.keys.has('ArrowRight') || this.keys.has('KeyD')) - Number(this.keys.has('ArrowLeft') || this.keys.has('KeyA'));
    const dz = Number(this.keys.has('ArrowDown') || this.keys.has('KeyS')) - Number(this.keys.has('ArrowUp') || this.keys.has('KeyW'));
    const length = Math.hypot(dx, dz) || 1;
    const speed = p.dash > 0 ? 16 : 6.3;
    if (dx || dz) { p.facingX = dx / length; p.facingZ = dz / length; }
    const intendedX = THREE.MathUtils.clamp(p.x + (dx / length) * speed * dt, ARENA.minX, ARENA.maxX);
    const intendedZ = THREE.MathUtils.clamp(p.z + (dz / length) * speed * dt, ARENA.minZ, ARENA.maxZ);
    const resolved = this.resolvePaintWallMovement(p.x, p.z, intendedX, intendedZ);
    p.x = resolved.x;
    p.z = resolved.z;
    const hole = this.activeHoles?.find((entry) => Math.hypot(p.x - entry.x, p.z - entry.z) < entry.radius * 0.82);
    if (hole && p.y <= 0.15 && p.respawnInv <= 0) {
      const respawnsBefore = p.respawns;
      p.y = -0.8;
      this.takeHit();
      if (p.respawns === respawnsBefore) {
        const [safeX, safeZ] = this.findSafeRespawn();
        p.x = safeX; p.z = safeZ; p.y = 0; p.vy = 0;
      }
    }
    p.vy -= 22 * dt;
    p.y += p.vy * dt;
    if (p.y <= 0) {
      if (!p.grounded && p.vy < -4) { this.trauma = Math.max(this.trauma, 0.1); this.tone(110, 0.055, 'triangle', 0.02); }
      p.y = 0; p.vy = 0; p.grounded = true;
    } else p.grounded = false;
    if (!wasGrounded && p.grounded) this.butchLandTimer = 0.2;
    this.butchLandTimer = Math.max(0, this.butchLandTimer - dt);
    this.playerRoot.position.set(p.x, p.y, p.z);
    this.respawnAura.visible = p.respawnInv > 0;
    if (this.respawnAura.visible) {
      this.respawnAura.scale.setScalar(1 + Math.sin(this.elapsed * 10) * 0.12);
      this.respawnAura.material.opacity = 0.24 + Math.abs(Math.sin(this.elapsed * 8)) * 0.48;
    }
    const targetYaw = this.phase === 2 ? Math.atan2(p.facingX, p.facingZ) : 0;
    this.playerRoot.rotation.y = THREE.MathUtils.lerp(this.playerRoot.rotation.y, targetYaw, 1 - Math.exp(-dt * 14));
    this.puppet?.update(dt, Boolean(dx || dz), p.grounded, p.attack > 0, p.hitTimer > 0, p.facingX);
    if (this.phase === 2) {
      const moving = Boolean(dx || dz);
      const butchAction = this.butchLandTimer > 0 ? 'Jump_Land' : !p.grounded ? (p.vy > 1.2 ? 'Jump_Start' : 'Jump_Loop') : moving ? 'Walk_Loop' : 'Idle_Loop';
      this.playButchAction(butchAction, butchAction === 'Jump_Land');
      if (this.butchAction && butchAction === 'Walk_Loop') this.butchAction.setEffectiveTimeScale(1.3);
      this.butchRoot.rotation.z = p.hitTimer > 0 ? Math.sin(this.elapsed * 48) * 0.12 : 0;
    }
  }

  updateBoss(dt) {
    this.boss.inv = Math.max(0, this.boss.inv - dt);
    if (this.phase !== 1 && this.phase !== 2) this.boss.exposed = Math.max(0, this.boss.exposed - dt);
    if (this.phase === 2 && this.echo.stage !== 'window') this.boss.exposed = 0;
    this.boss.stagger = Math.max(0, this.boss.stagger - dt);
    const onboarding = (this.phase === 0 && this.lost.tutorial === 'lens') || this.phase === 1 || (this.phase === 2 && this.echo.stage !== 'combat');
    if (!onboarding) this.boss.attackClock -= dt;
    this.boss.gestureTime = Math.max(0, this.boss.gestureTime - dt);
    this.boss.flash = Math.max(0, this.boss.flash - dt);
    if (this.pendingCommand) {
      this.pendingCommand.time -= dt;
      if (this.pendingCommand.time <= 0) {
        const command = this.pendingCommand; this.pendingCommand = null;
        for (let i = 0; i < command.count; i += 1) {
          if (command.phase === 2) this.spawnEchoHole(i);
          else if (command.phase === 3) this.spawnPigmentObject(i);
        }
        if (command.phase === 3) this.spawnPaintCoverWave();
      }
    }
    const orbit = this.phase === 1 ? this.boss.targetX : Math.sin(this.elapsed * (0.32 + this.phase * 0.04)) * 2.2;
    this.boss.x = THREE.MathUtils.lerp(this.boss.x, orbit, 1 - Math.exp(-dt * (this.phase === 1 ? 3.2 : 0.9)));
    this.boss.z = CONDUCTOR_Z;
    this.conductorRoot.position.x = this.boss.x;
    this.conductorRoot.position.z = CONDUCTOR_Z;
    this.conductorRoot.position.y = -2.8 + (this.boss.reaction === 'pain' ? -Math.sin(this.boss.gestureTime * Math.PI) * 0.7 : 0);
    this.conductorRoot.rotation.y = this.phase === 2 ? Math.atan2((this.player.x - this.boss.x) * 0.15, this.player.z - this.boss.z) : 0;
    const reactionRoll = this.boss.reaction === 'shame' ? -0.08 : this.boss.reaction === 'rage' ? 0.1 : 0;
    this.conductorRoot.rotation.z = this.boss.gestureTime > 0 ? reactionRoll + (this.boss.stagger > 0 ? Math.sin(this.elapsed * 45) * 0.08 : 0) : 0;
    this.conductorPaper?.update(dt, false, true, this.phase === 1 && Boolean(this.bell.arena?.exposure), false, this.player.x - this.boss.x);
    const paperFace = this.conductorPaper?.cards[this.phase]?.face;
    if (paperFace?.material?.emissive) {
      paperFace.material.emissive.setHex(this.boss.flash > 0 ? (this.boss.reaction === 'shame' ? 0x723344 : 0xffffff) : 0x000000);
      paperFace.material.emissiveIntensity = this.boss.flash > 0 ? 0.8 : 0;
    } else if (paperFace?.material) {
      paperFace.material.color.setHex(this.boss.flash > 0 ? 0xffd0c0 : 0xffffff);
    }
    this.conductorModel?.traverse((child) => {
      if (!child.isMesh || !child.material?.emissive) return;
      child.material.emissive.setHex(this.boss.flash > 0 ? (this.boss.reaction === 'shame' ? 0x723344 : 0xffffff) : 0x000000);
      child.material.emissiveIntensity = this.boss.flash > 0 ? 0.8 : 0;
    });
    this.updatePaintCreep();
    if (this.boss.gestureTime <= 0 && this.boss.reaction !== 'idle') { this.boss.reaction = 'idle'; this.playConductorAction('Idle_Loop'); }
    if (!onboarding && this.boss.attackClock <= 0 && !this.transition) this.spawnBeat();
  }

  updateEffects(dt) {
    this.effects.forEach((effect) => {
      effect.life -= dt;
      effect.root.userData.velocity.y -= 15 * dt;
      effect.root.position.addScaledVector(effect.root.userData.velocity, dt);
      effect.root.rotation.x += dt * 9;
      effect.root.rotation.z += dt * 7;
      effect.root.material.opacity = Math.max(0, effect.life * 2);
    });
    const expired = this.effects.filter((effect) => effect.life <= 0);
    expired.forEach((effect) => this.scene.remove(effect.root));
    this.effects = this.effects.filter((effect) => effect.life > 0);
  }

  updateRain(dt) {
    if (!this.rain.visible) return;
    const reduce = reducedMotionActive();
    this.rain.material.opacity = reduce ? 0.08 : 0.22;
    const positions = this.rain.geometry.attributes.position.array;
    const fall = (reduce ? 4 : 22) * dt;
    for (let i = 0; i < positions.length; i += 6) {
      positions[i + 1] -= fall; positions[i + 4] -= fall;
      positions[i] -= fall * 0.16; positions[i + 3] -= fall * 0.16;
      if (positions[i + 4] < 0) {
        const x = THREE.MathUtils.randFloat(-22, 22);
        const z = THREE.MathUtils.randFloat(-24, 14);
        positions.set([x, 20, z, x - 0.12, 19.3, z], i);
      }
    }
    this.rain.geometry.attributes.position.needsUpdate = true;
  }

  update(dt) {
    this.conductorMixer?.update(dt);
    this.butchMixer?.update(dt);
    this.updateRain(dt);
    if (this.mode === 'departure') {
      this.elapsed += dt;
      this.conductorPaper?.update(dt, false, true, false, true, this.player.x - this.boss.x);
      this.updatePlayer(this.departureBoardable ? dt * 0.36 : dt);
      this.updateRescue(dt);
      return;
    }
    if (this.mode === 'cinematic') { this.elapsed += dt; this.updateRescue(dt); return; }
    if (this.mode !== 'play') return;
    if (this.transition?.kind === 'verified') { this.elapsed += dt; this.updateTransition(dt); return; }
    if (this.dialoguePause) {
      this.elapsed += dt * 0.08;
      this.updateEffects(dt * 0.08);
      return;
    }
    if (this.hitStop > 0) { this.hitStop -= dt; return; }
    this.elapsed += dt;
    if (this.updateTransition(dt)) { this.updateEffects(dt); return; }
    this.updatePlayer(dt);
    if (this.phase === 0) this.updateLostProperty(dt);
    if (this.phase === 1) this.updateBellArena(dt);
    if (this.phase === 2) this.updateEchoCity(dt);
    this.updateBoss(dt);
    this.updatePaintHold(dt);
    this.updateHazards(dt);
    this.updateProjectiles(dt);
    this.updateEffects(dt);
  }

  updateCamera(dt) {
    if (this.mode === 'cinematic') {
      const trainView = this.departureTrain.position.clone().add(new THREE.Vector3(-9, 6.5, 13));
      this.camera.position.lerp(trainView, 1 - Math.exp(-dt * 3));
    } else if (!this.transition || this.transition.kind === 'verified') {
      const ideal = new THREE.Vector3(this.player.x * 0.12, 11.8 + this.player.y * 0.15, 19.8 + this.player.z * 0.06);
      const target = new THREE.Vector3((this.player.x + this.boss.x) * 0.12, 3.4, -5.2);
      this.camera.position.lerp(ideal, 1 - Math.exp(-dt * 3.5));
      this.cameraTarget.lerp(target, 1 - Math.exp(-dt * 4));
    }
    this.trauma = Math.max(0, this.trauma - dt * 1.45);
    const shake = shakeEnabled && !reducedMotionActive() ? this.trauma * this.trauma : 0;
    const position = this.camera.position.clone();
    position.x += Math.sin(this.elapsed * 47) * shake * 0.42;
    position.y += Math.sin(this.elapsed * 61) * shake * 0.22;
    this.camera.position.copy(position);
    this.camera.lookAt(this.cameraTarget);
  }

  // ------------------------------------------------------------ HUD

  updateHud(dt = 1 / 60) {
    if (!['play', 'departure', 'cinematic'].includes(this.mode)) return;
    const phase = PHASES[this.phase];
    const exposed = this.phase === 1 ? Boolean(this.bell.arena?.exposure) : this.boss.exposed > 0 && this.boss.exposed < 900;
    this.ticketBar.set(this.boss.hp / this.boss.maxHp, { dt });
    this.ticketBar.setLabel(`MOVEMENT ${phase.number} · ${phase.world}`);
    this.ticketBar.setState(exposed ? 'EXPOSED' : this.mode === 'departure' ? 'OUTLASTED' : '', exposed);
    const plaqueTitle = this.plaque.querySelector('b');
    const plaqueRule = this.plaque.querySelector('span');
    if (plaqueTitle.textContent !== phase.title) plaqueTitle.textContent = phase.title;
    if (plaqueRule.textContent !== phase.rule) plaqueRule.textContent = phase.rule;
    const layerTitle = this.layers.querySelector('b');
    const title = `BUTCH · ${phase.form === 'BUTCH' ? 'CLERK' : phase.form} · ${D().label}`;
    if (layerTitle.textContent !== title) layerTitle.textContent = title;
    const row = this.layers.querySelector('.nf-layers__row');
    const key = `${this.player.hp}/${this.player.maxHp}`;
    if (row.dataset.key !== key) {
      row.dataset.key = key;
      row.innerHTML = Array.from({ length: this.player.maxHp }, (_, i) => `<i class="${i < this.player.hp ? '' : 'is-torn'}"></i>`).join('');
    }
    const ability = this.player.respawnInv > 0
      ? `STEADY · ${this.player.respawnInv.toFixed(1)}`
      : this.phase === 3
        ? `BRUSH ${this.player.color}/3 · RETURNS ${paintReturnDamage(Math.max(1, this.player.color))} · HOLD RMB ABSORB · HOLD LMB RETURN`
        : this.phase === 1
          ? `SHIFT · DASH${this.player.dashCd > 0 ? ` ${this.player.dashCd.toFixed(1)}` : ' READY'} · HOLD Q · LISTEN`
          : this.phase === 0
            ? `SHIFT · DASH${this.player.dashCd > 0 ? ` ${this.player.dashCd.toFixed(1)}` : ' READY'} · LENS · ${this.lost.lensMode === 'mouse' ? 'MOUSE' : 'CIRCLING (L)'}`
            : `SHIFT · DASH${this.player.dashCd > 0 ? ` ${this.player.dashCd.toFixed(1)}` : ' READY'}`;
    const small = this.layers.querySelector('small');
    if (small.textContent !== ability) small.textContent = ability;
    // bell meter
    if (this.phase === 1 && this.bell.arena) {
      const arena = this.bell.arena;
      const lineStates = {};
      ['amber', 'teal', 'rose'].forEach((line) => {
        const nodes = BELL_ARENA.nodes.filter((node) => node.line === line).map((node) => arena.timetable.nodeStatus(node.id));
        lineStates[line] = nodes.some((node) => node.powering) ? 'powering' : nodes.some((node) => node.queued) ? 'queued' : 'idle';
      });
      const preview = this.bell.listening ? arena.preview() : null;
      const next = arena.plan;
      const text = preview
        ? `LISTENING · ${preview.machines.filter((c) => c.to === 'on').map((c) => MACHINE_LABELS[c.machineId]).join(' · ') || 'NOTHING QUEUED'}`
        : `NEXT BELL · HE STEPS ${next.lane.toUpperCase()}${next.beamLanes.length ? ` · BEAMS ${next.beamLanes.map((lane) => lane.toUpperCase()).join('+')}` : ''}`;
      this.bellMeter.update({ phase: arena.bellPhase(), msToBell: arena.msToBell(), lineStates, text, listening: this.bell.listening });
    }
    this.updateWorldTags();
  }

  updateWorldTags() {
    this.tags.begin();
    const p = this.player;
    if (this.mode === 'play' && !this.transition && !this.dialoguePause) {
      if (this.phase === 0) {
        const closest = this.lost.cases.filter((item) => item.landed && !item.returned)
          .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
        this.lost.cases.forEach((item) => {
          if (!item.landed || item.returned) return;
          const near = item === closest && Math.hypot(item.x - p.x, item.z - p.z) <= CASE_REACH;
          if (!near && !item.revealed) return;
          const pt = this.screenPoint(item.x, 2.2, item.z);
          if (!pt) return;
          if (item.revealed && near) this.tags.tag('<kbd>SPACE</kbd> · RETURN', pt.x, pt.y);
          else if (item.revealed) this.tags.tag(escapeHtml(item.claim), pt.x, pt.y, { dim: true });
          else this.tags.tag('LENS · READ THE TAG', pt.x, pt.y, { dim: true });
        });
      } else if (this.phase === 1 && this.bell.arena) {
        const arena = this.bell.arena;
        const nearest = arena.nearestNode(p.x, p.z);
        BELL_ARENA.nodes.forEach((node) => {
          const status = arena.timetable.nodeStatus(node.id);
          const isNear = nearest?.id === node.id;
          if (!isNear && !status.queued) return;
          const pt = this.screenPoint(node.x, 2.5, node.z);
          if (!pt) return;
          this.tags.tag(isNear ? `<kbd>SPACE</kbd> · ${node.label}` : `${node.label} · QUEUED`, pt.x, pt.y, { color: LINE_CSS[node.line], queued: status.queued, dim: !isNear });
        });
        const exposure = arena.exposure;
        if (exposure && arena.onFrontPlatform(p.z)) {
          const pt = this.screenPoint(LANE_X[exposure.lane], 2.4, ARENA.minZ + 0.6);
          if (pt) this.tags.tag(laneOf(p.x) === exposure.lane ? '<kbd>SPACE</kbd> · RETURN THE LIGHT' : `STEP INTO THE ${exposure.lane.toUpperCase()} LANE`, pt.x, pt.y);
        }
        const nextPt = this.screenPoint(LANE_X[arena.plan.lane], 1.1, ARENA.minZ + 0.9);
        if (nextPt) this.tags.tag('NEXT STOP', nextPt.x, nextPt.y, { color: LINE_CSS.rose, dim: true });
      } else if (this.phase === 2 && this.echo.stage === 'window') {
        const pt = this.screenPoint(this.boss.x * 0.5, 1.8, ARENA.minZ + 1.2);
        if (pt) this.tags.tag(p.z < -3.4 ? '<kbd>SPACE</kbd> · SAY IT TO HIS FACE' : 'THE FRONT EDGE', pt.x, pt.y);
      }
    }
    this.tags.end();
  }

  render(dt = 1 / 60) {
    this.updateCamera(dt);
    this.updateHud(dt);
    this.renderer.render(this.scene, this.camera);
  }

  animate(now) {
    requestAnimationFrame(this.animate);
    const dt = Math.min(0.033, Math.max(0, (now - this.lastFrame) / 1000));
    this.lastFrame = now;
    if (globalThis.NIGHTFALL_PAUSED) { this.render(0); return; }
    this.update(dt);
    this.render(dt);
  }

  // The Conductor is outlasted, not defeated: the film, then one archive card
  // (docs/STORY_BIBLE.md, normal ending), then the credits.
  finish() {
    this.mode = 'end';
    this.hud.classList.add('hidden');
    this.stopMusic();
    playCinematic({
      id: 'ending',
      src: CINEMATICS.ending,
      label: 'NIGHTFALL ending cinematic',
      preserveBlackout: true,
      onComplete: () => showNormalEndingCard().then(() => showEndCredits()),
    });
  }

  tone(frequency, duration, type = 'sine', volume = 0.03) {
    if (!soundEnabled) return;
    try {
      this.audioContext ||= new AudioContext();
      const oscillator = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      oscillator.type = type; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(Math.max(0.0001, volume * globalBus('sfx')), this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.audioContext.currentTime + duration);
      oscillator.connect(gain).connect(this.audioContext.destination);
      oscillator.start(); oscillator.stop(this.audioContext.currentTime + duration);
    } catch {}
  }

  playMusic(cue) {
    if (!cue || !soundEnabled) return;
    // Called from the start / phase input path: claiming focus here closes
    // the race where the page reported a cue but its Audio element was paused.
    audioFocus.claim();
    this.currentMusic = cue;
    music.play(`final-boss-${cue.id}`, { ...cue, loop: cue.loop !== false });
  }

  stopMusic() { music.stop({ fade: 1.8 }); }

  previewPhase(index) {
    this.phase = THREE.MathUtils.clamp(Math.round(index), 0, 3);
    this.boss.phaseRound = 0;
    this.clearHazards();
    this.clearLostProperty();
    this.setWorld(this.phase);
    this.setConductorWorld(this.phase, true);
    this.puppet?.setForm(this.phase, true);
    this.boss.hp = PHASE_START_HP[this.phase];
    this.player.x = 0; this.player.y = 0; this.player.z = 5.8;
    this.playerRoot.position.set(0, 0, 5.8);
    this.boss.x = 0; this.boss.z = CONDUCTOR_Z; this.conductorRoot.position.set(0, -2.8, CONDUCTOR_Z);
    this.enterMovement(this.phase);
  }
}

// The normal ending's one archive card before the credits.
export function showNormalEndingCard() {
  return showArchiveCard({
    stamp: 'CLAIM 1978-0412 · STATUS: OPEN',
    title: 'The orchard case remains on board.',
    lines: ['The night service keeps running. Butch is still aboard, still looking one stop ahead.'],
    close: 'ENTER · CREDITS',
    autoMs: 12000,
    lockMs: 1400,
  });
}

function setDifficulty(value) {
  difficulty = difficultyPreset(value).id;
  document.querySelectorAll('#difficulty button').forEach((button) => button.classList.toggle('active', button.dataset.value === difficulty));
}

const game = new SpectacleBattle(document.querySelector('#game'));
installPauseMenu({
  checkpointId: 'chapter-6-start',
  controls: [
    ['MOVE', 'WASD / ARROWS'],
    ['PUNCH / ACT', 'SPACE (MOVEMENT I: ALSO LEFT CLICK)'],
    ['DASH', 'SHIFT / X'],
    ['LENS (MOVEMENT I)', 'MOUSE · L LETS IT CIRCLE YOU'],
    ['LISTEN (MOVEMENT II)', 'HOLD Q'],
    ['ANSWER (MOVEMENT III)', '1 / 2'],
    ['PAINT (MOVEMENT IV)', 'HOLD RIGHT MOUSE · ABSORB — HOLD LEFT MOUSE · RETURN'],
    ['FULLSCREEN', 'F'],
    ['PAUSE', 'ESC'],
  ],
});
createSaveStore().markCheckpoint('chapter-6-start');

const menu = document.querySelector('#menu');
const startFight = () => {
  if (game.mode !== 'menu') return;
  menu.classList.add('hidden');
  game.assetsPromise.finally(() => game.begin());
};

// Arriving from Chapter 5 (the Museum's collapse film ends on black): the
// curtain lifts onto the difficulty board, never straight into the fight.
const conductorTestMovement = requestedConductorTestMovement();
if (new URLSearchParams(window.location.search).get('from') === 'chapter5') {
  const curtain = document.createElement('div');
  curtain.className = 'nf-entry-blackout';
  curtain.innerHTML = '<span>THE LAST CARRIAGE</span><small>THE CONDUCTOR IS WAITING</small>';
  document.body.append(curtain);
  game.assetsPromise.finally(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => curtain.classList.add('is-revealed')));
    window.setTimeout(() => curtain.remove(), 1400);
    document.querySelector('#start')?.focus({ preventScroll: true });
  });
} else if (conductorTestMovement !== null) {
  menu.classList.add('hidden');
  game.assetsPromise.finally(() => game.begin({ movement: conductorTestMovement }));
}

window.addEventListener('keydown', (event) => {
  if (event.code === 'Enter' && game.mode === 'menu' && !menu.classList.contains('hidden') && !globalThis.NIGHTFALL_PAUSED) startFight();
});
document.querySelector('#start').addEventListener('click', startFight);

document.querySelectorAll('.nf-segmented').forEach((group) => group.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  group.querySelectorAll('button').forEach((entry) => entry.classList.toggle('active', entry === button));
  const value = button.dataset.value;
  if (group.id === 'difficulty') setDifficulty(value);
  if (group.id === 'shake') shakeEnabled = value === 'on';
  if (group.id === 'flash') flashEnabled = value === 'on';
}));

const syncMotionToggles = () => {
  const reduced = reducedMotionActive();
  if (reduced) shakeEnabled = false;
  [['shake', shakeEnabled], ['flash', flashEnabled && !reduced]].forEach(([id, on]) => {
    document.querySelectorAll(`#${id} button`).forEach((button) => {
      button.classList.toggle('active', (button.dataset.value === 'on') === on);
      button.disabled = reduced;
      button.title = reduced ? 'Reduce Motion is on in Settings' : '';
    });
  });
};
syncMotionToggles();
window.addEventListener('nightfall:settings', () => {
  syncMotionToggles();
  if (game.voiceAudio) game.voiceAudio.volume = 0.9 * globalBus('master');
});

// QA/automation surface only: none of these globals exist in a production build.
if (DEV_MODE) {
  window.__finalBoss = game;
  window.render_game_to_text = () => {
    const arena = game.bell.arena;
    return JSON.stringify({
      chapter: 'chapter06-final-boss', mode: game.mode, difficulty, phase: game.phase, phaseTitle: PHASES[game.phase].title, world: PHASES[game.phase].world,
      music: music.qa(), assetsReady: game.assetsReady, assetErrors: game.assetErrors,
      player: { x: +game.player.x.toFixed(2), y: +game.player.y.toFixed(2), z: +game.player.z.toFixed(2), hp: game.player.hp, maxHp: game.player.maxHp, grounded: game.player.grounded, color: game.player.color, respawns: game.player.respawns, inv: +game.player.inv.toFixed(2), action: game.phase === 2 ? game.butchActionState : game.puppet?.action },
      boss: { hp: game.boss.hp, maxHp: game.boss.maxHp, phaseStartHp: game.boss.phaseStartHp, x: +game.boss.x.toFixed(2), exposed: game.boss.exposed > 0, lastDamageCause: game.boss.lastDamageCause ?? null, lastDamage: game.boss.lastDamage ?? null, form: game.conductorRoot.userData.form, phaseRound: game.boss.phaseRound },
      deaths: [0, 1, 2, 3].map((m) => game.deaths.deaths(m)), storyOffer: Boolean(game.storyOffer),
      lost: { lens: { x: +game.lost.lens.x.toFixed(2), z: +game.lost.lens.z.toFixed(2), mode: game.lost.lensMode }, tutorial: game.lost.tutorial, returned: game.lost.returned, cases: game.lost.cases.map((c) => ({ claim: c.claim, x: +c.x.toFixed(2), z: +c.z.toFixed(2), landed: c.landed, revealed: c.revealed, tutorial: c.tutorial })), trains: game.lost.trains.map((t) => ({ seam: t.seam, ghost: t.ghost, running: t.running, revealed: Boolean(t.revealed), progress: +t.progress.toFixed(2) })) },
      bell: arena ? { ...arena.snapshot(), tutorial: game.bell.tutorial, listening: game.bell.listening, falls: game.bell.falls } : null,
      echo: { stage: game.echo.stage, clock: +game.echo.clock.toFixed(2), window: +game.echo.window.toFixed(2), open: game.debate.isOpen, exchange: game.debate.current?.id ?? null, opened: game.debate.opened, history: game.debate.history(), lastOutcome: game.echo.lastOutcome },
      paint: { tutorial: game.paintTutorial?.stage, lastReturn: game.lastPaintReturn ?? null, hold: { active: game.paintHold.active, button: game.paintHold.button, completed: game.paintHold.completed } },
      transition: game.transition ? { kind: game.transition.kind, next: PHASES[game.transition.nextPhase].world, progress: +(game.transition.time / game.transition.duration).toFixed(2) } : null,
      ui: { toast: game.lastToast ?? null, hint: game.hintText ?? '', tags: game.tags.texts(), caption: game.caption.hidden ? null : game.caption.textContent.trim().slice(0, 200), voice: game.voiceState },
      hazards: game.hazards.map((h) => ({ type: h.type, x: +(h.x ?? 0).toFixed(2), z: +(h.z ?? 0).toFixed(2), landed: Boolean(h.landed) })),
      rescue: { stage: game.mode === 'departure' ? 'night-service-arrival' : game.mode === 'cinematic' ? 'train-departure' : null, boardable: Boolean(game.departureBoardable) },
    });
  };
  window.advanceTime = (ms) => {
    const steps = Math.max(1, Math.round(ms / (1000 / 60)));
    for (let i = 0; i < steps; i += 1) game.update(1 / 60);
    game.render();
  };
  window.setFinalBossPreviewPhase = (phase) => { if (game.mode === 'play') { game.previewPhase(phase); game.render(); } };
  window.setFinalBossPlayerPosition = (x, z) => {
    game.player.x = THREE.MathUtils.clamp(Number(x), ARENA.minX, ARENA.maxX);
    game.player.z = THREE.MathUtils.clamp(Number(z), ARENA.minZ, ARENA.maxZ);
    game.playerRoot.position.set(game.player.x, game.player.y, game.player.z);
    game.render();
  };
  window.setFinalBossPlayerInvulnerable = (enabled = true) => { game.player.inv = enabled ? 9999 : 0; game.player.hp = game.player.maxHp; game.render(); };
  window.damageFinalBossPlayer = (amount = 1) => {
    if (game.mode !== 'play') return;
    for (let i = 0; i < Math.max(1, Math.round(Number(amount) || 1)); i += 1) {
      game.player.inv = 0; game.player.respawnInv = 0;
      const before = game.player.respawns;
      game.takeHit();
      if (game.player.respawns !== before) break;
    }
    game.render();
  };
  window.damageFinalBoss = (amount = 25) => { if (game.mode === 'play') { game.hitBoss(amount); game.render(); } };
  window.setFinalBossLens = (x, z) => { game.lost.lensTarget = { x: Number(x), z: Number(z) }; game.lost.lensMode = 'mouse'; game.lost.lastPointer = game.elapsed; game.lost.lens = { x: Number(x), z: Number(z) }; game.render(); };
  window.finalBossPunch = () => { game.spaceAction(); game.render(); };
  window.finalBossAnswer = (index) => { game.chooseAnswer(Number(index)); game.render(); };
  window.finalBossHoldListen = (on = true) => { if (on) game.keys.add('KeyQ'); else game.keys.delete('KeyQ'); };
  window.spawnFinalBossCase = (x, z) => { const item = game.spawnClaimCase({ x: Number(x), z: Number(z) }); game.render(); return Boolean(item); };
  window.spawnFinalBossTrain = (seam = 'z', ghost = false, dir = 1) => { game.spawnSeamTrain({ seam, ghost: Boolean(ghost), dir: Number(dir) }); game.render(); };
  window.setFinalBossPaintCharge = (amount = 3) => { if (game.mode === 'play' && game.phase === 3) { game.player.color = Math.max(0, Math.min(3, Number(amount) || 0)); game.render(); } };
  window.rightClickFinalBossPigment = (x, z, holdMs = 800, release = true) => { if (game.mode === 'play' && game.phase === 3) { game.paintHold = { active: true, button: 2, elapsed: 0, point: new THREE.Vector3(Number(x), 0, Number(z)), target: null, completed: false }; game.updatePaintTransfer(0); game.advancePaintHold(Number(holdMs)); if (release) game.releasePaintPointer({ button: 2 }); game.render(); } };
  window.leftClickFinalBossPaint = (holdMs = 800, release = true) => { if (game.mode === 'play' && game.phase === 3) { game.paintHold = { active: true, button: 0, elapsed: 0, point: null, target: null, completed: false }; game.updatePaintTransfer(0); game.advancePaintHold(Number(holdMs)); if (release) game.releasePaintPointer({ button: 0 }); game.render(); } };
  window.triggerFinalBossRescue = () => { game.phase = 3; game.setWorld(3); game.boss.hp = 10; game.startRescueSequence(); game.render(); };
  window.triggerFinalBossWorldFall = (nextPhase = Math.min(3, game.phase + 1)) => { if (game.mode === 'play' && nextPhase > game.phase) game.startWorldTransition(nextPhase); };
  window.triggerFinalBossVerified = () => { if (game.mode !== 'play') return; game.phase = 1; game.setWorld(1); game.puppet?.setForm(1, true); game.startWorldTransition(2); game.render(); };
  window.finishFinalBossTutorial = () => {
    if (game.phase === 0) { game.clearLostProperty(); game.lost.tutorial = 'done'; game.hint(''); game.boss.attackClock = 0.2; }
    if (game.phase === 1 && game.bell.arena) { game.bell.tutorial = 'done'; game.hint(''); game.bell.arena.setBeams(true); }
    if (game.phase === 3) { game.clearHazards(); game.paintTutorial.stage = 'complete'; game.boss.exposed = 0; game.boss.attackClock = 0.3; }
    game.render();
  };
  window.showFinalBossEndingCard = () => showNormalEndingCard();
}
