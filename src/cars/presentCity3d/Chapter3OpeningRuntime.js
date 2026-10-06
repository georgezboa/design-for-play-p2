import * as THREE from 'three';

import {
  ARRIVAL_BEFORE_CARD,
  ARRIVAL_DIALOGUE,
  BOARDED_DIALOGUE,
  BOARDING_DIALOGUE,
  CAMPFIRE_SELINE_DIALOGUE,
  CAMPFIRE_SELINE_STONE_DIALOGUE,
  CHAPTER3_OBJECTIVES as OBJECTIVES,
  CHAPTER_END_CARD,
  CUT_INTERFACE_CONCLUSION,
  CUT_INTERFACE_OPENING,
  CUT_INTERFACE_RESPONSES,
  EDA_CONCLUSION,
  EDA_OPENING,
  EDA_TOPIC_RESPONSES,
  HANA_CONCLUSION,
  HANA_OPENING,
  HANA_TOPIC_RESPONSES,
  HOTEL_ARRIVAL_DIALOGUE,
  LEV_INTRO_DIALOGUE,
  MARKET_CROSSED_DIALOGUE,
  MORNING_LEV_REMINDER,
  MORNING_STONE_PICKUP,
  NIGHT_FIRST_LINE,
  NIGHT_SECOND_LINE,
  NIGHT_WAKE_DIALOGUE,
  NIKA_CONCLUSION,
  NIKA_OPENING,
  NIKA_TOPIC_RESPONSES,
  OLEK_WALK_BARKS,
  OPENING_POSITIONS,
  SAVA_LOOK,
  SCANNER_FIELDS,
  SCANNER_WORDS,
  SEAM_CONCLUSION,
  SEAM_DIALOGUE,
  SEAM_TOPIC_RESPONSES,
  SEARCH_HINT_LINES,
  SLEEP_DIALOGUE,
  STATION_APPROACH_DIALOGUE,
  STATION_MARA_SIGHTED,
  STATION_SCAN_RESULT,
  SUNRISE_BENCH_DIALOGUE,
  TICKET_BOARD_CONCLUSION,
  TRANSPORT_ENTRANCE_DIALOGUE,
  cutInterfaceMenu,
  echoStoneToastText,
  edaTopicMenu,
  hanaTopicMenu,
  nikaTopicMenu,
  seamMenu,
} from './chapter3OpeningContent.js';
import { ENDING_SLICE_POSITIONS } from './chapter3EndingContent.js';
import { Chapter3DialogueController } from './Chapter3Caption.js';
import { Chapter3TicketBoard } from './Chapter3TicketBoard.js';
import { cachedSnapshotModel, chapter3ResumePoint } from './chapter3OpeningModel.js';
import { Chapter3ScannerField } from './Chapter3ScannerField.js';
import { Chapter3BellClamp } from './Chapter3BellClamp.js';
import { createChapter3MinistryHall, MINISTRY_POSITIONS } from './Chapter3MinistryHall.js';
import { Chapter3TimeVisualController, chapter3LampGlowForClock } from './Chapter3TimeVisualController.js';
import { Chapter3EvidenceViewer, CHAPTER3_DOCUMENTS } from './Chapter3EvidenceViewer.js';
import { createChapter3HotelHall, HOTEL_POSITIONS } from './Chapter3HotelHall.js';
import {
  HOTEL_LOBBY_WALK_BOUNDS,
  HOTEL_LOBBY_FURNITURE_OBSTACLES,
  HOTEL_CORRIDOR_WALK_BOUNDS,
  HOTEL_ROOM_WALK_BOUNDS,
  HOTEL_ROOM_FURNITURE_OBSTACLES,
  hotelFurnitureAt,
} from './chapter3HotelNavigation.js';
import { Chapter3ReplacementAssetSystem } from './Chapter3ReplacementAssetSystem.js';
import { CITY_MODELS, RAIL_LAYOUT, CAMERA_FOLLOW, CAMERA_HOME, WORLD_NODES } from './city3dConfig.js';
import { findPath, isWalkable } from './EchoCity3DPreview.js';
import { LEAD_KEY, LEAD_LINE_MS, LEAD_ROUTES, leadOffer, leadOfferHtml } from './chapter3LongWalks.js';
import { Chapter3AnimatedCharacterSystem } from './Chapter3AnimatedCharacters.js';
import {
  FIRE_SITE,
  addSilhouetteOutline,
  applyRimLight,
  clampInteriorPoint,
  findInteriorPath,
  interiorSegmentIsClear,
  makeActor,
  makeCampfireKettle,
  makeCutInterface,
  makeDarkSeam,
  makeDynamicObjectHighlight,
  makeFinalTrainDoor,
  makeGroundMessage,
  makeGuidanceBeacon,
  makeLampOilStall,
  makeMorningCampfireEchoStone,
  makeObjectHighlight,
  makePreservingObjectHighlight,
  makeRoseScarf,
  positionFrom,
  setActorForegroundVisibility,
  setRimLightStrength,
  smooth,
} from './chapter3SceneBuilders.js';
import { music } from '../../shared/musicDirector.js';
import { collectMagicStone, firstStoneNotice, magicStoneRowHtml, magicStoneSnapshot } from '../../shell/magicStones.js';
import { stoneChime } from '../../chapters/borrowedLight/audio.js';
import { car03Audio } from '../presentCity/car03Audio.js';
import { devParam } from '../../devMode.js';
import {
  COMPASS_FLASH_SECONDS,
  IDLE_LOOK_HINT_HTML,
  autoTaggedInteractions,
  capHintClock,
  closestOnPolyline2D,
  compassPlacement,
  compassVisible,
  controlsHintHtml,
  controlsHintState,
  createHintClock,
  holdHintClock,
  idleLookHintDue,
  tickHintClock,
  trackDestinationPass,
} from './chapter3Guidance.js';

const COMPASS_FLASH_MIN_FRAMES = 8;
const wallNow = () => globalThis.performance?.now?.() ?? Date.now();

// Chapter 3 horizontal score map. Each cue owns a narrative district/beat and
// stays looped until the next cue is ready. musicDirector crossfades.
// Provenance lives in public/assets/music/ch3/ASSET_MANIFEST.md.
const C3_MUSIC = {
  arrival: { src: 'assets/music/ch3/3.1_satie_gnossienne_no1.mp3', volume: 0.48, fade: 5.2, outFade: 5.2, dialogueDuckDb: -5.5 },
  ministry: { src: 'assets/music/ch3/3.3_sousa_washington_post_march.mp3', volume: 0.36, fade: 4.2, outFade: 4.2, dialogueDuckDb: -6.5 },
  market: { src: 'assets/music/ch3/3.2_dvorak_humoresque_no7.mp3', volume: 0.43, fade: 5.2, outFade: 4.8, dialogueDuckDb: -5.5 },
  dusk: { src: 'assets/music/ch3/3.6_chopin_prelude_op28_no4.mp3', volume: 0.44, fade: 5.0, outFade: 5.8, dialogueDuckDb: -5.5 },
  hotel: { src: 'assets/music/ch3/3.7_chopin_nocturne_op27_no2.mp3', volume: 0.42, fade: 5.8, outFade: 5.8, dialogueDuckDb: -5.5 },
  burning: { src: 'assets/music/ch3/3.8_beethoven_sym7_mvt2_allegretto_cello.mp3', volume: 0.46, fade: 4.8, outFade: 6.5, dialogueDuckDb: -6.5 },
  morning: { src: 'assets/music/ch3/3.9_dvorak_new_world_largo.mp3', volume: 0.45, fade: 6.5, outFade: 7.5, dialogueDuckDb: -5.5 },
};

const INTERACTION_RADIUS = 4.2;
const SLEEP_BLACKOUT_MS = 5000;
const HOTEL_STAGE_TRANSITION_MS = 320;
// Alpha round 4 (P2, the hotel "faded in as a murky ghost"): interior cuts
// swapped sets 320 ms into the blackout's 0.7 s CSS fade, i.e. half black,
// and lifted it while the new set was still compiling. A cut now waits for
// full black (BLACKOUT_FADE_MS), swaps, lets the city draw the new set
// (BLACKOUT_DRAWN_FRAMES) and only then fades back in.
const BLACKOUT_FADE_MS = 720;
const BLACKOUT_DRAWN_FRAMES = 2;
const BLACKOUT_FRAME_TIMEOUT_MS = 2500;
// The bench painting's CSS fade-in (.c3-sunrise, 1.15 s).
const SUNRISE_TABLEAU_FADE_MS = 1200;
const wait = (ms) => new Promise((resolve) => { globalThis.setTimeout(resolve, ms); });
// Lev points the way after this long searching (alpha round 1: 90 s felt
// like being lost; the length target is 30–35 minutes).
const SEARCH_HINT_AFTER_SECONDS = 45;
const SEARCH_HINT_NEAR_TARGET_SECONDS = 30;
const DIRECT_WALK_SPEED = 3.1;
// The default street camera sits closer than the old 2.85 overview so the
// cast reads at least ~48 px tall at 1080p; dialogue eases in more (alpha
// round 4: 0.45 -> 0.8, the speakers were still small in conversation).
const DIALOGUE_ZOOM_BOOST = 0.8;
// Round 3 art pass (P2, Butch lost on the cobbles): the street camera sits
// a little tighter on every tier (3.6 -> 4.0, about 11 % larger).
const STREET_ZOOM_BOOST = 0.4;
const LOW_QUALITY_ZOOM_BOOST = 0.5;
// How far (m) the finale camera follows the departing train before it holds.
const FINALE_CAMERA_FOLLOW = 9;
// LOW / LOWEST: Butch's outline instead of the rim (alpha round 3).
const BUTCH_SILHOUETTE = Object.freeze({ color: 0xf0b25e, opacity: 0.92, widthCssPx: 2 });
// R5 (alpha round 3): how much closer the camera sits on the carriage door
// for the empty-seat line.
const BOARDED_CLOSE_UP_ZOOM = 1.6;
// Alpha round 4 (P1, 3.6): the station beat pushes in on Butch and the
// woman in the rose scarf (about 30 % larger than the street camera), and
// the scarf itself is oversized a little so it reads at that zoom.
const STATION_CLOSE_UP_ZOOM = 2.1;
const ROSE_SCARF_WORLD_SCALE = 1.45;
// Measured from vertical raycasts through the installed Hunyuan furniture kit
// at its runtime scale/offset. Boxes include a 0.42 m player-radius margin.
const MINISTRY_FURNITURE_OBSTACLES = Object.freeze([
  Object.freeze({ minX: -6.75, maxX: 6.75, minZ: -6.15, maxZ: -4.35 }),
  Object.freeze({ minX: 2.0, maxX: 6.75, minZ: -1.65, maxZ: 0.2 }),
  Object.freeze({ minX: -6.2, maxX: -1.5, minZ: -0.2, maxZ: 1.35 }),
  Object.freeze({ minX: -0.15, maxX: 3.55, minZ: 3.1, maxZ: 5.05 }),
]);
const MINISTRY_WALK_BOUNDS = Object.freeze({ minX: -7.9, maxX: 7.9, minZ: -3.95, maxZ: 9.75 });
const DISTANT_GUIDANCE_INTERACTIONS = Object.freeze(new Set([
  'transport-entrance', 'copper-heron-entrance', 'night-burning-message',
  'eda', 'cut-feed-interface',
  // G10: the optional dusk fire pulses from across the square.
  'campfire-seline',
]));
const AMBIENT_CITY_ROAM_POINTS = Object.freeze(
  Object.values(WORLD_NODES).map(([x, z]) => Object.freeze([x, z])),
);
const MORNING_START = Object.freeze({ butch: [8.4, 0.5, 11.2], lev: [9.8, 0.5, 12.0] });
const STATION_TRIGGER = Object.freeze([-3.2, 0.5, 21.2]);
// R4 (alpha round 3): the room camera's fixed subject, between the door and
// the bed, and how far the bed's E and tag reach (the whole room: Butch
// walks in 4.2 m from it, just outside the street radius).
const HOTEL_ROOM_FRAME = Object.freeze([0.4, 0.7, -11.6]);
const HOTEL_BED_REACH = 6.5;

// About five flavour objects stay clickable in the street (hover only; Tab
// never lights them). Everything else in the city is scenery.
const FLAVOUR_OBJECTS = Object.freeze({
  'clock-tower': ['Seven minutes slow. Everyone in the square still checks it.', 'Still seven minutes slow. Nobody seems surprised.'],
  'reunion-fountain': ['Coins, tram tokens, and one brass button lie under the water.', 'Nothing with Mara\'s name. Just other people\'s wishes.'],
  'crosswalk-signal': ['The signal cycles for a crowd that is not here.', 'Walk. Wait. Walk. The street obeys even when nobody does.'],
  'pa-speaker': ['Dust inside the horn. The last notice ended mid-sentence.', 'The speaker has nothing else to announce.'],
  'open-air-station': ['An open platform, a route board, and no place to hide a departure.', 'The station keeps every goodbye in public.'],
});

// Voice-production authority for the dynamic environment layer: the
// flavour objects' recorded lines (all exist in the 1.0 voice pass).
export const CHAPTER3_AMBIENT_VOICE_LINES = Object.freeze(
  Object.values(FLAVOUR_OBJECTS).flatMap((copy) => copy.map((text) => ({ speaker: 'BUTCH', text }))),
);

const COMPASS_VOICE_DIRECTIONS = Object.freeze([
  'north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest',
]);

// Runtime-assembled guidance lines that kept their 1.0 recordings (the
// ministry hint after two real passes, the cut-feed hint, every compass
// direction). The other hints are subtitle-only.
export const CHAPTER3_DYNAMIC_VOICE_LINES = Object.freeze(
  COMPASS_VOICE_DIRECTIONS.flatMap((direction) => [
    ...SEARCH_HINT_LINES['find-ministry'](direction, { passes: 2 }),
    ...SEARCH_HINT_LINES['find-cut-interface'](direction),
  ]),
);

// Speakers the dialogue camera can frame.
const SPEAKER_HOSTS = Object.freeze({
  LEV: 'lev', EDA: 'eda', OLEK: 'olek', TOMA: 'toma', PETAR: 'petar', SELINE: 'campfireSeline', RADA: 'campfireRada',
  NIKA: 'ministryHall.nika', SAVA: 'ministryHall.sava', CLERK: 'ministryHall.sava', HANA: 'hotelHall.hana',
});

// One pooled paper tag (.nf-tag) per labelled world point.
class TagLayer {
  constructor() {
    this.pool = [];
    this.used = 0;
  }

  begin() {
    this.used = 0;
  }

  place(screen, html, { emphasis = false } = {}) {
    let tag = this.pool[this.used];
    if (!tag) {
      tag = document.createElement('div');
      tag.className = 'nf-tag c3-tag';
      tag.setAttribute('aria-hidden', 'true');
      document.body.append(tag);
      this.pool.push(tag);
    }
    this.used += 1;
    if (tag.dataset.html !== html) {
      tag.innerHTML = html;
      tag.dataset.html = html;
    }
    tag.hidden = false;
    tag.classList.toggle('is-emphasis', emphasis);
    // Keep the whole tag on screen: it is centred above its anchor, so clamp
    // the anchor by half the tag's width (and its height at the top edge).
    const margin = 14;
    const halfWidth = tag.offsetWidth / 2;
    const x = Math.min(Math.max(screen.x, halfWidth + margin), window.innerWidth - halfWidth - margin);
    const y = Math.min(Math.max(screen.y, tag.offsetHeight + margin), window.innerHeight - margin);
    tag.style.left = `${Math.round(x)}px`;
    tag.style.top = `${Math.round(y)}px`;
    return tag;
  }

  end() {
    for (let index = this.used; index < this.pool.length; index += 1) this.pool[index].hidden = true;
  }

  snapshot() {
    return this.pool.slice(0, this.used).map((tag) => tag.textContent);
  }
}

export class Chapter3OpeningRuntime {
  constructor({ preview, model, elements }) {
    this.preview = preview;
    this.model = cachedSnapshotModel(model);
    this.elements = elements;
    this.dialogue = new Chapter3DialogueController({ root: elements.caption });
    this.timeVisual = new Chapter3TimeVisualController(preview);
    this.evidenceViewer = new Chapter3EvidenceViewer(elements.evidenceViewer);
    this.tags = new TagLayer();
    this.initialized = false;
    this.hoveredId = null;
    this.hoverAnchor = null;
    this.tabHeld = false;
    // Seconds without input (R2-3: after IDLE_LOOK_HINT_SECONDS the city
    // suggests holding Tab).
    this.idleElapsed = 0;
    this.idleLookHintShown = false;
    this.destinationPass = { phase: null, near: false, passes: 0 };
    this.pointerClient = { x: 0, y: 0 };
    this.pointerHeld = false;
    this.keysHeld = new Set();
    this.directMoving = false;
    this.interactions = [];
    this.departureElapsed = null;
    this.departureBases = [];
    this.guideElapsed = null;
    this.guideStart = null;
    this.levWalkElapsed = null;
    this.levWalkDuration = 0;
    this.levWalkStart = null;
    this.levWalkTarget = null;
    this.levWalkOnComplete = null;
    this.insideMinistry = false;
    this.ministryTransitioning = false;
    this.ministryExteriorVisibility = [];
    this.insideArchive = false;
    this.insideHotel = false;
    this.hotelArea = null;
    this.hotelTransitioning = false;
    this.hotelExteriorVisibility = [];
    this.musicCue = null;
    this.hotelDoorElapsed = null;
    this.hotelDoorDuration = 0;
    this.hotelDoorOnComplete = null;
    this.hotelDoorClosing = false;
    this.hotelDoorPivot = null;
    this.hotelDoorOpenAngle = 0;
    this.levHotelExitElapsed = null;
    this.levHotelExitStart = null;
    this.butchBedTransition = null;
    this.nightHiddenActorVisibility = null;
    this.groundFireElapsed = 0;
    this.nightIgnitionElapsed = null;
    this.nightIgnitionProgress = 0;
    this.endingDepartureBases = null;
    this.endingMusicReleased = false;
    this.endingLatchShaken = false;
    this.endingDoorSlamPlayed = false;
    this.endingHornPlayed = false;
    this.chapterExitStarted = false;
    this.flavourUseCounts = new Map();
    this.lastObjectiveKey = null;
    this.morningLevFollowing = false;
    this.morningLevMovedThisFrame = false;
    this.hotelLevMovedThisFrame = false;
    this.morningLevFollowTime = 0;
    this.morningLevTrail = [];
    this.morningLevLastDirection = new THREE.Vector3(1, 0, 0);
    this.autoLevFollow = false;
    this.searchHintPhase = null;
    this.searchHintElapsed = 0;
    // R2 P1: Lev's hint counts wall seconds too (chapter3Guidance hint clock).
    this.searchHintClock = createHintClock();
    this.searchHintLastShownAt = -Infinity;
    // R2 P1: the compass tag (Tab, or a few seconds after the task changes).
    this.compassFlashUntil = 0;
    this.compassFlashPending = false;
    this.compassShown = null;
    // Alpha round 4: the controls tag (CLICK TO WALK · E TO LOOK · HOLD TAB).
    this.controlsUsed = new Set();
    this.controlsHintVisible = false;
    this.ambientAnimElapsed = 0;
    this.ambientLifeElapsed = 0;
    this.ambientLifeRoutes = null;
    this.activeNpcConversationId = null;
    this.activeNpcConversationIds = new Set();
    this.butchActionOverride = null;
    this.butchBedPoseActive = false;
    this.ambientElapsed = 0;
    this.sunriseTableauHoldElapsed = null;
    this.scannerFlashRemaining = 0;
    this.scannerFreezeRemaining = 0;
    this.walkBarkIndex = 0;
    this.walkBarkTimer = 0;
    this.stationScanReadoutRemaining = 0;
    this.speakerFocus = null;
    this.baseZoom = CAMERA_HOME.zoom;
    this.characters = new Chapter3AnimatedCharacterSystem({
      groundHeightAt: (x, z) => this.preview.surfaceHeightAt(x, z),
    });
    this.replacements = new Chapter3ReplacementAssetSystem();
    this.assetJobs = new Map();
    this.characterQa = devParam('playtest') === 'chapter3-characters';
    this.magicStoneQa = devParam('playtest') === 'chapter3-magic-stone';
    this.characterQaAction = 'idle';
    this.characterQaElapsed = 0;
    this.characterQaActors = [];
    this.characterQaOverlay = null;
    this.trainDirection = new THREE.Vector3(
      RAIL_LAYOUT.end[0] - RAIL_LAYOUT.start[0],
      0,
      RAIL_LAYOUT.end[1] - RAIL_LAYOUT.start[1],
    ).normalize();
  }

  // ------------------------------------------------------------------ assets
  // Only Butch and Lev are rigged before play (the first two minutes are the
  // platform and the square). Everyone else, and every interior set, streams
  // in during play; a beat that needs a set waits on its job under a fade.
  characterSpecs() {
    return {
      start: [
        { id: 'butch', assetId: 'butch', host: this.preview.player },
        { id: 'lev', assetId: 'lev', host: this.lev },
      ],
      city: [
        { id: 'eda', assetId: 'femaleMarket', host: this.eda },
        { id: 'olek', assetId: 'maleLabor', host: this.olek },
        { id: 'toma', assetId: 'maleMunicipal', host: this.toma },
        { id: 'flower-vendor', assetId: 'femaleCivilian', host: this.flowerVendor },
        { id: 'produce-vendor', assetId: 'femaleMarket', host: this.produceVendor },
        { id: 'petar', assetId: 'maleLabor', host: this.petar },
        { id: 'echo-mara', assetId: 'femaleCivic', host: this.echoMara },
        { id: 'campfire-rada', assetId: 'femaleCivic', host: this.campfireRada },
        { id: 'campfire-miro', assetId: 'maleLabor', host: this.campfireMiro },
        { id: 'campfire-seline', assetId: 'femaleMarket', host: this.campfireSeline },
      ],
      ministry: [
        { id: 'sava', assetId: 'maleMunicipal', host: this.ministryHall.sava },
        { id: 'nika', assetId: 'femaleCivic', host: this.ministryHall.nika },
        { id: 'ministry-bosko', assetId: 'maleMunicipal', host: this.ministryHall.bosko },
      ],
      hotel: [
        { id: 'hana', assetId: 'femaleCivilian', host: this.hotelHall.hana },
      ],
    };
  }

  replacementJobs() {
    const ministryEnvelopeNames = new Set([
      'ministry-floor', 'ministry-back-wall', 'ministry-left-wall', 'ministry-right-wall',
      'ministry-counter-canopy', 'ministry-public-counter', 'ministry-counter-cap',
      'ministry-hall-label',
    ]);
    const ministryFallback = this.ministryHall.group.children.filter(
      (child) => child.isMesh && ministryEnvelopeNames.has(child.name),
    );
    const ministryFloor = this.ministryHall.group.getObjectByName('ministry-floor');
    if (ministryFloor?.material?.color) ministryFloor.material.color.setHex(0x4e514b);
    const roomGreybox = [this.hotelHall.roomFloor, this.hotelHall.roomRug, ...(this.hotelHall.roomWalls ?? [])];
    const roomFurnitureGreybox = [this.hotelHall.evidenceTable, this.hotelHall.bed, this.hotelHall.washstand];
    const corridorGreybox = [
      this.hotelHall.corridorFloor,
      this.hotelHall.corridorRunner,
      ...(this.hotelHall.corridorWalls ?? []),
      ...(this.hotelHall.backgroundDoors ?? []),
      ...(this.hotelHall.corridorLightFixtures ?? []),
    ];
    const ministryFurnitureFallback = this.ministryHall.group.children.filter((child) => (
      child.isMesh && (
        child.name.startsWith('ministry-counter-post-')
        || child.name.startsWith('queue-post-')
        || ['queue-rope-left', 'queue-rope-right', 'queue-rope-back',
          'ministry-waiting-bench', 'ministry-waiting-bench-back',
          'nika-terminal', 'nika-printer', 'ministry-waste-bin'].includes(child.name)
      )
    ));
    ministryFurnitureFallback.push(this.ministryHall.queueDispenser);
    return {
      city: [
        { id: 'env-eda-oil-stall', host: this.lampOilStall, hide: [...this.lampOilStall.children] },
        { id: 'env-flower-stall', host: this.replacementAnchors.flower },
        { id: 'env-campfire-props', host: this.campfireKettle, position: [0, 0, 0], hide: [...this.campfireKettle.children] },
        { id: 'prop-oil-container-set', host: this.lampOilStall, position: [2.25, 0, 0.15], rotationY: -0.2 },
        { id: 'prop-cut-connector-set', host: this.cutInterface.group, hide: [...this.cutInterface.group.children] },
      ],
      // Fit the generated shell to the full 18 x 18 m public hall footprint;
      // the furniture kit leaves the front 6.5 m open for the entrance.
      ministry: [
        { id: 'env-ministry-shell', host: this.ministryHall.group, position: [0, 0, 2.2], scale: [2.725, 1.0, 3.378], hide: ministryFallback },
        { id: 'env-ministry-furniture', host: this.ministryHall.group, position: [0, 0, -0.7], scale: 0.95, hide: ministryFurnitureFallback },
      ],
      // The corridor shell carries a 0.70 m plinth; sink it so the floorboards
      // land at y = 0. The room kit keeps the papers on its real table.
      hotel: [
        { id: 'env-hotel-lobby-shell', host: this.hotelHall.lobbyGroup, position: [0, -0.6, -0.2], scale: 2.1, hide: this.hotelHall.lobbyLegacyFallbacks },
        { id: 'env-hotel-lobby-furniture', host: this.hotelHall.lobbyGroup, position: [0, -0.6, -0.15], scale: 1.25 },
        { id: 'prop-hotel-register-key', host: this.hotelHall.lobbyGroup, position: [0.55, 0.63, -2.27], rotationY: -0.12, hide: [this.hotelHall.register] },
        { id: 'env-hotel-corridor-shell', host: this.hotelHall.corridorGroup, position: [0, -0.7, 0], scale: [1.90, 1.0, 1.45], hide: corridorGreybox },
        { id: 'env-butch-room-shell', host: this.hotelHall.roomGroup, position: [0, 0, -12.65], scale: [2.87, 0.85, 1.28], hide: roomGreybox },
        { id: 'env-butch-room-furniture', host: this.hotelHall.roomGroup, position: [0, 0, -12.65], scale: 0.95, hide: roomFurnitureGreybox },
      ],
      train: [
        { id: 'env-doorless-carriage', host: this.finalDoor.shell, position: [0, 0, 0], hide: [...this.finalDoor.shell.children] },
        { id: 'env-single-train-door', host: this.finalDoor.door, position: [-1.05, 0, 0], hide: [this.finalDoor.doorFallback] },
      ],
    };
  }

  // One job per group: its sets and its characters, loaded together.
  loadAssetGroup(group) {
    if (this.assetJobs.has(group)) return this.assetJobs.get(group);
    const sets = this.replacementJobs()[group] ?? [];
    const cast = this.characterSpecs()[group] ?? [];
    const job = Promise.all([
      ...sets.map((spec) => this.replacements.attach(spec)),
      ...cast.map((spec) => this.characters.attach(spec)),
    ]).then(() => this.afterAssetGroup(group, cast)).catch((error) => {
      console.warn(`[Chapter 3] asset group ${group} kept fallbacks`, error);
    });
    this.assetJobs.set(group, job);
    return job;
  }

  afterAssetGroup(group, cast) {
    // Visibility changes on a host must never resurrect the capsule fallback
    // after a successful rig install.
    for (const spec of cast) {
      const installed = this.characters.get(spec.id);
      if (!installed?.loaded) continue;
      for (const child of spec.host.children) {
        const isInstalledVisual = child === installed.visual || child.userData?.characterAsset === spec.id;
        if (!isInstalledVisual) child.visible = false;
      }
    }
    if (group === 'ministry') {
      this.ministryFurnitureModel = this.replacements.model('env-ministry-furniture');
      if (!this.ministryFurnitureModel) this.populateMinistryDetailModels();
      this.queueOutline = makeObjectHighlight(this.ministryFurnitureModel || this.ministryHall.queueDispenser);
      const queue = this.interactions.find((entry) => entry.id === 'ministry-queue-dispenser');
      if (queue) queue.outline = this.queueOutline;
    }
    if (group === 'hotel') {
      this.hotelCorridorShellModel = this.replacements.model('env-hotel-corridor-shell');
      if (this.hotelCorridorShellModel && !this.hotelCorridorMirrorModel) {
        this.hotelCorridorMirrorModel = this.hotelCorridorShellModel.clone(true);
        this.hotelCorridorMirrorModel.name = 'chapter3-replacement-env-hotel-corridor-shell-mirrored';
        this.hotelCorridorMirrorModel.scale.x *= -1;
        this.hotelCorridorMirrorModel.position.y += 0.002;
        this.hotelHall.corridorGroup.add(this.hotelCorridorMirrorModel);
        // The original shell carries the +X wall facing the fixed camera;
        // the existing occlusion fade clears it for Butch.
        this.preview.registerOccludingBuilding(this.hotelCorridorShellModel, 'hotel-corridor-camera-wall');
      }
    }
    if (group === 'city') {
      const connector = this.replacements.model('prop-cut-connector-set');
      if (connector) {
        this.cutInterface.highlight = makeDynamicObjectHighlight(connector);
        const cut = this.interactions.find((entry) => entry.id === 'cut-feed-interface');
        if (cut) cut.outline = this.cutInterface.highlight;
      }
      this.applyEchoMaterial();
      this.attachRoseScarf();
    }
    this.updateOutlines();
  }

  // The rose scarf on the Mara ahead's rig: tied to the neck bone so it moves
  // with her walk, sized in world metres whatever the rig's own scale.
  attachRoseScarf() {
    const installed = this.characters.get('echo-mara');
    const rig = installed?.loaded ? installed.visual : null;
    if (!rig || this.roseScarf) return false;
    let neck = null;
    rig.traverse((object) => { if (!neck && object.isBone && /neck/i.test(object.name)) neck = object; });
    const scarf = makeRoseScarf();
    scarf.scale.setScalar(ROSE_SCARF_WORLD_SCALE);
    if (neck) {
      rig.updateMatrixWorld(true);
      const boneScale = neck.getWorldScale(new THREE.Vector3());
      const hostScale = this.echoMara.getWorldScale(new THREE.Vector3());
      // The collar sits a little up the neck; the scale cancels the bone's.
      scarf.scale.set(
        (ROSE_SCARF_WORLD_SCALE * hostScale.x) / boneScale.x,
        (ROSE_SCARF_WORLD_SCALE * hostScale.y) / boneScale.y,
        (ROSE_SCARF_WORLD_SCALE * hostScale.z) / boneScale.z,
      );
      scarf.position.y = (0.035 * hostScale.y) / boneScale.y;
      neck.add(scarf);
    } else {
      scarf.position.y = 0.93;
      this.echoMara.add(scarf);
    }
    this.roseScarf = scarf;
    this.roseScarfOnBone = Boolean(neck);
    if (this.echoMaraFallbackScarf) this.echoMaraFallbackScarf.visible = false;
    return true;
  }

  // Deferred streaming order: the market and street cast first, then the
  // ministry (the first interior), the hotel and the train.
  streamDeferredAssets() {
    const order = ['city', 'ministry', 'hotel', 'train'];
    order.reduce((chain, group) => chain.then(() => this.loadAssetGroup(group)), Promise.resolve());
  }

  assetGroupsState() {
    return Object.fromEntries(['start', 'city', 'ministry', 'hotel', 'train'].map((group) => [group, this.assetJobs.has(group) ? 'requested' : 'pending']));
  }

  // The Mara ahead is an echo: a dark, faceless record made to walk.
  applyEchoMaterial() {
    this.echoMara?.traverse((child) => {
      if (!child.isMesh || child.userData.echoMaterial) return;
      const apply = (material) => {
        const echo = material.clone();
        echo.color?.setHex(0x1b2a2e);
        if ('emissive' in echo) {
          echo.emissive.setHex(0x0d3b3a);
          echo.emissiveIntensity = 0.55;
        }
        echo.transparent = true;
        echo.opacity = 0.88;
        echo.map = null;
        echo.needsUpdate = true;
        return echo;
      };
      child.material = Array.isArray(child.material) ? child.material.map(apply) : apply(child.material);
      child.userData.echoMaterial = true;
    });
  }

  populateMinistryDetailModels() {
    const benchSource = this.preview.modelCache.get('fountain-bench');
    const stanchionSource = this.preview.modelCache.get('queue-stanchion');
    const dispenserSource = this.preview.modelCache.get('queue-dispenser');
    if (!benchSource || !stanchionSource || !dispenserSource) return;

    this.ministryDetailModels = { benches: [], stanchions: [], dispenser: null };
    const makeClone = (source, scale) => {
      const clone = source.clone(true);
      clone.position.set(0, 0, 0);
      clone.rotation.set(0, 0, 0);
      Array.isArray(scale) ? clone.scale.set(...scale) : clone.scale.setScalar(scale);
      clone.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(clone);
      clone.position.y = -bounds.min.y;
      return clone;
    };

    for (const z of [3.5, 5.6, 7.7]) {
      const bench = makeClone(benchSource, 1.8);
      bench.name = 'ministry-detailed-bench';
      bench.position.set(-5.7, bench.position.y, z);
      this.ministryHall.group.add(bench);
      this.ministryDetailModels.benches.push(bench);
    }
    for (const x of [-2.5, 2.5]) {
      const rail = makeClone(stanchionSource, [2.637, 1.613, 1.596]);
      rail.name = 'ministry-detailed-stanchion';
      rail.position.set(x, rail.position.y, 4.25);
      rail.rotation.y = Math.PI / 2;
      this.ministryHall.group.add(rail);
      this.ministryDetailModels.stanchions.push(rail);
    }
    const backRail = makeClone(stanchionSource, [5.274, 1.613, 1.596]);
    backRail.name = 'ministry-detailed-stanchion';
    backRail.position.set(0, backRail.position.y, 5.5);
    this.ministryHall.group.add(backRail);
    this.ministryDetailModels.stanchions.push(backRail);

    const dispenser = makeClone(dispenserSource, 1.9);
    dispenser.name = 'ministry-detailed-dispenser';
    dispenser.position.set(
      this.ministryHall.queueDispenser.position.x,
      dispenser.position.y,
      this.ministryHall.queueDispenser.position.z,
    );
    this.ministryHall.group.add(dispenser);
    this.ministryDetailModels.dispenser = dispenser;
    for (const child of this.ministryHall.group.children) {
      if (!child.isMesh) continue;
      if (child.name === 'ministry-waiting-bench' || child.name === 'ministry-waiting-bench-back'
        || child.name === 'queue-rope-left' || child.name === 'queue-rope-right' || child.name === 'queue-rope-back'
        || child.name.startsWith('queue-post-')) child.visible = false;
    }
    this.ministryHall.queueDispenser.traverse((child) => {
      if (child.isMesh) child.visible = false;
    });
  }

  makeCharacterQaLabel(host, text) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 112;
    const context = canvas.getContext('2d');
    context.fillStyle = 'rgba(20, 28, 28, 0.86)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#b58a55';
    context.lineWidth = 8;
    context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
    context.fillStyle = '#f0e4ca';
    context.font = '700 42px Georgia, serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
    label.position.set(0, 2.55, 0);
    label.scale.set(2.35, 0.52, 1);
    label.renderOrder = 50;
    host.add(label);
  }

  stageCharacterQa() {
    const lineup = [
      ['butch', 'BUTCH', this.preview.player],
      ['lev', 'LEV', this.lev],
      ['eda', 'FEMALE MARKET', this.eda],
      ['olek', 'MALE LABOR', this.olek],
      ['toma', 'MALE MUNICIPAL', this.toma],
      ['flower-vendor', 'FEMALE CIVILIAN', this.flowerVendor],
      ['campfire-rada', 'FEMALE CIVIC', this.campfireRada],
    ];
    const xPositions = [-7.5, -5, -2.5, 0, 2.5, 5, 7.5];
    this.characterQaActors = lineup.map(([id, label, host], index) => {
      const base = new THREE.Vector3(xPositions[index], 0.5, 7.6);
      host.visible = true;
      host.position.copy(base);
      host.rotation.y = Math.PI;
      this.makeCharacterQaLabel(host, label);
      return { id, host, base, index };
    });
    for (const actor of [this.produceVendor, this.petar, this.echoMara, this.campfireMiro, this.campfireSeline]) actor.visible = false;
    this.loadAssetGroup('city');
    this.interactions = [];
    this.preview.stopWalking();
    this.preview.setCameraOverrideTarget(new THREE.Vector3(0, 0.5, 7.6));
    this.preview.resetCamera();
    this.createCharacterQaOverlay();
    this.setCharacterQaAction('idle');
  }

  createCharacterQaOverlay() {
    document.getElementById('chapter3-character-qa')?.remove();
    const overlay = document.createElement('section');
    overlay.id = 'chapter3-character-qa';
    overlay.innerHTML = `
      <strong>SHARED RIG TEST</strong>
      <span>Seven Chapter 3 runtime models · click an action</span>
      <div>${[
        'idle', 'talk', 'walk', 'formalWalk', 'jog', 'crouch', 'sit',
        'sitTalk', 'investigate', 'repair', 'pickUp', 'push', 'dance',
      ].map((action) => `<button type="button" data-action="${action}">${action.replace(/([A-Z])/g, ' $1').toUpperCase()}</button>`).join('')}</div>
    `;
    Object.assign(overlay.style, {
      position: 'fixed', left: '50%', bottom: '24px', transform: 'translateX(-50%)', zIndex: '500',
      display: 'grid', gap: '7px', minWidth: '620px', padding: '14px 18px', color: '#eee1c7',
      background: 'rgba(18, 24, 24, 0.94)', border: '1px solid #9d7246', boxShadow: '0 10px 34px rgba(0,0,0,.38)',
      fontFamily: 'Georgia, serif', textAlign: 'center', letterSpacing: '0.05em',
    });
    const buttonRow = overlay.querySelector('div');
    Object.assign(buttonRow.style, { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' });
    for (const button of overlay.querySelectorAll('button')) {
      Object.assign(button.style, {
        padding: '8px 12px', color: '#eee1c7', background: '#293638', border: '1px solid #63827d',
        cursor: 'pointer', font: '700 12px American Typewriter, monospace', letterSpacing: '0.06em',
      });
      button.addEventListener('click', () => this.setCharacterQaAction(button.dataset.action));
    }
    document.body.append(overlay);
    this.characterQaOverlay = overlay;
  }

  setCharacterQaAction(action) {
    this.characterQaAction = action;
    this.characterQaElapsed = 0;
    for (const { id } of this.characterQaActors) this.characters.play(id, action);
    for (const button of this.characterQaOverlay?.querySelectorAll('button') || []) {
      button.style.background = button.dataset.action === action ? '#7b4c2d' : '#293638';
    }
    if (this.initialized) this.updateObjective();
  }

  updateCharacterQa(dt) {
    this.characterQaElapsed += dt;
    const locomotionScale = {
      walk: 1.15,
      formalWalk: 0.92,
      jog: 2.35,
    }[this.characterQaAction];
    for (const entry of this.characterQaActors) {
      if (!locomotionScale) {
        entry.host.position.copy(entry.base);
        entry.host.rotation.y = Math.PI;
        continue;
      }
      const phase = this.characterQaElapsed * locomotionScale + entry.index * 0.22;
      const offset = Math.sin(phase) * 0.72;
      entry.host.position.copy(entry.base);
      entry.host.position.x += offset;
      entry.host.rotation.y = Math.cos(phase) >= 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
    }
  }

  actorIsActuallyVisible(host) {
    for (let object = host; object; object = object.parent) if (!object.visible) return false;
    return true;
  }

  npcStepDirection(id, route, desiredDirection, actors, step) {
    const steering = desiredDirection.clone();
    const blockers = [this.preview.player, ...Object.entries(actors)
      .filter(([otherId, host]) => otherId !== id && this.actorIsActuallyVisible(host))
      .map(([, host]) => host)];
    for (const blocker of blockers) {
      const away = route.host.position.clone().sub(blocker.position).setY(0);
      const distance = away.length();
      if (distance >= 1.25) continue;
      if (distance < 0.01) away.set(Math.sin(id.length * 1.7), 0, Math.cos(id.length * 1.7));
      const pressure = (1.25 - Math.max(0.01, distance)) / 1.25;
      steering.addScaledVector(away.normalize(), 1.8 * pressure);
    }
    if (steering.lengthSq() < 0.001) return null;
    steering.normalize();
    const candidate = route.host.position.clone().addScaledVector(steering, step);
    if (blockers.some((blocker) => candidate.distanceTo(blocker.position) < 0.68)) return null;
    if (route.interior === 'ministry'
      && !interiorSegmentIsClear(route.host.position, candidate, MINISTRY_WALK_BOUNDS, MINISTRY_FURNITURE_OBSTACLES)) return null;
    if (!route.interior && !isWalkable(candidate.x, candidate.z, this.preview.boundaryObstacles)) return null;
    return steering;
  }

  activateInteraction(interaction) {
    const ids = this.npcIdsForInteraction(interaction.id);
    this.activeNpcConversationIds = new Set(ids);
    this.activeNpcConversationId = ids[0] || null;
    for (const id of ids) {
      const route = this.ambientLifeRoutes?.get(id);
      this.characters.play(id, 'idle', { immediate: true });
      if (!route) continue;
      const towardButch = this.preview.player.position.clone().sub(route.host.position);
      if (towardButch.lengthSq() > 0.001) route.host.rotation.y = Math.atan2(towardButch.x, towardButch.z);
    }
    interaction.activate();
  }

  // Each civilian roams among several semantically related work points. The
  // travel and work phases share one state machine, so a character never plays
  // a repair/push pose halfway through a walk or walks in place at a desk.
  updateAmbientLifeRoutes(dt) {
    const actors = {
      eda: this.eda, olek: this.olek, toma: this.toma,
      'produce-vendor': this.produceVendor, 'flower-vendor': this.flowerVendor,
      sava: this.ministryHall.sava, nika: this.ministryHall.nika, 'ministry-bosko': this.ministryHall.bosko,
      petar: this.petar,
      'campfire-rada': this.campfireRada, 'campfire-miro': this.campfireMiro,
      'campfire-seline': this.campfireSeline, hana: this.hotelHall.hana,
    };
    if (!this.ambientLifeRoutes) {
      const routeSpecs = {
        eda: { points: [[0, 0], [2.4, -0.6], [1.2, 2.0]], actions: ['investigate', 'pickUp', 'talk'] },
        'produce-vendor': { points: [[0, 0], [2.8, 0.2], [1.5, -2.0]], actions: ['investigate', 'pickUp', 'talk'] },
        'flower-vendor': { points: [[0, 0], [2.6, 0.6], [1.1, 2.3]], actions: ['investigate', 'pickUp', 'idle'] },
        // Toma is a core route-gate character. Keep him in the open forecourt
        // instead of letting the ambient-roam system carry him behind the
        // camera-side building again after his initial placement.
        toma: { points: [[0, 0]], actions: ['idle', 'investigate'], fixed: true },
        sava: { points: [[0, 0], [1.5, 0], [0.6, 0.55]], actions: ['investigate', 'talk', 'idle'], formal: true, interior: 'ministry' },
        nika: { points: [[0, 0], [-1.5, 0], [-0.6, 0.55]], actions: ['investigate', 'talk', 'idle'], formal: true, interior: 'ministry' },
        'ministry-bosko': { points: [[0, 0], [-2.2, 1.2], [-1.2, -1.3]], actions: ['idle', 'investigate', 'talk'], interior: 'ministry' },
        // Petar packs his cutter beside the cut; he does not wander off it.
        petar: { points: [[0, 0]], actions: ['repair'], fixed: true },
        'campfire-rada': { points: [[0, 0], [2.5, -1.5], [-2.0, -1.8]], actions: ['talk', 'investigate', 'idle'] },
        'campfire-miro': { points: [[0, 0], [-2.4, 1.7], [2.0, 1.4]], actions: ['repair', 'investigate', 'talk'] },
        'campfire-seline': { points: [[0, 0], [2.2, 1.8], [-2.1, 1.2]], actions: ['talk', 'pickUp', 'idle'] },
        hana: { points: [[0, 0]], actions: ['investigate'], fixed: true, formal: true, interior: 'hotel' },
      };
      this.ambientLifeRoutes = new Map(Object.entries(actors).map(([id, host], index) => {
        const spec = routeSpecs[id] || { points: [[0, 0], [2.2, 1.2], [-1.7, 1.8]], actions: ['idle', 'investigate', 'talk'] };
        const origin = host.position.clone();
        const points = spec.freeRoam
          ? [origin, ...AMBIENT_CITY_ROAM_POINTS.map(([x, z]) => new THREE.Vector3(x, origin.y, z))]
          : spec.points.map(([x, z]) => origin.clone().add(new THREE.Vector3(x, 0, z)));
        return [id, {
          host, formal: spec.formal, actions: spec.actions, interior: spec.interior || null,
          freeRoam: Boolean(spec.freeRoam), fixed: Boolean(spec.fixed), points,
          pointIndex: 0,
          targetIndex: 1 + (index % Math.max(1, points.length - 1)),
          visits: index,
          dwell: 1.2 + (index % 4) * 0.7,
          speed: 0.72 + (index % 3) * 0.12,
          navPath: [],
        }];
      }));
    }
    this.ambientLifeElapsed += dt;
    const states = new Map();
    if (!this.dialogue.active && this.preview.path.length === 0) {
      this.activeNpcConversationId = null;
      this.activeNpcConversationIds.clear();
    }
    for (const [id, route] of this.ambientLifeRoutes) {
      if (!this.actorIsActuallyVisible(route.host)) continue;
      if (id === 'olek') continue;
      if (this.activeNpcConversationIds.has(id)) {
        // A questioned NPC stops the job immediately. Idle is intentional:
        // several talk clips share large hand motions with work clips and read
        // as continuing to sort/fix objects during the conversation.
        states.set(id, 'idle');
        continue;
      }
      if (route.fixed) {
        states.set(id, route.actions[0]);
        continue;
      }
      if (route.dwell > 0) {
        route.dwell -= dt;
        states.set(id, route.actions[route.pointIndex % route.actions.length]);
        continue;
      }
      const nextIndex = route.targetIndex;
      const target = route.points[nextIndex];
      if (!route.interior && route.navPath.length === 0) {
        // Outdoor NPCs use the same authored navmesh and prop/building
        // obstacles as Butch. They no longer walk in a straight line through
        // market stalls, street furniture, parked vehicles or facades.
        route.navPath = findPath(route.host.position, target, this.preview.boundaryObstacles);
        if (route.navPath.length === 0) {
          route.visits += 1;
          route.targetIndex = route.freeRoam
            ? 1 + ((route.visits * 11 + id.length * 5) % (route.points.length - 1))
            : route.pointIndex;
          route.dwell = 2.8;
          states.set(id, route.actions[route.pointIndex % route.actions.length]);
          continue;
        }
      }
      const movementTarget = route.interior ? target : route.navPath[0];
      const movement = movementTarget.clone().sub(route.host.position);
      movement.y = 0;
      const distance = movement.length();
      if (distance < 0.08) {
        route.host.position.x = movementTarget.x;
        route.host.position.z = movementTarget.z;
        if (!route.interior && route.navPath.length > 1) {
          route.navPath.shift();
          states.set(id, route.formal ? 'formalWalk' : 'walk');
          continue;
        }
        route.navPath = [];
        route.pointIndex = nextIndex;
        route.visits += 1;
        const alternatives = route.points.length - 1;
        const stride = 1 + ((route.visits * 7 + id.length * 3) % alternatives);
        route.targetIndex = (route.pointIndex + stride) % route.points.length;
        route.dwell = 3.2 + ((nextIndex + id.length) % 4) * 1.15;
        states.set(id, route.actions[nextIndex % route.actions.length]);
        continue;
      }
      const direction = movement.normalize();
      const step = Math.min(distance, route.speed * dt);
      const safeDirection = this.npcStepDirection(id, route, direction, actors, step);
      if (!safeDirection) {
        route.navPath = [];
        route.dwell = 0.45 + (id.length % 3) * 0.18;
        states.set(id, 'idle');
        continue;
      }
      route.host.position.addScaledVector(safeDirection, step);
      route.host.rotation.y = Math.atan2(safeDirection.x, safeDirection.z);
      states.set(id, route.formal ? 'formalWalk' : 'walk');
    }
    this.updateOlekCartLife(dt, states, actors);
    return states;
  }
  // Every visible citizen runs a small personal loop instead of sharing one
  // frozen idle: vendors tend their stalls, clerks push paper, the queue
  // waits. Loops use standing-safe clips only, so no one sits on empty air.
  updateAmbientCharacterLoops(dt, lifeStates = new Map()) {
    this.ambientAnimElapsed += dt;
    const sequences = {
      eda: [['investigate', 6.5], ['idle', 4.0], ['talk', 3.5]],
      'produce-vendor': [['investigate', 5.5], ['talk', 3.0], ['idle', 5.0]],
      'flower-vendor': [['idle', 4.0], ['investigate', 5.0], ['talk', 3.5]],
      olek: [['investigate', 6.0], ['idle', 4.5]],
      toma: [['idle', 8.0], ['investigate', 3.0], ['talk', 3.0]],
      sava: [['investigate', 6.0], ['idle', 4.0], ['talk', 3.0]],
      nika: [['investigate', 5.0], ['talk', 4.0], ['idle', 4.0]],
      'ministry-bosko': [['idle', 6.0], ['investigate', 3.0], ['talk', 3.0]],
      petar: [['repair', 6.0], ['idle', 4.0], ['investigate', 3.0]],
      'echo-mara': [['idle', 8.0]],
      'campfire-rada': [['talk', 6.0], ['idle', 5.0]],
      'campfire-miro': [['repair', 5.0], ['talk', 4.0], ['idle', 4.0]],
      'campfire-seline': [['idle', 5.0], ['talk', 5.0]],
      hana: [['investigate', 5.0], ['talk', 4.0], ['idle', 4.0]],
    };
    let index = 0;
    for (const [id, steps] of Object.entries(sequences)) {
      index += 1;
      if (lifeStates.has(id)) {
        this.characters.play(id, lifeStates.get(id));
        continue;
      }
      const total = steps.reduce((sum, step) => sum + step[1], 0);
      // A stable per-character offset keeps the square out of lockstep.
      let phase = (this.ambientAnimElapsed * 1.0 + index * 3.7) % total;
      let action = steps[0][0];
      for (const [name, duration] of steps) {
        if (phase < duration) {
          action = name;
          break;
        }
        phase -= duration;
      }
      this.characters.play(id, action);
    }
  }
  // ------------------------------------------------------------------ setup
  async initialize() {
    document.body.classList.add('gameplay-active');
    this.elements.sunriseTableau?.querySelector('#sunrise-tableau-continue')?.addEventListener('click', (event) => {
      event.stopPropagation();
      this.leaveSunriseTableau();
    });
    this.preview.setLightingMode?.('clear-afternoon');
    this.preview.player.position.copy(positionFrom(OPENING_POSITIONS.playerStart));
    this.preview.stopWalking();
    this.preview.resetCamera();
    const scene = this.preview.scene;

    this.lev = makeActor(scene, { name: 'opening-lev-placeholder', color: 0x4f5a50, position: OPENING_POSITIONS.levStart, scale: 0.96 });
    this.eda = makeActor(scene, { name: 'opening-eda-placeholder', color: 0x82664d, position: OPENING_POSITIONS.eda, scale: 0.94 });
    this.olek = makeActor(scene, { name: 'opening-olek-placeholder', color: 0x55636a, position: OPENING_POSITIONS.olek, scale: 1.02 });
    this.toma = makeActor(scene, { name: 'opening-toma-placeholder', color: 0x6a5b47, position: OPENING_POSITIONS.toma, scale: 0.98 });
    this.produceVendor = makeActor(scene, { name: 'opening-produce-vendor-placeholder', color: 0x6c4938, position: OPENING_POSITIONS.produceVendor, scale: 1.02 });
    this.flowerVendor = makeActor(scene, { name: 'opening-flower-vendor-placeholder', color: 0x6c536d, position: OPENING_POSITIONS.flowerVendor, scale: 0.92 });
    this.petar = makeActor(scene, { name: 'dusk-petar-maintenance-worker', color: 0x4d5448, position: OPENING_POSITIONS.petarDusk, scale: 1.02 });
    this.petar.visible = false;
    this.echoMara = makeActor(scene, { name: 'echo-mara-one-step-ahead', color: 0x1b2a2e, position: SCANNER_FIELDS.station.from, scale: 0.94 });
    this.echoMara.visible = false;
    // Her scarf is the one colour she carries (every witness names it). This
    // one rides the placeholder until her rig streams in; attachRoseScarf()
    // then ties the real one to the rig's neck (alpha round 4: the old ring
    // floated above the rig's head, so she read as a plain grey figure).
    this.echoMaraFallbackScarf = makeRoseScarf();
    this.echoMaraFallbackScarf.position.y = 1.42;
    this.echoMaraFallbackScarf.scale.setScalar(1.6);
    this.echoMara.add(this.echoMaraFallbackScarf);
    this.campfireRada = makeActor(scene, { name: 'campfire-rada-postal-sorter', color: 0x7f493b, position: [-50.35, 0.5, 33.0], scale: 0.96 });
    this.campfireMiro = makeActor(scene, { name: 'campfire-miro-tram-mechanic', color: 0x3f5660, position: [-54.75, 0.5, 32.8], scale: 1.02 });
    this.campfireSeline = makeActor(scene, { name: 'campfire-seline-laundry-worker', color: 0x6f5874, position: [-54.15, 0.5, 35.8], scale: 0.93 });
    this.levOutline = makeDynamicObjectHighlight(this.lev);
    this.edaOutline = makeDynamicObjectHighlight(this.eda);
    this.olekOutline = makeDynamicObjectHighlight(this.olek);
    this.tomaOutline = makeDynamicObjectHighlight(this.toma);
    this.petarOutline = makeDynamicObjectHighlight(this.petar);
    this.campfireSelineOutline = makeObjectHighlight(this.campfireSeline);
    this.campfireKettle = makeCampfireKettle(scene);
    this.morningCampfireEchoStone = makeMorningCampfireEchoStone(scene);
    this.morningCampfireEchoStoneOutline = makeObjectHighlight(this.morningCampfireEchoStone, 0x79dfff);
    this.lampOilStall = makeLampOilStall(scene);
    this.seam = makeDarkSeam(scene, (x, z) => this.preview.surfaceHeightAt(x, z));
    this.cutInterface = makeCutInterface(scene);
    this.cartObject = scene.getObjectByName('porter-handcart');
    this.ministryHall = createChapter3MinistryHall(scene);
    this.hotelHall = createChapter3HotelHall(scene);
    // Interior sets share the exterior scene root and start hidden.
    this.ministryHall.group.visible = false;
    this.hotelHall.group.visible = false;
    // The occupied guest rooms, the old evidence papers and the lobby guests
    // are scenery now: nothing behind those doors is part of the chapter.
    for (const guest of [this.hotelHall.irena, this.hotelHall.vesna, this.hotelHall.daro]) guest.visible = false;
    this.groundMessage = makeGroundMessage(scene, (x, z) => this.preview.surfaceHeightAt(x, z));
    this.cutInterface.group.position.copy(this.groundMessage.interfacePosition);
    this.lampsNearFire = scene.children.filter((object) => object.name === 'street-lamp'
      && Math.hypot(object.position.x - FIRE_SITE.x, object.position.z - FIRE_SITE.z) < 8.5);
    this.finalDoor = makeFinalTrainDoor(scene);
    this.hotelEntrance = new THREE.Group();
    this.hotelEntrance.name = 'copper-heron-entrance-marker';
    const hotelSign = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.05, 0.14), new THREE.MeshStandardMaterial({ color: 0x54372a, roughness: 0.82 }));
    hotelSign.position.y = 1.5;
    hotelSign.rotation.y = Math.PI / 2;
    this.hotelEntrance.add(hotelSign);
    this.hotelEntrance.position.set(50.45, 0, -13.3);
    scene.add(this.hotelEntrance);
    const anchor = (name, position, rotationY = 0) => {
      const group = new THREE.Group();
      group.name = name;
      group.position.fromArray(position);
      group.rotation.y = rotationY;
      scene.add(group);
      return group;
    };
    this.replacementAnchors = { flower: anchor('chapter3-flower-stall-replacement-anchor', [-21.4, 0.55, -5.2], 0.18) };

    this.scannerFields = {
      market: new Chapter3ScannerField(scene, SCANNER_FIELDS.market, { groundHeightAt: (x, z) => this.preview.surfaceHeightAt(x, z) }),
      station: new Chapter3ScannerField(scene, SCANNER_FIELDS.station, { groundHeightAt: (x, z) => this.preview.surfaceHeightAt(x, z) }),
    };
    this.bellClamp = new Chapter3BellClamp({
      preview: this.preview,
      onSeated: () => this.onFeedSeated(),
      onBell: () => this.startNightIgnition(),
    });
    this.ticketBoard = new Chapter3TicketBoard({
      model: this.model,
      onClose: ({ filed }) => this.onTicketBoardClosed(filed),
    });
    this.pips = document.createElement('div');
    this.pips.className = 'c3-pips';
    this.pips.hidden = true;
    this.pips.innerHTML = `<span class="c3-pips__label">IN STEP</span><i></i><i></i><i></i><span class="c3-pips__hint">${SCANNER_WORDS.holdHint}</span><span class="c3-pips__key">${SCANNER_WORDS.releaseHint}</span>`;
    this.pipsHint = this.pips.querySelector('.c3-pips__hint');
    document.body.append(this.pips);
    this.compass = document.createElement('div');
    this.compass.className = 'nf-tag c3-compass';
    this.compass.setAttribute('aria-hidden', 'true');
    this.compass.hidden = true;
    this.compass.innerHTML = '<i class="c3-compass__arrow"></i><span class="c3-compass__label"></span>';
    this.compassArrow = this.compass.querySelector('.c3-compass__arrow');
    this.compassLabel = this.compass.querySelector('.c3-compass__label');
    document.body.append(this.compass);
    this.controlsTag = document.createElement('div');
    this.controlsTag.className = 'nf-tag c3-controls';
    this.controlsTag.setAttribute('role', 'note');
    this.controlsTag.setAttribute('aria-label', 'Controls: click to walk, E to look, hold Tab to look around');
    this.controlsTag.hidden = true;
    document.body.append(this.controlsTag);
    // Alpha round 4 fix round (P2, the long walks): G · LEV LEADS THE WAY
    // under the task card while the destination is far (chapter3LongWalks).
    this.leadTag = document.createElement('button');
    this.leadTag.type = 'button';
    this.leadTag.className = 'nf-tag c3-lead';
    this.leadTag.hidden = true;
    this.leadTag.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.noteInput();
      this.leadTheWay();
    });
    document.body.append(this.leadTag);
    this.leadLine = document.createElement('p');
    this.leadLine.className = 'c3-lead-line';
    this.leadLine.setAttribute('aria-live', 'polite');
    document.body.append(this.leadLine);
    this.leadShown = null;
    this.leadTravelling = null;
    this.leadTravels = [];
    this.readout = document.createElement('div');
    this.readout.className = 'c3-readout';
    this.readout.hidden = true;
    document.body.append(this.readout);

    // Only the two rigs needed on the platform load before play.
    await Promise.all(this.characterSpecs().start.map((spec) => this.characters.attach(spec)));
    this.afterAssetGroup('start', this.characterSpecs().start);
    this.makeButchMarker();
    // R2-4: the two walks across the city end at a beacon (Toma at the
    // ministry front, Eda at her stall).
    this.guidanceBeacons = {
      ministry: makeGuidanceBeacon(scene, { name: 'chapter3-beacon-ministry' }),
      eda: makeGuidanceBeacon(scene, { name: 'chapter3-beacon-eda' }),
    };

    this.finalTrainObject = scene.getObjectByName('municipal-tram');
    this.finalTrainOutline = makeObjectHighlight(this.finalTrainObject || this.finalDoor.group);
    this.hotelEntranceOutline = makePreservingObjectHighlight(scene.getObjectByName('copper-heron-hotel') || this.hotelEntrance);
    this.hotelRegisterOutline = makeDynamicObjectHighlight(this.hotelHall.register);
    this.hotelBedOutline = makeObjectHighlight(this.hotelHall.bed);
    this.hotelCorridorEntranceOutline = makeObjectHighlight(this.hotelHall.corridorEntrance);
    this.hotelRoomExitOutline = makeObjectHighlight(this.hotelHall.roomExit);
    this.queueOutline = makeObjectHighlight(this.ministryHall.queueDispenser);
    this.nikaOutline = makeDynamicObjectHighlight(this.ministryHall.nika);
    this.savaOutline = makeDynamicObjectHighlight(this.ministryHall.sava);
    // G10: a warm smoke column over Seline's fire while the stone is there
    // to be found at dusk (it fades as Butch walks up).
    this.campfireBeacon = makeGuidanceBeacon(scene, { name: 'chapter3-beacon-campfire', color: 0xd9784a, height: 11 });
    this.boardTableOutline = makeObjectHighlight(this.ministryHall.discardedPrint);

    this.chapterEndCard = document.createElement('section');
    this.chapterEndCard.className = 'nf-title-card c3-end-card';
    this.chapterEndCard.hidden = true;
    this.chapterEndCard.innerHTML = `<div><p class="nf-title-card__kicker">${CHAPTER_END_CARD.kicker}</p><h1 class="nf-title-card__main">${CHAPTER_END_CARD.title}</h1><div class="nf-title-card__rule"></div><p class="c3-end-card__line">${CHAPTER_END_CARD.line}</p></div>`;
    document.body.append(this.chapterEndCard);

    const exterior = () => !this.insideHotel && !this.insideMinistry;
    const state = () => this.model.snapshot();
    this.interactions = [
      {
        id: 'lamp-oil-seam', label: 'Dark oil between the paving stones', verb: 'LOOK',
        position: positionFrom(OPENING_POSITIONS.seam), approach: OPENING_POSITIONS.seamApproach,
        // The line is ten metres long: hover and reach follow all of it.
        hitPoints: this.seam.points,
        outline: this.seam.outline,
        eligible: () => state().explorationBriefingComplete && !state().seamInspected,
        activate: () => this.openSeam(),
      },
      {
        id: 'transport-entrance', label: 'Toma · Transport Ministry', verb: 'TALK',
        position: this.toma.position, approach: OPENING_POSITIONS.transportApproach,
        outline: this.tomaOutline,
        eligible: () => exterior() && state().seamInspected && !state().transportEntranceReached,
        activate: () => this.openTransportEntrance(),
      },
      {
        id: 'nika-terminal', label: 'Nika · ticket terminal', verb: 'TALK',
        position: this.ministryHall.nika.position, approach: MINISTRY_POSITIONS.nikaApproach,
        outline: this.nikaOutline, interior: true,
        eligible: () => this.insideMinistry && Boolean(state().transportNumber) && !state().nikaComplete,
        activate: () => this.openNika(),
      },
      {
        // G11: the silent clerk Nika names. Hover only (never Tab or E).
        id: 'sava-records', label: 'Sava · issue records', verb: 'LOOK', ambient: true,
        position: this.ministryHall.sava.position.clone().add(new THREE.Vector3(0, 1.1, 0)),
        approach: MINISTRY_POSITIONS.savaApproach,
        outline: this.savaOutline, interior: true, screenRadius: 52,
        eligible: () => this.insideMinistry && !state().ticketBoardComplete,
        activate: () => this.openAmbientDialogue(SAVA_LOOK),
      },
      {
        id: 'ticket-board-table', label: 'Both tickets 43 · public table', verb: 'LAY OUT',
        position: this.ministryHall.discardedPrint.position, approach: MINISTRY_POSITIONS.discardedPrintApproach,
        outline: this.boardTableOutline, interior: true,
        eligible: () => this.insideMinistry && state().nikaComplete && !state().ticketBoardComplete,
        activate: () => this.openTicketBoard(),
      },
      {
        id: 'eda', label: 'Eda · lamp oil', verb: 'TALK',
        position: this.eda.position, approach: () => this.npcApproach(this.eda),
        outline: this.edaOutline,
        eligible: () => exterior() && state().ticketBoardComplete && !state().edaComplete,
        activate: () => this.openEda(),
      },
      {
        id: 'olek-walker', label: 'Olek · crossing with his cart', verb: 'GO TO',
        position: this.olek.position, approach: () => this.walkerApproach('market'),
        outline: this.olekOutline,
        eligible: () => exterior() && this.model.scannerActive('market') && !this.fieldState('market').matched
          && !this.scannerFields.market.logic.eligible(this.preview.player.position),
        activate: () => this.tryMatch('market'),
      },
      {
        id: 'cut-feed-interface', label: 'The cut lower feed · Petar', verb: 'LOOK',
        position: this.cutInterface.group.position, approach: OPENING_POSITIONS.cutInterfaceApproach,
        outline: this.cutInterface.highlight,
        eligible: () => exterior() && state().marketCrossed && !state().cutInterfaceComplete,
        activate: () => this.openCutInterface(),
      },
      {
        id: 'campfire-seline', label: 'Seline · by the fire', verb: 'TALK',
        position: this.campfireSeline.position, approach: [-53.0, 0.5, 37.0],
        outline: this.campfireSelineOutline,
        eligible: () => this.campfireGatheringVisible(),
        activate: () => this.openCampfireSelineDialogue(),
      },
      {
        id: 'copper-heron-entrance', label: 'The Copper Heron', verb: 'ENTER',
        position: this.hotelEntrance.position, approach: [50.3, 0.5, -12.4],
        outline: this.hotelEntranceOutline,
        eligible: () => exterior() && state().cutInterfaceComplete && !state().hotelEntered,
        activate: () => this.enterCopperHeron(),
      },
      {
        id: 'hotel-register-hana', label: 'Hana · the guest ledger', verb: 'TALK',
        position: this.hotelHall.register.position, approach: () => this.npcApproach(this.hotelHall.hana, 1.2, 0.5),
        outline: this.hotelRegisterOutline, interior: true,
        eligible: () => this.hotelArea === 'lobby' && state().hotelEntered && !state().hotelCheckInComplete,
        activate: () => this.openHanaRegister(),
      },
      {
        id: 'hotel-corridor-entrance', label: 'Upstairs · your room', verb: 'GO',
        position: this.hotelHall.corridorEntrance.position, approach: HOTEL_POSITIONS.corridorEntranceApproach,
        outline: this.hotelCorridorEntranceOutline, interior: true,
        eligible: () => this.hotelArea === 'lobby' && state().hotelCheckInComplete && !state().hotelCorridorEntered,
        activate: () => this.enterHotelCorridor(),
      },
      {
        id: 'hotel-bed', label: 'The bed', verb: 'SLEEP',
        position: this.hotelHall.bed.position, approach: HOTEL_POSITIONS.bedApproach,
        outline: this.hotelBedOutline, interior: true, reach: HOTEL_BED_REACH,
        eligible: () => this.hotelArea === 'room' && state().hotelRoomEntered && !state().slept,
        activate: () => this.openSleep(),
      },
      {
        id: 'hotel-night-room-door', label: 'The room door · out to the square', verb: 'OPEN',
        position: this.hotelHall.roomExit.position, approach: HOTEL_POSITIONS.roomExitApproach,
        outline: this.hotelRoomExitOutline, interior: true,
        eligible: () => this.hotelArea === 'room' && state().slept && !state().nightRoomLeft && this.butchBedTransition === null,
        activate: () => this.leaveRoomAtNight(),
      },
      {
        id: 'night-burning-message', label: 'The burning letters', verb: 'READ',
        position: this.groundMessage.position, approach: () => this.fireReadingSpot(),
        outline: this.groundMessage.highlight,
        eligible: () => exterior() && state().nightRouteStarted && !state().nightFireObserved,
        activate: () => this.openNightFire(),
      },
      {
        id: 'night-cut-feed', label: 'The loose feed · drag it into the clamp', verb: 'E · SEAT',
        position: this.groundMessage.interfacePosition, approach: () => this.clampApproach(),
        outline: this.cutInterface.highlight, reach: 3.2,
        eligible: () => exterior() && state().nightFireObserved && !state().wireReconnected,
        activate: () => this.bellClamp.seat(),
      },
      {
        id: 'morning-campfire-echo-stone', label: 'Something blue in the ashes', verb: 'TAKE',
        position: this.morningCampfireEchoStone.position, approach: [-52.35, 0.5, 36.15],
        outline: this.morningCampfireEchoStoneOutline, screenRadius: 62,
        eligible: () => this.morningCampfireStoneAvailable(),
        activate: () => this.collectMorningCampfireStone(),
      },
      {
        id: 'lev-morning-companion', label: 'Lev', verb: 'TALK',
        position: this.lev.position, approach: () => this.morningLevApproach(),
        // He walks beside Butch all morning: tagged on hover or Tab only.
        outline: this.levOutline, follows: true,
        eligible: () => exterior() && state().sunriseViewed && !state().stationReached && this.lev.visible,
        activate: () => this.openAmbientDialogue(MORNING_LEV_REMINDER),
      },
      {
        id: 'mara-walker', label: 'The woman in the rose scarf', verb: 'GO TO',
        position: this.echoMara.position, approach: () => this.walkerApproach('station'),
        outline: makeDynamicObjectHighlight(this.echoMara, 0xc98088),
        eligible: () => exterior() && this.model.scannerActive('station') && this.echoMara.visible
          && !this.fieldState('station').matched
          && !this.scannerFields.station.logic.eligible(this.preview.player.position),
        activate: () => this.tryMatch('station'),
      },
    ];

    // The five flavour objects: hover-only lines, never lit by Tab.
    for (const [id, copy] of Object.entries(FLAVOUR_OBJECTS)) {
      const object = scene.getObjectByName(id);
      const spec = CITY_MODELS.find((entry) => entry.id === id);
      if (!object || !spec) continue;
      const position = positionFrom(spec.position);
      if (position.y < 1) position.y = 1.2;
      this.interactions.push({
        id: `flavour-${id}`, label: spec.label || 'Echo City', verb: 'LOOK', ambient: true,
        position,
        approach: () => {
          const direction = this.preview.player.position.clone().sub(position).setY(0);
          if (direction.lengthSq() < 0.01) direction.set(0, 0, 1);
          return position.clone().add(direction.normalize().multiplyScalar(id === 'open-air-station' ? 3.2 : 2.2)).setY(0.5).toArray();
        },
        screenRadius: 40,
        outline: makePreservingObjectHighlight(object),
        eligible: () => exterior() && !state().boardedTrain && !(state().nightRouteStarted && !state().morningStarted),
        activate: () => {
          const count = this.flavourUseCounts.get(id) ?? 0;
          this.flavourUseCounts.set(id, count + 1);
          this.openAmbientDialogue([{ speaker: 'BUTCH', text: copy[count > 0 ? 1 : 0] }]);
        },
      });
    }

    this.preview.renderer.domElement.addEventListener('pointerdown', (event) => this.handlePointerDown(event));
    window.addEventListener('pointerup', () => { this.pointerHeld = false; });
    window.addEventListener('blur', () => { this.pointerHeld = false; this.keysHeld.clear(); this.walkInStepHeld = false; });

    this.applyStartState();
    if (this.characterQa) this.stageCharacterQa();
    this.timeVisual.requestClock(this.model.snapshot().clock, { immediate: true });
    this.initialized = true;
    this.updateObjective();
    this.updateOutlines();
    this.updateDiagnosticState();
    const initial = this.model.snapshot();
    if (!initial.arrivalRead && !this.characterQa) {
      this.showTitleCard();
      this.openArrival();
    } else if (/-resumed$/.test(initial.lastEvent)) {
      // Continue from a mid-chapter resume point: the chapter's title card.
      this.showTitleCard();
    }
    // Everything else streams in while the player is on the platform.
    this.streamDeferredAssets();
  }

  // Dev playtest starts (and the start of a fresh chapter) place the cast
  // for the model's current beat.
  applyStartState() {
    const state = this.model.snapshot();
    const place = (object, values) => object.position.copy(positionFrom(values));
    if (!state.arrivalRead) return;
    // The night service has already gone on.
    for (const id of ['municipal-tram', 'municipal-tram-car-02', 'municipal-tram-car-03']) {
      const object = this.preview.scene.getObjectByName(id);
      if (object) object.visible = false;
    }
    // Alpha round 4: a resume (or QA start) inside the public hall, before
    // Nika or at the public table.
    if (state.transportHallEntered && !state.ticketBoardComplete) {
      this.stageMinistryHall({ at: state.nikaComplete ? 'board' : null });
      return;
    }
    // Inside the Copper Heron, before the night: the lobby (Hana) or the room.
    if (state.hotelEntered && !state.slept) {
      this.stageHotelInterior();
      return;
    }
    // QA starts at the oil line and on the walk to the ministry.
    if (state.explorationBriefingComplete && !state.seamInspected) {
      place(this.preview.player, [-1.5, 0.5, 14.5]);
      place(this.lev, OPENING_POSITIONS.levInterview);
    }
    if (state.seamInspected && !state.transportEntranceReached) {
      place(this.preview.player, OPENING_POSITIONS.seamApproach);
      place(this.lev, [4.6, 0.5, 10.6]);
    }
    // The tickets are filed: out on the ministry steps, as the hall left him.
    if (state.ticketBoardComplete && !state.edaComplete) {
      place(this.preview.player, OPENING_POSITIONS.transportApproach);
      place(this.lev, OPENING_POSITIONS.levTransportExterior);
    }
    if (state.edaComplete && !state.marketCrossed) {
      place(this.preview.player, [-15.6, 0.5, 1.8]);
      place(this.lev, [-14.6, 0.5, 2.9]);
    }
    // Olek and his cart have already gone on past the market crossing.
    if (state.marketCrossed) {
      this.olekExitElapsed = 9;
      this.olek.visible = false;
      if (this.cartObject) this.cartObject.visible = false;
    }
    if (state.marketCrossed && !state.cutInterfaceComplete) {
      place(this.preview.player, OPENING_POSITIONS.cutInterfaceApproach);
      place(this.lev, OPENING_POSITIONS.levDusk);
      this.cutInterface.group.visible = true;
      this.petar.visible = true;
    }
    if (state.cutInterfaceComplete && !state.hotelEntered) {
      place(this.preview.player, [47.8, 0.5, -11.4]);
      place(this.lev, [46.5, 0.5, -10.4]);
      this.cutInterface.group.visible = true;
    }
    if (state.mode === 'central-square-night') {
      place(this.preview.player, this.fireReadingSpot());
      this.lev.visible = false;
      this.cutInterface.group.visible = true;
      this.cutInterface.group.position.copy(this.groundMessage.interfacePosition);
      this.groundMessage.setFirstBurning(true);
      this.setNightDreamRendering(true);
      if (state.nightFireObserved && !state.wireReconnected) window.setTimeout(() => this.beginWirePuzzle(), 50);
    }
    if (state.morningStarted) {
      this.restoreMorningTrainAtStation();
      this.cutInterface.group.visible = true;
      this.cutInterface.group.position.copy(this.groundMessage.interfacePosition);
      this.groundMessage.setFirstBurning(true);
      this.groundMessage.setSecondBurning(true);
      this.groundMessage.setBurnedOut();
      place(this.preview.player, MORNING_START.butch);
      place(this.lev, MORNING_START.lev);
      this.lev.visible = true;
      this.startMorningLevFollow();
      if (!state.sunriseViewed) window.setTimeout(() => this.showSunrise(), 50);
    }
    if (state.stationReached) {
      place(this.preview.player, [-2.6, 0.5, 21.0]);
      place(this.lev, ENDING_SLICE_POSITIONS.levPlatform);
      this.morningLevFollowing = false;
      this.beginStationFinale({ fromQa: true });
    }
    if (this.magicStoneQa) {
      place(this.preview.player, [-53.0, 0.5, 37.0]);
      place(this.lev, [-51.8, 0.5, 37.7]);
    }
    this.preview.stopWalking();
    this.preview.resetCamera();
  }

  showTitleCard() {
    const card = document.createElement('section');
    card.className = 'nf-title-card';
    card.setAttribute('aria-hidden', 'true');
    card.innerHTML = '<div><p class="nf-title-card__kicker">CHAPTER 3</p><h1 class="nf-title-card__main">ECHO CITY</h1><div class="nf-title-card__rule"></div></div>';
    document.body.append(card);
    window.setTimeout(() => card.remove(), 4800);
  }

  // Butch is ~30 px tall at 720p: a soft amber pool under his feet and a
  // faint warm lift on his rig make him the first thing the eye finds.
  makeButchMarker() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    const glow = context.createRadialGradient(64, 64, 8, 64, 64, 64);
    glow.addColorStop(0, 'rgba(255, 214, 150, 0.85)');
    glow.addColorStop(0.45, 'rgba(224, 162, 74, 0.45)');
    glow.addColorStop(1, 'rgba(224, 162, 74, 0)');
    context.fillStyle = glow;
    context.fillRect(0, 0, 128, 128);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const halo = new THREE.Mesh(
      new THREE.PlaneGeometry(1.7, 1.7),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    halo.rotation.x = -Math.PI / 2;
    halo.renderOrder = 2;
    halo.name = 'chapter3-butch-marker';
    const rim = new THREE.Mesh(
      new THREE.RingGeometry(0.56, 0.63, 40),
      new THREE.MeshBasicMaterial({ color: 0xe0a24a, transparent: true, opacity: 0.6, depthWrite: false }),
    );
    rim.position.z = 0.002;
    halo.add(rim);
    this.preview.scene.add(halo);
    this.butchMarker = halo;
    const rig = this.characters.get('butch')?.visual;
    rig?.traverse((child) => {
      if (!child.isMesh) return;
      for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
        if (!material || !('emissive' in material)) continue;
        material.emissive.setHex(0x3a2210);
        material.emissiveIntensity = 0.55;
      }
    });
    // Round 3 art pass: a warm rim keeps his outline against the cobbles.
    // A tight edge only: from this high camera most of a thin figure is at a
    // grazing angle, and a soft rim washed his whole coat pale by day.
    applyRimLight(rig, { color: 0xffbf73, strength: 0.85, power: 4 });
    this.butchRig = rig;
    this.updateButchSilhouette();
  }

  // Alpha round 3: on LOW / LOWEST the per-pixel rim read as sparkly speckle
  // (butch-zoom.png). There Butch swaps it for a clean warm inverted-hull
  // outline of constant screen width; the ground ring stays. HIGH keeps the
  // rim. One way, like the tier itself.
  updateButchSilhouette() {
    const rig = this.butchRig;
    if (!rig || this.preview.qualityTier === 'high') return false;
    if (!this.butchSilhouette) {
      setRimLightStrength(rig, 0);
      this.butchSilhouette = addSilhouetteOutline(rig, { color: BUTCH_SILHOUETTE.color, widthPx: 1, opacity: BUTCH_SILHOUETTE.opacity, name: 'chapter3-butch-silhouette' });
    }
    const renderer = this.preview.renderer;
    const size = renderer.getDrawingBufferSize(this.butchSilhouetteSize ?? (this.butchSilhouetteSize = new THREE.Vector2()));
    this.butchSilhouette.uniforms.chapter3OutlineViewport.value.copy(size);
    // A constant width in CSS pixels, never under one drawn pixel.
    this.butchSilhouette.uniforms.chapter3OutlineWidth.value = Math.max(1.1, BUTCH_SILHOUETTE.widthCssPx * renderer.getPixelRatio());
    return true;
  }

  updateButchMarker() {
    const halo = this.butchMarker;
    if (!halo) return;
    const player = this.preview.player;
    const state = this.model.snapshot();
    halo.visible = player.visible && !state.boardedTrain && !this.butchBedPoseActive && !this.ticketBoard.active;
    if (!halo.visible) return;
    const ground = this.insideMinistry || this.insideHotel ? null : this.preview.surfaceHeightAt(player.position.x, player.position.z);
    halo.position.set(player.position.x, (Number.isFinite(ground) ? ground : player.position.y - 0.47) + 0.035, player.position.z);
    halo.material.opacity = 0.55 + 0.15 * Math.sin(this.ambientElapsed * 2.2);
  }

  // The ministry front and Eda's stall carry a beacon while Butch is walking
  // to them; it fades out as he arrives (his own tag takes over).
  updateGuidanceBeacons() {
    if (!this.guidanceBeacons) return;
    const state = this.model.snapshot();
    const outside = !this.insideMinistry && !this.insideHotel && !state.boardedTrain;
    const free = !this.dialogue.active && !this.ticketBoard.active;
    const targets = {
      ministry: { host: this.toma, active: state.seamInspected && !state.transportEntranceReached },
      eda: { host: this.eda, active: state.ticketBoardComplete && !state.edaComplete },
    };
    for (const [id, { host, active }] of Object.entries(targets)) {
      const beacon = this.guidanceBeacons[id];
      const visible = Boolean(host) && outside && free && active && host.visible !== false;
      if (!visible) {
        beacon.update({ visible: false });
        continue;
      }
      const distance = this.preview.player.position.distanceTo(host.position);
      const strength = THREE.MathUtils.clamp((distance - 2.5) / 4, 0, 1);
      const ground = this.preview.surfaceHeightAt?.(host.position.x, host.position.z);
      beacon.update({ visible: strength > 0.02, position: host.position, ground, elapsed: this.ambientElapsed, strength });
    }
    // G10: the dusk fire (optional, the Echo Stone) smokes above the roofs
    // while the stone is still there; softer than the story beacons.
    if (this.campfireBeacon) {
      const fire = this.campfireKettle.position;
      const live = outside && free && this.campfireGatheringVisible()
        && !magicStoneSnapshot().collected.includes('chapter-3');
      const distance = Math.hypot(this.preview.player.position.x - fire.x, this.preview.player.position.z - fire.z);
      const strength = live ? 0.55 * THREE.MathUtils.clamp((distance - 6) / 8, 0, 1) : 0;
      this.campfireBeacon.update({ visible: strength > 0.02, position: fire, ground: 0.1, elapsed: this.ambientElapsed * 0.7, strength });
    }
  }

  // ------------------------------------------------------------------ input
  interactionLocked() {
    return this.characterQa
      || this.evidenceViewer.active
      || this.ticketBoard.active
      || this.dialogue.active
      // The opening train departure and Lev's walk to the oil line no longer
      // hold Butch: ground clicks work while they play (alpha round 1).
      || this.levWalkElapsed !== null
      || this.ministryTransitioning
      || this.hotelTransitioning
      || this.leadTravelling !== null
      || this.hotelDoorElapsed !== null
      || this.levHotelExitElapsed !== null
      || this.butchBedTransition !== null
      || this.sunriseTableauHoldElapsed !== null
      || this.sunrisePending === true
      || this.nightIgnitionElapsed !== null
      || this.scannerFreezeRemaining > 0
      || (this.model.snapshot().boardedTrain && !this.model.snapshot().chapterComplete);
  }

  eligibleInteractions() {
    return this.interactions.filter((interaction) => interaction.eligible());
  }

  // The active scanner crossing, if Butch stands in its direct-movement field.
  activeField() {
    for (const [id, field] of Object.entries(this.scannerFields ?? {})) {
      if (!this.model.scannerActive(id)) continue;
      if (this.fieldState(id).matched || field.logic.contains(this.preview.player.position)) return { id, field };
    }
    return null;
  }

  fieldState(id) {
    return this.scannerFields[id].logic.snapshot();
  }

  screenOf(position) {
    const rect = this.preview.renderer.domElement.getBoundingClientRect();
    const projected = position.clone().project(this.preview.camera);
    return {
      x: rect.left + (projected.x + 1) * rect.width * 0.5,
      y: rect.top + (1 - projected.y) * rect.height * 0.5,
      onScreen: projected.z < 1 && Math.abs(projected.x) < 1.05 && Math.abs(projected.y) < 1.05,
    };
  }

  noteInput() {
    this.idleElapsed = 0;
  }

  // Metres from Butch: to the nearest stretch of a long interactable (the
  // oil line), otherwise to its point.
  interactionDistance(interaction) {
    const player = this.preview.player.position;
    if (!interaction.hitPoints) return player.distanceTo(interaction.position);
    return closestOnPolyline2D(
      { x: player.x, y: player.z },
      interaction.hitPoints.map((entry) => ({ x: entry.x, y: entry.z })),
    ).distance;
  }

  // The world point `hit` ({ index, t } from closestOnPolyline2D) names.
  polylinePoint(points, hit) {
    const a = points[hit.index];
    const b = points[Math.min(points.length - 1, hit.index + 1)];
    return a.clone().lerp(b, hit.t);
  }

  // Where an interactable's tag hangs: a long one under the pointer or
  // beside Butch, everything else over its own point.
  interactionTagAnchor(interaction, hovered) {
    if (!interaction.hitPoints) return interaction.position.clone();
    if (hovered && this.hoverAnchor) return this.hoverAnchor.clone();
    const player = this.preview.player.position;
    const hit = closestOnPolyline2D({ x: player.x, y: player.z }, interaction.hitPoints.map((entry) => ({ x: entry.x, y: entry.z })));
    return this.polylinePoint(interaction.hitPoints, hit);
  }

  handlePointerDown(event) {
    if (!this.initialized || event.button !== 0) return;
    this.noteInput();
    this.pointerClient = { x: event.clientX, y: event.clientY };
    // The clamp takes its own drags and near misses. It never stops Butch's
    // walk to the clamp (a drag used to cancel the E walk).
    if (this.bellClamp.handlePointerDown(event)) {
      this.clampOwnsPointer = true;
      return;
    }
    this.clampOwnsPointer = false;
    if (this.activeField() && !this.interactionLocked() && !this.hoveredId) this.pointerHeld = true;
  }

  handlePointerMove(event) {
    if (this.pointerClient.x !== event.clientX || this.pointerClient.y !== event.clientY) this.noteInput();
    this.pointerClient = { x: event.clientX, y: event.clientY };
    if (this.bellClamp.handlePointerMove(event)) return true;
    if (!this.initialized || this.interactionLocked()) {
      this.hoveredId = null;
      this.preview.renderer.domElement.classList.remove('interaction-hover');
      return false;
    }
    let nearest = null;
    const point = this.preview.projectPointerToGround(event);
    const pointer = { x: event.clientX, y: event.clientY };
    for (const interaction of this.eligibleInteractions()) {
      // While the clamp is live, the copper end and the ring take the
      // pointer; the loose-feed interactable never walks Butch onto them.
      if (interaction.id === 'night-cut-feed' && this.bellClamp.active) continue;
      let screenDistance;
      let groundDistance;
      let anchor = null;
      if (interaction.hitPoints) {
        // A long interactable (the oil line) answers anywhere along itself.
        const screenPoints = interaction.hitPoints.map((entry) => this.screenOf(entry));
        const onScreen = closestOnPolyline2D(pointer, screenPoints);
        screenDistance = onScreen.distance;
        anchor = this.polylinePoint(interaction.hitPoints, onScreen);
        groundDistance = point
          ? closestOnPolyline2D({ x: point.x, y: point.z }, interaction.hitPoints.map((entry) => ({ x: entry.x, y: entry.z }))).distance
          : Infinity;
      } else {
        const screen = this.screenOf(interaction.position);
        screenDistance = Math.hypot(event.clientX - screen.x, event.clientY - screen.y);
        groundDistance = point ? Math.hypot(point.x - interaction.position.x, point.z - interaction.position.z) : Infinity;
      }
      const precise = interaction.ambient === true;
      const screenRadius = interaction.screenRadius ?? (precise ? 30 : (interaction.position.y > 1.5 ? 56 : 44));
      const score = screenDistance <= screenRadius
        ? screenDistance / screenRadius
        : !precise && groundDistance <= INTERACTION_RADIUS * 0.7
          ? 1 + groundDistance / INTERACTION_RADIUS
          : Infinity;
      if (score < Infinity && (!nearest || score < nearest.score)) nearest = { id: interaction.id, score, anchor };
    }
    this.hoveredId = nearest?.id || null;
    this.hoverAnchor = nearest?.anchor ?? null;
    this.preview.renderer.domElement.classList.toggle('interaction-hover', Boolean(this.hoveredId));
    this.updateOutlines();
    return Boolean(this.hoveredId);
  }

  handlePointerUp(event = null) {
    if (!this.initialized) return false;
    this.pointerHeld = false;
    if (this.bellClamp.handlePointerUp(event)) return true;
    if (this.clampOwnsPointer) {
      this.clampOwnsPointer = false;
      return true;
    }
    if (this.levWalkElapsed !== null && !this.dialogue.active && this.skipScriptedWalk()) return true;
    if (this.interactionLocked()) return true;
    // R2-5: while the feed is loose, a click on the ground by the copper end
    // or the ring is a missed grab (even when its press closed the caption
    // or began elsewhere), never a walk onto the clamp.
    if (this.bellClamp.active && !this.bellClamp.seated) {
      const ground = this.preview.projectPointerToGround({
        clientX: event?.clientX ?? this.pointerClient.x,
        clientY: event?.clientY ?? this.pointerClient.y,
      });
      if (this.bellClamp.nearPuzzle(ground)) {
        this.bellClamp.noteMiss('grab');
        return true;
      }
    }
    const interaction = this.eligibleInteractions().find((entry) => entry.id === this.hoveredId);
    if (!interaction && (this.insideMinistry || this.insideHotel)) {
      const point = this.preview.projectPointerToGround({
        clientX: event?.clientX ?? this.pointerClient.x,
        clientY: event?.clientY ?? this.pointerClient.y,
      });
      if (!point) return true;
      const walkY = this.insideMinistry ? 1.26 : 0.5;
      if (!this.walkInsideMinistry([point.x, walkY, point.z])) this.flashBlockedClick(point);
      return true;
    }
    // Scanner fields use direct movement; a click never paths through them.
    if (!interaction && this.activeField()) return true;
    if (!interaction) {
      // The preview paths Butch to the clicked ground.
      this.noteControlUsed('walk');
      return false;
    }
    this.startInteraction(interaction);
    return true;
  }

  // The controls tag greys a verb once it is used (chapter3Guidance).
  noteControlUsed(id) {
    if (this.controlsUsed.has(id)) return false;
    this.controlsUsed.add(id);
    return true;
  }

  updateControlsHint(locked) {
    const tag = this.controlsTag;
    if (!tag) return;
    const hint = controlsHintState({ used: [...this.controlsUsed], locked: locked || this.characterQa });
    this.controlsHintVisible = hint.visible;
    if (!hint.visible) {
      if (!tag.hidden) tag.hidden = true;
      return;
    }
    const html = controlsHintHtml(hint.segments);
    if (tag.dataset.html !== html) {
      tag.innerHTML = html;
      tag.dataset.html = html;
    }
    tag.hidden = false;
    // Just under the task card, left-aligned with it.
    const card = this.elements.objectiveCard?.getBoundingClientRect();
    const left = card ? card.left : 18;
    const top = card && card.height ? card.bottom + 10 : 64;
    tag.style.left = `${Math.round(left)}px`;
    tag.style.top = `${Math.round(top)}px`;
  }

  startInteraction(interaction) {
    this.noteControlUsed('look');
    this.preview.renderer.domElement.classList.remove('interaction-hover');
    const approachValues = typeof interaction.approach === 'function' ? interaction.approach() : interaction.approach;
    const approach = positionFrom(approachValues);
    const ids = this.npcIdsForInteraction(interaction.id);
    this.activeNpcConversationIds = new Set(ids);
    this.activeNpcConversationId = ids[0] || null;
    if (this.preview.player.position.distanceTo(approach) < 0.8) {
      this.activateInteraction(interaction);
      return;
    }
    const started = interaction.interior
      ? this.walkInsideMinistry(approachValues, () => this.activateInteraction(interaction))
      : this.preview.walkTo(approachValues[0], approachValues[2], () => this.activateInteraction(interaction));
    // An unreachable approach point must never swallow the click: talk from
    // where Butch stands instead.
    if (!started) this.activateInteraction(interaction);
  }

  // Interior click-to-walk. When no route exists (a click on a counter or a
  // wall) Butch walks to the nearest reachable point instead; if even that
  // fails the marker flashes oxblood so the click visibly registered.
  walkInsideMinistry(position, onArrival = null) {
    const requestedTarget = positionFrom(position);
    const { bounds, obstacles } = this.interiorNavigation();
    if (!bounds) return false;
    let path = findInteriorPath(this.preview.player.position, requestedTarget, bounds, obstacles);
    if (path.length === 0) {
      const toward = requestedTarget.clone().sub(this.preview.player.position).setY(0);
      for (let t = 0.8; t > 0.05 && path.length === 0; t -= 0.15) {
        const partial = this.preview.player.position.clone().addScaledVector(toward, t);
        partial.y = requestedTarget.y;
        path = findInteriorPath(this.preview.player.position, clampInteriorPoint(partial, bounds, obstacles), bounds, obstacles);
      }
    }
    if (path.length === 0) return false;
    const target = path[path.length - 1];
    this.preview.path = path;
    // Rooms are short: inside, Butch always walks.
    this.preview.striding = false;
    this.preview.pathArrival = onArrival;
    this.preview.destinationMarker.material.color.setHex(0xe0a24a);
    this.preview.destinationMarker.position.set(target.x, target.y + 0.02, target.z);
    this.preview.destinationMarker.visible = true;
    return true;
  }

  interiorNavigation() {
    if (this.insideMinistry) return { bounds: MINISTRY_WALK_BOUNDS, obstacles: MINISTRY_FURNITURE_OBSTACLES };
    if (!this.insideHotel) return { bounds: null, obstacles: [] };
    if (this.hotelArea === 'lobby') return { bounds: HOTEL_LOBBY_WALK_BOUNDS, obstacles: HOTEL_LOBBY_FURNITURE_OBSTACLES };
    if (this.hotelArea === 'room') return { bounds: HOTEL_ROOM_WALK_BOUNDS, obstacles: HOTEL_ROOM_FURNITURE_OBSTACLES };
    return { bounds: HOTEL_CORRIDOR_WALK_BOUNDS, obstacles: [] };
  }

  flashBlockedClick(point) {
    const marker = this.preview.destinationMarker;
    marker.position.set(point.x, (this.insideMinistry ? 1.26 : 0.5) + 0.02, point.z);
    marker.material.color.setHex(0x8a2a1e);
    marker.visible = true;
    this.blockedFlashRemaining = 0.6;
    this.lastBlockedClick = { x: Number(point.x.toFixed(2)), z: Number(point.z.toFixed(2)) };
  }

  enforceHotelFurnitureCollision() {
    if (!this.insideHotel || !['lobby', 'room'].includes(this.hotelArea)) return null;
    const bounds = this.hotelArea === 'lobby' ? HOTEL_LOBBY_WALK_BOUNDS : HOTEL_ROOM_WALK_BOUNDS;
    const obstacles = this.hotelArea === 'lobby' ? HOTEL_LOBBY_FURNITURE_OBSTACLES : HOTEL_ROOM_FURNITURE_OBSTACLES;
    const blockedBy = hotelFurnitureAt(this.preview.player.position, this.hotelArea);
    if (!blockedBy) return null;
    this.preview.player.position.copy(clampInteriorPoint(this.preview.player.position, bounds, obstacles));
    this.preview.stopWalking();
    return blockedBy;
  }

  handleKeyDown(event) {
    this.noteInput();
    if (this.ticketBoard.active) return true;
    const movementKey = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code);
    if (movementKey) {
      this.keysHeld.add(event.code);
      if (!this.interactionLocked()) this.noteControlUsed('walk');
      if (this.activeField()) {
        event.preventDefault();
        return true;
      }
    }
    if (event.code === LEAD_KEY && !event.repeat && this.leadTheWay()) {
      event.preventDefault();
      return true;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      this.tabHeld = true;
      this.noteControlUsed('tab');
      this.updateOutlines();
      return true;
    }
    if (event.code === 'KeyE' || event.key === 'Enter') {
      event.preventDefault();
      if (event.repeat) return true;
      if (this.dialogue.active) {
        this.dialogue.handleAdvance();
        return true;
      }
      // Walk beside: E matches the walker, and holding it walks in step.
      const pacing = this.activeField();
      if (pacing && this.fieldState(pacing.id).matched && !this.interactionLocked()) {
        this.walkInStepHeld = true;
        return true;
      }
      if (this.sunriseTableauHoldElapsed !== null) {
        this.leaveSunriseTableau();
        return true;
      }
      if (this.interactionLocked()) return true;
      const field = this.activeField();
      if (field && field.field.logic.eligible(this.preview.player.position)) {
        this.tryMatch(field.id);
        this.walkInStepHeld = this.fieldState(field.id).matched;
        return true;
      }
      const nearest = this.eligibleInteractions()
        .map((interaction) => ({ interaction, distance: this.interactionDistance(interaction) }))
        .filter(({ distance, interaction }) => distance <= (interaction.reach ?? INTERACTION_RADIUS))
        .sort((a, b) => a.distance - b.distance)[0]?.interaction;
      if (!nearest) return false;
      this.startInteraction(nearest);
      return true;
    }
    // R (camera reset) stays available outside locked beats.
    return this.interactionLocked();
  }

  handleKeyUp(event) {
    this.keysHeld.delete(event.code);
    if (event.code === 'KeyE' || event.key === 'Enter') this.walkInStepHeld = false;
    if (event.key !== 'Tab') return false;
    event.preventDefault();
    this.tabHeld = false;
    this.updateOutlines();
    return true;
  }

  // Camera-relative intent on the ground: WASD / arrows, or the held mouse
  // pulling toward the cursor.
  movementIntent() {
    const forward = new THREE.Vector3();
    this.preview.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3(-forward.z, 0, forward.x);
    const intent = new THREE.Vector3();
    const held = (...codes) => codes.some((code) => this.keysHeld.has(code));
    if (held('KeyW', 'ArrowUp')) intent.add(forward);
    if (held('KeyS', 'ArrowDown')) intent.sub(forward);
    if (held('KeyD', 'ArrowRight')) intent.add(right);
    if (held('KeyA', 'ArrowLeft')) intent.sub(right);
    if (intent.lengthSq() < 0.01 && this.pointerHeld) {
      const point = this.preview.projectPointerToGround({ clientX: this.pointerClient.x, clientY: this.pointerClient.y });
      if (point) {
        intent.copy(point).sub(this.preview.player.position).setY(0);
        if (intent.length() < 0.35) intent.set(0, 0, 0);
      }
    }
    if (intent.lengthSq() > 0.0001) intent.normalize();
    return intent;
  }

  // ------------------------------------------------------------------ walk beside
  walkerApproach(id) {
    const logic = this.scannerFields[id].logic;
    const walker = logic.walkerPosition();
    const geometry = logic.geometry;
    // Stand on the camera side of the walker, a pace behind the safe line.
    const side = 1.1 * (this.scannerFields[id].field.side ?? 1);
    return [walker.x + geometry.n.x * side - geometry.u.x * 0.4, 0.5, walker.z + geometry.n.z * side - geometry.u.z * 0.4];
  }

  tryMatch(id) {
    const logic = this.scannerFields[id].logic;
    const before = logic.snapshot().matched;
    const events = logic.toggleMatch(this.preview.player.position);
    if (events.includes('matched')) {
      this.preview.stopWalking();
      car03Audio.matchSnap?.();
      this.matchBlend = 0;
    } else if (events.includes('released')) {
      car03Audio.release?.();
    } else if (!before) {
      // Clicked from afar: walk up beside them first.
      const approach = this.walkerApproach(id);
      this.preview.walkTo(approach[0], approach[2], () => this.tryMatch(id));
    }
    this.updateObjective();
  }

  updateScannerFields(dt) {
    const player = this.preview.player;
    this.directMoving = false;
    for (const [id, field] of Object.entries(this.scannerFields)) {
      const active = this.model.scannerActive(id);
      if (field.active !== active) field.setActive(active);
      if (!active) {
        field.updateRibbon(player.position, player.position, 0, false);
        field.showWalkerRing(player.position, false);
        continue;
      }
      const logic = field.logic;
      const locked = this.interactionLocked();
      const inField = logic.contains(player.position) || logic.snapshot().matched;
      const intent = !locked && inField ? this.movementIntent() : new THREE.Vector3();
      if (inField && (intent.lengthSq() > 0 || logic.snapshot().matched)) this.preview.stopWalking();
      const hold = Boolean(this.walkInStepHeld) && logic.snapshot().matched;
      const events = locked ? [] : logic.update(dt, { player: player.position, input: intent, hold });
      const snapshot = logic.snapshot();
      if (snapshot.matched) {
        // Butch keeps station at the walker's side.
        const beside = logic.besidePosition();
        this.matchBlend = Math.min(1, (this.matchBlend ?? 1) + dt / 0.25);
        const target = new THREE.Vector3(beside.x, player.position.y, beside.z);
        const previous = player.position.clone();
        player.position.lerp(target, this.matchBlend >= 1 ? 1 : 0.35);
        const moved = player.position.clone().sub(previous).setY(0);
        if (moved.lengthSq() > 1e-6) player.rotation.y = Math.atan2(logic.geometry.u.x, logic.geometry.u.z);
        this.directMoving = snapshot.walker.moving;
      } else if (inField && intent.lengthSq() > 0 && !locked) {
        const step = intent.clone().multiplyScalar(DIRECT_WALK_SPEED * dt);
        const next = player.position.clone().add(step);
        if (isWalkable(next.x, next.z, this.preview.boundaryObstacles)) {
          player.position.x = next.x;
          player.position.z = next.z;
        } else if (isWalkable(next.x, player.position.z, this.preview.boundaryObstacles)) {
          player.position.x = next.x;
        } else if (isWalkable(player.position.x, next.z, this.preview.boundaryObstacles)) {
          player.position.z = next.z;
        }
        player.rotation.y = Math.atan2(intent.x, intent.z);
        this.directMoving = true;
      }
      for (const event of events) this.onScannerEvent(id, event);
      field.render(snapshot.scanner);
      field.updateLaneArrow({ matched: snapshot.matched, wrongWay: snapshot.wrongWay, elapsed: this.ambientElapsed });
      const walkerHost = id === 'market' ? this.olek : this.echoMara;
      field.updateRibbon(player.position, walkerHost.position, snapshot.pipProgress, snapshot.matched);
      field.showWalkerRing(walkerHost.position, !snapshot.matched && logic.eligible(player.position), this.ambientElapsed);
    }
  }

  onScannerEvent(id, event) {
    if (event === 'pip') {
      car03Audio.duoStep?.(this.fieldState(id).pips);
    } else if (event === 'released') {
      car03Audio.release?.();
    } else if (event === 'warning') {
      car03Audio.warningTicks?.();
    } else if (event === 'pattern-ok') {
      car03Audio.archAccept?.();
    } else if (event === 'flagged') {
      this.model.flagScanner(id);
      car03Audio.flagStamp?.();
      this.scannerFreezeRemaining = 0.35;
      const back = this.scannerFields[id].logic.safeReturnPoint(this.preview.player.position);
      this.preview.stopWalking();
      window.setTimeout(() => {
        this.preview.player.position.set(back.x, this.preview.player.position.y, back.z);
      }, 350);
      this.dialogue.bark({ speaker: 'SCANNER', text: SCANNER_WORDS.flagged }, 2.6);
      this.preview.triggerCameraShake(0.2, 0.08);
    } else if (event === 'passed') {
      this.model.passScanner(id);
      car03Audio.completeTone?.();
      if (id === 'market') this.onMarketCrossed();
      else this.onStationScanPassed();
    }
  }

  // ------------------------------------------------------------------ beats
  // A checklist menu: topics answer and return to the menu; Continue appears
  // after one topic; the conclusion carries the facts the next beat needs.
  openTopicMenu({ opening = [], menu, responses, note, done, conclusion, onFinished, focus = null }) {
    this.preview.stopWalking();
    let finished = false;
    this.dialogue.show([...opening, menu()], {
      onChoice: (choiceId) => {
        if (responses[choiceId]) {
          note(choiceId);
          return [...responses[choiceId], menu()];
        }
        if (choiceId !== done) return [];
        finished = true;
        return typeof conclusion === 'function' ? conclusion() : conclusion;
      },
      onLineChange: (line) => this.frameSpeaker(line, focus),
      onComplete: () => {
        this.frameSpeaker(null);
        if (!finished) return;
        this.hoveredId = null;
        onFinished?.();
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  showLines(lines, { onComplete = null, focus = null } = {}) {
    this.preview.stopWalking();
    this.dialogue.show(lines, {
      onLineChange: (line) => this.frameSpeaker(line, focus),
      onComplete: () => {
        this.frameSpeaker(null);
        this.hoveredId = null;
        onComplete?.();
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  openAmbientDialogue(lines, { onComplete = null } = {}) {
    this.showLines(lines, { onComplete });
  }

  hostForSpeaker(speaker) {
    const path = SPEAKER_HOSTS[speaker];
    if (!path) return null;
    return path.split('.').reduce((object, key) => object?.[key], this) || null;
  }

  // The dialogue camera frames Butch and whoever is speaking, a little above
  // the caption bar. `focus` pins a subject (the oil line, the fire letters).
  frameSpeaker(line, focus = null) {
    if (!line) {
      this.speakerFocus = null;
      if (!this.insideMinistry && !this.insideHotel) this.preview.setCameraOverrideTarget(null);
      return;
    }
    if (this.insideHotel || this.insideMinistry) return;
    const host = this.hostForSpeaker(line.speaker);
    const player = this.preview.player.position;
    let subject;
    if (focus) subject = focus.clone();
    else if (host?.visible) subject = player.clone().lerp(host.position, 0.55);
    else subject = player.clone();
    // Push the subject up the frame so the caption bar never covers faces.
    const towardCamera = this.preview.camera.position.clone().sub(this.preview.controls.target).setY(0).normalize();
    subject.addScaledVector(towardCamera, focus ? 1.6 : 2.3);
    subject.y = 0.8;
    this.speakerFocus = subject;
    this.preview.setCameraOverrideTarget(subject);
  }

  // The conductor's call and Butch's line, then the orchard-case claim card
  // in his hand; closing it lets the train go (and Butch walk).
  openArrival() {
    const after = ARRIVAL_DIALOGUE.slice(ARRIVAL_BEFORE_CARD);
    const depart = () => {
      this.model.readArrival();
      this.beginTrainDeparture();
    };
    const finish = () => (after.length ? this.showLines(after, { onComplete: depart }) : depart());
    this.showLines(ARRIVAL_DIALOGUE.slice(0, ARRIVAL_BEFORE_CARD), {
      onComplete: () => {
        if (!this.evidenceViewer.open(CHAPTER3_DOCUMENTS.CLAIM_CARD, { onClose: finish })) finish();
      },
    });
  }

  beginTrainDeparture() {
    this.preview.stopWalking();
    const roots = ['municipal-tram', 'municipal-tram-car-02', 'municipal-tram-car-03']
      .map((name) => this.preview.scene.getObjectByName(name)).filter(Boolean);
    this.departureBases = roots.map((object) => ({ object, position: object.position.clone() }));
    this.departureElapsed = 0;
    this.updateObjective();
  }

  moveLevTo(position, duration, onComplete = null) {
    this.levWalkStart = this.lev.position.clone();
    this.levWalkTarget = position.isVector3 ? position.clone() : positionFrom(position);
    this.levWalkDuration = duration;
    this.levWalkElapsed = 0;
    this.levWalkOnComplete = onComplete;
  }

  beginLevArrivalApproach() {
    const towardButch = this.preview.player.position.clone().sub(this.lev.position).setY(0);
    if (towardButch.lengthSq() < 0.01) towardButch.set(0, 0, 1);
    towardButch.normalize();
    this.moveLevTo(this.preview.player.position.clone().addScaledVector(towardButch, -1.5), 1.9, () => this.openLevIntroduction());
    this.updateObjective();
  }

  openLevIntroduction() {
    this.showLines(LEV_INTRO_DIALOGUE, {
      onComplete: () => {
        this.model.completeLevIntroduction();
        this.beginGuidedWalk();
      },
    });
  }

  // Lev heads for the oil line and the player follows at their own pace: no
  // scripted walk for Butch and no briefing stop on the way.
  beginGuidedWalk() {
    if (!this.model.beginGuide()) return;
    this.model.completeExplorationBriefing();
    this.hoveredId = null;
    this.guideElapsed = 0;
    this.guideStart = this.lev.position.clone();
    this.updateObjective();
    this.updateOutlines();
  }

  // A click during one of Lev's scripted walks finishes it at once.
  skipScriptedWalk() {
    let skipped = false;
    if (this.levWalkElapsed !== null && this.levWalkTarget) {
      this.levWalkElapsed = this.levWalkDuration;
      skipped = true;
    }
    if (this.guideElapsed !== null) {
      this.guideElapsed = 4.0;
      skipped = true;
    }
    return skipped;
  }

  seamFocus() {
    const focus = new THREE.Vector3();
    for (const point of this.seam.points) focus.add(point);
    return focus.multiplyScalar(1 / this.seam.points.length);
  }

  openSeam() {
    this.openTopicMenu({
      opening: SEAM_DIALOGUE,
      menu: () => seamMenu(this.model.snapshot().seamObservations),
      responses: SEAM_TOPIC_RESPONSES,
      note: (choiceId) => this.model.observeSeam(choiceId.replace('seam-', '')),
      done: 'seam-conclude',
      conclusion: SEAM_CONCLUSION,
      focus: this.seamFocus(),
      onFinished: () => {
        this.model.concludeSeam();
        this.seam.outline.visible = false;
      },
    });
  }

  openTransportEntrance() {
    if (!this.model.reachTransportEntrance()) return;
    this.showLines(TRANSPORT_ENTRANCE_DIALOGUE, {
      onComplete: () => {
        if (!this.model.enterTransportHall()) return;
        // The queue number is taken for him (alpha round 1 length pass).
        this.model.takeTransportNumber('M-17');
        this.stageMinistryHall();
      },
    });
  }

  openNika() {
    this.openTopicMenu({
      opening: NIKA_OPENING,
      menu: () => nikaTopicMenu(this.model.snapshot().nikaTopics),
      responses: NIKA_TOPIC_RESPONSES,
      note: (choiceId) => this.model.noteNikaTopic(choiceId.replace('nika-', '')),
      done: 'nika-done',
      conclusion: NIKA_CONCLUSION,
      onFinished: () => {
        this.model.completeNika();
        this.ministryHall.discardedPrint.visible = true;
      },
    });
  }

  openTicketBoard() {
    this.preview.stopWalking();
    this.ticketBoard.open();
    this.updateObjective();
  }

  onTicketBoardClosed(filed) {
    if (!filed || !this.model.completeTicketBoard()) {
      this.updateObjective();
      return;
    }
    this.showLines(TICKET_BOARD_CONCLUSION, { onComplete: () => this.exitMinistryHall() });
  }

  openEda() {
    if (this.levWalkElapsed !== null) {
      this.levWalkOnComplete = () => this.openEda();
      return;
    }
    this.moveLevTo(OPENING_POSITIONS.levEda, 0.01);
    this.openTopicMenu({
      opening: EDA_OPENING,
      menu: () => edaTopicMenu(this.model.snapshot().edaTopics),
      responses: EDA_TOPIC_RESPONSES,
      note: (choiceId) => this.model.noteEdaTopic(choiceId.replace('eda-', '')),
      done: 'eda-done',
      conclusion: EDA_CONCLUSION,
      onFinished: () => {
        this.model.completeEda();
        this.walkBarkIndex = 0;
        this.walkBarkTimer = 0;
      },
    });
  }

  onMarketCrossed() {
    this.pips.hidden = true;
    this.cutInterface.group.visible = true;
    this.petar.visible = true;
    // Mid-chapter save: Continue resumes at dusk with the tickets filed.
    globalThis.dispatchEvent?.(new CustomEvent('nightfall:chapter3-checkpoint', { detail: { id: 'chapter-3-dusk' } }));
    this.showLines(MARKET_CROSSED_DIALOGUE, {
      onComplete: () => {
        this.timeVisual.requestClock(this.model.snapshot().clock);
        this.startMorningLevFollow();
      },
    });
  }

  clampApproach() {
    const clamp = this.groundMessage.interfacePosition;
    const towardCamera = this.preview.camera.position.clone().sub(this.preview.controls.target).setY(0).normalize();
    return [clamp.x + towardCamera.x * 1.4, 0.5, clamp.z + towardCamera.z * 1.4];
  }

  // G1: Petar's signed work order opens the beat (it is also what a dusk
  // save resumes on), then the conversation at the cut.
  openCutInterface() {
    this.preview.stopWalking();
    if (this.evidenceViewer.open(CHAPTER3_DOCUMENTS.MAINTENANCE_ORDER_C441, { onClose: () => this.openCutInterfaceTalk() })) return;
    this.openCutInterfaceTalk();
  }

  openCutInterfaceTalk() {
    this.butchActionOverride = 'crouch';
    this.openTopicMenu({
      opening: CUT_INTERFACE_OPENING,
      menu: () => cutInterfaceMenu(this.model.snapshot().cutInterfaceObservations),
      responses: CUT_INTERFACE_RESPONSES,
      note: (choiceId) => this.model.observeCutInterface(choiceId.replace('cut-', '')),
      done: 'cut-conclude',
      conclusion: CUT_INTERFACE_CONCLUSION,
      onFinished: () => {
        this.butchActionOverride = null;
        this.model.concludeCutInterface();
        this.petar.visible = false;
      },
    });
    window.setTimeout(() => { if (!this.dialogue.active) this.butchActionOverride = null; }, 100);
  }

  campfireGatheringVisible() {
    const state = this.model.snapshot();
    return !this.insideHotel && !this.insideMinistry && !state.boardedTrain && state.clock.period === 'DUSK';
  }

  openCampfireSelineDialogue() {
    if (magicStoneSnapshot().collected.includes('chapter-3')) {
      this.openAmbientDialogue(CAMPFIRE_SELINE_DIALOGUE);
      return;
    }
    // The stone is collected when Butch's last line closes, so the shell's
    // one-time first-stone card (~1.1 s after a first pickup) never opens
    // over the caption. Alpha round 4 (P2): the count is no longer a Butch
    // line; the stone gets the same notice as Chapter 2's (chime, a
    // "ECHO STONE · MAGIC STONE n / 5" toast, the shell's first-stone card).
    this.openAmbientDialogue(CAMPFIRE_SELINE_STONE_DIALOGUE, { onComplete: () => this.awardEchoStone() });
  }

  // Chapter 2's stone notice (BorrowedLightScene.takeStone): the shared
  // chime, a short toast with the count and the sockets, then the shell's
  // one-time first-stone card when this is the journey's first stone.
  awardEchoStone() {
    if (magicStoneSnapshot().collected.includes('chapter-3')) return false;
    collectMagicStone('chapter-3');
    stoneChime();
    const snapshot = magicStoneSnapshot();
    const toast = this.stoneToast ?? (this.stoneToast = document.createElement('div'));
    toast.className = 'c3-stone-toast';
    toast.setAttribute('role', 'status');
    toast.innerHTML = `${magicStoneRowHtml(snapshot)}<span>${echoStoneToastText(snapshot)}</span>`;
    if (!toast.isConnected) document.body.append(toast);
    toast.classList.remove('is-out');
    toast.hidden = false;
    // With the first-stone card coming (~1.1 s), the toast is gone by then.
    const firstCardComing = Boolean(firstStoneNotice('chapter-3'));
    window.clearTimeout(this.stoneToastTimer);
    this.stoneToastTimer = window.setTimeout(() => {
      toast.classList.add('is-out');
      this.stoneToastTimer = window.setTimeout(() => { toast.hidden = true; }, 600);
    }, firstCardComing ? 900 : 3200);
    return true;
  }

  morningCampfireStoneAvailable() {
    const state = this.model.snapshot();
    return !this.insideHotel && !this.insideMinistry
      && state.morningStarted && state.sunriseViewed
      && !state.boardedTrain && !this.morningStoneTaken
      && !magicStoneSnapshot().collected.includes('chapter-3');
  }

  collectMorningCampfireStone() {
    if (!this.morningCampfireStoneAvailable()) return false;
    this.morningCampfireEchoStone.visible = false;
    this.morningStoneTaken = true;
    this.openAmbientDialogue(MORNING_STONE_PICKUP, { onComplete: () => this.awardEchoStone() });
    return true;
  }

  enterCopperHeron() {
    this.preview.stopWalking();
    if (!this.model.enterHotel()) return;
    this.stageHotelInterior();
  }

  openHanaRegister() {
    this.preview.stopWalking();
    this.evidenceViewer.open(CHAPTER3_DOCUMENTS.HOTEL_REGISTER, {
      onClose: () => this.openTopicMenu({
        opening: HANA_OPENING,
        menu: () => hanaTopicMenu(this.model.snapshot().hanaTopics),
        responses: HANA_TOPIC_RESPONSES,
        note: (choiceId) => this.model.noteHanaTopic(choiceId.replace('hana-', '')),
        done: 'hana-done',
        conclusion: HANA_CONCLUSION,
        onFinished: () => {
          this.model.completeHotelCheckIn();
          // Lev leaves by the street door.
          this.moveLevTo(positionFrom(HOTEL_POSITIONS.lobbyExitApproach), 1.6, () => { this.lev.visible = false; });
        },
      }),
    });
  }

  openSleep() {
    this.showLines(SLEEP_DIALOGUE, {
      onComplete: () => this.beginButchBedTransition('enter', () => this.beginNightmareWake()),
    });
  }

  beginNightmareWake() {
    this.model.sleepUntilNight();
    this.groundMessage.setFirstBurning(true);
    this.groundMessage.setSecondBurning(false);
    this.lev.visible = false;
    this.hotelHall.hana.visible = false;
    this.hoveredId = null;
    this.elements.blackout?.classList.add('visible');
    window.setTimeout(() => {
      this.preview.renderer.toneMappingExposure = 0.95;
      this.setNightDreamRendering(true);
      this.elements.blackout?.classList.remove('visible');
      this.showLines(NIGHT_WAKE_DIALOGUE, {
        onComplete: () => this.beginButchBedTransition('exit', () => this.updateObjective()),
      });
    }, SLEEP_BLACKOUT_MS);
  }

  restoreMorningTrainAtStation() {
    for (const id of ['municipal-tram', 'municipal-tram-car-02', 'municipal-tram-car-03']) {
      const object = this.preview.scene.getObjectByName(id);
      const spec = CITY_MODELS.find((entry) => entry.id === id);
      if (!object || !spec) continue;
      object.position.fromArray(spec.position);
      object.visible = true;
    }
  }

  leaveHotelAtNight() {
    if (!this.model.beginNightRoute()) return;
    this.setNightDreamRendering(true);
    this.cutInterface.group.visible = true;
    this.groundMessage.setFirstBurning(true);
    this.groundMessage.setSecondBurning(false);
    this.restoreHotelExterior({ night: true });
  }

  // The fire letters are the climax: frame both rows centred above the
  // caption bar, with nothing else over them.
  fireFrame() {
    const centre = this.groundMessage.group.localToWorld(new THREE.Vector3(0, 0, 1.3));
    return centre;
  }

  setFireCamera(active) {
    if (active) {
      this.fireCameraActive = true;
      this.preview.setCameraOverrideTarget(this.fireFrame().add(new THREE.Vector3(0, 0, 0)));
    } else {
      this.fireCameraActive = false;
      this.preview.setCameraOverrideTarget(null);
    }
    // The nearest street lamp stands in front of the letters from this
    // camera; it steps aside for the fire beat only.
    for (const lamp of this.lampsNearFire ?? []) lamp.visible = !active;
  }

  openNightFire() {
    this.model.observeNightFire();
    this.setFireCamera(true);
    this.showLines(NIGHT_FIRST_LINE, {
      focus: this.fireFrame(),
      onComplete: () => this.beginWirePuzzle(),
    });
  }

  // Where Butch stands to read: below both rows, on the camera side, so he
  // never covers a letter.
  fireReadingSpot() {
    const spot = this.groundMessage.group.localToWorld(new THREE.Vector3(1.2, 0, 4.4));
    return [spot.x, 0.5, spot.z];
  }

  beginWirePuzzle() {
    this.setFireCamera(true);
    const clamp = this.groundMessage.interfacePosition.clone();
    const rest = this.groundMessage.group.localToWorld(new THREE.Vector3(-6.05, 0.1, 3.6));
    this.bellClamp.start({ clamp, restFrom: rest });
    // Lean the frame toward the clamp while the feed is loose.
    this.preview.setCameraOverrideTarget(this.fireFrame().lerp(clamp, 0.45));
    // Butch kneels beside the copper end, to its screen-left: never between
    // it and the camera, where his body hid it (alpha round 2, R2-5).
    const toCamera = this.preview.camera.position.clone().sub(this.preview.controls.target).setY(0).normalize();
    const screenLeft = new THREE.Vector3(-toCamera.z, 0, toCamera.x);
    const kneel = rest.clone().addScaledVector(screenLeft, 1.5);
    this.preview.walkTo(kneel.x, kneel.z);
    this.updateObjective();
  }

  onFeedSeated() {
    this.model.reconnectNightFeed();
    this.butchActionOverride = 'crouch';
    this.updateObjective();
  }

  startNightIgnition() {
    if (this.nightIgnitionElapsed !== null) return false;
    if (!this.model.lightSecondLine()) return false;
    // Both rows, centred, with nothing over them while the fire runs.
    this.setFireCamera(true);
    this.nightIgnitionElapsed = 0;
    this.nightIgnitionProgress = 0;
    this.groundMessage.setSecondIgnitionProgress(0);
    this.updateObjective();
    return true;
  }

  finishNightIgnition() {
    this.nightIgnitionElapsed = null;
    this.nightIgnitionProgress = 1;
    this.butchActionOverride = null;
    this.bellClamp.stop();
    this.groundMessage.setSecondIgnitionProgress(1);
    this.showLines(NIGHT_SECOND_LINE, {
      focus: this.fireFrame(),
      onComplete: () => {
        this.model.completeNightMessage();
        this.setFireCamera(false);
        this.elements.blackout?.classList.add('visible');
        window.setTimeout(() => {
          this.model.beginMorning();
          this.setNightDreamRendering(false);
          this.restoreMorningTrainAtStation();
          this.groundMessage.setBurnedOut();
          this.preview.player.position.copy(positionFrom(MORNING_START.butch));
          this.lev.position.copy(positionFrom(MORNING_START.lev));
          this.lev.visible = true;
          this.timeVisual.requestClock(this.model.snapshot().clock, { immediate: true });
          this.preview.resetCamera();
          // The bench painting comes up under the black; the square is never
          // seen between the night and the bench (alpha round 4).
          this.showSunrise({ underBlackout: true });
        }, SLEEP_BLACKOUT_MS - HOTEL_STAGE_TRANSITION_MS);
      },
    });
  }

  // Dawn is one painted beat: Butch and Lev on the bench above the city.
  // Alpha round 4 (P2): "Do you come up here often?" played while the
  // painting was still fading in over the square. The bench lines now wait
  // until the painting is fully up (and, after the night, until the black
  // has lifted off it).
  showSunrise({ underBlackout = false } = {}) {
    this.sunrisePending = true;
    this.elements.sunriseTableau?.classList.add('visible');
    this.elements.sunriseTableau?.setAttribute('aria-hidden', 'false');
    document.body.classList.add('sunrise-tableau-active');
    const continueButton = this.elements.sunriseTableau?.querySelector('#sunrise-tableau-continue');
    if (continueButton) { continueButton.disabled = true; continueButton.hidden = true; }
    const startBench = () => {
      this.sunrisePending = false;
      this.dialogue.show(SUNRISE_BENCH_DIALOGUE, {
        onComplete: () => {
          this.sunriseTableauHoldElapsed = 0;
          this.updateObjective();
        },
      });
    };
    globalThis.setTimeout(() => {
      if (!underBlackout) {
        startBench();
        return;
      }
      this.elements.blackout?.classList.remove('visible');
      globalThis.setTimeout(startBench, BLACKOUT_FADE_MS);
    }, SUNRISE_TABLEAU_FADE_MS);
  }

  leaveSunriseTableau() {
    if (this.sunriseTableauHoldElapsed === null || this.sunriseTableauHoldElapsed < 1.2) return false;
    this.sunriseTableauHoldElapsed = null;
    this.elements.sunriseTableau?.classList.remove('visible', 'ready-to-leave');
    const continueButton = this.elements.sunriseTableau?.querySelector('#sunrise-tableau-continue');
    if (continueButton) { continueButton.disabled = true; continueButton.hidden = true; }
    this.elements.sunriseTableau?.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('sunrise-tableau-active');
    this.model.completeSunriseView();
    this.startMorningLevFollow();
    this.hoveredId = null;
    this.updateObjective();
    this.updateOutlines();
    return true;
  }

  // ------------------------------------------------------------------ station
  updateStationTrigger() {
    const state = this.model.snapshot();
    if (!state.sunriseViewed || state.stationReached || this.interactionLocked()) return;
    if (this.preview.player.position.distanceTo(positionFrom(STATION_TRIGGER)) > 6.5) return;
    if (!this.model.reachStation()) return;
    this.beginStationFinale();
  }

  beginStationFinale({ fromQa = false } = {}) {
    this.preview.stopWalking();
    this.morningLevFollowing = false;
    this.moveLevTo(positionFrom(SCANNER_FIELDS.station.levWatch), fromQa ? 0.01 : 2.2);
    const from = SCANNER_FIELDS.station.from;
    this.echoMara.position.set(from[0], from[1], from[2]);
    const u = this.scannerFields.station.logic.geometry.u;
    this.echoMara.rotation.y = Math.atan2(u.x, u.z);
    this.echoMara.visible = true;
    this.applyEchoMaterial();
    // The pair, close: the push-in starts with Lev's warning (alpha round 4).
    this.showLines([...STATION_APPROACH_DIALOGUE, ...STATION_MARA_SIGHTED], {
      focus: this.stationPairFocus(),
      onComplete: () => this.model.sightMara(),
    });
  }

  onStationScanPassed() {
    this.pips.hidden = true;
    this.readout.innerHTML = `${STATION_SCAN_RESULT.rows.map((row) => `<p>${row}</p>`).join('')}<p class="c3-readout__summary">${STATION_SCAN_RESULT.summary}</p>`;
    this.readout.hidden = false;
    this.stationScanReadoutRemaining = 4.2;
    // She is one step ahead: into the carriage first. Butch follows her
    // route to the door once Lev has had his last word.
    this.maraRouteIndex = 0;
    window.setTimeout(() => {
      this.showLines(BOARDING_DIALOGUE, {
        onComplete: () => {
          const door = SCANNER_FIELDS.station.boardingRoute.at(-1);
          if (!this.preview.walkTo(door[0], door[2], () => this.boardNightService())) this.boardNightService();
        },
      });
    }, 1400);
  }

  boardNightService() {
    if (!this.model.boardTrain()) return;
    this.echoMara.visible = false;
    this.preview.player.position.copy(positionFrom(ENDING_SLICE_POSITIONS.butchBoarded));
    const firstCar = this.preview.scene.getObjectByName('municipal-tram');
    if (firstCar) firstCar.visible = false;
    this.finalDoor.group.visible = true;
    this.hoveredId = null;
    // Alpha round 3 (R5): the empty-seat line used to play over a wide shot
    // of the platform. The camera closes on the carriage's open door (where
    // the line now looks from) and holds there until the train pulls out.
    const door = this.finalDoor.group.getWorldPosition(new THREE.Vector3());
    const towardCamera = this.preview.camera.position.clone().sub(this.preview.controls.target).setY(0).normalize();
    door.addScaledVector(towardCamera, 1.2).setY(0.9);
    // The follow camera stops a dead zone short of its subject: aim past the
    // door by that much so the door itself ends up in the middle.
    const focus = this.preview.controls.target;
    const [deadX, deadZ] = CAMERA_FOLLOW.deadzone;
    if (Math.abs(door.x - focus.x) > deadX) door.x += Math.sign(door.x - focus.x) * deadX;
    if (Math.abs(door.z - focus.z) > deadZ) door.z += Math.sign(door.z - focus.z) * deadZ;
    this.boardedCloseUp = true;
    this.preview.setCameraOverrideTarget(door);
    this.dialogue.show(BOARDED_DIALOGUE, { onComplete: () => { this.boardedLinesDone = true; } });
    this.updateObjective();
  }

  updateFinalDeparture(dt) {
    const state = this.model.snapshot();
    if (!state.boardedTrain || state.chapterComplete) return;
    // The doors wait for Butch's last look at the empty seat.
    if (!this.boardedLinesDone && state.departureSequenceMs >= 4800) return;
    this.model.advanceDeparture(dt * 1000);
    const next = this.model.snapshot();
    const ms = next.departureSequenceMs;
    const doorProgress = ms < 5000 ? 0 : ms < 7000 ? 0.55 * smooth((ms - 5000) / 2000) : ms < 9000 ? 0.55 + 0.45 * smooth((ms - 7000) / 2000) : 1;
    this.finalDoor.door.rotation.y = THREE.MathUtils.lerp(-Math.PI * 0.48, 0, doorProgress);
    if (ms >= 9000 && !this.endingLatchShaken) {
      this.endingLatchShaken = true;
      this.preview.triggerCameraShake(0.28, 0.24);
    }
    if (ms >= 9000 && !this.endingDoorSlamPlayed) {
      this.endingDoorSlamPlayed = true;
      car03Audio.trainDoorSlam?.();
    }
    if (ms >= 10150 && !this.endingHornPlayed) {
      this.endingHornPlayed = true;
      car03Audio.trainHorn?.();
    }
    if (ms >= 11200 && !this.endingDepartureBases) {
      const roots = ['municipal-tram', 'municipal-tram-car-02', 'municipal-tram-car-03'].map((name) => this.preview.scene.getObjectByName(name)).filter(Boolean);
      roots.push(this.finalDoor.group, this.preview.player);
      this.endingDepartureBases = roots.map((object) => ({ object, position: object.position.clone() }));
    }
    if (ms >= 11200 && this.endingDepartureBases) {
      const travel = 38 * smooth((ms - 11200) / 10400);
      const movement = this.trainDirection.clone().multiplyScalar(travel);
      for (const entry of this.endingDepartureBases) entry.object.position.copy(entry.position).add(movement);
      // The camera watches from the platform's end and lets the train go:
      // following it all the way framed the bare rock cutting at the tunnel
      // mouth (A2-11).
      const doorBase = this.endingDepartureBases.find((entry) => entry.object === this.finalDoor.group)?.position ?? this.finalDoor.group.position;
      this.preview.setCameraOverrideTarget(doorBase.clone().addScaledVector(this.trainDirection, Math.min(travel, FINALE_CAMERA_FOLLOW)));
    }
    if (next.blackout) {
      this.elements.blackout?.classList.add('visible');
      for (const entry of this.endingDepartureBases || []) entry.object.visible = false;
      if (!this.endingMusicReleased) {
        this.endingMusicReleased = true;
        music.stop({ fade: 7.5 });
      }
    }
    if (next.chapterComplete && this.chapterEndCard) {
      this.chapterEndCard.hidden = false;
      if (!this.chapterExitStarted) {
        this.chapterExitStarted = true;
        globalThis.dispatchEvent?.(new CustomEvent('nightfall:chapter3-complete'));
      }
    }
    this.updateObjective();
  }

  // Resolves once the city has drawn `frames` more frames (the frame pacer
  // runs a frame's callbacks only when the GPU has finished the last one),
  // or after a timeout so a stuck context never holds a fade.
  afterDrawnFrames(frames = BLACKOUT_DRAWN_FRAMES) {
    return new Promise((resolve) => {
      const info = this.preview.renderer?.info?.render;
      if (typeof requestAnimationFrame !== 'function' || !info) { resolve(); return; }
      const target = info.frame + frames;
      const tick = () => (info.frame >= target ? resolve() : requestAnimationFrame(tick));
      requestAnimationFrame(tick);
      globalThis.setTimeout(resolve, BLACKOUT_FRAME_TIMEOUT_MS * 4);
    });
  }

  // The blackout's CSS fade has finished (on a slow GPU its clock lags the
  // wall clock, so a fixed wait swapped sets under a half-black screen).
  untilBlack() {
    const blackout = this.elements.blackout;
    if (!blackout) return Promise.resolve();
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        blackout.removeEventListener('transitionend', onEnd);
        resolve();
      };
      const onEnd = (event) => { if (event.propertyName === 'opacity') finish(); };
      blackout.addEventListener('transitionend', onEnd);
      // Already black (no transition will run), or a lost event: the fade's
      // own length, then a generous ceiling.
      globalThis.setTimeout(() => {
        if (Number(globalThis.getComputedStyle?.(blackout).opacity ?? 1) >= 0.99) finish();
      }, BLACKOUT_FADE_MS);
      globalThis.setTimeout(finish, BLACKOUT_FADE_MS * 5);
    });
  }

  // One clean cut through black: fade out fully, run `swap` (after `ready`,
  // e.g. a streamed set), draw it, fade back in, then `after`.
  cutThroughBlack(swap, { ready = null, after = null } = {}) {
    this.elements.blackout?.classList.add('visible');
    return Promise.all([ready, wait(BLACKOUT_FADE_MS), this.untilBlack()])
      .then(() => swap())
      .then(() => this.afterDrawnFrames())
      .then(() => {
        this.elements.blackout?.classList.remove('visible');
        after?.();
      });
  }

  stageMinistryHall({ at = null } = {}) {
    if (this.insideMinistry || this.ministryTransitioning) return;
    this.ministryTransitioning = true;
    this.preview.stopWalking();
    // The hall streams in during play; the cut holds black until its set is
    // fitted and drawn.
    this.cutThroughBlack(() => {
      const keepVisible = new Set([
        this.ministryHall.group,
        this.preview.player,
        this.lev,
        this.preview.navPlane,
        this.preview.destinationMarker,
      ]);
      this.ministryExteriorVisibility = this.preview.scene.children
        .filter((object) => !keepVisible.has(object) && !object.isLight && !object.isCamera)
        .map((object) => ({ object, visible: object.visible }));
      for (const entry of this.ministryExteriorVisibility) entry.object.visible = false;

      this.ministryHall.group.visible = true;
      this.preview.player.visible = true;
      this.lev.visible = true;
      this.preview.player.position.copy(positionFrom(at === 'board' ? MINISTRY_POSITIONS.discardedPrintApproach : MINISTRY_POSITIONS.playerStart));
      this.lev.position.copy(positionFrom(MINISTRY_POSITIONS.lev));
      this.ministryHall.discardedPrint.visible = this.model.snapshot().nikaComplete;
      this.preview.scene.background.setHex(0x000000);
      this.preview.scene.fog.color.setHex(0x000000);
      this.preview.scene.fog.density = 0.0015;
      this.preview.renderer.toneMappingExposure = 1.26;
      this.preview.resetCamera();
      // Frame the service windows and the public table; closer than the old
      // 3.3 so Nika and Butch read at a glance.
      this.preview.controls.minZoom = 3.9;
      this.preview.controls.maxZoom = 3.9;
      this.preview.setCameraOverrideTarget(new THREE.Vector3(0.6, 0.82, -0.6));
      this.preview.camera.zoom = 3.9;
      this.preview.camera.updateProjectionMatrix();
      this.preview.controls.update();
      this.insideMinistry = true;
      this.startMorningLevFollow();
      this.updateObjective();
      this.updateOutlines();
      this.updateDiagnosticState();
    }, {
      ready: this.loadAssetGroup('ministry'),
      after: () => { this.ministryTransitioning = false; },
    });
  }

  exitMinistryHall() {
    if (!this.insideMinistry || this.ministryTransitioning) return;
    this.ministryTransitioning = true;
    this.preview.stopWalking();
    this.cutThroughBlack(() => {
      this.ministryHall.group.visible = false;
      for (const entry of this.ministryExteriorVisibility) entry.object.visible = entry.visible;
      this.preview.player.visible = true;
      this.lev.visible = true;
      this.preview.player.position.copy(positionFrom(OPENING_POSITIONS.transportApproach));
      this.lev.position.copy(positionFrom(OPENING_POSITIONS.levTransportExterior));
      this.timeVisual.requestClock(this.model.snapshot().clock, { immediate: true });
      this.preview.setCameraOverrideTarget(null);
      this.preview.resetCamera();
      this.insideMinistry = false;
      this.updateObjective();
      this.updateOutlines();
      this.updateDiagnosticState();
    }, { after: () => { this.ministryTransitioning = false; } });
  }

  stageHotelInterior() {
    if (this.insideHotel || this.hotelTransitioning) return;
    this.hotelTransitioning = true;
    this.hotelCameraStateBefore ??= {
      minZoom: this.preview.controls.minZoom,
      maxZoom: this.preview.controls.maxZoom,
      canvasTransform: this.preview.renderer.domElement.style.transform,
      canvasTransformOrigin: this.preview.renderer.domElement.style.transformOrigin,
    };
    // The hotel sets stream during play; the cut holds black until they are
    // fitted and drawn (alpha round 4: no more half-faded "ghost" interior).
    let greet = false;
    this.cutThroughBlack(() => {
      const keepVisible = new Set([
        this.hotelHall.group,
        this.preview.player,
        this.lev,
        this.preview.navPlane,
        this.preview.destinationMarker,
      ]);
      this.hotelExteriorVisibility = this.preview.scene.children
        .filter((object) => !keepVisible.has(object) && !object.isLight && !object.isCamera)
        .map((object) => ({ object, visible: object.visible }));
      for (const entry of this.hotelExteriorVisibility) entry.object.visible = false;
      this.hotelHall.group.visible = true;
      this.preview.player.visible = true;
      const state = this.model.snapshot();
      this.insideHotel = true;
      const targetArea = state.slept
        ? state.nightLobbyReached ? 'lobby' : state.nightRoomLeft ? 'corridor' : 'room'
        : state.hotelRoomEntered
          ? 'room'
          : state.hotelCorridorEntered
            ? 'corridor'
            : 'lobby';
      this.setHotelArea(targetArea);
      this.hoveredId = null;
      this.updateObjective();
      this.updateOutlines();
      this.updateDiagnosticState();
      greet = targetArea === 'lobby' && !state.hotelCheckInComplete && !this.hotelGreeted;
    }, {
      ready: this.loadAssetGroup('hotel'),
      after: () => {
        this.hotelTransitioning = false;
        // Hana greets him at the desk, so the task card can name her.
        if (greet) {
          this.hotelGreeted = true;
          this.showLines(HOTEL_ARRIVAL_DIALOGUE);
        }
      },
    });
  }

  setHotelArea(area, { arrival = null } = {}) {
    const state = this.model.snapshot();
    // Between the nightmare and the morning bell the whole hotel drops to a
    // fraction of its evening light: lobby, corridor and room all go dark.
    const nightAsleep = state.slept && !state.morningStarted;
    const lobby = area === 'lobby';
    const corridor = area === 'corridor';
    const upperFloor = corridor || area === 'room';
    this.hotelArea = area;
    this.hotelHall.lobbyGroup.visible = lobby;
    this.hotelHall.corridorGroup.visible = upperFloor;
    this.hotelHall.roomGroup.visible = upperFloor;
    if (lobby) {
      this.hotelHall.hana.visible = !state.slept;
      // The dining guests were cut for the release; the room stays quiet.
      for (const guest of [this.hotelHall.irena, this.hotelHall.vesna, this.hotelHall.daro]) guest.visible = false;
      // Use a three-quarter diagonal so the lobby reads in the same isometric
      // language as the city. A closer zoom keeps the compact imported room
      // and its guests large enough to inspect without a camera snap.
      const homeOffset = new THREE.Vector3().fromArray(CAMERA_HOME.position)
        .sub(new THREE.Vector3().fromArray(CAMERA_HOME.target));
      const lobbyRadius = Math.hypot(homeOffset.x, homeOffset.z);
      this.preview.setCameraOffsetOverride(new THREE.Vector3(-lobbyRadius * 0.82, homeOffset.y, lobbyRadius * 0.57));
      this.preview.setCameraOverrideTarget(new THREE.Vector3(0, 0.72, 0));
      const arrivedFromStairs = arrival === 'stairs' || (!arrival && state.nightLobbyReached);
      this.preview.player.position.copy(positionFrom(arrivedFromStairs
        ? HOTEL_POSITIONS.lobbyStairArrival
        : HOTEL_POSITIONS.playerStart));
      this.lev.position.copy(positionFrom(HOTEL_POSITIONS.lev));
      this.lev.visible = !state.hotelCheckInComplete;
      this.preview.scene.background.setHex(0x000000);
      this.preview.scene.fog.color.setHex(0x000000);
      this.preview.renderer.toneMappingExposure = nightAsleep ? 0.96 : 1.18;
    } else if (corridor) {
      this.preview.setCameraOffsetOverride(null);
      // Alpha round 3 (R4): the lobby's fixed framing used to stay on
      // upstairs, so the camera looked at the empty lobby, Butch stood past
      // the top of the frame and his rig was culled. Upstairs the camera
      // follows him again.
      this.preview.setCameraOverrideTarget(null);
      this.preview.player.position.copy(positionFrom(state.nightRoomLeft
        ? HOTEL_POSITIONS.corridorRoomExitStart
        : HOTEL_POSITIONS.corridorPlayerStart));
      this.lev.position.copy(positionFrom(HOTEL_POSITIONS.corridorLev));
      this.lev.visible = false;
      this.preview.scene.background.setHex(0x000000);
      this.preview.scene.fog.color.setHex(0x000000);
      this.preview.renderer.toneMappingExposure = nightAsleep ? 0.90 : state.morningStarted ? 1.22 : 1.16;
    } else {
      this.preview.setCameraOffsetOverride(null);
      // R4: frame the whole room (door, table and bed) around its middle.
      this.preview.setCameraOverrideTarget(positionFrom(HOTEL_ROOM_FRAME));
      this.preview.player.position.copy(positionFrom(HOTEL_POSITIONS.roomPlayerStart));
      this.lev.position.copy(positionFrom(HOTEL_POSITIONS.roomLev));
      this.lev.visible = false;
      this.preview.scene.background.setHex(0x000000);
      this.preview.scene.fog.color.setHex(0x000000);
      this.preview.renderer.toneMappingExposure = nightAsleep ? 0.95 : state.morningStarted ? 1.26 : 1.2;
    }
    this.preview.renderer.domElement.style.transformOrigin = lobby
      ? '50% 50%'
      : this.hotelCameraStateBefore?.canvasTransformOrigin || '';
    this.preview.renderer.domElement.style.transform = lobby
      ? 'scale(1.27)'
      : this.hotelCameraStateBefore?.canvasTransform || '';
    this.preview.stopWalking();
    this.preview.resetCamera();
    if (lobby) {
      this.preview.controls.minZoom = 5.2;
      this.preview.controls.maxZoom = 5.45;
      this.preview.camera.zoom = 5.3;
    } else {
      this.preview.controls.minZoom = this.hotelCameraStateBefore?.minZoom ?? this.preview.controls.minZoom;
      // The imported upper floor is much narrower than the exterior city.
      // Allow a genuinely close interior view instead of letting OrbitControls
      // clamp the requested room/corridor zoom back to the city limit.
      this.preview.controls.maxZoom = 5.0;
      this.preview.camera.zoom = corridor ? 4.3 : 4.8;
    }
    this.preview.camera.updateProjectionMatrix();
    if (area === 'room' && nightAsleep) {
      this.setNightDreamRendering(true);
      this.setButchBedPose(true);
    }
    this.hoveredId = null;
    this.updateObjective();
    this.updateOutlines();
    this.updateDiagnosticState();
  }

  switchHotelArea(area, { fade = true, arrival = null } = {}) {
    if (!this.insideHotel || this.hotelTransitioning || this.hotelArea === area) return false;
    if (!fade) {
      this.setHotelArea(area, { arrival });
      return true;
    }
    this.hotelTransitioning = true;
    this.cutThroughBlack(() => this.setHotelArea(area, { arrival }), {
      after: () => { this.hotelTransitioning = false; },
    });
    return true;
  }

  // Upstairs is one step: the corridor walk to the door was cut for length.
  enterHotelCorridor() {
    if (!this.model.enterHotelCorridor()) return;
    this.model.enterHotelRoom();
    this.switchHotelArea('room');
  }

  // At night the room door opens straight onto the burning square (the
  // corridor and lobby walks were cut for length).
  leaveRoomAtNight() {
    if (this.model.snapshot().nightRoomLeft) return;
    this.animateHotelDoor(() => {
      if (!this.model.leaveNightRoom()) return;
      this.model.reachNightLobby();
      this.leaveHotelAtNight();
    });
  }

  animateHotelDoor(onComplete, pivot = this.hotelHall.butchDoorPivot, openAngle = Math.PI * 0.5) {
    if (this.hotelDoorElapsed !== null || this.levHotelExitElapsed !== null) return false;
    this.hotelDoorElapsed = 0;
    this.hotelDoorDuration = 1.35;
    this.hotelDoorOnComplete = onComplete;
    this.hotelDoorClosing = false;
    this.hotelDoorPivot = pivot;
    this.hotelDoorOpenAngle = openAngle;
    this.preview.stopWalking();
    return true;
  }
  restoreHotelExterior({ night = false, morning = false } = {}) {
    if (!this.insideHotel || this.hotelTransitioning) return;
    this.hotelTransitioning = true;
    this.cutThroughBlack(() => {
      this.hotelHall.group.visible = false;
      for (const entry of this.hotelExteriorVisibility) entry.object.visible = entry.visible;
      if (night) {
        this.groundMessage.setFirstBurning(true);
        this.groundMessage.setSecondBurning(false);
      }
      if (morning) {
        this.groundMessage.setFirstBurning(true);
        this.groundMessage.setSecondBurning(true);
        this.groundMessage.setBurnedOut();
      }
      this.insideHotel = false;
      this.hotelArea = null;
      this.preview.player.visible = true;
      this.preview.player.position.set(49.8, 0.5, -12.2);
      this.preview.stopWalking();
      this.lev.visible = !night;
      this.timeVisual.requestClock(this.model.snapshot().clock, { immediate: true });
      // Never carry a scripted camera focus (night fire, evidence table, …)
      // across the threshold: outside, the camera belongs to Butch again.
      this.preview.setCameraOverrideTarget(null);
      this.preview.setCameraOffsetOverride(null);
      if (this.hotelCameraStateBefore) {
        this.preview.controls.minZoom = this.hotelCameraStateBefore.minZoom;
        this.preview.controls.maxZoom = this.hotelCameraStateBefore.maxZoom;
        this.preview.renderer.domElement.style.transform = this.hotelCameraStateBefore.canvasTransform;
        this.preview.renderer.domElement.style.transformOrigin = this.hotelCameraStateBefore.canvasTransformOrigin;
        this.hotelCameraStateBefore = null;
      }
      this.preview.resetCamera();
      this.preview.controls.update();
      this.hoveredId = null;
      this.updateObjective();
      this.updateOutlines();
    }, { after: () => { this.hotelTransitioning = false; } });
  }
  setNightDreamRendering(active) {
    const canvas = this.preview.renderer?.domElement;
    if (!canvas) return;
    // Keep the center crisp. The vignette owns the peripheral dream treatment.
    // Wake-up must already be dreamlike on the first visible frame. Only the
    // later recovery fades; activation is immediate under the blackout.
    canvas.style.transition = active ? 'none' : 'filter 1200ms ease';
    canvas.style.filter = active ? 'saturate(.88) contrast(1.06)' : '';
    document.body.dataset.chapter3DreamRendering = active ? 'active' : 'clear';
  }

  setButchBedPose(active) {
    const instance = this.characters.get('butch');
    const visual = instance?.visual;
    if (!visual || this.butchBedPoseActive === active) return false;
    this.butchBedPoseActive = active;
    if (active) {
      this.preview.player.position.copy(positionFrom(HOTEL_POSITIONS.bed));
      this.preview.player.position.y = 0.72;
      this.preview.player.rotation.y = Math.PI * 0.5;
      visual.userData.bedPoseBefore = {
        rotation: visual.rotation.clone(),
        position: visual.position.clone(),
      };
      visual.rotation.z = -Math.PI * 0.5;
      // Lift the horizontal rig above the mattress top; the previous 0.58 m
      // local offset buried the torso and shoulders in the imported bed.
      visual.position.set(-0.12, 0.86, 0);
      this.butchActionOverride = 'idle';
    } else {
      const before = visual.userData.bedPoseBefore;
      if (before) {
        visual.rotation.copy(before.rotation);
        visual.position.copy(before.position);
      }
      delete visual.userData.bedPoseBefore;
      this.preview.player.position.copy(positionFrom(HOTEL_POSITIONS.bedApproach));
      this.butchActionOverride = null;
    }
    return true;
  }

  beginButchBedTransition(mode, onComplete = null) {
    if (this.butchBedTransition) return false;
    this.preview.stopWalking();
    this.butchBedTransition = {
      mode,
      elapsed: 0,
      duration: mode === 'enter' ? 1.45 : 1.25,
      start: this.preview.player.position.clone(),
      onComplete,
      poseReleased: false,
    };
    this.butchActionOverride = mode === 'enter' ? 'crouch' : 'sit';
    return true;
  }

  updateButchBedTransition(dt) {
    const transition = this.butchBedTransition;
    if (!transition) return;
    transition.elapsed += dt;
    const t = THREE.MathUtils.clamp(transition.elapsed / transition.duration, 0, 1);
    if (transition.mode === 'enter') {
      const target = positionFrom(HOTEL_POSITIONS.bed);
      target.y = 0.72;
      const bedside = new THREE.Vector3(1.05, 0.5, HOTEL_POSITIONS.bedApproach[2]);
      const seatedEdge = new THREE.Vector3(0.82, 0.64, HOTEL_POSITIONS.bed[2]);
      if (t < 0.42) {
        this.butchActionOverride = 'walk';
        this.preview.player.position.lerpVectors(transition.start, bedside, smooth(t / 0.42));
      } else if (t < 0.72) {
        this.butchActionOverride = 'sit';
        this.preview.player.position.lerpVectors(bedside, seatedEdge, smooth((t - 0.42) / 0.3));
      } else {
        this.butchActionOverride = 'sit';
        this.preview.player.position.lerpVectors(seatedEdge, target, smooth((t - 0.72) / 0.28));
      }
      this.preview.player.rotation.y = THREE.MathUtils.lerp(this.preview.player.rotation.y, Math.PI * 0.5, smooth(t));
      if (t >= 1) this.setButchBedPose(true);
    } else if (t >= 0.38 && !transition.poseReleased) {
      transition.poseReleased = true;
      this.setButchBedPose(false);
      this.butchActionOverride = 'sit';
    }
    if (t < 1) return;
    if (transition.mode === 'exit') this.butchActionOverride = null;
    const complete = transition.onComplete;
    this.butchBedTransition = null;
    complete?.();
  }

  startMorningLevFollow() {
    this.morningLevFollowing = true;
    this.morningLevFollowTime = 0;
    this.morningLevTrail = [{ time: 0, position: this.preview.player.position.clone() }];
    const initialDirection = this.preview.player.position.clone().sub(this.lev.position);
    initialDirection.y = 0;
    if (initialDirection.lengthSq() > 0.01) this.morningLevLastDirection.copy(initialDirection.normalize());
  }

  morningLevApproach() {
    const towardPlayer = this.preview.player.position.clone().sub(this.lev.position);
    if (towardPlayer.lengthSq() < 0.01) towardPlayer.set(1, 0, 0);
    towardPlayer.y = 0;
    towardPlayer.normalize().multiplyScalar(1.2);
    const approach = this.lev.position.clone().add(towardPlayer);
    return [approach.x, 0.5, approach.z];
  }

  updateMorningLevFollow(dt) {
    const state = this.model.snapshot();
    this.morningLevMovedThisFrame = false;
    if (!this.morningLevFollowing || this.dialogue.active || this.insideHotel || this.insideArchive || state.boardedTrain || !this.lev.visible) return;
    this.morningLevFollowTime += dt;
    this.morningLevTrail.push({ time: this.morningLevFollowTime, position: this.preview.player.position.clone() });
    const delay = 0.58 + 0.24 * (0.5 + 0.5 * Math.sin(this.morningLevFollowTime * 0.83));
    const wantedTime = this.morningLevFollowTime - delay;
    while (this.morningLevTrail.length > 2 && this.morningLevTrail[1].time < wantedTime) this.morningLevTrail.shift();
    while (this.morningLevTrail.length > 240) this.morningLevTrail.shift();
    const target = (this.morningLevTrail[0]?.position || this.preview.player.position).clone();
    const trailDirection = this.preview.player.position.clone().sub(target);
    trailDirection.y = 0;
    if (trailDirection.lengthSq() > 0.01) this.morningLevLastDirection.copy(trailDirection.normalize());
    target.addScaledVector(this.morningLevLastDirection, -0.95);
    const side = new THREE.Vector3(-this.morningLevLastDirection.z, 0, this.morningLevLastDirection.x);
    target.addScaledVector(side, Math.sin(this.morningLevFollowTime * 1.17) * 0.18);
    const movement = target.sub(this.lev.position);
    movement.y = 0;
    const distance = movement.length();
    if (distance <= 0.22) return;
    const naturalSpeed = 3.7 + 0.65 * (0.5 + 0.5 * Math.sin(this.morningLevFollowTime * 1.41));
    const speed = distance > 4.2 ? 10.5 : naturalSpeed;
    const step = Math.min(distance, dt * speed);
    this.lev.position.addScaledVector(movement.normalize(), step);
    this.morningLevMovedThisFrame = step > 0.001;
    this.lev.position.y = this.insideMinistry ? MINISTRY_POSITIONS.lev[1] : 0.5;
    this.lev.rotation.y = Math.atan2(movement.x, movement.z);
  }
  updateHotelLevFollow(dt) {
    this.hotelLevMovedThisFrame = false;
    const state = this.model.snapshot();
    if (!this.insideHotel || this.hotelArea !== 'corridor' || this.dialogue.active
      || !this.lev.visible || state.hotelCheckInComplete || this.hotelTransitioning) return;
    const toPlayer = this.preview.player.position.clone().sub(this.lev.position).setY(0);
    const distance = toPlayer.length();
    if (distance <= 1.45) return;
    const desired = this.preview.player.position.clone().addScaledVector(toPlayer.normalize(), -1.05);
    desired.x = THREE.MathUtils.clamp(desired.x, HOTEL_CORRIDOR_WALK_BOUNDS.minX, HOTEL_CORRIDOR_WALK_BOUNDS.maxX);
    desired.z = THREE.MathUtils.clamp(desired.z, HOTEL_CORRIDOR_WALK_BOUNDS.minZ, HOTEL_CORRIDOR_WALK_BOUNDS.maxZ);
    const movement = desired.sub(this.lev.position).setY(0);
    if (movement.lengthSq() < 0.0025) return;
    const step = Math.min(movement.length(), dt * 2.35);
    this.lev.position.addScaledVector(movement.normalize(), step);
    this.lev.position.y = 0.5;
    this.lev.rotation.y = Math.atan2(movement.x, movement.z);
    this.hotelLevMovedThisFrame = step > 0.001;
  }
  compassDirection(target) {
    const delta = target.clone().sub(this.preview.player.position);
    delta.y = 0;
    if (delta.lengthSq() < 4) return 'right here';
    const angle = Math.atan2(delta.x, -delta.z);
    const octants = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
    const index = Math.round(((angle < 0 ? angle + Math.PI * 2 : angle) / (Math.PI / 4))) % 8;
    return octants[index];
  }
  // ------------------------------------------------------------------ walkers
  // Olek pushes his cart along the market crossing; the cart rolls ahead of
  // him. Before the crossing he tends the cart at the safe line; afterwards he
  // carries on toward the square and out of the story.
  updateOlekCartLife(dt, states) {
    if (!this.cartObject) return;
    const logic = this.scannerFields.market.logic;
    const state = this.model.snapshot();
    const u = logic.geometry.u;
    const heading = Math.atan2(u.x, u.z);
    if (!state.edaComplete) {
      // Waiting with the cart near the stalls.
      const start = logic.walkerPosition();
      this.olek.position.set(start.x, 0.5, start.z);
      this.olek.rotation.y = heading;
      this.cartObject.position.set(start.x + u.x * 1.35, this.cartObject.position.y, start.z + u.z * 1.35);
      this.cartObject.rotation.y = heading;
      states.set('olek', 'investigate');
      return;
    }
    if (!state.marketCrossed) {
      const walker = logic.walkerPosition();
      this.olek.position.set(walker.x, 0.5, walker.z);
      this.olek.rotation.y = heading;
      this.cartObject.position.set(walker.x + u.x * 1.35, this.cartObject.position.y, walker.z + u.z * 1.35);
      this.cartObject.rotation.y = heading;
      const moving = logic.snapshot().walker.moving;
      states.set('olek', moving ? 'push' : 'idle');
      if (moving) this.updateOlekBarks(dt);
      return;
    }
    // After the crossing he walks on east and leaves the frame.
    this.olekExitElapsed = (this.olekExitElapsed ?? 0) + dt;
    if (this.olekExitElapsed < 9) {
      const step = 1.4 * dt;
      this.olek.position.x += u.x * step;
      this.olek.position.z += u.z * step;
      this.cartObject.position.x += u.x * step;
      this.cartObject.position.z += u.z * step;
      states.set('olek', 'push');
    } else {
      this.olek.visible = false;
      this.cartObject.visible = false;
    }
  }

  updateOlekBarks(dt) {
    this.walkBarkTimer += dt;
    if (this.walkBarkIndex >= OLEK_WALK_BARKS.length) return;
    if (this.walkBarkTimer < 1.2 + this.walkBarkIndex * 2.6) return;
    if (this.dialogue.bark(OLEK_WALK_BARKS[this.walkBarkIndex], 3.4)) this.walkBarkIndex += 1;
  }

  // The echo Mara walks only while Butch keeps pace; she never turns round.
  updateEchoMara(dt, states) {
    // Only the station finale drives her here (the arrival glimpse is scripted).
    if (this.departureElapsed !== null && this.echoMara.visible) {
      states.set('echo-mara', 'walk');
      return;
    }
    if (!this.echoMara.visible || !this.model.snapshot().stationReached) return;
    const logic = this.scannerFields.station.logic;
    const state = this.model.snapshot();
    const u = logic.geometry.u;
    if (state.stationScanPassed) {
      // One step ahead: around the ticket block and into the carriage.
      this.maraRouteIndex ??= 0;
      const route = SCANNER_FIELDS.station.boardingRoute;
      const target = route[this.maraRouteIndex];
      if (!target) {
        this.echoMara.visible = false;
        return;
      }
      const toward = positionFrom(target).sub(this.echoMara.position).setY(0);
      const distance = toward.length();
      const travel = SCANNER_FIELDS.station.walkerSpeed * dt;
      if (distance <= travel) {
        this.echoMara.position.x = target[0];
        this.echoMara.position.z = target[2];
        this.maraRouteIndex += 1;
      } else {
        this.echoMara.position.addScaledVector(toward.normalize(), travel);
        this.echoMara.rotation.y = Math.atan2(toward.x, toward.z);
      }
      states.set('echo-mara', 'walk');
      return;
    }
    const walker = logic.walkerPosition();
    this.echoMara.position.set(walker.x, 0.5, walker.z);
    this.echoMara.rotation.y = Math.atan2(u.x, u.z);
    states.set('echo-mara', logic.snapshot().walker.moving ? 'walk' : 'idle');
  }

  // ------------------------------------------------------------------ frame
  update(dt, { final = true } = {}) {
    if (!this.initialized) return;
    if (this.scannerFreezeRemaining > 0) this.scannerFreezeRemaining = Math.max(0, this.scannerFreezeRemaining - dt);
    if (this.blockedFlashRemaining > 0) {
      this.blockedFlashRemaining -= dt;
      if (this.blockedFlashRemaining <= 0) {
        this.preview.destinationMarker.visible = false;
        this.preview.destinationMarker.material.color.setHex(0xe0a24a);
      }
    }
    this.enforceHotelFurnitureCollision();
    if (this.insideHotel && this.hotelArea === 'lobby' && Math.abs(this.preview.camera.zoom - 5.3) > 0.01) {
      this.preview.camera.zoom = 5.3;
      this.preview.camera.updateProjectionMatrix();
    }
    this.dialogue.update(dt);
    this.ticketBoard.update(dt);
    this.bellClamp.update(dt);
    // Idle = free to act, standing still, no input (R2-3).
    const moving = this.preview.path?.length > 0 || this.keysHeld.size > 0 || this.pointerHeld;
    if (this.interactionLocked() || moving) this.idleElapsed = 0;
    else this.idleElapsed += dt;
    music.setDialogueActive(this.dialogue.active);
    this.updateMusic();
    this.updateCameraZoom(dt);
    this.updateStationCamera();
    this.updateScannerFields(dt);
    this.updateStationTrigger();
    this.updateFinalDeparture(dt);
    this.updateButchBedTransition(dt);
    this.updateSearchGuidance(dt);
    this.updateGuidanceHighlightPulse();
    this.updateMorningLevFollow(dt);
    this.updateHotelLevFollow(dt);
    this.updateAmbientCityLife(dt);
    this.groundFireElapsed += dt;
    if (this.sunriseTableauHoldElapsed !== null) {
      this.sunriseTableauHoldElapsed += dt;
      if (this.sunriseTableauHoldElapsed >= 1.2) {
        this.elements.sunriseTableau?.classList.add('ready-to-leave');
        const continueButton = this.elements.sunriseTableau?.querySelector('#sunrise-tableau-continue');
        if (continueButton) { continueButton.disabled = false; continueButton.hidden = false; }
      }
    }
    if (this.stationScanReadoutRemaining > 0) {
      this.stationScanReadoutRemaining -= dt;
      if (this.stationScanReadoutRemaining <= 0) this.readout.hidden = true;
    }
    this.animateGroundFire();

    if (this.nightIgnitionElapsed !== null) {
      this.nightIgnitionElapsed += dt;
      this.nightIgnitionProgress = THREE.MathUtils.clamp(this.nightIgnitionElapsed / 3.6, 0, 1);
      this.groundMessage.setSecondIgnitionProgress(this.nightIgnitionProgress);
      if (this.nightIgnitionElapsed >= 4.6) this.finishNightIgnition();
    }

    if (this.departureElapsed !== null) {
      this.departureElapsed += dt;
      const progress = smooth(this.departureElapsed / 6.2);
      const offset = this.trainDirection.clone().multiplyScalar(38 * progress);
      for (const entry of this.departureBases) entry.object.position.copy(entry.position).add(offset);
      // As the train pulls out, the woman in the rose scarf is already one
      // step ahead, crossing into the city, back to Butch.
      const glimpse = THREE.MathUtils.clamp((this.departureElapsed - 0.6) / 5.2, 0, 1);
      this.echoMara.visible = glimpse > 0 && glimpse < 1;
      if (this.echoMara.visible) {
        this.echoMara.position.lerpVectors(positionFrom([-6.9, 0.5, 25.6]), positionFrom([-1.6, 0.5, 19.8]), glimpse);
        this.echoMara.rotation.y = Math.atan2(5.3, -5.8);
        this.characters.play('echo-mara', 'walk');
      }
      if (this.departureElapsed >= 6.2) {
        for (const entry of this.departureBases) entry.object.visible = false;
        this.echoMara.visible = false;
        this.departureElapsed = null;
        this.model.completeTrainDeparture();
        this.beginLevArrivalApproach();
      }
    }

    if (this.levWalkElapsed !== null && !this.dialogue.active) {
      this.levWalkElapsed += dt;
      const progress = smooth(this.levWalkElapsed / Math.max(0.001, this.levWalkDuration));
      this.lev.position.lerpVectors(this.levWalkStart, this.levWalkTarget, progress);
      const direction = this.levWalkTarget.clone().sub(this.levWalkStart);
      if (direction.lengthSq() > 1e-4) this.lev.rotation.y = Math.atan2(direction.x, direction.z);
      if (this.levWalkElapsed >= this.levWalkDuration) {
        this.lev.position.copy(this.levWalkTarget);
        this.levWalkElapsed = null;
        this.levWalkTarget = null;
        const onComplete = this.levWalkOnComplete;
        this.levWalkOnComplete = null;
        onComplete?.();
      }
    }

    if (this.guideElapsed !== null && !this.dialogue.active) {
      this.guideElapsed += dt;
      const progress = smooth(this.guideElapsed / 4.0);
      this.lev.position.lerpVectors(this.guideStart, positionFrom(OPENING_POSITIONS.levInterview), progress);
      const direction = positionFrom(OPENING_POSITIONS.levInterview).sub(this.guideStart);
      this.lev.rotation.y = Math.atan2(direction.x, direction.z);
      if (this.guideElapsed >= 4.0) this.guideElapsed = null;
    }

    if (this.hotelDoorElapsed !== null) {
      this.hotelDoorElapsed += dt;
      const elapsed = this.hotelDoorElapsed;
      if (elapsed < 0.55) {
        this.hotelDoorPivot.rotation.y = this.hotelDoorOpenAngle * smooth(elapsed / 0.55);
      } else if (elapsed < 0.8) {
        this.hotelDoorPivot.rotation.y = this.hotelDoorOpenAngle;
        if (!this.hotelDoorClosing) {
          this.hotelDoorClosing = true;
          const onComplete = this.hotelDoorOnComplete;
          this.hotelDoorOnComplete = null;
          onComplete?.();
        }
      } else {
        this.hotelDoorPivot.rotation.y = this.hotelDoorOpenAngle * (1 - smooth((elapsed - 0.8) / 0.55));
      }
      if (elapsed >= this.hotelDoorDuration) {
        this.hotelDoorPivot.rotation.y = 0;
        this.hotelDoorElapsed = null;
        this.hotelDoorOnComplete = null;
        this.hotelDoorClosing = false;
        this.hotelDoorPivot = null;
        this.hotelDoorOpenAngle = 0;
        this.updateObjective();
        this.updateOutlines();
      }
    }

    const clock = this.model.snapshot().clock;
    if (!this.insideMinistry && !this.insideHotel) {
      this.timeVisual.requestClock(clock);
      this.timeVisual.update(dt);
      this.preview.setLampGlow?.(chapter3LampGlowForClock(clock));
    }
    this.updateResumePoint();
    // Alpha round 4 (P1): on a slow frame the preview runs several short
    // steps; the cast's animation and walks take the whole frame's time at
    // once and the screen work (tags, pips, markers) runs on the last step.
    this.frameDtAccum = (this.frameDtAccum ?? 0) + dt;
    if (!final) return;
    const frameDt = this.frameDtAccum;
    this.frameDtAccum = 0;
    this.updateCharacterAnimations(frameDt);
    this.updateButchMarker();
    this.updateButchSilhouette();
    this.updateGuidanceBeacons();
    this.updateObjective();
    this.updateTags();
    this.updatePips();
    this.updateDiagnosticState();
  }

  animateGroundFire() {
    const animateFireLine = (effect, offset) => {
      if (!effect?.flames.visible && !effect?.smoke.visible) return;

      if (effect.flames.visible) {
        const attribute = effect.flames.geometry.getAttribute('position');
        const bases = effect.flames.userData.basePositions;
        const phases = effect.flames.userData.phases;
        const count = effect.flames.userData.particleCount;
        for (let index = 0; index < count; index += 1) {
          const positionIndex = index * 3;
          const revealPosition = (bases[positionIndex] + effect.worldWidth / 2) / effect.worldWidth;
          if (revealPosition > (effect.ignitionProgress ?? 1)) {
            attribute.array[positionIndex + 1] = -10;
            continue;
          }
          const phase = phases[index];
          const slow = Math.sin(this.groundFireElapsed * 3.1 + phase * 13 + offset);
          const quick = Math.sin(this.groundFireElapsed * 7.4 + phase * 19 + offset * 2);
          // Fire gutters upward from the charred edge — tall enough to read
          // as flame from the fixed camera, never high enough to eat a word.
          const rise = ((this.groundFireElapsed * (0.35 + phase * 0.25) + phase + offset) % 1);
          attribute.array[positionIndex] = bases[positionIndex] + slow * 0.03 * rise + quick * 0.012;
          attribute.array[positionIndex + 1] = bases[positionIndex + 1] + rise * 0.34 * (0.8 + quick * 0.2);
          attribute.array[positionIndex + 2] = bases[positionIndex + 2] + Math.cos(this.groundFireElapsed * 2.3 + phase * 11) * 0.045 * rise;
        }
        attribute.needsUpdate = true;
      }

      if (effect.embers.visible) {
        const attribute = effect.embers.geometry.getAttribute('position');
        const bases = effect.embers.userData.basePositions;
        const phases = effect.embers.userData.phases;
        const count = effect.embers.userData.particleCount;
        for (let index = 0; index < count; index += 1) {
          const positionIndex = index * 3;
          const revealPosition = (bases[positionIndex] + effect.worldWidth / 2) / effect.worldWidth;
          if (revealPosition > (effect.ignitionProgress ?? 1)) {
            attribute.array[positionIndex + 1] = -10;
            continue;
          }
          const phase = phases[index];
          const life = (this.groundFireElapsed * (0.28 + phase * 0.12) + phase + offset) % 1;
          // Drift with a light wind along local +X while climbing well clear
          // of the letters so the sparks read at isometric distance.
          attribute.array[positionIndex] = bases[positionIndex] + life * 0.3 + Math.sin(this.groundFireElapsed * 2.1 + phase * 7) * 0.03;
          attribute.array[positionIndex + 1] = bases[positionIndex + 1] + life * 0.6;
          attribute.array[positionIndex + 2] = bases[positionIndex + 2] + Math.cos(this.groundFireElapsed * 1.7 + phase * 5) * 0.05 * life;
        }
        attribute.needsUpdate = true;
      }

      if (effect.smoke.visible) {
        const attribute = effect.smoke.geometry.getAttribute('position');
        const bases = effect.smoke.userData.basePositions;
        const phases = effect.smoke.userData.phases;
        const speeds = effect.smoke.userData.speeds;
        const count = bases.length / 3;
        for (let index = 0; index < count; index += 1) {
          const positionIndex = index * 3;
          const revealPosition = (bases[positionIndex] + effect.worldWidth / 2) / effect.worldWidth;
          if (revealPosition > (effect.ignitionProgress ?? 1)) {
            attribute.array[positionIndex + 1] = -10;
            continue;
          }
          const phase = phases[index];
          const speed = speeds[index];
          const life = (this.groundFireElapsed * speed + phase + offset * 0.5) % 1;
          attribute.array[positionIndex] = bases[positionIndex] + life * 0.25 + Math.sin(this.groundFireElapsed * 0.8 + phase * 4) * 0.04;
          attribute.array[positionIndex + 1] = bases[positionIndex + 1] + life * 0.55;
          attribute.array[positionIndex + 2] = bases[positionIndex + 2] + Math.cos(this.groundFireElapsed * 0.6 + phase * 3) * 0.1 * life;
        }
        attribute.needsUpdate = true;
        effect.smoke.material.opacity = 0.3 + Math.sin(this.groundFireElapsed * 1.1 + offset) * 0.1;
        effect.smoke.material.size = 0.5 + Math.sin(this.groundFireElapsed * 0.55 + offset) * 0.16;
      }

      if (effect.flameBand.visible) {
        const frameCount = 8;
        const revealEdge = effect.worldWidth * ((effect.ignitionProgress ?? 1) - 0.5);
        for (const sprite of effect.flameBand.children) {
          const frame = Math.floor((this.groundFireElapsed * 10 + sprite.userData.phase) % frameCount);
          sprite.material.map.offset.x = frame / frameCount;
          sprite.visible = sprite.position.x <= revealEdge + 0.25;
        }
      }

      effect.mesh.material.opacity = 0.985 + Math.sin(this.groundFireElapsed * 11 + offset) * 0.015;
      effect.glow.material.opacity = 0.14 + Math.sin(this.groundFireElapsed * 6.5 + offset) * 0.05;
      effect.flames.material.opacity = 0.82 + Math.sin(this.groundFireElapsed * 8.7 + offset) * 0.12;
      effect.flameCores.material.opacity = 0.62 + Math.sin(this.groundFireElapsed * 10.3 + offset) * 0.1;
      effect.embers.material.opacity = 0.7 + Math.sin(this.groundFireElapsed * 5.1 + offset * 2) * 0.12;
    };
    animateFireLine(this.groundMessage?.firstEffect, 0);
    animateFireLine(this.groundMessage?.secondEffect, 0.43);
    for (const [index, fireLight] of (this.groundMessage?.fireLights ?? []).entries()) {
      if (!fireLight.visible) continue;
      const reveal = index === 1 ? (this.groundMessage.secondEffect?.ignitionProgress ?? 1) : 1;
      fireLight.intensity = reveal * (17 + Math.sin(this.groundFireElapsed * 7.3 + index) * 2.6
        + Math.sin(this.groundFireElapsed * 13.1 + index * 0.7) * 1.3);
    }
  }

  // Alpha round 4 (P1, 3.6): from the platform until Butch boards, the
  // camera holds the pair (Butch and the woman in the rose scarf), close.
  stationCloseUpActive(state = this.model.snapshot()) {
    return state.stationReached && !state.boardedTrain && this.echoMara.visible
      && !this.insideHotel && !this.insideMinistry;
  }

  stationPairFocus() {
    return this.preview.player.position.clone().lerp(this.echoMara.position, 0.5).setY(0.8);
  }

  // The follow camera stops a dead zone short of an override subject; aim
  // past it by that much so `point` itself lands in the middle of the frame.
  centredOverride(point) {
    const focus = this.preview.controls.target;
    const [deadX, deadZ] = CAMERA_FOLLOW.deadzone;
    const aim = point.clone();
    if (Math.abs(aim.x - focus.x) > 0.05) aim.x += Math.sign(aim.x - focus.x) * Math.min(deadX, Math.abs(aim.x - focus.x));
    if (Math.abs(aim.z - focus.z) > 0.05) aim.z += Math.sign(aim.z - focus.z) * Math.min(deadZ, Math.abs(aim.z - focus.z));
    return aim;
  }

  updateStationCamera() {
    if (!this.stationCloseUpActive()) {
      if (this.stationCameraHeld) {
        this.stationCameraHeld = false;
        if (!this.dialogue.active) this.preview.setCameraOverrideTarget(null);
      }
      return;
    }
    // A line frames its own speaker (frameSpeaker, with the pair as focus).
    if (this.dialogue.active) return;
    this.stationCameraHeld = true;
    this.preview.setCameraOverrideTarget(this.centredOverride(this.stationPairFocus()));
  }

  // Street zoom: closer than the old overview, a little closer in dialogue.
  updateCameraZoom(dt) {
    if (this.insideHotel || this.insideMinistry || this.preview.developerMode) return;
    const state = this.model.snapshot();
    let target = this.baseZoom + STREET_ZOOM_BOOST;
    // LOW quality frames a little closer: less city in view, larger cast.
    if (this.preview.qualityTier !== 'high') target += LOW_QUALITY_ZOOM_BOOST;
    if (this.dialogue.active && !state.boardedTrain) target += DIALOGUE_ZOOM_BOOST;
    // Alpha round 4: the station beat, close on Butch and her.
    if (this.stationCloseUpActive(state)) target = this.baseZoom + STATION_CLOSE_UP_ZOOM;
    // R5: the open carriage door, close, for the empty-seat line.
    if (this.boardedCloseUp && state.boardedTrain && state.departureSequenceMs < 11200) target = this.baseZoom + BOARDED_CLOSE_UP_ZOOM;
    if (this.fireCameraActive) target = this.baseZoom + 1.5;
    if (this.bellClamp.active && !this.bellClamp.seated) target = this.baseZoom + 1.2;
    const camera = this.preview.camera;
    const next = THREE.MathUtils.lerp(camera.zoom, target, 1 - Math.exp(-3.2 * dt));
    this.preview.controls.minZoom = next;
    this.preview.controls.maxZoom = next;
    if (Math.abs(next - camera.zoom) > 1e-4) {
      camera.zoom = next;
      camera.updateProjectionMatrix();
    }
  }

  updateCharacterAnimations(dt) {
    const ambientLifeStates = this.updateAmbientLifeRoutes(dt);
    this.updateEchoMara(dt, ambientLifeStates);
    this.characters.update(dt, { groundingEnabled: !this.insideMinistry && !this.insideHotel });
    this.charactersDrawn = this.characters.cullOutside(this.preview.camera);
    if (this.characterQa) {
      this.updateCharacterQa(dt);
      return;
    }
    const butchMoving = this.preview.path.length > 0 || this.directMoving;
    const levMoving = !this.dialogue.active && (this.guideElapsed !== null || this.levWalkElapsed !== null
      || this.morningLevMovedThisFrame || this.hotelLevMovedThisFrame);
    // A long walk strides, a run runs: the rig jogs (chapter3LongWalks.js).
    const butchGait = this.directMoving ? 'walk' : this.preview.gait;
    this.characters.play('butch', this.butchActionOverride || (butchMoving ? butchGait : 'idle'));
    this.characters.play('lev', levMoving ? 'walk' : 'idle', this.dialogue.active ? { immediate: true } : undefined);
    this.updateAmbientCharacterLoops(dt, ambientLifeStates);
  }

  npcIdsForInteraction(interactionId) {
    return {
      eda: ['eda'], 'transport-entrance': ['toma'], 'nika-terminal': ['nika'],
      'cut-feed-interface': ['petar'], 'hotel-register-hana': ['hana'], 'campfire-seline': ['campfire-seline'],
      'sava-records': ['sava'],
    }[interactionId] || [];
  }

  npcApproach(host, distance = 1.35, y = null) {
    const awayFromNpc = this.preview.player.position.clone().sub(host.position);
    awayFromNpc.y = 0;
    if (awayFromNpc.lengthSq() < 0.01) awayFromNpc.set(0, 0, 1);
    awayFromNpc.normalize().multiplyScalar(distance);
    const target = host.position.clone().add(awayFromNpc);
    return [target.x, y ?? host.position.y, target.z];
  }

  updateAmbientCityLife(dt) {
    this.ambientElapsed += dt;
    const exterior = !this.insideHotel && !this.insideMinistry;
    const state = this.model.snapshot();
    // The night walk belongs to the burning message alone.
    const nightAsleep = state.nightRouteStarted && !state.morningStarted;
    const daytimeStreetActors = [this.eda, this.toma, this.produceVendor, this.flowerVendor];
    // Street actors live outdoors only: interiors hide the whole exterior.
    for (const actor of daytimeStreetActors) actor.visible = exterior && !nightAsleep && !state.morningStarted;
    if (state.marketCrossed && !state.cutInterfaceComplete) this.petar.visible = exterior;
    const campfirePresent = this.campfireGatheringVisible();
    this.campfireRada.visible = campfirePresent;
    this.campfireMiro.visible = campfirePresent;
    this.campfireSeline.visible = campfirePresent;
    this.campfireKettle.visible = exterior && !nightAsleep && !state.boardedTrain;
    this.morningCampfireEchoStone.visible = this.morningCampfireStoneAvailable();
  }

  // ------------------------------------------------------------------ guidance
  currentSearchPhase() {
    const state = this.model.snapshot();
    if (this.characterQa || this.insideHotel || this.insideMinistry || state.boardedTrain) return null;
    if (state.seamInspected && !state.transportEntranceReached) return { id: 'find-ministry', target: positionFrom(OPENING_POSITIONS.transportApproach) };
    if (state.ticketBoardComplete && !state.edaComplete) return { id: 'find-market', target: positionFrom(OPENING_POSITIONS.edaApproach), hintAfter: 40 };
    if (state.marketCrossed && !state.cutInterfaceComplete) return { id: 'find-cut-interface', target: positionFrom(this.clampApproach()), hintAfter: 35 };
    if (state.cutInterfaceComplete && !state.hotelEntered) return { id: 'find-hotel', target: positionFrom([50.3, 0.5, -12.4]), hintAfter: 40 };
    if (state.sunriseViewed && !state.stationReached) return { id: 'find-station', target: positionFrom(STATION_TRIGGER), hintAfter: 40 };
    return null;
  }

  updateSearchGuidance(dt) {
    const phase = this.currentSearchPhase();
    const scriptedLev = this.levWalkElapsed !== null || this.guideElapsed !== null || this.departureElapsed !== null;
    if (phase && !scriptedLev && this.lev.visible && !this.morningLevFollowing) {
      this.startMorningLevFollow();
      this.autoLevFollow = true;
    } else if (!phase && this.autoLevFollow) {
      this.morningLevFollowing = false;
      this.autoLevFollow = false;
    }
    const now = wallNow();
    if (!phase) {
      this.searchHintPhase = null;
      this.searchHintElapsed = 0;
      this.searchHintClock = createHintClock();
      this.searchHintLastShownAt = -Infinity;
      return;
    }
    if (this.searchHintPhase !== phase.id) {
      this.searchHintPhase = phase.id;
      this.searchHintElapsed = 0;
      this.searchHintClock = createHintClock();
      this.searchHintLastShownAt = -Infinity;
    }
    if (this.destinationPass.phase !== phase.id) this.destinationPass = { phase: phase.id, near: false, passes: 0 };
    trackDestinationPass(this.destinationPass, this.preview.player.position.distanceTo(phase.target));
    // R2 P1: wall-clock seconds (a 1 fps GPU no longer stretches 45 s to 3 min).
    if (this.interactionLocked()) {
      this.searchHintElapsed = holdHintClock(this.searchHintClock, now);
      return;
    }
    if (this.preview.player.position.distanceTo(phase.target) < 6) {
      const nearTargetCap = phase.hintAfter ? Math.max(0, phase.hintAfter - 20) : SEARCH_HINT_NEAR_TARGET_SECONDS;
      holdHintClock(this.searchHintClock, now);
      this.searchHintElapsed = capHintClock(this.searchHintClock, nearTargetCap);
      return;
    }
    this.searchHintElapsed = tickHintClock(this.searchHintClock, dt, now);
    const due = this.searchHintElapsed >= (phase.hintAfter ?? SEARCH_HINT_AFTER_SECONDS)
      && (this.searchHintLastShownAt < 0 || this.searchHintElapsed - this.searchHintLastShownAt >= 90);
    if (!due || !this.lev.visible) return;
    this.searchHintLastShownAt = this.searchHintElapsed;
    const lines = SEARCH_HINT_LINES[phase.id]?.(this.compassDirection(phase.target), { passes: this.destinationPass.passes });
    if (lines) this.showLines(lines);
  }

  updateGuidanceHighlightPulse() {
    const pulse = 0.24 + 0.38 * (0.5 + 0.5 * Math.sin(this.groundFireElapsed * 2.35));
    for (const interaction of this.eligibleInteractions()) {
      if (!DISTANT_GUIDANCE_INTERACTIONS.has(interaction.id)) continue;
      if (interaction.position.distanceTo(this.preview.player.position) <= 7.5) continue;
      interaction.outline.visible = true;
      interaction.outline.setIntensity?.(pulse);
    }
  }

  updateOutlines() {
    const state = this.model.snapshot();
    const waitingForToma = !this.insideMinistry && state.seamInspected && !state.transportEntranceReached;
    this.preview.setOccludingBuildingForceClear?.('transit-ministry', waitingForToma);
    setActorForegroundVisibility(this.toma, waitingForToma);
    const visible = new Set(
      this.eligibleInteractions()
        .filter((interaction) => (this.tabHeld && !interaction.ambient)
          || interaction.id === this.hoveredId
          || (DISTANT_GUIDANCE_INTERACTIONS.has(interaction.id)
            && interaction.position.distanceTo(this.preview.player.position) > 7.5))
        .map((interaction) => interaction.outline),
    );
    for (const outline of new Set(this.interactions.map((interaction) => interaction.outline))) {
      if (outline) outline.visible = visible.has(outline);
    }
    if (waitingForToma) this.tomaOutline.visible = true;
    if (state.guideStarted && !state.seamInspected) this.seam.outline.visible = true;
  }

  // Paper tags (.nf-tag): the hovered interactable always; the nearest
  // story interactable within E's reach (alpha round 2, R2-3: no Tab
  // needed); with Tab held, every non-ambient story interactable on screen;
  // walkers in a scanner field show the E prompt; after a long idle, one
  // HOLD TAB · LOOK AROUND tag over Butch.
  updateTags() {
    this.tags.begin();
    const locked = this.interactionLocked();
    this.idleLookHintShown = false;
    const shown = new Set();
    if (!locked) {
      const eligible = this.eligibleInteractions();
      const plan = autoTaggedInteractions({
        candidates: eligible.map((interaction) => ({
          id: interaction.id,
          ambient: interaction.ambient === true,
          follows: interaction.follows === true,
          radius: interaction.reach ?? INTERACTION_RADIUS,
          distance: this.interactionDistance(interaction),
        })),
        hoveredId: this.hoveredId,
        tabHeld: this.tabHeld,
        radius: INTERACTION_RADIUS,
      });
      let storyTagShown = false;
      for (const interaction of eligible) {
        const hovered = interaction.id === this.hoveredId;
        if (!plan.shown.has(interaction.id)) continue;
        // While the clamp is live it carries the one tag for the loose feed.
        if (interaction.id === 'night-cut-feed' && this.bellClamp.active) continue;
        const anchor = this.interactionTagAnchor(interaction, hovered);
        anchor.y = Math.max(anchor.y, 0.5) + (interaction.ambient ? 0.6 : 2.1);
        const screen = this.screenOf(anchor);
        if (!screen.onScreen || shown.has(interaction.id)) continue;
        shown.add(interaction.id);
        if (!interaction.ambient) storyTagShown = true;
        const key = interaction.id === plan.nearestId ? '<kbd>E</kbd> ' : '';
        this.tags.place(screen, `${key}${interaction.verb ?? 'LOOK'} · ${interaction.label}`, { emphasis: hovered || interaction.id === plan.nearestId });
      }
      const storyTargets = eligible.filter((interaction) => !interaction.ambient && !interaction.follows).length;
      if (!this.activeField() && !(this.bellClamp.active && !this.bellClamp.seated)
        && idleLookHintDue({ idleSeconds: this.idleElapsed, tabHeld: this.tabHeld, storyTargets, storyTagShown })) {
        const anchor = this.preview.player.position.clone();
        anchor.y += 2.5;
        const screen = this.screenOf(anchor);
        if (screen.onScreen) {
          this.tags.place(screen, IDLE_LOOK_HINT_HTML);
          this.idleLookHintShown = true;
        }
      }
      for (const [id, field] of Object.entries(this.scannerFields)) {
        if (!this.model.scannerActive(id)) continue;
        const logic = field.logic;
        const snapshot = logic.snapshot();
        const host = id === 'market' ? this.olek : this.echoMara;
        if (!host.visible) continue;
        const anchor = host.position.clone();
        anchor.y += 2.3;
        const screen = this.screenOf(anchor);
        if (!screen.onScreen) continue;
        if (snapshot.matched) continue; // the pips bar carries E · LET GO while matched
        else if (logic.eligible(this.preview.player.position)) this.tags.place(screen, `HOLD <kbd>E</kbd> · ${SCANNER_WORDS.matchPrompt}`, { emphasis: true });
      }
      if (this.bellClamp.active && !this.bellClamp.seated) {
        // One tag, below the copper end: the fire letters are above it.
        const screen = this.screenOf(this.bellClamp.tipWorld());
        if (screen.onScreen) this.tags.place({ x: screen.x, y: screen.y + 92 }, this.bellClamp.tagText(), { emphasis: true });
      }
    }
    this.tags.end();
    this.updateCompass(locked, shown);
    this.updateControlsHint(locked);
    this.updateLeadOffer(locked);
  }

  // ------------------------------------------------------------ long walks
  // Which long walk is under way (chapter3LongWalks LEAD_ROUTES ids).
  leadPhase() {
    const search = this.currentSearchPhase();
    if (search) return search.id;
    const state = this.model.snapshot();
    if (this.characterQa || this.insideHotel || this.insideMinistry) return null;
    if (state.nightRouteStarted && !state.nightFireObserved) return 'find-fire';
    return null;
  }

  // Where Butch stands on arrival: the destination's own approach, so its
  // E tag is up the moment the black lifts.
  leadArrival(route) {
    const interaction = this.interactions.find((entry) => entry.id === route.interaction);
    if (!interaction) return null;
    const approach = route.butch
      ?? (typeof interaction.approach === 'function' ? interaction.approach() : interaction.approach);
    return { interaction, butch: positionFrom(approach) };
  }

  currentLeadOffer(locked = this.interactionLocked()) {
    const phaseId = this.leadPhase();
    const route = phaseId ? LEAD_ROUTES[phaseId] : null;
    if (!route) return null;
    const arrival = this.leadArrival(route);
    if (!arrival) return null;
    const player = this.preview.player.position;
    const distance = Math.hypot(player.x - arrival.butch.x, player.z - arrival.butch.z);
    const offer = leadOffer({
      phaseId,
      distance,
      locked: locked || Boolean(this.activeField()),
      levPresent: this.lev.visible && !this.insideHotel && !this.insideMinistry,
      travelling: this.leadTravelling !== null,
    });
    return offer ? { phaseId, route: offer, arrival, distance } : null;
  }

  updateLeadOffer(locked) {
    const offer = this.currentLeadOffer(locked);
    if (!offer) {
      if (!this.leadTag.hidden) this.leadTag.hidden = true;
      this.leadShown = null;
      return;
    }
    const html = leadOfferHtml(offer.route);
    if (this.leadTag.dataset.html !== html) {
      this.leadTag.innerHTML = html;
      this.leadTag.dataset.html = html;
      this.leadTag.setAttribute('aria-label', offer.route.guide === 'lev' ? 'G: Lev leads the way' : 'G: follow the firelight');
    }
    this.leadTag.hidden = false;
    // Under the task card, or under the controls tag while that shows.
    const above = (!this.controlsTag.hidden && this.controlsTag.getBoundingClientRect())
      || this.elements.objectiveCard?.getBoundingClientRect();
    const left = above ? above.left : 18;
    const top = above && above.height ? above.bottom + 10 : 64;
    this.leadTag.style.left = `${Math.round(left)}px`;
    this.leadTag.style.top = `${Math.round(top)}px`;
    this.leadShown = { phase: offer.phaseId, guide: offer.route.guide, distance: Number(offer.distance.toFixed(1)) };
  }

  // Fade to black, one line over it, Butch (and Lev) at the destination.
  // Wall-clock timers throughout: a slow GPU waits the same ~3 s.
  leadTheWay() {
    const offer = this.currentLeadOffer();
    if (!offer) return false;
    const { phaseId, route, arrival } = offer;
    this.leadTravelling = phaseId;
    this.preview.stopWalking();
    this.hoveredId = null;
    this.leadTag.hidden = true;
    this.leadLine.innerHTML = `<b>${route.line.speaker === 'NARRATION' ? '' : route.line.speaker}</b>${route.line.text}`;
    this.leadLine.classList.toggle('is-narration', route.line.speaker === 'NARRATION');
    this.leadLine.classList.add('visible');
    const startedAt = wallNow();
    const from = this.preview.player.position.clone();
    this.cutThroughBlack(() => {
      const butch = arrival.butch;
      this.preview.player.position.set(butch.x, this.preview.player.position.y, butch.z);
      const facing = arrival.interaction.position.clone().sub(butch);
      if (facing.lengthSq() > 1e-4) this.preview.player.rotation.y = Math.atan2(facing.x, facing.z);
      if (route.guide === 'lev' && this.lev.visible) {
        const lev = route.lev
          ? positionFrom(route.lev)
          : butch.clone().add(new THREE.Vector3(-1.1, 0, 0.6));
        this.lev.position.set(lev.x, this.lev.position.y, lev.z);
        const toTarget = arrival.interaction.position.clone().sub(lev);
        if (toTarget.lengthSq() > 1e-4) this.lev.rotation.y = Math.atan2(toTarget.x, toTarget.z);
        // Lev follows from here, not along the trail he was walking.
        if (this.morningLevFollowing) this.startMorningLevFollow();
      }
      this.preview.resetCamera();
      this.updateOutlines();
      return wait(LEAD_LINE_MS).then(() => this.leadLine.classList.remove('visible'));
    }, {
      after: () => {
        this.leadTravelling = null;
        this.leadTravels.push({
          phase: phaseId,
          metres: Number(from.distanceTo(this.preview.player.position).toFixed(1)),
          seconds: Number(((wallNow() - startedAt) / 1000).toFixed(2)),
        });
        this.noteControlUsed('walk');
        // Where the approach lies outside E's reach (the fire letters are
        // read from below both rows), arriving is the click on its tag.
        const { interaction } = arrival;
        if (interaction.eligible() && this.interactionDistance(interaction) > (interaction.reach ?? INTERACTION_RADIUS)) {
          this.startInteraction(interaction);
        }
        this.updateObjective();
        this.updateOutlines();
      },
    });
    return true;
  }

  // R2 P1 (alpha round 3): where the current walk ends, and what its compass
  // tag calls it. Every outdoor walk objective has one; the names are ones
  // the player has been told by then (the task card's own words, or the
  // target's tag).
  compassTarget() {
    const state = this.model.snapshot();
    if (this.insideHotel || this.insideMinistry || state.boardedTrain || this.characterQa) return null;
    const scannerWaiting = (id) => this.model.scannerActive(id) && !this.fieldState(id).matched;
    if (state.explorationBriefingComplete && !state.seamInspected) {
      const points = this.seam.points;
      return { id: 'lamp-oil-seam', label: 'THE OIL LINE', position: points[Math.floor(points.length / 2)] };
    }
    if (state.seamInspected && !state.transportEntranceReached) return { id: 'transport-entrance', label: 'TOMA · THE MINISTRY DOOR', position: this.toma.position };
    if (state.ticketBoardComplete && !state.edaComplete) return { id: 'eda', label: 'EDA · LAMP OIL', position: this.eda.position };
    if (state.edaComplete && !state.marketCrossed && scannerWaiting('market')) return { id: 'olek-walker', label: 'OLEK · THE MARKET SCANNER', position: this.olek.position };
    if (state.marketCrossed && !state.cutInterfaceComplete) return { id: 'cut-feed-interface', label: 'THE SERVICE JOINT · BY THE CLOCK', position: this.cutInterface.group.position };
    if (state.cutInterfaceComplete && !state.hotelEntered) return { id: 'copper-heron-entrance', label: 'THE COPPER HERON', position: this.hotelEntrance.position };
    if (state.nightRouteStarted && !state.nightFireObserved) return { id: 'night-burning-message', label: 'THE FIRE · THE SQUARE', position: this.groundMessage.position };
    if (state.sunriseViewed && !state.stationReached) return { id: 'station-platform', label: 'THE NIGHT SERVICE · THE PLATFORM', position: positionFrom(STATION_TRIGGER) };
    if (state.stationReached && scannerWaiting('station') && this.echoMara.visible) return { id: 'mara-walker', label: 'THE WOMAN IN THE ROSE SCARF', position: this.echoMara.position };
    return null;
  }

  updateCompass(locked, taggedIds) {
    const now = wallNow();
    const target = this.compassTarget();
    // The task-change flash starts when Butch is free to walk, not while
    // the line that set the task is still on screen.
    // At one frame a second, four wall seconds are only a few frames: the
    // flash also lasts at least COMPASS_FLASH_MIN_FRAMES drawn frames.
    const frame = this.preview.renderer?.info?.render?.frame ?? 0;
    if (this.compassFlashPending && target && !locked) {
      this.compassFlashPending = false;
      this.compassFlashUntil = now + COMPASS_FLASH_SECONDS * 1000;
      this.compassFlashFrame = frame;
    }
    const flashFramesLeft = this.compassFlashUntil > 0 ? COMPASS_FLASH_MIN_FRAMES - (frame - (this.compassFlashFrame ?? frame)) : 0;
    const distance = target
      ? Math.hypot(this.preview.player.position.x - target.position.x, this.preview.player.position.z - target.position.z)
      : Infinity;
    let screen = null;
    if (target) {
      const anchor = target.position.clone();
      anchor.y = Math.max(anchor.y, 0.5) + 2.1;
      screen = this.screenOf(anchor);
    }
    const visible = compassVisible({
      hasTarget: Boolean(target),
      locked,
      tabHeld: this.tabHeld,
      flashRemaining: Math.max((this.compassFlashUntil - now) / 1000, flashFramesLeft > 0 ? 0.001 : 0),
      distance,
      // On screen, the target's own Tab tag already names it.
      targetTagShown: Boolean(target && screen?.onScreen && taggedIds.has(target.id)),
      targetOnScreen: Boolean(screen?.onScreen),
    });
    if (!visible) {
      if (!this.compass.hidden) this.compass.hidden = true;
      this.compassShown = null;
      return;
    }
    if (this.compassLabel.textContent !== target.label) this.compassLabel.textContent = target.label;
    this.compass.hidden = false;
    const placement = compassPlacement(screen, {
      width: window.innerWidth,
      height: window.innerHeight,
      tagWidth: this.compass.offsetWidth,
      tagHeight: this.compass.offsetHeight,
    });
    this.compass.style.left = `${Math.round(placement.x)}px`;
    this.compass.style.top = `${Math.round(placement.y)}px`;
    this.compassArrow.style.transform = `rotate(${placement.angle}deg)`;
    this.compass.classList.toggle('is-edge', placement.offScreen);
    this.compassShown = { id: target.id, label: target.label, offScreen: placement.offScreen, angle: placement.angle };
  }

  updatePips() {
    let shown = false;
    for (const [id, field] of Object.entries(this.scannerFields)) {
      if (!this.model.scannerActive(id)) continue;
      const snapshot = field.logic.snapshot();
      if (!snapshot.matched) continue;
      shown = true;
      const pips = this.pips.querySelectorAll('i');
      pips.forEach((pip, index) => pip.classList.toggle('is-held', index < snapshot.pips));
      this.pips.classList.toggle('is-ready', snapshot.pips >= field.pipsRequired());
      // The bar rides above the pair, so it never competes with a caption.
      const walker = id === 'market' ? this.olek : this.echoMara;
      const anchor = this.preview.player.position.clone().lerp(walker.position, 0.5);
      anchor.y += 2.9;
      const screen = this.screenOf(anchor);
      this.pips.style.left = `${Math.round(screen.x)}px`;
      this.pips.style.top = `${Math.round(screen.y)}px`;
      // Walking away from the arch: say which way it is.
      const hint = snapshot.wrongWay ? SCANNER_WORDS.wrongWay : SCANNER_WORDS.holdHint;
      if (this.pipsHint && this.pipsHint.innerHTML !== hint) this.pipsHint.innerHTML = hint;
      this.pips.classList.toggle('is-wrong-way', Boolean(snapshot.wrongWay));
    }
    this.pips.hidden = !shown || this.dialogue.active;
  }

  // The task card follows the model's beat every frame (it only touches the
  // DOM when the words change).
  objectiveText() {
    const state = this.model.snapshot();
    if (this.characterQa) return 'SHARED CHARACTER RIG TEST';
    // Words live in CHAPTER3_OBJECTIVES (G13: each names only what the player
    // has been told). Beats the runtime passes through in one step (the
    // queue number, Lev's guided walk, the corridor and the night stairs) no
    // longer have a card of their own (G14).
    if (state.chapterComplete) return OBJECTIVES.complete;
    if (state.boardedTrain) return OBJECTIVES.leaves;
    if (state.stationScanPassed) return OBJECTIVES.board;
    if (state.stationReached) {
      const snapshot = this.fieldState('station');
      if (snapshot.matched) return snapshot.pips >= 3 ? OBJECTIVES.walkThrough : OBJECTIVES.keepPaceHer;
      return OBJECTIVES.stationScanner;
    }
    if (state.sunriseViewed) return OBJECTIVES.platform;
    if (state.morningStarted) return OBJECTIVES.dawn;
    if (state.secondLineLit) return OBJECTIVES.secondRow;
    if (state.wireReconnected) return OBJECTIVES.bell;
    if (state.nightFireObserved) return this.bellClamp.active ? OBJECTIVES.clamp : OBJECTIVES.readLetters;
    if (state.nightRouteStarted) return OBJECTIVES.followFire;
    if (state.slept) return this.dialogue.active ? OBJECTIVES.night : OBJECTIVES.roomDoor;
    if (state.hotelRoomEntered) return OBJECTIVES.sleep;
    if (state.hotelCheckInComplete) return OBJECTIVES.upstairs;
    if (state.hotelEntered) return OBJECTIVES.hana;
    if (state.cutInterfaceComplete) return OBJECTIVES.copperHeron;
    if (state.marketCrossed) return OBJECTIVES.serviceJoint;
    if (state.edaComplete) {
      const snapshot = this.fieldState('market');
      if (snapshot.matched) return snapshot.pips >= 3 ? OBJECTIVES.walkThrough : OBJECTIVES.keepPaceOlek;
      return OBJECTIVES.marketScanner;
    }
    if (state.ticketBoardComplete) return OBJECTIVES.eda;
    if (this.ticketBoard.active) return OBJECTIVES.fileTickets;
    if (state.nikaComplete) return OBJECTIVES.publicTable;
    if (state.transportHallEntered) return OBJECTIVES.nika;
    if (state.transportEntranceReached) return OBJECTIVES.publicHall;
    if (state.seamInspected) return OBJECTIVES.ministry;
    if (state.guideStarted) return OBJECTIVES.oilLine;
    if (state.trainDeparted) return OBJECTIVES.meetLev;
    return OBJECTIVES.stepOff;
  }

  updateObjective() {
    const title = this.objectiveText();
    if (title === this.lastObjectiveKey) return;
    this.lastObjectiveKey = title;
    // R2 P1: a new task points the way for a few seconds (if it is a walk).
    this.compassFlashPending = true;
    this.compassFlashUntil = 0;
    if (this.elements.statusElement) this.elements.statusElement.textContent = title;
    if (this.elements.objectiveTitle) this.elements.objectiveTitle.textContent = title;
    this.elements.objectiveCard?.classList.remove('is-new');
    void this.elements.objectiveCard?.offsetWidth;
    this.elements.objectiveCard?.classList.add('is-new');
  }

  // Alpha round 4 (P1): every change of beat records where Continue should
  // resume (chapter3ResumePoint). The page (car03-3d-main.js) writes it to
  // the save; it ignores dev / router routes.
  updateResumePoint() {
    if (this.characterQa) return null;
    const point = chapter3ResumePoint(this.model.snapshot());
    const key = point ? `${point.checkpointId}:${point.stage}` : null;
    if (key === this.lastResumeKey) return point;
    this.lastResumeKey = key;
    if (point) globalThis.dispatchEvent?.(new CustomEvent('nightfall:chapter3-resume', { detail: point }));
    return point;
  }

  updateDiagnosticState() {
    this.preview.container.dataset.gameState = JSON.stringify(this.textStateCompact());
  }

  textStateCompact() {
    const state = this.model.snapshot();
    return { phase: state.phase, lastEvent: state.lastEvent, objective: this.lastObjectiveKey };
  }

  updateMusic() {
    const state = this.model.snapshot();
    let cue = 'arrival';
    if (state.transportHallEntered) cue = 'ministry';
    if (state.ticketBoardComplete) cue = 'market';
    if (state.marketCrossed) cue = 'dusk';
    if (state.hotelEntered) cue = 'hotel';
    if (state.nightRouteStarted) cue = 'burning';
    if (state.morningStarted) cue = 'morning';
    if (cue === this.musicCue) return;
    this.musicCue = cue;
    music.play(`c3-${cue}`, { ...C3_MUSIC[cue] });
  }

  textState() {
    const state = this.model.snapshot();
    const at = (object) => object ? [object.position.x, object.position.y, object.position.z].map((value) => Number(value.toFixed(2))) : null;
    return {
      slice: 'chapter-03-echo-city',
      location: this.insideMinistry ? 'transport-ministry-public-hall'
        : this.insideHotel ? `copper-heron-${this.hotelArea}` : 'echo-city-exterior',
      time: state.clock.time,
      period: state.clock.period,
      objective: this.lastObjectiveKey,
      state,
      music: { ...music.qa(), cue: this.musicCue },
      hoveredInteraction: this.hoveredId,
      tabScanHeld: this.tabHeld,
      eligibleInteractions: this.eligibleInteractions().map((interaction) => interaction.id),
      storyInteractables: this.eligibleInteractions().filter((interaction) => !interaction.ambient).map((interaction) => interaction.id),
      flavourInteractables: this.interactions.filter((interaction) => interaction.ambient).map((interaction) => interaction.id),
      tags: this.tags.snapshot(),
      idleSeconds: Number(this.idleElapsed.toFixed(1)),
      idleLookHint: this.idleLookHintShown,
      destinationPasses: this.destinationPass.passes,
      compass: this.compassShown,
      controlsHint: { visible: this.controlsHintVisible, used: [...this.controlsUsed] },
      leadTheWay: { offer: this.leadShown, travelling: this.leadTravelling, travels: [...this.leadTravels] },
      searchHintSeconds: Number(this.searchHintElapsed.toFixed(1)),
      guidanceBeacons: Object.fromEntries(Object.entries(this.guidanceBeacons ?? {}).map(([id, beacon]) => [id, beacon.visible])),
      dialogue: this.dialogue.snapshot(),
      evidenceViewer: this.evidenceViewer.snapshot(),
      ticketBoard: this.ticketBoard.snapshot(),
      bellClamp: this.bellClamp.snapshot(),
      scanners: Object.fromEntries(Object.entries(this.scannerFields).map(([id, field]) => [id, { active: this.model.scannerActive(id), ...field.logic.snapshot(), playerInField: field.logic.contains(this.preview.player.position) }])),
      directMovement: Boolean(this.activeField()),
      assets: {
        groups: this.assetGroupsState(),
        characters: this.characters.state().map((entry) => ({ id: entry.id, loaded: entry.loaded })),
        replacements: this.replacements.state().map((entry) => ({ id: entry.id, loaded: entry.loaded })),
      },
      magicStone: {
        id: 'chapter-3',
        collected: magicStoneSnapshot().collected.includes('chapter-3'),
        sources: { selineAtDusk: this.campfireGatheringVisible(), morningAshes: this.morningCampfireStoneAvailable() },
        seline: at(this.campfireSeline),
        screen: (() => {
          const source = state.morningStarted ? this.morningCampfireEchoStone : this.campfireSeline;
          const projected = this.screenOf(source.position);
          return { x: Number(projected.x.toFixed(1)), y: Number(projected.y.toFixed(1)) };
        })(),
      },
      camera: { zoom: Number(this.preview.camera.zoom.toFixed(2)), speakerFocus: this.speakerFocus ? at({ position: this.speakerFocus }) : null },
      actors: {
        butch: at(this.preview.player),
        lev: this.lev.visible ? at(this.lev) : null,
        olek: this.olek.visible ? at(this.olek) : null,
        echoMara: this.echoMara.visible ? at(this.echoMara) : null,
        petar: this.petar.visible ? at(this.petar) : null,
      },
      screen: {
        butch: (() => { const s = this.screenOf(this.preview.player.position.clone().add(new THREE.Vector3(0, 1, 0))); return [Math.round(s.x), Math.round(s.y)]; })(),
        fire: (() => { const s = this.screenOf(this.fireFrame()); return [Math.round(s.x), Math.round(s.y)]; })(),
        clamp: this.bellClamp.active ? (() => { const s = this.screenOf(this.bellClamp.tipWorld()); return [Math.round(s.x), Math.round(s.y)]; })() : null,
        clampTarget: this.bellClamp.active ? (() => { const s = this.screenOf(this.groundMessage.interfacePosition); return [Math.round(s.x), Math.round(s.y)]; })() : null,
      },
      sequences: {
        trainDepartureActive: this.departureElapsed !== null,
        levWalkActive: this.levWalkElapsed !== null,
        nightIgnitionActive: this.nightIgnitionElapsed !== null,
        nightIgnitionProgress: Number(this.nightIgnitionProgress.toFixed(3)),
        sunriseTableauVisible: this.elements.sunriseTableau?.classList.contains('visible') ?? false,
        chapterDepartureMs: state.departureSequenceMs,
        chapterEndCardVisible: !this.chapterEndCard.hidden,
        searchPhase: this.searchHintPhase,
      },
      lastBlockedClick: this.lastBlockedClick ?? null,
    };
  }
}
