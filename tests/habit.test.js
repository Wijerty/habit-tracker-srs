'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../script.js');
const base = { name: ' Прогулка ', description: '', schedule: 'daily', days: [], reminderEnabled: false, reminderTime: '' };
function storage() { const values = new Map(); return { getItem: key => values.has(key) ? values.get(key) : null, setItem: (key, value) => values.set(key, value) }; }
test('проверяет имя, дни недели и время', () => {
  assert.equal(core.validate(base).name, 'Прогулка');
  assert.throws(() => core.validate({ ...base, name: '  ' }), /название/);
  assert.throws(() => core.validate({ ...base, schedule: 'weekly' }), /день/);
  assert.throws(() => core.validate({ ...base, reminderEnabled: true, reminderTime: '24:00' }), /время/);
  assert.deepEqual(core.validate({ ...base, schedule: 'weekly', days: ['1', '1', '5'] }).days, [1, 5]);
});
test('сохраняет и восстанавливает привычки; повреждённые данные не затираются', () => {
  const store = storage(); const items = [{ id: '1', ...core.validate(base) }];
  core.save(store, items); assert.deepEqual(core.load(store), items);
  store.setItem(core.KEY, '{bad'); assert.throws(() => core.load(store)); assert.equal(store.getItem(core.KEY), '{bad');
});

test('отметка и отмена изменяют только текущую локальную дату без дубликатов', () => {
  const before = [{ id: '1', completions: { '2026-10-29': { completed: true, updatedAt: 'earlier' } } }, { id: '2', completions: {} }];
  const now = new Date(2026, 9, 30, 12, 10);
  const date = core.localDate(now);
  const marked = core.toggleCompletion(before, '1', now);
  assert.equal(date, '2026-10-30');
  assert.equal(marked[0].completions[date].completed, true);
  assert.equal(marked[0].completions[date].updatedAt, now.toISOString());
  assert.equal(marked[0].completions['2026-10-29'].completed, true);
  assert.deepEqual(marked[1], before[1]);
  const undone = core.toggleCompletion(marked, '1', now);
  assert.equal(undone[0].completions[date].completed, false);
  assert.equal(Object.keys(undone[0].completions).length, 2);
  const store = storage(); core.save(store, undone); assert.deepEqual(core.load(store), undone);
});
