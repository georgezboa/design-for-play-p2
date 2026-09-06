// Route-based radio conversations for Echo City's municipal night round.
// These are deliberately ordinary, practical exchanges. They give the walk a
// human companion without turning the chapter back into an investigation.

export const ECHO_RADIO_BEATS = Object.freeze([
  Object.freeze({
    id: 'receiver-check',
    anchor: Object.freeze({ x: -2.8, z: 41.7 }),
    radius: 7,
    available: (record) => record.nightKitTaken && !record.stationLampOn,
    lead: Object.freeze([
      Object.freeze({ speaker: 'ARCHIVIST', text: 'Before you go, can you hear me over the transformer hum?' }),
    ]),
    prompt: 'How does the receiver sound?',
    options: Object.freeze([
      Object.freeze({
        label: 'Loud and clear. The left channel clicks.',
        lines: Object.freeze([
          Object.freeze({ speaker: 'BUTCH', text: 'Loud and clear. The left channel clicks.' }),
          Object.freeze({ speaker: 'ARCHIVIST', text: 'It is a borrowed receiver. If it gets worse, use the spare earpiece in the side pocket.' }),
        ]),
      }),
      Object.freeze({
        label: 'It smells like a coat closet.',
        lines: Object.freeze([
          Object.freeze({ speaker: 'BUTCH', text: 'I can hear you. The earpiece smells like a coat closet.' }),
          Object.freeze({ speaker: 'ARCHIVIST', text: 'That is where the museum stored it. I cleaned the part that touches your ear.' }),
        ]),
      }),
    ]),
    silenceLines: Object.freeze([
      Object.freeze({ speaker: 'ARCHIVIST', text: 'No answer usually means it works. Tap the receiver once if it cuts out.' }),
    ]),
  }),
  Object.freeze({
    id: 'market-small-talk',
    anchor: Object.freeze({ x: -26.5, z: 7.0 }),
    radius: 10,
    available: (record) => record.stationLampOn && !record.marketShuttersLocked,
    lead: Object.freeze([
      Object.freeze({ speaker: 'ARCHIVIST', text: 'The curtain winch sticks in damp weather. Do not force it past the stop.' }),
    ]),
    prompt: 'Reply?',
    options: Object.freeze([
      Object.freeze({
        label: 'How do you know?',
        lines: Object.freeze([
          Object.freeze({ speaker: 'BUTCH', text: 'How do you know?' }),
          Object.freeze({ speaker: 'ARCHIVIST', text: 'Three repair tickets from the same stall. The last attendant underlined “do not force.”' }),
        ]),
      }),
      Object.freeze({
        label: 'The vendor could fix it.',
        lines: Object.freeze([
          Object.freeze({ speaker: 'BUTCH', text: 'The vendor could fix it.' }),
          Object.freeze({ speaker: 'ARCHIVIST', text: 'She asked the city twice. Procurement closed both requests.' }),
        ]),
      }),
    ]),
    silenceLines: Object.freeze([
      Object.freeze({ speaker: 'ARCHIVIST', text: 'Stop when the canvas edges meet. The old handle can keep its dignity.' }),
    ]),
  }),
  Object.freeze({
    id: 'fountain-small-talk',
    anchor: Object.freeze({ x: 28.0, z: 6.6 }),
    radius: 10,
    available: (record) => record.marketShuttersLocked && !record.fountainCirculationRestored,
    lead: Object.freeze([
      Object.freeze({ speaker: 'ARCHIVIST', text: 'Check the basin before you start the pump. Anything caught in the grate?' }),
    ]),
    prompt: 'What is in the grate?',
    options: Object.freeze([
      Object.freeze({
        label: 'A paper cup and two coins.',
        lines: Object.freeze([
          Object.freeze({ speaker: 'BUTCH', text: 'A paper cup and two coins.' }),
          Object.freeze({ speaker: 'ARCHIVIST', text: 'Take out the cup. Leave the coins. Maintenance stopped arguing about those in 1987.' }),
        ]),
      }),
      Object.freeze({
        label: 'Only wet leaves.',
        lines: Object.freeze([
          Object.freeze({ speaker: 'BUTCH', text: 'Only wet leaves.' }),
          Object.freeze({ speaker: 'ARCHIVIST', text: 'Then the filter can take it. Your gloves will smell like the fountain either way.' }),
        ]),
      }),
    ]),
    silenceLines: Object.freeze([
      Object.freeze({ speaker: 'ARCHIVIST', text: 'If the grate is clear, start it. Do not put your hand under the impeller.' }),
    ]),
  }),
  Object.freeze({
    id: 'archive-small-talk',
    anchor: Object.freeze({ x: -9.8, z: -21.5 }),
    radius: 10,
    available: (record) => record.fountainCirculationRestored && !record.nightBadgeClaimed,
    lead: Object.freeze([
      Object.freeze({ speaker: 'ARCHIVIST', text: 'Keep the ledger flat. The binding was repaired last winter.' }),
    ]),
    prompt: 'Reply?',
    options: Object.freeze([
      Object.freeze({
        label: 'It is heavier than it looks.',
        lines: Object.freeze([
          Object.freeze({ speaker: 'BUTCH', text: 'It is heavier than it looks.' }),
          Object.freeze({ speaker: 'ARCHIVIST', text: 'Public works used thick paper. They expected the records to outlive the pipes.' }),
        ]),
      }),
      Object.freeze({
        label: 'Someone wrote a grocery list in it.',
        lines: Object.freeze([
          Object.freeze({ speaker: 'BUTCH', text: 'Someone wrote a grocery list in the margin.' }),
          Object.freeze({ speaker: 'ARCHIVIST', text: 'Night staff used whatever paper was in front of them. Do not erase it.' }),
        ]),
      }),
    ]),
    silenceLines: Object.freeze([
      Object.freeze({ speaker: 'ARCHIVIST', text: 'Both hands, please. The corner already came off once.' }),
    ]),
  }),
  Object.freeze({
    id: 'station-small-talk',
    anchor: Object.freeze({ x: -6.5, z: 26 }),
    radius: 9,
    available: (record) => record.nightKitTaken && !record.stationLampOn,
    lead: Object.freeze([
      Object.freeze({ speaker: 'ARCHIVIST', text: 'The station lamp takes twenty seconds to warm. If it flickers once, leave it alone.' }),
    ]),
    prompt: 'Reply?',
    options: Object.freeze([
      Object.freeze({
        label: 'Did anyone wait here this late?',
        lines: Object.freeze([
          Object.freeze({ speaker: 'BUTCH', text: 'Did anyone wait here this late?' }),
          Object.freeze({ speaker: 'ARCHIVIST', text: 'Two cleaners and a bakery driver, most nights. The car was often late; the schedule still mattered.' }),
        ]),
      }),
      Object.freeze({
        label: 'The bench paint is still tacky.',
        lines: Object.freeze([
          Object.freeze({ speaker: 'BUTCH', text: 'The bench paint is still tacky.' }),
          Object.freeze({ speaker: 'ARCHIVIST', text: 'Then use the other end. The city has been repainting that bench since before Mara crossed.' }),
        ]),
      }),
    ]),
    silenceLines: Object.freeze([
      Object.freeze({ speaker: 'ARCHIVIST', text: 'Give the lamp time. Old fluorescent tubes dislike being watched.' }),
    ]),
  }),
  Object.freeze({
    id: 'walk-home',
    anchor: Object.freeze({ x: -2.5, z: 38.5 }),
    radius: 8,
    available: (record) => record.recordFiled,
    lead: Object.freeze([
      Object.freeze({ speaker: 'ARCHIVIST', text: 'Do you want the receiver off for the walk back?' }),
    ]),
    prompt: 'Keep the line open?',
    options: Object.freeze([
      Object.freeze({
        label: 'Leave it on.',
        lines: Object.freeze([
          Object.freeze({ speaker: 'BUTCH', text: 'Leave it on.' }),
          Object.freeze({ speaker: 'ARCHIVIST', text: 'All right. I can stay on the line. You do not have to report anything.' }),
        ]),
      }),
      Object.freeze({
        label: 'Give me a minute of quiet.',
        lines: Object.freeze([
          Object.freeze({ speaker: 'BUTCH', text: 'Give me a minute of quiet.' }),
          Object.freeze({ speaker: 'ARCHIVIST', text: 'Of course. The door lights will lead you back.' }),
        ]),
      }),
    ]),
    silenceLines: Object.freeze([
      Object.freeze({ speaker: 'ARCHIVIST', text: 'I will leave the channel open. No need to answer.' }),
    ]),
  }),
]);

export function findEchoRadioBeat({ x, z, record, triggered }) {
  return ECHO_RADIO_BEATS.find((beat) => {
    if (triggered.has(beat.id) || !beat.available(record)) return false;
    return Math.hypot(x - beat.anchor.x, z - beat.anchor.z) <= beat.radius;
  }) ?? null;
}

export class EchoRadioChatter {
  constructor({ dialogue, audioGuide }) {
    this.dialogue = dialogue;
    this.audioGuide = audioGuide;
    this.triggered = new Set();
  }

  update({ x, z, record }) {
    if (this.dialogue.isPlaying) return null;
    const beat = findEchoRadioBeat({ x, z, record, triggered: this.triggered });
    if (!beat) return null;
    this.triggered.add(beat.id);
    this.audioGuide.receiverClick();
    this.dialogue.play(beat.lead, {
      onComplete: () => this.dialogue.offerChoice({
        prompt: beat.prompt,
        options: beat.options,
        silenceLines: beat.silenceLines,
        timeout: 12,
      }),
    });
    return beat.id;
  }

  getSnapshot() {
    return { triggered: [...this.triggered] };
  }
}
