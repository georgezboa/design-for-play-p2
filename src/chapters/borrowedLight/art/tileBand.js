// A repeating band wider than one GPU texture, as several TileSprites.
//
// Phaser 3 backs every TileSprite with a canvas texture the size of the
// sprite itself and uploads it when the sprite is made. A 22,800 px mist
// band therefore asked for a 22800×512 texture, which WebGL refuses
// ("texImage2D: width or height out of range") on any GPU whose limit is
// under that (4096 on many machines). The band is cut into chunks no wider
// than MAX_TILE_BAND_CHUNK; each chunk starts its tile pattern where the
// previous one ended, so the seams line up and the band scrolls as one.

export const MAX_TILE_BAND_CHUNK = 4096;

/** [{ offset, width }] covering `width` px in chunks of at most `max` px. */
export function tileBandChunks(width, max = MAX_TILE_BAND_CHUNK) {
  const total = Math.max(0, Math.ceil(width));
  const chunks = [];
  for (let offset = 0; offset < total; offset += max) chunks.push({ offset, width: Math.min(max, total - offset) });
  return chunks;
}

/**
 * The tilePositionX a chunk `offset` px into the band needs so its pattern
 * continues the band's: tile positions are in texture pixels, and the
 * texture is drawn `tileScaleX` times its size.
 */
export function chunkTilePositionX(bandTilePositionX, offset, tileScaleX = 1) {
  return bandTilePositionX + offset / tileScaleX;
}

/**
 * scene.add.tileSprite(x, y, width, height, key) for any width, returning a
 * band with the TileSprite calls the chapter uses (origin 0, 0).
 */
export function addTileBand(scene, x, y, width, height, key, { max = MAX_TILE_BAND_CHUNK } = {}) {
  const chunks = tileBandChunks(width, max).map(({ offset, width: w }) => ({
    offset,
    sprite: scene.add.tileSprite(x + offset, y, w, height, key).setOrigin(0),
  }));
  let tileX = 0;
  let tileY = 0;
  let scaleX = 1;
  let scaleY = 1;
  const sync = () => chunks.forEach(({ offset, sprite }) => {
    sprite.setTileScale(scaleX, scaleY);
    sprite.tilePositionX = chunkTilePositionX(tileX, offset, scaleX);
    sprite.tilePositionY = tileY;
  });
  const each = (fn) => { chunks.forEach(({ sprite }) => fn(sprite)); return band; };
  const band = {
    sprites: chunks.map(({ sprite }) => sprite),
    get tilePositionX() { return tileX; },
    set tilePositionX(value) { tileX = value; sync(); },
    get tilePositionY() { return tileY; },
    set tilePositionY(value) { tileY = value; sync(); },
    setTileScale(sx, sy = sx) { scaleX = sx; scaleY = sy; sync(); return band; },
    setDepth: (depth) => each((sprite) => sprite.setDepth(depth)),
    setAlpha: (alpha) => each((sprite) => sprite.setAlpha(alpha)),
    setVisible: (visible) => each((sprite) => sprite.setVisible(visible)),
    destroy: () => each((sprite) => sprite.destroy()),
  };
  sync();
  return band;
}
