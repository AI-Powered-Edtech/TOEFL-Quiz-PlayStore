# Runtime endpoint ownership

## Canonical Rust 8082

- Auth/account: `/api/auth/*`
- Account deletion: `DELETE /api/auth/account`
- Purchase entitlement/payment: `/api/purchases/*`
- AI token budget: `/api/ai/*`
- Quiz/writing progress mutation: `/api/quiz/*`, `/api/writing/*`
- Friend mutations and private social reads: `/api/social/friends*`
- Admin/security: `/api/admin/*`, `/api/admin-monitoring/*`

## VWFD 8083 companion

- Public read-only/profile/leaderboard where no authenticated mutation is required.
- Transitional admin utility/audit append/media registry workflows.
- Health and workflow-backed MVP reads.

## Rule

Server mutation source of truth is Rust. VWFD can speed up public reads but must not become auth/payment/security canonical logic.

## UX impact

Users should see the same account/profile/XP facts across Dashboard, Profile, Social Hub, and public pages. Public pages can be fast via VWFD; authenticated account changes must settle through Rust.
