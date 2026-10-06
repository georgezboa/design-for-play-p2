// Jointed figures for the panel actors (Butch, the Conductor, Mara's
// silhouette, the train). Parts are canvases from art/figures.js; this file
// turns them into Phaser containers and animates idle breathing, the walk
// cycle, sitting, and small gestures. The rig never moves itself across the
// screen: PanelScene places it from the model's tile-local coordinates.

import { BUTCH_PARTS, CONDUCTOR_PARTS, MARA_PARTS, RES, TRAIN_PARTS } from './art/figures.js';

function ensurePartTextures(scene, prefix, parts) {
  Object.entries(parts).forEach(([name, part]) => {
    const key = `nsv-${prefix}-${name}`;
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, Math.ceil(part.w * RES), Math.ceil(part.h * RES));
    const c = tex.getContext();
    c.scale(RES, RES);
    part.paint(c);
    tex.refresh();
  });
}

function img(scene, prefix, parts, name, x, y) {
  const part = parts[name];
  const image = scene.add.image(x, y, `nsv-${prefix}-${name}`);
  image.setOrigin(part.pivot[0] / part.w, part.pivot[1] / part.h);
  image.setScale(1 / RES);
  return image;
}

function glowImage(scene, x, y, size, tint, alpha) {
  const glow = scene.add.image(x, y, 'nsv-radial');
  glow.setDisplaySize(size, size);
  glow.setTint(tint);
  glow.setAlpha(alpha);
  glow.setBlendMode('ADD');
  return glow;
}

// ---------------------------------------------------------------------------

function buildButch(scene) {
  ensurePartTextures(scene, 'butch', BUTCH_PARTS);
  const P = BUTCH_PARTS;
  const root = scene.add.container(0, 0);
  const body = scene.add.container(0, 0);
  root.add(body);
  const hipY = -30;
  const leg = (x) => {
    const thigh = scene.add.container(x, hipY);
    thigh.add(img(scene, 'butch', P, 'thigh', 0, 0));
    const knee = scene.add.container(0, 14);
    knee.add(img(scene, 'butch', P, 'shin', 0, 0));
    thigh.add(knee);
    thigh.knee = knee;
    return thigh;
  };
  const armBack = scene.add.container(-3, -52);
  armBack.add(img(scene, 'butch', P, 'arm', 0, 0));
  const legBack = leg(-2.5);
  const legFront = leg(2.5);
  const torso = img(scene, 'butch', P, 'torso', 0, hipY + 11);
  const head = img(scene, 'butch', P, 'head', 1, -54);
  const armFront = scene.add.container(3, -52);
  armFront.add(img(scene, 'butch', P, 'arm', 0, 0));
  const lamp = img(scene, 'butch', P, 'lamp', 9, -30);
  const ticket = img(scene, 'butch', P, 'ticket', 0, 23).setVisible(false);
  const carried = img(scene, 'butch', P, 'case', 8, -34).setVisible(false);
  const glow = glowImage(scene, 9, -24, 70, 0xffc070, 0.5);
  legBack.list.forEach((part) => part.setTint?.(0xb8b8c0));
  armBack.list[0].setTint(0xa8b0b8);
  armFront.add(ticket);
  body.add([armBack, legBack, legFront, torso, head, carried, armFront, lamp, glow]);
  const shadow = scene.add.ellipse(0, 0, 34, 6, 0x000000, 0.35);
  root.addAt(shadow, 0);

  let phase = 0;
  let wasCarrying = false;
  let stagger = 0;
  const rig = {
    root,
    height: 70,
    glow,
    update(dt, { pose, moving, time, carrying, speed = null }) {
      const t = time / 1000;
      const holding = carrying === 'case';
      // "the first weight": a stagger the moment the case lands in his arms
      if (holding && !wasCarrying) stagger = 1;
      wasCarrying = holding;
      stagger = Math.max(0, stagger - dt / 1400);
      carried.setVisible(holding);
      ticket.setVisible(pose === 'ticket');
      body.rotation = stagger ? Math.sin(stagger * 18) * 0.12 * stagger + 0.06 * stagger : 0;
      // joints that only the slumped sleep pose moves
      head.x = 1;
      armFront.setPosition(3, -52);
      armBack.setPosition(-3, -52);
      torso.rotation = 0;
      if (pose === 'sleep') {
        // asleep on the stool: slumped forward, chin on chest, slow breath
        const breath = Math.sin(t * 1.15);
        body.y = 8 + breath * 0.5;
        legFront.rotation = -1.35; legFront.knee.rotation = 1.3;
        legBack.rotation = -1.25; legBack.knee.rotation = 1.25;
        torso.rotation = 0.34 + breath * 0.025;
        torso.scaleY = (1 + breath * 0.018) / RES;
        head.x = 13;
        head.y = -44 + breath * 0.6;
        head.rotation = 0.95 + breath * 0.03;
        armFront.setPosition(13, -48);
        armBack.setPosition(8, -49);
        armFront.rotation = -0.55;
        armBack.rotation = -0.45;
        glow.alpha = 0.2;
        rig.asleep = true;
        return;
      }
      rig.asleep = false;
      if (pose === 'ticket') {
        body.y = 0;
        legFront.rotation = 0.04; legFront.knee.rotation = 0;
        legBack.rotation = -0.04; legBack.knee.rotation = 0;
        armFront.rotation = -2.1 + Math.sin(t * 1.8) * 0.05;
        armBack.rotation = -0.05;
        torso.rotation = 0;
        head.rotation = -0.12;
        head.y = -54;
        ticket.rotation = 1.9;
      } else if (pose === 'sit') {
        body.y = 7;
        legFront.rotation = -1.35; legFront.knee.rotation = 1.3;
        legBack.rotation = -1.25; legBack.knee.rotation = 1.25;
        armFront.rotation = -0.9 + Math.sin(t * 1.3) * 0.04;
        armBack.rotation = -0.7;
        torso.rotation = -0.05;
        head.rotation = -0.06 + Math.sin(t * 0.7) * 0.03;
        head.y = -54 + Math.sin(t * 2) * 0.3;
        shadow.setVisible(true);
      } else if (moving) {
        // the stride keeps up with the walk (no skating at a faster pace)
        phase += dt * 0.0105 * Math.max(0.7, Math.min(1.5, (speed ?? 170) / 170));
        const s = Math.sin(phase);
        const c = Math.cos(phase);
        body.y = -Math.abs(c) * 1.8;
        legFront.rotation = s * 0.5; legFront.knee.rotation = Math.max(0, -Math.sin(phase + 0.9)) * 0.75;
        legBack.rotation = -s * 0.5; legBack.knee.rotation = Math.max(0, Math.sin(phase + 0.9)) * 0.75;
        armFront.rotation = -s * 0.45;
        armBack.rotation = s * 0.45;
        torso.rotation = 0.06;
        head.rotation = 0.03;
        head.y = -54;
        lamp.rotation = -s * 0.3;
      } else {
        const breathe = Math.sin(t * 2.1);
        body.y = 0;
        legFront.rotation = 0.04; legFront.knee.rotation = 0;
        legBack.rotation = -0.04; legBack.knee.rotation = 0;
        armFront.rotation = 0.05 + breathe * 0.02;
        armBack.rotation = -0.05 - breathe * 0.02;
        torso.rotation = 0;
        torso.scaleY = (1 + breathe * 0.012) / RES;
        head.y = -54 - breathe * 0.4;
        head.rotation = Math.sin(t * 0.5) * 0.03;
        lamp.rotation = Math.sin(t * 1.4) * 0.05;
      }
      if (holding) {
        armFront.rotation = -1.15 + Math.sin(t * 2) * 0.03;
        armBack.rotation = -1.0;
        body.y += stagger * 3;
        legFront.knee.rotation = Math.max(legFront.knee.rotation, stagger * 0.5);
        legBack.knee.rotation = Math.max(legBack.knee.rotation, stagger * 0.5);
      }
      glow.alpha = 0.42 + Math.sin(t * 13) * 0.03 + Math.sin(t * 3.1) * 0.04;
    },
    gesture(name) {
      if (name === 'receive') scene.tweens.add({ targets: armFront, rotation: -1.4, duration: 420, yoyo: true, hold: 500, ease: 'Sine.easeInOut' });
    },
  };
  return rig;
}

function buildConductor(scene) {
  ensurePartTextures(scene, 'conductor', CONDUCTOR_PARTS);
  const P = CONDUCTOR_PARTS;
  const root = scene.add.container(0, 0);
  const body = scene.add.container(0, 0);
  root.add(scene.add.ellipse(0, 0, 50, 8, 0x000000, 0.4));
  root.add(body);
  const legs = img(scene, 'conductor', P, 'legs', 0, -15);
  const torso = img(scene, 'conductor', P, 'torso', 0, -12);
  const head = img(scene, 'conductor', P, 'head', 1, -80);
  const armBack = scene.add.container(-8, -76);
  armBack.add(img(scene, 'conductor', P, 'arm', 0, 0));
  armBack.list[0].setTint(0xb0b4bc);
  const armFront = scene.add.container(9, -76);
  armFront.add(img(scene, 'conductor', P, 'arm', 0, 0));
  const punch = img(scene, 'conductor', P, 'punch', 0, 34);
  armFront.add(punch);
  const lanternArm = armBack;
  const lantern = img(scene, 'conductor', P, 'lantern', 0, 35);
  lanternArm.add(lantern);
  const glow = glowImage(scene, -8, -32, 170, 0xffb860, 0.6);
  body.add([armBack, legs, torso, head, armFront, glow]);
  const rig = {
    root,
    height: 110,
    glow,
    punch,
    update(dt, { time }) {
      const t = time / 1000;
      const breathe = Math.sin(t * 1.6);
      torso.scaleY = (1 + breathe * 0.01) / RES;
      head.y = -80 - breathe * 0.5;
      head.rotation = Math.sin(t * 0.4) * 0.025;
      lanternArm.rotation = 0.08 + Math.sin(t * 1.2) * 0.05;
      lantern.rotation = -Math.sin(t * 1.2 + 0.4) * 0.12;
      const lx = -8 + Math.sin(lanternArm.rotation) * -35;
      glow.x = lx;
      glow.alpha = 0.55 + Math.sin(t * 11) * 0.03 + Math.sin(t * 2.3) * 0.05;
    },
    gesture(name) {
      if (name === 'offer') scene.tweens.add({ targets: armFront, rotation: -1.2, duration: 520, ease: 'Sine.easeOut' });
      if (name === 'rest') scene.tweens.add({ targets: armFront, rotation: 0, duration: 520, ease: 'Sine.easeInOut' });
    },
  };
  return rig;
}

function buildMara(scene) {
  ensurePartTextures(scene, 'mara', MARA_PARTS);
  const root = scene.add.container(0, 0);
  const body = img(scene, 'mara', MARA_PARTS, 'body', 0, 0);
  root.add(body);
  let phase = 0;
  return {
    root,
    height: 66,
    update(dt, { moving }) {
      if (moving) { phase += dt * 0.009; body.y = -Math.abs(Math.cos(phase)) * 1.5; body.rotation = Math.sin(phase) * 0.03; } else { body.y = 0; body.rotation = 0; }
    },
    gesture() {},
  };
}

/** The painted night train (worldAssets TRAIN_URL): 150 tile px long, wheels on the rail. */
const TRAIN_IMAGE = Object.freeze({ key: 'nsv-train-night', width: 150, railAt: 0.905 });

function buildTrain(scene) {
  const root = scene.add.container(0, 0);
  let body;
  let lamp;
  if (scene.textures.exists(TRAIN_IMAGE.key)) {
    // the painted carriage from the chapter's own art, not a toy rectangle
    body = scene.add.image(0, 0, TRAIN_IMAGE.key).setOrigin(0.5, TRAIN_IMAGE.railAt);
    body.setScale(TRAIN_IMAGE.width / body.width);
    lamp = glowImage(scene, 70, -14, 90, 0xffd890, 0.7);
  } else {
    ensurePartTextures(scene, 'train', TRAIN_PARTS);
    body = img(scene, 'train', TRAIN_PARTS, 'body', 0, 0);
    lamp = glowImage(scene, 72, -22, 90, 0xffd890, 0.7);
  }
  root.add([body, lamp]);
  return {
    root,
    height: 44,
    update(dt, { moving, time }) { body.y = moving ? Math.sin(time / 60) * 0.6 : 0; lamp.alpha = 0.6 + Math.sin(time / 90) * 0.05; },
    gesture() {},
  };
}

const BUILDERS = { butch: buildButch, conductor: buildConductor, mara: buildMara, train: buildTrain };

export function buildRig(scene, kind) {
  return (BUILDERS[kind] ?? buildButch)(scene);
}
