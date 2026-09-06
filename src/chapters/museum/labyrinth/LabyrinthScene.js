// LABYRINTH WING — Chapter 5 detour, Super Dark Deception-inspired.
//
// A sprawling procedural stone maze behind the museum, built from several
// connected wings (mazeGenerator.js) — the same "advance through one
// section at a time" idea as the base game's train cars, just without a
// hard scene reload: it's one continuous, freely-walked labyrinth, but you
// can't wander into the next wing until you've cleared every key in the
// one you're in. Statues line the halls and hold perfectly still while you
// look straight at them (in your forward cone, in range, unobstructed) —
// look away and they close the distance. Three lives. Get caught three
// times and the archive returns you to the current wing's entrance, keeping
// every key and route you already earned.
//
// Built on Phaser's own systems rather than hand-rolled equivalents: the
// maze is a real Phaser.Tilemaps.Tilemap, the player/statues are Arcade
// Physics bodies (collision against the wall layer is `physics.add.collider`,
// pickups are `physics.add.overlap`), and the chase theme runs through
// `this.sound`'s own AudioContext. The one thing kept as plain data/math is
// the maze GENERATION algorithm and the statue's line-of-sight raycast —
// there's no Phaser-native equivalent for either; they're level design and
// AI logic, not engine plumbing.
//
// Art direction: spare theatrical illustration. Monumental near-black
// masonry, cool slate floors, warm isolated torch pools, ivory for the
// player and the keys, cyan for safety and open paths, red only for active
// danger. All static world dressing (wing washes, threshold inlays, room
// motifs) is baked ONCE into render textures at run start — never redrawn
// per frame — and never lies about the maze: collision stays exactly what
// the tilemap says it is.

import Phaser from 'phaser';
import { VIEW, PAL, CELL, WORLD_W, WORLD_H, GRID_W, GRID_H, LOCAL_W, LOCAL_H, TUNING, STRINGS, WING_WASH } from './labyrinthData.js';
import { ensureLabyrinthTextures, ensureRadialMask, ensureTilesetTexture, TILE_FLOOR, TILE_WALL, textureKey } from './labyrinthAssets.js';
import { buildLayout, worldToCell } from './mazeGenerator.js';
import { cloneWalls, playerCanReachTargets, stateWouldCrush } from './wingMechanics.js';
import { StatueNPC } from './StatueNPC.js';
import { applyWingEntryRules, choosePrimaryHunterId, statueCanDamage } from './labyrinthEncounterRules.js';
import { sfx } from '../../../sfx.js';
import { labyrinthCues } from './labyrinthCues.js';
import * as chaseMusic from './chaseMusic.js';

const FONT = 'Courier New, monospace';

function css(hex) {
  return `#${hex.toString(16).padStart(6, '0')}`;
}

function facingTexture(facing) {
  const angle = Math.atan2(facing.y, facing.x);
  const dirs = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'];
  const index = (Math.round(((angle + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) + 8) % 8;
  return textureKey(`butch-${dirs[index]}`);
}

export class LabyrinthScene extends Phaser.Scene {
  constructor() {
    super('MuseumLabyrinth');
  }

  create() {
    ensureLabyrinthTextures(this);
    ensureTilesetTexture(this);
    chaseMusic.init(this.sound);
    this.cameras.main.setBackgroundColor(css(PAL.void));
    this.startRun();

    this.keys = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      e: Phaser.Input.Keyboard.KeyCodes.E,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
    });
    this.input.keyboard.on('keydown-R', () => {
      if (this.state === 'over') this.restartCurrentWing();
      else this.startRun();
    });
    this.input.keyboard.on('keydown-SPACE', (event) => {
      if (!event.repeat) this.tryActivateShield();
    });
    this.input.keyboard.on('keydown-E', () => this.tryInteract());
    this.input.keyboard.on('keydown-ENTER', () => this.tryInteract());
  }

  // Space — consumes one carried shield charge (found as a collectible around
  // the maze) to go untouchable by statues for TUNING.shieldDurationMs.
  // Exactly the tool for closing on a key or an exit gate with a hunter
  // nearby without eating a hit for it.
  tryActivateShield() {
    if (this.state !== 'playing') return;
    const p = this.player;
    if (this.time.now < p.shieldActiveUntil) {
      this.setCaption(STRINGS.shieldActiveNote, 1400);
      return;
    }
    if (p.shieldCharges <= 0) {
      this.setCaption(STRINGS.shieldEmptyNote, 1600);
      sfx.blocked();
      return;
    }
    p.shieldCharges -= 1;
    p.shieldActiveUntil = this.time.now + TUNING.shieldDurationMs;
    p.shieldTutorialPending = false;
    p.shieldTutorialPrompt = false;
    labyrinthCues.shieldUp();
    this.cameras.main.flash(200, 47, 216, 200);
    this.setCaption(STRINGS.shieldUpNote, TUNING.shieldDurationMs);
  }

  // -------------------------------------------------------------- run life

  startRun() {
    chaseMusic.setChasing(false);
    this.tweens.killAll();
    if (this.map) this.map.destroy();
    if (this.decoRT) this.decoRT.destroy();
    if (this.wingWashes) this.wingWashes.forEach((w) => w.destroy());
    if (this.torchSprites) this.torchSprites.forEach((t) => { t.sconce.destroy(); t.glow.destroy(); });
    if (this.entityLayer) this.entityLayer.removeAll(true);

    this.layout = buildLayout(Math.random);
    this.state = 'playing';
    this.caption = { text: '', until: 0 };
    this.artifactReady = false;
    this.artifactTaken = false;
    this.activeFloor = 0;
    this.movingMazeState = 0;
    this.movingMazeNextAt = 0;
    this.movingMazeWarning = false;
    this.primaryHunterId = null;
    this.wingEntryGraceUntil = 0;
    this.hunterReliefUntil = 0;

    this.player = {
      facing: { x: 0, y: -1 },
      // A new real run always begins with the authored three lives. QA-only
      // overrides live in labyrinth-main and are unavailable in production.
      lives: TUNING.lives,
      keysCollected: 0,
      invulnUntil: 0,
      shieldCharges: 0,
      shieldActiveUntil: 0,
      shieldTutorialPending: false,
      shieldTutorialPrompt: false,
      shieldTutorialSeen: false,
      torchLit: true,
      torchFuelMs: TUNING.torchFuelMs,
    };

    this.buildLevel();
    this.buildEntities();
    this.buildHud();
    this.buildMinimap();

    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.startFollow(this.playerSprite, true, 0.14, 0.14);
    this.cameras.main.setZoom(1);
    this.cameras.main.flash(220, 10, 10, 14);

    // The player should see the authored three lives before the first chase.
    // Without a spawn grace window, an initial hunter can strike while the
    // camera/scene is still settling and drain lives before any input is made.
    const spawnGraceUntil = this.time.now + TUNING.wingEntryGraceMs;
    this.player.invulnUntil = spawnGraceUntil;
    this.wingEntryGraceUntil = spawnGraceUntil;

    // Seed silently — spawning "into" the first wing shouldn't pop a
    // transition card, only actually walking into the next one should.
    this.currentWingId = this.wingAt(this.playerSprite.x, this.playerSprite.y);
    this.highestWingReached = this.currentWingId;
    const wing = this.layout.wings.find((w) => w.id === this.currentWingId);
    if (wing) this.wingLabel.setText(wing.name);

    this.setCaption(STRINGS.introLine, 3000);
  }

  wingAt(x, y) {
    for (const w of this.layout.wings) {
      if (x >= w.bounds.x0 && x <= w.bounds.x1 && y >= w.bounds.y0 && y <= w.bounds.y1) return w.id;
    }
    return this.currentWingId ?? null;
  }

  // The maze as a real Phaser Tilemap: a 2-tile (floor/wall) tileset sliced
  // from one generated texture, one layer built straight from the wall
  // grid, wall tiles marked collidable. Arcade Physics colliders against
  // this layer are what actually stop the player/statues at a wall — no
  // hand-rolled circle-vs-grid math anywhere in this scene anymore.
  buildLevel() {
    const tilesetKey = ensureTilesetTexture(this);
    const data = this.layout.walls.map((row) => row.map((solid) => (solid ? TILE_WALL : TILE_FLOOR)));

    const map = this.make.tilemap({ data, tileWidth: CELL, tileHeight: CELL });
    const tileset = map.addTilesetImage('labTiles', tilesetKey, CELL, CELL, 0, 0);
    const layer = map.createLayer(0, tileset, 0, 0);
    layer.setCollision(TILE_WALL);
    layer.setDepth(-10);

    this.map = map;
    this.wallLayer = layer;

    // Per-wing atmosphere: one restrained cool wash over each wing's bounds.
    // Pure tone — it never changes what the walls mean.
    this.wingWashes = this.layout.wings.map((wing) => {
      const wash = WING_WASH[wing.id % WING_WASH.length];
      return this.add
        .rectangle(
          wing.bounds.x0, wing.bounds.y0,
          wing.bounds.x1 - wing.bounds.x0 + CELL, wing.bounds.y1 - wing.bounds.y0 + CELL,
          wash.color, wash.alpha,
        )
        .setOrigin(0, 0)
        .setDepth(-9);
    });

    this.bakeFloorDressing();

    // Authored relight stations: Wing 1 teaches in abundant permanent light;
    // later wings sharply reduce the number of safe pools. Last Gallery has
    // separate stations on each floor.
    this.torches = this.layout.torches.map((torch) => ({ ...torch }));
    this.torchSprites = [];
    for (const torch of this.torches) {
      const sconce = this.add.image(torch.x, torch.y, textureKey('torch')).setDepth(-1);
      const glow = this.add.image(torch.x, torch.y, textureKey('torch-glow'))
        .setDepth(-1)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(1.6)
        .setAlpha(0.85);
      this.torchSprites.push({ ...torch, sconce, glow, seed: (torch.cell.x * 31 + torch.cell.y * 17 + torch.floor * 43) % 100 });
    }
    this.syncFloorTorches();
  }

  // Static floor dressing, baked once into a single world-sized render
  // texture: threshold inlays where a corridor cell joins two rooms, and a
  // quiet room-center motif per wing (entry brass ring, restoration chalk
  // grid, archive shelf hatch, gallery plinth square). Decoration only —
  // every mark lands on a cell that is floor in the maze data.
  bakeFloorDressing() {
    const g = this.add.graphics();

    // Corridor thresholds: a thin brass tick square across the passage.
    g.lineStyle(2, PAL.brass, 0.32);
    for (let gy = 1; gy < GRID_H - 1; gy += 1) {
      for (let gx = 1; gx < GRID_W - 1; gx += 1) {
        if (this.layout.walls[gy][gx]) continue;
        const corridor = (gx % 2 === 0) !== (gy % 2 === 0);
        if (!corridor) continue;
        const cx = gx * CELL + CELL / 2;
        const cy = gy * CELL + CELL / 2;
        const horizontal = !this.layout.walls[gy][gx - 1] && !this.layout.walls[gy][gx + 1];
        if (horizontal) {
          g.lineBetween(cx, cy - 14, cx, cy + 14);
        } else {
          g.lineBetween(cx - 14, cy, cx + 14, cy);
        }
      }
    }

    // Room-center motifs, one quiet dialect per wing.
    for (const wing of this.layout.wings) {
      const ox = wing.bounds.x0 / CELL;
      const oy = wing.bounds.y0 / CELL;
      for (let ly = 1; ly < LOCAL_H; ly += 2) {
        for (let lx = 1; lx < LOCAL_W; lx += 2) {
          const gx = ox + lx;
          const gy = oy + ly;
          if (gx >= GRID_W || gy >= GRID_H || this.layout.walls[gy][gx]) continue;
          const cx = gx * CELL + CELL / 2;
          const cy = gy * CELL + CELL / 2;
          if (wing.id === 0) {
            g.lineStyle(1, PAL.brass, 0.3);
            g.strokeCircle(cx, cy, 11);
          } else if (wing.id === 1) {
            g.lineStyle(1, PAL.graphiteSoft, 0.22);
            g.lineBetween(cx - 13, cy, cx + 13, cy);
            g.lineBetween(cx, cy - 13, cx, cy + 13);
            g.strokeRect(cx - 6, cy - 6, 12, 12);
          } else if (wing.id === 2) {
            g.lineStyle(2, PAL.slate, 0.4);
            g.lineBetween(cx - 12, cy - 8, cx + 12, cy - 8);
            g.lineBetween(cx - 12, cy, cx + 12, cy);
            g.lineBetween(cx - 12, cy + 8, cx + 12, cy + 8);
          } else {
            g.lineStyle(1, PAL.slate, 0.38);
            g.strokeRect(cx - 11, cy - 11, 22, 22);
          }
        }
      }
    }

    // The exit room gets the only ornate inlay in the maze: a doubled brass
    // ring with cardinal ticks — finality, readable from the doorway.
    const ex = this.layout.exit.x;
    const ey = this.layout.exit.y;
    g.lineStyle(2, PAL.brass, 0.5);
    g.strokeCircle(ex, ey, 22);
    g.lineStyle(1, PAL.brass, 0.4);
    g.strokeCircle(ex, ey, 15);
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      g.lineBetween(ex + dx * 22, ey + dy * 22, ex + dx * 28, ey + dy * 28);
    }

    this.decoRT = this.add.renderTexture(0, 0, WORLD_W, WORLD_H).setOrigin(0, 0).setDepth(-8);
    this.decoRT.draw(g);
    g.destroy();
  }

  buildEntities() {
    this.entityLayer = this.add.container(0, 0);

    // Player: a real Arcade Physics body (circle, roughly centered in the
    // 26x46 frame) colliding against the wall layer — Phaser resolves the
    // wall-vs-circle math every physics step.
    this.playerSprite = this.physics.add.sprite(this.layout.spawn.x, this.layout.spawn.y, textureKey('butch-s'));
    this.playerSprite.setOrigin(0.5, 0.82);
    this.playerSprite.body.setCircle(TUNING.playerRadius, -2, 8);
    this.playerSprite.body.setCollideWorldBounds(false);
    this.physics.add.collider(this.playerSprite, this.wallLayer);
    // A faint warm underglow — the lantern the wanderer carries — keeps the
    // player readable at the center of their own fog clearing.
    this.playerGlow = this.add.image(this.playerSprite.x, this.playerSprite.y - 12, textureKey('torch-glow'))
      .setTint(PAL.ivory)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(1.1)
      .setAlpha(0.3);
    this.entityLayer.add([this.playerGlow, this.playerSprite]);

    // Shield aura — hidden until a shield is actually active, then tracks
    // the player every frame with a slow pulse. Purely decorative, no body.
    this.shieldRing = this.add.image(this.playerSprite.x, this.playerSprite.y - 20, textureKey('shield-ring')).setVisible(false).setBlendMode(Phaser.BlendModes.ADD);
    this.entityLayer.add(this.shieldRing);

    // Keys — static overlap bodies. Phaser calls onKeyOverlap the moment
    // the player's body touches one; no per-frame distance scan needed.
    // Each key floats with a slow bob and a sharp star glint so it never
    // reads as a torch (no warm pool, no sconce, ivory not amber light).
    this.keysGroup = this.physics.add.staticGroup();
    this.keySprites = this.layout.keys.map((k) => {
      const img = this.keysGroup.create(k.x, k.y - 6, textureKey('key'));
      img.body.setCircle(TUNING.keyPickupRadius, 13 - TUNING.keyPickupRadius, 8 - TUNING.keyPickupRadius);
      img.refreshBody();
      img.labData = k;
      const glint = this.add.image(k.x + 7, k.y - 12, textureKey('key-glint')).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: img, y: k.y - 10, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: glint, alpha: 0.15, scale: 0.6, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.entityLayer.add([img, glint]);
      return { data: k, img, glint };
    });

    // Shield collectibles — same overlap pattern as keys, with a slow
    // breathing pulse so the cyan silhouette reads as something to pick up.
    this.shieldsGroup = this.physics.add.staticGroup();
    this.shieldSprites = this.layout.shields.map((s) => {
      const img = this.shieldsGroup.create(s.x, s.y - 8, textureKey('shield'));
      img.body.setCircle(TUNING.shieldPickupRadius, 12 - TUNING.shieldPickupRadius, 13 - TUNING.shieldPickupRadius);
      img.refreshBody();
      img.labData = s;
      this.tweens.add({ targets: img, scale: 1.12, alpha: 0.82, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.entityLayer.add(img);
      return { data: s, img };
    });

    // Exit gate — the final one, needs every key in the run. The visual
    // sprite doubles as its own overlap zone (a static body larger than
    // the tile so "reached it" is forgiving, same as before).
    const g = this.layout.exit;
    this.gateSprite = this.physics.add.staticSprite(g.x, g.y, textureKey('fragment-seal'));
    const exitR = TUNING.keyPickupRadius + 6;
    this.gateSprite.body.setCircle(exitR, CELL / 2 - exitR, CELL / 2 - exitR);
    this.gateSprite.refreshBody();
    this.entityLayer.add(this.gateSprite);
    this.gateLabel = this.add
      .text(g.x, g.y - 46, '', { fontFamily: FONT, fontSize: '11px', color: css(PAL.bloodRed), fontStyle: 'bold', letterSpacing: 3 })
      .setOrigin(0.5, 1);
    this.entityLayer.add(this.gateLabel);

    // Wing connectors — the first key in the current wing opens the next
    // section; the rest remain part of the eight-key final exit hunt.
    // Physically
    // blocked by the wall tile at gate.cell (baked solid at generation,
    // opened with layer.putTileAt once unlocked); this sprite is only the
    // visual + the "you just bumped a locked gate" overlap zone.
    this.wingGatesGroup = this.physics.add.staticGroup();
    this.wingGateSprites = this.layout.gates.map((gate) => {
      const pos = { x: gate.cell.x * CELL + CELL / 2, y: gate.cell.y * CELL + CELL / 2 };
      const img = this.wingGatesGroup.create(pos.x, pos.y, textureKey('gate-locked'));
      const r = CELL * 0.9;
      img.body.setCircle(r, CELL / 2 - r, CELL / 2 - r);
      img.refreshBody();
      img.labData = gate;
      const label = this.add
        .text(pos.x, pos.y - 40, `→ ${gate.toName}`, {
          fontFamily: FONT, fontSize: '10px', color: css(PAL.bloodRed), fontStyle: 'bold', align: 'center', wordWrap: { width: 140 }, letterSpacing: 1,
        })
        .setOrigin(0.5, 1);
      this.entityLayer.add([img, label]);
      return { data: gate, img, label };
    });

    // Last Gallery stair landings exist at identical room centres on both
    // floors. E changes the floor only while Butch stands in one of these
    // safe rooms, so a swap can never place him inside a wall.
    this.stairSprites = this.layout.stairs.map((stair) => {
      const img = this.add.image(stair.x, stair.y, textureKey('stair')).setDepth(stair.y - 1);
      this.entityLayer.add(img);
      return { data: stair, img };
    });

    // Environmental guidance, not map markers: three broken-eye residues on
    // Floor II become warmer as Butch approaches the hidden fragment seal.
    this.fragmentClueSprites = this.layout.fragmentClues.map((clue, index) => {
      const img = this.add.image(clue.x, clue.y, textureKey('fragment-clue')).setDepth(clue.y - 1).setAlpha(0.45 + index * 0.16);
      this.entityLayer.add(img);
      return { data: clue, img };
    });

    // Statues — physics sprites colliding against the wall layer (so a
    // hunting statue slides along a wall the same way the player does),
    // overlapping (not colliding) with the player for the hit check.
    this.statuesGroup = this.physics.add.group();
    this.statues = this.layout.statues.map((s, i) => {
      const img = this.statuesGroup.create(s.spawn.x, s.spawn.y, textureKey('statue'));
      img.setOrigin(0.5, 0.92);
      // The visual anchor is at the statue's plinth/feet. Keep the collision
      // circle there too: the old centred-frame offset put the circle about
      // 22px above the path position, slightly inside the wall north of every
      // room centre, so the AI could request velocity forever without moving.
      img.body.setCircle(TUNING.statueRadius, -2, 31);
      const patrolWalls = this.layout.floorWalls[s.floor ?? 0];
      const statue = new StatueNPC(this.layout.walls, s.spawnCell, s.spawn, i, img, patrolWalls);
      statue.floor = s.floor ?? 0;
      statue.wing = s.wing;
      return statue;
    });
    this.statueSprites = this.statues.map((statue) => {
      const eye = this.add.image(statue.x, statue.y - 42, textureKey('eye-idle')).setOrigin(0.5, 0.5);
      this.entityLayer.add([statue.sprite, eye]);
      return { img: statue.sprite, eye };
    });
    this.physics.add.collider(this.statuesGroup, this.wallLayer);
    this.physics.add.overlap(this.playerSprite, this.statuesGroup, (player, statueSprite) => {
      const statue = this.statues.find((s) => s.sprite === statueSprite);
      if (statue?.canDamage && statue.state === 'hunting') statue.justHit = true;
    });
    this.physics.add.overlap(this.playerSprite, this.keysGroup, (player, img) => this.onKeyOverlap(img));
    this.physics.add.overlap(this.playerSprite, this.shieldsGroup, (player, img) => this.onShieldOverlap(img));
    this.physics.add.overlap(this.playerSprite, this.wingGatesGroup, (player, img) => this.onWingGateOverlap(img));
    this.physics.add.overlap(this.playerSprite, this.gateSprite, () => this.onExitOverlap());

    // Screen-space fog of war.
    if (this.fogRT) this.fogRT.destroy();
    this.fogRT = this.add.renderTexture(0, 0, VIEW.w, VIEW.h).setOrigin(0, 0).setScrollFactor(0).setDepth(50);
    this.flashlightMask = ensureRadialMask(this, TUNING.flashlightRadius);
    this.darkVisionMask = ensureRadialMask(this, TUNING.darkVisionRadius);
    this.carriedTorchMask = ensureRadialMask(this, TUNING.carriedTorchRadius);
    this.torchMask = ensureRadialMask(this, TUNING.torchRadius);
    this.syncFloorEntities();
  }

  syncFloorTorches() {
    if (!this.torchSprites) return;
    for (const torch of this.torchSprites) {
      const visible = torch.wing !== 3 || torch.floor === this.activeFloor;
      torch.sconce.setVisible(visible);
      torch.glow.setVisible(visible);
    }
  }

  syncFloorEntities() {
    if (!this.layout) return;
    const onFloor = (data) => data.wing !== 3 || (data.floor ?? 0) === this.activeFloor;
    for (const view of this.keySprites ?? []) {
      const active = onFloor(view.data) && !view.data.collected;
      view.img.setVisible(active);
      view.glint.setVisible(active);
      if (view.img.body) view.img.body.enable = active;
    }
    for (const view of this.shieldSprites ?? []) {
      const active = onFloor(view.data) && !view.data.collected;
      view.img.setVisible(active);
      if (view.img.body) view.img.body.enable = active;
    }
    for (let i = 0; i < (this.statues?.length ?? 0); i += 1) {
      const statue = this.statues[i];
      const active = statue.wing !== 3 || statue.floor === this.activeFloor;
      statue.sprite.setVisible(active);
      statue.sprite.body.enable = active;
      if (!active) statue.sprite.body.setVelocity(0, 0);
      this.statueSprites[i].eye.setVisible(active);
    }
    // The final archive seal is a destination marker, not a hidden
    // floor-specific collectible. Keeping it active on the walked final route
    // prevents the lower-left final way from appearing to have no exit.
    const exitActive = true;
    this.gateSprite?.setVisible(exitActive);
    this.gateLabel?.setVisible(exitActive);
    if (this.gateSprite?.body) this.gateSprite.body.enable = exitActive;
    for (const clue of this.fragmentClueSprites ?? []) clue.img.setVisible(this.activeFloor === clue.data.floor);
    this.syncFloorTorches();
  }

  nearestStair() {
    if (this.currentWingId !== 3 || this.state !== 'playing') return null;
    let nearest = null;
    let distance = Infinity;
    for (const stair of this.layout.stairs) {
      const d = Phaser.Math.Distance.Between(this.playerSprite.x, this.playerSprite.y, stair.x, stair.y);
      if (d < distance) {
        distance = d;
        nearest = stair;
      }
    }
    return distance <= TUNING.stairUseRadius ? nearest : null;
  }

  tryInteract() {
    if (this.artifactReady) {
      this.takeArtifact();
      return;
    }
    if (this.nearestStair()) this.switchFloor();
  }

  switchFloor() {
    const targetFloor = this.activeFloor === 0 ? 1 : 0;
    const wing = this.layout.wings[3];
    const source = this.layout.floorWalls[targetFloor];
    const x0 = Math.round(wing.bounds.x0 / CELL);
    const y0 = Math.round(wing.bounds.y0 / CELL);
    for (let ly = 0; ly < LOCAL_H; ly += 1) {
      for (let lx = 0; lx < LOCAL_W; lx += 1) {
        const gx = x0 + lx;
        const gy = y0 + ly;
        const solid = source[gy][gx];
        this.layout.walls[gy][gx] = solid;
        this.wallLayer.putTileAt(solid ? TILE_WALL : TILE_FLOOR, gx, gy);
      }
    }
    this.activeFloor = targetFloor;
    this.syncFloorEntities();
    this.redrawMinimapWalls();
    labyrinthCues.wingEnter();
    this.cameras.main.flash(260, 233, 226, 208);
    this.cameras.main.shake(180, 0.004);
    this.setCaption(`FLOOR ${targetFloor === 0 ? 'I' : 'II'}`, 1500);
  }

  // ------------------------------------------------------------ overlaps

  onKeyOverlap(img) {
    const k = img.labData;
    if (k.collected) return;
    k.collected = true;
    const view = this.keySprites.find((entry) => entry.img === img);
    if (view) {
      this.tweens.killTweensOf([view.img, view.glint]);
      view.glint.setVisible(false);
    }
    img.setVisible(false);
    img.body.enable = false;
    this.player.keysCollected += 1;
    labyrinthCues.keyTaken();
    this.cameras.main.flash(140, 233, 226, 208);
    if (this.player.keysCollected >= TUNING.keysTotal) {
      labyrinthCues.exitUnlock();
      this.setCaption(STRINGS.gateOpenNote, 2600);
    } else {
      this.setCaption(`KEY FOUND — ${this.player.keysCollected} / ${TUNING.keysTotal}`, 1600);
    }
  }

  onShieldOverlap(img) {
    const s = img.labData;
    if (s.collected) return;
    if (this.player.shieldCharges >= TUNING.shieldCap) {
      if (!s.fullNoteAt || this.time.now - s.fullNoteAt > 2400) {
        s.fullNoteAt = this.time.now;
        this.setCaption(STRINGS.shieldFullNote, 1800);
      }
      return;
    }
    s.collected = true;
    this.tweens.killTweensOf(img);
    img.setVisible(false);
    img.body.enable = false;
    this.player.shieldCharges += 1;
    labyrinthCues.shieldFound();
    this.cameras.main.flash(160, 47, 216, 200);
    if (!this.player.shieldTutorialSeen && !this.player.shieldTutorialPending) {
      this.player.shieldTutorialPending = true;
      this.setCaption(STRINGS.shieldFirstFoundNote, 3200);
    } else {
      this.setCaption(STRINGS.shieldFoundNote(this.player.shieldCharges), 1800);
    }
  }

  onWingGateOverlap(img) {
    const gate = img.labData;
    if (!gate.locked) return;
    if (!gate.noteShownAt || this.time.now - gate.noteShownAt > 2400) {
      gate.noteShownAt = this.time.now;
      const need = gate.requiredKeys - this.player.keysCollected;
      this.setCaption(STRINGS.wingGateLockedNote(gate.toName, need), 2200);
      sfx.blocked();
    }
  }

  onExitOverlap() {
    if (this.state !== 'playing') return;
    if (this.player.keysCollected >= TUNING.keysTotal) {
      this.onWin();
    } else if (!this.gateNoteShownAt || this.time.now - this.gateNoteShownAt > 2400) {
      this.gateNoteShownAt = this.time.now;
      this.setCaption(STRINGS.gateLockedNote, 2200);
      sfx.blocked();
    }
  }

  buildHud() {
    if (this.hud) this.hud.destroy();
    const hud = this.add.container(0, 0).setScrollFactor(0).setDepth(100);

    this.livesText = this.add.text(16, 12, '', {
      fontFamily: FONT, fontSize: '14px', color: css(PAL.red), fontStyle: 'bold',
    });
    this.keysText = this.add.text(16, 33, '', {
      fontFamily: FONT, fontSize: '12px', color: css(PAL.amber), fontStyle: 'bold', letterSpacing: 2,
    });
    this.shieldText = this.add.text(16, 52, '', {
      fontFamily: FONT, fontSize: '12px', color: css(PAL.cyan), fontStyle: 'bold', letterSpacing: 2,
    });
    this.torchText = this.add.text(16, 71, '', {
      fontFamily: FONT, fontSize: '11px', color: css(PAL.torchCore), fontStyle: 'bold', letterSpacing: 2,
    });
    this.wingLabel = this.add
      .text(VIEW.w - 16, 12, '', {
        fontFamily: FONT, fontSize: '11px', color: css(PAL.graphiteSoft), align: 'right', letterSpacing: 4,
      })
      .setOrigin(1, 0);
    this.controlsText = this.add.text(14, VIEW.h - 22, STRINGS.controls, {
      fontFamily: FONT, fontSize: '10px', color: css(0x6d7280),
    });
    this.captionText = this.add
      .text(VIEW.w / 2, VIEW.h - 50, '', {
        fontFamily: FONT, fontSize: '13px', color: css(PAL.ivory), fontStyle: 'italic',
        align: 'center', wordWrap: { width: 820 },
      })
      .setOrigin(0.5, 0);
    this.interactText = this.add
      .text(VIEW.w / 2, VIEW.h - 84, '', {
        fontFamily: FONT, fontSize: '12px', color: css(PAL.torchCore), fontStyle: 'bold',
        backgroundColor: '#060609cc', padding: { x: 10, y: 5 }, letterSpacing: 2,
      })
      .setOrigin(0.5);
    hud.add([this.livesText, this.keysText, this.shieldText, this.torchText, this.wingLabel, this.controlsText, this.captionText, this.interactText]);

    // End-of-run overlay (game over / win). Same container, swapped text.
    const dim = this.add.rectangle(VIEW.w / 2, VIEW.h / 2, VIEW.w, VIEW.h, PAL.void, 0.78).setVisible(false);
    const line1 = this.add
      .text(VIEW.w / 2, VIEW.h / 2 - 120, '', {
        fontFamily: FONT, fontSize: '19px', color: css(PAL.ivory), fontStyle: 'bold', align: 'center', wordWrap: { width: 700 }, letterSpacing: 2,
      })
      .setOrigin(0.5);
    const line2 = this.add
      .text(VIEW.w / 2, VIEW.h / 2 - 76, '', {
        fontFamily: FONT, fontSize: '12px', color: css(PAL.amber), align: 'center', letterSpacing: 1,
      })
      .setOrigin(0.5);
    hud.add([dim, line1, line2]);
    this.endOverlay = { dim, line1, line2 };

    // The Looking Fragment epilogue: the shard rests in a pool of its own
    // warm residue-light until the player deliberately takes it. Nothing
    // auto-advances past this beat — the exhibit only completes once E is
    // pressed and the fragment is physically taken.
    const fragment = this.add.container(VIEW.w / 2, VIEW.h / 2 + 40).setVisible(false).setAlpha(0);
    const fragGlow = this.add.image(0, 0, textureKey('fragment-glow')).setBlendMode(Phaser.BlendModes.ADD);
    const fragShard = this.add.image(0, 0, textureKey('fragment'));
    const take = this.add.text(0, 96, STRINGS.fragmentTakeHint, {
      fontFamily: FONT, fontSize: '12px', color: css(PAL.ivory), letterSpacing: 3,
      backgroundColor: '#09090dcc', padding: { x: 12, y: 6 },
    }).setOrigin(0.5);
    fragment.add([fragGlow, fragShard, take]);
    hud.add(fragment);
    this.artifactView = fragment;
    this.artifactParts = { glow: fragGlow, shard: fragShard, take };

    // Wing-transition title card — the "advancing from car to car" beat,
    // without ever cutting away from the walked, continuous labyrinth.
    const wingCard = this.add
      .text(VIEW.w / 2, VIEW.h * 0.3, '', {
        fontFamily: FONT, fontSize: '22px', color: css(PAL.ivory), fontStyle: 'bold',
        align: 'center', letterSpacing: 8,
      })
      .setOrigin(0.5)
      .setAlpha(0);
    hud.add(wingCard);
    this.wingCardText = wingCard;
    this.currentWingId = null;

    this.hud = hud;
  }

  showWingCard(text) {
    this.wingCardText.setText(text);
    this.tweens.killTweensOf(this.wingCardText);
    this.wingCardText.setAlpha(0);
    this.tweens.add({
      targets: this.wingCardText,
      alpha: 1,
      duration: 380,
      yoyo: true,
      hold: 1400,
      ease: 'Quad.easeOut',
    });
  }

  // Survey map: a static top-down bake of the maze's walls, redrawn each
  // frame only for the moving bits. Pinned lower-right so it never covers
  // Butch's opening position.
  buildMinimap() {
    if (this.minimap) this.minimap.container.destroy();

    const size = TUNING.minimapSize;
    const scale = size / WORLD_W;
    const x0 = VIEW.w - size - 18;
    const y0 = VIEW.h - size - 30;

    const container = this.add.container(0, 0).setScrollFactor(0).setDepth(101);

    const panel = this.add.rectangle(x0 - 7, y0 - 7, size + 14, size + 14, PAL.mapBackground, 0.96).setOrigin(0, 0);
    const border = this.add.graphics();
    border.lineStyle(2, PAL.cyan, 0.98);
    border.strokeRect(x0 - 7, y0 - 7, size + 14, size + 14);

    const label = this.add
      .text(x0, y0 - 8, 'SURVEY · FLOOR I', {
        fontFamily: FONT, fontSize: '11px', color: css(PAL.cyan), fontStyle: 'bold', letterSpacing: 4,
      })
      .setOrigin(0, 1);

    // One-time bake of the static wall layout at minimap scale. Kept as a
    // reference (not just added to the container) so a wing gate can punch
    // itself open here too the moment it unlocks at runtime.
    const wallsBake = this.add.renderTexture(x0, y0, size, size).setOrigin(0, 0);

    const markers = this.add.graphics();

    const nearestText = this.add
      .text(x0, y0 - 25, '', {
        fontFamily: FONT, fontSize: '11px', color: css(PAL.amber), fontStyle: 'bold', wordWrap: { width: size },
      })
      .setOrigin(0, 1);

    const pipRow = [];
    const pipGap = 22;
    const pipY = y0 - 48;
    for (let i = 0; i < TUNING.keysTotal; i += 1) {
      const pip = this.add.image(x0 + 8 + i * pipGap, pipY, textureKey('pip'));
      pipRow.push(pip);
    }

    container.add([panel, border, label, wallsBake, markers, nearestText, ...pipRow]);
    this.minimap = { x0, y0, size, scale, markers, nearestText, pipRow, wallsBake, label, container };
    this.redrawMinimapWalls();
  }

  redrawMinimapWalls() {
    const mm = this.minimap;
    if (!mm) return;
    mm.wallsBake.clear();
    mm.wallsBake.fill(PAL.mapBackground, 1);
    for (let gy = 0; gy < GRID_H; gy += 1) {
      for (let gx = 0; gx < GRID_W; gx += 1) {
        if (!this.layout.walls[gy][gx]) continue;
        mm.wallsBake.fill(PAL.mapWall, 0.96, gx * CELL * mm.scale, gy * CELL * mm.scale, Math.ceil(CELL * mm.scale), Math.ceil(CELL * mm.scale));
      }
    }
    mm.label.setText(`SURVEY · FLOOR ${this.activeFloor === 0 ? 'I' : 'II'}`);
  }

  // Punches a wing gate open on the survey map the moment it unlocks, so
  // the map stays truthful instead of still showing a wall that's gone.
  openGateOnMinimap(gate) {
    const mm = this.minimap;
    if (!mm) return;
    mm.wallsBake.fill(
      PAL.mapBackground, 1,
      gate.cell.x * CELL * mm.scale, gate.cell.y * CELL * mm.scale,
      Math.ceil(CELL * mm.scale), Math.ceil(CELL * mm.scale),
    );
  }

  updateMinimap(time) {
    const mm = this.minimap;
    if (!mm) return;
    mm.markers.clear();

    const toMini = (wx, wy) => [mm.x0 + wx * mm.scale, mm.y0 + wy * mm.scale];

    // Once every wing is cleared, the final escape point becomes an explicit
    // survey objective instead of making the player search the whole maze.
    const allKeys = this.player.keysCollected >= TUNING.keysTotal;

    // Remaining keys.
    mm.markers.fillStyle(PAL.amber, 1);
    for (const k of this.layout.keys) {
      if (k.collected || (k.wing === 3 && k.floor !== this.activeFloor)) continue;
      const [kx, ky] = toMini(k.x, k.y);
      mm.markers.fillCircle(kx, ky, 3);
    }

    // Remaining shield pickups.
    mm.markers.fillStyle(PAL.cyan, 1);
    for (const s of this.layout.shields) {
      if (s.collected || (s.wing === 3 && s.floor !== this.activeFloor)) continue;
      const [sx, sy] = toMini(s.x, s.y);
      mm.markers.fillRect(sx - 2.5, sy - 2.5, 5, 5);
    }

    // Hunting statues surface as a pulsing warning blip — a read on danger,
    // not full x-ray vision (idle/frozen statues stay off the map).
    const pulse = 0.6 + 0.4 * Math.sin(time / 140);
    mm.markers.fillStyle(PAL.eyeHunt, pulse);
    for (const s of this.statues) {
      if (s.state !== 'hunting' || !s.sprite.visible) continue;
      const [sx, sy] = toMini(s.x, s.y);
      mm.markers.fillCircle(sx, sy, 3.4);
    }

    // Player, as a small arrow pointed the way they're facing.
    const [px, py] = toMini(this.playerSprite.x, this.playerSprite.y);
    const ang = Math.atan2(this.player.facing.y, this.player.facing.x);
    const pts = [[7, 0], [-5, -5], [-5, 5]].map(([tx, ty]) => [
      px + tx * Math.cos(ang) - ty * Math.sin(ang),
      py + tx * Math.sin(ang) + ty * Math.cos(ang),
    ]);
    mm.markers.fillStyle(PAL.ivory, 1);
    mm.markers.fillTriangle(pts[0][0], pts[0][1], pts[1][0], pts[1][1], pts[2][0], pts[2][1]);

    if (allKeys) {
      const [ex, ey] = toMini(this.layout.exit.x, this.layout.exit.y);
      const exitPulse = 0.68 + 0.32 * Math.sin(time / 180);
      mm.markers.lineStyle(2, PAL.torchCore, exitPulse);
      mm.markers.strokeCircle(ex, ey, 6.5);
      mm.markers.fillStyle(PAL.torch, 1);
      mm.markers.fillTriangle(ex, ey - 4.5, ex + 4.5, ey, ex, ey + 4.5);
      mm.markers.fillTriangle(ex, ey - 4.5, ex - 4.5, ey, ex, ey + 4.5);
    }

    // Nearest-key readout: 8-way arrow + distance in paces.
    let nearest = null;
    let nearestD = Infinity;
    for (const k of this.layout.keys) {
      if (k.collected || (k.wing === 3 && k.floor !== this.activeFloor)) continue;
      const d = Phaser.Math.Distance.Between(this.playerSprite.x, this.playerSprite.y, k.x, k.y);
      if (d < nearestD) {
        nearestD = d;
        nearest = k;
      }
    }
    const missing = TUNING.keysTotal - this.player.keysCollected;
    if (nearest) {
      const dirAngle = Math.atan2(nearest.y - this.playerSprite.y, nearest.x - this.playerSprite.x);
      const arrows = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'];
      const idx = (Math.round(((dirAngle + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) + 8) % 8;
      const paces = Math.max(1, Math.round(nearestD / CELL));
      mm.nearestText.setText(`KEY ${arrows[idx]} ${paces} PACES  ·  ${missing} LEFT`);
    } else if (allKeys) {
      const exit = this.layout.exit;
      const dirAngle = Math.atan2(exit.y - this.playerSprite.y, exit.x - this.playerSprite.x);
      const arrows = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'];
      const idx = (Math.round(((dirAngle + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) + 8) % 8;
      const paces = Math.max(1, Math.round(Phaser.Math.Distance.Between(this.playerSprite.x, this.playerSprite.y, exit.x, exit.y) / CELL));
      mm.nearestText.setText(`ESCAPE ${arrows[idx]} ${paces} PACES`);
    } else {
      mm.nearestText.setText('');
    }

    mm.pipRow.forEach((pip, i) => {
      if (i < this.player.keysCollected) {
        pip.setTint(PAL.torch);
        pip.setAlpha(1);
      } else {
        pip.setTint(0x3a3a44);
        pip.setAlpha(0.55);
      }
    });
  }

  setCaption(text, ms = 2600) {
    this.captionText.setText(text || '');
    this.caption.until = text ? this.time.now + ms : 0;
  }

  // ----------------------------------------------------------------- input

  readInput() {
    const k = this.keys;
    const left = k.left.isDown || k.a.isDown;
    const right = k.right.isDown || k.d.isDown;
    const up = k.up.isDown || k.w.isDown;
    const down = k.down.isDown || k.s.isDown;
    let x = (right ? 1 : 0) - (left ? 1 : 0);
    let y = (down ? 1 : 0) - (up ? 1 : 0);
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.SQRT2;
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  // ------------------------------------------------------------ end states

  onHit() {
    if (this.state !== 'playing' || this.time.now < this.player.invulnUntil) return;
    this.player.lives -= 1;
    this.player.invulnUntil = this.time.now + TUNING.invulnMs;
    this.primaryHunterId = null;
    this.hunterReliefUntil = this.time.now + TUNING.hunterReliefAfterHitMs;
    for (const statue of this.statues) {
      if (statue.wing !== this.currentWingId) continue;
      statue.canDamage = false;
      statue.justHit = false;
      if (['hunting', 'frozen'].includes(statue.state)) {
        statue.state = 'patrolling';
        statue.path = null;
        statue.pathIndex = 0;
        statue.repathAt = 0;
        statue.patrolGoal = null;
      }
    }
    labyrinthCues.statueHit();
    this.cameras.main.flash(260, 140, 20, 20);
    this.cameras.main.shake(220, 0.012);
    const flavor = STRINGS.hitFlavor[Phaser.Math.Between(0, STRINGS.hitFlavor.length - 1)];
    this.setCaption(flavor, 1800);
    if (this.player.lives <= 0) {
      this.onGameOver();
    }
  }

  onShieldBlock() {
    // A short buffer so several statues landing on the same guarded frame
    // don't each try to re-trigger this; the shield itself keeps running
    // for its full duration regardless.
    this.player.invulnUntil = this.time.now + 500;
    labyrinthCues.shieldBlock();
    this.cameras.main.flash(180, 47, 216, 200);
    const flavor = STRINGS.shieldBlockedHit[Phaser.Math.Between(0, STRINGS.shieldBlockedHit.length - 1)];
    this.setCaption(flavor, 1500);
  }

  onGameOver() {
    this.state = 'over';
    this.interactText?.setText('');
    chaseMusic.setChasing(false);
    sfx.gameover();
    this.endOverlay.dim.setVisible(true);
    this.endOverlay.line1.setText(STRINGS.gameOverLine).setColor(css(PAL.red));
    this.endOverlay.line2.setText(STRINGS.gameOverSub);
  }

  // A full loss restarts the *current wing*, not the entire Labyrinth. The
  // player keeps every key and opened route already earned; only the local
  // pursuit is reset and the next attempt begins at this wing's safe entry.
  restartCurrentWing() {
    const wingId = this.currentWingId ?? 0;
    const checkpoint = this.layout.wingStarts[wingId] ?? this.layout.spawn;
    if (this.activeFloor !== (checkpoint.floor ?? 0) && wingId === 3) this.switchFloor();
    this.state = 'playing';
    this.player.lives = TUNING.lives;
    this.player.shieldActiveUntil = 0;
    this.playerSprite.body.reset(checkpoint.x, checkpoint.y);
    this.primaryHunterId = null;
    this.hunterReliefUntil = this.time.now + TUNING.hunterReliefAfterHitMs;
    this.wingEntryGraceUntil = this.time.now + TUNING.wingEntryGraceMs;
    this.player.invulnUntil = this.wingEntryGraceUntil;
    for (const statue of this.statues) {
      if (statue.wing === wingId) statue.resetToSpawn();
    }
    this.endOverlay.dim.setVisible(false);
    this.endOverlay.line1.setText('');
    this.endOverlay.line2.setText('');
    this.cameras.main.flash(220, 233, 226, 208);
    this.setCaption(`BACK AT ${this.layout.wings[wingId]?.name ?? 'THE ENTRY'} — THREE LIVES RESTORED.`, 2400);
  }

  onWin() {
    this.state = 'won';
    this.interactText?.setText('');
    chaseMusic.setChasing(false);
    sfx.goal();
    this.endOverlay.dim.setVisible(true);
    this.endOverlay.line1.setText(STRINGS.winLine).setColor(css(PAL.cyan));
    this.endOverlay.line2.setText(STRINGS.winSub);
    this.time.delayedCall(1400, () => this.revealArtifact());
  }

  revealArtifact() {
    if (this.state !== 'won' || this.artifactReady || this.artifactTaken) return;
    this.state = 'artifact-ready';
    this.artifactReady = true;
    labyrinthCues.fragmentReveal();
    this.artifactView.setVisible(true);
    this.tweens.add({ targets: this.artifactView, alpha: 1, y: this.artifactView.y - 16, duration: 900, ease: 'Quad.easeOut' });
    // Restrained idle: the shard settles and then barely floats, and its
    // residue-light breathes. It waits here until the player takes it.
    this.tweens.add({
      targets: this.artifactParts.shard,
      y: -7, rotation: 0.05, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 900,
    });
    this.tweens.add({
      targets: this.artifactParts.glow,
      alpha: 0.55, scale: 1.08, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: this.artifactParts.take,
      alpha: 0.35, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    this.endOverlay.line2.setText(STRINGS.fragmentRestLine);
  }

  takeArtifact() {
    if (!this.artifactReady || this.artifactTaken) return;
    this.artifactReady = false;
    this.artifactTaken = true;
    labyrinthCues.fragmentTake();
    this.cameras.main.flash(180, 233, 226, 208);
    this.tweens.killTweensOf([this.artifactParts.shard, this.artifactParts.glow, this.artifactParts.take]);
    this.artifactParts.take.setVisible(false);
    this.tweens.add({ targets: this.artifactView, alpha: 0, scale: 0.42, duration: 320, ease: 'Back.easeIn' });
    this.endOverlay.line2.setText(STRINGS.fragmentTakenLine);
    this.time.delayedCall(420, () => { this.state = 'artifact-taken'; });
  }

  // ------------------------------------------------------------ per-frame

  update(time, delta) {
    // Clamp so a lag spike (or a backgrounded tab resuming) can't hand a
    // single physics step a huge delta.
    const dt = Math.min(delta, 50);
    if (this.state === 'playing') this.updatePlaying(time, dt);
    this.updateTorches(time);
    this.renderFog();
    this.updateMinimap(time);
    if (this.caption.until && time > this.caption.until) {
      this.captionText.setText('');
      this.caption.until = 0;
    }
  }

  // Torch pools breathe: a slow per-sconce flicker on the warm glow sprite
  // only (the sconce itself stays a still silhouette). A handful of alpha/
  // scale writes per frame — no allocations, no redraws.
  updateTorches(time) {
    if (!this.torchSprites) return;
    for (const t of this.torchSprites) {
      const flicker = Math.sin(time / 130 + t.seed) * 0.5 + Math.sin(time / 47 + t.seed * 2.3) * 0.5;
      t.glow.setAlpha(0.78 + flicker * 0.14);
      t.glow.setScale(1.6 + flicker * 0.1);
    }
  }

  updateCarriedTorch(delta) {
    // Wing I teaches the gaze rule with permanent light. From Wing II on,
    // light is a carried resource and every relight station is also a risk:
    // a bright flame wakes statues from much farther away.
    if (this.currentWingId === 0) {
      this.player.torchLit = true;
      this.player.torchFuelMs = TUNING.torchFuelMs;
      return;
    }
    const nearStation = this.torchSprites?.some((torch) => (
      torch.sconce.visible
      && Phaser.Math.Distance.Between(this.playerSprite.x, this.playerSprite.y, torch.x, torch.y) <= TUNING.torchRelightRadius
    ));
    if (nearStation) {
      const wasOut = !this.player.torchLit;
      this.player.torchLit = true;
      this.player.torchFuelMs = TUNING.torchFuelMs;
      if (wasOut) {
        this.setCaption(STRINGS.torchLitNote, 2200);
        labyrinthCues.wingEnter();
      }
      return;
    }
    if (!this.player.torchLit) return;
    this.player.torchFuelMs = Math.max(0, this.player.torchFuelMs - delta);
    if (this.player.torchFuelMs === 0) {
      this.player.torchLit = false;
      this.setCaption(STRINGS.torchOutNote, 2400);
      this.cameras.main.flash(180, 5, 6, 9);
    }
  }

  applyMovingMazeState(index) {
    const moving = this.layout.movingMaze;
    const state = moving.states[index];
    const finalChanges = moving.cells.map((base) => ({ ...base }));
    for (const change of state.changes) {
      const target = finalChanges.find((cell) => cell.x === change.x && cell.y === change.y);
      if (target) target.solid = change.solid;
    }
    const occupied = [worldToCell(this.playerSprite.x, this.playerSprite.y)];
    for (const statue of this.statues) {
      if (statue.sprite.visible) occupied.push(worldToCell(statue.x, statue.y));
    }
    if (stateWouldCrush({ changes: finalChanges }, occupied)) return false;
    const prospectiveWalls = cloneWalls(this.layout.walls);
    for (const change of finalChanges) prospectiveWalls[change.y][change.x] = change.solid;
    const playerCell = occupied[0];
    if (!playerCanReachTargets(prospectiveWalls, playerCell, moving.routeCells)) return false;
    for (const change of finalChanges) {
      this.layout.walls[change.y][change.x] = change.solid;
      this.layout.floorWalls[0][change.y][change.x] = change.solid;
      this.layout.floorWalls[1][change.y][change.x] = change.solid;
      this.wallLayer.putTileAt(change.solid ? TILE_WALL : TILE_FLOOR, change.x, change.y);
    }
    for (const statue of this.statues) {
      statue.path = null;
      statue.repathAt = 0;
    }
    this.movingMazeState = index;
    this.redrawMinimapWalls();
    return true;
  }

  updateMovingMaze(time) {
    if (this.currentWingId !== this.layout.movingMaze.wingId) {
      this.movingMazeNextAt = 0;
      this.movingMazeWarning = false;
      return;
    }
    if (!this.movingMazeNextAt) this.movingMazeNextAt = time + TUNING.movingMazeIntervalMs;
    const remaining = this.movingMazeNextAt - time;
    if (!this.movingMazeWarning && remaining <= TUNING.movingMazeWarningMs) {
      this.movingMazeWarning = true;
      this.setCaption(STRINGS.movingMazeWarning, TUNING.movingMazeWarningMs);
      this.cameras.main.shake(TUNING.movingMazeWarningMs, 0.0015);
    }
    if (remaining > 0) return;
    const next = (this.movingMazeState + 1) % this.layout.movingMaze.states.length;
    if (!this.applyMovingMazeState(next)) {
      this.movingMazeNextAt = time + 650;
      return;
    }
    this.movingMazeNextAt = time + TUNING.movingMazeIntervalMs;
    this.movingMazeWarning = false;
    this.setCaption(STRINGS.movingMazeShifted, 1800);
    this.cameras.main.flash(170, 55, 61, 74);
    this.cameras.main.shake(260, 0.006);
  }

  updateFragmentClues(time) {
    const onUpper = this.currentWingId === 3 && this.activeFloor === 1;
    let nearest = Infinity;
    for (let i = 0; i < (this.fragmentClueSprites?.length ?? 0); i += 1) {
      const clue = this.fragmentClueSprites[i];
      if (!onUpper) continue;
      const d = Phaser.Math.Distance.Between(this.playerSprite.x, this.playerSprite.y, clue.data.x, clue.data.y);
      nearest = Math.min(nearest, d);
      clue.img.setAlpha(0.42 + i * 0.13 + Math.sin(time / 240 + i) * 0.16);
      clue.img.setRotation(Math.atan2(this.layout.exit.y - clue.data.y, this.layout.exit.x - clue.data.x) + Math.PI / 2);
    }
    if (nearest < 145 && (!this.fragmentClueNoteAt || time - this.fragmentClueNoteAt > 5000)) {
      this.fragmentClueNoteAt = time;
      this.setCaption(STRINGS.fragmentClueNear, 2200);
    }
  }

  updatePlaying(time, delta) {
    this.updateCarriedTorch(delta);
    this.updateMovingMaze(time);
    this.updateFragmentClues(time);
    const input = this.readInput();
    const moving = input.x !== 0 || input.y !== 0;
    if (moving) {
      this.player.facing = { x: input.x, y: input.y };
    }
    // Arcade Physics velocity is px/s; TUNING.playerSpeed is px/ms.
    this.playerSprite.body.setVelocity(input.x * TUNING.playerSpeed * 1000, input.y * TUNING.playerSpeed * 1000);
    this.playerSprite.setTexture(facingTexture(this.player.facing));
    this.playerSprite.setFlipX(false);
    this.playerSprite.setDepth(this.playerSprite.y);
    // Restrained life: a slight lean into motion, a slow breath when still.
    this.playerSprite.setRotation(moving ? input.x * 0.05 : 0);
    this.playerSprite.setScale(1, moving ? 1 : 1 + Math.sin(time / 480) * 0.012);
    const invuln = time < this.player.invulnUntil;
    this.playerSprite.setAlpha(invuln ? 0.5 + 0.5 * Math.sin(time / 60) : 1);
    this.playerGlow.setPosition(this.playerSprite.x, this.playerSprite.y - 12);
    this.playerGlow.setAlpha(this.player.torchLit ? 0.38 : 0.08);

    // Active-shield aura: track the player, hidden when not up.
    const shieldActive = time < this.player.shieldActiveUntil;
    this.shieldRing.setVisible(shieldActive);
    if (shieldActive) {
      this.shieldRing.setPosition(this.playerSprite.x, this.playerSprite.y - 18);
      this.shieldRing.setDepth(this.playerSprite.y + 0.5);
      this.shieldRing.setAlpha(0.55 + 0.35 * Math.sin(time / 110));
      this.shieldRing.setScale(0.55 + 0.03 * Math.sin(time / 90));
    }

    // Wing connectors — unlock after the first key from the current wing,
    // then let the player walk through and backtrack freely.
    for (const gs of this.wingGateSprites) {
      const gate = gs.data;
      if (gate.locked && this.player.keysCollected >= gate.requiredKeys) {
        gate.locked = false;
        this.layout.walls[gate.cell.y][gate.cell.x] = false;
        this.layout.floorWalls[0][gate.cell.y][gate.cell.x] = false;
        this.layout.floorWalls[1][gate.cell.y][gate.cell.x] = false;
        this.wallLayer.putTileAt(TILE_FLOOR, gate.cell.x, gate.cell.y);
        gs.img.setTexture(textureKey('gate-open'));
        gs.label.setColor(css(PAL.cyan));
        this.openGateOnMinimap(gate);
        labyrinthCues.gateUnlock();
        this.cameras.main.flash(200, 47, 216, 200);
        this.cameras.main.shake(160, 0.004);
        this.setCaption(STRINGS.wingGateOpenNote(gate.toName), 2400);
      }
    }

    // Wing transitions — the "advance from scene to scene" beat.
    const wingNow = this.wingAt(this.playerSprite.x, this.playerSprite.y);
    if (wingNow !== null && wingNow !== this.currentWingId) {
      const transition = applyWingEntryRules({
        currentWingId: this.currentWingId,
        targetWingId: wingNow,
        highestWingReached: this.highestWingReached,
        lives: this.player.lives,
        maxLives: TUNING.lives,
      });
      this.currentWingId = transition.currentWingId;
      this.highestWingReached = transition.highestWingReached;
      this.player.lives = transition.lives;
      this.primaryHunterId = null;
      this.statues.forEach((statue) => {
        statue.canDamage = false;
        statue.justHit = false;
      });
      if (transition.advanced) {
        this.wingEntryGraceUntil = time + TUNING.wingEntryGraceMs;
        this.player.invulnUntil = Math.max(this.player.invulnUntil, this.wingEntryGraceUntil);
      }
      const wing = this.layout.wings.find((w) => w.id === wingNow);
      if (wing) {
        this.showWingCard(STRINGS.wingCard(wing.name));
        this.wingLabel.setText(wing.id === 3 ? `${wing.name} · FLOOR ${this.activeFloor === 0 ? 'I' : 'II'}` : wing.name);
        labyrinthCues.wingEnter();
        this.cameras.main.flash(220, 233, 226, 208);
        if (transition.advanced && wing.id === 3) {
          this.setCaption(`${STRINGS.wingLivesRestored}\n${STRINGS.lastGalleryIntro}`, 5600);
        } else if (transition.advanced) {
          this.setCaption(STRINGS.wingLivesRestored, 2600);
        } else if (wing.id === 3) {
          this.setCaption(STRINGS.lastGalleryIntro, 5200);
        }
      }
    }

    // Exit gate visual state (open/locked texture only — reaching it is
    // handled by the overlap callback, onExitOverlap).
    const allKeys = this.player.keysCollected >= TUNING.keysTotal;
    this.gateSprite.setTexture(allKeys ? textureKey('fragment-seal-ready') : textureKey('fragment-seal'));
    this.gateLabel.setColor(allKeys ? css(PAL.cyan) : css(PAL.bloodRed));

    // Statues.
    let chasingClose = false;
    let nearestHunt = Infinity;
    let hitThisFrame = false;
    let blockedThisFrame = false;
    const litDanger = this.currentWingId > 0 && this.player.torchLit;
    const activeHunterRadius = litDanger
      ? TUNING.torchAttractionRadius
      : (this.player.torchLit ? TUNING.activationRadius : TUNING.darkActivationRadius);
    const huntersPaused = time < Math.max(this.wingEntryGraceUntil, this.hunterReliefUntil);
    this.primaryHunterId = huntersPaused
      ? null
      : choosePrimaryHunterId(this.statues, {
        playerX: this.playerSprite.x,
        playerY: this.playerSprite.y,
        wingId: this.currentWingId,
        floor: this.activeFloor,
        previousId: this.primaryHunterId,
        activationRadius: activeHunterRadius,
        returnRadius: TUNING.returnRadius,
      });
    this.statues.forEach((statue, i) => {
      const spr = this.statueSprites[i];
      if (!statue.sprite.visible || !statue.sprite.body.enable) {
        statue.sprite.body.setVelocity(0, 0);
        return;
      }
      const isPrimaryHunter = statue.id === this.primaryHunterId;
      statue.update(
        time,
        { x: this.playerSprite.x, y: this.playerSprite.y, facing: this.player.facing },
        {
          activationRadius: litDanger ? TUNING.torchAttractionRadius : (this.player.torchLit ? TUNING.activationRadius : TUNING.darkActivationRadius),
          visionRange: this.player.torchLit ? TUNING.visionRange : TUNING.darkVisionRadius * 1.3,
          allowHunt: isPrimaryHunter,
        },
      );
      statue.canDamage = statueCanDamage({
        isPrimaryHunter,
        state: statue.state,
        now: time,
        wingGraceUntil: this.wingEntryGraceUntil,
      });
      spr.img.setDepth(statue.y);
      spr.eye.setPosition(statue.x, statue.y - 42);
      spr.eye.setDepth(statue.y + 1);
      // Three readable pursuit states: asleep slits, held embers when the
      // player's gaze pins it, hot red points when it hunts unseen.
      if (statue.state === 'hunting') {
        spr.eye.setTexture(textureKey('eye-hunt'));
        spr.eye.setBlendMode(Phaser.BlendModes.ADD);
        spr.eye.setAlpha(0.85 + 0.15 * Math.sin(time / 90 + i));
      } else if (statue.state === 'frozen') {
        spr.eye.setTexture(textureKey('eye-frozen'));
        spr.eye.setBlendMode(Phaser.BlendModes.NORMAL);
        spr.eye.setAlpha(1);
      } else if (statue.state === 'returning') {
        spr.eye.setTexture(textureKey('eye-idle'));
        spr.eye.setBlendMode(Phaser.BlendModes.NORMAL);
        spr.eye.setAlpha(0.45 + 0.15 * Math.sin(time / 220 + i));
      } else {
        spr.eye.setTexture(textureKey('eye-idle'));
        spr.eye.setBlendMode(Phaser.BlendModes.NORMAL);
        spr.eye.setAlpha(1);
      }

      if (statue.state === 'hunting') {
        const d = Phaser.Math.Distance.Between(this.playerSprite.x, this.playerSprite.y, statue.x, statue.y);
        if (d < nearestHunt) nearestHunt = d;
        if (d <= TUNING.chaseProximity) chasingClose = true;
      }
      if (statue.justHit && statue.canDamage && time >= this.player.invulnUntil) {
        if (shieldActive) blockedThisFrame = true;
        else hitThisFrame = true;
        statue.relocateAwayFrom(worldToCell(this.playerSprite.x, this.playerSprite.y));
        // A brief ember-flash at the statue's new post, so the relocation
        // reads as "it withdrew into the dark" instead of a vanish.
        const ember = this.add.image(statue.x, statue.y - 42, textureKey('eye-hunt'))
          .setScale(2.4)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0.8);
        this.entityLayer.add(ember);
        this.tweens.add({ targets: ember, alpha: 0, duration: 500, onComplete: () => ember.destroy() });
      }
      statue.justHit = false;
    });
    chaseMusic.setChasing(chasingClose);
    if (chasingClose) chaseMusic.setIntensity(1 - Math.max(0, Math.min(1, nearestHunt / TUNING.chaseProximity)));
    if (hitThisFrame) this.onHit();
    else if (blockedThisFrame) this.onShieldBlock();

    // The first hunter encountered after the first shield pickup pauses the
    // usual contextual hint slot on one explicit lesson. It remains visible
    // until Space successfully activates the shield, so a glance or a missed
    // key press cannot consume the tutorial.
    if (
      this.player.shieldTutorialPending
      && this.player.shieldCharges > 0
      && !shieldActive
      && nearestHunt <= TUNING.shieldTutorialThreatRadius
    ) {
      this.player.shieldTutorialPrompt = true;
      this.player.shieldTutorialSeen = true;
    }

    this.livesText.setText(`${STRINGS.livesLabel}  ${'♥'.repeat(Math.max(0, this.player.lives))}${'♡'.repeat(Math.max(0, TUNING.lives - this.player.lives))}`);
    this.keysText.setText(STRINGS.keysLabel(this.player.keysCollected, TUNING.keysTotal));
    this.shieldText.setText(STRINGS.shieldLabel(this.player.shieldCharges) + (shieldActive ? '  ●' : ''));
    if (this.currentWingId === 0) {
      this.torchText.setText('FLAME  PERMANENT');
    } else {
      const segments = Math.ceil((this.player.torchFuelMs / TUNING.torchFuelMs) * 5);
      this.torchText.setText(this.player.torchLit ? `FLAME  ${'▰'.repeat(segments)}${'▱'.repeat(5 - segments)}` : 'FLAME  OUT');
    }
    const stair = this.nearestStair();
    this.interactText.setText(
      this.player.shieldTutorialPrompt && !shieldActive
        ? STRINGS.shieldTutorialPrompt
        : (stair ? STRINGS.stairHint : ''),
    );
    if (this.currentWingId === 3) this.wingLabel.setText(`THE LAST GALLERY · FLOOR ${this.activeFloor === 0 ? 'I' : 'II'}`);
  }

  // Fog-of-war: opaque black overlay, punched through with a soft glow
  // around the player and around each nearby static torch. Screen-space
  // (scrollFactor 0), redrawn every frame from the current camera scroll.
  renderFog() {
    const cam = this.cameras.main;
    this.fogRT.clear();
    this.fogRT.fill(PAL.fog, 1);

    // erase(key, x, y) draws the (top-left-anchored) mask frame in ERASE
    // blend mode, punching a soft, transparent hole through the opaque fill
    // above — the standard Phaser fog-of-war technique.
    const stampAt = (wx, wy, radius, maskKey) => {
      const sx = wx - cam.scrollX;
      const sy = wy - cam.scrollY;
      if (sx < -radius || sy < -radius || sx > VIEW.w + radius || sy > VIEW.h + radius) return;
      this.fogRT.erase(maskKey, sx - radius, sy - radius);
    };

    for (const t of this.torchSprites ?? []) {
      if (t.sconce.visible) stampAt(t.x, t.y, TUNING.torchRadius, this.torchMask);
    }
    if (this.currentWingId === 0) {
      stampAt(this.playerSprite.x, this.playerSprite.y, TUNING.flashlightRadius, this.flashlightMask);
    } else if (this.player.torchLit) {
      stampAt(this.playerSprite.x, this.playerSprite.y, TUNING.carriedTorchRadius, this.carriedTorchMask);
    } else {
      stampAt(this.playerSprite.x, this.playerSprite.y, TUNING.darkVisionRadius, this.darkVisionMask);
    }
  }

  renderToText() {
    return {
      chapter: 'chapter05-museum-labyrinth',
      state: this.state,
      lives: this.player?.lives,
      keys: this.player?.keysCollected,
      keysTotal: TUNING.keysTotal,
      shields: this.player?.shieldCharges,
      shield: this.player ? {
        active: this.time.now < this.player.shieldActiveUntil,
        tutorialPending: this.player.shieldTutorialPending,
        tutorialPrompt: this.player.shieldTutorialPrompt,
      } : null,
      wing: this.currentWingId,
      highestWingReached: this.highestWingReached,
      floor: this.activeFloor,
      player: this.playerSprite ? { x: Math.round(this.playerSprite.x), y: Math.round(this.playerSprite.y), facing: this.player.facing } : null,
      torch: this.player ? { lit: this.player.torchLit, fuelMs: Math.round(this.player.torchFuelMs) } : null,
      nearStair: Boolean(this.nearestStair()),
      movingMaze: {
        state: this.movingMazeState,
        warning: this.movingMazeWarning,
        nextInMs: this.movingMazeNextAt ? Math.max(0, Math.round(this.movingMazeNextAt - this.time.now)) : null,
      },
      gatesLocked: this.layout?.gates.map((g) => g.locked),
      chasing: chaseMusic.isChasing(),
      primaryHunterId: this.primaryHunterId,
      damagingHunters: this.statues?.filter((statue) => statue.canDamage).map((statue) => statue.id),
      hunterReliefMs: Math.max(0, Math.round(Math.max(this.wingEntryGraceUntil, this.hunterReliefUntil) - this.time.now)),
      artifactReady: this.artifactReady,
      artifactTaken: this.artifactTaken,
      statues: this.statues?.map((s) => s.state),
    };
  }
}
