use serde::{Deserialize, Serialize};
use vil_orm_derive::VilEntity;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, VilEntity)]
#[vil_entity(table = "admin_users")]
pub struct AdminUser {
    #[vil_entity(pk)]
    pub user_id: String,
    pub email: Option<String>,
    pub role: String,
    pub pin_hash: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, VilEntity)]
#[vil_entity(table = "admin_audit_logs")]
pub struct AuditLog {
    #[vil_entity(pk)]
    pub id: String,
    pub admin_id: String,
    pub action: String,
    pub target_type: Option<String>,
    pub target_id: Option<String>,
    pub metadata: Option<String>, // JSON
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct AssignRoleRequest {
    pub user_id: String,
    pub email: Option<String>,
    pub role: String,
}

#[derive(Debug, Deserialize)]
pub struct VerifyPinRequest {
    pub pin: String,
}
