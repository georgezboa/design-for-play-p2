// First-person controller: pointer-lock mouse look + WASD/arrow movement
// movement against a StaticCollisionWorld. Pointer lock is treated as a state
// that can fail or be declined (headless, permissions); failures are silent
// and the resume overlay simply stays up. Resuming always needs a fresh
// user gesture. Look is implemented directly (no PointerLockControls) so
// lock errors never reach the console as uncaught noise.

import * as THREE from 'three';
import { PLAYER } from '../config.js';

const KEY_MAP = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'back',
  ArrowDown: 'back',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
};

const PITCH_LIMIT = 1.2;
const LANDING_EPSILON = 0.04;
const STEP_HEIGHT = 0.28;
const FALLBACK_TAP_DISTANCE = 0.18;

export class FirstPersonController {
  constructor(camera, domElement, collisionWorld) {
    this.camera = camera;
    this.domElement = domElement;
    this.collisionWorld = collisionWorld;
    this.enabled = true; // false during transitions/overlays
    this.speed = PLAYER.walkSpeed;
    this.sensitivity = PLAYER.lookSensitivity;

    this._keys = { forward: false, back: false, left: false, right: false };
    this._tapPending = { forward: false, back: false, left: false, right: false };
    this._jumpQueued = false;
    this._verticalVelocity = 0;
    this._grounded = true;
    this._yaw = 0;
    this._pitch = 0;
    this._lockCallbacks = [];
    this._fallbackActive = false;
    this._dragging = false;
    this._lastPointer = { x: 0, y: 0 };
    this._reportedActive = false;
    this._lockFallbackTimer = null;

    // Feet position on the floor plane; camera.y = feet + eyeHeight.
    this.position = new THREE.Vector3(0, 0, 0);

    this._onKeyDown = (e) => {
      if (e.code === 'Escape' && this._fallbackActive) {
        this.unlock();
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault?.();
        if (this.enabled && !e.repeat) this._jumpQueued = true;
        return;
      }
      const dir = KEY_MAP[e.code];
      if (dir && this.enabled && this._fallbackActive && !e.repeat) {
        this._tapPending[dir] = true;
      }
      this._setKey(e.code, true);
    };
    this._onKeyUp = (e) => this._setKey(e.code, false);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);

    this._onMouseMove = (e) => {
      if (!this.enabled) return;
      let dx = 0;
      let dy = 0;
      if (this.isLocked) {
        dx = e.movementX;
        dy = e.movementY;
      } else if (this._fallbackActive && this._dragging) {
        dx = e.clientX - this._lastPointer.x;
        dy = e.clientY - this._lastPointer.y;
        this._lastPointer = { x: e.clientX, y: e.clientY };
      } else {
        return;
      }
      this._yaw -= dx * this.sensitivity;
      this._pitch = THREE.MathUtils.clamp(
        this._pitch - dy * this.sensitivity,
        -PITCH_LIMIT,
        PITCH_LIMIT,
      );
    };
    document.addEventListener('mousemove', this._onMouseMove);

    this._onMouseDown = (e) => {
      if (!this._fallbackActive || e.button !== 0) return;
      this._dragging = true;
      this._lastPointer = { x: e.clientX, y: e.clientY };
    };
    this._onMouseUp = () => {
      this._dragging = false;
    };
    this.domElement.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);

    this._onLockChange = () => {
      const locked = this.isLocked;
      if (locked) this._fallbackActive = false;
      this._notifyActiveChange();
    };
    document.addEventListener('pointerlockchange', this._onLockChange);
    // Silenced on purpose: a declined/failed lock leaves the resume overlay up.
    this._onLockError = () => {};
    document.addEventListener('pointerlockerror', this._onLockError);
  }

  _setKey(code, down) {
    const dir = KEY_MAP[code];
    if (dir) this._keys[dir] = down;
  }

  _clearKeys() {
    for (const k of Object.keys(this._keys)) this._keys[k] = false;
    for (const k of Object.keys(this._tapPending)) this._tapPending[k] = false;
    this._jumpQueued = false;
  }

  get isLocked() {
    return document.pointerLockElement === this.domElement;
  }

  get isActive() {
    return this.isLocked || this._fallbackActive;
  }

  get usesDragLook() {
    return this._fallbackActive && !this.isLocked;
  }

  _notifyActiveChange() {
    const active = this.isActive;
    if (active === this._reportedActive) return;
    this._reportedActive = active;
    if (!active) this._clearKeys();
    for (const fn of this._lockCallbacks) fn(active);
  }

  _activateFallback() {
    if (this.isLocked || this._fallbackActive) return;
    this._fallbackActive = true;
    this._notifyActiveChange();
  }

  lock() {
    if (this.isActive) return;
    if (typeof this.domElement.requestPointerLock !== 'function') {
      this._activateFallback();
      return;
    }
    try {
      const result = this.domElement.requestPointerLock();
      if (result && typeof result.catch === 'function') {
        result.catch(() => this._activateFallback());
      }
      clearTimeout(this._lockFallbackTimer);
      this._lockFallbackTimer = setTimeout(() => {
        if (!this.isLocked) this._activateFallback();
      }, 180);
    } catch {
      this._activateFallback();
    }
  }

  unlock() {
    try {
      if (this.isLocked) document.exitPointerLock();
    } catch {
      /* already unlocked */
    }
    if (this._fallbackActive) {
      this._fallbackActive = false;
      this._dragging = false;
      this._notifyActiveChange();
    }
  }

  onLockChange(fn) {
    this._lockCallbacks.push(fn);
  }

  // Place the feet at (x, z) and face `yaw` radians (0 = looking down -Z,
  // positive yaw turns left). Pitch clamped to a comfortable band.
  setPose(x, z, yaw = 0, pitch = 0) {
    const groundY = this.collisionWorld?.groundHeightAt?.(x, z) ?? 0;
    this.position.set(x, groundY, z);
    this._verticalVelocity = 0;
    this._grounded = true;
    this._jumpQueued = false;
    this._yaw = yaw;
    this._pitch = THREE.MathUtils.clamp(pitch, -PITCH_LIMIT, PITCH_LIMIT);
    this._applyCamera();
  }

  getYaw() {
    return this._yaw;
  }

  get isGrounded() {
    return this._grounded;
  }

  get verticalVelocity() {
    return this._verticalVelocity;
  }

  get isMoving() {
    return Object.values(this._keys).some(Boolean);
  }

  _applyCamera() {
    this.camera.position.set(this.position.x, this.position.y + PLAYER.eyeHeight, this.position.z);
    this.camera.rotation.set(0, 0, 0);
    this.camera.rotateY(this._yaw);
    this.camera.rotateX(this._pitch);
  }

  update(dt) {
    if (this.enabled) {
      const previousFeetY = this.position.y;
      if (this._jumpQueued && this._grounded) {
        this._verticalVelocity = PLAYER.jumpVelocity;
        this._grounded = false;
      }
      this._jumpQueued = false;

      if (!this._grounded) {
        this._verticalVelocity -= PLAYER.gravity * dt;
        this.position.y += this._verticalVelocity * dt;
      }

      const speed = this.speed * dt;
      let mx = 0;
      let mz = 0;
      const held = Object.values(this._keys).some(Boolean);
      if (held) {
        // A real held key has reached an animation frame, so its fallback tap
        // must not add a second burst when the key is later released.
        for (const key of Object.keys(this._keys)) {
          if (this._keys[key]) this._tapPending[key] = false;
        }
        if (this._keys.forward) mz -= 1;
        if (this._keys.back) mz += 1;
        if (this._keys.left) mx -= 1;
        if (this._keys.right) mx += 1;
      } else if (this._fallbackActive) {
        // Some embedded browsers deliver WASD as keydown+keyup inside one
        // render interval. Preserve that atomic press as one small step.
        if (this._tapPending.forward) mz -= 1;
        if (this._tapPending.back) mz += 1;
        if (this._tapPending.left) mx -= 1;
        if (this._tapPending.right) mx += 1;
        for (const key of Object.keys(this._tapPending)) this._tapPending[key] = false;
      }

      if (mx !== 0 || mz !== 0) {
        const moveDistance = held ? speed : FALLBACK_TAP_DISTANCE;
        const len = Math.hypot(mx, mz);
        mx = (mx / len) * moveDistance;
        mz = (mz / len) * moveDistance;
        const sin = Math.sin(this._yaw);
        const cos = Math.cos(this._yaw);
        // world displacement = R_y(yaw) · local (mx, mz)
        const dx = mx * cos + mz * sin;
        const dz = -mx * sin + mz * cos;
        const resolved = this.collisionWorld.moveAndCollide(
          this.position.x,
          this.position.z,
          dx,
          dz,
          PLAYER.radius,
          this.position.y,
          PLAYER.bodyHeight,
        );
        this.position.x = resolved.x;
        this.position.z = resolved.z;
      }

      const groundHeightAt = this.collisionWorld?.groundHeightAt?.bind(this.collisionWorld);
      if (this._grounded) {
        const supportY = groundHeightAt?.(
          this.position.x,
          this.position.z,
          this.position.y + STEP_HEIGHT,
        ) ?? 0;
        if (supportY < this.position.y - LANDING_EPSILON) {
          // The player walked off an edge. Preserve the current height for
          // this frame, then let gravity make the drop feel continuous.
          this._grounded = false;
          this._verticalVelocity = 0;
        } else {
          this.position.y = supportY;
        }
      } else if (this._verticalVelocity <= 0) {
        const landingY = groundHeightAt?.(
          this.position.x,
          this.position.z,
          previousFeetY + LANDING_EPSILON,
        ) ?? 0;
        if (previousFeetY >= landingY - LANDING_EPSILON
          && this.position.y <= landingY + LANDING_EPSILON) {
          this.position.y = landingY;
          this._verticalVelocity = 0;
          this._grounded = true;
        }
      }

      // Base-ground safety net for worlds without authored top surfaces.
      if (this.position.y <= 0) {
        this.position.y = 0;
        this._verticalVelocity = 0;
        this._grounded = true;
      }
    }

    this._applyCamera();
  }

  dispose() {
    clearTimeout(this._lockFallbackTimer);
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('mouseup', this._onMouseUp);
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('pointerlockchange', this._onLockChange);
    document.removeEventListener('pointerlockerror', this._onLockError);
    this.domElement.removeEventListener('mousedown', this._onMouseDown);
  }
}
