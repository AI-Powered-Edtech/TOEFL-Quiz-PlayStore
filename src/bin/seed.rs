use vil::auth::VilPassword;
use sqlx::sqlite::SqlitePoolOptions;
use uuid::Uuid;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("Connecting to database...");
    let pool = SqlitePoolOptions::new()
        .connect("sqlite:data.db")
        .await?;

    let password = "password123";
    let password_hash = VilPassword::hash(password)?;

    let users = vec![
        ("dev_free@test.com", "free", None),
        ("dev_pro@test.com", "c2", None),
        ("admin@test.com", "free", Some("admin")),
    ];

    for (username, tier, admin_role) in users {
        let existing: Option<(String,)> = sqlx::query_as("SELECT id FROM profiles WHERE username = ?")
            .bind(username)
            .fetch_optional(&pool)
            .await?;

        let user_id = if let Some((id,)) = existing {
            println!("User {} already exists, updating...", username);
            sqlx::query("UPDATE profiles SET password_hash = ?, subscription_tier = ? WHERE id = ?")
                .bind(&password_hash)
                .bind(tier)
                .bind(&id)
                .execute(&pool)
                .await?;
            id
        } else {
            println!("Creating user {}...", username);
            let id = Uuid::new_v4().to_string();
            sqlx::query("INSERT INTO profiles (id, username, password_hash, subscription_tier, hearts_count, xp) VALUES (?, ?, ?, ?, ?, ?)")
                .bind(&id)
                .bind(username)
                .bind(&password_hash)
                .bind(tier)
                .bind(5)
                .bind(0)
                .execute(&pool)
                .await?;
            id
        };

        if let Some(role) = admin_role {
            let existing_admin: Option<(String,)> = sqlx::query_as("SELECT user_id FROM admin_users WHERE user_id = ?")
                .bind(&user_id)
                .fetch_optional(&pool)
                .await?;
            
            if existing_admin.is_none() {
                println!("Adding admin role for {}...", username);
                sqlx::query("INSERT INTO admin_users (user_id, email, role) VALUES (?, ?, ?)")
                    .bind(&user_id)
                    .bind(username)
                    .bind(role)
                    .execute(&pool)
                    .await?;
            } else {
                println!("Updating admin role for {}...", username);
                sqlx::query("UPDATE admin_users SET role = ?, email = ? WHERE user_id = ?")
                    .bind(role)
                    .bind(username)
                    .bind(&user_id)
                    .execute(&pool)
                    .await?;
            }
        }
    }

    println!("Seeding completed successfully! (Password: {})", password);
    Ok(())
}
