'use strict';

const HabitCore = (() => {
  const KEY = 'habit-tracker:v1';
  const validTime = value => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
  function validate(input) {
    const name = input.name.trim();
    if (!name) throw new Error('Введите название привычки.');
    if (input.schedule !== 'daily' && input.schedule !== 'weekly') throw new Error('Выберите расписание.');
    const days = Array.isArray(input.days) ? [...new Set(input.days.map(Number))] : [];
    if (input.schedule === 'weekly' && (!days.length || days.some(day => !Number.isInteger(day) || day < 0 || day > 6))) throw new Error('Выберите хотя бы один день недели.');
    if (input.reminderEnabled && !validTime(input.reminderTime)) throw new Error('Укажите корректное время напоминания.');
    return { name, description: input.description.trim(), schedule: input.schedule, days: input.schedule === 'weekly' ? days : [], reminderEnabled: !!input.reminderEnabled, reminderTime: input.reminderEnabled ? input.reminderTime : '' };
  }
  function load(storage) {
    const raw = storage.getItem(KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('Повреждены сохранённые данные.');
    return parsed;
  }
  function save(storage, habits) { storage.setItem(KEY, JSON.stringify(habits)); }
  function localDate(date = new Date()) {
    const pad = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }
  function toggleCompletion(habits, id, date = new Date()) {
    const day = localDate(date);
    return habits.map(habit => {
      if (habit.id !== id) return habit;
      const completions = { ...(habit.completions || {}) };
      const prior = completions[day];
      completions[day] = { completed: !(prior && prior.completed), updatedAt: date.toISOString() };
      return { ...habit, completions };
    });
  }
  return { KEY, validTime, validate, load, save, localDate, toggleCompletion };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = HabitCore;

if (typeof document !== 'undefined') {
  const form = document.querySelector('#habit-form');
  const list = document.querySelector('#habit-list');
  const error = document.querySelector('#form-error');
  const storageError = document.querySelector('#storage-error');
  const empty = document.querySelector('#empty');
  const count = document.querySelector('#count');
  const weekdays = document.querySelector('#weekdays');
  const reminderField = document.querySelector('#reminder-field');
  let habits = [];
  let storageReady = true;
  try { habits = HabitCore.load(localStorage); } catch (_) {
    storageReady = false;
    storageError.textContent = 'Не удалось прочитать сохранённые данные. Проверьте доступ к хранилищу браузера.';
    storageError.hidden = false;
  }
  const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  function render() {
    list.replaceChildren();
    count.textContent = String(habits.length);
    empty.hidden = habits.length > 0;
    for (const habit of habits) {
      const item = document.createElement('li'); item.className = 'habit-item';
      const title = document.createElement('h3'); title.textContent = habit.name; item.append(title);
      if (habit.description) { const description = document.createElement('p'); description.textContent = habit.description; item.append(description); }
      const meta = document.createElement('p'); meta.className = 'habit-meta';
      meta.textContent = (habit.schedule === 'daily' ? 'Каждый день' : habit.days.map(day => dayNames[day]).join(', ')) + ' · Активна' + (habit.reminderEnabled ? ` · ${habit.reminderTime}` : '');
      item.append(meta);
      const completed = !!habit.completions?.[HabitCore.localDate()]?.completed;
      const status = document.createElement('p'); status.className = 'habit-status';
      status.textContent = completed ? 'Сегодня выполнено' : 'Сегодня ещё не выполнено';
      const button = document.createElement('button'); button.type = 'button';
      button.className = completed ? 'done-button' : 'mark-button';
      button.textContent = completed ? 'Отменить отметку' : 'Отметить выполнение';
      button.setAttribute('aria-label', `${button.textContent}: ${habit.name}`);
      button.addEventListener('click', () => {
        try {
          const next = HabitCore.toggleCompletion(habits, habit.id);
          HabitCore.save(localStorage, next); habits = next; render();
          storageError.hidden = true;
        } catch (_) {
          storageError.textContent = 'Не удалось сохранить отметку. Проверьте доступ к хранилищу браузера.';
          storageError.hidden = false;
        }
      });
      item.append(status, button); list.append(item);
    }
  }
  form.addEventListener('change', () => {
    weekdays.hidden = form.elements.schedule.value !== 'weekly';
    reminderField.hidden = !document.querySelector('#reminder-enabled').checked;
  });
  form.addEventListener('submit', event => {
    event.preventDefault(); error.hidden = true;
    try {
      if (!storageReady) throw new Error('Сохранение недоступно: сначала восстановите доступ к данным.');
      const data = HabitCore.validate({ name: form.elements.name.value, description: form.elements.description.value, schedule: form.elements.schedule.value, days: [...form.querySelectorAll('[name="days"]:checked')].map(input => input.value), reminderEnabled: document.querySelector('#reminder-enabled').checked, reminderTime: document.querySelector('#reminder-time').value });
      const habit = { id: crypto.randomUUID(), ...data, completions: {} };
      const next = [...habits, habit];
      HabitCore.save(localStorage, next); habits = next;
      form.reset(); weekdays.hidden = true; reminderField.hidden = true;
      render(); form.elements.name.focus();
    } catch (err) { error.textContent = err instanceof SyntaxError ? 'Не удалось прочитать данные.' : err.message; error.hidden = false; }
  });
  render();
}
