-- Minimal Rust runtime support tables compatible with accounts + 6-column public profiles.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS admin_users (
    user_id TEXT PRIMARY KEY,
    email TEXT,
    role TEXT DEFAULT 'admin',
    pin_hash TEXT,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS friends (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    friend_id TEXT NOT NULL,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    UNIQUE(user_id, friend_id)
);
CREATE INDEX IF NOT EXISTS idx_friends_user ON friends(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS quiz_results (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    skill_id TEXT,
    section TEXT NOT NULL,
    score INTEGER NOT NULL,
    correct_count INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    xp_earned INTEGER NOT NULL,
    breakdown TEXT
);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user ON quiz_results(user_id, date DESC);

CREATE TABLE IF NOT EXISTS user_performance_metrics (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    total_questions INTEGER NOT NULL DEFAULT 0,
    correct_answers INTEGER NOT NULL DEFAULT 0,
    accuracy_by_section TEXT NOT NULL DEFAULT '{}',
    accuracy_by_skill TEXT NOT NULL DEFAULT '{}',
    recent_accuracy TEXT NOT NULL DEFAULT '[]',
    average_response_time REAL NOT NULL DEFAULT 0.0,
    current_difficulty TEXT NOT NULL DEFAULT 'medium',
    last_updated INTEGER NOT NULL DEFAULT 0
);
