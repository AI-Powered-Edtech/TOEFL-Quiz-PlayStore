# VIL PoC Critique: Honest Assessment dari Implementasi TOEFL Quiz

**Tanggal:** 3 April 2026
**Konteks:** TOEFL Quiz sebagai Proof of Concept pertama yang membangun aplikasi real menggunakan VIL framework
**Perspektif:** Developer yang baru pertama kali menggunakan VIL, membangun 68 endpoints dari nol

---

## EXECUTIVE SUMMARY

VIL menjanjikan "developer writes only business logic, VIL generates plumbing." Kenyataannya, developer masih menulis **banyak plumbing**. Framework ini powerful tapi **terlalu complex untuk adopsi massal**. Filosofi "Pythonic" belum tercapai — ini masih terasa seperti "expert Rust developer toolkit" bukan "anyone can build fast backends."

**Verdict:** VIL bagus untuk infrastructure engineers. Belum siap untuk application developers.

---

## 1. APA YANG BAGUS (Yang Benar-benar Membantu)

### 1.1 VilApp + ServiceProcess → Instant Topology
```rust
// INI memang bagus — 3 lines untuk full server
VilApp::new("toefl-quiz")
    .port(8082)
    .observer(true)  // Dashboard gratis
    .service(auth_svc)
    .run().await;
```
**Verdict:** Excellent. Lebih baik dari raw Axum setup.

### 1.2 ShmSlice → Zero-copy Body
```rust
async fn handler(body: ShmSlice) -> VilResponse<T> {
    let req: MyRequest = body.json()?;  // Zero-copy deserialize
}
```
**Verdict:** Excellent. Transparent, no learning curve.

### 1.3 Observer Dashboard
`.observer(true)` → full metrics, health, SLO tracking, latency graphs. Zero config.
**Verdict:** Killer feature. Instant production observability.

### 1.4 VilResponse → Consistent HTTP Responses
```rust
VilResponse::ok(data)       // 200
VilResponse::created(data)  // 201
```
**Verdict:** Good. Simple, consistent.

### 1.5 Contract Export
`./app --contract` → JSON topology dump.
**Verdict:** Good for documentation and architecture review.

---

## 2. APA YANG BERMASALAH (Pain Points Saat Development)

### 2.1 CRITICAL: ServiceCtx vs Extension — Confusing Dual Pattern

**Problem:** VIL punya 2 cara inject state:
- `.state(T)` → `ServiceCtx::state::<T>()`
- `.extension(T)` → `Extension<T>`

Keduanya harus dipakai BERSAMAAN karena:
- `ServiceCtx` butuh `.state()` untuk VIL Way
- `Claims` extractor butuh `.extension()` untuk akses JWT secret
- Tanpa keduanya, salah satu gagal

**Developer experience:**
```rust
// Harus tulis DUA KALI di setiap ServiceProcess
let svc = ServiceProcess::new("auth")
    .state(state.clone())       // Untuk ServiceCtx
    .extension(state.clone());  // Untuk Claims extractor
```

**Rekomendasi:** `.state(T)` harus JUGA inject sebagai Extension secara otomatis. Satu method, dua fungsi. Developer tidak perlu tahu perbedaannya.

```rust
// Yang seharusnya cukup:
let svc = ServiceProcess::new("auth")
    .state(state.clone());  // Auto-inject Extension<T> juga
```

### 2.2 CRITICAL: #[vil_handler] Butuh 3 Fix untuk Bekerja

**Problem:** Macro `#[vil_handler]` punya 3 bug yang kami temukan dan fix:
1. RequestId injection sebagai param → break Handler trait
2. `.entered()` span guard → !Send future
3. Destructuring patterns (`Query(filter)`) → silently dropped

Ini macro CORE framework — seharusnya just works. Developer seharusnya tidak perlu debug proc-macro internals.

**Rekomendasi:** Comprehensive test suite untuk macro. Test setiap kombinasi:
- Handler dengan 1-5 params
- Setiap extractor type (ServiceCtx, ShmSlice, Claims, Query, Path, Json)
- Setiap return type (VilResponse, Result, plain value)
- Async function with .await inside

### 2.3 HIGH: State Extraction Terlalu Verbose

**Problem:** Setiap handler harus tulis boilerplate ini:
```rust
let state = ctx.state::<crate::AppState>()
    .map_err(|_| AppError::Internal("state".into()))?;
```

64 handlers × 1 line = 64 lines boilerplate. Kalau lupa, runtime error (bukan compile error).

**Rekomendasi:**
Opsi A — Derive macro:
```rust
#[vil_handler(state = AppState)]
async fn handler(state: &AppState, body: ShmSlice) -> VilResult<T> {
    // state langsung tersedia, compile-time checked
}
```

Opsi B — Auto-extract via type annotation:
```rust
async fn handler(ctx: ServiceCtx) -> VilResult<T> {
    let state: &AppState = ctx.state()?;  // Type inference, shorter
}
```

Opsi C — ServiceProcess generic:
```rust
ServiceProcess::<AppState>::new("auth")  // State type known at compile time
```

### 2.4 HIGH: Error Handling Tidak Unified

**Problem:** VIL punya `VilError` (RFC 7807), kami buat `AppError` (custom). Keduanya tidak compatible secara langsung. Kami harus manual implement `From<AppError> for VilError`.

Seharusnya ada SATU error type yang bisa di-derive:
```rust
#[vil_fault]  // Harusnya auto-generate IntoResponse + Into<VilError>
pub enum AppError {
    Auth(String),
    NotFound(String),
}
```

**Kenyataan:** `#[vil_fault]` dari `vil_macros` generate `Into<ControlSignal>` untuk Tri-Lane — bukan `IntoResponse` untuk HTTP. Dua dunia berbeda yang tidak terhubung.

**Rekomendasi:** `#[vil_fault]` harus JUGA generate `IntoResponse` (RFC 7807 format) + `Into<VilError>`. Satu derive, semua tercover.

### 2.5 HIGH: Terlalu Banyak Crate untuk Hal Sederhana

**Problem:** Untuk build TOEFL quiz backend, kami butuh 21 VIL crates:
```toml
vil_sdk, vil_server, vil_server_core, vil_server_auth, vil_server_web,
vil_json, vil_db_sqlx, vil_db_semantic, vil_server_db, vil_llm,
vil_ai_gateway, vil_ai_trace, vil_cost_tracker, vil_prompts,
vil_prompt_shield, vil_output_parser, vil_guardrails, vil_trigger_cron,
vil_ws, vil_cache, vil_log
```

Python Flask equivalent: `pip install flask flask-sqlalchemy` (2 packages).

**Rekomendasi:** Buat meta-crate:
```toml
# Satu dependency untuk application developers:
vil = { version = "0.1", features = ["web", "db-sqlite", "ai", "log"] }
```

Internal tetap modular, tapi user-facing cukup 1 import.

### 2.6 MEDIUM: Model Layer Gap — sqlx::FromRow vs VIL Semantic Types

**Problem:** VIL philosophy: semua pakai `VSlice<u8>`, `VRef<T>`, `#[vil_state]`. Reality: database library (sqlx) butuh `String`, `i64`, `Vec<T>`.

Tidak ada jembatan antara VIL semantic types dan database types. Developer harus pilih salah satu — dan kalau pilih database compatibility (String), maka melanggar VIL zero-copy contract.

**Rekomendasi:** `vil_db_sqlx` harus auto-convert `VSlice<u8>` ↔ SQL TEXT. Atau `#[derive(VilEntity)]` harus generate sqlx::FromRow yang handle konversi.

### 2.7 MEDIUM: Documentation Gap

**Problem:** VIL punya 9 parts Developer Guide (excellent). Tapi TIDAK ada:
- "Build your first app" tutorial (step-by-step, 30 menit)
- "Common patterns" cookbook
- "Migration from Axum" guide
- API reference dengan search

Developer harus baca 9 documents + source code untuk understand patterns.

**Rekomendasi:**
1. `QUICKSTART.md` — Hello World → CRUD → Auth → Deploy dalam 30 menit
2. `COOKBOOK.md` — 20 common patterns dengan copy-paste code
3. `MIGRATION_FROM_AXUM.md` — untuk existing Rust devs
4. Generated API docs via `cargo doc`

### 2.8 LOW: Compile Time

130+ crates. Full build: ~2 menit. Incremental: ~5-10 detik.

Acceptable untuk Rust, tapi "Pythonic" philosophy means instant feedback. Python developers expect `flask run` in 0.5 seconds.

**Rekomendasi:** Focus on incremental compile time. Consider `cargo-watch` integration in VIL CLI.

---

## 3. APA YANG MISSING (Belum Ada, Seharusnya Ada)

### 3.1 vil generate (Code Generator / Scaffolding)

```bash
# Yang seharusnya bisa:
vil new my-app --template web-api
vil generate service users --crud
vil generate model User name:string email:string
vil generate migration add_users
```

Rails `rails generate`, Django `manage.py startapp`, Flask `flask init`. VIL belum punya ini.

### 3.2 Database Migration System

Kami harus buat migration runner manual (split SQL by `;`, execute one by one). VIL `vil_db_sqlx` tidak punya migration support.

```bash
# Yang seharusnya ada:
vil migrate create add_users_table
vil migrate run
vil migrate rollback
```

### 3.3 Request Validation Macros

```rust
// Yang kami tulis (manual):
if req.username.len() < 3 { return Err(Validation("too short")) }
if req.password.len() < 8 { return Err(Validation("too short")) }

// Yang seharusnya:
#[derive(Deserialize, VilValidate)]
struct RegisterRequest {
    #[validate(min_len = 3, max_len = 50)]
    username: String,
    #[validate(min_len = 8)]
    password: String,
}
```

`vil_validate` exists tapi untuk Semantic IR validation, bukan request body validation.

### 3.4 Authentication Out-of-the-Box

`vil_server_auth` punya JWT, rate limit, RBAC. Tapi TIDAK punya:
- Password hashing (kami pakai argon2 manual)
- User registration flow
- OAuth2 callback handler
- Token refresh flow

```rust
// Yang seharusnya cukup:
let auth = VilAuth::new()
    .jwt_secret(&config.jwt_secret)
    .password_hasher(Argon2::default())
    .google_oauth(&config.google_client_id)
    .register_endpoint("/api/auth/register")
    .login_endpoint("/api/auth/login")
    .build();

app.auth(auth);  // Auto-register semua auth endpoints
```

### 3.5 Auto CRUD dari Model

```rust
// Yang seharusnya bisa:
#[derive(VilEntity, VilCrud)]
#[vil(table = "profiles", routes = "/api/profiles")]
struct Profile {
    id: String,
    username: String,
    email: String,
}

// Auto-generate: GET /, GET /:id, POST /, PUT /:id, DELETE /:id
// Dengan validation, pagination, filtering, sorting
```

### 3.6 Hot Reload in Development

Python: `flask run --reload` — auto-restart on file change.
VIL: manual `cargo run` setiap kali.

`cargo-watch` bisa dipakai tapi bukan built-in experience.

---

## 4. COMPARISON: VIL vs Framework Lain

### Lines of Code untuk Same Feature Set (68 endpoints)

| Framework | Estimated LOC | Setup Time |
|-----------|-------------|-----------|
| **Django (Python)** | ~800 | 2 hari |
| **Rails (Ruby)** | ~600 | 2 hari |
| **Express + Prisma (Node)** | ~1200 | 3 hari |
| **Axum + SQLx (Rust)** | ~2500 | 2 minggu |
| **VIL (Rust)** | ~2200 | 1 minggu |
| **VIL (target)** | ~500 | 2 hari |

VIL saves ~12% vs raw Axum. Target seharusnya 80% reduction.

### Developer Experience Comparison

| Aspect | Django | Rails | VIL (Now) | VIL (Target) |
|--------|-------|-------|-----------|-------------|
| Create project | `django-admin startproject` | `rails new` | Manual cargo init + 21 deps | `vil new my-app` |
| Create model | `models.py` 5 lines | `rails g model` | 20 lines + migration SQL | `vil g model` → auto |
| Create endpoint | `views.py` 10 lines | `rails g controller` | 15 lines + registration | `vil g endpoint` → auto |
| Database migration | `manage.py migrate` | `rails db:migrate` | Manual SQL split | `vil migrate run` |
| Auth | `django.contrib.auth` | `devise` gem | Manual JWT + Argon2 | `VilAuth::new()` |
| Validation | `forms.py` | `validates` macro | Manual `if` checks | `#[validate]` derive |
| Hot reload | Built-in | Built-in | None | `vil dev` |
| Dashboard | Django Admin | Rails Admin | VIL Observer ✅ | VIL Observer ✅ |
| Zero-copy | N/A | N/A | ✅ ShmSlice | ✅ ShmSlice |
| Performance | ~5K req/s | ~3K req/s | ~41K req/s ✅ | ~41K req/s ✅ |

---

## 5. REKOMENDASI PRIORITAS

### P0: Must Have (sebelum public launch)

| # | Item | Effort | Impact |
|---|------|--------|--------|
| 1 | **Meta-crate `vil`** dengan features | 1 hari | 21 deps → 1 dep |
| 2 | **`.state()` auto-inject Extension** | 2 jam | Eliminate dual pattern confusion |
| 3 | **`#[vil_fault]` → IntoResponse + VilError** | 4 jam | Unified error handling |
| 4 | **`#[vil_handler(state = T)]`** auto state extract | 4 jam | -64 lines boilerplate per app |
| 5 | **`QUICKSTART.md`** — 30 min tutorial | 1 hari | First-time developer experience |

### P1: Should Have (first 3 months)

| # | Item | Effort | Impact |
|---|------|--------|--------|
| 6 | `vil new` CLI scaffolding | 3 hari | Instant project setup |
| 7 | `vil generate service/model` | 5 hari | Code generation |
| 8 | Database migration system | 3 hari | `vil migrate run/rollback` |
| 9 | `#[derive(VilValidate)]` request validation | 3 hari | Type-safe validation |
| 10 | `VilAuth` out-of-the-box auth | 5 hari | JWT + password + OAuth in 5 lines |

### P2: Nice to Have (6 months)

| # | Item | Effort | Impact |
|---|------|--------|--------|
| 11 | Auto CRUD dari `#[derive(VilEntity, VilCrud)]` | 1 minggu | Rails-like productivity |
| 12 | `vil dev` hot reload | 3 hari | Development speed |
| 13 | VilEntity ↔ sqlx auto-convert (VSlice ↔ String) | 1 minggu | True zero-copy models |
| 14 | COOKBOOK.md — 20 patterns | 3 hari | Reference guide |
| 15 | `vil deploy` to LXC/Docker | 5 hari | One-command deploy |

---

## 6. BOTTOM LINE

### Untuk siapa VIL cocok SEKARANG:
- ✅ Rust experts yang butuh extreme performance
- ✅ Infrastructure engineers yang build custom gateways/proxies
- ✅ Teams yang sudah paham Axum dan mau zero-copy optimization

### Untuk siapa VIL BELUM cocok:
- ❌ Python/JS developers yang baru belajar Rust
- ❌ Startup yang butuh ship in 1 week
- ❌ Solo developers yang butuh "batteries included"

### Untuk jadi "Pythonic" VIL perlu:
1. **Satu import, satu derive, satu command** — bukan 21 crates, 5 derives, manual setup
2. **Code generation** — `vil generate` untuk scaffolding
3. **Convention over configuration** — sensible defaults, override jika perlu
4. **Error messages yang helpful** — bukan "Handler trait not satisfied" tapi "Tip: add #[derive(VilModel)] to your response type"
5. **30-minute quickstart** — dari `vil new` sampai deployed

VIL punya foundation yang excellent (zero-copy, Tri-Lane, Observer). Tapi "framework" layer di atasnya masih terlalu thin. Yang ada sekarang: building blocks. Yang dibutuhkan: **opinionated full-stack framework**.

**Analogi:** VIL sekarang = Flask tanpa Flask-SQLAlchemy, tanpa Flask-Login, tanpa Flask CLI. Powerful tapi butuh terlalu banyak assembly.
