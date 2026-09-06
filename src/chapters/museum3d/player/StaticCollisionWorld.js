// Simple static AABB collision for hallways, rooms, and authored blockers.
// The player is a vertical capsule approximated by an XZ circle. Colliders are
// full-height unless an authored minY/maxY range marks a low obstacle that may
// be cleared by jumping.

export class StaticCollisionWorld {
  constructor() {
    this._boxes = [];
    this._circles = [];
    this._surfaces = [];
  }

  clear() {
    this._boxes.length = 0;
    this._circles.length = 0;
    this._surfaces.length = 0;
  }

  // box: { minX, minZ, maxX, maxZ, minY?, maxY?, id? }
  addBox(box) {
    this._boxes.push({
      minY: Number.NEGATIVE_INFINITY,
      maxY: Number.POSITIVE_INFINITY,
      ...box,
    });
    return box;
  }

  addBoxFromCenterSize(cx, cz, w, d, id, vertical = {}) {
    return this.addBox({
      minX: cx - w / 2,
      maxX: cx + w / 2,
      minZ: cz - d / 2,
      maxZ: cz + d / 2,
      ...vertical,
      id,
    });
  }

  addCircle(cx, cz, radius, id, vertical = {}) {
    const circle = {
      centerX: cx,
      centerZ: cz,
      radius,
      minY: Number.NEGATIVE_INFINITY,
      maxY: Number.POSITIVE_INFINITY,
      ...vertical,
      id,
    };
    this._circles.push(circle);
    return circle;
  }

  // Rotation is expressed in radians, matching Three.js rotation.y. Keeping
  // the collider oriented matters for long, narrow decks: an axis-aligned
  // envelope would block a large patch of perfectly open pavement.
  addOrientedBoxFromCenterSize(cx, cz, w, d, rotationY, id, vertical = {}) {
    return this.addBox({
      centerX: cx,
      centerZ: cz,
      halfWidth: w / 2,
      halfDepth: d / 2,
      rotationY,
      ...vertical,
      id,
    });
  }

  // A walk surface is a top face the controller can land on. Its vertical
  // side still needs a matching finite-height box so walking cannot pass
  // through the object before jumping high enough.
  addWalkSurface({ centerX, centerZ, width, depth, rotationY = 0, topY, id }) {
    const surface = {
      centerX,
      centerZ,
      halfWidth: width / 2,
      halfDepth: depth / 2,
      rotationY,
      topY,
      id,
    };
    this._surfaces.push(surface);
    return surface;
  }

  removeById(id) {
    this._boxes = this._boxes.filter((b) => b.id !== id);
    this._circles = this._circles.filter((circle) => circle.id !== id);
    this._surfaces = this._surfaces.filter((surface) => surface.id !== id);
  }

  _localPoint(x, z, shape) {
    const dx = x - shape.centerX;
    const dz = z - shape.centerZ;
    const c = Math.cos(shape.rotationY || 0);
    const s = Math.sin(shape.rotationY || 0);
    return {
      x: dx * c - dz * s,
      z: dx * s + dz * c,
    };
  }

  _containsSurfacePoint(x, z, surface) {
    const local = this._localPoint(x, z, surface);
    return Math.abs(local.x) <= surface.halfWidth
      && Math.abs(local.z) <= surface.halfDepth;
  }

  // Highest authored top face below the supplied vertical ceiling. Ground
  // level remains the implicit fallback everywhere in the playable bounds.
  groundHeightAt(x, z, ceilingY = Number.POSITIVE_INFINITY) {
    let groundY = 0;
    for (const surface of this._surfaces) {
      if (surface.topY > ceilingY + 0.015) continue;
      if (this._containsSurfacePoint(x, z, surface)) {
        groundY = Math.max(groundY, surface.topY);
      }
    }
    return groundY;
  }

  _overlaps(x, z, radius, box, feetY = 0, bodyHeight = Number.POSITIVE_INFINITY) {
    const headY = feetY + bodyHeight;
    if (feetY >= box.maxY - 0.015 || headY <= box.minY + 0.015) return false;
    if (box.halfWidth != null) {
      const local = this._localPoint(x, z, box);
      const nearestX = Math.max(-box.halfWidth, Math.min(local.x, box.halfWidth));
      const nearestZ = Math.max(-box.halfDepth, Math.min(local.z, box.halfDepth));
      const dx = local.x - nearestX;
      const dz = local.z - nearestZ;
      return dx * dx + dz * dz < radius * radius;
    }
    const nearestX = Math.max(box.minX, Math.min(x, box.maxX));
    const nearestZ = Math.max(box.minZ, Math.min(z, box.maxZ));
    const dx = x - nearestX;
    const dz = z - nearestZ;
    return dx * dx + dz * dz < radius * radius;
  }

  _collides(x, z, radius, feetY = 0, bodyHeight = Number.POSITIVE_INFINITY) {
    const headY = feetY + bodyHeight;
    for (const circle of this._circles) {
      if (feetY >= circle.maxY - 0.015 || headY <= circle.minY + 0.015) continue;
      const dx = x - circle.centerX;
      const dz = z - circle.centerZ;
      const combinedRadius = radius + circle.radius;
      if (dx * dx + dz * dz < combinedRadius * combinedRadius) return circle;
    }
    for (const box of this._boxes) {
      if (this._overlaps(x, z, radius, box, feetY, bodyHeight)) return box;
    }
    return null;
  }

  // Axis-separated move: try X then Z independently so the player slides
  // along walls instead of sticking. Returns the resolved {x, z}.
  moveAndCollide(
    fromX,
    fromZ,
    dx,
    dz,
    radius,
    feetY = 0,
    bodyHeight = Number.POSITIVE_INFINITY,
  ) {
    let x = fromX;
    let z = fromZ;

    if (dx !== 0 && !this._collides(x + dx, z, radius, feetY, bodyHeight)) x += dx;
    if (dz !== 0 && !this._collides(x, z + dz, radius, feetY, bodyHeight)) z += dz;

    // Corner guard: if the combined move still clips (tight inside corners),
    // fall back to the axis that was free.
    if (this._collides(x, z, radius, feetY, bodyHeight)) {
      if (!this._collides(fromX + dx, fromZ, radius, feetY, bodyHeight)) {
        x = fromX + dx;
        z = fromZ;
      } else if (!this._collides(fromX, fromZ + dz, radius, feetY, bodyHeight)) {
        x = fromX;
        z = fromZ + dz;
      } else {
        x = fromX;
        z = fromZ;
      }
    }
    return { x, z };
  }

  contains(x, z, radius = 0, feetY = 0, bodyHeight = Number.POSITIVE_INFINITY) {
    return this._collides(x, z, radius, feetY, bodyHeight);
  }

  get boxCount() {
    return this._boxes.length + this._circles.length;
  }

  get surfaceCount() {
    return this._surfaces.length;
  }
}
