// Chapter 5, Record 03 — Echo City's municipal night round.
//
// Chapter 3 already asked the player to read this city as a case. This return
// is intentionally different: four small, ordinary civic duties let the
// player inhabit the same streets at night. There is no deduction, failure,
// culprit or railway puzzle here. Every action makes a persistent, visible
// change to the city and the player walks the whole way back to the museum.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { ECHO_CITY_AUTHORITY } from '../data/echoCityAuthority.js';
import {
  buildEchoCityV68World,
  ECHO_CITY_LOOKS,
  OBSTACLES,
  TUNNEL_TERRAIN,
} from '../echoCityV68/EchoCityV68World.js';
import { PLAYER } from '../config.js';
import { STATION_LAYOUT } from '../echoCityV68/city3dConfig.js';
import { mat, emissiveMat, box, label, hitProxy } from '../util/graybox.js';
import { EchoRadioChatter } from '../systems/EchoRadioChatter.js';
import { getNightPowerPresentation, rankStreetlightsByDistance } from '../systems/EchoCityNightPower.js';
import { createNightServiceBadge } from '../assets/NightServiceBadge.js';
import { loadEchoCityModel } from '../assets/EchoCityModelLoader.js';
import { CHAPTER05_DIRECTIONS } from '../directions/directionRegistry.js';
import { LevRevisitSequence } from './LevRevisitSequence.js';

const STATION_PLATFORM_TOP_Y = 1.15;
// Keep the two Echo City visits mutually exclusive. Resolve this when the
// scene is constructed (rather than once when the module is imported), so a
// hot reload or a return from another beat cannot retain the old route.
export function resolveEchoCityRoute(search = '') {
  return new URLSearchParams(search).get('lev') === '1'
    ? 'lev-revisit'
    : 'municipal-night-round';
}

export const ECHO_CITY_ENTRY = Object.freeze({
  spawn: ECHO_CITY_AUTHORITY.entrance,
  returnCase: ECHO_CITY_AUTHORITY.returnThreshold,
});

export const NIGHT_ROUND_STOPS = Object.freeze({
  kit: Object.freeze({ x: -2.8, z: 41.7 }),
  // The four duties make a full-city loop instead of clustering around the
  // old Chapter 3 encounter anchors.
  // Mounted beside the south-facing market stall so the player sees the
  // handwheel, draw ropes and canvas closure in one glance.
  market: Object.freeze({ x: -23.15, z: 3.15 }),
  fountain: Object.freeze({ x: 28.0, z: 6.6 }),
  archive: Object.freeze({ x: -9.8, z: -21.5 }),
  station: Object.freeze({ x: STATION_LAYOUT.approach[0], z: STATION_LAYOUT.approach[1] }),
});

const OPTIONAL_NIGHT_STOPS = Object.freeze({
  serviceWindow: Object.freeze({ x: -23.5, z: -6.5 }),
  tramNotice: Object.freeze({ x: 7.5, z: -12.0 }),
  standpipe: Object.freeze({ x: 26.5, z: 3.8 }),
});

const P = Object.freeze({
  sky: ECHO_CITY_LOOKS.night.sky,
  fog: ECHO_CITY_LOOKS.night.fog,
  steel: 0x424a51,
  steelLight: 0x7d8588,
  brass: 0xb18a48,
  canvas: 0x6b6550,
  paper: 0xd5c9a7,
  water: 0x5a9ca2,
  museumBlack: 0x07090d,
  dormant: 0x3f474b,
  warm: 0xffca72,
  resolved: 0x75b7ae,
  doorFrame: 0x343b3f,
  doorLeaf: 0x1c2327,
  doorInset: 0x101519,
});

const DIALOGUE = Object.freeze({
  entry: [
    { speaker: 'ARCHIVIST', text: 'I am at the museum service desk. This receiver stays on my channel while you are in the reconstruction.' },
    { speaker: 'ARCHIVIST', text: 'Echo City is still running its 9:30 p.m. municipal closing round. The station lighting circuit is off, so take the canvas kit and restore night power first.' },
    { speaker: 'ARCHIVIST', text: 'After the street lamps return, draw the final market stall curtains, restart the fountain pump, and return the public-works ledger.' },
    { speaker: 'BUTCH', text: 'So this is maintenance, not another test.' },
    { speaker: 'ARCHIVIST', text: 'Correct. Nothing here is hidden. Walk the city and finish what the night attendant would have finished.' },
  ],
  kit: [
    { speaker: 'BUTCH', text: 'One service key, one ledger, and a hand lamp. The hand lamp is barely enough to see the pavement.' },
    { speaker: 'ARCHIVIST', text: 'That is intentional. Follow the dim platform marker and open the station breaker first. The rest of the route will be easier once the street grid is back.' },
  ],
  market: [
    { speaker: 'ARCHIVIST', text: 'The last stall is covered. Vendors tied their own curtains; the night attendant checked the final row.' },
    { speaker: 'BUTCH', text: 'Someone always had to stay five minutes later.' },
  ],
  fountain: [
    { speaker: 'ARCHIVIST', text: 'Circulation restored. The pump stayed on overnight so mineral deposits did not harden in the basin.' },
    { speaker: 'BUTCH', text: 'In the daytime, people met here. At night, somebody still had to keep the water moving.' },
  ],
  archive: [
    { speaker: 'ARCHIVIST', text: 'Ledger returned and stamped. Most city records are ordinary: repairs, late keys, borrowed tools, and small mistakes.' },
    { speaker: 'BUTCH', text: 'That sounds more like a city than the museum labels do.' },
    { speaker: 'ARCHIVIST', text: 'The return slot opened a second tray. There is a night-service badge inside. Take it before you leave.' },
  ],
  badge: [
    { speaker: 'BUTCH', text: 'NIGHT SERVICE. A-17. The brass is worn where someone held it between two fingers.' },
    { speaker: 'ARCHIVIST', text: 'It belonged to the attendant whose round you just finished. The museum catalogued the work orders, but not the worker.' },
    { speaker: 'ARCHIVIST', text: 'Bring the badge back. It should be displayed with the record.' },
  ],
  station: [
    { speaker: 'ARCHIVIST', text: 'Station lamp on. The closing circuit is checking the line.' },
    { speaker: 'BUTCH', text: 'When Mara crossed Echo City, people were lowering shutters, returning books, cleaning stone, and waiting for the last car.' },
    { speaker: 'BUTCH', text: 'She was not moving through a case file. She was moving through other people’s evening.' },
  ],
  serviceWindow: [
    { speaker: 'ARCHIVIST', text: 'That was the night clerk’s service window. The last tram has gone; you can switch it off.' },
    { speaker: 'BUTCH', text: 'Someone left the light on so late passengers could still ask for help.' },
  ],
  tramNotice: [
    { speaker: 'ARCHIVIST', text: 'The timetable slipped in its frame. Set it upright for the morning crew.' },
    { speaker: 'BUTCH', text: 'There. First service at six ten. Nothing mysterious about it.' },
  ],
  standpipe: [
    { speaker: 'ARCHIVIST', text: 'That standpipe fed the fountain crew’s hose. Close it before water freezes on the pavement.' },
    { speaker: 'BUTCH', text: 'Valve closed. The drip has stopped.' },
  ],
  complete: [
    { speaker: 'ARCHIVIST', text: 'The night round is complete. The museum doorway is connected again.' },
    { speaker: 'ARCHIVIST', text: 'Walk back through the city. The four places you serviced will remain in their finished state.' },
  ],
  lockedReturn: [
    { speaker: 'ARCHIVIST', text: 'The museum doorway is offline while the closing round is open. The service kit lists the four remaining jobs.' },
  ],
});

function roundedBox(parent, {
  x = 0, y = 0, z = 0, w, h, d, radius = 0.06, segments = 3, material, name,
}) {
  const mesh = new THREE.Mesh(
    new RoundedBoxGeometry(w, h, d, segments, Math.min(radius, w / 2, h / 2, d / 2)),
    material,
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (name) mesh.name = name;
  parent.add(mesh);
  return mesh;
}

function wornHardwareMat(color, {
  emissive = 0x090806,
  emissiveIntensity = 0.42,
  roughness = 0.94,
  metalness = 0.04,
} = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity,
    roughness,
    metalness,
  });
}

function addWheel(parent, { x = 0, y = 1.15, z = -0.48, radius = 0.42, color = P.brass, name = 'service-wheel' } = {}) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.name = name;
  parent.add(group);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.055, 8, 24),
    mat(color),
  );
  ring.rotation.y = Math.PI / 2;
  group.add(ring);
  for (let i = 0; i < 4; i++) {
    const spoke = box(group, { w: 0.05, h: radius * 1.75, d: 0.05, material: mat(color), name: `${name}-spoke` });
    spoke.rotation.z = i * Math.PI / 4;
  }
  return group;
}

function remainingStops(record) {
  const names = [];
  if (!record.stationLampOn) names.push('station breaker');
  if (!record.marketShuttersLocked) names.push('market curtains');
  if (!record.fountainCirculationRestored) names.push('fountain pump');
  if (!record.archiveLedgerReturned) names.push('archive ledger');
  if (!record.nightBadgeClaimed) names.push('night-service badge');
  return names;
}

export function currentNightRoundStop(record = {}) {
  if (!record.nightKitTaken) return 'kit';
  if (!record.stationLampOn) return 'station';
  if (!record.marketShuttersLocked) return 'market';
  if (!record.fountainCirculationRestored) return 'fountain';
  if (!record.nightBadgeClaimed) return 'archive';
  return null;
}

export function nightRoundCuePresentation(elapsedSeconds = 0, active = false) {
  if (!active) return { lightIntensity: 0, colorMix: 0 };
  const wave = (Math.sin((elapsedSeconds / 2.8) * Math.PI * 2) + 1) / 2;
  return {
    // Echo City runs at a deliberately low exposure.  A two-candela cue was
    // mathematically present but visually invisible against the black street.
    // This is still a local hardware glow (4.2 m falloff), not a waypoint.
    lightIntensity: 5.8 + wave * 1.8,
    colorMix: 0.34 + wave * 0.25,
  };
}

export class EchoCityWalkingSim {
  constructor() {
    this.name = 'echo';
    this.root = new THREE.Group();
    this.root.name = 'echo-city-v68-night-round';
    this.background = new THREE.Color(P.sky);
    this.root.userData.rendererExposure = 0.20;
    this._returnLightProgress = 0;
    this._interactionCueClock = 0;
    this._streetlightBudgetClock = 0;
    this._streetlightRanks = [];
    this.interactionCueLights = new Map();
    this.route = resolveEchoCityRoute(
      typeof window !== 'undefined' ? window.location.search : '',
    );
  }

  _addInteractionCue(id, parent, {
    x = 0,
    y = 1.35,
    z = -0.55,
    color = P.warm,
    surfaceColor = 0xfff1b8,
    target = null,
  } = {}) {
    const light = new THREE.PointLight(color, 0, 4.2, 2);
    light.position.set(x, y, z);
    light.name = `night-round-${id}-breath`;
    parent.add(light);
    const materials = [];
    const targets = Array.isArray(target) ? target : [target];
    for (const cueTarget of targets) cueTarget?.traverse((object) => {
        if (!object.isMesh || !object.material?.color) return;
        object.material = object.material.clone();
        materials.push({
          material: object.material,
          baseColor: object.material.color.clone(),
          cueColor: new THREE.Color(surfaceColor),
        });
      });
    this.interactionCueLights.set(id, { light, materials });
    return light;
  }

  _replaceInteractionCueTarget(id, target, surfaceColor = 0xfff1b8) {
    const cue = this.interactionCueLights.get(id);
    if (!cue || !target) return;
    cue.materials = [];
    target.traverse((object) => {
      if (!object.isMesh || !object.material?.color) return;
      object.material = object.material.clone();
      cue.materials.push({
        material: object.material,
        baseColor: object.material.color.clone(),
        cueColor: new THREE.Color(surfaceColor),
      });
    });
  }

  build(ctx) {
    this.ctx = ctx;
    const g = this.root;
    const world = ctx.collisionWorld;
    this.radioChatter = new EchoRadioChatter({ dialogue: ctx.dialogue, audioGuide: ctx.audioGuide });

    this._worldPromise = buildEchoCityV68World({ renderer: ctx.renderer, look: 'night' }).then((city) => {
      this.cityWorld = city.root;
      this.root.add(city.root);
      this.root.userData.fog = city.root.userData.fog;
      this.root.userData.rendererExposure = city.root.userData.rendererExposure;
      this.background.setHex(city.root.userData.background);
      this._streetGridLights = [];
      this._streetGridBulbs = [];
      this._streetGridGroundPools = [];
      city.root.traverse((object) => {
        if (object.isSpotLight && object.name === 'echo-city-night-streetlight') {
          const position = object.getWorldPosition(new THREE.Vector3());
          this._streetGridLights.push({
            light: object,
            fullIntensity: object.userData.fullIntensity ?? object.intensity,
            lampIndex: object.userData.lampIndex,
            x: position.x,
            z: position.z,
          });
        } else if (object.isMesh && object.name === 'echo-city-night-streetlight-bulb') {
          this._streetGridBulbs.push(object);
        } else if (object.isMesh && object.name === 'echo-city-night-streetlight-ground-pool') {
          this._streetGridGroundPools.push(object);
        }
      });
      for (const obstacle of city.boundaryObstacles) this._addObstacleCollider(world, obstacle);
      this._addStationPlatformPhysics(world);
      return city;
    });

    for (const obstacle of [...OBSTACLES, ...TUNNEL_TERRAIN.obstacles]) this._addObstacleCollider(world, obstacle);
    const { minX, maxX, minZ, maxZ } = ECHO_CITY_AUTHORITY.bounds;
    world.addBoxFromCenterSize(minX - 0.25, (minZ + maxZ) / 2, 0.5, maxZ - minZ + 1, 'echo-west-bound');
    world.addBoxFromCenterSize(maxX + 0.25, (minZ + maxZ) / 2, 0.5, maxZ - minZ + 1, 'echo-east-bound');
    world.addBoxFromCenterSize((minX + maxX) / 2, minZ - 0.25, maxX - minX + 1, 0.5, 'echo-north-bound');
    world.addBoxFromCenterSize((minX + maxX) / 2, maxZ + 0.25, maxX - minX + 1, 0.5, 'echo-south-bound');

    this._buildReturnThreshold(g);
    if (this.route === 'lev-revisit') {
      this._buildReturnRouteLights(g);
      this.levRevisit = new LevRevisitSequence(ctx, g);
      this._dutyModelPromise = this.levRevisit.ready;
      this.root.userData.fog = new THREE.FogExp2(P.fog, ECHO_CITY_LOOKS.night.fogDensity);
      return;
    }
    this._buildNightKit(g);
    this._buildMarketDuty(g);
    this._buildFountainDuty(g);
    this._buildArchiveDuty(g);
    this._buildStationDuty(g);
    this._buildOptionalNightDetails(g);
    this._buildReturnRouteLights(g);
    this._dutyModelPromise = this._loadGeneratedDutyShells();

    this.root.userData.fog = new THREE.FogExp2(P.fog, ECHO_CITY_LOOKS.night.fogDensity);
  }

  _buildReturnThreshold(g) {
    this.returnDoor = new THREE.Group();
    this.returnDoor.position.set(ECHO_CITY_ENTRY.returnCase.x, 0, ECHO_CITY_ENTRY.returnCase.z);
    this.returnDoor.name = 'chapter-5-only-museum-return-threshold';
    g.add(this.returnDoor);
    // The route is closed during the night round, but it must still read as
    // the museum doorway—not as a black debug wall.
    this.returnPanelMaterial = new THREE.MeshBasicMaterial({ color: P.doorLeaf });
    this.returnFrameMaterial = new THREE.MeshBasicMaterial({ color: P.doorFrame });
    box(this.returnDoor, { x: 0, y: 2.18, z: 0.08, w: 4.62, h: 4.02, d: 0.16, material: emissiveMat(P.doorInset), name: 'return-recess' });
    box(this.returnDoor, { x: -1.13, y: 2.12, z: -0.035, w: 2.18, h: 3.84, d: 0.10, material: this.returnPanelMaterial, name: 'return-door-left' });
    box(this.returnDoor, { x: 1.13, y: 2.12, z: -0.035, w: 2.18, h: 3.84, d: 0.10, material: this.returnPanelMaterial, name: 'return-door-right' });
    this.returnEdgeMaterial = new THREE.MeshBasicMaterial({ color: P.dormant });
    box(this.returnDoor, { x: 0, y: 4.43, z: -0.12, w: 5.28, h: 0.34, d: 0.28, material: this.returnFrameMaterial, name: 'return-lintel' });
    box(this.returnDoor, { x: -2.47, y: 2.25, z: -0.12, w: 0.34, h: 4.52, d: 0.28, material: this.returnFrameMaterial, name: 'return-jamb-l' });
    box(this.returnDoor, { x: 2.47, y: 2.25, z: -0.12, w: 0.34, h: 4.52, d: 0.28, material: this.returnFrameMaterial, name: 'return-jamb-r' });
    box(this.returnDoor, { x: 0, y: 0.10, z: -0.28, w: 4.72, h: 0.20, d: 0.78, material: emissiveMat(P.steel), name: 'return-threshold-step' });
    box(this.returnDoor, { x: 0, y: 2.12, z: -0.12, w: 0.045, h: 3.75, d: 0.05, material: this.returnEdgeMaterial, name: 'return-door-seam' });
    for (const x of [-1.13, 1.13]) {
      box(this.returnDoor, { x, y: 2.82, z: -0.105, w: 0.86, h: 0.48, d: 0.025, material: emissiveMat(0x514533), name: 'return-door-window' });
      box(this.returnDoor, { x: x + (x < 0 ? 0.62 : -0.62), y: 1.72, z: -0.16, w: 0.08, h: 0.34, d: 0.07, material: emissiveMat(P.brass), name: 'return-door-handle' });
    }
    this.returnStatusLight = box(this.returnDoor, { x: 2.12, y: 3.72, z: -0.18, w: 0.12, h: 0.12, d: 0.06, material: emissiveMat(P.dormant), name: 'return-status-lamp' });
    this.returnLockedLabel = label(this.returnDoor, 'MUSEUM RETURN  /  NIGHT ROUND OPEN', { x: 0, y: 4.14, z: -0.275, w: 3.65, h: 0.38, fg: '#d7cfbb', bg: '#171d20', font: 'bold 28px "Courier New", monospace' });
    this.returnOpenLabel = label(this.returnDoor, 'MUSEUM RETURN  /  ROUTE CONNECTED', { x: 0, y: 4.14, z: -0.285, w: 3.65, h: 0.38, fg: '#182124', bg: '#d9bd78', font: 'bold 28px "Courier New", monospace' });
    this.returnOpenLabel.visible = false;
    hitProxy(this.returnDoor, { x: 0, y: 2.2, z: -0.45, w: 5.2, h: 4.5, d: 1.2, name: 'return-proxy' });
  }

  _buildNightKit(g) {
    const { x, z } = NIGHT_ROUND_STOPS.kit;
    this.nightKit = new THREE.Group();
    this.nightKit.position.set(x, 0, z);
    this.nightKit.name = 'municipal-night-round-kit';
    g.add(this.nightKit);
    this.nightKitFallback = new THREE.Group();
    this.nightKitFallback.name = 'night-kit-procedural-fallback';
    this.nightKit.add(this.nightKitFallback);
    this.nightKitCueHardware = [];
    this.nightKitTakeVisual = 0;
    this.nightKitBaseY = 0;
    // A low cast-iron service tray and a soft, wide canvas satchel.  The former
    // generated shell was a single pale rectangular mesh: it could not open,
    // and its clean block silhouette did not belong to Echo City's worn civic
    // hardware.  This replacement is deliberately assembled from independent
    // cloth, leather and brass parts so the pickup has a readable mechanism.
    this.nightKitServiceTray = box(this.nightKit, {
      x: 0,
      y: 0.055,
      z: 0.02,
      w: 1.72,
      h: 0.11,
      d: 0.72,
      material: mat(0x1c2325),
      name: 'night-kit-service-tray',
    });
    box(this.nightKit, { x: 0, y: 0.13, z: 0.33, w: 1.52, h: 0.045, d: 0.045, material: mat(0x786242), name: 'night-kit-tray-edge' });

    // Warm municipal olive, brown leather and oxidised brass borrow the city's
    // amber/brown material family.  The previous blue-grey read like a clean
    // modern toolbox pasted into the reconstruction.
    const canvasMaterial = wornHardwareMat(0x3a392e, { emissive: 0x0b0a07, emissiveIntensity: 0.55 });
    const canvasHighlight = wornHardwareMat(0x514d3b, { emissive: 0x0c0a06, emissiveIntensity: 0.52 });
    const leatherMaterial = wornHardwareMat(0x33231b, { emissive: 0x090504, emissiveIntensity: 0.48 });
    const agedBrass = wornHardwareMat(0x8a7042, { emissive: 0x160f05, emissiveIntensity: 0.62, metalness: 0.28 });
    roundedBox(this.nightKitFallback, {
      x: 0, y: 0.55, z: 0, w: 1.46, h: 0.84, d: 0.58,
      radius: 0.11, material: canvasMaterial, name: 'night-kit-canvas-body',
    });
    // Canvas gussets break the toy-like cuboid silhouette and catch the same
    // narrow amber highlights as the surrounding tram and street furniture.
    for (const x of [-0.66, 0.66]) {
      roundedBox(this.nightKitFallback, {
        x, y: 0.50, z: 0, w: 0.12, h: 0.66, d: 0.54,
        radius: 0.045, material: canvasHighlight, name: 'night-kit-side-gusset',
      });
    }

    this.nightKitFlapPivot = new THREE.Group();
    this.nightKitFlapPivot.position.set(0, 0.88, 0.28);
    this.nightKitFallback.add(this.nightKitFlapPivot);
    this.nightKitFlap = roundedBox(this.nightKitFlapPivot, {
      x: 0, y: -0.23, z: 0, w: 1.34, h: 0.50, d: 0.075,
      radius: 0.055, material: canvasHighlight, name: 'night-kit-hinged-flap',
    });
    // The reveal needs an actual interior.  These parts stay tucked behind the
    // flap while closed and become readable during the one-second opening.
    this.nightKitInterior = roundedBox(this.nightKitFallback, {
      x: 0, y: 0.77, z: 0.255, w: 1.16, h: 0.18, d: 0.08,
      radius: 0.025, material: mat(0x111719), name: 'night-kit-interior-lining',
    });
    this.nightKitLedger = roundedBox(this.nightKitFallback, {
      x: -0.25, y: 0.79, z: 0.31, w: 0.42, h: 0.12, d: 0.045,
      radius: 0.012, material: mat(0x8c8065), name: 'night-kit-folded-ledger',
    });
    this.nightKitServiceKey = roundedBox(this.nightKitFallback, {
      x: 0.16, y: 0.79, z: 0.32, w: 0.30, h: 0.055, d: 0.04,
      radius: 0.012, material: agedBrass, name: 'night-kit-service-key',
    });
    for (const x of [-0.42, 0.42]) {
      roundedBox(this.nightKitFlapPivot, {
        x, y: -0.27, z: 0.052, w: 0.095, h: 0.43, d: 0.035,
        radius: 0.018, material: leatherMaterial, name: 'night-kit-leather-strap',
      });
      const clasp = roundedBox(this.nightKitFlapPivot, {
        x, y: -0.40, z: 0.075, w: 0.16, h: 0.11, d: 0.045,
        radius: 0.018, material: agedBrass, name: 'night-kit-aged-clasp',
      });
      this.nightKitCueHardware.push(clasp);
    }

    this.nightKitHandle = new THREE.Group();
    this.nightKitHandle.position.set(0, 0.98, 0);
    this.nightKitFallback.add(this.nightKitHandle);
    for (const x of [-0.38, 0.38]) roundedBox(this.nightKitHandle, {
      x, y: 0.10, z: 0, w: 0.075, h: 0.30, d: 0.09,
      radius: 0.025, material: leatherMaterial, name: 'night-kit-handle-post',
    });
    this.nightKitHandleGrip = roundedBox(this.nightKitHandle, {
      x: 0, y: 0.25, z: 0, w: 0.82, h: 0.095, d: 0.11,
      radius: 0.04, material: leatherMaterial, name: 'night-kit-handle-grip',
    });
    this.nightKitHandLamp = roundedBox(this.nightKitFallback, {
      x: 0.54, y: 0.58, z: 0.33, w: 0.13, h: 0.28, d: 0.09,
      radius: 0.025, material: agedBrass, name: 'night-kit-hand-lamp',
    });
    this.nightKitCueHardware.push(this.nightKitHandleGrip, this.nightKitHandLamp);
    label(this.nightKitFallback, 'NIGHT SERVICE  /  A-17', {
      x: 0, y: 0.55, z: -0.306, w: 0.58, h: 0.16,
      fg: '#b6aa8e', bg: '#202a2e', font: 'bold 22px "Courier New", monospace',
    });
    this._addInteractionCue('kit', this.nightKit, {
      x: 0.50,
      y: 1.05,
      z: -0.38,
      surfaceColor: 0x6f7f78,
      target: this.nightKitCueHardware,
    });
    hitProxy(this.nightKit, { x: 0, y: 0.66, z: 0, w: 1.9, h: 1.45, d: 1.15, name: 'night-kit-proxy' });
  }

  _buildMarketDuty(g) {
    const { x, z } = NIGHT_ROUND_STOPS.market;
    this.marketControl = new THREE.Group();
    this.marketControl.position.set(x, 0, z);
    this.marketControl.name = 'market-shutter-service-winch';
    g.add(this.marketControl);
    box(this.marketControl, { x: 0, y: 1.1, z: 0, w: 0.66, h: 2.2, d: 0.48, material: mat(P.steel), name: 'market-crank-stand' });
    this.marketWheel = addWheel(this.marketControl, { y: 1.2, radius: 0.38, name: 'market-crank-wheel' });
    this.marketPawl = box(this.marketControl, { x: 0.46, y: 1.83, z: -0.33, w: 0.18, h: 0.58, d: 0.12, material: emissiveMat(P.brass), name: 'market-shutter-pawl' });
    this.marketWheelBaseQuaternion = this.marketWheel.quaternion.clone();
    this.marketWheelSpinAxis = new THREE.Vector3(1, 0, 0);
    this.marketWheelSpin = 0;
    this.marketWheelTarget = 0;
    this.marketWheelStartSpin = 0;
    this.marketWheelTurnStartMs = globalThis.performance.now();
    this.marketWheelSpinQuaternion = new THREE.Quaternion();
    this._addInteractionCue('market', this.marketControl, { y: 1.25, z: -0.62, target: this.marketPawl });
    hitProxy(this.marketControl, { y: 1.15, w: 1.5, h: 2.4, d: 1.2, name: 'market-crank-proxy' });

    this.marketWorkLight = new THREE.PointLight(0xffc66d, 0, 8, 2);
    this.marketWorkLight.position.set(x - 2.4, 2.7, z);
    g.add(this.marketWorkLight);

    // The produce stall has fabric curtains, not an implausible metal shutter.
    // In the open state they bunch into narrow folds at the posts rather than
    // reading as two free-standing boards.
    const curtainMaterial = new THREE.MeshStandardMaterial({
      color: 0x504a3d,
      emissive: 0x0d0905,
      emissiveIntensity: 0.18,
      roughness: 1,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    this.marketCurtains = [-1, 1].map((side, curtainIndex) => {
      const curtain = new THREE.Group();
      curtain.position.set(-20 + side * 1.42, 1.3, 2.06);
      curtain.name = `market-stall-canvas-curtain-${curtainIndex}`;
      g.add(curtain);
      roundedBox(curtain, {
        y: 0, w: 1.52, h: 1.48, d: 0.055, radius: 0.025,
        material: curtainMaterial,
        name: `market-canvas-panel-${curtainIndex}`,
      });
      for (let fold = -2; fold <= 2; fold++) roundedBox(curtain, {
        x: fold * 0.26,
        y: 0,
        z: -0.035,
        w: 0.035,
        h: 1.32,
        d: 0.025,
        radius: 0.01,
        material: wornHardwareMat(0x716957, { metalness: 0, emissiveIntensity: 0.12 }),
        name: `market-canvas-fold-${curtainIndex}-${fold + 2}`,
      });
      roundedBox(curtain, {
        x: -side * 0.58, y: -0.05, z: -0.085,
        w: 0.07, h: 1.2, d: 0.045, radius: 0.014,
        material: wornHardwareMat(0x9b7d45, { metalness: 0.08, emissiveIntensity: 0.24 }),
        name: `market-curtain-draw-rope-${curtainIndex}`,
      });
      curtain.userData.openX = -20 + side * 1.42;
      curtain.userData.closedX = -20 + side * 0.78;
      curtain.userData.openScaleX = 0.14;
      curtain.userData.closedScaleX = 1;
      curtain.scale.x = curtain.userData.openScaleX;
      return curtain;
    });

    // A visible rope ties the handwheel to the curtain header. The player can
    // follow control → rope → fabric without turning away from the result.
    const ropeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x, 1.78, z),
      new THREE.Vector3(x + 0.55, 2.8, z - 0.05),
      new THREE.Vector3(-22.15, 3.05, 2.22),
      new THREE.Vector3(-20, 3.05, 2.22),
    ]);
    const rope = new THREE.Mesh(
      new THREE.TubeGeometry(ropeCurve, 20, 0.025, 6, false),
      new THREE.MeshStandardMaterial({ color: 0x5b4b36, roughness: 0.94, metalness: 0.02 }),
    );
    rope.name = 'market-curtain-winch-rope';
    rope.castShadow = true;
    g.add(rope);
  }

  _buildFountainDuty(g) {
    const { x, z } = NIGHT_ROUND_STOPS.fountain;
    this.fountainControl = new THREE.Group();
    this.fountainControl.position.set(x, 0, z);
    this.fountainControl.name = 'fountain-circulation-pump';
    g.add(this.fountainControl);
    this.fountainFallback = new THREE.Group();
    this.fountainFallback.name = 'fountain-procedural-fallback';
    this.fountainControl.add(this.fountainFallback);
    box(this.fountainFallback, { x: 0, y: 0.75, z: 0, w: 1.25, h: 1.5, d: 0.72, material: mat(P.steel), name: 'pump-cabinet' });
    // The Hunyuan cabinet is the stationary shell. Keep one articulated civic
    // handwheel outside the fallback group so it remains visible and animated
    // after the generated shell replaces the placeholder cabinet.
    this.fountainWheel = addWheel(this.fountainControl, { y: 0.92, z: -0.43, radius: 0.34, color: 0x8f7040, name: 'fountain-pump-service-wheel' });
    this.fountainDebris = new THREE.Group();
    this.fountainDebris.position.set(0, 0.28, -0.44);
    this.fountainControl.add(this.fountainDebris);
    for (const x of [-0.28, 0, 0.28]) box(this.fountainDebris, { x, w: 0.18, h: 0.08, d: 0.08, material: emissiveMat(0x82704c), name: 'pump-grate-debris' });
    this._addInteractionCue('fountain', this.fountainControl, { y: 1.0, z: -0.72, color: 0xd7ba78, target: this.fountainWheel });
    hitProxy(this.fountainControl, { y: 1.0, w: 1.8, h: 2.1, d: 1.4, name: 'fountain-pump-proxy' });

    this.fountainWater = new THREE.Group();
    this.fountainWater.position.set(20, 0, 0);
    g.add(this.fountainWater);
    const waterMat = new THREE.MeshBasicMaterial({ color: 0x6dbfc4, transparent: true, opacity: 0, depthWrite: false });
    for (let i = 0; i < 5; i++) {
      const angle = i / 5 * Math.PI * 2;
      const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.065, 0.82 + (i % 2) * 0.14, 10), waterMat);
      jet.position.set(Math.cos(angle) * 0.58, 1.28 + (i % 2) * 0.06, Math.sin(angle) * 0.58);
      jet.rotation.z = Math.cos(angle) * 0.13;
      jet.rotation.x = Math.sin(angle) * 0.13;
      this.fountainWater.add(jet);
    }
    this.fountainRipples = [];
    for (let i = 0; i < 3; i++) {
      const rippleMaterial = waterMat.clone();
      const ripple = new THREE.Mesh(new THREE.RingGeometry(0.78 + i * 0.48, 0.84 + i * 0.48, 40), rippleMaterial);
      ripple.rotation.x = -Math.PI / 2;
      ripple.position.y = 0.32 + i * 0.006;
      this.fountainWater.add(ripple);
      this.fountainRipples.push(ripple);
    }
    this.fountainWaterMaterial = waterMat;
    this.fountainLight = new THREE.PointLight(0x72b8bc, 0, 10, 2);
    this.fountainLight.position.set(20, 1.2, 0);
    g.add(this.fountainLight);
  }

  _buildArchiveDuty(g) {
    const { x, z } = NIGHT_ROUND_STOPS.archive;
    this.archiveSlot = new THREE.Group();
    this.archiveSlot.position.set(x, 0, z);
    this.archiveSlot.name = 'archive-night-return-slot';
    g.add(this.archiveSlot);
    this.archiveFallback = new THREE.Group();
    this.archiveFallback.name = 'archive-procedural-fallback';
    this.archiveSlot.add(this.archiveFallback);
    box(this.archiveFallback, { x: 0, y: 1.0, z: 0, w: 1.8, h: 2.0, d: 0.7, material: mat(P.steel), name: 'archive-slot-body' });
    box(this.archiveFallback, { x: 0, y: 1.28, z: -0.38, w: 1.15, h: 0.18, d: 0.08, material: mat(P.museumBlack), name: 'archive-return-mouth' });
    this.archiveSlotCover = box(this.archiveFallback, { x: 0, y: 1.28, z: -0.44, w: 1.28, h: 0.42, d: 0.08, material: emissiveMat(P.steelLight), name: 'archive-return-cover' });
    this.archiveSlotLock = box(this.archiveFallback, { x: 0.46, y: 1.28, z: -0.50, w: 0.12, h: 0.16, d: 0.05, material: emissiveMat(P.brass), name: 'archive-return-lock' });
    this.archiveLedger = box(this.archiveSlot, { x: 0, y: 0.78, z: -0.52, w: 0.92, h: 0.58, d: 0.10, material: mat(P.paper), name: 'public-works-ledger' });
    this.archiveBadgeTray = box(this.archiveSlot, { x: 0, y: 0.42, z: 0.05, w: 0.86, h: 0.10, d: 0.58, material: mat(P.museumBlack), name: 'night-badge-tray' });
    this.nightServiceBadge = createNightServiceBadge({ scale: 1.05 });
    this.nightServiceBadge.position.set(0, 0.52, -0.30);
    this.archiveSlot.add(this.nightServiceBadge);
    this._addInteractionCue('archive', this.archiveSlot, { y: 1.32, z: -0.72, color: 0xd7ba78, target: this.archiveSlotLock });
    this.archiveSlotLight = new THREE.PointLight(0x75b7ae, 0, 5, 2);
    this.archiveSlotLight.position.set(x, 1.4, z - 0.8);
    g.add(this.archiveSlotLight);
    hitProxy(this.archiveSlot, { y: 1.1, w: 2.4, h: 2.5, d: 1.5, name: 'archive-slot-proxy' });
  }

  _buildStationDuty(g) {
    const { x, z } = NIGHT_ROUND_STOPS.station;
    this.stationControl = new THREE.Group();
    this.stationControl.position.set(x, 0, z);
    this.stationControl.name = 'station-night-power-switch';
    g.add(this.stationControl);
    this.stationFallback = new THREE.Group();
    this.stationFallback.name = 'station-procedural-fallback';
    this.stationControl.add(this.stationFallback);
    const iron = wornHardwareMat(0x24221e, { emissive: 0x060504, emissiveIntensity: 0.45, metalness: 0.20 });
    const ironEdge = wornHardwareMat(0x3a352d, { emissive: 0x080604, emissiveIntensity: 0.46, metalness: 0.24 });
    const porcelain = wornHardwareMat(0x827964, { emissive: 0x100e09, emissiveIntensity: 0.36 });
    const agedBrass = wornHardwareMat(0x80683d, { emissive: 0x140d04, emissiveIntensity: 0.58, metalness: 0.34 });
    roundedBox(this.stationFallback, {
      x: 0, y: 0.92, z: 0, w: 1.18, h: 1.84, d: 0.68,
      radius: 0.055, material: iron, name: 'station-switch-cast-iron-box',
    });
    // Recess and ceramic fuse blocks remain visible after the door swings
    // open, making the first E press legible before the second switch action.
    roundedBox(this.stationFallback, {
      x: 0, y: 1.02, z: -0.36, w: 0.94, h: 1.30, d: 0.08,
      radius: 0.035, material: mat(0x101619), name: 'station-panel-recess',
    });
    for (const y of [1.31, 0.78]) {
      roundedBox(this.stationFallback, {
        x: -0.24, y, z: -0.43, w: 0.22, h: 0.22, d: 0.08,
        radius: 0.035, material: porcelain, name: 'station-porcelain-fuse',
      });
    }
    this.stationSwitchPivot = new THREE.Group();
    this.stationSwitchPivot.position.set(0.21, 0.98, -0.47);
    this.stationFallback.add(this.stationSwitchPivot);
    this.stationKey = roundedBox(this.stationSwitchPivot, {
      x: 0, y: 0.15, z: 0, w: 0.13, h: 0.52, d: 0.11,
      radius: 0.028, material: agedBrass, name: 'station-knife-switch',
    });
    roundedBox(this.stationSwitchPivot, {
      x: 0, y: -0.15, z: 0, w: 0.25, h: 0.16, d: 0.09,
      radius: 0.035, material: porcelain, name: 'station-switch-base',
    });

    this.stationDoorHinge = new THREE.Group();
    this.stationDoorOpenVisual = 0;
    this.stationDoorHinge.position.set(-0.49, 1.02, -0.43);
    this.stationFallback.add(this.stationDoorHinge);
    this.stationPanelCover = roundedBox(this.stationDoorHinge, {
      x: 0.49, y: 0, z: 0, w: 0.98, h: 1.34, d: 0.095,
      radius: 0.045, material: ironEdge, name: 'station-hinged-breaker-door',
    });
    for (const y of [-0.49, 0.49]) roundedBox(this.stationDoorHinge, {
      x: 0.03, y, z: 0.02, w: 0.09, h: 0.22, d: 0.13,
      radius: 0.025, material: agedBrass, name: 'station-door-hinge',
    });
    this.stationDoorHandle = roundedBox(this.stationDoorHinge, {
      x: 0.84, y: 0, z: -0.09, w: 0.10, h: 0.32, d: 0.10,
      radius: 0.025, material: agedBrass, name: 'station-door-handle',
    });
    label(this.stationPanelCover, 'NIGHT\nLIGHTING', {
      x: 0, y: 0.16, z: -0.052, w: 0.47, h: 0.28,
      fg: '#b8ad92', bg: '#252e31', font: 'bold 22px "Courier New", monospace',
    });
    this._addInteractionCue('station', this.stationControl, { y: 1.08, z: -0.72, target: this.stationKey });
    hitProxy(this.stationControl, { y: 1.05, w: 1.8, h: 2.4, d: 1.4, name: 'station-switch-proxy' });

    this.stationLamp = new THREE.Group();
    this.stationLamp.position.set(STATION_LAYOUT.center[0], STATION_PLATFORM_TOP_Y, STATION_LAYOUT.center[1]);
    g.add(this.stationLamp);
    box(this.stationLamp, { x: 0, y: 2.2, z: 0, w: 0.12, h: 4.4, d: 0.12, material: mat(P.steel), name: 'station-lamp-post' });
    this.stationLampHead = box(this.stationLamp, { x: 0, y: 4.28, z: 0, w: 0.72, h: 0.2, d: 0.42, material: emissiveMat(P.dormant), name: 'station-lamp-head' });
    this.stationPointLight = new THREE.PointLight(0xffc36b, 0, 18, 1.7);
    this.stationPointLight.position.set(0, 3.9, 0);
    this.stationLamp.add(this.stationPointLight);
    this.stationEmergencyMarker = box(this.stationFallback, {
      x: 0.34, y: 1.62, z: -0.43, w: 0.12, h: 0.12, d: 0.06,
      material: emissiveMat(0xd96b42), name: 'station-emergency-marker',
    });
    this.stationEmergencyLight = new THREE.PointLight(0xd96b42, 0, 4.5, 2);
    this.stationEmergencyLight.position.set(0.34, 1.62, -0.72);
    this.stationControl.add(this.stationEmergencyLight);
  }

  _buildOptionalNightDetails(g) {
    // Optional closing-round details. They are deliberately quieter than the
    // four required duties and never gate the badge or museum return.
    const windowStop = OPTIONAL_NIGHT_STOPS.serviceWindow;
    this.serviceWindow = new THREE.Group();
    this.serviceWindow.position.set(windowStop.x, 0, windowStop.z);
    this.serviceWindow.name = 'optional-night-clerk-window';
    g.add(this.serviceWindow);
    box(this.serviceWindow, { y: 1.05, w: 1.9, h: 2.1, d: 0.34, material: mat(0x283336), name: 'service-window-cast-iron-frame' });
    box(this.serviceWindow, { y: 1.18, z: -0.2, w: 1.45, h: 1.15, d: 0.06, material: mat(0x13191b), name: 'service-window-recess' });
    this.serviceWindowGlowMaterial = new THREE.MeshBasicMaterial({ color: 0xd8aa61, transparent: true, opacity: 0.72 });
    box(this.serviceWindow, { y: 1.18, z: -0.24, w: 1.28, h: 0.98, d: 0.025, material: this.serviceWindowGlowMaterial, name: 'service-window-warm-glass' });
    this.serviceWindowShade = box(this.serviceWindow, { y: 1.83, z: -0.28, w: 1.36, h: 0.12, d: 0.04, material: mat(0x405154), name: 'service-window-roller-shade' });
    box(this.serviceWindow, { y: 0.17, z: -0.2, w: 2.05, h: 0.22, d: 0.54, material: mat(0x343f40), name: 'service-window-ground-plinth' });
    this.serviceWindowLight = new THREE.PointLight(0xffbd6a, 7, 6.5, 2);
    this.serviceWindowLight.position.set(0, 1.45, -0.7);
    this.serviceWindow.add(this.serviceWindowLight);
    hitProxy(this.serviceWindow, { y: 1.1, z: -0.48, w: 2.2, h: 2.3, d: 1.1, name: 'service-window-proxy' });

    const noticeStop = OPTIONAL_NIGHT_STOPS.tramNotice;
    this.tramNotice = new THREE.Group();
    this.tramNotice.position.set(noticeStop.x, 0, noticeStop.z);
    this.tramNotice.name = 'optional-crooked-tram-notice';
    g.add(this.tramNotice);
    box(this.tramNotice, { y: 1.15, w: 0.10, h: 2.3, d: 0.10, material: mat(0x283335), name: 'tram-notice-post' });
    box(this.tramNotice, { y: 0.08, w: 0.72, h: 0.16, d: 0.48, material: mat(0x343f40), name: 'tram-notice-foot' });
    this.tramNoticeBoard = new THREE.Group();
    this.tramNoticeBoard.position.set(0, 2.05, -0.02);
    this.tramNoticeBoard.rotation.z = 0.16;
    this.tramNotice.add(this.tramNoticeBoard);
    box(this.tramNoticeBoard, { w: 1.25, h: 0.78, d: 0.10, material: mat(0x314044), name: 'tram-notice-enamel-frame' });
    label(this.tramNoticeBoard, 'FIRST  06:10\nLAST   23:04', { y: 0, z: -0.065, w: 1.05, h: 0.57, fg: '#342c21', bg: '#c8b98f', font: 'bold 32px "Courier New", monospace' });
    this.tramNoticeLampMaterial = new THREE.MeshBasicMaterial({ color: 0x49443a });
    this.tramNoticeLamp = box(this.tramNotice, { x: 0, y: 2.62, z: -0.02, w: 0.38, h: 0.12, d: 0.24, material: this.tramNoticeLampMaterial, name: 'tram-notice-lamp' });
    this.tramNoticeLight = new THREE.PointLight(0xffc36b, 0, 4.5, 2);
    this.tramNoticeLight.position.set(0, 2.45, -0.45);
    this.tramNotice.add(this.tramNoticeLight);
    hitProxy(this.tramNotice, { y: 1.6, z: -0.35, w: 1.8, h: 3.0, d: 1.0, name: 'tram-notice-proxy' });

    const pipeStop = OPTIONAL_NIGHT_STOPS.standpipe;
    this.standpipe = new THREE.Group();
    this.standpipe.position.set(pipeStop.x, 0, pipeStop.z);
    this.standpipe.name = 'optional-leaking-standpipe';
    g.add(this.standpipe);
    box(this.standpipe, { y: 0.65, w: 0.42, h: 1.3, d: 0.42, material: mat(0x2d3b3c), name: 'standpipe-cast-iron-body' });
    box(this.standpipe, { y: 0.08, w: 0.82, h: 0.16, d: 0.82, material: mat(0x394646), name: 'standpipe-ground-foot' });
    box(this.standpipe, { x: 0.34, y: 0.92, w: 0.48, h: 0.16, d: 0.16, material: mat(0x6f5a35), name: 'standpipe-spout' });
    this.standpipeWheel = addWheel(this.standpipe, { y: 1.36, z: -0.28, radius: 0.28, color: 0x826a3d, name: 'standpipe-handwheel' });
    this.standpipeDrip = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), new THREE.MeshBasicMaterial({ color: 0x6bafb3 }));
    this.standpipeDrip.position.set(0.57, 0.72, 0);
    this.standpipe.add(this.standpipeDrip);
    this.standpipePuddleMaterial = new THREE.MeshBasicMaterial({ color: 0x31575a, transparent: true, opacity: 0.42, depthWrite: false });
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.62, 24), this.standpipePuddleMaterial);
    puddle.rotation.x = -Math.PI / 2;
    puddle.position.set(0.46, 0.012, 0.08);
    puddle.name = 'standpipe-wet-pavement';
    this.standpipe.add(puddle);
    hitProxy(this.standpipe, { y: 0.9, z: -0.32, w: 1.5, h: 2.0, d: 1.2, name: 'standpipe-proxy' });
  }

  _buildReturnRouteLights(g) {
    this.returnRouteLights = [
      [-5.3, 31.5],
      [-4.0, 35.0],
      [-2.5, 38.5],
      [-1.1, 42.0],
      [0, 45.0],
    ].map(([x, z], index) => {
      const marker = new THREE.Group();
      marker.position.set(x, 0, z);
      g.add(marker);
      const head = box(marker, { x: 0, y: 0.08, z: 0, w: 0.42, h: 0.05, d: 0.42, material: emissiveMat(P.dormant), name: `return-route-light-${index}` });
      const light = new THREE.PointLight(0xffc36b, 0, 7, 2);
      light.position.set(0, 0.32, 0);
      marker.add(light);
      return { marker, head, light };
    });
  }

  _hideProceduralShell(parent, names) {
    const hiddenNames = new Set(names);
    parent.traverse((object) => {
      if (hiddenNames.has(object.name)) object.visible = false;
    });
  }

  async _installGeneratedShell({ id, parent, target, rotation, hide = [], position = [0, 0, 0] }) {
    try {
      const model = await loadEchoCityModel(id, { target, rotation });
      this._hideProceduralShell(parent, hide);
      // fitObjectToDimensions already offsets the source around its authored
      // pivot. Add the placement delta instead of replacing that correction.
      model.position.add(new THREE.Vector3(...position));
      parent.add(model);
      // InteractionSystem stamps the procedural group before these async GLBs
      // finish loading.  Propagate that identity to the late-arriving shell so
      // the replacement stays raycastable instead of becoming visible scenery.
      const interactableId = parent.userData.interactableId;
      if (interactableId) {
        model.traverse((object) => {
          object.userData.interactableId = interactableId;
        });
      }
      return model;
    } catch (error) {
      console.warn(`Echo City generated model fallback: ${id}`, error);
      return null;
    }
  }

  _loadGeneratedDutyShells() {
    const ledgerFallback = this.archiveLedger;
    return Promise.allSettled([
      // The generated kit and breaker box were single, sealed meshes. They
      // could be recolored but not opened, and their clean cuboid silhouettes
      // clashed with Echo City's worn civic hardware. Their articulated local
      // replacements above are the deliberate runtime assets.
      this._installMarketShutterAssembly(),
      this._installGeneratedShell({
        id: 'fountainPumpCabinet',
        parent: this.fountainControl,
        target: { x: 1.25, y: 1.5, z: 0.72 },
      }).then((model) => {
        if (!model) return;
        this.fountainFallback.visible = false;
        this._replaceInteractionCueTarget('fountain', model, 0xffd58a);
      }),
      this._installGeneratedShell({
        id: 'archiveNightReturn',
        parent: this.archiveSlot,
        target: { x: 1.8, y: 2.0, z: 0.7 },
      }).then((model) => {
        if (!model) return;
        this.archiveFallback.visible = false;
        this._replaceInteractionCueTarget('archive', model, 0xffd58a);
      }),
      this._installGeneratedShell({
        id: 'publicWorksLedger',
        parent: this.archiveSlot,
        target: { x: 0.92, y: 0.58, z: 0.10 },
        rotation: { x: -Math.PI / 2 },
        hide: ['public-works-ledger'],
        position: [0, 0.49, -0.52],
      }).then((model) => {
        if (model) this.archiveLedger = model;
        else this.archiveLedger = ledgerFallback;
      }),
    ]);
  }

  async _installMarketShutterAssembly() {
    try {
      const [pedestal, controls] = await Promise.all([
        loadEchoCityModel('marketShutterPedestal', {
          target: { x: 0.86, y: 2.18, z: 0.66 },
        }),
        loadEchoCityModel('marketShutterControls', {
          target: { x: 1.18, y: 0.94, z: 0.54 },
        }),
      ]);

      pedestal.name = 'market-shutter-pedestal-gearbox-v2';
      controls.name = 'market-shutter-handwheel-pawl-v2';
      controls.position.add(new THREE.Vector3(0.14, 0.83, -0.38));
      this.marketControl.add(pedestal, controls);

      const handwheel = controls.getObjectByName('HANDWHEEL');
      const pawl = controls.getObjectByName('PAWL');
      if (!handwheel || !pawl) throw new Error('Runtime handwheel GLB is missing HANDWHEEL or PAWL nodes');

      this._hideProceduralShell(this.marketControl, [
        'market-crank-stand',
        'market-crank-wheel',
        'market-crank-wheel-spoke',
        'market-shutter-pawl',
      ]);
      this.marketWheel = handwheel;
      this.marketPawl = pawl;
      // The authored handwheel is already rotated 90 degrees around X so its
      // local Y axis is the horizontal axle. Preserve that authored pose and
      // compose one complete turn around the axle; changing Euler Z directly
      // tips the wheel edge-on instead of winding it.
      this.marketWheelBaseQuaternion = handwheel.quaternion.clone();
      this.marketWheelSpinAxis = new THREE.Vector3(0, 1, 0);
      this.marketWheelSpin = 0;
      this.marketWheelSpinQuaternion = new THREE.Quaternion();
      this.marketPawlBaseRotation = pawl.rotation.z;
      this._replaceInteractionCueTarget('market', pawl);

      const interactableId = this.marketControl.userData.interactableId;
      if (interactableId) {
        for (const model of [pedestal, controls]) model.traverse((object) => {
          object.userData.interactableId = interactableId;
        });
      }
      return { pedestal, controls };
    } catch (error) {
      console.warn('Echo City generated model fallback: market shutter winch assembly', error);
      return null;
    }
  }

  _addStationPlatformPhysics(world) {
    const rotationY = THREE.MathUtils.degToRad(STATION_LAYOUT.rotationY);
    const [width, depth] = STATION_LAYOUT.platformSize;
    const [centerX, centerZ] = STATION_LAYOUT.center;
    world.addOrientedBoxFromCenterSize(centerX, centerZ, width, depth, rotationY, 'night-platform-deck', { minY: 0, maxY: STATION_PLATFORM_TOP_Y });
    world.addWalkSurface({ centerX, centerZ, width, depth, rotationY, topY: STATION_PLATFORM_TOP_Y, id: 'night-platform-deck' });
  }

  _addObstacleCollider(world, obstacle) {
    const vertical = obstacle.height == null ? {} : { minY: obstacle.minY ?? 0, maxY: (obstacle.minY ?? 0) + obstacle.height };
    if (obstacle.type === 'circle') {
      world.addCircle(
        obstacle.center[0],
        obstacle.center[1],
        obstacle.radius + (obstacle.padding || 0),
        obstacle.sourceId || obstacle.id,
        vertical,
      );
      return;
    }
    world.addOrientedBoxFromCenterSize(
      obstacle.center[0],
      obstacle.center[1],
      obstacle.size[0] + (obstacle.padding || 0) * 2,
      obstacle.size[1] + (obstacle.padding || 0) * 2,
      THREE.MathUtils.degToRad(obstacle.rotationY || 0),
      obstacle.sourceId || obstacle.id,
      vertical,
    );
  }

  prepare() { return Promise.all([this._worldPromise, this._dutyModelPromise]); }

  _updateStreetlightField(dt, power) {
    const lights = this._streetGridLights ?? [];
    if (!lights.length) return;

    this._streetlightBudgetClock -= dt;
    if (this._streetlightBudgetClock <= 0 || this._streetlightRanks.length !== lights.length) {
      this._streetlightBudgetClock = 0.28;
      this._streetlightRanks = rankStreetlightsByDistance(this.ctx.controller.position, lights);
    }

    const rankByIndex = new Map(this._streetlightRanks.map((lightIndex, rank) => [lightIndex, rank]));
    for (let index = 0; index < lights.length; index++) {
      const entry = lights[index];
      const rank = rankByIndex.get(index) ?? Number.POSITIVE_INFINITY;
      const active = power.powered && rank < power.activePoolCount;
      const castsShadow = active && rank < power.shadowCasterCount;
      entry.light.visible = active;
      entry.light.intensity = active
        ? THREE.MathUtils.damp(entry.light.intensity, entry.fullIntensity * power.streetlightFactor, 4, dt)
        : 0;
      if (entry.light.castShadow !== castsShadow) {
        entry.light.castShadow = castsShadow;
        entry.light.shadow.needsUpdate = castsShadow;
      }
    }

    for (const bulb of this._streetGridBulbs ?? []) {
      if ('emissiveIntensity' in bulb.material) {
        bulb.material.emissiveIntensity = THREE.MathUtils.damp(
          bulb.material.emissiveIntensity,
          power.bulbIntensity,
          power.powered ? 3.2 : 7,
          dt,
        );
      }
    }
    for (const groundPool of this._streetGridGroundPools ?? []) {
      groundPool.material.opacity = THREE.MathUtils.damp(
        groundPool.material.opacity,
        power.groundPoolOpacity,
        power.powered ? 2.6 : 7,
        dt,
      );
      groundPool.visible = groundPool.material.opacity > 0.002;
    }
  }

  resolveSpawn(spawn = ECHO_CITY_ENTRY.spawn) {
    const candidates = [spawn, { ...spawn, z: spawn.z - 1.5 }, { ...spawn, x: spawn.x - 2 }, { ...spawn, x: spawn.x + 2 }, { ...spawn, z: spawn.z - 3 }];
    return candidates.find(({ x, z }) => !this.ctx.collisionWorld.contains(x, z, PLAYER.radius)) ?? { x: 0, z: 43, yaw: 0 };
  }

  _playTaskDialogue(kind) {
    const { model, dialogue } = this.ctx;
    dialogue.play(DIALOGUE[kind], {
      onComplete: () => {
        const record = model.getSnapshot().echoRecord;
        if (record.recordFiled) dialogue.play(DIALOGUE.complete);
        else {
          const next = remainingStops(record)[0];
          if (next) dialogue.play([{ speaker: 'ARCHIVIST', text: `Next stop: the ${next}. You can find it on the service map.` }]);
        }
      },
    });
  }

  registerInteractions() {
    const { interaction, model, dialogue, returnToMuseum } = this.ctx;
    const snapshot = () => model.getSnapshot();

    if (this.route === 'lev-revisit') {
      this.levRevisit.registerInteractions();
      interaction.register('echo-return', {
        mesh: this.returnDoor,
        enabled: () => true,
        prompt: () => snapshot().echoRecord.recordFiled ? 'E — WALK BACK INTO THE MUSEUM' : 'E — THE WAY BACK IS DARK',
        action: () => {
          if (!snapshot().echoRecord.recordFiled) dialogue.play([
            { speaker: 'BUTCH', text: 'The museum door is here, but there is no room behind it. I need to finish what Lev asked me to do.' },
          ]);
          else returnToMuseum();
        },
      });
      return;
    }

    interaction.register('echo-night-kit', {
      mesh: this.nightKit,
      enabled: () => !snapshot().echoRecord.nightKitTaken,
      prompt: 'E — TAKE THE NIGHT-ROUND KIT',
      action: () => {
        if (model.dispatch({ type: 'takeNightKit' }).changed) dialogue.play(DIALOGUE.kit);
      },
    });
    interaction.register('echo-market-shutters', {
      mesh: this.marketControl,
      enabled: () => snapshot().echoRecord.stationLampOn && !snapshot().echoRecord.marketShuttersLocked,
      prompt: () => snapshot().echoRecord.marketPawlReleased
        ? 'E — DRAW THE CANVAS CURTAINS'
        : 'E — RELEASE THE WINCH PAWL',
      action: () => {
        const record = snapshot().echoRecord;
        if (!record.marketPawlReleased) {
          if (model.dispatch({ type: 'releaseMarketPawl' }).changed) this.ctx.audioGuide?.marketPawlRelease();
        } else if (model.dispatch({ type: 'lockMarketShutters' }).changed) {
          this.ctx.audioGuide?.marketCanvasClose();
          this._playTaskDialogue('market');
        }
      },
    });
    interaction.register('echo-fountain-pump', {
      mesh: this.fountainControl,
      enabled: () => snapshot().echoRecord.marketShuttersLocked && !snapshot().echoRecord.fountainCirculationRestored,
      prompt: () => snapshot().echoRecord.fountainGrateCleared
        ? 'E — START CIRCULATION'
        : 'E — CLEAR THE PUMP GRATE',
      action: () => {
        const record = snapshot().echoRecord;
        if (!record.fountainGrateCleared) model.dispatch({ type: 'clearFountainGrate' });
        else if (model.dispatch({ type: 'restoreFountainCirculation' }).changed) this._playTaskDialogue('fountain');
      },
    });
    interaction.register('echo-archive-slot', {
      mesh: this.archiveSlot,
      enabled: () => snapshot().echoRecord.fountainCirculationRestored && !snapshot().echoRecord.nightBadgeClaimed,
      prompt: () => snapshot().echoRecord.archiveLedgerReturned
        ? 'E — TAKE THE NIGHT-SERVICE BADGE'
        : snapshot().echoRecord.archiveSlotUnlocked
          ? 'E — INSERT THE PUBLIC-WORKS LEDGER'
          : 'E — UNLOCK THE NIGHT RETURN SLOT',
      action: () => {
        const record = snapshot().echoRecord;
        if (!record.archiveSlotUnlocked) model.dispatch({ type: 'unlockArchiveSlot' });
        else if (model.dispatch({ type: 'returnArchiveLedger' }).changed) this._playTaskDialogue('archive');
        else {
          const claim = model.dispatch({ type: 'claimNightBadge' });
          if (claim.changed) {
            this.ctx.directionProgress.dispatch({ type: 'artifact.take', id: CHAPTER05_DIRECTIONS.ECHO_CITY });
            this.ctx.syncCarriedArtifact();
            this._playTaskDialogue('badge');
          }
        }
      },
    });
    interaction.register('echo-station-lamp', {
      mesh: this.stationControl,
      enabled: () => snapshot().echoRecord.nightKitTaken && !snapshot().echoRecord.stationLampOn,
      prompt: () => snapshot().echoRecord.stationPanelOpened
        ? this.stationDoorOpenVisual >= 0.9
          ? 'E — SWITCH TO NIGHT POWER'
          : 'BREAKER COVER OPENING'
        : 'E — OPEN THE BREAKER COVER',
      action: () => {
        const record = snapshot().echoRecord;
        if (!record.stationPanelOpened) model.dispatch({ type: 'openStationPanel' });
        else if (this.stationDoorOpenVisual < 0.9) return;
        else if (model.dispatch({ type: 'switchStationLamp' }).changed) this._playTaskDialogue('station');
      },
    });
    interaction.register('echo-service-window', {
      mesh: this.serviceWindow,
      enabled: () => snapshot().echoRecord.stationLampOn && !snapshot().echoRecord.serviceWindowClosed,
      prompt: 'E — SWITCH OFF THE SERVICE WINDOW',
      action: () => {
        if (model.dispatch({ type: 'closeServiceWindow' }).changed) dialogue.play(DIALOGUE.serviceWindow);
      },
    });
    interaction.register('echo-tram-notice', {
      mesh: this.tramNotice,
      enabled: () => snapshot().echoRecord.stationLampOn && !snapshot().echoRecord.tramNoticeReset,
      prompt: 'E — STRAIGHTEN THE TRAM NOTICE',
      action: () => {
        if (model.dispatch({ type: 'resetTramNotice' }).changed) dialogue.play(DIALOGUE.tramNotice);
      },
    });
    interaction.register('echo-standpipe', {
      mesh: this.standpipe,
      enabled: () => snapshot().echoRecord.stationLampOn && !snapshot().echoRecord.standpipeClosed,
      prompt: 'E — CLOSE THE STANDPIPE',
      action: () => {
        if (model.dispatch({ type: 'closeStandpipe' }).changed) dialogue.play(DIALOGUE.standpipe);
      },
    });
    interaction.register('echo-return', {
      mesh: this.returnDoor,
      enabled: () => true,
      prompt: () => snapshot().echoRecord.recordFiled ? 'E — WALK BACK INTO THE MUSEUM' : 'E — RETURN ROUTE OFFLINE',
      action: () => {
        if (!snapshot().echoRecord.recordFiled) dialogue.play(DIALOGUE.lockedReturn);
        else returnToMuseum();
      },
    });
  }

  enter() {
    const spawn = this.resolveSpawn();
    this.ctx.controller.setPose(spawn.x, spawn.z, spawn.yaw);
    if (this.route === 'lev-revisit') this.levRevisit.enter();
    else this.ctx.dialogue.play(DIALOGUE.entry);
  }

  update(dt, snapshot) {
    const r = snapshot.echoRecord;
    if (this.route === 'lev-revisit') {
      const presentation = getNightPowerPresentation({ ...r, stationLampOn: true });
      this._updateStreetlightField(dt, presentation);
      this.levRevisit.update(dt, snapshot, this.ctx.controller.position);
      const ready = r.recordFiled;
      this.returnEdgeMaterial.color.setHex(ready ? P.brass : P.dormant);
      this.returnPanelMaterial.color.setHex(ready ? 0x3d3630 : P.doorLeaf);
      this.returnStatusLight.material = ready ? emissiveMat(P.warm) : emissiveMat(P.dormant);
      this.returnLockedLabel.visible = !ready;
      this.returnOpenLabel.visible = ready;
      return;
    }
    const power = getNightPowerPresentation(r);
    // Picking up the kit is a short mechanical action, not a visibility cut:
    // the clasps release, the flap lifts, then the bag rises into Butch's hand.
    this.nightKitTakeVisual = THREE.MathUtils.damp(
      this.nightKitTakeVisual,
      r.nightKitTaken ? 1 : 0,
      2.35,
      dt,
    );
    const kitTake = this.nightKitTakeVisual;
    const flapPhase = THREE.MathUtils.smoothstep(kitTake, 0.02, 0.56);
    const liftPhase = THREE.MathUtils.smoothstep(kitTake, 0.62, 0.985);
    this.nightKit.visible = kitTake < 0.985;
    this.nightKitFlapPivot.rotation.x = -flapPhase * 1.18;
    this.nightKitHandle.rotation.x = -flapPhase * 0.16;
    this.nightKit.position.y = this.nightKitBaseY + liftPhase * 0.62;
    this.nightKit.rotation.z = -liftPhase * 0.08;
    this.nightKit.scale.setScalar(1 - liftPhase * 0.18);

    // Guidance is attached to the hardware rather than a floating sign. Only
    // the next duty breathes, slowly and at low intensity; future and finished
    // stops remain visually quiet.
    this._interactionCueClock = (this._interactionCueClock + dt) % 2.8;
    const activeStop = currentNightRoundStop(r);
    for (const [id, cue] of this.interactionCueLights) {
      const presentation = nightRoundCuePresentation(this._interactionCueClock, id === activeStop);
      cue.light.intensity = THREE.MathUtils.damp(cue.light.intensity, presentation.lightIntensity, 5, dt);
      for (const entry of cue.materials) {
        const targetColor = entry.baseColor.clone().lerp(entry.cueColor, presentation.colorMix);
        entry.material.color.lerp(targetColor, 1 - Math.exp(-6 * dt));
      }
    }

    // Power restoration leaves the city globally dark.  It wakes the bulbs,
    // local pools and nearby shadows instead of lifting the entire frame.
    this.ctx.renderer.toneMappingExposure = THREE.MathUtils.damp(
      this.ctx.renderer.toneMappingExposure,
      power.exposure,
      power.powered ? 1.7 : 4.5,
      dt,
    );
    this._updateStreetlightField(dt, power);

    const pawlBaseRotation = this.marketPawlBaseRotation ?? 0;
    this.marketPawl.rotation.z = THREE.MathUtils.damp(
      this.marketPawl.rotation.z,
      pawlBaseRotation + (r.marketPawlReleased ? -0.42 : 0),
      7,
      dt,
    );
    const marketWheelTarget = r.marketShuttersLocked ? Math.PI * 2 : 0;
    if (marketWheelTarget !== this.marketWheelTarget) {
      this.marketWheelTarget = marketWheelTarget;
      this.marketWheelStartSpin = this.marketWheelSpin;
      this.marketWheelTurnStartMs = globalThis.performance.now();
    }
    const marketWheelProgress = THREE.MathUtils.clamp(
      (globalThis.performance.now() - this.marketWheelTurnStartMs) / 1200,
      0,
      1,
    );
    this.marketWheelSpin = THREE.MathUtils.lerp(
      this.marketWheelStartSpin,
      this.marketWheelTarget,
      marketWheelProgress < 0.5
        ? 4 * marketWheelProgress ** 3
        : 1 - ((-2 * marketWheelProgress + 2) ** 3) / 2,
    );
    this.marketWheel.quaternion
      .copy(this.marketWheelBaseQuaternion)
      .multiply(this.marketWheelSpinQuaternion.setFromAxisAngle(this.marketWheelSpinAxis, this.marketWheelSpin));
    this.marketWorkLight.intensity = THREE.MathUtils.damp(this.marketWorkLight.intensity, r.marketShuttersLocked ? 0 : 12, 4, dt);
    if (this.marketWorkLight.color) this.marketWorkLight.color.setHex(r.marketPawlReleased ? 0xe2b766 : 0xc56c45);
    for (const curtain of this.marketCurtains) {
      curtain.position.x = THREE.MathUtils.damp(
        curtain.position.x,
        r.marketShuttersLocked ? curtain.userData.closedX : curtain.userData.openX,
        4.2,
        dt,
      );
      curtain.scale.x = THREE.MathUtils.damp(
        curtain.scale.x,
        r.marketShuttersLocked ? curtain.userData.closedScaleX : curtain.userData.openScaleX,
        4.2,
        dt,
      );
    }

    this.fountainWheel.rotation.z = THREE.MathUtils.damp(this.fountainWheel.rotation.z, r.fountainCirculationRestored ? Math.PI * 2 : 0, 5, dt);
    this.fountainDebris.position.y = THREE.MathUtils.damp(this.fountainDebris.position.y, r.fountainGrateCleared ? -0.42 : 0.28, 7, dt);
    this.fountainDebris.visible = this.fountainDebris.position.y > -0.35;
    this.fountainWaterMaterial.opacity = THREE.MathUtils.damp(this.fountainWaterMaterial.opacity, r.fountainCirculationRestored ? 0.72 : 0, 3, dt);
    this.fountainLight.intensity = THREE.MathUtils.damp(this.fountainLight.intensity, r.fountainCirculationRestored ? 14 : 0, 3, dt);
    this.fountainWater.rotation.y += r.fountainCirculationRestored ? dt * 0.22 : 0;
    for (let i = 0; i < this.fountainRipples.length; i++) {
      const ripple = this.fountainRipples[i];
      const pulse = (globalThis.performance.now() / 1350 + i / 3) % 1;
      ripple.scale.setScalar(0.82 + pulse * 0.34);
      ripple.material.opacity = this.fountainWaterMaterial.opacity * (1 - pulse) * 0.62;
    }

    this.archiveSlotCover.position.y = THREE.MathUtils.damp(this.archiveSlotCover.position.y, r.archiveSlotUnlocked ? 1.72 : 1.28, 7, dt);
    this.archiveSlotLock.rotation.z = THREE.MathUtils.damp(this.archiveSlotLock.rotation.z, r.archiveSlotUnlocked ? Math.PI / 2 : 0, 7, dt);
    this.archiveLedger.position.z = THREE.MathUtils.damp(this.archiveLedger.position.z, r.archiveLedgerReturned ? 0.25 : -0.52, 6, dt);
    this.archiveLedger.visible = this.archiveLedger.position.z < 0.18;
    const badgeRevealed = r.archiveLedgerReturned && !r.nightBadgeClaimed;
    this.archiveBadgeTray.position.z = THREE.MathUtils.damp(this.archiveBadgeTray.position.z, badgeRevealed ? -0.52 : 0.05, 7, dt);
    this.nightServiceBadge.position.z = THREE.MathUtils.damp(this.nightServiceBadge.position.z, badgeRevealed ? -0.62 : -0.30, 7, dt);
    this.nightServiceBadge.visible = badgeRevealed;
    this.archiveSlotLight.intensity = THREE.MathUtils.damp(this.archiveSlotLight.intensity, r.archiveLedgerReturned ? 7 : 0, 5, dt);
    this.archiveSlotLight.color.setHex(badgeRevealed ? 0xe2b766 : 0x75b7ae);

    this.stationDoorOpenVisual = THREE.MathUtils.damp(
      this.stationDoorOpenVisual,
      r.stationPanelOpened ? 1 : 0,
      3.15,
      dt,
    );
    this.stationDoorHinge.rotation.y = -Math.PI * 0.72 * this.stationDoorOpenVisual;
    this.stationSwitchPivot.rotation.z = THREE.MathUtils.damp(
      this.stationSwitchPivot.rotation.z,
      r.stationLampOn ? -Math.PI * 0.42 : 0,
      5,
      dt,
    );
    this.stationPointLight.intensity = THREE.MathUtils.damp(this.stationPointLight.intensity, power.stationLampIntensity, 1.6, dt);
    this.stationEmergencyLight.intensity = THREE.MathUtils.damp(this.stationEmergencyLight.intensity, power.emergencyBeaconIntensity, 4, dt);
    this.stationEmergencyMarker.visible = !power.powered;
    this.stationLampHead.material = r.stationLampOn ? emissiveMat(P.warm) : emissiveMat(P.dormant);

    this.serviceWindowShade.position.y = THREE.MathUtils.damp(
      this.serviceWindowShade.position.y,
      r.serviceWindowClosed ? 1.18 : 1.83,
      6,
      dt,
    );
    this.serviceWindowGlowMaterial.opacity = THREE.MathUtils.damp(
      this.serviceWindowGlowMaterial.opacity,
      r.serviceWindowClosed ? 0.06 : 0.72,
      5,
      dt,
    );
    this.serviceWindowLight.intensity = THREE.MathUtils.damp(
      this.serviceWindowLight.intensity,
      r.serviceWindowClosed ? 0 : 7,
      4,
      dt,
    );

    this.tramNoticeBoard.rotation.z = THREE.MathUtils.damp(
      this.tramNoticeBoard.rotation.z,
      r.tramNoticeReset ? 0 : 0.16,
      6,
      dt,
    );
    this.tramNoticeLampMaterial.color.setHex(r.tramNoticeReset ? 0xe0b866 : 0x49443a);
    this.tramNoticeLight.intensity = THREE.MathUtils.damp(
      this.tramNoticeLight.intensity,
      r.tramNoticeReset ? 4.5 : 0,
      4,
      dt,
    );

    this.standpipeWheel.rotation.z = THREE.MathUtils.damp(
      this.standpipeWheel.rotation.z,
      r.standpipeClosed ? -Math.PI / 2 : 0,
      6,
      dt,
    );
    this.standpipeDrip.visible = !r.standpipeClosed;
    if (!r.standpipeClosed) {
      this.standpipeDrip.position.y = 0.72 - ((globalThis.performance.now() * 0.00072) % 0.42);
    }
    this.standpipePuddleMaterial.opacity = THREE.MathUtils.damp(
      this.standpipePuddleMaterial.opacity,
      r.standpipeClosed ? 0.14 : 0.42,
      2,
      dt,
    );

    if (r.recordFiled) this._returnLightProgress = Math.min(this.returnRouteLights.length, this._returnLightProgress + dt * 1.25);
    this.returnRouteLights.forEach((entry, i) => {
      const on = this._returnLightProgress > i;
      entry.head.material = on ? emissiveMat(P.warm) : emissiveMat(P.dormant);
      entry.light.intensity = THREE.MathUtils.damp(entry.light.intensity, on ? 9 : 0, 4, dt);
    });

    this.returnEdgeMaterial.color.setHex(r.recordFiled ? P.brass : P.dormant);
    this.returnPanelMaterial.color.setHex(r.recordFiled ? 0x3d3630 : P.doorLeaf);
    this.returnStatusLight.material = r.recordFiled ? emissiveMat(P.warm) : emissiveMat(P.dormant);
    this.returnLockedLabel.visible = !r.recordFiled;
    this.returnOpenLabel.visible = r.recordFiled;

    const player = this.ctx.controller.position;
    this.radioChatter.update({ x: player.x, z: player.z, record: r });
  }

  getGameplayState() {
    const r = this.ctx.model.getSnapshot().echoRecord;
    if (this.route === 'lev-revisit') {
      const lev = this.ctx.model.getSnapshot().levRevisit;
      return {
        mode: 'lev-revisit-review',
        objective: lev.beat,
        radio: { triggered: [] },
        ...lev,
      };
    }
    return {
      mode: 'municipal-night-round',
      authority: ECHO_CITY_AUTHORITY.id,
      objective: !r.nightKitTaken ? 'take-night-kit'
        : !r.stationLampOn ? 'switch-station-lamp'
          : !r.marketShuttersLocked ? 'lock-market-shutters'
          : !r.fountainCirculationRestored ? 'restart-fountain'
            : !r.archiveLedgerReturned ? 'return-ledger'
              : !r.nightBadgeClaimed ? 'claim-night-service-badge'
                : 'walk-back-to-museum',
      remainingStops: remainingStops(r),
      radio: this.radioChatter?.getSnapshot() ?? { triggered: [] },
      ...r,
    };
  }

  getMinimapState() {
    if (this.route === 'lev-revisit') return this.levRevisit.getMinimapState();
    return {
      route: 'municipal-night-round',
      title: 'ECHO CITY · NIGHT ROUND',
      record: this.ctx.model.getSnapshot().echoRecord,
    };
  }

  exit() {}
  dispose() {}
}
