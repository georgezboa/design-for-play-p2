import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../constants.js';
import { devParams, resolveDevChapterIndex } from '../devMode.js';
import { buildAnimations, buildTextures } from '../textures.js';
import { STORY_WORLDS } from '../story.js';
import { queueWorldAsset, resolvePreviewWorldIndex } from '../worlds/worldAssets.js';
import mechanicalTableBaseUrl from '../assets/tutorial/mechanical-table/base-plate.png?url';
import mechanicalPipeUrl from '../assets/tutorial/mechanical-table/vendor/pipe-tileset-cc0.png?url';
import { consumePendingLaunch } from '../shell/saveSystem.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // Only the initial panorama is queued here. Adjacent worlds are streamed
    // by GameScene so the browser never uploads all source panoramas to the GPU
    // at once.
    const bar = this.add.graphics().setDepth(10);
    const label = this.add
      .text(GAME_W / 2, GAME_H / 2 + 26, 'loading the first memory', {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: '13px',
        color: '#4a545f',
      })
      .setOrigin(0.5);

    this.load.on('progress', (p) => {
      bar.clear();
      bar.lineStyle(1, 0x2a3038, 1);
      bar.strokeRect(GAME_W / 2 - 110, GAME_H / 2 - 6, 220, 8);
      bar.fillStyle(0x8e1f24, 1);
      bar.fillRect(GAME_W / 2 - 109, GAME_H / 2 - 5, 218 * p, 6);
    });

    this.load.once('complete', () => {
      bar.destroy();
      label.destroy();
    });

    this.pendingLaunch = typeof sessionStorage === 'undefined'
      ? null
      : sessionStorage.getItem('nightfall.pendingLaunch.v1');
    const params = devParams();
    const directCarIndex = params.get('car') === '2' ? 2 : null;
    const chapterIndex = resolveDevChapterIndex(STORY_WORLDS);
    const parkourPreview = this.pendingLaunch?.startsWith('chapter-2') || chapterIndex === 1
      || params.get('chapter') === 'cyberpunk'
      || params.get('qa')?.startsWith('parkour-');
    const previewIndex = resolvePreviewWorldIndex(STORY_WORLDS);
    const initialWorld = STORY_WORLDS[directCarIndex ?? (parkourPreview ? 1 : previewIndex ?? 0)];
    queueWorldAsset(this.load, initialWorld.texture);
    this.load.image('mechanical-table-base', mechanicalTableBaseUrl);
    this.load.spritesheet('mechanical-pipe-parts', mechanicalPipeUrl, {
      frameWidth: 16,
      frameHeight: 16,
    });
  }

  create() {
    buildTextures(this);
    buildAnimations(this);
    const params = devParams();
    const pendingLaunch = consumePendingLaunch();
    if (pendingLaunch?.startsWith('chapter-2')) {
      this.scene.start('CyberpunkParkour', {
        checkpoint: pendingLaunch === 'chapter-2-midpoint' ? 'midpoint' : 'start',
      });
      return;
    }
    if (params.get('car') === '2') {
      this.scene.start('Game', { startWorldIndex: 2 });
      return;
    }
    const chapterPreview = resolveDevChapterIndex(STORY_WORLDS) === 1
      || params.get('chapter') === 'cyberpunk'
      || params.get('qa')?.startsWith('parkour-');
    this.scene.start(chapterPreview ? 'CyberpunkParkour' : 'Game');
  }
}
