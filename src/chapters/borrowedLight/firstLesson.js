// Chapter 2 · BORROWED LIGHT — the first box, taught do-then-explain.
//
// Pure (no Phaser). Round 6 (playtest item 6): the rooftop mechanic used to
// open with the night train and Mara, then the rules, then letters again, so
// the first mechanic was buried in story. Now one small loop closes first:
//
//   point    Butch comes up the terminal roof: she points at the box and says
//            only "punch that box" (a caption that takes no input).
//   punched  He punches it: "now wait for the bell".
//   success  The next bell brings the bridge out: "there — a box switches on
//            at the next bell".
//   ruled    A moment later, and only then, the limit: one line per colour.
//   told     Her story (the night service, Mara, the letter) is hers to tell
//            on E · TALK after that first success, never before it.
//
// updateLesson(lesson, ctx) moves the lesson on and returns the lines to say
// this step (keys of LESSON_LINES in story.js). The rule stays re-readable at
// every box once taught (the cause card's rule strip) and on E · TALK.

export const LESSON = Object.freeze({
  node: 'a-n1',
  machine: 'a-bridge1',
  // She points once Butch is on his way along the terminal roof (the train
  // door is at ≈ 300, the mechanic at 1130).
  pointFromX: 760,
  // The rule waits until the success line has been read.
  ruleDelayMs: 3400,
});

export const LESSON_STEPS = Object.freeze(['wait', 'point', 'punched', 'success', 'ruled', 'told']);

export function createLesson({ done = false } = {}) {
  return { step: done ? 'told' : 'wait', at: 0 };
}

const goTo = (lesson, step, nowMs, out, say = step) => {
  lesson.step = step;
  lesson.at = nowMs;
  if (say) out.push(say);
};

/**
 * ctx: { section, x (Butch's feet), nowMs, queued (the box is punched),
 *        powered (its bridge is out, from the box) }
 * Returns the line keys to say now, in order.
 */
export function updateLesson(lesson, { section = 'A', x = 0, nowMs = 0, queued = false, powered = false } = {}) {
  const out = [];
  if (section !== 'A') return out;
  switch (lesson.step) {
    case 'wait':
      // A punch (or a caught bell) before she has pointed still counts.
      if (powered) goTo(lesson, 'success', nowMs, out);
      else if (queued) goTo(lesson, 'punched', nowMs, out, 'wait');
      else if (x >= LESSON.pointFromX) goTo(lesson, 'point', nowMs, out);
      break;
    case 'point':
      if (powered) goTo(lesson, 'success', nowMs, out);
      else if (queued) goTo(lesson, 'punched', nowMs, out, 'wait');
      break;
    case 'punched':
      if (powered) goTo(lesson, 'success', nowMs, out);
      // Taken back before the bell: she is still pointing, and says nothing.
      else if (!queued) goTo(lesson, 'point', nowMs, out, null);
      break;
    case 'success':
      if (nowMs - lesson.at >= LESSON.ruleDelayMs) goTo(lesson, 'ruled', nowMs, out, 'rule');
      break;
    default:
      break;
  }
  return out;
}

// She points at the box until it has been punched and has rung.
export const lessonPointing = (lesson) => lesson.step === 'point' || lesson.step === 'punched';
// The same-colour rule has been told (the cause card may show it).
export const ruleTaught = (lesson) => lesson.step === 'ruled' || lesson.step === 'told';
// After the first success she has her story to tell (E · TALK).
export const storyWaiting = (lesson) => lesson.step === 'ruled';

// A finished E · TALK moves the lesson on: the rule (told in the talk) or
// her story has been heard.
export function afterTalk(lesson) {
  if (lesson.step === 'success') lesson.step = 'ruled';
  else if (lesson.step === 'ruled') lesson.step = 'told';
  return lesson.step;
}

// What E · TALK gets at each step: the step's own line before the success,
// her story after it, then the one line that matters.
export function talkLines(lesson, lines) {
  switch (lesson.step) {
    case 'wait':
    case 'point': return [lines.point];
    case 'punched': return [lines.wait];
    case 'success': return [lines.success, lines.rule];
    case 'ruled': return lines.story;
    default: return [lines.repeat];
  }
}
