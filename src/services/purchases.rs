use crate::error::AppError;
use crate::middleware::auth::Claims;
use crate::models::profile::Profile;
use crate::models::purchases::{VerifyPurchaseRequest, VerifyPurchaseResponse};
use chrono::{TimeZone, Utc};
use jsonwebtoken::{encode, Algorithm, EncodingKey, Header};
use serde::{Deserialize, Serialize};
use vil::prelude::*;

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
        .bearer_auth(access_token)
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

    Profile::q()
        .update()
        .set("subscription_tier", target_tier.clone())
        .where_eq("id", &claims.sub)
        .execute(state.pool.inner())
        .await?;

    Ok(VilResponse::ok(VerifyPurchaseResponse {
        ok: true,
        tier: target_tier,
        expiry_date,
        is_active,
    }))
}
