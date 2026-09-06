// The only system allowed to move the player between spaces. Sequence:
// fade out → exit current scene → swap root → enter next with the model
// snapshot → place the player → fade in → release pointer lock and wait for
// a fresh user gesture (CLICK TO RESUME).

import { canTransition } from '../state/chapter05Model.js';

export class TransitionDirector {
  constructor({ fadeEl, onNeedRelock }) {
    this.fadeEl = fadeEl;
    this.onNeedRelock = onNeedRelock;
    this._busy = false;
  }

  get isBusy() {
    return this._busy;
  }

  fade(on) {
    return new Promise((resolve) => {
      this.fadeEl.classList.toggle('on', on);
      window.setTimeout(resolve, 240);
    });
  }

  _fade(on) {
    return this.fade(on);
  }

  // app: { model, scenes: Map<name, sceneCtl>, controller, setActiveScene(name) }
  async transition(app, targetName, {
    fromPhase,
    toPhase,
    spawn,
    action,
    occlude = true,
    preserveControl = false,
  }) {
    if (this._busy) return false;
    if (fromPhase && toPhase && !canTransition(fromPhase, toPhase)) {
      console.warn(`[TransitionDirector] illegal transition ${fromPhase} → ${toPhase}`);
      return false;
    }
    const phaseBefore = app.model.getSnapshot().phase;
    if (fromPhase && phaseBefore !== fromPhase) {
      console.warn(`[TransitionDirector] scene transition expected ${fromPhase}, found ${phaseBefore}`);
      return false;
    }
    this._busy = true;
    try {
      if (action) {
        const result = app.model.dispatch(action);
        const phaseAfter = app.model.getSnapshot().phase;
        if (!result.changed || (toPhase && phaseAfter !== toPhase)) {
          console.warn(
            `[TransitionDirector] rejected ${action.type}; keeping ${app.activeSceneName ?? phaseBefore} active`,
          );
          return false;
        }
      }
      // Resolve assets first. Physical thresholds can then swap two resident
      // roots in the same frame without a loading flash or black full-screen
      // cover; ordinary chapter cuts keep the existing fade.
      const destination = app.scenes.get(targetName);
      if (destination?.prepare) await destination.prepare();
      if (occlude) await this._fade(true);

      const current = app.getActiveScene();
      if (current) current.exit();

      app.setActiveScene(targetName);
      const next = app.getActiveScene();
      next.enter(app.model.getSnapshot());

      if (spawn) {
        const resolvedSpawn = next.resolveSpawn?.(spawn) ?? spawn;
        app.controller.setPose(
          resolvedSpawn.x,
          resolvedSpawn.z,
          resolvedSpawn.yaw ?? 0,
          resolvedSpawn.pitch ?? 0,
        );
      }

      if (occlude) await this._fade(false);

      if (!preserveControl) {
        // Never silently recapture the mouse after a cinematic transition.
        app.controller.unlock();
        this.onNeedRelock?.();
      }
      return true;
    } finally {
      this._busy = false;
    }
  }
}
