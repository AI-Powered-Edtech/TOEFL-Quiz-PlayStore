use crate::error::AppError;
use crate::middleware::auth::Claims;
use crate::models::ai::*;
use crate::models::responses::*;
use vil::ai::LlmProvider;
use vil_orm::vil_args;
use vil_server::axum::response::Response as AxumResponse;
use vil::prelude::*;


async fn get_account_tier(pool: &vil::vil_db_sqlx::SqlxPool, user_id: &str) -> Result<String, AppError> {
    let entitlement: Option<String> = sqlx::query_scalar(
        "SELECT tier FROM purchase_entitlements WHERE user_id = ? AND is_active = 1 ORDER BY verified_at DESC LIMIT 1",
    )
    .bind(user_id)
    .fetch_optional(pool.inner())
    .await
    .unwrap_or(None);

    if let Some(tier) = entitlement {
        return Ok(tier);
    }

    let tier: Option<String> = sqlx::query_scalar("SELECT subscription_tier FROM accounts WHERE id = ?")
        .bind(user_id)
        .fetch_optional(pool.inner())
        .await
        .unwrap_or(None);

    Ok(tier.unwrap_or_else(|| "free".to_string()))
}

/// POST /api/ai/generate — Groq LLM proxy via VIL LLM Provider
#[vil_handler]
pub async fn generate(
    ctx: ServiceCtx,
    claims: Option<Claims>,
    body: ShmSlice,
) -> Result<VilResponse<AiChatResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let req: GenerateRequest = body.json().map_err(|_| AppError::Validation("Invalid body".into()))?;

    let model = req.model.as_deref().unwrap_or("llama-3.3-70b-versatile");
    if !ALLOWED_MODELS.contains(&model) {
        return Err(AppError::Validation(format!("Model '{model}' not allowed")));
    }

    let user_id = claims.map(|c| c.sub).unwrap_or_else(|| "guest".to_string());
    
    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
    let mut tier = "free".to_string();

    if user_id != "guest" {
        tier = get_account_tier(&state.pool, &user_id).await?;
    }
    let limit = get_token_limit(&tier);

    let today_c = today.clone();
    let user_id_c = user_id.clone();
    let current: i64 = if user_id == "guest" {
        0
    } else {
        AiTokenUsage::scalar_optional_v(state.pool.inner(), "COALESCE(tokens_used, 0)", "user_id = ? AND date = ?", vil_args![user_id_c, today_c]).await?.unwrap_or(0)
    };

    if current >= limit {
        return Err(AppError::TokenLimitReached);
    }

    // Upsert token usage if not guest
    if user_id != "guest" {
        let token_id = uuid::Uuid::new_v4().to_string();
        let user_id_for_db = user_id.clone();
        let date = today.clone();
        AiTokenUsage::q()
            .insert_columns(&["id", "user_id", "date", "tokens_used", "tokens_limit"])
            .value(token_id).value(user_id_for_db).value(date).value(1_i64).value(limit)
            .on_conflict("user_id, date")
            .do_update_raw("tokens_used = tokens_used + 1")
            .execute(state.pool.inner())
        .await?;
    }

    // ── VIL LLM: OpenAI-compatible provider (Groq) ──
    // MOCK LOGIC DISABLED FOR TASK 1.1
    // if state.config.groq_api_key.is_empty() || state.config.groq_api_key == "test" { ... }

    let provider = vil::ai::OpenAiProvider::new(
        vil::ai::OpenAiConfig::new(&state.config.groq_api_key, model)
            .base_url("https://api.groq.com/openai/v1")
            .temperature(req.temperature.unwrap_or(0.3) as f32)
            .max_tokens(req.max_tokens.unwrap_or(2048)),
    );

    let messages: Vec<vil::ai::ChatMessage> = req.messages.iter().map(|m| match m.role.as_str() {
        "system" => vil::ai::ChatMessage::system(&m.content),
        "assistant" => vil::ai::ChatMessage::assistant(&m.content),
        _ => vil::ai::ChatMessage::user(&m.content),
    }).collect();

    let response = provider.chat(&messages).await.map_err(|e| {
        println!("GROQ ERROR: {}", e);
        vil::prelude::vil_log::ai_log!(Error, vil::prelude::vil_log::AiPayload {
            provider_hash: vil::prelude::vil_log::dict::register_str("groq"),
            model_hash: vil::prelude::vil_log::dict::register_str(model),
            ..vil::prelude::vil_log::AiPayload::default()
        });
        AppError::AiUnavailable(e.to_string())
    })?;

    // Semantic AI log — successful completion
    let (in_tok, out_tok) = response.usage.as_ref()
        .map(|u| (u.prompt_tokens, u.completion_tokens))
        .unwrap_or((0, 0));
    vil::prelude::vil_log::ai_log!(Info, vil::prelude::vil_log::AiPayload {
        provider_hash: vil::prelude::vil_log::dict::register_str("groq"),
        model_hash: vil::prelude::vil_log::dict::register_str(model),
        input_tokens: in_tok,
        output_tokens: out_tok,
        op_type: 0, // chat
        provider_status: 200,
        ..vil::prelude::vil_log::AiPayload::default()
    });

    Ok(VilResponse::ok(AiChatResponse {
        choices: vec![AiChoice {
            message: AiMessage {
                role: "assistant".into(),
                content: response.content,
            },
        }],
        model: response.model,
        usage: response.usage.map(|u| AiUsage {
            prompt_tokens: u.prompt_tokens,
            completion_tokens: u.completion_tokens,
            total_tokens: u.total_tokens,
        }),
    }))
}

/// POST /api/ai/tts — Groq TTS via VIL HTTP (binary response)
#[vil_handler]
pub async fn tts(
    ctx: ServiceCtx,
    _claims: Claims,
    body: ShmSlice,
) -> Result<AxumResponse, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let req: TtsRequest = body.json().map_err(|_| AppError::Validation("Invalid body".into()))?;

    if req.input.len() > 1200 {
        return Err(AppError::Validation("Input max 1200 characters".into()));
    }

    // TTS returns binary audio — use OpenAiProvider's underlying reqwest
    // (vil_new_http is for SSE/NDJSON streaming pipelines, not binary downloads)
    let voice = req.voice.as_deref().unwrap_or("tara");
    let client = reqwest::Client::new();
    let resp = client
        .post("https://api.groq.com/openai/v1/audio/speech")
        .header("Authorization", format!("Bearer {}", state.config.groq_api_key))
        .json(&serde_json::json!({
            "model": "canopylabs/orpheus-v1-english",
            "input": req.input,
            "voice": voice,
        }))
        .send()
        .await
        .map_err(|e| AppError::AiUnavailable(e.to_string()))?;

    let bytes = resp.bytes().await.map_err(|e| AppError::AiUnavailable(e.to_string()))?;

    Ok(AxumResponse::builder()
        .header("Content-Type", "audio/wav")
        .body(vil_server::axum::body::Body::from(bytes))
        .unwrap())
}

/// GET /api/ai/token-usage — current token budget
#[vil_handler]
pub async fn token_usage(
    ctx: ServiceCtx,
    claims: Option<Claims>,
) -> Result<VilResponse<TokenUsageResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
    
    let user_id = claims.map(|c| c.sub).unwrap_or_else(|| "guest".to_string());
    
    let mut tier = "free".to_string();

    if user_id != "guest" {
        tier = get_account_tier(&state.pool, &user_id).await?;
    }
    let limit = get_token_limit(&tier);

    let today_c = today.clone();
    let user_id_c = user_id.clone();
    let used: i64 = if user_id == "guest" {
        0
    } else {
        AiTokenUsage::scalar_optional_v(state.pool.inner(), "COALESCE(tokens_used, 0)", "user_id = ? AND date = ?", vil_args![user_id_c, today_c]).await?.unwrap_or(0)
    };

    Ok(VilResponse::ok(TokenUsageResponse {
        used,
        limit,
        remaining: (limit - used).max(0),
        tier,
        date: today,
    }))
}
