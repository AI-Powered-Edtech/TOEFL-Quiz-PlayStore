use serde::{Deserialize, Serialize};
use vil_orm_derive::VilEntity;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, VilEntity)]
#[vil_entity(table = "writing_gym_progress")]
pub struct WritingGymProgress {
    #[vil_entity(pk)]
    pub id: String,
    pub user_id: String,
    pub level: String,
    pub skill_id: Option<String>,
    pub exercises_completed: i64,
    pub exercises_total: Option<i64>,
    pub stars_earned: i64,
    pub history: Option<String>, // JSON
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, VilEntity)]
#[vil_entity(table = "writing_sessions")]
pub struct WritingSession {
    #[vil_entity(pk)]
    pub id: String,
    pub user_id: String,
    pub level: String,
    pub skill_id: Option<String>,
    pub session_state: Option<String>, // JSON
    pub best_score: Option<i64>,
    pub status: String,
    pub expires_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, VilEntity)]
#[vil_entity(table = "peer_review_submissions")]
pub struct PeerReviewSubmission {
    #[vil_entity(pk)]
    pub id: String,
    pub user_id: String,
    pub essay_content: String,
    pub prompt: Option<String>,
    pub task_type: Option<String>,
    pub word_count: Option<i64>,
    pub is_anonymous: i32,
    pub status: String,
    pub claimed_by: Option<String>,
    pub claimed_at: Option<String>,
    pub difficulty_level: Option<String>,
    pub moderation_status: Option<String>,
    pub report_count: Option<i64>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, VilEntity)]
#[vil_entity(table = "peer_reviews")]
pub struct PeerReview {
    #[vil_entity(pk)]
    pub id: String,
    pub submission_id: String,
    pub reviewer_id: String,
    pub task_response_score: Option<i64>,
    pub coherence_score: Option<i64>,
    pub lexical_score: Option<i64>,
    pub grammar_score: Option<i64>,
    pub overall_band: Option<f64>,
    pub strengths: Option<String>,
    pub weaknesses: Option<String>,
    pub suggestions: Option<String>,
    pub inline_corrections: Option<String>,
    pub time_spent_seconds: Option<i64>,
    pub helpfulness_rating: Option<i64>,
    #[vil_entity(auto_now_add)]
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, VilEntity)]
#[vil_entity(table = "writing_submissions")]
pub struct WritingSubmission {
    #[vil_entity(pk)]
    pub id: String,
    pub user_id: String,
    pub task_type: String,
    pub prompt: Option<String>,
    pub reading_passage: Option<String>,
    pub user_essay: String,
    pub word_count: Option<i64>,
    pub ai_score: Option<i64>,
    pub ai_feedback: Option<String>,
    pub breakdown: Option<String>,
    pub time_spent_seconds: Option<i64>,
    #[vil_entity(auto_now_add)]
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, VilEntity)]
#[vil_entity(table = "model_essays")]
pub struct ModelEssay {
    #[vil_entity(pk)]
    pub id: String,
    pub topic: Option<String>,
    pub task_type: String,
    pub content: String,
    pub word_count: Option<i64>,
    pub band_score: Option<f64>,
    pub breakdown: Option<String>,
    pub annotations: Option<String>,
    pub highlights: Option<String>,
    pub category: Option<String>,
    pub source: Option<String>,
    pub views_count: i64,
    pub saves_count: i64,
    #[vil_entity(auto_now_add)]
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, VilEntity)]
#[vil_entity(table = "collected_vocabulary")]
pub struct CollectedVocabulary {
    #[vil_entity(pk)]
    pub id: String,
    pub user_id: String,
    pub word: String,
    pub definition: Option<String>,
    pub cefr_level: Option<String>,
    pub example_sentence: Option<String>,
    pub source_essay_id: Option<String>,
    pub review_count: i64,
    pub next_review_at: Option<String>,
    pub collected_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, VilEntity)]
#[vil_entity(table = "devils_advocate_sessions")]
pub struct DevilsAdvocateSession {
    #[vil_entity(pk)]
    pub id: String,
    pub user_id: String,
    pub user_argument: Option<String>,
    pub detected_claim: Option<String>,
    pub counter_point: Option<String>,
    pub score: Option<i64>,
    pub feedback: Option<String>,
    pub time_spent_seconds: Option<i64>,
    #[vil_entity(auto_now_add)]
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, VilEntity)]
#[vil_entity(table = "exercise_pool")]
pub struct ExercisePoolItem {
    #[vil_entity(pk)]
    pub id: String,
    pub level: String,
    pub skill_id: String,
    pub difficulty: Option<String>,
    pub exercise_data: String,
    #[vil_entity(auto_now_add)]
    pub created_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SubmitEssayRequest {
    pub essay_content: String,
    pub prompt: Option<String>,
    pub task_type: String,
    pub is_anonymous: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct SubmitReviewRequest {
    pub submission_id: String,
    pub task_response_score: i64,
    pub coherence_score: i64,
    pub lexical_score: i64,
    pub grammar_score: i64,
    pub strengths: Option<String>,
    pub weaknesses: Option<String>,
    pub suggestions: Option<String>,
    pub inline_corrections: Option<String>,
    pub time_spent_seconds: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct SaveProgressRequest {
    pub level: String,
    pub skill_id: Option<String>,
    pub exercises_completed: i64,
    pub stars_earned: i64,
    pub history: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SessionFilter {
    pub level: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SaveSessionRequest {
    pub id: Option<String>,
    pub level: String,
    pub skill_id: Option<String>,
    pub session_state: Option<String>,
    pub best_score: Option<i64>,
    pub status: Option<String>,
    pub expires_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ExerciseRequest {
    pub level: String,
    pub skill_id: String,
}

#[derive(Debug, Deserialize)]
pub struct EvaluateEssayRequest {
    pub essay: String,
    pub task_type: String,
    pub prompt: Option<String>,
    pub time_spent_seconds: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct ModelEssayFilter {
    pub task_type: Option<String>,
    pub limit: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct AddVocabRequest {
    pub word: String,
    pub definition: Option<String>,
    pub cefr_level: Option<String>,
    pub example_sentence: Option<String>,
    pub source_essay_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct DevilsAdvocateRequest {
    pub user_argument: String,
    pub time_spent_seconds: Option<i64>,
}
