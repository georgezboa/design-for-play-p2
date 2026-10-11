// Chapter 6 · ALL WORLDS AT ONCE — the Conductor.
//
// Round 12 (docs/CHAPTER_06_BOSS_ROUND12.md): George asked for the boss to
// play like Split Fiction's. Each movement is now a sequence of SET PIECES,
// every one its own way to play and its own camera, bound to its world:
//   I   LOST PROPERTY   THE ROOF RUN (side-on, forced scroll along the
//                       night train) → RETURN TO SENDER (behind Butch: a
//                       rally of punched-back cases)
//   II  BORROWED LIGHT  ON THE BELL (a side-scrolling rooftop platformer on
//                       the four-second bell) → THE BELL TOWER (a vertical
//                       climb, the borrowed light rising)
//   III ECHO CITY       FALSE CLAIMS (top-down: his misreadings are the
//                       bullets) → THE STANDOFF (a duel on the clock)
//   IV  PAINTED COUNTRY THE PAINTED LINE (on rails, painting the line
//                       ahead) → the night service rams through him
// Then the ending film, the archive card and the credits.
//
// The rules live in setPieces/*.js (pure, node-tested, played by the QA bot
// in setPieces/bots.js); each world is drawn by a view in stage/*.js. This
// file reads input, runs the current piece, gives every hit its weight
// (hit-stop, shake, sound, particles), moves the camera between pieces and
// worlds, and keeps the HUD, the board, the pause menu and the ending flow.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

import { music } from '../../shared/musicDirector.js';
import { audioFocus } from '../../shared/audioFocus.js';
import { CINEMATICS, playCinematic } from '../../shell/gameFlow.js';
import { showEndCredits } from '../../shell/endCredits.js';
import { installPauseMenu } from '../../shell/pauseMenu.js';
import { scheduleChapterControlsCard } from '../../shell/controlsCard.js';
import { createSaveStore, readSettings, volumeForChannel } from '../../shell/saveSystem.js';
import { reducedMotionActive } from '../../shell/motion.js';
import { createBellMeter, createStoneRow, createTagLayer, createTicketBar, showArchiveCard, showTitleCard, stampAnnounce } from '../../shell/finaleUi.js';
import { DEV_MODE, devParam } from '../../devMode.js';
import * as bellAudio from '../borrowedLight/audio.js';
import { DEFAULT_DIFFICULTY, checkpointLine, createDeathLedger, difficultyPreset, spreadWorldTags, tagWidth } from './finaleModel.js';
import { NIGHT_SERVICE_SHARE, SET_PIECES, createMovementRun } from './setPieces/sequence.js';
import { FINALE_ALL_CONTROLS, PIECE_KEY_LINES, PROGRESS_KEPT_LINE, STORY_KEPT_LINE, announceControlsStage, padDirection, readFinalePad } from './finaleControls.js';
import { completedEnding, recordEnding, showJourneyComplete } from './journeyComplete.js';
import { createFinaleQualityMonitor, finalePixelRatio, finaleQualityPreference, frameSteps } from './finaleQuality.js';
import { loadFinaleArtSources } from './finaleArt.js';
import { setTextureSink } from './stage/stageKit.js';
import { createTrainView } from './stage/trainView.js';
import { createRooftopView } from './stage/rooftopView.js';
import { createSquareView } from './stage/squareView.js';
import { createLineView } from './stage/lineView.js';
import { createFightAudio } from './stage/fightAudio.js';
import { waitForFonts } from '../../shared/fonts.js';
// Start fetching the house faces now, so text painted into canvases a moment
// later is set in them, not the fallback.
waitForFonts();

// Runtime files under public/ are referenced by their served path. Only what
// the fight draws is loaded: the two Chapter 3 rigs and their animation
// library for Movement III, and the music.
const PUBLIC_ASSETS = Object.freeze({
  conductorUrl: '/assets/chapter03-3d/characters/male_municipal_shared_rig.glb',
  butchUrl: '/assets/chapter03-3d/characters/butch_shared_rig.glb',
  chapter3AnimationsUrl: '/assets/chapter03-3d/animations/quaternius_ual1_standard.glb',
  thresholdMusicUrl: '/assets/music/ch6/6.1_threshold_modern.mp3',
  gridMusicUrl: '/assets/music/ch6/6.2_grid_modern.mp3',
  echoCityMusicUrl: '/assets/music/ch6/6.3_dvorak_new_world_mvt4_theme.mp3',
  allLinesMusicUrl: '/assets/music/ch6/6.4_mussorgsky_kiev_gate.mp3',
  departureMusicUrl: '/assets/music/ch6/6.5_night_train_departure.mp3',
});
export const FINAL_BOSS_MODEL_URLS = Object.freeze([PUBLIC_ASSETS.conductorUrl, PUBLIC_ASSETS.butchUrl, PUBLIC_ASSETS.chapter3AnimationsUrl]);

const AMBER = 0xe0a24a;
const OXBLOOD = 0x8a2a1e;

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
  { id: 'lost', number: 'I', title: 'I · NIGHT SERVICE', world: 'LOST PROPERTY', rule: 'Run the roofs to the engine. Then send his cases back.', form: 'INK CLERK', music: BOSS_SCORE.threshold },
  { id: 'borrowed', number: 'II', title: 'II · BORROWED LIGHT', world: 'ON THE BELL', rule: 'The city moves on the bell. Cross on it, then climb his tower.', form: 'RAIN CLERK', music: BOSS_SCORE.grid },
  { id: 'echo', number: 'III', title: 'III · ECHO CITY', world: 'TWO TRUE THINGS', rule: 'His misreadings fly. Answer with both true things.', form: 'BUTCH', music: BOSS_SCORE.echoCity },
  { id: 'painted', number: 'IV', title: 'IV · THE PAINTED COUNTRY', world: 'THE PAINTED LINE', rule: 'Paint the line ahead. Outrun his wash.', form: 'INK FIGURE', music: BOSS_SCORE.allLines },
]);

// What can tear a paper layer, as the player is told it: the hit label, the
// death card and the side the hit flash comes from.
export const HIT_SOURCES = Object.freeze({
  case: 'A ROLLING CASE · JUMP IT',
  'claim-case': 'A BRASS CLAIM CASE · PUNCH IT AS IT REACHES YOU, OR JUMP IT',
  trunk: 'A TRUNK · STAY OUT OF ITS SHADOW',
  gantry: 'A SIGNAL GANTRY · DUCK UNDER IT',
  coupling: 'THE COUPLING · JUMP BETWEEN THE CARRIAGES',
  drop: 'AN UNCLAIMED CASE · STEP OUT OF ITS GREY RING',
  'landing-claim': 'A BRASS CLAIM CASE · E AS IT LANDS, OR STEP OUT OF ITS RING',
  decoy: 'NO CLAIM · LEAVE A RING THAT READS NO CLAIM',
  sack: 'A MAIL SACK · JUMP IT',
  stamp: 'HIS OVERDUE STAMP · LEAVE THAT SIDE OF THE ROOF',
  beam: 'HIS SEARCHLIGHT · MOVE, OR GET UNDER A RAISED BILLBOARD',
  fall: 'THE STREET · CROSS ON A PLANK OR A BRIDGE, ON THE BELL',
  'bell-ring': 'THE BELL’S RING · BE IN THE AIR WHEN IT PASSES',
  light: 'THE BORROWED LIGHT · KEEP CLIMBING',
  counterweight: 'A COUNTERWEIGHT · WATCH ITS SHADOW',
  bell: 'THE BELL · PUNCH IT AS IT STRIKES, OR JUMP ITS RING',
  misreading: 'HIS MISREADING · FROM THE RECORD',
  'too-soon': 'TOO SOON · WAIT FOR THE CLOCK',
  'too-late': 'TOO LATE · THE CLOCK STRUCK',
  'drawn-line': 'A DRAWN LINE · PAINT IT BEFORE THE TRAIN GETS THERE',
  'wash-barrier': 'HIS WASH ON THE LINE · LEAN TO ANOTHER LINE',
  'brush-sweep': 'HIS BRUSH · JUMP IT',
  'ghost-train': 'A 1978 TRAIN · ITS LAMP WARNED OF IT',
  'bell-plank': 'A BELL PLANK OUT OF TIME · TAKE THE LINE THAT IS OUT',
  'falling-word': 'A FALLING WORD · LEAN AWAY',
  hit: 'THE CONDUCTOR',
});

// The one-line rule of each stretch, on the plaque (bottom right).
const SEGMENT_RULES = Object.freeze({
  'last-carriage': 'Jump the cases and the couplings. E punches a brass claim back.',
  luggage: 'Cases roll, trunks drop. Stay out of a trunk’s shadow.',
  gantries: 'A red lamp and a horn: a gantry. Duck under it.',
  uncoupled: 'He uncouples the carriages. The gaps widen. Keep running.',
  tender: 'Stand in the brass ring. E as it lands.',
  'return-to-sender': 'He volleys it back, faster. Punch it again.',
  overdue: 'His stamp and his sacks come with the rally. He sends it wide.',
  'no-claim': 'A ring that reads NO CLAIM under the lens: step out, do not punch.',
  'first-bell': 'Punch a lamp. It fires on the next bell.',
  'on-the-bell': 'Bell planks are out on the bell. Jump on the beat.',
  'off-beat': 'Amber on the bell, teal on the off-beat. His light stabs on the off-beat.',
  quickening: 'The bell quickens: three seconds now.',
  tower: 'Climb. On the bell, be in the air when the ring runs down the stones.',
  swing: 'Ride the swinging beams. The light is rising.',
  'rising-light': 'Keep climbing. His counterweights rattle down first.',
  'the-claim': 'The words are his misreadings. Touch one true thing, then the other.',
  'his-record': 'Leave a closing ring through its gap. Then line up under him: E.',
  echoes: 'The words echo off the square. The true things drift.',
  'the-draw': 'Wait for the clock. Then a true thing, and the other on the second stroke.',
  feints: 'His hand is not the clock.',
  'last-word': 'The record shuffles before the clock. Read it again.',
  'drawn-line': 'Hold E to paint the drawn line ahead. Lean round his wash.',
  'the-wash': 'Where his brush’s shadow falls, the line goes back to pencil.',
  'all-worlds': 'Every world at once: the 1978 tunnel, the bell, the words.',
});

const CONDUCTOR_TEST_ROUTES = Object.freeze({
  'conductor-1': [0, 0], 'conductor-1-2': [0, 1], 'conductor-2': [1, 0], 'conductor-2-2': [1, 1],
  'conductor-3': [2, 0], 'conductor-3-2': [2, 1], 'conductor-4': [3, 0],
});
function requestedConductorTest() {
  const route = CONDUCTOR_TEST_ROUTES[devParam('qa')];
  return Array.isArray(route) ? { movement: route[0], piece: route[1] } : null;
}

let difficulty = DEFAULT_DIFFICULTY;
const D = () => difficultyPreset(difficulty);
let shakeEnabled = !reducedMotionActive();
let flashEnabled = false;
const globalBus = (channel) => volumeForChannel(globalThis.NIGHTFALL_SETTINGS ?? readSettings(), channel);
let soundEnabled = true;
const still = () => reducedMotionActive();

function shadows(root) {
  root.traverse((child) => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
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
// colour, maps and transparency.
function cheapMaterial(material, cache) {
  if (!material?.isMeshStandardMaterial) return material;
  if (cache.has(material)) return cache.get(material);
  const cheap = new THREE.MeshLambertMaterial({
    name: material.name, color: material.color, map: material.map, alphaMap: material.alphaMap, alphaTest: material.alphaTest,
    emissive: material.emissive, emissiveMap: material.emissiveMap, emissiveIntensity: material.emissiveIntensity,
    transparent: material.transparent, opacity: material.opacity, side: material.side, depthWrite: material.depthWrite,
    vertexColors: material.vertexColors, fog: material.fog, toneMapped: material.toneMapped,
  });
  cheap.userData = { ...material.userData, finaleCheap: true };
  cache.set(material, cheap);
  return cheap;
}

// Hand the main thread back between slices of work, so the menu and the
// fight keep taking input and drawing frames while the next world paints.
function yieldToMain() {
  if (typeof globalThis.scheduler?.postTask === 'function') return globalThis.scheduler.postTask(() => {}, { priority: 'background' });
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// Run a step generator (each `yield` ends one slice), giving the main thread
// back whenever a slice has used its budget.
async function runSliced(steps, { budgetMs = 12, sink = null } = {}) {
  let deadline = performance.now() + budgetMs;
  for (;;) {
    setTextureSink(sink);
    let step;
    try { step = steps.next(); } finally { setTextureSink(null); }
    if (step.done) return step.value;
    if (performance.now() >= deadline) {
      await yieldToMain();
      deadline = performance.now() + budgetMs;
    }
  }
}

const escapeHtml = (text) => String(text).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

class SpectacleBattle {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b0806);
    this.scene.fog = new THREE.FogExp2(0x0b0806, 0.0);
    // Render quality (finaleQuality.js): LOW GRAPHICS starts without MSAA,
    // shadows or PBR shading at a reduced pixel ratio; a slow machine drops
    // to the same tier once it has been measured.
    this.quality = createFinaleQualityMonitor({ preference: finaleQualityPreference(globalThis.NIGHTFALL_SETTINGS ?? readSettings()) });
    const low = this.quality.tier === 'low';
    this.renderer = new THREE.WebGLRenderer({ antialias: !low, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(finalePixelRatio(this.quality.tier, devicePixelRatio));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.shadowMap.enabled = false;
    container.appendChild(this.renderer.domElement);
    this.camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 400);
    this.camera.position.set(0, 6, 20);
    this.cameraTarget = new THREE.Vector3(0, 1, 0);
    this.camera.lookAt(this.cameraTarget);
    this.loader = new GLTFLoader();
    this.loader.setMeshoptDecoder(MeshoptDecoder);
    this.textureLoader = new THREE.TextureLoader();
    this.assets = new Map();
    this.assetErrors = [];
    this.assetsReady = false;
    this.movementPrep = new Map();
    this.readyMovements = new Set();
    this.keys = new Set();
    this.edges = { jump: false, dash: false, act: false, dir: null };
    this.mouseHeld = false;
    this.mode = 'menu';
    this.phase = 0;
    this.elapsed = 0;
    this.lastFrame = performance.now();
    this.transition = null;
    this.handoff = null;
    this.hitStop = 0;
    this.trauma = 0;
    this.kick = new THREE.Vector3();
    this.cut = null;
    this.dialoguePause = false;
    this.deaths = createDeathLedger();
    this.runs = 0;
    this.run = null;
    this.pad = null;
    this.padButtons = null;
    this.boss = { hp: 400, maxHp: 400, flash: 0, reel: 0, lastDamageCause: null };
    this.voiceAudio = typeof Audio === 'undefined' ? null : new Audio();
    if (this.voiceAudio) { this.voiceAudio.preload = 'auto'; this.voiceAudio.playsInline = true; this.voiceAudio.volume = 0.9 * globalBus('master'); }
    this.voiceState = { playing: false, speaker: null, tone: null, text: null };
    this.controlsStage = null;
    this.keptFlash = 0;
    this.audio = createFightAudio({ volume: () => globalBus('sfx'), enabled: () => soundEnabled });
    this.buildLights();
    const ctx = { scene: this.scene, textureLoader: this.textureLoader, low, still, battle: this };
    this.views = {
      train: createTrainView(ctx),
      rooftops: createRooftopView(ctx),
      square: createSquareView(ctx),
      line: createLineView(ctx),
    };
    this.viewOfMovement = [this.views.train, this.views.rooftops, this.views.square, this.views.line];
    this.view = null;
    this.buildHud();
    this.bindEvents();
    bellAudio.installAudio();
    this.assetsPromise = this.loadAssets();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  // ------------------------------------------------------------------ build

  buildLights() {
    // The views are painted (unlit); the lights are for Movement III's rigs.
    this.hemi = new THREE.HemisphereLight(0xffe2b8, 0x24140e, 2.2);
    this.key = new THREE.DirectionalLight(0xffd6b0, 2.6);
    this.key.position.set(-7, 16, 10);
    this.scene.add(this.hemi, this.key);
  }

  // LOW tier, applied once: the setting, or measured slow frames.
  applyLowQuality(reason = 'setting') {
    if (this.quality.force(reason) === null && this.lowApplied) return;
    this.lowApplied = true;
    this.renderer.setPixelRatio(finalePixelRatio('low', devicePixelRatio));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.cheapenScene();
  }

  cheapenScene() {
    if (this.quality.tier !== 'low') return;
    this.cheapMaterials ||= new Map();
    this.scene.traverse((object) => {
      if (!object.isMesh) return;
      object.castShadow = false;
      object.receiveShadow = false;
      object.material = Array.isArray(object.material) ? object.material.map((m) => cheapMaterial(m, this.cheapMaterials)) : cheapMaterial(object.material, this.cheapMaterials);
    });
  }

  // One played frame's wall time for the slow-machine check.
  sampleQuality(frameSeconds) {
    if (this.quality.decided || this.mode !== 'play' || this.transition || this.handoff || this.dialoguePause || globalThis.NIGHTFALL_PAUSED) return;
    if (this.quality.sample(frameSeconds) === 'low') this.applyLowQuality('slow-frames');
  }

  buildHud() {
    // A new world is held behind black until the GPU has drawn it.
    this.veil = document.createElement('div');
    this.veil.className = 'nf-world-veil';
    this.veil.setAttribute('aria-hidden', 'true');
    this.container.appendChild(this.veil);
    // The lens: a world fall closes the screen to the punch-hole lens round
    // Butch and opens it on the next world. A piece's hand-off cuts.
    this.iris = document.createElement('div');
    this.iris.className = 'nf-iris';
    this.iris.setAttribute('aria-hidden', 'true');
    this.iris.innerHTML = '<i class="nf-iris__rim"></i>';
    this.container.appendChild(this.iris);
    this.cutEl = document.createElement('div');
    this.cutEl.className = 'nf-cut';
    this.cutEl.setAttribute('aria-hidden', 'true');
    this.container.appendChild(this.cutEl);
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
    // Hit feedback: the edge flash, the "what hit you" tag, the death card.
    this.hitFlashEl = document.createElement('div');
    this.hitFlashEl.className = 'nf-hit-flash';
    this.hitFlashEl.setAttribute('aria-hidden', 'true');
    this.hitLabelEl = document.createElement('div');
    this.hitLabelEl.className = 'nf-hit-label';
    this.hitLabelEl.setAttribute('role', 'status');
    this.hitLabelEl.innerHTML = '<b>HIT BY</b><span></span>';
    this.deathCardEl = document.createElement('div');
    this.deathCardEl.className = 'nf-death-card nf-death-card--quick';
    this.deathCardEl.setAttribute('role', 'status');
    this.deathCardEl.innerHTML = '<p class="nf-death-card__stamp"></p><p class="nf-death-card__title">What tore it: <b class="nf-death-card__what"></b></p><p class="nf-death-card__kept"></p><p class="nf-death-card__lines"></p>';
    this.hud.append(this.hitFlashEl, this.hitLabelEl, this.deathCardEl);
    this.tags = createTagLayer(this.hud);
    // THE STANDOFF's four record cards, one at each hand (DOM: TEXT SIZE).
    this.duelEl = document.createElement('div');
    this.duelEl.className = 'nf-duel';
    this.duelEl.hidden = true;
    this.duelEl.innerHTML = ['up', 'left', 'right', 'down'].map((slot) => `<div class="nf-duel__card" data-slot="${slot}"><kbd>${{ up: '↑', left: '←', right: '→', down: '↓' }[slot]}</kbd><span></span></div>`).join('') + '<p class="nf-duel__state"></p>';
    this.hud.append(this.duelEl);
    // THE PAINTED LINE: his grey wash creeping in from behind.
    this.washEl = document.createElement('div');
    this.washEl.className = 'nf-wash';
    this.washEl.setAttribute('aria-hidden', 'true');
    this.container.insertBefore(this.washEl, this.hud);
    this.caption = document.createElement('section');
    this.caption.className = 'nf-caption';
    this.caption.hidden = true;
    this.caption.innerHTML = '<p class="nf-caption__speaker"></p><p class="nf-caption__text"></p><div class="nf-caption__choices nf-caption__choices--pair"></div><span class="nf-caption__meta"></span>';
    this.caption.style.pointerEvents = 'none';
    this.hud.append(this.caption);
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    });
    // The unified keys: Space only jumps; Shift / X dash; E or Enter is the
    // piece's action (held, it paints the line); a direction answers in the
    // standoff. Presses are kept as edges and consumed by the next step.
    const DIRS = { KeyW: 'up', ArrowUp: 'up', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', KeyS: 'down', ArrowDown: 'down' };
    window.addEventListener('keydown', (event) => {
      if (globalThis.NIGHTFALL_PAUSED) return;
      this.keys.add(event.code);
      if (event.repeat) return;
      if (event.code === 'Space') { event.preventDefault(); this.jumpKey(); }
      if (event.code === 'ShiftLeft' || event.code === 'ShiftRight' || event.code === 'KeyX') this.dash();
      if (event.code === 'KeyE' || event.code === 'Enter' || event.code === 'NumpadEnter') {
        if (event.code !== 'KeyE') event.preventDefault();
        this.actAction();
      }
      if (DIRS[event.code] && this.mode === 'play') this.edges.dir = DIRS[event.code];
      if (event.code === 'KeyF' && this.mode !== 'menu') {
        if (!document.fullscreenElement) document.querySelector('.stage-wrap')?.requestFullscreen?.(); else document.exitFullscreen?.();
      }
    });
    window.addEventListener('keyup', (event) => { this.keys.delete(event.code); });
    window.addEventListener('blur', () => { this.keys.clear(); this.mouseHeld = false; });
    this.renderer.domElement.addEventListener('contextmenu', (event) => { if (this.mode === 'play') event.preventDefault(); });
    this.renderer.domElement.addEventListener('pointerdown', (event) => {
      if (this.mode !== 'play' || event.button !== 0) return;
      this.mouseHeld = true;
      this.actAction();
    });
    const release = () => { this.mouseHeld = false; };
    this.renderer.domElement.addEventListener('pointerup', release);
    this.renderer.domElement.addEventListener('pointercancel', release);
    this.renderer.domElement.addEventListener('pointerleave', release);
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
    // The standoff hears the D-pad and the face diamond as directions.
    if (this.run?.piece.id === 'standoff' && this.mode === 'play') {
      const dir = padDirection(pad);
      if (dir) this.edges.dir = dir;
      return;
    }
    if (pad.pressed.jump) { if (this.mode === 'menu') document.querySelector('#start')?.click(); else this.jumpKey(); }
    if (pad.pressed.dash) this.dash();
    if (pad.pressed.act) this.actAction();
  }

  // ------------------------------------------------------------ utilities

  // One banner slot under the ticket bar: a toast takes the hint's place
  // while it shows, and the hint comes back when it goes.
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

  toastOnce(key, text, hold = 2.2, everyS = 4) {
    this.toastGate ||= new Map();
    const now = performance.now();
    if (now - (this.toastGate.get(key) ?? -Infinity) < everyS * 1000) return;
    this.toastGate.set(key, now);
    this.toast(text, hold);
  }

  hint(text) {
    if (!text) { this.hintEl.classList.remove('show'); this.hintText = ''; this.hud.classList.remove('has-hint'); return; }
    if (this.hintText === text && this.hintEl.classList.contains('show')) return;
    this.hintText = text;
    this.hintEl.innerHTML = text;
    this.hintEl.classList.add('show');
    this.hud.classList.add('has-hint');
  }

  // Hold the veil over the stage until a frame of the new world is drawn.
  holdWorldVeil() {
    this.dropWorldFence();
    this.veilState = { frames: 0, fence: null, since: performance.now() };
    this.veil.classList.remove('is-lifting');
    this.veil.classList.add('is-held');
  }

  dropWorldFence() {
    const fence = this.veilState?.fence;
    if (!fence) return;
    try { this.renderer.getContext().deleteSync(fence); } catch {}
  }

  checkWorldVeil() {
    const state = this.veilState;
    if (!state) return;
    if (this.transition?.kind === 'verified') return;
    state.frames += 1;
    const gl = this.renderer.getContext();
    let drawn = state.frames >= 3;
    if (typeof gl.fenceSync === 'function') {
      if (!state.fence) { state.fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0); gl.flush(); return; }
      drawn = gl.getSyncParameter(state.fence, gl.SYNC_STATUS) === gl.SIGNALED && state.frames >= 2;
    }
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

  screenPoint(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    if (v.z > 1) return null;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    return { x: (v.x + 1) * 0.5 * w, y: (1 - v.y) * 0.5 * h };
  }

  playVoice(cue, onEnded = null) {
    if (Array.isArray(cue?.parts) && cue.parts.length) {
      const parts = cue.parts;
      const playFrom = (index) => this.playVoice(parts[index], index + 1 < parts.length ? () => playFrom(index + 1) : onEnded);
      return playFrom(0);
    }
    const readMs = Math.min(4200, 900 + (cue?.text?.length ?? 0) * 45);
    clearTimeout(this.voiceTimer);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(this.voiceTimer);
      this.voiceState.playing = false;
      music.setDialogueActive(false);
      onEnded?.();
    };
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

  // Movement III speaks while it fights: lines queue, never pause the square.
  queueVoice(cue, { meta = '', kind = 'line' } = {}) {
    if (!cue) return;
    this.voiceQueue ||= [];
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

  showCaption(cue, { meta = '' } = {}) {
    if (!cue) return;
    this.caption.hidden = false;
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
    this.voiceState.playing = false;
    music.setDialogueActive(false);
  }

  stopVoices() {
    if (this.voiceQueue) this.voiceQueue.length = 0;
    this.voiceBusy = false;
    this.closeCaption();
  }

  // From the record: what his misreading gets wrong, as a subtitle.
  showRecordLine(e) {
    if (!e.rebut) return;
    this.recordLineUntil = this.elapsed + 3.2;
    if (this.voiceState.playing) { this.toast(`FROM THE RECORD · ${e.rebut}`, 3); return; }
    this.showCaption({ speaker: 'CONDUCTOR · FROM THE RECORD', text: e.rebut }, { meta: e.record ?? '' });
    clearTimeout(this.recordTimer);
    this.recordTimer = setTimeout(() => { if (!this.voiceState.playing) this.closeCaption(); }, 3200);
  }

  // ------------------------------------------------------------ assets
  // Nothing heavy runs before the board is on screen. Then each movement's
  // paintings (and Movement III's rigs) are prepared in order, in short
  // slices, while the player reads the board or plays the movement before.

  async loadAssets() {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    for (let index = 0; index < PHASES.length; index += 1) await this.prepareMovement(index);
    this.assetsReady = true;
  }

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

  movementReady(index) { return this.readyMovements.has(index); }

  async buildMovementAssets(index) {
    const uploads = [];
    if (index === 0) {
      const sources = await loadFinaleArtSources();
      await (document.fonts?.ready ?? Promise.resolve());
      await runSliced(this.views.train.paint(sources), { sink: uploads });
    } else if (index === 1) {
      await runSliced(this.views.rooftops.paint(), { sink: uploads });
    } else if (index === 2) {
      await this.loadEchoCityModels();
      await runSliced(this.views.square.paint({ rigs: this.rigs }), { sink: uploads });
    } else if (index === 3) {
      await runSliced(this.views.line.paint(), { sink: uploads });
    }
    // Upload the new textures now, one per slice.
    await runSliced((function* upload(renderer) { for (const texture of uploads) { renderer.initTexture(texture); yield; } }(this.renderer)), { budgetMs: 8 });
    this.cheapenScene();
  }

  // Movement III draws the two Chapter 3 rigs and their animation library.
  async loadEchoCityModels() {
    await MeshoptDecoder.ready;
    const urls = { conductor: PUBLIC_ASSETS.conductorUrl, butch: PUBLIC_ASSETS.butchUrl, chapter3Animations: PUBLIC_ASSETS.chapter3AnimationsUrl };
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
    const shared = this.assets.get('chapter3Animations')?.animations ?? [];
    const rig = (id, height, tint = null) => {
      const source = this.assets.get(id);
      if (!source) return null;
      const root = fitModel(cloneSkeleton(source.root), height);
      if (tint !== null) root.traverse((child) => { if (child.isMesh && child.material) { child.material = child.material.clone(); child.material.color?.lerp(new THREE.Color(tint), 0.55); } });
      if (this.quality.tier === 'low') {
        this.cheapMaterials ||= new Map();
        root.traverse((child) => { if (child.isMesh) child.material = Array.isArray(child.material) ? child.material.map((m) => cheapMaterial(m, this.cheapMaterials)) : cheapMaterial(child.material, this.cheapMaterials); });
      }
      const clips = [...shared.filter((clip) => !source.animations.some((own) => own.name === clip.name)), ...source.animations];
      const mixer = new THREE.AnimationMixer(root);
      const actions = Object.fromEntries(clips.map((clip) => [clip.name.replace(/_Rig$/, ''), mixer.clipAction(clip)]));
      let current = null;
      const play = (name, once = false) => {
        const action = actions[name];
        if (!action || (action === current && !once)) return;
        current?.fadeOut(0.12);
        action.reset().fadeIn(0.12);
        action.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
        action.clampWhenFinished = once;
        action.play();
        current = action;
      };
      play('Idle_Loop');
      return { root, mixer, actions, play };
    };
    this.rigs = { conductor: rig('conductor', 3.8, 0x161a20), butch: rig('butch', 3.15) };
  }

  // ------------------------------------------------------------ lifecycle

  begin({ movement = 0, piece = 0, segment = 0 } = {}) {
    const start = THREE.MathUtils.clamp(Math.round(movement), 0, PHASES.length - 1);
    this.mode = 'play';
    this.elapsed = 0;
    this.transition = null;
    this.handoff = null;
    this.deaths.reset();
    this.runs += 1;
    this.keptFlash = 0;
    this.lastDeath = null;
    this.hud.classList.remove('hidden', 'is-departing', 'is-cinematic');
    this.holdWorldVeil();
    this.enterMovement(start, { first: true, piece, segment });
    stampAnnounce(this.hud, 'DEPARTING');
    this.updateHud();
  }

  // A movement opens: its world, its music, its card (with the keys of its
  // first set piece and, once, what a torn last layer costs).
  enterMovement(index, { first = false, piece = 0, segment = 0 } = {}) {
    this.phase = index;
    const phase = PHASES[index];
    this.view?.leave();
    this.view = this.viewOfMovement[index];
    this.run = createMovementRun({ movement: index, difficulty, ledger: this.deaths, seed: (this.runs - 1) * 13, startPiece: piece, startSegment: segment });
    this.playMusic(phase.music);
    this.audio.setIntensity(1, [96, 120, 108, 132][index]);
    this.bellMeter.setVisible(index === 1);
    this.hud.classList.toggle('has-bell', index === 1);
    bellAudio.setRain?.(index === 1 ? 0.6 : 0);
    const card = () => {
      const spec = this.run.spec;
      const shown = showTitleCard({ kicker: `MOVEMENT ${phase.number}`, main: phase.world, sub: `${spec.name} · ${phase.rule}`, keys: PIECE_KEY_LINES[spec.id], duration: 3400, parent: this.hud });
      const kept = document.createElement('p');
      kept.className = 'nf-title-card__kept';
      kept.textContent = difficulty === 'story' ? STORY_KEPT_LINE : PROGRESS_KEPT_LINE;
      shown?.root?.firstElementChild?.append(kept);
      return shown;
    };
    clearTimeout(this.titleTimer);
    this.pendingTitleCard = null;
    const show = () => { if (this.worldVeiled) this.pendingTitleCard = card; else card(); };
    if (first) this.titleTimer = setTimeout(show, 900); else show();
    this.enterPiece({ announce: false });
  }

  // A set piece opens in the movement's world.
  enterPiece({ announce = true } = {}) {
    const piece = this.run.piece;
    this.setControlsStage(piece.id);
    // In the square his lines are subtitles over play: slim, at the bottom.
    this.hud.classList.toggle('is-compact-caption', piece.view === 'top' || piece.view === 'standoff');
    this.view.enter(piece, this.viewContext());
    const look = this.view.look(piece);
    this.scene.background.setHex(look.background);
    this.scene.fog.color.setHex(look.fog);
    this.scene.fog.density = look.density;
    const pose = this.view.camera(piece, this.viewContext());
    if (!this.handoff) { this.camera.position.copy(pose.position); this.cameraTarget.copy(pose.target); this.camera.fov = pose.fov; this.camera.updateProjectionMatrix(); }
    if (announce) stampAnnounce(this.hud, piece.name, { holdMs: 1700 });
    this.boss.flash = 0;
    this.syncBossHp();
  }

  viewContext() { return { battle: this, rigs: this.rigs, elapsed: this.elapsed, still: still(), camera: this.camera }; }

  setControlsStage(stage) {
    if (this.controlsStage === stage) return;
    this.controlsStage = stage;
    announceControlsStage(stage, typeof window === 'undefined' ? null : window);
  }

  // His ticket: the movements before, plus what is left of this one.
  syncBossHp() {
    if (!this.run) return;
    this.boss.hp = Math.max(0, (3 - this.phase) * 100 + (100 - this.run.ticket()));
    if (this.phase === 3 && this.run.piece.boarded) this.boss.hp = 0;
  }

  // ------------------------------------------------------------ input
  jumpKey() { if (this.mode === 'play' && !this.transition && !this.dialoguePause) this.edges.jump = true; }
  dash() { if (this.mode === 'play' && !this.transition && !this.dialoguePause) this.edges.dash = true; }
  actAction() {
    if (this.mode !== 'play' || this.transition || this.storyOffer || this.dialoguePause) return;
    this.edges.act = true;
  }

  // One step's input, from the keys, the mouse and the pad.
  fightInput() {
    const k = this.keys;
    let x = Number(k.has('ArrowRight') || k.has('KeyD')) - Number(k.has('ArrowLeft') || k.has('KeyA'));
    let y = Number(k.has('ArrowDown') || k.has('KeyS')) - Number(k.has('ArrowUp') || k.has('KeyW'));
    const pad = this.pad;
    if (pad?.connected) { x += pad.moveX; y += pad.moveZ; }
    x = THREE.MathUtils.clamp(x, -1, 1);
    y = THREE.MathUtils.clamp(y, -1, 1);
    const view = this.run?.piece.view;
    const side = view === 'side' || view === 'rooftops' || view === 'tower';
    const input = {
      x, y,
      jump: this.edges.jump,
      jumpHeld: k.has('Space') || Boolean(pad?.buttons.jump),
      dash: this.edges.dash,
      act: this.edges.act,
      actHeld: k.has('KeyE') || k.has('Enter') || this.mouseHeld || Boolean(pad?.buttons.act),
      duck: side && (k.has('KeyS') || k.has('ArrowDown') || k.has('KeyC') || (pad?.moveZ ?? 0) > 0.6),
      dir: this.edges.dir,
    };
    this.edges = { jump: false, dash: false, act: false, dir: null };
    return input;
  }

  // ------------------------------------------------------------ one step
  stepFight(dt) {
    if (!this.run) return;
    let input = this.fightInput();
    if (DEV_MODE && this.bot) input = this.bot.decide(this.run.piece, dt);
    const events = this.run.step(dt, input);
    this.onFightEvents(events);
    this.syncBossHp();
  }

  onFightEvents(events) {
    const piece = this.run.piece;
    for (const e of events) {
      this.view?.onEvent(e, piece);
      switch (e.type) {
        case 'jump': this.audio.jump(); break;
        case 'land': this.audio.land((e.speed ?? 0) > 9); if ((e.speed ?? 0) > 12) this.addTrauma(0.12); break;
        case 'dash': this.audio.dash(); this.addTrauma(0.08); break;
        case 'hurt': this.onHurt(e); break;
        case 'death': this.onDeath(e); break;
        case 'damage': this.onBossDamage(e); break;
        case 'segment': this.onSegment(e); break;
        case 'segment-cleared': this.onSegmentCleared(e); break;
        case 'finisher': this.onFinisher(e); break;
        case 'finished': this.onPieceFinished(e); break;
        case 'act': this.onAct(e); break;
        case 'fall': bellAudio.fallWhoosh?.(); break;
        // I
        case 'warn': if (e.warning.kind === 'gantry') this.audio.horn(); else this.audio.whoosh(-1); break;
        case 'trunk-land': this.hitStopFor(0.04); this.addTrauma(0.3); this.audio.impact(0.9); break;
        case 'claim-hit': this.bossStruck(0.55, 'returned-claim'); break;
        case 'landed': if (e.hazard.kind !== 'claim') { this.addTrauma(0.18); this.audio.impact(0.5); } break;
        case 'stamp': this.addTrauma(0.35); this.audio.impact(1); break;
        case 'volleyed': this.audio.punch(); this.toast(`HE SENDS IT BACK · ${e.count} / ${e.need}`, 1.1); break;
        case 'rally-won': this.bossStruck(1, 'returned-claim', { big: true }); this.toast(e.wins >= e.need ? 'RETURNED TO SENDER' : `RALLY WON · ${e.wins} / ${e.need}`, 1.6); break;
        case 'rally-lost': if (e.why === 'missed') this.toastOnce('rally-miss', 'THE RALLY IS LOST · HE THROWS AGAIN', 1.4, 3); break;
        case 'reveal': this.audio.tone(300, 0.2, { type: 'square', vol: 0.03 }); break;
        // II
        case 'bell': bellAudio.bell(); this.bellMeter.ring?.(); this.addTrauma(0.05); break;
        case 'machine': if (e.on) bellAudio.machineOn(e.line === 'amber' ? 'bridge' : 'billboard'); else bellAudio.machineOff(e.line === 'amber' ? 'bridge' : 'billboard'); break;
        case 'lit': this.bossStruck(0.9, 'borrowed-light', { big: true }); this.toast('THE BORROWED LIGHT GOES BACK TO HIM', 1.8); break;
        case 'beam': this.audio.tone(1100, 0.22, { type: 'sawtooth', vol: 0.03 }); this.addTrauma(0.15); break;
        case 'weight-drop': this.audio.whoosh(-1); break;
        // III
        case 'claim': this.queueVoice(e.cue, { meta: 'HIS CLAIM', kind: 'claim' }); break;
        case 'misread-hit': this.showRecordLine(e); break;
        case 'held': bellAudio.paper?.(); this.audio.tone(620, 0.12, { vol: 0.03 }); break;
        case 'ready': this.audio.tone(880, 0.3, { type: 'triangle', vol: 0.035 }); break;
        case 'half': this.toast(e.line, 3); bellAudio.refused(); break;
        case 'windup': this.audio.tone(240, 0.18, { type: 'triangle', vol: 0.015 }); break;
        case 'wait': break;
        case 'feint': if (e.kind === 'chime') this.audio.chime(true); else if (e.kind === 'pigeons') this.audio.whoosh(1); else this.audio.tone(150, 0.12, { type: 'square', vol: 0.02 }); break;
        case 'draw': this.audio.clock(); this.hitStopFor(0.05); this.addTrauma(0.2); this.cutTo('draw', 0.32); break;
        case 'stroke': this.audio.clock(); break;
        case 'answered': this.cutTo('answered', 0.5); if (e.rebut) this.showRecordLine(e); else this.toast(e.why === 'soon' ? 'TOO SOON · HE ANSWERS FIRST' : 'TOO LATE · HE ANSWERS FIRST', 1.6); break;
        case 'swap': this.audio.whoosh(1); break;
        // IV
        case 'stroke-warn': this.audio.whoosh(1); break;
        case 'stroke-land': break;
        case 'sweep-warn': this.audio.whoosh(-1); break;
        case 'sweep': this.addTrauma(0.2); break;
        case 'ghost-warn': this.audio.horn(); break;
        case 'painted': this.audio.tone(520, 0.12, { type: 'triangle', vol: 0.03 }); break;
        case 'derail': case 'smash': this.hitStopFor(0.05); this.addTrauma(0.45); this.audio.impact(1); break;
        case 'boarded': this.onBoarded(); break;
        default: break;
      }
    }
  }

  onAct(e) {
    const r = e.result;
    if (r === 'returned' || r === 'volley') {
      this.audio.punch();
      this.hitStopFor(r === 'volley' ? 0.085 : 0.05);
      this.addTrauma(r === 'volley' ? 0.32 : 0.2, { x: 0.4 });
      this.toast(r === 'volley' ? 'VOLLEY · ON THE BOUNCE' : 'CLAIM RETURNED', 1.1);
    } else if (r === 'early') { bellAudio.refused(); this.toastOnce('early', 'TOO EARLY · AS IT REACHES YOU', 1.2, 2); }
    else if (r === 'decoy') { bellAudio.refused(); this.toast('NO CLAIM · IT IS HEAVY', 1.4); }
    else if (r === 'queued') { bellAudio.punchClack(); this.audio.punch(); }
    else if (r === 'already' || r === 'busy' || r === 'spent') bellAudio.refused();
    else if (r === 'on-the-bell') { bellAudio.punchClack(); this.bossStruck(0.8, 'on-the-bell', { big: true }); this.toast(e.punches >= 2 ? 'THE BELL CRACKS' : 'ON THE BELL', 1.4); }
    else if (r === 'late' || r === 'far') { if (this.run.piece.id === 'bell-tower') this.toastOnce('bell-miss', 'AS IT STRIKES · STAND UNDER IT', 1.4, 2); }
    else if (r === 'aside') { bellAudio.refused(); this.toastOnce('aside', 'HE STEPS ASIDE · LEAD HIM A LITTLE', 1.4, 1.5); }
    else if (r === 'one') this.toastOnce('one', 'ONE TRUE THING · NOW THE OTHER', 1.4, 2);
    else if (r === 'pair') { this.audio.punch(); this.bossStruck(1, 'two-true-things', { big: true, reaction: 'shame' }); if (e.reply?.cue) this.queueVoice(e.reply.cue, { meta: 'BOTH TRUE THINGS' }); }
    else if (r === 'first') { this.audio.tone(660, 0.16, { type: 'triangle', vol: 0.035 }); this.hitStopFor(0.04); }
    else if (r === 'second') this.hitStopFor(0.06);
  }

  // A hit with weight on Butch.
  onHurt(e) {
    const label = HIT_SOURCES[e.source] ?? HIT_SOURCES.hit;
    this.hitStopFor(0.09);
    this.addTrauma(0.5);
    if (flashEnabled && !reducedMotionActive()) { this.renderer.domElement.classList.add('hit-flash'); setTimeout(() => this.renderer.domElement.classList.remove('hit-flash'), 70); }
    this.audio.hurt();
    this.lastHit = { source: e.source, label, at: this.elapsed };
    if (e.layersLeft > 0) this.showHitFeedback(this.lastHit, e.from);
  }

  // The last layer torn: back to the stretch's checkpoint on NORMAL (a few
  // seconds), on his feet where he fell on STORY. Quick: no long card.
  onDeath(e) {
    this.hitStopFor(0.12);
    this.trauma = 0.3;
    this.keptFlash = 2.2;
    this.audio.sting('minor');
    const rollback = e.rollback;
    this.lastDeath = { phase: this.phase, piece: e.piece, segment: e.segment, source: this.lastHit?.source ?? 'hit', bossHp: this.boss.hp, rolledBack: e.rolledBack, rollback };
    this.showDeathCard(this.lastHit ?? { label: HIT_SOURCES.hit }, { rollback, phaseName: e.segmentName });
    this.cutTo('respawn', 0.25);
    if (e.offerStory) this.offerStory();
  }

  onSegment(e) {
    const piece = this.run.piece;
    if (e.index > 0) this.checkpointChip(e.name);
    this.audio.setIntensity(1 + Math.min(2, e.index), [96, 120, 108, 132][this.phase]);
    this.view?.onEvent({ type: 'escalate', index: e.index }, piece);
  }

  onSegmentCleared(e) {
    if (e.last) return;
    this.hitStopFor(0.06);
    this.addTrauma(0.3);
    this.audio.impact(0.8);
  }

  onFinisher() {
    this.hitStopFor(0.16);
    this.addTrauma(0.75);
    this.audio.sting(this.phase === 3 ? 'major' : 'minor');
    this.bossStruck(1.2, 'finisher', { big: true, reaction: 'rage' });
    this.hint('');
  }

  // A piece is over: the next piece of this movement, or the next world.
  onPieceFinished() {
    if (this.handoff || this.transition) return;
    const next = this.run.last ? null : this.run.index + 1;
    if (next !== null) { this.startHandoff(); return; }
    this.onMovementFinished();
  }

  onMovementFinished() {
    const m = this.phase;
    this.stopVoices();
    if (m === 3) { this.startRamCinematic(); return; }
    this.startWorldTransition(m + 1);
  }

  // Damage to his ticket: the boss reels, the hit has weight.
  onBossDamage(e) {
    this.boss.lastDamageCause = e.cause;
    this.syncBossHp();
  }

  bossStruck(strength = 1, cause = null, { big = false, reaction = 'pain' } = {}) {
    this.boss.flash = 0.22;
    this.boss.reel = Math.max(this.boss.reel, 0.5 + 0.4 * strength);
    this.boss.reaction = reaction;
    if (cause) this.boss.lastDamageCause = cause;
    this.hitStopFor(big ? 0.12 : 0.07);
    this.addTrauma(big ? 0.55 : 0.3, { y: 0.3 });
    this.audio.impact(big ? 1.3 : 0.8);
    this.view?.onEvent({ type: 'boss-struck', strength, big, reaction }, this.run?.piece);
  }

  hitStopFor(seconds) { this.hitStop = Math.max(this.hitStop, seconds); }

  // A small chip under the ticket bar: a new stretch is a checkpoint.
  checkpointChip(name) {
    const chip = document.createElement('div');
    chip.className = 'nf-checkpoint';
    chip.innerHTML = `<b>CHECKPOINT</b><span>${escapeHtml(name)}</span>`;
    this.hud.append(chip);
    requestAnimationFrame(() => chip.classList.add('show'));
    setTimeout(() => chip.remove(), 2600);
    this.lastCheckpoint = name;
  }

  // Shake and a directional kick (both off with Reduce Motion or SHAKE OFF).
  addTrauma(amount, kick = null) {
    this.trauma = Math.min(1, this.trauma + amount);
    if (kick && shakeEnabled && !reducedMotionActive()) this.kick.add(new THREE.Vector3(kick.x ?? 0, kick.y ?? 0, kick.z ?? 0));
  }

  // A camera cut inside a piece (the standoff's draw).
  cutTo(kind, seconds) { this.cut = { kind, left: seconds, total: seconds }; }

  // ------------------------------------------------------------ hand-offs
  // Inside a movement, a piece hands to the next without a menu: through a
  // tunnel (I), up the tower (II), the camera down to the stones (III).
  startHandoff() {
    const kind = ['tunnel', 'crane-up', 'crane-down', 'cut'][this.phase] ?? 'cut';
    const duration = kind === 'crane-down' ? 2.4 : 1.5;
    this.handoff = { kind, time: 0, duration, swapped: false };
    this.audio.whoosh(1);
    this.hint('');
  }

  updateHandoff(dt) {
    const h = this.handoff;
    if (!h) return false;
    h.time += dt;
    const t = Math.min(1, h.time / h.duration);
    const swapAt = h.kind === 'crane-down' ? 0.05 : 0.45;
    if (!h.swapped && t >= swapAt) {
      h.swapped = true;
      this.run.next();
      this.enterPiece();
      this.audio.setIntensity(1, [96, 120, 108, 132][this.phase]);
    }
    // The cut: black through the tunnel, a pale wipe up the tower.
    const dark = h.kind === 'crane-down' ? 0 : t < 0.45 ? THREE.MathUtils.smoothstep(t, 0.15, 0.45) : 1 - THREE.MathUtils.smoothstep(t, 0.45, 0.85);
    this.cutEl.style.opacity = String(dark);
    this.cutEl.dataset.kind = h.kind;
    if (t >= 1) { this.handoff = null; this.cutEl.style.opacity = '0'; }
    return true;
  }

  // ------------------------------------------------------------ world falls
  // Between movements the screen closes to the punch-hole lens round Butch,
  // and opens on the next world. Borrowed Light → Echo City is the ticket
  // inspection instead.
  startWorldTransition(nextPhase) {
    if (this.transition) return;
    clearTimeout(this.titleTimer);
    this.hud.querySelectorAll('.nf-title-card').forEach((card) => card.remove());
    this.stopVoices();
    this.hint('');
    if (this.phase === 1 && nextPhase === 2) { this.startVerifiedTransition(nextPhase); return; }
    const at = this.view?.point(this.run.piece, 'butch');
    const sp = at ? this.screenPoint(at.x, at.y, at.z) : null;
    this.transition = { kind: 'world-fall', nextPhase, time: 0, duration: 3.0, switched: false, sx: sp?.x ?? this.container.clientWidth / 2, sy: sp?.y ?? this.container.clientHeight / 2 };
    this.hitStopFor(0.12);
    this.addTrauma(0.6);
    this.audio.whoosh(1);
  }

  // Borrowed Light → Echo City: the Conductor checks the ticket.
  startVerifiedTransition(nextPhase) {
    this.transition = { kind: 'verified', nextPhase, time: 0, duration: 10 };
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
      if (!['Enter', 'NumpadEnter', 'KeyE'].includes(event.code) || this.transition?.kind !== 'verified') return;
      if (this.transition.time >= 3.6) { event.preventDefault(); this.transition.time = this.transition.duration; }
    };
    window.addEventListener('keydown', this.stampKey);
    this.hitStopFor(0.12);
    this.audio.impact(0.9);
  }

  updateTransition(dt) {
    const tr = this.transition;
    if (!tr) return false;
    const nextReady = this.movementReady(tr.nextPhase);
    if (!nextReady) this.prepareMovement(tr.nextPhase);
    tr.time += dt;
    if (tr.kind === 'verified') {
      if (!nextReady) tr.time = Math.min(tr.time, tr.duration - 0.001);
      const ticket = this.stampScene?.querySelector('.nf-stamp-ticket');
      if (tr.time > 1.6 && ticket && !ticket.classList.contains('is-punched')) { ticket.classList.add('is-punched'); bellAudio.punchClack(); }
      const stamp = this.stampScene?.querySelector('.nf-stamp');
      if (tr.time > 2.9 && stamp && !stamp.classList.contains('is-down')) { stamp.classList.add('is-down'); this.audio.impact(1); this.trauma = 0.25; }
      if (tr.time >= tr.duration) {
        window.removeEventListener('keydown', this.stampKey);
        this.stampScene?.remove();
        this.stampScene = null;
        this.transition = null;
        this.holdWorldVeil();
        this.enterMovement(tr.nextPhase);
      }
      return true;
    }
    if (!nextReady && !tr.switched) tr.time = Math.min(tr.time, tr.duration * 0.5);
    const t = Math.min(1, tr.time / tr.duration);
    // The lens closes on Butch, holds, and opens on the next world.
    const full = Math.hypot(this.container.clientWidth, this.container.clientHeight);
    const lensR = 70;
    let r;
    if (t < 0.4) r = THREE.MathUtils.lerp(full, lensR, THREE.MathUtils.smootherstep(t, 0, 0.4));
    else if (t < 0.55) r = THREE.MathUtils.lerp(lensR, 0, THREE.MathUtils.smoothstep(t, 0.4, 0.55));
    else r = THREE.MathUtils.lerp(0, full, THREE.MathUtils.smootherstep(t, 0.6, 1));
    if (!tr.switched && t >= 0.55) {
      tr.switched = true;
      this.holdWorldVeil();
      this.enterMovement(tr.nextPhase);
      tr.sx = this.container.clientWidth / 2;
      tr.sy = this.container.clientHeight * 0.55;
    }
    this.iris.style.setProperty('--ix', `${tr.sx}px`);
    this.iris.style.setProperty('--iy', `${tr.sy}px`);
    this.iris.style.setProperty('--ir', `${Math.max(0, r)}px`);
    this.iris.classList.toggle('is-on', t < 1);
    if (t >= 1) { this.transition = null; this.iris.classList.remove('is-on'); this.trauma = 0.3; }
    return t < 0.55;
  }

  // ------------------------------------------------------------ the ending
  // The night service has Butch: it rams through him (the line view plays
  // it), then the film, the archive card and the credits.
  onBoarded() {
    this.hud.classList.add('is-departing');
    this.setControlsStage('departure');
    this.toast('ABOARD THE NIGHT SERVICE', 2);
    this.playMusic(BOSS_SCORE.departure);
  }

  startRamCinematic() {
    if (this.mode === 'cinematic' || this.mode === 'end') return;
    this.mode = 'cinematic';
    this.cinematicTime = 0;
    this.hud.classList.add('is-cinematic');
    stampAnnounce(this.hud, 'OUTLASTED', { holdMs: 1800 });
    this.audio.stop();
    this.audio.sting('major');
    this.addTrauma(0.9);
    this.boss.hp = 0;
  }

  updateRescue(dt) {
    if (this.mode !== 'cinematic') return;
    this.cinematicTime += dt;
    const t = this.cinematicTime;
    this.views.line.syncRam?.(t, dt, this.camera, this.cameraTarget);
    if (t > 5.2) this.finish();
  }

  // The Conductor is outlasted, not defeated: the film, then one archive card
  // (docs/STORY_BIBLE.md, normal ending), then the credits.
  finish() {
    this.mode = 'end';
    this.hud.classList.add('hidden');
    this.stopMusic();
    this.audio.stop();
    recordEnding('normal');
    playCinematic({
      id: 'ending',
      src: CINEMATICS.ending,
      label: 'NIGHTFALL ending cinematic',
      preserveBlackout: true,
      onComplete: () => showNormalEndingCard().then(() => showEndCredits({ ending: 'normal' })),
    });
  }

  // ------------------------------------------------------------ feedback
  showHitFeedback({ label }, from) {
    const hit = this.hitFlashEl;
    let side = 'none';
    const butch = this.view?.point(this.run.piece, 'butch');
    if (from && butch) {
      const a = this.screenPoint(butch.x, butch.y, butch.z);
      const b = this.screenPoint(from.x ?? butch.x, from.y ?? butch.y, from.z ?? butch.z);
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
    this.hitLabelTimer = setTimeout(() => this.hitLabelEl.classList.remove('show'), 2000);
  }

  // The last layer torn: what tore it, and what it cost — back to the
  // stretch's checkpoint on NORMAL, nothing on STORY. Brief: play goes on.
  showDeathCard({ label }, { rollback = 'segment', phaseName = '' } = {}) {
    const phase = PHASES[this.phase];
    const card = this.deathCardEl;
    card.querySelector('.nf-death-card__stamp').textContent = `LAYERS TORN · MOVEMENT ${phase.number} GOES ON`;
    card.querySelector('.nf-death-card__what').textContent = label;
    card.querySelector('.nf-death-card__kept').textContent = checkpointLine({ rollback, phaseName });
    card.querySelector('.nf-death-card__lines').textContent = `${this.run.runner.vitals.maxHp} layers again. Nothing can tear you for ${D().respawnInv.toFixed(1)} seconds.`;
    card.classList.remove('show');
    void card.offsetWidth;
    card.classList.add('show');
    clearTimeout(this.deathCardTimer);
    this.deathCardTimer = setTimeout(() => card.classList.remove('show'), 2400);
  }

  // After three deaths in one movement the line offers to go gentler.
  offerStory() {
    this.dialoguePause = true;
    this.storyOffer = true;
    clearTimeout(this.deathCardTimer);
    this.deathCardEl.classList.remove('show');
    const what = escapeHtml(this.lastHit?.label ?? HIT_SOURCES.hit);
    const backdrop = document.createElement('div');
    backdrop.className = 'nf-card-backdrop nf-story-offer';
    backdrop.setAttribute('role', 'dialog');
    backdrop.innerHTML = `<article class="nf-card"><p class="nf-card__stamp">LAYERS TORN · MOVEMENT ${PHASES[this.phase].number} GOES ON</p><p class="nf-story-offer__what">What tore it: <b>${what}</b></p><h2 class="nf-card__title">The line can wait for you.</h2><div class="nf-card__lines"><p>Switch to STORY: the same set pieces, slower and kinder, more paper layers, and a torn last layer undoes nothing.</p><p>Nothing is lost either way. What you have won stays won.</p></div><div class="nf-board__actions" style="justify-content:flex-start"><button class="nf-ticket-button" data-story="yes" type="button">STORY <span>S</span></button><button class="nf-ticket-button nf-ticket-button--quiet" data-story="no" type="button">KEEP NORMAL <span>N</span></button></div></article>`;
    this.hud.append(backdrop);
    backdrop.style.pointerEvents = 'auto';
    const close = (toStory) => {
      window.removeEventListener('keydown', onKey, true);
      backdrop.remove();
      this.storyOffer = false;
      this.dialoguePause = false;
      if (toStory) {
        setDifficulty('story');
        this.run?.setDifficulty('story');
        this.toast('STORY · THE LINE SLOWS DOWN');
      }
    };
    const onKey = (event) => {
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

  // ------------------------------------------------------------ the frame
  update(dt) {
    this.audio.update(dt);
    this.rigs?.conductor?.mixer.update(dt);
    this.rigs?.butch?.mixer.update(dt);
    if (this.mode === 'cinematic') { this.elapsed += dt; this.updateRescue(dt); return; }
    if (this.mode !== 'play') return;
    if (this.transition?.kind === 'verified') { this.elapsed += dt; this.updateTransition(dt); return; }
    if (this.dialoguePause) return;
    if (this.hitStop > 0) { this.hitStop -= dt; this.view?.sync(this.run.piece, 0, this.camera, this.viewContext()); return; }
    this.elapsed += dt;
    this.boss.flash = Math.max(0, this.boss.flash - dt);
    this.boss.reel = Math.max(0, this.boss.reel - dt);
    this.keptFlash = Math.max(0, this.keptFlash - dt);
    if (this.cut) { this.cut.left -= dt; if (this.cut.left <= 0) this.cut = null; }
    const falling = this.updateTransition(dt);
    const handing = this.updateHandoff(dt);
    // Nothing plays while a world is veiled or the lens is closing.
    if (!this.worldVeiled && !falling && !(handing && !this.handoff?.swapped)) this.stepFight(dt);
    this.view?.sync(this.run.piece, dt, this.camera, this.viewContext());
  }

  updateCamera(dt) {
    if (this.view && this.run && this.mode === 'play') {
      const pose = this.view.camera(this.run.piece, this.viewContext());
      const blend = this.handoff?.kind === 'crane-down' ? 1.6 : 4;
      const k = 1 - Math.exp(-dt * blend);
      this.camera.position.lerp(pose.position, k);
      this.cameraTarget.lerp(pose.target, 1 - Math.exp(-dt * (blend + 1)));
      if (Math.abs(this.camera.fov - pose.fov) > 0.01) { this.camera.fov += (pose.fov - this.camera.fov) * k; this.camera.updateProjectionMatrix(); }
    }
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    this.kick.multiplyScalar(Math.exp(-dt * 9));
    const allow = shakeEnabled && !reducedMotionActive();
    const shake = allow ? this.trauma * this.trauma : 0;
    const position = this.camera.position.clone();
    position.x += Math.sin(this.elapsed * 47) * shake * 0.5 + (allow ? this.kick.x : 0);
    position.y += Math.sin(this.elapsed * 61) * shake * 0.3 + (allow ? this.kick.y : 0);
    const restore = this.camera.position.clone();
    this.camera.position.copy(position);
    this.camera.lookAt(this.cameraTarget);
    this.cameraRestore = restore;
  }

  // ------------------------------------------------------------ HUD

  updateHud(dt = 1 / 60) {
    if (!['play', 'cinematic'].includes(this.mode) || !this.run) return;
    const phase = PHASES[this.phase];
    const piece = this.run.piece;
    const spec = this.run.spec;
    this.ticketBar.set(this.boss.hp / this.boss.maxHp, { dt });
    this.ticketBar.setLabel(`${phase.number} · ${spec.name} · ${piece.seg.index + 1}/${piece.seg.count} ${piece.seg.current.name}`);
    const keptText = this.lastDeath?.rollback === 'segment' ? 'CHECKPOINT · THIS STRETCH AGAIN' : 'KEPT · NOTHING UNDONE';
    const departing = piece.boarded || this.mode === 'cinematic';
    this.ticketBar.setState(departing ? 'OUTLASTED' : this.keptFlash > 0 ? keptText : '', false);
    this.ticketBar.root.classList.toggle('is-kept', this.keptFlash > 0);
    const plaqueTitle = this.plaque.querySelector('b');
    const plaqueRule = this.plaque.querySelector('span');
    const title = `${phase.number} · ${piece.seg.current.name}`;
    const rule = SEGMENT_RULES[piece.seg.current.id] ?? phase.rule;
    if (plaqueTitle.textContent !== title) plaqueTitle.textContent = title;
    if (plaqueRule.textContent !== rule) plaqueRule.textContent = rule;
    const layerTitle = this.layers.querySelector('b');
    const label = `BUTCH · ${phase.form} · ${D().label}`;
    if (layerTitle.textContent !== label) layerTitle.textContent = label;
    const vitals = this.run.runner.vitals;
    const row = this.layers.querySelector('.nf-layers__row');
    const key = `${vitals.hp}/${vitals.maxHp}`;
    if (row.dataset.key !== key) {
      row.dataset.key = key;
      row.innerHTML = Array.from({ length: vitals.maxHp }, (_, i) => `<i class="${i < vitals.hp ? '' : 'is-torn'}"></i>`).join('');
    }
    const body = piece.body;
    let ability = body.dashCd !== undefined ? `SHIFT · DASH${body.dashCd > 0 ? ` ${body.dashCd.toFixed(1)}` : ' READY'}` : '';
    if (vitals.respawnInv > 0) ability = `STEADY · ${vitals.respawnInv.toFixed(1)}`;
    else if (piece.id === 'return-to-sender' && piece.rally) ability = `RALLY · ${piece.rally.count} / ${piece.rally.need}`;
    else if (piece.id === 'false-claims' && piece.held.length === 1) ability = `ONE TRUE THING · ${piece.pairLeft.toFixed(1)}`;
    else if (piece.id === 'false-claims' && piece.ready) ability = 'BOTH TRUE THINGS · E UNDER HIM';
    else if (piece.id === 'painted-line') ability = piece.body.painting ? 'PAINTING · BOTH HANDS ON THE BRUSH' : 'HOLD E · PAINT';
    else if (piece.id === 'standoff') ability = piece.duel?.stage === 'wait' ? 'WAIT FOR THE CLOCK' : '';
    const small = this.layers.querySelector('small');
    if (small.textContent !== ability) small.textContent = ability;
    if (this.mode === 'play' && !this.transition && !this.handoff) this.hint(piece.hint?.() || '');
    // The bell (Movement II): its four seconds, quickened in the last stretch.
    if (this.phase === 1 && piece.bellClock !== undefined) {
      const period = piece.period ?? 4;
      const msToBell = Math.max(0, (period - piece.bellClock) * 1000);
      this.bellMeter.update({ phase: piece.bellClock / period, msToBell, lineStates: { amber: 'idle', teal: 'idle', rose: 'idle' }, text: piece.id === 'bell-tower' && piece.seg.current.id === 'on-the-bell' ? 'ON THE BELL · PUNCH IT AS IT STRIKES' : `NEXT BELL · ${(msToBell / 1000).toFixed(1)}`, listening: false });
    }
    this.updateDuel();
    this.washEl.style.opacity = this.phase === 3 && this.mode === 'play' ? String(0.25 + 0.6 * (this.views.line.wash ?? 0)) : '0';
    this.updateWorldTags();
  }

  // The standoff's cards: which fact is at which hand, what was said.
  updateDuel() {
    const piece = this.run?.piece;
    const duel = piece?.id === 'standoff' && this.mode === 'play' && !this.handoff ? piece.duel : null;
    this.duelEl.hidden = !duel || duel.stage === 'said';
    if (!duel) return;
    const slots = piece.slots();
    for (const card of this.duelEl.querySelectorAll('.nf-duel__card')) {
      const slot = card.dataset.slot;
      const fact = slots[slot];
      const span = card.querySelector('span');
      if (span.textContent !== fact.text) span.textContent = fact.text;
      card.classList.toggle('is-said', duel.firstSlot === slot && (duel.stage === 'second' || duel.stage === 'said'));
    }
    const state = { claim: 'HIS CLAIM', wait: 'WAIT FOR THE CLOCK', draw: 'THE CLOCK · ONE TRUE THING', second: 'THE OTHER · ON THE SECOND STROKE', answered: 'HE ANSWERS YOU FIRST', said: '' }[duel.stage] ?? '';
    const el = this.duelEl.querySelector('.nf-duel__state');
    if (el.textContent !== state) el.textContent = state;
    this.duelEl.dataset.stage = duel.stage;
  }

  updateWorldTags() {
    this.tags.begin();
    if (this.mode === 'play' && !this.transition && !this.handoff && !this.dialoguePause && !this.worldVeiled && this.view && this.run) {
      const tags = [];
      // A tag stays whole on screen (its width grows with TEXT SIZE).
      const scale = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nf-scale')) || 1;
      const width = this.container.clientWidth;
      for (const tag of this.view.tags(this.run.piece) ?? []) {
        const pt = this.screenPoint(tag.x, tag.y, tag.z ?? 0);
        if (!pt) continue;
        const half = Math.min(width / 2 - 8, (tagWidth(tag.text) * scale) / 2);
        tags.push({ ...tag, x: THREE.MathUtils.clamp(pt.x, half + 8, width - half - 8), y: pt.y });
      }
      spreadWorldTags(tags).forEach((tag) => this.tags.tag(tag.text, tag.x, tag.y, { dim: Boolean(tag.dim), color: tag.color }));
    }
    this.tags.end();
  }

  render(dt = 1 / 60) {
    this.updateCamera(dt);
    this.updateHud(dt);
    this.renderer.render(this.scene, this.camera);
    if (this.cameraRestore) { this.camera.position.copy(this.cameraRestore); this.cameraRestore = null; }
    this.checkWorldVeil();
  }

  animate(now) {
    requestAnimationFrame(this.animate);
    const wall = Math.max(0, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    this.sampleQuality(wall);
    this.pollPad();
    if (globalThis.NIGHTFALL_PAUSED) { this.render(0); return; }
    // Game time follows the wall clock down to 10 fps, in substeps of at
    // most 1/30 s so nothing tunnels through a hit test.
    const steps = frameSteps(wall);
    steps.forEach((step) => this.update(step));
    const dt = steps.reduce((sum, step) => sum + step, 0);
    if (this.mode === 'menu') {
      this.menuFrame = ((this.menuFrame ?? -1) + 1) % 4;
      if (this.menuFrame !== 0) return;
    }
    this.render(dt);
  }

  playMusic(cue) {
    if (!cue || !soundEnabled) return;
    audioFocus.claim();
    this.currentMusic = cue;
    music.play(`final-boss-${cue.id}`, { ...cue, loop: cue.loop !== false });
  }

  stopMusic() { music.stop({ fade: 1.8 }); }
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
// Every control in the chapter (finaleControls.js). The shell's per-stage
// list hears the current set piece from the 'nightfall:controls-stage' event.
game.pauseMenu = installPauseMenu({
  checkpointId: 'chapter-6-start',
  controls: [...FINALE_ALL_CONTROLS.map((row) => [...row])],
});
scheduleChapterControlsCard('chapter6', 4500);
createSaveStore().markCheckpoint('chapter-6-start');

const menu = document.querySelector('#menu');
const startButton = document.querySelector('#start');
let departing = false;
// The board is interactive as soon as it is drawn; Movement I's art is
// painted in the background meanwhile.
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

// Arriving from Chapter 5: the curtain lifts onto the difficulty board.
const conductorTest = requestedConductorTest();
if (new URLSearchParams(window.location.search).get('from') === 'chapter5') {
  const curtain = document.createElement('div');
  curtain.className = 'nf-entry-blackout';
  curtain.innerHTML = '<span>ALL WORLDS AT ONCE</span><small>THE CONDUCTOR IS WAITING</small>';
  document.body.append(curtain);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    curtain.classList.add('is-revealed');
    window.setTimeout(() => curtain.remove(), 1400);
    startButton?.focus({ preventScroll: true });
  }));
} else if (conductorTest !== null) {
  menu.classList.add('hidden');
  game.prepareMovement(conductorTest.movement).finally(() => game.begin({ movement: conductorTest.movement, piece: conductorTest.piece }));
}

// After an ending, Continue lands here on THE JOURNEY IS COMPLETE.
let journeyOpen = false;
const journeyEnding = new URLSearchParams(window.location.search).get('from') !== 'chapter5' && conductorTest === null ? completedEnding() : null;
if (journeyEnding) {
  journeyOpen = true;
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
  if ((event.detail ?? globalThis.NIGHTFALL_SETTINGS)?.lowGraphics === true) game.applyLowQuality('setting');
});
if (game.quality.tier === 'low') game.applyLowQuality('setting');

// QA/automation surface only: none of these globals exist in a production build.
if (DEV_MODE) {
  window.__finalBoss = game;
  window.render_game_to_text = () => {
    const run = game.run;
    const piece = run?.piece;
    return JSON.stringify({
      chapter: 'chapter06-final-boss', mode: game.mode, difficulty, phase: game.phase, phaseTitle: PHASES[game.phase].title, world: PHASES[game.phase].world,
      quality: { ...game.quality.snapshot(), pixelRatio: game.renderer.getPixelRatio(), antialias: Boolean(game.renderer.getContextAttributes()?.antialias) },
      music: music.qa(), assetsReady: game.assetsReady, assetErrors: game.assetErrors, readyMovements: [...game.readyMovements],
      piece: piece ? { id: piece.id, index: run.index, count: run.count, view: piece.view, ...piece.snapshot() } : null,
      player: run ? { hp: run.runner.vitals.hp, maxHp: run.runner.vitals.maxHp, inv: +run.runner.vitals.inv.toFixed(2) } : null,
      boss: { hp: +game.boss.hp.toFixed(2), maxHp: game.boss.maxHp, lastDamageCause: game.boss.lastDamageCause },
      run: run ? { deaths: run.runner.deaths, hits: run.runner.hits, time: +run.runner.time.toFixed(1), ticket: +run.ticket().toFixed(1) } : null,
      deaths: [0, 1, 2, 3].map((m) => game.deaths.deaths(m)), storyOffer: Boolean(game.storyOffer),
      controlsStage: game.controlsStage, bot: Boolean(game.bot), pad: Boolean(game.pad), audio: { intensity: game.audio.intensity },
      handoff: game.handoff ? { kind: game.handoff.kind, progress: +(game.handoff.time / game.handoff.duration).toFixed(2) } : null,
      transition: game.transition ? { kind: game.transition.kind, next: PHASES[game.transition.nextPhase].world, progress: +(game.transition.time / game.transition.duration).toFixed(2) } : null,
      camera: { x: +game.camera.position.x.toFixed(2), y: +game.camera.position.y.toFixed(2), z: +game.camera.position.z.toFixed(2), fov: +game.camera.fov.toFixed(1) },
      ui: { veiled: game.worldVeiled, titleCard: Boolean(game.hud.querySelector('.nf-title-card')), storyOfferWhat: game.hud.querySelector('.nf-story-offer__what')?.textContent ?? null, toast: game.lastToast ?? null, hint: game.hintText ?? '', tags: game.tags.texts(), caption: game.caption.hidden ? null : game.caption.textContent.trim().slice(0, 200), lastHit: game.lastHit ?? null, lastDeath: game.lastDeath ?? null, deathCard: game.deathCardEl.classList.contains('show') ? game.deathCardEl.textContent : null, ticketState: game.ticketBar.root.querySelector('.nf-ticket-bar__state')?.textContent ?? '', ticketLabel: game.ticketBar.root.querySelector('.nf-ticket-bar__stub span')?.textContent ?? '' },
      views: game.view?.count?.() ?? 0,
    });
  };
  window.advanceTime = (ms) => {
    const steps = Math.max(1, Math.round(ms / (1000 / 60)));
    for (let i = 0; i < steps; i += 1) {
      if (game.bot && game.mode === 'menu') break;
      game.update(1 / 60);
      game.updateCamera(1 / 60);
      if (game.cameraRestore) { game.camera.position.copy(game.cameraRestore); game.cameraRestore = null; }
      game.updateHud(1 / 60);
    }
    game.render(0);
  };
  window.setFinalBossDifficulty = (id) => { setDifficulty(id); game.run?.setDifficulty(difficulty); };
  // Go straight to a set piece (0-based in its movement) and stretch.
  window.setFinalBossPiece = (pieceIndex = 0, segment = 0) => { if (game.mode !== 'play' || !game.run) return; game.run.jump(pieceIndex, segment); game.enterPiece(); game.render(); };
  window.setFinalBossSegment = (segment) => { if (game.mode !== 'play' || !game.run) return; game.run.piece.jumpToSegment(Number(segment)); game.render(); };
  window.setFinalBossFightPhase = window.setFinalBossSegment;
  window.finishFinalBossTutorial = () => { if (game.run?.piece.seg.index === 0) game.run.piece.jumpToSegment(1); game.render(); };
  // Tear layers as if hit (a QA shortcut to the checkpoint).
  window.damageFinalBossPlayer = (amount = 1) => {
    if (game.mode !== 'play' || !game.run) return;
    for (let i = 0; i < Math.max(1, Math.round(Number(amount) || 1)); i += 1) {
      game.run.runner.vitals.inv = 0; game.run.runner.vitals.respawnInv = 0;
      const events = game.run.runner.hurt({ source: 'hit' }) ?? [];
      game.onFightEvents(events);
      if (events.some((e) => e.type === 'death')) break;
    }
    game.render();
  };
  // Win the current stretch outright (QA).
  window.damageFinalBoss = () => {
    if (game.mode !== 'play' || !game.run) return;
    const piece = game.run.piece;
    if (!piece.seg.last) piece.jumpToSegment(piece.seg.index + 1);
    else { piece.seg.setProgress(1); piece.completeSegment(); game.onFightEvents(piece.flush()); }
    game.render();
  };
  window.finalBossMove = (dx = 0, dy = 0) => { ['KeyA', 'KeyD', 'KeyW', 'KeyS'].forEach((code) => game.keys.delete(code)); if (dx < 0) game.keys.add('KeyA'); if (dx > 0) game.keys.add('KeyD'); if (dy < 0) game.keys.add('KeyW'); if (dy > 0) game.keys.add('KeyS'); };
  window.finalBossJump = (hold = true) => { game.jumpKey(); if (hold) game.keys.add('Space'); else game.keys.delete('Space'); };
  window.finalBossRelease = () => { game.keys.delete('Space'); game.keys.delete('KeyE'); game.keys.delete('KeyS'); };
  window.finalBossDash = () => { game.dash(); };
  window.finalBossAct = () => { game.actAction(); };
  window.finalBossPunch = window.finalBossAct;
  window.finalBossHold = (kind = 'paint', on = true) => { const code = kind === 'duck' ? 'KeyS' : 'KeyE'; if (on) game.keys.add(code); else game.keys.delete(code); };
  window.finalBossDirection = (dir) => { game.edges.dir = dir; };
  window.triggerFinalBossWorldFall = (nextPhase = Math.min(3, game.phase + 1)) => { if (game.mode === 'play' && nextPhase > game.phase) game.startWorldTransition(nextPhase); };
  window.triggerFinalBossHandoff = () => { if (game.mode === 'play' && !game.run.last) game.startHandoff(); };
  window.triggerFinalBossVerified = () => { if (game.mode === 'play') { game.phase = 1; game.startWorldTransition(2); } };
  window.triggerFinalBossRescue = () => { if (game.mode === 'play' && game.phase === 3) { game.run.piece.jumpToSegment(2); } };
  // The QA bot (setPieces/bots.js) plays the current piece.
  window.finalBossBot = async (on = true, skill = 'skilled', seed = 5) => {
    if (!on) { game.bot = null; return false; }
    const { createPieceBot } = await import('./setPieces/bots.js');
    game.bot = createPieceBot({ skill, seed });
    return true;
  };
  window.showFinalBossEndingCard = () => showNormalEndingCard();
}

export { NIGHT_SERVICE_SHARE, SET_PIECES };
