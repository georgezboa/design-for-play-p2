import Phaser from 'phaser';
import { createSaveStore } from '../shell/saveSystem.js';
import { CINEMATICS, playCinematic } from '../shell/gameFlow.js';
import {
  GAME_W,
  GAME_H,
  WORLD_W,
  LANES,
  LANE_FAR,
  LANE_NEAR,
  SPRING_VELOCITY,
  BACKDROP,
} from '../constants.js';
import {
  DEV_MODE,
  devParams,
  resolveChapterSpawn,
  resolveDevChapterIndex,
} from '../devMode.js';
import { LEVEL } from '../level.js';
import { PAL } from '../palette.js';
import Player from '../Player.js';
import { sfx } from '../sfx.js';
import { music } from '../shared/musicDirector.js';
import { NPC_DIALOGUES, STORY_WORLDS } from '../story.js';
import TutorialCarArt from '../art/tutorialCarArt.js';
import TutorialTrainRoomsArt from '../art/tutorialTrainRoomsArt.js';
import { RETRO_TRANSIT_CSS } from '../art/retroTransitTheme.js';
import TimetablePuzzle from '../tutorial/TimetablePuzzle.js';
import PrologueNarrativeProps from '../prologueNarrativeProps.js';
import {
  createPersistentUnderfloorState,
  createUnderfloorHintState,
  gateTutorialLaneInput,
  resolveUnderfloorLookDown,
  stageUsesPersistentUnderfloorView,
  updatePersistentUnderfloorState,
  updateUnderfloorHint as stepUnderfloorHint,
} from '../tutorial/underfloorView.js';
import {
  getWorldAsset,
  isWorldAssetLoaded,
  resolvePreviewWorldIndex,
  WorldAssetLoader,
} from '../worlds/worldAssets.js';

// Surfaces that get an explicit moonlit lip; the rest read as flat silhouettes.
const RIMMED = new Set(['ground', 'platform', 'bridge']);
const PROLOGUE_SCORE = {
  undertow: 'assets/music/ch1/1.1_train_undertow.mp3',
  resonance: 'assets/music/ch1/1.2_train_resonance.mp3',
};

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create(data = {}) {
    this.finished = false;
    this.activeInteractable = null;
    this.activeNPC = null;
    this.bridgePlanks = [];
    this.interactables = [];
    this.npcs = [];
    this.dialogueState = null;
    this.activeWorldIndex = -1;
    this.requestedWorldIndex = -1;
    this.previewWorldIndex = resolvePreviewWorldIndex(STORY_WORLDS);
    const requestedStartWorld = Number.isInteger(data.startWorldIndex)
      && data.startWorldIndex >= 0
      && data.startWorldIndex < STORY_WORLDS.length
      ? data.startWorldIndex
      : null;
    // `?chapter=N` is the chapter select's route. Unlike `?world=N` — which
    // only swaps the painting and then freezes the world index — this one
    // starts the player inside that chapter's geometry and leaves normal world
    // streaming switched on, so walking onward behaves like a real run.
    this.devChapterIndex = resolveDevChapterIndex(STORY_WORLDS);
    this.initialWorldIndex =
      requestedStartWorld ?? this.previewWorldIndex ?? this.devChapterIndex ?? 0;
    this.devSpawn =
      requestedStartWorld === null
        && this.devChapterIndex !== null
        && this.devChapterIndex > 0
        ? resolveChapterSpawn(
            STORY_WORLDS,
            this.devChapterIndex,
            LEVEL.solids,
            LANE_NEAR,
            LEVEL.spawn.y,
          )
        : null;
    this.skipPrologue = requestedStartWorld !== null || this.devSpawn !== null;
    this.worldAssetLoader = new WorldAssetLoader(this);
    this.backdropChunks = [];
    this.checkpointTaken = false;
    this.finalReminderShown = false;
    this.tutorialExitBlockedNotified = false;
    this.prologueTransitionActive = false;
    this.prologueScoreReleased = false;
    this.departureScroll = 0;
    this.hitstopRestoreTimer = null;
    this.persistentUnderfloorState = createPersistentUnderfloorState();
    this.tutorialPuzzle = {
      phase: 'idle',
      briefed: false,
      frames: [],
      recordStartedAt: 0,
      playbackStartedAt: 0,
      playbackCursor: 0,
      pastActive: false,
      presentActive: false,
      serviceActive: false,
      routeActive: false,
      poweredSegments: 0,
      breakerActive: false,
      syncAligned: [false, false],
      recordVisited: [false, false],
      syncHotIndex: -1,
      syncHoldStartedAt: 0,
      playbackLeadUntil: 0,
      gateAnimating: LEVEL.tutorialPuzzle.stages.map(() => false),
      relayStates: Object.fromEntries(
        LEVEL.tutorialPuzzle.stages
          .flatMap((stage) => stage.relays ?? [])
          .map((relay) => [relay.id, relay.initial]),
      ),
      stageIndex: 0,
      stageComplete: LEVEL.tutorialPuzzle.stages.map(() => false),
      faultUntil: 0,
      anomalyActive: false,
      queue: [],
      executionStep: -1,
      activeCommand: null,
      manualUntil: 0,
      echoRecorded: false,
      echoSyncIndex: -1,
      echoWindowUntil: 0,
      echoVented: false,
      // Section V: analogue line pressure, driven by how long VENT is held.
      pressure: 100,
      pressureVenting: false,
      pressureBraked: false,
      pressureSettled: false,
      // Section VI: which echo gates the player has cleared from above.
      echoGateIndex: 0,
      echoGatesCleared: [],
      echoAtValve: false,
    };

    this.registry.set('score', 0);
    this.registry.set('coins', 0);
    this.registry.set('memory', 0);
    this.registry.set('witnesses', 0);
    this.registry.set('finalChoice', null);
    this.registry.set('lives', 3);
    this.registry.set('lane', LANE_NEAR);
    this.registry.set('tutorialPowerState', 'off');
    // Starting inside a later chapter means the Prologue already happened.
    // Without this the exit gate would trap a dev warp the moment it walked
    // back toward car 01.
    this.registry.set('tutorialPowerRestored', this.skipPrologue);

    this.physics.world.setBounds(0, -600, WORLD_W, 2200);
    this.cameras.main.setBounds(0, 0, WORLD_W, GAME_H);

    this.buildBackground();
    this.tutorialCarArt = new TutorialCarArt(this);
    this.tutorialCarArt.setVisible(false);
    this.tutorialTrainRoomsArt = new TutorialTrainRoomsArt(this, LEVEL.tutorialPuzzle.stages);
    this.tutorialTrainRoomsArt.setVisible(this.activeWorldIndex === 0);

    this.solids = this.physics.add.staticGroup();
    this.coins = this.physics.add.group({ allowGravity: false, immovable: true });
    this.enemies = this.physics.add.group();

    this.buildDecor();
    this.buildSolids();
    this.buildBridge();
    this.buildCoins();
    this.buildEnemies();
    this.buildInteractables();
    this.buildNPCs();
    this.buildTutorialPuzzleProps();
    this.buildMarkers();
    this.buildOverlays();
    this.buildUnderfloorHint();
    this.buildHintBar();
    this.narrativeProps = new PrologueNarrativeProps(this);
    this.narrativeProps.build();

    this.solids.refresh();

    const sceneSpawn = requestedStartWorld !== null
      ? {
          x: Number.isFinite(data.spawnX)
            ? data.spawnX
            : STORY_WORLDS[requestedStartWorld].startX + 24,
          y: Number.isFinite(data.spawnY) ? data.spawnY : LEVEL.spawn.y,
          lane: data.spawnLane ?? LEVEL.spawn.lane,
        }
      : this.devSpawn ?? LEVEL.spawn;
    this.player = new Player(this, sceneSpawn.x, sceneSpawn.y, sceneSpawn.lane);
    this.checkpoint = { ...sceneSpawn };
    if (this.skipPrologue) {
      // A warp past the Prologue must not leave its junctions reading as
      // unsolved, or the objective arrow and the stage gates come along.
      this.tutorialPuzzle.stageIndex = LEVEL.tutorialPuzzle.stages.length - 1;
      this.tutorialPuzzle.stageComplete = LEVEL.tutorialPuzzle.stages.map(() => true);
      this.tutorialPuzzle.briefed = true;
    }

    // A single collider for every solid in the level; the process callback is
    // what enforces lane separation, so the player simply cannot touch
    // geometry that belongs to the other depth lane.
    this.physics.add.collider(
      this.player,
      this.solids,
      this.onSolidHit,
      (p, s) => s.laneId === p.lane && s.body.enable && !p.transiting,
      this,
    );
    this.physics.add.collider(
      this.enemies,
      this.solids,
      null,
      (e, s) => s.laneId === e.laneId && s.body.enable,
      this,
    );
    this.physics.add.overlap(
      this.player,
      this.coins,
      this.onCoin,
      (p, c) => c.laneId === p.lane && c.active,
      this,
    );
    this.physics.add.overlap(
      this.player,
      this.enemies,
      this.onEnemy,
      (p, e) => e.laneId === p.lane && e.active && !p.transiting,
      this,
    );

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(180, 140);
    this.setTutorialCameraMode(this.activeWorldIndex);

    this.setupInput();
    this.setupTutorialQA();
    this.refreshPrologueScore();

    this.physics.world.createDebugGraphic();
    this.physics.world.drawDebug = false;
    this.physics.world.debugGraphic.setVisible(false).setDepth(90);

    if (!this.scene.isActive('Hud')) this.scene.launch('Hud');
    else this.game.events.emit('hud:reset');
    this.time.delayedCall(80, () => {
      if (!this.tutorialQAActive) {
        this.game.events.emit('hud:world', STORY_WORLDS[this.initialWorldIndex]);
      }
    });
    this.events.once('shutdown', () => {
      this.clearHitstop();
      sfx.setPrologueAmbient(false);
      this.worldAssetLoader.destroy();
      this.tutorialCarArt?.destroy();
      this.tutorialTrainRoomsArt?.destroy();
      this.timetablePuzzle?.destroy();
      this.narrativeProps?.destroy();
    });
  }

  // ------------------------------------------------------------- level build

  buildBackground() {
    const layer = (y, h, tex, depth) =>
      this.add.tileSprite(0, y, GAME_W, h, tex).setOrigin(0).setScrollFactor(0).setDepth(depth);

    // Base fill. The backdrop covers the frame, but this guarantees no gap if
    // the painting is ever swapped for one with a different aspect ratio.
    this.bgSky = layer(0, GAME_H, 'sky', 0);

    this.buildBackdrop();

    // Drifting mist, kept in front of the painting so the city breathes.
    this.fogHigh = layer(96, 200, 'fog', 2);
    this.fogHigh.setAlpha(0.35);
    this.fogLow = layer(210, 200, 'fog', 6);
    this.fogLow.setAlpha(0.3);

    // Wash over the far lane so distance keeps reading as distance.
    this.haze = this.add
      .rectangle(0, 0, GAME_W, 400, 0x59647a)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(12)
      .setAlpha(0.05);

    // Mist rolling through the gap between the lanes. Kept BELOW the far
    // lane's surface (290) on purpose — sitting over its face washed it
    // lighter than the city behind it and flattened the whole depth ramp.
    this.fogDrift = layer(384, 108, 'fog', 13);
    this.fogDrift.setAlpha(0.22);

    // No inter-lane treeline any more: the painting's own lamplit street shows
    // through the gap between the lanes and reads far better than a drawn band.
    this.foreground = layer(GAME_H - 74, 84, 'foreground', 45);
    this.foregroundBaseAlpha = this.foreground.alpha;

    // Ash drifting across the whole frame, pinned to the camera.
    this.ash = this.add.particles(0, 0, 'mote', {
      x: { min: -20, max: GAME_W + 20 },
      y: { min: -30, max: GAME_H * 0.75 },
      lifespan: { min: 6000, max: 13000 },
      speedX: { min: -16, max: 16 },
      speedY: { min: 5, max: 24 },
      scale: { min: 0.25, max: 1.0 },
      alpha: { start: 0.4, end: 0 },
      frequency: 180,
      quantity: 1,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.ash.setScrollFactor(0).setDepth(48);

    this.vignette = this.add
      .image(0, 0, 'vignette')
      .setOrigin(0)
      .setDisplaySize(GAME_W, GAME_H)
      .setScrollFactor(0)
      .setDepth(70)
      .setAlpha(0.86);
    this.vignetteBaseAlpha = 0.86;
  }

  /** Build the current panorama from GPU-safe horizontal texture chunks. */
  buildBackdrop() {
    this.applyBackdropWorld(this.initialWorldIndex, false);
    this.prefetchBackdropNeighbors(this.initialWorldIndex);
  }

  switchWorld(index, announce = true) {
    const world = STORY_WORLDS[index];
    if (!world || (index === this.activeWorldIndex && !announce)) return;
    this.requestedWorldIndex = index;

    if (isWorldAssetLoaded(this, world.texture)) {
      this.applyBackdropWorld(index, announce);
      return;
    }

    this.worldAssetLoader
      .load(world.texture)
      .then(() => {
        if (this.requestedWorldIndex === index) this.applyBackdropWorld(index, announce);
      })
      .catch((error) => console.error(error));
  }

  applyBackdropWorld(index, announce) {
    const world = STORY_WORLDS[index];
    const asset = getWorldAsset(world.texture);
    const scale = BACKDROP.height / asset.sourceHeight;
    const w = asset.sourceWidth * scale;
    const h = asset.sourceHeight * scale;
    const travel = Math.max(1, WORLD_W - GAME_W);
    // Keep the existing framing behavior. The chunk pipeline changes texture
    // safety and loading cost, not the authored parallax or gameplay.
    const factor = Phaser.Math.Clamp((w - GAME_W) / travel, 0, 1);
    const y = BACKDROP.horizonY - BACKDROP.horizonFrac * h + (world.backdropOffsetY ?? 0);
    const xOffset = world.backdropOffsetX ?? 0;

    this.backdropChunks.forEach((chunk) => chunk.destroy());
    this.backdropChunks = asset.chunks.map((chunk) => {
      const image = this.add
        .image(chunk.x * scale, y, chunk.textureKey)
        .setOrigin(0, 0)
        .setScale(scale)
        .setScrollFactor(factor, 0)
        .setDepth(1)
        .setTint(BACKDROP.tint);
      image.x += xOffset;
      image.backdropBaseX = image.x;
      return image;
    });
    this.backdrop = this.backdropChunks[0];
    this.activeWorldIndex = index;
    this.requestedWorldIndex = index;
    sfx.setPrologueAmbient(index === 0);
    this.tutorialCarArt?.setVisible(false);
    this.tutorialTrainRoomsArt?.setVisible(index === 0);
    this.setTutorialPuzzleVisible(index === 0);
    this.setTutorialCameraMode(index);
    this.refreshPrologueScore();

    if (announce) {
      this.game.events.emit('hud:world', world);
      // The scenery changes like a page being replaced, never like an attack.
      this.backdropChunks.forEach((chunk) => chunk.setAlpha(0.42));
      this.tweens.add({
        targets: this.backdropChunks,
        alpha: 1,
        duration: 1800,
        ease: 'Sine.easeInOut',
      });
    }

    this.prefetchBackdropNeighbors(index);
  }

  prefetchBackdropNeighbors(index) {
    const nearby = [index - 1, index, index + 1]
      .filter((candidate) => candidate >= 0 && candidate < STORY_WORLDS.length)
      .map((candidate) => STORY_WORLDS[candidate].texture);
    // World zero remains resident so an ordinary GameScene restart never has
    // to wait for an async background before create() can finish.
    const keep = [STORY_WORLDS[0].texture, ...nearby];
    this.worldAssetLoader.releaseExcept(keep);
    nearby.forEach((texture) => {
      if (!isWorldAssetLoaded(this, texture)) {
        this.worldAssetLoader.load(texture).catch((error) => console.error(error));
      }
    });
  }

  /** Additive light. Never lane-tinted, so it survives a near-black lane. */
  addLight(x, y, radius, color, alpha, depth) {
    return this.add
      .image(x, y, 'glow')
      .setDepth(depth)
      .setScale(radius / 64)
      .setTint(color)
      .setAlpha(alpha)
      .setBlendMode(Phaser.BlendModes.ADD);
  }

  pulseTutorialDevice(sprite, color = 0x75d4cd) {
    if (!sprite) return;
    const baseScaleX = sprite.scaleX;
    const baseScaleY = sprite.scaleY;
    const halo = this.addLight(sprite.x, sprite.y - sprite.displayHeight * 0.48, 42, color, 0.48, 63);
    this.cameras.main.shake(90, 0.0018);
    this.tweens.add({
      targets: sprite,
      scaleX: baseScaleX * 0.86,
      scaleY: baseScaleY * 0.86,
      duration: 65,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => sprite.setScale(baseScaleX, baseScaleY),
    });
    this.tweens.add({
      targets: halo,
      alpha: 0,
      scale: halo.scale * 1.55,
      duration: 260,
      ease: 'Quad.easeOut',
      onComplete: () => halo.destroy(),
    });
  }

  buildDecor() {
    LEVEL.decor.forEach((d) => {
      const lane = LANES[d.lane];
      const count = d.repeat || 1;

      for (let i = 0; i < count; i++) {
        const tex = this.textures.get(d.tex).getSourceImage();
        const w = tex.width * lane.scale;
        const x = d.x + i * (w - 1);

        const spr = this.add
          .image(x, lane.baseY + 2, d.tex)
          .setOrigin(0.5, 1)
          .setScale(lane.scale)
          .setTint(lane.tint)
          .setDepth(lane.depth - 1); // behind the terrain it stands on

        if (d.light) {
          const lampY = spr.y - spr.displayHeight + 26 * lane.scale;
          // Keep gaslights intimate. Oversized circular bloom made the scene
          // look like it had random UI effects hovering over the playfield.
          const halo = this.addLight(x + 3 * lane.scale, lampY, 30 * lane.scale, PAL.lamp, 0.28 * d.light, lane.depth + 3);
          this.tweens.add({
            targets: halo,
            alpha: { from: 0.28 * d.light, to: 0.18 * d.light },
            duration: 1400 + ((i * 137) % 900),
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });
        }
      }
    });
  }

  addSolid(def) {
    const lane = LANES[def.lane];
    // Ground bands tile plain dirt and get a decorative grass cap laid on top,
    // otherwise a 140px band would repeat the grass line four times.
    const tex = def.kind === 'ground' ? 'terrain-body' : def.tex || 'stone';
    const ts = this.add.tileSprite(def.x, def.y, def.w, def.h, tex).setOrigin(0, 0);
    ts.setDepth(lane.depth);
    ts.setTint(lane.tint);

    if (def.kind === 'ground') {
      const capH = Math.round(12 * lane.scale);
      const cap = this.add
        .tileSprite(def.x, def.y, def.w, capH, 'terrain-cap')
        .setOrigin(0, 0)
        .setDepth(lane.depth + 0.5)
        .setTint(lane.tint);
      if (def.lane === LANE_FAR) cap.setTileScale(lane.scale, lane.scale);
    }

    // The carved sigil has to be its own additive sprite — a tint dark enough
    // to make the block a silhouette would extinguish anything drawn into it.
    if (def.kind === 'question') {
      ts.runeGlow = this.addLight(
        def.x + def.w / 2,
        def.y + def.h / 2,
        22 * lane.scale,
        PAL.rune,
        0.26,
        lane.depth + 2,
      );
      this.tweens.add({
        targets: ts.runeGlow,
        alpha: { from: 0.26, to: 0.13 },
        duration: 1250,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
    if (RIMMED.has(def.kind)) {
      ts.rim = this.add
        .rectangle(def.x, def.y, def.w, 2, lane.rim)
        .setOrigin(0, 0)
        .setDepth(lane.depth + 0.6);
    }

    ts.laneId = def.lane;
    ts.kind = def.kind;
    ts.used = false;

    if (def.lane === LANE_FAR) {
      // Shrinking the *texture* inside the tile keeps collision honest while
      // making the far lane's masonry read as further away.
      ts.setTileScale(lane.scale, lane.scale);
      ts.setTint(lane.tint);
    }

    this.solids.add(ts);
    return ts;
  }

  buildSolids() {
    LEVEL.solids.forEach((def) => this.addSolid(def));
  }

  buildBridge() {
    const b = LEVEL.bridge;
    b.planks.forEach((p) => {
      const plank = this.addSolid({
        lane: b.lane,
        x: p.x,
        y: b.y,
        w: p.w,
        h: b.h,
        tex: b.tex,
        kind: 'bridge',
      });
      plank.body.enable = false;
      plank.setVisible(false);
      if (plank.rim) plank.rim.setVisible(false);
      this.bridgePlanks.push(plank);
    });
  }

  buildCoins() {
    LEVEL.coins.forEach((def) => {
      const lane = LANES[def.lane];
      const c = this.coins.create(def.x, def.y, 'echo');
      c.laneId = def.lane;
      c.value = def.value || 1;
      c.setDepth(lane.depth + 2);
      c.setScale(lane.scale);
      c.body.setAllowGravity(false);
      // Blood echoes are light, not matter — additive and never lane-tinted.
      c.setBlendMode(Phaser.BlendModes.ADD);
      c.setAlpha(def.lane === LANE_FAR ? 0.75 : 1);

      this.tweens.add({
        targets: c,
        scaleX: lane.scale * 0.22,
        duration: 520,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });
  }

  buildEnemies() {
    LEVEL.enemies.forEach((def) => {
      const lane = LANES[def.lane];
      const e = this.enemies.create(def.x, lane.baseY - 70, 'enemy');
      e.laneId = def.lane;
      e.minX = def.min;
      e.maxX = def.max;
      e.dir = -1;
      e.setDepth(lane.depth + 1);
      e.setScale(lane.scale * 1.2);
      e.setTint(lane.figureTint);
      e.body.setBounce(0, 0);
    });
  }

  buildNPCs() {
    LEVEL.npcs.forEach((def) => {
      const story = NPC_DIALOGUES[def.id];
      const lane = LANES[def.lane];
      const isConductor = def.id === 'caretaker';
      const texture = isConductor ? 'conductor-idle-0' : 'npc';
      const sprite = this.add
        .sprite(def.x, lane.baseY + 2, texture)
        .setOrigin(0.5, 1)
        .setDepth(lane.depth + 1)
        .setScale(lane.scale * 0.92)
        .setTint(story.tint);
      if (isConductor) sprite.play('conductor-idle');

      // A label is only shown while the player is close. Keeping names out of
      // the opening frame lets the silhouettes feel like part of the place
      // before they become people.
      const label = this.add
        .text(def.x, lane.baseY - sprite.displayHeight - 12, story.name, {
          fontFamily: 'ui-monospace, Menlo, monospace',
          fontSize: '10px',
          color: '#bcc8d2',
          letterSpacing: 1,
          backgroundColor: '#07090d',
          padding: { x: 5, y: 3 },
        })
        .setOrigin(0.5, 1)
        .setDepth(60)
        .setAlpha(0);

      this.npcs.push({ def, story, sprite, label, talked: 0 });
    });
  }

  buildInteractables() {
    LEVEL.interactables.forEach((def) => {
      const lane = LANES[def.lane];
      const textureByKind = {
        lever: 'lever-off',
        breaker: 'lever-off',
        recorder: 'echo-recorder-idle',
        generator: 'hand-generator-off',
        'timetable-command': 'circuit-relay-0',
        'rail-control': 'lever-off',
        'timetable-press': 'circuit-relay-0',
        'drum-machine': 'lever-off',
        'timetable-reset': 'lever-off',
        'timetable-run': 'hand-generator-off',
      };
      const tex =
        // Section III's two machines must not share a silhouette: a floor
        // isolator lever and a wall bleed wheel. Falling through to 'sign'
        // would have made both read as signposts.
        def.kind === 'air-lock'
          ? def.command === 'bleed'
            ? 'circuit-relay-0'
            : 'lever-off'
        // Phase IV's four devices: the drain cock and test stand read as
        // machinery, the levelling valve as a lever. The trolley's own sprite
        // stays invisible — the underfloor counterweight rectangle drawn by
        // TimetablePuzzle is its body, and this def only exists so the
        // proximity pick can find the moving target.
        : def.kind === 'weight-transfer'
          ? def.command === 'level-drain'
            ? 'circuit-relay-0'
            : def.command === 'test'
              ? 'hand-generator-off'
              : 'lever-off'
        // Phase V's five devices: the shared TEST stand reads as machinery,
        // the bleed wheel as a valve, the cutout cock, service pin bracket
        // and actuator access as levers of different jobs.
        : def.kind === 'bogie-service'
          ? def.command === 'test'
            ? 'hand-generator-off'
            : def.command === 'brake-vent'
              ? 'circuit-relay-0'
              : 'lever-off'
        // Phase VI's single device: the departure test stand reads as the
        // same machinery the player already energized in IV and V.
        : def.kind === 'echo-load'
          ? 'hand-generator-off'
        : def.kind === 'rail-control'
          ? def.command === 'power'
            ? 'hand-generator-off'
            : def.command === 'vent'
              ? 'circuit-relay-0'
              : 'lever-off'
        : def.kind === 'relay'
          ? `circuit-relay-${this.tutorialPuzzle.relayStates[def.id]}`
          : textureByKind[def.kind] || 'sign';
      const sprite = this.add
        .sprite(def.x, lane.baseY, tex)
        .setOrigin(0.5, 1)
        .setDepth(lane.depth + 1)
        .setScale(lane.scale)
        .setTint(lane.figureTint);
      this.interactables.push({ def, sprite, fired: false });
    });

    this.prompt = this.add
      .text(0, 0, '[E]', {
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: '15px',
        color: RETRO_TRANSIT_CSS.charcoalDeep,
        backgroundColor: RETRO_TRANSIT_CSS.ivory,
        stroke: RETRO_TRANSIT_CSS.orangeShadow,
        strokeThickness: 1,
        padding: { x: 7, y: 4 },
      })
      .setOrigin(0.5, 1)
      .setDepth(64)
      .setVisible(false);
  }

  buildTutorialPuzzleProps() {
    const config = LEVEL.tutorialPuzzle;
    if (config.mode === 'timetable') {
      this.timetablePuzzle = new TimetablePuzzle(this, config);
      this.timetablePuzzle.build();
      return;
    }
    const stages = config.stages;
    const lane = LANES[LANE_NEAR];
    this.tutorialPressures = stages.map((stage) =>
      this.add
        .sprite(stage.plateX, lane.baseY + 1, 'pressure-pad-off')
        .setOrigin(0.5, 1)
        .setDepth(lane.depth + 2)
        .setTint(lane.figureTint),
    );

    this.echoSprite = this.add
      .sprite(stages[0].recorderX, lane.baseY, 'player-idle-0')
      .setOrigin(0.5, 1)
      .setDepth(lane.depth + 3)
      .setTint(0x75d4cd)
      .setAlpha(0.2)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setVisible(false);
    this.echoReflection = this.add
      .sprite(stages[0].recorderX, 320, 'player-idle-0')
      .setOrigin(0.5, 1)
      .setDepth(26)
      .setScale(0.86)
      .setTint(0x9ce8e2)
      .setAlpha(0.58)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setVisible(false);

    const labelStyle = {
      fontFamily: 'ui-monospace, Menlo, monospace',
      fontSize: '9px',
      color: '#71828a',
      backgroundColor: '#071016',
      padding: { x: 4, y: 2 },
    };
    this.tutorialDeviceLabels = stages.flatMap((stage) => [
      this.add.text(stage.recorderX, 380, 'MEMORY RECORDER', labelStyle),
      this.add.text(stage.plateX, 432, 'PAST', labelStyle),
      ...stage.relays.map((relay, index) =>
        this.add.text(relay.x, 408, `ROUTER ${String.fromCharCode(65 + index)}`, labelStyle),
      ),
      this.add.text(stage.generatorX, 380, 'PRESENT', labelStyle),
    ]).map((label) => label.setOrigin(0.5).setDepth(58));

    this.tutorialStageSigns = stages.map((stage, index) =>
      this.add
        .text(stage.startX + 32, 310, stage.title, {
          ...labelStyle,
          fontSize: '11px',
          color: index === 0 ? '#f2d49a' : '#71828a',
          padding: { x: 8, y: 5 },
        })
        .setDepth(58),
    );

    this.tutorialGates = stages.map((stage, index) => {
      const gate = this.add
        .rectangle(stage.endX, 246, 22, 216, 0x1c2830, 0.96)
        .setOrigin(0.5, 0)
        .setDepth(44)
        .setStrokeStyle(2, index === stages.length - 1 ? 0xcaa66b : 0xe45a5f, 0.8);
      const light = this.add
        .circle(stage.endX, 274, 5, 0xe45a5f, 1)
        .setDepth(59)
        .setBlendMode(Phaser.BlendModes.ADD);
      return { gate, light };
    });

    this.tutorialRouteGraphics = this.add.graphics().setDepth(56);
    this.tutorialRoutePulse = this.add
      .circle(stages[0].plateX, 507, 4, 0x75d4cd, 1)
      .setDepth(57)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setVisible(false);

    this.tutorialGuideGraphics = this.add.graphics().setDepth(55);
    stages.forEach((stage, index) => {
      const guideStart = index === 0 ? 125 : stage.startX + 34;
      const guideTarget = stage.underfloor ? stage.syncNodes.at(-1).x : stage.plateX;
      this.tutorialGuideGraphics.lineStyle(2, 0xcaa66b, 0.26);
      this.tutorialGuideGraphics.lineBetween(guideStart, 447, guideTarget, 447);
      for (let x = guideStart + 42; x < guideTarget - 12; x += 48) {
        this.tutorialGuideGraphics.fillStyle(0xe5c98f, 0.34);
        this.tutorialGuideGraphics.fillTriangle(x, 442, x + 9, 447, x, 452);
      }
    });

    // The first room teaches through a silent tableau: one remembered body on
    // PAST, one present body at the generator, and a pulse between them.
    this.tutorialDemoEcho = this.add
      .sprite(stages[0].plateX, lane.baseY, 'player-idle-0')
      .setOrigin(0.5, 1)
      .setDepth(lane.depth + 1)
      .setTint(0x75d4cd)
      .setAlpha(0.18)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tutorialDemoPresent = this.add
      .sprite(stages[0].generatorX - 34, lane.baseY, 'player-idle-0')
      .setOrigin(0.5, 1)
      .setDepth(lane.depth + 1)
      .setTint(0xcaa66b)
      .setAlpha(0.11);
    this.tutorialDemoPulse = this.add
      .circle(stages[0].plateX, 507, 3, 0x75d4cd, 0.72)
      .setDepth(57)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: this.tutorialDemoPulse,
      x: stages[0].generatorX - 26,
      duration: 1700,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const underfloorStage = stages.find((stage) => stage.underfloor);
    this.tutorialUnderfloorGraphics = this.add.graphics().setDepth(53);
    this.tutorialUnderfloorGraphics.fillStyle(0x071016, 0.98);
    this.tutorialUnderfloorGraphics.fillRoundedRect(
      underfloorStage.startX - 20,
      505,
      underfloorStage.endX - underfloorStage.startX + 40,
      390,
      18,
    );
    this.tutorialUnderfloorGraphics.lineStyle(3, 0x52636b, 0.7);
    this.tutorialUnderfloorGraphics.strokeRoundedRect(
      underfloorStage.startX - 20,
      505,
      underfloorStage.endX - underfloorStage.startX + 40,
      390,
      18,
    );
    // Dense service architecture: power buses, hanging cable bundles, fuses,
    // and transformer coils. It should read as a second world, not empty void.
    this.tutorialUnderfloorGraphics.lineStyle(5, 0x243943, 0.92);
    [570, 620, 835].forEach((y) =>
      this.tutorialUnderfloorGraphics.lineBetween(
        underfloorStage.startX + 20,
        y,
        underfloorStage.endX - 20,
        y,
      ),
    );
    this.tutorialUnderfloorGraphics.lineStyle(2, 0xcaa66b, 0.42);
    for (let x = underfloorStage.startX + 40; x < underfloorStage.endX; x += 76) {
      this.tutorialUnderfloorGraphics.lineBetween(x, 525, x - 32, 875);
      this.tutorialUnderfloorGraphics.strokeCircle(x + 18, 655, 12);
      this.tutorialUnderfloorGraphics.strokeCircle(x + 18, 655, 7);
      this.tutorialUnderfloorGraphics.fillStyle(0x52636b, 0.5);
      this.tutorialUnderfloorGraphics.fillRect(x - 16, 790, 30, 18);
    }
    this.tutorialUnderfloorLabel = this.add
      .text(underfloorStage.startX + 44, 528, '▼', {
        ...labelStyle,
        fontSize: '20px',
        color: '#f2d49a',
        padding: { x: 7, y: 2 },
      })
      .setDepth(58);

    this.tutorialSyncColumns = (underfloorStage.syncNodes ?? []).map((node, index) => {
      const beam = this.add
        .rectangle(node.x, 610, 5, 310, 0x52636b, 0.16)
        .setOrigin(0.5)
        .setDepth(54);
      const upper = this.add
        .ellipse(node.x, 454, 72, 12, 0x52636b, 0.74)
        .setDepth(58)
        .setStrokeStyle(2, 0xcaa66b, 0.52);
      const lower = this.add
        .ellipse(node.x, 760, 88, 16, 0x182a32, 0.95)
        .setDepth(58)
        .setStrokeStyle(3, 0x52636b, 0.8);
      const lamp = this.add
        .circle(node.x, 420, 7, 0x52636b, 0.82)
        .setDepth(60)
        .setBlendMode(Phaser.BlendModes.ADD);
      const indexMarks = this.add
        .text(node.x, 800, index === 0 ? 'I' : 'II', {
          fontFamily: 'ui-monospace, Menlo, monospace',
          fontSize: '12px',
          color: '#71828a',
        })
        .setOrigin(0.5)
        .setDepth(59);
      return { node, beam, upper, lower, lamp, indexMarks };
    });

    this.tutorialObjectiveArrow = this.add
      .text(125, 330, '▼', {
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: '20px',
        color: '#f2d49a',
      })
      .setOrigin(0.5)
      .setDepth(61);
    this.tutorialObjectiveLabel = this.add
      .text(125, 348, 'SPEAK', {
        ...labelStyle,
        color: '#f2d49a',
      })
      .setOrigin(0.5)
      .setDepth(61);
    this.tweens.add({
      targets: this.tutorialObjectiveArrow,
      y: 336,
      duration: 620,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.echoTimelineBg = this.add
      .rectangle(370, 194, 220, 6, 0x17232b, 0.95)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(58)
      .setVisible(false);
    this.echoTimelineFill = this.add
      .rectangle(370, 194, 220, 4, 0xe45a5f, 1)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(59)
      .setVisible(false);
    this.echoTimelineLabel = this.add
      .text(480, 178, '', labelStyle)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(59)
      .setVisible(false);

    this.refreshTutorialRouteState();
    this.setTutorialPuzzleVisible(this.activeWorldIndex === 0);
  }

  setTutorialPuzzleVisible(visible) {
    if (LEVEL.tutorialPuzzle.mode === 'timetable') {
      this.tutorialWorldVisible = visible;
      this.timetablePuzzle?.setVisible(visible);
      this.narrativeProps?.setVisible(visible);
      this.hintBar?.setVisible(visible);
      return;
    }
    this.tutorialWorldVisible = visible;
    this.interactables
      ?.filter((it) => ['recorder', 'relay', 'breaker', 'generator'].includes(it.def.kind))
      .forEach((it) => it.sprite.setVisible(visible));
    this.tutorialPressures?.forEach((pressure, index) =>
      pressure.setVisible(visible && !LEVEL.tutorialPuzzle.stages[index].underfloor),
    );
    // Interaction prompts and the live circuit carry the teaching load. The
    // old permanent labels made the car read like a debug screen.
    this.tutorialDeviceLabels?.forEach((label) => label.setVisible(false));
    this.tutorialStageSigns?.forEach((label, index) =>
      label.setVisible(visible && index === this.tutorialPuzzle.stageIndex),
    );
    this.tutorialGates?.forEach(({ gate, light }) => {
      gate.setVisible(visible);
      light.setVisible(visible);
    });
    const showUnderfloor = visible && this.tutorialPuzzle.stageIndex === 2;
    this.tutorialUnderfloorGraphics?.setVisible(showUnderfloor);
    this.tutorialUnderfloorLabel?.setVisible(showUnderfloor);
    const showDemo =
      visible && this.tutorialPuzzle.stageIndex === 0 && this.tutorialPuzzle.phase === 'idle';
    this.tutorialDemoEcho?.setVisible(showDemo);
    this.tutorialDemoPresent?.setVisible(showDemo);
    this.tutorialDemoPulse?.setVisible(showDemo);
    this.tutorialSyncColumns?.forEach((column) =>
      Object.values(column)
        .filter((value) => value?.setVisible)
        .forEach((object) => object.setVisible(showUnderfloor)),
    );

    const showEcho =
      visible &&
      ['playback', 'syncing', 'complete'].includes(this.tutorialPuzzle?.phase) &&
      (this.tutorialPuzzle?.phase !== 'complete' || this.tutorialPuzzle?.anomalyActive);
    this.echoSprite?.setVisible(showEcho);
    this.echoReflection?.setVisible(showEcho);
    this.tutorialCompletionLight?.setVisible(visible);
    this.tutorialRouteGraphics?.setVisible(visible);
    const showGuidance =
      visible && ['recording', 'playback', 'syncing'].includes(this.tutorialPuzzle?.phase);
    this.tutorialGuideGraphics?.setVisible(showGuidance);
    this.tutorialRoutePulse?.setVisible(visible && this.tutorialPuzzle?.pastActive);
    this.tutorialObjectiveArrow?.setVisible(visible);
    this.tutorialObjectiveLabel?.setVisible(visible);
    const showTimeline = visible && ['recording', 'playback', 'syncing'].includes(this.tutorialPuzzle?.phase);
    this.echoTimelineBg?.setVisible(showTimeline);
    this.echoTimelineFill?.setVisible(showTimeline);
    this.echoTimelineLabel?.setVisible(showTimeline);
    if (visible) this.updateTutorialObjectiveMarker();
    this.refreshTutorialSyncVisuals();
  }

  refreshTutorialSyncVisuals() {
    const puzzle = this.tutorialPuzzle;
    this.tutorialSyncColumns?.forEach((column, index) => {
      const aligned = puzzle.syncAligned[index];
      const hot = puzzle.syncHotIndex === index;
      const color = aligned ? 0x75d4cd : hot ? 0xf2d49a : 0x52636b;
      column.beam
        .setFillStyle(color, hot || aligned ? 0.72 : 0.16)
        .setScale(hot ? 1.8 : 1, 1);
      column.upper.setFillStyle(color, aligned ? 0.92 : hot ? 0.68 : 0.74);
      column.lower.setStrokeStyle(aligned ? 4 : 3, color, hot || aligned ? 1 : 0.8);
      column.lamp.setFillStyle(color, 1).setScale(hot ? 1.7 : aligned ? 1.35 : 1);
      column.indexMarks.setColor(aligned ? '#baf5ef' : hot ? '#f2d49a' : '#71828a');
    });
  }

  updateTutorialObjectiveMarker() {
    if (LEVEL.tutorialPuzzle.mode === 'timetable') {
      if (this.activeWorldIndex === 0 && this.tutorialWorldVisible) {
        this.timetablePuzzle?.updateObjective();
      } else {
        this.tutorialObjectiveArrow?.setVisible(false);
        this.tutorialObjectiveLabel?.setVisible(false);
      }
      return;
    }
    const puzzle = this.tutorialPuzzle;
    const stage = this.getTutorialStage();
    if (
      !this.tutorialObjectiveArrow ||
      !this.tutorialWorldVisible ||
      this.dialogueState ||
      !['recording', 'playback'].includes(puzzle.phase)
    ) {
      this.tutorialObjectiveArrow?.setVisible(false);
      this.tutorialObjectiveLabel?.setVisible(false);
      return;
    }

    let x = stage.plateX;
    let label = 'STAND HERE';
    if (stage.underfloor && puzzle.phase === 'recording') {
      const nextNode = stage.syncNodes.find((_, index) => !puzzle.recordVisited[index]);
      x = nextNode?.x ?? stage.generatorX;
      label = 'TRACE THE MARKS';
    } else if (stage.underfloor && puzzle.phase === 'playback' && !puzzle.routeActive) {
      const nextNode = stage.syncNodes.find((_, index) => !puzzle.syncAligned[index]);
      x = nextNode?.x ?? stage.generatorX;
      label = 'ALIGN';
    } else if (puzzle.phase === 'recording' || (puzzle.phase === 'playback' && !puzzle.pastActive)) {
      x = stage.plateX;
      label = puzzle.phase === 'recording' ? 'STAND HERE' : 'PAST';
    } else if (puzzle.phase === 'playback' && !puzzle.routeActive) {
      const relay = stage.relays.find(
        (candidate) => puzzle.relayStates[candidate.id] !== candidate.correct,
      );
      x = relay?.x ?? stage.generatorX;
      label = 'TRACE PULSE';
    } else if (puzzle.phase === 'playback') {
      x = stage.generatorX;
      label = 'GENERATE';
    }

    this.tutorialObjectiveArrow.setVisible(true).setX(x);
    this.tutorialObjectiveLabel.setVisible(true).setPosition(x, 348).setText(label);
  }

  setTutorialCameraMode(worldIndex) {
    if (!this.player) return;
    if (worldIndex === 0) {
      this.tutorialCameraLocked = true;
      this.cameras.main.setBounds(0, 0, WORLD_W, 900);
      this.cameras.main.startFollow(this.player, true, 0.075, 0.11, 0, 150);
      this.cameras.main.setDeadzone(220, 170);
    } else if (this.tutorialCameraLocked) {
      this.tutorialCameraLocked = false;
      this.cameras.main.setBounds(0, 0, WORLD_W, GAME_H);
      this.cameras.main.setScroll(this.cameras.main.scrollX, 0);
      this.cameras.main.startFollow(this.player, true, 0.12, 0.12, 0, 0);
      this.cameras.main.setDeadzone(180, 140);
    }
  }

  applyHitstop(durationMs = 55, scale = 0.12) {
    if (
      this.prologueTransitionActive ||
      this.tutorialCameraCinematic ||
      ['opening', 'departure', 'complete'].includes(this.tutorialPuzzle?.phase)
    ) return;
    if (this.hitstopRestoreTimer) window.clearTimeout(this.hitstopRestoreTimer);
    this.time.timeScale = scale;
    this.hitstopRestoreTimer = window.setTimeout(() => {
      this.time.timeScale = 1;
      this.hitstopRestoreTimer = null;
    }, durationMs);
  }

  clearHitstop() {
    if (this.hitstopRestoreTimer) window.clearTimeout(this.hitstopRestoreTimer);
    this.hitstopRestoreTimer = null;
    this.time.timeScale = 1;
  }

  pulseTutorialVignette(tint = 0x8e2634, peakAlpha = 1, duration = 420) {
    if (!this.vignette) return;
    this.tweens.killTweensOf(this.vignette);
    this.vignette.setTintFill(tint);
    this.tweens.add({
      targets: this.vignette,
      alpha: peakAlpha,
      duration: Math.round(duration * 0.28),
      ease: 'Cubic.easeOut',
      yoyo: true,
      hold: Math.round(duration * 0.12),
      onComplete: () => this.vignette.clearTint().setAlpha(this.vignetteBaseAlpha),
    });
  }

  setCompletionVignette(active) {
    if (!this.vignette) return;
    this.tweens.killTweensOf(this.vignette);
    if (active) {
      this.vignette.setTintFill(0x5f7477);
      this.tweens.add({
        targets: this.vignette,
        alpha: 0.89,
        duration: 220,
        ease: 'Cubic.easeOut',
      });
      this.tweens.add({
        targets: this.foreground,
        alpha: 0,
        duration: 180,
        ease: 'Cubic.easeOut',
      });
      return;
    }
    this.tweens.add({
      targets: this.vignette,
      alpha: this.vignetteBaseAlpha,
      duration: 260,
      ease: 'Cubic.easeOut',
      onComplete: () => this.vignette.clearTint(),
    });
    this.tweens.add({
      targets: this.foreground,
      alpha: this.foregroundBaseAlpha,
      duration: 240,
      ease: 'Cubic.easeOut',
    });
  }

  getTutorialStage(index = this.tutorialPuzzle.stageIndex) {
    return LEVEL.tutorialPuzzle.stages[Phaser.Math.Clamp(index, 0, LEVEL.tutorialPuzzle.stages.length - 1)];
  }

  updateTutorialCamera(input, delta) {
    // relayCloseupActive is a separate flag from tutorialCameraCinematic on
    // purpose: the close-up must not inherit the cinematic's hitstop /
    // look-down gating, and its camera restore is its own code path.
    if (
      this.activeWorldIndex !== 0 ||
      !this.tutorialCameraLocked ||
      this.tutorialCameraCinematic ||
      this.relayCloseupActive
    ) return;
    const camera = this.cameras.main;
    const moving = Math.abs(this.player.body.velocity.x) > 28;
    const direction = moving ? Math.sign(this.player.body.velocity.x) : this.player.facing;
    let targetX = -direction * (moving ? 112 : 58);
    const stage = this.getTutorialStage();
    // The look-down resolution lives in a pure, test-locked module
    // (src/tutorial/underfloorView.js): III teaches via `underfloorView`
    // without relocating its hand-placed air circuit; IV/V/VI use the deep
    // `underfloor` machinery band.
    const echoSnap = stage?.echoLoad ? this.tutorialPuzzle?.echoReplay?.snapshot() : null;
    const echoObservation = Boolean(
      stage?.echoLoad && echoSnap?.entered && echoSnap.observationLoop && !echoSnap.stageComplete,
    );
    const persistentLookDown = updatePersistentUnderfloorState(
      this.persistentUnderfloorState,
      {
        stage,
        playerX: this.player.x,
        grounded: this.player.body.blocked.down,
        lookDownPressed: input.lookDownPressed,
        autoLookDown: echoObservation,
      },
    );
    let lookingDown = resolveUnderfloorLookDown({
      activeWorldIndex: this.activeWorldIndex,
      cameraLocked: this.tutorialCameraLocked,
      cinematic: this.tutorialCameraCinematic,
      relayCloseup: this.relayCloseupActive,
      stage,
      playerX: this.player.x,
      grounded: this.player.body.blocked.down,
      lookDownHeld: stageUsesPersistentUnderfloorView(stage) ? persistentLookDown : input.lookDown,
      forceLookDown: this.tutorialForceLookDown,
    });
    // VISIBLE SYSTEM ARC CORRECTION §1.6: Phase VI's first observation loop
    // never waits for the player to discover S. While the echo rides loop 0
    // the camera tilts down on its own and tracks the past self's trolley
    // through one full pass, then hands the follow back to the player (and
    // the freshly unlocked engage handle) as soon as loop 1 begins.
    if (echoObservation) {
      const rail = stage.echoLoad.echoRail;
      const echoX = rail.x0 + echoSnap.echoTrolleyX * (rail.x1 - rail.x0);
      lookingDown = true;
      targetX = Phaser.Math.Clamp((echoX - this.player.x) * 0.85, -300, 300);
    }
    // Look-down depth: III's hand-placed air run sits just below the floor
    // (accepted -165 framing), but IV/V/VI's machinery band runs 505-865 —
    // the equalizer beam, the wheelsets, the V service line and the VI
    // engage handle all live BELOW the -165 fold in a real (shorter than
    // 600) viewport. The deep band gets a deep look (VISIBLE SYSTEM ARC
    // CORRECTION §1.4: the visible safe area is measured, never assumed).
    const deepBand = Boolean(stage?.underfloor);
    const targetY = lookingDown ? (deepBand ? -300 : -165) : 150;
    const amount = Phaser.Math.Clamp(delta / (lookingDown ? 260 : 420), 0, 1);
    camera.setFollowOffset(
      Phaser.Math.Linear(camera.followOffset.x, targetX, amount),
      Phaser.Math.Linear(camera.followOffset.y, targetY, amount),
    );
    this.tutorialLookingDown = lookingDown;
  }

  // -------------------------------------------------- [S] look-down hint --
  // Screen-anchored teaching prompt (VISIBLE SYSTEM ARC CORRECTION §1). The
  // pure state machine in src/tutorial/underfloorView.js decides visibility;
  // this layer only owns the pixels. III/IV use hold; V/VI use a persistent
  // toggle and keep the inverse action visible:
  // >=20px legend on a high-contrast dark plate, breathing alpha in the
  // 0.85-1 band with a slow sinking bob. VI's first loop is camera-led, then
  // the persistent RETURN action remains explicit. No tutorial text panels —
  // a keycap line and a chevron.
  buildUnderfloorHint() {
    // Same recipe as the world [E] prompt — white legend on the game's
    // standard chip colour — because that object stays legible over this
    // exact dark, vignetted floor band where a drawn keycap disappeared.
    // The Y anchor is resolved against the REAL camera viewport every frame
    // (applyUnderfloorHintStyle), never against an assumed canvas bottom:
    // headless captures proved the viewport can be shorter than GAME_H.
    this.underfloorHint = this.add
      .text(GAME_W / 2, GAME_H - 100, '[HOLD S]  INSPECT UNDERCARRIAGE  ▼', {
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: '20px',
        color: RETRO_TRANSIT_CSS.ivory,
        backgroundColor: RETRO_TRANSIT_CSS.charcoalDeep,
        padding: { x: 12, y: 7 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(96)
      .setVisible(false);
    this.underfloorHintState = createUnderfloorHintState();
    this._underfloorHintShown = { visible: false, style: null };
  }

  buildHintBar() {
    // Black bottom-bar hint for world interactables. Replaces floating [E] text.
    this.hintBar = this.add
      .text(GAME_W / 2, GAME_H - 28, '', {
        fontFamily: '"American Typewriter", "Courier New", monospace',
        fontSize: '12px',
        color: '#e5cf9b',
        backgroundColor: '#07090d',
        padding: { x: 14, y: 5 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(97)
      .setVisible(false);
  }

  _updateHintBar(text) {
    if (!this.hintBar) return;
    if (text) {
      this.hintBar.setText(text);
      this.hintBar.setVisible(true);
    } else {
      this.hintBar.setVisible(false);
    }
  }

  // Visible safe area: a fixed margin above the REAL viewport bottom. The
  // camera height is the source of truth (viewport size can differ from
  // GAME_H in embedded/headless runs); 108px keeps clear of the player, the
  // [E] prompt and any clipped edge.
  underfloorHintSafeY() {
    return (this.cameras.main?.height ?? GAME_H) - 108;
  }

  applyUnderfloorHintStyle(style) {
    const hint = this.underfloorHint;
    this.tweens.killTweensOf(hint);
    // While the player is already looking at the underfloor, the hint means
    // "come back UP" — park it at the TOP of the viewport so it stops
    // covering the machinery the phase asks you to watch, and let the bob
    // press up toward the cab it names. Otherwise keep the bottom safe area.
    const atTop = Boolean(this.tutorialLookingDown);
    const baseY = atTop ? 48 : this.underfloorHintSafeY();
    hint.setY(baseY);
    // Strong only (the weak tier is abolished): a confident 0.85 -> 1 breath.
    hint.setAlpha(0.85);
    this.tweens.add({
      targets: hint,
      alpha: 1,
      duration: 780,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    // Slow bob: the chevron presses toward the place it names — DOWN toward
    // the underfloor when inviting inspection, UP toward the cab on return.
    this.tweens.add({
      targets: hint,
      y: atTop ? baseY - 7 : baseY + 7,
      duration: 780,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  updateUnderfloorHintPrompt(delta) {
    if (!this.underfloorHint) return;
    const stage = this.activeWorldIndex === 0 && this.timetablePuzzle ? this.getTutorialStage() : null;
    const next = stepUnderfloorHint(this.underfloorHintState, {
      stage,
      playerX: this.player?.x ?? 0,
      lookingDown: Boolean(this.tutorialLookingDown),
      cinematic: Boolean(this.tutorialCameraCinematic),
      relayCloseup: Boolean(this.relayCloseupActive),
      // stageComplete is a per-stage array in timetable mode; only the
      // CURRENT stage's completion retires the prompt.
      stageComplete: Boolean(this.tutorialPuzzle?.stageComplete?.[this.tutorialPuzzle?.stageIndex]),
      deltaMs: delta,
    });
    const prev = this._underfloorHintShown;
    if (
      next.visible === prev.visible
      && next.style === prev.style
      && next.action === prev.action
    ) return;
    this._underfloorHintShown = next;
    this.underfloorHint.setVisible(next.visible);
    if (next.visible) {
      const persistent = stageUsesPersistentUnderfloorView(stage);
      this.underfloorHint.setText(
        next.action === 'return'
          ? '[S]  RETURN TO CAB  ▲'
          : persistent
            ? '[S]  INSPECT UNDERCARRIAGE  ▼'
            : '[HOLD S]  INSPECT UNDERCARRIAGE  ▼',
      );
      this.applyUnderfloorHintStyle(next.style);
    }
  }

  buildMarkers() {
    const cp = LEVEL.checkpoints[0];
    this.checkpointSprite = this.add
      .sprite(cp.x, LANES[cp.lane].baseY, 'flag-checkpoint')
      .setOrigin(0.5, 1)
      .setDepth(LANES[cp.lane].depth + 1);
    this.checkpointSprite.laneId = cp.lane;
    this.checkpointSprite.setTint(LANES[cp.lane].figureTint);
    this.checkpointLight = this.addLight(
      cp.x,
      LANES[cp.lane].baseY - 48,
      54,
      0xb9c8dc,
      0.3,
      LANES[cp.lane].depth + 3,
    );

    this.goalSprite = this.add
      .sprite(LEVEL.goal.x, LANES[LANE_NEAR].baseY, 'flag-goal')
      .setOrigin(0.5, 1)
      .setDepth(LANES[LANE_NEAR].depth + 1)
      .setTint(LANES[LANE_NEAR].figureTint);

    this.goalLight = this.addLight(
      LEVEL.goal.x,
      LANES[LANE_NEAR].baseY - 64,
      120,
      PAL.lamp,
      0.6,
      LANES[LANE_NEAR].depth + 3,
    );
    this.tweens.add({
      targets: this.goalLight,
      alpha: { from: 0.6, to: 0.36 },
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  buildOverlays() {
    // Reusable floating "+N" score popups.
    this.popups = this.add.group();

    // Speed lines live behind the train shell, so they appear only through
    // the authored window openings during the prologue departure.
    this.departureStreaks = [
      [120, 168, 150, 2], [510, 186, 240, 3], [820, 211, 110, 2],
      [260, 238, 190, 2], [690, 261, 280, 3], [70, 292, 210, 2],
      [430, 318, 140, 2], [870, 332, 230, 3],
    ].map(([x, y, w, h], index) =>
      this.add
        .rectangle(x, y, w, h, index % 3 === 0 ? 0xf2d49a : 0xb9dde4, 0.34)
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(6)
        .setVisible(false),
    );
  }

  playPrologueDeparture(onComplete = () => {}) {
    if (this.prologueTransitionActive) return;
    this.clearHitstop();
    this.prologueTransitionActive = true;
    // The train has reached the end of Chapter One. Release this cue before
    // the departure animation so it cannot bleed underneath the 1→2 film.
    this.prologueScoreReleased = true;
    this.prologueScoreCue = null;
    music.stop({ fade: 1.4 });
    this.departureScroll = 0;
    this.player.frozen = true;
    this.player.setVelocity(0, 0);
    this.departureStreaks.forEach((streak) => streak.setVisible(true).setAlpha(0));
    this.game.events.emit('hud:prologue-transition', {
      kicker: 'CHAPTER ONE',
      title: 'THE SAFETY TEST',
      subtitle: 'The train begins moving backward through its own explanations.',
    });
    sfx.door();

    this.tweens.add({
      targets: this,
      departureScroll: 2700,
      duration: 3000,
      ease: 'Cubic.easeIn',
    });
    this.tweens.add({
      targets: this.departureStreaks,
      alpha: { from: 0, to: 0.72 },
      duration: 1700,
      delay: this.tweens.stagger(80),
      ease: 'Sine.easeIn',
    });
    this.cameras.main.shake(3000, 0.0018);

    // Change scenery only after the HUD has faded fully to black.
    this.time.delayedCall(3500, () => {
      this.registry.set('tutorialPowerRestored', true);
      // Stream the approved Chapter One panorama behind the opaque chapter
      // card. The dedicated scene starts only after the card has cleared, so
      // the frozen Prologue never shares collision or camera state with the
      // parkour car.
      this.worldAssetLoader.load('backdrop-cyberpunk').catch((error) => console.error(error));
      this.departureStreaks.forEach((streak) => streak.setVisible(false));
      this.departureScroll = 0;
    });

    this.time.delayedCall(7000, async () => {
      createSaveStore().markCheckpoint('chapter-2-start');
      this.prologueTransitionActive = false;
      onComplete();
      playCinematic({
        id: 'chapter-1-to-2',
        src: CINEMATICS.chapter1To2,
        label: 'Chapter 1 to Chapter 2 transition',
        preloadChapterId: 'chapter2',
        onComplete: () => this.scene.start('CyberpunkParkour'),
      });
    });
  }

  setupInput() {
    this.keys = this.input.keyboard.addKeys({
      left: 'LEFT',
      right: 'RIGHT',
      up: 'UP',
      down: 'DOWN',
      jump: 'SPACE',
      a: 'A',
      d: 'D',
      w: 'W',
      s: 'S',
      run: 'SHIFT',
      interact: 'E',
      attack: 'F',
      restart: 'R',
      debug: 'ZERO',
      choiceOne: 'ONE',
      choiceTwo: 'TWO',
      choiceThree: 'THREE',
      // ESC closes the relay cabinet close-up (gated on relayCloseupActive in
      // update(); it has no other binding).
      esc: 'ESC',
    });
    // Stop the page from scrolling when the player uses space / arrows.
    this.input.keyboard.addCapture(['SPACE', 'UP', 'DOWN', 'LEFT', 'RIGHT']);
  }

  setupTutorialQA() {
    if (LEVEL.tutorialPuzzle.mode === 'timetable' && this.timetablePuzzle?.setupQA()) return;
    if (!DEV_MODE || typeof window === 'undefined') return;
    const qa = devParams().get('qa');
    if (
      ![
        'tutorial-power',
        'tutorial-recording',
        'tutorial-playback',
        'tutorial-route-a',
        'tutorial-stage-2',
        'tutorial-undercar',
        'tutorial-resonance-1',
        'tutorial-resonance-2',
        'tutorial-resonance-live',
        'tutorial-junction-1-clear',
        'tutorial-junction-2-clear',
        'tutorial-fail',
        'tutorial-complete',
        'tutorial-exit',
      ].includes(qa)
    ) return;

    const qaStageIndex =
      qa === 'tutorial-stage-2' || qa === 'tutorial-route-a' || qa === 'tutorial-junction-2-clear'
        ? 1
        : ['tutorial-undercar', 'tutorial-resonance-1', 'tutorial-resonance-2', 'tutorial-resonance-live', 'tutorial-fail', 'tutorial-complete', 'tutorial-exit'].includes(qa)
          ? 2
          : 0;
    this.tutorialPuzzle.stageIndex = qaStageIndex;
    this.tutorialPuzzle.stageComplete = LEVEL.tutorialPuzzle.stages.map(
      (_, index) => index < qaStageIndex,
    );
    const qaStage = this.getTutorialStage();
    this.player.resetTo(qa === 'tutorial-power' ? 70 : qaStage.recorderX - 20, 400, LANE_NEAR);
    this.tutorialPuzzle.briefed = qa !== 'tutorial-power';
    if (qa === 'tutorial-recording') {
      this.time.delayedCall(320, () => {
        const recorder = this.interactables.find((it) => it.def.id === qaStage.recorderId);
        if (recorder) this.fireInteractable(recorder);
      });
    }
    if (qa === 'tutorial-playback') this.seedTutorialEchoForQA(0, true, 0);
    if (qa === 'tutorial-route-a' || qa === 'tutorial-stage-2') {
      this.seedTutorialEchoForQA(1, true, 0);
    }
    if (qa === 'tutorial-junction-1-clear' || qa === 'tutorial-junction-2-clear') {
      this.seedTutorialEchoForQA(qaStageIndex, true, qaStage.relays.length);
      this.time.delayedCall(420, () => {
        this.player.body.reset(qaStage.generatorX - 20, 400);
        const generator = this.interactables.find((it) => it.def.id === qaStage.generatorId);
        if (generator) this.fireInteractable(generator);
      });
    }
    if (qa === 'tutorial-undercar') {
      this.seedTutorialEchoForQA(2, true, 0);
      this.tutorialForceLookDown = true;
    }
    if (qa === 'tutorial-resonance-1' || qa === 'tutorial-resonance-2') {
      this.seedTutorialEchoForQA(2, true, qa === 'tutorial-resonance-1' ? 1 : 2);
      this.player.body.reset(
        qaStage.syncNodes[qa === 'tutorial-resonance-1' ? 1 : 0].x,
        400,
      );
      this.tutorialForceLookDown = true;
    }
    if (qa === 'tutorial-resonance-live') {
      this.seedTutorialEchoForQA(2, true, 0);
      this.player.body.reset(qaStage.syncNodes[0].x, 400);
      this.tutorialForceLookDown = true;
    }
    if (qa === 'tutorial-fail') {
      this.seedTutorialEchoForQA(2, true, 0);
      this.time.delayedCall(420, () => {
        this.player.body.reset(qaStage.generatorX - 20, 400);
        const generator = this.interactables.find((it) => it.def.id === qaStage.generatorId);
        if (generator) this.fireInteractable(generator);
      });
    }
    if (qa === 'tutorial-complete' || qa === 'tutorial-exit') {
      this.seedTutorialEchoForQA(2, true, qaStage.syncNodes?.length ?? qaStage.relays.length);
      this.time.delayedCall(520, () => {
        this.player.body.reset(qaStage.generatorX - 20, 400);
        const generator = this.interactables.find((it) => it.def.id === qaStage.generatorId);
        if (generator) this.fireInteractable(generator);
      });
    }
    if (qa === 'tutorial-exit') {
      this.time.delayedCall(4550, () => this.player.body.reset(2415, 400));
    }
    this.refreshTutorialStageVisuals();
    this.setTutorialPuzzleVisible(this.activeWorldIndex === 0);
    this.updateTutorialObjectiveMarker();
  }

  readInput() {
    const k = this.keys;
    const JustDown = Phaser.Input.Keyboard.JustDown;
    const jumpTapped = JustDown(k.jump);
    const upTapped = JustDown(k.up);
    const sTapped = JustDown(k.s);
    const downTapped = JustDown(k.down);
    return {
      left: k.left.isDown || k.a.isDown,
      right: k.right.isDown || k.d.isDown,
      jumpHeld: k.jump.isDown || k.up.isDown,
      jumpPressed: jumpTapped || upTapped,
      run: k.run.isDown,
      laneBack: JustDown(k.w),
      laneFront: sTapped,
      lookDown: k.s.isDown || k.down.isDown,
      lookDownPressed: sTapped || downTapped,
      interact: JustDown(k.interact),
      // Held and released edges of the same key. Sections V and VI treat the
      // valve as an analogue control rather than a switch, so they need the
      // duration of the press, not just its start.
      interactHeld: k.interact.isDown,
      interactReleased: Phaser.Input.Keyboard.JustUp(k.interact),
      attackPressed: JustDown(k.attack),
      choiceOne: JustDown(k.choiceOne),
      choiceTwo: JustDown(k.choiceTwo),
      choiceThree: JustDown(k.choiceThree),
    };
  }

  // ---------------------------------------------------------- lane mechanics

  /**
   * Would the player fit in `laneId` at (x, y)? Prevents shifting depth into
   * the middle of a wall — the switch is refused instead of clipping.
   */
  canOccupyLane(player, laneId, x, y) {
    const scale = LANES[laneId].scale;
    // Inset by absolute pixels, not a percentage. Standing on a surface maps
    // the player's feet exactly onto the destination surface, so a probe that
    // scales with the body clips it by a fraction of a pixel and refuses every
    // shift. The inset has to survive that while still catching real embedding.
    const w = Math.max(4, player.width * scale * player.figureScale - 8);
    const h = Math.max(4, player.height * scale * player.figureScale - 10);
    const probe = new Phaser.Geom.Rectangle(x - w / 2, y - h / 2, w, h);

    const children = this.solids.getChildren();
    for (let i = 0; i < children.length; i++) {
      const s = children[i];
      if (s.laneId !== laneId || !s.body || !s.body.enable) continue;
      const b = s.body;
      if (
        probe.right > b.x &&
        probe.x < b.x + b.width &&
        probe.bottom > b.y &&
        probe.y < b.y + b.height
      ) {
        return false;
      }
    }
    return true;
  }

  onLaneChanged(lane) {
    this.registry.set('lane', lane);
  }

  // -------------------------------------------------------------- collisions

  onSolidHit(player, solid) {
    const body = player.body;

    if (solid.kind === 'question' && body.blocked.up && !solid.used) {
      this.bumpQuestionBlock(solid);
    } else if (solid.kind === 'brick' && body.blocked.up) {
      sfx.bump();
      this.nudgeBlock(solid, 4);
    } else if (solid.kind === 'spring' && body.blocked.down) {
      player.launch(SPRING_VELOCITY);
      player.pulse(0.75, 1.32, 220);
      sfx.spring();
      this.tweens.add({
        targets: solid,
        scaleY: 0.55,
        duration: 80,
        yoyo: true,
        ease: 'Quad.easeOut',
      });
    }
  }

  nudgeBlock(solid, distance) {
    const startY = solid.y;
    this.tweens.add({
      targets: solid,
      y: startY - distance,
      duration: 70,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => {
        solid.y = startY;
      },
    });
  }

  bumpQuestionBlock(solid) {
    solid.used = true;
    solid.setTexture('block-spent');
    this.nudgeBlock(solid, 9);
    sfx.bump();

    if (solid.runeGlow) {
      this.tweens.killTweensOf(solid.runeGlow);
      this.tweens.add({
        targets: solid.runeGlow,
        alpha: 0,
        scale: solid.runeGlow.scale * 2.2,
        duration: 340,
        onComplete: () => solid.runeGlow.destroy(),
      });
      solid.runeGlow = null;
    }

    const lane = LANES[solid.laneId];
    const coin = this.add
      .image(solid.x + solid.width / 2, solid.y, 'echo')
      .setDepth(lane.depth + 2)
      .setScale(lane.scale)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: coin,
      y: solid.y - 54,
      duration: 260,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: coin,
          y: solid.y - 20,
          alpha: 0,
          duration: 180,
          ease: 'Quad.easeIn',
          onComplete: () => coin.destroy(),
        });
      },
    });

    sfx.coin();
    this.addScore(3, solid.x + solid.width / 2, solid.y - 30);
    this.registry.set('coins', this.registry.get('coins') + 1);
  }

  onCoin(player, coin) {
    coin.disableBody(true, true);
    sfx.coin();
    this.registry.set('coins', this.registry.get('coins') + 1);
    this.addScore(coin.value, coin.x, coin.y);
  }

  onEnemy(player, enemy) {
    if (player.hurt(enemy.x)) {
      this.damage(false);
    }
  }

  performStrike(player, facing) {
    const lane = LANES[player.lane];
    const slash = this.add
      .image(player.x + facing * 30 * lane.scale, player.y - 7 * lane.scale, 'slash')
      .setOrigin(0.5)
      .setDepth(lane.depth + 4)
      .setScale(lane.scale)
      .setFlipX(facing < 0)
      .setTint(0xd9e8f4)
      .setAlpha(0.82)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: slash,
      alpha: 0,
      scaleX: lane.scale * 1.3,
      scaleY: lane.scale * 1.08,
      duration: 130,
      ease: 'Quad.easeOut',
      onComplete: () => slash.destroy(),
    });

    this.enemies.getChildren().slice().forEach((enemy) => {
      if (!enemy.active || enemy.laneId !== player.lane) return;
      const forward = (enemy.x - player.x) * facing;
      const vertical = Math.abs(enemy.y - player.y);
      if (forward > -8 * lane.scale && forward < 64 * lane.scale && vertical < 42 * lane.scale) {
        this.defeatEnemy(enemy);
      }
    });
  }

  defeatEnemy(enemy) {
    sfx.kill();
    this.addScore(20, enemy.x, enemy.y - 20);

    enemy.body.enable = false;
    enemy.setVelocity(0, 0);
    enemy.active = false;
    enemy.setTint(PAL.blood);

    this.tweens.add({
      targets: enemy,
      alpha: 0,
      scaleX: enemy.scaleX * 1.22,
      scaleY: enemy.scaleY * 0.68,
      duration: 240,
      ease: 'Quad.easeOut',
      onComplete: () => enemy.destroy(),
    });
  }

  // ------------------------------------------------------------ interactions

  updateInteractables(input) {
    if (this.dialogueState) {
      this._updateHintBar(null);
      return;
    }

    // While a relay cabinet close-up owns the screen, no world device may
    // be picked or fired: the pointer drives the cabinet, E/ESC closes it.
    if (this.relayCloseupActive) {
      this.activeInteractable = null;
      this.activeNPC = null;
      this._updateHintBar(null);
      return;
    }

    // While a Butch narrative line owns the upper card, world prompts stay
    // hidden and E belongs to the line's dismiss path only.
    if (this.narrativeProps?.dialogueActive) {
      this._updateHintBar(null);
      return;
    }

    const p = this.player;
    let best = null;
    let bestDist = 62;

    this.interactables.forEach((it) => {
      if (it.def.lane !== p.lane) return;
      if (it.fired && it.def.once) return;
      if (it.def.stage !== undefined && it.def.stage !== this.tutorialPuzzle.stageIndex) return;
      if (
        LEVEL.tutorialPuzzle.mode === 'timetable' &&
        this.timetablePuzzle?.isTimetableKind(it.def.kind) &&
        !this.timetablePuzzle.canInteract(it)
      ) return;
      if (
        this.activeWorldIndex === 0 &&
        !this.tutorialPuzzle.briefed &&
        ['recorder', 'relay', 'breaker', 'generator'].includes(it.def.kind)
      ) return;
      if (this.tutorialPuzzle.phase === 'recording' && it.def.kind === 'recorder') return;
      if (
        it.def.kind === 'relay' &&
        (this.tutorialPuzzle.phase !== 'playback' || !this.tutorialPuzzle.pastActive)
      ) return;
      if (it.def.kind === 'relay' && it.def.id === 'j3-relay-b' && !this.tutorialPuzzle.breakerActive) return;
      if (
        it.def.kind === 'breaker' &&
        (this.tutorialPuzzle.phase !== 'playback' ||
          !this.tutorialPuzzle.pastActive ||
          this.tutorialPuzzle.relayStates['j3-relay-a'] !== 0 ||
          this.tutorialPuzzle.breakerActive)
      ) return;
      if (it.def.kind === 'generator' && this.tutorialPuzzle.phase === 'idle') return;
      if (
        this.tutorialPuzzle.phase === 'complete' &&
        ['recorder', 'relay', 'breaker', 'generator'].includes(it.def.kind)
      ) return;
      const dx = Math.abs(it.sprite.x - p.x);
      const dy = Math.abs(it.sprite.y - p.y);
      // VISIBLE SYSTEM ARC CORRECTION: the underfloor device families are
      // mounted ON the machinery below the floor (V's service line, VI's
      // engage handle), hundreds of pixels under the walkway. Their pick
      // keeps the same 62px x-radius but measures depth against the deep
      // band instead of the floor-line band.
      const dyMax = ['weight-transfer', 'bogie-service', 'echo-load'].includes(it.def.kind)
        ? 430
        : 100;
      if (dx < bestDist && dy < dyMax) {
        bestDist = dx;
        best = { type: 'interactable', item: it, x: it.sprite.x, y: it.sprite.y };
      }
    });

    // A suitcase carries both puzzle weight and story evidence. Its one-time
    // first-look inspection yields E back to the normal carry/service verb as
    // soon as the inspection panel has opened.
    const narrativeProp = this.narrativeProps?.findInteractable(p.x, p.y, p.lane);
    const narrativePreemptsPuzzle = this.narrativeProps?.shouldPreemptPuzzle(narrativeProp);
    if (narrativeProp && (!best || narrativePreemptsPuzzle)) {
      best = { type: 'narrative-prop', item: narrativeProp, x: narrativeProp.x, y: narrativeProp.y };
      bestDist = Math.abs(narrativeProp.x - p.x);
    }

    this.npcs.forEach((npc) => {
      if (npc.def.lane !== p.lane) return;
      const dx = Math.abs(npc.sprite.x - p.x);
      const dy = Math.abs(npc.sprite.y - p.y);
      if (dx < bestDist && dy < 110) {
        bestDist = dx;
        best = { type: 'npc', item: npc, x: npc.sprite.x, y: npc.sprite.y };
      }
    });

    this.activeInteractable = best?.type === 'interactable' ? best.item : null;
    this.activeNPC = best?.type === 'npc' ? best.item : null;

    this.npcs.forEach((npc) => npc.label.setAlpha(npc === this.activeNPC ? 1 : 0));

    if (best) {
      const promptText =
        best.type === 'narrative-prop'
          ? best.item.kind === 'suitcase-inspector'
            ? '[E] INSPECT CASE'
            : best.item.state.open ? '[E] READ' : '[E] OPEN'
          : best.type === 'npc'
            ? '[E] SPEAK'
            : LEVEL.tutorialPuzzle.mode === 'timetable' &&
              this.timetablePuzzle?.isTimetableKind(best.item.def.kind)
            ? this.timetablePuzzle.promptFor(best.item)
            : best.item.def.kind === 'recorder'
              ? this.tutorialPuzzle.phase === 'playback'
                ? '[E] RE-RECORD'
                : '[E] RECORD'
              : best.item.def.kind === 'generator'
                ? '[E] GENERATE'
                : best.item.def.kind === 'relay'
                  ? '[E] ROUTE'
                  : best.item.def.kind === 'breaker'
                    ? '[E] INVERT'
                : '[E]';
      // A null prompt text means the device owns its own in-world prompt (the
      // Phase II interlock latch/contactor); the shared bubble stays hidden.
      this._updateHintBar(promptText);
    } else {
      this._updateHintBar(null);
    }

    // The punch press is the one interactable that takes more than E: keys 1/2/3
    // pick which lettered key is under the hammer. Arrow/A-D are walking keys and
    // could not be reused here without stealing movement while the player stands
    // at the bench.
    if (
      best?.type === 'interactable' &&
      best.item.def.kind === 'timetable-press' &&
      LEVEL.tutorialPuzzle.mode === 'timetable'
    ) {
      const pick = input.choiceOne ? 0 : input.choiceTwo ? 1 : input.choiceThree ? 2 : -1;
      if (pick >= 0) this.timetablePuzzle?.selectPressKey(pick);
    }

    if (input.interact && best) {
      if (best.type === 'npc') this.openDialogue(best.item);
      else if (best.type === 'narrative-prop') this.narrativeProps.interact(best.item);
      else this.fireInteractable(best.item);
    }
  }

  openDialogue(npc) {
    if (this.dialogueState) return;

    sfx.press();
    this.pulseTutorialDevice(npc.sprite, 0xcaa66b);
    if (npc.def.id === 'caretaker') this.tutorialPuzzle.briefed = true;
    npc.talked += 1;
    const nodeId = npc.talked === 1 ? 'start' : 'repeat';
    this.dialogueState = {
      npc,
      nodeId,
      lineIndex: 0,
      waitingChoice: false,
    };
    this.player.frozen = true;
    // Dialogue bypasses Player.update(), so clear the force that may have
    // been applied on the same frame as the interaction.
    this.player.setAcceleration(0, 0);
    this.player.setVelocity(0, 0);
    this._updateHintBar(null);
    this.updateTutorialObjectiveMarker();
    this.showDialogueNode();
  }

  showDialogueNode() {
    const state = this.dialogueState;
    if (!state) return;

    const node = state.npc.story[state.nodeId];
    state.lineIndex = 0;
    state.waitingChoice = false;
    this.game.events.emit('hud:dialogue:line', {
      speaker: state.npc.story.name,
      role: state.npc.story.role,
      text: node.lines[0],
      line: 1,
      total: node.lines.length,
    });
  }

  advanceDialogue() {
    const state = this.dialogueState;
    if (!state || state.waitingChoice) return;

    const node = state.npc.story[state.nodeId];
    if (state.lineIndex < node.lines.length - 1) {
      state.lineIndex += 1;
      this.game.events.emit('hud:dialogue:line', {
        speaker: state.npc.story.name,
        role: state.npc.story.role,
        text: node.lines[state.lineIndex],
        line: state.lineIndex + 1,
        total: node.lines.length,
      });
      return;
    }

    if (node.choices) {
      state.waitingChoice = true;
      this.game.events.emit('hud:dialogue:choices', {
        choices: node.choices.map((choice) => choice.label),
      });
    } else {
      this.closeDialogue();
    }
  }

  selectDialogueChoice(index) {
    const state = this.dialogueState;
    if (!state || !state.waitingChoice) return;

    const node = state.npc.story[state.nodeId];
    const choice = node.choices?.[index];
    if (!choice) return;

    if (choice.memory) {
      this.registry.set('memory', Math.max(0, this.registry.get('memory') + choice.memory));
    }
    if (choice.witness) {
      this.registry.set('witnesses', Math.max(0, this.registry.get('witnesses') + choice.witness));
    }
    if (choice.final) {
      this.registry.set('finalChoice', choice.id);
      this.game.events.emit(
        'hud:toast',
        choice.id === 'awake' ? 'the world has heard you remember' : 'the world has accepted your forgiveness',
      );
    }

    state.nodeId = choice.next;
    this.showDialogueNode();
  }

  updateDialogueInput() {
    const JustDown = Phaser.Input.Keyboard.JustDown;
    this.player.setAcceleration(0, 0);
    this.player.setVelocity(0, 0);
    if (JustDown(this.keys.choiceOne)) {
      this.selectDialogueChoice(0);
    } else if (JustDown(this.keys.choiceTwo)) {
      this.selectDialogueChoice(1);
    } else if (
      JustDown(this.keys.interact) ||
      JustDown(this.keys.jump) ||
      JustDown(this.keys.up)
    ) {
      if (this.registry.get('dialogueTyping')) {
        sfx.press();
        this.game.events.emit('hud:dialogue:reveal');
        return;
      }
      sfx.press();
      this.advanceDialogue();
    }
  }

  closeDialogue() {
    if (!this.dialogueState) return;
    this.dialogueState = null;
    this.player.frozen = false;
    this.game.events.emit('hud:dialogue:close');
    this.updateTutorialObjectiveMarker();
  }

  fireInteractable(it) {
    if (it.fired && it.def.once) return;

    if (
      LEVEL.tutorialPuzzle.mode === 'timetable' &&
      this.timetablePuzzle?.handleInteraction(it)
    ) return;

    this.pulseTutorialDevice(it.sprite, it.def.kind === 'breaker' ? 0xcaa66b : 0x75d4cd);
    sfx.press();

    if (it.def.kind === 'recorder') {
      this.startEchoRecording(it);
    } else if (it.def.kind === 'relay') {
      this.toggleTutorialRelay(it);
    } else if (it.def.kind === 'breaker') {
      this.activateTutorialBreaker(it);
    } else if (it.def.kind === 'generator') {
      this.attemptTutorialSync(it);
    } else if (it.def.kind === 'lever') {
      it.fired = true;
      it.sprite.setTexture('lever-on');
      this.addLight(it.sprite.x, it.sprite.y - 22, 90, PAL.lamp, 0.55, 40);
      sfx.lever();
      this.raiseBridge();
      this.addScore(25, it.sprite.x, it.sprite.y - 40);
    }

    if (it.def.message) this.game.events.emit('hud:toast', it.def.message);
  }

  toggleTutorialRelay(relay) {
    const puzzle = this.tutorialPuzzle;
    if (puzzle.phase === 'complete' || puzzle.phase === 'syncing') return;
    const next = puzzle.relayStates[relay.def.id] === 0 ? 1 : 0;
    puzzle.relayStates[relay.def.id] = next;
    relay.sprite.setTexture(`circuit-relay-${next}`);
    this.player.playInteraction();
    sfx.lever();
    this.refreshTutorialRouteState();
    if (puzzle.routeActive) {
      this.game.events.emit('hud:toast', 'PAST circuit routed. Follow the cyan line to PRESENT.');
    } else if (puzzle.pastActive) {
      this.game.events.emit('hud:toast', 'The pulse changed direction. Follow where the light stops.');
    }
  }

  activateTutorialBreaker(breaker) {
    const puzzle = this.tutorialPuzzle;
    if (
      puzzle.phase !== 'playback' ||
      !puzzle.pastActive ||
      puzzle.relayStates['j3-relay-a'] !== 0 ||
      puzzle.breakerActive
    ) return;
    puzzle.breakerActive = true;
    breaker.sprite.setTexture('lever-on');
    this.player.playInteraction();
    sfx.lever();
    this.refreshTutorialRouteState();
    this.game.events.emit('hud:toast', 'The inverted pulse returns beneath the car. Trace where it rises.');
  }

  playTutorialGateOpen(index, onComplete = () => {}) {
    const puzzle = this.tutorialPuzzle;
    const assembly = this.tutorialGates?.[index];
    if (!assembly || puzzle.gateAnimating[index] || puzzle.stageComplete[index]) {
      onComplete();
      return;
    }
    puzzle.gateAnimating[index] = true;
    const { gate, light, vestibuleGlow, window, latchTop, latchBottom } = assembly;
    this.tweens.killTweensOf([gate, light, vestibuleGlow, window, latchTop, latchBottom]);
    sfx.door();
    this.cameras.main.shake(110, 0.0018);
    vestibuleGlow?.setAlpha(0.04);
    this.tweens.add({
      targets: light,
      alpha: 0.12,
      scale: 1.9,
      duration: 88,
      yoyo: true,
      repeat: 2,
      onComplete: () => light.setFillStyle(0x75d4cd, 1).setAlpha(0.92).setScale(1),
    });
    this.time.delayedCall(250, () => {
      this.tweens.add({
        targets: [latchTop, latchBottom],
        scaleX: 0.08,
        alpha: 0.24,
        duration: 250,
        ease: 'Back.easeIn',
      });
      this.tweens.add({
        targets: vestibuleGlow,
        alpha: 0.24,
        duration: 640,
        ease: 'Sine.easeOut',
      });
      for (let i = 0; i < 4; i += 1) {
        const side = i % 2 ? -1 : 1;
        const steam = this.add
          .circle(
            gate.x + side * Phaser.Math.Between(9, 16),
            Phaser.Math.Between(326, 430),
            Phaser.Math.Between(2, 6),
            0xc4d8dc,
            0.28,
          )
          .setDepth(61)
          .setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
          targets: steam,
          x: steam.x + side * Phaser.Math.Between(20, 54),
          y: steam.y - Phaser.Math.Between(14, 46),
          scale: Phaser.Math.FloatBetween(1.8, 3.2),
          alpha: 0,
          duration: Phaser.Math.Between(520, 900),
          ease: 'Sine.easeOut',
          onComplete: () => steam.destroy(),
        });
      }
    });
    this.time.delayedCall(500, () => {
      this.cameras.main.shake(320, 0.0018);
      this.tweens.add({
        targets: [gate, window],
        y: '-=308',
        duration: 760,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          puzzle.gateAnimating[index] = false;
          // Phase III door chain: the door leaf has ACTUALLY finished opening —
          // only now may the frozen state machine enter OPEN and fire its
          // one-shot stage-complete (SYSTEM ARC LOCK §3). The guard line reads
          // stageComplete below, so passage and the pure-logic OPEN land on
          // the same frame, after the animation, never before it.
          if (index === 2) this.tutorialPuzzle?.airCircuit?.confirmDoorOpened();
          puzzle.stageComplete[index] = true;
          gate.setY(156).setScale(1, 0.08).setAlpha(0.18);
          window?.setVisible(false);
          latchTop?.setVisible(false);
          latchBottom?.setVisible(false);
          light.setFillStyle(0x75d4cd, 1).setAlpha(0.7);
          this.refreshTutorialStageVisuals();
          onComplete();
        },
      });
    });
  }

  playTutorialCompletionReveal(
    index,
    onMachineReady = (finishMachineReveal) => finishMachineReveal(),
    onReadyForDoor = () => {},
  ) {
    const stage = LEVEL.tutorialPuzzle.stages[index];
    if (!stage || stage.showMachinery === false) {
      onMachineReady(() => this.time.delayedCall(120, onReadyForDoor));
      return;
    }
    const camera = this.cameras.main;
    const centerX = (stage.startX + stage.endX) / 2;
    const machinery = this.timetablePuzzle?.stageAssemblies?.[index]?.machinery;
    const machineY = machinery
      ? Phaser.Math.Clamp(
          Phaser.Math.Linear(machinery.underY, machinery.wheelY, 0.5),
          520,
          720,
        )
      : 548;
    this.tutorialCameraCinematic = true;
    this.tutorialForceLookDown = false;
    this.player.frozen = true;
    this.player.setVelocity(0, 0);
    this.setCompletionVignette(true);
    camera.stopFollow();
    // Camera.pan's callback fires EVERY FRAME of the effect with
    // (camera, progress, x, y) — it is an onUpdate, not an onComplete. Gate on
    // progress >= 1 (true exactly once, on the final frame before the effect
    // clears itself) or the whole completion chain retriggers per frame.
    let revealDone = false;
    camera.pan(centerX, machineY, 420, 'Sine.easeInOut', true, (cam, progress) => {
      if (progress < 1 || revealDone) return;
      revealDone = true;
      onMachineReady(() => {
        this.time.delayedCall(120, () => {
          camera.pan(stage.endX - 44, 356, 420, 'Sine.easeInOut', true, (cam2, progress2) => {
            if (progress2 < 1) return;
            this.setCompletionVignette(false);
            onReadyForDoor();
          });
        });
      });
    });
  }

  finishTutorialCompletionReveal() {
    if (!this.tutorialCameraCinematic) return;
    this.setCompletionVignette(false);
    this.tutorialCameraCinematic = false;
    this.cameras.main.startFollow(this.player, true, 0.075, 0.11, 0, 150);
    this.cameras.main.setDeadzone(220, 170);
  }

  refreshTutorialStageVisuals() {
    const puzzle = this.tutorialPuzzle;
    this.tutorialGates?.forEach(({
      gate,
      light,
      vestibuleGlow,
      window,
      latchTop,
      latchBottom,
      passageGlow,
      passageArrow,
    }, index) => {
      const complete = puzzle.stageComplete[index];
      const passageActive =
        this.tutorialWorldVisible &&
        complete &&
        puzzle.phase === 'approach' &&
        index === puzzle.stageIndex - 1;
      if (!puzzle.gateAnimating[index]) {
        gate.setY(complete ? 156 : 246).setScale(1, complete ? 0.08 : 1);
      }
      gate.setAlpha(complete ? 0.18 : 0.96);
      gate.setFillStyle(complete ? 0x75d4cd : 0x1c2830, complete ? 0.18 : 0.96);
      gate.setStrokeStyle(2, complete ? 0x75d4cd : 0xe45a5f, complete ? 0.45 : 0.8);
      light.setFillStyle(complete ? 0x75d4cd : 0xe45a5f, 1).setAlpha(complete ? 0.7 : 1);
      vestibuleGlow?.setAlpha(complete ? 0.2 : 0.035);
      window?.setVisible(this.tutorialWorldVisible && !complete).setY(304).setAlpha(1);
      [latchTop, latchBottom].forEach((latch, latchIndex) => latch
        ?.setVisible(this.tutorialWorldVisible && !complete)
        .setScale(1)
        .setAlpha(0.88)
        .setY(latchIndex === 0 ? 336 : 406));
      passageGlow?.setVisible(passageActive);
      passageArrow?.setVisible(passageActive);
      this.tutorialTrainRoomsArt?.setRoomComplete?.(index, complete);
    });
    this.tutorialStageSigns?.forEach((label, index) => {
      const color = puzzle.stageComplete[index]
        ? '#75d4cd'
        : index === puzzle.stageIndex
          ? '#f2d49a'
          : '#71828a';
      label
        .setColor(color)
        .setVisible(this.tutorialWorldVisible && index === puzzle.stageIndex)
        .setAlpha(index === puzzle.stageIndex ? 0.62 : 0);
    });
    if (LEVEL.tutorialPuzzle.mode === 'timetable') this.timetablePuzzle?.refresh();
  }

  getTutorialRouteNodes(stage) {
    const y = stage.underfloor ? 690 : 507;
    if (stage.underfloor) {
      return [
        { x: stage.recorderX, y: 760, kind: 'memory' },
        ...stage.syncNodes.map((node) => ({ x: node.x, y: 760, kind: 'resonance' })),
        { x: stage.generatorX - 24, y: 760, kind: 'generator' },
      ];
    }
    return [
      { x: stage.plateX, y, kind: 'plate' },
      ...stage.relays.map((relay) => ({ x: relay.x, y, kind: 'relay', relay })),
      { x: stage.generatorX - 24, y, kind: 'generator' },
    ];
  }

  refreshTutorialRouteState() {
    const puzzle = this.tutorialPuzzle;
    const stages = LEVEL.tutorialPuzzle.stages;
    const stage = this.getTutorialStage();
    let poweredSegments = puzzle.pastActive ? 1 : 0;
    if (puzzle.pastActive && stage.underfloor) {
      poweredSegments = 1 + puzzle.syncAligned.filter(Boolean).length;
    } else if (puzzle.pastActive) {
      for (const relay of stage.relays) {
        if (puzzle.relayStates[relay.id] !== relay.correct) break;
        poweredSegments += 1;
      }
    }
    puzzle.poweredSegments = poweredSegments;
    puzzle.routeActive = poweredSegments === this.getTutorialRouteNodes(stage).length - 1;

    const g = this.tutorialRouteGraphics;
    if (g) {
      g.clear();
      stages.forEach((candidate, stageIndex) => {
        const nodes = this.getTutorialRouteNodes(candidate);
        const isCurrent = stageIndex === puzzle.stageIndex;
        const stagePowered = puzzle.stageComplete[stageIndex]
          ? nodes.length - 1
          : isCurrent
            ? poweredSegments
            : 0;
        for (let index = 0; index < nodes.length - 1; index += 1) {
          const from = nodes[index];
          const to = nodes[index + 1];
          const active = index < stagePowered;
          g.lineStyle(active ? 4 : 2, active ? 0x75d4cd : 0x52636b, active ? 0.9 : 0.3);
          g.lineBetween(from.x, from.y, to.x, to.y);
          const length = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y);
          const steps = Math.max(1, Math.floor(length / 58));
          for (let step = 1; step < steps; step += 1) {
            const t = step / steps;
            const x = Phaser.Math.Linear(from.x, to.x, t);
            const y = Phaser.Math.Linear(from.y, to.y, t);
            g.fillStyle(active ? 0xbaf5ef : 0x52636b, active ? 0.78 : 0.24);
            g.fillCircle(x, y, active ? 2.6 : 1.8);
          }
        }

        candidate.relays.forEach((relay, index) => {
          const isCorrect = puzzle.relayStates[relay.id] === relay.correct;
          const expectedSegment = candidate.underfloor ? (index === 0 ? 1 : 3) : index + 1;
          const isFirstWrong = isCurrent && puzzle.pastActive && poweredSegments === expectedSegment;
          const branchDir = puzzle.relayStates[relay.id] === 0 ? -1 : 1;
          const routeNode = nodes.find((node) => node.relay?.id === relay.id);
          const routeY = routeNode?.y ?? 507;
          const branchY = routeY + 54;
          g.lineStyle(2, isFirstWrong ? 0xe45a5f : 0x52636b, isFirstWrong ? 0.9 : 0.34);
          g.lineBetween(relay.x, 461, relay.x, routeY);
          g.lineBetween(relay.x, routeY, relay.x + branchDir * 34, branchY);
          g.fillStyle(isFirstWrong ? 0xe45a5f : isCorrect ? 0x75d4cd : 0x65757d, 0.9);
          g.fillCircle(relay.x, routeY, 4);

          if (!candidate.underfloor && isFirstWrong) {
            g.lineStyle(3, 0xe45a5f, 0.9);
            g.lineBetween(relay.x + branchDir * 28, 529, relay.x + branchDir * 40, 541);
            g.lineBetween(relay.x + branchDir * 40, 529, relay.x + branchDir * 28, 541);
          }
        });
      });
    }

    if (puzzle.phase === 'playback') {
      this.registry.set(
        'tutorialPowerState',
        puzzle.routeActive
          ? `junction-${puzzle.stageIndex + 1}-routed`
          : puzzle.pastActive
            ? `junction-${puzzle.stageIndex + 1}-leaking`
            : `junction-${puzzle.stageIndex + 1}-playback`,
      );
    }
    this.refreshTutorialStageVisuals();
  }

  updateTutorialRoutePulse(time) {
    if (LEVEL.tutorialPuzzle.mode === 'timetable') return;
    const puzzle = this.tutorialPuzzle;
    const pulse = this.tutorialRoutePulse;
    if (!pulse || !puzzle.pastActive || this.activeWorldIndex !== 0) {
      pulse?.setVisible(false);
      return;
    }
    const stage = this.getTutorialStage();
    const nodes = this.getTutorialRouteNodes(stage);
    const cutoffIndex = Math.min(Math.max(1, puzzle.poweredSegments), nodes.length - 1);
    const activeNodes = nodes.slice(0, cutoffIndex + 1);
    const routeProgress = ((time % 1650) / 1650) * (activeNodes.length - 1);
    const segmentIndex = Math.min(activeNodes.length - 2, Math.floor(routeProgress));
    const progress = routeProgress - segmentIndex;
    const from = activeNodes[segmentIndex];
    const to = activeNodes[segmentIndex + 1];
    const faulting = !puzzle.routeActive && progress > 0.84;
    pulse
      .setVisible(true)
      .setPosition(
        Phaser.Math.Linear(from.x, to.x, progress),
        Phaser.Math.Linear(from.y, to.y, progress),
      )
      .setFillStyle(faulting ? 0xe45a5f : 0x75d4cd, 1)
      .setScale(faulting ? 1.7 : 1 + Math.sin(time * 0.012) * 0.18);
  }

  startEchoRecording(recorder) {
    const puzzle = this.tutorialPuzzle;
    const stage = this.getTutorialStage();
    if (puzzle.phase === 'complete' || puzzle.phase === 'syncing') return;
    if (recorder.def.stage !== puzzle.stageIndex) return;

    puzzle.phase = 'recording';
    puzzle.frames = [];
    puzzle.recordStartedAt = this.time.now;
    puzzle.playbackCursor = 0;
    puzzle.pastActive = false;
    puzzle.presentActive = false;
    puzzle.serviceActive = false;
    puzzle.breakerActive = false;
    puzzle.syncAligned = [false, false];
    puzzle.recordVisited = [false, false];
    puzzle.syncHotIndex = -1;
    puzzle.syncHoldStartedAt = 0;
    puzzle.faultUntil = 0;
    const breaker = this.interactables.find((it) => it.def.id === stage.breakerId);
    breaker?.sprite.setTexture('lever-off');
    recorder.sprite.setTexture('echo-recorder-recording');
    this.echoSprite.setVisible(false);
    this.echoReflection.setVisible(false);
    this.tutorialDemoEcho?.setVisible(false);
    this.tutorialDemoPresent?.setVisible(false);
    this.tutorialDemoPulse?.setVisible(false);
    this.tutorialPressures[puzzle.stageIndex].setTexture('pressure-pad-off');
    this.tutorialGuideGraphics?.setVisible(this.activeWorldIndex === 0);
    this.refreshTutorialRouteState();
    this.refreshTutorialSyncVisuals();
    this.registry.set('tutorialPowerState', 'recording');
    this.echoTimelineBg.setVisible(true);
    this.echoTimelineFill.setVisible(true).setFillStyle(0xe45a5f).setScale(0.001, 1);
    this.echoTimelineLabel
      .setVisible(true)
      .setText(`MEMORY RECORDING  /  ${(stage.recordMs / 1000).toFixed(1)} SEC`);
    this.player.playInteraction();
    sfx.lever();
    this.game.events.emit(
      'hud:toast',
      stage.underfloor ? 'Two contacts wake beneath the floor.' : 'The car begins to remember.',
    );
  }

  finishEchoRecording() {
    const puzzle = this.tutorialPuzzle;
    const stage = this.getTutorialStage();
    if (puzzle.phase !== 'recording' || puzzle.frames.length < 2) return;

    puzzle.phase = 'playback';
    puzzle.playbackLeadUntil = stage.underfloor ? this.time.now + 900 : this.time.now;
    puzzle.playbackStartedAt = puzzle.playbackLeadUntil;
    puzzle.playbackCursor = 0;
    puzzle.lastPlaybackElapsed = -1;
    const recorder = this.interactables.find((it) => it.def.id === stage.recorderId);
    recorder?.sprite.setTexture('echo-recorder-playback');
    this.echoTimelineFill.setFillStyle(0x75d4cd).setScale(0.001, 1);
    this.echoTimelineLabel.setText('PAST SELF  /  REPLAYING');
    this.echoSprite.setVisible(this.activeWorldIndex === 0);
    this.echoReflection.setVisible(this.activeWorldIndex === 0);
    this.registry.set('tutorialPowerState', 'playback');
    sfx.checkpoint();
    this.game.events.emit('hud:toast', stage.underfloor ? 'Something moves below you.' : 'PAST is replaying.');
  }

  updateTutorialPuzzle(time, delta = 16) {
    if (LEVEL.tutorialPuzzle.mode === 'timetable') {
      this.timetablePuzzle?.update(time, delta);
      return;
    }
    const puzzle = this.tutorialPuzzle;
    const stage = this.getTutorialStage();
    const duration = stage.recordMs;

    if (puzzle.phase === 'recording') {
      const elapsed = Math.min(duration, time - puzzle.recordStartedAt);
      puzzle.frames.push({
        at: elapsed,
        x: this.player.x,
        y: this.player.y,
        lane: this.player.lane,
        facing: this.player.facing,
        texture: this.player.texture.key,
      });
      if (stage.underfloor) {
        stage.syncNodes.forEach((node, index) => {
          if (!puzzle.recordVisited[index] && Math.abs(this.player.x - node.x) < 32) {
            puzzle.recordVisited[index] = true;
            this.pulseTutorialDevice(this.tutorialSyncColumns[index].upper, 0xcaa66b);
            sfx.press();
            this.updateTutorialObjectiveMarker();
          }
        });
      }
      this.echoTimelineFill.setScale(Math.max(0.001, elapsed / duration), 1);
      this.echoTimelineLabel.setText(
        `MEMORY RECORDING  /  ${Math.max(0, (duration - elapsed) / 1000).toFixed(1)} SEC`,
      );
      if (elapsed >= duration) this.finishEchoRecording();
      return;
    }

    if (puzzle.phase !== 'playback') return;
    if (stage.underfloor && time < puzzle.playbackLeadUntil) {
      this.applyEchoFrame(puzzle.frames[0]);
      return;
    }
    const elapsed = (time - puzzle.playbackStartedAt) % duration;
    if (elapsed < puzzle.lastPlaybackElapsed) puzzle.playbackCursor = 0;
    puzzle.lastPlaybackElapsed = elapsed;
    while (
      puzzle.playbackCursor < puzzle.frames.length - 1 &&
      puzzle.frames[puzzle.playbackCursor + 1].at <= elapsed
    ) {
      puzzle.playbackCursor += 1;
    }
    const frame = puzzle.frames[puzzle.playbackCursor] || puzzle.frames[0];
    this.applyEchoFrame(frame);
    this.echoTimelineFill.setScale(Math.max(0.001, elapsed / duration), 1);

    const wasActive = puzzle.pastActive;
    puzzle.pastActive = stage.underfloor
      ? true
      : frame.lane === LANE_NEAR && Math.abs(frame.x - stage.plateX) < 28;
    if (puzzle.pastActive !== wasActive) {
      this.tutorialPressures[puzzle.stageIndex].setTexture(
        puzzle.pastActive ? 'pressure-pad-on' : 'pressure-pad-off',
      );
      if (puzzle.pastActive) sfx.checkpoint();
      this.refreshTutorialRouteState();
    }
    if (stage.underfloor) this.updateTutorialResonance(frame, time);
  }

  updateTutorialResonance(frame, time) {
    const puzzle = this.tutorialPuzzle;
    const stage = this.getTutorialStage();
    const targetIndex = stage.syncNodes.findIndex((_, index) => !puzzle.syncAligned[index]);
    if (targetIndex < 0) {
      puzzle.syncHotIndex = -1;
      this.refreshTutorialSyncVisuals();
      return;
    }
    const target = stage.syncNodes[targetIndex];
    const echoNear = Math.abs(frame.x - target.x) < 38;
    const playerNear =
      Math.abs(this.player.x - target.x) < 34 && Boolean(this.player.body?.blocked?.down);
    const hot = echoNear && playerNear;
    const previousHot = puzzle.syncHotIndex;
    puzzle.syncHotIndex = hot ? targetIndex : -1;
    if (hot) {
      if (!puzzle.syncHoldStartedAt) puzzle.syncHoldStartedAt = time;
      if (time - puzzle.syncHoldStartedAt >= 260) {
        puzzle.syncAligned[targetIndex] = true;
        puzzle.syncHotIndex = -1;
        puzzle.syncHoldStartedAt = 0;
        this.cameras.main.shake(130, 0.0025);
        this.pulseTutorialDevice(this.tutorialSyncColumns[targetIndex].lamp, 0x75d4cd);
        sfx.checkpoint();
        this.refreshTutorialRouteState();
        this.refreshTutorialSyncVisuals();
        this.updateTutorialObjectiveMarker();
      }
    } else {
      puzzle.syncHoldStartedAt = 0;
    }
    if (previousHot !== puzzle.syncHotIndex) this.refreshTutorialSyncVisuals();
  }

  applyEchoFrame(frame) {
    if (!frame) return;
    const stage = this.getTutorialStage();
    const texture = this.textures.exists(frame.texture) ? frame.texture : 'player-idle-0';
    this.echoSprite
      .setTexture(texture)
      .setPosition(frame.x, stage.underfloor ? 760 : frame.y)
      .setFlipX(frame.facing < 0)
      .setAlpha(stage.underfloor ? 0.46 : 0.2)
      .setScale(stage.underfloor ? 0.92 : 1)
      .setDepth(stage.underfloor ? 59 : LANES[LANE_NEAR].depth + 3)
      .setVisible(this.activeWorldIndex === 0);
    this.echoReflection
      .setTexture(texture)
      .setPosition(frame.x, 320 - (LANES[LANE_NEAR].baseY - frame.y) * 0.18)
      .setFlipX(frame.facing < 0)
      .setAlpha(stage.underfloor ? 0.22 : 0.58)
      .setVisible(this.activeWorldIndex === 0);
  }

  attemptTutorialSync(generator) {
    const puzzle = this.tutorialPuzzle;
    const stage = this.getTutorialStage();
    if (puzzle.phase === 'complete' || puzzle.phase === 'syncing') return;
    if (generator.def.stage !== puzzle.stageIndex) return;
    if (puzzle.phase === 'recording') {
      this.game.events.emit('hud:toast', 'Finish the recording first.');
      sfx.blocked();
      return;
    }
    if (puzzle.phase !== 'playback' || !puzzle.pastActive || !puzzle.routeActive) {
      this.failTutorialSync(generator);
      return;
    }

    puzzle.phase = 'syncing';
    puzzle.presentActive = true;
    generator.fired = true;
    generator.sprite.setTexture('hand-generator-on');
    this.player.playInteraction();
    this.registry.set('tutorialPowerState', 'syncing');
    this.echoTimelineLabel.setText('PAST + PRESENT  /  SYNCHRONIZED');
    const conductor = this.npcs.find((npc) => npc.def.id === 'caretaker');
    if (conductor && puzzle.stageIndex === LEVEL.tutorialPuzzle.stages.length - 1) {
      conductor.sprite.play('conductor-switch');
      conductor.sprite.once('animationcomplete-conductor-switch', () =>
        conductor.sprite.play('conductor-idle'),
      );
    }
    sfx.lever();
    this.game.events.emit(
      'hud:toast',
      puzzle.stageIndex === LEVEL.tutorialPuzzle.stages.length - 1
        ? 'The buried circuit reaches PRESENT. The conductor turns SERVICE.'
        : `Junction ${puzzle.stageIndex + 1} synchronized. The next partition is opening.`,
    );
    this.time.delayedCall(650, () => {
      if (stage === this.getTutorialStage() && puzzle.stageIndex < LEVEL.tutorialPuzzle.stages.length - 1) {
        this.completeTutorialJunction(generator);
      } else {
        this.completeTutorialPower(generator);
      }
    });
  }

  completeTutorialJunction(generator) {
    const puzzle = this.tutorialPuzzle;
    const completedIndex = puzzle.stageIndex;
    generator.fired = true;
    this.addScore(25, generator.sprite.x, generator.sprite.y - 48);
    sfx.checkpoint();

    this.playTutorialGateOpen(completedIndex, () => {
      puzzle.stageIndex = Math.min(completedIndex + 1, LEVEL.tutorialPuzzle.stages.length - 1);
      this.refreshPrologueScore();
      puzzle.phase = 'idle';
      puzzle.frames = [];
      puzzle.playbackCursor = 0;
      puzzle.pastActive = false;
      puzzle.presentActive = false;
      puzzle.routeActive = false;
      puzzle.poweredSegments = 0;
      puzzle.breakerActive = false;
      this.echoSprite.setVisible(false);
      this.echoReflection.setVisible(false);
      this.echoTimelineBg.setVisible(false);
      this.echoTimelineFill.setVisible(false);
      this.echoTimelineLabel.setVisible(false);
      this.tutorialGuideGraphics?.setVisible(false);
      this.registry.set('tutorialPowerState', `junction-${puzzle.stageIndex + 1}-ready`);
      this.refreshTutorialRouteState();
      this.setTutorialPuzzleVisible(this.activeWorldIndex === 0);
      this.updateTutorialObjectiveMarker();
      this.game.events.emit(
        'hud:toast',
        puzzle.stageIndex === 1
          ? 'The next car bends the remembered current.'
          : 'The windows go quiet. Something below begins to move.',
      );
    });
  }

  refreshPrologueScore() {
    if (this.prologueScoreReleased || this.prologueTransitionActive || this.skipPrologue || this.activeWorldIndex !== 0) return;
    const cue = this.tutorialPuzzle.stageIndex >= 3 ? 'resonance' : 'undertow';
    if (this.prologueScoreCue === cue) return;
    this.prologueScoreCue = cue;
    music.play(`prologue-${cue}`, {
      src: PROLOGUE_SCORE[cue],
      volume: cue === 'resonance' ? 0.42 : 0.34,
      fade: cue === 'resonance' ? 5.5 : 6.5,
      outFade: 5.5,
      dialogueDuckDb: -7,
      loop: true,
    });
  }

  failTutorialSync(generator) {
    const puzzle = this.tutorialPuzzle;
    puzzle.faultUntil = this.time.now + 720;
    this.registry.set('tutorialPowerState', 'error');
    generator.sprite.setTexture('hand-generator-on');
    this.time.delayedCall(150, () => generator.sprite.setTexture('hand-generator-off'));
    this.cameras.main.shake(150, 0.004);
    sfx.blocked();
    this.game.events.emit(
      'hud:toast',
      puzzle.pastActive && !puzzle.routeActive
        ? 'PAST power leaked into a dead rail. Follow the pulse and rotate the junctions.'
        : 'The present arrived before the past. Synchronization failed.',
    );
    this.time.delayedCall(720, () => {
      if (puzzle.phase !== 'complete' && puzzle.phase !== 'syncing') {
        this.refreshTutorialRouteState();
        this.registry.set(
          'tutorialPowerState',
          puzzle.routeActive ? 'past-routed' : puzzle.phase === 'idle' ? 'off' : puzzle.phase,
        );
      }
    });
  }

  completeTutorialPower(generator) {
    const puzzle = this.tutorialPuzzle;
    if (puzzle.phase !== 'syncing') return;
    puzzle.phase = 'complete';
    puzzle.serviceActive = true;
    this.tutorialGuideGraphics?.setVisible(false);
    this.refreshTutorialStageVisuals();
    this.registry.set('tutorialPowerState', 'complete');
    this.tutorialCarArt?.playPowerRestore();
    this.tutorialCompletionLight = this.addLight(
      generator.sprite.x,
      generator.sprite.y - 28,
      74,
      0x75d4cd,
      0.46,
      40,
    );
    this.cameras.main.shake(180, 0.0035);
    sfx.goal();
    this.addScore(50, generator.sprite.x, generator.sprite.y - 48);
    this.game.events.emit(
      'hud:toast',
      'Auxiliary power stable. Waiting for the memory process to terminate.',
    );
    this.time.delayedCall(1150, () => this.playEchoAnomaly());
  }

  playEchoAnomaly() {
    const puzzle = this.tutorialPuzzle;
    if (puzzle.phase !== 'complete') return;
    puzzle.anomalyActive = true;
    const faceRight = this.player.x >= this.echoSprite.x;
    [this.echoSprite, this.echoReflection].forEach((echo) => {
      echo.setTexture('player-idle-2').setFlipX(!faceRight).setVisible(this.activeWorldIndex === 0);
      this.tweens.add({
        targets: echo,
        alpha: echo === this.echoReflection ? 0.88 : 0.42,
        scaleX: echo.scaleX * 1.06,
        scaleY: echo.scaleY * 1.06,
        duration: 520,
        yoyo: true,
        repeat: 1,
        ease: 'Sine.easeInOut',
      });
    });
    this.echoTimelineLabel.setText('RECORDING ENDED  /  SUBJECT STILL PRESENT');
    this.game.events.emit('hud:toast', 'CONDUCTOR: The recording ended. It should not be looking at you.');
    this.time.delayedCall(1750, () => {
      if (puzzle.phase !== 'complete') return;
      this.playTutorialGateOpen(puzzle.stageIndex, () => {
        this.registry.set('tutorialPowerRestored', true);
        this.tutorialExitBlockedNotified = false;
        sfx.checkpoint();
        this.game.events.emit('hud:toast', 'The memory is severed. The next-car door unlocks.');
      });
    });
    this.time.delayedCall(2600, () => {
      puzzle.anomalyActive = false;
      this.tweens.add({
        targets: [this.echoSprite, this.echoReflection, this.echoTimelineBg, this.echoTimelineFill, this.echoTimelineLabel],
        alpha: 0,
        duration: 700,
        onComplete: () => {
          this.echoSprite.setVisible(false);
          this.echoReflection.setVisible(false);
          this.echoTimelineBg.setVisible(false).setAlpha(1);
          this.echoTimelineFill.setVisible(false).setAlpha(1);
          this.echoTimelineLabel.setVisible(false).setAlpha(1);
        },
      });
    });
  }

  seedTutorialEchoForQA(stageIndex = 0, pastReady = true, correctedRelays = 0) {
    const puzzle = this.tutorialPuzzle;
    puzzle.stageIndex = stageIndex;
    puzzle.stageComplete = LEVEL.tutorialPuzzle.stages.map((_, index) => index < stageIndex);
    const stage = this.getTutorialStage();
    const duration = stage.recordMs;
    const echoX = pastReady ? stage.plateX : stage.recorderX;
    puzzle.phase = 'playback';
    puzzle.frames = stage.underfloor
      ? [
          { at: 0, x: stage.recorderX, y: 432, lane: LANE_NEAR, facing: 1, texture: 'player-idle-0' },
          ...stage.syncNodes.map((node, index) => ({
            at: duration * (0.34 + index * 0.27),
            x: node.x,
            y: 432,
            lane: LANE_NEAR,
            facing: 1,
            texture: `player-walk-${index % 4}`,
          })),
          { at: duration, x: stage.generatorX - 30, y: 432, lane: LANE_NEAR, facing: 1, texture: 'player-idle-2' },
        ]
      : [
          { at: 0, x: echoX, y: 432, lane: LANE_NEAR, facing: 1, texture: 'player-idle-0' },
          { at: duration, x: echoX, y: 432, lane: LANE_NEAR, facing: 1, texture: 'player-idle-2' },
        ];
    puzzle.playbackStartedAt = this.time.now;
    puzzle.playbackCursor = 0;
    puzzle.lastPlaybackElapsed = -1;
    puzzle.pastActive = pastReady;
    puzzle.syncAligned = stage.underfloor
      ? stage.syncNodes.map((_, index) => index < correctedRelays)
      : [false, false];
    puzzle.recordVisited = stage.underfloor ? [true, true] : [false, false];
    puzzle.breakerActive = stage.underfloor && correctedRelays > 1;
    stage.relays.forEach((relay, index) => {
      const state = index < correctedRelays ? relay.correct : relay.initial;
      puzzle.relayStates[relay.id] = state;
      const interactable = this.interactables.find((it) => it.def.id === relay.id);
      interactable?.sprite.setTexture(`circuit-relay-${state}`);
    });
    const breaker = this.interactables.find((it) => it.def.id === stage.breakerId);
    breaker?.sprite.setTexture(puzzle.breakerActive ? 'lever-on' : 'lever-off');
    this.tutorialPressures.forEach((pressure, index) =>
      pressure.setTexture(index === stageIndex && pastReady ? 'pressure-pad-on' : 'pressure-pad-off'),
    );
    this.echoTimelineBg.setVisible(true);
    this.echoTimelineFill.setVisible(true).setFillStyle(0x75d4cd).setScale(0.001, 1);
    this.echoTimelineLabel.setVisible(true).setText('PAST SELF  /  REPLAYING');
    const recorder = this.interactables.find((it) => it.def.id === stage.recorderId);
    recorder?.sprite.setTexture('echo-recorder-playback');
    this.applyEchoFrame(puzzle.frames[0]);
    this.refreshTutorialRouteState();
    this.updateTutorialObjectiveMarker();
  }

  raiseBridge() {
    const targetY = LEVEL.bridge.y;
    this.cameras.main.shake(420, 0.005);

    this.bridgePlanks.forEach((plank, i) => {
      this.time.delayedCall(i * 70, () => {
        plank.body.enable = true;
        plank.setVisible(true);
        plank.setAlpha(0);
        plank.y = targetY - 28;
        sfx.bump();
        // The lip is a separate object, so it has to ride the same tween.
        const targets = plank.rim ? [plank, plank.rim] : [plank];
        if (plank.rim) plank.rim.setVisible(true).setAlpha(0);
        this.tweens.add({
          targets,
          y: targetY,
          alpha: 1,
          duration: 170,
          ease: 'Back.easeOut',
          onComplete: () => plank.body.updateFromGameObject(),
        });
      });
    });
  }

  // ------------------------------------------------------------------ scores

  addScore(amount, x, y) {
    this.registry.set('score', this.registry.get('score') + amount);

    const label = this.add
      .text(x, y, `+${amount}`, {
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: '15px',
        color: '#fff3c4',
        stroke: '#3a2c05',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setDepth(60);

    this.tweens.add({
      targets: label,
      y: y - 34,
      alpha: 0,
      duration: 620,
      ease: 'Quad.easeOut',
      onComplete: () => label.destroy(),
    });
  }

  // ------------------------------------------------------------ life / death

  damage(respawnPlayer) {
    if (this.finished) return;

    const lives = this.registry.get('lives') - 1;
    this.registry.set('lives', lives);
    this.cameras.main.flash(180, 220, 60, 60);

    if (lives <= 0) {
      this.gameOver();
      return;
    }
    if (respawnPlayer) this.respawn();
  }

  respawn() {
    this.player.resetTo(this.checkpoint.x, this.checkpoint.y, this.checkpoint.lane);
    this.registry.set('lane', this.checkpoint.lane);
    this.cameras.main.flash(220, 255, 255, 255);
  }

  gameOver() {
    this.finished = true;
    this.player.frozen = true;
    this.player.setVelocity(0, 0);
    sfx.gameover();
    this.game.events.emit('hud:gameover');
    this.time.delayedCall(2200, () => this.scene.restart());
  }

  win() {
    if (this.finished) return;
    this.finished = true;
    this.player.frozen = true;
    this.player.setVelocity(0, 0);
    sfx.goal();
    this.game.events.emit('hud:win', {
      score: this.registry.get('score'),
      coins: this.registry.get('coins'),
      choice: this.registry.get('finalChoice'),
      memory: this.registry.get('memory'),
      witnesses: this.registry.get('witnesses'),
    });
  }

  // ------------------------------------------------------------------ update

  update(time, delta) {
    if (Phaser.Input.Keyboard.JustDown(this.keys.restart)) {
      this.scene.restart();
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.debug)) {
      const on = !this.physics.world.drawDebug;
      this.physics.world.drawDebug = on;
      this.physics.world.debugGraphic.setVisible(on);
      if (!on) this.physics.world.debugGraphic.clear();
    }

    this.updateParallax();
    if (this.finished) return;

    if (this.dialogueState) {
      this.updateDialogueInput();
      return;
    }

    // Optional archive conversations use the same forward-moving HUD grammar
    // as NPC dialogue. They own E/1/2 until the current exchange closes, so a
    // response cannot also fire a puzzle control or close its suitcase.
    if (this.narrativeProps?.dialogueActive) {
      // Keep the small prop reveal animation moving while the player reads.
      // The old early return left drawers half-open until the conversation
      // ended, making the evidence and the dialogue disagree on screen.
      this.narrativeProps.update();
      this.narrativeProps.updateDialogueInput();
      return;
    }

    const input = this.readInput();
    if (
      this.prologueArrivalGrace
      && (input.left || input.right || input.jumpPressed)
    ) {
      // First deliberate input after the departure hand-off ends arrival
      // protection (with a small buffer so the same frame can't deal damage).
      this.prologueArrivalGrace = false;
      this.player.invulnUntil = time.now + 400;
    }
    // Lane keys are a world-1 verb. In the tutorial car W/S are swallowed so
    // S can be the hold-to-look-down verb without a lane fight (pure gate,
    // test-locked in tests/tutorial/underfloorView.test.mjs).
    const laneGate = gateTutorialLaneInput({
      activeWorldIndex: this.activeWorldIndex,
      laneBack: input.laneBack,
      laneFront: input.laneFront,
    });
    input.laneBack = laneGate.laneBack;
    input.laneFront = laneGate.laneFront;
    // Relay cabinet close-up: ESC or E hands the close back to the puzzle
    // (it no-ops until the door+camera have fully opened). World interaction
    // and the tutorial follow camera are already gated on the same flag, and
    // the close path restores movement, HUD and cursor on every branch.
    if (this.relayCloseupActive) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.esc) || input.interact) {
        this.timetablePuzzle?.closeRelayCloseup();
        // The same E edge must not fall through to updateInteractables() and
        // immediately reopen the world device we just closed. ESC never had
        // this problem, but the panel explicitly advertises both controls.
        input.interact = false;
      }
    }
    // Section V reads the held state of E every frame, not just its edge.
    this.inputState = input;
    this.player.update(delta, input);
    this.updateTutorialCamera(input, delta);
    this.updateUnderfloorHintPrompt(delta);
    this.updateTutorialPuzzle(time, delta);
    this.updateTutorialRoutePulse(time);
    this.updateTutorialObjectiveMarker();
    this.updateWorld();
    this.updateEnemies();
    // Narrative prop point-and-click modal: E/ESC closes, world input pauses.
    if (this.narrativeProps?.isModalOpen()) {
      if (input.interact || Phaser.Input.Keyboard.JustDown(this.keys.esc)) {
        this.narrativeProps.closeInspectionModal();
        input.interact = false;
      }
      return;
    }

    this.narrativeProps?.update();
    this.updateInteractables(input);
    this.updateMarkers();
    this.resolveEmbedding();
    this.checkFall();
  }

  updateParallax() {
    const sx = this.cameras.main.scrollX;
    const t = this.time.now;

    // The backdrop itself parallaxes via its scrollFactor, not here.
    this.fogHigh.tilePositionX = sx * 0.06 + t * 0.004;
    this.fogLow.tilePositionX = sx * 0.68 + t * 0.009;
    this.fogDrift.tilePositionX = sx * 0.95 + t * 0.016;
    this.foreground.tilePositionX = sx * 1.25;
    if (this.prologueTransitionActive && this.activeWorldIndex === 0) {
      this.backdropChunks.forEach((chunk) => {
        chunk.x = (chunk.backdropBaseX ?? chunk.x) - this.departureScroll;
      });
      this.departureStreaks?.forEach((streak, index) => {
        streak.x = (([120, 510, 820, 260, 690, 70, 430, 870][index] - this.departureScroll * (0.7 + index * 0.04) + 1200) % 1200) - 180;
      });
    }
  }

  updateWorld() {
    if (this.previewWorldIndex !== null) return;
    const x = this.player.x;
    const tutorialExit = STORY_WORLDS[1]?.startX ?? 510;
    if (this.activeWorldIndex === 0) {
      const stage = this.getTutorialStage();
      if (x >= stage.endX - 10 && !this.tutorialPuzzle.stageComplete[this.tutorialPuzzle.stageIndex]) {
        this.player.body.reset(stage.endX - 12, this.player.y);
        this.player.setAccelerationX(0);
        if (!this.tutorialExitBlockedNotified) {
          this.tutorialExitBlockedNotified = true;
          sfx.blocked();
          this.cameras.main.shake(100, 0.003);
          this.game.events.emit(
            'hud:toast',
            `Junction ${this.tutorialPuzzle.stageIndex + 1} is still out of phase.`,
          );
        }
        return;
      }
      if (x < stage.endX - 80) this.tutorialExitBlockedNotified = false;
    }
    if (
      this.activeWorldIndex === 0 &&
      x >= tutorialExit - 10 &&
      !this.registry.get('tutorialPowerRestored')
    ) {
      this.player.body.reset(tutorialExit - 12, this.player.y);
      this.player.setAccelerationX(0);
      if (!this.tutorialExitBlockedNotified) {
        this.tutorialExitBlockedNotified = true;
        sfx.blocked();
        this.cameras.main.shake(100, 0.003);
        this.game.events.emit('hud:toast', 'The door needs PAST, PRESENT, and SERVICE power synchronized.');
      }
      return;
    }
    let index = 0;
    for (let i = 0; i < STORY_WORLDS.length; i += 1) {
      if (x >= STORY_WORLDS[i].startX) index = i;
    }
    if (index !== this.activeWorldIndex) this.switchWorld(index);
  }

  updateEnemies() {
    const list = this.enemies.getChildren().slice();
    list.forEach((e) => {
      if (!e.active || !e.body) return;

      if (e.x <= e.minX) e.dir = 1;
      else if (e.x >= e.maxX) e.dir = -1;
      // Turn at walls too, so enemies do not keep shoving at a ledge.
      else if (e.body.blocked.left) e.dir = 1;
      else if (e.body.blocked.right) e.dir = -1;

      e.setVelocityX(58 * e.dir);
      e.setFlipX(e.dir < 0);

      if (e.y > LANES[e.laneId].killY + 400) e.destroy();
    });
  }

  updateMarkers() {
    const p = this.player;

    if (!this.checkpointTaken && p.lane === this.checkpointSprite.laneId) {
      if (Math.abs(p.x - this.checkpointSprite.x) < 40) {
        this.checkpointTaken = true;
        this.checkpoint = {
          x: this.checkpointSprite.x,
          y: LANES[this.checkpointSprite.laneId].baseY - 60,
          lane: this.checkpointSprite.laneId,
        };
        this.checkpointSprite.setTint(0x63d98d);
        sfx.checkpoint();
        this.game.events.emit('hud:toast', 'Checkpoint reached.');
      }
    }

    if (p.lane === LANE_NEAR && Math.abs(p.x - this.goalSprite.x) < 42) {
      if (this.registry.get('finalChoice')) {
        this.win();
      } else if (!this.finalReminderShown) {
        this.finalReminderShown = true;
        this.game.events.emit('hud:toast', 'The gate is waiting for your answer. Find the last person.');
      }
    }
  }

  /**
   * Push the player out if they end up *inside* a solid.
   *
   * Arcade ignores any separation larger than the frame's movement — an
   * anti-teleport guard — so a body that becomes deeply embedded is never
   * pushed back out and simply slides through. That's reachable by clipping a
   * a ledge's corner on a short jump. Resting contact leaves near-zero
   * penetration on one axis, so requiring depth on *both* axes catches only
   * genuine embedding.
   */
  resolveEmbedding() {
    const p = this.player;
    if (p.transiting) return;

    const b = p.body;
    const children = this.solids.getChildren();

    for (let i = 0; i < children.length; i++) {
      const s = children[i];
      if (s.laneId !== p.lane || !s.body || !s.body.enable) continue;

      const sb = s.body;
      const overlapX = Math.min(b.right, sb.right) - Math.max(b.x, sb.x);
      const overlapY = Math.min(b.bottom, sb.bottom) - Math.max(b.y, sb.y);
      if (Math.min(overlapX, overlapY) <= 4) continue;

      // Eject along whichever axis is the shorter way out.
      if (overlapX < overlapY) {
        const dx = (b.center.x < sb.center.x ? -1 : 1) * overlapX;
        p.x += dx;
        b.position.x += dx;
        b.prev.x += dx;
        b.velocity.x = 0;
      } else {
        const dy = (b.center.y < sb.center.y ? -1 : 1) * overlapY;
        p.y += dy;
        b.position.y += dy;
        b.prev.y += dy;
        b.velocity.y = 0;
      }
      b.updateCenter();
      return; // one correction per frame is plenty
    }
  }

  checkFall() {
    const p = this.player;
    if (p.transiting) return;
    if (p.y > LANES[p.lane].killY) this.damage(true);
  }
}
