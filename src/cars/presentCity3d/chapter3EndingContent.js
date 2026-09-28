// Station staging for the Chapter 3 finale. These positions come from the
// two-Mara scanner ending that was designed but never created; the release
// finale reuses them: Butch walks beside the Mara ahead through the platform
// scanner (SCANNER_FIELDS.station in chapter3OpeningContent.js), she boards
// first, and Lev stays on the platform.
export const ENDING_SLICE_POSITIONS = Object.freeze({
  stationTrigger: [-5.8, 0.5, 25.2],
  squareMaraScan: [-8.8, 0.5, 29.9],
  trainMaraScan: [-12.1, 0.5, 32.5],
  levPlatform: [-6.5, 0.5, 28.2],
  squareMaraBoarded: [-13.6, 0.5, 34],
  butchBoarded: [-13.1, 0.5, 33.6],
  trainDoor: [-12, 1.35, 32.5],
});
