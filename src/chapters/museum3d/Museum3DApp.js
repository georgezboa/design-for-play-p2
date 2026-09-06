// Museum3DApp owns renderer, camera, shared state, interaction, and
// transitions. Each authored space owns one root THREE.Group and the
// build/enter/update/exit/dispose lifecycle (work package §3.2).

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Chapter05Model, createInitialState } from './state/chapter05Model.js';
import { FirstPersonController } from './player/FirstPersonController.js';
import { StaticCollisionWorld } from './player/StaticCollisionWorld.js';
import { InteractionSystem } from './systems/InteractionSystem.js';
import { DialogueSystem } from './systems/DialogueSystem.js';
import { AudioGuide } from './systems/AudioGuide.js';
import { TransitionDirector } from './systems/TransitionDirector.js?v=door4-state-sync-20260813-1';
import { EmbeddedDirectionExhibit } from './systems/EmbeddedDirectionExhibit.js';
import { EchoCityMinimap } from './systems/EchoCityMinimap.js';
import { Chapter05DirectionProgress } from './state/chapter05DirectionProgress.js';
import { CHAPTER05_DIRECTIONS, PLAYABLE_DIRECTION_ORDER, directionDefinition } from './directions/directionRegistry.js';
import { isAtLabyrinthDoor } from './directions/directionDoorways.js';
import { animateReturnArtifact, createReturnArtifact } from './assets/ReturnArtifacts.js';
import { createMuseumMaterialLibrary } from './assets/MuseumMaterials.js';
import { ServiceLobby } from './scenes/ServiceLobby.js?v=door4-state-sync-20260813-1';
import { ArchiveCorridor } from './scenes/ArchiveCorridor.js';
import { ECHO_CITY_ENTRY, EchoCityWalkingSim, NIGHT_ROUND_STOPS } from './scenes/EchoCityWalkingSim.js';
import { getEchoWorkFeedback } from './systems/EchoCityWorkFeedback.js';
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

function buildCarriedNightKit() {
  const root = new THREE.Group();
  root.name = 'first-person-night-kit';
  const canvas = new THREE.MeshStandardMaterial({ color: 0x27353c, roughness: 0.92, metalness: 0.02 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x11191d, roughness: 0.86, metalness: 0.04 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xb78a42, roughness: 0.46, metalness: 0.68 });
  const skin = new THREE.MeshStandardMaterial({ color: 0x8b6956, roughness: 0.9, metalness: 0 });
  const add = (geometry, material, x, y, z) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    root.add(mesh);
    return mesh;
  };
  add(new THREE.BoxGeometry(0.62, 0.40, 0.24), canvas, 0, 0, 0);
  add(new THREE.BoxGeometry(0.54, 0.18, 0.035), dark, 0, -0.055, 0.138);
  add(new THREE.TorusGeometry(0.18, 0.026, 7, 18, Math.PI), dark, 0, 0.225, 0).rotation.z = Math.PI;
  for (const x of [-0.17, 0.17]) add(new THREE.BoxGeometry(0.045, 0.32, 0.035), dark, x, 0, 0.145);
  add(new THREE.BoxGeometry(0.09, 0.07, 0.035), brass, 0, -0.01, 0.16);
  const forearm = add(new THREE.CapsuleGeometry(0.075, 0.33, 4, 8), skin, 0.31, -0.26, -0.04);
  forearm.rotation.z = -0.58;
  return root;
}

function buildCarriedLevRadio() {
  const root = new THREE.Group();
  root.name = 'first-person-pavel-radio';
  const body = new THREE.MeshStandardMaterial({ color: 0x26343a, roughness: 0.82, metalness: 0.18 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0e1518, roughness: 0.9, metalness: 0.04 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xa77c3f, roughness: 0.48, metalness: 0.56 });
  const lamp = new THREE.MeshStandardMaterial({ color: 0xdca34b, emissive: 0xdca34b, emissiveIntensity: 1.6, roughness: 0.4 });
  const add = (geometry, material, x, y, z) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    root.add(mesh);
    return mesh;
  };
  add(new THREE.BoxGeometry(0.34, 0.52, 0.18), body, 0, 0, 0);
  add(new THREE.BoxGeometry(0.23, 0.17, 0.022), dark, 0, 0.07, 0.102);
  for (let i = -2; i <= 2; i++) add(new THREE.BoxGeometry(0.018, 0.12, 0.012), brass, i * 0.04, 0.07, 0.12);
  add(new THREE.BoxGeometry(0.035, 0.47, 0.035), brass, 0.12, 0.47, 0);
  add(new THREE.SphereGeometry(0.035, 10, 8), lamp, -0.11, -0.16, 0.105);
  return root;
}

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
  constructor({ container, lockOverlay, promptEl, subtitleEl, coordinateEl, minimapRoot, minimapCanvas, fadeEl, directionRoot, directionFrame, directionClose, directionTitle, directionStatus, directionTranslation, directionMode, directionCopy, directionBegin, initialState, captureMode = false, standaloneDirectionId = null }) {
    this.container = container;
    this.lockOverlay = lockOverlay;
    this.coordinateEl = coordinateEl;
    this.standaloneDirectionId = standaloneDirectionId;
    this._standaloneComplete = false;

    this.model = new Chapter05Model(initialState ?? createInitialState());
    this.directionProgress = new Chapter05DirectionProgress({
      completed: {
        [CHAPTER05_DIRECTIONS.LABYRINTH]: initialState?.collapse?.started === true,
        [CHAPTER05_DIRECTIONS.ECHO_CITY]: initialState?.ticket?.returned === true,
      },
    });

    // Keeping the drawing buffer is useful for automated canvas captures, but
    // is expensive during normal play. QA opts into the slower capture path;
    // players get a high-performance context and a conservative resolution.
    this.captureMode = captureMode;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: captureMode,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, captureMode ? 1 : 1.35));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.92;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this._environmentTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.environment = this._environmentTexture;
    this.camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.05, 220);
    this.scene.add(this.camera);
    this.carriedArtifactRoot = new THREE.Group();
    this.carriedArtifactRoot.name = 'carried-return-artifact-root';
    this.carriedArtifactRoot.position.set(0.42, -0.34, -0.78);
    this.carriedArtifactRoot.rotation.set(-0.12, 0.2, 0.04);
    this.camera.add(this.carriedArtifactRoot);
    this._carriedArtifactId = null;
    this.collapseKeyRing = buildLabyrinthKeyRing(createMuseumMaterialLibrary());
    this.collapseKeyRing.position.set(-0.05, -0.06, 0);
    this.collapseKeyRing.rotation.set(-0.1, 0.12, 0.16);
    this.collapseKeyRing.scale.setScalar(0.44);
    this.collapseKeyRing.visible = false;
    this.carriedArtifactRoot.add(this.collapseKeyRing);
    this.echoCarryRoot = new THREE.Group();
    this.echoCarryRoot.name = 'echo-city-first-person-equipment';
    this.echoCarryRoot.position.set(0.47, -0.40, -0.78);
    this.echoCarryRoot.rotation.set(-0.10, -0.14, 0.035);
    this.echoCarryRoot.scale.setScalar(0.76);
    this.echoCarryKit = buildCarriedNightKit();
    this.echoCarryRoot.add(this.echoCarryKit);
    this.echoCarryRadio = buildCarriedLevRadio();
    this.echoCarryRadio.position.set(-0.02, 0.02, 0);
    this.echoCarryRadio.rotation.set(0.08, -0.15, 0.04);
    this.echoCarryRoot.add(this.echoCarryRadio);
    this.camera.add(this.echoCarryRoot);
    this.echoWorkCard = document.getElementById('echo-work-card');
    this._echoFeedbackKey = '';

    this.controller = new FirstPersonController(this.camera, this.renderer.domElement, null);
    this.interaction = new InteractionSystem(this.camera, promptEl);
    this.dialogue = new DialogueSystem(subtitleEl);
    this.audioGuide = new AudioGuide(this.dialogue);
    this.minimap = new EchoCityMinimap({ root: minimapRoot, canvas: minimapCanvas, stops: NIGHT_ROUND_STOPS });
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
      },
      onClose: ({ directionId, completed, artifactCarried }) => {
        this._syncCarriedArtifact();
        this.scenes.get('corridor')?._syncArtifacts?.();
        const definition = directionDefinition(directionId);
        const message = artifactCarried
          ? 'CLICK TO RETURN — PLACE WHAT YOU BROUGHT BACK'
          : completed
            ? `CLICK TO RETURN TO THE ARCHIVE — ${definition.egress ?? 'DIRECTION COMPLETE'}`
            : 'CLICK TO RETURN TO THE ARCHIVE';
        this._showLockOverlay(message);
        if (completed) this._maybeStartCollapse(directionId);
      },
    });
    // Compatibility for the existing QA text hook while the dedicated
    // LabyrinthExhibit class is retired in favor of the four-direction bridge.
    this.labyrinth = this.directionExhibit;

    // ---- scenes -------------------------------------------------------------
    this.scenes = new Map();
    this.activeSceneName = null;
    for (const SceneCtl of [ServiceLobby, ArchiveCorridor, EchoCityWalkingSim]) {
      const ctl = new SceneCtl();
      const collisionWorld = new StaticCollisionWorld();
      const ctx = {
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
        loopCorridorPass: () => this.loopCorridorPass(),
        openDirection: (directionId) => this.openDirection(directionId),
        displayArtifact: (directionId) => this.displayArtifact(directionId),
        syncCarriedArtifact: () => this._syncCarriedArtifact(),
        isInteractHeld: () => this._interactHeld === true || this._mouseInteractHeld === true,
        completeCollapse: () => this.completeCollapse(),
      };
      ctl.build(ctx);
      ctl.collisionWorld = collisionWorld;
      this.scenes.set(ctl.name, ctl);
    }
    // Echo City is assembled while the player is still in the museum. The
    // threshold never exposes an empty scene or a loading page.
    this._echoPreload = this.scenes.get('echo').prepare?.();

    // ---- input routing ---------------------------------------------------------
    this._simulatedLock = false; // QA/headless drive mode; never set by gameplay
    this._hasEnteredMuseum = false;
    this._interactHeld = false;
    this._mouseInteractHeld = false;
    this._atLabyrinthDoor = () => {
      const state = this.model.getSnapshot();
      return isAtLabyrinthDoor(this.controller.position, state.phase);
    };
    this._enterLabyrinthFromDoor = () => {
      if (!this._atLabyrinthDoor()
        || this.directionExhibit.opened
        || this.director.isBusy
        || this.dialogue.isChoosing) return false;
      // Ambient archive narration must never turn the only playable door into
      // a dead prop. Door 4 owns E while the player is inside its real 2D zone.
      if (this.dialogue.isPlaying) this.dialogue.clear();
      return this.openDirection(CHAPTER05_DIRECTIONS.LABYRINTH);
    };
    this._door4Prompt = document.createElement('button');
    this._door4Prompt.type = 'button';
    this._door4Prompt.id = 'door-4-direct-interact';
    this._door4Prompt.textContent = 'E / CLICK — ENTER DOOR 4 · THE LABYRINTH';
    Object.assign(this._door4Prompt.style, {
      position: 'fixed', left: '50%', bottom: '11%', zIndex: '18',
      transform: 'translateX(-50%)', display: 'none', padding: '12px 18px',
      color: '#f6e3ae', background: 'rgba(10, 9, 7, .9)',
      border: '1px solid #d2ab54', font: '700 14px Georgia, serif',
      letterSpacing: '.08em', cursor: 'pointer',
    });
    document.body.append(this._door4Prompt);
    this._door4Prompt.addEventListener('click', () => {
      this._enterLabyrinthFromDoor();
    });
    window.addEventListener('keydown', (e) => {
      if (this.directionExhibit.opened) return;
      if (e.code === 'Space') e.preventDefault();
      if (this.dialogue.isChoosing) {
        if (e.code === 'Digit1' || e.code === 'Numpad1') this.dialogue.choose(0);
        else if (e.code === 'Digit2' || e.code === 'Numpad2') this.dialogue.choose(1);
        return;
      }
      if (e.code === 'KeyE' || e.code === 'Enter') {
        this._interactHeld = true;
        if (e.repeat) return;
        // The in-app browser can temporarily report pointer lock as inactive
        // while still routing movement keys. Door 4 is a critical transition,
        // so its real proximity check owns E before the pointer-lock guard.
        if (this._enterLabyrinthFromDoor()) return;
        if (this.scenes.get('lobby')?.tryBreakBlackKnifeGlass?.()) return;
        if (!this.controller.isActive && !this._simulatedLock) return;
        if (this.dialogue.isPlaying) this.dialogue.advance();
        else this.interaction.activate();
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
    // holding the primary mouse button mirrors holding E so browser shells that
    // collapse keydown/keyup into one event can still operate the Final Archive.
    this.renderer.domElement.addEventListener('mousedown', (event) => {
      if (event.button !== 0 || this.directionExhibit.opened) return;
      if (this._enterLabyrinthFromDoor()) return;
      if (this.scenes.get('lobby')?.tryBreakBlackKnifeGlass?.()) return;
      if (!this.controller.isActive && !this._simulatedLock) return;
      this._mouseInteractHeld = true;
      if (this.dialogue.isPlaying) this.dialogue.advance();
      else this.interaction.activate({ pointer: true });
    });
    window.addEventListener('mouseup', (event) => {
      if (event.button === 0) this._mouseInteractHeld = false;
    });

    this.controller.onLockChange((locked) => {
      if (locked) {
        this._hasEnteredMuseum = true;
        this.lockOverlay.classList.add('hidden');
      } else if (!this.director.isBusy) {
        this._showLockOverlay('CLICK TO RESUME');
      }
      this.controller.enabled = locked;
      this.interaction.enabled = locked;
    });
    this.controller.enabled = false;
    this.interaction.enabled = false;

    lockOverlay.addEventListener('click', () => {
      // The entry click is the first browser-legal audio gesture. Reasserting
      // the active cue here makes the Museum score start with the front hall.
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
    this._sceneGuards = { corridor: false, echo: false, museum: false, loop: false };
    this._syncCarriedArtifact();
  }

  _syncCarriedArtifact() {
    const id = this.directionProgress.getSnapshot().carriedArtifact;
    if (id === this._carriedArtifactId) return;
    for (const child of [...this.carriedArtifactRoot.children]) {
      if (child !== this.collapseKeyRing) this.carriedArtifactRoot.remove(child);
    }
    this._carriedArtifactId = id;
    if (!id) return;
    const artifact = createReturnArtifact(id);
    artifact.name = `${artifact.name}-carried`;
    artifact.scale.setScalar(id === 'labyrinth' ? 0.92 : id === 'echo-city' ? 0.56 : 1.05);
    artifact.rotation.y = id === 'painted-country' ? -0.25 : id === 'echo-city' ? Math.PI + 0.15 : 0.15;
    if (id === 'echo-city') artifact.rotation.z = -0.12;
    this.carriedArtifactRoot.add(artifact);
  }

  _syncRuntimeCoordinates(snapshot) {
    if (!this.coordinateEl) return;
    const x = this.controller.position.x;
    const z = this.controller.position.z;
    const doorReady = isAtLabyrinthDoor(this.controller.position, snapshot.phase);
    this.coordinateEl.dataset.doorReady = String(doorReady);
    this.coordinateEl.textContent = [
      `X ${x.toFixed(2)} · MAP-Y(Z) ${z.toFixed(2)} · ${snapshot.phase.toUpperCase()} STATE · ${(this.activeSceneName ?? 'NONE').toUpperCase()} SCENE`,
      doorReady
        ? 'DOOR 4 · IN RANGE · PRESS E / ENTER'
        : 'DOOR 4 · OUT OF RANGE · X 36.45–39.55 · Z -1.92–0.95',
    ].join('\n');
  }

  _syncCollapseKeyRing(snapshot) {
    const collapse = snapshot.collapse;
    this.collapseKeyRing.visible = snapshot.phase === 'collapse' && collapse.labyrinthKeys > 0;
    this.collapseKeyRing.userData.keys?.forEach((key, index) => {
      key.visible = index < collapse.labyrinthKeys;
    });
    if (this.collapseKeyRing.visible) {
      const swing = Math.sin(this.clock.elapsedTime * (this.controller.isMoving ? 7.5 : 1.4));
      this.collapseKeyRing.rotation.z = 0.16 + swing * (this.controller.isMoving ? 0.07 : 0.018);
    }
  }

  _syncEchoWorkFeedback(snapshot, dt) {
    const feedback = getEchoWorkFeedback(snapshot.echoRecord, this.activeSceneName === 'echo');
    const levRoute = this.scenes?.get('echo')?.route === 'lev-revisit';
    const carryingLevRadio = this.activeSceneName === 'echo'
      && levRoute
      && snapshot.levRevisit?.radioTaken === true
      && snapshot.levRevisit?.cassetteClaimed !== true;
    // The generic carried-artifact system owns the claimed badge. This layer
    // only shows the night kit before the physical hand-off, avoiding two
    // badges occupying the same first-person space.
    this.echoCarryRoot.visible = carryingLevRadio || (feedback.visible && feedback.held === 'kit');
    this.echoCarryKit.visible = !levRoute && feedback.held === 'kit';
    this.echoCarryRadio.visible = carryingLevRadio;
    if (this.echoCarryRoot.visible) {
      const moving = this.controller?.isMoving === true ? 1 : 0;
      const t = this.clock.elapsedTime;
      const targetY = -0.40 + Math.sin(t * (moving ? 8 : 1.8)) * (moving ? 0.012 : 0.004);
      this.echoCarryRoot.position.y = THREE.MathUtils.damp(this.echoCarryRoot.position.y, targetY, 9, dt);
    }
    if (!this.echoWorkCard) return;
    this.echoWorkCard.hidden = levRoute || !feedback.visible;
    if (levRoute) return;
    const key = `${feedback.steps.map((step) => step.state[0]).join('')}:${feedback.nextAction}`;
    if (key === this._echoFeedbackKey) return;
    this._echoFeedbackKey = key;
    this.echoWorkCard.innerHTML = `<div class="echo-work-row">${feedback.steps
      .map((step) => `<span class="echo-work-step ${step.state}">${step.label}</span>`)
      .join('')}</div><div class="echo-work-next">NEXT · ${feedback.nextAction}</div>`;
  }

  _showLockOverlay(text) {
    const title = this.lockOverlay.querySelector('.title');
    if (title) title.hidden = this._hasEnteredMuseum;
    this.lockOverlay.classList.toggle('resume', this._hasEnteredMuseum);
    const hint = this.lockOverlay.querySelector('.hint');
    if (hint) {
      hint.innerHTML = `${text}<br/>WASD / ARROWS — MOVE · SPACE — JUMP · MOUSE / DRAG — LOOK<br/>E / ENTER — INTERACT · ESC — RELEASE MOUSE`;
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
    this.scene.environment = Object.hasOwn(next.root.userData, 'environment')
      ? next.root.userData.environment
      : this._environmentTexture;
    this.renderer.toneMappingExposure = next.root.userData.rendererExposure ?? 0.92;
    this.controller.collisionWorld = next.collisionWorld;
    this.interaction.clear();
    next.registerInteractions();
    this._syncChapterScore();
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

  async goToCorridor() {
    if (this._sceneGuards.corridor) return;
    this._sceneGuards.corridor = true;
    try {
      await this.director.transition(this, 'corridor', {
        fromPhase: 'lobby',
        toPhase: 'corridor',
        action: { type: 'enterCorridor' },
        spawn: { x: 9.5, z: 0, yaw: -Math.PI / 2 },
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
        spawn: { x: 6.8, z: 0, yaw: Math.PI / 2 },
      });
    } finally {
      this._sceneGuards.corridor = false;
    }
  }

  async goToEchoCity() {
    // Record 3 is a one-way archival return. Once the night-service badge has
    // been placed in its corridor niche, Echo City is formally filed and the
    // museum must not reconstruct it again.
    if (this.directionProgress.getSnapshot().completed[CHAPTER05_DIRECTIONS.ECHO_CITY]) return false;
    if (this._sceneGuards.echo) return;
    this._sceneGuards.echo = true;
    try {
      await this._echoPreload;
      const ok = await this.director.transition(this, 'echo', {
        fromPhase: 'corridor',
        toPhase: 'echo-city',
        action: { type: 'enterEchoCity' },
        spawn: ECHO_CITY_ENTRY.spawn,
        occlude: false,
        preserveControl: true,
      });
      if (ok) {
        this.dialogue.play([
          { speaker: null, text: 'The museum corridor continues into a full-size reconstruction of old Echo City. Behind you, the doorway turns black.' },
        ]);
      }
    } finally {
      this._sceneGuards.echo = false;
    }
  }

  async returnToMuseum() {
    if (this.standaloneDirectionId === CHAPTER05_DIRECTIONS.ECHO_CITY) {
      if (this._standaloneComplete) return false;
      this._standaloneComplete = true;
      this.dialogue.play([
        { speaker: null, text: 'Echo City standalone scene complete. The museum route remains unchanged.' },
      ]);
      return true;
    }
    if (this._sceneGuards.museum) return;
    this._sceneGuards.museum = true;
    try {
      this.model.dispatch({ type: 'returnTicket' });
      const allComplete = this.directionProgress.getSnapshot().allComplete;
      const ok = await this.director.transition(this, allComplete ? 'lobby' : 'corridor', allComplete ? {
        fromPhase: 'echo-city',
        toPhase: 'return',
        action: { type: 'returnToMuseum' },
        spawn: { x: 6.8, z: 0, yaw: Math.PI / 2 },
        occlude: false,
        preserveControl: true,
      } : {
        fromPhase: 'echo-city',
        toPhase: 'corridor',
        action: { type: 'returnToArchive' },
        spawn: { x: 30, z: 0, yaw: Math.PI },
        occlude: false,
        preserveControl: true,
      });
      if (ok) {
        const remaining = PLAYABLE_DIRECTION_ORDER.length - this.directionProgress.getSnapshot().completedCount;
        this.dialogue.play([allComplete
          ? { speaker: null, text: 'The black doorway opens onto the museum lobby. Records 1 and 2 are filed. Records 3 and 4 remain outside this museum route.' }
          : { speaker: null, text: `The night-service badge is still in your hand. Place it in the empty niche opposite Record 3. ${remaining} direction${remaining === 1 ? '' : 's'} will remain after that.` },
        ]);
      }
    } finally {
      this._sceneGuards.museum = false;
    }
  }

  openDirection(directionId) {
    // Door 4 is the last long playable stretch before the collapse. Begin the
    // Boss warm-up here so normal play has the entire Labyrinth plus collapse
    // runtime to fill the cache; _maybeStartCollapse safely reuses this job.
    if (directionId === CHAPTER05_DIRECTIONS.LABYRINTH) {
      preloadChapter(resolveFinalBossDestination().preloadChapterId);
    }
    return this.directionExhibit.open(directionId);
  }

  displayArtifact(directionId) {
    const result = this.directionProgress.dispatch({ type: 'artifact.display', id: directionId });
    if (result.state.completed[directionId] !== true) return false;
    this._syncCarriedArtifact();
    this._maybeStartCollapse(directionId);
    return true;
  }

  async _maybeStartCollapse(directionId) {
    if (directionId !== CHAPTER05_DIRECTIONS.LABYRINTH) return false;
    if (!this.directionProgress.getSnapshot().allComplete) return false;
    if (this.model.getSnapshot().phase !== 'corridor' || this.director.isBusy) return false;
    const result = this.model.dispatch({ type: 'labyrinthComplete' });
    if (!result.changed) return false;
    preloadChapter(resolveFinalBossDestination().preloadChapterId);
    this.getActiveScene()?.enter(this.model.getSnapshot());
    this.controller.setPose(COLLAPSE_ENTRY.x, COLLAPSE_ENTRY.z, COLLAPSE_ENTRY.yaw);
    this._syncCollapseKeyRing(this.model.getSnapshot());
    return true;
  }

  async completeCollapse() {
    if (this._chapterComplete || this.model.getSnapshot().phase !== 'collapse') return false;
    const result = this.model.dispatch({ type: 'collapseJump' });
    if (!result.changed) return false;
    this._chapterComplete = true;
    // Freeze one authoritative decision before the blackout. Stones cannot be
    // gained in the Museum, and preloading plus navigation must agree even if
    // storage is touched by another tab during the hold.
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
    if (new URLSearchParams(window.location.search).get('qa-no-redirect') !== '1') {
      // The route is frozen before black. The film starts the route-specific
      // preload on its `playing` event; its completion gate then prevents a
      // cold Boss page from opening after either ending branch.
      await navigateAfterCinematic(finalBoss.cinematicId, finalBoss.cinematicPath, finalBoss.route, {
        label: `MUSEUM TO ${finalBoss.title}`,
        preloadChapterId: finalBoss.preloadChapterId,
        requirePreloadReady: true,
      });
    }
    return true;
  }

  // The corridor's one repetition — an in-space loop, not a scene change.
  async loopCorridorPass() {
    if (this._sceneGuards.loop) return;
    this._sceneGuards.loop = true;
    try {
      const result = this.model.dispatch({ type: 'corridorLoop' });
      if (!result.changed) return;
      await this.director._fade(true);
      const scene = this.getActiveScene();
      scene.enter(this.model.getSnapshot()); // moves the guide stand
      this.controller.setPose(9.5, 0, -Math.PI / 2);
      await this.director._fade(false);
      this.dialogue.play([
        { speaker: null, text: 'You have walked this stretch before. The guide stand has moved to the opposite wall. The second pass is the same corridor, slightly wrong.' },
      ]);
    } finally {
      this._sceneGuards.loop = false;
    }
  }

  async start() {
    const name = this._initialSceneName();
    if (name === 'echo') await this._echoPreload;
    this.setActiveScene(name);
    this.getActiveScene().enter(this.model.getSnapshot());
    this._applyInitialSpawn();

    this.renderer.setAnimationLoop(() => {
      const dt = Math.min(this.clock.getDelta(), 0.05);
      if (globalThis.NIGHTFALL_PAUSED) {
        this.renderer.render(this.scene, this.camera);
        return;
      }
      const snapshot = this.model.getSnapshot();
      if (this._door4Prompt) {
        this._door4Prompt.style.display = this._atLabyrinthDoor()
          && !this.directionExhibit.opened && !this.dialogue.isPlaying
          ? 'block' : 'none';
      }
      this._syncChapterScore();
      this.controller.update(dt);
      this._syncRuntimeCoordinates(snapshot);
      const active = this.getActiveScene();
      if (active) active.update(dt, snapshot);
      this._syncEchoWorkFeedback(snapshot, dt);
      this._syncCollapseKeyRing(snapshot);
      const minimapState = active?.getMinimapState?.() ?? {};
      this.minimap.update({
        active: this.activeSceneName === 'echo' && !this.directionExhibit.opened,
        player: this.controller.position,
        yaw: this.controller.getYaw(),
        record: snapshot.echoRecord,
        ...minimapState,
      });
      this.interaction.update();
      this.dialogue.update(dt);
      music.setDialogueActive(this.dialogue.isPlaying);
      animateReturnArtifact(this.carriedArtifactRoot.children[0], this.clock.elapsedTime, { carried: true });
      this.renderer.render(this.scene, this.camera);
    });
  }

  _initialSceneName() {
    const phase = this.model.getSnapshot().phase;
    if (phase === 'corridor' || phase === 'collapse') return 'corridor';
    if (phase === 'echo-city') return 'echo';
    return 'lobby';
  }

  _applyInitialSpawn() {
    const s = this.model.getSnapshot();
    if (s.phase === 'corridor') this.controller.setPose(9.5, 0, -Math.PI / 2);
    else if (s.phase === 'collapse') this.controller.setPose(COLLAPSE_ENTRY.x, COLLAPSE_ENTRY.z, COLLAPSE_ENTRY.yaw);
    else if (s.phase === 'echo-city') {
      const { x, z, yaw } = ECHO_CITY_ENTRY.spawn;
      this.controller.setPose(x, z, yaw);
    }
    else if (s.phase === 'return') this.controller.setPose(6.8, 0, Math.PI / 2);
    else this.controller.setPose(-6.5, 0, -Math.PI / 2);
  }
}
