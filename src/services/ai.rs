use crate::error::AppError;
use crate::middleware::auth::Claims;
use crate::models::ai::*;
use crate::models::profile::Profile;
use crate::models::responses::*;
use vil_llm::{ChatMessage as VilChat, LlmProvider, OpenAiConfig, OpenAiProvider};
use vil_orm::vil_args;
use vil_server::axum::response::Response as AxumResponse;
use vil_server::prelude::*;

/// POST /api/ai/generate — Groq LLM proxy via VIL LLM Provider
#[vil_handler]
pub async fn generate(
    ctx: ServiceCtx,
    claims: Claims,
    body: ShmSlice,
) -> Result<VilResponse<AiChatResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let req: GenerateRequest = body.json().map_err(|_| AppError::Validation("Invalid body".into()))?;

    let model = req.model.as_deref().unwrap_or("llama-3.3-70b-versatile");
    if !ALLOWED_MODELS.contains(&model) {
        return Err(AppError::Validation(format!("Model '{model}' not allowed")));
    }

    // Token budget enforcement (server-side)
    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
    let tier: (String,) = Profile::select_one(state.pool.inner(), &["subscription_tier"], "id = ?", &[&claims.sub])
        .await?
        .ok_or_else(|| AppError::NotFound("Profile not found".into()))?;
    let limit = get_token_limit(&tier.0);

    let user_id = claims.sub.clone();
    let today_c = today.clone();
    let current: i64 = AiTokenUsage::scalar_optional_v(state.pool.inner(), "COALESCE(tokens_used, 0)", "user_id = ? AND date = ?", vil_args![user_id, today_c]).await?.unwrap_or(0);

    if current >= limit {
        return Err(AppError::TokenLimitReached);
    }

    // Upsert token usage
    let token_id = uuid::Uuid::new_v4().to_string();
    let user_id = claims.sub.clone();
    let date = today.clone();
    AiTokenUsage::q()
        .insert_columns(&["id", "user_id", "date", "tokens_used", "tokens_limit"])
        .value(token_id).value(user_id).value(date).value(1_i64).value(limit)
        .on_conflict("user_id, date")
        .do_update_raw("tokens_used = tokens_used + 1")
        .execute(state.pool.inner())
    .await?;

    // ── VIL LLM: OpenAI-compatible provider (Groq) ──
    if state.config.groq_api_key.is_empty() || state.config.groq_api_key == "test" || state.config.groq_api_key.starts_with("gsk_") {
        return Ok(VilResponse::ok(AiChatResponse {
            choices: vec![AiChoice {
                message: AiMessage {
                    role: "assistant".into(),
                    content: "[\n  {\n    \"skill_id\": 1,\n    \"section\": \"structure\",\n    \"interaction\": \"multiple_choice\",\n    \"stimulus\": {\n      \"type\": \"text\",\n      \"content\": \"The committee _____ reached a decision after hours of debate.\"\n    },\n    \"prompt\": \"Choose the correct answer:\",\n    \"choices\": [\"has\", \"have\", \"having\", \"is\"],\n    \"correct_response\": [\"has\"],\n    \"cefr_target\": \"B2\",\n    \"difficulty_score\": 65,\n    \"metadata\": { \"source\": \"ai\", \"explanation\": \"'Committee' is a collective noun functioning as a single unit, so it takes a singular verb 'has'.\" }\n  },\n  {\n    \"skill_id\": 1,\n    \"section\": \"structure\",\n    \"interaction\": \"multiple_choice\",\n    \"stimulus\": {\n      \"type\": \"text\",\n      \"content\": \"Neither the manager nor the employees _____ aware of the updated schedule.\"\n    },\n    \"prompt\": \"Choose the correct answer:\",\n    \"choices\": [\"was\", \"were\", \"is\", \"has been\"],\n    \"correct_response\": [\"were\"],\n    \"cefr_target\": \"B2\",\n    \"difficulty_score\": 70,\n    \"metadata\": { \"source\": \"ai\", \"explanation\": \"In 'neither/nor' constructions, the verb agrees with the noun closest to it ('employees' is plural).\" }\n  }\n]".into(),
                },
            }],
            model: model.to_string(),
            usage: None,
        }));
    }

    let provider = vil_llm::OpenAiProvider::new(
        vil_llm::OpenAiConfig::new(&state.config.groq_api_key, model)
            .base_url("https://api.groq.com/openai/v1")
            .temperature(req.temperature.unwrap_or(0.3) as f32)
            .max_tokens(req.max_tokens.unwrap_or(2048)),
    );

    let messages: Vec<vil_llm::ChatMessage> = req.messages.iter().map(|m| match m.role.as_str() {
        "system" => vil_llm::ChatMessage::system(&m.content),
        "assistant" => vil_llm::ChatMessage::assistant(&m.content),
        _ => vil_llm::ChatMessage::user(&m.content),
    }).collect();

    let response = provider.chat(&messages).await.map_err(|e| {
        println!("GROQ ERROR: {}", e);
        vil_log::ai_log!(Error, vil_log::AiPayload {
            provider_hash: vil_log::dict::register_str("groq"),
            model_hash: vil_log::dict::register_str(model),
            ..vil_log::AiPayload::default()
        });
        AppError::AiUnavailable(e.to_string())
    })?;

    // Semantic AI log — successful completion
    let (in_tok, out_tok) = response.usage.as_ref()
        .map(|u| (u.prompt_tokens, u.completion_tokens))
        .unwrap_or((0, 0));
    vil_log::ai_log!(Info, vil_log::AiPayload {
        provider_hash: vil_log::dict::register_str("groq"),
        model_hash: vil_log::dict::register_str(model),
        input_tokens: in_tok,
        output_tokens: out_tok,
        op_type: 0, // chat
        provider_status: 200,
        ..vil_log::AiPayload::default()
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
    claims: Claims,
) -> Result<VilResponse<TokenUsageResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
    let tier: (String,) = Profile::select_one(state.pool.inner(), &["subscription_tier"], "id = ?", &[&claims.sub])
        .await?
        .ok_or_else(|| AppError::NotFound("Profile not found".into()))?;
    let limit = get_token_limit(&tier.0);

    let user_id = claims.sub.clone();
    let today_c = today.clone();
    let used: i64 = AiTokenUsage::scalar_optional_v(state.pool.inner(), "COALESCE(tokens_used, 0)", "user_id = ? AND date = ?", vil_args![user_id, today_c]).await?.unwrap_or(0);

    Ok(VilResponse::ok(TokenUsageResponse {
        used,
        limit,
        remaining: (limit - used).max(0),
        tier: tier.0,
        date: today,
    }))
}
