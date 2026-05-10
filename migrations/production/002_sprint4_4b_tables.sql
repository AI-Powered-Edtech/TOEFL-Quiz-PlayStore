-- Sprint 4 / 4B production hardening tables.
-- VWFD uses these as transitional workflow-backed tables; Rust 8082 remains the security/payment/auth core.
-- Safe to run repeatedly on a fresh or existing SQLite DB.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS moderation_reports (
    id TEXT PRIMARY KEY,
    reporter_id TEXT NOT NULL,
    content_type TEXT NOT NULL,
    content_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    resolved_by TEXT,
    resolution_note TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    resolved_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_mod_reports_status ON moderation_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mod_reports_target ON moderation_reports(content_type, content_id);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    actor_id TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    metadata TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at DESC);

CREATE TABLE IF NOT EXISTS creator_profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    revenue_share_bps INTEGER NOT NULL DEFAULT 7000,
    status TEXT NOT NULL DEFAULT 'pending',
    total_earnings INTEGER NOT NULL DEFAULT 0,
    pending_earnings INTEGER NOT NULL DEFAULT 0,
    payout_method TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS creator_revenue_events (
    id TEXT PRIMARY KEY,
    creator_id TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_id TEXT NOT NULL,
    gross_amount INTEGER NOT NULL,
    platform_fee INTEGER NOT NULL,
    creator_amount INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_creator_events_creator ON creator_revenue_events(creator_id, created_at DESC);

CREATE TABLE IF NOT EXISTS creator_payouts (
    id TEXT PRIMARY KEY,
    creator_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'requested',
    requested_at TEXT NOT NULL DEFAULT (datetime('now')),
    processed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_creator_payouts_creator ON creator_payouts(creator_id, requested_at DESC);

CREATE TABLE IF NOT EXISTS question_bank_admin (
    id TEXT PRIMARY KEY,
    skill_id INTEGER NOT NULL,
    section TEXT NOT NULL,
    interaction TEXT NOT NULL,
    prompt TEXT NOT NULL,
    choices_json TEXT NOT NULL DEFAULT '[]',
    correct_response_json TEXT NOT NULL DEFAULT '[]',
    cefr_target TEXT NOT NULL DEFAULT 'B1',
    difficulty_score INTEGER NOT NULL DEFAULT 50,
    stimulus_json TEXT NOT NULL DEFAULT '{}',
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_question_bank_section ON question_bank_admin(section, skill_id);

CREATE TABLE IF NOT EXISTS user_media_assets (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    asset_type TEXT NOT NULL,
    url TEXT NOT NULL,
    label TEXT,
    mime_type TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_media_owner_type ON user_media_assets(owner_id, asset_type, created_at DESC);

CREATE TABLE IF NOT EXISTS circle_messages_v2 (
    id TEXT PRIMARY KEY,
    circle_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_circle_messages_v2 ON circle_messages_v2(circle_id, created_at DESC);

CREATE TABLE IF NOT EXISTS oracle_prediction_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    test_type TEXT NOT NULL,
    predicted_score REAL NOT NULL,
    breakdown_json TEXT NOT NULL DEFAULT '{}',
    confidence_level TEXT NOT NULL DEFAULT 'low',
    data_points INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_oracle_prediction_history_user ON oracle_prediction_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_oracle_prediction_history_test ON oracle_prediction_history(user_id, test_type, created_at DESC);
