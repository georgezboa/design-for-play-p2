// The end of a run hands over to the title menu's complete credit roll
// (/?credits=1: crew, music register, sources, AI disclosure), which plays the
// credits track, CREDIT_MUSIC[0]. Both endings arrive here: the Conductor's
// after its film and the normal-ending archive card, the true ending after
// its reveal. The normal ending adds `&ending=normal`: once the roll is over
// the title shows how many magic stones the journey held and where the
// missing ones were (titleMenu.js showEndingStones).
export const END_CREDITS_ROUTE = '/?credits=1';

export function endCreditsRoute({ ending = null } = {}) {
  return ending ? `${END_CREDITS_ROUTE}&ending=${encodeURIComponent(ending)}` : END_CREDITS_ROUTE;
}

export function showEndCredits({ ending = null, assign = (url) => window.location.assign(url) } = {}) {
  assign(endCreditsRoute({ ending }));
}

// The title URL once the credits (and the normal ending's stones card) are
// closed: `credits` and `ending` dropped, anything else kept, so BACK TO THE
// TITLE does not leave `/?credits=1&ending=normal` to replay on a reload
// (alpha round 2). Returns null when there is nothing to clean.
export function titleUrlWithoutCredits(href) {
  let url;
  try { url = new URL(href); } catch { return null; }
  if (!url.searchParams.has('credits') && !url.searchParams.has('ending')) return null;
  url.searchParams.delete('credits');
  url.searchParams.delete('ending');
  const search = url.searchParams.toString();
  return `${url.pathname}${search ? `?${search}` : ''}${url.hash}`;
}

export function clearCreditsQuery(win = globalThis.window) {
  const next = titleUrlWithoutCredits(win?.location?.href);
  if (!next) return false;
  try { win.history.replaceState(win.history.state, '', next); } catch { return false; }
  return true;
}
