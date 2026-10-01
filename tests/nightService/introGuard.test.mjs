import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  INTRO_FAILSAFE_SLACK_MS, createIntroGuard, growScheduleMs, introScheduleMs,
} from '../../src/chapters/nightService/introGuard.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('N1: the intro deadline is real time, one-shot, and independent of frames', () => {
  let t = 1000;
  const guard = createIntroGuard(() => t);
  assert.equal(guard.due(), false, 'not armed');
  guard.arm(4000);
  assert.equal(guard.remaining, 4000);
  // a 1 fps renderer: three frames, nothing yet
  for (let i = 0; i < 3; i += 1) { t += 1000; assert.equal(guard.due(), false); }
  t += 1000;
  assert.equal(guard.due(), true, 'due after 4 s of wall clock, however few frames ran');
  assert.equal(guard.due(), false, 'once');
  assert.equal(guard.armed, false);
  guard.arm(10);
  guard.disarm();
  t += 100;
  assert.equal(guard.due(), false);
});

test('N1: the deadlines cover the whole intro schedule', () => {
  // a fresh 3×2 act: the covers finish last (hold 1700 + 300 + 5·170 + 950)
  assert.equal(introScheduleMs({ hold: 1700, tiles: 6 }), 1700 + 300 + 5 * 170 + 950);
  assert.equal(introScheduleMs({ hold: 1700, tiles: 1 }), 2950);
  assert.ok(introScheduleMs({ hold: 200, tiles: 1, reduce: true }) >= 200 + 700 + 200 + 700, 'title out');
  assert.equal(growScheduleMs({ openDelay: 1000, openMs: 1250 }), 1000 + 625 + 2600 + 700);
  assert.ok(INTRO_FAILSAFE_SLACK_MS > 0 && INTRO_FAILSAFE_SLACK_MS < 2000);
});

test('N1: PanelScene clears the act title by wall clock, not by a scene-clock kill-then-fade', () => {
  const scene = read('src/chapters/nightService/PanelScene.js');
  const introduce = scene.slice(scene.indexOf('  introduce() {'), scene.indexOf('  armIntroFailsafe('));
  assert.doesNotMatch(introduce, /killTweensOf\(this\.titleBox\)/, 'no kill-then-fade on the scene clock');
  assert.doesNotMatch(introduce, /this\.time\.delayedCall/, 'the fade-out rides the tween clock');
  assert.match(introduce, /this\.armIntroFailsafe\(introScheduleMs\(/);
  assert.match(scene, /growIntro\(plan\) \{[\s\S]*?this\.armIntroFailsafe\(growScheduleMs\(/);
  // checked every frame and by a real timer
  assert.match(scene, /update\(time, delta\) \{\s*if \(this\.introGuard\.due\(\)\) this\.settleIntro\('frame'\);/);
  assert.match(scene, /setTimeout\?\.\(\(\) => \{ if \(this\.sys\?\.isActive\(\) && this\.introGuard\.due\(\)\) this\.settleIntro\('timer'\);/);
  const settle = scene.slice(scene.indexOf('  settleIntro('), scene.indexOf('  // zoom', scene.indexOf('  settleIntro(')));
  assert.match(settle, /this\.titleBox\.setAlpha\(0\)/);
  assert.match(settle, /this\.blackout\.setAlpha\(0\)/);
  assert.match(settle, /view\.cover\.setAlpha\(0\)/);
  assert.match(settle, /if \(!this\.fading && !this\.model\.state\.ended\)/, 'never cancels an act-end fade');
});
