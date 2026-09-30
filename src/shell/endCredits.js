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
