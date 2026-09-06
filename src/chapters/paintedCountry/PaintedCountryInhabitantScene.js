import Phaser from 'phaser';
import { PAPER } from './paperPalette.js';
import { buildPaperGrain, draftLine, draftRect, hatchRect, makeRandom, paintedFill } from './paperSurface.js';
import {
  createPaintedCountryInflationModel,
  INFLATION_PIGMENT,
  INFLATION_SLOT_CAPACITY,
} from './paintedCountryInflationModel.js';

export const PAINTED_COUNTRY_INHABITANT_VIEW = Object.freeze({ w: 960, h: 600 });
const WORLD = Object.freeze({ w: 3380, h: 600 });
const GROUND_Y = 462;
const MOVE_SPEED = 190;
const BRUSH_REACH = 210;

const PIGMENT_COLOR = Object.freeze({
  [INFLATION_PIGMENT.GOLD]: PAPER.amber,
  [INFLATION_PIGMENT.INDIGO]: PAPER.indigo,
  [INFLATION_PIGMENT.VERDIGRIS]: PAPER.verdigris,
});

const MONEY_STOPS = Object.freeze([
  { id: 'bread-home', x: 604, good: 'BREAD', color: PAPER.amber },
  { id: 'medicine-home', x: 790, good: 'MEDICINE', color: PAPER.indigo },
  { id: 'timber-home', x: 970, good: 'TIMBER', color: PAPER.verdigris },
]);

const SITES = Object.freeze([
  { id: 'mill-wheel', x: 1420, color: PAPER.indigo, needs: ['grain-mark', 'broken-gear'] },
  { id: 'water-pump', x: 2200, color: PAPER.verdigris, needs: ['dry-channel', 'pump-seal'] },
  { id: 'freight-cart', x: 2940, color: PAPER.bookCloth, needs: ['axle-mark', 'road-mark'] },
]);

const SCRAPS = Object.freeze([
  { id: 'grain-mark', x: 1130, y: 420, color: PAPER.indigo, line: 'THE GRANARY IS FULL. THE MILLSTONE DOES NOT TURN.' },
  { id: 'broken-gear', x: 1260, y: 394, color: PAPER.indigo, line: 'A BROKEN TOOTH STOPPED EVERY SACK AT ONCE.' },
  { id: 'dry-channel', x: 1790, y: 414, color: PAPER.verdigris, line: 'THE HERBS HAVE SEED. THE CHANNEL HAS NO WATER.' },
  { id: 'pump-seal', x: 2030, y: 392, color: PAPER.verdigris, line: 'THE PUMP LOSES EACH CUP BEFORE IT REACHES THE FIELD.' },
  { id: 'axle-mark', x: 2470, y: 416, color: PAPER.bookCloth, line: 'THE CART IS LOADED. ITS AXLE IS IN TWO PIECES.' },
  { id: 'road-mark', x: 2720, y: 390, color: PAPER.bookCloth, line: 'GOODS WAIT HERE WHILE EMPTY STALLS WAIT THERE.' },
]);

const HOLES = Object.freeze([
  { x0: 1660, x1: 1730 },
  { x0: 2360, x1: 2440 },
]);

const REPAIR_LINES = Object.freeze({
  'mill-wheel': 'THE MILL TURNS. THE SAME COINS NOW MEET MORE BREAD.',
  'water-pump': 'WATER REACHES THE HERBS BEFORE ANOTHER WISH IS DRAWN.',
  'freight-cart': 'THE CART MOVES WHAT THE MARKET ALREADY HAD.',
});

export class PaintedCountryInhabitantScene extends Phaser.Scene {
  constructor() {
    super('PaintedCountryInhabitant');
  }

  create() {
    this.rnd = makeRandom(0x4c17);
    this.fable = createPaintedCountryInflationModel();
    this.state = this.fable.state;
    Object.assign(this.state, {
      falls: 0, checkpoint: 150, ending: false, artifactReady: false, artifactTaken: false,
    });
    this.player = { x: 150, y: GROUND_Y, vy: 0, onGround: true };
    this.cameras.main.setBounds(0, 0, WORLD.w, WORLD.h);
    this.cameras.main.setBackgroundColor(PAPER.sheetHigh);

    this.buildSheet();
    this.buildCountry();
    this.buildPainterAndMarket();
    this.buildSites();
    this.buildPeople();
    this.buildPlayer();
    this.buildBrushInteraction();
    this.buildAtmosphere();

    this.keys = this.input.keyboard.addKeys({
      left: 'LEFT', right: 'RIGHT', a: 'A', d: 'D',
      up: 'UP', w: 'W', space: 'SPACE',
    });
    this.input.keyboard.addCapture(['LEFT', 'RIGHT', 'UP', 'SPACE']);
    this.input.keyboard.on('keydown-E', () => this.interact());
    this.input.keyboard.on('keydown-ENTER', () => this.interact());
    this.input.mouse?.disableContextMenu();

    this.cameraTarget = this.add.zone(this.player.x, this.player.y - 100, 2, 2);
    this.cameras.main.startFollow(this.cameraTarget, true, 0.08, 0.08);
    this.cameras.main.setDeadzone(260, 160);

    this.number = this.add.text(34, 28, '4', {
      fontFamily: 'Georgia, serif', fontSize: '32px', color: '#4a4640',
    }).setScrollFactor(0).setDepth(90).setAlpha(0.55);
    this.controls = this.add.text(PAINTED_COUNTRY_INHABITANT_VIEW.w - 22, PAINTED_COUNTRY_INHABITANT_VIEW.h - 18, 'A/D · SPACE · LEFT PAINT · RIGHT WASH', {
      fontFamily: 'ui-monospace, monospace', fontSize: '9px', color: '#8d8579', letterSpacing: 1.4,
    }).setOrigin(1, 1).setScrollFactor(0).setDepth(90).setAlpha(0.62);
    this.caption = this.add.text(PAINTED_COUNTRY_INHABITANT_VIEW.w / 2, 34, '', {
      fontFamily: 'ui-monospace, monospace', fontSize: '11px', color: '#4a4640',
      backgroundColor: '#f7f4ecd9', padding: { x: 13, y: 7 }, align: 'center',
      wordWrap: { width: 720 },
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(92).setAlpha(0);
    this.endingText = this.add.text(PAINTED_COUNTRY_INHABITANT_VIEW.w / 2, PAINTED_COUNTRY_INHABITANT_VIEW.h / 2, '', {
      fontFamily: 'Georgia, serif', fontSize: '29px', color: '#3d524a', align: 'center', letterSpacing: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(95).setAlpha(0);
    this.artifactView = this.add.container(2860, GROUND_Y - 112).setDepth(96).setAlpha(0);
    const fold = this.graphics(0);
    fold.fillStyle(PAPER.kraft, 0.95).fillTriangle(-42, 5, 0, -42, 42, 5);
    fold.fillStyle(PAPER.sheetMid, 1).fillTriangle(-34, 5, 0, 42, 0, 5);
    fold.fillStyle(PAPER.sheet, 1).fillTriangle(34, 5, 0, 42, 0, 5);
    fold.lineStyle(4, PAPER.cyan, 0.95).strokeCircle(0, 7, 31);
    this.artifactPrompt = this.add.text(0, 62, 'E', {
      fontFamily: 'ui-monospace, monospace', fontSize: '15px', color: '#4a4640',
      backgroundColor: '#f7f4ece8', padding: { x: 10, y: 5 },
    }).setOrigin(0.5);
    this.artifactView.add([fold, this.artifactPrompt]);
    this.time.delayedCall(500, () => this.showCaption('WASH COLOR INTO THE BRUSH.  LET THE BRUSH FIND ITS FORM.', 4200));
  }

  graphics(depth) {
    return this.add.graphics().setDepth(depth);
  }

  buildSheet() {
    const g = this.graphics(0);
    g.fillStyle(PAPER.sheet, 1).fillRect(0, 0, WORLD.w, WORLD.h);
    [1120, 2240].forEach((x, index) => {
      g.fillStyle(index ? PAPER.sheetLow : PAPER.sheetMid, 0.3).fillRect(x, 0, WORLD.w - x, WORLD.h);
      g.lineStyle(1, PAPER.fold, 0.85);
      draftLine(g, this.rnd, x, 0, x, WORLD.h, { overshoot: 0, jitter: 1.6, segments: 18 });
      g.fillStyle(PAPER.kraft, 0.24).fillRect(x - 7, GROUND_Y - 38, 14, 76);
    });
  }

  buildCountry() {
    const g = this.graphics(5);
    g.fillStyle(PAPER.sheetHigh, 1).fillRect(0, 72, WORLD.w, 330);

    // A hand-scroll needs quiet distance. Two sparse, low-contrast mountain
    // bands leave the interactive market as the darkest readable layer.
    for (let x = -220; x < WORLD.w; x += 650) {
      this.foldedHill(g, x, 178 + ((x / 650) % 2) * 18, 760, 245, PAPER.sheetMid, PAPER.fold, 0.42);
    }
    for (let x = 40; x < WORLD.w; x += 520) {
      this.foldedHill(g, x, 286, 560, 137, PAPER.sheet, PAPER.sheetLow, 0.56);
    }

    // Keep background houses out of the opening market silhouette.
    [92, 1190, 1830, 2520, 3210].forEach((x, index) => this.paperHouse(g, x, 346 - (index % 2) * 14, 78, 70));

    g.lineStyle(1.25, PAPER.graphiteFaint, 0.38);
    for (let x = 0; x < WORLD.w; x += 460) {
      draftLine(g, this.rnd, x, 432, x + 460, 425, { overshoot: 0, jitter: 1.5, segments: 12 });
      draftLine(g, this.rnd, x, 447, x + 460, 441, { overshoot: 0, jitter: 1.5, segments: 12 });
    }

    g.fillStyle(PAPER.sheetLow, 1).fillRect(0, GROUND_Y, WORLD.w, WORLD.h - GROUND_Y);
    hatchRect(g, this.rnd, 0, GROUND_Y + 4, WORLD.w, 86, { spacing: 18, alpha: 0.1, flip: true });
    g.lineStyle(1.45, PAPER.graphiteSoft, 0.68);
    draftLine(g, this.rnd, 0, GROUND_Y, WORLD.w, GROUND_Y, { overshoot: 0, jitter: 1.15, segments: 46 });

    HOLES.forEach((hole) => {
      g.fillStyle(PAPER.sheetHigh, 1).fillRect(hole.x0, GROUND_Y - 4, hole.x1 - hole.x0, WORLD.h - GROUND_Y + 4);
      g.lineStyle(1.6, PAPER.deckle, 0.95);
      draftLine(g, this.rnd, hole.x0, GROUND_Y - 5, hole.x0 + 10, WORLD.h, { overshoot: 0, jitter: 2.4, segments: 9 });
      draftLine(g, this.rnd, hole.x1, GROUND_Y - 5, hole.x1 - 10, WORLD.h, { overshoot: 0, jitter: 2.4, segments: 9 });
    });

    this.thread = this.graphics(18);
    this.thread.lineStyle(1, PAPER.graphiteFaint, 0.26);
    this.thread.beginPath().moveTo(120, GROUND_Y - 10);
    SITES.forEach((site, index) => {
      this.thread.lineTo(site.x - 90, GROUND_Y - 12 - (index % 2) * 7);
      this.thread.lineTo(site.x, GROUND_Y - 22);
    });
    this.thread.lineTo(3260, GROUND_Y - 12).strokePath();
  }

  foldedHill(g, x, y, w, h, face, shade, alpha = 1) {
    const peak = x + w * 0.42;
    g.fillStyle(face, alpha).beginPath().moveTo(x, y + h).lineTo(peak, y).lineTo(peak + w * 0.13, y + h).closePath().fillPath();
    g.fillStyle(shade, alpha * 0.88).beginPath().moveTo(peak, y).lineTo(x + w, y + h * 0.82).lineTo(x + w, y + h).lineTo(peak + w * 0.13, y + h).closePath().fillPath();
    g.lineStyle(1.1, PAPER.graphiteSoft, alpha * 0.55);
    draftLine(g, this.rnd, x, y + h, peak, y, { overshoot: 0, jitter: 0.8 });
    draftLine(g, this.rnd, peak, y, x + w, y + h * 0.82, { overshoot: 0, jitter: 0.8 });
  }

  paperHouse(g, x, y, w, h) {
    g.fillStyle(PAPER.sheetHigh, 1).fillRect(x, y + 30, w, h - 30);
    g.fillStyle(PAPER.sheetMid, 1).beginPath().moveTo(x - 8, y + 32).lineTo(x + w / 2, y).lineTo(x + w + 8, y + 32).closePath().fillPath();
    g.lineStyle(1.3, PAPER.graphiteSoft, 0.9);
    draftRect(g, this.rnd, x, y + 30, w, h - 30, { overshoot: 4, jitter: 0.6 });
    draftLine(g, this.rnd, x - 8, y + 32, x + w / 2, y, { overshoot: 3, jitter: 0.6 });
    draftLine(g, this.rnd, x + w / 2, y, x + w + 8, y + 32, { overshoot: 3, jitter: 0.6 });
    draftRect(g, this.rnd, x + w * 0.4, y + h - 32, w * 0.22, 32, { overshoot: 2, jitter: 0.4 });
  }

  buildPainterAndMarket() {
    this.painterView = this.graphics(38);
    const g = this.painterView;
    const x = 305;
    const y = GROUND_Y;
    // Ma Liang is a quiet seated anchor beside a real calligraphy table. The
    // old oversized standing figure and floating bowls made the whole market
    // read as one noisy icon strip.
    g.fillStyle(PAPER.indigo, 0.09).fillEllipse(x, y - 34, 62, 65);
    g.fillStyle(PAPER.indigo, 0.72).beginPath()
      .moveTo(x - 21, y - 6).lineTo(x - 18, y - 53).lineTo(x - 8, y - 61)
      .lineTo(x + 12, y - 59).lineTo(x + 22, y - 47).lineTo(x + 25, y - 6).closePath().fillPath();
    g.fillStyle(PAPER.bookCloth, 0.5).beginPath()
      .moveTo(x - 15, y - 46).lineTo(x - 34, y - 30).lineTo(x - 28, y - 23).lineTo(x - 5, y - 38).closePath().fillPath();
    g.fillStyle(PAPER.indigo, 0.64).beginPath()
      .moveTo(x + 14, y - 47).lineTo(x + 35, y - 34).lineTo(x + 29, y - 26).lineTo(x + 5, y - 39).closePath().fillPath();
    g.fillStyle(PAPER.manilla, 1).fillCircle(x - 31, y - 26, 5).fillCircle(x + 32, y - 29, 5);
    g.fillStyle(PAPER.manilla, 1).fillEllipse(x, y - 76, 24, 28);
    g.fillStyle(PAPER.graphite, 0.94).beginPath()
      .moveTo(x - 13, y - 80).lineTo(x - 7, y - 91).lineTo(x + 3, y - 88)
      .lineTo(x + 13, y - 80).lineTo(x + 9, y - 91).lineTo(x - 9, y - 93).closePath().fillPath();
    g.fillStyle(PAPER.graphite, 0.78).fillCircle(x - 4, y - 76, 1.2).fillCircle(x + 5, y - 76, 1.2);
    g.lineStyle(1, PAPER.bookCloth, 0.58).lineBetween(x - 2, y - 69, x + 4, y - 69);
    g.lineStyle(2.2, PAPER.graphiteSoft, 0.72).lineBetween(x - 11, y - 6, x - 9, y - 25).lineBetween(x + 12, y - 6, x + 10, y - 25);
    this.drawBrush(g, x + 29, y - 29, x + 52, y - 48, 0.68, PAPER.boneBlack);

    // Low desk grounds the three interactive inkstones and provides one clean
    // horizontal baseline instead of several unrelated floating elements.
    g.fillStyle(PAPER.kraft, 0.42).fillRoundedRect(352, y - 37, 142, 9, 3);
    g.lineStyle(1.25, PAPER.graphiteSoft, 0.62).strokeRoundedRect(352, y - 37, 142, 9, 3);
    g.lineStyle(3, PAPER.graphiteSoft, 0.42).lineBetween(363, y - 29, 360, y).lineBetween(484, y - 29, 488, y);

    this.marketLayer = this.graphics(32);
    this.drawMarketState();
  }

  drawBrush(g, handleX, handleY, tipX, tipY, scale = 1, pigment = PAPER.cyan) {
    const angle = Math.atan2(tipY - handleY, tipX - handleX);
    const nx = -Math.sin(angle);
    const ny = Math.cos(angle);
    const ferruleX = tipX - Math.cos(angle) * 13 * scale;
    const ferruleY = tipY - Math.sin(angle) * 13 * scale;
    g.lineStyle(4.4 * scale, PAPER.kraft, 1).lineBetween(handleX, handleY, ferruleX, ferruleY);
    g.lineStyle(1.1 * scale, PAPER.graphite, 0.88).lineBetween(handleX, handleY, ferruleX, ferruleY);
    g.fillStyle(PAPER.manilla, 1).beginPath().moveTo(ferruleX + nx * 4 * scale, ferruleY + ny * 4 * scale).lineTo(tipX + nx * 4 * scale, tipY + ny * 4 * scale).lineTo(tipX - nx * 4 * scale, tipY - ny * 4 * scale).lineTo(ferruleX - nx * 4 * scale, ferruleY - ny * 4 * scale).closePath().fillPath();
    const bristleTipX = tipX + Math.cos(angle) * 17 * scale;
    const bristleTipY = tipY + Math.sin(angle) * 17 * scale;
    g.fillStyle(PAPER.graphite, 0.94).beginPath().moveTo(tipX + nx * 5 * scale, tipY + ny * 5 * scale).lineTo(bristleTipX, bristleTipY).lineTo(tipX - nx * 5 * scale, tipY - ny * 5 * scale).closePath().fillPath();
    g.fillStyle(pigment, 0.92).fillCircle(bristleTipX, bristleTipY, 3.2 * scale);
  }

  paintStrokeAt(x, y, color, width = 72) {
    const stroke = this.graphics(57);
    stroke.lineStyle(9, color, 0.16).beginPath().moveTo(x - width / 2, y + 5).lineTo(x, y - 4).lineTo(x + width / 2, y + 2).strokePath();
    stroke.lineStyle(5, color, 0.5).beginPath().moveTo(x - width / 2 + 5, y + 3).lineTo(x - 4, y - 5).lineTo(x + width / 2 - 8, y).strokePath();
    stroke.lineStyle(1.5, PAPER.graphite, 0.34).lineBetween(x - width / 2, y + 8, x + width / 2, y + 3);
    stroke.fillStyle(color, 0.65).fillCircle(x + width / 2 - 6, y, 3);
    stroke.setScale(0.16, 1);
    this.tweens.add({ targets: stroke, scaleX: 1, duration: 240, ease: 'Cubic.easeOut', onComplete: () => this.tweens.add({ targets: stroke, alpha: 0, duration: 620, delay: 240, onComplete: () => stroke.destroy() }) });
  }

  drawGood(g, good, x, y, scale, color, alpha = 1) {
    g.fillStyle(color, alpha);
    g.lineStyle(Math.max(1, scale * 1.2), PAPER.graphite, alpha * 0.82);
    if (good === 'BREAD') {
      g.fillRoundedRect(x - 11 * scale, y - 7 * scale, 22 * scale, 14 * scale, 6 * scale);
      [-5, 0, 5].forEach((offset) => g.lineBetween(x + offset * scale, y - 5 * scale, x + (offset + 2) * scale, y + 3 * scale));
    } else if (good === 'MEDICINE') {
      g.fillRoundedRect(x - 8 * scale, y - 11 * scale, 16 * scale, 22 * scale, 3 * scale);
      g.fillStyle(PAPER.sheetHigh, 1).fillRect(x - 2 * scale, y - 7 * scale, 4 * scale, 14 * scale).fillRect(x - 6 * scale, y - 3 * scale, 12 * scale, 6 * scale);
    } else {
      g.fillRect(x - 12 * scale, y - 8 * scale, 24 * scale, 6 * scale);
      g.fillRect(x - 9 * scale, y + 2 * scale, 24 * scale, 6 * scale);
      g.strokeCircle(x - 8 * scale, y - 5 * scale, 2 * scale).strokeCircle(x - 5 * scale, y + 5 * scale, 2 * scale);
    }
  }

  drawMarketState() {
    const g = this.marketLayer;
    if (!g) return;
    g.clear();
    const pressure = this.state.pricePressure;
    const goods = ['bread', 'medicine', 'timber'];
    const wishCenters = [604, 784, 964];
    MONEY_STOPS.forEach((stop, index) => {
      const good = goods[index];
      const served = this.state.servedResidents.includes(good);
      const restored = this.state.repaired.includes(good);
      const current = this.state.phase === 'money' && this.state.moneyGiven === index;
      if (!served && !current) return;
      const center = wishCenters[index];
      const residentX = Math.min(1008, center + 68);
      const rnd = makeRandom(0x5300 + index);

      // One roadside encounter at a time: a grounded person, one small supply
      // basket, and one blank drawing space. No repeated shop façades.
      g.fillStyle(PAPER.graphiteSoft, current ? 0.08 : 0.045).fillEllipse(residentX - 10, GROUND_Y + 2, 118, 15);
      this.drawPerson(g, residentX, GROUND_Y, current ? 1.08 : 0.94);

      const basketX = residentX + 27;
      g.fillStyle(PAPER.kraft, 0.24).fillRoundedRect(basketX - 24, GROUND_Y - 24, 48, 24, 4);
      g.lineStyle(1.2, PAPER.graphiteSoft, 0.55).strokeRoundedRect(basketX - 24, GROUND_Y - 24, 48, 24, 4);
      for (let rib = -16; rib <= 16; rib += 8) g.lineBetween(basketX + rib, GROUND_Y - 22, basketX + rib + 4, GROUND_Y - 2);
      const stock = restored ? 3 : served ? 0 : 2;
      for (let item = 0; item < stock; item += 1) {
        this.drawGood(g, stop.good, basketX - 11 + item * 21, GROUND_Y - 31, 0.52, stop.color, 0.72);
      }

      if (served && !restored) {
        // Price pressure is a growing vermilion seal beside an emptied basket,
        // not a saturated UI bar over every object in the scene.
        const sealH = 18 + pressure * 6;
        g.fillStyle(PAPER.fault, 0.68).fillRoundedRect(basketX + 30, GROUND_Y - sealH, 17, sealH, 2);
        for (let stamp = 0; stamp < pressure; stamp += 1) {
          g.fillStyle(PAPER.sheetHigh, 0.72).fillCircle(basketX + 38.5, GROUND_Y - 9 - stamp * 8, 2.2);
        }
      }

      if (current) {
        g.lineStyle(1.2, PAPER.graphiteSoft, 0.42);
        draftLine(g, rnd, residentX - 18, GROUND_Y - 42, center + 36, GROUND_Y - 81, { overshoot: 0, jitter: 1.2, segments: 5 });
      }
    });

    // During the money lesson, accumulated price tags make a literal paper
    // wall. The fold opens only when the player recognizes the supply problem.
    if (this.state.phase === 'money' || this.state.phase === 'crisis') {
      for (let row = 0; row < 3; row += 1) {
        const x = 1050 + row * 6;
        const y = GROUND_Y - 44 - row * 30;
        const drawn = row < this.state.moneyGiven;
        g.fillStyle(drawn ? PAPER.manilla : PAPER.sheetMid, drawn ? 0.98 : 0.62).fillRoundedRect(x, y, 92, 27, 3);
        g.lineStyle(drawn ? 2 : 1.1, drawn ? PAPER.fault : PAPER.graphiteFaint, drawn ? 0.78 : 0.52);
        draftRect(g, makeRandom(0x7800 + row), x, y, 92, 27, { overshoot: 3, jitter: 0.55 });
        g.lineStyle(1.2, drawn ? PAPER.bookCloth : PAPER.graphiteFaint, 0.64).strokeCircle(x + 46, y + 13, 7);
        g.lineBetween(x + 8, y + 7, x + 21, y + 7).lineBetween(x + 71, y + 20, x + 84, y + 20);
      }
    }
  }

  issueMoney() {
    if (this.state.phase !== 'money' || this.state.moneyInHand) return;
    this.state.moneyInHand = true;
    this.paintStrokeAt(430, GROUND_Y - 111, PAPER.bookCloth, 54);
    const note = this.graphics(55);
    note.fillStyle(PAPER.manilla, 1).fillRect(414, GROUND_Y - 118, 30, 18);
    note.lineStyle(1.2, PAPER.graphite, 0.9).strokeRect(414, GROUND_Y - 118, 30, 18);
    note.lineStyle(1.5, PAPER.bookCloth, 0.9).strokeCircle(429, GROUND_Y - 109, 5);
    this.tweens.add({ targets: note, x: this.player.x - 429, y: this.player.y - GROUND_Y + 74, alpha: 0, duration: 420, onComplete: () => note.destroy() });
    this.showCaption('ONE NEW NOTE.', 1200);
  }

  giveMoney(stop) {
    if (!this.state.moneyInHand || this.state.servedResidents.includes(stop.id)) return;
    this.state.moneyInHand = false;
    this.state.servedResidents.push(stop.id);
    this.state.moneyGiven += 1;
    this.state.pricePressure = this.state.moneyGiven;
    const note = this.graphics(58);
    note.fillStyle(PAPER.manilla, 1).fillRect(this.player.x + 10, this.player.y - 31, 20, 13);
    note.lineStyle(1, PAPER.graphite, 0.9).strokeRect(this.player.x + 10, this.player.y - 31, 20, 13);
    this.tweens.add({ targets: note, x: (stop.x - 82) - this.player.x, y: -18, alpha: 0, duration: 360, ease: 'Sine.easeIn', onComplete: () => note.destroy() });
    this.drawMarketState();
    this.cameras.main.flash(130, 204, 120, 92, false);
    if (this.state.moneyGiven < MONEY_STOPS.length) {
      this.showCaption(`${stop.good}: LESS ON THE SHELF. MORE ON THE TAG.`, 2100);
      return;
    }
    this.startInflationCrisis();
  }

  startInflationCrisis() {
    this.state.phase = 'crisis';
    this.state.phaseTimerMs = 1500;
    this.drawMarketState();
    this.showCaption('THERE IS MORE MONEY. THERE IS NOT MORE BREAD.', 4300);
    this.cameras.main.shake(320, 0.006);
  }

  buildSites() {
    this.siteLayers = SITES.map((site, index) => {
      const layer = this.graphics(28);
      this.drawSite(layer, site, index, false);
      return layer;
    });
    this.prompt = this.add.text(0, 0, 'E', {
      fontFamily: 'ui-monospace, monospace', fontSize: '12px', color: '#4a4640',
      backgroundColor: '#f7f4ecdd', padding: { x: 7, y: 4 },
    }).setOrigin(0.5).setDepth(70).setVisible(false);
  }

  buildScraps() {
    this.scrapViews = SCRAPS.map((scrap, index) => {
      const g = this.graphics(42);
      g.fillStyle(PAPER.sheetHigh, 0.96).fillCircle(scrap.x, scrap.y, 19);
      g.fillStyle(scrap.color, 0.18).fillCircle(scrap.x, scrap.y, 15);
      g.lineStyle(1.2, PAPER.graphite, 0.85);
      g.strokeCircle(scrap.x, scrap.y, 19);
      this.drawClueSymbol(g, scrap.id, scrap.x, scrap.y, 0.82, scrap.color, true);
      this.tweens.add({ targets: g, y: -6, duration: 900 + index * 70, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      return g;
    });
  }

  drawClueSymbol(g, id, x, y, scale, color, filled = false) {
    g.lineStyle(2.2 * scale, color, filled ? 1 : 0.52);
    if (id === 'grain-mark') {
      g.lineBetween(x, y + 10 * scale, x, y - 10 * scale);
      [-6, 0, 6].forEach((offset, index) => {
        const side = index % 2 ? 1 : -1;
        g.beginPath().moveTo(x, y + offset * scale).lineTo(x + side * 7 * scale, y + (offset - 4) * scale).lineTo(x, y + (offset - 1) * scale).strokePath();
      });
    } else if (id === 'broken-gear') {
      g.strokeCircle(x, y, 8 * scale);
      for (let angle = 0; angle < 7; angle += 1) {
        const a = angle / 7 * Math.PI * 2;
        g.lineBetween(x + Math.cos(a) * 8 * scale, y + Math.sin(a) * 8 * scale, x + Math.cos(a) * 12 * scale, y + Math.sin(a) * 12 * scale);
      }
      g.lineBetween(x - 2 * scale, y - 11 * scale, x + 3 * scale, y + 11 * scale);
    } else if (id === 'dry-channel') {
      g.beginPath().moveTo(x - 12 * scale, y - 7 * scale).lineTo(x - 3 * scale, y).lineTo(x - 12 * scale, y + 7 * scale).moveTo(x + 12 * scale, y - 7 * scale).lineTo(x + 3 * scale, y).lineTo(x + 12 * scale, y + 7 * scale).strokePath();
    } else if (id === 'pump-seal') {
      g.beginPath().moveTo(x, y - 12 * scale).lineTo(x - 8 * scale, y + 3 * scale).lineTo(x - 5 * scale, y + 9 * scale).lineTo(x, y + 12 * scale).lineTo(x + 5 * scale, y + 9 * scale).lineTo(x + 8 * scale, y + 3 * scale).closePath().strokePath();
    } else if (id === 'axle-mark') {
      g.strokeCircle(x - 9 * scale, y, 5 * scale).strokeCircle(x + 9 * scale, y, 5 * scale);
      g.lineBetween(x - 4 * scale, y, x - 1 * scale, y);
      g.lineBetween(x + 2 * scale, y, x + 4 * scale, y);
      g.lineBetween(x - 1 * scale, y - 4 * scale, x + 2 * scale, y + 4 * scale);
    } else {
      g.beginPath().moveTo(x - 12 * scale, y - 7 * scale).lineTo(x + 12 * scale, y - 7 * scale).moveTo(x - 12 * scale, y + 7 * scale).lineTo(x + 12 * scale, y + 7 * scale).strokePath();
      [-6, 0, 6].forEach((offset) => g.lineBetween(x + offset * scale, y - 7 * scale, x + (offset + 4) * scale, y + 7 * scale));
    }
  }

  drawSiteSockets(g, site) {
    site.needs.forEach((clueId, index) => {
      const x = site.x - 24 + index * 48;
      const y = GROUND_Y - 155;
      const found = this.state.scraps.includes(clueId);
      g.fillStyle(found ? site.color : PAPER.sheetHigh, found ? 0.25 : 0.92).fillCircle(x, y, 18);
      g.lineStyle(found ? 2.4 : 1.4, found ? site.color : PAPER.graphiteFaint, found ? 0.95 : 0.75).strokeCircle(x, y, 18);
      this.drawClueSymbol(g, clueId, x, y, 0.72, found ? site.color : PAPER.graphiteFaint, found);
    });
  }

  drawSite(g, site, index, repaired) {
    g.clear();
    const rnd = makeRandom(0x7710 + index);
    if (index === 0) {
      // Mill: the grain already exists; only the broken wheel prevents bread.
      g.fillStyle(PAPER.sheetHigh, 1).fillRect(site.x - 74, GROUND_Y - 108, 148, 108);
      g.lineStyle(1.5, PAPER.graphiteSoft, 0.9);
      draftRect(g, rnd, site.x - 74, GROUND_Y - 108, 148, 108, { overshoot: 5, jitter: 0.7 });
      g.fillStyle(PAPER.manilla, 0.9).fillRect(site.x - 60, GROUND_Y - 36, 26, 36).fillRect(site.x - 28, GROUND_Y - 32, 26, 32);
      if (repaired) {
        g.fillStyle(site.color, 0.75).fillCircle(site.x + 34, GROUND_Y - 62, 39);
        g.fillStyle(PAPER.sheetHigh, 1).fillCircle(site.x + 34, GROUND_Y - 62, 12);
        g.lineStyle(2, PAPER.graphite, 0.9).strokeCircle(site.x + 34, GROUND_Y - 62, 39);
        for (let a = 0; a < 8; a += 1) {
          const angle = (a / 8) * Math.PI * 2;
          g.lineBetween(site.x + 34 + Math.cos(angle) * 12, GROUND_Y - 62 + Math.sin(angle) * 12, site.x + 34 + Math.cos(angle) * 38, GROUND_Y - 62 + Math.sin(angle) * 38);
        }
      } else {
        g.lineStyle(2, PAPER.graphiteFaint, 0.9).strokeCircle(site.x + 34, GROUND_Y - 62, 39);
        g.lineBetween(site.x + 2, GROUND_Y - 88, site.x + 66, GROUND_Y - 36);
        g.lineBetween(site.x + 2, GROUND_Y - 36, site.x + 20, GROUND_Y - 52);
      }
    } else if (index === 1) {
      // Public pump and herb channel.
      g.fillStyle(PAPER.sheetHigh, 1).fillRect(site.x - 74, GROUND_Y - 82, 148, 82);
      g.lineStyle(1.5, PAPER.graphiteSoft, 0.9);
      draftRect(g, rnd, site.x - 74, GROUND_Y - 82, 148, 82, { overshoot: 5 });
      g.lineStyle(2, PAPER.graphite, 0.85).strokeRect(site.x - 18, GROUND_Y - 116, 42, 112);
      g.lineStyle(5, PAPER.graphite, 0.9).lineBetween(site.x + 3, GROUND_Y - 116, site.x + 52, GROUND_Y - 140);
      if (repaired) {
        paintedFill(g, rnd, site.x + 32, GROUND_Y - 26, 132, 18, site.color, { alpha: 0.76 });
        g.lineStyle(3, site.color, 0.9).beginPath().moveTo(site.x + 20, GROUND_Y - 100).lineTo(site.x + 52, GROUND_Y - 100).lineTo(site.x + 52, GROUND_Y - 28).strokePath();
        for (let x = site.x + 74; x < site.x + 150; x += 25) {
          g.fillStyle(PAPER.verdigris, 0.75).fillTriangle(x - 8, GROUND_Y - 26, x, GROUND_Y - 52, x + 8, GROUND_Y - 26);
        }
      } else {
        g.lineStyle(2, PAPER.graphiteFaint, 0.85).beginPath().moveTo(site.x + 20, GROUND_Y - 100).lineTo(site.x + 52, GROUND_Y - 100).lineTo(site.x + 52, GROUND_Y - 28).strokePath();
        g.lineStyle(1.4, PAPER.deckle, 0.9).lineBetween(site.x + 34, GROUND_Y - 84, site.x + 66, GROUND_Y - 68);
      }
    } else {
      // Freight cart: full crates are stranded beside a broken axle.
      g.fillStyle(PAPER.manilla, 0.85).fillRect(site.x - 62, GROUND_Y - 96, 48, 52).fillRect(site.x - 8, GROUND_Y - 82, 48, 38);
      g.lineStyle(1.4, PAPER.graphiteSoft, 0.9);
      draftRect(g, rnd, site.x - 62, GROUND_Y - 96, 48, 52, { overshoot: 3 });
      draftRect(g, rnd, site.x - 8, GROUND_Y - 82, 48, 38, { overshoot: 3 });
      if (repaired) {
        paintedFill(g, rnd, site.x - 86, GROUND_Y - 49, 172, 40, site.color, { alpha: 0.76 });
        g.lineStyle(3, PAPER.graphite, 0.9).lineBetween(site.x + 82, GROUND_Y - 38, site.x + 126, GROUND_Y - 64);
        g.fillStyle(PAPER.sheetLow, 1).fillCircle(site.x - 48, GROUND_Y - 7, 22).fillCircle(site.x + 50, GROUND_Y - 7, 22);
        g.lineStyle(3, PAPER.graphite, 0.9).strokeCircle(site.x - 48, GROUND_Y - 7, 22).strokeCircle(site.x + 50, GROUND_Y - 7, 22);
      } else {
        g.lineStyle(2, PAPER.graphiteFaint, 0.9).strokeRect(site.x - 86, GROUND_Y - 49, 172, 40);
        g.lineBetween(site.x - 60, GROUND_Y - 6, site.x - 22, GROUND_Y - 24);
        g.lineBetween(site.x + 24, GROUND_Y - 24, site.x + 62, GROUND_Y - 6);
      }
    }
  }

  buildPeople() {
    this.people = [];
    [1180, 1320, 1880, 2040, 2530, 2700, 3190, 3220].forEach((x, index) => {
      const person = this.graphics(36);
      this.drawPerson(person, x, GROUND_Y, index % 2 ? 0.8 : 1);
      this.people.push(person);
    });
  }

  drawPerson(g, x, y, scale = 1) {
    const tunic = Math.round(x / 24) % 3 === 0 ? PAPER.indigo : Math.round(x / 24) % 3 === 1 ? PAPER.verdigris : PAPER.bookCloth;
    g.fillStyle(tunic, 0.15).fillEllipse(x, y - 17 * scale, 25 * scale, 34 * scale);
    g.fillStyle(PAPER.manilla, 0.98).fillCircle(x, y - 31 * scale, 6.5 * scale);
    g.fillStyle(PAPER.graphite, 0.92).beginPath().moveTo(x - 7 * scale, y - 33 * scale).lineTo(x - 2 * scale, y - 39 * scale).lineTo(x + 7 * scale, y - 34 * scale).lineTo(x + 5 * scale, y - 29 * scale).lineTo(x - 6 * scale, y - 29 * scale).closePath().fillPath();
    g.fillStyle(tunic, 0.78).beginPath().moveTo(x - 8 * scale, y - 25 * scale).lineTo(x + 8 * scale, y - 25 * scale).lineTo(x + 10 * scale, y - 8 * scale).lineTo(x - 10 * scale, y - 8 * scale).closePath().fillPath();
    g.lineStyle(3.2 * scale, PAPER.figureSoft, 0.84).beginPath().moveTo(x - 7 * scale, y - 21 * scale).lineTo(x - 13 * scale, y - 12 * scale).moveTo(x + 7 * scale, y - 21 * scale).lineTo(x + 13 * scale, y - 12 * scale).strokePath();
    g.lineStyle(3.4 * scale, PAPER.figureSoft, 0.9).beginPath().moveTo(x - 5 * scale, y - 8 * scale).lineTo(x - 6 * scale, y).moveTo(x + 5 * scale, y - 8 * scale).lineTo(x + 7 * scale, y).strokePath();
    g.fillStyle(PAPER.graphite, 0.8).fillCircle(x - 2.3 * scale, y - 31 * scale, 0.75 * scale).fillCircle(x + 2.3 * scale, y - 31 * scale, 0.75 * scale);
  }

  buildPlayer() {
    this.figure = this.graphics(50);
    this.drawPlayer();
  }

  buildBrushInteraction() {
    this.paintLayer = this.graphics(44);
    this.creationStream = this.graphics(65);
    this.creationClock = 0;
    this.brushCursor = this.graphics(66);
    this.brushHint = this.add.text(0, 0, '', {
      fontFamily: 'ui-monospace, monospace', fontSize: '10px', color: '#4a4640',
      backgroundColor: '#f7f4ecd9', padding: { x: 7, y: 4 }, letterSpacing: 2,
    }).setOrigin(0.5, 1).setDepth(67).setVisible(false);
    this.redrawInteractionRegions();
  }

  wishShapePoints(act, box) {
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    const sx = box.w;
    const sy = box.h;
    const shapes = [
      [[-0.4, 0.12], [-0.27, -0.13], [-0.13, -0.24], [0, -0.08], [0.13, -0.24], [0.27, -0.13], [0.4, 0.12], [0.22, 0.3], [-0.22, 0.3], [-0.4, 0.12]],
      [[-0.18, -0.34], [0.18, -0.34], [0.16, -0.22], [0.27, -0.1], [0.29, 0.3], [-0.29, 0.3], [-0.27, -0.1], [-0.16, -0.22], [-0.18, -0.34]],
      [[-0.4, -0.2], [0.28, -0.2], [0.41, -0.08], [0.32, 0.02], [0.42, 0.14], [0.28, 0.24], [-0.4, 0.24], [-0.3, 0.02], [-0.4, -0.2]],
    ];
    return shapes[act].map(([x, y]) => ({ x: cx + x * sx, y: cy + y * sy }));
  }

  partialPath(g, points, coverage) {
    if (points.length < 2 || coverage <= 0) return points[0];
    const lengths = [];
    let total = 0;
    for (let index = 1; index < points.length; index += 1) {
      const length = Phaser.Math.Distance.Between(points[index - 1].x, points[index - 1].y, points[index].x, points[index].y);
      lengths.push(length);
      total += length;
    }
    let remaining = total * Phaser.Math.Clamp(coverage, 0, 1);
    g.beginPath().moveTo(points[0].x, points[0].y);
    let tip = points[0];
    for (let index = 1; index < points.length && remaining > 0; index += 1) {
      const span = lengths[index - 1];
      const ratio = Math.min(1, remaining / span);
      tip = {
        x: Phaser.Math.Linear(points[index - 1].x, points[index].x, ratio),
        y: Phaser.Math.Linear(points[index - 1].y, points[index].y, ratio),
      };
      g.lineTo(tip.x, tip.y);
      remaining -= span;
    }
    g.strokePath();
    return tip;
  }

  pathPoint(points, coverage) {
    if (points.length < 2) return points[0];
    const spans = [];
    let total = 0;
    for (let index = 1; index < points.length; index += 1) {
      const span = Phaser.Math.Distance.Between(points[index - 1].x, points[index - 1].y, points[index].x, points[index].y);
      spans.push(span);
      total += span;
    }
    let remaining = total * Phaser.Math.Clamp(coverage, 0, 1);
    for (let index = 1; index < points.length; index += 1) {
      if (remaining <= spans[index - 1]) {
        const ratio = remaining / spans[index - 1];
        return {
          x: Phaser.Math.Linear(points[index - 1].x, points[index].x, ratio),
          y: Phaser.Math.Linear(points[index - 1].y, points[index].y, ratio),
        };
      }
      remaining -= spans[index - 1];
    }
    return points.at(-1);
  }

  drawInkWell(g, region, active) {
    const x = region.x + region.w / 2;
    const y = region.y + region.h / 2;
    const color = PIGMENT_COLOR[region.pigment];
    g.fillStyle(PAPER.kraft, 0.72).fillEllipse(x, y + 7, 39, 18);
    g.fillStyle(PAPER.sheetLow, 1).fillEllipse(x, y + 2, 35, 17);
    g.fillStyle(color, 0.9).fillEllipse(x, y + 2, 27 * Math.max(0.15, region.coverage), 11);
    g.lineStyle(1.6, PAPER.graphite, 0.88).strokeEllipse(x, y + 2, 35, 17);
    g.lineStyle(1, PAPER.graphiteSoft, 0.5).strokeEllipse(x - 1, y + 5, 30, 13);
    if (active) {
      g.lineStyle(1.4, PAPER.graphite, 0.6).beginPath()
        .moveTo(x - 19, y - 12).lineTo(x - 24, y - 17).lineTo(x - 24, y - 4)
        .moveTo(x + 19, y - 12).lineTo(x + 24, y - 17).lineTo(x + 24, y - 4).strokePath();
    }
  }

  drawNoteRegion(g, region, box, active) {
    const color = PIGMENT_COLOR[region.pigment];
    const points = this.wishShapePoints(region.act, box);
    if (region.coverage >= 0.96) {
      g.fillStyle(color, 0.38).fillPoints(points, true);
      if (region.act === 0) g.fillStyle(PAPER.amber, 0.3).fillEllipse(box.x + box.w / 2, box.y + box.h * 0.56, box.w * 0.46, box.h * 0.2);
      if (region.act === 1) g.fillStyle(PAPER.sheetHigh, 0.72).fillRect(box.x + box.w * 0.44, box.y + box.h * 0.43, box.w * 0.12, box.h * 0.23);
      if (region.act === 2) {
        g.lineStyle(2, PAPER.sheetHigh, 0.62).lineBetween(box.x + box.w * 0.18, box.y + box.h * 0.43, box.x + box.w * 0.76, box.y + box.h * 0.43);
        g.lineBetween(box.x + box.w * 0.12, box.y + box.h * 0.58, box.x + box.w * 0.8, box.y + box.h * 0.58);
      }
    }
    g.lineStyle(1.25, PAPER.graphiteFaint, active ? 0.74 : 0.44);
    g.beginPath().moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => g.lineTo(point.x, point.y));
    g.strokePath();
    if (region.coverage > 0.001) {
      g.lineStyle(7, color, 0.13);
      this.partialPath(g, points, region.coverage);
      g.lineStyle(2.8, color, 0.9);
      this.partialPath(g, points, region.coverage);
    }
    if (active) g.lineStyle(1, PAPER.graphiteSoft, 0.24).strokeEllipse(box.x + box.w / 2, box.y + box.h / 2, box.w + 18, box.h + 13);
  }

  drawCreationStream(dt) {
    const g = this.creationStream;
    g.clear();
    this.creationClock += dt;
    const pointer = this.input.activePointer;
    const region = this.brushRegionInReach();
    if (!region || !pointer.leftButtonDown() || !['note', 'repair'].includes(region.role)) return;
    const slot = this.state.brush.find((entry) => entry.pigment === region.pigment && entry.load > 0.001);
    if (!slot || !this.brushTip) return;
    const box = this.fable.bounds(region);
    const color = PIGMENT_COLOR[region.pigment];
    let end = { x: box.x + box.w / 2, y: box.y + box.h / 2 };
    if (region.role === 'note') {
      end = this.pathPoint(this.wishShapePoints(region.act, box), Math.max(0.02, region.coverage));
    }
    const start = this.brushTip;
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const nx = -Math.sin(angle);
    const ny = Math.cos(angle);
    const steps = 13;
    const buildWave = (offset, width, alpha) => {
      g.lineStyle(width, color, alpha).beginPath().moveTo(start.x, start.y);
      for (let index = 1; index <= steps; index += 1) {
        const t = index / steps;
        const wave = Math.sin(t * Math.PI * 3.4 - this.creationClock * 8 + offset) * (1 - t) * 11;
        const curl = Math.sin(t * Math.PI) * 9;
        g.lineTo(
          Phaser.Math.Linear(start.x, end.x, t) + nx * wave,
          Phaser.Math.Linear(start.y, end.y, t) + ny * wave - curl,
        );
      }
      g.strokePath();
    };
    buildWave(0, 8, 0.1);
    buildWave(0.35, 2.6, 0.82);
    for (let bead = 0; bead < 4; bead += 1) {
      const t = (this.creationClock * 1.7 + bead * 0.23) % 1;
      const wave = Math.sin(t * Math.PI * 3.4 - this.creationClock * 8) * (1 - t) * 11;
      g.fillStyle(color, 0.72 - t * 0.35).fillCircle(
        Phaser.Math.Linear(start.x, end.x, t) + nx * wave,
        Phaser.Math.Linear(start.y, end.y, t) + ny * wave - Math.sin(t * Math.PI) * 9,
        2.8 - t * 1.2,
      );
    }
  }

  drawRepairCoverage(g, region, box, active) {
    const color = PIGMENT_COLOR[region.pigment];
    const c = region.coverage;
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    g.lineStyle(active ? 2.2 : 1.5, PAPER.graphiteFaint, active ? 0.95 : 0.55);
    if (region.act === 0) {
      const radius = 39;
      if (c > 0.01) g.fillStyle(color, 0.72).slice(cx + 18, cy + 2, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * c, false).fillPath();
      g.strokeCircle(cx + 18, cy + 2, radius).strokeCircle(cx + 18, cy + 2, 11);
      for (let spoke = 0; spoke < 8; spoke += 1) {
        const a = spoke * Math.PI / 4;
        g.lineBetween(cx + 18 + Math.cos(a) * 12, cy + 2 + Math.sin(a) * 12, cx + 18 + Math.cos(a) * 38, cy + 2 + Math.sin(a) * 38);
      }
    } else if (region.act === 1) {
      g.beginPath().moveTo(box.x + 20, box.y + 20).lineTo(box.x + 58, box.y + 20).lineTo(box.x + 58, box.y + 81).lineTo(box.x + 103, box.y + 81).strokePath();
      if (c > 0.01) {
        g.lineStyle(8, color, 0.28).beginPath().moveTo(box.x + 23, box.y + 20).lineTo(box.x + 58, box.y + 20).lineTo(box.x + 58, box.y + 81).lineTo(box.x + 23 + 80 * c, box.y + 81).strokePath();
        g.lineStyle(3, color, 0.82).beginPath().moveTo(box.x + 23, box.y + 20).lineTo(box.x + 58, box.y + 20).lineTo(box.x + 58, box.y + 81).lineTo(box.x + 23 + 80 * c, box.y + 81).strokePath();
      }
    } else {
      g.lineStyle(2, PAPER.graphiteFaint, 0.9).strokeRect(box.x + 8, box.y + 25, 100, 39);
      g.strokeCircle(box.x + 30, box.y + 78, 18).strokeCircle(box.x + 88, box.y + 78, 18);
      if (c > 0.01) {
        paintedFill(g, makeRandom(0xa100 + Math.round(c * 12)), box.x + 9, box.y + 26, 98 * c, 37, color, { alpha: 0.72 });
        g.lineStyle(5, color, 0.75).lineBetween(box.x + 30, box.y + 78, box.x + 30 + 58 * c, box.y + 78);
      }
    }
  }

  settleWish(act) {
    const region = this.fable.byId(`note-${['bread', 'medicine', 'timber'][act]}`);
    if (!region) return;
    const box = this.fable.bounds(region);
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    const color = PIGMENT_COLOR[region.pigment];
    const bloom = this.graphics(64);
    bloom.lineStyle(5, color, 0.18).strokeEllipse(cx, cy, box.w * 0.9, box.h * 0.68);
    bloom.lineStyle(1.6, color, 0.82).strokeEllipse(cx, cy, box.w * 0.76, box.h * 0.55);
    for (let drop = 0; drop < 7; drop += 1) {
      const angle = drop * Math.PI * 2 / 7 + act * 0.4;
      bloom.fillStyle(color, 0.68).fillCircle(cx + Math.cos(angle) * 34, cy + Math.sin(angle) * 24, drop % 2 ? 1.8 : 2.6);
    }
    bloom.setScale(0.68);
    this.tweens.add({
      targets: bloom, scale: 1.28, alpha: 0, duration: 620, ease: 'Cubic.easeOut',
      onComplete: () => bloom.destroy(),
    });
  }

  redrawInteractionRegions() {
    const g = this.paintLayer;
    if (!g || !this.fable) return;
    g.clear();
    const active = this.fable.target();
    this.state.regions.filter((region) => region.role === 'source').forEach((region) => this.drawInkWell(g, region, active?.id === region.id));
    this.state.regions.filter((region) => region.role === 'note').forEach((region) => {
      const completedMoneyNote = this.state.moneyGiven > region.act && this.state.phase !== 'repair';
      if (!this.fable.visible(region) && !completedMoneyNote) return;
      const box = this.fable.bounds(region);
      this.drawNoteRegion(g, region, box, active?.id === region.id);
    });
    this.state.regions.filter((region) => region.role === 'repair' && this.fable.visible(region)).forEach((region) => {
      this.drawRepairCoverage(g, region, this.fable.bounds(region), active?.id === region.id);
    });
  }

  brushRegionInReach() {
    const pointer = this.input.activePointer;
    const region = this.fable.regionAt(pointer.worldX, pointer.worldY);
    if (!region) return null;
    const box = this.fable.bounds(region);
    const centerX = box.x + box.w / 2;
    const centerY = box.y + box.h / 2;
    return Phaser.Math.Distance.Between(this.player.x, this.player.y - 25, centerX, centerY) <= BRUSH_REACH ? region : null;
  }

  stepBrush(dt) {
    const pointer = this.input.activePointer;
    const region = this.brushRegionInReach();
    if (!region) return;
    let changed = 0;
    if (pointer.leftButtonDown()) changed = this.fable.paint(region.id, dt);
    else if (pointer.rightButtonDown()) changed = this.fable.wash(region.id, dt);
    if (changed > 0) this.redrawInteractionRegions();
  }

  drawBrushCursor() {
    const g = this.brushCursor;
    g.clear();
    const pointer = this.input.activePointer;
    const raw = this.fable.regionAt(pointer.worldX, pointer.worldY);
    const region = this.brushRegionInReach();
    this.brushHint.setVisible(Boolean(raw));
    if (!raw) return;
    const box = this.fable.bounds(raw);
    const action = raw.role === 'source' || (this.state.phase === 'repair' && raw.role === 'note') ? 'HOLD RIGHT · WASH' : 'HOLD LEFT · PAINT';
    this.brushHint.setText(region ? action : 'MOVE CLOSER').setPosition(box.x + box.w / 2, box.y - 8);
    g.lineStyle(1.35, region ? PAPER.graphite : PAPER.fault, region ? 0.66 : 0.5);
    if (raw.role === 'source') {
      g.strokeEllipse(box.x + box.w / 2, box.y + box.h / 2 + 2, box.w + 15, box.h + 4);
    } else if (raw.role === 'note') {
      const points = this.wishShapePoints(raw.act, box);
      const tip = this.pathPoint(points, Math.max(0.025, raw.coverage));
      g.strokeCircle(tip.x, tip.y, region ? 5 : 3.5);
    } else {
      g.beginPath()
        .moveTo(box.x - 4, box.y + 14).lineTo(box.x - 4, box.y - 4).lineTo(box.x + 14, box.y - 4)
        .moveTo(box.x + box.w - 14, box.y + box.h + 4).lineTo(box.x + box.w + 4, box.y + box.h + 4).lineTo(box.x + box.w + 4, box.y + box.h - 14)
        .strokePath();
    }
    if (!region) {
      g.lineStyle(1, PAPER.graphiteFaint, 0.45).lineBetween(this.player.x, this.player.y - 24, box.x + box.w / 2, box.y + box.h / 2);
    }
  }

  spillWrongPigment(regionId) {
    const region = this.fable.byId(regionId);
    if (!region) return;
    const box = this.fable.bounds(region);
    const bead = this.graphics(62);
    const slot = this.state.brush.find((entry) => entry.load > 0.001);
    const color = PIGMENT_COLOR[slot?.pigment] ?? PAPER.graphiteSoft;
    bead.fillStyle(color, 0.76).fillCircle(box.x + box.w / 2, box.y + box.h / 2, 4);
    this.tweens.add({ targets: bead, y: 28, alpha: 0, duration: 480, ease: 'Quad.easeIn', onComplete: () => bead.destroy() });
  }

  handleFableEvents() {
    this.fable.drainEvents().forEach((event) => {
      if (event.type === 'note-issued') {
        this.drawMarketState();
        this.settleWish(event.act);
        this.showCaption(event.act < 2 ? 'ANOTHER WISH TAKES SHAPE.  THE PRICE SEAL CLIMBS.' : 'THERE IS MORE GOLD.  THERE IS NOT MORE BREAD.', 3000);
      } else if (event.type === 'inflation-crisis') {
        this.drawMarketState();
        this.cameras.main.shake(280, 0.005);
      } else if (event.type === 'repair-phase') {
        this.state.checkpoint = 1040;
        this.drawMarketState();
        this.showCaption('WASH THE OLD FORMS BACK INTO THE BRUSH.  PAINT WHAT THE COUNTRY ACTUALLY LACKS.', 4300);
      } else if (event.type === 'supply-restored') {
        const site = SITES[event.act];
        this.drawSite(this.siteLayers[event.act], site, event.act, true);
        this.state.checkpoint = Math.min(WORLD.w - 80, site.x + 130);
        this.drawMarketState();
        this.cameras.main.flash(160, 239, 226, 198, false);
        this.showCaption(REPAIR_LINES[site.id], 3400);
      } else if (event.type === 'wrong-or-empty-brush') {
        this.spillWrongPigment(event.id);
      } else if (event.type === 'fable-complete') {
        this.finish();
      }
      this.redrawInteractionRegions();
    });
  }

  buildGuidance() {
    this.guideClock = 0;
    this.guideLayer = this.graphics(64);
  }

  currentGoal() {
    if (this.state.phase === 'money') {
      if (!this.state.moneyInHand) return { id: 'ma-liang', kind: 'draw-note', x: 438, y: GROUND_Y - 95, interactX: 330 };
      const stop = MONEY_STOPS[this.state.moneyGiven];
      if (stop) return { id: stop.id, kind: 'give-note', x: stop.x - 82, y: GROUND_Y - 58 };
    }
    if (this.state.phase === 'crisis') return { id: 'price-wall', kind: 'blocked', x: 1080, y: GROUND_Y - 120 };
    if (this.state.phase === 'investigate') {
      const site = SITES[this.state.repaired.length];
      if (!site) return null;
      const missingId = site.needs.find((id) => !this.state.scraps.includes(id));
      if (missingId) {
        const scrap = SCRAPS.find((entry) => entry.id === missingId);
        return { id: scrap.id, kind: 'clue', x: scrap.x, y: scrap.y - 10 };
      }
      return { id: site.id, kind: 'repair', x: site.x, y: GROUND_Y - 178 };
    }
    if (this.state.artifactReady) return { id: 'common-fold', kind: 'artifact', x: 2860, y: GROUND_Y - 126 };
    return null;
  }

  drawGuidance() {
    const g = this.guideLayer;
    g.clear();
    const goal = this.currentGoal();
    if (!goal) return;
    const pulse = 1 + Math.sin(this.guideClock * 4.2) * 0.08;
    const groundY = GROUND_Y - 10;
    const direction = Math.sign(goal.x - this.player.x) || 1;
    const fromX = this.player.x + direction * 18;
    const toX = goal.x - direction * 18;
    g.lineStyle(1.6, PAPER.cyan, 0.34);
    g.beginPath().moveTo(fromX, groundY).lineTo((fromX + toX) / 2, groundY - 9).lineTo(toX, groundY).strokePath();
    const span = Math.abs(toX - fromX);
    const beadCount = Math.min(18, Math.floor(span / 42));
    for (let bead = 0; bead < beadCount; bead += 1) {
      const offset = ((bead * 42 + this.guideClock * 54) % Math.max(42, span));
      const x = fromX + direction * offset;
      g.fillStyle(PAPER.cyan, 0.55).fillCircle(x, groundY - Math.sin((offset / Math.max(span, 1)) * Math.PI) * 8, bead % 3 ? 1.6 : 2.4);
    }
    g.lineStyle(6, PAPER.cyan, 0.12).strokeCircle(goal.x - 1, goal.y + 1, 22 * pulse);
    g.lineStyle(1.8, PAPER.cyan, 0.85).strokeCircle(goal.x + 1.5, goal.y - 1, 21 * pulse);
    g.lineStyle(1, PAPER.graphiteFaint, 0.45).strokeCircle(goal.x - 1, goal.y + 2, 24 * pulse);

    if (goal.kind === 'draw-note') {
      g.fillStyle(PAPER.manilla, 0.92).fillRect(goal.x - 9, goal.y - 7, 18, 12);
      g.lineStyle(1.4, PAPER.cyan, 0.9).strokeRect(goal.x - 9, goal.y - 7, 18, 12).strokeCircle(goal.x, goal.y - 1, 3);
    } else if (goal.kind === 'give-note') {
      g.lineStyle(1.7, PAPER.cyan, 0.9).strokeRect(goal.x - 8, goal.y - 8, 16, 10);
      g.beginPath().moveTo(goal.x - 13, goal.y + 5).lineTo(goal.x - 7, goal.y + 11).lineTo(goal.x, goal.y + 13).lineTo(goal.x + 7, goal.y + 11).lineTo(goal.x + 13, goal.y + 5).strokePath();
    } else if (goal.kind === 'clue') {
      this.drawClueSymbol(g, goal.id, goal.x, goal.y, 0.72, PAPER.cyan, true);
    } else if (goal.kind === 'repair') {
      g.lineStyle(2.1, PAPER.cyan, 0.92).beginPath().moveTo(goal.x - 10, goal.y + 9).lineTo(goal.x + 8, goal.y - 9).moveTo(goal.x + 4, goal.y - 10).lineTo(goal.x + 11, goal.y - 3).strokePath();
    } else if (goal.kind === 'blocked') {
      g.lineStyle(2.2, PAPER.fault, 0.9).beginPath().moveTo(goal.x - 10, goal.y - 8).lineTo(goal.x + 10, goal.y + 8).moveTo(goal.x + 10, goal.y - 8).lineTo(goal.x - 10, goal.y + 8).strokePath();
    } else if (goal.kind === 'artifact') {
      g.lineStyle(3, PAPER.cyan, 0.92).strokeCircle(goal.x, goal.y, 10);
      g.lineBetween(goal.x - 8, goal.y + 7, goal.x, goal.y - 8).lineBetween(goal.x, goal.y - 8, goal.x + 8, goal.y + 7);
    }
  }

  drawPlayer() {
    this.figure.clear();
    const x = this.player.x;
    const y = this.player.y;
    this.figure.fillStyle(PAPER.cyan, 0.14).fillEllipse(x, y - 21, 34, 44);
    this.figure.fillStyle(PAPER.manilla, 1).fillCircle(x, y - 38, 8);
    this.figure.fillStyle(PAPER.figure, 1).beginPath().moveTo(x - 9, y - 41).lineTo(x - 3, y - 49).lineTo(x + 8, y - 43).lineTo(x + 7, y - 36).lineTo(x - 8, y - 36).closePath().fillPath();
    this.figure.fillStyle(PAPER.verdigris, 0.88).beginPath().moveTo(x - 10, y - 30).lineTo(x + 10, y - 30).lineTo(x + 12, y - 10).lineTo(x - 12, y - 10).closePath().fillPath();
    this.figure.lineStyle(4, PAPER.figure, 0.96).beginPath().moveTo(x - 7, y - 26).lineTo(x - 13, y - 17).moveTo(x + 7, y - 26).lineTo(x + 14, y - 17).strokePath();
    this.figure.lineStyle(4, PAPER.figure, 1).beginPath().moveTo(x - 5, y - 10).lineTo(x - 7, y).moveTo(x + 5, y - 10).lineTo(x + 8, y).strokePath();
    this.figure.fillStyle(PAPER.figure, 0.9).fillCircle(x - 3, y - 38, 1).fillCircle(x + 3, y - 38, 1);
    const pointer = this.input.activePointer;
    const targetX = pointer?.worldX ?? x + 45;
    const targetY = pointer?.worldY ?? y - 35;
    const angle = Math.atan2(targetY - (y - 18), targetX - x);
    const tipX = x + Math.cos(angle) * 46;
    const tipY = y - 18 + Math.sin(angle) * 46;
    const heldPigment = this.state.brush?.find((slot) => slot.load > 0.001)?.pigment;
    this.drawBrush(this.figure, x + 10, y - 18, tipX, tipY, 0.58, PIGMENT_COLOR[heldPigment] ?? PAPER.graphiteSoft);
    this.brushTip = { x: tipX + Math.cos(angle) * 10, y: tipY + Math.sin(angle) * 10 };
    this.state.brush?.forEach((slot, index) => {
      const ratio = Phaser.Math.Clamp(slot.load / INFLATION_SLOT_CAPACITY, 0, 1);
      this.figure.fillStyle(PAPER.sheetHigh, 0.96).fillCircle(x - 18 + index * 12, y - 57, 4.5);
      if (ratio > 0) this.figure.fillStyle(PIGMENT_COLOR[slot.pigment], 0.95).fillCircle(x - 18 + index * 12, y - 57, 4.2 * Math.sqrt(ratio));
      this.figure.lineStyle(1, PAPER.graphiteSoft, 0.7).strokeCircle(x - 18 + index * 12, y - 57, 4.5);
    });
  }

  buildAtmosphere() {
    const grainKey = buildPaperGrain(this, 'inhabitant-paper-grain');
    this.grain = this.add.tileSprite(0, 0, PAINTED_COUNTRY_INHABITANT_VIEW.w, PAINTED_COUNTRY_INHABITANT_VIEW.h, grainKey)
      .setOrigin(0).setScrollFactor(0).setDepth(80).setAlpha(0.82);
    this.motes = Array.from({ length: 24 }, (_, index) => ({
      view: this.add.circle((index * 137) % WORLD.w, 100 + ((index * 73) % 300), index % 4 ? 1 : 1.5, PAPER.graphiteSoft, 0.35).setDepth(60),
      speed: 4 + (index % 7),
    }));
  }

  showCaption(text, duration = 2600) {
    this.caption.setText(text).setAlpha(1);
    this.captionUntil = this.time.now + duration;
  }

  collectNearbyScraps() {
    if (this.state.phase !== 'investigate') return;
    const activeSite = SITES[this.state.repaired.length];
    if (!activeSite) return;
    SCRAPS.forEach((scrap, index) => {
      if (!activeSite.needs.includes(scrap.id)) return;
      if (this.state.scraps.includes(scrap.id)) return;
      if (Math.abs(this.player.x - scrap.x) > 28 || Math.abs((this.player.y - 24) - scrap.y) > 60) return;
      this.state.scraps.push(scrap.id);
      this.scrapViews[index].setVisible(false);
      this.drawSite(this.siteLayers[this.state.repaired.length], activeSite, this.state.repaired.length, false);
      this.cameras.main.flash(100, 205, 170, 125, false);
      this.showCaption(scrap.line, 2700);
    });
  }

  activeHoleAt(x) {
    return HOLES.find((hole) => x > hole.x0 && x < hole.x1 && (!hole.repairedBy || !this.state.repaired.includes(hole.repairedBy)));
  }

  interact() {
    if (this.state.complete) this.takeArtifact();
  }

  finish() {
    if (this.state.ending) return;
    this.state.ending = true;
    this.thread.setAlpha(1);
    this.cameras.main.shake(240, 0.006);
    this.cameras.main.flash(320, 111, 156, 139, false);
    this.state.phase = 'complete';
    this.state.pricePressure = 0;
    this.drawMarketState();
    this.people.forEach((person, index) => this.tweens.add({ targets: person, x: 3080 - person.x + (index - 4) * 27, duration: 1800, delay: index * 90, ease: 'Sine.easeInOut' }));
    this.endingText.setText('HE DREW EVERY WISH THEY NAMED\nTHEY DREW A WAY TO MAKE ENOUGH');
    this.tweens.add({ targets: this.endingText, alpha: 1, scale: { from: 0.92, to: 1 }, duration: 700, ease: 'Back.easeOut' });
    this.time.delayedCall(2100, () => this.revealArtifact());
  }

  revealArtifact() {
    if (!this.state?.complete || this.state.artifactReady || this.state.artifactTaken) return;
    this.state.artifactReady = true;
    this.showCaption('THE RESIDENTS FOLD THE EXCESS INTO SOMETHING THEY CAN SHARE.', 4200);
    this.tweens.add({ targets: this.endingText, alpha: 0.2, duration: 420, ease: 'Sine.easeOut' });
    this.tweens.add({ targets: this.artifactView, alpha: 1, y: this.artifactView.y - 14, duration: 680, ease: 'Back.easeOut' });
  }

  takeArtifact() {
    if (!this.state?.artifactReady || this.state.artifactTaken) return;
    this.state.artifactTaken = true;
    this.state.artifactReady = false;
    this.cameras.main.flash(180, 111, 156, 139, false);
    this.tweens.add({ targets: this.artifactView, alpha: 0, scale: 0.5, duration: 320, ease: 'Back.easeIn' });
    this.showCaption('THE COMMON FOLD COMES WITH YOU.', 2200);
    this.time.delayedCall(440, () => this.onArchiveComplete?.());
  }

  focusArtifactForQa() {
    this.player.x = 2820;
    this.player.y = GROUND_Y;
    this.cameraTarget.setPosition(2820, GROUND_Y - 100);
    this.cameras.main.stopFollow();
    this.cameras.main.centerOn(2820, GROUND_Y - 75);
  }

  update(time, delta = 16.67) {
    if (!this.state) return;
    const dt = Math.min(delta, 50) / 1000;
    if (this.caption.alpha && this.time.now > (this.captionUntil ?? 0)) this.caption.setAlpha(0);
    const direction = Number(this.keys.right.isDown || this.keys.d.isDown) - Number(this.keys.left.isDown || this.keys.a.isDown);
    this.fable.update(dt);
    const maxX = this.state.phase === 'money' || this.state.phase === 'crisis' ? 1020 : WORLD.w - 50;
    this.player.x = Phaser.Math.Clamp(this.player.x + direction * MOVE_SPEED * dt, 50, maxX);

    const jump = Phaser.Input.Keyboard.JustDown(this.keys.up) || Phaser.Input.Keyboard.JustDown(this.keys.w) || Phaser.Input.Keyboard.JustDown(this.keys.space);
    if (jump && this.player.onGround) {
      this.player.vy = -410;
      this.player.onGround = false;
    }
    if (this.player.onGround && this.activeHoleAt(this.player.x)) {
      this.player.onGround = false;
      this.player.vy = 90;
    }
    if (!this.player.onGround) {
      this.player.vy += 1350 * dt;
      this.player.y += this.player.vy * dt;
      if (this.player.y >= GROUND_Y && !this.activeHoleAt(this.player.x)) {
        this.player.y = GROUND_Y;
        this.player.vy = 0;
        this.player.onGround = true;
      }
    }
    if (this.player.y > WORLD.h + 40) {
      this.state.falls += 1;
      this.player.x = this.state.checkpoint;
      this.player.y = GROUND_Y;
      this.player.vy = 0;
      this.player.onGround = true;
      this.cameras.main.shake(130, 0.005);
      this.showCaption('THE PAPER RETURNS YOU TO THE LAST FOLD.', 1800);
    }

    this.stepBrush(dt);
    this.handleFableEvents();
    this.drawPlayer();
    this.drawCreationStream(dt);
    this.drawBrushCursor();
    this.cameraTarget.setPosition(this.player.x, this.player.y - 100);
    this.prompt.setVisible(false);

    this.motes.forEach((mote) => {
      mote.view.x += mote.speed * dt;
      mote.view.y += Math.sin(time / 900 + mote.speed) * dt * 2;
      if (mote.view.x > WORLD.w + 5) mote.view.x = -5;
    });
    this.grain.tilePositionX = this.cameras.main.scrollX * 0.35;
  }

  advanceTime(ms) {
    const steps = Math.max(1, Math.round(ms / (1000 / 60)));
    for (let index = 0; index < steps; index += 1) this.update(0, 1000 / 60);
  }

  renderToText() {
    const interaction = this.fable.snapshot();
    return {
      scene: 'painted-country-inhabitant',
      role: 'small-inhabitant',
      chapter4StoryReused: false,
      phase: this.state.phase,
      moneyGiven: this.state.moneyGiven,
      pricePressure: this.state.pricePressure,
      servedResidents: [...this.state.servedResidents],
      complete: this.state.complete,
      repaired: [...this.state.repaired],
      brush: interaction.brush,
      visiblePaintRegions: interaction.regions,
      activeRegion: interaction.activeRegion,
      falls: this.state.falls,
      checkpoint: this.state.checkpoint,
      ending: this.state.ending,
      artifactReady: this.state.artifactReady,
      artifactTaken: this.state.artifactTaken,
      interaction: 'hold left mouse to paint; hold right mouse to wash pigment into the two-slot brush',
      requiredSupplyRepairs: SITES.map(({ id, x }) => ({ id, x })),
      player: { x: Math.round(this.player.x), y: Math.round(this.player.y), onGround: this.player.onGround },
      coordinateSystem: 'origin top-left; x right; y down',
    };
  }
}
