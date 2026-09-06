// Engine-neutral evidence records. The punched ticket from Chapter 1 is the
// central unclassified object; every later record interprets the same number.

export const PUNCHED_NUMBER = 'A-1017';

export function createEvidenceRecord({ id, source, punchedNumber, proves, cannotProve }) {
  if (!id || !source) throw new Error('evidence record requires id and source');
  return Object.freeze({
    id,
    source,
    punchedNumber: punchedNumber ?? null,
    proves: proves ?? '',
    cannotProve: cannotProve ?? '',
  });
}

export function createPunchedTicket() {
  return createEvidenceRecord({
    id: 'punched-ticket',
    source: 'Chapter 1 — admission punch',
    punchedNumber: PUNCHED_NUMBER,
    proves: 'A ticket bearing this number existed on the night of October 17.',
    cannotProve: 'Who carried it, or why.',
  });
}

export function createHandoffRecord() {
  return createEvidenceRecord({
    id: 'manual-handoff',
    source: 'Echo City — service window clerk log',
    punchedNumber: PUNCHED_NUMBER,
    proves: 'A manual handoff bearing the same punched number was logged outside camera coverage.',
    cannotProve: 'Whether the handoff was help, abandonment, or accident.',
  });
}
