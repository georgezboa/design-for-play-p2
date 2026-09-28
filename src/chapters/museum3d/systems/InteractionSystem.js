// Center-screen raycast interaction. One focused interactable at a time, one
// activate key family (E / Enter). Space is reserved for jump.
//
// The focused object is marked with the game's one "you can act on this"
// sign: a paper `.nf-tag` (src/shell/uiKit.css) pinned above the object on
// screen, with its amber glint. Prompts are written 'E · READ THE CARD';
// the leading key becomes the tag's <kbd>.

import * as THREE from 'three';
import { PLAYER } from '../config.js';

const escapeHtml = (value) => String(value).replace(/[&<>"]/g, (char) => `&#${char.charCodeAt(0)};`);

/** 'HOLD E · SLOT THE KEYS' → '<kbd>HOLD E</kbd> SLOT THE KEYS'. */
export function tagHtml(text) {
  const match = /^(HOLD E|E|CLICK|LMB)\s*[·—-]\s*(.*)$/.exec(String(text ?? ''));
  if (!match) return escapeHtml(text ?? '');
  return `<kbd>${escapeHtml(match[1])}</kbd> ${escapeHtml(match[2])}`;
}

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
    this._box = new THREE.Box3();
    this._anchor = new THREE.Vector3();
    this._lastHtml = '';
    this.enabled = true;
    this.hidden = false; // cards / exhibit overlays hide the tag
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

  /** The raycast target, ignoring the proximity fallback. */
  get aimed() {
    return this._focusedFromFallback ? null : this._focused;
  }

  update() {
    if (!this.enabled) {
      // Critical proximity actions remain readable while a browser's pointer
      // lock state briefly drops. Their caller still decides whether to accept
      // the key press; this only preserves the player-facing prompt.
      const fallback = this._fallbackId ? this._interactables.get(this._fallbackId) : null;
      this._setFocused(fallback?.showWhenInactive && fallback.enabled() ? fallback : null, Boolean(fallback && this._fallbackPromptOnly), true);
      return;
    }
    // the controller moved the camera this frame; render has not refreshed
    // its matrix yet, and a stale one aims the tag at last frame's object
    this.camera.updateMatrixWorld?.();
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
    let fromFallback = false;
    if (!found && this._fallbackId) {
      const fallback = this._interactables.get(this._fallbackId) ?? null;
      if (fallback?.enabled()) {
        found = fallback;
        fromFallback = true;
        foundFromPromptOnlyFallback = this._fallbackPromptOnly;
      }
    }
    this._setFocused(found, foundFromPromptOnlyFallback, fromFallback);
  }

  _setFocused(entry, fromPromptOnlyFallback = false, fromFallback = false) {
    this._focused = entry;
    this._focusedFromPromptOnlyFallback = fromPromptOnlyFallback;
    this._focusedFromFallback = fromFallback;
    if (!entry || this.hidden) {
      this.promptEl.hidden = true;
      this.promptEl.style.display = 'none';
      return;
    }
    const text = typeof entry.prompt === 'function' ? entry.prompt() : entry.prompt;
    const html = tagHtml(text);
    if (html !== this._lastHtml) {
      this.promptEl.innerHTML = html;
      this._lastHtml = html;
    }
    this.promptEl.hidden = false;
    this.promptEl.style.display = '';
    this._placeTag(entry.mesh);
  }

  // Pin the tag just above the object's on-screen centre, kept inside the
  // viewport and a little above the reticle so it never covers what you aim at.
  _placeTag(mesh) {
    if (typeof window === 'undefined') return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    let x = w / 2;
    let y = h * 0.44;
    let fills = false;
    try {
      this._box.setFromObject(mesh, true);
      if (!this._box.isEmpty()) {
        this._box.getCenter(this._anchor);
        // An object that fills the view (a door, a case face-on) carries its
        // plaques up where the tag would go: pin it in the lower third,
        // above the caption bar.
        const top = this._anchor.clone().setY(this._box.max.y).project(this.camera);
        const bottom = this._anchor.clone().setY(this._box.min.y).project(this.camera);
        fills = top.z < 1 && bottom.z < 1 && (top.y > 0.9 || top.y - bottom.y > 1.1);
        this._anchor.y = Math.min(this._box.max.y, this._anchor.y + (this._box.max.y - this._anchor.y) * 0.5);
        this._anchor.project(this.camera);
        if (fills) {
          x = w / 2;
        } else if (this._anchor.z < 1 && Math.abs(this._anchor.x) < 1.2 && Math.abs(this._anchor.y) < 1.2) {
          x = (this._anchor.x * 0.5 + 0.5) * w;
          y = (-this._anchor.y * 0.5 + 0.5) * h;
        }
      }
    } catch { /* keep the centre fallback */ }
    x = Math.max(140, Math.min(w - 140, x));
    y = fills ? Math.round(h * 0.76) : Math.max(60, Math.min(h * 0.46, y));
    this.promptEl.style.left = `${Math.round(x)}px`;
    this.promptEl.style.top = `${Math.round(y)}px`;
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
