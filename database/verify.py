"""Проверка схемы и тестовых данных на новой SQLite БД в памяти."""
import sqlite3
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent


class DatabaseTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(':memory:')
        self.addCleanup(self.db.close)
        for script in ('schema.sql', 'seed_data.sql'):
            self.db.executescript((ROOT / script).read_text(encoding='utf-8'))

    def test_seed_integrity_and_schema_version(self):
        self.assertEqual(self.db.execute('PRAGMA integrity_check').fetchall(), [('ok',)])
        self.assertEqual(self.db.execute('PRAGMA foreign_key_check').fetchall(), [])
        self.assertEqual(self.db.execute('PRAGMA foreign_keys').fetchone(), (1,))
        self.assertEqual(self.db.execute('PRAGMA user_version').fetchone(), (1,))
        self.assertEqual(self.db.execute('SELECT count(*) FROM habits').fetchone(), (4,))
        self.assertEqual(self.db.execute('SELECT count(*) FROM weekdays').fetchone(), (7,))
        incomplete = self.db.execute('''
            SELECT s.schedule_id FROM habit_schedules AS s
            LEFT JOIN schedule_weekdays AS d USING (schedule_id)
            GROUP BY s.schedule_id HAVING count(d.weekday_id) NOT BETWEEN 1 AND 7
        ''').fetchall()
        self.assertEqual(incomplete, [])

    def test_invalid_data_and_identity_conflicts(self):
        invalid = (
            ("INSERT INTO habits(title) VALUES (char(9, 32, 10))", 'CHECK'),
            ("INSERT INTO habit_completions(habit_id, local_date) VALUES (1, '2026-11-19')", 'UNIQUE'),
            ("INSERT INTO habit_completions(habit_id, local_date) VALUES (99, '2026-11-30')", 'FOREIGN KEY'),
            ("INSERT INTO habit_completions(habit_id, local_date) VALUES (1, '2026-02-30')", 'CHECK'),
            ("INSERT INTO habit_schedules(habit_id, effective_from) VALUES (2, '2026-11-23')", 'UNIQUE'),
            ("INSERT INTO schedule_weekdays VALUES (21, 1)", 'UNIQUE'),
            ("INSERT INTO schedule_weekdays VALUES (21, 8)", 'FOREIGN KEY'),
            ("UPDATE habit_reminders SET local_time = '24:00' WHERE habit_id = 1", 'CHECK'),
            ("UPDATE habit_reminders SET local_time = NULL WHERE habit_id = 1", 'CHECK'),
        )
        for statement, constraint in invalid:
            with self.subTest(statement=statement):
                with self.assertRaisesRegex(sqlite3.IntegrityError, constraint):
                    self.db.execute(statement)

    def test_effective_schedule_and_archive_history(self):
        lookup = '''
            SELECT d.weekday_id FROM schedule_weekdays AS d
            WHERE d.schedule_id = (
                SELECT schedule_id FROM habit_schedules
                WHERE habit_id = 2 AND effective_from <= ?
                ORDER BY effective_from DESC LIMIT 1
            ) ORDER BY d.weekday_id
        '''
        self.assertEqual(self.db.execute(lookup, ('2026-11-22',)).fetchall(), [(1,), (3,), (5,)])
        self.assertEqual(self.db.execute(lookup, ('2026-11-23',)).fetchall(), [(2,), (4,)])
        history = 'SELECT local_date, completed FROM habit_completions WHERE habit_id = 3'
        self.assertEqual(self.db.execute(history).fetchall(), [('2026-11-14', 1)])
        self.db.execute('UPDATE habits SET archived_at = NULL WHERE habit_id = 3')
        self.assertEqual(self.db.execute(history).fetchall(), [('2026-11-14', 1)])
        self.db.execute('DELETE FROM habits WHERE habit_id = 3')
        self.assertEqual(self.db.execute(history).fetchall(), [])
        self.assertEqual(self.db.execute('PRAGMA foreign_key_check').fetchall(), [])

    def test_completion_cancel_preserves_one_record(self):
        self.db.execute('''
            INSERT INTO habit_completions (habit_id, local_date, completed, updated_at)
            VALUES (1, '2026-11-19', 0, '2026-11-19T18:30:00Z')
            ON CONFLICT (habit_id, local_date) DO UPDATE SET
                completed = excluded.completed, updated_at = excluded.updated_at
        ''')
        rows = self.db.execute('''
            SELECT completed, updated_at FROM habit_completions
            WHERE habit_id = 1 AND local_date = '2026-11-19'
        ''').fetchall()
        self.assertEqual(rows, [(0, '2026-11-19T18:30:00Z')])


if __name__ == '__main__':
    unittest.main(verbosity=2)
