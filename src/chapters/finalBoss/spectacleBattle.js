import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

import conductorUrl from '../../../public/assets/chapter03-3d/characters/male_municipal_shared_rig.glb?url';
import stationUrl from '../../../public/assets/chapter03-3d/models/ch03_open_air_station.glb?url';
import fountainUrl from '../../../public/assets/chapter03-3d/models/reunion_fountain_web.glb?url';
import clockUrl from '../../../public/assets/chapter03-3d/models/clock_tower_web.glb?url';
import archiveUrl from '../../../public/assets/chapter03-3d/models/old_municipal_archive_web.glb?url';
import butchUrl from '../../../public/assets/chapter03-3d/characters/butch_shared_rig.glb?url';
import chapter3AnimationsUrl from '../../../public/assets/chapter03-3d/animations/quaternius_ual1_standard.glb?url';
import tenementUrl from '../../../public/assets/chapter03-3d/models/ch03_perimeter_tenement.glb?url';
import workersHallUrl from '../../../public/assets/chapter03-3d/models/ch03_perimeter_workers_hall.glb?url';
import bakeryUrl from '../../../public/assets/chapter03-3d/models/ch03_shop_bakery_tenement.glb?url';
import printworksUrl from '../../../public/assets/chapter03-3d/models/ch03_shop_printworks_rowhouse.glb?url';
import trashUrl from '../../../public/assets/chapter03-3d/models/ch03_crushed_trash_can.glb?url';
import benchUrl from '../../../public/assets/chapter03-3d/models/ch03_fountain_bench.glb?url';
import speakerUrl from '../../../public/assets/chapter03-3d/models/ch03_pa_speaker.glb?url';
import paperTextureUrl from '../../assets/shared/painterly/paper-texture-ivory-v01.png?url';
import ch1TrainUrl from './assets/paper/ch1-train-exterior-v01.png?url';
import ch1SuitcaseUrl from './assets/paper/ch1-suitcase.png?url';
import ch1MemoryUrl from './assets/paper/ch1-memory-transit-pass.png?url';
import ch1IdleUrl from './assets/paper/ch1-player-idle-0.png?url';
import ch1Walk0Url from './assets/paper/ch1-player-walk-0.png?url';
import ch1Walk1Url from './assets/paper/ch1-player-walk-1.png?url';
import ch1JumpUrl from './assets/paper/ch1-player-jump.png?url';
import ch1ConductorUrl from './assets/paper/ch1-conductor.png?url';
import ch2PlayerUrl from './assets/paper/ch2-c4-player.png?url';
import ch2LadderUrl from './assets/paper/ch2-parkour-ladder-original.svg?url';
import ch2BlockUrl from './assets/paper/ch2-parkour-block.png?url';
import ch2ConductorUrl from './assets/paper/ch2-conductor.png?url';
import ch4PlayerUrl from './assets/paper/ch4-player.png?url';
import ch4ButchIdleUrl from './assets/paper/ch4-butch-walk-0.png?url';
import ch4ButchWalk1Url from './assets/paper/ch4-butch-walk-1.png?url';
import ch4ButchWalk2Url from './assets/paper/ch4-butch-walk-2.png?url';
import ch4ButchWalk3Url from './assets/paper/ch4-butch-walk-3.png?url';
import ch4SootUrl from './assets/paper/ch4-pigment-soot.png?url';
import ch4IndigoUrl from './assets/paper/ch4-pigment-indigo.png?url';
import ch4VerdigrisUrl from './assets/paper/ch4-pigment-verdigris.png?url';
import ch4ConductorUrl from './assets/paper/ch4-conductor.png?url';
import captchaTrain01Url from './assets/captcha/train-01.jpg?url';
import captchaTrain02Url from './assets/captcha/train-02.jpg?url';
import captchaTrain03Url from './assets/captcha/train-03.jpg?url';
import captchaTrain04Url from './assets/captcha/train-04.jpg?url';
import captchaDog01Url from './assets/captcha/dog-01.jpg?url';
import captchaDog02Url from './assets/captcha/dog-02.jpg?url';
import captchaDog03Url from './assets/captcha/dog-03.jpg?url';
import captchaDog04Url from './assets/captcha/dog-04.jpg?url';
import captchaBusBikeUrl from './assets/captcha/bus-bike-01.jpg?url';
import captchaTrain05Url from './assets/captcha/train-05.jpg?url';
import captchaTrain06Url from './assets/captcha/train-06.jpg?url';
import captchaTrain07Url from './assets/captcha/train-07.jpg?url';
import captchaTrain08Url from './assets/captcha/train-08.jpg?url';
import captchaCat01Url from './assets/captcha/cat-01.jpg?url';
import captchaCat02Url from './assets/captcha/cat-02.jpg?url';
import captchaCat03Url from './assets/captcha/cat-03.jpg?url';
import captchaPlane01Url from './assets/captcha/plane-01.jpg?url';
import captchaPlane02Url from './assets/captcha/plane-02.jpg?url';
import verdiDiesIraeUrl from '../../../public/assets/music/ch5/5.7_verdi_dies_irae.mp3?url';
import echoCityMusicUrl from '../../../public/assets/music/ch6/6.3_dvorak_new_world_mvt4_theme.mp3?url';
import allLinesMusicUrl from '../../../public/assets/music/ch6/6.4_mussorgsky_kiev_gate.mp3?url';
import departureMusicUrl from '../../../public/assets/music/ch6/6.5_night_train_departure.mp3?url';
import conductorVoice02 from '../../../public/assets/chapter03-3d/voice/ch03/conductor/CH03_CONDUCTOR_0002.ogg?url';
import conductorVoice05 from '../../../public/assets/chapter03-3d/voice/ch03/conductor/CH03_CONDUCTOR_0005.ogg?url';
import conductorVoice06 from '../../../public/assets/chapter03-3d/voice/ch03/conductor/CH03_CONDUCTOR_0006.ogg?url';
import conductorVoice07 from '../../../public/assets/chapter03-3d/voice/ch03/conductor/CH03_CONDUCTOR_0007.ogg?url';
import conductorVoice08 from '../../../public/assets/chapter03-3d/voice/ch03/conductor/CH03_CONDUCTOR_0008.ogg?url';
import butchVoice41 from '../../../public/assets/chapter03-3d/voice/ch03/butch/CH03_BUTCH_0041.ogg?url';
import butchVoice57 from '../../../public/assets/chapter03-3d/voice/ch03/butch/CH03_BUTCH_0057.ogg?url';
import butchVoice103 from '../../../public/assets/chapter03-3d/voice/ch03/butch/CH03_BUTCH_0103.ogg?url';
import butchVoice106 from '../../../public/assets/chapter03-3d/voice/ch03/butch/CH03_BUTCH_0106.ogg?url';
import butchVoice118 from '../../../public/assets/chapter03-3d/voice/ch03/butch/CH03_BUTCH_0118.ogg?url';
import butchVoice150 from '../../../public/assets/chapter03-3d/voice/ch03/butch/CH03_BUTCH_0150.ogg?url';
import butchVoice168 from '../../../public/assets/chapter03-3d/voice/ch03/butch/CH03_BUTCH_0168.ogg?url';
import butchVoice218 from '../../../public/assets/chapter03-3d/voice/ch03/butch/CH03_BUTCH_0218.ogg?url';
import butchVoice244 from '../../../public/assets/chapter03-3d/voice/ch03/butch/CH03_BUTCH_0244.ogg?url';
import { music } from '../../shared/musicDirector.js';
import { audioFocus } from '../../shared/audioFocus.js';

const poetryVoiceUrls = import.meta.glob('./assets/voice/poetry/*.mp3', { eager: true, query: '?url', import: 'default' });
const poetryVoice = (id) => poetryVoiceUrls[`./assets/voice/poetry/${id}.mp3`] || null;
import { CINEMATICS, playCinematic } from '../../shell/gameFlow.js';
import { showEndCredits } from '../../shell/endCredits.js';
import { installPauseMenu } from '../../shell/pauseMenu.js';
import { createSaveStore } from '../../shell/saveSystem.js';
import { devParam } from '../../devMode.js';

const PINK = 0xff176f;
const CYAN = 0x43e9ff;
const AMBER = 0xf2a541;
const PAPER = 0xeee7d8;
const ARENA = { minX: -13.2, maxX: 13.2, minZ: -7.35, maxZ: 8.2 };
const CONDUCTOR_Z = -15.8;
const CH1_COUNTER_EVERY = 3;
const NIGHT_MEMORY_DAMAGE = 18;
const CYBER_LADDER_DAMAGE = 30;
// Movement IV now pressures movement with falling solid grids, so each returned
// pigment takes a little longer to finish the Conductor.
const PAINT_DAMAGE = 13;
const PHASE_START_HP = [400, 300, 200, 100];
const CONDUCTOR_TEST_MOVEMENTS = Object.freeze({
  'conductor-1': 0,
  'conductor-2': 1,
  'conductor-3': 2,
  'conductor-4': 3,
});

function requestedConductorTestMovement() {
  const movement = CONDUCTOR_TEST_MOVEMENTS[devParam('qa')];
  return Number.isInteger(movement) ? movement : null;
}
const CH1_TRAIN_PATTERNS = [
  { id: 'horizontal-single', paths: [{ direction: [1, 0], lane: -0.8 }] },
  { id: 'diagonal-pair', paths: [{ direction: [1, 0.56], lane: -3.7 }, { direction: [-1, 0.56], lane: 3.7, delay: 0.14 }] },
  { id: 'vertical-pair', paths: [{ direction: [0, 1], lane: -5.2 }, { direction: [0, -1], lane: 5.2, delay: 0.12 }] },
  { id: 'horizontal-double', paths: [{ direction: [1, 0], lane: -3.6 }, { direction: [-1, 0], lane: 3.6, delay: 0.12 }] },
  { id: 'diagonal-cross', paths: [{ direction: [1, 0.48], lane: -4.4 }, { direction: [-1, 0.48], lane: 4.4 }, { direction: [1, -0.4], lane: 0, delay: 0.22 }] },
  { id: 'horizontal-triple', paths: [{ direction: [1, 0], lane: -4.8 }, { direction: [-1, 0], lane: 0, delay: 0.14 }, { direction: [1, 0], lane: 4.8, delay: 0.28 }] },
  { id: 'diagonal-four', paths: [{ direction: [1, 0.58], lane: -5.6 }, { direction: [-1, 0.58], lane: 5.6, delay: 0.1 }, { direction: [1, -0.46], lane: -1.4, delay: 0.22 }, { direction: [-1, -0.46], lane: 1.4, delay: 0.34 }] },
  { id: 'all-directions-five', paths: [{ direction: [1, 0], lane: -4.9 }, { direction: [-1, 0], lane: 4.9, delay: 0.1 }, { direction: [0, 1], lane: -6.1, delay: 0.2 }, { direction: [1, 0.52], lane: -1.5, delay: 0.3 }, { direction: [-1, 0.52], lane: 1.5, delay: 0.4 }] },
];
const CH1_ESCALATION = [0, 1, 4, 6, 7];
const CYBER_DROP_SLOTS = [
  [-10.5, -5.7], [-5.6, -5.1], [0.1, -5.9], [5.8, -5.0], [10.6, -5.8],
  [-8.2, -1.9], [-2.7, -2.1], [3.2, -1.5], [8.5, -2.2],
  [-11.1, 2.1], [-5.5, 2.8], [0.4, 2.0], [6.1, 2.9], [11, 1.8],
  [-8.6, 6], [-2.8, 5.5], [3.5, 6.2], [9.2, 5.4],
];
// Each Boss world gets its own movement. Echo City deliberately opens into the
// Every movement is intentionally looped. Echo City begins ten seconds into
// Dvořák's fourth movement so its famous Allegro con fuoco arrival meets the
// player as the city opens, rather than making the fight wait through a prelude.
const BOSS_SCORE = {
  echoCity: { id: 'echo-city-new-world-fire', src: echoCityMusicUrl, volume: 0.52, fade: 2.4, outFade: 2.2, dialogueDuckDb: -10, loop: true },
  allLines: { id: 'mussorgsky-kiev-gate', src: allLinesMusicUrl, volume: 0.54, fade: 1.65, outFade: 3.8, loop: true },
  departure: { id: 'departure', src: departureMusicUrl, volume: 0.54, fade: 3.2, outFade: 5.5, loop: true },
};
// The false-boss run keeps the Museum collapse momentum through its first two
// movements. Movement III immediately changes to its authored Dvořák cue.
BOSS_SCORE.falseBossVerdi = {
  id: 'false-boss-verdi-dies-irae', src: verdiDiesIraeUrl, volume: 0.42,
  fade: 0.9, outFade: 1.8, loop: false, dialogueDuckDb: -9,
  then: 'false-boss-after-verdi', thenOptions: { ...BOSS_SCORE.echoCity, id: 'false-boss-after-verdi' },
};
const PHASES = [
  { id: 'night', title: 'I · NIGHT SERVICE', world: 'THROWN DEPARTURES', form: 'PASSENGER', color: AMBER, music: BOSS_SCORE.falseBossVerdi, verb: 'SPACE' },
  { id: 'borrowed', title: 'II · BORROWED GRID', world: 'CUT THE CURRENT', form: 'RUNNER', color: CYAN, music: BOSS_SCORE.falseBossVerdi, verb: 'SPACE' },
  { id: 'echo', title: 'III · ECHO CITY', world: 'WORDS LEAVE MARKS', form: 'BUTCH', color: CYAN, music: BOSS_SCORE.echoCity, verb: 'SPACE' },
  { id: 'painted', title: 'IV · PAINTED COUNTRY', world: 'TAKE BACK THE COLOR', form: 'INK FIGURE', color: 0xff806f, music: BOSS_SCORE.allLines, verb: 'SPACE' },
];

const voiceCue = (speaker, text, url, tone) => ({ speaker, text, url, tone });
const ECHO_EXCHANGES = [
  {
    claim: voiceCue('CONDUCTOR', 'NOT IN MY CARRIAGE. STATION STAFF KEEP THEIR OWN RECORDS.', conductorVoice02, 'cold-deflection'),
    replies: [
      { cue: voiceCue('BUTCH', 'YOU ALTERED THE RECORD.', butchVoice41, 'controlled-anger'), correct: true, damage: 24, reaction: 'shame' },
      { cue: voiceCue('BUTCH', 'WHY DIDN’T YOU STOP HER?', butchVoice57, 'hurt-accusation'), rebut: voiceCue('CONDUCTOR', 'PEOPLE WAIT HERE EVERY DAY. SHE LEFT WHEN THE REPLACEMENT SERVICE ARRIVED.', conductorVoice06, 'defensive-rebuke') },
      { cue: voiceCue('BUTCH', 'THE RAILS DISAPPEAR EAST INTO THE DARK.', butchVoice244, 'grief'), rebut: voiceCue('CONDUCTOR', 'EASTBOUND. THAT IS ALL I CAN SAY.', conductorVoice07, 'dismissive') },
    ],
  },
  {
    claim: voiceCue('CONDUCTOR', 'A LATE MUNICIPAL CLEARANCE. I CAN GIVE YOU THE LEDGER, NOT A STORY.', conductorVoice05, 'restrained-defiance'),
    replies: [
      { cue: voiceCue('BUTCH', 'THAT STILL PROTECTED MARA.', butchVoice106, 'pained-certainty'), rebut: voiceCue('CONDUCTOR', 'OFFICIAL INQUIRY? THEN MAKE IT BRIEF.', conductorVoice08, 'hostile-dismissal') },
      { cue: voiceCue('BUTCH', 'YOU KEPT A DEAD MUNICIPAL CODE ALIVE AS AN ANONYMOUS ACCOUNT.', butchVoice103, 'prosecutorial-anger'), correct: true, damage: 24, reaction: 'rage' },
      { cue: voiceCue('BUTCH', 'THE EASTBOUND SERVICE WAS RESTORED BY HAND.', butchVoice218, 'measured'), rebut: voiceCue('CONDUCTOR', 'THE CARRIAGE LEDGER IS NOT A STORY.', conductorVoice05, 'defensive-rebuke') },
    ],
  },
  {
    claim: voiceCue('CONDUCTOR', 'PEOPLE WAIT HERE EVERY DAY. ONE WOMAN LOOKED EAST, THEN LEFT.', conductorVoice06, 'forced-calm'),
    replies: [
      { cue: voiceCue('BUTCH', 'IT ALSO CANNOT BE RULED OUT FOREVER.', butchVoice168, 'uncertain-grief'), rebut: voiceCue('CONDUCTOR', 'EASTBOUND. THAT IS ALL I CAN SAY.', conductorVoice07, 'dismissive') },
      { cue: voiceCue('BUTCH', 'I NEED TO KNOW WHY SHE LEFT.', butchVoice150, 'open-grief'), rebut: voiceCue('CONDUCTOR', 'NOT IN MY CARRIAGE.', conductorVoice02, 'cold-refusal') },
      { cue: voiceCue('BUTCH', 'THEN MARA WAS THE ONLY PERSON WHO KNEW THE WHOLE ROUTE.', butchVoice118, 'grief-into-certainty'), correct: true, damage: 24, reaction: 'shame' },
    ],
  },
];
// Authored Movement III: a staged Shakespeare verse duel. This replaces the
// older Conductor argument loop while retaining its pause, damage and reaction
// plumbing.
const ECHO_POETRY_QUESTIONS = [
  ['twelfth-music', 0, 'TWELFTH NIGHT · 1.1', 'IF MUSIC BE THE FOOD OF LOVE—', ['PLAY ON.', 'THE CLOCK FORGETS ITS HOUR.', 'AND ALL THE LIGHTS GO OUT.'], 0],
  ['hamlet-being', 0, 'HAMLET · 3.1', 'TO BE, OR NOT TO BE—', ['THE STAGE IS SET.', 'THAT IS THE QUESTION.', 'THE NIGHT IS YOUNG.'], 1],
  ['summer-day', 0, 'SONNET 18', 'SHALL I COMPARE THEE TO A SUMMER’S DAY?', ['TIME CLOSES EVERY DOOR.', 'THE WINTER ANSWERS NO.', 'THOU ART MORE LOVELY AND MORE TEMPERATE.'], 2],
  ['world-stage', 0, 'AS YOU LIKE IT · 2.7', 'ALL THE WORLD’S A STAGE—', ['AND ALL THE MEN AND WOMEN MERELY PLAYERS.', 'WHILE SILENCE WAITS BEHIND THE CURTAIN.', 'AND MORNING SWALLOWS EVERY NAME.'], 0],
  ['rose-name', 0, 'ROMEO AND JULIET · 2.2', 'WHAT’S IN A NAME?', ['A SHADOW WRITTEN ON THE WALL.', 'THAT WHICH WE CALL A ROSE, BY ANY OTHER WORD WOULD SMELL AS SWEET.', 'THE SUM OF EVERY DEED.'], 1],
  ['true-love', 1, 'A MIDSUMMER NIGHT’S DREAM · 1.1', 'THE COURSE OF TRUE LOVE—', ['RUNS SWIFTER THAN THE TIDE.', 'IS CROWNED BEFORE THE DAWN.', 'NEVER DID RUN SMOOTH.'], 2],
  ['dream-stuff', 1, 'THE TEMPEST · 4.1', 'WE ARE SUCH STUFF—', ['AS DREAMS ARE MADE ON.', 'AS MEMORY FORGETS AT DAWN.', 'AS TIME WILL TURN TO DUST.'], 0],
  ['self-true', 1, 'HAMLET · 1.3', 'THIS ABOVE ALL—', ['LET NOTHING PASS UNSEEN.', 'TO THINE OWN SELF BE TRUE.', 'KEEP FAITH WITH DARKEST NIGHT.'], 1],
  ['greatness', 1, 'TWELFTH NIGHT · 2.5', 'SOME ARE BORN GREAT—', ['SOME ARE LOST BEFORE THEIR HOUR.', 'SOME WAKE TO FIND THE CROWN.', 'SOME ACHIEVE GREATNESS, AND SOME HAVE GREATNESS THRUST UPON ’EM.'], 2],
  ['cowards', 1, 'JULIUS CAESAR · 2.2', 'COWARDS DIE MANY TIMES BEFORE THEIR DEATHS—', ['THE VALIANT NEVER TASTE OF DEATH BUT ONCE.', 'THE BRAVE OUTLIVE THE MEMORY OF FEAR.', 'THE FAITHFUL MEET THE DARKNESS FACE TO FACE.'], 0],
  ['mercy', 2, 'THE MERCHANT OF VENICE · 4.1', 'THE QUALITY OF MERCY IS NOT STRAINED—', ['IT FALLS UNSEEN ON KING AND CLOWN.', 'IT DROPPETH AS THE GENTLE RAIN FROM HEAVEN.', 'IT MOVES LIKE MUSIC THROUGH THE AIR.'], 1],
  ['disgrace', 2, 'SONNET 29', 'WHEN, IN DISGRACE WITH FORTUNE AND MEN’S EYES—', ['I SUMMON UP REMEMBRANCE OF THINGS PAST.', 'I TURN MY THOUGHTS TO SUMMERS LONG SINCE DEAD.', 'I ALL ALONE BEWEEP MY OUTCAST STATE.'], 2],
  ['true-minds', 2, 'SONNET 116', 'LET ME NOT TO THE MARRIAGE OF TRUE MINDS—', ['ADMIT IMPEDIMENTS.', 'CONFESS THE ALTERATION TIME COMMANDS.', 'ALLOW FALSE WITNESS TO DIVIDE.'], 0],
  ['full-fathom', 2, 'THE TEMPEST · 1.2', 'FULL FATHOM FIVE THY FATHER LIES—', ['HIS VOICE IS BURIED IN THE FOAM.', 'OF HIS BONES ARE CORAL MADE.', 'THE TIDE HAS SEALED HIS EYES WITH PEARL.'], 1],
  ['waves', 2, 'SONNET 60', 'LIKE AS THE WAVES MAKE TOWARDS THE PEBBLED SHORE—', ['SO FALL OUR NAMES BEYOND THE REACH OF TIME.', 'SO BREAK OUR HOURS AGAINST THE STONES OF NIGHT.', 'SO DO OUR MINUTES HASTEN TO THEIR END.'], 2],
].map(([id, tier, source, prompt, choices, correct]) => ({ id, tier, source, prompt, choices, correct }));
// Echo City begins at 200 HP. Four correct verses at 25 each carry it, and
// only it, across the 100-HP threshold into Movement IV.
const ECHO_POETRY_DAMAGE = 25;
const ECHO_COMBAT_INTERVAL = 10;
const PAINT_HOLD_SECONDS = 0.68;
const CAPTCHA_IMAGE_SETS = [[
  { src: captchaTrain01Url, train: true, label: 'steam locomotive' },
  { src: captchaDog01Url, train: false, label: 'dog' },
  { src: captchaTrain02Url, train: true, label: 'train in countryside' },
  { src: captchaDog02Url, train: false, label: 'dog portrait' },
  { src: captchaTrain03Url, train: true, label: 'train in forest' },
  { src: captchaBusBikeUrl, train: false, label: 'bus and bicycle' },
  { src: captchaDog03Url, train: false, label: 'dog running' },
  { src: captchaTrain04Url, train: true, label: 'train on bridge' },
  { src: captchaDog04Url, train: false, label: 'dog portrait' },
], [
  { src: captchaCat01Url, train: false, label: 'cat' },
  { src: captchaTrain05Url, train: true, label: 'electric passenger train' },
  { src: captchaPlane01Url, train: false, label: 'airplane' },
  { src: captchaTrain06Url, train: true, label: 'desert locomotive' },
  { src: captchaCat02Url, train: false, label: 'cat portrait' },
  { src: captchaTrain07Url, train: true, label: 'electric locomotive' },
  { src: captchaPlane02Url, train: false, label: 'airplane in sky' },
  { src: captchaCat03Url, train: false, label: 'cat portrait' },
  { src: captchaTrain08Url, train: true, label: 'freight locomotive' },
]];
const DIFFICULTY = {
  low: { layers: 6, telegraph: 1.35, beat: 3.05, projectile: 5.3, overlap: 1, bossWindow: 1.5, speedScale: 0.9, respawnInv: 3 },
  casual: { layers: 4, telegraph: 0.88, beat: 2.2, projectile: 6.8, overlap: 2, bossWindow: 1.08, speedScale: 0.94, respawnInv: 2.6 },
  hard: { layers: 3, telegraph: 0.58, beat: 1.62, projectile: 8.3, overlap: 3, bossWindow: 0.88, speedScale: 1, respawnInv: 2.2 },
};

let difficulty = 'casual';
let shakeEnabled = true;
let flashEnabled = false;
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

function paperMaterial(color, map = null, emissive = 0x000000) {
  return new THREE.MeshStandardMaterial({ color, map, emissive, emissiveIntensity: 0.12, roughness: 0.96, metalness: 0, side: THREE.DoubleSide });
}

class PaperActor {
  constructor(loader, definitions) {
    this.root = new THREE.Group();
    this.root.userData.kind = 'chapter-paper-actor';
    this.time = 0;
    this.action = 'idle';
    this.phase = 0;
    this.form = PHASES[0].form;
    this.accent = PHASES[0].color;
    this.cards = definitions.map((definition) => {
      const group = new THREE.Group();
      const maps = Object.fromEntries(Object.entries(definition.frames).map(([key, url]) => {
        const map = loader.load(url);
        map.colorSpace = THREE.SRGBColorSpace;
        map.magFilter = THREE.NearestFilter;
        return [key, map];
      }));
      const geometry = new THREE.PlaneGeometry(definition.width, definition.height);
      const edge = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0x08090a, map: maps.idle, alphaMap: maps.idle, alphaTest: 0.08, transparent: true, side: THREE.DoubleSide }));
      edge.scale.set(1.1, 1.07, 1);
      edge.position.z = -0.055;
      const face = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0xffffff, map: maps.idle, alphaTest: 0.08, transparent: true, roughness: 0.95, metalness: 0, side: THREE.DoubleSide }));
      face.position.z = 0.025;
      face.castShadow = true;
      group.add(edge, face);
      group.position.y = definition.height * 0.5;
      group.visible = false;
      this.root.add(group);
      return { group, face, edge, maps, definition };
    });
    this.setForm(0, true);
  }

  setForm(phase, immediate = false) {
    this.phase = phase;
    this.form = PHASES[phase].form;
    this.accent = PHASES[phase].color;
    this.cards.forEach((card, index) => { card.group.visible = index === phase && phase !== 2; });
    if (immediate) {
      this.transformTimer = 0;
      if (phase !== 2) {
        const card = this.cards[phase];
        card.group.scale.set(1, 1, 1);
        card.group.rotation.set(0, 0, 0);
        card.group.position.y = card.definition.height * 0.5;
      }
    } else if (phase !== 2) {
      const card = this.cards[phase];
      card.group.scale.set(0.03, 1.3, 1);
      card.group.rotation.y = Math.PI * 0.5;
      this.transformTimer = 0.68;
    }
  }

  update(dt, moving, grounded, attacking, hurt, facingX) {
    this.time += dt;
    this.action = hurt ? 'hurt' : attacking ? 'attack' : !grounded ? 'jump' : moving ? 'run' : 'idle';
    if (this.phase === 2) return;
    const card = this.cards[this.phase];
    const walkFrames = ['walk0', 'walk1', 'walk2', 'walk3'].filter((key) => card.maps[key]);
    const frame = !grounded
      ? 'jump'
      : moving && walkFrames.length
        ? walkFrames[Math.floor(this.time * 9) % walkFrames.length]
        : 'idle';
    const map = card.maps[frame] || card.maps.idle;
    card.face.material.map = map;
    card.edge.material.map = map;
    card.edge.material.alphaMap = map;
    const flip = facingX < -0.1 ? -1 : 1;
    if (this.transformTimer > 0) {
      this.transformTimer -= dt;
      const t = 1 - Math.max(0, this.transformTimer) / 0.68;
      const open = THREE.MathUtils.smootherstep(t, 0, 1);
      card.group.rotation.y = (1 - open) * Math.PI * 0.5;
      card.group.scale.set(Math.max(0.03, open) * flip, 1 + Math.sin(t * Math.PI) * 0.18, 1);
    } else {
      card.group.scale.x = flip;
      card.group.scale.y = grounded ? 1 + Math.abs(Math.sin(this.time * 11)) * (moving ? 0.045 : 0.012) : 0.92;
      card.group.rotation.y = attacking ? Math.sin(this.time * 34) * 0.34 : 0;
      card.group.rotation.z = hurt ? Math.sin(this.time * 48) * 0.16 : attacking ? -0.34 : moving ? Math.sin(this.time * 11) * 0.035 : 0;
      card.group.position.y = card.definition.height * 0.5 + (moving && grounded ? Math.abs(Math.sin(this.time * 11)) * 0.12 : 0);
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

function makeGridFloor() {
  return new THREE.Mesh(
    new THREE.PlaneGeometry(32, 18),
    new THREE.ShaderMaterial({
      transparent: false,
      side: THREE.DoubleSide,
      vertexShader: 'varying vec3 vWorld; void main(){vec4 w=modelMatrix*vec4(position,1.);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
      fragmentShader: `varying vec3 vWorld; void main(){
        vec2 g=abs(fract(vWorld.xz)-.5)/fwidth(vWorld.xz);float thin=1.-min(min(g.x,g.y),1.);
        vec2 m=abs(fract(vWorld.xz*.2)-.5)/fwidth(vWorld.xz*.2);float major=1.-min(min(m.x,m.y),1.);
        float glow=thin*.22+major*.36;gl_FragColor=vec4(vec3(.005,.008,.011)+vec3(.03,.21,.29)*glow,1.);
      }`,
    }),
  );
}

function makePortalDisc() {
  const root = new THREE.Group();
  const voidDisc = new THREE.Mesh(new THREE.CircleGeometry(1, 96), new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide }));
  voidDisc.rotation.x = -Math.PI / 2;
  voidDisc.position.y = 0.08;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.045, 10, 96), new THREE.MeshBasicMaterial({ color: CYAN }));
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
  const shape = new THREE.Shape(points);
  const pit = new THREE.Mesh(
    new THREE.ShapeGeometry(shape),
    new THREE.MeshStandardMaterial({ color: 0x16191b, roughness: 1, metalness: 0, side: THREE.DoubleSide }),
  );
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

function makePaperCard(loader, url, width, height, { alpha = false, nearest = false } = {}) {
  const map = loader.load(url);
  map.colorSpace = THREE.SRGBColorSpace;
  if (nearest) map.magFilter = THREE.NearestFilter;
  const root = new THREE.Group();
  const geometry = new THREE.PlaneGeometry(width, height);
  const back = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
    color: 0x171512,
    map: alpha ? map : null,
    alphaMap: alpha ? map : null,
    alphaTest: alpha ? 0.08 : 0,
    transparent: alpha,
    roughness: 1,
    side: THREE.DoubleSide,
  }));
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

class SpectacleBattle {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x010204);
    this.scene.fog = new THREE.FogExp2(0x02050a, 0.018);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);
    this.camera = new THREE.PerspectiveCamera(47, container.clientWidth / container.clientHeight, 0.1, 140);
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
    this.voiceAudio = typeof Audio === 'undefined' ? null : new Audio();
    if (this.voiceAudio) { this.voiceAudio.preload = 'auto'; this.voiceAudio.playsInline = true; this.voiceAudio.volume = 0.9; }
    this.voiceState = { playing: false, speaker: null, tone: null, text: null };
    this.echoOutcome = null;
    this.echoQuiz = { attempts: 0, correct: 0, used: new Set(), current: null };
    this.echoRecital = { active: false, countdownShown: null };
    this.echoCombatClock = ECHO_COMBAT_INTERVAL;
    this.falseBossScoreStarted = false;
    this.falseBossScoreLocked = false;
    this.paintTutorial = { stage: 'pending' };
    this.paintHold = { active: false, button: -1, elapsed: 0, point: null, target: null, completed: false };
    this.butchActionState = 'idle';
    this.butchLandTimer = 0;
    this.raycaster = new THREE.Raycaster();
    this.pointerNdc = new THREE.Vector2();
    this.buildLights();
    this.buildWorlds();
    this.buildActors();
    this.buildHud();
    this.bindEvents();
    this.assetsPromise = this.loadAssets();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  buildLights() {
    this.hemi = new THREE.HemisphereLight(0x8fb9cc, 0x08070a, 2.5);
    this.redWash = new THREE.HemisphereLight(0x5a0010, 0x100006, 0.9);
    this.key = new THREE.DirectionalLight(0xd5efff, 4.1);
    this.key.position.set(-7, 16, 10);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    Object.assign(this.key.shadow.camera, { left: -18, right: 18, top: 16, bottom: -16 });
    this.rim = new THREE.PointLight(PINK, 42, 28, 2);
    this.rim.position.set(0, 6, -7);
    this.redCeilingLights = new THREE.Group();
    [-7.2, 0, 7.2].forEach((x) => {
      const housing = new THREE.Mesh(
        new THREE.BoxGeometry(2.25, 0.16, 0.72),
        new THREE.MeshStandardMaterial({ color: 0x2a0709, emissive: 0xff071b, emissiveIntensity: 6.2 }),
      );
      // Keep the fixture above the camera frame. These wide, dim beams overlap
      // with the red ambient wash so the arena reads as blood-red, not as three
      // bright circles on an otherwise dark floor.
      housing.position.set(x, 16.4, -1.8);
      const glow = new THREE.SpotLight(0xff0017, 90, 28, 0.58, 0.5, 2);
      glow.position.set(x, 16.1, -1.35);
      glow.target.position.set(x, 0, -1.35);
      this.redCeilingLights.add(housing, glow, glow.target);
    });
    this.scene.add(this.hemi, this.redWash, this.key, this.rim, this.redCeilingLights);
  }

  buildWorlds() {
    const texture = (url) => {
      const map = this.textureLoader.load(url);
      map.colorSpace = THREE.SRGBColorSpace;
      map.wrapS = map.wrapT = THREE.RepeatWrapping;
      return map;
    };
    this.paperTexture = texture(paperTextureUrl);

    const night = new THREE.Group();
    const nightFloor = makeFloor(0x9c532d, 0.84);
    nightFloor.material.map = this.paperTexture;
    night.add(nightFloor);
    this.worldRoots.push(night);

    const borrowed = new THREE.Group();
    const borrowedFloor = makeFloor(0x101820, 0.76);
    borrowedFloor.material.metalness = 0.36;
    borrowed.add(borrowedFloor);
    const grid = new THREE.GridHelper(32, 24, 0x36d9dd, 0x143b48); grid.position.y = 0.035; borrowed.add(grid);
    this.worldRoots.push(borrowed);

    const echo = new THREE.Group();
    const cobbles = makeFloor(0x25292d, 0.98);
    echo.add(cobbles);
    this.worldRoots.push(echo);

    const painted = new THREE.Group();
    this.paperTexture.repeat.set(4, 3);
    const paperFloor = new THREE.Mesh(new THREE.PlaneGeometry(32, 18, 12, 8), paperMaterial(0xd8cbb3, this.paperTexture));
    paperFloor.rotation.x = -Math.PI / 2; paperFloor.position.z = 1; paperFloor.receiveShadow = true; painted.add(paperFloor);
    this.worldRoots.push(painted);
    this.worldRoots.forEach((root, index) => { root.visible = index === 0; this.scene.add(root); });

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
  }

  buildActors() {
    this.puppet = new PaperActor(this.textureLoader, [
      { width: 1.65, height: 2.38, frames: { idle: ch1IdleUrl, walk0: ch1Walk0Url, walk1: ch1Walk1Url, jump: ch1JumpUrl } },
      { width: 1.42, height: 2.4, frames: { idle: ch2PlayerUrl, walk0: ch2PlayerUrl, walk1: ch2PlayerUrl, jump: ch2PlayerUrl } },
      { width: 1, height: 1, frames: { idle: ch1IdleUrl } },
      { width: 1.5, height: 2.5, frames: { idle: ch4ButchIdleUrl, walk0: ch4ButchIdleUrl, walk1: ch4ButchWalk1Url, walk2: ch4ButchWalk2Url, walk3: ch4ButchWalk3Url, jump: ch4ButchWalk1Url } },
    ]);
    this.playerRoot = new THREE.Group();
    this.playerRoot.add(this.puppet.root);
    this.playerRoot.position.set(0, 0, 6.1);
    this.scene.add(this.playerRoot);
    this.butchRoot = new THREE.Group();
    this.butchRoot.visible = false;
    this.playerRoot.add(this.butchRoot);
    this.respawnAura = new THREE.Mesh(
      new THREE.RingGeometry(0.72, 0.9, 48),
      new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
    );
    this.respawnAura.rotation.x = -Math.PI / 2;
    this.respawnAura.position.y = 0.08;
    this.respawnAura.visible = false;
    this.playerRoot.add(this.respawnAura);
    this.respawnShield = new THREE.Mesh(
      new THREE.SphereGeometry(1.18, 24, 16),
      new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0, wireframe: true, depthWrite: false }),
    );
    this.respawnShield.position.y = 1.15;
    this.respawnShield.visible = false;
    this.playerRoot.add(this.respawnShield);
    this.conductorRoot = new THREE.Group();
    this.conductorFallback = new THREE.Group();
    const coat = new THREE.Mesh(new THREE.ConeGeometry(0.82, 2.8, 8), new THREE.MeshStandardMaterial({ color: 0x15181c, roughness: 0.82 }));
    coat.position.y = 1.4;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 14), new THREE.MeshStandardMaterial({ color: 0xb58a6d, roughness: 0.75 }));
    head.position.y = 3.08;
    const baton = flatBox(0.09, 2.1, 0.09, new THREE.MeshStandardMaterial({ color: AMBER, emissive: AMBER, emissiveIntensity: 1.4 }));
    baton.position.set(0.82, 2.35, 0); baton.rotation.z = -0.48;
    this.conductorFallback.add(coat, head, baton);
    this.conductorRoot.add(this.conductorFallback);
    this.conductorPaper = new PaperActor(this.textureLoader, [
      { width: 2.58, height: 3.8, frames: { idle: ch1ConductorUrl } },
      { width: 1.84, height: 3.8, frames: { idle: ch2ConductorUrl } },
      { width: 1, height: 1, frames: { idle: ch1ConductorUrl } },
      { width: 1.75, height: 3.8, frames: { idle: ch4ConductorUrl } },
    ]);
    this.conductorRoot.add(this.conductorPaper.root);
    this.paintFillUniform = { value: 0 };
    const paintedConductorFace = this.conductorPaper.cards[3].face;
    paintedConductorFace.material.onBeforeCompile = (shader) => {
      shader.uniforms.uPaintCoverage = this.paintFillUniform;
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uPaintCoverage;');
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        float paintEdge = 1.0 - smoothstep(uPaintCoverage - 0.025, uPaintCoverage + 0.055, vMapUv.y);
        vec3 paintA = vec3(0.263, 0.365, 0.569);
        vec3 paintB = vec3(0.310, 0.561, 0.486);
        vec3 paintC = vec3(1.000, 0.502, 0.435);
        float band = fract(vMapUv.x * 2.7 + vMapUv.y * 1.35);
        vec3 paintColor = band < 0.34 ? paintA : band < 0.67 ? paintB : paintC;
        diffuseColor.rgb = mix(diffuseColor.rgb, paintColor, paintEdge * 0.82);`,
      );
    };
    paintedConductorFace.material.customProgramCacheKey = () => 'paint-creep-v1';
    this.conductorRoot.position.set(0, -2.8, CONDUCTOR_Z);
    this.conductorRoot.scale.setScalar(5);
    this.scene.add(this.conductorRoot);
    this.setConductorWorld(0, true);
    const bossAura = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.4, 64), new THREE.MeshBasicMaterial({ color: AMBER, transparent: true, opacity: 0, side: THREE.DoubleSide }));
    bossAura.rotation.x = -Math.PI / 2; bossAura.position.y = 0.04; this.conductorRoot.add(bossAura); this.bossAura = bossAura;
    this.paintCreep = new THREE.Group();
    const creepColors = [0x202126, 0x435d91, 0x4f8f7c, 0xff806f, 0xf2a541, 0x43e9ff];
    for (let i = 0; i < 14; i += 1) {
      const strip = new THREE.Mesh(
        new THREE.PlaneGeometry(0.24 + (i % 3) * 0.06, 0.34 + (i % 4) * 0.08),
        new THREE.MeshBasicMaterial({ color: creepColors[i % creepColors.length], transparent: true, opacity: 0.88, side: THREE.DoubleSide, depthWrite: false }),
      );
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
    this.player = { x: 0, y: 0, z: 6.1, vy: 0, grounded: true, hp: 4, maxHp: 4, inv: 0, respawnInv: 0, respawns: 0, phaseHeals: 0, hitTimer: 0, dash: 0, dashCd: 0, attack: 0, attackCd: 0, combo: 0, facingX: 0, facingZ: -1, ammo: 0, ladder: false, color: 0 };
    this.boss = { x: 0, z: CONDUCTOR_Z, hp: 400, maxHp: 400, phaseStartHp: 400, paintCoverage: 0, inv: 0, exposed: 0, attackClock: 1.4, stagger: 0, gesture: 'idle', gestureTime: 0, reaction: 'idle', flash: 0, rounds: 0, phaseRound: 0 };
    this.suitcase = null;
    this.ladderWeapon = makePaperCard(this.textureLoader, ch2LadderUrl, 1.25, 4, { alpha: true, nearest: true });
    this.ladderWeapon.visible = false;
    this.scene.add(this.ladderWeapon);
    this.departureTrain = new THREE.Group();
    const paperPlane = (width, height, color, x, y, z = 0.08) => {
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), paperMaterial(color, this.paperTexture));
      plane.position.set(x, y, z);
      return plane;
    };
    // A graphite drawing on a paper card: deliberately monochrome, with loose pencil marks.
    const outline = paperPlane(13.2, 3.2, 0x242528, 0, 2.08, -0.05);
    const body = paperPlane(12.9, 2.86, 0xd9d7cf, 0, 2.1);
    const roof = paperPlane(13.35, 0.42, 0x383a3d, 0, 3.72, 0.12);
    const lowerBand = paperPlane(12.95, 0.38, 0x777875, 0, 1.03, 0.13);
    const frontCap = paperPlane(0.72, 2.58, 0xb9b8b1, 6.13, 2.08, 0.14);
    const rearCap = paperPlane(0.72, 2.58, 0xb9b8b1, -6.13, 2.08, 0.14);
    const windows = [-4.9, -3.35, -1.8, -0.25, 1.3, 2.85, 4.4].map((x) => paperPlane(1.12, 0.72, 0x525458, x, 2.48, 0.16));
    const wheels = [-4.45, -1.48, 1.48, 4.45].map((x) => {
      const wheel = new THREE.Mesh(new THREE.CircleGeometry(0.43, 16), paperMaterial(0x292b2d, this.paperTexture));
      wheel.position.set(x, 0.54, 0.18);
      return wheel;
    });
    const paperSeams = [-5.55, -2.58, 0.4, 3.38].map((x) => paperPlane(0.07, 2.35, 0x353638, x, 2.05, 0.19));
    const sketchStrokes = [
      [-5.65, 3.13, 0.95, 0.03], [-4.43, 1.48, 1.28, -0.025], [-3.76, 3.36, 0.72, 0.02],
      [-2.18, 1.34, 1.55, 0.018], [-0.98, 3.2, 1.22, -0.03], [0.42, 1.52, 1.68, 0.024],
      [2.36, 3.31, 1.12, -0.02], [3.48, 1.36, 1.44, 0.028], [5.02, 3.1, 0.78, -0.025],
    ].map(([x, y, width, rotation]) => {
      const stroke = paperPlane(width, 0.035, 0x444548, x, y, 0.21);
      stroke.material.transparent = true;
      stroke.material.opacity = 0.52;
      stroke.rotation.z = rotation;
      return stroke;
    });
    this.departureTrain.add(outline, body, roof, lowerBand, frontCap, rearCap, ...windows, ...wheels, ...paperSeams, ...sketchStrokes);
    this.departureTrain.visible = false;
    this.scene.add(this.departureTrain);
  }

  buildHud() {
    this.hud = document.createElement('div');
    this.hud.className = 'battle-hud spectacle-hud hidden';
    this.hud.innerHTML = `
      <div class="boss-hud"><div class="boss-copy"><b>THE CONDUCTOR</b><span id="boss-state">MOVEMENT I</span></div><div class="boss-track"><i id="boss-delay"></i><b id="boss-fill"></b><span></span><span></span><span></span></div></div>
      <div class="act-copy"><b id="phase-label"></b><span id="world-label"></span></div>
      <div id="command-label" class="command-label"></div>
      <div id="tutorial-hint" class="tutorial-hint"></div>
      <div id="dialogue-choices" class="dialogue-choices hidden"></div>
      <div id="rescue-prompt" class="rescue-prompt hidden">SPACE · JUMP ABOARD THE SKETCH TRAIN</div>
      <div class="player-hud"><span id="form-label">GRAPHITE FORM</span><div id="paper-health" class="paper-health"></div><small id="ability-label">SPACE · SHIFT DASH</small></div>
      <div id="boss-hit" class="boss-hit">EXPOSED</div>
      <div id="transition-title" class="transition-title"><small>THE FLOOR CANNOT HOLD</small><b></b><span></span></div>
      <div id="system-gate" class="system-gate hidden"></div>`;
    this.container.appendChild(this.hud);
    this.bossFill = this.hud.querySelector('#boss-fill');
    this.bossDelay = this.hud.querySelector('#boss-delay');
    this.bossState = this.hud.querySelector('#boss-state');
    this.phaseLabel = this.hud.querySelector('#phase-label');
    this.worldLabel = this.hud.querySelector('#world-label');
    this.commandLabel = this.hud.querySelector('#command-label');
    this.tutorialHint = this.hud.querySelector('#tutorial-hint');
    this.dialogueChoices = this.hud.querySelector('#dialogue-choices');
    this.rescuePrompt = this.hud.querySelector('#rescue-prompt');
    this.formLabel = this.hud.querySelector('#form-label');
    this.paperHealth = this.hud.querySelector('#paper-health');
    this.abilityLabel = this.hud.querySelector('#ability-label');
    this.bossHit = this.hud.querySelector('#boss-hit');
    this.transitionTitle = this.hud.querySelector('#transition-title');
    this.systemGate = this.hud.querySelector('#system-gate');
    this.systemGate.addEventListener('click', (event) => this.handleSystemGateClick(event));
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    });
    window.addEventListener('keydown', (event) => {
      this.keys.add(event.code);
      if (!event.repeat && event.code === 'Space') this.spaceAction();
      if (!event.repeat && (event.code === 'ShiftLeft' || event.code === 'ShiftRight' || event.code === 'KeyX')) this.dash();
      if (!event.repeat && this.dialogueOpen && /^Digit[123]$/.test(event.code)) this.chooseDialogue(Number(event.code.slice(-1)) - 1);
      if (!event.repeat && event.code === 'Enter' && this.mode === 'menu') {
        document.querySelector('#menu').classList.add('hidden');
        this.begin();
      }
      if (!event.repeat && event.code === 'KeyF') {
        if (!document.fullscreenElement) document.querySelector('.stage-wrap')?.requestFullscreen?.(); else document.exitFullscreen?.();
      }
    });
    window.addEventListener('keyup', (event) => this.keys.delete(event.code));
    this.renderer.domElement.addEventListener('contextmenu', (event) => {
      if (this.phase === 3 && this.mode === 'play') event.preventDefault();
    });
    this.renderer.domElement.addEventListener('pointerdown', (event) => this.handlePaintPointer(event));
    this.renderer.domElement.addEventListener('pointermove', (event) => this.updatePaintPointer(event));
    this.renderer.domElement.addEventListener('pointerup', (event) => this.releasePaintPointer(event));
    this.renderer.domElement.addEventListener('pointercancel', (event) => this.releasePaintPointer(event));
    this.renderer.domElement.addEventListener('pointerleave', () => {
      if (this.paintHold.active) this.releasePaintPointer({ button: this.paintHold.button });
    });
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

  handlePaintPointer(event) {
    if (this.mode !== 'play' || this.phase !== 3 || this.transition || this.dialogueOpen) return;
    if (![0, 2].includes(event.button)) return;
    event.preventDefault();
    const point = this.groundPointFromPointer(event);
    const target = event.button === 2 ? this.findAbsorbablePaint(point) : null;
    this.paintHold = { active: true, button: event.button, elapsed: 0, point, target, completed: false };
    this.renderer.domElement.setPointerCapture?.(event.pointerId);
    this.setTutorialHint(event.button === 2 ? 'HOLD RIGHT CLICK · ABSORB' : 'HOLD LEFT CLICK · RETURN');
    this.command(`${event.button === 2 ? 'ABSORBING' : 'RETURNING'} 0%`, true);
    this.commandLabel.classList.add('paint-hold');
    this.updatePaintTransfer(0);
  }

  updatePaintPointer(event) {
    if (!this.paintHold.active) return;
    this.paintHold.point = this.groundPointFromPointer(event);
    if (this.paintHold.button === 2) this.paintHold.target = this.findAbsorbablePaint(this.paintHold.point);
  }

  releasePaintPointer(event) {
    if (!this.paintHold.active || (event.button >= 0 && event.button !== this.paintHold.button)) return;
    const completed = this.paintHold.completed;
    this.paintHold.target?.asset?.scale.setScalar(1);
    this.paintHold = { active: false, button: -1, elapsed: 0, point: null, target: null, completed: false };
    this.commandLabel.classList.remove('paint-hold');
    this.paintTransfer.visible = false;
    this.paintTransfer.children.forEach((item) => { item.visible = false; });
    if (!completed && this.phase === 3) this.command('KEEP HOLDING');
    if (this.paintTutorial.stage === 'await-pigment') this.setTutorialHint('HOLD RIGHT CLICK · ABSORB');
    else if (this.paintTutorial.stage === 'absorbed') this.setTutorialHint('HOLD LEFT CLICK · RETURN');
    else this.hideTutorialHint();
  }

  updatePaintHold(dt) {
    if (!this.paintHold.active || this.phase !== 3 || this.mode !== 'play') return;
    this.paintHold.elapsed += dt;
    const progress = THREE.MathUtils.clamp(this.paintHold.elapsed / PAINT_HOLD_SECONDS, 0, 1);
    this.command(`${this.paintHold.button === 2 ? 'ABSORBING' : 'RETURNING'} ${Math.round(progress * 100)}%`, true);
    this.updatePaintTransfer(progress);
    if (progress < 1 || this.paintHold.completed) return;
    this.paintHold.completed = true;
    if (this.paintHold.button === 2) this.absorbPaint(this.paintHold.point);
    else this.usePaintBrush();
  }

  findAbsorbablePaint(point = null) {
    return this.hazards.find((hazard) => {
      if (hazard.type !== 'pigment' || !hazard.absorbable) return false;
      return Math.hypot(this.player.x - hazard.x, this.player.z - hazard.z) < 4.2
        && point && Math.hypot(point.x - hazard.x, point.z - hazard.z) < 2.4;
    }) || null;
  }

  updatePaintTransfer(progress) {
    if (!this.paintHold.active) return;
    const absorbing = this.paintHold.button === 2;
    const target = absorbing ? (this.paintHold.target || this.findAbsorbablePaint(this.paintHold.point)) : null;
    if (absorbing && !target) { this.paintTransfer.visible = false; return; }
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
      droplet.position.x += Math.sin(this.elapsed * 17 + index * 2.1) * 0.08;
      droplet.position.z += Math.cos(this.elapsed * 15 + index * 1.7) * 0.07;
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

  playVoice(cue, onEnded = null) {
    if (!cue?.url || !this.voiceAudio || !soundEnabled) { onEnded?.(); return false; }
    this.voiceAudio.pause();
    this.voiceAudio.src = cue.url;
    this.voiceAudio.currentTime = 0;
    this.voiceState = { playing: true, speaker: cue.speaker, tone: cue.tone, text: cue.text };
    music.setDialogueActive(true);
    this.voiceAudio.onended = () => {
      this.voiceState.playing = false;
      music.setDialogueActive(false);
      onEnded?.();
    };
    this.voiceAudio.onerror = this.voiceAudio.onended;
    this.voiceAudio.play().catch(() => { this.voiceState.playing = false; music.setDialogueActive(false); onEnded?.(); });
    return true;
  }

  async loadAssets() {
    await MeshoptDecoder.ready;
    const urls = { conductor: conductorUrl, butch: butchUrl, chapter3Animations: chapter3AnimationsUrl, station: stationUrl, fountain: fountainUrl, clock: clockUrl, archive: archiveUrl, tenement: tenementUrl, workersHall: workersHallUrl, bakery: bakeryUrl, printworks: printworksUrl, trash: trashUrl, bench: benchUrl, speaker: speakerUrl };
    await Promise.all(Object.entries(urls).map(async ([id, url]) => {
      try {
        const gltf = await this.loader.loadAsync(url);
        this.assets.set(id, { root: shadows(gltf.scene), animations: gltf.animations });
      } catch (error) {
        this.assetErrors.push({ id, message: error?.message || String(error) });
      }
    }));
    this.installConductor();
    this.installButch();
    this.installWorldAssets();
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
    this.conductorRoot.scale.setScalar(isEchoCity ? 5 : 3.8);
    this.conductorPaper.setForm(index, immediate);
    this.conductorPaper.root.visible = !isEchoCity;
    this.conductorFallback.visible = isEchoCity && !this.conductorModel;
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

  installWorldAssets() {
    // Echo City is an exposed combat floor. Existing city objects only enter as
    // Conductor-thrown hazards; no skyline, landmark or prop remains fixed.
  }

  begin({ movement = 0 } = {}) {
    const startMovement = THREE.MathUtils.clamp(Math.round(movement), 0, PHASES.length - 1);
    this.clearCombat();
    this.mode = 'play';
    this.phase = startMovement;
    this.falseBossScoreStarted = false;
    this.falseBossScoreLocked = startMovement < 2;
    this.elapsed = 0;
    this.transition = null;
    this.tutorialShown = new Set();
    this.tutorialHint.classList.remove('show');
    this.onboarding = { active: startMovement === 0, stage: startMovement === 0 ? 'go-near' : 'skipped-for-test-node', caseHazard: null };
    this.cyberOnboarding = { active: false, stage: 'pending', target: null, blocksCut: 0 };
    this.cyberLaddersSpawned = 0;
    this.cyberLadderStrikes = 0;
    this.cyberRingCooldown = 0;
    this.echoQuiz = { attempts: 0, correct: 0, used: new Set(), current: null };
    this.echoRecital = { active: false, countdownShown: null };
    this.echoCombatClock = ECHO_COMBAT_INTERVAL;
    this.player.maxHp = DIFFICULTY[difficulty].layers;
    this.player.hp = this.player.maxHp;
    Object.assign(this.player, { x: 0, y: 0, z: 6.1, vy: 0, grounded: true, inv: 1, respawnInv: 0, respawns: 0, phaseHeals: 0, hitTimer: 0, dash: 0, dashCd: 0, attack: 0, attackCd: 0, ammo: 0, ladder: false, color: 0 });
    Object.assign(this.boss, { x: 0, z: CONDUCTOR_Z, hp: PHASE_START_HP[startMovement], phaseStartHp: PHASE_START_HP[startMovement], paintCoverage: 0, inv: 0, exposed: 0, attackClock: startMovement === 0 ? 999 : 1.4, stagger: 0, gesture: 'idle', gestureTime: 0, reaction: 'idle', flash: 0, rounds: 0, phaseRound: 0 });
    this.playerRoot.position.set(0, 0, 6.1);
    this.conductorRoot.position.set(0, -2.8, CONDUCTOR_Z);
    this.conductorRoot.scale.setScalar(5);
    this.conductorRoot.visible = true;
    this.setWorld(startMovement);
    this.puppet.setForm(startMovement, true);
    this.hud.classList.remove('hidden');
    this.command('');
    if (startMovement === 0) this.spawnTutorialSuitcase();
    if (startMovement === 1) this.startCyberOnboarding();
    if (startMovement === 3) this.startPaintOnboarding();
    this.command(PHASES[startMovement].verb);
    this.updateHud();
  }

  clearCombat() {
    [...this.hazards, ...this.projectiles, ...this.effects].forEach((item) => this.scene.remove(item.root || item));
    this.hazards = [];
    this.projectiles = [];
    this.effects = [];
    this.portal.visible = false;
    this.holeVisuals?.forEach((hole) => { hole.visible = false; });
    if (this.dialogueChoices) { this.dialogueChoices.classList.add('hidden'); this.dialogueChoices.innerHTML = ''; }
    this.dialogueOpen = false;
    this.dialoguePause = false;
    this.activeHoles = [];
    this.playerRoot.visible = true;
    this.departureTrain.visible = false;
    if (this.paintTransfer) {
      this.paintTransfer.visible = false;
      this.paintTransfer.children.forEach((item) => { item.visible = false; });
    }
    this.ladderWeapon.visible = false;
    this.rescuePrompt?.classList.add('hidden');
    this.systemGate?.classList.add('hidden');
    if (this.systemGate) this.systemGate.innerHTML = '';
    clearTimeout(this.tutorialTimer);
    this.tutorialHint?.classList.remove('show');
    this.stopMusic();
  }

  setWorld(index) {
    this.worldRoots.forEach((root, i) => { root.visible = i === index; });
    const phase = PHASES[index];
    const fogColors = [0x17100d, 0x06101b, 0x19242c, 0xe5dfce];
    this.scene.background.setHex(fogColors[index]);
    this.scene.fog.color.setHex(fogColors[index]);
    this.rim.color.setHex(phase.color);
    this.redCeilingLights.visible = index < 2;
    // Keep the original readable key/fill lighting in I–II, then layer the
    // red ceiling wash over it. Removing all neutral fill made painted props
    // collapse to black and erased the worlds' authored colours.
    this.hemi.visible = true;
    this.redWash.visible = index < 2;
    this.key.visible = true;
    this.rim.visible = true;
    this.key.color.setHex(index === 3 ? 0xffedcf : index === 2 ? 0xd5efff : 0xffe7c0);
    this.puppet.root.visible = index !== 2;
    this.butchRoot.visible = index === 2;
    this.setConductorWorld(index);
    if (this.suitcase) this.suitcase.visible = false;
    this.ladderWeapon.visible = false;
    this.holeVisuals.forEach((hole) => { hole.visible = false; });
    this.activeHoles = [];
    this.echoOutcome = null;
    if (index === 2) {
      this.echoQuiz = { attempts: 0, correct: 0, used: new Set(), current: null };
      this.echoRecital = { active: false, countdownShown: null };
      this.echoCombatClock = ECHO_COMBAT_INTERVAL;
    }
    this.paintTutorial = { stage: index === 3 ? 'await-pigment' : 'pending' };
    this.cyberRingCooldown = index === 1 ? 0.9 : 0;
    this.boss.phaseStartHp = PHASE_START_HP[index];
    this.boss.paintCoverage = index === 3 ? Math.max(0, (100 - this.boss.hp) / 88) : 0;
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

  command(text, visible = false) {
    this.commandLabel.textContent = text;
    this.commandLabel.classList.remove('show');
    if (visible) {
      void this.commandLabel.offsetWidth;
      this.commandLabel.classList.add('show');
    }
  }

  showTutorialOnce(key, text) {
    this.tutorialShown ||= new Set();
    if (this.tutorialShown.has(key)) return;
    this.tutorialShown.add(key);
    this.tutorialHint.textContent = text;
    this.tutorialHint.classList.remove('show');
    void this.tutorialHint.offsetWidth;
    this.tutorialHint.classList.add('show');
    clearTimeout(this.tutorialTimer);
    this.tutorialTimer = setTimeout(() => this.tutorialHint.classList.remove('show'), 3200);
  }

  setTutorialHint(text) {
    clearTimeout(this.tutorialTimer);
    if (this.tutorialHint.textContent === text && this.tutorialHint.classList.contains('show')) return;
    this.tutorialHint.textContent = text;
    this.tutorialHint.classList.remove('show');
    void this.tutorialHint.offsetWidth;
    this.tutorialHint.classList.add('show');
  }

  hideTutorialHint() {
    clearTimeout(this.tutorialTimer);
    this.tutorialHint.classList.remove('show');
  }

  spawnTutorialSuitcase() {
    const x = 0;
    const z = 1.8;
    const root = this.telegraphPlane(AMBER, 2.7, 2.7, x, z);
    const luggage = makePaperCard(this.textureLoader, ch1SuitcaseUrl, 2.3, 0.84);
    luggage.position.y = 9;
    luggage.rotation.z = 0.4;
    root.add(luggage);
    const hazard = {
      root, asset: luggage, assetId: 'ch1-suitcase', type: 'suitcase-rain', x, z,
      breaksFloor: false, usable: true, tutorial: true, persistentUntilLearned: true,
      timer: 0.9, struck: false, landed: false, opened: false, life: 999,
    };
    this.hazards.push(hazard);
    this.onboarding.caseHazard = hazard;
    this.tutorialShown.add('night-case');
    this.setTutorialHint('GO NEAR');
  }

  updateOnboardingHint() {
    if (!this.onboarding?.active) return;
    const tutorialCase = this.onboarding.caseHazard;
    if (!tutorialCase || this.onboarding.stage === 'fired') return;
    if (this.onboarding.stage === 'armed') {
      this.setTutorialHint('PRESS SPACE AGAIN');
      return;
    }
    const near = tutorialCase.landed && Math.hypot(this.player.x - tutorialCase.x, this.player.z - tutorialCase.z) < 2.8;
    this.setTutorialHint(near ? 'PRESS SPACE' : 'GO NEAR');
  }

  completeOnboarding() {
    if (!this.onboarding?.active) return;
    const tutorialCase = this.onboarding.caseHazard;
    if (tutorialCase) {
      this.scene.remove(tutorialCase.root);
      this.hazards = this.hazards.filter((hazard) => hazard !== tutorialCase);
    }
    this.onboarding.active = false;
    this.onboarding.stage = 'complete';
    this.onboarding.caseHazard = null;
    this.hideTutorialHint();
    this.boss.attackClock = difficulty === 'low' ? 3.2 : difficulty === 'casual' ? 2.35 : 1.7;
  }

  startCyberOnboarding() {
    if (this.phase !== 1 || this.cyberOnboarding?.stage !== 'pending') return;
    this.clearHazards();
    Object.assign(this.cyberOnboarding, { active: true, stage: 'block-1', target: null, blocksCut: 0, approachRingTriggered: false });
    this.player.ammo = 0;
    this.player.ladder = false;
    this.ladderWeapon.visible = false;
    this.boss.attackClock = 999;
    this.tutorialShown.add('cyber-block');
    this.tutorialShown.add('cyber-ladder');
    this.cyberOnboarding.target = this.spawnCyberBlock(0, { tutorial: true, x: 0, z: 2.2 });
    this.setTutorialHint('GO NEAR');
  }

  updateCyberOnboardingHint() {
    if (!this.cyberOnboarding?.active) return;
    const { stage, target } = this.cyberOnboarding;
    if (stage === 'block-1' || stage === 'block-2') {
      const near = target?.landed && Math.hypot(this.player.x - target.x, this.player.z - target.z) < 2.8;
      this.setTutorialHint(near ? 'PRESS SPACE' : 'GO NEAR');
    } else if (stage === 'ladder') {
      const near = target?.landed && Math.hypot(this.player.x - target.x, this.player.z - target.z) < 3.2;
      this.setTutorialHint(near ? 'PRESS SPACE' : 'GO NEAR');
    } else if (stage === 'carry') {
      const ring = this.hazards.find((hazard) => hazard.type === 'cyber-ring');
      const distance = ring ? Math.hypot(this.player.x - ring.x, this.player.z - ring.z) : 0;
      const ringPending = ring && (!ring.struck || ring.radius <= distance + 0.35);
      if (ringPending) this.setTutorialHint(ring.struck && distance - ring.radius < 4.2 ? 'PRESS SPACE' : 'WAIT');
      else this.setTutorialHint(this.player.z < -3.5 ? 'PRESS SPACE' : 'GO TO THE FRONT');
    }
  }

  completeCyberOnboarding() {
    if (!this.cyberOnboarding?.active) return;
    Object.assign(this.cyberOnboarding, { active: false, stage: 'complete', target: null });
    this.hideTutorialHint();
    this.boss.exposed = 0;
    this.boss.attackClock = difficulty === 'low' ? 3.2 : difficulty === 'casual' ? 2.4 : 1.8;
  }

  startPaintOnboarding() {
    if (this.phase !== 3 || this.paintTutorial?.stage !== 'await-pigment') return;
    this.clearHazards();
    this.boss.attackClock = 999;
    this.boss.exposed = 999;
    this.player.color = 0;
    this.spawnPigmentObject(0, { tutorial: true, x: 2.8, z: 3.2 });
    this.setTutorialHint('HOLD RIGHT CLICK · ABSORB COLOR');
  }

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
    this.tone(410, 0.09, 'sawtooth', 0.035);
  }

  attack() {
    if (this.mode !== 'play' || this.transition || this.player.attackCd > 0) return;
    this.player.attack = 0.23;
    this.player.attackCd = 0.34;
    if (this.phase === 0) this.throwSuitcaseMemory();
    else if (this.phase === 1) this.strikeWithLadder();
    else if (this.phase === 2) this.openDialogue();
    else this.usePaintBrush();
  }

  spaceAction() {
    if (this.mode === 'departure') { this.jumpAboardDepartureTrain(); return; }
    if (this.mode !== 'play' || this.transition) return;
    const activeCyberRing = this.phase === 1 ? this.hazards.find((hazard) => {
      if (hazard.type !== 'cyber-ring' || !hazard.struck) return false;
      const distance = Math.hypot(this.player.x - hazard.x, this.player.z - hazard.z);
      const gap = distance - hazard.radius;
      return gap >= -0.35 && gap < 4.2;
    }) : null;
    if (activeCyberRing && this.player.grounded) { this.jump(); return; }
    const pendingCyberRing = this.phase === 1 && this.player.ladder && this.hazards.some((hazard) => {
      if (hazard.type !== 'cyber-ring') return false;
      const distance = Math.hypot(this.player.x - hazard.x, this.player.z - hazard.z);
      return !hazard.struck || hazard.radius <= distance + 0.35;
    });
    if (pendingCyberRing) { this.command('JUMP THE RING FIRST'); return; }
    const nearCase = this.phase === 0 && this.player.ammo === 0 && this.hazards.some((hazard) => hazard.type === 'suitcase-rain' && hazard.usable && hazard.landed && !hazard.opened && Math.hypot(this.player.x - hazard.x, this.player.z - hazard.z) < 2.8);
    const nearCyber = this.phase === 1 && this.hazards.some((hazard) => ((hazard.type === 'cyber-block' && !hazard.cut) || (hazard.type === 'cyber-ladder' && !hazard.picked)) && hazard.landed && Math.hypot(this.player.x - hazard.x, this.player.z - hazard.z) < 3.2);
    if (nearCase || nearCyber) { this.interact(); return; }
    if (this.phase === 0 && this.player.ammo > 0) { this.attack(); return; }
    if (this.phase === 1 && this.player.ladder && this.player.z < -3.5) { this.attack(); return; }
    if (this.phase === 2) { this.jump(); return; }
    this.jump();
  }

  interact() {
    if (this.mode === 'departure') { this.jumpAboardDepartureTrain(); return; }
    if (this.mode !== 'play' || this.transition) return;
    const caseDrop = this.player.ammo === 0 ? this.hazards.find((hazard) => hazard.type === 'suitcase-rain' && hazard.usable && hazard.landed && !hazard.opened && Math.hypot(this.player.x - hazard.x, this.player.z - hazard.z) < 2.8) : null;
    if (this.phase === 0 && caseDrop) {
      caseDrop.opened = true;
      this.player.ammo = 1;
      caseDrop.root.rotation.x = -0.8;
      if (caseDrop.tutorial && this.onboarding?.active) {
        this.onboarding.stage = 'armed';
        this.setTutorialHint('PRESS SPACE AGAIN');
      } else this.command(`CASE OPEN // ${this.player.ammo} MEMORY OBJECT${this.player.ammo === 1 ? '' : 'S'}`);
      this.tone(520, 0.12, 'triangle', 0.04);
    } else if (this.phase === 1) {
      const ladder = this.hazards.find((hazard) => hazard.type === 'cyber-ladder' && hazard.landed && !hazard.picked && Math.hypot(this.player.x - hazard.x, this.player.z - hazard.z) < 3.2);
      if (ladder) {
        ladder.picked = true; ladder.life = 0;
        this.player.ladder = true;
        this.ladderWeapon.visible = true;
        if (ladder.tutorial && this.cyberOnboarding?.active) {
          this.cyberOnboarding.stage = 'carry';
          this.cyberOnboarding.target = null;
          this.setTutorialHint('GO TO THE FRONT');
        } else {
          this.boss.exposed = Math.max(this.boss.exposed, 8 * DIFFICULTY[difficulty].bossWindow);
          this.command('LADDER IN HAND // REACH THE FRONT EDGE');
        }
        this.tone(640, 0.14, 'triangle', 0.045);
      } else {
        const block = this.hazards.find((hazard) => hazard.type === 'cyber-block' && hazard.landed && !hazard.cut && Math.hypot(this.player.x - hazard.x, this.player.z - hazard.z) < 2.8);
        if (block) this.cutCyberBlock(block);
        else this.command(this.hazards.some((hazard) => hazard.type === 'cyber-ladder' && !hazard.picked) ? 'THE LADDER IS FALLING' : 'MOVE TO A LANDED GRID BLOCK');
      }
    }
  }

  throwSuitcaseMemory() {
    if (!this.player.ammo) { this.command('OPEN A LANDED SUITCASE'); return; }
    const tutorialShot = Boolean(this.onboarding?.active && this.onboarding.stage === 'armed');
    this.player.ammo -= 1;
    this.spawnPlayerProjectile(AMBER, 'memory', NIGHT_MEMORY_DAMAGE, tutorialShot);
    if (tutorialShot) {
      this.onboarding.stage = 'fired';
      this.hideTutorialHint();
    }
  }

  cutCyberBlock(target = null) {
    const block = target || this.hazards.find((hazard) => hazard.type === 'cyber-block' && hazard.landed && !hazard.cut && Math.hypot(this.player.x - hazard.x, this.player.z - hazard.z) < 2.6);
    if (!block) { this.command(this.player.ladder ? 'RUN TO THE FRONT EDGE' : 'MOVE TO A LANDED GRID BLOCK'); return; }
    block.cut = true; block.life = 0;
    this.player.ammo = 1;
    this.spawnAttackArc();
    this.spawnImpact(block.x, 0.8, block.z, CYAN);
    if (block.tutorial && this.cyberOnboarding?.active) {
      this.cyberOnboarding.blocksCut += 1;
      if (this.cyberOnboarding.blocksCut < 2) {
        this.cyberOnboarding.stage = 'block-2';
        this.cyberOnboarding.target = this.spawnCyberBlock(1, { tutorial: true, x: this.player.x > 0 ? -3.5 : 3.5, z: 1.2 });
        this.setTutorialHint('GO NEAR');
      } else {
        this.cyberOnboarding.stage = 'ladder';
        this.cyberOnboarding.target = this.spawnCyberLadder({ tutorial: true });
        this.boss.exposed = Math.max(this.boss.exposed, 999);
        this.setTutorialHint('GO NEAR');
      }
      return;
    }
    this.command('POWER BLOCK CUT // LADDER INBOUND');
    if (!this.hazards.some((hazard) => hazard.type === 'cyber-ladder' && !hazard.picked)) {
      this.spawnCyberLadder();
      this.boss.exposed = Math.max(this.boss.exposed, 3.6 * DIFFICULTY[difficulty].bossWindow);
      this.command('BARRAGE BROKEN // LADDER INBOUND');
    }
  }

  strikeWithLadder() {
    if (!this.player.ladder) { this.command('CUT BLOCKS · PICK UP THE FALLEN LADDER'); return; }
    const tutorialStrike = Boolean(this.cyberOnboarding?.active && this.cyberOnboarding.stage === 'carry');
    if (!tutorialStrike && this.boss.exposed <= 0) { this.command('KEEP MOVING UNTIL THE CONDUCTOR DROPS HIS HANDS'); return; }
    if (this.player.z >= -3.5) { this.command('CARRY THE LADDER TO THE FRONT EDGE'); return; }
    this.player.ladder = false; this.ladderWeapon.visible = false;
    this.player.ammo = 0;
    this.cyberLadderStrikes += 1;
    this.spawnAttackArc(); this.hitBoss(CYBER_LADDER_DAMAGE, 'ladder');
    if (tutorialStrike) this.completeCyberOnboarding();
  }

  openDialogue(source = 'manual') {
    if (this.phase !== 2 || this.dialogueOpen || this.boss.exposed <= 0) return;
    if (this.echoRecital.active && source !== 'combat-timer') return;
    this.dialogueOpen = true;
    this.dialoguePause = true;
    const tier = Math.min(2, Math.floor(this.echoQuiz.attempts / 3));
    let pool = ECHO_POETRY_QUESTIONS.filter((question) => question.tier === tier && !this.echoQuiz.used.has(question.id));
    if (!pool.length) pool = ECHO_POETRY_QUESTIONS.filter((question) => !this.echoQuiz.used.has(question.id));
    if (!pool.length) { this.echoQuiz.used.clear(); pool = ECHO_POETRY_QUESTIONS.filter((question) => question.tier === 2); }
    const question = pool[(this.boss.phaseRound + this.echoQuiz.attempts) % pool.length];
    this.echoQuiz.used.add(question.id);
    this.echoQuiz.current = question;
    this.activeEchoReplies = question.choices.map((text, index) => ({
      cue: voiceCue('BUTCH', text, poetryVoice(`${question.id}-choice-${index + 1}`), index === question.correct ? 'recognition-resolve' : 'uncertain-recall'),
      correct: index === question.correct, damage: ECHO_POETRY_DAMAGE, reaction: 'shame',
    }));
    const tierLabel = ['I · FORM', 'II · MEMORY', 'III · METER'][tier];
    const claim = voiceCue('CONDUCTOR', question.prompt, poetryVoice(`${question.id}-prompt`), tier === 2 ? 'measured-challenge' : 'cold-recital');
    this.dialogueChoices.innerHTML = `<div class="dialogue-meta"><span>${question.source}</span><span>${tierLabel} · QUESTION ${this.echoQuiz.attempts + 1}</span></div><div class="dialogue-speaker">${claim.speaker}</div><div class="dialogue-claim poetry-line">${claim.text}</div><div class="dialogue-replies poetry-replies">${this.activeEchoReplies.map((line, index) => `<button data-choice="${index}"><b>${index + 1}</b><em>${line.cue.text}</em></button>`).join('')}</div>`;
    this.dialogueChoices.classList.remove('hidden');
    this.dialogueChoices.querySelectorAll('button').forEach((button) => button.addEventListener('click', () => this.chooseDialogue(Number(button.dataset.choice))));
    this.playVoice(claim);
    this.showTutorialOnce('echo-argument', 'COMPLETE THE VERSE // 1 · 2 · 3');
    this.command('TIME HOLDS // COMPLETE THE LINE');
  }

  chooseDialogue(index) {
    if (!this.dialogueOpen) return;
    const line = this.activeEchoReplies?.[index] || this.activeEchoReplies?.[0];
    if (!line) return;
    this.echoQuiz.attempts += 1;
    this.dialogueChoices.querySelectorAll('button').forEach((button) => { button.disabled = true; });
    this.dialogueChoices.querySelector('.dialogue-speaker').textContent = line.cue.speaker;
    this.dialogueChoices.querySelector('.dialogue-claim').textContent = line.cue.text;
    this.dialogueChoices.querySelector('.dialogue-replies').innerHTML = '';
    if (line.correct) {
      this.echoQuiz.correct += 1;
      this.echoOutcome = { correct: true, reply: line.cue.text, rebuttal: null };
      this.command('THE RECORD BREAKS'); this.hitBoss(line.damage, line.reaction);
      this.playVoice(line.cue, () => { this.closeDialogue(); this.advanceEchoRecital(); });
      return;
    }
    this.playVoice(line.cue, () => {
        const correction = voiceCue('CONDUCTOR', 'NO. THAT IS NOT THE LINE.', poetryVoice('wrong-correction'), 'curt-correction');
      this.echoOutcome = { correct: false, reply: line.cue.text, rebuttal: correction.text };
      this.dialogueChoices.querySelector('.dialogue-speaker').textContent = correction.speaker;
      this.dialogueChoices.querySelector('.dialogue-claim').textContent = correction.text;
      this.dialogueChoices.querySelector('.dialogue-replies').innerHTML = '';
      this.playVoice(correction, () => { this.closeDialogue(); this.advanceEchoRecital(); });
      this.command('THE VERSE HOLDS');
    });
  }

  advanceEchoRecital() {
    if (!this.echoRecital.active) return;
    this.echoRecital.active = false;
    this.boss.exposed = 0;
    this.echoCombatClock = ECHO_COMBAT_INTERVAL;
    this.boss.attackClock = 0.2;
    this.command('MOVE // NEXT VERSE IN 10');
  }

  closeDialogue() {
    this.dialogueOpen = false;
    this.dialoguePause = false;
    this.dialogueChoices.classList.add('hidden');
    this.dialogueChoices.innerHTML = '';
    this.voiceAudio?.pause();
    this.voiceState.playing = false;
    music.setDialogueActive(false);
  }

  absorbPaint(point = null) {
    const pigment = this.paintHold.target || this.findAbsorbablePaint(point);
    if (pigment && this.player.color < 3) {
      pigment.asset?.scale.setScalar(1);
      pigment.absorbable = false; pigment.life = 0;
      this.player.color += 1;
      this.spawnImpact(this.player.x, 1, this.player.z, pigment.color);
      this.command(`COLOR ABSORBED ${this.player.color}/3`);
      if (this.paintTutorial.stage === 'await-pigment') {
        this.paintTutorial.stage = 'absorbed';
        this.setTutorialHint('HOLD LEFT CLICK · RETURN COLOR');
        this.boss.exposed = Math.max(this.boss.exposed, 999);
      }
      return true;
    }
    this.command('HOLD RIGHT CLICK ON LANDED PIGMENT');
    return false;
  }

  usePaintBrush() {
    if (this.player.color < 1) { this.command('HOLD RIGHT CLICK ON COLOR FIRST'); return; }
    this.player.color = 0;
    this.hitBoss(PAINT_DAMAGE, 'rage');
    this.spawnImpact(this.boss.x, 6.7, this.boss.z + 0.7, 0xff806f);
    this.tone(580, 0.16, 'triangle', 0.04);
    this.command('COLOR RETURNED');
    if (this.paintTutorial.stage === 'absorbed') {
      this.paintTutorial.stage = 'complete';
      this.hideTutorialHint();
      this.boss.exposed = Math.min(this.boss.exposed, 1.2);
      this.boss.attackClock = difficulty === 'low' ? 3.2 : difficulty === 'casual' ? 2.4 : 1.8;
    }
  }

  spawnPlayerProjectile(color, kind, damage, tutorial = false) {
    const root = makePaperCard(this.textureLoader, kind === 'memory' ? ch1MemoryUrl : ch4IndigoUrl, kind === 'memory' ? 0.58 : 0.82, kind === 'memory' ? 0.76 : 0.5, { alpha: true, nearest: true });
    root.position.set(this.player.x, 1.2 + this.player.y, this.player.z);
    this.scene.add(root);
    const start = root.position.clone();
    const target = new THREE.Vector3(this.boss.x, 6.8, this.boss.z + 0.8);
    const duration = THREE.MathUtils.clamp(start.distanceTo(target) / 24, 0.58, 1.15);
    this.projectiles.push({ root, type: 'player-shot', damage, tutorial, life: duration + 0.25, age: 0, duration, start, target });
    this.spawnAttackArc();
    this.tone(kind === 'paint' ? 580 : 260, 0.16, 'triangle', 0.04);
  }

  spawnAttackArc() {
    const material = new THREE.MeshBasicMaterial({ color: this.puppet.accent, transparent: true, opacity: 0.82, side: THREE.DoubleSide, depthWrite: false });
    const arc = new THREE.Mesh(new THREE.RingGeometry(0.65, 2.7, 42, 1, -0.82, 1.64), material);
    arc.rotation.x = -Math.PI / 2;
    arc.rotation.z = Math.atan2(this.player.facingZ, this.player.facingX) - Math.PI / 2;
    arc.position.set(this.player.x, 0.42 + this.player.y, this.player.z);
    this.scene.add(arc);
    this.effects.push({ root: arc, life: 0.18, type: 'arc' });
  }

  hitBoss(amount, reaction = 'pain') {
    if (this.boss.hp <= 0) return;
    const oldPhase = this.phase;
    this.boss.hp = Math.max(0, this.boss.hp - amount);
    this.boss.inv = 0.09 * DIFFICULTY[difficulty].bossWindow;
    this.boss.stagger = 0.18;
    this.boss.reaction = reaction;
    this.boss.lastDamageCause = this.phase === 0 ? 'thrown-memory' : this.phase === 1 ? 'ladder-strike' : this.phase === 2 ? 'spoken-truth' : 'returned-pigment';
    if (this.phase === 3) {
      this.boss.paintCoverage = THREE.MathUtils.clamp((100 - this.boss.hp) / 88, 0, 1);
      this.updatePaintCreep();
    }
    this.boss.gestureTime = reaction === 'rage' ? 1.4 : 0.8;
    this.boss.flash = 0.18;
    this.playConductorAction(reaction === 'pain' ? 'Walk_Loop' : reaction === 'shame' ? 'Fixing_Kneeling' : 'Interact', true);
    this.boss.exposed = Math.max(this.boss.exposed, 0.2);
    this.hitStop = 0.055;
    this.trauma = Math.min(1, this.trauma + 0.3);
    this.bossHit.classList.remove('show'); void this.bossHit.offsetWidth; this.bossHit.classList.add('show');
    this.spawnImpact(this.boss.x, 8.2, this.boss.z + 1, reaction === 'shame' ? 0xffd7d7 : this.puppet.accent);
    this.tone(72, 0.12, 'sawtooth', 0.055);
    const newPhase = Math.min(3, Math.floor((400 - this.boss.hp) / 100));
    if (this.phase === 3 && this.boss.hp <= 12) this.startRescueSequence();
    else if (this.boss.hp <= 0) this.startRescueSequence();
    else if (newPhase > oldPhase) this.startWorldTransition(newPhase);
  }

  spawnImpact(x, y, z, color) {
    for (let i = 0; i < 14; i += 1) {
      const shard = flatBox(0.05 + Math.random() * 0.13, 0.18 + Math.random() * 0.3, 0.04, new THREE.MeshBasicMaterial({ color }));
      shard.position.set(x, y, z);
      shard.userData.velocity = new THREE.Vector3(THREE.MathUtils.randFloatSpread(7), THREE.MathUtils.randFloat(2, 7), THREE.MathUtils.randFloatSpread(7));
      this.scene.add(shard);
      this.effects.push({ root: shard, life: 0.55, type: 'shard' });
    }
  }

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
    this.rescuePrompt.classList.add('hidden');
    this.showTutorialOnce('painted-train-arrival', 'THE SKETCH TRAIN IS ARRIVING // MOVE TO THE PLATFORM EDGE');
    this.trauma = 0.9;
    this.tone(48, 0.8, 'sawtooth', 0.07);
  }

  jumpAboardDepartureTrain() {
    if (this.mode !== 'departure') return;
    if (!this.departureBoardable) { this.command('WAIT FOR THE TRAIN TO SLOW'); return; }
    if (this.player.grounded) {
      this.jump();
      this.command('JUMP ABOARD');
    }
  }

  boardDepartureTrain() {
    if (this.mode !== 'departure') return;
    this.mode = 'cinematic';
    this.rescuePrompt.classList.add('hidden');
    this.cinematicTime = 0;
    this.playerRoot.position.set(this.departureTrain.position.x + 1.2, 2.6, this.departureTrain.position.z);
    this.command('THE TRAIN TAKES YOU FORWARD.');
    this.playMusic(BOSS_SCORE.departure);
  }

  updateRescue(dt) {
    if (this.mode === 'departure') {
      this.departureTimer += dt;
      const targetX = -0.7;
      const speed = this.departureTrain.position.x < -3.2 ? 13.5 : 2.05;
      this.departureTrain.position.x = Math.min(targetX, this.departureTrain.position.x + speed * dt);
      this.departureBoardable = this.departureTrain.position.x >= -3.2;
      if (this.departureBoardable) {
        this.rescuePrompt.classList.remove('hidden');
        this.setTutorialHint('SLOW MOTION // SPACE · JUMP ABOARD');
        const closeEnough = Math.abs(this.player.x - (this.departureTrain.position.x + 1.1)) < 4.8
          && Math.abs(this.player.z - this.departureTrain.position.z) < 3.5;
        if (closeEnough && this.player.y > 0.52) this.boardDepartureTrain();
      }
      return;
    }
    if (this.mode !== 'cinematic') return;
    this.cinematicTime += dt;
    const t = this.cinematicTime;
    if (t < 1.1) {
      const jump = Math.sin(Math.min(1, t / 1.1) * Math.PI) * 2.4;
      const boardX = this.departureTrain.position.x + 1.2;
      this.playerRoot.position.lerp(new THREE.Vector3(boardX, jump, 1.2), 1 - Math.exp(-dt * 5));
    } else {
      this.playerRoot.visible = false;
      this.departureTrain.position.x += 11 * dt;
      this.cameraTarget.lerp(this.departureTrain.position.clone().add(new THREE.Vector3(0, 1.8, 0)), 1 - Math.exp(-dt * 4));
    }
    if (t > 5.2) this.finish(true);
  }

  startWorldTransition(nextPhase) {
    if (this.transition) return;
    if (this.phase === 1 && nextPhase === 2) {
      this.startSystemGateTransition(nextPhase);
      return;
    }
    this.transition = { nextPhase, time: 0, duration: 3.25, switched: false };
    this.clearHazards();
    this.player.inv = 4;
    this.portal.visible = true;
    this.portal.position.set(0, 0, -0.2);
    this.portal.scale.setScalar(0.05);
    this.transitionTitle.querySelector('b').textContent = PHASES[nextPhase].world;
    this.transitionTitle.querySelector('span').textContent = `${PHASES[nextPhase].form} FORM`;
    this.transitionTitle.classList.add('show');
    this.command('THE CONDUCTOR TEARS OPEN ANOTHER WORLD');
    this.hitStop = 0.11;
    this.trauma = 0.75;
    this.tone(42, 0.8, 'sawtooth', 0.06);
  }

  startSystemGateTransition(nextPhase) {
    this.transition = { kind: 'system-gate', nextPhase, time: 0, stage: 'freeze', selected: new Set(), failures: 0, captchaSet: 0 };
    this.clearHazards();
    this.player.inv = 99;
    this.boss.attackClock = 999;
    this.command('');
    this.hideTutorialHint();
    this.systemGate.classList.remove('hidden');
    this.renderSystemGate();
    this.hitStop = 0.12;
    this.trauma = 0.34;
    this.tone(46, 0.42, 'square', 0.045);
  }

  renderSystemGate() {
    const gate = this.transition;
    if (!gate || gate.kind !== 'system-gate') return;
    if (gate.stage === 'freeze') {
      this.systemGate.innerHTML = `<div class="system-freeze"><div class="freeze-chrome"><i></i><i></i><i></i><span>ALL WORLDS AT ONCE</span></div><div class="freeze-body"><small>APPLICATION NOT RESPONDING</small><b>WAITING FOR<br>THE CONDUCTOR</b><div class="freeze-loader"><i></i><i></i><i></i></div><span>Restoring player identity…</span></div></div>`;
      return;
    }
    if (gate.stage === 'checkbox') {
      this.systemGate.innerHTML = `<div class="captcha-stage"><div class="captcha-check-card"><button class="captcha-box" data-system-action="captcha-open" aria-label="I'm not a robot"></button><div><b>I'm not a robot</b><span>Player verification required</span></div><div class="captcha-brand"><strong>◉</strong><small>rePLAYER<br>Privacy · Terms</small></div></div><p>Unusual movement was detected near THE CONDUCTOR.</p></div>`;
      return;
    }
    if (gate.stage === 'challenge') {
      const images = CAPTCHA_IMAGE_SETS[gate.captchaSet % CAPTCHA_IMAGE_SETS.length];
      const cells = images.map((image, index) => `<button class="captcha-tile tile-${index}${gate.selected.has(index) ? ' selected' : ''}" data-system-action="tile" data-tile="${index}" aria-label="verification image ${index + 1}: ${image.label}"><img src="${image.src}" alt="" draggable="false"></button>`).join('');
      this.systemGate.innerHTML = `<div class="captcha-window"><div class="captcha-prompt"><small>Select all squares with</small><b>TRAINS</b><span>If there are none, click verify</span></div><div class="captcha-grid">${cells}</div><div class="captcha-actions"><span>${gate.failures ? 'Please try again.' : 'New images may appear.'}</span><button data-system-action="verify">VERIFY</button></div></div>`;
      return;
    }
    if (gate.stage === 'terms') {
      this.systemGate.innerHTML = `<div class="terms-window"><div class="terms-top"><span>Player Services</span><small>AGREEMENT 06-∞</small></div><h2>Before continuing</h2><p class="terms-lead">Review and accept The Conductor's Game Service Terms.</p><div class="terms-scroll" tabindex="0"><h3>ALL WORLDS AT ONCE PLAYER AGREEMENT</h3><p><b>1. Identity.</b> You agree that changing form does not make you a different passenger. The system may request repeated proof when your body, chapter, animation set, or remembered name changes.</p><p><b>2. Movement data.</b> Running, jumping, carrying ladders, cutting blocks and approaching the platform edge may be classified as suspicious human behaviour. Remaining still does not guarantee safety.</p><p><b>3. World continuity.</b> Items from one world may enter another without warning. The operator is not liable for trains, civic furniture, pigment, testimony, holes in floors, or contradictions between official records.</p><p><b>4. Consent.</b> By proceeding, you authorize the service to decide which version of your story is easiest to archive. This authorization lasts until challenged aloud.</p><p><b>5. Mara.</b> No agreement transfers ownership of another passenger. A person cannot be corrected into absence, even when the timetable marks the deletion as complete.</p><p><b>6. Final clause.</b> The player retains the right to refuse the only available answer and continue anyway.</p><div class="terms-end">END OF AGREEMENT · SCROLL COMPLETE</div></div><label class="terms-check"><input type="checkbox" data-system-action="terms-check" disabled> I have read and agree to the Game Service Terms</label><button class="terms-accept" data-system-action="terms-accept" disabled>ACCEPT & CONTINUE</button><span class="terms-status">Scroll to the end to continue.</span></div>`;
      const scroll = this.systemGate.querySelector('.terms-scroll');
      scroll?.addEventListener('scroll', () => {
        const complete = scroll.scrollTop + scroll.clientHeight >= scroll.scrollHeight - 6;
        const checkbox = this.systemGate.querySelector('[data-system-action="terms-check"]');
        if (complete && checkbox) {
          checkbox.disabled = false;
          this.systemGate.querySelector('.terms-status').textContent = 'Reading complete. Confirm your choice.';
        }
      });
      return;
    }
    if (gate.stage === 'reboot') {
      this.systemGate.innerHTML = `<div class="system-reboot"><small>VERIFICATION ACCEPTED</small><b>RELOADING<br>ECHO CITY</b><div class="reboot-line"><i></i></div><span>Human variance preserved.</span></div>`;
    }
  }

  handleSystemGateClick(event) {
    const gate = this.transition;
    if (!gate || gate.kind !== 'system-gate') return;
    const target = event.target.closest('[data-system-action]');
    if (!target) return;
    const action = target.dataset.systemAction;
    if (action === 'captcha-open' && gate.stage === 'checkbox') {
      gate.stage = 'challenge'; gate.selected = new Set();
      this.renderSystemGate(); this.tone(440, 0.1, 'sine', 0.03);
    } else if (action === 'tile' && gate.stage === 'challenge') {
      const index = Number(target.dataset.tile);
      if (gate.selected.has(index)) gate.selected.delete(index); else gate.selected.add(index);
      target.classList.toggle('selected', gate.selected.has(index));
    } else if (action === 'verify' && gate.stage === 'challenge') {
      const images = CAPTCHA_IMAGE_SETS[gate.captchaSet % CAPTCHA_IMAGE_SETS.length];
      const expected = images.flatMap((image, index) => image.train ? [index] : []);
      const valid = gate.selected.size === expected.length && expected.every((index) => gate.selected.has(index));
      if (!valid) {
        gate.failures += 1; gate.captchaSet = (gate.captchaSet + 1) % CAPTCHA_IMAGE_SETS.length; gate.selected = new Set(); this.renderSystemGate(); this.tone(92, 0.16, 'square', 0.045);
      } else {
        gate.stage = 'terms'; this.renderSystemGate(); this.tone(660, 0.16, 'triangle', 0.035);
      }
    } else if (action === 'terms-check' && gate.stage === 'terms') {
      const accept = this.systemGate.querySelector('[data-system-action="terms-accept"]');
      if (accept) accept.disabled = !target.checked;
    } else if (action === 'terms-accept' && gate.stage === 'terms' && !target.disabled) {
      gate.stage = 'reboot'; gate.time = 0; this.renderSystemGate(); this.tone(760, 0.24, 'triangle', 0.04);
    }
  }

  completeSystemGateTransition() {
    const tr = this.transition;
    if (!tr || tr.kind !== 'system-gate') return;
    this.phase = tr.nextPhase;
    this.boss.phaseRound = 0;
    this.setWorld(this.phase);
    this.puppet.setForm(this.phase);
    this.player.x = 0; this.player.y = 0; this.player.z = 6.2; this.player.vy = 0; this.player.grounded = true;
    this.playerRoot.position.set(0, 0, 6.2);
    this.boss.x = 0; this.boss.z = CONDUCTOR_Z; this.boss.attackClock = 1.45; this.boss.exposed = 0;
    this.conductorRoot.position.set(0, -2.8, CONDUCTOR_Z);
    this.player.hp = this.player.maxHp; this.player.phaseHeals += 1; this.player.inv = 1.8;
    this.player.ammo = 0; this.player.ladder = false; this.player.color = 0;
    this.ladderWeapon.visible = false;
    this.systemGate.classList.add('hidden'); this.systemGate.innerHTML = '';
    this.transition = null;
    this.command(PHASES[this.phase].verb);
    this.trauma = 0.42;
  }

  updateTransition(dt) {
    if (!this.transition) return false;
    const tr = this.transition;
    if (tr.kind === 'system-gate') {
      tr.time += dt;
      if (tr.stage === 'freeze' && tr.time >= 1.35) {
        tr.stage = 'checkbox'; tr.time = 0; this.renderSystemGate();
      } else if (tr.stage === 'reboot' && tr.time >= 1.25) this.completeSystemGateTransition();
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
        this.puppet.setForm(this.phase);
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
      this.transitionTitle.classList.remove('show');
      this.player.x = 0; this.player.y = 0; this.player.z = 6.2; this.player.vy = 0; this.player.grounded = true;
      this.playerRoot.position.set(0, 0, 6.2);
      this.conductorRoot.position.set(0, -2.8, CONDUCTOR_Z);
      this.boss.x = 0; this.boss.z = CONDUCTOR_Z;
      this.boss.attackClock = 1.25;
      this.boss.exposed = 0;
      this.transition = null;
      this.trauma = 0.45;
      this.player.hp = this.player.maxHp;
      this.player.phaseHeals += 1;
      this.player.inv = Math.max(this.player.inv, 1.4);
      this.player.ammo = 0; this.player.ladder = false; this.player.color = 0;
      this.command(PHASES[this.phase].verb);
      if (this.phase === 1) this.startCyberOnboarding();
      if (this.phase === 3) this.startPaintOnboarding();
    }
    return true;
  }

  clearHazards() {
    [...this.hazards, ...this.projectiles].forEach((item) => this.scene.remove(item.root));
    this.hazards = [];
    this.projectiles = [];
    this.pendingCommand = null;
  }

  spawnBeat() {
    this.boss.rounds += 1;
    this.boss.phaseRound += 1;
    this.boss.gesture = 'point';
    this.boss.gestureTime = 0.82;
    this.playConductorAction('Interact', true);
    const pressure = Math.min(4, Math.floor((this.boss.phaseRound - 1) / 2));
    const phasePressure = this.phase === 3 ? 2 : Math.floor((this.phase + 1) / 2);
    const count = this.phase === 3 ? 1 : Math.min(6, DIFFICULTY[difficulty].overlap + phasePressure + pressure);
    const chapterOneWindow = this.phase === 0 && this.boss.phaseRound % CH1_COUNTER_EVERY === 0;
    this.pendingCommand = { phase: this.phase, count, chapterOneWindow, time: 0.62 };
    this.boss.attackClock = this.phase === 3
      ? Math.max(2.15, (3.4 - Math.min(0.9, this.boss.phaseRound * 0.1)) * DIFFICULTY[difficulty].bossWindow)
      : chapterOneWindow
        ? Math.max(3.6, (5.5 - pressure * 0.35) * DIFFICULTY[difficulty].bossWindow)
        : Math.max(1.05, (DIFFICULTY[difficulty].beat - pressure * 0.16 - this.phase * 0.1) * THREE.MathUtils.randFloat(0.9, 1.06));
    if (chapterOneWindow) {
      this.boss.exposed = Math.max(3.4, (4.8 - pressure * 0.3) * DIFFICULTY[difficulty].bossWindow);
      this.command('COUNTER WINDOW // SOME CASES BREAK THE FLOOR');
    } else if (this.phase === 0) {
      this.command('KEEP MOVING // TRAINS AND CASES ARE CROSSING');
    } else if (this.boss.rounds % 3 === 0) {
      this.boss.exposed = (this.phase === 3 ? 2.65 : 3.4) * DIFFICULTY[difficulty].bossWindow;
      this.command(this.phase === 1 ? 'ATTACK WINDOW // TAKE THE LADDER' : this.phase === 2 ? 'ATTACK WINDOW // SPEAK' : 'ATTACK WINDOW // RETURN THE COLOR');
    }
  }

  spawnPaperTrainPattern(patternIndex = this.boss.rounds - 1, force = false) {
    const difficultyBonus = difficulty === 'hard' ? 1 : 0;
    const pressure = Math.min(4, Math.floor((this.boss.phaseRound - 1) / 2));
    const unlocked = force ? CH1_TRAIN_PATTERNS.length : Math.min(CH1_TRAIN_PATTERNS.length, 2 + pressure * 2 + difficultyBonus);
    const escalationIndex = force ? Math.abs(patternIndex) % unlocked : CH1_ESCALATION[Math.min(CH1_ESCALATION.length - 1, pressure)] % unlocked;
    const pattern = CH1_TRAIN_PATTERNS[escalationIndex];
    pattern.paths.forEach((path, index) => this.spawnPaperTrainPath(path, index, pattern.id));
  }

  spawnPaperTrainPath(path, index = 0, patternId = 'custom') {
    const direction = new THREE.Vector2(path.direction[0], path.direction[1]).normalize();
    const normal = new THREE.Vector2(-direction.y, direction.x);
    const lane = path.lane + (index ? THREE.MathUtils.randFloatSpread(0.35) : 0);
    const center = normal.clone().multiplyScalar(lane);
    const halfTravel = 21;
    const angle = Math.atan2(direction.y, direction.x);
    const root = this.telegraphPlane(AMBER, 43, 2.45, center.x, center.y);
    root.rotation.y = -angle;
    const train = makePaperCard(this.textureLoader, ch1TrainUrl, 10.8, 3.6, { alpha: true });
    train.position.set(-halfTravel, 1.8, 0);
    // The warning group carries the world-space trajectory, and the paper train
    // inherits that yaw. It stays a single flat side-view card: diagonal paths
    // visibly foreshorten it, while depth-wise paths turn it nearly edge-on.
    train.rotation.y = 0;
    if (direction.x < 0) train.scale.x = -1;
    root.add(train);
    this.hazards.push({
      root, asset: train, assetId: 'ch1-train-exterior-v01', type: 'paper-train', patternId,
      direction, normal, lane, width: 1.35, timer: DIFFICULTY[difficulty].telegraph + (path.delay || 0),
      struck: false, life: 2.7, speed: (21 + Math.min(8, this.boss.phaseRound * 0.72)) * DIFFICULTY[difficulty].speedScale, progress: -halfTravel,
    });
  }

  spawnSuitcaseRain(index, breaksFloor = false) {
    const angle = index * 2.399 + this.boss.phaseRound * 0.71;
    const radius = 2.2 + (index % 3) * 1.9;
    const x = THREE.MathUtils.clamp(this.player.x + Math.cos(angle) * radius, -10.8, 10.8);
    const z = THREE.MathUtils.clamp(this.player.z + Math.sin(angle) * radius, -6.2, 6.4);
    const root = this.telegraphPlane(breaksFloor ? PINK : AMBER, breaksFloor ? 3.2 : 2.4, breaksFloor ? 3.2 : 2.4, x, z);
    const luggage = makePaperCard(this.textureLoader, ch1SuitcaseUrl, 2.3, 0.84);
    luggage.position.y = 9; luggage.rotation.z = 0.4; root.add(luggage);
    this.hazards.push({ root, asset: luggage, assetId: 'ch1-suitcase', type: 'suitcase-rain', x, z, breaksFloor, usable: !breaksFloor, timer: DIFFICULTY[difficulty].telegraph + index * 0.06, struck: false, landed: false, opened: false, life: breaksFloor ? 0.65 : 3.2 });
  }

  spawnCyberLaser(index) {
    const vertical = (this.boss.rounds + index) % 2 === 0;
    const offset = vertical ? THREE.MathUtils.randFloat(-9, 9) : THREE.MathUtils.randFloat(-5, 5);
    const root = this.telegraphPlane(CYAN, vertical ? 0.55 : 29, vertical ? 21 : 0.55, vertical ? offset : 0, vertical ? 0 : offset);
    this.hazards.push({ root, asset: root.children[0], assetId: 'borrowed-grid-laser', type: 'laser', vertical, offset, timer: DIFFICULTY[difficulty].telegraph * 0.85 + index * 0.065, struck: false, life: difficulty === 'low' ? 0.42 : 0.58 });
  }

  spawnCyberRingLaser(options = {}) {
    const root = new THREE.Group();
    const initialRadius = 0.7;
    const bandHalfWidth = 0.12;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(initialRadius - bandHalfWidth, initialRadius + bandHalfWidth, 96),
      new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.1;
    root.add(ring);
    root.position.set(this.boss.x, 0, ARENA.minZ - 0.55);
    this.scene.add(root);
    const speed = ((difficulty === 'low' ? 7.6 : difficulty === 'hard' ? 10.7 : 9.2) + Math.min(1.4, this.boss.phaseRound * 0.12)) * 0.5;
    this.hazards.push({
      root, asset: ring, assetId: 'borrowed-grid-expanding-ring', type: 'cyber-ring',
      x: root.position.x, z: root.position.z, radius: initialRadius, bandHalfWidth, maxRadius: 23.5, speed,
      timer: options.tutorial ? 0.9 : 0.62, struck: false, life: 6.8, tutorial: false, proximity: true,
    });
    this.cyberRingCooldown = difficulty === 'low' ? 4.5 : difficulty === 'hard' ? 2.55 : 3.3;
  }

  cyberDropPoint(index, salt = 0) {
    const start = (this.boss.phaseRound * 5 + this.boss.rounds * 3 + index * 7 + salt * 11) % CYBER_DROP_SLOTS.length;
    const occupied = this.hazards.filter((hazard) => ['cyber-block', 'cyber-ladder'].includes(hazard.type) && !hazard.cut && !hazard.picked);
    for (let step = 0; step < CYBER_DROP_SLOTS.length; step += 1) {
      const [x, z] = CYBER_DROP_SLOTS[(start + step) % CYBER_DROP_SLOTS.length];
      if (occupied.every((hazard) => Math.hypot(x - hazard.x, z - hazard.z) > 3.8)) return [x, z];
    }
    return CYBER_DROP_SLOTS[start];
  }

  cyberLadderDropPoint() {
    const offsets = [[3.2, 0], [-3.2, 0], [0, 3.2], [0, -3.2], [2.6, 2.6], [-2.6, 2.6], [2.6, -2.6], [-2.6, -2.6]];
    const start = this.cyberLaddersSpawned % offsets.length;
    const occupied = this.hazards.filter((hazard) => ['cyber-block', 'cyber-ladder'].includes(hazard.type) && !hazard.cut && !hazard.picked);
    for (let step = 0; step < offsets.length; step += 1) {
      const [dx, dz] = offsets[(start + step) % offsets.length];
      const x = THREE.MathUtils.clamp(this.player.x + dx, ARENA.minX + 1.4, ARENA.maxX - 1.4);
      const z = THREE.MathUtils.clamp(this.player.z + dz, ARENA.minZ + 1.4, ARENA.maxZ - 1.4);
      const playerDistance = Math.hypot(x - this.player.x, z - this.player.z);
      if (playerDistance >= 2.4 && occupied.every((hazard) => Math.hypot(x - hazard.x, z - hazard.z) > 3.2)) return [x, z];
    }
    return [THREE.MathUtils.clamp(this.player.x + 3, ARENA.minX + 1.4, ARENA.maxX - 1.4), THREE.MathUtils.clamp(this.player.z, ARENA.minZ + 1.4, ARENA.maxZ - 1.4)];
  }

  spawnCyberBlock(index, options = {}) {
    const [slotX, slotZ] = this.cyberDropPoint(index, 1);
    const x = options.x ?? slotX;
    const z = options.z ?? slotZ;
    const root = this.telegraphPlane(CYAN, 2.5, 2.5, x, z);
    const block = makePaperCard(this.textureLoader, ch2BlockUrl, 1.55, 1.55, { nearest: true });
    block.position.y = 9; block.rotation.z = 0.28; root.add(block);
    const hazard = { root, asset: block, assetId: 'cyberpunk-parkour-block', type: 'cyber-block', x, z, tutorial: Boolean(options.tutorial), persistentUntilLearned: Boolean(options.tutorial), timer: DIFFICULTY[difficulty].telegraph, struck: false, landed: false, cut: false, life: options.tutorial ? 999 : 4.2 };
    this.hazards.push(hazard);
    return hazard;
  }

  spawnCyberLadder(options = {}) {
    const [slotX, slotZ] = this.cyberLadderDropPoint();
    const x = options.x ?? slotX;
    const z = options.z ?? slotZ;
    const root = this.telegraphPlane(AMBER, 3.2, 3.2, x, z);
    const ladder = makePaperCard(this.textureLoader, ch2LadderUrl, 1.25, 4, { alpha: true, nearest: true });
    ladder.position.y = 10; ladder.rotation.z = 0.08; root.add(ladder);
    const hazard = { root, asset: ladder, assetId: 'cyberpunk-parkour-ladder-original', type: 'cyber-ladder', x, z, tutorial: Boolean(options.tutorial), persistentUntilLearned: Boolean(options.tutorial), timer: DIFFICULTY[difficulty].telegraph * 1.05, struck: false, landed: false, picked: false, life: options.tutorial ? 999 : 9.5 };
    this.hazards.push(hazard);
    this.cyberLaddersSpawned += 1;
    return hazard;
  }

  ensureCyberLadder(reason = 'combat') {
    if (this.phase !== 1 || this.player.ladder || this.cyberOnboarding?.active) return null;
    const existing = this.hazards.find((hazard) => hazard.type === 'cyber-ladder' && !hazard.picked);
    if (existing) return existing;
    const ladder = this.spawnCyberLadder();
    if (reason === 'respawn') this.command('RECOVERY LADDER INBOUND');
    return ladder;
  }

  spawnEchoHole(index) {
    this.showTutorialOnce('echo-collapse', 'IMPACT COLLAPSES THE FLOOR // KEEP MOVING');
    const x = THREE.MathUtils.clamp(this.player.x + THREE.MathUtils.randFloatSpread(7), -10.5, 10.5);
    const z = THREE.MathUtils.clamp(this.player.z + THREE.MathUtils.randFloatSpread(5), -6.5, 6.5);
    const root = this.telegraphPlane(0xb38a52, 3.6, 3.6, x, z);
    root.children[0].geometry.dispose(); root.children[0].geometry = new THREE.RingGeometry(1.35, 1.85, 18);
    const slam = this.cloneAsset(['trash', 'bench', 'speaker'][this.boss.rounds % 3], 2.2, 3.2) || this.cloneAsset('fountain', 2.2, 3.2);
    if (slam) { slam.position.y = 10; root.add(slam); }
    this.hazards.push({ root, asset: slam, assetId: ['crushed-trash-can', 'fountain-bench', 'pa-speaker'][this.boss.rounds % 3], type: 'echo-hole', x, z, timer: DIFFICULTY[difficulty].telegraph * 1.25, struck: false, landed: false, life: 0.9 });
  }

  spawnPigmentObject(index, options = {}) {
    if (this.paintTutorial.stage === 'await-pigment') this.setTutorialHint('HOLD RIGHT CLICK · ABSORB COLOR');
    const x = options.x ?? THREE.MathUtils.clamp(this.player.x + THREE.MathUtils.randFloatSpread(6), -10.5, 10.5);
    const z = options.z ?? THREE.MathUtils.clamp(this.player.z + THREE.MathUtils.randFloatSpread(4), -6.5, 6.5);
    const colors = [0x202126, 0x435d91, 0x4f8f7c];
    const color = colors[(this.boss.rounds + index) % colors.length];
    const root = this.telegraphPlane(color, 2.8, 2.8, x, z);
    const urls = [ch4SootUrl, ch4IndigoUrl, ch4VerdigrisUrl];
    const object = makePaperCard(this.textureLoader, urls[(this.boss.rounds + index) % urls.length], 2.6, 1.6, { alpha: true }); object.position.y = 9; root.add(object);
    this.hazards.push({ root, asset: object, assetId: ['bone-black-region', 'indigo-region', 'verdigris-region'][(this.boss.rounds + index) % 3], type: 'pigment', x, z, color, tutorial: Boolean(options.tutorial), persistentUntilLearned: Boolean(options.tutorial), timer: DIFFICULTY[difficulty].telegraph, struck: false, landed: false, absorbable: false, life: options.tutorial ? 999 : 3.2 });
  }

  spawnPaintSweep(index, options = {}) {
    const vertical = options.vertical ?? (this.boss.rounds + index) % 2 === 0;
    const offset = options.offset ?? (vertical ? THREE.MathUtils.randFloat(-10.5, 10.5) : THREE.MathUtils.randFloat(-5.8, 5.8));
    const colors = [0x202126, 0x435d91, 0x4f8f7c];
    const color = colors[(this.boss.rounds + index) % colors.length];
    const root = this.telegraphPlane(color, vertical ? 1.25 : 29, vertical ? 20 : 1.25, vertical ? offset : 0, vertical ? 0 : offset);
    root.children[0].material.opacity = 0.12;
    this.hazards.push({
      root, asset: root.children[0], assetId: 'painted-country-color-sweep', type: 'paint-sweep', vertical, offset,
      timer: options.timer ?? DIFFICULTY[difficulty].telegraph * 0.82 + index * 0.05, struck: false,
      life: difficulty === 'low' ? 0.5 : 0.68, color,
    });
  }

  spawnPaintCover(index, options = {}) {
    const existing = this.hazards.filter((hazard) => hazard.type === 'paint-cover' && !hazard.destroyed);
    if (existing.length >= 2) return existing[0];
    const x = THREE.MathUtils.clamp(
      options.x ?? this.player.x + (index % 2 === 0 ? 2.65 : -2.65),
      ARENA.minX + 1.5,
      ARENA.maxX - 1.5,
    );
    const z = options.z ?? this.player.z;
    const yaw = options.yaw ?? (options.axis === 'x' ? Math.PI / 2 : 0);
    const root = this.telegraphPlane(0x46618c, 2.7, 2.7, x, z);
    // Each falling card may face any direction. It is a physical obstacle only:
    // color sweeps deliberately pass through it from every direction.
    const tile = makePaperCard(this.textureLoader, ch4IndigoUrl, 2.05, 2.05, { alpha: true, nearest: true });
    tile.position.y = 9;
    tile.rotation.y = yaw;
    tile.rotation.z = index % 2 === 0 ? -0.12 : 0.12;
    root.add(tile);
    const edge = flatBox(2.08, 2.08, 0.1, new THREE.MeshStandardMaterial({
      color: 0x46618c, emissive: 0x1b315c, emissiveIntensity: 0.35, roughness: 0.92,
    }));
    edge.position.y = 9;
    edge.rotation.y = yaw;
    root.add(edge);
    const hazard = {
      root, asset: tile, edge, assetId: 'ch4-indigo-paper-grid-cover', type: 'paint-cover', x, z, yaw,
      timer: 0.16, struck: false, landed: false, life: 5.6,
      color: 0x46618c,
    };
    this.hazards.push(hazard);
    return hazard;
  }

  spawnPaintCoverWave() {
    const round = this.boss.phaseRound;
    const makeGrid = (delay = 0) => {
      const seed = round * 2.399 + delay * 1.731;
      // Grids create an independent obstacle in the route toward the Conductor,
      // never on the laser's lane. The card can land at any compass angle.
      const x = THREE.MathUtils.clamp(this.player.x + Math.sin(seed) * 6.2, ARENA.minX + 1.6, ARENA.maxX - 1.6);
      const z = THREE.MathUtils.clamp(this.player.z - 3.1 - (Math.cos(seed * 1.37) + 1) * 0.55, ARENA.minZ + 1.6, ARENA.maxZ - 1.6);
      const yaw = THREE.MathUtils.euclideanModulo(seed * 1.61, Math.PI * 2);
      this.spawnPaintCover(round + delay, { x, z, yaw });
    };
    const sweepVertical = round % 2 === 0;
    const sweepOffset = sweepVertical
      ? THREE.MathUtils.clamp(this.player.x + Math.cos(round * 1.17) * 7.1, -10.5, 10.5)
      : THREE.MathUtils.clamp(this.player.z + Math.sin(round * 1.17) * 4.4, -5.8, 5.8);
    this.spawnPaintSweep(round, { vertical: sweepVertical, offset: sweepOffset, timer: 1.72 });
    makeGrid();
    if (round >= 3 && round % 2 === 0) makeGrid(0.5);
    this.command(round >= 3 && round % 2 === 0 ? 'TWO GRIDS // DO NOT GET PINNED' : 'INDIGO GRID DROPS // KEEP MOVING');
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
    if (hazard.type === 'paper-train') {
      const dx = p.x - hazard.root.position.x;
      const dz = p.z - hazard.root.position.z;
      const across = dx * hazard.normal.x + dz * hazard.normal.y;
      const along = dx * hazard.direction.x + dz * hazard.direction.y;
      hit = Math.abs(across) < hazard.width && Math.abs(along - hazard.progress) < 5.8;
    }
    if (hazard.type === 'suitcase-rain' || hazard.type === 'cyber-block' || hazard.type === 'cyber-ladder' || hazard.type === 'echo-hole' || hazard.type === 'pigment') hit = Math.hypot(p.x - hazard.x, p.z - hazard.z) < 2.1;
    if (hazard.type === 'laser') hit = hazard.vertical ? Math.abs(p.x - hazard.offset) < 0.55 : Math.abs(p.z - hazard.offset) < 0.55;
    if (hazard.type === 'paint-sweep') {
      hit = hazard.vertical ? Math.abs(p.x - hazard.offset) < 0.78 : Math.abs(p.z - hazard.offset) < 0.78;
    }
    if (hazard.type === 'cyber-ring') hit = Math.abs(Math.hypot(p.x - hazard.x, p.z - hazard.z) - hazard.radius) < 0.52;
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
        hazard.root.children[0].material.opacity = hazard.type === 'laser' ? 0.96 : 0.35;
        if (hazard.type === 'laser' || hazard.type === 'paint-sweep') this.resolveHazard(hazard);
        this.trauma = Math.max(this.trauma, ['suitcase-rain', 'cyber-block', 'cyber-ladder', 'echo-hole', 'pigment'].includes(hazard.type) ? 0.5 : 0.22);
        this.tone(hazard.type === 'paper-train' ? 55 : 96, 0.16, 'square', 0.035);
      }
      if (hazard.struck) {
        if (!hazard.persistentUntilLearned) hazard.life -= dt;
        if (hazard.type === 'paper-train') {
          hazard.progress += hazard.speed * dt;
          hazard.asset.position.x = hazard.progress;
          hazard.asset.position.z = 0;
          this.resolveHazard(hazard);
        } else if (hazard.type === 'cyber-ring') {
          hazard.radius += hazard.speed * dt;
          hazard.asset.geometry.dispose();
          hazard.asset.geometry = new THREE.RingGeometry(
            Math.max(0.05, hazard.radius - hazard.bandHalfWidth),
            hazard.radius + hazard.bandHalfWidth,
            96,
          );
          hazard.asset.material.opacity = Math.min(0.92, 0.5 + Math.sin(this.elapsed * 32) * 0.14);
          this.resolveHazard(hazard);
          if (hazard.radius >= hazard.maxRadius) hazard.life = 0;
        } else if (['suitcase-rain', 'cyber-block', 'cyber-ladder', 'echo-hole', 'pigment', 'paint-cover'].includes(hazard.type) && !hazard.landed) {
          const landingY = hazard.type === 'paint-cover' ? 1.12 : 0.45;
          hazard.asset.position.y = Math.max(landingY, hazard.asset.position.y - 18 * DIFFICULTY[difficulty].speedScale * dt);
          hazard.asset.rotation.z += hazard.type === 'paint-cover' ? dt * 0.4 : dt * 5;
          if (hazard.type === 'paint-cover') hazard.edge.position.y = hazard.asset.position.y;
          if (hazard.asset.position.y <= landingY + 0.01) {
            hazard.landed = true; hazard.absorbable = hazard.type === 'pigment';
            if (hazard.type !== 'paint-cover') this.resolveHazard(hazard);
            if (hazard.type === 'echo-hole') this.addPersistentHole(hazard.x, hazard.z, 1.45 + Math.min(0.35, this.boss.phaseRound * 0.045));
            if (hazard.type === 'suitcase-rain' && hazard.breaksFloor) {
              this.addPersistentHole(hazard.x, hazard.z, 1.35 + Math.min(0.35, this.boss.phaseRound * 0.04));
              hazard.life = Math.min(hazard.life, 0.18);
            }
            this.spawnImpact(hazard.x, 0.4, hazard.z, hazard.color || AMBER);
          }
        }
        if (hazard.type !== 'cyber-ring') hazard.root.children[0].material.opacity = ['laser', 'paint-sweep'].includes(hazard.type) ? Math.max(0, hazard.life * 2.1) : Math.max(0.04, hazard.life * 0.12);
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
      projectile.root.rotation.x += dt * 10; projectile.root.rotation.z += dt * 7;
      if (!projectile.hit && progress >= 1) {
        projectile.hit = true;
        this.hitBoss(projectile.damage, projectile.type === 'player-shot' && this.phase === 3 ? 'rage' : 'pain');
        if (projectile.tutorial) this.completeOnboarding();
      }
    });
    const expired = this.projectiles.filter((projectile) => projectile.life <= 0 || projectile.hit);
    expired.forEach((projectile) => this.scene.remove(projectile.root));
    this.projectiles = this.projectiles.filter((projectile) => projectile.life > 0 && !projectile.hit);
  }

  takeHit() {
    if (this.player.inv > 0 || this.mode !== 'play') return;
    this.player.hp -= 1;
    this.player.inv = 0.95;
    this.player.hitTimer = 0.38;
    this.hitStop = 0.07;
    this.trauma = Math.min(1, this.trauma + 0.55);
    this.spawnImpact(this.player.x, 1.4 + this.player.y, this.player.z, PINK);
    if (flashEnabled) { this.renderer.domElement.classList.add('hit-flash'); setTimeout(() => this.renderer.domElement.classList.remove('hit-flash'), 70); }
    this.tone(63, 0.22, 'sawtooth', 0.055);
    if (this.player.hp <= 0) this.respawnPlayer();
  }

  respawnClearance([x, z]) {
    // A recovery point must be clear of both the lasting collapsed-floor debris
    // and any still-active impact area. This is deliberately broader than the
    // player collision radius, so an invulnerability timer is a grace period,
    // never the only thing preventing an immediate repeat hit.
    const clearances = [];
    (this.activeHoles || []).forEach((hole) => {
      clearances.push(Math.hypot(x - hole.x, z - hole.z) - hole.radius - 0.42);
    });
    (this.hazards || []).forEach((hazard) => {
      if (hazard.type === 'paper-train') return;
      if (!hazard.struck && !hazard.landed) return;
      if (!['suitcase-rain', 'cyber-block', 'cyber-ladder', 'echo-hole', 'pigment', 'laser', 'paint-sweep', 'cyber-ring'].includes(hazard.type)) return;
      if (hazard.type === 'laser' || hazard.type === 'paint-sweep') {
        clearances.push(hazard.vertical ? Math.abs(x - hazard.offset) - 1.2 : Math.abs(z - hazard.offset) - 1.2);
      } else if (hazard.type === 'cyber-ring') {
        clearances.push(Math.abs(Math.hypot(x - hazard.x, z - hazard.z) - hazard.radius) - 0.72);
      } else {
        clearances.push(Math.hypot(x - hazard.x, z - hazard.z) - 2.35);
      }
    });
    return clearances.length ? Math.min(...clearances) : 99;
  }

  findSafeRespawn() {
    const candidates = [[0, 5.2], [-7.5, 5.2], [7.5, 5.2], [-10, 2.8], [10, 2.8], [0, 2.5]];
    const clearance = (point) => this.respawnClearance(point);
    const safeAuthored = candidates.find((point) => clearance(point) >= 1.65);
    if (safeAuthored) return safeAuthored;
    const search = [];
    for (let z = ARENA.maxZ - 0.9; z >= ARENA.minZ + 1.2; z -= 1.15) {
      for (let x = ARENA.minX + 1.2; x <= ARENA.maxX - 1.2; x += 1.2) search.push([x, z]);
    }
    search.sort((a, b) => clearance(b) - clearance(a));
    return search[0] || [0, ARENA.maxZ - 1];
  }

  respawnPlayer() {
    const p = this.player;
    const restartCyberTutorial = this.phase === 1 && this.cyberOnboarding?.active;
    const [x, z] = this.findSafeRespawn();
    this.clearHazards();
    p.hp = p.maxHp;
    p.x = x; p.y = 0; p.z = z; p.vy = 0; p.grounded = true;
    p.ammo = 0; p.ladder = false; p.color = 0;
    p.attack = 0; p.attackCd = 0; p.dash = 0; p.dashCd = 0;
    p.respawns += 1;
    p.respawnInv = DIFFICULTY[difficulty].respawnInv;
    p.inv = Math.max(p.inv, p.respawnInv);
    this.playerRoot.position.set(x, 0, z);
    this.ladderWeapon.visible = false;
    if (this.dialogueChoices) { this.dialogueChoices.classList.add('hidden'); this.dialogueChoices.innerHTML = ''; }
    this.dialogueOpen = false;
    this.dialoguePause = false;
    this.boss.hp = this.boss.phaseStartHp ?? PHASE_START_HP[this.phase];
    this.boss.exposed = 0;
    this.boss.phaseRound = 0;
    this.boss.paintCoverage = this.phase === 3 ? THREE.MathUtils.clamp((100 - this.boss.hp) / 88, 0, 1) : 0;
    this.updatePaintCreep();
    this.boss.attackClock = Math.max(this.boss.attackClock, p.respawnInv + 0.55);
    if (this.phase === 1) {
      if (restartCyberTutorial) {
        Object.assign(this.cyberOnboarding, { active: false, stage: 'pending', target: null, blocksCut: 0, approachRingTriggered: false });
        this.startCyberOnboarding();
      } else {
        this.ensureCyberLadder('respawn');
        this.boss.attackClock = Math.max(this.boss.attackClock, p.respawnInv + 1.25);
      }
    }
    this.hitStop = 0.1;
    this.trauma = 0.25;
    this.spawnImpact(x, 1.1, z, CYAN);
    this.tone(220, 0.28, 'triangle', 0.045);
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
      // A non-lethal collapse used to put the player back at the fixed opening
      // spot, which can itself be covered by rubble or an active strike. Use
      // the same danger-aware search as a full death; a full respawn has
      // already placed the player safely, so do not overwrite it.
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
    this.respawnShield.visible = p.respawnInv > 0;
    if (this.respawnAura.visible) {
      const pulse = 1 + Math.sin(this.elapsed * 10) * 0.12;
      this.respawnAura.scale.setScalar(pulse);
      this.respawnAura.material.opacity = 0.24 + Math.abs(Math.sin(this.elapsed * 8)) * 0.48;
      this.respawnAura.rotation.z += dt * 1.8;
      this.respawnShield.scale.setScalar(0.96 + Math.sin(this.elapsed * 7) * 0.045);
      this.respawnShield.material.opacity = 0.1 + Math.abs(Math.sin(this.elapsed * 6)) * 0.18;
      this.respawnShield.rotation.y += dt * 0.8;
    }
    const targetYaw = this.phase === 2 ? Math.atan2(p.facingX, p.facingZ) : p.facingX < -0.1 ? -0.32 : p.facingX > 0.1 ? 0.32 : 0;
    this.playerRoot.rotation.y = THREE.MathUtils.lerp(this.playerRoot.rotation.y, targetYaw, 1 - Math.exp(-dt * 14));
    this.puppet.update(dt, Boolean(dx || dz), p.grounded, p.attack > 0, p.hitTimer > 0, p.facingX);
    if (this.player.ladder) {
      this.ladderWeapon.position.set(p.x, 1.45 + p.y, p.z - 0.4);
      this.ladderWeapon.rotation.set(0, this.playerRoot.rotation.y, -0.08 + Math.sin(this.elapsed * 9) * 0.025);
    }
    if (this.phase === 2) {
      const moving = Boolean(dx || dz);
      const butchAction = this.butchLandTimer > 0
        ? 'Jump_Land'
        : !p.grounded
          ? (p.vy > 1.2 ? 'Jump_Start' : 'Jump_Loop')
          : moving
            ? 'Walk_Loop'
            : 'Idle_Loop';
      this.playButchAction(butchAction, butchAction === 'Jump_Land');
      if (this.butchAction && butchAction === 'Walk_Loop') this.butchAction.setEffectiveTimeScale(1.3);
      this.butchRoot.rotation.z = p.hitTimer > 0 ? Math.sin(this.elapsed * 48) * 0.12 : 0;
      this.butchRoot.position.y = 0;
    }
    this.updateOnboardingHint();
    this.updateCyberOnboardingHint();
  }

  updateBoss(dt) {
    this.boss.inv = Math.max(0, this.boss.inv - dt);
    this.boss.exposed = Math.max(0, this.boss.exposed - dt);
    this.boss.stagger = Math.max(0, this.boss.stagger - dt);
    if (!this.onboarding?.active && !this.cyberOnboarding?.active && !this.echoRecital.active) this.boss.attackClock -= dt;
    if (this.phase === 2 && !this.echoRecital.active && !this.dialogueOpen) {
      this.echoCombatClock = Math.max(0, this.echoCombatClock - dt);
      const countdown = Math.max(1, Math.ceil(this.echoCombatClock));
      if (countdown !== this.echoRecital.countdownShown) {
        this.echoRecital.countdownShown = countdown;
        this.command(`NEXT VERSE IN ${countdown}`);
      }
      if (this.echoCombatClock <= 0) {
        this.clearHazards();
        this.echoRecital.active = true;
        this.boss.exposed = 999;
        this.boss.attackClock = 999;
        this.openDialogue('combat-timer');
      }
    }
    this.boss.gestureTime = Math.max(0, this.boss.gestureTime - dt);
    this.boss.flash = Math.max(0, this.boss.flash - dt);
    if (this.phase === 1) {
      this.cyberRingCooldown = Math.max(0, this.cyberRingCooldown - dt);
      const approachingFront = this.player.z < -2.35;
      const ringActive = this.hazards.some((hazard) => hazard.type === 'cyber-ring');
      const tutorialCarryApproach = this.cyberOnboarding?.active && this.cyberOnboarding.stage === 'carry' && !this.cyberOnboarding.approachRingTriggered;
      const combatApproach = !this.cyberOnboarding?.active;
      if ((tutorialCarryApproach || combatApproach) && approachingFront && !ringActive && this.cyberRingCooldown <= 0) {
        if (tutorialCarryApproach) this.cyberOnboarding.approachRingTriggered = true;
        this.showTutorialOnce('cyber-ring', 'EXPANDING LASER // JUMP');
        this.spawnCyberRingLaser({ tutorial: tutorialCarryApproach });
      }
    }
    if (this.pendingCommand) {
      this.pendingCommand.time -= dt;
      if (this.pendingCommand.time <= 0) {
        const command = this.pendingCommand; this.pendingCommand = null;
        if (command.phase === 0) {
          if (command.chapterOneWindow) {
            const pressure = Math.min(4, Math.floor((this.boss.phaseRound - 1) / 2));
            const totalCases = Math.max(3, 4 + pressure + (difficulty === 'hard' ? 2 : difficulty === 'low' ? -1 : 0));
            for (let i = 0; i < totalCases; i += 1) this.spawnSuitcaseRain(i, i >= 2 && ((i + this.boss.phaseRound) % 2 === 0 || i === totalCases - 1));
          } else {
            this.spawnPaperTrainPattern(this.boss.phaseRound - 1);
            const chaseCases = Math.min(5, 1 + Math.floor(this.boss.phaseRound / 2));
            for (let i = 0; i < chaseCases; i += 1) this.spawnSuitcaseRain(i, i > 0 && (i + this.boss.phaseRound) % 2 === 0);
          }
        } else {
          for (let i = 0; i < command.count; i += 1) {
            if (command.phase === 1) {
              this.spawnCyberLaser(i);
              if (i < Math.max(3, command.count - 1)) this.spawnCyberBlock(i);
            } else if (command.phase === 2) this.spawnEchoHole(i);
            else this.spawnPigmentObject(i);
          }
          if (command.phase === 1) this.ensureCyberLadder('combat');
          if (command.phase === 3) this.spawnPaintCoverWave();
        }
      }
    }
    const orbit = Math.sin(this.elapsed * (0.32 + this.phase * 0.04)) * 2.2;
    this.boss.x = THREE.MathUtils.lerp(this.boss.x, orbit, 1 - Math.exp(-dt * 0.9));
    this.boss.z = CONDUCTOR_Z;
    this.conductorRoot.position.x = this.boss.x;
    this.conductorRoot.position.z = CONDUCTOR_Z;
    this.conductorRoot.position.y = -2.8 + (this.boss.reaction === 'pain' ? -Math.sin(this.boss.gestureTime * Math.PI) * 0.7 : 0);
    this.conductorRoot.rotation.y = Math.atan2((this.player.x - this.boss.x) * 0.15, this.player.z - this.boss.z);
    const reactionRoll = this.boss.reaction === 'shame' ? -0.08 : this.boss.reaction === 'rage' || this.boss.reaction === 'anger' ? 0.1 : 0;
    this.conductorRoot.rotation.z = this.boss.gestureTime > 0 ? reactionRoll + (this.boss.stagger > 0 ? Math.sin(this.elapsed * 45) * 0.08 : 0) : 0;
    this.conductorPaper.update(
      dt,
      Math.abs(this.boss.x - orbit) > 0.01,
      true,
      Boolean(this.pendingCommand || (this.boss.gestureTime > 0 && this.boss.reaction === 'idle')),
      this.boss.reaction !== 'idle',
      this.player.x - this.boss.x,
    );
    const paperFace = this.conductorPaper.cards[this.phase]?.face;
    if (paperFace?.material?.emissive) {
      paperFace.material.emissive.setHex(this.boss.flash > 0 ? (this.boss.reaction === 'shame' ? 0x723344 : 0xffffff) : 0x000000);
      paperFace.material.emissiveIntensity = this.boss.flash > 0 ? 0.8 : 0;
    }
    this.conductorModel?.traverse((child) => {
      if (!child.isMesh || !child.material?.emissive) return;
      child.material.emissive.setHex(this.boss.flash > 0 ? (this.boss.reaction === 'shame' ? 0x723344 : 0xffffff) : 0x000000);
      child.material.emissiveIntensity = this.boss.flash > 0 ? 0.8 : 0;
    });
    this.updatePaintCreep();
    if (this.boss.gestureTime <= 0 && this.boss.reaction !== 'idle') { this.boss.reaction = 'idle'; this.playConductorAction('Idle_Loop'); }
    if (!this.onboarding?.active && !this.cyberOnboarding?.active && !this.echoRecital.active && this.boss.attackClock <= 0) this.spawnBeat();
  }

  updateEffects(dt) {
    this.effects.forEach((effect) => {
      effect.life -= dt;
      if (effect.type === 'arc') {
        effect.root.scale.multiplyScalar(1 + dt * 7);
        effect.root.material.opacity = Math.max(0, effect.life * 5);
      } else {
        effect.root.userData.velocity.y -= 15 * dt;
        effect.root.position.addScaledVector(effect.root.userData.velocity, dt);
        effect.root.rotation.x += dt * 9;
        effect.root.rotation.z += dt * 7;
        effect.root.material.opacity = Math.max(0, effect.life * 2);
        effect.root.material.transparent = true;
      }
    });
    const expired = this.effects.filter((effect) => effect.life <= 0);
    expired.forEach((effect) => this.scene.remove(effect.root));
    this.effects = this.effects.filter((effect) => effect.life > 0);
  }

  update(dt) {
    this.conductorMixer?.update(dt);
    this.butchMixer?.update(dt);
    if (this.mode === 'play' && this.transition?.kind === 'system-gate') {
      this.elapsed += dt;
      this.updateTransition(dt);
      return;
    }
    if (this.mode === 'departure') {
      this.elapsed += dt;
      this.updatePlayer(this.departureBoardable ? dt * 0.36 : dt);
      this.updateRescue(dt);
      return;
    }
    if (this.mode === 'cinematic') { this.elapsed += dt; this.updateRescue(dt); return; }
    if (this.mode !== 'play') return;
    if (this.dialoguePause) {
      this.elapsed += dt * 0.08;
      this.updateEffects(dt * 0.08);
      return;
    }
    if (this.hitStop > 0) { this.hitStop -= dt; return; }
    this.elapsed += dt;
    if (this.updateTransition(dt)) { this.updateEffects(dt); return; }
    this.updatePlayer(dt);
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
    } else if (!this.transition) {
      const ideal = new THREE.Vector3(this.player.x * 0.12, 11.8 + this.player.y * 0.15, 19.8 + this.player.z * 0.06);
      const target = new THREE.Vector3((this.player.x + this.boss.x) * 0.12, 3.4, -5.2);
      this.camera.position.lerp(ideal, 1 - Math.exp(-dt * 3.5));
      this.cameraTarget.lerp(target, 1 - Math.exp(-dt * 4));
    }
    this.trauma = Math.max(0, this.trauma - dt * 1.45);
    const shake = shakeEnabled ? this.trauma * this.trauma : 0;
    const position = this.camera.position.clone();
    position.x += Math.sin(this.elapsed * 47) * shake * 0.42;
    position.y += Math.sin(this.elapsed * 61) * shake * 0.22;
    this.camera.position.copy(position);
    this.camera.lookAt(this.cameraTarget);
  }

  updateHud() {
    if (!['play', 'departure', 'cinematic'].includes(this.mode)) return;
    const pct = Math.max(0, this.boss.hp / this.boss.maxHp) * 100;
    this.bossFill.style.width = `${pct}%`;
    const delayed = Number(this.bossDelay.dataset.value || 100);
    const next = delayed + (pct - delayed) * 0.07;
    this.bossDelay.dataset.value = String(next);
    this.bossDelay.style.width = `${next}%`;
    this.bossState.textContent = this.boss.exposed > 0 ? 'EXPOSED' : `MOVEMENT ${this.phase + 1}`;
    this.phaseLabel.textContent = PHASES[this.phase].title;
    this.worldLabel.textContent = PHASES[this.phase].world;
    this.formLabel.textContent = `${this.puppet.form} FORM`;
    this.paperHealth.innerHTML = Array.from({ length: this.player.maxHp }, (_, i) => `<i class="${i < this.player.hp ? 'full' : 'torn'}"></i>`).join('');
    this.abilityLabel.textContent = this.player.respawnInv > 0
      ? `INVULNERABLE ${this.player.respawnInv.toFixed(1)}`
      : this.phase === 3
        ? `HOLD RMB ABSORB ${this.player.color}/3 · HOLD LMB RETURN · INDIGO GRIDS BLOCK YOUR PATH`
        : this.player.dashCd > 0 ? `SPACE · DASH ${this.player.dashCd.toFixed(1)}` : 'SPACE · DASH READY';
  }

  render(dt = 1 / 60) {
    this.updateCamera(dt);
    this.updateHud();
    this.renderer.render(this.scene, this.camera);
  }

  animate(now) {
    requestAnimationFrame(this.animate);
    const dt = Math.min(0.033, Math.max(0, (now - this.lastFrame) / 1000));
    this.lastFrame = now;
    if (globalThis.NIGHTFALL_PAUSED) {
      this.render(0);
      return;
    }
    this.update(dt);
    this.render(dt);
  }

  finish(won) {
    this.mode = 'end';
    this.hud.classList.add('hidden');
    this.stopMusic();
    const revealResult = () => {
      document.querySelector('#result-kicker').textContent = won ? 'THE SKETCH TRAIN IS ABOARDING' : 'THE LINE TAKES YOU';
      document.querySelector('#result-title').textContent = won ? 'THE NIGHT TRAIN LEAVES' : 'PAPER TORN';
      document.querySelector('#result-copy').textContent = won ? 'The paper doors close. The line continues.' : 'Read the Conductor’s hands, move before impact, and use each world against him.';
      document.querySelector('#result').classList.remove('hidden');
    };
    if (!won) {
      revealResult();
      return;
    }
    playCinematic({
      id: 'ending',
      src: CINEMATICS.ending,
      label: 'NIGHTFALL ending cinematic',
      preserveBlackout: true,
      onComplete: () => showEndCredits(),
    });
  }

  tone(frequency, duration, type = 'sine', volume = 0.03) {
    if (!soundEnabled) return;
    try {
      this.audioContext ||= new AudioContext();
      const oscillator = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      oscillator.type = type; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(volume, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.audioContext.currentTime + duration);
      oscillator.connect(gain).connect(this.audioContext.destination);
      oscillator.start(); oscillator.stop(this.audioContext.currentTime + duration);
    } catch {}
  }

  playMusic(cue) {
    if (!cue || !soundEnabled) return;
    // This is called from the start/phase input path. Claiming here closes the
    // focus race where the page reported a cue but its Audio element was paused.
    audioFocus.claim();
    if (cue.id === BOSS_SCORE.falseBossVerdi.id) {
      // Phase changes inside the false boss must not replace Dies Irae early.
      if (this.falseBossScoreStarted && music.currentId()) return;
      this.falseBossScoreStarted = true;
      this.falseBossScoreLocked = true;
      this.currentMusic = cue;
      music.play(`final-boss-${cue.id}`, {
        ...cue,
        onThen: () => { this.falseBossScoreLocked = false; },
      });
      return;
    }
    if (this.falseBossScoreLocked) this.falseBossScoreLocked = false;
    this.currentMusic = cue;
    music.play(`final-boss-${cue.id}`, { ...cue, loop: cue.loop !== false });
  }

  stopMusic() { music.stop({ fade: 1.8 }); }

  previewPhase(index) {
    if (this.onboarding?.active) {
      this.onboarding.active = false;
      this.onboarding.stage = 'skipped-for-preview';
      this.onboarding.caseHazard = null;
      this.hideTutorialHint();
    }
    if (this.cyberOnboarding?.active) {
      this.cyberOnboarding.active = false;
      this.cyberOnboarding.stage = 'skipped-for-preview';
      this.cyberOnboarding.target = null;
      this.hideTutorialHint();
    }
    this.phase = THREE.MathUtils.clamp(Math.round(index), 0, 3);
    this.boss.phaseRound = 0;
    this.setWorld(this.phase);
    this.setConductorWorld(this.phase, true);
    this.puppet.setForm(this.phase, true);
    this.boss.hp = Math.max(1, 400 - this.phase * 100 - 38);
    this.boss.exposed = 3;
    this.player.x = 0; this.player.y = 0; this.player.z = 5.8;
    this.playerRoot.position.set(0, 0, 5.8);
    this.boss.x = 0; this.boss.z = CONDUCTOR_Z; this.conductorRoot.position.set(0, -2.8, CONDUCTOR_Z);
    this.clearHazards();
    if (this.phase === 0) this.spawnPaperTrainPattern(1, true);
    if (this.phase === 1) { this.spawnCyberLaser(0); this.spawnCyberBlock(0); }
    if (this.phase === 2) this.spawnEchoHole(0);
    if (this.phase === 3) this.startPaintOnboarding();
    this.command(PHASES[this.phase].verb);
  }
}

const game = new SpectacleBattle(document.querySelector('#game'));
installPauseMenu({ checkpointId: 'chapter-6-start' });
createSaveStore().markCheckpoint('chapter-6-start');

// Chapter 5 already supplies the menu-to-boss transition through its red-lit
// collapse and black threshold. Arriving from that route therefore reveals
// the arena directly instead of inserting a second title/menu interruption.
const conductorTestMovement = requestedConductorTestMovement();
if (new URLSearchParams(window.location.search).get('from') === 'chapter5') {
  const curtain = document.createElement('div');
  curtain.className = 'nf-entry-blackout';
  curtain.innerHTML = '<span>ASSEMBLING ALL WORLDS</span><small>THE FINAL ARCHIVE IS OPENING</small>';
  document.body.append(curtain);
  document.querySelector('#menu').classList.add('hidden');
  game.assetsPromise.finally(() => {
    game.begin();
    requestAnimationFrame(() => requestAnimationFrame(() => curtain.classList.add('is-revealed')));
    window.setTimeout(() => curtain.remove(), 1400);
  });
} else if (conductorTestMovement !== null) {
  document.querySelector('#menu').classList.add('hidden');
  game.assetsPromise.finally(() => game.begin({ movement: conductorTestMovement }));
}

window.render_game_to_text = () => JSON.stringify({
  chapter: 'chapter06-final-boss', renderer: 'three.js-spectacle-combat', coordinates: '+x right, +y up, +z toward camera; all units metres',
  mode: game.mode, difficulty, phase: game.phase, phaseTitle: PHASES[game.phase].title, activeWorld: PHASES[game.phase].world,
  music: music.qa(),
  assetsReady: game.assetsReady,
  player: { x: +game.player.x.toFixed(2), y: +game.player.y.toFixed(2), z: +game.player.z.toFixed(2), form: game.puppet.form, action: game.phase === 2 ? game.butchActionState : game.puppet.action, butchAnimation: game.phase === 2 ? game.butchActionState : null, hpLayers: game.player.hp, maxHpLayers: game.player.maxHp, grounded: game.player.grounded, ammo: game.player.ammo, color: game.player.color, ladder: game.player.ladder, invulnerableSeconds: +game.player.inv.toFixed(2), respawnInvulnerableSeconds: +game.player.respawnInv.toFixed(2), respawns: game.player.respawns, phaseHeals: game.player.phaseHeals, turnYaw: +game.playerRoot.rotation.y.toFixed(2), dashCooldownMs: Math.round(game.player.dashCd * 1000), attackCooldownMs: Math.round(game.player.attackCd * 1000) },
  arena: { bounds: ARENA, rearEdgeZ: -8, staticCombatProps: game.phase === 2 ? Math.max(0, game.worldRoots[2].children.length - 1) : 0, safeAreaRatio: +Math.max(0.28, 1 - (game.activeHoles || []).reduce((loss, hole) => loss + hole.radius * 0.055, 0)).toFixed(2), holes: (game.activeHoles || []).map((h) => ({ x: +h.x.toFixed(2), z: +h.z.toFixed(2), radius: h.radius, visual: h.visual.userData.kind || 'unknown' })) },
  boss: { id: 'the-conductor', form: game.conductorRoot.userData.form, x: +game.boss.x.toFixed(2), z: +game.boss.z.toFixed(2), outsideArena: game.boss.z < ARENA.minZ - 4, hp: game.boss.hp, maxHp: game.boss.maxHp, phaseStartHp: game.boss.phaseStartHp, paintCoverage: +game.boss.paintCoverage.toFixed(2), paintStripsVisible: game.paintCreep.children.filter((strip) => strip.visible).length, exposed: game.boss.exposed > 0, exposedSeconds: +game.boss.exposed.toFixed(2), gesture: game.boss.gesture, reaction: game.boss.reaction, lastDamageCause: game.boss.lastDamageCause || null, attackRound: game.boss.rounds, phaseRound: game.boss.phaseRound },
  onboarding: { active: Boolean(game.onboarding?.active), stage: game.onboarding?.stage || null, combatPaused: Boolean(game.onboarding?.active) },
  cyberOnboarding: { active: Boolean(game.cyberOnboarding?.active), stage: game.cyberOnboarding?.stage || null, blocksCut: game.cyberOnboarding?.blocksCut || 0, combatPaused: Boolean(game.cyberOnboarding?.active), laddersSpawned: game.cyberLaddersSpawned, ladderStrikes: game.cyberLadderStrikes },
  transition: game.transition ? (game.transition.kind === 'system-gate'
    ? { kind: 'system-gate', nextWorld: PHASES[game.transition.nextPhase].world, stage: game.transition.stage, selectedTiles: [...game.transition.selected], failures: game.transition.failures, captchaSet: game.transition.captchaSet }
    : { kind: 'world-fall', nextWorld: PHASES[game.transition.nextPhase].world, progress: +(game.transition.time / game.transition.duration).toFixed(2), giantHoleRadius: +(game.portal.scale.x).toFixed(2) }) : null,
  ui: { overheadPromptVisible: game.commandLabel.classList.contains('show'), commandText: game.commandLabel.textContent, tutorialVisible: game.tutorialHint.classList.contains('show'), tutorialText: game.tutorialHint.textContent, tutorialsShown: [...(game.tutorialShown || [])], dialogueOpen: game.dialogueOpen, combatPausedForDialogue: game.dialoguePause, echoOutcome: game.echoOutcome, echoQuiz: { attempts: game.echoQuiz.attempts, correct: game.echoQuiz.correct, questionId: game.echoQuiz.current?.id || null, correctChoice: game.echoQuiz.current?.correct ?? null }, echoRecital: { active: game.echoRecital.active, combatSeconds: +game.echoCombatClock.toFixed(2) }, voice: game.voiceState, paintTutorialStage: game.paintTutorial?.stage || null, paintHold: { active: game.paintHold.active, button: game.paintHold.button, progress: +Math.min(1, game.paintHold.elapsed / PAINT_HOLD_SECONDS).toFixed(2), completed: game.paintHold.completed, transferVisible: game.paintTransfer.visible, strandsVisible: game.paintTransfer.children.filter((item) => !item.userData.paintDroplet && item.visible).length, dropletsVisible: game.paintTransfer.children.filter((item) => item.userData.paintDroplet && item.visible).length } },
  hazards: game.hazards.map((h) => { const world = h.type === 'paper-train' ? h.asset.getWorldPosition(new THREE.Vector3()) : null; return { type: h.type, assetId: h.assetId, patternId: h.patternId || null, breaksFloor: Boolean(h.breaksFloor), usable: Boolean(h.usable), picked: Boolean(h.picked), motion: h.type === 'paper-train' ? (Math.abs(h.direction.y) < 0.08 ? 'horizontal' : Math.abs(h.direction.x) < 0.08 ? 'vertical' : 'diagonal') : h.type === 'cyber-ring' ? 'expanding-ring' : h.struck ? (h.type === 'laser' ? 'horizontal' : 'vertical') : 'telegraph', radius: h.type === 'cyber-ring' ? +h.radius.toFixed(2) : null, speed: h.type === 'cyber-ring' ? +h.speed.toFixed(2) : null, bandWidth: h.type === 'cyber-ring' ? +(h.bandHalfWidth * 2).toFixed(2) : null, warningAngle: h.type === 'paper-train' ? +Math.atan2(h.direction.y, h.direction.x).toFixed(3) : null, travelAngle: h.type === 'paper-train' ? +Math.atan2(h.direction.y, h.direction.x).toFixed(3) : null, cardLocalYaw: h.type === 'paper-train' ? +h.asset.rotation.y.toFixed(3) : null, yaw: h.type === 'paint-cover' ? +h.yaw.toFixed(3) : null, state: h.landed ? 'landed' : h.struck ? 'moving' : 'telegraph', collisionActive: Boolean(h.struck && !h.hitChecked), consumed: Boolean(h.cut || h.opened || h.picked || h.destroyed || (h.type === 'pigment' && h.landed && !h.absorbable)), obstacle: h.type === 'paint-cover', x: +(world?.x ?? h.x ?? h.root.position.x).toFixed(2), y: +(world?.y ?? h.asset?.position.y ?? 0).toFixed(2), z: +(world?.z ?? h.z ?? h.root.position.z).toFixed(2), seconds: +Math.max(0, h.timer).toFixed(2) }; }),
  rescue: { stage: game.mode === 'departure' ? 'painted-train-arrival' : game.mode === 'cinematic' ? 'train-departure' : null, maraVisible: false, trainVisible: game.departureTrain.visible, trainX: +game.departureTrain.position.x.toFixed(2), slowMotion: Boolean(game.departureBoardable), promptVisible: !game.rescuePrompt.classList.contains('hidden') },
  controls: { move: 'WASD/arrows', contextAction: 'Space: interact/jump in movements I-III; movement IV uses hold right mouse to absorb aimed pigment and hold left mouse to return it', dash: 'Shift/X', fullscreen: 'F' },
  assetErrors: game.assetErrors,
});

window.advanceTime = (ms) => {
  const steps = Math.max(1, Math.round(ms / (1000 / 60)));
  for (let i = 0; i < steps; i += 1) game.update(1 / 60);
  game.render();
};

window.setFinalBossPreviewPhase = (phase) => { if (game.mode === 'play') { game.previewPhase(phase); game.render(); } };
window.startFinalBossCyberTutorial = () => {
  if (game.mode !== 'play') return;
  if (game.onboarding?.active) { game.onboarding.active = false; game.onboarding.stage = 'skipped-for-cyber-tutorial'; }
  game.phase = 1;
  game.setWorld(1);
  game.puppet.setForm(1, true);
  game.cyberOnboarding = { active: false, stage: 'pending', target: null, blocksCut: 0 };
  game.startCyberOnboarding();
  game.render();
};
window.setFinalBossCombatPose = () => {
  if (game.mode !== 'play' || game.transition) return;
  game.player.x = game.boss.x;
  game.player.z = game.boss.z + 2.45;
  game.player.y = 0;
  game.player.vy = 0;
  game.player.grounded = true;
  game.player.facingX = 0;
  game.player.facingZ = -1;
  game.playerRoot.position.set(game.player.x, 0, game.player.z);
  game.boss.exposed = 2;
  game.render();
};
window.setFinalBossPlayerPosition = (x, z) => {
  game.player.x = THREE.MathUtils.clamp(Number(x), ARENA.minX, ARENA.maxX);
  game.player.z = THREE.MathUtils.clamp(Number(z), ARENA.minZ, ARENA.maxZ);
  game.playerRoot.position.set(game.player.x, game.player.y, game.player.z);
  game.render();
};
window.setFinalBossPlayerInvulnerable = (enabled = true) => {
  game.player.inv = enabled ? 999 : 0;
  game.player.hp = game.player.maxHp;
  game.render();
};
window.damageFinalBossPlayer = (amount = 1) => {
  if (game.mode !== 'play') return;
  if (game.player.respawnInv > 0) { game.takeHit(); game.render(); return; }
  for (let i = 0; i < Math.max(1, Math.round(Number(amount) || 1)); i += 1) {
    game.player.inv = 0;
    game.takeHit();
    if (game.player.respawnInv > 0) break;
  }
  game.render();
};
window.damageFinalBoss = (amount = 25) => { if (game.mode === 'play') { game.hitBoss(amount); game.render(); } };
window.setFinalBossPaintCharge = (amount = 3) => { if (game.mode === 'play' && game.phase === 3) { game.player.color = Math.max(0, Math.min(3, Number(amount) || 0)); game.render(); } };
window.rightClickFinalBossPigment = (x, z, holdMs = 800, release = true) => { if (game.mode === 'play' && game.phase === 3) { game.paintHold = { active: true, button: 2, elapsed: 0, point: new THREE.Vector3(Number(x), 0, Number(z)), target: null, completed: false }; game.updatePaintTransfer(0); game.advancePaintHold(Number(holdMs)); if (release) game.releasePaintPointer({ button: 2 }); game.render(); } };
window.leftClickFinalBossPaint = (holdMs = 800, release = true) => { if (game.mode === 'play' && game.phase === 3) { game.paintHold = { active: true, button: 0, elapsed: 0, point: null, target: null, completed: false }; game.updatePaintTransfer(0); game.advancePaintHold(Number(holdMs)); if (release) game.releasePaintPointer({ button: 0 }); game.render(); } };
window.releaseFinalBossPaintPointer = () => { if (game.paintHold.active) game.releasePaintPointer({ button: game.paintHold.button }); game.render(); };
window.addFinalBossTestHole = (x, z, radius = 1.5) => { if (game.mode === 'play') { game.addPersistentHole(Number(x), Number(z), Number(radius)); game.render(); } };
window.forceFinalBossPattern = (pattern) => {
  const map = { train: () => game.spawnPaperTrainPattern(0, true), 'train-diagonal': () => game.spawnPaperTrainPattern(1, true), 'train-vertical': () => game.spawnPaperTrainPattern(2, true), 'train-double': () => game.spawnPaperTrainPattern(3, true), 'train-cross': () => game.spawnPaperTrainPattern(4, true), 'train-triple': () => game.spawnPaperTrainPattern(5, true), suitcase: () => game.spawnSuitcaseRain(0), laser: () => game.spawnCyberLaser(0), 'ring-laser': () => game.spawnCyberRingLaser(), block: () => game.spawnCyberBlock(0), hole: () => game.spawnEchoHole(0), pigment: () => game.spawnPigmentObject(0), 'pigment-near': () => game.spawnPigmentObject(0, { x: game.player.x + 1, z: game.player.z - 1 }), cover: () => game.spawnPaintCover(0, { x: game.player.x + 2.65, z: game.player.z, axis: 'x' }), 'cover-sweep': () => { const x = game.player.x + 2.65; game.spawnPaintCover(0, { x, z: game.player.z, axis: 'x' }); game.spawnPaintSweep(0, { vertical: false, offset: game.player.z }); game.player.x = x + 1.1; game.playerRoot.position.x = game.player.x; }, 'wall-wave': () => game.spawnPaintCoverWave() };
  game.clearHazards();
  game.boss.attackClock = 999;
  map[pattern]?.(); game.render();
};
window.forceFinalBossAttackWindow = () => { game.boss.exposed = 4; game.render(); };
window.setFinalBossPhaseRound = (round) => { game.boss.phaseRound = Math.max(0, Math.round(Number(round) || 0)); game.render(); };
window.forceFinalBossNaturalBeat = () => { if (game.mode === 'play' && !game.transition) { game.clearHazards(); game.boss.attackClock = 0; game.spawnBeat(); game.render(); } };
window.triggerFinalBossRescue = () => { game.phase = 3; game.setWorld(3); game.boss.hp = 10; game.startRescueSequence(); game.render(); };
window.triggerFinalBossWorldFall = (nextPhase = Math.min(3, game.phase + 1)) => { if (game.mode === 'play' && nextPhase > game.phase) game.startWorldTransition(nextPhase); };
window.triggerFinalBossSystemGate = () => {
  if (game.mode !== 'play') return;
  game.phase = 1; game.setWorld(1); game.puppet.setForm(1, true); game.startSystemGateTransition(2); game.render();
};

document.querySelectorAll('.segmented').forEach((group) => group.addEventListener('click', (event) => {
  if (!event.target.matches('button')) return;
  group.querySelectorAll('button').forEach((button) => button.classList.toggle('active', button === event.target));
  const value = event.target.dataset.value;
  if (group.id === 'difficulty') difficulty = value;
  if (group.id === 'shake') shakeEnabled = value === 'on';
  if (group.id === 'flash') flashEnabled = value === 'on';
}));

document.querySelector('#start').addEventListener('click', () => { document.querySelector('#menu').classList.add('hidden'); game.begin(); });
document.querySelector('#again').addEventListener('click', () => {
  document.querySelector('#result').classList.add('hidden'); document.querySelector('#menu').classList.remove('hidden');
  game.clearCombat(); game.mode = 'menu'; game.hud.classList.add('hidden'); game.setWorld(0);
});
document.querySelector('#mute').addEventListener('click', (event) => {
  soundEnabled = !soundEnabled; event.target.textContent = soundEnabled ? 'SOUND ON' : 'SOUND OFF';
  if (!soundEnabled) game.stopMusic(); else game.playMusic(PHASES[game.phase].music);
});
