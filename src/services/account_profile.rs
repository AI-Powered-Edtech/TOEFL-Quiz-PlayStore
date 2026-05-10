use crate::error::AppError;
use rand::Rng;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct AccountPublicProfileView {
    pub account_id: String,
    pub username: String,
    pub full_name: Option<String>,
    pub bio: Option<String>,
    pub avatar_url: Option<String>,
    pub public_profile_id: Option<i64>,
    pub total_xp: i64,
    pub current_streak: i64,
    pub is_public: i64,
}

pub async fn ensure_accounts_table(pool: &vil::vil_db_sqlx::SqlxPool) -> Result<(), AppError> {
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

    // Best-effort rolling schema upgrade: add fcm_token column to pre-existing accounts rows.
    // SQLite ALTER ADD COLUMN is not idempotent at the SQL layer; we swallow the
    // "duplicate column" error so this can run on fresh, post-migration, and
    // already-upgraded databases without panicking.
    let _ = sqlx::query("ALTER TABLE accounts ADD COLUMN fcm_token TEXT")
        .execute(pool.inner())
        .await;
    Ok(())
}

pub async fn ensure_friend_codes_table(pool: &vil::vil_db_sqlx::SqlxPool) -> Result<(), AppError> {
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS friend_codes (
            account_id TEXT PRIMARY KEY,
            code TEXT NOT NULL UNIQUE,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )",
    )
    .execute(pool.inner())
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_friend_codes_code ON friend_codes(code)")
        .execute(pool.inner())
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;
    Ok(())
}

#[derive(Debug, sqlx::FromRow)]
struct AccountLinkRow {
    username: String,
    avatar_url: Option<String>,
    public_profile_id: Option<i64>,
}

pub async fn account_exists(pool: &vil::vil_db_sqlx::SqlxPool, account_id: &str) -> Result<bool, AppError> {
    ensure_accounts_table(pool).await?;
    let exists: Option<String> = sqlx::query_scalar("SELECT id FROM accounts WHERE id = ?")
        .bind(account_id)
        .fetch_optional(pool.inner())
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;
    Ok(exists.is_some())
}

pub async fn ensure_public_profile_for_account(
    pool: &vil::vil_db_sqlx::SqlxPool,
    account_id: &str,
) -> Result<i64, AppError> {
    ensure_accounts_table(pool).await?;
    let account: AccountLinkRow = sqlx::query_as(
        "SELECT username, avatar_url, public_profile_id FROM accounts WHERE id = ?",
    )
    .bind(account_id)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
    .ok_or_else(|| AppError::NotFound("Account not found".into()))?;

    if let Some(public_id) = account.public_profile_id {
        let exists: Option<i64> = sqlx::query_scalar("SELECT id FROM profiles WHERE id = ?")
            .bind(public_id)
            .fetch_optional(pool.inner())
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        if let Some(id) = exists {
            return Ok(id);
        }
    }

    sqlx::query("INSERT INTO profiles (username, avatar_url, total_xp, current_streak, is_public) VALUES (?, ?, 0, 0, 1)")
        .bind(&account.username)
        .bind(&account.avatar_url)
        .execute(pool.inner())
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let public_id: i64 = sqlx::query_scalar("SELECT last_insert_rowid()")
        .fetch_one(pool.inner())
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    sqlx::query("UPDATE accounts SET public_profile_id = ?, updated_at = datetime('now') WHERE id = ?")
        .bind(public_id)
        .bind(account_id)
        .execute(pool.inner())
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(public_id)
}

pub async fn award_public_xp(pool: &vil::vil_db_sqlx::SqlxPool, account_id: &str, xp: i64) -> Result<(), AppError> {
    if xp <= 0 { return Ok(()); }
    let public_id = ensure_public_profile_for_account(pool, account_id).await?;
    sqlx::query("UPDATE profiles SET total_xp = COALESCE(total_xp, 0) + ? WHERE id = ?")
        .bind(xp)
        .bind(public_id)
        .execute(pool.inner())
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;
    Ok(())
}

pub async fn get_account_public_profile(
    pool: &vil::vil_db_sqlx::SqlxPool,
    account_id: &str,
) -> Result<Option<AccountPublicProfileView>, AppError> {
    ensure_accounts_table(pool).await?;
    let row = sqlx::query_as::<_, AccountPublicProfileView>(
        "SELECT ac.id AS account_id, ac.username AS username, ac.full_name AS full_name, ac.bio AS bio,
                COALESCE(p.avatar_url, ac.avatar_url) AS avatar_url,
                ac.public_profile_id AS public_profile_id,
                COALESCE(p.total_xp, 0) AS total_xp,
                COALESCE(p.current_streak, 0) AS current_streak,
                COALESCE(p.is_public, 1) AS is_public
         FROM accounts ac
         LEFT JOIN profiles p ON p.id = ac.public_profile_id
         WHERE ac.id = ?",
    )
    .bind(account_id)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?;
    Ok(row)
}

pub async fn get_public_profile_by_public_id(
    pool: &vil::vil_db_sqlx::SqlxPool,
    public_profile_id: i64,
) -> Result<Option<AccountPublicProfileView>, AppError> {
    ensure_accounts_table(pool).await?;
    let row = sqlx::query_as::<_, AccountPublicProfileView>(
        "SELECT COALESCE(ac.id, CAST(p.id AS TEXT)) AS account_id,
                COALESCE(ac.username, p.username, 'Anonymous') AS username,
                ac.full_name AS full_name,
                ac.bio AS bio,
                COALESCE(p.avatar_url, ac.avatar_url) AS avatar_url,
                p.id AS public_profile_id,
                COALESCE(p.total_xp, 0) AS total_xp,
                COALESCE(p.current_streak, 0) AS current_streak,
                COALESCE(p.is_public, 1) AS is_public
         FROM profiles p
         LEFT JOIN accounts ac ON ac.public_profile_id = p.id
         WHERE p.id = ?",
    )
    .bind(public_profile_id)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?;
    Ok(row)
}

fn random_friend_code() -> String {
    const ALPHABET: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let mut rng = rand::thread_rng();
    (0..8).map(|_| ALPHABET[rng.gen_range(0..ALPHABET.len())] as char).collect()
}

pub async fn get_or_create_friend_code(pool: &vil::vil_db_sqlx::SqlxPool, account_id: &str) -> Result<String, AppError> {
    ensure_friend_codes_table(pool).await?;
    if !account_exists(pool, account_id).await? {
        return Err(AppError::NotFound("Account not found".into()));
    }
    if let Some(code) = sqlx::query_scalar::<_, String>("SELECT code FROM friend_codes WHERE account_id = ?")
        .bind(account_id)
        .fetch_optional(pool.inner())
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?
    {
        return Ok(code);
    }
    for _ in 0..8 {
        let code = random_friend_code();
        let res = sqlx::query("INSERT OR IGNORE INTO friend_codes (account_id, code) VALUES (?, ?)")
            .bind(account_id)
            .bind(&code)
            .execute(pool.inner())
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        if res.rows_affected() > 0 { return Ok(code); }
    }
    Err(AppError::Internal("Could not allocate friend code".into()))
}

pub async fn account_id_by_friend_code(pool: &vil::vil_db_sqlx::SqlxPool, code: &str) -> Result<Option<String>, AppError> {
    ensure_friend_codes_table(pool).await?;
    let normalized = code.trim().to_ascii_uppercase();
    let id = sqlx::query_scalar::<_, String>("SELECT account_id FROM friend_codes WHERE code = ?")
        .bind(normalized)
        .fetch_optional(pool.inner())
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;
    Ok(id)
}
