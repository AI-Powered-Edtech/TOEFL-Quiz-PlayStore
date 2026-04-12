use crate::error::AppError;
use crate::models::monitoring::*;
use crate::models::responses::*;
use vil_server::prelude::*;

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
