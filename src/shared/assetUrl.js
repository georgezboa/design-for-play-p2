// Where the files under public/ are served from. The game serves them from
// the site root ('/assets/…'); a page hosted somewhere else (the cutscene
// preview) sets globalThis.NF_ASSET_BASE to a base such as './', and every
// root path the runtime builds itself (plates, sprites, chrome, music) is
// resolved against it. Vite's own imported assets are not affected.

export function assetUrl(url) {
  const base = globalThis.NF_ASSET_BASE;
  if (typeof base !== 'string' || typeof url !== 'string' || !url.startsWith('/') || url.startsWith('//')) return url;
  return base + url.slice(1);
}
