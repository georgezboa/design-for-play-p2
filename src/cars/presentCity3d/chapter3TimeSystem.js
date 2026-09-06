export const CHAPTER3_PERIODS = Object.freeze({
  AFTERNOON: 'AFTERNOON',
  DUSK: 'DUSK',
  NIGHT: 'NIGHT',
  DAWN: 'DAWN',
});

export const CHAPTER3_TIME_COSTS = Object.freeze({
  NEW_TOPIC: 1,
  LONG_RECONSTRUCTION: 3,
});

export const CHAPTER3_TIME_ANCHORS = Object.freeze({
  CHAPTER_START: Object.freeze({ day: 1, minuteOfDay: 14 * 60 + 20 }),
  TRAIN_DEPARTED: Object.freeze({ day: 1, minuteOfDay: 14 * 60 + 22 }),
  TRANSPORT_ENTERED: Object.freeze({ day: 1, minuteOfDay: 15 * 60 + 8 }),
  BOSKO_SQUARE: Object.freeze({ day: 1, minuteOfDay: 16 * 60 + 20 }),
  GROOVES_CONCLUDED: Object.freeze({ day: 1, minuteOfDay: 16 * 60 + 35 }),
  MATERIAL_TIMELINE: Object.freeze({ day: 1, minuteOfDay: 17 * 60 + 20 }),
  CUT_INTERFACE_COMPLETE: Object.freeze({ day: 1, minuteOfDay: 17 * 60 + 52 }),
  HOTEL_CHECK_IN: Object.freeze({ day: 1, minuteOfDay: 18 * 60 }),
  NIGHT_WAKE: Object.freeze({ day: 2, minuteOfDay: 0 * 60 + 40 }),
  DAWN_RETURN: Object.freeze({ day: 2, minuteOfDay: 6 * 60 + 20 }),
  SUNRISE_OVERLOOK: Object.freeze({ day: 2, minuteOfDay: 6 * 60 + 42 }),
  EASTBOUND_BOARDING: Object.freeze({ day: 2, minuteOfDay: 7 * 60 + 5 }),
});

function clampMinute(value) {
  return Math.max(0, Math.min(1439, Math.floor(Number(value) || 0)));
}

function absoluteMinute(day, minuteOfDay) {
  return (Math.max(1, Math.floor(Number(day) || 1)) - 1) * 1440 + clampMinute(minuteOfDay);
}

export function chapter3Period(day, minuteOfDay) {
  const minute = clampMinute(minuteOfDay);
  if (day >= 2 && minute >= 6 * 60 && minute < 9 * 60) return CHAPTER3_PERIODS.DAWN;
  if (minute >= 21 * 60 + 30 || minute < 6 * 60) return CHAPTER3_PERIODS.NIGHT;
  if (minute >= 17 * 60 + 20) return CHAPTER3_PERIODS.DUSK;
  return CHAPTER3_PERIODS.AFTERNOON;
}

export function formatChapter3Clock(day, minuteOfDay) {
  const minute = clampMinute(minuteOfDay);
  const hours = String(Math.floor(minute / 60)).padStart(2, '0');
  const minutes = String(minute % 60).padStart(2, '0');
  return `DAY ${Math.max(1, Math.floor(Number(day) || 1))} · ${hours}:${minutes}`;
}

function snapshot(clock) {
  return {
    day: clock.day,
    minuteOfDay: clock.minuteOfDay,
    time: clock.time,
    period: clock.period,
    dialogueMinutesSpent: clock.dialogueMinutesSpent,
    lastCostMinutes: clock.lastCostMinutes,
    lastReason: clock.lastReason,
  };
}

export function createChapter3Clock(anchor = CHAPTER3_TIME_ANCHORS.CHAPTER_START) {
  const clock = {
    day: Math.max(1, Math.floor(Number(anchor.day) || 1)),
    minuteOfDay: clampMinute(anchor.minuteOfDay),
    time: '',
    period: CHAPTER3_PERIODS.AFTERNOON,
    dialogueMinutesSpent: 0,
    lastCostMinutes: 0,
    lastReason: 'chapter-start',
  };
  clock.time = formatChapter3Clock(clock.day, clock.minuteOfDay);
  clock.period = chapter3Period(clock.day, clock.minuteOfDay);
  return snapshot(clock);
}

export function advanceChapter3Clock(clock, minutes, reason = 'new-topic') {
  const cost = Math.max(0, Math.floor(Number(minutes) || 0));
  if (cost === 0) return snapshot(clock);
  const absolute = absoluteMinute(clock.day, clock.minuteOfDay) + cost;
  clock.day = Math.floor(absolute / 1440) + 1;
  clock.minuteOfDay = absolute % 1440;
  clock.dialogueMinutesSpent += cost;
  clock.lastCostMinutes = cost;
  clock.lastReason = reason;
  clock.time = formatChapter3Clock(clock.day, clock.minuteOfDay);
  clock.period = chapter3Period(clock.day, clock.minuteOfDay);
  return snapshot(clock);
}

export function advanceChapter3ClockTo(clock, anchor, reason = 'authored-event') {
  const current = absoluteMinute(clock.day, clock.minuteOfDay);
  const target = absoluteMinute(anchor.day, anchor.minuteOfDay);
  if (target <= current) {
    clock.lastCostMinutes = 0;
    clock.lastReason = `${reason}-already-past`;
    return snapshot(clock);
  }
  clock.day = Math.max(1, Math.floor(Number(anchor.day) || 1));
  clock.minuteOfDay = clampMinute(anchor.minuteOfDay);
  clock.lastCostMinutes = target - current;
  clock.lastReason = reason;
  clock.time = formatChapter3Clock(clock.day, clock.minuteOfDay);
  clock.period = chapter3Period(clock.day, clock.minuteOfDay);
  return snapshot(clock);
}
