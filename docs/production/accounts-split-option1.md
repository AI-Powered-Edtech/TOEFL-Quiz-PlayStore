# Option 1 — split auth accounts from public profiles

Implemented direction: keep live VWFD/public `profiles` as the observed 6-column table and move Rust auth/account identity into `accounts`.

## Ownership matrix

| Domain | Source of truth | Public projection |
|---|---|---|
| Auth identity | `accounts` | none |
| Password hash | `accounts.password_hash` | none |
| Subscription | `purchase_entitlements` + `accounts.subscription_tier` | none |
| Public profile | `profiles` | `profiles` |
| XP display | quiz/writing result tables + `profiles.total_xp` | `profiles.total_xp` |
| Friend code | `friend_codes` | not public |
| Friend relations | `friends` using account IDs | display via `accounts` + `profiles` |
| Leaderboard | `profiles.total_xp` | public-only rows |

## Runtime rules

- `accounts.id` is the canonical user/account ID and is stored in `user_id` columns.
- `profiles.id` is an integer public-profile ID and must only be reached through `accounts.public_profile_id`.
- Rust auth/login/register/profile/tier must not depend on rich columns in `profiles`.
- Public profile compatibility fields may still expose `full_name` and `xp`, but they are mapped from `accounts.full_name`/`profiles.username` and `profiles.total_xp`.

## UX impact

- Login/register no longer mutate the public profile table with rich auth columns.
- Quiz/writing rewards update public XP without crashing on missing `profiles.xp`.
- Leaderboard and friends show display-name/avatar/XP fallbacks even with the minimal public profile table.
- Account deletion removes the private account, linked public profile, and account-owned records.

## Remaining boundary

Older models may still define rich `Profile` fields for compile compatibility. New runtime paths should use `accounts`, `profiles` 6-column, or dedicated domain tables instead of adding rich columns back to public `profiles`.
