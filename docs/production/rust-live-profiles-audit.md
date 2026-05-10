# Rust runtime vs live `profiles` schema audit

## Live schema observed

`data.db` currently exposes `profiles` as the VWFD/public profile shape:

| column | type |
|---|---|
| id | INTEGER PRIMARY KEY |
| username | TEXT |
| avatar_url | TEXT |
| total_xp | INTEGER |
| current_streak | INTEGER |
| is_public | INTEGER |

## Rust runtime assumptions found

Rust 8082 still has a richer auth/profile model and multiple services assume columns that are **not present** in the live 6-column table:

- `password_hash`
- `subscription_tier`
- `full_name`
- `bio`
- `friend_code`
- `hearts_count`
- `xp`
- `fcm_token`
- `peer_review_prefs`
- `created_at`
- `updated_at`

High-risk paths:

- `src/services/auth.rs`: register/login/get/update profile expects rich auth profile columns.
- `src/services/oauth.rs`: creates/fetches rich profile columns.
- `src/services/admin.rs`: `list_admins` and `change_tier` expect `subscription_tier`.
- `src/services/ai.rs`: token tier lookup expects `subscription_tier`.
- `src/services/profile.rs`, `src/services/social.rs`, `src/services/quiz.rs`, `src/services/writing.rs`: expect `full_name`, `friend_code`, or `xp`.

## Decision boundary

Do **not** expand auth/account flow against live `data.db` until one of these paths is chosen:

1. Migrate Rust auth to its own rich `profiles`/`accounts` schema with a deliberate live migration, or
2. Split public `profiles` from auth/account tables, keeping VWFD public profile shape intact.

The current account deletion endpoint is intentionally whitelist/idempotent and safe for both shapes, but login/register/profile update are not safe against the 6-column live DB.

## Re-run audit

```bash
scripts/audit-rust-live-profiles.sh data.db
```

## UX impact

- Account deletion UI can be exposed because it calls the authenticated deletion endpoint and clears local cache.
- Login/register/profile editing should not be expanded further until the schema split/migration is resolved, otherwise users may hit runtime failures when Rust 8082 points at the live 6-column `data.db`.
