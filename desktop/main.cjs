const { app, BrowserWindow, dialog } = require('electron');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { URL } = require('url');

// A stable localhost origin is essential: the browser stores NIGHTFALL saves
// (including collected Magic Stones) per origin. A random port made every app
// launch look like a different game profile.
const APP_PORT = 41730;

const MIME = {
  '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.mp4': 'video/mp4',
  '.glb': 'model/gltf-binary', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};

function gameDirectory() {
  return app.isPackaged ? path.join(process.resourcesPath, 'game') : path.join(__dirname, '..', 'dist');
}

function startGameServer(root) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      const requestUrl = new URL(request.url, 'http://127.0.0.1');
      const relativePath = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, '') || 'index.html';
      const requestedFile = path.resolve(root, relativePath);
      if (!requestedFile.startsWith(`${root}${path.sep}`) && requestedFile !== path.join(root, 'index.html')) {
        response.writeHead(403); response.end(); return;
      }
      let file = requestedFile;
      if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
      fs.stat(file, (error, stats) => {
        if (error || !stats.isFile()) { response.writeHead(404); response.end('Not found'); return; }
        const contentType = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
        const range = request.headers.range;
        if (range) {
          const match = /bytes=(\d+)-(\d*)/.exec(range);
          const start = Number(match?.[1] || 0);
          const end = match?.[2] ? Math.min(Number(match[2]), stats.size - 1) : stats.size - 1;
          response.writeHead(206, { 'Content-Type': contentType, 'Content-Length': end - start + 1, 'Content-Range': `bytes ${start}-${end}/${stats.size}`, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' });
          fs.createReadStream(file, { start, end }).pipe(response);
          return;
        }
        response.writeHead(200, { 'Content-Type': contentType, 'Content-Length': stats.size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' });
        fs.createReadStream(file).pipe(response);
      });
    });
    server.once('error', reject);
    server.listen(APP_PORT, '127.0.0.1', () => resolve(server));
  });
}

let server;
async function launch() {
  try {
    server = await startGameServer(gameDirectory());
    const window = new BrowserWindow({
      width: 1440, height: 900, minWidth: 960, minHeight: 620,
      title: 'NIGHTFALL', backgroundColor: '#03050a', autoHideMenuBar: true,
      webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
    });
    await window.loadURL(`http://127.0.0.1:${APP_PORT}/`);
  } catch (error) {
    dialog.showErrorBox('NIGHTFALL could not start', error.message);
    app.quit();
  }
}

app.whenReady().then(launch);
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => server?.close());
