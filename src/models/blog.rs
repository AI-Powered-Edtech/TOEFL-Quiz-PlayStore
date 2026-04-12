use serde::{Deserialize, Serialize};
use vil_orm_derive::VilEntity;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, VilEntity)]
#[vil_entity(table = "blog_posts")]
pub struct BlogPost {
    #[vil_entity(pk)]
    pub id: String,
    pub skill_id: Option<String>,
    pub section: Option<String>,
    pub title: String,
    pub content: String,
    pub status: Option<String>,
    pub is_featured: i64,
    pub views_count: i64,
    #[vil_entity(auto_now_add)]
    pub created_at: Option<String>,
    #[vil_entity(auto_now)]
    pub updated_at: Option<String>,
}
