// hidden-final-boss.html entry. The five-stone gate runs before the fight's
// code is requested: main.js pulls in Phaser (~1.5 MB) and the Black Ticket
// score, so without all five stones the page hands over to the Conductor
// straight away instead of after loading and booting a fight it never shows.
// main.js keeps the same check for the dev routes that load it directly.
import { magicStoneSnapshot } from '../../shell/magicStones.js';
import { DEV_MODE, devParams } from '../../devMode.js';

const params = devParams();
const unlocked = DEV_MODE || params.get('qa') === '1' || params.get('easter-egg') === '1';

if (!unlocked && !magicStoneSnapshot().allCollected) {
  window.location.replace('/final-boss.html?from=chapter5');
} else {
  import('./main.js');
}
