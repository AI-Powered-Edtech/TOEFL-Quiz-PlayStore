# VIL 0.4.0 Migration Plan — TOEFL Quiz

> Source of truth for upgrading from VIL 0.1.x/0.2.x to 0.4.0 (released 2026-04-18).
> Companion VWFD binary added; existing imperative backend kept intact.

## TL;DR

| | Before | After |
|---|---|---|
| `vil` crate | 0.2.1 | 0.4 |
| `vil_server`, `vil_server_core` | 0.1.14 | 0.4 |
| `vil_orm`, `vil_orm_derive`, `vil_json`, `vil_server_macros`, `vil_server_test` | 0.1 | 0.4 |
| `vil_migrate` | 0.2.0 | 0.4 |
| Workflow pattern | none | new `vwfd-app` binary on port 8083 |
| Container image | none | `Dockerfile.backend` + `Dockerfile.vwfd` |

## License clearance

- ~165 library crates (Apache 2.0 / MIT) — **unchanged**, free for any use.
- 7 VSAL crates: `vil_vwfd`, `vil_vwfd_macros`, `vil_server_provision`, `vil_cli`, `vil_cli_server`, `vil_workflow_v2`, `vil_operator`.
- TOEFL Quiz qualifies under **§3.6 Significant Business Process Exception** (educational/LMS scenario explicitly listed). Internal VWFD use permitted.
- Forbidden: exposing runtime workflow upload to *third-party customers* as a primary product. Our `/api/v2/*` endpoints serve quiz logic — that's a Significant Business Process, not WaaS reselling.

## What this migration adds

1. **Two Dockerfiles**
   - `Dockerfile.backend` — multi-stage build of `toefl-quiz-backend` (existing imperative code).
   - `Dockerfile.vwfd` — uses pre-built `vilfounder/vil:0.4.0-slim` (~50 MB distroless) to host workflow YAML.

2. **`docker-compose.yml`** — three profiles:
   - `backend` → port 8082 (existing API).
   - `vwfd`    → port 8083 (new workflow API at `/api/v2/*`).
   - `all`     → both + nginx frontend on port 8080.

3. **`workflows/`** (4 sample VWFD YAML)
   - `health.yaml` — `GET /api/v2/health`
   - `uuid-gen.yaml` — `GET /api/v2/util/uuid`
   - `email-validate.yaml` — `POST /api/v2/util/validate-email`
   - `quiz-token-cost.yaml` — `POST /api/v2/quiz/cost-estimate`

4. **`src/bin/vwfd-app.rs`** — companion binary that boots `vil_vwfd::app(...)`, behind feature flag `vwfd`.

5. **`scripts/migrate-vil-0.4.sh`** — idempotent helper that bumps Cargo.toml and runs `cargo update`. Re-run safely.

## Step-by-step

### Phase A — Version bump (✅ done by this batch)

- `Cargo.toml.bak.0.2.1` saved.
- `vil = "0.4"`, `vil_server = "0.4"`, all sub-crates aligned to `"0.4"`.
- New optional deps: `vil_vwfd`, `vil_vwfd_macros` (git tag v0.4.0).
- New feature: `vwfd = ["dep:vil_vwfd", "dep:vil_vwfd_macros"]`.

### Phase B — Compile fix sweep (manual, after first `cargo check`)

Expected breaking surfaces (test each, patch as needed):

| Surface | Files affected | Likely fix |
|---|---|---|
| `vil_orm_derive::VilEntity` attributes | 13 model files (`src/models/*.rs`) | check derive macro signature in 0.4 — may need explicit `#[entity(table = "...")]` |
| `vil::prelude::*` re-exports | 18 files | individual re-exports may have moved; let compiler tell you |
| `vil::vil_db_sqlx::{SqlxConfig, SqlxPool}` | `src/db.rs`, `src/tasks/mod.rs` | path may collapse to `vil::db::sqlx::*` |
| `vil_server::axum::*` direct imports | `src/error.rs`, `src/middleware/auth.rs` | axum likely bumped 0.7 → 0.8; check `IntoResponse`, `FromRequestParts` signatures |
| `vil_migrate::Migrator` | `src/db.rs` | API stability across 0.2 → 0.4 unverified |
| `vil::ai::{ChatMessage, OpenAiConfig, OpenAiProvider, GuardrailsEngine}` | `src/services/quiz.rs`, `src/services/writing.rs`, `src/services/ai.rs` | re-exports stable per README; verify with cargo |

When a breakage appears, add the sed patch to `scripts/migrate-vil-0.4.sh` Step 2 and re-run on fresh checkout.

### Phase C — VWFD companion (this batch scaffolded it)

```bash
# Build (requires git network access for vil_vwfd)
cargo build --release --features vwfd --bin vwfd-app

# Run
VIL_BIND_ADDR=0.0.0.0:8083 ./target/release/vwfd-app

# Test
curl http://localhost:8083/api/v2/health
curl http://localhost:8083/api/v2/util/uuid
curl -X POST -H 'Content-Type: application/json' \
     -d '{"email":"boim@example.com"}' \
     http://localhost:8083/api/v2/util/validate-email
```

### Phase D — Containerized deploy

```bash
# Build both images
docker compose --profile all build

# Run full stack locally
docker compose --profile all up

# Production (push to registry, pull on LXC 10.10.0.14):
docker tag toeflquiz/backend:0.2.1-vil040 registry.vastar.id/toeflquiz/backend:0.2.1-vil040
docker push registry.vastar.id/toeflquiz/backend:0.2.1-vil040
```

### Phase E — Gradual workflow migration (optional, multi-week)

Move non-stateful endpoints to VWFD one-by-one:

| Endpoint | Current | Migrate to YAML? |
|---|---|---|
| `GET /api/health` | imperative | ✅ trivial (already done as `/api/v2/health`) |
| `GET /api/quiz/list` | imperative + DB | ⚠️ DB connector needs Rust — keep imperative |
| `POST /api/auth/login` | argon2 + JWT | ⚠️ keep imperative (security-critical) |
| Stat helpers / cost estimators | imperative | ✅ great VWFD candidate (FaaS-heavy) |
| Webhook receivers | imperative | ✅ ideal (`vil_trigger_webhook`) |
| Cron jobs | `tasks/mod.rs` | ✅ migrate to `vil_trigger_cron` |

## Rollback

```bash
# Restore Cargo.toml
mv Cargo.toml Cargo.toml.0.4-failed
mv Cargo.toml.bak.0.2.1 Cargo.toml
cargo update
```

VWFD scaffolding files (`Dockerfile.vwfd`, `workflows/`, `src/bin/vwfd-app.rs`) are non-invasive — leave them in place; they only compile when `--features vwfd` is set.
