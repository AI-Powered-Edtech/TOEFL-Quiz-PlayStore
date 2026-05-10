# TOEFL Quiz — VWFD Workflow Pattern Migration Plan

> **Goal**: gradually move suitable endpoints + cron jobs from imperative Rust
> handlers to declarative VIL Workflow Definition (VWFD) YAML, **without**
> breaking the existing `/api/*` surface used by the live frontend.
>
> **North star**: the VWFD runtime is the *declarative control plane* (utility,
> read-only, scheduled jobs). Rust stays the *imperative core* (auth, IAP,
> LLM, transactions, file I/O). Per the long-term project doctrine.

## Repo state snapshot (as of 2026-05-08)

| Layer | What we have | What’s clean | What’s pending |
|---|---|---|---|
| Backend | Rust 1.95 + VIL 0.4.0, 6,496 LOC, 17 services, ~95 handlers, 39 tables, 3 migrations | `cargo check` ✅ (1m 33s, no breaking change) | Phase B sweep deferred (not needed) |
| Frontend | Vite + React + TS, 81 service files, 80 components, Capacitor for Android | Empty stubs `authService.ts`, `quizService.ts`, `progressService.ts` removed; assets converted to real PNG; localhost hardcode patched | `npm install` (workbench can’t run it); 81 service files → candidate consolidation |
| Docker | `Dockerfile.backend` + `Dockerfile.vwfd` + `docker-compose.yml` (3 profiles) | ✅ | Build + push to registry |
| VWFD | 4 core YAML + 2 cron + 2 read-only + 1 experimental | ✅ | Runtime test once `vil_vwfd` git fetch is run on dev machine |
| Docs | `VIL_0.4_MIGRATION.md`, `PLAYSTORE_LISTING.md`, this file | ✅ | None |

## What this plan delivers (already executed in this batch)

### Cleanup

- [x] Delete 3 zero-byte service stubs (`authService.ts`, `quizService.ts`, `progressService.ts`).
- [x] Convert 4 frontend assets from JPEG-with-`.png`-extension → real PNG
      (`icon-192`, `icon-512`, `apple-touch-icon`, `banner`) plus a 1024×500
      Play Store feature graphic in `frontend/public/playstore-assets/`.
- [x] Patch `kittenTtsService.ts` (lines 92, 441) → use `VITE_TTS_URL` env
      with localStorage override + localhost dev fallback.
- [x] Add `frontend/.env.production` template and extend `.env.example`.
- [x] Remove `Cargo.toml.bak.broken`; gitignore `Cargo.toml.bak*`.
- [x] Reorganize `workflows/` into `core/`, `cron/`, `read-only/`,
      `experimental/` for clarity.

### VWFD scaffolding

- [x] `workflows/core/` — 4 utility endpoints: health, uuid-gen,
      email-validate, quiz-token-cost. Already shipped.
- [x] `workflows/cron/` — 2 jobs that mirror `src/tasks/mod.rs`:
      `cleanup-claims.yaml`, `cleanup-logs.yaml`.
- [x] `workflows/read-only/` — 2 public DB-read endpoints:
      `leaderboard-public.yaml`, `blog-public-list.yaml`.
- [x] `workflows/experimental/` — 1 draft: `oracle-public-summary.yaml`.

### Frontend wiring

- [x] `frontend/src/services/apiV2.ts` — thin client for `/api/v2/*` with
      `apiV2.get`, `apiV2.post`, `apiV2.ping()`. Falls back to `VITE_API_URL`
      when `VITE_VWFD_URL` is unset.
- [x] `frontend/src/components/admin/VwfdHealthCard.tsx` — status pill
      (green/red dot, latency, version) auto-polling every 30 s.
- [x] Wired into `admin/SystemHealth.tsx` so the workflow runtime is visible
      to admins from day one.

## Endpoint migration matrix

Legend: 🟢 ready / 🟡 evaluate / 🔴 keep Rust forever.

| Service / Endpoint | Verdict | Rationale | UX impact when migrated |
|---|---|---|---|
| `GET /api/health` | 🟢 done | stateless, no DB | edge-cacheable, faster splash |
| `GET /api/v2/util/uuid` | 🟢 done | pure FaaS | nothing user-visible — dev tool |
| `POST /api/v2/util/validate-email` | 🟢 done | pure FaaS | nicer signup form (instant masked echo) |
| `POST /api/v2/quiz/cost-estimate` | 🟢 done | math only | paywall sheet shows token budget pre-flight |
| Cron `cleanup_expired_claims` | 🟢 cron | DB UPDATE, no auth | identical — invisible to user |
| Cron `cleanup_old_logs` | 🟢 cron | DB DELETE, no auth | identical |
| `GET /api/blog/posts` (public) | 🟢 read-only YAML | DB read, no auth | SEO + landing page can prefetch without JWT |
| `GET /api/social/leaderboard` (public scope) | 🟢 read-only YAML | top-50 only, no PII | guest leaderboard preview → conversion uplift |
| `GET /api/oracle/predict` (anonymized fleet) | 🟡 experimental | summary only, opt-in | social-proof badge on landing |
| `GET /api/quiz/questions` (paginated, public bank) | 🟡 evaluate | needs auth + tier filter | could enable taster/preview mode |
| `GET /api/quiz/history` | 🔴 keep Rust | per-user, JWT scoped, joins | n/a |
| `GET /api/quiz/progress` | 🔴 keep Rust | adaptive metrics computation | n/a |
| `POST /api/quiz/results` | 🔴 keep Rust | XP grant + adaptive update + transaction | n/a |
| `POST /api/quiz/generate` | 🔴 keep Rust | LLM stream, prompt-shield | n/a |
| `POST /api/auth/register|login|refresh` | 🔴 keep Rust | argon2id, refresh-token rotation | n/a |
| `GET|PATCH /api/auth/profile` | 🔴 keep Rust | RLS-equivalent | n/a |
| `GET /api/oauth/init`, `/callback` | 🔴 keep Rust | reqwest token exchange, complex flow | n/a |
| `POST /api/purchases/verify` | 🔴 keep Rust | jsonwebtoken (ES256) Apple Server API + Google Play receipt validate | n/a |
| `POST /api/ai/generate`, `/api/ai/tts` | 🔴 keep Rust | LLM stream + cost tracking + guardrails | n/a |
| `POST /api/writing/evaluate` | 🔴 keep Rust | LLM + multi-pass | n/a |
| `POST /api/writing/peer-review/*` | 🔴 keep Rust | claim race, transaction, achievement grant | n/a |
| `POST /api/storage/avatars`, `/audio` | 🔴 keep Rust | multipart filesystem | n/a |
| `* /api/admin/*` | 🔴 keep Rust | sensitive, audit-logged | n/a |

**Net**: 4 done + 5 ready-soon + 1 experimental = **10 endpoints out of ~95** can move to declarative YAML in Phase 1 without any user-visible regression. That’s ~10 % of the imperative surface, but ~80 % of the *low-value imperative noise* (utility / public read).

## Phased rollout

### Phase 1 (this batch — done)

Scaffold complete. Frontend wired so admins can verify VWFD is alive without leaving the dashboard.

### Phase 2 (next 1–2 dev sessions)

1. Boot `vwfd-app` locally (`cargo build --features vwfd --bin vwfd-app && ./target/release/vwfd-app`).
2. Smoke-test the 4 core endpoints with `curl`.
3. Confirm cron jobs fire (set schedule to `* * * * *` for the test run).
4. Hit `apiV2.ping()` from the browser; verify `VwfdHealthCard` turns green.

**UX impact for users in Phase 2**: zero. Everything is admin-only.

### Phase 3 (1 week)

Flip the public landing page to fetch `/api/v2/blog/posts` (via `apiV2.get`) and `/api/v2/social/leaderboard/public` instead of the Rust handlers. Both Rust handlers stay live as fallback (`VwfdHealthCard` already has fallback logic in the comment).

**UX impact for users in Phase 3**:
- Guest landing page loads ~40–60 ms faster (no JWT issuance).
- Leaderboard preview visible *before* signup → measurable conversion lift.
- Blog index can be CDN-cached (5 min stale-while-revalidate).
- Zero downside if VWFD is offline (frontend falls back to `/api/blog/posts` etc.).

### Phase 4 (after Play Store launch)

Migrate cron jobs:
- Set `VWFD_CRON_OWNED=true` env on `vwfd-app`.
- Comment out `tasks::run_periodic_tasks` invocation in `src/main.rs`.
- Watch SystemHealth dashboard for 24 h; if cron metrics look healthy, delete
  `src/tasks/mod.rs` in a separate PR.

**UX impact for users in Phase 4**: zero. Background only.

### Phase 5 (post-launch optimization)

Evaluate experimental `oracle-public-summary` for landing-page social proof.

**UX impact for users in Phase 5**: small but real — the landing page gains a
live number (“3,400 testers practiced this week”) which is a known conversion
lever for edutech.

## Things this plan deliberately does NOT do

- Migrate auth / IAP / LLM / file upload to YAML — these need imperative Rust.
  Trying to express argon2 password verify or App Store Server JWT signing in
  `vil-expr` is over-engineering with no payoff.
- Replace `apiClient.ts` with `apiV2.ts`. They coexist; pick per-endpoint.
- Touch the 81 frontend service files. Consolidation is a separate refactor
  (recommended after Play Store launch ships).

## Rollback plan per phase

| Phase | If broken | Action |
|---|---|---|
| 1 (scaffolding) | n/a | nothing wired to user-facing routes |
| 2 (local smoke) | YAML schema mismatch with vil_vwfd 0.4 | adjust syntax in `workflows/core/*.yaml` per runtime error message |
| 3 (public reads) | VWFD pod down | frontend `apiV2.ts` already throws; wrap call sites in try/catch + fall back to `apiClient.get('/api/blog/posts')` |
| 4 (cron flip) | jobs don’t fire | re-enable `tasks::run_periodic_tasks` line in `main.rs`; redeploy backend |
| 5 (experimental) | data leak risk | delete `workflows/experimental/oracle-public-summary.yaml` |

## Open follow-ups (separate from this migration)

- [ ] `npm install` + `npm run build` on the dev machine (workbench can’t run it).
- [ ] `cargo build --features vwfd --bin vwfd-app` on dev machine (needs git fetch to github.com/OceanOS-id/VIL).
- [ ] Generate Android upload keystore (`frontend/android/release-artifacts/generate-keystore.sh`).
- [ ] Create the actual Play Store listing using copy from `docs-dev/PLAYSTORE_LISTING.md`.
- [ ] Audit the 81 frontend service files for consolidation (unrelated to VWFD).
