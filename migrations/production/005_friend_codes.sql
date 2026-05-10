-- Account-scoped friend codes for Option 1 accounts/public profiles split.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS friend_codes (
    account_id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_friend_codes_code ON friend_codes(code);
