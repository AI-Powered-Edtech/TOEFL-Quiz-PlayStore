# Production-RuntimeGate-1

Implemented:

- Safe production migration gate script with dry-run default and explicit `--apply-live`.
- Rust 8082 runtime smoke script against a temporary copied DB.
- Friend code UI/service wiring to canonical Rust endpoint.
- OAuth callback migrated from rich `profiles` assumptions to `accounts + public profiles`.
- Seed script migrated to `accounts`.
- Admin monitoring user count migrated to `accounts`.
- Runtime endpoint ownership documented.

UX impact:

- Users can copy real server friend codes from Profile/Social Hub.
- Auth/profile/friend/leaderboard flows are smokeable end-to-end before shipping.
- OAuth users no longer hit missing public-profile rich columns.
- Admin health user count reflects private account rows, not public profile projections.

## Database boot gate

`src/db.rs` detects the live 6-column `profiles` shape, applies `migrations/production/*.sql`, and skips legacy rich-profile migrations. `SKIP_LEGACY_MIGRATIONS=1` forces this path for runtime smoke tests.
