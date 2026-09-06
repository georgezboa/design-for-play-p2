import { mkdir, writeFile } from 'node:fs/promises';

const port = process.env.CHROME_DEBUG_PORT ?? '9222';
const baseUrl = process.env.GAME_URL ?? 'http://127.0.0.1:5180';
const outputDir = process.env.QA_OUTPUT_DIR ?? '/private/tmp/cyberpunk-parkour-qa';

const targets = await fetch(`http://127.0.0.1:${port}/json`).then((response) => response.json());
const target = targets.find(({ type }) => type === 'page');
if (!target) throw new Error('No debuggable Chrome page target found.');

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

let nextId = 0;
const pending = new Map();
const pageErrors = [];
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  }
  if (message.method === 'Runtime.exceptionThrown') {
    const details = message.params.exceptionDetails;
    pageErrors.push(details.exception?.description ?? details.text);
  }
  if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
    const entry = message.params.entry;
    // The development document has never declared a favicon. Chrome reports
    // that harmless document-level 404 through Log.entryAdded; it is not a
    // game resource or scene-console failure.
    if (!entry.url?.endsWith('/favicon.ico')) pageErrors.push(entry.text);
  }
});

const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++nextId;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params }));
});

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const evaluate = async (expression) => {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
};
const keyEvent = (type, key, code, keyCode) => send('Input.dispatchKeyEvent', {
  type,
  key,
  code,
  text: type === 'keyDown' ? key : undefined,
  windowsVirtualKeyCode: keyCode,
  nativeVirtualKeyCode: keyCode,
});

await mkdir(outputDir, { recursive: true });
await send('Runtime.enable');
await send('Log.enable');
await send('Page.enable');
await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', {
  width: 960,
  height: 636,
  deviceScaleFactor: 1,
  mobile: false,
});

const states = [
  ['entrance', 'chapter=cyberpunk'],
  ['story-npc', 'qa=parkour-story-npc'],
  ['story-npc-close', 'qa=parkour-story-npc'],
  ['story-letter', 'qa=parkour-story-letter'],
  ['illegal-drag', 'qa=parkour-drag'],
  ['moving-car', 'qa=parkour-car'],
  ['ladder-wall', 'qa=parkour-ladder-wall'],
  ['recovery', 'qa=parkour-recovery'],
  ['recovery-car-b', 'qa=parkour-recovery-car-b'],
  ['spikes', 'qa=parkour-spikes'],
  ['extension', 'qa=parkour-extension'],
  ['extension-drag', 'qa=parkour-extension-drag'],
  ['extension-car-c', 'qa=parkour-car-c'],
  ['extension-car-d', 'qa=parkour-car-d'],
  ['recovery-car-d', 'qa=parkour-recovery-car-d'],
  ['extension-spikes', 'qa=parkour-extension-spikes'],
  ['high-spikes', 'qa=parkour-high-spikes'],
  ['after-reset', 'qa=parkour-reset'],
  ['final-approach', 'qa=parkour-final-approach'],
  ['completion', 'qa=parkour-goal'],
];

const evidence = {};
for (const [name, query] of states) {
  await send('Page.navigate', { url: `${baseUrl}/?${query}` });
  await delay(180);
  const deadline = Date.now() + 20000;
  let snapshot = null;
  while (Date.now() < deadline) {
    await delay(120);
    if (await evaluate('window.location.search') !== `?${query}`) continue;
    const rendered = await evaluate('window.render_game_to_text?.() ?? null');
    if (!rendered) continue;
    const candidate = JSON.parse(rendered);
    if (candidate.scene === 'CyberpunkParkour') {
      snapshot = candidate;
      break;
    }
  }
  if (!snapshot) throw new Error(`Timed out waiting for ${name} parkour state.`);
  if (name === 'story-npc' || name === 'story-npc-close' || name === 'story-letter') {
    await send('Page.bringToFront');
    await evaluate("document.querySelector('canvas').focus()")
    await keyEvent('keyDown', 'e', 'KeyE', 69);
    await delay(80);
    await keyEvent('keyUp', 'e', 'KeyE', 69);
    await delay(160);
    snapshot = JSON.parse(await evaluate('window.render_game_to_text()'));
    const npcStory = name === 'story-npc' || name === 'story-npc-close';
    const expectedKind = npcStory ? 'npc' : 'letter';
    const expectedSpeaker = npcStory ? 'ROOFTOP MECHANIC' : 'MARA';
    if (snapshot.parkour.narrative.active !== expectedKind
      || snapshot.parkour.narrative.speaker !== expectedSpeaker
      || !snapshot.parkour.player.frozen
      || (npcStory && !snapshot.parkour.narrative.npcTalked)
      || (name === 'story-letter' && !snapshot.parkour.narrative.letterRead)) {
      throw new Error(`Parkour story interaction did not open correctly: ${JSON.stringify(snapshot.parkour.narrative)}`);
    }
    const expectedText = npcStory
      ? 'Mara came through three nights ago.'
      : 'Butch— I made it through this city';
    if (!snapshot.parkour.narrative.text.includes(expectedText)) {
      throw new Error(`Parkour story copy did not preserve the approved Mara beat: ${JSON.stringify(snapshot.parkour.narrative)}`);
    }
    if (name === 'story-npc-close') {
      // First E revealed line one above. Advance and reveal the remaining two
      // lines, then close the panel with ordinary input.
      for (let press = 0; press < 6; press += 1) {
        await keyEvent('keyDown', 'e', 'KeyE', 69);
        await delay(70);
        await keyEvent('keyUp', 'e', 'KeyE', 69);
        await delay(70);
      }
      await delay(900);
      snapshot = JSON.parse(await evaluate('window.render_game_to_text()'));
      if (snapshot.parkour.narrative.active !== null
        || snapshot.parkour.player.frozen
        || snapshot.parkour.resetCount !== 0
        || snapshot.parkour.player.y > 515) {
        throw new Error(`Closing the mechanic dialogue destabilized the player: ${JSON.stringify(snapshot.parkour.player)}`);
      }
    }
  } else if (name === 'completion') {
    await send('Page.bringToFront');
    await evaluate("document.querySelector('canvas').focus()")
    await keyEvent('keyDown', 'd', 'KeyD', 68);
    let goalSnapshot = null;
    let nextAreaSnapshot = null;
    for (const deadline = Date.now() + 12000; Date.now() < deadline;) {
      await delay(80);
      const rendered = await evaluate('window.render_game_to_text()');
      const candidate = JSON.parse(rendered);
      if (candidate.scene === 'CyberpunkParkour' && candidate.parkour.goalComplete) {
        goalSnapshot = candidate;
      }
      if (candidate.scene === 'Game' && candidate.world?.index === 0) {
        nextAreaSnapshot = candidate;
        break;
      }
    }
    await keyEvent('keyUp', 'd', 'KeyD', 68);
    if (!goalSnapshot) {
      throw new Error('Ordinary movement did not trigger the goal door before leaving the parkour.');
    }
    if (!nextAreaSnapshot) {
      throw new Error('The completed parkour did not return to the train.');
    }
    if (Math.abs(nextAreaSnapshot.player.x - 4700) > 80
      || nextAreaSnapshot.player.lane !== 1
      || !nextAreaSnapshot.world?.tutorialArt?.visible) {
      throw new Error(`Final door did not return the player to the completed train: ${JSON.stringify(nextAreaSnapshot)}`);
    }
    evidence['completion-door'] = goalSnapshot;
    snapshot = nextAreaSnapshot;
  } else if (name === 'ladder-wall') {
    await send('Page.bringToFront');
    await evaluate("document.querySelector('canvas').focus()")
    await keyEvent('keyUp', 'a', 'KeyA', 65);
    await keyEvent('keyUp', 'd', 'KeyD', 68);
    await keyEvent('keyUp', 'w', 'KeyW', 87);
    await delay(80);
    // Moving from an edge toward the centre must keep the player attached
    // while any part of their body still overlaps the visible ladder.
    await keyEvent('keyDown', 'w', 'KeyW', 87);
    await delay(100);
    const attached = JSON.parse(await evaluate('window.render_game_to_text()'));
    if (attached.parkour.player.state !== 'climbing') {
      throw new Error(`Player did not attach before the lateral ladder check: ${JSON.stringify(attached.parkour.player)}`);
    }
    await keyEvent('keyDown', 'd', 'KeyD', 68);
    await delay(70);
    await keyEvent('keyUp', 'd', 'KeyD', 68);
    const partialShift = JSON.parse(await evaluate('window.render_game_to_text()'));
    const partialPlayer = partialShift.parkour.player;
    if (partialPlayer.state !== 'climbing'
      || partialPlayer.x <= 1210
      || partialPlayer.bodyRight <= partialPlayer.ladderLeft
      || partialPlayer.bodyLeft >= partialPlayer.ladderRight) {
      throw new Error(`Player detached before fully leaving the visible ladder: ${JSON.stringify(partialPlayer)}`);
    }

    // Continuing in the same direction must release only after the character
    // body clears the ladder's right edge.
    await keyEvent('keyDown', 'd', 'KeyD', 68);
    let lastAttached = partialShift;
    let fullyClear = null;
    for (const deadline = Date.now() + 2000; Date.now() < deadline;) {
      await delay(25);
      const candidate = JSON.parse(await evaluate('window.render_game_to_text()'));
      if (candidate.parkour.player.state === 'climbing') lastAttached = candidate;
      else {
        fullyClear = candidate;
        break;
      }
    }
    await keyEvent('keyUp', 'd', 'KeyD', 68);
    if (!fullyClear
      || lastAttached.parkour.player.bodyLeft > lastAttached.parkour.player.ladderRight
      || fullyClear.parkour.player.bodyLeft < lastAttached.parkour.player.ladderRight
      || !fullyClear.parkour.player.platformCollisionActive) {
      throw new Error(`Ladder release did not occur at the full-body boundary: ${JSON.stringify({ lastAttached: lastAttached.parkour.player, fullyClear: fullyClear?.parkour.player })}`);
    }
    // The building is left of this recovery ladder. Its live wall collider
    // prevents the player from clearing that side and therefore keeps the
    // player attached rather than allowing a wall clip.
    await evaluate("window.game.scene.getScene('CyberpunkParkour').player.body.reset(1210, 350)")
    await delay(80);
    await keyEvent('keyDown', 'w', 'KeyW', 87);
    await delay(80);
    await keyEvent('keyDown', 'a', 'KeyA', 65);
    await delay(520);
    const wallBlocked = JSON.parse(await evaluate('window.render_game_to_text()'));
    await keyEvent('keyUp', 'a', 'KeyA', 65);
    await keyEvent('keyUp', 'w', 'KeyW', 87);
    if (wallBlocked.parkour.player.state !== 'climbing'
      || wallBlocked.parkour.player.bodyRight <= wallBlocked.parkour.player.ladderLeft
      || wallBlocked.parkour.player.bodyLeft >= wallBlocked.parkour.player.ladderRight
      || !wallBlocked.parkour.player.platformCollisionActive) {
      throw new Error(`Ladder movement clipped through its attached building: ${JSON.stringify(wallBlocked.parkour.player)}`);
    }
    snapshot = wallBlocked;
    evidence['ladder-partial-shift'] = partialShift;
    evidence['ladder-full-release'] = fullyClear;
  } else if (name === 'recovery' || name === 'recovery-car-b' || name === 'recovery-car-d') {
    await send('Page.bringToFront');
    await evaluate("document.querySelector('canvas').focus()")
    await keyEvent('keyDown', 'w', 'KeyW', 87);
    const ladderX = name === 'recovery' ? 1210 : name === 'recovery-car-b' ? 3820 : 6260;
    const clearRoofY = name === 'recovery' ? 150 : name === 'recovery-car-b' ? 340 : 60;
    let beforeDismount = null;
    for (const deadline = Date.now() + 5000; Date.now() < deadline;) {
      await delay(25);
      const candidate = JSON.parse(await evaluate('window.render_game_to_text()'));
      if (candidate.parkour.player.y <= clearRoofY) {
        beforeDismount = candidate;
        break;
      }
    }
    if (!beforeDismount) throw new Error(`Ladder never carried the player above its roof: ${name}`);
    if (beforeDismount.parkour.player.ladderTop === null
      || beforeDismount.parkour.player.bodyBottom < beforeDismount.parkour.player.ladderTop - 10
      || beforeDismount.parkour.player.bodyBottom > beforeDismount.parkour.player.ladderTop + 8) {
      throw new Error(`Player climbed above the visible ladder top: ${JSON.stringify(beforeDismount.parkour.player)}`);
    }
    await keyEvent('keyDown', 'a', 'KeyA', 65);
    let steppedOff = false;
    for (const deadline = Date.now() + 2000; Date.now() < deadline;) {
      await delay(20);
      const candidate = JSON.parse(await evaluate('window.render_game_to_text()'));
      if (candidate.parkour.player.x <= ladderX - 45) {
        steppedOff = true;
        break;
      }
    }
    await keyEvent('keyUp', 'w', 'KeyW', 87);
    await keyEvent('keyUp', 'a', 'KeyA', 65);
    if (!steppedOff) throw new Error(`Player could not step sideways off ladder: ${name}`);
    for (const deadline = Date.now() + 3000; Date.now() < deadline;) {
      await delay(50);
      snapshot = JSON.parse(await evaluate('window.render_game_to_text()'));
      if (snapshot.parkour.player.velocityY === 0 && snapshot.parkour.player.state !== 'climbing') break;
    }
    if (Math.abs(beforeDismount.parkour.player.x - ladderX) > 2) {
      throw new Error(`Ladder moved the player sideways before manual dismount input: ${JSON.stringify(beforeDismount.parkour.player)}`);
    }
    const recovered = name === 'recovery'
      ? snapshot.parkour.player.x >= 800 && snapshot.parkour.player.x <= 1190 && snapshot.parkour.player.y <= 200
      : name === 'recovery-car-b'
        ? snapshot.parkour.player.x >= 3520 && snapshot.parkour.player.x <= 3820 && snapshot.parkour.player.y <= 350
        : snapshot.parkour.player.x >= 5900 && snapshot.parkour.player.x <= 6240 && snapshot.parkour.player.y <= 110;
    if (!recovered) {
      throw new Error(`Recovery ladder did not return the player to the prior route: ${JSON.stringify(snapshot.parkour.player)}`);
    }
    if (name === 'recovery') {
      // The first return ladder is deliberately forgiving: Space at its top
      // takes the player to the authored safe roof, even without A/D input.
      await evaluate("window.game.scene.getScene('CyberpunkParkour').player.body.reset(1210, 350)");
      await delay(80);
      await keyEvent('keyDown', 'w', 'KeyW', 87);
      for (const deadline = Date.now() + 5000; Date.now() < deadline;) {
        await delay(25);
        const candidate = JSON.parse(await evaluate('window.render_game_to_text()'));
        if (candidate.parkour.player.y <= 150) break;
      }
      await keyEvent('keyUp', 'w', 'KeyW', 87);
      await keyEvent('keyDown', ' ', 'Space', 32);
      await delay(80);
      await keyEvent('keyUp', ' ', 'Space', 32);
      let spaceDismounted = null;
      for (const deadline = Date.now() + 2000; Date.now() < deadline;) {
        await delay(25);
        const candidate = JSON.parse(await evaluate('window.render_game_to_text()'));
        if (candidate.parkour.player.state !== 'climbing') {
          spaceDismounted = candidate;
          break;
        }
      }
      if (!spaceDismounted
        || spaceDismounted.parkour.player.x < 800
        || spaceDismounted.parkour.player.x > 1190
        || spaceDismounted.parkour.player.y > 200) {
        throw new Error(`Space did not safely dismount the first recovery ladder: ${JSON.stringify(spaceDismounted?.parkour.player)}`);
      }
      evidence['recovery-space-dismount'] = spaceDismounted;
    }
  } else if (name === 'spikes') {
    const spikes = snapshot.parkour.hazards.find(({ label }) => label === 'spikes');
    if (spikes.width !== 96 || spikes.visualSegments !== 4) {
      throw new Error(`Spike strip did not render as four segments: ${JSON.stringify(spikes)}`);
    }
  } else if (name === 'extension') {
    await send('Page.bringToFront');
    await evaluate("document.querySelector('canvas').focus()")
    await keyEvent('keyDown', 'd', 'KeyD', 68);
    await delay(520);
    await keyEvent('keyUp', 'd', 'KeyD', 68);
    await delay(180);
    snapshot = JSON.parse(await evaluate('window.render_game_to_text()'));
    if (snapshot.parkour.course.width !== 8100
      || snapshot.parkour.movables.length !== 8
      || snapshot.parkour.flyingCars.length !== 4
      || !snapshot.parkour.checkpointReached) {
      throw new Error(`Extended course did not expose its authored topology: ${JSON.stringify(snapshot.parkour)}`);
    }
  } else if (name === 'extension-drag') {
    await delay(1400);
    const beforeDrag = JSON.parse(await evaluate('window.render_game_to_text()'));
    const canvas = await evaluate(`(() => {
      const rect = document.querySelector('canvas').getBoundingClientRect();
      return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    })()`);
    const scrollX = beforeDrag.parkour.camera.centerX - 480;
    const point = (worldX, worldY) => ({
      x: canvas.left + (worldX - scrollX) * canvas.width / 960,
      y: canvas.top + worldY * canvas.height / 600,
    });
    const from = point(5580, 229);
    const to = point(5850, 229);
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...from, button: 'none', buttons: 0 });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...from, button: 'left', buttons: 1, clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...to, button: 'left', buttons: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...to, button: 'left', buttons: 0, clickCount: 1 });
    await delay(220);
    snapshot = JSON.parse(await evaluate('window.render_game_to_text()'));
    const block = snapshot.parkour.movables.find(({ id }) => id === 'block-c');
    if (Math.abs(block.x - 5850) > 2
      || block.collisionX !== block.x
      || !snapshot.parkour.movedMovables.includes('block-c')) {
      throw new Error(`Extended block drag did not commit matching visual and collision positions: ${JSON.stringify(block)}`);
    }
  } else if (name === 'extension-spikes') {
    const spikes = snapshot.parkour.hazards.find(({ x }) => x === 4840);
    if (spikes?.width !== 72 || spikes.visualSegments !== 3) {
      throw new Error(`First post-checkpoint spike strip is not the authored three-segment jump: ${JSON.stringify(spikes)}`);
    }
    await send('Page.bringToFront');
    await evaluate("document.querySelector('canvas').focus()")
    await keyEvent('keyDown', 'd', 'KeyD', 68);
    await delay(700);
    await keyEvent('keyUp', 'd', 'KeyD', 68);
    await delay(900);
    snapshot = JSON.parse(await evaluate('window.render_game_to_text()'));
    if (snapshot.parkour.resetCount < 1
      || !snapshot.parkour.checkpointReached
      || Math.abs(snapshot.parkour.player.x - 4230) > 70) {
      throw new Error(`Extension failure did not restore the midpoint: ${JSON.stringify(snapshot.parkour.player)}`);
    }
  } else if (name === 'high-spikes') {
    const spikes = snapshot.parkour.hazards.find(({ x }) => x === 7160);
    if (spikes?.y !== 55 || spikes.width !== 72 || spikes.visualSegments !== 3) {
      throw new Error(`High spike jump was not reduced to three segments: ${JSON.stringify(snapshot.parkour.hazards)}`);
    }
    await send('Page.bringToFront');
    await evaluate("document.querySelector('canvas').focus()")
    await keyEvent('keyDown', 'd', 'KeyD', 68);
    let takeoffReady = false;
    for (const deadline = Date.now() + 2000; Date.now() < deadline;) {
      await delay(20);
      const candidate = JSON.parse(await evaluate('window.render_game_to_text()'));
      if (candidate.parkour.player.x >= 7095) {
        takeoffReady = true;
        break;
      }
    }
    if (!takeoffReady) throw new Error('Player could not reach the high-spike takeoff point.');
    await keyEvent('keyDown', ' ', 'Space', 32);
    await delay(600);
    const airborne = JSON.parse(await evaluate('window.render_game_to_text()'));
    await keyEvent('keyUp', ' ', 'Space', 32);
    await delay(800);
    await keyEvent('keyUp', 'd', 'KeyD', 68);
    await delay(250);
    snapshot = JSON.parse(await evaluate('window.render_game_to_text()'));
    if (airborne.parkour.player.y >= 0 || airborne.parkour.player.blockedUp) {
      throw new Error(`High jump still collided with the top of the screen: ${JSON.stringify(airborne.parkour.player)}`);
    }
    if (snapshot.parkour.resetCount !== 0 || snapshot.parkour.player.x < 7250) {
      throw new Error(`Third post-checkpoint spike jump did not clear cleanly: ${JSON.stringify(snapshot.parkour.player)}`);
    }
  }
  // Let the smoothed follow camera reach seeded ride/goal positions before
  // capturing, while leaving enough motion for the flying-car phase to prove
  // it is live rather than a static prop.
  await delay(1200);
  const screenshot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  await writeFile(`${outputDir}/${name}.png`, Buffer.from(screenshot.data, 'base64'));
  evidence[name] = snapshot;
  if (name === 'moving-car') {
    await send('Page.bringToFront');
    await evaluate("document.querySelector('canvas').focus()")
    const carryStart = JSON.parse(await evaluate('window.render_game_to_text()'));
    const startCar = carryStart.parkour.flyingCars.find(({ id }) => id === 'car-a');
    const startOffset = carryStart.parkour.player.x - startCar.visualX;
    await delay(900);
    const carryEnd = JSON.parse(await evaluate('window.render_game_to_text()'));
    const endCar = carryEnd.parkour.flyingCars.find(({ id }) => id === 'car-a');
    const endOffset = carryEnd.parkour.player.x - endCar.visualX;
    if (carryEnd.parkour.player.ridingCar !== 'car-a'
      || Math.abs(endOffset - startOffset) > 2
      || Math.abs(endCar.x - startCar.x) < 35
      || Math.abs(endCar.visualX - endCar.x) > 6
      || endCar.collisionX !== endCar.visualX) {
      throw new Error(`Idle rider did not inherit the flying car delta: ${JSON.stringify({ carryStart: carryStart.parkour.player, startCar, carryEnd: carryEnd.parkour.player, endCar })}`);
    }
    await keyEvent('keyDown', 'd', 'KeyD', 68);
    await delay(140);
    await keyEvent('keyUp', 'd', 'KeyD', 68);
    await delay(120);
    const movedOnCar = JSON.parse(await evaluate('window.render_game_to_text()'));
    const movedCar = movedOnCar.parkour.flyingCars.find(({ id }) => id === 'car-a');
    if (movedOnCar.parkour.player.ridingCar !== 'car-a'
      || movedOnCar.parkour.player.x - movedCar.visualX <= endOffset + 5) {
      throw new Error(`A/D did not move the rider relative to the flying car: ${JSON.stringify(movedOnCar.parkour.player)}`);
    }
    evidence['ride-controls'] = { carryStart, carryEnd, movedOnCar };
    await keyEvent('keyDown', 'a', 'KeyA', 65);
    await delay(240);
    await keyEvent('keyUp', 'a', 'KeyA', 65);
    let launchReady = false;
    let lastRideState = null;
    let rideExit = null;
    for (const deadline = Date.now() + 8000; Date.now() < deadline;) {
      await delay(100);
      const candidate = JSON.parse(await evaluate('window.render_game_to_text()'));
      const car = candidate.parkour.flyingCars.find(({ id }) => id === 'car-a');
      lastRideState = { player: candidate.parkour.player, car };
      if (!candidate.parkour.player.ridingCar && candidate.parkour.player.x >= 1570) {
        // At the extreme endpoint Arcade can place a standing rider directly
        // onto the overlapping roof lip. That is also a safe full-route exit.
        rideExit = candidate;
        launchReady = true;
        break;
      }
      if (candidate.parkour.player.ridingCar === 'car-a' && car.phase >= 0.88) {
        launchReady = true;
        break;
      }
    }
    if (!launchReady) throw new Error(`Flying car never carried the player to its jump-off window: ${JSON.stringify(lastRideState)}`);
    if (!rideExit) {
      await keyEvent('keyDown', 'd', 'KeyD', 68);
      await keyEvent('keyDown', ' ', 'Space', 32);
      await delay(180);
      await keyEvent('keyUp', ' ', 'Space', 32);
      await delay(1050);
      await keyEvent('keyUp', 'd', 'KeyD', 68);
      await delay(350);
      rideExit = JSON.parse(await evaluate('window.render_game_to_text()'));
    }
    if (rideExit.parkour.player.x < 1570 || rideExit.parkour.player.ridingCar) {
      throw new Error(`Player did not jump off the flying car onto the next roof: ${JSON.stringify(rideExit.parkour.player)}`);
    }
    evidence['ride-exit'] = rideExit;
  } else if (name === 'extension-car-c' || name === 'extension-car-d') {
    const carryStart = JSON.parse(await evaluate('window.render_game_to_text()'));
    const carId = name === 'extension-car-c' ? 'car-c' : 'car-d';
    const startCar = carryStart.parkour.flyingCars.find(({ id }) => id === carId);
    const startOffset = carryStart.parkour.player.x - startCar.visualX;
    await delay(900);
    const carryEnd = JSON.parse(await evaluate('window.render_game_to_text()'));
    const endCar = carryEnd.parkour.flyingCars.find(({ id }) => id === carId);
    const endOffset = carryEnd.parkour.player.x - endCar.visualX;
    if (carryEnd.parkour.player.ridingCar !== carId
      || Math.abs(endOffset - startOffset) > 2
      || Math.abs(endCar.x - startCar.x) < 35
      || endCar.collisionX !== endCar.visualX) {
      throw new Error(`Extended flying car did not carry its rider: ${JSON.stringify({ carryStart: carryStart.parkour.player, startCar, carryEnd: carryEnd.parkour.player, endCar })}`);
    }
    evidence[`extension-ride-${carId}`] = { carryStart, carryEnd };
  }
}

// Exercise the real pointer/keyboard path for both movable kinds, the first
// ladder climb, and R reset. Model tests cover the full authored bounds; this
// pass proves Phaser input, view placement and collision commit are wired to
// that model in the running scene.
await send('Page.navigate', { url: `${baseUrl}/?chapter=cyberpunk` });
let liveReady = false;
for (const deadline = Date.now() + 20000; Date.now() < deadline;) {
  await delay(120);
  const rendered = await evaluate('window.render_game_to_text?.() ?? null');
  if (rendered && JSON.parse(rendered).scene === 'CyberpunkParkour') {
    liveReady = true;
    break;
  }
}
if (!liveReady) throw new Error('Timed out waiting for live-input parkour state.');
await send('Page.bringToFront');
await evaluate("document.querySelector('canvas').focus()")
const canvas = await evaluate(`(() => {
  const rect = document.querySelector('canvas').getBoundingClientRect();
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
})()`);
const point = (worldX, worldY) => ({
  x: canvas.left + worldX * canvas.width / 960,
  y: canvas.top + worldY * canvas.height / 600,
});
const drag = async (fromX, fromY, toX, toY) => {
  const from = point(fromX, fromY);
  const to = point(toX, toY);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...from, button: 'none', buttons: 0 });
  await delay(50);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...from, button: 'left', buttons: 1, clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...to, button: 'left', buttons: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...to, button: 'left', buttons: 0, clickCount: 1 });
  await delay(160);
};
await drag(550, 260, 735, 260);
const ladderDragState = JSON.parse(await evaluate('window.render_game_to_text()'));
const liveLadder = ladderDragState.parkour.movables.find(({ id }) => id === 'ladder-a');
if (Math.abs(liveLadder.x - 735) > 2) {
  throw new Error(`Live ladder drag did not commit: ${JSON.stringify({ ladder: liveLadder, drag: ladderDragState.parkour.drag, pointer: ladderDragState.parkour.lastPointerEvent })}`);
}
await drag(180, 509, 420, 509);
await keyEvent('keyDown', 'd', 'KeyD', 68);
await delay(1400);
await keyEvent('keyDown', ' ', 'Space', 32);
await delay(250);
await keyEvent('keyUp', 'd', 'KeyD', 68);
await delay(450);
await keyEvent('keyUp', ' ', 'Space', 32);
await delay(600);
await keyEvent('keyDown', 'd', 'KeyD', 68);
await keyEvent('keyDown', ' ', 'Space', 32);
await delay(900);
await keyEvent('keyUp', ' ', 'Space', 32);
await delay(1800);
await keyEvent('keyUp', 'd', 'KeyD', 68);
await keyEvent('keyDown', 'w', 'KeyW', 87);
await delay(1600);
await keyEvent('keyUp', 'w', 'KeyW', 87);
await delay(250);
const climbed = JSON.parse(await evaluate('window.render_game_to_text()'));
if (!climbed.parkour.movedKinds.includes('ladder')
  || !climbed.parkour.movedKinds.includes('block')
  || climbed.parkour.player.y >= 260) {
  throw new Error(`Live drag or ladder-climb route did not reach the first rooftop: ${JSON.stringify({ player: climbed.parkour.player, movables: climbed.parkour.movables, lastPointerEvent: climbed.parkour.lastPointerEvent })}`);
}
const movedBlock = climbed.parkour.movables.find(({ id }) => id === 'block-a');
if (Math.abs(movedBlock.x - 420) > 2 || movedBlock.collisionX !== movedBlock.x) {
  throw new Error(`Block view/body mismatch after drag: ${JSON.stringify(movedBlock)}`);
}
// Return to the ground approach while preserving the committed drag so the
// moved block's live collision can be tested independently of the roof route.
await evaluate("window.game.scene.getScene('CyberpunkParkour').player.body.reset(70, 490)");
await delay(180);
await keyEvent('keyDown', 'd', 'KeyD', 68);
await delay(1800);
await keyEvent('keyUp', 'd', 'KeyD', 68);
await delay(180);
const blockCollision = JSON.parse(await evaluate('window.render_game_to_text()'));
if (blockCollision.parkour.player.x < 362 || blockCollision.parkour.player.x > 385) {
  throw new Error(`Player did not pass the old block and stop at the moved block: ${JSON.stringify(blockCollision.parkour.player)}`);
}
const liveScreenshot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
await writeFile(`${outputDir}/live-controls.png`, Buffer.from(liveScreenshot.data, 'base64'));
await keyEvent('keyDown', 'r', 'KeyR', 82);
await delay(100);
await keyEvent('keyUp', 'r', 'KeyR', 82);
await delay(300);
const resetByKey = JSON.parse(await evaluate('window.render_game_to_text()'));
if (resetByKey.parkour.resetCount !== 1 || resetByKey.parkour.movedKinds.length !== 0) {
  throw new Error('R did not restore the authored parkour state.');
}
evidence['live-controls'] = { climbed, blockCollision, resetByKey };

// Integration boundary: the real departure cinematic owns the scene switch.
// The fixture seeds only the already-tested final Prologue room, then invokes
// the same departure method that final puzzle completion calls.
await send('Page.navigate', { url: `${baseUrl}/?qa=tutorial-exit` });
let gameReady = false;
for (const deadline = Date.now() + 20000; Date.now() < deadline;) {
  await delay(120);
  const rendered = await evaluate('window.render_game_to_text?.() ?? null');
  if (rendered && JSON.parse(rendered).scene === 'Game') {
    gameReady = true;
    break;
  }
}
if (!gameReady) throw new Error('Timed out waiting for the Prologue hand-off fixture.');
await evaluate("window.game.scene.getScene('Game').playPrologueDeparture()")
let handoff = null;
for (const deadline = Date.now() + 12000; Date.now() < deadline;) {
  await delay(160);
  const rendered = await evaluate('window.render_game_to_text?.() ?? null');
  if (!rendered) continue;
  const candidate = JSON.parse(rendered);
  if (candidate.scene === 'CyberpunkParkour') {
    handoff = candidate;
    break;
  }
}
if (!handoff) throw new Error('Prologue departure did not enter the cyberpunk parkour scene.');
evidence['prologue-handoff'] = handoff;

// The legacy direct Car 2 link remains useful for focused development after
// the dev chapter-select merge. It must land in the same authored destination
// as the parkour completion door, while production still gates the route.
await send('Page.navigate', { url: `${baseUrl}/?car=2` });
let directCarTwo = null;
for (const deadline = Date.now() + 20000; Date.now() < deadline;) {
  await delay(120);
  const rendered = await evaluate('window.render_game_to_text?.() ?? null');
  if (!rendered) continue;
  const candidate = JSON.parse(rendered);
  if (candidate.scene === 'Game' && candidate.world?.index === 2) {
    directCarTwo = candidate;
    break;
  }
}
if (!directCarTwo || Math.abs(directCarTwo.player.x - 5291) > 80) {
  throw new Error(`Direct Car 2 route did not reach its authored entrance: ${JSON.stringify(directCarTwo?.player ?? null)}`);
}
evidence['direct-car-2'] = directCarTwo;

await writeFile(`${outputDir}/states.json`, `${JSON.stringify(evidence, null, 2)}\n`);
socket.close();

if (pageErrors.length) {
  throw new Error(`Browser errors:\n${pageErrors.join('\n')}`);
}
console.log(JSON.stringify({ states: Object.keys(evidence), pageErrors }, null, 2));
