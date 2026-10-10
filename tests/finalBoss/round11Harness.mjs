// Round 11 · a hand-driven harness for a movement's director (not a test
// file itself): a body that stands or is moved, input per step, the events.
import { createBody, startDash, startJump, stepBody } from '../../src/chapters/finalBoss/conductorFight.js';

export const DT = 1 / 60;

// Drive a director by hand: a body that stands (or is moved), input per step.
export function harness(make, { difficulty = 'normal', seed = 3, x = 0, z = 6.1 } = {}) {
  const director = make({ difficulty, seed });
  const body = createBody({ x, z });
  body.inv = 999; // the harness tests rules, not dodging
  const events = [];
  const step = (seconds, input = {}) => {
    const out = [];
    for (let t = 0; t < seconds - 1e-9; t += DT) {
      if (input.jump) startJump(body);
      if (input.dash) startDash(body);
      stepBody(body, input, DT, { constrain: director.constrain ?? null });
      const ev = director.update(DT, body, input);
      out.push(...ev);
      input = { ...input, act: false, jump: false, dash: false };
    }
    events.push(...out);
    return out;
  };
  const until = (pred, max = 30, input = {}) => { for (let t = 0; t < max; t += DT) { const ev = step(DT, input); if (pred(ev)) return ev; } return null; };
  return { director, body, events, step, until };
}

