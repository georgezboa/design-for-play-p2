// The single public boundary between Door 4 (the Labyrinth) and the Chapter 5
// museum shell — same role as Door 2's chapter05BorrowedGridContract.js.
// Keep Phaser scene internals private; the museum only owns this route, these
// messages, and the physical object returned after the player takes it.
export const LABYRINTH_CHAPTER05_CONTRACT = Object.freeze({
  id: 'labyrinth',
  doorNumber: 4,
  entryHtml: 'labyrinth.html',
  embeddedSrc: '/labyrinth.html?embedded=1',
  completeMessage: 'museum-labyrinth:complete',
  exitMessage: 'museum-labyrinth:exit',
  artifactId: 'labyrinth',
  artifactLabel: 'Looking Fragment',
});
