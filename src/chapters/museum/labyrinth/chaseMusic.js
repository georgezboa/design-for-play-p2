// Chase theme for the Labyrinth Wing — fully synthesized, no audio files.
//
// The synth bed runs on Phaser's OWN AudioContext (this.sound.context) rather
// than opening a second, separate one, and its master gain connects to
// this.sound.destination (Phaser's masterMuteNode) instead of straight to the
// hardware output — so muting/pausing the game's sound in the normal Phaser
// way (scene.sound.mute = true, scene.sound.pauseAll(), the game losing
// focus, etc.) silences this too, the same as every other sound the game
// plays.
//
// The bed has an audible rising/falling state: setChasing(true) fades the
// drone + noise bed in and starts the heartbeat; setIntensity(0..1) is fed
// every frame from the closest hunting statue's distance and tightens the
// filter, raises the heartbeat tempo and lifts the bed as the hunt closes in;
// setChasing(false) — game over, win, or the safe artifact epilogue — fades
// everything out cleanly.

let sceneSound = null; // the owning scene's Phaser.Sound.WebAudioSoundManager
let nodes = null; // { master, drone, noiseSrc, noiseFilter, noiseGain, breathe, heartbeatTimer }
let chasing = false;
let intensity = 0; // 0 = distant hunt, 1 = statue right behind you

// Call once, e.g. from the scene's create(): chaseMusic.init(this.sound).
export function init(soundManager) {
  sceneSound = soundManager;
}

function audio() {
  const c = sceneSound && sceneSound.context;
  if (!c) return null;
  if (c.state === 'suspended') c.resume().catch(() => {});
  return c;
}

function noiseBuffer(c) {
  const len = c.sampleRate * 2;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
  return buf;
}

function startBed() {
  const c = audio();
  if (!c || nodes) return;

  const master = c.createGain();
  master.gain.setValueAtTime(0.0001, c.currentTime);
  master.connect(sceneSound.destination);

  // Low sawtooth drone through a narrow lowpass — the "something is here"
  // hum underneath everything. The filter opens as intensity rises.
  const droneFilter = c.createBiquadFilter();
  droneFilter.type = 'lowpass';
  droneFilter.frequency.setValueAtTime(180, c.currentTime);
  droneFilter.Q.setValueAtTime(1.1, c.currentTime);
  droneFilter.connect(master);
  const drone = [55, 55.6, 82.4].map((freq) => {
    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, c.currentTime);
    osc.connect(droneFilter);
    osc.start();
    return osc;
  });

  // Filtered noise bed, slowly breathing, for grit/tension.
  const noiseSrc = c.createBufferSource();
  noiseSrc.buffer = noiseBuffer(c);
  noiseSrc.loop = true;
  const noiseFilter = c.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.setValueAtTime(420, c.currentTime);
  noiseFilter.Q.setValueAtTime(0.6, c.currentTime);
  const noiseGain = c.createGain();
  noiseGain.gain.setValueAtTime(0.05, c.currentTime);
  noiseSrc.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(master);
  noiseSrc.start();
  const breathe = c.createOscillator();
  breathe.type = 'sine';
  breathe.frequency.setValueAtTime(0.18, c.currentTime);
  const breatheGain = c.createGain();
  breatheGain.gain.setValueAtTime(0.03, c.currentTime);
  breathe.connect(breatheGain);
  breatheGain.connect(noiseGain.gain);
  breathe.start();

  nodes = { master, drone, droneFilter, noiseSrc, noiseFilter, noiseGain, breathe, heartbeatTimer: null };

  master.gain.exponentialRampToValueAtTime(0.09, c.currentTime + 0.7);

  scheduleHeartbeat();
}

function thump(delay, freq, vol) {
  const c = audio();
  if (!c || !nodes) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, freq * 0.5), t0 + 0.16);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
  osc.connect(gain);
  gain.connect(nodes.master);
  osc.start(t0);
  osc.stop(t0 + 0.2);
}

function scheduleHeartbeat() {
  if (!nodes || !chasing) return;
  const lift = 1 + intensity * 0.35;
  thump(0, 62 * lift, 0.13 + intensity * 0.07);
  thump(0.16, 54 * lift, 0.1 + intensity * 0.06);
  const c = audio();
  // 560ms at a distant hunt, tightening to 380ms when one is right behind.
  const interval = c ? 560 - intensity * 180 : 700;
  nodes.heartbeatTimer = setTimeout(scheduleHeartbeat, interval);
}

function stopBed() {
  if (!nodes) return;
  const c = audio();
  const now = c ? c.currentTime : 0;
  clearTimeout(nodes.heartbeatTimer);
  const { master, drone, noiseSrc, breathe } = nodes;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), now);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
  drone.forEach((osc) => { try { osc.stop(now + 0.65); } catch { /* already stopped */ } });
  try { noiseSrc.stop(now + 0.65); } catch { /* already stopped */ }
  try { breathe.stop(now + 0.65); } catch { /* already stopped */ }
  nodes = null;
}

// Called every frame by the scene with whether a statue is actively
// hunting close enough to count as "chasing you right now."
export function setChasing(active) {
  if (active === chasing) return;
  chasing = active;
  if (active) startBed();
  else stopBed();
}

// Called every frame while chasing with 0..1 how close the nearest hunter
// is — opens the drone filter and quickens the heartbeat as it closes in.
export function setIntensity(level) {
  intensity = Math.max(0, Math.min(1, level));
  if (!nodes) return;
  const c = audio();
  if (!c) return;
  nodes.droneFilter.frequency.setTargetAtTime(180 + intensity * 340, c.currentTime, 0.25);
  nodes.noiseGain.gain.setTargetAtTime(0.05 + intensity * 0.05, c.currentTime, 0.25);
}

export function isChasing() {
  return chasing;
}
