// The single public boundary between the lobby's central case and its
// embedded exhibit, OBJECT PENDING CLASSIFICATION (one-answer.html) — the same
// role as the Labyrinth's chapter05LabyrinthContract.js. The exhibit is a
// Chapter 1 panel-engine act (src/chapters/nightService/acts/oneAnswer.js);
// the museum only owns this route and these two messages.
export const ONE_ANSWER_CHAPTER05_CONTRACT = Object.freeze({
  id: 'one-answer',
  entryHtml: 'one-answer.html',
  embeddedSrc: '/one-answer.html?embedded=1',
  completeMessage: 'museum-one-answer:complete',
  exitMessage: 'museum-one-answer:exit',
  // The accession the whole chapter is about (docs/STORY_BIBLE.md §5).
  accession: 'ACC. 1978-0412 · VELEZ, M. · PENDING',
  title: 'OBJECT PENDING CLASSIFICATION',
});
