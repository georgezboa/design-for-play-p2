import { GAME_W, GAME_H } from '../../constants.js';

/**
 * VESSEL's voice (story bible §5): queued cyan subtitles at the bottom of the
 * lens, typed out character by character. The AI speaks in monotone — no
 * sound, just text. Usage:
 *
 *   this.vessel = makeVesselVoice(this);
 *   this.vessel.say('The metal suits you.');
 *
 * Lines queue; each types, holds, fades, then the next speaks. The caller is
 * responsible for WHERE in the language-degradation arc the line sits.
 */
export function makeVesselVoice(scene) {
  const txt = scene.add
    .text(GAME_W / 2, GAME_H - 52, '', {
      fontFamily: 'ui-monospace, Menlo, monospace',
      fontSize: '13px',
      color: '#9fd8e8',
      align: 'center',
    })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(70)
    .setAlpha(0);

  const queue = [];
  let speaking = false;

  const next = () => {
    const str = queue.shift();
    if (str === undefined) {
      speaking = false;
      return;
    }
    speaking = true;
    const line = `VESSEL — ${str}`;
    txt.setAlpha(1);
    txt.setText('');
    let i = 0;
    const typeTimer = scene.time.addEvent({
      delay: 26,
      repeat: line.length - 1,
      callback: () => {
        if (!txt.active || !scene.scene.isActive()) {
          typeTimer.remove();
          return;
        }
        i++;
        txt.setText(line.slice(0, i));
      },
    });
    const holdMs = 2200 + str.length * 28;
    scene.time.delayedCall(line.length * 26 + holdMs, () => {
      if (!txt.active) return;
      scene.tweens.add({
        targets: txt,
        alpha: 0,
        duration: 600,
        onComplete: () => next(),
      });
    });
  };

  return {
    say(str) {
      queue.push(str);
      if (!speaking) next();
    },
  };
}
