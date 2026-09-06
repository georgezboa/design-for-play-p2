// Beat 4 — service-desk reclassification. The museum preserves its categories
// by changing architecture: the whole desk becomes an exhibit in the central
// glass case, and its former footprint becomes a corridor doorway.
//
// Both variants are built once by ServiceLobby; this module toggles them from
// the narrative snapshot so scene objects never become the source of truth.

export class RoomReclassification {
  constructor({ normalGroup, reclassifiedGroup, collisionWorld, registerColliders }) {
    this.normalGroup = normalGroup;
    this.reclassifiedGroup = reclassifiedGroup;
    this.collisionWorld = collisionWorld;
    // registerColliders(variant: 'normal' | 'reclassified') rebuilds the
    // furniture colliders for the active variant (walls are always present).
    this.registerColliders = registerColliders;
    this._variant = null;
  }

  apply(snapshot) {
    const variant = snapshot.lobby.deskReclassified ? 'reclassified' : 'normal';
    if (variant === this._variant) return this._variant;
    this._variant = variant;
    this.normalGroup.visible = variant === 'normal';
    this.reclassifiedGroup.visible = variant === 'reclassified';
    this.registerColliders(variant);
    return variant;
  }

  get variant() {
    return this._variant;
  }
}
