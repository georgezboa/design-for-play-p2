// Chapter 3 · ECHO CITY — the release script (docs/STORY_BIBLE.md, canon v1).
//
// Beats: the night service drops Butch at Echo City with the orchard case's
// claim card → Lev and the oil line → the Transport Ministry's two tickets
// numbered 43 (the ticket board) → the market scanner, crossed beside Olek
// (walk beside) → the cut feed at dusk → the Copper Heron → the fire letters,
// relit on the bell → dawn → the station scanner, crossed beside the Mara
// ahead → the night service.
//
// Lines that survive from the voiced 1.0 pass are kept word for word so their
// recordings still play (generated/chapter03VoiceAssets.js is keyed on the
// exact speaker + subtitle). New lines are subtitle-only.
//
// Checklist menus offer Continue after one topic; every fact the next beat
// needs is folded into the conclusion lines, so no topic is ever required.
//
// Alpha round 1 length pass (target 30–35 min first time): no conversation
// runs more than five lines before the player acts (a choice, a click, a
// walk). Topic answers no longer repeat the question the menu just showed;
// the queue number, the guided walk and Lev's world briefing are gone.
//
// Round 3 logic pass (owner feedback "Ch3 lost logic when parts were cut",
// 2026-10-01): the set-ups a later beat leans on are back — the seven
// o'clock train and "another mark" on the platform, the two rows of fire
// letters and Petar's work order at dusk, the oil line as the first row at
// night, the time jump to the dawn bench. Restored lines are the 1.0
// recordings word for word where one exists. Every HUD objective names only
// what the player has been told by then (CHAPTER3_OBJECTIVES below;
// tests/car03/chapter3OpeningModel.test.mjs walks the script in order).

export const OPENING_POSITIONS = Object.freeze({
  // In the sun on the platform paving in front of the shelter, where the
  // opening camera can see him (the old spot was under the shelter roof).
  playerStart: [-3.0, 0.5, 32.6],
  levStart: [-7.8, 0.5, 26.4],
  levInterview: [1.8, 0.5, 11.8],
  seam: [8.2, 0.71, 7.3],
  seamApproach: [5.7, 0.5, 9.6],
  lampOilStall: [-13.9, 0.5, 6.2],
  eda: [-12.9, 0.5, 5.8],
  edaApproach: [-9.9, 0.5, 6.7],
  levEda: [-10.8, 0.5, 8.0],
  produceVendor: [-20.1, 0.5, 5.1],
  flowerVendor: [-20.1, 0.5, -5.0],
  olek: [-22.7, 0.5, -0.2],
  cart: [-24.2, 0.5, -1.4],
  // Final user-marked placement: the centre of the white X in the supplied
  // v28 screenshot, converted from screen pixels onto the y=0.5 ground plane.
  toma: [37.68, 0.5, -15.87],
  // Keep Butch on the open east pavement, face to face with Toma.
  transportApproach: [37.68, 0.5, -14.35],
  levTransportExterior: [36.6, 0.5, -14.35],
  // The cut lower feed lies at the head of the fire letters' second row
  // (makeGroundMessage().interfacePosition ≈ 4.5, 11.9): the same place at
  // dusk and at night.
  cutInterfaceApproach: [5.6, 0.5, 13.0],
  // Petar is packing his cutter beside the cut he made.
  petarDusk: [3.3, 0.5, 13.3],
  levDusk: [7.2, 0.5, 13.9],
});

// Scanner fields: the only places where movement switches from
// click-to-walk to direct control (WASD / held mouse). `from` is the safe
// line where a walker waits, `gate` is the scanner arch, `to` is where the
// crossing completes. The field is the rectangle around that segment.
export const SCANNER_FIELDS = Object.freeze({
  market: Object.freeze({
    id: 'market',
    label: 'MARKET WARD CROSSING',
    from: Object.freeze([-18.2, 0.5, -0.4]),
    gate: Object.freeze([-12.4, 0.5, -0.4]),
    to: Object.freeze([-7.4, 0.5, -0.4]),
    halfWidth: 3.1,
    margin: 2.2,
    walkerSpeed: 1.55,
    sideOffset: 1.05,
    // Butch always walks on the camera side of the walker (+n here).
    side: 1,
  }),
  // The station crossing runs from the approach trigger of the restored
  // two-Mara ending (chapter3EndingContent.js ENDING_SLICE_POSITIONS) to the
  // platform edge beside its scan spot; the train door is one step beyond.
  station: Object.freeze({
    id: 'station',
    label: 'PLATFORM SCANNER',
    from: Object.freeze([-4.6, 0.5, 23.6]),
    gate: Object.freeze([-6.7, 0.5, 27.7]),
    to: Object.freeze([-8.0, 0.5, 30.2]),
    halfWidth: 2.7,
    margin: 2.0,
    walkerSpeed: 1.35,
    sideOffset: 0.95,
    side: -1,
    // After the scan Mara walks around the ticket block to the door.
    boardingRoute: Object.freeze([
      Object.freeze([-8.0, 0.5, 31.1]),
      Object.freeze([-8.3, 0.5, 33.3]),
      Object.freeze([-11.6, 0.5, 33.4]),
    ]),
    levWatch: Object.freeze([-2.6, 0.5, 25.4]),
  }),
});

// ---------------------------------------------------------------- arrival
// The conductor's call (and when the train comes back for him), Butch's
// reason for getting off, then the claim card itself. G4: the seven o'clock
// train and Mara's promised "mark" are set up here; the station finale and
// the fire letters pay them off.
export const ARRIVAL_DIALOGUE = Object.freeze([
  { speaker: 'CONDUCTOR', text: 'Echo City. Passengers leaving the train, please step onto the platform. Keep the doorway clear.' },
  { speaker: 'CONDUCTOR', text: 'The night service calls back at seven tomorrow. Be on the platform.' },
  { speaker: 'BUTCH', text: 'I have a claim card, not a ticket. 1978-0412. The orchard case is still on board.' },
  { speaker: 'BUTCH', text: 'She said she would leave another mark where she could. The last one pointed here.' },
]);
export const ARRIVAL_BEFORE_CARD = 4;

export const LEV_INTRO_DIALOGUE = Object.freeze([
  { speaker: 'LEV', text: 'Keep that card out.' },
  { speaker: 'BUTCH', text: 'Why?' },
  { speaker: 'LEV', text: 'That claim number went through our station reader yesterday. Twice.' },
  { speaker: 'LEV', text: 'Lev Ardin. Civic Movement Investigation Office.' },
  { speaker: 'LEV', text: 'Two tickets forty-three, one seat, both valid. And someone poured a line of lamp oil into the paving. We start with the oil.' },
]);

// ---------------------------------------------------------------- oil seam
export const SEAM_DIALOGUE = Object.freeze([
  { speaker: 'LEV', text: 'Tell me what you can see before I tell you what I think.' },
]);

// Alpha round 4 (P1, the choices renumbered after each pick): a checklist
// menu keeps every topic at its number. An asked topic stays where it was,
// struck and greyed (`used`: it cannot be chosen again), and Continue
// appears after the first topic as the LAST option, so pressing the same
// number twice can never take it by accident.
export function checklistMenu({ text, topics, asked = [], done }) {
  const seen = new Set(asked);
  const choices = topics.map(({ topic, ...choice }) => (seen.has(topic) ? { ...choice, used: true } : { ...choice }));
  if (seen.size) choices.push({ ...done });
  return { speaker: 'CHOOSE', text, choices };
}

export function seamMenu(observed = []) {
  return checklistMenu({
    text: 'Inspect the oil line.',
    topics: [
      { topic: 'geometry', id: 'seam-geometry', label: 'Follow the shape of the line.' },
      { topic: 'fuel', id: 'seam-fuel', label: 'Check the smell without touching it.' },
      { topic: 'cleaning', id: 'seam-cleaning', label: 'Look at the pale marks along the edges.' },
    ],
    asked: observed,
    done: { id: 'seam-conclude', label: 'Give Lev your conclusion. (Continue)' },
  });
}

export const SEAM_TOPIC_RESPONSES = Object.freeze({
  'seam-geometry': [
    { speaker: 'BUTCH', text: 'It stays inside the mortar. At every corner it turns with the joint instead of crossing the stone.' },
    { speaker: 'LEV', text: 'Agreed. The person pouring it was following the paving.' },
  ],
  'seam-fuel': [
    { speaker: 'BUTCH', text: 'Kerosene. There is a sharper chemical smell under it.' },
    { speaker: 'LEV', text: 'Likely lamp oil and a stone solvent. The oil is fresh. The solvent may not be.' },
  ],
  'seam-cleaning': [
    { speaker: 'BUTCH', text: 'The stone beside the dark line is paler than the rest. Someone wiped this area first.' },
    { speaker: 'LEV', text: 'Or cleaned something that was here before. We record the pale area. We do not choose between those explanations yet.' },
  ],
});

export const SEAM_CONCLUSION = Object.freeze([
  { speaker: 'BUTCH', text: 'Fresh lamp oil, poured by hand along every joint, over stone somebody cleaned first.' },
  { speaker: 'BUTCH', text: 'Someone placed it deliberately.' },
  // Alpha round 2 (R2-4): the ministry front (Toma, 37.7, -15.9) is northeast
  // of the oil line, straight past the Reunion Fountain (20, 0); the clock
  // (0, 0) is behind Butch here. tests/car03/chapter3Guidance.test.mjs checks
  // both against the geometry.
  { speaker: 'LEV', text: 'Oil is bought, and yesterday someone paid for this on seat forty-three. The ministry is northeast, past the fountain. Toma keeps the door.' },
]);

// ---------------------------------------------------------------- ministry
export const TRANSPORT_ENTRANCE_DIALOGUE = Object.freeze([
  { speaker: 'TOMA', text: 'Public hall is open. What business are you bringing inside?' },
  { speaker: 'BUTCH', text: 'Yesterday\'s ticket forty-three. Both of them.' },
  { speaker: 'TOMA', text: 'Nika runs the ticket terminal. The window on the right.' },
]);

// G11: Nika names Sava before he speaks; his silent figure carries a hover
// tag ("Sava · issue records") and one look line.
export const SAVA_LOOK = Object.freeze([
  { speaker: 'BUTCH', text: 'Sava keeps the issue records. Every search at that terminal goes out under his stamp.' },
]);

export const NIKA_OPENING = Object.freeze([
  { speaker: 'NIKA', text: 'Sava authorized the search. I can show you timestamps, not conclusions.' },
]);

export function nikaTopicMenu(asked = []) {
  return checklistMenu({
    text: 'What do you ask Nika?',
    topics: [
      { topic: 'reservation', id: 'nika-reservation', label: 'Who holds seat forty-three tomorrow?' },
      { topic: 'sale', id: 'nika-sale', label: 'What else was charged to that seat?' },
    ],
    asked,
    done: { id: 'nika-done', label: 'Print both tickets. (Continue)' },
  });
}

export const NIKA_TOPIC_RESPONSES = Object.freeze({
  'nika-reservation': [
    { speaker: 'NIKA', text: 'Tomorrow, seven ten. One cash reservation under M. Venn, made yesterday at fifteen thirty-eight.' },
    { speaker: 'BUTCH', text: 'Mara Venn.' },
    { speaker: 'NIKA', text: 'Possibly. The reservation contains no photograph and no identity number. I can prove the name and time, not the passenger.' },
  ],
  'nika-sale': [
    { speaker: 'NIKA', text: 'A market sale at fourteen twelve. Two cans of lamp oil, stamped with the seat number. Eda\'s stall.' },
  ],
});

// Always shown: this is the line that explains VENN (STORY_BIBLE).
export const NIKA_CONCLUSION = Object.freeze([
  { speaker: 'NIKA', text: 'The first forty-three was issued to VELEZ, M. The second printed on the same seat, so the terminal filed it as a duplicate.' },
  { speaker: 'NIKA', text: 'Terminals cut long surnames on duplicates. Two letters, then NN for no name on file. VE, NN.' },
  { speaker: 'BUTCH', text: 'Venn.' },
  { speaker: 'LEV', text: 'Lay both on the public table. We look at them before anyone tells us what they mean.' },
]);

// ---------------------------------------------------------------- ticket board
// Archive cards, 2–3 lines each. `past` is what the 1978 punch-hole lens
// shows on the same card.
export const TICKET_BOARD_CARDS = Object.freeze([
  Object.freeze({
    id: 'ticket-velez',
    ticket: true,
    stamp: 'NIGHT SERVICE · SEAT 43',
    title: 'VELEZ, M.',
    lines: Object.freeze(['Issued Echo City terminal.', '07:10 · one passenger.']),
    past: Object.freeze({ stamp: '1978 · CLAIM', title: '1978-0412', lines: Object.freeze(['City case.']) }),
    at: Object.freeze([0.19, 0.32]),
  }),
  Object.freeze({
    id: 'ticket-venn',
    ticket: true,
    stamp: 'NIGHT SERVICE · SEAT 43 · DUPLICATE',
    title: 'M. VENN',
    lines: Object.freeze(['Reserved 15:38, cash.', '07:10 · one passenger.']),
    past: Object.freeze({ stamp: '1978 · CLAIM', title: '1978-0412', lines: Object.freeze(['Orchard case.']) }),
    at: Object.freeze([0.72, 0.36]),
  }),
  Object.freeze({
    id: 'terminal-note',
    stamp: 'TERMINAL NOTE · NIKA',
    title: 'Duplicates',
    lines: Object.freeze(['Long surnames are cut on a duplicate:', 'two letters, then NN. <b>VE · NN</b>']),
    at: Object.freeze([0.46, 0.73]),
  }),
  Object.freeze({
    id: 'market-sale',
    stamp: 'MARKET WARD · EDA\'S STALL · 14:12',
    title: 'Lamp oil ×2',
    lines: Object.freeze(['Paid in cash, stamped SEAT 43.', 'Carried by the porter, Olek.']),
    at: Object.freeze([0.17, 0.76]),
  }),
  Object.freeze({
    id: 'claim-card',
    stamp: 'NIGHT SERVICE · LOST PROPERTY',
    title: 'Claim 1978-0412',
    lines: Object.freeze(['VELEZ, MARA. Two claims.', 'City case collected. Orchard case on board.']),
    at: Object.freeze([0.78, 0.76]),
  }),
]);

export const TICKET_BOARD_FILED_CARD = Object.freeze({
  stamp: 'FILED AS ONE · CLAIM 1978-0412',
  title: 'VELEZ, M.',
  lines: Object.freeze(['Two tickets, one seat, one passenger.', '<s>M. VENN</s> is the archive\'s duplicate of VELEZ.']),
});

export const TICKET_BOARD_CONCLUSION = Object.freeze([
  { speaker: 'BUTCH', text: 'One seat, one claim, two tickets. The archive printed her twice.' },
  { speaker: 'LEV', text: 'Two true things, filed as two people.' },
  { speaker: 'BUTCH', text: 'The duplicate is a clerical ghost. The oil is not: it was bought on the same seat. Eda\'s stall, west past the clock.' },
]);

// ---------------------------------------------------------------- market
export const EDA_OPENING = Object.freeze([
  { speaker: 'EDA', text: 'If this is about the smell, I already called Sanitation. They sent me a complaint form instead of a cleaner.' },
]);

export function edaTopicMenu(asked = []) {
  return checklistMenu({
    text: 'What do you ask Eda?',
    topics: [
      { topic: 'order', id: 'eda-order', label: 'What did Mara buy?' },
      { topic: 'collector', id: 'eda-collector', label: 'Who collected it?' },
      { topic: 'face', id: 'eda-face', label: 'What did she look like?' },
    ],
    asked,
    done: { id: 'eda-done', label: 'Find the porter. (Continue)' },
  });
}

export const EDA_TOPIC_RESPONSES = Object.freeze({
  'eda-order': [
    { speaker: 'EDA', text: 'Two five litre cans of lamp oil and one bottle of stone solvent. She paid cash.' },
    { speaker: 'EDA', text: 'She asked where the old public fire letters connected to the street supply. I told her to ask the archive.' },
  ],
  'eda-collector': [
    { speaker: 'EDA', text: 'Olek loaded the cans after she paid him. She left first.' },
  ],
  'eda-face': [
    { speaker: 'EDA', text: 'A good coat, a rose scarf, a ticket in her glove. She kept her face to the street the whole time.' },
  ],
});

export const EDA_CONCLUSION = Object.freeze([
  // G9: the rose scarf is said aloud here, so Olek's "Only the scarf" lands.
  { speaker: 'EDA', text: 'Olek carried the two cans for her, the woman in the rose scarf. He is taking the cart through the ward crossing now.' },
  { speaker: 'LEV', text: 'That crossing has a scanner. It flags anyone who crosses alone. Walk beside Olek, in step, and it reads you as one party.' },
]);

// Olek talks while Butch keeps pace with him (short walking captions).
export const OLEK_WALK_BARKS = Object.freeze([
  { speaker: 'OLEK', text: 'I carried two sealed cans. I did not open them.' },
  { speaker: 'OLEK', text: 'She said leave them by the clock paving, at the service joint. She walked ahead the whole way.' },
  { speaker: 'OLEK', text: 'I never saw her face. Only the scarf.' },
]);

export const MARKET_CROSSED_DIALOGUE = Object.freeze([
  { speaker: 'OLEK', text: 'That is the trick of it. Two people in step and the machine counts one party.' },
  // G1: the two rows are named before Butch leans on "the second line".
  { speaker: 'LEV', text: 'The service joint at the south edge of the clock paving feeds the old fire letters, two rows in the grooves. The light is going; we should see it before dark.' },
]);

// Walk-beside feedback shown in the world and on the caption line.
export const SCANNER_WORDS = Object.freeze({
  alone: 'ALONE',
  warning: 'WARNING',
  ok: 'PATTERN OK',
  flagged: 'ALONE · WALK BESIDE SOMEONE',
  matchPrompt: 'WALK IN STEP',
  release: 'LET GO',
  // The pips bar while matched (alpha round 1: "forward" read as screen-up).
  holdHint: 'HOLD <kbd>E</kbd> · WALK IN STEP',
  wrongWay: 'THE ARCH IS THE OTHER WAY · HOLD <kbd>E</kbd>',
  releaseHint: 'WALK BACK · LET GO',
});

// ---------------------------------------------------------------- dusk
// G1: the beat opens on Petar's work order (CHAPTER3_DOCUMENTS.
// MAINTENANCE_ORDER_C441), so the man at the cut is introduced by the paper
// he signed; all four lines are the 1.0 recordings.
export const CUT_INTERFACE_OPENING = Object.freeze([
  { speaker: 'BUTCH', text: 'Completion signed P. Kolar. Petar Kolar.' },
  { speaker: 'PETAR', text: 'Order C-441. An unregistered branch under the clock paving was losing pressure, so I cut it.' },
  { speaker: 'BUTCH', text: 'The branch you cut supplied the second line of a ground message.' },
  { speaker: 'PETAR', text: 'I did not see a message. I worked from the access chamber below the paving.' },
]);

export function cutInterfaceMenu(observed = []) {
  return checklistMenu({
    text: 'Inspect the broken lower feed.',
    topics: [
      { topic: 'cut', id: 'cut-cut', label: 'Examine the cut surfaces.' },
      { topic: 'placement', id: 'cut-placement', label: 'Check where both loose ends were left.' },
      { topic: 'reconnection', id: 'cut-reconnection', label: 'Test whether the ends can meet without tools.' },
    ],
    asked: observed,
    done: { id: 'cut-conclude', label: 'Tell Lev what the interface proves. (Continue)' },
  });
}

export const CUT_INTERFACE_RESPONSES = Object.freeze({
  'cut-cut': [
    { speaker: 'BUTCH', text: 'Both faces carry the same fresh compression marks as Petar\'s cutter. One branch, one cut.' },
  ],
  'cut-placement': [
    { speaker: 'BUTCH', text: 'Neither end fell back into the access channel. They are resting side by side in the shallow groove.' },
    { speaker: 'LEV', text: 'Petar says he left them below the cover. Someone lifted them to the surface later.' },
  ],
  'cut-reconnection': [
    { speaker: 'BUTCH', text: 'The overlap is almost a hand width. Pressing one end into the old clamp would restore contact without a splice.' },
    { speaker: 'LEV', text: 'Possible by hand. Not safe to light while we are standing over it, but deliberately recoverable.' },
  ],
});

export const CUT_INTERFACE_CONCLUSION = Object.freeze([
  { speaker: 'BUTCH', text: 'Petar cut the branch. Later, someone placed both ends where a person could reconnect them by hand.' },
  // G5: the repair the night beat asks for is set up here (1.0 recording).
  { speaker: 'BUTCH', text: 'But the second line was not simply destroyed. A way to restore it was left here.' },
  { speaker: 'LEV', text: 'Record that much. The archive is closing and the next train is tomorrow morning. I booked you a room at the Copper Heron.' },
  // G10: the optional Echo Stone fire, ~60 m west, has a pointer now.
  { speaker: 'PETAR', text: 'If you want warmth first, the laundry crew keep a fire by the west wall at dusk. Seline has been showing everyone something she found.' },
]);

// ---------------------------------------------------------------- hotel
// Hana greets him as he comes in (1.0 recording), so the objective can name her.
export const HOTEL_ARRIVAL_DIALOGUE = Object.freeze([
  { speaker: 'HANA', text: 'Two rooms left. The next passenger train is tomorrow morning, so I assume you need one.' },
]);

// G7: the ledger card (Room 6, a SEAT 43 stub) opens first; Butch asks
// about what he has just read.
export const HANA_OPENING = Object.freeze([
  { speaker: 'BUTCH', text: 'That stub on your ledger is seat forty-three. Did she stay here?' },
  { speaker: 'HANA', text: 'Yes. Room six. She paid cash and asked me not to write a name.' },
]);

// Alpha round 3 (pacing) put "Take the room" first once the ledger question
// was asked; in round 4 (P1) a repeated "1" then skipped Hana's other two
// questions and took the room. It is the last option again, like every
// Continue. (Any one question still unlocks it.)
export function hanaTopicMenu(asked = []) {
  return checklistMenu({
    text: asked.length ? 'Ask Hana more, or take the room.' : 'Ask Hana about the previous guest.',
    topics: [
      { topic: 'register', id: 'hana-register', label: 'Ask why the register line was left blank.' },
      { topic: 'departure', id: 'hana-departure', label: 'Ask when she left.' },
      { topic: 'face', id: 'hana-face', label: 'Ask whether Hana saw her face.' },
    ],
    asked,
    done: { id: 'hana-done', label: 'Take the room. (Continue)' },
  });
}

export const HANA_TOPIC_RESPONSES = Object.freeze({
  'hana-register': [
    { speaker: 'HANA', text: 'People miss trains, leave spouses, lose papers and sometimes want one quiet night. I have done it for years. She did not invent the arrangement.' },
  ],
  'hana-departure': [
    { speaker: 'HANA', text: 'Before dawn. I was setting the stove. She returned the key, crossed toward the square, and did not ask for a carriage.' },
  ],
  'hana-face': [
    { speaker: 'HANA', text: 'No. Not once. She kept the scarf up and her back to the lamp. I remember thinking she was very good at it.' },
  ],
});

export const HANA_CONCLUSION = Object.freeze([
  { speaker: 'BUTCH', text: 'We will take the room. Leave my name in the book.' },
  { speaker: 'HANA', text: 'That is generally how the book works.' },
  // G3: Lev comes for Butch in the morning (he finds him in the square).
  { speaker: 'LEV', text: 'Sleep. I will find you before the first train.' },
]);

export const SLEEP_DIALOGUE = Object.freeze([
  { speaker: 'BUTCH', text: 'The next train is in the morning. Nothing useful happens before morning.' },
  { speaker: 'NARRATION', text: 'Hours later, light moves across the ceiling. Then comes the smell of lamp oil.' },
]);

export const NIGHT_WAKE_DIALOGUE = Object.freeze([
  { speaker: 'BUTCH', text: 'The lamp is out. The wick is still warm.' },
  { speaker: 'BUTCH', text: 'If the square is really burning, the street will say so. Get up. Look.' },
]);

// ---------------------------------------------------------------- night fire
// The fire letters are "another mark", as Mara's Chapter 2 letter promised.
export const FIRE_LETTERS = Object.freeze({
  first: 'BUTCH, I WAS HERE.',
  second: 'KEEP MOVING. — M.',
});

// G6: the afternoon's oil line is named as the first row; the clamp line
// (1.0 recording) tells the player what the loose ends are for.
export const NIGHT_FIRST_LINE = Object.freeze([
  { speaker: 'GROUND LETTERS', text: FIRE_LETTERS.first },
  { speaker: 'BUTCH', text: 'Another mark. She said she would leave one where she could.' },
  { speaker: 'BUTCH', text: 'This afternoon\'s oil line. It was never a spill. It was the first row.' },
  { speaker: 'BUTCH', text: 'The lower row is dark. The cut ends are beside it, exactly where they were at dusk.' },
  { speaker: 'BUTCH', text: 'Both ends overlap by a hand width. The old clamp is open.' },
]);

// G3: the night ends on the seven o'clock train and a narrated time jump,
// then the screen goes dark; the dawn bench is its own run after the dark.
export const NIGHT_SECOND_LINE = Object.freeze([
  { speaker: 'GROUND LETTERS', text: FIRE_LETTERS.second },
  { speaker: 'BUTCH', text: 'It lit on the bell. As if she knew the minute I would kneel here.' },
  { speaker: 'BUTCH', text: 'Keep moving. The night service calls at seven.' },
  { speaker: 'NARRATION', text: 'The letters burn down before four. At first light Lev finds Butch still in the square and walks him up the old service path.' },
]);

// ---------------------------------------------------------------- dawn
// G2: the bench opens on the two 1.0 lines that give "it" its train.
export const SUNRISE_BENCH_DIALOGUE = Object.freeze([
  { speaker: 'BUTCH', text: 'Do you come up here often?' },
  { speaker: 'LEV', text: 'When the first train is late.' },
  { speaker: 'BUTCH', text: 'Is it late today?' },
  { speaker: 'LEV', text: 'No.' },
  { speaker: 'BUTCH', text: 'All right.' },
]);

export const MORNING_LEV_REMINDER = Object.freeze([
  { speaker: 'LEV', text: 'The platform is past the square, where the rails come in. The night service will not wait for either of us.' },
]);

export const CAMPFIRE_SELINE_STONE_DIALOGUE = Object.freeze([
  { speaker: 'SELINE', text: 'You inspect strange things, do you not? I found this sewn into an unclaimed coat lining.' },
  { speaker: 'BUTCH', text: 'No name on the laundry ticket?' },
  { speaker: 'SELINE', text: 'No ticket. The stone hums whenever the evening tram passes. I would rather you take it.' },
  { speaker: 'BUTCH', text: 'Cold as the archive stacks. I will keep it out of the municipal ledger.' },
]);

// G10: Rada answers for herself (1.0 recording) instead of being a name.
export const CAMPFIRE_SELINE_DIALOGUE = Object.freeze([
  { speaker: 'SELINE', text: 'Rada says this is a celebration. It is really an excuse to keep me from going back for another shift.' },
  { speaker: 'RADA', text: 'Nothing official. Seline finished her first paid week at the laundry, Miro found sugar, and nobody has been arrested. We decided that was enough.' },
  { speaker: 'BUTCH', text: 'Will it work?' },
  { speaker: 'SELINE', text: 'Until the tea is gone. After that I become responsible again.' },
]);

// G10: reads for a player who never met Seline at dusk.
export const MORNING_STONE_PICKUP = Object.freeze([
  { speaker: 'BUTCH', text: 'Something blue catches in the cold ashes, under a coat someone left by the fire.' },
]);

// ---------------------------------------------------------------- station
export const STATION_APPROACH_DIALOGUE = Object.freeze([
  { speaker: 'LEV', text: 'The platform scanner reads parties, not heads. Alone, it holds you at the line.' },
  { speaker: 'BUTCH', text: 'Then I will not go alone.' },
]);

export const STATION_MARA_SIGHTED = Object.freeze([
  { speaker: 'BUTCH', text: 'Mara.' },
  { speaker: 'NARRATION', text: 'The woman in the rose scarf does not turn. She waits at the scanner line, one step ahead.' },
]);

export const STATION_SCAN_RESULT = Object.freeze({
  rows: Object.freeze(['TICKET 43 · VALID', 'TICKET 43 · VALID']),
  summary: 'ONE PASSENGER · CLAIM 1978-0412',
});

export const BOARDING_DIALOGUE = Object.freeze([
  { speaker: 'BUTCH', text: 'Thank you for treating the facts as facts.' },
  { speaker: 'LEV', text: 'It is the least glamorous part of the job.' },
]);

// Alpha round 3 (R5): read over the close shot of the open carriage door
// (Chapter3OpeningRuntime.boardNightService), not a wide platform shot.
export const BOARDED_DIALOGUE = Object.freeze([
  { speaker: 'NARRATION', text: 'Through the open door, the seat beside Butch is empty. Seat forty-three is still warm.' },
  { speaker: 'BUTCH', text: 'One step ahead. Always one step.' },
]);

export const CHAPTER_END_CARD = Object.freeze({
  kicker: 'CHAPTER 3 · COMPLETE',
  title: 'ECHO CITY',
  line: 'Two tickets, one passenger. The orchard case rides on.',
});

// ---------------------------------------------------------------- objectives
// The HUD task card (Chapter3OpeningRuntime.objectiveText). G13: each names
// only people, places and objects the player has already heard or read by
// the time it shows; the ordered-mention test walks the script to check.
export const CHAPTER3_OBJECTIVES = Object.freeze({
  stepOff: 'STEP OFF THE NIGHT SERVICE',
  meetLev: 'MEET THE MAN ON THE PLATFORM',
  oilLine: 'INSPECT THE OIL LINE',
  ministry: 'GO TO THE MINISTRY',
  publicHall: 'ENTER THE PUBLIC HALL',
  nika: 'ASK NIKA ABOUT SEAT 43',
  publicTable: 'LAY BOTH TICKETS ON THE PUBLIC TABLE',
  fileTickets: 'FILE THE TWO TICKETS',
  eda: 'ASK EDA WHO BOUGHT THE OIL',
  marketScanner: 'CROSS THE MARKET SCANNER BESIDE OLEK',
  keepPaceOlek: 'KEEP PACE WITH OLEK',
  walkThrough: 'WALK THROUGH TOGETHER',
  serviceJoint: 'FIND THE SERVICE JOINT BY THE CLOCK',
  copperHeron: 'CHECK IN AT THE COPPER HERON',
  hana: 'CHECK IN WITH HANA',
  upstairs: 'GO UPSTAIRS',
  sleep: 'SLEEP',
  night: 'NIGHT',
  roomDoor: 'OPEN THE ROOM DOOR',
  followFire: 'FOLLOW THE FIRE TO THE SQUARE',
  readLetters: 'READ THE BURNING LETTERS',
  clamp: 'DRAG THE LOOSE FEED INTO THE CLAMP',
  bell: 'WAIT FOR THE BELL',
  secondRow: 'READ THE SECOND ROW',
  dawn: 'DAWN',
  platform: 'MEET THE NIGHT SERVICE ON THE PLATFORM',
  stationScanner: 'WALK BESIDE HER THROUGH THE SCANNER',
  keepPaceHer: 'KEEP PACE BESIDE HER',
  board: 'BOARD THE NIGHT SERVICE',
  leaves: 'THE NIGHT SERVICE LEAVES ECHO CITY',
  complete: 'CHAPTER 3 COMPLETE',
});

// ---------------------------------------------------------------- guidance
// Lev notices Butch searching too long and points him at the current
// destination. `direction` is a compass word from the live player position.
export const SEARCH_HINT_LINES = Object.freeze({
  // "Twice" only after Butch really walked past the front twice (R2-4); that
  // wording keeps its 1.0 recording, the other two are subtitle-only.
  'find-ministry': (direction, { passes = 0 } = {}) => [
    {
      speaker: 'LEV',
      text: passes >= 2
        ? `We have walked past it twice. The Transport Ministry is ${direction} of here — the tall stone front with the recessed doors.`
        : `${passes === 1 ? 'We just walked past it. ' : ''}The Transport Ministry is ${direction} of here — the tall stone front with the recessed doors, where Toma waits.`,
    },
  ],
  'find-market': (direction) => [
    { speaker: 'LEV', text: `The market is ${direction} of here. Eda sells lamp oil under the blue canvas.` },
  ],
  'find-cut-interface': (direction) => [
    { speaker: 'LEV', text: `The cut feed ends ${direction} of here, at the south edge of the square — look for the old connector block between the paving grooves.` },
  ],
  'find-hotel': (direction) => [
    { speaker: 'LEV', text: `The Copper Heron is ${direction} of here, beyond the ministry lane.` },
  ],
  'find-station': (direction) => [
    { speaker: 'LEV', text: `The platform is ${direction} of here. Follow the rails.` },
  ],
});
