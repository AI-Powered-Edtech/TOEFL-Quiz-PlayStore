use vil::vil_db_sqlx::{SqlxConfig, SqlxPool};
use vil_migrate::Migrator;

pub struct Database;

impl Database {
    pub async fn connect(url: &str) -> SqlxPool {
        let file_path = url
            .strip_prefix("sqlite://")
            .or_else(|| url.strip_prefix("sqlite:"))
            .unwrap_or("data.db");

        if !file_path.starts_with(":memory:") {
            let _ = std::fs::File::create_new(file_path);
        }

        if should_use_production_migrations(file_path) {
            eprintln!("[db] production/live schema detected; applying production migrations and skipping legacy rich-profile migrations");
            apply_production_migrations(file_path);
        } else {
            let migrator = Migrator::new("src/db/migrations").database_url(url);
            let ran = migrator.run().await.expect("Failed to run migrations");
            if !ran.is_empty() {
                eprintln!("[db] Migration complete — applied {} migrations", ran.len());
            }
        }

        sqlx::any::install_default_drivers();
        let config = SqlxConfig::sqlite(url).max_connections(10).min_connections(1);
        SqlxPool::connect("main_db", config)
            .await
            .expect("Failed to connect VIL SqlxPool")
    }
}

fn should_use_production_migrations(file_path: &str) -> bool {
    if std::env::var("SKIP_LEGACY_MIGRATIONS").ok().as_deref() == Some("1") {
        return true;
    }
    if file_path.starts_with(":memory:") || !std::path::Path::new(file_path).exists() {
        return false;
    }
    let output = std::process::Command::new("sqlite3")
        .arg(file_path)
        .arg("SELECT group_concat(name, ',') FROM pragma_table_info('profiles');")
        .output();
    match output {
        Ok(out) if out.status.success() => {
            let cols = String::from_utf8_lossy(&out.stdout).trim().to_string();
            cols == "id,username,avatar_url,total_xp,current_streak,is_public"
        }
        _ => false,
    }
}

fn apply_production_migrations(file_path: &str) {
    let dir = std::path::Path::new("migrations/production");
    let Ok(entries) = std::fs::read_dir(dir) else { return; };
    let mut files: Vec<std::path::PathBuf> = entries
        .filter_map(|e| e.ok().map(|e| e.path()))
        .filter(|p| p.extension().and_then(|s| s.to_str()) == Some("sql"))
        .collect();
    files.sort();
    for file in files {
        let sql = std::fs::read_to_string(&file)
            .unwrap_or_else(|e| panic!("Failed to read production migration {:?}: {}", file, e));
        let mut child = std::process::Command::new("sqlite3")
            .arg(file_path)
            .stdin(std::process::Stdio::piped())
            .spawn()
            .unwrap_or_else(|e| panic!("Failed to run sqlite3 for production migration {:?}: {}", file, e));
        use std::io::Write;
        child.stdin.as_mut().expect("sqlite3 stdin").write_all(sql.as_bytes()).expect("write migration SQL");
        let status = child.wait().expect("wait sqlite3 migration");
        if !status.success() { panic!("Production migration failed: {:?}", file); }
    }
}
