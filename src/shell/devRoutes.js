// Every playable test node, for `npm run dev` only. Two surfaces read this
// list: the HTML dev launcher that index.html shows in development
// (shell/devLauncher.js) and the title screen's 1111 router
// (shell/titleMenu.js). Neither exists in a production build.
//
// `checkpoint` is the save id the node belongs to; `route` is opened
// directly, skipping any transition film.
export const DEV_ROUTES = Object.freeze([
  { id: 'I', group: 'CHAPTER 1 · NIGHT SERVICE', checkpoint: 'chapter-1-start', title: 'ACT I · LOST PROPERTY', detail: 'Drag and zoom: the desk, the pigeonholes, the Conductor.', route: '/night-service.html?act=1' },
  { id: 'II', group: 'CHAPTER 1 · NIGHT SERVICE', checkpoint: 'chapter-1-act-2', title: 'ACT II · THE LUGGAGE CAR', detail: 'The punch-hole lens and the frame lift.', route: '/night-service.html?act=2' },
  { id: 'III', group: 'CHAPTER 1 · NIGHT SERVICE', checkpoint: 'chapter-1-act-3', title: 'ACT III · TWO TRUE THINGS', detail: 'The bridge through 1978 and the bell finale.', route: '/night-service.html?act=3' },
  { id: '2.1', group: 'CHAPTER 2 · BORROWED LIGHT', checkpoint: 'chapter-2-start', title: 'A · RAIN ROOFTOPS', detail: 'The punch, the bell and the one-line rule.', route: '/borrowed-light.html?section=A' },
  { id: '2.2', group: 'CHAPTER 2 · BORROWED LIGHT', checkpoint: 'chapter-2-midpoint', title: 'B · BLACKOUT', detail: 'Memory light, the Grid Stone and the hotel cut.', route: '/borrowed-light.html?section=B' },
  { id: '2.3', group: 'CHAPTER 2 · BORROWED LIGHT', checkpoint: 'chapter-2-platform', title: 'C · EVACUATION PLATFORM', detail: 'Eight-bell departure; the train remembers.', route: '/borrowed-light.html?section=C' },
  { id: '3.1', group: 'CHAPTER 3 · ECHO CITY', checkpoint: 'chapter-3-start', title: 'CITY ENTRY · THE PLATFORM', detail: 'The night service drops Butch with the claim card.', route: '/car03-3d.html' },
  { id: '3.2', group: 'CHAPTER 3 · ECHO CITY', checkpoint: 'chapter-3-start', title: 'TICKET 43 BOARD', detail: 'The lens, the stack and one punch: VENN is VELEZ.', route: '/car03-3d.html?playtest=chapter3-board' },
  { id: '3.3', group: 'CHAPTER 3 · ECHO CITY', checkpoint: 'chapter-3-start', title: 'MARKET SCANNER · WALK BESIDE', detail: 'Cross the ward scanner in step with Olek.', route: '/car03-3d.html?playtest=chapter3-market' },
  { id: '3.4', group: 'CHAPTER 3 · ECHO CITY', checkpoint: 'chapter-3-dusk', title: 'DUSK · CUT FEED & ECHO STONE', detail: 'Petar’s cut, and Seline at the fire.', route: '/car03-3d.html?playtest=chapter3-magic-stone' },
  { id: '3.5', group: 'CHAPTER 3 · ECHO CITY', checkpoint: 'chapter-3-dusk', title: 'COPPER HERON · NIGHT FIRE', detail: 'The wire into the clamp, on the next bell.', route: '/car03-3d.html?playtest=chapter3-wire' },
  { id: '3.6', group: 'CHAPTER 3 · ECHO CITY', checkpoint: 'chapter-3-dusk', title: 'STATION SCANNER · FINALE', detail: 'Walk beside the Mara ahead; board the night service.', route: '/car03-3d.html?playtest=chapter3-station' },
  { id: '4.1', group: 'CHAPTER 4 · THE PAINTED COUNTRY', checkpoint: 'chapter-4-start', title: 'GALLERY · UNDER THE GOUACHE', detail: 'Paint and wash the gallery car; three plates and the door.', route: '/painted-country.html' },
  { id: '4.2', group: 'CHAPTER 4 · THE PAINTED COUNTRY', checkpoint: 'chapter-4-start', title: 'STUDIO · THE STILL LIFE', detail: 'Six colours, as Rosa remembered them.', route: '/painted-country.html?qa=drawing' },
  { id: '4.3', group: 'CHAPTER 4 · THE PAINTED COUNTRY', checkpoint: 'chapter-4-start', title: 'PAINTED TRAIN · YARD', detail: 'Borrow six colours, paint the train, board it.', route: '/painted-country.html?qa=pigments' },
  { id: '4.4', group: 'CHAPTER 4 · THE PAINTED COUNTRY', checkpoint: 'chapter-4-start', title: 'THE LINE AHEAD', detail: 'Paint the track ahead of the train on the four-second bell.', route: '/painted-country.html?qa=line' },
  { id: '5.1', group: 'CHAPTER 5 · MUSEUM OF ONE ANSWER', checkpoint: 'chapter-5-start', title: 'MUSEUM LOBBY', detail: 'Service desk, exhibits and first direction.', route: '/museum-3d.html' },
  { id: '5.2', group: 'CHAPTER 5 · MUSEUM OF ONE ANSWER', checkpoint: 'chapter-5-start', title: 'ARCHIVE CORRIDOR', detail: 'Choose a direction from the corridor.', route: '/museum-3d.html?beat=corridor' },
  { id: '5.3', group: 'CHAPTER 5 · MUSEUM OF ONE ANSWER', checkpoint: 'chapter-5-start', title: 'MUSEUM ECHO CITY', detail: 'Echo-city reconstruction direction.', route: '/museum-3d.html?beat=echo&standalone=1' },
  { id: '5.4', group: 'CHAPTER 5 · MUSEUM OF ONE ANSWER', checkpoint: 'chapter-5-start', title: 'LABYRINTH', detail: 'Eight-key statue chase.', route: '/labyrinth.html' },
  { id: '5.5', group: 'CHAPTER 5 · MUSEUM OF ONE ANSWER', checkpoint: 'chapter-5-start', title: 'BORROWED GRID · SERVICE SHIFT', detail: 'Three-round public-power node.', route: '/borrowed-grid.html' },
  { id: '5.6', group: 'CHAPTER 5 · MUSEUM OF ONE ANSWER', checkpoint: 'chapter-5-start', title: 'PAINTED COUNTRY REVISIT', detail: 'The Chapter 5 inflation of the painted country.', route: '/chapter05-painted-country.html' },
  { id: '5.7', group: 'CHAPTER 5 · MUSEUM OF ONE ANSWER', checkpoint: 'chapter-5-start', title: 'MUSEUM COLLAPSE', detail: 'Final Archive collapse and boss handoff.', route: '/museum-3d.html?beat=collapse' },
  { id: '6.1', group: 'CHAPTER 6 · ALL WORLDS AT ONCE', checkpoint: 'chapter-6-start', title: 'CONDUCTOR I · NIGHT SERVICE', detail: 'Thrown-departures movement and suitcase memories.', route: '/final-boss.html?qa=conductor-1' },
  { id: '6.2', group: 'CHAPTER 6 · ALL WORLDS AT ONCE', checkpoint: 'chapter-6-start', title: 'CONDUCTOR II · BORROWED LIGHT', detail: 'Grid runner movement, blocks and ladder strike.', route: '/final-boss.html?qa=conductor-2' },
  { id: '6.3', group: 'CHAPTER 6 · ALL WORLDS AT ONCE', checkpoint: 'chapter-6-start', title: 'CONDUCTOR III · ECHO CITY', detail: 'Truth-dialogue movement and civic-record pressure.', route: '/final-boss.html?qa=conductor-3' },
  { id: '6.4', group: 'CHAPTER 6 · ALL WORLDS AT ONCE', checkpoint: 'chapter-6-start', title: 'CONDUCTOR IV · PAINTED COUNTRY', detail: 'Pigment collection, paint return and Mara finale.', route: '/final-boss.html?qa=conductor-4' },
  { id: '6.5', group: 'CHAPTER 6 · ALL WORLDS AT ONCE', checkpoint: 'chapter-6-start', title: 'BLACK KNIFE · HIDDEN FINALE', detail: 'Five-stone hidden boss direct entry.', route: '/hidden-final-boss.html?easter-egg=1' },
  { id: '6.6', group: 'CHAPTER 6 · ALL WORLDS AT ONCE', checkpoint: 'chapter-6-start', title: 'TRUE ENDING', detail: 'Ending presentation and credits return.', route: '/true-ending.html' },
]);

// Shell pages the dev launcher lists above the chapter nodes.
export const DEV_SHELL_ROUTES = Object.freeze([
  { id: 'T', group: 'SHELL', title: 'TITLE SCREEN', detail: 'The production title menu (type 1111 for the node router).', route: '/?title=1' },
  { id: 'C', group: 'SHELL', title: 'CREDITS', detail: 'Title screen with the credits roll open.', route: '/?credits=1' },
  { id: 'O', group: 'SHELL', title: 'OPENING STORYBOARD', detail: 'Dev-only preview of the Chapter 1 opening animation.', route: '/chapter01-opening.html' },
]);
