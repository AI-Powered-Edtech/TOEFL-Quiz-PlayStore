use crate::error::AppError;
use crate::middleware::auth::Claims;
use crate::models::profile::{LoginRequest, RefreshRequest, RegisterRequest, UpdateProfileRequest};
use crate::models::responses::*;
use crate::AppState;
use serde::{Deserialize, Serialize};
use vil::auth::VilPassword;
use vil::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct AccountRow {
    pub id: String,
    pub username: String,
    pub full_name: Option<String>,
    pub avatar_url: Option<String>,
    pub bio: Option<String>,
    #[serde(skip_serializing)]
    pub password_hash: Option<String>,
    pub subscription_tier: String,
    pub public_profile_id: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, VilModel)]
pub struct AuthProfileView {
    pub id: String,
    pub username: Option<String>,
    pub full_name: Option<String>,
    pub avatar_url: Option<String>,
    pub bio: Option<String>,
    pub friend_code: Option<String>,
    pub xp: i64,
    pub total_xp: i64,
    pub current_streak: i64,
    pub is_public: bool,
    pub subscription_tier: String,
    pub fcm_token: Option<String>,
    pub peer_review_prefs: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, VilModel)]
pub struct AuthResponseV2 {
    pub ok: bool,
    pub access_token: String,
    pub refresh_token: String,
    pub profile: AuthProfileView,
}

async fn ensure_accounts_table(pool: &vil::vil_db_sqlx::SqlxPool) -> Result<(), AppError> {
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

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_accounts_username ON accounts(username)")
        .execute(pool.inner())
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_accounts_public_profile ON accounts(public_profile_id)")
        .execute(pool.inner())
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;
    Ok(())
}

async fn load_account_by_id(
    pool: &vil::vil_db_sqlx::SqlxPool,
    id: &str,
) -> Result<Option<AccountRow>, AppError> {
    ensure_accounts_table(pool).await?;
    sqlx::query_as::<_, AccountRow>(
        "SELECT id, username, full_name, avatar_url, bio, password_hash, subscription_tier, public_profile_id, created_at, updated_at FROM accounts WHERE id = ?",
    )
    .bind(id)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| AppError::Internal(e.to_string()))
}

async fn load_account_by_username(
    pool: &vil::vil_db_sqlx::SqlxPool,
    username: &str,
) -> Result<Option<AccountRow>, AppError> {
    ensure_accounts_table(pool).await?;
    sqlx::query_as::<_, AccountRow>(
        "SELECT id, username, full_name, avatar_url, bio, password_hash, subscription_tier, public_profile_id, created_at, updated_at FROM accounts WHERE username = ?",
    )
    .bind(username)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| AppError::Internal(e.to_string()))
}

#[derive(Debug, sqlx::FromRow)]
struct PublicProfileRow {
    username: Option<String>,
    avatar_url: Option<String>,
    total_xp: Option<i64>,
    current_streak: Option<i64>,
    is_public: Option<i64>,
}

async fn load_public_profile(
    pool: &vil::vil_db_sqlx::SqlxPool,
    public_profile_id: Option<i64>,
) -> Result<Option<PublicProfileRow>, AppError> {
    if let Some(id) = public_profile_id {
        let row = sqlx::query_as::<_, PublicProfileRow>(
            "SELECT username, avatar_url, total_xp, current_streak, is_public FROM profiles WHERE id = ?",
        )
        .bind(id)
        .fetch_optional(pool.inner())
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;
        Ok(row)
    } else {
        Ok(None)
    }
}

async fn create_public_profile(
    pool: &vil::vil_db_sqlx::SqlxPool,
    username: &str,
) -> Result<i64, AppError> {
    sqlx::query(
        "INSERT INTO profiles (username, total_xp, current_streak, is_public) VALUES (?, 0, 0, 1)",
    )
    .bind(username)
    .execute(pool.inner())
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?;

    sqlx::query_scalar::<_, i64>("SELECT last_insert_rowid()")
        .fetch_one(pool.inner())
        .await
        .map_err(|e| AppError::Internal(e.to_string()))
}

async fn account_to_profile_view(
    pool: &vil::vil_db_sqlx::SqlxPool,
    account: AccountRow,
) -> Result<AuthProfileView, AppError> {
    let public = load_public_profile(pool, account.public_profile_id).await?;
    let total_xp = public.as_ref().and_then(|p| p.total_xp).unwrap_or(0);
    Ok(AuthProfileView {
        id: account.id,
        username: public
            .as_ref()
            .and_then(|p| p.username.clone())
            .or_else(|| Some(account.username.clone())),
        full_name: account.full_name,
        avatar_url: public
            .as_ref()
            .and_then(|p| p.avatar_url.clone())
            .or(account.avatar_url),
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
pub async fn register(
    ctx: ServiceCtx,
    body: ShmSlice,
) -> Result<VilResponse<AuthResponseV2>, AppError> {
    let state = ctx.state::<AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let req: RegisterRequest = body.json().map_err(|_| AppError::Validation("Invalid JSON body".into()))?;

    if req.username.len() < 3 || req.username.len() > 50 {
        return Err(AppError::Validation("Username must be 3-50 characters".into()));
    }
    if req.password.len() < 8 {
        return Err(AppError::Validation("Password must be at least 8 characters".into()));
    }

    ensure_accounts_table(&state.pool).await?;
    if load_account_by_username(&state.pool, &req.username).await?.is_some() {
        return Err(AppError::Validation("Username already exists".into()));
    }

    let id = uuid::Uuid::new_v4().to_string();
    let password_hash = VilPassword::hash(&req.password)
        .map_err(|e| AppError::Internal(format!("{e}")))?;
    let public_profile_id = create_public_profile(&state.pool, &req.username).await?;

    sqlx::query(
        "INSERT INTO accounts (id, username, full_name, password_hash, subscription_tier, public_profile_id, created_at, updated_at) VALUES (?, ?, ?, ?, 'free', ?, datetime('now'), datetime('now'))",
    )
    .bind(&id)
    .bind(&req.username)
    .bind(&req.full_name)
    .bind(&password_hash)
    .bind(public_profile_id)
    .execute(state.pool.inner())
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?;

    let account = load_account_by_id(&state.pool, &id)
        .await?
        .ok_or_else(|| AppError::Internal("Account not found after insert".into()))?;
    let profile = account_to_profile_view(&state.pool, account).await?;

    let access = state.jwt.sign_access(&Claims::access(&id, "user"))
        .map_err(|e| AppError::Internal(format!("{e}")))?;
    let refresh = state.jwt.sign_access(&Claims::refresh(&id, "user"))
        .map_err(|e| AppError::Internal(format!("{e}")))?;

    Ok(VilResponse::created(AuthResponseV2 {
        ok: true,
        access_token: access,
        refresh_token: refresh,
        profile,
    }))
}

#[vil_handler]
pub async fn login(
    ctx: ServiceCtx,
    body: ShmSlice,
) -> Result<VilResponse<AuthResponseV2>, AppError> {
    let state = ctx.state::<AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let req: LoginRequest = body.json().map_err(|_| AppError::Validation("Invalid JSON body".into()))?;

    let account = load_account_by_username(&state.pool, &req.username)
        .await?
        .ok_or_else(|| AppError::Auth("Invalid credentials".into()))?;

    let hash_str = account.password_hash.as_deref().unwrap_or("");
    let valid = VilPassword::verify(&req.password, hash_str).unwrap_or(false);
    if !valid {
        vil::prelude::vil_log::security_log!(Warn, vil::prelude::vil_log::SecurityPayload {
            event_type: 0,
            outcome: 1,
            ..vil::prelude::vil_log::SecurityPayload::default()
        });
        return Err(AppError::Auth("Invalid credentials".into()));
    }

    vil::prelude::vil_log::security_log!(Info, vil::prelude::vil_log::SecurityPayload {
        event_type: 0,
        outcome: 0,
        ..vil::prelude::vil_log::SecurityPayload::default()
    });

    use crate::models::admin::AdminUser;
    let role = AdminUser::find_by_id(state.pool.inner(), &account.id)
        .await?
        .map(|a| a.role)
        .unwrap_or_else(|| "user".into());

    let access = state.jwt.sign_access(&Claims::access(&account.id, &role))
        .map_err(|e| AppError::Internal(format!("{e}")))?;
    let refresh = state.jwt.sign_access(&Claims::refresh(&account.id, &role))
        .map_err(|e| AppError::Internal(format!("{e}")))?;
    let profile = account_to_profile_view(&state.pool, account).await?;

    Ok(VilResponse::ok(AuthResponseV2 {
        ok: true,
        access_token: access,
        refresh_token: refresh,
        profile,
    }))
}

#[vil_handler]
pub async fn refresh_token(
    ctx: ServiceCtx,
    body: ShmSlice,
) -> Result<VilResponse<TokenPairResponse>, AppError> {
    let state = ctx.state::<AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let req: RefreshRequest = body.json().map_err(|_| AppError::Validation("Invalid JSON body".into()))?;

    let claims: Claims = state.jwt.verify(&req.refresh_token)
        .map_err(|e| AppError::Auth(format!("{e}")))?;
    if claims.token_type != "refresh" {
        return Err(AppError::Auth("Expected refresh token".into()));
    }

    let access = state.jwt.sign_access(&Claims::access(&claims.sub, &claims.role))
        .map_err(|e| AppError::Internal(format!("{e}")))?;

    Ok(VilResponse::ok(TokenPairResponse {
        ok: true,
        access_token: access,
    }))
}

#[vil_handler]
pub async fn get_profile(
    ctx: ServiceCtx,
    claims: Claims,
) -> Result<VilResponse<AuthProfileView>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let account = load_account_by_id(&state.pool, &claims.sub)
        .await?
        .ok_or_else(|| AppError::NotFound("Account not found".into()))?;
    let profile = account_to_profile_view(&state.pool, account).await?;
    Ok(VilResponse::ok(profile))
}

#[vil_handler]
pub async fn update_profile(
    ctx: ServiceCtx,
    claims: Claims,
    body: ShmSlice,
) -> Result<VilResponse<AuthProfileView>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let req: UpdateProfileRequest = body.json().map_err(|_| AppError::Validation("Invalid JSON body".into()))?;

    let account = load_account_by_id(&state.pool, &claims.sub)
        .await?
        .ok_or_else(|| AppError::NotFound("Account not found".into()))?;

    sqlx::query("UPDATE accounts SET full_name = COALESCE(?, full_name), bio = COALESCE(?, bio), avatar_url = COALESCE(?, avatar_url), updated_at = datetime('now') WHERE id = ?")
        .bind(&req.full_name)
        .bind(&req.bio)
        .bind(&req.avatar_url)
        .bind(&claims.sub)
        .execute(state.pool.inner())
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    // Persist fcm_token only if accounts.fcm_token column exists (post-migration 007).
    // Pre-migration DB: silent skip — preserves prior behavior, no regression.
    if let Some(fcm) = req.fcm_token.as_deref() {
        let has_col: Option<String> = sqlx::query_scalar("SELECT name FROM pragma_table_info('accounts') WHERE name = ?")
            .bind("fcm_token")
            .fetch_optional(state.pool.inner())
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        if has_col.is_some() {
            sqlx::query("UPDATE accounts SET fcm_token = ?, updated_at = datetime('now') WHERE id = ?")
                .bind(fcm)
                .bind(&claims.sub)
                .execute(state.pool.inner())
                .await
                .map_err(|e| AppError::Internal(e.to_string()))?;
        }
    }

    if let Some(public_id) = account.public_profile_id {
        if let Some(avatar_url) = &req.avatar_url {
            sqlx::query("UPDATE profiles SET avatar_url = ? WHERE id = ?")
                .bind(avatar_url)
                .bind(public_id)
                .execute(state.pool.inner())
                .await
                .map_err(|e| AppError::Internal(e.to_string()))?;
        }
    }

    let account = load_account_by_id(&state.pool, &claims.sub)
        .await?
        .ok_or_else(|| AppError::NotFound("Account not found".into()))?;
    let profile = account_to_profile_view(&state.pool, account).await?;
    Ok(VilResponse::ok(profile))
}

async fn delete_from_table_if_exists(
    pool: &vil::vil_db_sqlx::SqlxPool,
    table: &str,
    user_column: &str,
    user_id: &str,
) -> Result<(), AppError> {
    // Skip if table itself does not exist in the live schema.
    let exists: Option<String> = sqlx::query_scalar("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
        .bind(table)
        .fetch_optional(pool.inner())
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;
    if exists.is_none() {
        return Ok(());
    }

    // Tolerate schema drift: live tables may exist with a slimmer shape than the
    // rich-schema columns this handler assumes. If the user column is not present,
    // skip instead of crashing the whole delete-account flow.
    let probe_sql = format!("SELECT name FROM pragma_table_info('{}') WHERE name = ?", table);
    let column_present: Option<String> = sqlx::query_scalar(&probe_sql)
        .bind(user_column)
        .fetch_optional(pool.inner())
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;
    if column_present.is_none() {
        return Ok(());
    }

    let sql = format!("DELETE FROM {table} WHERE {user_column} = ?");
    sqlx::query(&sql)
        .bind(user_id)
        .execute(pool.inner())
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;
    Ok(())
}

/// DELETE /api/auth/account — server-side account deletion.
/// Public `profiles` remains the VWFD/public shape; account identity lives in `accounts`.
#[vil_handler]
pub async fn delete_account(
    ctx: ServiceCtx,
    claims: Claims,
) -> Result<VilResponse<OkResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let user_id = claims.sub.clone();
    let account = load_account_by_id(&state.pool, &user_id).await?;

    let owned_tables = [
        ("quiz_results", "user_id"),
        ("quiz_reports", "user_id"),
        ("user_question_history", "user_id"),
        ("user_performance_metrics", "user_id"),
        ("writing_gym_progress", "user_id"),
        ("writing_sessions", "user_id"),
        ("writing_submissions", "user_id"),
        ("ai_token_usage", "user_id"),
        ("feature_usage", "user_id"),
        ("subscriptions", "user_id"),
        ("purchase_entitlements", "user_id"),
        ("peer_review_submissions", "user_id"),
        ("peer_reviews", "reviewer_id"),
        ("collected_vocabulary", "user_id"),
        ("devils_advocate_sessions", "user_id"),
        ("user_saved_essays", "user_id"),
        ("user_media_assets", "owner_id"),
        ("creator_profiles", "user_id"),
        ("circle_messages_v2", "sender_id"),
        ("oracle_prediction_history", "user_id"),
        ("moderation_reports", "reporter_id"),
        ("admin_users", "user_id"),
    ];

    for (table, column) in owned_tables {
        delete_from_table_if_exists(&state.pool, table, column, &user_id).await?;
    }

    delete_from_table_if_exists(&state.pool, "accounts", "id", &user_id).await?;

    if let Some(account) = account {
        if let Some(public_id) = account.public_profile_id {
            sqlx::query("DELETE FROM profiles WHERE id = ?")
                .bind(public_id)
                .execute(state.pool.inner())
                .await
                .map_err(|e| AppError::Internal(e.to_string()))?;
        }
    }

    Ok(VilResponse::ok(OkResponse { ok: true }))
}
