'use strict';
const fs = require('node:fs');
fs.mkdirSync('dist', { recursive: true });
for (const name of ['index.html', 'style.css', 'script.js']) {
  fs.copyFileSync(name, `dist/${name}`);
}
console.log('Сборка сохранена в dist/');
