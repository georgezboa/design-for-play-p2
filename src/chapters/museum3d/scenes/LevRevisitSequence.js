import * as THREE from 'three';
import { box, emissiveMat, hitProxy, mat } from '../util/graybox.js';
import { CHAPTER05_DIRECTIONS } from '../directions/directionRegistry.js';

// Chapter 5 revisits the real Chapter 3 city as a human memory, not as a new
// crime scene. These anchors sit on verified open streets in the v68 layout.
export const LEV_REVISIT_SITES = Object.freeze({
  radio: Object.freeze({ x: 2, z: 41.5 }),
  cafe: Object.freeze({ x: -20, z: 6.5 }),
  fountain: Object.freeze({ x: 28, z: 6.6 }),
  letters: Object.freeze({ x: -8.5, z: -13 }),
  platform: Object.freeze({ x: -9.8, z: 30.5 }),
  overlook: Object.freeze({ x: -42, z: 18 }),
  museum: Object.freeze({ x: 0, z: 46.9 }),
});

const STOP_BY_BEAT = Object.freeze({
  'walk-cafe': 'cafe',
  'walk-fountain': 'fountain',
  'walk-letters': 'letters',
  'walk-platform': 'platform',
});

const STOP_PROMPTS = Object.freeze({
  cafe: 'E — TURN OVER MARA\'S CUP',
  fountain: 'E — TAKE THE COIN FROM THE BASIN',
  letters: 'E — BRUSH ASH FROM THE TOP LETTER',
  platform: 'E — SIT AND WAIT FOR THE OLD BELL',
});

const LINES = Object.freeze({
  entry: [{ speaker: null, text: 'A portable receiver is ringing on the pavement beside the museum door.' }],
  radio: [
    { speaker: 'LEV', text: 'Butch, if it is really you, do not file anything yet. Come to the west overlook. I found something Mara left.' },
    { speaker: 'BUTCH', text: 'Are you in trouble?' },
    { speaker: 'LEV', text: 'No. I am waiting. Take the old route: the closed cafe, the fountain, the burned letter box, then the first-tram platform. I want you to hear the city before you hear the tape.' },
  ],
  cafe: [
    { speaker: 'LEV', text: 'The cafe closed six months after Mara disappeared. The owner kept her chipped cup under the counter until the rent went up.' },
  ],
  fountain: [
    { speaker: 'LEV', text: 'Mara hated this fountain. She said the pump sounded like a man clearing his throat.' },
    { speaker: 'BUTCH', text: 'She still asked us to meet here.' },
  ],
  letters: [
    { speaker: 'LEV', text: 'People burned copies here when the municipal office began asking who had spoken to her.' },
    { speaker: 'LEV', text: 'Most were not hiding a conspiracy. They were hiding debts, affairs, or one more person living in the flat than the lease allowed.' },
  ],
  platform: [
    { speaker: 'LEV', text: 'You missed the first tram here. Mara and I waited with you until sunrise because none of us could afford breakfast.' },
    { speaker: 'BUTCH', text: 'I remember her pretending it was our plan.' },
  ],
  overlook: [
    { speaker: 'LEV', text: 'I found the tape in the room above the cafe, wrapped in an old receipt. The museum sent a request for it before I had finished cleaning the dust off.' },
    { speaker: 'BUTCH', text: 'Did you play it?' },
    { speaker: 'LEV', text: 'Once. Mara complains about the weather. I count the money in the till. You apologize for missing the tram.' },
    { speaker: 'LEV', text: 'That is all. An ordinary morning. The museum wants to file it as evidence from the day she disappeared.' },
  ],
  cassette: [
    { speaker: 'LEV', text: 'You can take it. But do not play only the part useful for finding her. That was not her whole day.' },
    { speaker: 'BUTCH', text: 'Then the ordinary parts stay with the record.' },
  ],
});

const RESPONSES = Object.freeze({
  cafe: {
    prompt: 'Reply while you walk:',
    options: [
      { label: 'Did Mara come here often?', lines: [{ speaker: 'LEV', text: 'Three mornings a week. She tipped badly and always returned the cup herself.' }] },
      { label: 'You remembered the cup.', lines: [{ speaker: 'LEV', text: 'It was chipped on the side she drank from. I remember useless things.' }] },
    ],
    silenceLines: [{ speaker: 'LEV', text: 'You do not have to answer. Keep walking; the fountain is east of the square.' }],
  },
  fountain: {
    prompt: 'Reply while you walk:',
    options: [
      { label: 'Why bring me by this route?', lines: [{ speaker: 'LEV', text: 'Because the tape will sound smaller if you remember where those voices were living.' }] },
      { label: 'The pump still sounds the same.', lines: [{ speaker: 'LEV', text: 'Yes. The city repaired everything except the noise.' }] },
    ],
    silenceLines: [{ speaker: 'LEV', text: 'The burned letter box is beside the old archive.' }],
  },
  letters: {
    prompt: 'Reply while you walk:',
    options: [
      { label: 'Were any letters about Mara?', lines: [{ speaker: 'LEV', text: 'Two mentioned her. The rest were ordinary people afraid an investigation would expose their own lives.' }] },
      { label: 'The archive called this obstruction.', lines: [{ speaker: 'LEV', text: 'The archive can afford simple words. The people living here could not.' }] },
    ],
    silenceLines: [{ speaker: 'LEV', text: 'The first-tram platform is south. I will wait at the overlook.' }],
  },
  platform: {
    prompt: 'Reply while you walk:',
    options: [
      { label: 'I had forgotten that morning.', lines: [{ speaker: 'LEV', text: 'Mara had not. She recorded ten minutes of it by accident.' }] },
      { label: 'We thought we had more time.', lines: [{ speaker: 'LEV', text: 'We did have time. We just did not know which parts would later count as evidence.' }] },
    ],
    silenceLines: [{ speaker: 'LEV', text: 'Come west. I am sitting where the first tram used to catch the sunrise.' }],
  },
});

function wornMetal(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0.18 });
}

function makeNeutralSeatedLev() {
  const root = new THREE.Group();
  root.name = 'lev-neutral-placeholder-pending-final-decimated-model';
  const coat = wornMetal(0x30383c);
  const cloth = wornMetal(0x202629);
  const skin = new THREE.MeshStandardMaterial({ color: 0x9a765f, roughness: 0.95 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.62, 4, 8), coat);
  torso.position.y = 1.03;
  root.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), skin);
  head.position.set(0, 1.63, -0.03);
  root.add(head);
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.48, 3, 6), coat);
    arm.position.set(side * 0.28, 1.07, 0.04);
    arm.rotation.z = side * -0.2;
    root.add(arm);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.45, 3, 6), cloth);
    thigh.position.set(side * 0.13, 0.63, -0.19);
    thigh.rotation.x = Math.PI / 2.6;
    root.add(thigh);
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.45, 3, 6), cloth);
    shin.position.set(side * 0.13, 0.34, -0.42);
    root.add(shin);
  }
  root.traverse((child) => { if (child.isMesh) child.castShadow = true; });
  return root;
}

function makeCassette() {
  const root = new THREE.Group();
  root.name = 'mara-ordinary-morning-cassette';
  box(root, { y: 0.14, w: 0.62, h: 0.28, d: 0.10, material: wornMetal(0x2a2622), name: 'cassette-shell' });
  for (const x of [-0.16, 0.16]) {
    const reel = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.012, 6, 18), mat(0xc9b47f));
    reel.rotation.x = Math.PI / 2;
    reel.position.set(x, 0.15, -0.057);
    root.add(reel);
  }
  return root;
}

export class LevRevisitSequence {
  constructor(ctx, parent) {
    this.ctx = ctx;
    this.root = new THREE.Group();
    this.root.name = 'lev-memory-walk';
    parent.add(this.root);
    this._entryPending = false;
    this._entrySpoken = false;
    this._buildReceiver();
    this._buildMemoryStops();
    this._buildOverlook();
    this.ready = Promise.resolve();
  }

  _buildReceiver() {
    this.radioRoot = new THREE.Group();
    this.radioRoot.name = 'lev-portable-receiver';
    this.radioRoot.position.set(LEV_REVISIT_SITES.radio.x, 0, LEV_REVISIT_SITES.radio.z);
    this.root.add(this.radioRoot);
    box(this.radioRoot, { y: 0.48, w: 0.52, h: 0.64, d: 0.28, material: wornMetal(0x26343a), name: 'receiver-body' });
    box(this.radioRoot, { y: 0.59, z: -0.15, w: 0.31, h: 0.20, d: 0.025, material: wornMetal(0x11191d), name: 'receiver-speaker' });
    box(this.radioRoot, { x: 0.17, y: 1.0, w: 0.035, h: 0.50, d: 0.035, material: wornMetal(0x9b733c), name: 'receiver-antenna' });
    this.radioLamp = new THREE.MeshBasicMaterial({ color: 0xd8a44b });
    box(this.radioRoot, { x: -0.17, y: 0.35, z: -0.16, w: 0.07, h: 0.07, d: 0.035, material: this.radioLamp, name: 'receiver-call-light' });
    hitProxy(this.radioRoot, { y: 0.55, w: 1.2, h: 1.3, d: 1.0, name: 'receiver-interaction' });
  }

  _buildMemoryStops() {
    this.stopRoots = new Map();
    this.stopParts = new Map();
    const builds = {
      cafe: (root) => {
        box(root, { y: 0.42, w: 0.72, h: 0.06, d: 0.72, material: wornMetal(0x443b30), name: 'closed-cafe-table' });
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.18, 10), mat(0xa79878));
        cup.position.set(0.1, 0.55, 0);
        root.add(cup);
        const receipt = box(root, { x: 0.1, y: 0.47, w: 0.31, h: 0.012, d: 0.16, material: mat(0xd1c49f), name: 'mara-breakfast-receipt' });
        receipt.visible = false;
        this.stopParts.set('cafe', { cup, receipt });
      },
      fountain: (root) => {
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.38, 32), new THREE.MeshBasicMaterial({ color: 0x6c9895, side: THREE.DoubleSide, transparent: true, opacity: 0.42 }));
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.025;
        root.add(ring);
        const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.012, 18), mat(0xb28b4f));
        coin.rotation.x = Math.PI / 2;
        coin.position.set(0.13, 0.045, -0.07);
        root.add(coin);
        const ripple = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.135, 24), new THREE.MeshBasicMaterial({ color: 0xc2e2dc, transparent: true, opacity: 0 }));
        ripple.rotation.x = -Math.PI / 2;
        ripple.position.y = 0.035;
        root.add(ripple);
        this.stopParts.set('fountain', { coin, ripple });
      },
      letters: (root) => {
        for (let i = 0; i < 5; i++) {
          const paper = box(root, { x: (i - 2) * 0.16, y: 0.018 + i * 0.003, z: (i % 2) * 0.12, w: 0.24, h: 0.012, d: 0.16, material: mat(i < 2 ? 0x3b3029 : 0x766b55), name: 'scorched-letter-copy' });
          paper.rotation.y = (i - 2) * 0.18;
        }
        const readable = box(root, { x: -0.26, y: 0.026, z: -0.13, w: 0.38, h: 0.014, d: 0.23, material: mat(0xb7a98a), name: 'mara-legible-letter-fragment' });
        readable.visible = false;
        this.stopParts.set('letters', { readable });
      },
      platform: (root) => {
        box(root, { y: 0.34, w: 1.4, h: 0.10, d: 0.38, material: wornMetal(0x34383a), name: 'first-tram-bench' });
        for (const x of [-0.52, 0.52]) box(root, { x, y: 0.16, w: 0.08, h: 0.32, d: 0.28, material: wornMetal(0x25292b) });
        const bellMaterial = new THREE.MeshStandardMaterial({
          color: 0x5f594b,
          emissive: 0xd8a35d,
          emissiveIntensity: 0,
          roughness: 0.72,
          metalness: 0.28,
        });
        const bell = new THREE.Mesh(new THREE.SphereGeometry(0.10, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), bellMaterial);
        bell.position.set(0.55, 1.05, 0);
        bell.rotation.x = Math.PI;
        root.add(bell);
        box(root, { x: 0.55, y: 0.78, w: 0.035, h: 0.44, d: 0.035, material: wornMetal(0x33383a), name: 'old-platform-bell-post' });
        this.stopParts.set('platform', { bell, bellMaterial });
      },
    };
    for (const [id, build] of Object.entries(builds)) {
      const root = new THREE.Group();
      root.name = `mara-memory-${id}`;
      root.position.set(LEV_REVISIT_SITES[id].x, 0, LEV_REVISIT_SITES[id].z);
      this.root.add(root);
      build(root);
      const light = new THREE.PointLight(0xd8a35d, 0, 3.5, 2);
      light.position.y = 0.7;
      root.add(light);
      root.userData.guideLight = light;
      hitProxy(root, { y: 0.65, w: 1.8, h: 1.4, d: 1.8, name: `${id}-memory-action` });
      this.stopRoots.set(id, root);
    }
  }

  _buildOverlook() {
    this.overlookRoot = new THREE.Group();
    this.overlookRoot.name = 'west-overlook-with-lev';
    this.overlookRoot.position.set(LEV_REVISIT_SITES.overlook.x, 0, LEV_REVISIT_SITES.overlook.z);
    this.root.add(this.overlookRoot);
    box(this.overlookRoot, { y: 0.48, w: 2.7, h: 0.12, d: 0.55, material: wornMetal(0x353638), name: 'overlook-bench-seat' });
    box(this.overlookRoot, { y: 0.93, z: 0.23, w: 2.7, h: 0.72, d: 0.10, material: wornMetal(0x2b2e30), name: 'overlook-bench-back' });
    for (const x of [-1.05, 1.05]) box(this.overlookRoot, { x, y: 0.22, w: 0.10, h: 0.44, d: 0.42, material: wornMetal(0x242729) });
    this.levRoot = makeNeutralSeatedLev();
    this.levRoot.position.set(0.72, 0.47, -0.05);
    this.levRoot.rotation.y = Math.PI;
    this.overlookRoot.add(this.levRoot);
    this.cassetteRoot = makeCassette();
    this.cassetteRoot.position.set(-0.45, 0.59, -0.06);
    this.overlookRoot.add(this.cassetteRoot);
    this.cassetteLight = new THREE.PointLight(0xd7a35b, 0, 2.6, 2);
    this.cassetteLight.position.set(-0.45, 0.9, -0.06);
    this.overlookRoot.add(this.cassetteLight);
    hitProxy(this.overlookRoot, { y: 0.95, w: 3.5, h: 1.9, d: 2.2, name: 'lev-overlook-interaction' });
  }

  registerInteractions() {
    const { interaction, model, dialogue } = this.ctx;
    const state = () => model.getSnapshot().levRevisit;
    interaction.register('echo-take-lev-receiver', {
      mesh: this.radioRoot,
      enabled: () => state().beat === 'take-radio',
      prompt: 'E — ANSWER LEV\'S RECEIVER',
      action: () => {
        if (model.dispatch({ type: 'takeLevRadio' }).changed) dialogue.play(LINES.radio);
      },
    });
    for (const [id, root] of this.stopRoots) {
      interaction.register(`echo-memory-action-${id}`, {
        mesh: root,
        enabled: () => STOP_BY_BEAT[state().beat] === id,
        prompt: STOP_PROMPTS[id],
        action: () => this._performMemoryAction(id),
      });
    }
    interaction.register('echo-meet-lev-overlook', {
      mesh: this.overlookRoot,
      enabled: () => ['meet-lev', 'take-cassette'].includes(state().beat),
      prompt: () => state().beat === 'meet-lev' ? 'E — SIT WITH LEV' : 'E — TAKE MARA\'S CASSETTE',
      action: () => {
        if (state().beat === 'meet-lev') {
          if (model.dispatch({ type: 'meetLevAtOverlook' }).changed) dialogue.play(LINES.overlook);
          return;
        }
        if (!model.dispatch({ type: 'claimMaraCassette' }).changed) return;
        this.ctx.directionProgress.dispatch({ type: 'artifact.take', id: CHAPTER05_DIRECTIONS.ECHO_CITY });
        this.ctx.syncCarriedArtifact();
        dialogue.play(LINES.cassette);
      },
    });
  }

  enter() {
    this._entryPending = this.ctx.model.getSnapshot().levRevisit.beat === 'take-radio';
  }

  _performMemoryAction(id) {
    if (!this.ctx.model.dispatch({ type: 'performLevMemoryAction', stop: id }).changed) return;
    // Apply the physical result immediately. The normal scene tick will keep it
    // in sync, but the player's hand action should never wait on the next frame.
    this.update(0, this.ctx.model.getSnapshot(), null);
    const response = RESPONSES[id];
    this.ctx.dialogue.play(LINES[id], {
      onComplete: () => this.ctx.dialogue.offerChoice({ ...response, timeout: 11 }),
    });
  }

  getMinimapState() {
    const state = this.ctx.model.getSnapshot().levRevisit;
    const current = state.beat === 'take-radio' ? 'radio'
      : STOP_BY_BEAT[state.beat] ?? (['meet-lev', 'take-cassette'].includes(state.beat) ? 'overlook' : state.beat === 'return' ? 'museum' : null);
    const complete = new Set([
      ...(state.radioTaken ? ['radio'] : []),
      ...(state.cafeReached ? ['cafe'] : []),
      ...(state.fountainReached ? ['fountain'] : []),
      ...(state.lettersReached ? ['letters'] : []),
      ...(state.platformReached ? ['platform'] : []),
      ...(state.levMet ? ['overlook'] : []),
    ]);
    return {
      route: 'lev-revisit',
      title: 'ECHO CITY · MARA\'S TAPE',
      markers: [
        { id: 'radio', label: 'RECEIVER', ...LEV_REVISIT_SITES.radio },
        { id: 'cafe', label: 'CAFE', ...LEV_REVISIT_SITES.cafe },
        { id: 'fountain', label: 'FOUNTAIN', ...LEV_REVISIT_SITES.fountain },
        { id: 'letters', label: 'LETTERS', ...LEV_REVISIT_SITES.letters },
        { id: 'platform', label: 'FIRST TRAM', ...LEV_REVISIT_SITES.platform },
        { id: 'overlook', label: 'LEV', ...LEV_REVISIT_SITES.overlook },
        { id: 'museum', label: 'MUSEUM', ...LEV_REVISIT_SITES.museum },
      ].map((marker) => ({ ...marker, state: marker.id === current ? 'urgent' : complete.has(marker.id) ? 'complete' : 'muted' })),
    };
  }

  update(_dt, snapshot, _playerPosition) {
    const state = snapshot.levRevisit;
    if (this._entryPending && !this._entrySpoken && this.ctx.interaction.enabled && !this.ctx.dialogue.isPlaying) {
      this._entryPending = false;
      this._entrySpoken = true;
      this.ctx.dialogue.play(LINES.entry);
    }
    this.radioRoot.visible = !state.radioTaken;
    if (!state.radioTaken) this.radioLamp.color.setHSL(0.1, 0.62, 0.52 + Math.sin(performance.now() * 0.004) * 0.12);
    const currentStop = STOP_BY_BEAT[state.beat] ?? null;
    for (const [id, root] of this.stopRoots) {
      const active = id === currentStop;
      root.userData.guideLight.intensity = active ? 0.75 + Math.sin(performance.now() * 0.0025) * 0.25 : 0;
    }
    const cafe = this.stopParts.get('cafe');
    cafe.receipt.visible = state.cafeCupTurned;
    cafe.cup.rotation.z = state.cafeCupTurned ? Math.PI / 2 : 0;
    cafe.cup.position.x = state.cafeCupTurned ? 0.27 : 0.1;
    const fountain = this.stopParts.get('fountain');
    fountain.coin.visible = !state.fountainCoinTaken;
    fountain.ripple.material.opacity = state.fountainCoinTaken
      ? 0.18 + Math.sin(performance.now() * 0.004) * 0.12
      : 0;
    this.stopParts.get('letters').readable.visible = state.lettersBrushed;
    const platform = this.stopParts.get('platform');
    platform.bellMaterial.emissiveIntensity = state.platformWaited
      ? 0.7 + Math.sin(performance.now() * 0.003) * 0.25
      : 0;
    this.cassetteRoot.visible = state.levMet && !state.cassetteClaimed;
    this.cassetteLight.intensity = state.beat === 'take-cassette' ? 1.4 + Math.sin(performance.now() * 0.003) * 0.35 : 0;
  }
}
