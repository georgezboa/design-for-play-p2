// Entry for the "double-click to play" single-file build. Inlines every asset
// as a data URI, points the manifests at them, then boots the game.
import idle from '../public/assets/images/conductor/idle.png?inline';
import move from '../public/assets/images/conductor/move.png?inline';
import baton from '../public/assets/images/conductor/baton.png?inline';
import locom from '../public/assets/images/conductor/locom.png?inline';
import magic from '../public/assets/images/conductor/magic.png?inline';
import damage from '../public/assets/images/conductor/damage.png?inline';
import defeat from '../public/assets/images/conductor/defeat.png?inline';
import music from '../public/assets/audio/face-the-fear.mp3?inline';
import { CONDUCTOR_SHEETS, AUDIO_MANIFEST } from './assets.js';

CONDUCTOR_SHEETS['conductor-idle'].path = idle;
CONDUCTOR_SHEETS['conductor-move'].path = move;
CONDUCTOR_SHEETS['conductor-baton'].path = baton;
CONDUCTOR_SHEETS['conductor-locom'].path = locom;
CONDUCTOR_SHEETS['conductor-magic'].path = magic;
CONDUCTOR_SHEETS['conductor-damage'].path = damage;
CONDUCTOR_SHEETS['conductor-defeat'].path = defeat;
AUDIO_MANIFEST['music-battle'].path = music;

await import('./main.js');
