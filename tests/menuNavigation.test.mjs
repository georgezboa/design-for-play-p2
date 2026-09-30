import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  PAD_BUTTONS, PAD_REPEAT_DELAY_MS, PAD_REPEAT_MS, createMenuGamepadPoll, cycleIndex, menuKeyAction, padStep, readPadButtons,
} from '../src/shell/menuNavigation.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('focus cycles through the visible controls and wraps at both ends', () => {
  assert.equal(cycleIndex(0, 3, 'next'), 1);
  assert.equal(cycleIndex(2, 3, 'next'), 0);
  assert.equal(cycleIndex(0, 3, 'prev'), 2);
  assert.equal(cycleIndex(1, 3, 'prev'), 0);
  // Focus outside the list: down lands on the first control, up on the last.
  assert.equal(cycleIndex(-1, 3, 'next'), 0);
  assert.equal(cycleIndex(-1, 3, 'prev'), 2);
  assert.equal(cycleIndex(7, 3, 'next'), 0);
  // A one-item panel stays put; an empty one has nowhere to go.
  assert.equal(cycleIndex(0, 1, 'next'), 0);
  assert.equal(cycleIndex(0, 0, 'next'), -1);
});

test('arrows and W / S move, Enter and Space activate, chords are ignored', () => {
  assert.equal(menuKeyAction({ code: 'ArrowUp', key: 'ArrowUp' }), 'prev');
  assert.equal(menuKeyAction({ code: 'ArrowDown', key: 'ArrowDown' }), 'next');
  assert.equal(menuKeyAction({ code: 'KeyW', key: 'z' }), 'prev', 'by position, whatever the layout');
  assert.equal(menuKeyAction({ code: 'KeyS', key: 's' }), 'next');
  assert.equal(menuKeyAction({ code: 'Enter', key: 'Enter' }), 'activate');
  assert.equal(menuKeyAction({ code: 'NumpadEnter', key: 'Enter' }), 'activate');
  assert.equal(menuKeyAction({ code: 'Space', key: ' ' }), 'activate');
  assert.equal(menuKeyAction({ key: 'ArrowDown' }), 'next', 'synthetic events with only a key');
  assert.equal(menuKeyAction({ code: 'Escape', key: 'Escape' }), null, 'Escape stays with the pause menu itself');
  assert.equal(menuKeyAction({ code: 'ArrowLeft', key: 'ArrowLeft' }), null, 'left / right still adjust a slider');
  assert.equal(menuKeyAction({ code: 'KeyS', key: 's', ctrlKey: true }), null);
});

const buttons = (over = {}) => ({ up: false, down: false, a: false, b: false, start: false, ...over });
const run = (frames) => {
  let memory = null;
  return frames.map(([state, at]) => {
    const step = padStep(memory, buttons(state), at);
    memory = step.memory;
    return step.actions;
  });
};

test('the D-pad moves on press and repeats while held', () => {
  const t = PAD_REPEAT_DELAY_MS;
  const actions = run([[{}, 0], [{ down: true }, 16], [{ down: true }, 100], [{ down: true }, 16 + t], [{ down: true }, 16 + t + PAD_REPEAT_MS], [{}, 900], [{ up: true }, 920]]);
  assert.deepEqual(actions, [[], ['next'], [], ['next'], ['next'], [], ['prev']]);
});

test('A activates and B / START go back on release; buttons held at open are ignored', () => {
  assert.deepEqual(run([[{}, 0], [{ a: true }, 16], [{ a: true }, 32], [{}, 48]]), [[], [], [], ['activate']]);
  // The START press that opened the menu, and an A or a D-pad already held, do nothing.
  assert.deepEqual(run([[{ start: true, a: true, down: true }, 0], [{ start: true, a: true, down: true }, 999], [{}, 1016], [{ start: true }, 1032], [{}, 1048]]), [[], [], [], [], ['back']]);
  assert.deepEqual(run([[{}, 0], [{ b: true }, 16], [{ b: true }, 32], [{}, 48]]), [[], [], [], ['back']]);
});

test('every connected pad is read with the standard mapping', () => {
  const pad = (...down) => ({ connected: true, buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: down.includes(i) })) });
  assert.deepEqual(readPadButtons([null, pad(PAD_BUTTONS.DOWN), pad(PAD_BUTTONS.A)]), buttons({ down: true, a: true }));
  assert.deepEqual(readPadButtons([{ ...pad(PAD_BUTTONS.UP), connected: false }]), buttons());
  assert.deepEqual(readPadButtons(undefined), buttons());
});

test('the menu gamepad poll runs only between start() and stop()', () => {
  const timers = new Map();
  let nextId = 1;
  let clock = 0;
  const seen = [];
  let pads = [];
  const poll = createMenuGamepadPoll((action) => seen.push(action), {
    getGamepads: () => pads,
    every: (callback) => { timers.set(nextId, callback); return nextId++; },
    cancel: (id) => timers.delete(id),
    now: () => clock,
  });
  assert.equal(poll.running, false);
  assert.equal(timers.size, 0, 'nothing is polled while the menu is closed');
  poll.start();
  poll.start();
  assert.equal(timers.size, 1, 'one poll, however often the menu is opened');
  const tick = () => { clock += 16; [...timers.values()].forEach((callback) => callback()); };
  tick();
  pads = [{ connected: true, buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: i === PAD_BUTTONS.DOWN })) }];
  tick();
  assert.deepEqual(seen, ['next']);
  poll.stop();
  assert.equal(poll.running, false);
  assert.equal(timers.size, 0);
});

test('the pause menu and every title dialog share the focus-cycling helper (A4-1)', () => {
  const pause = read('src/shell/pauseMenu.js');
  assert.match(pause, /import \{ activateWithin, createMenuGamepadPoll, menuKeyAction, moveFocusWithin, navigableControls \} from '\.\/menuNavigation\.js'/);
  assert.match(pause, /const panel = inConfirm \? confirmPanel : inSettings \? settingsPanel : actions;/);
  assert.match(pause, /padPoll\.start\(\);/);
  assert.match(pause, /padPoll\.stop\(\);/);
  const title = read('src/shell/titleMenu.js');
  // ↑ ↓ / W S and the D-pad move through the open dialog's controls (slots,
  // checkpoints, settings, router, confirmations), not just the board.
  assert.match(title, /const navContainer = \(\) => \(dialog\.open \? panel : actions\);/);
  assert.match(title, /moveFocusWithin\(navContainer\(\), action\)/);
  assert.match(title, /const padPoll = createMenuGamepadPoll\(/);
  assert.match(title, /const action = menuKeyAction\(event\);/);
  assert.doesNotMatch(title, /window\.confirm\(/, 'the in-game confirmation replaces the browser dialog');
});

function fakeControl(name, { disabled = false, hidden = false, className = '' } = {}) {
  return {
    name, disabled, type: 'button', classList: { contains: (c) => className.split(' ').includes(c) },
    getAttribute: () => null, getClientRects: () => (hidden ? [] : [{}]),
    focused: false, clicks: 0,
    focus() { this.focused = true; }, click() { this.clicks += 1; },
  };
}

test('moveFocusWithin skips hidden, disabled and is-disabled controls and wraps', async () => {
  const { moveFocusWithin, activateWithin, navigableControls } = await import('../src/shell/menuNavigation.js');
  const a = fakeControl('a');
  const b = fakeControl('b', { disabled: true });
  const c = fakeControl('c', { hidden: true });
  const d = fakeControl('d', { className: 'nf-action is-disabled' });
  const e = fakeControl('e');
  const container = { querySelectorAll: () => [a, b, c, d, e] };
  assert.deepEqual(navigableControls(container).map(({ name }) => name), ['a', 'e']);
  assert.equal(moveFocusWithin(container, 'next', a).name, 'e');
  assert.equal(moveFocusWithin(container, 'next', e).name, 'a');
  assert.equal(moveFocusWithin(container, 'prev', null).name, 'e');
  assert.equal(activateWithin(container, e), e);
  assert.equal(e.clicks, 1);
  assert.equal(activateWithin(container, null), null);
  assert.equal(a.focused, true, 'nothing focused: the first control takes focus');
  const slider = { ...fakeControl('slider'), type: 'range' };
  assert.equal(activateWithin({ querySelectorAll: () => [slider] }, slider), slider);
  assert.equal(slider.clicks, 0, 'a slider has nothing to press');
});
