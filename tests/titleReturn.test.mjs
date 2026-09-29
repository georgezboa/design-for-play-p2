import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TITLE_RETURN_MESSAGE, installAudioRegistry, leaveForTitle, resetTitleReturnForTests } from '../src/shell/titleReturn.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

function fakeWindow() {
  const appended = [];
  const listeners = {};
  const timers = [];
  const element = () => {
    const el = {
      className: '', style: {}, innerHTML: '', attrs: {},
      setAttribute(k, v) { el.attrs[k] = v; },
      addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
    };
    return el;
  };
  const media = { muted: false, paused: false, pause() { media.paused = true; } };
  const doc = {
    body: { append: (el) => appended.push(el) },
    createElement: element,
    querySelector: (selector) => appended.find((el) => selector === `.${el.className}`) ?? null,
    querySelectorAll: () => [media],
  };
  const win = {
    document: doc,
    location: { assign: () => {} },
    setTimeout: (fn, ms) => { timers.push([ms, fn]); return timers.length; },
    requestAnimationFrame: (fn) => fn(0),
    game: { sound: { pauseAll() { win.soundPaused = true; } } },
  };
  win.top = win;
  return { win, appended, timers, listeners, media };
}

test('RETURN TO TITLE fades to black at once, silences the page and stops its frames before leaving', () => {
  resetTitleReturnForTests();
  const { win, appended, timers, media } = fakeWindow();
  let navigated = 0;
  const started = leaveForTitle({ win, navigate: () => { navigated += 1; } });
  assert.equal(started, true);
  // The curtain is in the page synchronously, with its message.
  assert.equal(appended.length, 1);
  assert.equal(appended[0].className, 'nf-title-return');
  assert.match(appended[0].innerHTML, new RegExp(TITLE_RETURN_MESSAGE));
  assert.match(appended[0].style.cssText, /position:fixed;inset:0/);
  assert.equal(win.NIGHTFALL_LEAVING, true, 'the frame pacer runs no more frames');
  assert.equal(media.paused && media.muted, true);
  assert.equal(win.soundPaused, true);
  assert.equal(navigated, 0, 'the navigation waits for the fade');
  // After the fade (timer) and two presented frames, it navigates exactly once.
  timers.sort((a, b) => a[0] - b[0]).forEach(([, fn]) => fn());
  assert.equal(navigated, 1);
  assert.equal(leaveForTitle({ win, navigate: () => { navigated += 1; } }), false, 'a second click does nothing');
});

test('the audio registry remembers every context that made a sound and every element that played', () => {
  const connects = [];
  class Node { constructor(context) { this.context = context; } connect(...args) { connects.push(args); return args[0]; } }
  class Media { play() { return 'played'; } }
  const win = { AudioNode: Node, HTMLMediaElement: Media };
  installAudioRegistry(win);
  installAudioRegistry(win);
  const node = new Node({ id: 1 });
  assert.equal(node.connect('dest'), 'dest');
  assert.equal(new Media().play(), 'played');
  assert.equal(connects.length, 1, 'patched once');
});

test('the curtain uses the uiKit look', () => {
  const css = read('src/shell/uiKit.css');
  assert.match(css, /\.nf-title-return \{/);
  assert.match(css, /\.nf-title-return__text \{[^}]*var\(--nf-mono\)[^}]*var\(--nf-amber\)/);
  assert.equal(TITLE_RETURN_MESSAGE, 'RETURNING TO THE TERMINAL…');
});
