import './devLauncher.css';
import { DEV_ROUTES, DEV_SHELL_ROUTES } from './devRoutes.js';

// `npm run dev` opens index.html on this launcher instead of the title. It is
// plain HTML: every chapter is its own page, so each entry is just a link.
// main.js only calls this when DEV_MODE is true.
export function createDevLauncher({ note = '' } = {}) {
  const root = document.createElement('main');
  root.id = 'nightfall-dev-launcher';
  root.innerHTML = `
    <header>
      <p class="nf-dev-kicker">NIGHTFALL · DEVELOPMENT BUILD</p>
      <h1>CHAPTER SELECT</h1>
      <p class="nf-dev-hint">↑ ↓ to move · ENTER to open · every chapter page has a \` DEV MENU link back here</p>
      ${note ? `<p class="nf-dev-note" role="status"></p>` : ''}
    </header>
    <nav aria-label="Development routes"></nav>
  `;
  if (note) root.querySelector('.nf-dev-note').textContent = note;
  const nav = root.querySelector('nav');
  let list = null;
  let group = null;
  for (const entry of [...DEV_SHELL_ROUTES, ...DEV_ROUTES]) {
    if (entry.group !== group) {
      group = entry.group;
      const section = document.createElement('section');
      const heading = document.createElement('h2');
      heading.textContent = group;
      list = document.createElement('ul');
      section.append(heading, list);
      nav.append(section);
    }
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = entry.route;
    link.dataset.route = entry.route;
    const id = document.createElement('span');
    id.textContent = entry.id;
    const title = document.createElement('strong');
    title.textContent = entry.title;
    const detail = document.createElement('small');
    detail.textContent = `${entry.detail} · ${entry.route}`;
    link.append(id, title, detail);
    item.append(link);
    list.append(item);
  }
  document.body.append(root);

  const links = [...root.querySelectorAll('a')];
  links[0]?.focus();
  root.addEventListener('keydown', (event) => {
    if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const current = Math.max(0, links.indexOf(document.activeElement));
    const next = (current + (event.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length;
    links[next].focus();
  });

  window.render_game_to_text = () => JSON.stringify({
    scene: 'DevLauncher',
    focused: document.activeElement?.dataset?.route ?? null,
    entries: links.map((link) => link.dataset.route),
  });
  return root;
}
