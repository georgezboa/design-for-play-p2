// Phase V — TWO TRUE THINGS.
// Pure logic. Two witnessed cases share one overloaded cradle. The player
// reuses the amber electrical relationship and cyan pneumatic relationship to
// support a second cradle, then carries one case onto it. No sequence is
// hidden: amber and cyan may be connected in either order and every partial
// state remains visible.

export const TWO_TRUE_THINGS_DEFAULTS = Object.freeze({
  fallMs: 620,
  settleMs: 600,
  caseReturnMs: 520,
});

const CASE_START = Object.freeze({ a: 0.34, b: 0.53 });
const DETENTS = Object.freeze({ mainLeft: 0.34, mainRight: 0.53, second: 0.82 });

const clamp01 = (value) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

function nearestDetent(x) {
  return Object.entries(DETENTS).reduce((best, [name, value]) => (
    Math.abs(x - value) < Math.abs(x - DETENTS[best]) ? name : best
  ), 'mainLeft');
}

export function createTwoTrueThings(config = {}) {
  const tuning = Object.freeze({ ...TWO_TRUE_THINGS_DEFAULTS, ...config });
  let entered = false;
  let fallElapsedMs = 0;
  let casesFallen = false;
  let tags = { a: false, b: false };
  let amberConnected = false;
  let cyanConnected = false;
  let grabbedCase = null;
  let cases = {
    a: { x: CASE_START.a, detent: 'mainLeft', lastMain: 'mainLeft', returningMs: 0 },
    b: { x: CASE_START.b, detent: 'mainRight', lastMain: 'mainRight', returningMs: 0 },
  };
  let settleMs = 0;
  let stageComplete = false;
  let events = [];
  let lastPlayerX = 0;

  const bothWitnessed = () => tags.a && tags.b;
  const cradleUnfolded = () => bothWitnessed();
  const cradleSupported = () => amberConnected && cyanConnected;

  function enter() {
    if (entered) return false;
    entered = true;
    return true;
  }

  function caseOnSecond() {
    return Object.entries(cases).find(([, value]) => value.detent === 'second')?.[0] ?? null;
  }

  function separated() {
    const second = caseOnSecond();
    if (!second) return false;
    const other = second === 'a' ? 'b' : 'a';
    return cases[other].detent === 'mainLeft' || cases[other].detent === 'mainRight';
  }

  function update(dtMs, { playerX = lastPlayerX } = {}) {
    const dt = Math.max(0, Number(dtMs) || 0);
    lastPlayerX = clamp01(playerX);
    if (!entered || stageComplete) return snapshot();

    if (!casesFallen) {
      fallElapsedMs += dt;
      if (fallElapsedMs >= tuning.fallMs) {
        casesFallen = true;
        events.push({ type: 'cases-fell' });
      }
      return snapshot();
    }

    if (grabbedCase) {
      cases[grabbedCase].x = lastPlayerX;
      cases[grabbedCase].detent = null;
    }

    Object.entries(cases).forEach(([id, item]) => {
      if (item.returningMs <= 0) return;
      item.returningMs = Math.max(0, item.returningMs - dt);
      if (item.returningMs === 0) {
        item.detent = item.lastMain;
        item.x = DETENTS[item.lastMain];
        events.push({ type: 'case-returned', caseId: id });
      }
    });

    const ready = bothWitnessed() && cradleSupported() && separated();
    settleMs = ready ? settleMs + dt : 0;
    if (settleMs >= tuning.settleMs) {
      stageComplete = true;
      grabbedCase = null;
      events.push({ type: 'stage-complete' });
    }
    return snapshot();
  }

  function interact(command) {
    if (!entered || !casesFallen || stageComplete) return false;
    if (command === 'amber') {
      if (!cradleUnfolded()) {
        events.push({ type: 'connection-refused', relationship: 'amber' });
        return true;
      }
      amberConnected = !amberConnected;
      events.push({ type: 'amber-changed', connected: amberConnected });
      return true;
    }
    if (command === 'cyan') {
      if (!cradleUnfolded()) {
        events.push({ type: 'connection-refused', relationship: 'cyan' });
        return true;
      }
      cyanConnected = !cyanConnected;
      events.push({ type: 'cyan-changed', connected: cyanConnected });
      return true;
    }
    if (!command?.startsWith('case-')) return false;
    const id = command.slice(5);
    if (!cases[id]) return false;

    if (!tags[id]) {
      tags = { ...tags, [id]: true };
      events.push({ type: 'witness-punched', caseId: id });
      if (bothWitnessed()) events.push({ type: 'second-cradle-unfolded' });
      return true;
    }

    if (!bothWitnessed()) {
      events.push({ type: 'case-refused', caseId: id, reason: 'other-unwitnessed' });
      return true;
    }

    if (grabbedCase && grabbedCase !== id) return false;
    if (!grabbedCase) {
      grabbedCase = id;
      cases[id].returningMs = 0;
      events.push({ type: 'case-grabbed', caseId: id });
      return true;
    }

    grabbedCase = null;
    const detent = nearestDetent(cases[id].x);
    if (detent === 'second' && !cradleSupported()) {
      cases[id].detent = 'second';
      cases[id].x = DETENTS.second;
      cases[id].returningMs = tuning.caseReturnMs;
      events.push({
        type: 'support-refused',
        caseId: id,
        missing: [!amberConnected && 'amber', !cyanConnected && 'cyan'].filter(Boolean),
      });
      return true;
    }
    cases[id].detent = detent;
    cases[id].x = DETENTS[detent];
    if (detent !== 'second') cases[id].lastMain = detent;
    events.push({ type: 'case-released', caseId: id, detent });
    return true;
  }

  function snapshot() {
    const unfolded = cradleUnfolded();
    const support = amberConnected && cyanConnected
      ? 'ready'
      : amberConnected
        ? 'winch-only'
        : cyanConnected
          ? 'air-only'
          : unfolded ? 'unsupported' : 'folded';
    const separatedNow = separated();
    return {
      entered,
      casesFalling: entered && !casesFallen,
      casesFallen,
      fallProgress: casesFallen ? 1 : clamp01(fallElapsedMs / tuning.fallMs),
      tags: { ...tags },
      bothWitnessed: bothWitnessed(),
      amberConnected,
      cyanConnected,
      cradleUnfolded: unfolded,
      cradleSupport: support,
      cases: Object.fromEntries(Object.entries(cases).map(([id, value]) => [id, { ...value }])),
      grabbedCase,
      separated: separatedNow,
      level: cradleSupported() && separatedNow,
      jettisonOpen: !stageComplete,
      settleProgress: clamp01(settleMs / tuning.settleMs),
      stageComplete,
      tuning,
    };
  }

  function drainEvents() {
    const out = events;
    events = [];
    return out;
  }

  return Object.freeze({ enter, update, interact, snapshot, drainEvents });
}
