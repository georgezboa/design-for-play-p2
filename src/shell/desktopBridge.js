// Thin wrapper around the Electron preload API (desktop/preload.cjs).
// In a normal browser `window.nightfallDesktop` is undefined and every helper
// falls back to the web behaviour, so the itch.io/web build keeps working.

export function desktopApi() {
  if (typeof window === 'undefined') return null;
  const api = window.nightfallDesktop;
  return api && api.isDesktop === true ? api : null;
}

export const isDesktop = () => desktopApi() !== null;

// Desktop: toggles the native window fullscreen, which (unlike the HTML
// Fullscreen API) survives navigating between the game's chapter pages.
export async function toggleFullscreen() {
  const api = desktopApi();
  if (api) return api.toggleFullscreen();
  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return false;
  }
  await document.documentElement.requestFullscreen();
  return true;
}

// Returns true when the application is quitting; false means the caller must
// show its browser fallback (a web page cannot close its own tab).
export function quitGame() {
  const api = desktopApi();
  if (!api) return false;
  api.quit();
  return true;
}
