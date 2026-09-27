'use strict';

// Local-only static file server for the packaged NIGHTFALL game.
//
// This module deliberately has no Electron dependency so it can be unit
// tested with plain `node --test` (see tests/desktop/server.test.mjs).
//
// The game is served from a FIXED origin (http://127.0.0.1:41730). Chromium
// stores NIGHTFALL saves in localStorage per origin, so changing the host or
// port would make every existing player's archive disappear. Never change
// APP_HOST / APP_PORT.

const fs = require('fs');
const http = require('http');
const path = require('path');

const APP_HOST = '127.0.0.1';
const APP_PORT = 41730;
const PING_PATH = '/__nightfall/ping';
const APP_ID = 'NIGHTFALL';

const MIME = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.srt': 'text/plain; charset=utf-8',
  '.vtt': 'text/vtt; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.pdf': 'application/pdf',
  '.wasm': 'application/wasm',
  // images
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  // audio / video
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.aif': 'audio/aiff',
  '.aiff': 'audio/aiff',
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.webm': 'video/webm',
  '.ogv': 'video/ogg',
  // 3D / binary data
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
  '.ktx2': 'image/ktx2',
  '.hdr': 'image/vnd.radiance',
  // fonts
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
});

function mimeType(filePath) {
  return MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

// Vite writes content-hashed bundles flat into /assets/<name>-<hash8>.<ext>.
// Those URLs change whenever their bytes change, so they can be cached
// forever. (public/assets/** is copied into dist/assets/<subdir>/..., which
// this pattern does not match because it excludes nested paths.)
// Everything else (HTML entry pages, unhashed files copied from public/) is
// stored but revalidated with ETag / Last-Modified on every normal load.
// `no-cache` (unlike the old `no-store`) still lets the chapter preloader's
// fetch(..., { cache: 'force-cache' }) warm the HTTP cache for the next page.
const HASHED_ASSET = /^\/assets\/[^/]+-[A-Za-z0-9_-]{8}\.[A-Za-z0-9]+$/;

function cacheControlFor(urlPath) {
  if (HASHED_ASSET.test(urlPath)) return 'public, max-age=31536000, immutable';
  return 'no-cache';
}

function etagFor(stats) {
  return `W/"${stats.size.toString(16)}-${Math.floor(stats.mtimeMs).toString(16)}"`;
}

// Returns { start, end } (inclusive), 'unsatisfiable', or null when the header
// should be ignored and the full body served (malformed or multi-range).
function parseRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(String(header).trim());
  if (!match) return null;
  const [, rawStart, rawEnd] = match;
  if (rawStart === '' && rawEnd === '') return null;
  let start;
  let end;
  if (rawStart === '') {
    // Suffix range: the last N bytes.
    const suffix = Number(rawEnd);
    if (suffix === 0) return 'unsatisfiable';
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd === '' ? size - 1 : Math.min(Number(rawEnd), size - 1);
  }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) return null;
  if (start >= size || start > end) return 'unsatisfiable';
  return { start, end };
}

function isInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function statOrNull(file) {
  try { return fs.statSync(file); } catch { return null; }
}

// Maps a URL pathname to a file on disk. Returns { status } on failure.
function resolveFile(root, urlPath) {
  let decoded;
  try { decoded = decodeURIComponent(urlPath); } catch { return { status: 400 }; }
  if (decoded.includes('\0')) return { status: 400 };
  // Normalise Windows separators so "..\\" cannot slip past the check.
  const relativePath = decoded.replace(/\\/g, '/').replace(/^\/+/, '');
  const candidate = path.resolve(root, relativePath);
  if (!isInside(root, candidate)) return { status: 403 };
  // Never serve dotfiles (e.g. .DS_Store, .git) from the game directory.
  if (path.relative(root, candidate).split(path.sep).some((part) => part.startsWith('.'))) return { status: 404 };

  let file = candidate;
  let stats = statOrNull(file);
  if (stats && stats.isDirectory()) {
    if (!urlPath.endsWith('/')) return { status: 301, location: `${urlPath}/` };
    file = path.join(file, 'index.html');
    stats = statOrNull(file);
  } else if (!stats && path.extname(file) === '') {
    // Allow clean URLs such as /labyrinth -> labyrinth.html (vite preview does).
    const html = `${file}.html`;
    const htmlStats = statOrNull(html);
    if (htmlStats) { file = html; stats = htmlStats; }
  }
  if (!stats || !stats.isFile()) return { status: 404 };
  return { file, stats };
}

function createRequestHandler({ root, version = '0.0.0', allowedHosts = null } = {}) {
  if (!root) throw new Error('createRequestHandler requires a root directory');
  const gameRoot = path.resolve(root);
  const hosts = allowedHosts ? new Set(allowedHosts.map((host) => host.toLowerCase())) : null;

  return function handleRequest(request, response) {
    const baseHeaders = {
      'X-Content-Type-Options': 'nosniff',
      'Cross-Origin-Resource-Policy': 'same-origin',
    };
    const send = (status, body = '', headers = {}) => {
      const payload = Buffer.from(body);
      response.writeHead(status, {
        ...baseHeaders,
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Length': payload.length,
        'Cache-Control': 'no-store',
        ...headers,
      });
      response.end(request.method === 'HEAD' ? undefined : payload);
    };

    // DNS-rebinding guard: only answer requests addressed to our own origin.
    if (hosts && !hosts.has(String(request.headers.host || '').toLowerCase())) {
      send(403, 'Forbidden');
      return;
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      send(405, 'Method not allowed', { Allow: 'GET, HEAD' });
      return;
    }

    let urlPath;
    let search = '';
    try {
      ({ pathname: urlPath, search } = new URL(request.url, `http://${APP_HOST}`));
    } catch {
      send(400, 'Bad request');
      return;
    }

    if (urlPath === PING_PATH) {
      send(200, JSON.stringify({ app: APP_ID, version, pid: process.pid }), {
        'Content-Type': 'application/json; charset=utf-8',
      });
      return;
    }

    const resolved = resolveFile(gameRoot, urlPath);
    if (resolved.status === 301) { send(301, '', { Location: `${resolved.location}${search}` }); return; }
    if (resolved.status) {
      send(resolved.status, resolved.status === 404 ? 'Not found' : resolved.status === 403 ? 'Forbidden' : 'Bad request');
      return;
    }

    const { file, stats } = resolved;
    const etag = etagFor(stats);
    const lastModified = new Date(Math.floor(stats.mtimeMs / 1000) * 1000).toUTCString();
    const headers = {
      ...baseHeaders,
      'Content-Type': mimeType(file),
      'Cache-Control': cacheControlFor(urlPath),
      'Accept-Ranges': 'bytes',
      ETag: etag,
      'Last-Modified': lastModified,
    };

    const ifNoneMatch = request.headers['if-none-match'];
    const ifModifiedSince = request.headers['if-modified-since'];
    const notModified = ifNoneMatch
      ? ifNoneMatch.split(',').map((tag) => tag.trim()).some((tag) => tag === etag || tag === '*')
      : Boolean(ifModifiedSince) && Date.parse(ifModifiedSince) >= Date.parse(lastModified);
    if (notModified) {
      response.writeHead(304, headers);
      response.end();
      return;
    }

    let range = null;
    const ifRange = request.headers['if-range'];
    if (request.headers.range && (!ifRange || ifRange === etag || ifRange === lastModified)) {
      range = parseRange(request.headers.range, stats.size);
    }
    if (range === 'unsatisfiable') {
      response.writeHead(416, { ...headers, 'Content-Range': `bytes */${stats.size}`, 'Content-Length': 0 });
      response.end();
      return;
    }

    const status = range ? 206 : 200;
    const start = range ? range.start : 0;
    const end = range ? range.end : stats.size - 1;
    headers['Content-Length'] = stats.size === 0 ? 0 : end - start + 1;
    if (range) headers['Content-Range'] = `bytes ${start}-${end}/${stats.size}`;
    response.writeHead(status, headers);

    if (request.method === 'HEAD' || stats.size === 0) {
      response.end();
      return;
    }
    const stream = fs.createReadStream(file, { start, end });
    stream.on('error', () => response.destroy());
    response.on('close', () => stream.destroy());
    stream.pipe(response);
  };
}

function createGameServer(options) {
  const server = http.createServer(createRequestHandler(options));
  server.keepAliveTimeout = 30_000;
  return server;
}

// Resolves with the listening server, rejects with the listen error (for
// example `EADDRINUSE` when another program already owns the port).
function startGameServer({ root, version, port = APP_PORT, host = APP_HOST } = {}) {
  const allowedHosts = [`${host}:${port}`, `localhost:${port}`];
  const server = createGameServer({ root, version, allowedHosts });
  return new Promise((resolve, reject) => {
    const onError = (error) => { server.close(); reject(error); };
    server.once('error', onError);
    server.listen(port, host, () => {
      server.off('error', onError);
      resolve(server);
    });
  });
}

function httpGet(url, timeoutMs) {
  return new Promise((resolve) => {
    const request = http.get(url, { timeout: timeoutMs, headers: { Accept: '*/*' } }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { if (body.length < 65536) body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, body }));
      response.on('error', () => resolve(null));
    });
    request.on('timeout', () => request.destroy());
    request.on('error', () => resolve(null));
  });
}

// Identifies what is listening on the game port after EADDRINUSE:
//   'nightfall'        — a NIGHTFALL build with this server (answers the ping)
//   'nightfall-legacy' — an older NIGHTFALL build (serves the NIGHTFALL page)
//   'other'            — some unrelated program
//   'none'             — nothing answered (port may have been freed)
async function identifyPortOccupant({ port = APP_PORT, host = APP_HOST, timeoutMs = 1500 } = {}) {
  const origin = `http://${host}:${port}`;
  const ping = await httpGet(`${origin}${PING_PATH}`, timeoutMs);
  if (!ping) return { kind: 'none' };
  if (ping.status === 200) {
    try {
      const info = JSON.parse(ping.body);
      if (info && info.app === APP_ID) return { kind: 'nightfall', version: info.version, pid: info.pid };
    } catch { /* not ours */ }
  }
  const page = await httpGet(`${origin}/`, timeoutMs);
  if (page && page.status === 200 && /<title>[^<]*NIGHTFALL/i.test(page.body)) return { kind: 'nightfall-legacy' };
  return { kind: 'other' };
}

module.exports = {
  APP_HOST,
  APP_PORT,
  APP_ID,
  PING_PATH,
  MIME,
  mimeType,
  cacheControlFor,
  parseRange,
  resolveFile,
  createRequestHandler,
  createGameServer,
  startGameServer,
  identifyPortOccupant,
};
