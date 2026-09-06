import * as THREE from 'three';

import {
  ENDING_SLICE_POSITIONS,
  EVIDENCE_DIALOGUE,
  MARA_APPROACH_RESPONSES,
  MARA_NEGOTIATION_DIALOGUE,
  MARA_REMINDER_DIALOGUE,
  STATION_MEETING_DIALOGUE,
  WALK_BARKS,
} from './chapter3EndingContent.js';
import { RAIL_LAYOUT } from './city3dConfig.js';
import { Chapter3VoicePlayback } from './Chapter3VoicePlayback.js';

const INTERACTION_RADIUS = 4.2;

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function smooth(value) {
  const x = clamp01(value);
  return x * x * (3 - 2 * x);
}

function positionFrom(values) {
  return new THREE.Vector3(values[0], values[1], values[2]);
}

function makeActor(scene, { name, color, position, scale = 1 }) {
  const group = new THREE.Group();
  group.name = name;
  const coat = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.38 * scale, 0.86 * scale, 5, 10),
    new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0.02 }),
  );
  coat.position.y = 0.92 * scale;
  coat.castShadow = true;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.27 * scale, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xc7a27f, roughness: 0.92 }),
  );
  head.position.y = 1.72 * scale;
  head.castShadow = true;
  group.add(coat, head);
  group.position.copy(positionFrom(position));
  scene.add(group);
  return group;
}

function makeGroundRing(scene, color, radius = 0.9) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(radius, radius + 0.08, 40),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.96, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.69;
  ring.visible = false;
  scene.add(ring);
  return ring;
}

function makeEvidence(scene) {
  const canvas = document.createElement('canvas');
  canvas.width = 1536;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#160e0c';
  context.font = '900 112px Georgia, serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.shadowColor = '#0a0504';
  context.shadowBlur = 18;
  context.fillText('I WAS HERE FIRST.', canvas.width / 2, 170);
  context.fillText('SO WAS SHE.', canvas.width / 2, 345);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const text = new THREE.Mesh(
    new THREE.PlaneGeometry(10.5, 4),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }),
  );
  text.rotation.x = -Math.PI / 2;
  text.rotation.z = THREE.MathUtils.degToRad(-16);
  text.position.copy(positionFrom(ENDING_SLICE_POSITIONS.morningEvidence));
  text.renderOrder = 3;
  scene.add(text);

  const wireMaterial = new THREE.LineBasicMaterial({ color: 0x50c7ca, linewidth: 2 });
  const wirePoints = [
    new THREE.Vector3(5.1, 0.73, 9.6),
    new THREE.Vector3(7.1, 0.73, 8.9),
    new THREE.Vector3(8.2, 0.73, 8.2),
  ];
  const wire = new THREE.Line(new THREE.BufferGeometry().setFromPoints(wirePoints), wireMaterial);
  wire.name = 'morning-blue-connector';
  scene.add(wire);

  const outline = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(11.2, 0.15, 4.8)),
    new THREE.LineBasicMaterial({ color: 0x80e6d8, transparent: true, opacity: 0.96 }),
  );
  outline.position.copy(positionFrom(ENDING_SLICE_POSITIONS.morningEvidence));
  outline.position.y = 0.74;
  outline.rotation.y = THREE.MathUtils.degToRad(16);
  outline.visible = false;
  scene.add(outline);
  return { root: text, wire, outline };
}

function makeDoor(scene) {
  const group = new THREE.Group();
  group.name = 'chapter3-heavy-train-door';
  group.position.copy(positionFrom(ENDING_SLICE_POSITIONS.trainDoor));
  group.rotation.y = THREE.MathUtils.degToRad(55);
  const material = new THREE.MeshStandardMaterial({
    color: 0xa9683f,
    roughness: 0.55,
    metalness: 0.48,
    emissive: 0x2a1007,
    emissiveIntensity: 0.34,
  });
  const left = new THREE.Mesh(new THREE.BoxGeometry(1.04, 2.5, 0.3), material);
  const right = new THREE.Mesh(new THREE.BoxGeometry(1.04, 2.5, 0.3), material.clone());
  const trackMaterial = new THREE.MeshStandardMaterial({
    color: 0x3c2921,
    roughness: 0.42,
    metalness: 0.72,
  });
  const upperTrack = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.18, 0.52), trackMaterial);
  const threshold = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.14, 0.58), trackMaterial.clone());
  upperTrack.position.y = 1.34;
  threshold.position.y = -1.31;
  left.castShadow = true;
  right.castShadow = true;
  upperTrack.castShadow = true;
  group.add(left, right, upperTrack, threshold);
  scene.add(group);
  return { group, left, right };
}

export class Chapter3DialogueController {
  constructor({ panel, speaker, text, choices, hint }) {
    this.panel = panel;
    this.speakerElement = speaker;
    this.textElement = text;
    this.choicesElement = choices;
    this.hintElement = hint;
    this.lines = [];
    this.index = 0;
    this.visibleCharacters = 0;
    this.charactersPerSecond = 34;
    this.onComplete = null;
    this.onChoice = null;
    this.onLineChange = null;
    this.notifiedLine = null;
    this.advanceLocked = false;
    this.active = false;
    this.voice = new Chapter3VoicePlayback();
    this.panel.addEventListener('pointerup', (event) => {
      event.stopPropagation();
      this.handleAdvance();
    });
  }

  show(lines, { onComplete = null, onChoice = null, onLineChange = null } = {}) {
    this.voice.stop();
    this.lines = lines.map((line) => ({ ...line, choices: line.choices?.map((choice) => ({ ...choice })) }));
    this.index = 0;
    this.visibleCharacters = 0;
    this.onComplete = onComplete;
    this.onChoice = onChoice;
    this.onLineChange = onLineChange;
    this.notifiedLine = null;
    this.active = true;
    this.panel.classList.add('visible');
    this.render();
  }

  currentLine() {
    return this.lines[this.index] || null;
  }

  isLineComplete() {
    const line = this.currentLine();
    return !line || this.visibleCharacters >= line.text.length;
  }

  update(dt) {
    if (!this.active || this.isLineComplete()) return;
    this.visibleCharacters = Math.min(
      this.currentLine().text.length,
      this.visibleCharacters + dt * this.charactersPerSecond,
    );
    this.render();
  }

  reveal() {
    const line = this.currentLine();
    if (!line) return;
    this.visibleCharacters = line.text.length;
    this.render();
  }

  handleAdvance() {
    if (!this.active || this.advanceLocked) return;
    if (!this.isLineComplete()) {
      this.voice.stop();
      this.reveal();
      return;
    }
    if (this.currentLine()?.choices?.length) return;
    this.voice.stop();
    this.index += 1;
    if (this.index >= this.lines.length) {
      this.close();
      return;
    }
    this.visibleCharacters = 0;
    this.render();
  }

  choose(choiceId) {
    const line = this.currentLine();
    if (!line?.choices?.some((choice) => choice.id === choiceId)) return;
    this.voice.stop();
    const continuation = this.onChoice?.(choiceId) || [];
    line.choices = [];
    this.lines.splice(this.index + 1, 0, ...continuation.map((entry) => ({ ...entry })));
    this.index += 1;
    this.visibleCharacters = 0;
    this.render();
  }

  close() {
    this.voice.stop();
    const complete = this.onComplete;
    this.active = false;
    this.lines = [];
    this.onLineChange = null;
    this.notifiedLine = null;
    this.advanceLocked = false;
    this.panel.classList.remove('visible');
    this.choicesElement.replaceChildren();
    this.textElement.textContent = '';
    complete?.();
  }

  render() {
    const line = this.currentLine();
    if (!line) return;
    if (line !== this.notifiedLine) {
      this.notifiedLine = line;
      this.voice.play(line);
      this.onLineChange?.(line, this.index);
    }
    const panelModifiers = [
      'dialogue-panel-inner-voice',
      'dialogue-panel-pattern',
      'dialogue-panel-tenderness',
      'dialogue-panel-nerve',
      'dialogue-panel-system',
      'dialogue-panel-prompt',
    ];
    this.panel.classList.remove(...panelModifiers);
    const speaker = line.speaker || '';
    const innerVoiceClass = {
      PATTERN: 'dialogue-panel-pattern',
      TENDERNESS: 'dialogue-panel-tenderness',
      NERVE: 'dialogue-panel-nerve',
    }[speaker];
    if (innerVoiceClass) {
      this.panel.classList.add('dialogue-panel-inner-voice', innerVoiceClass);
    } else if (speaker === 'NARRATION' || speaker === 'SYSTEM' || speaker === '') {
      this.panel.classList.add('dialogue-panel-system');
    } else if (speaker === 'CHOOSE') {
      this.panel.classList.add('dialogue-panel-prompt');
    }
    this.speakerElement.textContent = speaker;
    this.textElement.textContent = line.text.slice(0, Math.floor(this.visibleCharacters));
    this.choicesElement.replaceChildren();
    const complete = this.isLineComplete();
    if (complete && line.choices?.length) {
      for (const choice of line.choices) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'dialogue-choice';
        button.textContent = choice.label;
        button.addEventListener('pointerup', (event) => {
          event.stopPropagation();
          this.choose(choice.id);
        });
        this.choicesElement.append(button);
      }
    }
    this.hintElement.textContent = this.advanceLocked
      ? 'Watch the second line ignite'
      : !complete
      ? 'Click to reveal the full line'
      : line.choices?.length
        ? 'Choose a response'
        : 'Click to continue';
  }

  snapshot() {
    const line = this.currentLine();
    return {
      active: this.active,
      speaker: line?.speaker || null,
      fullText: line?.text || null,
      visibleText: line?.text.slice(0, Math.floor(this.visibleCharacters)) || null,
      lineComplete: this.isLineComplete(),
      advanceLocked: this.advanceLocked,
      choices: line?.choices?.map((choice) => choice.id) || [],
    };
  }

  setAdvanceLocked(locked) {
    this.advanceLocked = Boolean(locked);
    this.render();
  }
}

class EndingAudio {
  constructor() {
    this.context = null;
    this.hum = null;
    this.humGain = null;
  }

  unlock() {
    if (!this.context) this.context = new AudioContext();
    if (this.context.state === 'suspended') this.context.resume();
  }

  tone(frequency, duration, gain = 0.04, type = 'sine') {
    if (!this.context) return;
    const oscillator = this.context.createOscillator();
    const volume = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    volume.gain.setValueAtTime(gain, this.context.currentTime);
    volume.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + duration);
    oscillator.connect(volume).connect(this.context.destination);
    oscillator.start();
    oscillator.stop(this.context.currentTime + duration);
  }

  phase(phase) {
    if (phase === 'scan-first-ticket' || phase === 'scan-second-ticket') this.tone(720, 0.16, 0.035, 'square');
    if (phase === 'dual-validation') this.tone(910, 0.28, 0.045, 'sine');
    if (phase === 'door-relay') this.tone(180, 0.12, 0.055, 'square');
    if (phase === 'door-hydraulic-pull') this.tone(72, 1.4, 0.035, 'sawtooth');
    if (phase === 'door-latch') this.tone(48, 0.75, 0.12, 'triangle');
    if (phase === 'traction-load') this.startHum();
    if (phase === 'black-audio-tail') this.fadeHum(2);
  }

  startHum() {
    if (!this.context || this.hum) return;
    this.hum = this.context.createOscillator();
    this.humGain = this.context.createGain();
    this.hum.type = 'sawtooth';
    this.hum.frequency.setValueAtTime(38, this.context.currentTime);
    this.hum.frequency.linearRampToValueAtTime(68, this.context.currentTime + 7);
    this.humGain.gain.setValueAtTime(0.0001, this.context.currentTime);
    this.humGain.gain.exponentialRampToValueAtTime(0.035, this.context.currentTime + 0.7);
    this.hum.connect(this.humGain).connect(this.context.destination);
    this.hum.start();
  }

  fadeHum(duration) {
    if (!this.context || !this.humGain) return;
    this.humGain.gain.cancelScheduledValues(this.context.currentTime);
    this.humGain.gain.setValueAtTime(Math.max(0.0001, this.humGain.gain.value), this.context.currentTime);
    this.humGain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + duration);
    this.hum.stop(this.context.currentTime + duration + 0.05);
  }
}

export class Chapter3EndingRuntime {
  constructor({ preview, model, elements }) {
    this.preview = preview;
    this.model = model;
    this.elements = elements;
    this.dialogue = new Chapter3DialogueController(elements.dialogue);
    this.audio = new EndingAudio();
    this.manualEndingClock = new URLSearchParams(window.location.search).get('endingqa') === 'manual';
    this.initialized = false;
    this.hoveredId = null;
    this.tabHeld = false;
    this.pointerClient = { x: 0, y: 0 };
    this.interactions = [];
    this.followElapsed = 0;
    this.walkBarkIndex = 0;
    this.walkBarkRemaining = 0;
    this.lastPhase = this.model.snapshot().phase;
    this.departureBases = null;
    this.trainDirection = new THREE.Vector3(
      RAIL_LAYOUT.end[0] - RAIL_LAYOUT.start[0],
      0,
      RAIL_LAYOUT.end[1] - RAIL_LAYOUT.start[1],
    ).normalize();
  }

  initialize() {
    const scene = this.preview.scene;
    document.body.classList.add('gameplay-active');
    this.preview.player.position.copy(positionFrom(ENDING_SLICE_POSITIONS.playerStart));
    this.preview.stopWalking();
    this.preview.resetCamera();

    this.evidence = makeEvidence(scene);
    this.squareMara = makeActor(scene, {
      name: 'square-mara-placeholder',
      color: 0x477f79,
      position: ENDING_SLICE_POSITIONS.squareMaraFountain,
    });
    this.trainMara = makeActor(scene, {
      name: 'train-mara-placeholder',
      color: 0x315f61,
      position: ENDING_SLICE_POSITIONS.trainMaraScan,
    });
    this.lev = makeActor(scene, {
      name: 'lev-placeholder',
      color: 0x4f5a50,
      position: ENDING_SLICE_POSITIONS.levPlatform,
      scale: 0.96,
    });
    this.squareMaraOutline = makeGroundRing(scene, 0x80e6d8, 0.72);
    this.squareMaraOutline.position.x = this.squareMara.position.x;
    this.squareMaraOutline.position.z = this.squareMara.position.z;
    this.door = makeDoor(scene);
    this.setDoorProgress(0);

    this.interactions = [
      {
        id: 'morning-fire-evidence',
        label: 'Scorched lines and blue connector',
        position: positionFrom(ENDING_SLICE_POSITIONS.morningEvidence),
        approach: ENDING_SLICE_POSITIONS.evidenceApproach,
        outline: this.evidence.outline,
        eligible: () => !this.model.snapshot().morningFireConfirmed,
        activate: () => this.openEvidence(),
      },
      {
        id: 'square-mara',
        label: 'Mara Venn',
        position: this.squareMara.position,
        approach: ENDING_SLICE_POSITIONS.maraApproach,
        outline: this.squareMaraOutline,
        eligible: () => !this.model.snapshot().maraJoinsStation,
        activate: () => this.openMara(),
      },
    ];
    this.initialized = true;
    this.updateObjective();
    this.updateOutlines();
    this.updateDiagnosticState();
  }

  interactionLocked() {
    return this.dialogue.active || this.model.snapshot().interactionLocked;
  }

  eligibleInteractions() {
    return this.interactions.filter((interaction) => interaction.eligible());
  }

  handlePointerMove(event) {
    if (!this.initialized || this.interactionLocked()) return false;
    this.pointerClient = { x: event.clientX, y: event.clientY };
    const point = this.preview.projectPointerToGround(event);
    if (!point) return false;
    let nearest = null;
    for (const interaction of this.eligibleInteractions()) {
      const distance = Math.hypot(point.x - interaction.position.x, point.z - interaction.position.z);
      if (distance <= INTERACTION_RADIUS && (!nearest || distance < nearest.distance)) {
        nearest = { id: interaction.id, distance };
      }
    }
    this.hoveredId = nearest?.id || null;
    this.updateOutlines();
    this.updateInteractionLabel();
    return Boolean(this.hoveredId);
  }

  handlePointerUp(_event) {
    if (!this.initialized) return false;
    this.audio.unlock();
    if (this.dialogue.active || this.model.snapshot().interactionLocked) return true;
    const interaction = this.eligibleInteractions().find((entry) => entry.id === this.hoveredId);
    if (!interaction) return false;
    this.elements.interactionLabel.classList.remove('visible');
    this.preview.walkTo(interaction.approach[0], interaction.approach[2], interaction.activate);
    return true;
  }

  handleKeyDown(event) {
    if (event.key === 'Tab') {
      event.preventDefault();
      this.tabHeld = true;
      this.updateOutlines();
      return true;
    }
    return this.interactionLocked();
  }

  handleKeyUp(event) {
    if (event.key === 'Tab') {
      event.preventDefault();
      this.tabHeld = false;
      this.updateOutlines();
      return true;
    }
    return false;
  }

  updateInteractionLabel() {
    const interaction = this.eligibleInteractions().find((entry) => entry.id === this.hoveredId);
    if (!interaction) {
      this.elements.interactionLabel.classList.remove('visible');
      return;
    }
    this.elements.interactionLabel.textContent = interaction.label;
    this.elements.interactionLabel.style.left = `${this.pointerClient.x}px`;
    this.elements.interactionLabel.style.top = `${this.pointerClient.y}px`;
    this.elements.interactionLabel.classList.add('visible');
  }

  updateOutlines() {
    for (const interaction of this.interactions) {
      interaction.outline.visible = interaction.eligible()
        && (this.tabHeld || interaction.id === this.hoveredId);
    }
  }

  openEvidence() {
    this.preview.stopWalking();
    this.dialogue.show(EVIDENCE_DIALOGUE, {
      onComplete: () => {
        this.model.inspectMorningFire();
        this.evidence.outline.visible = false;
        this.hoveredId = null;
        this.updateObjective();
      },
    });
  }

  openMara() {
    this.preview.stopWalking();
    if (!this.model.snapshot().morningFireConfirmed) {
      this.model.talkToMaraBeforeEvidence();
      this.dialogue.show(MARA_REMINDER_DIALOGUE);
      return;
    }
    let selected = null;
    this.dialogue.show(MARA_NEGOTIATION_DIALOGUE, {
      onChoice: (choiceId) => {
        if (!this.model.chooseMaraApproach(choiceId)) return [];
        selected = choiceId;
        return MARA_APPROACH_RESPONSES[choiceId];
      },
      onComplete: () => {
        if (!selected) return;
        this.hoveredId = null;
        this.followElapsed = 0;
        this.walkBarkIndex = 0;
        this.updateObjective();
        this.updateOutlines();
      },
    });
  }

  beginStationMeeting() {
    this.preview.stopWalking();
    this.squareMara.position.copy(positionFrom(ENDING_SLICE_POSITIONS.squareMaraScan));
    this.trainMara.position.copy(positionFrom(ENDING_SLICE_POSITIONS.trainMaraScan));
    this.squareMaraOutline.visible = false;
    this.dialogue.show(STATION_MEETING_DIALOGUE, {
      onComplete: () => {
        this.model.completeStationMeeting();
        this.updateObjective();
      },
    });
  }

  update(dt) {
    if (!this.initialized) return;
    this.dialogue.update(dt);
    const before = this.model.snapshot();
    if (before.meetingComplete && !before.audioSilent && !this.manualEndingClock) this.model.advance(dt * 1000);
    const state = this.model.snapshot();

    if (state.maraJoinsStation && !state.stationReached && !this.dialogue.active) {
      this.updateMaraFollow(dt);
      const trigger = positionFrom(ENDING_SLICE_POSITIONS.stationTrigger);
      if (this.preview.player.position.distanceTo(trigger) < 3.8 && this.model.reachStation()) {
        this.beginStationMeeting();
      }
    }

    if (state.meetingComplete) this.updateEndingVisuals(state);
    if (state.phase !== this.lastPhase) {
      this.audio.phase(state.phase);
      if (state.phase === 'door-latch') this.preview.triggerCameraShake(0.28, 0.24);
      this.lastPhase = state.phase;
    }
    this.updateWalkBark(dt);
    this.updateDiagnosticState();
  }

  advanceEndingForQa(ms) {
    if (!this.manualEndingClock || !this.model.snapshot().meetingComplete) return false;
    let remaining = Math.max(0, ms);
    while (remaining > 0) {
      const step = Math.min(100, remaining);
      this.model.advance(step);
      this.updateEndingVisuals(this.model.snapshot());
      remaining -= step;
    }
    const state = this.model.snapshot();
    if (state.phase !== this.lastPhase) {
      this.audio.phase(state.phase);
      if (state.phase === 'door-latch') this.preview.triggerCameraShake(0.28, 0.24);
      this.lastPhase = state.phase;
    }
    this.updateObjective();
    this.updateDiagnosticState();
    this.preview.render();
    return true;
  }

  updateDiagnosticState() {
    this.preview.container.dataset.gameState = JSON.stringify(this.textState());
  }

  updateMaraFollow(dt) {
    const delta = this.preview.player.position.clone().sub(this.squareMara.position);
    delta.y = 0;
    const distance = delta.length();
    if (distance > 1.9) {
      const travel = Math.min(distance - 1.65, 5.1 * dt);
      this.squareMara.position.addScaledVector(delta.normalize(), travel);
      this.squareMara.rotation.y = Math.atan2(delta.x, delta.z);
    }
    this.squareMaraOutline.position.x = this.squareMara.position.x;
    this.squareMaraOutline.position.z = this.squareMara.position.z;
    if (this.preview.path.length) this.followElapsed += dt;
    if (this.walkBarkIndex === 0 && this.followElapsed >= 2.2) {
      this.showWalkBark(WALK_BARKS[this.model.snapshot().maraApproach]);
      this.walkBarkIndex = 1;
    }
    if (this.walkBarkIndex === 1 && this.followElapsed >= 7.2) {
      this.showWalkBark(WALK_BARKS.morning);
      this.walkBarkIndex = 2;
    }
  }

  showWalkBark(text) {
    this.elements.walkBark.textContent = text;
    this.elements.walkBark.classList.add('visible');
    this.walkBarkRemaining = 3.4;
  }

  updateWalkBark(dt) {
    if (this.walkBarkRemaining <= 0) return;
    this.walkBarkRemaining = Math.max(0, this.walkBarkRemaining - dt);
    if (this.walkBarkRemaining === 0) this.elements.walkBark.classList.remove('visible');
  }

  captureDepartureBases() {
    const roots = [
      this.preview.scene.getObjectByName('municipal-tram'),
      this.preview.scene.getObjectByName('municipal-tram-car-02'),
      this.preview.scene.getObjectByName('municipal-tram-car-03'),
      this.door.group,
      this.squareMara,
      this.trainMara,
      this.preview.player,
    ].filter(Boolean);
    this.departureBases = roots.map((object) => ({ object, position: object.position.clone() }));
  }

  setDoorProgress(progress) {
    const opening = 1.18;
    const closed = 0.52;
    const offset = THREE.MathUtils.lerp(opening, closed, clamp01(progress));
    this.door.left.position.set(-offset, 0, 0);
    this.door.right.position.set(offset, 0, 0);
  }

  updateEndingVisuals(state) {
    const ms = state.sequenceMs;
    if (ms >= 2500) this.preview.setCameraOverrideTarget(this.door.group.position.clone());
    this.elements.scannerReadout.classList.toggle('visible', ms < 4400);
    const readout = [
      ...state.scannerRows,
      state.scannerSummary,
    ].filter(Boolean).join('\n');
    this.elements.scannerReadout.textContent = readout || 'SCANNING...';

    if (ms >= 2500 && ms < 3400) {
      const t = smooth((ms - 2500) / 900);
      this.squareMara.position.lerpVectors(
        positionFrom(ENDING_SLICE_POSITIONS.squareMaraScan),
        positionFrom(ENDING_SLICE_POSITIONS.squareMaraBoarded),
        t,
      );
    }
    if (ms >= 3400 && ms < 4400) {
      const t = smooth((ms - 3400) / 1000);
      this.preview.player.position.lerpVectors(
        positionFrom(ENDING_SLICE_POSITIONS.squareMaraScan),
        positionFrom(ENDING_SLICE_POSITIONS.butchBoarded),
        t,
      );
    }

    let doorProgress = 0;
    if (ms >= 5000 && ms < 7000) doorProgress = 0.55 * smooth((ms - 5000) / 2000);
    else if (ms >= 7000 && ms < 9000) doorProgress = 0.55 + 0.45 * smooth((ms - 7000) / 2000);
    else if (ms >= 9000) doorProgress = 1;
    this.setDoorProgress(doorProgress);

    if (ms >= 11200 && !this.departureBases) this.captureDepartureBases();
    if (ms >= 11200 && this.departureBases) {
      const progress = smooth((ms - 11200) / (21600 - 11200));
      const distance = 38 * progress;
      const offset = this.trainDirection.clone().multiplyScalar(distance);
      for (const entry of this.departureBases) entry.object.position.copy(entry.position).add(offset);
      const trainFocus = this.door.group.position.clone();
      this.preview.setCameraOverrideTarget(trainFocus);
    }

    if (state.blackout) {
      this.elements.blackout.classList.add('visible');
      for (const entry of this.departureBases || []) entry.object.visible = false;
    }
    if (state.audioSilent) this.elements.statusElement.textContent = 'CHAPTER 03 · COMPLETE';
  }

  updateObjective() {
    const state = this.model.snapshot();
    if (this.elements.timeElement) this.elements.timeElement.textContent = 'DAY 2 · 07:05';
    if (state.audioSilent) this.elements.statusElement.textContent = 'CHAPTER 03 · COMPLETE';
    else if (state.interactionLocked) this.elements.statusElement.textContent = 'DEPARTURE IN PROGRESS';
    else if (state.stationReached) this.elements.statusElement.textContent = 'BOTH TICKETS · ONE SCAN';
    else if (state.maraJoinsStation) this.elements.statusElement.textContent = 'RETURN TO THE STATION WITH MARA';
    else if (state.morningFireConfirmed) this.elements.statusElement.textContent = 'SPEAK WITH MARA AT THE FOUNTAIN';
    else this.elements.statusElement.textContent = 'EXAMINE THE PAVING';
    if (this.elements.objectiveTitle) {
      this.elements.objectiveTitle.textContent = this.elements.statusElement.textContent;
    }
    if (this.elements.objectiveDetail) {
      this.elements.objectiveDetail.textContent = state.audioSilent
        ? 'The train has entered the tunnel.'
        : state.interactionLocked
          ? 'The departure sequence cannot be interrupted.'
          : state.maraJoinsStation
            ? 'Mara will follow without an escort failure state.'
            : state.morningFireConfirmed
              ? 'Ask Mara to return to the station for the joint ticket check.'
              : 'Confirm the burned lettering and the broken blue connector.';
    }
  }

  textState() {
    const state = this.model.snapshot();
    return {
      slice: 'chapter-03-ending',
      objective: this.elements.statusElement.textContent,
      state,
      hoveredInteraction: this.hoveredId,
      tabScanHeld: this.tabHeld,
      eligibleInteractions: this.eligibleInteractions().map((interaction) => interaction.id),
      dialogue: this.dialogue.snapshot(),
      actors: {
        squareMara: this.squareMara
          ? [this.squareMara.position.x, this.squareMara.position.y, this.squareMara.position.z].map((value) => Number(value.toFixed(2)))
          : null,
        trainMara: this.trainMara
          ? [this.trainMara.position.x, this.trainMara.position.y, this.trainMara.position.z].map((value) => Number(value.toFixed(2)))
          : null,
        lev: this.lev
          ? [this.lev.position.x, this.lev.position.y, this.lev.position.z].map((value) => Number(value.toFixed(2)))
          : null,
      },
      scanner: {
        rows: state.scannerRows,
        summary: state.scannerSummary,
      },
      ending: {
        doorProgress: state.sequenceMs < 5000 ? 0 : state.sequenceMs < 7000
          ? Number((0.55 * smooth((state.sequenceMs - 5000) / 2000)).toFixed(3))
          : state.sequenceMs < 9000
            ? Number((0.55 + 0.45 * smooth((state.sequenceMs - 7000) / 2000)).toFixed(3))
            : 1,
        blackout: state.blackout,
        audioSilent: state.audioSilent,
      },
    };
  }
}
