import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../constants.js';
import { C, CAR } from './colors.js';
import { devParam } from '../devMode.js';
import { RETRO_TRANSIT } from './retroTransitTheme.js';

// This file's local swatch names are kept as an alias layer rather than being
// inlined at every call site: the names say what a surface IS (shell, trim,
// glass) while CAR says what colour it takes, and keeping both means a material
// can be re-pointed at a different rung in one line. SWATCH replaces the old
// `C` object, whose name now belongs to the compliance wrapper.
const SWATCH = {
  ink: C(CAR.VOID),
  shell: RETRO_TRANSIT.ivory,
  shellLight: RETRO_TRANSIT.orange,
  trim: RETRO_TRANSIT.silverDark,
  brass: RETRO_TRANSIT.orangeShadow,
  red: C(CAR.VINYL_HI),
  redLight: C(CAR.VINYL_HI),
  cream: C(CAR.BRASS_HI),
  glass: C(CAR.STEEL_HI),
  cyan: C(CAR.LAMP_OK),
  amber: C(CAR.TUNGSTEN_REFLECT),
  error: C(CAR.LAMP_ALERT),
};

const POWER_STATES = new Set(['off', 'partial', 'error', 'complete']);

/**
 * Art-only layer for the tutorial train car.
 *
 * The camera-fixed shell changes no collisions or rules. Later cars can reuse
 * its geometry and replace only materials, props, lighting, and mechanic art.
 */
export default class TutorialCarArt {
  constructor(scene) {
    this.scene = scene;
    this.objects = [];
    this.powerState = 'partial';
    this.visible = true;
    this.powerTimers = [];

    this.buildShell();
    this.buildGlass();
    this.buildCeilingDetails();
    this.buildPowerPanel();
    this.buildForeground();
    this.setPowerState(this.readPreviewState());
  }

  track(object, depth, scrollFactor = 0) {
    object.setDepth(depth).setScrollFactor(scrollFactor);
    this.objects.push(object);
    return object;
  }

  graphics(depth) {
    return this.track(this.scene.add.graphics(), depth);
  }

  readPreviewState() {
    if (typeof window === 'undefined') return 'off';
    // Forcing a power state is a dev route: a production build always starts
    // the car dark and earns every lamp.
    const requested = devParam('artState');
    return POWER_STATES.has(requested) ? requested : 'off';
  }

  buildShell() {
    const back = this.graphics(7);

    // The world panorama remains untouched inside the three window openings.
    back.fillStyle(SWATCH.ink, 1);
    back.fillRect(0, 0, GAME_W, 126);
    back.fillRect(0, 376, GAME_W, GAME_H - 376);
    back.fillRect(0, 112, 54, 312);
    back.fillRect(906, 112, 54, 312);
    back.fillRect(298, 112, 32, 286);
    back.fillRect(618, 112, 32, 286);

    back.fillStyle(SWATCH.shell, 1);
    back.fillRect(0, 10, GAME_W, 105);
    back.fillRect(0, 382, GAME_W, 218);
    back.fillRect(7, 115, 42, 275);
    back.fillRect(911, 115, 42, 275);
    back.fillRect(304, 115, 20, 275);
    back.fillRect(624, 115, 20, 275);

    back.fillStyle(SWATCH.shellLight, 1);
    back.fillRect(34, 391, 892, 112);
    back.fillStyle(C(CAR.VOID), 1);
    back.fillRect(34, 501, 892, 99);
    back.fillStyle(SWATCH.brass, 0.42);
    back.fillRect(34, 389, 892, 3);
    back.fillRect(34, 498, 892, 2);

    const trim = this.graphics(27);
    trim.lineStyle(5, SWATCH.trim, 1);
    [[54, 120, 244, 256], [330, 120, 288, 256], [650, 120, 256, 256]].forEach(
      ([x, y, w, h]) => trim.strokeRoundedRect(x, y, w, h, 12),
    );
    trim.lineStyle(1, SWATCH.brass, 0.72);
    [[59, 125, 234, 246], [335, 125, 278, 246], [655, 125, 246, 246]].forEach(
      ([x, y, w, h]) => trim.strokeRoundedRect(x, y, w, h, 9),
    );

    trim.fillStyle(C(CAR.VOID), 1);
    trim.fillTriangle(0, 0, 155, 0, 54, 115);
    trim.fillTriangle(GAME_W, 0, GAME_W - 155, 0, 906, 115);
    trim.fillStyle(SWATCH.shellLight, 1);
    trim.fillTriangle(26, 16, 130, 16, 56, 105);
    trim.fillTriangle(GAME_W - 26, 16, GAME_W - 130, 16, 904, 105);

    this.serviceLabel = this.track(
      this.scene.add.text(480, 22, 'NIGHT SERVICE  01', {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: '12px',
        color: '#e8d5a7',
        letterSpacing: 4,
      }).setOrigin(0.5, 0),
      29,
    );

    this.routeLabel = this.track(
      this.scene.add.text(480, 88, 'NORMAL SERVICE  /  POWER RESTORATION', {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: '10px',
        color: '#9fb7c0',
        letterSpacing: 2,
      }).setOrigin(0.5, 0),
      29,
    );
  }

  buildGlass() {
    const glass = this.graphics(8);
    const windows = [
      { x: 60, y: 126, w: 232, h: 244 },
      { x: 336, y: 126, w: 276, h: 244 },
      { x: 656, y: 126, w: 244, h: 244 },
    ];

    windows.forEach((window, index) => {
      glass.fillStyle(SWATCH.glass, 0.055);
      glass.fillRoundedRect(window.x, window.y, window.w, window.h, 8);
      glass.lineStyle(1, C(CAR.STEEL_HI), 0.12);
      glass.strokeRoundedRect(window.x, window.y, window.w, window.h, 8);
      glass.fillStyle(C(CAR.STEEL_HI), 0.055 + index * 0.012);
      glass.fillTriangle(window.x + 18, window.y + 4, window.x + 72, window.y + 4, window.x + 18, window.y + 142);
      glass.fillTriangle(
        window.x + window.w - 18,
        window.y + window.h - 4,
        window.x + window.w - 62,
        window.y + window.h - 4,
        window.x + window.w - 18,
        window.y + window.h - 112,
      );
    });

    const reflection = this.graphics(9);
    reflection.lineStyle(1, C(CAR.STEEL_HI), 0.11);
    reflection.beginPath();
    reflection.moveTo(92, 144);
    reflection.lineTo(42, 306);
    reflection.moveTo(418, 132);
    reflection.lineTo(338, 354);
    reflection.moveTo(748, 140);
    reflection.lineTo(676, 342);
    reflection.strokePath();
    this.scene.tweens.add({
      targets: reflection,
      alpha: { from: 0.48, to: 0.92 },
      duration: 4300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  buildCeilingDetails() {
    const route = this.graphics(28);
    route.lineStyle(2, SWATCH.trim, 0.8);
    route.lineBetween(346, 60, 614, 60);
    const stops = [370, 418, 466, 514, 562, 604];
    this.routeStops = stops.map((x, index) => {
      const stop = this.track(this.scene.add.circle(x, 60, index === 0 ? 5 : 4, index === 0 ? SWATCH.amber : SWATCH.shellLight), 29);
      stop.setStrokeStyle(1, index === 0 ? SWATCH.cream : SWATCH.trim, 1);
      return stop;
    });

    this.ceilingLights = [178, 480, 782].map((x, index) => {
      const glow = this.track(
        this.scene.add.rectangle(x, 104, 164, 14, SWATCH.cream, 0.13).setBlendMode(Phaser.BlendModes.ADD),
        26,
      );
      const lamp = this.track(this.scene.add.rectangle(x, 104, 126, 5, SWATCH.cream, 0.78), 29);
      lamp.setStrokeStyle(1, SWATCH.trim, 0.8);
      if (index === 1) {
        this.scene.tweens.add({
          targets: [glow, lamp],
          alpha: { from: 0.85, to: 0.56 },
          duration: 920,
          yoyo: true,
          repeat: -1,
          ease: 'Stepped',
        });
      }
      return { glow, lamp };
    });

    this.straps = [214, 480, 746].map((x, index) => {
      const strap = this.graphics(31);
      strap.lineStyle(3, C(CAR.STEEL_MID), 0.9);
      strap.lineBetween(x, 105, x, 154);
      strap.lineStyle(4, SWATCH.brass, 0.85);
      strap.strokeRoundedRect(x - 13, 151, 26, 34, 10);
      this.scene.tweens.add({
        targets: strap,
        x: { from: -1.5 - index * 0.2, to: 1.5 + index * 0.2 },
        duration: 1800 + index * 230,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      return strap;
    });
  }

  buildPowerPanel() {
    this.panel = this.graphics(33);
    const g = this.panel;
    g.fillStyle(C(CAR.VOID), 0.96);
    g.fillRoundedRect(770, 393, 112, 90, 7);
    g.lineStyle(2, SWATCH.trim, 0.9);
    g.strokeRoundedRect(770, 393, 112, 90, 7);
    g.lineStyle(1, SWATCH.brass, 0.55);
    g.strokeRoundedRect(777, 400, 98, 76, 4);
    g.fillStyle(SWATCH.shellLight, 1);
    g.fillRect(790, 453, 72, 8);
    g.lineStyle(3, SWATCH.brass, 0.82);
    g.beginPath();
    g.moveTo(798, 461);
    g.lineTo(786, 502);
    g.lineTo(704, 502);
    g.strokePath();

    this.panelLabel = this.track(
      this.scene.add.text(826, 408, 'AUX POWER', {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: '9px',
        color: '#e8d5a7',
        letterSpacing: 1,
      }).setOrigin(0.5),
      34,
    );

    this.powerLights = [0, 1, 2].map((index) =>
      this.track(this.scene.add.circle(802 + index * 24, 434, 4, SWATCH.shellLight), 34),
    );

    // The scrolling car uses world-space circuitry. The old fixed cabinet
    // would sit on top of routers whenever they passed the right edge.
    this.panel.setVisible(false);
    this.panelLabel.setVisible(false);
    this.powerLights.forEach((light) => light.setVisible(false));
  }

  buildForeground() {
    const floor = this.graphics(29);
    floor.fillStyle(C(CAR.VOID), 0.86);
    floor.fillRect(0, 525, GAME_W, 75);
    floor.lineStyle(1, C(CAR.ENAMEL_HI), 0.24);
    [94, 250, 410, 550, 710, 866].forEach((x) => floor.lineBetween(480, 525, x, 600));
    floor.lineBetween(0, 556, GAME_W, 556);
    floor.lineBetween(0, 582, GAME_W, 582);

    // Foreground seats belonged to the one-screen mockup. In a scrolling car
    // they repeatedly pass over live routers, so keep them behind gameplay.
    const seats = this.graphics(29);
    const seat = (x, flip = 1) => {
      seats.fillStyle(C(CAR.VOID), 1);
      seats.fillRoundedRect(x, 455, 152 * flip, 122, 14);
      seats.fillStyle(SWATCH.red, 1);
      seats.fillRoundedRect(x + 8 * flip, 463, 136 * flip, 72, 11);
      seats.fillStyle(SWATCH.redLight, 0.48);
      seats.fillRect(x + 15 * flip, 468, 120 * flip, 4);
      seats.fillStyle(C(CAR.VOID_LIFT), 1);
      seats.fillRect(x, 539, 152 * flip, 38);
      seats.fillStyle(SWATCH.brass, 0.64);
      seats.fillRect(x + 18 * flip, 575, 7 * flip, 25);
      seats.fillRect(x + 127 * flip, 575, 7 * flip, 25);
    };
    // Keep the starting passenger fully readable; the seat still frames the
    // edge but ends before the initial spawn at x=90.
    seat(-88, 1);
    seat(982, -1);

    seats.fillStyle(C(CAR.VOID), 1);
    seats.fillRoundedRect(878, 486, 74, 91, 5);
    seats.lineStyle(2, SWATCH.trim, 0.8);
    seats.strokeRoundedRect(878, 486, 74, 91, 5);
    seats.fillStyle(SWATCH.brass, 0.72);
    seats.fillRect(888, 499, 54, 3);
    seats.fillCircle(893, 582, 8);
    seats.fillCircle(937, 582, 8);

    this.track(
      this.scene.add.particles(0, 0, 'mote', {
        x: { min: 40, max: GAME_W - 40 },
        y: { min: 100, max: 510 },
        lifespan: { min: 5000, max: 10000 },
        speedX: { min: -4, max: 8 },
        speedY: { min: -3, max: 5 },
        scale: { min: 0.15, max: 0.55 },
        alpha: { start: 0.25, end: 0 },
        frequency: 360,
        quantity: 1,
        blendMode: Phaser.BlendModes.ADD,
      }),
      47,
    );
  }

  setPowerState(state) {
    this.powerState = POWER_STATES.has(state) ? state : 'partial';
    const configs = {
      off: { lights: [C(CAR.ENAMEL_DARK), C(CAR.ENAMEL_DARK), C(CAR.ENAMEL_DARK)], lamp: 0.15, label: 'AUX POWER  /  OFF' },
      partial: { lights: [SWATCH.amber, SWATCH.amber, C(CAR.ENAMEL_DARK)], lamp: 0.56, label: 'AUX POWER  /  2 OF 3' },
      error: { lights: [SWATCH.error, SWATCH.error, SWATCH.error], lamp: 0.28, label: 'AUX POWER  /  FAULT' },
      complete: { lights: [SWATCH.cyan, SWATCH.cyan, SWATCH.cyan], lamp: 0.94, label: 'AUX POWER  /  STABLE' },
    };
    const config = configs[this.powerState];
    this.powerLights.forEach((light, index) => light.setFillStyle(config.lights[index], 1));
    this.ceilingLights.forEach(({ glow, lamp }) => {
      glow.setAlpha(config.lamp * 0.25);
      lamp.setAlpha(config.lamp);
      lamp.setFillStyle(this.powerState === 'error' ? SWATCH.error : SWATCH.cream, 1);
    });
    this.panelLabel.setText(config.label);
    this.routeStops.forEach((stop, index) => {
      const reached = this.powerState === 'complete' || (this.powerState === 'partial' && index < 2);
      const color = this.powerState === 'complete' ? SWATCH.cyan : SWATCH.amber;
      stop.setFillStyle(reached ? color : SWATCH.shellLight, 1);
    });
  }

  playPowerRestore() {
    this.powerTimers.forEach((timer) => timer.remove(false));
    this.powerTimers.length = 0;

    this.ceilingLights.forEach(({ glow, lamp }) => {
      this.scene.tweens.killTweensOf(glow);
      this.scene.tweens.killTweensOf(lamp);
    });
    this.panelLabel.setText('AUX POWER  /  RESTART');

    const sequence = [
      { at: 80, state: 'error' },
      { at: 210, state: 'off' },
      { at: 330, state: 'error' },
      { at: 470, state: 'partial' },
      { at: 720, state: 'complete' },
    ];
    sequence.forEach(({ at, state }) => {
      this.powerTimers.push(
        this.scene.time.delayedCall(at, () => {
          this.setPowerState(state);
          if (state === 'complete') {
            this.scene.tweens.add({
              targets: [...this.powerLights, ...this.routeStops],
              scale: { from: 1.8, to: 1 },
              duration: 360,
              ease: 'Back.easeOut',
            });
          }
        }),
      );
    });
  }

  setVisible(visible) {
    this.visible = visible;
    this.objects.forEach((object) => object.setVisible(visible));
    if (visible) {
      this.panel.setVisible(false);
      this.panelLabel.setVisible(false);
      this.powerLights.forEach((light) => light.setVisible(false));
    }
  }

  getState() {
    return {
      car: 'tutorial-normal-service',
      visible: this.visible,
      powerState: this.powerState,
      layers: ['shell', 'glass', 'ceiling', 'power-panel', 'foreground', 'ambient-motion'],
    };
  }

  destroy() {
    this.powerTimers.forEach((timer) => timer.remove(false));
    this.powerTimers.length = 0;
    this.objects.forEach((object) => object.destroy());
    this.objects.length = 0;
  }
}
