use std::sync::Arc;
use tokio::sync::RwLock;
use vil::prelude::*;
use vil::auth::VilJwt;
use crate::models::oauth::OAuthStateStore;

mod config;
mod db;
mod error;
mod middleware;
mod models;
mod services;
mod tasks;

use crate::config::AppConfig;
use crate::db::Database;
use crate::services::{admin, admin_monitoring, ai, auth, oauth, blog, creator, monitoring, profile, quiz, social, storage, writing, purchases, oracle, account_export};

#[tokio::main]
async fn main() {
    // vil::prelude::vil_log builder — dev_mode auto-detects debug/release profile.
    // dev_mode(true): tracing fallback (colored terminal)
    // dev_mode(false): full SPSC ring buffer (structured, fast)
    dotenv::dotenv().ok();

    let _log = vil::prelude::vil_log::init()
        .dev_mode(cfg!(debug_assertions))
        .build();

    let config = AppConfig::load();
    let pool = Database::connect(&config.database_url).await;

    let jwt = Arc::new(
        VilJwt::new(&config.jwt_secret)
            .access_expiry(std::time::Duration::from_secs(config.jwt_expiry_secs))
            .refresh_expiry(std::time::Duration::from_secs(config.jwt_refresh_expiry_secs))
    );

    let state = AppState::new(pool, config.clone(), jwt);

    // ── ServiceProcess definitions ──

    let auth_svc = ServiceProcess::new("auth")
        .endpoint(Method::POST, "/register", post(auth::register))
        .endpoint(Method::POST, "/login", post(auth::login))
        .endpoint(Method::POST, "/refresh", post(auth::refresh_token))
        .endpoint(Method::GET, "/profile", get(auth::get_profile))
        .endpoint(Method::PATCH, "/profile", patch(auth::update_profile))
        .endpoint(Method::POST, "/oauth/init", post(oauth::init_oauth))
        .endpoint(Method::POST, "/oauth/callback", post(oauth::oauth_callback))
        .endpoint(Method::POST, "/oauth/rotate", post(oauth::rotate_tokens))
        .endpoint(Method::GET, "/export", get(account_export::export_account))
        .state(state.clone());

    let admin_svc = ServiceProcess::new("admin")
        .endpoint(Method::GET, "/users", get(admin::list_admins))
        .endpoint(Method::PATCH, "/users/:user_id/tier", patch(admin::change_tier))
        .endpoint(Method::POST, "/roles", post(admin::assign_role))
        .endpoint(Method::DELETE, "/roles/:user_id", delete(admin::remove_role))
        .endpoint(Method::POST, "/verify-pin", post(admin::verify_pin))
        .endpoint(Method::GET, "/audit-logs", get(admin::audit_logs))
        .state(state.clone());

    let quiz_svc = ServiceProcess::new("quiz")
        .endpoint(Method::GET, "/questions", get(quiz::list_questions))
        .endpoint(Method::GET, "/simulation", get(quiz::simulation))
        .endpoint(Method::POST, "/results", post(quiz::save_result))
        .endpoint(Method::POST, "/reports", post(quiz::save_report))
        .endpoint(Method::GET, "/reports/:id", get(quiz::get_report))
        .endpoint(Method::GET, "/history", get(quiz::history))
        .endpoint(Method::GET, "/progress", get(quiz::progress))
        .endpoint(Method::GET, "/bank/count", get(quiz::get_question_count))
        .endpoint(Method::GET, "/bank/questions", get(quiz::get_questions_paginated))
        .endpoint(Method::POST, "/generate", post(quiz::generate_quiz))
        .endpoint(Method::GET, "/bank/questions/skill", get(quiz::get_questions_by_skill))
        .endpoint(Method::GET, "/bank/:id", get(quiz::get_question))
        .endpoint(Method::POST, "/bank", post(quiz::create_question))
        .endpoint(Method::PATCH, "/bank/:id", patch(quiz::update_question))
        .endpoint(Method::DELETE, "/bank/:id", delete(quiz::delete_question))
        .endpoint(Method::GET, "/passages/:id", get(quiz::get_passage))
        .endpoint(Method::POST, "/passages", post(quiz::save_passage))
        .endpoint(Method::GET, "/adaptive-metrics", get(quiz::get_adaptive_metrics))
        .endpoint(Method::POST, "/record-answer", post(quiz::record_answer))
        .state(state.clone());

    let profile_svc = ServiceProcess::new("profile")
        .endpoint(Method::GET, "/:user_id", get(profile::get_profile_by_id))
        .endpoint(Method::PATCH, "/:user_id", patch(profile::update_profile_by_id))
        .state(state.clone());

    let ai_svc = ServiceProcess::new("ai")
        .endpoint(Method::POST, "/generate", post(ai::generate))
        .endpoint(Method::POST, "/tts", post(ai::tts))
        .endpoint(Method::GET, "/token-usage", get(ai::token_usage))
        .state(state.clone());

    let purchases_svc = ServiceProcess::new("purchases")
        .endpoint(Method::POST, "/verify", post(purchases::verify))
        .state(state.clone());

    let writing_svc = ServiceProcess::new("writing")
        .endpoint(Method::GET, "/progress", get(writing::get_progress))
        .endpoint(Method::POST, "/progress", post(writing::save_progress))
        .endpoint(Method::GET, "/sessions", get(writing::get_sessions))
        .endpoint(Method::POST, "/sessions", post(writing::save_session))
        .endpoint(Method::POST, "/exercise", post(writing::get_exercise))
        .endpoint(Method::POST, "/evaluate", post(writing::evaluate_essay))
        .endpoint(Method::GET, "/model-essays", get(writing::list_model_essays))
        .endpoint(Method::GET, "/vocabulary", get(writing::get_vocabulary))
        .endpoint(Method::POST, "/vocabulary", post(writing::add_vocabulary))
        .endpoint(Method::POST, "/devils-advocate", post(writing::devils_advocate))
        .endpoint(Method::POST, "/peer-review/submissions", post(writing::submit_essay))
        .endpoint(Method::GET, "/peer-review/queue", get(writing::review_queue))
        .endpoint(Method::POST, "/peer-review/reviews", post(writing::submit_review))
        .state(state.clone());

    let social_svc = ServiceProcess::new("social")
        .endpoint(Method::POST, "/circles", post(social::create_circle))
        .endpoint(Method::POST, "/circles/join", post(social::join_circle))
        .endpoint(Method::GET, "/circles/mine", get(social::my_circles))
        .endpoint(Method::POST, "/circles/:id/messages", post(social::send_message))
        .endpoint(Method::GET, "/circles/:id/messages", get(social::get_messages))
        .endpoint(Method::POST, "/friends/add", post(social::add_friend))
        .endpoint(Method::GET, "/friends", get(social::list_friends))
        .endpoint(Method::DELETE, "/friends/:friend_id", delete(social::remove_friend))
        .endpoint(Method::POST, "/friends/respond", post(social::respond_friend_request))
        .endpoint(Method::GET, "/leaderboard", get(social::leaderboard))
        .endpoint(Method::GET, "/predictions", get(social::get_predictions))
        .endpoint(Method::POST, "/predictions", post(social::save_prediction))
        .endpoint(Method::GET, "/achievements", get(social::get_achievements))
        .endpoint(Method::GET, "/notifications", get(social::get_notifications))
        .endpoint(Method::POST, "/notifications", post(social::create_notification))
        .endpoint(Method::PATCH, "/notifications/:id/read", patch(social::mark_notification_read))
        .state(state.clone());

    let creator_svc = ServiceProcess::new("creator")
        .endpoint(Method::POST, "/register", post(creator::register_creator))
        .endpoint(Method::GET, "/profile", get(creator::get_creator_profile))
        .endpoint(Method::POST, "/bites", post(creator::create_bite))
        .endpoint(Method::GET, "/bites", get(creator::list_bites))
        .endpoint(Method::POST, "/bites/:id/view", post(creator::record_view))
        .endpoint(Method::POST, "/bites/:id/tip", post(creator::process_tip))
        .endpoint(Method::POST, "/payouts", post(creator::request_payout))
        .endpoint(Method::GET, "/stats", get(creator::creator_stats))
        .state(state.clone());

    let monitoring_svc = ServiceProcess::new("monitoring")
        .endpoint(Method::POST, "/logs/batch", post(monitoring::batch_logs))
        .endpoint(Method::POST, "/metrics/batch", post(monitoring::batch_metrics))
        .endpoint(Method::POST, "/moderation/reports", post(monitoring::create_content_report))
        .state(state.clone());

    let storage_svc = ServiceProcess::new("storage")
        .endpoint(Method::POST, "/avatars", post(storage::upload_avatar))
        .endpoint(Method::GET, "/avatars/:filename", get(storage::serve_avatar))
        .endpoint(Method::POST, "/audio", post(storage::upload_audio))
        .endpoint(Method::GET, "/audio/:filename", get(storage::serve_audio))
        .state(state.clone());

    let blog_svc = ServiceProcess::new("blog")
        .endpoint(Method::GET, "/posts", get(blog::list_posts))
        .endpoint(Method::GET, "/posts/:skill_id", get(blog::get_post))
        .endpoint(Method::POST, "/admin/posts", post(blog::upsert_post))
        .endpoint(Method::DELETE, "/admin/posts/:skill_id", delete(blog::delete_post))
        .state(state.clone());

    let admin_mon_svc = ServiceProcess::new("admin-monitoring")
        .endpoint(Method::GET, "/health", get(admin_monitoring::system_health))
        .endpoint(Method::GET, "/errors", get(admin_monitoring::recent_errors))
        .endpoint(Method::GET, "/feature-flags", get(admin_monitoring::list_feature_flags))
        .endpoint(Method::PATCH, "/feature-flags/:id", patch(admin_monitoring::update_feature_flag))
        .endpoint(Method::GET, "/moderation/reports", get(admin_monitoring::list_reports))
        .endpoint(Method::PATCH, "/moderation/reports/:id", patch(admin_monitoring::resolve_report))
        .state(state.clone());

    let oracle_svc = ServiceProcess::new("oracle")
        .endpoint(Method::GET, "/predict", get(oracle::predict_score))
        .state(state.clone());

    // ── Background tasks ──

    let task_pool = state.pool.clone();
    tokio::spawn(async move {
        tasks::run_periodic_tasks(task_pool).await;
    });

    // ── Run ──

    let port = config.port;

    let app = VilApp::new("toefl-quiz")
        .port(port)
        .observer(true)
        .service(auth_svc)
        .service(admin_svc)
        .service(quiz_svc)
        .service(profile_svc)
        .service(ai_svc)
        .service(purchases_svc)
        .service(writing_svc)
        .service(social_svc)
        .service(creator_svc)
        .service(monitoring_svc)
        .service(storage_svc)
        .service(blog_svc)
        .service(admin_mon_svc)
        .service(oracle_svc);

    // G7: Contract export — dump process topology as JSON
    if std::env::args().any(|a| a == "--contract") {
        println!("{}", app.contract_json());
        return;
    }

    vil::prelude::vil_log::app_log!(Info, "server.starting", { port: port as u64 });
    app.run().await;
}

#[derive(Clone)]
pub struct AppState {
    pub pool: Arc<vil::vil_db_sqlx::SqlxPool>,
    pub config: AppConfig,
    pub jwt: Arc<VilJwt>,
    pub oauth_state: Arc<RwLock<OAuthStateStore>>,
}

impl AppState {
    pub fn new(pool: vil::vil_db_sqlx::SqlxPool, config: AppConfig, jwt: Arc<VilJwt>) -> Self {
        Self {
            pool: Arc::new(pool),
            config,
            jwt,
            oauth_state: Arc::new(RwLock::new(OAuthStateStore::new())),
        }
    }
}
