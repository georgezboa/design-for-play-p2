import './endCredits.css';
import { CREDIT_MUSIC, CREDIT_TEAM } from './creditsData.js';
import { music } from '../shared/musicDirector.js';

// Final credits deliberately stay spare: the ending needs a clean list of the
// people who made the game, not the title menu's full source and production
// register. This mounts in the current document so the music system keeps the
// player gesture it already earned during gameplay.
export function showEndCredits() {
  // The title menu owns the complete, scrollable credit register. Reuse it at
  // the real ending instead of mounting the former names-only end card.
  window.location.assign('/?credits=1');
  return;
  document.querySelector('#nightfall-end-credits')?.remove();
  const root = document.createElement('main');
  root.id = 'nightfall-end-credits';
  root.setAttribute('aria-label', 'NIGHTFALL end credits');
  root.innerHTML = `
    <section class="nf-end-credits-list">
      <p>NIGHTFALL</p>
      <h1>THANK YOU FOR RIDING</h1>
      <div class="nf-end-credit-names"></div>
      <small>END OF LINE</small>
    </section>
  `;
  const names = root.querySelector('.nf-end-credit-names');
  CREDIT_TEAM.forEach(({ name }) => {
    const entry = document.createElement('p');
    entry.textContent = name;
    names.append(entry);
  });
  document.body.append(root);
  requestAnimationFrame(() => root.classList.add('is-visible'));

  const track = CREDIT_MUSIC[0];
  music.play('end-credits', {
    src: track.localFile,
    volume: 0.42,
    fade: 3.4,
    outFade: 1.4,
    loop: true,
  });

  window.render_game_to_text = () => JSON.stringify({
    scene: 'EndCredits',
    visible: true,
    names: CREDIT_TEAM.map(({ name }) => name),
    music: music.qa(),
  });
}
