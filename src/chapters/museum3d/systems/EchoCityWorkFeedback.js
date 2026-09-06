export const ECHO_WORK_STEPS = Object.freeze([
  Object.freeze({ id: 'power', label: 'POWER', complete: (r) => r.stationLampOn === true }),
  Object.freeze({ id: 'market', label: 'MARKET', complete: (r) => r.marketShuttersLocked === true }),
  Object.freeze({ id: 'fountain', label: 'PUMP', complete: (r) => r.fountainCirculationRestored === true }),
  Object.freeze({ id: 'archive', label: 'LEDGER', complete: (r) => r.archiveLedgerReturned === true }),
  Object.freeze({ id: 'badge', label: 'BADGE', complete: (r) => r.nightBadgeClaimed === true }),
]);

function nextPhysicalAction(record) {
  if (!record.stationLampOn) return record.stationPanelOpened ? 'SWITCH NIGHT POWER' : 'OPEN BREAKER COVER';
  if (!record.marketShuttersLocked) return record.marketPawlReleased ? 'DRAW CANVAS CURTAINS' : 'RELEASE WINCH PAWL';
  if (!record.fountainCirculationRestored) return record.fountainGrateCleared ? 'START CIRCULATION' : 'CLEAR PUMP GRATE';
  if (!record.archiveLedgerReturned) return record.archiveSlotUnlocked ? 'INSERT PUBLIC-WORKS LEDGER' : 'UNLOCK RETURN SLOT';
  if (!record.nightBadgeClaimed) return 'TAKE NIGHT-SERVICE BADGE';
  return 'RETURN TO THE MUSEUM';
}

export function getEchoWorkFeedback(record = {}, active = false) {
  const visible = active && record.nightKitTaken === true;
  const firstOpen = ECHO_WORK_STEPS.findIndex((step) => !step.complete(record));
  const currentIndex = firstOpen < 0 ? ECHO_WORK_STEPS.length : firstOpen;
  return {
    visible,
    held: !visible ? null : record.nightBadgeClaimed ? 'badge' : 'kit',
    currentIndex,
    complete: currentIndex === ECHO_WORK_STEPS.length,
    nextAction: visible ? nextPhysicalAction(record) : null,
    steps: ECHO_WORK_STEPS.map((step, index) => ({
      id: step.id,
      label: step.label,
      state: step.complete(record) ? 'done' : index === currentIndex ? 'current' : 'future',
    })),
  };
}
