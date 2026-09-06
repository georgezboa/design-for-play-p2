import test from 'node:test';
import assert from 'node:assert/strict';
import { getNightRoundMarkerState, worldToMinimap } from '../../src/chapters/museum3d/systems/EchoCityMinimap.js';

test('Echo City bounds map into the minimap without reversing east and west', () => {
  const west = worldToMinimap(-52, 0, { width: 190, height: 158, padding: 10 });
  const east = worldToMinimap(52, 0, { width: 190, height: 158, padding: 10 });
  const north = worldToMinimap(0, -34, { width: 190, height: 158, padding: 10 });
  const south = worldToMinimap(0, 52, { width: 190, height: 158, padding: 10 });
  assert.ok(west.x < east.x);
  assert.ok(north.y < south.y);
  for (const p of [west, east, north, south]) {
    assert.ok(p.x >= 10 && p.x <= 180);
    assert.ok(p.y >= 10 && p.y <= 148);
  }
});

test('before taking the kit, only the kit asks for attention', () => {
  const markers = getNightRoundMarkerState({});
  assert.equal(markers.find((m) => m.id === 'kit').state, 'pending');
  assert.ok(markers.filter((m) => m.id !== 'kit').every((m) => m.state === 'muted'));
});

test('after taking the kit, the dark city prioritizes station power without drawing a route', () => {
  const markers = getNightRoundMarkerState({
    nightKitTaken: true,
  });
  assert.equal(markers.find((m) => m.id === 'market').state, 'muted');
  assert.equal(markers.find((m) => m.id === 'fountain').state, 'muted');
  assert.equal(markers.find((m) => m.id === 'archive').state, 'muted');
  assert.equal(markers.find((m) => m.id === 'station').state, 'urgent');
});

test('after night power returns, only the market becomes current', () => {
  const markers = getNightRoundMarkerState({ nightKitTaken: true, stationLampOn: true });
  assert.equal(markers.find((m) => m.id === 'station').state, 'complete');
  assert.equal(markers.find((m) => m.id === 'market').state, 'pending');
  assert.ok(markers.filter((m) => ['fountain', 'archive'].includes(m.id)).every((m) => m.state === 'muted'));
});

test('the archive marker remains current until the badge is taken', () => {
  const record = {
    nightKitTaken: true,
    stationLampOn: true,
    marketShuttersLocked: true,
    fountainCirculationRestored: true,
    archiveLedgerReturned: true,
    nightBadgeClaimed: false,
  };
  assert.equal(getNightRoundMarkerState(record).find((m) => m.id === 'archive').state, 'pending');
  assert.equal(getNightRoundMarkerState({ ...record, nightBadgeClaimed: true }).find((m) => m.id === 'archive').state, 'complete');
});
