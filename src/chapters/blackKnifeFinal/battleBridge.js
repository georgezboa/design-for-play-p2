// The Black Ticket page's link between its DOM shell (main.js) and the
// Phaser fight (BossScene). Module state, not window globals: a production
// page exposes no `window.game` / `__battleScene` (alpha round 2); the QA
// aliases are installed by main.js only when dev routes are enabled.
export const battle = {
  scene: null,
  start: null,
  pause: null,
  resume: null,
};
