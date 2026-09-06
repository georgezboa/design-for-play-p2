import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { OPENING_POSITIONS } from '../../src/cars/presentCity3d/chapter3OpeningContent.js';
import { OBSTACLES } from '../../src/cars/presentCity3d/city3dConfig.js';
import {
  HOTEL_LOBBY_FURNITURE_OBSTACLES,
  hotelFurnitureAt,
} from '../../src/cars/presentCity3d/chapter3HotelNavigation.js';

function insideBox([x, , z], box, defaultPadding = 0.52) {
  const padding = box.padding ?? defaultPadding;
  return Math.abs(x - box.center[0]) < box.size[0] * 0.5 + padding
    && Math.abs(z - box.center[1]) < box.size[1] * 0.5 + padding;
}

describe('Chapter 3 final integration collision contracts', () => {
  it('places Butch beside Toma on walkable pavement instead of inside the ministry', () => {
    const { toma, transportApproach, levTransportExterior } = OPENING_POSITIONS;
    const ministry = OBSTACLES.find((box) => box.sourceId === 'transit-ministry');
    assert.ok(ministry, 'the Transport Ministry has a world collision footprint');
    assert.equal(insideBox(transportApproach, ministry), false, 'Toma approach stays outside the ministry footprint');
    assert.equal(insideBox(levTransportExterior, ministry), false, 'Lev stays outside the ministry footprint');
    assert.ok(Math.hypot(toma[0] - transportApproach[0], toma[2] - transportApproach[2]) <= 1.6,
      'Butch stops beside Toma');
    assert.ok(Math.hypot(levTransportExterior[0] - transportApproach[0], levTransportExterior[2] - transportApproach[2]) <= 1.6,
      'Lev joins Butch beside Toma');
  });

  it('blocks the hotel reception counter, dining table and staircase by name', () => {
    assert.equal(hotelFurnitureAt({ x: 0, z: -2.0 }), 'reception-counter');
    assert.equal(hotelFurnitureAt({ x: -1.4, z: 0.7 }), 'dining-table');
    assert.equal(hotelFurnitureAt({ x: 0.2, z: 2.2 }), 'staircase');
    assert.equal(hotelFurnitureAt({ x: 2.7, z: 0 }), null, 'the east walking lane remains open');
    assert.deepEqual(
      HOTEL_LOBBY_FURNITURE_OBSTACLES.map((box) => box.id),
      ['reception-counter', 'dining-table', 'window-cabinet', 'staircase'],
    );
  });
});
