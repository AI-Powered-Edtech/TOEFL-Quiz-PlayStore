use vil::vil_db_sqlx::{SqlxConfig, SqlxPool};
use vil_migrate::Migrator;

pub struct Database;

impl Database {
    pub async fn connect(url: &str) -> SqlxPool {
        let file_path = url
            .strip_prefix("sqlite://")
            .or_else(|| url.strip_prefix("sqlite:"))
            .unwrap_or("data.db");

        // Ensure file exists
        if !file_path.starts_with(":memory:") {
            let _ = std::fs::File::create_new(file_path);
        }

        // Run migrations using vil_migrate
        let migrator = Migrator::new("src/db/migrations").database_url(url);
        let ran = migrator.run().await.expect("Failed to run migrations");
        if !ran.is_empty() {
            eprintln!("[db] Migration complete — applied {} migrations", ran.len());
        }

        // Connect via VIL SqlxPool (semantic layer for production queries)
        sqlx::any::install_default_drivers();

        let config = SqlxConfig::sqlite(url).max_connections(10).min_connections(1);
        SqlxPool::connect("main_db", config)
            .await
            .expect("Failed to connect VIL SqlxPool")
    }
}
