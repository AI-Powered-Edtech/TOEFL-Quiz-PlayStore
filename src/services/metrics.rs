use crate::error::AppError;
use crate::middleware::admin::require_admin;
use crate::middleware::auth::Claims;
use crate::models::quiz::QuizResult;
use vil_orm::vil_args;
use vil::prelude::*;
use std::sync::atomic::{AtomicU64, Ordering};

static START_TIME: AtomicU64 = AtomicU64::new(0);
static REQUEST_COUNT: AtomicU64 = AtomicU64::new(0);
static ERROR_COUNT: AtomicU64 = AtomicU64::new(0);
static TOTAL_RESPONSE_TIME_MS: AtomicU64 = AtomicU64::new(0);

pub fn init_metrics() {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    START_TIME.store(now, Ordering::SeqCst);
}

pub fn record_request(response_time_ms: u64, is_error: bool) {
    REQUEST_COUNT.fetch_add(1, Ordering::SeqCst);
    TOTAL_RESPONSE_TIME_MS.fetch_add(response_time_ms, Ordering::SeqCst);
    if is_error {
        ERROR_COUNT.fetch_add(1, Ordering::SeqCst);
    }
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MetricsResponse {
    pub active_users_24h: i64,
    pub total_quizzes_24h: i64,
    pub avg_response_time_ms: f64,
    pub error_rate_24h: f64,
    pub uptime_seconds: u64,
}

#[vil_handler]
pub async fn get_metrics(
    ctx: ServiceCtx,
    claims: Claims,
) -> Result<VilResponse<MetricsResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    require_admin(&claims)?;

    let active_users_24h = QuizResult::scalar_v::<i64>(
        state.pool.inner(),
        "COUNT(DISTINCT user_id)",
        "date > datetime('now', '-24 hours')",
        vil_args![],
    ).await?;

    let total_quizzes_24h = QuizResult::scalar_v::<i64>(
        state.pool.inner(),
        "COUNT(*)",
        "date > datetime('now', '-24 hours')",
        vil_args![],
    ).await?;

    let requests = REQUEST_COUNT.load(Ordering::SeqCst) as f64;
    let errors = ERROR_COUNT.load(Ordering::SeqCst) as f64;
    let total_time_ms = TOTAL_RESPONSE_TIME_MS.load(Ordering::SeqCst) as f64;

    let avg_response_time_ms = if requests > 0.0 {
        total_time_ms / requests
    } else {
        0.0
    };

    let error_rate_24h = if requests > 0.0 {
        (errors / requests) * 100.0
    } else {
        0.0
    };

    let start = START_TIME.load(Ordering::SeqCst);
    let uptime_seconds = if start > 0 {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() - start
    } else {
        0
    };

    Ok(VilResponse::ok(MetricsResponse {
        active_users_24h,
        total_quizzes_24h,
        avg_response_time_ms,
        error_rate_24h,
        uptime_seconds,
    }))
}