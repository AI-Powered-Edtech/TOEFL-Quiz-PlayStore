use crate::error::AppError;
use crate::middleware::auth::Claims;
use crate::models::profile::Profile;
use serde::{Deserialize, Serialize};
use vil::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublicProfile {
    pub id: String,
    pub full_name: Option<String>,
    pub avatar_url: Option<String>,
    pub xp: i64,
    pub friend_code: Option<String>,
}

#[vil_handler]
pub async fn get_profile_by_id(
    ctx: ServiceCtx,
    Path(user_id): Path<String>,
) -> Result<VilResponse<PublicProfile>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;

    let profile = Profile::find_by_id(state.pool.inner(), &user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Profile not found".into()))?;

    Ok(VilResponse::ok(PublicProfile {
        id: profile.id,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        xp: profile.xp,
        friend_code: profile.friend_code,
    }))
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
) -> Result<VilResponse<Profile>, AppError> {
    if claims.sub != user_id {
        return Err(AppError::Forbidden("Cannot update another user's profile".into()));
    }

    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let req: UpdateProfileByIdRequest = body.json().map_err(|_| AppError::Validation("Invalid JSON body".into()))?;

    Profile::q()
        .update()
        .set_optional("full_name", req.full_name.as_deref())
        .set_optional("bio", req.bio.as_deref())
        .set_optional("avatar_url", req.avatar_url.as_deref())
        .set_optional("friend_code", req.friend_code.as_deref())
        .set_raw("updated_at", "datetime('now')")
        .where_eq("id", &claims.sub)
        .execute(state.pool.inner())
        .await?;

    let profile = Profile::find_by_id(state.pool.inner(), &claims.sub)
        .await?
        .ok_or_else(|| AppError::NotFound("Profile not found".into()))?;

    Ok(VilResponse::ok(profile))
}

