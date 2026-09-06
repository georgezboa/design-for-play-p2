export const ENDING_SLICE_POSITIONS = Object.freeze({
  playerStart: [12, 0.5, 12.5],
  morningEvidence: [9, 0.67, 8],
  evidenceApproach: [10.5, 0.5, 10],
  squareMaraFountain: [24.6, 0.5, 6.2],
  maraApproach: [23.2, 0.5, 7.7],
  stationTrigger: [-5.8, 0.5, 25.2],
  squareMaraScan: [-8.8, 0.5, 29.9],
  trainMaraScan: [-12.1, 0.5, 32.5],
  levPlatform: [-6.5, 0.5, 28.2],
  squareMaraBoarded: [-13.6, 0.5, 34],
  butchBoarded: [-13.1, 0.5, 33.6],
  trainDoor: [-12, 1.35, 32.5],
});

export const EVIDENCE_DIALOGUE = Object.freeze([
  {
    speaker: 'NARRATION',
    text: 'Two lines have burned into the paving. The grooves are still black, but the flame is gone.',
  },
  {
    speaker: 'NARRATION',
    text: 'Soot transfers to your thumb. The blue connector is still pressed together at the angle you left it.',
  },
  {
    speaker: 'BUTCH',
    text: 'So it was not a dream.',
  },
  {
    speaker: 'PATTERN',
    text: 'The fire was real. The cut wire was real. You reconnected it. Nothing here identifies who prepared the site.',
  },
]);

export const MARA_REMINDER_DIALOGUE = Object.freeze([
  {
    speaker: 'MARA VENN',
    text: 'You have been looking at the paving since you came out. What is it?',
  },
]);

export const MARA_NEGOTIATION_DIALOGUE = Object.freeze([
  {
    speaker: 'MARA VENN',
    text: 'You asked me to wait until seven. What did you find?',
  },
  {
    speaker: 'BUTCH',
    text: 'There were two lines cut into the square before they burned. The cable to the second line had been cut with a tool.',
  },
  {
    speaker: 'BUTCH',
    text: 'The station record also shows your ticket was cancelled before yesterday\'s train arrived. The system made its decision first.',
  },
  {
    speaker: 'MARA VENN',
    text: 'And what exactly do you want me to do at the station?',
  },
  {
    speaker: 'BUTCH',
    text: 'Stand in the scanner range at the same time as the Mara already on the train. We keep both tickets visible and see what the machine does.',
  },
  {
    speaker: 'MARA VENN',
    text: 'Yesterday it called me the error in front of everyone there. You cannot tell me it will not do that again.',
    choices: [
      {
        id: 'evidence',
        label: 'I can show you the scorch marks and the cut connection. The cancellation fits the same sequence.',
      },
      {
        id: 'plan',
        label: 'You stand outside the yellow line. She stays inside. Lev records both results before either ticket leaves the scanner.',
      },
      {
        id: 'uncertainty',
        label: 'I cannot promise the result. I can make sure the machine has to answer while both of you are there.',
      },
    ],
  },
]);

export const MARA_APPROACH_RESPONSES = Object.freeze({
  evidence: [
    { speaker: 'MARA VENN', text: 'Show me where the records meet the physical evidence while we walk.' },
    { speaker: 'BUTCH', text: 'I will. We have enough time if we leave now.' },
  ],
  plan: [
    { speaker: 'MARA VENN', text: 'Good. If it refuses me again, Lev writes down both rows before anyone resets the machine.' },
    { speaker: 'BUTCH', text: 'That is the plan.' },
  ],
  uncertainty: [
    { speaker: 'MARA VENN', text: 'That is more honest than yesterday. Separate checks only repeat the same result.' },
    { speaker: 'BUTCH', text: 'Then we go together.' },
  ],
});

export const WALK_BARKS = Object.freeze({
  evidence: 'MARA: Start with the cancellation time. I already know what the machine said afterward.',
  plan: 'MARA: Inside line, outside line, both tickets on screen. I understand.',
  uncertainty: 'MARA: If it fails, we leave the failure on the screen long enough for Lev to record it.',
  morning: 'MARA: The cleaners are already washing the north crossing. Nobody has touched the burned paving.',
});

export const STATION_MEETING_DIALOGUE = Object.freeze([
  { speaker: 'TRAIN MARA', text: 'Butch. Who is she?' },
  { speaker: 'SQUARE MARA', text: 'Mara Venn. They cancelled my ticket here yesterday.' },
  { speaker: 'TRAIN MARA', text: 'Explain.' },
  {
    speaker: 'BUTCH',
    text: 'The reader found two ticket forty-threes. Both were valid. Before the train arrived, the system cancelled one. She stayed here and you left.',
  },
  { speaker: 'TRAIN MARA', text: 'Why did you bring her back?' },
  { speaker: 'BUTCH', text: 'I need both of you inside the scanner range at the same time, not one after the other.' },
  { speaker: 'TRAIN MARA', text: 'What will the machine do?' },
  { speaker: 'BUTCH', text: 'I do not know. That is what we are here to record.' },
  { speaker: 'SQUARE MARA', text: 'If it rejects only me again?' },
  { speaker: 'BUTCH', text: 'Lev records the screen before either ticket leaves the range.' },
  { speaker: 'TRAIN MARA', text: 'Do I get off?' },
  { speaker: 'BUTCH', text: 'No. Stand just inside the yellow line. She stays outside it.' },
  { speaker: 'SQUARE MARA', text: 'Then do it while the doors are open.' },
]);
