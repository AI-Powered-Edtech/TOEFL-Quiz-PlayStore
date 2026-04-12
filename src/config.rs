use std::env;

#[derive(Clone, Debug)]
pub struct AppConfig {
    pub port: u16,
    pub database_url: String,
    pub jwt_secret: String,
    pub jwt_expiry_secs: u64,
    pub jwt_refresh_expiry_secs: u64,
    pub groq_api_key: String,
    pub groq_api_url: String,
    pub admin_passcode_hash: String,
    pub google_oauth_client_id: String,
    pub allowed_origins: Vec<String>,
}

impl AppConfig {
    pub fn load() -> Self {
        // TODO: Replace env vars with Infisical SDK when deployed
        Self {
            port: env_or("PORT", "8082").parse().unwrap_or(8082),
            database_url: env_or("DATABASE_URL", "sqlite://data.db"),
            jwt_secret: env_or("JWT_SECRET", "dev-secret-change-me"),
            jwt_expiry_secs: env_or("JWT_EXPIRY_SECS", "900").parse().unwrap_or(900),
            jwt_refresh_expiry_secs: env_or("JWT_REFRESH_EXPIRY_SECS", "604800")
                .parse()
                .unwrap_or(604800),
            groq_api_key: env_or("GROQ_API_KEY", ""),
            groq_api_url: env_or(
                "GROQ_API_URL",
                "https://api.groq.com/openai/v1/chat/completions",
            ),
            admin_passcode_hash: env_or("ADMIN_PASSCODE_HASH", ""),
            google_oauth_client_id: env_or("GOOGLE_OAUTH_CLIENT_ID", ""),
            allowed_origins: env_or("ALLOWED_ORIGINS", "http://localhost:3000")
                .split(',')
                .map(|s| s.trim().to_string())
                .collect(),
        }
    }
}

fn env_or(key: &str, default: &str) -> String {
    env::var(key).unwrap_or_else(|_| default.to_string())
}
