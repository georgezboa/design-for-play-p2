import * as THREE from 'three';

const BRASS = 0xb18a48;
const DARK_BRASS = 0x6f5630;
const ENAMEL = 0x315e61;
const PAPER = 0xd5c9a7;

function standard(color, roughness = 0.48, metalness = 0.62) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

// A small civic-work badge shared by Echo City and the museum case. Its
// silhouette reads as a worn service credential rather than a game trophy.
export function createNightServiceBadge({ scale = 1 } = {}) {
  const group = new THREE.Group();
  group.name = 'echo-city-night-service-badge';
  group.scale.setScalar(scale);

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.24, 0.055, 24),
    standard(BRASS),
  );
  body.rotation.x = Math.PI / 2;
  body.name = 'night-badge-brass-body';
  group.add(body);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.205, 0.018, 7, 24),
    standard(DARK_BRASS, 0.56, 0.72),
  );
  rim.position.z = -0.034;
  rim.name = 'night-badge-rim';
  group.add(rim);

  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.29, 0.075, 0.025),
    standard(ENAMEL, 0.38, 0.18),
  );
  stripe.position.set(0, 0.055, -0.052);
  stripe.name = 'night-badge-enamel-stripe';
  group.add(stripe);

  for (const x of [-0.075, 0, 0.075]) {
    const punch = new THREE.Mesh(
      new THREE.CircleGeometry(0.017, 10),
      standard(PAPER, 0.72, 0.05),
    );
    punch.position.set(x, -0.085, -0.052);
    punch.name = 'night-badge-number-punch';
    group.add(punch);
  }

  return group;
}
