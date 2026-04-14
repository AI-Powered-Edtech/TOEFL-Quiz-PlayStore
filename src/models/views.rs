//! Database view structs — sqlx::FromRow for direct query-to-response mapping
//! These eliminate manual tuple queries + .map() patterns
use serde::{Deserialize, Serialize};
use vil::prelude::VilModel;

// ── Social views ──

#[derive(Debug, Clone, Serialize, Deserialize, VilModel, sqlx::FromRow)]
pub struct FriendRow {
    pub id: String,
    pub full_name: Option<String>,
    pub avatar_url: Option<String>,
    pub xp: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, VilModel, sqlx::FromRow)]
pub struct MessageRow {
    pub id: String,
    pub user_id: String,
    pub content: String,
    pub is_system: i32,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, VilModel, sqlx::FromRow)]
pub struct PredictionRow {
    pub id: String,
    pub prediction_type: String,
    pub predicted_value: Option<f64>,
    pub confidence: Option<f64>,
    pub is_current: i32,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, VilModel, sqlx::FromRow)]
pub struct AchievementRow {
    pub id: String,
    pub achievement_id: String,
    pub feature: Option<String>,
    pub xp_earned: i64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, VilModel, sqlx::FromRow)]
pub struct NotificationRow {
    pub id: String,
    #[sqlx(rename = "type")]
    #[serde(rename = "type")]
    pub notif_type: String,
    pub message: String,
    pub read: i32,
    pub created_at: String,
}

// ── Blog views ──

#[derive(Debug, Clone, Serialize, Deserialize, VilModel, sqlx::FromRow)]
pub struct PostListRow {
    pub id: String,
    pub skill_id: Option<String>,
    pub section: Option<String>,
    pub title: String,
    pub is_featured: i32,
    pub views_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, VilModel, sqlx::FromRow)]
pub struct PostDetailRow {
    pub id: String,
    pub section: Option<String>,
    pub title: String,
    pub content: String,
    pub status: String,
    pub views_count: i64,
}

// ── Creator views ──

#[derive(Debug, Clone, Serialize, Deserialize, VilModel, sqlx::FromRow)]
pub struct CreatorOverviewRow {
    pub id: String,
    pub display_name: String,
    pub is_verified: i32,
    pub total_earnings: f64,
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, VilModel, sqlx::FromRow)]
pub struct BiteRow {
    pub id: String,
    pub youtube_video_id: String,
    pub title: String,
    pub category: String,
    pub section: String,
    pub views_count: i64,
    pub likes_count: i64,
    pub status: String,
}

// ── Admin Monitoring views ──

#[derive(Debug, Clone, Serialize, Deserialize, VilModel, sqlx::FromRow)]
pub struct ErrorLogRow {
    pub id: String,
    pub level: String,
    pub component: Option<String>,
    pub message: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, VilModel, sqlx::FromRow)]
pub struct FlagRow {
    pub id: String,
    pub name: String,
    pub enabled: i32,
    pub rollout_percent: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, VilModel, sqlx::FromRow)]
pub struct ReportRow {
    pub id: String,
    pub reporter_id: String,
    pub content_type: String,
    pub content_id: String,
    pub reason: Option<String>,
    pub status: String,
    pub created_at: String,
}

// ── Writing views ──

#[derive(Debug, Clone, Serialize, Deserialize, VilModel, sqlx::FromRow)]
pub struct ModelEssayRow {
    pub id: String,
    pub topic: Option<String>,
    pub task_type: String,
    pub word_count: Option<i64>,
    pub band_score: Option<f64>,
    pub category: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, VilModel, sqlx::FromRow)]
pub struct VocabRow {
    pub id: String,
    pub word: String,
    pub definition: Option<String>,
    pub cefr_level: Option<String>,
    pub review_count: i64,
}
