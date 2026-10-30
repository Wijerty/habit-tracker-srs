'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const files = { '/': ['index.html', 'text/html; charset=utf-8'], '/index.html': ['index.html', 'text/html; charset=utf-8'], '/style.css': ['style.css', 'text/css; charset=utf-8'], '/script.js': ['script.js', 'text/javascript; charset=utf-8'] };
const port = Number(process.env.PORT || 8080);
http.createServer((req, res) => {
  const file = files[new URL(req.url, 'http://localhost').pathname];
  if (!file) { res.writeHead(404).end('Not found'); return; }
  fs.readFile(path.join(__dirname, '..', file[0]), (err, data) => {
    if (err) { res.writeHead(500).end('Read error'); return; }
    res.writeHead(200, { 'Content-Type': file[1] }).end(data);
  });
}).listen(port, '127.0.0.1', () => console.log(`http://localhost:${port}`));
