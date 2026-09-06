import { C, CAR } from './colors.js';

// Shared skin for the Prologue carriage. This changes materials, not puzzle
// state: status lamps and machine feedback continue to use their original
// semantic colours.
export const RETRO_TRANSIT = Object.freeze({
  ivory: C(CAR.BRASS_HI),
  orange: C(CAR.SAFETY_ORANGE),
  orangeShadow: C(CAR.BRASS_DARK),
  charcoal: C(CAR.ENAMEL_DARK),
  charcoalDeep: C(CAR.VOID_LIFT),
  black: C(CAR.VOID),
  silver: C(CAR.STEEL_HI),
  silverDark: C(CAR.STEEL_DARK),
  cyan: C(CAR.LAMP_OK),
});

export const RETRO_TRANSIT_CSS = Object.freeze({
  ivory: '#e8d5a7',
  orange: '#d96b30',
  orangeShadow: '#7f6540',
  charcoal: '#263238',
  charcoalDeep: '#17232b',
  black: '#0a1015',
  silver: '#9fb7c0',
  cyan: '#75d4cd',
});
