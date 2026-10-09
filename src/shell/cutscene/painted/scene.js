// Building a painted cutscene on top of its drawn twin (round 9).
//
// A painted cutscene says exactly what the drawn one says and sounds the same:
// the definition keeps the drawn one's id, title, length, music and, shot by
// shot (the ids match), its captions and cues; it brings its own pictures,
// camera, joins and painters. Captions and cues the painted shot spells out
// itself win.

import { usePlates, plateInfo } from './kit.js';

export function paintedCutscene(drawn, { plates, shots, ...rest }) {
  const byId = new Map(drawn.shots.map((shot) => [shot.id, shot]));
  return {
    id: drawn.id,
    title: drawn.title,
    length: drawn.length,
    music: drawn.music,
    painted: true,
    chrome: 'painted',
    plates,
    prepare: () => usePlates(plates),
    prepareTimeoutMs: 6000,
    ...rest,
    shots: shots.map((shot) => {
      const twin = byId.get(shot.id) ?? {};
      return {
        duration: twin.duration,
        captions: twin.captions,
        cues: twin.cues,
        blackout: twin.blackout,
        ...shot,
      };
    }),
  };
}

/** The drawn twin's cue times (shot seconds) for one effect in one shot: e.g. its soft bells. */
export function cueTimes(drawn, shotId, sfx) {
  const shot = drawn.shots.find((s) => s.id === shotId);
  return (shot?.cues ?? []).filter((cue) => cue.sfx === sfx).map((cue) => cue.at);
}

/** Pick the geometry for what is built: `stand` while the plate is a stand-in, else `real`. */
export function geometry(plateId, real, stand = real) {
  return plateInfo(plateId)?.standIn ? { ...real, ...stand } : real;
}
