-- Option 1: split Rust auth/account records from VWFD/public profiles.
-- Keep live public profiles as the observed 6-column shape.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    password_hash TEXT,
    subscription_tier TEXT NOT NULL DEFAULT 'free',
    public_profile_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_accounts_username ON accounts(username);
CREATE INDEX IF NOT EXISTS idx_accounts_public_profile ON accounts(public_profile_id);
