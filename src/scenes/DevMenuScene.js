import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../constants.js';
import { LEVEL } from '../level.js';
import { STORY_WORLDS } from '../story.js';
import { enterDevRoute } from '../devMode.js';

// The chapter select only exists in `npm run dev`. main.js never puts this
// scene in the scene list otherwise, so nothing here can be reached from a
// shipped build.

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

const DIM = '#4d5764';
const BODY = '#7d8896';
const BRIGHT = '#d7e2ee';
const ACCENT = '#c9a227';

// ---------------------------------------------------------------------------
// ADDING YOUR CHAPTER
//
// A chapter that lives in the main build needs nothing here: add your world to
// STORY_WORLDS in src/story.js and it appears in the right-hand column with a
// `?chapter=N` route. Sub-sections of the Prologue come from
// LEVEL.tutorialPuzzle.stages the same way.
//
// A chapter built as its own entry point — its own HTML page and main.js, the
// pattern car03 / car04 / car06 use — is not part of this scene graph, so it
// cannot be reached by a query string. List it below instead. The main dev
// server serves every HTML page in the project root, so `href` just works;
// there is no need to start that car's own Vite config to reach it from here.
const STANDALONE_SLICES = [
  {
    label: 'CHAPTER 1  //  NIGHT SERVICE · ORANGE CARRIAGE',
    detail: 'Latest playable narrative interior: the Conductor, the power-restoration route, and the retro transit car.',
    href: '/?chapter=0',
  },
  {
    label: 'CHAPTER 2  //  CYBERPUNK PARKOUR',
    detail: 'Direct development route for the movable-route, ladder and flying-car slice.',
    href: '/?chapter=cyberpunk',
  },
  {
    label: 'CHAPTER 3  //  ECHO CITY 3D',
    detail: 'Current playable Echo City investigation package with its own 3D runtime.',
    href: '/car03-3d.html',
  },
  {
    label: 'CHAPTER 6  //  ALL WORLDS AT ONCE',
    detail: 'Isolated slice, own entry point. The pairwise world-fusion spine.',
    href: '/car06.html',
  },
  {
    label: 'CHAPTER 4  //  THE PAINTED COUNTRY',
    detail: 'Playable. Route the ink, wash the three wall archives, then choose the mark the car remembers.',
    href: '/painted-country.html',
  },
  {
    label: 'CHAPTER 5  //  THE MUSEUM OF ONE ANSWER',
    detail: 'The Labyrinth, eight-key collapse gauntlet, and Final Archive exit.',
    href: '/museum-3d.html',
  },
  {
    label: 'CHAPTER 5  //  DOOR 1 · LABYRINTH',
    detail: 'Direct development route for the eight-key statue chase and return artifact.',
    href: '/labyrinth.html',
  },
  {
    label: 'CHAPTER 5  //  DOOR 2 · BORROWED GRID',
    detail: 'Direct development route for the three-round public-power service shift.',
    href: '/borrowed-grid.html',
  },
  {
    label: 'CHAPTER 5  //  ECHO CITY REVIEW',
    detail: 'Direct Chapter 5 reconstruction route. The optional Lev character review remains query-gated.',
    href: '/museum-3d.html?beat=echo&standalone=1',
  },
];
// ---------------------------------------------------------------------------

// The Prologue is the only chapter with authored sub-sections today, so the
// left column is its junctions and the right column is the car order. Keeping
// them apart also keeps world identity separate from sequence order — the car
// order is still expected to move.
const CHAPTER_WORDS = [
  'PROLOGUE',
  'ONE',
  'TWO',
  'THREE',
  'FOUR',
  'FIVE',
  'SIX',
  'SEVEN',
  'EIGHT',
  'NINE',
  'TEN',
];

const COLUMN_X = [64, 500];
const COLUMN_W = 396;
const HEADING_Y = 168;
const ROW_TOP = 200;
const ROW_STEP = 18;
const GROUP_GAP = 10; // compact gap: the left column includes the active chapter routes
// The page shell lets the canvas overflow a short window, so the detail block
// is measured from the longest column rather than pinned to the bottom edge.
const DETAIL_GAP = 18;
const DETAIL_MIN_Y = 440;

export default class DevMenuScene extends Phaser.Scene {
  constructor() {
    super('DevMenu');
  }

  create() {
    this.entries = this.buildEntries();
    this.index = 0;
    this.launching = false;

    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x05070c).setOrigin(0);
    this.drawFrame();
    this.buildHeader();
    this.buildColumns();
    this.buildDetail();
    this.bindInput();
    this.refresh();
  }

  // ----------------------------------------------------------------- content

  // Every row is derived from the same data the game itself runs on, so a new
  // world or a new Prologue stage shows up here without editing this scene.
  buildEntries() {
    const entries = [
      {
        column: 0,
        label: 'FULL RUN',
        detail: 'Start at the first frame, exactly as npm run prod would.',
        query: '',
      },
      ...LEVEL.tutorialPuzzle.stages.map((stage, i) => ({
        column: 0,
        label: stage.title,
        detail: stage.lesson ?? `Warp into ${stage.id} with the earlier junctions already cleared.`,
        query: `?qa=timetable-${i + 1}`,
      })),
      ...STANDALONE_SLICES.map((slice, i) => ({
        column: 0,
        heading: i === 0 ? 'STANDALONE SLICES  ·  OWN ENTRY POINT' : null,
        label: slice.label,
        detail: slice.detail,
        href: slice.href,
      })),
    ];

    STORY_WORLDS.forEach((world, i) => {
      if (i === 0) return; // the Prologue is the left column
      entries.push({
        column: 1,
        label: `${CHAPTER_WORDS[i] ?? `CHAPTER ${i}`}  //  ${world.title}`,
        detail: world.subtitle,
        query: `?chapter=${i}`,
      });
    });

    return entries;
  }

  // -------------------------------------------------------------- appearance

  drawFrame() {
    const g = this.add.graphics();
    g.lineStyle(1, 0x1d242e, 1);
    g.strokeRect(28, 28, GAME_W - 56, GAME_H - 56);
    g.lineStyle(1, 0x141a22, 1);
    g.strokeRect(34, 34, GAME_W - 68, GAME_H - 68);
  }

  label(x, y, text, size, color, origin = 0) {
    return this.add
      .text(x, y, text, { fontFamily: MONO, fontSize: `${size}px`, color, letterSpacing: 2 })
      .setOrigin(origin, 0);
  }

  buildHeader() {
    this.label(COLUMN_X[0], 58, 'NIGHTFALL  //  DEV BUILD', 11, DIM);
    this.label(COLUMN_X[0], 78, 'CHAPTER SELECT', 22, BRIGHT);
    this.label(
      COLUMN_X[0],
      112,
      'W / S  or  ↑ ↓   move      A / D  or  ← →   column      ENTER  start      `  back here',
      11,
      BODY,
    );
    this.label(
      COLUMN_X[0],
      130,
      'this screen exists only in `npm run dev`  ·  `npm run prod` starts the real run',
      11,
      DIM,
    );

    this.label(COLUMN_X[0], HEADING_Y, 'PROLOGUE  ·  BEFORE DEPARTURE', 12, ACCENT);
    this.label(COLUMN_X[1], HEADING_Y, 'CHAPTERS  ·  BACKWARD THROUGH THE TRAIN', 12, ACCENT);

    const rule = this.add.graphics();
    rule.lineStyle(1, 0x232b36, 1);
    rule.lineBetween(COLUMN_X[0], HEADING_Y + 18, COLUMN_X[0] + COLUMN_W, HEADING_Y + 18);
    rule.lineBetween(COLUMN_X[1], HEADING_Y + 18, COLUMN_X[1] + COLUMN_W, HEADING_Y + 18);
  }

  buildColumns() {
    const rowInColumn = [0, 0];
    const nextY = [ROW_TOP, ROW_TOP];

    this.entries.forEach((entry, i) => {
      const x = COLUMN_X[entry.column];
      if (entry.heading) {
        nextY[entry.column] += GROUP_GAP;
        this.label(x, nextY[entry.column], entry.heading, 11, ACCENT);
        nextY[entry.column] += ROW_STEP;
      }

      const row = rowInColumn[entry.column];
      rowInColumn[entry.column] += 1;

      const y = nextY[entry.column];
      nextY[entry.column] += ROW_STEP;
      entry.row = row;

      entry.marker = this.label(x, y, '▸', 12, ACCENT);
      entry.text = this.label(x + 18, y, entry.label, 12, BODY);

      // A generous invisible strip so the mouse does not have to find the
      // glyphs themselves.
      entry.hit = this.add
        .rectangle(x - 6, y - 6, COLUMN_W, ROW_STEP - 2, 0xffffff, 0)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true });
      entry.hit.on('pointerover', () => {
        this.index = i;
        this.refresh();
      });
      entry.hit.on('pointerdown', () => {
        this.index = i;
        this.refresh();
        this.launch();
      });
    });

    this.detailY = Math.max(DETAIL_MIN_Y, Math.max(...nextY) + DETAIL_GAP);
  }

  buildDetail() {
    const y = this.detailY;
    const g = this.add.graphics();
    g.lineStyle(1, 0x232b36, 1);
    g.lineBetween(COLUMN_X[0], y, GAME_W - 64, y);

    this.detailText = this.label(COLUMN_X[0], y + 14, '', 12, BRIGHT);
    this.detailText.setWordWrapWidth(GAME_W - 128);
    this.routeText = this.label(COLUMN_X[0], y + 40, '', 11, DIM);
  }

  // ------------------------------------------------------------------- input

  bindInput() {
    const keys = this.input.keyboard.addKeys({
      up: 'UP',
      down: 'DOWN',
      left: 'LEFT',
      right: 'RIGHT',
      w: 'W',
      s: 'S',
      a: 'A',
      d: 'D',
      enter: 'ENTER',
      space: 'SPACE',
      e: 'E',
    });
    this.input.keyboard.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE', 'ENTER']);

    const on = (key, handler) => keys[key].on('down', handler);
    ['up', 'w'].forEach((key) => on(key, () => this.move(-1)));
    ['down', 's'].forEach((key) => on(key, () => this.move(1)));
    ['left', 'a'].forEach((key) => on(key, () => this.moveColumn(0)));
    ['right', 'd'].forEach((key) => on(key, () => this.moveColumn(1)));
    ['enter', 'space', 'e'].forEach((key) => on(key, () => this.launch()));
  }

  // Movement runs down the selected column and wraps, which reads far better
  // than a flat list because the two columns are different lengths.
  move(step) {
    const column = this.entries[this.index].column;
    const inColumn = this.entries.filter((entry) => entry.column === column);
    const at = inColumn.indexOf(this.entries[this.index]);
    const next = inColumn[(at + step + inColumn.length) % inColumn.length];
    this.index = this.entries.indexOf(next);
    this.refresh();
  }

  moveColumn(column) {
    const current = this.entries[this.index];
    if (current.column === column) return;
    const inColumn = this.entries.filter((entry) => entry.column === column);
    if (!inColumn.length) return;
    const target = inColumn[Math.min(current.row, inColumn.length - 1)];
    this.index = this.entries.indexOf(target);
    this.refresh();
  }

  refresh() {
    this.entries.forEach((entry, i) => {
      const selected = i === this.index;
      entry.marker.setVisible(selected);
      entry.text.setColor(selected ? BRIGHT : BODY);
    });

    const entry = this.entries[this.index];
    this.detailText.setText(entry.detail ?? '');
    this.routeText.setText(
      entry.href
        ? `page    ${entry.href}`
        : entry.query
          ? `route   ${entry.query}`
          : 'route   /   (no query string)',
    );
  }

  launch() {
    if (this.launching) return;
    this.launching = true;
    const entry = this.entries[this.index];
    this.cameras.main.fadeOut(140, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      // A standalone slice is a different page with its own Phaser game; the
      // only way in is to leave this one.
      if (entry.href) {
        window.location.href = entry.href;
        return;
      }
      enterDevRoute(entry.query);
      this.scene.start('Boot');
    });
  }
}
