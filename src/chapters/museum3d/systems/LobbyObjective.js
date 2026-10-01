// Chapter 5 — the lobby's first objective, as a paper tag (src/shell/uiKit.css
// .nf-tag) under the top edge of the view.
//
// Alpha round 1: on entering Room 101 the Archivist's welcome said what was
// pending, then faded, and nothing on screen said what to do next. The tag
// names the first job until the player has opened the pending case once.

export const FIRST_OBJECTIVE = 'FIRST · THE PENDING CASE AHEAD · WALK UP AND PRESS <kbd>E</kbd>';

// The tag to show, or null. `opened` is whether the case has been opened
// this visit; `welcomeDone` whether the Archivist has finished greeting.
export function lobbyObjective(snapshot, { opened = false, welcomeDone = true } = {}) {
  if (!snapshot || snapshot.phase !== 'lobby') return null;
  if (snapshot.exhibit?.solved || opened || !welcomeDone) return null;
  return FIRST_OBJECTIVE;
}

export class LobbyObjectiveTag {
  constructor(doc = globalThis.document) {
    this.el = doc?.createElement?.('div') ?? null;
    this.text = null;
    if (!this.el) return;
    this.el.className = 'nf-tag museum-objective';
    this.el.setAttribute('role', 'status');
    this.el.hidden = true;
    // Under the top edge, centred: clear of the aim tag (44 %) and the
    // caption bar (bottom), and of the dev coordinates (top left).
    Object.assign(this.el.style, { left: '50%', top: '76px', whiteSpace: 'nowrap', transform: 'translate(-50%, 0)' });
    doc.body.append(this.el);
  }

  update(text, { hidden = false } = {}) {
    if (!this.el) return;
    const show = Boolean(text) && !hidden;
    if (show && text !== this.text) {
      this.text = text;
      this.el.innerHTML = text;
    }
    if (this.el.hidden === show) this.el.hidden = !show;
  }

  get visible() {
    return Boolean(this.el && !this.el.hidden);
  }
}
