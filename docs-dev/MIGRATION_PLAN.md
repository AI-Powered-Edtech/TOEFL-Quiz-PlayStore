# Migration Plan: tupel-quis → VIL Rust Native Backend

**Tanggal:** 2 April 2026 (updated: VIL adoption)
**Referensi:** [SECURITY_ASSESSMENT.md](SECURITY_ASSESSMENT.md) | [ARCHITECTURE_ASSESSMENT.md](ARCHITECTURE_ASSESSMENT.md) | [BUSINESS_ASSESSMENT.md](BUSINESS_ASSESSMENT.md)
**Framework:** [VIL (Vastar Intermediate Language)](https://vastar.id/docs/vil) — process-oriented zero-copy framework
**Crates:** [crates.io/users/cxl-silicon-dev](https://crates.io/users/cxl-silicon-dev)
**Project:** `Aplikasi-Ibrohim/new-toefl-quiz/`

---

## KENAPA VIL (bukan raw Axum+SQLx)

| Aspek | Raw Axum+SQLx | VIL |
|-------|-------------|-----|
| HTTP server | Manual Router setup | `VilApp::new()` + `ServiceProcess` — built-in health, ready, metrics endpoints |
| AI SSE proxy (Groq) | Manual reqwest + SSE parsing (~80 lines) | `HttpSourceBuilder` + `SseSourceDialect` — 5 dialect built-in (~10 lines) |
| DB integration | Manual SQLx pool setup | `vil_db_sqlx` plugin — SqlxPool + compile-time queries |
| Circuit breaker | Manual struct + state machine | `#[vil_fault]` + declarative `failover:` block |
| Rate limiting | Manual DashMap | Backpressure config di `VxMeshConfig` |
| Observability | Manual tracing + Prometheus | `.observer(true)` — 1 line, full dashboard |
| Zero-copy | Manual Arc/reference design | `ShmSlice` body extraction — zero-copy by contract |
| Error response | Manual IntoResponse impl | `VilResponse::ok/err/created` — consistent format |
| Request body | `Json<T>` (copies bytes) | `ShmSlice` (zero-copy from ExchangeHeap) |
| Inter-service | N/A | Tri-Lane SHM mesh (~1-5us per hop) |
| Performance | ~20K req/s (well-tuned) | **41K req/s** HTTP, **6.5K req/s** AI gateway |
| **Estimasi total dev** | **~16 minggu** | **~8-9 minggu (~50% faster)** |

### VIL Crates yang Dipakai

```toml
[dependencies]
# Server framework
vil_server = "x.x"           # VilApp, ServiceProcess, VilResponse, ShmSlice

# Database
vil_db_sqlx = "x.x"          # SQLx plugin (PostgreSQL/SQLite), SqlxPool, compile-time queries

# AI Gateway (Groq proxy)
vil_new_http = "x.x"         # HttpSourceBuilder, SSE streaming, SseSourceDialect

# Auth (dari vil_server_auth)
vil_server_auth = "x.x"      # JWT middleware, Argon2id

# Observability
vil_observer = "x.x"         # Built-in dashboard, metrics

# Caching
vil_cache = "x.x"            # LRU cache, TTL-based

# Validation
vil_validate = "x.x"         # Input validation

# Tambahan (standard Rust)
jsonwebtoken = "9"
argon2 = "0.5"
subtle = "2"                  # Constant-time comparison
reqwest = "0.12"              # External HTTP calls (FCM, Slack, Discord)
chrono = "0.4"
uuid = "1"
```

---

## DAFTAR ISI

1. [Ringkasan](#1-ringkasan)
2. [Database: 69 → 35 Tabel (Optimized)](#2-database-69--35-tabel-optimized)
3. [RPC: 19 Functions → Rust Service](#3-rpc-19-functions--rust-service)
4. [Edge Functions: 6 → Rust Native](#4-edge-functions-6--rust-native)
5. [API Endpoint Map (50+ Supabase calls)](#5-api-endpoint-map)
6. [Phase 0: Foundation (VIL)](#6-phase-0-foundation)
7. [Phase 1: Auth & Admin](#7-phase-1-auth--admin)
8. [Phase 2: Quiz & Question Bank](#8-phase-2-quiz--question-bank)
9. [Phase 3: AI Proxy & Token Budget](#9-phase-3-ai-proxy--token-budget)
10. [Phase 4: Writing & Essay](#10-phase-4-writing--essay)
11. [Phase 5: Social & Circles](#11-phase-5-social--circles)
12. [Phase 6: Creator Economy & Payments](#12-phase-6-creator-economy--payments)
13. [Phase 7: Monitoring, Logging, Cleanup](#13-phase-7-monitoring-logging-cleanup)
14. [Phase 8: Storage & Realtime](#14-phase-8-storage--realtime)
15. [Phase 9: Frontend Cutover](#15-phase-9-frontend-cutover)
16. [Security Fixes (dari Assessment)](#16-security-fixes)
17. [SQLite Schema](#17-sqlite-schema)
18. [Deployment](#18-deployment)

---

## 1. RINGKASAN

| Item | Jumlah |
|------|--------|
| Tabel Supabase (original) | 69 |
| **Tabel SQLite (optimized)** | **35** |
| Dihapus (pindah in-memory Rust) | 10 |
| Di-merge | 12 → 5 |
| Ditunda (fitur belum aktif) | 5 |
| Views | 0 (semua jadi Rust SQL queries) |
| RPC functions migrasi | 19 |
| Edge Functions migrasi | 6 |
| Supabase calls di frontend | 50+ |
| Rust API endpoints baru | ~65 |
| Security issues fixed | 13 (5 critical, 4 high, 4 medium) |
| Target LXC IP | 10.10.0.14 (vmbr2) |

---

## 2. DATABASE: 69 → 35 TABEL (OPTIMIZED)

### Optimasi yang dilakukan

**DIHAPUS (10 tabel → in-memory Rust):**

| Tabel Lama | Alasan | Rust Replacement |
|-----------|--------|-----------------|
| circuit_breaker_state | State ephemeral, restart = reset | `struct CircuitBreaker` in-memory |
| rate_limit_state | Sliding window per request | `DashMap<UserId, SlidingWindow>` |
| social_rate_limits | Same pattern | Merge ke rate limiter in-memory |
| exercise_pool | Cache exercise sementara | `RwLock<Vec<Exercise>>` in-memory |
| mason_logs | Debug log per game | Masuk ke `app_logs` via component='mason' |
| mason_metrics | Metric per game | Masuk ke `app_metrics` via component='mason' |
| moderation_queue | Derived dari reports | `SELECT FROM content_reports WHERE status='pending'` |
| user_moderation_history | Computed | `SELECT count(*) FROM content_reports GROUP BY reporter_id` |
| essay_drafts | 1 draft per user | localStorage frontend cukup |
| bite_quizzes | Embedded di daily_bites | Kolom JSON sudah ada: quiz_question, quiz_options, quiz_correct_index |

**DI-MERGE (12 tabel → 5):**

| Dari | Ke | Perubahan |
|------|-----|-----------|
| writing_gym_sessions + writing_gym_sessions_v2 | **writing_sessions** | v1 legacy, cukup 1 tabel |
| writing_submissions + essay_metrics | **writing_submissions** | Tambah time_spent_seconds, breakdown(JSON) ke writing_submissions |
| integrated_writing_samples + model_essays | **model_essays** | Bedakan via task_type ('integrated_sample' vs 'band9') |
| score_predictions + prediction_history | **predictions** | 1 tabel, kolom `is_current` untuk latest |
| tip_transactions + payment_transactions | **transactions** | Kolom `type` ('tip', 'payment', 'payout') |
| reviewer_stats + reviewer_qualifications | **reviewer_profiles** | 1 row per reviewer, semua field merged |

**DITUNDA (5 tabel — fitur belum aktif/prioritas rendah):**

| Tabel | Alasan | Kapan migrasi |
|-------|--------|--------------|
| live_sessions | Fitur live belum aktif | Kalau diaktifkan |
| session_participants | Depends on live_sessions | Kalau diaktifkan |
| content_reviews | Overlap dgn peer_reviews pattern | Evaluate apakah perlu |
| bite_progress | Bisa dihitung dari bite_interactions | Evaluate apakah perlu |
| peer_review_analytics | Event log, bisa masuk app_logs | Evaluate apakah perlu |

**LOGGING SIMPLIFIED (3 → 2):**

| Dari | Ke | Perubahan |
|------|-----|-----------|
| app_logs + error_logs | **app_logs** | Tambah kolom resolved, stack_trace. Filter via level='error' |
| app_metrics | **app_metrics** | Tetap (beda schema: numeric vs text) |

---

### Tabel Final (35 tabel)

#### Auth & Admin (3)

| # | Tabel | Kolom Utama | Phase |
|---|-------|-------------|-------|
| 1 | **profiles** | id, username, full_name, avatar_url, bio, friend_code, hearts_count, xp, subscription_tier, fcm_token, password_hash, peer_review_prefs(JSON) | P0 |
| 2 | **admin_users** | user_id, email, role, pin_hash | P1 |
| 3 | **admin_audit_logs** | admin_id, action, target_type, target_id, metadata(JSON) | P1 |

> `peer_review_preferences` di-merge ke `profiles.peer_review_prefs` (JSON kolom)

#### Quiz & Questions (5)

| # | Tabel | Kolom Utama | Phase |
|---|-------|-------------|-------|
| 4 | **question_bank** | id, skill_id, section, interaction, stimulus(JSON), prompt, choices(JSON), correct_response(JSON), cefr_target, difficulty_score, passage_id, metadata(JSON) | P2 |
| 5 | **passages** | id, topic, content, source, difficulty, word_count | P2 |
| 6 | **quiz_results** | id, user_id, skill_id, section, score, correct_count, total_questions, xp_earned, date | P2 |
| 7 | **user_question_history** | id, user_id, question_id, answered_correctly, time_spent_ms | P2 |
| 8 | **cefr_results** | id, user_id, test_set_id, cefr_level, overall_score, reading/listening/writing/speaking_score, feedback(JSON) | P2 |

> `quiz_reports` di-merge ke `quiz_results` (tambah kolom breakdown JSON)
> `cefr_test_sets` tetap kalau caching diperlukan, atau hapus kalau generate on-the-fly

#### AI & Token (3)

| # | Tabel | Kolom Utama | Phase |
|---|-------|-------------|-------|
| 9 | **ai_token_usage** | id, user_id, date, tokens_used, tokens_limit, feature | P3 |
| 10 | **subscriptions** | id, user_id, tier, tokens_limit, expires_at | P3 |
| 11 | **feature_usage** | id, user_id, feature, period_type, used_at | P3 |

> `exercise_pool` → in-memory cache di Rust

#### Writing & Essay (8)

| # | Tabel | Kolom Utama | Phase |
|---|-------|-------------|-------|
| 12 | **writing_gym_progress** | id, user_id, level, skill_id, exercises_completed, stars_earned, history(JSON) | P4 |
| 13 | **writing_sessions** | id, user_id, level, skill_id, session_state(JSON), best_score, status, expires_at | P4 |
| 14 | **writing_submissions** | id, user_id, task_type, prompt, user_essay, reading_passage, word_count, ai_score, ai_feedback(JSON), breakdown(JSON), time_spent_seconds | P4 |
| 15 | **integrated_writing_tasks** | id, title, reading_passage, listening_content, writing_prompt | P4 |
| 16 | **model_essays** | id, topic, task_type, content, word_count, band_score, breakdown(JSON), annotations(JSON), highlights(JSON), category, source | P4 |
| 17 | **user_saved_essays** | user_id, essay_id, notes | P4 |
| 18 | **collected_vocabulary** | id, user_id, word, definition, cefr_level, source_essay_id, review_count, next_review_at | P4 |
| 19 | **devils_advocate_sessions** | id, user_id, user_argument, counter_point, score, feedback, time_spent_seconds | P4 |

> `mason_sessions` di-merge ke `writing_sessions` (level='mason')
> `essay_interactions` → kolom di `user_saved_essays` (time_spent_ms, completed)
> `integrated_writing_sessions` → pakai `writing_sessions` dengan level='integrated'
> `essay_drafts` → localStorage frontend
> `integrated_writing_samples` → merge ke `model_essays` task_type='integrated_sample'

#### Peer Review (3)

| # | Tabel | Kolom Utama | Phase |
|---|-------|-------------|-------|
| 20 | **peer_review_submissions** | id, user_id, essay_content, prompt, task_type, word_count, is_anonymous, status, claimed_by, claimed_at, difficulty_level, moderation_status, report_count | P4 |
| 21 | **peer_reviews** | id, submission_id, reviewer_id, task_response/coherence/lexical/grammar_score, overall_band, strengths, weaknesses, suggestions, inline_corrections(JSON), time_spent_seconds, helpfulness_rating, report_count | P4 |
| 22 | **reviewer_profiles** | user_id, total_reviews, avg_helpfulness, xp_earned, tier, quality_average, tutorial_completed, quiz_score, qualification_level | P4 |

> `reviewer_stats` + `reviewer_qualifications` → `reviewer_profiles`
> `peer_review_analytics` → masuk `app_logs` component='peer_review'
> `peer_review_preferences` → kolom JSON di `profiles`

#### Social (7)

| # | Tabel | Kolom Utama | Phase |
|---|-------|-------------|-------|
| 23 | **friends** | id, user_id, friend_id | P5 |
| 24 | **circles** | id, code, name, description, creator_id, is_public, chat_mode | P5 |
| 25 | **circle_members** | id, circle_id, user_id, role | P5 |
| 26 | **circle_messages** | id, circle_id, user_id, content, is_system | P5 |
| 27 | **notifications** | id, user_id, type, message, read | P5 |
| 28 | **predictions** | id, user_id, prediction_type, predicted_value, actual_value, confidence, breakdown(JSON), is_current | P5 |
| 29 | **user_achievements** | id, user_id, achievement_id, feature, xp_earned | P5 |

> `score_predictions` + `prediction_history` → `predictions` (kolom `is_current`)
> `oracle_recommendations` → masuk `notifications` type='oracle_recommendation'

#### Creator Economy (5)

| # | Tabel | Kolom Utama | Phase |
|---|-------|-------------|-------|
| 30 | **creators** | id, user_id, display_name, is_verified, total_earnings, payout_method(JSON), status | P6 |
| 31 | **daily_bites** | id, creator_id, youtube_video_id, title, category, section, views_count, likes_count, status, quiz_question, quiz_options(JSON), quiz_correct_index | P6 |
| 32 | **bite_interactions** | id, bite_id, user_id, interaction_type, watch_duration_seconds, quiz_correct, progress | P6 |
| 33 | **transactions** | id, type, order_id, from_user_id, to_creator_id, bite_id, amount, platform_fee, creator_amount, currency, status, provider, metadata(JSON) | P6 |
| 34 | **creator_earnings** | id, creator_id, bite_id, transaction_id, amount, earning_type, is_paid, payout_request_id | P6 |

> `payout_requests` → masuk `transactions` type='payout'
> `tip_transactions` + `payment_transactions` → `transactions`
> `bite_quizzes` → kolom JSON di `daily_bites`
> `bite_progress` → kolom `progress` di `bite_interactions`
> `content_reviews` → ditunda

#### Monitoring & System (4)

| # | Tabel | Kolom Utama | Phase |
|---|-------|-------------|-------|
| 35 | **app_logs** | id, timestamp, level, component, message, user_id, session_id, metadata(JSON), stack_trace, resolved, resolved_at | P7 |
| 36 | **app_metrics** | id, timestamp, metric_name, metric_value, unit, component, tags(JSON) | P7 |
| 37 | **alert_config** | id, alert_type, service_name, threshold(JSON), enabled, notification_channels(JSON) | P7 |
| 38 | **alert_history** | id, alert_type, severity, message, metadata(JSON), sent_at | P7 |

> Tambah 2 tabel non-numbered yang tetap diperlukan:

| Tabel | Kolom Utama | Phase |
|-------|-------------|-------|
| **feature_flags** | id, name, enabled, rollout_percent, allowed_users(JSON) | P7 |
| **content_reports** | id, reporter_id, content_type, content_id, reason, description, status, resolved_by | P7 |
| **blog_posts** | id, skill_id, section, title, content, status, is_featured, views_count, sort_order | P7 |

**Total: 35 tabel utama + 3 system tabel = 38 tabel**

---

### In-Memory State (Rust, bukan DB)

| State | Rust Struct | Lifecycle |
|-------|-----------|-----------|
| Circuit breaker | `DashMap<String, CircuitBreaker>` | Reset on restart |
| Rate limiter | `DashMap<(UserId, LimiterName), SlidingWindow>` | Reset on restart |
| Exercise pool cache | `RwLock<HashMap<(Level, SkillId), Vec<Exercise>>>` | Refill periodic |
| Passage cache | `RwLock<HashMap<i64, Arc<Passage>>>` | LRU eviction |
| Leaderboard cache | `RwLock<CachedLeaderboard>` | 5 min TTL |

### Views → Rust SQL Queries (0 views, semua computed)

| Kebutuhan Lama (View) | Rust Query Location |
|-----------------------|---------------------|
| user_xp_summary | `SELECT id, full_name, xp FROM profiles ORDER BY xp DESC` di `leaderboard.rs` |
| creator_earnings_summary | `SELECT ... FROM creators JOIN creator_earnings GROUP BY creator_id` di `creator.rs` |
| error_logs_summary | `SELECT ... FROM app_logs WHERE level='error' GROUP BY ...` di `monitoring.rs` |
| metrics_api_latency | `SELECT ... FROM app_metrics WHERE metric_name='latency' ...` di `monitoring.rs` |
| system_health_dashboard | Computed dari in-memory circuit breaker + SQL query di `monitoring.rs` |

---

## 3. RPC: 19 FUNCTIONS → RUST SERVICE

| # | RPC Function | Params | Rust Target | Security Fix |
|---|-------------|--------|-------------|-------------|
| 1 | `increment_xp` | user_id_param, amount | `services/xp.rs` | **FIX SEC-01**: user_id dari JWT, bukan param |
| 2 | `check_and_consume_rate_limit` | p_user_id, p_limiter_name, p_max_requests, p_window_ms | `middleware/rate_limit.rs` (in-memory) | Hapus DB-backed, pakai DashMap |
| 3 | `check_social_rate_limit` | p_user_id, p_action_type, p_max_count, p_window_ms | `middleware/rate_limit.rs` | In-memory sliding window |
| 4 | `check_peer_review_submission_limit` | p_user_id | `services/peer_review.rs` | user_id dari JWT |
| 5 | `check_peer_review_limit` | p_user_id | `services/peer_review.rs` | user_id dari JWT |
| 6 | `calculate_reviewer_stats` | p_reviewer_id | `services/peer_review.rs` | Aggregate query |
| 7 | `upsert_exercise_to_pool` | p_id, p_level, p_skill_id, p_difficulty, p_exercise_data | `services/writing_gym.rs` | Auth required |
| 8 | `pop_exercise_from_pool` | p_level, p_skill_id, p_difficulty | `services/writing_gym.rs` | Auth required |
| 9 | `submit_payout_request` | p_creator_id, p_amount, p_payout_method | `services/payout.rs` | **FIX SEC-05**: creator_id dari JWT |
| 10 | `process_payout_request` | p_request_id, p_admin_id, p_status, p_notes | `services/payout.rs` | **FIX SEC-05**: admin middleware |
| 11 | `record_bite_view` | p_bite_id, p_user_id, p_watch_duration | `services/creator.rs` | user_id dari JWT |
| 12 | `process_tip` | p_order_id, p_creator_id, p_bite_id, p_gross_amount, p_platform_fee, p_creator_amount | `services/payment.rs` | Idempotent via order_id |
| 13 | `get_creator_overview_stats` | p_creator_id, p_start_date, p_end_date | `services/creator.rs` | creator_id dari JWT |
| 14 | `calculate_audience_insights` | p_creator_id | `services/creator.rs` | creator_id dari JWT |
| 15 | `verify_admin_pin` | pin | `services/admin.rs` | Argon2id verify |
| 16 | `increment_blog_post_views` | p_skill_id | `services/blog.rs` | Public, rate limited |
| 17 | `update_question_audio_url` | question_id, new_audio_url | `services/audio.rs` | Admin only |
| 18 | `cleanup_old_error_logs` | - | `tasks/cleanup.rs` | Periodic task |
| 19 | `cleanup_expired_rate_limits` | - | `tasks/cleanup.rs` | Periodic task |

---

## 4. EDGE FUNCTIONS: 6 → RUST NATIVE

| # | Edge Function | Rust Target | Detail |
|---|-------------- |-------------|--------|
| 1 | `groq-proxy` | `POST /api/ai/generate` | Rate limit 20req/60s per user. Models: llama-3.1-8b, llama-3.3-70b, llama-4-scout, gemma2-9b, mixtral-8x7b, qwen3-32b |
| 2 | `groq-tts-proxy` | `POST /api/ai/tts` | Rate limit 10req/60s. Model: orpheus-v1-english, voice: tara, max 1200 chars. Return WAV binary |
| 3 | `admin-send-notification` | `POST /api/admin/notifications` | Admin middleware. Google OAuth2 → FCM v1. Batch max 1000 tokens. Filter by subscription_tier |
| 4 | `alerts` | `tokio::spawn` cron | Slack webhook. Cek error_rate ≥10/min, api_latency ≥10s, circuit_breaker_open. Cooldown 5min/type |
| 5 | `cleanup-expired-claims` | `tokio::spawn` cron 30min | Release peer review claims >30min. Update status → pending |
| 6 | `monitor-alerts` | `tokio::spawn` cron | Discord webhook. Config-driven: circuit_open, error_rate >5%, p95 latency >2000ms |

---

## 5. API ENDPOINT MAP

### Auth (dari supabase.ts, adminService.ts)

| Method | Endpoint | Source Call | Middleware |
|--------|----------|------------|-----------|
| POST | `/api/auth/register` | - (new) | - |
| POST | `/api/auth/login` | supabase.auth.signInWithPassword | - |
| POST | `/api/auth/oauth/google` | supabase.auth.signInWithOAuth | - |
| POST | `/api/auth/logout` | supabase.auth.signOut | auth |
| POST | `/api/auth/refresh` | supabase.auth.getSession | - |
| GET | `/api/auth/profile` | supabase.from('profiles').select | auth |
| PATCH | `/api/auth/profile` | supabase.from('profiles').update | auth |
| POST | `/api/auth/avatar` | supabase.storage.from('avatars').upload | auth |

### Admin (dari adminService.ts, auditService.ts, moderationService.ts)

| Method | Endpoint | Source Call | Middleware |
|--------|----------|------------|-----------|
| GET | `/api/admin/users` | supabase.from('admin_users').select | auth + admin |
| POST | `/api/admin/roles` | supabase.from('admin_users').upsert | auth + super_admin |
| DELETE | `/api/admin/roles/:user_id` | supabase.from('admin_users').delete | auth + super_admin |
| POST | `/api/admin/verify-pin` | supabase.rpc('verify_admin_pin') | auth + admin |
| GET | `/api/admin/audit-logs` | supabase.from('admin_audit_logs').select | auth + admin |
| POST | `/api/admin/notifications` | Edge Function admin-send-notification | auth + admin |
| GET | `/api/admin/moderation/queue` | supabase.from('moderation_queue').select | auth + admin |
| PATCH | `/api/admin/moderation/reports/:id` | supabase.from('content_reports').update | auth + admin |

### Quiz & Questions (dari questionBankService.ts, historyService.ts)

| Method | Endpoint | Source Call | Middleware |
|--------|----------|------------|-----------|
| GET | `/api/quiz/questions` | supabase.from('question_bank').select | auth |
| GET | `/api/quiz/simulation` | getRandomQuestionsForSimulation + passages | auth |
| POST | `/api/quiz/results` | supabase.from('quiz_results').insert + increment_xp | auth |
| GET | `/api/quiz/history` | supabase.from('quiz_results').select | auth |
| GET | `/api/quiz/progress` | calculateUserProgress (aggregation) | auth |
| POST | `/api/quiz/import` | importQuestionsToBank (batch) | auth + admin |
| GET | `/api/quiz/cefr/test-sets` | supabase.from('cefr_test_sets').select | auth |
| POST | `/api/quiz/cefr/test-sets` | supabase.from('cefr_test_sets').insert | auth |
| POST | `/api/quiz/cefr/results` | supabase.from('cefr_results').insert | auth |
| GET | `/api/quiz/cefr/results` | supabase.from('cefr_results').select | auth |
| GET | `/api/quiz/question-history` | supabase.from('user_question_history').select | auth |

### AI & Token Budget (dari groq/client.ts, subscriptionService.ts)

| Method | Endpoint | Source Call | Middleware |
|--------|----------|------------|-----------|
| POST | `/api/ai/generate` | Edge Function groq-proxy | auth + rate_limit |
| POST | `/api/ai/tts` | Edge Function groq-tts-proxy | auth + rate_limit |
| GET | `/api/ai/token-usage` | supabase.from('ai_token_usage').select | auth |
| GET | `/api/ai/subscription` | supabase.from('subscriptions').select | auth |
| GET | `/api/ai/feature-usage` | supabase.from('feature_usage').select | auth |

### Writing & Essay (dari writingGymService.ts, essayEvaluationService.ts, integratedWritingService.ts)

| Method | Endpoint | Source Call | Middleware |
|--------|----------|------------|-----------|
| GET | `/api/writing/progress` | supabase.from('writing_gym_progress').select | auth |
| POST | `/api/writing/progress` | supabase.from('writing_gym_progress').upsert | auth |
| POST | `/api/writing/exercise` | rpc pop_exercise_from_pool + AI generate | auth + rate_limit |
| POST | `/api/writing/exercise/pool` | rpc upsert_exercise_to_pool | auth |
| GET | `/api/writing/sessions` | supabase.from('writing_gym_sessions_v2').select | auth |
| POST | `/api/writing/sessions` | supabase.from('writing_gym_sessions_v2').upsert | auth |
| DELETE | `/api/writing/sessions/expired` | supabase.from('writing_gym_sessions_v2').delete | auth |
| POST | `/api/writing/evaluate` | AI essay evaluation via Groq | auth + rate_limit |
| GET | `/api/writing/integrated/tasks` | supabase.from('integrated_writing_tasks').select | auth |
| POST | `/api/writing/integrated/sessions` | supabase.from('integrated_writing_sessions').insert | auth |
| GET | `/api/writing/integrated/history` | supabase.from('integrated_writing_sessions').select | auth |
| GET | `/api/writing/model-essays` | supabase.from('model_essays').select | auth |
| POST | `/api/writing/model-essays/save` | supabase.from('user_saved_essays').insert | auth |
| POST | `/api/writing/model-essays/interact` | supabase.from('essay_interactions').insert | auth |
| GET | `/api/writing/vocabulary` | supabase.from('collected_vocabulary').select | auth |
| POST | `/api/writing/vocabulary` | supabase.from('collected_vocabulary').insert | auth |
| POST | `/api/writing/devils-advocate` | supabase.from('devils_advocate_sessions').insert | auth |
| GET | `/api/writing/mason/sessions` | supabase.from('mason_sessions').select | auth |
| POST | `/api/writing/mason/sessions` | supabase.from('mason_sessions').insert | auth |
| PATCH | `/api/writing/mason/sessions/:id` | supabase.from('mason_sessions').update | auth |

### Peer Review (dari peerReviewService.ts, moderationService.ts)

| Method | Endpoint | Source Call | Middleware |
|--------|----------|------------|-----------|
| POST | `/api/peer-review/submissions` | supabase.from('peer_review_submissions').insert | auth |
| GET | `/api/peer-review/submissions` | supabase.from('peer_review_submissions').select | auth |
| GET | `/api/peer-review/submissions/mine` | filter by user_id from JWT | auth |
| POST | `/api/peer-review/submissions/:id/claim` | supabase.from('peer_review_submissions').update | auth |
| GET | `/api/peer-review/queue` | getFilteredReviewQueue (complex filter) | auth |
| POST | `/api/peer-review/reviews` | supabase.from('peer_reviews').insert | auth |
| GET | `/api/peer-review/reviews/:submission_id` | supabase.from('peer_reviews').select | auth |
| PATCH | `/api/peer-review/reviews/:id/rate` | supabase.from('peer_reviews').update | auth |
| GET | `/api/peer-review/stats` | supabase.from('reviewer_stats').select | auth |
| GET | `/api/peer-review/limit` | rpc check_peer_review_submission_limit | auth |
| POST | `/api/peer-review/report` | supabase.from('content_reports').insert | auth |

### Social (dari circleService.ts, friendService.ts, leaderboardService.ts, oracleService.ts)

| Method | Endpoint | Source Call | Middleware |
|--------|----------|------------|-----------|
| POST | `/api/circles` | supabase.from('circles').insert | auth |
| POST | `/api/circles/join` | supabase.from('circle_members').insert | auth |
| GET | `/api/circles/mine` | supabase.from('circle_members').select | auth |
| GET | `/api/circles/:id/members` | supabase.from('circle_members').select | auth |
| GET | `/api/circles/:id/leaderboard` | supabase.from('profiles').select (join) | auth |
| POST | `/api/circles/:id/messages` | supabase.from('circle_messages').insert | auth |
| GET | `/api/circles/:id/messages` | supabase.from('circle_messages').select | auth |
| DELETE | `/api/circles/:id/messages/:msg_id` | supabase.from('circle_messages').delete | auth |
| PATCH | `/api/circles/:id` | supabase.from('circles').update | auth |
| DELETE | `/api/circles/:id` | cascade delete circles+members+messages | auth |
| POST | `/api/circles/:id/leave` | supabase.from('circle_members').delete | auth |
| POST | `/api/friends/add` | supabase.from('friends').insert | auth |
| GET | `/api/friends` | supabase.from('friends').select | auth |
| GET | `/api/friends/code` | supabase.from('profiles').select friend_code | auth |
| POST | `/api/friends/code` | supabase.from('profiles').update friend_code | auth |
| GET | `/api/leaderboard` | user_xp_summary view query | auth |
| GET | `/api/leaderboard/rank` | user rank from leaderboard | auth |
| GET | `/api/oracle/predictions` | supabase.from('score_predictions').select | auth |
| POST | `/api/oracle/predictions` | supabase.from('score_predictions').upsert | auth |
| GET | `/api/oracle/history` | supabase.from('prediction_history').select | auth |
| GET | `/api/oracle/recommendations` | supabase.from('oracle_recommendations').select | auth |
| GET | `/api/achievements` | supabase.from('user_achievements').select | auth |
| GET | `/api/notifications` | supabase.from('notifications').select | auth |

### Creator Economy (dari purchaseService.ts, dailyBites related)

| Method | Endpoint | Source Call | Middleware |
|--------|----------|------------|-----------|
| POST | `/api/creators/register` | supabase.from('creators').insert | auth |
| GET | `/api/creators/profile` | supabase.from('creators').select | auth |
| POST | `/api/bites` | supabase.from('daily_bites').insert | auth + creator |
| GET | `/api/bites` | supabase.from('daily_bites').select | auth |
| POST | `/api/bites/:id/view` | rpc record_bite_view | auth |
| POST | `/api/bites/:id/tip` | rpc process_tip | auth |
| GET | `/api/creators/stats` | rpc get_creator_overview_stats | auth + creator |
| GET | `/api/creators/insights` | rpc calculate_audience_insights | auth + creator |
| POST | `/api/creators/payouts` | rpc submit_payout_request | auth + creator |
| PATCH | `/api/admin/payouts/:id` | rpc process_payout_request | auth + admin |

### Monitoring & Logging (dari loggingService.ts, metricsService.ts)

| Method | Endpoint | Source Call | Middleware |
|--------|----------|------------|-----------|
| POST | `/api/logs/batch` | supabase.from('app_logs').insert | auth |
| POST | `/api/metrics/batch` | supabase.from('app_metrics').insert | auth |
| GET | `/api/admin/monitoring/health` | system_health_dashboard view | auth + admin |
| GET | `/api/admin/monitoring/errors` | error_logs queries | auth + admin |
| GET | `/api/admin/monitoring/latency` | metrics_api_latency view | auth + admin |
| GET | `/api/admin/feature-flags` | supabase.from('feature_flags').select | auth + admin |
| PATCH | `/api/admin/feature-flags/:id` | supabase.from('feature_flags').update | auth + admin |

### Blog (dari blogService.ts)

| Method | Endpoint | Source Call | Middleware |
|--------|----------|------------|-----------|
| GET | `/api/blog/posts` | supabase.from('blog_posts').select | public |
| GET | `/api/blog/posts/:skill_id` | supabase.from('blog_posts').select.eq | public |
| POST | `/api/blog/posts/:skill_id/view` | rpc increment_blog_post_views | public + rate_limit |
| POST | `/api/admin/blog/posts` | supabase.from('blog_posts').upsert | auth + admin |
| DELETE | `/api/admin/blog/posts/:skill_id` | supabase.from('blog_posts').delete | auth + admin |

### Storage (dari audioStorageService.ts, supabase.ts)

| Method | Endpoint | Source Call | Middleware |
|--------|----------|------------|-----------|
| POST | `/api/storage/avatars` | supabase.storage.from('avatars').upload | auth |
| GET | `/api/storage/avatars/:path` | supabase.storage.getPublicUrl | public |
| POST | `/api/storage/audio` | supabase.storage.from('quiz-assets').upload | auth + admin |
| GET | `/api/storage/audio/:path` | supabase.storage.getPublicUrl | public |

---

## 6. PHASE 0: FOUNDATION (VIL)

**Target:** VIL project, SQLite via vil_db_sqlx, Infisical, ServiceProcess structure
**Estimasi:** 3-4 hari (vs 2 minggu raw Axum)

**Referensi contoh VIL** (`Prdmid/vil-project/vil/examples/`):
| Example | Pelajari apa | File |
|---------|-------------|------|
| `003-basic-hello-server` | VilApp + ServiceProcess minimal, ShmSlice body, VilResponse | Starter template |
| `038-basic-vil-app-dsl` | `vil_app!` macro — deklaratif tanpa boilerplate | Alternatif concise |
| `039-basic-observer-dashboard` | `.observer(true)`, metrics collector, system_log! | Monitoring gratis |
| `035-basic-vil-service-module` | Multi-service pattern `#[vil_service]`, modular structure | Arsitektur multi-service |

```
Project setup:
[ ] mkdir Aplikasi-Ibrohim/new-toefl-quiz && cd new-toefl-quiz
[ ] cargo init --name toefl-quiz-backend
[ ] Cargo.toml:
    vil_server = { path atau crates.io }
    vil_db_sqlx = { path atau crates.io }
    vil_server_auth = { path atau crates.io }
    vil_observer = { path atau crates.io }
    vil_cache = { path atau crates.io }
    vil_validate = { path atau crates.io }
    jsonwebtoken = "9"
    argon2 = "0.5"
    subtle = "2"
    reqwest = { version = "0.12", features = ["json", "stream"] }
    chrono = "0.4"
    uuid = { version = "1", features = ["v4"] }

src/main.rs — VilApp bootstrap:
[ ] VilApp::new("toefl-quiz")
      .port(8082)
      .observer(true)                    // Dashboard otomatis di /observer
      .service(auth_service)             // ServiceProcess "auth"
      .service(admin_service)            // ServiceProcess "admin"
      .service(quiz_service)             // ServiceProcess "quiz"
      .service(ai_service)              // ServiceProcess "ai"
      .service(writing_service)          // ServiceProcess "writing"
      .service(social_service)           // ServiceProcess "social"
      .service(creator_service)          // ServiceProcess "creator"
      .service(monitoring_service)       // ServiceProcess "monitoring"
      .run().await;

[ ] src/config.rs - Infisical SDK → load all secrets at startup
[ ] src/error.rs - VilError derive untuk domain errors:
      #[derive(VilError)]
      enum AppError { Auth, Validation, RateLimit, NotFound, Internal }
      → otomatis VilResponse::err() compatible

[ ] src/db.rs - vil_db_sqlx setup:
      let pool = SqlxPool::connect("sqlite:///opt/toefl-quiz/data.db").await?;
      PRAGMA journal_mode=WAL, foreign_keys=ON, busy_timeout=5000

[ ] src/db/migrations/ - SQLite schema (§17)

Middleware (VIL-native):
[ ] src/middleware/auth.rs - JWT extraction → Claims { sub, exp, role }
      (pakai vil_server_auth atau custom Axum layer — VilApp compatible)
[ ] src/middleware/admin.rs - Check admin_users table
[ ] Security headers → VIL built-in via Tower layers

Built-in gratis dari VIL:
  - GET /health → auto-generated
  - GET /ready → auto-generated
  - GET /metrics → Prometheus-style auto-generated
  - GET /info → server info auto-generated
  - /observer → full monitoring dashboard

Infra:
[ ] Proxmox: Create LXC 10.10.0.14 (Ubuntu 22.04, vmbr2)
[ ] Infisical: Create project "toefl-quiz", environment "production"
[ ] Infisical: Machine Identity + Universal Auth + Viewer role
[ ] Infisical: Store GROQ_API_KEY, JWT_SECRET, GOOGLE_OAUTH_CLIENT_ID/SECRET,
    ADMIN_PASSCODE_HASH, SENTRY_DSN, SLACK_WEBHOOK, DISCORD_WEBHOOK,
    FCM_PROJECT_ID, FCM_SERVICE_ACCOUNT_KEY
[ ] OneDev: Create repo new-toefl-quiz at 10.10.0.7:6610
[ ] LXC: hosts entry → 10.10.0.7 git.vastar.ai
```

### VIL Project Structure

```
new-toefl-quiz/
├── Cargo.toml
├── src/
│   ├── main.rs                    # VilApp + ServiceProcess assembly
│   ├── config.rs                  # Infisical + env config
│   ├── error.rs                   # #[derive(VilError)] AppError
│   ├── db.rs                      # SqlxPool setup
│   ├── db/migrations/             # SQLite schema
│   ├── middleware/
│   │   ├── auth.rs                # JWT middleware (Tower layer)
│   │   └── admin.rs               # Admin role check
│   ├── models/                    # #[derive(VilModel, sqlx::FromRow)]
│   │   ├── profile.rs
│   │   ├── quiz.rs
│   │   ├── essay.rs
│   │   ├── social.rs
│   │   ├── creator.rs
│   │   └── admin.rs
│   ├── services/                  # Business logic (each = ServiceProcess)
│   │   ├── auth.rs                # Handlers: register, login, oauth, profile
│   │   ├── admin.rs               # Handlers: roles, audit, moderation
│   │   ├── quiz.rs                # Handlers: questions, simulation, results
│   │   ├── ai.rs                  # Handlers: groq proxy, tts, token budget
│   │   ├── writing.rs             # Handlers: gym, essays, peer review, mason
│   │   ├── social.rs              # Handlers: circles, friends, leaderboard
│   │   ├── creator.rs             # Handlers: bites, tips, payouts
│   │   └── monitoring.rs          # Handlers: logs, metrics
│   └── tasks/                     # Background periodic tasks
│       ├── cleanup.rs             # Expired claims, old logs
│       └── alerts.rs              # Slack/Discord webhooks
├── scripts/
│   ├── migration/
│   │   └── migrate_from_supabase.sh
│   └── setup_infisical.sh
└── docs/
    ├── DEPLOYMENT_GUIDE.md
    └── TODO_IBROHIM.md
```

---

## 7. PHASE 1: AUTH & ADMIN

**Target:** User registration, login, JWT, Google OAuth, admin CRUD
**Estimasi:** 1 minggu

**Referensi contoh VIL:**
| Example | Pelajari apa | File |
|---------|-------------|------|
| `004-basic-rest-crud` | Full CRUD (create/read/update/delete), Extension shared state, input validation | Pattern utama |
| `029-basic-vil-handler-endpoint` | 3 handler patterns: plain, `#[vil_handler]`, `#[vil_endpoint]` | Pilih pattern handler |
| `017-basic-production-fullstack` | Auth middleware, 21 middleware layers, enterprise patterns | Reference arsitektur lengkap |
| `037-basic-vilmodel-derive` | `#[derive(VilModel)]` untuk User/Profile struct | Serialization model |

```
VIL ServiceProcess:
[ ] let auth = ServiceProcess::new("auth")
        .endpoint(Method::POST, "/register", post(register))
        .endpoint(Method::POST, "/login", post(login))
        .endpoint(Method::POST, "/oauth/google", post(oauth_google))
        .endpoint(Method::POST, "/refresh", post(refresh_token))
        .endpoint(Method::GET, "/profile", get(get_profile))
        .endpoint(Method::PATCH, "/profile", patch(update_profile))
        .endpoint(Method::POST, "/avatar", post(upload_avatar));

[ ] let admin = ServiceProcess::new("admin")
        .endpoint(Method::GET, "/users", get(list_admins))
        .endpoint(Method::POST, "/roles", post(assign_role))
        .endpoint(Method::DELETE, "/roles/:user_id", delete(remove_role))
        .endpoint(Method::POST, "/verify-pin", post(verify_pin))
        .endpoint(Method::GET, "/audit-logs", get(audit_logs))
        .endpoint(Method::POST, "/notifications", post(send_notification));

Handlers (VIL pattern):
[ ] async fn register(body: ShmSlice, pool: Extension<SqlxPool>) -> VilResponse<AuthResponse>
    - Parse body.json::<RegisterRequest>()
    - Argon2id hash password
    - Insert profiles
    - Sign JWT
    - VilResponse::created(AuthResponse { token, profile })

[ ] async fn login(body: ShmSlice, pool: Extension<SqlxPool>) -> VilResponse<AuthResponse>
    - Argon2id verify
    - Return JWT pair (access 15min + refresh 7d)

[ ] Auth middleware: Tower layer yang extract JWT → inject Claims via Extension

Frontend:
[ ] Buat src/services/api.ts (fetch wrapper dengan JWT header)
[ ] Ganti supabase.auth.* → fetch /api/auth/*
[ ] Ganti adminService.ts → fetch /api/admin/*
[ ] Hapus VITE_ADMIN_PASSCODE_HASH dari .env (FIX SEC-09)
```

---

## 8. PHASE 2: QUIZ & QUESTION BANK

**Target:** Question CRUD, simulation, passages, quiz results, XP
**Estimasi:** 1 minggu

**Referensi contoh VIL:**
| Example | Pelajari apa | File |
|---------|-------------|------|
| `004-basic-rest-crud` | CRUD pattern dengan Arc<RwLock<HashMap>> store | GET/POST/PUT/DELETE pattern |
| `012-basic-plugin-database` | `vil_db_sqlx` + SqlxPool, real PostgreSQL/SQLite queries | DB integration utama |
| `037-basic-vilmodel-derive` | `#[derive(VilModel)]` untuk Question, Passage, QuizResult struct | Zero-copy model |
| `006-basic-shm-extractor` | ShmSlice body parsing, zero-copy request handling | Body extraction |

```
VIL ServiceProcess:
[ ] let quiz = ServiceProcess::new("quiz")
        .endpoint(Method::GET, "/questions", get(list_questions))
        .endpoint(Method::GET, "/simulation", get(simulation))
        .endpoint(Method::POST, "/results", post(save_result))
        .endpoint(Method::GET, "/history", get(history))
        .endpoint(Method::GET, "/progress", get(progress))
        .endpoint(Method::POST, "/import", post(import_questions))
        .endpoint(Method::GET, "/cefr/test-sets", get(cefr_test_sets))
        .endpoint(Method::POST, "/cefr/results", post(save_cefr_result))
        .endpoint(Method::GET, "/cefr/results", get(get_cefr_results));

Services (VIL zero-copy):
[ ] Passage cache: ShmContext atau Arc<RwLock<HashMap>> — zero-copy passage refs
[ ] Question shuffle: in-place Vec::shuffle + truncate (no array copy)
[ ] XP increment: SQL UPDATE WHERE id = claims.sub (FIX SEC-01)
[ ] Batch import: iterator pipeline, ShmSlice body parsing

Frontend:
[ ] Ganti questionBankService.ts → fetch /api/quiz/*
[ ] Ganti historyService.ts → fetch /api/quiz/history, /api/quiz/progress
```

---

## 9. PHASE 3: AI PROXY & TOKEN BUDGET

**Target:** Groq proxy via VIL SSE infrastructure, TTS proxy, token budget server-side
**Estimasi:** 3-4 hari (vs 2 minggu raw — VIL SSE built-in)

**Referensi contoh VIL:**
| Example | Pelajari apa | File |
|---------|-------------|------|
| `001-basic-ai-gw-demo` | AI gateway SSE proxy, `SseCollect`, `json_tap` extraction | **Pattern utama untuk Groq proxy** |
| `001b-vilapp-ai-gw-benchmark` | VilApp-based AI gateway, ShmSlice → upstream SSE → response | VilApp variant |
| `018-basic-ai-multi-model-router` | Multi-model routing (cheap/expensive), `#[vil_fault]` LlmFault | Model whitelist + fallback |
| `028-basic-sse-hub-streaming` | SSE hub broadcast pattern, `SseEvent` builder | Jika perlu SSE ke frontend |
| `032-basic-failover-ha` | Failover + retry strategy, `VxFailoverConfig` | Circuit breaker pattern |

```
VIL ServiceProcess:
[ ] let ai = ServiceProcess::new("ai")
        .endpoint(Method::POST, "/generate", post(ai_generate))
        .endpoint(Method::POST, "/tts", post(ai_tts))
        .endpoint(Method::GET, "/token-usage", get(token_usage))
        .endpoint(Method::GET, "/subscription", get(subscription));

AI Generate handler (VIL SSE pattern):
[ ] async fn ai_generate(body: ShmSlice, claims: Claims, pool: Extension<SqlxPool>)
        → VilResponse<GroqResponse>
    - Token budget: check + consume atomic (DB)
    - Validate model whitelist (llama-3.1-8b, llama-3.3-70b, etc)
    - Prompt sanitization: escape user input delimiters (FIX SEC-03)
    - Forward ke Groq API via reqwest
    - Parse SSE response
    - Return parsed content

TTS handler:
[ ] async fn ai_tts(body: ShmSlice) → audio/wav binary response
    - Rate limit: 10req/60s per user
    - Max input: 1200 chars
    - Forward ke Groq /audio/speech
    - Return WAV binary
Circuit breaker (VIL-native):
[ ] #[vil_fault] enum AiFault { UpstreamTimeout, RateLimit, ParseError }
    - Declarative failover di VilApp mesh config
    - Retry with backoff: built-in VIL pattern

Token budget:
[ ] Token limits: Free=15, Basic=500, C2=5000 per day
[ ] consume_token: atomic UPDATE ai_token_usage SET tokens_used = tokens_used + 1
[ ] check_budget: SELECT tokens_used FROM ai_token_usage WHERE user_id AND date

Frontend:
[ ] Ganti groq/client.ts → fetch /api/ai/generate
[ ] Hapus src/services/groq/ directory
[ ] Hapus subscriptionService.ts client-side budget check
[ ] Hapus @langchain/groq, @google/genai dari package.json
```

---

## 10. PHASE 4: WRITING & ESSAY

**Target:** Writing gym, essay evaluation, peer review, mason, devils advocate
**Estimasi:** 1 minggu

**Referensi contoh VIL:**
| Example | Pelajari apa | File |
|---------|-------------|------|
| `004-basic-rest-crud` | CRUD + update + delete pattern, input validation | Submission/review CRUD |
| `035-basic-vil-service-module` | Multi-domain service modules (patient + appointment → writing + peer_review) | Modular service pattern |
| `037-basic-vilmodel-derive` | VilModel untuk WritingSubmission, PeerReview, ReviewerProfile | Data models |
| `012-basic-plugin-database` | Complex SQL queries, SqlxPool patterns | DB queries untuk queue/filter |

```
VIL ServiceProcess:
[ ] let writing = ServiceProcess::new("writing")
        // Writing gym
        .endpoint(Method::GET, "/progress", get(writing_progress))
        .endpoint(Method::POST, "/progress", post(save_progress))
        .endpoint(Method::POST, "/exercise", post(get_exercise))
        .endpoint(Method::GET, "/sessions", get(writing_sessions))
        .endpoint(Method::POST, "/sessions", post(save_session))
        // Essay
        .endpoint(Method::POST, "/evaluate", post(evaluate_essay))
        .endpoint(Method::GET, "/integrated/tasks", get(integrated_tasks))
        .endpoint(Method::POST, "/integrated/sessions", post(save_integrated))
        .endpoint(Method::GET, "/model-essays", get(model_essays))
        .endpoint(Method::POST, "/model-essays/save", post(save_essay))
        .endpoint(Method::GET, "/vocabulary", get(vocabulary))
        .endpoint(Method::POST, "/vocabulary", post(add_vocabulary))
        // Peer review
        .endpoint(Method::POST, "/peer-review/submissions", post(submit_essay))
        .endpoint(Method::GET, "/peer-review/queue", get(review_queue))
        .endpoint(Method::POST, "/peer-review/reviews", post(submit_review))
        .endpoint(Method::GET, "/peer-review/stats", get(reviewer_stats))
        // Mason & Devils Advocate
        .endpoint(Method::POST, "/mason/sessions", post(create_mason))
        .endpoint(Method::PATCH, "/mason/sessions/:id", patch(update_mason))
        .endpoint(Method::POST, "/devils-advocate", post(devils_advocate));

Services:
[ ] src/services/writing.rs
    - Exercise pool: pop_exercise (SELECT + DELETE atomic)
    - Progress upsert: ON CONFLICT (user_id, level, skill_id) DO UPDATE
[ ] src/services/essay_eval.rs
    - Prompt builder: escape user essay content
    - AI evaluation via /api/ai/generate internal call
    - Response validation before return
[ ] src/services/peer_review.rs
    - Submit: user_id dari JWT (FIX SEC-08)
    - Claim: atomic UPDATE WHERE claimed_by IS NULL
    - Review: reviewer_id dari JWT (FIX SEC-08)
    - Stats: aggregate query (replace calculate_reviewer_stats RPC)
[ ] src/services/mason.rs - Session CRUD, logging, metrics

Frontend:
[ ] Ganti writingGymService.ts → fetch /api/writing/*
[ ] Ganti essayEvaluationService.ts → fetch /api/writing/evaluate
[ ] Ganti peerReviewService.ts → fetch /api/peer-review/*
[ ] Ganti integratedWritingService.ts → fetch /api/writing/integrated/*
[ ] Ganti masonSessionService.ts → fetch /api/writing/mason/*
```

---

## 11. PHASE 5: SOCIAL & CIRCLES

**Target:** Friends, circles, messages, leaderboard, oracle, achievements

**Referensi contoh VIL:**
| Example | Pelajari apa | File |
|---------|-------------|------|
| `010-basic-websocket-chat` | WebSocket bidirectional, broadcast, tokio::sync::broadcast | **Circle messages realtime** |
| `028-basic-sse-hub-streaming` | SSE hub broadcast, live event streaming | Alternatif SSE untuk notifications |
| `005-basic-multiservice-mesh-ndjson` | Multi-service mesh routing, NDJSON transform | Inter-service communication |
| `031-basic-mesh-routing` | Tri-Lane mesh routing antar ServiceProcess | Social → Notification routing |

```
Rust:
[ ] src/routes/social.rs - Circles, friends, leaderboard, oracle (lihat §5)
[ ] src/services/circle.rs
    - CRUD circles + members + messages
    - Role management (admin, member)
    - Message sanitization before store (FIX SEC-04 prevention)
[ ] src/services/friend.rs
    - Add friend: bilateral insert (user→friend + friend→user)
    - Friend code: generate + lookup
[ ] src/services/leaderboard.rs
    - SQL computed rank: ROW_NUMBER() OVER (ORDER BY xp DESC)
    - In-memory LRU cache: 5 min TTL
[ ] src/services/oracle.rs - Predictions, history, recommendations

Frontend:
[ ] Ganti circleService.ts → fetch /api/circles/*
[ ] Ganti friendService.ts → fetch /api/friends/*
[ ] Ganti leaderboardService.ts → fetch /api/leaderboard/*
[ ] Ganti oracleService.ts → fetch /api/oracle/*
```

**Note:** Realtime circle messages → Phase 8 (WebSocket)

---

## 12. PHASE 6: CREATOR ECONOMY & PAYMENTS

**Target:** Creators, daily bites, tips, earnings, payouts

**Referensi contoh VIL:**
| Example | Pelajari apa | File |
|---------|-------------|------|
| `032-basic-failover-ha` | Payment gateway failover + retry, idempotency | Payment resilience |
| `004-basic-rest-crud` | Transactional CRUD, atomic operations | Tip/payout CRUD |
| `017-basic-production-fullstack` | Enterprise patterns, audit trail | Creator economy patterns |

```
Rust:
[ ] src/routes/creator.rs - Creator + bites endpoints (lihat §5)
[ ] src/routes/payment.rs - Tips, payouts
[ ] src/services/creator.rs
    - record_bite_view: atomic view count + earnings
    - Stats: aggregation queries (replace RPC)
[ ] src/services/payment.rs
    - process_tip: idempotent via order_id UNIQUE constraint
    - Payout request: creator_id dari JWT (FIX SEC-05)
    - Process payout: admin middleware required (FIX SEC-05)

Frontend:
[ ] Ganti purchaseService.ts → fetch /api/creators/*, /api/bites/*
```

---

## 13. PHASE 7: MONITORING, LOGGING, CLEANUP

**Target:** App logs, metrics, error tracking, feature flags, moderation, blog, alerts

**Referensi contoh VIL:**
| Example | Pelajari apa | File |
|---------|-------------|------|
| `039-basic-observer-dashboard` | Observer dashboard, MetricsCollector, system_log! | **Monitoring utama — sebagian besar sudah built-in** |
| `501-villog-stdout-dev` | vil_log SPSC ring buffer, structured logging | Logging system |
| `506-villog-structured-events` | Structured event logging, 7 log types | Event categorization |
| `801-trigger-cron-basic` | Cron trigger for periodic tasks | Cleanup expired claims, old logs |

> **Note:** Dengan `.observer(true)`, sebagian besar monitoring (health, metrics, latency) sudah GRATIS. Phase ini lebih fokus ke business-level logging (app_logs) dan periodic cleanup tasks.

```
Rust:
[ ] src/routes/logging.rs
    - POST /api/logs/batch → batch insert app_logs
    - POST /api/metrics/batch → batch insert app_metrics
[ ] src/routes/monitoring.rs (admin only)
    - GET /api/admin/monitoring/health → system_health_dashboard query
    - GET /api/admin/monitoring/errors → error summary queries
    - GET /api/admin/monitoring/latency → latency percentile query
[ ] src/routes/feature_flags.rs (admin only)
[ ] src/routes/blog.rs
[ ] src/routes/moderation.rs (admin only)
[ ] src/services/moderation.rs - Content reports, queue, user history
[ ] src/tasks/mod.rs - Background periodic tasks:
    - cleanup_expired_claims: every 30 min
    - cleanup_old_error_logs: every 24h
    - cleanup_expired_rate_limits: every 1h
    - alerts_check: every 5 min (Slack webhook)
    - monitor_alerts: every 5 min (Discord webhook, config-driven)

Frontend:
[ ] Ganti loggingService.ts → fetch /api/logs/batch
[ ] Ganti metricsService.ts → fetch /api/metrics/batch
[ ] Ganti blogService.ts → fetch /api/blog/*
[ ] Ganti moderationService.ts → fetch /api/admin/moderation/*
```

---

## 14. PHASE 8: STORAGE & REALTIME

**Target:** File storage (avatars, audio), WebSocket for circle messages

**Referensi contoh VIL:**
| Example | Pelajari apa | File |
|---------|-------------|------|
| `010-basic-websocket-chat` | **WebSocket chat dengan broadcast** — langsung applicable untuk circle messages | Pattern utama |
| `028-basic-sse-hub-streaming` | SSE hub alternative untuk realtime updates | Jika SSE lebih cocok |
| `601-storage-s3-basic` | S3-compatible storage pattern | Jika pakai object storage |

```
Rust:
[ ] src/routes/storage.rs
    - POST /api/storage/avatars → save to /opt/tupel-quis/uploads/avatars/
    - GET  /api/storage/avatars/:path → serve static file
    - POST /api/storage/audio → save to /opt/tupel-quis/uploads/audio/
    - GET  /api/storage/audio/:path → serve static file
    - Validate: MIME type + magic bytes + size limit (FIX SEC-10)
[ ] src/routes/ws.rs
    - WS /api/ws/circles/:id → WebSocket for circle messages
    - Auth via token query param
    - Broadcast to circle members
[ ] Alternatif: SSE (Server-Sent Events) jika WebSocket terlalu complex

Frontend:
[ ] Ganti supabase.storage → fetch /api/storage/*
[ ] Ganti supabase.channel('circle_messages') → WebSocket /api/ws/circles/:id
[ ] Ganti audioStorageService.ts → fetch /api/storage/audio
```

---

## 15. PHASE 9: FRONTEND CUTOVER

**Target:** Hapus semua Supabase dependency, final cleanup

```
Frontend:
[ ] Hapus @supabase/supabase-js dari package.json
[ ] Hapus src/services/supabase.ts
[ ] Hapus supabase/ directory (functions, migrations)
[ ] Hapus VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY dari .env
[ ] Update .env.example:
    VITE_API_URL=https://api.tupelquis.vastar.ai
[ ] Update capacitor.config.ts: server URL
[ ] Update vite.config.ts: remove supabase proxy if any
[ ] Update offlineQueue.ts: sync ke /api/sync/mutations
[ ] Update pushNotificationService.ts: register ke /api/notifications/register
[ ] Full regression test
[ ] Supabase project → archive/shutdown
```

---

## 16. SECURITY FIXES (dari Assessment)

Semua fix terintegrasi dalam phase masing-masing:

| ID | Issue | Fixed In | How |
|----|-------|----------|-----|
| SEC-01 | increment_xp tanpa auth | Phase 2 | user_id dari JWT, bukan param |
| SEC-02 | XSS dangerouslySetInnerHTML | Phase 4 | Sanitize content sebelum store di backend |
| SEC-03 | AI Prompt Injection | Phase 3 | PromptBuilder escape delimiters di backend |
| SEC-04 | XSS chat message | Phase 5 | Sanitize message sebelum store |
| SEC-05 | Payout tanpa auth | Phase 6 | Admin middleware + creator_id dari JWT |
| SEC-06 | Circuit breaker anon CRUD | Phase 7 | In-memory, bukan DB accessible |
| SEC-07 | Writing gym guest CRUD | Phase 4 | Guest session scoped + validasi backend |
| SEC-08 | Peer review fake user_id | Phase 4 | user_id dari JWT |
| SEC-09 | Admin passcode client-side | Phase 1 | Backend Argon2id verify |
| SEC-10 | PDF upload no MIME check | Phase 8 | MIME + magic bytes validation |
| SEC-11 | YouTube API key exposed | Phase 3 | Proxy via backend |
| SEC-12 | CEFR test set UPDATE permissive | Phase 2 | Backend endpoint with ownership check |
| SEC-13 | Peer review full public SELECT | Phase 4 | Scoped to author + reviewer |

---

## 17. SQLITE SCHEMA

### Type Mapping

| PostgreSQL | SQLite |
|-----------|--------|
| UUID | TEXT (uuid string) |
| TIMESTAMPTZ | TEXT (ISO 8601) |
| SERIAL | INTEGER PRIMARY KEY AUTOINCREMENT |
| JSONB | TEXT (JSON string) |
| BOOLEAN | INTEGER (0/1) |
| TEXT[] | TEXT (JSON array) |
| DECIMAL(x,y) | REAL |
| BYTEA | BLOB |

### Key Merged Tables (SQLite DDL)

```sql
-- ============================================
-- PRAGMA (di main.rs saat startup)
-- ============================================
-- PRAGMA journal_mode = WAL;
-- PRAGMA synchronous = NORMAL;
-- PRAGMA foreign_keys = ON;
-- PRAGMA busy_timeout = 5000;

-- ============================================
-- AUTH & ADMIN
-- ============================================

CREATE TABLE profiles (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    friend_code TEXT UNIQUE,
    hearts_count INTEGER DEFAULT 5,
    xp INTEGER DEFAULT 0,
    subscription_tier TEXT DEFAULT 'free',
    fcm_token TEXT,
    password_hash TEXT NOT NULL,
    peer_review_prefs TEXT,  -- JSON (merged dari peer_review_preferences)
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE admin_users (
    user_id TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    email TEXT,
    role TEXT DEFAULT 'admin',
    pin_hash TEXT,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ============================================
-- QUIZ
-- ============================================

CREATE TABLE quiz_results (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    skill_id TEXT,
    section TEXT NOT NULL,
    score INTEGER NOT NULL,
    correct_count INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    xp_earned INTEGER NOT NULL,
    breakdown TEXT  -- JSON (merged dari quiz_reports)
);
CREATE INDEX idx_quiz_results_user_date ON quiz_results(user_id, date DESC);

-- ============================================
-- WRITING (merged tables)
-- ============================================

-- writing_gym_sessions + writing_gym_sessions_v2 + mason_sessions + integrated_writing_sessions → 1 tabel
CREATE TABLE writing_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    level TEXT NOT NULL,       -- 'mason', 'logic_weaver', 'complexity_ladder', 'integrated', dll
    skill_id TEXT,
    session_state TEXT,        -- JSON
    best_score INTEGER,
    status TEXT DEFAULT 'in_progress',
    expires_at TEXT,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX idx_writing_sessions_user ON writing_sessions(user_id, level, status);

-- writing_submissions + essay_metrics → 1 tabel
CREATE TABLE writing_submissions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    task_type TEXT NOT NULL,   -- 'discussion', 'integrated', 'independent', 'ielts_sim'
    prompt TEXT,
    reading_passage TEXT,
    user_essay TEXT NOT NULL,
    word_count INTEGER,
    ai_score INTEGER,
    ai_feedback TEXT,          -- JSON
    breakdown TEXT,            -- JSON (merged dari essay_metrics)
    time_spent_seconds INTEGER, -- merged dari essay_metrics
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX idx_writing_submissions_user ON writing_submissions(user_id, created_at DESC);

-- integrated_writing_samples + model_essays → 1 tabel
CREATE TABLE model_essays (
    id TEXT PRIMARY KEY,
    topic TEXT,
    task_type TEXT NOT NULL,   -- 'band9', 'integrated_sample', 'discussion', dll
    content TEXT NOT NULL,
    word_count INTEGER,
    band_score REAL,
    breakdown TEXT,            -- JSON
    annotations TEXT,          -- JSON
    highlights TEXT,           -- JSON (dari integrated_writing_samples)
    category TEXT,
    source TEXT,
    views_count INTEGER DEFAULT 0,
    saves_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- user_saved_essays + essay_interactions → 1 tabel
CREATE TABLE user_saved_essays (
    user_id TEXT NOT NULL,
    essay_id TEXT NOT NULL REFERENCES model_essays(id) ON DELETE CASCADE,
    notes TEXT,
    time_spent_ms INTEGER,     -- merged dari essay_interactions
    completed INTEGER DEFAULT 0, -- merged dari essay_interactions
    saved_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    PRIMARY KEY (user_id, essay_id)
);

-- ============================================
-- PEER REVIEW (merged tables)
-- ============================================

-- reviewer_stats + reviewer_qualifications → 1 tabel
CREATE TABLE reviewer_profiles (
    user_id TEXT PRIMARY KEY,
    total_reviews INTEGER DEFAULT 0,
    avg_helpfulness REAL DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    tier TEXT DEFAULT 'novice',
    quality_average REAL DEFAULT 0,
    tutorial_completed INTEGER DEFAULT 0,  -- merged dari reviewer_qualifications
    quiz_score INTEGER,                     -- merged dari reviewer_qualifications
    qualification_level INTEGER DEFAULT 0,  -- merged dari reviewer_qualifications
    updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ============================================
-- SOCIAL (merged tables)
-- ============================================

-- score_predictions + prediction_history → 1 tabel
CREATE TABLE predictions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    prediction_type TEXT NOT NULL,
    predicted_value REAL,
    actual_value REAL,
    confidence REAL,
    breakdown TEXT,            -- JSON
    is_current INTEGER DEFAULT 1,  -- latest prediction per type
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX idx_predictions_user ON predictions(user_id, prediction_type, is_current);

-- ============================================
-- CREATOR ECONOMY (merged tables)
-- ============================================

-- tip_transactions + payment_transactions + payout_requests → 1 tabel
CREATE TABLE transactions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('tip','payment','payout')),
    order_id TEXT UNIQUE,      -- idempotency key
    from_user_id TEXT,
    to_creator_id TEXT,
    bite_id TEXT,
    amount REAL NOT NULL,
    platform_fee REAL DEFAULT 0,
    creator_amount REAL DEFAULT 0,
    currency TEXT DEFAULT 'IDR',
    status TEXT DEFAULT 'pending',
    provider TEXT,
    metadata TEXT,             -- JSON (payout_method for payouts, etc)
    processed_by TEXT,         -- admin who processed payout
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT
);
CREATE INDEX idx_transactions_type ON transactions(type, status);
CREATE INDEX idx_transactions_creator ON transactions(to_creator_id, created_at DESC);
CREATE INDEX idx_transactions_order ON transactions(order_id);

-- bite_interactions + bite_progress → 1 tabel
CREATE TABLE bite_interactions (
    id TEXT PRIMARY KEY,
    bite_id TEXT NOT NULL,
    user_id TEXT,
    interaction_type TEXT CHECK (interaction_type IN ('view','like','share','quiz')),
    watch_duration_seconds INTEGER,
    quiz_correct INTEGER,
    progress REAL DEFAULT 0,   -- merged dari bite_progress (0.0 - 1.0)
    completed INTEGER DEFAULT 0, -- merged dari bite_progress
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX idx_bite_interactions_bite ON bite_interactions(bite_id, interaction_type);

-- ============================================
-- LOGGING (merged tables)
-- ============================================

-- app_logs + error_logs → 1 tabel
CREATE TABLE app_logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    level TEXT NOT NULL CHECK (level IN ('debug','info','warn','error','critical')),
    component TEXT,            -- 'mason', 'peer_review', 'groq', 'auth', dll
    message TEXT NOT NULL,
    user_id TEXT,
    session_id TEXT,
    metadata TEXT,             -- JSON
    stack_trace TEXT,          -- merged dari error_logs
    resolved INTEGER DEFAULT 0, -- merged dari error_logs
    resolved_at TEXT,          -- merged dari error_logs
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX idx_app_logs_level ON app_logs(level, timestamp DESC);
CREATE INDEX idx_app_logs_component ON app_logs(component, timestamp DESC);
```

### Tabel yang TIDAK berubah (tidak perlu DDL, schema sama)

```
passages, question_bank, user_question_history, cefr_results,
ai_token_usage, subscriptions, feature_usage,
writing_gym_progress, integrated_writing_tasks, collected_vocabulary,
devils_advocate_sessions, peer_review_submissions, peer_reviews,
friends, circles, circle_members, circle_messages,
notifications, user_achievements, creators, daily_bites,
creator_earnings, app_metrics, alert_config, alert_history,
feature_flags, content_reports, blog_posts, admin_audit_logs
```

---

## 18. DEPLOYMENT

### LXC Setup

```
IP: 10.10.0.14
Hostname: tupel-quis-backend
Bridge: vmbr2
OS: Ubuntu 22.04
Nesting: tidak perlu (bukan Docker)
```

### Directory Structure

```
/opt/toefl-quiz/
├── toefl-quiz-backend          # VIL Rust binary (~15-20MB)
├── data.db                     # SQLite database
├── data.db-wal                 # WAL file
├── uploads/
│   ├── avatars/
│   └── audio/
└── .env                        # Hanya Infisical bootstrap
```

### .env

```
INFISICAL_CLIENT_ID=xxx
INFISICAL_CLIENT_SECRET=xxx
INFISICAL_PROJECT_ID=xxx
INFISICAL_ENVIRONMENT=production
INFISICAL_HOST=http://10.10.0.11:8080
LISTEN_ADDR=0.0.0.0:8082
DATABASE_URL=sqlite:///opt/toefl-quiz/data.db
VIL_OBSERVER_PORT=9082
```

### Systemd

```ini
[Unit]
Description=TOEFL Quiz VIL Backend
After=network.target

[Service]
Type=simple
User=toeflquiz
WorkingDirectory=/opt/toefl-quiz
ExecStart=/opt/toefl-quiz/toefl-quiz-backend
Restart=always
RestartSec=5
EnvironmentFile=/opt/toefl-quiz/.env
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
```

### Built-in Endpoints (VIL gratis)

```
:8082  → Public API (semua ServiceProcess endpoints)
:9082  → VIL Observer Dashboard (metrics, health, latency graphs)
         GET /health → auto
         GET /ready → auto
         GET /metrics → Prometheus-compatible auto
         GET /info → server info auto
```

### Build & Deploy

```bash
# Build (dari Aplikasi-Ibrohim/new-toefl-quiz/)
cargo build --release --target x86_64-unknown-linux-gnu

# Deploy
scp target/release/toefl-quiz-backend root@10.10.0.14:/opt/toefl-quiz/
ssh root@10.10.0.14 "systemctl restart toefl-quiz"
```

### Nginx Proxy Manager

```
# Public API
Domain: api.toeflquiz.vastar.ai
Forward: http://10.10.0.14:8082
SSL: Let's Encrypt

# Observer Dashboard (internal only, via VPN)
Domain: obs.toeflquiz.vastar.ai
Forward: http://10.10.0.14:9082
SSL: Let's Encrypt
Access: pfSense rule → VPN only
```

### OneDev CI

```
Repository: new-toefl-quiz (10.10.0.7:6610)
On push to main:
  1. cargo test
  2. cargo build --release
  3. scp binary ke 10.10.0.14
  4. systemctl restart toefl-quiz
```

### Data Migration

```bash
#!/bin/bash
# scripts/migration/migrate_from_supabase.sh

# 1. Export dari Supabase PostgreSQL
SUPABASE_DB="postgresql://postgres:xxx@db.xxx.supabase.co:5432/postgres"
for table in profiles quiz_results question_bank passages \
  ai_token_usage subscriptions peer_review_submissions peer_reviews \
  writing_gym_progress admin_users admin_audit_logs circles \
  circle_members friends notifications; do
  pg_dump --data-only --table=public.$table "$SUPABASE_DB" > export/$table.sql
done

# 2. Create SQLite schema
sqlite3 /opt/tupel-quis/tupel_quis.db < schema.sqlite.sql

# 3. Import (custom script per table, handle type conversion)
python3 scripts/migration/pg_to_sqlite.py

# 4. Verify
sqlite3 /opt/tupel-quis/tupel_quis.db "SELECT count(*) FROM profiles;"
sqlite3 /opt/tupel-quis/tupel_quis.db "PRAGMA integrity_check;"
sqlite3 /opt/tupel-quis/tupel_quis.db "PRAGMA foreign_key_check;"
```
