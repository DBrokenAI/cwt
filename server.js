// CWT local launcher — serves this folder to this PC only so the browser can load 3D model files.
// Run: node server.js   (or double-click "Start CWT.bat")
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const ROOT = __dirname;
const PORT = +process.env.CWT_PORT || 5178;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream',
  '.wasm': 'application/wasm', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.hdr': 'application/octet-stream', '.ktx2': 'image/ktx2', '.md': 'text/plain; charset=utf-8',
};

const server = http.createServer((req, res) => {
  let rel;
  try { rel = decodeURIComponent(req.url.split('?')[0]); } catch (e) { res.writeHead(400); return res.end(); }
  if (rel === '/') rel = '/index.html';
  const file = path.normalize(path.join(ROOT, rel));
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': 'no-cache' });
    fs.createReadStream(file).pipe(res);
  });
});

server.on('error', e => {
  if (e.code === 'EADDRINUSE') { console.log(`CWT is already running — opening http://localhost:${PORT}`); open(); }
  else { console.error(e.message); process.exit(1); }
});
server.listen(PORT, '127.0.0.1', () => {
  console.log(`CWT is running at http://localhost:${PORT}\nLeave this window open while you use it. Close it to stop.`);
  if (!process.argv.includes('--no-open')) open();
});

function open() { exec(`start "" "http://localhost:${PORT}"`); }
