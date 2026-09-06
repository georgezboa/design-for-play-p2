import Phaser from 'phaser';
import { C, CAR } from './art/colors.js';
import { GAME_W, GAME_H, LANE_NEAR } from './constants.js';
import {
  BUTCH_NARRATIVE,
  getNarrativeScript,
  getNarrativeUnlockState,
  suitcaseHasUnreadEvidence,
} from './tutorial/prologueNarrativeDialogue.js';
import { collectMagicStone, magicStoneSnapshot } from './shell/magicStones.js';

// Optional narrative props for Prologue Phases I–VI.
// Phases I, II, III, VI are standalone props with simple graphics.
// Phases IV, V are suitcase inspectors: invisible world hit-regions that open
// a point-and-click modal.  They never duplicate the existing puzzle cases.
//
// Visual grammar: 3–6 large geometric shapes per object, thick outline,
// broad flat color fields, generous negative space.  Palette from the
// retro-transit theme.

const PAL = Object.freeze({
  ivory: C(CAR.BRASS_HI),
  orange: C(CAR.SAFETY_ORANGE),
  charcoal: C(CAR.ENAMEL_DARK),
  silver: C(CAR.STEEL_MID),
  brass: C(CAR.BRASS_MID),
  cyan: C(CAR.LAMP_OK),
  void: C(CAR.VOID),
  steelDark: C(CAR.STEEL_DARK),
  steelHi: C(CAR.STEEL_HI),
  tungsten: C(CAR.TUNGSTEN),
});

// ------------------------------------------------------------------ drawing

function drawLatch(g, x, y, color, open = false) {
  const ly = open ? y - 10 : y;
  g.fillStyle(color, 1);
  g.fillRoundedRect(x - 6, ly - 4, 12, 10, 2);
  g.lineStyle(2, PAL.charcoal, 0.9);
  g.strokeRoundedRect(x - 6, ly - 4, 12, 10, 2);
}

/** Phase I — Lost-property drawer. */
function drawLostPropertyDrawer(scene, prop) {
  const g = prop.graphics;
  const { x, y, open, revealProgress } = prop.state;
  g.clear();

  const bodyW = 72;
  const bodyH = 52;
  const lidOffset = open ? -24 * revealProgress : 0;

  g.fillStyle(PAL.ivory, 1);
  g.fillRoundedRect(x - bodyW / 2, y - bodyH, bodyW, bodyH, 4);
  g.lineStyle(3, PAL.charcoal, 0.9);
  g.strokeRoundedRect(x - bodyW / 2, y - bodyH, bodyW, bodyH, 4);

  g.fillStyle(PAL.orange, 0.9);
  g.fillRect(x - bodyW / 2 + 4, y - 22, bodyW - 8, 10);

  g.fillStyle(PAL.ivory, 1);
  g.fillRoundedRect(x - bodyW / 2 + 2, y - bodyH + lidOffset, bodyW - 4, bodyH - 4, 3);
  g.lineStyle(2, PAL.silver, 0.8);
  g.strokeRoundedRect(x - bodyW / 2 + 2, y - bodyH + lidOffset, bodyW - 4, bodyH - 4, 3);

  drawLatch(g, x, y - bodyH / 2 + lidOffset, PAL.brass, open);

  if (revealProgress > 0.1) {
    const ticketY = y - bodyH + 18 + (1 - revealProgress) * 20;
    g.fillStyle(PAL.tungsten, 0.95);
    g.fillRoundedRect(x - 14, ticketY - 20, 28, 36, 2);
    g.lineStyle(2, PAL.brass, 0.9);
    g.strokeRoundedRect(x - 14, ticketY - 20, 28, 36, 2);
    g.fillStyle(PAL.void, 1);
    g.fillCircle(x - 4, ticketY - 8, 3);
    g.fillCircle(x + 5, ticketY - 2, 3);
    g.fillCircle(x - 2, ticketY + 6, 3);
    g.fillStyle(PAL.orange, 1);
    g.fillCircle(x + 8, ticketY + 10, 3);
  }
}

/** Phase II — Service envelope. */
function drawServiceEnvelope(scene, prop) {
  const g = prop.graphics;
  const { x, y, open, revealProgress } = prop.state;
  g.clear();

  const bodyW = 64;
  const bodyH = 56;
  const flapOffset = open ? -20 * revealProgress : 0;

  g.fillStyle(PAL.ivory, 1);
  g.fillRoundedRect(x - bodyW / 2, y - bodyH, bodyW, bodyH, 3);
  g.lineStyle(3, PAL.charcoal, 0.9);
  g.strokeRoundedRect(x - bodyW / 2, y - bodyH, bodyW, bodyH, 3);

  g.fillStyle(PAL.orange, 0.9);
  g.fillRect(x - bodyW / 2 + 3, y - 18, bodyW - 6, 10);

  const flapY = y - bodyH + flapOffset;
  g.fillStyle(PAL.ivory, 1);
  g.beginPath();
  g.moveTo(x - bodyW / 2 + 2, flapY);
  g.lineTo(x, flapY - 14);
  g.lineTo(x + bodyW / 2 - 2, flapY);
  g.closePath();
  g.fillPath();
  g.lineStyle(2, PAL.silver, 0.8);
  g.strokePath();

  g.fillStyle(PAL.brass, 1);
  g.fillRoundedRect(x - 5, flapY - 2, 10, 8, 2);

  if (revealProgress > 0.1) {
    const cardY = y - bodyH + 10 + (1 - revealProgress) * 16;
    g.fillStyle(PAL.cyan, 0.9);
    g.fillRoundedRect(x - 18, cardY - 16, 22, 30, 2);
    g.lineStyle(2, PAL.steelHi, 0.8);
    g.strokeRoundedRect(x - 18, cardY - 16, 22, 30, 2);
    g.fillStyle(PAL.void, 1);
    g.fillCircle(x - 7, cardY - 6, 3);

    g.fillStyle(PAL.orange, 0.9);
    g.fillRoundedRect(x + 2, cardY - 12, 20, 26, 2);
    g.lineStyle(2, PAL.steelHi, 0.8);
    g.strokeRoundedRect(x + 2, cardY - 12, 20, 26, 2);
    g.fillStyle(PAL.void, 1);
    g.beginPath();
    g.moveTo(x + 8, cardY - 4);
    g.lineTo(x + 14, cardY + 4);
    g.lineTo(x + 2, cardY + 4);
    g.closePath();
    g.fillPath();
  }
}

/** Phase III — Emergency document tube. */
function drawDocumentTube(scene, prop) {
  const g = prop.graphics;
  const { x, y, open, revealProgress } = prop.state;
  g.clear();

  const bodyW = 36;
  const bodyH = 70;
  const capOffset = open ? -18 * revealProgress : 0;

  g.fillStyle(PAL.ivory, 1);
  g.fillRoundedRect(x - bodyW / 2, y - bodyH, bodyW, bodyH, 6);
  g.lineStyle(3, PAL.charcoal, 0.9);
  g.strokeRoundedRect(x - bodyW / 2, y - bodyH, bodyW, bodyH, 6);

  g.fillStyle(PAL.orange, 0.9);
  g.fillRect(x - bodyW / 2 + 3, y - 26, bodyW - 6, 10);

  const capY = y - bodyH + capOffset;
  g.fillStyle(PAL.silver, 1);
  g.fillRoundedRect(x - bodyW / 2 - 2, capY - 8, bodyW + 4, 10, 3);
  g.lineStyle(2, PAL.steelHi, 0.9);
  g.strokeRoundedRect(x - bodyW / 2 - 2, capY - 8, bodyW + 4, 10, 3);
  g.lineStyle(2, PAL.brass, 0.7);
  g.beginPath();
  g.moveTo(x - 10, capY - 4);
  g.lineTo(x + 10, capY - 4);
  g.strokePath();

  if (revealProgress > 0.1) {
    const scrollY = y - bodyH + 18 + (1 - revealProgress) * 14;
    g.fillStyle(PAL.tungsten, 0.95);
    g.fillRoundedRect(x - 10, scrollY - 18, 20, 34, 2);
    g.lineStyle(2, PAL.brass, 0.8);
    g.strokeRoundedRect(x - 10, scrollY - 18, 20, 34, 2);
    g.fillStyle(PAL.cyan, 1);
    g.beginPath();
    g.moveTo(x - 4, scrollY - 10);
    g.lineTo(x + 4, scrollY - 10);
    g.lineTo(x, scrollY - 16);
    g.closePath();
    g.fillPath();
    g.fillStyle(PAL.orange, 1);
    g.beginPath();
    g.moveTo(x - 4, scrollY + 8);
    g.lineTo(x + 4, scrollY + 8);
    g.lineTo(x, scrollY + 14);
    g.closePath();
    g.fillPath();
  }
}

/** Phase VI — Retention slot. */
function drawRetentionSlot(scene, prop) {
  const g = prop.graphics;
  const { x, y, open, revealProgress } = prop.state;
  g.clear();

  const bodyW = 52;
  const bodyH = 72;
  const slotOffset = open ? 16 * revealProgress : 0;

  g.fillStyle(PAL.charcoal, 1);
  g.fillRoundedRect(x - bodyW / 2, y - bodyH, bodyW, bodyH, 4);
  g.lineStyle(3, PAL.silver, 0.9);
  g.strokeRoundedRect(x - bodyW / 2, y - bodyH, bodyW, bodyH, 4);

  g.fillStyle(PAL.orange, 0.9);
  g.fillRect(x - bodyW / 2 + 4, y - 14, bodyW - 8, 8);

  g.fillStyle(PAL.void, 1);
  g.fillRect(x - 12, y - bodyH + 10, 24, bodyH - 24);

  g.fillStyle(PAL.brass, 0.8);
  g.beginPath();
  g.moveTo(x - 4, y - bodyH + 22);
  g.lineTo(x + 4, y - bodyH + 22);
  g.lineTo(x, y - bodyH + 16);
  g.closePath();
  g.fillPath();

  if (revealProgress > 0.1) {
    const cardY = y - bodyH + 28 - slotOffset;
    g.fillStyle(PAL.tungsten, 0.95);
    g.fillRoundedRect(x - 10, cardY, 20, 38, 2);
    g.lineStyle(2, PAL.brass, 0.9);
    g.strokeRoundedRect(x - 10, cardY, 20, 38, 2);
    g.fillStyle(PAL.cyan, 1);
    g.fillCircle(x - 3, cardY + 10, 3);
    g.fillStyle(PAL.orange, 1);
    g.fillCircle(x + 4, cardY + 22, 3);
    g.fillStyle(PAL.void, 1);
    g.fillCircle(x, cardY + 30, 2);
  }
}

const PROP_DRAWERS = Object.freeze({
  'lost-property-drawer': drawLostPropertyDrawer,
  'service-envelope': drawServiceEnvelope,
  'document-tube': drawDocumentTube,
  'retention-slot': drawRetentionSlot,
});

// ------------------------------------------------------------------ modal

const MODAL_ITEMS = Object.freeze({
  'phase-iv': [
    {
      id: 'envelope',
      label: 'Envelope',
      x: -60, y: 10, w: 44, h: 32,
      draw: (g, x, y) => {
        g.fillStyle(PAL.ivory, 1);
        g.fillRoundedRect(x - 22, y - 16, 44, 32, 2);
        g.lineStyle(2, PAL.charcoal, 0.8);
        g.strokeRoundedRect(x - 22, y - 16, 44, 32, 2);
        g.fillStyle(PAL.ivory, 1);
        g.beginPath();
        g.moveTo(x - 20, y - 16); g.lineTo(x, y - 28); g.lineTo(x + 20, y - 16);
        g.closePath(); g.fillPath();
        g.lineStyle(1, PAL.silver, 0.7); g.strokePath();
        g.fillStyle(PAL.brass, 1);
        g.fillRoundedRect(x - 4, y - 14, 8, 6, 1);
      },
      caption: 'A city-postmarked letter to Mara\'s sister. The final paragraph stops halfway through a sentence.',
      scriptId: 'phase-iv-envelope',
    },
    {
      id: 'postcard-city',
      label: 'City postcard',
      x: 0, y: -10, w: 48, h: 34,
      draw: (g, x, y) => {
        g.fillStyle(PAL.tungsten, 0.95);
        g.fillRoundedRect(x - 24, y - 17, 48, 34, 2);
        g.lineStyle(2, PAL.steelHi, 0.8);
        g.strokeRoundedRect(x - 24, y - 17, 48, 34, 2);
        g.fillStyle(PAL.cyan, 0.7);
        g.fillRect(x - 18, y - 5, 8, 18);
        g.fillRect(x - 6, y - 10, 6, 23);
        g.fillRect(x + 4, y - 2, 8, 15);
      },
      caption: 'The city terminal, with Mara\'s shift time and rented room number written on the back.',
      scriptId: 'phase-iv-city-postcard',
    },
    {
      id: 'postcard-orchard',
      label: 'Orchard postcard',
      x: 0, y: 22, w: 48, h: 34,
      draw: (g, x, y) => {
        g.fillStyle(PAL.tungsten, 0.95);
        g.fillRoundedRect(x - 24, y - 17, 48, 34, 2);
        g.lineStyle(2, PAL.steelHi, 0.8);
        g.strokeRoundedRect(x - 24, y - 17, 48, 34, 2);
        g.fillStyle(PAL.orange, 0.7);
        g.beginPath();
        g.moveTo(x - 8, y + 8); g.lineTo(x + 8, y + 8); g.lineTo(x, y - 10);
        g.closePath(); g.fillPath();
        g.fillStyle(PAL.brass, 0.6);
        g.fillCircle(x + 14, y - 6, 4);
      },
      caption: 'The Bellwether orchard cooperative, with a family note written across the back.',
      scriptId: 'phase-iv-orchard-postcard',
    },
    {
      id: 'claim-tag',
      label: 'Luggage tag',
      x: 60, y: 10, w: 36, h: 26,
      draw: (g, x, y) => {
        g.fillStyle(PAL.ivory, 0.95);
        g.fillRoundedRect(x - 18, y - 13, 36, 26, 2);
        g.lineStyle(2, PAL.brass, 0.8);
        g.strokeRoundedRect(x - 18, y - 13, 36, 26, 2);
        g.fillStyle(PAL.void, 1);
        g.fillCircle(x - 8, y - 2, 3);
        g.fillStyle(PAL.orange, 1);
        g.fillCircle(x + 6, y + 4, 2);
      },
      caption: 'One claim number, two approved destination abbreviations.',
      scriptId: 'phase-iv-tag',
    },
  ],
  'phase-v-city': [
    {
      id: 'key',
      label: 'Key',
      x: -30, y: 0, w: 28, h: 36,
      draw: (g, x, y) => {
        g.fillStyle(PAL.brass, 0.9);
        g.fillRoundedRect(x - 5, y - 8, 10, 22, 2);
        g.fillStyle(PAL.tungsten, 0.95);
        g.fillCircle(x, y - 14, 7);
        g.fillStyle(PAL.void, 1);
        g.fillCircle(x, y - 14, 2);
      },
      caption: 'A key stamped 4C. A rental receipt in the lining supplies the address.',
      scriptId: 'phase-v-city-key',
    },
    {
      id: 'transit-pass',
      label: 'Transit pass',
      x: 30, y: 0, w: 28, h: 36,
      draw: (g, x, y) => {
        g.fillStyle(PAL.cyan, 0.85);
        g.fillRoundedRect(x - 10, y - 14, 20, 28, 2);
        g.lineStyle(2, PAL.steelHi, 0.8);
        g.strokeRoundedRect(x - 10, y - 14, 20, 28, 2);
        g.fillStyle(PAL.void, 1);
        g.fillCircle(x, y - 2, 3);
      },
      caption: 'A monthly pass in Mara\'s name, used on weekdays for nine weeks.',
      scriptId: 'phase-v-transit-pass',
    },
  ],
  'phase-v-country': [
    {
      id: 'thread',
      label: 'Thread spool',
      x: -30, y: 0, w: 28, h: 36,
      draw: (g, x, y) => {
        g.fillStyle(PAL.silver, 0.9);
        g.fillRect(x - 8, y - 14, 16, 28);
        g.fillStyle(PAL.cyan, 0.8);
        g.fillRect(x - 10, y - 10, 20, 4);
        g.fillRect(x - 10, y + 2, 20, 4);
      },
      caption: 'Heavy cotton thread matching repairs on the orchard coat.',
      scriptId: 'phase-v-thread',
    },
    {
      id: 'leaf',
      label: 'Pressed leaf',
      x: 30, y: 0, w: 28, h: 36,
      draw: (g, x, y) => {
        g.fillStyle(PAL.orange, 0.8);
        g.fillEllipse(x, y, 18, 28);
        g.lineStyle(1, PAL.brass, 0.7);
        g.beginPath();
        g.moveTo(x, y - 18);
        g.lineTo(x, y + 14);
        g.strokePath();
      },
      caption: 'A hawthorn leaf inside an orchard wage envelope dated the same month as the city pass.',
      scriptId: 'phase-v-leaf',
    },
  ],
});

// ------------------------------------------------------------------ class

export default class PrologueNarrativeProps {
  constructor(scene) {
    this.scene = scene;
    this.props = [];
    this.dialogueActive = false;
    this.dialogueState = null;
    this.modal = null;
  }

  build() {
    const scene = this.scene;
    const configs = [
      {
        phase: 0,
        kind: 'lost-property-drawer',
        // x=350 keeps the drawer clear of the SERVICE SET wall plaque at
        // ~245–315 and the phase-I door control at ~420.
        x: 350,
        y: 416,
        lane: LANE_NEAR,
        scriptId: 'claim-ticket',
      },
      {
        phase: 1,
        kind: 'service-envelope',
        x: 1050,
        y: 340,
        lane: LANE_NEAR,
        scriptId: 'route-cards',
      },
      {
        phase: 2,
        kind: 'document-tube',
        x: 2300,
        y: 340,
        lane: LANE_NEAR,
        scriptId: 'signed-copies',
      },
      {
        phase: 3,
        kind: 'suitcase-inspector',
        inspectorId: 'phase-iv',
        x: 2785,
        y: 340,
        lane: LANE_NEAR,
        summary: 'The papers show why Mara kept a city room without giving up her place at the orchard.',
      },
      {
        phase: 4,
        kind: 'suitcase-inspector',
        inspectorId: 'phase-v-city',
        x: 3450,
        y: 340,
        lane: LANE_NEAR,
        caseId: 'a',
        summary: 'The city case records a weekday life built around the terminal and the early shift.',
      },
      {
        phase: 4,
        kind: 'suitcase-inspector',
        inspectorId: 'phase-v-country',
        x: 3640,
        y: 340,
        lane: LANE_NEAR,
        caseId: 'b',
        summary: 'The orchard case records work, family, and weekends in Bellwether during the same months.',
      },
      {
        phase: 5,
        kind: 'retention-slot',
        x: 4550,
        y: 320,
        lane: LANE_NEAR,
        scriptId: 'retention-record',
      },
    ];

    configs.forEach((cfg) => {
      const graphics = scene.add.graphics().setDepth(58);
      const glow = scene.add.graphics().setDepth(60).setBlendMode(Phaser.BlendModes.ADD);

      const prop = {
        ...cfg,
        graphics,
        glow,
        state: { x: cfg.x, y: cfg.y, open: false, revealProgress: 0, read: false },
      };
      this.props.push(prop);
    });

    // Deterministic visual proof for the authored hiding place. Normal play
    // can only set envelopeReadComplete by reaching the end of the envelope
    // conversation; this development-only route merely frames that same state.
    const params = new URLSearchParams(window.location.search);
    if (import.meta.env.DEV && params.get('qa') === 'phase4' && params.get('state') === 'magic-stone') {
      const suitcase = this.props.find((prop) => prop.inspectorId === 'phase-iv');
      suitcase.state.envelopeReadComplete = true;
      scene.time.delayedCall(500, () => {
        if (!this.modal) this.openInspectionModal(suitcase);
      });
    }
  }

  update() {
    const puzzle = this.scene.tutorialPuzzle;
    const unlock = getNarrativeUnlockState(puzzle);
    this.syncSuitcaseInspectorPositions();

    this.props.forEach((prop) => {
      const locked = !unlock[prop.phase];

      if (prop.kind === 'suitcase-inspector') {
        // Invisible hit-region: no world graphics, no glow.
        prop.graphics.clear();
        prop.glow.clear();
        return;
      }

      const target = prop.state.open ? 1 : 0;
      if (Math.abs(prop.state.revealProgress - target) > 0.001) {
        prop.state.revealProgress += (target - prop.state.revealProgress) * 0.12;
      }

      const drawer = PROP_DRAWERS[prop.kind];
      if (drawer) drawer(this.scene, prop);

      if (prop.phase === 0 && locked && !prop.state.open) {
        const t = this.scene.time.now;
        prop.glow.clear();
        prop.glow.fillStyle(PAL.brass, 0.08 + Math.sin(t * 0.002) * 0.04);
        prop.glow.fillCircle(prop.x, prop.y - 26, 28);
      } else {
        prop.glow.clear();
      }
    });
  }

  syncSuitcaseInspectorPositions() {
    const puzzle = this.scene.tutorialPuzzle;
    const stages = this.scene.timetablePuzzle?.config?.stages ?? [];

    const phaseFour = this.props.find((prop) => prop.inspectorId === 'phase-iv');
    const firstWeight = puzzle?.firstWeight?.snapshot?.();
    const firstLayout = stages[3]?.firstWeight;
    if (phaseFour && firstWeight && firstLayout) {
      phaseFour.x = Phaser.Math.Linear(
        firstLayout.detents.left,
        firstLayout.detents.right,
        firstWeight.caseX,
      );
      phaseFour.state.x = phaseFour.x;
      phaseFour.y = 400;
      phaseFour.state.y = phaseFour.y;
    }

    const twoThings = puzzle?.twoTrueThings?.snapshot?.();
    const twoLayout = stages[4]?.twoTrueThings;
    if (twoThings && twoLayout) {
      this.props.forEach((prop) => {
        if (!prop.caseId || !twoThings.cases?.[prop.caseId]) return;
        prop.x = Phaser.Math.Linear(
          twoLayout.rail.left,
          twoLayout.rail.right,
          twoThings.cases[prop.caseId].x,
        );
        prop.state.x = prop.x;
        prop.y = 400;
        prop.state.y = prop.y;
      });
    }
  }

  findInteractable(playerX, playerY, lane) {
    const puzzle = this.scene.tutorialPuzzle;
    const unlock = getNarrativeUnlockState(puzzle);
    this.syncSuitcaseInspectorPositions();
    let best = null;
    let bestDist = 90; // slightly generous for suitcase inspectors

    this.props.forEach((prop) => {
      if (prop.lane !== lane) return;
      if (!unlock[prop.phase]) return;
      if (prop.kind === 'suitcase-inspector' && prop.state.inspectionComplete) return;
      const dx = Math.abs(prop.x - playerX);
      // The player stands at y≈433 while wall-mounted props sit as high as
      // y=320 (retention slot), so the vertical window must cover ~115.
      const dy = Math.abs(prop.y - playerY);
      if (dx < bestDist && dy < 140) {
        bestDist = dx;
        best = prop;
      }
    });
    return best;
  }

  shouldPreemptPuzzle(prop) {
    if (prop?.kind !== 'suitcase-inspector') return false;
    if (prop.state.inspectionComplete) return false;
    const itemCount = MODAL_ITEMS[prop.inspectorId]?.length ?? 0;
    return suitcaseHasUnreadEvidence(prop.state, itemCount);
  }

  interact(prop) {
    if (this.dialogueActive) return;

    if (prop.kind === 'suitcase-inspector') {
      this.openInspectionModal(prop);
      return;
    }

    if (!prop.state.open) {
      prop.state.open = true;
      prop.state.read = true;
      this.startConversation(prop.scriptId);
    } else {
      prop.state.read = true;
      this.startConversation(prop.scriptId);
    }
  }

  startConversation(scriptId) {
    const script = getNarrativeScript(scriptId);
    if (!script || this.dialogueActive) return;

    const scene = this.scene;
    this.dialogueActive = true;
    this.dialogueState = {
      scriptId,
      script,
      lines: script.lines,
      lineIndex: 0,
      waitingChoice: false,
      responseChosen: false,
    };
    this.setPlayerControlLocked(true);
    scene._updateHintBar?.(null);
    this.emitDialogueLine();
  }

  emitDialogueLine() {
    const state = this.dialogueState;
    if (!state) return;
    const scene = this.scene;
    scene.game.events.emit('hud:dialogue:line', {
      speaker: BUTCH_NARRATIVE.name,
      role: BUTCH_NARRATIVE.role,
      text: state.lines[state.lineIndex],
      line: state.lineIndex + 1,
      total: state.lines.length,
    });
  }

  advanceConversation() {
    const state = this.dialogueState;
    if (!state || state.waitingChoice) return;

    if (state.lineIndex < state.lines.length - 1) {
      state.lineIndex += 1;
      this.emitDialogueLine();
      return;
    }

    if (!state.responseChosen && state.script.choices?.length) {
      state.waitingChoice = true;
      this.scene.game.events.emit('hud:dialogue:choices', {
        choices: state.script.choices.map((choice) => choice.label),
      });
      return;
    }

    this.closeConversation(true);
  }

  selectConversationChoice(index) {
    const state = this.dialogueState;
    const choice = state?.script.choices?.[index];
    if (!state?.waitingChoice || !choice) return;

    state.lines = choice.response;
    state.lineIndex = 0;
    state.waitingChoice = false;
    state.responseChosen = true;
    this.emitDialogueLine();
  }

  updateDialogueInput() {
    if (!this.dialogueActive) return;
    const scene = this.scene;
    const JustDown = Phaser.Input.Keyboard.JustDown;

    scene.player.setAcceleration(0, 0);
    scene.player.setVelocity(0, 0);

    if (JustDown(scene.keys.choiceOne)) {
      this.selectConversationChoice(0);
    } else if (JustDown(scene.keys.choiceTwo)) {
      this.selectConversationChoice(1);
    } else if (
      JustDown(scene.keys.interact)
      || JustDown(scene.keys.jump)
      || JustDown(scene.keys.up)
    ) {
      if (scene.registry.get('dialogueTyping')) {
        scene.game.events.emit('hud:dialogue:reveal');
        return;
      }
      this.advanceConversation();
    }
  }

  closeConversation(completed = false) {
    if (!this.dialogueActive) return;
    const completedScriptId = completed ? this.dialogueState?.scriptId : null;
    this.scene.game.events.emit('hud:dialogue:close');
    this.setPlayerControlLocked(this.isModalOpen());
    this.dialogueActive = false;
    this.dialogueState = null;
    if (completedScriptId === 'phase-iv-envelope' && this.modal?.prop?.inspectorId === 'phase-iv') {
      this.modal.prop.state.envelopeReadComplete = true;
      this.refreshModalMagicStone();
    }
  }

  // ---------------------------------------------------------- modal

  isModalOpen() {
    return this.modal !== null;
  }

  /**
   * Archive dialogue intentionally short-circuits GameScene.update(), which
   * means Player.update() never gets its normal chance to zero old movement.
   * Disable the Arcade body as well as the logical player flag so physics
   * cannot advance the player between dialogue frames or carry them through a
   * carriage door while an envelope is open.
   */
  setPlayerControlLocked(locked) {
    const player = this.scene.player;
    player.frozen = locked;
    player.setAcceleration(0, 0);
    player.setVelocity(0, 0);
    if (player.body) player.body.moves = !locked;
  }

  openInspectionModal(prop) {
    const scene = this.scene;
    if (this.modal) return;

    // The one inspection is a first-look beat only. Mark it before any UI is
    // created, not in the close callback: whichever close path the player
    // takes, the next E must route to the physical movable case.
    prop.state.inspectionComplete = true;
    prop.state.open = true;
    prop.state.read = true;
    this.setPlayerControlLocked(true);
    scene._updateHintBar?.(null);

    const overlay = scene.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x07090d, 0.92)
      .setScrollFactor(0).setDepth(80);

    const panelW = 520;
    const panelH = 380;
    const panel = scene.add.graphics().setScrollFactor(0).setDepth(81);
    panel.fillStyle(0x1a1f26, 0.98);
    panel.fillRoundedRect((GAME_W - panelW) / 2, (GAME_H - panelH) / 2, panelW, panelH, 12);
    panel.lineStyle(2, PAL.charcoal, 0.8);
    panel.strokeRoundedRect((GAME_W - panelW) / 2, (GAME_H - panelH) / 2, panelW, panelH, 12);

    // Suitcase body (large, opened)
    const cx = GAME_W / 2;
    const cy = GAME_H / 2 - 20;
    const caseG = scene.add.graphics().setScrollFactor(0).setDepth(82);
    const caseW = 320;
    const caseH = 200;
    caseG.fillStyle(PAL.ivory, 1);
    caseG.fillRoundedRect(cx - caseW / 2, cy - caseH / 2, caseW, caseH, 8);
    caseG.lineStyle(3, PAL.charcoal, 0.9);
    caseG.strokeRoundedRect(cx - caseW / 2, cy - caseH / 2, caseW, caseH, 8);
    caseG.fillStyle(PAL.orange, 0.9);
    caseG.fillRect(cx - caseW / 2 + 8, cy + caseH / 2 - 24, caseW - 16, 16);

    // Items
    const items = MODAL_ITEMS[prop.inspectorId] || [];
    const itemGraphics = scene.add.graphics().setScrollFactor(0).setDepth(83);
    const stoneGraphics = scene.add.graphics().setScrollFactor(0).setDepth(84);
    const readMarks = new Set(prop.state.readItems || []);

    const descBg = scene.add.rectangle(cx, cy + 140, panelW - 48, 44, 0x07090d, 0.96)
      .setScrollFactor(0).setDepth(84);
    const descText = scene.add.text(cx, cy + 140, '', {
      fontFamily: '"Baskerville", "Libre Baskerville", Georgia, serif',
      fontSize: '13px',
      color: '#e5cf9b',
      align: 'center',
      wordWrap: { width: panelW - 80 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(85);

    const closeText = scene.add.text(cx, cy + 178, '[E] or ESC to close', {
      fontFamily: '"American Typewriter", "Courier New", monospace',
      fontSize: '11px',
      color: '#71828a',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(85);

    // Draw items
    const itemHits = items.map((item) => {
      const ix = cx + item.x;
      const iy = cy + item.y;
      item.draw(itemGraphics, ix, iy);
      if (readMarks.has(item.id)) {
        // Subtle read marker
        itemGraphics.fillStyle(PAL.cyan, 0.25);
        itemGraphics.fillCircle(ix + item.w / 2 + 4, iy - item.h / 2 - 4, 3);
      }
      return { ...item, ix, iy };
    });

    this.modal = {
      prop,
      overlay,
      panel,
      caseG,
      itemGraphics,
      stoneGraphics,
      descBg,
      descText,
      closeText,
      itemHits,
      selectedId: null,
      stoneX: cx - 60,
      stoneY: cy + 48,
    };

    this.refreshModalMagicStone();

    // Pointer input for modal items
    this._modalPointerDown = (pointer) => {
      if (!this.modal) return;
      if (this.modal.stoneAvailable
        && Math.abs(pointer.x - this.modal.stoneX) <= 20
        && Math.abs(pointer.y - this.modal.stoneY) <= 25) {
        this.collectModalMagicStone();
        return;
      }
      const { itemHits } = this.modal;
      for (const hit of itemHits) {
        const dx = Math.abs(pointer.x - hit.ix);
        const dy = Math.abs(pointer.y - hit.iy);
        if (dx < hit.w / 2 + 6 && dy < hit.h / 2 + 6) {
          this.selectModalItem(hit);
          return;
        }
      }
    };
    scene.input.on('pointerdown', this._modalPointerDown);

    // If all items were read on an earlier visit, keep the case's practical
    // summary visible without replaying every line.
    if (readMarks.size >= items.length && items.length > 0) {
      descText.setText(prop.summary);
    }
  }

  selectModalItem(item) {
    if (this.dialogueActive) return;
    const { prop, descText, itemGraphics, itemHits } = this.modal;
    if (!prop.state.readItems) prop.state.readItems = new Set();
    prop.state.readItems.add(item.id);

    // Redraw to show read mark
    itemGraphics.clear();
    itemHits.forEach((hit) => {
      hit.draw(itemGraphics, hit.ix, hit.iy);
      if (prop.state.readItems.has(hit.id)) {
        itemGraphics.fillStyle(PAL.cyan, 0.25);
        itemGraphics.fillCircle(hit.ix + hit.w / 2 + 4, hit.iy - hit.h / 2 - 4, 3);
      }
    });

    descText.setText(item.caption);
    this.startConversation(item.scriptId);

    // If all items read, show the combined line
    const allRead = itemHits.every((h) => prop.state.readItems.has(h.id));
    if (allRead) {
      descText.setText(prop.summary);
    }
  }

  refreshModalMagicStone() {
    if (!this.modal) return;
    const { prop, stoneGraphics, stoneX: x, stoneY: y } = this.modal;
    const collected = magicStoneSnapshot().collected.includes('chapter-1');
    const available = prop.inspectorId === 'phase-iv'
      && prop.state.envelopeReadComplete
      && !collected;
    this.modal.stoneAvailable = available;
    stoneGraphics.clear();
    if (!available) return;
    stoneGraphics.fillStyle(PAL.cyan, 0.12);
    stoneGraphics.fillCircle(x, y, 28);
    stoneGraphics.fillStyle(0xc9fbff, 1);
    stoneGraphics.lineStyle(2, 0x65ddea, 1);
    stoneGraphics.beginPath();
    stoneGraphics.moveTo(x, y - 19);
    stoneGraphics.lineTo(x + 14, y - 4);
    stoneGraphics.lineTo(x + 9, y + 17);
    stoneGraphics.lineTo(x, y + 24);
    stoneGraphics.lineTo(x - 9, y + 17);
    stoneGraphics.lineTo(x - 14, y - 4);
    stoneGraphics.closePath();
    stoneGraphics.fillPath();
    stoneGraphics.strokePath();
    stoneGraphics.fillStyle(0xffffff, 0.9);
    stoneGraphics.fillTriangle(x - 5, y - 11, x + 1, y - 15, x - 1, y + 5);
  }

  collectModalMagicStone() {
    if (!this.modal?.stoneAvailable) return false;
    collectMagicStone('chapter-1');
    const snapshot = magicStoneSnapshot();
    this.modal.prop.state.magicStoneCollected = true;
    this.modal.descText.setText(`A crystal was sewn beneath the unfinished letter.  MAGIC STONE ${snapshot.count} / ${snapshot.total}.`);
    this.scene.cameras.main.flash(220, 101, 221, 234);
    this.refreshModalMagicStone();
    return true;
  }

  closeInspectionModal() {
    const scene = this.scene;
    if (!this.modal) return;

    // Closing the inspection also closes any Butch line it raised; otherwise
    // dialogueActive would stay true and silently swallow every later prop
    // interaction (interact() early-returns on it).
    if (this.dialogueActive) {
      this.closeConversation();
    }

    const m = this.modal;
    scene.input.off('pointerdown', this._modalPointerDown);
    m.overlay.destroy();
    m.panel.destroy();
    m.caseG.destroy();
    m.itemGraphics.destroy();
    m.stoneGraphics.destroy();
    m.descBg.destroy();
    m.descText.destroy();
    m.closeText.destroy();
    this.modal = null;

    this.setPlayerControlLocked(false);
  }

  // ---------------------------------------------------------- visibility

  setVisible(visible) {
    this.props.forEach((prop) => {
      prop.graphics.setVisible(visible);
      prop.glow.setVisible(visible);
    });
    if (!visible && this.modal) {
      this.closeInspectionModal();
    }
  }

  destroy() {
    if (this.modal) this.closeInspectionModal();
    this.props.forEach((prop) => {
      prop.graphics.destroy();
      prop.glow.destroy();
    });
    this.props = [];
  }
}

// No-op extension export (kept for compatibility with any existing imports)
export function applyNarrativeArtExtensions() {}
