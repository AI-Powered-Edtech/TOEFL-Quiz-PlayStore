use serde::Serialize;
use vil_server::axum::http::StatusCode;
use vil_server::axum::response::{IntoResponse, Json, Response};

#[derive(Debug)]
pub enum AppError {
    Auth(String),
    Forbidden(String),
    NotFound(String),
    Validation(String),
    RateLimited { retry_after_secs: u64 },
    TokenLimitReached,
    AiUnavailable(String),
    Config(String),
    Internal(String),
}

#[derive(Serialize)]
struct ErrorBody {
    ok: bool,
    error: ErrorDetail,
}

#[derive(Serialize)]
struct ErrorDetail {
    code: &'static str,
    message: String,
}

impl AppError {
    fn code(&self) -> &'static str {
        match self {
            Self::Auth(_) => "AUTH_REQUIRED",
            Self::Forbidden(_) => "FORBIDDEN",
            Self::NotFound(_) => "NOT_FOUND",
            Self::Validation(_) => "VALIDATION_ERROR",
            Self::RateLimited { .. } => "RATE_LIMITED",
            Self::TokenLimitReached => "TOKEN_LIMIT_REACHED",
            Self::AiUnavailable(_) => "AI_UNAVAILABLE",
            Self::Config(_) => "CONFIG_ERROR",
            Self::Internal(_) => "INTERNAL_ERROR",
        }
    }

    fn status_code(&self) -> StatusCode {
        match self {
            Self::Auth(_) => StatusCode::UNAUTHORIZED,
            Self::Forbidden(_) => StatusCode::FORBIDDEN,
            Self::NotFound(_) => StatusCode::NOT_FOUND,
            Self::Validation(_) => StatusCode::UNPROCESSABLE_ENTITY,
            Self::RateLimited { .. } | Self::TokenLimitReached => StatusCode::TOO_MANY_REQUESTS,
            Self::AiUnavailable(_) => StatusCode::SERVICE_UNAVAILABLE,
            Self::Config(_) => StatusCode::BAD_REQUEST,
            Self::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    fn message(&self) -> String {
        match self {
            Self::Auth(m) | Self::Forbidden(m) | Self::NotFound(m) | Self::Validation(m) | Self::Config(m) => {
                m.clone()
            }
            Self::RateLimited { retry_after_secs } => {
                format!("Rate limited. Retry after {retry_after_secs}s")
            }
            Self::TokenLimitReached => "Daily AI token limit reached. Upgrade your plan.".into(),
            Self::AiUnavailable(_) => "AI service temporarily unavailable".into(),
            Self::Internal(_) => "An internal error occurred".into(),
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = self.status_code();
        let body = ErrorBody {
            ok: false,
            error: ErrorDetail {
                code: self.code(),
                message: self.message(),
            },
        };

        (status, Json(body)).into_response()
    }
}

impl From<sqlx::Error> for AppError {
    fn from(e: sqlx::Error) -> Self {
        vil::prelude::vil_log::db_log!(Error, vil::prelude::vil_log::DbPayload {
            error_code: 1,
            ..vil::prelude::vil_log::DbPayload::default()
        });
        Self::Internal(e.to_string())
    }
}

// VIL Way: Convert AppError → VilError for #[vil_handler] compatibility
impl From<AppError> for vil::prelude::VilError {
    fn from(e: AppError) -> Self {
        match e {
            AppError::Auth(m) => vil::prelude::VilError::unauthorized(m),
            AppError::Forbidden(m) => vil::prelude::VilError::forbidden(m),
            AppError::NotFound(m) => vil::prelude::VilError::not_found(m),
            AppError::Validation(m) => vil::prelude::VilError::validation(m),
            AppError::RateLimited { retry_after_secs } => {
                vil::prelude::VilError::bad_request(format!("Rate limited. Retry after {retry_after_secs}s"))
            }
            AppError::TokenLimitReached => {
                vil::prelude::VilError::bad_request("Daily AI token limit reached")
            }
            AppError::AiUnavailable(_) => {
                vil::prelude::VilError::internal("AI service temporarily unavailable")
            }
            AppError::Config(m) => {
                vil::prelude::VilError::bad_request(m)
            }
            AppError::Internal(_) => {
                vil::prelude::VilError::internal("An internal error occurred")
            }
        }
    }
}
