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

export const ECHO_EXCHANGES = Object.freeze([
  Object.freeze({
    id: 'looked-east',
    claim: line('CONDUCTOR', 'People wait here every day. One woman kept looking east, then left when the replacement service arrived.', conductor(6), 'forced-calm'),
    replies: Object.freeze([
      Object.freeze({ cue: line('BUTCH', 'Why didn’t you stop her?', butch(57), 'hurt-accusation'), holdsBoth: false, rebut: line('CONDUCTOR', 'Stand back, please.', conductor(3), 'cold-refusal') }),
      Object.freeze({ cue: line('BUTCH', 'Read it exactly. She left by choice. That does not mean every later circumstance was safe, and it does not explain why she left.', butch(199), 'measured'), holdsBoth: true, reaction: 'shame' }),
    ]),
  }),
  Object.freeze({
    id: 'ledger',
    claim: line('CONDUCTOR', 'A late municipal clearance. I can give you the carriage ledger, not a story about why it came through.', conductor(5), 'restrained-defiance'),
    replies: Object.freeze([
      Object.freeze({ cue: line('BUTCH', 'A message can be true and still withhold most of the truth. The second line is the part she expected me to restore.', butch(193), 'pained-certainty'), holdsBoth: true, reaction: 'rage' }),
      Object.freeze({ cue: line('BUTCH', 'You are asking me to accept records from the same city.', butch(123), 'prosecutorial-anger'), holdsBoth: false, rebut: line('CONDUCTOR', 'Official inquiry? Then make it brief. This service is leaving.', conductor(8), 'hostile-dismissal') }),
    ]),
  }),
  Object.freeze({
    id: 'eastbound',
    claim: line('CONDUCTOR', 'Eastbound. That is all I can say before this door closes. Station staff keep the fuller record.', conductor(7), 'dismissive'),
    replies: Object.freeze([
      Object.freeze({ cue: line('BUTCH', 'Someone could have forced her to perform the whole route alone.', butch(167), 'uncertain-grief'), holdsBoth: false, rebut: line('CONDUCTOR', 'Not in my carriage. Station staff keep their own records.', conductor(2), 'cold-deflection') }),
      Object.freeze({ cue: line('BUTCH', 'Mara was alive when she prepared this route. She left by choice. Those are facts. Her reason is still unknown.', butch(182), 'grief-into-certainty'), holdsBoth: true, reaction: 'shame' }),
    ]),
  }),
  Object.freeze({
    id: 'own-records',
    claim: line('CONDUCTOR', 'Not in my carriage. Station staff keep their own records.', conductor(2), 'cold-deflection'),
    replies: Object.freeze([
      Object.freeze({ cue: line('BUTCH', 'I do not know how to stop looking yet. That may be my problem, not hers.', butch(152), 'open-grief'), holdsBoth: true, reaction: 'shame' }),
      Object.freeze({ cue: line('BUTCH', 'No. Personal. Mara disappeared. Echo City is the first place anyone saw her afterward.', butch(226), 'controlled-anger'), holdsBoth: false, rebut: line('CONDUCTOR', 'Clear of the door.', conductor(4), 'curt-correction') }),
    ]),
  }),
  Object.freeze({
    id: 'brief',
    claim: line('CONDUCTOR', 'Official inquiry? Then make it brief. This service is leaving.', conductor(8), 'hostile-dismissal'),
    replies: Object.freeze([
      Object.freeze({ cue: line('BUTCH', 'And now she is gone.', butch(54), 'grief'), holdsBoth: false, rebut: line('CONDUCTOR', 'Stand back, please.', conductor(3), 'cold-refusal') }),
      Object.freeze({ cue: line('BUTCH', 'If I continue, I need to know whether I am checking that she is safe or refusing to accept that she left. Those are not the same investigation.', butch(206), 'pained-certainty'), holdsBoth: true, reaction: 'rage' }),
    ]),
  }),
]);

// Every voice file the argument can play (for the preload profile and tests).
export const ECHO_VOICE_URLS = Object.freeze([...new Set(ECHO_EXCHANGES.flatMap((exchange) => [
  exchange.claim.url,
  ...exchange.replies.flatMap((reply) => [reply.cue.url, reply.rebut?.url].filter(Boolean)),
]))]);
