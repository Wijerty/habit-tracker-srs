'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
test('главная страница подключает стили и скрипт и объявляет язык', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(html, /<html\s+lang="ru"/);
  assert.match(html, /href="style\.css"/);
  assert.match(html, /src="script\.js"/);
  assert.match(html, /name="viewport"/);
});
