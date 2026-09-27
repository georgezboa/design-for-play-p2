import { magicStoneRow, magicStoneSnapshot } from './shell/magicStones.js';
import { installPauseMenu } from './shell/pauseMenu.js';
import { CHAPTER_CONTROLS } from './shell/chapterControls.js';

installPauseMenu({ checkpointId: 'chapter-6-start', controls: CHAPTER_CONTROLS.trueEnding });

const snapshot = magicStoneSnapshot();
renderStoneRow(document.querySelector('.stones'), snapshot);
if (!snapshot.allCollected && new URLSearchParams(location.search).get('qa') !== '1') {
  location.replace('/final-boss.html?from=chapter5');
} else {
  const finish = () => location.assign('/?credits=1');
  document.querySelector('.continue').addEventListener('click', finish);
  window.addEventListener('keydown', (event) => {
    if (event.code === 'Enter' || event.code === 'Space') finish();
  });
}

window.render_game_to_text = () => JSON.stringify({ scene: 'TrueEnding', stones: snapshot, truth: 'Mara is a Conductor-created illusion; Butch had no sister.' });

// One gem per stone in the registry, lit when this slot holds it.
function renderStoneRow(container, stones) {
  if (!container) return;
  container.replaceChildren(...magicStoneRow(stones).map(({ name, held }) => {
    const gem = document.createElement('i');
    gem.className = held ? 'stone' : 'stone is-missing';
    gem.title = name;
    return gem;
  }));
  container.setAttribute('aria-label', `${stones.count} of ${stones.total} magic stones collected`);
}
