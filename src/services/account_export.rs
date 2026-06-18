use crate::error::AppError;
use crate::middleware::auth::Claims;
use crate::models::profile::Profile;
use crate::models::quiz::QuizResult;
use crate::models::social::{Notification, UserAchievement};
use crate::models::writing::{
    CollectedVocabulary, PeerReviewSubmission, WritingSession, WritingSubmission,
};
use serde::{Deserialize, Serialize};
use vil::prelude::*;

const EXPORT_ROW_LIMIT: &str = "10000";

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
struct CefrResultRow {
    id: String,
    user_id: String,
    test_set_id: Option<String>,
    cefr_level: String,
    overall_score: i64,
    reading_score: Option<i64>,
    listening_score: Option<i64>,
    writing_score: Option<i64>,
    speaking_score: Option<i64>,
    feedback: Option<String>,
    created_at: Option<String>,
}

#[vil_handler]
pub async fn export_account(
    ctx: ServiceCtx,
    claims: Claims,
) -> Result<VilResponse<serde_json::Value>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let pool = state.pool.inner();
    let uid = &claims.sub;

    let profile = Profile::find_by_id(pool, uid)
        .await?
        .ok_or_else(|| AppError::NotFound("Profile not found".into()))?;

    let quiz_results: Vec<QuizResult> = QuizResult::find_all_where(
        pool,
        &format!("user_id = ? ORDER BY date DESC LIMIT {EXPORT_ROW_LIMIT}"),
        &[uid],
    )
    .await?;

    let writing_submissions: Vec<WritingSubmission> = WritingSubmission::find_all_where(
        pool,
        &format!("user_id = ? ORDER BY created_at DESC LIMIT {EXPORT_ROW_LIMIT}"),
        &[uid],
    )
    .await?;

    let writing_sessions: Vec<WritingSession> = WritingSession::find_all_where(
        pool,
        &format!("user_id = ? ORDER BY updated_at DESC LIMIT {EXPORT_ROW_LIMIT}"),
        &[uid],
    )
    .await?;

    let collected_vocabulary: Vec<CollectedVocabulary> = CollectedVocabulary::find_all_where(
        pool,
        &format!("user_id = ? ORDER BY collected_at DESC LIMIT {EXPORT_ROW_LIMIT}"),
        &[uid],
    )
    .await?;

    let peer_review_submissions: Vec<PeerReviewSubmission> = PeerReviewSubmission::find_all_where(
        pool,
        &format!("user_id = ? ORDER BY created_at DESC LIMIT {EXPORT_ROW_LIMIT}"),
        &[uid],
    )
    .await?;

    let notifications: Vec<Notification> = Notification::find_all_where(
        pool,
        &format!("user_id = ? ORDER BY created_at DESC LIMIT {EXPORT_ROW_LIMIT}"),
        &[uid],
    )
    .await?;

    let cefr_results: Vec<CefrResultRow> = sqlx::query_as::<_, CefrResultRow>(
        &format!(
            "SELECT id, user_id, test_set_id, cefr_level, overall_score, reading_score, \
             listening_score, writing_score, speaking_score, feedback, created_at \
             FROM cefr_results WHERE user_id = ? ORDER BY created_at DESC LIMIT {EXPORT_ROW_LIMIT}"
        ),
    )
    .bind(uid)
    .fetch_all(pool)
    .await?;

    let user_achievements: Vec<UserAchievement> = UserAchievement::find_all_where(
        pool,
        &format!("user_id = ? ORDER BY created_at DESC LIMIT {EXPORT_ROW_LIMIT}"),
        &[uid],
    )
    .await?;

    let exported_at = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    let body = serde_json::json!({
        "exported_at": exported_at,
        "profile": profile,
        "quiz_results": quiz_results,
        "writing_submissions": writing_submissions,
        "writing_sessions": writing_sessions,
        "collected_vocabulary": collected_vocabulary,
        "peer_review_submissions": peer_review_submissions,
        "notifications": notifications,
        "cefr_results": cefr_results,
        "user_achievements": user_achievements,
    });

    Ok(VilResponse::ok(body))
}
