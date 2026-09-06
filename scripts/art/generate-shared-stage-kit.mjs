import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('src/assets/shared/models/stage-kit-v01');
fs.mkdirSync(ROOT, { recursive: true });

const MATERIALS = {
  NF_CHARCOAL: '#252a31',
  NF_IRON: '#4b535c',
  NF_BRASS: '#a87532',
  NF_IVORY: '#d8cdb6',
  NF_GLASS: '#63b9c7',
  NF_SIGNAL: '#d99b3d',
};

class Mesh {
  constructor(name) {
    this.name = name;
    this.vertices = [];
    this.faces = [];
  }

  addBox(name, center, size, material = 'NF_IRON', rotationZ = 0) {
    const [cx, cy, cz] = center;
    const [sx, sy, sz] = size.map((value) => value / 2);
    const corners = [
      [-sx, -sy, -sz], [sx, -sy, -sz], [sx, sy, -sz], [-sx, sy, -sz],
      [-sx, -sy, sz], [sx, -sy, sz], [sx, sy, sz], [-sx, sy, sz],
    ];
    const cosine = Math.cos(rotationZ);
    const sine = Math.sin(rotationZ);
    const start = this.vertices.length;
    for (const [x, y, z] of corners) {
      this.vertices.push([
        cx + x * cosine - y * sine,
        cy + x * sine + y * cosine,
        cz + z,
      ]);
    }
    const quads = [
      [0, 1, 2, 3], [4, 7, 6, 5], [0, 4, 5, 1],
      [1, 5, 6, 2], [2, 6, 7, 3], [4, 0, 3, 7],
    ];
    for (const face of quads) {
      this.faces.push({ name, material, indices: face.map((index) => start + index) });
    }
  }

  addBeam(name, start, end, width, depth, material = 'NF_IRON') {
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const length = Math.hypot(dx, dy);
    this.addBox(
      name,
      [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2, (start[2] + end[2]) / 2],
      [length, width, depth],
      material,
      Math.atan2(dy, dx),
    );
  }
}

function floorModule() {
  const mesh = new Mesh('NF_FLOOR_MODULE');
  mesh.addBox('floor_slab', [0, 0, 0], [4, 0.22, 2.2], 'NF_CHARCOAL');
  mesh.addBox('front_trim', [0, 0.02, -1.16], [4.08, 0.34, 0.12], 'NF_BRASS');
  mesh.addBox('rear_trim', [0, 0.02, 1.16], [4.08, 0.34, 0.12], 'NF_IRON');
  return mesh;
}

function archRib() {
  const mesh = new Mesh('NF_ARCH_RIB');
  mesh.addBox('left_post', [-1.9, 1.55, 0], [0.24, 3.1, 0.34], 'NF_IRON');
  mesh.addBox('right_post', [1.9, 1.55, 0], [0.24, 3.1, 0.34], 'NF_IRON');
  mesh.addBeam('arch_left', [-1.9, 3.1, 0], [-0.75, 3.58, 0], 0.24, 0.34, 'NF_BRASS');
  mesh.addBeam('arch_mid', [-0.75, 3.58, 0], [0.75, 3.58, 0], 0.24, 0.34, 'NF_BRASS');
  mesh.addBeam('arch_right', [0.75, 3.58, 0], [1.9, 3.1, 0], 0.24, 0.34, 'NF_BRASS');
  return mesh;
}

function windowFrame() {
  const mesh = new Mesh('NF_WINDOW_FRAME');
  mesh.addBox('left_jamb', [-1.5, 1.35, 0], [0.16, 2.7, 0.2], 'NF_IRON');
  mesh.addBox('right_jamb', [1.5, 1.35, 0], [0.16, 2.7, 0.2], 'NF_IRON');
  mesh.addBox('head', [0, 2.64, 0], [3.16, 0.16, 0.2], 'NF_IRON');
  mesh.addBox('sill', [0, 0.06, 0], [3.16, 0.18, 0.24], 'NF_BRASS');
  mesh.addBox('mullion', [0, 1.35, 0], [0.09, 2.48, 0.16], 'NF_CHARCOAL');
  mesh.addBox('glass_left', [-0.75, 1.35, 0.04], [1.34, 2.38, 0.025], 'NF_GLASS');
  mesh.addBox('glass_right', [0.75, 1.35, 0.04], [1.34, 2.38, 0.025], 'NF_GLASS');
  return mesh;
}

function doorFrame() {
  const mesh = new Mesh('NF_DOOR_FRAME');
  mesh.addBox('left_jamb', [-1.05, 1.55, 0], [0.22, 3.1, 0.3], 'NF_IRON');
  mesh.addBox('right_jamb', [1.05, 1.55, 0], [0.22, 3.1, 0.3], 'NF_IRON');
  mesh.addBox('head', [0, 3.0, 0], [2.32, 0.22, 0.3], 'NF_BRASS');
  mesh.addBox('threshold', [0, 0.08, 0], [2.32, 0.16, 0.34], 'NF_CHARCOAL');
  mesh.addBox('door_leaf', [0, 1.52, 0.11], [1.78, 2.68, 0.08], 'NF_IVORY');
  mesh.addBox('handle', [0.67, 1.52, 0.22], [0.08, 0.3, 0.08], 'NF_BRASS');
  return mesh;
}

function worldFrame() {
  const mesh = new Mesh('NF_WORLD_FRAME');
  mesh.addBox('base', [0, 0.12, 0], [2.9, 0.24, 0.9], 'NF_CHARCOAL');
  mesh.addBox('left_frame', [-1.25, 1.55, 0], [0.22, 2.9, 0.28], 'NF_BRASS');
  mesh.addBox('right_frame', [1.25, 1.55, 0], [0.22, 2.9, 0.28], 'NF_BRASS');
  mesh.addBox('top_frame', [0, 2.9, 0], [2.72, 0.22, 0.28], 'NF_BRASS');
  mesh.addBox('bottom_frame', [0, 0.28, 0], [2.72, 0.22, 0.28], 'NF_BRASS');
  mesh.addBox('replaceable_plane', [0, 1.58, 0.09], [2.2, 2.3, 0.035], 'NF_GLASS');
  return mesh;
}

function plinth() {
  const mesh = new Mesh('NF_DISPLAY_PLINTH');
  mesh.addBox('bottom_step', [0, 0.1, 0], [1.5, 0.2, 1.25], 'NF_CHARCOAL');
  mesh.addBox('body', [0, 0.72, 0], [1.2, 1.05, 1.0], 'NF_IVORY');
  mesh.addBox('top_step', [0, 1.31, 0], [1.42, 0.14, 1.18], 'NF_BRASS');
  mesh.addBox('evidence_slot', [0, 1.42, 0], [0.82, 0.08, 0.7], 'NF_GLASS');
  return mesh;
}

function handrail() {
  const mesh = new Mesh('NF_HANDRAIL');
  for (const x of [-1.8, 0, 1.8]) {
    mesh.addBox(`post_${x}`, [x, 0.72, 0], [0.09, 1.44, 0.09], 'NF_IRON');
  }
  mesh.addBox('top_rail', [0, 1.43, 0], [3.72, 0.1, 0.1], 'NF_BRASS');
  mesh.addBox('mid_rail', [0, 0.76, 0], [3.72, 0.075, 0.075], 'NF_IRON');
  return mesh;
}

function serviceTrough() {
  const mesh = new Mesh('NF_SERVICE_TROUGH');
  mesh.addBox('floor', [0, 0.08, 0], [3.6, 0.16, 0.72], 'NF_CHARCOAL');
  mesh.addBox('front_wall', [0, 0.32, -0.34], [3.6, 0.64, 0.1], 'NF_IRON');
  mesh.addBox('rear_wall', [0, 0.32, 0.34], [3.6, 0.64, 0.1], 'NF_IRON');
  for (const x of [-1.35, -0.45, 0.45, 1.35]) {
    mesh.addBox(`support_${x}`, [x, 0.22, 0], [0.1, 0.44, 0.82], 'NF_BRASS');
  }
  return mesh;
}

function pipeRun() {
  const mesh = new Mesh('NF_PIPE_RUN');
  mesh.addBox('main_pipe', [0, 1.05, 0], [3.8, 0.16, 0.16], 'NF_BRASS');
  mesh.addBox('left_drop', [-1.65, 0.55, 0], [0.16, 1.15, 0.16], 'NF_BRASS');
  mesh.addBox('right_drop', [1.65, 0.55, 0], [0.16, 1.15, 0.16], 'NF_BRASS');
  for (const x of [-1.65, -0.55, 0.55, 1.65]) {
    mesh.addBox(`clamp_${x}`, [x, 1.05, 0], [0.12, 0.3, 0.3], 'NF_IRON');
  }
  mesh.addBox('signal_window', [0, 1.05, 0.11], [0.54, 0.28, 0.06], 'NF_SIGNAL');
  return mesh;
}

function glassPanel() {
  const mesh = new Mesh('NF_GLASS_PANEL');
  mesh.addBox('base', [0, 0.08, 0], [2.8, 0.16, 0.72], 'NF_CHARCOAL');
  mesh.addBox('left_post', [-1.25, 1.25, 0], [0.14, 2.5, 0.18], 'NF_IRON');
  mesh.addBox('right_post', [1.25, 1.25, 0], [0.14, 2.5, 0.18], 'NF_IRON');
  mesh.addBox('top', [0, 2.45, 0], [2.64, 0.14, 0.18], 'NF_IRON');
  mesh.addBox('pane', [0, 1.27, 0.02], [2.34, 2.2, 0.035], 'NF_GLASS');
  return mesh;
}

const MODELS = [
  ['nf_floor_module', 'Floor Module', floorModule],
  ['nf_arch_rib', 'Arch Rib', archRib],
  ['nf_window_frame', 'Window Frame', windowFrame],
  ['nf_door_frame', 'Door Frame', doorFrame],
  ['nf_world_frame', 'Replaceable World Frame', worldFrame],
  ['nf_display_plinth', 'Display Plinth', plinth],
  ['nf_handrail', 'Handrail', handrail],
  ['nf_service_trough', 'Service Trough', serviceTrough],
  ['nf_pipe_run', 'Signal Pipe Run', pipeRun],
  ['nf_glass_panel', 'Glass Panel', glassPanel],
];

function objFor(mesh, materialFile = 'nf_stage_kit_v01.mtl') {
  const lines = [`# NIGHTFALL shared stage kit v01`, `mtllib ${materialFile}`, `o ${mesh.name}`];
  for (const vertex of mesh.vertices) lines.push(`v ${vertex.map((value) => value.toFixed(5)).join(' ')}`);
  let activeName = '';
  let activeMaterial = '';
  for (const face of mesh.faces) {
    if (face.name !== activeName) {
      activeName = face.name;
      lines.push(`g ${activeName}`);
    }
    if (face.material !== activeMaterial) {
      activeMaterial = face.material;
      lines.push(`usemtl ${activeMaterial}`);
    }
    lines.push(`f ${face.indices.map((index) => index + 1).join(' ')}`);
  }
  return `${lines.join('\n')}\n`;
}

const mtl = `# NIGHTFALL shared neutral materials v01
newmtl NF_CHARCOAL
Kd 0.035 0.045 0.060
Ks 0.080 0.090 0.100
Ns 18

newmtl NF_IRON
Kd 0.180 0.210 0.240
Ks 0.160 0.170 0.180
Ns 28

newmtl NF_BRASS
Kd 0.460 0.285 0.105
Ks 0.220 0.150 0.060
Ns 34

newmtl NF_IVORY
Kd 0.700 0.650 0.540
Ks 0.080 0.070 0.050
Ns 10

newmtl NF_GLASS
Kd 0.140 0.520 0.610
Ks 0.420 0.700 0.760
Ns 80
d 0.30

newmtl NF_SIGNAL
Kd 0.920 0.500 0.080
Ke 0.480 0.180 0.020
Ns 45
`;
fs.writeFileSync(path.join(ROOT, 'nf_stage_kit_v01.mtl'), mtl);

for (const [filename, , factory] of MODELS) {
  fs.writeFileSync(path.join(ROOT, `${filename}.obj`), objFor(factory()));
}

function project(vertex) {
  const [x, y, z] = vertex;
  return [(x - z) * 0.82, -y + (x + z) * 0.29];
}

function previewTile(mesh, label, index) {
  const column = index % 5;
  const row = Math.floor(index / 5);
  const tileX = 36 + column * 376;
  const tileY = 88 + row * 482;
  const tileW = 344;
  const tileH = 420;
  const points = mesh.vertices.map(project);
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const scale = Math.min(250 / Math.max(0.1, maxX - minX), 270 / Math.max(0.1, maxY - minY));
  const offsetX = tileX + tileW / 2 - ((minX + maxX) / 2) * scale;
  const offsetY = tileY + 212 - ((minY + maxY) / 2) * scale;
  const polygons = [...mesh.faces]
    .map((face) => ({
      ...face,
      depth: face.indices.reduce((sum, i) => sum + mesh.vertices[i][0] + mesh.vertices[i][2] - mesh.vertices[i][1] * 0.25, 0) / face.indices.length,
    }))
    .sort((a, b) => a.depth - b.depth)
    .map((face) => {
      const polygon = face.indices.map((i) => {
        const [px, py] = points[i];
        return `${(offsetX + px * scale).toFixed(1)},${(offsetY + py * scale).toFixed(1)}`;
      }).join(' ');
      const opacity = face.material === 'NF_GLASS' ? 0.42 : 0.92;
      return `<polygon points="${polygon}" fill="${MATERIALS[face.material]}" fill-opacity="${opacity}" stroke="#d9caa7" stroke-opacity="0.36" stroke-width="1.2"/>`;
    }).join('');
  return `<g><rect x="${tileX}" y="${tileY}" width="${tileW}" height="${tileH}" rx="18" fill="#11151b" stroke="#3f4851"/><circle cx="${tileX + 24}" cy="${tileY + 24}" r="8" fill="${index < 5 ? '#78cbd2' : '#d99b3d'}"/>${polygons}</g>`;
}

const tiles = MODELS.map(([, label, factory], index) => previewTile(factory(), label, index)).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <rect width="1920" height="1080" fill="#090c10"/>
  <rect x="36" y="38" width="420" height="8" rx="4" fill="#f2e8d1"/>
  <rect x="1420" y="38" width="460" height="8" rx="4" fill="#78cbd2"/>
  ${tiles}
  <rect x="36" y="1042" width="960" height="4" rx="2" fill="#3f4851"/>
</svg>`;
fs.writeFileSync(path.join(ROOT, 'MODEL_SHARED_STAGE_KIT_v01_preview.svg'), svg);

const manifest = {
  version: 1,
  units: 'meters',
  upAxis: 'Y',
  forwardAxis: '-Z',
  status: 'neutral source model; paint-over required; not integrated',
  files: MODELS.map(([filename, label, factory]) => {
    const mesh = factory();
    return {
      id: filename,
      label,
      file: `${filename}.obj`,
      vertices: mesh.vertices.length,
      faces: mesh.faces.length,
    };
  }),
};
fs.writeFileSync(path.join(ROOT, 'model-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Generated ${MODELS.length} models in ${ROOT}`);
