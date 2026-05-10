-- TOEFL Quiz production live baseline schema.
-- Purpose: preserve the currently observed data.db shape, especially the 6-column profiles table.
-- Safe to run repeatedly on a fresh or existing SQLite DB.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY,
    username TEXT,
    avatar_url TEXT,
    total_xp INTEGER,
    current_streak INTEGER,
    is_public INTEGER
);

CREATE TABLE IF NOT EXISTS app_logs (
    id INTEGER PRIMARY KEY,
    resolved INTEGER,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS blog_posts (
    id INTEGER PRIMARY KEY,
    skill_id TEXT,
    title TEXT,
    summary TEXT,
    hero_image TEXT,
    updated_at TEXT,
    published INTEGER
);

CREATE TABLE IF NOT EXISTS cefr_results (
    id INTEGER PRIMARY KEY,
    band TEXT,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS peer_review_submissions (
    id INTEGER PRIMARY KEY,
    status TEXT,
    claimed_by TEXT,
    claimed_at TEXT
);
