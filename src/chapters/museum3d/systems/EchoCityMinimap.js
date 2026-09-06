import { ECHO_CITY_AUTHORITY } from '../data/echoCityAuthority.js';

const COLORS = Object.freeze({
  panel: 'rgba(5, 8, 10, 0.84)',
  border: 'rgba(215, 197, 157, 0.48)',
  road: 'rgba(125, 133, 136, 0.34)',
  building: 'rgba(69, 76, 79, 0.44)',
  muted: 'rgba(185, 180, 164, 0.28)',
  museum: '#eee7d4',
  pending: '#d9a451',
  urgent: '#e87843',
  complete: '#75b7ae',
  player: '#f5f2e8',
});

const STOP_META = Object.freeze([
  Object.freeze({ id: 'kit', label: 'KIT', field: 'nightKitTaken' }),
  Object.freeze({ id: 'station', label: 'STATION', field: 'stationLampOn' }),
  Object.freeze({ id: 'market', label: 'MARKET', field: 'marketShuttersLocked' }),
  Object.freeze({ id: 'fountain', label: 'PUMP', field: 'fountainCirculationRestored' }),
  // The archive remains the active stop until the badge tray has been emptied.
  Object.freeze({ id: 'archive', label: 'ARCHIVE', field: 'nightBadgeClaimed' }),
]);

export function worldToMinimap(x, z, {
  width = 176,
  height = 150,
  padding = 10,
  bounds = ECHO_CITY_AUTHORITY.bounds,
} = {}) {
  const innerW = Math.max(1, width - padding * 2);
  const innerH = Math.max(1, height - padding * 2);
  return {
    x: padding + ((x - bounds.minX) / (bounds.maxX - bounds.minX)) * innerW,
    y: padding + ((z - bounds.minZ) / (bounds.maxZ - bounds.minZ)) * innerH,
  };
}

export function getNightRoundMarkerState(record = {}) {
  const firstIncomplete = STOP_META.findIndex((stop) => record[stop.field] !== true);
  return STOP_META.map((stop, index) => ({
    ...stop,
    state: index < firstIncomplete || firstIncomplete === -1
      ? 'complete'
      : index === firstIncomplete
        ? (stop.id === 'station' ? 'urgent' : 'pending')
        : 'muted',
  }));
}

function roundedRect(ctx, x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export class EchoCityMinimap {
  constructor({ root, canvas, stops }) {
    this.root = root;
    this.canvas = canvas;
    this.ctx = canvas?.getContext('2d') ?? null;
    this.stops = stops;
    this.titleEl = root?.querySelector('.map-title') ?? null;
    this.visible = false;
    this.lastSnapshot = { visible: false, markers: [] };
  }

  setVisible(on) {
    this.visible = Boolean(on && this.root && this.ctx);
    if (this.root) this.root.hidden = !this.visible;
  }

  update({ active, player, yaw, record, route = 'municipal-night-round', title = null, markers = null }) {
    this.setVisible(active);
    if (!this.visible) {
      this.lastSnapshot = { visible: false, markers: [] };
      return;
    }

    const cssWidth = Math.max(1, this.canvas.clientWidth || 176);
    const cssHeight = Math.max(1, this.canvas.clientHeight || 150);
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(cssWidth * scale);
    const pixelHeight = Math.round(cssHeight * scale);
    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
    }
    this.ctx.setTransform(scale, 0, 0, scale, 0, 0);
    const resolvedTitle = title ?? (route === 'lev-revisit' ? 'ECHO CITY · FIND LEV' : 'ECHO CITY · NIGHT ROUND');
    if (this.titleEl) this.titleEl.textContent = resolvedTitle;
    if (this.root) this.root.setAttribute('aria-label', `${resolvedTitle.toLowerCase()} map`);
    this._draw(cssWidth, cssHeight, player, yaw, record, { route, markers });
  }

  _draw(width, height, player, yaw, record, { route, markers }) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, width, height);

    roundedRect(ctx, 0.5, 0.5, width - 1, height - 1, 4);
    ctx.fillStyle = COLORS.panel;
    ctx.fill();
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1;
    ctx.stroke();

    const map = (x, z) => worldToMinimap(x, z, { width, height, padding: 9 });
    for (const road of ECHO_CITY_AUTHORITY.roads) {
      const center = map(road.x, road.z);
      const left = map(road.x - road.w / 2, road.z);
      const right = map(road.x + road.w / 2, road.z);
      const top = map(road.x, road.z - road.d / 2);
      const bottom = map(road.x, road.z + road.d / 2);
      ctx.fillStyle = COLORS.road;
      ctx.fillRect(
        Math.min(left.x, right.x),
        Math.min(top.y, bottom.y),
        Math.max(1, Math.abs(right.x - left.x)),
        Math.max(1, Math.abs(bottom.y - top.y)),
      );
    }

    for (const landmark of ECHO_CITY_AUTHORITY.landmarks) {
      const p = map(landmark.x, landmark.z);
      ctx.fillStyle = COLORS.building;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }

    const museum = map(ECHO_CITY_AUTHORITY.returnThreshold.x, ECHO_CITY_AUTHORITY.returnThreshold.z);
    ctx.strokeStyle = COLORS.museum;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(museum.x - 4, museum.y - 3, 8, 6);

    const markerStates = route === 'lev-revisit' && Array.isArray(markers)
      ? markers
      : getNightRoundMarkerState(record);
    for (const marker of markerStates) {
      const stop = Number.isFinite(marker.x) && Number.isFinite(marker.z) ? marker : this.stops[marker.id];
      if (!stop) continue;
      const p = map(stop.x, stop.z);
      const color = marker.state === 'complete'
        ? COLORS.complete
        : marker.state === 'urgent' ? COLORS.urgent
          : marker.state === 'pending' ? COLORS.pending : COLORS.muted;
      ctx.beginPath();
      ctx.arc(p.x, p.y, marker.state === 'urgent' ? 3.6 : 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      if (marker.state !== 'muted') {
        ctx.font = '8px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = color;
        ctx.fillText(marker.label, p.x, p.y - 5);
      }
    }

    const pp = map(player.x, player.z);
    ctx.save();
    ctx.translate(pp.x, pp.y);
    ctx.rotate(-yaw);
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4.3, 4.2);
    ctx.lineTo(0, 2.7);
    ctx.lineTo(-4.3, 4.2);
    ctx.closePath();
    ctx.fillStyle = COLORS.player;
    ctx.fill();
    ctx.restore();

    this.lastSnapshot = {
      visible: true,
      player: { x: Number(player.x.toFixed(2)), z: Number(player.z.toFixed(2)), yaw: Number(yaw.toFixed(2)) },
      markers: markerStates.map(({ id, state }) => ({ id, state })),
      routeGuidance: route === 'lev-revisit',
    };
  }

  getSnapshot() {
    return this.lastSnapshot;
  }
}
