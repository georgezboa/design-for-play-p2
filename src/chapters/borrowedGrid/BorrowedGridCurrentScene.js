import Phaser from 'phaser';
import {
  demandIconTexture,
  districtArtId,
  preloadDoor2DemandIcons,
} from './door2DemandArt.js';
import {
  originalBackdropTexture,
  preloadDoor2Foreground,
} from './door2ForegroundArt.js';
import {
  DISTRICTS,
  MAX_FAILURES,
  ROUND_SPECS,
  advanceDistrictRound,
  applyDistrictAction,
  createDistrictDemandState,
  currentRoundSpec,
  demandForDistrict,
  isGridNodeAvailable,
  restartDistrictRound,
  tickDistrictDemand,
} from './model/districtDemand.js';

export const BORROWED_GRID_CURRENT_VIEW = Object.freeze({ w: 960, h: 600 });

const WORLD = Object.freeze({ w: 3420, h: 620 });
const HOLD_MS = 700;
const TRAVEL_MS = 430;
const LOSS_RESTART_DELAY_MS = 2_800;
const ROUTE_CORNER_RADIUS = 24;
const ROUTE_CORNER_STEPS = 8;
const CYAN = 0x4fe1df;
const ICE = 0xe3ebff;
const LILAC = 0xaeb4dc;
const ALERT = 0xd15370;
const CONDUCTOR = 0x596476;
const GRAPHITE = 0x171922;
const DEEP_GRAPHITE = 0x0a0c12;
const VIOLET_METAL = 0x292634;
const DRAWING_INK = 0xb9c8d4;
const DRAWING_DIM = 0x7f91a3;
const DRAWING_WASH = 0x07101a;
const PAPER = '#d8d1c4';

const DEMAND_ARCHETYPE = Object.freeze({
  lift: 'car',
  market: 'car',
  clinic: 'home',
  shelter: 'home',
  pump: 'car',
  kitchen: 'home',
});

const NODES = Object.freeze([
  { x: 110, y: 455, kind: 'source', label: 'WEST FEED', variant: 'feedBroad' },
  { x: 330, y: 455, kind: 'junction' },
  { x: 570, y: 350, kind: 'district', district: 'lift' },
  { x: 770, y: 230, kind: 'transformer', label: 'STEP-UP A', variant: 'transformerA' },
  { x: 980, y: 455, kind: 'junction' },
  { x: 1190, y: 455, kind: 'district', district: 'market' },
  { x: 1400, y: 300, kind: 'transformer', label: 'STEP-UP B', variant: 'transformerB' },
  { x: 1600, y: 165, kind: 'junction' },
  { x: 1810, y: 165, kind: 'district', district: 'clinic' },
  { x: 2020, y: 300, kind: 'source', label: 'CENTRAL FEED', variant: 'feedTall' },
  { x: 2205, y: 390, kind: 'district', district: 'shelter' },
  { x: 2395, y: 230, kind: 'transformer', label: 'STEP-UP C', variant: 'transformerC' },
  { x: 2580, y: 455, kind: 'junction' },
  { x: 2780, y: 455, kind: 'district', district: 'pump' },
  { x: 2960, y: 335, kind: 'junction' },
  { x: 3140, y: 215, kind: 'transformer', label: 'STEP-UP D', variant: 'transformerD' },
  { x: 3330, y: 355, kind: 'district', district: 'kitchen' },
]);

const EDGES = Object.freeze([
  [0, 1], [1, 2], [1, 4], [2, 3], [3, 4], [4, 5], [4, 6], [5, 6],
  [6, 7], [6, 9], [7, 8], [8, 9], [9, 10], [9, 11], [10, 12], [11, 12],
  [12, 13], [12, 14], [13, 14], [14, 15], [15, 16],
  [13, 16], [14, 16],
]);

const STORY_LINES = Object.freeze({
  lift: 'THE MEDICINE REACHES THE SEVENTH FLOOR.',
  market: 'THE FREEZERS HOLD THROUGH THE NIGHT.',
  clinic: 'THE CLINIC LIGHTS BEFORE THE ADVERTISING TOWER.',
  shelter: 'THE SHELTER KEEPS ITS HEAT.',
  pump: 'WATER RETURNS TO THE UPPER BLOCKS.',
  kitchen: 'DINNER MOVES DOWN THE LINE.',
});

function clock(ms) {
  const seconds = Math.ceil(Math.max(0, ms) / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function neighbors(index) {
  return EDGES.flatMap(([a, b]) => (a === index ? [b] : b === index ? [a] : []));
}

function directionScore(from, to, dx, dy) {
  const vx = to.x - from.x;
  const vy = to.y - from.y;
  const length = Math.hypot(vx, vy) || 1;
  return (vx / length) * dx + (vy / length) * dy;
}

function roundPolylineCorners(points, radius = ROUTE_CORNER_RADIUS, steps = ROUTE_CORNER_STEPS) {
  if (points.length < 3) return points;
  const rounded = [{ ...points[0] }];
  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1];
    const corner = points[index];
    const next = points[index + 1];
    const incomingLength = Phaser.Math.Distance.BetweenPoints(previous, corner);
    const outgoingLength = Phaser.Math.Distance.BetweenPoints(corner, next);
    const curveRadius = Math.min(radius, incomingLength * 0.4, outgoingLength * 0.4);
    const incoming = {
      x: (corner.x - previous.x) / (incomingLength || 1),
      y: (corner.y - previous.y) / (incomingLength || 1),
    };
    const outgoing = {
      x: (next.x - corner.x) / (outgoingLength || 1),
      y: (next.y - corner.y) / (outgoingLength || 1),
    };
    const entry = { x: corner.x - incoming.x * curveRadius, y: corner.y - incoming.y * curveRadius };
    const exit = { x: corner.x + outgoing.x * curveRadius, y: corner.y + outgoing.y * curveRadius };
    rounded.push(entry);
    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps;
      const inverse = 1 - t;
      rounded.push({
        x: inverse * inverse * entry.x + 2 * inverse * t * corner.x + t * t * exit.x,
        y: inverse * inverse * entry.y + 2 * inverse * t * corner.y + t * t * exit.y,
      });
    }
  }
  rounded.push({ ...points.at(-1) });
  return rounded;
}

function edgeRoute(from, to) {
  if (from.x === to.x || from.y === to.y) return [{ ...from }, { ...to }];
  const midX = Math.round((from.x + to.x) / 2);
  return roundPolylineCorners([from, { x: midX, y: from.y }, { x: midX, y: to.y }, to]);
}

const ROUTE_METRICS = new WeakMap();

function routeMetrics(route) {
  const cached = ROUTE_METRICS.get(route);
  if (cached) return cached;
  const segments = [];
  let total = 0;
  for (let index = 1; index < route.length; index += 1) {
    const length = Phaser.Math.Distance.BetweenPoints(route[index - 1], route[index]);
    segments.push(length);
    total += length;
  }
  const metrics = { total: total || 1, segments };
  ROUTE_METRICS.set(route, metrics);
  return metrics;
}

function routeLength(route) {
  return routeMetrics(route).total;
}

function pointAlongRoute(route, progress) {
  const metrics = routeMetrics(route);
  let distance = Phaser.Math.Clamp(progress, 0, 1) * metrics.total;
  for (let index = 1; index < route.length; index += 1) {
    const start = route[index - 1];
    const end = route[index];
    const segment = metrics.segments[index - 1];
    if (distance <= segment || index === route.length - 1) {
      const t = segment ? distance / segment : 0;
      return { x: Phaser.Math.Linear(start.x, end.x, t), y: Phaser.Math.Linear(start.y, end.y, t) };
    }
    distance -= segment;
  }
  return route.at(-1);
}

function drawRoute(scene, route, color, width, alpha, depth) {
  const graphics = scene.add.graphics().setDepth(depth);
  graphics.lineStyle(width, color, alpha);
  graphics.beginPath();
  graphics.moveTo(route[0].x, route[0].y);
  route.slice(1).forEach((point) => graphics.lineTo(point.x, point.y));
  graphics.strokePath();
  return graphics;
}

function setLineArtTone(view, color, alpha) {
  view.lineArt.forEach(({ object, width }) => {
    const detailWeight = width <= 1 ? 0.56 : width < 2 ? 0.78 : 1;
    const focusWeight = view.recommended ? 0.18 : 0;
    object.setStrokeStyle(width + focusWeight, color, alpha * detailWeight);
  });
}

export class BorrowedGridCurrentScene extends Phaser.Scene {
  constructor() {
    super('BorrowedGridCurrent');
  }

  preload() {
    preloadDoor2DemandIcons(this);
    preloadDoor2Foreground(this);
  }

  create() {
    this.resetRound();
  }

  resetRound() {
    if (this.roundRoot) this.roundRoot.destroy(true);
    if (this.uiRoot) this.uiRoot.destroy(true);
    if (this.artifactView && !this.artifactView.parentContainer) this.artifactView.destroy(true);
    this.roundRoot = this.add.container(0, 0);
    this.uiRoot = this.add.container(0, 0).setScrollFactor(0).setDepth(200);
    this.state = Object.assign(createDistrictDemandState(), {
      role: 'grid-runner',
      storyBeats: [],
      artifactReady: false,
      artifactTaken: false,
      node: 0,
      travellingTo: null,
    });
    this.visualTimeMs = 0;
    this.interactionHold = 0;
    this.travel = null;
    this.arrivalFlow = null;
    this.lossRestartRemainingMs = null;
    this.roundPresented = false;
    this.terminalPreview = null;

    this.cameras.main.setBounds(0, 0, WORLD.w, WORLD.h);
    this.cameras.main.setBackgroundColor(0x05070d);
    this.buildCity();
    this.buildSubstationBody();
    this.buildGrid();
    this.buildPlayer();
    this.buildHud();
    this.bindKeys();
    this.syncRoundStations();
    this.syncArtState();
    this.cameras.main.startFollow(this.pulse, true, 0.065, 0.065, -70, 28);
    this.cameras.main.setDeadzone(330, 180);
  }

  addRound(objects) {
    this.roundRoot.add(objects);
    return objects;
  }

  buildCity() {
    // This is the actual first Borrowed Grid city: the three original photographic
    // chunks used before the later low-poly parallax repaint. Keep their original
    // 941 px height fit and overlap contract; only the near interactive layer changes.
    const chunkStep = WORLD.w / 3;
    for (let index = 0; index < 3; index += 1) {
      const image = this.add.image(index * chunkStep, -160, originalBackdropTexture(index))
        .setOrigin(0, 0).setScrollFactor(0.35, 0.5).setTint(0x5a6472).setDepth(-40);
      const scale = Math.max(chunkStep / image.width, 900 / image.height);
      image.setScale(scale);
      this.addRound(image);
    }
    this.addRound(this.add.rectangle(WORLD.w / 2, WORLD.h / 2, WORLD.w, WORLD.h, 0x03060b, 0.14).setDepth(-24));
    for (let index = 0; index < 44; index += 1) {
      const drop = this.add.rectangle((index * 211) % WORLD.w, (index * 91) % 560, 1, 13 + (index % 5) * 3, 0x8194a8, 0.17)
        .setDepth(80);
      this.addRound(drop);
      this.tweens.add({ targets: drop, y: drop.y + 420, duration: 1800 + (index % 7) * 170, repeat: -1 });
    }
  }

  buildSubstationBody() {
    this.mechanicalParts = [];
    this.stationLights = [];
    // Intentionally empty: the monumental factory raster was visually competing
    // with the city and made every interaction sprite look pasted on. The city is
    // now the only environment plane; the grid below is a light schematic layer.
  }

  buildNodeEquipment(node, index) {
    const group = this.add.container(node.x, node.y).setDepth(10);
    const instrumentY = -24;
    const mountStem = null;
    const guideHalo = this.add.circle(0, 0, 10, CYAN, 0).setStrokeStyle(1, CYAN, 0).setVisible(false);
    const lived = this.add.circle(0, instrumentY, 14, ICE, 0).setBlendMode(Phaser.BlendModes.ADD);
    const indicator = this.add.circle(0, instrumentY - 14, 2.5, ICE, 0.12).setBlendMode(Phaser.BlendModes.ADD);
    const capacitySlots = [];
    const urgentBrackets = [];
    let port;
    let shell;
    const sprite = this.add.container(0, 0);
    let rotor = null;
    let flowParticles = [];
    let demandPulse = null;
    let ambientGlow = null;
    const lineArt = [];
    const entryLights = [];
    const poweredLights = [];
    const demandKind = node.kind === 'district' ? DEMAND_ARCHETYPE[node.district] || 'home' : null;
    const symbol = this.add.container(0, 0);
    let failureMark = null;

    const stroke = (object, width = 2) => {
      lineArt.push({ object, width });
      sprite.add(object.setStrokeStyle(width, ICE, 0.64));
      return object;
    };
    const light = (object, collection = poweredLights) => {
      collection.push(object);
      sprite.add(object.setAlpha(0));
      return object;
    };

    if (node.kind === 'source') {
      ambientGlow = this.add.circle(0, -38, 38, CYAN, 0).setBlendMode(Phaser.BlendModes.ADD);
      sprite.add(ambientGlow);
      sprite.add(this.add.circle(0, -38, 31, DRAWING_WASH, 0.58));
      stroke(this.add.circle(0, -38, 27, 0x000000, 0), 2.1);
      stroke(this.add.circle(0, -38, 17, 0x000000, 0), 1);
      stroke(this.add.circle(0, -38, 8, 0x000000, 0), 1.5);
      stroke(this.add.line(0, 0, -34, -6, 34, -6, ICE, 0.7).setOrigin(0), 1.5);
      for (let tick = 0; tick < 12; tick += 1) {
        const angle = (Math.PI * 2 * tick) / 12;
        stroke(this.add.line(0, 0,
          Math.cos(angle) * 29, -38 + Math.sin(angle) * 29,
          Math.cos(angle) * 35, -38 + Math.sin(angle) * 35,
          ICE, 0.7).setOrigin(0), 1);
      }
      light(this.add.circle(0, -38, 7, CYAN, 0.88), entryLights);
      rotor = this.add.container(0, -38);
      for (let tick = 0; tick < 6; tick += 1) {
        const spark = this.add.circle(0, -18, 1.4, CYAN, 0.66).setBlendMode(Phaser.BlendModes.ADD);
        rotor.add(spark.setRotation((Math.PI * 2 * tick) / 6));
      }
      shell = this.add.circle(0, instrumentY, 10, 0x111823, 0.96).setStrokeStyle(2, ICE, 0.42);
      port = this.add.circle(0, instrumentY, 4.5, ICE, 0.78);
      group.add([sprite, rotor, guideHalo, lived, shell.setAlpha(0), port.setAlpha(0), indicator.setAlpha(0)]);
    } else if (node.kind === 'junction') {
      shell = this.add.circle(0, 0, 4, 0x11141b, 1).setStrokeStyle(1, 0x687181, 0.46);
      port = this.add.circle(0, 0, 1.5, 0x747d8c, 0.58);
      group.add([guideHalo, shell, port]);
    } else if (node.kind === 'transformer') {
      ambientGlow = this.add.ellipse(0, -70, 68, 148, LILAC, 0).setBlendMode(Phaser.BlendModes.ADD);
      sprite.add(ambientGlow);
      sprite.add(this.add.rectangle(0, -70, 53, 130, DRAWING_WASH, 0.38));
      stroke(this.add.line(0, 0, 0, -132, 0, -8, ICE, 0.7).setOrigin(0), 1.5);
      stroke(this.add.line(0, 0, -25, -120, -25, -18, ICE, 0.7).setOrigin(0), 1);
      stroke(this.add.line(0, 0, 25, -120, 25, -18, ICE, 0.7).setOrigin(0), 1);
      [-106, -72, -38].forEach((y, stage) => {
        stroke(this.add.ellipse(0, y, 46 - stage * 5, 22, DRAWING_WASH, 0.56), 1.8);
        stroke(this.add.line(0, 0, -18 + stage * 2, y + 15, 18 - stage * 2, y + 15, ICE, 0.7).setOrigin(0), 1);
      });
      stroke(this.add.line(0, 0, -28, -8, 28, -8, ICE, 0.7).setOrigin(0), 2.1);
      flowParticles = [0, 1, 2].map(() => this.add.circle(0, -18, 2.2, CYAN, 0.8).setBlendMode(Phaser.BlendModes.ADD));
      shell = this.add.rectangle(0, instrumentY, 18, 34, 0x141722, 0.94).setStrokeStyle(1, LILAC, 0.38);
      port = this.add.circle(0, instrumentY + 13, 2, LILAC, 0.58);
      for (let slot = 0; slot < 3; slot += 1) {
        capacitySlots.push(this.add.rectangle(0, instrumentY + 9 - slot * 9, 10, 6, 0x1b1f2b, 1).setStrokeStyle(1, LILAC, 0.52));
      }
      group.add([sprite, ...flowParticles, guideHalo, lived, shell.setAlpha(0), port.setAlpha(0), indicator.setAlpha(0), ...capacitySlots.map((slot) => slot.setAlpha(0))]);
    } else {
      if (demandKind === 'car') {
        ambientGlow = this.add.ellipse(0, -36, 142, 66, CYAN, 0).setBlendMode(Phaser.BlendModes.ADD);
        sprite.add(ambientGlow);
        stroke(this.add.polygon(0, -37, [0, 22, 19, 0, 82, 0, 101, 8, 118, 17, 124, 25, 107, 33, 17, 33], DRAWING_WASH, 0.72), 2.1);
        stroke(this.add.polygon(0, -40, [0, 0, 46, 0, 60, 8, -8, 8], 0x0b1722, 0.86), 1);
        stroke(this.add.line(0, 0, -47, -18, -47, -5, ICE, 0.7).setOrigin(0), 1.5);
        stroke(this.add.line(0, 0, -22, -18, -10, -7, ICE, 0.7).setOrigin(0), 1);
        stroke(this.add.line(0, 0, 13, -18, 23, -8, ICE, 0.7).setOrigin(0), 1);
        light(this.add.circle(-35, -14, 5, CYAN, 0.9), entryLights);
        light(this.add.circle(38, -14, 5, CYAN, 0.9));
        light(this.add.ellipse(-30, -8, 24, 5, CYAN, 0.58));
        light(this.add.ellipse(30, -8, 24, 5, CYAN, 0.58));
      } else {
        ambientGlow = this.add.ellipse(0, -62, 116, 132, CYAN, 0).setBlendMode(Phaser.BlendModes.ADD);
        sprite.add(ambientGlow);
        stroke(this.add.polygon(0, -58, [0, 41, 47, 0, 94, 41, 94, 91, 0, 91], DRAWING_WASH, 0.72), 2.1);
        stroke(this.add.line(0, 0, -35, -80, -35, -101, ICE, 0.7).setOrigin(0), 1);
        stroke(this.add.line(0, 0, -41, -101, -29, -101, ICE, 0.7).setOrigin(0), 1);
        stroke(this.add.rectangle(-21, -67, 18, 20, 0x0b1722, 0.82), 1.25);
        stroke(this.add.rectangle(21, -67, 18, 20, 0x0b1722, 0.82), 1.25);
        stroke(this.add.line(0, 0, -21, -77, -21, -57, ICE, 0.7).setOrigin(0), 0.75);
        stroke(this.add.line(0, 0, 21, -77, 21, -57, ICE, 0.7).setOrigin(0), 0.75);
        stroke(this.add.rectangle(0, -37, 17, 36, 0x0b1722, 0.82), 1.25);
        stroke(this.add.line(0, 0, -33, -46, 33, -46, ICE, 0.7).setOrigin(0), 0.75);
        light(this.add.line(0, 0, -70, -8, -52, -8, CYAN, 0.9).setOrigin(0).setLineWidth(2), entryLights);
        light(this.add.rectangle(-21, -67, 14, 16, CYAN, 0.42));
        light(this.add.rectangle(21, -67, 14, 16, CYAN, 0.42));
        light(this.add.rectangle(0, -29, 11, 16, CYAN, 0.26));
      }
      demandPulse = this.add.circle(-30, -22, 2.4, CYAN, 0).setBlendMode(Phaser.BlendModes.ADD);
      shell = this.add.rectangle(0, instrumentY, 42, 18, 0x11151d, 0.48).setStrokeStyle(1, ICE, 0.08);
      port = this.add.circle(0, instrumentY, 2, ICE, 0.12);
      for (let slot = 0; slot < 3; slot += 1) {
        const pip = this.add.rectangle(-10 + slot * 10, instrumentY, 6, 3, 0x151a24, 1).setStrokeStyle(0.75, ICE, 0.24);
        capacitySlots.push(pip);
      }
      [[-23, -34, 7, 1], [-23, -34, 1, 7], [23, -34, 7, 1], [23, -34, 1, 7],
        [-23, -14, 7, 1], [-23, -14, 1, 7], [23, -14, 7, 1], [23, -14, 1, 7]].forEach(([x, y, w, h]) => {
        urgentBrackets.push(this.add.rectangle(x, y, w, h, ALERT, 1).setVisible(false));
      });
      failureMark = this.add.container(0, 0, [
        this.add.rectangle(0, 0, 16, 2, 0x6d7079, 0.9).setRotation(0.72),
        this.add.rectangle(0, 0, 16, 2, 0x6d7079, 0.9).setRotation(-0.72),
      ]).setY(instrumentY).setVisible(false);
      group.add([sprite, demandPulse, guideHalo, lived, shell.setAlpha(0), port.setAlpha(0), indicator.setAlpha(0), ...capacitySlots, ...urgentBrackets, failureMark]);
    }

    const lever = null;
    const piston = null;

    if (node.kind === 'junction') this.stationLights.push({ object: indicator, phase: index * 0.72, low: 0.04, high: 0.12 });

    this.addRound(group);
    return {
      node, index, art: group, core: port, shell, symbol, lived, indicator, guideHalo, capacitySlots, urgentBrackets, failureMark, lever, piston,
      sprite, rotor, flowParticles, demandPulse, demandKind, lineArt, entryLights, poweredLights, ambientGlow,
      ring: null, terminal: null, label: null, mount: null, recommended: false, terminalState: null,
    };
  }

  buildGrid() {
    this.edgeViews = [];
    for (const [a, b] of EDGES) {
      const start = NODES[a];
      const end = NODES[b];
      const route = edgeRoute(start, end);
      const base = drawRoute(this, route, DEEP_GRAPHITE, 5, 0.82, 5);
      const rail = drawRoute(this, route, CONDUCTOR, 1.5, 0.64, 6);
      const highlight = drawRoute(this, route, ICE, 0.75, 0.22, 7);
      const glow = drawRoute(this, route, CYAN, 3, 0, 8).setBlendMode(Phaser.BlendModes.ADD);
      const beads = [0, 1, 2].map(() => this.add.circle(start.x, start.y, 3, CYAN, 0).setDepth(9).setBlendMode(Phaser.BlendModes.ADD));
      this.addRound([base, rail, highlight, glow, ...beads]);
      this.edgeViews.push({ a, b, route, reverseRoute: [...route].reverse(), base, rail, highlight, glow, beads });
    }
    this.nodeViews = NODES.map((node, index) => this.buildNodeEquipment(node, index));
  }

  buildPlayer() {
    const start = NODES[0];
    this.currentFluidGlow = this.add.graphics().setDepth(27).setBlendMode(Phaser.BlendModes.ADD);
    this.currentFluidBody = this.add.graphics().setDepth(28).setBlendMode(Phaser.BlendModes.ADD);
    this.currentFluidFilament = this.add.graphics().setDepth(29).setBlendMode(Phaser.BlendModes.ADD);
    this.fluidDroplets = [0, 1].map((index) => this.add.circle(start.x, start.y, 2.6 - index * 0.5, CYAN, 0)
      .setDepth(29).setBlendMode(Phaser.BlendModes.ADD));
    this.aura = this.add.ellipse(start.x, start.y, 25, 13, CYAN, 0.1).setDepth(27).setBlendMode(Phaser.BlendModes.ADD);
    this.pulse = this.add.container(start.x, start.y).setDepth(30);
    this.pulseAfterimages = [
      this.add.circle(-12, 0, 2.3, CYAN, 0.13),
      this.add.circle(-7, 0, 3.4, CYAN, 0.22),
    ];
    this.pulseTail = this.add.ellipse(-3, 0, 18, 6, CYAN, 0.58);
    this.pulseCore = this.add.circle(3, 0, 6, CYAN, 0.98);
    this.pulseNeedle = this.add.circle(4.5, -1.7, 1.9, 0xe9ffff, 0.98);
    this.pulseMembrane = this.add.circle(2, 0, 8.2, 0x000000, 0).setStrokeStyle(1, 0xbafffb, 0.78);
    this.pulse.add([this.pulseTail, ...this.pulseAfterimages, this.pulseCore, this.pulseNeedle, this.pulseMembrane]);
    this.pulse.setBlendMode(Phaser.BlendModes.ADD);
    this.addRound([this.currentFluidGlow, this.currentFluidBody, this.currentFluidFilament, ...this.fluidDroplets, this.aura, this.pulse]);
    this.cargoOrbs = [0, 1, 2].map(() => {
      const cell = this.add.rectangle(start.x, start.y + 17, 7, 5, GRAPHITE, 0.9)
        .setStrokeStyle(1, CYAN, 0.34).setDepth(31);
      this.addRound(cell);
      return cell;
    });
  }

  buildHud() {
    const panel = this.add.rectangle(10, 10, 222, 78, 0x05070d, 0.78).setOrigin(0, 0).setStrokeStyle(1, 0x667086, 0.34);
    this.roundText = this.add.text(20, 17, '', { fontFamily: 'monospace', fontSize: '11px', color: PAPER });
    this.timerText = this.add.text(18, 31, '', { fontFamily: 'monospace', fontSize: '28px', fontStyle: 'bold', color: '#f4f7ff' });
    this.timerUrgencyBar = this.add.rectangle(20, 70, 126, 3, CYAN, 0.8).setOrigin(0, 0.5);
    this.scoreText = this.add.text(158, 20, '', { fontFamily: 'monospace', fontSize: '9px', color: '#aab4c6' });
    this.cargoText = this.add.text(158, 43, '', { fontFamily: 'monospace', fontSize: '11px', color: '#4fe1df' });
    this.orders = this.add.container(688, 16);
    this.orderCardSignature = '';
    this.orderCardViews = [];
    this.caption = this.add.text(480, 112, '', {
      fontFamily: 'monospace', fontSize: '15px', color: '#d8d1c4', backgroundColor: '#05070ddd', padding: { x: 12, y: 7 }, align: 'center',
    }).setOrigin(0.5).setAlpha(0);
    this.interactText = this.add.text(480, 535, '', {
      fontFamily: 'monospace', fontSize: '12px', color: '#e3ebff', backgroundColor: '#05070dcc', padding: { x: 8, y: 5 },
    }).setOrigin(0.5);
    this.uiRoot.add([panel, this.roundText, this.timerText, this.timerUrgencyBar, this.scoreText, this.cargoText, this.orders, this.caption, this.interactText]);
  }

  bindKeys() {
    if (this.keys) return;
    this.keys = this.input.keyboard.addKeys({
      left: 'LEFT', right: 'RIGHT', up: 'UP', down: 'DOWN',
      a: 'A', d: 'D', w: 'W', s: 'S', interact: 'E', enter: 'ENTER', f: 'F',
    });
    this.input.keyboard.addCapture(['LEFT', 'RIGHT', 'UP', 'DOWN']);
    [['LEFT', -1, 0], ['A', -1, 0], ['RIGHT', 1, 0], ['D', 1, 0], ['UP', 0, -1], ['W', 0, -1], ['DOWN', 0, 1], ['S', 0, 1]]
      .forEach(([key, dx, dy]) => this.input.keyboard.on(`keydown-${key}`, () => this.chooseDirection(dx, dy)));
    this.input.keyboard.on('keydown-F', () => this.toggleFullscreen());
    this.input.keyboard.on('keydown-ENTER', () => {
      if (this.state?.mode === 'intermission') this.startNextRound();
      else if (this.state?.artifactReady) this.takeArtifact();
    });
    this.input.keyboard.on('keydown-E', () => {
      if (this.state?.artifactReady) this.takeArtifact();
    });
  }

  syncRoundStations() {
    const round = currentRoundSpec(this.state);
    this.nodeViews.forEach((view) => {
      const available = isGridNodeAvailable(this.state.roundIndex, view.index);
      view.art.setVisible(available);
    });
    this.edgeViews.forEach((edge) => {
      const visible = edge.a <= round.lastNode && edge.b <= round.lastNode;
      [edge.base, edge.rail, edge.highlight, edge.glow].forEach((object) => object.setVisible(visible));
      edge.beads.forEach((bead) => bead.setVisible(false));
    });
  }

  chooseDirection(dx, dy) {
    if (this.travel || this.state.mode !== 'playing') return;
    const fromIndex = this.state.node;
    const from = NODES[fromIndex];
    const candidates = neighbors(fromIndex)
      .filter((index) => isGridNodeAvailable(this.state.roundIndex, index))
      .map((index) => ({ index, score: directionScore(from, NODES[index], dx, dy) }))
      .filter((choice) => choice.score > 0.18)
      .sort((a, b) => b.score - a.score);
    if (!candidates.length) return;
    const toIndex = candidates[0].index;
    this.arrivalFlow = null;
    this.state.travellingTo = toIndex;
    const route = edgeRoute(from, NODES[toIndex]);
    this.travel = { from: fromIndex, to: toIndex, route, elapsed: 0, duration: TRAVEL_MS + routeLength(route) * 0.55 };
  }

  interactionAtNode() {
    const node = NODES[this.state.node];
    if (!node || this.travel) return null;
    if (node.kind === 'source') return { type: 'source.collect', prompt: 'HOLD E · DRAW' };
    if (node.kind === 'transformer') return { type: 'transformer.boost', prompt: 'HOLD E · BOOST' };
    if (node.kind === 'district') {
      const demand = demandForDistrict(this.state, node.district);
      if (!demand) return { type: 'district.deliver', district: node.district, prompt: 'NO CALL ON THIS LINE', available: false };
      const missing = Math.max(0, demand.units - this.state.carriedUnits);
      if (missing > 0) {
        return {
          type: 'district.deliver', district: node.district, prompt: `${missing} UNIT${missing === 1 ? '' : 'S'} SHORT`, available: false,
        };
      }
      return { type: 'district.deliver', district: node.district, prompt: 'HOLD E · POWER', available: true };
    }
    return null;
  }

  nextVisualCue() {
    const carrying = this.state.carriedUnits;
    const activeDemands = this.state.active;
    if (carrying === 0) return { kind: 'source', reason: 'draw-current' };
    const affordable = activeDemands.filter((demand) => demand.units <= carrying).map((demand) => demand.district);
    if (affordable.length) return { kind: 'district', districts: affordable, reason: 'deliver-current' };
    if (activeDemands.length && carrying < 3) return { kind: 'transformer', reason: 'compress-current' };
    return { kind: null, reason: activeDemands.length ? 'await-capacity' : 'await-call' };
  }

  completeInteraction(action) {
    const before = this.state;
    if (action.type === 'district.deliver') {
      const view = this.nodeViews.find((item) => item.node.district === action.district);
      const demand = demandForDistrict(before, action.district);
      if (view && demand) view.lastDemandUnits = demand.units;
    }
    this.state = Object.assign(applyDistrictAction(this.state, action), {
      role: 'grid-runner', artifactReady: before.artifactReady, artifactTaken: before.artifactTaken,
      storyBeats: before.storyBeats, node: before.node, travellingTo: before.travellingTo,
    });
    const messages = {
      'charge-collected': 'CURRENT DRAWN · FIND A TRANSFORMER OR A CALL',
      'charge-boosted': 'CURRENT COMPRESSED · CAPACITY INCREASED',
      'already-carrying': 'THE FEED WILL NOT STACK RAW CURRENT',
      'no-charge': 'BRING CURRENT HERE FIRST',
      'charge-full': 'CURRENT ALREADY AT SAFE CAPACITY',
      'no-demand': 'NO ONE IS CALLING FROM THIS LINE',
      'insufficient-charge': 'NOT ENOUGH CURRENT FOR THIS CALL',
    };
    if (this.state.event === 'demand-served') {
      if (!this.state.storyBeats.includes(action.district)) this.state.storyBeats.push(action.district);
      this.showCaption(STORY_LINES[action.district], 2800);
      this.flashDistrict(action.district);
    } else if (this.state.event === 'voltage-restored') {
      this.showCaption('VOLTAGE HOLDS AGAIN.', 1700);
      this.flashDistrict(action.district);
    } else this.showCaption(messages[this.state.event] || 'THE GRID ANSWERS.', 1900);
    this.syncArtState();
  }

  flashDistrict(district) {
    const view = this.nodeViews.find((item) => item.node.district === district);
    if (!view) return;
    view.core.setFillStyle(CYAN, 1);
    view.indicator?.setFillStyle(CYAN, 1);
    this.tweens.add({ targets: [view.indicator, view.lived].filter(Boolean), alpha: 1, duration: 220, yoyo: true, repeat: 2 });
  }

  syncArtState() {
    const carrying = Math.max(0, Math.min(3, this.state.carriedUnits));
    const visualCue = this.nextVisualCue();
    this.pulseCore.setFillStyle(this.state.mode === 'lost' ? ALERT : this.state.mode === 'won' ? ICE : CYAN, 0.95);
    this.pulse.setScale(1 + carrying * 0.08, 1 + carrying * 0.04);
    this.cargoOrbs.forEach((cell, index) => {
      const charged = index < carrying;
      cell.setAlpha(charged ? 1 : 0.34).setFillStyle(charged ? CYAN : GRAPHITE, charged ? 0.95 : 0.9)
        .setStrokeStyle(1, CYAN, charged ? 0.92 : 0.28);
    });

    this.nodeViews.forEach((view) => {
      view.recommended = visualCue.kind === view.node.kind
        && (view.node.kind !== 'district' || visualCue.districts?.includes(view.node.district));
      const cueColor = view.node.kind === 'transformer' ? LILAC : view.node.kind === 'district' ? CYAN : ICE;
      view.guideHalo.setAlpha(0);
      view.indicator.setFillStyle(cueColor, view.recommended ? 0.9 : 0.12);

      if (view.node.kind === 'source') {
        setLineArtTone(view, view.recommended ? ICE : DRAWING_DIM, view.recommended ? 0.9 : 0.54);
        view.sprite.setAlpha(view.recommended ? 1 : 0.78);
        view.entryLights.forEach((light) => light.setAlpha(view.recommended ? 0.88 : 0.16));
        view.ambientGlow?.setAlpha(view.recommended ? 0.055 : 0.012);
        view.shell.setStrokeStyle(1, ICE, view.recommended ? 0.72 : 0.28);
        view.core.setFillStyle(view.recommended ? ICE : 0x667080, view.recommended ? 0.9 : 0.42);
        return;
      }
      if (view.node.kind === 'junction') {
        return;
      }
      if (view.node.kind === 'transformer') {
        setLineArtTone(view, view.recommended ? LILAC : DRAWING_DIM, view.recommended ? 0.9 : 0.5);
        view.sprite.setAlpha(view.recommended ? 1 : 0.76);
        view.ambientGlow?.setAlpha(view.recommended ? 0.04 : 0.008);
        view.shell.setStrokeStyle(1, LILAC, view.recommended ? 0.68 : 0.26);
        view.capacitySlots.forEach((slot, slotIndex) => {
          const charged = slotIndex < carrying;
          slot.setFillStyle(charged ? LILAC : 0x1b1f2b, charged ? 0.86 : 1)
            .setStrokeStyle(1, LILAC, view.recommended ? 0.8 : 0.32).setAlpha(0);
        });
        return;
      }

      const demand = demandForDistrict(this.state, view.node.district);
      const voltage = this.state.districtVoltages?.[view.node.district] || 0;
      const served = voltage > 0.08;
      const voltageSag = voltage > 0 && voltage <= 0.52;
      const state = this.terminalPreview?.district === view.node.district
        ? this.terminalPreview.state
        : demand ? (demand.remainingMs < 8000 ? 'urgent' : demand.maintenance ? 'low-voltage' : 'calling') : served ? 'served' : 'idle';
      const visuallyServed = (served && !demand) || state === 'served';
      view.terminalState = state;
      const missed = state === 'missed';
      const terminalColor = state === 'urgent' ? ALERT : voltageSag ? LILAC : served || view.recommended ? CYAN : missed ? 0x555862 : DRAWING_INK;
      view.lived.setAlpha(served ? 0.12 + voltage * 0.25 : 0).setFillStyle(served ? ICE : 0x252b39, served ? 0.2 + voltage * 0.18 : 0);
      view.indicator.setFillStyle(terminalColor, served || demand ? 0.55 : 0.08);
      view.shell.setStrokeStyle(1, terminalColor, state === 'urgent' ? 0.55 : demand || served || missed ? 0.18 : 0.04);
      view.core.setFillStyle(served ? 0x256f72 : view.recommended ? 0x214e57 : demand ? (state === 'urgent' ? 0x491b2b : 0x202735) : 0x20242e, 1)
        .setStrokeStyle(1, terminalColor, demand || served ? 0.95 : 0.3);
      view.symbol.setAlpha(missed ? 0.18 : demand || served ? 1 : 0.32);
      view.urgentBrackets.forEach((bracket) => bracket.setVisible(false));
      view.failureMark.setVisible(missed);
      const required = demand?.units || (served ? view.lastDemandUnits || 1 : 0);
      const activelyPowering = state === 'entry-powered'
        || (this.state.node === view.index && this.interactionHold > 0 && this.interactionAtNode()?.available !== false);
      setLineArtTone(view, terminalColor, visuallyServed ? 0.95 : demand ? 0.8 : 0.38);
      view.sprite.setAlpha(missed ? 0.48 : demand || served ? 1 : 0.72);
      view.entryLights.forEach((light) => light.setAlpha(visuallyServed ? 0.24 + voltage * 0.66 : activelyPowering ? 0.78 : 0));
      view.poweredLights.forEach((light) => light.setAlpha(visuallyServed ? 0.12 + voltage * 0.7 : 0));
      view.ambientGlow?.setAlpha(visuallyServed ? 0.012 + voltage * 0.043 : activelyPowering ? 0.036 : view.recommended ? 0.02 : 0);
      view.demandPulse.setAlpha(activelyPowering ? 0.9 : 0);
      view.capacitySlots.forEach((slot, slotIndex) => {
        const used = slotIndex < required;
        slot.setVisible(used).setFillStyle(visuallyServed ? CYAN : carrying > slotIndex && demand ? 0x397f83 : 0x171922, used ? 1 : 0)
          .setStrokeStyle(1, visuallyServed ? CYAN : terminalColor, used ? 0.86 : 0);
      });
    });

    this.edgeViews.forEach((edge) => {
      const active = this.travel && ((edge.a === this.travel.from && edge.b === this.travel.to) || (edge.b === this.travel.from && edge.a === this.travel.to));
      edge.glow.setAlpha(active ? 0.14 : this.state.mode === 'intermission' || this.state.mode === 'won' ? 0.5 : 0.035);
    });
  }

  updateCurrentFluid() {
    const glow = this.currentFluidGlow;
    const body = this.currentFluidBody;
    const filament = this.currentFluidFilament;
    if (!glow || !body || !filament) return;
    [glow, body, filament].forEach((graphics) => graphics.clear());
    this.fluidDroplets.forEach((droplet) => droplet.setAlpha(0));

    const arrivalFlow = this.travel ? null : this.arrivalFlow;
    const arrivalMix = arrivalFlow
      ? Phaser.Math.Clamp((this.visualTimeMs - arrivalFlow.startedAt) / 180, 0, 1)
      : 0;
    const arrivalEase = arrivalMix * arrivalMix * (3 - 2 * arrivalMix);
    const stationaryAlpha = arrivalFlow ? arrivalEase : 1;

    if (!this.travel) {
      const connected = this.edgeViews.filter((edge) => edge.base.visible && (edge.a === this.state.node || edge.b === this.state.node));
      connected.forEach((edge, edgeIndex) => {
        const route = edge.a === this.state.node ? edge.route : edge.reverseRoute;
        const fullReach = 0.14 + (Math.sin(this.visualTimeMs / 240 + edgeIndex * 1.7) + 1) * 0.035;
        const reach = fullReach * (0.45 + stationaryAlpha * 0.55);
        const samples = [];
        for (let step = 0; step <= 18; step += 1) samples.push(pointAlongRoute(route, reach * step / 18));
        const stroke = (graphics, width, color, alpha) => {
          graphics.lineStyle(width, color, alpha);
          graphics.beginPath();
          graphics.moveTo(samples[0].x, samples[0].y);
          for (let index = 1; index < samples.length; index += 1) graphics.lineTo(samples[index].x, samples[index].y);
          graphics.strokePath();
        };
        const breath = (Math.sin(this.visualTimeMs / 105 + edgeIndex) + 1) * 0.5;
        stroke(glow, 5.5 + breath, CYAN, 0.1 * stationaryAlpha);
        stroke(body, 2.1 + breath * 0.3, CYAN, 0.65 * stationaryAlpha);
        stroke(filament, 0.85, 0xe9ffff, 0.78 * stationaryAlpha);
      });
      glow.fillStyle(CYAN, 0.08 * stationaryAlpha).fillCircle(this.pulse.x, this.pulse.y, 10);
      body.fillStyle(CYAN, 0.28 * stationaryAlpha).fillCircle(this.pulse.x, this.pulse.y, 6);
      filament.fillStyle(0xdffffd, 0.82 * stationaryAlpha).fillCircle(this.pulse.x + 1.5, this.pulse.y - 1, 2);
      if (!arrivalFlow) return;
      this.pulse.setRotation(Phaser.Math.Linear(arrivalFlow.rotation, 0, arrivalEase));
      if (arrivalMix >= 1) {
        this.arrivalFlow = null;
        this.pulse.setRotation(0);
        return;
      }
    }

    const activeFlow = this.travel || arrivalFlow;
    const movingAlpha = arrivalFlow ? 1 - arrivalEase : 1;
    const head = this.travel ? this.travel.visualProgress || 0 : 1;
    const baseWakeTail = Math.max(0, head - 0.34);
    const wakeTail = arrivalFlow ? Phaser.Math.Linear(baseWakeTail, 1, arrivalEase) : baseWakeTail;
    const wakeFront = Math.min(1, head + 0.34);
    const sampleRoute = () => {
      const samples = [];
      for (let step = 0; step <= 40; step += 1) {
        const t = step / 40;
        const progress = Phaser.Math.Linear(wakeTail, wakeFront, t);
        samples.push(pointAlongRoute(activeFlow.route, progress));
      }
      return samples;
    };
    const offsetRoute = (samples, offset, phase) => samples.map((point, index) => {
        const t = index / (samples.length - 1);
        const before = samples[Math.max(0, index - 1)];
        const after = samples[Math.min(samples.length - 1, index + 1)];
        const dx = after.x - before.x;
        const dy = after.y - before.y;
        const magnitude = Math.max(0.001, Math.hypot(dx, dy));
        const envelope = Math.sin(Math.PI * t);
        const ripple = 0.72 + Math.sin(t * Math.PI * 3 + this.visualTimeMs / 165 + phase) * 0.28;
        return {
          x: point.x + (-dy / magnitude) * offset * envelope * ripple,
          y: point.y + (dx / magnitude) * offset * envelope * ripple,
        };
      });
    const stroke = (graphics, samples, width, color, alpha) => {
      graphics.lineStyle(width, color, alpha);
      graphics.beginPath();
      graphics.moveTo(samples[0].x, samples[0].y);
      for (let index = 1; index < samples.length; index += 1) graphics.lineTo(samples[index].x, samples[index].y);
      graphics.strokePath();
    };
    const surge = (Math.sin(this.visualTimeMs / 85) + 1) * 0.5;
    const center = sampleRoute();
    const upperWake = offsetRoute(center, 4.5 + this.state.carriedUnits * 0.35, 0);
    const lowerWake = offsetRoute(center, -(3.6 + this.state.carriedUnits * 0.3), Math.PI * 0.65);
    stroke(glow, center, 7 + surge, CYAN, 0.12 * movingAlpha);
    stroke(body, center, 2.7 + this.state.carriedUnits * 0.2 + surge * 0.25, CYAN, 0.86 * movingAlpha);
    stroke(filament, center, 0.9, 0xe9ffff, 0.92 * movingAlpha);
    stroke(filament, upperWake, 1.15, 0xcafffb, 0.82 * movingAlpha);
    stroke(filament, lowerWake, 1.05, 0xcafffb, 0.72 * movingAlpha);

    this.fluidDroplets.forEach((droplet, index) => {
      const progress = Math.max(0, wakeTail - 0.012 * (index + 1));
      const point = pointAlongRoute(activeFlow.route, progress);
      droplet.setPosition(point.x, point.y).setAlpha((0.32 - index * 0.1) * movingAlpha);
    });
  }

  updateStationAnimation(dt) {
    const time = this.visualTimeMs;
    this.stationLights.forEach((light) => {
      const wave = (Math.sin(time / 420 + light.phase) + 1) / 2;
      light.object.setAlpha(Phaser.Math.Linear(light.low, light.high, wave));
    });

    this.mechanicalParts.forEach((part) => {
      const view = this.nodeViews[part.nodeIndex];
      const active = view?.recommended || this.state.node === part.nodeIndex || this.state.travellingTo === part.nodeIndex;
      if (part.kind === 'lever') {
        const target = active ? 0.42 : -0.42;
        part.current = Phaser.Math.Linear(part.current, target, Math.min(1, dt / 120));
        part.object.setRotation(part.current);
      } else if (part.kind === 'piston') {
        const amplitude = active && this.interactionHold > 0 ? 8 : 2;
        part.object.y = part.baseY + Math.sin(time / 90 + part.phase) * amplitude;
      }
    });

    this.nodeViews.forEach((view) => {
      if (view.node.kind === 'junction') return;
      const urgent = view.terminalState === 'urgent';
      const frequency = urgent ? 82 : 210;
      const wave = (Math.sin(time / frequency + view.index * 0.41) + 1) / 2;
      if (view.node.kind === 'district' && (view.terminalState === 'calling' || urgent)) {
        view.capacitySlots.forEach((slot) => slot.setAlpha(0.5 + wave * (urgent ? 0.5 : 0.28)));
        view.urgentBrackets.forEach((bracket) => bracket.setAlpha(urgent ? 0.45 + wave * 0.55 : 0));
      }
      if (view.node.kind === 'source' && view.recommended) view.core.setAlpha(0.55 + wave * 0.45);
      if (view.node.kind === 'source' && view.rotor) {
        view.rotor.rotation = time / 720;
        view.rotor.setAlpha(view.recommended ? 0.9 : 0.36);
      }
      if (view.node.kind === 'transformer') {
        view.flowParticles.forEach((particle, particleIndex) => {
          const phase = ((time / 820) + particleIndex / view.flowParticles.length) % 1;
          particle.y = -18 - phase * 105;
          particle.setAlpha((view.recommended ? 0.46 : 0.16) + Math.sin(phase * Math.PI) * 0.5);
        });
      }
      if (view.node.kind === 'district' && view.demandPulse?.alpha > 0) {
        const phase = (time / 520) % 1;
        view.demandPulse.x = view.demandKind === 'car' ? 42 - phase * 35 : -34 + phase * 18;
        view.demandPulse.y = view.demandKind === 'car' ? -27 + Math.sin(phase * Math.PI) * 4 : -18;
      }
    });

    this.edgeViews.forEach((edge) => {
      const available = edge.base.visible;
      const active = available && this.travel
        && ((edge.a === this.travel.from && edge.b === this.travel.to) || (edge.b === this.travel.from && edge.a === this.travel.to));
      edge.beads.forEach((bead, index) => {
        bead.setVisible(false);
      });
    });

    const pulseWave = 0.9 + Math.sin(time / 105) * 0.1;
    this.pulseCore.setScale(1 + Math.sin(time / 130) * 0.06, pulseWave);
    this.pulseTail.setScale(0.96 + Math.sin(time / 115) * 0.08, 0.88 + Math.sin(time / 92) * 0.1);
    this.pulseMembrane.setScale(1 + Math.sin(time / 140) * 0.05, 0.92 + Math.sin(time / 110) * 0.05);
    this.pulseAfterimages.forEach((afterimage, index) => {
      afterimage.x = -12 + index * 5 - Math.sin(time / 95 + index) * 1.2;
      afterimage.y = Math.sin(time / 120 + index * 1.7) * 1.2;
      afterimage.setAlpha(0.16 + index * 0.12 + Math.sin(time / 120 + index) * 0.035);
    });
    this.updateCurrentFluid();
  }

  update(time, delta) {
    if (!this.state) return;
    const dt = Math.min(delta, 50);
    this.visualTimeMs += dt;
    if (this.state.mode === 'playing') {
      const extras = { role: this.state.role, artifactReady: this.state.artifactReady, artifactTaken: this.state.artifactTaken, storyBeats: this.state.storyBeats, node: this.state.node, travellingTo: this.state.travellingTo };
      this.state = Object.assign(tickDistrictDemand(this.state, dt), extras);
      this.handleMovement();
      this.handleTravel(dt);
      this.handleInteraction(dt);
    } else {
      this.interactionHold = 0;
      this.updateLossRestart(dt);
      if (this.state.mode === 'intermission' && Phaser.Input.Keyboard.JustDown(this.keys.enter)) this.startNextRound();
      if (this.state.artifactReady && (Phaser.Input.Keyboard.JustDown(this.keys.interact) || Phaser.Input.Keyboard.JustDown(this.keys.enter))) this.takeArtifact();
    }
    this.presentOutcome();
    this.updateHud();
    this.syncArtState();
    this.updateCargo();
    this.updateStationAnimation(dt);
  }

  handleMovement() {
    if (Phaser.Input.Keyboard.JustDown(this.keys.left) || Phaser.Input.Keyboard.JustDown(this.keys.a)) this.chooseDirection(-1, 0);
    if (Phaser.Input.Keyboard.JustDown(this.keys.right) || Phaser.Input.Keyboard.JustDown(this.keys.d)) this.chooseDirection(1, 0);
    if (Phaser.Input.Keyboard.JustDown(this.keys.up) || Phaser.Input.Keyboard.JustDown(this.keys.w)) this.chooseDirection(0, -1);
    if (Phaser.Input.Keyboard.JustDown(this.keys.down) || Phaser.Input.Keyboard.JustDown(this.keys.s)) this.chooseDirection(0, 1);
  }

  handleTravel(dt) {
    if (!this.travel) return;
    this.travel.elapsed += dt;
    const t = Phaser.Math.Clamp(this.travel.elapsed / this.travel.duration, 0, 1);
    const eased = Phaser.Math.Easing.Sine.InOut(t);
    const point = pointAlongRoute(this.travel.route, eased);
    const ahead = pointAlongRoute(this.travel.route, Math.min(1, eased + 0.02));
    this.pulse.setPosition(point.x, point.y).setRotation(Math.atan2(ahead.y - point.y, ahead.x - point.x));
    this.travel.visualProgress = eased;
    this.aura.setPosition(this.pulse.x, this.pulse.y);
    if (t >= 1) {
      const finishedTravel = this.travel;
      this.state.node = finishedTravel.to;
      this.state.travellingTo = null;
      this.arrivalFlow = {
        route: finishedTravel.route,
        rotation: this.pulse.rotation,
        startedAt: this.visualTimeMs,
      };
      this.travel = null;
    }
  }

  handleInteraction(dt) {
    const action = this.interactionAtNode();
    const holding = this.keys.interact.isDown || this.keys.enter.isDown;
    if (!action || action.available === false || !holding) {
      this.interactionHold = 0;
      return;
    }
    this.interactionHold += dt;
    if (this.interactionHold >= HOLD_MS) {
      this.interactionHold = 0;
      this.completeInteraction(action);
    }
  }

  updateCargo() {
    this.cargoOrbs.forEach((cell, index) => {
      cell.setPosition(this.pulse.x + (index - 1) * 10, this.pulse.y + 17);
    });
    this.aura.setPosition(this.pulse.x, this.pulse.y).setScale(0.9 + Math.sin(this.visualTimeMs / 120) * 0.08);
  }

  updateHud() {
    const round = currentRoundSpec(this.state);
    this.roundText.setText(`R${round.number} / 3`);
    this.timerText.setText(clock(this.state.remainingMs));
    const remainingRatio = Phaser.Math.Clamp(this.state.remainingMs / round.durationMs, 0, 1);
    const timerUrgent = this.state.mode === 'playing' && this.state.remainingMs <= 10_000;
    const urgencyWave = (Math.sin(this.visualTimeMs / 115) + 1) * 0.5;
    this.timerText.setColor(timerUrgent ? '#ff7f95' : '#f4f7ff').setScale(timerUrgent ? 1 + urgencyWave * 0.055 : 1);
    this.timerUrgencyBar.setDisplaySize(Math.max(5, 126 * remainingRatio), timerUrgent ? 5 : 3)
      .setFillStyle(timerUrgent ? ALERT : CYAN, timerUrgent ? 0.9 : 0.72);
    this.scoreText.setText(`${this.state.roundCompleted}/${round.demands.length}${this.state.failures ? `   ×${this.state.failures}` : ''}`);
    this.cargoText.setText(`${'●'.repeat(this.state.carriedUnits)}${'○'.repeat(3 - this.state.carriedUnits)}`);
    const cards = this.state.active.slice(0, 4).map((demand) => {
      const district = DISTRICTS.find((item) => item.id === demand.district);
      const urgencyRatio = Phaser.Math.Clamp(demand.remainingMs / (demand.initialMs || 26_000), 0, 1);
      const urgencyLevel = urgencyRatio < 0.28 ? 3 : urgencyRatio < 0.58 ? 2 : 1;
      const urgent = urgencyLevel === 3;
      const affordable = demand.units <= this.state.carriedUnits;
      const stateColor = urgent ? ALERT : urgencyLevel === 2 ? LILAC : affordable ? CYAN : ICE;
      return { demand, district, urgencyLevel, urgent, affordable, stateColor };
    });
    const cardSignature = cards.map(({ demand, urgencyLevel, affordable }) => `${demand.id}:${demand.units}:${urgencyLevel}:${affordable ? 1 : 0}:${demand.maintenance ? 1 : 0}`).join('|');
    if (cardSignature !== this.orderCardSignature) {
      this.orderCardSignature = cardSignature;
      this.orders.removeAll(true);
      this.orderCardViews = cards.map(({ demand, district, urgencyLevel, urgent, affordable, stateColor }, index) => {
        const card = this.add.container(index * 66, 0);
        const plate = this.add.rectangle(0, 0, 62, 74, 0x05070d, 0.78).setOrigin(0, 0).setStrokeStyle(1.5, stateColor, urgent ? 0.76 : 0.5);
        const icon = this.add.image(9, 9, demandIconTexture(districtArtId(demand.district))).setOrigin(0, 0).setDisplaySize(22, 22);
        const pips = [0, 1, 2].map((slot) => this.add.rectangle(38 + slot * 6, 12, 4, 11, slot < demand.units ? stateColor : GRAPHITE, 1)
          .setOrigin(0, 0).setStrokeStyle(1, stateColor, slot < demand.units ? 0.95 : 0.18));
        const urgencyBars = [0, 1, 2].map((slot) => {
          const lit = slot < urgencyLevel;
          return this.add.rectangle(10 + slot * 14, 47 - slot * 4, 9, 9 + slot * 4, lit ? stateColor : GRAPHITE, lit ? 0.82 : 0.32)
            .setOrigin(0, 1).setStrokeStyle(1, stateColor, lit ? 0.9 : 0.16);
        });
        const code = this.add.text(9, 55, `${district.code}${demand.maintenance ? '  ↻' : ''}`, {
          fontFamily: 'monospace', fontSize: '10px', color: urgent ? '#ff91a4' : urgencyLevel === 2 ? '#d6c7ff' : affordable ? '#8cf8f4' : '#d8dff0',
        });
        card.add([plate, icon, ...pips, ...urgencyBars, code]);
        this.orders.add(card);
        return { plate, stateColor, urgent };
      });
    }
    const criticalPulse = 0.68 + (Math.sin(this.visualTimeMs / 85) + 1) * 0.16;
    this.orderCardViews.forEach(({ plate, stateColor, urgent }) => plate.setStrokeStyle(1.5, stateColor, urgent ? criticalPulse : 0.5));
    const action = this.interactionAtNode();
    if (this.state.mode === 'playing' && action && !action.prompt.startsWith('NO CALL')) {
      const progress = Math.round((this.interactionHold / HOLD_MS) * 6);
      this.interactText.setText(`${action.prompt}${progress ? `  ${'▰'.repeat(progress)}${'▱'.repeat(6 - progress)}` : ''}`).setAlpha(1);
    } else if (this.state.mode === 'lost') this.interactText.setText('GRID DROPPED · RECOVERING THIS ROUND').setAlpha(1);
    else if (this.state.mode === 'intermission') this.interactText.setText('EVERY CALL ANSWERED · ENTER FOR NEXT ROUND').setAlpha(1);
    else if (this.state.artifactReady) this.interactText.setText('E / ENTER · TAKE THE BYPASS COIL').setAlpha(1);
    else this.interactText.setAlpha(0);
  }

  presentOutcome() {
    if (this.state.mode === 'playing') {
      this.roundPresented = false;
      return;
    }
    if (this.roundPresented) return;
    this.roundPresented = true;
    if (this.state.mode === 'lost') {
      this.lossRestartRemainingMs = LOSS_RESTART_DELAY_MS;
      this.showCaption('THE GRID DROPPED. THIS ROUND WILL RECOVER.', 2300);
    }
    if (this.state.mode === 'intermission') this.showRoundSummary();
    if (this.state.mode === 'won') this.finish();
  }

  showRoundSummary() {
    this.edgeViews.forEach((edge) => edge.glow.setAlpha(0.64));
    this.nodeViews.filter((view) => view.index <= currentRoundSpec(this.state).lastNode).forEach((view) => view.core.setFillStyle(CYAN, 1));
    this.showCaption(`ROUND ${currentRoundSpec(this.state).number} COMPLETE · EVERY OPEN LINE TURNS BLUE`, 5200);
  }

  restartCurrentRound() {
    if (!this.state || this.state.mode === 'won') return;
    const extras = { role: this.state.role, artifactReady: false, artifactTaken: false, storyBeats: this.state.storyBeats, node: 0, travellingTo: null };
    this.state = Object.assign(restartDistrictRound(this.state), extras);
    this.travel = null;
    this.arrivalFlow = null;
    this.lossRestartRemainingMs = null;
    this.pulse.setPosition(NODES[0].x, NODES[0].y);
    this.aura.setPosition(NODES[0].x, NODES[0].y);
    this.roundPresented = false;
    this.showCaption(`ROUND ${currentRoundSpec(this.state).number} RESTARTED`, 1900);
  }

  updateLossRestart(dt) {
    if (this.state?.mode !== 'lost' || this.lossRestartRemainingMs === null) return;
    this.lossRestartRemainingMs = Math.max(0, this.lossRestartRemainingMs - dt);
    if (this.lossRestartRemainingMs === 0) this.restartCurrentRound();
  }

  startNextRound() {
    if (this.state.mode !== 'intermission') return;
    const extras = { role: this.state.role, artifactReady: false, artifactTaken: false, storyBeats: this.state.storyBeats, node: 0, travellingTo: null };
    this.state = Object.assign(advanceDistrictRound(this.state), extras);
    this.travel = null;
    this.arrivalFlow = null;
    this.pulse.setPosition(NODES[0].x, NODES[0].y);
    this.aura.setPosition(NODES[0].x, NODES[0].y);
    this.roundPresented = false;
    this.syncRoundStations();
    const round = currentRoundSpec(this.state);
    this.showCaption(round.number === 3
      ? 'ROUND 3 · FULL GRID · CROSS-LINKS LIVE · 10 CALLS'
      : `ROUND ${round.number} · MORE OF THE CITY OPENS`, 3200);
  }

  finish() {
    if (this.state.artifactReady) return;
    this.state.mode = 'won';
    this.showCaption('EVERY CALL ANSWERED. THE GRID LEAVES ONE COIL BEHIND.', 4300);
    this.time.delayedCall(950, () => this.revealArtifact());
  }

  revealArtifact() {
    if (this.state.artifactReady) return;
    this.state.artifactReady = true;
    this.artifactView = this.add.container(this.pulse.x + 78, this.pulse.y - 44).setDepth(55);
    const halo = this.add.circle(0, 0, 34, CYAN, 0.12).setBlendMode(Phaser.BlendModes.ADD);
    const coil = this.add.graphics();
    coil.lineStyle(5, LILAC, 1);
    coil.strokeCircle(0, 0, 19);
    coil.lineStyle(2, CYAN, 1);
    coil.strokeCircle(0, 0, 10);
    this.artifactView.add([halo, coil]);
    this.tweens.add({ targets: halo, scale: 1.25, alpha: 0.04, duration: 900, yoyo: true, repeat: -1 });
  }

  takeArtifact() {
    if (!this.state?.artifactReady || this.state.artifactTaken) return;
    this.state.artifactTaken = true;
    this.state.event = 'artifact-taken';
    if (this.artifactView) this.tweens.add({ targets: this.artifactView, alpha: 0, y: this.artifactView.y - 30, duration: 480 });
    this.showCaption('THREE-DISTRICT BYPASS COIL · FILE IT IN THE MUSEUM', 3800);
    this.time.delayedCall(850, () => this.onArchiveComplete?.());
  }

  showCaption(text, duration = 2200) {
    if (!this.caption) return;
    this.caption.setText(text).setAlpha(1);
    this.tweens.killTweensOf(this.caption);
    this.tweens.add({ targets: this.caption, alpha: 0, delay: duration, duration: 520 });
  }

  toggleFullscreen() {
    if (this.scale.isFullscreen) this.scale.stopFullscreen();
    else this.scale.startFullscreen();
  }

  focusArtifactForQa() {
    if (!this.state.artifactReady) this.revealArtifact();
    this.cameras.main.stopFollow();
    this.cameras.main.centerOn(this.artifactView?.x || this.pulse.x, this.artifactView?.y || this.pulse.y);
  }

  jumpToRoundForQa(roundNumber) {
    while (this.state.roundIndex < roundNumber - 1) {
      this.state.mode = 'intermission';
      this.state = Object.assign(advanceDistrictRound(this.state), { role: 'grid-runner', artifactReady: false, artifactTaken: false, storyBeats: this.state.storyBeats, node: 0, travellingTo: null });
    }
    this.syncRoundStations();
  }

  focusNodeForQa(index) {
    if (!NODES[index]) return;
    this.state.node = index;
    this.travel = null;
    this.arrivalFlow = null;
    this.pulse.setPosition(NODES[index].x, NODES[index].y);
    this.aura.setPosition(NODES[index].x, NODES[index].y);
    this.cameras.main.centerOn(NODES[index].x, NODES[index].y);
  }

  forceLossForQa() {
    this.state.mode = 'lost';
    this.state.failures = MAX_FAILURES;
    this.roundPresented = false;
    this.presentOutcome();
    this.updateHud();
    this.syncArtState();
  }

  previewTerminalStateForQa(district, state) {
    this.terminalPreview = { district, state };
    this.syncArtState();
  }

  completeCurrentRoundForQa() {
    const round = currentRoundSpec(this.state);
    this.state.nextDemand = round.demands.length;
    this.state.active = [];
    this.state.roundCompleted = round.demands.length;
    this.state.completed = this.state.roundStartCompleted + round.demands.length;
    this.state.roundServedDistricts = [...round.stations];
    this.state.servedDistricts = [...new Set([...this.state.servedDistricts, ...round.stations])];
    this.state.mode = this.state.roundIndex === ROUND_SPECS.length - 1 ? 'won' : 'intermission';
    this.roundPresented = false;
    this.presentOutcome();
  }

  advanceTime(ms) {
    let remaining = Math.max(0, ms);
    while (remaining > 0) {
      const dt = Math.min(50, remaining);
      this.visualTimeMs += dt;
      if (this.state.mode === 'playing') {
        const extras = { role: this.state.role, artifactReady: this.state.artifactReady, artifactTaken: this.state.artifactTaken, storyBeats: this.state.storyBeats, node: this.state.node, travellingTo: this.state.travellingTo };
        this.state = Object.assign(tickDistrictDemand(this.state, dt), extras);
        this.handleMovement();
        this.handleTravel(dt);
        this.handleInteraction(dt);
      } else this.updateLossRestart(dt);
      this.presentOutcome();
      this.updateHud();
      this.syncArtState();
      this.updateCargo();
      this.updateStationAnimation(dt);
      remaining -= dt;
    }
  }

  renderToText() {
    const round = currentRoundSpec(this.state);
    const visualCue = this.nextVisualCue();
    return {
      scene: 'borrowed-grid-current',
      role: this.state.role,
      round: round.number,
      mode: this.state.mode,
      timeRemainingMs: Math.round(this.state.remainingMs),
      node: this.state.node,
      travellingTo: this.state.travellingTo,
      carriedUnits: this.state.carriedUnits,
      failures: this.state.failures,
      autoRestartMs: this.state.mode === 'lost' ? Math.ceil(this.lossRestartRemainingMs || 0) : null,
      callsCompleted: this.state.roundCompleted,
      callsRequired: round.demands.length,
      activeDemands: this.state.active.map((demand) => ({
        district: demand.district,
        units: demand.units,
        maintenance: Boolean(demand.maintenance),
        urgency: demand.remainingMs < 8000 ? 'critical' : demand.remainingMs < (demand.initialMs || 26_000) * 0.58 ? 'strained' : 'steady',
        remainingMs: Math.round(demand.remainingMs),
      })),
      districtVoltages: Object.fromEntries(Object.entries(this.state.districtVoltages || {}).map(([district, voltage]) => [district, Number(voltage.toFixed(2))])),
      maintenanceCompleted: this.state.maintenanceCompleted || 0,
      openLastNode: round.lastNode,
      storyBeats: [...this.state.storyBeats],
      artifactReady: this.state.artifactReady,
      artifactTaken: this.state.artifactTaken,
      background: 'original-door2-cyberpunk-chunks',
      foregroundArt: 'minimal-hand-drawn-grid-over-original-city',
      routeCorners: 'quadratic-rounded-24px-shared-by-current-and-glow',
      currentBody: 'thin-bidirectional-route-wakes-with-stationary-branch-flow',
      interactionGrammar: {
        source: 'hand-drawn-circular-feed-coil',
        junction: 'quiet-hollow-ring',
        transformer: 'hand-drawn-three-stage-step-up-coil',
        district: 'hand-drawn-flying-car-or-cutaway-home',
        demandStates: 'dim-waiting-cable-live-fully-lit',
        playerCharge: 'three-fixed-cells-below-current',
      },
      nextVisualCue: visualCue,
      interaction: this.interactionAtNode(),
      animatedLayers: ['pipe-bound-current-fluid', 'line-current-flow', 'feed-coil', 'transformer-rise', 'district-power-lights'],
    };
  }
}
