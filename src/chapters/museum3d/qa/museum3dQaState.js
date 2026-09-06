// QA + automation hooks for the P0 graybox. Exposes a readable text snapshot
// for the Playwright loop and fixed camera views for the required screenshot
// set. Not part of the player-facing build path.

// Fixed views required for the Gate 0–1 report:
//   lobby         — ordinary service lobby
//   corridor      — archive corridor first pass
//   echo          — Echo City entrance (spawn plaza, gate ahead)
//   reclassified  — reclassified lobby (desk in glass, doorway behind)
import { ECHO_CITY_ENTRY } from '../scenes/EchoCityWalkingSim.js';
import { COLLAPSE_ENTRY } from '../state/collapseGauntlet.js';
import { CHAPTER_EXHIBIT_ORDER, chapterExhibit } from '../data/chapterExhibitCatalog.js';
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

    // Drive the real, legal action chain to the reclassified return state
    // without fades — used by the reclassified screenshot view.
    playthroughToReturn() {
      for (const type of [
        'inspectTicket', 'carryTicket', 'enterCorridor', 'corridorLoop',
        'enterEchoCity', 'takeNightKit',
        'openStationPanel', 'switchStationLamp',
        'releaseMarketPawl', 'lockMarketShutters',
        'clearFountainGrate', 'restoreFountainCirculation',
        'unlockArchiveSlot', 'returnArchiveLedger', 'claimNightBadge',
        'returnTicket', 'returnToMuseum',
      ]) {
        app.model.dispatch({ type });
      }
      app.directionProgress.dispatch({ type: 'artifact.take', id: 'echo-city' });
      app.directionProgress.dispatch({ type: 'artifact.display', id: 'echo-city' });
      app.setActiveScene('lobby');
      app.getActiveScene().enter(app.model.getSnapshot());
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
      } else if (name === 'central-display') {
        qa.jumpTo('lobby');
        qa.lookAt(-3.45, 0.1, 1.5, 0, -0.02);
      } else if (name === 'black-knife-stone') {
        qa.jumpTo('lobby');
        qa.lookAt(-3.65, 1.25, -3.65, 3.2, -0.03);
      } else if (name === 'corridor') {
        qa.jumpTo('corridor', { x: 9.5, z: 0, yaw: -Math.PI / 2 });
      } else if (name === 'echo') {
        qa.jumpTo('echo', ECHO_CITY_ENTRY.spawn);
      } else if (name === 'reclassified') {
        qa.playthroughToReturn();
        qa.lookAt(-3.4, -4.4, 1.2, 3.2, 0.02);
      } else if (name === 'maintenance') {
        qa.playthroughToReturn();
        qa.lookAt(0, 7.0, 0, 11.2, -0.04);
      } else if (name === 'collapse-start') {
        qa.jumpTo('corridor', COLLAPSE_ENTRY);
      } else if (name === 'collapse-door') {
        qa.jumpTo('corridor', { x: 39.9, z: 0, yaw: -Math.PI / 2 });
      } else {
        throw new Error(`unknown QA view: ${name}`);
      }
      // render one frame immediately so canvas captures are fresh
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
        verticalVelocity: Number(app.controller.verticalVelocity.toFixed(2)),
      },
      pointerLocked: app.controller.isLocked,
      ticket: s.ticket,
      echoRecord: s.echoRecord,
      echoGameplay: app.activeSceneName === 'echo'
        ? app.getActiveScene()?.getGameplayState?.() ?? null
        : null,
      minimap: app.minimap?.getSnapshot?.() ?? { visible: false, markers: [] },
      corridor: s.corridor,
      lobby: s.lobby,
      collapse: s.collapse,
      collapseGameplay: app.scenes.get('corridor')?.gauntlet?.getSnapshot?.() ?? null,
      directions: app.directionProgress.getSnapshot(),
      museumExhibits: CHAPTER_EXHIBIT_ORDER.map((id) => {
        const exhibit = chapterExhibit(id);
        return {
          id,
          chapter: exhibit.chapter,
          title: exhibit.title,
          mode: exhibit.mode,
          present: id === 'last-train' || app.scenes.get('corridor')?.artifactNiches?.has(id) === true,
        };
      }),
      centralDisplay: app.scenes.get('lobby')?.getCentralDisplayState?.() ?? null,
      focusedInteractable: focused ? { id: focused.id, prompt: typeof focused.prompt === 'function' ? focused.prompt() : focused.prompt } : null,
      dialoguePlaying: app.dialogue.isPlaying,
      dialogueLine: app.dialogue.currentLine,
      dialogueChoice: app.dialogue.choiceState,
      labyrinthExhibit: {
        open: app.labyrinth.opened,
        completed: app.labyrinth.completed,
      },
      music: music.qa(),
      availableActions: app.model.availableActions(),
    };
    return JSON.stringify(payload);
  };

  return qa;
}
