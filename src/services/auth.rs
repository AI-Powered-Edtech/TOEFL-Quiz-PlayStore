use crate::error::AppError;
use crate::middleware::auth::Claims;
use crate::models::profile::*;
use crate::models::responses::*;
use crate::AppState;
use vil::prelude::*;
use vil::auth::VilPassword;

#[vil_handler]
pub async fn register(
    ctx: ServiceCtx,
    body: ShmSlice,
) -> Result<VilResponse<AuthResponse>, AppError> {
    let state = ctx.state::<AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let req: RegisterRequest = body.json().map_err(|_| AppError::Validation("Invalid JSON body".into()))?;

    if req.username.len() < 3 || req.username.len() > 50 {
        return Err(AppError::Validation("Username must be 3-50 characters".into()));
    }
    if req.password.len() < 8 {
        return Err(AppError::Validation("Password must be at least 8 characters".into()));
    }

    let id = uuid::Uuid::new_v4().to_string();
    let password_hash = VilPassword::hash(&req.password)
        .map_err(|e| AppError::Internal(format!("{e}")))?;

    Profile::q()
        .insert_columns(&["id", "username", "full_name", "password_hash", "subscription_tier", "hearts_count", "xp"])
        .value(id.clone())
        .value(req.username.clone())
        .value_opt_str(req.full_name.clone())
        .value(password_hash.clone())
        .value("free".to_string())
        .value(5_i64)
        .value(0_i64)
        .execute(state.pool.inner())
        .await?;

    let profile = Profile::find_by_id(state.pool.inner(), &id)
        .await?
        .ok_or_else(|| AppError::Internal("Profile not found after insert".into()))?;

    let access = state.jwt.sign_access(&Claims::access(&id, "user"))
        .map_err(|e| AppError::Internal(format!("{e}")))?;
    let refresh = state.jwt.sign_access(&Claims::refresh(&id, "user"))
        .map_err(|e| AppError::Internal(format!("{e}")))?;

    Ok(VilResponse::created(AuthResponse {
        ok: true,
        access_token: access,
        refresh_token: refresh,
        profile,
    }))
}

#[vil_handler]
pub async fn login(
    ctx: ServiceCtx,
    body: ShmSlice,
) -> Result<VilResponse<AuthResponse>, AppError> {
    let state = ctx.state::<AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let req: LoginRequest = body.json().map_err(|_| AppError::Validation("Invalid JSON body".into()))?;

    let profile = Profile::find_where(state.pool.inner(), "username = ?", &[&req.username])
        .await?
        .ok_or_else(|| AppError::Auth("Invalid credentials".into()))?;

    let hash_str = profile.password_hash.as_deref().unwrap_or("");
    let valid = VilPassword::verify(&req.password, hash_str)
        .unwrap_or(false);
    if !valid {
        vil::prelude::vil_log::security_log!(Warn, vil::prelude::vil_log::SecurityPayload {
            event_type: 0,
            outcome: 1,
            ..vil::prelude::vil_log::SecurityPayload::default()
        });
        return Err(AppError::Auth("Invalid credentials".into()));
    }

    vil::prelude::vil_log::security_log!(Info, vil::prelude::vil_log::SecurityPayload {
        event_type: 0,
        outcome: 0,
        ..vil::prelude::vil_log::SecurityPayload::default()
    });

    use crate::models::admin::AdminUser;
    let role = AdminUser::find_by_id(state.pool.inner(), &profile.id)
        .await?
        .map(|a| a.role)
        .unwrap_or_else(|| "user".into());

    let access = state.jwt.sign_access(&Claims::access(&profile.id, &role))
        .map_err(|e| AppError::Internal(format!("{e}")))?;
    let refresh = state.jwt.sign_access(&Claims::refresh(&profile.id, &role))
        .map_err(|e| AppError::Internal(format!("{e}")))?;

    Ok(VilResponse::ok(AuthResponse {
        ok: true,
        access_token: access,
        refresh_token: refresh,
        profile,
    }))
}

#[vil_handler]
pub async fn refresh_token(
    ctx: ServiceCtx,
    body: ShmSlice,
) -> Result<VilResponse<TokenPairResponse>, AppError> {
    let state = ctx.state::<AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let req: RefreshRequest = body.json().map_err(|_| AppError::Validation("Invalid JSON body".into()))?;

    let claims: Claims = state.jwt.verify(&req.refresh_token)
        .map_err(|e| AppError::Auth(format!("{e}")))?;
    if claims.token_type != "refresh" {
        return Err(AppError::Auth("Expected refresh token".into()));
    }

    let access = state.jwt.sign_access(&Claims::access(&claims.sub, &claims.role))
        .map_err(|e| AppError::Internal(format!("{e}")))?;

    Ok(VilResponse::ok(TokenPairResponse {
        ok: true,
        access_token: access,
    }))
}

#[vil_handler]
pub async fn get_profile(
    ctx: ServiceCtx,
    claims: Claims,
) -> Result<VilResponse<Profile>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let profile = Profile::find_by_id(state.pool.inner(), &claims.sub)
        .await?
        .ok_or_else(|| AppError::NotFound("Profile not found".into()))?;

    Ok(VilResponse::ok(profile))
}

#[vil_handler]
pub async fn update_profile(
    ctx: ServiceCtx,
    claims: Claims,
    body: ShmSlice,
) -> Result<VilResponse<Profile>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let req: UpdateProfileRequest = body.json().map_err(|_| AppError::Validation("Invalid JSON body".into()))?;

    Profile::q()
        .update()
        .set_optional("full_name", req.full_name.as_deref())
        .set_optional("bio", req.bio.as_deref())
        .set_optional("avatar_url", req.avatar_url.as_deref())
        .set_raw("updated_at", "datetime('now')")
        .where_eq("id", &claims.sub)
        .execute(state.pool.inner())
        .await?;

    let profile = Profile::find_by_id(state.pool.inner(), &claims.sub)
        .await?
        .ok_or_else(|| AppError::NotFound("Profile not found".into()))?;

    Ok(VilResponse::ok(profile))
}
