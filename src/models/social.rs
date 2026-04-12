use serde::{Deserialize, Serialize};
use vil_orm_derive::VilEntity;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, VilEntity)]
#[vil_entity(table = "circles")]
pub struct Circle {
    #[vil_entity(pk)]
    pub id: String,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub creator_id: String,
    pub is_public: i32,
    pub chat_mode: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, VilEntity)]
#[vil_entity(table = "friends")]
pub struct Friend {
    #[vil_entity(pk)]
    pub id: String,
    pub user_id: String,
    pub friend_id: String,
    #[vil_entity(auto_now_add)]
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct LeaderboardEntry {
    pub rank: i64,
    pub user_id: String,
    pub full_name: Option<String>,
    pub avatar_url: Option<String>,
    pub xp: i64,
}

#[derive(Debug, Deserialize)]
pub struct CreateCircleRequest {
    pub name: String,
    pub description: Option<String>,
    pub is_public: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct JoinCircleRequest {
    pub code: String,
}

#[derive(Debug, Deserialize)]
pub struct AddFriendRequest {
    pub friend_code: String,
}

#[derive(Debug, Deserialize)]
pub struct SendMessageRequest {
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, VilEntity)]
#[vil_entity(table = "circle_members")]
pub struct CircleMember {
    #[vil_entity(pk)]
    pub id: String,
    pub circle_id: String,
    pub user_id: String,
    pub role: Option<String>,
    pub joined_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, VilEntity)]
#[vil_entity(table = "circle_messages")]
pub struct CircleMessage {
    #[vil_entity(pk)]
    pub id: String,
    pub circle_id: String,
    pub user_id: String,
    pub content: String,
    pub is_system: i64,
    #[vil_entity(auto_now_add)]
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, VilEntity)]
#[vil_entity(table = "notifications")]
pub struct Notification {
    #[vil_entity(pk)]
    pub id: String,
    pub user_id: String,
    #[sqlx(rename = "type")]
    pub notif_type: String,
    pub message: String,
    pub read: i64,
    #[vil_entity(auto_now_add)]
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, VilEntity)]
#[vil_entity(table = "predictions")]
pub struct Prediction {
    #[vil_entity(pk)]
    pub id: String,
    pub user_id: String,
    pub prediction_type: String,
    pub predicted_value: Option<f64>,
    pub actual_value: Option<f64>,
    pub confidence: Option<f64>,
    pub breakdown: Option<String>,
    pub is_current: i64,
    #[vil_entity(auto_now_add)]
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, VilEntity)]
#[vil_entity(table = "user_achievements")]
pub struct UserAchievement {
    #[vil_entity(pk)]
    pub id: String,
    pub user_id: String,
    pub achievement_id: String,
    pub feature: Option<String>,
    pub xp_earned: i64,
    #[vil_entity(auto_now_add)]
    pub created_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SavePredictionRequest {
    pub prediction_type: String,
    pub predicted_value: Option<f64>,
    pub confidence: Option<f64>,
    pub breakdown: Option<String>,
}
