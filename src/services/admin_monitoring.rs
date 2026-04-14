use crate::error::AppError;
use crate::middleware::admin::require_admin;
use crate::middleware::auth::Claims;
use crate::models::monitoring::*;
use crate::models::profile::Profile;
use crate::models::quiz::QuizResult;
use crate::models::responses::*;
use crate::models::views::*;
use vil_orm::vil_args;
use vil::prelude::*;

/// GET /api/admin/monitoring/health — system health dashboard
#[vil_handler]
pub async fn system_health(
    ctx: ServiceCtx,
    claims: Claims,
) -> Result<VilResponse<SystemHealthResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    require_admin(&claims)?;

    let errors_1h: i64 = AppLog::scalar_v(
        state.pool.inner(), "COUNT(*)", "level IN ('error','critical') AND created_at > datetime('now', '-1 hour')", vil_args![],
    ).await?;

    let warnings_1h: i64 = AppLog::scalar_v(
        state.pool.inner(), "COUNT(*)", "level = 'warn' AND created_at > datetime('now', '-1 hour')", vil_args![],
    ).await?;

    let total_users = Profile::scalar_v::<i64>(
        state.pool.inner(), "COUNT(*)", "1=1", vil_args![],
    ).await?;

    let active_24h = QuizResult::scalar_v::<i64>(
        state.pool.inner(), "COUNT(DISTINCT user_id)", "date > datetime('now', '-24 hours')", vil_args![],
    ).await?;

    Ok(VilResponse::ok(SystemHealthResponse {
        errors_last_hour: errors_1h,
        warnings_last_hour: warnings_1h,
        total_users,
        active_users_24h: active_24h,
    }))
}

/// GET /api/admin/monitoring/errors — recent errors
#[vil_handler]
pub async fn recent_errors(
    ctx: ServiceCtx,
    claims: Claims,
) -> Result<VilResponse<Vec<ErrorLogRow>>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    require_admin(&claims)?;

    let errors = AppLog::q()
        .select(&["id", "level", "component", "message", "created_at"])
        .where_raw("level IN ('error','critical')")
        .order_by_desc("created_at")
        .limit(50)
        .fetch_all::<ErrorLogRow>(state.pool.inner()).await?;

    Ok(VilResponse::ok(errors))
}

/// GET /api/admin/feature-flags — list feature flags
#[vil_handler]
pub async fn list_feature_flags(
    ctx: ServiceCtx,
    claims: Claims,
) -> Result<VilResponse<Vec<FlagRow>>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    require_admin(&claims)?;

    let flags = FeatureFlag::q()
        .select(&["id", "name", "enabled", "rollout_percent"])
        .order_by_asc("name")
        .fetch_all::<FlagRow>(state.pool.inner()).await?;

    Ok(VilResponse::ok(flags))
}

/// PATCH /api/admin/feature-flags/:id — toggle feature flag
#[vil_handler]
pub async fn update_feature_flag(
    ctx: ServiceCtx,
    claims: Claims,
    Path(flag_id): Path<String>,
    body: ShmSlice,
) -> Result<VilResponse<OkResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    require_admin(&claims)?;
    let req: serde_json::Value = body.json().map_err(|_| AppError::Validation("Invalid body".into()))?;

    let enabled = if req["enabled"].as_bool().unwrap_or(false) { 1i32 } else { 0 };
    let rollout = req["rollout_percent"].as_i64().unwrap_or(0);

    let fid = flag_id.clone();
    let enabled_i64 = enabled as i64;
    FeatureFlag::update_v(state.pool.inner(), "enabled = ?, rollout_percent = ?", "id = ?", vil_args![enabled_i64, rollout, fid]).await?;

    Ok(VilResponse::ok(OkResponse { ok: true }))
}

/// GET /api/admin/moderation/reports — pending content reports
#[vil_handler]
pub async fn list_reports(
    ctx: ServiceCtx,
    claims: Claims,
) -> Result<VilResponse<Vec<ReportRow>>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    require_admin(&claims)?;

    let reports = ContentReport::q()
        .select(&["id", "reporter_id", "content_type", "content_id", "reason", "status", "created_at"])
        .order_by_desc("created_at")
        .limit(50)
        .fetch_all::<ReportRow>(state.pool.inner()).await?;

    Ok(VilResponse::ok(reports))
}

/// PATCH /api/admin/moderation/reports/:id — resolve report
#[vil_handler]
pub async fn resolve_report(
    ctx: ServiceCtx,
    claims: Claims,
    Path(report_id): Path<String>,
    body: ShmSlice,
) -> Result<VilResponse<OkResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    require_admin(&claims)?;
    let req: serde_json::Value = body.json().map_err(|_| AppError::Validation("Invalid body".into()))?;
    let status = req["status"].as_str().unwrap_or("resolved");

    let status_owned = status.to_string();
    let resolved_by = claims.sub.clone();
    let rid = report_id.clone();
    ContentReport::update_v(state.pool.inner(), "status = ?, resolved_by = ?", "id = ?", vil_args![status_owned, resolved_by, rid]).await?;

    Ok(VilResponse::ok(OkResponse { ok: true }))
}
