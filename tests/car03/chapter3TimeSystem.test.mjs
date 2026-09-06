import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as THREE from 'three';

import { Chapter3TimeVisualController, chapter3LightForClock } from '../../src/cars/presentCity3d/Chapter3TimeVisualController.js';
import { createChapter3OpeningModel } from '../../src/cars/presentCity3d/chapter3OpeningModel.js';
import {
  CHAPTER3_PERIODS,
  CHAPTER3_TIME_ANCHORS,
  advanceChapter3Clock,
  advanceChapter3ClockTo,
  chapter3Period,
  createChapter3Clock,
} from '../../src/cars/presentCity3d/chapter3TimeSystem.js';

function makePreview() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x758b93);
  scene.fog = new THREE.FogExp2(0x6f8188, 0.0056);
  const hemi = new THREE.HemisphereLight(0x9fbfc5, 0x342b2a, 1.22);
  hemi.name = 'city-hemisphere-light';
  const sun = new THREE.DirectionalLight(0xffc477, 5.3);
  sun.name = 'city-sun-light';
  sun.position.set(-34, 52, 26);
  const fill = new THREE.DirectionalLight(0x4e8793, 0.82);
  fill.name = 'city-fill-light';
  scene.add(hemi, sun, fill);
  return { scene, renderer: { toneMappingExposure: 1.12 } };
}

describe('Chapter 3 authored clock', () => {
  it('starts at 14:20 and classifies every authored visual period', () => {
    const clock = createChapter3Clock();
    assert.equal(clock.time, 'DAY 1 · 14:20');
    assert.equal(clock.period, CHAPTER3_PERIODS.AFTERNOON);
    assert.equal(chapter3Period(1, 17 * 60 + 19), CHAPTER3_PERIODS.AFTERNOON);
    assert.equal(chapter3Period(1, 17 * 60 + 20), CHAPTER3_PERIODS.DUSK);
    assert.equal(chapter3Period(1, 21 * 60 + 29), CHAPTER3_PERIODS.DUSK);
    assert.equal(chapter3Period(1, 21 * 60 + 30), CHAPTER3_PERIODS.NIGHT);
    assert.equal(chapter3Period(2, 6 * 60 + 20), CHAPTER3_PERIODS.DAWN);
  });

  it('charges one minute for a new topic and never rewinds at an authored anchor', () => {
    let clock = createChapter3Clock();
    clock = advanceChapter3Clock(clock, 1, 'first-topic');
    assert.equal(clock.time, 'DAY 1 · 14:21');
    assert.equal(clock.dialogueMinutesSpent, 1);
    clock = advanceChapter3ClockTo(clock, CHAPTER3_TIME_ANCHORS.TRAIN_DEPARTED, 'train-departed');
    assert.equal(clock.time, 'DAY 1 · 14:22');
    clock = advanceChapter3ClockTo(clock, CHAPTER3_TIME_ANCHORS.CHAPTER_START, 'old-anchor');
    assert.equal(clock.time, 'DAY 1 · 14:22');
    assert.equal(clock.lastCostMinutes, 0);
  });

  it('keeps direct playtest anchors deterministic and exposes a one-topic night threshold route', () => {
    assert.equal(createChapter3OpeningModel({ startAt: 'interaction-15' }).snapshot().clock.time, 'DAY 1 · 16:35');
    assert.equal(createChapter3OpeningModel({ startAt: 'interaction-21' }).snapshot().clock.time, 'DAY 1 · 17:20');
    assert.equal(createChapter3OpeningModel({ startAt: 'interaction-22' }).snapshot().clock.time, 'DAY 1 · 17:24');

    const threshold = createChapter3OpeningModel({ startAt: 'night-transition-qa' });
    assert.equal(threshold.snapshot().clock.time, 'DAY 1 · 21:29');
    assert.equal(threshold.snapshot().clock.period, CHAPTER3_PERIODS.DUSK);
    assert.equal(threshold.observeCutInterface('cut'), true);
    assert.equal(threshold.snapshot().clock.time, 'DAY 1 · 21:30');
    assert.equal(threshold.snapshot().clock.period, CHAPTER3_PERIODS.NIGHT);
  });

  it('charges the archive material reconstruction exactly three dialogue minutes', () => {
    const model = createChapter3OpeningModel({ startAt: 'interaction-15' });
    model.reachArchiveEntrance();
    model.enterArchive();
    model.inspectArchiveMap();
    model.inspectMaintenanceOrder();
    for (const topic of ['instruction', 'route', 'surface-view', 'cleaning']) model.notePetarTopic(topic);
    model.completePetarInterview();
    const spentBefore = model.snapshot().clock.dialogueMinutesSpent;
    assert.equal(model.inspectMaterialTimeline(), true);
    const state = model.snapshot();
    assert.equal(state.clock.dialogueMinutesSpent - spentBefore, 3);
    assert.equal(state.clock.time, 'DAY 1 · 17:20');
    assert.equal(state.clock.period, CHAPTER3_PERIODS.DUSK);
  });

  it('crossfades lighting and an aligned optional night environment root without moving it', () => {
    const preview = makePreview();
    const root = new THREE.Group();
    root.name = 'chapter-03-environment-night';
    root.position.set(3, 0, -7);
    root.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial()));
    preview.scene.add(root);
    const controller = new Chapter3TimeVisualController(preview);
    controller.request(CHAPTER3_PERIODS.AFTERNOON, { immediate: true });
    assert.equal(root.visible, false);
    assert.equal(controller.request(CHAPTER3_PERIODS.NIGHT), true);
    controller.update(1.4);
    assert.equal(controller.snapshot().transitioning, true);
    assert.equal(controller.snapshot().transitionProgress, 0.5);
    assert.equal(root.visible, true);
    assert.deepEqual(root.position.toArray(), [3, 0, -7]);
    controller.update(1.4);
    assert.equal(controller.snapshot().transitioning, false);
    assert.equal(controller.snapshot().expectedRootName, 'chapter-03-environment-night');
  });

  it('samples a continuous sun path from the authored game clock', () => {
    const at = (day, minuteOfDay, period) => chapter3LightForClock({ day, minuteOfDay, period });
    const afternoon = at(1, 14 * 60 + 20, CHAPTER3_PERIODS.AFTERNOON);
    const lateAfternoon = at(1, 16 * 60 + 35, CHAPTER3_PERIODS.AFTERNOON);
    const dusk = at(1, 17 * 60 + 20, CHAPTER3_PERIODS.DUSK);
    const hotel = at(1, 18 * 60, CHAPTER3_PERIODS.DUSK);
    const night = at(1, 21 * 60 + 30, CHAPTER3_PERIODS.NIGHT);
    const dawn = at(2, 6 * 60 + 20, CHAPTER3_PERIODS.DAWN);
    assert.deepEqual(afternoon.sunPosition, [-34, 52, 26]);
    assert.ok(lateAfternoon.sunPosition[1] < afternoon.sunPosition[1]);
    assert.ok(lateAfternoon.sunPosition[1] > dusk.sunPosition[1]);
    assert.ok(hotel.sunPosition[1] < dusk.sunPosition[1]);
    assert.notDeepEqual(night.sunPosition, hotel.sunPosition);
    assert.deepEqual(dawn.sunPosition, [34, 17, -22]);
    assert.ok(afternoon.sunIntensity > hotel.sunIntensity);
    assert.ok(hotel.sunIntensity > night.sunIntensity);
  });

  it('moves the real directional light when one game minute advances', () => {
    const preview = makePreview();
    const controller = new Chapter3TimeVisualController(preview);
    controller.requestClock({ day: 1, minuteOfDay: 16 * 60 + 35, period: CHAPTER3_PERIODS.AFTERNOON }, { immediate: true });
    const before = preview.scene.getObjectByName('city-sun-light').position.clone();
    assert.equal(controller.requestClock({ day: 1, minuteOfDay: 16 * 60 + 36, period: CHAPTER3_PERIODS.AFTERNOON }), true);
    controller.update(2.8);
    const after = preview.scene.getObjectByName('city-sun-light').position;
    assert.notDeepEqual(after.toArray(), before.toArray());
    assert.equal(controller.snapshot().sampledAbsoluteMinute, 16 * 60 + 36);
  });
});
