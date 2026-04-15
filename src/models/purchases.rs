use serde::{Deserialize, Serialize};
use vil::prelude::VilModel;

#[derive(Debug, Clone, Deserialize)]
pub struct VerifyPurchaseRequest {
    pub product_id: String,
    pub purchase_token: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, VilModel)]
pub struct VerifyPurchaseResponse {
    pub ok: bool,
    pub tier: String,
    pub expiry_date: Option<String>,
    pub is_active: bool,
}
