import * as THREE from 'three';

import { bell, clunk } from '../../chapters/borrowedLight/audio.js';

// The night climax: drag the cut lower feed into the old clamp. Nothing lights
// at once — the connection fires on the next train bell, with Chapter 2's
// timing and sound (a bell every 4 s, a ring meter that fills between bells).
// The meter exists only while this puzzle is active.

export const BELL_PERIOD_SECONDS = 4;
const SEAT_RADIUS = 0.55;
const GRAB_RADIUS_PX = 86;
// A click this close to the copper end (but not on it) counts as a miss
// worth telling the player about.
const NEAR_MISS_PX = 220;
const SEAT_RADIUS_PX = 46;
const COPPER = 0xb8733a;
// The clamp's target ring is ivory and teal so it never reads as copper.
const RING = 0x7fd6c8;

function bellMeterMarkup() {
  return `
    <svg class="c3-bell__ring" viewBox="0 0 100 100" aria-hidden="true">
      <circle class="c3-bell__track" cx="50" cy="50" r="42"></circle>
      <circle class="c3-bell__fill" cx="50" cy="50" r="42" pathLength="100"></circle>
    </svg>
    <svg class="c3-bell__icon" viewBox="0 0 40 40" aria-hidden="true">
      <path d="M20 5c1.4 0 2.5 1.1 2.5 2.5v.9c4.8 1.1 8 5.3 8 10.4v6.4l3 3.8v1.5H6.5V29l3-3.8v-6.4c0-5.1 3.2-9.3 8-10.4v-.9C17.5 6.1 18.6 5 20 5z"/>
      <circle cx="20" cy="34" r="3"/>
    </svg>
    <span class="c3-bell__label">NEXT BELL</span>`;
}

export class Chapter3BellClamp {
  constructor({ preview, onSeated = null, onBell = null } = {}) {
    this.preview = preview;
    this.onSeated = onSeated;
    this.onBell = onBell;
    this.active = false;
    this.seated = false;
    this.fired = false;
    this.phase = 0;
    this.dragging = false;
    this.meter = document.createElement('div');
    this.meter.className = 'c3-bell';
    this.meter.hidden = true;
    this.meter.setAttribute('role', 'timer');
    this.meter.setAttribute('aria-label', 'Next train bell');
    this.meter.innerHTML = bellMeterMarkup();
    document.body.append(this.meter);
    this.fill = this.meter.querySelector('.c3-bell__fill');

    // The loose copper end Butch lifts (world object).
    this.end = new THREE.Group();
    this.end.name = 'chapter3-loose-feed-end';
    const copper = new THREE.MeshStandardMaterial({ color: COPPER, roughness: 0.35, metalness: 0.85, emissive: 0x3a1a08, emissiveIntensity: 0.6 });
    this.copper = copper;
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.0, 14), copper);
    cable.rotation.z = Math.PI / 2;
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.22, 14), new THREE.MeshStandardMaterial({ color: 0xd9b56e, roughness: 0.3, metalness: 0.9 }));
    tip.rotation.z = Math.PI / 2;
    tip.position.x = 0.5;
    this.end.add(cable, tip);
    this.glow = new THREE.PointLight(0xe0a24a, 0, 3.2, 1.8);
    this.glow.position.set(0.5, 0.4, 0);
    this.end.add(this.glow);
    this.end.visible = false;
    preview.scene.add(this.end);
    // The open clamp: a teal ring with an ivory socket at its centre (the
    // copper end is the thing you lift; the ring is where it goes).
    this.clampMarker = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.36, 0.48, 40),
      new THREE.MeshBasicMaterial({ color: RING, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }),
    );
    const socket = new THREE.Mesh(
      new THREE.CircleGeometry(0.14, 24),
      new THREE.MeshBasicMaterial({ color: 0xeadfc6, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }),
    );
    for (const mesh of [ring, socket]) {
      mesh.rotation.x = -Math.PI / 2;
      mesh.renderOrder = 6;
      this.clampMarker.add(mesh);
    }
    this.clampMarker.visible = false;
    preview.scene.add(this.clampMarker);
    // Grab highlight: an amber halo under the copper end while it can be
    // lifted (brighter on hover and while dragging).
    this.grabHalo = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.66, 36),
      new THREE.MeshBasicMaterial({ color: 0xe0a24a, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide }),
    );
    this.grabHalo.rotation.x = -Math.PI / 2;
    this.grabHalo.renderOrder = 6;
    this.grabHalo.visible = false;
    preview.scene.add(this.grabHalo);
    this.hovering = false;
    this.missFlash = 0;
    this.misses = 0;
    this.elapsed = 0;
  }

  // `clamp` is the clamp mouth; the loose end starts beside it.
  start({ clamp, restFrom }) {
    this.active = true;
    this.seated = false;
    this.fired = false;
    this.phase = 0;
    this.clamp = clamp.clone();
    this.rest = restFrom.clone();
    this.end.position.copy(this.rest);
    this.end.rotation.y = Math.atan2(-(this.clamp.z - this.rest.z), this.clamp.x - this.rest.x);
    this.end.visible = true;
    this.clampMarker.position.set(this.clamp.x, this.clamp.y + 0.03, this.clamp.z);
    this.clampMarker.visible = true;
    this.meter.hidden = false;
  }

  stop() {
    this.active = false;
    this.dragging = false;
    this.hovering = false;
    this.meter.hidden = true;
    this.clampMarker.visible = false;
    this.grabHalo.visible = false;
    this.glow.intensity = 0;
    this.setCursor('');
  }

  setCursor(value) {
    const canvas = this.preview.renderer?.domElement;
    if (canvas && canvas.style.cursor !== value) canvas.style.cursor = value;
  }

  // Screen distance from a pointer to the copper end (tip or body).
  pointerDistance(event) {
    const tip = this.screenOf(this.tipWorld());
    const body = this.screenOf(this.end.position);
    return Math.min(Math.hypot(event.clientX - tip.x, event.clientY - tip.y), Math.hypot(event.clientX - body.x, event.clientY - body.y));
  }

  screenOf(position) {
    const rect = this.preview.renderer.domElement.getBoundingClientRect();
    const projected = position.clone().project(this.preview.camera);
    return { x: rect.left + (projected.x + 1) * rect.width * 0.5, y: rect.top + (1 - projected.y) * rect.height * 0.5 };
  }

  tipWorld() {
    return this.end.localToWorld(new THREE.Vector3(0.5, 0, 0));
  }

  handlePointerDown(event) {
    if (!this.active || this.seated) return false;
    const near = this.pointerDistance(event);
    if (near > GRAB_RADIUS_PX) {
      // A grab that just missed: say so instead of silently walking.
      if (near <= NEAR_MISS_PX) {
        this.missFlash = 1;
        this.misses += 1;
        this.lastMiss = 'grab';
        return true;
      }
      return false;
    }
    this.dragging = true;
    this.setCursor('grabbing');
    return true;
  }

  handlePointerMove(event) {
    if (!this.dragging) {
      if (!this.active || this.seated) return false;
      const hovering = this.pointerDistance(event) <= GRAB_RADIUS_PX;
      if (hovering !== this.hovering) {
        this.hovering = hovering;
        this.setCursor(hovering ? 'grab' : '');
      }
      return hovering;
    }
    const point = this.preview.projectPointerToGround(event);
    if (!point) return true;
    // Keep the end on a short leash from where it lay: it is a cut cable, not
    // a free object.
    const leash = point.clone().sub(this.rest).setY(0);
    const max = this.rest.distanceTo(this.clamp) + 0.8;
    if (leash.length() > max) leash.setLength(max);
    this.end.position.set(this.rest.x + leash.x - 0.5 * Math.cos(this.end.rotation.y), this.rest.y + 0.12, this.rest.z + leash.z + 0.5 * Math.sin(this.end.rotation.y));
    return true;
  }

  // Over the ring: in the world, or on screen (the pointer is projected onto
  // the walk plane, which sits a little above the clamp, so on the fixed
  // isometric camera the two can disagree by a few pixels).
  overRing(event = null) {
    if (this.tipWorld().setY(this.clamp.y).distanceTo(this.clamp) <= SEAT_RADIUS) return true;
    const ring = this.screenOf(this.clamp);
    const tip = this.screenOf(this.tipWorld());
    if (Math.hypot(tip.x - ring.x, tip.y - ring.y) <= SEAT_RADIUS_PX) return true;
    return Boolean(event && Math.hypot(event.clientX - ring.x, event.clientY - ring.y) <= SEAT_RADIUS_PX);
  }

  handlePointerUp(event = null) {
    if (!this.dragging) return false;
    this.dragging = false;
    this.setCursor(this.hovering ? 'grab' : '');
    if (this.overRing(event)) this.seat();
    else {
      // Dropped short: it springs back and the ring flashes.
      this.end.position.copy(this.rest);
      this.missFlash = 1;
      this.misses += 1;
      this.lastMiss = 'drop';
    }
    return true;
  }

  // Keyboard fallback (E beside the clamp) and the drop above.
  seat() {
    if (!this.active || this.seated) return false;
    this.seated = true;
    this.end.position.set(this.clamp.x - 0.5 * Math.cos(this.end.rotation.y), this.clamp.y + 0.02, this.clamp.z + 0.5 * Math.sin(this.end.rotation.y));
    this.clampMarker.visible = false;
    this.grabHalo.visible = false;
    this.dragging = false;
    this.setCursor('');
    clunk('points');
    this.onSeated?.();
    return true;
  }

  update(dt) {
    if (!this.active) return;
    this.elapsed += dt;
    this.phase += dt / BELL_PERIOD_SECONDS;
    if (this.phase >= 1) {
      this.phase -= 1;
      bell({ soft: !this.seated });
      this.meter.classList.remove('is-ringing');
      void this.meter.offsetWidth;
      this.meter.classList.add('is-ringing');
      if (this.seated && !this.fired) {
        this.fired = true;
        this.onBell?.();
      }
    }
    this.fill.style.strokeDashoffset = String(100 - this.phase * 100);
    this.meter.classList.toggle('is-due', this.phase > 0.86);
    this.glow.intensity = this.seated ? 3 + Math.sin(this.elapsed * 12) * 1.2 : 1.2 + Math.sin(this.elapsed * 4) * 0.6;
    this.missFlash = Math.max(0, this.missFlash - dt * 1.6);
    if (this.clampMarker.visible) {
      this.clampMarker.scale.setScalar(1 + Math.sin(this.elapsed * 5) * 0.1 + this.missFlash * 0.35);
    }
    const halo = !this.seated;
    this.grabHalo.visible = halo;
    if (halo) {
      this.grabHalo.position.set(this.end.position.x, this.end.position.y + 0.02, this.end.position.z);
      const lit = this.dragging ? 1 : this.hovering ? 0.85 : 0.45 + 0.2 * Math.sin(this.elapsed * 4);
      this.grabHalo.material.opacity = Math.min(1, lit + this.missFlash * 0.5);
      this.grabHalo.scale.setScalar(1 + this.missFlash * 0.4);
      this.copper.emissiveIntensity = 0.6 + (this.hovering || this.dragging ? 0.9 : 0) + this.missFlash;
    }
  }

  // Words for the one tag over the clamp: what to do, or what just failed.
  tagText() {
    if (this.dragging) return 'DROP IT INTO THE <b>TEAL RING</b>';
    if (this.missFlash > 0.05 && this.lastMiss === 'grab') return 'GRAB THE <b>COPPER END</b> · OR <kbd>E</kbd>';
    if (this.missFlash > 0.05 && this.lastMiss === 'drop') return 'NOT QUITE · INTO THE <b>TEAL RING</b>';
    return 'DRAG THE <b>COPPER END</b> INTO THE <b>TEAL RING</b> · OR <kbd>E</kbd>';
  }

  snapshot() {
    return {
      active: this.active,
      seated: this.seated,
      fired: this.fired,
      dragging: this.dragging,
      hovering: this.hovering,
      misses: this.misses,
      tag: this.active && !this.seated ? this.tagText().replace(/<[^>]+>/g, '') : null,
      bellPhase: Number(this.phase.toFixed(3)),
      meterVisible: !this.meter.hidden,
    };
  }
}
