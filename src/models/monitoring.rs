use serde::{Deserialize, Serialize};
use vil_orm_derive::VilEntity;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, VilEntity)]
#[vil_entity(table = "app_logs")]
pub struct AppLog {
    #[vil_entity(pk)]
    pub id: String,
    pub timestamp: String,
    pub level: String,
    pub component: Option<String>,
    pub message: String,
    pub user_id: Option<String>,
    pub session_id: Option<String>,
    pub metadata: Option<String>,
    pub stack_trace: Option<String>,
    pub resolved: i64,
    pub resolved_at: Option<String>,
    #[vil_entity(auto_now_add)]
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, VilEntity)]
#[vil_entity(table = "app_metrics")]
pub struct AppMetric {
    #[vil_entity(pk)]
    pub id: String,
    pub timestamp: String,
    pub metric_name: String,
    pub metric_value: Option<f64>,
    pub unit: Option<String>,
    pub component: Option<String>,
    pub tags: Option<String>,
    #[vil_entity(auto_now_add)]
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, VilEntity)]
#[vil_entity(table = "feature_flags")]
pub struct FeatureFlag {
    #[vil_entity(pk)]
    pub id: String,
    pub name: String,
    pub enabled: i64,
    pub rollout_percent: i64,
    pub allowed_users: Option<String>,
    #[vil_entity(auto_now_add)]
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, VilEntity)]
#[vil_entity(table = "content_reports")]
pub struct ContentReport {
    #[vil_entity(pk)]
    pub id: String,
    pub reporter_id: String,
    pub content_type: String,
    pub content_id: String,
    pub reason: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub resolved_by: Option<String>,
    #[vil_entity(auto_now_add)]
    pub created_at: Option<String>,
}
