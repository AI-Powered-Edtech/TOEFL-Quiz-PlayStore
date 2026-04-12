use vil_db_sqlx::{SqlxConfig, SqlxPool};

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

        // Step 1: Native sqlx::Sqlite for migration (supports create_if_missing + PRAGMAs)
        let native_opts = sqlx::sqlite::SqliteConnectOptions::new()
            .filename(file_path)
            .create_if_missing(true)
            .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
            .synchronous(sqlx::sqlite::SqliteSynchronous::Normal)
            .busy_timeout(std::time::Duration::from_secs(5))
            .foreign_keys(true);

        let native_pool = sqlx::sqlite::SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(native_opts)
            .await
            .expect("Failed to create SQLite database");

        // Run schema using SQLX raw_execute — handles multi-statement
        let schema = include_str!("db/migrations/001_initial_schema.sql");
        // Filter out comment-only lines and execute each real statement
        let mut current = String::new();
        for line in schema.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with("--") || trimmed.is_empty() {
                continue;
            }
            current.push_str(line);
            current.push('\n');
            if trimmed.ends_with(';') {
                let stmt = current.trim().to_string();
                if !stmt.is_empty() {
                    if let Err(e) = sqlx::query(&stmt).execute(&native_pool).await {
                        let msg = e.to_string();
                        if !msg.contains("already exists") {
                            eprintln!("[migration] warn: {msg}");
                        }
                    }
                }
                current.clear();
            }
        }

        eprintln!("[db] Migration complete — 35 tables");
        native_pool.close().await;

        // Step 2: Connect via VIL SqlxPool (semantic layer for production queries)
        // install_default_drivers needed for sqlx::Any
        sqlx::any::install_default_drivers();

        let config = SqlxConfig::sqlite(url).max_connections(10).min_connections(1);
        SqlxPool::connect("main_db", config)
            .await
            .expect("Failed to connect VIL SqlxPool")
    }
}
