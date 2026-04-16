//! Typed response models — replace all serde_json::json!() with VilModel structs
use serde::{Deserialize, Serialize};
use vil::prelude::VilModel;

// ── Generic ──

#[derive(Clone, Serialize, Deserialize, VilModel)]
pub struct OkResponse {
    pub ok: bool,
}

#[derive(Clone, Serialize, Deserialize, VilModel)]
pub struct OkWithIdResponse {
    pub ok: bool,
    pub id: String,
}

// ── AI Chat Response (OpenAI-compatible) ──

#[derive(Clone, Serialize, Deserialize, VilModel)]
pub struct AiChatResponse {
    pub choices: Vec<AiChoice>,
    pub model: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub usage: Option<AiUsage>,
}

#[derive(Clone, Serialize, Deserialize, VilModel)]
pub struct AiChoice {
    pub message: AiMessage,
}

#[derive(Clone, Serialize, Deserialize, VilModel)]
pub struct AiMessage {
    pub role: String,
    pub content: String,
}

#[derive(Clone, Serialize, Deserialize, VilModel)]
pub struct AiUsage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

// ── Auth ──

#[derive(Clone, Serialize, Deserialize, VilModel)]
pub struct TokenPairResponse {
    pub ok: bool,
    pub access_token: String,
}

#[derive(Clone, Serialize, Deserialize, VilModel)]
pub struct SaveResultResponse {
    pub ok: bool,
    pub id: String,
    pub xp_earned: i64,
    pub next_difficulty_level: Option<String>,
}

// ── Quiz ──

#[derive(Clone, Serialize, Deserialize, VilModel)]
pub struct ProgressResponse {
    pub total_quizzes: i64,
    pub total_correct: i64,
    pub total_xp: i64,
    pub unique_skills: i64,
    pub level: i64,
}

// ── AI ──

#[derive(Clone, Serialize, Deserialize, VilModel)]
pub struct TokenUsageResponse {
    pub used: i64,
    pub limit: i64,
    pub remaining: i64,
    pub tier: String,
    pub date: String,
}

// ── Writing ──

#[derive(Clone, Serialize, Deserialize, VilModel)]
pub struct ExerciseResponse {
    pub source: String,
    pub exercise: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

#[derive(Clone, Serialize, Deserialize, VilModel)]
pub struct EvaluateResponse {
    pub id: String,
    pub word_count: usize,
    pub feedback: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub validation_result: Option<serde_json::Value>,
}

#[derive(Clone, Serialize, Deserialize, VilModel)]
pub struct VocabListResponse {
    pub words: Vec<crate::models::views::VocabRow>,
    pub count: usize,
}

#[derive(Clone, Serialize, Deserialize, VilModel)]
pub struct VocabItem {
    pub id: String,
    pub word: String,
    pub definition: Option<String>,
    pub cefr_level: Option<String>,
    pub review_count: i64,
}

#[derive(Clone, Serialize, Deserialize, VilModel)]
pub struct DevilsAdvocateResponse {
    pub id: String,
    pub ai_response: Option<serde_json::Value>,
}

#[derive(Clone, Serialize, Deserialize, VilModel)]
pub struct ReviewResponse {
    pub ok: bool,
    pub id: String,
    pub overall_band: f64,
}

// ── Social ──

#[derive(Clone, Serialize, Deserialize, VilModel)]
pub struct CircleJoinResponse {
    pub ok: bool,
    pub circle_id: String,
}

#[derive(Clone, Serialize, Deserialize, VilModel)]
pub struct MessageCreatedResponse {
    pub ok: bool,
    pub id: String,
}

#[derive(Clone, Serialize, Deserialize, VilModel)]
pub struct MessageView {
    pub id: String,
    pub user_id: String,
    pub content: String,
    pub is_system: bool,
    pub created_at: String,
}

#[derive(Clone, Serialize, Deserialize, VilModel)]
pub struct PredictionView {
    pub id: String,
    #[serde(rename = "type")]
    pub prediction_type: String,
    pub predicted_value: Option<f64>,
    pub confidence: Option<f64>,
    pub is_current: bool,
    pub created_at: String,
}

#[derive(Clone, Serialize, Deserialize, VilModel)]
pub struct AchievementView {
    pub id: String,
    pub achievement_id: String,
    pub feature: Option<String>,
    pub xp_earned: i64,
    pub created_at: String,
}

#[derive(Clone, Serialize, Deserialize, VilModel)]
pub struct NotificationView {
    pub id: String,
    #[serde(rename = "type")]
    pub notif_type: String,
    pub message: String,
    pub read: bool,
    pub created_at: String,
}

#[derive(Clone, Serialize, Deserialize, VilModel)]
pub struct FriendView {
    pub id: String,
    pub full_name: Option<String>,
    pub avatar_url: Option<String>,
    pub xp: i64,
}

// ── Creator ──

#[derive(Clone, Serialize, Deserialize, VilModel)]
pub struct CreatorRegResponse {
    pub ok: bool,
    pub creator_id: String,
    pub status: String,
}

#[derive(Clone, Serialize, Deserialize, VilModel)]
pub struct CreatorProfileResponse {
    pub id: String,
    pub display_name: String,
    pub is_verified: bool,
    pub total_earnings: f64,
    pub status: String,
    pub created_at: String,
}

#[derive(Clone, Serialize, Deserialize, VilModel)]
pub struct BiteListItem {
    pub id: String,
    pub youtube_video_id: String,
    pub title: String,
    pub category: String,
    pub section: String,
    pub views_count: i64,
    pub likes_count: i64,
    pub status: String,
}

#[derive(Clone, Serialize, Deserialize, VilModel)]
pub struct TipResponse {
    pub ok: bool,
    pub transaction_id: String,
    pub amount: f64,
    pub platform_fee: f64,
    pub creator_amount: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duplicate: Option<bool>,
}

#[derive(Clone, Serialize, Deserialize, VilModel)]
pub struct PayoutResponse {
    pub ok: bool,
    pub payout_id: String,
    pub amount: f64,
    pub status: String,
}

#[derive(Clone, Serialize, Deserialize, VilModel)]
pub struct CreatorStatsResponse {
    pub total_views: i64,
    pub total_earnings: f64,
    pub pending_earnings: f64,
    pub total_bites: i64,
}

// ── Storage ──

#[derive(Clone, Serialize, Deserialize, VilModel)]
pub struct UploadResponse {
    pub ok: bool,
    pub url: String,
    pub size: usize,
}

// ── Blog ──

#[derive(Clone, Serialize, Deserialize, VilModel)]
pub struct PostListItem {
    pub id: String,
    pub skill_id: Option<String>,
    pub section: Option<String>,
    pub title: String,
    pub is_featured: bool,
    pub views_count: i64,
}

#[derive(Clone, Serialize, Deserialize, VilModel)]
pub struct PostDetailResponse {
    pub id: String,
    pub section: Option<String>,
    pub title: String,
    pub content: String,
    pub status: String,
    pub views_count: i64,
}

// ── Admin Monitoring ──

#[derive(Clone, Serialize, Deserialize, VilModel)]
pub struct SystemHealthResponse {
    pub errors_last_hour: i64,
    pub warnings_last_hour: i64,
    pub total_users: i64,
    pub active_users_24h: i64,
}

#[derive(Clone, Serialize, Deserialize, VilModel)]
pub struct ErrorLogView {
    pub id: String,
    pub level: String,
    pub component: Option<String>,
    pub message: String,
    pub created_at: String,
}

#[derive(Clone, Serialize, Deserialize, VilModel)]
pub struct FlagView {
    pub id: String,
    pub name: String,
    pub enabled: bool,
    pub rollout_percent: i64,
}

#[derive(Clone, Serialize, Deserialize, VilModel)]
pub struct ReportView {
    pub id: String,
    pub reporter_id: String,
    pub content_type: String,
    pub content_id: String,
    pub reason: Option<String>,
    pub status: String,
    pub created_at: String,
}

// ── Monitoring ──

#[derive(Clone, Serialize, Deserialize, VilModel)]
pub struct BatchResponse {
    pub ok: bool,
    pub count: usize,
}

// ── PIN Verify ──

#[derive(Clone, Serialize, Deserialize, VilModel)]
pub struct PinVerifyResponse {
    pub ok: bool,
    pub valid: bool,
}
