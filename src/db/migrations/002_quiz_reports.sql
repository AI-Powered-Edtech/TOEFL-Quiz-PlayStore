CREATE TABLE IF NOT EXISTS quiz_reports (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    skill_id TEXT,
    section TEXT,
    student_name TEXT NOT NULL,
    quiz_topic TEXT NOT NULL,
    score INTEGER NOT NULL,
    correct_count INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    answers_snapshot TEXT NOT NULL,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

