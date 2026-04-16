use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OAuthStateData {
    pub code_challenge: String,
    pub created_at: i64,
}

pub struct OAuthStateStore {
    pub states: HashMap<String, OAuthStateData>,
}

impl OAuthStateStore {
    pub fn new() -> Self {
        Self {
            states: HashMap::new(),
        }
    }

    pub fn set(&mut self, state: &str, data: OAuthStateData) {
        self.states.insert(state.to_string(), data);
    }

    pub fn get(&self, state: &str) -> Option<OAuthStateData> {
        self.states.get(state).cloned()
    }

    pub fn remove(&mut self, state: &str) {
        self.states.remove(state);
    }

    pub fn cleanup_expired(&mut self, max_age_secs: i64) {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;
        
        self.states.retain(|_, v| now - v.created_at < max_age_secs);
    }
}

#[derive(Debug, Deserialize)]
pub struct OAuthInitRequest {
    pub provider: String,
    pub redirect_uri: String,
    pub code_challenge: String,
}

#[derive(Debug, Serialize)]
pub struct OAuthInitResponse {
    pub auth_url: String,
    pub state: String,
}

#[derive(Debug, Deserialize)]
pub struct OAuthCallbackRequest {
    pub code: String,
    pub state: String,
    pub code_verifier: String,
}

#[derive(Debug, Deserialize)]
pub struct PKCEChallengeRequest {
    pub code_verifier: String,
}

#[derive(Debug, Serialize)]
pub struct PKCEChallengeResponse {
    pub code_challenge: String,
    pub code_challenge_method: String,
}

#[derive(Debug, Deserialize)]
pub struct TokenRotateRequest {
    pub refresh_token: String,
}

#[derive(Debug, Serialize)]
pub struct TokenRotateResponse {
    pub ok: bool,
    pub access_token: String,
    pub refresh_token: String,
}