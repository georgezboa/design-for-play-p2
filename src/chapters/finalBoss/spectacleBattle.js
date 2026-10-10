// Chapter 6 · ALL WORLDS AT ONCE — the Conductor.
//
// Four movements, one per carriage Butch has already ridden:
//   I   NIGHT SERVICE · LOST PROPERTY — the Chapter 1 carriage wall laid flat,
//       four windows; trains run in the seams; the punch-hole lens reads the
//       1978 tags (and shows the ghost trains that only exist in 1978).
//   II  BORROWED LIGHT · ON THE BELL — Chapter 2's four-second bell and the
//       one-line rule: bridges, billboards and signal lamps fire on the bell.
//   III ECHO CITY · TWO TRUE THINGS — the argument about Mara, fought.
//   IV  THE PAINTED COUNTRY — absorb his colour, return it when he is open.
// Then the night service arrives and Butch boards it: the train keeps
// running, with Butch still aboard (docs/STORY_BIBLE.md, normal ending).
//
// Round 11 (docs/CHAPTER_06_BOSS_ROUND11.md): every movement is a three-phase
// skill fight. Its rules live in movements/*.js on the kernel in
// conductorFight.js (all node-tested, and playable by fightBot.js); the
// drawings come from finaleArt.js and fightVisuals.js; the DOM HUD from
// shell/finaleUi.js. This file reads input, renders and wires audio.

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
import { scheduleChapterControlsCard } from '../../shell/controlsCard.js';
import { createSaveStore, readSettings, volumeForChannel } from '../../shell/saveSystem.js';
import { reducedMotionActive } from '../../shell/motion.js';
import {
  createBellMeter, createStoneRow, createTagLayer, createTicketBar, showArchiveCard, showTitleCard, stampAnnounce,
} from '../../shell/finaleUi.js';
import { DEV_MODE, devParam } from '../../devMode.js';
import * as bellAudio from '../borrowedLight/audio.js';
import {
  BELL_ARENA, DEFAULT_DIFFICULTY, LANE_X, LENS_RADIUS, MACHINE_NAMES, PAINT_MOVEMENT_DRAIN, PANEL_SEAMS,
  checkpointLine, createDeathLedger, difficultyPreset, laneOf, paintReturnDamage, spreadWorldTags,
} from './finaleModel.js';
import { createBody, createFightRunner, startJump, stepBody } from './conductorFight.js';
import { CASE_REACH as LOST_CASE_REACH, createLostPropertyFight } from './movements/lostProperty.js';
import { createBellFight } from './movements/onTheBell.js';
import { FRONT_EDGE_Z as ECHO_FRONT_EDGE_Z, TRUTH_REACH as ECHO_TRUTH_REACH, createEchoFight } from './movements/echoCity.js';
import { ABSORB_REACH as PAINT_ABSORB_REACH, createPaintFight } from './movements/paintedCountry.js';
import { CHANCE_COLOR as CHANCE_HEX, DANGER_COLORS, createTelegraphLayer } from './fightVisuals.js';
import { FINALE_ALL_CONTROLS, MOVEMENT_KEY_LINES, PROGRESS_KEPT_LINES, STORY_KEPT_LINE, announceControlsStage, readFinalePad } from './finaleControls.js';
import { completedEnding, recordEnding, showJourneyComplete } from './journeyComplete.js';
import { createFinaleQualityMonitor, finalePixelRatio, finaleQualityPreference, frameSteps } from './finaleQuality.js';
import {
  LOST_FLOOR, RAIN_FLOOR, loadFinaleArtSources, lostPropertyFloorSteps, paintBillboardFace, paintBridgeDeck,
  paintClaimCase, paintConductorCarBackdrop, paintInkButch, paintInkConductor, paintInkTrain, paintInkTrainFront, paintLampNode,
  paintGapWall, paintLensRimCanvas, paintOverdueStamp, paintRainConductor, paintRainFigure, paintRainSkyline, paintRoofSection, paintStreetBelow,
  paintTrueThingCard,
} from './finaleArt.js';
import {
  ECHO_SQUARE, echoTerraceSteps, paintEchoParapet, paintEchoProp, paintEchoSkyline, paintEchoSquare,
  paintPaintedCountryBackdrop, paintPaintedField, paintPaintedFold, paintPaintedProp, paintedSheetSteps,
} from './finaleWorldArt.js';
import { waitForFonts } from '../../shared/fonts.js';
// Round 6 type: start fetching the house faces now, so text painted into
// canvases and 3D labels a moment later is set in them, not the fallback.
waitForFonts();

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
// His ticket below each movement (each movement is 100 of the 400).
const MOVEMENT_BASE_HP = [300, 200, 100, 0];
// Round 11: each movement's director (movements/*.js), and its seed.
const MOVEMENT_FIGHTS = Object.freeze([createLostPropertyFight, createBellFight, createEchoFight, createPaintFight]);
const FIGHT_SEEDS = Object.freeze([11, 17, 23, 31]);
// How he reels from each kind of hit.
const DAMAGE_REACTION = Object.freeze({
  'returned-claim': 'pain', 'volleyed-claim': 'pain', 'borrowed-light': 'pain', 'two-true-things': 'shame', 'said-to-his-face': 'shame', 'returned-pigment': 'rage', debug: 'pain',
});
const PIGMENT_HEX = Object.freeze({ soot: 0x202126, indigo: 0x435d91, verdigris: 0x4f8f7c });
const PIGMENT_URL = Object.freeze({ soot: ch4SootUrl, indigo: ch4IndigoUrl, verdigris: ch4VerdigrisUrl });
// The one-line rule of each phase, on the plaque (bottom right).
const PHASE_RULES = Object.freeze({
  'return-to-sender': 'Stand by a brass ring. Lens on the case. Punch it back as it lands.',
  'trains-in-the-seams': 'His trains run in the seams. Cross behind one. Sepia is a 1978 train.',
  unclaimed: 'His stamp comes down on a panel. Leave it. The 1978 layer widens the lens.',
  'on-the-bell': 'Amber lamp: a bridge. Rose signal in his lane: his light. Cross on the bell.',
  'the-bell-swings': 'Every bell swings a brass ring out from him. Jump it.',
  'last-bell': 'He calls his lane late. Every fourth bell his beams take all three lanes.',
  'the-claim': 'Dodge his misreadings. Strike one true thing, then the other.',
  echoes: 'Every throw echoes where you stood. Keep moving. Jump the rings.',
  'the-square-falls': 'The square falls behind you. The true things drift.',
  'take-the-colour': 'Absorb wet colour. Return it while his brush is dry.',
  'the-wash': 'Jump a sweep, or dash through it to take its colour.',
  'painted-over': 'Two washes, one after the other. The fuller brush cuts deeper.',
});
const CLAIMS = [
  '1978-0388 · A. KOVAC', '1978-0391 · HAT BOX', '1978-0397 · E. MARSH', '1978-0402 · UMBRELLA',
  '1978-0405 · T. OKAFOR', '1978-0409 · VIOLIN CASE', '1978-0411 · I. BRANDT', '1978-0412 · VELEZ, M.',
  '1978-0415 · WINTER COAT', '1978-0418 · P. SANDOR', '1978-0421 · SEED TIN', '1978-0426 · L. QUAY',
];
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
  { id: 'lost', number: 'I', title: 'I · NIGHT SERVICE', world: 'LOST PROPERTY', rule: 'Read the claim through the lens. Punch it back to him as it lands.', form: 'CLERK', music: BOSS_SCORE.threshold },
  { id: 'borrowed', number: 'II', title: 'II · BORROWED LIGHT', world: 'ON THE BELL', rule: 'Punch a lamp. It fires on the bell. Cross and punch him in his light.', form: 'CLERK', music: BOSS_SCORE.grid },
  { id: 'echo', number: 'III', title: 'III · ECHO CITY', world: 'TWO TRUE THINGS', rule: 'Dodge what he gets wrong. Strike both true things.', form: 'BUTCH', music: BOSS_SCORE.echoCity },
  { id: 'painted', number: 'IV', title: 'IV · THE PAINTED COUNTRY', world: 'TAKE BACK THE COLOUR', rule: 'Take his colour. Return it when his brush is dry.', form: 'INK FIGURE', music: BOSS_SCORE.allLines },
]);

// What can tear a paper layer, as the player is told it (alpha A4-5): the
// hit label, the death card and the side the hit flash comes from.
export const HIT_SOURCES = Object.freeze({
  case: 'A FALLING CASE · STAND BY ITS RING, NOT IN IT',
  train: 'HIS TRAIN, IN THE SEAM · CROSS BEHIND IT',
  'ghost-train': 'A 1978 TRAIN · THE SEPIA SEAM WARNED OF IT',
  stamp: 'HIS OVERDUE STAMP · LEAVE THE PANEL IT SHADOWS',
  beam: 'HIS SIGNAL BEAM · ANOTHER LANE, OR BEHIND A LIT BILLBOARD',
  'bell-wave': 'THE BELL’S SWING · JUMP ITS RING',
  fall: 'THE STREET GAP',
  'crushed-trash-can': 'A THROWN BIN · HIS MISREADING',
  'fountain-bench': 'A THROWN BENCH · HIS MISREADING',
  'pa-speaker': 'A THROWN SPEAKER · HIS MISREADING',
  echo: 'AN ECHO OF HIS THROW · IT LANDS WHERE YOU STOOD',
  shockwave: 'A BENCH’S RING ON THE STONES · JUMP IT',
  collapse: 'THE FALLING SQUARE · KEEP AHEAD OF ITS EDGE',
  pigment: 'FALLING PIGMENT · STEP IN ONCE IT HAS LANDED',
  sweep: 'A SWEEP OF HIS PAINT · JUMP IT, OR DASH THROUGH',
  wash: 'HIS WASH · LEAVE THE BAND BEFORE IT FLOODS',
  cover: 'A FALLING INDIGO TILE',
  hit: 'THE CONDUCTOR',
});

// The keys each movement adds, on its title card and the start board
// (finaleControls.js: Space only jumps, E / Enter acts).
const MOVEMENT_KEYS = MOVEMENT_KEY_LINES;

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

// The LOW tier's material: a lit PBR material becomes Lambert with the same
// colour, maps, transparency and shader hook. One replacement per source
// material, so meshes that shared a material still share one.
function cheapMaterial(material, cache) {
  if (!material?.isMeshStandardMaterial) return material;
  if (cache.has(material)) return cache.get(material);
  const cheap = new THREE.MeshLambertMaterial({
    name: material.name, color: material.color, map: material.map, alphaMap: material.alphaMap, alphaTest: material.alphaTest,
    emissive: material.emissive, emissiveMap: material.emissiveMap, emissiveIntensity: material.emissiveIntensity,
    transparent: material.transparent, opacity: material.opacity, side: material.side, depthWrite: material.depthWrite,
    vertexColors: material.vertexColors, fog: material.fog, toneMapped: material.toneMapped,
  });
  if (material.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile) cheap.onBeforeCompile = material.onBeforeCompile;
  if (material.customProgramCacheKey !== THREE.Material.prototype.customProgramCacheKey) {
    const key = material.customProgramCacheKey.bind(material);
    cheap.customProgramCacheKey = () => `${key()}-lambert`;
  }
  cheap.userData = { ...material.userData, finaleCheap: true };
  cache.set(material, cheap);
  return cheap;
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

// Textures made while a movement's art is painted, collected so they can be
// uploaded to the GPU one per slice instead of all on the next frame.
let textureSink = null;

// Large paintings bring their own mip chain, halved on the (software) canvas
// they were painted on. The GPU's generateMipmap on an sRGB texture is the
// slowest part of an upload on software GL: ~200 ms for the 2400 px floor,
// against ~40 ms for this chain plus its upload.
const CPU_MIPMAP_MIN_SIZE = 1024;

function mipChain(canvas) {
  const chain = [canvas];
  let { width, height } = canvas;
  while (width > 1 || height > 1) {
    width = Math.max(1, width >> 1);
    height = Math.max(1, height >> 1);
    const level = document.createElement('canvas');
    level.width = width;
    level.height = height;
    const c = level.getContext('2d', { willReadFrequently: true });
    c.imageSmoothingQuality = 'high';
    c.drawImage(chain[chain.length - 1], 0, 0, width, height);
    chain.push(level);
  }
  return chain;
}

function canvasTexture(canvas, { repeat = false } = {}) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  if (Math.max(canvas.width, canvas.height) >= CPU_MIPMAP_MIN_SIZE) {
    texture.mipmaps = mipChain(canvas);
    texture.generateMipmaps = false;
  }
  textureSink?.push(texture);
  return texture;
}

// Hand the main thread back between slices of work, so the menu and the
// fight keep taking input and drawing frames while the next movement loads.
// Background priority: a slice only runs when nothing else is waiting (input,
// network callbacks, timers), unlike scheduler.yield(), whose continuations
// jump ahead of ordinary tasks.
function yieldToMain() {
  if (typeof globalThis.scheduler?.postTask === 'function') return globalThis.scheduler.postTask(() => {}, { priority: 'background' });
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// Run a step generator (each `yield` ends one slice), giving the main thread
// back whenever a slice has used its budget. Resolves with the generator's
// return value.
async function runSliced(steps, { budgetMs = 12, sink = null } = {}) {
  let deadline = performance.now() + budgetMs;
  for (;;) {
    textureSink = sink;
    let step;
    try { step = steps.next(); } finally { textureSink = null; }
    if (step.done) return step.value;
    if (performance.now() >= deadline) {
      await yieldToMain();
      deadline = performance.now() + budgetMs;
    }
  }
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
    this.loader = loader;
    this.cards = definitions.map((definition) => this.buildCard(definition));
    this.setForm(0, true);
  }

  // A form painted later: each movement's art is painted when that movement
  // is next, so the Borrowed Light cards arrive after the Night Service ones.
  setCard(index, definition) {
    if (this.cards[index]) this.root.remove(this.cards[index].group);
    this.cards[index] = this.buildCard(definition);
    if (index === this.phase) this.setForm(this.phase, true);
  }

  buildCard(definition) {
    const loader = this.loader;
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

// The lens a movement falls through. Alpha round 4: its inside was solid
// black for two seconds (it read as a render hole); now it shows the next
// world (setPortalWorld) under a soft dark rim, so the fall reads as a fall
// into the next carriage.
function makePortalDisc() {
  const root = new THREE.Group();
  const voidDisc = new THREE.Mesh(new THREE.CircleGeometry(1, 96), new THREE.MeshBasicMaterial({ color: 0x1c130d, side: THREE.DoubleSide, toneMapped: false, fog: false }));
  voidDisc.rotation.x = -Math.PI / 2;
  voidDisc.position.y = 0.08;
  const rimCanvas = document.createElement('canvas');
  rimCanvas.width = rimCanvas.height = 256;
  const c = rimCanvas.getContext('2d');
  const gradient = c.createRadialGradient(128, 128, 40, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(11, 8, 6, 0)');
  gradient.addColorStop(0.62, 'rgba(11, 8, 6, 0.12)');
  gradient.addColorStop(1, 'rgba(11, 8, 6, 0.92)');
  c.fillStyle = gradient;
  c.fillRect(0, 0, 256, 256);
  const rimMap = new THREE.CanvasTexture(rimCanvas);
  const vignette = new THREE.Mesh(new THREE.CircleGeometry(1, 96), new THREE.MeshBasicMaterial({ map: rimMap, transparent: true, depthWrite: false, toneMapped: false, fog: false }));
  vignette.rotation.x = -Math.PI / 2;
  vignette.position.y = 0.09;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.045, 10, 96), new THREE.MeshBasicMaterial({ color: AMBER }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.11;
  root.add(voidDisc, vignette, ring);
  root.userData.fill = voidDisc;
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
    // Render quality (finaleQuality.js, alpha R4-1): LOW GRAPHICS starts the
    // stage without MSAA, shadows or PBR shading at a reduced pixel ratio; a
    // slow machine drops to the same tier once it has been measured.
    this.quality = createFinaleQualityMonitor({ preference: finaleQualityPreference(globalThis.NIGHTFALL_SETTINGS ?? readSettings()) });
    const low = this.quality.tier === 'low';
    this.renderer = new THREE.WebGLRenderer({ antialias: !low, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(finalePixelRatio(this.quality.tier, devicePixelRatio));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;
    this.renderer.shadowMap.enabled = !low;
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
    this.movementPrep = new Map();
    this.readyMovements = new Set();
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
    this.runs = 0;
    this.fight = null;
    this.runner = null;
    this.entityViews = new Map();
    this.pendingInput = { jump: false, dash: false, act: false };
    this.mouseHeld = { left: false, right: false };
    this.mousePoint = null;
    this.pad = null;
    this.padButtons = null;
    this.voiceAudio = typeof Audio === 'undefined' ? null : new Audio();
    if (this.voiceAudio) { this.voiceAudio.preload = 'auto'; this.voiceAudio.playsInline = true; this.voiceAudio.volume = 0.9 * globalBus('master'); }
    this.voiceState = { playing: false, speaker: null, tone: null, text: null };
    // The pause menu's stage (finaleControls.js) and the KEPT flash on the
    // ticket bar after a torn last layer.
    this.controlsStage = null;
    this.keptFlash = 0;
    // Movement I's lens input (the director owns the lens itself).
    this.lost = { lensMode: 'lead', lastPointer: -Infinity, pointer: null, lensTarget: { x: 0, z: 3 } };
    this.bell = { listening: false, beamFlash: 0, beamLanes: [], telegraphLanes: [] };
    this.butchActionState = 'idle';
    this.butchLandTimer = 0;
    this.raycaster = new THREE.Raycaster();
    this.pointerNdc = new THREE.Vector2();
    this.buildLights();
    this.buildWorlds();
    this.fightVisuals = createTelegraphLayer(this.scene, { reducedMotion: reducedMotionActive });
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
    this.key.castShadow = this.quality.tier !== 'low';
    this.key.shadow.mapSize.set(2048, 2048);
    Object.assign(this.key.shadow.camera, { left: -18, right: 18, top: 16, bottom: -16 });
    this.rim = new THREE.PointLight(AMBER, 36, 30, 2);
    this.rim.position.set(0, 6, -7);
    this.scene.add(this.hemi, this.key, this.rim);
  }

  // LOW tier, applied once (alpha R4-1): the setting, or measured slow frames.
  applyLowQuality(reason = 'setting') {
    if (this.quality.force(reason) === null && this.lowApplied) return;
    this.lowApplied = true;
    this.renderer.setPixelRatio(finalePixelRatio('low', devicePixelRatio));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.shadowMap.enabled = false;
    this.key.castShadow = false;
    this.cheapenScene();
  }

  cheapenScene() {
    if (this.quality.tier !== 'low') return;
    this.cheapMaterials ||= new Map();
    this.scene.traverse((object) => {
      if (!object.isMesh) return;
      object.castShadow = false;
      object.receiveShadow = false;
      object.material = Array.isArray(object.material)
        ? object.material.map((material) => cheapMaterial(material, this.cheapMaterials))
        : cheapMaterial(object.material, this.cheapMaterials);
    });
  }

  // One played frame's wall time for the slow-machine check: only frames of
  // a movement in play count (not the board, a load or a world change).
  sampleQuality(frameSeconds) {
    if (this.quality.decided || this.mode !== 'play' || this.transition || this.dialoguePause || globalThis.NIGHTFALL_PAUSED) return;
    if (this.quality.sample(frameSeconds) === 'low') this.applyLowQuality('slow-frames');
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
    this.lensRim.visible = false; // untextured it is a white square: shown once painted
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

    // III · Echo City: a sandstone terrace over the square, the parapet, the
    // square below (where the Conductor stands) and the old town behind him.
    // Painted in echoCityArt() (finaleWorldArt.js); flat until then, and the
    // movement never opens before that (prepareMovement).
    const echo = new THREE.Group();
    this.echoFloor = makeFloor(0x25292d, 0.98);
    echo.add(this.echoFloor);
    this.echoDressing = this.buildDressingShell(echo, { square: ECHO_SQUARE, squareColor: 0x1d1512 });
    this.worldRoots.push(echo);

    // IV · the Painted Country: Rosa's drafted sheet, its fold, the field
    // below and the orchard behind (paintedCountryArt()).
    const painted = new THREE.Group();
    this.paperTexture.repeat.set(4, 3);
    const paperFloor = new THREE.Mesh(new THREE.PlaneGeometry(32, 18, 12, 8), paperMaterial(0xd8cbb3, this.paperTexture));
    paperFloor.rotation.x = -Math.PI / 2; paperFloor.position.z = 1; paperFloor.receiveShadow = true; painted.add(paperFloor);
    this.paperFloor = paperFloor;
    this.paintedDressing = this.buildDressingShell(painted, { square: { x0: -30, x1: 30, z0: -44, z1: -8 }, squareColor: 0xe6dfcd });
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

  // The pieces every dressed movement shares: the lower ground past the front
  // edge (y = -2.8, where the Conductor's feet are), the wall that drops to
  // it, the backdrop far behind him and a group for stand-up prop cards.
  // Hidden until their paintings arrive.
  buildDressingShell(root, { square, squareColor }) {
    const lower = new THREE.Mesh(new THREE.PlaneGeometry(square.x1 - square.x0, square.z1 - square.z0), new THREE.MeshBasicMaterial({ color: squareColor, toneMapped: false }));
    lower.rotation.x = -Math.PI / 2;
    lower.position.set((square.x0 + square.x1) / 2, -2.8, (square.z0 + square.z1) / 2);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(32, 2.8), new THREE.MeshBasicMaterial({ color: squareColor, toneMapped: false }));
    wall.position.set(0, -1.4, -8);
    const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(112, 46.7), new THREE.MeshBasicMaterial({ color: squareColor, toneMapped: false, fog: false }));
    backdrop.position.set(0, 9.5, -54);
    const props = new THREE.Group();
    [lower, wall, backdrop, props].forEach((item) => { item.visible = false; root.add(item); });
    return { lower, wall, backdrop, props };
  }

  // Lay a painting onto one of the dressing's pieces and show it.
  dressWith(mesh, canvas) {
    mesh.material.map = canvasTexture(canvas);
    mesh.material.color.setHex(0xffffff);
    mesh.material.needsUpdate = true;
    mesh.visible = true;
  }

  // Stand-up prop cards (painted canvases, feet on the ground).
  placeProps(group, specs, paint) {
    for (const { kind, x, z, height, flip = false, y = 0 } of specs) {
      const mesh = paintedCard(paint(kind), height);
      mesh.position.set(x, y + height / 2, z);
      if (flip) mesh.scale.x = -1;
      mesh.userData.prop = kind;
      group.add(mesh);
    }
    group.visible = true;
  }

  // Movement III art (Chapter 3's palette): see finaleWorldArt.js.
  *echoCityArt() {
    const lamps = [{ x: -14.2, z: -7.4 }, { x: 14.2, z: -7.4 }, { x: -14.4, z: 2.6 }, { x: 14.4, z: 2.6 }, { x: -5.2, z: -7.6 }, { x: 5.2, z: -7.6 }];
    const floor = yield* echoTerraceSteps({ lamps });
    this.echoFloor.material.map = canvasTexture(floor);
    this.echoFloor.material.color.setHex(0x948b84);
    this.echoFloor.material.needsUpdate = true;
    yield;
    this.dressWith(this.echoDressing.lower, paintEchoSquare());
    yield;
    this.dressWith(this.echoDressing.wall, paintEchoParapet());
    yield;
    this.dressWith(this.echoDressing.backdrop, paintEchoSkyline());
    yield;
    const props = [
      ...lamps.map(({ x, z }) => ({ kind: 'lamp', x, z, height: 4.4 })),
      { kind: 'shelter', x: -14.6, z: -3.2, height: 3.2 },
      { kind: 'stall', x: 14.6, z: -2.6, height: 2.6 },
      { kind: 'bench', x: -14.8, z: 6.4, height: 1.2 },
      { kind: 'campfire', x: 14.4, z: 6.6, height: 1.3 },
      { kind: 'clock', x: -9.6, z: -7.7, height: 4.2 },
    ];
    this.placeProps(this.echoDressing.props, props, paintEchoProp);
  }

  // Movement IV art (Chapter 4's paper palette): see finaleWorldArt.js.
  *paintedCountryArt() {
    const sheet = yield* paintedSheetSteps();
    this.paperFloor.material.map = canvasTexture(sheet);
    this.paperFloor.material.color.setHex(0xd6d0c4);
    this.paperFloor.material.needsUpdate = true;
    yield;
    this.dressWith(this.paintedDressing.lower, paintPaintedField());
    yield;
    this.dressWith(this.paintedDressing.wall, paintPaintedFold());
    yield;
    this.dressWith(this.paintedDressing.backdrop, paintPaintedCountryBackdrop());
    yield;
    this.placeProps(this.paintedDressing.props, [
      { kind: 'tree', x: -14.8, z: -5.6, height: 4.4 },
      { kind: 'tree', x: 14.9, z: -4.2, height: 4.2, flip: true },
      { kind: 'hawthorn', x: -14.4, z: 3.4, height: 3.0 },
      { kind: 'easel', x: 14.3, z: 4.6, height: 2.8 },
      { kind: 'fence', x: -9, z: -7.8, height: 1.3 },
      { kind: 'fence', x: 9.5, z: -7.8, height: 1.3, flip: true },
      { kind: 'hawthorn', x: 3.6, z: -7.9, height: 2.2, flip: true },
    ], paintPaintedProp);
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
      // Transparent from the start: the board fades while Butch stands
      // behind it (alpha round 4: he vanished behind KEEP MOVING, right at
      // the east / west signals).
      const face = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 2.25), new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide, toneMapped: false, transparent: true }));
      face.position.y = 2.2;
      const frame = flatBox(5.7, 2.5, 0.18, new THREE.MeshStandardMaterial({ color: 0x1a1d1f, roughness: 0.7, metalness: 0.3, transparent: true }));
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
      this.boardMeshes[id] = { group, panel, face, frame, ghost, fade: 1 };
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
    // Overhead wires from each bridge and billboard lamp to the machine it
    // drives (alpha: "the bridges are not at their lamps"): the amber lamp at
    // x = ±3.6 feeds the bridge in the outer lane at x = ±7, strung over the
    // billboards like a tram wire to a post at the bridge head. A wire glows
    // while its lamp is queued and burns while its machine is out.
    this.cableMeshes = {};
    const machineAnchor = (machine) => {
      if (BELL_ARENA.bridges[machine] !== undefined) return { x: BELL_ARENA.bridges[machine] + (BELL_ARENA.bridges[machine] < 0 ? 1.9 : -1.9), z: BELL_ARENA.gapNearZ + 0.5, post: true };
      const board = BELL_ARENA.boards[machine];
      return board ? { x: LANE_X[board.lane] + (LANE_X[board.lane] < 0 ? -2.2 : 2.2), z: board.z - 0.12, post: false } : null;
    };
    const postMaterial = new THREE.MeshStandardMaterial({ color: 0x15181a, roughness: 0.8 });
    BELL_ARENA.nodes.forEach((node) => {
      const anchor = machineAnchor(node.machine);
      if (!anchor) return;
      const color = LINE_HEX[node.line];
      const top = anchor.post ? 3.35 : 3.3;
      const from = new THREE.Vector3(node.x + 0.3, 2.95, node.z);
      const to = new THREE.Vector3(anchor.x, top, anchor.z);
      const mid = from.clone().lerp(to, 0.5);
      mid.y = Math.max(from.y, to.y) + 0.35;
      const curve = new THREE.CatmullRomCurve3([from, from.clone().lerp(mid, 0.5).setY(mid.y - 0.05), mid, mid.clone().lerp(to, 0.5).setY(mid.y - 0.05), to]);
      const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false });
      const wire = new THREE.Mesh(new THREE.TubeGeometry(curve, 28, 0.05, 6, false), material);
      root.add(wire);
      const endMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, toneMapped: false });
      if (anchor.post) {
        const post = flatBox(0.14, top, 0.14, postMaterial);
        post.position.set(anchor.x, top / 2, anchor.z);
        root.add(post);
      }
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), endMaterial);
      cap.position.copy(to);
      root.add(cap);
      this.cableMeshes[node.id] = { strip: wire, endMaterial, line: node.line, machine: node.machine };
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
    // Only a stand-in for a movement whose art failed to load: never shown
    // while the art is still being painted (alpha A4-10, the boot flash).
    this.conductorFallback.visible = false;
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
    this.player = createBody({ x: 0, z: 6.1 });
    this.boss = { x: 0, z: CONDUCTOR_Z, hp: 400, maxHp: 400, phaseStartHp: 400, paintCoverage: 0, inv: 0, exposed: 0, attackClock: 1.4, stagger: 0, gesture: 'idle', gestureTime: 0, reaction: 'idle', flash: 0, rounds: 0, phaseRound: 0, targetX: 0 };
    this.departureTrain = new THREE.Group();
    const paperPlane = (width, height, color, x, y, z = 0.08) => {
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), paperMaterial(color, this.paperTexture));
      plane.position.set(x, y, z);
      return plane;
    };
    // The night service, cut from the Painted Country's paper in Chapter 1's
    // colours (alpha round 4: it arrived as a flat box with no engine): the
    // slate locomotive leading (it runs towards +x), its tender, and the
    // oxblood carriage with amber windows, all on graphite wheels.
    const ink = 0x242528;
    const slate = 0x2a2f3a;
    const wheel = (x, r, z = 0.18) => {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 18), paperMaterial(0x1b1d20, this.paperTexture));
      disc.position.set(x, r + 0.1, z);
      const hub = new THREE.Mesh(new THREE.CircleGeometry(r * 0.32, 12), paperMaterial(0xb08a4a, this.paperTexture));
      hub.position.set(x, r + 0.1, z + 0.02);
      return [disc, hub];
    };
    // carriage (x -6.6 … 4.6)
    const carriage = [
      paperPlane(11.5, 3.2, ink, -1, 2.08, -0.05),
      paperPlane(11.2, 2.86, 0x8a2a1e, -1, 2.1),
      paperPlane(11.65, 0.42, 0x383a3d, -1, 3.72, 0.12),
      paperPlane(11.25, 0.3, 0xb08a4a, -1, 1.05, 0.13),
      ...[-5.4, -3.85, -2.3, -0.75, 0.8, 2.35, 3.9].map((x) => paperPlane(1.12, 0.78, 0xe0a24a, x - 0.2, 2.5, 0.16)),
      ...[-5.4, -2.6, 0.6, 3.4].flatMap((x) => wheel(x, 0.43)),
    ];
    // coupling and tender (x 4.8 … 7.4)
    const tender = [
      paperPlane(0.5, 0.18, ink, 4.85, 1.0, 0.1),
      paperPlane(2.5, 2.1, ink, 6.3, 1.7, -0.05),
      paperPlane(2.3, 1.9, slate, 6.3, 1.72),
      paperPlane(2.1, 0.32, 0x15171b, 6.3, 2.62, 0.12),
      ...[5.7, 6.9].flatMap((x) => wheel(x, 0.36)),
    ];
    // locomotive (x 7.6 … 13): cab, boiler, smokebox, chimney, dome, lamp, cowcatcher
    const cowcatcher = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(1.1, 0), new THREE.Vector2(0, 1.0)])), paperMaterial(0x8a2a1e, this.paperTexture));
    cowcatcher.position.set(12.4, 0.12, 0.14);
    const loco = [
      paperPlane(2.2, 2.9, ink, 8.6, 2.05, -0.05),
      paperPlane(2.0, 2.7, slate, 8.6, 2.05),
      paperPlane(1.0, 0.8, 0xe0a24a, 8.6, 2.6, 0.14),
      paperPlane(2.5, 0.3, 0x15171b, 8.6, 3.55, 0.13),
      paperPlane(4.0, 1.75, ink, 11.25, 1.85, -0.05),
      paperPlane(3.8, 1.55, slate, 11.25, 1.85),
      paperPlane(3.8, 0.16, 0xb08a4a, 11.25, 2.2, 0.12),
      paperPlane(0.8, 1.9, 0x15171b, 12.95, 1.9, 0.11),
      paperPlane(0.55, 1.2, ink, 12.35, 3.3, 0.06),
      paperPlane(0.85, 0.22, ink, 12.35, 3.95, 0.07),
      paperPlane(0.7, 0.45, 0xb08a4a, 10.4, 2.85, 0.07),
      paperPlane(1.3, 0.2, 0xb08a4a, 11.25, 0.95, 0.13),
      cowcatcher,
      ...wheel(9.7, 0.62),
      ...wheel(11.15, 0.62),
      ...wheel(12.45, 0.34),
    ];
    const headlamp = new THREE.Mesh(new THREE.CircleGeometry(0.26, 16), new THREE.MeshBasicMaterial({ color: 0xfff1c8, toneMapped: false }));
    headlamp.position.set(13.25, 2.35, 0.18);
    const beam = new THREE.Mesh(new THREE.CircleGeometry(0.9, 24), new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0.32, depthWrite: false, toneMapped: false }));
    beam.position.set(13.25, 2.35, 0.16);
    // a puff of steam from the chimney
    this.departureSmoke = [0, 1, 2].map((i) => {
      const puff = new THREE.Mesh(new THREE.CircleGeometry(0.42 + i * 0.16, 18), paperMaterial(0xeae5da, this.paperTexture));
      puff.material.transparent = true;
      puff.position.set(12.1 - i * 0.9, 4.5 + i * 0.5, 0.04 - i * 0.01);
      puff.userData.base = puff.position.clone();
      return puff;
    });
    this.departureTrain.add(...carriage, ...tender, ...loco, headlamp, beam, ...this.departureSmoke);
    this.departureTrain.visible = false;
    this.scene.add(this.departureTrain);
  }

  // Movement I art: the carriage-wall floor (present and 1978), the lens rim,
  // the Conductor's car, the ink trains and claim cases, and the paper actors
  // (their Night Service and Painted Country forms). A step generator: every
  // `yield` is a point where runSliced may hand the main thread back.
  // Called once the paper grain and the panorama chunks have loaded (and the
  // fonts, for the claim names).
  *lostPropertyArt(sources) {
    const floor = (era) => lostPropertyFloorSteps({ arena: ARENA, seams: PANEL_SEAMS, era, ...sources });
    const lostFront = yield* floor('present');
    const lostPast = yield* floor('past');
    this.lostFloor.material.dispose();
    this.lostFloor.material = lensFloorMaterial(canvasTexture(lostFront.canvas), canvasTexture(lostPast.canvas));
    yield;
    const rim = paintLensRimCanvas(140);
    this.lensRim.material.map = canvasTexture(rim);
    this.lensRim.material.needsUpdate = true;
    const rimScale = (LENS_RADIUS * 2) * (rim.width / 280);
    this.lensRimBase = rimScale;
    this.lensRim.scale.set(rimScale, rimScale, 1);
    this.lensRim.visible = this.phase === 0;
    yield;
    const backdrop = paintConductorCarBackdrop(sources);
    this.lostBackdrop.material.map = canvasTexture(backdrop);
    this.lostBackdrop.material.color.setHex(0x9a8a78);
    this.lostBackdrop.material.needsUpdate = true;
    yield;
    this.trainArt = {
      side: canvasTexture(paintInkTrain({ era: 'present' })),
      sidePast: canvasTexture(paintInkTrain({ era: 'past' })),
      front: canvasTexture(paintInkTrainFront({ era: 'present' })),
      frontPast: canvasTexture(paintInkTrainFront({ era: 'past' })),
    };
    yield;
    const caseArt = [];
    for (const [index, claim] of CLAIMS.entries()) {
      const tone = ['#6d4a2c', '#5b3a24', '#7a5a3a', '#4a3a30'][index % 4];
      caseArt.push({
        claim,
        present: canvasTexture(paintClaimCase({ era: 'present', claim, seed: index + 3, tone })),
        past: canvasTexture(paintClaimCase({ era: 'past', claim, seed: index + 3, tone })),
      });
      yield;
    }
    this.caseArt = caseArt;
    // The cases he throws to be dodged carry no claim (the lens says so).
    this.unclaimedArt = {
      claim: 'NO CLAIM',
      present: canvasTexture(paintClaimCase({ era: 'present', claim: 'NO CLAIM', seed: 2, tone: '#4a3f36' })),
      past: canvasTexture(paintClaimCase({ era: 'past', claim: 'UNCLAIMED · NO OWNER', seed: 2, tone: '#4a3f36' })),
    };
    yield;
    // Actors: the Night Service ink forms now; the Borrowed Light rain forms
    // are added by borrowedLightArt().
    const butchInk = { idle: paintInkButch({ pose: 'idle' }) };
    yield;
    for (const [key, options] of [
      ['walk0', { pose: 'walk', phase: 0 }], ['walk1', { pose: 'walk', phase: 0.25 }],
      ['walk2', { pose: 'walk', phase: 0.5 }], ['walk3', { pose: 'walk', phase: 0.75 }],
      ['punch', { pose: 'punch' }], ['hurt', { pose: 'hurt' }], ['jump', { pose: 'walk', phase: 0.12 }],
    ]) {
      butchInk[key] = paintInkButch(options);
      yield;
    }
    this.puppet = new PaperActor(this.textureLoader, [
      { painted: true, width: 2.4 * (64 / 86), height: 2.4, frames: butchInk },
      null,
      null,
      { width: 1.5, height: 2.5, frames: { idle: ch4ButchIdleUrl, walk0: ch4ButchIdleUrl, walk1: ch4ButchWalk1Url, walk2: ch4ButchWalk2Url, walk3: ch4ButchWalk3Url, jump: ch4ButchWalk1Url } },
    ]);
    this.playerRoot.add(this.puppet.root);
    yield;
    const conductorInk = paintInkConductor({});
    this.conductorPaper = new PaperActor(this.textureLoader, [
      { painted: true, width: 3.8 * (conductorInk.width / conductorInk.height), height: 3.8, frames: { idle: conductorInk } },
      null,
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
    this.keepConductorOutOfFog();
    this.conductorRoot.add(this.conductorPaper.root);
    this.setConductorWorld(this.phase, true);
    this.puppet.setForm(this.phase, true);
    this.puppet.root.visible = this.phase !== 2;
  }

  // He stands far back: keep the fog off his painted cards so he reads.
  keepConductorOutOfFog() {
    this.conductorPaper?.cards.forEach((card) => { if (card.face?.material) card.face.material.fog = false; });
  }

  // Movement II art: wet roofs over the street gap, the skyline, bridges,
  // billboards, the lamp nodes and the rain forms of Butch and the Conductor.
  *borrowedLightArt() {
    const pools = BELL_ARENA.nodes.map((node) => ({ x: node.x, z: node.z + 0.4, r: 3.4, alpha: 0.36, color: node.line === 'rose' ? 'rgba(230, 170, 150, 0.9)' : 'rgba(255, 190, 110, 0.9)' }));
    const setMap = (mesh, canvas) => { mesh.material.map = canvasTexture(canvas); mesh.material.color.setHex(0xffffff); mesh.material.needsUpdate = true; };
    setMap(this.rainRoofNear, paintRoofSection({ z0: BELL_ARENA.gapNearZ, z1: 10, lanes: LANE_X, lights: pools, rim: 'top', seed: 5 }));
    yield;
    setMap(this.rainRoofFar, paintRoofSection({ z0: CONDUCTOR_Z - 6, z1: BELL_ARENA.gapFarZ, lanes: LANE_X, lights: Object.values(LANE_X).map((x) => ({ x, z: CONDUCTOR_Z + 2, r: 4, alpha: 0.22 })), rim: 'bottom', seed: 9 }));
    yield;
    setMap(this.rainStreet, paintStreetBelow({ width: RAIN_FLOOR.x1 - RAIN_FLOOR.x0 + 30, depth: BELL_ARENA.gapNearZ - BELL_ARENA.gapFarZ + 2 }));
    yield;
    for (const [index, wall] of this.rainGapWalls.entries()) {
      setMap(wall, paintGapWall({ width: RAIN_FLOOR.x1 - RAIN_FLOOR.x0 + 30, height: 7, seed: 4 + index }));
      yield;
    }
    this.rainSkyline.material.map = canvasTexture(paintRainSkyline());
    this.rainSkyline.material.color.setHex(0xffffff);
    this.rainSkyline.material.needsUpdate = true;
    yield;
    const deck = canvasTexture(paintBridgeDeck(400, 150));
    Object.values(this.bridgeMeshes).forEach(({ deck: mesh }) => { mesh.material.map = deck; mesh.material.needsUpdate = true; });
    this.billboardArt = { dark: canvasTexture(paintBillboardFace(false)), lit: canvasTexture(paintBillboardFace(true)) };
    Object.values(this.boardMeshes).forEach(({ face }) => { face.material.map = this.billboardArt.dark; face.material.color.setHex(0xffffff); face.material.needsUpdate = true; });
    yield;
    const nodeArt = {};
    for (const line of ['amber', 'teal', 'rose']) {
      nodeArt[line] = Object.fromEntries(['idle', 'queued', 'powering'].map((state) => [state, canvasTexture(paintLampNode({ line, state }))]));
      yield;
    }
    this.nodeArt = nodeArt;
    this.syncNodeArt(true);
    const butchRain = {};
    for (const [key, options] of [
      ['idle', { pose: 'idle' }],
      ['walk0', { pose: 'run', phase: 0 }], ['walk1', { pose: 'run', phase: 0.25 }],
      ['walk2', { pose: 'run', phase: 0.5 }], ['walk3', { pose: 'run', phase: 0.75 }],
      ['punch', { pose: 'punch' }], ['hurt', { pose: 'hurt' }], ['jump', { pose: 'jump' }],
    ]) {
      butchRain[key] = paintRainFigure(options);
      yield;
    }
    this.puppet.setCard(1, { painted: true, width: 2.6 * (butchRain.idle.width / butchRain.idle.height), height: 2.6, frames: butchRain, lift: -0.1 });
    const conductorRain = paintRainConductor({ scale: 4 });
    const conductorRainLit = paintRainConductor({ scale: 4, lit: true });
    this.conductorPaper.setCard(1, { painted: true, width: 3.9 * (conductorRain.width / conductorRain.height), height: 3.9, frames: { idle: conductorRain, punch: conductorRainLit, hurt: conductorRainLit } });
    this.keepConductorOutOfFog();
    this.setConductorWorld(this.phase, true);
  }

  buildHud() {
    // A new world is held behind black until the GPU has drawn it (alpha
    // A4-10: on a slow GPU the canvas lagged the DOM, so Movement II opened
    // as its HUD and tags over the black of the fall).
    this.veil = document.createElement('div');
    this.veil.className = 'nf-world-veil';
    this.veil.setAttribute('aria-hidden', 'true');
    this.container.appendChild(this.veil);
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
    // Hit feedback (A4-5): the edge flash, the "what hit you" tag over the
    // layers, and the death card.
    this.hitFlashEl = document.createElement('div');
    this.hitFlashEl.className = 'nf-hit-flash';
    this.hitFlashEl.setAttribute('aria-hidden', 'true');
    this.hitLabelEl = document.createElement('div');
    this.hitLabelEl.className = 'nf-hit-label';
    this.hitLabelEl.setAttribute('role', 'status');
    this.hitLabelEl.innerHTML = '<b>HIT BY</b><span></span>';
    this.deathCardEl = document.createElement('div');
    this.deathCardEl.className = 'nf-death-card';
    this.deathCardEl.setAttribute('role', 'status');
    this.deathCardEl.innerHTML = '<p class="nf-death-card__stamp"></p><p class="nf-death-card__title">What tore it: <b class="nf-death-card__what"></b></p><p class="nf-death-card__kept"></p><p class="nf-death-card__lines"></p>';
    this.hud.append(this.hitFlashEl, this.hitLabelEl, this.deathCardEl);
    this.tags = createTagLayer(this.hud);
    this.caption = document.createElement('section');
    this.caption.className = 'nf-caption';
    this.caption.hidden = true;
    this.caption.innerHTML = '<p class="nf-caption__speaker"></p><p class="nf-caption__text"></p><div class="nf-caption__choices nf-caption__choices--pair"></div><span class="nf-caption__meta"></span>';
    // Round 11: Movement III's lines are spoken while it is fought; the
    // caption is a subtitle, never a board to answer on.
    this.caption.style.pointerEvents = 'none';
    this.hud.append(this.caption);
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    });
    // The unified keys (round 6, item 18; finaleControls.js): Space only
    // jumps, Shift / X dash, E or Enter is the movement's action. Movement IV
    // holds its verbs: hold E absorbs, hold R returns (read each step).
    window.addEventListener('keydown', (event) => {
      if (globalThis.NIGHTFALL_PAUSED) return;
      this.keys.add(event.code);
      if (event.repeat) return;
      if (event.code === 'Space') { event.preventDefault(); this.jumpKey(); }
      if (event.code === 'ShiftLeft' || event.code === 'ShiftRight' || event.code === 'KeyX') this.dash();
      if (event.code === 'KeyE' || event.code === 'Enter' || event.code === 'NumpadEnter') {
        if (event.code !== 'KeyE') event.preventDefault();
        this.actAction({ key: event.code === 'KeyE' ? 'E' : 'Enter' });
      }
      // Arrow keys / WASD take the lens back from the mouse (it leads Butch).
      if (this.phase === 0 && /^(Key[WASD]|Arrow)/.test(event.code) && this.lost.lensMode === 'mouse' && this.elapsed - this.lost.lastPointer > 1.5) this.lost.lensMode = 'lead';
      if (event.code === 'KeyF' && this.mode !== 'menu') {
        if (!document.fullscreenElement) document.querySelector('.stage-wrap')?.requestFullscreen?.(); else document.exitFullscreen?.();
      }
    });
    window.addEventListener('keyup', (event) => { this.keys.delete(event.code); });
    window.addEventListener('blur', () => { this.keys.clear(); this.mouseHeld = { left: false, right: false }; });
    this.renderer.domElement.addEventListener('contextmenu', (event) => { if (this.mode === 'play') event.preventDefault(); });
    this.renderer.domElement.addEventListener('pointerdown', (event) => {
      this.mousePoint = { clientX: event.clientX, clientY: event.clientY };
      if (this.mode !== 'play') return;
      if (event.button === 0) this.mouseHeld.left = true;
      if (event.button === 2) this.mouseHeld.right = true;
      if (this.phase === 0 && event.button === 0) { this.aimLensAt(event); this.actAction(); return; }
      // Movement III: a click strikes too (and says it at the front edge).
      if (this.phase === 2 && event.button === 0) this.actAction();
      if (this.phase === 3) event.preventDefault();
    });
    this.renderer.domElement.addEventListener('pointermove', (event) => {
      this.mousePoint = { clientX: event.clientX, clientY: event.clientY };
      if (this.phase === 0) this.aimLensAt(event);
    });
    const release = (event) => {
      if (event.button === 0 || event.button === undefined) this.mouseHeld.left = false;
      if (event.button === 2 || event.button === undefined) this.mouseHeld.right = false;
    };
    this.renderer.domElement.addEventListener('pointerup', release);
    this.renderer.domElement.addEventListener('pointercancel', () => { this.mouseHeld = { left: false, right: false }; });
    this.renderer.domElement.addEventListener('pointerleave', () => { this.mouseHeld = { left: false, right: false }; });
  }

  // The gamepad (finaleControls.js readFinalePad), polled once a frame.
  pollPad() {
    let pads = [];
    try { pads = globalThis.navigator?.getGamepads?.() ?? []; } catch { pads = []; }
    const pad = readFinalePad(pads, this.padButtons);
    this.padButtons = pad.buttons;
    this.pad = pad.connected ? pad : null;
    if (!pad.connected || globalThis.NIGHTFALL_PAUSED) { if (pad.pressed.start && globalThis.NIGHTFALL_PAUSED) this.pauseMenu?.close?.(); return; }
    if (pad.pressed.start && this.mode !== 'menu') { this.pauseMenu?.open?.(); return; }
    if (pad.pressed.jump) { if (this.mode === 'menu') document.querySelector('#start')?.click(); else this.jumpKey(); }
    if (pad.pressed.dash) this.dash();
    if (pad.pressed.act && this.phase !== 3) this.actAction();
    if (this.phase === 0 && pad.aimActive) { this.lost.lensMode = 'stick'; }
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

  // One banner slot under the ticket bar (alpha round 4: a toast and the
  // hint stacked as two banners): a toast takes the hint's place while it
  // shows, and the hint comes back when it goes.
  toast(text, hold = 2.2) {
    this.toastEl.textContent = text;
    this.toastEl.classList.remove('show');
    void this.toastEl.offsetWidth;
    this.toastEl.classList.add('show');
    this.hud.classList.add('has-toast');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.toastEl.classList.remove('show'); this.hud.classList.remove('has-toast'); }, hold * 1000);
    this.lastToast = text;
  }

  // The same gentle note at most once every few seconds (an action key
  // pressed where it does nothing says why, without nagging).
  toastOnce(key, text, hold = 2.2, everyS = 4) {
    this.toastGate ||= new Map();
    const now = performance.now();
    if (now - (this.toastGate.get(key) ?? -Infinity) < everyS * 1000) return;
    this.toastGate.set(key, now);
    this.toast(text, hold);
  }

  // Hold the veil over the stage from now until a frame of the new world
  // has finished on the GPU. `cameraUp`: wait for the falling camera to be
  // back above the new floor first.
  holdWorldVeil({ cameraUp = false } = {}) {
    this.dropWorldFence();
    this.veilState = { cameraUp, frames: 0, fence: null, since: performance.now() };
    this.veil.classList.remove('is-lifting');
    this.veil.classList.add('is-held');
  }

  dropWorldFence() {
    const fence = this.veilState?.fence;
    if (!fence) return;
    try { this.renderer.getContext().deleteSync(fence); } catch {}
  }

  // After each render: has the GPU drawn the new world yet?
  checkWorldVeil() {
    const state = this.veilState;
    if (!state) return;
    if (this.transition?.kind === 'world-fall' && !this.transition.switched) return;
    if (this.transition?.kind === 'verified') return;
    if (state.cameraUp && this.camera.position.y < 1.5) return;
    state.frames += 1;
    const gl = this.renderer.getContext();
    let drawn = state.frames >= 3;
    if (typeof gl.fenceSync === 'function') {
      if (!state.fence) {
        state.fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        return;
      }
      drawn = gl.getSyncParameter(state.fence, gl.SYNC_STATUS) === gl.SIGNALED && state.frames >= 2;
    }
    // Never hold longer than a few seconds, whatever the GPU reports.
    if (!drawn && performance.now() - state.since < 6000) return;
    this.liftWorldVeil();
  }

  liftWorldVeil() {
    this.dropWorldFence();
    this.veilState = null;
    this.veil.classList.remove('is-held');
    this.veil.classList.add('is-lifting');
    clearTimeout(this.veilTimer);
    this.veilTimer = setTimeout(() => this.veil.classList.remove('is-lifting'), 600);
    const pending = this.pendingTitleCard;
    this.pendingTitleCard = null;
    pending?.();
  }

  get worldVeiled() { return Boolean(this.veilState); }

  hint(text) {
    if (!text) { this.hintEl.classList.remove('show'); this.hintText = ''; this.hud.classList.remove('has-hint'); return; }
    if (this.hintText === text && this.hintEl.classList.contains('show')) return;
    this.hintText = text;
    this.hintEl.innerHTML = text;
    this.hintEl.classList.add('show');
    this.hud.classList.add('has-hint');
  }

  screenPoint(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    if (v.z > 1) return null;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    return { x: (v.x + 1) * 0.5 * w, y: (1 - v.y) * 0.5 * h };
  }

  playVoice(cue, onEnded = null) {
    // A cue made of two recordings (echoExchanges.js) plays them in order.
    if (Array.isArray(cue?.parts) && cue.parts.length) {
      const parts = cue.parts;
      const playFrom = (index) => this.playVoice(parts[index], index + 1 < parts.length ? () => playFrom(index + 1) : onEnded);
      return playFrom(0);
    }
    // E / Enter / a click can move a line on (advanceDialogue): voiceSkip
    // ends this line now, exactly as its end would.
    const readMs = Math.min(4200, 900 + (cue?.text?.length ?? 0) * 45);
    clearTimeout(this.voiceTimer);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(this.voiceTimer);
      if (this.voiceSkip === skip) this.voiceSkip = null;
      this.voiceState.playing = false;
      music.setDialogueActive(false);
      onEnded?.();
    };
    const skip = () => { this.voiceAudio?.pause(); finish(); };
    this.voiceSkip = skip;
    this.voiceStartedAt = performance.now();
    if (!cue?.url || !this.voiceAudio || !soundEnabled) { this.voiceTimer = setTimeout(finish, readMs); return false; }
    this.voiceAudio.pause();
    this.voiceAudio.src = cue.url;
    this.voiceAudio.currentTime = 0;
    this.voiceState = { playing: true, speaker: cue.speaker, tone: cue.tone, text: cue.text };
    music.setDialogueActive(true);
    this.voiceAudio.onended = finish;
    this.voiceAudio.onerror = finish;
    this.voiceAudio.play().catch(() => { if (!done) this.voiceTimer = setTimeout(finish, readMs); });
    return true;
  }

  // Nothing heavy runs before the menu is on screen and taking input. Then
  // each movement's art and models are prepared in order, in short slices
  // (runSliced), while the player reads the board or fights the movement
  // before it. begin() and the world transitions wait on prepareMovement(),
  // so a movement never opens on unpainted placeholders.
  async loadAssets() {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    for (let index = 0; index < PHASES.length; index += 1) await this.prepareMovement(index);
    this.assetsReady = true;
  }

  // Resolves when movement `index` (and every movement before it) is ready.
  prepareMovement(index) {
    const target = THREE.MathUtils.clamp(Math.round(index), 0, PHASES.length - 1);
    if (!this.movementPrep.has(target)) {
      const previous = target > 0 ? this.prepareMovement(target - 1) : Promise.resolve();
      this.movementPrep.set(target, previous.then(() => this.buildMovementAssets(target)).catch((error) => {
        this.assetErrors.push({ id: `movement-${target}`, message: error?.message || String(error) });
      }).finally(() => this.readyMovements.add(target)));
    }
    return this.movementPrep.get(target);
  }

  movementReady(index) {
    return this.readyMovements.has(index);
  }

  async buildMovementAssets(index) {
    const uploads = [];
    if (index === 0) {
      const sources = await loadFinaleArtSources();
      await (document.fonts?.ready ?? Promise.resolve());
      await runSliced(this.lostPropertyArt(sources), { sink: uploads });
    } else if (index === 1) {
      await runSliced(this.borrowedLightArt(), { sink: uploads });
    } else if (index === 2) {
      await this.loadEchoCityModels();
      await runSliced(this.echoCityArt(), { sink: uploads });
    } else if (index === 3) {
      await runSliced(this.paintedCountryArt(), { sink: uploads });
    }
    // Upload the new textures now, one per slice, rather than all at once on
    // the first frame that shows them.
    await runSliced((function* upload(renderer) {
      for (const texture of uploads) { renderer.initTexture(texture); yield; }
    }(this.renderer)), { budgetMs: 8 });
    this.cheapenScene();
  }

  // Movement III draws the two Chapter 3 rigs, their animation library and
  // the three civic props the Conductor throws.
  async loadEchoCityModels() {
    await MeshoptDecoder.ready;
    const urls = { conductor: PUBLIC_ASSETS.conductorUrl, butch: PUBLIC_ASSETS.butchUrl, chapter3Animations: PUBLIC_ASSETS.chapter3AnimationsUrl, trash: PUBLIC_ASSETS.trashUrl, bench: PUBLIC_ASSETS.benchUrl, speaker: PUBLIC_ASSETS.speakerUrl };
    // Fetch together (the 5→6 film's preloader has usually cached them),
    // then parse one model per slice.
    const bytes = Object.fromEntries(Object.entries(urls).map(([id, url]) => [id, fetch(url).then((response) => {
      if (!response.ok) throw new Error(`${response.status} ${url}`);
      return response.arrayBuffer();
    })]));
    Object.values(bytes).forEach((promise) => promise.catch(() => {}));
    for (const [id, url] of Object.entries(urls)) {
      try {
        const gltf = await this.loader.parseAsync(await bytes[id], THREE.LoaderUtils.extractUrlBase(url));
        this.assets.set(id, { root: shadows(gltf.scene), animations: gltf.animations });
      } catch (error) {
        this.assetErrors.push({ id, message: error?.message || String(error) });
      }
      await yieldToMain();
    }
    this.installConductor();
    await yieldToMain();
    this.installButch();
  }

  cloneAsset(id, height, width = Infinity) {
    const source = this.assets.get(id);
    if (!source) return null;
    const root = fitModel(source.root.clone(true), height, width);
    if (this.quality.tier === 'low') {
      this.cheapMaterials ||= new Map();
      root.traverse((child) => {
        if (!child.isMesh) return;
        child.castShadow = false;
        child.receiveShadow = false;
        child.material = Array.isArray(child.material) ? child.material.map((m) => cheapMaterial(m, this.cheapMaterials)) : cheapMaterial(child.material, this.cheapMaterials);
      });
    }
    return root;
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
    // His own clips, plus the shared Chapter 3 library (the same rig as
    // Butch's) for the reactions his file lacks: the hit and the exposed
    // stance (alpha round 4: Fixing_Kneeling read as a crumpled model).
    const shared = (this.assets.get('chapter3Animations')?.animations || []).filter((clip) => !source.animations.some((own) => own.name === clip.name));
    const clips = [...shared, ...source.animations];
    if (clips.length) {
      this.conductorMixer = new THREE.AnimationMixer(root);
      this.conductorActions = Object.fromEntries(clips.map((clip) => [clip.name.replace(/_Rig$/, ''), this.conductorMixer.clipAction(clip)]));
      this.playConductorAction('Idle_Loop');
    }
    this.setConductorWorld(this.phase, true);
  }

  setConductorWorld(index, immediate = false) {
    const isEchoCity = index === 2;
    // Movement III uses the full 3D rig: kept small enough that his head
    // never slides under the ticket bar at the top of the screen (at 16:9,
    // 1280×720 as at 1920×1080, alpha A4-3).
    // IV's paper card is drawn arm-raised, so it stands a little smaller too:
    // the hint under the ticket bar never covers his face.
    this.conductorRoot.scale.setScalar(isEchoCity ? 2.85 : index === 3 ? 3.15 : 3.8);
    this.conductorPaper?.setForm(index, immediate);
    if (this.conductorPaper) this.conductorPaper.root.visible = !isEchoCity;
    this.conductorFallback.visible = this.movementReady(index) && (isEchoCity ? !this.conductorModel : !this.conductorPaper);
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
    // A fresh fight for a fresh run (PLAY THE CONDUCTOR AGAIN plays its
    // patterns from new seeds).
    this.runs += 1;
    this.keptFlash = 0;
    this.lastDeath = null;
    this.player = createBody({ x: 0, z: 6.1, layers: D().layers });
    Object.assign(this.boss, { x: 0, targetX: 0, z: CONDUCTOR_Z, hp: PHASE_START_HP[startMovement], phaseStartHp: PHASE_START_HP[startMovement], paintCoverage: 0, inv: 0, exposed: 0, attackClock: 1.4, stagger: 0, gesture: 'idle', gestureTime: 0, reaction: 'idle', flash: 0, rounds: 0, phaseRound: 0 });
    this.playerRoot.position.set(0, 0, 6.1);
    this.conductorRoot.position.set(0, -2.8, CONDUCTOR_Z);
    this.conductorRoot.visible = true;
    this.holdWorldVeil();
    // Open on the fight's own framing (behind the veil), not the board's.
    const pose = this.gameplayCameraPose();
    this.camera.position.copy(pose.position);
    this.cameraTarget.copy(pose.target);
    this.camera.lookAt(this.cameraTarget);
    this.setWorld(startMovement);
    // Face the camera at once: on a slow machine the half-turn in could
    // leave both figures edge-on for seconds (A4-10).
    this.setConductorWorld(startMovement, true);
    this.puppet?.setForm(startMovement, true);
    this.hud.classList.remove('hidden');
    this.enterMovement(startMovement, { first: true });
    stampAnnounce(this.hud, 'DEPARTING');
    this.updateHud();
  }

  // Everything a movement needs the moment the player lands in it. Its
  // title card carries its keys (where the verbs change) and, once, the rule
  // that a torn last layer never undoes progress (round 6, item 16).
  enterMovement(index, { first = false } = {}) {
    const phase = PHASES[index];
    this.setControlsStage(phase.id);
    const card = () => {
      // Short: the movement's first phase opens teaching by doing.
      const shown = showTitleCard({ kicker: `MOVEMENT ${phase.number}`, main: phase.world, sub: phase.rule, keys: MOVEMENT_KEYS[index], duration: 3600, parent: this.hud });
      const kept = document.createElement('p');
      kept.className = 'nf-title-card__kept';
      kept.textContent = difficulty === 'story' ? STORY_KEPT_LINE : PROGRESS_KEPT_LINES[index];
      shown?.root?.firstElementChild?.append(kept);
      return shown;
    };
    clearTimeout(this.titleTimer);
    this.pendingTitleCard = null;
    // The card waits for the world it names to be on screen.
    const show = () => { if (this.worldVeiled) this.pendingTitleCard = card; else card(); };
    if (first) this.titleTimer = setTimeout(show, 1250); else show();
    this.startFight(index);
    this.applyPhaseLook(0);
    if (index === 1) { bellAudio.setRain?.(0.5); this.syncNodeArt(true); }
  }

  // The pause menu's stage (finaleControls.js): the shell listens for it.
  setControlsStage(stage) {
    if (this.controlsStage === stage) return;
    this.controlsStage = stage;
    announceControlsStage(stage, typeof window === 'undefined' ? null : window);
  }

  clearCombat() {
    [...this.hazards, ...this.projectiles, ...this.effects].forEach((item) => this.scene.remove(item.root || item));
    this.hazards = [];
    this.projectiles = [];
    this.effects = [];
    this.fightVisuals?.clear();
    this.clearEntityViews();
    this.stopVoices?.();
    this.portal.visible = false;
    this.holeVisuals?.forEach((hole) => { hole.visible = false; });
    this.closeCaption();
    this.dialoguePause = false;
    this.showFrontEdge(false);
    this.activeHoles = [];
    this.playerRoot.visible = true;
    this.departureTrain.visible = false;
    this.hud.classList.remove('is-departing', 'is-cinematic');
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
    // III takes Echo City's wine dusk, IV the paper of the Painted Country.
    const fogColors = [0x0f0a07, 0x070c10, 0x241517, 0xe5dfce];
    const fogDensity = [0.012, 0.016, 0.014, 0.014];
    this.scene.background.setHex(fogColors[index]);
    this.scene.fog.color.setHex(fogColors[index]);
    this.scene.fog.density = fogDensity[index];
    this.rim.color.setHex([AMBER, ROSE, 0xf0b45f, 0xff806f][index]);
    this.key.color.setHex(index === 3 ? 0xffedcf : index === 2 ? 0xffd6b0 : index === 1 ? 0xb8c8d0 : 0xffe7c0);
    this.key.intensity = index === 1 ? 1.6 : index === 2 ? 2.6 : 3.6;
    this.hemi.intensity = index === 1 ? 0.9 : index === 2 ? 1.5 : 2.2;
    this.rain.visible = index === 1;
    this.lensRim.visible = index === 0 && Boolean(this.lensRim.material.map);
    if (this.puppet) this.puppet.root.visible = index !== 2;
    this.butchRoot.visible = index === 2;
    this.setConductorWorld(index);
    this.holeVisuals.forEach((hole) => { hole.visible = false; });
    this.activeHoles = [];
    if (this.collapseView) this.collapseView.visible = false;
    if (this.nextLaneMarker) this.nextLaneMarker.visible = index === 1;
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

  // ------------------------------------------------------------ the fight
  //
  // Round 11: the rules of every movement live in a director
  // (movements/*.js) wrapped by a runner (conductorFight.js) that owns
  // Butch's body and layers. The stage feeds it input once per step and
  // draws what it reports. Nothing here decides a hit.

  startFight(index) {
    const factory = MOVEMENT_FIGHTS[index];
    const director = factory({ difficulty, seed: FIGHT_SEEDS[index] + (this.runs ?? 0) * 13 });
    const keep = this.player;
    this.runner = createFightRunner({ director, difficulty, ledger: this.deaths, movement: index, spawn: { x: 0, z: 6.2 } });
    this.fight = director;
    this.player = this.runner.body;
    if (keep) { this.player.inv = Math.max(this.player.inv, keep.inv ?? 0); this.player.facingX = keep.facingX ?? 0; }
    this.pendingInput = { jump: false, dash: false, act: false };
    this.fightVisuals?.clear();
    this.clearEntityViews();
    this.phaseShown = director.track.index;
    this.lensView = { x: 0, z: 3.5, radius: LENS_RADIUS };
    this.bell.telegraphLanes = [];
    this.bell.beamLanes = [];
    this.bell.beamFlash = 0;
    this.collapseView && (this.collapseView.visible = false);
    this.showFrontEdge(false);
    this.holeVisuals?.forEach((hole) => { hole.visible = false; });
    this.boss.exposed = 0;
    this.syncBossHp();
    this.playerRoot.position.set(this.player.x, 0, this.player.z);
  }

  // His ticket: the movements before this one, plus what is left of it.
  syncBossHp() {
    if (!this.fight) return;
    this.boss.hp = MOVEMENT_BASE_HP[this.phase] + this.fight.track.hp;
  }

  // ------------------------------------------------------------ input
  queueInput(kind) { if (this.pendingInput) this.pendingInput[kind] = true; }

  // One step's input, from the keys, the mouse and the pad. Presses are
  // consumed by the first step of a frame.
  fightInput() {
    const k = this.keys;
    let dx = Number(k.has('ArrowRight') || k.has('KeyD')) - Number(k.has('ArrowLeft') || k.has('KeyA'));
    let dz = Number(k.has('ArrowDown') || k.has('KeyS')) - Number(k.has('ArrowUp') || k.has('KeyW'));
    const pad = this.pad;
    if (pad?.connected) { dx += pad.moveX; dz += pad.moveZ; }
    const pending = this.pendingInput ?? {};
    const input = { dx, dz, jump: Boolean(pending.jump), dash: Boolean(pending.dash), act: Boolean(pending.act), actHeld: false, retHeld: false, aim: null };
    if (this.phase === 0) {
      if (pad?.aimActive) input.aim = { x: this.player.x + pad.aimX * 4.2, z: this.player.z + pad.aimZ * 4.2 };
      else if (this.lost.lensMode === 'mouse' && this.lost.pointer) input.aim = this.groundPointFromPointer(this.lost.pointer) ?? this.lost.lensTarget;
      else if (this.lost.lensMode === 'mouse' && this.qaAim) input.aim = this.qaAim;
      if (input.aim) this.lost.lensTarget = { x: input.aim.x, z: input.aim.z };
    }
    if (this.phase === 3) {
      input.actHeld = k.has('KeyE') || Boolean(pad?.buttons.act) || this.mouseHeld.right;
      input.retHeld = k.has('KeyR') || Boolean(pad?.buttons.ret) || this.mouseHeld.left;
      if (this.mouseHeld.right && this.mousePoint) input.aim = this.groundPointFromPointer(this.mousePoint);
    }
    this.pendingInput = { jump: false, dash: false, act: false };
    return input;
  }

  // Space: always a jump (and boarding the night service).
  jumpKey() {
    if (this.mode === 'departure') { this.jumpAboardDepartureTrain(); return; }
    if (this.mode !== 'play' || this.transition || this.dialoguePause) return;
    this.queueInput('jump');
  }

  jump() {
    if (!['play', 'departure'].includes(this.mode) || this.transition || this.dialoguePause) return;
    if (startJump(this.player)) this.tone(330, 0.08, 'triangle', 0.03);
  }

  dash() {
    if (this.mode !== 'play' || this.transition || this.dialoguePause) return;
    this.queueInput('dash');
  }

  // E / Enter / a click (Movement I) / pad X: the movement's action.
  actAction({ key = 'E' } = {}) {
    if (this.mode === 'departure') { this.jumpAboardDepartureTrain(); return; }
    if (this.mode !== 'play' || this.transition || this.storyOffer || this.dialoguePause) return;
    if (this.phase === 3) { if (key === 'Enter') this.toastOnce('enter-paint', 'HOLD E · ABSORB WET COLOUR   ·   HOLD R · RETURN IT WHEN HE IS OPEN'); return; }
    this.queueInput('act');
  }

  aimLensAt(event) {
    if (this.mode !== 'play' || this.phase !== 0) return;
    this.lost.pointer = { clientX: event.clientX, clientY: event.clientY };
    this.lost.lensMode = 'mouse';
    this.lost.lastPointer = this.elapsed;
  }

  // ------------------------------------------------------------ one step
  stepFight(dt) {
    if (!this.runner) return;
    // DEV: the QA bot (fightBot.js) can play instead of the keys.
    let input = this.fightInput();
    if (DEV_MODE && this.bot) input = this.bot.decide(this.runner, dt);
    const events = this.runner.step(dt, input);
    this.onFightEvents(events);
    this.syncBossHp();
  }

  onFightEvents(events) {
    const director = this.fight;
    for (const e of events) {
      switch (e.type) {
        case 'telegraph': this.fightVisuals.add(e.attack, this.telegraphStyle(e.attack)); this.onTelegraph(e.attack); break;
        case 'strike': this.fightVisuals.struck(e.attack, this.elapsed); this.onStrike(e.attack); break;
        case 'remove': this.fightVisuals.remove(e.attack); this.removeEntityView(e.attack.id); break;
        case 'jump': this.tone(330, 0.08, 'triangle', 0.03); break;
        case 'dash': this.trauma = Math.max(this.trauma, 0.12); this.tone(410, 0.09, 'sawtooth', 0.03); break;
        case 'land': this.trauma = Math.max(this.trauma, 0.08); this.tone(110, 0.055, 'triangle', 0.02); this.butchLandTimer = 0.2; break;
        case 'hurt': this.onHurt(e); break;
        case 'death': this.onDeath(e); break;
        case 'damage': this.bossHitFx(e.amount, DAMAGE_REACTION[e.cause] ?? 'pain', e); break;
        case 'phase-cleared': this.onPhaseCleared(e); break;
        case 'phase': this.onPhaseStart(e); break;
        case 'finished': this.onMovementFinished(); break;
        case 'act': this.onActResult(e); break;
        case 'reposition': this.playerRoot.position.set(e.x, 0, e.z); if (e.why === 'fall') { bellAudio.fallWhoosh?.(); this.toast('THE STREET IS A LONG WAY DOWN · BACK ON THE NEAR ROOF'); } break;
        // Movement I
        case 'case-landed': this.spawnImpact(e.x, 0.4, e.z, e.claim ? AMBER : 0x8a7a66); this.trauma = Math.max(this.trauma, 0.28); this.tone(96, 0.14, 'square', 0.03); break;
        case 'return': this.flyCaseBack(e); break;
        // Movement II
        case 'arena': this.onBellEvent(e.event); break;
        case 'return-plank': bellAudio.machineOn('bridge'); if (!e.rider) this.toast('A RETURN PLANK · THE LINE WILL NOT STRAND YOU · STEP BACK ACROSS', 3); break;
        // Movement III
        case 'say': this.queueVoice(e.cue, { meta: e.meta ?? '', kind: e.kind }); break;
        case 'misread-hit': this.showRecordLine(e); break;
        case 'pair': this.onPair(e); break;
        case 'deflected': this.toast(e.line, 3.2); bellAudio.refused(); break;
        case 'no-answer': this.toast('HE HAS NO ANSWER', 2.4); this.trauma = Math.max(this.trauma, 0.4); this.playConductorAction('Hit_Chest', true); break;
        case 'said': this.toast('SAID TO HIS FACE', 2.4); break;
        // Movement IV
        case 'absorb': this.spawnImpact(this.player.x, 1, this.player.z, PIGMENT_HEX[e.colour] ?? 0xff806f); this.tone(520 + e.charge * 70, 0.1, 'triangle', 0.03); if (e.via === 'dash') this.toast(`THROUGH THE SWEEP · COLOUR ${e.charge} / 3`, 1.6); break;
        case 'spilled': this.toast('THE COLOUR ON YOUR BRUSH IS SPILLED', 1.8); break;
        case 'stroke': this.launchStroke(e); break;
        case 'stroke-landed': this.toast(`${e.charge} COLOUR${e.charge === 1 ? '' : 'S'} RETURNED · ${paintReturnDamage(e.charge)}`, 1.8); break;
        case 'stroke-blocked': this.toast('HIS BRUSH WAS WET · HE PAINTS IT OUT AND FLICKS IT BACK', 2.4); bellAudio.refused(); break;
        case 'open': this.boss.reaction = 'pain'; this.boss.gestureTime = 0.8; this.tone(660, 0.18, 'triangle', 0.035); break;
        default: break;
      }
    }
    if (director && director.track.index !== this.phaseShown && this.fight === director) this.phaseShown = director.track.index;
  }

  telegraphStyle(attack) {
    const m = this.phase;
    if (m === 0) {
      if (attack.source === 'case') return attack.meta?.claim ? { color: CHANCE_HEX, edge: 0xffe2a0 } : { color: DANGER_COLORS.lost, edge: 0xf3e2c0 };
      if (attack.source === 'stamp') return { color: OXBLOOD, edge: 0xf6d8c4 };
      return { color: AMBER, ghost: 0xc49a62 };
    }
    if (m === 1) return attack.source === 'bell-wave' ? { color: 0xf2c271, edge: 0xffe9b8 } : { color: DANGER_COLORS.borrowed };
    if (m === 2) return attack.meta?.echo ? { color: 0xc58fff, edge: 0xe8d6ff } : { color: DANGER_COLORS.echo, edge: 0xf3e2c0 };
    const pigment = PIGMENT_HEX[attack.meta?.colour] ?? DANGER_COLORS.painted;
    if (attack.source === 'cover') return { color: 0x46618c, edge: 0x2b2f3a };
    return { color: pigment, edge: 0x1d1f24 };
  }

  onTelegraph(attack) {
    const src = attack.source;
    if (src === 'train' || src === 'ghost-train') {
      this.tone(src === 'ghost-train' ? 880 : 62, src === 'ghost-train' ? 0.4 : 0.22, src === 'ghost-train' ? 'sine' : 'square', src === 'ghost-train' ? 0.012 : 0.03);
      this.ensureTrainView(attack);
    } else if (src === 'stamp') this.tone(140, 0.3, 'square', 0.02);
    else if (src === 'case') { this.ensureCaseView(attack); this.tone(attack.meta?.claim ? 720 : 520, 0.12, 'sine', 0.015); }
    else if (src === 'wash') this.tone(180, 0.5, 'sine', 0.025);
    else if (src === 'sweep') this.tone(300, 0.16, 'triangle', 0.02);
    if (this.phase === 2 && attack.meta?.prop) this.ensurePropView(attack);
    if (this.phase === 3 && (attack.meta?.paint || attack.meta?.cover)) this.ensurePaintDropView(attack);
  }

  onStrike(attack) {
    const src = attack.source;
    const heavy = ['stamp', 'wash', 'crushed-trash-can', 'fountain-bench', 'pa-speaker', 'cover'].includes(src);
    if (attack.kind === 'drop' || attack.kind === 'zone') { this.trauma = Math.max(this.trauma, heavy ? 0.42 : 0.22); this.tone(heavy ? 70 : 96, 0.16, 'square', 0.03); }
    if (attack.kind === 'train') this.trauma = Math.max(this.trauma, attack.ghost ? 0.08 : 0.2);
    if (attack.kind === 'wave') { this.tone(200, 0.2, 'triangle', 0.02); }
    if (src === 'stamp') this.inkStamp(attack);
  }

  onActResult(e) {
    const p = this.player;
    const r = e.result;
    if (this.phase === 0) {
      if (r === 'volley') { bellAudio.punchClack(); this.toast('VOLLEY · ON THE BOUNCE', 1.4); }
      else if (r === 'returned') { bellAudio.punchClack(); this.toast('CLAIM RETURNED', 1.2); }
      else if (r === 'unread') { bellAudio.refused(); this.toastOnce('unread', this.lost.lensMode === 'mouse' || this.pad?.aimActive ? 'READ THE CLAIM FIRST · PUT THE LENS ON IT' : 'READ THE CLAIM FIRST · FACE IT, THE LENS LEADS YOU', 1.8, 2); }
      else if (r === 'unclaimed') { bellAudio.refused(); this.toastOnce('unclaimed', 'NO CLAIM ON THAT ONE · THE BRASS RING IS THE CLAIM', 1.8, 2.5); }
      else if (r === 'out-of-reach') this.toastOnce('far', 'TOO FAR · WALK UP TO THE CASE', 1.4, 2);
      else if (r === 'none') this.toastOnce('no-case', 'NO CLAIM CASE YET · HE THROWS ONE IN EVERY PATTERN', 1.6, 3);
      if (['volley', 'returned'].includes(r)) p.attack = 0.26;
      return;
    }
    if (this.phase === 1) {
      const node = e.node ? BELL_ARENA.nodes.find((n) => n.id === e.node) : null;
      if (r === 'on-the-bell') { bellAudio.punchClack(); this.toast('ON THE BELL · THE BORROWED LIGHT GOES BACK', 1.6); }
      else if (r === 'hit') { bellAudio.punchClack(); this.toast('THE BORROWED LIGHT GOES BACK TO HIM', 1.4); }
      else if (r === 'wrong-lane') { bellAudio.refused(); this.toast(`STAND IN THE LIT LANE · ${String(e.lane).toUpperCase()}`); }
      else if (r === 'not-lit') { bellAudio.refused(); this.toastOnce('not-lit', 'HE IS NOT LIT · LIGHT HIS LANE ON THE BELL', 1.8, 2); }
      else if (r === 'spent') { bellAudio.refused(); this.toastOnce('spent', 'THAT LIGHT IS SPENT · LIGHT HIM AGAIN ON A BELL', 1.8, 2); }
      else if (r === 'no-lamp') this.toastOnce('no-lamp', 'NO LAMP IN REACH · WALK UP TO ONE', 1.6, 2.5);
      else if (['queued', 'caught', 'renew'].includes(r)) bellAudio.punchClack();
      else if (r === 'replaced') { bellAudio.punchClack(); bellAudio.fizzle(); this.toast(`ONE LINE, ONE BORROWED MOMENT · ${node?.label ?? 'THAT LAMP'} TAKES ITS PLACE`, 2.2); }
      else if (r === 'already') { bellAudio.refused(); this.toast(`${node?.label ?? 'THAT LAMP'} · ALREADY PUNCHED · IT GOES ON THE BELL`); }
      else if (r === 'busy') { bellAudio.refused(); this.toast(e.line === 'amber' ? 'THE AMBER LINE IS STILL OUT · PUNCH IT AGAIN ONCE ITS BRIDGE FOLDS' : `THE ${String(e.line).toUpperCase()} LINE IS STILL BURNING · WAIT FOR IT TO GO OUT`); }
      else if (r === 'cut') { bellAudio.cutLine(); this.toast(`${node?.label ?? 'THAT LAMP'} · CUT`); }
      if (r !== 'no-lamp' && r !== 'none') p.attack = 0.26;
      this.syncNodeArt();
      return;
    }
    if (this.phase === 2) {
      if (r === 'held') { bellAudio.paper?.(); this.tone(620, 0.12, 'sine', 0.03); this.toast('ONE TRUE THING · NOW THE OTHER', 1.6); }
      else if (r === 'pair') bellAudio.punchClack();
      else if (r === 'too-far') this.toastOnce('too-far', 'CLOSER · WALK UP TO IT', 1.2, 2);
      else if (r === 'closer') { bellAudio.refused(); this.toastOnce('closer', 'CLOSER · THE LIT FRONT EDGE', 1.4, 1.5); }
      else if (r === 'nothing') this.toastOnce('echo-wait', 'E STRIKES A TRUE THING · WAIT FOR THEM TO COME DOWN', 1.8, 3);
      if (['held', 'pair', 'said'].includes(r)) p.attack = 0.26;
    }
  }

  onHurt(e) {
    const label = HIT_SOURCES[e.source] ?? HIT_SOURCES.hit;
    this.hitStop = 0.07;
    this.trauma = Math.min(1, this.trauma + 0.55);
    this.spawnImpact(this.player.x, 1.4 + this.player.y, this.player.z, OXBLOOD);
    if (flashEnabled && !reducedMotionActive()) { this.renderer.domElement.classList.add('hit-flash'); setTimeout(() => this.renderer.domElement.classList.remove('hit-flash'), 70); }
    this.tone(63, 0.22, 'sawtooth', 0.05);
    this.lastHit = { source: e.source, label, at: this.elapsed };
    if (e.layersLeft > 0) this.showHitFeedback(this.lastHit, e.from);
  }

  // The last layer torn: a checkpoint restart (conductorFight.js). On NORMAL
  // this phase begins again; earlier phases stay won. STORY undoes nothing.
  onDeath(e) {
    this.clearEntityViews();
    this.fightVisuals.clear();
    this.playerRoot.position.set(e.x, 0, e.z);
    this.hitStop = 0.1;
    this.trauma = 0.25;
    this.keptFlash = 2.8;
    this.spawnImpact(e.x, 1.1, e.z, AMBER);
    this.tone(220, 0.28, 'triangle', 0.04);
    if (this.phase === 1) { this.syncNodeArt(true); }
    this.syncBossHp();
    this.boss.exposed = 0;
    const rollback = this.runner.tuning.rollback;
    this.lastDeath = { phase: this.phase, fightPhase: e.phase, source: this.lastHit?.source ?? 'hit', bossHp: this.boss.hp, rolledBack: e.rolledBack, rollback };
    this.showDeathCard(this.lastHit ?? { label: HIT_SOURCES.hit }, { rollback, phaseName: this.fight.track.phase.name });
    if (e.offerStory) this.offerStory();
  }

  onPhaseCleared(e) {
    this.boss.reaction = 'pain';
    this.boss.gestureTime = 2;
    this.boss.stagger = 0.5;
    this.hitStop = 0.12;
    this.trauma = Math.max(this.trauma, 0.6);
    this.playConductorAction('Hit_Head', true);
    this.tone(48, 0.6, 'sawtooth', 0.05);
    this.clearEntityViews({ keepFlights: true });
    if (!e.last) stampAnnounce(this.hud, 'PHASE CLEARED', { holdMs: 1400 });
    this.hint('');
  }

  onPhaseStart(e) {
    const total = this.fight.track.count;
    stampAnnounce(this.hud, `${e.index + 1} / ${total} · ${e.phase.name}`, { holdMs: 2200 });
    this.applyPhaseLook(e.index);
  }

  // A phase you can see: each movement's world shifts as it escalates.
  applyPhaseLook(index) {
    const m = this.phase;
    if (m === 0) {
      const glow = index >= 1 ? 0.12 : 0;
      this.seamGlows.x.userData.base = glow; this.seamGlows.z.userData.base = glow;
      this.scene.fog.density = [0.012, 0.014, 0.016][index] ?? 0.012;
    } else if (m === 1) {
      bellAudio.setRain?.([0.5, 0.75, 1][index] ?? 0.5);
      this.rim.intensity = [36, 46, 60][index] ?? 36;
    } else if (m === 2) {
      this.scene.fog.color.setHex([0x241517, 0x2a1630, 0x301410][index] ?? 0x241517);
      this.scene.background.copy(this.scene.fog.color);
    } else if (m === 3) {
      this.scene.fog.color.setHex([0xe5dfce, 0xd8d2c6, 0xcfc3b4][index] ?? 0xe5dfce);
      this.scene.background.copy(this.scene.fog.color);
    }
  }

  onMovementFinished() {
    const m = this.phase;
    this.fightVisuals.clear();
    this.clearEntityViews();
    if (m === 3) { this.startRescueSequence(); return; }
    if (m === 1) { this.bellMeter.ring(); bellAudio.bell(); }
    this.startWorldTransition(m + 1);
  }

  // The visual half of a hit on him (the director dealt the damage).
  bossHitFx(amount, reaction = 'pain', e = {}) {
    this.boss.inv = 0.09 * D().bossWindow;
    this.boss.stagger = 0.18;
    this.boss.reaction = reaction;
    this.boss.lastDamageCause = e.cause ?? ['returned-claim', 'borrowed-light', 'two-true-things', 'returned-pigment'][this.phase];
    this.boss.lastDamage = amount;
    this.boss.gestureTime = reaction === 'rage' ? 1.4 : 0.8;
    this.boss.flash = 0.18;
    this.playConductorAction(reaction === 'pain' ? 'Hit_Chest' : reaction === 'shame' ? 'Hit_Head' : 'Interact', true);
    this.hitStop = Math.max(this.hitStop, e.volley || e.onTheBell || e.pair ? 0.09 : 0.055);
    this.trauma = Math.min(1, this.trauma + (e.volley || e.onTheBell || e.pair ? 0.4 : 0.3));
    this.spawnImpact(this.boss.x, 8.2, this.boss.z + 1, reaction === 'shame' ? 0xffd7d7 : AMBER);
    this.tone(72, 0.12, 'sawtooth', 0.05);
    this.syncBossHp();
    if (this.phase === 3) { this.boss.paintCoverage = THREE.MathUtils.clamp((100 - this.boss.hp) / PAINT_MOVEMENT_DRAIN, 0, 1); this.updatePaintCreep(); }
  }

  // QA and the debug hooks: damage dealt through the director.
  hitBoss(amount = 25) {
    if (this.mode !== 'play' || !this.fight || this.transition) return;
    this.fight.damage(amount);
    this.onFightEvents(this.fight.update(0, this.player, {}));
  }

  // ------------------------------------------------------------ views
  // Meshes for a movement's things (cases, trains, props, true things,
  // paint), keyed by the director's id, made on first sight and dropped
  // when the director lets go of them.
  clearEntityViews({ keepFlights = false } = {}) {
    for (const view of this.entityViews?.values() ?? []) this.scene.remove(view.root);
    this.entityViews = new Map();
    if (!keepFlights) { this.projectiles.forEach((p) => this.scene.remove(p.root)); this.projectiles = []; }
    if (this.paintTransfer) { this.paintTransfer.visible = false; this.paintTransfer.children.forEach((item) => { item.visible = false; }); }
  }

  removeEntityView(id) {
    const view = this.entityViews?.get(id);
    if (!view || view.keep) return;
    this.scene.remove(view.root);
    this.entityViews.delete(id);
  }

  addView(id, root, extra = {}) {
    this.scene.add(root);
    const view = { root, ...extra };
    this.entityViews.set(id, view);
    return view;
  }

  // ---- Movement I
  ensureCaseView(attack) {
    if (!this.caseArt || this.entityViews.has(attack.meta.caseId)) return;
    const claim = attack.meta.claim;
    const art = claim ? this.caseArt[(attack.meta.serial ?? 0) % this.caseArt.length] : this.unclaimedArt ?? this.caseArt[0];
    const root = new THREE.Group();
    root.position.set(attack.x, 0, attack.z);
    const card = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 2.5 * (58 / 84)), paintedMaterial(art.present));
    card.position.y = 12;
    root.add(card);
    this.addView(attack.meta.caseId, root, { kind: 'case', card, art, attack, claim, revealed: false, keep: true });
  }

  ensureTrainView(attack) {
    if (!this.trainArt || this.entityViews.has(attack.id)) return;
    const front = attack.seam === 'x';
    const ghost = attack.ghost;
    const map = front ? (ghost ? this.trainArt.frontPast : this.trainArt.front) : (ghost ? this.trainArt.sidePast : this.trainArt.side);
    const height = front ? 3.1 : 3.2;
    const width = front ? height * (60 / 64) : height * (150 / 50);
    const card = new THREE.Mesh(new THREE.PlaneGeometry(width, height), ghost ? lensClipMaterial(map, { opacity: 0.95 }) : paintedMaterial(map));
    card.renderOrder = ghost ? 6 : 2;
    card.position.y = height / 2 + 0.05;
    if (!front && attack.dir < 0) card.scale.x = -1;
    const root = new THREE.Group();
    root.add(card);
    root.visible = false;
    this.addView(attack.id, root, { kind: 'train', card, attack, front });
  }

  inkStamp(attack) {
    const p = attack;
    const w = p.x1 - p.x0; const d = p.z1 - p.z0;
    if (!this.stampArt) this.stampArt = canvasTexture(paintOverdueStamp());
    const mark = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w, d * 1.9) * 0.8, Math.min(w, d * 1.9) * 0.8 * 0.42), new THREE.MeshBasicMaterial({ map: this.stampArt, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false }));
    mark.rotation.x = -Math.PI / 2;
    mark.rotation.z = (Math.random() - 0.5) * 0.3;
    mark.position.set((p.x0 + p.x1) / 2, 0.07, (p.z0 + p.z1) / 2);
    this.scene.add(mark);
    this.effects.push({ root: mark, life: 2.4, type: 'decal' });
    this.spawnImpact(mark.position.x, 0.6, mark.position.z, OXBLOOD);
  }

  flyCaseBack(e) {
    const view = this.entityViews.get(e.caseId);
    if (!view) return;
    this.entityViews.delete(e.caseId);
    const start = view.root.position.clone().add(new THREE.Vector3(0, 0.9, 0));
    this.scene.remove(view.root);
    const flying = new THREE.Group();
    view.card.position.set(0, 0, 0);
    view.card.material.map = view.art.past;
    view.card.material.needsUpdate = true;
    flying.add(view.card);
    flying.position.copy(start);
    this.scene.add(flying);
    this.spawnImpact(e.x, 1, e.z, e.volley ? 0xffe2a0 : AMBER);
    this.projectiles.push({ root: flying, type: 'claim', life: e.flight + 0.4, age: 0, duration: e.flight, start, target: new THREE.Vector3(this.boss.x, 6.4, this.boss.z + 0.8) });
  }

  syncLost(dt) {
    const director = this.fight;
    const lens = director.lens;
    const view = this.lensView;
    const k = 1 - Math.exp(-dt * (lens.aimed ? 20 : 9));
    view.x += (lens.x - view.x) * k;
    view.z += (lens.z - view.z) * k;
    view.radius += (lens.radius - view.radius) * Math.min(1, dt * 3);
    lensUniforms.uLens.value.set(view.x, view.z);
    lensUniforms.uRadius.value = view.radius;
    this.lensRim.position.set(view.x, 0.05, view.z);
    if (this.lensRimBase) this.lensRim.scale.set(this.lensRimBase * (view.radius / LENS_RADIUS), this.lensRimBase * (view.radius / LENS_RADIUS), 1);
    if (!reducedMotionActive()) this.lensRim.rotation.z += dt * 0.15;
    const reveal = (x, z) => Math.hypot(x - lens.x, z - lens.z) <= lens.radius;
    // Cases fall where their ring closes; under the lens their claim reads.
    for (const c of director.cases) {
      const v = this.entityViews.get(c.id);
      if (!v) continue;
      if (c.returned) continue;
      if (c.filed) { v.card.material.opacity = Math.max(0, v.card.material.opacity - dt * 2.5); if (v.card.material.opacity <= 0.01) { this.scene.remove(v.root); this.entityViews.delete(c.id); } continue; }
      if (!c.landed) {
        const t = Math.min(1, c.attack.age / Math.max(0.01, c.attack.tele));
        v.card.position.y = 0.86 + (1 - t * t) * 11.2;
        v.card.rotation.z = reducedMotionActive() ? 0 : Math.sin(this.elapsed * 12) * 0.16 * (1 - t);
      } else {
        v.card.position.y = 0.86;
        v.card.rotation.z = 0;
        if (c.lieLeft < 0.9) v.card.material.opacity = Math.max(0.15, c.lieLeft / 0.9);
      }
      const revealed = c.landed && reveal(c.x, c.z);
      if (revealed !== v.revealed) {
        v.revealed = revealed;
        v.card.material.map = revealed ? v.art.past : v.art.present;
        v.card.material.needsUpdate = true;
        if (revealed && c.claim) bellAudio.paper?.();
      }
      v.card.lookAt(this.camera.position.x, v.card.getWorldPosition(new THREE.Vector3()).y, this.camera.position.z);
    }
    // Trains along the seams (ghost trains draw only inside the lens).
    for (const a of director.attacks) {
      if (a.kind !== 'train') continue;
      const v = this.entityViews.get(a.id);
      if (!v) continue;
      v.root.visible = a.state === 'live';
      const centre = a.pos - a.dir * (a.length / 2);
      if (a.seam === 'z') v.root.position.set(centre, 0, PANEL_SEAMS.z);
      else v.root.position.set(PANEL_SEAMS.x, 0, v.front ? a.pos - a.dir * 1.2 : centre);
      if (v.front) v.card.lookAt(this.camera.position.x, v.card.getWorldPosition(new THREE.Vector3()).y, this.camera.position.z);
    }
    // The live seams (phase 2 on) glow faintly between trains.
    ['x', 'z'].forEach((axis) => {
      const glow = this.seamGlows[axis];
      const base = glow.userData.base ?? 0;
      glow.material.opacity += (base - glow.material.opacity) * Math.min(1, dt * 4);
    });
  }

  // ---- Movement II
  onBellEvent(event) {
    if (event.type === 'bell') { bellAudio.bell(); this.bellMeter.ring(); this.trauma = Math.max(this.trauma, 0.08); }
    else if (event.type === 'power') bellAudio.machineOn(event.machineId.startsWith('bridge') ? 'bridge' : event.machineId.startsWith('board') ? 'billboard' : 'sign');
    else if (event.type === 'off') bellAudio.machineOff(event.machineId.startsWith('bridge') ? 'bridge' : 'billboard');
    else if (event.type === 'flicker') bellAudio.flickerTick();
    else if (event.type === 'conductor-step') this.boss.targetX = LANE_X[event.to];
    else if (event.type === 'exposed') { this.boss.reaction = 'pain'; this.boss.gestureTime = 0.8; this.toast(`HE IS LIT · ${event.lane.toUpperCase()} LANE · CROSS AND PUNCH`, 2); }
    else if (event.type === 'beam-telegraph') { if (event.fullSweep) this.toast('FULL SWEEP ON THE OFF-BEAT · BEHIND A LIT BILLBOARD, OR IN HIS LIT LANE', 2.6); }
    else if (event.type === 'beam-fire') {
      this.bell.beamLanes = event.lanes;
      this.bell.beamFlash = 0.38;
      if (event.lanes.length) { this.tone(1100, 0.22, 'sawtooth', 0.03); this.trauma = Math.max(this.trauma, 0.18); }
      if (this.fight?.arena?.shelteredBy(this.player.x, this.player.z) && event.lanes.length) this.toastOnce('held', 'THE BILLBOARD HOLDS', 1.2, 2);
    }
    this.syncNodeArt();
  }

  syncNodeArt(force = false) {
    if (!this.nodeArt) return;
    const arena = this.fight?.arena;
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

  syncBell(dt) {
    const director = this.fight;
    const arena = director.arena;
    const p = this.player;
    const planks = new Set(arena.returnPlanks());
    Object.entries(this.bridgeMeshes).forEach(([id, mesh]) => {
      const level = arena.bridgeLevel(id);
      const status = arena.timetable.machineStatus(id);
      mesh.pivot.scale.z = Math.max(0.001, level);
      mesh.pivot.visible = level > 0.01;
      const flick = status.flicker && !planks.has(id) && !reducedMotionActive() && Math.sin(this.elapsed * 18) > 0;
      mesh.deck.material.color.setHex(flick ? 0x806040 : planks.has(id) ? 0xd8c8a8 : status.flicker ? 0xb89060 : 0xffffff);
    });
    Object.entries(this.cableMeshes).forEach(([nodeId, cable]) => {
      const node = arena.timetable.nodeStatus(nodeId);
      const machine = arena.timetable.machineStatus(cable.machine);
      const out = cable.machine.startsWith('bridge') ? arena.bridgeLevel(cable.machine) > 0.5 : machine?.level > 0.5;
      const target = out ? 0.95 : node?.queued ? 0.6 + (reducedMotionActive() ? 0.15 : Math.abs(Math.sin(this.elapsed * 5)) * 0.25) : 0.32;
      cable.strip.material.opacity += (target - cable.strip.material.opacity) * Math.min(1, dt * 10);
      cable.endMaterial.opacity = Math.min(1, cable.strip.material.opacity + 0.2);
    });
    Object.entries(this.boardMeshes).forEach(([id, mesh]) => {
      const status = arena.timetable.machineStatus(id);
      mesh.panel.position.y = -1.6 + status.level * 1.6;
      const lit = status.level > 0.6 && !(status.flicker && !reducedMotionActive() && Math.sin(this.elapsed * 18) > 0);
      const map = lit ? this.billboardArt?.lit : this.billboardArt?.dark;
      if (map && mesh.face.material.map !== map) { mesh.face.material.map = map; mesh.face.material.needsUpdate = true; }
      const board = BELL_ARENA.boards[id];
      const behind = p.z < board.z + 0.2 && p.z > board.z - 5.5 && Math.abs(p.x - LANE_X[board.lane]) < 3.4;
      mesh.fade += ((behind ? 0.28 : 1) - mesh.fade) * Math.min(1, dt * 9);
      [mesh.face, mesh.frame].forEach((part) => { part.material.opacity = mesh.fade; part.material.depthWrite = mesh.fade > 0.97; });
    });
    Object.entries(BELL_ARENA.lamps).forEach(([id, lane]) => {
      const status = arena.timetable.machineStatus(id);
      const target = status.powered ? (status.flicker ? 0.18 : 0.34) : 0;
      const shaft = this.laneShafts[lane];
      shaft.material.opacity += (target - shaft.material.opacity) * Math.min(1, dt * 10);
    });
    // His beams: the warned lanes (the proxies the director keeps), then the
    // fire on the off-beat.
    this.bell.telegraphLanes = director.attacks.filter((a) => a.source === 'beam' && a.state === 'tele' && !a.harmless).map((a) => a.meta.lane);
    this.bell.beamFlash = Math.max(0, this.bell.beamFlash - dt);
    Object.entries(this.laneBeams).forEach(([lane, beam]) => {
      const firing = this.bell.beamFlash > 0 && this.bell.beamLanes.includes(lane);
      const proxy = director.attacks.find((a) => a.source === 'beam' && a.meta.lane === lane && a.state === 'tele');
      const warning = Boolean(proxy) && !proxy.harmless;
      const progress = proxy ? Math.min(1, proxy.age / Math.max(0.01, proxy.tele)) : 0;
      beam.material.color.setHex(firing ? 0xfff1e6 : ROSE);
      beam.material.opacity = firing ? 0.75 * (this.bell.beamFlash / 0.38) : warning ? 0.05 + progress * 0.22 * (reducedMotionActive() ? 1 : 0.8 + 0.2 * Math.sin(this.elapsed * 10)) : 0;
    });
    const lit = director.exposureLit();
    this.boss.exposed = lit && !lit.punched ? 1 : 0;
    this.conductorLight.intensity += ((lit ? 260 : 0) - this.conductorLight.intensity) * Math.min(1, dt * 8);
    this.conductorLight.position.x = this.boss.x;
    this.conductorLight.target.position.x = this.boss.x;
    // His next stop (only once he has called it, in the last phase).
    const lane = director.announced();
    this.nextLaneMarker.visible = Boolean(lane);
    if (lane) this.nextLaneMarker.position.x += (LANE_X[lane] - this.nextLaneMarker.position.x) * Math.min(1, dt * 6);
    this.nextLaneMarker.material.opacity = 0.45 + (reducedMotionActive() ? 0.1 : Math.abs(Math.sin(this.elapsed * 3)) * 0.25);
    // Listen (hold Q / LB): ghost outlines of what the next bell moves.
    this.bell.listening = this.keys.has('KeyQ') || Boolean(this.pad?.buttons.listen);
    const preview = this.bell.listening ? arena.preview() : null;
    const turningOn = new Set(preview?.machines.filter((change) => change.to === 'on').map((change) => change.machineId) ?? []);
    Object.entries(this.bridgeMeshes).forEach(([id, mesh]) => { mesh.ghost.material.opacity = turningOn.has(id) ? 0.28 : 0; });
    Object.entries(this.boardMeshes).forEach(([id, mesh]) => { mesh.ghost.material.opacity = turningOn.has(id) ? 0.3 : 0; });
    if (preview) Object.entries(BELL_ARENA.lamps).forEach(([id, l]) => { if (turningOn.has(id)) this.laneShafts[l].material.opacity = Math.max(this.laneShafts[l].material.opacity, 0.14); });
  }

  // ---- Movement III
  ensurePropView(attack) {
    if (this.entityViews.has(attack.id)) return;
    const id = { 'crushed-trash-can': 'trash', 'fountain-bench': 'bench', 'pa-speaker': 'speaker' }[attack.meta.prop] ?? 'trash';
    const model = this.cloneAsset(id, 2.2, 3.2);
    const root = new THREE.Group();
    root.position.set(attack.x, 0, attack.z);
    if (model) {
      model.position.y = 10;
      if (attack.meta.echo) model.traverse((child) => { if (child.isMesh && child.material) { child.material = child.material.clone(); child.material.transparent = true; child.material.opacity = 0.42; child.material.depthWrite = false; } });
      root.add(model);
    }
    this.addView(attack.id, root, { kind: 'prop', model, attack, keep: true });
  }

  ensureTruthView(t) {
    if (this.entityViews.has(t.id)) return this.entityViews.get(t.id);
    if (!this.truthArt) this.truthArt = canvasTexture(paintTrueThingCard());
    const root = new THREE.Group();
    const card = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.05), new THREE.MeshBasicMaterial({ map: this.truthArt, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
    card.position.y = 9;
    card.renderOrder = 7;
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.18, 48), new THREE.MeshBasicMaterial({ color: CHANCE_HEX, transparent: true, opacity: 0.7, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.07;
    root.add(card, ring);
    return this.addView(t.id, root, { kind: 'truth', card, ring, truth: t });
  }

  onPair(e) {
    // Both true things fly to him together.
    for (const factId of e.truths) {
      const id = `${e.exchangeId}:${factId}`;
      const view = this.entityViews.get(id);
      if (!view) continue;
      this.entityViews.delete(id);
      const start = view.card.getWorldPosition(new THREE.Vector3());
      this.scene.remove(view.root);
      const flying = new THREE.Group();
      view.card.position.set(0, 0, 0);
      flying.add(view.card);
      flying.position.copy(start);
      this.scene.add(flying);
      this.projectiles.push({ root: flying, type: 'truth', life: 1.1, age: 0, duration: 0.7, start, target: new THREE.Vector3(this.boss.x, 5.6, this.boss.z + 1) });
    }
    this.spawnImpact(this.player.x, 1.6, this.player.z, CHANCE_HEX);
    this.tone(880, 0.3, 'triangle', 0.035);
  }

  showRecordLine(e) {
    if (!e.rebut) return;
    this.recordLineUntil = this.elapsed + 3.2;
    if (this.voiceState.playing) { this.toast(`FROM THE RECORD · ${e.rebut}`, 3); return; }
    this.showCaption({ speaker: 'CONDUCTOR · FROM THE RECORD', text: e.rebut }, { meta: e.record ?? '' });
    clearTimeout(this.recordTimer);
    this.recordTimer = setTimeout(() => { if (!this.voiceState.playing) this.closeCaption(); }, 3200);
  }

  syncEcho(dt) {
    const director = this.fight;
    // Thrown props fall where their ring closes, then sink.
    for (const a of director.attacks) {
      if (!a.meta?.prop) continue;
      const v = this.entityViews.get(a.id);
      if (!v?.model) continue;
      const t = Math.min(1, a.age / Math.max(0.01, a.tele));
      v.model.position.y = a.state === 'tele' ? (1 - t * t) * 10 : 0;
      if (!reducedMotionActive()) v.model.rotation.z += dt * (a.state === 'tele' ? 4 : 0);
    }
    // A landed prop lies a moment where it fell, then sinks into its crack.
    for (const [id, view] of this.entityViews) {
      if (view.kind !== 'prop' || director.attacks.some((a) => a.id === id)) continue;
      view.gone = (view.gone ?? 0) + dt;
      if (view.model) view.model.position.y = -view.gone * 1.4;
      if (view.gone > 0.9) { this.scene.remove(view.root); this.entityViews.delete(id); }
    }
    // The terrace: cracks where his misreadings landed…
    director.holes.forEach((hole, i) => {
      const visual = this.holeVisuals[i];
      if (!visual) return;
      visual.visible = true;
      visual.position.set(hole.x, 0.035, hole.z);
      visual.scale.setScalar(hole.r);
      visual.rotation.y = i * 0.73;
    });
    for (let i = director.holes.length; i < this.holeVisuals.length; i += 1) this.holeVisuals[i].visible = false;
    // …and in the last phase the back rows falling away.
    const cz = director.collapseZ;
    if (cz < ARENA.maxZ + 0.5) {
      if (!this.collapseView) this.collapseView = this.buildCollapseView();
      const view = this.collapseView;
      view.visible = true;
      const depth = Math.max(0.01, ARENA.maxZ + 2 - cz);
      view.userData.pit.scale.set(1, depth, 1);
      view.userData.pit.position.z = cz + depth / 2;
      view.userData.edge.position.z = cz - 0.7;
      view.userData.edge.material.opacity = 0.32 + (reducedMotionActive() ? 0.1 : Math.abs(Math.sin(this.elapsed * 4)) * 0.18);
    } else if (this.collapseView) this.collapseView.visible = false;
    // The true things: down from the lamps, hovering, held, gone.
    const liveIds = new Set();
    for (const t of director.truths) {
      if (t.state === 'thrown' || t.state === 'faded') continue;
      liveIds.add(t.id);
      const v = this.ensureTruthView(t);
      v.root.position.set(t.x, 0, t.z);
      const bob = reducedMotionActive() ? 0 : Math.sin(this.elapsed * 2.4 + t.x) * 0.12;
      if (t.state === 'descending') v.card.position.y = 1.8 + (1 - Math.min(1, t.age / 0.9)) * 7;
      else if (t.state === 'held') {
        v.root.position.set(this.player.x + Math.cos(this.elapsed * 3) * 0.9, 0, this.player.z + Math.sin(this.elapsed * 3) * 0.9);
        v.card.position.y = 2.5;
      } else v.card.position.y = 1.8 + bob;
      v.ring.visible = t.state === 'ready';
      v.card.lookAt(this.camera.position.x, v.card.getWorldPosition(new THREE.Vector3()).y, this.camera.position.z);
      const fade = t.state === 'ready' && t.life - t.age < 1.5 ? Math.max(0.25, (t.life - t.age) / 1.5) : 1;
      v.card.material.opacity = fade;
    }
    for (const [id, view] of this.entityViews) {
      if (view.kind === 'truth' && !liveIds.has(id)) { this.scene.remove(view.root); this.entityViews.delete(id); }
    }
    this.showFrontEdge(director.frontLit);
    if (director.frontLit && this.frontEdge) {
      const pulse = reducedMotionActive() ? 0.5 : 0.5 + 0.5 * Math.sin(this.elapsed * 5.2);
      this.frontEdge.children[0].material.opacity = (this.player.z <= ECHO_FRONT_EDGE_Z ? 0.26 : 0.16) + pulse * 0.12;
    }
    this.boss.exposed = director.frontLit ? 1 : 0;
  }

  buildCollapseView() {
    const group = new THREE.Group();
    const pit = new THREE.Mesh(new THREE.PlaneGeometry(ARENA.maxX - ARENA.minX + 6, 1), new THREE.MeshBasicMaterial({ color: 0x120c0b, toneMapped: false }));
    pit.rotation.x = -Math.PI / 2;
    pit.position.y = 0.045;
    const edge = new THREE.Mesh(new THREE.PlaneGeometry(ARENA.maxX - ARENA.minX + 6, 1.4), new THREE.MeshBasicMaterial({ color: 0xe8663f, transparent: true, opacity: 0.35, depthWrite: false, toneMapped: false }));
    edge.rotation.x = -Math.PI / 2;
    edge.position.y = 0.05;
    group.add(pit, edge);
    group.userData = { pit, edge };
    this.scene.add(group);
    return group;
  }

  // ---- Movement IV
  ensurePaintDropView(attack) {
    if (this.entityViews.has(attack.id)) return;
    const root = new THREE.Group();
    root.position.set(attack.x, 0, attack.z);
    let card;
    if (attack.meta.cover) {
      card = makePaperCard(this.textureLoader, ch4IndigoUrl, 2.05, 2.05, { alpha: true });
      card.rotation.y = attack.meta.yaw;
      const edgeParams = { color: 0x46618c, emissive: 0x1b315c, emissiveIntensity: 0.35 };
      const edge = flatBox(2.08, 2.08, 0.1, this.quality.tier === 'low' ? new THREE.MeshLambertMaterial(edgeParams) : new THREE.MeshStandardMaterial({ ...edgeParams, roughness: 0.92 }));
      edge.rotation.y = attack.meta.yaw;
      root.add(edge);
      root.userData.edge = edge;
    } else card = makePaperCard(this.textureLoader, PIGMENT_URL[attack.meta.colour] ?? ch4SootUrl, 2.6, 1.6, { alpha: true });
    card.position.y = 9;
    root.add(card);
    this.addView(attack.id, root, { kind: attack.meta.cover ? 'cover' : 'pigment', card, attack, keep: Boolean(attack.meta.cover), coverId: null });
  }

  ensurePuddleView(p) {
    if (this.entityViews.has(p.id)) return this.entityViews.get(p.id);
    const splat = new THREE.Mesh(new THREE.CircleGeometry(1.05, 20), new THREE.MeshBasicMaterial({ color: PIGMENT_HEX[p.colour] ?? 0x435d91, transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false }));
    splat.rotation.x = -Math.PI / 2;
    splat.rotation.z = Math.random() * Math.PI;
    splat.scale.set(1, 0.78, 1);
    splat.position.y = 0.035;
    const root = new THREE.Group();
    root.position.set(p.x, 0, p.z);
    root.add(splat);
    return this.addView(p.id, root, { kind: 'puddle', splat, puddle: p });
  }

  launchStroke(e) {
    const start = new THREE.Vector3(e.x, 1.2 + this.player.y, e.z);
    const root = new THREE.Mesh(new THREE.OctahedronGeometry(0.28 + e.charge * 0.1), new THREE.MeshBasicMaterial({ color: 0xff806f, toneMapped: false }));
    root.position.copy(start);
    this.scene.add(root);
    this.projectiles.push({ root, type: 'stroke', life: e.flight + 0.3, age: 0, duration: e.flight, start, target: new THREE.Vector3(this.boss.x, 6.8, this.boss.z + 0.8) });
    this.tone(480 + e.charge * 90, 0.16, 'triangle', 0.04);
  }

  syncPaint(dt) {
    const director = this.fight;
    for (const a of director.attacks) {
      const v = this.entityViews.get(a.id);
      if (!v || (v.kind !== 'pigment' && v.kind !== 'cover')) continue;
      const t = Math.min(1, a.age / Math.max(0.01, a.tele));
      const landing = v.kind === 'cover' ? 1.12 : 0.45;
      v.card.position.y = a.state === 'tele' ? landing + (1 - t * t) * (9 - landing) : landing;
      if (v.kind === 'cover' && v.root.userData.edge) v.root.userData.edge.position.y = v.card.position.y;
      if (v.kind === 'pigment' && !reducedMotionActive()) v.card.rotation.z += dt * (a.state === 'tele' ? 5 : 0);
      if (v.kind === 'pigment' && a.state === 'live') { this.scene.remove(v.root); this.entityViews.delete(a.id); }
    }
    // Walls: a landed indigo tile stands until its time is up.
    const walls = new Set(director.covers.filter((c) => c.up && c.left > 0).map((c) => c.attack.id));
    for (const [id, view] of this.entityViews) {
      if (view.kind !== 'cover') continue;
      const attackLive = director.attacks.some((a) => a.id === id);
      if (!attackLive && !walls.has(id)) { this.scene.remove(view.root); this.entityViews.delete(id); }
    }
    // Wet colour, drying.
    const wet = new Set();
    for (const p of director.puddles) {
      if (p.taken || p.wetLeft <= -0.6) continue;
      wet.add(p.id);
      const v = this.ensurePuddleView(p);
      const k = THREE.MathUtils.clamp((p.wetLeft + 0.6) / 1.2, 0, 1);
      v.splat.material.opacity = 0.2 + 0.65 * k;
      v.splat.material.color.setHex(p.wetLeft > 0 ? (PIGMENT_HEX[p.colour] ?? 0x435d91) : 0x9a948a);
    }
    for (const [id, view] of this.entityViews) {
      if (view.kind === 'puddle' && !wet.has(id)) { this.scene.remove(view.root); this.entityViews.delete(id); }
    }
    // The strands of a hold (absorbing from wet colour, or a return winding up).
    const hold = director.hold;
    const target = hold.kind === 'absorb' && hold.target ? director.puddles.find((p) => p.id === hold.target) : null;
    if ((hold.kind === 'absorb' && target) || (hold.kind === 'return' && this.player.color > 0)) this.drawPaintStrands(hold.progress, target);
    else if (this.paintTransfer.visible) { this.paintTransfer.visible = false; this.paintTransfer.children.forEach((item) => { item.visible = false; }); }
    this.boss.exposed = director.open ? 1 : 0;
    this.conductorLight.intensity += ((director.open ? 180 : 0) - this.conductorLight.intensity) * Math.min(1, dt * 8);
  }

  drawPaintStrands(progress, puddle) {
    const absorbing = Boolean(puddle);
    const from = absorbing ? new THREE.Vector3(puddle.x, 0.65, puddle.z) : new THREE.Vector3(this.player.x, 1.15 + this.player.y, this.player.z);
    const to = absorbing ? new THREE.Vector3(this.player.x, 1.1 + this.player.y, this.player.z) : new THREE.Vector3(this.boss.x, 6.7, this.boss.z + 0.7);
    this.paintTransfer.visible = true;
    const strands = this.paintTransfer.children.filter((item) => !item.userData.paintDroplet);
    const droplets = this.paintTransfer.children.filter((item) => item.userData.paintDroplet);
    const still = reducedMotionActive();
    strands.forEach((strand, index) => {
      const stagger = THREE.MathUtils.clamp(progress * 1.35 - index * 0.055, 0.025, 1);
      const end = from.clone().lerp(to, stagger);
      const middle = from.clone().lerp(end, 0.52);
      middle.x += (still ? 0 : Math.sin(this.elapsed * 13 + index * 1.8) * (0.08 + progress * 0.14)) + (index - 2) * 0.065;
      middle.y += 0.18 + Math.sin(progress * Math.PI) * 0.42;
      strand.geometry.setFromPoints([from, middle, end]);
      strand.material.opacity = 0.42 + progress * 0.5;
      strand.visible = true;
    });
    droplets.forEach((droplet, index) => {
      const travel = still ? index / droplets.length : (this.elapsed * 1.65 + index / droplets.length) % 1;
      const flow = absorbing ? travel : 1 - travel;
      droplet.position.lerpVectors(from, to, flow);
      droplet.position.y += Math.sin(flow * Math.PI) * (0.35 + progress * 0.55);
      droplet.scale.setScalar(0.72 + progress * 0.6);
      droplet.material.opacity = 0.5 + progress * 0.45;
      droplet.lookAt(this.camera.position);
      droplet.visible = true;
    });
  }

  // The visuals for this frame of the fight.
  syncFightVisuals(dt) {
    if (!this.fight) return;
    this.fightVisuals.update(this.elapsed);
    if (this.phase === 0) this.syncLost(dt);
    else if (this.phase === 1) this.syncBell(dt);
    else if (this.phase === 2) this.syncEcho(dt);
    else if (this.phase === 3) this.syncPaint(dt);
  }

  // ------------------------------------------------------------ voices
  // Movement III speaks while it fights: lines queue, never pause the square.
  queueVoice(cue, { meta = '', kind = 'line' } = {}) {
    if (!cue) return;
    this.voiceQueue ||= [];
    // A new claim replaces anything still waiting (the argument moved on).
    if (kind === 'claim') this.voiceQueue.length = 0;
    this.voiceQueue.push({ cue, meta });
    if (!this.voiceState.playing && !this.voiceBusy) this.nextVoice();
  }

  nextVoice() {
    const item = this.voiceQueue?.shift();
    if (!item) { this.voiceBusy = false; if (!this.recordLineUntil || this.elapsed > this.recordLineUntil) this.closeCaption(); return; }
    this.voiceBusy = true;
    this.showCaption(item.cue, { meta: item.meta });
    this.playVoice(item.cue, () => { this.voiceBusy = false; this.nextVoice(); });
  }

  showFrontEdge(visible) {
    if (visible && !this.frontEdge) {
      const depth = ECHO_FRONT_EDGE_Z - ARENA.minZ;
      const width = ARENA.maxX - ARENA.minX;
      const group = new THREE.Group();
      const zone = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), new THREE.MeshBasicMaterial({ color: AMBER, transparent: true, opacity: 0.16, depthWrite: false, toneMapped: false }));
      zone.rotation.x = -Math.PI / 2;
      zone.position.set(0, 0.05, ARENA.minZ + depth / 2);
      const line = new THREE.Mesh(new THREE.PlaneGeometry(width, 0.16), new THREE.MeshBasicMaterial({ color: 0xffd08a, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false }));
      line.rotation.x = -Math.PI / 2;
      line.position.set(0, 0.06, ECHO_FRONT_EDGE_Z);
      group.add(zone, line);
      group.renderOrder = 3;
      this.frontEdge = group;
      this.scene.add(group);
    }
    if (this.frontEdge) this.frontEdge.visible = visible;
  }

  showCaption(cue, { meta = '' } = {}) {
    if (!cue) return;
    this.caption.hidden = false;
    this.caption.classList.remove('is-answer', 'is-facts', 'is-framing', 'has-choices');
    this.caption.querySelector('.nf-caption__speaker').textContent = cue.speaker;
    this.caption.querySelector('.nf-caption__text').textContent = cue.text;
    this.caption.querySelector('.nf-caption__meta').textContent = meta;
    const box = this.caption.querySelector('.nf-caption__choices');
    box.innerHTML = '';
    box.hidden = true;
  }

  closeCaption() {
    if (!this.caption) return;
    this.caption.hidden = true;
    this.voiceAudio?.pause();
    clearTimeout(this.voiceTimer);
    this.voiceSkip = null;
    this.voiceState.playing = false;
    music.setDialogueActive(false);
  }

  stopVoices() {
    if (this.voiceQueue) this.voiceQueue.length = 0;
    this.voiceBusy = false;
    this.closeCaption();
  }

  // ------------------------------------------------------------ combat core

  spawnImpact(x, y, z, color) {
    const count = this.quality.tier === 'low' ? 7 : 14;
    for (let i = 0; i < count; i += 1) {
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
    this.setControlsStage('departure');
    this.clearHazards();
    this.boss.hp = Math.max(1, this.boss.hp);
    this.boss.reaction = 'pain'; this.boss.gestureTime = 2;
    this.boss.attackClock = 999;
    this.player.inv = 99;
    this.departureTrain.visible = true;
    this.departureTrain.position.set(-24, 0, 1.2);
    // The fight is over: its side panels go; the ticket bar stays to say
    // OUTLASTED until Butch boards (alpha round 4).
    this.hud.classList.add('is-departing');
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
    // The departure is a film moment: no fight HUD over it.
    this.hud.classList.add('is-cinematic');
    stampAnnounce(this.hud, 'DEPARTING', { holdMs: 1800 });
    this.playMusic(BOSS_SCORE.departure);
  }

  updateRescue(dt) {
    // Steam from the chimney, drifting back along the train.
    this.departureSmoke?.forEach((puff, index) => {
      const t = ((this.elapsed * 0.55 + index / 3) % 1);
      puff.position.set(puff.userData.base.x - t * 3.2, puff.userData.base.y + t * 1.6, puff.userData.base.z);
      puff.scale.setScalar(0.7 + t * 0.9);
      puff.material.opacity = 0.85 * (1 - t);
    });
    if (this.mode === 'departure') {
      this.departureTimer += dt;
      const speed = this.departureTrain.position.x < -3.2 ? 13.5 : 2.05;
      this.departureTrain.position.x = Math.min(-0.7, this.departureTrain.position.x + speed * dt);
      this.departureBoardable = this.departureTrain.position.x >= -3.2;
      if (this.departureBoardable) {
        const closeEnough = Math.abs(this.player.x - (this.departureTrain.position.x + 1.1)) < 4.8 && Math.abs(this.player.z - this.departureTrain.position.z) < 3.5;
        this.hint(closeEnough ? '<kbd>SPACE</kbd> / <kbd>E</kbd> · JUMP ABOARD THE NIGHT SERVICE' : 'WALK TO THE TRAIN');
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
      this.cameraTarget.lerp(this.departureTrain.position.clone().add(new THREE.Vector3(3, 1.8, 0)), 1 - Math.exp(-dt * 4));
    }
    if (t > 5.2) this.finish();
  }

  // ------------------------------------------------------------ transitions

  startWorldTransition(nextPhase) {
    if (this.transition) return;
    clearTimeout(this.titleTimer);
    this.hud.querySelectorAll('.nf-title-card').forEach((card) => card.remove());
    this.clearHazards();
    this.stopVoices();
    this.dialoguePause = false;
    this.hint('');
    if (this.phase === 1 && nextPhase === 2) { this.startVerifiedTransition(nextPhase); return; }
    this.transition = { kind: 'world-fall', nextPhase, time: 0, duration: 3.25, switched: false };
    this.player.inv = 4;
    this.setPortalWorld(nextPhase);
    this.portal.visible = true;
    this.portal.position.set(0, 0, -0.2);
    this.portal.scale.setScalar(0.05);
    this.hitStop = 0.11;
    this.trauma = 0.75;
    this.tone(42, 0.8, 'sawtooth', 0.05);
  }

  // Fill the lens with the world it opens onto: its painted backdrop (the
  // rain skyline for II, the orchard for IV), centred in the circle, or its
  // sky colour while that art is still being painted.
  setPortalWorld(nextPhase) {
    const fill = this.portal.userData.fill;
    const source = [null, this.rainSkyline, this.echoDressing?.backdrop, this.paintedDressing?.backdrop][nextPhase]?.material?.map ?? null;
    const sky = [0x1c130d, 0x0b1418, 0x3a2420, 0xe5dfce][nextPhase] ?? 0x1c130d;
    if (this.portalMap?.source !== source) {
      this.portalMap?.map.dispose();
      this.portalMap = null;
      if (source?.image) {
        // A clone shares the painting and its CPU mip chain: only the
        // window onto it differs.
        const map = source.clone();
        map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
        const aspect = (source.image.width || 1) / (source.image.height || 1);
        map.repeat.set(Math.min(1, 1 / aspect) * 1.2, 1);
        map.offset.set((1 - map.repeat.x) / 2, 0);
        map.needsUpdate = true;
        this.portalMap = { source, map };
      }
    }
    fill.material.map = this.portalMap?.map ?? null;
    fill.material.color.setHex(this.portalMap ? 0xffffff : sky);
    fill.material.needsUpdate = true;
  }

  // Borrowed Light → Echo City: the Conductor checks the ticket. Ten seconds,
  // in the fiction: the paper ticket is read, punched and stamped.
  startVerifiedTransition(nextPhase) {
    this.transition = { kind: 'verified', nextPhase, time: 0, duration: 10 };
    this.player.inv = 99;
    this.boss.attackClock = 999;
    this.bellMeter.setVisible(false);
    const scene = document.createElement('div');
    scene.className = 'nf-stamp-scene';
    scene.innerHTML = `
      <article class="nf-stamp-ticket">
        <h3>THE LAST ARCHIVE LINE · TICKET INSPECTION</h3>
        <h2>One passenger, changing carriages</h2>
        <dl>
          <dt>PASSENGER</dt><dd>BUTCH · LOST-PROPERTY CLERK</dd>
          <dt>FORM</dt><dd><s>INK CLERK</s> · <s>RAIN CLERK</s> · <b>BUTCH</b></dd>
          <dt>FROM</dt><dd>BORROWED LIGHT</dd>
          <dt>TO</dt><dd>ECHO CITY</dd>
          <dt>CLAIM</dt><dd>1978-0412 · STILL OPEN</dd>
        </dl>
        <div class="nf-stamp">IDENTITY VERIFIED</div>
      </article>
      <small>THE CONDUCTOR READS YOUR TICKET · E / ENTER TO CONTINUE ONCE STAMPED</small>`;
    this.hud.append(scene);
    this.stampScene = scene;
    this.stampKey = (event) => {
      if (!['Enter', 'NumpadEnter', 'KeyE'].includes(event.code) || !this.transition || this.transition.kind !== 'verified') return;
      if (this.transition.time >= 3.6) { event.preventDefault(); this.transition.time = this.transition.duration; }
    };
    window.addEventListener('keydown', this.stampKey);
    this.hitStop = 0.12;
    this.trauma = 0.3;
    this.tone(46, 0.42, 'square', 0.04);
  }

  finishVerifiedTransition() {
    const tr = this.transition;
    this.holdWorldVeil();
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

  // The pose for Butch at the spawn point the fall lands him on.
  landingCameraPose() {
    return this.gameplayCameraPose({ x: 0, y: 0, z: 6.2 }, 0);
  }

  updateTransition(dt) {
    if (!this.transition) return false;
    const tr = this.transition;
    // A world never opens before its art and models are ready: hold the
    // ticket inspection, or the fall just before the switch, until they are.
    const nextReady = this.movementReady(tr.nextPhase);
    if (!nextReady) this.prepareMovement(tr.nextPhase);
    if (tr.kind === 'verified') {
      tr.time += dt;
      if (!nextReady) tr.time = Math.min(tr.time, tr.duration - 0.001);
      const ticket = this.stampScene?.querySelector('.nf-stamp-ticket');
      if (tr.time > 1.6 && ticket && !ticket.classList.contains('is-punched')) { ticket.classList.add('is-punched'); bellAudio.punchClack(); }
      const stamp = this.stampScene?.querySelector('.nf-stamp');
      if (tr.time > 2.9 && stamp && !stamp.classList.contains('is-down')) { stamp.classList.add('is-down'); this.tone(70, 0.2, 'square', 0.05); this.trauma = 0.25; }
      if (tr.time >= tr.duration) this.finishVerifiedTransition();
      return true;
    }
    tr.time += dt;
    if (!nextReady && !tr.switched) tr.time = Math.min(tr.time, tr.duration * 0.54);
    const t = Math.min(1, tr.time / tr.duration);
    if (t < 0.42) {
      const open = THREE.MathUtils.smootherstep(t, 0, 0.42);
      this.portal.scale.setScalar(0.05 + open * 8.8);
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
        this.holdWorldVeil({ cameraUp: true });
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
      const pose = this.landingCameraPose();
      this.camera.position.lerp(pose.position, 1 - Math.exp(-dt * 5));
      this.cameraTarget.lerp(pose.target, 1 - Math.exp(-dt * 5));
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
    this.fightVisuals?.clear();
    this.clearEntityViews();
  }

  addPersistentHole() {}

  // Flights are pictures only: what they carry was dealt by the director.
  updateProjectiles(dt) {
    this.projectiles.forEach((projectile) => {
      projectile.life -= dt;
      projectile.age += dt;
      const progress = Math.min(1, projectile.age / projectile.duration);
      projectile.root.position.lerpVectors(projectile.start, projectile.target, progress);
      projectile.root.position.y += Math.sin(progress * Math.PI) * 3.2;
      if (!reducedMotionActive()) projectile.root.rotation.z += dt * 7;
      if (!projectile.hit && progress >= 1) {
        projectile.hit = true;
        this.spawnImpact(projectile.target.x, projectile.target.y, projectile.target.z, projectile.type === 'stroke' ? 0xff806f : projectile.type === 'truth' ? CHANCE_HEX : AMBER);
      }
    });
    const expired = this.projectiles.filter((projectile) => projectile.life <= 0 || projectile.hit);
    expired.forEach((projectile) => this.scene.remove(projectile.root));
    this.projectiles = this.projectiles.filter((projectile) => projectile.life > 0 && !projectile.hit);
  }

  // The hit, readable: an oxblood edge on the side it came from, and a torn
  // tag over Butch's layers naming what it was.
  showHitFeedback({ label }, from) {
    const hit = this.hitFlashEl;
    if (!hit) return;
    let side = 'none';
    if (from && Number.isFinite(from.x) && Number.isFinite(from.z)) {
      const a = this.screenPoint(this.player.x, 1.2 + this.player.y, this.player.z);
      const b = this.screenPoint(from.x, 1, from.z);
      if (a && b) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        side = Math.hypot(dx, dy) < 30 ? 'none' : Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'top' : 'bottom');
      }
    }
    hit.dataset.side = side;
    hit.classList.remove('show');
    void hit.offsetWidth;
    hit.classList.add('show');
    this.hitLabelEl.querySelector('span').textContent = label;
    this.hitLabelEl.classList.remove('show');
    void this.hitLabelEl.offsetWidth;
    this.hitLabelEl.classList.add('show');
    clearTimeout(this.hitLabelTimer);
    this.hitLabelTimer = setTimeout(() => this.hitLabelEl.classList.remove('show'), 2400);
  }

  // The last layer torn: what tore it, and what it cost — the phase on
  // NORMAL (its checkpoint), nothing on STORY.
  showDeathCard({ label }, { rollback = 'phase', phaseName = '' } = {}) {
    const phase = PHASES[this.phase];
    const card = this.deathCardEl;
    card.querySelector('.nf-death-card__stamp').textContent = `LAYERS TORN · MOVEMENT ${phase.number} GOES ON`;
    card.querySelector('.nf-death-card__what').textContent = label;
    card.querySelector('.nf-death-card__kept').textContent = checkpointLine({ rollback, phaseName });
    card.querySelector('.nf-death-card__lines').textContent = `You are back on your feet with ${this.player.maxHp} layers. Nothing can tear you for ${D().respawnInv.toFixed(1)} seconds.`;
    card.classList.remove('show');
    void card.offsetWidth;
    card.classList.add('show');
    clearTimeout(this.deathCardTimer);
    this.deathCardTimer = setTimeout(() => card.classList.remove('show'), Math.max(4500, D().respawnInv * 1000 + 600));
  }

  // After three deaths in one movement the line offers to go gentler.
  // The offer replaces the death card rather than landing on top of it, and
  // carries what tore the layer (alpha round 2: the card covered it).
  offerStory() {
    this.dialoguePause = true;
    this.storyOffer = true;
    clearTimeout(this.deathCardTimer);
    this.deathCardEl.classList.remove('show');
    const what = escapeHtml(this.lastHit?.label ?? HIT_SOURCES.hit);
    const backdrop = document.createElement('div');
    backdrop.className = 'nf-card-backdrop nf-story-offer';
    backdrop.setAttribute('role', 'dialog');
    backdrop.innerHTML = `<article class="nf-card"><p class="nf-card__stamp">LAYERS TORN · MOVEMENT ${PHASES[this.phase].number} GOES ON</p><p class="nf-story-offer__what">What tore it: <b>${what}</b></p><h2 class="nf-card__title">The line can wait for you.</h2><div class="nf-card__lines"><p>Switch to STORY: the same patterns, slower and thinner, more paper layers, and a torn last layer undoes nothing.</p><p>Nothing is lost either way. Earlier phases stay won.</p></div><div class="nf-board__actions" style="justify-content:flex-start"><button class="nf-ticket-button" data-story="yes" type="button">STORY <span>S</span></button><button class="nf-ticket-button nf-ticket-button--quiet" data-story="no" type="button">KEEP NORMAL <span>N</span></button></div></article>`;
    this.hud.append(backdrop);
    backdrop.style.pointerEvents = 'auto';
    const close = (toStory) => {
      window.removeEventListener('keydown', onKey, true);
      backdrop.remove();
      this.storyOffer = false;
      this.dialoguePause = false;
      if (toStory) {
        setDifficulty('story');
        this.runner?.setDifficulty('story');
        this.toast('STORY · THE LINE SLOWS DOWN');
      }
    };
    const onKey = (event) => {
      // A held S (walking down) must not choose for the player.
      if (event.repeat) { event.preventDefault(); event.stopImmediatePropagation(); return; }
      if (event.code === 'KeyS') { event.preventDefault(); event.stopImmediatePropagation(); close(true); }
      if (event.code === 'KeyN' || event.code === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close(false); }
    };
    this.storyOfferClose = close;
    window.addEventListener('keydown', onKey, true);
    backdrop.querySelector('[data-story="yes"]').addEventListener('click', () => close(true));
    backdrop.querySelector('[data-story="no"]').addEventListener('click', () => close(false));
    backdrop.querySelector('[data-story="yes"]').focus({ preventScroll: true });
  }

  // Butch on screen: the runner moved him; this draws it.
  updatePlayerView(dt) {
    const p = this.player;
    this.butchLandTimer = Math.max(0, this.butchLandTimer - dt);
    this.playerRoot.position.set(p.x, p.y, p.z);
    this.respawnAura.visible = p.respawnInv > 0;
    if (this.respawnAura.visible) {
      const still = reducedMotionActive();
      this.respawnAura.scale.setScalar(still ? 1 : 1 + Math.sin(this.elapsed * 6) * 0.1);
      this.respawnAura.material.opacity = still ? 0.5 : 0.3 + Math.abs(Math.sin(this.elapsed * 4)) * 0.35;
    }
    const targetYaw = this.phase === 2 ? Math.atan2(p.facingX, p.facingZ) : 0;
    this.playerRoot.rotation.y = THREE.MathUtils.lerp(this.playerRoot.rotation.y, targetYaw, 1 - Math.exp(-dt * 14));
    this.puppet?.update(dt, Boolean(p.moving), p.grounded, p.attack > 0, p.hitTimer > 0, p.facingX);
    if (this.phase === 2) {
      const butchAction = this.butchLandTimer > 0 ? 'Jump_Land' : !p.grounded ? (p.vy > 1.2 ? 'Jump_Start' : 'Jump_Loop') : p.moving ? 'Walk_Loop' : 'Idle_Loop';
      this.playButchAction(butchAction, butchAction === 'Jump_Land');
      if (this.butchAction && butchAction === 'Walk_Loop') this.butchAction.setEffectiveTimeScale(1.3 * (p.dash > 0 ? 1.8 : 1));
      this.butchRoot.rotation.z = p.hitTimer > 0 && !reducedMotionActive() ? Math.sin(this.elapsed * 48) * 0.12 : 0;
    }
  }

  // The departure: Butch walks to the night service (no director).
  updateDepartureWalk(dt) {
    const k = this.keys;
    let dx = Number(k.has('ArrowRight') || k.has('KeyD')) - Number(k.has('ArrowLeft') || k.has('KeyA'));
    let dz = Number(k.has('ArrowDown') || k.has('KeyS')) - Number(k.has('ArrowUp') || k.has('KeyW'));
    if (this.pad?.connected) { dx += this.pad.moveX; dz += this.pad.moveZ; }
    if (this.pendingInput?.jump) { this.pendingInput.jump = false; startJump(this.player); }
    // DEV: the QA bot walks to the night service and jumps aboard.
    if (DEV_MODE && this.bot) {
      const tx = this.departureTrain.position.x + 1.1 - this.player.x;
      const tz = this.departureTrain.position.z + 1.6 - this.player.z;
      const m = Math.hypot(tx, tz);
      dx = m > 0.4 ? tx / m : 0; dz = m > 0.4 ? tz / m : 0;
      if (this.departureBoardable && m < 3 && this.player.grounded) startJump(this.player);
    }
    stepBody(this.player, { dx, dz }, dt, { bounds: ARENA });
    this.updatePlayerView(dt);
  }

  updateBoss(dt) {
    this.boss.inv = Math.max(0, this.boss.inv - dt);
    this.boss.stagger = Math.max(0, this.boss.stagger - dt);
    this.boss.gestureTime = Math.max(0, this.boss.gestureTime - dt);
    this.boss.flash = Math.max(0, this.boss.flash - dt);
    const still = reducedMotionActive();
    const orbit = this.phase === 1 ? this.boss.targetX : Math.sin(this.elapsed * (0.32 + this.phase * 0.04)) * 2.2;
    this.boss.x = THREE.MathUtils.lerp(this.boss.x, orbit, 1 - Math.exp(-dt * (this.phase === 1 ? 3.2 : 0.9)));
    this.boss.z = CONDUCTOR_Z;
    this.conductorRoot.position.x = this.boss.x;
    this.conductorRoot.position.z = CONDUCTOR_Z;
    this.conductorRoot.position.y = -2.8 + (this.boss.reaction === 'pain' ? -Math.sin(this.boss.gestureTime * Math.PI) * 0.7 : 0);
    this.conductorRoot.rotation.y = this.phase === 2 ? Math.atan2((this.player.x - this.boss.x) * 0.15, this.player.z - this.boss.z) : 0;
    const reactionRoll = this.boss.reaction === 'shame' ? -0.08 : this.boss.reaction === 'rage' ? 0.1 : 0;
    this.conductorRoot.rotation.z = this.boss.gestureTime > 0 ? reactionRoll + (this.boss.stagger > 0 && !still ? Math.sin(this.elapsed * 45) * 0.08 : 0) : 0;
    this.conductorPaper?.update(dt, false, true, this.boss.exposed > 0, false, this.player.x - this.boss.x);
    const paperFace = this.conductorPaper?.cards[this.phase]?.face;
    const lit = this.boss.flash > 0;
    if (paperFace?.material?.emissive) {
      paperFace.material.emissive.setHex(lit ? (this.boss.reaction === 'shame' ? 0x723344 : 0xffffff) : this.boss.exposed > 0 ? 0x3a2a10 : 0x000000);
      paperFace.material.emissiveIntensity = lit ? 0.8 : this.boss.exposed > 0 ? 0.5 : 0;
    } else if (paperFace?.material) {
      paperFace.material.color.setHex(lit ? 0xffd0c0 : this.boss.exposed > 0 ? 0xfff0d8 : 0xffffff);
    }
    this.conductorModel?.traverse((child) => {
      if (!child.isMesh || !child.material?.emissive) return;
      child.material.emissive.setHex(lit ? (this.boss.reaction === 'shame' ? 0x723344 : 0xffffff) : 0x000000);
      child.material.emissiveIntensity = lit ? 0.8 : 0;
    });
    this.updatePaintCreep();
    if (this.boss.gestureTime <= 0 && this.boss.reaction !== 'idle') { this.boss.reaction = 'idle'; this.playConductorAction('Idle_Loop'); }
  }

  updateEffects(dt) {
    this.effects.forEach((effect) => {
      effect.life -= dt;
      if (effect.type === 'decal') { effect.root.material.opacity = Math.min(0.9, Math.max(0, effect.life)); return; }
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
      this.updateDepartureWalk(this.departureBoardable ? dt * 0.36 : dt);
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
    if (this.updateTransition(dt)) {
      this.updateEffects(dt);
      // The paper actors finish turning to face the new world during the
      // fall, so neither stands edge-on when the movement opens (A4-10).
      this.puppet?.update(dt, false, true, false, false, this.player.facingX);
      this.conductorPaper?.update(dt, false, true, false, false, this.player.x - this.boss.x);
      return;
    }
    // Nothing is thrown while the world is still veiled or its card is up
    // for the first beat (the director's intro covers the card).
    if (!this.worldVeiled) this.stepFight(dt);
    this.updatePlayerView(dt);
    this.updateBoss(dt);
    this.syncFightVisuals(dt);
    this.updateProjectiles(dt);
    this.updateEffects(dt);
  }

  // Where the fight camera sits for the current player and Conductor. A
  // world fall lands on this pose, so a movement opens framed as it plays
  // (alpha A4-3: landing on a higher framing put the Conductor's head
  // under the hint at the start of Movement II).
  gameplayCameraPose(player = this.player, bossX = this.boss.x) {
    return {
      position: new THREE.Vector3(player.x * 0.12, 11.8 + player.y * 0.15, 19.8 + player.z * 0.06),
      target: new THREE.Vector3((player.x + bossX) * 0.12, 3.4, -5.2),
    };
  }

  updateCamera(dt) {
    if (this.mode === 'cinematic') {
      const trainView = this.departureTrain.position.clone().add(new THREE.Vector3(-9, 6.5, 13));
      this.camera.position.lerp(trainView, 1 - Math.exp(-dt * 3));
    } else if (!this.transition || this.transition.kind === 'verified') {
      const { position: ideal, target } = this.gameplayCameraPose();
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
    const director = this.fight;
    const exposed = this.boss.exposed > 0;
    this.ticketBar.set(this.boss.hp / this.boss.maxHp, { dt });
    const fightPhase = director?.track.phase;
    this.ticketBar.setLabel(fightPhase && this.mode === 'play' ? `${phase.number} · ${phase.world} · ${director.track.index + 1}/${director.track.count} ${fightPhase.name}` : `MOVEMENT ${phase.number} · ${phase.world}`);
    // After a torn last layer the ticket says what it cost.
    this.keptFlash = Math.max(0, this.keptFlash - dt);
    const keptText = this.lastDeath?.rollback === 'phase' ? 'CHECKPOINT · THIS PHASE AGAIN' : 'KEPT · NOTHING UNDONE';
    const openText = this.phase === 1 && director?.onTheBellOpen ? 'ON THE BELL' : this.phase === 3 && exposed ? `OPEN · ${director.openLeft.toFixed(1)}` : 'EXPOSED';
    this.ticketBar.setState(exposed ? openText : this.mode === 'departure' ? 'OUTLASTED' : this.keptFlash > 0 ? keptText : '', exposed);
    this.ticketBar.root.classList.toggle('is-kept', this.keptFlash > 0 && !exposed);
    const plaqueTitle = this.plaque.querySelector('b');
    const plaqueRule = this.plaque.querySelector('span');
    const title = fightPhase && this.mode === 'play' ? `${phase.number} · ${fightPhase.name}` : phase.title;
    const rule = PHASE_RULES[fightPhase?.id] ?? phase.rule;
    if (plaqueTitle.textContent !== title) plaqueTitle.textContent = title;
    if (plaqueRule.textContent !== rule) plaqueRule.textContent = rule;
    const layerTitle = this.layers.querySelector('b');
    const label = `BUTCH · ${phase.form === 'BUTCH' ? 'CLERK' : phase.form} · ${D().label}`;
    if (layerTitle.textContent !== label) layerTitle.textContent = label;
    const row = this.layers.querySelector('.nf-layers__row');
    const key = `${this.player.hp}/${this.player.maxHp}`;
    if (row.dataset.key !== key) {
      row.dataset.key = key;
      row.innerHTML = Array.from({ length: this.player.maxHp }, (_, i) => `<i class="${i < this.player.hp ? '' : 'is-torn'}"></i>`).join('');
    }
    const dashText = `SHIFT · DASH${this.player.dashCd > 0 ? ` ${this.player.dashCd.toFixed(1)}` : ' READY'}`;
    let ability = dashText;
    if (this.player.respawnInv > 0) ability = `STEADY · ${this.player.respawnInv.toFixed(1)}`;
    else if (this.phase === 0 && director) ability = `${dashText} · LENS ${director.lens.aimed ? 'AIMED' : 'LEADS YOU'} · VOLLEYS ${director.stats.volleys}`;
    else if (this.phase === 1) ability = `${dashText} · HOLD Q · LISTEN`;
    else if (this.phase === 2 && director?.pairLeft > 0) ability = `HOLDING ONE TRUE THING · ${director.pairLeft.toFixed(1)}`;
    else if (this.phase === 3) ability = `BRUSH ${this.player.color}/3 · RETURN ${paintReturnDamage(Math.max(1, this.player.color))}${this.player.color ? ` · HEAVY ${Math.round(this.player.color * 7)}%` : ''} · ${dashText}`;
    const small = this.layers.querySelector('small');
    if (small.textContent !== ability) small.textContent = ability;
    // The one hint line (only while a phase teaches, or at the finish).
    if (this.mode === 'play' && !this.transition && director) this.hint(director.hint(this.player, { mouse: this.lost.lensMode === 'mouse' }) || '');
    // bell meter
    if (this.phase === 1 && director?.arena) {
      const arena = director.arena;
      const lineStates = {};
      ['amber', 'teal', 'rose'].forEach((line) => {
        const nodes = BELL_ARENA.nodes.filter((node) => node.line === line).map((node) => arena.timetable.nodeStatus(node.id));
        lineStates[line] = nodes.some((node) => node.powering) ? 'powering' : nodes.some((node) => node.queued) ? 'queued' : 'idle';
      });
      const preview = this.bell.listening ? arena.preview() : null;
      const lane = director.announced();
      const next = arena.plan;
      const text = preview
        ? `LISTENING · ${preview.machines.filter((c) => c.to === 'on').map((c) => MACHINE_NAMES[c.machineId]).join(' · ') || 'NOTHING QUEUED'}`
        : director.onTheBellOpen ? 'ON THE BELL · PUNCH NOW'
          : lane ? `NEXT BELL · HE STEPS ${lane.toUpperCase()}${next.beamLanes.length ? ` · BEAMS ${next.fullSweep ? 'ALL THREE' : next.beamLanes.map((l) => l.toUpperCase()).join('+')}` : ''}`
            : 'HE CALLS HIS LANE LATE · WATCH THE BELL';
      this.bellMeter.update({ phase: arena.bellPhase(), msToBell: arena.msToBell(), lineStates, text, listening: this.bell.listening });
    }
    this.updateWorldTags();
  }

  updateWorldTags() {
    this.tags.begin();
    const p = this.player;
    const director = this.fight;
    if (this.mode === 'play' && !this.transition && !this.dialoguePause && !this.worldVeiled && director) {
      if (this.phase === 0) {
        const tags = [];
        const objective = director.objective(p);
        for (const c of director.cases) {
          if (!c.claim || c.returned || c.filed) continue;
          const pt = this.screenPoint(c.x, 2.2, c.z);
          if (!pt) continue;
          const near = Math.hypot(c.x - p.x, c.z - p.z) <= LOST_CASE_REACH;
          const read = c.landed && Math.hypot(c.x - director.lens.x, c.z - director.lens.z) <= director.lens.radius;
          if (!c.landed) tags.push({ text: 'CLAIM · STAND BY ITS RING', x: pt.x, y: pt.y, dim: true });
          else if (read && near) tags.push({ text: '<kbd>E</kbd> · RETURN', x: pt.x, y: pt.y, priority: 2 });
          else if (read) tags.push({ text: escapeHtml(this.entityViews.get(c.id)?.art?.claim ?? CLAIMS[c.serial % CLAIMS.length]), x: pt.x, y: pt.y, dim: true });
          else tags.push({ text: 'LENS · READ THE CLAIM', x: pt.x, y: pt.y, dim: true, priority: objective.caseId === c.id ? 1 : 0 });
        }
        spreadWorldTags(tags).forEach((tag) => this.tags.tag(tag.text, tag.x, tag.y, { dim: Boolean(tag.dim) }));
      } else if (this.phase === 1 && director.arena) {
        const arena = director.arena;
        const nearest = arena.nearestNode(p.x, p.z);
        BELL_ARENA.nodes.forEach((node) => {
          const status = arena.timetable.nodeStatus(node.id);
          const isNear = nearest?.id === node.id;
          if (!isNear && !status.queued) return;
          const pt = this.screenPoint(node.x, 2.5, node.z);
          if (!pt) return;
          this.tags.tag(isNear && !status.queued ? `<kbd>E</kbd> · ${node.label}` : `${node.label} · QUEUED`, pt.x, pt.y, { color: LINE_CSS[node.line], queued: status.queued, dim: !isNear });
        });
        const lit = director.exposureLit();
        if (lit && !lit.punched && arena.onFrontPlatform(p.z)) {
          const pt = this.screenPoint(LANE_X[lit.lane], 2.4, ARENA.minZ + 0.6);
          if (pt) this.tags.tag(laneOf(p.x) === lit.lane ? '<kbd>E</kbd> · RETURN THE LIGHT' : `STEP INTO THE ${lit.lane.toUpperCase()} LANE`, pt.x, pt.y);
        }
        const lane = director.announced();
        if (lane) {
          const nextPt = this.screenPoint(LANE_X[lane], 1.1, ARENA.minZ + 0.9);
          if (nextPt) this.tags.tag('NEXT STOP', nextPt.x, nextPt.y, { color: LINE_CSS.rose, dim: true });
        }
      } else if (this.phase === 2) {
        const tags = [];
        for (const t of director.truths) {
          if (t.state !== 'ready' && t.state !== 'descending') continue;
          const pt = this.screenPoint(t.x, 2.9, t.z);
          if (!pt) continue;
          const near = Math.hypot(t.x - p.x, t.z - p.z) <= ECHO_TRUTH_REACH;
          tags.push({ text: `${near ? '<kbd>E</kbd> · ' : ''}${escapeHtml(t.text)}`, x: pt.x, y: pt.y, priority: near ? 2 : 1 });
        }
        for (const a of director.attacks) {
          if (!a.meta?.text || a.state !== 'tele') continue;
          const pt = this.screenPoint(a.x, 1.4, a.z);
          if (pt) tags.push({ text: escapeHtml(a.meta.text), x: pt.x, y: pt.y, dim: true });
        }
        if (director.frontLit) {
          const pt = this.screenPoint(this.boss.x * 0.5, 1.8, ARENA.minZ + 1.2);
          if (pt) tags.push({ text: p.z <= ECHO_FRONT_EDGE_Z ? '<kbd>E</kbd> · SAY IT TO HIS FACE' : 'THE FRONT EDGE · <kbd>E</kbd>', x: pt.x, y: pt.y, priority: 3 });
        }
        spreadWorldTags(tags).forEach((tag) => this.tags.tag(tag.text, tag.x, tag.y, { dim: Boolean(tag.dim) }));
      } else if (this.phase === 3) {
        const wet = director.puddles.filter((pd) => pd.wetLeft > 0 && !pd.taken)
          .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
        if (wet && this.player.color < 3) {
          const pt = this.screenPoint(wet.x, 1.4, wet.z);
          if (pt) this.tags.tag(Math.hypot(wet.x - p.x, wet.z - p.z) <= PAINT_ABSORB_REACH ? 'HOLD <kbd>E</kbd> · ABSORB' : 'WET COLOUR', pt.x, pt.y, { dim: Math.hypot(wet.x - p.x, wet.z - p.z) > PAINT_ABSORB_REACH });
        }
        if (director.open && this.player.color > 0) {
          const pt = this.screenPoint(p.x, 3.2, p.z);
          if (pt) this.tags.tag('HE IS OPEN · HOLD <kbd>R</kbd>', pt.x, pt.y);
        }
      }
    }
    this.tags.end();
  }

  render(dt = 1 / 60) {
    this.updateCamera(dt);
    this.updateHud(dt);
    this.renderer.render(this.scene, this.camera);
    this.checkWorldVeil();
  }

  animate(now) {
    requestAnimationFrame(this.animate);
    const wall = Math.max(0, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    this.sampleQuality(wall);
    this.pollPad();
    if (globalThis.NIGHTFALL_PAUSED) { this.render(0); return; }
    // Game time follows the wall clock down to 10 fps (alpha round 4: the
    // old 33 ms cap played a 15 fps laptop at half speed), in substeps of at
    // most 1/30 s so nothing tunnels through a hit test.
    const steps = frameSteps(wall);
    steps.forEach((step) => this.update(step));
    const dt = steps.reduce((sum, step) => sum + step, 0);
    // Behind the departure board the stage is dimmed and still: redraw it
    // at a quarter rate there, leaving the GPU to the movements' uploads.
    if (this.mode === 'menu') {
      this.menuFrame = ((this.menuFrame ?? -1) + 1) % 4;
      if (this.menuFrame !== 0) return;
    }
    this.render(dt);
  }

  // The Conductor is outlasted, not defeated: the film, then one archive card
  // (docs/STORY_BIBLE.md, normal ending), then the credits.
  finish() {
    this.mode = 'end';
    this.hud.classList.add('hidden');
    this.stopMusic();
    // The journey has an ending now: Continue says so (journeyComplete.js).
    recordEnding('normal');
    playCinematic({
      id: 'ending',
      src: CINEMATICS.ending,
      label: 'NIGHTFALL ending cinematic',
      preserveBlackout: true,
      onComplete: () => showNormalEndingCard().then(() => showEndCredits({ ending: 'normal' })),
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
    // The film before it shows Butch reunited with the Mara ahead. Canon: that
    // is the echo, and he rides on with her. The card keeps it ambiguous.
    lines: ['The night service keeps running. Butch rides on beside the Mara ahead.', 'No one has punched her ticket.'],
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
// Every control in the chapter (finaleControls.js, the unified keys). The
// shell's per-stage list hears the current movement from the
// 'nightfall:controls-stage' event (SpectacleBattle.setControlsStage).
game.pauseMenu = installPauseMenu({
  checkpointId: 'chapter-6-start',
  controls: [...FINALE_ALL_CONTROLS.map((row) => [...row])],
});
// Round 6 (item 18): name this chapter's keys once, as play begins.
scheduleChapterControlsCard('chapter6', 4500);
createSaveStore().markCheckpoint('chapter-6-start');

const menu = document.querySelector('#menu');
const startButton = document.querySelector('#start');
let departing = false;
// The board is interactive as soon as it is drawn; Movement I's art is
// painted in the background meanwhile. A very quick DEPART waits on it with
// the button saying so, rather than opening on placeholders.
const startFight = () => {
  if (game.mode !== 'menu' || departing) return;
  departing = true;
  if (!game.movementReady(0) && startButton) {
    startButton.disabled = true;
    startButton.setAttribute('aria-busy', 'true');
    startButton.firstChild.textContent = 'PREPARING THE CARRIAGE… ';
  }
  game.prepareMovement(0).finally(() => {
    menu.classList.add('hidden');
    game.begin();
  });
};

// Arriving from Chapter 5 (the Museum's collapse film ends on black): the
// curtain lifts onto the difficulty board, never straight into the fight.
const conductorTestMovement = requestedConductorTestMovement();
if (new URLSearchParams(window.location.search).get('from') === 'chapter5') {
  const curtain = document.createElement('div');
  curtain.className = 'nf-entry-blackout';
  curtain.innerHTML = '<span>ALL WORLDS AT ONCE</span><small>THE CONDUCTOR IS WAITING</small>';
  document.body.append(curtain);
  // Lift as soon as the board has been drawn: the fight's art keeps loading
  // behind it (SpectacleBattle.loadAssets).
  requestAnimationFrame(() => requestAnimationFrame(() => {
    curtain.classList.add('is-revealed');
    window.setTimeout(() => curtain.remove(), 1400);
    startButton?.focus({ preventScroll: true });
  }));
} else if (conductorTestMovement !== null) {
  menu.classList.add('hidden');
  game.prepareMovement(conductorTestMovement).finally(() => game.begin({ movement: conductorTestMovement }));
}

// After an ending, Continue lands here on THE JOURNEY IS COMPLETE (alpha
// round 4), not straight back on the fight's board.
let journeyOpen = false;
const journeyEnding = new URLSearchParams(window.location.search).get('from') !== 'chapter5' && conductorTestMovement === null ? completedEnding() : null;
if (journeyEnding) {
  journeyOpen = true;
  // After this module has wired the start board's controls (they are
  // detached while the journey board stands in for it).
  queueMicrotask(() => showJourneyComplete({
    menu,
    ending: journeyEnding,
    actions: [{ label: 'PLAY THE CONDUCTOR AGAIN', onSelect: ({ restore }) => { restore(); journeyOpen = false; startButton?.focus({ preventScroll: true }); } }],
  }));
}

window.addEventListener('keydown', (event) => {
  if (event.code === 'Enter' && game.mode === 'menu' && !journeyOpen && !menu.classList.contains('hidden') && !globalThis.NIGHTFALL_PAUSED) startFight();
});
startButton.addEventListener('click', startFight);

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
window.addEventListener('nightfall:settings', (event) => {
  syncMotionToggles();
  if (game.voiceAudio) game.voiceAudio.volume = 0.9 * globalBus('master');
  // LOW GRAPHICS ticked in the pause menu takes effect at once (MSAA, fixed
  // with the context, stays as the page was loaded).
  if ((event.detail ?? globalThis.NIGHTFALL_SETTINGS)?.lowGraphics === true) game.applyLowQuality('setting');
});
// The settings may already ask for LOW before the shared menu applied them.
if (game.quality.tier === 'low') game.applyLowQuality('setting');

// QA/automation surface only: none of these globals exist in a production build.
if (DEV_MODE) {
  window.__finalBoss = game;
  window.render_game_to_text = () => {
    const director = game.fight;
    return JSON.stringify({
      chapter: 'chapter06-final-boss', mode: game.mode, difficulty, quality: { ...game.quality.snapshot(), pixelRatio: game.renderer.getPixelRatio(), shadows: game.renderer.shadowMap.enabled, antialias: Boolean(game.renderer.getContextAttributes()?.antialias) }, phase: game.phase, phaseTitle: PHASES[game.phase].title, world: PHASES[game.phase].world,
      music: music.qa(), assetsReady: game.assetsReady, assetErrors: game.assetErrors,
      player: { x: +game.player.x.toFixed(2), y: +game.player.y.toFixed(2), z: +game.player.z.toFixed(2), hp: game.player.hp, maxHp: game.player.maxHp, grounded: game.player.grounded, color: game.player.color, respawns: game.player.respawns, inv: +game.player.inv.toFixed(2), action: game.phase === 2 ? game.butchActionState : game.puppet?.action },
      boss: { hp: +game.boss.hp.toFixed(2), maxHp: game.boss.maxHp, phaseStartHp: game.boss.phaseStartHp, x: +game.boss.x.toFixed(2), exposed: game.boss.exposed > 0, lastDamageCause: game.boss.lastDamageCause ?? null, lastDamage: game.boss.lastDamage ?? null, form: game.conductorRoot.userData.form },
      fight: director ? { movement: director.id, ...director.snapshot(), stats: director.stats, runnerDeaths: game.runner?.deaths ?? 0, runnerHits: game.runner?.hits ?? 0, time: +(game.runner?.time ?? 0).toFixed(1) } : null,
      deaths: [0, 1, 2, 3].map((m) => game.deaths.deaths(m)), storyOffer: Boolean(game.storyOffer),
      controlsStage: game.controlsStage, bot: Boolean(game.bot), pad: Boolean(game.pad),
      visuals: { telegraphs: game.fightVisuals.count(), views: game.entityViews.size, projectiles: game.projectiles.length, effects: game.effects.length },
      transition: game.transition ? { kind: game.transition.kind, next: PHASES[game.transition.nextPhase].world, progress: +(game.transition.time / game.transition.duration).toFixed(2) } : null,
      ui: { veiled: game.worldVeiled, titleCard: Boolean(game.hud.querySelector('.nf-title-card')), storyOfferWhat: game.hud.querySelector('.nf-story-offer__what')?.textContent ?? null, toast: game.lastToast ?? null, hint: game.hintText ?? '', tags: game.tags.texts(), caption: game.caption.hidden ? null : game.caption.textContent.trim().slice(0, 200), voice: game.voiceState, lastHit: game.lastHit ?? null, lastDeath: game.lastDeath ?? null, deathCard: game.deathCardEl.classList.contains('show') ? game.deathCardEl.textContent : null, ticketState: game.ticketBar.root.querySelector('.nf-ticket-bar__state')?.textContent ?? '', ticketLabel: game.ticketBar.root.querySelector('.nf-ticket-bar__stub span')?.textContent ?? '' },
      rescue: { stage: game.mode === 'departure' ? 'night-service-arrival' : game.mode === 'cinematic' ? 'train-departure' : null, boardable: Boolean(game.departureBoardable) },
    });
  };
  window.advanceTime = (ms) => {
    const steps = Math.max(1, Math.round(ms / (1000 / 60)));
    for (let i = 0; i < steps; i += 1) {
      if (game.bot && game.mode === 'menu') break;
      game.update(1 / 60);
      game.updateHud(1 / 60);
    }
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
  // Tear layers as if hit (respects nothing: a QA shortcut to the checkpoint).
  window.damageFinalBossPlayer = (amount = 1) => {
    if (game.mode !== 'play' || !game.runner) return;
    for (let i = 0; i < Math.max(1, Math.round(Number(amount) || 1)); i += 1) {
      game.player.inv = 0; game.player.respawnInv = 0;
      const events = game.runner.hurt({ source: 'hit' }) ?? [];
      game.onFightEvents(events);
      if (events.some((e) => e.type === 'death')) break;
    }
    game.render();
  };
  window.damageFinalBoss = (amount = 25) => { if (game.mode === 'play') { game.hitBoss(amount); game.render(); } };
  window.setFinalBossLens = (x, z) => { game.lost.lensMode = 'mouse'; game.lost.pointer = null; game.lost.lensTarget = { x: Number(x), z: Number(z) }; game.qaAim = { x: Number(x), z: Number(z) }; game.render(); };
  // E / Enter (the action key), Space (jump only), Shift (dash).
  window.finalBossPunch = () => { game.actAction(); game.render(); };
  window.finalBossAct = () => { game.actAction(); game.render(); };
  window.finalBossJump = () => { game.jumpKey(); game.render(); };
  window.finalBossDash = () => { game.dash(); game.render(); };
  // Movement IV's holds: 'absorb' (E) or 'return' (R), on or off.
  window.finalBossHold = (kind = 'absorb', on = true) => { const code = kind === 'return' ? 'KeyR' : 'KeyE'; if (on) game.keys.add(code); else game.keys.delete(code); };
  window.finalBossHoldListen = (on = true) => { if (on) game.keys.add('KeyQ'); else game.keys.delete('KeyQ'); };
  window.finalBossMove = (dx = 0, dz = 0) => { ['KeyA', 'KeyD', 'KeyW', 'KeyS'].forEach((code) => game.keys.delete(code)); if (dx < 0) game.keys.add('KeyA'); if (dx > 0) game.keys.add('KeyD'); if (dz < 0) game.keys.add('KeyW'); if (dz > 0) game.keys.add('KeyS'); };
  window.triggerFinalBossRescue = () => { game.phase = 3; game.setWorld(3); game.boss.hp = 10; game.startRescueSequence(); game.render(); };
  window.triggerFinalBossWorldFall = (nextPhase = Math.min(3, game.phase + 1)) => { if (game.mode === 'play' && nextPhase > game.phase) game.startWorldTransition(nextPhase); };
  window.triggerFinalBossVerified = () => { if (game.mode !== 'play') return; game.phase = 1; game.setWorld(1); game.puppet?.setForm(1, true); game.startWorldTransition(2); game.render(); };
  // Skip the phase's teaching beat, or jump to a phase (0-based) of the
  // current movement.
  window.finishFinalBossTutorial = () => { game.fight?.skipTeach?.(); game.hint(''); game.render(); };
  window.setFinalBossFightPhase = (index) => { if (game.mode !== 'play' || !game.fight) return; game.clearHazards(); game.fight.jumpToPhase(Number(index)); game.syncBossHp(); game.applyPhaseLook(Number(index)); game.render(); };
  window.setFinalBossDifficulty = (id) => { setDifficulty(id); game.runner?.setDifficulty(difficulty); };
  // The QA bot (fightBot.js) plays the current movement and the departure.
  window.finalBossBot = async (on = true, skill = 'competent', seed = 5) => {
    if (!on) { game.bot = null; return false; }
    const { createFightBot } = await import('./fightBot.js');
    game.bot = createFightBot({ skill, seed });
    return true;
  };
  window.showFinalBossEndingCard = () => showNormalEndingCard();
}
