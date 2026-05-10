# Production schema ownership

## Source-of-truth rule

- Rust 8082 is authoritative for auth, payment, AI budget, quiz/writing, real storage, canonical social, and canonical moderation/security.
- VWFD 8083 is a companion workflow runtime for public reads, simple admin utilities, audit append, simple registries, and transitional CRUD.
- Frontend local storage is only cache, draft, or offline queue.

## Live profile caveat

The live `profiles` table currently has only 6 columns:

| column | type | note |
|---|---|---|
| id | INTEGER PRIMARY KEY | live shape |
| username | TEXT | public identity |
| avatar_url | TEXT | profile image URL/cache |
| total_xp | INTEGER | public progress summary |
| current_streak | INTEGER | public progress summary |
| is_public | INTEGER | profile visibility |

Always recon live schema before querying `profiles`.

## Sprint 4 / 4B transitional tables

| table | owner | status | UX impact |
|---|---|---|---|
| audit_logs | VWFD transitional | audit append | Admin actions become easier to trace. |
| creator_profiles | VWFD transitional | creator MVP | Creator dashboard has persistent server-backed records. |
| creator_revenue_events | VWFD transitional | creator MVP | Revenue history can survive reload. |
| creator_payouts | VWFD transitional | creator MVP | Payout requests are not only local UI state. |
| question_bank_admin | VWFD transitional | admin CRUD MVP | Admin question edits can persist in DB. |
| user_media_assets | VWFD transitional | registry only | Media metadata persists; binary storage still needs Rust storage hardening. |
| circle_messages_v2 | VWFD transitional | messages MVP | Circle messages can poll server-backed history. |
| oracle_prediction_history | VWFD transitional | history MVP | Prediction history survives reload/device better than local-only. |
| moderation_reports | mixed/Rust target | transition | Reports are persisted; security authority should move to Rust/auth layer. |
