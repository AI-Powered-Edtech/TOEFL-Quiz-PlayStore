use crate::error::AppError;
use crate::middleware::admin::{require_admin, require_super_admin};
use crate::middleware::auth::Claims;
use crate::models::admin::*;
use crate::models::responses::*;
use vil_orm::vil_args;
use vil::prelude::*;
use vil::auth::VilPassword;
use serde::{Deserialize, Serialize};

fn validate_subscription_tier(tier: &str) -> Result<(), AppError> {
    match tier {
        "free" | "basic" | "c2" => Ok(()),
        _ => Err(AppError::Validation("Invalid subscription tier".into())),
    }
}

fn validate_admin_role(role: &str) -> Result<(), AppError> {
    match role {
        "admin" | "super_admin" => Ok(()),
        _ => Err(AppError::Validation("Invalid admin role".into())),
    }
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct UserWithRole {
    pub id: String,
    pub username: Option<String>,
    pub email: Option<String>,
    pub role: String,
    pub subscription_tier: String,
}

#[vil_handler]
pub async fn list_admins(
    ctx: ServiceCtx,
    claims: Claims,
) -> Result<VilResponse<Vec<UserWithRole>>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    require_admin(&claims)?;
    
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS accounts (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            full_name TEXT,
            avatar_url TEXT,
            bio TEXT,
            password_hash TEXT,
            subscription_tier TEXT NOT NULL DEFAULT 'free',
            public_profile_id INTEGER,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )",
    )
    .execute(state.pool.inner())
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?;

    let users = sqlx::query_as::<_, UserWithRole>(r#"
        SELECT
            ac.id,
            ac.username,
            a.email,
            COALESCE(a.role, 'user') as role,
            ac.subscription_tier
        FROM accounts ac
        LEFT JOIN admin_users a ON ac.id = a.user_id
        ORDER BY ac.created_at DESC
    "#)
    .fetch_all(state.pool.inner())
    .await?;

    Ok(VilResponse::ok(users))
}

#[derive(Debug, Deserialize)]
pub struct ChangeTierRequest {
    pub tier: String,
}

#[vil_handler]
pub async fn change_tier(
    ctx: ServiceCtx,
    claims: Claims,
    Path(user_id): Path<String>,
    body: ShmSlice,
) -> Result<VilResponse<OkResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    require_super_admin(&claims)?;
    let req: ChangeTierRequest = body.json().map_err(|_| AppError::Validation("Invalid body".into()))?;
    validate_subscription_tier(&req.tier)?;

    sqlx::query("UPDATE accounts SET subscription_tier = ?, updated_at = datetime('now') WHERE id = ?")
        .bind(&req.tier)
        .bind(&user_id)
        .execute(state.pool.inner())
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    // Audit log
    let audit_id = uuid::Uuid::new_v4().to_string();
    AuditLog::insert(
        state.pool.inner(),
        &["id", "admin_id", "action", "target_type", "target_id"],
        vil_args![audit_id, claims.sub, "change_tier", "user", user_id],
    )
    .await?;

    Ok(VilResponse::ok(OkResponse { ok: true }))
}


#[vil_handler]
pub async fn assign_role(
    ctx: ServiceCtx,
    claims: Claims,
    body: ShmSlice,
) -> Result<VilResponse<OkResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    require_super_admin(&claims)?;
    let req: AssignRoleRequest = body.json().map_err(|_| AppError::Validation("Invalid body".into()))?;
    validate_admin_role(&req.role)?;
    if req.user_id == claims.sub && req.role != "super_admin" {
        return Err(AppError::Validation("Super admin cannot downgrade their own role".into()));
    }

    AdminUser::q()
        .insert_columns(&["user_id", "email", "role"])
        .value(req.user_id.clone())
        .value_opt_str(req.email.clone())
        .value(req.role.clone())
        .on_conflict("user_id")
        .do_update(&["email", "role"])
        .execute(state.pool.inner())
        .await?;

    // Audit log
    let audit_id = uuid::Uuid::new_v4().to_string();
    let admin_id = claims.sub.clone();
    let target_id = req.user_id.clone();
    AuditLog::insert(
        state.pool.inner(),
        &["id", "admin_id", "action", "target_type", "target_id"],
        vil_args![audit_id, admin_id, "assign_role", "user", target_id],
    )
    .await?;

    Ok(VilResponse::ok(OkResponse { ok: true }))
}

#[vil_handler]
pub async fn remove_role(
    ctx: ServiceCtx,
    claims: Claims,
    Path(user_id): Path<String>,
) -> Result<VilResponse<OkResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    require_super_admin(&claims)?;
    if user_id == claims.sub {
        return Err(AppError::Validation("Super admin cannot remove their own role".into()));
    }
    AdminUser::delete(state.pool.inner(), &user_id).await?;

    let audit_id = uuid::Uuid::new_v4().to_string();
    let admin_id = claims.sub.clone();
    let target_id = user_id.clone();
    AuditLog::insert(
        state.pool.inner(),
        &["id", "admin_id", "action", "target_type", "target_id"],
        vil_args![audit_id, admin_id, "remove_role", "user", target_id],
    )
    .await?;

    Ok(VilResponse::ok(OkResponse { ok: true }))
}

#[vil_handler]
pub async fn verify_pin(
    ctx: ServiceCtx,
    claims: Claims,
    body: ShmSlice,
) -> Result<VilResponse<PinVerifyResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    require_admin(&claims)?;
    let req: VerifyPinRequest = body.json().map_err(|_| AppError::Validation("Invalid body".into()))?;

    let admin = AdminUser::find_by_id(state.pool.inner(), &claims.sub)
        .await?
        .ok_or_else(|| AppError::Forbidden("Not an admin".into()))?;

    let hash_str = admin.pin_hash.as_deref().unwrap_or("");
    let valid = VilPassword::verify(&req.pin, hash_str).unwrap_or(false);

    Ok(VilResponse::ok(PinVerifyResponse { ok: true, valid }))
}

#[vil_handler]
pub async fn audit_logs(
    ctx: ServiceCtx,
    claims: Claims,
) -> Result<VilResponse<Vec<AuditLog>>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    require_admin(&claims)?;
    let logs = AuditLog::find_all(state.pool.inner()).await?;
    Ok(VilResponse::ok(logs))
}
