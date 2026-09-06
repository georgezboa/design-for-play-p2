import Phaser from 'phaser';
import { LANE_NEAR, LANES } from '../constants.js';
import { devRoutesEnabled, devParams } from '../devMode.js';
import { sfx } from '../sfx.js';
import {
  causalBlocker,
  ensureDrumState,
  firstOpenSlot,
  holdMsFor,
  isPlayerAt,
  machineSatisfied,
  makeSlot,
  needsPresence,
  summarizeSlots,
} from './drum.js';
// Section III. The drum import above stays because ~3200 lines of other stages
// still call into it; only stage 2's use of it is gone.
// Phase III (junction-3) LOCAL AIR CIRCUIT: the shared parallel air network
// and the room's puzzle-stage state machine, both frozen pure modules
// (SYSTEM ARC LOCK §2.1/§3). This file owns only the wiring.
import { createAirNetwork } from './phases/airNetwork.js';
import {
  createLocalAirCircuit,
  LOCAL_AIR_CIRCUIT_PROMPTS,
} from './phases/localAirCircuit.js';
// Phase IV (junction-4) WEIGHT / ADHESION: the suspension branch of the same
// shared airNetwork plus the frozen motor model, orchestrated by the pure
// weightTransfer module. This file owns only the wiring.
import { createMotorAdhesion } from './phases/motorAdhesion.js';
import {
  createWeightTransfer,
  WEIGHT_TRANSFER_PROMPTS,
} from './phases/weightTransfer.js';
import { createFirstWeight } from './phases/firstWeight.js';
import FirstWeightArt from '../art/firstWeightArt.js';
import { createTwoTrueThings } from './phases/twoTrueThings.js';
import TwoTrueThingsArt from '../art/twoTrueThingsArt.js';
import { createTrainRemembers } from './phases/trainRemembers.js';
import TrainRemembersArt from '../art/trainRemembersArt.js';
// Phase V (junction-5) READ THE BOGIE: two bogies, one TEST, one genuine
// contradiction, and the Gate 0 safe repair chain on the faulty bogie's
// local brake branch. Pure logic in phases/; this file owns the wiring.
import { createBogieDiagnosis } from './phases/bogieDiagnosis.js';
// Phase VI (junction-6) PAST RIDES THE LOAD: the past self re-rides the
// Phase IV counterweight trace; the player aligns the repaired systems with
// its rhythm. Pure logic in phases/; this file owns the wiring.
import { createEchoReplay } from './phases/echoReplay.js';
import { createMechanicalTable } from './phases/mechanicalTable.js';
// UNDERCARRIAGE VIEW TEACHING: shared flag semantics for the look-down
// teaching layer (III carries underfloorView only; IV/V/VI underfloor).
import { stageHasUnderfloorView } from './underfloorView.js';
import { C, CAR } from '../art/colors.js';
import { renderMechanicalTableStage } from '../art/mechanicalTableStageArt.js';
// Phase II (junction-2): the door-latch / power-contactor interlock is the
// room's only puzzle. Pure logic lives in phases/, world art in art/; this
// file owns the wiring — enter/update/interact/reset timing, per-frame
// snapshot application, prompt gating, completion and the QA route.
import { createContactInterlock } from './phases/contactInterlock.js';
import ContactInterlockArt from '../art/contactInterlockArt.js';
// Phase II insertion "THE MISSING CONTACT": the mid-car relay cabinet. The
// pure logic (phases/relayCabinet.js) and its close-up art
// (art/relayCabinetArt.js) are frozen Wave 1 modules — this file owns their
// wiring into the world: creation, the three-segment isRelaySolved hook, the
// E/pointer/ESC close-up lifecycle, camera pushes, and teardown.
import { createRelayCabinet } from './phases/relayCabinet.js';
import RelayCabinetArt from '../art/relayCabinetArt.js';
import {
  drivePhase2State,
  PHASE2_QA_STATE_NAMES,
  shouldFreezePhase2QAState,
} from './qa/phase2Qa.js';

// Stage index of junction-2 inside config.stages. The interlock devices, the
// QA warp and the objective text all key off this single constant.
const CONTACT_STAGE_INDEX = 1;
// Stage index of junction-3 (LOCAL AIR CIRCUIT). The air-circuit devices, the
// QA warp, the gate-open confirm hook and the objective text key off this.
const AIR_CIRCUIT_STAGE_INDEX = 2;
// Stage index of junction-4 (WEIGHT / ADHESION). The transfer devices, the QA
// warp, the trace hand-off to Phase VI and the objective text key off this.
const WEIGHT_TRANSFER_STAGE_INDEX = 3;
// Phase V — TWO TRUE THINGS, the second archive cradle.
const TWO_TRUE_THINGS_STAGE_INDEX = 4;
// Phase VI — THE TRAIN REMEMBERS, the temporal answer to IV/V.
const TRAIN_REMEMBERS_STAGE_INDEX = 5;
// Stage index of junction-5 (READ THE BOGIE). The service devices, the QA
// warp and the objective text key off this.
const BOGIE_SERVICE_STAGE_INDEX = 4;
// Stage index of junction-6 (PAST RIDES THE LOAD). The departure stand, the
// QA warp and the objective text key off this.
const ECHO_LOAD_STAGE_INDEX = 5;

// Phase VI world prompts and their gating live in the pure
// phases/echoLoadPrompts.js module (VISIBLE SYSTEM ARC CORRECTION §4): the
// engage handle only speaks once the first observation loop has mechanically
// unlocked it, and after that the offer itself is the window signal.
// Scene-level readability tuning: the pure interlock keeps its reusable 550ms
// default, while this long underfloor run gives a first-time player enough
// time to follow the pulse from the door latch to the remote contactor.
const CONTACT_SIGNAL_MS = 1200;

// Locked device coordinates (WAVE_3_PHASE_II_COORD_STATE_SPEC.md §1 + relay
// work package §4.2: the mid-car cabinet sits at x≈1195 on the same trough).
const CONTACT_INTERLOCK_LAYOUT = Object.freeze({
  startX: 850, // latch x = copper run start
  relayX: 1195, // relay cabinet centre x = pre/post segment seam
  endX: 1440, // contactor x = copper run end
  wallY: 556, // protected cable trough below the carriage floor
});

// "Leaving the room releases the latch" means stepping out of the latch's own
// interaction reach, not crossing the room's authoring line. The latch radius
// is 62px and the entry partition at x=790 sits inside it, so a room-edge
// threshold (startX+8=808) used to wipe a legal press at x∈(788,808) on the
// very next frame — events and all. Reset/enter now key off the interaction
// reach minus a small margin instead.
const CONTACT_RESET_X = CONTACT_INTERLOCK_LAYOUT.startX - 62 - 8; // 780

// The only prompt strings allowed in the room (spec §4 + relay work package
// §2.1). The relay prompt shows only while the case is still unbridged.
const CONTACT_PROMPTS = Object.freeze({
  latch: '[E] RESET LATCH',
  relay: '[E] OPEN RELAY CASE',
  power: '[E] CLOSE CONTACTOR',
});

// Relay close-up camera: the close-up art is laid out on the 960x600 canvas
// with its door frame centred slightly low, so the push-in parks the camera
// on the frame centre. Timings follow the locked beat (work package §3.4.2):
// lock bolt 60ms + door 240ms play FIRST, the camera push (360ms) follows.
const RELAY_CLOSEUP_CAMERA = Object.freeze({ x: 480, y: 335 });
const RELAY_CLOSEUP_CAMERA_MS = 360;
const RELAY_CLOSEUP_SOLVED_HOLD_MS = 450; // watch the armature seat, then leave

// The three enamel keys on the press face, in the order they are lettered.
// These are the *code*. RESET and RUN are operations and live on separate
// steel handles away from the drum housing.
const DRUM_KEYS = Object.freeze(['brake', 'vent', 'door']);

// A player standing at the valve when its slot opens gets this long to find the
// interact key before the slot chars. Being in the right place is the skill the
// stage tests; reaction speed on a single frame is not.
const DRUM_HOLD_GRACE_MS = 320;

// Keep the timetable as one large, legible instrument above the controls.
// Section III deliberately opts out of this physical face: its rotating-drum
// schedule is a brief projected readout, not another blackboard bolted over
// the carriage wall. The player reads their code above the action, while the
// actual controls remain down in the carriage.
const TIMETABLE_FACE = Object.freeze({
  y: 345,
  width: 202,
  height: 100,
  titleY: 312,
  queueY: 344,
  guideY: 370,
  tickY: 378,
  paperY: 387,
  punchY: 329,
  controlLabelY: 409,
  leftInset: 84,
  lampInset: 86,
  drumTickStep: 32,
  queueTickStep: 34,
});

const COMMANDS = {
  brake: { short: '■', drumShort: 'B', label: 'BRAKE', color: 0xe45a5f },
  power: { short: 'ϟ', drumShort: 'P', label: 'POWER', color: 0x75d4cd },
  vent: { short: '○', drumShort: 'V', label: 'VENT', color: 0x9fb7c0 },
  door: { short: '↔', drumShort: 'D', label: 'DOOR', color: 0xcaa66b },
  release: { short: '→', label: 'LATCH', color: 0xb68bc3 },
  couple: { short: '∞', label: 'COUPLE', color: 0xf2d49a },
};

const RAIL_CONTROLS = {
  brake: { label: 'BRAKE SHOE', prompt: 'CLAMP WHEEL' },
  vent: { label: 'BLEED VALVE', prompt: 'OPEN AIR VALVE' },
  power: { label: 'AXLE MOTOR', prompt: 'ENERGIZE MOTOR' },
  couple: { label: 'DRAFT GEAR', prompt: 'UNLOAD COUPLER' },
};

// Indexed by stage. No stage reaches failStage() with a line any more, so all
// entries are null rather than dead prose:
//   I   - autoRun, one command, cannot be ordered wrongly.
//   II  - the contact interlock never calls failStage(). A premature POWER
//         bounces locally at the contactor and can be retried immediately;
//         there is no wrong-order failure state to describe.
//   III - the drum never calls failStage(). Its whole point is that the machine
//         states the fault: the door strains against a live brake pipe, the
//         valve rattles dry, the card scorches. A line here would print the
//         answer the player is supposed to read off the hardware.
//   IV  - WEIGHT/ADHESION abolished the reflex window (SYSTEM ARC LOCK §4): a
//         weak TEST only spins the wheels harder, the trolley stays put, and
//         the sparks are the message. No line could say it better.
//   V   - READ THE BOGIE runs no judged sequence either: a premature repair
//         bounces off the service lock's own interlock, and the contradiction
//         on the two wheelsets says more than any line could.
//   VI  - a missed sync runs its own echo-retry loop with bespoke feedback.
const FAIL_LINES = [
  null,
  null,
  null,
  null,
  null,
  null,
];

/**
 * A tangible, train-specific first-chapter puzzle. The player punches actions
 * into a short timetable, then watches real rail hardware execute them in
 * order. There is deliberately no duplicate player body or shadow control.
 */
export default class TimetablePuzzle {
  constructor(scene, config) {
    this.scene = scene;
    this.config = config;
    this.objects = [];
    this.stageAssemblies = [];
    this.visible = true;
    // Phase II wiring, created in build(): the interlock state machine, its
    // world art, and a QA freeze flag set by the ?qa=phase2 route so a driven
    // fixture state stays put instead of advancing on the next frame.
    this.contactLock = null;
    this.contactArt = null;
    this.contactQaFreeze = false;
    // Phase III wiring (LOCAL AIR CIRCUIT): a QA freeze flag for the
    // ?qa=phase3 route. The shared airNetwork and the room's state machine
    // live on scene.tutorialPuzzle (the puzzle state object, same pattern as
    // the retired airLock), created lazily by ensureAirCircuitState().
    this.airCircuitQaFreeze = false;
    this._airPulseCooldown = 0;
    // Phase IV wiring (WEIGHT / ADHESION): QA freeze flag for the ?qa=phase4
    // route plus the spark emitter throttle. The shared airNetwork, the motor
    // model and the weightTransfer orchestrator live on scene.tutorialPuzzle,
    // created lazily by ensureWeightTransferState(). The recorded trolley
    // trace lands on puzzle.weightTrace for Phase VI to consume.
    this.weightTransferQaFreeze = false;
    this._sparkCooldown = 0;
    // Phase IV replacement — THE FIRST WEIGHT. One world-space state machine
    // and one diegetic art layer; no service-table close-up.
    this.firstWeightQaFreeze = false;
    this.firstWeightArt = null;
    // Phase V replacement — TWO TRUE THINGS. Both cases and both support
    // relationships stay in the world; there is no service-table close-up.
    this.twoTrueThingsQaFreeze = false;
    this.twoTrueThingsArt = null;
    // Phase VI replacement — THE TRAIN REMEMBERS. It consumes IV's trace and
    // reuses the same case/cradle language rather than introducing a new UI.
    this.trainRemembersQaFreeze = false;
    this.trainRemembersArt = null;
    // Phase V wiring (READ THE BOGIE): QA freeze flag for the ?qa=phase5
    // route. The shared airNetwork and motor are the SAME instances III/IV
    // used; the diagnosis orchestrator lives on scene.tutorialPuzzle.
    this.bogieQaFreeze = false;
    // Phase VI wiring (PAST RIDES THE LOAD): QA freeze flag for the
    // ?qa=phase6 route. The replay orchestrator lives on scene.tutorialPuzzle
    // and consumes puzzle.weightTrace (IV's recorder) through the frozen
    // traceContract — canonical fallback when QA skips IV (lock §2.4).
    this.echoQaFreeze = false;
    this.mechanicalTableQaFreeze = false;
    this._mechanicalTableCompletionPending = false;
    // Relay cabinet wiring (THE MISSING CONTACT): frozen logic + close-up art
    // plus the close-up lifecycle state owned here.
    // relayCloseupState: 'closed' -> 'opening' -> 'open' -> 'closing' ->
    // 'closed'. Scene-level mirror flag: scene.relayCloseupActive is true for
    // the whole opening/open/closing span so GameScene can gate input, the
    // tutorial camera and render_game_to_text.
    this.relay = null;
    this.relayArt = null;
    this.relayCloseupState = 'closed';
    this._relayAutoCloseScheduled = false;
    this._relayHandlers = null;
    this._relayBlurHandler = null;
    this._relayHoverId = null; // last id handed to relayArt.setHoverTarget
    this._probeCursorValue = null;
    // Phase V/VI share one diegetic point-and-click inspection layer. The
    // world keeps only the large mechanical silhouette; detailed operation
    // happens here, where hit targets can be generous and non-overlapping.
    this.mechanicalPanelMode = null;
    this.mechanicalPanel = null;
    this._mechanicalVentHeld = false;
    this._mechanicalHoverId = null;
    this._mechanicalPressedId = null;
  }

  track(object, depth = 58) {
    object.setDepth(depth);
    this.objects.push(object);
    return object;
  }

  build() {
    const { scene } = this;
    const style = {
      fontFamily: 'ui-monospace, Menlo, monospace',
      fontSize: '10px',
      color: '#83949b',
      backgroundColor: '#071016',
      padding: { x: 5, y: 3 },
    };

    scene.tutorialStageSigns = this.config.stages.map((stage, index) =>
      this.track(
        scene.add
          .text(stage.startX + 32, 275, stage.title, {
            ...style,
            fontSize: '11px',
            color: index === 0 ? '#f2d49a' : '#71828a',
            padding: { x: 8, y: 5 },
          }),
        58,
      ),
    );

    scene.tutorialGates = this.config.stages.map((stage, index) => {
      const gate = this.track(
        scene.add
          .rectangle(stage.endX, 246, 22, 216, 0x1c2830, 0.96)
          .setOrigin(0.5, 0)
          .setStrokeStyle(2, index === this.config.stages.length - 1 ? 0xcaa66b : 0xe45a5f, 0.8),
        44,
      );
      const light = this.track(
        scene.add.circle(stage.endX, 274, 5, 0xe45a5f, 1).setBlendMode(Phaser.BlendModes.ADD),
        59,
      );
      const vestibuleGlow = this.track(
        scene.add
          .rectangle(stage.endX, 354, 30, 202, 0xf2d49a, 0.06)
          .setBlendMode(Phaser.BlendModes.ADD),
        43,
      );
      const window = this.track(
        scene.add
          .rectangle(stage.endX, 304, 13, 26, 0x071016, 1)
          .setStrokeStyle(1, 0xcaa66b, 0.52),
        45,
      );
      const latchTop = this.track(scene.add.rectangle(stage.endX, 336, 28, 4, 0xcaa66b, 0.88), 60);
      const latchBottom = this.track(scene.add.rectangle(stage.endX, 406, 28, 4, 0xcaa66b, 0.88), 60);
      const passageGlow = this.track(
        scene.add
          .rectangle(stage.endX + 12, 452, 92, 5, 0x75d4cd, 0.72)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setVisible(false),
        59,
      );
      const passageArrow = this.track(
        scene.add
          .text(stage.endX + 8, 392, '→', {
            fontFamily: 'ui-monospace, Menlo, monospace',
            fontSize: '30px',
            color: '#9ce8e2',
            backgroundColor: '#071016',
            padding: { x: 8, y: 1 },
          })
          .setOrigin(0.5)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setVisible(false),
        61,
      );
      scene.tweens.add({
        targets: passageArrow,
        x: stage.endX + 20,
        alpha: { from: 0.45, to: 1 },
        duration: 620,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      return {
        gate,
        light,
        vestibuleGlow,
        window,
        latchTop,
        latchBottom,
        passageGlow,
        passageArrow,
      };
    });

    this.config.stages.forEach((stage, stageIndex) => {
      // The face is an enamel recess set INTO the carriage lining, not a panel
      // laid on top of it. Three layers, back to front:
      //   1. shadowed rebate, 4px larger all round — reads as depth cut into wall
      //   2. cream enamel field, the actual instrument face
      //   3. brass bezel ring, flush with the lining
      // The old single near-black rectangle (0x0b1319 @ 0.96) is what made this
      // read as a HUD panel pasted into the carriage. No pure-black fills remain.
      const rackRebate = this.track(
        scene.add.rectangle(
          stage.rackX,
          TIMETABLE_FACE.y + 3,
          TIMETABLE_FACE.width + 8,
          TIMETABLE_FACE.height + 8,
          0x1d2530,
          0.9,
        ),
        56,
      );
      const rack = this.track(
        scene.add
          .rectangle(
            stage.rackX,
            TIMETABLE_FACE.y,
            TIMETABLE_FACE.width,
            TIMETABLE_FACE.height,
            0x2b3038,
            0.94,
          )
          .setStrokeStyle(2, 0x8a6f45, 0.6),
        57,
      );
      const rackBezel = this.track(
        scene.add
          .rectangle(
            stage.rackX,
            TIMETABLE_FACE.y,
            TIMETABLE_FACE.width + 5,
            TIMETABLE_FACE.height + 5,
          )
          .setFillStyle()
          .setStrokeStyle(3, 0xcaa66b, 0.82),
        58,
      );
      const rackTitle = this.track(
        scene.add
          .text(stage.rackX, TIMETABLE_FACE.titleY, 'TIMETABLE', {
            ...style,
            fontSize: '12px',
            color: '#f2d49a',
            padding: { x: 8, y: 3 },
          })
          .setOrigin(0.5),
        59,
      );
      const queue = this.track(
        scene.add
          .text(stage.rackX, TIMETABLE_FACE.queueY, '', {
            fontFamily: 'ui-monospace, Menlo, monospace',
            fontSize: stage.drum ? '15px' : '20px',
            color: '#f2d49a',
            align: 'center',
          })
          .setOrigin(0.5),
        59,
      );
      const tick = this.track(
        scene.add.rectangle(
          stage.rackX - TIMETABLE_FACE.leftInset,
          TIMETABLE_FACE.tickY,
          14,
          4,
          0xcaa66b,
          0.9,
        ),
        59,
      );
      const paperStrip = this.track(
        scene.add
          .rectangle(stage.rackX, TIMETABLE_FACE.paperY, 166, 12, 0xe5cf9b, 0.82)
          .setStrokeStyle(1, 0x6f5736, 0.75),
        58,
      );
      const punchHead = this.track(
        scene.add
          .rectangle(
            stage.rackX - TIMETABLE_FACE.leftInset,
            TIMETABLE_FACE.punchY,
            15,
            26,
            0x7f6540,
            1,
          )
          .setStrokeStyle(1, 0xf2d49a, 0.64),
        61,
      );
      const completedLabel = this.track(
        scene.add
          .text(stage.rackX, TIMETABLE_FACE.paperY, 'SERVICE SET', {
            ...style,
            fontSize: '9px',
            color: '#75d4cd',
            backgroundColor: '#071016',
            padding: { x: 6, y: 2 },
          })
          .setOrigin(0.5),
        61,
      );
      const completionLamp = this.track(
        scene.add
          .circle(stage.rackX + TIMETABLE_FACE.lampInset, TIMETABLE_FACE.titleY, 5, 0x75d4cd, 0.9)
          .setBlendMode(Phaser.BlendModes.ADD),
        61,
      );
      // AIR LOCK uses a projected timetable rather than the generic enamel
      // noticeboard. It is deliberately light, short and floating: a record of
      // the code, not the thing the player has to operate. The physical
      // controls stay on the floor line below it.
      const drumProjection = stage.drum ? this.buildDrumProjection(stage) : null;

      // AIR LOCK no longer has the legacy command queue. Its three physical
      // machines teach the rule through their silhouettes and contextual
      // prompts, so there are intentionally no shared timetable labels to
      // build for that stage.
      const commandLabels = (stage.commands ?? []).map((command) => {
        const interactable = scene.interactables.find(
          (candidate) => candidate.def.stage === stageIndex && candidate.def.command === command,
        );
        const spec = COMMANDS[command];
        const physicalLabel = stage.physicalSequence ? RAIL_CONTROLS[command]?.label : null;
        const label = this.track(
          scene.add
            .text(
              interactable.sprite.x,
              stage.drum ? 396 : TIMETABLE_FACE.controlLabelY,
              physicalLabel ?? `${spec.short}\n${spec.label}`,
              {
                fontFamily: 'ui-monospace, Menlo, monospace',
                fontSize: '11px',
                align: 'center',
                color: `#${spec.color.toString(16).padStart(6, '0')}`,
                // The AIR LOCK machine captions are etched labels, not black
                // HUD chips. A small shadow keeps them readable on the carriage.
                backgroundColor: stage.drum ? undefined : '#081016',
                padding: stage.drum ? { x: 1, y: 1 } : { x: 5, y: 4 },
              },
            )
            .setOrigin(0.5),
          63,
        );
        if (stage.drum) label.setShadow(1, 2, '#071016', 4, true, true);
        return label;
      });

      const memoryLabel = stage.echoAssist
        ? this.track(
            scene.add
              .text(stage.rackX, TIMETABLE_FACE.paperY, `TRAIN MEMORY  ${COMMANDS[stage.echoAssist].short} ${COMMANDS[stage.echoAssist].label}`, {
                ...style,
                color: '#75d4cd',
              })
              .setOrigin(0.5),
            60,
          )
        : null;

      const run = scene.interactables.find(
        (candidate) => candidate.def.stage === stageIndex && candidate.def.kind === 'timetable-run',
      );
      const slot = scene.interactables.find(
        (candidate) => candidate.def.stage === stageIndex && candidate.def.kind === 'timetable-press',
      );
      const reset = scene.interactables.find(
        (candidate) => candidate.def.stage === stageIndex && candidate.def.kind === 'timetable-reset',
      );
      const slotLabel = slot && !stage.drum
        ? this.track(
            scene.add
              .text(slot.sprite.x, TIMETABLE_FACE.controlLabelY, '◉  SLOT +1', {
                ...style,
                align: 'center',
                fontSize: '11px',
                color: '#d9bd84',
                padding: { x: 6, y: 4 },
              })
              .setOrigin(0.5),
            63,
          )
        : null;
      const resetLabel = reset
        ? this.track(
            scene.add
              .text(reset.sprite.x, TIMETABLE_FACE.controlLabelY, '↺  RESET', {
                ...style,
                align: 'center',
                fontSize: '11px',
                color: '#e45a5f',
                padding: { x: 6, y: 4 },
              })
              .setOrigin(0.5),
            63,
          )
        : null;
      const runLabel = run
        ? this.track(
            scene.add
              .text(run.sprite.x, TIMETABLE_FACE.controlLabelY, '▶  RUN', {
                ...style,
                align: 'center',
                fontSize: '11px',
                color: '#75d4cd',
                padding: { x: 6, y: 4 },
              })
              .setOrigin(0.5),
            63,
          )
        : null;

      const machinery = this.buildMachinery(stage, stageIndex);
      const hasEcho = Boolean(stage.echoAssist || stage.echoSync);
      const echoInitialX = stage.echoStartX ?? stage.echoX;
      const echo = hasEcho
        ? this.track(
            scene.add
              .sprite(echoInitialX, 720, 'player-interact-1')
              .setOrigin(0.5, 1)
              .setTint(0x75d4cd)
              .setAlpha(0.44)
              .setScale(1.18)
              .setBlendMode(Phaser.BlendModes.ADD),
            60,
          )
        : null;
      const echoGlow = hasEcho
        ? this.track(
            scene.add
              .ellipse(echoInitialX, 670, 94, 170, 0x75d4cd, 0.16)
              .setBlendMode(Phaser.BlendModes.ADD),
            59,
          )
        : null;
      const echoRail = hasEcho
        ? this.track(
            scene.add
              .rectangle(echoInitialX, 742, 118, 5, 0x75d4cd, 0.32)
              .setBlendMode(Phaser.BlendModes.ADD),
            59,
          )
        : null;
      const echoNodes = (stage.echoSync ?? []).map((node) => {
        const beam = this.track(
          scene.add
            .rectangle(node.x, 562, 4, 226, COMMANDS[node.command].color, 0.13)
            .setBlendMode(Phaser.BlendModes.ADD),
          58,
        );
        const ring = this.track(
          scene.add
            .circle(node.x, 670, 24, 0x071016, 0.35)
            .setStrokeStyle(4, COMMANDS[node.command].color, 0.46)
            .setBlendMode(Phaser.BlendModes.ADD),
          61,
        );
        const core = this.track(
          scene.add.circle(node.x, 670, 7, COMMANDS[node.command].color, 0.32).setBlendMode(Phaser.BlendModes.ADD),
          62,
        );
        return { ...node, beam, ring, core };
      });
      this.stageAssemblies.push({
        stage,
        rack,
        rackRebate,
        rackBezel,
        rackTitle,
        queue,
        tick,
        paperStrip,
        punchHead,
        completedLabel,
        completionLamp,
        commandLabels,
        memoryLabel,
        slotLabel,
        resetLabel,
        runLabel,
        drumProjection,
        machinery,
        echo,
        echoGlow,
        echoRail,
        echoNodes,
      });
    });

    // Phase II: one interlock state machine plus its world art for junction-2.
    // The sfx hooks map straight onto src/sfx.js (unmodified): latch clack ->
    // lever, local bounce refusal -> blocked, contactor slam -> press,
    // traction circuit closed -> goal.
    // The relay cabinet (frozen Wave 1 modules) is created first: the
    // interlock's three-segment propagation reads isRelaySolved() through the
    // injected hook, so the signal can wait at the cabinet mouth. The close-up
    // art is built once, synced, then hidden — the world cabinet drawn by
    // ContactInterlockArt carries the cabinet's presence until E opens it.
    this.relay = createRelayCabinet();
    this.relayArt = new RelayCabinetArt(scene, { sfx });
    this.relayArt.applySnapshot(this.relay.snapshot());
    this.relayArt.setVisible(false);
    this.contactLock = createContactInterlock({
      propagationMs: CONTACT_SIGNAL_MS,
      isRelaySolved: () => this.relay?.isSolved() ?? false,
      // P2 (Wave 5): while the close-up is anywhere but fully closed the
      // bridge latch + post segment are held, so the post trace can never
      // light inside the exit beat (450 hold + 240 half-close + 360 camera).
      // relayCloseupState flips to 'closed' only in closeRelayCloseup's
      // finish(), i.e. after the camera pan has landed back on the player.
      isProgressHeld: () => this.relayCloseupState !== 'closed',
    });
    this.contactArt = new ContactInterlockArt(scene, {
      ...CONTACT_INTERLOCK_LAYOUT,
      sfx,
    });
    this.contactArt.applySnapshot(this.contactLock.snapshot());
    this._setupRelayInput();

    const firstWeightStage = this.config.stages[WEIGHT_TRANSFER_STAGE_INDEX];
    if (firstWeightStage?.firstWeight) {
      this.firstWeightArt = new FirstWeightArt(scene, firstWeightStage);
      const phase = this.ensureFirstWeightState(firstWeightStage);
      this.firstWeightArt.applySnapshot(phase.snapshot());
    }

    const twoTrueThingsStage = this.config.stages[TWO_TRUE_THINGS_STAGE_INDEX];
    if (twoTrueThingsStage?.twoTrueThings) {
      this.twoTrueThingsArt = new TwoTrueThingsArt(scene, twoTrueThingsStage);
      const phase = this.ensureTwoTrueThingsState(twoTrueThingsStage);
      this.twoTrueThingsArt.applySnapshot(phase.snapshot());
    }

    const trainRemembersStage = this.config.stages[TRAIN_REMEMBERS_STAGE_INDEX];
    if (trainRemembersStage?.trainRemembers) {
      this.trainRemembersArt = new TrainRemembersArt(scene, trainRemembersStage);
      const phase = this.ensureTrainRemembersState(trainRemembersStage);
      this.trainRemembersArt.applySnapshot(phase.snapshot());
    }

    this.refresh();
  }

  buildDrumProjection(stage) {
    const { scene } = this;
    const x = Phaser.Math.Clamp(stage.rackX + 178, stage.startX + 170, stage.endX - 150);
    const haze = this.track(
      scene.add
        .ellipse(x, 247, 316, 96, 0x75d4cd, 0.055)
        .setBlendMode(Phaser.BlendModes.ADD),
      55,
    );
    const rail = this.track(
      scene.add
        .rectangle(x, 262, 258, 2, 0xcaa66b, 0.56)
        .setBlendMode(Phaser.BlendModes.ADD),
      58,
    );
    const title = this.track(
      scene.add
        .text(x, 228, 'TIMETABLE  /  AIR LOCK', {
          fontFamily: 'ui-monospace, Menlo, monospace',
          fontSize: '10px',
          color: '#d9bd84',
          letterSpacing: 1,
        })
        .setOrigin(0.5)
        .setShadow(1, 2, '#071016', 4, true, true),
      60,
    );
    const queue = this.track(
      scene.add
        .text(x, 249, '·   ·   ·', {
          fontFamily: 'ui-monospace, Menlo, monospace',
          fontSize: '19px',
          color: '#f2d49a',
          letterSpacing: 3,
        })
        .setOrigin(0.5)
        .setShadow(1, 2, '#071016', 5, true, true),
      61,
    );
    const pointer = this.track(
      scene.add
        .rectangle(x - 72, 274, 30, 3, 0x75d4cd, 0.9)
        .setBlendMode(Phaser.BlendModes.ADD),
      61,
    );
    scene.tweens.add({
      targets: haze,
      alpha: { from: 0.035, to: 0.11 },
      scaleX: { from: 0.94, to: 1.04 },
      duration: 1120,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    return { haze, rail, title, queue, pointer, x };
  }

  buildMachinery(stage, index) {
    const { scene } = this;
    const underY = stage.underfloor ? 690 : 548;
    const g = this.track(scene.add.graphics(), 54);
    const left = stage.startX + 46;
    const right = stage.endX - 46;
    const center = (left + right) / 2;

    if (stage.underfloor) {
      g.fillStyle(0x05090c, 0.99);
      g.fillRoundedRect(stage.startX + 18, 505, stage.endX - stage.startX - 36, 360, 18);
      g.lineStyle(4, 0x40535b, 0.9);
      g.strokeRoundedRect(stage.startX + 18, 505, stage.endX - stage.startX - 36, 360, 18);
      g.lineStyle(3, 0x6c7a80, 0.8);
      g.lineBetween(left, underY, right, underY);
      [center - 155, center + 155].forEach((wheelX) => {
        g.fillStyle(0x111a20, 1);
        g.fillCircle(wheelX, underY + 65, 58);
        g.lineStyle(7, 0x607078, 0.95);
        g.strokeCircle(wheelX, underY + 65, 52);
        g.lineStyle(3, 0x2d3c43, 1);
        g.strokeCircle(wheelX, underY + 65, 21);
        g.lineBetween(wheelX - 48, underY + 65, wheelX + 48, underY + 65);
      });
      // Primary and secondary suspension, brake pipe, reservoir and motor.
      g.lineStyle(5, 0x53656d, 1);
      // SHIP MODE (IV bogie redraw): junction-4 draws a real suspension —
      // hanger columns and bellows air springs — so the mattress-coil zigzag
      // stays only on the bogie-diagnosis stages that were accepted with it.
      if (!stage.weightTransfer) {
        for (let springX = center - 90; springX <= center + 90; springX += 180) {
          for (let y = underY - 88; y < underY - 18; y += 12) {
            g.lineBetween(springX - 18, y, springX + 18, y + 6);
            g.lineBetween(springX + 18, y + 6, springX - 18, y + 12);
          }
        }
      }
      g.fillStyle(0x17262d, 1);
      g.fillRoundedRect(center - 92, underY + 14, 184, 72, 10);
      g.lineStyle(3, 0x75d4cd, 0.28);
      g.strokeRoundedRect(center - 92, underY + 14, 184, 72, 10);
      g.fillStyle(0x263840, 1);
      g.fillRoundedRect(left + 12, underY - 90, 130, 38, 18);
      g.lineStyle(4, 0x8b9ba0, 0.62);
      g.lineBetween(left + 142, underY - 71, right - 24, underY - 71);
      g.lineStyle(2, 0xcaa66b, 0.7);
      g.lineBetween(left + 142, underY - 59, right - 24, underY - 59);
    } else {
      g.lineStyle(3, 0x3e5159, 0.85);
      g.lineBetween(left, underY, right, underY);
      g.fillStyle(0x162229, 0.96);
      g.fillRoundedRect(center - 105, underY - 30, 210, 54, 9);
      g.lineStyle(2, 0xcaa66b, 0.35);
      g.strokeRoundedRect(center - 105, underY - 30, 210, 54, 9);
      // Section III has a compact physical code console. The three lettered
      // enamel keys live together here; RESET and RUN are separate operating
      // handles to their right. This gives the player two readable groups
      // instead of one flat toolbar of unrelated labels.
      if (stage.drum) {
        const consoleLeft = stage.startX + 34;
        const consoleRight = stage.runX + 44;
        g.fillStyle(0x17242a, 0.94);
        g.fillRoundedRect(consoleLeft, 392, consoleRight - consoleLeft, 62, 10);
        g.lineStyle(2, 0xcaa66b, 0.62);
        g.strokeRoundedRect(consoleLeft, 392, consoleRight - consoleLeft, 62, 10);
        // Three separate enamel keycaps make the input vocabulary visible as
        // BRAKE / VENT / DOOR, rather than suggesting that SLOT is a command.
        [-46, 0, 46].forEach((offset, keyIndex) => {
          const keyX = stage.rackX + offset;
          const tint = [0xe45a5f, 0x9fb7c0, 0xcaa66b][keyIndex];
          g.fillStyle(0x0f1a1f, 0.98);
          g.fillRoundedRect(keyX - 18, 403, 36, 36, 5);
          g.lineStyle(2, tint, 0.72);
          g.strokeRoundedRect(keyX - 18, 403, 36, 36, 5);
        });
        g.lineStyle(1, 0x75d4cd, 0.34);
        g.lineBetween(stage.rackX + 44, 399, stage.rackX + 44, 447);
        g.lineBetween(stage.resetX ?? stage.rackX + 92, 399, stage.resetX ?? stage.rackX + 92, 447);
        g.lineBetween(stage.runX - 42, 399, stage.runX - 42, 447);
      }
    }

    const wheelX = stage.underfloor ? center - 155 : center - 82;
    const wheelY = stage.underfloor ? underY + 65 : underY + 6;
    // Brake shoes belong to a wheelset; the air-circuit room has none, so
    // they stay hidden there instead of floating beside the pipe run. All
    // tween/setX references below remain valid against the hidden objects.
    const brakeLeft = this.track(scene.add.rectangle(wheelX - 69, wheelY, 18, 54, 0xe45a5f, 0.64).setVisible(!stage.airCircuit), 56);
    const brakeRight = this.track(scene.add.rectangle(wheelX + 69, wheelY, 18, 54, 0xe45a5f, 0.64).setVisible(!stage.airCircuit), 56);
    // Still built on every stage, including the air-lock one where it is kept
    // hidden as a duplicate of the dial, so the tweens and setScale calls that
    // target it need no per-stage guard. refresh() owns whether it is shown.
    const pressureBar = this.track(
      scene.add.rectangle(center + 116, underY - 42, 12, 62, 0x9fb7c0, 0.76).setOrigin(0.5, 1),
      56,
    );
    // On the air-circuit stage the dial moves to wall eye height. At its inherited
    // spot it landed on (2111, 460), which is the BLEED machine's own position
    // and inside the walking figure's body band -- and machinery draws at 56-57
    // against the player's 32, so the dial covered the character operating it.
    // Eye height also means it can be read without looking away from the wheel.
    const gaugePivotX = stage.airCircuit ? center - 115 : center + 116;
    const gaugePivotY = stage.airCircuit ? underY - 248 : underY - 88;
    // Further from the player, so it has to be bigger to stay legible.
    const gaugeR = stage.airCircuit ? 26 : 18;
    const gaugeFace = this.track(
      scene.add.circle(gaugePivotX, gaugePivotY, gaugeR, 0x10191e, 1).setStrokeStyle(3, 0xb8a274, 0.74),
      56,
    );
    // The needle sweeps -90deg (empty) to +90deg (full), so pressure 30 sits at
    // -90 + 0.30 * 180 = -36deg; Phaser angles run clockwise from screen right,
    // which is the same convention setAngle uses. The arm scales with the face
    // or it would stop short of the bands on the enlarged dial.
    const thresholdRad = Phaser.Math.DegToRad(-36);
    const gaugeDial = this.track(scene.add.graphics(), 56);
    // Both sides of the threshold are painted, not just the safe one. A lone
    // red tick on an otherwise blank face reads as a target to aim for; a red
    // field above it reads as a ceiling to stay under.
    gaugeDial.fillStyle(C(CAR.LAMP_ALERT), 0.13);
    gaugeDial.slice(gaugePivotX, gaugePivotY, gaugeR - 2, thresholdRad, Phaser.Math.DegToRad(90), false);
    gaugeDial.fillPath();
    gaugeDial.fillStyle(C(CAR.LAMP_OK), 0.16);
    gaugeDial.slice(gaugePivotX, gaugePivotY, gaugeR - 2, Phaser.Math.DegToRad(-90), thresholdRad, false);
    gaugeDial.fillPath();
    gaugeDial.lineStyle(2, C(CAR.LAMP_ALERT), 0.95);
    gaugeDial.lineBetween(
      gaugePivotX + (gaugeR - 7) * Math.cos(thresholdRad),
      gaugePivotY + (gaugeR - 7) * Math.sin(thresholdRad),
      gaugePivotX + (gaugeR + 1) * Math.cos(thresholdRad),
      gaugePivotY + (gaugeR + 1) * Math.sin(thresholdRad),
    );
    const gaugeNeedle = this.track(
      scene.add
        .rectangle(gaugePivotX, gaugePivotY, gaugeR - 4, 2, C(CAR.BRASS_HI), 1)
        .setOrigin(0.14, 0.5)
        .setAngle(-38),
      57,
    );

    const powerLamp = this.track(
      scene.add.circle(center + 160, underY - 55, 8, 0x405159, 0.9).setBlendMode(Phaser.BlendModes.ADD),
      57,
    );
    const motor = this.track(scene.add.rectangle(center, underY + 48, 84, 34, 0x283b43, 1), 55);
    const flywheel = this.track(
      scene.add.circle(center, underY + 48, 14, 0x10181d, 1).setStrokeStyle(3, 0x91a3a9, 0.78),
      57,
    );
    const flywheelSpoke = this.track(scene.add.rectangle(center, underY + 48, 24, 2, 0xcaa66b, 0.8), 58);
    const bogieFrame = stage.underfloor
      ? this.track(
          scene.add
            .rectangle(center, underY - 20, 410, 24, 0x2a3940, 0.94)
            .setStrokeStyle(2, 0x91a3a9, 0.7),
          55,
        )
      : null;
    // SHIP MODE (IV bogie redraw): the floating grey capsule stays on the
    // bogie-diagnosis stages; junction-4 plumbs its suspension branch into
    // the two bellows air springs instead of a detached tank.
    const airReservoir = stage.underfloor && !stage.weightTransfer
      ? this.track(
          scene.add
            .rectangle(left + 76, underY - 70, 116, 31, 0x43545b, 0.92)
            .setStrokeStyle(2, 0xc1c9c6, 0.62),
          56,
        )
      : null;
    // Underfloor stages keep the flat bar under the carriage. The air-circuit
    // room instead gets a traceable overhead run, drawn at world coordinates
    // with the Graphics itself left at the origin, routed above head height so
    // it can sit at machinery depth without ever crossing the player's torso.
    const airPipe = stage.underfloor
      ? this.track(
          scene.add.rectangle(center + 18, underY - 59, Math.max(160, right - left - 260), 6, 0x9fb7c0, 0.78),
          57,
        )
      : stage.airCircuit
        ? this.track(scene.add.graphics(), 57)
        : null;
    if (airPipe && stage.airCircuit) {
      // Graphics has no displayWidth, so the pulse origins travel as explicit
      // fields. The run is UNDERFLOOR (SYSTEM ARC LOCK §1: lines live beneath
      // the car floor): a main supply header at y=545 feeds three parallel
      // branches; the door branch tees off at the reservoir and exhausts at
      // the bleed wheel (2110).
      airPipe.__hissX = 2110;
      airPipe.__hissY = 560;
      airPipe.__headerY = 545;
      airPipe.__spanLeft = 1650;
      airPipe.__spanWidth = 680;
      airPipe.setAlpha(0.9);
      this.drawAirPipe(airPipe, 0);
    }
    // Phase III machinery: the reservoir tank on the header, and the door
    // cylinder whose piston visibly extends/retracts with pressure — while
    // fighting the supply it creeps and gets shoved back, the lesson told in
    // one pose.
    const airTank = stage.airCircuit
      ? this.track(
          scene.add.rectangle(1650, 545, 96, 30, 0x43545b, 0.92).setStrokeStyle(2, 0xc1c9c6, 0.62),
          55,
        )
      : null;
    const doorCylinder = stage.airCircuit
      ? this.track(
          scene.add.rectangle(2260, 560, 64, 18, 0x2a3940, 0.95).setStrokeStyle(2, 0x91a3a9, 0.7),
          55,
        )
      : null;
    const doorPiston = stage.airCircuit
      ? this.track(scene.add.rectangle(2292, 560, 46, 6, C(CAR.STEEL_HI), 0.9).setOrigin(0, 0.5), 56)
      : null;
    // UNDERCARRIAGE VIEW TEACHING (III dressing): nothing mechanical floats.
    // The hand-placed air run now visibly hangs from the car floor — beams
    // with real thickness, hanger straps and tee collars — and a rigid rod
    // links the door cylinder to the claw gate at the stage exit, so the
    // whole chain (pipe -> cylinder -> latch) reads as one machine. A dim
    // service glow lifts the underfloor band without touching the palette.
    // All three pieces live in assembly.machinery so refresh() manages their
    // visibility with the rest of the room (leaving world 0 must not leave
    // them floating).
    const airDress = stage.airCircuit ? this.track(scene.add.graphics(), 54) : null;
    if (airDress) {
      const dress = airDress;
      [1692, 1908, 2124, 2328].forEach((beamX) => {
        dress.fillStyle(0x141f26, 1);
        dress.fillRect(beamX - 9, 494, 18, 32);
        dress.lineStyle(2, 0x3e5159, 0.8);
        dress.strokeRect(beamX - 9, 494, 18, 32);
        // Hanger strap from beam down around the header; when the pipe sags
        // empty it hangs FROM this clamp, which is the honest physics.
        dress.lineStyle(3, 0x6c7a80, 0.85);
        dress.lineBetween(beamX, 526, beamX, 540);
        dress.fillStyle(0x8b9ba0, 0.9);
        dress.fillRect(beamX - 7, 540, 14, 9);
      });
      // Tee collars where the door branch and the service cocks leave the
      // header (reservoir tee, ISOLATE riser, gauge riser, BLEED drop).
      [1666, 1750, 1900, 2110].forEach((teeX) => {
        dress.fillStyle(0x263840, 1);
        dress.fillRect(teeX - 6, 538, 12, 14);
        dress.lineStyle(1, 0xcaa66b, 0.5);
        dress.strokeRect(teeX - 6, 538, 12, 14);
      });
      // Rigid rod: cylinder piston line -> up through the floor -> the claw
      // gate jaws at the exit (stage.endX, jaws at y336/406).
      dress.lineStyle(3, 0x91a3a9, 0.85);
      dress.lineBetween(2338, 560, stage.endX - 6, 560);
      dress.lineBetween(stage.endX - 6, 410, stage.endX - 6, 560);
      dress.fillStyle(0x43545b, 0.95);
      dress.fillRect(stage.endX - 12, 404, 12, 10);
    }
    const airLightHub = stage.airCircuit
      ? this.track(scene.addLight(1995, 610, 210, 0x4d6d72, 0.16, 53), 53)
      : null;
    const airLightClaw = stage.airCircuit
      ? this.track(scene.addLight(2280, 585, 130, 0x4d6d72, 0.13, 53), 53)
      : null;
    const secondWheelX = stage.underfloor ? center + 155 : center + 82;
    const wheelSpokeLeft = stage.underfloor
      ? this.track(scene.add.rectangle(wheelX, wheelY, 82, 4, 0xc4d0d2, 0.72), 58)
      : null;
    const wheelSpokeRight = stage.underfloor
      ? this.track(scene.add.rectangle(secondWheelX, wheelY, 82, 4, 0xc4d0d2, 0.72), 58)
      : null;
    const axlePulse = stage.underfloor
      ? this.track(
          scene.add
            .rectangle(center, wheelY, 392, 7, 0x75d4cd, 0.08)
            .setBlendMode(Phaser.BlendModes.ADD),
          57,
        )
      : null;
    // SHIP MODE (IV bogie redraw): a complete mechanical skeleton in place of
    // the mattress coils — H-frame on two axleboxed wheelsets standing on a
    // railed track, hanger columns and bellows air springs carrying the car
    // floor, traction motor with cooling fins and a gearbox on the drive
    // axle, and a brake cylinder rigged to all four shoes. Two faint load
    // columns tie the trolley's travel above to the springs and the drive
    // wheel below: weight over the bogie -> spring compressed -> adhesion.
    const bogieDress = stage.weightTransfer ? this.track(scene.add.graphics(), 54) : null;
    const bogieDressFront = stage.weightTransfer ? this.track(scene.add.graphics(), 56) : null;
    if (bogieDress && bogieDressFront) {
      const rearWheelX = secondWheelX;
      // Rail and sleepers the bogie stands on.
      bogieDress.lineStyle(4, 0x607078, 0.9);
      bogieDress.lineBetween(left + 6, wheelY + 58, right - 6, wheelY + 58);
      bogieDress.lineStyle(2, 0x2d3c43, 0.85);
      for (let tieX = left + 20; tieX <= right - 20; tieX += 52) {
        bogieDress.lineBetween(tieX, wheelY + 60, tieX, wheelY + 72);
      }
      // H-frame: lower side beam, cross beams down to the axleboxes, axlebox
      // housings on each journal (the wheel rings pass behind them).
      bogieDress.fillStyle(0x2a3940, 0.96);
      bogieDress.fillRect(wheelX - 96, underY + 6, rearWheelX - wheelX + 192, 14);
      bogieDress.lineStyle(3, 0x91a3a9, 0.7);
      bogieDress.strokeRect(wheelX - 96, underY + 6, rearWheelX - wheelX + 192, 14);
      [wheelX, rearWheelX].forEach((axleX) => {
        bogieDress.fillStyle(0x2a3940, 0.96);
        bogieDress.fillRect(axleX - 9, underY + 6, 18, 40);
        bogieDress.fillStyle(0x263840, 1);
        bogieDress.fillRect(axleX - 19, wheelY - 22, 38, 30);
        bogieDress.lineStyle(2, 0x91a3a9, 0.75);
        bogieDress.strokeRect(axleX - 19, wheelY - 22, 38, 30);
        bogieDress.lineBetween(axleX - 10, wheelY + 8, axleX + 10, wheelY + 8);
      });
      // Hanger columns from the car floor to each bellows, and the spring
      // seats they press against on the frame — the vertical load path.
      [stage.startX + 140, stage.endX - 190].forEach((bagX) => {
        bogieDress.fillStyle(0x2a3940, 1);
        bogieDress.fillRect(bagX - 6, underY - 2, 12, 28);
        bogieDress.fillRect(bagX - 26, underY + 62, 52, 10);
        bogieDress.lineStyle(2, 0x91a3a9, 0.55);
        bogieDress.strokeRect(bagX - 26, underY + 62, 52, 10);
        // Faint load column from the trolley floor down through the slab.
        bogieDress.lineStyle(2, 0x9fb7c0, 0.14);
        bogieDress.lineBetween(bagX, 470, bagX, underY - 2);
      });
      // Brake cylinder on the frame, rigged to all four shoes (the front
      // pair is the tracked animated pair; the rear pair is static here).
      bogieDress.fillStyle(0x263840, 1);
      bogieDress.fillRect(center - 17, underY + 12, 34, 18);
      bogieDress.lineStyle(2, 0x91a3a9, 0.6);
      bogieDress.strokeRect(center - 17, underY + 12, 34, 18);
      bogieDress.fillStyle(0xe45a5f, 0.5);
      bogieDress.fillRect(rearWheelX - 69 - 9, wheelY - 27, 18, 54);
      bogieDress.fillRect(rearWheelX + 69 - 9, wheelY - 27, 18, 54);
      bogieDress.lineStyle(2, 0x6c7a80, 0.75);
      [wheelX - 69, wheelX + 69, rearWheelX - 69, rearWheelX + 69].forEach((shoeX) => {
        bogieDress.lineBetween(center, underY + 30, shoeX, wheelY - 30);
      });
      // Traction motor cooling fins and the gearbox on the drive axle,
      // shafted to the motor.
      bogieDressFront.lineStyle(2, 0x91a3a9, 0.5);
      for (let finX = center - 30; finX <= center + 30; finX += 12) {
        bogieDressFront.lineBetween(finX, underY + 34, finX, underY + 62);
      }
      bogieDressFront.lineStyle(5, 0x53656d, 0.9);
      bogieDressFront.lineBetween(center + 34, underY + 52, rearWheelX - 20, wheelY - 4);
      bogieDressFront.fillStyle(0x17262d, 0.95);
      bogieDressFront.fillCircle(rearWheelX, wheelY, 26);
      bogieDressFront.lineStyle(2, 0x91a3a9, 0.8);
      bogieDressFront.strokeCircle(rearWheelX, wheelY, 26);
    }
    const drumKeyLabels = stage.drum
      ? DRUM_KEYS.map((command, keyIndex) => {
          const spec = COMMANDS[command];
          return this.track(
            scene.add
              .text(stage.rackX + [-46, 0, 46][keyIndex], 421, spec.label, {
                fontFamily: 'ui-monospace, Menlo, monospace',
                fontSize: '7px',
                color: `#${spec.color.toString(16).padStart(6, '0')}`,
              })
              .setOrigin(0.5)
              .setShadow(1, 1, '#071016', 3, true, true),
            61,
          );
        })
      : null;
    // SHIP MODE (IV trolley redraw): the counterweight is now a rail
    // maintenance trolley — guide rails and sleepers on the floor, small
    // flanged wheels, a steel chassis (the tracked `trolley` object, whose
    // setX/setFillStyle the refresh and the grab flash already own), stacked
    // ballast ingots, a push handle and a locking lever. The follower parts
    // ride along through machinery.trolleyFollowers in the refresh.
    const trolleyRail = index === 3 && stage.weightTransfer
      ? this.track(scene.add.graphics(), 36)
      : null;
    if (trolleyRail) {
      const track = stage.weightTransfer.trolley;
      trolleyRail.lineStyle(3, 0x53656d, 0.9);
      trolleyRail.lineBetween(track.leftX - 34, 459, track.rightX + 34, 459);
      trolleyRail.lineStyle(2, 0x53656d, 0.55);
      trolleyRail.lineBetween(track.leftX - 34, 465, track.rightX + 34, 465);
      trolleyRail.lineStyle(2, 0x2d3c43, 0.8);
      for (let tieX = track.leftX - 22; tieX <= track.rightX + 22; tieX += 34) {
        trolleyRail.lineBetween(tieX, 455, tieX, 468);
      }
    }
    const trolley = index === 3
      ? this.track(scene.add.rectangle(stage.weightTransfer?.trolley.leftX ?? stage.startX + 355, 441, 132, 20, 0x263840, 1).setStrokeStyle(3, 0x9fb7c0, 0.86), 37)
      : null;
    const mkTrolleyPart = (dx, build) => (index === 3 && stage.weightTransfer
      ? this.track(build((stage.weightTransfer.trolley.leftX ?? stage.startX + 355) + dx), 37)
      : null);
    const trolleyWheelA = mkTrolleyPart(-47, (x) => scene.add.circle(x, 455, 10, 0x0a1015, 1).setStrokeStyle(3, 0x9fb7c0, 0.92));
    const trolleyWheelB = mkTrolleyPart(47, (x) => scene.add.circle(x, 455, 10, 0x0a1015, 1).setStrokeStyle(3, 0x9fb7c0, 0.92));
    const trolleyBallastA = mkTrolleyPart(-5, (x) => scene.add.rectangle(x, 425, 82, 13, 0x405159, 1).setStrokeStyle(2, 0x9fb7c0, 0.72));
    const trolleyBallastB = mkTrolleyPart(3, (x) => scene.add.rectangle(x, 411, 70, 12, 0x405159, 1).setStrokeStyle(2, 0xcaa66b, 0.68));
    const trolleyBallastC = mkTrolleyPart(-3, (x) => scene.add.rectangle(x, 398, 58, 11, 0x263840, 1).setStrokeStyle(2, 0xcaa66b, 0.78));
    const trolleyHandle = mkTrolleyPart(63, (x) => scene.add.rectangle(x, 418, 8, 48, 0x405159, 1).setStrokeStyle(2, 0x9fb7c0, 0.8));
    const trolleyHandleGrip = mkTrolleyPart(53, (x) => scene.add.rectangle(x, 395, 30, 7, 0x263840, 1).setStrokeStyle(2, 0xcaa66b, 0.75));
    const trolleyLock = mkTrolleyPart(-61, (x) => scene.add.rectangle(x, 431, 8, 30, 0x687981, 1).setStrokeStyle(2, 0xe8d5a7, 0.74));
    const trolleyFollowers = index === 3 && stage.weightTransfer
      ? [
        [trolleyWheelA, -47],
        [trolleyWheelB, 47],
        [trolleyBallastA, -5],
        [trolleyBallastB, 3],
        [trolleyBallastC, -3],
        [trolleyHandle, 63],
        [trolleyHandleGrip, 53],
        [trolleyLock, -61],
      ]
      : null;
    // Phase IV underfloor hardware (WEIGHT / ADHESION): two bellows air
    // springs that visibly collapse while the suspension branch leaks flat,
    // the car floor line that tilts with the load split, and the TEST stand
    // lamp that follows the motor state. The dial only corroborates what
    // these show. The bags hang from the floor line onto their seats on the
    // bogie frame — inflating pushes the car up, deflating drops it.
    const suspensionBagFront = stage.weightTransfer
      ? this.track(
          scene.add.rectangle(stage.startX + 140, underY + 26, 44, 40, 0x24323a, 0.95)
            .setStrokeStyle(2, 0xc1c9c6, 0.7)
            .setOrigin(0.5, 0),
          55,
        )
      : null;
    const suspensionBagRear = stage.weightTransfer
      ? this.track(
          scene.add.rectangle(stage.endX - 190, underY + 26, 44, 40, 0x24323a, 0.95)
            .setStrokeStyle(2, 0xc1c9c6, 0.7)
            .setOrigin(0.5, 0),
          55,
        )
      : null;
    const bodyTilt = stage.weightTransfer
      ? this.track(
          scene.add.rectangle(center, underY - 2, right - left - 60, 4, 0x9fb7c0, 0.5),
          54,
        )
      : null;
    // VISIBLE SYSTEM ARC CORRECTION §2 (Phase IV equalizer): a real, readable
    // equalizer beam between the two bellows air springs. The beam pivots on
    // a central fulcrum; when the counterweight walks toward the drive bogie
    // the beam visibly tips drive-side-down, its linkage presses the drive
    // air spring, the drive axlebox SINKS and the wheel-rail contact glows.
    // All of it is redrawn every frame from the frozen snapshot — the motion
    // itself is the lesson; no arrows, no labels.
    const equalizerArt = stage.weightTransfer ? this.track(scene.add.graphics(), 58) : null;
    const loadPathLabel = stage.weightTransfer
      ? this.track(
          scene.add.text(center, 488, 'MOVING LOAD  /  EQUALIZER  /  DRIVE AXLE', {
            fontFamily: 'ui-monospace, Menlo, monospace',
            fontSize: '9px',
            color: '#9fb7c0',
            backgroundColor: '#0a1015',
            padding: { x: 7, y: 3 },
          }).setOrigin(0.5).setAlpha(0.76),
          58,
        )
      : null;
    const driveStateLabel = stage.weightTransfer
      ? this.track(scene.add.text(secondWheelX, wheelY + 118, 'DRIVE AXLE  /  NO LOAD', {
          fontFamily: 'ui-monospace, Menlo, monospace',
          fontSize: '10px',
          color: '#687981',
          backgroundColor: '#0a1015',
          padding: { x: 7, y: 3 },
        }).setOrigin(0.5), 59)
      : null;
    const driveAxleDrop = stage.weightTransfer
      ? this.track(
          scene.add.rectangle(secondWheelX, wheelY - 7, 40, 32, 0x263840, 1)
            .setStrokeStyle(2, 0x91a3a9, 0.75),
          57,
        )
      : null;
    const driveContactGlow = stage.weightTransfer
      ? this.track(
          scene.add.circle(secondWheelX, wheelY + 52, 13, 0xf2d49a, 0)
            .setBlendMode(Phaser.BlendModes.ADD),
          58,
        )
      : null;
    const testLamp = stage.weightTransfer
      ? this.track(
          scene.add.circle(stage.weightTransfer.machines.test.x, underY - 62, 7, 0x405159, 0.45)
            .setBlendMode(Phaser.BlendModes.ADD),
          57,
        )
      : stage.bogieService
        ? this.track(
            scene.add.circle(stage.bogieService.machines.test.x, underY - 62, 7, 0x405159, 0.45)
              .setBlendMode(Phaser.BlendModes.ADD),
            57,
          )
      : stage.echoLoad
        ? this.track(
            scene.add.circle(stage.echoLoad.machines.test.x, underY - 62, 7, 0x405159, 0.45)
              .setBlendMode(Phaser.BlendModes.ADD),
            57,
          )
      : null;
    // Phase V underfloor hardware (READ THE BOGIE): two wheelsets the player
    // can compare under one TEST — the healthy front bogie and the faulty
    // rear one, each with its own brake shoe — plus the VISIBLE steel service
    // pin that bars the rear linkage while seated (Gate 0: no invisible
    // booleans) and the seized actuator piston it protects the player from.
    const bogieY = underY + 65;
    const frontBogieX = stage.bogieService?.bogies.front ?? 0;
    const rearBogieX = stage.bogieService?.bogies.rear ?? 0;
    const frontSpoke = stage.bogieService
      ? this.track(
          scene.add.rectangle(frontBogieX, bogieY, 76, 4, 0xc4d0d2, 0.72),
          58,
        )
      : null;
    const rearSpoke = stage.bogieService
      ? this.track(
          scene.add.rectangle(rearBogieX, bogieY, 76, 4, 0xc4d0d2, 0.72),
          58,
        )
      : null;
    const frontShoe = stage.bogieService
      ? this.track(
          scene.add.rectangle(frontBogieX + 58, bogieY, 14, 46, 0xe45a5f, 0.72),
          57,
        )
      : null;
    const rearShoe = stage.bogieService
      ? this.track(
          scene.add.rectangle(rearBogieX + 58, bogieY, 14, 46, 0xe45a5f, 0.72),
          57,
        )
      : null;
    const servicePin = stage.bogieService
      ? this.track(
          scene.add.rectangle(3740, bogieY - 27, 34, 6, 0x697980, 0.95)
            .setStrokeStyle(1, 0xc1c9c6, 0.6),
          59,
        )
      : null;
    const actuatorPiston = stage.bogieService
      ? this.track(
          scene.add.rectangle(stage.bogieService.machines.repair.x, bogieY - 28, 40, 12, 0x2a3940, 0.95)
            .setStrokeStyle(2, 0x91a3a9, 0.66),
          56,
        )
      : null;
    // VISIBLE SYSTEM ARC CORRECTION §3 (Phase V diagnostic space): the five
    // generic floor levers are demolished. Every control is now a real device
    // bolted onto the machinery it moves, in the underfloor band between the
    // two wheelsets, and connected by pipe, rod or cable — nothing floats:
    //   TEST    — a shared maintenance bench BETWEEN the bogies, motor cables
    //             splitting to both wheelsets.
    //   ISOLATE — a cutout cock on the rear bogie's LOCAL brake supply riser.
    //   VENT    — a bleed wheel at that pipe's lowest point, exhaust stub
    //             pointing down.
    //   LOCK    — the steel pin sliding through a guide that bars the
    //             actuator linkage (positions moved to the rod: 3740/3778).
    //   REPAIR  — the access cover on the seized actuator itself.
    const bogieServiceArt = stage.bogieService ? this.track(scene.add.graphics(), 56) : null;
    if (bogieServiceArt) {
      const art = bogieServiceArt;
      // Two inspection bays frame the comparison. Their silhouettes are
      // intentionally mirrored; the rear bay's extra local branch is now the
      // only visual difference, so the fault reads as local rather than as a
      // room full of unrelated controls.
      [[frontBogieX, 0x405159], [rearBogieX, 0x263840]].forEach(([bayX, tint]) => {
        art.fillStyle(tint, 0.42);
        art.fillRoundedRect(bayX - 126, bogieY - 108, 252, 192, 12);
        art.lineStyle(2, 0x687981, 0.5);
        art.strokeRoundedRect(bayX - 126, bogieY - 108, 252, 192, 12);
        art.lineStyle(3, 0x53656d, 0.9);
        art.lineBetween(bayX - 92, bogieY + 52, bayX + 92, bogieY + 52);
        art.lineStyle(4, 0x607078, 0.94);
        art.strokeCircle(bayX, bogieY, 54);
        art.lineStyle(2, 0x2d3c43, 0.95);
        art.strokeCircle(bayX, bogieY, 23);
        [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach((a) => {
          art.lineBetween(
            bayX + Math.cos(a) * 23,
            bogieY + Math.sin(a) * 23,
            bayX + Math.cos(a) * 47,
            bogieY + Math.sin(a) * 47,
          );
        });
      });
      // --- TEST bench between the bogies, cables to both motor leads ------
      art.fillStyle(0x263840, 1);
      art.fillRect(3468, bogieY - 66, 64, 26);
      art.lineStyle(2, 0x91a3a9, 0.75);
      art.strokeRect(3468, bogieY - 66, 64, 26);
      art.fillStyle(0x17262d, 1);
      art.fillRect(3476, bogieY - 40, 8, 40);
      art.fillRect(3516, bogieY - 40, 8, 40);
      art.lineStyle(3, 0xcaa66b, 0.8);
      art.lineBetween(3484, bogieY - 40, 3320, bogieY - 6); // bench -> front bogie
      art.lineBetween(3516, bogieY - 40, 3680, bogieY - 6); // bench -> rear bogie
      art.fillStyle(0xcaa66b, 0.85);
      art.fillCircle(3320, bogieY - 6, 4);
      art.fillCircle(3680, bogieY - 6, 4);
      // --- The rear bogie's LOCAL brake line: riser off the header, down ---
      // --- to the low point, across, then up into the actuator.        ---
      art.lineStyle(6, 0x53656d, 0.95);
      art.lineBetween(3580, underY - 59, 3580, bogieY + 45); // supply riser
      art.lineBetween(3580, bogieY + 45, 3810, bogieY + 45); // low run
      art.lineBetween(3810, bogieY + 45, 3810, bogieY - 20); // actuator riser
      art.lineBetween(3810, bogieY - 20, 3842, bogieY - 28); // into the cylinder
      art.lineStyle(2, 0x75d4cd, 0.4);
      art.lineBetween(3580, underY - 59, 3580, bogieY + 45);
      art.lineBetween(3580, bogieY + 45, 3810, bogieY + 45);
      art.lineBetween(3810, bogieY + 45, 3810, bogieY - 20);
      // Tee collar where the riser leaves the header.
      art.fillStyle(0x263840, 1);
      art.fillRect(3573, underY - 66, 14, 14);
      // ISOLATE cutout cock ON the riser: valve body + handwheel.
      art.fillStyle(0x2a3940, 1);
      art.fillRect(3570, bogieY - 108, 20, 22);
      art.lineStyle(2, 0x91a3a9, 0.8);
      art.strokeRect(3570, bogieY - 108, 20, 22);
      art.lineStyle(3, 0xc1c9c6, 0.9);
      art.strokeCircle(3580, bogieY - 116, 11);
      art.lineBetween(3580, bogieY - 127, 3580, bogieY - 105);
      art.lineBetween(3569, bogieY - 116, 3591, bogieY - 116);
      // VENT bleed wheel at the pipe's lowest point + downward exhaust stub.
      art.fillStyle(0x263840, 1);
      art.fillRect(3653, bogieY + 38, 14, 12);
      art.lineStyle(3, 0xc1c9c6, 0.9);
      art.strokeCircle(3660, bogieY + 62, 10);
      art.lineBetween(3660, bogieY + 52, 3660, bogieY + 72);
      art.lineBetween(3650, bogieY + 62, 3670, bogieY + 62);
      art.lineStyle(2, 0x53656d, 0.8);
      art.lineBetween(3666, bogieY + 68, 3666, bogieY + 84);
      // The healthy front bogie's plain feed stub — no cocks, for contrast.
      art.lineStyle(5, 0x53656d, 0.7);
      art.lineBetween(3300, underY - 59, 3300, bogieY - 30);
      // --- Actuator housing, linkage rod and the service-pin guide ---------
      art.fillStyle(0x17262d, 1);
      art.fillRect(3836, bogieY - 40, 48, 26);
      art.lineStyle(2, 0x91a3a9, 0.7);
      art.strokeRect(3836, bogieY - 40, 48, 26);
      art.lineStyle(4, 0x8b9ba0, 0.85);
      art.lineBetween(3762, bogieY - 27, 3840, bogieY - 27); // piston rod -> shoe
      // Pin guide straddling the rod: the seated pin visibly bars the rod.
      art.fillStyle(0x2a3940, 1);
      art.fillRect(3768, bogieY - 44, 14, 34);
      art.lineStyle(2, 0xc1c9c6, 0.7);
      art.strokeRect(3768, bogieY - 44, 14, 34);
      // REPAIR access cover on the actuator: hinged plate + pull handle.
      art.fillStyle(0x263840, 1);
      art.fillRect(3844, bogieY - 62, 32, 20);
      art.lineStyle(2, 0xcaa66b, 0.7);
      art.strokeRect(3844, bogieY - 62, 32, 20);
      art.lineBetween(3850, bogieY - 52, 3870, bogieY - 52);
    }
    const bogieServiceFlowArt = stage.bogieService ? this.track(scene.add.graphics(), 59) : null;
    const bogieFrontLabel = stage.bogieService
      ? this.track(scene.add.text(frontBogieX, bogieY - 92, 'A  REFERENCE', {
          fontFamily: 'ui-monospace, Menlo, monospace',
          fontSize: '10px',
          color: '#9fb7c0',
          backgroundColor: '#0a1015',
          padding: { x: 6, y: 3 },
        }).setOrigin(0.5), 59)
      : null;
    const bogieRearLabel = stage.bogieService
      ? this.track(scene.add.text(rearBogieX, bogieY - 92, 'B  SERVICE', {
          fontFamily: 'ui-monospace, Menlo, monospace',
          fontSize: '10px',
          color: '#e45a5f',
          backgroundColor: '#0a1015',
          padding: { x: 6, y: 3 },
        }).setOrigin(0.5), 59)
      : null;
    const bogieServiceLegend = stage.bogieService
      ? this.track(scene.add.text(3715, bogieY + 92, 'CUT-OFF     BLEED     PIN     ACTUATOR', {
          fontFamily: 'ui-monospace, Menlo, monospace',
          fontSize: '8px',
          color: '#687981',
          letterSpacing: 1,
        }).setOrigin(0.5), 59)
      : null;
    const mkServiceGlow = (x, y, r) => (stage.bogieService
      ? this.track(scene.add.circle(x, y, r, 0x75d4cd, 0).setBlendMode(Phaser.BlendModes.ADD), 55)
      : null);
    const serviceGlows = stage.bogieService
      ? {
        test: mkServiceGlow(3500, bogieY - 53, 34),
        isolate: mkServiceGlow(3580, bogieY - 110, 24),
        vent: mkServiceGlow(3660, bogieY + 62, 24),
        lock: mkServiceGlow(3775, bogieY - 27, 22),
        repair: mkServiceGlow(3860, bogieY - 40, 24),
      }
      : null;
    // Phase VI underfloor hardware (PAST RIDES THE LOAD): the echo's trolley
    // re-rides the Phase IV trace on its own rail below the floor. The brass
    // zone stripe on the rail IS the lesson — when the moving weight is over
    // the drive bogie, the axle is loaded. No arrows, no text: the stripe, the
    // ghost and the gauge carry it.
    const echoRailSpec = stage.echoLoad?.echoRail;
    const echoRailBeam = echoRailSpec
      ? this.track(
          scene.add.rectangle(
            (echoRailSpec.x0 + echoRailSpec.x1) / 2,
            bogieY + 42,
            echoRailSpec.x1 - echoRailSpec.x0,
            5,
            0x53656d,
            0.6,
          ),
          54,
        )
      : null;
    const echoZoneStripe = echoRailSpec
      ? this.track(
          scene.add.rectangle(
            echoRailSpec.x0 + (echoRailSpec.x1 - echoRailSpec.x0) * 0.875,
            bogieY + 42,
            (echoRailSpec.x1 - echoRailSpec.x0) * 0.25,
            9,
            C(CAR.BRASS_MID),
            0.5,
          ),
          55,
        )
      : null;
    const echoTrolleyCar = echoRailSpec
      ? this.track(
          scene.add.rectangle(echoRailSpec.x0, bogieY + 24, 92, 32, 0x28353c, 1)
            .setStrokeStyle(2, 0x75d4cd, 0.66),
          56,
        )
      : null;
    const echoGhostGlow = echoRailSpec
      ? this.track(
          scene.add.ellipse(echoRailSpec.x0, bogieY - 6, 62, 92, 0x75d4cd, 0.14)
            .setBlendMode(Phaser.BlendModes.ADD),
          56,
        )
      : null;
    const echoGhost = echoRailSpec
      ? this.track(
          scene.add.sprite(echoRailSpec.x0, bogieY + 6, 'player-walk-1')
            .setOrigin(0.5, 1)
            .setAlpha(0.82),
          57,
        )
      : null;
    const echoLoadPathArt = stage.echoLoad ? this.track(scene.add.graphics(), 59) : null;
    const echoPastLabel = stage.echoLoad
      ? this.track(scene.add.text(echoRailSpec.x0 + 34, bogieY + 78, 'PAST LOAD REPLAY', {
          fontFamily: 'ui-monospace, Menlo, monospace',
          fontSize: '9px',
          color: '#75d4cd',
          backgroundColor: '#0a1015',
          padding: { x: 6, y: 3 },
        }).setOrigin(0, 0.5), 59)
      : null;
    const echoTractionLabel = stage.echoLoad
      ? this.track(scene.add.text(stage.echoLoad.machines.test.x, underY - 108, 'TRACTION CONTROL', {
          fontFamily: 'ui-monospace, Menlo, monospace',
          fontSize: '9px',
          color: '#caa66b',
          backgroundColor: '#0a1015',
          padding: { x: 6, y: 3 },
        }).setOrigin(0.5), 59)
      : null;
    const echoCaptureLabel = stage.echoLoad
      ? this.track(scene.add.text(
          echoRailSpec.x0 + (echoRailSpec.x1 - echoRailSpec.x0) * 0.875,
          bogieY + 82,
          'LOAD CAPTURE BAY',
          {
            fontFamily: 'ui-monospace, Menlo, monospace',
            fontSize: '9px',
            color: '#687981',
            backgroundColor: '#0a1015',
            padding: { x: 6, y: 3 },
          },
        ).setOrigin(0.5), 59)
      : null;
    // The drive wheelset under test. The five-lamp condition strip is
    // DEMOLISHED (VISIBLE SYSTEM ARC CORRECTION §4): the player reads the
    // four systems in the world — copper cable, cyan air run, the echo's own
    // weight cycle and the healthy brake hardware — not a row of unlabeled
    // lamps.
    const echoDriveSpoke = stage.echoLoad
      ? this.track(
          scene.add.rectangle(
            echoRailSpec.x0 + (echoRailSpec.x1 - echoRailSpec.x0) * 0.875,
            bogieY - 6,
            76,
            4,
            0xc4d0d2,
            0.72,
          ),
          58,
        )
      : null;
    const echoConditionLamps = null;
    const echoWindowLamp = stage.echoLoad
      ? this.track(
          scene.add.circle(
            echoRailSpec.x0 + (echoRailSpec.x1 - echoRailSpec.x0) * 0.875,
            bogieY - 44,
            8,
            0x405159,
            0.45,
          ).setBlendMode(Phaser.BlendModes.ADD),
          58,
        )
      : null;
    // VISIBLE SYSTEM ARC CORRECTION §4 (Phase VI convergence): the four
    // repaired systems are drawn INTO this room and visibly converge on the
    // drive bogie and the traction engage handle —
    //   II  a copper cable runs in from the relay/contactor direction,
    //   III a cyan air run feeds door / suspension / brake branches,
    //   V   the repaired rear bogie stands healthy on that run (pin parked,
    //       actuator brass, shoe released),
    //   IV  the past self re-rides the counterweight on the rail below.
    // All four end at the drive wheelset and the large engage handle.
    const convergenceArt = stage.echoLoad ? this.track(scene.add.graphics(), 55) : null;
    if (convergenceArt && echoRailSpec) {
      const art = convergenceArt;
      const standX = stage.echoLoad.machines.test.x; // 4400
      const driveX = echoRailSpec.x0 + (echoRailSpec.x1 - echoRailSpec.x0) * 0.875; // 4655
      // II: copper cable from the contactor direction into the controller,
      // then onward to the drive bogie.
      art.lineStyle(6, 0xcaa66b, 0.85);
      art.lineBetween(left + 6, underY - 72, standX, underY - 72);
      art.lineBetween(standX, underY - 72, standX, underY - 40);
      art.lineBetween(standX + 20, underY - 24, driveX - 48, underY - 24);
      art.lineBetween(driveX - 48, underY - 24, driveX - 48, bogieY - 46);
      art.lineBetween(driveX - 48, bogieY - 46, driveX - 16, bogieY - 46);
      // III: cyan air run with three readable branch tees.
      art.lineStyle(5, 0x75d4cd, 0.55);
      art.lineBetween(left + 6, underY - 40, driveX - 64, underY - 40);
      art.lineBetween(driveX - 64, underY - 40, driveX - 64, bogieY - 18);
      art.lineBetween(driveX - 64, bogieY - 18, driveX - 8, bogieY - 18);
      // Door branch tee + glyph.
      art.lineBetween(4120, underY - 48, 4120, underY - 96);
      art.fillStyle(0x75d4cd, 0.5);
      art.fillRect(4112, underY - 108, 6, 14);
      art.fillRect(4122, underY - 108, 6, 14);
      // Suspension branch tee + bag glyph.
      art.lineBetween(4260, underY - 52, 4260, underY - 96);
      art.fillStyle(0x75d4cd, 0.5);
      art.fillRoundedRect(4250, underY - 112, 20, 16, 5);
      // V: the repaired rear bogie on the brake branch — healthy, at rest.
      art.lineStyle(5, 0x75d4cd, 0.55);
      art.lineBetween(4180, underY - 44, 4180, bogieY - 34);
      art.lineStyle(4, 0x607078, 0.9);
      art.strokeCircle(4180, bogieY - 4, 26);
      art.lineStyle(3, 0x53656d, 0.6); // released shoe hangs clear of the wheel
      art.lineBetween(4214, bogieY - 26, 4214, bogieY + 10);
      art.fillStyle(C(CAR.BRASS_MID), 0.85); // freed actuator, brass
      art.fillRect(4228, bogieY - 34, 34, 14);
      art.lineStyle(3, 0x8b9ba0, 0.8);
      art.lineBetween(4206, bogieY - 27, 4228, bogieY - 27);
      art.fillStyle(0x697980, 0.9); // service pin parked clear of the rod
      art.fillRect(4196, bogieY - 30, 18, 5);
      // IV path ends here: the brass zone stripe + ghost already ride above.
      // The traction controller at the stand: junction box + cable entries.
      art.fillStyle(0x263840, 1);
      art.fillRect(standX - 30, underY - 96, 60, 74);
      art.lineStyle(2, 0xcaa66b, 0.7);
      art.strokeRect(standX - 30, underY - 96, 60, 74);
      // Drive wheelset ring + rail under the spoke.
      art.lineStyle(5, 0x607078, 0.9);
      art.strokeCircle(driveX, bogieY - 6, 34);
      art.lineStyle(4, 0x607078, 0.9);
      art.lineBetween(driveX - 60, bogieY + 52, driveX + 60, bogieY + 52);
    }
    // Per-frame handle/window/lock redraw + contact glow.
    const engageArt = stage.echoLoad ? this.track(scene.add.graphics(), 57) : null;
    const echoContactGlow = stage.echoLoad && echoRailSpec
      ? this.track(
          scene.add.circle(
            echoRailSpec.x0 + (echoRailSpec.x1 - echoRailSpec.x0) * 0.875,
            bogieY + 46,
            12,
            0xf2d49a,
            0,
          ).setBlendMode(Phaser.BlendModes.ADD),
          58,
        )
      : null;
    // The original underfloor construction remains underneath as historical
    // state-driven machinery, but V/VI present a deliberately sparse world
    // diagram above it. This cover lets the player identify the system before
    // opening the detailed point-and-click inspection panel.
    const simplifiedWorldArt = (stage.bogieService || stage.echoLoad)
      ? this.track(scene.add.graphics(), 60)
      : null;
    const simplifiedWorldLabel = (stage.bogieService || stage.echoLoad)
      ? this.track(scene.add.text(center, 606, '', {
          fontFamily: 'ui-monospace, Menlo, monospace',
          fontSize: '10px',
          color: '#9fb7c0',
          backgroundColor: '#0a1015',
          padding: { x: 8, y: 4 },
        }).setOrigin(0.5), 61)
      : null;
    const couplerLeft = index === this.config.stages.length - 1
      ? this.track(scene.add.rectangle(stage.endX - 126, underY + 4, 72, 18, 0x697980, 1), 57)
      : null;
    const couplerRight = index === this.config.stages.length - 1
      ? this.track(scene.add.rectangle(stage.endX - 52, underY + 4, 72, 18, 0x697980, 1), 57)
      : null;
    let controlLink = null;
    let controlPaths = null;
    if (stage.physicalSequence) {
      controlLink = this.track(scene.add.graphics(), 53);
      controlPaths = {};
      const railControls = scene.interactables.filter(
        (candidate) => candidate.def.stage === index && candidate.def.kind === 'rail-control',
      );
      const targets = {
        brake: { x: wheelX, y: wheelY },
        vent: { x: airReservoir?.x ?? center + 116, y: airReservoir?.y ?? underY - 42 },
        power: { x: center, y: underY + 48 },
        couple: { x: couplerLeft?.x ?? stage.endX - 94, y: underY + 4 },
      };
      railControls.forEach((control) => {
        const target = targets[control.def.command];
        const elbowY = 520 + (control.def.command === 'power' ? 28 : 0);
        controlLink.lineStyle(7, 0x10191e, 0.92);
        controlLink.lineBetween(control.sprite.x, 448, control.sprite.x, elbowY);
        controlLink.lineBetween(control.sprite.x, elbowY, target.x, elbowY);
        controlLink.lineBetween(target.x, elbowY, target.x, target.y - 18);
        controlLink.lineStyle(3, COMMANDS[control.def.command].color, 0.46);
        controlLink.lineBetween(control.sprite.x, 448, control.sprite.x, elbowY);
        controlLink.lineBetween(control.sprite.x, elbowY, target.x, elbowY);
        controlLink.lineBetween(target.x, elbowY, target.x, target.y - 18);
        controlLink.fillStyle(0x9aa8aa, 0.72);
        controlLink.fillCircle(control.sprite.x, elbowY, 5);
        controlLink.fillCircle(target.x, elbowY, 5);
        controlPaths[control.def.command] = {
          startX: control.sprite.x,
          startY: 448,
          elbowY,
          targetX: target.x,
          targetY: target.y - 18,
        };
      });
    }

    return {
      g,
      brakeLeft,
      brakeRight,
      pressureBar,
      gaugeFace,
      gaugeNeedle,
      powerLamp,
      motor,
      flywheel,
      flywheelSpoke,
      bogieFrame,
      airReservoir,
      airPipe,
      airTank,
      doorCylinder,
      doorPiston,
      airDress,
      airLightHub,
      airLightClaw,
      wheelSpokeLeft,
      wheelSpokeRight,
      axlePulse,
      drumKeyLabels,
      trolley,
      trolleyRail,
      trolleyWheelA,
      trolleyWheelB,
      trolleyBallastA,
      trolleyBallastB,
      trolleyBallastC,
      trolleyHandle,
      trolleyHandleGrip,
      trolleyLock,
      trolleyFollowers,
      bogieDress,
      bogieDressFront,
      suspensionBagFront,
      suspensionBagRear,
      bodyTilt,
      equalizerArt,
      loadPathLabel,
      driveStateLabel,
      driveAxleDrop,
      driveContactGlow,
      testLamp,
      frontSpoke,
      rearSpoke,
      frontShoe,
      rearShoe,
      servicePin,
      actuatorPiston,
      bogieServiceArt,
      bogieServiceFlowArt,
      bogieFrontLabel,
      bogieRearLabel,
      bogieServiceLegend,
      serviceGlows,
      echoRailBeam,
      echoZoneStripe,
      echoTrolleyCar,
      echoGhostGlow,
      echoGhost,
      echoLoadPathArt,
      echoPastLabel,
      echoTractionLabel,
      echoCaptureLabel,
      echoDriveSpoke,
      echoConditionLamps,
      echoWindowLamp,
      convergenceArt,
      engageArt,
      echoContactGlow,
      simplifiedWorldArt,
      simplifiedWorldLabel,
      couplerLeft,
      couplerRight,
      controlLink,
      controlPaths,
      wheelX,
      wheelY,
      underY,
      // Phase IV spark origin: the drive (rear) bogie's wheel-rail contact.
      __driveWheelX: stage.weightTransfer ? center + 185 : undefined,
      __driveWheelY: stage.weightTransfer ? wheelY : undefined,
      // Phase IV equalizer geometry (world coords), read by the per-frame
      // equalizer redraw in refreshWeightTransferVisuals.
      __bagFrontX: stage.weightTransfer ? stage.startX + 140 : undefined,
      __bagRearX: stage.weightTransfer ? stage.endX - 190 : undefined,
      __beamPivotY: stage.weightTransfer ? underY + 12 : undefined,
      __driveAxleX: stage.weightTransfer ? secondWheelX : undefined,
      // Phase V shoe poses and pin travel (world x), read by refreshBogieVisuals.
      // The pin's parked/seated positions now sit ON the actuator linkage
      // (VISIBLE SYSTEM ARC CORRECTION §3): parked clear of the guide at
      // 3740, driven through the guide and barring the rod at 3778.
      __frontShoeOn: stage.bogieService ? frontBogieX + 44 : undefined,
      __frontShoeOff: stage.bogieService ? frontBogieX + 58 : undefined,
      __rearShoeOn: stage.bogieService ? rearBogieX + 44 : undefined,
      __rearShoeOff: stage.bogieService ? rearBogieX + 58 : undefined,
      __pinParkedX: stage.bogieService ? 3740 : undefined,
      __pinSeatedX: stage.bogieService ? 3778 : undefined,
      // Phase VI echo rail endpoints (world x), read by refreshEchoVisuals.
      __echoRailX0: echoRailSpec?.x0,
      __echoRailX1: echoRailSpec?.x1,
      initialBogieY: bogieFrame?.y,
      initialReservoirY: airReservoir?.y,
      initialReservoirScaleX: airReservoir?.scaleX,
      initialTrolleyX: trolley?.x,
      initialCouplerLeftX: couplerLeft?.x,
      initialCouplerRightX: couplerRight?.x,
    };
  }

  isTimetableKind(kind) {
    // The three drum kinds are gone from level.js, so listing them here would
    // only keep dead branches reachable. 'air-lock' must be present: a kind
    // missing from this list is treated as a non-timetable object and gets the
    // generic '[E]' prompt from GameScene instead of the stage's own wording.
    return [
      'timetable-command',
      'timetable-run',
      'rail-control',
      'air-lock',
      'first-weight',
      'two-true-things',
      'train-remembers',
      // Phase IV's four devices (drain cock, levelling valve, counterweight
      // trolley, test stand) ride the same routing.
      'weight-transfer',
      // Phase V's five service devices (shared TEST stand, cutout cock,
      // bleed wheel, service pin bracket, actuator access) likewise.
      'bogie-service',
      // Phase VI's single departure stand likewise.
      'echo-load',
      'mechanical-table',
      // Phase II's two devices ride the same proximity/E routing as every
      // other timetable kind; their prompts come from the art module instead
      // of the shared bubble.
      'contact-interlock',
    ].includes(kind);
  }

  canInteract(interactable) {
    const puzzle = this.scene.tutorialPuzzle;
    if (!this.isTimetableKind(interactable.def.kind)) return true;
    if (!puzzle.briefed || ['opening', 'approach', 'departure', 'complete'].includes(puzzle.phase)) return false;
    if (['executing', 'echo-replay', 'echo-travel', 'echo-retry'].includes(puzzle.phase)) {
      // A turning drum is the one case where the player is meant to be doing
      // something during execution: standing at the valve holding E. Only the
      // valve opens up, and only on the drum stage — everything else, including
      // the command devices and RUN, stays locked so the timetable cannot be
      // rewritten mid-run.
      const drumStage = this.currentStage();
      const isDrumReset = drumStage?.drum
        && puzzle.phase === 'executing'
        && interactable.def.stage === puzzle.stageIndex
        && interactable.def.kind === 'timetable-reset';
      if (isDrumReset) return true;
      const isDrumHold = drumStage?.drum
        && puzzle.phase === 'executing'
        && interactable.def.stage === puzzle.stageIndex
        && interactable.def.kind === 'drum-machine'
        && interactable.def.command === 'vent';
      if (!isDrumHold) return false;
      return true;
    }
    if (interactable.def.stage !== puzzle.stageIndex) return false;
    const stage = this.currentStage();
    // Both air-circuit devices stay live at all times. Gating them by a step
    // counter would hand the player the order, which is the one thing the room
    // has to teach through the pipe instead.
    if (interactable.def.kind === 'air-lock') return Boolean(stage.airCircuit);
    if (interactable.def.kind === 'first-weight') return Boolean(stage.firstWeight);
    if (interactable.def.kind === 'two-true-things') return Boolean(stage.twoTrueThings);
    if (interactable.def.kind === 'train-remembers') return Boolean(stage.trainRemembers);
    // All four transfer devices stay live at all times — the load path, not a
    // step counter, decides what works. Gating the TEST stand until the bags
    // were charged would hand the player the order.
    if (interactable.def.kind === 'weight-transfer') return Boolean(stage.weightTransfer);
    // All five service devices stay live: the evidence chain, not a step
    // counter, decides what each one does. The service pin refuses on its
    // own terms (line live) — gating it here would leak the order.
    if (interactable.def.kind === 'bogie-service') return Boolean(stage.bogieService);
    // The departure stand stays live at all times — the echo's rhythm, not a
    // step counter, decides what energizing does. The first observation loop
    // refuses on its own terms inside the orchestrator.
    if (interactable.def.kind === 'echo-load') return Boolean(stage.echoLoad);
    if (interactable.def.kind === 'mechanical-table') return Boolean(stage.mechanicalTable);
    if (interactable.def.kind === 'rail-control') {
      if (!stage.physicalSequence) return false;
      if (stage.echoSync && puzzle.queue.length > 0) {
        return puzzle.phase === 'echo-sync' && puzzle.activeCommand === interactable.def.command;
      }
      return true;
    }
    if (stage.autoRun && puzzle.phase === 'programming') return false;
    if (interactable.def.kind === 'timetable-run') {
      if (stage.autoRun) return false;
    }
    // Both interlock devices stay pressable for the whole stage: a premature
    // POWER must bounce so the circuit can teach itself, and the latch must
    // accept repeat presses. The state machine decides what each press does.
    return true;
  }

  promptFor(interactable) {
    const puzzle = this.scene.tutorialPuzzle;
    if (interactable.def.kind === 'rail-control') {
      return `[E] ${RAIL_CONTROLS[interactable.def.command]?.prompt ?? 'OPERATE'}`;
    }
    if (interactable.def.kind === 'timetable-command') {
      return `[E] PUNCH ${COMMANDS[interactable.def.command].label}`;
    }
    // On the drum stage the devices are machines. The only thing the player
    // does at them is be there — and at the bleed wheel, hold.
    if (interactable.def.kind === 'air-lock') {
      const phase = puzzle.airCircuit;
      if (!phase) return null;
      const snap = phase.snapshot();
      // Nothing is offered once the door is open: a standing label on a done
      // machine is the kind of permanent text the room bans.
      if (snap.stageComplete) return null;
      const command = interactable.def.command;
      if (command === 'isolate') {
        return snap.isolateClosed
          ? LOCAL_AIR_CIRCUIT_PROMPTS.isolateClosed
          : LOCAL_AIR_CIRCUIT_PROMPTS.isolateOpen;
      }
      if (command === 'bleed') {
        return snap.door.venting ? null : LOCAL_AIR_CIRCUIT_PROMPTS.bleed;
      }
      return null;
    }
    if (interactable.def.kind === 'weight-transfer') {
      const phase = puzzle.weightTransfer;
      if (!phase) return null;
      const snap = phase.snapshot();
      // A standing label on a done machine is the kind of permanent text the
      // room bans — the moved car is its own answer.
      if (snap.stageComplete) return null;
      const command = interactable.def.command;
      if (command === 'level-drain') {
        return snap.suspension.venting ? WEIGHT_TRANSFER_PROMPTS.drainOpen : null;
      }
      if (command === 'level-supply') {
        return snap.suspension.isolated ? WEIGHT_TRANSFER_PROMPTS.supplyClosed : null;
      }
      if (command === 'trolley') {
        return snap.grabbed
          ? WEIGHT_TRANSFER_PROMPTS.trolleyGrabbed
          : WEIGHT_TRANSFER_PROMPTS.trolleyFree;
      }
      if (command === 'test') {
        return snap.motor.energized
          ? WEIGHT_TRANSFER_PROMPTS.testOn
          : WEIGHT_TRANSFER_PROMPTS.testOff;
      }
      return null;
    }
    if (interactable.def.kind === 'first-weight') {
      const snap = puzzle.firstWeight?.snapshot?.();
      if (!snap || !snap.caseFallen || snap.stageComplete) return null;
      if (snap.grabbed) return '[E] RELEASE CASE';
      if (snap.tagAvailable) return '[E] PUNCH WITNESS TAG';
      return '[E] GRIP CASE';
    }
    if (interactable.def.kind === 'two-true-things') {
      const snap = puzzle.twoTrueThings?.snapshot?.();
      if (!snap || !snap.casesFallen || snap.stageComplete) return null;
      const command = interactable.def.command;
      if (command === 'amber') {
        if (!snap.bothWitnessed) return null;
        return snap.amberConnected ? '[E] RELEASE AMBER WINCH' : '[E] ATTACH AMBER WINCH';
      }
      if (command === 'cyan') {
        if (!snap.bothWitnessed) return null;
        return snap.cyanConnected ? '[E] VENT AIR CUSHION' : '[E] CHARGE AIR CUSHION';
      }
      const id = command?.slice(5);
      if (!id || !snap.cases[id]) return null;
      if (!snap.tags[id]) return '[E] PUNCH WITNESS TAG';
      if (!snap.bothWitnessed) return null;
      if (snap.grabbedCase === id) return '[E] PLACE CASE';
      return '[E] GRIP CASE';
    }
    if (interactable.def.kind === 'train-remembers') {
      const snap = puzzle.trainRemembers?.snapshot?.();
      if (!snap || snap.stageComplete) return null;
      if (interactable.def.command === 'present-case' && snap.phase === 'duet') {
        return snap.grabbed ? '[E] PLACE PRESENT CASE' : '[E] GRIP PRESENT CASE';
      }
      if (interactable.def.command === 'catch' && snap.catchReady) return '[E] CATCH THE FALLING RECORD';
      return null;
    }
    if (interactable.def.kind === 'bogie-service') {
      const phase = puzzle.bogieDiagnosis;
      if (!phase) return null;
      const snap = phase.snapshot();
      if (snap.stageComplete) return null;
      return '[E] INSPECT SERVICE HATCH';
    }
    if (interactable.def.kind === 'echo-load') {
      const phase = puzzle.echoReplay;
      if (!phase) return null;
      if (phase.snapshot().stageComplete) return null;
      // The timing signal now lives inside the physical synchronizer close-up;
      // the world prompt only teaches the stable action of inspecting it.
      return '[E] INSPECT SYNCHRONIZER';
    }
    if (interactable.def.kind === 'mechanical-table') {
      const phase = puzzle.mechanicalTable;
      if (phase?.snapshot?.().stageComplete) return null;
      return '[E] OPEN SERVICE TABLE';
    }
    if (interactable.def.kind === 'contact-interlock') {
      // Null on purpose: the shared prompt bubble stays hidden and
      // ContactInterlockArt shows the only two allowed strings in-world.
      return null;
    }
    if (interactable.def.kind === 'timetable-run') return '[E] RUN TIMETABLE';
    return '[E]';
  }

  handleInteraction(interactable) {
    if (!this.canInteract(interactable)) return true;
    if (interactable.def.kind === 'rail-control') {
      this.operateRailControl(interactable);
      return true;
    }
    if (interactable.def.kind === 'timetable-command') {
      this.punch(interactable.def.command, interactable.sprite);
      return true;
    }
    if (interactable.def.kind === 'air-lock') {
      this.operateAirLock(interactable);
      return true;
    }
    if (interactable.def.kind === 'contact-interlock') {
      this.operateContactInterlock(interactable);
      return true;
    }
    if (interactable.def.kind === 'timetable-run') {
      this.run(interactable.sprite);
      return true;
    }
    if (interactable.def.kind === 'weight-transfer') {
      this.operateWeightTransfer(interactable);
      return true;
    }
    if (interactable.def.kind === 'first-weight') {
      this.operateFirstWeight(interactable);
      return true;
    }
    if (interactable.def.kind === 'two-true-things') {
      this.operateTwoTrueThings(interactable);
      return true;
    }
    if (interactable.def.kind === 'train-remembers') {
      this.operateTrainRemembers(interactable);
      return true;
    }
    if (interactable.def.kind === 'bogie-service') {
      this.operateBogieService(interactable);
      return true;
    }
    if (interactable.def.kind === 'echo-load') {
      this.operateEchoLoad(interactable);
      return true;
    }
    if (interactable.def.kind === 'mechanical-table') {
      this.operateMechanicalTable(interactable);
      return true;
    }
    return false;
  }

  punch(command, sprite) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const stage = this.currentStage();
    if (stage.drum) {
      // Hard stop: a drum run leaves the player free to walk, so they can reach
      // a command device mid-run. Editing the drum while it turns would let them
      // rewrite a slot the pointer has not reached yet.
      if (puzzle.phase === 'executing') {
        sfx.blocked();
        return;
      }
      this.punchDrumSlot(command, sprite);
      return;
    }
    if (puzzle.queue.length >= stage.solution.length) {
      puzzle.queue = [];
      scene.game.events.emit('hud:toast', 'The full strip ejects. Punch a new order.');
    }
    puzzle.queue.push(command);
    puzzle.phase = 'programming';
    scene.player.playInteraction();
    scene.pulseTutorialDevice(sprite, COMMANDS[command].color);
    this.animateTicketPunch(this.stageAssemblies[puzzle.stageIndex], command);
    sfx.press();
    scene.applyHitstop(45, 0.18);
    this.refresh();
    if (stage.autoRun) {
      const stageIndex = puzzle.stageIndex;
      scene.time.delayedCall(260, () => {
        if (puzzle.stageIndex !== stageIndex || puzzle.phase !== 'programming') return;
        const run = scene.interactables.find(
          (it) => it.def.stage === stageIndex && it.def.kind === 'timetable-run',
        );
        if (run) this.run(run.sprite);
      });
    }
  }

  operateRailControl(interactable) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const stage = this.currentStage();
    const command = interactable.def.command;
    const expected = stage.solution[puzzle.queue.length];
    const echoLocked = stage.echoSync && puzzle.queue.length > 0 && (
      puzzle.phase !== 'echo-sync' ||
      puzzle.activeCommand !== command ||
      scene.time.now > puzzle.echoWindowUntil
    );
    if (command !== expected || echoLocked) {
      scene.player.playInteraction();
      scene.pulseTutorialDevice(interactable.sprite, 0xe45a5f);
      scene.cameras.main.shake(150, 0.004);
      const physicalHint = {
        brake: 'The wheel is still free. Clamp the brake shoe against it first.',
        vent: 'The brake is holding. Now follow the charged pipe to its bleed valve.',
        power: 'The pipe is empty. The axle can take power now.',
        couple: 'The motor has unloaded the draft gear. Release the coupler now.',
      };
      scene.game.events.emit(
        'hud:toast',
        echoLocked
          ? 'That control only carries load while the remembered hand is holding its lower contact.'
          : physicalHint[expected] ?? 'The mechanism is not ready for that load.',
      );
      sfx.blocked();
      this.pulseMachineryFault(this.stageAssemblies[puzzle.stageIndex]);
      return;
    }

    const completedEchoContact = stage.echoSync && puzzle.phase === 'echo-sync';
    puzzle.phase = 'physical';
    puzzle.queue.push(command);
    puzzle.executionStep = puzzle.queue.length - 1;
    puzzle.activeCommand = command;
    scene.player.playInteraction();
    scene.pulseTutorialDevice(interactable.sprite, COMMANDS[command].color);
    if (command === 'power') interactable.sprite.setTexture('hand-generator-on');
    else if (command === 'vent') interactable.sprite.setTexture('circuit-relay-1');
    else interactable.sprite.setTexture('lever-on');
    const finalAction = puzzle.queue.length === stage.solution.length;
    if (completedEchoContact) scene.applyHitstop(55, 0.12);
    if (!finalAction) this.applyAction(command, true);
    this.refresh();

    const stageIndex = puzzle.stageIndex;
    if (stage.echoSync && puzzle.queue.length < stage.solution.length) {
      const nextNodeIndex = puzzle.queue.length - 1;
      this.beginEchoSync(stageIndex, nextNodeIndex);
      return;
    }
    if (finalAction) {
      scene.time.delayedCall(100, () => {
        if (puzzle.stageIndex === stageIndex && puzzle.phase === 'physical') {
          this.completeStage({ pendingActions: [command] });
        }
      });
    }
  }

  /**
   * Walks PAST from its current position to the next blocked obstacle, or to the
   * bleed valve once every gate is cleared. Reaching the valve is what unlocks
   * the player's door, so the partner is mechanically required.
   *
   * REMOVED with the old junction-6 echoGates design (lock §9 disposal table):
   * operateEchoGate() and advanceEchoToGate() are gone. Junction-6 now runs
   * PAST RIDES THE LOAD — see updateEchoReplayStage().
   */

  // The parallel air network is Section III's explanation of itself
  // (SYSTEM ARC LOCK §1): a main supply header under the floor feeds THREE
  // independent branches — the door branch the player works on, plus capped
  // suspension and brake tees that foreshadow Phases IV and V. Pressure is
  // invisible, so the pipe carries it as shape: taut means charged, sagging
  // means the air is gone. Phaser 3.90's Graphics has no quadraticCurveTo,
  // so each span's bow is walked as short straight segments.
  drawAirPipe(graphics, sagPx = 0) {
    const headerY = graphics.__headerY ?? 545;
    const branchY = graphics.__hissY ?? 560;
    const segs = 8;
    const bowY = (t) => (1 - t) * (1 - t) * branchY + 2 * (1 - t) * t * (branchY + 2 * sagPx) + t * t * branchY;

    graphics.clear();
    // Two passes over the same geometry: a thick brass body, then a thin lit
    // edge two pixels above it, so the line reads as round pipe not flat bar.
    [
      { width: 6, color: C(CAR.BRASS_MID), alpha: 1, lift: 0 },
      { width: 2, color: C(CAR.BRASS_HI), alpha: 0.5, lift: 2 },
    ].forEach(({ width, color, alpha, lift }) => {
      graphics.lineStyle(width, color, alpha);
      // Main supply header: compressor -> reservoir -> off toward the next rooms.
      graphics.lineBetween(1605, headerY - lift, 2345, headerY - lift);
      // Parallel capped tees: suspension (foreshadows IV) and brake (V). The
      // header visibly feeds more than this one branch.
      [1860, 2020].forEach((x) => {
        graphics.lineBetween(x, headerY - lift, x, headerY + 16 - lift);
        graphics.lineBetween(x - 5, headerY + 16 - lift, x + 5, headerY + 16 - lift);
      });
      // Door branch: header tee at the reservoir, through the ISOLATE valve
      // body, sagging run to the bleed wheel, on to the door cylinder.
      graphics.lineBetween(1650, headerY - lift, 1650, branchY - lift);
      graphics.lineBetween(1650, branchY - lift, 1738, branchY - lift);
      graphics.strokeRect(1738, branchY - 7 - lift, 22, 14);
      graphics.moveTo(1760, branchY - lift);
      for (let s = 1; s <= segs; s += 1) {
        const t = s / segs;
        graphics.lineTo(1760 + (2110 - 1760) * t, bowY(t) - lift);
      }
      // BLEED exhaust stub: the one place air may leave the room.
      graphics.lineBetween(2110, branchY - lift, 2110, branchY + 20 - lift);
      graphics.lineBetween(2104, branchY + 14 - lift, 2110, branchY + 20 - lift);
      graphics.lineBetween(2116, branchY + 14 - lift, 2110, branchY + 20 - lift);
      // On to the door cylinder.
      graphics.moveTo(2110, branchY - lift);
      for (let s = 1; s <= segs; s += 1) {
        const t = s / segs;
        graphics.lineTo(2110 + (2228 - 2110) * t, bowY(t) - lift);
      }
    });

    graphics.__sag = sagPx;
  }

  pulseMachineryFault(assembly) {
    const { scene } = this;
    const targets = [
      assembly.machinery.airReservoir,
      assembly.machinery.airPipe,
      assembly.machinery.axlePulse,
    ].filter(Boolean);
    scene.tweens.add({
      targets,
      alpha: { from: 0.28, to: 1 },
      duration: 90,
      yoyo: true,
      repeat: 2,
    });
  }

  run(sprite) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const stage = this.currentStage();
    if (stage.drum) {
      this.runDrum(sprite, stage);
      return;
    }
    if (!puzzle.queue.length) {
      sfx.blocked();
      scene.game.events.emit('hud:toast', 'The timetable is blank. Punch an action first.');
      return;
    }
    puzzle.phase = 'executing';
    puzzle.executionStep = -1;
    scene.player.playInteraction();
    scene.player.frozen = true;
    sprite.setTexture('hand-generator-on');
    sfx.lever();
    this.refresh();

    const correct =
      puzzle.queue.length === stage.solution.length &&
      puzzle.queue.every((command, index) => command === stage.solution[index]);
    // The queue-judged instant complete survives only on the autoRun tutorial
    // stage (Phase I timing is unchanged). Junction-2 has no queue at all now:
    // the contact interlock alone can complete it.
    if (correct && stage.autoRun) {
      this.completeStage({ pendingActions: [...puzzle.queue] });
      return;
    }

    const executionLead = 360;
    if (stage.echoAssist) {
      scene.time.delayedCall(820, () => {
        if (puzzle.stageIndex !== stage.index || puzzle.phase !== 'executing') return;
        this.playEchoAssist(stage.echoAssist);
      });
    }

    puzzle.queue.forEach((command, index) => {
      const stepDelay = stage.echoAssist && index > 0
        ? executionLead + 640 + (index - 1) * 540
        : executionLead + index * 540;
      scene.time.delayedCall(stepDelay, () => {
        if (puzzle.stageIndex !== stage.index || puzzle.phase !== 'executing') return;
        puzzle.executionStep = index;
        puzzle.activeCommand = command;
        const correctSoFar = puzzle.queue.slice(0, index + 1).every(
          (candidate, candidateIndex) => candidate === stage.solution[candidateIndex],
        );
        this.applyAction(command, correctSoFar);
        this.refresh();
      });
    });

    const finishDelay = stage.echoAssist
      ? executionLead + 820 + Math.max(0, puzzle.queue.length - 1) * 540
      : executionLead + 160 + puzzle.queue.length * 540;
    scene.time.delayedCall(finishDelay, () => {
      if (puzzle.stageIndex !== stage.index || puzzle.phase !== 'executing') return;
      const sequenceCorrect =
        puzzle.queue.length === stage.solution.length &&
        puzzle.queue.every((command, index) => command === stage.solution[index]);
      if (sequenceCorrect) this.completeStage();
      else this.failStage(sprite);
    });
  }

  // ---------------------------------------------------------------- DRUM PILOT
  // Section III only, reached from run() when stage.drum exists.

  drumMachine() {
    const puzzle = this.scene.tutorialPuzzle;
    if (!puzzle.drumMachine) puzzle.drumMachine = { brakeSet: false, ventSet: false, doorSet: false };
    return puzzle.drumMachine;
  }

  drumDeviceX(command) {
    const found = this.scene.interactables.find(
      (it) => it.def.stage === this.scene.tutorialPuzzle.stageIndex
        && it.def.kind === 'drum-machine'
        && it.def.command === command,
    );
    return found ? found.sprite.x : null;
  }

  runDrum(sprite, stage) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const drum = ensureDrumState(puzzle, stage);
    if (!drum || drum.running) return;
    // RUN is never refused for being "incomplete" and never names a missing
    // card. An earlier version blocked the pull until all three commands were
    // present and printed which ones were absent — that is the input layer
    // solving the puzzle out loud. A one-card strip is a legal plan; it simply
    // does not open the door, and the machine is what says so.
    const pending = drum.slots.filter((slot) => slot && slot.status !== 'done');
    if (!pending.length) {
      sfx.blocked();
      scene.game.events.emit('hud:toast', 'The drum carries no new cards.');
      scene.pulseTutorialDevice(sprite, 0xe45a5f);
      return;
    }
    // Re-punching a jammed slot makes it pending again; clear any leftover char
    // so the run starts from a clean read of what is actually scheduled.
    drum.slots.forEach((slot) => {
      if (slot && slot.status === 'jammed') slot.status = 'pending';
    });
    drum.editing = false;
    drum.running = true;
    drum.activeSlot = -1;
    drum.hold = null;
    drum.waiting = -1;
    // Unscaled clock: a hitstop must not stretch the slots. See drum.js.
    drum.startedAt = window.performance.now();
    puzzle.phase = 'executing';
    // The player must be able to walk during a drum run — that is the whole
    // mechanic — so unlike the queue path we never freeze them.
    scene.player.frozen = false;
    sprite.setTexture('hand-generator-on');
    sfx.lever();
    this.killDrumTweens();
    this.refresh();
  }

  cancelDrum() {
    const puzzle = this.scene.tutorialPuzzle;
    const drum = puzzle.drum;
    if (!drum) return;
    drum.running = false;
    drum.editing = false;
    drum.hold = null;
    drum.activeSlot = -1;
    drum.waiting = -1;
  }

  killDrumTweens() {
    const assembly = this.stageAssemblies[this.scene.tutorialPuzzle.stageIndex];
    const m = assembly?.machinery;
    if (!m) return;
    [
      m.brakeLeft,
      m.brakeRight,
      m.pressureBar,
      m.gaugeNeedle,
      m.powerLamp,
      m.motor,
      m.flywheel,
      m.flywheelSpoke,
      m.bogieFrame,
      m.airReservoir,
      m.airPipe,
      m.ventValve,
      m.ventPlume,
      m.doorLeaf,
    ]
      .filter(Boolean)
      .forEach((target) => this.scene.tweens.killTweensOf(target));
  }

  // Driven from update() on the real clock, so slot boundaries stay put even if
  // a hitstop scales scene.time. One slot is active at a time; crossing a
  // boundary always retires the previous slot's pending hold.
  updateDrum(delta) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const stage = this.currentStage();
    if (!stage?.drum) return;
    const drum = puzzle.drum;
    if (!drum || !drum.running) return;

    const elapsed = window.performance.now() - drum.startedAt;
    const index = Math.floor(elapsed / stage.drum.slotMs);

    // A frame hitch or a backgrounded tab can advance elapsed past several slot
    // boundaries at once. Step through every one of them: a slot that is never
    // entered would neither fire nor char, and its card would eject unmarked
    // with no way for the player to tell what the machine did.
    while (index !== drum.activeSlot) {
      // Leaving a slot with an unfinished hold chars it. This is the mutual
      // exclusion that keeps a VENT hold from bleeding into the DOOR slot.
      if (drum.hold && !drum.hold.resolved) this.jamSlot(drum.hold.index, drum.hold.command);
      drum.hold = null;
      const next = Math.min(drum.activeSlot + 1, index);
      drum.activeSlot = next;
      if (next < stage.drum.slots) this.enterSlot(next, stage, drum);
      else break;
    }

    if (drum.hold && !drum.hold.resolved) this.updateDrumHold(delta, stage, drum);

    if (index >= stage.drum.slots) {
      drum.running = false;
      drum.activeSlot = -1;
      this.finishDrumRun();
    }
  }

  enterSlot(index, stage, drum) {
    const slot = drum.slots[index];
    this.refresh();
    if (!slot || slot.status === 'done') return; // empty and finished slots pass silently
    const command = slot.command;
    const blocker = causalBlocker(this.drumMachine(), command);
    if (blocker) {
      this.jamSlot(index, command);
      return;
    }
    if (!needsPresence(stage, command)) {
      this.commitSlot(index, command);
      return;
    }
    // Presence is sampled once, here, at the instant the pointer enters the
    // slot. Per-frame sampling would fail a player walking past at the wrong
    // moment for reasons they could not see.
    const deviceX = this.drumDeviceX(command);
    if (deviceX === null || !isPlayerAt(this.scene, deviceX, stage.drum.presenceRadius)) {
      this.jamSlot(index, command);
      return;
    }
    const hold = holdMsFor(stage, command);
    if (!hold) {
      this.commitSlot(index, command);
      return;
    }
    // `waiting` is what the rest of the game reads to know a slot is open and
    // asking for the player's hand: the valve prompt at the machine, the lit
    // slot on the drum face, and the parked pointer all key off it. Setting
    // `hold` alone leaves the player holding E with nothing telling them to.
    drum.waiting = index;
    drum.hold = {
      index, command, deviceX, elapsed: 0, required: hold, resolved: false, grace: DRUM_HOLD_GRACE_MS,
    };
  }

  updateDrumHold(delta, stage, drum) {
    const hold = drum.hold;
    const stillThere = isPlayerAt(this.scene, hold.deviceX, stage.drum.presenceRadius);
    const held = this.scene.inputState?.interactHeld;
    // The player arrived in time; they get a reaction window to find the key.
    // Charring the instant the slot opens would punish being one frame late to
    // press E, which reads as the machine cheating.
    if (stillThere && !held && hold.elapsed === 0 && hold.grace > 0) {
      hold.grace -= delta;
      return;
    }
    if (!stillThere || !held) {
      hold.resolved = true;
      this.jamSlot(hold.index, hold.command);
      return;
    }
    hold.elapsed += delta;
    if (hold.elapsed >= hold.required) {
      hold.resolved = true;
      this.commitSlot(hold.index, hold.command);
    }
  }

  commitSlot(index, command) {
    const drum = this.scene.tutorialPuzzle.drum;
    const slot = drum.slots[index];
    if (slot) slot.status = 'done';
    if (drum.waiting === index) drum.waiting = -1;
    const machine = this.drumMachine();
    if (command === 'brake') machine.brakeSet = true;
    if (command === 'vent') machine.ventSet = true;
    if (command === 'door') machine.doorSet = true;
    this.applyDrumAction(command);
    this.refresh();
  }

  // A refused card jams rather than chars. The distinction matters: the card is
  // still legible in the slot, so the player can read back the plan that failed
  // instead of looking at a blank they have to reconstruct from memory.
  jamSlot(index, command) {
    const drum = this.scene.tutorialPuzzle.drum;
    const slot = drum.slots[index];
    if (slot) slot.status = 'jammed';
    if (drum.waiting === index) drum.waiting = -1;
    this.playDrumRefusal(command);
    this.refresh();
  }

  // Absolute targets only. A re-run may replay a command whose machine state is
  // already set, so every action *sets* state rather than flipping it — a toggle
  // would let a player lose progress by succeeding.
  applyDrumAction(command) {
    const { scene } = this;
    const assembly = this.stageAssemblies[scene.tutorialPuzzle.stageIndex];
    const m = assembly?.machinery;
    if (!m) return;
    sfx.press();
    if (command === 'brake') {
      if (m.brakeShoe) {
        scene.tweens.killTweensOf(m.brakeShoe);
        scene.tweens.add({ targets: m.brakeShoe, x: m.wheelX - 48, duration: 260, ease: 'Cubic.easeOut' });
      }
      if (m.bogie) {
        scene.tweens.killTweensOf(m.bogie);
        scene.tweens.add({ targets: m.bogie, y: m.initialBogieY + 13, duration: 260, ease: 'Cubic.easeOut' });
      }
    }
    if (command === 'vent') {
      if (m.ventValve) {
        scene.tweens.killTweensOf(m.ventValve);
        scene.tweens.add({ targets: m.ventValve, angle: -64, duration: 240, ease: 'Cubic.easeOut' });
      }
      if (m.gaugeNeedle) {
        scene.tweens.killTweensOf(m.gaugeNeedle);
        scene.tweens.add({ targets: m.gaugeNeedle, angle: -52, duration: 420, ease: 'Cubic.easeOut' });
      }
    }
    if (command === 'door') {
      // The door had no real visual before this pilot — only a lamp. It needs
      // one, because a jammed door has to be legible as a door that tried.
      if (m.doorLeaf) {
        scene.tweens.killTweensOf(m.doorLeaf);
        scene.tweens.add({ targets: m.doorLeaf, y: m.doorOpenY, duration: 460, ease: 'Cubic.easeOut' });
      }
      if (m.powerLamp) m.powerLamp.setFillStyle(0x8fd7a4, 1).setScale(1.55);
    }
  }

  // Failure speaks through the machine: a door that lifted a hand's width and
  // dropped, a valve that rattled dry, a needle that did not move. No text names
  // the right slot or the right order.
  playDrumRefusal(command) {
    const { scene } = this;
    const assembly = this.stageAssemblies[scene.tutorialPuzzle.stageIndex];
    const m = assembly?.machinery;
    sfx.blocked();
    if (!m) return;
    if (command === 'door' && m.doorLeaf) {
      scene.tweens.killTweensOf(m.doorLeaf);
      scene.tweens.add({
        targets: m.doorLeaf,
        y: m.doorClosedY - 14,
        duration: 170,
        ease: 'Cubic.easeOut',
        yoyo: true,
      });
    }
    if (command === 'vent' && m.ventValve) {
      scene.tweens.killTweensOf(m.ventValve);
      scene.tweens.add({
        targets: m.ventValve,
        angle: m.ventValve.angle - 7,
        duration: 70,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: 2,
      });
    }
    if (command === 'brake' && m.brakeShoe) {
      scene.tweens.killTweensOf(m.brakeShoe);
      scene.tweens.add({
        targets: m.brakeShoe,
        x: m.brakeShoe.x - 5,
        duration: 60,
        yoyo: true,
        repeat: 2,
      });
    }
  }

  finishDrumRun() {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const drum = puzzle.drum;
    const stage = this.currentStage();
    const runSprite = scene.interactables.find(
      (it) => it.def.stage === puzzle.stageIndex && it.def.kind === 'timetable-run',
    );
    if (runSprite) runSprite.sprite.setTexture('hand-generator');

    // `some`, not `find`: a re-punch may leave the jammed original in place and
    // put the retry in a different slot. Asking only for the first slot bearing
    // that command would keep reading the jammed one and the stage could never
    // close, even with every command fired.
    const solved = stage.solution.every(
      (command) => drum.slots.some((s) => s?.command === command && s.status === 'done'),
    );
    if (solved) {
      puzzle.phase = 'programming';
      this.completeStage();
      return;
    }
    // Local recovery: the stage never resets. Jammed slots stay jammed and
    // re-punchable; successful slots keep their machine state.
    puzzle.phase = 'programming';
    scene.player.frozen = false;
    scene.game.events.emit('hud:toast', 'The cards eject. The scorched ones can be punched again.');
    this.refresh();
  }

  // Any three-card code is punchable. No pre-validation of any kind.
  //
  // This used to refuse two things: a command that was already on the drum, and
  // a slot that had already turned. Both were the input layer deciding the
  // player's plan was wrong before the machine had a chance to disagree — and
  // one of the toasts printed the correct slot number outright. No shipped
  // free-entry puzzle does this. The rule now is grammar only: three cards fill
  // the drum, and any arrangement of BRAKE/VENT/DOOR is a legal program,
  // including all three the same. Wrongness is discovered by watching the
  // machine fail at the step that fails.
  punchDrumSlot(command, sprite) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const stage = this.currentStage();
    const drum = ensureDrumState(puzzle, stage);
    if (!drum || drum.running) return;
    // firstOpenSlot, not the first null: a jammed card is scrap and its slot has
    // to be re-punchable, or a stage where every card jammed would have nowhere
    // left to write and RESET would be the only way forward.
    const next = firstOpenSlot(drum);
    if (next < 0) {
      // Full drum is a physical fact, not a judgement: there is no fourth card
      // slot to strike into. RESET is the way back.
      sfx.blocked();
      scene.pulseTutorialDevice(sprite, 0xe4b45a);
      scene.game.events.emit('hud:toast', 'The strip is full. Three cards, three slots.');
      return;
    }
    drum.slots[next] = makeSlot(command);
    puzzle.phase = 'programming';
    scene.player.playInteraction();
    scene.pulseTutorialDevice(sprite, COMMANDS[command].color);
    sfx.press();
    scene.applyHitstop(45, 0.18);
    this.refresh();
  }

  // Which of the three enamel keys the press is set to. LEFT/RIGHT moves the
  // selector; it is a letter picker, not a time index, so there is no unit
  // conversion for the player to do.
  pressCommand() {
    const puzzle = this.scene.tutorialPuzzle;
    const keys = DRUM_KEYS;
    const index = ((puzzle.drumKey ?? 0) % keys.length + keys.length) % keys.length;
    return keys[index];
  }

  // Absolute pick, not a cycle. Three keys and three number keys means the
  // player never has to press twice to undo an overshoot.
  selectPressKey(index) {
    const puzzle = this.scene.tutorialPuzzle;
    const stage = this.currentStage();
    if (!stage?.drum) return false;
    if (index < 0 || index >= DRUM_KEYS.length) return false;
    const drum = ensureDrumState(puzzle, stage);
    if (!drum || drum.running) return false;
    if (puzzle.drumKey === index) return false;
    puzzle.drumKey = index;
    sfx.press();
    this.refresh();
    return true;
  }

  /**
   * Section III reset is deliberately local: it clears the six cards and
   * returns this room's brake/air/door state to its starting pose without
   * moving the player or touching any earlier completed section. It also acts
   * as an emergency stop while the drum is turning, so a visibly bad plan never
   * forces the player to wait out the rest of the revolution.
   */
  resetDrum(sprite) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const stage = this.currentStage();
    if (!stage.drum) return;

    this.cancelDrum();
    this.killDrumTweens();
    puzzle.drum = null;
    ensureDrumState(puzzle, stage);
    puzzle.drumMachine = { brakeSet: false, ventSet: false, doorSet: false };
    puzzle.phase = 'programming';
    puzzle.queue = [];
    puzzle.executionStep = -1;
    puzzle.activeCommand = null;
    scene.player.frozen = false;
    scene.registry.set('tutorialPowerState', 'junction-3-ready');
    this.resetMachinery(puzzle.stageIndex);

    const run = scene.interactables.find(
      (it) => it.def.stage === puzzle.stageIndex && it.def.kind === 'timetable-run',
    );
    run?.sprite.setTexture('hand-generator-off');
    scene.player.playInteraction();
    if (sprite) scene.pulseTutorialDevice(sprite, 0xe45a5f);
    sfx.lever();
    scene.applyHitstop(45, 0.18);
    scene.game.events.emit('hud:toast', 'The strip is blank again. The machines are back as you found them.');
    this.refresh();
  }

  beginEchoSync(stageIndex, nodeIndex) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const assembly = this.stageAssemblies[stageIndex];
    const stage = this.config.stages[stageIndex];
    const node = stage.echoSync?.[nodeIndex];
    if (!assembly?.echo || !node) return;

    const previousX = nodeIndex === 0
      ? stage.echoStartX
      : stage.echoSync[nodeIndex - 1].x;
    puzzle.phase = 'echo-travel';
    puzzle.echoSyncIndex = nodeIndex;
    puzzle.echoWindowUntil = 0;
    puzzle.activeCommand = null;
    scene.tweens.killTweensOf([assembly.echo, assembly.echoGlow, assembly.echoRail]);
    assembly.echo
      .setPosition(previousX, 720)
      .setVisible(true)
      .setTexture('player-walk-1')
      .setAlpha(0.76)
      .setScale(1.2);
    assembly.echoGlow?.setPosition(previousX, 670).setVisible(true).setAlpha(0.24).setScale(1);
    assembly.echoRail?.setPosition(previousX, 742).setVisible(true).setAlpha(0.46).setScale(1);
    assembly.echoNodes.forEach((candidate, index) => {
      scene.tweens.killTweensOf([candidate.ring, candidate.core]);
      candidate.ring.setScale(index < nodeIndex ? 1.08 : 1).setAlpha(index < nodeIndex ? 0.72 : 0.42);
      candidate.core.setAlpha(index < nodeIndex ? 0.9 : 0.28);
      candidate.beam.setAlpha(index < nodeIndex ? 0.38 : 0.12);
    });

    for (let afterIndex = 0; afterIndex < 5; afterIndex += 1) {
      scene.time.delayedCall(afterIndex * 130, () => {
        if (puzzle.stageIndex !== stageIndex || puzzle.phase !== 'echo-travel') return;
        const afterimage = this.track(
          scene.add
            .sprite(assembly.echo.x, 720, 'player-walk-1')
            .setOrigin(0.5, 1)
            .setTint(0x75d4cd)
            .setAlpha(0.26)
            .setScale(1.12)
            .setBlendMode(Phaser.BlendModes.ADD),
          59,
        );
        scene.tweens.add({
          targets: afterimage,
          alpha: 0,
          duration: 580,
          onComplete: () => afterimage.destroy(),
        });
      });
    }

    scene.tweens.add({
      targets: [assembly.echo, assembly.echoGlow, assembly.echoRail],
      x: node.x,
      duration: 820,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        if (puzzle.stageIndex !== stageIndex || puzzle.phase !== 'echo-travel') return;
        if (nodeIndex === 0 && stage.echoAssist && !puzzle.echoVented) {
          puzzle.echoVented = true;
          this.applyAction(stage.echoAssist, true);
        }
        puzzle.phase = 'echo-sync';
        puzzle.activeCommand = node.command;
        puzzle.echoWindowUntil = scene.time.now + node.windowMs;
        assembly.echo.setTexture('player-interact-1').setAlpha(0.96).setScale(1.28);
        assembly.echoGlow?.setAlpha(0.38).setScale(1.2);
        assembly.echoRail?.setAlpha(0.72);
        const visual = assembly.echoNodes[nodeIndex];
        visual.ring.setAlpha(1).setScale(1.18);
        visual.core.setAlpha(1).setScale(1.4);
        visual.beam.setAlpha(0.64);
        scene.tweens.add({
          targets: [visual.ring, visual.core],
          scale: '+=0.14',
          duration: 260,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        scene.game.events.emit(
          'hud:toast',
          node.command === 'power'
            ? 'PAST is holding the lower clutch—reach the axle motor above while the contact is bright.'
            : 'PAST has reached the draft latch—meet it at the coupler control before the contact fades.',
        );
        this.refresh();
      },
    });
    this.refresh();
  }

  playEchoAssist(command, onComplete = () => {}) {
    const { scene } = this;
    const assembly = this.stageAssemblies[scene.tutorialPuzzle.stageIndex];
    if (!assembly.echo) return;
    const startX = assembly.stage.echoStartX ?? assembly.stage.echoX - 180;
    assembly.echo
      .setPosition(startX, 720)
      .setVisible(true)
      .setAlpha(0.68)
      .setTexture('player-walk-1')
      .setScale(1.18)
      .setFlipX(false);
    assembly.echoGlow?.setPosition(startX, 670).setVisible(true).setAlpha(0.22).setScale(1);
    assembly.echoRail?.setPosition(startX, 742).setVisible(true).setAlpha(0.42).setScale(1);
    for (let index = 0; index < 5; index += 1) {
      scene.time.delayedCall(index * 150, () => {
        const afterimage = this.track(
          scene.add
            .sprite(assembly.echo.x, 720, 'player-walk-1')
            .setOrigin(0.5, 1)
            .setTint(0x75d4cd)
            .setAlpha(0.28)
            .setScale(1.1)
            .setBlendMode(Phaser.BlendModes.ADD),
          59,
        );
        scene.tweens.add({
          targets: afterimage,
          alpha: 0,
          duration: 620,
          onComplete: () => afterimage.destroy(),
        });
      });
    }
    scene.tweens.add({
      targets: [assembly.echo, assembly.echoGlow, assembly.echoRail],
      x: assembly.stage.echoX,
      duration: 880,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        assembly.echo.setTexture('player-interact-1').setAlpha(0.94);
        assembly.echoGlow?.setAlpha(0.34).setScale(1.15);
        assembly.echoRail?.setAlpha(0.64);
        scene.tweens.add({
          targets: assembly.echo,
          scale: 1.34,
          duration: 180,
          yoyo: true,
          onComplete: () => assembly.echo.setAlpha(0.62).setScale(1.18),
        });
        this.applyAction(command, true);
        scene.time.delayedCall(520, onComplete);
      },
    });
    scene.game.events.emit('hud:toast', 'The remembered self crosses below and holds the air valve open.');
  }

  applyAction(command, correctSoFar) {
    const { scene } = this;
    const machinery = this.stageAssemblies[scene.tutorialPuzzle.stageIndex].machinery;
    const color = correctSoFar ? COMMANDS[command].color : 0xe45a5f;
    scene.cameras.main.shake(100, correctSoFar ? 0.0018 : 0.004);
    sfx.press();
    this.animateMechanicalTransfer(command, machinery, color);

    const landImpact = (duration = 55, scale = 0.12) => {
      if (correctSoFar) scene.applyHitstop(duration, scale);
    };

    if (command === 'brake') {
      scene.tweens.add({ targets: machinery.brakeLeft, x: machinery.wheelX - 48, duration: 260, ease: 'Quad.easeOut' });
      scene.tweens.add({
        targets: machinery.brakeRight,
        x: machinery.wheelX + 48,
        duration: 260,
        ease: 'Quad.easeOut',
        onComplete: () => landImpact(48, 0.16),
      });
      scene.tweens.add({ targets: machinery.gaugeNeedle, angle: 28, duration: 380, ease: 'Back.easeOut' });
      if (machinery.bogieFrame) {
        scene.tweens.add({
          targets: machinery.bogieFrame,
          y: machinery.initialBogieY + 13,
          duration: 420,
          ease: 'Bounce.easeOut',
        });
        scene.tweens.add({
          targets: machinery.airReservoir,
          y: machinery.airReservoir.y + 7,
          duration: 420,
          ease: 'Bounce.easeOut',
        });
        for (let index = 0; index < 3; index += 1) {
          const side = index % 2 ? -1 : 1;
          const spark = this.track(
            scene.add
              .circle(machinery.wheelX + side * 48, machinery.wheelY + Phaser.Math.Between(-18, 18), 2, 0xe3a85e, 0.9)
              .setBlendMode(Phaser.BlendModes.ADD),
            60,
          );
          scene.tweens.add({
            targets: spark,
            x: spark.x + side * Phaser.Math.Between(12, 34),
            y: spark.y + Phaser.Math.Between(12, 42),
            alpha: 0,
            duration: Phaser.Math.Between(280, 520),
            onComplete: () => spark.destroy(),
          });
        }
      }
      if (machinery.trolley) scene.tweens.add({ targets: machinery.trolley, x: machinery.initialTrolleyX + 76, duration: 520, ease: 'Back.easeOut' });
    } else if (command === 'vent') {
      scene.tweens.add({ targets: machinery.pressureBar, scaleY: 0.08, duration: 420, ease: 'Expo.easeIn' });
      scene.tweens.add({
        targets: machinery.gaugeNeedle,
        angle: -64,
        duration: 520,
        ease: 'Cubic.easeOut',
        onComplete: () => landImpact(52, 0.14),
      });
      if (machinery.airReservoir) {
        scene.tweens.add({
          targets: machinery.airReservoir,
          scaleX: 0.56,
          alpha: 0.58,
          duration: 620,
          ease: 'Cubic.easeOut',
        });
        scene.tweens.add({ targets: machinery.airPipe, alpha: 0.16, duration: 620 });
      }
      for (let i = 0; i < 3; i += 1) {
        // The overhead run is a Graphics with no bounds, so it publishes its own
        // span; the underfloor rectangle keeps being measured from its width.
        const pipeOriginX = machinery.airPipe?.__spanWidth
          ? machinery.airPipe.__spanLeft + i * machinery.airPipe.__spanWidth * 0.16
          : machinery.airPipe
            ? machinery.airPipe.x - machinery.airPipe.displayWidth * 0.4 + i * machinery.airPipe.displayWidth * 0.16
            : machinery.pressureBar.x;
        const pipeOriginY = machinery.airPipe?.__hissY
          ?? machinery.airPipe?.y
          ?? machinery.pressureBar.y - 24;
        const puff = this.track(scene.add.circle(pipeOriginX, pipeOriginY, 3 + i, 0xbcd5dc, 0.32), 58);
        scene.tweens.add({
          targets: puff,
          x: puff.x + Phaser.Math.Between(-32, 32),
          y: puff.y - 30 - i * 7,
          alpha: 0,
          duration: 420 + i * 70,
          onComplete: () => puff.destroy(),
        });
      }
    } else if (command === 'power') {
      machinery.powerLamp.setFillStyle(color, 1);
      scene.tweens.add({
        targets: machinery.motor,
        angle: 360,
        duration: 520,
        ease: 'Back.easeOut',
        onComplete: () => landImpact(62, 0.1),
      });
      scene.tweens.add({ targets: [machinery.flywheel, machinery.flywheelSpoke], angle: '+=360', duration: 520, ease: 'Cubic.easeOut' });
      if (machinery.wheelSpokeLeft) {
        scene.tweens.add({
          targets: [machinery.wheelSpokeLeft, machinery.wheelSpokeRight],
          angle: '+=720',
          duration: 980,
          ease: 'Cubic.easeOut',
        });
        scene.tweens.add({
          targets: machinery.axlePulse,
          alpha: { from: 0.08, to: 0.72 },
          scaleY: { from: 0.7, to: 1.5 },
          duration: 220,
          yoyo: true,
          repeat: 1,
          ease: 'Sine.easeInOut',
        });
      }
    } else if (command === 'release' && machinery.trolley) {
      scene.tweens.add({
        targets: machinery.trolley,
        x: machinery.initialTrolleyX + 146,
        duration: 520,
        ease: 'Back.easeOut',
        onComplete: () => landImpact(55, 0.12),
      });
    } else if (command === 'release' && machinery.couplerLeft) {
      scene.tweens.add({ targets: machinery.couplerLeft, x: machinery.couplerLeft.x - 10, duration: 360, ease: 'Back.easeOut' });
      scene.tweens.add({
        targets: machinery.couplerRight,
        x: machinery.couplerRight.x + 10,
        duration: 360,
        ease: 'Back.easeOut',
        onComplete: () => landImpact(58, 0.11),
      });
    } else if (command === 'couple' && machinery.couplerLeft) {
      scene.tweens.add({ targets: machinery.couplerLeft, x: machinery.couplerLeft.x - 34, duration: 460, ease: 'Back.easeOut' });
      scene.tweens.add({
        targets: machinery.couplerRight,
        x: machinery.couplerRight.x + 34,
        duration: 460,
        ease: 'Back.easeOut',
        onComplete: () => landImpact(65, 0.09),
      });
    } else if (command === 'door') {
      machinery.powerLamp.setFillStyle(color, 1).setScale(1.55);
    }
  }

  animateMechanicalTransfer(command, machinery, color) {
    const path = machinery.controlPaths?.[command];
    if (!path) return;
    const { scene } = this;
    const pulse = this.track(
      scene.add.circle(path.startX, path.startY, 5, color, 1).setBlendMode(Phaser.BlendModes.ADD),
      61,
    );
    scene.tweens.add({
      targets: pulse,
      y: path.elbowY,
      duration: 220,
      ease: 'Quad.easeIn',
      onComplete: () => {
        scene.tweens.add({
          targets: pulse,
          x: path.targetX,
          duration: 260,
          ease: 'Cubic.easeOut',
          onComplete: () => {
            scene.tweens.add({
              targets: pulse,
              y: path.targetY,
              scale: 1.8,
              alpha: 0,
              duration: 220,
              ease: 'Back.easeOut',
              onComplete: () => pulse.destroy(),
            });
          },
        });
      },
    });
  }

  animateTicketPunch(assembly, command) {
    if (!assembly) return;
    const { scene } = this;
    const color = COMMANDS[command].color;
    scene.tweens.killTweensOf([assembly.punchHead, assembly.paperStrip]);
    assembly.punchHead.setFillStyle(color, 1).setY(TIMETABLE_FACE.punchY);
    assembly.paperStrip.setFillStyle(0xe5cf9b, 0.9).setScale(1, 1);
    scene.tweens.add({
      targets: assembly.punchHead,
      y: 369,
      duration: 80,
      yoyo: true,
      hold: 55,
      ease: 'Quad.easeIn',
      onComplete: () => assembly.punchHead.setFillStyle(0x7f6540, 1),
    });
    scene.tweens.add({
      targets: assembly.paperStrip,
      y: 420,
      scaleX: 1.04,
      duration: 150,
      yoyo: true,
      ease: 'Back.easeOut',
    });
    const chad = this.track(
      scene.add
        .circle(assembly.punchHead.x, TIMETABLE_FACE.paperY - 4, 2, color, 0.95)
        .setBlendMode(Phaser.BlendModes.ADD),
      62,
    );
    scene.tweens.add({
      targets: chad,
      x: chad.x - 10,
      y: chad.y + 22,
      angle: 160,
      alpha: 0,
      duration: 420,
      ease: 'Quad.easeIn',
      onComplete: () => chad.destroy(),
    });
  }

  setCompletedMachinery(assembly) {
    const { machinery, stage } = assembly;
    // Rooms without a timetable strip (II/III/IV) keep their own completed
    // poses; the generic strip choreography below would only crash on them.
    if (!stage.solution) return;
    const vented = stage.solution.includes('vent') || stage.echoAssist === 'vent';
    machinery.brakeLeft.setX(machinery.wheelX - 48);
    machinery.brakeRight.setX(machinery.wheelX + 48);
    machinery.gaugeNeedle.setAngle(vented ? -64 : 28);
    machinery.pressureBar.setScale(1, vented ? 0.08 : 1);
    if (machinery.bogieFrame) machinery.bogieFrame.setY(machinery.initialBogieY + 13);
    if (machinery.airReservoir) {
      machinery.airReservoir
        .setY(machinery.initialReservoirY + 7)
        .setScale(vented ? 0.56 : 1, 1)
        .setAlpha(vented ? 0.58 : 0.92);
      machinery.airPipe.setAlpha(vented ? 0.16 : 0.78);
    }
    if (stage.solution.some((command) => ['power', 'door'].includes(command))) {
      machinery.powerLamp.setFillStyle(0x75d4cd, 1).setScale(1.12);
    }
    if (machinery.trolley) {
      machinery.trolley.setX(machinery.initialTrolleyX + 146);
      machinery.trolleyFollowers?.forEach(([part, dx]) => part?.setX(machinery.initialTrolleyX + 146 + dx));
    }
    if (machinery.couplerLeft && stage.solution.includes('couple')) {
      machinery.couplerLeft.setX(machinery.initialCouplerLeftX - 34);
      machinery.couplerRight.setX(machinery.initialCouplerRightX + 34);
    }
    this.scene.tweens.killTweensOf([
      machinery.flywheel,
      machinery.flywheelSpoke,
      machinery.wheelSpokeLeft,
      machinery.wheelSpokeRight,
      machinery.powerLamp,
      machinery.axlePulse,
    ].filter(Boolean));
    machinery.powerLamp.setAlpha(0.86);
    machinery.axlePulse?.setAlpha(0.22).setScale(1);
  }

  failStage(runSprite) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const stageIndex = puzzle.stageIndex;
    puzzle.phase = 'fault';
    puzzle.faultUntil = scene.time.now + 1050;
    scene.clearHitstop();
    scene.pulseTutorialVignette(0x8e2634, 1, 420);
    runSprite.setTexture('hand-generator-off');
    scene.player.frozen = false;
    scene.cameras.main.shake(220, 0.006);
    sfx.blocked();
    scene.registry.set('tutorialPowerState', 'error');
    if (FAIL_LINES[stageIndex]) scene.game.events.emit('hud:toast', FAIL_LINES[stageIndex]);
    scene.time.delayedCall(1050, () => {
      if (puzzle.stageIndex !== stageIndex || puzzle.phase !== 'fault') return;
      puzzle.phase = 'idle';
      puzzle.queue = [];
      puzzle.executionStep = -1;
      puzzle.activeCommand = null;
      scene.registry.set('tutorialPowerState', `junction-${stageIndex + 1}-ready`);
      this.resetMachinery(stageIndex);
      this.refresh();
    });
  }

  completeStage({ pendingActions = [] } = {}) {
    const { scene } = this;
    // Phase V/VI detailed work happens in a screen-space inspection panel.
    // Completion always returns to the physical car before the shared reveal
    // camera begins, otherwise the modal would be stranded over the cutaway.
    if (this.mechanicalPanelMode) this.closeMechanicalPanel();
    const puzzle = scene.tutorialPuzzle;
    const completedIndex = puzzle.stageIndex;
    const last = completedIndex === this.config.stages.length - 1;
    puzzle.phase = 'opening';
    scene.player.frozen = true;
    scene.registry.set('tutorialPowerState', last ? 'complete' : `junction-${completedIndex + 1}-complete`);
    // Junction-2 no longer carries a runX (its RUN handle is demolished); the
    // score popup then centres on the room instead of reading undefined.
    const completedStage = this.currentStage();
    scene.addScore(
      last ? 75 : 30,
      completedStage.runX ?? (completedStage.startX + completedStage.endX) / 2,
      370,
    );
    sfx.checkpoint();
    scene.game.events.emit(
      'hud:toast',
      last ? 'The coupler unloads. Car 01 is free.' : this.successLine(completedIndex),
    );

    scene.playTutorialCompletionReveal(completedIndex, (finishMachineReveal) => {
      if (!pendingActions.length) {
        finishMachineReveal();
        return;
      }
      pendingActions.forEach((command, actionIndex) => {
        scene.time.delayedCall(actionIndex * 430, () => {
          if (puzzle.stageIndex !== completedIndex || puzzle.phase !== 'opening') return;
          puzzle.executionStep = actionIndex;
          puzzle.activeCommand = command;
          this.applyAction(command, true);
        });
      });
      scene.time.delayedCall((pendingActions.length - 1) * 430 + 620, finishMachineReveal);
    }, () => {
      scene.playTutorialGateOpen(completedIndex, () => {
        scene.finishTutorialCompletionReveal();
        if (last) {
          puzzle.phase = 'departure';
          puzzle.serviceActive = true;
          scene.registry.set('tutorialPowerState', 'departure');
          scene.playPrologueDeparture(() => {
            puzzle.phase = 'complete';
            scene.registry.set('tutorialPowerState', 'complete');
            scene.tutorialExitBlockedNotified = false;
            this.refresh();
          });
        } else {
          // Stop the drum before the index moves: updateDrum() reads the new
          // stage, and a run still marked running would tick against it.
          this.cancelDrum();
          puzzle.drum = null;
          puzzle.stageIndex = completedIndex + 1;
          puzzle.phase = 'approach';
          puzzle.queue = [];
          puzzle.executionStep = -1;
          puzzle.activeCommand = null;
          puzzle.echoSyncIndex = -1;
          puzzle.echoWindowUntil = 0;
          puzzle.echoVented = false;
          puzzle.pressure = this.config.stages[puzzle.stageIndex].pressureHold?.start ?? 100;
          puzzle.pressureVenting = false;
          puzzle.pressureBraked = false;
          puzzle.pressureSettled = false;
          puzzle.pressureHintLast = undefined;
          puzzle.echoGateIndex = 0;
          puzzle.echoGatesCleared = [];
          puzzle.echoAtValve = false;
          scene.player.frozen = false;
          scene.registry.set('tutorialPowerState', `junction-${puzzle.stageIndex + 1}-approach`);
        }
        this.refresh();
        scene.refreshTutorialStageVisuals();
      });
    });
  }

  successLine(index) {
    return [
      'The timetable becomes motion. The first partition releases.',
      'The latch holds; the contactor closes and the circuit takes power.',
      'The brake pipe exhales and the pneumatic door slides free.',
      'The trolley rolls into the missing counterweight position.',
      'The axle motor wakes beneath your feet.',
    ][index];
  }

  resetMachinery(index) {
    const machinery = this.stageAssemblies[index].machinery;
    machinery.brakeLeft.setX(machinery.wheelX - 69);
    machinery.brakeRight.setX(machinery.wheelX + 69);
    machinery.pressureBar.setScale(1);
    machinery.gaugeNeedle.setAngle(-38);
    machinery.powerLamp.setFillStyle(0x405159, 0.9).setScale(1);
    machinery.motor.setAngle(0);
    machinery.flywheel.setAngle(0);
    machinery.flywheelSpoke.setAngle(0);
    machinery.bogieFrame?.setY(machinery.initialBogieY);
    machinery.airReservoir
      ?.setY(machinery.initialReservoirY)
      .setScale(1)
      .setAlpha(0.92);
    machinery.airPipe?.setAlpha(0.78);
    machinery.wheelSpokeLeft?.setAngle(0);
    machinery.wheelSpokeRight?.setAngle(0);
    machinery.axlePulse?.setAlpha(0.08).setScale(1);
    if (machinery.trolley) {
      machinery.trolley.setX(machinery.initialTrolleyX);
      machinery.trolleyFollowers?.forEach(([part, dx]) => part?.setX(machinery.initialTrolleyX + dx));
    }
    if (machinery.couplerLeft) {
      machinery.couplerLeft.setX(machinery.initialCouplerLeftX);
      machinery.couplerRight.setX(machinery.initialCouplerRightX);
    }
  }

  currentStage() {
    const index = this.scene.tutorialPuzzle.stageIndex;
    return { ...this.config.stages[index], index };
  }

  /**
   * Integrates line pressure for section V. Called every frame with the frame
   * delta so the bleed reads as a continuous physical process rather than a
   * state flip. The gauge needle follows the real value, which is what makes the
   * mechanic legible without any text.
   */
  update(time, delta = 16) {
    const puzzle = this.scene.tutorialPuzzle;
    this.updateContactInterlock(delta);
    this.updateAirCircuitStage(delta);
    this.updateFirstWeightStage(delta);
    this.updateTwoTrueThingsStage(delta);
    this.updateTrainRemembersStage(delta);
    this.updateWeightTransferStage(delta);
    this.updateBogieDiagnosisStage(delta);
    this.updateEchoReplayStage(delta);
    this.updateMechanicalTableStage(delta);
    this.updateDrum(delta);
    if (puzzle.phase === 'approach') {
      const stage = this.currentStage();
      if (this.scene.player.x >= stage.startX + 72) {
        puzzle.phase = 'idle';
        this.scene.registry.set('tutorialPowerState', `junction-${puzzle.stageIndex + 1}-ready`);
        this.refresh();
        this.scene.refreshTutorialStageVisuals();
      }
      return;
    }
    if (puzzle.phase === 'echo-sync' && time > puzzle.echoWindowUntil) {
      const stageIndex = puzzle.stageIndex;
      const nodeIndex = puzzle.echoSyncIndex;
      puzzle.phase = 'echo-retry';
      puzzle.activeCommand = null;
      sfx.blocked();
      this.scene.applyHitstop(70, 0.08);
      this.scene.pulseTutorialVignette(0x8e2634, 0.98, 360);
      this.scene.cameras.main.shake(140, 0.0035);
      this.scene.game.events.emit('hud:toast', 'The two moments slipped apart. PAST circles back to the same contact.');
      this.scene.time.delayedCall(520, () => {
        if (puzzle.stageIndex === stageIndex && puzzle.phase === 'echo-retry') {
          this.beginEchoSync(stageIndex, nodeIndex);
        }
      });
      this.refresh();
      return;
    }
  }

  // Created on demand rather than in the constructor so the shared network
  // exists exactly once per session, and so stages without an airCircuit
  // block never allocate one. The airNetwork instance is THE shared one the
  // later phases read (SYSTEM ARC LOCK §2) — never a per-stage copy.
  ensureAirCircuitState(stage) {
    const puzzle = this.scene.tutorialPuzzle;
    if (!stage?.airCircuit) return null;
    if (!puzzle.airCircuit) {
      puzzle.airNetwork = createAirNetwork();
      puzzle.airCircuit = createLocalAirCircuit({ airNetwork: puzzle.airNetwork });
    }
    return puzzle.airCircuit;
  }

  // Runs every frame while the player is in Section III. Owns enter timing,
  // the bleed hold, event draining into world feedback, the steady-state
  // redraw and the completion hand-off. The physics itself lives in the two
  // frozen pure modules; this layer only wires them to the scene.
  updateAirCircuitStage(delta) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const stage = this.currentStage();
    if (!stage?.airCircuit) return;
    if (['opening', 'approach', 'departure', 'complete'].includes(puzzle.phase)) return;
    const phase = this.ensureAirCircuitState(stage);
    if (!phase) return;

    if (this.airCircuitQaFreeze) {
      // The ?qa=phase3 route drove the live instance to a fixture state. Hold
      // it exactly; the steady-state redraw still runs so the frame always
      // shows the fixture snapshot.
      this.refreshAirCircuitVisuals(phase.snapshot());
      return;
    }

    // Enter once the player steps past the room threshold.
    if (scene.player.x >= stage.startX + 10) phase.enter();

    // Hand on the wheel: the bleed is a HOLD. Releasing E or walking off the
    // valve closes it on the next frame — the same long-hold gesture the
    // relay work taught, carried forward unchanged.
    const radius = stage.airCircuit.interactRadius ?? 62;
    const valve = scene.interactables.find(
      (it) => it.def.stage === puzzle.stageIndex
        && it.def.kind === 'air-lock'
        && it.def.command === 'bleed',
    );
    const atValve = valve
      ? Math.abs(valve.sprite.x - scene.player.x) < radius && scene.player.lane === valve.def.lane
      : false;
    const bleedHeld = Boolean(scene.inputState?.interactHeld && atValve);

    const wasVenting = phase.snapshot().door.venting;
    phase.update(delta, { bleedHeld });
    const snap = phase.snapshot();
    if (wasVenting && !snap.door.venting && !snap.stageComplete) {
      // The valve clunks shut instead of hissing. Nothing is written to the
      // HUD for it.
      sfx.lever();
    }

    phase.drainEvents().forEach((evt) => this.handleAirCircuitEvent(evt));
    this.refreshAirCircuitVisuals(snap);

    // Supply vs vent pulses, opposite directions on the same overhead run:
    // this is the visual the one-time hint may only follow, never precede.
    this._airPulseCooldown -= delta;
    if (snap.door.venting && this._airPulseCooldown <= 0) {
      const machinery = this.stageAssemblies[puzzle.stageIndex]?.machinery;
      if (machinery?.airPipe?.__hissX) {
        this._airPulseCooldown = 260;
        this.spawnAirPulse(machinery, 'supply');
        this.spawnAirPulse(machinery, 'vent');
      }
    }
  }

  // One-way visual evidence on the pipe: warm pulses keep arriving from the
  // reservoir side while pale exhaust bursts leave at the bleed wheel.
  spawnAirPulse(machinery, kind) {
    const { scene } = this;
    const pipe = machinery.airPipe;
    const y = pipe.__hissY + Phaser.Math.Between(-2, 2);
    if (kind === 'supply') {
      const mark = this.track(
        scene.add.rectangle(pipe.__spanLeft, y, 12, 3, C(CAR.BRASS_HI), 0.85)
          .setBlendMode(Phaser.BlendModes.ADD),
        59,
      );
      scene.tweens.add({
        targets: mark,
        x: pipe.__hissX - 20,
        alpha: 0,
        duration: 480,
        ease: 'Quad.easeIn',
        onComplete: () => mark.destroy(),
      });
      return;
    }
    // Exhaust: bursts out of the bleed wheel and dies in the open air.
    const puff = this.track(
      scene.add.rectangle(pipe.__hissX, pipe.__hissY + 6, 8, 3, C(CAR.STEEL_HI), 0.7)
        .setBlendMode(Phaser.BlendModes.ADD),
      59,
    );
    scene.tweens.add({
      targets: puff,
      y: pipe.__hissY + 30,
      scaleX: 2.4,
      alpha: 0,
      duration: 340,
      ease: 'Sine.easeOut',
      onComplete: () => puff.destroy(),
    });
  }

  // Events from the frozen state machine, translated to world feedback.
  // Completion is handed to the shared path only on door-release-ready; the
  // pure module then reaches OPEN exactly when the gate tween ends
  // (GameScene.playTutorialGateOpen -> confirmDoorOpened()).
  handleAirCircuitEvent(evt) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const findDevice = (command) => scene.interactables.find(
      (it) => it.def.stage === puzzle.stageIndex
        && it.def.kind === 'air-lock'
        && it.def.command === command,
    );
    if (evt.type === 'supply-stall-first') {
      // ONE line, once, after a full visible pulse cycle. It names the
      // symptom, never the valve.
      scene.game.events.emit('hud:toast', LOCAL_AIR_CIRCUIT_PROMPTS.supplyStall);
      return;
    }
    if (evt.type === 'branch-isolated' || evt.type === 'branch-restored') {
      const valve = findDevice('isolate');
      if (valve) {
        scene.pulseTutorialDevice(
          valve.sprite,
          evt.type === 'branch-isolated' ? CAR.LAMP_OK : CAR.STEEL_MID,
        );
      }
      sfx.lever();
      return;
    }
    if (evt.type === 'door-release-ready') {
      puzzle.airCircuit?.beginDoorOpening();
      sfx.door();
      this.completeStage({ pendingActions: ['door'] });
      return;
    }
    if (evt.type === 'door-relocked') {
      // Premature re-pressurisation: the claw bites back and says so on
      // itself. Nothing is reset; the pipe is exactly where the player
      // left it.
      const gate = scene.tutorialGates?.[puzzle.stageIndex];
      sfx.blocked();
      scene.cameras.main.shake(90, 0.0025);
      if (gate?.latchTop) scene.pulseTutorialDevice(gate.latchTop, CAR.LAMP_ALERT);
      if (gate?.latchBottom) scene.pulseTutorialDevice(gate.latchBottom, CAR.LAMP_ALERT);
    }
  }

  // The gauge, the pipe and the claw jaws all read the same one number. Driven
  // straight from the snapshot every frame, so the player can watch the
  // pressure fight instead of being told about it.
  refreshAirCircuitVisuals(snap) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const machinery = this.stageAssemblies[puzzle.stageIndex]?.machinery;
    const fraction = Phaser.Math.Clamp(snap.door.pressure / 100, 0, 1);

    // Needle sweeps the full dial: -90deg empty to +90deg full.
    if (machinery?.gaugeNeedle) {
      machinery.gaugeNeedle.setAngle(-90 + fraction * 180);
    }
    // The pipe hangs slack when the air is gone and pulls taut when charged.
    if (machinery?.airPipe) {
      machinery.airPipe.setAlpha(0.35 + fraction * 0.55);
      if (machinery.airPipe.__spanWidth) {
        const sag = Math.round((1 - fraction) * 14);
        if (sag !== machinery.airPipe.__sag) this.drawAirPipe(machinery.airPipe, sag);
      }
    }
    if (machinery?.pressureBar) {
      machinery.pressureBar.setScale(1, Math.max(0.06, fraction));
    }
    // The door cylinder piston extends with pressure (holding the latch) and
    // retracts as the air is bled. While bleeding against live supply it
    // creeps out and gets shoved back — the cylinder's own story in one pose.
    if (machinery?.doorPiston) {
      machinery.doorPiston.setScale(0.15 + fraction * 0.85, 1);
      machinery.doorPiston.setFillStyle(
        snap.doorLatchReleased ? C(CAR.LAMP_OK) : C(CAR.STEEL_HI),
        0.9,
      );
    }

    // The claw itself is the answer sheet: the jaws part as pressure falls
    // and bite back as it returns. While bleeding against live supply the
    // player watches them creep and get shoved back — the cylinder's story
    // told in one pose.
    const gate = scene.tutorialGates?.[puzzle.stageIndex];
    if (gate) {
      const slack = (1 - fraction) * 22;
      gate.latchTop?.setY(336 - slack);
      gate.latchBottom?.setY(406 + slack);
      const jawTint = snap.doorLatchReleased ? CAR.LAMP_OK : CAR.BRASS_MID;
      gate.latchTop?.setFillStyle(jawTint, 0.88);
      gate.latchBottom?.setFillStyle(jawTint, 0.88);
    }
  }

  // ------------------------------------------ Phases IV-VI shared table --
  // The old IV/V/VI orchestrators remain below as historical compatibility
  // code, but level.js no longer gives any runtime stage their data fields.
  // All three live rooms enter this one table and differ only in constraints.

  ensureMechanicalTableState(stage) {
    const puzzle = this.scene.tutorialPuzzle;
    const phaseNumber = stage?.mechanicalTable?.phase;
    if (!phaseNumber) return null;
    const existing = puzzle.mechanicalTable;
    if (!existing || existing.snapshot().phase !== phaseNumber) {
      puzzle.mechanicalTable = createMechanicalTable({
        phase: phaseNumber,
        trace: phaseNumber === 6 ? puzzle.mechanicalTableTrace : null,
      });
      this._mechanicalTableCompletionPending = false;
    }
    return puzzle.mechanicalTable;
  }

  updateMechanicalTableStage(delta) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const stage = this.currentStage();
    if (!stage?.mechanicalTable) return;
    if (['opening', 'approach', 'departure', 'complete'].includes(puzzle.phase)) return;
    const phase = this.ensureMechanicalTableState(stage);
    if (!phase) return;
    if (scene.player.x >= stage.startX + 10) phase.enter();
    if (!this.mechanicalTableQaFreeze) phase.update(delta);
    phase.drainEvents().forEach((event) => this.handleMechanicalTableEvent(event, phase));
    if (this.mechanicalPanelMode?.startsWith('table-')) this.refreshMechanicalPanel();
  }

  operateMechanicalTable() {
    const stage = this.currentStage();
    const phase = this.ensureMechanicalTableState(stage);
    if (!phase || this.mechanicalTableQaFreeze) return;
    phase.enter();
    this.scene.player.playInteraction();
    const mode = `table-${stage.mechanicalTable.phase}`;
    if (this.mechanicalPanelMode !== mode) this.openMechanicalPanel(mode);
  }

  handleMechanicalTableEvent(event, phase) {
    const { scene } = this;
    if (event.type === 'pressure-changed') {
      sfx.lever();
      return;
    }
    if (event.type === 'weight-moved' || event.type === 'route-changed' || event.type === 'bridge-changed') {
      sfx.press();
      return;
    }
    if (event.type === 'bridge-refused') {
      sfx.blocked();
      scene.cameras.main.shake(90, 0.0015);
      return;
    }
    if (event.type === 'bearing-released') {
      sfx.lever();
      return;
    }
    if (event.type === 'bearing-result') {
      if (event.result === 'phase-complete' || event.result === 'reference-pass') sfx.door();
      else sfx.blocked();
      return;
    }
    if (event.type !== 'stage-complete' || this._mechanicalTableCompletionPending) return;
    this._mechanicalTableCompletionPending = true;
    if (event.phase === 4) scene.tutorialPuzzle.mechanicalTableTrace = phase.exportTrace();
    scene.time.delayedCall(760, () => {
      if (scene.tutorialPuzzle.mechanicalTable !== phase || !phase.snapshot().stageComplete) return;
      this.completeStage({ pendingActions: [] });
    });
  }

  // ------------------------------------------------------------ Phase IV --
  // Junction-4 runs WEIGHT / ADHESION. The frozen pure module owns the
  // physics (shared airNetwork suspension branch + motor model + trolley +
  // trace); this layer only wires it to the scene: enter timing, the grab
  // verb, event draining into world feedback, the steady-state redraw and
  // the completion hand-off.

  ensureFirstWeightState(stage) {
    const puzzle = this.scene.tutorialPuzzle;
    if (!stage?.firstWeight) return null;
    if (!puzzle.firstWeight) puzzle.firstWeight = createFirstWeight();
    return puzzle.firstWeight;
  }

  updateFirstWeightStage(delta) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const stage = this.currentStage();
    if (!stage?.firstWeight) return;
    if (['opening', 'approach', 'departure', 'complete'].includes(puzzle.phase)) return;
    const phase = this.ensureFirstWeightState(stage);
    if (!phase) return;

    if (scene.player.x >= stage.firstWeight.entryTriggerX) phase.enter();
    const { left, right } = stage.firstWeight.detents;
    const playerNormalized = Phaser.Math.Clamp((scene.player.x - left) / (right - left), 0, 1);
    if (!this.firstWeightQaFreeze) phase.update(delta, { playerX: playerNormalized });
    phase.drainEvents().forEach((event) => this.handleFirstWeightEvent(event));
    const snap = phase.snapshot();
    this.firstWeightArt?.applySnapshot(snap);

    // The proximity anchor is the moving case; its sprite never renders.
    const device = scene.interactables.find(
      (it) => it.def.kind === 'first-weight' && it.def.stage === puzzle.stageIndex,
    );
    if (device) {
      device.sprite
        .setX(Phaser.Math.Linear(left, right, snap.caseX))
        .setY(430)
        .setVisible(false);
    }
  }

  operateFirstWeight() {
    const phase = this.scene.tutorialPuzzle.firstWeight;
    if (!phase || this.firstWeightQaFreeze) return;
    this.scene.player.playInteraction();
    phase.interactCase();
    phase.drainEvents().forEach((event) => this.handleFirstWeightEvent(event));
    this.firstWeightArt?.applySnapshot(phase.snapshot());
    this.refresh();
  }

  handleFirstWeightEvent(event) {
    const { scene } = this;
    const snap = scene.tutorialPuzzle.firstWeight?.snapshot?.();
    if (event.type === 'case-fell') {
      sfx.door();
      scene.cameras.main.shake(150, 0.0025);
      this.firstWeightArt?.pulse(C(CAR.BRASS_MID));
      return;
    }
    if (event.type === 'case-grabbed' || event.type === 'case-released') {
      sfx.press();
      return;
    }
    if (event.type === 'first-balance') {
      sfx.checkpoint();
      this.firstWeightArt?.pulse(C(CAR.LAMP_OK));
      return;
    }
    if (event.type === 'witness-punched') {
      sfx.punch?.();
      scene.applyHitstop(55, 0.1);
      this.firstWeightArt?.pulse(C(CAR.BRASS_HI));
      return;
    }
    if (event.type === 'player-weight-revealed') {
      sfx.lever();
      scene.cameras.main.shake(110, 0.0014);
      return;
    }
    if (event.type === 'latch-refused') {
      sfx.blocked();
      const gate = scene.tutorialGates?.[WEIGHT_TRANSFER_STAGE_INDEX];
      if (gate) {
        scene.tweens.add({ targets: gate.gate, x: gate.gate.x - 4, duration: 55, yoyo: true, repeat: 2 });
      }
      return;
    }
    if (event.type === 'stage-complete' && snap?.stageComplete) {
      // Phase VI consumes the player's actual case movement, not an authored
      // imitation. The pure module guarantees a useful minimum duration.
      scene.tutorialPuzzle.firstWeightTrace = scene.tutorialPuzzle.firstWeight?.exportTrace?.() ?? null;
      sfx.checkpoint();
      this.completeStage({ pendingActions: [] });
    }
  }

  // ------------------------------------------------------------- Phase V --
  // TWO TRUE THINGS. Two cases, two witnessed tags, one new physical place.
  // Logic is pure; this layer owns only world coordinates, feedback and stage
  // completion.
  ensureTwoTrueThingsState(stage) {
    const puzzle = this.scene.tutorialPuzzle;
    if (!stage?.twoTrueThings) return null;
    if (!puzzle.twoTrueThings) puzzle.twoTrueThings = createTwoTrueThings();
    return puzzle.twoTrueThings;
  }

  updateTwoTrueThingsStage(delta) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const stage = this.currentStage();
    if (!stage?.twoTrueThings) return;
    if (['opening', 'approach', 'departure', 'complete'].includes(puzzle.phase)) return;
    const phase = this.ensureTwoTrueThingsState(stage);
    if (!phase) return;

    if (scene.player.x >= stage.twoTrueThings.entryTriggerX) phase.enter();
    const { left, right } = stage.twoTrueThings.rail;
    const playerNormalized = Phaser.Math.Clamp((scene.player.x - left) / (right - left), 0, 1);
    if (!this.twoTrueThingsQaFreeze) phase.update(delta, { playerX: playerNormalized });
    phase.drainEvents().forEach((event) => this.handleTwoTrueThingsEvent(event));
    const snap = phase.snapshot();
    this.twoTrueThingsArt?.applySnapshot(snap);

    scene.interactables
      .filter((it) => it.def.kind === 'two-true-things' && it.def.stage === puzzle.stageIndex)
      .forEach((it) => {
        if (it.def.command?.startsWith('case-')) {
          const id = it.def.command.slice(5);
          const item = snap.cases[id];
          if (item) it.sprite.setX(Phaser.Math.Linear(left, right, item.x));
        }
        it.sprite.setY(430).setVisible(false);
      });
  }

  operateTwoTrueThings(interactable) {
    const phase = this.scene.tutorialPuzzle.twoTrueThings;
    if (!phase || this.twoTrueThingsQaFreeze) return;
    this.scene.player.playInteraction();
    phase.interact(interactable.def.command);
    phase.drainEvents().forEach((event) => this.handleTwoTrueThingsEvent(event));
    this.twoTrueThingsArt?.applySnapshot(phase.snapshot());
    this.refresh();
  }

  handleTwoTrueThingsEvent(event) {
    const { scene } = this;
    const snap = scene.tutorialPuzzle.twoTrueThings?.snapshot?.();
    if (event.type === 'cases-fell') {
      sfx.door();
      scene.cameras.main.shake(150, 0.0025);
      this.twoTrueThingsArt?.pulse(C(CAR.BRASS_MID));
      scene.game.events.emit('hud:toast', 'ARCHIVIST: One record must be removed.');
      return;
    }
    if (event.type === 'witness-punched') {
      sfx.punch?.();
      scene.applyHitstop(55, 0.1);
      const item = snap?.cases?.[event.caseId];
      this.twoTrueThingsArt?.pulse(
        C(CAR.BRASS_HI),
        item ? Phaser.Math.Linear(this.currentStage().twoTrueThings.rail.left, this.currentStage().twoTrueThings.rail.right, item.x) : null,
        375,
      );
      return;
    }
    if (event.type === 'second-cradle-unfolded') {
      sfx.lever();
      scene.cameras.main.shake(100, 0.0013);
      this.twoTrueThingsArt?.pulse(C(CAR.STEEL_HI), this.currentStage().twoTrueThings.secondCradleX, 470);
      scene.game.events.emit('hud:toast', 'The train unfolds a place the rule did not allow.');
      return;
    }
    if (event.type === 'amber-changed' || event.type === 'cyan-changed') {
      sfx.lever();
      const color = event.type === 'amber-changed' ? C(CAR.TUNGSTEN_REFLECT) : C(CAR.LAMP_OK);
      const x = event.type === 'amber-changed'
        ? this.currentStage().twoTrueThings.amberX
        : this.currentStage().twoTrueThings.cyanX;
      this.twoTrueThingsArt?.pulse(color, x, 490);
      return;
    }
    if (event.type === 'case-grabbed' || event.type === 'case-released') {
      sfx.press();
      return;
    }
    if (event.type === 'support-refused') {
      sfx.blocked();
      scene.cameras.main.shake(100, 0.0015);
      return;
    }
    if (event.type === 'case-returned') {
      sfx.door();
      return;
    }
    if (event.type === 'stage-complete' && snap?.stageComplete) {
      sfx.checkpoint();
      this.twoTrueThingsArt?.pulse(C(CAR.LAMP_OK), this.currentStage().twoTrueThings.secondCradleX, 426);
      scene.game.events.emit('hud:toast', 'The train keeps both records.');
      this.completeStage({ pendingActions: [] });
    }
  }

  // ------------------------------------------------------------ Phase VI --
  // THE TRAIN REMEMBERS. PAST repeats IV's movement; PRESENT counterbalances,
  // then leaves the balance to rescue the record. The train completes the
  // missing counter-movement using V's visible winch and air cushion.
  ensureTrainRemembersState(stage) {
    const puzzle = this.scene.tutorialPuzzle;
    if (!stage?.trainRemembers) return null;
    if (!puzzle.trainRemembers) {
      puzzle.trainRemembers = createTrainRemembers({ trace: puzzle.firstWeightTrace });
    }
    return puzzle.trainRemembers;
  }

  updateTrainRemembersStage(delta) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const stage = this.currentStage();
    if (!stage?.trainRemembers) return;
    if (['opening', 'approach', 'departure', 'complete'].includes(puzzle.phase)) return;
    const phase = this.ensureTrainRemembersState(stage);
    if (!phase) return;

    if (scene.player.x >= stage.trainRemembers.entryTriggerX) phase.enter();
    const { left, right } = stage.trainRemembers.rail;
    const playerNormalized = Phaser.Math.Clamp((scene.player.x - left) / (right - left), 0, 1);
    if (!this.trainRemembersQaFreeze) phase.update(delta, { playerX: playerNormalized });
    phase.drainEvents().forEach((event) => this.handleTrainRemembersEvent(event));
    const snap = phase.snapshot();
    this.trainRemembersArt?.applySnapshot(snap);

    scene.interactables
      .filter((it) => it.def.kind === 'train-remembers' && it.def.stage === puzzle.stageIndex)
      .forEach((it) => {
        if (it.def.command === 'present-case') {
          it.sprite.setX(Phaser.Math.Linear(left, right, snap.presentX));
        } else if (it.def.command === 'catch') {
          it.sprite.setX(stage.trainRemembers.catchX);
        }
        it.sprite.setY(430).setVisible(false);
      });
  }

  operateTrainRemembers(interactable) {
    const phase = this.scene.tutorialPuzzle.trainRemembers;
    if (!phase || this.trainRemembersQaFreeze) return;
    this.scene.player.playInteraction();
    phase.interact(interactable.def.command);
    phase.drainEvents().forEach((event) => this.handleTrainRemembersEvent(event));
    this.trainRemembersArt?.applySnapshot(phase.snapshot());
    this.refresh();
  }

  handleTrainRemembersEvent(event) {
    const { scene } = this;
    const snap = scene.tutorialPuzzle.trainRemembers?.snapshot?.();
    if (event.type === 'duet-started') {
      sfx.checkpoint();
      this.trainRemembersArt?.pulse(C(CAR.TUNGSTEN_REFLECT), this.currentStage().trainRemembers.pivotX, 328);
      return;
    }
    if (event.type === 'case-grabbed' || event.type === 'case-released') {
      sfx.press();
      return;
    }
    if (event.type === 'pose-matched') {
      sfx.checkpoint();
      this.trainRemembersArt?.pulse(C(CAR.LAMP_OK), this.currentStage().trainRemembers.pivotX, 438);
      return;
    }
    if (event.type === 'echo-redacted') {
      sfx.blocked();
      scene.cameras.main.shake(120, 0.0012);
      scene.game.events.emit('hud:toast', 'ARCHIVIST: Contradiction removed.');
      return;
    }
    if (event.type === 'catch-reached-for') {
      sfx.blocked();
      return;
    }
    if (event.type === 'case-caught') {
      sfx.punch?.();
      scene.applyHitstop(70, 0.12);
      this.trainRemembersArt?.pulse(C(CAR.SKY_RIM), this.currentStage().trainRemembers.catchX, 430);
      return;
    }
    if (event.type === 'train-countermovement') {
      sfx.lever();
      scene.cameras.main.shake(160, 0.002);
      scene.game.events.emit('hud:toast', 'The train remembers what you chose to carry.');
      return;
    }
    if (event.type === 'stage-complete' && snap?.stageComplete) {
      sfx.checkpoint();
      this.completeStage({ pendingActions: [] });
    }
  }

  ensureWeightTransferState(stage) {
    const puzzle = this.scene.tutorialPuzzle;
    if (!stage?.weightTransfer) return null;
    if (!puzzle.weightTransfer) {
      // The SAME shared airNetwork Phase III used (lock §2.1). A QA warp that
      // skips III creates it here so the instance still exists exactly once.
      if (!puzzle.airNetwork) puzzle.airNetwork = createAirNetwork();
      if (!puzzle.motorAdhesion) puzzle.motorAdhesion = createMotorAdhesion();
      puzzle.weightTransfer = createWeightTransfer({
        airNetwork: puzzle.airNetwork,
        motor: puzzle.motorAdhesion,
      });
    }
    return puzzle.weightTransfer;
  }

  updateWeightTransferStage(delta) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const stage = this.currentStage();
    if (!stage?.weightTransfer) return;
    if (['opening', 'approach', 'departure', 'complete'].includes(puzzle.phase)) return;
    const phase = this.ensureWeightTransferState(stage);
    if (!phase) return;

    if (this.weightTransferQaFreeze) {
      // The ?qa=phase4 route drove the live instance to a fixture state. Hold
      // it exactly; the steady-state redraw still runs so the frame always
      // shows the fixture snapshot.
      this.refreshWeightTransferVisuals(phase.snapshot());
      return;
    }

    if (scene.player.x >= stage.startX + 10) phase.enter();

    // The grab verb: while the player holds the counterweight, walking moves
    // the trolley instead of the player — the load path under the floor is
    // the puzzle, so the body and the weight stay together.
    const preSnap = phase.snapshot();
    if (preSnap.grabbed) {
      const dir = (scene.inputState?.right ? 1 : 0) + (scene.inputState?.left ? -1 : 0);
      if (dir) phase.moveTrolley(dir, delta);
      const track = stage.weightTransfer.trolley;
      const trolleyWorldX = track.leftX
        + phase.snapshot().trolleyX * (track.rightX - track.leftX);
      scene.player.body.reset(trolleyWorldX, scene.player.y);
    }

    phase.update(delta);
    phase.drainEvents().forEach((evt) => this.handleWeightTransferEvent(evt));
    const snap = phase.snapshot();
    this.refreshWeightTransferVisuals(snap);

    // Free-rev sparks: the wheel spins unloaded, so the rail throws light.
    // Rate and brightness follow wheelSpeed, no words needed.
    this._sparkCooldown -= delta;
    if (snap.motor.wheelState === 'spinning' && this._sparkCooldown <= 0) {
      this._sparkCooldown = 170 - snap.motor.wheelSpeed * 110;
      this.spawnWheelSpark(stage);
    }
  }

  spawnWheelSpark(stage) {
    const { scene } = this;
    const machinery = this.stageAssemblies[WEIGHT_TRANSFER_STAGE_INDEX]?.machinery;
    const originX = machinery?.__driveWheelX ?? (stage.startX + stage.endX) / 2 + 185;
    const originY = machinery?.__driveWheelY ?? 566;
    const spark = this.track(
      scene.add.rectangle(
        originX + Phaser.Math.Between(-8, 8),
        originY + Phaser.Math.Between(-3, 3),
        Phaser.Math.Between(4, 9),
        2,
        C(CAR.BRASS_HI),
        0.95,
      ).setBlendMode(Phaser.BlendModes.ADD),
      59,
    );
    scene.tweens.add({
      targets: spark,
      x: spark.x - Phaser.Math.Between(24, 60),
      y: spark.y + Phaser.Math.Between(8, 26),
      alpha: 0,
      duration: Phaser.Math.Between(220, 420),
      ease: 'Quad.easeIn',
      onComplete: () => spark.destroy(),
    });
  }

  operateWeightTransfer(interactable) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const phase = puzzle.weightTransfer;
    if (!phase || this.weightTransferQaFreeze) return;
    const command = interactable.def.command;
    scene.player.playInteraction();

    if (command === 'trolley') {
      phase.setTrolleyGrabbed(!phase.snapshot().grabbed);
    } else {
      phase.interact(command);
    }
    phase.drainEvents().forEach((evt) => this.handleWeightTransferEvent(evt));
    this.refresh();
  }

  // Events from the frozen orchestrator, translated to world feedback. Every
  // state change is announced on the device that caused it; completion is
  // handed to the shared path only when the car itself has moved.
  handleWeightTransferEvent(evt) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const findDevice = (command) => scene.interactables.find(
      (it) => it.def.stage === puzzle.stageIndex
        && it.def.kind === 'weight-transfer'
        && it.def.command === command,
    );
    if (evt.type === 'suspension-drain-closed') {
      // The hiss dies. The gauge stays low — the line is still cut off, and
      // the needle says so without a word.
      const device = findDevice('level-drain');
      if (device) scene.pulseTutorialDevice(device.sprite, CAR.LAMP_OK);
      sfx.lever();
      return;
    }
    if (evt.type === 'suspension-supply-opened') {
      const device = findDevice('level-supply');
      if (device) scene.pulseTutorialDevice(device.sprite, CAR.LAMP_OK);
      sfx.lever();
      return;
    }
    if (evt.type === 'control-bounce') {
      // A device pressed where it has nothing to do clunks in place.
      const device = findDevice(evt.command);
      if (device) scene.pulseTutorialDevice(device.sprite, CAR.LAMP_ALERT);
      sfx.blocked();
      return;
    }
    if (evt.type === 'trolley-grabbed' || evt.type === 'trolley-released') {
      const device = findDevice('trolley');
      if (device) scene.pulseTutorialDevice(device.sprite, CAR.BRASS_MID);
      sfx.press();
      return;
    }
    if (evt.type === 'motor-energized') {
      const device = findDevice('test');
      if (device) scene.pulseTutorialDevice(device.sprite, CAR.BRASS_HI);
      sfx.lever();
      return;
    }
    if (evt.type === 'motor-de-energized') {
      const device = findDevice('test');
      if (device) scene.pulseTutorialDevice(device.sprite, CAR.STEEL_MID);
      sfx.lever();
      return;
    }
    if (evt.type === 'test-reset-required') {
      // Real control-stand grammar: an unsuccessful live test must be
      // returned to OFF before a prepared rig can be tested again.  The
      // handle answers, rather than D movement silently completing the room.
      const device = findDevice('test');
      if (device) scene.pulseTutorialDevice(device.sprite, CAR.LAMP_ALERT);
      sfx.blocked();
      return;
    }
    if (evt.type === 'wheel-bite') {
      // The wheels catch: one deep clunk through the floor, sparks dying.
      sfx.door();
      scene.cameras.main.shake(120, 0.0022);
      return;
    }
    if (evt.type === 'car-move-complete') {
      // The car reaches the aligned position. The trace is settled in the
      // same step by the pure module; record it for Phase VI before the
      // completion reveal takes the camera.
      const phase = puzzle.weightTransfer;
      if (phase) puzzle.weightTrace = phase.buildTrace();
      sfx.checkpoint();
      scene.cameras.main.shake(260, 0.004);
      this.completeStage({ pendingActions: [] });
    }
  }

  // Trolley, suspension bags, body tilt and the TEST stand lamp all read the
  // same snapshot. Driven every frame so the player watches the weight work
  // instead of being told about it.
  refreshWeightTransferVisuals(snap) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const stage = this.currentStage();
    const track = stage?.weightTransfer?.trolley;
    const machinery = this.stageAssemblies[puzzle.stageIndex]?.machinery;
    if (!track || !machinery) return;
    const trolleyWorldX = track.leftX + snap.trolleyX * (track.rightX - track.leftX);

    if (machinery.trolley) {
      machinery.trolley.setX(trolleyWorldX);
      machinery.trolley.setFillStyle(
        snap.grabbed ? C(CAR.BRASS_MID) : 0x3a4a52,
        1,
      );
      // Rails stay put; the maintenance trolley's parts ride the chassis.
      machinery.trolleyFollowers?.forEach(([part, dx]) => part?.setX(trolleyWorldX + dx));
    }
    // The proximity target follows the moving counterweight.
    if (!this._trolleyDevice) {
      this._trolleyDevice = scene.interactables.find(
        (it) => it.def.kind === 'weight-transfer' && it.def.command === 'trolley',
      );
      // The underfloor rectangle is the trolley's body; the routing sprite
      // would only double it.
      this._trolleyDevice?.sprite.setVisible(false);
    }
    if (this._trolleyDevice) this._trolleyDevice.sprite.setX(trolleyWorldX);

    // Air springs + EQUALIZER BEAM (VISIBLE SYSTEM ARC CORRECTION §2): each
    // bag carries its own side of the load split — the drive-side bag
    // compresses as the counterweight walks home, the far side unloads. The
    // equalizer beam pivots on its central fulcrum with the same split, its
    // link rods press the drive bag AND the drive axlebox (which sinks), and
    // the wheel-rail contact glows. THIS is the load gauge — the dial is
    // only corroboration, and no arrows or labels stand in for the motion.
    const health = snap.suspensionHealth;
    const rearLoad = Phaser.Math.Clamp(snap.motor.axleLoad.rear ?? 0, 0, 1);
    const frontLoad = Phaser.Math.Clamp(snap.motor.axleLoad.front ?? 0, 0, 1);
    [
      [machinery.suspensionBagFront, frontLoad],
      [machinery.suspensionBagRear, rearLoad],
    ].forEach(([bag, sideLoad]) => {
      if (!bag) return;
      bag.setScale(1, (0.3 + health * 0.7) * (1 - 0.3 * sideLoad));
      bag.setFillStyle(
        snap.suspension.venting ? C(CAR.LAMP_ALERT) : 0x43545b,
        0.92,
      );
    });
    if (machinery.equalizerArt) {
      const art = machinery.equalizerArt;
      const pivotX = (machinery.__bagFrontX + machinery.__bagRearX) / 2;
      const pivotY = machinery.__beamPivotY;
      const half = (machinery.__bagRearX - machinery.__bagFrontX) / 2 - 8;
      // Keep the equalizer recognisably mechanical: a five-degree working
      // range is enough to read without turning it into a giant ramp.
      const ang = (rearLoad - frontLoad) * 0.22;
      const cosA = Math.cos(ang);
      const sinA = Math.sin(ang);
      const leftEnd = { x: pivotX - half * cosA, y: pivotY - half * sinA };
      const rightEnd = { x: pivotX + half * cosA, y: pivotY + half * sinA };
      const sink = rearLoad * 9;
      art.clear();
      // A travelling plunger drops from the counterweight rail onto the
      // equalizer. This is the missing visual verb: the player can now trace
      // trolley -> plunger -> rocking beam -> loaded axle in one silhouette.
      const saddleX = Phaser.Math.Clamp(trolleyWorldX, leftEnd.x + 18, rightEnd.x - 18);
      const saddleT = (saddleX - leftEnd.x) / Math.max(1, rightEnd.x - leftEnd.x);
      const saddleY = Phaser.Math.Linear(leftEnd.y, rightEnd.y, saddleT);
      art.lineStyle(5, 0x687981, 0.92);
      art.lineBetween(saddleX, 470, saddleX, saddleY - 11);
      art.fillStyle(C(CAR.BRASS_MID), 0.95);
      art.fillRoundedRect(saddleX - 15, saddleY - 13, 30, 11, 4);
      art.lineStyle(2, C(CAR.BRASS_HI), 0.82);
      art.strokeRoundedRect(saddleX - 15, saddleY - 13, 30, 11, 4);
      // Fulcrum: an unmistakable central pivot the beam rocks on.
      art.fillStyle(0x2a3940, 1);
      art.fillTriangle(pivotX - 22, pivotY + 34, pivotX + 22, pivotY + 34, pivotX, pivotY + 5);
      art.lineStyle(2, 0xc1c9c6, 0.85);
      art.strokeTriangle(pivotX - 22, pivotY + 34, pivotX + 22, pivotY + 34, pivotX, pivotY + 5);
      // Twin steel equalizer leaves with a narrow air gap read as a railway
      // suspension part, not a platform. Brass is restricted to the wear edge.
      art.lineStyle(9, 0x53656d, 1);
      art.lineBetween(leftEnd.x, leftEnd.y, rightEnd.x, rightEnd.y);
      art.lineStyle(5, 0x263840, 1);
      art.lineBetween(leftEnd.x, leftEnd.y + 8, rightEnd.x, rightEnd.y + 8);
      art.lineStyle(3, C(CAR.BRASS_MID), 0.95);
      art.lineBetween(leftEnd.x, leftEnd.y - 5, rightEnd.x, rightEnd.y - 5);
      art.fillStyle(C(CAR.BRASS_HI), 1);
      art.fillCircle(pivotX, pivotY + 3, 7);
      art.lineStyle(2, 0x0a1015, 0.9);
      art.strokeCircle(pivotX, pivotY + 3, 7);
      // Link rods: beam ends -> both air-spring seats, and the drive-side
      // rod continuing down to the sinking drive axlebox.
      art.lineStyle(4, 0x53656d, 0.95);
      art.lineBetween(leftEnd.x, leftEnd.y, machinery.__bagFrontX, pivotY + 14);
      art.lineBetween(rightEnd.x, rightEnd.y, machinery.__bagRearX, pivotY + 14);
      art.lineBetween(rightEnd.x, rightEnd.y, machinery.__driveAxleX, machinery.__driveWheelY - 23 + sink);
      // Drive axle sink: the axlebox overlay and the wheel spoke drop with
      // the load; the rail stays put, so the wheel visibly presses INTO it.
      if (machinery.driveAxleDrop) {
        machinery.driveAxleDrop.setY(machinery.__driveWheelY - 7 + sink);
        machinery.driveAxleDrop.setStrokeStyle(2, sink > 1 ? C(CAR.BRASS_MID) : 0x91a3a9, 0.75);
      }
      if (machinery.wheelSpokeRight) {
        machinery.wheelSpokeRight.setY(machinery.__driveWheelY + sink);
      }
      if (machinery.driveContactGlow) {
        const biting = snap.motor.wheelState === 'biting';
        machinery.driveContactGlow.setAlpha(
          Phaser.Math.Clamp(0.06 + rearLoad * 0.5 + (biting ? 0.35 : 0), 0, 0.95) * (health > 0.05 ? 1 : 0.25),
        );
      }
    }
    if (machinery.bodyTilt) {
      const split = snap.motor.axleLoad.rear - snap.motor.axleLoad.front;
      machinery.bodyTilt.setAngle(split * 4.5);
    }
    if (machinery.driveStateLabel) {
      const state = snap.motor.wheelState;
      machinery.driveStateLabel
        .setText(
          snap.testAttempt === 'stale' && snap.readyForTest
            ? 'TEST HANDLE  /  RETURN TO OFF'
            : snap.readyForTest && !snap.motor.energized
              ? 'LOAD + PRESSURE READY  /  TEST'
              : state === 'biting'
                ? 'DRIVE AXLE  /  GRIP'
                : state === 'spinning'
                  ? 'DRIVE AXLE  /  SLIP'
                  : 'DRIVE AXLE  /  NO LOAD',
        )
        .setColor(
          snap.testAttempt === 'stale'
            ? '#e45a5f'
            : snap.readyForTest
              ? '#75d4cd'
              : state === 'biting'
                ? '#75d4cd'
                : state === 'spinning'
                  ? '#e45a5f'
                  : '#687981',
        );
    }
    // The TEST stand lamp follows the motor, not a step counter: amber while
    // energized, bright while biting, dark at rest.
    if (machinery.testLamp) {
      const lit = snap.motor.energized;
      const biting = snap.motor.wheelState === 'biting';
      machinery.testLamp
        .setFillStyle(biting ? C(CAR.LAMP_OK) : lit ? C(CAR.BRASS_HI) : 0x405159, 0.95)
        .setAlpha(lit ? 0.9 : 0.45);
    }
    // The gauge dial corroborates the suspension branch pressure.
    if (machinery.gaugeNeedle) {
      const fraction = Phaser.Math.Clamp(snap.suspension.pressure / 100, 0, 1);
      machinery.gaugeNeedle.setAngle(-90 + fraction * 180);
    }
    // Flywheel spin follows wheelSpeed: free-rev blur, crawl while biting.
    if (machinery.flywheelSpoke) {
      machinery.flywheelSpoke.setAngle(
        (machinery.flywheelSpoke.angle + snap.motor.wheelSpeed * 9) % 360,
      );
    }
    // UNDERCARRIAGE VIEW TEACHING: the AXLE tells the same story as the
    // motor so the player can compare them under one look. wheelSpeed drives
    // the wheel spokes physically (a slipping wheel DOES spin — fast and
    // useless), while the axle pulse separates the outcomes: steady and
    // strong when the wheel bites, dim flicker while it slips. Slip sparks
    // at the drive wheel's rail contact mark the wasted energy.
    // Slip sparks already live in spawnWheelSpark (updateWeightTransferStage,
    // cooldown + rate follows wheelSpeed); this refresh layer only owns the
    // steady-state poses.
    if (machinery.wheelSpokeLeft && snap.motor.wheelSpeed > 0) {
      const step = snap.motor.wheelSpeed * 9;
      machinery.wheelSpokeLeft.setAngle((machinery.wheelSpokeLeft.angle + step) % 360);
      machinery.wheelSpokeRight.setAngle((machinery.wheelSpokeRight.angle + step) % 360);
    }
    if (machinery.axlePulse) {
      const wheelState = snap.motor.wheelState;
      machinery.axlePulse.setAlpha(
        wheelState === 'biting' ? 0.5 : wheelState === 'spinning' ? 0.14 : 0.08,
      );
    }
  }

  // ------------------------------------------------------------ Phase V ---
  // Junction-5 runs READ THE BOGIE. The frozen pure module owns the physics
  // (two bogies on the same shared systems + the Gate 0 repair chain); this
  // layer only wires it to the scene.

  ensureBogieDiagnosisState(stage) {
    const puzzle = this.scene.tutorialPuzzle;
    if (!stage?.bogieService) return null;
    if (!puzzle.bogieDiagnosis) {
      // The SAME shared instances III/IV used (lock §2). A QA warp that skips
      // them creates them here so each still exists exactly once.
      if (!puzzle.airNetwork) puzzle.airNetwork = createAirNetwork();
      if (!puzzle.motorAdhesion) puzzle.motorAdhesion = createMotorAdhesion();
      puzzle.bogieDiagnosis = createBogieDiagnosis({
        airNetwork: puzzle.airNetwork,
        motor: puzzle.motorAdhesion,
      });
    }
    return puzzle.bogieDiagnosis;
  }

  updateBogieDiagnosisStage(delta) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const stage = this.currentStage();
    if (!stage?.bogieService) return;
    if (['opening', 'approach', 'departure', 'complete'].includes(puzzle.phase)) return;
    const phase = this.ensureBogieDiagnosisState(stage);
    if (!phase) return;

    if (this.bogieQaFreeze) {
      this.refreshBogieVisuals(phase.snapshot());
      return;
    }

    if (scene.player.x >= stage.startX + 10) phase.enter();

    // The bleed wheel is a HOLD, the same hand grammar as Section III: the
    // valve only stays open while E is down and the player stays at it.
    const radius = stage.bogieService.interactRadius ?? 62;
    const valve = scene.interactables.find(
      (it) => it.def.stage === puzzle.stageIndex
        && it.def.kind === 'bogie-service'
        && it.def.command === 'brake-vent',
    );
    const atValve = valve
      ? Math.abs(valve.sprite.x - scene.player.x) < radius && scene.player.lane === valve.def.lane
      : false;
    phase.setVentHeld(
      this.mechanicalPanelMode === 'bogie'
        ? this._mechanicalVentHeld
        : Boolean(scene.inputState?.interactHeld && atValve),
    );

    // The Phase IV load persists: the trolley stayed home and the bags stayed
    // charged, so the drive axle keeps its weight in this room too.
    const transfer = puzzle.weightTransfer?.snapshot();
    phase.update(delta, {
      trolleyX: transfer?.trolleyX ?? 1,
      suspensionHealth: transfer?.suspensionHealth ?? 1,
    });
    phase.drainEvents().forEach((evt) => this.handleBogieDiagnosisEvent(evt));
    const bogieSnap = phase.snapshot();
    this.refreshBogieVisuals(bogieSnap);

    // After isolation the trapped air has exactly one way out: small flow
    // pulses run down the local line toward the bleed wheel until the line
    // is flat (VISIBLE SYSTEM ARC CORRECTION §3 — the pipe, not a paragraph,
    // points at the next device).
    this._bogieFlowCooldown = (this._bogieFlowCooldown ?? 0) - delta;
    if (bogieSnap.brake.isolated && bogieSnap.brake.pressure > 3 && this._bogieFlowCooldown <= 0) {
      this._bogieFlowCooldown = 380;
      this.spawnBogieFlowPulse();
    }
  }

  // One pulse of trapped air travelling the isolated local line: riser down,
  // along the low run, then out of the bleed wheel's downward exhaust stub.
  spawnBogieFlowPulse() {
    const { scene } = this;
    const pulse = this.track(
      scene.add.circle(3580, 655, 4, 0x9fb7c0, 0.85).setBlendMode(Phaser.BlendModes.ADD),
      59,
    );
    scene.tweens.add({
      targets: pulse,
      y: 800,
      duration: 260,
      ease: 'Sine.easeIn',
      onComplete: () => {
        scene.tweens.add({
          targets: pulse,
          x: 3664,
          duration: 180,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            scene.tweens.add({
              targets: pulse,
              y: 838,
              alpha: 0,
              scale: 1.8,
              duration: 220,
              ease: 'Quad.easeOut',
              onComplete: () => pulse.destroy(),
            });
          },
        });
      },
    });
  }

  operateBogieService(interactable) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const phase = puzzle.bogieDiagnosis;
    if (!phase || this.bogieQaFreeze || this._bogieObserving) return;
    if (this.mechanicalPanelMode !== 'bogie') {
      this.openMechanicalPanel('bogie');
      return;
    }
    const command = interactable.def.command;
    scene.player.playInteraction();
    if (command === 'brake-vent') {
      // E only starts the hold; updateBogieDiagnosisStage ends it the moment
      // the key comes up or the player steps off the wheel.
      return;
    }
    phase.interact(command);
    phase.drainEvents().forEach((evt) => this.handleBogieDiagnosisEvent(evt));
    this.refresh();
  }

  // Events from the frozen orchestrator, translated to world feedback.
  handleBogieDiagnosisEvent(evt) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const findDevice = (command) => scene.interactables.find(
      (it) => it.def.stage === puzzle.stageIndex
        && it.def.kind === 'bogie-service'
        && it.def.command === command,
    );
    if (evt.type === 'bogie-selected') {
      // A real rotary selector has a distinct detent; the gauges redraw from
      // the newly selected bogie on the same frame.
      sfx.lever();
      return;
    }
    if (evt.type === 'test-energized' || evt.type === 'test-de-energized') {
      const device = findDevice('test');
      if (device) {
        scene.pulseTutorialDevice(
          device.sprite,
          evt.type === 'test-energized' ? CAR.BRASS_HI : CAR.STEEL_MID,
        );
      }
      sfx.lever();
      // VISIBLE SYSTEM ARC CORRECTION §3: the FIRST test gets a short,
      // automatic observation beat — the camera frames both bogies while the
      // current pulse reaches the healthy wheelset and DIES at the seized
      // actuator, the brake shoe still clamped. Then the camera hands the
      // room back. Later tests stay fully player-owned.
      if (evt.type === 'test-energized' && !this._bogieFirstTestSeen) {
        this._bogieFirstTestSeen = true;
        // The point-and-click test stand already owns the player's attention
        // and presents the two calibrated observations in-place. Do not pull
        // the camera away from that instrument while it is open.
        if (this.mechanicalPanelMode !== 'bogie') this.runBogieContradictionObserve();
      }
      return;
    }
    if (evt.type === 'brake-branch-isolated' || evt.type === 'brake-branch-restored') {
      const device = findDevice('brake-isolate');
      if (device) {
        scene.pulseTutorialDevice(
          device.sprite,
          evt.type === 'brake-branch-isolated' ? CAR.LAMP_OK : CAR.STEEL_MID,
        );
      }
      sfx.lever();
      return;
    }
    if (evt.type === 'service-lock-engaged' || evt.type === 'service-lock-removed') {
      const device = findDevice('service-lock');
      if (device) {
        scene.pulseTutorialDevice(
          device.sprite,
          evt.type === 'service-lock-engaged' ? CAR.LAMP_OK : CAR.STEEL_MID,
        );
      }
      sfx.press();
      scene.cameras.main.shake(60, 0.0018);
      return;
    }
    if (evt.type === 'bogie-repaired') {
      // The seized piston cracks free: one deep knock inside the actuator,
      // felt through the floor. Nothing celebrates — the proof is the TEST.
      const device = findDevice('repair');
      if (device) scene.pulseTutorialDevice(device.sprite, CAR.BRASS_HI);
      sfx.door();
      scene.cameras.main.shake(140, 0.003);
      return;
    }
    if (evt.type === 'fault-localized') {
      // The player has compared two live bogies and isolated the contradiction:
      // current and air both reach B, but its piston never travels.  Mark the
      // cylinder, not a generic UI button, so the diagnosis remains spatial.
      const device = findDevice('repair');
      if (device) scene.pulseTutorialDevice(device.sprite, CAR.LAMP_OK);
      sfx.checkpoint();
      scene.cameras.main.shake(70, 0.0014);
      return;
    }
    if (evt.type === 'brake-applied' && evt.id === 'rear') {
      // Fail-safe: as the local line dies, the clamp audibly bites. That bite
      // is the safe state announcing itself, not a failure.
      sfx.blocked();
      return;
    }
    if (evt.type === 'control-bounce') {
      // A refusal names its missing condition ON the device, never in prose:
      // the pin that will not seat, the piston that will not move.
      const visualCommand = evt.command === 'inspect-actuator' ? 'repair' : evt.command;
      const device = findDevice(visualCommand);
      if (device) scene.pulseTutorialDevice(device.sprite, CAR.LAMP_ALERT);
      // The inspection tray covers the world machinery. Mirror the refusal
      // inside the tray itself so point-and-click players see the part push
      // back under their cursor instead of hearing a disconnected error SFX.
      if (this.mechanicalPanelMode === 'bogie') {
        this._mechanicalBounce = {
          id: visualCommand,
          startedAt: scene.time?.now ?? 0,
          duration: visualCommand === 'repair' ? 360 : 300,
        };
      }
      // The part itself also answers physically: the player tried to move it
      // and the machine pushed back. The pin dips toward its seat and is
      // shoved back out (refreshBogieVisuals rewrites its X and fill every
      // frame, so only Y is free); the jammed piston shudders in its bore
      // (its X is free — only the fill is state-owned).
      const machinery = this.stageAssemblies[puzzle.stageIndex]?.machinery;
      if (machinery) {
        if (visualCommand === 'service-lock' && machinery.servicePin) {
          const pin = machinery.servicePin;
          scene.tweens.killTweensOf(pin);
          scene.tweens.add({
            targets: pin,
            y: pin.y + 5,
            duration: 70,
            yoyo: true,
            repeat: 1,
            ease: 'Sine.easeInOut',
          });
        }
        if (visualCommand === 'repair' && machinery.actuatorPiston) {
          const piston = machinery.actuatorPiston;
          scene.tweens.killTweensOf(piston);
          scene.tweens.add({
            targets: piston,
            x: piston.x + 4,
            duration: 45,
            yoyo: true,
            repeat: 3,
            ease: 'Sine.easeInOut',
          });
        }
      }
      sfx.blocked();
      return;
    }
    if (evt.type === 'stage-complete') {
      sfx.checkpoint();
      scene.cameras.main.shake(240, 0.0035);
      this.completeStage({ pendingActions: [] });
    }
  }

  // First-TEST observation beat (VISIBLE SYSTEM ARC CORRECTION §3): a short
  // automatic framing of the mechanical contradiction. The camera pans to
  // hold BOTH bogies, the test pulse runs the bench cables, the front
  // wheelset answers, the rear pulse dies at the seized actuator with the
  // shoe still clamped — then the room is handed back. ~2.9s total; input
  // is fenced by _bogieObserving so a reflex second E cannot cut the motor
  // mid-beat.
  runBogieContradictionObserve() {
    const { scene } = this;
    const camera = scene.cameras.main;
    this._bogieObserving = true;
    scene.tutorialCameraCinematic = true;
    scene.player.frozen = true;
    scene.player.setVelocity(0, 0);
    camera.stopFollow();
    camera.pan(3550, 700, 460, 'Sine.easeInOut', true, (cam, progress) => {
      if (progress < 1) return;
      this.spawnBogieTestPulses();
      scene.time.delayedCall(2100, () => {
        camera.pan(scene.player.x, 430, 420, 'Sine.easeInOut', true, (cam2, progress2) => {
          if (progress2 < 1) return;
          camera.startFollow(scene.player, true, 0.075, 0.11, 0, 150);
          camera.setDeadzone(220, 170);
          scene.tutorialCameraCinematic = false;
          scene.player.frozen = false;
          this._bogieObserving = false;
        });
      });
    });
  }

  // The evidence itself: one pulse down each motor cable. The front pulse
  // arrives and the healthy wheelset turns (the steady-state refresh owns
  // the spin); the rear pulse travels on — and STOPS at the seized actuator,
  // where the clamped shoe flashes once. Nothing narrates it.
  spawnBogieTestPulses() {
    const { scene } = this;
    const bench = { x: 3500, y: 715 };
    const front = this.track(
      scene.add.circle(bench.x - 14, bench.y, 5, 0xe8d5a7, 0.95).setBlendMode(Phaser.BlendModes.ADD),
      60,
    );
    scene.tweens.add({
      targets: front,
      x: 3300,
      y: 749,
      duration: 520,
      ease: 'Sine.easeIn',
      onComplete: () => {
        scene.tweens.add({
          targets: front,
          alpha: 0,
          scale: 2.2,
          duration: 260,
          onComplete: () => front.destroy(),
        });
      },
    });
    const rear = this.track(
      scene.add.circle(bench.x + 14, bench.y, 5, 0xe8d5a7, 0.95).setBlendMode(Phaser.BlendModes.ADD),
      60,
    );
    scene.tweens.add({
      targets: rear,
      x: 3700,
      y: 749,
      duration: 640,
      ease: 'Sine.easeIn',
      onComplete: () => {
        // The pulse keeps looking for the brake path — and dies at the
        // seized actuator, short of the wheel.
        scene.tweens.add({
          targets: rear,
          x: 3836,
          y: 728,
          duration: 420,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            sfx.blocked();
            const machinery = this.stageAssemblies[BOGIE_SERVICE_STAGE_INDEX]?.machinery;
            if (machinery?.rearShoe) {
              scene.tweens.add({
                targets: machinery.rearShoe,
                alpha: 0.25,
                duration: 130,
                yoyo: true,
                repeat: 2,
              });
            }
            scene.tweens.add({
              targets: rear,
              alpha: 0,
              scale: 0.4,
              duration: 300,
              onComplete: () => rear.destroy(),
            });
          },
        });
      },
    });
  }

  drawSimplifiedBogieWorld(snap, machinery) {
    const art = machinery.simplifiedWorldArt;
    if (!art) return;
    const left = 3222;
    const right = 3968;
    const y = 748;
    const bogies = [3345, 3745];
    art.clear();
    art.fillStyle(C(CAR.VOID), 1);
    art.fillRoundedRect(left, 584, right - left, 282, 14);
    art.lineStyle(3, C(CAR.ENAMEL_MID), 0.86);
    art.strokeRoundedRect(left, 584, right - left, 282, 14);
    // One common TEST bus, two otherwise identical bogies. The comparison is
    // the picture; the local service hatch is the only extra object on B.
    art.lineStyle(6, C(CAR.BRASS_MID), 0.72);
    art.lineBetween(3388, 642, 3702, 642);
    art.fillStyle(C(CAR.ENAMEL_DARK), 1);
    art.fillRoundedRect(3508, 615, 74, 64, 8);
    art.lineStyle(2, C(CAR.BRASS_MID), 0.84);
    art.strokeRoundedRect(3508, 615, 74, 64, 8);
    art.fillStyle(snap.motor.energized ? C(CAR.TUNGSTEN_REFLECT) : C(CAR.ENAMEL_MID), 0.95);
    art.fillCircle(3545, 637, 7);
    bogies.forEach((x, index) => {
      art.fillStyle(C(CAR.ENAMEL_DARK), 1);
      art.fillRoundedRect(x - 116, y - 54, 232, 90, 10);
      art.lineStyle(4, C(CAR.STEEL_MID), 0.95);
      art.lineBetween(x - 92, y - 20, x + 92, y - 20);
      [-62, 62].forEach((dx) => {
        art.fillStyle(C(CAR.VOID), 1);
        art.fillCircle(x + dx, y + 28, 43);
        art.lineStyle(6, C(CAR.STEEL_MID), 0.94);
        art.strokeCircle(x + dx, y + 28, 39);
        art.lineStyle(3, C(CAR.STEEL_DARK), 1);
        art.strokeCircle(x + dx, y + 28, 16);
      });
      const turning = index === 0 ? snap.front.wheelTurning : snap.rear.wheelTurning;
      art.lineStyle(4, turning ? C(CAR.LAMP_OK) : C(CAR.STEEL_HI), turning ? 0.95 : 0.62);
      art.lineBetween(x - 101, y + 28, x + 101, y + 28);
    });
    // B's brake actuator and service door are spatially one assembly.
    art.fillStyle(snap.rear.repaired ? C(CAR.BRASS_MID) : C(CAR.ENAMEL_DARK), 1);
    art.fillRoundedRect(3800, 675, 92, 58, 7);
    art.lineStyle(3, snap.rear.repaired ? C(CAR.LAMP_OK) : C(CAR.LAMP_ALERT), 0.9);
    art.strokeRoundedRect(3800, 675, 92, 58, 7);
    art.lineStyle(5, snap.rear.brakeReleased ? C(CAR.STEEL_MID) : C(CAR.LAMP_ALERT), 0.88);
    art.lineBetween(3774, 708, 3800, 708);
    machinery.simplifiedWorldLabel
      ?.setText(snap.rear.repaired ? 'A  REFERENCE    /    B  RESTORED' : 'A  REFERENCE    /    B  LOCKED    /    [E] INSPECT')
      .setColor(snap.rear.repaired ? '#75d4cd' : '#9fb7c0');
  }

  // Brake shoes, the service pin, wheel spokes and the line gauge all read
  // the same snapshot. The healthy bogie spins under TEST; the faulty one
  // stays dark until the chain is honestly repaired.
  refreshBogieVisuals(snap) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const machinery = this.stageAssemblies[puzzle.stageIndex]?.machinery;
    if (!machinery) return;
    this.drawSimplifiedBogieWorld(snap, machinery);
    if (this.mechanicalPanelMode === 'bogie') this.refreshMechanicalPanel();

    // VISIBLE SYSTEM ARC CORRECTION §3: the five generic floor-lever sprites
    // are retired. Invisible anchors now sit ON the real devices, so the
    // proximity pick and the [E] bubble land on the hardware itself.
    if (!this._bogieDevicesAnchored) {
      this._bogieDevicesAnchored = true;
      const anchors = {
        test: [3500, 700],
        'brake-isolate': [3580, 650],
        'brake-vent': [3660, 817],
        'service-lock': [3775, 728],
        repair: [3860, 703],
      };
      scene.interactables
        .filter((it) => it.def.kind === 'bogie-service')
        .forEach((it) => {
          const anchor = anchors[it.def.command];
          if (!anchor) return;
          it.sprite.setVisible(false);
          // The sparse world has one service hatch. Detailed controls live in
          // the point-and-click close-up, so only TEST remains a reachable
          // world anchor; the other routing sprites are parked off-stage.
          it.sprite.setPosition(
            it.def.command === 'test' ? anchor[0] : -9999,
            it.def.command === 'test' ? anchor[1] : -9999,
          );
        });
    }

    // The gauge corroborates the LOCAL brake line (faulty side).
    if (machinery.gaugeNeedle) {
      const fraction = Phaser.Math.Clamp(snap.brake.pressure / 100, 0, 1);
      machinery.gaugeNeedle.setAngle(-90 + fraction * 180);
    }
    // Shoes on both bogies follow their own brakeReleased: released pulls
    // them off the wheel, applied presses them on. Fail-safe reads at a
    // glance: a flat line is a CLAMPED shoe.
    const poseShoe = (shoe, released, baseX, offX) => {
      if (!shoe) return;
      shoe.setX(released ? offX : baseX);
      shoe.setFillStyle(released ? 0x53656d : 0xe45a5f, released ? 0.5 : 0.72);
    };
    poseShoe(machinery.frontShoe, snap.front.brakeReleased, machinery.__frontShoeOn, machinery.__frontShoeOff);
    poseShoe(machinery.rearShoe, snap.rear.brakeReleased, machinery.__rearShoeOn, machinery.__rearShoeOff);
    // Wheel spokes: the healthy bogie free-spins under TEST; the faulty one
    // only turns again after the honest repair.
    if (machinery.frontSpoke) {
      machinery.frontSpoke.setAngle(
        (machinery.frontSpoke.angle + (snap.front.wheelTurning ? 7 : 0)) % 360,
      );
    }
    if (machinery.rearSpoke) {
      machinery.rearSpoke.setAngle(
        (machinery.rearSpoke.angle + (snap.rear.wheelTurning ? 7 : 0)) % 360,
      );
    }
    // The steel service pin slides across the linkage while seated (Gate 0:
    // the lock must be a VISIBLE mechanical bar, never an invisible boolean).
    if (machinery.servicePin) {
      machinery.servicePin.setX(
        snap.rear.serviceLockEngaged ? machinery.__pinSeatedX : machinery.__pinParkedX,
      );
      machinery.servicePin.setFillStyle(
        snap.rear.serviceLockEngaged ? C(CAR.BRASS_HI) : 0x697980,
        0.95,
      );
    }
    // The seized piston: dark while jammed, brass once freed.
    if (machinery.actuatorPiston) {
      machinery.actuatorPiston.setFillStyle(
        snap.rear.repaired ? C(CAR.BRASS_MID) : 0x2a3940,
        0.95,
      );
    }
    // A single bright route replaces five equally loud control glows. The
    // live segment advances through the real local branch as the player makes
    // it safe: header -> cut-off -> low bleed -> pin guide -> actuator cover.
    if (machinery.bogieServiceFlowArt) {
      const art = machinery.bogieServiceFlowArt;
      art.clear();
      const pulse = 0.58 + 0.22 * Math.sin(scene.time.now / 210);
      art.lineStyle(4, C(CAR.LAMP_OK), pulse);
      if (!snap.brake.isolated) {
        art.lineBetween(3580, 631, 3580, 639);
        art.strokeCircle(3580, 639, 15);
      } else if (snap.brake.pressure > 3) {
        art.lineBetween(3580, 650, 3580, 800);
        art.lineBetween(3580, 800, 3660, 800);
        art.strokeCircle(3660, 817, 15);
      } else if (!snap.rear.serviceLockEngaged) {
        art.lineBetween(3660, 800, 3775, 800);
        art.lineBetween(3775, 800, 3775, 728);
        art.strokeRect(3763, 716, 24, 24);
      } else if (!snap.rear.repaired) {
        art.lineBetween(3775, 728, 3860, 728);
        art.lineBetween(3860, 728, 3860, 703);
        art.strokeRect(3841, 688, 38, 30);
      }
    }
    if (machinery.bogieFrontLabel) {
      machinery.bogieFrontLabel.setColor(snap.front.wheelTurning ? '#75d4cd' : '#9fb7c0');
    }
    if (machinery.bogieRearLabel) {
      machinery.bogieRearLabel
        .setText(snap.rear.repaired ? 'B  RESTORED' : 'B  SERVICE')
        .setColor(snap.rear.repaired ? '#75d4cd' : '#e45a5f');
    }
    // TEST stand lamp follows the shared contactor.
    if (machinery.testLamp) {
      machinery.testLamp
        .setFillStyle(snap.motor.energized ? C(CAR.BRASS_HI) : 0x405159, 0.95)
        .setAlpha(snap.motor.energized ? 0.9 : 0.45);
    }
    // Progressive physical disclosure (VISIBLE SYSTEM ARC CORRECTION §3):
    // only the next physically-meaningful device carries the light — the
    // cutout cock while the line is live, the bleed wheel once isolated,
    // the pin seat once flat, the access cover once locked. Everything else
    // stays at ember level. No text ever lists the order.
    if (machinery.serviceGlows) {
      let focus = 'test';
      if (this._bogieFirstTestSeen) {
        focus = !snap.brake.isolated
          ? 'isolate'
          : snap.brake.pressure > 3
            ? 'vent'
            : !snap.rear.serviceLockEngaged
              ? 'lock'
              : !snap.rear.repaired
                ? 'repair'
                : null;
      }
      if (snap.stageComplete) focus = null;
      const pulse = 0.42 + 0.26 * Math.sin(scene.time.now / 240);
      Object.entries(machinery.serviceGlows).forEach(([key, glow]) => {
        if (!glow) return;
        glow.setAlpha(key === focus ? pulse : 0.08);
      });
    }
  }

  // ------------------------------------------------------------ Phase VI --
  // PAST RIDES THE LOAD (lock §6). The replay orchestrator consumes IV's
  // recorded trace; this wiring owns enter/update timing, the per-frame
  // condition inputs from the ALREADY REPAIRED systems (read-only), event
  // translation and the underfloor visuals.

  ensureEchoReplayState(stage) {
    const puzzle = this.scene.tutorialPuzzle;
    if (!stage?.echoLoad) return null;
    if (!puzzle.echoReplay) {
      // The SAME shared motor instance IV/V used (lock §2). A QA warp that
      // skips them creates it here so it still exists exactly once.
      if (!puzzle.motorAdhesion) puzzle.motorAdhesion = createMotorAdhesion();
      puzzle.echoReplay = createEchoReplay({
        // IV is the only producer; normalizeTrace inside the orchestrator is
        // the only consumer (lock §2.4) — missing/illegal traces degrade to
        // canonical, never back to IV.
        trace: puzzle.weightTrace,
        motor: puzzle.motorAdhesion,
      });
    }
    return puzzle.echoReplay;
  }

  updateEchoReplayStage(delta) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const stage = this.currentStage();
    if (!stage?.echoLoad) return;
    if (['opening', 'approach', 'departure', 'complete'].includes(puzzle.phase)) return;
    const phase = this.ensureEchoReplayState(stage);
    if (!phase) return;

    if (this.echoQaFreeze) {
      this.refreshEchoVisuals(phase.snapshot());
      return;
    }

    if (scene.player.x >= stage.startX + 10) phase.enter();

    // Conditions 1/2/5 are READ from the systems the player already repaired
    // (or, under a QA warp, from the stage-completion flags the warp set).
    const transfer = puzzle.weightTransfer?.snapshot();
    const bogie = puzzle.bogieDiagnosis?.snapshot();
    const air = puzzle.airCircuit?.snapshot();
    phase.update(delta, {
      interlockComplete: Boolean(this.contactLock?.isComplete?.() || puzzle.stageComplete[1]),
      airPathOpen: Boolean(
        (air && (air.doorState === 'OPEN' || air.stageComplete)) || puzzle.stageComplete[2],
      ),
      bogiesSynced: Boolean(
        (bogie && bogie.rear.repaired && bogie.rear.brakeReleased) || puzzle.stageComplete[4],
      ),
      suspensionHealth: transfer?.suspensionHealth ?? 1,
    });
    phase.drainEvents().forEach((evt) => this.handleEchoReplayEvent(evt));
    const echoSnap = phase.snapshot();
    this.refreshEchoVisuals(echoSnap);

    // Early-engage feedback (VISIBLE SYSTEM ARC CORRECTION §4): energizing
    // OUTSIDE the load window free-revs the drive wheel, and the rail says
    // so — sparks at the contact patch, faster while the attempt is stale.
    this._echoSparkCooldown = (this._echoSparkCooldown ?? 0) - delta;
    if (echoSnap.motor.wheelState === 'spinning' && this._echoSparkCooldown <= 0) {
      this._echoSparkCooldown = echoSnap.attempt === 'stale' ? 120 : 210;
      this.spawnEchoWheelSpark();
    }
  }

  // Free-rev sparks at the drive wheelset's rail contact (the VI twin of the
  // Phase IV slip sparks): rate and brightness follow the wasted energy.
  spawnEchoWheelSpark() {
    const { scene } = this;
    const machinery = this.stageAssemblies[ECHO_LOAD_STAGE_INDEX]?.machinery;
    const x0 = machinery?.__echoRailX0 ?? 4060;
    const x1 = machinery?.__echoRailX1 ?? 4740;
    const originX = x0 + (x1 - x0) * 0.875;
    const originY = 807; // drive wheel-rail contact (bogieY + 52)
    const spark = this.track(
      scene.add.rectangle(
        originX + Phaser.Math.Between(-8, 8),
        originY + Phaser.Math.Between(-3, 3),
        Phaser.Math.Between(4, 9),
        2,
        C(CAR.BRASS_HI),
        0.95,
      ).setBlendMode(Phaser.BlendModes.ADD),
      59,
    );
    scene.tweens.add({
      targets: spark,
      x: spark.x - Phaser.Math.Between(24, 60),
      y: spark.y + Phaser.Math.Between(8, 26),
      alpha: 0,
      duration: Phaser.Math.Between(220, 420),
      ease: 'Quad.easeIn',
      onComplete: () => spark.destroy(),
    });
  }

  // The bite proves the chain: current visibly runs the two repaired supply
  // paths — the copper cable (II) and the cyan air run (III/V) — into the
  // drive bogie at the moment the wheels catch.
  spawnEchoConvergencePulses() {
    const { scene } = this;
    const machinery = this.stageAssemblies[ECHO_LOAD_STAGE_INDEX]?.machinery;
    const x0 = machinery?.__echoRailX0 ?? 4060;
    const x1 = machinery?.__echoRailX1 ?? 4740;
    const driveX = x0 + (x1 - x0) * 0.875;
    [
      { y: 618, color: 0xcaa66b, dur: 700 }, // copper cable
      { y: 650, color: 0x75d4cd, dur: 820 }, // cyan air run
    ].forEach(({ y, color, dur }) => {
      const pulse = this.track(
        scene.add.circle(x0 - 14, y, 5, color, 0.95).setBlendMode(Phaser.BlendModes.ADD),
        59,
      );
      scene.tweens.add({
        targets: pulse,
        x: driveX - 10,
        y: y + (driveX - x0) * 0.28,
        duration: dur,
        ease: 'Sine.easeIn',
        onComplete: () => {
          scene.tweens.add({
            targets: pulse,
            alpha: 0,
            scale: 2,
            duration: 240,
            onComplete: () => pulse.destroy(),
          });
        },
      });
    });
  }

  operateEchoLoad(interactable) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const phase = puzzle.echoReplay;
    if (!phase) return;
    if (this.mechanicalPanelMode !== 'echo') {
      this.openMechanicalPanel('echo');
      return;
    }
    if (this.echoQaFreeze) return;
    scene.player.playInteraction();
    phase.interact(interactable.def.command);
    phase.drainEvents().forEach((evt) => this.handleEchoReplayEvent(evt));
    this.refresh();
  }

  // Events from the replay orchestrator, translated to world feedback.
  handleEchoReplayEvent(evt) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const findDevice = (command) => scene.interactables.find(
      (it) => it.def.stage === puzzle.stageIndex
        && it.def.kind === 'echo-load'
        && it.def.command === command,
    );
    if (evt.type === 'loop-start') {
      // The first completed loop retracts the handle's lock bar for good
      // (VISIBLE SYSTEM ARC CORRECTION §4): one mechanical clunk on the
      // stand, then the local [E] ENGAGE TRACTION prompt can appear.
      if (evt.loopIndex === 1) {
        sfx.door();
        const device = findDevice('test');
        if (device) scene.pulseTutorialDevice(device.sprite, CAR.LAMP_OK);
      }
      return;
    }
    if (evt.type === 'test-energized') {
      // Energizing OUTSIDE the window flashes alert on the stand — the rhythm,
      // not the button, was wrong. Nothing is cleared; release and re-read.
      const device = findDevice('test');
      if (device) {
        scene.pulseTutorialDevice(device.sprite, evt.inWindow ? CAR.BRASS_HI : CAR.LAMP_ALERT);
      }
      sfx.lever();
      return;
    }
    if (evt.type === 'test-released') {
      sfx.lever();
      return;
    }
    if (evt.type === 'load-route-changed') {
      sfx.lever();
      return;
    }
    if (evt.type === 'load-misrouted') {
      // A wrong branch is a readable local failure: the reference bogie takes
      // the weight while the drive bogie free-revs. Nothing is reset.
      sfx.blocked();
      scene.cameras.main.shake(80, 0.002);
      return;
    }
    if (evt.type === 'spinning-stale') {
      // The chance visibly passed while the wheels free-revved: one dull thunk
      // off the rail. The lesson is "let go and catch the next pass".
      sfx.blocked();
      scene.cameras.main.shake(80, 0.002);
      return;
    }
    if (evt.type === 'bite-started') {
      sfx.press();
      scene.cameras.main.shake(70, 0.0018);
      // The wheels caught: current visibly runs the repaired supply paths
      // into the drive bogie (VISIBLE SYSTEM ARC CORRECTION §4).
      this.spawnEchoConvergencePulses();
      return;
    }
    if (evt.type === 'bite-broken') {
      sfx.blocked();
      return;
    }
    if (evt.type === 'control-bounce') {
      const device = findDevice(evt.command);
      if (device) {
        // The observation loop is not an error: a soft steel pulse, no alarm.
        scene.pulseTutorialDevice(
          device.sprite,
          evt.reason === 'observe-first-loop' ? CAR.STEEL_MID : CAR.LAMP_ALERT,
        );
      }
      if (evt.reason !== 'observe-first-loop') sfx.blocked();
      return;
    }
    if (evt.type === 'departure-started') {
      sfx.checkpoint();
      scene.cameras.main.shake(220, 0.0032);
      this.spawnEchoConvergencePulses();
      return;
    }
    if (evt.type === 'stage-complete') {
      this.completeStage({ pendingActions: [] });
    }
  }

  drawSimplifiedEchoWorld(snap, machinery, echoX) {
    const art = machinery.simplifiedWorldArt;
    if (!art) return;
    const left = 4022;
    const right = 4768;
    const driveX = 4655;
    const railY = 684;
    const wheelY = 776;
    art.clear();
    art.fillStyle(C(CAR.VOID), 1);
    art.fillRoundedRect(left, 584, right - left, 282, 14);
    art.lineStyle(3, C(CAR.ENAMEL_MID), 0.86);
    art.strokeRoundedRect(left, 584, right - left, 282, 14);
    // Two repaired supply trunks enter from the left. They remain parallel
    // and terminate at the one traction cabinet, rather than crossing the
    // entire bogie as decorative diagonals.
    art.lineStyle(6, C(CAR.BRASS_MID), 0.78);
    art.lineBetween(left + 26, 625, 4390, 625);
    art.lineStyle(6, C(CAR.LAMP_OK), 0.62);
    art.lineBetween(left + 26, 645, 4390, 645);
    art.fillStyle(C(CAR.ENAMEL_DARK), 1);
    art.fillRoundedRect(4370, 607, 86, 92, 8);
    art.lineStyle(3, C(CAR.BRASS_MID), 0.9);
    art.strokeRoundedRect(4370, 607, 86, 92, 8);
    // Replay rail and moving weight. The capture bay is a real overhead yoke
    // directly above the drive axle.
    art.lineStyle(5, C(CAR.STEEL_MID), 0.9);
    art.lineBetween(4070, railY, 4732, railY);
    art.fillStyle(C(CAR.ENAMEL_MID), 1);
    art.fillRoundedRect(echoX - 42, railY - 28, 84, 24, 6);
    art.lineStyle(3, snap.windowActive ? C(CAR.BRASS_HI) : C(CAR.STEEL_HI), 0.9);
    art.strokeRoundedRect(echoX - 42, railY - 28, 84, 24, 6);
    art.fillCircle(echoX - 28, railY + 2, 7);
    art.fillCircle(echoX + 28, railY + 2, 7);
    art.lineStyle(5, snap.windowActive ? C(CAR.LAMP_OK) : C(CAR.STEEL_MID), snap.windowActive ? 0.95 : 0.62);
    art.lineBetween(4588, 650, 4588, 714);
    art.lineBetween(4588, 650, 4722, 650);
    art.lineBetween(4722, 650, 4722, 714);
    // One drive bogie, stripped to frame, two wheels and motor. It is the
    // only downstream result the player needs to read.
    art.fillStyle(C(CAR.ENAMEL_DARK), 1);
    art.fillRoundedRect(driveX - 126, 718, 252, 74, 10);
    [-62, 62].forEach((dx) => {
      art.fillStyle(C(CAR.VOID), 1);
      art.fillCircle(driveX + dx, wheelY, 43);
      art.lineStyle(6, C(CAR.STEEL_MID), 0.96);
      art.strokeCircle(driveX + dx, wheelY, 39);
    });
    const biting = snap.motor.wheelState === 'biting';
    const spinning = snap.motor.wheelState === 'spinning';
    art.lineStyle(5, biting ? C(CAR.LAMP_OK) : spinning ? C(CAR.LAMP_ALERT) : C(CAR.STEEL_HI), 0.9);
    art.lineBetween(driveX - 105, wheelY, driveX + 105, wheelY);
    if (snap.windowActive) {
      art.lineStyle(6, C(CAR.BRASS_HI), 0.9);
      art.lineBetween(echoX, railY - 4, echoX, 718);
    }
    machinery.simplifiedWorldLabel
      ?.setText(snap.observationLoop ? 'WATCH THE PAST LOAD' : snap.windowActive ? 'LOAD IN CAPTURE BAY    /    [E] INSPECT' : 'WAIT FOR LOAD    /    [E] INSPECT')
      .setColor(snap.windowActive ? '#75d4cd' : '#9fb7c0');
  }

  // The ghost, the trolley, the zone stripe, the condition strip and the
  // gauge all read the same snapshot. The rhythm is SEEN before it is used.
  refreshEchoVisuals(snap) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const machinery = this.stageAssemblies[puzzle.stageIndex]?.machinery;
    if (!machinery) return;

    const x0 = machinery.__echoRailX0 ?? 0;
    const x1 = machinery.__echoRailX1 ?? 0;
    const echoX = x0 + snap.echoTrolleyX * (x1 - x0);
    this.drawSimplifiedEchoWorld(snap, machinery, echoX);
    if (this.mechanicalPanelMode === 'echo') this.refreshMechanicalPanel();
    if (machinery.echoTrolleyCar) machinery.echoTrolleyCar.setX(echoX);
    if (machinery.echoGhost) {
      machinery.echoGhost.setX(echoX);
      machinery.echoGhost.setTexture(
        Math.floor(snap.loopTMs / 220) % 2 === 0 ? 'player-walk-1' : 'player-walk-0',
      );
    }
    if (machinery.echoGhostGlow) {
      machinery.echoGhostGlow
        .setX(echoX)
        .setAlpha(snap.windowActive ? 0.3 : 0.14);
    }
    if (machinery.echoLoadPathArt) {
      const art = machinery.echoLoadPathArt;
      const driveX = x0 + (x1 - x0) * 0.875;
      const active = snap.windowActive;
      const pulse = 0.62 + 0.24 * Math.sin(scene.time.now / 190);
      art.clear();
      // Flanged trolley detail rides with the ghost; its central hanger drops
      // onto the load rail. Inside the timing window the same hanger closes a
      // short mechanical bridge to the drive axle, making the required moment
      // visible without a row of abstract lamps.
      art.lineStyle(3, active ? C(CAR.BRASS_HI) : 0x687981, active ? pulse : 0.72);
      art.strokeCircle(echoX - 30, 797, 8);
      art.strokeCircle(echoX + 30, 797, 8);
      art.lineBetween(echoX - 42, 782, echoX + 42, 782);
      art.lineBetween(echoX, 782, echoX, 744);
      art.fillStyle(active ? C(CAR.BRASS_MID) : 0x405159, active ? 0.95 : 0.72);
      art.fillRoundedRect(echoX - 12, 736, 24, 12, 4);
      if (active) {
        art.lineStyle(5, C(CAR.BRASS_HI), pulse);
        art.lineBetween(echoX, 742, driveX, 742);
        art.lineBetween(driveX, 742, driveX, 807);
        art.strokeCircle(driveX, 807, 17);
      }
      // Permanent bracket around the usable quarter of the rail: the moving
      // load enters a physical capture bay rather than an invisible interval.
      const zoneLeft = x0 + (x1 - x0) * 0.75;
      art.lineStyle(3, active ? C(CAR.LAMP_OK) : 0x53656d, active ? 0.9 : 0.62);
      art.lineBetween(zoneLeft, 814, zoneLeft, 770);
      art.lineBetween(zoneLeft, 770, x1, 770);
      art.lineBetween(x1, 770, x1, 814);
    }
    // The zone stripe breathes while the weight is over the drive bogie.
    if (machinery.echoZoneStripe) {
      machinery.echoZoneStripe.setFillStyle(
        snap.windowActive ? C(CAR.BRASS_HI) : C(CAR.BRASS_MID),
        snap.windowActive ? 0.85 : 0.5,
      );
    }
    if (machinery.echoWindowLamp) {
      machinery.echoWindowLamp
        .setFillStyle(snap.windowActive ? 0x75d4cd : 0x405159, 0.95)
        .setAlpha(snap.windowActive ? 0.9 : 0.45);
    }
    if (machinery.echoCaptureLabel) {
      machinery.echoCaptureLabel
        .setText(snap.windowActive ? 'LOAD CAPTURED' : 'LOAD CAPTURE BAY')
        .setColor(snap.windowActive ? '#75d4cd' : '#687981');
    }
    // The drive spoke turns with the shared motor: free-rev fast and pale
    // while spinning, crawl-steady and bright while biting.
    if (machinery.echoDriveSpoke) {
      const spinning = snap.motor.wheelState === 'spinning';
      const biting = snap.motor.wheelState === 'biting';
      machinery.echoDriveSpoke.setAngle(
        (machinery.echoDriveSpoke.angle + (spinning ? 14 : biting ? 4 : 0)) % 360,
      );
      machinery.echoDriveSpoke.setFillStyle(
        biting ? C(CAR.BRASS_HI) : 0xc4d0d2,
        biting ? 0.95 : 0.72,
      );
    }
    // The five-lamp strip is gone (VISIBLE SYSTEM ARC CORRECTION §4). In its
    // place: the departure stand's sprite is hidden and re-anchored onto the
    // big engage handle, and the handle/window/lock are redrawn every frame
    // from the live snapshot.
    const stage = this.currentStage();
    const standX = stage.echoLoad.machines.test.x;
    if (!this._echoDevicesAnchored) {
      this._echoDevicesAnchored = true;
      scene.interactables
        .filter((it) => it.def.kind === 'echo-load')
        .forEach((it) => {
          it.sprite.setVisible(false);
          it.sprite.setPosition(standX, 690);
        });
    }
    if (machinery.engageArt) {
      const art = machinery.engageArt;
      const standY = 690; // underY — the controller band
      const pivot = { x: standX, y: standY + 12 };
      art.clear();
      // Handle slot plate under the controller.
      art.fillStyle(0x17262d, 1);
      art.fillRect(standX - 13, standY - 22, 26, 44);
      art.lineStyle(2, 0x91a3a9, 0.7);
      art.strokeRect(standX - 13, standY - 22, 26, 44);
      // Mechanical window on the controller face: the shutter slides open
      // while the echo's weight is over the drive axle — on EVERY loop, so
      // loop 0 already teaches the rhythm.
      art.lineStyle(2, 0x75d4cd, snap.windowActive ? 0.95 : 0.35);
      art.strokeRect(standX - 22, standY - 78, 20, 12);
      if (!snap.windowActive) {
        art.fillStyle(0x2a3940, 0.95);
        art.fillRect(standX - 22, standY - 78, 20, 12);
      }
      // The engage handle itself: a LONG throw lever — thrown toward the
      // drive bogie while the line is energized, parked back while
      // disengaged. Big enough to read across the whole band.
      const engaged = snap.motor.energized;
      const ang = engaged ? 0.68 : -0.68;
      const hx = pivot.x + Math.sin(ang) * 54;
      const hy = pivot.y - Math.cos(ang) * 54;
      art.lineStyle(9, 0x9fb7c0, 1);
      art.lineBetween(pivot.x, pivot.y, hx, hy);
      art.fillStyle(engaged ? C(CAR.BRASS_HI) : 0x687981, 1);
      art.fillCircle(hx, hy, 9);
      art.lineStyle(2, 0x2a3940, 0.9);
      art.strokeCircle(hx, hy, 9);
      art.fillStyle(0x2a3940, 1);
      art.fillCircle(pivot.x, pivot.y, 7);
      // The lock bar: loop 0 keeps the handle mechanically barred even while
      // the window opens; the first completed loop retracts it for good.
      if (snap.observationLoop) {
        art.fillStyle(0xe45a5f, 0.9);
        art.fillRect(standX - 20, standY - 6, 40, 8);
        art.lineStyle(2, 0xc1c9c6, 0.8);
        art.strokeRect(standX - 20, standY - 6, 40, 8);
      }
    }
    // Wheel-rail contact glow follows the live drive load and the bite.
    if (machinery.echoContactGlow) {
      const driveLoad = snap.motor.axleLoad[snap.motor.driveBogie] ?? 0;
      const biting = snap.motor.wheelState === 'biting';
      machinery.echoContactGlow.setAlpha(
        Phaser.Math.Clamp(0.06 + driveLoad * 0.5 + (biting ? 0.35 : 0), 0, 0.95),
      );
    }
    // The gauge corroborates the live drive-axle load against the bite line.
    if (machinery.gaugeNeedle) {
      const fraction = Phaser.Math.Clamp(snap.motor.axleLoad[snap.motor.driveBogie] ?? 0, 0, 1);
      machinery.gaugeNeedle.setAngle(-90 + fraction * 180);
    }
    // Departure stand lamp follows the shared contactor.
    if (machinery.testLamp) {
      machinery.testLamp
        .setFillStyle(snap.motor.energized ? C(CAR.BRASS_HI) : 0x405159, 0.95)
        .setAlpha(snap.motor.energized ? 0.9 : 0.45);
    }
  }

  // Section III. Each device does one physical thing and reports it on
  // itself. No step counter, no ordering check: the pipe decides what works.
  operateAirLock(interactable) {
    const puzzle = this.scene.tutorialPuzzle;
    const phase = puzzle.airCircuit;
    if (!phase || this.airCircuitQaFreeze) return;
    const command = interactable.def.command;

    if (command === 'isolate') {
      if (phase.snapshot().stageComplete) return;
      phase.interact('isolate');
      this.scene.player.playInteraction();
      // interact() forwards valve events immediately; drain on the same
      // frame so the pulse lands with the press.
      phase.drainEvents().forEach((evt) => this.handleAirCircuitEvent(evt));
      this.refresh();
      return;
    }

    if (command === 'bleed') {
      // E only starts the hold. updateAirCircuitStage ends it the moment the
      // key comes up or the player steps off the wheel.
      this.scene.player.playInteraction();
    }
  }

  // ------------------------------------------------------------ Phase II --
  // Junction-2 runs only the contact interlock: latch at x=850, underfloor
  // cable trough at y=556, contactor at x=1440. GameScene's existing proximity
  // pick (dx<62, dy<100) routes E presses here; the state machine and its art
  // module do everything else.

  operateContactInterlock(interactable) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const lock = this.contactLock;
    if (!lock || this.contactQaFreeze) return;
    if (puzzle.stageIndex !== CONTACT_STAGE_INDEX || lock.isComplete()) return;
    if (interactable.def.command === 'relay') {
      // The cabinet door is a physical object: E opens the close-up. The
      // interlock itself has no 'relay' target — its isRelaySolved hook reads
      // the cabinet the player is about to wire.
      this.openRelayCloseup();
      return;
    }
    const target = interactable.def.command === 'latch' ? 'latch' : 'power';
    const result = lock.interact(target);
    scene.player.playInteraction();
    if (!result.accepted) {
      // Local refusal only: the contactor's own bounce animation, flashes and
      // blocked blip carry the fault. No toast, no vignette, no global fail —
      // and nothing that names what should have happened first.
      scene.cameras.main.shake(90, 0.0025);
    }
    // Events drain on the next updateContactInterlock pass (same frame at the
    // latest), which feeds them to the art module one by one.
  }

  // Called every frame from update(). Owns enter/reset timing, signal
  // propagation, event draining into the art module, the steady-state redraw,
  // the two world prompts, and the completion hand-off into completeStage().
  updateContactInterlock(delta) {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const lock = this.contactLock;
    const art = this.contactArt;
    if (!lock || !art) return;

    if (this.contactQaFreeze) {
      // The ?qa=phase2 route drove the live instance to a fixture state. Hold
      // it exactly: no propagation, no enter/reset, no completion hand-off.
      // The steady-state redraw still runs so the frame always shows the
      // fixture snapshot, and prompts stay live for inspection.
      art.applySnapshot(lock.snapshot());
      if (this.relay && this.relayArt) this.relayArt.applySnapshot(this.relay.snapshot());
      this.updateContactPrompts();
      return;
    }

    const live = puzzle.stageIndex === CONTACT_STAGE_INDEX
      && puzzle.briefed
      && !puzzle.stageComplete[CONTACT_STAGE_INDEX]
      && !['opening', 'approach', 'departure', 'complete'].includes(puzzle.phase);
    if (!live) return;

    // Enter when the player steps into the latch's reach; only walking back
    // out past the partition (x < CONTACT_RESET_X) releases the latch, so a
    // press anywhere inside the interaction radius always sticks. enter() is
    // idempotent, so holding position stacks nothing. Leaving the room is the
    // global reset for the whole chain: latch, trace, cabinet wiring and
    // contactor all return to the entry state together (work package §4.2).
    if (scene.player.x >= CONTACT_RESET_X) {
      lock.enter();
    } else {
      lock.reset();
      this.relay?.reset();
      // A warp out of the room while the close-up is up must never leave the
      // player frozen: close it instantly (wiring was just reset anyway).
      if (this.relayCloseupState !== 'closed') this.closeRelayCloseup({ force: true });
    }

    lock.update(delta);
    lock.drainEvents().forEach((evt) => art.handleEvent(evt));
    art.applySnapshot(lock.snapshot());
    this._drainRelay();
    this.updateContactPrompts();

    if (lock.isComplete()) {
      // The shared completion path: completion reveal, gate open, stage
      // advance and the guard-line release, exactly as the other junctions.
      this.completeStage();
    }
  }

  // The only strings the room may show (spec §4 + relay §2.1), gated by
  // distance and machine state. Each prompt vanishes the moment the player
  // leaves its device or the device has done its job. The relay prompt only
  // exists while the case is still unbridged and the close-up is down.
  updateContactPrompts() {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const lock = this.contactLock;
    const art = this.contactArt;
    if (!lock || !art) return;
    const snap = lock.snapshot();
    const live = puzzle.stageIndex === CONTACT_STAGE_INDEX
      && puzzle.briefed
      && !puzzle.stageComplete[CONTACT_STAGE_INDEX]
      && !['opening', 'approach', 'departure', 'complete'].includes(puzzle.phase)
      && this.visible
      && scene.activeWorldIndex === 0;
    const nearLatch = live && Math.abs(scene.player.x - CONTACT_INTERLOCK_LAYOUT.startX) < 62;
    const nearRelay = live && Math.abs(scene.player.x - CONTACT_INTERLOCK_LAYOUT.relayX) < 62;
    const nearPower = live && Math.abs(scene.player.x - CONTACT_INTERLOCK_LAYOUT.endX) < 62;
    const relaySolved = this.relay?.isSolved() ?? false;
    art.setPrompt('latch', nearLatch && !snap.latchClosed ? CONTACT_PROMPTS.latch : null);
    art.setPrompt(
      'relay',
      nearRelay && !relaySolved && !scene.relayCloseupActive ? CONTACT_PROMPTS.relay : null,
    );
    art.setPrompt('power', nearPower && !snap.complete ? CONTACT_PROMPTS.power : null);
  }

  // ------------------------------------------------------ relay close-up --
  // Lifecycle (work package §2.2/§3.4.2/§4.3, Wave 5 timing):
  //
  //   closed --E at cabinet--> opening --bolt 0–60ms + door 60–300ms +
  //   camera pan 0–360ms CONCURRENT--> open --ESC/E or relay-bridged +
  //   450ms--> closing --door half-close 240ms + camera 360ms--> closed
  //
  // Invariants: wiring survives closing (only room exit / cabinet RESET /
  // scene restart clears it); player.frozen is true exactly while
  // scene.relayCloseupActive is true, on every path; the camera push settles
  // after the door (~360 vs ~300ms), never leads it; the cluster is visible
  // exactly for the opening/open/closing span (setVisible true on open,
  // false in close finish) and the HUD (separate upper scene) is hidden for
  // the same span and always restored; the post-relay trace is progress-held
  // until finish() so trace-energized can only light in world view.

  openMechanicalPanel(mode) {
    const { scene } = this;
    if (this.mechanicalPanelMode || this.relayCloseupState !== 'closed') return;
    const camera = scene.cameras.main;
    // The rolling-bearing close-up is an architectural train cutaway rather
    // than a small control plate. Other legacy close-ups retain their compact
    // dimensions; IV–VI use nearly the whole viewport as a fixed theatre.
    const tableMode = mode.startsWith('table-');
    const width = Math.min(tableMode ? 1100 : 840, camera.width - (tableMode ? 24 : 48));
    const height = Math.min(tableMode ? 540 : 500, camera.height - (tableMode ? 20 : 42));
    const left = (camera.width - width) / 2;
    const top = (camera.height - height) / 2;
    const make = (object, depth = 790) => {
      object.setScrollFactor(0).setDepth(depth);
      this.objects.push(object);
      return object;
    };
    this.mechanicalPanelMode = mode;
    this._mechanicalVentHeld = false;
    this._mechanicalHoverId = null;
    this._mechanicalPressedId = null;
    const partTextStyle = {
      fontFamily: 'ui-monospace, Menlo, monospace',
      fontSize: '11px',
      color: '#9fb7c0',
      align: 'center',
    };
    const partTexts = Object.fromEntries(
      ['reference', 'test', 'isolate', 'gauge', 'bleed', 'pin', 'actuator', 'close'].map((id) => [
        id,
        make(scene.add.text(0, 0, '', partTextStyle).setOrigin(0.5), 792).setVisible(false),
      ]),
    );
    this.mechanicalPanel = {
      left,
      top,
      width,
      height,
      base: tableMode
        ? make(scene.add.image(left + width / 2, top + height / 2, 'mechanical-table-base').setDisplaySize(width, height), 790)
        : null,
      graphics: make(scene.add.graphics(), tableMode ? 791 : 790),
      title: make(scene.add.text(left + 28, top + 20, '', {
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: '18px',
        color: '#e8d5a7',
      }), 792),
      status: make(scene.add.text(left + width / 2, top + 68, '', {
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: '13px',
        color: '#9fb7c0',
        align: 'center',
      }).setOrigin(0.5), 792),
      help: make(scene.add.text(left + width / 2, top + height - 24, 'CLICK MECHANICAL PARTS    /    ESC OR E TO CLOSE', {
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: '10px',
        color: '#687981',
      }).setOrigin(0.5), 792),
      objects: [],
      hits: [],
      partTexts,
    };
    if (tableMode) {
      const pipePart = (frame, depth = 793) => make(
        scene.add.sprite(0, 0, 'mechanical-pipe-parts', frame).setOrigin(0.5),
        depth,
      );
      this.mechanicalPanel.bearing = pipePart(2).setTint(C(CAR.BRASS_HI)).setScale(1.45);
      this.mechanicalPanel.ghostBearing = pipePart(2).setTint(C(CAR.LAMP_OK)).setScale(1.25).setAlpha(0);
      this.mechanicalPanel.outputA = pipePart(2).setTint(C(CAR.BRASS_MID)).setScale(2.7);
      this.mechanicalPanel.outputB = pipePart(2).setTint(C(CAR.STEEL_MID)).setScale(2.7);
    }
    this.mechanicalPanel.objects = [
      this.mechanicalPanel.base,
      this.mechanicalPanel.graphics,
      this.mechanicalPanel.title,
      this.mechanicalPanel.status,
      this.mechanicalPanel.help,
      ...Object.values(partTexts),
      this.mechanicalPanel.bearing,
      this.mechanicalPanel.ghostBearing,
      this.mechanicalPanel.outputA,
      this.mechanicalPanel.outputB,
    ].filter(Boolean);
    scene.relayCloseupActive = true;
    scene.player.frozen = true;
    scene.player.setVelocity(0, 0);
    scene.scene.setVisible(false, 'Hud');
    this._setRelayCursor(true);
    this.refreshMechanicalPanel();
  }

  closeMechanicalPanel() {
    if (!this.mechanicalPanelMode) return;
    const { scene } = this;
    this._mechanicalVentHeld = false;
    this._mechanicalHoverId = null;
    this._mechanicalPressedId = null;
    scene.tutorialPuzzle?.bogieDiagnosis?.setVentHeld?.(false);
    const panelObjects = new Set(this.mechanicalPanel?.objects ?? []);
    panelObjects.forEach((object) => object?.destroy?.());
    // Repeated inspection must not grow the tracked-object list. The objects
    // are short-lived modal furniture, unlike the persistent world art.
    this.objects = this.objects.filter((object) => !panelObjects.has(object));
    this.mechanicalPanel = null;
    this.mechanicalPanelMode = null;
    scene.relayCloseupActive = false;
    scene.player.frozen = false;
    scene.scene.setVisible(true, 'Hud');
    this._setRelayCursor(false);
    const camera = scene.cameras.main;
    camera.startFollow(scene.player, true, 0.075, 0.11, 0, 150);
    camera.setDeadzone(220, 170);
  }

  refreshMechanicalPanel() {
    const panel = this.mechanicalPanel;
    if (!panel || !this.mechanicalPanelMode) return;
    if (this.mechanicalPanelMode.startsWith('table-')) {
      this.refreshRollingBearingTable(panel);
      return;
    }
    const { left, top, width, height, graphics: art } = panel;
    art.clear();
    art.fillStyle(C(CAR.VOID), 0.98);
    art.fillRoundedRect(left, top, width, height, 14);
    art.lineStyle(4, C(CAR.STEEL_MID), 0.95);
    art.strokeRoundedRect(left, top, width, height, 14);
    art.lineStyle(2, C(CAR.BRASS_MID), 0.7);
    art.lineBetween(left + 22, top + 54, left + width - 22, top + 54);
    art.fillStyle(C(CAR.ENAMEL_DARK), 1);
    art.fillRoundedRect(left + width - 62, top + 14, 34, 34, 5);
    art.lineStyle(2, C(CAR.LAMP_ALERT), 0.8);
    art.strokeRoundedRect(left + width - 62, top + 14, 34, 34, 5);
    art.lineBetween(left + width - 52, top + 24, left + width - 38, top + 38);
    art.lineBetween(left + width - 38, top + 24, left + width - 52, top + 38);
    panel.hits = [{ id: 'close', x: left + width - 70, y: top + 8, w: 50, h: 46 }];
    Object.values(panel.partTexts ?? {}).forEach((text) => text.setVisible(false));

    if (this.mechanicalPanelMode === 'bogie') {
      const snap = this.scene.tutorialPuzzle?.bogieDiagnosis?.snapshot?.();
      if (!snap) return;
      const partTexts = panel.partTexts;
      const now = this.scene.time?.now ?? 0;
      const breathe = 0.72 + Math.sin(now / 260) * 0.2;
      const hover = this._mechanicalHoverId;
      const pressed = this._mechanicalPressedId;
      const bounce = this._mechanicalBounce;
      const bounceProgress = bounce
        ? Phaser.Math.Clamp((now - bounce.startedAt) / bounce.duration, 0, 1)
        : 1;
      const bounceWave = bounceProgress < 1
        ? Math.sin(bounceProgress * Math.PI * 5) * (1 - bounceProgress)
        : 0;
      panel.title.setText(snap.faultLocalized
        ? 'BOGIE B  /  BRAKE CYLINDER SERVICE'
        : 'SINGLE-CAR BRAKE TEST  /  A–B SELECTOR');

      // One inset steel inspection tray. It is deliberately a single machine,
      // not five equal UI buttons: every clickable area sits on the real part
      // it operates and the air/mechanical path can be traced left to right.
      const trayX = left + 22;
      const trayY = top + 86;
      const trayW = width - 44;
      const trayH = height - 126;
      art.fillStyle(C(CAR.VOID_LIFT), 1);
      art.fillRoundedRect(trayX, trayY, trayW, trayH, 10);
      art.lineStyle(2, C(CAR.STEEL_DARK), 0.95);
      art.strokeRoundedRect(trayX, trayY, trayW, trayH, 10);
      art.fillStyle(C(CAR.ENAMEL_DARK), 0.95);
      art.fillRoundedRect(trayX + 12, trayY + 12, 164, trayH - 24, 7);
      art.lineStyle(1, C(CAR.STEEL_MID), 0.55);
      art.strokeRoundedRect(trayX + 12, trayY + 12, 164, trayH - 24, 7);

      // Borrowed directly from a single-car air-brake test stand: one A/B
      // selector, one spring TEST knife, and two large observations.  The
      // service hardware stays behind its cover until the operator proves the
      // contradiction, so the first screen teaches a diagnostic method rather
      // than presenting five unrelated controls.
      if (!snap.faultLocalized) {
        const selected = snap.selectedBogie ?? 'front';
        const selectedSnap = selected === 'front' ? snap.front : snap.rear;
        const observedA = snap.observations?.front;
        const observedB = snap.observations?.rear;
        const selectorX = left + 164;
        const selectorY = top + 202;
        const testX = left + 164;
        const testY = top + 346;
        const gaugeX = left + 420;
        const travelX = left + 650;
        const meterY = top + 262;
        const testLive = Boolean(snap.motor?.energized);

        // A/B rotary selector with a hard OFF interlock while TEST is live.
        art.fillStyle(C(CAR.ENAMEL_DARK), 1);
        art.fillRoundedRect(selectorX - 92, selectorY - 62, 184, 124, 8);
        art.lineStyle(3, C(CAR.BRASS_MID), 0.9);
        art.strokeRoundedRect(selectorX - 92, selectorY - 62, 184, 124, 8);
        ['A', 'B'].forEach((label, index) => {
          const isActive = selected === (index === 0 ? 'front' : 'rear');
          const cx = selectorX + (index === 0 ? -48 : 48);
          art.fillStyle(C(isActive ? CAR.BRASS_MID : CAR.ENAMEL_MID), 1);
          art.fillRoundedRect(cx - 34, selectorY - 38, 68, 76, 6);
          art.lineStyle(3, C(isActive ? CAR.BRASS_HI : CAR.STEEL_MID), 0.95);
          art.strokeRoundedRect(cx - 34, selectorY - 38, 68, 76, 6);
        });
        art.lineStyle(9, C(CAR.STEEL_HI), 1);
        art.lineBetween(selectorX, selectorY + 12, selectorX + (selected === 'front' ? -44 : 44), selectorY - 24);
        art.fillStyle(C(CAR.BRASS_HI), 1);
        art.fillCircle(selectorX + (selected === 'front' ? -44 : 44), selectorY - 24, 10);
        panel.hits.push({ id: 'select-front', x: selectorX - 90, y: selectorY - 56, w: 82, h: 112 });
        panel.hits.push({ id: 'select-rear', x: selectorX + 8, y: selectorY - 56, w: 82, h: 112 });
        partTexts.reference
          .setText(`BOGIE SELECTOR  /  ${selected === 'front' ? 'A REFERENCE' : 'B SERVICE'}`)
          .setPosition(selectorX, selectorY + 78)
          .setColor('#e8d5a7')
          .setVisible(true);

        // Spring TEST knife. It must return OFF before the selector moves.
        art.fillStyle(C(CAR.ENAMEL_MID), 1);
        art.fillRoundedRect(testX - 74, testY - 42, 148, 84, 7);
        art.lineStyle(3, C(testLive ? CAR.LAMP_OK : CAR.BRASS_DARK), 0.96);
        art.strokeRoundedRect(testX - 74, testY - 42, 148, 84, 7);
        art.fillStyle(C(CAR.BRASS_MID), 1);
        art.fillCircle(testX - 35, testY + 18, 7);
        art.fillCircle(testX + 35, testY + 18, 7);
        art.lineStyle(8, C(testLive ? CAR.LAMP_OK : CAR.STEEL_HI), 1);
        art.lineBetween(testX - 35, testY + 18, testX + (testLive ? 35 : 12), testY - 24);
        art.fillStyle(C(testLive ? CAR.LAMP_OK : CAR.LAMP_WARN), 1);
        art.fillCircle(testX + (testLive ? 35 : 12), testY - 24, 10);
        panel.hits.push({ id: 'test', x: testX - 82, y: testY - 50, w: 164, h: 100 });
        partTexts.test
          .setText(testLive ? 'TEST  /  LIVE' : 'TEST  /  OFF')
          .setPosition(testX, testY + 56)
          .setColor(testLive ? '#75d4cd' : '#9fb7c0')
          .setVisible(true);

        // Large analogue line-pressure dial, matching the selected bogie.
        const pressure = Phaser.Math.Clamp((selectedSnap?.linePressure ?? 0) / 100, 0, 1);
        art.fillStyle(C(CAR.ENAMEL_DARK), 1);
        art.fillCircle(gaugeX, meterY, 76);
        art.lineStyle(5, C(CAR.BRASS_MID), 0.96);
        art.strokeCircle(gaugeX, meterY, 76);
        for (let i = 0; i <= 10; i += 1) {
          const a = Math.PI * (0.75 + i * 0.15);
          art.lineStyle(2, C(CAR.STEEL_HI), 0.85);
          art.lineBetween(
            gaugeX + Math.cos(a) * 57,
            meterY + Math.sin(a) * 57,
            gaugeX + Math.cos(a) * 67,
            meterY + Math.sin(a) * 67,
          );
        }
        const gaugeA = Math.PI * (0.75 + pressure * 1.5);
        art.lineStyle(5, C(CAR.BRASS_HI), 1);
        art.lineBetween(gaugeX, meterY, gaugeX + Math.cos(gaugeA) * 55, meterY + Math.sin(gaugeA) * 55);
        art.fillStyle(C(CAR.BRASS_MID), 1);
        art.fillCircle(gaugeX, meterY, 7);
        partTexts.gauge
          .setText(`BRAKE LINE  /  ${Math.round(selectedSnap?.linePressure ?? 0)} PSI`)
          .setPosition(gaugeX, meterY + 98)
          .setColor('#9fb7c0')
          .setVisible(true);

        // Piston-travel indicator: A travels, B remains at zero despite the
        // same pressure.  This is the inference, not a hidden completion flag.
        const travel = selectedSnap?.brakeReleased ? 1 : 0;
        art.fillStyle(C(CAR.ENAMEL_DARK), 1);
        art.fillRoundedRect(travelX - 105, meterY - 75, 210, 150, 9);
        art.lineStyle(4, C(CAR.STEEL_MID), 0.95);
        art.strokeRoundedRect(travelX - 105, meterY - 75, 210, 150, 9);
        art.lineStyle(14, C(CAR.STEEL_DARK), 1);
        art.lineBetween(travelX - 72, meterY + 10, travelX + 72, meterY + 10);
        art.lineStyle(8, C(travel ? CAR.LAMP_OK : CAR.LAMP_ALERT), 1);
        art.lineBetween(travelX - 66, meterY + 10, travelX - 66 + travel * 132, meterY + 10);
        art.fillStyle(C(travel ? CAR.LAMP_OK : CAR.LAMP_ALERT), 1);
        art.fillRoundedRect(travelX - 78 + travel * 132, meterY - 18, 24, 56, 4);
        partTexts.actuator
          .setText(`PISTON TRAVEL  /  ${travel ? 'NORMAL' : 'ZERO'}`)
          .setPosition(travelX, meterY + 98)
          .setColor(travel ? '#75d4cd' : '#e45a5f')
          .setVisible(true);

        // After both calibrated tests, B's zero-travel housing becomes the
        // confirmable fault location.  Clicking it opens the service face.
        if (observedA && observedB && selected === 'rear' && testLive) {
          panel.hits.push({ id: 'repair', x: travelX - 112, y: meterY - 84, w: 224, h: 168 });
          art.lineStyle(3, C(CAR.LAMP_OK), breathe);
          art.strokeRoundedRect(travelX - 112, meterY - 84, 224, 168, 10);
        }

        const statusText = !observedA
          ? 'SELECT A  /  APPLY TEST  /  NOTE PRESSURE AND TRAVEL'
          : testLive && selected === 'front'
            ? 'A: PRESSURE NORMAL  /  PISTON TRAVELS  /  RETURN TEST TO OFF'
            : !observedB
              ? 'SELECT B  /  REPEAT THE SAME TEST'
              : selected !== 'rear'
                ? 'A AND B RECORDED  /  SELECT B TO LOCATE THE BREAK'
                : !testLive
                  ? 'BOGIE B SELECTED  /  APPLY TEST TO CONFIRM ZERO TRAVEL'
                  : 'SAME PRESSURE, ZERO TRAVEL  /  CLICK THE B ACTUATOR';
        panel.status.setText(statusText).setColor(observedA && observedB ? '#e8d5a7' : '#9fb7c0');
        panel.help.setText('SELECT A OR B    /    TEST MUST RETURN TO OFF BEFORE SWITCHING    /    ESC OR E TO CLOSE');
        return;
      }

      // Reference bogie A: small but mechanically complete enough to establish
      // the expected response under TEST. It is a comparison specimen, not a
      // second command surface.
      const refX = trayX + 94;
      const refY = trayY + 128;
      art.fillStyle(C(CAR.ENAMEL_MID), 1);
      art.fillRoundedRect(refX - 61, refY - 29, 122, 39, 5);
      art.lineStyle(3, snap.front.wheelTurning ? C(CAR.LAMP_OK) : C(CAR.STEEL_MID), 0.92);
      [-34, 34].forEach((dx) => {
        art.strokeCircle(refX + dx, refY + 23, 22);
        art.strokeCircle(refX + dx, refY + 23, 7);
        const spin = snap.front.wheelTurning ? now / 95 : 0;
        for (let i = 0; i < 4; i += 1) {
          const a = spin + i * Math.PI / 2;
          art.lineBetween(
            refX + dx + Math.cos(a) * 7,
            refY + 23 + Math.sin(a) * 7,
            refX + dx + Math.cos(a) * 19,
            refY + 23 + Math.sin(a) * 19,
          );
        }
      });
      art.fillStyle(snap.front.wheelTurning ? C(CAR.LAMP_OK) : C(CAR.LAMP_WARN), 1);
      art.fillCircle(refX, refY - 47, 5);
      partTexts.reference
        .setText('BOGIE A  /  REFERENCE')
        .setPosition(refX, trayY + 28)
        .setColor(snap.front.wheelTurning ? '#75d4cd' : '#9fb7c0')
        .setVisible(true);

      // Spring-loaded TEST knife switch. Its copper leads split visibly to A
      // and B, making the diagnostic comparison a physical circuit.
      const testX = refX;
      const testY = trayY + trayH - 66;
      const testLive = Boolean(snap.motor?.energized);
      const testHot = hover === 'test' || pressed === 'test';
      art.fillStyle(C(CAR.ENAMEL_MID), 1);
      art.fillRoundedRect(testX - 54, testY - 35, 108, 70, 6);
      art.lineStyle(testHot ? 3 : 2, testHot ? C(CAR.BRASS_HI) : C(CAR.BRASS_DARK), testHot ? 1 : 0.85);
      art.strokeRoundedRect(testX - 54, testY - 35, 108, 70, 6);
      art.fillStyle(C(CAR.BRASS_MID), 1);
      art.fillCircle(testX - 27, testY + 14, 7);
      art.fillCircle(testX + 27, testY + 14, 7);
      art.lineStyle(7, C(testLive ? CAR.LAMP_OK : CAR.STEEL_HI), 1);
      art.lineBetween(testX - 27, testY + 14, testX + (testLive ? 27 : 11), testY - 18);
      art.fillStyle(C(testLive ? CAR.LAMP_OK : CAR.LAMP_WARN), 1);
      art.fillCircle(testX + (testLive ? 27 : 11), testY - 18, 9);
      art.lineStyle(3, C(CAR.BRASS_MID), 0.62);
      art.lineBetween(testX + 54, testY, trayX + 192, testY);
      art.lineBetween(trayX + 192, testY, trayX + 192, trayY + 68);
      art.lineBetween(trayX + 192, trayY + 68, left + width - 44, trayY + 68);
      panel.hits.push({ id: 'test', x: testX - 60, y: testY - 42, w: 120, h: 84 });
      partTexts.test
        .setText('SPRING TEST')
        .setPosition(testX, testY + 47)
        .setColor(testHot ? '#e8d5a7' : '#9fb7c0')
        .setVisible(true);

      // Bogie B pneumatic branch: reservoir -> cut-off cock -> gauge -> low
      // drain -> brake cylinder. Flow colour/brightness is proportional to the
      // real local pressure snapshot, so the path teaches the sequence.
      const pipeY = trayY + 90;
      const reservoirX = trayX + 240;
      const isolateX = trayX + 360;
      const gaugeX = trayX + 456;
      const bleedX = trayX + 536;
      const cylinderX = trayX + 657;
      const pressure = Phaser.Math.Clamp(snap.brake.pressure / 100, 0, 1);
      const pipeColor = snap.brake.isolated ? CAR.BRASS_DARK : CAR.LAMP_OK;
      const flowAlpha = snap.brake.isolated ? 0.45 : 0.44 + pressure * 0.5;
      art.lineStyle(10, C(CAR.STEEL_DARK), 1);
      art.lineBetween(reservoirX + 47, pipeY, cylinderX + 64, pipeY);
      art.lineStyle(4, C(pipeColor), flowAlpha);
      art.lineBetween(reservoirX + 47, pipeY, cylinderX + 64, pipeY);

      // Reservoir shell and mounting straps.
      art.fillStyle(C(CAR.ENAMEL_MID), 1);
      art.fillRoundedRect(reservoirX - 47, pipeY - 24, 94, 48, 22);
      art.lineStyle(3, C(CAR.STEEL_MID), 0.95);
      art.strokeRoundedRect(reservoirX - 47, pipeY - 24, 94, 48, 22);
      art.lineBetween(reservoirX - 27, pipeY - 23, reservoirX - 27, pipeY + 23);
      art.lineBetween(reservoirX + 27, pipeY - 23, reservoirX + 27, pipeY + 23);

      // Quarter-turn cut-off cock mounted directly in the branch.
      const isolateHot = hover === 'brake-isolate' || pressed === 'brake-isolate';
      art.fillStyle(C(CAR.BRASS_DARK), 1);
      art.fillCircle(isolateX, pipeY, 13);
      art.lineStyle(isolateHot ? 6 : 5, C(isolateHot ? CAR.BRASS_HI : CAR.BRASS_MID), 1);
      const valveAngle = snap.brake.isolated ? -Math.PI / 4 : Math.PI / 4;
      art.lineBetween(
        isolateX - Math.cos(valveAngle) * 25,
        pipeY - Math.sin(valveAngle) * 25,
        isolateX + Math.cos(valveAngle) * 25,
        pipeY + Math.sin(valveAngle) * 25,
      );
      art.fillStyle(C(snap.brake.isolated ? CAR.LAMP_OK : CAR.LAMP_WARN), 1);
      art.fillCircle(isolateX, pipeY - 37, 5);
      panel.hits.push({ id: 'brake-isolate', x: isolateX - 42, y: pipeY - 48, w: 84, h: 82 });
      partTexts.isolate
        .setText(snap.brake.isolated ? 'BRANCH CUT-OFF  /  SHUT' : 'BRANCH CUT-OFF  /  OPEN')
        .setPosition(isolateX, pipeY - 56)
        .setColor(isolateHot ? '#e8d5a7' : '#9fb7c0')
        .setVisible(true);

      // Eye-level pressure gauge with a real threshold mark and continuous
      // needle. It corroborates the pipe instead of replacing it.
      art.fillStyle(C(CAR.VOID), 1);
      art.fillCircle(gaugeX, pipeY, 34);
      art.lineStyle(4, C(CAR.BRASS_MID), 0.95);
      art.strokeCircle(gaugeX, pipeY, 34);
      for (let i = 0; i <= 8; i += 1) {
        const a = Math.PI * (0.78 + i * 0.18);
        art.lineStyle(i === 2 ? 3 : 2, C(i === 2 ? CAR.LAMP_ALERT : CAR.STEEL_HI), 0.9);
        art.lineBetween(
          gaugeX + Math.cos(a) * 24,
          pipeY + Math.sin(a) * 24,
          gaugeX + Math.cos(a) * 29,
          pipeY + Math.sin(a) * 29,
        );
      }
      const needleA = Math.PI * (0.78 + pressure * 1.44);
      art.lineStyle(3, C(CAR.BRASS_HI), 1);
      art.lineBetween(gaugeX, pipeY, gaugeX + Math.cos(needleA) * 25, pipeY + Math.sin(needleA) * 25);
      art.fillStyle(C(CAR.BRASS_MID), 1);
      art.fillCircle(gaugeX, pipeY, 4);
      partTexts.gauge
        .setText(`LOCAL PIPE  ${Math.round(snap.brake.pressure)} PSI`)
        .setPosition(gaugeX, pipeY + 47)
        .setColor(snap.brake.pressure < 20 ? '#75d4cd' : '#9fb7c0')
        .setVisible(true);

      // Drain cock sits at the lowest point of the branch. Holding it visibly
      // pulls the ring down and opens the exhaust, matching the input grammar.
      const bleedHot = hover === 'brake-vent' || pressed === 'brake-vent' || this._mechanicalVentHeld;
      art.lineStyle(8, C(CAR.STEEL_DARK), 1);
      art.lineBetween(bleedX, pipeY, bleedX, pipeY + 78);
      art.lineStyle(4, C(pipeColor), flowAlpha);
      art.lineBetween(bleedX, pipeY, bleedX, pipeY + 78);
      art.fillStyle(C(CAR.BRASS_DARK), 1);
      art.fillCircle(bleedX, pipeY + 75, 10);
      art.lineStyle(4, C(bleedHot ? CAR.BRASS_HI : CAR.BRASS_MID), 1);
      art.strokeCircle(bleedX, pipeY + (this._mechanicalVentHeld ? 105 : 96), 15);
      art.lineBetween(bleedX, pipeY + 85, bleedX, pipeY + (this._mechanicalVentHeld ? 90 : 81));
      if (this._mechanicalVentHeld && snap.brake.pressure > 0) {
        art.lineStyle(3, C(CAR.STEEL_HI), 0.68);
        art.lineBetween(bleedX - 14, pipeY + 126, bleedX - 22, pipeY + 139);
        art.lineBetween(bleedX, pipeY + 126, bleedX, pipeY + 145);
        art.lineBetween(bleedX + 14, pipeY + 126, bleedX + 22, pipeY + 139);
      }
      panel.hits.push({ id: 'brake-vent', x: bleedX - 40, y: pipeY + 58, w: 80, h: 96 });
      partTexts.bleed
        .setText('HOLD  /  DRAIN COCK')
        .setPosition(bleedX, pipeY + 158)
        .setColor(bleedHot ? '#e8d5a7' : '#9fb7c0')
        .setVisible(true);

      // Pneumatic tread-brake unit: cylinder, piston rod, bell crank, pull
      // rod and shoes are one visible chain. This is the core readability fix.
      const cylY = pipeY + 8;
      const repaired = Boolean(snap.rear.repaired);
      const brakeReleased = Boolean(snap.rear.brakeReleased);
      const actuatorHot = hover === 'repair' || pressed === 'repair';
      art.fillStyle(C(CAR.ENAMEL_MID), 1);
      art.fillRoundedRect(cylinderX - 64, cylY - 32, 128, 64, 10);
      art.lineStyle(actuatorHot ? 4 : 3, C(actuatorHot ? CAR.BRASS_HI : (repaired ? CAR.LAMP_OK : CAR.STEEL_MID)), 0.98);
      art.strokeRoundedRect(cylinderX - 64, cylY - 32, 128, 64, 10);
      art.fillStyle(C(CAR.STEEL_DARK), 1);
      art.fillRect(cylinderX + 13, cylY - 23, 34, 46);
      art.lineStyle(5, C(CAR.STEEL_HI), 1);
      const pistonEndX = cylinderX + (repaired ? 90 : 75)
        + (bounce?.id === 'repair' ? bounceWave * 9 : 0);
      art.lineBetween(cylinderX + 47, cylY, pistonEndX, cylY);

      const wheelY = trayY + 272;
      const wheel1X = cylinderX - 80;
      const wheel2X = cylinderX + 68;
      art.fillStyle(C(CAR.ENAMEL_DARK), 1);
      art.fillRoundedRect(cylinderX - 152, wheelY - 76, 290, 62, 8);
      art.lineStyle(4, C(CAR.STEEL_MID), 0.96);
      art.lineBetween(cylinderX - 128, wheelY - 45, cylinderX + 116, wheelY - 45);
      [wheel1X, wheel2X].forEach((x) => {
        art.fillStyle(C(CAR.VOID), 1);
        art.fillCircle(x, wheelY, 47);
        art.lineStyle(7, snap.rear.wheelTurning ? C(CAR.LAMP_OK) : C(CAR.STEEL_MID), 0.96);
        art.strokeCircle(x, wheelY, 42);
        art.lineStyle(3, C(CAR.STEEL_DARK), 1);
        art.strokeCircle(x, wheelY, 14);
        const spin = snap.rear.wheelTurning ? now / 95 : 0;
        for (let i = 0; i < 6; i += 1) {
          const a = spin + i * Math.PI / 3;
          art.lineBetween(
            x + Math.cos(a) * 14,
            wheelY + Math.sin(a) * 14,
            x + Math.cos(a) * 38,
            wheelY + Math.sin(a) * 38,
          );
        }
      });
      const crankX = cylinderX + 104;
      const crankY = cylY + 74;
      art.lineStyle(7, C(repaired ? CAR.STEEL_HI : CAR.LAMP_ALERT), 0.95);
      art.lineBetween(pistonEndX, cylY, crankX, crankY);
      art.lineBetween(crankX, crankY, wheel2X - 22, wheelY - 6);
      art.lineBetween(crankX, crankY, wheel1X + 22, wheelY - 6);
      art.fillStyle(C(CAR.BRASS_MID), 1);
      art.fillCircle(crankX, crankY, 9);
      // Brake shoes visibly touch or clear the tread.
      const shoeGap = brakeReleased ? 10 : 1;
      art.fillStyle(C(brakeReleased ? CAR.STEEL_MID : CAR.LAMP_ALERT), 0.9);
      art.fillRoundedRect(wheel1X + 39 + shoeGap, wheelY - 25, 11, 50, 4);
      art.fillRoundedRect(wheel2X - 50 - shoeGap, wheelY - 25, 11, 50, 4);

      // Removable service pin crosses the linkage guide only after the line is
      // safely isolated and drained. Its position itself carries the state.
      const pinHot = hover === 'service-lock' || pressed === 'service-lock';
      const pinY = cylY + 74;
      const pinX = (snap.rear.serviceLockEngaged ? crankX - 24 : crankX + 18)
        + (bounce?.id === 'service-lock' ? bounceWave * 10 : 0);
      art.fillStyle(C(CAR.ENAMEL_DARK), 1);
      art.fillRoundedRect(crankX - 26, pinY - 18, 52, 36, 5);
      art.lineStyle(4, C(pinHot ? CAR.BRASS_HI : CAR.STEEL_MID), 1);
      art.lineBetween(pinX - 24, pinY, pinX + 24, pinY);
      art.strokeCircle(pinX + 28, pinY, 7);
      panel.hits.push({ id: 'service-lock', x: crankX - 48, y: pinY - 35, w: 96, h: 70 });
      partTexts.pin
        .setText(snap.rear.serviceLockEngaged ? 'SERVICE PIN  /  SEATED' : 'SERVICE PIN')
        .setPosition(crankX, pinY + 31)
        .setColor(pinHot ? '#e8d5a7' : '#9fb7c0')
        .setVisible(true);

      panel.hits.push({ id: 'repair', x: cylinderX - 72, y: cylY - 42, w: 144, h: 84 });
      const localized = Boolean(snap.faultLocalized);
      partTexts.actuator
        .setText(repaired
          ? 'BRAKE CYLINDER  /  FREE'
          : localized
            ? 'FAULT LOCATED  /  PISTON SEIZED'
            : testLive
              ? 'CYLINDER B  /  NO TRAVEL'
              : 'BRAKE CYLINDER  /  SEALED')
        .setPosition(cylinderX, cylY - 47)
        .setColor(actuatorHot ? '#e8d5a7' : (repaired || localized ? '#75d4cd' : '#9fb7c0'))
        .setVisible(true);

      // Only the very first TEST is invited. After that the machine presents
      // evidence, never a next-step outline; choosing the safe service chain
      // is the actual puzzle.
      const firstTestHit = !this._bogieFirstTestSeen
        ? panel.hits.find((hit) => hit.id === 'test')
        : null;
      if (firstTestHit) {
        art.lineStyle(2, C(CAR.LAMP_OK), breathe);
        art.strokeRoundedRect(firstTestHit.x - 3, firstTestHit.y - 3, firstTestHit.w + 6, firstTestHit.h + 6, 8);
        art.fillStyle(C(CAR.LAMP_OK), breathe);
        art.fillCircle(firstTestHit.x + firstTestHit.w - 6, firstTestHit.y + 7, 4);
      }
      const statusText = repaired
        ? 'CYLINDER FREE  /  PROVE THE RELEASE WITH TEST'
        : localized
          ? 'FAULT IS DOWNSTREAM OF THE GAUGE  /  MAKE THE CYLINDER SAFE'
          : testLive
            ? `A: PRESSURE + MOTION    /    B: ${Math.round(snap.brake.pressure)} PSI + NO MOTION`
            : this._bogieFirstTestSeen
              ? 'COMPARE A AND B UNDER THE SAME LIVE TEST'
              : 'RUN ONE TEST  /  WATCH BOTH BOGIES';
      panel.status
        .setText(statusText)
        .setColor(repaired || localized ? '#75d4cd' : '#9fb7c0');
      panel.help.setText('CLICK THE HARDWARE    /    HOLD THE DRAIN RING    /    ESC OR E TO CLOSE');
      return;
    }

    const snap = this.scene.tutorialPuzzle?.echoReplay?.snapshot?.();
    if (!snap) return;
    panel.title.setText('TRACTION TEST STAND  /  BOGIE GROUP CONTROL');
    const x0 = left + 56;
    const x1 = left + width - 56;
    const recorderY = top + 112;
    const echoX = x0 + snap.echoTrolleyX * (x1 - x0);
    const zoneLeft = x0 + (x1 - x0) * 0.75;
    const routeRear = snap.loadRoute === 'rear';
    const thrown = snap.motor.energized;

    // A strip-chart load recorder replaces the abstract branching diagram.
    // It is the one unfamiliar element, so loop one is purely observational:
    // the moving pen enters a plainly marked capture sector once per cycle.
    art.fillStyle(C(CAR.ENAMEL_DARK), 1);
    art.fillRoundedRect(x0, recorderY - 34, x1 - x0, 68, 6);
    art.lineStyle(2, C(CAR.STEEL_MID), 0.85);
    art.strokeRoundedRect(x0, recorderY - 34, x1 - x0, 68, 6);
    for (let i = 1; i < 8; i += 1) {
      const tickX = x0 + ((x1 - x0) * i) / 8;
      art.lineStyle(1, C(CAR.STEEL_DARK), 0.7);
      art.lineBetween(tickX, recorderY - 26, tickX, recorderY + 26);
    }
    art.fillStyle(C(snap.windowActive ? CAR.LAMP_OK : CAR.BRASS_DARK), snap.windowActive ? 0.28 : 0.14);
    art.fillRect(zoneLeft, recorderY - 29, x1 - zoneLeft - 5, 58);
    art.lineStyle(3, C(snap.windowActive ? CAR.LAMP_OK : CAR.BRASS_MID), 0.9);
    art.lineBetween(echoX, recorderY - 25, echoX, recorderY + 25);
    art.fillStyle(C(snap.windowActive ? CAR.LAMP_OK : CAR.BRASS_HI), 1);
    art.fillCircle(echoX, recorderY, 7);

    // Real control-stand grammar: two large ammeters answer which motor group
    // received current. The selector chooses the group; the notched master
    // controller decides when to energize it. No hidden routing diagram.
    const meterY = top + 265;
    const meterAX = left + 285;
    const meterBX = left + 540;
    const selectedCurrent = thrown ? Phaser.Math.Clamp(snap.motor.current ?? 0, 0, 1) : 0;
    const ampsA = routeRear ? 0 : selectedCurrent;
    const ampsB = routeRear ? selectedCurrent : 0;
    const drawAmmeter = (cx, value, label, selected, healthy) => {
      art.fillStyle(C(CAR.ENAMEL_DARK), 1);
      art.fillCircle(cx, meterY, 84);
      art.lineStyle(5, C(selected ? CAR.BRASS_HI : CAR.STEEL_MID), selected ? 1 : 0.75);
      art.strokeCircle(cx, meterY, 84);
      for (let i = 0; i <= 8; i += 1) {
        const a = Math.PI * (0.75 + i * 0.1875);
        art.lineStyle(2, C(CAR.STEEL_HI), 0.75);
        art.lineBetween(cx + Math.cos(a) * 62, meterY + Math.sin(a) * 62, cx + Math.cos(a) * 72, meterY + Math.sin(a) * 72);
      }
      const needleA = Math.PI * (0.75 + value * 1.5);
      art.lineStyle(5, C(value > 0.55 && healthy ? CAR.LAMP_OK : value > 0 ? CAR.LAMP_WARN : CAR.STEEL_MID), 1);
      art.lineBetween(cx, meterY, cx + Math.cos(needleA) * 59, meterY + Math.sin(needleA) * 59);
      art.fillStyle(C(CAR.BRASS_MID), 1);
      art.fillCircle(cx, meterY, 8);
      art.fillStyle(C(selected ? CAR.BRASS_MID : CAR.ENAMEL_MID), 1);
      art.fillRoundedRect(cx - 70, meterY + 94, 140, 25, 3);
      art.lineStyle(2, C(selected ? CAR.BRASS_HI : CAR.STEEL_DARK), 0.9);
      art.strokeRoundedRect(cx - 70, meterY + 94, 140, 25, 3);
    };
    drawAmmeter(meterAX, ampsA, 'A', !routeRear, false);
    drawAmmeter(meterBX, ampsB, 'B', routeRear, true);
    panel.partTexts.reference
      .setText(`BOGIE A AMPS  /  ${Math.round(ampsA * 800)}`)
      .setPosition(meterAX, meterY + 136)
      .setColor(!routeRear ? '#e8d5a7' : '#687981')
      .setVisible(true);
    panel.partTexts.actuator
      .setText(`BOGIE B AMPS  /  ${Math.round(ampsB * 800)}`)
      .setPosition(meterBX, meterY + 136)
      .setColor(routeRear ? '#75d4cd' : '#9fb7c0')
      .setVisible(true);

    const selectorX = left + width - 105;
    const selectorY = meterY;
    const routeHot = this._mechanicalHoverId === 'route' || this._mechanicalPressedId === 'route';
    art.fillStyle(C(CAR.ENAMEL_DARK), 1);
    art.fillRoundedRect(selectorX - 86, selectorY - 82, 172, 164, 9);
    art.lineStyle(routeHot ? 4 : 3, C(routeHot ? CAR.BRASS_HI : CAR.BRASS_MID), 0.95);
    art.strokeRoundedRect(selectorX - 86, selectorY - 82, 172, 164, 9);
    art.fillStyle(C(!routeRear ? CAR.BRASS_MID : CAR.ENAMEL_MID), 1);
    art.fillRoundedRect(selectorX - 66, selectorY - 56, 52, 46, 5);
    art.fillStyle(C(routeRear ? CAR.LAMP_OK : CAR.ENAMEL_MID), 1);
    art.fillRoundedRect(selectorX + 14, selectorY - 56, 52, 46, 5);
    art.lineStyle(11, C(CAR.STEEL_HI), 1);
    art.lineBetween(selectorX, selectorY + 38, selectorX + (routeRear ? 42 : -42), selectorY - 32);
    art.fillStyle(C(routeRear ? CAR.LAMP_OK : CAR.BRASS_HI), 1);
    art.fillCircle(selectorX + (routeRear ? 42 : -42), selectorY - 32, 14);
    panel.hits.push({ id: 'route', x: selectorX - 92, y: selectorY - 88, w: 184, h: 176 });
    panel.partTexts.gauge
      .setText(`MOTOR GROUP  /  ${routeRear ? 'B DRIVE' : 'A REFERENCE'}`)
      .setPosition(selectorX, selectorY - 102)
      .setColor(routeRear ? '#75d4cd' : '#e8d5a7')
      .setVisible(true);

    // A detented master controller borrowed from locomotive control stands.
    // OFF is a deliberate reset state; NOTCH 1 is the only powered test notch.
    const handleX = selectorX;
    const handleY = top + height - 88;
    art.fillStyle(C(CAR.ENAMEL_DARK), 1);
    art.fillRoundedRect(handleX - 86, handleY - 41, 172, 82, 9);
    art.lineStyle(4, C(snap.windowActive && routeRear ? CAR.LAMP_OK : CAR.BRASS_MID), 0.9);
    art.strokeRoundedRect(handleX - 86, handleY - 41, 172, 82, 9);
    [-50, 50].forEach((dx) => {
      art.fillStyle(C(CAR.BRASS_DARK), 1);
      art.fillCircle(handleX + dx, handleY + 20, 8);
    });
    art.lineStyle(10, C(CAR.STEEL_HI), 1);
    art.lineBetween(handleX, handleY + 23, handleX + (thrown ? 50 : -50), handleY - 18);
    art.fillStyle(C(thrown ? CAR.BRASS_HI : CAR.STEEL_MID), 1);
    art.fillCircle(handleX + (thrown ? 50 : -50), handleY - 18, 13);
    panel.hits.push({ id: 'test', x: handleX - 92, y: handleY - 47, w: 184, h: 94 });
    panel.partTexts.test
      .setText(thrown ? 'MASTER CONTROLLER  /  NOTCH 1' : 'MASTER CONTROLLER  /  OFF')
      .setPosition(handleX, handleY + 54)
      .setColor(snap.windowActive && routeRear ? '#75d4cd' : '#9fb7c0')
      .setVisible(true);

    const echoStatus = snap.observationLoop
      ? 'FIRST PASS  /  WATCH THE LOAD RECORDER ENTER THE MARKED SECTOR'
      : snap.attempt === 'misrouted'
        ? 'A AMMETER RESPONDED  /  DRIVE B RECEIVED NO CURRENT'
        : !routeRear
          ? 'SELECT THE REPAIRED DRIVE GROUP FROM THE A/B TEST'
          : snap.windowActive
            ? 'LOAD RECORDER IN SECTOR  /  APPLY NOTCH 1'
            : 'BOGIE B SELECTED  /  HOLD CONTROLLER OFF AND WATCH THE RECORDER';
    panel.status
      .setText(echoStatus)
      .setColor(snap.windowActive && routeRear ? '#75d4cd' : '#9fb7c0');
    panel.help.setText('SELECT MOTOR GROUP A OR B    /    MASTER CONTROLLER OFF–NOTCH 1    /    ESC OR E TO CLOSE');
  }

  refreshRollingBearingTable(panel) {
    const phase = this.scene.tutorialPuzzle?.mechanicalTable;
    if (!phase) return;
    panel.hits = renderMechanicalTableStage({
      panel,
      snap: phase.snapshot(),
      hover: this._mechanicalHoverId,
      pressed: this._mechanicalPressedId,
      now: this.scene.time?.now ?? 0,
    });
  }

  // Retained for one migration cycle as a visual rollback reference. The live
  // IV–VI path above is the theatrical cutaway; no runtime call reaches this
  // former photographed-service-plate renderer.
  refreshRollingBearingTableLegacy(panel) {
    const phase = this.scene.tutorialPuzzle?.mechanicalTable;
    if (!phase) return;
    const snap = phase.snapshot();
    const { left, top, width, height, graphics: art } = panel;
    const sx = width / 840;
    const sy = height / 500;
    const px = (x) => left + x * sx;
    const py = (y) => top + y * sy;
    const hover = this._mechanicalHoverId;
    const pressed = this._mechanicalPressedId;
    const hot = (id) => hover === id || pressed === id;
    const now = this.scene.time?.now ?? 0;
    const breathe = 0.7 + Math.sin(now / 230) * 0.22;
    const titles = {
      4: 'IV  /  LOAD THE RAIL',
      5: 'V  /  FIND THE BREAK',
      6: 'VI  /  MEET THE PAST',
    };
    panel.base?.setPosition(left + width / 2, top + height / 2).setDisplaySize(width, height).setAlpha(0.94);
    panel.title.setText(titles[snap.phase]).setPosition(px(38), py(22)).setFontSize('17px');
    panel.help
      .setText('OPERATE THE HARDWARE    /    FOLLOW THE BEARING    /    ESC OR E TO CLOSE')
      .setPosition(left + width / 2, py(476));
    Object.values(panel.partTexts ?? {}).forEach((text) => text.setVisible(false));
    art.clear();

    // Close plate — the only screen-level affordance. Everything else is a
    // physical part mounted on the photographed service table.
    art.fillStyle(C(CAR.ENAMEL_DARK), 0.94);
    art.fillRoundedRect(px(782), py(18), 34 * sx, 34 * sy, 5);
    art.lineStyle(2, C(CAR.LAMP_ALERT), 0.82);
    art.strokeRoundedRect(px(782), py(18), 34 * sx, 34 * sy, 5);
    art.lineBetween(px(792), py(28), px(806), py(42));
    art.lineBetween(px(806), py(28), px(792), py(42));
    panel.hits = [{ id: 'close', x: px(775), y: py(12), w: 50 * sx, h: 48 * sy }];

    // Cast-iron hand pump and sight glass. This replaces the old abstract '+'.
    // The handle visibly changes angle while pressed and the two glass bands
    // fill from the bottom, so both the verb and its consequence read without
    // explanatory UI.
    const reservoir = { x: 134, y: 218, w: 54, h: 116 };
    art.fillStyle(C(CAR.ENAMEL_DARK), 0.98);
    art.fillRoundedRect(px(92), py(126), 88 * sx, 206 * sy, 9);
    art.lineStyle(hot('pump') ? 4 : 2, C(hot('pump') ? CAR.BRASS_HI : CAR.STEEL_MID), 0.94);
    art.strokeRoundedRect(px(92), py(126), 88 * sx, 206 * sy, 9);
    // mounting feet and rivets
    art.fillStyle(C(CAR.STEEL_DARK), 1);
    art.fillRect(px(84), py(314), 104 * sx, 13 * sy);
    [104, 168].forEach((x) => {
      art.fillStyle(C(CAR.STEEL_HI), 0.72);
      art.fillCircle(px(x), py(142), 3 * sx);
      art.fillCircle(px(x), py(314), 3 * sx);
    });
    // glass reservoir, brass caps and two unmistakable fill bands
    art.fillStyle(C(CAR.GLASS_DARK), 0.9);
    art.fillRoundedRect(px(reservoir.x - reservoir.w / 2), py(reservoir.y - reservoir.h / 2), reservoir.w * sx, reservoir.h * sy, 6);
    const glassBottom = reservoir.y + reservoir.h / 2 - 7;
    const fillH = (reservoir.h - 14) * snap.pressure;
    art.fillStyle(C(CAR.LAMP_OK), 0.25 + snap.pressure * 0.5);
    art.fillRect(px(reservoir.x - reservoir.w / 2 + 7), py(glassBottom - fillH), (reservoir.w - 14) * sx, fillH * sy);
    art.lineStyle(2, C(CAR.BRASS_MID), 0.98);
    art.strokeRoundedRect(px(reservoir.x - reservoir.w / 2), py(reservoir.y - reservoir.h / 2), reservoir.w * sx, reservoir.h * sy, 6);
    art.fillStyle(C(CAR.BRASS_DARK), 1);
    art.fillRect(px(103), py(151), 62 * sx, 9 * sy);
    art.fillRect(px(103), py(276), 62 * sx, 9 * sy);
    [0.5, 1].forEach((level) => {
      const y = glassBottom - (reservoir.h - 14) * level;
      art.lineStyle(2, C(snap.pressure >= level ? CAR.LAMP_OK : CAR.STEEL_MID), snap.pressure >= level ? 0.95 : 0.55);
      art.lineBetween(px(111), py(y), px(157), py(y));
    });
    // pump barrel, piston rod and a handle that has a real pivot
    const pumpDown = pressed === 'pump';
    const pumpHot = hot('pump');
    art.fillStyle(C(CAR.ENAMEL_HI), 1);
    art.fillRoundedRect(px(101), py(287), 27 * sx, 29 * sy, 4);
    art.fillStyle(C(CAR.BRASS_MID), 1);
    art.fillCircle(px(114), py(300), 7 * sx);
    art.lineStyle(6, C(CAR.STEEL_HI), 1);
    art.lineBetween(px(114), py(300), px(163), py(pumpDown ? 318 : 282));
    art.lineStyle(10, C(pumpHot ? CAR.BRASS_HI : CAR.BRASS_MID), 1);
    art.lineBetween(px(157), py(pumpDown ? 316 : 284), px(177), py(pumpDown ? 323 : 277));
    art.lineStyle(3, C(CAR.BRASS_MID), 0.9);
    art.lineBetween(px(161), py(230), px(184), py(230));
    panel.hits.push({ id: 'pump', x: px(92), y: py(132), w: 84 * sx, h: 190 * sy });

    // Sliding load carriage on a toothed railway. Three detents remain the
    // same pure-logic choices, but they now read as positions of one physical
    // machine instead of three radio buttons.
    const detents = { left: 245, center: 335, right: 425 };
    art.fillStyle(C(CAR.ENAMEL_DARK), 0.95);
    art.fillRoundedRect(px(202), py(353), 266 * sx, 67 * sy, 7);
    art.lineStyle(2, C(CAR.STEEL_MID), 0.85);
    art.strokeRoundedRect(px(202), py(353), 266 * sx, 67 * sy, 7);
    art.fillStyle(C(CAR.STEEL_DARK), 1);
    art.fillRect(px(214), py(389), 242 * sx, 11 * sy);
    // rack teeth make the three stops spatially legible
    for (let x = 220; x <= 450; x += 12) {
      art.fillStyle(C(CAR.STEEL_MID), 0.82);
      art.fillRect(px(x), py(383), 5 * sx, 9 * sy);
    }
    Object.entries(detents).forEach(([id, x]) => {
      const selected = snap.weight === id;
      const detentHot = hot(`weight-${id}`);
      art.fillStyle(C(selected ? CAR.BRASS_MID : CAR.STEEL_DARK), selected ? 1 : 0.88);
      art.fillRoundedRect(px(x - 9), py(399), 18 * sx, 12 * sy, 3);
      art.lineStyle(detentHot ? 3 : 2, C(detentHot ? CAR.BRASS_HI : CAR.STEEL_HI), detentHot ? 1 : 0.72);
      art.lineBetween(px(x), py(401), px(x), py(414));
      panel.hits.push({ id: `weight-${id}`, x: px(x - 34), y: py(350), w: 68 * sx, h: 70 * sy });
    });
    const carriageX = detents[snap.weight];
    const carriageHot = hot(`weight-${snap.weight}`);
    art.fillStyle(C(CAR.ENAMEL_HI), 1);
    art.fillRoundedRect(px(carriageX - 38), py(350), 76 * sx, 35 * sy, 4);
    art.fillStyle(C(CAR.STEEL_MID), 1);
    art.fillRect(px(carriageX - 30), py(358), 60 * sx, 18 * sy);
    art.lineStyle(carriageHot ? 3 : 2, C(carriageHot ? CAR.BRASS_HI : CAR.STEEL_HI), 0.96);
    art.strokeRoundedRect(px(carriageX - 38), py(350), 76 * sx, 35 * sy, 4);
    // twin rollers and a brass latch handle communicate drag + seat
    [-24, 24].forEach((dx) => {
      art.fillStyle(C(CAR.VOID), 1);
      art.fillCircle(px(carriageX + dx), py(386), 8 * sx);
      art.lineStyle(2, C(CAR.STEEL_HI), 0.9);
      art.strokeCircle(px(carriageX + dx), py(386), 8 * sx);
    });
    art.lineStyle(5, C(CAR.BRASS_MID), 1);
    art.lineBetween(px(carriageX), py(352), px(carriageX), py(337));
    art.lineBetween(px(carriageX), py(337), px(carriageX + 13), py(337));

    // Fork and electrical route. The heavy brass rail carries the bearing;
    // the thin cyan run is the relay circuit. Keeping both visible makes the
    // shared grammar physical: pressure launches, weight biases the traveller,
    // and wiring selects which machine can receive it.
    const forkX = 430;
    const forkY = 267;
    const routeY = snap.route === 'a' ? 194 : 306;
    art.lineStyle(6, C(CAR.BRASS_MID), 0.78);
    art.lineBetween(px(185), py(230), px(forkX), py(forkY));
    art.lineStyle(7, C(snap.route === 'a' ? CAR.LAMP_OK : CAR.BRASS_HI), 0.92);
    art.lineBetween(px(forkX), py(forkY), px(690), py(routeY));
    [
      { id: 'a', y: 194 },
      { id: 'b', y: 306 },
    ].forEach((branch) => {
      if (branch.id === 'b' && snap.phase < 5) return;
      const selected = snap.route === branch.id;
      art.lineStyle(selected ? 4 : 2, C(selected ? CAR.LAMP_OK : CAR.STEEL_DARK), selected ? 0.96 : 0.42);
      art.lineBetween(px(forkX + 8), py(forkY + 13), px(690), py(branch.y + 13));
    });
    // Cast A/B knife selector. The handle points at the live branch instead of
    // decorating an otherwise invisible toggle.
    art.fillStyle(C(CAR.ENAMEL_DARK), 0.98);
    art.fillRoundedRect(px(392), py(211), 82 * sx, 112 * sy, 7);
    art.lineStyle(2, C(CAR.STEEL_MID), 0.92);
    art.strokeRoundedRect(px(392), py(211), 82 * sx, 112 * sy, 7);
    art.fillStyle(C(snap.route === 'a' ? CAR.LAMP_OK : CAR.STEEL_DARK), snap.route === 'a' ? 0.9 : 0.65);
    art.fillCircle(px(454), py(231), 7 * sx);
    art.fillStyle(C(snap.route === 'b' ? CAR.LAMP_OK : CAR.STEEL_DARK), snap.route === 'b' ? 0.9 : 0.65);
    art.fillCircle(px(454), py(303), 7 * sx);
    art.fillStyle(C(CAR.BRASS_MID), 1);
    art.fillCircle(px(forkX), py(forkY), 12 * sx);
    const selectorEndY = snap.route === 'a' ? 231 : 303;
    art.lineStyle(9, C(hot('route') ? CAR.BRASS_HI : CAR.STEEL_HI), 1);
    art.lineBetween(px(forkX), py(forkY), px(454), py(selectorEndY));
    art.fillStyle(C(CAR.BRASS_MID), 1);
    art.fillCircle(px(454), py(selectorEndY), 11 * sx);
    if (snap.phase >= 5) {
      art.lineStyle(hot('route') ? 3 : 1, C(hot('route') ? CAR.BRASS_HI : CAR.STEEL_MID), hot('route') ? 0.95 : 0.5);
      art.strokeRoundedRect(px(386), py(205), 94 * sx, 124 * sy, 9);
      panel.hits.push({ id: 'route', x: px(388), y: py(222), w: 84 * sx, h: 90 * sy });
    }

    // The Phase-V contact is physically absent until the comparison reveals
    // it. Once observed, two exposed posts and their gap are impossible to
    // confuse with another button. VI inherits the repaired bridge.
    const bridgeVisible = snap.phase >= 5 && (snap.phase === 6 || snap.breakObserved || snap.bridgeConnected);
    if (bridgeVisible) {
      const by = snap.route === 'a' ? 204 : 294;
      const bridgeHot = hot('bridge');
      // ceramic terminal posts
      [570, 622].forEach((x) => {
        art.fillStyle(C(CAR.ENAMEL_HI), 1);
        art.fillRoundedRect(px(x - 11), py(by - 20), 22 * sx, 40 * sy, 5);
        art.fillStyle(C(CAR.STEEL_HI), 1);
        art.fillCircle(px(x), py(by), 7 * sx);
        art.fillStyle(C(CAR.BRASS_MID), 1);
        art.fillCircle(px(x), py(by), 4 * sx);
      });
      // removable copper bridge: horizontal when seated, hanging in its clip
      // when open. The red gap is a consequence, not the control itself.
      art.lineStyle(7, C(bridgeHot ? CAR.BRASS_HI : CAR.BRASS_MID), 1);
      if (snap.bridgeConnected) {
        art.lineBetween(px(570), py(by), px(622), py(by));
        art.fillStyle(C(CAR.LAMP_OK), 0.9);
        art.fillCircle(px(596), py(by), 4 * sx);
      } else {
        art.lineBetween(px(620), py(by + 6), px(620), py(by + 31));
        art.fillStyle(C(CAR.LAMP_ALERT), 0.92);
        art.fillCircle(px(596), py(by), 5 * sx);
      }
      art.lineStyle(bridgeHot ? 3 : 1, C(bridgeHot ? CAR.BRASS_HI : CAR.STEEL_MID), bridgeHot ? 1 : 0.45);
      art.strokeRoundedRect(px(548), py(by - 26), 96 * sx, 57 * sy, 8);
      panel.hits.push({ id: 'bridge', x: px(540), y: py(by - 34), w: 112 * sx, h: 68 * sy });
    }

    // Guarded spring-loaded launch plunger. The old filled circle looked like
    // a software button; this has a shaft, collar, compression spring and a
    // moving cap, while keeping the exact same hit region and command.
    art.fillStyle(C(CAR.ENAMEL_DARK), 0.96);
    art.fillRoundedRect(px(92), py(344), 82 * sx, 76 * sy, 8);
    art.lineStyle(hot('release') ? 4 : 2, C(hot('release') ? CAR.BRASS_HI : CAR.STEEL_MID), 0.96);
    art.strokeRoundedRect(px(92), py(344), 82 * sx, 76 * sy, 8);
    const plungerY = 363 + (pressed === 'release' ? 9 : 0);
    art.fillStyle(C(CAR.BRASS_DARK), 1);
    art.fillRoundedRect(px(111), py(399), 44 * sx, 10 * sy, 3);
    art.lineStyle(5, C(CAR.STEEL_HI), 1);
    art.lineBetween(px(133), py(plungerY + 8), px(133), py(399));
    // spring coils around the shaft
    for (let y = plungerY + 12; y < 398; y += 7) {
      art.lineStyle(2, C(CAR.STEEL_MID), 0.95);
      art.lineBetween(px(121), py(y), px(145), py(y + 4));
    }
    art.fillStyle(C(hot('release') ? CAR.BRASS_HI : CAR.BRASS_MID), 1);
    art.fillRoundedRect(px(111), py(plungerY - 8), 44 * sx, 18 * sy, 7);
    art.lineStyle(2, C(CAR.BRASS_HI), 0.85);
    art.lineBetween(px(116), py(plungerY - 4), px(150), py(plungerY - 4));
    panel.hits.push({ id: 'release', x: px(84), y: py(334), w: 98 * sx, h: 96 * sy });

    // Asset-backed output bearings/gears. Their spin and tint are consequences,
    // not decorative animation.
    const outputAX = px(710);
    const outputAY = py(194);
    const outputBX = px(710);
    const outputBY = py(306);
    panel.outputA?.setPosition(outputAX, outputAY).setVisible(true)
      .setTint(C(snap.stageComplete && snap.route === 'a' ? CAR.LAMP_OK : CAR.BRASS_MID))
      .setRotation(snap.stageComplete && snap.route === 'a' ? now / 260 : 0);
    panel.outputB?.setPosition(outputBX, outputBY).setVisible(snap.phase >= 5)
      .setTint(C(snap.stageComplete && snap.route === 'b' ? CAR.LAMP_OK : CAR.STEEL_MID))
      .setRotation(snap.stageComplete && snap.route === 'b' ? now / 260 : 0);

    // Present bearing follows a continuous path. A failed launch ends at the
    // part that rejected it, stays long enough to read, then recirculates.
    const bearingState = snap.bearing;
    const outcome = bearingState?.outcome ?? snap.result;
    const bearingProgress = bearingState?.progress ?? 0;
    let end = snap.route === 'a' ? { x: 710, y: 194 } : { x: 710, y: 306 };
    if (outcome === 'underpowered') end = { x: 330, y: 252 };
    if (outcome === 'misweighted') end = { x: 455, y: 365 };
    if (outcome === 'open-contact' || outcome === 'no-reference') end = { x: 590, y: snap.route === 'a' ? 204 : 294 };
    if (outcome === 'mistimed' || outcome === 'misrouted') end = { x: 675, y: 380 };
    const start = { x: 172, y: 230 };
    const junction = { x: forkX, y: forkY };
    const t = bearingProgress;
    const point = t < 0.55
      ? {
          x: Phaser.Math.Linear(start.x, junction.x, t / 0.55),
          y: Phaser.Math.Linear(start.y, junction.y, t / 0.55),
        }
      : {
          x: Phaser.Math.Linear(junction.x, end.x, (t - 0.55) / 0.45),
          y: Phaser.Math.Linear(junction.y, end.y, (t - 0.55) / 0.45),
        };
    panel.bearing?.setPosition(px(point.x), py(point.y)).setVisible(Boolean(bearingState))
      .setRotation(now / 95)
      .setTint(C(outcome === 'phase-complete' ? CAR.LAMP_OK : CAR.BRASS_HI));

    // VI: a second, translucent asset-backed bearing is the remembered action.
    // The cradle is drawn at the actual meeting point; timing is spatial, not a
    // bar or countdown.
    if (snap.ghost) {
      const gx = Phaser.Math.Linear(190, 690, snap.ghost.progress);
      const gy = 148 + Math.sin(snap.ghost.progress * Math.PI) * 34;
      panel.ghostBearing?.setPosition(px(gx), py(gy)).setVisible(true)
        .setAlpha(snap.ghost.windowActive ? 0.95 : 0.5)
        .setRotation(-now / 120);
      const cradleX = Phaser.Math.Linear(190, 690, snap.ghost.couplingProgress);
      art.lineStyle(snap.ghost.windowActive ? 5 : 3, C(snap.ghost.windowActive ? CAR.LAMP_OK : CAR.BRASS_MID), snap.ghost.windowActive ? 1 : 0.6);
      art.strokeCircle(px(cradleX), py(170), 25 * sx);
      art.lineBetween(px(cradleX - 29), py(170), px(cradleX - 14), py(170));
      art.lineBetween(px(cradleX + 14), py(170), px(cradleX + 29), py(170));
    } else {
      panel.ghostBearing?.setVisible(false);
    }

    const resultText = {
      underpowered: 'PRESSURE FADED  /  THE BEARING STALLED BEFORE THE FORK',
      misweighted: 'THE LOAD SENT THE BEARING INTO THE RETURN TRAY',
      'reference-pass': 'ROUTE A PROVED  /  COMPARE THE SAME RUN ON B',
      'no-reference': 'B STOPPED  /  THERE IS NO REFERENCE RUN TO COMPARE',
      'open-contact': 'ROUTE B STOPPED AT THE OPEN CONTACT',
      misrouted: 'THE PRESENT BEARING TOOK THE WRONG OUTPUT',
      mistimed: 'THE TWO BEARINGS MISSED  /  BOTH ARE RECIRCULATING',
      'phase-complete': snap.phase === 6 ? 'THE BEARINGS MESHED  /  TRACTION COUPLED' : 'OUTPUT TURNING  /  TEST PROVED',
    };
    const defaultText = snap.phase === 4
      ? 'PRESSURE LAUNCHES  /  WEIGHT CHANGES THE JOURNEY'
      : snap.phase === 5
        ? snap.bridgeConnected
          ? 'BYPASS SEATED  /  PROVE ROUTE B'
          : snap.breakObserved
            ? 'A PASSED  /  B STOPPED AT THE GAP'
            : snap.referencePassed
              ? 'A PASSED  /  THROW THE FORK AND COMPARE B'
              : 'RUN ONE BEARING THROUGH A  /  THEN COMPARE B'
        : 'CONFIGURE THE KNOWN SYSTEMS  /  MEET THE REMEMBERED BEARING';
    panel.status
      .setText(resultText[outcome] ?? defaultText)
      .setPosition(left + width / 2, py(72))
      .setColor(outcome && outcome !== 'phase-complete' && outcome !== 'reference-pass' ? '#e45a5f' : '#9ce8e2');

    // Reuse the text objects rather than allocating every frame.
    panel.partTexts.reference.setText('HAND PUMP').setPosition(px(134), py(112)).setColor('#9fb7c0').setVisible(true);
    panel.partTexts.isolate.setText('LOAD CARRIAGE   LIGHT  /  BALANCED  /  HEAVY').setPosition(px(335), py(438)).setColor('#9fb7c0').setVisible(true);
    panel.partTexts.gauge.setText(`A / B SELECTOR   ${snap.route.toUpperCase()}`).setPosition(px(432), py(335)).setColor('#f2d49a').setVisible(snap.phase >= 5);
    panel.partTexts.test.setText('LAUNCH').setPosition(px(133), py(436)).setColor(hot('release') ? '#f2d49a' : '#9fb7c0').setVisible(true);
    panel.partTexts.bleed.setText(snap.bridgeConnected ? 'COPPER LINK SEATED' : 'COPPER LINK OPEN').setPosition(px(596), py(354)).setColor(snap.bridgeConnected ? '#75d4cd' : '#9fb7c0').setVisible(bridgeVisible);
    panel.partTexts.pin.setText('A').setPosition(px(751), py(194)).setColor(snap.route === 'a' ? '#75d4cd' : '#9fb7c0').setVisible(true);
    panel.partTexts.actuator.setText('B').setPosition(px(751), py(306)).setColor(snap.route === 'b' ? '#75d4cd' : '#9fb7c0').setVisible(snap.phase >= 5);
  }

  _mechanicalHit(x, y) {
    return this.mechanicalPanel?.hits?.find((hit) => x >= hit.x && x <= hit.x + hit.w && y >= hit.y && y <= hit.y + hit.h) ?? null;
  }

  _onMechanicalPointerDown(pointer) {
    const hit = this._mechanicalHit(pointer.x, pointer.y);
    this._mechanicalPointerDownCount = (this._mechanicalPointerDownCount ?? 0) + 1;
    this._mechanicalLastPointerDown = {
      x: Math.round(pointer.x),
      y: Math.round(pointer.y),
      hit: hit?.id ?? null,
    };
    if (!hit) return;
    this._mechanicalPressedId = hit.id;
    if (hit.id === 'close') {
      this.closeMechanicalPanel();
      return;
    }
    if (this.mechanicalPanelMode?.startsWith('table-')) {
      const phase = this.scene.tutorialPuzzle?.mechanicalTable;
      if (!phase) return;
      phase.interact(hit.id);
      phase.drainEvents().forEach((event) => this.handleMechanicalTableEvent(event, phase));
      this.refreshMechanicalPanel();
      return;
    }
    if (this.mechanicalPanelMode === 'bogie') {
      const phase = this.scene.tutorialPuzzle?.bogieDiagnosis;
      if (!phase) return;
      if (hit.id === 'brake-vent') this._mechanicalVentHeld = true;
      else if (hit.id === 'repair' && !phase.snapshot().faultLocalized) phase.interact('inspect-actuator');
      else phase.interact(hit.id);
      phase.drainEvents().forEach((evt) => this.handleBogieDiagnosisEvent(evt));
      this.refreshBogieVisuals(phase.snapshot());
      return;
    }
    const phase = this.scene.tutorialPuzzle?.echoReplay;
    if (!phase || !['route', 'test'].includes(hit.id)) return;
    phase.interact(hit.id);
    phase.drainEvents().forEach((evt) => this.handleEchoReplayEvent(evt));
    this.refreshEchoVisuals(phase.snapshot());
  }

  _onMechanicalPointerUp() {
    this._mechanicalPressedId = null;
    if (this.mechanicalPanelMode === 'bogie' && this._mechanicalVentHeld) {
      this._mechanicalVentHeld = false;
      this.scene.tutorialPuzzle?.bogieDiagnosis?.setVentHeld?.(false);
    }
    if (this.mechanicalPanelMode) this.refreshMechanicalPanel();
  }

  _setupRelayInput() {
    const { scene } = this;
    // The frozen art module owns hit tests and drag state; this layer owns
    // listener lifecycle and the screen -> world conversion. All listeners
    // are removed in destroy().
    this._relayHandlers = {
      down: (pointer) => this._onRelayPointerDown(pointer),
      move: (pointer) => this._onRelayPointerMove(pointer),
      up: (pointer) => this._onRelayPointerUp(pointer),
      // Pointer leaving the canvas mid-drag must not strand a lead tip.
      out: () => this._cancelRelayDrag(),
    };
    scene.input.on('pointerdown', this._relayHandlers.down);
    scene.input.on('pointermove', this._relayHandlers.move);
    scene.input.on('pointerup', this._relayHandlers.up);
    scene.input.on('gameout', this._relayHandlers.out);
    // Browser focus loss: same escape hatch (work package §4.3).
    this._relayBlurHandler = () => this._cancelRelayDrag();
    if (typeof window !== 'undefined') {
      window.addEventListener('blur', this._relayBlurHandler);
    }
  }

  _cancelRelayDrag() {
    if (this.mechanicalPanelMode) this._onMechanicalPointerUp();
    if (this.relayCloseupState === 'open' || this.relayCloseupState === 'opening') {
      this.relayArt?.cancelDrag();
      this._setRelayHover(null); // drag aborted; next move recomputes
    }
  }

  // P5 (Wave 5): hover affordance consumed from RelayCabinetArt (art-owner's
  // setHoverTarget, optional-chained so this layer predates/survives its
  // landing). Hit test reuses the art's own getHitRegions() so the hover ring
  // can never disagree with the snap targets. Cleared while dragging, on
  // close, and on any drag cancel.
  _hitTestRelay(x, y) {
    const regions = this.relayArt?.getHitRegions?.() ?? [];
    for (const region of regions) {
      const shape = region.shape;
      if (shape.type === 'circle') {
        const dx = x - shape.x;
        const dy = y - shape.y;
        if (dx * dx + dy * dy <= shape.r * shape.r) return region.id;
      } else if (shape.type === 'rect') {
        if (x >= shape.x && x <= shape.x + shape.w && y >= shape.y && y <= shape.y + shape.h) {
          return region.id;
        }
      }
    }
    return null;
  }

  _setRelayHover(id) {
    const next = id ?? null;
    if (next === this._relayHoverId) return;
    this._relayHoverId = next;
    this.relayArt?.setHoverTarget?.(next);
  }

  _onRelayPointerDown(pointer) {
    if (this.mechanicalPanelMode) {
      this._onMechanicalPointerDown(pointer);
      return;
    }
    if (this.relayCloseupState !== 'open') return;
    this._setRelayHover(null); // a press/drag supersedes the hover ring
    this.relayArt?.pointerDown(pointer.worldX, pointer.worldY);
  }

  _onRelayPointerMove(pointer) {
    if (this.mechanicalPanelMode) {
      const hit = this._mechanicalHit(pointer.x, pointer.y);
      const next = hit?.id ?? null;
      if (next !== this._mechanicalHoverId) {
        this._mechanicalHoverId = next;
        this.scene.input?.setDefaultCursor?.(next ? 'pointer' : this._probeCursor());
        this.refreshMechanicalPanel();
      }
      return;
    }
    if (this.relayCloseupState !== 'open') return;
    const art = this.relayArt;
    if (!art || art.destroyed) return;
    const result = art.pointerMove(pointer.worldX, pointer.worldY);
    if (result?.dragging) {
      this._setRelayHover(null); // dragging: no hover ring under a live lead
      return;
    }
    this._setRelayHover(this._hitTestRelay(pointer.worldX, pointer.worldY));
  }

  _onRelayPointerUp(pointer) {
    if (this.mechanicalPanelMode) {
      this._onMechanicalPointerUp(pointer);
      return;
    }
    if (this.relayCloseupState !== 'open') return;
    const art = this.relayArt;
    const logic = this.relay;
    if (!art || !logic) return;
    const result = art.pointerUp(pointer.worldX, pointer.worldY);
    if (!result) return;
    if (Object.prototype.hasOwnProperty.call(result, 'placed')) {
      // Lead drag released. Locked wiring convention: a drop on a terminal
      // disconnects the previous landing first, then connects; a drop in
      // empty space with a previous landing is a plain disconnect. A rejected
      // connect still queues its connect-rejected event, which the art plays
      // as a local knock-back — wiring state is never faked.
      if (result.from) logic.disconnect(result.lead);
      if (result.placed) logic.connect(result.lead, result.placed);
    } else if (result.pressed === 'test') {
      logic.test();
    } else if (result.pressed === 'reset') {
      logic.reset();
    }
    this._drainRelay();
  }

  // Drain the cabinet's event queue into the close-up art one by one, then
  // finish with a steady-state snapshot兜底 — the same order the world art
  // uses. relay-bridged arms the locked §2.3 exit beat.
  _drainRelay() {
    if (!this.relay || !this.relayArt) return;
    this.relay.drainEvents().forEach((evt) => this._handleRelayEvent(evt));
    this.relayArt.applySnapshot(this.relay.snapshot());
  }

  _handleRelayEvent(evt) {
    this.relayArt?.handleEvent(evt);
    if (evt?.type !== 'relay-bridged') return;
    // 450ms hold so the player watches the armature seat and the three stage
    // lamps land, then the door half-closes and the camera returns on its
    // own (work package §2.3). Guarded: one schedule per opening.
    if (this.relayCloseupState !== 'open' || this._relayAutoCloseScheduled) return;
    this._relayAutoCloseScheduled = true;
    this.scene.time.delayedCall(RELAY_CLOSEUP_SOLVED_HOLD_MS, () => {
      this._relayAutoCloseScheduled = false;
      if (this.relayCloseupState === 'open') this.closeRelayCloseup();
    });
  }

  openRelayCloseup() {
    const { scene } = this;
    if (!this.relay || !this.relayArt || this.relayArt.destroyed) return;
    if (this.relayCloseupState !== 'closed') return;
    // Only a real player open counts as entering the cabinet (QA warps and
    // diagnostics never call this).
    this.relay.enter();
    this.relayCloseupState = 'opening';
    scene.relayCloseupActive = true;
    scene.player.frozen = true;
    scene.player.setVelocity(0, 0);
    // P1: the cluster was hidden at build / last close — show it before the
    // physical open. Sync first so a re-opened case shows its committed
    // wiring, then play the open beat.
    this.relayArt.setVisible(true);
    this._drainRelay();
    this.relayArt.open();
    scene.scene.setVisible(false, 'Hud');
    this._setRelayCursor(true);
    const camera = scene.cameras.main;
    camera.stopFollow();
    // P3 (Wave 5): camera pan (360ms) runs CONCURRENTLY with the prop beat
    // (bolt 0–60ms, door 60–300ms inside art.open()). The reading order is
    // still bolt -> door -> camera settle: the pan lands at ~360ms, just
    // after the door finishes at ~300ms, so the player watches the case open
    // while the world slides — never a camera gliding toward an already-open
    // case, and never a camera arriving before the props (work package
    // §3.4.2: the camera follows the door, it never leads it).
    camera.pan(
      RELAY_CLOSEUP_CAMERA.x,
      RELAY_CLOSEUP_CAMERA.y,
      RELAY_CLOSEUP_CAMERA_MS,
      'Sine.easeInOut',
      true,
      // Camera.pan callbacks fire per frame (onUpdate semantics); only the
      // progress === 1 frame means the move has actually landed.
      (cam, progress) => {
        if (progress < 1) return;
        if (this.relayCloseupState === 'opening') this.relayCloseupState = 'open';
      },
    );
  }

  closeRelayCloseup({ force = false } = {}) {
    if (this.mechanicalPanelMode) {
      this.closeMechanicalPanel();
      return;
    }
    const { scene } = this;
    if (this.relayCloseupState === 'closed' || this.relayCloseupState === 'closing') return;
    if (this.relayCloseupState === 'opening' && !force) return;
    this.relayCloseupState = 'closing';
    // Closing never touches the wiring: no logic.reset() here. The leads the
    // player landed stay landed for the next opening.
    this.relayArt?.cancelDrag();
    this._setRelayHover(null); // no hover ring on a closed case
    this.relayArt?.close();
    const camera = scene.cameras.main;
    const finish = () => {
      this.relayCloseupState = 'closed';
      scene.relayCloseupActive = false;
      scene.player.frozen = false;
      // P1: the close-up cluster (world x120–840, depth 69–79, door resting
      // half-closed) must leave the stage entirely — otherwise it hangs on
      // the car wall as a permanent "second cabinet" next to the world one.
      this.relayArt?.setVisible(false);
      scene.scene.setVisible(true, 'Hud');
      this._setRelayCursor(false);
      // Restore the tutorial follow rig exactly as setTutorialCameraMode(0)
      // configured it (lerp 0.075/0.11, deadzone 220x170, offsetY 150).
      camera.startFollow(scene.player, true, 0.075, 0.11, 0, 150);
      camera.setDeadzone(220, 170);
    };
    if (force) {
      finish();
      return;
    }
    // The door settles half-closed first (240ms), then the camera returns
    // (360ms); the player unfreezes only when the world camera is back.
    scene.time.delayedCall(240, () => {
      if (!this.relayArt || this.relayArt.destroyed) {
        finish();
        return;
      }
      // Same per-frame callback semantics: run finish() only on the frame the
      // return pan completes, or the follow rig is restored 360ms early.
      camera.pan(scene.player.x, 400, RELAY_CLOSEUP_CAMERA_MS, 'Sine.easeInOut', true, (cam, progress) => {
        if (progress >= 1) finish();
      });
    });
  }

  // Brass inspection probe cursor (work package §3.1): a tiny canvas-drawn
  // probe served as a CSS cursor, crosshair fallback. No new game assets.
  _probeCursor() {
    if (this._probeCursorValue) return this._probeCursorValue;
    let cursor = 'crosshair';
    if (typeof document !== 'undefined') {
      try {
        const c = document.createElement('canvas');
        c.width = 16;
        c.height = 16;
        const ctx = c.getContext('2d');
        // 2px brass shaft, bright tip at the hotspot corner, dark grip.
        ctx.strokeStyle = '#caa66b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(3, 13);
        ctx.lineTo(12, 4);
        ctx.stroke();
        ctx.fillStyle = '#f2d49a';
        ctx.fillRect(11, 1, 4, 4);
        ctx.fillStyle = '#6b5320';
        ctx.fillRect(1, 12, 4, 3);
        cursor = `url(${c.toDataURL('image/png')}) 13 3, crosshair`;
      } catch {
        cursor = 'crosshair';
      }
    }
    this._probeCursorValue = cursor;
    return cursor;
  }

  _setRelayCursor(on) {
    const input = this.scene.input;
    if (!input?.setDefaultCursor) return;
    input.setDefaultCursor(on ? this._probeCursor() : 'default');
  }


  updateObjective() {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    if (
      !scene.tutorialObjectiveArrow ||
      !this.visible ||
      scene.dialogueState ||
      scene.prompt?.visible ||
      ['opening', 'departure', 'complete'].includes(puzzle.phase)
    ) {
      scene.tutorialObjectiveArrow?.setVisible(false);
      scene.tutorialObjectiveLabel?.setVisible(false);
      return;
    }
    const stage = this.currentStage();
    if (puzzle.phase === 'approach') {
      const previousGate = this.config.stages[Math.max(0, puzzle.stageIndex - 1)].endX;
      scene.tutorialObjectiveArrow.setPosition(previousGate, 339).setVisible(true);
      scene.tutorialObjectiveLabel
        .setPosition(previousGate, 318)
        .setText('OPEN — KEEP GOING')
        .setVisible(true);
      return;
    }
    let x = 125;
    let label = 'SPEAK';
    if (!puzzle.briefed) {
      scene.tutorialObjectiveArrow.setPosition(x, 339).setVisible(true);
      scene.tutorialObjectiveLabel.setPosition(x, 318).setText(label).setVisible(true);
      return;
    }
    if (stage.autoRun) {
      const target = scene.interactables.find(
        (it) => it.def.stage === stage.index && it.def.command === 'door',
      );
      x = target?.sprite.x ?? stage.commandX;
      label = 'ONE PUNCH OPENS THE DOOR';
    } else {
      // Junction-2 and every later room get no arrow: the interlock spec bans
      // any pointer at the answer, and the machines carry their own guidance.
      scene.tutorialObjectiveArrow.setVisible(false);
      scene.tutorialObjectiveLabel.setVisible(false);
      return;
    }
    scene.tutorialObjectiveArrow.setPosition(x, 339).setVisible(true);
    scene.tutorialObjectiveLabel.setPosition(x, 318).setText(label).setVisible(true);
  }

  objectiveText() {
    const puzzle = this.scene.tutorialPuzzle;
    if (!puzzle.briefed) return 'speak with the conductor and take the brass ticket punch';
    if (puzzle.phase === 'approach') return 'walk through the open partition into the next section';
    if (puzzle.phase === 'executing') return 'watch the train execute the punched timetable';
    if (puzzle.phase === 'departure') return 'watch the train leave the station';
    if (puzzle.phase === 'complete') return 'enter the next carriage';
    const stage = this.currentStage();
    if (puzzle.phase === 'echo-travel') return 'follow the remembered self to the next lower contact';
    if (puzzle.phase === 'echo-sync') {
      return `reach the ${RAIL_CONTROLS[puzzle.activeCommand]?.label.toLowerCase()} while PAST holds its contact`;
    }
    if (puzzle.phase === 'echo-retry') return 'wait for the remembered self to circle back';
    if (puzzle.phase === 'echo-replay') return 'watch the remembered self carry the earlier valve action below the car';
    // Section III states the destination or the machine's current behaviour,
    // never the order. The gauge, the pipe, the isolator and the claw are what
    // teach the sequence; naming it here would let the player finish the room
    // without ever reading the machines.
    if (stage.airCircuit) {
      const snap = puzzle.airCircuit?.snapshot();
      if (!snap || snap.stageComplete) return 'enter the next carriage';
      if (snap.doorState === 'RELEASED' || snap.doorState === 'OPENING') {
        return 'the claw has let go — the door is free';
      }
      if (snap.stalledOnSupply) return 'the needle will not come down — the pipe keeps fighting back';
      if (snap.isolateClosed && snap.door.pressure > snap.tuning.releaseThreshold) {
        return 'the isolated line is bleeding down';
      }
      return 'get through the door at the far end of the car';
    }
    if (stage.firstWeight) {
      const snap = puzzle.firstWeight?.snapshot?.();
      if (!snap || !snap.caseFallen) return 'a baggage case is loose above the rail';
      if (snap.stageComplete) return 'enter the next carriage';
      if (!snap.firstBalanced) return 'the fallen case has pulled the carriage off level';
      if (!snap.tagPunched) return 'the level case has exposed its witness tag';
      if (snap.atExit && !snap.level) return 'the exit latch has slipped out of line';
      return 'the punched weight and your body now share the same balance beam';
    }
    if (stage.twoTrueThings) {
      const snap = puzzle.twoTrueThings?.snapshot?.();
      if (!snap || !snap.casesFallen) return 'two archive cases are descending onto one cradle';
      if (snap.stageComplete) return 'enter the next carriage';
      if (!snap.bothWitnessed) return 'both records are present, but not both have been witnessed';
      if (snap.cradleSupport === 'folded' || snap.cradleSupport === 'unsupported') {
        return 'a second place has unfolded, but nothing carries its weight';
      }
      if (snap.cradleSupport === 'winch-only') return 'the winch lifts the cradle, but its underside still falls away';
      if (snap.cradleSupport === 'air-only') return 'the air cushion floats the cradle, but it has no restraint';
      if (!snap.separated) return 'two supported places are waiting for two separate records';
      return 'both witnessed records now have a place in the train';
    }
    if (stage.trainRemembers) {
      const snap = puzzle.trainRemembers?.snapshot?.();
      if (!snap || snap.phase === 'idle' || snap.phase === 'arrival') return 'the train is recalling the first weight';
      if (snap.stageComplete) return 'the train remembers how to carry you forward';
      if (snap.phase === 'duet') {
        if (snap.balanced) return 'past and present are holding the carriage level';
        return 'the amber past is moving; the present case shares its equalizer';
      }
      if (snap.phase === 'redaction') return 'the Archivist is removing the remembered weight';
      if (snap.phase === 'catch') return 'the falling record has left the balance';
      if (snap.phase === 'train-help') return 'the train is taking the counterweight you had to abandon';
    }
    if (stage.mechanicalTable) {
      const snap = puzzle.mechanicalTable?.snapshot?.();
      if (!snap || snap.stageComplete) return 'enter the next carriage';
      if (snap.result === 'underpowered') return 'the bearing stalled before the fork';
      if (snap.result === 'misweighted') return 'the bearing fell into the return tray';
      if (snap.phase === 5) {
        if (snap.bridgeConnected) return 'the bypass is seated; route B is ready to prove';
        if (snap.breakObserved) return 'route B stops at the visible contact gap';
        if (snap.referencePassed) return 'route A is proved; compare the other branch';
        return 'the rolling-bearing table is waiting for a reference run';
      }
      if (snap.phase === 6) {
        if (snap.result === 'mistimed') return 'the present bearing missed the remembered one';
        if (snap.ghost?.windowActive) return 'the remembered bearing is crossing the coupling cradle';
        return 'the remembered bearing keeps circling the upper rail';
      }
      if (snap.balance?.aligned && !snap.balance?.launchReady) return 'the pin is aligned, but the air charge is below the working mark';
      if (snap.balance?.aligned) return 'the equalizer pin is aligned with its fork';
      return 'match the suspension load to the air charge';
    }
    if (stage.physicalSequence) {
      const expected = stage.solution[puzzle.queue.length];
      return expected
        ? `look below, read the changed hardware, and operate the ${RAIL_CONTROLS[expected]?.label.toLowerCase()}`
        : 'watch the completed wheelset settle into service';
    }
    if (stage.autoRun) return 'punch the glowing door action once';
    // Phase V: name the state the player is looking at, never what to do
    // about it. The two bogies, the pin and the gauge are what they read.
    if (stage.bogieService) {
      const snap = puzzle.bogieDiagnosis?.snapshot();
      if (!snap || snap.stageComplete) return 'enter the next carriage';
      if (snap.motor.energized && !snap.rear.wheelTurning && !snap.rear.repaired) {
        return 'one bogie answers the test — the other stays dark';
      }
      if (snap.rear.repaired && snap.brake.isolated) return 'the piston is free, but the local line is still cut off';
      if (snap.rear.repaired && snap.brake.pressure < 60) return 'the local line is still flat';
      if (snap.rear.serviceLockEngaged) return 'the service pin is seated across the linkage';
      if (snap.brake.isolated && snap.brake.pressure <= 0) return 'the local brake line is cut off and flat';
      if (snap.brake.isolated) return 'the local brake line is cut off below';
      return 'the test stand compares both bogies';
    }
    // Phase VI: same house rule — name the state, never the order. The ghost,
    // the zone stripe and the lamps are what the player reads.
    if (stage.echoLoad) {
      const snap = puzzle.echoReplay?.snapshot();
      if (!snap || snap.stageComplete) return 'enter the next carriage';
      if (snap.departing) return 'the train is answering at last';
      if (snap.observationLoop) return 'the remembered self is showing its round below';
      if (snap.attempt === 'stale') return 'the wheels are spinning free — the weight has moved on';
      if (snap.attempt === 'biting') return 'the wheels have the rail — hold it';
      if (snap.windowActive) return 'the moving weight is over the drive bogie';
      return 'the remembered self keeps riding the counterweight below';
    }
    // Phase IV: same house rule — name the state the player is looking at,
    // never what to do about it. The bags, the tilt, the sparks and the TEST
    // stand are what the player reads.
    if (stage.weightTransfer) {
      const snap = puzzle.weightTransfer?.snapshot();
      if (!snap || snap.stageComplete) return 'enter the next carriage';
      if (snap.motor.wheelState === 'biting') return 'the wheels have caught the rail — the car is moving';
      if (snap.motor.wheelState === 'spinning') return 'the motor is spinning free — the drive axle carries no weight';
      if (snap.suspension.venting) return 'air is hissing out of the suspension line below the floor';
      if (snap.suspension.isolated && snap.suspension.pressure < 90) return 'the suspension line is sealed but still cut off from the header';
      if (snap.trolleyX < 0.85) return 'the counterweight trolley is still off the drive bogie';
      return 'the drive bogie is loaded — the test stand is waiting';
    }
    // Section II: same rule as the air lock — state what the machine is doing,
    // never the order. The latch, the lit copper run and the contactor are what
    // the player reads; this line only names the state they are looking at.
    if (stage.index === CONTACT_STAGE_INDEX) {
      const snap = this.contactLock?.snapshot();
      if (!snap || snap.complete) return 'enter the next carriage';
      if (snap.circuitEnergized) return 'the underfloor circuit is live at the contactor';
      // Descriptive only, like every other line here: it names the state the
      // player is looking at, never what to do about it.
      if (snap.relayWaiting) return 'the signal is holding at the relay case';
      if (snap.latchClosed) return 'the signal is running beneath the carriage';
      return 'the door latch by the entry frame is still open';
    }
    return puzzle.queue.length < stage.solution.length
      ? `read the mechanism and punch ${stage.solution.length} ${stage.solution.length === 1 ? 'action' : 'actions'}`
      : 'run the punched timetable';
  }

  setVisible(visible) {
    this.visible = visible;
    this.refresh();
  }

  refresh() {
    const { scene } = this;
    const puzzle = scene.tutorialPuzzle;
    const visible = this.visible && scene.activeWorldIndex === 0;
    // The interlock art follows the same world-0 visibility as the rooms.
    this.contactArt?.setVisible(visible);
    this.firstWeightArt?.setVisible(
      visible && puzzle.stageIndex >= AIR_CIRCUIT_STAGE_INDEX,
    );
    this.twoTrueThingsArt?.setVisible(
      visible && puzzle.stageIndex >= WEIGHT_TRANSFER_STAGE_INDEX,
    );
    this.trainRemembersArt?.setVisible(
      visible && puzzle.stageIndex >= TWO_TRUE_THINGS_STAGE_INDEX,
    );
    this.stageAssemblies.forEach((assembly, index) => {
      const active = visible && index === puzzle.stageIndex;
      const completed = visible && Boolean(puzzle.stageComplete[index]);
      const dormant = visible && (
        index === puzzle.stageIndex + 1 ||
        (active && puzzle.phase === 'approach')
      );
      const settling = completed && puzzle.phase === 'approach' && index === puzzle.stageIndex - 1;
      const controlsActive = active && puzzle.briefed && puzzle.phase !== 'approach';
      // Every room the player has already walked through stays physically
      // present. `dormant` covers only the next section, so gating presence on
      // it made rooms two or more sections back vanish outright — during a
      // downward completion pan that read as the train losing its machinery.
      const roomPresent = active || completed || dormant || index < puzzle.stageIndex;
      const rackActive = (controlsActive || completed || dormant) && assembly.stage.showRack !== false;
      const rackAlpha = dormant ? 0.14 : settling ? 0.9 : completed ? 0.66 : 1;
      const projectedDrum = Boolean(assembly.drumProjection);
      const faceActive = rackActive && !projectedDrum;
      assembly.rack.setVisible(faceActive).setAlpha(rackAlpha);
      // The recess and the bezel are part of the same physical instrument, so
      // they track the face exactly. Missing this would leave a lit brass ring
      // floating in a dimmed SERVICE SET room.
      assembly.rackRebate.setVisible(faceActive).setAlpha(rackAlpha * 0.92);
      assembly.rackBezel.setVisible(faceActive).setAlpha(rackAlpha);
      assembly.rackTitle.setVisible(faceActive).setAlpha(dormant ? 0.12 : settling ? 0.82 : completed ? 0.58 : 1);
      assembly.queue.setVisible(faceActive).setAlpha(dormant ? 0.12 : settling ? 0.9 : completed ? 0.76 : 1);
      assembly.tick.setVisible(faceActive && !assembly.stage.guideSequence).setAlpha(dormant ? 0.1 : settling ? 0.6 : completed ? 0.38 : 1);
      assembly.paperStrip.setVisible(faceActive).setAlpha(dormant ? 0.12 : settling ? 0.84 : completed ? 0.62 : 0.88);
      assembly.punchHead.setVisible(faceActive).setAlpha(dormant ? 0.14 : settling ? 0.82 : completed ? 0.58 : 1);
      if (assembly.drumProjection) {
        const projectionAlpha = dormant ? 0.1 : settling ? 0.62 : completed ? 0.42 : 1;
        Object.values(assembly.drumProjection)
          .filter((object) => object?.setVisible)
          .forEach((object) => object.setVisible(rackActive).setAlpha(projectionAlpha));
      }
      assembly.completedLabel.setVisible(completed).setAlpha(settling ? 1 : 0.76);
      assembly.completionLamp.setVisible(completed).setAlpha(settling ? 1 : 0.82);
      assembly.commandLabels.forEach((label) => label
        .setVisible(roomPresent)
        .setAlpha(dormant ? 0.12 : settling ? 0.76 : completed ? 0.4 : 1));
      assembly.memoryLabel?.setVisible(rackActive).setAlpha(dormant ? 0.12 : settling ? 0.7 : completed ? 0.48 : 1);
      assembly.slotLabel
        ?.setVisible((controlsActive || completed || dormant) && !completed)
        .setAlpha(dormant ? 0.12 : settling ? 0.64 : 1);
      assembly.resetLabel
        ?.setVisible((controlsActive || completed || dormant) && !completed)
        .setAlpha(dormant ? 0.12 : settling ? 0.64 : 1);
      assembly.runLabel
        ?.setVisible((controlsActive || completed || dormant) && !assembly.stage.autoRun)
        .setAlpha(dormant ? 0.12 : settling ? 0.64 : completed ? 0.34 : 1);
      const echoMotion = ['echo-travel', 'echo-sync', 'echo-retry'].includes(puzzle.phase);
      assembly.echo
        ?.setVisible(roomPresent && Boolean(puzzle.echoRecorded))
        .setAlpha(dormant ? 0.1 : settling ? 0.38 : completed ? 0.24 : echoMotion ? assembly.echo.alpha : 0.44);
      assembly.echoGlow
        ?.setVisible(roomPresent && Boolean(puzzle.echoRecorded))
        .setAlpha(dormant ? 0.04 : settling ? 0.14 : completed ? 0.08 : echoMotion ? assembly.echoGlow.alpha : 0.16);
      assembly.echoRail
        ?.setVisible(roomPresent && Boolean(puzzle.echoRecorded))
        .setAlpha(dormant ? 0.06 : settling ? 0.24 : completed ? 0.12 : echoMotion ? assembly.echoRail.alpha : 0.32);
      assembly.echoNodes.forEach((node, nodeIndex) => {
        const nodeVisible = roomPresent && Boolean(puzzle.echoRecorded);
        const locked = completed || (active && nodeIndex < puzzle.echoSyncIndex);
        const live = active && puzzle.phase === 'echo-sync' && nodeIndex === puzzle.echoSyncIndex;
        node.beam.setVisible(nodeVisible).setAlpha(dormant ? 0.04 : live ? 0.64 : locked ? 0.34 : 0.12);
        node.ring.setVisible(nodeVisible).setAlpha(dormant ? 0.08 : live ? 1 : locked ? 0.72 : 0.42);
        node.core.setVisible(nodeVisible).setAlpha(dormant ? 0.08 : live ? 1 : locked ? 0.9 : 0.28);
      });
      // The air-circuit stage reads its pressure off the eye-height dial alone, so
      // the sliding column stays down. This has to be decided here rather than
      // at construction: this loop reasserts visibility on every refresh and
      // would otherwise put the duplicate readout straight back on screen.
      const machineryShown = roomPresent && assembly.stage.showMachinery !== false;
      Object.entries(assembly.machinery)
        .filter(([, value]) => value?.setVisible)
        .forEach(([key, object]) => object.setVisible(
          machineryShown
            && !(key === 'pressureBar' && assembly.stage.airCircuit)
            // No wheelset lives in the air-circuit room; its brake shoes
            // would float beside the pipe run (UNDERCARRIAGE VIEW TEACHING).
            && !((key === 'brakeLeft' || key === 'brakeRight') && assembly.stage.airCircuit),
        ));
      assembly.machinery.drumKeyLabels?.forEach((label) =>
        label
          .setVisible(roomPresent)
          .setAlpha(dormant ? 0.12 : settling ? 0.7 : completed ? 0.42 : 1),
      );
      if (rackActive && assembly.stage.drum) {
        // Drum face: six slots always shown, so the player can read the whole
        // revolution as a shape. A jammed slot keeps its letters — the card is
        // still there, it just did not take.
        const drum = puzzle.drum;
        const nextOpen = drum && !drum.running ? firstOpenSlot(drum) : -1;
        const cells = (drum?.slots ?? new Array(assembly.stage.drum.slots).fill(null)).map((card, slot) => {
          if (dormant) return '·';
          const waiting = drum?.waiting === slot;
          if (!card) return slot === nextOpen ? '[ ]' : '·';
          const short = COMMANDS[card.command].drumShort ?? COMMANDS[card.command].short;
          if (card.status === 'jammed') return `${short}✗`;
          if (card.status === 'done') return `${short}✓`;
          // The live slot is marked while it asks for a hand, so the face names
          // which card the player is being asked for before it chars.
          if (waiting) return `${short}‹`;
          return slot === nextOpen ? `[${short}]` : short;
        });
        const schedule = cells.join(' ');
        assembly.queue.setText(schedule);
        assembly.drumProjection?.queue.setText(schedule);
        const pointer = dormant
          ? 0
          : drum?.waiting >= 0
            ? drum.waiting
            : drum?.running
              ? Math.max(drum.activeSlot, 0)
              : Math.max(nextOpen, 0);
        assembly.tick.setX(
          assembly.stage.rackX - TIMETABLE_FACE.leftInset
            + Math.min(pointer, cells.length - 1) * TIMETABLE_FACE.drumTickStep,
        );
        assembly.drumProjection?.pointer.setX(
          assembly.drumProjection.x - 72
            + Math.min(pointer, cells.length - 1) * 72,
        );
      } else if (rackActive) {
        const slots = assembly.stage.solution.map((_, slot) => {
          const command = dormant ? null : completed ? assembly.stage.solution[slot] : puzzle.queue[slot];
          return command ? COMMANDS[command].short : `${slot + 1}`;
        });
        assembly.queue.setText(slots.join('  ›  '));
        const punched = dormant ? 0 : completed ? slots.length : puzzle.queue.length;
        assembly.tick.setX(
          assembly.stage.rackX - TIMETABLE_FACE.leftInset
            + Math.min(punched, slots.length) * TIMETABLE_FACE.queueTickStep,
        );
      }
      if (completed) this.setCompletedMachinery(assembly);
    });

    scene.interactables
      .filter((it) => this.isTimetableKind(it.def.kind))
      .forEach((it) => {
        if (['contact-interlock', 'first-weight', 'two-true-things', 'train-remembers'].includes(it.def.kind)) {
          // The interlock devices are drawn by ContactInterlockArt; the
          // IV-VI archive hardware is likewise drawn by its world art. These
          // sprites are proximity anchors only and never show.
          it.sprite.setVisible(false);
          return;
        }
        const stage = this.currentStage();
        const current =
          visible &&
          puzzle.briefed &&
          puzzle.phase !== 'approach' &&
          it.def.stage === puzzle.stageIndex &&
          !(stage.autoRun && it.def.kind === 'timetable-run');
        const completed = visible && Boolean(puzzle.stageComplete[it.def.stage]);
        const settling =
          completed &&
          puzzle.phase === 'approach' &&
          it.def.stage === puzzle.stageIndex - 1;
        const dormant = visible && (
          it.def.stage === puzzle.stageIndex + 1 ||
          (it.def.stage === puzzle.stageIndex && puzzle.phase === 'approach')
        );
        const retiredVisible = completed && !(
          this.config.stages[it.def.stage].autoRun && it.def.kind === 'timetable-run'
        );
        it.sprite
          .setVisible(current || retiredVisible || dormant)
          .setAlpha(dormant ? 0.16 : settling ? 0.72 : completed ? 0.38 : 1);
        if (dormant) {
          it.sprite.setTint(0x65757d).setScale(1);
          if (it.def.kind === 'timetable-run' || (it.def.kind === 'rail-control' && it.def.command === 'power')) {
            it.sprite.setTexture('hand-generator-off');
          } else if (it.def.kind === 'rail-control' && it.def.command === 'vent') {
            it.sprite.setTexture('circuit-relay-0');
          } else if (it.def.kind === 'rail-control') {
            it.sprite.setTexture('lever-off');
          }
          return;
        }
        if (it.def.kind === 'air-lock') {
          // No next-step highlight in Section III. Tint reports only what the
          // machine has physically done, so it confirms a press without ever
          // naming the order — the gauge and the claw carry that.
          const snap = puzzle.airCircuit?.snapshot();
          const engaged = it.def.command === 'isolate' ? Boolean(snap?.isolateClosed)
            : it.def.command === 'bleed' ? Boolean(snap?.door?.venting)
              : false;
          it.sprite.setTint(completed || engaged ? C(CAR.LAMP_OK) : LANES[LANE_NEAR].figureTint);
          it.sprite.setScale(1);
        } else if (it.def.kind === 'timetable-command') {
          const selected = completed || puzzle.queue.includes(it.def.command);
          const direct = stage.autoRun && puzzle.queue.length === 0;
          it.sprite.setTint(completed ? 0x75d4cd : selected || direct ? 0xf2d49a : LANES[LANE_NEAR].figureTint);
          it.sprite.setScale(completed ? 1 : selected ? 1.12 : direct ? 1.08 : 1);
        } else if (it.def.kind === 'rail-control') {
          const physicalStage = this.config.stages[it.def.stage];
          const selected = completed || puzzle.queue.includes(it.def.command);
          const expected = it.def.stage !== puzzle.stageIndex
            ? false
            : physicalStage.solution[puzzle.queue.length] === it.def.command;
          it.sprite.setTint(completed || selected ? 0x75d4cd : expected ? 0xf2d49a : LANES[LANE_NEAR].figureTint);
          it.sprite.setScale(expected && !completed ? 1.08 : 1);
          if (selected) {
            if (it.def.command === 'power') it.sprite.setTexture('hand-generator-on');
            else if (it.def.command === 'vent') it.sprite.setTexture('circuit-relay-1');
            else it.sprite.setTexture('lever-on');
          }
        } else {
          if (it.def.kind === 'timetable-run') {
            it.sprite.setTexture(
              completed || puzzle.phase === 'executing'
                ? 'hand-generator-on'
                : 'hand-generator-off',
            );
          } else if (it.def.kind === 'timetable-press') {
            it.sprite.setTexture('circuit-relay-0').setTint(completed ? 0x75d4cd : 0xd9bd84).setScale(1);
          } else if (it.def.kind === 'timetable-reset') {
            it.sprite.setTexture('lever-off').setTint(completed ? 0x75d4cd : 0xe45a5f).setScale(1);
          }
        }
      });
    scene.tutorialStageSigns?.forEach((label, index) =>
      label
        .setVisible(visible && puzzle.briefed && (
          index === puzzle.stageIndex ||
          index === puzzle.stageIndex + 1 ||
          puzzle.stageComplete[index]
        ))
        .setAlpha(
          index === puzzle.stageIndex + 1
            ? 0.12
            : puzzle.stageComplete[index] && puzzle.phase === 'approach' && index === puzzle.stageIndex - 1
              ? 0.52
              : puzzle.stageComplete[index]
              ? 0.28
              : puzzle.phase === 'approach'
                ? 0.32
                : 0.62,
        ),
    );
    scene.tutorialGates?.forEach(({ gate, light, vestibuleGlow, window, latchTop, latchBottom }, index) => {
      gate?.setVisible(visible);
      light?.setVisible(visible);
      vestibuleGlow?.setVisible(visible);
      window?.setVisible(visible && !puzzle.stageComplete[index]);
      latchTop?.setVisible(visible && !puzzle.stageComplete[index]);
      latchBottom?.setVisible(visible && !puzzle.stageComplete[index]);
    });
    if (visible) {
      this.updateObjective();
    } else {
      scene.tutorialObjectiveArrow?.setVisible(false);
      scene.tutorialObjectiveLabel?.setVisible(false);
    }
  }

  setupQA() {
    if (!devRoutesEnabled() || typeof window === 'undefined') return false;
    const params = devParams();
    const qa = params.get('qa');
    // Phase I has no frozen showcase state: this is the playable first
    // junction, with its own machine active and the later cars cleared only
    // for routing purposes.
    if (qa === 'phase1') {
      this.scene.tutorialQAActive = true;
      const puzzle = this.scene.tutorialPuzzle;
      puzzle.stageIndex = 0;
      puzzle.stageComplete = this.config.stages.map(() => false);
      puzzle.briefed = true;
      puzzle.phase = 'idle';
      const stage = this.config.stages[0];
      this.scene.player.resetTo(stage.startX + 92, 400, LANE_NEAR);
      this.scene.cameras.main.setScroll(Math.max(0, stage.startX + 92 - this.scene.cameras.main.width / 2), 0);
      this.scene.refreshTutorialStageVisuals();
      this.refresh();
      return true;
    }
    // Phase II fixture route: ?qa=phase2&state=<entry|power-fail|latch-closed|
    // signal-mid|energized|complete|reset-replay>. Warps into junction-2 and
    // drives the LIVE interlock instance to the named fixture state, replays
    // the fixture's events through the art module one by one, then兜底 with a
    // steady-state applySnapshot — the same order the QA report prescribes.
    // The freeze flag keeps the driven state from advancing on later frames.
    if (qa === 'phase2') {
      this.scene.tutorialQAActive = true;
      const requested = params.get('state') ?? 'entry';
      const stateName = PHASE2_QA_STATE_NAMES.includes(requested) ? requested : 'entry';
      const puzzle = this.scene.tutorialPuzzle;
      puzzle.stageIndex = CONTACT_STAGE_INDEX;
      puzzle.stageComplete = this.config.stages.map((_, index) => index < CONTACT_STAGE_INDEX);
      puzzle.briefed = true;
      puzzle.phase = 'idle';
      puzzle.queue = [];
      puzzle.executionStep = -1;
      puzzle.activeCommand = null;
      const stage = this.config.stages[CONTACT_STAGE_INDEX];
      // Frame the device that proves each QA state. Previously every fixture
      // spawned beside the latch, so contactor failures happened off-screen
      // and the visual route could not actually validate its one-shot flash.
      const focusX = ['power-fail', 'energized', 'complete'].includes(stateName)
        ? CONTACT_INTERLOCK_LAYOUT.endX - 36
        : stateName === 'signal-mid'
          ? (CONTACT_INTERLOCK_LAYOUT.startX + CONTACT_INTERLOCK_LAYOUT.endX) / 2
          : ['relay-waiting', 'panel-open'].includes(stateName)
            ? CONTACT_INTERLOCK_LAYOUT.relayX - 40
            : stage.startX + 92;
      this.scene.player.resetTo(focusX, 400, LANE_NEAR);
      const camera = this.scene.cameras.main;
      camera.setScroll(Math.max(0, focusX - camera.width / 2), 0);
      this.scene.tutorialForceLookDown = false;
      // Fresh route start, then drive. Events first (one-shot animations),
      // snapshot second (steady-state兜底), exactly like the test fixture.
      // The cabinet resets with the room: fixture states beyond the cabinet
      // re-bridge it inside the driver through its public API.
      this.contactLock.reset();
      this.relay.reset();
      // `entry` is the user-facing playtest doorway: it must accept real
      // movement and E input. The other named routes remain frozen fixtures
      // so screenshots can hold transient/intermediate states deterministically.
      this.contactQaFreeze = shouldFreezePhase2QAState(stateName);
      const { snapshot, events } = drivePhase2State(
        stateName,
        this.contactLock,
        { propagationMs: CONTACT_SIGNAL_MS, relay: this.relay },
      );
      events.forEach((evt) => this.contactArt.handleEvent(evt));
      this.contactArt.applySnapshot(snapshot);
      this.relayArt.applySnapshot(this.relay.snapshot());
      // 'panel-open' is the close-up fixture: the driven state is the entry
      // state, then the real open path runs (door beat, camera push, frozen
      // player) so screenshots can verify the close-up in place.
      if (stateName === 'panel-open') {
        this.scene.time.delayedCall(400, () => this.openRelayCloseup());
      }
      this.scene.refreshTutorialStageVisuals();
      this.refresh();
      return true;
    }
    // Phase III fixture route: ?qa=phase3&state=<entry|stalled|isolated|
    // released|relocked>. Warps into junction-3 and drives the LIVE
    // local-air-circuit instance to the named fixture, then freezes it (except
    // 'entry', the user-facing playtest doorway, which accepts real input).
    if (qa === 'phase3') {
      this.scene.tutorialQAActive = true;
      const requested = params.get('state') ?? 'entry';
      const stateName = ['entry', 'stalled', 'isolated', 'released', 'relocked'].includes(requested)
        ? requested
        : 'entry';
      const puzzle = this.scene.tutorialPuzzle;
      puzzle.stageIndex = AIR_CIRCUIT_STAGE_INDEX;
      puzzle.stageComplete = this.config.stages.map((_, index) => index < AIR_CIRCUIT_STAGE_INDEX);
      puzzle.briefed = true;
      puzzle.phase = 'idle';
      puzzle.queue = [];
      puzzle.executionStep = -1;
      puzzle.activeCommand = null;
      const stage = this.config.stages[AIR_CIRCUIT_STAGE_INDEX];
      // Frame the device that proves each state: the stall reads on the bleed
      // wheel and gauge, the release reads at the claw.
      const focusX = ['released', 'relocked'].includes(stateName)
        ? 2200
        : stateName === 'stalled'
          ? 2050
          : stage.startX + 92;
      this.scene.player.resetTo(focusX, 400, LANE_NEAR);
      const camera = this.scene.cameras.main;
      camera.setScroll(Math.max(0, focusX - camera.width / 2), 0);
      this.scene.tutorialForceLookDown = false;
      const phase = this.ensureAirCircuitState(stage);
      phase.reset();
      phase.enter();
      const hold = (ms) => {
        for (let t = 0; t < ms; t += 50) phase.update(50, { bleedHeld: true });
      };
      const settle = (ms) => {
        for (let t = 0; t < ms; t += 50) phase.update(50, { bleedHeld: false });
      };
      if (stateName === 'stalled') hold(3200); // needle parked at the vent floor
      if (stateName === 'isolated') phase.interact('isolate');
      if (stateName === 'released') {
        phase.interact('isolate');
        hold(2000); // RELEASED: latch free, door leaf not yet moved
      }
      if (stateName === 'relocked') {
        phase.interact('isolate');
        hold(2000);
        phase.interact('isolate'); // supply restored too early
        settle(4000); // latch re-bites: back to LOCKED
      }
      // Fixtures are steady states: swallow the one-shot events so nothing
      // animates after the freeze.
      phase.drainEvents();
      this.airCircuitQaFreeze = stateName !== 'entry';
      this.refreshAirCircuitVisuals(phase.snapshot());
      this.scene.refreshTutorialStageVisuals();
      this.refresh();
      return true;
    }
    // Phase IV — THE FIRST WEIGHT. Entry is the real playable doorway; named
    // states are frozen visual fixtures for screenshot review.
    if (qa === 'phase4') {
      this.scene.tutorialQAActive = true;
      const requested = params.get('state') ?? 'entry';
      const stateName = ['entry', 'fall', 'middle', 'punched', 'refusal', 'solved', 'magic-stone'].includes(requested)
        ? requested
        : 'entry';
      const puzzle = this.scene.tutorialPuzzle;
      puzzle.stageIndex = WEIGHT_TRANSFER_STAGE_INDEX;
      puzzle.stageComplete = this.config.stages.map((_, index) => index < WEIGHT_TRANSFER_STAGE_INDEX);
      puzzle.briefed = true;
      puzzle.phase = 'idle';
      puzzle.queue = [];
      puzzle.executionStep = -1;
      puzzle.activeCommand = null;
      puzzle.firstWeight = null;
      const stage = this.config.stages[WEIGHT_TRANSFER_STAGE_INDEX];
      const phase = this.ensureFirstWeightState(stage);
      const tick = (ms, playerX) => {
        for (let elapsed = 0; elapsed < ms; elapsed += 20) phase.update(20, { playerX });
      };
      const carryTo = (x) => {
        phase.interactCase();
        phase.update(20, { playerX: x });
        phase.interactCase();
      };
      phase.enter();
      if (stateName !== 'entry') tick(stateName === 'fall' ? 260 : 700, 0.05);
      if (['middle', 'punched', 'refusal', 'solved'].includes(stateName)) {
        carryTo(0.5);
        tick(500, 0.05);
      }
      if (['punched', 'refusal', 'solved'].includes(stateName)) phase.interactCase();
      if (stateName === 'refusal') tick(180, 0.95);
      if (stateName === 'solved') {
        carryTo(0);
        tick(650, 0.95);
      }
      phase.drainEvents();
      // `punched` is also a playable checkpoint: it starts immediately before
      // the player's weight overturns the apparent middle answer. Other names
      // are frozen composition fixtures.
      this.firstWeightQaFreeze = !['entry', 'punched'].includes(stateName);
      const snap = phase.snapshot();
      const focusX = stateName === 'entry'
        ? stage.startX + 90
        : stateName === 'refusal' || stateName === 'solved'
          ? stage.firstWeight.exitZoneX
          : Phaser.Math.Linear(stage.firstWeight.detents.left, stage.firstWeight.detents.right, snap.caseX);
      this.scene.player.resetTo(focusX, 400, LANE_NEAR);
      const camera = this.scene.cameras.main;
      camera.setScroll(Math.max(0, focusX - camera.width / 2), 0);
      this.firstWeightArt?.applySnapshot(snap);
      this.scene.refreshTutorialStageVisuals();
      this.refresh();
      if (stateName === 'magic-stone') {
        const suitcase = this.scene.narrativeProps?.props?.find((prop) => prop.inspectorId === 'phase-iv');
        if (suitcase) {
          suitcase.state.envelopeReadComplete = true;
          this.scene.time.delayedCall(180, () => this.scene.narrativeProps?.openInspectionModal(suitcase));
        }
      }
      return true;
    }
    // Phase V/VI world-space narrative fixtures. Entry remains a real
    // playable route; other names freeze the live pure state for visual QA.
    if (['phase5', 'phase6'].includes(qa)) {
      this.scene.tutorialQAActive = true;
      const phaseNumber = Number(qa.at(-1));
      const stageIndex = phaseNumber - 1;
      const puzzle = this.scene.tutorialPuzzle;
      puzzle.stageIndex = stageIndex;
      puzzle.stageComplete = this.config.stages.map((_, index) => index < stageIndex);
      puzzle.briefed = true;
      puzzle.phase = 'idle';
      puzzle.queue = [];
      puzzle.executionStep = -1;
      puzzle.activeCommand = null;
      const stage = this.config.stages[stageIndex];
      const requested = params.get('state') ?? 'entry';
      let focusX = stage.startX + 90;
      if (phaseNumber === 5) {
        puzzle.twoTrueThings = null;
        const phase = this.ensureTwoTrueThingsState(stage);
        const allowed = ['entry', 'hanging', 'fallen', 'city-witnessed', 'witnessed', 'amber', 'cyan', 'supported', 'solved'];
        const stateName = allowed.includes(requested) ? requested : 'entry';
        const run = (ms, x = 0.1) => {
          for (let elapsed = 0; elapsed < ms; elapsed += 20) phase.update(20, { playerX: x });
        };
        phase.enter();
        // 'hanging' freezes on the first read: both cases still on the hoist
        // rail above one empty cradle, before the fall beat starts.
        if (!['entry', 'hanging'].includes(stateName)) run(700);
        if (stateName === 'city-witnessed') phase.interact('case-a');
        if (['witnessed', 'amber', 'cyan', 'supported', 'solved'].includes(stateName)) {
          phase.interact('case-a'); phase.interact('case-b');
        }
        if (['amber', 'supported', 'solved'].includes(stateName)) phase.interact('amber');
        if (['cyan', 'supported', 'solved'].includes(stateName)) phase.interact('cyan');
        if (stateName === 'solved') {
          if (!phase.snapshot().amberConnected) phase.interact('amber');
          if (!phase.snapshot().cyanConnected) phase.interact('cyan');
          phase.interact('case-b'); run(20, 0.82); phase.interact('case-b'); run(650, 0.82);
        }
        phase.drainEvents();
        this.twoTrueThingsQaFreeze = stateName !== 'entry';
        const snap = phase.snapshot();
        focusX = stateName === 'entry' ? stage.startX + 90
          : stateName === 'solved' ? stage.twoTrueThings.secondCradleX
            : stage.twoTrueThings.mainCradleX;
        this.twoTrueThingsArt?.applySnapshot(snap);
      } else {
        puzzle.trainRemembers = null;
        const phase = this.ensureTrainRemembersState(stage);
        const allowed = ['entry', 'pose1', 'pose2', 'redaction', 'catch', 'caught', 'solved'];
        const stateName = allowed.includes(requested) ? requested : 'entry';
        const run = (ms, x = 0.5) => {
          for (let elapsed = 0; elapsed < ms; elapsed += 20) phase.update(20, { playerX: x });
        };
        const placePresent = (x) => {
          phase.interact('present-case'); run(20, x); phase.interact('present-case');
        };
        phase.enter();
        if (stateName !== 'entry') run(1600, 0.5);
        if (['pose1', 'pose2', 'redaction', 'catch', 'caught', 'solved'].includes(stateName)) {
          placePresent(0.12); run(700, 0.12);
        }
        if (['pose2', 'redaction', 'catch', 'caught', 'solved'].includes(stateName)) {
          run(950, 0.12); placePresent(0.88); run(700, 0.88);
        }
        // Hold the redaction fixture on the actual fracture/fall beat instead
        // of freezing on its nearly invisible first frame.
        if (stateName === 'redaction') run(460, 0.88);
        if (['catch', 'caught', 'solved'].includes(stateName)) run(950, 0.05);
        // 'caught' freezes on the carried beat: the record is in the player's
        // hands and the train's counter-movement has only just begun.
        if (stateName === 'caught') { phase.interact('catch'); run(260, 0.05); }
        if (stateName === 'solved') { phase.interact('catch'); run(1100, 0.05); }
        phase.drainEvents();
        this.trainRemembersQaFreeze = stateName !== 'entry';
        const snap = phase.snapshot();
        focusX = ['pose1', 'pose2'].includes(stateName)
          ? stage.trainRemembers.pivotX
          : ['redaction', 'catch', 'caught', 'solved'].includes(stateName)
            ? stage.trainRemembers.catchX
            : Phaser.Math.Linear(stage.trainRemembers.rail.left, stage.trainRemembers.rail.right, snap.presentX);
        this.trainRemembersArt?.applySnapshot(snap);
      }
      this.scene.player.resetTo(focusX, 400, LANE_NEAR);
      const camera = this.scene.cameras.main;
      camera.setScroll(Math.max(0, focusX - camera.width / 2), 0);
      this.scene.tutorialForceLookDown = false;
      this.scene.refreshTutorialStageVisuals();
      this.refresh();
      return true;
    }
    // Phase IV fixture route: ?qa=phase4&state=<entry|spinning|charged|
    // biting>. Warps into junction-4 and drives the LIVE weight-transfer
    // instance to the named fixture, then freezes it (except 'entry', the
    // user-facing playtest doorway, which accepts real input).
    if (qa === 'phase4') {
      this.scene.tutorialQAActive = true;
      const requested = params.get('state') ?? 'entry';
      const stateName = ['entry', 'spinning', 'charged', 'biting'].includes(requested)
        ? requested
        : 'entry';
      const puzzle = this.scene.tutorialPuzzle;
      puzzle.stageIndex = WEIGHT_TRANSFER_STAGE_INDEX;
      puzzle.stageComplete = this.config.stages.map((_, index) => index < WEIGHT_TRANSFER_STAGE_INDEX);
      puzzle.briefed = true;
      puzzle.phase = 'idle';
      puzzle.queue = [];
      puzzle.executionStep = -1;
      puzzle.activeCommand = null;
      const stage = this.config.stages[WEIGHT_TRANSFER_STAGE_INDEX];
      // Frame the device that proves each state: the spin reads at the TEST
      // stand and the drive wheel, the charge at the bags and the valve.
      const focusX = stateName === 'spinning' || stateName === 'biting'
        ? 2900
        : stateName === 'charged'
          ? 2660
          : stage.startX + 92;
      this.scene.player.resetTo(focusX, 400, LANE_NEAR);
      const camera = this.scene.cameras.main;
      camera.setScroll(Math.max(0, focusX - camera.width / 2), 0);
      this.scene.tutorialForceLookDown = false;
      const phase = this.ensureWeightTransferState(stage);
      phase.reset();
      phase.enter();
      const runFor = (ms, trolleyDir = 0) => {
        for (let t = 0; t < ms; t += 50) {
          if (trolleyDir) phase.moveTrolley(trolleyDir, 50);
          phase.update(50);
        }
      };
      if (stateName === 'spinning') {
        // Motor TESTed with the bags flat and the trolley parked: free-rev.
        phase.interact('test');
        runFor(2200);
      }
      if (stateName === 'charged') {
        // Repair done, counterweight still at the maintenance end.
        phase.interact('level-drain');
        phase.interact('level-supply');
        runFor(8000);
      }
      if (stateName === 'biting') {
        phase.interact('level-drain');
        phase.interact('level-supply');
        runFor(8000);
        phase.setTrolleyGrabbed(true);
        runFor(6000, 1);
        phase.setTrolleyGrabbed(false);
        phase.interact('test');
        runFor(1400); // bite + a visible crawl, well short of completion
      }
      // Fixtures are steady states: swallow the one-shot events so nothing
      // animates after the freeze.
      phase.drainEvents();
      this.weightTransferQaFreeze = stateName !== 'entry';
      this.refreshWeightTransferVisuals(phase.snapshot());
      this.scene.refreshTutorialStageVisuals();
      this.refresh();
      return true;
    }
    // Phase V fixture route: ?qa=phase5&state=<entry|contradiction|safe|
    // repaired>. Warps into junction-5 and drives the LIVE bogie-diagnosis
    // instance to the named fixture, then freezes it (except 'entry', the
    // user-facing playtest doorway, which accepts real input).
    if (qa === 'phase5') {
      this.scene.tutorialQAActive = true;
      const requested = params.get('state') ?? 'entry';
      const stateName = ['entry', 'contradiction', 'safe', 'repaired'].includes(requested)
        ? requested
        : 'entry';
      const puzzle = this.scene.tutorialPuzzle;
      puzzle.stageIndex = BOGIE_SERVICE_STAGE_INDEX;
      puzzle.stageComplete = this.config.stages.map((_, index) => index < BOGIE_SERVICE_STAGE_INDEX);
      puzzle.briefed = true;
      puzzle.phase = 'idle';
      puzzle.queue = [];
      puzzle.executionStep = -1;
      puzzle.activeCommand = null;
      const stage = this.config.stages[BOGIE_SERVICE_STAGE_INDEX];
      // Frame the device that proves each state: the contradiction reads at
      // the TEST stand and both wheelsets, the safe chain at the rear bogie.
      const focusX = stateName === 'contradiction'
        ? 3500
        : stateName === 'entry'
          ? stage.startX + 92
          : 3760;
      this.scene.player.resetTo(focusX, 400, LANE_NEAR);
      const camera = this.scene.cameras.main;
      camera.setScroll(Math.max(0, focusX - camera.width / 2), 0);
      this.scene.tutorialForceLookDown = stageHasUnderfloorView(stage);
      const phase = this.ensureBogieDiagnosisState(stage);
      phase.reset();
      phase.enter();
      const LOAD = { trolleyX: 1, suspensionHealth: 1 };
      const runFor = (ms) => {
        for (let t = 0; t < ms; t += 50) phase.update(50, LOAD);
      };
      if (stateName === 'contradiction') {
        // One TEST, one answer split in two: front turns, rear stays dark.
        phase.interact('test');
        runFor(1800);
      }
      if (stateName === 'safe' || stateName === 'repaired') {
        // A service fixture performs the same calibrated A/B comparison as a
        // player: test A, return OFF, select B, repeat, then confirm B's zero
        // piston travel. It may not manufacture an already-known fault.
        phase.interact('test');
        runFor(200);
        phase.interact('test');
        phase.interact('select-rear');
        phase.interact('test');
        runFor(200);
        phase.interact('inspect-actuator');
        phase.interact('test');
      }
      if (stateName === 'safe') {
        // Mid-chain: isolated, bled flat, pin seated — the safe-work state.
        phase.interact('brake-isolate');
        phase.setVentHeld(true);
        runFor(2400);
        phase.setVentHeld(false);
        phase.interact('service-lock');
        runFor(100);
      }
      if (stateName === 'repaired') {
        // Piston freed and line restored; TEST has not been pressed again.
        phase.interact('brake-isolate');
        phase.setVentHeld(true);
        runFor(2400);
        phase.setVentHeld(false);
        phase.interact('service-lock');
        phase.interact('repair');
        phase.interact('service-lock');
        phase.interact('brake-isolate');
        runFor(5000);
      }
      // Fixtures are steady states: swallow the one-shot events so nothing
      // animates after the freeze.
      phase.drainEvents();
      this.bogieQaFreeze = stateName !== 'entry';
      this.refreshBogieVisuals(phase.snapshot());
      this.scene.refreshTutorialStageVisuals();
      this.refresh();
      return true;
    }
    // Phase VI fixture route: ?qa=phase6&state=<entry|window|biting|departing>.
    // Warps into junction-6 and drives the LIVE echo-replay instance to the
    // named fixture, then freezes it (except 'entry', the user-facing
    // playtest doorway, which accepts real input). No IV trace exists under a
    // warp, so the replay runs the canonical fallback — exactly the degrade
    // path lock §2.4 mandates.
    if (qa === 'phase6') {
      this.scene.tutorialQAActive = true;
      const requested = params.get('state') ?? 'entry';
      const stateName = ['entry', 'window', 'biting', 'departing'].includes(requested)
        ? requested
        : 'entry';
      const puzzle = this.scene.tutorialPuzzle;
      puzzle.stageIndex = ECHO_LOAD_STAGE_INDEX;
      puzzle.stageComplete = this.config.stages.map((_, index) => index < ECHO_LOAD_STAGE_INDEX);
      puzzle.briefed = true;
      puzzle.phase = 'idle';
      puzzle.queue = [];
      puzzle.executionStep = -1;
      puzzle.activeCommand = null;
      const stage = this.config.stages[ECHO_LOAD_STAGE_INDEX];
      const focusX = stateName === 'entry' ? stage.startX + 92 : stage.echoLoad.machines.test.x;
      this.scene.player.resetTo(focusX, 400, LANE_NEAR);
      const camera = this.scene.cameras.main;
      camera.setScroll(Math.max(0, focusX - camera.width / 2), 0);
      this.scene.tutorialForceLookDown = stageHasUnderfloorView(stage);
      const phase = this.ensureEchoReplayState(stage);
      phase.reset();
      phase.enter();
      const INPUTS = {
        interlockComplete: true,
        airPathOpen: true,
        bogiesSynced: true,
        suspensionHealth: 1,
      };
      const runFor = (ms) => {
        for (let t = 0; t < ms; t += 50) phase.update(50, INPUTS);
      };
      if (stateName !== 'entry') {
        // Fixtures skip the observation loop and land mid-rhythm.
        runFor(6000 + 2950); // loop 1, inside the arming window
        phase.interact('route'); // send the captured load to repaired drive B
      }
      if (stateName === 'biting' || stateName === 'departing') {
        phase.interact('test');
        runFor(stateName === 'biting' ? 500 : 1400);
      }
      // Fixtures are steady states: swallow the one-shot events so nothing
      // animates after the freeze.
      phase.drainEvents();
      this.echoQaFreeze = stateName !== 'entry';
      this.refreshEchoVisuals(phase.snapshot());
      this.scene.refreshTutorialStageVisuals();
      this.refresh();
      return true;
    }
    if (
      !qa?.startsWith('timetable-') &&
      !['tutorial-exit', 'chapter-card', 'departure-moving'].includes(qa)
    ) return false;
    this.scene.tutorialQAActive = true;
    if (qa === 'departure-moving') {
      this.scene.time.delayedCall(280, () => {
        this.scene.prologueTransitionActive = true;
        this.scene.departureScroll = 680;
        this.scene.player.frozen = true;
        this.scene.departureStreaks.forEach((streak) => streak.setVisible(true).setAlpha(0.72));
      });
      return true;
    }
    if (qa === 'chapter-card') {
      this.scene.time.delayedCall(240, () => {
        this.scene.game.events.emit('hud:prologue-transition', {
          kicker: 'CHAPTER ONE',
          title: 'THE SAFETY TEST',
          subtitle: 'The train begins moving backward through its own explanations.',
          qa: true,
        });
      });
      return true;
    }
    const requested = Number(qa.match(/^timetable-(\d+)/)?.[1]);
    const stageIndex = qa === 'tutorial-exit'
      ? this.config.stages.length - 1
      : Phaser.Math.Clamp((Number.isFinite(requested) ? requested : 1) - 1, 0, this.config.stages.length - 1);
    const puzzle = this.scene.tutorialPuzzle;
    puzzle.stageIndex = stageIndex;
    puzzle.stageComplete = this.config.stages.map((_, index) => index < stageIndex);
    puzzle.briefed = true;
    puzzle.echoRecorded = stageIndex >= 4;
    puzzle.phase = 'idle';
    puzzle.queue = [];
    const stage = this.currentStage();
    // Jumping straight to a stage must not inherit another stage's analogue
    // state, or the gauge and the gate index start out lying.
    puzzle.pressure = stage.pressureHold?.start ?? 100;
    puzzle.pressureVenting = false;
    puzzle.pressureBraked = false;
    puzzle.pressureSettled = false;
    puzzle.pressureHintLast = undefined;
    puzzle.echoGateIndex = 0;
    puzzle.echoGatesCleared = [];
    puzzle.echoAtValve = false;
    // Same reason: a warp must not inherit a drum mid-revolution, and must not
    // inherit machine flags that would let stage III open with the brake
    // already set.
    this.cancelDrum();
    puzzle.drum = null;
    puzzle.drumMachine = null;
    this.scene.player.resetTo(stage.startX + 92, 400, LANE_NEAR);
    if (qa === 'timetable-3-layout') {
      this.scene.player.body.reset(2110, 400);
    }
    if (qa === 'timetable-6-cab') {
      this.scene.player.resetTo(stage.endX - 132, 400, LANE_NEAR);
    }
    this.scene.tutorialForceLookDown = stageHasUnderfloorView(stage);
    this.scene.refreshTutorialStageVisuals();
    this.refresh();
    const triggerForQA = (command) => {
      const target = this.scene.interactables.find(
        (it) => it.def.stage === stageIndex && it.def.command === command,
      );
      if (!target) return;
      if (target.def.kind === 'rail-control') this.operateRailControl(target);
      else this.punch(command, target.sprite);
    };
    if (qa === 'timetable-1-auto' || qa === 'timetable-1-enter') {
      this.scene.player.body.reset(stage.commandX - 20, 400);
      this.scene.time.delayedCall(260, () => triggerForQA('door'));
    }
    if (qa === 'timetable-1-enter') {
      this.scene.time.delayedCall(3200, () => {
        const nextStage = this.config.stages[1];
        this.scene.player.body.reset(nextStage.startX + 96, 400);
      });
    }
    if (qa === 'timetable-3-fail') {
      this.scene.player.body.reset(stage.commandX - 20, 400);
      this.scene.time.delayedCall(260, () => triggerForQA('door'));
      this.scene.time.delayedCall(520, () => triggerForQA('vent'));
      this.scene.time.delayedCall(780, () => triggerForQA('brake'));
      this.scene.time.delayedCall(1060, () => {
        const run = this.scene.interactables.find(
          (it) => it.def.stage === stageIndex && it.def.kind === 'timetable-run',
        );
        if (run) this.run(run.sprite);
      });
    }
    if (qa === 'timetable-3-auto') {
      stage.solution.forEach((command, index) => {
        this.scene.time.delayedCall(260 + index * 260, () => triggerForQA(command));
      });
      this.scene.time.delayedCall(1120, () => {
        const run = this.scene.interactables.find(
          (it) => it.def.stage === stageIndex && it.def.kind === 'timetable-run',
        );
        if (run) this.run(run.sprite);
      });
    }
    if (qa === 'timetable-3-reset') {
      const slot = this.scene.interactables.find(
        (it) => it.def.stage === stageIndex && it.def.kind === 'timetable-press',
      );
      const run = this.scene.interactables.find(
        (it) => it.def.stage === stageIndex && it.def.kind === 'timetable-run',
      );
      const reset = this.scene.interactables.find(
        (it) => it.def.stage === stageIndex && it.def.kind === 'timetable-reset',
      );
      this.scene.time.delayedCall(1500, () => triggerForQA('brake'));
      this.scene.time.delayedCall(2100, () => triggerForQA('vent'));
      this.scene.time.delayedCall(2500, () => {
        if (run) this.run(run.sprite);
      });
      // Reset while the pointer is already moving. This exercises the harder
      // branch: cancel the real-clock scheduler, clear cards, and restore the
      // mechanical pose without resetting the room or the player.
      this.scene.time.delayedCall(4300, () => this.resetDrum(reset?.sprite));
      this.scene.time.delayedCall(4550, () => {
        if (reset) this.scene.player.body.reset(reset.sprite.x, 400);
      });
    }
    if (qa === 'timetable-3-duplicate') {
      const run = this.scene.interactables.find(
        (it) => it.def.stage === stageIndex && it.def.kind === 'timetable-run',
      );
      this.scene.time.delayedCall(900, () => triggerForQA('brake'));
      // Two BRAKE cards is now a legal strip, not a refused input. This route
      // exists to prove the machine — not the input layer — is what reports the
      // problem: both cards fire, the door never opens, and nothing on screen
      // says which command is missing.
      this.scene.time.delayedCall(1250, () => triggerForQA('brake'));
      this.scene.time.delayedCall(1650, () => {
        if (run) this.run(run.sprite);
      });
    }
    if (qa === 'timetable-3-sparse') {
      // Three punches land in slots 1-2-3 by themselves now. There is no cursor
      // to advance: the strip fills in the order the player strikes it.
      this.scene.time.delayedCall(700, () => triggerForQA('brake'));
      this.scene.time.delayedCall(1200, () => triggerForQA('vent'));
      this.scene.time.delayedCall(1700, () => triggerForQA('door'));
    }
    return true;
  }

  destroy() {
    if (this.mechanicalPanelMode) this.closeMechanicalPanel();
    // Relay close-up teardown first: every listener registered in
    // _setupRelayInput comes off, the blur hook is removed, and no path may
    // leave the scene flagged mid-close-up (a HUD hidden by an open close-up
    // would otherwise stay hidden across the scene restart, and a frozen
    // flag would eat the next run's E input).
    if (this._relayHandlers) {
      const input = this.scene.input;
      input.off('pointerdown', this._relayHandlers.down);
      input.off('pointermove', this._relayHandlers.move);
      input.off('pointerup', this._relayHandlers.up);
      input.off('gameout', this._relayHandlers.out);
      this._relayHandlers = null;
    }
    if (this._relayBlurHandler && typeof window !== 'undefined') {
      window.removeEventListener('blur', this._relayBlurHandler);
      this._relayBlurHandler = null;
    }
    if (this.relayCloseupState !== 'closed') {
      this.relayCloseupState = 'closed';
      this.scene.relayCloseupActive = false;
      this.scene.scene.setVisible(true, 'Hud');
      this._setRelayCursor(false);
    }
    this.relayArt?.destroy();
    this.relayArt = null;
    this.relay?.destroy();
    this.relay = null;
    this.contactArt?.destroy();
    this.contactArt = null;
    this.contactLock?.destroy();
    this.contactLock = null;
    this.firstWeightArt?.destroy();
    this.firstWeightArt = null;
    this.twoTrueThingsArt?.destroy();
    this.twoTrueThingsArt = null;
    this.trainRemembersArt?.destroy();
    this.trainRemembersArt = null;
    // The air-circuit instance lives on the puzzle state object.
    this.scene.tutorialPuzzle?.airCircuit?.destroy();
    if (this.scene.tutorialPuzzle) {
      this.scene.tutorialPuzzle.airCircuit = null;
      this.scene.tutorialPuzzle.airNetwork = null;
      this.scene.tutorialPuzzle.firstWeight = null;
      this.scene.tutorialPuzzle.twoTrueThings = null;
      this.scene.tutorialPuzzle.trainRemembers = null;
    }
    this.objects.forEach((object) => object?.destroy?.());
    this.objects.length = 0;
  }
}
