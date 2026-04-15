use crate::error::AppError;
use crate::middleware::auth::Claims;
use crate::models::monitoring::*;
use crate::models::responses::*;
use vil::prelude::*;

#[vil_handler]
pub async fn batch_logs(
    ctx: ServiceCtx,
    body: ShmSlice,
) -> Result<VilResponse<BatchResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let entries: Vec<serde_json::Value> = body.json()
        .map_err(|_| AppError::Validation("Invalid JSON array".into()))?;

    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    for entry in &entries {
        let level = entry.get("level").and_then(|v| v.as_str()).unwrap_or("info").to_string();
        let component = entry.get("component").and_then(|v| v.as_str()).map(|s| s.to_string());
        let message = entry.get("message").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let user_id = entry.get("user_id").and_then(|v| v.as_str()).map(|s| s.to_string());
        let session_id = entry.get("session_id").and_then(|v| v.as_str()).map(|s| s.to_string());
        let metadata = entry.get("metadata").map(|v| v.to_string());

        AppLog::q()
            .insert_columns(&["id", "timestamp", "level", "component", "message", "user_id", "session_id", "metadata"])
            .value(uuid::Uuid::new_v4().to_string())
            .value(now.clone())
            .value(level)
            .value_opt_str(component)
            .value(message)
            .value_opt_str(user_id)
            .value_opt_str(session_id)
            .value_opt_str(metadata)
            .execute(state.pool.inner())
            .await?;
    }

    Ok(VilResponse::ok(BatchResponse { ok: true, count: entries.len() }))
}

#[vil_handler]
pub async fn batch_metrics(
    ctx: ServiceCtx,
    body: ShmSlice,
) -> Result<VilResponse<BatchResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let entries: Vec<serde_json::Value> = body.json()
        .map_err(|_| AppError::Validation("Invalid JSON array".into()))?;

    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    for entry in &entries {
        let metric_name = entry.get("metric_name").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let metric_value = entry.get("metric_value").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let unit = entry.get("unit").and_then(|v| v.as_str()).map(|s| s.to_string());
        let component = entry.get("component").and_then(|v| v.as_str()).map(|s| s.to_string());
        let tags = entry.get("tags").map(|v| v.to_string());

        AppMetric::q()
            .insert_columns(&["id", "timestamp", "metric_name", "metric_value", "unit", "component", "tags"])
            .value(uuid::Uuid::new_v4().to_string())
            .value(now.clone())
            .value(metric_name)
            .value(metric_value)
            .value_opt_str(unit)
            .value_opt_str(component)
            .value_opt_str(tags)
            .execute(state.pool.inner())
            .await?;
    }

    Ok(VilResponse::ok(BatchResponse { ok: true, count: entries.len() }))
}

#[derive(Debug, Deserialize)]
pub struct CreateContentReportRequest {
    pub reporter_id: Option<String>,
    pub content_type: String,
    pub content_id: String,
    pub reason: Option<String>,
    pub description: Option<String>,
}

#[vil_handler]
pub async fn create_content_report(
    ctx: ServiceCtx,
    claims: Option<Claims>,
    body: ShmSlice,
) -> Result<VilResponse<OkWithIdResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let req: CreateContentReportRequest = body.json().map_err(|_| AppError::Validation("Invalid body".into()))?;

    let id = uuid::Uuid::new_v4().to_string();
    let reporter_id = claims.map(|c| c.sub).or(req.reporter_id).unwrap_or_else(|| "guest".to_string());
    let content_type = req.content_type.clone();
    let content_id = req.content_id.clone();
    let reason = req.reason.clone();
    let description = req.description.clone();
    let status = "pending".to_string();

    ContentReport::q()
        .insert_columns(&["id", "reporter_id", "content_type", "content_id", "reason", "description", "status"])
        .value(id.clone())
        .value(reporter_id)
        .value(content_type)
        .value(content_id)
        .value_opt_str(reason)
        .value_opt_str(description)
        .value(status)
        .execute(state.pool.inner())
        .await?;

    Ok(VilResponse::created(OkWithIdResponse { ok: true, id }))
}
