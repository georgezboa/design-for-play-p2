// Movement III · ECHO CITY — the argument about Mara, in already-voiced lines.
//
// Every voiced line is a shipped Chapter 3 recording (public/assets/
// chapter03-3d/voice/ch03/manifest.json), so the subtitle is exactly what is
// heard. The Conductor makes a claim that closes the case; Butch answers.
// The answer that holds two true things at once — she left by choice AND
// the file does not say why — is the one the Conductor cannot deflect
// (docs/STORY_BIBLE.md: "two true things"; "The property was lost, not Mara").
//
// Round 6 (playtest item 17: the pair of answers read as "pick the more
// mature tone"). Butch answers in two steps:
//   1 WHAT HE KNOWS: two of four facts, each tied to a record the journey
//     turned up (her letter, the claim card, seat 43, Hana's ledger, order
//     C-441, Eda's sale, Nika's terminal, the clerk's note, Rosa's drawing).
//     Two are the two true things, one the Conductor can grant and one that
//     stays open; the other two are readings the record does not support,
//     and each carries the Conductor's answer from that record (`rebut`,
//     subtitle-only: all eight of his recordings are already in use).
//   2 HOW HE SAYS IT: the two voiced answers, each with a short `frame`.
//     Only the one that keeps to both facts lands.

const VOICE = '/assets/chapter03-3d/voice/ch03';
const conductor = (n) => `${VOICE}/conductor/CH03_CONDUCTOR_${String(n).padStart(4, '0')}.ogg`;
const butch = (n) => `${VOICE}/butch/CH03_BUTCH_${String(n).padStart(4, '0')}.ogg`;

const line = (speaker, text, url, tone) => Object.freeze({ speaker, text, url, tone });
// One answer spoken as two recordings back to back: the subtitle is both
// lines, in the order they are heard, and `url` is the first.
const spoken = (...parts) => Object.freeze({
  speaker: parts[0].speaker, text: parts.map((part) => part.text).join(' '), url: parts[0].url, tone: parts.at(-1).tone, parts: Object.freeze(parts),
});
// A fact Butch can hold. `holds`: one of the two true things. Otherwise it
// is a misreading of the record named in `source`, and `rebut` is the
// Conductor's answer from that record.
const fact = (id, text, source, { holds = false, rebut = null } = {}) => Object.freeze({ id, text, source, holds, ...(rebut ? { rebut } : {}) });
const truth = (id, text, source) => fact(id, text, source, { holds: true });
const misread = (id, text, source, rebut) => fact(id, text, source, { rebut });

// What the answer board asks for, in one line (the rule of Movement III).
export const ECHO_FACTS_ASK = 'CHOOSE TWO TRUE THINGS · ONE HE CAN GRANT, ONE THAT STAYS OPEN';

// The order is the argument's order: his opener ("Official inquiry?"), the
// sighting, the ledger, the eastbound door, and his last deflection. His
// voiced rebuttals are the platform's own brush-offs, never a line he also
// opens an exchange with, so nothing is heard twice as two different moves.
// Each pair of answers is close in length, and the one that holds both
// truths is sometimes the shorter (alpha A4-8): it is chosen by what it says.
//
// Both answers answer him (alpha R4-4): to "Official inquiry?" Butch says
// "No." either way, and only what follows differs. A deflected answer
// carries `deflect`, the one short line the HUD shows after his brush-off:
// what the archive filed instead of the truth, and to try the true thing.
//
// The two true things sit at a different pair of keys in each exchange.
export const ECHO_EXCHANGES = Object.freeze([
  Object.freeze({
    id: 'brief',
    claim: line('CONDUCTOR', 'Official inquiry? Then make it brief. This service is leaving.', conductor(8), 'hostile-dismissal'),
    facts: Object.freeze([
      misread('case-aboard', 'Her orchard case is still aboard. She never got off.', 'CLAIM 1978-0412 · THE ORCHARD CASE',
        'Cases stay aboard. Owners get off. Her city case was collected.'),
      truth('went-on', 'She went on by choice. Her letter says she could not wait.', 'HER LETTER · BORROWED LIGHT'),
      misread('two-of-her', 'Two tickets 43 were issued. Someone else travels as her.', 'SEAT 43 · TWO TICKETS',
        'Two tickets, one seat, one passenger. The terminal printed her twice.'),
      truth('no-reason', 'No record says why she left. The claim lists cases, not reasons.', 'CLAIM 1978-0412 · TWO CLAIMS'),
    ]),
    replies: Object.freeze([
      Object.freeze({ frame: 'AS A QUESTION ONLY SHE CAN ANSWER', cue: spoken(line('BUTCH', 'No.', butch(176), 'measured'), line('BUTCH', 'I need to know why she left. I can accept the answer if I hear it from her.', butch(150), 'measured')), holdsBoth: true, reaction: 'shame' }),
      Object.freeze({ frame: 'AS A DISAPPEARANCE', cue: line('BUTCH', 'No. Personal. Mara disappeared. Echo City is the first place anyone saw her afterward.', butch(226), 'controlled-anger'), holdsBoth: false, rebut: line('CONDUCTOR', 'Clear of the door.', conductor(4), 'curt-correction'), deflect: 'He files a missing person. The file has none. Try the true thing.' }),
    ]),
  }),
  Object.freeze({
    id: 'looked-east',
    claim: line('CONDUCTOR', 'People wait here every day. One woman kept looking east, then left when the replacement service arrived.', conductor(6), 'forced-calm'),
    facts: Object.freeze([
      truth('chose', 'She chose to go. She handed Hana the key herself.', 'THE COPPER HERON · ROOM SIX'),
      misread('made-to-go', 'Nobody leaves before dawn unless someone makes them.', 'HANA · BEFORE DAWN',
        'Before dawn she returned the key and asked for no carriage. Nobody walked her out.'),
      misread('cash-hiding', 'She paid everything in cash. She was hiding from someone.', 'EDA\'S STALL · PAID IN CASH',
        'Cash is how this city pays. People want one quiet night. She did not invent the arrangement.'),
      truth('day-old', 'Her message was already a day old when I found it.', 'BORROWED LIGHT · LAST NIGHT'),
    ]),
    replies: Object.freeze([
      Object.freeze({ frame: 'AS A COVER-UP', cue: line('BUTCH', 'She left voluntarily, or somebody made it look that way. Either way, someone here remembers the route.', butch(227), 'prosecutorial-anger'), holdsBoth: false, rebut: line('CONDUCTOR', 'Stand back, please.', conductor(3), 'cold-refusal'), deflect: 'He files the doubt. She chose to go. Try the true thing.' }),
      Object.freeze({ frame: 'AS A WORRY, NOT A CHARGE', cue: line('BUTCH', 'Choice does not guarantee she is still safe. The message is already a day old.', butch(151), 'pained-certainty'), holdsBoth: true, reaction: 'shame' }),
    ]),
  }),
  Object.freeze({
    id: 'ledger',
    claim: line('CONDUCTOR', 'A late municipal clearance. I can give you the carriage ledger, not a story about why it came through.', conductor(5), 'restrained-defiance'),
    facts: Object.freeze([
      misread('silenced', 'The city cut her second line to silence her.', 'ORDER C-441 · P. KOLAR',
        'Order C-441. A branch losing pressure, cut from below. Petar never saw a message.'),
      truth('first-true', 'Her first line burned true: BUTCH, I WAS HERE.', 'THE FIRE LETTERS · FIRST ROW'),
      truth('left-to-mend', 'The second line was cut, and its ends were left for a hand to rejoin.', 'THE CUT FEED · BY THE CLOCK'),
      misread('forged', 'The clearance came late, so the ledger is forged.', 'THE CARRIAGE LEDGER',
        'Late is not forged. A ledger says what came through. Not why.'),
    ]),
    replies: Object.freeze([
      Object.freeze({ frame: 'AS A MESSAGE HALF READ', cue: line('BUTCH', 'A message can be true and still withhold most of the truth. The second line is the part she expected me to restore.', butch(193), 'pained-certainty'), holdsBoth: true, reaction: 'rage' }),
      Object.freeze({ frame: 'AS CENSORSHIP', cue: line('BUTCH', 'Transport noticed the code and Maintenance cut the message. That can be municipal censorship.', butch(120), 'prosecutorial-anger'), holdsBoth: false, rebut: line('CONDUCTOR', 'Echo City. Passengers leaving the train, please step onto the platform. Keep the doorway clear.', conductor(1), 'dismissive'), deflect: 'He files a conspiracy. Her message stays unread. Try the true thing.' }),
    ]),
  }),
  Object.freeze({
    id: 'eastbound',
    claim: line('CONDUCTOR', 'Eastbound. That is all I can say before this door closes. Station staff keep the fuller record.', conductor(7), 'dismissive'),
    facts: Object.freeze([
      truth('laid-route', 'She was alive and laying the route. She bought the oil herself.', 'EDA\'S STALL · 14:12'),
      misread('gone-home', 'Eastbound means she has gone home to the orchard.', 'THE ORCHARD CASE · BELLWETHER',
        'Eastbound is a direction, not an address. Bellwether has no forwarding address on file.'),
      truth('no-why', 'Every record gives a time. None of them gives a reason.', 'NIKA\'S TERMINAL · TIMESTAMPS'),
      misread('to-burn', 'She bought the lamp oil to set the square alight.', 'LAMP OIL · TWO CANS',
        'Two cans, poured along the joints. The letters burned. Nothing else did.'),
    ]),
    replies: Object.freeze([
      Object.freeze({ frame: 'AS HIS FAULT', cue: line('BUTCH', 'You found me at the station and led me to the first trace. Maybe you already knew where this ended.', butch(122), 'hurt-accusation'), holdsBoth: false, rebut: line('CONDUCTOR', 'Stand back, please.', conductor(3), 'cold-refusal'), deflect: 'He files a complaint. It says nothing of her. Try the true thing.' }),
      Object.freeze({ frame: 'AS FACTS, AND ONE UNKNOWN', cue: line('BUTCH', 'Mara was alive when she prepared this route. She left by choice. Those are facts. Her reason is still unknown.', butch(182), 'grief-into-certainty'), holdsBoth: true, reaction: 'shame' }),
    ]),
  }),
  Object.freeze({
    id: 'own-records',
    claim: line('CONDUCTOR', 'Not in my carriage. Station staff keep their own records.', conductor(2), 'cold-deflection'),
    facts: Object.freeze([
      misread('staff-hide', 'The station staff are hiding the rest of her record.', 'STATION STAFF · THE FULLER RECORD',
        'Staff keep timetables, not secrets. You have read every record she left.'),
      misread('drawn-home', 'Rosa drew her walking home. That is where she is now.', 'PLATE IV · ROSA\'S DRAWING',
        'A child\'s drawing of a lane, from before. A drawing is not a timetable.'),
      truth('two-lives', 'She kept two lives on purpose: a city room, the orchard at weekends.', 'CLERK\'S NOTE · 1981'),
      truth('still-looking', 'I ride on a claim card, not a ticket. The looking is mine.', 'YOUR CLAIM CARD · 1978-0412'),
    ]),
    replies: Object.freeze([
      Object.freeze({ frame: 'AS FORCE', cue: line('BUTCH', 'Someone could have forced her to perform the whole route alone.', butch(167), 'uncertain-grief'), holdsBoth: false, rebut: line('CONDUCTOR', 'Clear of the door.', conductor(4), 'curt-correction'), deflect: 'He files her as forced. She chose. Try the true thing.' }),
      Object.freeze({ frame: 'AS YOUR OWN PROBLEM', cue: line('BUTCH', 'I do not know how to stop looking yet. That may be my problem, not hers.', butch(152), 'open-grief'), holdsBoth: true, reaction: 'rage' }),
    ]),
  }),
]);

// Every voice file the argument can play (for the preload profile and tests).
const recordings = (cue) => (cue?.parts ?? [cue]).map((part) => part?.url).filter(Boolean);
export const ECHO_VOICE_URLS = Object.freeze([...new Set(ECHO_EXCHANGES.flatMap((exchange) => [
  exchange.claim.url,
  ...exchange.replies.flatMap((reply) => [...recordings(reply.cue), ...recordings(reply.rebut)]),
]))]);
