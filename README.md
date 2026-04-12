# TOEFL Quiz — VIL Rust Native Backend

> Backend untuk aplikasi TOEFL Quiz Generator, dibangun dengan [VIL Framework](https://vastar.id/docs/vil) (Vastar Intermediate Language) — process-oriented zero-copy Rust framework.

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | [VIL](https://crates.io/users/cxl-silicon-dev) (VilApp + ServiceProcess + Tri-Lane mesh) |
| Runtime | Rust + Tokio |
| Database | SQLite (WAL mode) via `vil_db_sqlx` |
| Auth | JWT (jsonwebtoken) + Argon2id (password hashing) |
| AI | Groq API proxy (server-side, SSE-ready) |
| Logging | vil_log (SPSC ring buffer, 7 semantic log types) |
| Observability | VIL Observer Dashboard (built-in) |

## Quick Start

```bash
# Clone
git clone https://git.vastar.ai/toef-ibrohim.git
cd toef-ibrohim

# Setup environment
cp .env.example .env
# Edit .env — minimal: JWT_SECRET

# Run (development)
DATABASE_URL="sqlite:data.db" JWT_SECRET="your-secret" cargo run

# Run E2E tests (server harus jalan di port 18082)
DATABASE_URL="sqlite:test_e2e.db" JWT_SECRET="e2e-test-key" PORT=18082 cargo run &
sleep 5
cargo test --test e2e -- --test-threads=1
```

## Server Output

```
╔══════════════════════════════════════════════════╗
║  VX — Process-Oriented Server (Tri-Lane)        ║
╚══════════════════════════════════════════════════╝

  App:          toefl-quiz
  Port:         8082
  Heap:         64 MB
  Services:     11
  Endpoints:    68
  Mesh routes:  11

  vil-server: toefl-quiz
  Listening:    http://0.0.0.0:8082
  Health:       http://localhost:8082/health
  Metrics:      http://localhost:8082/metrics
  Observer:     http://localhost:8082/_vil/dashboard/
```

## Architecture

```
┌──────────────────────────────────────────────────┐
│              React Frontend (existing)            │
│         VITE_API_URL=http://localhost:8082        │
└──────────────────┬───────────────────────────────┘
                   │ HTTPS (JSON API)
┌──────────────────▼───────────────────────────────┐
│            VIL Backend (1 binary)                  │
│                                                    │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐             │
│  │  auth   │ │  quiz   │ │   ai    │  ...8 more  │
│  │:process │ │:process │ │:process │  services   │
│  └────┬────┘ └────┬────┘ └────┬────┘             │
│       └───────────┼───────────┘                   │
│          Tri-Lane SHM Mesh (~1-5μs per hop)       │
│                   │                                │
│            ┌──────▼──────┐                         │
│            │  SQLite WAL │  35 tables, 25 indexes  │
│            └─────────────┘                         │
└──────────────────────────────────────────────────┘
```

## Services (11)

| Service | Prefix | Endpoints | Description |
|---------|--------|-----------|-------------|
| **auth** | `/api/auth` | 5 | Register, login, JWT refresh, profile CRUD |
| **admin** | `/api/admin` | 5 | Role management, audit logs, PIN verify |
| **quiz** | `/api/quiz` | 5 | Questions, simulation, results, XP, progress |
| **ai** | `/api/ai` | 3 | Groq proxy, TTS, token budget enforcement |
| **writing** | `/api/writing` | 13 | Gym progress, sessions, exercise pool, essay evaluation, vocabulary, devils advocate, peer review |
| **social** | `/api/social` | 13 | Circles, messages, friends, leaderboard, predictions, achievements, notifications |
| **creator** | `/api/creator` | 8 | Creator registration, daily bites, view tracking (Rp10/view), tips (15% fee), payouts, stats |
| **monitoring** | `/api/monitoring` | 2 | Batch log/metric ingestion |
| **storage** | `/api/storage` | 4 | Avatar/audio upload + serve (PNG/JPG/MP3 validation) |
| **blog** | `/api/blog` | 4 | Published posts (public) + admin CRUD |
| **admin-monitoring** | `/api/admin-monitoring` | 6 | System health, errors, feature flags, moderation reports |
| | | **68** | |

### VIL Built-in (gratis)

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /ready` | Readiness probe |
| `GET /metrics` | Prometheus-compatible metrics |
| `GET /info` | Server info + uptime |
| `GET /_vil/dashboard/` | Real-time Observer dashboard |

## API Overview

### Auth

```bash
# Register
curl -X POST http://localhost:8082/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"ibrohim","password":"test12345","full_name":"Ibrohim"}'

# Login
curl -X POST http://localhost:8082/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"ibrohim","password":"test12345"}'

# Profile (authenticated)
curl http://localhost:8082/api/auth/profile \
  -H 'Authorization: Bearer <token>'
```

### Quiz

```bash
# Save quiz result (XP auto-calculated from JWT user)
curl -X POST http://localhost:8082/api/quiz/results \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{"section":"structure","score":80,"correct_count":8,"total_questions":10}'

# Progress
curl http://localhost:8082/api/quiz/progress \
  -H 'Authorization: Bearer <token>'
```

### AI (Groq Proxy)

```bash
# Generate (server-side token budget enforcement)
curl -X POST http://localhost:8082/api/ai/generate \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"Explain TOEFL structure"}],"model":"llama-3.3-70b-versatile"}'

# Token usage
curl http://localhost:8082/api/ai/token-usage \
  -H 'Authorization: Bearer <token>'
# → {"used":0,"limit":15,"remaining":15,"tier":"free"}
```

## Database

35 optimized tables (consolidated from 69 Supabase originals):

| Category | Tables | Key Merges |
|----------|--------|-----------|
| Auth & Admin | 3 | profiles, admin_users, admin_audit_logs |
| Quiz | 5 | question_bank, passages, quiz_results, user_question_history, cefr_results |
| AI & Token | 3 | ai_token_usage, subscriptions, feature_usage |
| Writing & Essay | 9 | writing_sessions (merged 3 tables), writing_submissions (merged 2), model_essays (merged 2), + vocab, devils_advocate |
| Peer Review | 3 | submissions, reviews, reviewer_profiles (merged stats+qualifications) |
| Social | 7 | circles, members, messages, friends, notifications, predictions (merged 2), achievements |
| Creator Economy | 5 | creators, daily_bites, bite_interactions (merged 2), transactions (merged 3), creator_earnings |
| Monitoring | 4 | app_logs (merged 2), app_metrics, alert_config, alert_history |
| System | 3 | feature_flags, content_reports, blog_posts |

**In-memory (Rust, bukan DB):** circuit breaker, rate limiter, exercise pool cache, passage cache, leaderboard cache.

## Security

| Fix | Issue | Implementation |
|-----|-------|---------------|
| SEC-01 | XP increment tanpa auth | `user_id` dari JWT, bukan dari request body |
| SEC-03 | AI prompt injection | Prompt construction di backend, user input escaped |
| SEC-05 | Payout tanpa auth | Admin middleware + creator_id dari JWT |
| SEC-08 | Peer review fake user_id | `reviewer_id` dari JWT |
| SEC-09 | Admin passcode client-side | Backend Argon2id verify |

Semua 13 security issues dari [SECURITY_ASSESSMENT.md](docs-dev/MIGRATION_PLAN.md) terintegrasi.

## Subscription Tiers

| Tier | AI Tokens/Day | Price |
|------|--------------|-------|
| Free | 15 | Rp 0 |
| Basic | 500 | Rp 16.500/bulan |
| C2 Pro | 5.000 | Rp 165.000/bulan |

Token budget enforced **server-side** (bukan client-side trust).

## E2E Tests

```bash
# Start server on test port
DATABASE_URL="sqlite:test_e2e.db" JWT_SECRET="test-key" PORT=18082 cargo run &
sleep 5

# Run tests
cargo test --test e2e -- --test-threads=1 --nocapture
```

Coverage: ~50 assertions across auth, admin, quiz, AI, writing, social, creator, storage, blog, monitoring.

## Project Structure

```
src/
├── main.rs                    # VilApp + 11 ServiceProcess assembly
├── config.rs                  # AppConfig (env vars, Infisical-ready)
├── error.rs                   # AppError → sanitized JSON response
├── db.rs                      # SQLite migration + VIL SqlxPool
├── db/migrations/
│   └── 001_initial_schema.sql # 35 tables + 25 indexes
├── middleware/
│   ├── auth.rs                # JWT Claims extractor (FromRequestParts)
│   └── admin.rs               # require_admin / require_super_admin
├── models/                    # sqlx::FromRow structs + request types
│   ├── profile.rs, quiz.rs, ai.rs, writing.rs, social.rs, creator.rs, admin.rs
├── services/                  # Handler implementations per domain
│   ├── auth.rs                # register, login, refresh, profile
│   ├── admin.rs               # roles, audit, verify-pin
│   ├── quiz.rs                # questions, simulation, results, history, progress
│   ├── ai.rs                  # Groq proxy, TTS, token budget
│   ├── writing.rs             # gym, sessions, exercise, evaluate, vocab, peer review
│   ├── social.rs              # circles, messages, friends, leaderboard, predictions
│   ├── creator.rs             # register, bites, view, tip, payout, stats
│   ├── monitoring.rs          # batch logs/metrics
│   ├── storage.rs             # avatar/audio upload + serve
│   ├── blog.rs                # posts list/get + admin CRUD
│   └── admin_monitoring.rs    # health, errors, feature flags, moderation
└── tasks/
    └── mod.rs                 # Periodic: cleanup expired claims, old logs
tests/
└── e2e.rs                     # Full E2E test suite (~50 assertions)
docs-dev/
├── MIGRATION_PLAN.md          # Full migration plan (35 tables, 68 endpoints, VIL)
└── FRONTEND_CUTOVER.md        # Frontend migration guide + Supabase → API mapping
```

## Deployment (Production)

```bash
# Build release
cargo build --release

# Deploy to Proxmox LXC (10.10.0.14)
scp target/release/toefl-quiz-backend root@10.10.0.14:/opt/toefl-quiz/
ssh root@10.10.0.14 "systemctl restart toefl-quiz"
```

Secrets via [Infisical](http://10.10.0.11:8080) — hanya `INFISICAL_CLIENT_ID/SECRET` di .env, sisanya dari Infisical.

## Docs

| Document | Description |
|----------|-------------|
| [MIGRATION_PLAN.md](docs-dev/MIGRATION_PLAN.md) | Full migration plan — 35 tables, 68 endpoints, VIL examples per phase |
| [FRONTEND_CUTOVER.md](docs-dev/FRONTEND_CUTOVER.md) | Frontend migration guide — Supabase → API call mapping |
| [.env.example](.env.example) | Environment variables template |

## License

MIT
