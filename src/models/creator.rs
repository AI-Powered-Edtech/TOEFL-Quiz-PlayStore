use serde::{Deserialize, Serialize};
use vil_orm_derive::VilEntity;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, VilEntity)]
#[vil_entity(table = "creators")]
pub struct Creator {
    #[vil_entity(pk)]
    pub id: String,
    pub user_id: String,
    pub display_name: String,
    pub is_verified: bool,
    pub total_earnings: f64,
    pub payout_method: Option<String>, // JSON
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, VilEntity)]
#[vil_entity(table = "daily_bites")]
pub struct DailyBite {
    #[vil_entity(pk)]
    pub id: String,
    pub creator_id: String,
    pub youtube_video_id: String,
    pub title: String,
    pub category: String,
    pub section: Option<String>,
    pub views_count: i64,
    pub likes_count: i64,
    pub status: String,
    pub quiz_question: Option<String>,
    pub quiz_options: Option<String>, // JSON
    pub quiz_correct_index: Option<i64>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, VilEntity)]
#[vil_entity(table = "bite_interactions")]
pub struct BiteInteraction {
    #[vil_entity(pk)]
    pub id: String,
    pub bite_id: String,
    pub user_id: Option<String>,
    pub interaction_type: Option<String>,
    pub watch_duration_seconds: Option<i64>,
    pub quiz_correct: Option<i64>,
    pub progress: f64,
    pub completed: i64,
    #[vil_entity(auto_now_add)]
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, VilEntity)]
#[vil_entity(table = "transactions")]
pub struct Transaction {
    #[vil_entity(pk)]
    pub id: String,
    #[sqlx(rename = "type")]
    pub txn_type: String,
    pub order_id: Option<String>,
    pub from_user_id: Option<String>,
    pub to_creator_id: Option<String>,
    pub bite_id: Option<String>,
    pub amount: f64,
    pub platform_fee: f64,
    pub creator_amount: f64,
    pub currency: Option<String>,
    pub status: Option<String>,
    pub provider: Option<String>,
    pub metadata: Option<String>,
    pub processed_by: Option<String>,
    #[vil_entity(auto_now_add)]
    pub created_at: Option<String>,
    #[vil_entity(auto_now)]
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, VilEntity)]
#[vil_entity(table = "creator_earnings")]
pub struct CreatorEarning {
    #[vil_entity(pk)]
    pub id: String,
    pub creator_id: String,
    pub bite_id: Option<String>,
    pub transaction_id: Option<String>,
    pub amount: f64,
    pub earning_type: Option<String>,
    pub is_paid: i64,
    pub payout_request_id: Option<String>,
    #[vil_entity(auto_now_add)]
    pub created_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateBiteRequest {
    pub youtube_video_id: String,
    pub title: String,
    pub category: String,
    pub section: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct TipRequest {
    pub order_id: String,
    pub amount: f64,
}

#[derive(Debug, Deserialize)]
pub struct RegisterCreatorRequest {
    pub display_name: String,
}

#[derive(Debug, Deserialize)]
pub struct BiteFilter {
    pub status: Option<String>,
    pub limit: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct PayoutRequest {
    pub amount: f64,
    pub payout_method: Option<String>,
}
