export const HOTEL_GUEST_DIALOGUE = Object.freeze({
  irena: [
    { speaker: 'BUTCH', text: 'Hana says you were here when the woman in room six checked in.' },
    { speaker: 'IRENA', text: 'I was. She arrived alone, paid for one person and carried her own case. Hana left the name blank. She has done that for people since before I worked at the pharmacy.' },
    { speaker: 'BUTCH', text: 'Would you recognize this bottle?' },
    { speaker: 'IRENA', text: 'Common cleaning solvent. Three pharmacies sell it. It tells you someone cleaned metal, not who, and not where.' },
  ],
  vesna: [
    { speaker: 'BUTCH', text: 'Did Hana make a special arrangement for the woman in room six?' },
    { speaker: 'VESNA', text: 'Special? No. Hana leaves a name out when writing it down would cause more trouble than the room is worth. Debt collectors, angry relatives, employers. She still records the room and takes the key back.' },
    { speaker: 'BUTCH', text: 'Did you see anyone visit room six?' },
    { speaker: 'VESNA', text: 'No. My husband complains about every footstep on those stairs. He complained once when she went up, once when she came down for water.' },
  ],
});

export const DARO_OPENING = Object.freeze([
  { speaker: 'DARO', text: 'Hana says you want the window, not a story. Good. Stand here. If you move left, the roof blocks the square.' },
]);

export const DARO_RESPONSES = Object.freeze({
  'daro-position': [
    { speaker: 'BUTCH', text: 'Where were you standing when you saw her?' },
    { speaker: 'DARO', text: 'At this pane, fastening the shutter. The hotel door is clear. The south half of the square is clear. The station road disappears behind the bakery for about twenty metres.' },
    { speaker: 'LEV', text: 'So there is a blind interval.' },
    { speaker: 'DARO', text: 'Yes. I will not sell you what I could not see.' },
  ],
  'daro-sequence': [
    { speaker: 'BUTCH', text: 'Tell it in order. Only what you saw.' },
    { speaker: 'DARO', text: 'She left this door alone. She crossed to the square alone. She stopped near the clock, knelt briefly, then took the station road. When she came out beyond the bakery, she was still alone.' },
    { speaker: 'BUTCH', text: 'Did she hand anything to anyone?' },
    { speaker: 'DARO', text: 'No. Both hands stayed on the case until she knelt.' },
  ],
  'daro-limits': [
    { speaker: 'BUTCH', text: 'Could someone have followed through the blind section?' },
    { speaker: 'DARO', text: 'They could enter it. They would have to come out. Nobody did before she reached the station awning.' },
    { speaker: 'LEV', text: 'And after the awning?' },
    { speaker: 'DARO', text: 'I lose the platform there. Ask the station what happened next.' },
  ],
});

export const DARO_BLOCKED = Object.freeze([
  { speaker: 'LEV', text: 'Fix his position, the sequence he observed, and the blind part of the route. Otherwise we will turn a limited view into certainty.' },
]);

export const DARO_CONCLUSION = Object.freeze([
  { speaker: 'BUTCH', text: 'From this window: she left alone, crossed the square alone, and reached the station road alone.' },
  { speaker: 'DARO', text: 'That is what I can sign.' },
  { speaker: 'LEV', text: 'Then we have enough to test the whole case without inventing a meeting.' },
]);

export function daroMenu(asked = []) {
  const choices = [];
  if (!asked.includes('position')) choices.push({ id: 'daro-position', label: 'Establish Daro’s exact position and sightline.' });
  if (!asked.includes('sequence')) choices.push({ id: 'daro-sequence', label: 'Have him describe Mara’s route in order.' });
  if (!asked.includes('limits')) choices.push({ id: 'daro-limits', label: 'Ask what the window could not show.' });
  choices.push({ id: 'daro-done', label: 'Record only what the sightline proves. (Continue)' });
  return { speaker: 'CHOOSE', text: 'Test the window account.', choices };
}

export const EVIDENCE_TABLE_OPENING = Object.freeze([
  { speaker: 'LEV', text: 'Put every action on the table. We are not asking whether people behaved well. We are asking whether they shared Mara’s plan.' },
  { speaker: 'BUTCH', text: 'Everyone made the trail harder to follow.' },
  { speaker: 'LEV', text: 'Yes. That is why each theory deserves a proper test.' },
]);

export const FINAL_THEORY_RESPONSES = Object.freeze({
  'final-market-help': [
    { speaker: 'BUTCH', text: 'Eda removed the name. Olek hid the delivery. The market helped her disappear.' },
    { speaker: 'LEV', text: 'Look at Eda’s counter copy. It records the oil and the collection, but no destination. Olek’s job began only after that copy entered the system.', evidenceDocument: 'issue-copy' },
    { speaker: 'LEV', text: 'Eda did not know the destination. Olek did not know the retired code. Two private favours, no shared plan.' },
  ],
  'final-municipal-cover': [
    { speaker: 'BUTCH', text: 'Sava left the code uncorrected. Nika destroyed a print. Petar cut the branch. The city covered the message.' },
    { speaker: 'LEV', text: 'Put C-441 beside the office times. Read the order itself: isolate the lower branch, clean the groove, preserve the main feed. No message is mentioned.', evidenceDocument: 'order-c441' },
    { speaker: 'LEV', text: 'The system issued it before Sava reviewed the sale. Nika printed later. Their actions aligned, but their information did not.' },
  ],
  'final-petar-destroyed': [
    { speaker: 'BUTCH', text: 'Petar knew enough to destroy the second line and lied about the rest.' },
    { speaker: 'LEV', text: 'Look at the route drawing. Petar’s work is below the paving; Bosko sees Mara measuring above it after Petar goes underground.', evidenceDocument: 'oil-route' },
    { speaker: 'LEV', text: 'His cutter made the break, but the order identified only a branch. The exposed ends were lifted into place after he says he left.' },
  ],
  'final-lev-controlled': [
    { speaker: 'BUTCH', text: 'You found me, guided the route and supplied the records. You could have controlled what I saw.' },
    { speaker: 'LEV', text: 'Fair. Remove my account. Read the hotel notes without me: Hana records one guest, and Daro sees Mara cross the square and take the station road alone.', evidenceDocument: 'witness-notes' },
    { speaker: 'LEV', text: 'The conductor and Bosko still place her alone. Eda’s copy and Petar’s tool marks still exist. If my account vanishes, the same sequence remains.' },
  ],
  'final-mara-coerced': [
    { speaker: 'BUTCH', text: 'Someone could have forced her to perform the whole route alone.' },
    { speaker: 'LEV', text: 'Look at the original reservation. One passenger, eastbound, entered before the later corrections. It proves direction, not freedom. But it names no watcher or second traveller.', evidenceDocument: 'reservation' },
    { speaker: 'LEV', text: 'Coercion remains possible in the abstract. We have no hand-off, threat or controlled payment. It explains any action if we require no evidence for it, so it cannot be our conclusion.' },
    { speaker: 'BUTCH', text: 'It also cannot be ruled out forever.' },
    { speaker: 'LEV', text: 'Correct. We record what is unsupported, not what is impossible.' },
  ],
});

export const FINAL_THEORY_BLOCKED = Object.freeze([
  { speaker: 'LEV', text: 'Test all five: market help, municipal cover, Petar’s intent, my role, and coercion. Leaving one untouched would make the final conclusion convenient rather than earned.' },
]);

export const EVIDENCE_TABLE_CONCLUSION = Object.freeze([
  { speaker: 'BUTCH', text: 'Each person made one choice that protected themselves or protected her. None of them knew enough to organize the result.' },
  { speaker: 'LEV', text: 'And every transfer worked because the next person needed only one instruction.' },
  { speaker: 'BUTCH', text: 'Mara was the only one who knew the sale, the delivery, the old code, the branch, the hotel and the train.' },
  { speaker: 'LEV', text: 'That is the minimum conclusion supported by all the records.' },
  { speaker: 'BUTCH', text: 'It does not tell me what she wanted to say.' },
  { speaker: 'LEV', text: 'No. It only tells you she arranged to say something. Get some sleep. I will bring the original reservation in the morning.' },
]);

export function finalTheoryMenu(tested = []) {
  const choices = [];
  const labels = {
    'market-help': 'Eda and Olek knowingly helped Mara disappear.',
    'municipal-cover': 'The city offices coordinated a cover-up.',
    'petar-destroyed': 'Petar knowingly destroyed Mara’s message.',
    'lev-controlled': 'Lev controlled the investigation from the start.',
    'mara-coerced': 'Mara performed the route under coercion.',
  };
  for (const [id, label] of Object.entries(labels)) if (!tested.includes(id)) choices.push({ id: `final-${id}`, label });
  choices.push({ id: 'final-done', label: 'State the only explanation that survives. (Continue)' });
  return { speaker: 'CHOOSE', text: 'Test the remaining explanation.', choices };
}

export const SLEEP_DIALOGUE = Object.freeze([
  { speaker: 'NARRATION', text: 'Lev leaves the records in three piles: known, unsupported, and still testable. Butch lies down without undressing.' },
  { speaker: 'BUTCH', text: 'The next train is in the morning. Nothing useful happens before morning.' },
  { speaker: 'NARRATION', text: 'Hours later, light moves across the ceiling. Then comes the smell of lamp oil.' },
]);

// Butch surfaces from the nightmare into a room that is much darker than the
// one he fell asleep in. He talks himself into checking the street before the
// hotel-night interactions unlock.
export const NIGHT_WAKE_DIALOGUE = Object.freeze([
  { speaker: 'BUTCH', text: 'The lamp is out. The wick is still warm.' },
  { speaker: 'BUTCH', text: 'A dream, then. Paving grooves, fire, my name in the old feed channel.' },
  { speaker: 'BUTCH', text: 'No dream I have ever kept smelled of lamp oil.' },
  { speaker: 'BUTCH', text: 'It felt assembled. Like the records. Like someone wanted me to stand in that exact spot.' },
  { speaker: 'BUTCH', text: 'If the square is really burning, the street will say so. Get up. Look.' },
]);

export const NIGHT_FIRST_LINE = Object.freeze([
  { speaker: 'BUTCH', text: 'The first row is burning in the old paving grooves.' },
  { speaker: 'GROUND LETTERS', text: 'BUTCH, I’M ALIVE.' },
  { speaker: 'BUTCH', text: 'Not a public announcement. My name. A statement chosen because I would eventually stand here.' },
  { speaker: 'BUTCH', text: 'The lower row is dark. The cut ends are beside it, exactly where they were at dusk.' },
]);

export const NIGHT_ATTITUDE_RESPONSES = Object.freeze({
  'night-relief': [
    { speaker: 'BUTCH', text: 'Alive. Start with that. Do not turn relief into an answer it has not earned.' },
  ],
  'night-anger': [
    { speaker: 'BUTCH', text: 'She knew I would follow. She could have written more. Anger does not change what the disconnected line is for.' },
  ],
  'night-caution': [
    { speaker: 'BUTCH', text: 'A message can be true and still withhold most of the truth. The second line is the part she expected me to restore.' },
  ],
});

export const NIGHT_RECONNECT = Object.freeze([
  { speaker: 'BUTCH', text: 'Both ends overlap by a hand width. The old clamp is open.' },
  { speaker: 'BUTCH', text: 'Press the lower feed into the clamp.' },
]);

export const NIGHT_SECOND_LINE = Object.freeze([
  { speaker: '', text: '', nightIgnition: true },
  { speaker: 'GROUND LETTERS', text: 'I LEFT BY CHOICE.' },
  { speaker: 'BUTCH', text: 'Read it exactly. She left by choice. That does not mean every later circumstance was safe, and it does not explain why she left.' },
  { speaker: 'BUTCH', text: 'The first line tells me she was alive when she prepared this. The second says no one forced her onto that eastbound route.' },
  { speaker: 'BUTCH', text: 'She did not ask to be rescued. She also did not tell me never to look for her. The message leaves that question with me because she knew I would reach the broken feed.' },
  { speaker: 'BUTCH', text: 'Eda changed one name. Olek hid one delivery. Sava kept one shortcut. Nika destroyed one print. Hana left one line blank. Petar followed one order.' },
  { speaker: 'BUTCH', text: 'None of them needed the whole plan. Mara did. She arranged their separate decisions into one route and left the final physical action to me.' },
  { speaker: 'BUTCH', text: 'That is deliberate. It may be trust. It may be manipulation. The fire cannot distinguish between them.' },
  { speaker: 'BUTCH', text: 'Tomorrow I can verify the clamp, the scorch marks and the eastbound reservation. I cannot manufacture her reason from those objects.' },
  { speaker: 'BUTCH', text: 'If I continue, I need to know whether I am checking that she is safe or refusing to accept that she left. Those are not the same investigation.' },
  { speaker: 'NARRATION', text: 'Both lines continue burning. Wind pushes the flames in one direction, but neither sentence breaks.' },
]);

export const HANA_BREAKFAST = Object.freeze([
  { speaker: 'BUTCH', text: 'When you left Mara out of the book, did she tell you where she was going?' },
  { speaker: 'HANA', text: 'No. She asked for a room and privacy. I provided both. I did not become her confidante.' },
  { speaker: 'BUTCH', text: 'Would you make the same choice again?' },
  { speaker: 'HANA', text: 'For someone hiding from violence, yes. For someone hiding from a debt, probably. The difficulty is that people rarely tell the desk which kind they are.' },
]);

export const MORNING_LEV_GREETING = Object.freeze([
  { speaker: 'LEV', text: 'Morning. Nika found the original reservation in the closed batch. She will release it if you sign the receipt before the station shift changes.' },
  { speaker: 'BUTCH', text: 'So we go back to the ministry.' },
  { speaker: 'LEV', text: 'We collect one document, then take the central route to the eastbound platform. I am coming with you.' },
]);

export const MORNING_LEV_REMINDER = Object.freeze([
  { speaker: 'LEV', text: 'Nika is holding the original at the ministry entrance. After that, the central route is the shortest way to the eastbound platform.' },
  { speaker: 'LEV', text: 'Go ahead. I am right behind you.' },
]);

export const MORNING_RESERVATION_DIALOGUE = Object.freeze([
  { speaker: 'NIKA', text: 'Original reservation, closed batch fourteen. Sign here to confirm I released the paper, not the passenger record.' },
  { speaker: 'BUTCH', text: 'Why did the public copy only say M. Venn?' },
  { speaker: 'NIKA', text: 'The public terminal shortens handwritten names when the surname field is corrected. It is old software, not a secret code.' },
  { speaker: 'LEV', text: 'The original names Mara Venn and marks the eastbound service. We have what we came for.' },
  { speaker: 'NIKA', text: 'Then take it. The station stops amending the paper record at seven. Boarding continues after that.' },
  { speaker: 'LEV', text: 'The sun clears the tunnel ridge around half past six. There is an old inspection path above the west cutting.' },
  { speaker: 'BUTCH', text: 'You are suggesting sightseeing.' },
  { speaker: 'LEV', text: 'I am suggesting five minutes in which nobody asks either of us a question.' },
]);

export const MORNING_LEV_OVERLOOK_REMINDER = Object.freeze([
  { speaker: 'LEV', text: 'The old inspection path starts on the west side of the tunnel cutting. It is a timber service walk fixed to the rock. The boards still hold.' },
  { speaker: 'LEV', text: 'We have time to sit before we take the central route to the platform.' },
]);

export const MORNING_LEV_PLATFORM_REMINDER = Object.freeze([
  { speaker: 'LEV', text: 'The central route is the shortest way back to the eastbound platform.' },
  { speaker: 'LEV', text: 'Go ahead. I will follow.' },
]);

export const SUNRISE_BENCH_DIALOGUE = Object.freeze([
  { speaker: 'BUTCH', text: 'Do you come up here often?' },
  { speaker: 'LEV', text: 'When the first train is late.' },
  { speaker: 'BUTCH', text: 'Is it late today?' },
  { speaker: 'LEV', text: 'No.' },
  { speaker: 'BUTCH', text: 'All right.' },
]);

export const MORNING_FIRE_INTERRUPTION = Object.freeze([
  { speaker: 'BUTCH', text: 'Stop. Those marks cross the route.' },
  { speaker: 'LEV', text: 'Two rows, not one. And the feed is still in the clamp.' },
  { speaker: 'BUTCH', text: 'Let me check it properly.' },
]);

export const ALLEY_RESIDENT_DIALOGUE = Object.freeze([
  { speaker: 'WOMAN BY THE HEAT GRATE', text: 'If you are looking for the shelter office, it opens after eight. If you are not, mind the blanket.' },
  { speaker: 'BUTCH', text: 'I will mind it.' },
]);

export const ALLEY_MEN_DIALOGUE = Object.freeze([
  { speaker: 'MAN IN THE BROWN COAT', text: 'The lane is public. The crate is ours. Walk around it and nobody has to explain anything.' },
  { speaker: 'BUTCH', text: 'What is in the crate?' },
  { speaker: 'SECOND MAN', text: 'Empty bottles going back to the hotel. They pay two coins each and ask no questions about where you slept.' },
  { speaker: 'LEV', text: 'They are not connected to our inquiry.' },
  { speaker: 'MAN IN THE BROWN COAT', text: 'That is the nicest thing an official has said about us this week.' },
]);

export const DAWN_CAMPFIRE_REMAINS_DIALOGUE = Object.freeze([
  { speaker: 'NARRATION', text: 'The fire has gone down to grey ash. A soot-black kettle sits beside five chipped cups; one still holds a finger of cold tea.' },
  { speaker: 'BUTCH', text: 'Someone had a good evening.' },
  { speaker: 'LEV', text: 'Several people. They cleaned up enough to return, but not enough to pretend they were never here.' },
]);

export const CAMPFIRE_SELINE_STONE_DIALOGUE = Object.freeze([
  { speaker: 'SELINE', text: 'You inspect strange things, do you not? I found this sewn into an unclaimed coat lining.' },
  { speaker: 'BUTCH', text: 'No name on the laundry ticket?' },
  { speaker: 'SELINE', text: 'No ticket. The stone hums whenever the evening tram passes. I would rather you take it.' },
  { speaker: 'BUTCH', text: 'Cold as the archive stacks. I will keep it out of the municipal ledger.' },
]);

export const CAMPFIRE_RADA_DIALOGUE = Object.freeze([
  { speaker: 'RADA', text: 'You can stand there, but if you want tea, come closer. The kettle does not throw very far.' },
  { speaker: 'BUTCH', text: 'What are you celebrating?' },
  { speaker: 'RADA', text: 'Nothing official. Seline finished her first paid week at the laundry, Miro found sugar, and nobody has been arrested. We decided that was enough.' },
  { speaker: 'MIRO', text: 'The sugar is mostly mine.' },
  { speaker: 'RADA', text: 'The spoon says otherwise.' },
]);

export const CAMPFIRE_MIRO_DIALOGUE = Object.freeze([
  { speaker: 'MIRO', text: 'Traveler, settle something. If a tram loses a wheel at noon and management files the report at four, when did the tram lose the wheel?' },
  { speaker: 'BUTCH', text: 'At noon.' },
  { speaker: 'MIRO', text: 'Wrong. According to management, nothing happens before the form exists.' },
  { speaker: 'SELINE', text: 'That joke was old when the tram still had its wheel.' },
]);

export const CAMPFIRE_SELINE_DIALOGUE = Object.freeze([
  { speaker: 'SELINE', text: 'Rada says this is a celebration. It is really an excuse to keep me from going back for another shift.' },
  { speaker: 'BUTCH', text: 'Will it work?' },
  { speaker: 'SELINE', text: 'Until the tea is gone. After that I become responsible again.' },
  { speaker: 'LEV', text: 'A limited but measurable intervention.' },
  { speaker: 'SELINE', text: 'Your friend talks like the noticeboard at the clinic.' },
]);

export const CAMPFIRE_KETTLE_DIALOGUE = Object.freeze([
  { speaker: 'NARRATION', text: 'A soot-black kettle trembles over the fire. Three chipped cups have become five by the simple method of sharing.' },
  { speaker: 'RADA', text: 'Clean cup on the brick. Mostly clean cup beside it. Choose according to your faith.' },
  { speaker: 'BUTCH', text: 'I will keep my faith untested.' },
]);

export const MORNING_EVIDENCE_RESPONSES = Object.freeze({
  'morning-scorch': [{ speaker: 'BUTCH', text: 'Two complete rows are burned into the same grooves. The lower line did ignite.' }],
  'morning-connector': [{ speaker: 'BUTCH', text: 'The feed remains pressed into the clamp. My thumbprint is in the soot beside it.' }],
  'morning-ash': [{ speaker: 'BUTCH', text: 'Dry black residue lifts onto my hand. This happened here. It was not confined to sleep.' }],
});

export const MORNING_EVIDENCE_BLOCKED = Object.freeze([
  { speaker: 'BUTCH', text: 'Before leaving: confirm both scorch lines, the reconnected feed and physical ash.' },
]);

export const MORNING_EVIDENCE_CONCLUSION = Object.freeze([
  { speaker: 'BUTCH', text: 'Mara was alive when she prepared this route. She left by choice. Those are facts. Her reason is still unknown.' },
  { speaker: 'NARRATION', text: 'Lev stands beside the burned grooves with the folded reservation form. The physical message and the travel record can now be compared.' },
]);

export function morningEvidenceMenu(observed = []) {
  const choices = [];
  if (!observed.includes('scorch')) choices.push({ id: 'morning-scorch', label: 'Compare both rows of scorch marks.' });
  if (!observed.includes('connector')) choices.push({ id: 'morning-connector', label: 'Inspect the feed pressed into the clamp.' });
  if (!observed.includes('ash')) choices.push({ id: 'morning-ash', label: 'Touch the loose ash at the edge.' });
  choices.push({ id: 'morning-done', label: 'Record what the morning evidence proves. (Continue)' });
  return { speaker: 'CHOOSE', text: 'Confirm the physical traces.', choices };
}

export const LEV_FINAL_OPENING = Object.freeze([
  { speaker: 'LEV', text: 'Nika found the original reservation sheet. The clerk wrote “Mara Venn” before the terminal shortened it to M. Venn.' },
  { speaker: 'BUTCH', text: 'Then the eastbound booking was hers.' },
  { speaker: 'LEV', text: 'It matches her route. Let us keep the rest equally exact.' },
]);

export const LEV_FINAL_RESPONSES = Object.freeze({
  'lev-final-message': [
    { speaker: 'BUTCH', text: 'The fire confirms she was alive and that leaving was her decision.' },
    { speaker: 'LEV', text: 'At the time she prepared it, yes. It does not tell us why, or whether her circumstances changed after the train.' },
  ],
  'lev-final-methods': [
    { speaker: 'BUTCH', text: 'She used everyone’s ordinary compromise without telling them the whole plan.' },
    { speaker: 'LEV', text: 'Eda protected a buyer, Olek protected cash work, Sava protected his shortcut, Nika protected Sava, Hana protected a guest, and Petar followed a maintenance order. Mara designed around those choices.' },
  ],
  'lev-final-eastbound': [
    { speaker: 'BUTCH', text: 'The original reservation, Daro’s route and the conductor’s account all point east.' },
    { speaker: 'LEV', text: 'That gives you a direction. It does not give you her permission.' },
  ],
});

export const LEV_FINAL_BLOCKED = Object.freeze([
  { speaker: 'LEV', text: 'Separate the message, the method, and the eastbound record. They answer three different questions.' },
]);

export const LEV_FINAL_CONCLUSION = Object.freeze([
  { speaker: 'BUTCH', text: 'She was alive. She chose to leave. She built the message alone and travelled east.' },
  { speaker: 'LEV', text: 'And you still do not know why she left.' },
  { speaker: 'BUTCH', text: 'No.' },
  { speaker: 'LEV', text: 'The train is here. Before you board, tell me what you believe you are doing.' },
]);

export function levFinalMenu(asked = []) {
  const choices = [];
  if (!asked.includes('message')) choices.push({ id: 'lev-final-message', label: 'State exactly what the fire message proves.' });
  if (!asked.includes('methods')) choices.push({ id: 'lev-final-methods', label: 'Explain how Mara used the city without accomplices.' });
  if (!asked.includes('eastbound')) choices.push({ id: 'lev-final-eastbound', label: 'Test the eastbound direction.' });
  choices.push({ id: 'lev-final-done', label: 'State the final timeline. (Continue)' });
  return { speaker: 'CHOOSE', text: 'Reconstruct the surviving timeline.', choices };
}

export const CONTINUATION_CHOICES = Object.freeze([
  { speaker: 'CHOOSE', text: 'Why continue?', choices: [
    { id: 'continue-need-reason', label: '“I need to know why she left.” (Continue)' },
    { id: 'continue-safety', label: '“Choice does not guarantee she is still safe.” (Continue)' },
    { id: 'continue-cannot-stop', label: '“I do not know how to stop looking yet.” (Continue)' },
  ] },
]);

export const CONTINUATION_RESPONSES = Object.freeze({
  'continue-need-reason': [
    { speaker: 'BUTCH', text: 'I need to know why she left. I can accept the answer if I hear it from her.' },
    { speaker: 'LEV', text: 'Then remember that an explanation is something she may refuse to give.' },
  ],
  'continue-safety': [
    { speaker: 'BUTCH', text: 'Choice does not guarantee she is still safe. The message is already a day old.' },
    { speaker: 'LEV', text: 'Concern is legitimate. It does not make every boundary temporary.' },
  ],
  'continue-cannot-stop': [
    { speaker: 'BUTCH', text: 'I do not know how to stop looking yet. That may be my problem, not hers.' },
    { speaker: 'LEV', text: 'Knowing whose problem it is will matter when you find her.' },
  ],
});

export const BOARDING_CONCLUSION = Object.freeze([
  { speaker: 'LEV', text: 'Eastbound. One change after the river junction. Keep the original copy.' },
  { speaker: 'BUTCH', text: 'Thank you for treating the facts as facts.' },
  { speaker: 'LEV', text: 'It is the least glamorous part of the job.' },
  { speaker: 'NARRATION', text: 'Butch boards alone. Lev remains on the platform.' },
]);
