-- Вымышленные примеры. Выполнять один раз в новой БД после schema.sql.
PRAGMA foreign_keys = ON;
BEGIN;

INSERT INTO habits (habit_id, title, description, created_at, archived_at) VALUES
    (1, 'Читать 20 минут', 'Чтение вечером', '2026-11-12T17:00:00Z', NULL),
    (2, 'Гулять 30 минут', 'Прогулка после занятий', '2026-11-12T17:05:00Z', NULL),
    (3, 'Утренняя зарядка', NULL, '2026-11-12T17:10:00Z', '2026-11-20T06:00:00Z'),
    (4, 'Вести дневник', NULL, '2026-11-23T16:00:00Z', NULL);

INSERT INTO habit_schedules (schedule_id, habit_id, effective_from) VALUES
    (11, 1, '2026-11-12'),
    (21, 2, '2026-11-12'),
    (22, 2, '2026-11-23'),
    (31, 3, '2026-11-12'),
    (41, 4, '2026-11-23');

INSERT INTO schedule_weekdays (schedule_id, weekday_id)
SELECT schedules.schedule_id, days.weekday_id
FROM (SELECT 11 AS schedule_id UNION ALL SELECT 41) AS schedules
CROSS JOIN weekdays AS days;

INSERT INTO schedule_weekdays (schedule_id, weekday_id) VALUES
    (21, 1), (21, 3), (21, 5),
    (22, 2), (22, 4),
    (31, 6), (31, 7);

INSERT INTO habit_completions (habit_id, local_date, completed, updated_at) VALUES
    (1, '2026-11-19', 1, '2026-11-19T18:00:00Z'),
    (1, '2026-11-20', 0, '2026-11-20T19:02:00Z'),
    (1, '2026-11-23', 1, '2026-11-23T18:15:00Z'),
    (2, '2026-11-18', 1, '2026-11-18T15:45:00Z'),
    (2, '2026-11-24', 1, '2026-11-24T15:45:00Z'),
    (3, '2026-11-14', 1, '2026-11-14T06:20:00Z');

INSERT INTO habit_reminders (habit_id, enabled, local_time) VALUES
    (1, 1, '21:00'), (2, 0, '18:30'), (3, 1, '08:00');

COMMIT;
