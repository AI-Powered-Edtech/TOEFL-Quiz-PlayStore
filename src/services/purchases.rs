use crate::error::AppError;
use crate::middleware::auth::Claims;
use crate::models::purchases::{VerifyPurchaseRequest, VerifyPurchaseResponse};
use chrono::{TimeZone, Utc};
use jsonwebtoken::{encode, Algorithm, EncodingKey, Header};
use serde::{Deserialize, Serialize};
use vil::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, VilModel)]
pub struct EntitlementResponse {
    pub ok: bool,
    pub tier: String,
    pub is_active: bool,
    pub expiry_date: Option<String>,
    pub source: String,
}

#[derive(Debug, Deserialize)]
struct GoogleServiceAccount {
    client_email: String,
    private_key: String,
    #[serde(default)]
    token_uri: Option<String>,
}

#[derive(Debug, Serialize)]
struct SaJwtClaims {
    iss: String,
    scope: String,
    aud: String,
    iat: i64,
    exp: i64,
}

#[derive(Debug, Deserialize)]
struct TokenResp {
    access_token: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SubscriptionGetResp {
    expiry_time_millis: Option<String>,
}

fn product_to_tier(product_id: &str) -> Option<&'static str> {
    match product_id {
        "basic_monthly" => Some("basic"),
        "c2_monthly" => Some("c2"),
        _ => None,
    }
}


async fn ensure_purchase_entitlements(pool: &vil::vil_db_sqlx::SqlxPool) -> Result<(), AppError> {
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS purchase_entitlements (
            user_id TEXT PRIMARY KEY,
            tier TEXT NOT NULL,
            product_id TEXT,
            purchase_token TEXT,
            expiry_date TEXT,
            is_active INTEGER NOT NULL DEFAULT 0,
            verified_at TEXT NOT NULL DEFAULT (datetime('now'))
        )",
    )
    .execute(pool.inner())
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?;
    Ok(())
}

async fn best_effort_account_tier_update(
    pool: &vil::vil_db_sqlx::SqlxPool,
    user_id: &str,
    tier: &str,
) -> Result<(), AppError> {
    sqlx::query("UPDATE accounts SET subscription_tier = ?, updated_at = datetime('now') WHERE id = ?")
        .bind(tier)
        .bind(user_id)
        .execute(pool.inner())
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;
    Ok(())
}

async fn save_entitlement(
    pool: &vil::vil_db_sqlx::SqlxPool,
    user_id: &str,
    tier: &str,
    product_id: &str,
    purchase_token: &str,
    expiry_date: Option<&str>,
) -> Result<(), AppError> {
    ensure_purchase_entitlements(pool).await?;
    sqlx::query(
        "INSERT INTO purchase_entitlements (user_id, tier, product_id, purchase_token, expiry_date, is_active, verified_at)
         VALUES (?, ?, ?, ?, ?, 1, datetime('now'))
         ON CONFLICT(user_id) DO UPDATE SET
            tier = excluded.tier,
            product_id = excluded.product_id,
            purchase_token = excluded.purchase_token,
            expiry_date = excluded.expiry_date,
            is_active = 1,
            verified_at = datetime('now')",
    )
    .bind(user_id)
    .bind(tier)
    .bind(product_id)
    .bind(purchase_token)
    .bind(expiry_date)
    .execute(pool.inner())
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?;
    Ok(())
}


async fn mark_entitlement_inactive(
    pool: &vil::vil_db_sqlx::SqlxPool,
    user_id: &str,
) -> Result<(), AppError> {
    sqlx::query("UPDATE purchase_entitlements SET is_active = 0, verified_at = datetime('now') WHERE user_id = ?")
        .bind(user_id)
        .execute(pool.inner())
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;
    let _ = best_effort_account_tier_update(pool, user_id, "free").await;
    Ok(())
}

async fn get_androidpublisher_token() -> Result<String, AppError> {
    let sa_json = std::env::var("GOOGLE_PLAY_SERVICE_ACCOUNT")
        .map_err(|_| AppError::Config("Missing GOOGLE_PLAY_SERVICE_ACCOUNT".into()))?;

    let sa: GoogleServiceAccount = serde_json::from_str(&sa_json)
        .map_err(|e| AppError::Config(format!("Invalid GOOGLE_PLAY_SERVICE_ACCOUNT JSON: {e}")))?;

    let token_uri = sa
        .token_uri
        .unwrap_or_else(|| "https://oauth2.googleapis.com/token".to_string());

    let now = Utc::now().timestamp();
    let claims = SaJwtClaims {
        iss: sa.client_email.clone(),
        scope: "https://www.googleapis.com/auth/androidpublisher".to_string(),
        aud: token_uri.clone(),
        iat: now,
        exp: now + 3600,
    };

    let mut header = Header::new(Algorithm::RS256);
    header.typ = Some("JWT".to_string());

    let key = EncodingKey::from_rsa_pem(sa.private_key.as_bytes())
        .map_err(|e| AppError::Config(format!("Invalid service account private_key PEM: {e}")))?;

    let assertion =
        encode(&header, &claims, &key).map_err(|e| AppError::Internal(format!("JWT sign: {e}")))?;

    let resp = reqwest::Client::new()
        .post(&token_uri)
        .form(&[
            ("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer"),
            ("assertion", assertion.as_str()),
        ])
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("OAuth token request: {e}")))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let txt = resp.text().await.unwrap_or_default();
        return Err(AppError::Internal(format!(
            "OAuth token not ok: {} {txt}",
            status
        )));
    }

    let tok: TokenResp = resp
        .json()
        .await
        .map_err(|e| AppError::Internal(format!("OAuth token parse: {e}")))?;

    Ok(tok.access_token)
}


async fn acknowledge_subscription(
    package_name: &str,
    product_id: &str,
    purchase_token: &str,
    access_token: &str,
) -> Result<(), AppError> {
    let url = format!(
        "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{}/purchases/subscriptions/{}/tokens/{}:acknowledge",
        urlencoding::encode(package_name),
        urlencoding::encode(product_id),
        urlencoding::encode(purchase_token),
    );

    let resp = reqwest::Client::new()
        .post(url)
        .bearer_auth(access_token)
        .json(&serde_json::json!({}))
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("Android Publisher acknowledge request: {e}")))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let txt = resp.text().await.unwrap_or_default();
        return Err(AppError::Internal(format!(
            "Purchase acknowledge not ok ({}): {txt}",
            status
        )));
    }

    Ok(())
}

#[vil_handler]
pub async fn verify(
    ctx: ServiceCtx,
    claims: Claims,
    body: ShmSlice,
) -> Result<VilResponse<VerifyPurchaseResponse>, AppError> {
    let state = ctx
        .state::<crate::AppState>()
        .map_err(|_| AppError::Internal("state".into()))?;
    let req: VerifyPurchaseRequest =
        body.json().map_err(|_| AppError::Validation("Invalid body".into()))?;

    let target_tier = product_to_tier(&req.product_id)
        .ok_or_else(|| AppError::Validation("Unknown product_id".into()))?
        .to_string();

    let package_name = std::env::var("GOOGLE_PLAY_PACKAGE_NAME")
        .map_err(|_| AppError::Config("Missing GOOGLE_PLAY_PACKAGE_NAME".into()))?;

    let access_token = get_androidpublisher_token().await?;

    let url = format!(
        "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{}/purchases/subscriptions/{}/tokens/{}",
        urlencoding::encode(&package_name),
        urlencoding::encode(&req.product_id),
        urlencoding::encode(&req.purchase_token),
    );

    let resp = reqwest::Client::new()
        .get(url)
        .bearer_auth(&access_token)
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("Android Publisher request: {e}")))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let txt = resp.text().await.unwrap_or_default();
        return Err(AppError::Validation(format!(
            "Purchase invalid ({}): {txt}",
            status
        )));
    }

    let sub: SubscriptionGetResp = resp
        .json()
        .await
        .map_err(|e| AppError::Internal(format!("Subscription parse: {e}")))?;

    let (expiry_date, is_active) = if let Some(ms) = sub.expiry_time_millis.as_deref() {
        if let Ok(ms_i64) = ms.parse::<i64>() {
            let exp = Utc.timestamp_millis_opt(ms_i64).single();
            let active = exp.map(|t| t > Utc::now()).unwrap_or(false);
            (exp.map(|t| t.to_rfc3339()), active)
        } else {
            (None, false)
        }
    } else {
        (None, false)
    };

    if !is_active {
        return Err(AppError::Validation("Subscription is not active".into()));
    }

    acknowledge_subscription(&package_name, &req.product_id, &req.purchase_token, &access_token).await?;

    save_entitlement(
        &state.pool,
        &claims.sub,
        &target_tier,
        &req.product_id,
        &req.purchase_token,
        expiry_date.as_deref(),
    )
    .await?;
    best_effort_account_tier_update(&state.pool, &claims.sub, &target_tier).await?;

    Ok(VilResponse::ok(VerifyPurchaseResponse {
        ok: true,
        tier: target_tier,
        expiry_date,
        is_active,
    }))
}


#[derive(Debug, sqlx::FromRow)]
struct EntitlementRow {
    tier: String,
    expiry_date: Option<String>,
    is_active: i64,
}

/// GET /api/purchases/entitlement — canonical server-side subscription state.
#[vil_handler]
pub async fn entitlement(
    ctx: ServiceCtx,
    claims: Claims,
) -> Result<VilResponse<EntitlementResponse>, AppError> {
    let state = ctx
        .state::<crate::AppState>()
        .map_err(|_| AppError::Internal("state".into()))?;

    ensure_purchase_entitlements(&state.pool).await?;

    let row: Option<EntitlementRow> = sqlx::query_as(
        "SELECT tier, expiry_date, is_active FROM purchase_entitlements WHERE user_id = ?",
    )
    .bind(&claims.sub)
    .fetch_optional(state.pool.inner())
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?;

    if let Some(row) = row {
        let not_expired = row
            .expiry_date
            .as_deref()
            .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
            .map(|t| t.with_timezone(&Utc) > Utc::now())
            .unwrap_or(row.is_active == 1);
        let active = row.is_active == 1 && not_expired;
        if !active && row.is_active == 1 {
            mark_entitlement_inactive(&state.pool, &claims.sub).await?;
        }
        return Ok(VilResponse::ok(EntitlementResponse {
            ok: true,
            tier: if active { row.tier } else { "free".to_string() },
            is_active: active,
            expiry_date: row.expiry_date,
            source: "purchase_entitlements".to_string(),
        }));
    }

    Ok(VilResponse::ok(EntitlementResponse {
        ok: true,
        tier: "free".to_string(),
        is_active: false,
        expiry_date: None,
        source: "default".to_string(),
    }))
}
