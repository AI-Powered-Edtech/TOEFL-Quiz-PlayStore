# Sprint Production priorities 5-9 hardening

This batch moves the app closer to production-grade behavior without claiming the full blueprint is complete.

## Implemented

- Auth/account deletion: `DELETE /api/auth/account` deletes server-owned user data by authenticated JWT subject.
- Admin security: tier and role updates now validate allowed values and block self-demotion/self-removal for super admins.
- Quiz/writing source of truth: existing Rust endpoints remain canonical; frontend local state remains cache/fallback.
- Purchase entitlement: `GET /api/purchases/entitlement` exposes server-side entitlement state backed by `purchase_entitlements`. Purchase verification writes to this server table after Google validation.
- Storage: uploaded/served filenames are constrained, audio upload validates MP3/WAV magic bytes, and upload root is configurable with `UPLOAD_DIR`.
- Android release gate: `scripts/android-release-gate.sh` checks production env, Android manifest safety flags, build, Capacitor sync, and optional bundle.

## UX impact

- Users get a real account deletion path for compliance and privacy expectations.
- Paid plan UI can refresh from server entitlement instead of trusting local-only tier state.
- File/media behavior fails earlier with clearer errors for unsafe or unsupported files.
- Release candidates are less likely to ship with localhost URLs or unsafe Android backup settings.

## Remaining risks

- Rust 8082 still has older rich `profiles` assumptions while live VWFD `data.db` has a 6-column `profiles` table. Keep recon before runtime auth work.
- Android bundle/signing still depends on local keystore configuration.
- Real object storage/CDN is not implemented; local upload storage is hardened but still local filesystem based.
- Some frontend direct fetches remain valid external/blob probes but should be periodically audited.
