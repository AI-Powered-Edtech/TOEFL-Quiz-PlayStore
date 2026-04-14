# VIL Comprehensive Review: PoC Experience + Framework Improvement Roadmap

**Tanggal:** 3 April 2026
**Konteks:** Pengalaman membangun TOEFL Quiz (68 endpoints, 11 services) sebagai PoC pertama VIL
**Tujuan:** Kritik jujur + daftar perbaikan konkret agar VIL truly Pythonic untuk adopsi massal

---

## BAGIAN 1: KOMPONEN YANG TIDAK TERSEDIA DI VIL (Harus Kami Buat Manual)

> **UPDATE (VIL v0.2.1):** Fitur-fitur yang hilang ini sekarang telah tersedia langsung di meta-crate `vil = "0.2.1"` dan modul seperti `vil::auth` serta `vil_migrate`. Seluruh project telah di-upgrade ke v0.2.1. Daftar di bawah adalah catatan historis masalah pada v0.1.

Selama development TOEFL Quiz, ini semua yang TIDAK tersedia di VIL dan harus kami build dari nol:

### 1.1 Password Hashing & User Registration

**Apa yang kami butuhkan:**
- Hash password dengan Argon2id
- Verify password saat login
- Salt generation

**Apa yang kami tulis manual:**
```rust
// 15 lines manual Argon2 setup
use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
use password_hash::SaltString;
let salt = SaltString::generate(&mut rand::thread_rng());
let hash = Argon2::default().hash_password(pw.as_bytes(), &salt)?.to_string();
```

**Yang seharusnya VIL sediakan:**
```rust
use vil_server_auth::password::{hash_password, verify_password};
let hash = hash_password("mypassword")?;  // Argon2id, auto salt
let valid = verify_password("mypassword", &hash)?;
```

**Effort kami:** 2 jam debug Argon2 API (v0.5 berbeda dari v0.4)

### 1.2 JWT Token Lifecycle (Sign, Verify, Refresh)

**VIL punya:** `vil_server_auth::JwtAuth` — tapi hanya JWT validation middleware.

**Yang TIDAK ada:**
- Token signing (generate JWT dari claims)
- Refresh token flow
- Token blacklisting
- Claims extraction sebagai Axum extractor

**Yang kami tulis manual:** 95 lines `middleware/auth.rs` — full JWT implementation dengan `jsonwebtoken` crate.

**Yang seharusnya:**
```rust
let jwt = VilJwt::new(&secret)
    .access_expiry(Duration::from_secs(900))
    .refresh_expiry(Duration::from_secs(604800));

let tokens = jwt.sign(Claims { sub: user_id, role: "user" })?;
let claims = jwt.verify(&token)?;
let new_access = jwt.refresh(&refresh_token)?;

// Auto-extractor:
async fn handler(claims: VilClaims) -> VilResult<T> { ... }
```

### 1.3 Request Body Validation

**Yang kami tulis manual:**
```rust
if req.username.len() < 3 || req.username.len() > 50 {
    return Err(AppError::Validation("Username must be 3-50 characters".into()));
}
if req.password.len() < 8 {
    return Err(AppError::Validation("Password must be at least 8 characters".into()));
}
// Repeated for every endpoint...
```

**Yang seharusnya:**
```rust
#[derive(Deserialize, VilValidate)]
struct RegisterRequest {
    #[validate(min_len = 3, max_len = 50, pattern = "^[a-zA-Z0-9_]+$")]
    username: String,
    #[validate(min_len = 8)]
    password: String,
    #[validate(email)]
    email: Option<String>,
}
// Automatic 422 response with field-level errors
```

### 1.4 Database Migration System

**Yang kami tulis manual:**
```rust
// db.rs — 60 lines custom migration runner
let schema = include_str!("db/migrations/001_initial_schema.sql");
for line in schema.lines() {
    let trimmed = line.trim();
    if trimmed.starts_with("--") || trimmed.is_empty() { continue; }
    current.push_str(line);
    if trimmed.ends_with(';') {
        pool.execute_raw(&stmt).await?;
        current.clear();
    }
}
```

**Yang seharusnya:**
```bash
vil migrate create add_profiles_table
vil migrate run        # Apply pending migrations
vil migrate rollback   # Undo last migration
vil migrate status     # Show pending/applied
```

### 1.5 Error Type → HTTP Response Mapping

**Yang kami tulis manual:** 100 lines `error.rs` — `AppError` enum + `IntoResponse` impl + `From<sqlx::Error>` + `From<VilError>`.

**Yang seharusnya:**
```rust
#[derive(VilHttpError)]  // Auto: IntoResponse + Into<VilError> + RFC 7807
enum AppError {
    #[status(401)] Auth(String),
    #[status(403)] Forbidden(String),
    #[status(404)] NotFound(String),
    #[status(422)] Validation(String),
    #[status(429)] RateLimited { retry_after: u64 },
    #[status(503)] AiUnavailable(String),
}
```

### 1.6 Typed SQL Query Builder

**Yang kami tulis:**
```rust
// Manual string building — error-prone
let mut sql = "SELECT * FROM question_bank WHERE 1=1".to_string();
if filter.section.is_some() { sql.push_str(" AND section = ?"); }
if filter.skill_id.is_some() { sql.push_str(" AND skill_id = ?"); }
```

**Yang seharusnya:**
```rust
let questions = Question::query()
    .filter_if(filter.section, |q, s| q.where_eq("section", s))
    .filter_if(filter.skill_id, |q, id| q.where_eq("skill_id", id))
    .order_by("created_at", Desc)
    .limit(filter.limit.unwrap_or(20))
    .fetch_all(&pool).await?;
```

### 1.7 Pagination

**Yang kami tulis manual:**
```rust
.range(offset, offset + limit - 1)  // Manual offset calculation
```

**Yang seharusnya:**
```rust
let page = Question::query()
    .paginate(params.page, params.per_page)  // Auto offset/limit
    .fetch_page(&pool).await?;
// Returns: { data: [...], total: 150, page: 2, per_page: 20, pages: 8 }
```

### 1.8 File Upload Handling

**Yang kami tulis manual:** 100 lines `storage.rs` — magic bytes detection, directory creation, filename generation, serve static.

**Yang seharusnya:**
```rust
#[vil_handler]
async fn upload(file: VilUpload) -> VilResult<UploadResponse> {
    let saved = file
        .validate_type(&["image/png", "image/jpeg"])? // Magic bytes check
        .max_size(10_MB)?
        .save_to("uploads/avatars")?;
    Ok(UploadResponse { url: saved.public_url() })
}
```

### 1.9 Background Task Scheduling

**Yang kami tulis manual:**
```rust
tokio::spawn(async move {
    let mut interval = tokio::time::interval(Duration::from_secs(1800));
    loop { interval.tick().await; cleanup(&pool).await; }
});
```

**Yang seharusnya:**
```rust
VilApp::new("app")
    .cron("cleanup_claims", "*/30 * * * *", cleanup_expired_claims)
    .cron("cleanup_logs", "0 3 * * *", cleanup_old_logs)
    .run().await;
```

### 1.10 CORS Configuration

**VIL default:** CORS enabled. Tapi tidak configurable per-origin.

**Yang kami butuhkan:**
```rust
VilApp::new("app")
    .cors(CorsConfig {
        origins: vec!["https://toeflquiz.vastar.ai", "http://localhost:3000"],
        methods: vec!["GET", "POST", "PATCH", "DELETE"],
        max_age: 3600,
    })
```

---

## BAGIAN 2: KLAIM DOKUMENTASI vs REALITA

### Claims yang TIDAK BENAR

| Klaim | Dokumen | Realita |
|-------|---------|---------|
| "8 project templates" | 006-CLI | Hanya 5 — rest-crud, ai-gateway, rag-pipeline, websocket-chat TIDAK ADA |
| "Phase 2 complete: RabbitMQ, SQS, Pulsar, PubSub" | ROADMAP.md | Crate TIDAK ADA — hanya Kafka, MQTT, NATS |
| "Phase 4: C#, Kotlin, Swift, Zig SDK" | ROADMAP.md | TIDAK ADA — hanya Python, Go, Java, TypeScript |
| "VilModel is zero-copy" | 002-Semantic | MISLEADING — pakai serde_json, bukan zero-copy |
| "vil_server_auth: password hashing" | 003-Server | FALSE — hanya JWT, OAuth2, API key, rate limit |
| "`ServiceCtx.session_id()`" | 002-Semantic | Incomplete — method missing |
| "VilResponse customizable" | 003-Server | PARTIAL — hanya `.ok()` dan `.created()` |

### Claims yang BENAR

| Klaim | Realita |
|-------|---------|
| "41K req/s HTTP server" | ✅ Validated benchmark |
| "6.5K req/s AI gateway" | ✅ Validated benchmark |
| "ShmSlice zero-copy body" | ✅ Works, ExchangeHeap real |
| "Observer dashboard built-in" | ✅ Excellent, works out of box |
| "7 semantic log types" | ✅ All 7 work (app, access, ai, db, mq, system, security) |
| "Tri-Lane protocol" | ✅ Trigger/Data/Control separation real |
| "SSE 5 dialect support" | ✅ OpenAI, Anthropic, Ollama, Cohere, Gemini |
| "130+ crates" | ✅ All exist in /crates/ |
| "1425+ tests" | ✅ Test count accurate |

---

## BAGIAN 3: KRITIK MENDALAM — KENAPA VIL BELUM "PYTHONIC"

### 3.1 Python Philosophy: "Batteries Included"

Python ships with `json`, `http`, `sqlite3`, `email`, `logging`, `unittest` di stdlib. Flask adds `routing`, `templates`, `sessions`, `testing` dalam 1 package.

**VIL reality:** 21 crates untuk build 1 app. Ini bukan "batteries included" — ini "batteries sold separately, assembly required."

### 3.2 Python Philosophy: "There Should Be One Obvious Way"

```python
# Python — satu cara jelas:
@app.route("/users", methods=["POST"])
def create_user():
    data = request.json
    user = User(**data)
    db.session.add(user)
    return jsonify(user), 201
```

```rust
// VIL — tiga cara, semua incomplete:
// Way 1: Extension<AppState> (works tapi bukan VIL Way)
// Way 2: ServiceCtx::state::<T>() (VIL Way tapi perlu .state() + .extension() dua-duanya)
// Way 3: #[vil_handler(shm)] (auto-inject tapi macro buggy)
```

**Harus ada SATU cara yang just works.**

### 3.3 Python Philosophy: "Explicit is Better Than Implicit"

VIL's `#[vil_handler]` macro generates hidden code:
- RequestId generation (invisible)
- Tracing span (invisible)
- Access log emission (invisible)
- Response wrapping (invisible)

Developer tidak tahu apa yang terjadi. Debugging sulit karena generated code tidak visible.

**Fix:** Macro output harus bisa di-inspect via `cargo expand`. Dan docs harus show "this is what the macro generates."

### 3.4 Python Philosophy: "Simple is Better Than Complex"

```python
# Django model — 8 lines, everything works:
class Profile(models.Model):
    username = models.CharField(max_length=50, unique=True)
    password = models.CharField(max_length=128)  # Auto-hashed
    xp = models.IntegerField(default=0)
```

```rust
// VIL "model" — 25+ lines, no auto-anything:
#[derive(Debug, Clone, Serialize, Deserialize, VilModel, sqlx::FromRow)]
pub struct Profile {
    pub id: String,
    pub username: Option<String>,
    pub password_hash: Option<String>,  // Manual hash
    pub xp: i64,
    pub created_at: String,  // Manual timestamp
    pub updated_at: String,  // Manual update
}
// Plus: manual migration SQL, manual validation, manual CRUD handlers
```

### 3.5 Python Philosophy: "Readability Counts"

```python
# Flask route — readable in 5 seconds:
@app.get("/users/<id>")
def get_user(id):
    return User.query.get_or_404(id)
```

```rust
// VIL handler — readable in 30 seconds:
#[vil_handler]
pub async fn get_profile(
    ctx: ServiceCtx,
    claims: Claims,
) -> Result<VilResponse<Profile>, AppError> {
    let state = ctx.state::<crate::AppState>()
        .map_err(|_| AppError::Internal("state".into()))?;
    let profile = sqlx::query_as::<_, Profile>("SELECT * FROM profiles WHERE id = ?")
        .bind(&claims.sub)
        .fetch_optional(state.pool.inner())
        .await?
        .ok_or_else(|| AppError::NotFound("Profile not found".into()))?;
    Ok(VilResponse::ok(profile))
}
```

**9 lines business logic, 6 lines boilerplate.** Ratio: 60% noise.

---

## BAGIAN 4: KONKRET — APA YANG HARUS DITAMBAHKAN KE VIL

### Tier 0: IMMEDIATE (Harus ada sebelum PoC berikutnya)

#### T0-1: `vil` Meta-Crate
```toml
# User writes:
[dependencies]
vil = { version = "0.2", features = ["web", "db-sqlite", "ai", "log"] }

# Internally re-exports:
# vil_server, vil_server_core, vil_server_auth, vil_server_web, vil_json,
# vil_db_sqlx, vil_db_semantic, vil_log, vil_llm (if "ai" feature)
```

#### T0-2: `VilPassword` — Password Hashing Module
```rust
// In vil_server_auth:
pub struct VilPassword;
impl VilPassword {
    pub fn hash(password: &str) -> Result<String, VilError>;      // Argon2id
    pub fn verify(password: &str, hash: &str) -> Result<bool, VilError>;
}
```

#### T0-3: `VilJwt` — Full JWT Lifecycle
```rust
pub struct VilJwt { ... }
impl VilJwt {
    pub fn new(secret: &str) -> Self;
    pub fn access_expiry(self, dur: Duration) -> Self;
    pub fn sign<T: Serialize>(&self, claims: &T) -> Result<String, VilError>;
    pub fn verify<T: DeserializeOwned>(&self, token: &str) -> Result<T, VilError>;
    pub fn refresh(&self, refresh_token: &str) -> Result<String, VilError>;
}

// Auto Claims extractor:
pub struct VilClaims<T>(pub T);
impl<T: DeserializeOwned> FromRequestParts<AppState> for VilClaims<T> { ... }
```

#### T0-4: `.state()` Auto Extension
```rust
// In ServiceProcess::state():
pub fn state<T: Clone + Send + Sync + 'static>(mut self, state: T) -> Self {
    self.state = Some(Arc::new(state.clone()));
    // ALSO inject as Extension for backward compatibility:
    self.extensions.push(Box::new(move |router| router.layer(Extension(state))));
    self
}
```

#### T0-5: `#[derive(VilHttpError)]`
```rust
#[derive(VilHttpError)]
enum AppError {
    #[status(401)] Auth(String),
    #[status(403)] Forbidden(String),
    #[status(404)] NotFound(String),
    #[status(422)] Validation(String),
    #[status(429)] RateLimited { retry_after: u64 },
}
// Auto-generates: IntoResponse (RFC 7807) + Into<VilError> + From<sqlx::Error>
```

#### T0-6: VilResponse Missing Methods
```rust
impl<T> VilResponse<T> {
    pub fn accepted(data: T) -> Self;        // 202
    pub fn no_content() -> Self;              // 204
    pub fn bad_request(detail: &str) -> Self; // 400
    pub fn conflict(detail: &str) -> Self;    // 409
}
```

### Tier 1: SHORT TERM (1-2 bulan)

#### T1-1: `#[derive(VilValidate)]`
```rust
#[derive(Deserialize, VilValidate)]
struct CreateUser {
    #[validate(min_len = 3, max_len = 50, pattern = "^[a-zA-Z0-9_]+$")]
    username: String,
    #[validate(min_len = 8)]
    password: String,
    #[validate(email)]
    email: Option<String>,
    #[validate(range(0, 100))]
    age: Option<i32>,
}
// Auto 422 response: {"errors": [{"field": "username", "message": "too short"}]}
```

#### T1-2: `vil new --template rest-api`
```bash
vil new toefl-quiz --template rest-api
# Generates:
# Cargo.toml (vil = "0.2" with features)
# src/main.rs (VilApp boilerplate)
# src/config.rs (env loader)
# src/error.rs (#[derive(VilHttpError)])
# src/models/ (example model)
# src/services/ (example CRUD)
# migrations/ (initial schema)
# tests/ (example test)
# .env.example
```

#### T1-3: Migration System
```bash
vil migrate create add_profiles
# Creates: migrations/20260403_add_profiles.sql

vil migrate run
# Applies all pending migrations

vil migrate rollback
# Reverts last migration

vil migrate status
# Shows: ✅ 001_initial, ✅ 002_add_profiles, ⏳ 003_add_quiz (pending)
```

#### T1-4: Auto CRUD
```rust
#[derive(VilEntity, VilCrud)]
#[vil(table = "profiles", prefix = "/api/profiles")]
struct Profile {
    #[vil(primary_key, auto)]
    id: String,
    #[vil(unique)]
    username: String,
    xp: i64,
    #[vil(created_at)]
    created_at: String,
    #[vil(updated_at)]
    updated_at: String,
}

// Auto-generates 5 endpoints:
// GET    /api/profiles          → list (paginated, filterable)
// GET    /api/profiles/:id      → get by id
// POST   /api/profiles          → create (validated)
// PATCH  /api/profiles/:id      → update (partial)
// DELETE /api/profiles/:id      → delete
```

#### T1-5: `VilApp::cron()`
```rust
VilApp::new("app")
    .cron("cleanup", "*/30 * * * *", |pool: SqlxPool| async move {
        sqlx::query("DELETE FROM expired WHERE ...").execute(&pool).await?;
        Ok(())
    })
    .run().await;
```

#### T1-6: `VilUpload` File Handling
```rust
pub struct VilUpload { ... }
impl VilUpload {
    pub fn validate_type(self, allowed: &[&str]) -> Result<Self, VilError>;
    pub fn max_size(self, bytes: usize) -> Result<Self, VilError>;
    pub fn save_to(self, dir: &str) -> Result<SavedFile, VilError>;
}

pub struct SavedFile {
    pub path: String,
    pub url: String,
    pub size: usize,
    pub content_type: String,
}
```

### Tier 2: MEDIUM TERM (3-6 bulan)

#### T2-1: `vil dev` — Hot Reload Development Server
```bash
vil dev
# Watches src/ for changes
# Auto-rebuild + restart
# Shows compilation errors inline
# Opens browser at http://localhost:8082
# Observer dashboard at http://localhost:8082/_vil/dashboard/
```

#### T2-2: Query Builder
```rust
let users = Profile::query()
    .select(&["id", "username", "xp"])
    .where_eq("subscription_tier", "basic")
    .where_gt("xp", 100)
    .order_by("xp", Desc)
    .paginate(page, 20)
    .fetch(&pool).await?;
```

#### T2-3: WebSocket Rooms (Built-in)
```rust
VilApp::new("app")
    .ws("/ws/circles/:id", |ws: VilWs, room: &str| async move {
        ws.join_room(room);
        ws.on_message(|msg| { ws.broadcast_room(room, msg); });
    })
```

#### T2-4: Plugin System for Common Patterns
```rust
// Community plugins:
VilApp::new("app")
    .plugin(vil_auth_plugin::AuthPlugin::new(config))     // Register, login, OAuth
    .plugin(vil_admin_plugin::AdminPlugin::new())          // Admin panel
    .plugin(vil_upload_plugin::UploadPlugin::new("uploads")) // File handling
```

---

## BAGIAN 5: HONEST METRICS

### Development Time Comparison

| Task | Django | Rails | VIL (Current) | VIL (Target) |
|------|-------|-------|---------------|-------------|
| Project setup | 5 min | 5 min | 30 min | 5 min |
| Auth (register/login) | 10 min | 10 min | 2 hours | 10 min |
| CRUD 1 model | 15 min | 10 min | 45 min | 10 min |
| Add validation | 5 min | 5 min | 20 min | 5 min |
| Database migration | 2 min | 2 min | 30 min | 2 min |
| File upload | 10 min | 10 min | 1 hour | 10 min |
| Background jobs | 10 min | 10 min | 20 min | 5 min |
| **Total 68 endpoints** | **2 hari** | **2 hari** | **1 minggu** | **2 hari** |

### Lines of Code Comparison

| Component | VIL (Current) | VIL (Target) | Django |
|-----------|-------------|-------------|-------|
| Cargo.toml / requirements | 40 | 5 | 3 |
| Config | 40 | 10 | 5 |
| Error handling | 100 | 15 | 0 (built-in) |
| Auth middleware | 95 | 0 (built-in) | 0 (built-in) |
| DB setup + migration | 60 | 5 | 0 (built-in) |
| Models (35 tables) | 300 | 200 | 200 |
| Handlers (68) | 1400 | 400 | 400 |
| Views/Responses | 200 | 0 (auto) | 0 (auto) |
| **Total** | **~2235** | **~635** | **~608** |

**Target:** VIL LOC should be comparable to Django — ~600 lines untuk 68 endpoints.

---

## BAGIAN 6: KESIMPULAN

### VIL Sekarang: "Expert Rust Toolkit"
- Powerful tapi complex
- Building blocks bagus, assembly terlalu banyak
- 10x performance vs Django, tapi 5x lebih banyak code
- Target user: infrastructure engineers

### VIL Target: "Pythonic Rust Framework"
- Simple tapi powerful
- Convention over configuration
- 10x performance vs Django, SAME amount of code
- Target user: any developer yang mau fast + safe

### Jarak dari Target:
- **Foundation (substrate, Tri-Lane, SHM):** 95% ready ✅
- **Server framework (VilApp, ServiceProcess, Observer):** 80% ready ✅
- **Developer experience (CLI, scaffolding, validation):** 20% ready ❌
- **Batteries included (auth, upload, migration, CRUD):** 10% ready ❌

### Formula Sukses VIL:
```
VIL Success = Rust Performance + Python DX + Rails Convention
```

Sekarang VIL baru punya `Rust Performance`. Perlu tambah `Python DX` dan `Rails Convention`.
