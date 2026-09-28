import { BOSS, BELL_SECONDS, PLAYER, PHASE_CARDS } from '../constants.js';
import { createBellMeter, createStoneRow, createTicketBar } from '../../../shell/finaleUi.js';

// The Black Ticket's HUD, in the shared finale DOM kit over the Phaser canvas:
// the ticket boss bar (a punch hole at every phase break), the bell meter
// the parry rides on, the stone row, and the passenger's layers / shields /
// boost as paper tags.
export default class Hud {
  constructor(scene) {
    this.scene = scene;
    this.root = document.createElement('div');
    this.root.className = 'nf-bt-hud';
    this.root.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:8;';
    (document.querySelector('.stage-wrap') ?? document.body).append(this.root);
    this.bar = createTicketBar(this.root, { name: 'THE BLACK TICKET', serial: 'NEVER PUNCHED', notches: BOSS.phaseThresholds });
    createStoneRow(this.root);
    this.bell = createBellMeter(this.root, { lines: [] });
    this.layers = document.createElement('div');
    this.layers.className = 'nf-layers';
    this.layers.innerHTML = '<b>THE PASSENGER · A PUNCHED TICKET</b><div class="nf-layers__row" data-row="lives"></div><div class="nf-layers__row" data-row="shields" style="margin-top:6px"></div><small></small>';
    this.root.append(this.layers);
    this.lastKey = '';
  }

  update(dt, boss, player) {
    this.bar.set(boss.hp / BOSS.maxHp, { dt });
    const card = PHASE_CARDS[boss.phase] ?? PHASE_CARDS[0];
    this.bar.setLabel(`PHASE ${boss.phase + 1} / 5 · ${card.chapter}`);
    this.bar.setState(this.scene.assist ? 'ASSIST' : '', false);
    const maxLives = this.scene.maxLives ?? PLAYER.lives;
    const key = `${player.lives}/${maxLives}/${player.shieldCharges}/${player.shielded}`;
    if (key !== this.lastKey) {
      this.lastKey = key;
      this.layers.querySelector('[data-row="lives"]').innerHTML = Array.from({ length: maxLives }, (_, i) => `<i class="${i < player.lives ? '' : 'is-torn'}"></i>`).join('');
      this.layers.querySelector('[data-row="shields"]').innerHTML = Array.from({ length: PLAYER.shieldCharges }, (_, i) => `<i style="width:16px;height:16px;border-radius:50%;clip-path:none;background:${i < player.shieldCharges ? (player.shielded ? '#fff3dc' : '#e0a24a') : 'rgba(234,223,198,0.16)'}"></i>`).join('');
    }
    const boost = Math.round((player.boostFuel / PLAYER.boostMax) * 100);
    const text = `SHIELDS ${player.shieldCharges}/${PLAYER.shieldCharges} · BOOST ${boost}%`;
    const small = this.layers.querySelector('small');
    if (small.textContent !== text) small.textContent = text;
    const clock = this.scene.bellClock ?? 0;
    const phase = (clock % BELL_SECONDS) / BELL_SECONDS;
    this.bell.update({ phase, msToBell: (BELL_SECONDS - (clock % BELL_SECONDS)) * 1000, text: this.scene.parryText ?? 'SHIELD ON THE BELL · PARRY' });
  }

  ring() { this.bell.ring(); }

  destroy() { this.root.remove(); }
}
