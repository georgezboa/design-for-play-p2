import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const server = require('../../desktop/server.cjs');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightfall-server-'));
const bytes = Buffer.from('0123456789abcdefghij'); // 20 bytes
fs.writeFileSync(path.join(root, 'index.html'), '<!doctype html><title>NIGHTFALL — The Last Archive Line</title>');
fs.writeFileSync(path.join(root, 'labyrinth.html'), '<title>maze</title>');
fs.mkdirSync(path.join(root, 'assets', 'ui'), { recursive: true });
fs.writeFileSync(path.join(root, 'assets', 'index-BcD3fG_h.js'), 'console.log(1)');
fs.writeFileSync(path.join(root, 'assets', 'ui', 'title-background.png'), bytes);
fs.mkdirSync(path.join(root, 'cinematics'));
fs.writeFileSync(path.join(root, 'cinematics', 'film.mp4'), bytes);
fs.writeFileSync(path.join(root, 'cinematics', 'index.html'), 'films');
fs.writeFileSync(path.join(root, 'font.ttf'), bytes);
fs.writeFileSync(path.join(root, 'empty.txt'), '');
fs.writeFileSync(path.join(root, '.DS_Store'), 'x');
fs.writeFileSync(path.join(os.tmpdir(), 'nightfall-secret.txt'), 'secret');

async function freePort() {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

const port = await freePort();
const running = await server.startGameServer({ root, version: '9.9.9', port });
const origin = `http://127.0.0.1:${port}`;
test.after(() => { running.close(); fs.rmSync(root, { recursive: true, force: true }); });

// fetch() normalises "../" away, so traversal checks use a raw HTTP request.
function raw(requestPath, { method = 'GET', headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const socket = net.connect(port, '127.0.0.1', () => {
      const all = { Host: `127.0.0.1:${port}`, Connection: 'close', ...headers };
      const lines = [`${method} ${requestPath} HTTP/1.1`];
      for (const [key, value] of Object.entries(all)) lines.push(`${key}: ${value}`);
      socket.write(`${lines.join('\r\n')}\r\n\r\n`);
    });
    let data = '';
    socket.on('data', (chunk) => { data += chunk; });
    socket.on('end', () => resolve(Number(/^HTTP\/1\.1 (\d{3})/.exec(data)?.[1])));
    socket.on('error', reject);
  });
}

test('serves index.html at / with html MIME and revalidating cache policy', async () => {
  const response = await fetch(`${origin}/`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'text/html; charset=utf-8');
  assert.equal(response.headers.get('cache-control'), 'no-cache');
  assert.ok(response.headers.get('etag'));
  assert.match(await response.text(), /NIGHTFALL/);
});

test('query strings are ignored for file lookup', async () => {
  const response = await fetch(`${origin}/?play=1&credits=1`);
  assert.equal(response.status, 200);
});

test('hashed Vite bundles are immutable; public assets are not', async () => {
  const hashed = await fetch(`${origin}/assets/index-BcD3fG_h.js`);
  assert.equal(hashed.headers.get('cache-control'), 'public, max-age=31536000, immutable');
  assert.equal(hashed.headers.get('content-type'), 'text/javascript; charset=utf-8');
  const publicAsset = await fetch(`${origin}/assets/ui/title-background.png`);
  assert.equal(publicAsset.headers.get('cache-control'), 'no-cache');
  assert.equal(publicAsset.headers.get('content-type'), 'image/png');
});

test('MIME table covers the formats the game ships', () => {
  const expected = {
    'a.ttf': 'font/ttf', 'a.otf': 'font/otf', 'a.woff': 'font/woff', 'a.woff2': 'font/woff2',
    'a.wav': 'audio/wav', 'a.webm': 'video/webm', 'a.opus': 'audio/ogg', 'a.m4a': 'audio/mp4',
    'a.gif': 'image/gif', 'a.ico': 'image/x-icon', 'a.md': 'text/markdown; charset=utf-8',
    'a.wasm': 'application/wasm', 'a.glb': 'model/gltf-binary', 'a.ogg': 'audio/ogg', 'A.MP4': 'video/mp4',
    'a.unknown': 'application/octet-stream',
  };
  for (const [file, type] of Object.entries(expected)) assert.equal(server.mimeType(file), type, file);
});

test('404 for missing files, dotfiles are hidden', async () => {
  assert.equal((await fetch(`${origin}/nope.png`)).status, 404);
  assert.equal((await fetch(`${origin}/.DS_Store`)).status, 404);
});

test('path traversal never escapes the game directory', async () => {
  // WHATWG URL parsing already collapses literal and %2e dot segments, so
  // those resolve inside the root and simply 404.
  for (const attempt of ['/../nightfall-secret.txt', '/%2e%2e/nightfall-secret.txt', '/assets/../../nightfall-secret.txt']) {
    assert.ok([403, 404].includes(await raw(attempt)), attempt);
  }
  // Encoded separators survive URL parsing and must be refused outright.
  assert.equal(await raw('/..%2fnightfall-secret.txt'), 403);
  assert.equal(await raw('/..%5cnightfall-secret.txt'), 403);
  assert.equal(await raw('/assets%2f..%2f..%2fnightfall-secret.txt'), 403);
  assert.deepEqual(server.resolveFile(root, '/../nightfall-secret.txt'), { status: 403 });
});

test('400 on malformed encoding and NUL bytes', async () => {
  assert.equal(await raw('/%E0%A4%A'), 400);
  assert.equal(await raw('/index.html%00.png'), 400);
});

test('rejects requests for foreign Host headers (DNS rebinding guard)', async () => {
  assert.equal(await raw('/', { headers: { Host: 'evil.example:41730' } }), 403);
});

test('only GET and HEAD are allowed', async () => {
  const response = await fetch(`${origin}/`, { method: 'POST' });
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'GET, HEAD');
});

test('HEAD returns headers and length without a body', async () => {
  const response = await fetch(`${origin}/font.ttf`, { method: 'HEAD' });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-length'), '20');
  assert.equal(response.headers.get('content-type'), 'font/ttf');
  assert.equal((await response.arrayBuffer()).byteLength, 0);
});

test('byte ranges: explicit, open-ended, suffix, clamped', async () => {
  const cases = [
    ['bytes=0-3', '0123', 'bytes 0-3/20'],
    ['bytes=10-', 'abcdefghij', 'bytes 10-19/20'],
    ['bytes=-5', 'fghij', 'bytes 15-19/20'],
    ['bytes=18-500', 'ij', 'bytes 18-19/20'],
  ];
  for (const [range, body, contentRange] of cases) {
    const response = await fetch(`${origin}/cinematics/film.mp4`, { headers: { Range: range } });
    assert.equal(response.status, 206, range);
    assert.equal(response.headers.get('content-range'), contentRange, range);
    assert.equal(response.headers.get('content-type'), 'video/mp4');
    assert.equal(await response.text(), body, range);
  }
});

test('unsatisfiable range returns 416, malformed range serves the full file', async () => {
  const unsatisfiable = await fetch(`${origin}/cinematics/film.mp4`, { headers: { Range: 'bytes=40-50' } });
  assert.equal(unsatisfiable.status, 416);
  assert.equal(unsatisfiable.headers.get('content-range'), 'bytes */20');
  const malformed = await fetch(`${origin}/cinematics/film.mp4`, { headers: { Range: 'bytes=0-1,4-5' } });
  assert.equal(malformed.status, 200);
  assert.equal((await malformed.text()).length, 20);
});

test('HEAD with a range reports the partial length', async () => {
  const response = await fetch(`${origin}/cinematics/film.mp4`, { method: 'HEAD', headers: { Range: 'bytes=2-5' } });
  assert.equal(response.status, 206);
  assert.equal(response.headers.get('content-length'), '4');
});

test('conditional requests return 304', async () => {
  const first = await fetch(`${origin}/font.ttf`);
  const etag = first.headers.get('etag');
  await first.arrayBuffer();
  const second = await fetch(`${origin}/font.ttf`, { headers: { 'If-None-Match': etag } });
  assert.equal(second.status, 304);
  const stale = await fetch(`${origin}/font.ttf`, { headers: { Range: 'bytes=0-1', 'If-Range': '"other"' } });
  assert.equal(stale.status, 200, 'If-Range mismatch must serve the whole file');
});

test('empty files and directory indexes', async () => {
  const empty = await fetch(`${origin}/empty.txt`);
  assert.equal(empty.status, 200);
  assert.equal(await empty.text(), '');
  const redirect = await fetch(`${origin}/cinematics?x=1`, { redirect: 'manual' });
  assert.equal(redirect.status, 301);
  assert.equal(redirect.headers.get('location'), '/cinematics/?x=1');
  const index = await fetch(`${origin}/cinematics/`);
  assert.equal(await index.text(), 'films');
  const clean = await fetch(`${origin}/labyrinth`);
  assert.equal(await clean.text(), '<title>maze</title>');
});

test('ping identifies a running NIGHTFALL server', async () => {
  const occupant = await server.identifyPortOccupant({ port });
  assert.equal(occupant.kind, 'nightfall');
  assert.equal(occupant.version, '9.9.9');
});

test('a second server on the same port fails with EADDRINUSE', async () => {
  await assert.rejects(server.startGameServer({ root, port }), { code: 'EADDRINUSE' });
});

test('port occupant detection distinguishes legacy NIGHTFALL builds and other programs', async () => {
  const http = await import('node:http');
  const listen = (handler) => new Promise((resolve) => {
    const other = http.createServer(handler);
    other.listen(0, '127.0.0.1', () => resolve(other));
  });
  const legacy = await listen((request, response) => {
    if (request.url === '/') response.end('<title>NIGHTFALL — The Last Archive Line</title>');
    else { response.statusCode = 404; response.end(); }
  });
  const foreign = await listen((request, response) => response.end('<title>Some dev server</title>'));
  try {
    assert.equal((await server.identifyPortOccupant({ port: legacy.address().port })).kind, 'nightfall-legacy');
    assert.equal((await server.identifyPortOccupant({ port: foreign.address().port })).kind, 'other');
  } finally {
    legacy.close();
    foreign.close();
  }
  assert.equal((await server.identifyPortOccupant({ port: await freePort(), timeoutMs: 300 })).kind, 'none');
});

test('parseRange unit cases', () => {
  assert.deepEqual(server.parseRange('bytes=0-0', 1), { start: 0, end: 0 });
  assert.equal(server.parseRange('bytes=-0', 10), 'unsatisfiable');
  assert.equal(server.parseRange('bytes=5-2', 10), 'unsatisfiable');
  assert.equal(server.parseRange('items=0-1', 10), null);
  assert.equal(server.parseRange('bytes=-', 10), null);
  assert.deepEqual(server.parseRange('bytes=-50', 10), { start: 0, end: 9 });
});

test('the desktop origin stays fixed so localStorage saves persist', () => {
  assert.equal(server.APP_HOST, '127.0.0.1');
  assert.equal(server.APP_PORT, 41730);
});
