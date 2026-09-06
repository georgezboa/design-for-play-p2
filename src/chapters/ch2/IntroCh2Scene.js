import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../../constants.js';
import { makeTorsoTextures, synthThud, synthBuzz } from './torso.js';

/**
 * IntroCh2 — the cold open of Chapter 2 (story bible docs/chapter2-story.md).
 * All in-game copy is English per project rule.
 *
 * Seven beats, one unbroken black room; the world is explained by its own
 * paperwork. INSIDE's wordless vignettes + Disco Elysium's wry second-person
 * narrator (the "—" lines at the bottom):
 *
 *   1. BIOS       VESSEL boots; the log itself admits words have been deleted
 *   2. VOTE       the referendum ad: nobody forced anyone — 81.4% voted yes
 *   3. NEWSPEAK   PAIN / DEATH / I are struck from the dictionary, live
 *   4. CONSENT    the triplicate form signs itself; the VOLUNTARY stamp slams
 *   5. SURVEY     the satisfaction survey answers itself — five stars
 *   6. VESSEL     the civic terminal addresses Citizen 8 — who speaks, and
 *                 from where, is now on screen
 *   7. THE WALK   a silhouette walks into the clinic's cold light — the SAME
 *                 silhouette L2-1 opens on. The cut is a match, not a jump.
 *
 * Any ENTER/SPACE skips straight to L2-1. No black-cuts inside: each beat
 * dissolves into the next.
 */

const MONO = 'ui-monospace, Menlo, monospace';
const C_MAIN = '#9fb4c4';
const C_DIM = '#5d6a78';
const C_CYAN = '#9fd8e8';
const C_RED = '#b03036';

export default class IntroCh2Scene extends Phaser.Scene {
  constructor() {
    super('IntroCh2');
  }

  create() {
    this.cameras.main.setBackgroundColor('#03050a');
    makeTorsoTextures(this); // ch2-mote, for light spills
    this.events = [];
    this.beat = []; // live objects of the current beat
    this.done = false;
    this.timers = [];

    this.narration = this.add
      .text(GAME_W / 2, GAME_H - 64, '', {
        fontFamily: MONO,
        fontSize: '13px',
        color: C_DIM,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.add
      .text(GAME_W - 18, GAME_H - 20, 'ENTER / SPACE — skip', {
        fontFamily: MONO,
        fontSize: '11px',
        color: '#3f4a56',
      })
      .setOrigin(1, 1)
      .setDepth(20);

    this.keys = this.input.keyboard.addKeys({ enter: 'ENTER', space: 'SPACE' });
    this.input.keyboard.addCapture(['SPACE', 'ENTER']);
    this.input.on('pointerdown', () => this.skip());

    // The one-take entry: the menu's dive ends in a cold blink, not a cut.
    this.cameras.main.flash(300, 9, 13, 20);

    this.schedule(600, () => this.beatBios());
    this.schedule(9800, () => this.beatVote());
    this.schedule(19800, () => this.beatNewspeak());
    this.schedule(29800, () => this.beatConsent());
    this.schedule(40800, () => this.beatSurvey());
    this.schedule(48800, () => this.beatVessel());
    this.schedule(56500, () => this.beatWalk());
    this.schedule(63500, () => this.finish());
  }

  // ------------------------------------------------------------- scaffolding

  schedule(at, fn) {
    this.events.push({ at, fn, fired: false });
  }

  /** Schedule relative to now (for beat-internal steps). */
  rel(at, fn) {
    this.schedule(this.time.now + at, fn);
  }

  /** Track an object as part of the current beat (cleared between beats). */
  own(obj) {
    this.beat.push(obj);
    return obj;
  }

  clearBeat() {
    this.beat.forEach((o) => o.destroy());
    this.beat = [];
    // Kill pending typewriters and beat-local tweens so nothing touches a
    // destroyed object after the dissolve.
    this.timers.forEach((t) => t.remove());
    this.timers = [];
    this.tweens.killAll();
  }

  /** Typewriter into a text object. cps = chars per second. */
  typewrite(txt, str, cps = 40) {
    let i = 0;
    txt.setText('');
    const timer = this.time.addEvent({
      delay: 1000 / cps,
      repeat: str.length - 1,
      callback: () => {
        if (!txt.active) {
          timer.remove();
          return;
        }
        i++;
        txt.setText(str.slice(0, i));
      },
    });
    this.timers.push(timer);
    return timer;
  }

  narrate(str, cps = 34) {
    this.typewrite(this.narration, str, cps);
  }

  line(x, y, str, { size = 15, color = C_MAIN, origin = 0, depth = 6 } = {}) {
    return this.own(
      this.add
        .text(x, y, '', { fontFamily: MONO, fontSize: `${size}px`, color })
        .setOrigin(origin, 0)
        .setDepth(depth),
    );
  }

  skip() {
    if (this.done) return;
    this.finish();
  }

  finish() {
    if (this.done) return;
    this.done = true;
    this.cameras.main.flash(260, 159, 216, 232);
    this.time.delayedCall(120, () => this.scene.start('Level21'));
  }

  update() {
    if (this.done) return;
    if (
      Phaser.Input.Keyboard.JustDown(this.keys.enter) ||
      Phaser.Input.Keyboard.JustDown(this.keys.space)
    ) {
      return this.skip();
    }
    const now = this.time.now;
    for (const ev of this.events) {
      if (!ev.fired && now >= ev.at) {
        ev.fired = true;
        ev.fn();
      }
    }
  }

  // ------------------------------------------------------------ beat 1: BIOS

  beatBios() {
    const lines = [
      ['NIGHTFALL INDUSTRIES — VESSEL BIOS v7.3.1', C_CYAN],
      ['civic terminal self-check ..... OK', C_MAIN],
      ['neural bridge ................ OK', C_MAIN],
      ['pain response ............... [deprecated]', C_DIM],
      ['lexicon audit ............... 3 words archived', C_DIM],
      ['loading statute: BODY RESPONSIBILITY ACT §7.3 — the body is public resource', C_MAIN],
      ['retrieving migration log …', C_MAIN],
    ];
    lines.forEach(([str, color], i) => {
      const txt = this.line(90, 120 + i * 36, '', { color });
      this.rel(600 + i * 950, () => {
        this.typewrite(txt, str, 46);
        synthBuzz(this, { freq: 240 + i * 30, dur: 0.06, gain: 0.05 });
      });
    });
    this.rel(900, () => this.narrate('— the machine wakes before you do. that is deliberate.'));
  }

  // ------------------------------------------------------------ beat 2: VOTE

  beatVote() {
    this.clearBeat();
    // The referendum, replayed on a dead channel: a TV with scanlines.
    const g = this.own(this.add.graphics().setDepth(5));
    const tvX = GAME_W / 2 - 190;
    const tvY = 90;
    g.fillStyle(0x0a0e16, 1).fillRect(tvX - 14, tvY - 14, 408, 268);
    g.lineStyle(2, 0x39424e, 1).strokeRect(tvX - 14, tvY - 14, 408, 268);
    g.fillStyle(0x141c28, 1).fillRect(tvX, tvY, 380, 240);
    for (let y = tvY + 4; y < tvY + 240; y += 6) {
      g.lineStyle(1, 0x0a0e16, 0.5);
      g.lineBetween(tvX, y, tvX + 380, y);
    }
    // A hunched silhouette holding its back — the pre-upgrade citizen.
    g.fillStyle(0x05070c, 1);
    g.fillCircle(tvX + 150, tvY + 96, 16); // head, bowed forward
    g.fillEllipse(tvX + 138, tvY + 160, 52, 92); // torso, hunched
    g.fillRect(tvX + 120, tvY + 196, 16, 44); // legs
    g.fillRect(tvX + 142, tvY + 196, 16, 44);
    g.fillRect(tvX + 164, tvY + 128, 34, 10); // hand pressed to the back

    const headline = this.line(GAME_W / 2, 380, '', { size: 22, color: C_MAIN, origin: 0.5 });
    this.rel(300, () => this.typewrite(headline, 'Still enduring your body?', 24));

    // The vote bar climbs by itself.
    const barBg = this.own(
      this.add.rectangle(GAME_W / 2 - 170, 436, 340, 14, 0x11151d).setOrigin(0, 0.5).setDepth(5),
    );
    const bar = this.own(
      this.add.rectangle(GAME_W / 2 - 170, 436, 2, 14, 0x9fd8e8).setOrigin(0, 0.5).setDepth(6),
    );
    const pct = this.line(GAME_W / 2 + 196, 426, '', { size: 15, color: C_CYAN });
    this.rel(1800, () => {
      this.tweens.addCounter({
        from: 0,
        to: 81.4,
        duration: 2600,
        ease: 'Cubic.easeOut',
        onUpdate: (tw) => {
          if (!pct.active || !bar.active) return;
          const v = tw.getValue();
          bar.width = Math.max(2, (v / 100) * 340);
          pct.setText(`${v.toFixed(1)}%`);
        },
      });
      synthBuzz(this, { freq: 180, dur: 0.4, gain: 0.08 });
    });
    this.rel(2300, () => {
      const lab = this.line(GAME_W / 2, 462, '', { size: 12, color: C_DIM, origin: 0.5 });
      this.typewrite(lab, 'BODY RESPONSIBILITY ACT — REFERENDUM · LIVE · IN FAVOR', 40);
    });
    this.rel(1000, () => this.narrate("— you didn't vote. it didn't matter. the majority decided for you."));
  }

  // -------------------------------------------------------- beat 3: NEWSPEAK

  beatNewspeak() {
    this.clearBeat();
    // Three words are struck from the dictionary while you watch.
    const rows = [
      ['PAIN', 'FAULT FEEDBACK'],
      ['DEATH', 'MIGRATION'],
      ['I', 'THE UNIT'],
    ];
    rows.forEach(([oldW, newW], i) => {
      const y = 150 + i * 74;
      const oldT = this.own(
        this.add
          .text(GAME_W / 2 - 170, y, oldW, { fontFamily: MONO, fontSize: '26px', color: C_MAIN })
          .setOrigin(0.5),
      );
      const strike = this.own(
        this.add.rectangle(GAME_W / 2 - 170, y + 1, 0, 3, 0xb03036).setDepth(6),
      );
      const arrow = this.own(
        this.add
          .text(GAME_W / 2 - 60, y, '→', { fontFamily: MONO, fontSize: '20px', color: C_DIM })
          .setOrigin(0.5)
          .setAlpha(0),
      );
      const newT = this.own(
        this.add
          .text(GAME_W / 2 + 110, y, newW, { fontFamily: MONO, fontSize: '22px', color: C_CYAN })
          .setOrigin(0.5)
          .setAlpha(0),
      );
      this.rel(800 + i * 1600, () => {
        this.tweens.add({ targets: strike, width: Math.max(60, oldW.length * 30), duration: 320, ease: 'Quad.easeIn' });
        synthBuzz(this, { freq: 140, dur: 0.2, gain: 0.12 });
        oldT.setColor(C_DIM);
      });
      this.rel(1300 + i * 1600, () => {
        arrow.setAlpha(1);
        this.tweens.add({ targets: newT, alpha: 1, duration: 500 });
      });
    });
    const slogan = this.line(GAME_W / 2, 420, '', { size: 18, color: C_RED, origin: 0.5 });
    this.rel(6200, () => {
      this.typewrite(slogan, 'PAIN IS FAULT · FLESH IS PRISON · UPGRADE IS FREEDOM', 26);
      synthBuzz(this, { freq: 100, dur: 0.5, gain: 0.12 });
    });
    this.rel(900, () =>
      this.narrate('— they deleted these words from the dictionary first. then they came for your body.'),
    );
  }

  // -------------------------------------------------------- beat 4: CONSENT

  beatConsent() {
    this.clearBeat();
    // The triplicate form. It signs itself; you only provided the hand.
    const px = GAME_W / 2 - 170;
    const py = 84;
    const g = this.own(this.add.graphics().setDepth(5));
    g.fillStyle(0x151a22, 1).fillRect(px, py, 340, 330);
    g.lineStyle(1, 0x39424e, 1).strokeRect(px, py, 340, 330);
    g.lineStyle(1, 0x232b36, 1);
    for (let y = py + 96; y < py + 250; y += 26) g.lineBetween(px + 26, y, px + 314, y);

    const title = this.line(GAME_W / 2, py + 16, '', { size: 15, color: C_MAIN, origin: 0.5 });
    this.rel(200, () => this.typewrite(title, 'VOLUNTARY EXCISION CONSENT', 34));
    const title2 = this.line(GAME_W / 2, py + 36, '', { size: 11, color: C_DIM, origin: 0.5 });
    this.rel(950, () => this.typewrite(title2, '· TRIPLICATE ·', 34));
    const note = this.line(GAME_W / 2, py + 62, '', { size: 11, color: C_DIM, origin: 0.5 });
    this.rel(1400, () =>
      this.typewrite(note, '(white copy: patient keeps —\nthough you will no longer have hands)', 40),
    );

    // The signature draws itself, pen gliding on its own.
    const sig = this.own(this.add.graphics().setDepth(6));
    const sigPts = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      sigPts.push({
        x: px + 60 + t * 200,
        y: py + 282 + Math.sin(t * 19) * 7 * (1 - t * 0.4) + Math.sin(t * 47) * 2,
      });
    }
    const pen = this.own(
      this.add.triangle(sigPts[0].x, sigPts[0].y, 0, 0, 8, 3, 0, 6, 0x9fd8e8).setDepth(7),
    );
    this.rel(2400, () => {
      let drawn = 0;
      const timer = this.time.addEvent({
        delay: 34,
        repeat: sigPts.length - 2,
        callback: () => {
          if (!sig.active) {
            timer.remove();
            return;
          }
          drawn++;
          sig.lineStyle(2, 0x9fb4c4, 0.9);
          sig.lineBetween(sigPts[drawn - 1].x, sigPts[drawn - 1].y, sigPts[drawn].x, sigPts[drawn].y);
          pen.setPosition(sigPts[drawn].x, sigPts[drawn].y);
        },
      });
      this.timers.push(timer);
    });

    // The stamp slams: VOLUNTARY. This is the sound of the whole world.
    this.rel(4400, () => {
      const stamp = this.own(
        this.add
          .text(GAME_W / 2 + 60, py + 210, 'VOLUNTARY', {
            fontFamily: MONO,
            fontSize: '22px',
            color: C_RED,
          })
          .setOrigin(0.5)
          .setScale(3)
          .setAlpha(0),
      );
      const frame = this.own(
        this.add
          .rectangle(GAME_W / 2 + 60, py + 210, 150, 46)
          .setStrokeStyle(3, 0xb03036, 0.9)
          .setScale(3)
          .setAlpha(0)
          .setDepth(6),
      );
      stamp.setDepth(7);
      this.tweens.add({
        targets: [stamp, frame],
        scale: 1,
        alpha: 0.92,
        duration: 140,
        ease: 'Quad.easeIn',
        onComplete: () => {
          this.cameras.main.shake(120, 0.006);
          synthThud(this, { freq: 70, gain: 0.45, dur: 0.4 });
        },
      });
    });
    this.rel(900, () =>
      this.narrate("— three copies. one for the company, one for the state, one for you. though you won't have hands to hold it."),
    );
  }

  // --------------------------------------------------------- beat 5: SURVEY

  beatSurvey() {
    this.clearBeat();
    const q = this.line(GAME_W / 2, 180, '', { size: 18, color: C_MAIN, origin: 0.5 });
    this.rel(200, () => this.typewrite(q, 'Please rate your upgrade experience', 34));

    // Five star outlines, drawn — no font glyphs to trust.
    const stars = [];
    for (let i = 0; i < 5; i++) {
      const sg = this.own(this.add.graphics().setDepth(5));
      this.drawStar(sg, GAME_W / 2 - 120 + i * 60, 280, 18, false);
      stars.push(sg);
    }
    // The cursor drifts in and answers for you.
    const cursor = this.own(
      this.add.triangle(GAME_W / 2 + 260, 430, 0, 0, 12, 5, 2, 11, 0x9fb4c4).setDepth(7),
    );
    this.rel(1800, () => {
      this.tweens.add({
        targets: cursor,
        x: GAME_W / 2 + 120,
        y: 300,
        duration: 900,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          synthBuzz(this, { freq: 320, dur: 0.08, gain: 0.08 });
          stars.forEach((sg, i) => {
            this.time.delayedCall(i * 160, () => {
              if (!sg.active) return;
              sg.clear();
              this.drawStar(sg, GAME_W / 2 - 120 + i * 60, 280, 18, true);
              synthBuzz(this, { freq: 380 + i * 60, dur: 0.07, gain: 0.07 });
            });
          });
        },
      });
    });
    const cap = this.line(GAME_W / 2, 340, '', { size: 12, color: C_DIM, origin: 0.5 });
    this.rel(3800, () => this.typewrite(cap, '(the unit defaults to five stars)', 40));
    this.rel(900, () => this.narrate('— the survey ended before you answered. it always does.'));
  }

  drawStar(g, x, y, r, filled) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 === 0 ? r : r * 0.45;
      pts.push({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr });
    }
    if (filled) {
      g.fillStyle(0x9fd8e8, 0.95);
      g.fillPoints(pts, true);
    } else {
      g.lineStyle(1.5, 0x39424e, 1);
      g.strokePoints(pts, true);
    }
  }

  // --------------------------------------------------------- beat 6: VESSEL

  beatVessel() {
    this.clearBeat();
    this.narration.setText('');
    // Who is speaking, and from where: the civic terminal in your kitchen,
    // on the last morning. The frame makes the voice a THING with an address.
    const g = this.own(this.add.graphics().setDepth(5));
    const mx = GAME_W / 2 - 260;
    const my = 150;
    g.fillStyle(0x0a0e16, 1).fillRect(mx - 12, my - 34, 544, 224);
    g.lineStyle(2, 0x39424e, 1).strokeRect(mx - 12, my - 34, 544, 224);
    g.fillStyle(0x0d1420, 1).fillRect(mx, my - 22, 520, 200);
    const tag = this.own(
      this.add
        .text(mx + 8, my - 32, 'VESSEL · CIVIC TERMINAL — NEURAL BRIDGE PREVIEW', {
          fontFamily: MONO,
          fontSize: '11px',
          color: C_DIM,
        })
        .setDepth(6),
    );
    const hello = this.line(GAME_W / 2, my + 30, '', { size: 24, color: C_CYAN, origin: 0.5 });
    this.rel(700, () => {
      this.typewrite(hello, 'Good morning, Citizen 8.', 18);
      synthBuzz(this, { freq: 260, dur: 0.3, gain: 0.1 });
    });
    const sub = this.line(GAME_W / 2, my + 90, '', { size: 14, color: C_DIM, origin: 0.5 });
    this.rel(2900, () =>
      this.typewrite(sub, 'Today is the last day you own your body. Report to Clinic 7 by 06:00.', 26),
    );
    this.rel(900, () =>
      this.narrate('— the voice does not come from the screen. it comes from behind your eyes. it has been there since the bridge test.'),
    );
  }

  // ---------------------------------------------------------- beat 7: WALK

  beatWalk() {
    this.clearBeat();
    // The bridge into L2-1: the same dark silhouette the game opens on,
    // walking into the clinic's cold light. This is WHERE the rooftop is.
    const cap = this.line(GAME_W / 2, 96, '', { size: 15, color: C_MAIN, origin: 0.5 });
    this.rel(300, () => this.typewrite(cap, 'CLINIC 7 — ROOFTOP INTAKE · 05:58', 30));

    // Ground line + the cold door on the right.
    const g = this.own(this.add.graphics().setDepth(5));
    g.lineStyle(2, 0x3a4a5c, 1);
    g.lineBetween(0, 430, GAME_W, 430);
    const doorX = GAME_W - 220;
    g.lineStyle(2, 0x9fd8e8, 0.9);
    g.strokeRect(doorX, 300, 70, 130);
    const spill = this.own(
      this.add
        .image(doorX + 35, 365, 'ch2-mote')
        .setScale(12, 18)
        .setTint(0x9fd8e8)
        .setAlpha(0.14)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(4),
    );
    this.tweens.add({ targets: spill, alpha: 0.3, duration: 1500, yoyo: true, repeat: -1 });

    // The walker: same minimal silhouette L2-1 uses (dark body, one cold rim).
    const walker = this.own(this.add.container(120, 430).setDepth(6));
    const wBody = this.add.rectangle(0, -34, 16, 34, 0x232b36);
    const wHead = this.add.circle(2, -58, 8, 0x232b36);
    const wRim = this.add.rectangle(-7, -34, 1.5, 30, 0x7fd4e8).setAlpha(0.5);
    const wLegL = this.add.rectangle(-4, -12, 5, 24, 0x232b36);
    const wLegR = this.add.rectangle(4, -12, 5, 24, 0x232b36);
    walker.add([wLegL, wLegR, wBody, wRim, wHead]);

    // He walks. The legs trade steps; the camera does not move — HE does.
    this.tweens.add({ targets: wLegL, angle: 18, duration: 260, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: wLegR, angle: -18, duration: 260, yoyo: true, repeat: -1, delay: 260 });
    this.rel(600, () => {
      this.tweens.add({
        targets: walker,
        x: doorX + 35,
        duration: 4600,
        ease: 'Linear',
        onComplete: () => {
          // Into the light. The next frame of the story is L2-1's rooftop.
          this.tweens.add({ targets: walker, alpha: 0, duration: 500 });
        },
      });
    });
    this.rel(900, () => this.narrate('— the walk is short. you will not walk back.'));
  }
}
