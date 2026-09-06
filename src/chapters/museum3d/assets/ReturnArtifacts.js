import * as THREE from 'three';

const ARTIFACT_COLORS = Object.freeze({
  stone: 0x17151a,
  soot: 0x3a3030,
  eye: 0xd8c6a0,
  copper: 0xb76a37,
  cyan: 0x55ddd5,
  amber: 0xd7a34d,
  ceramic: 0xc8bda2,
  paper: 0xe8dcc2,
  paperDark: 0xa98966,
  graphite: 0x46434a,
});

function mesh(geometry, material, name) {
  const result = new THREE.Mesh(geometry, material);
  result.name = name;
  result.castShadow = true;
  result.receiveShadow = true;
  return result;
}

function lookingFragment() {
  // THE LOOKING FRAGMENT — broken dark stone face shard. Same origin,
  // forward axis (+z face) and overall envelope as the locked placeholder
  // (~0.36 x 0.55 x 0.20 m), so the Museum's carry and niche transforms
  // hold. The read at corridor distance is the tall dark shard with one
  // incomplete eye socket — distinct from the circular Door 2 coil and the
  // pale Door 4 fold.
  const group = new THREE.Group();
  group.name = 'artifact-looking-fragment';

  const stoneMat = new THREE.MeshStandardMaterial({ color: ARTIFACT_COLORS.stone, roughness: 0.92, metalness: 0.02 });
  const facetMat = new THREE.MeshStandardMaterial({ color: ARTIFACT_COLORS.graphite, roughness: 0.85, metalness: 0.04 });

  const stone = mesh(
    new THREE.DodecahedronGeometry(0.22, 0),
    stoneMat,
    'looking-fragment-stone',
  );
  stone.scale.set(0.82, 1.25, 0.46);
  stone.rotation.set(0.16, -0.2, 0.23);
  group.add(stone);

  // Chipped planes — fresh break facets catching slightly more light than
  // the weathered body, placed along the shard's broken edges.
  const facetSpecs = [
    { size: [0.16, 0.1, 0.02], pos: [-0.1, 0.16, 0.055], rot: [0.3, 0.5, 0.4] },
    { size: [0.12, 0.08, 0.018], pos: [0.12, -0.14, 0.05], rot: [-0.25, -0.45, 0.2] },
    { size: [0.09, 0.13, 0.016], pos: [-0.14, -0.05, 0.03], rot: [0.15, 0.7, -0.3] },
  ];
  facetSpecs.forEach((spec, index) => {
    const facet = mesh(new THREE.BoxGeometry(...spec.size), facetMat, `looking-fragment-chip-${index}`);
    facet.position.set(...spec.pos);
    facet.rotation.set(...spec.rot);
    group.add(facet);
  });

  // The incomplete eye socket: a dark pit sunk into the face, ringed by a
  // broken pale rim arc — the eye that isn't there.
  const pit = mesh(
    new THREE.CircleGeometry(0.052, 18),
    new THREE.MeshBasicMaterial({ color: 0x050506 }),
    'looking-fragment-eye-pit',
  );
  pit.position.set(0.018, 0.045, 0.104);
  pit.rotation.z = 0.2;
  group.add(pit);
  const socket = mesh(
    new THREE.TorusGeometry(0.066, 0.018, 8, 18, Math.PI * 1.55),
    new THREE.MeshStandardMaterial({ color: ARTIFACT_COLORS.eye, roughness: 0.72 }),
    'looking-fragment-eye-socket',
  );
  socket.position.set(0.018, 0.045, 0.107);
  socket.rotation.z = 0.2;
  group.add(socket);

  // Warm residue caught in the cracks below the socket — thin ember seams,
  // unlit-bright so they stay readable in the dark niche.
  const residueMat = new THREE.MeshBasicMaterial({ color: 0xc98a3e, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
  const residueSpecs = [
    { size: [0.012, 0.11], pos: [0.005, -0.06, 0.112], rot: 0.12 },
    { size: [0.009, 0.07], pos: [0.045, -0.03, 0.11], rot: -0.3 },
  ];
  const residue = residueSpecs.map((spec, index) => {
    const seam = mesh(new THREE.PlaneGeometry(...spec.size), residueMat, `looking-fragment-residue-${index}`);
    seam.position.set(...spec.pos);
    seam.rotation.z = spec.rot;
    group.add(seam);
    return seam;
  });
  group.userData.residue = residue;

  // The old soot streak stays as the widest, dimmest crack stain.
  const soot = mesh(
    new THREE.PlaneGeometry(0.13, 0.035),
    new THREE.MeshBasicMaterial({ color: ARTIFACT_COLORS.soot, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
    'looking-fragment-soot',
  );
  soot.position.set(-0.025, -0.085, 0.114);
  soot.rotation.z = -0.35;
  group.add(soot);
  return group;
}

function bypassCoil() {
  const group = new THREE.Group();
  group.name = 'artifact-three-district-bypass-coil';
  const ceramic = mesh(
    new THREE.CylinderGeometry(0.09, 0.12, 0.25, 12),
    new THREE.MeshStandardMaterial({ color: ARTIFACT_COLORS.ceramic, roughness: 0.78 }),
    'bypass-coil-ceramic-insulator',
  );
  ceramic.rotation.z = Math.PI / 2;
  group.add(ceramic);
  const strands = [ARTIFACT_COLORS.copper, ARTIFACT_COLORS.cyan, ARTIFACT_COLORS.amber].map((color, index) => {
    const strand = mesh(
      new THREE.TorusGeometry(0.15 + index * 0.018, 0.014, 8, 32),
      new THREE.MeshBasicMaterial({ color }),
      `bypass-coil-strand-${index}`,
    );
    strand.position.z = 0.014 * (index - 1);
    strand.rotation.set(0.18 * (index - 1), 0.12 * (1 - index), index * 0.08);
    group.add(strand);
    return strand;
  });
  group.userData.pulseStrands = strands;
  return group;
}

function commonFold() {
  const group = new THREE.Group();
  group.name = 'artifact-common-fold';
  const paperMaterial = new THREE.MeshStandardMaterial({ color: ARTIFACT_COLORS.paper, roughness: 0.96, side: THREE.DoubleSide });
  const left = mesh(new THREE.PlaneGeometry(0.24, 0.22), paperMaterial, 'common-fold-left-paper');
  left.position.x = -0.082;
  left.rotation.y = 0.72;
  const right = mesh(new THREE.PlaneGeometry(0.24, 0.22), paperMaterial.clone(), 'common-fold-right-paper');
  right.position.x = 0.082;
  right.rotation.y = -0.72;
  const roof = mesh(new THREE.ConeGeometry(0.19, 0.15, 3), new THREE.MeshStandardMaterial({ color: ARTIFACT_COLORS.paperDark, roughness: 0.95 }), 'common-fold-roof');
  roof.rotation.z = Math.PI;
  roof.position.y = 0.15;
  roof.scale.z = 0.35;
  const thread = mesh(new THREE.TorusGeometry(0.145, 0.008, 6, 28), new THREE.MeshBasicMaterial({ color: ARTIFACT_COLORS.cyan }), 'common-fold-cyan-thread');
  thread.rotation.x = Math.PI / 2;
  thread.rotation.z = 0.18;
  group.add(left, right, roof, thread);
  group.userData.paperPanels = [left, right];
  return group;
}

function maraMorningCassette() {
  const group = new THREE.Group();
  group.name = 'artifact-mara-ordinary-morning-cassette';
  const shell = mesh(
    new THREE.BoxGeometry(0.52, 0.32, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x2b2926, roughness: 0.86, metalness: 0.04 }),
    'mara-cassette-shell',
  );
  group.add(shell);
  const label = mesh(
    new THREE.PlaneGeometry(0.42, 0.20),
    new THREE.MeshStandardMaterial({ color: 0xcab98c, roughness: 0.94 }),
    'mara-cassette-paper-label',
  );
  label.position.z = 0.043;
  group.add(label);
  const reels = [];
  for (const x of [-0.13, 0.13]) {
    const reel = mesh(
      new THREE.TorusGeometry(0.065, 0.014, 8, 20),
      new THREE.MeshStandardMaterial({ color: 0x5a4b35, roughness: 0.76, metalness: 0.12 }),
      'mara-cassette-reel',
    );
    reel.position.set(x, 0, 0.052);
    group.add(reel);
    reels.push(reel);
  }
  group.userData.reels = reels;
  return group;
}

export function createReturnArtifact(directionId) {
  if (directionId === 'labyrinth') return lookingFragment();
  if (directionId === 'borrowed-grid') return bypassCoil();
  if (directionId === 'echo-city') return maraMorningCassette();
  if (directionId === 'painted-country') return commonFold();
  throw new Error(`No return artifact for direction: ${directionId}`);
}

export function animateReturnArtifact(group, timeSeconds, { carried = false } = {}) {
  if (!group) return;
  if (group.name.startsWith('artifact-three-district-bypass-coil')) {
    const active = Math.floor(timeSeconds * 1.8) % 3;
    group.userData.pulseStrands?.forEach((strand, index) => strand.scale.setScalar(index === active ? 1.08 : 1));
  } else if (group.name.startsWith('artifact-common-fold')) {
    const breath = 1 + Math.sin(timeSeconds * 1.15) * 0.018;
    group.userData.paperPanels?.forEach((panel) => { panel.scale.y = breath; });
  } else if (group.name.startsWith('artifact-looking-fragment')) {
    // Restrained settle: a slow sway while carried in first person, and a
    // barely-there breathing of the warm residue when it rests displayed.
    if (carried) {
      group.rotation.z = Math.sin(timeSeconds * 1.7) * 0.025;
    } else {
      group.rotation.z = Math.sin(timeSeconds * 0.6) * 0.012;
      const glow = 0.65 + 0.25 * Math.sin(timeSeconds * 0.9);
      group.userData.residue?.forEach((seam) => { seam.material.opacity = glow; });
    }
  } else if (group.name.startsWith('artifact-mara-ordinary-morning-cassette')) {
    group.userData.reels?.forEach((reel, index) => {
      reel.rotation.z = Math.sin(timeSeconds * 0.45 + index * 0.8) * 0.025;
    });
  }
}
