// The end of a run hands over to the title menu's complete credit roll
// (/?credits=1: crew, music register, sources, AI disclosure), which plays the
// credits track, CREDIT_MUSIC[0]. Both endings arrive here: the Conductor's
// after its film and the normal-ending archive card, the true ending after
// its reveal.
export const END_CREDITS_ROUTE = '/?credits=1';

export function showEndCredits({ assign = (url) => window.location.assign(url) } = {}) {
  assign(END_CREDITS_ROUTE);
}
