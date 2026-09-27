import { magicStoneSnapshot } from './shell/magicStones.js';
import { installPauseMenu } from './shell/pauseMenu.js';
import { devParam, DEV_MODE } from './devMode.js';

installPauseMenu({ checkpointId: 'chapter-6-start' });

const snapshot = magicStoneSnapshot();
if (!snapshot.allCollected && devParam('qa') !== '1') {
  location.replace('/final-boss.html?from=chapter5');
} else {
  const finish = () => location.assign('/?credits=1');
  document.querySelector('.continue').addEventListener('click', finish);
  window.addEventListener('keydown', (event) => {
    if (event.code === 'Enter' || event.code === 'Space') finish();
  });
}

if (DEV_MODE) window.render_game_to_text = () => JSON.stringify({ scene: 'TrueEnding', stones: snapshot, truth: 'Mara is a Conductor-created illusion; Butch had no sister.' });
