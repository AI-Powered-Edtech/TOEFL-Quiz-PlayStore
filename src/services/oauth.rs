use crate::error::AppError;
use crate::middleware::auth::Claims;
use crate::models::oauth::*;
use crate::models::profile::*;
use crate::AppState;
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use std::time::{SystemTime, UNIX_EPOCH};
use vil_server::prelude::*;
use vil_server_auth::VilPassword;

const STATE_EXPIRY_SECS: i64 = 600;
const PKCE_LENGTH: usize = 32;

fn generate_random_string(length: usize) -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    let chars: Vec<char> = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        .chars()
        .collect();
    (0..length)
        .map(|_| chars[rng.gen_range(0..chars.len())])
        .collect()
}

fn generate_pkce_challenge(verifier: &str) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let mut hasher = DefaultHasher::new();
    verifier.hash(&mut hasher);
    let hash = hasher.finish();
    let mut bytes = hash.to_le_bytes().to_vec();
    while bytes.len() < 32 {
        bytes.push(bytes.len() as u8);
    }
    URL_SAFE_NO_PAD.encode(&bytes[..32])
}

fn generate_pkce_verifier() -> String {
    generate_random_string(PKCE_LENGTH)
}

#[vil_handler]
pub async fn init_oauth(
    ctx: ServiceCtx,
    body: ShmSlice,
) -> Result<VilResponse<OAuthInitResponse>, AppError> {
    let state = ctx.state::<AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let req: OAuthInitRequest = body.json().map_err(|_| AppError::Validation("Invalid JSON".into()))?;

    if state.config.google_oauth_client_id.is_empty() {
        return Err(AppError::Config("Google OAuth not configured".into()));
    }

    let code_verifier = generate_pkce_verifier();
    let code_challenge = generate_pkce_challenge(&code_verifier);
    let state_token = generate_random_string(32);

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    let state_data = OAuthStateData {
        code_verifier,
        created_at: now,
    };

    let mut oauth_store = state.oauth_state.write().await;
    oauth_store.set(&state_token, state_data);
    oauth_store.cleanup_expired(STATE_EXPIRY_SECS);

    let auth_url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth?client_id={}&redirect_uri={}&response_type=code&scope=openid%20profile%20email&state={}&code_challenge={}&code_challenge_method=S256",
        state.config.google_oauth_client_id,
        urlencoding::encode(&req.redirect_uri),
        state_token,
        code_challenge
    );

    Ok(VilResponse::ok(OAuthInitResponse {
        auth_url,
        state: state_token,
    }))
}

#[vil_handler]
pub async fn oauth_callback(
    ctx: ServiceCtx,
    body: ShmSlice,
) -> Result<VilResponse<AuthResponse>, AppError> {
    let state = ctx.state::<AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let req: OAuthCallbackRequest = body.json().map_err(|_| AppError::Validation("Invalid JSON".into()))?;

    let mut oauth_store = state.oauth_state.write().await;
    
    let state_data = oauth_store.get(&req.state)
        .ok_or_else(|| AppError::Auth("Invalid or expired OAuth state".into()))?;
    
    let code_verifier = state_data.code_verifier;
    oauth_store.remove(&req.state);

    drop(oauth_store);

    let token_response = reqwest::Client::new()
        .post("https://oauth2.googleapis.com/token")
        .form(&[
            ("client_id", state.config.google_oauth_client_id.as_str()),
            ("code", req.code.as_str()),
            ("code_verifier", code_verifier.as_str()),
            ("grant_type", "authorization_code"),
            ("redirect_uri", "http://localhost:3000/auth/callback"),
        ])
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("Google token exchange failed: {}", e)))?;

    let token_json: serde_json::Value = token_response.json().await
        .map_err(|e| AppError::Internal(format!("Failed to parse token response: {}", e)))?;

    let access_token = token_json["access_token"]
        .as_str()
        .ok_or_else(|| AppError::Auth("Missing access token".into()))?;

    let user_response = reqwest::Client::new()
        .get("https://www.googleapis.com/oauth2/v2/userinfo")
        .header("Authorization", format!("Bearer {}", access_token))
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("Failed to get user info: {}", e)))?;

    let user_info: serde_json::Value = user_response.json().await
        .map_err(|e| AppError::Internal(format!("Failed to parse user info: {}", e)))?;

    let google_id = user_info["id"]
        .as_str()
        .ok_or_else(|| AppError::Auth("Missing Google ID".into()))?;
    let email = user_info["email"]
        .as_str()
        .ok_or_else(|| AppError::Auth("Missing email".into()))?;
    let name = user_info["name"].as_str().unwrap_or("Google User");

    let profile = match Profile::find_where(state.pool.inner(), "username = ?", &[&google_id]).await? {
        Some(p) => p,
        None => {
            let id = uuid::Uuid::new_v4().to_string();
            let friend_code = generate_random_string(8);
            
            Profile::q()
                .insert_columns(&["id", "username", "full_name", "password_hash", "subscription_tier", "hearts_count", "xp", "avatar_url", "friend_code"])
                .value(id.clone())
                .value(google_id.to_string())
                .value(name.to_string())
                .value(VilPassword::hash(&uuid::Uuid::new_v4().to_string()).unwrap_or_default())
                .value("free".to_string())
                .value(5_i64)
                .value(0_i64)
                .value(user_info["picture"].as_str().unwrap_or("").to_string())
                .value(friend_code)
                .execute(state.pool.inner())
                .await?;

            Profile::find_by_id(state.pool.inner(), &id)
                .await?
                .ok_or_else(|| AppError::Internal("Failed to create profile".into()))?
        }
    };

    let access = state.jwt.sign_access(&Claims::access(&profile.id, "user"))
        .map_err(|e| AppError::Internal(format!("{e}")))?;
    let refresh = state.jwt.sign_access(&Claims::refresh(&profile.id, "user"))
        .map_err(|e| AppError::Internal(format!("{e}")))?;

    Ok(VilResponse::ok(AuthResponse {
        ok: true,
        access_token: access,
        refresh_token: refresh,
        profile,
    }))
}

#[vil_handler]
pub async fn rotate_tokens(
    ctx: ServiceCtx,
    body: ShmSlice,
) -> Result<VilResponse<TokenRotateResponse>, AppError> {
    let state = ctx.state::<AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let req: TokenRotateRequest = body.json().map_err(|_| AppError::Validation("Invalid JSON".into()))?;

    let claims: Claims = state.jwt.verify(&req.refresh_token)
        .map_err(|e| AppError::Auth(format!("{e}")))?;
    
    if claims.token_type != "refresh" {
        return Err(AppError::Auth("Expected refresh token".into()));
    }

    let new_access = state.jwt.sign_access(&Claims::access(&claims.sub, &claims.role))
        .map_err(|e| AppError::Internal(format!("{e}")))?;
    let new_refresh = state.jwt.sign_access(&Claims::refresh(&claims.sub, &claims.role))
        .map_err(|e| AppError::Internal(format!("{e}")))?;

    Ok(VilResponse::ok(TokenRotateResponse {
        ok: true,
        access_token: new_access,
        refresh_token: new_refresh,
    }))
}