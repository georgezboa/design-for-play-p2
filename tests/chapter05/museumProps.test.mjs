import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';

import {
  createArchiveCart,
  createGuidePedestal,
  createServiceDesk,
} from '../../src/chapters/museum3d/assets/MuseumProps.js';

function materials() {
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  return {
    walnut: material,
    walnutDark: material,
    blackPlastic: material,
    olivePlastic: material,
    oliveSteel: material,
    darkSteel: material,
    brass: material,
    paper: material,
    rubber: material,
    lampGreen: material,
  };
}

test('service desk keeps the locked four-meter civic-counter footprint', () => {
  const { group } = createServiceDesk(materials());
  const bounds = new THREE.Box3().setFromObject(group);
  const size = bounds.getSize(new THREE.Vector3());

  assert.ok(size.x >= 4 && size.x <= 4.2);
  assert.ok(size.z >= 0.8 && size.z <= 0.9);
  assert.ok(group.getObjectByName('museum-desk-telephone'));
  assert.ok(group.getObjectByName('bankers-lamp'));
  assert.ok(group.getObjectByName('visitor-register'));
});

test('guide pedestal carries one separate audio receiver', () => {
  const { group, receiver } = createGuidePedestal(materials());

  assert.equal(receiver.name, 'museum-audio-guide-receiver');
  assert.equal(group.getObjectByName('museum-audio-guide-receiver'), receiver);
});

test('automatic archive cart has four wheels and three readable file trays', () => {
  const cart = createArchiveCart(materials());
  const wheels = [];
  const trays = [];
  cart.traverse((node) => {
    if (node.userData.isWheel) wheels.push(node);
    if (node.name.startsWith('cart-file-tray-')) trays.push(node);
  });

  assert.equal(wheels.length, 4);
  assert.equal(trays.length, 3);
  assert.ok(cart.getObjectByName('cart-route-lamp'));
});
