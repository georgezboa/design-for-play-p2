export const MARA_APPROACHES = Object.freeze(['evidence', 'plan', 'uncertainty']);

const TIMELINE = Object.freeze([
  { at: 0, phase: 'scan-first-ticket' },
  { at: 700, phase: 'scan-second-ticket' },
  { at: 1500, phase: 'dual-validation' },
  { at: 2500, phase: 'board-square-mara' },
  { at: 3400, phase: 'board-butch' },
  { at: 4400, phase: 'door-relay' },
  { at: 5000, phase: 'door-slow-travel' },
  { at: 7000, phase: 'door-hydraulic-pull' },
  { at: 9000, phase: 'door-latch' },
  { at: 10000, phase: 'traction-load' },
  { at: 11200, phase: 'train-departing' },
  { at: 17800, phase: 'train-entering-tunnel' },
  { at: 21600, phase: 'black-audio-tail' },
  { at: 23600, phase: 'complete' },
]);

function initialState() {
  return {
    mode: 'morning-plaza',
    phase: 'explore',
    morningFireConfirmed: false,
    maraApproach: null,
    maraJoinsStation: false,
    stationReached: false,
    meetingComplete: false,
    scannerRows: [],
    scannerSummary: null,
    dualMaraValidated: false,
    squareMaraBoarded: false,
    butchBoarded: false,
    interactionLocked: false,
    sequenceMs: 0,
    blackout: false,
    audioSilent: false,
    lastEvent: 'slice-started',
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function timelinePhase(ms) {
  let result = TIMELINE[0].phase;
  for (const entry of TIMELINE) {
    if (ms < entry.at) break;
    result = entry.phase;
  }
  return result;
}

function applyTimeline(state) {
  const phase = timelinePhase(state.sequenceMs);
  state.phase = phase;
  state.scannerRows = state.sequenceMs >= 1500
    ? ['TICKET 43 / VALID', 'TICKET 43 / VALID']
    : state.sequenceMs >= 700
      ? ['TICKET 43 / VALID']
      : [];
  state.scannerSummary = state.sequenceMs >= 2500 ? '2 PASSENGERS / 2 VALID' : null;
  state.dualMaraValidated = state.sequenceMs >= 2500;
  state.squareMaraBoarded = state.sequenceMs >= 3400;
  state.butchBoarded = state.sequenceMs >= 4400;
  state.blackout = state.sequenceMs >= 21600;
  state.audioSilent = state.sequenceMs >= 23600;
  state.lastEvent = phase;
}

export function createChapter3EndingModel() {
  let state = initialState();

  return Object.freeze({
    snapshot() {
      return clone(state);
    },

    inspectMorningFire() {
      if (state.interactionLocked || state.morningFireConfirmed) return false;
      state.morningFireConfirmed = true;
      state.lastEvent = 'morning-fire-confirmed';
      return true;
    },

    talkToMaraBeforeEvidence() {
      if (state.interactionLocked || state.morningFireConfirmed) return false;
      state.lastEvent = 'mara-evidence-reminder';
      return true;
    },

    chooseMaraApproach(approach) {
      if (state.interactionLocked || !state.morningFireConfirmed || state.maraJoinsStation) return false;
      if (!MARA_APPROACHES.includes(approach)) return false;
      state.maraApproach = approach;
      state.maraJoinsStation = true;
      state.phase = 'walk-to-station';
      state.lastEvent = `mara-joins-${approach}`;
      return true;
    },

    reachStation() {
      if (state.interactionLocked || !state.maraJoinsStation || state.stationReached) return false;
      state.stationReached = true;
      state.phase = 'station-meeting';
      state.lastEvent = 'station-meeting-started';
      return true;
    },

    completeStationMeeting() {
      if (!state.stationReached || state.meetingComplete || state.interactionLocked) return false;
      state.meetingComplete = true;
      state.interactionLocked = true;
      state.mode = 'ending-sequence';
      state.phase = 'scan-first-ticket';
      state.sequenceMs = 0;
      state.lastEvent = 'scan-first-ticket';
      return true;
    },

    advance(ms) {
      if (!state.meetingComplete || state.audioSilent) return false;
      const amount = Number.isFinite(ms) ? Math.max(0, ms) : 0;
      state.sequenceMs = Math.min(23600, state.sequenceMs + amount);
      applyTimeline(state);
      return true;
    },

    reset() {
      state = initialState();
      return clone(state);
    },
  });
}

export const CHAPTER3_ENDING_TIMELINE = TIMELINE;
