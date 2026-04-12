use serde::{Deserialize, Serialize};
use vil_orm_derive::VilEntity;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, VilEntity)]
#[vil_entity(table = "ai_token_usage")]
pub struct AiTokenUsage {
    #[vil_entity(pk)]
    pub id: String,
    pub user_id: String,
    pub date: String,
    pub tokens_used: i64,
    pub tokens_limit: i64,
    pub feature: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct GenerateRequest {
    pub messages: Vec<ChatMessage>,
    pub model: Option<String>,
    pub temperature: Option<f64>,
    pub max_tokens: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Deserialize)]
pub struct TtsRequest {
    pub input: String,
    pub voice: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct TokenUsage {
    pub id: String,
    pub user_id: String,
    pub date: String,
    pub tokens_used: i64,
    pub tokens_limit: i64,
    pub feature: Option<String>,
}

pub const ALLOWED_MODELS: &[&str] = &[
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
    "llama-4-scout-17b-16e-instruct",
    "gemma2-9b-it",
    "mixtral-8x7b-32768",
    "qwen/qwen3-32b",
];

pub const TOKEN_LIMITS: &[(& str, i64)] = &[
    ("free", 15),
    ("basic", 500),
    ("c2", 5000),
];

pub fn get_token_limit(tier: &str) -> i64 {
    TOKEN_LIMITS
        .iter()
        .find(|(t, _)| *t == tier)
        .map(|(_, l)| *l)
        .unwrap_or(15)
}
