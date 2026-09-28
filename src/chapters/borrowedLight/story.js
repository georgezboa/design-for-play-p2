// Chapter 2 · BORROWED LIGHT — words.
//
// The mechanic's lines and Mara's letter are carried over from the retired
// Phaser parkour version of this chapter; the letter is
// kept word for word. Nothing here defines Butch's relation to Mara.

export const CHAPTER_TITLE = 'BORROWED LIGHT';
export const CHAPTER_NUMBER = 2;

export const MECHANIC_LINES = Object.freeze([
  Object.freeze({ speaker: 'ROOFTOP MECHANIC', text: 'That punch. You\'re off the night service.' }),
  Object.freeze({ speaker: 'ROOFTOP MECHANIC', text: 'She came through three nights ago. Took the same roofs. Said you\'d be along.' }),
  Object.freeze({ speaker: 'ROOFTOP MECHANIC', text: 'This city runs on borrowed light. Punch a box and it switches on at the next bell. Try the one by the edge.' }),
  Object.freeze({ speaker: 'ROOFTOP MECHANIC', text: 'One line, one moment. Punch two on the same colour and the first one forgets.' }),
  Object.freeze({ speaker: 'ROOFTOP MECHANIC', text: 'She left a letter at the platform. She said the person looking for her would know the name.' }),
]);

// A repeat visit gets the one line that matters.
export const MECHANIC_REPEAT = Object.freeze({ speaker: 'ROOFTOP MECHANIC', text: 'Punch it, then wait for the bell. The city keeps its own time.' });

export const MARA_LETTER = Object.freeze({
  speaker: 'MARA',
  role: 'letter · left on the platform bench',
  lines: Object.freeze([
    'Butch— I made it through this city, but I could not wait here.',
    'The train opened the next door before dawn. I went on.',
    'If you are following me, keep moving. I will leave another mark where I can. — Mara',
  ]),
});

export const ARCHIVE_CARD_B1 = Object.freeze({
  id: 'B1',
  heading: 'ARCHIVE CARD B1',
  subheading: 'CITY LINE · SINGLE · PUNCHED',
  lines: Object.freeze([
    'A city-line ticket stub, pinned inside the glass of room 4, Hotel Meridian.',
    'Punched once at the terminal. The same clip as the 1978 claim: MARA VELEZ.',
    'Someone kept it where it could be seen from the roofs.',
  ]),
});

export const HINTS = Object.freeze({
  punch: 'F · PUNCH',
  read: 'E · READ',
  talk: 'E · TALK',
  listen: 'HOLD Q · LISTEN',
  busy: 'LINE HOLDING · PUNCH ITS LIT TAG TO CUT',
  cut: 'LINE CUT · FREE AFTER THE FLICKER',
});

export const STONE_TOAST = 'GRID STONE · AN UNFILED OBJECT';
