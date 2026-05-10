# Production SQLite migrations

These migrations target the current live `data.db` shape used by the TOEFL Quiz Play Store hardening work.

Important boundary:

- `profiles` is intentionally kept as the observed 6-column live schema: `id`, `username`, `avatar_url`, `total_xp`, `current_streak`, `is_public`.
- Do not replace this with the richer legacy `src/db/migrations/001_initial_schema.sql` profile shape without a dedicated auth migration plan.
- VWFD tables are transitional workflow-backed tables. Rust 8082 remains authoritative for auth, payment, AI budget, quiz/writing, storage, and canonical moderation/security.

Smoke:

```bash
scripts/smoke-production-migrations.sh
```
