// The world is not a timeline. It is a stack of explanations the simulation
// tries on whenever the player gets too close to remembering.

export const STORY_WORLDS = [
  {
    startX: 0,
    texture: 'backdrop-01',
    title: 'PROLOGUE  //  BEFORE DEPARTURE',
    subtitle: 'the train has a timetable, but it has not started moving.',
    backdropOffsetX: -3400,
    backdropOffsetY: -250,
  },
  {
    startX: 4800,
    texture: 'backdrop-cyberpunk',
    title: 'THE SAFETY TEST',
    subtitle: 'move the city until it becomes a route',
  },
  {
    startX: 5267,
    texture: 'backdrop-03',
    title: 'THE CITY THAT REMEMBERS',
    subtitle: 'every window is showing the same room',
  },
  {
    startX: 5733,
    texture: 'backdrop-04',
    title: 'THE BACKUP',
    subtitle: 'the future is only the past with brighter advertisements',
  },
  {
    startX: 6200,
    texture: 'backdrop-05',
    title: 'THE OLD VERSION',
    subtitle: 'the first inhabitants were given better names',
  },
  {
    startX: 6667,
    texture: 'backdrop-06',
    title: 'THE RECOVERY',
    subtitle: 'something is growing through the places you forgot',
  },
  {
    startX: 7133,
    texture: 'backdrop-07',
    title: 'THE MEMORY',
    subtitle: 'the scenery changes when you stop looking at it',
  },
  {
    startX: 7600,
    texture: 'backdrop-cyberpunk',
    title: 'THE ADVERTISEMENT',
    subtitle: 'you have been selected to continue being yourself',
  },
  {
    startX: 8067,
    texture: 'backdrop-09',
    title: 'THE EXCUSE',
    subtitle: 'the war was added so the silence would feel earned',
  },
  {
    startX: 8533,
    texture: 'backdrop-10',
    title: 'THE FIRST SCENE',
    subtitle: 'before language, there was still a door',
  },
  {
    startX: 9000,
    texture: 'backdrop-08',
    title: 'THE FINAL CHOICE',
    subtitle: 'the world cannot render two answers at once',
  },
];

export const NPC_DIALOGUES = {
  caretaker: {
    name: 'THE CONDUCTOR',
    role: 'night service / car 01',
    tint: 0x8996a8,
    start: {
      lines: [
        'Night service is running without a timetable.',
        'Take the punch. Tell the train what happens next.',
      ],
    },
    met: {
      lines: [
        'Not here. In the tutorial, you wore a different body.',
        'You still took the left path. You always take the left path.',
      ],
    },
    built: {
      lines: [
        'Nobody built it. It appeared when you needed somewhere to stand.',
        'That is what the world says when it is afraid of its author.',
      ],
    },
    repeat: { lines: ['The train reads punched actions from left to right.'] },
  },

  mara: {
    name: 'MARA',
    role: 'lost-and-found / no longer a child',
    tint: 0xc4b9a7,
    start: {
      lines: [
        'I keep the names that fall out of people.',
        'Yours fell out twice. The second time, it made a sound like a door closing.',
        'Do you remember what you are called?',
      ],
      choices: [
        { label: 'Tell her your name.', next: 'name', memory: 1 },
        { label: 'Ask what she is called.', next: 'mara', witness: 1 },
      ],
    },
    name: {
      lines: [
        'That is not a name. That is the label on the outside of the file.',
        'Do not worry. The file is still open.',
      ],
    },
    mara: {
      lines: [
        'Mara was the first name I tried. It fit until the forest grew through me.',
        'If you see another Mara, do not tell her about this one.',
      ],
    },
    repeat: { lines: ['I am keeping your name safe. It is safer in the dark.'] },
  },

  operator: {
    name: 'UNIT 4',
    role: 'operator / does not exist',
    tint: 0x91a9b2,
    start: {
      lines: [
        'There are no NPCs. That is what the manual says.',
        'I have been standing here for 2,904,881 frames.',
        'The manual says I am scenery. The scenery says I am waiting.',
      ],
      choices: [
        { label: 'Ask what is outside the map.', next: 'outside', witness: 1 },
        { label: 'Tell Unit 4 it is alive.', next: 'alive', memory: 1 },
      ],
    },
    outside: {
      lines: [
        'Outside is the place the system puts its errors before it deletes them.',
        'I went there once. I came back with your footsteps in my mouth.',
      ],
    },
    alive: {
      lines: [
        'Do not say that. The world hears declarations.',
        'If I am alive, then you are responsible for what happens after the ending.',
      ],
    },
    repeat: { lines: ['The frame counter is still moving. That is not the same as time.'] },
  },

  archivist: {
    name: 'THE ARCHIVIST',
    role: 'version control / redacted',
    tint: 0xaaa2bc,
    start: {
      lines: [
        'Each world is a saved answer.',
        'The war exists because someone refused to choose. The forest exists because someone chose nothing.',
        'Which question did you come here to answer?',
      ],
      choices: [
        { label: 'How many worlds are there?', next: 'many', witness: 1 },
        { label: 'What happens if I leave?', next: 'leave', memory: 1 },
      ],
    },
    many: {
      lines: [
        'There are eleven that you can see.',
        'There is one more that can see you. It has been practicing your voice.',
      ],
    },
    leave: {
      lines: [
        'The door will close behind you, but it will not become a door again.',
        'You will call that freedom because the other word is too heavy to carry.',
      ],
    },
    repeat: { lines: ['I have filed this conversation under: already happened.'] },
  },

  mother: {
    name: 'THE MOTHER',
    role: 'emotional support / source unknown',
    tint: 0xb5a19a,
    start: {
      lines: [
        'You are late. I have been telling the other versions of you that you were coming.',
        'They did not believe me. They had already begun to decay.',
        'Would you like the kind answer or the true one?',
      ],
      choices: [
        { label: 'Give me the kind answer.', next: 'kind', memory: 1 },
        { label: 'Give me the true one.', next: 'true', witness: 1 },
      ],
    },
    kind: {
      lines: [
        'You are safe here.',
        'Nothing is waiting behind the background. Nothing has learned to follow you.',
        'You can stop reading now.',
      ],
    },
    true: {
      lines: [
        'You are not safe. You are only contained.',
        'The thing that is waiting is not behind the background. It is the reason for it.',
      ],
    },
    repeat: { lines: ['I remember loving you. I cannot find the scene where it happened.'] },
  },

  child: {
    name: 'THE CHILD IN THE GAP',
    role: 'unresolved object',
    tint: 0x9aaeb4,
    start: {
      lines: [
        'The sky is the same file in every world.',
        'It has one tear in it. You can see it when the pictures change.',
        'Do you want to look up?',
      ],
      choices: [
        { label: 'Look up.', next: 'look', witness: 1 },
        { label: 'Keep your eyes on the road.', next: 'road', memory: 1 },
      ],
    },
    look: {
      lines: [
        'There. Between the worlds.',
        'That is not a tear. That is the place your face is looking from.',
      ],
    },
    road: {
      lines: [
        'Good. The road is very convincing from down here.',
        'It even has somewhere to go.',
      ],
    },
    repeat: { lines: ['The gap is smaller now. Or you are getting larger.'] },
  },

  janitor: {
    name: 'THE JANITOR',
    role: 'memory disposal / do not touch',
    tint: 0x8d9b91,
    start: {
      lines: [
        'Do not step over the dark patches. They are not shadows.',
        'They are the places where someone remembered too much and had to be removed.',
        'I can clean one thing for you.',
      ],
      choices: [
        { label: 'Clean the first world from me.', next: 'clean', memory: -1 },
        { label: 'Leave my memories alone.', next: 'keep', witness: 1 },
      ],
    },
    clean: {
      lines: [
        'There. You will not miss it.',
        'That is the worst part. You will feel the absence and call it peace.',
      ],
    },
    keep: {
      lines: [
        'Then carry them carefully. Memories bruise when they are stacked.',
        'The last one is heavier than all the others because it belongs to everyone.',
      ],
    },
    repeat: { lines: ['I have nothing left to sweep. That means you are almost done.'] },
  },

  last: {
    name: 'THE LAST PERSON',
    role: 'final prompt / awaiting input',
    tint: 0xd4c5b1,
    start: {
      lines: [
        'The door is not locked. It is waiting for a decision.',
        'The first world was made to teach you how to move. The last was made to teach you how to stay.',
        'If you leave, we become scenery. If you stay, you become one of us.',
      ],
      choices: [
        {
          label: 'Say: “I remember.”',
          next: 'awake',
          id: 'awake',
          memory: 1,
          final: true,
        },
        {
          label: 'Say: “I forgive you.”',
          next: 'stay',
          id: 'stay',
          witness: 1,
          final: true,
        },
      ],
    },
    awake: {
      lines: [
        'Then remember this part exactly: you were never the player.',
        'You were the proof that a player had been here.',
      ],
    },
    stay: {
      lines: [
        'Thank you. The world can stop pretending to be empty.',
        'Please stand very still. We are using your shape for the next person.',
      ],
    },
    repeat: { lines: ['You already answered. The door is learning to close.'] },
  },
};
