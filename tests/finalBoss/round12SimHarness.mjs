// Round 12 · shared harness for the bot sims (not a test file itself).
import { createPieceRunner } from '../../src/chapters/finalBoss/setPieces/kernel.js';
import { createPieceBot, simulatePiece } from '../../src/chapters/finalBoss/setPieces/bots.js';
import { findPiece } from '../../src/chapters/finalBoss/setPieces/sequence.js';

// Play one set piece start to finish with a bot profile.
export function botRun(id, { difficulty = 'normal', skill = 'skilled', seed = 1, maxSeconds = 420 } = {}) {
  const { spec } = findPiece(id);
  const piece = spec.make({ difficulty, seed: spec.seed + seed });
  const runner = createPieceRunner({ piece, difficulty, movement: findPiece(id).movement });
  const bot = createPieceBot({ skill, seed: seed * 7 + 3 });
  const hitsBy = {};
  const result = simulatePiece({ runner, bot, maxSeconds, onEvent: (e) => { if (e.type === 'hurt') hitsBy[e.source] = (hitsBy[e.source] ?? 0) + 1; } });
  return { ...result, hitsBy };
}

// Nobody at the controls, past the teaching stretch: what the piece does to
// a player who does nothing.
export function idleRun(id, { difficulty = 'normal', seconds = 25, startSegment = 1 } = {}) {
  const { spec, movement } = findPiece(id);
  const piece = spec.make({ difficulty, seed: spec.seed, startSegment });
  const runner = createPieceRunner({ piece, difficulty, movement });
  let hurt = 0;
  let finished = false;
  for (let t = 0; t < seconds; t += 1 / 60) {
    for (const e of runner.step(1 / 60, {})) { if (e.type === 'hurt') hurt += 1; if (e.type === 'finished') finished = true; }
  }
  return { hurt, finished, ticket: piece.seg.ticket() };
}

export const describeRun = (r) => `${r.finished ? 'won' : 'NOT WON'} in ${r.time}s, ${r.deaths} deaths, ${r.hits} hits ${JSON.stringify(r.hitsBy)}`;
