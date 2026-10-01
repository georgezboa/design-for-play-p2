// Movement III · ECHO CITY — the argument about Mara, in already-voiced lines.
//
// Every line is a shipped Chapter 3 recording (public/assets/chapter03-3d/
// voice/ch03/manifest.json), so the subtitle is exactly what is heard. The
// Conductor makes a claim that closes the case; Butch answers. The answer
// that holds two true things at once — she left by choice AND the file
// does not say why — is the one the Conductor cannot deflect
// (docs/STORY_BIBLE.md: "two true things"; "The property was lost, not Mara").

const VOICE = '/assets/chapter03-3d/voice/ch03';
const conductor = (n) => `${VOICE}/conductor/CH03_CONDUCTOR_${String(n).padStart(4, '0')}.ogg`;
const butch = (n) => `${VOICE}/butch/CH03_BUTCH_${String(n).padStart(4, '0')}.ogg`;

const line = (speaker, text, url, tone) => Object.freeze({ speaker, text, url, tone });
// One answer spoken as two recordings back to back: the subtitle is both
// lines, in the order they are heard, and `url` is the first.
const spoken = (...parts) => Object.freeze({
  speaker: parts[0].speaker, text: parts.map((part) => part.text).join(' '), url: parts[0].url, tone: parts.at(-1).tone, parts: Object.freeze(parts),
});

// The order is the argument's order: his opener ("Official inquiry?"), the
// sighting, the ledger, the eastbound door, and his last deflection. His
// rebuttals are the platform's own brush-offs, never a line he also opens an
// exchange with, so nothing is heard twice as two different moves. Each pair
// of answers is close in length, and the one that holds both truths is
// sometimes the shorter (alpha A4-8): it is chosen by what it says.
//
// Both answers answer him (alpha R4-4): to "Official inquiry?" Butch says
// "No." either way, and only what follows differs. A deflected answer
// carries `deflect`, the one short line the HUD shows after his brush-off:
// what the archive filed instead of the truth, and to try the true thing.
export const ECHO_EXCHANGES = Object.freeze([
  Object.freeze({
    id: 'brief',
    claim: line('CONDUCTOR', 'Official inquiry? Then make it brief. This service is leaving.', conductor(8), 'hostile-dismissal'),
    replies: Object.freeze([
      Object.freeze({ cue: spoken(line('BUTCH', 'No.', butch(176), 'measured'), line('BUTCH', 'I need to know why she left. I can accept the answer if I hear it from her.', butch(150), 'measured')), holdsBoth: true, reaction: 'shame' }),
      Object.freeze({ cue: line('BUTCH', 'No. Personal. Mara disappeared. Echo City is the first place anyone saw her afterward.', butch(226), 'controlled-anger'), holdsBoth: false, rebut: line('CONDUCTOR', 'Clear of the door.', conductor(4), 'curt-correction'), deflect: 'He files a missing person. The file has none. Try the true thing.' }),
    ]),
  }),
  Object.freeze({
    id: 'looked-east',
    claim: line('CONDUCTOR', 'People wait here every day. One woman kept looking east, then left when the replacement service arrived.', conductor(6), 'forced-calm'),
    replies: Object.freeze([
      Object.freeze({ cue: line('BUTCH', 'She left voluntarily, or somebody made it look that way. Either way, someone here remembers the route.', butch(227), 'prosecutorial-anger'), holdsBoth: false, rebut: line('CONDUCTOR', 'Stand back, please.', conductor(3), 'cold-refusal'), deflect: 'He files the doubt. She chose to go. Try the true thing.' }),
      Object.freeze({ cue: line('BUTCH', 'Choice does not guarantee she is still safe. The message is already a day old.', butch(151), 'pained-certainty'), holdsBoth: true, reaction: 'shame' }),
    ]),
  }),
  Object.freeze({
    id: 'ledger',
    claim: line('CONDUCTOR', 'A late municipal clearance. I can give you the carriage ledger, not a story about why it came through.', conductor(5), 'restrained-defiance'),
    replies: Object.freeze([
      Object.freeze({ cue: line('BUTCH', 'A message can be true and still withhold most of the truth. The second line is the part she expected me to restore.', butch(193), 'pained-certainty'), holdsBoth: true, reaction: 'rage' }),
      Object.freeze({ cue: line('BUTCH', 'Transport noticed the code and Maintenance cut the message. That can be municipal censorship.', butch(120), 'prosecutorial-anger'), holdsBoth: false, rebut: line('CONDUCTOR', 'Echo City. Passengers leaving the train, please step onto the platform. Keep the doorway clear.', conductor(1), 'dismissive'), deflect: 'He files a conspiracy. Her message stays unread. Try the true thing.' }),
    ]),
  }),
  Object.freeze({
    id: 'eastbound',
    claim: line('CONDUCTOR', 'Eastbound. That is all I can say before this door closes. Station staff keep the fuller record.', conductor(7), 'dismissive'),
    replies: Object.freeze([
      Object.freeze({ cue: line('BUTCH', 'You found me at the station and led me to the first trace. Maybe you already knew where this ended.', butch(122), 'hurt-accusation'), holdsBoth: false, rebut: line('CONDUCTOR', 'Stand back, please.', conductor(3), 'cold-refusal'), deflect: 'He files a complaint. It says nothing of her. Try the true thing.' }),
      Object.freeze({ cue: line('BUTCH', 'Mara was alive when she prepared this route. She left by choice. Those are facts. Her reason is still unknown.', butch(182), 'grief-into-certainty'), holdsBoth: true, reaction: 'shame' }),
    ]),
  }),
  Object.freeze({
    id: 'own-records',
    claim: line('CONDUCTOR', 'Not in my carriage. Station staff keep their own records.', conductor(2), 'cold-deflection'),
    replies: Object.freeze([
      Object.freeze({ cue: line('BUTCH', 'Someone could have forced her to perform the whole route alone.', butch(167), 'uncertain-grief'), holdsBoth: false, rebut: line('CONDUCTOR', 'Clear of the door.', conductor(4), 'curt-correction'), deflect: 'He files her as forced. She chose. Try the true thing.' }),
      Object.freeze({ cue: line('BUTCH', 'I do not know how to stop looking yet. That may be my problem, not hers.', butch(152), 'open-grief'), holdsBoth: true, reaction: 'rage' }),
    ]),
  }),
]);

// Every voice file the argument can play (for the preload profile and tests).
const recordings = (cue) => (cue?.parts ?? [cue]).map((part) => part?.url).filter(Boolean);
export const ECHO_VOICE_URLS = Object.freeze([...new Set(ECHO_EXCHANGES.flatMap((exchange) => [
  exchange.claim.url,
  ...exchange.replies.flatMap((reply) => [...recordings(reply.cue), ...recordings(reply.rebut)]),
]))]);
