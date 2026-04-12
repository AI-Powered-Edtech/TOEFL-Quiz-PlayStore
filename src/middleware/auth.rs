use crate::error::AppError;
use serde::{Deserialize, Serialize};
use vil_server::axum::extract::FromRequestParts;
use vil_server::axum::http::request::Parts;

/// JWT claims — sub, role, token_type.
/// exp/iat are auto-managed by VilJwt (sign adds them, verify checks them).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,       // user_id
    pub role: String,      // "user" | "admin" | "super_admin"
    pub token_type: String, // "access" | "refresh"
}

impl Claims {
    pub fn access(user_id: &str, role: &str) -> Self {
        Self {
            sub: user_id.to_string(),
            role: role.to_string(),
            token_type: "access".to_string(),
        }
    }

    pub fn refresh(user_id: &str, role: &str) -> Self {
        Self {
            sub: user_id.to_string(),
            role: role.to_string(),
            token_type: "refresh".to_string(),
        }
    }
}

/// Extract Claims from Authorization: Bearer <token> header.
/// Uses AppState.jwt (VilJwt) for token verification.
#[async_trait::async_trait]
impl<S> FromRequestParts<S> for Claims
where
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        _state: &S,
    ) -> Result<Self, Self::Rejection> {
        let auth_header = parts
            .headers
            .get("authorization")
            .and_then(|v| v.to_str().ok())
            .ok_or_else(|| AppError::Auth("Missing Authorization header".into()))?;

        let token = auth_header
            .strip_prefix("Bearer ")
            .ok_or_else(|| AppError::Auth("Invalid Authorization format".into()))?;

        // Get AppState from extensions (auto-injected by .state() as Arc<T>)
        let state = parts
            .extensions
            .get::<std::sync::Arc<crate::AppState>>()
            .ok_or_else(|| AppError::Internal("Missing app state".into()))?;

        // Use VilJwt from AppState for verification
        let claims: Claims = state.jwt.verify(token)
            .map_err(|e| AppError::Auth(format!("{e}")))?;

        if claims.token_type != "access" {
            return Err(AppError::Auth("Expected access token".into()));
        }

        Ok(claims)
    }
}
