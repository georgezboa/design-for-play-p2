import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  CHAPTER_EXHIBIT_CATALOG,
  CHAPTER_EXHIBIT_ORDER,
  FILED_CLAIMS,
  MUSEUM_ACCESSION,
  MUSEUM_DATE,
  chapterExhibit,
  exhibitCard,
} from '../../src/chapters/museum3d/data/chapterExhibitCatalog.js';
import { CHAPTER_CASE_OBJECT_IDS } from '../../src/chapters/museum3d/assets/ChapterCaseObjects.js';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('one case per earlier chapter, Chapter 1 → 4, under the new chapter names', () => {
  assert.deepEqual(CHAPTER_EXHIBIT_ORDER, ['night-service', 'borrowed-light', 'echo-city', 'painted-country']);
  assert.equal(Object.keys(CHAPTER_EXHIBIT_CATALOG).length, 4);
  assert.deepEqual(CHAPTER_EXHIBIT_ORDER.map((id) => chapterExhibit(id).chapter), ['CHAPTER 01', 'CHAPTER 02', 'CHAPTER 03', 'CHAPTER 04']);
  assert.deepEqual(CHAPTER_EXHIBIT_ORDER.map((id) => chapterExhibit(id).title), ['NIGHT SERVICE', 'BORROWED LIGHT', 'ECHO CITY', 'THE PAINTED COUNTRY']);
  assert.equal(chapterExhibit('night-service').object, 'THE ORCHARD CASE');
  assert.match(chapterExhibit('borrowed-light').object, /TICKET STUB · CITY LINE/);
  assert.match(chapterExhibit('echo-city').object, /M\. VENN/);
  assert.match(chapterExhibit('echo-city').archiveRecord, /Nika/);
  assert.match(chapterExhibit('painted-country').butchReading, /Rosa drew it\. The hawthorn is Mara’s mark\./);
  assert.deepEqual([...CHAPTER_CASE_OBJECT_IDS].sort(), [...CHAPTER_EXHIBIT_ORDER].sort(), 'every case has its object');
});

test('the old chapters are gone from every card', () => {
  const all = JSON.stringify([CHAPTER_EXHIBIT_CATALOG, FILED_CLAIMS]);
  for (const stale of ['THE LAST TRAIN', 'cyan promise thread', 'CYAN PROMISE THREAD', 'NEON ROOFTOPS', 'BYPASS COIL', 'bypass coil', 'LOOKING FRAGMENT', 'Infinity Train', 'Black Knife']) {
    assert.ok(!all.includes(stale), `stale copy: ${stale}`);
  }
});

test('one accession, one date: every case is filed under claim 1978-0412 on 17 OCT 1978', () => {
  assert.equal(MUSEUM_ACCESSION, 'ACC. 1978-0412 · VELEZ, M. · PENDING');
  assert.equal(MUSEUM_DATE, '17 OCT 1978');
  CHAPTER_EXHIBIT_ORDER.forEach((id, index) => assert.equal(chapterExhibit(id).accession, `ACC. 1978-0412 · ${index + 1}`));
  FILED_CLAIMS.forEach((claim) => assert.equal(claim.stamp, 'FILED · 17 OCT 1978'));
  const museumCopy = [read('../../src/chapters/museum3d/scenes/ServiceLobby.js'), read('../../src/chapters/museum3d/scenes/ArchiveCorridor.js')].join('\n');
  for (const stale of ['ACC. 17-', 'OCTOBER 17', 'FOUR DIRECTIONS', 'A-1017']) assert.ok(!museumCopy.includes(stale), stale);
});

test('cards stay short: two or three lines, the museum\'s reading then Butch\'s', () => {
  for (const id of CHAPTER_EXHIBIT_ORDER) {
    const card = exhibitCard(chapterExhibit(id));
    assert.ok(card.lines.length >= 2 && card.lines.length <= 3, id);
    assert.match(card.lines.at(-1), /^BUTCH — /);
    assert.ok(card.lines.every((line) => line.length <= 90), `${id} has a long line`);
  }
  for (const claim of FILED_CLAIMS) assert.ok(claim.lines.length <= 3);
  assert.deepEqual(FILED_CLAIMS.map(({ title }) => title), ['CITY CASE — COLLECTED', 'ORCHARD CASE — UNCLAIMED', 'SECOND CLAIM — DISCARDED']);
  assert.match(FILED_CLAIMS[2].lines.join(' '), /The archive does not issue duplicates\./);
});
