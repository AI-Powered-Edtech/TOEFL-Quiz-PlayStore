use crate::error::AppError;
use crate::middleware::auth::Claims;

/// Verify that the authenticated user has admin role.
pub fn require_admin(claims: &Claims) -> Result<(), AppError> {
    match claims.role.as_str() {
        "admin" | "super_admin" => Ok(()),
        _ => Err(AppError::Forbidden("Admin access required".into())),
    }
}

/// Verify that the authenticated user has super_admin role.
pub fn require_super_admin(claims: &Claims) -> Result<(), AppError> {
    if claims.role == "super_admin" {
        Ok(())
    } else {
        Err(AppError::Forbidden("Super admin access required".into()))
    }
}
