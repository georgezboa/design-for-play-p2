// Center-screen raycast interaction. One focused interactable at a time, one
// prompt region, one activate key family (E / Enter). Space is reserved for jump.

import * as THREE from 'three';
import { PLAYER } from '../config.js';

export class InteractionSystem {
  constructor(camera, promptEl) {
    this.camera = camera;
    this.promptEl = promptEl;
    this._raycaster = new THREE.Raycaster();
    this._raycaster.far = PLAYER.interactRange;
    this._center = new THREE.Vector2(0, 0);
    this._interactables = new Map(); // id -> { mesh, prompt, action, enabled }
    this._focused = null;
    this._fallbackId = null;
    this._fallbackPromptOnly = false;
    this._focusedFromPromptOnlyFallback = false;
    this.enabled = true;
    // Key routing lives in Museum3DApp: E/Enter advances dialogue when
    // one is playing, otherwise activates the focused interactable.
  }

  register(id, { mesh, prompt, action, enabled = () => true, pointerOnly = false, showWhenInactive = false }) {
    this._interactables.set(id, { id, mesh, prompt, action, enabled, pointerOnly, showWhenInactive });
    mesh.traverse((child) => {
      child.userData.interactableId = id;
    });
  }

  unregister(id) {
    this._interactables.delete(id);
    if (this._focused?.id === id) this._focused = null;
  }

  clear() {
    this._interactables.clear();
    this._focused = null;
    this._fallbackId = null;
  }

  // A doorway-sized proximity fallback keeps critical entrances usable when
  // the centre reticle lands just beside a thin door proxy. Raycast focus
  // still wins whenever the player is deliberately looking at another item.
  setFallback(id = null, { promptOnly = false } = {}) {
    this._fallbackId = id;
    this._fallbackPromptOnly = promptOnly;
  }

  get focused() {
    return this._focused;
  }

  update() {
    if (!this.enabled) {
      // Critical proximity actions remain readable while a browser's pointer
      // lock state briefly drops. Their caller still decides whether to accept
      // the key press; this only preserves the player-facing E prompt.
      const fallback = this._fallbackId ? this._interactables.get(this._fallbackId) : null;
      this._setFocused(fallback?.showWhenInactive && fallback.enabled() ? fallback : null, Boolean(fallback && this._fallbackPromptOnly));
      return;
    }
    this._raycaster.setFromCamera(this._center, this.camera);
    const meshes = [];
    for (const entry of this._interactables.values()) {
      if (entry.enabled()) meshes.push(entry.mesh);
    }
    const hits = this._raycaster.intersectObjects(meshes, true);
    let found = null;
    if (hits.length > 0) {
      let obj = hits[0].object;
      while (obj && !obj.userData.interactableId) obj = obj.parent;
      if (obj) found = this._interactables.get(obj.userData.interactableId) ?? null;
    }
    let foundFromPromptOnlyFallback = false;
    if (!found && this._fallbackId) {
      const fallback = this._interactables.get(this._fallbackId) ?? null;
      if (fallback?.enabled()) {
        found = fallback;
        foundFromPromptOnlyFallback = this._fallbackPromptOnly;
      }
    }
    this._setFocused(found, foundFromPromptOnlyFallback);
  }

  _setFocused(entry, fromPromptOnlyFallback = false) {
    this._focused = entry;
    this._focusedFromPromptOnlyFallback = fromPromptOnlyFallback;
    if (entry) {
      this.promptEl.textContent = typeof entry.prompt === 'function' ? entry.prompt() : entry.prompt;
      this.promptEl.style.display = 'block';
    } else {
      this.promptEl.style.display = 'none';
    }
  }

  activate({ pointer = false } = {}) {
    const focusedEntry = this._focused?.enabled() && !this._focusedFromPromptOnlyFallback
      ? this._focused : null;
    const fallbackEntry = !this._fallbackPromptOnly && this._fallbackId
      ? this._interactables.get(this._fallbackId) : null;
    const entry = focusedEntry ?? fallbackEntry;
    if (entry?.enabled() && (!entry.pointerOnly || pointer)) {
      entry.action();
      return true;
    }
    return false;
  }
}
