import Phaser from 'phaser';
import { PAPER } from './paperPalette.js';
import { draftLine, makeRandom } from './paperSurface.js';

function traceLimb(g, points, width = 9) {
  g.lineStyle(width + 3, PAPER.graphite, 0.9);
  g.beginPath();
  g.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((point) => g.lineTo(point.x, point.y));
  g.strokePath();
  g.lineStyle(width, PAPER.sheetMid, 1);
  g.beginPath();
  g.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((point) => g.lineTo(point.x, point.y));
  g.strokePath();
}

export function drawPaperButch(figure, pose = 'idle') {
  const g = figure;
  const rnd = makeRandom(0xb07c4 + (pose === 'paint' ? 11 : pose === 'wash' ? 23 : 0));
  const raised = pose === 'paint' || pose === 'wash';
  const accent = pose === 'paint' ? PAPER.bookCloth : PAPER.indigo;

  g.clear();
  traceLimb(g, [{ x: -8, y: -28 }, { x: -10, y: -2 }], 9);
  traceLimb(g, [{ x: 8, y: -28 }, { x: 10, y: -2 }], 9);
  g.fillStyle(PAPER.figureSoft, 0.96);
  g.fillRoundedRect(-19, -7, 18, 9, 4);
  g.fillRoundedRect(1, -7, 18, 9, 4);

  g.fillStyle(PAPER.sheetMid, 1);
  g.fillPoints([
    new Phaser.Geom.Point(-18, -58), new Phaser.Geom.Point(18, -58),
    new Phaser.Geom.Point(16, -25), new Phaser.Geom.Point(-16, -25),
  ], true);
  g.lineStyle(2, PAPER.graphite, 0.92);
  draftLine(g, rnd, -18, -58, 18, -58, { overshoot: 2, jitter: 0.45, segments: 5 });
  draftLine(g, rnd, 18, -58, 16, -25, { overshoot: 2, jitter: 0.45, segments: 5 });
  draftLine(g, rnd, 16, -25, -16, -25, { overshoot: 2, jitter: 0.45, segments: 5 });
  draftLine(g, rnd, -16, -25, -18, -58, { overshoot: 2, jitter: 0.45, segments: 5 });

  const leftArm = [{ x: -16, y: -53 }, { x: -23, y: -35 }, { x: -22, y: -18 }];
  const rightArm = raised
    ? [{ x: 16, y: -53 }, { x: 29, y: -69 }, { x: 26, y: -87 }]
    : [{ x: 16, y: -53 }, { x: 23, y: -35 }, { x: 22, y: -18 }];
  traceLimb(g, leftArm, 7);
  traceLimb(g, rightArm, 7);
  [leftArm.at(-1), rightArm.at(-1)].forEach((hand) => {
    g.fillStyle(PAPER.sheetHigh, 1).fillCircle(hand.x, hand.y, 5);
    g.lineStyle(1.5, PAPER.graphite, 0.9).strokeCircle(hand.x, hand.y, 5);
  });

  if (raised) {
    g.lineStyle(3, PAPER.graphite, 0.92);
    draftLine(g, rnd, 30, -89, 38, -105, { overshoot: 1, jitter: 0.35, segments: 4 });
    g.lineStyle(4, accent, 0.9);
    draftLine(g, rnd, 38, -105, 41, -112, { overshoot: 0, jitter: 0.5, segments: 3 });
  }

  g.lineStyle(1.7, PAPER.graphite, 0.82);
  draftLine(g, rnd, -13, -56, -2, -41, { overshoot: 1, jitter: 0.35, segments: 4 });
  draftLine(g, rnd, 13, -56, 2, -41, { overshoot: 1, jitter: 0.35, segments: 4 });
  draftLine(g, rnd, 0, -42, 0, -27, { overshoot: 1, jitter: 0.35, segments: 4 });
  g.fillStyle(PAPER.figure, 0.9).fillCircle(0, -35, 1.7);

  g.fillStyle(PAPER.sheetHigh, 1).fillCircle(0, -81, 22);
  g.lineStyle(2.1, PAPER.graphite, 0.94).strokeCircle(0, -81, 22);
  g.fillStyle(PAPER.graphiteSoft, 0.92);
  g.fillPoints([
    new Phaser.Geom.Point(-20, -85), new Phaser.Geom.Point(-23, -95),
    new Phaser.Geom.Point(-16, -93), new Phaser.Geom.Point(-15, -105),
    new Phaser.Geom.Point(-8, -101), new Phaser.Geom.Point(-2, -110),
    new Phaser.Geom.Point(4, -102), new Phaser.Geom.Point(12, -108),
    new Phaser.Geom.Point(13, -98), new Phaser.Geom.Point(22, -99),
    new Phaser.Geom.Point(19, -84), new Phaser.Geom.Point(11, -94),
    new Phaser.Geom.Point(5, -91), new Phaser.Geom.Point(-4, -96),
    new Phaser.Geom.Point(-13, -91),
  ], true);
  g.fillStyle(PAPER.figure, 1).fillCircle(-7, -79, 2.1).fillCircle(7, -79, 2.1);
  g.lineStyle(1.3, PAPER.graphiteSoft, 0.78);
  draftLine(g, rnd, -4, -68, 4, -68, { overshoot: 0, jitter: 0.25, segments: 3 });
  figure.paperButchPose = pose;
}

export function createPaperButch(scene, x, feetY, depth = 30) {
  const figure = scene.add.graphics().setPosition(x, feetY).setDepth(depth);
  drawPaperButch(figure, 'idle');
  return figure;
}

export function animatePaperButch(figure, time, { moving = false, paint = false, wash = false } = {}) {
  const pose = paint ? 'paint' : wash ? 'wash' : moving ? 'walk' : 'idle';
  if (figure.paperButchPose !== pose) drawPaperButch(figure, pose);
  figure.setRotation(pose === 'walk' ? Math.sin(time / 105) * 0.065 : 0);
  return pose;
}
