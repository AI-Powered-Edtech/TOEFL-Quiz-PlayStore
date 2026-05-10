use sqlx::sqlite::SqlitePoolOptions;
use uuid::Uuid;
use vil::auth::VilPassword;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("Connecting to database...");
    let pool = SqlitePoolOptions::new().connect("sqlite:data.db").await?;
    sqlx::query("CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, full_name TEXT, avatar_url TEXT, bio TEXT, password_hash TEXT, subscription_tier TEXT NOT NULL DEFAULT 'free', public_profile_id INTEGER, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))").execute(&pool).await?;
    sqlx::query("CREATE TABLE IF NOT EXISTS friend_codes (account_id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL DEFAULT (datetime('now')))").execute(&pool).await?;
    let password = "password123";
    let password_hash = VilPassword::hash(password)?;
    let users = vec![("dev_free@test.com", "free", None), ("dev_pro@test.com", "c2", None), ("admin@test.com", "free", Some("admin"))];
    for (username, tier, admin_role) in users {
        let existing: Option<(String, Option<i64>)> = sqlx::query_as("SELECT id, public_profile_id FROM accounts WHERE username = ?").bind(username).fetch_optional(&pool).await?;
        let (user_id, public_id) = if let Some((id, public_id)) = existing {
            println!("User {} already exists, updating account...", username);
            sqlx::query("UPDATE accounts SET password_hash = ?, subscription_tier = ?, updated_at = datetime('now') WHERE id = ?").bind(&password_hash).bind(tier).bind(&id).execute(&pool).await?;
            (id, public_id)
        } else {
            println!("Creating account {}...", username);
            let id = Uuid::new_v4().to_string();
            sqlx::query("INSERT INTO profiles (username, total_xp, current_streak, is_public) VALUES (?, 0, 0, 1)").bind(username).execute(&pool).await?;
            let public_id: i64 = sqlx::query_scalar("SELECT last_insert_rowid()").fetch_one(&pool).await?;
            sqlx::query("INSERT INTO accounts (id, username, full_name, password_hash, subscription_tier, public_profile_id) VALUES (?, ?, ?, ?, ?, ?)").bind(&id).bind(username).bind(username).bind(&password_hash).bind(tier).bind(public_id).execute(&pool).await?;
            (id, Some(public_id))
        };
        if public_id.is_none() {
            sqlx::query("INSERT INTO profiles (username, total_xp, current_streak, is_public) VALUES (?, 0, 0, 1)").bind(username).execute(&pool).await?;
            let public_id: i64 = sqlx::query_scalar("SELECT last_insert_rowid()").fetch_one(&pool).await?;
            sqlx::query("UPDATE accounts SET public_profile_id = ? WHERE id = ?").bind(public_id).bind(&user_id).execute(&pool).await?;
        }
        if let Some(role) = admin_role {
            sqlx::query("INSERT INTO admin_users (user_id, email, role) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET email = excluded.email, role = excluded.role").bind(&user_id).bind(username).bind(role).execute(&pool).await?;
        }
    }
    println!("Seeding completed successfully! (Password: {})", password);
    Ok(())
}
