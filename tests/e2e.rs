//! E2E Test Suite — TOEFL Quiz VIL Backend
//!
//! Spawns the actual server on port 18082, runs all endpoint tests, then shuts down.
//! Run: cargo test --test e2e -- --test-threads=1

use reqwest::Client;
use serde_json::{json, Value};
use std::time::Duration;

const BASE: &str = "http://localhost:18082";

struct TestCtx {
    client: Client,
    token: String,
    user_id: String,
}

impl TestCtx {
    fn auth_header(&self) -> String {
        format!("Bearer {}", self.token)
    }
}

// ── Helper: start server in background ──

async fn start_server() {
    // Clean DB
    let _ = std::fs::remove_file("test_e2e.db");
    let _ = std::fs::remove_file("test_e2e.db-wal");
    let _ = std::fs::remove_file("test_e2e.db-shm");

    std::env::set_var("DATABASE_URL", "sqlite:test_e2e.db");
    std::env::set_var("JWT_SECRET", "e2e-test-secret-key-12345");
    std::env::set_var("PORT", "18082");
    std::env::set_var("GROQ_API_KEY", ""); // No AI in tests

    // Spawn pre-built binary (avoids recompile delay inside test)
    tokio::spawn(async {
        let output = tokio::process::Command::new("./target/debug/toefl-quiz-backend")
            .env("DATABASE_URL", "sqlite:test_e2e.db")
            .env("JWT_SECRET", "e2e-test-secret-key-12345")
            .env("PORT", "18082")
            .env("GROQ_API_KEY", "")
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn();

        if let Ok(mut child) = output {
            let _ = child.wait().await;
        }
    });

    // Wait for server to be ready
    let client = Client::new();
    for _ in 0..30 {
        tokio::time::sleep(Duration::from_millis(500)).await;
        if client.get(format!("{BASE}/health")).send().await.is_ok() {
            return;
        }
    }
    panic!("Server failed to start within 15 seconds");
}

async fn setup() -> TestCtx {
    let client = Client::new();

    // Register
    let resp = client
        .post(format!("{BASE}/api/auth/register"))
        .json(&json!({"username": "e2e_user", "password": "testpass123", "full_name": "E2E Tester"}))
        .send().await.expect("register failed");
    assert_eq!(resp.status(), 201, "Register should return 201");
    let body: Value = resp.json().await.unwrap();
    assert_eq!(body["ok"], true);

    let token = body["access_token"].as_str().unwrap().to_string();
    let user_id = body["profile"]["id"].as_str().unwrap().to_string();

    TestCtx { client, token, user_id }
}

// ══════════════════════════════════════════
// AUTH TESTS
// ══════════════════════════════════════════

async fn test_auth(ctx: &TestCtx) {
    println!("  [auth] login");
    let resp = ctx.client.post(format!("{BASE}/api/auth/login"))
        .json(&json!({"username": "e2e_user", "password": "testpass123"}))
        .send().await.unwrap();
    assert_eq!(resp.status(), 200);
    let body: Value = resp.json().await.unwrap();
    assert_eq!(body["ok"], true);
    assert!(body["access_token"].is_string());
    assert!(body["refresh_token"].is_string());

    println!("  [auth] login wrong password → 401");
    let resp = ctx.client.post(format!("{BASE}/api/auth/login"))
        .json(&json!({"username": "e2e_user", "password": "wrong"}))
        .send().await.unwrap();
    assert_eq!(resp.status(), 401);

    println!("  [auth] refresh token");
    let refresh = body["refresh_token"].as_str().unwrap();
    let resp = ctx.client.post(format!("{BASE}/api/auth/refresh"))
        .json(&json!({"refresh_token": refresh}))
        .send().await.unwrap();
    assert_eq!(resp.status(), 200);

    println!("  [auth] get profile");
    let resp = ctx.client.get(format!("{BASE}/api/auth/profile"))
        .header("Authorization", ctx.auth_header())
        .send().await.unwrap();
    assert_eq!(resp.status(), 200);
    let body: Value = resp.json().await.unwrap();
    assert_eq!(body["username"], "e2e_user");

    println!("  [auth] update profile");
    let resp = ctx.client.patch(format!("{BASE}/api/auth/profile"))
        .header("Authorization", ctx.auth_header())
        .json(&json!({"bio": "E2E tester", "full_name": "Updated Name"}))
        .send().await.unwrap();
    assert_eq!(resp.status(), 200);
    let body: Value = resp.json().await.unwrap();
    assert_eq!(body["bio"], "E2E tester");

    println!("  [auth] no auth → 401");
    let resp = ctx.client.get(format!("{BASE}/api/auth/profile"))
        .send().await.unwrap();
    assert_eq!(resp.status(), 401);

    println!("  [auth] invalid token → 401");
    let resp = ctx.client.get(format!("{BASE}/api/auth/profile"))
        .header("Authorization", "Bearer invalid.token.here")
        .send().await.unwrap();
    assert_eq!(resp.status(), 401);

    println!("  [auth] duplicate register → 500");
    let resp = ctx.client.post(format!("{BASE}/api/auth/register"))
        .json(&json!({"username": "e2e_user", "password": "testpass123"}))
        .send().await.unwrap();
    assert!(resp.status().is_client_error() || resp.status().is_server_error());

    println!("  [auth] short password → 422");
    let resp = ctx.client.post(format!("{BASE}/api/auth/register"))
        .json(&json!({"username": "short_pw", "password": "123"}))
        .send().await.unwrap();
    assert_eq!(resp.status(), 422);
}

// ══════════════════════════════════════════
// ADMIN TESTS
// ══════════════════════════════════════════

async fn test_admin(ctx: &TestCtx) {
    println!("  [admin] list admins → 403 (not admin)");
    let resp = ctx.client.get(format!("{BASE}/api/admin/users"))
        .header("Authorization", ctx.auth_header())
        .send().await.unwrap();
    assert_eq!(resp.status(), 403);

    println!("  [admin] assign role → 403 (not super_admin)");
    let resp = ctx.client.post(format!("{BASE}/api/admin/roles"))
        .header("Authorization", ctx.auth_header())
        .json(&json!({"user_id": ctx.user_id}))
        .send().await.unwrap();
    assert_eq!(resp.status(), 403);
}

// ══════════════════════════════════════════
// QUIZ TESTS
// ══════════════════════════════════════════

async fn test_quiz(ctx: &TestCtx) {
    println!("  [quiz] list questions (empty)");
    let resp = ctx.client.get(format!("{BASE}/api/quiz/questions"))
        .header("Authorization", ctx.auth_header())
        .send().await.unwrap();
    assert_eq!(resp.status(), 200);
    let body: Value = resp.json().await.unwrap();
    assert!(body.is_array());

    println!("  [quiz] simulation (empty)");
    let resp = ctx.client.get(format!("{BASE}/api/quiz/simulation"))
        .header("Authorization", ctx.auth_header())
        .send().await.unwrap();
    assert_eq!(resp.status(), 200);

    println!("  [quiz] save result");
    let resp = ctx.client.post(format!("{BASE}/api/quiz/results"))
        .header("Authorization", ctx.auth_header())
        .json(&json!({"section": "structure", "score": 85, "correct_count": 17, "total_questions": 20}))
        .send().await.unwrap();
    assert_eq!(resp.status(), 201);
    let body: Value = resp.json().await.unwrap();
    assert!(body["xp_earned"].as_i64().unwrap() > 0);

    println!("  [quiz] save another result");
    let resp = ctx.client.post(format!("{BASE}/api/quiz/results"))
        .header("Authorization", ctx.auth_header())
        .json(&json!({"section": "reading", "score": 70, "correct_count": 7, "total_questions": 10}))
        .send().await.unwrap();
    assert_eq!(resp.status(), 201);

    println!("  [quiz] history");
    let resp = ctx.client.get(format!("{BASE}/api/quiz/history"))
        .header("Authorization", ctx.auth_header())
        .send().await.unwrap();
    assert_eq!(resp.status(), 200);
    let body: Value = resp.json().await.unwrap();
    assert_eq!(body.as_array().unwrap().len(), 2);

    println!("  [quiz] progress");
    let resp = ctx.client.get(format!("{BASE}/api/quiz/progress"))
        .header("Authorization", ctx.auth_header())
        .send().await.unwrap();
    assert_eq!(resp.status(), 200);
    let body: Value = resp.json().await.unwrap();
    assert_eq!(body["total_quizzes"], 2);
    assert!(body["total_xp"].as_i64().unwrap() > 0);
    assert!(body["level"].as_i64().unwrap() >= 1);
}

// ══════════════════════════════════════════
// AI TESTS
// ══════════════════════════════════════════

async fn test_ai(ctx: &TestCtx) {
    println!("  [ai] token usage");
    let resp = ctx.client.get(format!("{BASE}/api/ai/token-usage"))
        .header("Authorization", ctx.auth_header())
        .send().await.unwrap();
    assert_eq!(resp.status(), 200);
    let body: Value = resp.json().await.unwrap();
    assert_eq!(body["tier"], "free");
    assert_eq!(body["limit"], 15);

    println!("  [ai] generate with invalid model → 422");
    let resp = ctx.client.post(format!("{BASE}/api/ai/generate"))
        .header("Authorization", ctx.auth_header())
        .json(&json!({
            "messages": [{"role": "user", "content": "hello"}],
            "model": "invalid-model-xyz"
        }))
        .send().await.unwrap();
    assert_eq!(resp.status(), 422);
}

// ══════════════════════════════════════════
// WRITING TESTS
// ══════════════════════════════════════════

async fn test_writing(ctx: &TestCtx) {
    println!("  [writing] save progress");
    let resp = ctx.client.post(format!("{BASE}/api/writing/progress"))
        .header("Authorization", ctx.auth_header())
        .json(&json!({"level": "mason", "skill_id": "S1", "exercises_completed": 5, "stars_earned": 3}))
        .send().await.unwrap();
    assert_eq!(resp.status(), 200);

    println!("  [writing] get progress");
    let resp = ctx.client.get(format!("{BASE}/api/writing/progress"))
        .header("Authorization", ctx.auth_header())
        .send().await.unwrap();
    assert_eq!(resp.status(), 200);
    let body: Value = resp.json().await.unwrap();
    assert_eq!(body.as_array().unwrap().len(), 1);

    println!("  [writing] upsert progress (stars 3→5)");
    let resp = ctx.client.post(format!("{BASE}/api/writing/progress"))
        .header("Authorization", ctx.auth_header())
        .json(&json!({"level": "mason", "skill_id": "S1", "exercises_completed": 10, "stars_earned": 5}))
        .send().await.unwrap();
    assert_eq!(resp.status(), 200);

    println!("  [writing] save session");
    let resp = ctx.client.post(format!("{BASE}/api/writing/sessions"))
        .header("Authorization", ctx.auth_header())
        .json(&json!({"level": "mason", "skill_id": "S1", "session_state": "{\"score\":50}", "best_score": 50}))
        .send().await.unwrap();
    assert_eq!(resp.status(), 200);

    println!("  [writing] get sessions");
    let resp = ctx.client.get(format!("{BASE}/api/writing/sessions?level=mason"))
        .header("Authorization", ctx.auth_header())
        .send().await.unwrap();
    assert_eq!(resp.status(), 200);

    println!("  [writing] get exercise (from pool)");
    let resp = ctx.client.post(format!("{BASE}/api/writing/exercise"))
        .header("Authorization", ctx.auth_header())
        .json(&json!({"level": "mason", "skill_id": "S1"}))
        .send().await.unwrap();
    assert_eq!(resp.status(), 200);
    let body: Value = resp.json().await.unwrap();
    assert!(body["source"].is_string());

    println!("  [writing] evaluate essay (no AI key → saved without feedback)");
    let resp = ctx.client.post(format!("{BASE}/api/writing/evaluate"))
        .header("Authorization", ctx.auth_header())
        .json(&json!({
            "essay": "Technology has fundamentally transformed education in many significant ways over the past decade. Students can now access learning materials from virtually anywhere in the world using their smartphones and laptops. Online platforms provide interactive lessons, real-time feedback, and personalized learning paths. However, some critics argue that technology creates unnecessary distractions in the classroom. Despite these concerns, the benefits of educational technology far outweigh the drawbacks when implemented thoughtfully and with proper guidance from educators.",
            "task_type": "discussion",
            "prompt": "Technology in education"
        }))
        .send().await.unwrap();
    assert_eq!(resp.status(), 200);
    let body: Value = resp.json().await.unwrap();
    assert!(body["id"].is_string());
    assert!(body["word_count"].as_i64().unwrap() >= 30);

    println!("  [writing] evaluate essay too short → 422");
    let resp = ctx.client.post(format!("{BASE}/api/writing/evaluate"))
        .header("Authorization", ctx.auth_header())
        .json(&json!({"essay": "Too short.", "task_type": "discussion"}))
        .send().await.unwrap();
    assert_eq!(resp.status(), 422);

    println!("  [writing] add vocabulary");
    let resp = ctx.client.post(format!("{BASE}/api/writing/vocabulary"))
        .header("Authorization", ctx.auth_header())
        .json(&json!({"word": "ubiquitous", "definition": "present everywhere", "cefr_level": "C1"}))
        .send().await.unwrap();
    assert_eq!(resp.status(), 201);

    println!("  [writing] get vocabulary");
    let resp = ctx.client.get(format!("{BASE}/api/writing/vocabulary"))
        .header("Authorization", ctx.auth_header())
        .send().await.unwrap();
    assert_eq!(resp.status(), 200);
    let body: Value = resp.json().await.unwrap();
    assert_eq!(body["count"], 1);

    println!("  [writing] devils advocate");
    let resp = ctx.client.post(format!("{BASE}/api/writing/devils-advocate"))
        .header("Authorization", ctx.auth_header())
        .json(&json!({"user_argument": "Social media improves education"}))
        .send().await.unwrap();
    assert_eq!(resp.status(), 200);
    let body: Value = resp.json().await.unwrap();
    assert!(body["id"].is_string());

    // ── Peer Review ──
    println!("  [writing] submit essay for peer review");
    let resp = ctx.client.post(format!("{BASE}/api/writing/peer-review/submissions"))
        .header("Authorization", ctx.auth_header())
        .json(&json!({
            "essay_content": "Technology has changed education significantly in recent years.",
            "task_type": "discussion",
            "prompt": "Technology in education"
        }))
        .send().await.unwrap();
    assert_eq!(resp.status(), 201);
    let body: Value = resp.json().await.unwrap();
    let submission_id = body["id"].as_str().unwrap().to_string();
    assert_eq!(body["status"], "pending");

    println!("  [writing] review queue (own submission excluded)");
    let resp = ctx.client.get(format!("{BASE}/api/writing/peer-review/queue"))
        .header("Authorization", ctx.auth_header())
        .send().await.unwrap();
    assert_eq!(resp.status(), 200);
    let body: Value = resp.json().await.unwrap();
    // Own submission should NOT appear in queue
    assert_eq!(body.as_array().unwrap().len(), 0);

    println!("  [writing] submit review");
    let resp = ctx.client.post(format!("{BASE}/api/writing/peer-review/reviews"))
        .header("Authorization", ctx.auth_header())
        .json(&json!({
            "submission_id": submission_id,
            "task_response_score": 7,
            "coherence_score": 6,
            "lexical_score": 7,
            "grammar_score": 8,
            "strengths": "Good vocabulary",
            "weaknesses": "Needs more examples"
        }))
        .send().await.unwrap();
    assert_eq!(resp.status(), 201);
    let body: Value = resp.json().await.unwrap();
    assert_eq!(body["overall_band"], 7.0);
}

// ══════════════════════════════════════════
// SOCIAL TESTS
// ══════════════════════════════════════════

async fn test_social(ctx: &TestCtx) {
    println!("  [social] create circle");
    let resp = ctx.client.post(format!("{BASE}/api/social/circles"))
        .header("Authorization", ctx.auth_header())
        .json(&json!({"name": "E2E Study Group", "description": "Test circle"}))
        .send().await.unwrap();
    assert_eq!(resp.status(), 201);
    let body: Value = resp.json().await.unwrap();
    let circle_id = body["id"].as_str().unwrap().to_string();
    let circle_code = body["code"].as_str().unwrap().to_string();
    assert_eq!(circle_code.len(), 6);

    println!("  [social] my circles");
    let resp = ctx.client.get(format!("{BASE}/api/social/circles/mine"))
        .header("Authorization", ctx.auth_header())
        .send().await.unwrap();
    assert_eq!(resp.status(), 200);
    let body: Value = resp.json().await.unwrap();
    assert_eq!(body.as_array().unwrap().len(), 1);

    println!("  [social] send message");
    let resp = ctx.client.post(format!("{BASE}/api/social/circles/{circle_id}/messages"))
        .header("Authorization", ctx.auth_header())
        .json(&json!({"content": "Hello E2E!"}))
        .send().await.unwrap();
    assert_eq!(resp.status(), 201);

    println!("  [social] get messages");
    let resp = ctx.client.get(format!("{BASE}/api/social/circles/{circle_id}/messages"))
        .header("Authorization", ctx.auth_header())
        .send().await.unwrap();
    assert_eq!(resp.status(), 200);
    let body: Value = resp.json().await.unwrap();
    assert_eq!(body.as_array().unwrap().len(), 1);
    assert_eq!(body[0]["content"], "Hello E2E!");

    println!("  [social] leaderboard");
    let resp = ctx.client.get(format!("{BASE}/api/social/leaderboard"))
        .header("Authorization", ctx.auth_header())
        .send().await.unwrap();
    assert_eq!(resp.status(), 200);
    let body: Value = resp.json().await.unwrap();
    assert!(body.as_array().unwrap().len() >= 1);
    assert_eq!(body[0]["rank"], 1);

    println!("  [social] save prediction");
    let resp = ctx.client.post(format!("{BASE}/api/social/predictions"))
        .header("Authorization", ctx.auth_header())
        .json(&json!({"prediction_type": "toefl_pbt", "predicted_value": 550.0, "confidence": 0.8}))
        .send().await.unwrap();
    assert_eq!(resp.status(), 201);

    println!("  [social] get predictions");
    let resp = ctx.client.get(format!("{BASE}/api/social/predictions"))
        .header("Authorization", ctx.auth_header())
        .send().await.unwrap();
    assert_eq!(resp.status(), 200);
    let body: Value = resp.json().await.unwrap();
    assert_eq!(body.as_array().unwrap().len(), 1);

    println!("  [social] achievements (empty)");
    let resp = ctx.client.get(format!("{BASE}/api/social/achievements"))
        .header("Authorization", ctx.auth_header())
        .send().await.unwrap();
    assert_eq!(resp.status(), 200);

    println!("  [social] notifications (empty)");
    let resp = ctx.client.get(format!("{BASE}/api/social/notifications"))
        .header("Authorization", ctx.auth_header())
        .send().await.unwrap();
    assert_eq!(resp.status(), 200);
}

// ══════════════════════════════════════════
// CREATOR TESTS
// ══════════════════════════════════════════

async fn test_creator(ctx: &TestCtx) {
    println!("  [creator] register");
    let resp = ctx.client.post(format!("{BASE}/api/creator/register"))
        .header("Authorization", ctx.auth_header())
        .json(&json!({"display_name": "E2E Creator"}))
        .send().await.unwrap();
    assert_eq!(resp.status(), 201);
    let body: Value = resp.json().await.unwrap();
    assert_eq!(body["status"], "pending");

    println!("  [creator] duplicate register → 422");
    let resp = ctx.client.post(format!("{BASE}/api/creator/register"))
        .header("Authorization", ctx.auth_header())
        .json(&json!({"display_name": "Duplicate"}))
        .send().await.unwrap();
    assert_eq!(resp.status(), 422);

    println!("  [creator] profile");
    let resp = ctx.client.get(format!("{BASE}/api/creator/profile"))
        .header("Authorization", ctx.auth_header())
        .send().await.unwrap();
    assert_eq!(resp.status(), 200);
    let body: Value = resp.json().await.unwrap();
    assert_eq!(body["display_name"], "E2E Creator");

    println!("  [creator] create bite → 403 (not approved)");
    let resp = ctx.client.post(format!("{BASE}/api/creator/bites"))
        .header("Authorization", ctx.auth_header())
        .json(&json!({"youtube_video_id": "abc123", "title": "Test", "category": "GRAMMAR_HACK"}))
        .send().await.unwrap();
    assert_eq!(resp.status(), 403);

    println!("  [creator] list bites");
    let resp = ctx.client.get(format!("{BASE}/api/creator/bites?status=pending"))
        .header("Authorization", ctx.auth_header())
        .send().await.unwrap();
    assert_eq!(resp.status(), 200);

    println!("  [creator] stats");
    let resp = ctx.client.get(format!("{BASE}/api/creator/stats"))
        .header("Authorization", ctx.auth_header())
        .send().await.unwrap();
    assert_eq!(resp.status(), 200);
    let body: Value = resp.json().await.unwrap();
    assert_eq!(body["total_views"], 0);
    assert_eq!(body["total_bites"], 0);
}

// ══════════════════════════════════════════
// STORAGE + BLOG + MONITORING TESTS
// ══════════════════════════════════════════

async fn test_storage_blog_monitoring(ctx: &TestCtx) {
    // Storage
    println!("  [storage] upload avatar (PNG)");
    let png_bytes = vec![0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x01];
    let resp = ctx.client.post(format!("{BASE}/api/storage/avatars"))
        .header("Authorization", ctx.auth_header())
        .header("Content-Type", "application/octet-stream")
        .body(png_bytes)
        .send().await.unwrap();
    assert_eq!(resp.status(), 201);
    let body: Value = resp.json().await.unwrap();
    assert!(body["url"].as_str().unwrap().contains("/avatars/"));

    println!("  [storage] upload invalid file → 422");
    let resp = ctx.client.post(format!("{BASE}/api/storage/avatars"))
        .header("Authorization", ctx.auth_header())
        .header("Content-Type", "application/octet-stream")
        .body("not an image")
        .send().await.unwrap();
    assert_eq!(resp.status(), 422);

    println!("  [storage] serve nonexistent → 404");
    let resp = ctx.client.get(format!("{BASE}/api/storage/avatars/nonexistent.png"))
        .send().await.unwrap();
    assert_eq!(resp.status(), 404);

    // Blog (public)
    println!("  [blog] list posts (empty)");
    let resp = ctx.client.get(format!("{BASE}/api/blog/posts"))
        .send().await.unwrap();
    assert_eq!(resp.status(), 200);

    // Blog admin (should fail — not admin)
    println!("  [blog] admin create → 403");
    let resp = ctx.client.post(format!("{BASE}/api/blog/admin/posts"))
        .header("Authorization", ctx.auth_header())
        .json(&json!({"skill_id": "S1", "title": "Test", "content": "Content"}))
        .send().await.unwrap();
    assert_eq!(resp.status(), 403);

    // Admin monitoring (should fail — not admin)
    println!("  [admin-mon] health → 403");
    let resp = ctx.client.get(format!("{BASE}/api/admin-monitoring/health"))
        .header("Authorization", ctx.auth_header())
        .send().await.unwrap();
    assert_eq!(resp.status(), 403);

    println!("  [admin-mon] feature-flags → 403");
    let resp = ctx.client.get(format!("{BASE}/api/admin-monitoring/feature-flags"))
        .header("Authorization", ctx.auth_header())
        .send().await.unwrap();
    assert_eq!(resp.status(), 403);

    // Monitoring (public endpoints)
    println!("  [monitoring] batch logs");
    let resp = ctx.client.post(format!("{BASE}/api/monitoring/logs/batch"))
        .header("Authorization", ctx.auth_header())
        .json(&json!([
            {"level": "info", "component": "e2e", "message": "test log 1"},
            {"level": "warn", "component": "e2e", "message": "test log 2"}
        ]))
        .send().await.unwrap();
    assert_eq!(resp.status(), 200);
    let body: Value = resp.json().await.unwrap();
    assert_eq!(body["count"], 2);

    println!("  [monitoring] batch metrics");
    let resp = ctx.client.post(format!("{BASE}/api/monitoring/metrics/batch"))
        .header("Authorization", ctx.auth_header())
        .json(&json!([
            {"metric_name": "e2e_test", "metric_value": 42.0, "component": "test"}
        ]))
        .send().await.unwrap();
    assert_eq!(resp.status(), 200);
}

// ══════════════════════════════════════════
// VIL BUILT-IN TESTS
// ══════════════════════════════════════════

async fn test_vil_builtins() {
    let client = Client::new();

    println!("  [vil] health");
    let resp = client.get(format!("{BASE}/health")).send().await.unwrap();
    assert_eq!(resp.status(), 200);
    let body: Value = resp.json().await.unwrap();
    assert_eq!(body["status"], "healthy");

    println!("  [vil] ready");
    let resp = client.get(format!("{BASE}/ready")).send().await.unwrap();
    assert_eq!(resp.status(), 200);

    println!("  [vil] metrics");
    let resp = client.get(format!("{BASE}/metrics")).send().await.unwrap();
    assert_eq!(resp.status(), 200);
    let text = resp.text().await.unwrap();
    assert!(text.contains("vil_requests_total"));

    println!("  [vil] info");
    let resp = client.get(format!("{BASE}/info")).send().await.unwrap();
    assert_eq!(resp.status(), 200);
    let body: Value = resp.json().await.unwrap();
    assert_eq!(body["name"], "toefl-quiz");
}

// ══════════════════════════════════════════
// MAIN TEST RUNNER
// ══════════════════════════════════════════

#[tokio::test]
async fn e2e_full_suite() {
    println!("\n╔══════════════════════════════════════════╗");
    println!("║  E2E Test Suite — TOEFL Quiz VIL Backend ║");
    println!("╚══════════════════════════════════════════╝\n");

    println!("[*] Starting server...");
    start_server().await;

    println!("[*] VIL Built-in endpoints");
    test_vil_builtins().await;

    println!("[*] Setting up test user...");
    let ctx = setup().await;

    println!("[*] Auth tests");
    test_auth(&ctx).await;

    println!("[*] Admin tests");
    test_admin(&ctx).await;

    println!("[*] Quiz tests");
    test_quiz(&ctx).await;

    println!("[*] AI tests");
    test_ai(&ctx).await;

    println!("[*] Writing tests");
    test_writing(&ctx).await;

    println!("[*] Social tests");
    test_social(&ctx).await;

    println!("[*] New endpoints tests");
    test_reports(&ctx).await;
    test_profile(&ctx).await;
    test_friends(&ctx).await;
    test_notifications(&ctx).await;

    println!("[*] Creator tests");
    test_creator(&ctx).await;

    println!("[*] Storage + Blog + Monitoring tests");
    test_storage_blog_monitoring(&ctx).await;

    // Cleanup
    let _ = std::fs::remove_file("test_e2e.db");
    let _ = std::fs::remove_file("test_e2e.db-wal");
    let _ = std::fs::remove_file("test_e2e.db-shm");
    let _ = std::fs::remove_dir_all("uploads");

    println!("\n╔══════════════════════════════════════════╗");
    println!("║  ALL E2E TESTS PASSED ✓                  ║");
    println!("╚══════════════════════════════════════════╝\n");
}

// ══════════════════════════════════════════
// QUIZ REPORTS TESTS
// ══════════════════════════════════════════

async fn test_reports(ctx: &TestCtx) {
    println!("  [reports] save report");
    let resp = ctx.client.post(format!("{BASE}/api/quiz/reports"))
        .header("Authorization", ctx.auth_header())
        .json(&json!({
            "section": "structure",
            "student_name": "E2E User",
            "quiz_topic": "Grammar",
            "score": 80,
            "total_questions": 10,
            "correct_count": 8,
            "answers_snapshot": []
        }))
        .send().await.unwrap();
    assert_eq!(resp.status(), 201);
    let body: Value = resp.json().await.unwrap();
    let report_id = body["id"].as_str().unwrap().to_string();
    assert!(!report_id.is_empty());

    println!("  [reports] get report by id");
    let resp = ctx.client.get(format!("{BASE}/api/quiz/reports/{report_id}"))
        .send().await.unwrap();
    assert_eq!(resp.status(), 200);
    let body: Value = resp.json().await.unwrap();
    assert_eq!(body["score"], 80);
    assert_eq!(body["quiz_topic"], "Grammar");

    println!("  [reports] get nonexistent report → 404");
    let resp = ctx.client.get(format!("{BASE}/api/quiz/reports/nonexistent-id"))
        .send().await.unwrap();
    assert_eq!(resp.status(), 404);
}

// ══════════════════════════════════════════
// PROFILE TESTS
// ══════════════════════════════════════════

async fn test_profile(ctx: &TestCtx) {
    println!("  [profile] get public profile");
    let resp = ctx.client.get(format!("{BASE}/api/profile/{}", ctx.user_id))
        .send().await.unwrap();
    assert_eq!(resp.status(), 200);
    let body: Value = resp.json().await.unwrap();
    assert_eq!(body["id"], ctx.user_id.as_str());
    assert!(body.get("friend_code").is_none(), "friend_code must not be in public profile");

    println!("  [profile] update own profile");
    let resp = ctx.client.patch(format!("{BASE}/api/profile/{}", ctx.user_id))
        .header("Authorization", ctx.auth_header())
        .json(&json!({"full_name": "E2E Updated Name"}))
        .send().await.unwrap();
    assert_eq!(resp.status(), 200);

    println!("  [profile] update other user profile → 403");
    let resp = ctx.client.patch(format!("{BASE}/api/profile/other-user-id"))
        .header("Authorization", ctx.auth_header())
        .json(&json!({"full_name": "Hacker"}))
        .send().await.unwrap();
    assert_eq!(resp.status(), 403);
}

// ══════════════════════════════════════════
// FRIENDS TESTS
// ══════════════════════════════════════════

async fn test_friends(ctx: &TestCtx) {
    println!("  [friends] list friends (empty)");
    let resp = ctx.client.get(format!("{BASE}/api/social/friends"))
        .header("Authorization", ctx.auth_header())
        .send().await.unwrap();
    assert_eq!(resp.status(), 200);
    let body: Value = resp.json().await.unwrap();
    assert!(body.as_array().unwrap().is_empty());

    println!("  [friends] add friend with invalid code → 404");
    let resp = ctx.client.post(format!("{BASE}/api/social/friends/add"))
        .header("Authorization", ctx.auth_header())
        .json(&json!({"friend_code": "INVALID-CODE"}))
        .send().await.unwrap();
    assert_eq!(resp.status(), 404);

    println!("  [friends] respond to nonexistent request → 404");
    let resp = ctx.client.post(format!("{BASE}/api/social/friends/respond"))
        .header("Authorization", ctx.auth_header())
        .json(&json!({"requester_id": "nonexistent", "accept": true}))
        .send().await.unwrap();
    assert_eq!(resp.status(), 404);

    println!("  [friends] remove nonexistent friend → 200 (idempotent)");
    let resp = ctx.client.delete(format!("{BASE}/api/social/friends/nonexistent"))
        .header("Authorization", ctx.auth_header())
        .send().await.unwrap();
    assert_eq!(resp.status(), 200);
}

// ══════════════════════════════════════════
// NOTIFICATIONS TESTS
// ══════════════════════════════════════════

async fn test_notifications(ctx: &TestCtx) {
    println!("  [notifications] create self notification");
    let resp = ctx.client.post(format!("{BASE}/api/social/notifications"))
        .header("Authorization", ctx.auth_header())
        .json(&json!({"type": "system", "message": "E2E test notification"}))
        .send().await.unwrap();
    assert_eq!(resp.status(), 201);
    let body: Value = resp.json().await.unwrap();
    let notif_id = body["id"].as_str().unwrap().to_string();

    println!("  [notifications] list notifications");
    let resp = ctx.client.get(format!("{BASE}/api/social/notifications"))
        .header("Authorization", ctx.auth_header())
        .send().await.unwrap();
    assert_eq!(resp.status(), 200);
    let body: Value = resp.json().await.unwrap();
    let notifs = body.as_array().unwrap();
    assert_eq!(notifs.len(), 1);
    assert_eq!(notifs[0]["is_read"], false);
    assert!(notifs[0].get("message").is_some());

    println!("  [notifications] mark as read");
    let resp = ctx.client.patch(format!("{BASE}/api/social/notifications/{notif_id}/read"))
        .header("Authorization", ctx.auth_header())
        .send().await.unwrap();
    assert_eq!(resp.status(), 200);

    println!("  [notifications] create without auth → 401");
    let resp = ctx.client.post(format!("{BASE}/api/social/notifications"))
        .json(&json!({"type": "system", "message": "spam"}))
        .send().await.unwrap();
    assert_eq!(resp.status(), 401);
}