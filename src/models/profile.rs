// Request structs for auth/profile endpoints.
// NOTE: rich `Profile` VilEntity + `AuthResponse` removed in Gate-2.5 cleanup.
// The live `profiles` table is a 6-col public projection only; auth uses
// `accounts` directly via raw SQL in src/services/auth.rs (AuthProfileView).

use serde::Deserialize;

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

#[derive(Debug, Deserialize)]
pub struct UpdateProfileRequest {
    pub full_name: Option<String>,
    pub bio: Option<String>,
    pub avatar_url: Option<String>,
    pub fcm_token: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RefreshRequest {
    pub refresh_token: String,
}
