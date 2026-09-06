// Procedural art for CAR 04 // THE BORROWED GRID.
// Everything is generated Phaser primitives in the train world's material
// language: brass and copper hardware, ceramic insulators, cyan = normal,
// red = fault, worn dark metal, low neon. No external sprites.

export const C4 = {
  brass: 0xb08d57,
  brassDark: 0x7a5f3a,
  copper: 0xc47a3d,
  ceramic: 0xe8e0d0,
  cyan: 0x37e0d8,
  cyanDim: 0x1b6a66,
  red: 0xd23b3b,
  redDim: 0x5a1d20,
  metal: 0x232833,
  metalDark: 0x14171d,
  rim: 0xdfe7f2,
  amber: 0xffc98a,
  magenta: 0xd84fb0,
  player: 0xd8d2c4,
};

export function generateCar04Textures(scene) {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  // Player: light-silhouette figure, brightest moving thing on screen.
  g.clear();
  g.fillStyle(C4.player, 1);
  g.fillRect(8, 0, 10, 10); // head
  g.fillRect(6, 11, 14, 20); // torso
  g.fillRect(7, 31, 5, 13); // leg L
  g.fillRect(14, 31, 5, 13); // leg R
  g.fillStyle(C4.brass, 1);
  g.fillRect(6, 11, 14, 3); // collar trim
  g.generateTexture('c4-player', 26, 44);

  // Ladder bridge: two brass rails, worn rungs.
  g.clear();
  g.fillStyle(C4.brass, 1);
  g.fillRect(0, 0, 240, 4);
  g.fillRect(0, 12, 240, 4);
  g.fillStyle(C4.brassDark, 1);
  for (let x = 8; x < 240; x += 24) g.fillRect(x, 3, 5, 10);
  g.generateTexture('c4-ladder', 240, 16);

  // Battery / distribution block: dark case, brass terminals, charge slit.
  g.clear();
  g.fillStyle(C4.metal, 1);
  g.fillRect(0, 6, 44, 46);
  g.fillStyle(C4.metalDark, 1);
  g.fillRect(3, 9, 38, 40);
  g.fillStyle(C4.brass, 1);
  g.fillRect(8, 0, 8, 8);
  g.fillRect(28, 0, 8, 8);
  g.fillStyle(C4.cyan, 1);
  g.fillRect(8, 24, 28, 4); // charge slit, tinted down when unseated
  g.generateTexture('c4-battery', 44, 52);

  // Ceramic insulator post for conductor sockets.
  g.clear();
  g.fillStyle(C4.metalDark, 1);
  g.fillRect(3, 44, 10, 20);
  g.fillStyle(C4.ceramic, 1);
  g.fillRect(1, 6, 14, 10);
  g.fillRect(2, 18, 12, 8);
  g.fillRect(1, 28, 14, 10);
  g.fillStyle(C4.brass, 1);
  g.fillRect(5, 0, 6, 6); // terminal cap
  g.generateTexture('c4-post', 16, 64);

  // Battery socket cradle: floor bracket with open latches.
  g.clear();
  g.fillStyle(C4.metal, 1);
  g.fillRect(0, 26, 56, 8);
  g.fillStyle(C4.brass, 1);
  g.fillRect(2, 8, 6, 20); // latch L (open)
  g.fillRect(48, 8, 6, 20); // latch R
  g.fillStyle(C4.copper, 1);
  g.fillRect(24, 20, 8, 8); // contact stud
  g.generateTexture('c4-cradle', 56, 34);

  // Flying car: maglev hull, brass trim, window band (tinted at runtime).
  g.clear();
  g.fillStyle(C4.metal, 1);
  g.fillRect(6, 4, 138, 22);
  g.fillRect(20, 0, 110, 8); // roof fairing
  g.fillStyle(C4.metalDark, 1);
  g.fillRect(6, 22, 138, 4);
  g.fillStyle(C4.brass, 1);
  g.fillRect(6, 25, 138, 3); // brass keel line
  g.fillRect(0, 10, 8, 8); // nose
  g.fillRect(142, 10, 8, 8); // tail
  g.fillStyle(C4.cyan, 1);
  g.fillRect(18, 8, 114, 8); // window band (glows when alive)
  g.fillStyle(C4.copper, 1);
  g.fillRect(30, 29, 90, 3); // maglev skid
  g.generateTexture('c4-car', 150, 34);

  // Stop signal: relay box + lamp.
  g.clear();
  g.fillStyle(C4.metalDark, 1);
  g.fillRect(0, 0, 20, 34);
  g.fillStyle(C4.brass, 1);
  g.fillRect(0, 0, 20, 3);
  g.fillStyle(C4.red, 1);
  g.fillCircle(10, 12, 6); // lamp, tinted cyan when powered
  g.fillStyle(C4.ceramic, 1);
  g.fillRect(6, 24, 8, 6);
  g.generateTexture('c4-signal', 20, 34);

  // Goal door: brass-framed carriage door with tungsten lamp.
  g.clear();
  g.fillStyle(C4.metalDark, 1);
  g.fillRect(0, 0, 96, 150);
  g.fillStyle(C4.brass, 1);
  g.fillRect(0, 0, 96, 6);
  g.fillRect(0, 0, 6, 150);
  g.fillRect(90, 0, 6, 150);
  g.fillStyle(C4.metal, 1);
  g.fillRect(12, 12, 72, 132); // leaf, slides open at runtime
  g.fillStyle(C4.amber, 1);
  g.fillCircle(48, 8, 4); // lintel lamp
  g.generateTexture('c4-door', 96, 150);

  // CRT bay sign.
  g.clear();
  g.fillStyle(C4.metalDark, 1);
  g.fillRect(0, 0, 220, 40);
  g.fillStyle(C4.brass, 1);
  g.fillRect(0, 0, 220, 3);
  g.fillRect(0, 37, 220, 3);
  g.generateTexture('c4-crt', 220, 40);

  // Relay mast (mechanical traffic signal for branch lines).
  g.clear();
  g.fillStyle(C4.metalDark, 1);
  g.fillRect(6, 20, 8, 60);
  g.fillStyle(C4.brass, 1);
  g.fillRect(0, 0, 20, 20);
  g.fillStyle(C4.red, 1);
  g.fillCircle(10, 10, 5);
  g.generateTexture('c4-mast', 20, 80);

  g.destroy();
}

// Platform block with a lit top rim — the standing surface must read.
export function drawPlatform(scene, p) {
  const gr = scene.add.graphics();
  gr.fillStyle(C4.metalDark, 1);
  gr.fillRect(p.x, p.y, p.w, p.d);
  gr.fillStyle(C4.metal, 1);
  gr.fillRect(p.x, p.y, p.w, 6);
  gr.fillStyle(C4.rim, 0.55);
  gr.fillRect(p.x, p.y, p.w, 2);
  // rivet course
  gr.fillStyle(C4.brass, 0.5);
  for (let x = p.x + 12; x < p.x + p.w - 6; x += 36) gr.fillRect(x, p.y + 8, 3, 3);
  return gr;
}
