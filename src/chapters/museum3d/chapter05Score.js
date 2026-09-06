// One Chapter 5 score map shared by the Museum shell and its embedded
// Labyrinth. Lobby and corridor deliberately keep the same cue/id so walking
// through the Archive Wing doors does not restart the track.
export const CHAPTER5_SCORE = Object.freeze({
  lobby: Object.freeze({
    id: 'ch5-museum-promenade',
    src: '/assets/music/ch5/5.1_mussorgsky_promenade.mp3',
    volume: 0.46,
    fade: 1,
  }),
  corridor: Object.freeze({
    id: 'ch5-museum-promenade',
    src: '/assets/music/ch5/5.1_mussorgsky_promenade.mp3',
    volume: 0.46,
    fade: 1,
  }),
  labyrinth: Object.freeze({
    id: 'ch5-labyrinth-catacombae',
    src: '/assets/music/ch5/5.4_mussorgsky_catacombae.mp3',
    volume: 0.42,
    fade: 1.4,
  }),
  echo: Object.freeze({
    id: 'ch5-old-castle',
    src: '/assets/music/ch5/5.3_mussorgsky_old_castle.mp3',
    volume: 0.3,
    fade: 4.5,
  }),
  collapse: Object.freeze({
    id: 'ch5-dies-irae',
    src: '/assets/music/ch5/5.7_verdi_dies_irae.mp3',
    volume: 0.42,
    fade: 1.2,
  }),
});
