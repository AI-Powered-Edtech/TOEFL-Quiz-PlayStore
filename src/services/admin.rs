use crate::error::AppError;
use crate::middleware::admin::{require_admin, require_super_admin};
use crate::middleware::auth::Claims;
use crate::models::admin::*;
use crate::models::responses::*;
use vil_orm::vil_args;
use vil_server::prelude::*;
use vil_server_auth::VilPassword;

#[vil_handler]
pub async fn list_admins(
    ctx: ServiceCtx,
    claims: Claims,
) -> Result<VilResponse<Vec<AdminUser>>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    require_admin(&claims)?;
    let admins = AdminUser::find_all(state.pool.inner()).await?;
    Ok(VilResponse::ok(admins))
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

    AdminUser::q()
        .insert_columns(&["user_id", "email", "role"])
        .value(req.user_id.clone())
        .value_opt_str(req.email.clone())
        .value("admin".to_string())
        .on_conflict("user_id")
        .do_update(&["email"])
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
