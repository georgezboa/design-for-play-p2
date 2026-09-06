// The single public boundary between Door 2 and the Chapter 5 museum shell.
// Keep Phaser scene internals private; the museum only owns this route, these
// messages, and the physical object returned after the player takes it.
export const BORROWED_GRID_CHAPTER05_CONTRACT = Object.freeze({
  id: 'borrowed-grid',
  doorNumber: 2,
  entryHtml: 'borrowed-grid.html',
  embeddedSrc: '/borrowed-grid.html?embedded=1',
  completeMessage: 'chapter05-direction:borrowed-grid:complete',
  exitMessage: 'chapter05-direction:borrowed-grid:exit',
  artifactId: 'borrowed-grid',
  artifactLabel: 'Three-District Bypass Coil',
});
