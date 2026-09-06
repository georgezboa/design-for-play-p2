// LABYRINTH WING — replaceable texture slots. Same painter-slot pattern as
// ../assets/slots.js: everything is generated Graphics, nothing downloaded.
//
// The art language is a spare theatrical illustration read: monumental
// near-black masonry walls over restrained cool slate floors, warm isolated
// torch pools, ivory reserved for the player and the keys, cyan for safety
// and open paths, red only for active danger. Silhouette carries the read
// first; color only ever confirms it.

import { PAL, CELL } from './labyrinthData.js';

function key(id) {
  return `lab:${id}`;
}

function grain(g, w, h, n, alpha, color) {
  let seed = 7919;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  g.fillStyle(color, alpha);
  for (let i = 0; i < n; i += 1) {
    g.fillRect(Math.floor(rnd() * w), Math.floor(rnd() * h), 1, 1);
  }
}

function grainAt(g, ox, oy, w, h, n, alpha, color) {
  let seed = 7919;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  g.fillStyle(color, alpha);
  for (let i = 0; i < n; i += 1) {
    g.fillRect(ox + Math.floor(rnd() * w), oy + Math.floor(rnd() * h), 1, 1);
  }
}

// One cool slate floor slab. Kept deliberately quiet — the tile repeats on
// every walkable cell, so anything busier would read as debug tiling.
function paintFloor(g, ox, oy) {
  g.fillStyle(PAL.floor, 1);
  g.fillRect(ox, oy, CELL, CELL);
  // Large-slab read: one inset plane and two asymmetric seams.
  g.fillStyle(PAL.floorLight, 0.32);
  g.fillRect(ox + 4, oy + 4, CELL - 8, CELL - 8);
  g.lineStyle(1, PAL.floorSeam, 0.9);
  g.strokeRect(ox + 0.5, oy + 0.5, CELL - 1, CELL - 1);
  g.lineStyle(1, PAL.floorSeam, 0.45);
  g.lineBetween(ox, oy + CELL * 0.62, ox + CELL, oy + CELL * 0.62);
  g.lineBetween(ox + CELL * 0.38, oy, ox + CELL * 0.38, oy + CELL * 0.62);
  // Corners sit a touch darker so the grid reads as laid stone, not mesh.
  g.fillStyle(PAL.floorSeam, 0.5);
  g.fillRect(ox, oy, 3, 3);
  g.fillRect(ox + CELL - 3, oy, 3, 3);
  g.fillRect(ox, oy + CELL - 3, 3, 3);
  g.fillRect(ox + CELL - 3, oy + CELL - 3, 3, 3);
  grainAt(g, ox, oy, CELL, CELL, 26, 0.05, PAL.slate);
}

// One monumental masonry block. Deeper black than the floor so wall mass
// reads first; two courses with offset joints and a faint cold rim along the
// top edge give it weight without any directional lie.
function paintWall(g, ox, oy) {
  g.fillStyle(PAL.stone, 1);
  g.fillRect(ox, oy, CELL, CELL);
  g.fillStyle(PAL.stoneLight, 0.55);
  g.fillRect(ox + 3, oy + 3, CELL - 6, CELL - 6);
  // Masonry courses.
  g.lineStyle(2, PAL.stoneLine, 1);
  g.strokeRect(ox + 1, oy + 1, CELL - 2, CELL - 2);
  g.lineStyle(1, PAL.stoneLine, 0.7);
  g.lineBetween(ox, oy + CELL * 0.45, ox + CELL, oy + CELL * 0.45);
  g.lineBetween(ox + CELL * 0.55, oy, ox + CELL * 0.55, oy + CELL * 0.45);
  g.lineBetween(ox + CELL * 0.3, oy + CELL * 0.45, ox + CELL * 0.3, oy + CELL);
  // Cold rim light along the top — the only "lit" edge a wall gets.
  g.fillStyle(PAL.slate, 0.5);
  g.fillRect(ox + 2, oy + 2, CELL - 4, 4);
  // A heavy lower/right falloff makes the tile read as raised wall mass
  // instead of another dark floor pattern.
  g.fillStyle(PAL.void, 0.72);
  g.fillRect(ox + 4, oy + CELL - 8, CELL - 4, 8);
  g.fillRect(ox + CELL - 7, oy + 6, 7, CELL - 6);
  grainAt(g, ox, oy, CELL, CELL, 44, 0.07, PAL.stoneLine);
}

function paintButch(g, dir = 's') {
  const west = dir.includes('w');
  const east = dir.includes('e');
  const north = dir.includes('n');
  const side = west || east;
  const sx = west ? -1 : 1;

  // Chibi Butch: the Museum paper-doll's hat, long coat and brass ticket pin,
  // rebuilt with a large readable head and short body for the top-down maze.
  g.fillStyle(0x171a21, 1);
  g.fillRect(6, 2, 22, 4); // hat brim
  g.fillRect(11, 0, 12, 4); // crown
  g.fillStyle(PAL.ivory, 1);
  g.fillRoundedRect(9, 5, 16, 15, 5); // large chibi head
  g.fillStyle(0x252a34, 1);
  if (north) g.fillRect(9, 5, 16, 6); // back of hat/hair
  else g.fillRect(9, 5, 16, 4);

  // Face direction is visible before movement: nose/eye shift to the side;
  // diagonals retain both a side cue and the north/south coat opening.
  if (!north) {
    g.fillStyle(0x1a1c22, 1);
    if (side) {
      const eyeX = east ? 21 : 12;
      g.fillRect(eyeX, 11, 2, 2);
      g.fillRect(east ? 24 : 8, 13, 2, 2);
    } else {
      g.fillRect(13, 11, 2, 2);
      g.fillRect(20, 11, 2, 2);
    }
  }

  g.fillStyle(0x3d4350, 1);
  g.fillRoundedRect(7, 19, 20, 18, 4); // coat
  g.fillTriangle(7, 31, 27, 31, 30, 41);
  g.fillTriangle(7, 31, 30, 41, 4, 41);
  g.fillStyle(0x20242c, 1);
  g.fillRect(9, 39, 6, 3);
  g.fillRect(20, 39, 6, 3);
  g.lineStyle(1, PAL.graphiteSoft, 0.9);
  g.lineBetween(west ? 26 : 8, 21, west ? 28 : 6, 36);
  g.fillStyle(PAL.brass, 1);
  g.fillCircle(17 + (side ? sx * 4 : 4), 25, 2.2); // ticket-pocket pin
  g.fillStyle(PAL.torchCore, 1);
  g.fillCircle(17 + sx * 10, 31, 2.5); // carried flame point
}

export const TEXTURE_SLOTS = [
  {
    id: 'floor',
    w: CELL,
    h: CELL,
    paint(g) {
      paintFloor(g, 0, 0);
    },
  },
  {
    id: 'wall',
    w: CELL,
    h: CELL,
    paint(g) {
      paintWall(g, 0, 0);
    },
  },
  {
    id: 'gate-locked',
    w: CELL,
    h: CELL,
    paint(g, w, h) {
      // Sealed connector: the doorway's stone jambs stay, an iron portcullis
      // fills the passage, and a small red seal carries the only danger read.
      paintFloor(g, 0, 0);
      g.fillStyle(PAL.stone, 1);
      g.fillRect(0, 0, 10, h);
      g.fillRect(w - 10, 0, 10, h);
      g.fillRect(0, 0, w, 8);
      g.fillStyle(PAL.slate, 0.4);
      g.fillRect(10, 8, 2, h - 8);
      g.fillRect(w - 12, 8, 2, h - 8);
      g.lineStyle(3, PAL.graphite, 1);
      for (let x = 16; x < w - 12; x += 11) g.lineBetween(x, 8, x, h - 4);
      g.lineStyle(2, PAL.graphite, 0.9);
      g.lineBetween(12, h * 0.36, w - 12, h * 0.36);
      g.lineBetween(12, h * 0.68, w - 12, h * 0.68);
      // Red seal — small, centered, unmistakable.
      g.fillStyle(PAL.bloodRed, 0.95);
      g.fillPoints([
        { x: w / 2, y: h / 2 - 9 },
        { x: w / 2 + 7, y: h / 2 },
        { x: w / 2, y: h / 2 + 9 },
        { x: w / 2 - 7, y: h / 2 },
      ], true);
      g.lineStyle(1, PAL.red, 0.6);
      g.strokeCircle(w / 2, h / 2, 11);
    },
  },
  {
    id: 'gate-open',
    w: CELL,
    h: CELL,
    paint(g, w, h) {
      // Open connector: jambs and raised lintel remain, the passage is floor,
      // and a thin cyan threshold line says "this way is safe now".
      paintFloor(g, 0, 0);
      g.fillStyle(PAL.stone, 1);
      g.fillRect(0, 0, 10, h);
      g.fillRect(w - 10, 0, 10, h);
      g.fillRect(0, 0, w, 8);
      g.fillStyle(PAL.slate, 0.4);
      g.fillRect(10, 8, 2, h - 8);
      g.fillRect(w - 12, 8, 2, h - 8);
      g.fillStyle(PAL.cyan, 0.1);
      g.fillRect(12, 10, w - 24, h - 14);
      g.fillStyle(PAL.cyan, 0.85);
      g.fillRect(12, h - 8, w - 24, 2);
      g.fillRect(12, 10, w - 24, 1);
    },
  },
  {
    id: 'torch',
    w: 20,
    h: 28,
    paint(g) {
      // Wall sconce: brass bracket and cup, a still flame. The moving warm
      // pool of light is the separate ADD-blended 'torch-glow' sprite, so the
      // object itself stays a crisp silhouette.
      g.fillStyle(PAL.brass, 1);
      g.fillRect(8, 14, 4, 12);
      g.fillRect(4, 24, 12, 3);
      g.fillRect(5, 12, 10, 3);
      g.fillStyle(PAL.torch, 0.95);
      g.fillTriangle(4, 13, 10, 1, 16, 13);
      g.fillStyle(PAL.torchCore, 1);
      g.fillTriangle(7, 12, 10, 4, 13, 12);
    },
  },
  {
    id: 'torch-glow',
    w: 96,
    h: 96,
    paint(g, w, h) {
      // Soft warm halo stamped ADD over the sconce; the scene breathes its
      // scale/alpha for flicker. Drawn as stepped alpha rings — Graphics has
      // no gradients, and at this softness the steps are invisible.
      const cx = w / 2;
      const cy = h / 2;
      const rings = [
        [46, 0.05], [38, 0.07], [30, 0.09], [22, 0.12], [14, 0.16], [8, 0.2],
      ];
      for (const [r, a] of rings) {
        g.fillStyle(PAL.torch, a);
        g.fillCircle(cx, cy, r);
      }
      g.fillStyle(PAL.torchCore, 0.22);
      g.fillCircle(cx, cy, 5);
    },
  },
  {
    id: 'key',
    w: 26,
    h: 16,
    paint(g) {
      // Ivory cabinet key — bright, small, and nothing like a torch: cool
      // pale metal, a ring bow and two teeth, no warm pool of light around it
      // (the glint is a separate sharp star, not a glow).
      g.lineStyle(3, PAL.ivory, 1);
      g.strokeCircle(7, 8, 5);
      g.fillStyle(PAL.ivory, 1);
      g.fillRect(11, 6.5, 13, 3);
      g.fillRect(19, 9, 2.6, 4.5);
      g.fillRect(23, 9, 2.6, 3.4);
      g.fillStyle(PAL.brass, 0.9);
      g.fillRect(12, 6.5, 4, 1.2);
      g.fillStyle(PAL.void, 1);
      g.fillCircle(7, 8, 2.2);
    },
  },
  {
    id: 'key-glint',
    w: 14,
    h: 14,
    paint(g) {
      // Sharp four-point star, ADD-blended over the key and pulsed by the
      // scene — a glint, not a light source.
      g.fillStyle(PAL.ivory, 0.9);
      g.fillTriangle(7, 0, 8.6, 5.4, 14, 7);
      g.fillTriangle(7, 0, 5.4, 5.4, 0, 7);
      g.fillTriangle(7, 14, 8.6, 8.6, 14, 7);
      g.fillTriangle(7, 14, 5.4, 8.6, 0, 7);
    },
  },
  {
    id: 'statue',
    w: 30,
    h: 52,
    paint(g) {
      // Robed figure on a plinth: broad shoulders, bowed head, hem pooling
      // onto a base wider than the feet. Cold grey stone clearly lighter
      // than the floor so the silhouette reads at fog's edge; a single
      // bright rim down one side; the eyes are separate sprites so the
      // scene can light them per pursuit state.
      g.fillStyle(PAL.statue, 1);
      g.fillRect(1, 44, 28, 8); // plinth
      g.fillTriangle(4, 44, 8, 16, 13, 44); // robe, left fall
      g.fillTriangle(26, 44, 22, 16, 13, 44); // robe, right fall
      g.fillRect(6, 14, 18, 12); // shoulders
      g.fillRect(9, 3, 12, 12); // bowed head
      g.fillStyle(PAL.statueEdge, 1);
      g.fillRect(9, 12, 12, 3); // hood shadow under the brow
      g.lineStyle(1, PAL.statueEdge, 0.9);
      g.strokeRect(1.5, 44.5, 27, 7);
      g.lineStyle(1, PAL.statueEdge, 0.6);
      g.lineBetween(11, 26, 10, 43); // robe folds
      g.lineBetween(17, 26, 18, 43);
      // Cold rim light, left side only — the read that separates the figure
      // from the dark behind it.
      g.lineStyle(1, PAL.graphiteSoft, 0.85);
      g.lineBetween(9.5, 4, 9.5, 14);
      g.lineBetween(6.5, 15, 6.5, 25);
      g.lineBetween(4.5, 26, 2.5, 43);
      g.lineStyle(1, PAL.graphiteSoft, 0.4);
      g.lineBetween(20.5, 4, 20.5, 14);
      grain(g, 30, 52, 34, 0.08, PAL.statueEdge);
    },
  },
  {
    id: 'eye-idle',
    w: 12,
    h: 6,
    paint(g) {
      // Asleep at its post: two barely-there slits.
      g.fillStyle(PAL.eye, 0.3);
      g.fillRect(1, 2, 4, 2);
      g.fillRect(7, 2, 4, 2);
    },
  },
  {
    id: 'eye-frozen',
    w: 12,
    h: 6,
    paint(g) {
      // Caught in the player's gaze: two dim embers, open but held.
      g.fillStyle(PAL.eyeFrozen, 0.85);
      g.fillRect(1, 1, 4, 4);
      g.fillRect(7, 1, 4, 4);
      g.fillStyle(PAL.torchCore, 0.5);
      g.fillRect(2, 2, 2, 2);
      g.fillRect(8, 2, 2, 2);
    },
  },
  {
    id: 'eye-hunt',
    w: 12,
    h: 6,
    paint(g) {
      // Hunting: two hot red points with a small halo baked in. The scene
      // draws this one ADD-blended so it flares against the dark.
      g.fillStyle(PAL.eyeHunt, 0.35);
      g.fillRect(0, 0, 5, 6);
      g.fillRect(7, 0, 5, 6);
      g.fillStyle(PAL.eyeHunt, 1);
      g.fillRect(1, 2, 4, 3);
      g.fillRect(8, 2, 4, 3);
    },
  },
  {
    id: 'shield',
    w: 24,
    h: 26,
    paint(g) {
      // Heraldic kite shield in the chapter's living cyan — collectible read
      // first (bright silhouette, pale boss), carried/active states are the
      // HUD count and the scene's aura ring.
      g.fillStyle(PAL.cyan, 1);
      g.fillTriangle(1, 2, 23, 2, 12, 25);
      g.fillRect(1, 2, 22, 11);
      g.fillStyle(PAL.void, 0.92);
      g.fillTriangle(5, 6, 19, 6, 12, 19);
      g.fillRect(5, 6, 14, 6);
      g.lineStyle(1, PAL.ivory, 0.85);
      g.strokeTriangle(1, 2, 23, 2, 12, 25);
      g.fillStyle(PAL.ivory, 0.95);
      g.fillCircle(12, 8, 2.4);
    },
  },
  {
    id: 'shield-ring',
    w: 96,
    h: 96,
    paint(g, w, h) {
      // Active-shield aura stamp — a soft cyan ring, drawn once and reused
      // every frame around the player while a shield is up.
      const r = w / 2;
      g.fillStyle(PAL.cyan, 0.05);
      g.fillCircle(r, r, r - 4);
      g.lineStyle(3, PAL.cyan, 0.8);
      g.strokeCircle(r, r, r - 5);
      g.lineStyle(1, PAL.cyan, 0.32);
      g.strokeCircle(r, r, r - 11);
    },
  },
  {
    id: 'pip',
    w: 16,
    h: 16,
    paint(g) {
      // Plain tintable dot for the minimap key-progress row — separate from
      // the detailed 'key' sprite so a tint reads cleanly at 16px.
      g.fillStyle(0xffffff, 1);
      g.fillCircle(8, 8, 6);
      g.lineStyle(1, PAL.void, 0.5);
      g.strokeCircle(8, 8, 6);
    },
  },
  ...['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'].map((dir) => ({
    id: `butch-${dir}`,
    w: 34,
    h: 42,
    paint(g) { paintButch(g, dir); },
  })),
  {
    id: 'wanderer',
    w: 34,
    h: 42,
    paint(g) {
      paintButch(g, 's');
    },
  },
  {
    id: 'stair',
    w: 52,
    h: 52,
    paint(g) {
      g.fillStyle(PAL.void, 0.78);
      g.fillCircle(26, 26, 24);
      g.lineStyle(2, PAL.ivory, 0.7);
      g.strokeCircle(26, 26, 22);
      g.lineStyle(3, PAL.brass, 0.9);
      for (let i = 0; i < 5; i += 1) g.lineBetween(12 + i * 4, 36 - i * 5, 38 - i * 2, 36 - i * 5);
      g.fillStyle(PAL.cyan, 0.8);
      g.fillTriangle(26, 7, 21, 14, 31, 14);
      g.fillTriangle(26, 45, 21, 38, 31, 38);
    },
  },
  {
    id: 'fragment-clue',
    w: 42,
    h: 30,
    paint(g) {
      g.lineStyle(3, PAL.stoneLight, 0.95);
      g.beginPath();
      g.arc(21, 15, 12, Math.PI * 0.16, Math.PI * 1.5);
      g.strokePath();
      g.fillStyle(PAL.void, 1);
      g.fillCircle(21, 15, 6);
      g.lineStyle(2, PAL.torch, 0.8);
      g.lineBetween(19, 21, 16, 28);
    },
  },
  {
    id: 'fragment-seal',
    w: CELL,
    h: CELL,
    paint(g, w, h) {
      paintFloor(g, 0, 0);
      g.fillStyle(PAL.stone, 0.95);
      g.fillCircle(w / 2, h / 2, 25);
      g.lineStyle(4, PAL.stoneLight, 1);
      g.beginPath();
      g.arc(w / 2, h / 2, 18, Math.PI * 0.15, Math.PI * 1.48);
      g.strokePath();
      g.fillStyle(PAL.void, 1);
      g.fillCircle(w / 2, h / 2, 10);
      g.lineStyle(2, PAL.bloodRed, 0.8);
      g.strokeCircle(w / 2, h / 2, 28);
    },
  },
  {
    id: 'fragment-seal-ready',
    w: CELL,
    h: CELL,
    paint(g, w, h) {
      paintFloor(g, 0, 0);
      g.fillStyle(PAL.stone, 0.95);
      g.fillCircle(w / 2, h / 2, 25);
      g.lineStyle(4, PAL.ivory, 1);
      g.beginPath();
      g.arc(w / 2, h / 2, 18, Math.PI * 0.15, Math.PI * 1.48);
      g.strokePath();
      g.fillStyle(PAL.void, 1);
      g.fillCircle(w / 2, h / 2, 10);
      g.lineStyle(2, PAL.cyan, 0.85);
      g.strokeCircle(w / 2, h / 2, 28);
      g.lineStyle(1, PAL.torch, 0.7);
      g.lineBetween(w / 2 - 2, h / 2 + 10, w / 2 - 8, h / 2 + 26);
    },
  },
  {
    id: 'fragment',
    w: 128,
    h: 128,
    paint(g) {
      // THE LOOKING FRAGMENT — the Door 1 return artifact, drawn for the
      // end-room epilogue: a broken dark stone face shard. The eye socket is
      // incomplete — a broken rim arc around a dark pit — with chipped facet
      // planes and warm residue caught in the cracks.
      const cx = 64;
      const cy = 64;
      g.fillStyle(PAL.stone, 1);
      g.fillPoints([
        { x: cx - 46, y: cy + 40 },
        { x: cx - 34, y: cy - 42 },
        { x: cx + 4, y: cy - 52 },
        { x: cx + 44, y: cy - 20 },
        { x: cx + 38, y: cy + 32 },
        { x: cx - 6, y: cy + 50 },
      ], true);
      // Chipped facet planes — one cold, one catching a little more light.
      g.fillStyle(PAL.slate, 0.5);
      g.fillPoints([
        { x: cx - 34, y: cy - 42 },
        { x: cx + 4, y: cy - 52 },
        { x: cx - 2, y: cy - 10 },
      ], true);
      g.fillStyle(PAL.stoneLight, 0.7);
      g.fillPoints([
        { x: cx + 44, y: cy - 20 },
        { x: cx + 38, y: cy + 32 },
        { x: cx + 10, y: cy + 6 },
      ], true);
      g.lineStyle(2, PAL.stoneLine, 0.9);
      g.strokePoints([
        { x: cx - 46, y: cy + 40 },
        { x: cx - 34, y: cy - 42 },
        { x: cx + 4, y: cy - 52 },
        { x: cx + 44, y: cy - 20 },
        { x: cx + 38, y: cy + 32 },
        { x: cx - 6, y: cy + 50 },
      ], true);
      // The incomplete eye socket: dark pit, broken rim arc.
      g.fillStyle(PAL.void, 1);
      g.fillCircle(cx + 4, cy - 8, 15);
      g.lineStyle(5, PAL.stoneLight, 0.95);
      g.beginPath();
      g.arc(cx + 4, cy - 8, 16, Math.PI * 0.15, Math.PI * 1.45);
      g.strokePath();
      g.lineStyle(2, PAL.ivory, 0.5);
      g.beginPath();
      g.arc(cx + 4, cy - 8, 16, Math.PI * 0.2, Math.PI * 0.6);
      g.strokePath();
      // Warm residue in the cracks running down from the socket.
      g.lineStyle(2, PAL.torch, 0.75);
      g.lineBetween(cx + 1, cy + 6, cx - 4, cy + 26);
      g.lineBetween(cx - 4, cy + 26, cx - 10, cy + 40);
      g.lineStyle(1, PAL.torchCore, 0.55);
      g.lineBetween(cx + 9, cy + 5, cx + 14, cy + 22);
      // Hairline chips.
      g.lineStyle(1, PAL.stoneLine, 0.8);
      g.lineBetween(cx - 20, cy - 20, cx - 30, cy + 4);
      g.lineBetween(cx + 22, cy - 26, cx + 30, cy - 6);
    },
  },
  {
    id: 'fragment-glow',
    w: 160,
    h: 160,
    paint(g, w, h) {
      // The faint warm residue-light the fragment gives off in the epilogue.
      const cx = w / 2;
      const cy = h / 2;
      const rings = [
        [76, 0.04], [60, 0.05], [44, 0.07], [30, 0.09], [18, 0.1],
      ];
      for (const [r, a] of rings) {
        g.fillStyle(PAL.torch, a);
        g.fillCircle(cx, cy, r);
      }
    },
  },
];

export function textureKey(id) {
  return key(id);
}

export function ensureLabyrinthTextures(scene) {
  for (const slot of TEXTURE_SLOTS) {
    const k = key(slot.id);
    if (scene.textures.exists(k)) continue;
    const g = scene.add.graphics();
    g.clear();
    slot.paint(g, slot.w, slot.h);
    g.generateTexture(k, slot.w, slot.h);
    g.destroy();
  }
}

// Two-tile spritesheet (floor=index 0, wall=index 1), side by side, sized
// for Phaser's Tilemap system: `tilemap.addTilesetImage(key, ..., CELL,
// CELL)` slices any image of the right dimensions into CELL x CELL frames
// automatically, so one wide texture is all a programmatic (non-Tiled)
// tileset needs. Same paint as the standalone 'floor'/'wall' slots above,
// just drawn at an x-offset instead of each owning its own texture.
export function ensureTilesetTexture(scene) {
  const k = key('tileset');
  if (scene.textures.exists(k)) return k;
  const g = scene.add.graphics();
  paintFloor(g, 0, 0);
  paintWall(g, CELL, 0);
  g.generateTexture(k, CELL * 2, CELL);
  g.destroy();
  return k;
}

export const TILE_FLOOR = 0;
export const TILE_WALL = 1;

// Soft radial-gradient canvas texture, baked at the exact diameter it'll be
// used at (one per distinct radius, cached by key) — used to punch glowing
// holes in the fog-of-war overlay via RenderTexture.erase(key, x, y). Baking
// per-radius instead of scaling one big texture at runtime keeps the erase
// call a plain texture-key draw, which is the reliable form of that API.
export function ensureRadialMask(scene, radius) {
  const k = key(`glow-${radius}`);
  if (scene.textures.exists(k)) return k;
  const d = radius * 2;
  const tex = scene.textures.createCanvas(k, d, d);
  const ctx = tex.getContext();
  const grad = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.85)');
  grad.addColorStop(0.85, 'rgba(255,255,255,0.25)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, d, d);
  tex.refresh();
  return k;
}
