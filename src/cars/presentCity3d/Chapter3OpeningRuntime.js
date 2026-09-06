import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import {
  ARRIVAL_DIALOGUE,
  BOTTLE_DIALOGUE,
  BOTTLE_RESPONSES,
  BOSKO_QUEUE_DIALOGUE,
  BOSKO_SQUARE_CONCLUSION,
  BOSKO_SQUARE_OPENING,
  BOSKO_SQUARE_RESPONSES,
  CART_DIALOGUE,
  CUT_INTERFACE_BLOCKED,
  CUT_INTERFACE_CONCLUSION,
  CUT_INTERFACE_OPENING,
  CUT_INTERFACE_RESPONSES,
  HANA_BLOCKED,
  HANA_CONCLUSION,
  HANA_OPENING,
  HANA_TOPIC_RESPONSES,
  DISCARDED_PRINT_DIALOGUE,
  EDA_APPROACH_RESPONSES,
  EDA_OPENING,
  EDA_RECORD_BLOCKED,
  EDA_TOPIC_RESPONSES,
  FIRST_THEORY_CONCLUSION,
  FIRST_THEORY_OPENING,
  FIRST_THEORY_RESPONSES,
  FLOWER_VENDOR_DIALOGUE,
  LEV_COMMON,
  LEV_FIRST_RESPONSES,
  LEV_INTRO_DIALOGUE,
  LEV_TOPIC_RESPONSES,
  NIKA_BLOCKED,
  NIKA_CONCLUSION,
  NIKA_OPENING,
  NIKA_TOPIC_RESPONSES,
  ARCHIVE_ENTRANCE_DIALOGUE,
  ANA_MAP_HELP_DIALOGUE,
  ARCHIVE_MAP_CONCLUSION,
  ARCHIVE_MAP_DIALOGUE,
  ARCHIVE_MAP_RESPONSES,
  MAINTENANCE_ORDER_DIALOGUE,
  MATERIAL_TIMELINE_DIALOGUE,
  OLEK_CONCLUSION,
  OLEK_OPENING,
  OLEK_ROUTE_BLOCKED,
  OLEK_TOPIC_RESPONSES,
  OPENING_POSITIONS,
  PLAZA_GROOVE_BLOCKED,
  PLAZA_GROOVE_CONCLUSION,
  PLAZA_GROOVE_OPENING,
  PLAZA_GROOVE_RESPONSES,
  PETAR_BLOCKED,
  PETAR_CONCLUSION,
  PETAR_OPENING,
  PETAR_TOPIC_RESPONSES,
  PRODUCE_VENDOR_DIALOGUE,
  SAVA_BLOCKED,
  SAVA_CONCLUSION,
  SEAM_CONCLUSION,
  SEAM_DIALOGUE,
  SEAM_INFERENCE_RESPONSES,
  SEAM_TOPIC_RESPONSES,
  SAVA_NEXT_INTERACTION,
  SAVA_OPENING,
  SAVA_TOPIC_RESPONSES,
  SECOND_THEORY_BLOCKED,
  SECOND_THEORY_CONCLUSION,
  SECOND_THEORY_OPENING,
  SECOND_THEORY_RESPONSES,
  TRANSPORT_ENTRANCE_NO_BOTTLE,
  TRANSPORT_ENTRANCE_WITH_BOTTLE,
  TRANSPORT_QUEUE_DIALOGUE,
  WORLD_BRIEFING_DIALOGUE,
  edaExitLine,
  edaRecordResponse,
  edaTopicMenu,
  cutInterfaceMenu,
  levTopicMenu,
  nikaTopicMenu,
  olekTopicMenu,
  plazaGrooveMenu,
  petarTopicMenu,
  savaTopicMenu,
  seamInferenceMenu,
  seamMenu,
  secondTheoryMenu,
  hanaTopicMenu,
  SEARCH_HINT_LINES,
} from './chapter3OpeningContent.js';
import { Chapter3DialogueController } from './Chapter3EndingRuntime.js';
import { createChapter3MinistryHall, MINISTRY_POSITIONS } from './Chapter3MinistryHall.js';
import { createChapter3ArchiveHall, ARCHIVE_POSITIONS } from './Chapter3ArchiveHall.js';
import { Chapter3TimeVisualController } from './Chapter3TimeVisualController.js';
import { Chapter3FlipClock } from './Chapter3FlipClock.js';
import { Chapter3EvidenceViewer, CHAPTER3_DOCUMENTS } from './Chapter3EvidenceViewer.js';
import {
  createChapter3HotelHall,
  HOTEL_POSITIONS,
} from './Chapter3HotelHall.js';
import {
  HOTEL_LOBBY_WALK_BOUNDS,
  HOTEL_LOBBY_FURNITURE_OBSTACLES,
  HOTEL_CORRIDOR_WALK_BOUNDS,
  HOTEL_ROOM_WALK_BOUNDS,
  HOTEL_ROOM_FURNITURE_OBSTACLES,
  hotelFurnitureAt,
} from './chapter3HotelNavigation.js';
import { Chapter3ReplacementAssetSystem } from './Chapter3ReplacementAssetSystem.js';
import {
  CITY_MODELS,
  PERIMETER_BUILDINGS,
  PERIMETER_FOOTPRINTS,
  RAIL_LAYOUT,
  CAMERA_HOME,
  WORLD_NODES,
  boundaryScaleFor,
} from './city3dConfig.js';
import { findPath, isWalkable } from './EchoCity3DPreview.js';
import { music } from '../../shared/musicDirector.js';
import { collectMagicStone, magicStoneSnapshot } from '../../shell/magicStones.js';

// Chapter 3 horizontal score map. Each cue owns a narrative district/beat and
// stays looped until the next cue is ready, so music never falls into an
// accidental gap. musicDirector crossfades the outgoing and incoming tracks.
// Recording provenance and public-release requirements live beside the runtime
// assets in public/assets/music/ch3/ASSET_MANIFEST.md.
const C3_MUSIC = {
  arrival: { src: 'assets/music/ch3/3.1_satie_gnossienne_no1.mp3', volume: 0.48, fade: 5.2, outFade: 5.2, dialogueDuckDb: -5.5 },
  market: { src: 'assets/music/ch3/3.2_dvorak_humoresque_no7.mp3', volume: 0.43, fade: 5.2, outFade: 4.8, dialogueDuckDb: -5.5 },
  ministry: { src: 'assets/music/ch3/3.3_sousa_washington_post_march.mp3', volume: 0.36, fade: 4.2, outFade: 4.2, dialogueDuckDb: -6.5 },
  square: { src: 'assets/music/ch3/3.4_beethoven_pathetique_mvt2.mp3', volume: 0.43, fade: 5.0, outFade: 5.0, dialogueDuckDb: -5.5 },
  archive: { src: 'assets/music/ch3/3.5_beethoven_moonlight_mvt1.mp3', volume: 0.42, fade: 5.5, outFade: 5.5, dialogueDuckDb: -5.5 },
  dusk: { src: 'assets/music/ch3/3.6_chopin_prelude_op28_no4.mp3', volume: 0.44, fade: 5.0, outFade: 5.8, dialogueDuckDb: -5.5 },
  hotel: { src: 'assets/music/ch3/3.7_chopin_nocturne_op27_no2.mp3', volume: 0.42, fade: 5.8, outFade: 5.8, dialogueDuckDb: -5.5 },
  burning: { src: 'assets/music/ch3/3.8_beethoven_sym7_mvt2_allegretto_cello.mp3', volume: 0.46, fade: 4.8, outFade: 6.5, dialogueDuckDb: -6.5 },
  morning: { src: 'assets/music/ch3/3.9_dvorak_new_world_largo.mp3', volume: 0.45, fade: 6.5, outFade: 7.5, dialogueDuckDb: -5.5 },
};
import { ENDING_SLICE_POSITIONS } from './chapter3EndingContent.js';
import { Chapter3AnimatedCharacterSystem } from './Chapter3AnimatedCharacters.js';
import {
  BOARDING_CONCLUSION, CONTINUATION_CHOICES, CONTINUATION_RESPONSES, DARO_BLOCKED, DARO_CONCLUSION, DARO_OPENING,
  DARO_RESPONSES, EVIDENCE_TABLE_CONCLUSION, EVIDENCE_TABLE_OPENING, FINAL_THEORY_BLOCKED, FINAL_THEORY_RESPONSES,
  HANA_BREAKFAST, HOTEL_GUEST_DIALOGUE, LEV_FINAL_BLOCKED, LEV_FINAL_CONCLUSION, LEV_FINAL_OPENING, LEV_FINAL_RESPONSES,
  ALLEY_MEN_DIALOGUE, ALLEY_RESIDENT_DIALOGUE, DAWN_CAMPFIRE_REMAINS_DIALOGUE, MORNING_LEV_GREETING, MORNING_LEV_REMINDER,
  CAMPFIRE_KETTLE_DIALOGUE, CAMPFIRE_MIRO_DIALOGUE, CAMPFIRE_RADA_DIALOGUE, CAMPFIRE_SELINE_DIALOGUE,
  CAMPFIRE_SELINE_STONE_DIALOGUE,
  MORNING_LEV_OVERLOOK_REMINDER, MORNING_LEV_PLATFORM_REMINDER, MORNING_RESERVATION_DIALOGUE, SUNRISE_BENCH_DIALOGUE,
  MORNING_EVIDENCE_BLOCKED, MORNING_EVIDENCE_CONCLUSION, MORNING_EVIDENCE_RESPONSES, NIGHT_ATTITUDE_RESPONSES,
  NIGHT_FIRST_LINE, NIGHT_RECONNECT, NIGHT_SECOND_LINE, NIGHT_WAKE_DIALOGUE, SLEEP_DIALOGUE, daroMenu, finalTheoryMenu, levFinalMenu, morningEvidenceMenu,
} from './chapter3FinalContent.js';
import { car03Audio } from '../presentCity/car03Audio.js';

const INTERACTION_RADIUS = 4.2;
const SEARCH_HINT_AFTER_SECONDS = 90;
const SEARCH_HINT_NEAR_TARGET_SECONDS = 60;
const POST_OLEK_SCORE_SILENCE_SECONDS = 2.2;
const POST_OLEK_INTERACTION_HINT = Object.freeze({
  title: 'EXPLORATION TIP · HOLD TAB',
  detail: 'Hold TAB to highlight every object and person you can interact with.',
});
const FIRE_SITE = Object.freeze({ x: 6.8, z: 5.8, approachZ: 9.1 });
// Reading-room furniture footprints (measured from the imported kit after its
// 0.47 rescale), pre-padded with the actor radius so click targets never land
// inside a desk, shelf or the big map board.
const ARCHIVE_FURNITURE_OBSTACLES = Object.freeze([
  Object.freeze({ minX: -1.2, maxX: 1.7, minZ: -1.55, maxZ: 1.15 }),
  Object.freeze({ minX: -3.55, maxX: -2.5, minZ: -1.95, maxZ: 2.3 }),
  // East counter (work-order desk) and the tall northeast shelf, measured
  // from the imported furniture mesh; the strip between them stays walkable.
  Object.freeze({ minX: 2.15, maxX: 3.85, minZ: -0.35, maxZ: 1.35 }),
  Object.freeze({ minX: 1.15, maxX: 1.9, minZ: -2.85, maxZ: -1.15 }),
  Object.freeze({ minX: -3.9, maxX: 3.9, minZ: -3.9, maxZ: -2.4 }),
]);
// Measured from vertical raycasts through the installed Hunyuan furniture kit
// at its runtime scale/offset. Boxes include a 0.42 m player-radius margin.
const MINISTRY_FURNITURE_OBSTACLES = Object.freeze([
  Object.freeze({ minX: -6.75, maxX: 6.75, minZ: -6.15, maxZ: -4.35 }),
  Object.freeze({ minX: 2.0, maxX: 6.75, minZ: -1.65, maxZ: 0.2 }),
  Object.freeze({ minX: -6.2, maxX: -1.5, minZ: -0.2, maxZ: 1.35 }),
  Object.freeze({ minX: -0.15, maxX: 3.55, minZ: 3.1, maxZ: 5.05 }),
]);
const MINISTRY_WALK_BOUNDS = Object.freeze({ minX: -7.9, maxX: 7.9, minZ: -3.95, maxZ: 9.75 });
const ARCHIVE_WALK_BOUNDS = Object.freeze({ minX: -4.3, maxX: 4.3, minZ: -2.85, maxZ: 3.55 });
const DISTANT_GUIDANCE_INTERACTIONS = Object.freeze(new Set([
  'transport-entrance', 'archive-entrance', 'copper-heron-entrance',
  'sunrise-overlook-trail', 'night-burning-message',
]));
const AMBIENT_CITY_ROAM_POINTS = Object.freeze(
  Object.values(WORLD_NODES).map(([x, z]) => Object.freeze([x, z])),
);
const MORNING_LEV_EXTERIOR_START = Object.freeze([48.2, 0.5, -11.0]);
const SUNRISE_ROUTE_POINTS = Object.freeze([
  Object.freeze([-45.0, 0.5, 28.0]),
  Object.freeze([-47.0, 2.8, 26.0]),
  Object.freeze([-43.8, 5.1, 25.7]),
  Object.freeze([-42.1, 5.6, 23.25]),
  Object.freeze([-40.65, 6.7, 20.9]),
  Object.freeze([-39.35, 8.8, 18.75]),
]);
const HOTEL_PAPER_DOCUMENTS = Object.freeze({
  'oil-route': CHAPTER3_DOCUMENTS.HOTEL_OIL_ROUTE,
  'issue-copy': CHAPTER3_DOCUMENTS.HOTEL_ISSUE_COPY,
  'order-c441': CHAPTER3_DOCUMENTS.HOTEL_ORDER_C441,
  'witness-notes': CHAPTER3_DOCUMENTS.HOTEL_WITNESS_NOTES,
  reservation: CHAPTER3_DOCUMENTS.HOTEL_RESERVATION,
});

function positionFrom(values) {
  return new THREE.Vector3(values[0], values[1], values[2]);
}

function pointInsideInteriorObstacle(point, obstacles) {
  return obstacles.some((box) => (
    point.x > box.minX && point.x < box.maxX
    && point.z > box.minZ && point.z < box.maxZ
  ));
}

function clampInteriorPoint(point, bounds, obstacles) {
  const result = point.clone();
  result.x = THREE.MathUtils.clamp(result.x, bounds.minX, bounds.maxX);
  result.z = THREE.MathUtils.clamp(result.z, bounds.minZ, bounds.maxZ);
  // Treat overlapping padded footprints as a union. Trying only the nearest
  // edge of one box can bounce Butch between the dining table and stairs.
  for (let pass = 0; pass < Math.max(1, obstacles.length * 2); pass += 1) {
    const containing = obstacles.filter((box) => pointInsideInteriorObstacle(result, [box]));
    if (containing.length === 0) break;
    const candidates = containing.flatMap((box) => [
      new THREE.Vector3(box.minX, result.y, result.z),
      new THREE.Vector3(box.maxX, result.y, result.z),
      new THREE.Vector3(result.x, result.y, box.minZ),
      new THREE.Vector3(result.x, result.y, box.maxZ),
    ]).filter((candidate) => !pointInsideInteriorObstacle(candidate, obstacles));
    candidates.sort((a, b) => a.distanceToSquared(result) - b.distanceToSquared(result));
    if (candidates.length === 0) break;
    result.copy(candidates[0]);
  }
  return result;
}

function interiorSegmentIsClear(start, end, bounds, obstacles) {
  const distance = start.distanceTo(end);
  const samples = Math.max(2, Math.ceil(distance / 0.12));
  for (let index = 0; index <= samples; index += 1) {
    const t = index / samples;
    const point = new THREE.Vector3(
      THREE.MathUtils.lerp(start.x, end.x, t),
      start.y,
      THREE.MathUtils.lerp(start.z, end.z, t),
    );
    if (point.x < bounds.minX || point.x > bounds.maxX || point.z < bounds.minZ || point.z > bounds.maxZ) return false;
    if (pointInsideInteriorObstacle(point, obstacles)) return false;
  }
  return true;
}

// A small visibility graph routes around the actual furniture footprints.
// Unlike the old end-point clamp, every segment from Butch to the click target
// is collision checked, so counters, queue rails and reading tables are solid.
function findInteriorPath(start, requestedTarget, bounds, obstacles) {
  const target = clampInteriorPoint(requestedTarget, bounds, obstacles);
  const source = clampInteriorPoint(start, bounds, obstacles);
  if (interiorSegmentIsClear(source, target, bounds, obstacles)) return [target];
  const nodes = [source, target];
  for (const box of obstacles) {
    nodes.push(
      new THREE.Vector3(box.minX, source.y, box.minZ),
      new THREE.Vector3(box.minX, source.y, box.maxZ),
      new THREE.Vector3(box.maxX, source.y, box.minZ),
      new THREE.Vector3(box.maxX, source.y, box.maxZ),
    );
  }
  const valid = nodes.filter((node) => (
    node.x >= bounds.minX && node.x <= bounds.maxX
    && node.z >= bounds.minZ && node.z <= bounds.maxZ
    && !pointInsideInteriorObstacle(node, obstacles)
  ));
  const sourceIndex = valid.indexOf(source);
  const targetIndex = valid.indexOf(target);
  if (sourceIndex < 0 || targetIndex < 0) return [];
  const distances = valid.map(() => Infinity);
  const previous = valid.map(() => -1);
  const open = new Set(valid.map((_, index) => index));
  distances[sourceIndex] = 0;
  while (open.size) {
    let current = -1;
    for (const candidate of open) {
      if (current < 0 || distances[candidate] < distances[current]) current = candidate;
    }
    if (current < 0 || !Number.isFinite(distances[current]) || current === targetIndex) break;
    open.delete(current);
    for (const neighbor of open) {
      if (!interiorSegmentIsClear(valid[current], valid[neighbor], bounds, obstacles)) continue;
      const nextDistance = distances[current] + valid[current].distanceTo(valid[neighbor]);
      if (nextDistance >= distances[neighbor]) continue;
      distances[neighbor] = nextDistance;
      previous[neighbor] = current;
    }
  }
  if (!Number.isFinite(distances[targetIndex])) return [];
  const path = [];
  for (let cursor = targetIndex; cursor !== sourceIndex && cursor >= 0; cursor = previous[cursor]) path.unshift(valid[cursor]);
  return path;
}

function smooth(value) {
  const x = THREE.MathUtils.clamp(value, 0, 1);
  return x * x * (3 - 2 * x);
}

const AMBIENT_MODEL_IDS = new Set([
  'archive', 'transit-ministry', 'scanner-tower', 'clock-tower', 'reunion-fountain',
  'municipal-tram', 'municipal-tram-car-02', 'municipal-tram-car-03',
  'derelict-boundary-tram-lower', 'derelict-boundary-tram-upper',
  'abandoned-car-southeast', 'abandoned-car-southwest', 'abandoned-car-west-mid', 'abandoned-car-northeast',
  'street-campfire', 'crushed-trash-can-01', 'market-stall-west', 'market-stall-east',
  'district-stall-c', 'district-stall-d', 'queue-dispenser', 'produce-scale',
  'receipt-device', 'queue-stanchion', 'clerk-stamp-machine', 'crosswalk-signal',
  'fountain-bench', 'district-bench-f', 'pa-speaker', 'night-ticket-reader',
  'open-air-station', 'tram-tunnel-portal',
]);

const WORLD_OBJECT_COPY = Object.freeze({
  archive: ['The public doors are shut. A notice asks for a record number.', 'Still closed. The old maps will have to wait.'],
  'transit-ministry': ['Public Services. A clerk points toward the number dispenser.', 'Same door, same queue. The city likes an order.'],
  'scanner-tower': ['The reader is dark. Whatever it used to check, it is not checking me.', 'No light, no tone, no answer.'],
  'clock-tower': ['Seven minutes slow. Everyone in the square still checks it.', 'Still seven minutes slow. Nobody seems surprised.'],
  'reunion-fountain': ['Coins, tram tokens, and one brass button lie under the water.', 'Nothing with Mara\'s name. Just other people\'s wishes.'],
  'crosswalk-signal': ['The signal cycles for a crowd that is not here.', 'Walk. Wait. Walk. The street obeys even when nobody does.'],
  'pa-speaker': ['Dust inside the horn. The last notice ended mid-sentence.', 'The speaker has nothing else to announce.'],
  'night-ticket-reader': ['The reader is dark between departures.', 'No ticket, no light. The next train is not here yet.'],
  'tram-tunnel-portal': ['The rails disappear into the cutting. East is somewhere past the dark.', 'No safe path on foot. The train is the only way through.'],
  'open-air-station': ['An open platform, a route board, and no place to hide a departure.', 'The station keeps every goodbye in public.'],
  'fountain-bench': ['Rain has dried from one end of the bench.', 'Just a bench. People come and go.'],
  'district-bench-f': ['A crumpled ticket is wedged beneath the seat.', 'Wrong date. Wrong line.'],
  'street-campfire': ['Warm ash and a ring of mismatched cups.', 'Someone will come back for the kettle.'],
  'produce-scale': ['The brass scale settles a little left of zero.', 'Eda would notice the missing weight.'],
  'receipt-device': ['A paper spike full of ordinary purchases.', 'No name I recognize on the visible slips.'],
  'queue-stanchion': ['The rope leads everyone to the same counter eventually.', 'There is no shortcut through a queue.'],
  'clerk-stamp-machine': ['The stamp is locked behind the counter.', 'Forms only become official on the other side of the glass.'],
});

const LAMP_COPY = Object.freeze([
  ['Clock-square lamp', 'A repair date is scratched into the base. Three winters ago.', 'The clock is slow. This lamp is not.'],
  ['Clock-square east lamp', 'Wax from a public notice still clings to the pole.', 'The notice is gone. The wax stayed.'],
  ['Lower-square lamp', 'Someone tied a faded blue thread below the crown.', 'Not Mara\'s scarf. Just one loose thread.'],
  ['Lower-square east lamp', 'The glass is clean on the street side and blackened toward the square.', 'It has been turned to light the road, not the faces.'],
  ['Market north lamp', 'Price marks run up the pole in chalk.', 'Yesterday\'s prices, half washed away.'],
  ['Market south lamp', 'A vendor has hung a bent weighing hook from the base.', 'The hook is empty now.'],
  ['Civic crossing lamp', 'Its inspection seal matches the Ministry stamp.', 'Official enough to be ignored.'],
  ['Fountain north lamp', 'Coins have been balanced along the bronze foot.', 'Nobody trusts the fountain with every wish.'],
  ['Fountain south lamp', 'Water spots reach higher than the last rainfall could.', 'The fountain throws farther when the wind turns.'],
  ['Service-lane lamp', 'One side is dented at handcart height.', 'A cart hit this corner more than once.'],
  ['Archive-lane lamp', 'Tiny paper fibres cling inside the lower grille.', 'Archive waste, carried out on wet shoes.'],
  ['Station approach lamp', 'A route number has been painted over twice.', 'The newest number is already peeling.'],
  ['Rail cutting lamp', 'Soot darkens the side facing the tunnel.', 'Every train leaves a little of itself here.'],
  ['Upper platform lamp', 'The bulb hums at the same pitch as the rail.', 'The hum stops whenever the track goes quiet.'],
  ['East station lamp', 'A departure notice is pinned beneath the glass.', 'The notice lists yesterday\'s last train.'],
  ['East road lamp', 'Fresh boot scrapes circle the base.', 'Someone waited here and kept moving.'],
  ['Outer east lamp', 'Moths collect inside the cracked shade.', 'The crack is too high to have happened by accident.'],
  ['Southwest boundary lamp', 'Its city crest has been filed almost smooth.', 'The outline of the crest is still visible.'],
  ['South market boundary lamp', 'A strip of red cloth marks a buried cable.', 'Workers left the warning, then left the work.'],
  ['South civic boundary lamp', 'The pole leans toward the square by a few degrees.', 'Still standing. Barely straight.'],
  ['Southeast boundary lamp', 'A chalk arrow points back toward the station.', 'The rain spared one useful mark.'],
  ['West avenue lamp', 'Two different crews have numbered the same pole.', 'The city cannot agree which district owns it.'],
  ['East avenue lamp', 'A tram token has been hammered into a split in the base.', 'Too damaged to spend, too deliberate to discard.'],
  ['Northwest corner lamp', 'The light catches flour dust from the bakery doors.', 'Tomorrow\'s bread is already in the air.'],
  ['Northeast corner lamp', 'A pharmacy bell wire runs past the mounting plate.', 'The night bell and the lamp share the same conduit.'],
  ['North road west lamp', 'A paper flower has been folded around the access keyhole.', 'Someone wanted the repair crew to notice it.'],
  ['North road east lamp', 'The final pole before the tunnel burns a colder white.', 'Beyond it, the railway keeps the dark.'],
]);

const MAILBOX_COPY = Object.freeze([
  ['Station mailbox', 'The collection plate says yesterday. A corner of a timetable is caught in the slot.', 'The timetable will not fit through from this side.'],
  ['Upper-road mailbox', 'Three forwarding labels overlap on the same address strip.', 'People leave. Their mail takes longer.'],
  ['West-boundary mailbox', 'The lock has been replaced, but the city crest has not.', 'New lock, old promises.'],
  ['East-boundary mailbox', 'Rain has blurred every collection time except the last one.', 'The final collection is still legible: 19:10.'],
  ['Northwest mailbox', 'A bakery order protrudes just far enough to smell of yeast.', 'Not mine to pull out.'],
  ['Northeast mailbox', 'The slot is polished by years of gloved hands.', 'Nothing addressed to Mara is visible.'],
]);

const BUILDING_COPY = Object.freeze({
  'perimeter-tenement': [
    'A tall residential block. Washing hangs from two floors, and someone is always watching the street from the third.',
    'Same windows, same curtains. The building does not remember who lived behind each one.',
  ],
  'perimeter-corner-arcade': [
    'Ground-floor shops under carved stonework. The arcade closes earlier than the street does.',
    'The upper floors are quiet. Whatever noise the arcade made has moved inside for the night.',
  ],
  'perimeter-workers-hall': [
    'A meeting hall with a brass lintel. Posters cover the locked notice board.',
    'The hall is dark, but the lintel is polished. Someone still cares for the entrance.',
  ],
  'district-bakery-tenement': [
    'Warm plaster and the smell of yeast. The bakery is below; the stairs above are narrow.',
    'No bread in the window yet. The ovens are already fed.',
  ],
  'district-pharmacy-corner': [
    'A green cross above a corner door. The night bell is the only clean thing on the facade.',
    'Closed until morning. The cross stays lit so people know where to return.',
  ],
  'district-printworks-rowhouse': [
    'Long windows and a basement hatch. The press stopped hours ago, but the building still hums.',
    'Paper pallets are stacked behind the gate. Tomorrow\'s notices are already set.',
  ],
  'landmark-civic-night-arcade': [
    'A civic arcade with shuttered stalls. The scale of it says the square used to matter more.',
    'The arches are empty now. Only the lamps prove it is still maintained.',
  ],
});

function ambientLinesFor(spec, state, repeated = false) {
  const direct = WORLD_OBJECT_COPY[spec.id];
  if (direct) return [{ speaker: 'BUTCH', text: direct[repeated ? 1 : 0] }];
  if (spec.id.includes('tram') || spec.id.includes('car')) {
    return [{ speaker: 'BUTCH', text: repeated
      ? 'Still sealed. The route plate has been removed.'
      : 'The doors are welded shut. This vehicle is not going anywhere.' }];
  }
  if (spec.id.includes('stall')) {
    return [{ speaker: 'VENDOR', text: repeated
      ? 'I already told you. Look, do not block the counter.'
      : 'Buying something, or only asking after the woman in the photograph?' }];
  }
  if (spec.id.includes('trash')) {
    return [{ speaker: 'BUTCH', text: repeated ? 'Still rubbish.' : 'Receipts, peelings, and rainwater. Nothing useful.' }];
  }
  if (spec.id === 'porter-handcart') {
    return [{ speaker: 'BUTCH', text: state.cartInspected
      ? 'The same pale stains. Oil moved on this cart, but the cart chose nothing.'
      : 'Old wheel grease, fresh pale stains, and a porter who is still nearby.' }];
  }
  return [{ speaker: 'BUTCH', text: repeated ? 'Nothing else here.' : 'Part of the city, but not part of the answer yet.' }];
}

function buildingLinesFor(spec, repeated = false) {
  const copy = BUILDING_COPY[spec.prototype] || BUILDING_COPY[spec.id];
  if (copy) return [{ speaker: 'BUTCH', text: copy[repeated ? 1 : 0] }];
  return [{ speaker: 'BUTCH', text: repeated
    ? 'The building keeps its own schedule. I am not on it.'
    : 'A city building, closed to the street. Whatever happens inside is not part of the answer yet.' }];
}

// Voice-production authority for the dynamic environment layer. These lines
// are assembled in the runtime rather than authored in the main dialogue data,
// so exporting the unique spoken variants keeps voice lock coverage auditable.
// Repeated props/buildings share recordings when speaker and text are identical.
export const CHAPTER3_AMBIENT_VOICE_LINES = Object.freeze([
  ...Object.values(WORLD_OBJECT_COPY).flatMap((copy) => copy.map((text) => ({ speaker: 'BUTCH', text }))),
  { speaker: 'BUTCH', text: 'The doors are welded shut. This vehicle is not going anywhere.' },
  { speaker: 'BUTCH', text: 'Still sealed. The route plate has been removed.' },
  { speaker: 'VENDOR', text: 'Buying something, or only asking after the woman in the photograph?' },
  { speaker: 'VENDOR', text: 'I already told you. Look, do not block the counter.' },
  { speaker: 'BUTCH', text: 'Receipts, peelings, and rainwater. Nothing useful.' },
  { speaker: 'BUTCH', text: 'Still rubbish.' },
  { speaker: 'BUTCH', text: 'Old wheel grease, fresh pale stains, and a porter who is still nearby.' },
  { speaker: 'BUTCH', text: 'The same pale stains. Oil moved on this cart, but the cart chose nothing.' },
  { speaker: 'BUTCH', text: 'Part of the city, but not part of the answer yet.' },
  { speaker: 'BUTCH', text: 'Nothing else here.' },
  ...Object.entries(BUILDING_COPY)
    .filter(([prototype]) => prototype !== 'perimeter-workers-hall')
    .map(([, copy]) => copy)
    .flatMap((copy) => copy.map((text) => ({ speaker: 'BUTCH', text }))),
  { speaker: 'VOICE BEHIND DOOR', text: 'Wrong room.' },
  { speaker: 'VOICE BEHIND DOOR', text: 'Some of us work nights. Knock softer.' },
  ...LAMP_COPY.flatMap((copy) => copy.slice(1).map((text) => ({ speaker: 'BUTCH', text }))),
  ...MAILBOX_COPY.flatMap((copy) => copy.slice(1).map((text) => ({ speaker: 'BUTCH', text }))),
]);

const COMPASS_VOICE_DIRECTIONS = Object.freeze([
  'north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest',
]);

export const CHAPTER3_DYNAMIC_VOICE_LINES = Object.freeze([
  { speaker: 'LEV', text: 'You started with the record. Good. We can check the station claim against the city now.' },
  { speaker: 'LEV', text: 'You started with the person who waited. Keep that detail separate from what the record can prove.' },
  { speaker: 'LEV', text: 'You started with the last departure. Good. We have a direction, not an explanation.' },
  { speaker: 'LEV', text: 'Look at the route, the smell, or the cleaned edge before you decide.' },
  ...COMPASS_VOICE_DIRECTIONS.flatMap((direction) => (
    Object.values(SEARCH_HINT_LINES)
      .flatMap((linesForDirection) => linesForDirection(direction))
      .filter((line) => line.speaker !== 'SYSTEM')
  )),
]);

function makeActor(scene, { name, color, position, scale = 1 }) {
  const group = new THREE.Group();
  group.name = name;
  const coat = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.38 * scale, 0.86 * scale, 5, 10),
    new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0.02 }),
  );
  coat.position.y = 0.92 * scale;
  coat.castShadow = true;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.27 * scale, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xc7a27f, roughness: 0.92 }),
  );
  head.position.y = 1.72 * scale;
  head.castShadow = true;
  group.add(coat, head);
  group.position.copy(positionFrom(position));
  scene.add(group);
  return group;
}

function makeObjectHighlight(object, color = 0x527f77) {
  const materials = [];
  object?.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    if (Array.isArray(child.material)) {
      child.material = child.material.map((material) => material.clone());
      materials.push(...child.material);
    } else {
      child.material = child.material.clone();
      materials.push(child.material);
    }
  });
  let visible = false;
  let intensity = 0.42;
  const apply = () => {
    for (const material of materials) {
      if (!material.emissive) continue;
      material.emissive.setHex(visible ? color : 0x000000);
      material.emissiveIntensity = visible ? intensity : 0;
    }
  };
  return {
    get visible() {
      return visible;
    },
    set visible(value) {
      visible = Boolean(value);
      apply();
    },
    // Breathing-highlight support: a per-frame pulse scales the emissive lift
    // without toggling visibility, so required evidence can call attention to
    // itself before the player has hovered it.
    setIntensity(value) {
      intensity = value;
      apply();
    },
  };
}

function makeDynamicObjectHighlight(object, color = 0x527f77) {
  let visible = false;
  let intensity = 0.42;
  const apply = () => {
    object?.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        if (!material.emissive) continue;
        material.emissive.setHex(visible ? color : 0x000000);
        material.emissiveIntensity = visible ? intensity : 0;
      }
    });
  };
  return {
    get visible() {
      return visible;
    },
    set visible(value) {
      visible = Boolean(value);
      apply();
    },
    setIntensity(value) {
      intensity = value;
      apply();
    },
  };
}

function setActorForegroundVisibility(object, enabled) {
  object?.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    if (child.userData.chapter3BaseRenderOrder === undefined) {
      child.userData.chapter3BaseRenderOrder = child.renderOrder;
    }
    child.renderOrder = enabled ? 30 : child.userData.chapter3BaseRenderOrder;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) {
      if (material.userData.chapter3BaseDepthTest === undefined) {
        material.userData.chapter3BaseDepthTest = material.depthTest;
      }
      const nextDepthTest = enabled ? false : material.userData.chapter3BaseDepthTest;
      if (material.depthTest === nextDepthTest) continue;
      material.depthTest = nextDepthTest;
      material.needsUpdate = true;
    }
  });
}

function makePreservingObjectHighlight(object, color = 0x527f77) {
  const materials = new Map();
  object?.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of childMaterials) {
      if (!material.emissive || materials.has(material)) continue;
      materials.set(material, {
        color: material.emissive.getHex(),
        intensity: material.emissiveIntensity,
      });
    }
  });
  let visible = false;
  return {
    get visible() {
      return visible;
    },
    set visible(value) {
      visible = Boolean(value);
      for (const [material, original] of materials) {
        material.emissive.setHex(visible ? color : original.color);
        material.emissiveIntensity = visible ? Math.max(original.intensity, 0.42) : original.intensity;
      }
    },
  };
}

function makeDarkSeam(scene, surfaceHeightAt = null) {
  const points = [
    new THREE.Vector3(3.4, 0, 11.5),
    new THREE.Vector3(4.6, 0, 10.5),
    new THREE.Vector3(5.6, 0, 9.4),
    new THREE.Vector3(6.8, 0, 8.6),
    new THREE.Vector3(8.0, 0, 7.7),
    new THREE.Vector3(8.05, 0, 6.8),
    new THREE.Vector3(9.2, 0, 6.0),
    new THREE.Vector3(10.4, 0, 5.3),
  ];

  for (const point of points) {
    const sampled = surfaceHeightAt?.(point.x, point.z);
    point.y = Number.isFinite(sampled) ? sampled : 0.73;
  }

  // The first version used a sequence of equal-width boxes and circles. From
  // the gameplay camera that read as a route-marking decal, not liquid that
  // has settled into old paving. These uneven ribbons deliberately leave the
  // stone visible, tighten through the joins, and open only where oil pooled.
  const makeOrganicRibbon = ({ name, width, material, yOffset, widthScale = 1 }) => {
    const group = new THREE.Group();
    group.name = name;
    for (let index = 0; index < points.length - 1; index += 1) {
      const start = points[index];
      const end = points[index + 1];
      const dx = end.x - start.x;
      const dz = end.z - start.z;
      const length = Math.hypot(dx, dz);
      const normalX = -dz / length;
      const normalZ = dx / length;
      const startWidth = width * (0.72 + ((index * 37) % 5) * 0.07) * widthScale;
      const endWidth = width * (0.66 + ((index * 19 + 2) % 6) * 0.065) * widthScale;
      const vertices = new Float32Array([
        start.x + normalX * startWidth, start.y + yOffset, start.z + normalZ * startWidth,
        start.x - normalX * startWidth, start.y + yOffset, start.z - normalZ * startWidth,
        end.x + normalX * endWidth, end.y + yOffset, end.z + normalZ * endWidth,
        end.x - normalX * endWidth, end.y + yOffset, end.z - normalZ * endWidth,
      ]);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      // Face upward so the evidence remains visible from the fixed elevated
      // gameplay camera. The former winding only rendered the round pools.
      geometry.setIndex([0, 2, 1, 1, 2, 3]);
      geometry.computeVertexNormals();
      const segment = new THREE.Mesh(geometry, material);
      group.add(segment);
    }
    scene.add(group);
    return group;
  };

  const spread = makeOrganicRibbon({
    name: 'opening-lamp-oil-seam-spread',
    width: 0.26,
    yOffset: 0.017,
    material: new THREE.MeshStandardMaterial({
      color: 0x503122,
      roughness: 0.3,
      metalness: 0.04,
      transparent: true,
      opacity: 0.66,
      depthWrite: false,
    }),
  });
  const stain = makeOrganicRibbon({
    name: 'opening-lamp-oil-seam',
    width: 0.115,
    yOffset: 0.024,
    material: new THREE.MeshStandardMaterial({
      color: 0x392218,
      roughness: 0.12,
      metalness: 0.02,
      envMapIntensity: 0.68,
    }),
  });
  const wetGlint = makeOrganicRibbon({
    name: 'opening-lamp-oil-seam-wet-glint',
    width: 0.035,
    yOffset: 0.03,
    material: new THREE.MeshStandardMaterial({
      color: 0xc99a63,
      roughness: 0.06,
      metalness: 0.16,
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
    }),
  });
  // A few asymmetric pools are enough to explain the material without turning
  // the entire evidence route into a decorative stripe.
  for (const [index, point] of points.entries()) {
    if ([0, 3, 5, points.length - 1].includes(index)) {
      const spill = new THREE.Mesh(
        new THREE.CircleGeometry(index === 0 ? 0.23 : 0.16, 14),
        new THREE.MeshStandardMaterial({
          color: index === 0 ? 0x26150f : 0x1b100d,
          roughness: 0.1,
          metalness: 0.06,
          transparent: true,
          opacity: 0.7,
          depthWrite: false,
        }),
      );
      spill.rotation.x = -Math.PI / 2;
      spill.scale.set(1.42, 0.58 + (index % 2) * 0.14, 1);
      spill.position.set(point.x, point.y + 0.027, point.z);
      spill.rotation.z = index * 0.47;
      stain.add(spill);
    }
  }
  spread.renderOrder = 1;
  stain.renderOrder = 2;
  wetGlint.renderOrder = 3;
  const outline = makeOrganicRibbon({
    name: 'opening-lamp-oil-seam-highlight',
    width: 0.28,
    yOffset: 0.047,
    material: new THREE.MeshBasicMaterial({ color: 0xd59b54, transparent: true, opacity: 0.82, depthWrite: false }),
  });
  outline.visible = false;
  return { spread, stain, wetGlint, outline, points };
}

function makeBottle(scene) {
  const group = new THREE.Group();
  group.name = 'opening-solvent-bottle';
  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.16, 0.5, 10),
    new THREE.MeshStandardMaterial({ color: 0x9aa9a0, roughness: 0.44, metalness: 0.08 }),
  );
  glass.position.y = 0.25;
  glass.rotation.z = Math.PI / 2.8;
  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(0.165, 0.165, 0.19, 10, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xc6b488, roughness: 0.9, side: THREE.DoubleSide }),
  );
  label.position.copy(glass.position);
  label.rotation.copy(glass.rotation);
  group.add(glass, label);
  group.position.copy(positionFrom(OPENING_POSITIONS.bottle));
  scene.add(group);
  return group;
}

function makePlazaGrooves(scene) {
  const group = new THREE.Group();
  group.name = 'opening-plaza-announcement-grooves';
  const grooveMaterial = new THREE.MeshStandardMaterial({
    color: 0x533126,
    roughness: 0.92,
    metalness: 0,
  });
  const highlightMaterial = new THREE.MeshBasicMaterial({
    color: 0x9bd6ca,
    transparent: true,
    opacity: 0.66,
  });
  const highlight = new THREE.Group();
  highlight.name = 'opening-plaza-announcement-grooves-highlight';
  const addSegment = (x, z, width, depth) => {
    const base = new THREE.Mesh(new THREE.BoxGeometry(width, 0.026, depth), grooveMaterial);
    base.position.set(x, 0, z);
    group.add(base);
    const glow = new THREE.Mesh(new THREE.BoxGeometry(width + 0.09, 0.012, depth + 0.09), highlightMaterial);
    glow.position.set(x, 0.024, z);
    highlight.add(glow);
  };
  const cellWidth = 1.25;
  const cellDepth = 1.35;
  for (const rowZ of [-1.8, 2.2]) {
    for (let index = 0; index < 8; index += 1) {
      const x = -5.25 + index * 1.5;
      addSegment(x, rowZ - cellDepth / 2, cellWidth, 0.09);
      addSegment(x, rowZ, cellWidth, 0.09);
      addSegment(x, rowZ + cellDepth / 2, cellWidth, 0.09);
      addSegment(x - cellWidth / 2, rowZ, 0.09, cellDepth);
      addSegment(x + cellWidth / 2, rowZ, 0.09, cellDepth);
    }
  }
  addSegment(-6.45, -1.8, 1.05, 0.11);
  addSegment(-6.45, 2.2, 0.58, 0.11);
  addSegment(-5.92, 2.2, 0.12, 0.11);
  group.add(highlight);
  group.position.copy(positionFrom(OPENING_POSITIONS.plazaGrooves));
  group.position.y = 0.96;
  highlight.visible = false;
  scene.add(group);
  return { group, highlight };
}

function makeCutInterface(scene) {
  const group = new THREE.Group();
  group.name = 'opening-cut-feed-interface';
  const metal = new THREE.MeshStandardMaterial({ color: 0x6f665c, roughness: 0.52, metalness: 0.48 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x302b27, roughness: 0.86 });
  const addEnd = (x, rotation) => {
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.25, 12), metal);
    line.rotation.z = Math.PI / 2;
    line.rotation.y = rotation;
    line.position.set(x, 0.12, 0);
    group.add(line);
  };
  addEnd(-0.56, -0.04);
  addEnd(0.56, 0.04);
  const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.18, 0.42), dark);
  clamp.position.set(0.12, 0.08, 0.02);
  group.add(clamp);
  const highlight = makeObjectHighlight(group);
  group.position.copy(positionFrom(OPENING_POSITIONS.cutInterface));
  group.visible = false;
  scene.add(group);
  return { group, highlight };
}

function makeGroundMessage(scene, surfaceHeightAt = null) {
  const messageGroup = new THREE.Group();
  messageGroup.name = 'chapter3-burning-ground-message';
  const fireGround = surfaceHeightAt?.(FIRE_SITE.x, FIRE_SITE.z);
  messageGroup.position.set(FIRE_SITE.x, Number.isFinite(fireGround) ? fireGround : 0.73, FIRE_SITE.z);
  messageGroup.rotation.y = 0.845;
  scene.add(messageGroup);

  const makeParticleTexture = (kind) => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    if (kind === 'flame') {
      // Small warm flame kernel: orange base, bright yellow core, transparent tip.
      const gradient = context.createLinearGradient(64, 120, 64, 8);
      gradient.addColorStop(0, 'rgba(255,62,18,0.98)');
      gradient.addColorStop(0.36, 'rgba(255,132,38,0.96)');
      gradient.addColorStop(0.72, 'rgba(255,198,86,0.84)');
      gradient.addColorStop(1, 'rgba(255,248,190,0)');
      context.fillStyle = gradient;
      context.beginPath();
      context.moveTo(64, 124);
      context.bezierCurveTo(34, 118, 26, 84, 46, 62);
      context.bezierCurveTo(54, 50, 50, 34, 64, 8);
      context.bezierCurveTo(74, 34, 82, 50, 82, 64);
      context.bezierCurveTo(102, 86, 94, 118, 64, 124);
      context.closePath();
      context.fill();
      context.globalCompositeOperation = 'lighter';
      const core = context.createRadialGradient(64, 92, 2, 64, 92, 26);
      core.addColorStop(0, 'rgba(255,250,210,0.58)');
      core.addColorStop(0.5, 'rgba(255,180,80,0.38)');
      core.addColorStop(1, 'rgba(255,80,30,0)');
      context.fillStyle = core;
      context.fillRect(32, 60, 64, 60);
    } else {
      // Warm ember spark.
      const gradient = context.createRadialGradient(64, 64, 1, 64, 64, 58);
      gradient.addColorStop(0, 'rgba(255,246,200,1)');
      gradient.addColorStop(0.28, 'rgba(255,162,58,0.86)');
      gradient.addColorStop(0.6, 'rgba(255,94,24,0.34)');
      gradient.addColorStop(1, 'rgba(255,58,15,0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, 128, 128);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  };
  const flameTexture = makeParticleTexture('flame');
  const emberTexture = makeParticleTexture('ember');

  const makeSmokeTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 60);
    gradient.addColorStop(0, 'rgba(150,150,150,0.55)');
    gradient.addColorStop(0.4, 'rgba(130,130,130,0.22)');
    gradient.addColorStop(1, 'rgba(110,110,110,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  };
  const smokeTexture = makeSmokeTexture();

  const makeFireFlipbookAtlas = () => {
    const frames = 8;
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = frames * size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    for (let frame = 0; frame < frames; frame += 1) {
      const originX = frame * size;
      context.save();
      context.translate(originX, 0);
      context.clearRect(0, 0, size, size);
      context.globalCompositeOperation = 'lighter';
      const ribbons = 4;
      for (let ribbon = 0; ribbon < ribbons; ribbon += 1) {
        const phase = (frame + ribbon * 2) / frames;
        const gradient = context.createLinearGradient(
          size * 0.5, size * 0.9, size * 0.5 + Math.sin(phase * Math.PI * 2) * 18, size * 0.1,
        );
        gradient.addColorStop(0, 'rgba(255,55,10,0)');
        gradient.addColorStop(0.25, 'rgba(255,85,22,0.55)');
        gradient.addColorStop(0.55, 'rgba(255,150,50,0.85)');
        gradient.addColorStop(0.8, 'rgba(255,210,100,0.55)');
        gradient.addColorStop(1, 'rgba(255,250,200,0)');
        context.fillStyle = gradient;
        context.beginPath();
        const baseX = size * 0.5 + Math.sin((ribbon * 3 + frame) * 0.7) * 18;
        const sway = Math.sin(frame * 0.9 + ribbon * 1.3) * 14;
        context.moveTo(baseX - 12, size * 0.88);
        context.quadraticCurveTo(baseX - 24 + sway, size * 0.52, baseX + sway * 0.5, size * 0.1);
        context.quadraticCurveTo(baseX + 24 + sway, size * 0.52, baseX + 12, size * 0.88);
        context.closePath();
        context.fill();
      }
      context.restore();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  };
  const flameAtlas = makeFireFlipbookAtlas();

  const findStrongGlyphColumns = (pixelData, canvasWidth, canvasHeight, rowOffset, worldWidth, worldDepth, count = 6) => {
    const step = 16;
    const candidates = [];
    for (let px = 0; px < canvasWidth; px += step) {
      let score = 0;
      let bottomY = -1;
      for (let py = 0; py < canvasHeight; py += 2) {
        const alpha = pixelData[(py * canvasWidth + px) * 4 + 3];
        if (alpha >= 90) {
          score += 1;
          bottomY = Math.max(bottomY, py);
        }
      }
      if (score > 0) candidates.push({ px, score, bottomY });
    }
    candidates.sort((a, b) => b.score - a.score || a.px - b.px);
    const chosen = [];
    const minSeparation = canvasWidth / 18;
    for (const candidate of candidates) {
      if (chosen.some((entry) => Math.abs(entry.px - candidate.px) < minSeparation)) continue;
      chosen.push(candidate);
      if (chosen.length === count) break;
    }
    while (chosen.length < count) {
      const px = Math.round((chosen.length + 0.5) * (canvasWidth / count));
      chosen.push({ px, score: 1, bottomY: Math.round(canvasHeight * 0.85) });
    }
    chosen.sort((a, b) => a.px - b.px);
    return chosen.map((candidate) => {
      const localX = (candidate.px / canvasWidth - 0.5) * worldWidth;
      const localZ = rowOffset + (candidate.bottomY / canvasHeight - 0.5) * worldDepth;
      return { x: localX, z: localZ };
    });
  };

  const makeLine = (text, rowOffset, color) => {
    const sourceCanvas = document.createElement('canvas');
    // Oversample the lettering. The close isometric shot turns a 2k canvas
    // soft before it turns the message into a landmark.
    sourceCanvas.width = 4096;
    sourceCanvas.height = 640;
    const context = sourceCanvas.getContext('2d');
    // Thick hand-painted oil lettering. A marker face preserves the human,
    // urgent message and gives the fire enough stroke edge to cling to.
    context.font = '400 320px "Marker Felt", "Chalkboard SE", "Comic Sans MS", cursive';
    context.textAlign = 'left';
    context.textBaseline = 'middle';
    context.fillStyle = '#ffffff';
    // No heavy shadow or stroke: the face must read as painted lettering, not a
    // bold bubble or graffiti tag. Separation from the pavement comes from the
    // dark charred gutter below.
    context.shadowColor = 'transparent';
    context.shadowBlur = 0;
    context.lineJoin = 'round';
    const tracking = 42;
    const glyphWidths = [...text].map((character) => context.measureText(character).width);
    const trackedWidth = glyphWidths.reduce((sum, width) => sum + width, 0)
      + tracking * Math.max(0, glyphWidths.length - 1);
    let glyphX = (sourceCanvas.width - trackedWidth) / 2;
    [...text].forEach((character, index) => {
      const baselineJitter = ((index * 7) % 5 - 2) * 1.2;
      if (character !== ' ') {
        context.save();
        context.translate(glyphX, sourceCanvas.height / 2 + baselineJitter);
        // A barely perceptible per-letter slant, slight compression and a
        // gentle forward shear give the line an editorial hand-painted rhythm
        // without becoming cursive or calligraphic.
        context.rotate(((index * 13) % 7 - 3) * 0.007);
        context.scale(0.94, 1);
        context.transform(1, 0, -0.045, 1, 0, 0);
        context.fillText(character, 0, 0);
        context.restore();
      }
      glyphX += glyphWidths[index] + tracking;
    });
    const pixelData = context.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height).data;
    const displayCanvas = document.createElement('canvas');
    displayCanvas.width = sourceCanvas.width;
    displayCanvas.height = sourceCanvas.height;
    const displayContext = displayCanvas.getContext('2d');
    displayContext.drawImage(sourceCanvas, 0, 0);
    const texture = new THREE.CanvasTexture(displayCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const outlineSourceCanvas = document.createElement('canvas');
    outlineSourceCanvas.width = sourceCanvas.width;
    outlineSourceCanvas.height = sourceCanvas.height;
    const outlineSourceContext = outlineSourceCanvas.getContext('2d');
    // Dark charred gutter: a thick outline that reads as burned paving and
    // gives the fire a clear ground boundary.
    const outlineRadius = 14;
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 10) {
      outlineSourceContext.drawImage(
        sourceCanvas,
        Math.cos(angle) * outlineRadius,
        Math.sin(angle) * outlineRadius,
      );
    }
    const outlineDisplayCanvas = document.createElement('canvas');
    outlineDisplayCanvas.width = sourceCanvas.width;
    outlineDisplayCanvas.height = sourceCanvas.height;
    const outlineDisplayContext = outlineDisplayCanvas.getContext('2d');
    outlineDisplayContext.drawImage(outlineSourceCanvas, 0, 0);
    const outlineTexture = new THREE.CanvasTexture(outlineDisplayCanvas);
    outlineTexture.colorSpace = THREE.SRGBColorSpace;
    const glyphWorldWidth = 11.2;
    const glyphWorldDepth = 1.32;

    // Charred gutter strip recessed into the groove.
    const charred = new THREE.Mesh(
      new THREE.PlaneGeometry(11.65, 1.68),
      new THREE.MeshBasicMaterial({
        map: outlineTexture, color: 0x14080d, transparent: true, depthWrite: false, opacity: 0.96,
      }),
    );
    charred.rotation.x = -Math.PI / 2;
    charred.position.set(0, 0.006, rowOffset);
    charred.renderOrder = 4;

    // Soft warm wash behind the line, kept very low so it never competes.
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(11.8, 1.8),
      new THREE.MeshBasicMaterial({
        map: texture, transparent: true, depthWrite: false, opacity: 0.07,
        color: 0xff4422,
        blending: THREE.AdditiveBlending,
      }),
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(0, 0.008, rowOffset);
    glow.renderOrder = 6;

    // The message itself: emissive strip inside the groove, rendered above every fire layer.
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(11.48, 1.58),
      // Evidence lettering must remain readable above the station stair lip.
      // Disable depth testing only for this authored decal, not the fire.
      new THREE.MeshBasicMaterial({ map: texture, color, transparent: true, depthTest: false, depthWrite: false, opacity: 1.0 }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(0, 0.010, rowOffset);
    mesh.renderOrder = 8;

    // A continuous but varied low fire follows the painted stroke bottoms.
    // The text remains the sharp top layer, so density reads as burning oil
    // without turning into an opaque curtain.
    const edgeFireCount = 180;
    const edgePositions = new Float32Array(edgeFireCount * 3);
    const edgeBases = new Float32Array(edgeFireCount * 3);
    const edgePhases = new Float32Array(edgeFireCount);
    const edgeCandidates = [];
    // Walk columns and find the lowest painted pixel in the full glyph mask.
    // The letters are vertically centred in this texture, so scanning only
    // the bottom 18% produced an empty particle geometry.
    for (let px = 0; px < sourceCanvas.width; px += 4) {
      let bottomY = -1;
      for (let py = sourceCanvas.height - 10; py >= 0; py -= 4) {
        if (pixelData[(py * sourceCanvas.width + px) * 4 + 3] >= 90) {
          bottomY = py;
          break;
        }
      }
      if (bottomY < 0) continue;
      edgeCandidates.push({ px, bottomY });
    }
    // Resample across the complete sentence. Stopping after the first N
    // painted columns starved the right half of each line.
    const accepted = Math.min(edgeFireCount, edgeCandidates.length);
    for (let sample = 0; sample < accepted; sample += 1) {
      const candidateIndex = Math.min(
        edgeCandidates.length - 1,
        Math.floor((sample + 0.5) * edgeCandidates.length / accepted),
      );
      const { px, bottomY } = edgeCandidates[candidateIndex];
      const index = sample * 3;
      const localX = (px / sourceCanvas.width - 0.5) * glyphWorldWidth;
      const localZ = rowOffset + (bottomY / sourceCanvas.height - 0.5) * glyphWorldDepth;
      edgePositions[index] = edgeBases[index] = localX + (Math.random() - 0.5) * 0.06;
      edgePositions[index + 1] = edgeBases[index + 1] = 0.015;
      edgePositions[index + 2] = edgeBases[index + 2] = localZ + (Math.random() - 0.5) * 0.04;
      edgePhases[sample] = (px * 0.017 + rowOffset) % 1;
    }
    const edgeGeometry = new THREE.BufferGeometry();
    edgeGeometry.setAttribute('position', new THREE.BufferAttribute(edgePositions, 3));
    edgeGeometry.setDrawRange(0, accepted);
    const flames = new THREE.Points(
      edgeGeometry,
      new THREE.PointsMaterial({
        color: 0xff7f24,
        map: flameTexture,
        alphaTest: 0.03,
        size: 0.34,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    flames.name = 'burning-letter-edge-flames';
    flames.renderOrder = 5;
    flames.userData.basePositions = edgeBases;
    flames.userData.phases = edgePhases;
    flames.userData.particleCount = accepted;

    const flameCores = flames.clone();
    flameCores.name = 'burning-letter-warm-flame-cores';
    flameCores.material = new THREE.PointsMaterial({
      color: 0xffc95c,
      map: flameTexture,
      alphaTest: 0.03,
      size: 0.19,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    flameCores.renderOrder = 5;

    const embers = flames.clone();
    embers.name = 'burning-letter-rising-embers';
    embers.material = new THREE.PointsMaterial({
      color: 0xffb84a,
      map: emberTexture,
      alphaTest: 0.02,
      size: 0.065,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    embers.renderOrder = 5;

    // Wind-driven smoke above the line.
    const smokeCount = 32;
    const smokePositions = new Float32Array(smokeCount * 3);
    const smokeBases = new Float32Array(smokeCount * 3);
    const smokePhases = new Float32Array(smokeCount);
    const smokeSpeeds = new Float32Array(smokeCount);
    for (let index = 0; index < smokeCount; index += 1) {
      const positionIndex = index * 3;
      const u = (index % 8) / 7;
      const v = Math.floor(index / 8) / 5;
      const localX = (u - 0.5) * glyphWorldWidth * 0.9 + Math.sin(index * 3.7) * 0.15;
      const localZ = rowOffset + (v - 0.5) * glyphWorldDepth * 2.2 + Math.cos(index * 2.3) * 0.12;
      smokePositions[positionIndex] = smokeBases[positionIndex] = localX;
      smokePositions[positionIndex + 1] = smokeBases[positionIndex + 1] = 0.006;
      smokePositions[positionIndex + 2] = smokeBases[positionIndex + 2] = localZ;
      smokePhases[index] = (index * 0.17 + rowOffset * 0.3) % 1;
      smokeSpeeds[index] = 0.08 + (index % 5) * 0.03;
    }
    const smokeGeometry = new THREE.BufferGeometry();
    smokeGeometry.setAttribute('position', new THREE.BufferAttribute(smokePositions, 3));
    const smoke = new THREE.Points(
      smokeGeometry,
      new THREE.PointsMaterial({
        color: 0x8a8a8a,
        map: smokeTexture,
        alphaTest: 0.02,
        size: 0.38,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
        blending: THREE.NormalBlending,
      }),
    );
    smoke.name = 'burning-letter-smoke';
    smoke.renderOrder = 4;
    smoke.userData.basePositions = smokeBases;
    smoke.userData.phases = smokePhases;
    smoke.userData.speeds = smokeSpeeds;

    // Larger flame tongues reinforce strong stroke terminals while small edge
    // kernels fill the gaps. Their phases and sizes alternate to avoid a wall.
    const flameBand = new THREE.Group();
    flameBand.name = 'burning-letter-irregular-watercolor-flame-clusters';
    const flameAnchors = findStrongGlyphColumns(
      pixelData,
      sourceCanvas.width,
      sourceCanvas.height,
      rowOffset,
      glyphWorldWidth,
      glyphWorldDepth,
      14,
    );
    flameAnchors.forEach((anchor, index) => {
      const map = flameAtlas.clone();
      map.wrapS = THREE.RepeatWrapping;
      map.repeat.set(1 / 8, 1);
      map.offset.set((index % 8) / 8, 0);
      map.needsUpdate = true;
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map,
        color: index % 2 ? 0xff9a42 : 0xffc266,
        transparent: true,
        opacity: 0.86,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }));
      sprite.position.set(anchor.x, 0.31, anchor.z);
      sprite.scale.set(0.38 + (index % 4) * 0.055, 0.64 + (index % 3) * 0.1, 1);
      sprite.renderOrder = 7;
      sprite.userData.phase = index * 1.37 + rowOffset;
      flameBand.add(sprite);
    });

    const heatHaze = new THREE.Group();
    heatHaze.name = 'burning-letter-watercolor-heat-haze';

    const selection = new THREE.Mesh(
      new THREE.PlaneGeometry(11.65, 1.68),
      new THREE.MeshBasicMaterial({
        map: texture,
        color: 0x8ed5c8,
        transparent: true,
        depthWrite: false,
        opacity: 0.52,
        blending: THREE.AdditiveBlending,
      }),
    );
    selection.rotation.x = -Math.PI / 2;
    selection.position.set(0, 0.012, rowOffset);
    selection.visible = false;
    selection.renderOrder = 9;

    messageGroup.add(charred, glow, mesh, embers, flames, flameCores, flameBand, heatHaze, smoke, selection);
    return {
      charred,
      mesh,
      glow,
      heatHaze,
      flames,
      flameCores,
      flameBand,
      embers,
      smoke,
      selection,
      worldWidth: glyphWorldWidth,
      ignitionProgress: 1,
      setReveal(progress) {
        const reveal = THREE.MathUtils.clamp(progress, 0, 1);
        this.ignitionProgress = reveal;
        displayContext.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
        outlineDisplayContext.clearRect(0, 0, outlineDisplayCanvas.width, outlineDisplayCanvas.height);
        const cropWidth = Math.max(1, Math.round(sourceCanvas.width * reveal));
        if (reveal > 0) {
          displayContext.drawImage(
            sourceCanvas,
            0, 0, cropWidth, sourceCanvas.height,
            0, 0, cropWidth, sourceCanvas.height,
          );
          outlineDisplayContext.drawImage(
            outlineSourceCanvas,
            0, 0, cropWidth, outlineSourceCanvas.height,
            0, 0, cropWidth, outlineSourceCanvas.height,
          );
        }
        texture.needsUpdate = true;
        outlineTexture.needsUpdate = true;
      },
    };
  };

  // Carved groove slab beneath both rows. The text faces read as emissive strips
  // just inside the recess, not planes floating above the ground.
  const grooveSlab = new THREE.Mesh(
    new THREE.BoxGeometry(12.3, 0.04, 4.5),
    new THREE.MeshBasicMaterial({ color: 0x050205, transparent: true, opacity: 0.12, depthWrite: false }),
  );
  grooveSlab.name = 'burning-message-groove-slab';
  // Keep the backing below the paving plane. The previous top face sat above
  // the lettering and turned the evidence into two opaque black rectangles.
  grooveSlab.position.set(0, -0.045, 1.45);
  messageGroup.add(grooveSlab);

  // Compose both lines beneath the dialogue panel in screen space. With this
  // fixed isometric camera, increasing local Z moves the second line down the
  // frame instead of hiding it behind the panel and the northern plinth.
  const firstEffect = makeLine("BUTCH, I'M ALIVE.", 0.25, '#9e160f');
  const secondEffect = makeLine('I LEFT BY CHOICE.', 2.35, '#b31b12');
  const highlight = {
    get visible() {
      return firstEffect.selection.visible || secondEffect.selection.visible;
    },
    set visible(value) {
      firstEffect.selection.visible = Boolean(value);
      secondEffect.selection.visible = Boolean(value);
    },
  };
  const firstLight = new THREE.PointLight(0xff6b2d, 17, 11, 1.6);
  firstLight.position.set(0, 0.35, 0.25);
  const secondLight = new THREE.PointLight(0xff8a35, 17, 11, 1.6);
  secondLight.position.set(0, 0.35, 2.35);
  messageGroup.add(firstLight, secondLight);
  messageGroup.updateMatrixWorld(true);
  const interfacePosition = messageGroup.localToWorld(new THREE.Vector3(-6.05, 0.08, 2.35));
  const setEffectVisible = (effect, visible) => {
    effect.setReveal(visible ? 1 : 0);
    effect.charred.visible = visible;
    effect.mesh.visible = visible;
    effect.glow.visible = visible;
    effect.heatHaze.visible = visible;
    effect.flames.visible = visible;
    effect.flameCores.visible = visible;
    effect.flameBand.visible = visible;
    effect.embers.visible = visible;
    effect.smoke.visible = visible;
  };
  const api = {
    first: firstEffect.mesh,
    second: secondEffect.mesh,
    firstEffect,
    secondEffect,
    firstLight,
    secondLight,
    fireLights: [firstLight, secondLight],
    highlight,
    group: messageGroup,
    interfacePosition,
    position: new THREE.Vector3(FIRE_SITE.x, messageGroup.position.y + 0.03, FIRE_SITE.z),
    setFirstBurning(visible) {
      if (visible) messageGroup.visible = true;
      setEffectVisible(firstEffect, visible);
      firstLight.visible = visible;
    },
    setSecondBurning(visible) {
      if (visible) messageGroup.visible = true;
      setEffectVisible(secondEffect, visible);
      secondLight.visible = visible;
    },
    setSecondIgnitionProgress(progress) {
      const reveal = THREE.MathUtils.clamp(progress, 0, 1);
      secondEffect.setReveal(reveal);
      secondEffect.mesh.visible = reveal > 0;
      secondEffect.charred.visible = reveal > 0;
      secondEffect.glow.visible = reveal > 0;
      secondEffect.heatHaze.visible = reveal > 0;
      secondEffect.flames.visible = reveal > 0;
      secondEffect.flameCores.visible = reveal > 0;
      secondEffect.flameBand.visible = reveal > 0;
      secondEffect.embers.visible = reveal > 0;
      secondEffect.smoke.visible = reveal > 0;
      secondLight.visible = reveal > 0;
      secondLight.intensity = 17 * reveal;
    },
    setBurnedOut() {
      // Morning investigation needs the charred stone letters, but they must
      // not exist as a black slab during the opening market investigation.
      messageGroup.visible = true;
      firstEffect.flames.visible = false;
      firstEffect.flameCores.visible = false;
      firstEffect.flameBand.visible = false;
      firstEffect.heatHaze.visible = false;
      firstEffect.embers.visible = false;
      firstEffect.smoke.visible = false;
      firstEffect.glow.visible = false;
      secondEffect.flames.visible = false;
      secondEffect.flameCores.visible = false;
      secondEffect.flameBand.visible = false;
      secondEffect.heatHaze.visible = false;
      secondEffect.embers.visible = false;
      secondEffect.smoke.visible = false;
      secondEffect.glow.visible = false;
      firstLight.visible = false;
      secondLight.visible = false;
      firstEffect.mesh.material.color.setHex(0x2f1d18);
      secondEffect.mesh.material.color.setHex(0x2f1d18);
      firstEffect.mesh.material.opacity = 0.74;
      secondEffect.mesh.material.opacity = 0.74;
    },
  };
  messageGroup.visible = false;
  api.setFirstBurning(false);
  api.setSecondBurning(false);
  return api;
}

function makeFinalTrainDoor(scene) {
  const group = new THREE.Group();
  group.name = 'chapter3-doorless-carriage-and-single-door-placeholder';
  // The replacement carriage root sits on the rail centreline. The old root
  // used the side-door coordinate as the carriage centre, leaving the train
  // visibly beside the rails while the passengers stood on them.
  group.position.set(-13.7, 0, 34.0);
  group.rotation.y = THREE.MathUtils.degToRad(55);
  const shellMaterial = new THREE.MeshStandardMaterial({ color: 0x3d4544, roughness: 0.68, metalness: 0.34 });
  const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x8d5a3c, roughness: 0.52, metalness: 0.48 });
  const shell = new THREE.Group();
  shell.name = 'chapter3-doorless-carriage-shell-placeholder';
  const frameTop = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.34, 0.42), shellMaterial);
  frameTop.position.y = 1.42;
  const frameLeft = new THREE.Mesh(new THREE.BoxGeometry(0.34, 2.55, 0.42), shellMaterial);
  frameLeft.position.set(-1.2, 0.02, 0);
  const frameRight = frameLeft.clone();
  frameRight.position.x = 1.2;
  shell.add(frameTop, frameLeft, frameRight);
  const door = new THREE.Group();
  door.name = 'chapter3-single-moving-carriage-door';
  door.position.set(1.05, 0, 0);
  door.rotation.y = -Math.PI * 0.48;
  const doorFallback = new THREE.Mesh(new THREE.BoxGeometry(1.95, 2.45, 0.3), doorMaterial);
  doorFallback.name = 'chapter3-single-moving-carriage-door-placeholder';
  doorFallback.position.set(-1.05, 1.22, 0);
  door.add(doorFallback);
  group.add(shell, door);
  group.visible = false;
  scene.add(group);
  return { group, shell, door, doorFallback };
}

function samplePolyline(points, progress) {
  const lengths = [];
  let total = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const length = points[index].distanceTo(points[index + 1]);
    lengths.push(length);
    total += length;
  }
  let remaining = THREE.MathUtils.clamp(progress, 0, 1) * total;
  for (let index = 0; index < lengths.length; index += 1) {
    if (remaining <= lengths[index] || index === lengths.length - 1) {
      return points[index].clone().lerp(points[index + 1], lengths[index] ? remaining / lengths[index] : 0);
    }
    remaining -= lengths[index];
  }
  return points.at(-1).clone();
}

function makeSunriseOverlook(scene, _existingBench = null) {
  const group = new THREE.Group();
  group.name = 'chapter3-tunnel-sunrise-overlook';
  const stairGreybox = new THREE.Group();
  stairGreybox.name = 'chapter3-sunrise-timber-boardwalk';
  group.add(stairGreybox);
  const weatheredWood = new THREE.MeshStandardMaterial({ color: 0x5b3b27, roughness: 0.94 });
  const darkWood = new THREE.MeshStandardMaterial({ color: 0x2f241d, roughness: 0.98 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x242827, roughness: 0.8, metalness: 0.22 });
  const stone = new THREE.MeshStandardMaterial({ color: 0x786b5b, roughness: 0.98 });
  const wood = weatheredWood;
  const boardwalkPoints = SUNRISE_ROUTE_POINTS.map(positionFrom);

  for (let segmentIndex = 0; segmentIndex < boardwalkPoints.length - 1; segmentIndex += 1) {
    const start = boardwalkPoints[segmentIndex];
    const end = boardwalkPoints[segmentIndex + 1];
    const delta = end.clone().sub(start);
    const length = delta.length();
    const direction = delta.clone().normalize();
    const yaw = Math.atan2(delta.x, delta.z);
    const outerSide = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)).multiplyScalar(1.05);
    const plankCount = Math.max(5, Math.ceil(length / 0.42));

    // Narrow transverse boards form a continuous sloped service walk that
    // climbs back toward the tunnel rock, rather than projecting over the plaza.
    for (let plankIndex = 0; plankIndex < plankCount; plankIndex += 1) {
      const amount = (plankIndex + 0.5) / plankCount;
      const plank = new THREE.Mesh(
        new THREE.BoxGeometry(2.08, 0.14, Math.max(0.31, length / plankCount - 0.035)),
        weatheredWood,
      );
      plank.position.lerpVectors(start, end, amount).add(new THREE.Vector3(0, -0.1, 0));
      plank.rotation.y = yaw;
      plank.castShadow = plank.receiveShadow = true;
      stairGreybox.add(plank);
    }

    const underBeam = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, length + 0.18), darkWood);
    underBeam.position.copy(start).lerp(end, 0.5).add(outerSide.clone().multiplyScalar(0.62));
    underBeam.position.y -= 0.28;
    underBeam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
    underBeam.castShadow = true;
    stairGreybox.add(underBeam);

    const postCount = Math.max(2, Math.ceil(length / 1.65));
    const railPoints = [];
    for (let postIndex = 0; postIndex <= postCount; postIndex += 1) {
      const amount = postIndex / postCount;
      const centre = start.clone().lerp(end, amount).add(outerSide);
      railPoints.push(centre.clone().add(new THREE.Vector3(0, 0.78, 0)));
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 1.0, 8), darkWood);
      post.position.copy(centre).add(new THREE.Vector3(0, 0.35, 0));
      post.castShadow = true;
      stairGreybox.add(post);

      // Cantilever braces reach down and inward, visually tying the boardwalk
      // to the cliff instead of leaving it as a floating flight.
      if (postIndex % 2 === 0) {
        const braceStart = centre.clone().add(new THREE.Vector3(0, -0.12, 0));
        const braceEnd = centre.clone().add(outerSide.clone().multiplyScalar(-1.55)).add(new THREE.Vector3(0, -1.05, 0));
        const braceDelta = braceEnd.clone().sub(braceStart);
        const brace = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, braceDelta.length(), 7), darkWood);
        brace.position.copy(braceStart).lerp(braceEnd, 0.5);
        brace.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), braceDelta.clone().normalize());
        brace.castShadow = true;
        stairGreybox.add(brace);

        // Short pins disappear into the bank and make the flight read as a
        // rock-mounted inspection walk, never as a street-level trestle.
        const anchorTop = centre.clone().add(outerSide.clone().multiplyScalar(-1.45));
        const anchor = new THREE.Mesh(
          new THREE.CylinderGeometry(0.065, 0.085, 0.72, 7),
          darkWood,
        );
        anchor.position.copy(anchorTop).add(new THREE.Vector3(0, -0.5, 0));
        anchor.castShadow = true;
        stairGreybox.add(anchor);
      }
    }
    const railCurve = new THREE.CatmullRomCurve3(railPoints);
    const rail = new THREE.Mesh(new THREE.TubeGeometry(railCurve, postCount * 3, 0.055, 7, false), darkWood);
    rail.castShadow = true;
    stairGreybox.add(rail);

    // A small landing makes every change of direction believable and keeps the
    // animated route centred on visible timber rather than empty space.
    if (segmentIndex < boardwalkPoints.length - 2) {
      const landing = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.16, 1.55), weatheredWood);
      landing.position.copy(end).add(new THREE.Vector3(0, -0.11, 0));
      landing.rotation.y = yaw;
      landing.castShadow = landing.receiveShadow = true;
      stairGreybox.add(landing);
    }
  }

  // The authored walk ends at the open edge of the generated platform. Keep
  // that edge distinct from the deck centre: using one point for both made the
  // last flight disappear underneath the platform and let the actors land in
  // its rail/rock dressing.
  const platformEntrance = boardwalkPoints.at(-1).clone();
  const platformForward = platformEntrance.clone()
    .sub(boardwalkPoints.at(-2))
    .setY(0)
    .normalize();
  const summit = platformEntrance.clone().add(platformForward.clone().multiplyScalar(1.72));
  const points = [...boardwalkPoints, summit.clone()];

  // Bridge the final flight across the generated platform's open lip. This is
  // deliberately a separate, level connector: the sloped route used to end
  // under the thick PBR deck, leaving an apparent gap and hiding the actors'
  // bodies as they crossed onto it.
  const topConnector = new THREE.Group();
  topConnector.name = 'chapter3-sunrise-platform-connector';
  const connectorLength = 2.35;
  const connectorStart = platformEntrance.clone().add(platformForward.clone().multiplyScalar(-0.34));
  const connectorEnd = connectorStart.clone().add(platformForward.clone().multiplyScalar(connectorLength));
  const connectorYaw = Math.atan2(platformForward.x, platformForward.z);
  const connectorPlankCount = 8;
  for (let index = 0; index < connectorPlankCount; index += 1) {
    const amount = (index + 0.5) / connectorPlankCount;
    const plank = new THREE.Mesh(
      new THREE.BoxGeometry(1.92, 0.15, connectorLength / connectorPlankCount - 0.025),
      weatheredWood,
    );
    plank.position.lerpVectors(connectorStart, connectorEnd, amount);
    plank.position.y -= 0.08;
    plank.rotation.y = connectorYaw;
    plank.castShadow = plank.receiveShadow = true;
    topConnector.add(plank);
  }
  group.add(topConnector);
  const platformShape = new THREE.Shape();
  platformShape.moveTo(-2.4, -1.35);
  platformShape.lineTo(2.4, -1.35);
  platformShape.lineTo(2.2, 0.55);
  platformShape.lineTo(1.35, 1.7);
  platformShape.lineTo(-1.35, 1.7);
  platformShape.lineTo(-2.2, 0.55);
  platformShape.closePath();
  const platformGeometry = new THREE.ExtrudeGeometry(platformShape, {
    depth: 0.3,
    bevelEnabled: false,
    steps: 1,
  });
  platformGeometry.rotateX(Math.PI / 2);
  const platform = new THREE.Mesh(platformGeometry, darkWood);
  platform.name = 'chapter3-sunrise-overlook-platform-placeholder';
  platform.position.set(summit.x, summit.y - 0.06, summit.z);
  platform.rotation.y = THREE.MathUtils.degToRad(16);
  platform.castShadow = platform.receiveShadow = true;
  group.add(platform);
  const platformSupports = [];
  for (const [supportX, supportZ] of [[-1.65, -1.15], [1.65, -1.15], [-1.65, 1.15], [1.65, 1.15]]) {
    const support = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.14, 0.9, 8),
      darkWood,
    );
    const offset = new THREE.Vector3(supportX, 0, supportZ)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), platform.rotation.y);
    support.position.set(summit.x + offset.x, summit.y - 0.72, summit.z + offset.z);
    support.castShadow = true;
    group.add(support);
    platformSupports.push(support);
  }

  const platformModel = new THREE.Group();
  platformModel.name = 'chapter3-sunrise-overlook-platform-hunyuan';
  platformModel.position.copy(summit);
  group.add(platformModel);
  new GLTFLoader().load(
    '/assets/chapter03-3d/models/ch03_cliff_overlook_platform.glb',
    (gltf) => {
      const model = gltf.scene;
      model.rotation.y = THREE.MathUtils.degToRad(16);
      model.updateMatrixWorld(true);
      const initialBounds = new THREE.Box3().setFromObject(model);
      const initialSize = initialBounds.getSize(new THREE.Vector3());
      const footprint = Math.max(initialSize.x, initialSize.z);
      if (footprint <= 0) return;
      model.scale.setScalar(5.9 / footprint);
      model.updateMatrixWorld(true);
      const fittedBounds = new THREE.Box3().setFromObject(model);
      const fittedSize = fittedBounds.getSize(new THREE.Vector3());
      const fittedCenter = fittedBounds.getCenter(new THREE.Vector3());
      // The generated model includes a shallow rock-mounted substructure.
      // Sink that substructure into the authored cliff while keeping the deck
      // surface level with the final boardwalk point and its front edge open.
      // The walkable deck sits above the trimmed mounting lip. Aligning only
      // 18% of the model height treated the lip as the floor and left the real
      // boards visibly above the incoming walk. The 32% cross-section matches
      // the deck surface in the trimmed runtime mesh.
      const deckY = fittedBounds.min.y + fittedSize.y * 0.32;
      model.position.set(-fittedCenter.x, -deckY + 0.02, -fittedCenter.z);
      model.traverse((child) => {
        if (!child.isMesh) return;
        child.castShadow = true;
        child.receiveShadow = true;
      });
      platformModel.add(model);
      platform.visible = false;
      platformSupports.forEach((support) => { support.visible = false; });
    },
    undefined,
    () => {},
  );

  const bench = new THREE.Group();
  bench.name = 'chapter3-sunrise-overlook-bench';
  const benchFallback = new THREE.Group();
  benchFallback.name = 'chapter3-sunrise-bench-fallback';
  const benchWood = new THREE.MeshStandardMaterial({
    color: 0xb97948,
    emissive: 0x241006,
    emissiveIntensity: 0.12,
    roughness: 0.9,
  });
  const addBenchPart = (size, position, material) => {
    const part = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    part.position.set(...position);
    part.castShadow = part.receiveShadow = true;
    benchFallback.add(part);
  };
  addBenchPart([3.0, 0.2, 0.78], [0, 0.72, 0], benchWood);
  addBenchPart([3.0, 0.22, 0.18], [0, 1.48, 0.42], benchWood);
  for (const x of [-1.18, -0.4, 0.4, 1.18]) {
    addBenchPart([0.12, 0.76, 0.12], [x, 1.12, 0.4], benchWood);
  }
  for (const x of [-1.12, 1.12]) {
    addBenchPart([0.16, 0.76, 0.16], [x, 0.31, 0], iron);
  }
  bench.add(benchFallback);

  // Load a dedicated copy. Cloning the city bench here used to clone its empty
  // pre-load shell, so the overlook copy stayed empty forever even after the
  // original asset finished loading.
  new GLTFLoader().load(
    '/assets/chapter03-3d/models/ch03_fountain_bench.glb',
    (gltf) => {
      const model = gltf.scene;
      model.updateMatrixWorld(true);
      const initialBounds = new THREE.Box3().setFromObject(model);
      const initialSize = initialBounds.getSize(new THREE.Vector3());
      const footprint = Math.max(initialSize.x, initialSize.z);
      if (footprint <= 0) return;
      model.scale.setScalar(3.05 / footprint);
      model.updateMatrixWorld(true);
      const fittedBounds = new THREE.Box3().setFromObject(model);
      const fittedCenter = fittedBounds.getCenter(new THREE.Vector3());
      model.position.set(-fittedCenter.x, -fittedBounds.min.y, -fittedCenter.z);
      model.traverse((child) => {
        if (!child.isMesh) return;
        child.castShadow = true;
        child.receiveShadow = true;
      });
      bench.add(model);
      // Keep the authored silhouette underneath the decorative asset. It is
      // the guaranteed readable/clickable bench shape if the dark PBR model
      // loses contrast against the equally dark platform at dawn.
    },
    undefined,
    () => {},
  );
  // Sit the reused city bench clearly above the generated deck. The prior
  // placeholder height put its feet inside the PBR platform and made it read as
  // missing from the fixed top-down camera.
  bench.position.copy(summit).add(platformForward.clone().multiplyScalar(0.28));
  bench.position.y += 0.12;
  // The reusable bench asset's back is local +Z. The first pass used the
  // asset's decorative yaw without accounting for that, so the backrest sat
  // between the characters and the dawn. Flip it toward the overlook view.
  bench.rotation.y = THREE.MathUtils.degToRad(52 + 180);
  group.add(bench);

  // A small top-of-walk marker gives the descent its own click target instead
  // of overloading the bench after the sunrise conversation.
  const summitReturnMarker = new THREE.Group();
  summitReturnMarker.name = 'chapter3-sunrise-return-marker';
  const returnPost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 0.78, 8), iron);
  returnPost.position.y = 0.39;
  const returnCap = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 7), weatheredWood);
  returnCap.position.y = 0.82;
  summitReturnMarker.add(returnPost, returnCap);
  summitReturnMarker.position.copy(platformEntrance).add(new THREE.Vector3(0, 0.04, 0));
  group.add(summitReturnMarker);

  const trailMarker = new THREE.Group();
  trailMarker.name = 'chapter3-sunrise-trailhead-marker';
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.45, 8), iron);
  post.position.y = 0.72;
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.48, 0.08), stone);
  plate.position.set(0, 1.28, 0);
  trailMarker.add(post, plate);
  trailMarker.position.copy(boardwalkPoints[0]);
  group.add(trailMarker);
  const trailLamp = new THREE.PointLight(0xffc37a, 15, 10, 1.8);
  trailLamp.position.copy(boardwalkPoints[0]).add(new THREE.Vector3(0, 2.0, 0));
  group.add(trailLamp);
  const trailApron = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 2.5), weatheredWood);
  trailApron.position.copy(boardwalkPoints[0]).add(new THREE.Vector3(0, -0.42, 0));
  trailApron.rotation.y = THREE.MathUtils.degToRad(-43);
  trailApron.receiveShadow = true;
  group.add(trailApron);

  scene.add(group);
  return {
    group,
    stairGreybox,
    points,
    trailMarker,
    trailOutline: makeObjectHighlight(trailMarker),
    bench,
    benchOutline: makeDynamicObjectHighlight(bench),
    summitReturnMarker,
    summitReturnOutline: makeObjectHighlight(topConnector),
    topConnector,
    platformEntrance,
    summit,
    platformModel,
  };
}

function makeCampfireKettle(scene) {
  const group = new THREE.Group();
  group.name = 'chapter3-campfire-shared-kettle';
  const iron = new THREE.MeshStandardMaterial({ color: 0x272421, roughness: 0.8, metalness: 0.46 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 10), iron);
  body.scale.y = 0.72;
  body.position.y = 0.24;
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.06, 12), iron);
  lid.position.y = 0.43;
  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(0.25, 0.025, 6, 16, Math.PI),
    iron,
  );
  handle.position.y = 0.37;
  handle.rotation.x = Math.PI / 2;
  group.add(body, lid, handle);
  group.position.set(-51.75, 0.58, 34.45);
  scene.add(group);
  return group;
}

function makeLampOilStall(scene) {
  const group = new THREE.Group();
  group.name = 'opening-eda-lamp-oil-stall';
  const wood = new THREE.MeshStandardMaterial({ color: 0x4a3022, roughness: 0.88 });
  const paintedWood = new THREE.MeshStandardMaterial({ color: 0x233e49, roughness: 0.82 });
  const canvas = new THREE.MeshStandardMaterial({ color: 0x315f70, roughness: 0.94, side: THREE.DoubleSide });
  const brass = new THREE.MeshStandardMaterial({ color: 0x8b6537, roughness: 0.46, metalness: 0.48 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x8fa09a, roughness: 0.3, metalness: 0.12 });
  const addBox = (size, position, material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  addBox([3.6, 0.12, 2.25], [0, 2.5, 0], canvas);
  addBox([3.15, 0.22, 0.82], [0, 0.92, 0.72], wood);
  addBox([3.2, 0.12, 0.44], [0, 1.66, -0.72], paintedWood);
  for (const x of [-1.55, 1.55]) {
    for (const z of [-0.82, 0.82]) addBox([0.1, 2.5, 0.1], [x, 1.25, z], paintedWood);
  }
  for (const [x, y, z] of [[-1.08, 1.18, 0.6], [-0.45, 1.2, 0.6], [0.55, 1.19, 0.6]]) {
    const canister = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.48, 12), brass);
    canister.position.set(x, y, z);
    canister.castShadow = true;
    group.add(canister);
  }
  for (const x of [-0.9, -0.3, 0.3, 0.9]) {
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.36, 10), glass);
    bottle.position.set(x, 1.9, -0.7);
    group.add(bottle);
  }
  const sign = addBox([1.9, 0.6, 0.1], [0, 2.05, 0.86], paintedWood);
  sign.rotation.x = -0.08;
  const lampMark = new THREE.Mesh(
    new THREE.CircleGeometry(0.18, 18),
    new THREE.MeshBasicMaterial({ color: 0xe1b55f, side: THREE.DoubleSide }),
  );
  lampMark.position.set(0, 2.05, 0.92);
  group.add(lampMark);
  group.position.copy(positionFrom(OPENING_POSITIONS.lampOilStall));
  group.rotation.y = -0.08;
  scene.add(group);
  return group;
}

function arrivalCallback(approach) {
  if (approach === 'pattern') {
    return { speaker: 'LEV', text: 'You started with the record. Good. We can check the station claim against the city now.' };
  }
  if (approach === 'tenderness') {
    return { speaker: 'LEV', text: 'You started with the person who waited. Keep that detail separate from what the record can prove.' };
  }
  return { speaker: 'LEV', text: 'You started with the last departure. Good. We have a direction, not an explanation.' };
}

export class Chapter3OpeningRuntime {
  constructor({ preview, model, elements }) {
    this.preview = preview;
    this.model = model;
    this.elements = elements;
    this.dialogue = new Chapter3DialogueController(elements.dialogue);
    this.timeVisual = new Chapter3TimeVisualController(preview);
    this.flipClock = new Chapter3FlipClock(elements.flipClockElement);
    this.evidenceViewer = new Chapter3EvidenceViewer(elements.evidenceViewer);
    this.initialized = false;
    this.hoveredId = null;
    this.tabHeld = false;
    this.pointerClient = { x: 0, y: 0 };
    this.interactions = [];
    this.departureElapsed = null;
    this.departureBases = [];
    this.guideElapsed = null;
    this.guidedWalkActive = false;
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
    this.archiveTransitioning = false;
    this.archiveExteriorVisibility = [];
    this.insideHotel = false;
    this.hotelArea = null;
    this.hotelTransitioning = false;
    this.hotelExteriorVisibility = [];
    this.musicCue = null;
    this.postOlekScoreReady = this.model.snapshot().marketLeadComplete;
    this.postOlekScoreTransitionElapsed = null;
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
    this.nightFireZoomBefore = null;
    this.endingElapsed = null;
    this.endingDepartureBases = null;
    this.endingMusicReleased = false;
    this.chapterExitStarted = false;
    this.savaBoundarySeen = false;
    this.levTopics = new Set();
    this.seamTestingAsked = false;
    this.vendorSpoken = new Set();
    this.campfireSpoken = new Set();
    this.ambientUseCounts = new Map();
    this.lastObjectivePeriod = null;
    this.morningLevGreetingShown = false;
    this.morningLevFollowing = false;
    this.morningLevMovedThisFrame = false;
    this.archiveLevMovedThisFrame = false;
    this.hotelLevMovedThisFrame = false;
    this.morningLevFollowTime = 0;
    this.morningLevTrail = [];
    this.morningLevLastDirection = new THREE.Vector3(1, 0, 0);
    // Daytime search guidance: Lev keeps pace with Butch during the free
    // search legs and speaks a directional hint after three real minutes.
    this.autoLevFollow = false;
    this.searchHintPhase = null;
    this.searchHintElapsed = 0;
    this.searchHintLastShownAt = -Infinity;
    this.ambientAnimElapsed = 0;
    this.ambientLifeElapsed = 0;
    this.ambientLifeRoutes = null;
    this.activeNpcConversationId = null;
    this.activeNpcConversationIds = new Set();
    this.butchActionOverride = null;
    this.butchBedPoseActive = false;
    this.endingDoorSlamPlayed = false;
    this.endingHornPlayed = false;
    this.morningFireInterruptionShown = false;
    this.taskBubbleElapsed = null;
    this.ambientElapsed = 0;
    this.overlookTravelElapsed = null;
    this.overlookTravelMode = null;
    this.overlookTravelDuration = 0;
    this.sunriseElapsed = null;
    this.sunriseTableauHoldElapsed = null;
    this.sunriseDialogueShown = false;
    this.sunriseCameraStartZoom = null;
    this.characters = new Chapter3AnimatedCharacterSystem({
      groundHeightAt: (x, z) => this.preview.surfaceHeightAt(x, z),
    });
    this.replacements = new Chapter3ReplacementAssetSystem();
    this.characterQa = new URLSearchParams(window.location.search).get('playtest') === 'chapter3-characters';
    this.alleyQa = new URLSearchParams(window.location.search).get('playtest') === 'chapter3-alley';
    this.npcLifeQa = new URLSearchParams(window.location.search).get('playtest') === 'chapter3-npc-life';
    this.magicStoneQa = new URLSearchParams(window.location.search).get('playtest') === 'chapter3-magic-stone';
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

  async loadAnimatedCharacters() {
    const attachments = [
      { id: 'butch', assetId: 'butch', host: this.preview.player },
      { id: 'lev', assetId: 'lev', host: this.lev },
      { id: 'eda', assetId: 'femaleMarket', host: this.eda },
      { id: 'olek', assetId: 'maleLabor', host: this.olek },
      { id: 'toma', assetId: 'maleMunicipal', host: this.toma },
      { id: 'flower-vendor', assetId: 'femaleCivilian', host: this.flowerVendor },
      { id: 'morning-nika', assetId: 'femaleCivic', host: this.morningNika },
      // The same six NPC bases also replace the most direct named-role
      // capsules. Source GLBs are cached, so these do not repeat downloads.
      { id: 'sava', assetId: 'maleMunicipal', host: this.ministryHall.sava },
      { id: 'nika', assetId: 'femaleCivic', host: this.ministryHall.nika },
      { id: 'petar', assetId: 'maleLabor', host: this.archiveHall.petar },
      { id: 'mila', assetId: 'femaleCivic', host: this.archiveHall.mila },
      { id: 'hana', assetId: 'femaleCivilian', host: this.hotelHall.hana },
      { id: 'irena', assetId: 'femaleCivilian', host: this.hotelHall.irena },
      { id: 'produce-vendor', assetId: 'femaleMarket', host: this.produceVendor },
      { id: 'square-bosko', assetId: 'maleLabor', host: this.squareBosko },
      { id: 'archive-mila-exterior', assetId: 'femaleCivic', host: this.archiveMilaExterior },
      // These shared-rig bodies keep a safe animated fallback. The two visible
      // alley figures are replaced below by the actual posed Chapter 5 Echo
      // City Pavel / recovery-agent meshes.
      { id: 'alley-gangster-a', assetId: 'maleLabor', host: this.alleyGangsterA },
      { id: 'alley-gangster-b', assetId: 'maleMunicipal', host: this.alleyGangsterB },
      { id: 'alley-resident', assetId: 'femaleCivilian', host: this.alleyResident },
      { id: 'campfire-rada', assetId: 'femaleCivic', host: this.campfireRada },
      { id: 'campfire-miro', assetId: 'maleLabor', host: this.campfireMiro },
      { id: 'campfire-seline', assetId: 'femaleMarket', host: this.campfireSeline },
      { id: 'ministry-bosko', assetId: 'maleMunicipal', host: this.ministryHall.bosko },
      { id: 'archive-ana', assetId: 'femaleCivilian', host: this.archiveHall.ana },
      { id: 'vesna', assetId: 'femaleCivic', host: this.hotelHall.vesna },
      { id: 'daro', assetId: 'maleLabor', host: this.hotelHall.daro },
    ];
    if (this.preview.loadingLabel) this.preview.loadingLabel.textContent = 'RIGGING ECHO CITY CAST';
    if (this.preview.loadingCount) this.preview.loadingCount.textContent = `0 / ${attachments.length}`;
    let completed = 0;
    await Promise.all(attachments.map(async (spec) => {
      await this.characters.attach(spec);
      completed += 1;
      if (this.preview.loadingCount) this.preview.loadingCount.textContent = `${completed} / ${attachments.length}`;
    }));
    await this.loadImportedAlleyCharacters();
    // Visibility changes on the host group must never resurrect the capsule
    // children after a successful model install. Keep only the installed rig
    // (or the two deliberate imported alley meshes) visible for every role.
    for (const spec of attachments) {
      const installed = this.characters.get(spec.id);
      if (!installed?.loaded) continue;
      for (const child of spec.host.children) {
        const isInstalledVisual = child === installed.visual
          || child.userData?.characterAsset === spec.id;
        if (!isInstalledVisual) child.visible = false;
      }
    }
    const failed = this.characters.state().filter((entry) => !entry.loaded).length;
    if (this.preview.loadingLabel) this.preview.loadingLabel.textContent = failed ? 'CHARACTER FALLBACKS ACTIVE' : 'CHARACTERS READY';
  }

  async loadImportedAlleyCharacters() {
    const loader = new GLTFLoader();
    const imports = [
      {
        id: 'alley-gangster-a',
        host: this.alleyGangsterA,
        file: '/assets/chapter03-3d/characters/pavel_drunk_static.glb',
        name: 'pavel-drunk-imported-visual',
        height: 1.92,
      },
      {
        id: 'alley-gangster-b',
        host: this.alleyGangsterB,
        file: '/assets/chapter03-3d/characters/recovery_gangster_static.glb',
        name: 'recovery-gangster-imported-visual',
        height: 1.98,
      },
    ];

    await Promise.all(imports.map(async (spec) => {
      try {
        const gltf = await loader.loadAsync(spec.file);
        const root = gltf.scene;
        root.name = spec.name;
        root.userData.characterAsset = spec.id;
        root.updateMatrixWorld(true);
        const initialBounds = new THREE.Box3().setFromObject(root);
        const initialHeight = initialBounds.getSize(new THREE.Vector3()).y;
        if (!Number.isFinite(initialHeight) || initialHeight <= 0.01) throw new Error('Imported alley character has invalid bounds');
        root.scale.setScalar(spec.height / initialHeight);
        root.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(root);
        const center = bounds.getCenter(new THREE.Vector3());
        const hostWorld = spec.host.getWorldPosition(new THREE.Vector3());
        const ground = this.preview.surfaceHeightAt(hostWorld.x, hostWorld.z);
        root.position.set(
          -center.x,
          -bounds.min.y + (Number.isFinite(ground) ? ground - hostWorld.y : -0.49),
          -center.z,
        );
        root.traverse((child) => {
          if (!child.isMesh) return;
          child.castShadow = true;
          child.receiveShadow = true;
          child.frustumCulled = false;
        });
        spec.host.add(root);
        const sharedFallback = this.characters.get(spec.id)?.visual;
        if (sharedFallback) sharedFallback.visible = false;
      } catch (error) {
        console.warn(`Imported Echo City alley character ${spec.id} unavailable; keeping shared-rig fallback`, error);
      }
    }));
  }

  async loadReplacementAssets() {
    const worldAnchor = (name, position, rotationY = 0) => {
      const anchor = new THREE.Group();
      anchor.name = name;
      anchor.position.fromArray(position);
      anchor.rotation.y = rotationY;
      this.preview.scene.add(anchor);
      return anchor;
    };
    this.replacementAnchors = {
      flower: worldAnchor('chapter3-flower-stall-replacement-anchor', [-21.4, 0.55, -5.2], 0.18),
      alley: worldAnchor('chapter3-service-alley-replacement-anchor', [-27.6, 0.64, -7.6], -0.35),
    };

    // Hide only the authored greybox architecture so the procedural service
    // props (dispenser, benches, terminal, printer, waste bin, actors) remain
    // readable and interactive on top of the replacement shell.
    const ministryEnvelopeNames = new Set([
      'ministry-floor', 'ministry-back-wall', 'ministry-left-wall', 'ministry-right-wall',
      'ministry-counter-canopy', 'ministry-public-counter', 'ministry-counter-cap',
      'ministry-hall-label',
    ]);
    const ministryFallback = this.ministryHall.group.children.filter(
      (child) => child.isMesh && ministryEnvelopeNames.has(child.name),
    );
    const archiveFallback = this.archiveHall.group.children.filter(
      (child) => child.isMesh && child.name !== 'archive-floor',
    );
    const ministryFloor = this.ministryHall.group.getObjectByName('ministry-floor');
    const archiveFloor = this.archiveHall.group.getObjectByName('archive-floor');
    if (ministryFloor?.material?.color) ministryFloor.material.color.setHex(0x4e514b);
    if (archiveFloor?.material?.color) archiveFloor.material.color.setHex(0x4b4840);

    const roomGreybox = [
      this.hotelHall.roomFloor,
      this.hotelHall.roomRug,
      ...(this.hotelHall.roomWalls ?? []),
    ];
    const roomFurnitureGreybox = [
      this.hotelHall.evidenceTable,
      this.hotelHall.bed,
      this.hotelHall.washstand,
    ];
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

    const jobs = [
      { id: 'env-eda-oil-stall', host: this.lampOilStall, hide: [...this.lampOilStall.children] },
      { id: 'env-flower-stall', host: this.replacementAnchors.flower },
      { id: 'env-service-alley-kit', host: this.replacementAnchors.alley },
      { id: 'env-campfire-props', host: this.campfireKettle, position: [0, 0, 0], hide: [...this.campfireKettle.children] },
      { id: 'prop-oil-container-set', host: this.lampOilStall, position: [2.25, 0, 0.15], rotationY: -0.2 },
      { id: 'prop-solvent-bottle', host: this.bottle, hide: [...this.bottle.children] },
      { id: 'prop-cut-connector-set', host: this.cutInterface.group, hide: [...this.cutInterface.group.children] },
      // Fit the generated shell to the full 18 x 18 m public hall footprint so
      // no black stage shows around the floor. The shell replaces only the
      // envelope; procedural props and actors stay on top.
      { id: 'env-ministry-shell', host: this.ministryHall.group, position: [0, 0, 2.2], scale: [2.725, 1.0, 3.378], hide: ministryFallback },
      // The existing Hunyuan furniture kit supplies the full counter, seating,
      // queue, dispenser and service props. Its measured footprint leaves the
      // front 6.5 m open, so the entrance remains readable and walkable.
      { id: 'env-ministry-furniture', host: this.ministryHall.group, position: [0, 0, -0.7], scale: 0.95, hide: ministryFurnitureFallback },
      // The shell's wooden floor sits 0.93 m above its own base; sink the whole
      // shell by that amount so the reading-room floor lands at y = 0 and the
      // actors stand on the boards instead of wading through them.
      { id: 'env-archive-shell', host: this.archiveHall.group, position: [0, -0.93, -1.1], scale: 1.5, hide: archiveFallback },
      // The fused furniture kit is authored for a monumental hall: scale it to
      // human reading-room proportions and centre its desks and shelves inside
      // the shell so nothing crosses a wall.
      { id: 'env-archive-furniture', host: this.archiveHall.group, position: [0, 0, -0.1], scale: 0.47 },
      { id: 'prop-petar-toolbox', host: this.archiveHall.toolBox, hide: [...this.archiveHall.toolBox.children] },
      { id: 'env-hotel-lobby-shell', host: this.hotelHall.lobbyGroup, position: [0, -0.6, -0.2], scale: 2.1, hide: this.hotelHall.lobbyLegacyFallbacks },
      { id: 'env-hotel-lobby-furniture', host: this.hotelHall.lobbyGroup, position: [0, -0.6, -0.15], scale: 1.25 },
      { id: 'prop-hotel-register-key', host: this.hotelHall.lobbyGroup, position: [0.55, 0.63, -2.27], rotationY: -0.12, hide: [this.hotelHall.register] },
      // Preserve the Hunyuan corridor's natural height while widening the aisle
      // to 3 m so two adults and the fixed isometric camera have breathing room.
      // A mirrored copy below reuses its detailed guest-room wall opposite it.
      // The oversized 7.4 m greybox envelope and placeholder doors stay hidden.
      // The model carries a 0.70 m raised plinth under its floorboards; sink the
      // shell by that amount so the walkable floor surface lands at y = 0 and
      // actors stop wading knee-deep through the boards.
      { id: 'env-hotel-corridor-shell', host: this.hotelHall.corridorGroup, position: [0, -0.7, 0], scale: [1.90, 1.0, 1.45], hide: corridorGreybox },
      // Fit the shell and the existing Hunyuan furniture kit to the authored
      // room. Hide the duplicate greybox furniture; keep the separate evidence
      // papers visible on the kit's real table so their interactions still work.
      { id: 'env-butch-room-shell', host: this.hotelHall.roomGroup, position: [0, 0, -12.65], scale: [2.87, 0.85, 1.28], hide: roomGreybox },
      { id: 'env-butch-room-furniture', host: this.hotelHall.roomGroup, position: [0, 0, -12.65], scale: 0.95, hide: roomFurnitureGreybox },
      { id: 'env-doorless-carriage', host: this.finalDoor.shell, position: [0, 0, 0], hide: [...this.finalDoor.shell.children] },
      { id: 'env-single-train-door', host: this.finalDoor.door, position: [-1.05, 0, 0], hide: [this.finalDoor.doorFallback] },
    ];
    if (this.preview.loadingLabel) this.preview.loadingLabel.textContent = 'FITTING ECHO CITY SETS';
    let completed = 0;
    const attachJobs = async (batch) => Promise.all(batch.map(async (job) => {
      await this.replacements.attach(job);
      completed += 1;
      if (this.preview.loadingCount) this.preview.loadingCount.textContent = `${completed} / ${jobs.length}`;
    }));
    // The hotel is the only interior entered by the Copper Heron route.  Load
    // its authored shell and furniture before unrelated city replacements so
    // the player never sees the obsolete fallback room while testing 3.3 or
    // waking after sleep.
    const hotelReplacementIds = new Set([
      'env-hotel-lobby-shell', 'env-hotel-lobby-furniture',
      'prop-hotel-register-key', 'env-hotel-corridor-shell',
      'env-butch-room-shell', 'env-butch-room-furniture',
    ]);
    const hotelJobs = jobs.filter((job) => hotelReplacementIds.has(job.id));
    const remainingJobs = jobs.filter((job) => !hotelReplacementIds.has(job.id));
    await attachJobs(hotelJobs);
    await attachJobs(remainingJobs);
    this.ministryFurnitureModel = this.replacements.model('env-ministry-furniture');
    this.butchRoomFurnitureModel = this.replacements.model('env-butch-room-furniture');
    this.hotelCorridorShellModel = this.replacements.model('env-hotel-corridor-shell');
    if (this.hotelCorridorShellModel) {
      this.hotelCorridorMirrorModel = this.hotelCorridorShellModel.clone(true);
      this.hotelCorridorMirrorModel.name = 'chapter3-replacement-env-hotel-corridor-shell-mirrored';
      this.hotelCorridorMirrorModel.scale.x *= -1;
      this.hotelCorridorMirrorModel.position.y += 0.002;
      this.hotelHall.corridorGroup.add(this.hotelCorridorMirrorModel);
      // The original shell carries the +X wall facing the fixed +X camera.
      // Reuse the existing occlusion fade so that wall clears Butch smoothly;
      // the mirrored shell keeps the floor and far wall fully opaque beneath it.
      this.preview.registerOccludingBuilding(this.hotelCorridorShellModel, 'hotel-corridor-camera-wall');
    }
    if (!this.ministryFurnitureModel) this.populateMinistryDetailModels();
    const failed = this.replacements.state().filter((entry) => !entry.loaded).length;
    if (this.preview.loadingLabel) this.preview.loadingLabel.textContent = failed ? 'SET FALLBACKS ACTIVE' : 'ECHO CITY SETS READY';
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
      ['morning-nika', 'FEMALE CIVIC', this.morningNika],
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
    for (const actor of [
      this.produceVendor, this.squareBosko, this.archiveMilaExterior,
      this.alleyGangsterA, this.alleyGangsterB, this.alleyResident,
      this.campfireRada, this.campfireMiro, this.campfireSeline,
    ]) actor.visible = false;
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

  updateCharacterAnimations(dt) {
    const state = this.model.snapshot();
    const onElevatedOverlook = this.overlookTravelElapsed !== null
      || (state.sunriseViewed && !state.sunriseReturned);
    const ambientLifeStates = this.updateAmbientLifeRoutes(dt);
    this.characters.update(dt, {
      groundingEnabled: !this.insideMinistry
        && !this.insideArchive
        && !this.insideHotel
        && !onElevatedOverlook,
    });
    if (this.characterQa) {
      this.updateCharacterQa(dt);
      return;
    }
    const butchMoving = this.preview.path.length > 0 || this.overlookTravelElapsed !== null;
    const levMoving = !this.dialogue.active && (this.guideElapsed !== null || this.levWalkElapsed !== null
      || this.levHotelExitElapsed !== null || this.morningLevMovedThisFrame || this.archiveLevMovedThisFrame
      || this.hotelLevMovedThisFrame
      || this.overlookTravelElapsed !== null);
    const seatedAtOverlook = state.sunriseViewed && !state.sunriseReturned && this.overlookTravelElapsed === null;
    this.characters.play('butch', this.butchActionOverride || (seatedAtOverlook ? 'sit' : butchMoving ? 'walk' : 'idle'));
    this.characters.play(
      'lev',
      seatedAtOverlook ? 'sit' : levMoving ? 'walk' : 'idle',
      this.dialogue.active ? { immediate: true } : undefined,
    );
    this.updateAmbientCharacterLoops(dt, ambientLifeStates);
  }

  actorIsActuallyVisible(host) {
    for (let object = host; object; object = object.parent) if (!object.visible) return false;
    return true;
  }

  npcIdsForInteraction(interactionId) {
    return {
      eda: ['eda'], olek: ['olek'], 'produce-vendor': ['produce-vendor'],
      'flower-vendor': ['flower-vendor'], 'transport-entrance': ['toma'],
      'sava-counter': ['sava'], 'nika-terminal': ['nika'], 'bosko-queue': ['ministry-bosko'],
      'bosko-square': ['square-bosko'], 'archive-entrance': ['archive-mila-exterior'],
      'archive-ana': ['archive-ana'], 'archive-petar': ['petar'],
      'hotel-register-hana': ['hana'], 'hotel-guest-irena': ['irena'],
      'hotel-guest-vesna': ['vesna'], 'hotel-daro-window': ['daro'],
      'morning-original-reservation': ['morning-nika'],
      'alley-men': ['alley-gangster-a', 'alley-gangster-b'],
      'alley-resident': ['alley-resident'],
      'campfire-rada': ['campfire-rada'], 'campfire-miro': ['campfire-miro'],
      'campfire-seline': ['campfire-seline'],
    }[interactionId] || [];
  }

  npcIdForInteraction(interactionId) {
    return this.npcIdsForInteraction(interactionId)[0] || null;
  }

  npcApproach(host, distance = 1.35, y = null) {
    const awayFromNpc = this.preview.player.position.clone().sub(host.position);
    awayFromNpc.y = 0;
    if (awayFromNpc.lengthSq() < 0.01) awayFromNpc.set(0, 0, 1);
    awayFromNpc.normalize().multiplyScalar(distance);
    const target = host.position.clone().add(awayFromNpc);
    return [target.x, y ?? host.position.y, target.z];
  }

  archiveNpcSegmentIsClear(start, end) {
    const distance = start.distanceTo(end);
    const samples = Math.max(2, Math.ceil(distance / 0.12));
    for (let index = 0; index <= samples; index += 1) {
      const t = index / samples;
      const x = THREE.MathUtils.lerp(start.x, end.x, t);
      const z = THREE.MathUtils.lerp(start.z, end.z, t);
      if (ARCHIVE_FURNITURE_OBSTACLES.some((box) => (
        x > box.minX && x < box.maxX && z > box.minZ && z < box.maxZ
      ))) return false;
    }
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
    if (route.interior === 'archive'
      && !interiorSegmentIsClear(route.host.position, candidate, ARCHIVE_WALK_BOUNDS, ARCHIVE_FURNITURE_OBSTACLES)) return null;
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
      'square-bosko': this.squareBosko, sava: this.ministryHall.sava,
      nika: this.ministryHall.nika, 'ministry-bosko': this.ministryHall.bosko,
      mila: this.archiveHall.mila, 'archive-ana': this.archiveHall.ana,
      petar: this.archiveHall.petar, 'archive-mila-exterior': this.archiveMilaExterior,
      'morning-nika': this.morningNika, 'alley-gangster-a': this.alleyGangsterA,
      'alley-gangster-b': this.alleyGangsterB, 'alley-resident': this.alleyResident,
      'campfire-rada': this.campfireRada, 'campfire-miro': this.campfireMiro,
      'campfire-seline': this.campfireSeline, hana: this.hotelHall.hana,
      irena: this.hotelHall.irena, vesna: this.hotelHall.vesna, daro: this.hotelHall.daro,
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
        'square-bosko': { points: [[0, 0], [3.2, -1.8], [-2.4, -2.5], [1.1, 2.4]], actions: ['repair', 'investigate', 'crouch', 'idle'] },
        sava: { points: [[0, 0], [1.5, 0], [0.6, 0.55]], actions: ['investigate', 'talk', 'idle'], formal: true, interior: 'ministry' },
        nika: { points: [[0, 0], [-1.5, 0], [-0.6, 0.55]], actions: ['investigate', 'talk', 'idle'], formal: true, interior: 'ministry' },
        'ministry-bosko': { points: [[0, 0], [-2.2, 1.2], [-1.2, -1.3]], actions: ['idle', 'investigate', 'talk'], interior: 'ministry' },
        // Reading-room routes stay inside the narrow clear lanes measured
        // around the fused furniture kit. The previous broad offsets sent all
        // three workers through desks, shelves or beyond the room clamp.
        mila: { points: [[0, 0], [0.75, -0.45], [0.3, 0.35]], actions: ['investigate', 'pickUp', 'talk'], formal: true, interior: 'archive' },
        'archive-ana': { points: [[0, 0], [0.05, -0.38], [0.02, 0.12]], actions: ['investigate', 'pickUp', 'talk'], interior: 'archive' },
        petar: { points: [[0, 0], [0.65, -0.38], [-0.35, -0.5]], actions: ['repair', 'crouch', 'investigate'], interior: 'archive' },
        'archive-mila-exterior': { points: [[0, 0], [2.8, 0.8], [1.0, 2.6]], actions: ['idle', 'investigate', 'talk'] },
        'morning-nika': { points: [[0, 0], [-2.4, 1.4], [1.8, 2.0]], actions: ['investigate', 'pickUp', 'idle'] },
        'alley-gangster-a': { points: [[0, 0], [-2.2, 2.0], [1.8, 1.2]], actions: ['investigate', 'talk', 'idle'] },
        'alley-gangster-b': { points: [[0, 0], [2.4, -1.8], [-1.6, -1.2]], actions: ['talk', 'investigate', 'idle'] },
        // The unnamed resident is ambient city life rather than a plot anchor:
        // she can take long errands through the connected street graph instead
        // of pacing a two-metre loop beside one grate.
        'alley-resident': { points: [[0, 0]], actions: ['crouch', 'idle', 'investigate'], freeRoam: true },
        'campfire-rada': { points: [[0, 0], [2.5, -1.5], [-2.0, -1.8]], actions: ['talk', 'investigate', 'idle'] },
        'campfire-miro': { points: [[0, 0], [-2.4, 1.7], [2.0, 1.4]], actions: ['repair', 'investigate', 'talk'] },
        'campfire-seline': { points: [[0, 0], [2.2, 1.8], [-2.1, 1.2]], actions: ['talk', 'pickUp', 'idle'] },
        // Lobby guests keep their own furniture zones instead of converging on
        // the centre table. Seated and small work actions make the room feel
        // occupied without turning it into a standing crowd.
        hana: { points: [[0, 0]], actions: ['investigate'], fixed: true, formal: true, interior: 'hotel' },
        irena: { points: [[0, 0]], actions: ['sit'], fixed: true, interior: 'hotel' },
        vesna: { points: [[0, 0]], actions: ['sit'], fixed: true, interior: 'hotel' },
        daro: { points: [[0, 0]], actions: ['sit'], fixed: true, interior: 'hotel' },
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
      if (route.interior === 'archive' && !this.archiveNpcSegmentIsClear(route.host.position, target)) {
        route.targetIndex = route.pointIndex;
        route.dwell = 2.8;
        states.set(id, route.actions[route.pointIndex % route.actions.length]);
        continue;
      }
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

  updateOlekCartLife(dt, states, actors = {}) {
    if (!this.cartObject || !this.olek.visible) return;
    this.olekCartCollision ??= {
      type: 'box', center: [this.cartObject.position.x, this.cartObject.position.z],
      size: [2.8, 1.65], rotationY: this.cartObject.rotation.y, padding: 0.35,
      sourceId: 'porter-handcart-runtime',
    };
    if (!this.preview.boundaryObstacles.includes(this.olekCartCollision)) {
      this.preview.boundaryObstacles.push(this.olekCartCollision);
    }
    if (!this.olekCartRoute) {
      const points = [[-24.2, -1.4], [-19.5, -1.2], [-17.8, 1.6], [-22.1, 3.0], [-25.0, 1.0]]
        .map(([x, z]) => new THREE.Vector3(x, this.cartObject.position.y, z));
      const initialDirection = points[1].clone().sub(points[0]).setY(0).normalize();
      this.cartObject.rotation.y = Math.atan2(initialDirection.x, initialDirection.z);
      this.olek.position.copy(this.cartObject.position).addScaledVector(initialDirection, -1.35);
      this.olek.position.y = 0.5;
      this.olek.rotation.y = this.cartObject.rotation.y;
      this.olekCartRoute = { points, pointIndex: 0, dwell: 2.5, speed: 0.86, navPath: [] };
    }
    const route = this.olekCartRoute;
    const questioned = this.activeNpcConversationIds.has('olek')
      && (this.dialogue.active || this.preview.path.length > 0);
    if (!questioned && route.dwell > 0) route.dwell -= dt;
    if (!questioned && route.dwell <= 0) {
      const targetIndex = (route.pointIndex + 1) % route.points.length;
      const target = route.points[targetIndex];
      if (route.navPath.length === 0) {
        const obstacles = this.preview.boundaryObstacles.filter((obstacle) => obstacle !== this.olekCartCollision);
        route.navPath = findPath(this.cartObject.position, target, obstacles);
        if (route.navPath.length === 0) {
          route.dwell = 2.8;
          this.olekCartCollision.center[0] = this.cartObject.position.x;
          this.olekCartCollision.center[1] = this.cartObject.position.z;
          states.set('olek', 'idle');
          return;
        }
      }
      const movementTarget = route.navPath[0] || this.cartObject.position;
      const movement = movementTarget.clone().sub(this.cartObject.position);
      movement.y = 0;
      const distance = movement.length();
      if (distance < 0.08) {
        this.cartObject.position.x = movementTarget.x;
        this.cartObject.position.z = movementTarget.z;
        route.navPath.shift();
        if (route.navPath.length === 0) {
          route.pointIndex = targetIndex;
          route.dwell = 4.0 + (targetIndex % 3) * 1.4;
        }
      } else {
        const direction = movement.normalize();
        const step = Math.min(distance, route.speed * dt);
        const cartCandidate = this.cartObject.position.clone().addScaledVector(direction, step);
        const blockedByPerson = [this.preview.player, ...Object.entries(actors)
          .filter(([id, host]) => id !== 'olek' && this.actorIsActuallyVisible(host))
          .map(([, host]) => host)]
          .some((host) => cartCandidate.distanceTo(host.position) < 1.45);
        if (blockedByPerson) {
          route.navPath = [];
          route.dwell = 0.8;
          states.set('olek', 'idle');
          return;
        }
        this.cartObject.position.addScaledVector(direction, step);
        this.cartObject.rotation.y = Math.atan2(direction.x, direction.z);
        const behind = direction.clone().multiplyScalar(-1.35);
        this.olek.position.copy(this.cartObject.position).add(behind);
        this.olek.position.y = 0.5;
        this.olek.rotation.y = this.cartObject.rotation.y;
        states.set('olek', 'push');
        this.olekCartCollision.center[0] = this.cartObject.position.x;
        this.olekCartCollision.center[1] = this.cartObject.position.z;
        this.olekCartCollision.rotationY = THREE.MathUtils.radToDeg(this.cartObject.rotation.y);
        return;
      }
    }
    this.olekCartCollision.center[0] = this.cartObject.position.x;
    this.olekCartCollision.center[1] = this.cartObject.position.z;
    this.olekCartCollision.rotationY = THREE.MathUtils.radToDeg(this.cartObject.rotation.y);
    states.set('olek', questioned ? (this.dialogue.active ? 'talk' : 'idle') : route.pointIndex % 2 ? 'investigate' : 'idle');
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
      'square-bosko': [['repair', 6.0], ['investigate', 4.0], ['idle', 2.0]],
      sava: [['investigate', 6.0], ['idle', 4.0], ['talk', 3.0]],
      nika: [['investigate', 5.0], ['talk', 4.0], ['idle', 4.0]],
      'ministry-bosko': [['idle', 6.0], ['investigate', 3.0], ['talk', 3.0]],
      mila: [['investigate', 6.0], ['idle', 4.0], ['talk', 3.0]],
      'archive-ana': [['investigate', 5.0], ['talk', 4.0], ['idle', 4.5]],
      petar: [['repair', 6.0], ['idle', 4.0], ['investigate', 3.0]],
      'archive-mila-exterior': [['idle', 6.0], ['talk', 4.0]],
      'morning-nika': [['idle', 7.0], ['investigate', 3.0]],
      'alley-gangster-a': [['talk', 6.0], ['idle', 4.0]],
      'alley-gangster-b': [['idle', 5.0], ['talk', 5.0]],
      'alley-resident': [['crouch', 8.0], ['idle', 3.0]],
      'campfire-rada': [['talk', 6.0], ['idle', 5.0]],
      'campfire-miro': [['repair', 5.0], ['talk', 4.0], ['idle', 4.0]],
      'campfire-seline': [['idle', 5.0], ['talk', 5.0]],
      hana: [['investigate', 5.0], ['talk', 4.0], ['idle', 4.0]],
      irena: [['idle', 6.0], ['talk', 4.0]],
      vesna: [['talk', 5.0], ['idle', 6.0]],
      daro: [['idle', 6.0], ['investigate', 3.0], ['talk', 3.0]],
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

    this.lev = makeActor(this.preview.scene, {
      name: 'opening-lev-placeholder',
      color: 0x4f5a50,
      position: OPENING_POSITIONS.levStart,
      scale: 0.96,
    });
    this.eda = makeActor(this.preview.scene, {
      name: 'opening-eda-placeholder',
      color: 0x82664d,
      position: OPENING_POSITIONS.eda,
      scale: 0.94,
    });
    this.olek = makeActor(this.preview.scene, {
      name: 'opening-olek-placeholder',
      color: 0x55636a,
      position: OPENING_POSITIONS.olek,
      scale: 1.02,
    });
    this.toma = makeActor(this.preview.scene, {
      name: 'opening-toma-placeholder',
      color: 0x6a5b47,
      position: OPENING_POSITIONS.toma,
      scale: 0.98,
    });
    this.produceVendor = makeActor(this.preview.scene, {
      name: 'opening-produce-vendor-placeholder',
      color: 0x6c4938,
      position: OPENING_POSITIONS.produceVendor,
      scale: 1.02,
    });
    this.flowerVendor = makeActor(this.preview.scene, {
      name: 'opening-flower-vendor-placeholder',
      color: 0x6c536d,
      position: OPENING_POSITIONS.flowerVendor,
      scale: 0.92,
    });
    this.squareBosko = makeActor(this.preview.scene, {
      name: 'opening-square-bosko-placeholder',
      color: 0x6d6159,
      position: OPENING_POSITIONS.squareBosko,
      scale: 1.02,
    });
    this.squareBosko.visible = false;
    this.morningNika = makeActor(this.preview.scene, {
      name: 'morning-nika-document-clerk', color: 0x596d78, position: [40.5, 0.5, -6.5], scale: 0.94,
    });
    this.morningNika.visible = false;
    this.alleyGangsterA = makeActor(this.preview.scene, {
      name: 'alley-man-brown-coat', color: 0x4f382c, position: [-28.2, 0.5, -5.8], scale: 1.02,
    });
    this.alleyGangsterB = makeActor(this.preview.scene, {
      name: 'alley-second-man', color: 0x303943, position: [-26.7, 0.5, -7.1], scale: 0.98,
    });
    this.alleyResident = makeActor(this.preview.scene, {
      // Start on the authored east street node, not in the ministry facade's
      // padded footprint. This gives the free-roam route a legal first step.
      name: 'alley-heat-grate-resident', color: 0x675447, position: [45.0, 0.5, -10.0], scale: 0.9,
    });
    this.campfireRada = makeActor(this.preview.scene, {
      name: 'campfire-rada-postal-sorter', color: 0x7f493b, position: [-50.35, 0.5, 33.0], scale: 0.96,
    });
    this.campfireMiro = makeActor(this.preview.scene, {
      name: 'campfire-miro-tram-mechanic', color: 0x3f5660, position: [-54.75, 0.5, 32.8], scale: 1.02,
    });
    this.campfireSeline = makeActor(this.preview.scene, {
      name: 'campfire-seline-laundry-worker', color: 0x6f5874, position: [-54.15, 0.5, 35.8], scale: 0.93,
    });
    this.levOutline = makeDynamicObjectHighlight(this.lev);
    this.edaOutline = makeDynamicObjectHighlight(this.eda);
    this.olekOutline = makeDynamicObjectHighlight(this.olek);
    this.tomaOutline = makeDynamicObjectHighlight(this.toma);
    this.produceVendorOutline = makeDynamicObjectHighlight(this.produceVendor);
    this.flowerVendorOutline = makeDynamicObjectHighlight(this.flowerVendor);
    this.squareBoskoOutline = makeObjectHighlight(this.squareBosko);
    this.morningNikaOutline = makeDynamicObjectHighlight(this.morningNika);
    this.alleyResidentOutline = makeObjectHighlight(this.alleyResident);
    this.alleyGangsterAOutline = makeObjectHighlight(this.alleyGangsterA);
    this.alleyGangsterBOutline = makeObjectHighlight(this.alleyGangsterB);
    this.campfireRadaOutline = makeObjectHighlight(this.campfireRada);
    this.campfireMiroOutline = makeObjectHighlight(this.campfireMiro);
    this.campfireSelineOutline = makeObjectHighlight(this.campfireSeline);
    this.campfireKettle = makeCampfireKettle(this.preview.scene);
    this.campfireKettleOutline = makeObjectHighlight(this.campfireKettle);
    this.lampOilStall = makeLampOilStall(this.preview.scene);
    this.seam = makeDarkSeam(
      this.preview.scene,
      (x, z) => this.preview.surfaceHeightAt(x, z),
    );
    this.bottle = makeBottle(this.preview.scene);
    this.bottleOutline = makeObjectHighlight(this.bottle);
    this.plazaGrooves = makePlazaGrooves(this.preview.scene);
    this.cutInterface = makeCutInterface(this.preview.scene);
    // Search beacon for the dusk hunt: the connector set is half a metre of
    // dark metal, so while it is the active objective a thin pulsing light
    // column marks the groove junction until Butch walks up to it.
    this.cutInterfaceBeacon = new THREE.Group();
    this.cutInterfaceBeacon.name = 'cut-interface-search-beacon';
    this.cutInterfaceBeaconColumn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.3, 5.4, 12, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xffc06a,
        transparent: true,
        opacity: 0.14,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    this.cutInterfaceBeaconColumn.position.y = 2.7;
    const beaconLight = new THREE.PointLight(0xffab54, 8, 6.5, 1.7);
    beaconLight.position.y = 1.0;
    this.cutInterfaceBeacon.add(this.cutInterfaceBeaconColumn, beaconLight);
    this.cutInterfaceBeacon.position.copy(positionFrom(OPENING_POSITIONS.cutInterface));
    this.cutInterfaceBeacon.visible = false;
    this.preview.scene.add(this.cutInterfaceBeacon);
    this.cartObject = this.preview.scene.getObjectByName('porter-handcart');
    this.cartOutline = makeObjectHighlight(this.cartObject);
    this.ministryHall = createChapter3MinistryHall(this.preview.scene);
    this.archiveHall = createChapter3ArchiveHall(this.preview.scene);
    this.hotelHall = createChapter3HotelHall(this.preview.scene);
    // Interior sets share the exterior scene root so their transitions can
    // preserve the player and lights. They must start hidden: otherwise the
    // imported ministry floor/shell sits at world origin and paints a large
    // black rectangle across the oil evidence in the civic square.
    this.ministryHall.group.visible = false;
    this.archiveHall.group.visible = false;
    this.hotelHall.group.visible = false;
    this.groundMessage = makeGroundMessage(
      this.preview.scene,
      (x, z) => this.preview.surfaceHeightAt(x, z),
    );
    this.finalDoor = makeFinalTrainDoor(this.preview.scene);
    this.sunriseOverlook = makeSunriseOverlook(
      this.preview.scene,
      this.preview.scene.getObjectByName('fountain-bench'),
    );
    this.tunnelCutawayMaterials = [];
    const tunnelTerrain = this.preview.scene.getObjectByName('tram-tunnel-rock-cutting');
    tunnelTerrain?.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      const sourceMaterials = Array.isArray(child.material) ? child.material : [child.material];
      const clonedMaterials = sourceMaterials.map((material) => {
        const clone = material.clone();
        this.tunnelCutawayMaterials.push({
          material: clone,
          opacity: clone.opacity ?? 1,
          transparent: clone.transparent,
          depthWrite: clone.depthWrite,
        });
        return clone;
      });
      child.material = Array.isArray(child.material) ? clonedMaterials : clonedMaterials[0];
    });
    // This perimeter facade intersects the tunnel rock from the authored isometric camera.
    // Keep the locked city layout intact and suppress only the visible penetration at runtime.
    this.tunnelOverlapBuilding = this.preview.scene.getObjectByName('west-printworks-mid');
    if (this.tunnelOverlapBuilding) this.tunnelOverlapBuilding.visible = false;
    this.hotelEntrance = new THREE.Group();
    this.hotelEntrance.name = 'copper-heron-entrance-marker';
    const hotelSign = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 1.05, 0.14),
      new THREE.MeshStandardMaterial({ color: 0x54372a, roughness: 0.82 }),
    );
    hotelSign.position.y = 1.5;
    // Hang the sign flat against the west street facade instead of floating
    // inside the building volume: the marker is the interaction anchor, and
    // anchoring it at the model centre sent Butch walking into the mesh.
    hotelSign.rotation.y = Math.PI / 2;
    this.hotelEntrance.add(hotelSign);
    this.hotelEntrance.position.set(50.45, 0, -13.3);
    this.preview.scene.add(this.hotelEntrance);
    this.archiveMilaExterior = makeActor(this.preview.scene, {
      name: 'opening-archive-mila-placeholder',
      color: 0x665348,
      position: OPENING_POSITIONS.archiveEntrance,
      scale: 0.94,
    });
    this.archiveMilaExterior.visible = false;
    await this.loadReplacementAssets();
    await this.loadAnimatedCharacters();
    this.bottleOutline = makeDynamicObjectHighlight(
      this.replacements.model('prop-solvent-bottle') || this.bottle,
    );
    this.cutInterface.highlight = makeDynamicObjectHighlight(
      this.replacements.model('prop-cut-connector-set') || this.cutInterface.group,
    );
    this.queueOutline = makeObjectHighlight(this.ministryFurnitureModel || this.ministryHall.queueDispenser);
    this.savaOutline = makeDynamicObjectHighlight(this.ministryHall.sava);
    this.nikaOutline = makeDynamicObjectHighlight(this.ministryHall.nika);
    this.boskoQueueOutline = makeObjectHighlight(this.ministryHall.bosko);
    this.discardedPrintOutline = makeObjectHighlight(this.ministryHall.discardedPrint);
    this.archiveMilaOutline = makeObjectHighlight(this.archiveMilaExterior);
    this.archiveAnaOutline = makeObjectHighlight(this.archiveHall.ana);
    this.archiveMapOutline = makeObjectHighlight(this.archiveHall.mapTable);
    this.archiveOrderOutline = makeObjectHighlight(this.archiveHall.workOrderDesk);
    this.archivePetarOutline = makeDynamicObjectHighlight(this.archiveHall.petar);
    this.archiveTimelineOutline = makeObjectHighlight(this.archiveHall.timeline);
    // During the hotel objective the whole landmark breathes. Highlighting
    // only the small hanging sign was unreadable against the facade.
    this.hotelEntranceOutline = makePreservingObjectHighlight(
      this.preview.scene.getObjectByName('copper-heron-hotel') || this.hotelEntrance,
    );
    this.hotelRegisterOutline = makeDynamicObjectHighlight(
      this.replacements.model('prop-hotel-register-key') || this.hotelHall.register,
    );
    this.hotelIrenaOutline = makeObjectHighlight(this.hotelHall.irena);
    this.hotelVesnaOutline = makeObjectHighlight(this.hotelHall.vesna);
    this.hotelDaroOutline = makeObjectHighlight(this.hotelHall.daro);
    this.hotelEvidenceOutline = makeObjectHighlight(this.butchRoomFurnitureModel || this.hotelHall.evidenceTable);
    this.hotelEvidencePaperOutlines = this.hotelHall.evidencePaperSpecs.map(({ paper }) => makeObjectHighlight(paper));
    this.hotelBedOutline = this.hotelEvidenceOutline;
    this.hotelCorridorEntranceOutline = makeObjectHighlight(this.hotelHall.corridorEntrance);
    this.hotelButchRoomDoorOutline = makeObjectHighlight(this.hotelHall.butchRoomDoor);
    this.hotelCorridorStairOutline = makeObjectHighlight(this.hotelHall.corridorStairExit);
    this.hotelRoomExitOutline = makeObjectHighlight(this.hotelHall.roomExit);
    this.hotelLobbyExitOutline = makeObjectHighlight(this.hotelHall.lobbyExit);
    this.finalDoorOutline = makeObjectHighlight(this.finalDoor.group);
    this.finalTrainObject = this.preview.scene.getObjectByName('municipal-tram');
    this.finalTrainOutline = makeObjectHighlight(this.finalTrainObject || this.finalDoor.group);
    this.finalLevOutline = this.levOutline;

    document.getElementById('chapter3-end-card')?.remove();
    this.chapterEndCard = document.createElement('section');
    this.chapterEndCard.id = 'chapter3-end-card';
    this.chapterEndCard.innerHTML = '<div>CHAPTER 03 COMPLETE</div><h1>EASTBOUND</h1><p>Mara was alive. She left by choice. Her reason remains ahead.</p>';
    Object.assign(this.chapterEndCard.style, {
      position: 'fixed', inset: '0', zIndex: '1000', display: 'grid', placeContent: 'center', gap: '10px',
      textAlign: 'center', color: '#eadcc1', background: '#050606', opacity: '0', pointerEvents: 'none',
      transition: 'opacity 1.2s ease', fontFamily: 'Georgia, serif', letterSpacing: '0.08em',
    });
    Object.assign(this.chapterEndCard.querySelector('h1').style, { margin: '0', fontSize: 'clamp(42px, 7vw, 92px)' });
    Object.assign(this.chapterEndCard.querySelector('p').style, { margin: '12px 24px 0', fontSize: '18px', letterSpacing: '0.02em' });
    document.body.append(this.chapterEndCard);

    this.interactions = [
      {
        id: 'lamp-oil-seam',
        label: 'Dark oil between the paving stones',
        position: positionFrom(OPENING_POSITIONS.seam),
        approach: OPENING_POSITIONS.seamApproach,
        outline: this.seam.outline,
        eligible: () => {
          const state = this.model.snapshot();
          return state.explorationBriefingComplete && !state.seamInspected;
        },
        activate: () => this.openSeam(),
      },
      {
        id: 'eda',
        label: 'Eda, lamp-oil seller',
        position: this.eda.position,
        approach: () => this.npcApproach(this.eda),
        outline: this.edaOutline,
        eligible: () => {
          const state = this.model.snapshot();
          return state.seamInspected && !state.edaComplete;
        },
        beginApproach: () => this.beginEdaApproach(),
        activate: () => this.openEda(),
      },
      {
        id: 'produce-vendor',
        label: 'Produce vendor',
        position: this.produceVendor.position,
        approach: () => this.npcApproach(this.produceVendor),
        outline: this.produceVendorOutline,
        ambient: true,
        eligible: () => {
          const state = this.model.snapshot();
          return state.seamInspected && !state.edaComplete && !this.vendorSpoken.has('produce');
        },
        activate: () => this.openVendor('produce', PRODUCE_VENDOR_DIALOGUE),
      },
      {
        id: 'flower-vendor',
        label: 'Flower vendor',
        position: this.flowerVendor.position,
        approach: () => this.npcApproach(this.flowerVendor),
        outline: this.flowerVendorOutline,
        ambient: true,
        eligible: () => {
          const state = this.model.snapshot();
          return state.seamInspected && !state.edaComplete && !this.vendorSpoken.has('flower');
        },
        activate: () => this.openVendor('flower', FLOWER_VENDOR_DIALOGUE),
      },
      {
        id: 'porter-handcart',
        label: 'Olek\'s stained handcart',
        position: this.cartObject.position,
        approach: () => this.npcApproach(this.cartObject, 1.7, 0.5),
        outline: this.cartOutline,
        eligible: () => {
          const state = this.model.snapshot();
          return state.edaComplete && !state.marketLeadComplete && !state.cartInspected;
        },
        activate: () => this.openCart(),
      },
      {
        id: 'olek',
        label: 'Olek, delivery porter',
        position: this.olek.position,
        approach: () => this.npcApproach(this.olek),
        outline: this.olekOutline,
        eligible: () => {
          const state = this.model.snapshot();
          return state.edaComplete && !state.marketLeadComplete;
        },
        activate: () => this.openOlek(),
      },
      {
        id: 'solvent-bottle',
        label: 'Discarded solvent bottle',
        position: this.bottle.position,
        approach: OPENING_POSITIONS.bottleApproach,
        outline: this.bottleOutline,
        eligible: () => {
          const state = this.model.snapshot();
          return state.marketLeadComplete && !state.solventBottleObserved;
        },
        activate: () => this.openBottle(),
      },
      {
        id: 'transport-entrance',
        label: 'Toma at the Transport Ministry entrance',
        position: this.toma.position,
        // Toma intentionally stands near the far-right curb; keep the player on
        // the inner pavement so the conversation remains reachable.
        approach: OPENING_POSITIONS.transportApproach,
        outline: this.tomaOutline,
        eligible: () => {
          const state = this.model.snapshot();
          return state.marketLeadComplete && !state.transportEntranceReached;
        },
        activate: () => this.openTransportEntrance(),
      },
      {
        id: 'ministry-queue-dispenser',
        label: 'Public Services number dispenser',
        position: this.ministryHall.queueDispenser.position,
        approach: MINISTRY_POSITIONS.queueApproach,
        outline: this.queueOutline,
        interior: true,
        eligible: () => {
          const state = this.model.snapshot();
          return this.insideMinistry && state.transportHallEntered && !state.interaction07Complete;
        },
        activate: () => this.openQueueDispenser(),
      },
      {
        id: 'sava-counter',
        label: 'Sava, Public Services supervisor',
        position: this.ministryHall.sava.position,
        approach: () => this.npcApproach(this.ministryHall.sava, 1.0, 1.26),
        outline: this.savaOutline,
        interior: true,
        eligible: () => {
          const state = this.model.snapshot();
          return this.insideMinistry && state.interaction07Complete && !state.savaComplete;
        },
        activate: () => this.openSava(),
      },
      {
        id: 'nika-terminal',
        label: 'Nika, records operator',
        position: this.ministryHall.nika.position,
        approach: () => this.npcApproach(this.ministryHall.nika, 1.0, 1.26),
        outline: this.nikaOutline,
        interior: true,
        eligible: () => {
          const state = this.model.snapshot();
          return this.insideMinistry && state.savaComplete && !state.nikaComplete;
        },
        activate: () => this.openNika(),
      },
      {
        id: 'bosko-queue',
        label: 'Bosko, waiting on the public bench',
        position: this.ministryHall.bosko.position,
        approach: () => this.npcApproach(this.ministryHall.bosko, 1.25, 1.26),
        outline: this.boskoQueueOutline,
        interior: true,
        eligible: () => {
          const state = this.model.snapshot();
          return this.insideMinistry && state.savaComplete && !state.discardedPrintInspected && !state.boskoQueueAsked;
        },
        activate: () => this.openBoskoQueue(),
      },
      {
        id: 'discarded-maintenance-print',
        label: 'Torn printout on the public table',
        position: this.ministryHall.discardedPrint.position,
        approach: MINISTRY_POSITIONS.discardedPrintApproach,
        outline: this.discardedPrintOutline,
        interior: true,
        eligible: () => {
          const state = this.model.snapshot();
          return this.insideMinistry && state.nikaComplete && !state.discardedPrintInspected;
        },
        activate: () => this.openDiscardedPrint(),
      },
      {
        id: 'lev-first-theory',
        label: 'Lev, reviewing the recovered records',
        position: this.lev.position,
        approach: OPENING_POSITIONS.transportApproach,
        outline: this.levOutline,
        eligible: () => {
          const state = this.model.snapshot();
          return !this.insideMinistry && state.discardedPrintInspected && !state.firstTheoryTested;
        },
        activate: () => this.openFirstTheory(),
      },
      {
        id: 'bosko-square',
        label: 'Bosko at the edge of the central square',
        position: this.squareBosko.position,
        approach: () => this.npcApproach(this.squareBosko),
        outline: this.squareBoskoOutline,
        eligible: () => {
          const state = this.model.snapshot();
          return !this.insideMinistry && state.firstTheoryTested && !state.squareBoskoInterviewed;
        },
        activate: () => this.openSquareBosko(),
      },
      {
        id: 'plaza-announcement-grooves',
        label: 'Two rows of old announcement grooves',
        position: positionFrom(OPENING_POSITIONS.plazaGrooves),
        approach: OPENING_POSITIONS.plazaGroovesApproach,
        outline: this.plazaGrooves.highlight,
        eligible: () => {
          const state = this.model.snapshot();
          return !this.insideMinistry && state.squareBoskoInterviewed && !state.interaction14Complete;
        },
        activate: () => this.openPlazaGrooves(),
      },
      {
        id: 'archive-entrance',
        label: 'Mila at the Old Municipal Archive',
        position: this.archiveMilaExterior.position,
        approach: () => this.npcApproach(this.archiveMilaExterior),
        outline: this.archiveMilaOutline,
        eligible: () => {
          const state = this.model.snapshot();
          return !this.insideArchive && state.interaction14Complete && !state.archiveEntranceReached;
        },
        activate: () => this.openArchiveEntrance(),
      },
      {
        id: 'archive-ana',
        label: 'Ana and the old map legend',
        position: this.archiveHall.ana.position,
        approach: () => this.npcApproach(this.archiveHall.ana),
        outline: this.archiveAnaOutline,
        interior: true,
        eligible: () => {
          const state = this.model.snapshot();
          return this.insideArchive && !state.archiveMapInspected && !state.anaMapHelpAsked;
        },
        activate: () => this.openAnaMapHelp(),
      },
      {
        id: 'archive-map-table',
        label: 'Central Square feed plan',
        position: this.archiveHall.mapTable.position,
        approach: ARCHIVE_POSITIONS.mapApproach,
        outline: this.archiveMapOutline,
        interior: true,
        eligible: () => {
          const state = this.model.snapshot();
          return this.insideArchive && state.archiveEntered && !state.archiveMapInspected;
        },
        activate: () => this.openArchiveMap(),
      },
      {
        id: 'archive-maintenance-order',
        label: 'Maintenance order C-441',
        position: this.archiveHall.workOrderDesk.position,
        approach: ARCHIVE_POSITIONS.workOrderApproach,
        outline: this.archiveOrderOutline,
        interior: true,
        eligible: () => {
          const state = this.model.snapshot();
          return this.insideArchive && state.archiveMapInspected && !state.maintenanceOrderInspected;
        },
        activate: () => this.openMaintenanceOrder(),
      },
      {
        id: 'archive-petar',
        label: 'Petar, municipal maintenance worker',
        position: this.archiveHall.petar.position,
        approach: () => this.npcApproach(this.archiveHall.petar),
        outline: this.archivePetarOutline,
        interior: true,
        eligible: () => {
          const state = this.model.snapshot();
          return this.insideArchive && state.maintenanceOrderInspected && !state.petarInterviewComplete;
        },
        activate: () => this.openPetar(),
      },
      {
        id: 'archive-material-timeline',
        label: 'Records arranged by actual time',
        position: this.archiveHall.timeline.position,
        approach: ARCHIVE_POSITIONS.timelineApproach,
        outline: this.archiveTimelineOutline,
        interior: true,
        eligible: () => {
          const state = this.model.snapshot();
          return this.insideArchive && state.petarInterviewComplete && !state.materialTimelineInspected;
        },
        activate: () => this.openMaterialTimeline(),
      },
      {
        id: 'lev-second-theory',
        label: 'Lev, testing the complete timeline',
        position: this.lev.position,
        approach: OPENING_POSITIONS.archiveApproach,
        outline: this.levOutline,
        eligible: () => {
          const state = this.model.snapshot();
          return !this.insideArchive && state.materialTimelineInspected && !state.secondTheoryComplete;
        },
        activate: () => this.openSecondTheory(),
      },
      {
        id: 'cut-feed-interface',
        label: 'Cut lower-feed interface',
        position: this.cutInterface.group.position,
        approach: OPENING_POSITIONS.cutInterfaceApproach,
        outline: this.cutInterface.highlight,
        eligible: () => {
          const state = this.model.snapshot();
          return !this.insideArchive && state.secondTheoryComplete && !state.interaction22Complete;
        },
        activate: () => this.openCutInterface(),
      },
      {
        id: 'copper-heron-entrance',
        label: 'Copper Heron hotel entrance',
        position: this.hotelEntrance.position,
        approach: [50.3, 0.5, -12.4],
        outline: this.hotelEntranceOutline,
        eligible: () => !this.insideHotel && this.model.snapshot().interaction22Complete && !this.model.snapshot().hotelEntered,
        activate: () => this.enterCopperHeron(),
      },
      {
        id: 'hotel-register-hana',
        label: 'Hana and the Copper Heron register',
        position: this.hotelHall.register.position,
        approach: () => this.npcApproach(this.hotelHall.hana, 1.2, 0.5),
        outline: this.hotelRegisterOutline,
        interior: true,
        eligible: () => this.hotelArea === 'lobby' && this.model.snapshot().hotelEntered && !this.model.snapshot().hotelCheckInComplete,
        activate: () => this.openHanaRegister(),
      },
      {
        id: 'hotel-guest-irena', label: 'Irena, long-term guest', position: this.hotelHall.irena.position,
        approach: HOTEL_POSITIONS.irenaApproach, outline: this.hotelIrenaOutline, interior: true,
        eligible: () => this.hotelArea === 'lobby' && this.model.snapshot().hotelCheckInComplete && !this.model.snapshot().daroComplete && !this.model.snapshot().hotelGuestsAsked.includes('irena'),
        activate: () => this.openHotelGuest('irena'),
      },
      {
        id: 'hotel-guest-vesna', label: 'Vesna, breakfast-room guest', position: this.hotelHall.vesna.position,
        approach: HOTEL_POSITIONS.vesnaApproach, outline: this.hotelVesnaOutline, interior: true,
        eligible: () => this.hotelArea === 'lobby' && this.model.snapshot().hotelCheckInComplete && !this.model.snapshot().daroComplete && !this.model.snapshot().hotelGuestsAsked.includes('vesna'),
        activate: () => this.openHotelGuest('vesna'),
      },
      {
        id: 'hotel-daro-window', label: 'Daro at the dining table', position: this.hotelHall.daro.position,
        approach: HOTEL_POSITIONS.daroApproach, outline: this.hotelDaroOutline, interior: true,
        eligible: () => this.hotelArea === 'lobby' && this.model.snapshot().hotelCheckInComplete && !this.model.snapshot().daroComplete,
        activate: () => this.openDaro(),
      },
      {
        id: 'hotel-corridor-entrance', label: 'Go upstairs to the guest corridor', position: this.hotelHall.corridorEntrance.position,
        approach: HOTEL_POSITIONS.corridorEntranceApproach, outline: this.hotelCorridorEntranceOutline, interior: true,
        eligible: () => this.hotelArea === 'lobby' && this.model.snapshot().daroComplete && !this.model.snapshot().hotelCorridorEntered,
        activate: () => this.enterHotelCorridor(),
      },
      {
        id: 'hotel-private-room-door', label: 'Butch’s room', position: this.hotelHall.butchRoomDoor.position,
        approach: HOTEL_POSITIONS.butchRoomDoorApproach, outline: this.hotelButchRoomDoorOutline, interior: true,
        eligible: () => this.hotelArea === 'corridor' && this.model.snapshot().hotelCorridorEntered && !this.model.snapshot().hotelRoomEntered,
        activate: () => this.enterButchRoom(),
      },
      {
        id: 'hotel-evidence-table', label: 'Review the case with Lev', position: this.hotelHall.evidenceTable.position,
        approach: HOTEL_POSITIONS.evidenceApproach, outline: this.hotelEvidenceOutline, interior: true,
        eligible: () => this.hotelArea === 'room'
          && this.model.snapshot().hotelRoomEntered
          && !this.model.snapshot().evidenceTableComplete,
        activate: () => this.openFinalEvidenceTable(),
      },
      {
        id: 'hotel-bed', label: 'Try to sleep', position: this.hotelHall.bed.position,
        approach: HOTEL_POSITIONS.bedApproach, outline: this.hotelBedOutline, interior: true,
        eligible: () => this.hotelArea === 'room' && this.model.snapshot().evidenceTableComplete && !this.model.snapshot().slept,
        activate: () => this.openSleep(),
      },
      {
        id: 'hotel-night-room-door', label: 'Open the room door', position: this.hotelHall.roomExit.position,
        approach: HOTEL_POSITIONS.roomExitApproach, outline: this.hotelRoomExitOutline, interior: true,
        eligible: () => this.hotelArea === 'room'
          && this.model.snapshot().slept
          && !this.model.snapshot().morningStarted
          && !this.model.snapshot().nightRoomLeft,
        activate: () => this.leaveRoomAtNight(),
      },
      {
        id: 'hotel-night-corridor-stairs', label: 'Go downstairs to the dark lobby', position: this.hotelHall.corridorStairExit.position,
        approach: HOTEL_POSITIONS.corridorStairExitApproach, outline: this.hotelCorridorStairOutline, interior: true,
        eligible: () => this.hotelArea === 'corridor'
          && !this.model.snapshot().morningStarted
          && this.model.snapshot().nightRoomLeft
          && !this.model.snapshot().nightLobbyReached,
        activate: () => this.goDownstairsAtNight(),
      },
      {
        id: 'hotel-night-exit', label: 'Leave the Copper Heron', position: this.hotelHall.lobbyExit.position,
        approach: HOTEL_POSITIONS.lobbyExitApproach, outline: this.hotelLobbyExitOutline, interior: true,
        eligible: () => this.hotelArea === 'lobby'
          && !this.model.snapshot().morningStarted
          && this.model.snapshot().nightLobbyReached
          && !this.model.snapshot().nightRouteStarted,
        activate: () => this.leaveHotelAtNight(),
      },
      {
        id: 'night-burning-message', label: 'Burning letters and the cut feed', position: this.groundMessage.position,
        approach: [FIRE_SITE.x, 0.5, FIRE_SITE.approachZ], outline: this.groundMessage.highlight,
        eligible: () => !this.insideHotel && this.model.snapshot().nightRouteStarted && !this.model.snapshot().nightMessageComplete,
        activate: () => this.openNightFire(),
      },
      {
        id: 'hotel-morning-room-door', label: 'Enter the guest corridor', position: this.hotelHall.roomExit.position,
        approach: HOTEL_POSITIONS.roomExitApproach, outline: this.hotelRoomExitOutline, interior: true,
        eligible: () => this.hotelArea === 'room' && this.model.snapshot().morningStarted && !this.model.snapshot().morningLobbyReached,
        activate: () => this.leaveRoomInMorning(),
      },
      {
        id: 'hotel-morning-corridor-stairs', label: 'Go downstairs to the lobby', position: this.hotelHall.corridorStairExit.position,
        approach: HOTEL_POSITIONS.corridorStairExitApproach, outline: this.hotelCorridorStairOutline, interior: true,
        eligible: () => this.hotelArea === 'corridor' && this.model.snapshot().morningRoomLeft && !this.model.snapshot().morningLobbyReached,
        activate: () => this.goDownstairsInMorning(),
      },
      {
        id: 'hana-breakfast', label: 'Hana at the breakfast table', position: this.hotelHall.hana.position,
        approach: HOTEL_POSITIONS.deskApproach, outline: this.hotelRegisterOutline, interior: true,
        eligible: () => this.hotelArea === 'lobby' && this.model.snapshot().morningLobbyReached && !this.model.snapshot().hanaBreakfastAsked,
        activate: () => this.openHanaBreakfast(),
      },
      {
        id: 'hotel-morning-exit', label: 'Return to the square', position: this.hotelHall.lobbyExit.position,
        approach: HOTEL_POSITIONS.lobbyExitApproach, outline: this.hotelLobbyExitOutline, interior: true,
        eligible: () => this.hotelArea === 'lobby' && this.model.snapshot().morningLobbyReached && !this.model.snapshot().morningEvidenceConfirmed,
        activate: () => this.leaveHotelInMorning(),
      },
      {
        id: 'morning-original-reservation', label: 'Nika with the original reservation', position: this.morningNika.position,
        approach: [41.8, 0.5, -8.0], outline: this.morningNikaOutline,
        eligible: () => !this.insideHotel && !this.insideMinistry
          && this.model.snapshot().morningLobbyReached
          && !this.model.snapshot().morningReservationCollected,
        activate: () => this.openMorningReservation(),
      },
      {
        id: 'sunrise-overlook-trail', label: 'Old timber inspection walk above the tunnel cutting', position: this.sunriseOverlook.trailMarker.position,
        approach: SUNRISE_ROUTE_POINTS[0], outline: this.sunriseOverlook.trailOutline,
        eligible: () => !this.insideHotel && this.model.snapshot().morningReservationCollected
          && !this.model.snapshot().sunriseClimbStarted,
        activate: () => this.beginSunriseClimb(),
      },
      {
        id: 'sunrise-overlook-bench', label: 'Sit and watch the sunrise', position: this.sunriseOverlook.bench.position,
        approach: () => [this.preview.player.position.x, this.preview.player.position.y, this.preview.player.position.z],
        outline: this.sunriseOverlook.benchOutline,
        screenRadius: 118,
        eligible: () => this.model.snapshot().sunriseClimbStarted && !this.model.snapshot().sunriseViewed
          && this.overlookTravelElapsed === null,
        activate: () => this.beginSunriseView(),
      },
      {
        id: 'sunrise-overlook-return', label: 'Take the timber walk back to the street', position: this.sunriseOverlook.summitReturnMarker.position,
        approach: () => [this.preview.player.position.x, this.preview.player.position.y, this.preview.player.position.z],
        outline: this.sunriseOverlook.summitReturnOutline,
        screenRadius: 132,
        eligible: () => this.model.snapshot().sunriseViewed && !this.model.snapshot().sunriseReturned
          && this.overlookTravelElapsed === null,
        activate: () => this.beginSunriseDescent(),
      },
      {
        id: 'morning-fire-evidence', label: 'Scorch marks, ash and reconnected feed', position: this.groundMessage.position,
        approach: [FIRE_SITE.x, 0.5, FIRE_SITE.approachZ], outline: this.groundMessage.highlight,
        eligible: () => !this.insideHotel && this.model.snapshot().morningFireEncountered && !this.model.snapshot().morningEvidenceConfirmed,
        activate: () => this.openMorningEvidence(),
      },
      {
        id: 'lev-morning-companion', label: 'Lev, accompanying Butch', position: this.lev.position,
        approach: () => this.morningLevApproach(), outline: this.finalLevOutline,
        eligible: () => !this.insideHotel
          && this.model.snapshot().morningStarted
          && (!this.model.snapshot().sunriseClimbStarted || this.model.snapshot().sunriseReturned)
          && !this.model.snapshot().morningEvidenceConfirmed,
        activate: () => this.openMorningLevReminder(),
      },
      {
        id: 'lev-final-reconstruction', label: 'Compare the fire with Lev’s reservation', position: this.lev.position,
        approach: () => this.morningLevApproach(), outline: this.finalLevOutline,
        eligible: () => !this.insideHotel && this.model.snapshot().morningEvidenceConfirmed
          && this.model.snapshot().sunriseReturned && !this.model.snapshot().levFinalComplete,
        activate: () => this.openLevFinal(),
      },
      {
        id: 'eastbound-train', label: 'Board the eastbound train', position: positionFrom(ENDING_SLICE_POSITIONS.trainDoor),
        approach: [-9.9, 0.5, 29.8], outline: this.finalTrainOutline,
        eligible: () => !this.insideHotel && this.model.snapshot().levFinalComplete && !this.model.snapshot().boardedTrain,
        activate: () => this.openContinuationAndBoard(),
      },
      {
        id: 'alley-men', label: 'Two men sorting hotel bottles', position: this.alleyGangsterA.position,
        approach: [-25.8, 0.5, -4.8], outline: this.alleyGangsterAOutline, ambient: true,
        eligible: () => !this.insideHotel && !this.insideMinistry && !this.insideArchive
          && !this.model.snapshot().boardedTrain && this.alleyGangsterA.visible,
        activate: () => this.openAmbientDialogue(ALLEY_MEN_DIALOGUE),
      },
      {
        // She warms herself in the narrow service gap east of the ministry.
        // Her old grate spot (29.4, -18.0) ended up inside the imported
        // ministry model once the real facade was measured.
        id: 'alley-resident', label: 'Resident crossing the district', position: this.alleyResident.position,
        approach: () => this.npcApproach(this.alleyResident), outline: this.alleyResidentOutline, ambient: true,
        eligible: () => !this.insideHotel && !this.insideMinistry && !this.insideArchive
          && !this.model.snapshot().boardedTrain && this.alleyResident.visible,
        activate: () => this.openAmbientDialogue(ALLEY_RESIDENT_DIALOGUE),
      },
      {
        id: 'campfire-rada', label: 'Rada, sharing tea by the fire', position: this.campfireRada.position,
        approach: [-49.5, 0.5, 34.4], outline: this.campfireRadaOutline, ambient: true,
        eligible: () => this.campfireGatheringVisible(),
        activate: () => this.openCampfireDialogue('rada', CAMPFIRE_RADA_DIALOGUE),
      },
      {
        id: 'campfire-miro', label: 'Miro, tram mechanic off duty', position: this.campfireMiro.position,
        approach: [-55.2, 0.5, 34.1], outline: this.campfireMiroOutline, ambient: true,
        eligible: () => this.campfireGatheringVisible(),
        activate: () => this.openCampfireDialogue('miro', CAMPFIRE_MIRO_DIALOGUE),
      },
      {
        id: 'campfire-seline', label: 'Seline, finishing her first paid week', position: this.campfireSeline.position,
        approach: [-53.0, 0.5, 37.0], outline: this.campfireSelineOutline, ambient: true,
        eligible: () => this.campfireGatheringVisible(),
        activate: () => this.openCampfireSelineDialogue(),
      },
      {
        id: 'campfire-kettle', label: 'Soot-black kettle and shared cups', position: this.campfireKettle.position,
        approach: [-50.4, 0.5, 35.1], outline: this.campfireKettleOutline, ambient: true,
        eligible: () => !this.insideHotel && !this.insideMinistry && !this.insideArchive
          && !this.model.snapshot().boardedTrain && this.campfireKettle.visible,
        activate: () => this.openCampfireDialogue(
          this.campfireGatheringVisible() ? 'kettle' : 'dawn-remains',
          this.campfireGatheringVisible() ? CAMPFIRE_KETTLE_DIALOGUE : DAWN_CAMPFIRE_REMAINS_DIALOGUE,
        ),
      },
    ];

    const exteriorAvailable = () => {
      const state = this.model.snapshot();
      // During the night walk the whole city is asleep: every ambient facade,
      // lamppost, mailbox and bystander stays dark until the morning bell.
      if (state.nightRouteStarted && !state.morningStarted) return false;
      return !this.insideHotel && !this.insideMinistry && !this.insideArchive && !state.boardedTrain;
    };
    const approachFromCurrentSide = (position, distance = 1.7) => () => {
      const direction = this.preview.player.position.clone().sub(position).setY(0);
      if (direction.lengthSq() < 0.01) direction.set(0, 0, 1);
      return position.clone().add(direction.normalize().multiplyScalar(distance)).setY(0.5).toArray();
    };

    const plotCartInteraction = this.interactions.find((interaction) => interaction.id === 'porter-handcart');
    this.interactions.push({
      id: 'world-object-porter-handcart',
      label: 'Olek\'s stained handcart',
      position: positionFrom(OPENING_POSITIONS.cart),
      approach: OPENING_POSITIONS.cartApproach,
      outline: this.cartOutline,
      ambient: true,
      eligible: () => exteriorAvailable() && !plotCartInteraction.eligible(),
      activate: () => this.openRepeatedAmbient('model:porter-handcart', (repeated) => (
        ambientLinesFor({ id: 'porter-handcart' }, this.model.snapshot(), repeated)
      )),
    });

    const ambientModels = CITY_MODELS
      .filter((spec) => AMBIENT_MODEL_IDS.has(spec.id))
      .map((spec) => ({ spec, object: this.preview.scene.getObjectByName(spec.id) }))
      .filter(({ object }) => object);
    // Landmark anchors sit on a visible street facade, never at the model
    // centre. The ministry's recessed doorway is physically correct but is
    // hidden behind a camera-faded foreground block, so its cursor anchor sits
    // on the unobstructed upper-left facade while the approach still resolves
    // to the real doorway.
    const AMBIENT_MODEL_PLACEMENTS = {
      'transit-ministry': {
        position: [38.0, 1.0, -7.0],
        approach: OPENING_POSITIONS.transportApproach,
        screenRadius: 38,
      },
      archive: { position: [-18.0, 2.4, -10.9], approach: [-18.0, 0.5, -9.2] },
    };
    for (const { spec, object } of ambientModels) {
      const placement = AMBIENT_MODEL_PLACEMENTS[spec.id];
      const position = placement ? positionFrom(placement.position) : positionFrom(spec.position);
      this.interactions.push({
        id: `world-object-${spec.id}`,
        label: spec.label,
        position,
        screenRadius: placement?.screenRadius,
        approach: placement
          ? placement.approach
          : approachFromCurrentSide(position, spec.id.includes('tram') || spec.id.includes('car') ? 2.8 : 1.7),
        outline: makePreservingObjectHighlight(object),
        ambient: true,
        eligible: () => exteriorAvailable() && !(spec.id === 'archive'
          && this.model.snapshot().interaction14Complete
          && !this.model.snapshot().archiveEntranceReached),
        activate: () => {
          // Once Olek's route is confirmed, the ministry itself is the way in:
          // clicking the building plays Toma's entrance handoff instead of the
          // generic facade observation.
          if (spec.id === 'transit-ministry') {
            const state = this.model.snapshot();
            if (state.marketLeadComplete && !state.transportEntranceReached) {
              this.openTransportEntrance();
              return;
            }
          }
          this.openRepeatedAmbient(`model:${spec.id}`, (repeated) => (
            ambientLinesFor(spec, this.model.snapshot(), repeated)
          ));
        },
      });
    }

    const prototypeLabels = new Map(
      CITY_MODELS.filter((spec) => spec.category === 'perimeter-prototype').map((spec) => [spec.id, spec.label]),
    );
    for (const spec of PERIMETER_BUILDINGS.filter((entry) => entry.tier !== 'backdrop' && entry.id !== 'copper-heron-hotel')) {
      const building = this.preview.scene.getObjectByName(spec.id);
      if (!building) continue;
      const angle = THREE.MathUtils.degToRad(spec.rotationY);
      const facing = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
      const side = new THREE.Vector3(-facing.z, 0, facing.x);
      const scale = boundaryScaleFor(spec);
      const footprint = PERIMETER_FOOTPRINTS[spec.prototype];
      const width = footprint[0] * scale[0];
      const depth = footprint[1] * scale[2];
      const center = positionFrom(spec.position).setY(0.5);
      const frontCenter = center.clone().add(facing.clone().multiplyScalar(depth * 0.5));
      const facadeOptions = [
        [facing, side, depth * 0.5, width * 0.5],
        [side, facing, width * 0.5, depth * 0.5],
        [side.clone().negate(), facing, width * 0.5, depth * 0.5],
        [facing.clone().negate(), side, depth * 0.5, width * 0.5],
      ];
      let approach = null;
      for (const [normal, tangent, edgeDistance, halfSpan] of facadeOptions) {
        for (let distance = 1.5; distance <= 12 && !approach; distance += 0.5) {
          for (let offset = -halfSpan; offset <= halfSpan; offset += 0.5) {
            const candidate = center.clone()
              .add(normal.clone().multiplyScalar(edgeDistance + distance))
              .add(tangent.clone().multiplyScalar(offset));
            if (isWalkable(candidate.x, candidate.z, this.preview.boundaryObstacles)) {
              approach = candidate;
              break;
            }
          }
        }
        if (approach) break;
      }
      if (!approach) continue;
      const bounds = new THREE.Box3().setFromObject(building);
      const interactionPoint = bounds.getCenter(new THREE.Vector3());
      this.interactions.push({
        id: `world-building-${spec.id}`,
        label: prototypeLabels.get(spec.prototype) || 'Building',
        position: interactionPoint,
        approach: approach.setY(0.5).toArray(),
        screenRadius: 46,
        outline: makePreservingObjectHighlight(building),
        ambient: true,
        eligible: exteriorAvailable,
        activate: () => this.openRepeatedAmbient(`building:${spec.id}`, (repeated) => buildingLinesFor(spec, repeated)),
      });
    }

    this.hotelHall.backgroundDoors.forEach((door, index) => {
      const position = door.position;
      const side = Math.sign(position.x) || 1;
      this.interactions.push({
        id: `hotel-background-room-door-${index + 1}`,
        label: `Occupied guest room ${index + 1}`,
        position,
        approach: [side * 0.55, 0.5, position.z],
        // Eight doors crowd a narrow corridor; a tight cursor radius keeps a
        // click meant for the carpet from becoming another "wrong room" knock.
        screenRadius: 17,
        outline: makeObjectHighlight(door),
        interior: true,
        ambient: true,
        eligible: () => {
          const state = this.model.snapshot();
          return this.hotelArea === 'corridor' && (!state.slept || state.morningStarted);
        },
        activate: () => this.openRepeatedAmbient(`hotel-door:${index}`, (repeated) => [{
          speaker: 'VOICE BEHIND DOOR',
          text: repeated ? 'Some of us work nights. Knock softer.' : 'Wrong room.',
        }]),
      });
    });

    const furniture = this.preview.scene.children.filter((object) => ['street-lamp', 'municipal-mailbox'].includes(object.name));
    furniture.forEach((object, index) => {
      const mailbox = object.name === 'municipal-mailbox';
      const furnitureIndex = furniture.slice(0, index).filter((entry) => entry.name === object.name).length;
      const copy = (mailbox ? MAILBOX_COPY : LAMP_COPY)[furnitureIndex];
      this.interactions.push({
        id: `world-${object.name}-${index + 1}`,
        label: copy[0],
        position: object.position,
        approach: approachFromCurrentSide(object.position, 1.25),
        outline: makePreservingObjectHighlight(object),
        ambient: true,
        eligible: exteriorAvailable,
        activate: () => this.openRepeatedAmbient(`${object.name}:${index}`, (repeated) => [{
          speaker: 'BUTCH',
          text: copy[repeated ? 2 : 1],
        }]),
      });
    });

    const initial = this.model.snapshot();
    if (initial.marketLeadComplete && !initial.transportEntranceReached) {
      this.preview.player.position.copy(positionFrom(OPENING_POSITIONS.transportApproach));
      this.lev.position.copy(positionFrom(OPENING_POSITIONS.levTransportExterior));
      this.preview.stopWalking();
      this.preview.resetCamera();
    }
    if (this.npcLifeQa) {
      this.preview.player.position.set(-15.8, 0.5, 3.6);
      this.lev.position.set(-14.5, 0.5, 4.7);
      this.preview.stopWalking();
      this.preview.resetCamera();
      this.preview.setCameraOverrideTarget(new THREE.Vector3(-21.0, 0.5, 0.8));
      this.preview.camera.zoom = 3.0;
      this.preview.camera.updateProjectionMatrix();
    }
    if (initial.firstTheoryTested) {
      this.preview.player.position.copy(positionFrom(OPENING_POSITIONS.plazaGroovesApproach));
      this.lev.position.set(9.2, 0.5, 11.8);
      this.squareBosko.visible = true;
      this.preview.stopWalking();
      this.preview.resetCamera();
    }
    if (initial.interaction14Complete) this.archiveMilaExterior.visible = !initial.archiveEntranceReached;
    if (initial.interaction14Complete && !initial.archiveEntranceReached) {
      this.preview.player.position.copy(positionFrom(OPENING_POSITIONS.archiveApproach));
      this.lev.position.copy(positionFrom(OPENING_POSITIONS.levArchiveExterior));
      this.preview.stopWalking();
      this.preview.resetCamera();
    }
    if (initial.materialTimelineInspected && !initial.secondTheoryComplete) {
      this.preview.player.position.copy(positionFrom(OPENING_POSITIONS.archiveApproach));
      this.lev.position.copy(positionFrom(OPENING_POSITIONS.levArchiveExterior));
    }
    if (initial.secondTheoryComplete) {
      this.preview.player.position.copy(positionFrom(OPENING_POSITIONS.cutInterfaceApproach));
      this.lev.position.set(3.1, 0.5, 15.8);
      this.cutInterface.group.visible = true;
      this.stageDuskLighting();
    }
    if (initial.lastEvent === 'dusk-campfire-qa-started') {
      this.preview.player.position.set(
        this.alleyQa ? -23.8 : -47.8,
        0.5,
        this.alleyQa ? -2.8 : 36.4,
      );
      this.lev.position.set(
        this.alleyQa ? -22.6 : -46.7,
        0.5,
        this.alleyQa ? -1.7 : 35.2,
      );
      this.preview.stopWalking();
      this.preview.resetCamera();
      if (this.alleyQa) {
        const alleyFocus = this.alleyGangsterA.position.clone()
          .lerp(this.alleyGangsterB.position, 0.5);
        this.preview.setCameraOverrideTarget(alleyFocus);
        this.preview.controls.maxZoom = 4.3;
        this.preview.camera.zoom = 4.1;
        this.preview.camera.updateProjectionMatrix();
        this.preview.controls.update();
      }
    }
    if (initial.interaction22Complete && !initial.hotelEntered) {
      this.preview.player.position.set(47.8, 0.5, -11.4);
      this.lev.position.set(46.5, 0.5, -10.4);
      this.preview.stopWalking();
      this.preview.resetCamera();
    }
    if (initial.mode === 'central-square-night') {
      this.preview.player.position.set(FIRE_SITE.x, 0.5, FIRE_SITE.approachZ);
      this.lev.visible = false;
      this.cutInterface.group.position.copy(this.groundMessage.interfacePosition);
      this.groundMessage.setFirstBurning(true);
      this.setNightDreamRendering(true);
      this.preview.stopWalking();
      this.preview.resetCamera();
      if (['night-exterior-qa-started', 'interaction-29-started'].includes(initial.lastEvent)) {
        this.preview.setCameraOverrideTarget(this.groundMessage.position);
        this.preview.camera.zoom = 3.2;
        this.preview.camera.updateProjectionMatrix();
      }
    }
    if (initial.slept && !initial.morningStarted) {
      this.groundMessage.setFirstBurning(true);
      this.groundMessage.setSecondBurning(false);
    }
    if (initial.morningStarted) this.restoreMorningTrainAtStation();
    if (initial.mode === 'station-approach') {
      this.preview.player.position.set(49.8, 0.5, -12.2);
      this.lev.position.copy(positionFrom(MORNING_LEV_EXTERIOR_START));
      this.startMorningLevFollow();
      this.cutInterface.group.position.copy(this.groundMessage.interfacePosition);
      this.groundMessage.setFirstBurning(true);
      this.groundMessage.setSecondBurning(true);
      this.groundMessage.setBurnedOut();
    }
    if (initial.mode === 'morning-overlook-route') {
      // The focused sunrise slice now begins before the square so the player
      // naturally crosses the previous night's scorch marks en route.
      this.preview.player.position.set(31.8, 0.5, -5.4);
      this.lev.position.set(34.1, 0.5, -4.1);
      this.lev.visible = true;
      this.cutInterface.group.position.copy(this.groundMessage.interfacePosition);
      this.groundMessage.setFirstBurning(true);
      this.groundMessage.setSecondBurning(true);
      this.groundMessage.setBurnedOut();
      this.preview.stopWalking();
      this.preview.resetCamera();
      this.startMorningLevFollow();
    }
    if (initial.mode === 'copper-heron-morning-exterior') {
      this.preview.player.position.set(43.0, 0.5, -8.8);
      this.lev.position.set(44.6, 0.5, -7.4);
      this.lev.visible = true;
      this.preview.stopWalking();
      this.preview.resetCamera();
      this.startMorningLevFollow();
    }
    if (initial.levFinalComplete) {
      this.preview.player.position.set(-8.8, 0.5, 28.8);
      this.preview.resetCamera();
    }
    // Apply the side-quest proof framing after every story-state spawn rule.
    if (this.magicStoneQa) {
      // The proof route frames Seline beneath the ordinary task card; let the
      // pointer pass through that non-interactive HUD so automated and manual
      // QA can still click the real world-space NPC.
      const objectiveCard = document.getElementById('objective-card');
      if (objectiveCard) objectiveCard.style.pointerEvents = 'none';
      const approach = [-53.0, 0.5, 37.0];
      this.preview.player.position.set(approach[0], approach[1], approach[2]);
      this.lev.position.set(approach[0] + 1.2, approach[1], approach[2] + 0.7);
      this.preview.stopWalking();
      this.preview.resetCamera();
      const focus = this.campfireSeline.position.clone();
      const cameraShift = focus.clone().sub(this.preview.controls.target);
      this.preview.controls.target.copy(focus);
      this.preview.camera.position.add(cameraShift);
      this.preview.setCameraOverrideTarget(focus);
      this.preview.controls.maxZoom = 4.3;
      this.preview.camera.zoom = 4.3;
      this.preview.camera.updateProjectionMatrix();
      this.preview.controls.update();
    }
    if (this.characterQa) this.stageCharacterQa();
    this.timeVisual.requestClock(initial.clock, { immediate: true });
    this.initialized = true;
    if (initial.hotelEntered && [
      'copper-heron-lobby',
      'copper-heron-corridor',
      'copper-heron-private-room',
      'copper-heron-night',
      'copper-heron-night-corridor',
      'copper-heron-night-lobby',
      'copper-heron-morning',
      'copper-heron-morning-corridor',
      'copper-heron-morning-lobby',
    ].includes(initial.mode)) {
      this.stageHotelInterior();
    }
    if (initial.transportHallEntered && !initial.firstTheoryTested) this.stageMinistryHall();
    this.updateObjective();
    this.updateOutlines();
    this.updateDiagnosticState();
    if (!initial.marketLeadComplete && !this.characterQa) this.openArrival();
  }

  interactionLocked() {
    return this.characterQa
      || this.evidenceViewer.active
      || this.dialogue.active
      || this.departureElapsed !== null
      || this.guidedWalkActive
      || this.guideElapsed !== null
      || this.levWalkElapsed !== null
      || this.ministryTransitioning
      || this.archiveTransitioning
      || this.hotelTransitioning
      || this.hotelDoorElapsed !== null
      || this.levHotelExitElapsed !== null
      || this.butchBedTransition !== null
      || this.overlookTravelElapsed !== null
      || this.sunriseElapsed !== null
      || this.sunriseTableauHoldElapsed !== null
      || (this.model.snapshot().boardedTrain && !this.model.snapshot().chapterComplete);
  }

  eligibleInteractions() {
    return this.interactions.filter((interaction) => interaction.eligible());
  }

  handlePointerMove(event) {
    if (!this.initialized || this.interactionLocked()) {
      this.hoveredId = null;
      this.preview.renderer.domElement.classList.remove('interaction-hover');
      this.elements.interactionLabel.classList.remove('visible');
      this.updateOutlines();
      return false;
    }
    this.pointerClient = { x: event.clientX, y: event.clientY };
    const point = this.preview.projectPointerToGround(event);
    if (!point) {
      this.hoveredId = null;
      this.updateOutlines();
      this.updateInteractionLabel();
      return false;
    }
    let nearest = null;
    const rect = this.preview.renderer.domElement.getBoundingClientRect();
    const state = this.model.snapshot();
    const summitActive = state.sunriseClimbStarted && !state.sunriseReturned;
    const interactions = summitActive
      ? this.eligibleInteractions().filter((interaction) => interaction.id.startsWith('sunrise-overlook-'))
      : this.eligibleInteractions();
    for (const interaction of interactions) {
      const groundDistance = Math.hypot(point.x - interaction.position.x, point.z - interaction.position.z);
      const projected = interaction.position.clone().project(this.preview.camera);
      const screenX = rect.left + (projected.x + 1) * rect.width * 0.5;
      const screenY = rect.top + (1 - projected.y) * rect.height * 0.5;
      const screenDistance = Math.hypot(event.clientX - screenX, event.clientY - screenY);
      // Ambient scenery uses a tight cursor-only test so merely walking past a
      // lamppost or facade never hijacks a click meant for the ground. Plot
      // interactions keep the generous ground-distance fallback.
      const precise = interaction.ambient === true;
      const screenRadius = interaction.screenRadius ?? (precise ? 30 : (interaction.position.y > 1.5 ? 52 : 38));
      const score = screenDistance <= screenRadius
        ? screenDistance / screenRadius
        : !precise && !summitActive && groundDistance <= INTERACTION_RADIUS
          ? 1 + groundDistance / INTERACTION_RADIUS
          : Infinity;
      if (score < Infinity && (!nearest || score < nearest.score)) {
        nearest = { id: interaction.id, score };
      }
    }
    this.hoveredId = nearest?.id || null;
    this.preview.renderer.domElement.classList.toggle('interaction-hover', Boolean(this.hoveredId));
    this.updateOutlines();
    this.updateInteractionLabel();
    return Boolean(this.hoveredId);
  }

  handlePointerUp(event = null) {
    if (!this.initialized) return false;
    if (this.interactionLocked()) return true;
    const interaction = this.eligibleInteractions().find((entry) => entry.id === this.hoveredId);
    if (!interaction && (this.insideMinistry || this.insideArchive || this.insideHotel)) {
      const point = this.preview.projectPointerToGround({
        clientX: event?.clientX ?? this.pointerClient.x,
        clientY: event?.clientY ?? this.pointerClient.y,
      });
      if (!point) return true;
      const bounds = this.insideHotel
        ? this.hotelArea === 'lobby'
          ? HOTEL_LOBBY_WALK_BOUNDS
          : this.hotelArea === 'room'
            ? HOTEL_ROOM_WALK_BOUNDS
            : HOTEL_CORRIDOR_WALK_BOUNDS
        : this.insideMinistry ? MINISTRY_WALK_BOUNDS : ARCHIVE_WALK_BOUNDS;
      // The ministry's imported stone slab floor tops out at 0.768 m; hosts
      // keep the +0.49 m capsule anchor, so interior walks must target 1.26
      // or every step sinks Butch ankle-deep into the slabs.
      const walkY = this.insideMinistry ? 1.26 : 0.5;
      let targetX = THREE.MathUtils.clamp(point.x, bounds.minX, bounds.maxX);
      let targetZ = THREE.MathUtils.clamp(point.z, bounds.minZ, bounds.maxZ);
      const activeInteriorObstacles = this.insideArchive
        ? ARCHIVE_FURNITURE_OBSTACLES
        : this.insideMinistry
          ? MINISTRY_FURNITURE_OBSTACLES
          : this.insideHotel && this.hotelArea === 'lobby'
            ? HOTEL_LOBBY_FURNITURE_OBSTACLES
            : this.insideHotel && this.hotelArea === 'room'
              ? HOTEL_ROOM_FURNITURE_OBSTACLES
              : [];
      if (activeInteriorObstacles.length) {
        // The reading-room furniture is one fused kit, so collision is a small
        // set of authored footprint boxes (already padded by the actor radius):
        // map board, west desks, east counter and shelves, north shelf wall.
        for (const box of activeInteriorObstacles) {
          if (targetX <= box.minX || targetX >= box.maxX || targetZ <= box.minZ || targetZ >= box.maxZ) continue;
          const pushWest = targetX - box.minX;
          const pushEast = box.maxX - targetX;
          const pushNorth = targetZ - box.minZ;
          const pushSouth = box.maxZ - targetZ;
          const smallest = Math.min(pushWest, pushEast, pushNorth, pushSouth);
          if (smallest === pushWest) targetX = box.minX;
          else if (smallest === pushEast) targetX = box.maxX;
          else if (smallest === pushNorth) targetZ = box.minZ;
          else targetZ = box.maxZ;
        }
      }
      const target = [targetX, walkY, targetZ];
      this.walkInsideMinistry(target);
      return true;
    }
    if (!interaction) {
      const state = this.model.snapshot();
      // The summit is an authored micro-scene, not part of the street navmesh.
      // Swallow background clicks here so the street-level raycast cannot send
      // Butch into the surrounding rocks or leave him without a descent route.
      if (state.sunriseClimbStarted && !state.sunriseReturned) {
        this.preview.stopWalking();
        return true;
      }
      return false;
    }
    this.elements.interactionLabel.classList.remove('visible');
    this.preview.renderer.domElement.classList.remove('interaction-hover');
    const approachValues = typeof interaction.approach === 'function'
      ? interaction.approach()
      : interaction.approach;
    const approach = positionFrom(approachValues);
    const alreadyAtApproach = this.preview.player.position.distanceTo(approach) < 0.8;
    let started = false;
    if (alreadyAtApproach) {
      this.activateInteraction(interaction);
      started = true;
    } else {
      started = interaction.interior
        ? this.walkInsideMinistry(approachValues, () => this.activateInteraction(interaction))
        : this.preview.walkTo(
          approachValues[0],
          approachValues[2],
          () => this.activateInteraction(interaction),
        );
    }
    if (started) {
      const ids = this.npcIdsForInteraction(interaction.id);
      this.activeNpcConversationIds = new Set(ids);
      this.activeNpcConversationId = ids[0] || null;
      interaction.beginApproach?.();
    }
    return true;
  }

  walkInsideMinistry(position, onArrival = null) {
    const requestedTarget = positionFrom(position);
    let path = [requestedTarget];
    if (this.insideMinistry) {
      path = findInteriorPath(
        this.preview.player.position,
        requestedTarget,
        MINISTRY_WALK_BOUNDS,
        MINISTRY_FURNITURE_OBSTACLES,
      );
    } else if (this.insideArchive) {
      path = findInteriorPath(
        this.preview.player.position,
        requestedTarget,
        ARCHIVE_WALK_BOUNDS,
        ARCHIVE_FURNITURE_OBSTACLES,
      );
    } else if (this.insideHotel) {
      const bounds = this.hotelArea === 'lobby'
        ? HOTEL_LOBBY_WALK_BOUNDS
        : this.hotelArea === 'room'
          ? HOTEL_ROOM_WALK_BOUNDS
          : HOTEL_CORRIDOR_WALK_BOUNDS;
      const obstacles = this.hotelArea === 'lobby'
        ? HOTEL_LOBBY_FURNITURE_OBSTACLES
        : this.hotelArea === 'room'
          ? HOTEL_ROOM_FURNITURE_OBSTACLES
          : [];
      path = findInteriorPath(this.preview.player.position, requestedTarget, bounds, obstacles);
    }
    if (path.length === 0) return false;
    const target = path[path.length - 1];
    this.preview.path = path;
    this.preview.pathArrival = onArrival;
    this.preview.destinationMarker.position.set(target.x, target.y + 0.02, target.z);
    this.preview.destinationMarker.visible = true;
    return true;
  }

  enforceHotelFurnitureCollision() {
    if (!this.insideHotel || !['lobby', 'room'].includes(this.hotelArea)) return null;
    const bounds = this.hotelArea === 'lobby' ? HOTEL_LOBBY_WALK_BOUNDS : HOTEL_ROOM_WALK_BOUNDS;
    const obstacles = this.hotelArea === 'lobby'
      ? HOTEL_LOBBY_FURNITURE_OBSTACLES
      : HOTEL_ROOM_FURNITURE_OBSTACLES;
    const blockedBy = hotelFurnitureAt(this.preview.player.position, this.hotelArea);
    if (!blockedBy) return null;
    const safe = clampInteriorPoint(this.preview.player.position, bounds, obstacles);
    this.preview.player.position.copy(safe);
    // A stale destination can immediately drive the player back through the
    // same mesh on the next frame. Cancel it when the safety collision fires;
    // the next click will be routed by findInteriorPath from the safe edge.
    this.preview.stopWalking();
    return blockedBy;
  }

  handleKeyDown(event) {
    if (event.key === 'Tab') {
      event.preventDefault();
      this.tabHeld = true;
      this.updateOutlines();
      return true;
    }
    if (event.code === 'KeyE' || event.key === 'Enter') {
      event.preventDefault();
      if (this.dialogue.active) {
        this.dialogue.handleAdvance();
        return true;
      }
      if (this.interactionLocked()) return true;
      const nearest = this.eligibleInteractions()
        .map((interaction) => ({
          interaction,
          distance: this.preview.player.position.distanceTo(interaction.position),
        }))
        .filter(({ distance }) => distance <= INTERACTION_RADIUS)
        .sort((a, b) => a.distance - b.distance)[0]?.interaction;
      if (!nearest) return false;
      this.hoveredId = nearest.id;
      this.handlePointerUp();
      return true;
    }
    return this.interactionLocked();
  }

  handleKeyUp(event) {
    if (event.key !== 'Tab') return false;
    event.preventDefault();
    this.tabHeld = false;
    this.updateOutlines();
    return true;
  }

  openArrival() {
    this.dialogue.show(ARRIVAL_DIALOGUE, {
      onComplete: () => {
        this.model.chooseArrival('arrival-nerve');
        this.beginTrainDeparture();
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  beginTrainDeparture() {
    this.preview.stopWalking();
    const roots = [
      this.preview.scene.getObjectByName('municipal-tram'),
      this.preview.scene.getObjectByName('municipal-tram-car-02'),
      this.preview.scene.getObjectByName('municipal-tram-car-03'),
    ].filter(Boolean);
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
    this.moveLevTo(
      this.preview.player.position.clone().addScaledVector(towardButch, -1.5),
      1.9,
      () => this.openLevIntroduction(),
    );
    this.updateObjective();
    this.updateOutlines();
  }

  beginEdaApproach() {
    this.moveLevTo(OPENING_POSITIONS.levEda, 2.4);
  }

  openLevIntroduction() {
    this.preview.setCameraOverrideTarget(this.preview.player.position.clone().lerp(this.lev.position, 0.36));
    let firstAnswered = false;
    let finishing = false;
    this.dialogue.show(LEV_INTRO_DIALOGUE, {
      onChoice: (choiceId) => {
        if (LEV_FIRST_RESPONSES[choiceId] && !firstAnswered) {
          firstAnswered = true;
          this.model.advanceDialogueTime(`lev-first-${choiceId}`);
          return [
            ...LEV_FIRST_RESPONSES[choiceId],
            ...LEV_COMMON,
            arrivalCallback(this.model.snapshot().arrivalApproach),
            levTopicMenu(this.levTopics),
          ];
        }
        if (!LEV_TOPIC_RESPONSES[choiceId]) return [];
        if (choiceId === 'lev-now') {
          finishing = true;
          this.model.advanceDialogueTime('lev-begin-investigation');
          return LEV_TOPIC_RESPONSES[choiceId];
        }
        this.levTopics.add(choiceId);
        this.model.advanceDialogueTime(`lev-topic-${choiceId}`);
        return [...LEV_TOPIC_RESPONSES[choiceId], levTopicMenu(this.levTopics)];
      },
      onComplete: () => {
        if (!finishing) return;
        this.preview.setCameraOverrideTarget(null);
        this.model.completeLevIntroduction();
        this.beginGuidedWalk();
      },
    });
    this.updateObjective();
  }

  beginGuidedWalk() {
    const started = this.preview.walkTo(
      OPENING_POSITIONS.levInterview[0] - 1.8,
      OPENING_POSITIONS.levInterview[2] + 1.2,
      () => this.openWorldBriefing(),
    );
    if (!started || !this.model.beginGuide()) return;
    this.guidedWalkActive = true;
    this.hoveredId = null;
    this.levOutline.visible = false;
    this.guideElapsed = 0;
    this.guideStart = this.lev.position.clone();
    this.updateObjective();
    this.updateInteractionLabel();
  }

  openWorldBriefing() {
    this.guidedWalkActive = false;
    this.preview.stopWalking();
    this.preview.setCameraOverrideTarget(this.preview.player.position.clone().lerp(this.lev.position, 0.3));
    this.dialogue.show(WORLD_BRIEFING_DIALOGUE, {
      onComplete: () => {
        this.preview.setCameraOverrideTarget(null);
        this.model.completeExplorationBriefing();
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  openSeam() {
    this.preview.stopWalking();
    // The seam is deliberately quiet at district scale. When the player starts
    // examining it, use the dialogue camera to make the wet, cleaned join the
    // subject instead of leaving it lost in the whole civic square.
    const seamFocus = new THREE.Vector3();
    for (const point of this.seam.points) seamFocus.add(point);
    seamFocus.multiplyScalar(1 / this.seam.points.length);
    this.preview.setCameraOverrideTarget(seamFocus);
    let finished = false;
    const currentSeamMenu = () => seamMenu(this.model.snapshot().seamObservations, this.seamTestingAsked);
    this.dialogue.show([...SEAM_DIALOGUE, currentSeamMenu()], {
      onChoice: (choiceId) => {
        const observation = {
          'seam-geometry': 'geometry',
          'seam-fuel': 'fuel',
          'seam-cleaning': 'cleaning',
        }[choiceId];
        if (observation) {
          this.model.observeSeam(observation);
          return [...SEAM_TOPIC_RESPONSES[choiceId], currentSeamMenu()];
        }
        if (choiceId === 'seam-testing') {
          this.seamTestingAsked = true;
          this.model.advanceDialogueTime('seam-testing-method');
          return [...SEAM_TOPIC_RESPONSES[choiceId], currentSeamMenu()];
        }
        if (choiceId === 'seam-conclude') {
          if (!this.model.snapshot().seamObservations.length) {
            return [{ speaker: 'LEV', text: 'Look at the route, the smell, or the cleaned edge before you decide.' }, currentSeamMenu()];
          }
          return [seamInferenceMenu()];
        }
        const inference = {
          'seam-deliberate': 'deliberate',
          'seam-cart-leak': 'cart-leak',
          'seam-reserve': 'reserve-judgment',
        }[choiceId];
        if (!inference || !this.model.concludeSeam(inference)) return [];
        finished = true;
        this.showLeadCard({
          title: 'NEW QUESTION',
          detail: 'THE OIL LINE WAS PLACED BY HAND · ASK EDA WHO SOLD IT',
        });
        return [...SEAM_INFERENCE_RESPONSES[choiceId], ...SEAM_CONCLUSION];
      },
      onComplete: () => {
        if (!finished) {
          this.preview.setCameraOverrideTarget(null);
          return;
        }
        this.hoveredId = null;
        this.seam.outline.visible = false;
        this.preview.setCameraOverrideTarget(null);
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  showLeadCard({ title, detail }) {
    const bubble = document.getElementById('task-bubble');
    if (!bubble) return;
    bubble.querySelector('b').textContent = title;
    bubble.querySelector('span').textContent = detail;
    this.taskBubbleElapsed = 0;
    bubble.classList.add('visible');
  }

  openEda() {
    this.preview.stopWalking();
    if (this.levWalkElapsed !== null) {
      this.levWalkOnComplete = () => this.openEda();
      return;
    }
    this.preview.setCameraOverrideTarget(this.preview.player.position.clone().lerp(this.eda.position, 0.45));
    let finished = false;
    this.dialogue.show(EDA_OPENING, {
      onChoice: (choiceId) => {
        const approach = {
          'eda-direct': 'direct',
          'eda-patient': 'patient',
          'eda-pressuring': 'pressuring',
        }[choiceId];
        if (approach && this.model.approachEda(approach)) {
          const state = this.model.snapshot();
          return [...EDA_APPROACH_RESPONSES[choiceId], edaTopicMenu(state.edaCooperation, state.edaTopics)];
        }
        if (EDA_TOPIC_RESPONSES[choiceId]) {
          this.model.noteEdaTopic(choiceId.replace('eda-', ''));
          const state = this.model.snapshot();
          return [...EDA_TOPIC_RESPONSES[choiceId], edaTopicMenu(state.edaCooperation, state.edaTopics)];
        }
        if (choiceId !== 'eda-record') return [];
        this.model.obtainEdaRecord();
        const cooperation = this.model.snapshot().edaCooperation;
        finished = true;
        return [...edaRecordResponse(cooperation), edaExitLine(cooperation)];
      },
      onComplete: () => {
        if (!finished) return;
        this.preview.setCameraOverrideTarget(null);
        this.hoveredId = null;
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  openCart() {
    this.preview.stopWalking();
    this.dialogue.show(CART_DIALOGUE, {
      onComplete: () => {
        this.model.inspectCart();
        this.hoveredId = null;
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  openVendor(id, lines) {
    this.preview.stopWalking();
    this.dialogue.show(lines, {
      onComplete: () => {
        this.vendorSpoken.add(id);
        this.model.advanceDialogueTime(`${id}-vendor-conversation`);
        this.hoveredId = null;
        this.updateOutlines();
      },
    });
  }

  openOlek() {
    this.preview.stopWalking();
    this.preview.setCameraOverrideTarget(this.preview.player.position.clone().lerp(this.olek.position, 0.45));
    let finished = false;
    this.dialogue.show([...OLEK_OPENING, olekTopicMenu(this.model.snapshot().olekTopics)], {
      onChoice: (choiceId) => {
        if (OLEK_TOPIC_RESPONSES[choiceId]) {
          this.model.noteOlekTopic(choiceId.replace('olek-', ''));
          return [...OLEK_TOPIC_RESPONSES[choiceId], olekTopicMenu(this.model.snapshot().olekTopics)];
        }
        if (choiceId !== 'olek-done') return [];
        this.model.completeOlekRoute();
        finished = true;
        return OLEK_CONCLUSION;
      },
      onComplete: () => {
        if (!finished) return;
        this.beginPostOlekScoreTransition();
        this.preview.setCameraOverrideTarget(null);
        this.hoveredId = null;
        this.updateObjective();
        this.updateOutlines();
        this.showLeadCard(POST_OLEK_INTERACTION_HINT);
      },
    });
  }

  openBottle() {
    this.preview.stopWalking();
    let finished = false;
    this.dialogue.show(BOTTLE_DIALOGUE, {
      onChoice: (choiceId) => {
        const inference = {
          'bottle-same-order': 'same-order',
          'bottle-overclaimed': 'overclaimed',
          'bottle-bounded': 'bounded',
        }[choiceId];
        if (!inference || !this.model.inspectBottle(inference)) return [];
        finished = true;
        return BOTTLE_RESPONSES[choiceId];
      },
      onComplete: () => {
        if (!finished) return;
        this.hoveredId = null;
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  openTransportEntrance() {
    this.preview.stopWalking();
    if (!this.model.reachTransportEntrance()) return;
    const lines = this.model.snapshot().solventBottleObserved
      ? TRANSPORT_ENTRANCE_WITH_BOTTLE
      : TRANSPORT_ENTRANCE_NO_BOTTLE;
    this.dialogue.show(lines, {
      onComplete: () => {
        this.hoveredId = null;
        this.enterMinistryHall();
      },
    });
    this.updateObjective();
  }

  enterMinistryHall() {
    if (!this.model.enterTransportHall()) return;
    this.stageMinistryHall();
  }

  stageMinistryHall() {
    if (this.insideMinistry || this.ministryTransitioning) return;
    this.ministryTransitioning = true;
    this.preview.stopWalking();
    this.elements.blackout?.classList.add('visible');
    setTimeout(() => {
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
      this.preview.player.position.copy(positionFrom(MINISTRY_POSITIONS.playerStart));
      this.lev.position.copy(positionFrom(MINISTRY_POSITIONS.lev));
      this.preview.scene.background.setHex(0x000000);
      this.preview.scene.fog.color.setHex(0x000000);
      this.preview.scene.fog.density = 0.0015;
      this.preview.renderer.toneMappingExposure = 1.26;
      this.preview.resetCamera();
      this.ministryCameraLimitsBefore ??= {
        minZoom: this.preview.controls.minZoom,
        maxZoom: this.preview.controls.maxZoom,
      };
      this.preview.controls.maxZoom = 4.2;
      // Frame the actual service windows, not only the public floor. The old
      // tight crop hid Sava and Nika behind the roof/header until a dialogue
      // camera snapped over, making the next interaction unreadable.
      this.preview.setCameraOverrideTarget(new THREE.Vector3(0, 0.82, -1.35));
      this.preview.camera.zoom = 3.3;
      this.preview.camera.updateProjectionMatrix();
      this.preview.controls.update();
      this.insideMinistry = true;
      this.startMorningLevFollow();
      this.ministryTransitioning = false;
      this.elements.blackout?.classList.remove('visible');
      this.updateObjective();
      this.updateOutlines();
      this.updateDiagnosticState();
    }, 320);
  }

  exitMinistryHall() {
    if (!this.insideMinistry || this.ministryTransitioning) return;
    this.ministryTransitioning = true;
    this.preview.stopWalking();
    this.elements.blackout?.classList.add('visible');
    setTimeout(() => {
      this.ministryHall.group.visible = false;
      for (const entry of this.ministryExteriorVisibility) entry.object.visible = entry.visible;
      this.preview.player.visible = true;
      this.lev.visible = true;
      this.preview.player.position.copy(positionFrom(OPENING_POSITIONS.transportApproach));
      this.lev.position.copy(positionFrom(OPENING_POSITIONS.levTransportExterior));
      this.squareBosko.visible = this.model.snapshot().firstTheoryTested;
      this.timeVisual.request(this.model.snapshot().clock.period, { immediate: true });
      this.preview.setCameraOverrideTarget(null);
      if (this.ministryCameraLimitsBefore) {
        this.preview.controls.minZoom = this.ministryCameraLimitsBefore.minZoom;
        this.preview.controls.maxZoom = this.ministryCameraLimitsBefore.maxZoom;
        this.ministryCameraLimitsBefore = null;
      }
      this.preview.resetCamera();
      this.insideMinistry = false;
      this.ministryTransitioning = false;
      this.elements.blackout?.classList.remove('visible');
      this.updateObjective();
      this.updateOutlines();
      this.updateDiagnosticState();
    }, 320);
  }

  openArchiveEntrance() {
    this.preview.stopWalking();
    if (!this.model.reachArchiveEntrance()) return;
    this.preview.setCameraOverrideTarget(
      this.preview.player.position.clone().lerp(this.archiveMilaExterior.position, 0.42),
    );
    this.dialogue.show(ARCHIVE_ENTRANCE_DIALOGUE, {
      onComplete: () => {
        this.preview.setCameraOverrideTarget(null);
        this.model.enterArchive();
        this.hoveredId = null;
        this.stageArchiveHall();
      },
    });
    this.updateObjective();
  }

  stageArchiveHall() {
    if (this.insideArchive || this.archiveTransitioning) return;
    this.archiveTransitioning = true;
    this.preview.stopWalking();
    this.elements.blackout?.classList.add('visible');
    setTimeout(() => {
      const keepVisible = new Set([
        this.archiveHall.group,
        this.preview.player,
        this.lev,
        this.preview.navPlane,
        this.preview.destinationMarker,
      ]);
      this.archiveExteriorVisibility = this.preview.scene.children
        .filter((object) => !keepVisible.has(object) && !object.isLight && !object.isCamera)
        .map((object) => ({ object, visible: object.visible }));
      for (const entry of this.archiveExteriorVisibility) entry.object.visible = false;

      this.archiveHall.group.visible = true;
      this.archiveHall.timeline.visible = this.model.snapshot().petarInterviewComplete;
      this.preview.player.visible = true;
      this.lev.visible = true;
      this.preview.player.position.copy(positionFrom(ARCHIVE_POSITIONS.playerStart));
      this.lev.position.copy(positionFrom(ARCHIVE_POSITIONS.lev));
      this.preview.scene.background.setHex(0x000000);
      this.preview.scene.fog.color.setHex(0x000000);
      this.preview.scene.fog.density = 0.0015;
      this.preview.renderer.toneMappingExposure = 1.22;
      this.preview.setCameraOffsetOverride(null);
      this.preview.resetCamera();
      this.preview.camera.zoom = 3.7;
      this.preview.camera.updateProjectionMatrix();
      this.insideArchive = true;
      this.archiveTransitioning = false;
      this.elements.blackout?.classList.remove('visible');
      this.updateObjective();
      this.updateOutlines();
      this.updateDiagnosticState();
    }, 320);
  }

  exitArchiveHall() {
    if (!this.insideArchive || this.archiveTransitioning) return;
    this.archiveTransitioning = true;
    this.preview.stopWalking();
    this.elements.blackout?.classList.add('visible');
    setTimeout(() => {
      this.archiveHall.group.visible = false;
      for (const entry of this.archiveExteriorVisibility) entry.object.visible = entry.visible;
      this.archiveMilaExterior.visible = false;
      this.preview.player.visible = true;
      this.lev.visible = true;
      this.preview.player.position.copy(positionFrom(OPENING_POSITIONS.archiveApproach));
      this.lev.position.copy(positionFrom(OPENING_POSITIONS.levArchiveExterior));
      this.timeVisual.request(this.model.snapshot().clock.period, { immediate: true });
      this.preview.resetCamera();
      this.insideArchive = false;
      this.archiveTransitioning = false;
      this.elements.blackout?.classList.remove('visible');
      this.updateObjective();
      this.updateOutlines();
      this.updateDiagnosticState();
    }, 320);
  }

  stageDuskLighting() {
    this.timeVisual.request(this.model.snapshot().clock.period);
  }

  openQueueDispenser() {
    this.preview.stopWalking();
    this.ministryHall.queueLever.rotation.z = -1.08;
    this.ministryHall.queueTicket.visible = true;
    setTimeout(() => {
      this.ministryHall.queueLever.rotation.z = -0.45;
    }, 360);
    this.dialogue.show(TRANSPORT_QUEUE_DIALOGUE, {
      onComplete: () => {
        this.model.takeTransportNumber('M-17');
        this.hoveredId = null;
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  openSava() {
    this.preview.stopWalking();
    this.preview.setCameraOverrideTarget(
      this.preview.player.position.clone().lerp(this.ministryHall.sava.position, 0.42),
    );
    let finished = false;
    const menu = () => savaTopicMenu(this.model.snapshot().savaTopics);
    this.dialogue.show([...SAVA_NEXT_INTERACTION, ...SAVA_OPENING, menu()], {
      onChoice: (choiceId) => {
        if (SAVA_TOPIC_RESPONSES[choiceId]) {
          this.model.noteSavaTopic(choiceId.replace('sava-', ''));
          return [...SAVA_TOPIC_RESPONSES[choiceId], menu()];
        }
        if (choiceId !== 'sava-done') return [];
        this.model.completeSava();
        finished = true;
        return SAVA_CONCLUSION;
      },
      onComplete: () => {
        if (!finished) return;
        this.preview.setCameraOverrideTarget(null);
        this.hoveredId = null;
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  openBoskoQueue() {
    this.preview.stopWalking();
    this.dialogue.show(BOSKO_QUEUE_DIALOGUE, {
      onComplete: () => {
        this.model.askBoskoInQueue();
        this.hoveredId = null;
        this.updateOutlines();
      },
    });
  }

  openNika() {
    this.preview.stopWalking();
    this.preview.setCameraOverrideTarget(
      this.preview.player.position.clone().lerp(this.ministryHall.nika.position, 0.42),
    );
    let finished = false;
    const menu = () => nikaTopicMenu(this.model.snapshot().nikaTopics);
    this.dialogue.show([...NIKA_OPENING, menu()], {
      onChoice: (choiceId) => {
        if (NIKA_TOPIC_RESPONSES[choiceId]) {
          this.model.noteNikaTopic(choiceId.replace('nika-', ''));
          return [...NIKA_TOPIC_RESPONSES[choiceId], menu()];
        }
        if (choiceId !== 'nika-done') return [];
        this.model.completeNika();
        this.ministryHall.discardedPrint.visible = true;
        finished = true;
        return NIKA_CONCLUSION;
      },
      onComplete: () => {
        if (!finished) return;
        this.preview.setCameraOverrideTarget(null);
        this.hoveredId = null;
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  openDiscardedPrint() {
    this.preview.stopWalking();
    this.dialogue.show(DISCARDED_PRINT_DIALOGUE, {
      onComplete: () => {
        this.model.inspectDiscardedPrint();
        this.model.leaveMinistryForTheory();
        this.hoveredId = null;
        this.updateObjective();
        this.updateOutlines();
        this.exitMinistryHall();
      },
    });
  }

  openFirstTheory() {
    this.preview.stopWalking();
    let finished = false;
    this.preview.setCameraOverrideTarget(
      this.preview.player.position.clone().lerp(this.lev.position, 0.44),
    );
    this.dialogue.show(FIRST_THEORY_OPENING, {
      onChoice: (choiceId) => {
        const theory = {
          'theory-market-ministry': 'market-ministry',
          'theory-code-cover': 'code-cover',
          'theory-planned-handoff': 'planned-handoff',
        }[choiceId];
        if (!theory || !this.model.testFirstTheory(theory)) return [];
        finished = true;
        return [...FIRST_THEORY_RESPONSES[choiceId], ...FIRST_THEORY_CONCLUSION];
      },
      onComplete: () => {
        if (!finished) return;
        this.preview.setCameraOverrideTarget(null);
        this.squareBosko.visible = true;
        this.hoveredId = null;
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  openSquareBosko() {
    this.preview.stopWalking();
    let selected = false;
    this.preview.setCameraOverrideTarget(
      this.preview.player.position.clone().lerp(this.squareBosko.position, 0.44),
    );
    this.dialogue.show(BOSKO_SQUARE_OPENING, {
      onChoice: (choiceId) => {
        if (!BOSKO_SQUARE_RESPONSES[choiceId] || selected) return [];
        selected = true;
        return [...BOSKO_SQUARE_RESPONSES[choiceId], ...BOSKO_SQUARE_CONCLUSION];
      },
      onComplete: () => {
        if (!selected || !this.model.completeSquareBosko()) return;
        this.preview.setCameraOverrideTarget(null);
        this.hoveredId = null;
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  openPlazaGrooves() {
    this.preview.stopWalking();
    let finished = false;
    const menu = () => plazaGrooveMenu(this.model.snapshot().grooveObservations);
    this.preview.setCameraOverrideTarget(positionFrom(OPENING_POSITIONS.plazaGrooves));
    this.dialogue.show([...PLAZA_GROOVE_OPENING, menu()], {
      onChoice: (choiceId) => {
        const observation = {
          'groove-rows': 'rows',
          'groove-spacing': 'spacing',
          'groove-feed-gap': 'feed-gap',
        }[choiceId];
        if (observation) {
          this.model.observeGroove(observation);
          return [...PLAZA_GROOVE_RESPONSES[choiceId], menu()];
        }
        if (choiceId !== 'groove-conclude') return [];
        if (!this.model.concludeGrooves()) return [...PLAZA_GROOVE_BLOCKED, menu()];
        finished = true;
        return PLAZA_GROOVE_CONCLUSION;
      },
      onComplete: () => {
        if (!finished) return;
        this.preview.setCameraOverrideTarget(null);
        this.archiveMilaExterior.visible = true;
        this.hoveredId = null;
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  openAnaMapHelp() {
    this.preview.stopWalking();
    this.dialogue.show(ANA_MAP_HELP_DIALOGUE, {
      onComplete: () => {
        this.model.askAnaForMapHelp();
        this.hoveredId = null;
        this.updateOutlines();
      },
    });
  }

  openArchiveMap() {
    this.preview.stopWalking();
    this.preview.setCameraOverrideTarget(this.archiveHall.mapTable.position);
    this.evidenceViewer.open(CHAPTER3_DOCUMENTS.ARCHIVE_FEED_PLAN, {
      onClose: () => this.openArchiveMapDialogue(),
    });
  }

  openArchiveMapDialogue() {
    let selected = false;
    this.dialogue.show(ARCHIVE_MAP_DIALOGUE, {
      onChoice: (choiceId) => {
        if (!ARCHIVE_MAP_RESPONSES[choiceId] || selected) return [];
        selected = true;
        return [...ARCHIVE_MAP_RESPONSES[choiceId], ...ARCHIVE_MAP_CONCLUSION];
      },
      onComplete: () => {
        if (!selected || !this.model.inspectArchiveMap()) return;
        this.preview.setCameraOverrideTarget(null);
        this.hoveredId = null;
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  openMaintenanceOrder() {
    this.preview.stopWalking();
    this.preview.setCameraOverrideTarget(this.archiveHall.workOrderDesk.position);
    this.evidenceViewer.open(CHAPTER3_DOCUMENTS.MAINTENANCE_ORDER_C441, {
      onClose: () => this.openMaintenanceOrderDialogue(),
    });
  }

  openMaintenanceOrderDialogue() {
    this.dialogue.show(MAINTENANCE_ORDER_DIALOGUE, {
      onComplete: () => {
        this.model.inspectMaintenanceOrder();
        this.preview.setCameraOverrideTarget(null);
        this.hoveredId = null;
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  openPetar() {
    this.preview.stopWalking();
    let finished = false;
    const menu = () => petarTopicMenu(this.model.snapshot().petarTopics);
    this.preview.setCameraOverrideTarget(
      this.preview.player.position.clone().lerp(this.archiveHall.petar.position, 0.42),
    );
    this.dialogue.show([...PETAR_OPENING, menu()], {
      onChoice: (choiceId) => {
        if (PETAR_TOPIC_RESPONSES[choiceId]) {
          this.model.notePetarTopic(choiceId.replace('petar-', ''));
          return [...PETAR_TOPIC_RESPONSES[choiceId], menu()];
        }
        if (choiceId !== 'petar-done') return [];
        this.model.completePetarInterview();
        this.archiveHall.timeline.visible = true;
        finished = true;
        return PETAR_CONCLUSION;
      },
      onComplete: () => {
        if (!finished) return;
        this.preview.setCameraOverrideTarget(null);
        this.hoveredId = null;
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  openMaterialTimeline() {
    this.preview.stopWalking();
    this.preview.setCameraOverrideTarget(this.archiveHall.timeline.position);
    this.evidenceViewer.open(CHAPTER3_DOCUMENTS.MATERIAL_TIMELINE, {
      onClose: () => this.openMaterialTimelineDialogue(),
    });
  }

  openMaterialTimelineDialogue() {
    this.dialogue.show(MATERIAL_TIMELINE_DIALOGUE, {
      onComplete: () => {
        this.model.inspectMaterialTimeline();
        this.preview.setCameraOverrideTarget(null);
        this.hoveredId = null;
        this.exitArchiveHall();
      },
    });
  }

  openSecondTheory() {
    this.preview.stopWalking();
    let finished = false;
    const menu = () => secondTheoryMenu(this.model.snapshot().secondTheoriesTested);
    this.preview.setCameraOverrideTarget(
      this.preview.player.position.clone().lerp(this.lev.position, 0.44),
    );
    this.dialogue.show([...SECOND_THEORY_OPENING, menu()], {
      onChoice: (choiceId) => {
        const theory = choiceId.startsWith('second-') && choiceId !== 'second-conclude'
          ? choiceId.replace('second-', '')
          : null;
        if (theory && SECOND_THEORY_RESPONSES[choiceId]) {
          this.model.testSecondTheory(theory);
          return [...SECOND_THEORY_RESPONSES[choiceId], menu()];
        }
        if (choiceId !== 'second-conclude') return [];
        this.model.completeSecondTheory();
        finished = true;
        return SECOND_THEORY_CONCLUSION;
      },
      onComplete: () => {
        if (!finished) return;
        this.preview.setCameraOverrideTarget(null);
        this.cutInterface.group.visible = true;
        this.stageDuskLighting();
        this.hoveredId = null;
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  openCutInterface() {
    this.preview.stopWalking();
    this.butchActionOverride = 'crouch';
    let finished = false;
    const menu = () => cutInterfaceMenu(this.model.snapshot().cutInterfaceObservations);
    this.preview.setCameraOverrideTarget(positionFrom(OPENING_POSITIONS.cutInterface));
    this.dialogue.show([...CUT_INTERFACE_OPENING, menu()], {
      onChoice: (choiceId) => {
        const observation = {
          'cut-cut': 'cut',
          'cut-placement': 'placement',
          'cut-reconnection': 'reconnection',
        }[choiceId];
        if (observation) {
          this.model.observeCutInterface(observation);
          return [...CUT_INTERFACE_RESPONSES[choiceId], menu()];
        }
        if (choiceId !== 'cut-conclude') return [];
        if (!this.model.concludeCutInterface()) return [...CUT_INTERFACE_BLOCKED, menu()];
        finished = true;
        return CUT_INTERFACE_CONCLUSION;
      },
      onComplete: () => {
        this.butchActionOverride = null;
        if (!finished) return;
        this.preview.setCameraOverrideTarget(null);
        this.hoveredId = null;
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  enterCopperHeron() {
    this.preview.stopWalking();
    if (!this.model.enterHotel()) return;
    this.stageHotelInterior();
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
    this.elements.blackout?.classList.add('visible');
    setTimeout(() => {
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
      const targetArea = state.morningStarted
        ? state.morningLobbyReached ? 'lobby' : state.morningRoomLeft ? 'corridor' : 'room'
        : state.slept
          ? state.nightLobbyReached ? 'lobby' : state.nightRoomLeft ? 'corridor' : 'room'
          : state.hotelRoomEntered
          ? 'room'
          : state.hotelCorridorEntered
            ? 'corridor'
          : 'lobby';
      this.setHotelArea(targetArea);
      this.hotelTransitioning = false;
      this.elements.blackout?.classList.remove('visible');
      this.hoveredId = null;
      this.updateObjective();
      this.updateOutlines();
      this.updateDiagnosticState();
    }, 320);
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
      const morning = state.morningStarted;
      this.hotelHall.hana.visible = !state.slept || morning;
      this.hotelHall.irena.visible = !state.slept && !morning;
      this.hotelHall.vesna.visible = !state.slept && !morning;
      this.hotelHall.daro.visible = !state.slept && !morning;
      // Dining-room guests stay seated at the imported chairs and face the
      // table. Their hands retain quiet sit/pick-up motion, but their hosts do
      // not pace around the compact lobby.
      this.hotelHall.irena.position.copy(positionFrom(HOTEL_POSITIONS.irena));
      this.hotelHall.vesna.position.copy(positionFrom(HOTEL_POSITIONS.vesna));
      this.hotelHall.daro.position.copy(positionFrom(HOTEL_POSITIONS.daro));
      const diningFocus = new THREE.Vector3(-1.15, 0, 1.0);
      for (const guest of [this.hotelHall.irena, this.hotelHall.vesna, this.hotelHall.daro]) {
        const towardTable = diningFocus.clone().sub(guest.position);
        guest.rotation.y = Math.atan2(towardTable.x, towardTable.z);
      }
      // Use a three-quarter diagonal so the lobby reads in the same isometric
      // language as the city. A closer zoom keeps the compact imported room
      // and its guests large enough to inspect without a camera snap.
      const homeOffset = new THREE.Vector3().fromArray(CAMERA_HOME.position)
        .sub(new THREE.Vector3().fromArray(CAMERA_HOME.target));
      const lobbyRadius = Math.hypot(homeOffset.x, homeOffset.z);
      this.preview.setCameraOffsetOverride(new THREE.Vector3(-lobbyRadius * 0.82, homeOffset.y, lobbyRadius * 0.57));
      this.preview.setCameraOverrideTarget(new THREE.Vector3(0, 0.72, 0));
      const arrivedFromStairs = arrival === 'stairs'
        || (!arrival && (state.morningLobbyReached || state.nightLobbyReached));
      this.preview.player.position.copy(positionFrom(arrivedFromStairs
        ? HOTEL_POSITIONS.lobbyStairArrival
        : HOTEL_POSITIONS.playerStart));
      this.lev.position.copy(positionFrom(HOTEL_POSITIONS.lev));
      this.lev.visible = morning && state.morningLobbyReached
        ? true
        : !state.evidenceTableComplete && !state.slept && !morning;
      this.preview.scene.background.setHex(0x000000);
      this.preview.scene.fog.color.setHex(0x000000);
      this.preview.renderer.toneMappingExposure = nightAsleep ? 0.96 : 1.18;
    } else if (corridor) {
      this.preview.setCameraOffsetOverride(null);
      this.preview.player.position.copy(positionFrom(state.morningRoomLeft || state.nightRoomLeft
        ? HOTEL_POSITIONS.corridorRoomExitStart
        : HOTEL_POSITIONS.corridorPlayerStart));
      this.lev.position.copy(positionFrom(HOTEL_POSITIONS.corridorLev));
      this.lev.visible = !state.evidenceTableComplete && !state.slept && !state.morningStarted;
      this.preview.scene.background.setHex(0x000000);
      this.preview.scene.fog.color.setHex(0x000000);
      this.preview.renderer.toneMappingExposure = nightAsleep ? 0.90 : state.morningStarted ? 1.22 : 1.16;
    } else {
      this.preview.setCameraOffsetOverride(null);
      this.preview.player.position.copy(positionFrom(HOTEL_POSITIONS.roomPlayerStart));
      this.lev.position.copy(positionFrom(HOTEL_POSITIONS.roomLev));
      this.lev.visible = !state.evidenceTableComplete && !state.slept && !state.morningStarted;
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
    this.elements.blackout?.classList.add('visible');
    setTimeout(() => {
      this.setHotelArea(area, { arrival });
      this.hotelTransitioning = false;
      this.elements.blackout?.classList.remove('visible');
    }, 280);
    return true;
  }

  enterButchRoom() {
    if (this.model.snapshot().hotelRoomEntered) return;
    this.animateHotelDoor(() => {
      if (!this.model.enterHotelRoom()) return;
      this.switchHotelArea('room', { fade: false });
    });
  }

  enterHotelCorridor() {
    if (!this.model.enterHotelCorridor()) return;
    this.switchHotelArea('corridor');
  }

  leaveRoomInMorning() {
    if (this.model.snapshot().morningRoomLeft) return;
    this.animateHotelDoor(() => {
      if (!this.model.leaveMorningRoom()) return;
      this.switchHotelArea('corridor', { fade: false });
    });
  }

  goDownstairsInMorning() {
    if (this.model.snapshot().morningLobbyReached) return;
    this.animateHotelDoor(() => {
      if (!this.model.reachMorningLobby()) return;
      if (this.switchHotelArea('lobby', { arrival: 'stairs' })) {
        setTimeout(() => {
          if (this.hotelArea === 'lobby') this.openMorningLevGreeting();
        }, 360);
      }
    }, this.hotelHall.stairDoorPivot, -Math.PI * 0.5);
  }

  leaveRoomAtNight() {
    if (this.model.snapshot().nightRoomLeft) return;
    this.animateHotelDoor(() => {
      if (!this.model.leaveNightRoom()) return;
      this.switchHotelArea('corridor', { fade: false });
    });
  }

  goDownstairsAtNight() {
    if (this.model.snapshot().nightLobbyReached) return;
    this.animateHotelDoor(() => {
      if (!this.model.reachNightLobby()) return;
      this.switchHotelArea('lobby', { arrival: 'stairs' });
    }, this.hotelHall.stairDoorPivot, -Math.PI * 0.5);
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

  beginLevHotelExit() {
    if (this.levHotelExitElapsed !== null || !this.lev.visible) return false;
    this.preview.stopWalking();
    this.levHotelExitElapsed = 0;
    this.levHotelExitStart = this.lev.position.clone();
    this.hotelHall.butchDoorPivot.rotation.y = 0;
    this.updateOutlines();
    return true;
  }

  openHanaRegister() {
    this.preview.stopWalking();
    this.preview.setCameraOverrideTarget(this.hotelHall.desk.position);
    this.evidenceViewer.open(CHAPTER3_DOCUMENTS.HOTEL_REGISTER, {
      onClose: () => this.openHanaDialogue(),
    });
  }

  openHanaDialogue() {
    let finished = false;
    const menu = () => hanaTopicMenu(this.model.snapshot().hanaTopics);
    this.dialogue.show([...HANA_OPENING, menu()], {
      onChoice: (choiceId) => {
        if (HANA_TOPIC_RESPONSES[choiceId]) {
          this.model.noteHanaTopic(choiceId.replace('hana-', ''));
          return [...HANA_TOPIC_RESPONSES[choiceId], menu()];
        }
        if (choiceId !== 'hana-done') return [];
        this.model.completeHotelCheckIn();
        finished = true;
        return HANA_CONCLUSION;
      },
      onComplete: () => {
        if (!finished) return;
        this.preview.setCameraOverrideTarget(null);
        this.hoveredId = null;
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  openHotelGuest(guest) {
    this.preview.stopWalking();
    const state = this.model.snapshot();
    const lines = guest === 'irena' && !state.solventBottleObserved
      ? HOTEL_GUEST_DIALOGUE[guest].slice(0, 2)
      : HOTEL_GUEST_DIALOGUE[guest];
    this.dialogue.show(lines, {
      onComplete: () => {
        this.model.askHotelGuest(guest);
        this.hoveredId = null;
        this.updateOutlines();
      },
    });
  }

  openDaro() {
    this.preview.stopWalking();
    let finished = false;
    const menu = () => daroMenu(this.model.snapshot().daroTopics);
    this.dialogue.show([...DARO_OPENING, menu()], {
      onChoice: (choiceId) => {
        if (DARO_RESPONSES[choiceId]) {
          this.model.noteDaroTopic(choiceId.replace('daro-', ''));
          return [...DARO_RESPONSES[choiceId], menu()];
        }
        if (choiceId !== 'daro-done') return [];
        this.model.completeDaro();
        finished = true;
        return DARO_CONCLUSION;
      },
      onComplete: () => {
        if (!finished) return;
        this.hoveredId = null;
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  openFinalEvidenceTable() {
    this.preview.stopWalking();
    this.preview.setCameraOverrideTarget(this.hotelHall.evidenceTable.position);
    this.openFinalEvidenceTableDialogue();
  }

  openFinalEvidenceTableDialogue() {
    let finished = false;
    const menu = () => finalTheoryMenu(this.model.snapshot().finalTheoriesTested);
    this.dialogue.show([...EVIDENCE_TABLE_OPENING, menu()], {
      onChoice: (choiceId) => {
        const theory = choiceId.startsWith('final-') && choiceId !== 'final-done' ? choiceId.replace('final-', '') : null;
        if (theory && FINAL_THEORY_RESPONSES[choiceId]) {
          this.model.testFinalTheory(theory);
          return [...FINAL_THEORY_RESPONSES[choiceId], menu()];
        }
        if (choiceId !== 'final-done') return [];
        this.model.completeEvidenceTable();
        finished = true;
        return EVIDENCE_TABLE_CONCLUSION;
      },
      onLineChange: (line) => {
        const paperId = line.evidenceDocument;
        const documentSpec = HOTEL_PAPER_DOCUMENTS[paperId];
        if (!paperId || !documentSpec) return;
        this.model.readHotelEvidencePaper(paperId);
        this.evidenceViewer.openReference(documentSpec);
        this.updateObjective();
        this.updateOutlines();
      },
      onComplete: () => {
        if (this.evidenceViewer.mode === 'reference') this.evidenceViewer.close();
        if (!finished) return;
        this.preview.setCameraOverrideTarget(null);
        this.hoveredId = null;
        this.beginLevHotelExit();
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  openSleep() {
    this.preview.stopWalking();
    this.dialogue.show(SLEEP_DIALOGUE, {
      onComplete: () => {
        this.beginButchBedTransition('enter', () => this.beginNightmareWake());
      },
    });
  }

  beginNightmareWake() {
    this.model.sleepUntilNight();
    this.groundMessage.setFirstBurning(true);
    this.groundMessage.setSecondBurning(false);
    this.lev.visible = false;
    this.hotelHall.hana.visible = false;
    this.hotelHall.irena.visible = false;
    this.hotelHall.vesna.visible = false;
    this.hotelHall.daro.visible = false;
    this.hoveredId = null;
    this.elements.blackout?.classList.add('visible');
    car03Audio.nightmareStorm({ duration: 3.6 });
    // The old 3.4 s opaque hold was indistinguishable from a loading failure
    // once the player had chosen to sleep.  The storm still continues, but
    // the actual midnight room and wake-up dialogue appear promptly.
    setTimeout(() => {
      this.preview.renderer.toneMappingExposure = 0.95;
      this.setNightDreamRendering(true);
      this.elements.blackout?.classList.remove('visible');
      this.dialogue.show(NIGHT_WAKE_DIALOGUE, {
        onComplete: () => {
          this.beginButchBedTransition('exit', () => {
            this.hoveredId = null;
            this.updateObjective();
            this.updateOutlines();
          });
        },
      });
      this.updateObjective();
      this.updateOutlines();
    }, 650);
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

  restoreHotelExterior({ night = false, morning = false } = {}) {
    if (!this.insideHotel || this.hotelTransitioning) return;
    this.hotelTransitioning = true;
    this.elements.blackout?.classList.add('visible');
    setTimeout(() => {
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
      this.hotelTransitioning = false;
      this.preview.player.visible = true;
      this.preview.player.position.set(49.8, 0.5, -12.2);
      this.preview.stopWalking();
      this.lev.visible = !night;
      if (morning) {
        this.lev.position.copy(positionFrom(MORNING_LEV_EXTERIOR_START));
        this.startMorningLevFollow();
      }
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
      this.elements.blackout?.classList.remove('visible');
      this.hoveredId = null;
      this.updateObjective();
      this.updateOutlines();
    }, 320);
  }

  leaveHotelAtNight() {
    if (!this.model.beginNightRoute()) return;
    this.setNightDreamRendering(true);
    this.cutInterface.group.position.copy(this.groundMessage.interfacePosition);
    this.groundMessage.setFirstBurning(true);
    this.groundMessage.setSecondBurning(false);
    this.restoreHotelExterior({ night: true });
  }

  openNightFire() {
    this.preview.stopWalking();
    this.preview.setCameraOverrideTarget(this.groundMessage.position);
    // The message is the climax, not a distant map marker. Pull the fixed
    // isometric camera close enough that both burning rows remain readable
    // beside the dialogue panel.
    this.nightCameraLimitsBefore ??= {
      minZoom: this.preview.controls.minZoom,
      maxZoom: this.preview.controls.maxZoom,
    };
    this.preview.controls.maxZoom = 4.25;
    this.preview.camera.zoom = 3.9;
    this.preview.camera.updateProjectionMatrix();
    this.preview.controls.update();
    // Reserve the dialogue-panel side of the frame. The whole two-line fire
    // must remain readable while subtitles are present, not sit underneath
    // the right-hand conversation card.
    const cameraRight = new THREE.Vector3(1, 0, 0)
      .applyQuaternion(this.preview.camera.quaternion)
      .setY(0)
      .normalize();
    this.preview.setCameraOverrideTarget(
      this.groundMessage.position.clone().addScaledVector(cameraRight, 2.5),
    );
    this.model.observeNightFire();
    let selected = false;
    const attitude = {
      speaker: 'BUTCH', text: 'Choose what to hold onto before touching the feed.', choices: [
        { id: 'night-relief', label: 'Start with the relief: she was alive.' },
        { id: 'night-anger', label: 'Admit the anger: she knew you would follow.' },
        { id: 'night-caution', label: 'Treat the first line as a bounded fact.' },
      ],
    };
    this.dialogue.show([...NIGHT_FIRST_LINE, attitude], {
      onChoice: (choiceId) => {
        if (!NIGHT_ATTITUDE_RESPONSES[choiceId] || selected) return [];
        selected = true;
        return [...NIGHT_ATTITUDE_RESPONSES[choiceId], ...NIGHT_RECONNECT, ...NIGHT_SECOND_LINE];
      },
      onLineChange: (line) => {
        if (line.nightIgnition) this.startNightIgnition();
      },
      onComplete: () => {
        if (!selected) return;
        if (this.nightCameraLimitsBefore) {
          this.preview.controls.minZoom = this.nightCameraLimitsBefore.minZoom;
          this.preview.controls.maxZoom = this.nightCameraLimitsBefore.maxZoom;
          this.nightCameraLimitsBefore = null;
        }
        this.elements.dialogue.panel.classList.remove('cinematic-hold');
        this.dialogue.setAdvanceLocked(false);
        this.model.completeNightMessage();
        // Release the fire-site camera before the blackout so the morning
        // hotel can never inherit a framing locked on the square.
        this.preview.setCameraOverrideTarget(null);
        this.elements.blackout?.classList.add('visible');
        // Falling back asleep sounds like the storm draining away; the morning
        // room answers with a thin dawn shimmer as the blackout lifts.
        car03Audio.nightmareStorm({ duration: 1.8 });
        setTimeout(() => {
          this.model.beginMorning();
          this.restoreMorningTrainAtStation();
          this.setNightDreamRendering(false);
          this.stageHotelInterior();
          setTimeout(() => car03Audio.morningWake(), 520);
        }, 1500);
      },
    });
  }

  startNightIgnition() {
    if (this.nightIgnitionElapsed !== null) return false;
    if (!this.model.reconnectNightFeed()) return false;
    this.nightIgnitionElapsed = 0;
    this.nightIgnitionProgress = 0;
    this.nightFireZoomBefore = this.preview.camera.zoom;
    this.butchActionOverride = 'crouch';
    this.groundMessage.setSecondIgnitionProgress(0);
    this.dialogue.setAdvanceLocked(true);
    this.elements.dialogue.panel.classList.add('cinematic-hold');
    const cameraRight = new THREE.Vector3(1, 0, 0)
      .applyQuaternion(this.preview.camera.quaternion)
      .setY(0)
      .normalize();
    this.preview.setCameraOverrideTarget(
      this.groundMessage.position.clone().addScaledVector(cameraRight, 2.5),
    );
    this.updateObjective();
    return true;
  }

  openHanaBreakfast() {
    this.preview.stopWalking();
    this.dialogue.show(HANA_BREAKFAST, {
      onComplete: () => {
        this.model.askHanaAtBreakfast();
        this.hoveredId = null;
        this.updateOutlines();
      },
    });
  }

  openMorningLevGreeting() {
    if (this.morningLevGreetingShown || !this.model.snapshot().morningStarted) return false;
    this.morningLevGreetingShown = true;
    this.preview.stopWalking();
    this.dialogue.show(MORNING_LEV_GREETING, {
      onComplete: () => {
        this.hoveredId = null;
        this.updateObjective();
        this.updateOutlines();
      },
    });
    return true;
  }

  openMorningLevReminder() {
    this.preview.stopWalking();
    const state = this.model.snapshot();
    const lines = !state.morningReservationCollected
      ? MORNING_LEV_REMINDER
      : state.sunriseReturned
        ? MORNING_LEV_PLATFORM_REMINDER
        : MORNING_LEV_OVERLOOK_REMINDER;
    this.dialogue.show(lines, {
      onComplete: () => {
        this.hoveredId = null;
        this.updateOutlines();
      },
    });
  }

  openMorningReservation() {
    this.preview.stopWalking();
    this.dialogue.show(MORNING_RESERVATION_DIALOGUE, {
      onComplete: () => {
        this.model.collectMorningReservation();
        this.morningNika.visible = false;
        this.hoveredId = null;
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  beginSunriseClimb() {
    if (!this.model.startSunriseClimb()) return false;
    this.preview.stopWalking();
    this.morningLevFollowing = false;
    this.setTunnelRouteCutaway(true);
    this.setSunriseRouteCamera(this.sunriseOverlook.points[0]);
    this.overlookTravelMode = 'up';
    this.overlookTravelElapsed = 0;
    this.overlookTravelDuration = 6.6;
    this.hoveredId = null;
    this.updateObjective();
    this.updateOutlines();
    return true;
  }

  setTunnelRouteCutaway(active) {
    for (const state of this.tunnelCutawayMaterials) {
      state.material.transparent = state.transparent;
      state.material.opacity = state.opacity;
      state.material.depthWrite = state.depthWrite;
      state.material.needsUpdate = true;
    }
  }

  setSunriseRouteCamera(focus) {
    // The ordinary southeast city camera looks through the tunnel bank at this
    // west-facing route. A high west-side isometric angle keeps the boardwalk,
    // its cliff attachment and both walkers visible without breaking the game's
    // fixed top-down visual language.
    const cameraFocus = focus.clone().add(new THREE.Vector3(0, 1.4, 0));
    this.preview.setCameraOverrideTarget(cameraFocus);
    this.preview.controls.target.copy(cameraFocus);
    this.preview.cameraFollowTarget?.copy(cameraFocus);
    this.preview.camera.position.copy(cameraFocus).add(new THREE.Vector3(0, 100, 8));
    this.preview.camera.zoom = 2.35;
    this.preview.camera.lookAt(cameraFocus);
    this.preview.camera.updateProjectionMatrix();
    this.preview.controls.update();
  }

  beginSunriseView() {
    if (!this.model.snapshot().sunriseClimbStarted || this.model.snapshot().sunriseViewed) return false;
    this.preview.stopWalking();
    this.sunriseElapsed = 0;
    this.sunriseDialogueShown = true;
    this.sunriseCameraStartZoom = this.preview.camera.zoom;
    const yaw = this.sunriseOverlook.bench.rotation.y;
    const butchSeat = new THREE.Vector3(-0.62, 0.32, -0.16).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    const levSeat = new THREE.Vector3(0.62, 0.32, -0.16).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    // Seat against the bench root rather than the summit centre. The bench is
    // intentionally offset on the deck, and using the summit left both actors
    // visually detached after its orientation changed.
    this.preview.player.position.copy(this.sunriseOverlook.bench.position).add(butchSeat);
    this.lev.position.copy(this.sunriseOverlook.bench.position).add(levSeat);
    this.preview.player.rotation.y = THREE.MathUtils.degToRad(128);
    this.lev.rotation.y = THREE.MathUtils.degToRad(128);
    this.showSunriseTableau();
    this.dialogue.show(SUNRISE_BENCH_DIALOGUE, {
      onComplete: () => this.completeSunriseView(),
    });
    this.hoveredId = null;
    this.updateObjective();
    this.updateOutlines();
    return true;
  }

  beginSunriseDescent() {
    const state = this.model.snapshot();
    if (!state.sunriseViewed || state.sunriseReturned) return false;
    this.preview.stopWalking();
    this.overlookTravelMode = 'down';
    this.overlookTravelElapsed = 0;
    this.overlookTravelDuration = 8.6;
    this.hoveredId = null;
    this.updateObjective();
    this.updateOutlines();
    return true;
  }

  updateSunriseOverlook(dt) {
    if (this.overlookTravelElapsed !== null) {
      this.overlookTravelElapsed += dt;
      const rawProgress = THREE.MathUtils.clamp(this.overlookTravelElapsed / this.overlookTravelDuration, 0, 1);
      const progress = smooth(rawProgress);
      const route = this.overlookTravelMode === 'up'
        ? this.sunriseOverlook.points
        : [...this.sunriseOverlook.points].reverse();
      const butchPosition = samplePolyline(route, progress);
      const levPosition = samplePolyline(route, Math.max(0, progress - 0.065));
      const previous = this.preview.player.position.clone();
      this.preview.player.position.copy(butchPosition);
      this.lev.position.copy(levPosition).add(new THREE.Vector3(0.42, 0, 0.28));
      const direction = butchPosition.clone().sub(previous);
      if (direction.lengthSq() > 0.0001) {
        this.preview.player.rotation.y = Math.atan2(direction.x, direction.z);
        this.lev.rotation.y = this.preview.player.rotation.y;
      }
      const focus = this.preview.player.position.clone().lerp(this.lev.position, 0.45);
      this.preview.setCameraOverrideTarget(focus);
      if (rawProgress >= 1) {
        const climbedUp = this.overlookTravelMode === 'up';
        this.overlookTravelElapsed = null;
        this.overlookTravelMode = null;
        if (climbedUp) {
          const arrivalSide = new THREE.Vector3(
            -this.sunriseOverlook.points.at(-1).z + this.sunriseOverlook.points.at(-2).z,
            0,
            this.sunriseOverlook.points.at(-1).x - this.sunriseOverlook.points.at(-2).x,
          ).normalize();
          this.preview.player.position.copy(this.sunriseOverlook.summit)
            .add(arrivalSide.clone().multiplyScalar(0.48))
            .add(new THREE.Vector3(0, 0.32, 0));
          this.lev.position.copy(this.sunriseOverlook.summit)
            .add(arrivalSide.clone().multiplyScalar(-0.62))
            .add(new THREE.Vector3(0, 0.32, 0));
        } else {
          this.model.returnFromSunrise();
          this.preview.player.position.copy(this.sunriseOverlook.points[0]);
          this.lev.position.copy(this.sunriseOverlook.points[0]).add(new THREE.Vector3(1.2, 0, 0.8));
          this.setTunnelRouteCutaway(false);
          this.preview.setCameraOverrideTarget(null);
          this.preview.resetCamera();
          this.startMorningLevFollow();
        }
        this.updateObjective();
        this.updateOutlines();
      }
    }

    if (this.sunriseElapsed !== null) this.sunriseElapsed += dt;
    if (this.sunriseTableauHoldElapsed !== null) {
      this.sunriseTableauHoldElapsed += dt;
      if (this.sunriseTableauHoldElapsed >= 3) {
        this.elements.sunriseTableau?.classList.add('ready-to-leave');
        const continueButton = this.elements.sunriseTableau?.querySelector('#sunrise-tableau-continue');
        if (continueButton) continueButton.disabled = false;
      }
    }
  }

  showSunriseTableau() {
    this.elements.sunriseTableau?.classList.add('visible');
    this.elements.sunriseTableau?.setAttribute('aria-hidden', 'false');
    document.body.classList.add('sunrise-tableau-active');
    this.elements.sunriseTableau?.classList.remove('ready-to-leave');
    const continueButton = this.elements.sunriseTableau?.querySelector('#sunrise-tableau-continue');
    if (continueButton) continueButton.disabled = true;
  }

  hideSunriseTableau() {
    this.elements.sunriseTableau?.classList.remove('visible');
    this.elements.sunriseTableau?.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('sunrise-tableau-active');
    this.elements.sunriseTableau?.classList.remove('ready-to-leave');
  }

  completeSunriseView() {
    if (this.sunriseElapsed === null) return;
    this.sunriseElapsed = null;
    this.sunriseTableauHoldElapsed = 0;
    this.preview.player.scale.y = 1;
    this.lev.scale.y = 0.96;
    this.model.completeSunriseView();
    this.timeVisual.requestClock(this.model.snapshot().clock);
    this.updateObjective();
    this.updateOutlines();
  }

  leaveSunriseTableau() {
    if (this.sunriseTableauHoldElapsed === null || this.sunriseTableauHoldElapsed < 3) return false;
    this.sunriseTableauHoldElapsed = null;
    this.hideSunriseTableau();
    this.hoveredId = null;
    this.updateObjective();
    this.updateOutlines();
    return true;
  }

  openAmbientDialogue(lines, { onComplete = null } = {}) {
    this.preview.stopWalking();
    this.dialogue.show(lines, {
      onComplete: () => {
        onComplete?.();
        this.hoveredId = null;
        this.updateOutlines();
      },
    });
  }

  openCampfireSelineDialogue() {
    if (magicStoneSnapshot().collected.includes('chapter-3')) {
      this.openCampfireDialogue('seline', CAMPFIRE_SELINE_DIALOGUE);
      return;
    }
    if (!this.campfireSpoken.has('seline')) {
      this.campfireSpoken.add('seline');
      this.model.advanceDialogueTime('campfire-seline', 2);
    }
    this.openAmbientDialogue(CAMPFIRE_SELINE_STONE_DIALOGUE, {
      onComplete: () => {
        collectMagicStone('chapter-3');
        const snapshot = magicStoneSnapshot();
        this.openAmbientDialogue([{
          speaker: 'BUTCH',
          text: `The Echo Stone was hidden in Seline's unclaimed coat. MAGIC STONE ${snapshot.count} / ${snapshot.total}.`,
        }]);
      },
    });
  }

  openRepeatedAmbient(key, linesForUse) {
    const count = this.ambientUseCounts.get(key) ?? 0;
    this.ambientUseCounts.set(key, count + 1);
    this.openAmbientDialogue(linesForUse(count > 0));
  }

  campfireGatheringVisible() {
    const state = this.model.snapshot();
    return !this.insideHotel && !this.insideMinistry && !this.insideArchive
      && !state.boardedTrain && state.clock.period === 'DUSK';
  }

  openCampfireDialogue(id, lines) {
    if (!this.campfireSpoken.has(id)) {
      this.campfireSpoken.add(id);
      this.model.advanceDialogueTime(`campfire-${id}`, 2);
    }
    this.openAmbientDialogue(lines);
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
    const speed = distance > 4.2 ? 6.2 : naturalSpeed;
    const step = Math.min(distance, dt * speed);
    this.lev.position.addScaledVector(movement.normalize(), step);
    this.morningLevMovedThisFrame = step > 0.001;
    this.lev.position.y = this.insideMinistry ? MINISTRY_POSITIONS.lev[1] : 0.5;
    this.lev.rotation.y = Math.atan2(movement.x, movement.z);
  }

  updateArchiveLevFollow(dt) {
    this.archiveLevMovedThisFrame = false;
    if (!this.insideArchive || this.dialogue.active || !this.lev.visible || this.archiveTransitioning) return;
    const toPlayer = this.preview.player.position.clone().sub(this.lev.position).setY(0);
    const distance = toPlayer.length();
    if (distance <= 1.55) return;
    const desired = this.preview.player.position.clone().addScaledVector(toPlayer.normalize(), -1.15);
    desired.y = 0.5;
    const path = findInteriorPath(
      this.lev.position,
      desired,
      ARCHIVE_WALK_BOUNDS,
      ARCHIVE_FURNITURE_OBSTACLES,
    );
    const target = path[0];
    if (!target) return;
    const movement = target.clone().sub(this.lev.position).setY(0);
    if (movement.lengthSq() < 0.0025) return;
    const step = Math.min(movement.length(), dt * 1.55);
    this.lev.position.addScaledVector(movement.normalize(), step);
    this.lev.position.y = 0.5;
    this.lev.rotation.y = Math.atan2(movement.x, movement.z);
    this.archiveLevMovedThisFrame = step > 0.001;
  }

  updateHotelLevFollow(dt) {
    this.hotelLevMovedThisFrame = false;
    const state = this.model.snapshot();
    if (!this.insideHotel || this.hotelArea !== 'corridor' || this.dialogue.active
      || !this.lev.visible || state.evidenceTableComplete || this.hotelTransitioning) return;
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

  beginPostOlekScoreTransition() {
    if (this.postOlekScoreReady || this.postOlekScoreTransitionElapsed !== null) return;
    this.postOlekScoreTransitionElapsed = 0;
    this.musicCue = null;
    music.stop({ fade: C3_MUSIC.arrival.outFade });
  }

  updatePostOlekScoreTransition(dt) {
    if (this.postOlekScoreTransitionElapsed === null) return;
    this.postOlekScoreTransitionElapsed += dt;
    if (this.postOlekScoreTransitionElapsed < C3_MUSIC.arrival.outFade + POST_OLEK_SCORE_SILENCE_SECONDS) return;
    this.postOlekScoreTransitionElapsed = null;
    this.postOlekScoreReady = true;
  }

  // The three daytime legs where players reported getting lost: walking to
  // the ministry after Olek, finding Bosko in the square, and taking the
  // maintenance number to the archive. During these legs Lev stays at
  // Butch's heel, and after a short lost-player grace period he speaks a
  // compass hint toward the target.
  currentSearchPhase() {
    const state = this.model.snapshot();
    if (this.characterQa || this.insideHotel || this.insideMinistry || this.insideArchive || state.boardedTrain) return null;
    if (state.marketLeadComplete && !state.transportEntranceReached) {
      return { id: 'find-ministry', target: positionFrom(OPENING_POSITIONS.transportApproach) };
    }
    if (state.firstTheoryTested && !state.squareBoskoInterviewed) {
      return { id: 'find-bosko', target: positionFrom(OPENING_POSITIONS.squareBosko) };
    }
    if (state.interaction14Complete && !state.archiveEntranceReached) {
      return { id: 'find-archive', target: positionFrom(OPENING_POSITIONS.archiveApproach) };
    }
    // The dusk hunt for the cut lower-feed interface: the connector set is
    // half a metre of dark metal, so Lev heels closer and the hint arrives
    // sooner than on the long street legs.
    if (state.secondTheoryComplete && !state.interaction22Complete) {
      return {
        id: 'find-cut-interface',
        target: positionFrom(OPENING_POSITIONS.cutInterface),
        hintAfter: 60,
      };
    }
    if (state.interaction22Complete && !state.hotelEntered) {
      return {
        id: 'find-hotel',
        target: positionFrom([50.3, 0.5, -12.4]),
        hintAfter: 75,
        follow: false,
      };
    }
    return null;
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

  updateSearchGuidance(dt) {
    const phase = this.currentSearchPhase();
    if (this.cutInterfaceBeacon) {
      const beaconActive = phase?.id === 'find-cut-interface';
      if (this.cutInterfaceBeacon.visible !== beaconActive) this.cutInterfaceBeacon.visible = beaconActive;
      if (beaconActive && this.cutInterfaceBeaconColumn) {
        const pulse = 0.5 + 0.5 * Math.sin(this.ambientElapsed * 3.1);
        this.cutInterfaceBeaconColumn.material.opacity = 0.09 + pulse * 0.13;
      }
    }
    const scriptedLev = this.levWalkElapsed !== null || this.guideElapsed !== null
      || this.levHotelExitElapsed !== null || this.overlookTravelElapsed !== null
      || this.departureElapsed !== null;
    if (phase?.follow !== false && !scriptedLev && this.lev.visible && !this.morningLevFollowing) {
      this.startMorningLevFollow();
      this.autoLevFollow = true;
    } else if ((!phase || phase.follow === false) && this.autoLevFollow) {
      this.morningLevFollowing = false;
      this.autoLevFollow = false;
    }
    if (!phase) {
      this.searchHintPhase = null;
      this.searchHintElapsed = 0;
      this.searchHintLastShownAt = -Infinity;
      return;
    }
    if (this.searchHintPhase !== phase.id) {
      this.searchHintPhase = phase.id;
      this.searchHintElapsed = 0;
      this.searchHintLastShownAt = -Infinity;
    }
    if (this.interactionLocked()) return;
    // Standing next to the target is not being lost; hold the clock low so
    // the hint can still fire soon after walking away again.
    if (this.preview.player.position.distanceTo(phase.target) < 6) {
      const nearTargetCap = phase.hintAfter
        ? Math.max(0, phase.hintAfter - 20)
        : SEARCH_HINT_NEAR_TARGET_SECONDS;
      this.searchHintElapsed = Math.min(this.searchHintElapsed, nearTargetCap);
      return;
    }
    this.searchHintElapsed += dt;
    const due = this.searchHintElapsed >= (phase.hintAfter ?? SEARCH_HINT_AFTER_SECONDS)
      && (this.searchHintLastShownAt < 0 || this.searchHintElapsed - this.searchHintLastShownAt >= 90);
    if (!due) return;
    this.searchHintLastShownAt = this.searchHintElapsed;
    const direction = this.compassDirection(phase.target);
    const lines = SEARCH_HINT_LINES[phase.id]?.(direction);
    if (!lines) return;
    this.preview.stopWalking();
    this.hoveredId = null;
    this.dialogue.show(lines, {
      onComplete: () => {
        this.hoveredId = null;
        this.updateOutlines();
      },
    });
  }

  leaveHotelInMorning() {
    this.groundMessage.setFirstBurning(true);
    this.groundMessage.setSecondBurning(true);
    this.groundMessage.setBurnedOut();
    this.restoreHotelExterior({ morning: true });
  }

  updateMorningRouteInterruption() {
    const state = this.model.snapshot();
    if (this.morningFireInterruptionShown || this.dialogue.active || this.insideHotel || this.insideMinistry || this.insideArchive) return;
    if (!state.morningReservationCollected || state.morningFireEncountered || this.overlookTravelElapsed !== null) return;
    const distance = this.preview.player.position.distanceTo(this.groundMessage.position);
    if (distance > 10.5) return;
    this.morningFireInterruptionShown = true;
    this.model.noticeMorningFire();
    this.preview.stopWalking();
    this.taskBubbleElapsed = 0;
    document.getElementById('task-bubble')?.classList.add('visible');
    this.hoveredId = null;
    this.updateObjective();
    this.updateOutlines();
  }

  updateAmbientCityLife(dt) {
    this.ambientElapsed += dt;
    const exterior = !this.insideHotel && !this.insideMinistry && !this.insideArchive;
    const state = this.model.snapshot();
    // The night walk belongs to the burning message alone: the city is asleep,
    // so every ambient bystander and street prop goes dark until morning.
    const nightAsleep = state.nightRouteStarted && !state.morningStarted;
    const daytimeStreetActors = [
      this.eda, this.olek, this.toma, this.produceVendor, this.flowerVendor,
      this.squareBosko, this.archiveMilaExterior,
    ];
    if (nightAsleep && !this.nightHiddenActorVisibility) {
      this.nightHiddenActorVisibility = daytimeStreetActors.map((actor) => ({ actor, visible: actor.visible }));
      for (const actor of daytimeStreetActors) actor.visible = false;
    } else if (!nightAsleep && this.nightHiddenActorVisibility) {
      for (const entry of this.nightHiddenActorVisibility) entry.actor.visible = entry.visible;
      this.nightHiddenActorVisibility = null;
    } else if (nightAsleep) {
      for (const actor of daytimeStreetActors) actor.visible = false;
    }
    this.morningNika.visible = exterior && state.morningLobbyReached && !state.morningReservationCollected;
    const gangstersPresent = exterior && !nightAsleep && ['AFTERNOON', 'EVENING', 'NIGHT', 'DAWN'].includes(state.clock.period);
    this.alleyGangsterA.visible = gangstersPresent;
    this.alleyGangsterB.visible = gangstersPresent;
    this.alleyResident.visible = exterior && !nightAsleep;
    const campfirePresent = this.campfireGatheringVisible();
    this.campfireRada.visible = campfirePresent;
    this.campfireMiro.visible = campfirePresent;
    this.campfireSeline.visible = campfirePresent;
    this.campfireKettle.visible = exterior && !nightAsleep && !state.boardedTrain;
    if (campfirePresent) {
      const sway = Math.sin(this.ambientElapsed * 1.35);
      this.campfireRada.position.y = 0.5 + Math.max(0, sway) * 0.018;
      this.campfireMiro.position.y = 0.5 + Math.max(0, -sway) * 0.014;
    }
    // AmbientLifeRoutes is the single owner of X/Z movement and facing. The
    // former decorative sine offsets here overwrote route progress every frame,
    // trapping the resident in a tiny loop and making workers slide sideways.
  }

  openMorningEvidence() {
    this.preview.stopWalking();
    let finished = false;
    const menu = () => morningEvidenceMenu(this.model.snapshot().morningObservations);
    this.dialogue.show([menu()], {
      onChoice: (choiceId) => {
        const observation = choiceId.startsWith('morning-') && choiceId !== 'morning-done' ? choiceId.replace('morning-', '') : null;
        if (observation && MORNING_EVIDENCE_RESPONSES[choiceId]) {
          this.model.observeMorningEvidence(observation);
          return [...MORNING_EVIDENCE_RESPONSES[choiceId], menu()];
        }
        if (choiceId !== 'morning-done') return [];
        if (!this.model.confirmMorningEvidence()) return [...MORNING_EVIDENCE_BLOCKED, menu()];
        finished = true;
        return MORNING_EVIDENCE_CONCLUSION;
      },
      onComplete: () => {
        if (!finished) return;
        this.lev.visible = true;
        this.hoveredId = null;
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  openLevFinal() {
    this.preview.stopWalking();
    let finished = false;
    const menu = () => levFinalMenu(this.model.snapshot().finalTimelineTopics);
    this.dialogue.show([...LEV_FINAL_OPENING, menu()], {
      onChoice: (choiceId) => {
        if (LEV_FINAL_RESPONSES[choiceId]) {
          this.model.noteFinalTimelineTopic(choiceId.replace('lev-final-', ''));
          return [...LEV_FINAL_RESPONSES[choiceId], menu()];
        }
        if (choiceId !== 'lev-final-done') return [];
        this.model.completeLevFinal();
        finished = true;
        return LEV_FINAL_CONCLUSION;
      },
      onComplete: () => {
        if (!finished) return;
        this.hoveredId = null;
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  openContinuationAndBoard() {
    this.preview.stopWalking();
    let selected = false;
    this.dialogue.show(CONTINUATION_CHOICES, {
      onChoice: (choiceId) => {
        if (!CONTINUATION_RESPONSES[choiceId] || selected) return [];
        selected = this.model.chooseContinuationAttitude(choiceId.replace('continue-', ''));
        return selected ? [...CONTINUATION_RESPONSES[choiceId], ...BOARDING_CONCLUSION] : [];
      },
      onComplete: () => {
        if (!selected || !this.model.boardTrain()) return;
        this.preview.player.position.copy(positionFrom(ENDING_SLICE_POSITIONS.butchBoarded));
        this.endingElapsed = 0;
        const firstCar = this.preview.scene.getObjectByName('municipal-tram');
        if (firstCar) firstCar.visible = false;
        this.finalDoor.group.visible = true;
        this.hoveredId = null;
        this.updateObjective();
      },
    });
  }

  updateFinalDeparture(dt) {
    const state = this.model.snapshot();
    if (!state.boardedTrain || state.chapterComplete) return;
    this.model.advanceDeparture(dt * 1000);
    const next = this.model.snapshot();
    const ms = next.departureSequenceMs;
    const doorProgress = ms < 5000 ? 0 : ms < 7000 ? 0.55 * smooth((ms - 5000) / 2000) : ms < 9000 ? 0.55 + 0.45 * smooth((ms - 7000) / 2000) : 1;
    // Production contract: one static doorless carriage shell and one separate
    // door. Only the camera-facing leaf moves; no duplicate open/closed train.
    // The single leaf swings fore/aft around its side hinge; it no longer
    // slides sideways across the carriage opening.
    this.finalDoor.door.rotation.y = THREE.MathUtils.lerp(-Math.PI * 0.48, 0, doorProgress);
    if (ms >= 9000 && !this.endingLatchShaken) {
      this.endingLatchShaken = true;
      this.preview.triggerCameraShake(0.28, 0.24);
    }
    if (ms >= 9000 && !this.endingDoorSlamPlayed) {
      this.endingDoorSlamPlayed = true;
      car03Audio.trainDoorSlam();
    }
    if (ms >= 10150 && !this.endingHornPlayed) {
      this.endingHornPlayed = true;
      car03Audio.trainHorn();
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
      this.preview.setCameraOverrideTarget(this.finalDoor.group.position.clone());
    }
    if (next.blackout) {
      this.elements.blackout?.classList.add('visible');
      for (const entry of this.endingDepartureBases || []) entry.object.visible = false;
      // The train disappears before the chapter card arrives. Let the Largo
      // survive that visual cut as a distant memory, then leave a clean breath
      // of silence rather than looping beneath the completion screen.
      if (!this.endingMusicReleased) {
        this.endingMusicReleased = true;
        music.stop({ fade: 7.5 });
      }
    }
    if (next.chapterComplete && this.chapterEndCard) {
      this.chapterEndCard.style.opacity = '1';
      if (!this.chapterExitStarted) {
        this.chapterExitStarted = true;
        globalThis.dispatchEvent?.(new CustomEvent('nightfall:chapter3-complete'));
      }
    }
    this.updateObjective();
  }

  update(dt) {
    if (!this.initialized) return;
    this.enforceHotelFurnitureCollision();
    if (this.insideHotel && this.hotelArea === 'lobby' && Math.abs(this.preview.camera.zoom - 5.3) > 0.01) {
      this.preview.camera.zoom = 5.3;
      this.preview.camera.updateProjectionMatrix();
    }
    this.dialogue.update(dt);
    music.setDialogueActive(this.dialogue.active);
    this.updatePostOlekScoreTransition(dt);
    this.updateMusic();
    this.updateFinalDeparture(dt);
    this.updateButchBedTransition(dt);
    this.updateSunriseOverlook(dt);
    this.updateSearchGuidance(dt);
    this.updateGuidanceHighlightPulse();
    this.updateMorningLevFollow(dt);
    this.updateArchiveLevFollow(dt);
    this.updateHotelLevFollow(dt);
    this.updateMorningRouteInterruption();
    const pulseState = this.model.snapshot();
    if (this.insideMinistry && pulseState.nikaComplete && !pulseState.discardedPrintInspected) {
      const pulse = 0.24 + 0.34 * (0.5 + 0.5 * Math.sin(this.groundFireElapsed * 2.8));
      this.discardedPrintOutline.setIntensity?.(pulse);
      if (!this.discardedPrintOutline.visible) this.discardedPrintOutline.visible = true;
    }
    if (this.taskBubbleElapsed !== null) {
      this.taskBubbleElapsed += dt;
      if (this.taskBubbleElapsed >= 4.6) {
        this.taskBubbleElapsed = null;
        document.getElementById('task-bubble')?.classList.remove('visible');
      }
    }
    this.updateAmbientCityLife(dt);
    this.groundFireElapsed += dt;
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

    if (this.nightIgnitionElapsed !== null) {
      this.nightIgnitionElapsed += dt;
      this.nightIgnitionProgress = THREE.MathUtils.clamp(this.nightIgnitionElapsed / 3.6, 0, 1);
      this.groundMessage.setSecondIgnitionProgress(this.nightIgnitionProgress);
      const zoomStart = this.nightFireZoomBefore ?? this.preview.camera.zoom;
      const zoomProgress = smooth(Math.min(1, this.nightIgnitionElapsed / 1.25));
      // Frame both complete rows plus a margin of paving; the former 4.55 crop
      // made the message unreadable as a whole.
      this.preview.camera.zoom = THREE.MathUtils.lerp(zoomStart, 3.65, zoomProgress);
      this.preview.camera.updateProjectionMatrix();
      if (this.nightIgnitionElapsed >= 5.6) {
        this.nightIgnitionElapsed = null;
        this.nightIgnitionProgress = 1;
        this.butchActionOverride = null;
        this.groundMessage.setSecondIgnitionProgress(1);
        this.elements.dialogue.panel.classList.remove('cinematic-hold');
        this.dialogue.setAdvanceLocked(false);
        this.dialogue.handleAdvance();
        this.updateObjective();
      }
    }

    if (this.departureElapsed !== null) {
      this.departureElapsed += dt;
      const progress = smooth(this.departureElapsed / 6.2);
      const offset = this.trainDirection.clone().multiplyScalar(38 * progress);
      for (const entry of this.departureBases) entry.object.position.copy(entry.position).add(offset);
      if (this.departureElapsed >= 6.2) {
        for (const entry of this.departureBases) entry.object.visible = false;
        this.departureElapsed = null;
        this.model.completeTrainDeparture();
        this.beginLevArrivalApproach();
      }
    }

    if (this.levWalkElapsed !== null && !this.dialogue.active) {
      this.levWalkElapsed += dt;
      const progress = smooth(this.levWalkElapsed / this.levWalkDuration);
      this.lev.position.lerpVectors(this.levWalkStart, this.levWalkTarget, progress);
      const direction = this.levWalkTarget.clone().sub(this.levWalkStart);
      this.lev.rotation.y = Math.atan2(direction.x, direction.z);
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

    if (this.levHotelExitElapsed !== null) {
      this.levHotelExitElapsed += dt;
      const elapsed = this.levHotelExitElapsed;
      if (elapsed < 0.55) {
        this.hotelHall.butchDoorPivot.rotation.y = Math.PI * 0.5 * smooth(elapsed / 0.55);
      } else if (elapsed < 2.25) {
        this.hotelHall.butchDoorPivot.rotation.y = Math.PI * 0.5;
      } else if (elapsed < 2.85) {
        this.hotelHall.butchDoorPivot.rotation.y = Math.PI * 0.5 * (1 - smooth((elapsed - 2.25) / 0.6));
      } else {
        this.hotelHall.butchDoorPivot.rotation.y = 0;
      }
      const threshold = positionFrom(HOTEL_POSITIONS.levDoorThreshold);
      const corridorExit = positionFrom(HOTEL_POSITIONS.levCorridorExit);
      if (elapsed < 2.05) {
        const doorProgress = smooth(THREE.MathUtils.clamp((elapsed - 0.25) / 1.8, 0, 1));
        this.lev.position.lerpVectors(this.levHotelExitStart, threshold, doorProgress);
      } else {
        const corridorProgress = smooth(THREE.MathUtils.clamp((elapsed - 2.05) / 5.5, 0, 1));
        this.lev.position.lerpVectors(threshold, corridorExit, corridorProgress);
      }
      const facingTarget = elapsed < 2.05 ? threshold : corridorExit;
      const direction = facingTarget.clone().sub(this.lev.position);
      if (direction.lengthSq() > 0.0001) this.lev.rotation.y = Math.atan2(direction.x, direction.z);
      if (elapsed >= 7.75) this.lev.visible = false;
      if (elapsed >= 8.0) {
        this.hotelHall.butchDoorPivot.rotation.y = 0;
        this.lev.visible = false;
        this.levHotelExitElapsed = null;
        this.levHotelExitStart = null;
        this.updateObjective();
        this.updateOutlines();
      }
    }

    const clock = this.model.snapshot().clock;
    this.flipClock.setClock(clock);
    if (clock.period !== this.lastObjectivePeriod) {
      this.lastObjectivePeriod = clock.period;
      this.updateObjective();
    }
    if (!this.insideMinistry && !this.insideArchive && !this.insideHotel) {
      this.timeVisual.requestClock(clock);
      this.timeVisual.update(dt);
    }

    this.updateCharacterAnimations(dt);
    this.updateDiagnosticState();
  }

  updateInteractionLabel() {
    const interaction = this.eligibleInteractions().find((entry) => entry.id === this.hoveredId);
    if (!interaction) {
      this.elements.interactionLabel.classList.remove('visible');
      this.preview.renderer.domElement.classList.remove('interaction-hover');
      return;
    }
    this.elements.interactionLabel.textContent = interaction.label;
    this.elements.interactionLabel.style.left = `${this.pointerClient.x}px`;
    this.elements.interactionLabel.style.top = `${this.pointerClient.y}px`;
    this.elements.interactionLabel.classList.add('visible');
  }

  updateOutlines() {
    const state = this.model.snapshot();
    const waitingForToma = !this.insideMinistry
      && state.marketLeadComplete
      && !state.transportEntranceReached;
    // The ministry's deep camera-facing facade crosses the actual public-door
    // landing in the locked isometric view. Clear it for the short entrance
    // objective so Toma and the doorway are both readable, even before Butch
    // is close enough for ordinary player-based occlusion to activate.
    this.preview.setOccludingBuildingForceClear?.('transit-ministry', waitingForToma);
    setActorForegroundVisibility(this.toma, waitingForToma);
    const visible = new Set(
      this.eligibleInteractions()
        .filter((interaction) => this.tabHeld
          || interaction.id === this.hoveredId
          || (DISTANT_GUIDANCE_INTERACTIONS.has(interaction.id)
            && interaction.position.distanceTo(this.preview.player.position) > 7.5))
        .map((interaction) => interaction.outline),
    );
    for (const outline of new Set(this.interactions.map((interaction) => interaction.outline))) {
      outline.visible = visible.has(outline);
    }
    if (waitingForToma) this.tomaOutline.visible = true;
    // Lev leads this first walk. Leave the actual oil route readable while he
    // crosses the square, then return it to ordinary inspect-on-hover logic.
    if (state.guideStarted && !state.explorationBriefingComplete) this.seam.outline.visible = true;
    // Nika's torn copy is the one required object in the public hall that
    // blends into the furniture. Once she names it, the printout breathes on
    // the public table until it is inspected.
    if (this.insideMinistry && state.nikaComplete && !state.discardedPrintInspected) {
      this.discardedPrintOutline.visible = true;
    }
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

  updateObjective() {
    const state = this.model.snapshot();
    this.flipClock.setClock(state.clock);
    if (this.characterQa) {
      this.elements.objectiveTitle.textContent = 'SHARED CHARACTER RIG TEST';
      this.elements.objectiveDetail.textContent = `Seven optimized models · ${this.characterQaAction.toUpperCase()} active`;
      this.elements.statusElement.textContent = `CHARACTER LAB · ${this.characters.state().filter((entry) => entry.loaded).length}/${this.characters.state().length} INSTANCES READY`;
      return;
    }
    let title = 'STEP OFF THE TRAIN';
    let detail = 'Lev has noticed Mara’s route through the city.';
    if (state.chapterComplete) {
      title = 'CHAPTER 03 COMPLETE';
      detail = 'The eastbound train has entered the tunnel.';
    } else if (state.boardedTrain) {
      title = state.blackout ? 'THE TRAIN ENTERS THE TUNNEL' : 'LEAVE ECHO CITY';
      detail = state.blackout
        ? 'The exterior view disappears; the carriage sound runs out in the dark.'
        : 'The heavy carriage door closes before the eastbound train departs.';
    } else if (state.levFinalComplete) {
      title = 'BOARD THE EASTBOUND TRAIN';
      detail = 'Lev remains on the platform. Butch must decide why the search continues.';
    } else if (state.morningEvidenceConfirmed && state.sunriseReturned) {
      title = 'RECONSTRUCT THE CASE WITH LEV';
      detail = 'Lev is beside you with Mara’s original eastbound reservation. Compare it with the daylight findings.';
    } else if (state.sunriseViewed && !state.sunriseReturned) {
      title = 'RETURN TO THE STREET';
      detail = 'Take the same timber walk down from the overlook. The eastbound platform is next.';
    } else if (state.sunriseClimbStarted && !state.sunriseViewed) {
      title = this.overlookTravelElapsed === null ? 'SIT FOR FIVE MINUTES' : 'CLIMB THE OLD SERVICE PATH';
      detail = this.overlookTravelElapsed === null
        ? 'The bench faces the dawn beyond the tunnel ridge.'
        : 'Butch and Lev follow the narrow switchback above the rail cutting.';
    } else if (state.morningReservationCollected && !state.sunriseReturned && !this.insideHotel) {
      title = 'FIND THE OLD SERVICE PATH';
      detail = state.morningFireEncountered
        ? 'Continue west to the timber inspection walk. The scorch marks remain an open lead you can inspect now or after sunrise.'
        : 'The timber inspection walk begins on the west side of the tunnel cutting. Lev says there is time.';
    } else if (state.sunriseReturned && state.morningFireEncountered && !state.morningEvidenceConfirmed && !this.insideHotel) {
      title = 'INSPECT THE SCORCHED LETTERS';
      detail = 'Confirm both burned rows, the reconnected feed and the physical ash before meeting Lev at the station.';
    } else if (state.sunriseReturned && !this.insideHotel) {
      title = 'WALK TO THE EASTBOUND PLATFORM';
      detail = 'Take the central route with Lev before the station stops amending its paper record.';
    } else if (state.morningStarted && !this.insideHotel) {
      title = 'COLLECT THE ORIGINAL RESERVATION';
      detail = 'Nika is waiting at the Transport Ministry entrance with the closed-batch sheet.';
    } else if (state.morningStarted && this.hotelArea === 'room') {
      title = 'LEAVE BUTCH’S ROOM';
      detail = 'Butch wakes alone. The room door opens onto the guest corridor.';
    } else if (state.morningStarted && this.hotelArea === 'corridor') {
      title = 'GO DOWNSTAIRS';
      detail = 'Follow the corridor back to the stair door. The other guest rooms remain closed.';
    } else if (state.morningStarted) {
      title = 'MEET NIKA AT THE MINISTRY';
      detail = 'Collect the original reservation before the station shift changes. Hana has one optional answer before you leave.';
    } else if (this.nightIgnitionElapsed !== null) {
      title = 'WATCH THE SECOND LINE IGNITE';
      detail = this.nightIgnitionProgress < 1
        ? 'Fire is moving through the reconnected lower groove. The dialogue will resume when the full sentence is visible.'
        : 'Both lines are burning. Hold on the complete message before interpreting it.';
    } else if (state.wireReconnected && !state.nightMessageComplete) {
      title = 'READ BOTH BURNING LINES';
      detail = 'Keep the facts separate: Mara was alive when she prepared this, and she says she left by choice.';
    } else if (state.nightFireObserved) {
      title = 'RECONNECT THE LOWER FEED';
      detail = 'The cut ends overlap beside an open clamp. The dark second row is physically prepared to receive current.';
    } else if (state.nightRouteStarted) {
      title = 'FOLLOW THE LIGHT TO THE SQUARE';
      detail = 'The hotel is behind you. The burning first line is the only visible destination.';
    } else if (state.slept && this.hotelArea === 'room') {
      title = 'LEAVE BUTCH’S ROOM';
      detail = 'It is after midnight. Open the room door and step into the silent guest corridor.';
    } else if (state.slept && this.hotelArea === 'corridor') {
      title = 'GO DOWNSTAIRS';
      detail = 'Walk the length of the corridor and use the stair door.';
    } else if (state.slept) {
      title = 'LEAVE THE HOTEL';
      detail = 'The front desk is empty. Orange light reaches the lobby through the street door.';
    } else if (state.evidenceTableComplete) {
      title = 'WAIT FOR MORNING';
      detail = 'No accomplice theory survives the records. The bed is the only useful next step.';
    } else if (state.daroComplete && !state.hotelCorridorEntered) {
      title = 'GO UPSTAIRS';
      detail = 'The lobby interviews are finished. Use the stair door beside the front desk.';
    } else if (state.daroComplete && !state.hotelRoomEntered) {
      title = 'FIND BUTCH’S ROOM';
      detail = 'Walk to the single door at the end of the guest corridor.';
    } else if (state.daroComplete) {
      title = 'TEST EVERY EXPLANATION WITH LEV';
      detail = state.hotelRoomEntered
        ? 'Use the evidence table. Lev will bring each record into the conversation when it becomes relevant.'
        : 'Go upstairs to Butch’s room and test the complete sequence with Lev.';
    } else if (this.departureElapsed !== null) {
      title = 'WATCH THE TRAIN LEAVE';
      detail = 'The exterior camera remains with Butch on the station platform.';
    } else if (state.hotelCheckInComplete) {
      title = 'QUESTION DARO AT THE WINDOW';
      detail = 'Hana saw Mara leave alone. Daro can confirm the route beyond the corner.';
    } else if (state.hotelEntered) {
      title = 'QUESTION HANA';
      detail = 'Read the guest register, then establish whether Mara was alone and when she left.';
    } else if (state.interaction22Complete) {
      title = 'CHECK IN AT THE COPPER HERON';
      detail = 'The archive is closed. The next train leaves tomorrow morning.';
    } else if (state.secondTheoryComplete) {
      title = 'INSPECT THE CUT INTERFACE';
      detail = state.clock.period === 'NIGHT'
        ? 'The night light still leaves both loose ends and the old clamp readable beside the lower row.'
        : 'Low dusk light reveals both loose ends beside the lower row and its old clamp.';
    } else if (state.materialTimelineInspected) {
      title = 'TEST EVERY THEORY WITH LEV';
      detail = 'Outside the archive, test the market, the city, Petar and Lev against the complete timeline.';
    } else if (state.petarInterviewComplete) {
      title = 'ASSEMBLE THE MATERIAL TIMELINE';
      detail = 'Mila has placed the sale, delivery, request, reservation, review and tool records on the centre table.';
    } else if (state.maintenanceOrderInspected) {
      title = 'QUESTION PETAR';
      detail = 'He signed C-441 and is returning his tools in the archive staff corridor.';
    } else if (state.archiveMapInspected) {
      title = 'READ MAINTENANCE ORDER C-441';
      detail = 'The current order is clipped to the side-desk maintenance ledger.';
    } else if (state.archiveEntered) {
      title = 'COMPARE THE SQUARE WITH THE OLD PLAN';
      detail = 'Mila placed the fire-letter plan on the central map table. Ana can explain the legend if needed.';
    } else if (state.interaction14Complete) {
      title = 'TAKE THE MAINTENANCE NUMBER TO THE ARCHIVE';
      detail = 'The two-line layout is confirmed. The old archive can identify who interrupted the second feed.';
    } else if (state.squareBoskoInterviewed) {
      title = 'INSPECT THE PLAZA GROOVES';
      detail = 'Bosko marked two long rows along the south edge of the clock paving.';
    } else if (state.firstTheoryTested) {
      title = 'QUESTION BOSKO IN THE SQUARE';
      detail = 'Ask for the actions he saw, not his interpretation of Mara\'s motives.';
    } else if (state.discardedPrintInspected) {
      title = 'TEST THE THEORY WITH LEV';
      detail = 'Outside the ministry, compare each concealment with what that person could actually know.';
    } else if (state.nikaComplete) {
      title = 'INSPECT NIKA\'S DISCARDED PRINTOUT';
      detail = 'The torn first copy lies on the long public table beside the queue.';
    } else if (state.savaComplete) {
      title = 'COMPARE THE RECORDS WITH NIKA';
      detail = 'Her terminal can place the sale, service hatch, maintenance request and reservation on one timeline.';
    } else if (state.interaction07Complete) {
      title = 'QUESTION SAVA';
      detail = `${state.transportNumber} has been called at counter one. Sava can explain the retired service code.`;
    } else if (state.transportHallEntered) {
      title = 'TAKE A PUBLIC SERVICES NUMBER';
      detail = 'The brass dispenser stands to the left of the queue rails.';
    } else if (state.transportEntranceReached) {
      title = 'ENTER THE PUBLIC HALL';
      detail = 'Toma has directed Butch and Lev to Public Services.';
    } else if (state.marketLeadComplete) {
      title = 'CHECK THE TRANSPORT MINISTRY';
      detail = 'Olek left Mara\'s oil at its rear service hatch. Public access is at the front.';
    } else if (state.edaComplete) {
      title = 'QUESTION THE DELIVERY PORTER';
      detail = 'Eda\'s altered sales copy names Olek. He is beside the grey handcart.';
    } else if (state.firstLeadUnlocked) {
      title = 'ASK WHO SUPPLIED THE OIL';
      detail = 'Eda sells lamp oil under the blue canvas in the market.';
    } else if (state.explorationBriefingComplete) {
      title = 'INSPECT THE OIL LINE';
      detail = 'Lev marked a dark seam between the station and the square.';
    } else if (state.guideStarted) {
      title = 'ENTER THE SQUARE WITH LEV';
      detail = 'He will show you where the oil trail becomes visible.';
    } else if (state.levIntroduced) {
      title = 'WALK THE SCENE WITH LEV';
      detail = 'Lev is leading Butch toward the first visible section of the oil line.';
    } else if (state.arrivalChoice) {
      title = 'WATCH THE TRAIN LEAVE';
      detail = 'You have asked one useful question. Hold onto the answer, not the theory.';
    } else if (state.arrivalObservations.length === 1) {
      title = 'FIND ONE MORE TRACE';
      detail = 'A schedule or a latch alone can mislead. Compare both before you ask.';
    } else if (state.trainDeparted) {
      title = this.dialogue.active ? 'LEV INTRODUCES HIMSELF' : 'THE INVESTIGATOR APPROACHES';
      detail = this.dialogue.active
        ? 'The investigator has come to Butch and opened the conversation.'
        : 'Lev is crossing from the station exit toward Butch.';
    }
    this.elements.statusElement.textContent = title;
    if (this.elements.objectiveTitle) this.elements.objectiveTitle.textContent = title;
    if (this.elements.objectiveDetail) this.elements.objectiveDetail.textContent = detail;
    document.getElementById('objective-parallel')?.classList.remove('visible');
  }

  updateDiagnosticState() {
    this.preview.container.dataset.gameState = JSON.stringify(this.textState());
  }

  updateMusic() {
    const state = this.model.snapshot();
    if (this.postOlekScoreTransitionElapsed !== null) return;
    let cue = 'arrival';
    // Monotonic story flags make this a stable horizontal score: the cue only
    // advances, and the previous cue remains audible during the crossfade.
    if (state.marketLeadComplete && this.postOlekScoreReady) cue = 'market';
    if (state.transportEntranceReached || state.transportHallEntered) cue = 'ministry';
    if (state.firstTheoryTested) cue = 'square';
    if (state.archiveEntranceReached || state.archiveEntered) cue = 'archive';
    if (state.secondTheoryComplete) cue = 'dusk';
    if (state.hotelEntered) cue = 'hotel';
    if (state.nightRouteStarted) cue = 'burning';
    if (state.morningStarted) cue = 'morning';
    if (cue === this.musicCue) return;
    this.musicCue = cue;
    music.play(`c3-${cue}`, { ...C3_MUSIC[cue] });
  }

  textState() {
    const state = this.model.snapshot();
    const actorPosition = (actor) => actor
      ? [actor.position.x, actor.position.y, actor.position.z].map((value) => Number(value.toFixed(2)))
      : null;
    const visibleCapsules = [];
    this.preview.scene.traverse((object) => {
      if (object.geometry?.type !== 'CapsuleGeometry') return;
      let visible = object.visible;
      for (let parent = object.parent; visible && parent; parent = parent.parent) {
        visible = parent.visible;
      }
      if (!visible) return;
      const worldPosition = new THREE.Vector3();
      object.getWorldPosition(worldPosition);
      visibleCapsules.push({
        mesh: object.name || '(unnamed capsule)',
        host: object.parent?.name || '(unnamed host)',
        world: actorPosition({ position: worldPosition }),
      });
    });
    return {
      slice: 'chapter-03-opening',
      music: { ...music.qa(), cue: this.musicCue },
      location: this.insideMinistry
        ? 'transport-ministry-public-hall'
        : this.insideArchive
          ? 'old-municipal-archive-reading-room'
          : this.insideHotel
            ? this.hotelArea === 'room'
              ? 'copper-heron-private-room'
              : this.hotelArea === 'corridor'
                ? 'copper-heron-guest-corridor'
                : 'copper-heron-lobby'
          : 'echo-city-exterior',
      time: state.clock.time,
      period: state.clock.period,
      clock: state.clock,
      timeVisual: this.timeVisual.snapshot(),
      flipClock: this.flipClock.snapshot(),
      evidenceViewer: this.evidenceViewer.snapshot(),
      objective: this.elements.statusElement.textContent,
      taskBubble: (() => {
        const bubble = document.getElementById('task-bubble');
        return {
          visible: bubble?.classList.contains('visible') ?? false,
          title: bubble?.querySelector('b')?.textContent ?? '',
          detail: bubble?.querySelector('span')?.textContent ?? '',
        };
      })(),
      state,
      hoveredInteraction: this.hoveredId,
      tabScanHeld: this.tabHeld,
      eligibleInteractions: this.eligibleInteractions().map((interaction) => interaction.id),
      magicStone: {
        id: 'chapter-3',
        source: 'optional-campfire-seline-dialogue',
        position: actorPosition(this.campfireSeline),
        screen: (() => {
          const projected = this.campfireSeline.position.clone().project(this.preview.camera);
          const rect = this.preview.renderer.domElement.getBoundingClientRect();
          return {
            x: Number(((projected.x + 1) * rect.width * 0.5).toFixed(1)),
            y: Number(((1 - projected.y) * rect.height * 0.5).toFixed(1)),
          };
        })(),
        collected: magicStoneSnapshot().collected.includes('chapter-3'),
        available: Boolean(this.campfireSeline?.visible),
      },
      dialogue: this.dialogue.snapshot(),
      evidence: state.evidence,
      characterRig: {
        qa: this.characterQa,
        qaAction: this.characterQaAction,
        instances: this.characters.state(),
        visibleCapsules,
      },
      replacementAssets: this.replacements.state(),
      sequences: {
        trainDepartureActive: this.departureElapsed !== null,
        trainDepartureSeconds: this.departureElapsed === null ? null : Number(this.departureElapsed.toFixed(2)),
        levGuideActive: this.guideElapsed !== null,
        levCompanionFollowActive: this.morningLevFollowing,
        levAutoFollow: this.autoLevFollow,
        searchPhase: this.searchHintPhase,
        searchSeconds: Number(this.searchHintElapsed.toFixed(1)),
        searchHintShown: this.searchHintLastShownAt >= 0,
        levWalkActive: this.levWalkElapsed !== null,
        levWalkTarget: this.levWalkTarget
          ? actorPosition({ position: this.levWalkTarget })
          : null,
        levHotelExitActive: this.levHotelExitElapsed !== null,
        hotelDoorAnimationActive: this.hotelDoorElapsed !== null,
        nightIgnitionActive: this.nightIgnitionElapsed !== null,
        nightIgnitionSeconds: this.nightIgnitionElapsed === null ? null : Number(this.nightIgnitionElapsed.toFixed(2)),
        nightIgnitionProgress: Number(this.nightIgnitionProgress.toFixed(3)),
        nightExteriorMovementUnlocked: state.nightRouteStarted && !this.insideHotel && !this.interactionLocked(),
        chapterDepartureMs: state.departureSequenceMs,
        chapterBlackout: state.blackout,
        chapterAudioSilent: state.audioSilent,
        sunriseTravelMode: this.overlookTravelMode,
        sunriseTravelSeconds: this.overlookTravelElapsed === null ? null : Number(this.overlookTravelElapsed.toFixed(2)),
        sunriseViewActive: this.sunriseElapsed !== null,
        sunriseViewSeconds: this.sunriseElapsed === null ? null : Number(this.sunriseElapsed.toFixed(2)),
      },
      actors: {
        butch: actorPosition(this.preview.player),
        maraPresent: false,
        lev: this.lev.visible ? actorPosition(this.lev) : null,
        eda: actorPosition(this.eda),
        olek: actorPosition(this.olek),
        toma: actorPosition(this.toma),
        produceVendor: actorPosition(this.produceVendor),
        flowerVendor: actorPosition(this.flowerVendor),
        hana: this.hotelArea === 'lobby' && this.hotelHall?.hana.visible ? actorPosition(this.hotelHall.hana) : null,
        irena: this.hotelArea === 'lobby' && this.hotelHall?.irena.visible ? actorPosition(this.hotelHall.irena) : null,
        vesna: this.hotelArea === 'lobby' && this.hotelHall?.vesna.visible ? actorPosition(this.hotelHall.vesna) : null,
        daro: this.hotelArea === 'lobby' && this.hotelHall?.daro.visible ? actorPosition(this.hotelHall.daro) : null,
        sava: actorPosition(this.ministryHall?.sava),
        nika: actorPosition(this.ministryHall?.nika),
        bosko: actorPosition(this.ministryHall?.bosko),
        squareBosko: this.squareBosko?.visible ? actorPosition(this.squareBosko) : null,
        archiveMilaExterior: this.archiveMilaExterior?.visible ? actorPosition(this.archiveMilaExterior) : null,
        morningNika: this.morningNika?.visible ? actorPosition(this.morningNika) : null,
        alleyGangsterA: this.alleyGangsterA?.visible ? actorPosition(this.alleyGangsterA) : null,
        alleyGangsterB: this.alleyGangsterB?.visible ? actorPosition(this.alleyGangsterB) : null,
        alleyResident: this.alleyResident?.visible ? actorPosition(this.alleyResident) : null,
        mila: this.insideArchive ? actorPosition(this.archiveHall?.mila) : null,
        ana: this.insideArchive ? actorPosition(this.archiveHall?.ana) : null,
        petar: this.insideArchive ? actorPosition(this.archiveHall?.petar) : null,
      },
      props: {
        cartModelFound: Boolean(this.cartObject),
        porterHandcart: actorPosition(this.cartObject),
        activeNpcConversation: this.activeNpcConversationId,
        activeNpcConversations: [...this.activeNpcConversationIds],
        interiorCollision: this.insideMinistry
          ? { room: 'ministry', obstacleCount: MINISTRY_FURNITURE_OBSTACLES.length, pathNodes: this.preview.path.length }
          : this.insideArchive
            ? { room: 'archive', obstacleCount: ARCHIVE_FURNITURE_OBSTACLES.length, pathNodes: this.preview.path.length }
            : this.insideHotel
              ? {
                room: `hotel-${this.hotelArea}`,
                obstacleCount: this.hotelArea === 'lobby'
                  ? HOTEL_LOBBY_FURNITURE_OBSTACLES.length
                  : this.hotelArea === 'room' ? HOTEL_ROOM_FURNITURE_OBSTACLES.length : 0,
                pathNodes: this.preview.path.length,
              }
              : null,
        solventBottle: actorPosition(this.bottle),
        lampOilStall: actorPosition(this.lampOilStall),
        queueDispenser: actorPosition(this.ministryHall?.queueDispenser),
        queueTicketVisible: this.ministryHall?.queueTicket?.visible ?? false,
        discardedPrintVisible: this.ministryHall?.discardedPrint?.visible ?? false,
        plazaGrooves: actorPosition(this.plazaGrooves?.group),
        archiveMapTable: this.insideArchive ? actorPosition(this.archiveHall?.mapTable) : null,
        maintenanceOrder: this.insideArchive ? actorPosition(this.archiveHall?.workOrderDesk) : null,
        materialTimelineVisible: this.archiveHall?.timeline?.visible ?? false,
        cutInterfaceVisible: this.cutInterface?.group?.visible ?? false,
        hotelArea: this.hotelArea,
        hotelEvidenceTable: this.hotelArea === 'room' ? actorPosition(this.hotelHall?.evidenceTable) : null,
        hotelEvidencePaperCount: this.hotelArea === 'room' ? this.hotelHall?.evidencePapers.length ?? 0 : 0,
        hotelBed: this.hotelArea === 'room' ? actorPosition(this.hotelHall?.bed) : null,
        hotelCorridorEntrance: this.hotelArea === 'lobby' ? actorPosition(this.hotelHall?.corridorEntrance) : null,
        hotelBackgroundDoorCount: this.hotelArea === 'corridor' ? this.hotelHall?.backgroundDoors.length ?? 0 : 0,
        hotelPrivateRoomDoor: this.hotelArea === 'corridor' ? actorPosition(this.hotelHall?.butchRoomDoor) : null,
        hotelPrivateRoomDoorRotation: Number((this.hotelHall?.butchDoorPivot.rotation.y ?? 0).toFixed(3)),
        nightMessageFirstVisible: this.groundMessage?.first?.visible ?? false,
        nightMessageSecondVisible: this.groundMessage?.second?.visible ?? false,
        sunriseRouteVisible: this.sunriseOverlook?.group?.visible ?? false,
        sunriseBench: actorPosition(this.sunriseOverlook?.bench),
        sunriseTableauVisible: this.elements.sunriseTableau?.classList.contains('visible') ?? false,
        finalTrainDoorVisible: this.finalDoor?.group?.visible ?? false,
        dreamRendering: document.body.dataset.chapter3DreamRendering ?? 'clear',
        chapterEndCardVisible: Number(this.chapterEndCard?.style.opacity || 0) > 0,
      },
    };
  }
}
