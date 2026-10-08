// Chapter 4 // THE PAINTED COUNTRY — the display layer over the painted grid.
//
// Round 6, item 13. The scenes keep the 20 px cell grid for collision, and
// keep a stroke book (brushStrokes.js) of which cells each press of the brush
// made. This layer draws those strokes (art/strokeArt.js) into a row of world
// tiles (canvas textures), and only redraws the tiles a changed stroke
// touches, at most every FLUSH_MS while a stroke is being dragged, so a long
// drag costs one small repaint at a time.

import Phaser from 'phaser';
import { paintStrokeRun } from './art/strokeArt.js';
import { runBounds, runSignature } from './brushStrokes.js';
import { lowGraphicsOn } from './chapterUi.js';

const FLUSH_MS = 60;
let instance = 0;

export class StrokeLayer {
  constructor(scene, { book, cell, worldW, worldH, depth, color = '#46618c', tileW = 240, seed = 0x51 } = {}) {
    this.scene = scene;
    this.book = book;
    this.cell = cell;
    this.worldW = worldW;
    this.worldH = worldH;
    this.depth = depth;
    this.color = color;
    this.tileW = tileW;
    this.seed = seed;
    this.scale = lowGraphicsOn() ? 0.7 : 1;
    this.detail = lowGraphicsOn() ? 0.6 : 1;
    this.id = (instance += 1);
    this.tiles = new Map(); // index -> { key, texture, image }
    this.cache = new Map(); // signature -> rendered run
    this.dirty = new Set();
    this.seenVersion = -1;
    this.lastFlush = -Infinity;
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  tileRange(box) {
    const from = Math.max(0, Math.floor(box.x / this.tileW));
    const to = Math.min(Math.ceil(this.worldW / this.tileW) - 1, Math.floor((box.x + box.w) / this.tileW));
    const out = [];
    for (let i = from; i <= to; i += 1) out.push(i);
    return out;
  }

  // Which strokes changed since the last look, and which tiles they touch.
  collect() {
    if (this.book.version === this.seenVersion) return;
    this.seenVersion = this.book.version;
    const next = new Map();
    this.book.runs().forEach((run) => {
      const sig = runSignature(run);
      next.set(sig, this.cache.get(sig) ?? { run, box: runBounds(run, this.cell, 16), art: null });
    });
    this.cache.forEach((entry, sig) => { if (!next.has(sig)) this.tileRange(entry.box).forEach((i) => this.dirty.add(i)); });
    next.forEach((entry, sig) => { if (!this.cache.has(sig)) this.tileRange(entry.box).forEach((i) => this.dirty.add(i)); });
    this.cache = next;
  }

  /** Call every frame; `force` repaints now (a stroke just ended, a wash). */
  sync(force = false) {
    this.collect();
    if (!this.dirty.size) return false;
    const now = this.scene.time.now;
    if (!force && now - this.lastFlush < FLUSH_MS) return false;
    this.lastFlush = now;
    this.dirty.forEach((i) => this.redrawTile(i));
    this.dirty.clear();
    return true;
  }

  tile(i) {
    let tile = this.tiles.get(i);
    if (tile) return tile;
    const key = `ch4-strokes-${this.id}-${i}`;
    if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
    const w = Math.min(this.tileW, this.worldW - i * this.tileW);
    const texture = this.scene.textures.createCanvas(key, Math.ceil(w * this.scale), Math.ceil(this.worldH * this.scale));
    const image = this.scene.add.image(i * this.tileW, 0, key).setOrigin(0).setScale(1 / this.scale).setDepth(this.depth);
    tile = { key, texture, image, x: i * this.tileW, w };
    this.tiles.set(i, tile);
    return tile;
  }

  art(entry) {
    if (!entry.art) {
      const first = entry.run.keys[0] ?? 0;
      entry.art = paintStrokeRun(entry.run, {
        cell: this.cell,
        color: this.color,
        seed: (this.seed * 7919 + entry.run.stroke * 131 + first * 17) >>> 0,
        scale: this.scale,
        detail: this.detail,
      });
    }
    return entry.art;
  }

  redrawTile(i) {
    const tile = this.tile(i);
    const c = tile.texture.getContext();
    const s = this.scale;
    c.clearRect(0, 0, tile.texture.width, tile.texture.height);
    const here = [...this.cache.values()].filter((entry) => this.tileRange(entry.box).includes(i));
    // shadows under every stroke first, so no shadow falls across paint
    here.forEach((entry) => {
      const art = this.art(entry);
      c.globalAlpha = 0.7;
      c.drawImage(art.shadow, Math.round((art.x - tile.x) * s), Math.round(art.y * s));
    });
    here.forEach((entry) => {
      const art = this.art(entry);
      c.globalAlpha = 0.96;
      c.drawImage(art.body, Math.round((art.x - tile.x) * s), Math.round(art.y * s));
    });
    c.globalAlpha = 1;
    tile.texture.refresh();
  }

  destroy() {
    this.tiles.forEach((tile) => {
      tile.image?.destroy();
      if (this.scene.textures.exists(tile.key)) this.scene.textures.remove(tile.key);
    });
    this.tiles.clear();
    this.cache.clear();
  }
}
