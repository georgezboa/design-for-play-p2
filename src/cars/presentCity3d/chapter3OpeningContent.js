export const OPENING_POSITIONS = Object.freeze({
  playerStart: [-10.2, 0.5, 29.1],
  levStart: [-7.8, 0.5, 26.4],
  levArrivalTalk: [-7.6, 0.5, 27.0],
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
  olekApproach: [-19.8, 0.5, 0.2],
  cart: [-24.2, 0.5, -1.4],
  cartApproach: [-21.6, 0.5, -0.6],
  bottle: [-5.1, 0.54, -10.2],
  bottleApproach: [-3.4, 0.5, -8.6],
  // Final user-marked placement: the centre of the white X in the supplied
  // v28 screenshot, converted from screen pixels onto the y=0.5 ground plane.
  // Keep the v28 player/Lev staging fixed so camera follow cannot move the
  // marked screen-space destination out from under Toma.
  toma: [37.68, 0.5, -15.87],
  // The former approach point (28.27, -16.29) sits inside the Transport
  // Ministry collision footprint. Keep Butch on the open east pavement,
  // close enough that the handoff reads as a face-to-face conversation.
  transportApproach: [37.68, 0.5, -14.35],
  // Keep Lev in the same readable group as Butch and Toma without crossing
  // back into the ministry's padded facade footprint.
  levTransportExterior: [36.6, 0.5, -14.35],
  // Bosko works beside the north-east bench, well away from the two paving
  // rows he is about to point out on the south side of the clock.
  squareBosko: [17.8, 0.5, 8.2],
  squareBoskoApproach: [15.8, 0.5, 9.4],
  plazaGrooves: [7.4, 0.73, 17.2],
  plazaGroovesApproach: [6.6, 0.5, 13.8],
  archiveEntrance: [-18.0, 0.5, -10.7],
  archiveApproach: [-18.0, 0.5, -8.5],
  levArchiveExterior: [-15.7, 0.5, -8.3],
  cutInterface: [0.95, 0.78, 19.4],
  cutInterfaceApproach: [1.7, 0.5, 16.4],
});

export const ARRIVAL_DIALOGUE = Object.freeze([
  {
    speaker: 'CONDUCTOR',
    text: 'Echo City. Passengers leaving the train, please step onto the platform. Keep the doorway clear.',
  },
  { speaker: 'CONDUCTOR', text: 'Official inquiry? Then make it brief. This service is leaving.' },
  {
    speaker: 'BUTCH',
    text: 'No. Personal. Mara disappeared. Echo City is the first place anyone saw her afterward.',
  },
  { speaker: 'BUTCH', text: 'She left voluntarily, or somebody made it look that way. Either way, someone here remembers the route.' },
]);

export function arrivalObservationMenu(observations = []) {
  const seen = new Set(observations);
  return {
    speaker: 'CHOOSE',
    text: 'The train is still here. What else do you examine?',
    choices: [
      { id: 'arrival-route-board', label: 'Read the departure board and its cancellation marks.' },
      { id: 'arrival-gate-latch', label: 'Inspect the scuffed station gate latch.' },
      { id: 'arrival-infer', label: 'Put the two traces together. (Continue)' },
    ].filter((choice) => choice.id === 'arrival-infer' || !seen.has(choice.id.replace('arrival-', ''))),
  };
}

export const ARRIVAL_OBSERVATION_RESPONSES = Object.freeze({
  'arrival-route-board': [
    { speaker: 'BUTCH', text: 'The eastbound service was cancelled at 13:42, then restored by hand. Someone circled the replacement time in blue pencil.' },
    { speaker: 'PATTERN', text: 'A schedule is not a witness. But it tells you which question has a record behind it.' },
  ],
  'arrival-gate-latch': [
    { speaker: 'BUTCH', text: 'Fresh brass shows under the gate latch. It was lifted and set down repeatedly, not forced.' },
    { speaker: 'TENDERNESS', text: 'Someone waited here long enough to make a nervous habit of it.' },
  ],
});

export function arrivalInferenceMenu() {
  return {
    speaker: 'CHOOSE',
    text: 'Which lead do you trust first?',
    choices: [
      { id: 'arrival-pattern', label: 'PATTERN · Ask the conductor about the restored service.' },
      { id: 'arrival-tenderness', label: 'TENDERNESS · Ask who waited by the gate.' },
      { id: 'arrival-nerve', label: 'NERVE · Ask what left before the door closes.' },
    ],
  };
}

export const ARRIVAL_INFERENCE_RESPONSES = Object.freeze({
  'arrival-pattern': [
    { speaker: 'BUTCH', text: 'Why was the eastbound service restored after the cancellation?' },
    { speaker: 'CONDUCTOR', text: 'A late municipal clearance. I can give you the carriage ledger, not a story about why it came through.' },
  ],
  'arrival-tenderness': [
    { speaker: 'BUTCH', text: 'Who was waiting at this gate yesterday?' },
    { speaker: 'CONDUCTOR', text: 'People wait here every day. One woman kept looking east, then left when the replacement service arrived.' },
  ],
  'arrival-nerve': [
    { speaker: 'BUTCH', text: 'What left on the restored service, and where did it go?' },
    { speaker: 'CONDUCTOR', text: 'Eastbound. That is all I can say before this door closes. Station staff keep the fuller record.' },
  ],
});

export const ARRIVAL_DIALOGUE_LEGACY = Object.freeze([
  {
    speaker: 'PATTERN',
    text: 'Keep the photograph visible. A face is more useful here than another description written from memory.',
  },
  {
    speaker: 'NERVE',
    text: 'The door is closing. Decide what you can still learn before the train leaves.',
    choices: [
      { id: 'ask-conductor', label: 'Show the conductor Mara\'s photograph.' },
      { id: 'check-platform', label: 'Step off and check the platform carefully.' },
      { id: 'show-photograph', label: 'Step off with the photograph in your hand.' },
    ],
  },
]);

export const ARRIVAL_RESPONSES = Object.freeze({
  'ask-conductor': [
    { speaker: 'BUTCH', text: 'Have you seen this woman on the line?' },
    { speaker: 'CONDUCTOR', text: 'Not in my carriage. Station staff keep their own records.' },
    { speaker: 'CONDUCTOR', text: 'Stand back, please.' },
  ],
  'check-platform': [
    { speaker: 'BUTCH', text: 'No one waiting by the gate. No cyan scarf in the crowd.' },
    { speaker: 'PATTERN', text: 'Absence is not evidence that she was never here.' },
    { speaker: 'CONDUCTOR', text: 'Clear of the door.' },
  ],
  'show-photograph': [
    { speaker: 'BUTCH', text: 'If she came through here, somebody saw her.' },
    { speaker: 'NERVE', text: 'Let them see who you are looking for before they decide how much to say.' },
    { speaker: 'CONDUCTOR', text: 'Stand back, please.' },
  ],
});

export const LEV_INTRO_DIALOGUE = Object.freeze([
  { speaker: 'LEV', text: 'Keep the photograph out.' },
  { speaker: 'BUTCH', text: 'Why?' },
  { speaker: 'LEV', text: 'Because I saw that woman yesterday. Or someone close enough that I wrote down the time.' },
  { speaker: 'LEV', text: 'Lev Ardin. Civic Movement Investigation Office.' },
  {
    speaker: 'CHOOSE',
    text: 'What do you ask first?',
    choices: [
      { id: 'lev-where', label: 'Where did you see her? (Continue)' },
      { id: 'lev-certain', label: 'How certain are you? (Continue)' },
      { id: 'lev-stop-her', label: 'Why didn\'t you stop her? (Continue)' },
    ],
  },
]);

export const LEV_FIRST_RESPONSES = Object.freeze({
  'lev-where': [
    { speaker: 'BUTCH', text: 'Where did you see her?' },
    { speaker: 'LEV', text: 'Crossing from the market toward the central square. She carried two empty fuel cans.' },
  ],
  'lev-certain': [
    { speaker: 'BUTCH', text: 'How certain are you?' },
    { speaker: 'LEV', text: 'Certain enough to bring you to the place. Not certain enough to call a stranger Mara without showing you the evidence.' },
  ],
  'lev-stop-her': [
    { speaker: 'BUTCH', text: 'Why didn\'t you stop her?' },
    { speaker: 'LEV', text: 'An adult carrying empty cans is not grounds to stop anyone. I wrote down what I saw. That is why I can tell you now.' },
  ],
});

export function levTopicMenu(asked = []) {
  const seen = new Set(asked);
  return {
    speaker: 'CHOOSE',
    text: 'What do you ask Lev?',
    choices: [
      { id: 'lev-sighting', label: 'What exactly was Mara doing?' },
      { id: 'lev-oil', label: 'What happened in the square afterward?' },
      { id: 'lev-role', label: 'What do you want from me?' },
      { id: 'lev-now', label: 'What do we do now? (Continue)' },
    ].filter((choice) => choice.id === 'lev-now' || !seen.has(choice.id)),
  };
}

export const LEV_COMMON = Object.freeze([
  { speaker: 'LEV', text: 'She was alone. I saw no one meet her, follow her, or carry the cans for her.' },
  { speaker: 'BUTCH', text: 'And now she is gone.' },
  { speaker: 'LEV', text: 'Yes. Yesterday\'s eastbound train left before dawn. The next one is tomorrow morning.' },
]);

export const LEV_TOPIC_RESPONSES = Object.freeze({
  'lev-office': [
    { speaker: 'BUTCH', text: 'What does your office investigate?' },
    { speaker: 'LEV', text: 'Incidents that cross a station, a public road, or a municipal boundary. Usually something each department calls somebody else\'s responsibility.' },
    { speaker: 'BUTCH', text: 'Police work without the police?' },
    { speaker: 'LEV', text: 'Usually paperwork with better shoes.' },
  ],
  'lev-sighting': [
    { speaker: 'BUTCH', text: 'What exactly was she doing?' },
    { speaker: 'LEV', text: 'She crossed from the market with two empty cans, stopped twice to study the paving, then continued toward the square.' },
    { speaker: 'BUTCH', text: 'Did she look lost?' },
    { speaker: 'LEV', text: 'No. She checked the street names once. After that she moved like she had already chosen the route.' },
  ],
  'lev-oil': [
    { speaker: 'BUTCH', text: 'What else happened in the square?' },
    { speaker: 'LEV', text: 'Several shopkeepers reported lamp oil in the paving. There is a dark line between the station and the square.' },
    { speaker: 'BUTCH', text: 'Who signed the complaint?' },
    { speaker: 'LEV', text: 'Nobody. A signed sanitation complaint can make the reporting ward pay for cleanup.' },
  ],
  'lev-role': [
    { speaker: 'BUTCH', text: 'What do you want from me?' },
    { speaker: 'LEV', text: 'A witness account. After that, you may walk the scene with me if you choose.' },
    { speaker: 'BUTCH', text: 'You want me to investigate it?' },
    { speaker: 'LEV', text: 'No. I want you to look. Do not collect evidence, move objects, or question anyone without me present.' },
  ],
  'lev-now': [
    { speaker: 'BUTCH', text: 'What do we do now?' },
    { speaker: 'LEV', text: 'We start with the thing that will still be here in ten minutes. The oil.' },
  ],
});

export const WORLD_BRIEFING_DIALOGUE = Object.freeze([
  { speaker: 'LEV', text: 'The fountain is ahead. That is where I lost sight of her.' },
  { speaker: 'LEV', text: 'The market is northwest. It still sells lamp oil by measure. If the cans were filled here, the seller may remember her.' },
  { speaker: 'LEV', text: 'Transit owns the road while a vehicle is moving. Market Sanitation owns a spill. Civic Works owns damage to the paving.' },
  { speaker: 'BUTCH', text: 'Who owns it now?' },
  { speaker: 'LEV', text: 'That is what the three offices are discussing.' },
  { speaker: 'LEV', text: 'Here. Stay on this side of the joint.' },
]);

export const SEAM_DIALOGUE = Object.freeze([
  { speaker: 'LEV', text: 'Tell me what you can see before I tell you what I think.' },
]);

export function seamMenu(observed = [], testingAsked = false) {
  const seen = new Set(observed);
  return {
    speaker: 'CHOOSE',
    text: 'Inspect the oil line.',
    choices: [
      { id: 'seam-geometry', label: 'Follow the shape of the line.' },
      { id: 'seam-fuel', label: 'Check the smell without touching it.' },
      { id: 'seam-cleaning', label: 'Look at the pale marks along the edges.' },
      { id: 'seam-conclude', label: 'Give Lev your conclusion. (Continue)' },
    ].filter((choice) => {
      if (choice.id === 'seam-conclude') return true;
      if (choice.id === 'seam-testing') return !testingAsked;
      return !seen.has(choice.id.replace('seam-', ''));
    }),
  };
}

export const SEAM_TOPIC_RESPONSES = Object.freeze({
  'seam-geometry': [
    { speaker: 'BUTCH', text: 'It stays inside the mortar. At every corner it turns with the joint instead of crossing the stone.' },
    { speaker: 'PATTERN', text: 'A container could leak in a line. It would not choose every corner this carefully.' },
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
  'seam-testing': [
    { speaker: 'BUTCH', text: 'How will you test it?' },
    { speaker: 'LEV', text: 'One sample from the dark joint and one swab from the pale edge. Separate containers.' },
    { speaker: 'BUTCH', text: 'And until then?' },
    { speaker: 'LEV', text: 'We say what we observed and keep the interpretation separate.' },
  ],
});

export function seamInferenceMenu() {
  return {
    speaker: 'CHOOSE',
    text: 'What is your working conclusion?',
    choices: [
      { id: 'seam-deliberate', label: 'Someone placed it deliberately. (Continue)' },
      { id: 'seam-cart-leak', label: 'It could still be leaking from a cart. (Continue)' },
      { id: 'seam-reserve', label: 'I would rather reserve judgment. (Continue)' },
    ],
  };
}

export const SEAM_INFERENCE_RESPONSES = Object.freeze({
  'seam-deliberate': [
    { speaker: 'BUTCH', text: 'Someone placed it deliberately.' },
    { speaker: 'LEV', text: 'That is also my conclusion. The repeated turns are the strongest reason.' },
  ],
  'seam-cart-leak': [
    { speaker: 'BUTCH', text: 'It could still be leaking from a cart.' },
    { speaker: 'LEV', text: 'One straight section could. The repeated turns cannot, unless the cart stopped at every corner.' },
    { speaker: 'BUTCH', text: 'The cart may explain transport, not this pattern.' },
    { speaker: 'LEV', text: 'Exactly.' },
  ],
  'seam-reserve': [
    { speaker: 'BUTCH', text: 'I would rather reserve judgment.' },
    { speaker: 'LEV', text: 'Reasonable. I still need a working conclusion for the next interview. Mine is deliberate placement.' },
  ],
});

export const SEAM_CONCLUSION = Object.freeze([
  { speaker: 'PATTERN', text: 'The turns are evidence of a hand. The pale edge is evidence of an earlier cleanup. Keep those facts separate.' },
  { speaker: 'TENDERNESS', text: 'Someone worked here long enough to be afraid of what the street would remember.' },
  { speaker: 'NERVE', text: 'Ask Eda now. A careful question is still a question, and the market will not wait for certainty.' },
  { speaker: 'LEV', text: 'The visible section stops at the crossing. The last trace points toward the market.' },
  { speaker: 'BUTCH', text: 'We ask who sells it.' },
  { speaker: 'LEV', text: 'First the product, then the sale, then whoever moved it. We do not need a theory before we have those answers.' },
]);

export const EDA_OPENING = Object.freeze([
  { speaker: 'EDA', text: 'If this is about the smell, I already called Sanitation. They sent me a complaint form instead of a cleaner.' },
  { speaker: 'LEV', text: 'We are not here to assign the cleaning bill. We found lamp oil in the paving and need to identify the supply.' },
  {
    speaker: 'CHOOSE',
    text: 'How do you begin?',
    choices: [
      { id: 'eda-direct', label: 'Show her Mara\'s photograph and ask about the oil. (Continue)' },
      { id: 'eda-patient', label: 'Let her finish the crate, then ask about yesterday. (Continue)' },
      { id: 'eda-pressuring', label: 'Tell her the sales book will show it anyway. (Continue)' },
    ],
  },
]);

export const EDA_APPROACH_RESPONSES = Object.freeze({
  'eda-direct': [
    { speaker: 'BUTCH', text: 'This woman bought lamp oil here yesterday. I need to know how much and where it went.' },
    { speaker: 'EDA', text: 'You have put your conclusion before the question. Ask whether I saw her.' },
  ],
  'eda-patient': [
    { speaker: 'BUTCH', text: 'Finish the crate. Then I need to ask whether you saw this woman yesterday.' },
    { speaker: 'EDA', text: 'Thank you. The city usually asks questions while my hands are under something heavy.' },
  ],
  'eda-pressuring': [
    { speaker: 'BUTCH', text: 'A sale this large will be in the book. We can save time if you bring it out now.' },
    { speaker: 'EDA', text: 'You can save more time by not speaking to me as if I hid it.' },
    { speaker: 'LEV', text: 'He is not accusing you. I am asking for the record under a public safety inquiry.' },
    { speaker: 'EDA', text: 'Then ask for the record. Do not ask me to confess to keeping one.' },
  ],
});

export function edaTopicMenu(cooperation, asked = []) {
  const seen = new Set(asked);
  const choices = [
    { id: 'eda-order', label: 'What did Mara buy?' },
    { id: 'eda-collector', label: 'Who collected it?' },
    { id: 'eda-authorization', label: 'Why is her name missing from the copy?' },
  ];
  if (cooperation !== 'guarded') choices.push({ id: 'eda-complaint', label: 'Why did nobody sign the smell complaint?' });
  choices.push({ id: 'eda-record', label: 'Show us the record. (Continue)' });
  return {
    speaker: 'CHOOSE',
    text: 'What do you ask Eda?',
    choices: choices.filter((choice) => choice.id === 'eda-record' || !seen.has(choice.id.replace('eda-', ''))),
  };
}

export const EDA_TOPIC_RESPONSES = Object.freeze({
  'eda-product': [
    { speaker: 'BUTCH', text: 'What kind of lamp oil do you sell?' },
    { speaker: 'EDA', text: 'Clear kerosene. I fill whatever clean container a customer brings.' },
    { speaker: 'BUTCH', text: 'Could you identify it by smell?' },
    { speaker: 'EDA', text: 'I can identify the product. Smell cannot tell you the customer.' },
  ],
  'eda-order': [
    { speaker: 'BUTCH', text: 'What did Mara buy?' },
    { speaker: 'EDA', text: 'Two five litre cans of lamp oil and one bottle of stone solvent. She paid cash.' },
    { speaker: 'EDA', text: 'She asked where the old public fire letters connected to the street supply. I told her to ask the archive.' },
  ],
  'eda-collector': [
    { speaker: 'BUTCH', text: 'Who collected it?' },
    { speaker: 'EDA', text: 'Olek loaded the cans after she paid him. She left first.' },
    { speaker: 'BUTCH', text: 'Did they know each other?' },
    { speaker: 'EDA', text: 'Not from what I saw. She asked his price. He named it. That was the whole relationship.' },
  ],
  'eda-authorization': [
    { speaker: 'BUTCH', text: 'Why is her name missing from the copy?' },
    { speaker: 'EDA', text: 'Because she asked me not to write it down. After she left, I put an old Civic Movement code in the customer field.' },
    { speaker: 'BUTCH', text: 'You altered the record.' },
    { speaker: 'EDA', text: 'Yes. I did not alter what she bought, what she paid, or who carried it.' },
    { speaker: 'LEV', text: 'We need the copy exactly as it is now.' },
  ],
  'eda-complaint': [
    { speaker: 'BUTCH', text: 'Why did nobody sign the smell complaint?' },
    { speaker: 'EDA', text: 'The form asks who accepts responsibility. If I sign, Market Ward accepts it, and the cleanup comes through our stall fees.' },
  ],
});

export const EDA_RECORD_BLOCKED = Object.freeze([
  { speaker: 'EDA', text: 'Ask who carried it and why the customer field changed. Then the copy will mean something to you.' },
]);

export function edaRecordResponse(cooperation) {
  const handoff = cooperation === 'open'
    ? 'Keep it flat. The last digit is faint.'
    : cooperation === 'guarded'
      ? 'One copy removed by Inspector Lev Ardin. Sign that line before you take it.'
      : 'You can read it here. The inspector signs if he takes it.';
  return [
    { speaker: 'EDA', text: handoff },
    { speaker: 'LEV', text: 'Two five litre cans. One litre of stone solvent. Paid in cash. Olek listed as carrier.' },
    { speaker: 'BUTCH', text: 'And Mara\'s name replaced with a dead service code.' },
    { speaker: 'LEV', text: 'Eda concealed the buyer. That does not yet tell us whether anyone else knew she had done it.' },
  ];
}

export function edaExitLine(cooperation) {
  if (cooperation === 'open') return { speaker: 'EDA', text: 'Olek is beside the grey cart. Let him finish tying the wheel first.' };
  if (cooperation === 'guarded') return { speaker: 'EDA', text: 'Olek carried it. I sold it. Keep the verbs separate in your report.' };
  return { speaker: 'EDA', text: 'He is beside the grey cart. Ask about the delivery, not every place he worked today.' };
}

export const CART_DIALOGUE = Object.freeze([
  { speaker: 'BUTCH', text: 'Oil stained the cart bed, but not the wheel tread. The cart carried a leaking container. It did not draw the line in the street.' },
]);

export const OLEK_OPENING = Object.freeze([
  { speaker: 'LEV', text: 'Olek. We need to ask about the oil delivery on Eda\'s copy.' },
  { speaker: 'OLEK', text: 'I carried two sealed cans. I did not open them.' },
]);

export function olekTopicMenu(asked = []) {
  const seen = new Set(asked);
  return {
    speaker: 'CHOOSE',
    text: 'What do you ask Olek?',
    choices: [
      { id: 'olek-destination', label: 'Where did you take them?' },
      { id: 'olek-leak', label: 'Did either can leak?' },
      { id: 'olek-recipient', label: 'Who accepted the delivery?' },
      { id: 'olek-route', label: 'Which route did you use?' },
      { id: 'olek-done', label: 'Show us the service hatch. (Continue)' },
    ].filter((choice) => choice.id === 'olek-done' || !seen.has(choice.id.replace('olek-', ''))),
  };
}

export const PRODUCE_VENDOR_DIALOGUE = Object.freeze([
  { speaker: 'PRODUCE VENDOR', text: 'Lamp oil is Eda, under the blue canvas. I sell onions, and today I would like that distinction recorded.' },
  { speaker: 'LEV', text: 'It is recorded.' },
]);

export const FLOWER_VENDOR_DIALOGUE = Object.freeze([
  { speaker: 'FLOWER VENDOR', text: 'Eda keeps the fuel cans away from the food stalls. Look for the metal measures beside her counter.' },
]);

export const OLEK_TOPIC_RESPONSES = Object.freeze({
  'olek-destination': [
    { speaker: 'BUTCH', text: 'Where did you take them?' },
    { speaker: 'OLEK', text: 'Transport Ministry service lane. The woman said to leave them beside the old grey hatch.' },
  ],
  'olek-leak': [
    { speaker: 'BUTCH', text: 'Did either can leak?' },
    { speaker: 'OLEK', text: 'One cap was wet. Enough to stain the cart bed, not enough to reach the ground.' },
    { speaker: 'LEV', text: 'The wheel tread is clean. I agree.' },
  ],
  'olek-recipient': [
    { speaker: 'BUTCH', text: 'Who accepted the delivery?' },
    { speaker: 'OLEK', text: 'Nobody came outside. I left the cans beside the hatch. There was no city slip and I did not ring the bell.' },
    { speaker: 'BUTCH', text: 'You did not see who took them?' },
    { speaker: 'OLEK', text: 'No. The hatch was empty when I passed again.' },
  ],
  'olek-route': [
    { speaker: 'BUTCH', text: 'Which route did you use?' },
    { speaker: 'OLEK', text: 'The back lane, past the station wall, then behind Transport. She asked me not to use the square.' },
    { speaker: 'BUTCH', text: 'Why did you first call it a municipal delivery?' },
    { speaker: 'OLEK', text: 'Because I used a service lane for private work. That gets my cart permit taken for a week.' },
  ],
});

export const OLEK_ROUTE_BLOCKED = Object.freeze([
  { speaker: 'LEV', text: 'First tell us the destination and the route you used to reach it.' },
]);

export const OLEK_CONCLUSION = Object.freeze([
  { speaker: 'LEV', text: 'Show us the service hatch.' },
  { speaker: 'OLEK', text: 'Follow the drain channel. It ends beside the grey door. I carried the cans there. I did not know about Eda\'s false code.' },
]);

export const BOTTLE_DIALOGUE = Object.freeze([
  { speaker: 'BUTCH', text: 'Radek Stone Solvent. One litre. Same product and volume as Eda\'s issue copy.' },
  { speaker: 'LEV', text: 'Black paving grit inside the neck. It was opened near stonework.' },
  {
    speaker: 'CHOOSE',
    text: 'What can you claim from this?',
    choices: [
      { id: 'bottle-same-order', label: 'This came from Eda\'s order. (Continue)' },
      { id: 'bottle-overclaimed', label: 'This proves solvent was used on the oil line. (Continue)' },
      { id: 'bottle-bounded', label: 'It supports the delivery route. Nothing more yet. (Continue)' },
    ],
  },
]);

export const BOTTLE_RESPONSES = Object.freeze({
  'bottle-same-order': [
    { speaker: 'BUTCH', text: 'This came from Eda\'s order.' },
    { speaker: 'LEV', text: 'Likely. Same product, same volume, correct location. I will confirm the batch mark before I write that as fact.' },
  ],
  'bottle-overclaimed': [
    { speaker: 'BUTCH', text: 'This proves somebody used solvent on the oil line.' },
    { speaker: 'LEV', text: 'It proves the bottle was opened near paving. The cleaned edge is several streets from here. We do not have the movement between them.' },
  ],
  'bottle-bounded': [
    { speaker: 'BUTCH', text: 'It supports the delivery route. Nothing more yet.' },
    { speaker: 'LEV', text: 'Correct. That is how I will record it.' },
  ],
});

export const TRANSPORT_ENTRANCE_WITH_BOTTLE = Object.freeze([
  { speaker: 'TOMA', text: 'Public hall is open. What business are you bringing inside?' },
  { speaker: 'BUTCH', text: 'A private oil sale was entered under one of your old service codes. The cans were left at your rear hatch.' },
  { speaker: 'LEV', text: 'We also found the matching solvent bottle near the lane. We need the code history and the hatch pressure report.' },
  { speaker: 'TOMA', text: 'Then use Public Services. Take one number from the brass machine. Sava handles issue records at the first counter.' },
  { speaker: 'BUTCH', text: 'And yesterday\'s eastbound reservations?' },
  { speaker: 'TOMA', text: 'Nika runs the terminal at the next window. Start with Sava. He can authorize the record.' },
]);

export const TRANSPORT_ENTRANCE_NO_BOTTLE = Object.freeze([
  { speaker: 'TOMA', text: 'Public hall is open. What business are you bringing inside?' },
  { speaker: 'BUTCH', text: 'A private oil sale was entered under one of your old service codes. The cans were left at your rear hatch.' },
  { speaker: 'LEV', text: 'Eda supplied it and Olek delivered it. We need the code history and the hatch pressure report.' },
  { speaker: 'TOMA', text: 'Then use Public Services. Take one number from the brass machine. Sava handles issue records at the first counter.' },
  { speaker: 'BUTCH', text: 'And yesterday\'s eastbound reservations?' },
  { speaker: 'TOMA', text: 'Nika runs the terminal at the next window. Start with Sava. He can authorize the record.' },
]);

export const TRANSPORT_QUEUE_DIALOGUE = Object.freeze([
  { speaker: 'BUTCH', text: 'A brass lever, a paper roll, and a slot polished by thousands of hands.' },
  { speaker: 'PATTERN', text: 'Public Services is the left column. The roll advances one number when the lever reaches the stop.' },
  { speaker: 'BUTCH', text: 'M-17.' },
  { speaker: 'LEV', text: 'Keep Eda\'s copy out. Sava will ask for the old code before he asks whose name should have been there.' },
  { speaker: 'CLERK', text: 'M-seventeen. Counter one.' },
]);

export const SAVA_NEXT_INTERACTION = Object.freeze([
  { speaker: 'SAVA', text: 'M-seventeen. Put the sales copy on the counter with the old service code facing me.' },
  { speaker: 'LEV', text: 'This is the next interview. We establish who could still use that code before we decide who used it for Mara.' },
]);

export const SAVA_OPENING = Object.freeze([
  { speaker: 'SAVA', text: 'This code belonged to the old public fire-letter service. It was retired six years ago.' },
  { speaker: 'BUTCH', text: 'Then why did Eda use it yesterday and why did her book accept it?' },
  { speaker: 'SAVA', text: 'Because retired is not the same as deleted. Ask one question at a time.' },
]);

export function savaTopicMenu(asked = []) {
  const seen = new Set(asked);
  return {
    speaker: 'CHOOSE',
    text: 'What do you ask Sava?',
    choices: [
      { id: 'sava-code-history', label: 'What was the old code used for?' },
      { id: 'sava-anonymous-use', label: 'Who was still allowed to use it?' },
      { id: 'sava-mara-transaction', label: 'When did you notice Mara\'s transaction?' },
      { id: 'sava-no-correction', label: 'Why did you leave it uncorrected?' },
      { id: 'sava-done', label: 'Have Nika show us the actual times. (Continue)' },
    ].filter((choice) => choice.id === 'sava-done' || !seen.has(choice.id.replace('sava-', ''))),
  };
}

export const SAVA_TOPIC_RESPONSES = Object.freeze({
  'sava-code-history': [
    { speaker: 'BUTCH', text: 'What was the code used for?' },
    { speaker: 'SAVA', text: 'Fuel, chalk and cleanup supplies for the public fire letters in the central square. The city stopped funding the displays, so the service closed.' },
  ],
  'sava-anonymous-use': [
    { speaker: 'BUTCH', text: 'Who was still allowed to use it?' },
    { speaker: 'SAVA', text: 'No one was officially allowed. I told market sellers they could use it for small cash transactions when a customer would not give a name.' },
    { speaker: 'BUTCH', text: 'You kept a dead municipal code alive as an anonymous customer account.' },
    { speaker: 'SAVA', text: 'I kept forty small purchases a week from sitting unpaid in a tray. Mara was not the first customer entered that way.' },
  ],
  'sava-mara-transaction': [
    { speaker: 'BUTCH', text: 'When did you notice this transaction?' },
    { speaker: 'SAVA', text: 'Yesterday at sixteen twenty, when the rear service hatch reported a pressure change. Nika printed every use of the code for that day.' },
    { speaker: 'LEV', text: 'That was after Eda sold the oil and after Olek left it at the hatch.' },
  ],
  'sava-no-correction': [
    { speaker: 'BUTCH', text: 'You knew a named purchase had been hidden. Why did you leave it uncorrected?' },
    { speaker: 'SAVA', text: 'Correcting it would expose the whole practice and charge every anonymous sale back to the market. I left this line as I left the others.' },
    { speaker: 'BUTCH', text: 'That still protected Mara.' },
    { speaker: 'SAVA', text: 'It did. I am telling you why I did it, not pretending it had no effect.' },
  ],
});

export const SAVA_BLOCKED = Object.freeze([
  { speaker: 'LEV', text: 'We need three things first: how anonymous use worked, when Sava noticed this sale, and why he chose not to correct it.' },
]);

export const SAVA_CONCLUSION = Object.freeze([
  { speaker: 'SAVA', text: 'Nika has the original timestamps at the next terminal. The practice is mine. The source records are hers to explain.' },
  { speaker: 'LEV', text: 'Sava deliberately left Mara\'s transaction hidden, but the shortcut existed before she arrived. Both facts go in the notebook.' },
]);

export const BOSKO_QUEUE_DIALOGUE = Object.freeze([
  { speaker: 'BOSKO', text: 'If you are asking whether Sava invented that code for your woman, he did not.' },
  { speaker: 'BUTCH', text: 'How would you know?' },
  { speaker: 'BOSKO', text: 'I repair lamps for cash. Eda has used that number for me three times this year. Sava complains about it, then clears the line anyway.' },
  { speaker: 'LEV', text: 'That confirms the practice predates Mara. It does not excuse Sava leaving her transaction uncorrected.' },
]);

export const NIKA_OPENING = Object.freeze([
  { speaker: 'NIKA', text: 'Sava authorized the search. I can show you timestamps, not conclusions.' },
  { speaker: 'BUTCH', text: 'Good. Start with what the system recorded.' },
]);

export function nikaTopicMenu(asked = []) {
  const seen = new Set(asked);
  return {
    speaker: 'CHOOSE',
    text: 'What do you ask Nika to compare?',
    choices: [
      { id: 'nika-timeline', label: 'Put the sale and service hatch on one timeline.' },
      { id: 'nika-reservation', label: 'Check the next eastbound reservations.' },
      { id: 'nika-discarded-print', label: 'Why is one print sequence missing?' },
      { id: 'nika-source-records', label: 'Could anyone have changed the original times?' },
      { id: 'nika-done', label: 'Print the comparison and identify what you discarded. (Continue)' },
    ].filter((choice) => choice.id === 'nika-done' || !seen.has(choice.id.replace('nika-', ''))),
  };
}

export const NIKA_TOPIC_RESPONSES = Object.freeze({
  'nika-timeline': [
    { speaker: 'BUTCH', text: 'Put the sale and service hatch on one timeline.' },
    { speaker: 'NIKA', text: 'Sale posted at fourteen twelve. Rear hatch pressure changed at fourteen forty-six. A plaza maintenance request entered at fifteen oh three.' },
    { speaker: 'LEV', text: 'Three records, three terminals. No single account created all of them.' },
  ],
  'nika-reservation': [
    { speaker: 'BUTCH', text: 'Check the next eastbound reservations.' },
    { speaker: 'NIKA', text: 'Tomorrow, seven ten. One cash reservation under M. Venn, made yesterday at fifteen thirty-eight.' },
    { speaker: 'BUTCH', text: 'Mara Venn.' },
    { speaker: 'NIKA', text: 'Possibly. The reservation contains no photograph and no identity number. I can prove the name and time, not the passenger.' },
  ],
  'nika-discarded-print': [
    { speaker: 'BUTCH', text: 'The print sequence jumps from four to six. What happened to page five?' },
    { speaker: 'NIKA', text: 'I printed the code search twice. I tore up the first copy and put it in the waste bin.' },
    { speaker: 'BUTCH', text: 'Why?' },
    { speaker: 'NIKA', text: 'It showed how often Sava cleared anonymous sales. I thought an unnecessary duplicate would only give his supervisor another reason to suspend him.' },
  ],
  'nika-source-records': [
    { speaker: 'BUTCH', text: 'Could you change the original times?' },
    { speaker: 'NIKA', text: 'Not from this terminal. Corrections create a second timestamp and require a supervisor key. There are no corrections on these four records.' },
  ],
});

export const NIKA_BLOCKED = Object.freeze([
  { speaker: 'NIKA', text: 'Before I print anything, compare the timeline, check the reservation, and ask me directly about the missing page.' },
]);

export const NIKA_CONCLUSION = Object.freeze([
  { speaker: 'NIKA', text: 'The clean comparison is yours. The torn first copy is still out on the public table by the queue.' },
  { speaker: 'LEV', text: 'You deleted a printout, not a source record.' },
  { speaker: 'NIKA', text: 'Yes. I hid something embarrassing. I did not change when any event happened.' },
]);

export const DISCARDED_PRINT_DIALOGUE = Object.freeze([
  { speaker: 'BUTCH', text: 'Two torn halves from the same continuous-feed sheet. The timestamps match Nika\'s terminal.' },
  { speaker: 'PATTERN', text: 'The first half lists the oil sale and rear-hatch pressure change. The second lists maintenance request C-441: CENTRAL SQUARE, OLD ANNOUNCEMENT GROOVES.' },
  { speaker: 'BUTCH', text: 'The sale, the service hatch and the square are now connected by one printed search.' },
  { speaker: 'LEV', text: 'Connected in a search. That does not prove the people behind those records spoke to one another.' },
  { speaker: 'LEV', text: 'Bring the copy outside. We can test your theory without making the public hall listen to it.' },
]);

export const FIRST_THEORY_OPENING = Object.freeze([
  { speaker: 'LEV', text: 'State the strongest version. Do not soften it because I may disagree.' },
  {
    speaker: 'CHOOSE',
    text: 'What do you think they did?',
    choices: [
      { id: 'theory-market-ministry', label: 'The market and ministry coordinated Mara\'s route. (Continue)' },
      { id: 'theory-code-cover', label: 'Sava supplied the code and Nika cleaned the record. (Continue)' },
      { id: 'theory-planned-handoff', label: 'The rear hatch was a planned handoff point. (Continue)' },
    ],
  },
]);

export const FIRST_THEORY_RESPONSES = Object.freeze({
  'theory-market-ministry': [
    { speaker: 'BUTCH', text: 'Eda hid Mara\'s name, Olek hid her route, Sava preserved the code and Nika destroyed a page. That is coordination.' },
    { speaker: 'LEV', text: 'It is four concealments. Coordination requires shared information. Eda did not know the destination. Olek did not know the code. Sava learned about the sale after the delivery. Nika printed the search later still.' },
  ],
  'theory-code-cover': [
    { speaker: 'BUTCH', text: 'Sava gave Mara a working code. Nika removed the page that exposed it.' },
    { speaker: 'LEV', text: 'No witness puts Sava with Mara. Eda chose the code from an existing practice. Nika tore up a duplicate after the source records were already fixed in four separate systems.' },
  ],
  'theory-planned-handoff': [
    { speaker: 'BUTCH', text: 'The rear hatch was a handoff. Someone inside took the cans and moved them toward the square.' },
    { speaker: 'LEV', text: 'Possible, but not established. Olek saw no recipient. The pressure record proves the hatch opened. It does not identify the person on either side.' },
  ],
});

export const FIRST_THEORY_CONCLUSION = Object.freeze([
  { speaker: 'BUTCH', text: 'So every person helped produce the same result, but none of them had to share a plan.' },
  { speaker: 'LEV', text: 'That is the limit of the evidence. If we want to know whether anyone worked beside Mara, we need a witness who is outside both the market and the ministry.' },
  { speaker: 'LEV', text: 'Bosko was waiting here most of yesterday. He said he saw her again in the square. Ask him for actions, not his opinion of them.' },
]);

export const BOSKO_SQUARE_OPENING = Object.freeze([
  { speaker: 'BOSKO', text: 'You want yesterday again. Tell me where to start.' },
  {
    speaker: 'CHOOSE',
    text: 'How do you question Bosko?',
    choices: [
      { id: 'bosko-first-sighting', label: 'Start with the first moment you saw her. (Continue)' },
      { id: 'bosko-who-with', label: 'Tell me who stood close enough to help. (Continue)' },
      { id: 'bosko-actions', label: 'Only describe what she physically did. (Continue)' },
    ],
  },
]);

export const BOSKO_SQUARE_RESPONSES = Object.freeze({
  'bosko-first-sighting': [
    { speaker: 'BOSKO', text: 'She came from the ministry lane alone, set down two cans and measured the paving with a folding rule.' },
  ],
  'bosko-who-with': [
    { speaker: 'BOSKO', text: 'No one stood with her. A cleaner crossed behind her once. They did not speak or exchange anything.' },
  ],
  'bosko-actions': [
    { speaker: 'BOSKO', text: 'She measured one row, wrote numbers on her palm, moved to the second row, then carried both cans behind the fountain.' },
  ],
});

export const BOSKO_SQUARE_CONCLUSION = Object.freeze([
  { speaker: 'BUTCH', text: 'Did Eda, Olek, Sava or Nika appear while she worked?' },
  { speaker: 'BOSKO', text: 'No. I know all four by sight. Mara worked alone each time I could see her.' },
  { speaker: 'LEV', text: 'Show us exactly where she kept kneeling.' },
  { speaker: 'BOSKO', text: 'Over there—south edge of the clock paving. Two long rows. The second one stopped near the fountain service joint.' },
]);

export const PLAZA_GROOVE_OPENING = Object.freeze([
  { speaker: 'LEV', text: 'Describe the construction first. We can decide what it means after that.' },
]);

export function plazaGrooveMenu(observed = []) {
  const seen = new Set(observed);
  return {
    speaker: 'CHOOSE',
    text: 'Inspect the old announcement grooves.',
    choices: [
      { id: 'groove-rows', label: 'Trace the two long rows.' },
      { id: 'groove-spacing', label: 'Compare the turns and spaces.' },
      { id: 'groove-feed-gap', label: 'Find where the second supply stops.' },
      { id: 'groove-conclude', label: 'Tell Lev what the layout forms. (Continue)' },
    ].filter((choice) => choice.id === 'groove-conclude' || !seen.has(choice.id.replace('groove-', ''))),
  };
}

export const PLAZA_GROOVE_RESPONSES = Object.freeze({
  'groove-rows': [
    { speaker: 'BUTCH', text: 'Two separate rows, each built from the same shallow channels. Both begin near the main service joint.' },
    { speaker: 'LEV', text: 'The first row is continuously stained. The second is dry after its first few turns.' },
  ],
  'groove-spacing': [
    { speaker: 'BUTCH', text: 'The short straight sections repeat at regular widths. The larger gaps occur at the same interval as spaces between words.' },
    { speaker: 'PATTERN', text: 'These are character cells. Large enough to read from the surrounding windows or from above the square.' },
  ],
  'groove-feed-gap': [
    { speaker: 'BUTCH', text: 'The first supply crosses the whole upper row. A second branch reaches the lower row and stops at a clean break.' },
    { speaker: 'LEV', text: 'Incomplete supply, not an incomplete carving. The remaining lower grooves continue past the break.' },
  ],
});

export const PLAZA_GROOVE_BLOCKED = Object.freeze([
  { speaker: 'LEV', text: 'Trace both rows, compare the spacing, and locate the failed lower feed before you name the structure.' },
]);

export const PLAZA_GROOVE_CONCLUSION = Object.freeze([
  { speaker: 'BUTCH', text: 'It is a two-line ground message. The paving already contained the letter channels. Mara prepared oil for both rows.' },
  { speaker: 'LEV', text: 'And the second row cannot receive fuel in its current state.' },
  { speaker: 'BUTCH', text: 'The maintenance number on Nika\'s discarded page should tell us who interrupted it.' },
  { speaker: 'LEV', text: 'The old municipal archive keeps the groove plans and maintenance orders. That is our next stop.' },
]);

export const ARCHIVE_ENTRANCE_DIALOGUE = Object.freeze([
  { speaker: 'MILA', text: 'The public reading room closes at six. What record are you requesting?' },
  { speaker: 'BUTCH', text: 'Central Square maintenance request C-441. We also need the original plan for the announcement grooves.' },
  { speaker: 'MILA', text: 'C-441 is a current work order. The groove plan is in the old fire-letter collection. Those are separate indexes.' },
  { speaker: 'LEV', text: 'Can you bring both to one table?' },
  { speaker: 'MILA', text: 'I can bring the plan. The work order stays clipped to the maintenance ledger. You may read it at the side desk.' },
  { speaker: 'BUTCH', text: 'Who signed the order?' },
  { speaker: 'MILA', text: 'You can read the signature yourself. Come inside and keep the documents on their tables.' },
]);

export const ANA_MAP_HELP_DIALOGUE = Object.freeze([
  { speaker: 'BUTCH', text: 'The legend uses three different marks for oil. What is the difference?' },
  { speaker: 'ANA', text: 'The thick line is the street supply. A thin solid line feeds one display. A thin broken line means a removable event branch.' },
  { speaker: 'BUTCH', text: 'Were the fire letters a municipal warning system?' },
  { speaker: 'ANA', text: 'No. Notices, memorials, strike dates, holiday announcements. The city maintained the supply joint. Whoever paid for oil prepared the words.' },
  { speaker: 'LEV', text: 'Public infrastructure, ordinary access.' },
  { speaker: 'ANA', text: 'When it worked. The names of half these streets changed twice, so match buildings and fountain lines before you trust the labels.' },
]);

export const ARCHIVE_MAP_DIALOGUE = Object.freeze([
  { speaker: 'BUTCH', text: 'The plan is dated twenty-three years ago. Central Square still has the same fountain and clock paving.' },
  { speaker: 'LEV', text: 'Place the maintenance print beside it. C-441 names the south service joint.' },
  {
    speaker: 'CHOOSE',
    text: 'What does the physical plan establish?',
    choices: [
      { id: 'archive-map-separate-supplies', label: 'Each line had its own independent supply.' },
      { id: 'archive-map-shared-feed', label: 'One main feed served both lines through a short branch.' },
      { id: 'archive-map-hidden-machine', label: 'A hidden machine controlled the lettering.' },
    ],
  },
]);

export const ARCHIVE_MAP_RESPONSES = Object.freeze({
  'archive-map-separate-supplies': [
    { speaker: 'BUTCH', text: 'Each line had its own supply.' },
    { speaker: 'ANA', text: 'No. Follow the heavy mark. Both begin at the same street joint. Only the lower row has a separate short branch after that.' },
  ],
  'archive-map-shared-feed': [
    { speaker: 'BUTCH', text: 'One main feed reached both rows. The lower row depended on this short removable branch.' },
    { speaker: 'LEV', text: 'That matches the square. The upper row is continuous. The lower row stops exactly where the branch leaves the joint.' },
  ],
  'archive-map-hidden-machine': [
    { speaker: 'BUTCH', text: 'Was there a machine under the paving?' },
    { speaker: 'ANA', text: 'Only valves and shallow service channels. People laid out the letters by hand, poured the oil, and lit them from the edge.' },
  ],
});

export const ARCHIVE_MAP_CONCLUSION = Object.freeze([
  { speaker: 'BUTCH', text: 'The missing lower feed is not a design gap. Something happened to the branch.' },
  { speaker: 'MILA', text: 'Then the current maintenance ledger is your next document. C-441 is clipped under yesterday.' },
]);

export const MAINTENANCE_ORDER_DIALOGUE = Object.freeze([
  { speaker: 'BUTCH', text: 'Request C-441. Reported by automatic pressure monitor. Location: south square service joint.' },
  { speaker: 'PATTERN', text: 'Instruction: ISOLATE UNREGISTERED BRANCH. REMOVE SURFACE RESIDUE AT ACCESS POINT. LEAVE MAIN FEED IN SERVICE.' },
  { speaker: 'LEV', text: 'No person is named in the request. No message, lettering or oil delivery is mentioned.' },
  { speaker: 'BUTCH', text: 'Completion signed P. Kolar. Petar Kolar.' },
  { speaker: 'MILA', text: 'He is returning tools in the staff corridor. You may ask him about his work. You may not take the ledger with you.' },
]);

export const PETAR_OPENING = Object.freeze([
  { speaker: 'PETAR', text: 'Mila said you are reading C-441. I signed it. What is wrong with the work?' },
  { speaker: 'BUTCH', text: 'The branch you cut supplied the second line of a ground message.' },
  { speaker: 'PETAR', text: 'I did not see a message. I worked from the access chamber below the paving.' },
]);

export function petarTopicMenu(asked = []) {
  const seen = new Set(asked);
  return {
    speaker: 'CHOOSE',
    text: 'What do you ask Petar?',
    choices: [
      { id: 'petar-instruction', label: 'What exactly were you ordered to do?' },
      { id: 'petar-surface-view', label: 'What could you see from the access chamber?' },
      { id: 'petar-cleaning', label: 'How much of the oil and groove did you clean?' },
      { id: 'petar-done', label: 'State what you cut and what you knew. (Continue)' },
    ].filter((choice) => choice.id === 'petar-done' || !seen.has(choice.id.replace('petar-', ''))),
  };
}

export const PETAR_TOPIC_RESPONSES = Object.freeze({
  'petar-instruction': [
    { speaker: 'BUTCH', text: 'What exactly were you ordered to do?' },
    { speaker: 'PETAR', text: 'Find the pressure loss, isolate any branch not listed as active, wipe the joint, leave the street feed open. That is standard leak work.' },
    { speaker: 'BUTCH', text: 'Did anyone call you and add instructions?' },
    { speaker: 'PETAR', text: 'No. The request printed in the depot rack. I signed it out and went alone.' },
  ],
  'petar-route': [
    { speaker: 'BUTCH', text: 'Where did you enter the service channel?' },
    { speaker: 'PETAR', text: 'Drain stair behind the archive. I walked under the west curb and came up through the square access chamber.' },
    { speaker: 'LEV', text: 'That route does not pass Eda, Olek, the rear hatch or the public side of Transport.' },
  ],
  'petar-surface-view': [
    { speaker: 'BUTCH', text: 'What could you see from below?' },
    { speaker: 'PETAR', text: 'The underside of the joint, two valves, and light around the cover. I could not see the rows in the paving.' },
    { speaker: 'BUTCH', text: 'Did you see Mara?' },
    { speaker: 'PETAR', text: 'No. I saw no one while the cover was open.' },
  ],
  'petar-cleaning': [
    { speaker: 'BUTCH', text: 'The order says remove surface residue. How much did you clean?' },
    { speaker: 'PETAR', text: 'Only the oil around the access cover. I did not walk the lettering or clean either row.' },
    { speaker: 'LEV', text: 'That explains the pale patch at the joint, not the full prepared grooves.' },
  ],
});

export const PETAR_BLOCKED = Object.freeze([
  { speaker: 'LEV', text: 'Before we close this interview, establish the instruction, Petar\'s view from below, and the limit of his cleaning.' },
]);

export const PETAR_CONCLUSION = Object.freeze([
  { speaker: 'BUTCH', text: 'You cut the lower branch and cleaned the access point. You did not see the words above you.' },
  { speaker: 'PETAR', text: 'Correct. If I had seen a public display, I would have asked who authorized it. I saw an unlisted line losing pressure.' },
  { speaker: 'BUTCH', text: 'You still destroyed part of what Mara built.' },
  { speaker: 'PETAR', text: 'I did. I am not asking you to call the result harmless. I am telling you what I knew when I made the cut.' },
]);

export const MATERIAL_TIMELINE_DIALOGUE = Object.freeze([
  { speaker: 'BUTCH', text: 'Eda records the sale at fourteen twelve. Olek leaves the cans at the rear hatch at fourteen forty-six.' },
  { speaker: 'LEV', text: 'The pressure monitor creates C-441 at fifteen oh three. Mara, or someone using her name, reserves the eastbound seat at fifteen thirty-eight.' },
  { speaker: 'BUTCH', text: 'Sava sees the old code at sixteen twenty. Nika prints the search after that. Petar signs out his tools at sixteen forty-one and completes the cut at seventeen ten.' },
  { speaker: 'PATTERN', text: 'The acts form a chain on paper. The people do not form a meeting.' },
  { speaker: 'LEV', text: 'Eda never knew the destination. Olek never knew the code. Petar received an automatic request before Sava or Nika reviewed the records.' },
  { speaker: 'BUTCH', text: 'So the result is coordinated. The participants may not be.' },
  { speaker: 'LEV', text: 'Bring the timeline outside. If you still believe they shared a plan, we will test the strongest versions one by one.' },
]);

export const SECOND_THEORY_OPENING = Object.freeze([
  { speaker: 'LEV', text: 'We have a map, an order, Petar\'s tools and the full sequence. Which coordinated explanation still survives for you?' },
]);

export function secondTheoryMenu(tested = []) {
  const seen = new Set(tested);
  return {
    speaker: 'CHOOSE',
    text: 'Test every remaining explanation.',
    choices: [
      { id: 'second-market-coordination', label: 'The market arranged the oil route together.' },
      { id: 'second-municipal-censorship', label: 'The city used maintenance to censor Mara.' },
      { id: 'second-petar-knew-message', label: 'Petar knew exactly which words he was cutting.' },
      { id: 'second-conclude', label: 'State what the three failures mean. (Continue)' },
    ].filter((choice) => choice.id === 'second-conclude' || !seen.has(choice.id.replace('second-', ''))),
  };
}

export const SECOND_THEORY_RESPONSES = Object.freeze({
  'second-market-coordination': [
    { speaker: 'BUTCH', text: 'Eda supplied it and Olek moved it. They could have planned the route together.' },
    { speaker: 'LEV', text: 'Eda\'s copy was posted before Olek accepted the job. She did not know the destination. Olek did not know her service code. Their concealments protected their own risks, not a shared route.' },
  ],
  'second-municipal-censorship': [
    { speaker: 'BUTCH', text: 'Transport noticed the code and Maintenance cut the message. That can be municipal censorship.' },
    { speaker: 'LEV', text: 'The pressure monitor created Petar\'s order before Sava opened the code report. Different offices, automatic routing, no shared instruction. The city damaged the message without deciding to censor it.' },
  ],
  'second-petar-knew-message': [
    { speaker: 'BUTCH', text: 'Petar could be lying about the view. He knew which branch to cut.' },
    { speaker: 'LEV', text: 'The old plan identifies the branch from below. Bosko saw Mara finish measuring after Petar entered through the archive stair. Petar could know the pipe and still never see the words.' },
  ],
  'second-lev-steered-case': [
    { speaker: 'BUTCH', text: 'You found me at the station and led me to the first trace. Maybe you already knew where this ended.' },
    { speaker: 'LEV', text: 'Reasonable question. My duty log puts me at the west checkpoint while Mara bought the oil. Bosko saw me return after she left the square. I knew about the stain because a cleaner reported it this morning.' },
    { speaker: 'BUTCH', text: 'You are asking me to accept records from the same city.' },
    { speaker: 'LEV', text: 'No. Compare them with Bosko, the train conductor and your own photograph. If they conflict, keep me in the theory.' },
  ],
});

export const SECOND_THEORY_BLOCKED = Object.freeze([
  { speaker: 'LEV', text: 'Not yet. Test the market, the city and Petar. One surviving explanation would be enough, so none of them can be skipped.' },
]);

export const SECOND_THEORY_CONCLUSION = Object.freeze([
  { speaker: 'BUTCH', text: 'Everyone took an action that helped hide Mara or damaged the trace. The timing does not show them sharing a plan.' },
  { speaker: 'LEV', text: 'Correct. Separate motives produced one result because Mara gave each person only the part they needed.' },
  { speaker: 'BUTCH', text: 'Then Mara was the only person who knew the whole route.' },
  { speaker: 'LEV', text: 'That is the strongest conclusion we have. One object remains unexplained: Petar says he cut the branch, but the exposed ends in the square were left unusually easy to reach.' },
  { speaker: 'LEV', text: 'The sun is low enough now to see the metal against the paving. Let us inspect the cut before the archive closes.' },
]);

export const CUT_INTERFACE_OPENING = Object.freeze([
  { speaker: 'LEV', text: 'Keep the question narrow. We know Petar made the cut. We do not know who arranged the ends afterward.' },
]);

export function cutInterfaceMenu(observed = []) {
  const seen = new Set(observed);
  return {
    speaker: 'CHOOSE',
    text: 'Inspect the broken lower feed.',
    choices: [
      { id: 'cut-cut', label: 'Examine the cut surfaces.' },
      { id: 'cut-placement', label: 'Check where both loose ends were left.' },
      { id: 'cut-reconnection', label: 'Test whether the ends can meet without tools.' },
      { id: 'cut-conclude', label: 'Tell Lev what the interface proves. (Continue)' },
    ].filter((choice) => choice.id === 'cut-conclude' || !seen.has(choice.id.replace('cut-', ''))),
  };
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

export const CUT_INTERFACE_BLOCKED = Object.freeze([
  { speaker: 'LEV', text: 'Examine the cut, the position of both ends, and the old clamp before deciding what was prepared.' },
]);

export const CUT_INTERFACE_CONCLUSION = Object.freeze([
  { speaker: 'BUTCH', text: 'Petar cut the branch. Later, someone placed both ends where a person could reconnect them by hand.' },
  { speaker: 'LEV', text: 'Yes. We cannot identify that person from the metal. Mara could have prepared it. Petar could have reconsidered. Someone else could have moved it.' },
  { speaker: 'BUTCH', text: 'But the second line was not simply destroyed. A way to restore it was left here.' },
  { speaker: 'LEV', text: 'Record that much. The archive is closing and the next train is tomorrow morning. I booked you a room at the Copper Heron.' },
]);

export const HANA_OPENING = Object.freeze([
  { speaker: 'HANA', text: 'Two rooms left. The next passenger train is tomorrow morning, so I assume you need one.' },
  { speaker: 'LEV', text: 'One room for him. Before you write the name, we need to ask about a previous guest.' },
  { speaker: 'BUTCH', text: 'This woman. Did she stay here?' },
  { speaker: 'HANA', text: 'Yes. Room six. She paid cash and asked me not to write a name.' },
]);

export const HANA_TOPIC_RESPONSES = Object.freeze({
  'hana-register': [
    { speaker: 'BUTCH', text: 'Why agree to leave the line blank?' },
    { speaker: 'HANA', text: 'People miss trains, leave spouses, lose papers and sometimes want one quiet night. I have done it for years. She did not invent the arrangement.' },
    { speaker: 'LEV', text: 'So the blank line is your practice, not a signal arranged for her.' },
    { speaker: 'HANA', text: 'Correct. If that makes me careless, write careless.' },
  ],
  'hana-alone': [
    { speaker: 'BUTCH', text: 'Did anyone meet her here or come up to the room?' },
    { speaker: 'HANA', text: 'No. She carried one small case. She came down once for hot water and went back alone.' },
    { speaker: 'BUTCH', text: 'You watched the stairs the whole evening?' },
    { speaker: 'HANA', text: 'The desk faces them. I may miss a whisper. I do not miss a second pair of shoes.' },
  ],
  'hana-departure': [
    { speaker: 'BUTCH', text: 'When did she leave?' },
    { speaker: 'HANA', text: 'Before dawn. I was setting the stove. She returned the key, crossed toward the square, and did not ask for a carriage.' },
    { speaker: 'LEV', text: 'Could you see beyond the corner?' },
    { speaker: 'HANA', text: 'No. Daro had the window. Ask him what he saw, and ask him exactly where he was standing.' },
  ],
});

export const HANA_BLOCKED = Object.freeze([
  { speaker: 'LEV', text: 'First establish whether the blank entry was unusual, whether Mara was alone, and when she departed.' },
]);

export const HANA_CONCLUSION = Object.freeze([
  { speaker: 'BUTCH', text: 'We will take the room. Leave my name in the book.' },
  { speaker: 'HANA', text: 'That is generally how the book works.' },
  { speaker: 'LEV', text: 'The missing name tells us less than the route. Daro is the next useful witness.' },
]);

export function hanaTopicMenu(asked = []) {
  const choices = [];
  if (!asked.includes('register')) choices.push({ id: 'hana-register', label: 'Ask why the register line was left blank.' });
  if (!asked.includes('alone')) choices.push({ id: 'hana-alone', label: 'Ask whether Mara met anyone in the hotel.' });
  if (!asked.includes('departure')) choices.push({ id: 'hana-departure', label: 'Ask when and how Mara left.' });
  choices.push({ id: 'hana-done', label: 'Take the room and compare what Hana knows. (Continue)' });
  return { speaker: 'CHOOSE', text: 'Ask Hana about the previous guest.', choices };
}

// Lev notices Butch searching too long and points him at the current
// destination. `direction` is a compass word computed from the live player
// position, so the same line works from any street corner.
export const SEARCH_HINT_LINES = Object.freeze({
  'find-ministry': (direction) => [
    { speaker: 'LEV', text: `We have walked past it twice. The Transport Ministry is ${direction} of here — the tall stone front with the recessed doors.` },
    { speaker: 'LEV', text: 'Public Services uses the front entrance, facing the square. Toma is posted there.' },
  ],
  'find-bosko': (direction) => [
    { speaker: 'LEV', text: `Bosko did not go home. He is ${direction} of here, at the edge of the central square — look for the man standing by the clock paving.` },
  ],
  'find-archive': (direction) => [
    { speaker: 'LEV', text: `The Old Municipal Archive is ${direction} of here, past the market row — the old stone building with the narrow door.` },
    { speaker: 'LEV', text: 'Mila is expecting the maintenance number. The entrance faces the lane.' },
  ],
  'find-hotel': (direction) => [
    { speaker: 'SYSTEM', text: `Copper Heron: ${direction}, beyond the ministry lane. Follow the breathing brass-bird entrance marker.` },
  ],
  'find-cut-interface': (direction) => [
    { speaker: 'LEV', text: `The cut feed ends ${direction} of here, at the south edge of the square — look for the old connector block between the paving grooves.` },
    { speaker: 'LEV', text: 'It is small and it sits low. Follow the groove lines and watch for the marker light.' },
  ],
});
