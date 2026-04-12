# Gap Analysis: TOEFL Quiz vs VIL Way Principles

**Tanggal:** 3 April 2026
**Referensi:** VIL_CONCEPT.md (P1-P10), Developer Guide 001-010, docs-internal ARCHITECTURAL

---

## EXECUTIVE SUMMARY

| Metric | Target (VIL Way) | Aktual | Gap |
|--------|------------------|--------|-----|
| VIL crates used | 21 | 21 | ✅ |
| `serde_json::json!()` | 0 | **8** | ⚠️ (dari 62) |
| `String` in models | 0 (should be `VSlice<u8>`) | **209** | ❌ Critical |
| `Extension<AppState>` | 0 (should be `ServiceCtx`) | **64** | ❌ Critical |
| `#[vil_fault]` errors | Required | **0** | ❌ Missing |
| `#[vil_state/event]` types | Required | **0** | ❌ Missing |
| `#[vil_handler]` macros | Required | **0** | ❌ Missing |
| `ServiceCtx` usage | Required | **0** | ❌ Missing |
| `#[trace_hop]` observability | Required | **0** | ❌ Missing |
| `.to_string()` in handlers | 0 (zero-copy) | **46** | ❌ Critical |
| `.observer(true)` | Enabled | ✅ | ✅ |
| `VilResponse` | Required | ✅ | ✅ |
| `ShmSlice` body extraction | Required | ✅ | ✅ |
| `VilModel` derive | Required | ✅ 30 structs | ✅ |
| `vil_llm` for AI | Required | ✅ | ✅ |
| Semantic logging | Required | ✅ 4 types | ✅ |
| Guardrails | Recommended | ✅ | ✅ |
| **VIL Way Compliance** | **100%** | **~40%** | |

---

## PRINCIPLE-BY-PRINCIPLE GAP ANALYSIS

### P1: Everything is a Process

| Requirement | Status | Gap |
|-------------|--------|-----|
| Services defined as `ServiceProcess` | ✅ | 11 ServiceProcess defined |
| Process identity (process_id) | ⚠️ | VilApp assigns internally, not explicit |
| Typed ports | ❌ | No port definitions, just endpoints |
| Failure domain per service | ❌ | No `CleanupPolicy` |
| Execution policy (ExecClass) | ⚠️ | Default AsyncTask only, no BlockingTask/DedicatedThread |
| Observability metadata | ⚠️ | Observer enabled but no `#[trace_hop]` |

### P2: Zero-Copy is a Contract

| Requirement | Status | Gap |
|-------------|--------|-----|
| `ShmSlice` body extraction | ✅ | All handlers use ShmSlice |
| `VSlice<u8>` for strings | ❌ **CRITICAL** | 209 `String` fields in models |
| `VRef<T>` for nested data | ❌ | All structs use heap types |
| ExchangeHeap allocation | ⚠️ | VilApp handles internally |
| No `.to_string()` in hot path | ❌ **CRITICAL** | 46 instances |
| No `serde_json::Value` | ⚠️ | 13 remaining (from 62) |
| Transfer mode validated | ❌ | No explicit LoanWrite/LoanRead |

**Reality check:** P2 full compliance requires rewriting ALL models to use VASI-compliant types (`VSlice`, `VRef`). This is a fundamental architectural change — the current structs use `sqlx::FromRow` which requires `String`. Full P2 compliance would mean building a SHM-native ORM layer.

### P3: Macros are Frontend, IR is Truth

| Requirement | Status | Gap |
|-------------|--------|-----|
| Proc-macros for declarations | ⚠️ | `VilModel` derive used, but no `#[message]`, `#[process]` |
| IR export (JSON/YAML) | ❌ | No `contract_json()` export |
| Semantic validation | ❌ | No compile-time lane/layout validation |

### P4: Generated Plumbing, Human Logic

| Requirement | Status | Gap |
|-------------|--------|-----|
| Developers write only business logic | ⚠️ | Handler logic is clean, but boilerplate still present |
| Generated queue plumbing | N/A | Not using pipelines |
| Generated metrics hooks | ⚠️ | Observer auto-generates route metrics |
| Generated cleanup hooks | ❌ | Manual cleanup in tasks/ |

### P5: Safety Through Semantics

| Requirement | Status | Gap |
|-------------|--------|-----|
| Type system markers (Vasi, PodLike) | ❌ | No VASI-compliant types |
| Semantic IR validation | ❌ | No IR |
| Generated correct-by-construction code | ⚠️ | VilModel generates serialization |
| Runtime invariants (ownership registry) | ❌ | No ownership tracking |

### P6: Three Layout Profiles

| Requirement | Status | Gap |
|-------------|--------|-----|
| Flat profile (POD pure) | ❌ | No messages classified |
| Relative profile (VRef/VSlice) | ❌ | No messages classified |
| External profile (heap, Copy fallback) | **De facto** | All our messages are External |

**Assessment:** Everything runs as External/Copy. This works but sacrifices zero-copy benefits.

### P7: Semantic Message Types

| Requirement | Status | Gap |
|-------------|--------|-----|
| `#[vil_state]` for mutable session | ❌ | 0 instances |
| `#[vil_event]` for immutable events | ❌ | 0 instances |
| `#[vil_fault]` for errors | ❌ | 0 instances, manual `AppError` enum |
| `#[vil_decision]` for routing | ❌ | Not applicable (no routing decisions) |
| Memory class specification | ❌ | No explicit PagedExchange/ControlHeap |

### P8: Tri-Lane Protocol

| Requirement | Status | Gap |
|-------------|--------|-----|
| Trigger lane (session init) | ✅ | VilApp handles via IngressBridge |
| Data lane (payload) | ✅ | VilApp handles via SHM |
| Control lane (Done/Error/Abort) | ⚠️ | VilApp handles, but our errors don't flow through Control lane |
| No head-of-line blocking | ✅ | VilApp design prevents this |

### P9: Ownership Transfer Model

| Requirement | Status | Gap |
|-------------|--------|-----|
| Explicit transfer modes | ❌ | No LoanWrite/LoanRead specification |
| Ownership registry | ❌ | Not using |
| Compile-time invariants | ❌ | No ownership validation |
| Hierarchical atomic transfers | ❌ | Not applicable (single-hop) |

### P10: Observable by Design

| Requirement | Status | Gap |
|-------------|--------|-----|
| `.observer(true)` | ✅ | Dashboard at `/_vil/dashboard/` |
| Per-route metrics | ✅ | Auto-generated by VilApp |
| `#[trace_hop]` | ❌ | 0 instances |
| `#[latency_marker]` | ❌ | 0 instances |
| No manual metrics code | ✅ | No `REQUESTS.inc()` |
| Prometheus endpoint | ✅ | `/metrics` auto |
| SLO tracking | ✅ | VilApp built-in |

---

## ANTI-PATTERN COUNT

| Anti-Pattern | Count | Severity |
|-------------|-------|----------|
| `String` in message/model fields | 209 | ❌ Critical (P2 violation) |
| `Extension<AppState>` instead of `ServiceCtx` | 64 | ❌ Critical (P4 violation) |
| `.to_string()` heap allocation in handlers | 46 | ❌ Critical (P2 violation) |
| `serde_json::Value` usage | 13 | ⚠️ Medium (P2 violation) |
| `serde_json::json!()` remaining | 8 | ⚠️ Medium |
| `reqwest::Client` (non-VIL HTTP) | 1 | ⚠️ Low (TTS binary) |
| No `#[vil_fault]` error types | 1 module | ❌ Critical (P7 violation) |
| No `#[vil_handler]` macros | 68 handlers | ❌ Critical (P4 violation) |
| No `ServiceCtx` usage | 68 handlers | ❌ Critical (P4 violation) |
| No `#[trace_hop]` annotations | 68 handlers | ❌ Critical (P10 violation) |

---

## WHAT WE DO RIGHT (VIL Way Compliant)

| Pattern | Status | Detail |
|---------|--------|--------|
| `VilApp` + `ServiceProcess` | ✅ | 11 services, 68 endpoints |
| `ShmSlice` body extraction | ✅ | All POST/PATCH handlers |
| `VilResponse` responses | ✅ | All handlers |
| `VilModel` derive | ✅ | 30 response structs |
| `.observer(true)` | ✅ | Dashboard + metrics + SLO |
| `vil_llm` for AI calls | ✅ | OpenAiProvider with Groq |
| Semantic logging | ✅ | ai_log!, db_log!, security_log! |
| vil_guardrails | ✅ | PII + toxicity on essays |
| `sqlx::FromRow` view structs | ✅ | 15 view structs |
| Tri-Lane mesh | ✅ | Auto-configured by VilApp |
| Built-in health/ready/metrics | ✅ | VilApp gratis |

---

## REMEDIATION PLAN (Priority Order)

### Tier 1: Quick Wins (1-2 hari)

| # | Gap | Fix | Impact |
|---|-----|-----|--------|
| G1 | No `#[vil_fault]` | Replace `AppError` enum with `#[vil_fault]` derive | P7 compliance |
| G2 | No `#[vil_handler]` | Add `#[vil_handler]` annotation to all 68 handlers | P4 + P10 compliance (auto-tracing) |
| G3 | No `#[trace_hop]` | Add `#[trace_hop]` to service entry points | P10 full compliance |
| G4 | Remaining `json!()` | Replace 8 remaining with VilModel structs | P2 cleanup |

### Tier 2: Moderate Effort (3-5 hari)

| # | Gap | Fix | Impact |
|---|-----|-----|--------|
| G5 | `Extension<AppState>` | Migrate 64 handlers to `ServiceCtx` + `ctx.state::<T>()` | P4 compliance |
| G6 | 46 `.to_string()` | Minimize heap allocations in handler logic | P2 improvement |
| G7 | IR export | Add `contract_json()` export for topology inspection | P3 compliance |
| G8 | `serde_json::Value` | Replace 13 instances with typed structs or `vil_json` | P2 cleanup |

### Tier 3: Architectural (1-2 minggu)

| # | Gap | Fix | Impact |
|---|-----|-----|--------|
| G9 | 209 `String` → `VSlice<u8>` | Requires VASI-compliant model redesign | P2 full compliance |
| G10 | No `#[vil_state/event]` | Requires semantic message classification | P7 full compliance |
| G11 | No layout profiles | Requires Flat/Relative/External classification | P6 compliance |
| G12 | No ownership model | Requires transfer mode specification | P9 compliance |

### Tier 4: Not Applicable / Deferred

| # | Gap | Reason |
|---|-----|--------|
| G13 | Pipeline topology (`vil_workflow!`) | App is single-hop REST API, not multi-stage ETL |
| G14 | WASM trust zones | Not needed for this use case |
| G15 | Cross-host Tri-Lane (TCP) | Single-binary deployment |
| G16 | ShmToken pipeline | VilApp architecture chosen (correct for REST API) |

---

## HONEST ASSESSMENT

**Saat ini: ~40% VIL Way compliance.**

Yang sudah benar:
- Server framework (VilApp, ServiceProcess, ShmSlice, VilResponse) ✅
- AI integration (vil_llm, semantic logging, guardrails) ✅
- Observer dashboard ✅
- Typed responses (VilModel) ✅
- View structs (FromRow) ✅

Yang fundamental missing:
- **Semantic message types** (#[vil_state], #[vil_event], #[vil_fault]) = 0
- **Handler macros** (#[vil_handler], #[trace_hop]) = 0
- **ServiceCtx** pattern (Extension<T> dipakai sebagai gantinya) = 0
- **Zero-copy discipline** (String everywhere, .to_string() di mana-mana) = violated

**Root cause:** Kita membangun "Axum app yang di-host di VilApp" bukan "VIL app yang kebetulan serve HTTP". Perbedaannya:

| Aspect | Apa yang kita buat | Seharusnya VIL Way |
|--------|-------------------|-------------------|
| Handler pattern | `async fn(Extension<AppState>, ShmSlice)` | `#[vil_handler] async fn(ctx: ServiceCtx, body: ShmSlice)` |
| Error type | `enum AppError { ... }` | `#[vil_fault] enum AppFault { ... }` |
| Model fields | `pub name: String` | `pub name: VSlice<u8>` |
| State access | `Extension(state)` | `ctx.state::<AppState>()` |
| Response | `VilResponse::ok(data)` ✅ | `VilResponse::ok(data)` ✅ |
| Body extract | `ShmSlice` ✅ | `ShmSlice` ✅ |
| Observability | `.observer(true)` ✅ | `.observer(true)` + `#[trace_hop]` |

**Untuk mencapai 80%+ compliance:**
- Tier 1 (G1-G4): `#[vil_fault]`, `#[vil_handler]`, `#[trace_hop]` = **+25%**
- Tier 2 (G5-G8): `ServiceCtx`, reduce `.to_string()` = **+15%**
- Total: **~80% achievable dalam 1 minggu**

**Untuk 95%+ compliance:**
- Tier 3 (G9-G12) membutuhkan redesign fundamental models ke VASI types
- Ini conflict dengan `sqlx::FromRow` yang butuh `String`
- Perlu custom ORM adapter yang map `VSlice<u8>` ↔ SQL TEXT
- Effort: 2+ minggu, dan mungkin perlu contribute ke VIL `vil_db_sqlx`

**Rekomendasi:**
1. Target **80%** compliance (Tier 1 + 2) sebagai PoC milestone
2. Tier 3 (VASI types) jadi roadmap item setelah PoC validated
3. Document keputusan di ADR (Architecture Decision Record)
