import test from 'node:test';
import assert from 'node:assert/strict';
import { PLAYER } from '../../src/chapters/museum3d/config.js';

class FakeEventTarget {
  constructor() {
    this.listeners = new Map();
  }

  addEventListener(type, fn) {
    const list = this.listeners.get(type) ?? [];
    list.push(fn);
    this.listeners.set(type, list);
  }

  removeEventListener(type, fn) {
    const list = this.listeners.get(type) ?? [];
    this.listeners.set(type, list.filter((entry) => entry !== fn));
  }

  dispatchEvent(event) {
    for (const fn of this.listeners.get(event.type) ?? []) fn(event);
  }
}

test('Chapter 5 uses the faster look sensitivity requested for the museum', () => {
  assert.ok(PLAYER.lookSensitivity >= 0.0035);
});

test('controller falls back to click-and-drag mode when pointer lock is unavailable', async () => {
  const fakeWindow = new FakeEventTarget();
  const fakeDocument = new FakeEventTarget();
  fakeDocument.pointerLockElement = null;
  fakeDocument.exitPointerLock = () => {};
  globalThis.window = fakeWindow;
  globalThis.document = fakeDocument;

  const { FirstPersonController } = await import(
    `../../src/chapters/museum3d/player/FirstPersonController.js?fallback=${Date.now()}`
  );
  const domElement = new FakeEventTarget();
  const camera = {
    position: { set() {} },
    rotation: { set() {} },
    rotateY() {},
    rotateX() {},
  };
  const controller = new FirstPersonController(camera, domElement, null);
  const changes = [];
  controller.onLockChange((active) => changes.push(active));

  controller.lock();
  assert.equal(controller.isLocked, false);
  assert.equal(controller.isActive, true);
  assert.equal(controller.usesDragLook, true);
  assert.deepEqual(changes, [true]);

  controller.unlock();
  assert.equal(controller.isActive, false);
  assert.deepEqual(changes, [true, false]);
  controller.dispose();
});

test('fallback mode preserves an atomic WASD press that begins and ends between frames', async () => {
  const fakeWindow = new FakeEventTarget();
  const fakeDocument = new FakeEventTarget();
  fakeDocument.pointerLockElement = null;
  fakeDocument.exitPointerLock = () => {};
  globalThis.window = fakeWindow;
  globalThis.document = fakeDocument;

  const { FirstPersonController } = await import(
    `../../src/chapters/museum3d/player/FirstPersonController.js?atomic=${Date.now()}`
  );
  const domElement = new FakeEventTarget();
  const camera = {
    position: { set() {} },
    rotation: { set() {} },
    rotateY() {},
    rotateX() {},
  };
  const collisionWorld = {
    moveAndCollide(x, z, dx, dz) { return { x: x + dx, z: z + dz }; },
  };
  const controller = new FirstPersonController(camera, domElement, collisionWorld);
  controller.lock();
  controller.setPose(0, 0, 0);

  fakeWindow.dispatchEvent({ type: 'keydown', code: 'KeyW', repeat: false });
  fakeWindow.dispatchEvent({ type: 'keyup', code: 'KeyW' });
  controller.update(1 / 60);
  assert.ok(Math.abs(controller.position.z + 0.18) < 0.001, `expected one tap step, got ${controller.position.z}`);

  controller.update(1 / 60);
  assert.ok(Math.abs(controller.position.z + 0.18) < 0.001, 'tap must be consumed exactly once');
  controller.dispose();
});

test('Space performs one grounded jump and lands without changing XZ position', async () => {
  const fakeWindow = new FakeEventTarget();
  const fakeDocument = new FakeEventTarget();
  fakeDocument.pointerLockElement = null;
  fakeDocument.exitPointerLock = () => {};
  globalThis.window = fakeWindow;
  globalThis.document = fakeDocument;

  const { FirstPersonController } = await import(
    `../../src/chapters/museum3d/player/FirstPersonController.js?jump=${Date.now()}`
  );
  const domElement = new FakeEventTarget();
  const camera = {
    position: { set() {} },
    rotation: { set() {} },
    rotateY() {},
    rotateX() {},
  };
  const collisionWorld = {
    moveAndCollide(x, z) { return { x, z }; },
  };
  const controller = new FirstPersonController(camera, domElement, collisionWorld);
  controller.setPose(3, -2);

  let prevented = false;
  fakeWindow.dispatchEvent({
    type: 'keydown',
    code: 'Space',
    repeat: false,
    preventDefault() { prevented = true; },
  });
  let peak = 0;
  for (let i = 0; i < 100; i += 1) {
    controller.update(1 / 60);
    peak = Math.max(peak, controller.position.y);
  }

  assert.equal(prevented, true);
  assert.ok(peak > 1.2 && peak < 1.4, `unexpected jump peak ${peak}`);
  assert.equal(controller.position.y, 0);
  assert.equal(controller.isGrounded, true);
  assert.equal(controller.position.x, 3);
  assert.equal(controller.position.z, -2);
  controller.dispose();
});

test('a raised platform blocks walking, catches a jump, and releases the player at its edge', async () => {
  const fakeWindow = new FakeEventTarget();
  const fakeDocument = new FakeEventTarget();
  fakeDocument.pointerLockElement = null;
  fakeDocument.exitPointerLock = () => {};
  globalThis.window = fakeWindow;
  globalThis.document = fakeDocument;

  const [{ FirstPersonController }, { StaticCollisionWorld }] = await Promise.all([
    import(`../../src/chapters/museum3d/player/FirstPersonController.js?platform=${Date.now()}`),
    import(`../../src/chapters/museum3d/player/StaticCollisionWorld.js?platform=${Date.now()}`),
  ]);
  const domElement = new FakeEventTarget();
  const camera = {
    position: { set() {} },
    rotation: { set() {} },
    rotateY() {},
    rotateX() {},
  };
  const world = new StaticCollisionWorld();
  world.addOrientedBoxFromCenterSize(
    0,
    -1,
    4,
    2,
    0,
    'test-deck',
    { minY: 0, maxY: 1.15 },
  );
  world.addWalkSurface({
    centerX: 0,
    centerZ: -1,
    width: 4,
    depth: 2,
    topY: 1.15,
    id: 'test-deck',
  });

  const controller = new FirstPersonController(camera, domElement, world);
  controller.setPose(0, 0.55, 0);

  fakeWindow.dispatchEvent({ type: 'keydown', code: 'KeyW' });
  for (let i = 0; i < 30; i += 1) controller.update(1 / 60);
  fakeWindow.dispatchEvent({ type: 'keyup', code: 'KeyW' });
  assert.ok(controller.position.z > 0.25, 'walking should stop at the platform edge');
  assert.equal(controller.position.y, 0);

  controller.setPose(0, 0.55, 0);
  fakeWindow.dispatchEvent({ type: 'keydown', code: 'Space', repeat: false, preventDefault() {} });
  fakeWindow.dispatchEvent({ type: 'keydown', code: 'KeyW' });
  for (let i = 0; i < 32; i += 1) controller.update(1 / 60);
  fakeWindow.dispatchEvent({ type: 'keyup', code: 'KeyW' });
  for (let i = 0; i < 45; i += 1) controller.update(1 / 60);
  assert.equal(controller.isGrounded, true);
  assert.ok(Math.abs(controller.position.y - 1.15) < 0.001, `expected deck landing, got ${controller.position.y}`);

  fakeWindow.dispatchEvent({ type: 'keydown', code: 'KeyS' });
  for (let i = 0; i < 55; i += 1) controller.update(1 / 60);
  fakeWindow.dispatchEvent({ type: 'keyup', code: 'KeyS' });
  for (let i = 0; i < 45; i += 1) controller.update(1 / 60);
  assert.equal(controller.position.y, 0);
  assert.equal(controller.isGrounded, true);
  controller.dispose();
});
