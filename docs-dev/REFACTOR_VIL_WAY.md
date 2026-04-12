# Refactor Plan: Konvensional → Full VIL Way

**Tanggal:** 3 April 2026
**Tujuan:** TOEFL Quiz sebagai PoC (Proof of Concept) VIL — 100% semantic, macro-driven, zero-copy
**Status saat ini:** 68 endpoints working, tapi ~100+ instances masih konvensional

---

## AUDIT SUMMARY

| | Sekarang | Target VIL Way |
|---|---------|---------------|
| Response construction | 62× `serde_json::json!()` | `#[derive(VilModel)]` structs |
| DB queries | 29× `query_as::<_, (tuple)>` | `#[derive(VilEntity)]` + repository |
| LLM calls | 3× `reqwest::Client` | `vil_llm` + `vil_ai_gateway` |
| Auth/JWT | Manual `jsonwebtoken` crate | `vil_server_auth::JwtAuth` |
| Error handling | Manual `AppError` enum | `#[vil_fault]` semantic |
| Handler wiring | Plain `async fn` | `#[vil_handler]` / `#[vil_endpoint]` |
| Periodic tasks | `tokio::time::interval` | `vil_trigger_cron::CronTrigger` |
| Logging | `app_log!` only | `ai_log!`, `db_log!`, `security_log!`, `access_log!` |
| AI prompts | String concatenation | `vil_prompts::PromptTemplate` |
| AI output | Manual `serde_json::from_str` | `vil_output_parser::JsonOutputParser` |
| AI safety | None | `vil_prompt_shield` + `vil_guardrails` |
| AI cost | Manual DB tracking | `vil_cost_tracker::CostTracker` |
| AI observability | None | `vil_ai_trace::AiTracer` |
| AI caching | None | `vil_llm_cache::SemanticCache` |
| WebSocket | None (polling) | `vil_ws::WsServer` + `RoomManager` |
| Validation | Manual `if` checks | `vil_server_web::Valid<T>` |
| E2E testing | External process + reqwest | `vil_server_test::TestClient` |

---

## REFACTOR PHASES

### R1: VIL Fault & Error System

**File:** `src/error.rs`
**Effort:** 30 menit
**Crate:** `vil_server_web` (HandlerError, HandlerResult)

**Sekarang:**
```rust
#[derive(Debug)]
pub enum AppError {
    Auth(String),
    Forbidden(String),
    NotFound(String),
    Validation(String),
    RateLimited { retry_after_secs: u64 },
    TokenLimitReached,
    AiUnavailable(String),
    Internal(String),
}
// + manual IntoResponse impl (20 lines)
```

**Target VIL Way:**
```rust
use vil_server_macros::*;

#[vil_fault]
pub enum AppFault {
    AuthRequired { reason: String },
    Forbidden { reason: String },
    NotFound { resource: String },
    ValidationFailed { field: String, message: String },
    RateLimited { retry_after_secs: u64 },
    TokenLimitReached,
    AiUnavailable { provider: String },
    InternalError,
}
// Auto-generated: Into<ControlSignal>, signal_error(), IntoResponse
```

**Impact:** Semua handler berubah dari `Result<VilResponse<T>, AppError>` ke `Result<VilResponse<T>, AppFault>`

---

### R2: VIL Server Auth (JWT + Rate Limit)

**File:** `src/middleware/auth.rs`, `src/middleware/admin.rs`
**Effort:** 1 jam
**Crate:** `vil_server_auth`

**Sekarang:**
```rust
// 95 lines manual JWT — encode, decode, FromRequestParts impl
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
```

**Target VIL Way:**
```rust
use vil_server_auth::{JwtAuth, JwtConfig, Claims};

// Config
let jwt = JwtAuth::new(JwtConfig {
    secret: config.jwt_secret.clone(),
    expiry_secs: config.jwt_expiry_secs,
    issuer: "toefl-quiz".into(),
});

// Di handler — auto-extract dari header
async fn get_profile(claims: Claims, ...) -> ... { }

// Rate limiting
use vil_server_auth::RateLimit;
let limiter = RateLimit::sliding_window(20, Duration::from_secs(60));
```

**Impact:** Hapus `jsonwebtoken` dari Cargo.toml, hapus `password-hash` crate, middleware/auth.rs jadi ~20 lines

---

### R3: VIL Handler Macros

**Files:** Semua `src/services/*.rs`
**Effort:** 1 jam
**Crate:** `vil_server_macros`

**Sekarang:**
```rust
pub async fn register(
    Extension(state): Extension<AppState>,
    body: ShmSlice,
) -> Result<VilResponse<AuthResponse>, AppError> {
```

**Target VIL Way:**
```rust
#[vil_handler]
pub async fn register(
    Extension(state): Extension<AppState>,
    body: ShmSlice,
) -> Result<VilResponse<AuthResponse>, AppFault> {
// Auto-generated: RequestId injection, tracing span, error mapping
```

Atau lebih concise:
```rust
#[vil_endpoint]
pub async fn register(body: ShmSlice, state: Extension<AppState>) -> VilResult<AuthResponse> {
```

**Impact:** Setiap handler dapat auto-tracing, RequestId, consistent error response

---

### R4: VilModel Response Types (62 → 0 serde_json::json!)

**Files:** Semua `src/services/*.rs`
**Effort:** 2 jam
**Crate:** `vil_server_core` (VilModel derive)

**Sekarang (62 instances):**
```rust
Ok(VilResponse::ok(serde_json::json!({
    "total_views": total_views,
    "total_earnings": total_earnings,
    "pending_earnings": pending_earnings,
    "total_bites": total_bites
})))
```

**Target VIL Way:**
```rust
#[derive(Serialize, VilModel)]
struct CreatorStatsResponse {
    total_views: i64,
    total_earnings: f64,
    pending_earnings: f64,
    total_bites: i64,
}

Ok(VilResponse::ok(CreatorStatsResponse { total_views, total_earnings, pending_earnings, total_bites }))
```

**Daftar response types yang perlu dibuat:**

| Service | Types Needed |
|---------|-------------|
| auth | `TokenPairResponse`, `RefreshResponse` |
| admin | `OkResponse`, `PinVerifyResponse` |
| quiz | `SaveResultResponse`, `ProgressResponse` |
| ai | `TokenUsageResponse` |
| writing | `OkResponse`, `ExerciseResponse`, `EvaluateResponse`, `VocabListResponse`, `DevilsAdvocateResponse` |
| social | `CircleMessageResponse`, `PredictionListResponse`, `AchievementListResponse`, `NotificationListResponse` |
| creator | `CreatorRegResponse`, `CreatorProfileResponse`, `CreatorStatsResponse`, `TipResponse`, `PayoutResponse` |
| storage | `UploadResponse` |
| blog | `PostListResponse`, `PostDetailResponse` |
| admin_monitoring | `SystemHealthResponse`, `ErrorListResponse`, `FlagListResponse`, `ReportListResponse` |

**Total: ~25 response structs baru**

---

### R5: VilEntity + Repository Pattern (29 → 0 manual tuples)

**Files:** `src/models/*.rs`, semua services
**Effort:** 2 jam
**Crate:** `vil_db_macros`, `vil_db_semantic`

**Sekarang (29 instances):**
```rust
let rows = sqlx::query_as::<_, (String, Option<String>, Option<String>, i64)>(
    "SELECT p.id, p.full_name, p.avatar_url, p.xp FROM profiles p ..."
).fetch_all(pool).await?;

let list: Vec<_> = rows.iter().map(|r| serde_json::json!({
    "id": r.0, "full_name": r.1, "avatar_url": r.2, "xp": r.3
})).collect();
```

**Target VIL Way:**
```rust
#[derive(VilEntity, Serialize, Deserialize, sqlx::FromRow)]
#[vil(source = "main_db", table = "profiles")]
pub struct FriendView {
    #[vil(primary_key)]
    pub id: String,
    pub full_name: Option<String>,
    pub avatar_url: Option<String>,
    pub xp: i64,
}

// Query langsung ke typed struct
let friends = sqlx::query_as::<_, FriendView>("SELECT ... ").fetch_all(pool).await?;
Ok(VilResponse::ok(friends)) // No manual mapping
```

**View structs yang perlu dibuat:**

| Service | View Struct |
|---------|------------|
| social | `FriendView`, `MessageView`, `PredictionView`, `AchievementView`, `NotificationView` |
| creator | `CreatorOverview`, `BiteListItem`, `CreatorStats` |
| blog | `PostListItem`, `PostDetail` |
| admin_monitoring | `ErrorLogView`, `FlagView`, `ReportView`, `SystemHealth` |
| writing | `ModelEssayListItem`, `VocabItem` |

**Total: ~15 view structs baru**

---

### R6: VIL LLM + AI Gateway (Groq Proxy Rewrite)

**File:** `src/services/ai.rs`, `src/services/writing.rs`
**Effort:** 2 jam
**Crates:** `vil_llm`, `vil_ai_gateway`, `vil_prompts`, `vil_output_parser`, `vil_prompt_shield`, `vil_cost_tracker`, `vil_ai_trace`

**Sekarang:**
```rust
// Manual reqwest to Groq (30+ lines per call)
let client = reqwest::Client::new();
let resp = client
    .post(&state.config.groq_api_url)
    .header("Authorization", format!("Bearer {}", state.config.groq_api_key))
    .json(&serde_json::json!({ "model": model, "messages": req.messages, ... }))
    .send().await?;
let data: serde_json::Value = resp.json().await?;
```

**Target VIL Way:**
```rust
use vil_llm::{LlmProvider, ChatRequest, ChatMessage};
use vil_ai_gateway::{AiGateway, RoutingPolicy};
use vil_prompts::PromptTemplate;
use vil_output_parser::JsonOutputParser;
use vil_prompt_shield::PromptShield;
use vil_cost_tracker::CostTracker;
use vil_ai_trace::AiTracer;

// Setup (di main.rs, inject via Extension)
let gateway = AiGateway::builder()
    .provider("groq", GroqProvider::new(&config.groq_api_key))
    .routing(RoutingPolicy::CostAware)
    .circuit_breaker(5, Duration::from_secs(60))
    .build();

let shield = PromptShield::default();
let tracer = AiTracer::new("toefl-quiz");
let cost_tracker = CostTracker::new(model_pricing);

// Di handler (5 lines instead of 30)
async fn generate(body: ShmSlice, claims: Claims, gw: Extension<AiGateway>) -> VilResult<ChatResponse> {
    let req: GenerateRequest = body.json()?;

    // 1. Shield: prompt injection check
    shield.check(&req.messages)?;

    // 2. Gateway: route to best provider
    let span = tracer.start_span("chat_completion");
    let response = gw.chat(ChatRequest {
        model: req.model.unwrap_or("llama-3.3-70b-versatile"),
        messages: req.messages,
        temperature: req.temperature.unwrap_or(0.3),
    }).await?;
    span.end();

    // 3. Track cost
    cost_tracker.record(&claims.sub, &response.usage)?;

    // 4. Log (semantic)
    ai_log!(Info, AiPayload {
        provider_hash: register_str("groq"),
        model_hash: register_str(response.model),
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        latency_us: span.duration_us(),
        ..Default::default()
    });

    Ok(VilResponse::ok(response))
}
```

**Prompt templates:**
```rust
// Registered once at startup
let essay_eval_prompt = PromptTemplate::new("essay_evaluation")
    .system("You are an IELTS writing examiner. Evaluate: {{task_type}}")
    .user("Topic: {{prompt}}\n\nEssay:\n{{essay}}")
    .build();

let devils_advocate_prompt = PromptTemplate::new("devils_advocate")
    .system("Challenge the user's argument with a counter-point.")
    .user("{{user_argument}}")
    .build();

// Usage
let messages = essay_eval_prompt.render(&[
    ("task_type", &req.task_type),
    ("prompt", req.prompt.as_deref().unwrap_or("General")),
    ("essay", &req.essay),
])?;
```

**Output parsing:**
```rust
use vil_output_parser::JsonOutputParser;

let parser = JsonOutputParser::<EssayFeedback>::new();
let feedback = parser.parse(response.content)?;
// Auto-repair malformed JSON, typed extraction
```

**Impact:**
- Hapus `reqwest` dari Cargo.toml (untuk AI calls)
- Hapus manual JSON body construction
- Automatic cost tracking per user
- Prompt injection protection (SEC-03 proper fix)
- AI operation tracing + latency metrics
- Circuit breaker + failover built-in

---

### R7: VIL Semantic Logging (7 log types)

**Files:** Semua services
**Effort:** 1 jam
**Crate:** `vil_log`

**Sekarang:** `app_log!` everywhere

**Target VIL Way — 7 semantic log types:**

| Log Type | Dipakai Di | Contoh |
|----------|-----------|--------|
| `app_log!` | Business events | `app_log!(Info, "user.registered", { user_id: 123u64 })` |
| `access_log!` | HTTP request/response | Auto via `#[vil_handler]` |
| `ai_log!` | LLM inference | `ai_log!(Info, AiPayload { provider_hash, model_hash, input_tokens, ... })` |
| `db_log!` | Database operations | `db_log!(Info, DbPayload { operation: 1, table_hash, duration_us, rows_affected, ... })` |
| `security_log!` | Auth events | `security_log!(Warn, SecurityPayload { event_type: 2, user_hash, ... })` |
| `system_log!` | OS resources | Auto via VIL Observer |
| `mq_log!` | Message queue | N/A (tidak pakai MQ) |

**Mapping per service:**

| Service | Sekarang | Target |
|---------|---------|--------|
| auth: register/login | `app_log!` | `security_log!(Info, ...)` untuk login success, `security_log!(Warn, ...)` untuk failed |
| ai: generate | `app_log!(Error, "groq.api_error")` | `ai_log!(Error, AiPayload { ... })` |
| quiz: save_result | (none) | `db_log!(Info, DbPayload { operation: INSERT, table: "quiz_results", ... })` |
| admin: assign_role | (none) | `security_log!(Info, SecurityPayload { event: ROLE_CHANGE, ... })` |
| monitoring: batch_logs | (none) | `app_log!` (already correct) |

---

### R8: VIL Trigger Cron (Periodic Tasks)

**File:** `src/tasks/mod.rs`
**Effort:** 30 menit
**Crate:** `vil_trigger_cron`

**Sekarang:**
```rust
let mut interval = tokio::time::interval(Duration::from_secs(1800));
loop {
    interval.tick().await;
    cleanup_expired_claims(&pool).await;
    cleanup_old_logs(&pool).await;
}
```

**Target VIL Way:**
```rust
use vil_trigger_cron::{CronTrigger, CronConfig};

let cleanup_claims = CronTrigger::new(CronConfig {
    schedule: "*/30 * * * *".into(),  // Every 30 minutes
    name: "cleanup_expired_claims".into(),
    missed_fire: MissedFirePolicy::RunOnce,
});

let cleanup_logs = CronTrigger::new(CronConfig {
    schedule: "0 3 * * *".into(),  // Daily at 3 AM
    name: "cleanup_old_logs".into(),
    missed_fire: MissedFirePolicy::Skip,
});
```

---

### R9: VIL WebSocket (Circle Messages Real-time)

**File:** `src/services/social.rs` (new: ws handler)
**Effort:** 1 jam
**Crate:** `vil_ws`

**Sekarang:** HTTP polling (GET /circles/:id/messages)

**Target VIL Way:**
```rust
use vil_ws::{WsServer, RoomManager};

// Di main.rs
let ws = WsServer::new()
    .room_manager(RoomManager::new())
    .build();

// Endpoint
// WS /api/social/ws/circles/:id
async fn circle_ws(ws: WebSocketUpgrade, room: Extension<RoomManager>, path: Path<String>) -> Response {
    let room_id = format!("circle_{}", path.0);
    ws.on_upgrade(|socket| room.join(socket, &room_id))
}
```

---

### R10: VIL Guardrails (Essay Content Safety)

**File:** `src/services/writing.rs` (essay submit + evaluate)
**Effort:** 30 menit
**Crate:** `vil_guardrails`

**Sekarang:** No content safety check

**Target VIL Way:**
```rust
use vil_guardrails::{GuardrailsEngine, PiiDetector, ToxicityChecker};

let guardrails = GuardrailsEngine::builder()
    .pii_detector(PiiDetector::default())
    .toxicity_checker(ToxicityChecker::default())
    .build();

// Di essay submit
let result = guardrails.check(&req.essay_content)?;
if result.has_pii() {
    return Err(AppFault::ValidationFailed { field: "essay", message: "Contains PII" });
}
if result.toxicity_score() > 0.7 {
    return Err(AppFault::ValidationFailed { field: "essay", message: "Inappropriate content" });
}
```

---

### R11: VIL Server Test (E2E tanpa network)

**File:** `tests/e2e.rs`
**Effort:** 1 jam
**Crate:** `vil_server_test`

**Sekarang:** Start external server process + reqwest HTTP client

**Target VIL Way:**
```rust
use vil_server_test::TestClient;

#[tokio::test]
async fn test_register() {
    let app = build_app().await;  // Returns VilApp router
    let client = TestClient::new(app);

    let resp = client.post("/api/auth/register")
        .json(&json!({"username":"test","password":"test12345"}))
        .send().await;
    assert_eq!(resp.status(), 201);
}
// No network, no port, no external process
```

---

## DEPENDENCY CHANGES

### Tambah ke Cargo.toml

```toml
# VIL AI Stack
vil_llm = "0.1"
vil_ai_gateway = "0.1"
vil_ai_trace = "0.1"
vil_cost_tracker = "0.1"
vil_prompts = "0.1"
vil_prompt_shield = "0.1"
vil_output_parser = "0.1"
vil_guardrails = "0.1"
vil_llm_cache = "0.1"

# VIL Server Stack (tambahan)
vil_server_auth = "0.1"
vil_server_web = "0.1"
vil_server_format = "0.1"
vil_server_test = "0.1"         # [dev-dependencies]

# VIL Infrastructure
vil_trigger_cron = "0.1"
vil_ws = "0.1"
vil_cache = "0.1"
```

### Hapus dari Cargo.toml

```toml
# HAPUS — diganti VIL semantic
jsonwebtoken = "9"           # → vil_server_auth
argon2 = "0.5"               # → vil_server_auth
password-hash = "0.5"        # → vil_server_auth
async-trait = "0.1"          # → VIL macros auto-generate
reqwest = "0.12"             # → vil_llm (untuk AI calls)
                             #   Tetap keep kalau perlu untuk FCM/Slack webhooks
```

---

## EXECUTION ORDER

| # | Phase | Effort | Files Changed | Impact |
|---|-------|--------|--------------|--------|
| **R1** | Fault system | 30 min | error.rs, all services (return type) | Foundation |
| **R2** | Auth (JWT + rate limit) | 1 hr | middleware/, Cargo.toml | -95 lines manual JWT |
| **R3** | Handler macros | 1 hr | all services (annotation) | Auto-tracing, RequestId |
| **R4** | VilModel responses | 2 hr | all services, new models/ | -62 serde_json::json! |
| **R5** | VilEntity + views | 2 hr | models/, all services | -29 manual tuple queries |
| **R6** | LLM + AI Gateway | 2 hr | ai.rs, writing.rs, main.rs | Full AI semantic stack |
| **R7** | Semantic logging | 1 hr | all services | 7 log types proper |
| **R8** | Cron triggers | 30 min | tasks/mod.rs, main.rs | Declarative scheduling |
| **R9** | WebSocket | 1 hr | social.rs, main.rs | Real-time circles |
| **R10** | Guardrails | 30 min | writing.rs | Content safety |
| **R11** | TestClient | 1 hr | tests/e2e.rs | No-network E2E |

**Total estimasi: ~12 jam** (2 hari kerja)

---

## BEFORE vs AFTER

| Metric | Before | After |
|--------|--------|-------|
| `serde_json::json!()` | 62 | 0 |
| Manual tuple queries | 29 | 0 |
| `reqwest::Client` (AI) | 3 | 0 |
| Manual JWT code | 95 lines | 0 (vil_server_auth) |
| Manual error handling | 95 lines | ~10 lines (#[vil_fault]) |
| Manual cron | 35 lines | ~10 lines (CronTrigger) |
| AI prompt safety | 0 checks | PromptShield + Guardrails |
| AI cost tracking | Manual DB | CostTracker semantic |
| AI observability | 0 spans | AiTracer full |
| Semantic log types | 1 (app_log) | 5 (app, ai, db, security, access) |
| E2E test infra | External process | In-process TestClient |
| VIL crates used | 7 | **21** |
| **VIL Way compliance** | **~30%** | **~95%** |
