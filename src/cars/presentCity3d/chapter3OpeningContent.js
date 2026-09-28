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
export const ARRIVAL_DIALOGUE = Object.freeze([
  { speaker: 'CONDUCTOR', text: 'Echo City. Passengers leaving the train, please step onto the platform. Keep the doorway clear.' },
  { speaker: 'CONDUCTOR', text: 'The night service calls back at seven tomorrow. Be on the platform.' },
  { speaker: 'BUTCH', text: 'I have a claim card, not a ticket. 1978-0412. The orchard case is still on board.' },
  { speaker: 'BUTCH', text: 'She said she would leave another mark where she could. The last one pointed here.' },
]);

export const LEV_INTRO_DIALOGUE = Object.freeze([
  { speaker: 'LEV', text: 'Keep that card out.' },
  { speaker: 'BUTCH', text: 'Why?' },
  { speaker: 'LEV', text: 'Because that claim number went through our station reader yesterday. Twice.' },
  { speaker: 'LEV', text: 'Lev Ardin. Civic Movement Investigation Office.' },
  { speaker: 'LEV', text: 'Two tickets numbered forty-three, one seat, both valid. The Transport Ministry printed them.' },
  { speaker: 'LEV', text: 'Several shopkeepers reported lamp oil in the paving. There is a dark line between the station and the square.' },
  { speaker: 'LEV', text: 'We start with the thing that will still be here in ten minutes. The oil.' },
]);

export const WORLD_BRIEFING_DIALOGUE = Object.freeze([
  { speaker: 'LEV', text: 'Here. Stay on this side of the joint.' },
]);

// ---------------------------------------------------------------- oil seam
export const SEAM_DIALOGUE = Object.freeze([
  { speaker: 'LEV', text: 'Tell me what you can see before I tell you what I think.' },
]);

export function seamMenu(observed = []) {
  const seen = new Set(observed);
  const choices = [
    { id: 'seam-geometry', label: 'Follow the shape of the line.' },
    { id: 'seam-fuel', label: 'Check the smell without touching it.' },
    { id: 'seam-cleaning', label: 'Look at the pale marks along the edges.' },
  ].filter((choice) => !seen.has(choice.id.replace('seam-', '')));
  if (seen.size) choices.push({ id: 'seam-conclude', label: 'Give Lev your conclusion. (Continue)' });
  return { speaker: 'CHOOSE', text: 'Inspect the oil line.', choices };
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
  { speaker: 'LEV', text: 'That is also my conclusion. The repeated turns are the strongest reason.' },
  { speaker: 'LEV', text: 'Oil is bought, and yesterday someone paid for this on seat forty-three. The ministry is east, past the clock.' },
]);

// ---------------------------------------------------------------- ministry
export const TRANSPORT_ENTRANCE_DIALOGUE = Object.freeze([
  { speaker: 'TOMA', text: 'Public hall is open. What business are you bringing inside?' },
  { speaker: 'BUTCH', text: 'Yesterday\'s ticket forty-three. Both of them.' },
  { speaker: 'TOMA', text: 'Take a number from the brass machine. Nika runs the ticket terminal.' },
]);

export const TRANSPORT_QUEUE_DIALOGUE = Object.freeze([
  { speaker: 'BUTCH', text: 'A brass lever, a paper roll, and a slot polished by thousands of hands.' },
  { speaker: 'BUTCH', text: 'M-17.' },
  { speaker: 'CLERK', text: 'M-seventeen. The terminal window.' },
]);

export const NIKA_OPENING = Object.freeze([
  { speaker: 'NIKA', text: 'Sava authorized the search. I can show you timestamps, not conclusions.' },
  { speaker: 'BUTCH', text: 'Good. Start with what the system recorded.' },
]);

export function nikaTopicMenu(asked = []) {
  const seen = new Set(asked);
  const choices = [
    { id: 'nika-reservation', label: 'Who holds seat forty-three tomorrow?' },
    { id: 'nika-sale', label: 'What else was charged to that seat?' },
  ].filter((choice) => !seen.has(choice.id.replace('nika-', '')));
  if (seen.size) choices.push({ id: 'nika-done', label: 'Print both tickets. (Continue)' });
  return { speaker: 'CHOOSE', text: 'What do you ask Nika?', choices };
}

export const NIKA_TOPIC_RESPONSES = Object.freeze({
  'nika-reservation': [
    { speaker: 'BUTCH', text: 'Who holds seat forty-three tomorrow?' },
    { speaker: 'NIKA', text: 'Tomorrow, seven ten. One cash reservation under M. Venn, made yesterday at fifteen thirty-eight.' },
    { speaker: 'BUTCH', text: 'Mara Venn.' },
    { speaker: 'NIKA', text: 'Possibly. The reservation contains no photograph and no identity number. I can prove the name and time, not the passenger.' },
  ],
  'nika-sale': [
    { speaker: 'BUTCH', text: 'What else was charged to that seat?' },
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
    stamp: 'MARKET WARD · SALE 14:12',
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
  { speaker: 'BUTCH', text: 'The duplicate is a clerical ghost. The oil is not. It was bought on the same seat.' },
  { speaker: 'LEV', text: 'Then Eda\'s stall. The market is west, past the clock.' },
]);

// ---------------------------------------------------------------- market
export const EDA_OPENING = Object.freeze([
  { speaker: 'EDA', text: 'If this is about the smell, I already called Sanitation. They sent me a complaint form instead of a cleaner.' },
  { speaker: 'LEV', text: 'We are not here to assign the cleaning bill. We found lamp oil in the paving and need to identify the supply.' },
]);

export function edaTopicMenu(asked = []) {
  const seen = new Set(asked);
  const choices = [
    { id: 'eda-order', label: 'What did Mara buy?' },
    { id: 'eda-collector', label: 'Who collected it?' },
    { id: 'eda-face', label: 'What did she look like?' },
  ].filter((choice) => !seen.has(choice.id.replace('eda-', '')));
  if (seen.size) choices.push({ id: 'eda-done', label: 'Find the porter. (Continue)' });
  return { speaker: 'CHOOSE', text: 'What do you ask Eda?', choices };
}

export const EDA_TOPIC_RESPONSES = Object.freeze({
  'eda-order': [
    { speaker: 'BUTCH', text: 'What did Mara buy?' },
    { speaker: 'EDA', text: 'Two five litre cans of lamp oil and one bottle of stone solvent. She paid cash.' },
    { speaker: 'EDA', text: 'She asked where the old public fire letters connected to the street supply. I told her to ask the archive.' },
  ],
  'eda-collector': [
    { speaker: 'BUTCH', text: 'Who collected it?' },
    { speaker: 'EDA', text: 'Olek loaded the cans after she paid him. She left first.' },
  ],
  'eda-face': [
    { speaker: 'BUTCH', text: 'What did she look like?' },
    { speaker: 'EDA', text: 'A good coat, a teal scarf, a ticket in her glove. She kept her face to the street the whole time.' },
  ],
});

export const EDA_CONCLUSION = Object.freeze([
  { speaker: 'EDA', text: 'Olek carried the two cans for her. He is taking the cart through the ward crossing now.' },
  { speaker: 'LEV', text: 'Market Ward put a scanner on that crossing after the oil complaint. It flags anyone who crosses alone.' },
  { speaker: 'LEV', text: 'An hour of forms, if it flags you. Walk beside Olek and it reads you as one party.' },
]);

// Olek talks while Butch keeps pace with him (short walking captions).
export const OLEK_WALK_BARKS = Object.freeze([
  { speaker: 'OLEK', text: 'I carried two sealed cans. I did not open them.' },
  { speaker: 'OLEK', text: 'She said leave them by the clock paving, at the service joint. She walked ahead the whole way.' },
  { speaker: 'OLEK', text: 'I never saw her face. Only the scarf.' },
]);

export const MARKET_CROSSED_DIALOGUE = Object.freeze([
  { speaker: 'OLEK', text: 'That is the trick of it. Two people in step and the machine counts one party.' },
  { speaker: 'LEV', text: 'The service joint is at the south edge of the clock paving. The light is going; we should see it before dark.' },
]);

// Walk-beside feedback shown in the world and on the caption line.
export const SCANNER_WORDS = Object.freeze({
  alone: 'ALONE',
  warning: 'WARNING',
  ok: 'PATTERN OK',
  flagged: 'ALONE · WALK BESIDE SOMEONE',
  matchPrompt: 'WALK BESIDE',
  release: 'LET GO',
});

// ---------------------------------------------------------------- dusk
export const CUT_INTERFACE_OPENING = Object.freeze([
  { speaker: 'PETAR', text: 'Order C-441. An unregistered branch under the clock paving was losing pressure, so I cut it.' },
  { speaker: 'BUTCH', text: 'The branch you cut supplied the second line of a ground message.' },
  { speaker: 'PETAR', text: 'I did not see a message. I worked from the access chamber below the paving.' },
]);

export function cutInterfaceMenu(observed = []) {
  const seen = new Set(observed);
  const choices = [
    { id: 'cut-cut', label: 'Examine the cut surfaces.' },
    { id: 'cut-placement', label: 'Check where both loose ends were left.' },
    { id: 'cut-reconnection', label: 'Test whether the ends can meet without tools.' },
  ].filter((choice) => !seen.has(choice.id.replace('cut-', '')));
  if (seen.size) choices.push({ id: 'cut-conclude', label: 'Tell Lev what the interface proves. (Continue)' });
  return { speaker: 'CHOOSE', text: 'Inspect the broken lower feed.', choices };
}

export const CUT_INTERFACE_RESPONSES = Object.freeze({
  'cut-cut': [
    { speaker: 'BUTCH', text: 'Both faces carry the same fresh compression marks as Petar\'s cutter. One branch, one cut.' },
    { speaker: 'LEV', text: 'That confirms his tool and his admission. It does not tell us what happened after he left.' },
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
  { speaker: 'BUTCH', text: 'But the second line was not simply destroyed. A way to restore it was left here.' },
  { speaker: 'LEV', text: 'Record that much. The archive is closing and the next train is tomorrow morning. I booked you a room at the Copper Heron.' },
]);

// ---------------------------------------------------------------- hotel
export const HANA_OPENING = Object.freeze([
  { speaker: 'HANA', text: 'Two rooms left. The next passenger train is tomorrow morning, so I assume you need one.' },
  { speaker: 'LEV', text: 'One room for him. Before you write the name, we need to ask about a previous guest.' },
  { speaker: 'BUTCH', text: 'A guest on seat forty-three. Did she stay here?' },
  { speaker: 'HANA', text: 'Yes. Room six. She paid cash and asked me not to write a name.' },
]);

export function hanaTopicMenu(asked = []) {
  const seen = new Set(asked);
  const choices = [
    { id: 'hana-register', label: 'Ask why the register line was left blank.' },
    { id: 'hana-departure', label: 'Ask when she left.' },
    { id: 'hana-face', label: 'Ask whether Hana saw her face.' },
  ].filter((choice) => !seen.has(choice.id.replace('hana-', '')));
  if (seen.size) choices.push({ id: 'hana-done', label: 'Take the room. (Continue)' });
  return { speaker: 'CHOOSE', text: 'Ask Hana about the previous guest.', choices };
}

export const HANA_TOPIC_RESPONSES = Object.freeze({
  'hana-register': [
    { speaker: 'BUTCH', text: 'Why agree to leave the line blank?' },
    { speaker: 'HANA', text: 'People miss trains, leave spouses, lose papers and sometimes want one quiet night. I have done it for years. She did not invent the arrangement.' },
  ],
  'hana-departure': [
    { speaker: 'BUTCH', text: 'When did she leave?' },
    { speaker: 'HANA', text: 'Before dawn. I was setting the stove. She returned the key, crossed toward the square, and did not ask for a carriage.' },
  ],
  'hana-face': [
    { speaker: 'BUTCH', text: 'Did you see her face?' },
    { speaker: 'HANA', text: 'No. Not once. She kept the scarf up and her back to the lamp. I remember thinking she was very good at it.' },
  ],
});

export const HANA_CONCLUSION = Object.freeze([
  { speaker: 'BUTCH', text: 'We will take the room. Leave my name in the book.' },
  { speaker: 'HANA', text: 'That is generally how the book works.' },
  { speaker: 'LEV', text: 'Sleep. I will meet you on the platform before seven.' },
]);

export const SLEEP_DIALOGUE = Object.freeze([
  { speaker: 'BUTCH', text: 'The next train is in the morning. Nothing useful happens before morning.' },
  { speaker: 'NARRATION', text: 'Hours later, light moves across the ceiling. Then comes the smell of lamp oil.' },
]);

export const NIGHT_WAKE_DIALOGUE = Object.freeze([
  { speaker: 'BUTCH', text: 'The lamp is out. The wick is still warm.' },
  { speaker: 'BUTCH', text: 'No dream I have ever kept smelled of lamp oil.' },
  { speaker: 'BUTCH', text: 'If the square is really burning, the street will say so. Get up. Look.' },
]);

// ---------------------------------------------------------------- night fire
// The fire letters are "another mark", as Mara's Chapter 2 letter promised.
export const FIRE_LETTERS = Object.freeze({
  first: 'BUTCH, I WAS HERE.',
  second: 'KEEP MOVING. — M.',
});

export const NIGHT_FIRST_LINE = Object.freeze([
  { speaker: 'BUTCH', text: 'The first row is burning in the old paving grooves.' },
  { speaker: 'GROUND LETTERS', text: FIRE_LETTERS.first },
  { speaker: 'BUTCH', text: 'Another mark. She said she would leave one where she could.' },
  { speaker: 'BUTCH', text: 'The lower row is dark. The cut ends are beside it, exactly where they were at dusk.' },
  { speaker: 'BUTCH', text: 'Both ends overlap by a hand width. The old clamp is open.' },
]);

export const NIGHT_SECOND_LINE = Object.freeze([
  { speaker: 'GROUND LETTERS', text: FIRE_LETTERS.second },
  { speaker: 'BUTCH', text: 'It lit on the bell. As if she knew the minute I would kneel here.' },
  { speaker: 'BUTCH', text: 'Keep moving. The night service calls at seven.' },
  { speaker: 'NARRATION', text: 'Both lines continue burning. Wind pushes the flames in one direction, but neither sentence breaks.' },
]);

// ---------------------------------------------------------------- dawn
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

export const CAMPFIRE_SELINE_DIALOGUE = Object.freeze([
  { speaker: 'SELINE', text: 'Rada says this is a celebration. It is really an excuse to keep me from going back for another shift.' },
  { speaker: 'BUTCH', text: 'Will it work?' },
  { speaker: 'SELINE', text: 'Until the tea is gone. After that I become responsible again.' },
]);

export const MORNING_STONE_PICKUP = Object.freeze([
  { speaker: 'BUTCH', text: 'Something blue catches in the cold ashes beneath Seline\'s abandoned coat.' },
]);

// ---------------------------------------------------------------- station
export const STATION_APPROACH_DIALOGUE = Object.freeze([
  { speaker: 'LEV', text: 'The platform scanner reads parties, not heads. Alone, it holds you at the line.' },
  { speaker: 'BUTCH', text: 'Then I will not go alone.' },
]);

export const STATION_MARA_SIGHTED = Object.freeze([
  { speaker: 'BUTCH', text: 'Mara.' },
  { speaker: 'NARRATION', text: 'The woman in the teal scarf does not turn. She waits at the scanner line, one step ahead.' },
]);

export const STATION_SCAN_RESULT = Object.freeze({
  rows: Object.freeze(['TICKET 43 · VALID', 'TICKET 43 · VALID']),
  summary: 'ONE PASSENGER · CLAIM 1978-0412',
});

export const BOARDING_DIALOGUE = Object.freeze([
  { speaker: 'BUTCH', text: 'Thank you for treating the facts as facts.' },
  { speaker: 'LEV', text: 'It is the least glamorous part of the job.' },
]);

export const BOARDED_DIALOGUE = Object.freeze([
  { speaker: 'NARRATION', text: 'Butch turns to the seat beside him. It is empty. Seat forty-three is still warm.' },
  { speaker: 'BUTCH', text: 'One step ahead. Always one step.' },
]);

export const CHAPTER_END_CARD = Object.freeze({
  kicker: 'CHAPTER 3 · COMPLETE',
  title: 'ECHO CITY',
  line: 'Two tickets, one passenger. The orchard case rides on.',
});

// ---------------------------------------------------------------- guidance
// Lev notices Butch searching too long and points him at the current
// destination. `direction` is a compass word from the live player position.
export const SEARCH_HINT_LINES = Object.freeze({
  'find-ministry': (direction) => [
    { speaker: 'LEV', text: `We have walked past it twice. The Transport Ministry is ${direction} of here — the tall stone front with the recessed doors.` },
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
