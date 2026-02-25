// Minimal static file server for the nokia directory.
// Run: node nokia-server.js
// Then open: http://localhost:4321
//
// Needed for local development — canvas.getImageData() (used by the puzzle
// pixel-mask system) throws a security error on file:// URLs, so serving
// over HTTP ensures the masks load and piece-clicking works identically to
// the live site.

const http = require('http');
const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname); // serves this folder (go/nokia/)
const PORT = 4321;

const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.mp3':  'audio/mpeg',
  '.json': 'application/json',
};

http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/' || urlPath === '') urlPath = '/nokia.html';
  const filePath = path.join(ROOT, urlPath);

  // Safety: prevent path traversal
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404); res.end('Not found: ' + urlPath); return;
    }
    const ext  = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
}).listen(PORT, () => console.log('Nokia server running at http://localhost:' + PORT));
