use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use vil_orm_derive::VilEntity;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SectionAccuracy {
    pub correct: i64,
    pub total: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, VilEntity)]
#[vil_entity(table = "user_performance_metrics")]
pub struct UserPerformanceMetrics {
    #[vil_entity(pk)]
    pub id: String,
    #[vil_entity(unique)]
    pub user_id: String,
    pub total_questions: i64,
    pub correct_answers: i64,
    pub accuracy_by_section: String, // JSON
    pub accuracy_by_skill: String,   // JSON
    pub recent_accuracy: String,     // JSON array
    pub average_response_time: f64,
    pub current_difficulty: String,
    pub last_updated: i64,
}

#[derive(Debug, Deserialize)]
pub struct RecordAnswerRequest {
    pub correct: bool,
    pub section: String,
    pub skill_id: String,
    pub response_time_ms: i64,
}

#[derive(Debug, Serialize)]
pub struct AdaptiveMetricsResponse {
    pub total_questions: i64,
    pub correct_answers: i64,
    pub accuracy_by_section: HashMap<String, SectionAccuracy>,
    pub accuracy_by_skill: HashMap<String, SectionAccuracy>,
    pub recent_accuracy: Vec<i64>,
    pub average_response_time: f64,
    pub last_updated: i64,
    pub current_difficulty: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, VilEntity)]
#[vil_entity(table = "question_bank")]
pub struct Question {
    #[vil_entity(pk)]
    pub id: String,
    pub skill_id: i64,
    pub section: String,
    pub interaction: String,
    pub stimulus: Option<String>, // JSON
    pub prompt: String,
    pub choices: Option<String>,          // JSON
    pub correct_response: Option<String>, // JSON
    pub cefr_target: Option<String>,
    pub difficulty_score: Option<i64>,
    pub passage_id: Option<String>,
    pub metadata: Option<String>, // JSON
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Passage {
    pub id: String,
    pub topic: Option<String>,
    pub content: String,
    pub source: Option<String>,
    pub difficulty: Option<String>,
    pub word_count: Option<i64>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, VilEntity)]
#[vil_entity(table = "quiz_results")]
pub struct QuizResult {
    #[vil_entity(pk)]
    pub id: String,
    pub user_id: String,
    pub date: String,
    pub skill_id: Option<String>,
    pub section: String,
    pub score: i64,
    pub correct_count: i64,
    pub total_questions: i64,
    pub xp_earned: i64,
    pub breakdown: Option<String>, // JSON
}

#[derive(Debug, Deserialize)]
pub struct SaveResultRequest {
    pub skill_id: Option<String>,
    pub section: String,
    pub score: i64,
    pub correct_count: i64,
    pub total_questions: i64,
}

#[derive(Debug, Deserialize)]
pub struct QuestionFilter {
    pub section: Option<String>,
    pub skill_id: Option<i64>,
    pub cefr: Option<String>,
    pub limit: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct QuizListParams {
    pub section: Option<String>,
    pub skill_id: Option<i64>,
    pub cefr: Option<String>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct QuizGenerateRequest {
    pub topic: String,
    pub section: String,
    pub count: Option<i64>,
    pub skill_id_override: Option<i64>,
    pub difficulty: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedQuestion {
    pub id: String,
    pub skill_id: i64,
    pub section: String,
    pub interaction: String,
    pub stimulus: Option<Value>,
    pub prompt: String,
    pub choices: Option<Vec<String>>,
    pub correct_response: Option<Vec<String>>,
    pub cefr_target: Option<String>,
    pub difficulty_score: Option<i64>,
    pub passage_id: Option<String>,
    pub metadata: Option<Value>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QuizGenerateResponse {
    pub questions: Vec<GeneratedQuestion>,
}

#[derive(Debug, Deserialize)]
pub struct QuestionCreateRequest {
    pub skill_id: i64,
    pub section: String,
    pub interaction: String,
    pub prompt: String,
    pub choices: Option<Vec<String>>,
    pub correct_response: Option<Vec<String>>,
    pub cefr_target: Option<String>,
    pub difficulty_score: Option<i64>,
    pub passage_id: Option<String>,
    pub stimulus: Option<String>,
    pub metadata: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct QuestionUpdateRequest {
    pub skill_id: Option<i64>,
    pub section: Option<String>,
    pub interaction: Option<String>,
    pub prompt: Option<String>,
    pub choices: Option<Vec<String>>,
    pub correct_response: Option<Vec<String>>,
    pub cefr_target: Option<String>,
    pub difficulty_score: Option<i64>,
    pub passage_id: Option<String>,
    pub stimulus: Option<String>,
    pub metadata: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct PassageCreateRequest {
    pub topic: Option<String>,
    pub content: String,
    pub source: Option<String>,
    pub difficulty: Option<String>,
}
