import {
  CHAPTER3_TIME_ANCHORS,
  CHAPTER3_TIME_COSTS,
  advanceChapter3Clock,
  advanceChapter3ClockTo,
  createChapter3Clock,
} from './chapter3TimeSystem.js';

// Chapter 3 · ECHO CITY — the pure story state machine for the release
// chapter (no three.js, no DOM; tests drive it directly).
//
// Beat order (each guard refuses an out-of-order call):
//   arrival → Lev → oil seam → ministry (Toma, number, Nika) → ticket board →
//   Eda → market scanner (walk beside Olek) → cut feed at dusk → Copper Heron
//   (Hana, room, sleep) → night fire (first row, wire into the clamp, bell,
//   second row) → dawn → station scanner (walk beside Mara) → boarding →
//   departure → complete.
//
// Menus never gate: one topic unlocks Continue and the conclusion carries
// every fact the next beat needs.

export const SEAM_OBSERVATIONS = Object.freeze(['geometry', 'fuel', 'cleaning']);
export const NIKA_TOPICS = Object.freeze(['reservation', 'sale']);
export const EDA_TOPICS = Object.freeze(['order', 'collector', 'face']);
export const CUT_INTERFACE_OBSERVATIONS = Object.freeze(['cut', 'placement', 'reconnection']);
export const HANA_TOPICS = Object.freeze(['register', 'departure', 'face']);
export const TICKET_IDS = Object.freeze(['ticket-velez', 'ticket-venn']);
export const SCANNER_IDS = Object.freeze(['market', 'station']);

// Departure after the doors close (ms since boarding).
export const DEPARTURE_TIMELINE = Object.freeze([
  { at: 0, phase: 'turn-to-seat' },
  { at: 5000, phase: 'door-closing' },
  { at: 9000, phase: 'door-latch' },
  { at: 11200, phase: 'train-moving' },
  { at: 21600, phase: 'black-audio-tail' },
  { at: 23600, phase: 'complete' },
]);
const DEPARTURE_END_MS = 23600;

function departurePhase(ms) {
  let phase = DEPARTURE_TIMELINE[0].phase;
  for (const entry of DEPARTURE_TIMELINE) {
    if (ms < entry.at) break;
    phase = entry.phase;
  }
  return phase;
}

function initialState() {
  return {
    mode: 'arrival',
    phase: 'train-door',
    arrivalRead: false,
    trainDeparted: false,
    levIntroduced: false,
    guideStarted: false,
    explorationBriefingComplete: false,
    seamObservations: [],
    seamInspected: false,
    transportEntranceReached: false,
    transportHallEntered: false,
    transportNumber: null,
    nikaTopics: [],
    nikaComplete: false,
    ticketBoard: { lensSeen: [], stacked: false, punched: false },
    ticketBoardComplete: false,
    edaTopics: [],
    edaComplete: false,
    scanners: {
      market: { passed: false, flags: 0 },
      station: { passed: false, flags: 0 },
    },
    marketCrossed: false,
    cutInterfaceObservations: [],
    cutInterfaceComplete: false,
    hotelEntered: false,
    hanaTopics: [],
    hotelCheckInComplete: false,
    hotelCorridorEntered: false,
    hotelRoomEntered: false,
    slept: false,
    nightRoomLeft: false,
    nightLobbyReached: false,
    nightRouteStarted: false,
    nightFireObserved: false,
    wireReconnected: false,
    secondLineLit: false,
    nightMessageComplete: false,
    morningStarted: false,
    sunriseViewed: false,
    stationReached: false,
    maraSighted: false,
    stationScanPassed: false,
    boardedTrain: false,
    departureSequenceMs: 0,
    blackout: false,
    audioSilent: false,
    chapterComplete: false,
    clock: createChapter3Clock(),
    evidence: {
      oilLine: null,
      duplicateTicket: null,
      oilSale: null,
      cutFeed: null,
      hotelGuest: null,
      fireLetters: null,
      stationScan: null,
    },
    lastEvent: 'chapter-started',
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function addUnique(list, value) {
  if (!list.includes(value)) list.push(value);
}

function spend(state, reason, minutes = CHAPTER3_TIME_COSTS.NEW_TOPIC) {
  state.clock = advanceChapter3Clock(state.clock, minutes, reason);
}

function advanceTo(state, anchor, reason) {
  state.clock = advanceChapter3ClockTo(state.clock, anchor, reason);
}

// Every dev playtest start (car03-3d.html?playtest=…) is built by replaying
// the real transitions, so a QA route can never reach a state the chapter
// itself cannot.
const START_SCRIPT = Object.freeze({
  // Alpha round 2 QA starts: the oil line, and the walk to the ministry.
  'oil-seam': (m) => {
    m.readArrival(); m.completeTrainDeparture(); m.completeLevIntroduction(); m.beginGuide();
    m.completeExplorationBriefing();
  },
  'ministry-walk': (m) => {
    START_SCRIPT['oil-seam'](m);
    m.observeSeam('geometry'); m.concludeSeam();
  },
  // Alpha round 4: inside the public hall, before Nika (a resume point).
  'ministry-hall': (m) => {
    START_SCRIPT['ministry-walk'](m);
    m.reachTransportEntrance(); m.enterTransportHall(); m.takeTransportNumber();
  },
  'ticket-board': (m) => {
    START_SCRIPT['ministry-hall'](m);
    m.noteNikaTopic('reservation'); m.completeNika();
  },
  // Alpha round 4: the tickets are filed; the walk to Eda's stall.
  market: (m) => {
    START_SCRIPT['ticket-board'](m);
    for (const id of TICKET_IDS) m.seeTicketThroughLens(id);
    m.stackTickets(); m.punchTickets(); m.completeTicketBoard();
  },
  'market-scanner': (m) => {
    START_SCRIPT.market(m);
    m.noteEdaTopic('collector'); m.completeEda();
  },
  'cut-interface': (m) => {
    START_SCRIPT['market-scanner'](m);
    m.passScanner('market');
  },
  hotel: (m) => {
    START_SCRIPT['cut-interface'](m);
    m.observeCutInterface('placement'); m.concludeCutInterface();
  },
  // Alpha round 4: the Copper Heron lobby (Hana), and the room upstairs.
  'hotel-lobby': (m) => {
    START_SCRIPT.hotel(m);
    m.enterHotel();
  },
  'hotel-room': (m) => {
    START_SCRIPT['hotel-lobby'](m);
    m.noteHanaTopic('face'); m.completeHotelCheckIn();
    m.enterHotelCorridor(); m.enterHotelRoom();
  },
  'night-fire': (m) => {
    START_SCRIPT['hotel-room'](m);
    m.sleepUntilNight();
    m.leaveNightRoom(); m.reachNightLobby(); m.beginNightRoute();
  },
  wire: (m) => {
    START_SCRIPT['night-fire'](m);
    m.observeNightFire();
  },
  morning: (m) => {
    START_SCRIPT.wire(m);
    m.reconnectNightFeed(); m.lightSecondLine(); m.completeNightMessage(); m.beginMorning();
  },
  // Alpha round 4: after the bench, the morning walk to the platform.
  'platform-walk': (m) => {
    START_SCRIPT.morning(m);
    m.completeSunriseView();
  },
  station: (m) => {
    START_SCRIPT['platform-walk'](m);
    m.reachStation();
  },
});

export const CHAPTER3_START_POINTS = Object.freeze(Object.keys(START_SCRIPT));

// ------------------------------------------------------------ resume points
// Alpha round 4 (P1): the save remembers which beat of its checkpoint Butch
// is in, so Continue resumes at the start of that beat instead of the
// platform. Each stage is a START_SCRIPT start (the same replay the dev
// playtest routes use, so a resume can never reach a state the chapter
// cannot). Stages before the market crossing belong to `chapter-3-start`,
// the rest to `chapter-3-dusk` (the crossing saves that checkpoint). The
// arrival and Lev's introduction are the chapter start itself: no stage.
// In beat order: [stage, checkpoint, "this beat has begun"].
export const CHAPTER3_RESUME_STAGES = Object.freeze([
  ['oil-seam', 'chapter-3-start', (s) => s.explorationBriefingComplete],
  ['ministry-walk', 'chapter-3-start', (s) => s.seamInspected],
  ['ministry-hall', 'chapter-3-start', (s) => s.transportHallEntered],
  ['ticket-board', 'chapter-3-start', (s) => s.nikaComplete],
  ['market', 'chapter-3-start', (s) => s.ticketBoardComplete],
  ['market-scanner', 'chapter-3-start', (s) => s.edaComplete],
  ['cut-interface', 'chapter-3-dusk', (s) => s.marketCrossed],
  ['hotel', 'chapter-3-dusk', (s) => s.cutInterfaceComplete],
  ['hotel-lobby', 'chapter-3-dusk', (s) => s.hotelEntered],
  ['hotel-room', 'chapter-3-dusk', (s) => s.hotelCheckInComplete],
  // The night begins when Butch wakes: a resume skips the dark room and
  // opens on the square, where the fire is.
  ['night-fire', 'chapter-3-dusk', (s) => s.slept],
  ['wire', 'chapter-3-dusk', (s) => s.nightFireObserved],
  ['morning', 'chapter-3-dusk', (s) => s.nightMessageComplete],
  ['platform-walk', 'chapter-3-dusk', (s) => s.sunriseViewed],
  ['station', 'chapter-3-dusk', (s) => s.stationReached],
].map(([stage, checkpointId, begun]) => Object.freeze({ stage, checkpointId, begun })));

/** The resume point for a model snapshot: { checkpointId, stage } or null. */
export function chapter3ResumePoint(state) {
  if (!state || state.chapterComplete) return null;
  let found = null;
  for (const entry of CHAPTER3_RESUME_STAGES) {
    if (!entry.begun(state)) break;
    found = entry;
  }
  return found ? { checkpointId: found.checkpointId, stage: found.stage } : null;
}

/** The start a saved resume point opens (validated), or null. */
export function chapter3ResumeStart(checkpointId, data) {
  const entry = CHAPTER3_RESUME_STAGES.find(({ stage }) => stage === data?.stage);
  return entry && entry.checkpointId === checkpointId ? entry.stage : null;
}

export function createChapter3OpeningModel(options = {}) {
  let state = initialState();

  const api = {
    snapshot() {
      return clone(state);
    },

    // ------------------------------------------------------------ arrival
    readArrival() {
      if (state.arrivalRead) return false;
      state.arrivalRead = true;
      state.phase = 'train-departing';
      state.lastEvent = 'arrival-read';
      return true;
    },

    completeTrainDeparture() {
      if (!state.arrivalRead || state.trainDeparted) return false;
      state.trainDeparted = true;
      state.mode = 'arrival-boulevard';
      state.phase = 'meet-lev';
      state.lastEvent = 'train-departed';
      advanceTo(state, CHAPTER3_TIME_ANCHORS.TRAIN_DEPARTED, 'train-departed');
      return true;
    },

    completeLevIntroduction() {
      if (!state.trainDeparted || state.levIntroduced) return false;
      state.levIntroduced = true;
      state.phase = 'follow-lev';
      state.lastEvent = 'lev-introduced';
      return true;
    },

    beginGuide() {
      if (!state.levIntroduced || state.guideStarted) return false;
      state.guideStarted = true;
      state.phase = 'enter-square';
      state.lastEvent = 'following-lev';
      return true;
    },

    completeExplorationBriefing() {
      if (!state.guideStarted || state.explorationBriefingComplete) return false;
      state.explorationBriefingComplete = true;
      state.mode = 'first-investigation';
      state.phase = 'inspect-oil-line';
      state.lastEvent = 'exploration-briefing-complete';
      return true;
    },

    // ------------------------------------------------------------ oil seam
    observeSeam(observation) {
      if (!state.explorationBriefingComplete || state.seamInspected) return false;
      if (!SEAM_OBSERVATIONS.includes(observation) || state.seamObservations.includes(observation)) return false;
      addUnique(state.seamObservations, observation);
      spend(state, `seam-${observation}`);
      state.lastEvent = `seam-observed-${observation}`;
      return true;
    },

    canConcludeSeam() {
      return state.seamObservations.length > 0;
    },

    concludeSeam() {
      if (state.seamInspected || !this.canConcludeSeam()) return false;
      state.seamInspected = true;
      state.mode = 'city';
      state.phase = 'find-ministry';
      state.evidence.oilLine = 'poured-by-hand-along-the-joints';
      state.lastEvent = 'seam-concluded';
      return true;
    },

    // ------------------------------------------------------------ ministry
    reachTransportEntrance() {
      if (!state.seamInspected || state.transportEntranceReached) return false;
      state.transportEntranceReached = true;
      state.phase = 'toma-briefing';
      state.lastEvent = 'transport-entrance-reached';
      return true;
    },

    enterTransportHall() {
      if (!state.transportEntranceReached || state.transportHallEntered) return false;
      state.transportHallEntered = true;
      state.mode = 'transport-ministry-hall';
      state.phase = 'take-number';
      state.lastEvent = 'transport-hall-entered';
      advanceTo(state, CHAPTER3_TIME_ANCHORS.TRANSPORT_ENTERED, 'transport-hall-entered');
      return true;
    },

    takeTransportNumber(number = 'M-17') {
      if (!state.transportHallEntered || state.transportNumber) return false;
      state.transportNumber = number;
      state.phase = 'question-nika';
      state.lastEvent = 'transport-number-taken';
      spend(state, 'public-services-number');
      return true;
    },

    noteNikaTopic(topic) {
      if (!state.transportNumber || state.nikaComplete) return false;
      if (!NIKA_TOPICS.includes(topic) || state.nikaTopics.includes(topic)) return false;
      addUnique(state.nikaTopics, topic);
      spend(state, `nika-${topic}`);
      state.lastEvent = `nika-topic-${topic}`;
      return true;
    },

    canCompleteNika() {
      return state.nikaTopics.length > 0;
    },

    completeNika() {
      if (!state.transportNumber || state.nikaComplete || !this.canCompleteNika()) return false;
      state.nikaComplete = true;
      state.phase = 'ticket-board';
      state.lastEvent = 'nika-printed-both-tickets';
      return true;
    },

    // ------------------------------------------------------------ ticket board
    seeTicketThroughLens(ticketId) {
      if (!state.nikaComplete || state.ticketBoardComplete || !TICKET_IDS.includes(ticketId)) return false;
      if (state.ticketBoard.lensSeen.includes(ticketId)) return false;
      addUnique(state.ticketBoard.lensSeen, ticketId);
      state.lastEvent = `lens-saw-${ticketId}`;
      return true;
    },

    stackTickets(stacked = true) {
      if (!state.nikaComplete || state.ticketBoard.punched) return false;
      if (state.ticketBoard.stacked === Boolean(stacked)) return false;
      state.ticketBoard.stacked = Boolean(stacked);
      state.lastEvent = stacked ? 'tickets-stacked' : 'tickets-unstacked';
      return true;
    },

    // Both claim numbers must have been seen through the 1978 lens, and the
    // two tickets must lie one on the other, before one punch files them.
    canPunchTickets() {
      return state.nikaComplete
        && !state.ticketBoard.punched
        && state.ticketBoard.stacked
        && TICKET_IDS.every((id) => state.ticketBoard.lensSeen.includes(id));
    },

    punchTickets() {
      if (!this.canPunchTickets()) return false;
      state.ticketBoard.punched = true;
      state.evidence.duplicateTicket = 'venn-is-the-duplicate-of-velez-claim-1978-0412';
      state.lastEvent = 'tickets-filed-as-one';
      return true;
    },

    completeTicketBoard() {
      if (!state.ticketBoard.punched || state.ticketBoardComplete) return false;
      state.ticketBoardComplete = true;
      state.mode = 'city';
      state.phase = 'find-eda';
      state.lastEvent = 'ticket-board-complete';
      advanceTo(state, CHAPTER3_TIME_ANCHORS.TICKET_BOARD_FILED, 'ticket-board-filed');
      return true;
    },

    // ------------------------------------------------------------ market
    noteEdaTopic(topic) {
      if (!state.ticketBoardComplete || state.edaComplete) return false;
      if (!EDA_TOPICS.includes(topic) || state.edaTopics.includes(topic)) return false;
      addUnique(state.edaTopics, topic);
      spend(state, `eda-${topic}`);
      state.lastEvent = `eda-topic-${topic}`;
      return true;
    },

    canCompleteEda() {
      return state.edaTopics.length > 0;
    },

    completeEda() {
      if (!state.ticketBoardComplete || state.edaComplete || !this.canCompleteEda()) return false;
      state.edaComplete = true;
      state.phase = 'cross-market-scanner';
      state.evidence.oilSale = 'seat-43-carried-by-olek';
      state.lastEvent = 'eda-complete';
      return true;
    },

    scannerActive(scannerId) {
      if (scannerId === 'market') return state.edaComplete && !state.marketCrossed;
      if (scannerId === 'station') return state.stationReached && !state.stationScanPassed;
      return false;
    },

    flagScanner(scannerId) {
      if (!this.scannerActive(scannerId)) return false;
      state.scanners[scannerId].flags += 1;
      state.lastEvent = `scanner-${scannerId}-flagged-alone`;
      return true;
    },

    passScanner(scannerId) {
      if (!this.scannerActive(scannerId)) return false;
      state.scanners[scannerId].passed = true;
      if (scannerId === 'market') {
        state.marketCrossed = true;
        state.phase = 'find-cut-feed';
        state.lastEvent = 'market-scanner-crossed-beside-olek';
        advanceTo(state, CHAPTER3_TIME_ANCHORS.MARKET_CROSSED, 'market-crossed');
      } else {
        state.stationScanPassed = true;
        state.phase = 'boarding';
        state.evidence.stationScan = 'one-passenger-claim-1978-0412';
        state.lastEvent = 'station-scanner-read-one-passenger';
      }
      return true;
    },

    // ------------------------------------------------------------ dusk
    observeCutInterface(observation) {
      if (!state.marketCrossed || state.cutInterfaceComplete) return false;
      if (!CUT_INTERFACE_OBSERVATIONS.includes(observation) || state.cutInterfaceObservations.includes(observation)) return false;
      addUnique(state.cutInterfaceObservations, observation);
      spend(state, `cut-interface-${observation}`);
      state.lastEvent = `cut-interface-${observation}`;
      return true;
    },

    canConcludeCutInterface() {
      return state.cutInterfaceObservations.length > 0;
    },

    concludeCutInterface() {
      if (state.cutInterfaceComplete || !state.marketCrossed || !this.canConcludeCutInterface()) return false;
      state.cutInterfaceComplete = true;
      state.phase = 'check-in-hotel';
      state.evidence.cutFeed = 'cut-by-petar-ends-left-reconnectable';
      state.lastEvent = 'cut-interface-complete';
      advanceTo(state, CHAPTER3_TIME_ANCHORS.CUT_INTERFACE_COMPLETE, 'cut-interface-complete');
      return true;
    },

    // ------------------------------------------------------------ hotel
    enterHotel() {
      if (!state.cutInterfaceComplete || state.hotelEntered) return false;
      state.hotelEntered = true;
      state.mode = 'copper-heron-lobby';
      state.phase = 'question-hana';
      advanceTo(state, CHAPTER3_TIME_ANCHORS.HOTEL_CHECK_IN, 'walk-to-copper-heron');
      state.lastEvent = 'copper-heron-entered';
      return true;
    },

    noteHanaTopic(topic) {
      if (!state.hotelEntered || state.hotelCheckInComplete) return false;
      if (!HANA_TOPICS.includes(topic) || state.hanaTopics.includes(topic)) return false;
      addUnique(state.hanaTopics, topic);
      spend(state, `hana-${topic}`);
      state.lastEvent = `hana-topic-${topic}`;
      return true;
    },

    canCompleteHana() {
      return state.hanaTopics.length > 0;
    },

    completeHotelCheckIn() {
      if (!state.hotelEntered || state.hotelCheckInComplete || !this.canCompleteHana()) return false;
      state.hotelCheckInComplete = true;
      state.phase = 'go-upstairs';
      state.evidence.hotelGuest = 'room-six-seat-43-face-never-seen';
      state.lastEvent = 'hotel-check-in-complete';
      return true;
    },

    enterHotelCorridor() {
      if (!state.hotelCheckInComplete || state.hotelCorridorEntered) return false;
      state.hotelCorridorEntered = true;
      state.mode = 'copper-heron-corridor';
      state.phase = 'find-room';
      state.lastEvent = 'hotel-corridor-entered';
      return true;
    },

    enterHotelRoom() {
      if (!state.hotelCorridorEntered || state.hotelRoomEntered) return false;
      state.hotelRoomEntered = true;
      state.mode = 'copper-heron-private-room';
      state.phase = 'sleep';
      state.lastEvent = 'room-entered';
      return true;
    },

    sleepUntilNight() {
      if (!state.hotelRoomEntered || state.slept) return false;
      state.slept = true;
      state.mode = 'copper-heron-night';
      state.phase = 'leave-room-at-night';
      advanceTo(state, CHAPTER3_TIME_ANCHORS.NIGHT_WAKE, 'sleep-until-night-fire');
      state.lastEvent = 'slept-until-the-fire';
      return true;
    },

    leaveNightRoom() {
      if (!state.slept || state.nightRoomLeft) return false;
      state.nightRoomLeft = true;
      state.mode = 'copper-heron-night-corridor';
      state.phase = 'walk-night-corridor';
      state.lastEvent = 'night-room-left';
      return true;
    },

    reachNightLobby() {
      if (!state.nightRoomLeft || state.nightLobbyReached) return false;
      state.nightLobbyReached = true;
      state.mode = 'copper-heron-night-lobby';
      state.phase = 'leave-hotel-at-night';
      state.lastEvent = 'night-lobby-reached';
      return true;
    },

    beginNightRoute() {
      if (!state.nightLobbyReached || state.nightRouteStarted) return false;
      state.nightRouteStarted = true;
      state.mode = 'central-square-night';
      state.phase = 'read-first-fire-line';
      state.lastEvent = 'night-route-started';
      return true;
    },

    // ------------------------------------------------------------ night fire
    observeNightFire() {
      if (!state.nightRouteStarted || state.nightFireObserved) return false;
      state.nightFireObserved = true;
      state.phase = 'reconnect-night-feed';
      state.lastEvent = 'night-first-line-read';
      return true;
    },

    // The feed is dragged into the clamp; it lights on the next bell.
    reconnectNightFeed() {
      if (!state.nightFireObserved || state.wireReconnected) return false;
      state.wireReconnected = true;
      state.phase = 'wait-for-bell';
      state.lastEvent = 'night-feed-in-clamp';
      return true;
    },

    lightSecondLine() {
      if (!state.wireReconnected || state.secondLineLit) return false;
      state.secondLineLit = true;
      state.phase = 'read-second-fire-line';
      state.lastEvent = 'second-line-lit-on-the-bell';
      return true;
    },

    completeNightMessage() {
      if (!state.secondLineLit || state.nightMessageComplete) return false;
      state.nightMessageComplete = true;
      state.evidence.fireLetters = 'another-mark-keep-moving';
      state.lastEvent = 'night-message-complete';
      return true;
    },

    // ------------------------------------------------------------ dawn
    beginMorning() {
      if (!state.nightMessageComplete || state.morningStarted) return false;
      state.morningStarted = true;
      state.mode = 'dawn-overlook';
      state.phase = 'sunrise';
      advanceTo(state, CHAPTER3_TIME_ANCHORS.SUNRISE_OVERLOOK, 'dawn-with-lev');
      state.lastEvent = 'morning-started';
      return true;
    },

    completeSunriseView() {
      if (!state.morningStarted || state.sunriseViewed) return false;
      state.sunriseViewed = true;
      state.mode = 'morning-city';
      state.phase = 'walk-to-station';
      state.lastEvent = 'sunrise-viewed';
      return true;
    },

    // ------------------------------------------------------------ station
    reachStation() {
      if (!state.sunriseViewed || state.stationReached) return false;
      state.stationReached = true;
      state.mode = 'station-platform';
      state.phase = 'cross-station-scanner';
      advanceTo(state, CHAPTER3_TIME_ANCHORS.NIGHT_SERVICE_BOARDING, 'night-service-at-the-platform');
      state.lastEvent = 'station-reached';
      return true;
    },

    sightMara() {
      if (!state.stationReached || state.maraSighted) return false;
      state.maraSighted = true;
      state.lastEvent = 'mara-ahead-at-the-scanner';
      return true;
    },

    boardTrain() {
      if (!state.stationScanPassed || state.boardedTrain) return false;
      state.boardedTrain = true;
      state.mode = 'departure-sequence';
      state.phase = departurePhase(0);
      state.lastEvent = 'butch-boarded-mara-gone';
      return true;
    },

    advanceDeparture(milliseconds) {
      if (!state.boardedTrain || state.chapterComplete) return false;
      state.departureSequenceMs = Math.min(
        DEPARTURE_END_MS,
        state.departureSequenceMs + Math.max(0, Number(milliseconds) || 0),
      );
      const ms = state.departureSequenceMs;
      state.phase = departurePhase(ms);
      state.blackout = ms >= 21600;
      state.audioSilent = ms >= DEPARTURE_END_MS;
      state.chapterComplete = state.audioSilent;
      state.lastEvent = `departure-${state.phase}`;
      return true;
    },

    advanceDialogueTime(reason = 'runtime-dialogue-topic', minutes = CHAPTER3_TIME_COSTS.NEW_TOPIC) {
      spend(state, reason, minutes);
      return clone(state.clock);
    },

    reset() {
      state = initialState();
      START_SCRIPT[options.startAt]?.(api);
      return clone(state);
    },
  };

  START_SCRIPT[options.startAt]?.(api);
  if (options.startAt && START_SCRIPT[options.startAt]) {
    state.lastEvent = options.resumed ? `${options.startAt}-resumed` : `${options.startAt}-qa-started`;
  }
  return Object.freeze(api);
}
