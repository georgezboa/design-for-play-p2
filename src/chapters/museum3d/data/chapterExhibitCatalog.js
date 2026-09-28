// One editorial system for every chapter object in the Museum
// (docs/STORY_BIBLE.md: the museum "has already filed Butch's journey").
//
// Each case is filed under the one claim the whole game is about,
// ACC. 1978-0412. The accession card is the museum's cold reading; Butch's
// line is the human one. Cards stay at two or three short lines.

export const MUSEUM_ACCESSION = 'ACC. 1978-0412 · VELEZ, M. · PENDING';
export const MUSEUM_DATE = '17 OCT 1978';

export const CHAPTER_EXHIBIT_CATALOG = Object.freeze({
  'night-service': Object.freeze({
    id: 'night-service',
    chapter: 'CHAPTER 01',
    title: 'NIGHT SERVICE',
    accession: 'ACC. 1978-0412 · 1',
    object: 'THE ORCHARD CASE',
    archiveRecord: 'Brown case, tag BELLWETHER. Left on the night service. Unclaimed.',
    butchReading: 'I set it on the Bellwether bench. The archive came back for it.',
  }),
  'borrowed-light': Object.freeze({
    id: 'borrowed-light',
    chapter: 'CHAPTER 02',
    title: 'BORROWED LIGHT',
    accession: 'ACC. 1978-0412 · 2',
    object: 'TICKET STUB · CITY LINE',
    archiveRecord: 'City-line stub, punched once. Holder: VELEZ, M.',
    butchReading: '“Keep moving,” her letter said. So I did.',
  }),
  'echo-city': Object.freeze({
    id: 'echo-city',
    chapter: 'CHAPTER 03',
    title: 'ECHO CITY',
    accession: 'ACC. 1978-0412 · 3',
    object: 'DUPLICATE RESERVATION · M. VENN',
    archiveRecord: 'Reservation 43, printed twice. Surname cut short. Nika’s torn page behind it.',
    butchReading: 'The terminal shortened her name. The archive kept the short one.',
  }),
  'painted-country': Object.freeze({
    id: 'painted-country',
    chapter: 'CHAPTER 04',
    title: 'THE PAINTED COUNTRY',
    accession: 'ACC. 1978-0412 · 4',
    object: 'PLATE IV · A CHILD’S DRAWING',
    archiveRecord: 'Orchard lane, hawthorn, one figure walking. Artist: unknown.',
    butchReading: 'Rosa drew it. The hawthorn is Mara’s mark.',
  }),
});

// Walking east down the archive corridor: Chapter 1 first.
export const CHAPTER_EXHIBIT_ORDER = Object.freeze([
  'night-service',
  'borrowed-light',
  'echo-city',
  'painted-country',
]);

// The three bays that used to be sealed shutters are the archive's own filed
// claims: the one clean answer the lobby exhibit asks the player to refuse.
export const FILED_CLAIMS = Object.freeze([
  Object.freeze({
    id: 'filed-city',
    stamp: `FILED · ${MUSEUM_DATE}`,
    title: 'CITY CASE — COLLECTED',
    lines: ['Owner: VELEZ, M. · a rented room near the terminal.', 'Claim closed.'],
  }),
  Object.freeze({
    id: 'filed-orchard',
    stamp: `FILED · ${MUSEUM_DATE}`,
    title: 'ORCHARD CASE — UNCLAIMED',
    lines: ['Tag reads BELLWETHER. No forwarding address on file.', 'Held as lost property.'],
  }),
  Object.freeze({
    id: 'filed-duplicate',
    stamp: `FILED · ${MUSEUM_DATE}`,
    title: 'SECOND CLAIM — DISCARDED',
    lines: ['One person, one claim.', 'The archive does not issue duplicates.'],
  }),
]);

// The Labyrinth is not a case: Door 4 still opens. Its framed-exhibit card
// explains the sight rule once before the player enters.
export const LABYRINTH_EXHIBIT = Object.freeze({
  id: 'labyrinth',
  title: 'THE LABYRINTH',
  mode: 'THE LABYRINTH · EIGHT KEYS',
  ingress: 'The statues move only while you are not looking. Face them, keep them in your light, and bring out all eight keys.',
  egress: 'EIGHT KEYS FILED',
});

export function chapterExhibit(id) {
  const exhibit = CHAPTER_EXHIBIT_CATALOG[id];
  if (!exhibit) throw new Error(`Unknown Museum chapter exhibit: ${String(id)}`);
  return exhibit;
}

/** An accession case as a short archive card (`.nf-card`). */
export function exhibitCard(exhibit) {
  return {
    stamp: `${exhibit.chapter} · ${exhibit.title} · ${exhibit.accession}`,
    title: exhibit.object,
    lines: [exhibit.archiveRecord, `BUTCH — ${exhibit.butchReading}`],
  };
}
