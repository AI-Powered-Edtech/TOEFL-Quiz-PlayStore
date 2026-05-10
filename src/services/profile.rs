use crate::error::AppError;
use crate::middleware::auth::Claims;
use crate::services::account_profile::{get_account_public_profile, get_or_create_friend_code, get_public_profile_by_public_id};
use serde::{Deserialize, Serialize};
use vil::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublicProfile {
    pub id: String,
    pub username: Option<String>,
    pub full_name: Option<String>,
    pub avatar_url: Option<String>,
    pub xp: i64,
    pub total_xp: i64,
    pub current_streak: i64,
    pub is_public: bool,
    pub friend_code: Option<String>,
    pub bio: Option<String>,
}

fn display_name(full_name: Option<String>, username: Option<String>) -> Option<String> {
    full_name.or(username)
}

async fn load_public_profile_response(
    pool: &vil::vil_db_sqlx::SqlxPool,
    user_id: &str,
) -> Result<PublicProfile, AppError> {
    let row = match get_account_public_profile(pool, user_id).await? {
        Some(row) => Some(row),
        None => match user_id.parse::<i64>() {
            Ok(public_id) => get_public_profile_by_public_id(pool, public_id).await?,
            Err(_) => None,
        },
    }
    .ok_or_else(|| AppError::NotFound("Profile not found".into()))?;

    if row.is_public == 0 {
        return Err(AppError::NotFound("Profile not found".into()));
    }

    let friend_code = get_or_create_friend_code(pool, &row.account_id).await.ok();
    let username = Some(row.username.clone());
    Ok(PublicProfile {
        id: row.account_id,
        username: username.clone(),
        full_name: display_name(row.full_name, username),
        avatar_url: row.avatar_url,
        xp: row.total_xp,
        total_xp: row.total_xp,
        current_streak: row.current_streak,
        is_public: row.is_public != 0,
        friend_code,
        bio: row.bio,
    })
}

#[vil_handler]
pub async fn get_profile_by_id(
    ctx: ServiceCtx,
    Path(user_id): Path<String>,
) -> Result<VilResponse<PublicProfile>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    Ok(VilResponse::ok(load_public_profile_response(&state.pool, &user_id).await?))
}

#[derive(Debug, Deserialize)]
pub struct UpdateProfileByIdRequest {
    pub full_name: Option<String>,
    pub bio: Option<String>,
    pub avatar_url: Option<String>,
    pub friend_code: Option<String>,
}

#[vil_handler]
pub async fn update_profile_by_id(
    ctx: ServiceCtx,
    claims: Claims,
    Path(user_id): Path<String>,
    body: ShmSlice,
) -> Result<VilResponse<PublicProfile>, AppError> {
    if claims.sub != user_id {
        return Err(AppError::Forbidden("Cannot update another user's profile".into()));
    }

    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let req: UpdateProfileByIdRequest = body.json().map_err(|_| AppError::Validation("Invalid JSON body".into()))?;

    sqlx::query("UPDATE accounts SET full_name = COALESCE(?, full_name), bio = COALESCE(?, bio), avatar_url = COALESCE(?, avatar_url), updated_at = datetime('now') WHERE id = ?")
        .bind(&req.full_name)
        .bind(&req.bio)
        .bind(&req.avatar_url)
        .bind(&claims.sub)
        .execute(state.pool.inner())
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    if let Some(avatar_url) = &req.avatar_url {
        sqlx::query("UPDATE profiles SET avatar_url = ? WHERE id = (SELECT public_profile_id FROM accounts WHERE id = ?)")
            .bind(avatar_url)
            .bind(&claims.sub)
            .execute(state.pool.inner())
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
    }
    let _ = req.friend_code;

    Ok(VilResponse::ok(load_public_profile_response(&state.pool, &claims.sub).await?))
}
