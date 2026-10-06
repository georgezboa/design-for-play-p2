// Museum3DApp owns renderer, camera, shared state, interaction, and
// transitions. Each authored space owns one root THREE.Group and the
// build/enter/update/exit/dispose lifecycle.
//
// The shipping chapter is two spaces and two framed sub-worlds:
//   lobby (Room 101) ⇄ archive corridor, walked without re-clicking;
//   the lobby's central case opens OBJECT PENDING CLASSIFICATION
//   (one-answer.html), Door 4 opens the Labyrinth (labyrinth.html);
//   when BOTH are done — either order — the Archivist withdraws the wing and
//   the corridor collapses toward the Final Archive door.
// Echo City is a dev-only reconstruction (`?beat=echo`): it is never built,
// preloaded or downloaded in the shipping route.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { Chapter05Model, createInitialState } from './state/chapter05Model.js';
import { FirstPersonController } from './player/FirstPersonController.js';
import { StaticCollisionWorld } from './player/StaticCollisionWorld.js';
import { InteractionSystem } from './systems/InteractionSystem.js';
import { DialogueSystem } from './systems/DialogueSystem.js';
import { AudioGuide } from './systems/AudioGuide.js';
import { ArchiveCardView } from './systems/ArchiveCardView.js';
import { TransitionDirector } from './systems/TransitionDirector.js';
import { EmbeddedDirectionExhibit } from './systems/EmbeddedDirectionExhibit.js';
import { Chapter05DirectionProgress } from './state/chapter05DirectionProgress.js';
import { CHAPTER05_DIRECTIONS } from './directions/directionRegistry.js';
import { isAtLabyrinthDoor } from './directions/directionDoorways.js';
import { createMuseumMaterialLibrary } from './assets/MuseumMaterials.js';
import { ServiceLobby } from './scenes/ServiceLobby.js';
import { ArchiveCorridor } from './scenes/ArchiveCorridor.js';
import {
  COLLAPSE_BLACK_HOLD_MS,
  COLLAPSE_ENTRY,
  COLLAPSE_STRINGS,
} from './state/collapseGauntlet.js';
import { resolveFinalBossDestination } from '../../shell/finalBossRoute.js';
import { preloadChapter } from '../../shell/chapterPreloader.js';
import { navigateAfterCinematic } from '../../shell/gameFlow.js';
import { music } from '../../shared/musicDirector.js';
import { CHAPTER5_SCORE } from './chapter05Score.js';
import { DEV_MODE, devParam } from '../../devMode.js';
import { readSettings } from '../../shell/saveSystem.js';
import { LobbyObjectiveTag, lobbyObjective } from './systems/LobbyObjective.js';
import {
  LOW_FILL,
  applyRendererQuality,
  applySceneQuality,
  createQualityGovernor,
  isSoftwareRendererName,
  lowFillScale,
  lowTierWantsFxaa,
  rendererName,
  probeSoftwareRenderer,
  qualityPreference,
  syncLowMaterials,
} from './systems/QualityTier.js';

// Redraw interval behind an open archive card (see _shouldRenderFrame).
export const CARD_FRAME_MS = 250;

export const LOBBY_SPAWN = Object.freeze({ x: -6.5, z: 0, yaw: -Math.PI / 2 });
export const CORRIDOR_SPAWN = Object.freeze({ x: 9.5, z: 0, yaw: -Math.PI / 2 });
export const LOBBY_RETURN_SPAWN = Object.freeze({ x: 6.8, z: 0, yaw: Math.PI / 2 });

export const REVEAL_LINES = Object.freeze([
  { speaker: null, text: 'The service desk is inside the case now. Its register lies open at the last entry: BUTCH.' },
  { speaker: 'ARCHIVIST', text: 'Two claims. One person. Then the archive will file the clerk instead.' },
]);

function buildLabyrinthKeyRing(materials) {
  const root = new THREE.Group();
  root.name = 'first-person-labyrinth-eight-key-ring';
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.027, 8, 28), materials.brass);
  ring.rotation.x = Math.PI / 2;
  root.add(ring);
  root.userData.keys = [];
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2;
    const key = new THREE.Group();
    key.name = `labyrinth-key-${index + 1}`;
    key.position.set(Math.cos(angle) * 0.2, Math.sin(angle) * 0.12 - 0.13, 0);
    key.rotation.z = angle - Math.PI / 2;
    const stone = new THREE.MeshStandardMaterial({ color: 0x25222a, roughness: 0.9, metalness: 0.08 });
    const head = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.016, 7, 14), stone);
    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.19, 0.025), stone);
    stem.position.y = -0.12;
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.03, 0.025), stone);
    tooth.position.set(0.02, -0.21, 0);
    key.add(head, stem, tooth);
    root.add(key);
    root.userData.keys.push(key);
  }
  return root;
}

export class Museum3DApp {
  constructor({
    container, lockOverlay, promptEl, subtitleEl, coordinateEl, fadeEl,
    directionRoot, directionFrame, directionClose, directionTitle, directionStatus,
    directionTranslation, directionMode, directionCopy, directionBegin,
    minimapRoot = null, minimapCanvas = null,
    initialState, captureMode = false, standaloneDirectionId = null, includeEchoCity = false,
  }) {
    this.container = container;
    this.lockOverlay = lockOverlay;
    this.coordinateEl = coordinateEl;
    this.standaloneDirectionId = standaloneDirectionId;
    this._standaloneComplete = false;
    // Echo City is dev-only: a production build can never ask for it.
    this.includeEchoCity = DEV_MODE && includeEchoCity === true;
    this._minimapElements = { root: minimapRoot, canvas: minimapCanvas };

    this.model = new Chapter05Model(initialState ?? createInitialState());
    const seed = this.model.getSnapshot();
    this.directionProgress = new Chapter05DirectionProgress({
      completed: {
        [CHAPTER05_DIRECTIONS.LABYRINTH]: seed.labyrinth?.complete === true || seed.collapse?.started === true,
        [CHAPTER05_DIRECTIONS.ONE_ANSWER]: seed.exhibit?.solved === true || seed.collapse?.started === true,
      },
    });

    // Keeping the drawing buffer is useful for automated canvas captures, but
    // is expensive during normal play. QA opts into the slower capture path.
    this.captureMode = captureMode;
    // FXAA on the LOW tier (see _renderFrame), set once the context exists.
    this.lowAntialias = false;
    // Adaptive quality (alpha A3-7, systems/QualityTier.js). A software
    // rasteriser is known before the renderer exists, so it never gets MSAA.
    const probe = probeSoftwareRenderer(document);
    let preference = 'auto';
    try { preference = qualityPreference(readSettings()); } catch { preference = 'auto'; }
    this.quality = createQualityGovernor({ software: probe.software, preference });
    this.quality.state.rendererName = probe.name;
    this._qualityCache = new Map();
    this._qualityApplied = null;
    this._qualitySweepAt = 0;
    this._highPixelRatio = captureMode ? 1 : 1.35;
    this.renderer = new THREE.WebGLRenderer({
      antialias: !probe.software,
      preserveDrawingBuffer: captureMode,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this._highPixelRatio));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.92;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);
    this.lowAntialias = lowTierWantsFxaa({
      software: probe.software || isSoftwareRendererName(rendererName(this.renderer.getContext())),
      contextAntialias: Boolean(this.renderer.getContextAttributes()?.antialias),
    });

    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this._environmentTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.environment = this._environmentTexture;
    this.camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.05, 220);
    this.scene.add(this.camera);
    this.carriedRoot = new THREE.Group();
    this.carriedRoot.name = 'carried-key-ring-root';
    this.carriedRoot.position.set(0.42, -0.34, -0.78);
    this.carriedRoot.rotation.set(-0.12, 0.2, 0.04);
    this.camera.add(this.carriedRoot);
    this.collapseKeyRing = buildLabyrinthKeyRing(createMuseumMaterialLibrary());
    this.collapseKeyRing.position.set(-0.05, -0.06, 0);
    this.collapseKeyRing.rotation.set(-0.1, 0.12, 0.16);
    this.collapseKeyRing.scale.setScalar(0.44);
    this.collapseKeyRing.visible = false;
    this.carriedRoot.add(this.collapseKeyRing);

    this.controller = new FirstPersonController(this.camera, this.renderer.domElement, null);
    this.interaction = new InteractionSystem(this.camera, promptEl);
    this.dialogue = new DialogueSystem(subtitleEl);
    this.audioGuide = new AudioGuide(this.dialogue);
    this.cards = new ArchiveCardView();
    this.objective = new LobbyObjectiveTag(document);
    this._pendingCaseOpened = false;
    this._welcomeStartedAt = null;
    this.director = new TransitionDirector({
      fadeEl,
      onNeedRelock: () => this._showLockOverlay('CLICK TO RESUME'),
    });
    this.directionExhibit = new EmbeddedDirectionExhibit({
      root: directionRoot,
      iframe: directionFrame,
      closeButton: directionClose,
      titleEl: directionTitle,
      statusEl: directionStatus,
      translationRoot: directionTranslation,
      modeEl: directionMode,
      copyEl: directionCopy,
      beginButton: directionBegin,
      progress: this.directionProgress,
      onOpen: () => {
        this.controller.unlock();
        this.controller.enabled = false;
        this.interaction.enabled = false;
        this._setMuseumCanvasHidden(true);
      },
      onClose: ({ directionId, completed }) => {
        this._setMuseumCanvasHidden(false);
        this._onDirectionClosed(directionId, completed);
      },
    });
    // Compatibility for the existing QA text hook.
    this.labyrinth = this.directionExhibit;

    // ---- scenes -------------------------------------------------------------
    this.scenes = new Map();
    this.activeSceneName = null;
    for (const SceneCtl of [ServiceLobby, ArchiveCorridor]) this._buildScene(new SceneCtl());

    // ---- input routing ---------------------------------------------------------
    this._simulatedLock = false; // QA/headless drive mode; never set by gameplay
    this._hasEnteredMuseum = false;
    this._interactHeld = false;
    this._mouseInteractHeld = false;
    this._atLabyrinthDoor = () => isAtLabyrinthDoor(this.controller.position, this.model.getSnapshot().phase);
    this._enterLabyrinthFromDoor = () => {
      if (!this._atLabyrinthDoor()
        || this.directionExhibit.opened
        || this.director.isBusy
        || this.cards.isOpen
        || this.dialogue.isChoosing) return false;
      // Looking straight at something else (e.g. the Chapter 4 case across
      // the corridor) keeps that object's E; Door 4 only owns E when it is
      // what you aim at, or when nothing is aimed at.
      const aimed = this.interaction.aimed;
      if (aimed && aimed.id !== `direction-${CHAPTER05_DIRECTIONS.LABYRINTH}`) return false;
      if (this.directionProgress.getSnapshot().completed[CHAPTER05_DIRECTIONS.LABYRINTH]) return false;
      if (this.dialogue.isPlaying) this.dialogue.clear();
      return this.openDirection(CHAPTER05_DIRECTIONS.LABYRINTH);
    };
    window.addEventListener('keydown', (e) => {
      if (this.directionExhibit.opened) return;
      if (e.code === 'Space') e.preventDefault();
      if (this.cards.isOpen) {
        if ((e.code === 'KeyE' || e.code === 'Enter') && !e.repeat) {
          e.preventDefault();
          this.cards.close();
        }
        return;
      }
      if (this.dialogue.isChoosing) {
        if (e.code === 'Digit1' || e.code === 'Numpad1') this.dialogue.choose(0);
        else if (e.code === 'Digit2' || e.code === 'Numpad2') this.dialogue.choose(1);
        return;
      }
      if (e.code === 'KeyE' || e.code === 'Enter') {
        this._interactHeld = true;
        if (e.repeat) return;
        // A browser can briefly report pointer lock as inactive while still
        // routing keys. Door 4 is the critical transition, so its proximity
        // check owns E before the pointer-lock guard.
        if (this._enterLabyrinthFromDoor()) return;
        if (this.scenes.get('lobby')?.tryBreakBlackKnifeGlass?.()) return;
        if (!this.controller.isActive && !this._simulatedLock) return;
        if (this.dialogue.isPlaying && !this.interaction.focused) this.dialogue.advance();
        else if (!this.interaction.activate() && this.dialogue.isPlaying) this.dialogue.advance();
      }
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'KeyE' || e.code === 'Enter') this._interactHeld = false;
    });
    window.addEventListener('blur', () => {
      this._interactHeld = false;
      this._mouseInteractHeld = false;
    });

    // Pointer lock consumes the first click as the entry gesture. Once inside,
    // holding the primary mouse button mirrors holding E.
    this.renderer.domElement.addEventListener('mousedown', (event) => {
      if (event.button !== 0 || this.directionExhibit.opened) return;
      if (this.cards.isOpen) { this.cards.close(); return; }
      // Drag-look fallback after a framed exhibit: the first click is a real
      // user gesture, so take the mouse back silently.
      if (this.controller.usesDragLook) this.renderer.domElement.requestPointerLock?.()?.catch?.(() => {});
      if (this._enterLabyrinthFromDoor()) return;
      if (this.scenes.get('lobby')?.tryBreakBlackKnifeGlass?.()) return;
      if (!this.controller.isActive && !this._simulatedLock) return;
      this._mouseInteractHeld = true;
      if (!this.interaction.activate({ pointer: true }) && this.dialogue.isPlaying) this.dialogue.advance();
    });
    window.addEventListener('mouseup', (event) => {
      if (event.button === 0) this._mouseInteractHeld = false;
    });

    this.controller.onLockChange((locked) => {
      if (locked) {
        const first = !this._hasEnteredMuseum;
        this._hasEnteredMuseum = true;
        this.lockOverlay.classList.add('hidden');
        if (first && this.activeSceneName === 'lobby') {
          this.scenes.get('lobby').playWelcome();
          this._welcomeStartedAt = performance.now();
        }
      } else if (!this.director.isBusy && !this.directionExhibit.opened) {
        this._showLockOverlay('CLICK TO RESUME');
      }
      this.controller.enabled = locked && !this.cards.isOpen;
      this.interaction.enabled = locked;
    });
    this.controller.enabled = false;
    this.interaction.enabled = false;

    lockOverlay.addEventListener('click', () => {
      // The entry click is the first browser-legal audio gesture.
      this._syncChapterScore();
      this.audioGuide.resume();
      this.controller.lock();
    });

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    this.clock = new THREE.Clock();
    this._sceneGuards = { corridor: false, echo: false, museum: false, collapse: false };

    // The pause menu's settings can force the tier ('low' / 'high' / 'auto').
    window.addEventListener('nightfall:settings', (event) => {
      const next = this.quality.setPreference(qualityPreference(event.detail ?? {}));
      if (next) this.applyQuality(next);
    });
  }

  // While a framed exhibit or wing covers the view, the museum's own canvas
  // leaves the page's composite altogether (alpha round 4: the one-answer
  // exhibit ran at 2.8 fps framed, 10 fps on its own, on software GL).
  _setMuseumCanvasHidden(hidden) {
    const canvas = this.renderer?.domElement;
    if (!canvas?.style) return;
    canvas.style.visibility = hidden ? 'hidden' : '';
    this._lastCardFrameAt = 0;
  }

  // An archive card leaves the museum visible behind its scrim, but nothing
  // there needs 60 frames a second: redraw it a few times a second instead.
  _shouldRenderFrame(now = performance.now()) {
    if (!this.cards.isOpen) return true;
    if (now - (this._lastCardFrameAt ?? 0) < CARD_FRAME_MS) return false;
    this._lastCardFrameAt = now;
    return true;
  }

  // One museum frame. A context without MSAA on the LOW tier ends on an FXAA
  // pass (round 3). Not on a software rasteriser: measured headless on
  // SwiftShader at 960×540, the composer's two extra full-screen passes cost
  // 35–50 ms a frame (a half-float target) or 17–33 ms (8-bit, with banding),
  // more than the whole lobby frame, so there `lowAntialias` stays off.
  _renderFrame() {
    if (this._qualityApplied !== 'low' || !this.lowAntialias) {
      this.renderer.render(this.scene, this.camera);
      return;
    }
    if (!this._lowComposer) {
      const composer = new EffectComposer(this.renderer);
      composer.renderToScreen = true;
      this._lowRenderPass = new RenderPass(this.scene, this.camera);
      this._fxaaPass = new ShaderPass(FXAAShader);
      composer.addPass(this._lowRenderPass);
      composer.addPass(new OutputPass());
      composer.addPass(this._fxaaPass);
      this._lowComposer = composer;
      this._lowComposerSize = '';
    }
    const ratio = this.renderer.getPixelRatio();
    if (!this._lowComposerScratch) this._lowComposerScratch = new THREE.Vector2();
    const size = this.renderer.getSize(this._lowComposerScratch);
    const key = `${size.x}x${size.y}@${ratio}`;
    if (key !== this._lowComposerSize) {
      this._lowComposerSize = key;
      this._lowComposer.setPixelRatio(ratio);
      this._lowComposer.setSize(size.x, size.y);
      this._fxaaPass.material.uniforms.resolution.value.set(1 / (size.x * ratio), 1 / (size.y * ratio));
    }
    this._lowRenderPass.camera = this.camera;
    this._lowComposer.render();
  }

  // Apply a render tier to the renderer and every built space. Safe to call
  // again: only objects added since the last pass change.
  applyQuality(tier = this.quality.tier) {
    const Lambert = THREE.MeshLambertMaterial;
    for (const ctl of this.scenes.values()) applySceneQuality(ctl.root, tier, { Lambert, cache: this._qualityCache });
    applySceneQuality(this.scene, tier, { Lambert, cache: this._qualityCache });
    applyRendererQuality(this.renderer, this.scene, tier, {
      software: this.quality.state.software,
      environment: this._activeEnvironment ?? this._environmentTexture,
      devicePixelRatio: window.devicePixelRatio || 1,
      highPixelRatio: this._highPixelRatio,
    });
    this._qualityApplied = tier;
    if (tier === 'high') this._qualityCache.clear();
    this._syncLowFill();
    if (this.coordinateEl) this.coordinateEl.dataset.quality = tier;
    // museum-3d.html's HUD drops its filters and animations on this hook.
    if (typeof document !== 'undefined') document.documentElement.dataset.museumQuality = tier;
  }

  // The low tier's stand-in for the rect lights and the room environment.
  _syncLowFill(phase = this.model.getSnapshot().phase) {
    const low = this._qualityApplied === 'low';
    if (!this._lowFill && !low) return;
    if (!this._lowFill) {
      const hemisphere = new THREE.HemisphereLight(0xfff3dc, 0xb8a888, 0);
      const overhead = new THREE.DirectionalLight(0xfff1dd, 0);
      overhead.position.set(0, 10, 0);
      overhead.target.position.set(0, 0, 0);
      this._lowFill = new THREE.Group();
      this._lowFill.name = 'low-quality-fill';
      this._lowFill.add(hemisphere, overhead, overhead.target);
      this._lowFill.userData = { hemisphere, overhead };
    }
    if (low && this._lowFill.parent !== this.scene) this.scene.add(this._lowFill);
    if (!low && this._lowFill.parent) this._lowFill.parent.remove(this._lowFill);
    const scale = low ? lowFillScale(this.activeSceneName, phase) : 0;
    this._lowFill.userData.hemisphere.intensity = LOW_FILL.hemisphere * scale;
    this._lowFill.userData.overhead.intensity = LOW_FILL.overhead * scale;
  }

  // The lobby's first objective tag: after the welcome (or 8 s into it),
  // until the pending case has been opened once.
  _syncObjective(snapshot) {
    const started = this._welcomeStartedAt;
    const welcomeDone = this._hasEnteredMuseum && (started === null
      ? !this.dialogue.isPlaying
      : (!this.dialogue.isPlaying || performance.now() - started > 8000));
    const text = this.activeSceneName === 'lobby'
      ? lobbyObjective(snapshot, { opened: this._pendingCaseOpened, welcomeDone })
      : null;
    this.objective.update(text, {
      hidden: this.cards.isOpen || this.directionExhibit.opened || this.dialogue.isChoosing || Boolean(globalThis.NIGHTFALL_PAUSED),
    });
  }

  // Once per frame: feed the governor, keep late-built objects on the tier.
  _stepQuality(frameMs) {
    const next = this.quality.sample(frameMs);
    if (next) this.applyQuality(next);
    if (this._qualityApplied !== 'low') return;
    this._syncLowFill();
    const now = performance.now();
    if (now - this._qualitySweepAt > 1000) {
      this._qualitySweepAt = now;
      applySceneQuality(this.scene, 'low', { Lambert: THREE.MeshLambertMaterial, cache: this._qualityCache });
    }
    syncLowMaterials(this._qualityCache);
  }

  _sceneContext(collisionWorld) {
    return {
      renderer: this.renderer,
      camera: this.camera,
      model: this.model,
      interaction: this.interaction,
      dialogue: this.dialogue,
      audioGuide: this.audioGuide,
      controller: this.controller,
      collisionWorld,
      directionProgress: this.directionProgress,
      goToCorridor: () => this.goToCorridor(),
      goBackToLobby: () => this.goBackToLobby(),
      goToEchoCity: () => this.goToEchoCity(),
      returnToMuseum: () => this.returnToMuseum(),
      openDirection: (directionId) => this.openDirection(directionId),
      showCard: (card, options) => this.showCard(card, options),
      syncCarriedArtifact: () => {},
      isInteractHeld: () => this._interactHeld === true || this._mouseInteractHeld === true,
      completeCollapse: () => this.completeCollapse(),
    };
  }

  _buildScene(ctl) {
    const collisionWorld = new StaticCollisionWorld();
    ctl.build(this._sceneContext(collisionWorld));
    ctl.collisionWorld = collisionWorld;
    this.scenes.set(ctl.name, ctl);
    return ctl;
  }

  // Dev only: the sealed Echo City reconstruction and its minimap are loaded
  // on demand, so the shipping bundle never fetches its ~38 MB of models.
  async _buildEchoCity() {
    if (!this.includeEchoCity || this.scenes.has('echo')) return;
    const [{ EchoCityWalkingSim, NIGHT_ROUND_STOPS }, { EchoCityMinimap }] = await Promise.all([
      import('./scenes/EchoCityWalkingSim.js'),
      import('./systems/EchoCityMinimap.js'),
    ]);
    this.minimap = new EchoCityMinimap({ ...this._minimapElements, stops: NIGHT_ROUND_STOPS });
    const echo = this._buildScene(new EchoCityWalkingSim());
    await echo.prepare?.();
  }

  showCard(card, { onClose = null } = {}) {
    if (!card) return false;
    this.controller.enabled = false;
    this.interaction.hidden = true;
    this.dialogue.clear();
    this.audioGuide.punchClack?.();
    return this.cards.show(card, {
      onClose: () => {
        this.interaction.hidden = false;
        this.controller.enabled = this.controller.isActive || this._simulatedLock;
        onClose?.();
      },
    });
  }

  _showLockOverlay(text) {
    const title = this.lockOverlay.querySelector('.title');
    if (title) title.hidden = this._hasEnteredMuseum;
    this.lockOverlay.classList.toggle('resume', this._hasEnteredMuseum);
    const hint = this.lockOverlay.querySelector('.hint');
    if (hint) {
      hint.innerHTML = `<b>${text}</b><br/>WASD — WALK · MOUSE — LOOK · SPACE — JUMP<br/>E — INTERACT · ESC — PAUSE`;
    }
    this.lockOverlay.classList.remove('hidden');
  }

  // QA drive mode for environments where pointer lock is unavailable
  // (headless CI). Gameplay never sets this; the real flow stays click-to-lock.
  setSimulatedLock(on) {
    this._simulatedLock = on;
    if (on) this._hasEnteredMuseum = true;
    this.controller.enabled = on;
    this.interaction.enabled = on;
    if (on) this.lockOverlay.classList.add('hidden');
    else this.lockOverlay.classList.remove('hidden');
  }

  getActiveScene() {
    return this.activeSceneName ? this.scenes.get(this.activeSceneName) : null;
  }

  setActiveScene(name) {
    const current = this.getActiveScene();
    if (current) this.scene.remove(current.root);
    this.activeSceneName = name;
    const next = this.scenes.get(name);
    this.scene.add(next.root);
    this.scene.background = next.background;
    this.scene.fog = next.root.userData.fog ?? null;
    this._activeEnvironment = Object.hasOwn(next.root.userData, 'environment')
      ? next.root.userData.environment
      : this._environmentTexture;
    this.scene.environment = this._qualityApplied === 'low' ? null : this._activeEnvironment;
    this.renderer.toneMappingExposure = next.root.userData.rendererExposure ?? 0.92;
    this.controller.collisionWorld = next.collisionWorld;
    this.interaction.clear();
    next.registerInteractions();
    this._syncChapterScore();
    if (this._qualityApplied === 'low') this.applyQuality('low');
  }

  _syncChapterScore() {
    const phase = this.model.getSnapshot().phase;
    const key = phase === 'collapse'
      ? 'collapse'
      : this.activeSceneName === 'echo'
        ? 'echo'
        : this.activeSceneName === 'corridor'
          ? 'corridor'
          : 'lobby';
    const cue = CHAPTER5_SCORE[key];
    music.play(cue.id, { ...cue, loop: true, outFade: key === 'collapse' ? 1.2 : 2, dialogueDuckDb: -7 });
  }

  // ---- route actions (the only doorways between spaces) -----------------------

  // Walking through the archive-wing doors keeps the mouse: no click, no
  // overlay, just a short fade.
  async goToCorridor() {
    if (this._sceneGuards.corridor) return;
    this._sceneGuards.corridor = true;
    try {
      await this.director.transition(this, 'corridor', {
        fromPhase: 'lobby',
        toPhase: 'corridor',
        action: { type: 'enterCorridor' },
        spawn: CORRIDOR_SPAWN,
        preserveControl: true,
      });
    } finally {
      this._sceneGuards.corridor = false;
    }
  }

  async goBackToLobby() {
    if (this._sceneGuards.corridor || this.director.isBusy) return;
    this._sceneGuards.corridor = true;
    try {
      await this.director.transition(this, 'lobby', {
        fromPhase: 'corridor',
        toPhase: 'lobby',
        action: { type: 'leaveCorridor' },
        spawn: LOBBY_RETURN_SPAWN,
        preserveControl: true,
      });
    } finally {
      this._sceneGuards.corridor = false;
    }
  }

  // ---- framed sub-worlds -------------------------------------------------------

  openDirection(directionId) {
    // Door 4 is the last long playable stretch before the collapse. Begin the
    // boss warm-up here so the Labyrinth plus the collapse fill the cache;
    // _maybeStartCollapse safely reuses this job.
    if (directionId === CHAPTER05_DIRECTIONS.LABYRINTH) {
      preloadChapter(resolveFinalBossDestination().preloadChapterId);
    }
    const opened = this.directionExhibit.open(directionId);
    if (opened && directionId === CHAPTER05_DIRECTIONS.ONE_ANSWER) this._pendingCaseOpened = true;
    return opened;
  }

  _onDirectionClosed(directionId, completed) {
    // Take the mouse straight back. The iframe's last key press is a user
    // activation for this page too; if the browser still refuses, the
    // controller falls back to drag-look and the next click re-locks.
    this.controller.enabled = true;
    this.interaction.enabled = true;
    this.controller.lock();
    if (!completed) return;
    if (directionId === CHAPTER05_DIRECTIONS.ONE_ANSWER) this._revealLostDesk();
    else if (directionId === CHAPTER05_DIRECTIONS.LABYRINTH) this._fileLabyrinth();
  }

  // The exhibit refused the one answer: back in 3D, the lost desk.
  async _revealLostDesk() {
    const result = this.model.dispatch({ type: 'solveExhibit' });
    if (!result.changed) return false;
    const lobby = this.scenes.get('lobby');
    if (this.activeSceneName === 'lobby') {
      await this.director.fade(true);
      lobby.enter(this.model.getSnapshot());
      // turn toward the case: the desk, its lamp and its ringing phone
      const p = this.controller.position;
      this.controller.setPose(p.x, p.z, Math.atan2(-(1.5 - p.x), -(0 - p.z)), -0.12);
      await this.director.fade(false);
    }
    this.audioGuide.phoneRing();
    const both = this.model.getSnapshot().labyrinth.complete;
    this.dialogue.play([
      ...REVEAL_LINES,
      ...(both ? [] : [{ speaker: 'ARCHIVIST', text: 'One door remains open, at the end of the wing.' }]),
    ], { onComplete: () => { if (both) this._maybeStartCollapse(); } });
    return true;
  }

  // Door 4 filed: the eight keys come out with Butch.
  _fileLabyrinth() {
    this.model.dispatch({ type: 'labyrinthComplete' });
    this._syncCollapseKeyRing(this.model.getSnapshot());
    if (!this._maybeStartCollapse()) {
      this.audioGuide.sayArchivist(['Eight keys, filed to you. One object is still pending, in Room 101.']);
    }
  }

  // The collapse needs both halves, in either order.
  _maybeStartCollapse() {
    const state = this.model.getSnapshot();
    if (!state.exhibit.solved || !state.labyrinth.complete) return false;
    if (!['lobby', 'corridor'].includes(state.phase) || this._sceneGuards.collapse) return false;
    preloadChapter(resolveFinalBossDestination().preloadChapterId);
    if (state.phase === 'corridor') {
      if (this.director.isBusy) return false;
      const result = this.model.dispatch({ type: 'startCollapse' });
      if (!result.changed) return false;
      this.getActiveScene()?.enter(this.model.getSnapshot());
      this.controller.setPose(COLLAPSE_ENTRY.x, COLLAPSE_ENTRY.z, COLLAPSE_ENTRY.yaw);
      this._syncChapterScore();
      this._syncCollapseKeyRing(this.model.getSnapshot());
      return true;
    }
    // From the lobby: the floor shudders, then the wing is withdrawn around
    // Butch and he stands in the corridor as it comes down.
    this._sceneGuards.collapse = true;
    this.audioGuide.collapseImpact({ weight: 'heavy' });
    window.setTimeout(async () => {
      try {
        await this.director.transition(this, 'corridor', {
          fromPhase: 'lobby',
          toPhase: 'collapse',
          action: { type: 'startCollapse' },
          spawn: COLLAPSE_ENTRY,
          preserveControl: true,
        });
        this._syncCollapseKeyRing(this.model.getSnapshot());
      } finally {
        this._sceneGuards.collapse = false;
      }
    }, 900);
    return true;
  }

  async completeCollapse() {
    if (this._chapterComplete || this.model.getSnapshot().phase !== 'collapse') return false;
    const result = this.model.dispatch({ type: 'collapseJump' });
    if (!result.changed) return false;
    this._chapterComplete = true;
    // Freeze one authoritative decision before the blackout: preloading and
    // navigation must agree even if storage changes during the hold.
    const finalBoss = resolveFinalBossDestination();
    this._interactHeld = false;
    this._mouseInteractHeld = false;
    this.audioGuide.stopCollapseScore();
    this.controller.enabled = false;
    this.interaction.enabled = false;
    this.dialogue.clear();
    const completion = this.director.fadeEl.querySelector('.chapter-completion');
    await this.director.fade(true);
    await new Promise((resolve) => window.setTimeout(resolve, COLLAPSE_BLACK_HOLD_MS));
    if (completion) {
      completion.innerHTML = `<div>${COLLAPSE_STRINGS.completeLine}</div><strong>${COLLAPSE_STRINGS.chapterComplete}</strong><small>“The archive does not issue duplicates.”</small>`;
      completion.classList.add('visible');
    }
    if (devParam('qa-no-redirect') !== '1') {
      await navigateAfterCinematic(finalBoss.cinematicId, finalBoss.cinematicPath, finalBoss.route, {
        label: `MUSEUM TO ${finalBoss.title}`,
        preloadChapterId: finalBoss.preloadChapterId,
        requirePreloadReady: true,
      });
    }
    return true;
  }

  // ---- dev-only Echo City reconstruction ---------------------------------------

  async goToEchoCity() {
    if (!this.scenes.has('echo') || this._sceneGuards.echo) return false;
    this._sceneGuards.echo = true;
    try {
      const { ECHO_CITY_ENTRY } = await import('./scenes/EchoCityWalkingSim.js');
      await this.director.transition(this, 'echo', {
        fromPhase: 'corridor', toPhase: 'echo-city', action: { type: 'enterEchoCity' },
        spawn: ECHO_CITY_ENTRY.spawn, occlude: false, preserveControl: true,
      });
    } finally {
      this._sceneGuards.echo = false;
    }
    return true;
  }

  async returnToMuseum() {
    if (this.standaloneDirectionId === CHAPTER05_DIRECTIONS.ECHO_CITY) {
      if (this._standaloneComplete) return false;
      this._standaloneComplete = true;
      this.dialogue.play([{ speaker: null, text: 'Echo City reconstruction complete (dev preview).' }]);
      return true;
    }
    return false;
  }

  // ---- per-frame ---------------------------------------------------------------

  _syncCollapseKeyRing(snapshot) {
    const collapse = snapshot.collapse;
    const carried = snapshot.phase === 'collapse'
      ? collapse.labyrinthKeys
      : (snapshot.labyrinth?.complete ? 8 : 0);
    this.collapseKeyRing.visible = carried > 0 && this.activeSceneName !== 'echo';
    this.collapseKeyRing.userData.keys?.forEach((key, index) => { key.visible = index < carried; });
    if (this.collapseKeyRing.visible) {
      const swing = Math.sin(this.clock.elapsedTime * (this.controller.isMoving ? 7.5 : 1.4));
      this.collapseKeyRing.rotation.z = 0.16 + swing * (this.controller.isMoving ? 0.07 : 0.018);
    }
  }

  _syncRuntimeCoordinates(snapshot) {
    if (!this.coordinateEl) return;
    const x = this.controller.position.x;
    const z = this.controller.position.z;
    const doorReady = isAtLabyrinthDoor(this.controller.position, snapshot.phase);
    this.coordinateEl.dataset.doorReady = String(doorReady);
    this.coordinateEl.textContent = [
      `X ${x.toFixed(2)} · MAP-Y(Z) ${z.toFixed(2)} · ${snapshot.phase.toUpperCase()} STATE · ${(this.activeSceneName ?? 'NONE').toUpperCase()} SCENE`,
      doorReady ? 'DOOR 4 · IN RANGE' : 'DOOR 4 · OUT OF RANGE',
    ].join('\n');
  }

  async start() {
    if (this.includeEchoCity) await this._buildEchoCity();
    const name = this._initialSceneName();
    this.setActiveScene(name);
    this.getActiveScene().enter(this.model.getSnapshot());
    this._applyInitialSpawn();
    if (this.quality.tier === 'low') this.applyQuality('low');

    // Frame-to-frame time of museum frames only: a pause, a hidden tab or a
    // framed exhibit breaks the chain instead of reading as a slow frame.
    let lastFrameAt = null;
    this.renderer.setAnimationLoop(() => {
      const frameStart = performance.now();
      const measurable = !globalThis.NIGHTFALL_PAUSED && !this.directionExhibit.opened && !document.hidden;
      if (measurable && lastFrameAt !== null) this._stepQuality(frameStart - lastFrameAt);
      lastFrameAt = measurable ? frameStart : null;
      // Wall-clock time down to 10 fps (alpha round 4; weak laptops run the
      // museum at 15-25 fps and a 50 ms cap slowed walking and the collapse).
      const dt = Math.min(this.clock.getDelta(), 0.1);
      if (globalThis.NIGHTFALL_PAUSED) {
        this.objective.update(null);
        this._renderFrame();
        return;
      }
      const snapshot = this.model.getSnapshot();
      this._syncChapterScore();
      this.interaction.hidden = this.cards.isOpen || this.directionExhibit.opened;
      // A framed exhibit covers the whole view with an opaque bezel: stop
      // drawing the museum behind it so the framed page gets the frame budget.
      if (this.directionExhibit.opened) {
        this.interaction.update(); // applies `hidden`: no tag over the frame
        this.objective.update(null);
        this.dialogue.update(dt);
        return;
      }
      // Movement in steps of at most 50 ms, so a slow frame cannot carry the
      // body through a thin wall or a hazard's edge.
      const steps = Math.max(1, Math.ceil(dt / 0.05));
      for (let i = 0; i < steps; i += 1) this.controller.update(dt / steps);
      this._syncRuntimeCoordinates(snapshot);
      const active = this.getActiveScene();
      if (active) active.update(dt, snapshot);
      this._syncCollapseKeyRing(snapshot);
      if (this.minimap) {
        this.minimap.update({
          active: this.activeSceneName === 'echo' && !this.directionExhibit.opened,
          player: this.controller.position,
          yaw: this.controller.getYaw(),
          record: snapshot.echoRecord,
          ...(active?.getMinimapState?.() ?? {}),
        });
      }
      this.interaction.update();
      this.dialogue.update(dt);
      this._syncObjective(snapshot);
      music.setDialogueActive(this.dialogue.isPlaying);
      if (this._shouldRenderFrame(frameStart)) this._renderFrame();
    });
  }

  _initialSceneName() {
    const phase = this.model.getSnapshot().phase;
    if (phase === 'corridor' || phase === 'collapse') return 'corridor';
    if (phase === 'echo-city' && this.scenes.has('echo')) return 'echo';
    return 'lobby';
  }

  async _applyInitialSpawn() {
    const s = this.model.getSnapshot();
    if (s.phase === 'corridor') this.controller.setPose(CORRIDOR_SPAWN.x, CORRIDOR_SPAWN.z, CORRIDOR_SPAWN.yaw);
    else if (s.phase === 'collapse') this.controller.setPose(COLLAPSE_ENTRY.x, COLLAPSE_ENTRY.z, COLLAPSE_ENTRY.yaw);
    else if (s.phase === 'echo-city' && this.scenes.has('echo')) {
      const { ECHO_CITY_ENTRY } = await import('./scenes/EchoCityWalkingSim.js');
      const { x, z, yaw } = ECHO_CITY_ENTRY.spawn;
      this.controller.setPose(x, z, yaw);
    } else this.controller.setPose(LOBBY_SPAWN.x, LOBBY_SPAWN.z, LOBBY_SPAWN.yaw);
  }
}
