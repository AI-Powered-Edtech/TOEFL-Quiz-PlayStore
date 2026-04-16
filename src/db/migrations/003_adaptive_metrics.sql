CREATE TABLE IF NOT EXISTS user_performance_metrics (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    total_questions INTEGER NOT NULL DEFAULT 0,
    correct_answers INTEGER NOT NULL DEFAULT 0,
    accuracy_by_section TEXT NOT NULL, -- JSON
    accuracy_by_skill TEXT NOT NULL,   -- JSON
    recent_accuracy TEXT NOT NULL,     -- JSON array
    average_response_time REAL NOT NULL DEFAULT 0.0,
    current_difficulty TEXT NOT NULL DEFAULT 'medium',
    last_updated INTEGER NOT NULL
);
