// Chapter 5 P0 narrative state model — plain snapshot state, event-driven
// presentation, explicit availableActions() contract, deterministic reset.
// Engine-neutral: no Three.js imports here (work package §3.3).

import { createEventBus } from './chapter05Events.js';
import { createCollapseState, reduceCollapse } from './collapseGauntlet.js';

export const PHASES = Object.freeze([
  'lobby',
  'corridor',
  'echo-city',
  'return',
  'collapse',
  'complete',
]);

// Legal phase transitions. TransitionDirector is the only runtime consumer
// allowed to move the player between spaces, and it validates against this.
export const PHASE_TRANSITIONS = Object.freeze({
  lobby: ['corridor'],
  corridor: ['echo-city', 'lobby', 'return', 'collapse'],
  'echo-city': ['corridor', 'return'],
  return: [],
  collapse: ['complete'],
  complete: [],
});

export const REQUIRED_ECHO_FLAGS = Object.freeze([
  'stationLampOn',
  'marketShuttersLocked',
  'fountainCirculationRestored',
  'archiveLedgerReturned',
  'nightBadgeClaimed',
]);

export function createInitialState() {
  return {
    phase: 'lobby',
    ticket: { inspected: false, carried: false, returned: false },
    echoRecord: {
      nightKitTaken: false,
      marketPawlReleased: false,
      marketShuttersLocked: false,
      fountainGrateCleared: false,
      fountainCirculationRestored: false,
      archiveSlotUnlocked: false,
      archiveLedgerReturned: false,
      nightBadgeClaimed: false,
      stationPanelOpened: false,
      stationLampOn: false,
      serviceWindowClosed: false,
      tramNoticeReset: false,
      standpipeClosed: false,
      returnWalkStarted: false,
      recordFiled: false,
    },
    levRevisit: {
      beat: 'take-radio',
      radioTaken: false,
      cafeCupTurned: false,
      fountainCoinTaken: false,
      lettersBrushed: false,
      platformWaited: false,
      cafeReached: false,
      fountainReached: false,
      lettersReached: false,
      platformReached: false,
      levMet: false,
      cassetteClaimed: false,
      conversationComplete: false,
    },
    corridor: { pass: 1, guideStandSide: 'south' },
    lobby: { deskReclassified: false },
    collapse: createCollapseState(),
  };
}

// The integrated Museum follows Chapter 1, so Butch already owns the punched
// admission ticket when this page boots. Keep createInitialState() untouched
// for reducer/unit-test isolation and use this entry state at the real route.
export function createMuseumEntryState() {
  const state = createInitialState();
  state.ticket.inspected = true;
  state.ticket.carried = true;
  return state;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function canTransition(from, to) {
  return (PHASE_TRANSITIONS[from] ?? []).includes(to);
}

// Pure reducer: (state, action) -> { state, events: [{type, payload}] }.
// Unknown or illegal actions are no-ops that emit a 'rejected' event, so
// presentation can give honest feedback instead of silently failing.
export function reduce(prev, action) {
  const state = clone(prev);
  const events = [];
  const emit = (type, payload) => events.push({ type, payload });
  const rejected = (reason) => {
    emit('rejected', { action: action.type, reason });
    return { state: prev, events };
  };
  const completeNightRoundIfReady = () => {
    if (!state.echoRecord.recordFiled && REQUIRED_ECHO_FLAGS.every((flag) => state.echoRecord[flag])) {
      state.echoRecord.returnWalkStarted = true;
      state.echoRecord.recordFiled = true;
      emit('echo.nightRoundComplete');
    }
  };

  switch (action.type) {
    case 'inspectTicket': {
      if (state.phase !== 'lobby' || state.ticket.inspected) return rejected('ticket not inspectable now');
      state.ticket.inspected = true;
      emit('ticket.inspected');
      break;
    }
    case 'carryTicket': {
      if (state.phase !== 'lobby' || !state.ticket.inspected || state.ticket.carried) {
        return rejected('inspect the ticket before carrying it');
      }
      state.ticket.carried = true;
      emit('ticket.carried');
      break;
    }
    case 'returnTicket': {
      if (state.phase !== 'echo-city' || !state.echoRecord.recordFiled || !state.ticket.carried) {
        return rejected('the record is not ready to be returned');
      }
      state.ticket.carried = false;
      state.ticket.returned = true;
      emit('ticket.returned');
      break;
    }
    case 'enterCorridor': {
      if (state.phase !== 'lobby') return rejected('not in lobby');
      if (!state.ticket.carried) return rejected('the archive corridor requires the carried ticket');
      if (!canTransition(state.phase, 'corridor')) return rejected('illegal transition');
      state.phase = 'corridor';
      emit('phase.changed', { phase: 'corridor' });
      break;
    }
    case 'corridorLoop': {
      // First pass returns the player to the corridor entrance with the guide
      // stand moved to the opposite wall. Measurable, honest, repeatable once.
      if (state.phase !== 'corridor' || state.corridor.pass !== 1) {
        return rejected('corridor does not repeat again');
      }
      state.corridor.pass = 2;
      state.corridor.guideStandSide = 'north';
      emit('corridor.looped', { pass: 2 });
      break;
    }
    case 'enterEchoCity': {
      if (state.phase !== 'corridor') return rejected('not in corridor');
      if (!state.ticket.carried) return rejected('the exhibit reads the carried ticket');
      if (!canTransition(state.phase, 'echo-city')) return rejected('illegal transition');
      state.phase = 'echo-city';
      emit('phase.changed', { phase: 'echo-city' });
      break;
    }
    case 'leaveCorridor': {
      if (state.phase !== 'corridor') return rejected('not in corridor');
      if (!canTransition(state.phase, 'lobby')) return rejected('illegal transition');
      state.phase = 'lobby';
      emit('phase.changed', { phase: 'lobby' });
      break;
    }
    case 'takeNightKit': {
      if (state.phase !== 'echo-city' || state.echoRecord.nightKitTaken) {
        return rejected('the night kit is unavailable');
      }
      state.echoRecord.nightKitTaken = true;
      emit('echo.nightKitTaken');
      break;
    }
    case 'takeLevRadio': {
      if (state.phase !== 'echo-city' || state.levRevisit.beat !== 'take-radio' || state.levRevisit.radioTaken) {
        return rejected('the receiver is unavailable');
      }
      state.levRevisit.radioTaken = true;
      state.levRevisit.beat = 'walk-cafe';
      emit('echo.levRadioTaken');
      break;
    }
    case 'performLevMemoryAction': {
      const stops = [
        ['cafe', 'walk-cafe', 'cafeCupTurned', 'cafeReached', 'walk-fountain'],
        ['fountain', 'walk-fountain', 'fountainCoinTaken', 'fountainReached', 'walk-letters'],
        ['letters', 'walk-letters', 'lettersBrushed', 'lettersReached', 'walk-platform'],
        ['platform', 'walk-platform', 'platformWaited', 'platformReached', 'meet-lev'],
      ];
      const stop = stops.find(([id]) => id === action.stop);
      if (state.phase !== 'echo-city' || !stop || state.levRevisit.beat !== stop[1]) {
        return rejected('that physical memory action is not next');
      }
      state.levRevisit[stop[2]] = true;
      state.levRevisit[stop[3]] = true;
      state.levRevisit.beat = stop[4];
      emit('echo.levMemoryActionPerformed', { stop: action.stop });
      break;
    }
    case 'meetLevAtOverlook': {
      if (state.phase !== 'echo-city' || state.levRevisit.beat !== 'meet-lev') {
        return rejected('Lev is waiting at the west overlook');
      }
      state.levRevisit.levMet = true;
      state.levRevisit.beat = 'take-cassette';
      emit('echo.levMet');
      break;
    }
    case 'claimMaraCassette': {
      if (state.phase !== 'echo-city' || state.levRevisit.beat !== 'take-cassette' || state.levRevisit.cassetteClaimed) {
        return rejected('Mara’s cassette is unavailable');
      }
      state.levRevisit.cassetteClaimed = true;
      state.levRevisit.conversationComplete = true;
      state.levRevisit.beat = 'return';
      state.echoRecord.nightBadgeClaimed = true;
      state.echoRecord.archiveLedgerReturned = true;
      state.echoRecord.recordFiled = true;
      state.echoRecord.returnWalkStarted = true;
      emit('echo.maraCassetteClaimed');
      emit('echo.nightRoundComplete');
      break;
    }
    case 'releaseMarketPawl': {
      if (state.phase !== 'echo-city' || !state.echoRecord.stationLampOn || state.echoRecord.marketPawlReleased) {
        return rejected('the market latch is unavailable');
      }
      state.echoRecord.marketPawlReleased = true;
      emit('echo.marketPawlReleased');
      break;
    }
    case 'lockMarketShutters': {
      if (state.phase !== 'echo-city' || !state.echoRecord.stationLampOn || !state.echoRecord.marketPawlReleased || state.echoRecord.marketShuttersLocked) {
        return rejected('the market shutter winch is unavailable');
      }
      state.echoRecord.marketShuttersLocked = true;
      emit('echo.marketShuttersLocked');
      completeNightRoundIfReady();
      break;
    }
    case 'clearFountainGrate': {
      if (state.phase !== 'echo-city' || !state.echoRecord.marketShuttersLocked || state.echoRecord.fountainGrateCleared) {
        return rejected('the fountain grate is unavailable');
      }
      state.echoRecord.fountainGrateCleared = true;
      emit('echo.fountainGrateCleared');
      break;
    }
    case 'restoreFountainCirculation': {
      if (state.phase !== 'echo-city' || !state.echoRecord.marketShuttersLocked || !state.echoRecord.fountainGrateCleared || state.echoRecord.fountainCirculationRestored) {
        return rejected('the fountain pump is unavailable');
      }
      state.echoRecord.fountainCirculationRestored = true;
      emit('echo.fountainCirculationRestored');
      completeNightRoundIfReady();
      break;
    }
    case 'unlockArchiveSlot': {
      if (state.phase !== 'echo-city' || !state.echoRecord.fountainCirculationRestored || state.echoRecord.archiveSlotUnlocked) {
        return rejected('the archive slot is unavailable');
      }
      state.echoRecord.archiveSlotUnlocked = true;
      emit('echo.archiveSlotUnlocked');
      break;
    }
    case 'returnArchiveLedger': {
      if (state.phase !== 'echo-city' || !state.echoRecord.fountainCirculationRestored || !state.echoRecord.archiveSlotUnlocked || state.echoRecord.archiveLedgerReturned) {
        return rejected('the archive ledger is unavailable');
      }
      state.echoRecord.archiveLedgerReturned = true;
      emit('echo.archiveLedgerReturned');
      completeNightRoundIfReady();
      break;
    }
    case 'claimNightBadge': {
      if (state.phase !== 'echo-city' || !state.echoRecord.archiveLedgerReturned || state.echoRecord.nightBadgeClaimed) {
        return rejected('the night-service badge is unavailable');
      }
      state.echoRecord.nightBadgeClaimed = true;
      emit('echo.nightBadgeClaimed');
      completeNightRoundIfReady();
      break;
    }
    case 'openStationPanel': {
      if (state.phase !== 'echo-city' || !state.echoRecord.nightKitTaken || state.echoRecord.stationPanelOpened) {
        return rejected('the station panel is unavailable');
      }
      state.echoRecord.stationPanelOpened = true;
      emit('echo.stationPanelOpened');
      break;
    }
    case 'switchStationLamp': {
      if (state.phase !== 'echo-city' || !state.echoRecord.nightKitTaken || !state.echoRecord.stationPanelOpened || state.echoRecord.stationLampOn) {
        return rejected('the station lamp is unavailable');
      }
      state.echoRecord.stationLampOn = true;
      emit('echo.stationLampOn');
      completeNightRoundIfReady();
      break;
    }
    case 'closeServiceWindow': {
      if (state.phase !== 'echo-city' || !state.echoRecord.stationLampOn || state.echoRecord.serviceWindowClosed) {
        return rejected('the service window is unavailable');
      }
      state.echoRecord.serviceWindowClosed = true;
      emit('echo.serviceWindowClosed');
      break;
    }
    case 'resetTramNotice': {
      if (state.phase !== 'echo-city' || !state.echoRecord.stationLampOn || state.echoRecord.tramNoticeReset) {
        return rejected('the tram notice is unavailable');
      }
      state.echoRecord.tramNoticeReset = true;
      emit('echo.tramNoticeReset');
      break;
    }
    case 'closeStandpipe': {
      if (state.phase !== 'echo-city' || !state.echoRecord.stationLampOn || state.echoRecord.standpipeClosed) {
        return rejected('the standpipe is unavailable');
      }
      state.echoRecord.standpipeClosed = true;
      emit('echo.standpipeClosed');
      break;
    }
    case 'returnToMuseum': {
      if (state.phase !== 'echo-city' || !state.ticket.returned) {
        return rejected('return the ticket before leaving the exhibit');
      }
      if (!canTransition(state.phase, 'return')) return rejected('illegal transition');
      state.phase = 'return';
      // The desk is reclassified exactly once, on the first return.
      if (!state.lobby.deskReclassified) {
        state.lobby.deskReclassified = true;
        emit('lobby.deskReclassified');
      }
      emit('phase.changed', { phase: 'return' });
      break;
    }
    case 'returnToArchive': {
      if (state.phase !== 'echo-city' || !state.ticket.returned) {
        return rejected('finish and return the Echo City record first');
      }
      if (!canTransition(state.phase, 'corridor')) return rejected('illegal transition');
      state.phase = 'corridor';
      emit('phase.changed', { phase: 'corridor' });
      break;
    }
    case 'unlockFinale': {
      if (state.phase !== 'corridor') return rejected('all directions return through the archive corridor');
      if (!canTransition(state.phase, 'return')) return rejected('illegal transition');
      state.phase = 'return';
      if (!state.lobby.deskReclassified) {
        state.lobby.deskReclassified = true;
        emit('lobby.deskReclassified');
      }
      emit('phase.changed', { phase: 'return' });
      break;
    }
    case 'labyrinthComplete': {
      if (state.phase !== 'corridor') return rejected('the Labyrinth must return to the archive corridor');
      if (!canTransition(state.phase, 'collapse')) return rejected('illegal transition');
      const collapse = reduceCollapse(state.collapse, { type: 'collapse.start' });
      state.collapse = collapse.state;
      state.phase = 'collapse';
      state.lobby.deskReclassified = true;
      for (const event of collapse.events) events.push(event);
      emit('lobby.deskReclassified');
      emit('phase.changed', { phase: 'collapse' });
      break;
    }
    case 'collapseReachZone':
    case 'collapseHit':
    case 'collapseSlotKey':
    case 'collapseJump': {
      if (state.phase !== 'collapse') return rejected('the collapse gauntlet is not active');
      const collapseAction = {
        collapseReachZone: { type: 'collapse.reachZone', zone: action.zone },
        collapseHit: { type: 'collapse.hit' },
        collapseSlotKey: { type: 'collapse.slotKey' },
        collapseJump: { type: 'collapse.jump' },
      }[action.type];
      const collapse = reduceCollapse(state.collapse, collapseAction);
      if (collapse.state === state.collapse) return rejected(collapse.events[0]?.payload?.reason ?? 'collapse action rejected');
      state.collapse = collapse.state;
      for (const event of collapse.events) events.push(event);
      if (state.collapse.completed) {
        state.phase = 'complete';
        emit('phase.changed', { phase: 'complete' });
      }
      break;
    }
    default:
      return rejected(`unknown action: ${String(action.type)}`);
  }

  return { state, events };
}

export class Chapter05Model {
  constructor(initialState = createInitialState()) {
    this._state = clone(initialState);
    this._bus = createEventBus();
  }

  getSnapshot() {
    return clone(this._state);
  }

  on(type, fn) {
    return this._bus.on(type, fn);
  }

  dispatch(action) {
    const { state, events } = reduce(this._state, action);
    const changed = state !== this._state;
    this._state = state;
    if (changed) this._bus.emit('state.changed', this.getSnapshot());
    for (const event of events) this._bus.emit(event.type, event.payload);
    return { changed, events };
  }

  // Explicit availability contract for presentation layers.
  availableActions() {
    const s = this._state;
    const actions = [];
    if (s.phase === 'lobby' && !s.ticket.inspected) actions.push('inspectTicket');
    if (s.phase === 'lobby' && s.ticket.inspected && !s.ticket.carried) actions.push('carryTicket');
    if (s.phase === 'lobby' && s.ticket.carried) actions.push('enterCorridor');
    if (s.phase === 'corridor') {
      if (s.corridor.pass === 1) actions.push('corridorLoop');
      actions.push('leaveCorridor');
    }
    if (s.phase === 'echo-city') {
      if (!s.echoRecord.nightKitTaken) actions.push('takeNightKit');
      else if (!s.echoRecord.stationLampOn) actions.push(s.echoRecord.stationPanelOpened ? 'switchStationLamp' : 'openStationPanel');
      else if (!s.echoRecord.marketShuttersLocked) actions.push(s.echoRecord.marketPawlReleased ? 'lockMarketShutters' : 'releaseMarketPawl');
      else if (!s.echoRecord.fountainCirculationRestored) actions.push(s.echoRecord.fountainGrateCleared ? 'restoreFountainCirculation' : 'clearFountainGrate');
      else if (!s.echoRecord.archiveLedgerReturned) actions.push(s.echoRecord.archiveSlotUnlocked ? 'returnArchiveLedger' : 'unlockArchiveSlot');
      else if (!s.echoRecord.nightBadgeClaimed) actions.push('claimNightBadge');
      if (s.echoRecord.recordFiled && s.ticket.carried) actions.push('returnTicket');
      if (s.ticket.returned) actions.push('returnToArchive');
      if (s.ticket.returned) actions.push('returnToMuseum');
      if (s.echoRecord.stationLampOn && !s.echoRecord.serviceWindowClosed) actions.push('closeServiceWindow');
      if (s.echoRecord.stationLampOn && !s.echoRecord.tramNoticeReset) actions.push('resetTramNotice');
      if (s.echoRecord.stationLampOn && !s.echoRecord.standpipeClosed) actions.push('closeStandpipe');
    }
    if (s.phase === 'collapse') {
      if (s.collapse.labyrinthKeys > 0) actions.push('collapseSlotKey');
      if (s.collapse.doorOpen) actions.push('collapseJump');
    }
    return actions;
  }

  // Deterministic reset back to the P0 entry state.
  reset() {
    this._state = createInitialState();
    this._bus.emit('state.changed', this.getSnapshot());
    this._bus.emit('reset');
  }
}
