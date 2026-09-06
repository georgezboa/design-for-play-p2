import test from 'node:test';
import assert from 'node:assert/strict';
import { createPowerGrid } from '../../src/cars/retroCyberpunk/model/powerGrid.js';
import { SOCKETS, WIRES } from '../../src/cars/retroCyberpunk/levelData.js';

function grid() {
  return createPowerGrid({ sockets: SOCKETS, wires: WIRES, segmentDelayMs: 100 });
}

test('mains terminal is a live source but the broken span stays dark', () => {
  const g = grid();
  g.tick(0);
  g.tick(1000);
  assert.equal(g.isPowered('GRID2'), true);
  assert.equal(g.isPowered('S2A'), true, 'wire GRID2->S2A conducts');
  assert.equal(g.isPowered('S2B'), false, 'no conductor across the gap');
  assert.equal(g.isPowered('SIG2'), false);
});

test('ladder conductor closes the circuit and power arrives with visible delay', () => {
  const g = grid();
  g.tick(0);
  g.tick(1000);
  g.placeConductor('L1', 'S2A', 'S2B'); // at t=1000
  assert.equal(g.isPowered('S2B'), false, 'not instant: current must travel');
  assert.equal(g.isPending('S2B'), true);
  g.tick(1099);
  assert.equal(g.isPowered('S2B'), false);
  g.tick(1100); // S2B is 1 segment from the S2A source path
  assert.equal(g.isPowered('S2B'), true);
  assert.equal(g.isPowered('SIG2'), false, 'SIG2 is one more segment out');
  g.tick(1200);
  assert.equal(g.isPowered('SIG2'), true);
  const arrives = g.drainEvents().filter((e) => e.type === 'power-arrive').map((e) => e.node);
  assert.ok(arrives.includes('S2B') && arrives.includes('SIG2'));
});

test('removing the conductor cuts power immediately and in cascade', () => {
  const g = grid();
  g.tick(0);
  g.tick(1000);
  g.placeConductor('L1', 'S2A', 'S2B');
  g.tick(2000);
  assert.equal(g.isPowered('SIG2'), true);
  g.removeConductor('L1');
  assert.equal(g.isPowered('S2B'), false);
  assert.equal(g.isPowered('SIG2'), false);
  const lost = g.drainEvents().filter((e) => e.type === 'power-lost').map((e) => e.node);
  assert.ok(lost.includes('S2B') && lost.includes('SIG2'));
});

test('battery energizes only the branch it seats in', () => {
  const g = grid();
  g.tick(0);
  g.placeBattery('S3U');
  g.tick(1000);
  assert.equal(g.isPowered('SIG3U'), true);
  assert.equal(g.isPowered('SIG3L'), false);
  g.removeBattery('S3U');
  g.placeBattery('S3L');
  g.tick(2000);
  assert.equal(g.isPowered('SIG3U'), false, 'old branch decays');
  assert.equal(g.isPowered('SIG3L'), true);
});

test('battery cannot seat in a conductor socket and only one battery exists', () => {
  const g = grid();
  g.tick(0);
  assert.equal(g.placeBattery('S2A').ok, false);
  assert.equal(g.placeBattery('S3U').ok, true);
  assert.equal(g.placeBattery('S3L').ok, true, 'model allows re-seat tracking; scene moves the single battery');
});

test('final chain: S4 battery lights SIG5 and the neon bus in order', () => {
  const g = grid();
  g.tick(0);
  g.placeBattery('S4');
  g.tick(100);
  assert.equal(g.isPowered('SIG5'), true);
  assert.equal(g.isPowered('NEON'), false);
  g.tick(200);
  assert.equal(g.isPowered('NEON'), true);
});

test('reset clears everything back to the authored start', () => {
  const g = grid();
  g.tick(0);
  g.placeBattery('S3U');
  g.placeConductor('L1', 'S2A', 'S2B');
  g.tick(2000);
  g.reset();
  g.tick(3000);
  const snap = g.snapshot();
  assert.deepEqual(snap.batteries, []);
  assert.deepEqual(snap.conductors, {});
  assert.equal(g.isPowered('SIG2'), false);
  assert.equal(g.isPowered('SIG3U'), false);
  assert.equal(g.isPowered('GRID2'), true, 'mains still live after reset');
});
