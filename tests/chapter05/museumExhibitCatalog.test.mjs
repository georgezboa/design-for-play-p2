import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHAPTER_EXHIBIT_CATALOG,
  CHAPTER_EXHIBIT_ORDER,
  chapterExhibit,
  exhibitDialogue,
} from '../../src/chapters/museum3d/data/chapterExhibitCatalog.js';

test('the Museum contains one coherent evidence dossier for every chapter', () => {
  assert.deepEqual(CHAPTER_EXHIBIT_ORDER, [
    'last-train',
    'borrowed-grid',
    'echo-city',
    'painted-country',
    'labyrinth',
  ]);
  assert.equal(Object.keys(CHAPTER_EXHIBIT_CATALOG).length, 5);
  assert.deepEqual(
    CHAPTER_EXHIBIT_ORDER.map((id) => chapterExhibit(id).chapter),
    ['CHAPTER 01', 'CHAPTER 02', 'CHAPTER 03', 'CHAPTER 04', 'CHAPTER 05'],
  );
  assert.equal(new Set(CHAPTER_EXHIBIT_ORDER.map((id) => chapterExhibit(id).accession)).size, 5);
});

test('every accession card separates object, personal meaning, and reconstruction law', () => {
  for (const id of CHAPTER_EXHIBIT_ORDER) {
    const exhibit = chapterExhibit(id);
    for (const field of ['object', 'archiveRecord', 'butchReading', 'mode', 'reconstructionLaw']) {
      assert.ok(exhibit[field]?.length > (field === 'mode' ? 5 : 12), `${id} is missing ${field}`);
    }
    const dialogue = exhibitDialogue(exhibit);
    assert.deepEqual(dialogue.map(({ speaker }) => speaker), ['ARCHIVIST', 'BUTCH', 'ARCHIVE']);
    assert.match(dialogue[0].text, new RegExp(exhibit.accession.replace('.', '\\.')));
    assert.match(dialogue[2].text, new RegExp(exhibit.mode));
  }
});

test('genre shifts are justified by distinct memory laws instead of unexplained mode changes', () => {
  assert.deepEqual(
    CHAPTER_EXHIBIT_ORDER.map((id) => chapterExhibit(id).mode),
    ['RESTORATION RECORD', 'TRAVERSAL RECORD', 'INVESTIGATION RECORD', 'MATERIAL RECORD', 'GAZE RECORD'],
  );
  const labyrinth = chapterExhibit('labyrinth');
  assert.match(labyrinth.ingress, /rebuilds that memory as a space/i);
  assert.match(labyrinth.egress, /returns control to the Museum/i);
});
