// Chapter 5 P0 graybox tuning. All dimensions in meters, measured for final
// navigation (per work package: placeholder silhouettes must already support it).

export const PLAYER = {
  eyeHeight: 1.6,
  bodyHeight: 1.78,
  radius: 0.35,
  walkSpeed: 3.2,
  jumpVelocity: 5.8,
  gravity: 13,
  interactRange: 2.6,
  lookSensitivity: 0.0038,
};

export const COLORS = {
  // Civic museum baseline — ordinary, beige, fluorescent.
  wallBeige: 0xcfc4a8,
  wallBeigeDark: 0xbfb398,
  carpet: 0x6b5d4f,
  carpetLane: 0x55493e,
  ceiling: 0xe6e3da,
  trim: 0x4a4238,
  deskWood: 0x7a6a53,
  deskTop: 0x8a7a60,
  brass: 0x8a7a4a,
  glass: 0xa8ccd8,
  casePlinth: 0xd8d2c2,
  lampShade: 0x2e4a3a,
  phoneBlack: 0x1c1c1e,
  paper: 0xf2eddc,
  signDark: 0x23211c,
  doorFrame: 0x3a352c,
  fluorescent: 0xf4f7ee,
  // Echo City reconstruction — readable old-civic afternoon from Chapter 3.
  asphalt: 0x48535e,
  sidewalk: 0x93989b,
  curb: 0x5a5c5f,
  facadeA: 0x4d545e,
  facadeB: 0x5d564c,
  facadeC: 0x424a52,
  gateSteel: 0x2f6f6a,
  trainBody: 0x8c2f2f,
  trainStripe: 0xd8d2c2,
  cyan: 0x75b7ae,
  nightSky: 0x758395,
};

export const VERSION = 'P0 ECHO CITY AUTHORITY v0.5.0';

// Debug beat entry points (?beat=lobby|corridor|echo|return) — Gate 1 task 5.
export const DEBUG_BEATS = ['lobby', 'corridor', 'echo', 'return', 'collapse'];
