use crate::error::AppError;
use crate::middleware::auth::Claims;
use crate::models::oauth::*;
use crate::services::auth::{AuthProfileView, AuthResponseV2};
use crate::AppState;
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};
use vil::prelude::*;

const STATE_EXPIRY_SECS: i64 = 600;

fn generate_random_string(length: usize) -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    let chars: Vec<char> = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".chars().collect();
    (0..length).map(|_| chars[rng.gen_range(0..chars.len())]).collect()
}

fn generate_pkce_challenge(verifier: &str) -> String {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(verifier.as_bytes());
    let hash = hasher.finalize();
    URL_SAFE_NO_PAD.encode(hash)
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
struct OAuthAccountRow {
    id: String,
    username: String,
    full_name: Option<String>,
    avatar_url: Option<String>,
    bio: Option<String>,
    subscription_tier: String,
    public_profile_id: Option<i64>,
    created_at: String,
    updated_at: String,
}

async fn ensure_oauth_accounts_table(pool: &vil::vil_db_sqlx::SqlxPool) -> Result<(), AppError> {
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS accounts (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            full_name TEXT,
            avatar_url TEXT,
            bio TEXT,
            password_hash TEXT,
            subscription_tier TEXT NOT NULL DEFAULT 'free',
            public_profile_id INTEGER,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )",
    )
    .execute(pool.inner())
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?;
    Ok(())
}

async fn load_account(pool: &vil::vil_db_sqlx::SqlxPool, username: &str) -> Result<Option<OAuthAccountRow>, AppError> {
    ensure_oauth_accounts_table(pool).await?;
    sqlx::query_as::<_, OAuthAccountRow>(
        "SELECT id, username, full_name, avatar_url, bio, subscription_tier, public_profile_id, created_at, updated_at FROM accounts WHERE username = ?",
    )
    .bind(username)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| AppError::Internal(e.to_string()))
}

async fn create_oauth_account(
    pool: &vil::vil_db_sqlx::SqlxPool,
    username: &str,
    name: &str,
    avatar_url: Option<&str>,
) -> Result<OAuthAccountRow, AppError> {
    let id = uuid::Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO profiles (username, avatar_url, total_xp, current_streak, is_public) VALUES (?, ?, 0, 0, 1)")
        .bind(username)
        .bind(avatar_url)
        .execute(pool.inner())
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;
    let public_profile_id: i64 = sqlx::query_scalar("SELECT last_insert_rowid()")
        .fetch_one(pool.inner())
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;
    sqlx::query("INSERT INTO accounts (id, username, full_name, avatar_url, subscription_tier, public_profile_id, created_at, updated_at) VALUES (?, ?, ?, ?, 'free', ?, datetime('now'), datetime('now'))")
        .bind(&id)
        .bind(username)
        .bind(name)
        .bind(avatar_url)
        .bind(public_profile_id)
        .execute(pool.inner())
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;
    Ok(load_account(pool, username).await?.ok_or_else(|| AppError::Internal("Failed to create account".into()))?)
}

async fn to_auth_profile(pool: &vil::vil_db_sqlx::SqlxPool, account: OAuthAccountRow) -> Result<AuthProfileView, AppError> {
    #[derive(sqlx::FromRow)]
    struct PubRow { username: Option<String>, avatar_url: Option<String>, total_xp: Option<i64>, current_streak: Option<i64>, is_public: Option<i64> }
    let public: Option<PubRow> = if let Some(pid) = account.public_profile_id {
        sqlx::query_as("SELECT username, avatar_url, total_xp, current_streak, is_public FROM profiles WHERE id = ?")
            .bind(pid)
            .fetch_optional(pool.inner())
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?
    } else { None };
    let total_xp = public.as_ref().and_then(|p| p.total_xp).unwrap_or(0);
    Ok(AuthProfileView {
        id: account.id,
        username: public.as_ref().and_then(|p| p.username.clone()).or(Some(account.username)),
        full_name: account.full_name,
        avatar_url: public.as_ref().and_then(|p| p.avatar_url.clone()).or(account.avatar_url),
        bio: account.bio,
        friend_code: None,
        xp: total_xp,
        total_xp,
        current_streak: public.as_ref().and_then(|p| p.current_streak).unwrap_or(0),
        is_public: public.as_ref().and_then(|p| p.is_public).unwrap_or(1) != 0,
        subscription_tier: account.subscription_tier,
        fcm_token: None,
        peer_review_prefs: None,
        created_at: account.created_at,
        updated_at: account.updated_at,
    })
}

#[vil_handler]
pub async fn init_oauth(ctx: ServiceCtx, body: ShmSlice) -> Result<VilResponse<OAuthInitResponse>, AppError> {
    let state = ctx.state::<AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let req: OAuthInitRequest = body.json().map_err(|_| AppError::Validation("Invalid JSON".into()))?;
    if state.config.google_oauth_client_id.is_empty() { return Err(AppError::Config("Google OAuth not configured".into())); }
    let state_token = generate_random_string(32);
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() as i64;
    let redirect_uri = if req.redirect_uri.trim().is_empty() { state.config.oauth_redirect_uri.clone() } else { req.redirect_uri.clone() };
    let state_data = OAuthStateData { code_challenge: req.code_challenge.clone(), redirect_uri: redirect_uri.clone(), created_at: now };
    let mut oauth_store = state.oauth_state.write().await;
    oauth_store.set(&state_token, state_data);
    oauth_store.cleanup_expired(STATE_EXPIRY_SECS);
    let auth_url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth?client_id={}&redirect_uri={}&response_type=code&scope=openid%20profile%20email&state={}&code_challenge={}&code_challenge_method=S256",
        state.config.google_oauth_client_id,
        urlencoding::encode(&redirect_uri),
        state_token,
        req.code_challenge
    );
    Ok(VilResponse::ok(OAuthInitResponse { auth_url, state: state_token }))
}

#[vil_handler]
pub async fn oauth_callback(ctx: ServiceCtx, body: ShmSlice) -> Result<VilResponse<AuthResponseV2>, AppError> {
    let state = ctx.state::<AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let req: OAuthCallbackRequest = body.json().map_err(|_| AppError::Validation("Invalid JSON".into()))?;
    let mut oauth_store = state.oauth_state.write().await;
    let state_data = oauth_store.get(&req.state).ok_or_else(|| AppError::Auth("Invalid or expired OAuth state".into()))?;
    let stored_challenge = state_data.code_challenge;
    let redirect_uri = if state_data.redirect_uri.trim().is_empty() { state.config.oauth_redirect_uri.clone() } else { state_data.redirect_uri };
    oauth_store.remove(&req.state);
    drop(oauth_store);
    if generate_pkce_challenge(&req.code_verifier) != stored_challenge { return Err(AppError::Auth("PKCE validation failed".into())); }
    let token_response = reqwest::Client::new()
        .post("https://oauth2.googleapis.com/token")
        .form(&[("client_id", state.config.google_oauth_client_id.as_str()), ("code", req.code.as_str()), ("code_verifier", req.code_verifier.as_str()), ("grant_type", "authorization_code"), ("redirect_uri", redirect_uri.as_str())])
        .send().await.map_err(|e| AppError::Internal(format!("Google token exchange failed: {}", e)))?;
    let token_json: serde_json::Value = token_response.json().await.map_err(|e| AppError::Internal(format!("Failed to parse token response: {}", e)))?;
    let access_token = token_json["access_token"].as_str().ok_or_else(|| AppError::Auth("Missing access token".into()))?;
    let user_response = reqwest::Client::new().get("https://www.googleapis.com/oauth2/v2/userinfo").header("Authorization", format!("Bearer {}", access_token)).send().await.map_err(|e| AppError::Internal(format!("Failed to get user info: {}", e)))?;
    let user_info: serde_json::Value = user_response.json().await.map_err(|e| AppError::Internal(format!("Failed to parse user info: {}", e)))?;
    let google_id = user_info["id"].as_str().ok_or_else(|| AppError::Auth("Missing Google ID".into()))?;
    let name = user_info["name"].as_str().unwrap_or("Google User");
    let avatar = user_info["picture"].as_str();
    let account = match load_account(&state.pool, google_id).await? {
        Some(a) => a,
        None => create_oauth_account(&state.pool, google_id, name, avatar).await?,
    };
    let access = state.jwt.sign_access(&Claims::access(&account.id, "user")).map_err(|e| AppError::Internal(format!("{e}")))?;
    let refresh = state.jwt.sign_access(&Claims::refresh(&account.id, "user")).map_err(|e| AppError::Internal(format!("{e}")))?;
    let profile = to_auth_profile(&state.pool, account).await?;
    Ok(VilResponse::ok(AuthResponseV2 { ok: true, access_token: access, refresh_token: refresh, profile }))
}

#[vil_handler]
pub async fn rotate_tokens(ctx: ServiceCtx, body: ShmSlice) -> Result<VilResponse<TokenRotateResponse>, AppError> {
    let state = ctx.state::<AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let req: TokenRotateRequest = body.json().map_err(|_| AppError::Validation("Invalid JSON".into()))?;
    let claims: Claims = state.jwt.verify(&req.refresh_token).map_err(|e| AppError::Auth(format!("{e}")))?;
    if claims.token_type != "refresh" { return Err(AppError::Auth("Expected refresh token".into())); }
    let new_access = state.jwt.sign_access(&Claims::access(&claims.sub, &claims.role)).map_err(|e| AppError::Internal(format!("{e}")))?;
    let new_refresh = state.jwt.sign_access(&Claims::refresh(&claims.sub, &claims.role)).map_err(|e| AppError::Internal(format!("{e}")))?;
    Ok(VilResponse::ok(TokenRotateResponse { ok: true, access_token: new_access, refresh_token: new_refresh }))
}
