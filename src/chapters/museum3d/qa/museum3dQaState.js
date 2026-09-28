// DEV_MODE-only QA + automation hooks for the Museum: a readable text
// snapshot for the Playwright loop, fixed camera views for screenshots, and
// shortcuts that drive the real completion paths (never used by gameplay).

import { COLLAPSE_ENTRY } from '../state/collapseGauntlet.js';
import { CHAPTER_EXHIBIT_ORDER, chapterExhibit } from '../data/chapterExhibitCatalog.js';
import { CHAPTER05_DIRECTIONS } from '../directions/directionRegistry.js';
import { MAGIC_STONES, collectMagicStone } from '../../../shell/magicStones.js';
import { createSaveStore } from '../../../shell/saveSystem.js';
import { music } from '../../../shared/musicDirector.js';

export function installQaHooks(app) {
  const qa = {
    app,
    snapshot: () => app.model.getSnapshot(),
    dispatch: (type) => app.model.dispatch({ type }),
    setSimulatedLock: (on) => app.setSimulatedLock(on),

    advance(ms) {
      const steps = Math.max(1, Math.ceil(ms / (1000 / 60)));
      const dt = (ms / 1000) / steps;
      for (let index = 0; index < steps; index += 1) {
        app.controller.update(dt);
        const snapshot = app.model.getSnapshot();
        app.getActiveScene()?.update(dt, snapshot);
        app.interaction.update();
        app.dialogue.update(dt);
      }
    },

    // The same path a real completion message takes (the embedded page's
    // postMessage → direction.complete → close → _onDirectionClosed).
    completeDirection(id) {
      app.directionProgress.dispatch({ type: 'direction.complete', id });
      if (app.directionExhibit.opened) return app.directionExhibit.close();
      app._onDirectionClosed(id, true);
      return true;
    },
    solveExhibit: () => qa.completeDirection(CHAPTER05_DIRECTIONS.ONE_ANSWER),
    completeLabyrinth: () => qa.completeDirection(CHAPTER05_DIRECTIONS.LABYRINTH),

    /** Seed `count` magic stones into the active save slot (route QA). */
    seedStones(count = 5) {
      const store = createSaveStore();
      const slot = store.getActiveSlot();
      if (!store.readAll()[slot]) store.startNew(slot);
      MAGIC_STONES.slice(0, count).forEach(({ id }) => collectMagicStone(id));
      return count;
    },

    jumpTo(sceneName, spawn) {
      app.setActiveScene(sceneName);
      app.getActiveScene().enter(app.model.getSnapshot());
      if (spawn) app.controller.setPose(spawn.x, spawn.z, spawn.yaw ?? 0, spawn.pitch ?? 0);
    },

    // Face the camera from (x, z) toward (tx, tz).
    lookAt(x, z, tx, tz, pitch = 0) {
      const yaw = Math.atan2(-(tx - x), -(tz - z));
      app.controller.setPose(x, z, yaw, pitch);
    },

    setView(name) {
      if (name === 'lobby') {
        qa.jumpTo('lobby');
        qa.lookAt(-6.2, 0.4, 2, 2.5, 0.02);
      } else if (name === 'pending-exhibit') {
        qa.jumpTo('lobby');
        qa.lookAt(1.0, 2.9, 0.6, 0, -0.3);
      } else if (name === 'black-ticket-stone') {
        qa.jumpTo('lobby');
        qa.lookAt(3.3, 2.05, 3.8, 0.7, -0.52);
      } else if (name === 'corridor') {
        qa.jumpTo('corridor', { x: 9.5, z: 0, yaw: -Math.PI / 2 });
      } else if (name === 'chapter-cases') {
        qa.jumpTo('corridor');
        qa.lookAt(22, -0.6, 22, 2, -0.05);
      } else if (name === 'filed-cases') {
        qa.jumpTo('corridor');
        qa.lookAt(22, 0.9, 22, -2, -0.05);
      } else if (name === 'door-4') {
        qa.jumpTo('corridor');
        qa.lookAt(38, -0.8, 38, -2, 0);
      } else if (name === 'reveal') {
        qa.jumpTo('lobby');
        qa.lookAt(-2.2, 2.6, 1.5, 0, -0.18);
      } else if (name === 'collapse-start') {
        qa.jumpTo('corridor', COLLAPSE_ENTRY);
      } else if (name === 'collapse-door') {
        qa.jumpTo('corridor', { x: 39.9, z: 0, yaw: -Math.PI / 2 });
      } else {
        throw new Error(`unknown QA view: ${name}`);
      }
      app.renderer.render(app.scene, app.camera);
    },
  };

  window.__qa = qa;
  window.advanceTime = (ms) => qa.advance(ms);

  window.render_game_to_text = () => {
    const s = app.model.getSnapshot();
    const focused = app.interaction.focused;
    const payload = {
      note: 'coords in meters; origin at active scene root; +x east, +z south; yaw 0 faces -z',
      phase: s.phase,
      scene: app.activeSceneName,
      player: {
        x: Number(app.controller.position.x.toFixed(2)),
        y: Number(app.controller.position.y.toFixed(2)),
        z: Number(app.controller.position.z.toFixed(2)),
        yaw: Number(app.controller.getYaw().toFixed(2)),
        grounded: app.controller.isGrounded,
      },
      pointerLocked: app.controller.isLocked,
      exhibit: s.exhibit,
      labyrinth: s.labyrinth,
      lobby: s.lobby,
      collapse: s.collapse,
      collapseGameplay: app.scenes.get('corridor')?.gauntlet?.getSnapshot?.() ?? null,
      directions: app.directionProgress.getSnapshot(),
      museumExhibits: CHAPTER_EXHIBIT_ORDER.map((id) => ({ id, ...chapterExhibit(id), present: app.scenes.get('corridor')?.artifactNiches?.has(id) === true })),
      centralDisplay: app.scenes.get('lobby')?.getCentralDisplayState?.() ?? null,
      echoCityBuilt: app.scenes.has('echo'),
      focusedInteractable: focused ? { id: focused.id, prompt: typeof focused.prompt === 'function' ? focused.prompt() : focused.prompt } : null,
      card: app.cards.current,
      dialoguePlaying: app.dialogue.isPlaying,
      dialogueLine: app.dialogue.currentLine,
      frameOpen: app.directionExhibit.opened ? app.directionExhibit.directionId : null,
      labyrinthExhibit: { open: app.labyrinth.opened, completed: app.labyrinth.completed },
      music: music.qa(),
      availableActions: app.model.availableActions(),
    };
    return JSON.stringify(payload);
  };

  return qa;
}
