use serde::{Deserialize, Serialize};
use vil_orm_derive::VilEntity;
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, VilEntity)]
#[vil_entity(table = "question_bank")]
pub struct Question {
    #[vil_entity(pk)]
    pub id: String,
    pub skill_id: i64,
    pub section: String,
    pub interaction: String,
    pub stimulus: Option<String>,  // JSON
    pub prompt: String,
    pub choices: Option<String>,   // JSON
    pub correct_response: Option<String>, // JSON
    pub cefr_target: Option<String>,
    pub difficulty_score: Option<i64>,
    pub passage_id: Option<String>,
    pub metadata: Option<String>,  // JSON
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
