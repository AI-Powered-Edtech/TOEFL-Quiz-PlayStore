-- Server-authoritative purchase entitlement cache.
-- Google Play verification writes here after server-side validation.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS purchase_entitlements (
    user_id TEXT PRIMARY KEY,
    tier TEXT NOT NULL,
    product_id TEXT,
    purchase_token TEXT,
    expiry_date TEXT,
    is_active INTEGER NOT NULL DEFAULT 0,
    verified_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_purchase_entitlements_active ON purchase_entitlements(is_active, expiry_date);
