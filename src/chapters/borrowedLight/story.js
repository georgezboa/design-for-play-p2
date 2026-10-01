// Chapter 2 · BORROWED LIGHT — words.
//
// The mechanic's lines and Mara's letter are carried over from the retired
// Phaser parkour version of this chapter; the letter is
// kept word for word. Nothing here defines Butch's relation to Mara.

export const CHAPTER_TITLE = 'BORROWED LIGHT';
export const CHAPTER_NUMBER = 2;

export const MECHANIC_LINES = Object.freeze([
  Object.freeze({ speaker: 'ROOFTOP MECHANIC', text: 'That punch. You\'re off the night service.' }),
  Object.freeze({ speaker: 'ROOFTOP MECHANIC', text: 'She came through three nights ago. Took the same roofs. Said you\'d be along.' }),
  Object.freeze({ speaker: 'ROOFTOP MECHANIC', text: 'This city runs on borrowed light. Punch a box and it switches on at the next bell. Try the one with the paper tag, on the pole by the gap.' }),
  Object.freeze({ speaker: 'ROOFTOP MECHANIC', text: 'One line, one moment. Punch two on the same colour and the first one forgets.' }),
  Object.freeze({ speaker: 'ROOFTOP MECHANIC', text: 'She left a letter at the platform. She said the person looking for her would know the name.' }),
]);

// A repeat visit gets the one line that matters.
export const MECHANIC_REPEAT = Object.freeze({ speaker: 'ROOFTOP MECHANIC', text: 'Punch it, then wait for the bell. The city keeps its own time.' });

export const MARA_LETTER = Object.freeze({
  speaker: 'MARA',
  role: 'letter · left on the platform bench',
  lines: Object.freeze([
    'Butch— I made it through this city, but I could not wait here.',
    'The train opened the next door before dawn. I went on.',
    'If you are following me, keep moving. I will leave another mark where I can. — Mara',
  ]),
});

export const ARCHIVE_CARD_B1 = Object.freeze({
  id: 'B1',
  heading: 'ARCHIVE CARD B1',
  subheading: 'CITY LINE · SINGLE · PUNCHED',
  lines: Object.freeze([
    'A city-line ticket stub, pinned inside the glass of room 4, Hotel Meridian.',
    'Punched once at the terminal. The same clip as the 1978 claim: MARA VELEZ.',
    'Someone kept it where it could be seen from the roofs.',
  ]),
});

export const HINTS = Object.freeze({
  punch: 'F · PUNCH',
  read: 'E · READ',
  talk: 'E · TALK',
  jump: 'SPACE · JUMP',
  listen: 'HOLD Q · LISTEN',
  busy: 'LINE HOLDING · PUNCH ITS LIT TAG TO CUT',
  busyTimed: 'LINE BUSY · FREE WHEN ITS MACHINE GOES OFF',
  cut: 'LINE CUT · FREE AFTER THE FLICKER',
  // Round 3 · a press always says what it did (or why it did nothing).
  outOfReach: 'OUT OF REACH · STEP CLOSER',
  // Alpha r3 (R3-1): a press never takes a punch back; holding it does.
  punched: (phase, inBells = 1) => (phase
    ? `PUNCHED · RINGS ON BELL ${phase === 'even' ? 'II' : 'I'}`
    : inBells > 1 ? 'PUNCHED · RINGS IN TWO BELLS' : 'PUNCHED · RINGS ON THE NEXT BELL'),
  holdTakeBack: 'HOLD F · TAKE BACK',
  takenBack: 'TAKEN BACK',
  // R3-2: never borrow the light out from under your own feet.
  stepOff: 'STEP OFF FIRST',
  // R3-3: a lift holds its bell while Butch walks to it.
  liftWaits: 'THE LIFT WAITS A BELL · STAND IN THE CAGE',
  standInCage: 'STAND IN THE CAGE',
  // A8: where the last cradle's pole is punched from.
  fromCradle: 'PUNCH THE LAST POLE FROM HERE',
  lastPoleEarly: 'BEST FROM CRADLE 1, AFTER ITS BELL',
  cutPrompt: 'F · CUT',
  renew: 'F · RENEW AT THE BELL',
  renewed: 'RENEWED · RUNS AGAIN FROM THIS BELL',
  already: 'PUNCHED · WAITING FOR THE BELL',
  caught: 'CAUGHT THE BELL',
  forgets: (line) => `SAME LINE · ${line} FORGETS THE OTHER`,
  forgotten: (line) => `${line} · FORGOTTEN`,
  ringsOn: (phase) => `RINGS ON BELL ${phase === 'even' ? 'II' : 'I'}`,
  waitsABell: (phase) => `RINGS ON BELL ${phase === 'even' ? 'II' : 'I'} · ONE MORE BELL`,
  punchesReset: 'PUNCHES FORGOTTEN · THE LAMP KEEPS YOUR PLACE',
  // Two-phase bells (A6–A8).
  bellCounts: 'THE BELL COUNTS · I · II · I · II',
  quickens: 'THE CITY\'S BELL QUICKENS',
  // Borrowed light (B5–B7).
  dead: 'DEAD NODE · NO LINE · BRING IT LIGHT',
  borrow: 'E · BORROW LIGHT',
  give: 'E · GIVE LIGHT',
  retrieve: 'E · TAKE IT BACK',
  putBack: 'E · PUT IT BACK',
  borrowed: 'LIGHT BORROWED · CARRY IT TO A DEAD NODE',
  given: 'GIVEN · IT LIGHTS AT THE BELL',
  full: 'ONE LIGHT AT A TIME',
  fixed: 'THE CITY\'S OWN LINE · PUNCH IT (F)',
  live: 'A LIVE LINE · PUNCH IT (F)',
  lit: 'ALREADY LIT',
  nothing: 'NO LIGHT TO BORROW',
  lightHome: 'THE LIGHT WENT HOME',
  lightHomeFall: 'THE LIGHT WENT HOME TO ITS LANTERN',
  // The counterweight walkway (C3).
  brake: 'F · RELEASE THE BRAKE',
  // C4 · the ledge the city holds up drops when its brake lets go.
  dropBrake: 'F · RELEASE · THE LEDGE DROPS',
  cage: 'STAND IN THE CAGE · YOUR WEIGHT TAKES IT DOWN',
});

// One-time teaching tags for the new mechanics (where they are first met).
export const TEACH = Object.freeze({
  bells: Object.freeze({ fromX: 8560, toX: 9000, x: 9230, y: 60, text: HINTS.bellCounts }),
  borrow: Object.freeze({ text: 'E AT THE LIT LANTERN · BORROW ITS LIGHT' }),
  cage: Object.freeze({ text: HINTS.cage }),
});

// The game's one name for these is MAGIC STONES (docs/STORY_BIBLE.md).
export const stoneToast = ({ count, total }) => `GRID STONE · MAGIC STONE ${count} / ${total}`;

// The dark decks of the blackout stand only in borrowed light (a lit sign or
// a punched node's afterglow); Butch's lamp shows their near edge, no more.
export const DARK_DECK_HINT = 'DARK DECK · IT HOLDS ONLY IN BORROWED LIGHT';

// The departure: one line as Butch boards. Late, the train is already rolling
// and the doors close on his coat.
export const BOARDING_LINES = Object.freeze({
  onTime: Object.freeze({ speaker: 'BUTCH', text: 'On the bell. The door waited for me.' }),
  late: Object.freeze({ speaker: 'BUTCH', text: 'Hold the— … Made it. Most of the coat, too.' }),
});
