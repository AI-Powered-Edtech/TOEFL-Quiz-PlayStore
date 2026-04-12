use serde::{Deserialize, Serialize};
use vil_orm_derive::VilEntity;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, VilEntity)]
#[vil_entity(table = "profiles")]
pub struct Profile {
    #[vil_entity(pk)]
    pub id: String,
    #[vil_entity(unique)]
    pub username: Option<String>,
    pub full_name: Option<String>,
    pub avatar_url: Option<String>,
    pub bio: Option<String>,
    pub friend_code: Option<String>,
    pub hearts_count: i64,
    pub xp: i64,
    pub subscription_tier: String,
    pub fcm_token: Option<String>,
    #[serde(skip_serializing)]
    pub password_hash: Option<String>,
    pub peer_review_prefs: Option<String>, // JSON
    #[vil_entity(auto_now_add)]
    pub created_at: String,
    #[vil_entity(auto_now)]
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub username: String,
    pub password: String,
    pub full_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub ok: bool,
    pub access_token: String,
    pub refresh_token: String,
    pub profile: Profile,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProfileRequest {
    pub full_name: Option<String>,
    pub bio: Option<String>,
    pub avatar_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RefreshRequest {
    pub refresh_token: String,
}
