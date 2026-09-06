import Phaser from 'phaser';
import { magicStoneSnapshot } from './shell/magicStones.js';
import './shell/titleMenu.css';
import { GAME_W, GAME_H, GRAVITY } from './constants.js';
import { DEV_MODE, hasDevRoute } from './devMode.js';
import { installDevMenuReturnControl } from './devMenuReturn.js';
import BootScene from './scenes/BootScene.js';
import DevMenuScene from './scenes/DevMenuScene.js';
import GameScene from './scenes/GameScene.js';
import HudScene from './scenes/HudScene.js';
import CyberpunkParkourScene from './cars/cyberpunkParkour/CyberpunkParkourScene.js';
import { createTitleMenu } from './shell/titleMenu.js';
import { applySettings, readSettings, volumeForChannel } from './shell/saveSystem.js';
import { installPauseMenu } from './shell/pauseMenu.js';

// Phaser starts the first scene in the array. The chapter select is added only
// for `npm run dev`, and only when the URL does not already name a starting
// point — so every `?qa=` / `?chapter=` link in docs/ stays a deep link
// instead of bouncing off a menu. In `npm run prod` the scene is never
// registered at all.
const chapterSelect = DEV_MODE && !hasDevRoute();
const scenes = chapterSelect
  ? [DevMenuScene, BootScene, GameScene, HudScene, CyberpunkParkourScene]
  : [BootScene, GameScene, HudScene, CyberpunkParkourScene];

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#03050a',
  render: {
    antialias: false,
    pixelArt: true,
    roundPixels: true,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: GRAVITY },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: scenes,
};

  let game = null;

const startGame = () => {
  if (game) return game;
  game = new Phaser.Game(config);
  const syncSettings = (settings = readSettings()) => {
    game.sound.volume = volumeForChannel(settings, 'sfx');
    game.registry.set('nightfallSettings', settings);
  };
  syncSettings(applySettings(readSettings()));
  window.addEventListener('nightfall:settings', (event) => syncSettings(event.detail));

  // Let the game reliably claim keyboard focus after a player clicks it.
  game.canvas.setAttribute('tabindex', '0');
  game.canvas.setAttribute('role', 'application');
  game.canvas.setAttribute('aria-label', 'Nightfall game canvas');
  game.canvas.addEventListener('pointerdown', () => game.canvas.focus());

  // Production chapters return to the title; development routes return to the
  // chapter launcher. Standalone chapter pages install the same control.
  installDevMenuReturnControl();

  // Handy in the devtools console:
  //   game.scene.getScene('Game').player
  //   game.scene.getScene('Game').physics.world.drawDebug = true
  window.game = game;
  installPauseMenu({
    checkpointId: () => game.scene.getScene('CyberpunkParkour')?.sys?.isActive()
      ? 'chapter-2-start'
      : 'prologue-start',
  });
  return game;
};

const creditsRequested = new URLSearchParams(window.location.search).get('credits') === '1';
const playRequested = new URLSearchParams(window.location.search).get('play') === '1';
if (creditsRequested) createTitleMenu({ onStart: startGame, openCredits: true });
else if (DEV_MODE || playRequested) startGame();
else createTitleMenu({ onStart: startGame });

// Read-only diagnostics for automated smoke tests and content-pipeline QA.
// This does not advance or mutate gameplay state.
const renderGameToText = () => {
  if (document.getElementById('nightfall-title')) {
    const title = document.getElementById('nightfall-title');
    const dialog = title.querySelector('#nf-dialog');
    const creditsPanel = title.querySelector('.nf-credits-panel');
    return JSON.stringify({
      scene: title.dataset.state === 'exited' ? 'Exited' : 'TitleMenu',
      focused: document.activeElement?.textContent?.trim() ?? null,
      titleVisible: true,
      dialog: dialog?.open ? dialog.querySelector('h2')?.textContent ?? 'dialog' : null,
      chapterSelect: title.dataset.chapterSelect === 'open' && Boolean(dialog?.open),
      chapterEntries: title.dataset.chapterSelect === 'open' && dialog?.open
        ? [...dialog.querySelectorAll('[data-chapter]')].map((entry) => ({
            number: Number(entry.dataset.chapter),
            title: entry.querySelector('strong')?.textContent ?? '',
            detail: entry.querySelector('small')?.textContent ?? '',
          }))
        : [],
      credits: creditsPanel
        ? {
            visible: Boolean(dialog?.open),
            team: [...creditsPanel.querySelectorAll('.nf-credit-ticket strong')].map((node) => node.textContent),
            music: creditsPanel.querySelector('.nf-credit-section--music strong')?.textContent ?? null,
            musicState: title.dataset.creditMusic ?? 'stopped',
            rollState: title.dataset.creditRoll ?? 'stopped',
            playbackRate: title.dataset.creditRate ?? '1.00x',
            rollTimeMs: Math.round(title.__creditsAnimation?.currentTime ?? 0),
          }
        : null,
    });
  }
  if (!game) return JSON.stringify({ scene: 'TitleMenu', titleVisible: true });
  const cyberpunkScene = game.scene.getScene('CyberpunkParkour');
  if (cyberpunkScene?.sys?.isActive()) {
    return JSON.stringify({
      coordinateSystem: 'origin top-left; +x right; +y down; world units are pixels',
      scene: 'CyberpunkParkour',
      parkour: cyberpunkScene.getTextState(),
      performance: {
        fps: Math.round(game.loop.actualFps || 0),
        timeScale: cyberpunkScene.time?.timeScale ?? 1,
      },
    });
  }
  const scene = game.scene.getScene('Game');
  const player = scene?.player;
  const devMenu = game.scene.getScene('DevMenu');
  return JSON.stringify({
    magicStones: magicStoneSnapshot(),
    coordinateSystem: 'origin top-left; +x right; +y down; world units are pixels',
    devMode: DEV_MODE,
    scene: scene?.sys?.isActive()
      ? 'Game'
      : devMenu?.sys?.isActive()
        ? 'DevMenu'
        : 'Boot',
    chapterSelect: devMenu?.sys?.isActive()
      ? {
          index: devMenu.index,
          label: devMenu.entries?.[devMenu.index]?.label ?? null,
          route: devMenu.entries?.[devMenu.index]?.query ?? null,
          entries: devMenu.entries?.map((entry) => entry.label) ?? [],
        }
      : null,
    world: scene
      ? {
          index: scene.activeWorldIndex,
          previewIndex: scene.previewWorldIndex,
          loadedAssets: scene.worldAssetLoader?.loadedAssetIds() ?? [],
          backdropChunks: scene.backdropChunks?.length ?? 0,
          tutorialArt: scene.tutorialTrainRoomsArt?.getState() ?? scene.tutorialCarArt?.getState() ?? null,
          tutorial: {
            powerState: scene.registry.get('tutorialPowerState'),
            powerRestored: scene.registry.get('tutorialPowerRestored'),
            exitLocked: !scene.registry.get('tutorialPowerRestored'),
            objective: scene.registry.get('tutorialPowerRestored')
              ? 'enter the next car'
              : scene.timetablePuzzle
                ? scene.timetablePuzzle.objectiveText()
              : !scene.tutorialPuzzle?.briefed
                ? 'speak with the conductor'
              : scene.tutorialPuzzle?.phase === 'recording'
                ? 'record yourself standing on the PAST pressure plate'
                : scene.tutorialPuzzle?.phase === 'playback'
                  ? !scene.tutorialPuzzle.routeActive
                    ? scene.getTutorialStage()?.underfloor
                      ? 'look below and align with the remembered shadow at both resonance columns'
                      : 'trace the remembered pulse to the first wrong route'
                    : 'activate PRESENT while the routed past self holds PAST'
                  : 'start the memory recorder',
            timetablePuzzle: scene.timetablePuzzle && scene.tutorialPuzzle
              ? {
                  phase: scene.tutorialPuzzle.phase,
                  briefed: scene.tutorialPuzzle.briefed,
                  stageIndex: scene.tutorialPuzzle.stageIndex,
                  stageId: scene.getTutorialStage()?.id,
                  stageComplete: scene.tutorialPuzzle.stageComplete,
                  queue: scene.tutorialPuzzle.queue,
                  solutionLength: scene.getTutorialStage()?.solution?.length ?? 0,
                  executionStep: scene.tutorialPuzzle.executionStep,
                  activeCommand: scene.tutorialPuzzle.activeCommand,
                  drum: scene.getTutorialStage()?.drum && scene.tutorialPuzzle.drum
                    ? {
                        key: scene.tutorialPuzzle.drumKey ?? 0,
                        running: scene.tutorialPuzzle.drum.running,
                        activeSlot: scene.tutorialPuzzle.drum.activeSlot,
                        waiting: scene.tutorialPuzzle.drum.waiting,
                        slots: scene.tutorialPuzzle.drum.slots.map((slot) => slot
                          ? { command: slot.command, status: slot.status }
                          : null),
                      }
                    : null,
                  // Section III. Built from the local-air-circuit snapshot so
                  // this text cannot drift from what the gauge is showing.
                  airCircuit: scene.getTutorialStage()?.airCircuit && scene.tutorialPuzzle.airCircuit
                    ? (() => {
                        const snap = scene.tutorialPuzzle.airCircuit.snapshot();
                        return {
                          pressure: Math.round(snap.door.pressure),
                          flow: snap.door.flow,
                          venting: snap.door.venting,
                          isolateClosed: snap.isolateClosed,
                          doorLatchReleased: snap.doorLatchReleased,
                          doorState: snap.doorState,
                          stageComplete: snap.stageComplete,
                          stalledOnSupply: snap.stalledOnSupply,
                        };
                      })()
                    : null,
                  firstWeight: scene.getTutorialStage()?.firstWeight && scene.tutorialPuzzle.firstWeight
                    ? (() => {
                        const snap = scene.tutorialPuzzle.firstWeight.snapshot();
                        return {
                          caseFalling: snap.caseFalling,
                          caseDetent: snap.caseDetent,
                          grabbed: snap.grabbed,
                          firstBalanced: snap.firstBalanced,
                          tagPunched: snap.tagPunched,
                          playerWeightRevealed: snap.playerWeightRevealed,
                          tilt: Number(snap.tilt.toFixed(3)),
                          level: snap.level,
                          atExit: snap.atExit,
                          finalBalanceProgress: Number(snap.finalBalanceProgress.toFixed(2)),
                          stageComplete: snap.stageComplete,
                          qaFrozen: scene.timetablePuzzle?.firstWeightQaFreeze ?? false,
                        };
                      })()
                    : null,
                  twoTrueThings: scene.getTutorialStage()?.twoTrueThings && scene.tutorialPuzzle.twoTrueThings
                    ? (() => {
                        const snap = scene.tutorialPuzzle.twoTrueThings.snapshot();
                        return {
                          casesFallen: snap.casesFallen,
                          tags: snap.tags,
                          amberConnected: snap.amberConnected,
                          cyanConnected: snap.cyanConnected,
                          cradleSupport: snap.cradleSupport,
                          cases: snap.cases,
                          grabbedCase: snap.grabbedCase,
                          separated: snap.separated,
                          level: snap.level,
                          settleProgress: Number(snap.settleProgress.toFixed(2)),
                          stageComplete: snap.stageComplete,
                          qaFrozen: scene.timetablePuzzle?.twoTrueThingsQaFreeze ?? false,
                        };
                      })()
                    : null,
                  trainRemembers: scene.getTutorialStage()?.trainRemembers && scene.tutorialPuzzle.trainRemembers
                    ? (() => {
                        const snap = scene.tutorialPuzzle.trainRemembers.snapshot();
                        return {
                          phase: snap.phase,
                          traceSource: snap.traceSource,
                          poseIndex: snap.poseIndex,
                          echoX: Number(snap.echoX.toFixed(3)),
                          presentX: Number(snap.presentX.toFixed(3)),
                          grabbed: snap.grabbed,
                          balanceError: Number(snap.balanceError.toFixed(3)),
                          balanced: snap.balanced,
                          poseHoldProgress: Number(snap.poseHoldProgress.toFixed(2)),
                          redactionProgress: Number(snap.redactionProgress.toFixed(2)),
                          catchReady: snap.catchReady,
                          caught: snap.caught,
                          trainHelping: snap.trainHelping,
                          trainHelpProgress: Number(snap.trainHelpProgress.toFixed(2)),
                          stageComplete: snap.stageComplete,
                          qaFrozen: scene.timetablePuzzle?.trainRemembersQaFreeze ?? false,
                        };
                      })()
                    : null,
                  mechanicalTable: scene.getTutorialStage()?.mechanicalTable && scene.tutorialPuzzle.mechanicalTable
                    ? (() => {
                        const snap = scene.tutorialPuzzle.mechanicalTable.snapshot();
                        return {
                          ...snap,
                          pressure: Number(snap.pressure.toFixed(2)),
                          bearing: snap.bearing ? {
                            ...snap.bearing,
                            progress: Number(snap.bearing.progress.toFixed(3)),
                          } : null,
                          ghost: snap.ghost ? {
                            ...snap.ghost,
                            progress: Number(snap.ghost.progress.toFixed(3)),
                          } : null,
                          panel: {
                            open: scene.timetablePuzzle?.mechanicalPanelMode === `table-${snap.phase}`,
                            hover: scene.timetablePuzzle?._mechanicalHoverId ?? null,
                            pressed: scene.timetablePuzzle?._mechanicalPressedId ?? null,
                            hitIds: scene.timetablePuzzle?.mechanicalPanel?.hits?.map((hit) => hit.id) ?? [],
                          },
                        };
                      })()
                    : null,
                  // Phase IV. Built from the weight-transfer snapshot so this
                  // text cannot drift from what the bags, tilt and sparks are
                  // showing.
                  weightTransfer: scene.getTutorialStage()?.weightTransfer && scene.tutorialPuzzle.weightTransfer
                    ? (() => {
                        const snap = scene.tutorialPuzzle.weightTransfer.snapshot();
                        return {
                          suspensionPressure: Math.round(snap.suspension.pressure),
                          suspensionFlow: snap.suspension.flow,
                          suspensionHealth: Number(snap.suspensionHealth.toFixed(3)),
                          trolleyX: Number(snap.trolleyX.toFixed(3)),
                          grabbed: snap.grabbed,
                          readyForTest: snap.readyForTest,
                          testAttempt: snap.testAttempt,
                          energized: snap.motor.energized,
                          wheelState: snap.motor.wheelState,
                          current: Number(snap.motor.current.toFixed(3)),
                          driveLoad: Number(snap.motor.axleLoad[snap.motor.driveBogie].toFixed(3)),
                          carDisplacement: Number(snap.motor.carDisplacement.toFixed(3)),
                          stageComplete: snap.stageComplete,
                          trace: snap.trace,
                        };
                      })()
                    : null,
                  // Phase V (READ THE BOGIE). Built from the bogie-diagnosis
                  // snapshot so this text cannot drift from what the shoes,
                  // spokes, pin and gauge are showing.
                  bogieDiagnosis: scene.getTutorialStage()?.bogieService && scene.tutorialPuzzle.bogieDiagnosis
                    ? (() => {
                        const snap = scene.tutorialPuzzle.bogieDiagnosis.snapshot();
                        return {
                          brakePressure: Math.round(snap.brake.pressure),
                          brakeFlow: snap.brake.flow,
                          brakeIsolated: snap.brake.isolated,
                          frontWheelTurning: snap.front.wheelTurning,
                          frontBrakeReleased: snap.front.brakeReleased,
                          rearWheelTurning: snap.rear.wheelTurning,
                          rearBrakeReleased: snap.rear.brakeReleased,
                          rearServiceLockEngaged: snap.rear.serviceLockEngaged,
                          rearRepaired: snap.rear.repaired,
                          faultLocalized: snap.faultLocalized,
                          faultyBogie: snap.faultyBogie,
                          selectedBogie: snap.selectedBogie,
                          observations: snap.observations,
                          motorEnergized: snap.motor.energized,
                          motorWheelState: snap.motor.wheelState,
                          stageComplete: snap.stageComplete,
                          mechanicalPanel: {
                            open: scene.timetablePuzzle?.mechanicalPanelMode === 'bogie',
                            hover: scene.timetablePuzzle?._mechanicalHoverId ?? null,
                            pressed: scene.timetablePuzzle?._mechanicalPressedId ?? null,
                            ventHeld: Boolean(scene.timetablePuzzle?._mechanicalVentHeld),
                            bounce: scene.timetablePuzzle?._mechanicalBounce?.id ?? null,
                            pointerDownCount: scene.timetablePuzzle?._mechanicalPointerDownCount ?? 0,
                            lastPointerDown: scene.timetablePuzzle?._mechanicalLastPointerDown ?? null,
                            hitIds: scene.timetablePuzzle?.mechanicalPanel?.hits?.map((hit) => hit.id) ?? [],
                            hits: scene.timetablePuzzle?.mechanicalPanel?.hits?.map((hit) => ({
                              id: hit.id,
                              x: Math.round(hit.x),
                              y: Math.round(hit.y),
                              w: Math.round(hit.w),
                              h: Math.round(hit.h),
                            })) ?? [],
                          },
                        };
                      })()
                    : null,
                  // Section II. Every interlock snapshot field, straight from
                  // the live state machine, plus the most recent art event.
                  // Progress fields are rounded to 3 decimals for stable diffs.
                  contactInterlock: scene.timetablePuzzle?.contactLock
                    ? (() => {
                        const snap = scene.timetablePuzzle.contactLock.snapshot();
                        return {
                          entered: snap.entered,
                          destroyed: snap.destroyed,
                          latchClosed: snap.latchClosed,
                          preRelayProgress: Number(snap.preRelayProgress.toFixed(3)),
                          relayWaiting: snap.relayWaiting,
                          relayBridged: snap.relayBridged,
                          postRelayProgress: Number(snap.postRelayProgress.toFixed(3)),
                          signalProgress: Number(snap.signalProgress.toFixed(3)),
                          circuitEnergized: snap.circuitEnergized,
                          contactorClosed: snap.contactorClosed,
                          powerDelivered: snap.powerDelivered,
                          complete: snap.complete,
                          lastFault: snap.lastFault,
                          isComplete: scene.timetablePuzzle.contactLock.isComplete(),
                          lastEvent: scene.timetablePuzzle.contactArt?.getState().lastEvent ?? null,
                          qaFrozen: Boolean(scene.timetablePuzzle.contactQaFreeze),
                          prompts: scene.timetablePuzzle.contactArt?.getState().prompts ?? null,
                        };
                      })()
                    : null,
                  // Section II insertion (THE MISSING CONTACT): the relay
                  // cabinet's full wiring snapshot, the most recent close-up
                  // art event, and whether the close-up currently owns the
                  // screen.
                  relayCabinet: scene.timetablePuzzle?.relay
                    ? (() => {
                        const snap = scene.timetablePuzzle.relay.snapshot();
                        return {
                          ...snap,
                          lastEvent: scene.timetablePuzzle.relayArt?.getState().lastEvent ?? null,
                          closeupActive: Boolean(scene.relayCloseupActive),
                        };
                      })()
                    : null,
                  echoRecorded: scene.tutorialPuzzle.echoRecorded,
                  echoSyncIndex: scene.tutorialPuzzle.echoSyncIndex,
                  echoWindowRemainingMs: Math.max(
                    0,
                    (scene.tutorialPuzzle.echoWindowUntil ?? 0) - (scene.time?.now ?? 0),
                  ),
                  lookingDown: Boolean(scene.tutorialLookingDown),
                  pressure: Math.round(scene.tutorialPuzzle.pressure ?? 0),
                  pressureVenting: Boolean(scene.tutorialPuzzle.pressureVenting),
                  pressureBraked: Boolean(scene.tutorialPuzzle.pressureBraked),
                  pressureSettled: Boolean(scene.tutorialPuzzle.pressureSettled),
                  // Phase VI (PAST RIDES THE LOAD): the replay snapshot, so QA
                  // text can never drift from what the ghost, the stripe and
                  // the lamps are showing.
                  echoReplay: scene.getTutorialStage()?.echoLoad && scene.tutorialPuzzle.echoReplay
                    ? (() => {
                        const snap = scene.tutorialPuzzle.echoReplay.snapshot();
                        return {
                          traceSource: snap.traceSource,
                          loopIndex: snap.loopIndex,
                          observationLoop: snap.observationLoop,
                          echoTrolleyX: snap.echoTrolleyX,
                          windowActive: snap.windowActive,
                          attempt: snap.attempt,
                          loadRoute: snap.loadRoute,
                          requiredRoute: snap.requiredRoute,
                          biteHeldMs: snap.biteHeldMs,
                          departing: snap.departing,
                          conditions: snap.conditions,
                          motorEnergized: snap.motor.energized,
                          motorWheelState: snap.motor.wheelState,
                          driveLoad: Number(snap.motor.axleLoad[snap.motor.driveBogie].toFixed(3)),
                          stageComplete: snap.stageComplete,
                          mechanicalPanel: {
                            open: scene.timetablePuzzle?.mechanicalPanelMode === 'echo',
                            hover: scene.timetablePuzzle?._mechanicalHoverId ?? null,
                            pressed: scene.timetablePuzzle?._mechanicalPressedId ?? null,
                            pointerDownCount: scene.timetablePuzzle?._mechanicalPointerDownCount ?? 0,
                            lastPointerDown: scene.timetablePuzzle?._mechanicalLastPointerDown ?? null,
                            hitIds: scene.timetablePuzzle?.mechanicalPanel?.hits?.map((hit) => hit.id) ?? [],
                            hits: scene.timetablePuzzle?.mechanicalPanel?.hits?.map((hit) => ({ ...hit })) ?? [],
                          },
                        };
                      })()
                    : null,
                }
              : null,
            echoPuzzle: !scene.timetablePuzzle && scene.tutorialPuzzle
              ? {
                  phase: scene.tutorialPuzzle.phase,
                  briefed: scene.tutorialPuzzle.briefed,
                  stageIndex: scene.tutorialPuzzle.stageIndex,
                  stageId: scene.getTutorialStage()?.id,
                  stageComplete: scene.tutorialPuzzle.stageComplete,
                  recordedFrames: scene.tutorialPuzzle.frames.length,
                  pastActive: scene.tutorialPuzzle.pastActive,
                  routeActive: scene.tutorialPuzzle.routeActive,
                  poweredSegments: scene.tutorialPuzzle.poweredSegments,
                  relayStates: scene.tutorialPuzzle.relayStates,
                  syncAligned: scene.tutorialPuzzle.syncAligned,
                  syncHotIndex: scene.tutorialPuzzle.syncHotIndex,
                  presentActive: scene.tutorialPuzzle.presentActive,
                  serviceActive: scene.tutorialPuzzle.serviceActive,
                  anomalyActive: scene.tutorialPuzzle.anomalyActive,
                  lookingDown: Boolean(scene.tutorialLookingDown),
                }
              : null,
          },
        }
      : null,
    player: player
      ? {
          x: Math.round(player.x),
          y: Math.round(player.y),
          velocityX: Math.round(player.body?.velocity.x ?? 0),
          velocityY: Math.round(player.body?.velocity.y ?? 0),
          lane: player.lane,
          animation: player.visualState,
          frozen: Boolean(player.frozen),
        }
      : null,
    interaction: scene
      ? {
          active: scene.activeInteractable?.def?.id ?? scene.activeNPC?.def?.id ?? null,
          dialogueOpen: Boolean(scene.dialogueState),
          promptVisible: Boolean(scene.prompt?.visible),
          promptText: scene.prompt?.visible ? scene.prompt.text : null,
        }
      : null,
    cinematic: scene
      ? {
          prologueTransitionActive: Boolean(scene.prologueTransitionActive),
          departureScroll: Math.round(scene.departureScroll ?? 0),
          tutorialCompletionReveal: Boolean(scene.tutorialCameraCinematic),
          cameraCenterX: Math.round(scene.cameras?.main?.midPoint?.x ?? 0),
          cameraCenterY: Math.round(scene.cameras?.main?.midPoint?.y ?? 0),
        }
      : null,
    performance: {
      fps: Math.round(game.loop.actualFps || 0),
      timeScale: scene?.time?.timeScale ?? 1,
    },
  });
};
window.render_game_to_text = renderGameToText;

// Mirror the same compact state into a hidden DOM node. Some embedded-browser
// test surfaces isolate page globals, but can still read authored DOM safely.
const gameStateOutput = document.createElement('output');
gameStateOutput.id = 'game-state';
gameStateOutput.dataset.testid = 'game-state';
gameStateOutput.hidden = true;
document.body.appendChild(gameStateOutput);
const syncGameStateOutput = () => {
  gameStateOutput.textContent = renderGameToText();
};
syncGameStateOutput();
window.setInterval(syncGameStateOutput, 500);

export default game;
