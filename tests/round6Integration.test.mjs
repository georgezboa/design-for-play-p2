import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('round 6 type: no chapter names Anton or Space Mono any more, and the old faces are gone', () => {
  const hits = execFileSync('git', ['grep', '-lE', "Anton['\" ,]|Space Mono", '--', 'src', '*.html'], { cwd: new URL('..', import.meta.url), encoding: 'utf8' })
    .split('\n').filter(Boolean).filter((file) => !['src/shell/uiKit.css', 'src/fonts/fonts.css'].includes(file));
  assert.deepEqual(hits, []);
  assert.doesNotMatch(read('src/fonts/fonts.css'), /font-family: '(Anton|Space Mono)'/);
  assert.match(read('public/CREDITS.md'), /EB Garamond .*Jost .*SIL Open Font License 1\.1/);
  assert.match(read('public/licenses/fonts/Jost-OFL.txt'), /SIL Open Font License, Version 1\.1/);
});

test('round 6 item 18: every chapter page schedules its entry controls card', () => {
  for (const [file, id] of [
    ['src/nightService-main.js', 'chapter1'],
    ['src/borrowedLight-main.js', 'chapter2'],
    ['src/car03-3d-main.js', 'chapter3'],
    ['src/paintedCountry-main.js', 'chapter4'],
    ['src/chapters/museum3d/museum3d-main.js', 'chapter5'],
    ['src/chapters/finalBoss/spectacleBattle.js', 'chapter6'],
    ['src/chapters/blackKnifeFinal/main.js', 'blackTicket'],
  ]) assert.match(read(file), new RegExp(`scheduleChapterControlsCard\\('${id}', \\d+\\)`), file);
});

test('round 6 item 19: Chapters 3 and 5 report their stage to the pause menu', async () => {
  const { CONTROL_SETS } = await import('../src/shell/chapterControls.js');
  assert.equal(typeof CONTROL_SETS.chapter3.probe, 'function');
  assert.equal(typeof CONTROL_SETS.chapter5.probe, 'function');
  assert.match(read('src/cars/presentCity3d/Chapter3OpeningRuntime.js'), /dataset\.chapter3Stage = stage/);
  // Space is never the shown key where there is no jump (the Black Ticket)
  const { BT_KEYS } = await import('../src/chapters/blackKnifeFinal/constants.js');
  assert.doesNotMatch(BT_KEYS.punch, /SPACE/);
  // Chapter 2 punches on E everywhere the controls are written down
  assert.doesNotMatch(JSON.stringify(CONTROL_SETS.chapter2), /'F'|"F"|F punches|F ·/);
});
