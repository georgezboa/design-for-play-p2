// One editorial system for every chapter object in the Museum.
//
// The archive record names the physical evidence. Butch's reading restores
// the human meaning that the institution strips away. The reconstruction law
// explains why that memory becomes a different kind of game when entered.

export const CHAPTER_EXHIBIT_CATALOG = Object.freeze({
  'last-train': Object.freeze({
    id: 'last-train',
    chapter: 'CHAPTER 01',
    title: 'THE LAST TRAIN',
    accession: 'ACC. 17-1017',
    object: 'PUNCHED TICKET A-1017 · CYAN PROMISE THREAD',
    archiveRecord: 'Recovered from the last night-service carriage after its power relay failed.',
    butchReading: 'A ticket says where I was sent. The thread says why I kept moving.',
    mode: 'RESTORATION RECORD',
    reconstructionLaw: 'A broken memory is rebuilt as repair, conversation, and choice: restore the carriage to make the past move again.',
  }),
  'borrowed-grid': Object.freeze({
    id: 'borrowed-grid',
    chapter: 'CHAPTER 02',
    title: 'NEON ROOFTOPS',
    accession: 'ACC. 17-2014',
    object: 'BYPASS COIL · LADDER RUNG · ROOFTOP TRANSIT MARKER',
    archiveRecord: 'Unauthorized transit hardware recovered from the elevated districts.',
    butchReading: 'The city measured every gap. I remember only the next handhold and the lights chasing me.',
    mode: 'TRAVERSAL RECORD',
    reconstructionLaw: 'Flight is stored as momentum: the archive turns danger into a route that can only be understood by crossing it.',
  }),
  'echo-city': Object.freeze({
    id: 'echo-city',
    chapter: 'CHAPTER 03',
    title: 'ECHO CITY',
    accession: 'ACC. 17-3041',
    object: 'WITNESS CASSETTE · OIL-SEAM MAP · WORK ORDER C-441',
    archiveRecord: 'Conflicting civic testimony filed beside a maintenance route marked in oil.',
    butchReading: 'A city is not one statement. It is every person who points somewhere different and still expects you to listen.',
    mode: 'INVESTIGATION RECORD',
    reconstructionLaw: 'Contradiction is stored as evidence: explore freely, compare testimony, and assemble a route no single witness can provide.',
  }),
  'painted-country': Object.freeze({
    id: 'painted-country',
    chapter: 'CHAPTER 04',
    title: 'THE PAINTED COUNTRY',
    accession: 'ACC. 17-4076',
    object: 'COMMON FOLD · PIGMENT KEYS · TRAIN-WHEEL STUDY',
    archiveRecord: 'Paper, mineral pigment, and a wheel sketch recovered from a country with unstable material rules.',
    butchReading: 'It was never unfinished. It changed whenever I learned how to see its colors.',
    mode: 'MATERIAL RECORD',
    reconstructionLaw: 'Color is stored as physics: changing the palette changes what is solid, what can move, and which path exists.',
  }),
  labyrinth: Object.freeze({
    id: 'labyrinth',
    chapter: 'CHAPTER 05',
    title: 'THE LABYRINTH',
    accession: 'ACC. 17-5008',
    object: 'LOOKING FRAGMENT · EIGHT-KEY RING · GAZE INDEX',
    archiveRecord: 'A broken stone observer catalogued with eight keys from an unbounded gallery.',
    butchReading: 'It did not follow me because it was alive. It followed whenever I stopped seeing it.',
    mode: 'GAZE RECORD',
    reconstructionLaw: 'Being watched is stored as a law of sight: what remains in view must stop; what leaves the frame is free to move.',
    ingress: 'The archive cannot preserve the feeling of being watched as a document. It rebuilds that memory as a space governed by sight.',
    egress: 'The stone becomes an object again. Sight releases the body, and the reconstruction returns control to the Museum.',
  }),
});

export const CHAPTER_EXHIBIT_ORDER = Object.freeze([
  'last-train',
  'borrowed-grid',
  'echo-city',
  'painted-country',
  'labyrinth',
]);

export function chapterExhibit(id) {
  const exhibit = CHAPTER_EXHIBIT_CATALOG[id];
  if (!exhibit) throw new Error(`Unknown Museum chapter exhibit: ${String(id)}`);
  return exhibit;
}

export function exhibitDialogue(exhibit) {
  return [
    { speaker: 'ARCHIVIST', text: `${exhibit.chapter} · ${exhibit.accession}. ${exhibit.object}. ${exhibit.archiveRecord}` },
    { speaker: 'BUTCH', text: exhibit.butchReading },
    { speaker: 'ARCHIVE', text: `${exhibit.mode}: ${exhibit.reconstructionLaw}` },
  ];
}
