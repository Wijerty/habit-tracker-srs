-- Habit Tracker: схема SQLite 3.37+ для новой базы данных.
-- SQLite включает проверку внешних ключей отдельно для каждого подключения.
PRAGMA foreign_keys = ON;
BEGIN;

CREATE TABLE habits (
    habit_id     INTEGER PRIMARY KEY,
    title        TEXT NOT NULL CHECK (length(trim(title, char(9, 10, 13, 32))) BETWEEN 1 AND 100),
    description  TEXT CHECK (length(description) <= 300),
    created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        CHECK (strftime('%Y-%m-%dT%H:%M:%SZ', created_at, '+0 seconds') IS created_at),
    archived_at  TEXT CHECK (archived_at IS NULL OR (
        strftime('%Y-%m-%dT%H:%M:%SZ', archived_at, '+0 seconds') IS archived_at
        AND archived_at >= created_at
    ))
) STRICT;

-- ISO-нумерация дней: понедельник = 1, воскресенье = 7.
CREATE TABLE weekdays (
    weekday_id  INTEGER PRIMARY KEY CHECK (weekday_id BETWEEN 1 AND 7),
    name_ru     TEXT NOT NULL UNIQUE CHECK (length(trim(name_ru)) > 0)
) STRICT;

INSERT INTO weekdays (weekday_id, name_ru) VALUES
    (1, 'Понедельник'), (2, 'Вторник'), (3, 'Среда'), (4, 'Четверг'),
    (5, 'Пятница'), (6, 'Суббота'), (7, 'Воскресенье');

CREATE TABLE habit_schedules (
    schedule_id     INTEGER PRIMARY KEY,
    habit_id        INTEGER NOT NULL REFERENCES habits(habit_id) ON DELETE CASCADE,
    effective_from  TEXT NOT NULL CHECK (date(effective_from, '+0 days') IS effective_from),
    UNIQUE (habit_id, effective_from)
) STRICT;

-- Версию и её 1–7 дней приложение записывает одной транзакцией.
-- Семь разных дней означают ежедневную привычку.
CREATE TABLE schedule_weekdays (
    schedule_id  INTEGER NOT NULL REFERENCES habit_schedules(schedule_id) ON DELETE CASCADE,
    weekday_id   INTEGER NOT NULL REFERENCES weekdays(weekday_id) ON DELETE RESTRICT,
    PRIMARY KEY (schedule_id, weekday_id)
) STRICT;

CREATE TABLE habit_completions (
    habit_id    INTEGER NOT NULL REFERENCES habits(habit_id) ON DELETE CASCADE,
    local_date  TEXT NOT NULL CHECK (date(local_date, '+0 days') IS local_date),
    completed   INTEGER NOT NULL DEFAULT 1 CHECK (completed IN (0, 1)),
    updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        CHECK (strftime('%Y-%m-%dT%H:%M:%SZ', updated_at, '+0 seconds') IS updated_at),
    PRIMARY KEY (habit_id, local_date)
) STRICT;

CREATE TABLE habit_reminders (
    habit_id    INTEGER PRIMARY KEY REFERENCES habits(habit_id) ON DELETE CASCADE,
    enabled     INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
    local_time  TEXT CHECK (local_time IS NULL OR (
        local_time GLOB '[0-2][0-9]:[0-5][0-9]' AND local_time < '24:00'
    )),
    CHECK (enabled = 0 OR local_time IS NOT NULL)
) STRICT;

CREATE INDEX idx_habits_active_created ON habits (created_at, habit_id)
    WHERE archived_at IS NULL;
CREATE INDEX idx_schedule_weekdays_day ON schedule_weekdays (weekday_id, schedule_id);
CREATE INDEX idx_completions_date ON habit_completions (local_date, habit_id);
CREATE INDEX idx_reminders_enabled_time ON habit_reminders (local_time)
    WHERE enabled = 1;

PRAGMA user_version = 1;
COMMIT;
