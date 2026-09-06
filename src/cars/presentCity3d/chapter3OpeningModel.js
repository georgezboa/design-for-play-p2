import {
  CHAPTER3_TIME_ANCHORS,
  CHAPTER3_TIME_COSTS,
  advanceChapter3Clock,
  advanceChapter3ClockTo,
  createChapter3Clock,
} from './chapter3TimeSystem.js';

export const ARRIVAL_CHOICES = Object.freeze(['arrival-pattern', 'arrival-tenderness', 'arrival-nerve']);
export const ARRIVAL_OBSERVATIONS = Object.freeze(['route-board', 'gate-latch']);
export const SEAM_OBSERVATIONS = Object.freeze(['geometry', 'fuel', 'cleaning']);
export const SEAM_INFERENCES = Object.freeze(['deliberate', 'cart-leak', 'reserve-judgment']);
export const EDA_APPROACHES = Object.freeze(['direct', 'patient', 'pressuring']);
export const EDA_TOPICS = Object.freeze(['product', 'order', 'collector', 'authorization', 'complaint']);
export const OLEK_TOPICS = Object.freeze(['destination', 'leak', 'recipient', 'route']);
export const BOTTLE_INFERENCES = Object.freeze(['same-order', 'overclaimed', 'bounded']);
export const SAVA_TOPICS = Object.freeze(['code-history', 'anonymous-use', 'mara-transaction', 'no-correction']);
export const NIKA_TOPICS = Object.freeze(['timeline', 'reservation', 'discarded-print', 'source-records']);
export const FIRST_THEORIES = Object.freeze(['market-ministry', 'code-cover', 'planned-handoff']);
export const GROOVE_OBSERVATIONS = Object.freeze(['rows', 'spacing', 'feed-gap']);
export const PETAR_TOPICS = Object.freeze(['instruction', 'route', 'surface-view', 'cleaning']);
export const SECOND_THEORIES = Object.freeze(['market-coordination', 'municipal-censorship', 'petar-knew-message', 'lev-steered-case']);
// The removed menu branches stay valid for existing saves and QA entry
// states, but are no longer required by the shorter playable route.
const REQUIRED_PETAR_TOPICS = Object.freeze(['instruction', 'surface-view', 'cleaning']);
const REQUIRED_SECOND_THEORIES = Object.freeze(['market-coordination', 'municipal-censorship', 'petar-knew-message']);
export const CUT_INTERFACE_OBSERVATIONS = Object.freeze(['cut', 'placement', 'reconnection']);
export const HANA_TOPICS = Object.freeze(['register', 'alone', 'departure']);
export const DARO_TOPICS = Object.freeze(['position', 'sequence', 'limits']);
export const HOTEL_EVIDENCE_PAPERS = Object.freeze(['oil-route', 'issue-copy', 'order-c441', 'witness-notes', 'reservation']);
export const FINAL_THEORIES = Object.freeze(['market-help', 'municipal-cover', 'petar-destroyed', 'lev-controlled', 'mara-coerced']);
export const MORNING_OBSERVATIONS = Object.freeze(['scorch', 'connector', 'ash']);
export const FINAL_TIMELINE_TOPICS = Object.freeze(['message', 'methods', 'eastbound']);
export const CONTINUATION_ATTITUDES = Object.freeze(['need-reason', 'safety', 'cannot-stop']);

function initialState() {
  return {
    mode: 'arrival',
    phase: 'train-door',
    arrivalChoice: null,
    arrivalApproach: null,
    arrivalObservations: [],
    maraPhotoShown: false,
    maraSightingReported: false,
    trainDeparted: false,
    levIntroduced: false,
    guideStarted: false,
    explorationBriefingComplete: false,
    seamObservations: [],
    seamInference: null,
    seamInspected: false,
    firstLeadUnlocked: false,
    edaApproach: null,
    edaCooperation: null,
    edaTopics: [],
    edaRecordObtained: false,
    edaComplete: false,
    cartInspected: false,
    olekTopics: [],
    olekRouteConfirmed: false,
    marketLeadComplete: false,
    solventBottleObserved: false,
    bottleInference: null,
    transportEntranceReached: false,
    transportHallEntered: false,
    transportNumber: null,
    interaction07Complete: false,
    batchComplete: false,
    savaTopics: [],
    savaComplete: false,
    nikaTopics: [],
    nikaComplete: false,
    boskoQueueAsked: false,
    discardedPrintInspected: false,
    firstTheory: null,
    firstTheoryTested: false,
    squareBoskoInterviewed: false,
    grooveObservations: [],
    grooveConclusion: null,
    interaction14Complete: false,
    archiveEntranceReached: false,
    archiveEntered: false,
    anaMapHelpAsked: false,
    archiveMapInspected: false,
    maintenanceOrderInspected: false,
    petarTopics: [],
    petarInterviewComplete: false,
    materialTimelineInspected: false,
    secondTheoriesTested: [],
    secondTheoryComplete: false,
    cutInterfaceObservations: [],
    cutInterfaceConclusion: null,
    interaction22Complete: false,
    hotelEntered: false,
    hanaTopics: [],
    hotelCheckInComplete: false,
    hotelGuestsAsked: [],
    daroTopics: [],
    daroComplete: false,
    hotelCorridorEntered: false,
    hotelRoomEntered: false,
    hotelPapersRead: [],
    finalTheoriesTested: [],
    evidenceTableComplete: false,
    slept: false,
    nightRoomLeft: false,
    nightLobbyReached: false,
    nightRouteStarted: false,
    nightFireObserved: false,
    wireReconnected: false,
    nightMessageComplete: false,
    morningStarted: false,
    morningRoomLeft: false,
    morningLobbyReached: false,
    morningReservationCollected: false,
    sunriseClimbStarted: false,
    sunriseViewed: false,
    sunriseReturned: false,
    morningFireEncountered: false,
    hanaBreakfastAsked: false,
    morningObservations: [],
    morningEvidenceConfirmed: false,
    finalTimelineTopics: [],
    levFinalComplete: false,
    continuationAttitude: null,
    boardedTrain: false,
    departureSequenceMs: 0,
    blackout: false,
    audioSilent: false,
    chapterComplete: false,
    clock: createChapter3Clock(),
    evidence: {
      maraSighting: null,
      oilSeam: null,
      lampOilSalesCopy: null,
      deliveryRoute: null,
      solventBottle: null,
      retiredCodePractice: null,
      eastboundReservation: null,
      discardedMaintenancePrint: null,
      independentSquareSighting: null,
      plazaGrooves: null,
      archiveFeedPlan: null,
      maintenanceOrder: null,
      petarCutBranch: null,
      materialTimeline: null,
      cutInterface: null,
      hotelRegister: null,
      daroSightline: null,
      evidenceTable: null,
      nightMessage: null,
      morningFire: null,
      eastboundOriginal: null,
    },
    suspicions: {
      edaActivelyConcealedBuyer: false,
      olekActivelyConcealedRoute: false,
      savaLeftTransactionUncorrected: false,
      nikaDiscardedPrintout: false,
      petarCutBranch: false,
      hanaOmittedGuest: false,
    },
    lastEvent: 'chapter-started',
  };
}

function interaction08State() {
  const state = interaction07State();
  Object.assign(state, {
    mode: 'transport-ministry-hall',
    phase: 'sava-counter',
    transportEntranceReached: true,
    transportHallEntered: true,
    transportNumber: 'M-17',
    interaction07Complete: true,
    batchComplete: true,
    lastEvent: 'interaction-08-started',
  });
  state.clock = advanceChapter3ClockTo(state.clock, CHAPTER3_TIME_ANCHORS.TRANSPORT_ENTERED, 'direct-interaction-08');
  return state;
}

function interaction13State() {
  const state = interaction08State();
  Object.assign(state, {
    mode: 'transport-ministry-exterior',
    phase: 'question-bosko-square',
    savaTopics: ['code-history', 'anonymous-use', 'mara-transaction', 'no-correction'],
    savaComplete: true,
    nikaTopics: ['timeline', 'reservation', 'discarded-print', 'source-records'],
    nikaComplete: true,
    boskoQueueAsked: true,
    discardedPrintInspected: true,
    firstTheory: 'market-ministry',
    firstTheoryTested: true,
    squareBoskoInterviewed: false,
    evidence: {
      ...state.evidence,
      retiredCodePractice: 'confirmed-standing-practice',
      eastboundReservation: 'm-venn-unconfirmed-identity',
      discardedMaintenancePrint: 'confirmed',
      independentSquareSighting: null,
    },
    suspicions: {
      ...state.suspicions,
      savaLeftTransactionUncorrected: true,
      nikaDiscardedPrintout: true,
    },
    lastEvent: 'interaction-13-started',
  });
  state.clock = advanceChapter3ClockTo(state.clock, CHAPTER3_TIME_ANCHORS.BOSKO_SQUARE, 'direct-interaction-13');
  return state;
}

function interaction14State() {
  const state = interaction13State();
  Object.assign(state, {
    mode: 'central-square',
    phase: 'inspect-plaza-grooves',
    squareBoskoInterviewed: true,
    evidence: {
      ...state.evidence,
      independentSquareSighting: 'mara-worked-alone',
    },
    lastEvent: 'interaction-14-started',
  });
  return state;
}

function interaction15State() {
  const state = interaction14State();
  Object.assign(state, {
    mode: 'archive-exterior',
    phase: 'archive-entrance',
    grooveObservations: ['rows', 'spacing', 'feed-gap'],
    grooveConclusion: 'two-line-lettering-second-feed-incomplete',
    interaction14Complete: true,
    evidence: {
      ...state.evidence,
      plazaGrooves: 'two-lines-second-feed-incomplete',
    },
    lastEvent: 'interaction-15-started',
  });
  state.clock = advanceChapter3ClockTo(state.clock, CHAPTER3_TIME_ANCHORS.GROOVES_CONCLUDED, 'direct-interaction-15');
  return state;
}

function interaction21State() {
  const state = interaction15State();
  Object.assign(state, {
    mode: 'archive-exterior',
    phase: 'test-second-theories',
    archiveEntranceReached: true,
    archiveEntered: true,
    anaMapHelpAsked: true,
    archiveMapInspected: true,
    maintenanceOrderInspected: true,
    petarTopics: [...PETAR_TOPICS],
    petarInterviewComplete: true,
    materialTimelineInspected: true,
    evidence: {
      ...state.evidence,
      archiveFeedPlan: 'one-main-feed-one-short-branch',
      maintenanceOrder: 'isolate-unregistered-branch-petar-signed',
      petarCutBranch: 'confirmed-without-message-knowledge',
      materialTimeline: 'no-shared-meeting-or-knowledge',
    },
    suspicions: {
      ...state.suspicions,
      petarCutBranch: true,
    },
    lastEvent: 'interaction-21-started',
  });
  state.clock = advanceChapter3ClockTo(state.clock, CHAPTER3_TIME_ANCHORS.MATERIAL_TIMELINE, 'direct-interaction-21');
  return state;
}

function interaction22State() {
  const state = interaction21State();
  Object.assign(state, {
    mode: 'central-square-dusk',
    phase: 'inspect-cut-interface',
    secondTheoriesTested: [...SECOND_THEORIES],
    secondTheoryComplete: true,
    lastEvent: 'interaction-22-started',
  });
  state.clock = advanceChapter3Clock(state.clock, 4, 'direct-four-second-theories');
  return state;
}

function nightTransitionQaState() {
  const state = interaction22State();
  state.clock = advanceChapter3ClockTo(
    state.clock,
    { day: 1, minuteOfDay: 21 * 60 + 29 },
    'qa-night-threshold',
  );
  state.lastEvent = 'night-transition-qa-started';
  return state;
}

function duskCampfireQaState() {
  const state = interaction22State();
  state.clock = advanceChapter3ClockTo(
    state.clock,
    { day: 1, minuteOfDay: 18 * 60 + 20 },
    'qa-dusk-campfire',
  );
  state.lastEvent = 'dusk-campfire-qa-started';
  return state;
}

function interaction23State() {
  const state = interaction22State();
  Object.assign(state, {
    mode: 'copper-heron-exterior',
    phase: 'enter-copper-heron',
    cutInterfaceObservations: [...CUT_INTERFACE_OBSERVATIONS],
    cutInterfaceConclusion: 'reconnectable-ends-prepared-by-unknown-person',
    interaction22Complete: true,
    lastEvent: 'interaction-23-started',
  });
  state.evidence.cutInterface = 'reconnectable-origin-unknown';
  state.clock = advanceChapter3ClockTo(state.clock, CHAPTER3_TIME_ANCHORS.CUT_INTERFACE_COMPLETE, 'direct-interaction-23');
  return state;
}

function interaction25State() {
  const state = interaction23State();
  state.mode = 'copper-heron-lobby';
  state.hotelEntered = true;
  state.hanaTopics = [...HANA_TOPICS];
  state.hotelCheckInComplete = true;
  state.phase = 'question-daro';
  state.evidence.hotelRegister = 'blank-line-standing-practice-mara-alone';
  state.suspicions.hanaOmittedGuest = true;
  state.clock = advanceChapter3ClockTo(state.clock, CHAPTER3_TIME_ANCHORS.HOTEL_CHECK_IN, 'direct-interaction-25');
  state.lastEvent = 'interaction-25-started';
  return state;
}

function interaction26State() {
  const state = interaction25State();
  state.mode = 'copper-heron-private-room';
  state.daroTopics = [...DARO_TOPICS];
  state.daroComplete = true;
  state.hotelCorridorEntered = true;
  state.hotelRoomEntered = true;
  state.phase = 'evidence-table';
  state.evidence.daroSightline = 'mara-alone-hotel-square-station';
  state.lastEvent = 'interaction-26-started';
  return state;
}

function hotelCorridorQaState() {
  const state = interaction25State();
  state.mode = 'copper-heron-corridor';
  state.daroTopics = [...DARO_TOPICS];
  state.daroComplete = true;
  state.hotelCorridorEntered = true;
  state.phase = 'find-butch-room';
  state.evidence.daroSightline = 'mara-alone-hotel-square-station';
  state.lastEvent = 'hotel-corridor-qa-started';
  return state;
}

function interaction27State() {
  const state = interaction26State();
  state.hotelPapersRead = [...HOTEL_EVIDENCE_PAPERS];
  state.finalTheoriesTested = [...FINAL_THEORIES];
  state.evidenceTableComplete = true;
  state.phase = 'sleep';
  state.evidence.evidenceTable = 'mara-alone-knew-complete-sequence';
  state.lastEvent = 'interaction-27-started';
  return state;
}

function levHotelExitQaState() {
  const state = interaction26State();
  state.hotelPapersRead = [...HOTEL_EVIDENCE_PAPERS];
  state.finalTheoriesTested = [...FINAL_THEORIES];
  state.phase = 'evidence-table';
  state.lastEvent = 'lev-hotel-exit-qa-started';
  return state;
}

function nightHotelQaState() {
  const state = interaction27State();
  state.slept = true;
  state.mode = 'copper-heron-night';
  state.phase = 'leave-hotel-at-night';
  state.clock = advanceChapter3ClockTo(state.clock, CHAPTER3_TIME_ANCHORS.NIGHT_WAKE, 'night-hotel-qa');
  state.lastEvent = 'night-hotel-qa-started';
  return state;
}

function nightLobbyQaState() {
  const state = nightHotelQaState();
  state.nightRoomLeft = true;
  state.nightLobbyReached = true;
  state.mode = 'copper-heron-night-lobby';
  state.phase = 'leave-hotel-at-night';
  state.lastEvent = 'night-lobby-qa-started';
  return state;
}

function nightExteriorQaState() {
  const state = nightLobbyQaState();
  state.nightRouteStarted = true;
  state.mode = 'central-square-night';
  state.phase = 'read-first-fire-line';
  state.lastEvent = 'night-exterior-qa-started';
  return state;
}

function interaction29State() {
  const state = interaction27State();
  state.slept = true;
  state.nightRoomLeft = true;
  state.nightLobbyReached = true;
  state.nightRouteStarted = true;
  state.mode = 'central-square-night';
  state.phase = 'read-first-fire-line';
  state.clock = advanceChapter3ClockTo(state.clock, CHAPTER3_TIME_ANCHORS.NIGHT_WAKE, 'direct-interaction-29');
  state.lastEvent = 'interaction-29-started';
  return state;
}

function interaction31State() {
  const state = interaction29State();
  state.nightFireObserved = true;
  state.wireReconnected = true;
  state.nightMessageComplete = true;
  state.morningStarted = true;
  state.mode = 'copper-heron-morning';
  state.phase = 'collect-original-reservation';
  state.evidence.nightMessage = 'alive-left-by-choice-unconfirmed-until-morning';
  state.clock = advanceChapter3ClockTo(state.clock, CHAPTER3_TIME_ANCHORS.DAWN_RETURN, 'direct-interaction-31');
  state.lastEvent = 'interaction-31-started';
  return state;
}

function interaction32State() {
  const state = interaction31State();
  state.morningReservationCollected = true;
  state.sunriseClimbStarted = true;
  state.sunriseViewed = true;
  state.sunriseReturned = true;
  state.morningFireEncountered = true;
  state.morningObservations = [...MORNING_OBSERVATIONS];
  state.morningEvidenceConfirmed = true;
  state.mode = 'station-approach';
  state.phase = 'reconstruct-with-lev';
  state.evidence.morningFire = 'mara-alive-left-by-choice-confirmed';
  state.lastEvent = 'interaction-32-started';
  return state;
}

function sunriseOverlookQaState() {
  const state = interaction31State();
  state.morningRoomLeft = true;
  state.morningLobbyReached = true;
  state.morningReservationCollected = true;
  state.mode = 'morning-overlook-route';
  state.phase = 'reach-tunnel-overlook';
  state.lastEvent = 'sunrise-overlook-qa-started';
  return state;
}

function morningExteriorQaState() {
  const state = interaction31State();
  state.morningRoomLeft = true;
  state.morningLobbyReached = true;
  state.mode = 'copper-heron-morning-exterior';
  state.phase = 'collect-original-reservation';
  state.lastEvent = 'morning-exterior-qa-started';
  return state;
}

function interaction33State() {
  const state = interaction32State();
  state.finalTimelineTopics = [...FINAL_TIMELINE_TOPICS];
  state.levFinalComplete = true;
  state.phase = 'choose-why-continue';
  state.evidence.eastboundOriginal = 'mara-route-consistent-eastbound';
  state.clock = advanceChapter3ClockTo(state.clock, CHAPTER3_TIME_ANCHORS.EASTBOUND_BOARDING, 'direct-interaction-33');
  state.lastEvent = 'interaction-33-started';
  return state;
}

function interaction07State() {
  const state = initialState();
  Object.assign(state, {
    mode: 'transport-ministry-exterior',
    phase: 'transport-entrance',
    arrivalChoice: 'arrival-nerve',
    arrivalApproach: 'nerve',
    arrivalObservations: ['route-board', 'gate-latch'],
    maraPhotoShown: true,
    maraSightingReported: true,
    trainDeparted: true,
    levIntroduced: true,
    guideStarted: true,
    explorationBriefingComplete: true,
    seamObservations: ['geometry', 'fuel'],
    seamInference: 'deliberate',
    seamInspected: true,
    firstLeadUnlocked: true,
    edaApproach: 'direct',
    edaCooperation: 'professional',
    edaTopics: ['collector', 'authorization'],
    edaRecordObtained: true,
    edaComplete: true,
    cartInspected: true,
    olekTopics: ['destination', 'route'],
    olekRouteConfirmed: true,
    marketLeadComplete: true,
    solventBottleObserved: true,
    bottleInference: 'bounded',
    evidence: {
      maraSighting: 'corroborated',
      oilSeam: 'observed',
      lampOilSalesCopy: 'confirmed',
      deliveryRoute: 'confirmed',
      solventBottle: 'observed',
      retiredCodePractice: null,
      eastboundReservation: null,
      discardedMaintenancePrint: null,
      independentSquareSighting: null,
      plazaGrooves: null,
      archiveFeedPlan: null,
      maintenanceOrder: null,
      petarCutBranch: null,
      materialTimeline: null,
      cutInterface: null,
      hotelRegister: null,
      daroSightline: null,
      evidenceTable: null,
      nightMessage: null,
      morningFire: null,
      eastboundOriginal: null,
    },
    suspicions: {
      edaActivelyConcealedBuyer: true,
      olekActivelyConcealedRoute: true,
      savaLeftTransactionUncorrected: false,
      nikaDiscardedPrintout: false,
      petarCutBranch: false,
      hanaOmittedGuest: false,
    },
    lastEvent: 'interaction-07-started',
  });
  return state;
}

function npcLifeQaState() {
  const state = interaction07State();
  Object.assign(state, {
    mode: 'market-investigation',
    phase: 'market-follow-up',
    cartInspected: false,
    olekTopics: [],
    olekRouteConfirmed: false,
    marketLeadComplete: false,
    solventBottleObserved: false,
    bottleInference: null,
    lastEvent: 'npc-life-qa-started',
  });
  state.evidence.deliveryRoute = null;
  state.evidence.solventBottle = null;
  return state;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function addUnique(list, value) {
  if (!list.includes(value)) list.push(value);
}

function spendTopicTime(state, reason, minutes = CHAPTER3_TIME_COSTS.NEW_TOPIC) {
  state.clock = advanceChapter3Clock(state.clock, minutes, reason);
}

function advanceToAnchor(state, anchor, reason) {
  state.clock = advanceChapter3ClockTo(state.clock, anchor, reason);
}

export function createChapter3OpeningModel(options = {}) {
  const createStartState = () => {
    if (options.startAt === 'night-transition-qa') return nightTransitionQaState();
    if (options.startAt === 'dusk-campfire-qa') return duskCampfireQaState();
    if (options.startAt === 'interaction-23') return interaction23State();
    if (options.startAt === 'interaction-25') return interaction25State();
    if (options.startAt === 'hotel-corridor-qa') return hotelCorridorQaState();
    if (options.startAt === 'interaction-26') return interaction26State();
    if (options.startAt === 'interaction-27') return interaction27State();
    if (options.startAt === 'lev-hotel-exit-qa') return levHotelExitQaState();
    if (options.startAt === 'night-hotel-qa') return nightHotelQaState();
    if (options.startAt === 'night-lobby-qa') return nightLobbyQaState();
    if (options.startAt === 'night-exterior-qa') return nightExteriorQaState();
    if (options.startAt === 'interaction-29') return interaction29State();
    if (options.startAt === 'interaction-31') return interaction31State();
    if (options.startAt === 'morning-exterior-qa') return morningExteriorQaState();
    if (options.startAt === 'sunrise-overlook-qa') return sunriseOverlookQaState();
    if (options.startAt === 'interaction-32') return interaction32State();
    if (options.startAt === 'interaction-33') return interaction33State();
    if (options.startAt === 'interaction-22') return interaction22State();
    if (options.startAt === 'interaction-21') return interaction21State();
    if (options.startAt === 'interaction-15') return interaction15State();
    if (options.startAt === 'interaction-14') return interaction14State();
    if (options.startAt === 'interaction-13') return interaction13State();
    if (options.startAt === 'interaction-08') return interaction08State();
    if (options.startAt === 'interaction-07') return interaction07State();
    if (options.startAt === 'npc-life-qa') return npcLifeQaState();
    return initialState();
  };
  let state = createStartState();

  return Object.freeze({
    snapshot() {
      return clone(state);
    },

    chooseArrival(choice) {
      if (state.arrivalChoice || !ARRIVAL_CHOICES.includes(choice)) return false;
      state.arrivalChoice = choice;
      state.arrivalApproach = choice.replace('arrival-', '');
      state.maraPhotoShown = true;
      state.phase = 'train-departing';
      state.lastEvent = `arrival-${choice}`;
      spendTopicTime(state, `arrival-${choice}`);
      return true;
    },

    observeArrival(trace) {
      if (state.arrivalChoice || !ARRIVAL_OBSERVATIONS.includes(trace) || state.arrivalObservations.includes(trace)) return false;
      state.arrivalObservations.push(trace);
      state.lastEvent = `arrival-observed-${trace}`;
      return true;
    },

    completeTrainDeparture() {
      if (!state.arrivalChoice || state.trainDeparted) return false;
      state.trainDeparted = true;
      state.mode = 'arrival-boulevard';
      state.phase = 'meet-lev';
      state.lastEvent = 'train-departed';
      advanceToAnchor(state, CHAPTER3_TIME_ANCHORS.TRAIN_DEPARTED, 'train-departed');
      return true;
    },

    completeLevIntroduction() {
      if (!state.trainDeparted || state.levIntroduced) return false;
      state.levIntroduced = true;
      state.maraSightingReported = true;
      state.evidence.maraSighting = 'reported';
      state.phase = 'follow-lev';
      state.lastEvent = 'lev-introduced';
      return true;
    },

    beginGuide() {
      if (!state.levIntroduced || state.guideStarted || state.explorationBriefingComplete) return false;
      state.guideStarted = true;
      state.phase = 'enter-square';
      state.lastEvent = 'following-lev';
      return true;
    },

    completeExplorationBriefing() {
      if (!state.guideStarted || state.explorationBriefingComplete) return false;
      state.explorationBriefingComplete = true;
      state.mode = 'first-investigation';
      state.phase = 'inspect-dark-seam';
      state.lastEvent = 'exploration-briefing-complete';
      spendTopicTime(state, 'lev-scene-briefing');
      return true;
    },

    observeSeam(observation) {
      if (!state.explorationBriefingComplete || state.seamInspected || !SEAM_OBSERVATIONS.includes(observation)) {
        return false;
      }
      if (state.seamObservations.includes(observation)) return false;
      addUnique(state.seamObservations, observation);
      spendTopicTime(state, `seam-observation-${observation}`);
      state.lastEvent = `seam-observed-${observation}`;
      return true;
    },

    concludeSeam(inference) {
      if (state.seamInspected || !state.seamObservations.length || !SEAM_INFERENCES.includes(inference)) return false;
      state.seamInference = inference;
      state.seamInspected = true;
      state.firstLeadUnlocked = true;
      state.phase = 'question-eda';
      state.evidence.oilSeam = 'observed';
      state.lastEvent = `seam-concluded-${inference}`;
      spendTopicTime(state, `seam-conclusion-${inference}`);
      return true;
    },

    // Backward-compatible single-action seam API for older QA callers.
    inspectSeam(method) {
      const observation = { smell: 'fuel', ask: 'geometry', touch: 'cleaning' }[method];
      if (!observation || !this.observeSeam(observation)) return false;
      return this.concludeSeam(method === 'ask' ? 'reserve-judgment' : 'deliberate');
    },

    approachEda(approach) {
      if (!state.seamInspected || state.edaApproach || !EDA_APPROACHES.includes(approach)) return false;
      state.edaApproach = approach;
      state.edaCooperation = approach === 'patient' ? 'open' : approach === 'pressuring' ? 'guarded' : 'professional';
      state.lastEvent = `eda-approach-${approach}`;
      spendTopicTime(state, `eda-approach-${approach}`);
      return true;
    },

    noteEdaTopic(topic) {
      if (!state.edaApproach || state.edaComplete || !EDA_TOPICS.includes(topic)) return false;
      if (state.edaTopics.includes(topic)) return false;
      addUnique(state.edaTopics, topic);
      spendTopicTime(state, `eda-topic-${topic}`);
      state.lastEvent = `eda-topic-${topic}`;
      return true;
    },

    canObtainEdaRecord() {
      return state.edaTopics.includes('collector') && state.edaTopics.includes('authorization');
    },

    obtainEdaRecord() {
      if (!state.edaApproach || state.edaComplete) return false;
      state.edaRecordObtained = true;
      state.edaComplete = true;
      state.phase = 'question-olek';
      state.evidence.maraSighting = 'corroborated';
      state.evidence.lampOilSalesCopy = 'confirmed';
      state.suspicions.edaActivelyConcealedBuyer = true;
      state.lastEvent = 'eda-record-obtained';
      spendTopicTime(state, 'eda-record-conclusion');
      return true;
    },

    inspectCart() {
      if (!state.edaComplete || state.cartInspected) return false;
      state.cartInspected = true;
      spendTopicTime(state, 'handcart-inspection');
      state.lastEvent = 'porter-cart-inspected';
      return true;
    },

    noteOlekTopic(topic) {
      if (!state.edaComplete || state.marketLeadComplete || !OLEK_TOPICS.includes(topic)) return false;
      if (state.olekTopics.includes(topic)) return false;
      addUnique(state.olekTopics, topic);
      spendTopicTime(state, `olek-topic-${topic}`);
      state.lastEvent = `olek-topic-${topic}`;
      return true;
    },

    canCompleteOlek() {
      return state.olekTopics.includes('destination') && state.olekTopics.includes('route');
    },

    completeOlekRoute() {
      if (!state.edaComplete || state.marketLeadComplete) return false;
      state.olekRouteConfirmed = true;
      state.marketLeadComplete = true;
      state.phase = 'transport-lead';
      state.evidence.deliveryRoute = 'confirmed';
      state.suspicions.olekActivelyConcealedRoute = true;
      state.lastEvent = 'transport-route-confirmed';
      spendTopicTime(state, 'olek-route-conclusion');
      return true;
    },

    inspectBottle(inference) {
      if (!state.marketLeadComplete || state.solventBottleObserved || !BOTTLE_INFERENCES.includes(inference)) {
        return false;
      }
      state.solventBottleObserved = true;
      state.bottleInference = inference;
      state.evidence.solventBottle = 'observed';
      state.lastEvent = `solvent-bottle-${inference}`;
      spendTopicTime(state, `solvent-bottle-${inference}`);
      return true;
    },

    reachTransportEntrance() {
      if (!state.marketLeadComplete || state.transportEntranceReached) return false;
      state.transportEntranceReached = true;
      state.phase = 'toma-briefing';
      state.lastEvent = 'transport-entrance-reached';
      spendTopicTime(state, 'toma-transport-entry');
      return true;
    },

    enterTransportHall() {
      if (!state.transportEntranceReached || state.transportHallEntered) return false;
      state.transportHallEntered = true;
      state.mode = 'transport-ministry-hall';
      state.phase = 'take-service-number';
      state.lastEvent = 'transport-hall-entered';
      advanceToAnchor(state, CHAPTER3_TIME_ANCHORS.TRANSPORT_ENTERED, 'transport-hall-entered');
      return true;
    },

    takeTransportNumber(number = 'M-17') {
      if (!state.transportHallEntered || state.interaction07Complete) return false;
      state.transportNumber = number;
      state.interaction07Complete = true;
      state.batchComplete = true;
      state.phase = 'sava-counter';
      state.lastEvent = 'transport-number-taken';
      spendTopicTime(state, 'public-services-number');
      return true;
    },

    noteSavaTopic(topic) {
      if (!state.interaction07Complete || state.savaComplete || !SAVA_TOPICS.includes(topic)) return false;
      if (state.savaTopics.includes(topic)) return false;
      addUnique(state.savaTopics, topic);
      spendTopicTime(state, `sava-topic-${topic}`);
      state.lastEvent = `sava-topic-${topic}`;
      return true;
    },

    canCompleteSava() {
      return state.savaTopics.includes('anonymous-use')
        && state.savaTopics.includes('mara-transaction')
        && state.savaTopics.includes('no-correction');
    },

    completeSava() {
      if (!state.interaction07Complete || state.savaComplete) return false;
      state.savaComplete = true;
      state.phase = 'nika-terminal';
      state.evidence.retiredCodePractice = 'confirmed-standing-practice';
      state.suspicions.savaLeftTransactionUncorrected = true;
      state.lastEvent = 'sava-practice-confirmed';
      return true;
    },

    askBoskoInQueue() {
      if (!state.savaComplete || state.discardedPrintInspected || state.boskoQueueAsked) return false;
      state.boskoQueueAsked = true;
      spendTopicTime(state, 'bosko-queue-topic');
      state.lastEvent = 'bosko-queue-corroboration';
      return true;
    },

    noteNikaTopic(topic) {
      if (!state.savaComplete || state.nikaComplete || !NIKA_TOPICS.includes(topic)) return false;
      if (state.nikaTopics.includes(topic)) return false;
      addUnique(state.nikaTopics, topic);
      spendTopicTime(state, `nika-topic-${topic}`);
      state.lastEvent = `nika-topic-${topic}`;
      return true;
    },

    canCompleteNika() {
      return state.nikaTopics.includes('timeline')
        && state.nikaTopics.includes('reservation')
        && state.nikaTopics.includes('discarded-print');
    },

    completeNika() {
      if (!state.savaComplete || state.nikaComplete) return false;
      state.nikaComplete = true;
      state.phase = 'inspect-discarded-print';
      state.evidence.eastboundReservation = 'm-venn-unconfirmed-identity';
      state.suspicions.nikaDiscardedPrintout = true;
      state.lastEvent = 'nika-record-comparison-complete';
      return true;
    },

    inspectDiscardedPrint() {
      if (!state.nikaComplete || state.discardedPrintInspected) return false;
      state.discardedPrintInspected = true;
      spendTopicTime(state, 'discarded-print-inspection');
      state.phase = 'test-first-theory';
      state.evidence.discardedMaintenancePrint = 'confirmed';
      state.lastEvent = 'discarded-maintenance-print-inspected';
      return true;
    },

    leaveMinistryForTheory() {
      if (!state.discardedPrintInspected || state.firstTheoryTested || state.mode !== 'transport-ministry-hall') return false;
      state.mode = 'transport-ministry-exterior';
      state.phase = 'test-first-theory';
      state.lastEvent = 'left-ministry-for-theory';
      return true;
    },

    testFirstTheory(theory) {
      if (!state.discardedPrintInspected || state.firstTheoryTested || !FIRST_THEORIES.includes(theory)) return false;
      state.firstTheory = theory;
      spendTopicTime(state, `first-theory-${theory}`);
      state.firstTheoryTested = true;
      state.mode = 'transport-ministry-exterior';
      state.phase = 'question-bosko-square';
      state.lastEvent = `first-theory-rejected-${theory}`;
      return true;
    },

    completeSquareBosko() {
      if (!state.firstTheoryTested || state.squareBoskoInterviewed) return false;
      state.squareBoskoInterviewed = true;
      spendTopicTime(state, 'bosko-square-interview');
      state.mode = 'central-square';
      state.phase = 'inspect-plaza-grooves';
      state.evidence.independentSquareSighting = 'mara-worked-alone';
      state.lastEvent = 'bosko-square-sighting-confirmed';
      return true;
    },

    observeGroove(observation) {
      if (!state.squareBoskoInterviewed || state.interaction14Complete || !GROOVE_OBSERVATIONS.includes(observation)) {
        return false;
      }
      if (state.grooveObservations.includes(observation)) return false;
      addUnique(state.grooveObservations, observation);
      spendTopicTime(state, `groove-observation-${observation}`);
      state.lastEvent = `groove-observed-${observation}`;
      return true;
    },

    canConcludeGrooves() {
      return state.grooveObservations.includes('rows')
        && state.grooveObservations.includes('spacing')
        && state.grooveObservations.includes('feed-gap');
    },

    concludeGrooves() {
      if (state.interaction14Complete || !this.canConcludeGrooves()) return false;
      state.grooveConclusion = 'two-line-lettering-second-feed-incomplete';
      state.interaction14Complete = true;
      state.batchComplete = true;
      state.phase = 'archive-entrance';
      state.evidence.plazaGrooves = 'two-lines-second-feed-incomplete';
      state.lastEvent = 'interaction-14-complete';
      advanceToAnchor(state, CHAPTER3_TIME_ANCHORS.GROOVES_CONCLUDED, 'plaza-grooves-concluded');
      return true;
    },

    reachArchiveEntrance() {
      if (!state.interaction14Complete || state.archiveEntranceReached) return false;
      state.archiveEntranceReached = true;
      spendTopicTime(state, 'archive-entry-request');
      state.phase = 'archive-entry-dialogue';
      state.lastEvent = 'archive-entrance-reached';
      return true;
    },

    enterArchive() {
      if (!state.archiveEntranceReached || state.archiveEntered) return false;
      state.archiveEntered = true;
      state.mode = 'municipal-archive-hall';
      state.phase = 'inspect-archive-map';
      state.lastEvent = 'archive-entered';
      return true;
    },

    askAnaForMapHelp() {
      if (!state.archiveEntered || state.archiveMapInspected || state.anaMapHelpAsked) return false;
      state.anaMapHelpAsked = true;
      spendTopicTime(state, 'ana-map-help');
      state.lastEvent = 'ana-map-help';
      return true;
    },

    inspectArchiveMap() {
      if (!state.archiveEntered || state.archiveMapInspected) return false;
      state.archiveMapInspected = true;
      spendTopicTime(state, 'archive-map-conclusion');
      state.phase = 'inspect-maintenance-order';
      state.evidence.archiveFeedPlan = 'one-main-feed-one-short-branch';
      state.lastEvent = 'archive-map-inspected';
      return true;
    },

    inspectMaintenanceOrder() {
      if (!state.archiveMapInspected || state.maintenanceOrderInspected) return false;
      state.maintenanceOrderInspected = true;
      spendTopicTime(state, 'maintenance-order-inspection');
      state.phase = 'question-petar';
      state.evidence.maintenanceOrder = 'isolate-unregistered-branch-petar-signed';
      state.lastEvent = 'maintenance-order-inspected';
      return true;
    },

    notePetarTopic(topic) {
      if (!state.maintenanceOrderInspected || state.petarInterviewComplete || !PETAR_TOPICS.includes(topic)) return false;
      if (state.petarTopics.includes(topic)) return false;
      addUnique(state.petarTopics, topic);
      spendTopicTime(state, `petar-topic-${topic}`);
      state.lastEvent = `petar-topic-${topic}`;
      return true;
    },

    canCompletePetar() {
      return REQUIRED_PETAR_TOPICS.every((topic) => state.petarTopics.includes(topic));
    },

    completePetarInterview() {
      if (!state.maintenanceOrderInspected || state.petarInterviewComplete) return false;
      state.petarInterviewComplete = true;
      state.phase = 'assemble-material-timeline';
      state.evidence.petarCutBranch = 'confirmed-without-message-knowledge';
      state.suspicions.petarCutBranch = true;
      state.lastEvent = 'petar-interview-complete';
      return true;
    },

    inspectMaterialTimeline() {
      if (!state.petarInterviewComplete || state.materialTimelineInspected) return false;
      state.materialTimelineInspected = true;
      spendTopicTime(state, 'material-timeline-reconstruction', CHAPTER3_TIME_COSTS.LONG_RECONSTRUCTION);
      advanceToAnchor(state, CHAPTER3_TIME_ANCHORS.MATERIAL_TIMELINE, 'material-timeline-authored-anchor');
      state.mode = 'archive-exterior';
      state.phase = 'test-second-theories';
      state.evidence.materialTimeline = 'no-shared-meeting-or-knowledge';
      state.lastEvent = 'material-timeline-inspected';
      return true;
    },

    testSecondTheory(theory) {
      if (!state.materialTimelineInspected || state.secondTheoryComplete || !SECOND_THEORIES.includes(theory)) return false;
      if (state.secondTheoriesTested.includes(theory)) return false;
      addUnique(state.secondTheoriesTested, theory);
      spendTopicTime(state, `second-theory-${theory}`);
      state.lastEvent = `second-theory-rejected-${theory}`;
      return true;
    },

    canCompleteSecondTheory() {
      return REQUIRED_SECOND_THEORIES.every((theory) => state.secondTheoriesTested.includes(theory));
    },

    completeSecondTheory() {
      if (!state.materialTimelineInspected || state.secondTheoryComplete) return false;
      state.secondTheoryComplete = true;
      state.mode = 'central-square-dusk';
      state.phase = 'inspect-cut-interface';
      state.lastEvent = 'second-theory-test-complete';
      return true;
    },

    observeCutInterface(observation) {
      if (!state.secondTheoryComplete || state.interaction22Complete || !CUT_INTERFACE_OBSERVATIONS.includes(observation)) return false;
      if (state.cutInterfaceObservations.includes(observation)) return false;
      addUnique(state.cutInterfaceObservations, observation);
      spendTopicTime(state, `cut-interface-${observation}`);
      state.lastEvent = `cut-interface-${observation}`;
      return true;
    },

    canConcludeCutInterface() {
      return CUT_INTERFACE_OBSERVATIONS.every((observation) => state.cutInterfaceObservations.includes(observation));
    },

    concludeCutInterface() {
      if (state.interaction22Complete || !this.canConcludeCutInterface()) return false;
      state.cutInterfaceConclusion = 'reconnectable-ends-prepared-by-unknown-person';
      state.interaction22Complete = true;
      state.phase = 'hotel-entrance';
      state.evidence.cutInterface = 'reconnectable-origin-unknown';
      state.lastEvent = 'interaction-22-complete';
      advanceToAnchor(state, CHAPTER3_TIME_ANCHORS.CUT_INTERFACE_COMPLETE, 'cut-interface-complete');
      return true;
    },

    enterHotel() {
      if (!state.interaction22Complete || state.hotelEntered) return false;
      state.hotelEntered = true;
      state.mode = 'copper-heron-lobby';
      state.phase = 'question-hana';
      advanceToAnchor(state, CHAPTER3_TIME_ANCHORS.HOTEL_CHECK_IN, 'walk-to-copper-heron');
      state.lastEvent = 'copper-heron-entered';
      return true;
    },

    noteHanaTopic(topic) {
      if (!state.hotelEntered || state.hotelCheckInComplete || !HANA_TOPICS.includes(topic) || state.hanaTopics.includes(topic)) return false;
      addUnique(state.hanaTopics, topic);
      spendTopicTime(state, `hana-topic-${topic}`);
      state.lastEvent = `hana-topic-${topic}`;
      return true;
    },

    canCompleteHana() {
      return HANA_TOPICS.every((topic) => state.hanaTopics.includes(topic));
    },

    completeHotelCheckIn() {
      if (!state.hotelEntered || state.hotelCheckInComplete) return false;
      state.hotelCheckInComplete = true;
      state.phase = 'question-daro';
      state.evidence.hotelRegister = 'blank-line-standing-practice-mara-alone';
      state.suspicions.hanaOmittedGuest = true;
      state.lastEvent = 'interaction-23-complete';
      return true;
    },

    askHotelGuest(guest) {
      if (!state.hotelCheckInComplete || state.daroComplete || !['irena', 'vesna'].includes(guest) || state.hotelGuestsAsked.includes(guest)) return false;
      addUnique(state.hotelGuestsAsked, guest);
      spendTopicTime(state, `hotel-guest-${guest}`);
      state.lastEvent = `hotel-guest-${guest}`;
      return true;
    },

    noteDaroTopic(topic) {
      if (!state.hotelCheckInComplete || state.daroComplete || !DARO_TOPICS.includes(topic) || state.daroTopics.includes(topic)) return false;
      addUnique(state.daroTopics, topic);
      spendTopicTime(state, `daro-topic-${topic}`);
      state.lastEvent = `daro-topic-${topic}`;
      return true;
    },

    canCompleteDaro() {
      return DARO_TOPICS.every((topic) => state.daroTopics.includes(topic));
    },

    completeDaro() {
      if (!state.hotelCheckInComplete || state.daroComplete) return false;
      state.daroComplete = true;
      state.phase = 'go-to-hotel-corridor';
      state.evidence.daroSightline = 'mara-alone-hotel-square-station';
      state.lastEvent = 'interaction-25-complete';
      return true;
    },

    enterHotelCorridor() {
      if (!state.daroComplete || state.hotelCorridorEntered) return false;
      state.hotelCorridorEntered = true;
      state.mode = 'copper-heron-corridor';
      state.phase = 'find-butch-room';
      state.lastEvent = 'hotel-corridor-entered';
      return true;
    },

    enterHotelRoom() {
      if (!state.hotelCorridorEntered || state.hotelRoomEntered) return false;
      state.hotelRoomEntered = true;
      state.mode = 'copper-heron-private-room';
      state.phase = 'evidence-table';
      state.lastEvent = 'butch-private-room-entered';
      return true;
    },

    readHotelEvidencePaper(paperId) {
      if (!state.hotelRoomEntered || state.evidenceTableComplete || !HOTEL_EVIDENCE_PAPERS.includes(paperId) || state.hotelPapersRead.includes(paperId)) return false;
      addUnique(state.hotelPapersRead, paperId);
      state.lastEvent = `hotel-paper-read-${paperId}`;
      return true;
    },

    canReviewEvidenceTable() {
      return state.hotelRoomEntered && !state.evidenceTableComplete;
    },

    testFinalTheory(theory) {
      if (!state.hotelRoomEntered || state.evidenceTableComplete || !FINAL_THEORIES.includes(theory) || state.finalTheoriesTested.includes(theory)) return false;
      addUnique(state.finalTheoriesTested, theory);
      spendTopicTime(state, `final-theory-${theory}`);
      state.lastEvent = `final-theory-rejected-${theory}`;
      return true;
    },

    canCompleteEvidenceTable() {
      return FINAL_THEORIES.every((theory) => state.finalTheoriesTested.includes(theory))
        && HOTEL_EVIDENCE_PAPERS.every((paperId) => state.hotelPapersRead.includes(paperId));
    },

    completeEvidenceTable() {
      if (!state.hotelRoomEntered || state.evidenceTableComplete) return false;
      state.evidenceTableComplete = true;
      state.phase = 'sleep';
      state.evidence.evidenceTable = 'mara-alone-knew-complete-sequence';
      state.lastEvent = 'interaction-26-complete';
      return true;
    },

    sleepUntilNight() {
      if (!state.evidenceTableComplete || state.slept) return false;
      state.slept = true;
      state.mode = 'copper-heron-night';
      state.phase = 'leave-hotel-at-night';
      advanceToAnchor(state, CHAPTER3_TIME_ANCHORS.NIGHT_WAKE, 'sleep-until-night-fire');
      state.lastEvent = 'interaction-27-complete';
      return true;
    },

    beginNightRoute() {
      if (!state.slept || !state.nightLobbyReached || state.nightRouteStarted) return false;
      state.nightRouteStarted = true;
      state.mode = 'central-square-night';
      state.phase = 'read-first-fire-line';
      state.lastEvent = 'interaction-28-complete';
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

    observeNightFire() {
      if (!state.nightRouteStarted || state.nightFireObserved) return false;
      state.nightFireObserved = true;
      state.phase = 'reconnect-night-feed';
      state.lastEvent = 'night-first-line-read';
      return true;
    },

    reconnectNightFeed() {
      if (!state.nightFireObserved || state.wireReconnected) return false;
      state.wireReconnected = true;
      state.phase = 'read-second-fire-line';
      state.lastEvent = 'night-feed-reconnected';
      return true;
    },

    completeNightMessage() {
      if (!state.wireReconnected || state.nightMessageComplete) return false;
      state.nightMessageComplete = true;
      state.evidence.nightMessage = 'alive-left-by-choice-unconfirmed-until-morning';
      state.lastEvent = 'interaction-29-complete';
      return true;
    },

    beginMorning() {
      if (!state.nightMessageComplete || state.morningStarted) return false;
      state.morningStarted = true;
      state.mode = 'copper-heron-morning';
      state.phase = 'leave-private-room-in-morning';
      advanceToAnchor(state, CHAPTER3_TIME_ANCHORS.DAWN_RETURN, 'direct-fade-to-morning');
      state.lastEvent = 'morning-started';
      return true;
    },

    leaveMorningRoom() {
      if (!state.morningStarted || state.morningRoomLeft) return false;
      state.morningRoomLeft = true;
      state.mode = 'copper-heron-morning-corridor';
      state.phase = 'go-downstairs';
      state.lastEvent = 'morning-room-left';
      return true;
    },

    reachMorningLobby() {
      if (!state.morningStarted || !state.morningRoomLeft || state.morningLobbyReached) return false;
      state.morningLobbyReached = true;
      state.mode = 'copper-heron-morning-lobby';
      state.phase = 'collect-original-reservation';
      state.lastEvent = 'morning-lobby-reached';
      return true;
    },

    askHanaAtBreakfast() {
      if (!state.morningLobbyReached || state.morningEvidenceConfirmed || state.hanaBreakfastAsked) return false;
      state.hanaBreakfastAsked = true;
      spendTopicTime(state, 'hana-breakfast');
      state.lastEvent = 'hana-breakfast-asked';
      return true;
    },

    collectMorningReservation() {
      if (!state.morningLobbyReached || state.morningReservationCollected) return false;
      state.morningReservationCollected = true;
      state.mode = 'morning-overlook-route';
      state.phase = 'reach-tunnel-overlook';
      spendTopicTime(state, 'morning-original-reservation');
      state.lastEvent = 'morning-reservation-collected';
      return true;
    },

    startSunriseClimb() {
      if (!state.morningReservationCollected || state.sunriseClimbStarted) return false;
      state.sunriseClimbStarted = true;
      state.mode = 'sunrise-overlook-climb';
      state.phase = 'climb-old-service-path';
      state.lastEvent = 'sunrise-climb-started';
      return true;
    },

    completeSunriseView() {
      if (!state.sunriseClimbStarted || state.sunriseViewed) return false;
      state.sunriseViewed = true;
      state.mode = 'sunrise-overlook';
      state.phase = 'return-to-street';
      advanceToAnchor(state, CHAPTER3_TIME_ANCHORS.SUNRISE_OVERLOOK, 'sunrise-overlook-rest');
      state.lastEvent = 'sunrise-viewed';
      return true;
    },

    returnFromSunrise() {
      if (!state.sunriseViewed || state.sunriseReturned) return false;
      state.sunriseReturned = true;
      state.mode = state.morningEvidenceConfirmed ? 'station-approach' : 'morning-station-route';
      state.phase = state.morningEvidenceConfirmed ? 'reconstruct-with-lev' : 'walk-to-eastbound-platform';
      state.lastEvent = 'sunrise-overlook-returned';
      return true;
    },

    noticeMorningFire() {
      if (!state.morningReservationCollected || state.morningFireEncountered) return false;
      state.morningFireEncountered = true;
      state.phase = state.sunriseReturned ? 'clear-square-route' : 'two-open-morning-leads';
      state.lastEvent = 'morning-fire-encountered';
      return true;
    },

    observeMorningEvidence(observation) {
      if (!state.morningFireEncountered || state.morningEvidenceConfirmed || !MORNING_OBSERVATIONS.includes(observation) || state.morningObservations.includes(observation)) return false;
      addUnique(state.morningObservations, observation);
      spendTopicTime(state, `morning-evidence-${observation}`);
      state.lastEvent = `morning-evidence-${observation}`;
      return true;
    },

    canConfirmMorningEvidence() {
      return MORNING_OBSERVATIONS.every((observation) => state.morningObservations.includes(observation));
    },

    confirmMorningEvidence() {
      if (!state.morningFireEncountered || state.morningEvidenceConfirmed || !this.canConfirmMorningEvidence()) return false;
      state.morningEvidenceConfirmed = true;
      state.mode = state.sunriseReturned ? 'station-approach' : 'morning-overlook-route';
      state.phase = state.sunriseReturned ? 'reconstruct-with-lev' : 'reach-tunnel-overlook';
      state.evidence.morningFire = 'mara-alive-left-by-choice-confirmed';
      state.lastEvent = 'interaction-31-complete';
      return true;
    },

    noteFinalTimelineTopic(topic) {
      if (!state.morningEvidenceConfirmed || state.levFinalComplete || !FINAL_TIMELINE_TOPICS.includes(topic) || state.finalTimelineTopics.includes(topic)) return false;
      addUnique(state.finalTimelineTopics, topic);
      spendTopicTime(state, `final-timeline-${topic}`);
      state.lastEvent = `final-timeline-${topic}`;
      return true;
    },

    canCompleteLevFinal() {
      return FINAL_TIMELINE_TOPICS.every((topic) => state.finalTimelineTopics.includes(topic));
    },

    completeLevFinal() {
      if (!state.morningEvidenceConfirmed || state.levFinalComplete) return false;
      state.levFinalComplete = true;
      state.phase = 'choose-why-continue';
      state.evidence.eastboundOriginal = 'mara-route-consistent-eastbound';
      advanceToAnchor(state, CHAPTER3_TIME_ANCHORS.EASTBOUND_BOARDING, 'eastbound-train-arrival');
      state.lastEvent = 'interaction-32-complete';
      return true;
    },

    chooseContinuationAttitude(attitude) {
      if (!state.levFinalComplete || state.continuationAttitude || !CONTINUATION_ATTITUDES.includes(attitude)) return false;
      state.continuationAttitude = attitude;
      state.phase = 'board-eastbound-train';
      spendTopicTime(state, `continuation-${attitude}`);
      state.lastEvent = `continuation-${attitude}`;
      return true;
    },

    boardTrain() {
      if (!state.continuationAttitude || state.boardedTrain) return false;
      state.boardedTrain = true;
      state.mode = 'departure-sequence';
      state.phase = 'door-relay';
      state.lastEvent = 'butch-boarded-alone';
      return true;
    },

    advanceDeparture(milliseconds) {
      if (!state.boardedTrain || state.chapterComplete) return false;
      state.departureSequenceMs = Math.min(23600, state.departureSequenceMs + Math.max(0, Number(milliseconds) || 0));
      const ms = state.departureSequenceMs;
      state.phase = ms < 5000 ? 'door-relay' : ms < 9000 ? 'door-closing' : ms < 11200 ? 'door-latch' : ms < 21600 ? 'train-moving' : ms < 23600 ? 'black-audio-tail' : 'complete';
      state.blackout = ms >= 21600;
      state.audioSilent = ms >= 23600;
      state.chapterComplete = state.audioSilent;
      state.lastEvent = `departure-${state.phase}`;
      return true;
    },

    advanceDialogueTime(reason = 'runtime-dialogue-topic', minutes = CHAPTER3_TIME_COSTS.NEW_TOPIC) {
      spendTopicTime(state, reason, minutes);
      return clone(state.clock);
    },

    advanceToTimeAnchor(anchorName, reason = 'runtime-authored-event') {
      const anchor = CHAPTER3_TIME_ANCHORS[anchorName];
      if (!anchor) return false;
      advanceToAnchor(state, anchor, reason);
      return clone(state.clock);
    },

    reset() {
      state = createStartState();
      return clone(state);
    },
  });
}
