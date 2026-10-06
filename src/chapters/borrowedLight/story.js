// Chapter 2 · BORROWED LIGHT — words.
//
// The mechanic's lines and Mara's letter are carried over from the retired
// Phaser parkour version of this chapter; the letter is
// kept word for word. Nothing here defines Butch's relation to Mara.

export const CHAPTER_TITLE = 'BORROWED LIGHT';
export const CHAPTER_NUMBER = 2;

export const MECHANIC_LINES = Object.freeze([
  Object.freeze({ speaker: 'ROOFTOP MECHANIC', text: 'That punch. You\'re off the night service.' }),
  Object.freeze({ speaker: 'ROOFTOP MECHANIC', text: 'She came through last night. Took the same roofs. Said you\'d be along.' }),
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
  // Alpha r4: one wording for a line the city holds, on the refused tag and
  // its float hint alike, naming the tag that holds it (level.js holdTag).
  busyHeld: (name = 'IT', tag = 'ITS LIT TAG') => `LINE HOLDING ${name}\nCUT ${tag}`,
  busyTimed: 'LINE BUSY · FREE WHEN ITS MACHINE GOES OFF',
  // The cut tells the truth about how long the bridge has (with a countdown
  // on the bridge itself).
  cutPrompt: (line = 'THE') => `F · CUT · FREES THE ${line} LINE`,
  cutDone: (bells = 1) => (bells > 1
    ? 'CUT · THE BRIDGE HOLDS UNTIL THE BELL AFTER NEXT · CROSS NOW'
    : 'CUT · THE BRIDGE HOLDS UNTIL THE NEXT BELL · CROSS NOW'),
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
  // … and when Butch stands on cradle 1 beyond its reach (alpha r4).
  fromCradleBack: 'STEP BACK TO THE MARK · THE LAST POLE IS IN REACH THERE',
  // Alpha r4: walking and jumping are taught at the start, before any jump.
  walk: 'A D  ·  ← →  WALK',
  jumpFirst: 'SPACE · JUMP · HOLD FOR HEIGHT',
  lastPoleEarly: 'BEST FROM CRADLE 1, AFTER ITS BELL',
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

// Alpha r4 · idle hints, step by step (idleHints.js roomStep). `nudge` is the
// 60 s toast: the next action, keys and all. `full` is Butch's 120 s line in
// the caption bar: why, in his words. Short; nothing defines Butch and Mara.
const hint = (nudge, full) => Object.freeze({ nudge, full });
export const IDLE_HINTS = Object.freeze({
  'walk-drop': hint('THE WAY ON IS TO THE RIGHT · DROP TO THE ROOF BELOW', 'Nothing to punch up here. Down, and on.'),
  a1: hint('F AT THE TAGGED POLE BY THE GAP · THE BRIDGE COMES OUT ON THE NEXT BELL', 'The mechanic\'s pole by the gap. Punch it, wait for the bell, and cross while the bridge is out.'),
  'a1-cross': hint('THE BRIDGE IS OUT · CROSS BEFORE IT FLICKERS', 'It holds a few seconds. Go.'),
  a2: hint('F AT THE TEAL POLE · THEN STAND IN THE LIFT CAGE FOR THE BELL', 'A lift. Punch its pole, stand in the cage, and let the bell take me up.'),
  a3: hint('PUNCH BOTH POLES · THE BELL RAISES THE LIFT AND SENDS THE BRIDGE OUT AT ITS TOP', 'Two colours, two lines: both can ring on the same bell. Punch them both and ride.'),
  a4: hint('ONE AMBER LINE · PUNCH THE BILLBOARD\'S POLE · CLIMB THE AC UNIT (SPACE) TO REACH IT', 'One line, one moment: the billboard or the bridge, not both. The billboard goes up and on.'),
  'a4-bridge': hint('THE BRIDGE ONLY LEADS TO A LOOKOUT · PUNCH THE BILLBOARD\'S POLE INSTEAD', 'That bridge goes nowhere but a view. The billboard is the way on.'),
  'a4-view': hint('A LOOKOUT · PUNCH THE AMBER POLE TO BRING THE BRIDGE BACK, THEN TAKE THE BILLBOARD', 'She\'s a roof ahead. Back across, and up by the billboard.'),
  a5: hint('F AT THE ROSE POLE · STAND OVER THE VENT · THE UPDRAFT LIFTS YOU', 'The vent. Punch it and stand in the draught when it blows.'),
  a6: hint('THIS LINE RINGS ON BELL II · PUNCH IT AND WAIT · THE NUMBER BY THE BELL SAYS WHICH IS NEXT', 'The bell counts here: one, two. That pole waits for two.'),
  a7: hint('PUNCH BOTH WHILE THE NEXT BELL IS I · UP ON BELL I, ACROSS ON BELL II', 'The lift goes on one, the bridge on two. Punch both before a one, and ride.'),
  a8: hint('PUNCH THE AMBER AND TEAL CRADLE POLES · STEP ON EACH CRADLE AS IT LOWERS', 'Three cradles: one, two, one. The bell\'s quick here.'),
  'a8-last': hint('FROM CRADLE 1, AT THE MARK · F PUNCHES THE LAST (ROSE) POLE FOR THE NEXT BELL I', 'The last cradle shares the first one\'s bell. Punch it from the first cradle, once that one has lowered.'),
  b1: hint('F AT THE ROSE POLE · ITS LIGHT SHOWS THE DARK DECKS · JUMP ACROSS WHILE THEY GLOW', 'Dark decks. They only hold in borrowed light: punch the sign and jump while it glows.'),
  b2: hint('F AT THE AMBER POLE · STAND IN THE LIFT FOR THE BELL', 'Up. Punch the lift, stand in it, wait for the bell.'),
  'b-cut': hint('THE TEAL LINE HOLDS THE BRIDGE · F · CUT AT ITS POLE, THEN RUN ACROSS BEFORE THE BELL', 'The city holds that bridge on the teal line, and the hotel lift needs the same line. Cut it, run across before the bell, then punch the lift.'),
  'b-cut-far': hint('THE HOTEL LIFT SHARES THE TEAL LINE · CUT THE TEAL TAG WHERE THE BRIDGE STARTS', 'The bridge holds the line the lift needs. Back across, cut it there, and run.'),
  'b-cross': hint('CUT · RUN ACROSS NOW · THE BRIDGE GOES AT THE BELL', 'Run.'),
  'b-rebridge': hint('THE BRIDGE IS GONE · F AT ITS TEAL POLE BRINGS IT BACK ON THE BELL', 'Bring the bridge back, then cut it again and run before the bell.'),
  'b-lift': hint('THE TEAL LINE IS FREE · F AT THE POLE BY THE HOTEL · STAND IN THE LIFT', 'The line\'s free now. Punch the lift and stand in the cage.'),
  'b-ride': hint('STAND IN THE LIFT CAGE · THE BELL TAKES IT UP', 'Wait for the bell.'),
  'b-window': hint('E AT THE HOTEL WINDOW · SOMETHING IS PINNED TO THE GLASS', 'She was at that window. Something\'s pinned to the glass.'),
  b5: hint('E AT THE LIT LANTERN · BORROW ITS LIGHT · THEN E AT THE DEAD NODE', 'That bridge has no line of its own. The lantern\'s light can carry over.'),
  'b5-give': hint('E AT THE BRIDGE\'S DEAD NODE · GIVE IT THE LIGHT · IT LIGHTS ON THE BELL', 'Give the light to the dead node. The bridge takes it at the bell.'),
  'b5-cross': hint('THE BRIDGE IS LIT · CROSS TO THE WATER TOWER', 'Across, while it\'s lit.'),
  b6: hint('E AT THE BRIDGE\'S NODE ON THE TOWER · TAKE ITS LIGHT BACK · CARRY IT', 'The decks ahead only hold in borrowed light. Take the bridge\'s light and carry it.'),
  'b6-decks': hint('THE DECKS HOLD IN THE LIGHT YOU CARRY · JUMP ACROSS · SPACE', 'They hold while the light\'s on them. Jump.'),
  b7: hint('E AT THE LANTERN · BORROW ITS LIGHT · E AT THE LIFT\'S DEAD NODE', 'A dead lift, a dead bridge, one light. Lift first.'),
  'b7-give-lift': hint('E AT THE LIFT\'S DEAD NODE · GIVE IT THE LIGHT · STAND IN THE CAGE', 'Give the lift the light, and ride.'),
  'b7-ride': hint('STAND IN THE LIFT CAGE · THE BELL TAKES IT UP', 'Up. Then the light comes with me.'),
  'b7-take': hint('STEP OFF THE LIFT · E AT ITS NODE UP HERE · TAKE THE LIGHT BACK', 'Off the lift first, then take its light back for the bridge.'),
  'b7-give-bridge': hint('E AT THE BRIDGE\'S DEAD NODE · GIVE IT THE LIGHT', 'The bridge, now.'),
  'b7-cross': hint('THE BRIDGE IS LIT · CROSS', 'Across.'),
  'c-letter': hint('E AT THE BENCH · A LETTER WAITS', 'A letter on the bench.'),
  c1: hint('F AT THE AMBER POLE · THE POINTS SWING ACROSS ON THE BELL', 'The points. Punch them and cross on the bell.'),
  c2: hint('F AT THE TEAL POLE · STAND IN THE LIFT TO THE GANTRY', 'The lift to the gantry.'),
  c3: hint('STAND IN CAGE A · F · RELEASE THE BRAKE · YOUR WEIGHT BRINGS THE WALKWAY UP', 'My weight on one side, the walkway on the other. Stand in the cage and let the brake go.'),
  c4: hint('F · RELEASE THE LEDGE\'S BRAKE (IT RINGS ON BELL I) · IT DROPS INTO LINE', 'That ledge is heavier than its box. Let its brake go and it drops into line.'),
  'c4-across': hint('THE LEDGE IS DOWN · CROSS TO THE LANDING', 'Across.'),
  'c4-walk': hint('STAND IN CAGE A2 · F · RELEASE ITS BRAKE (BELL I) · RIDE THE WALKWAY UP', 'One more walkway. Into the cage, brake off, and up.'),
  'c-board': hint('RUN FOR THE TRAIN DOOR · →', 'The door\'s open. Go.'),
});
