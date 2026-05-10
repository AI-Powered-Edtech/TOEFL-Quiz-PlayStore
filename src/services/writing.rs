use crate::error::AppError;
use crate::middleware::auth::Claims;
use crate::models::ai::AiTokenUsage;
use crate::models::responses::*;
use crate::services::account_profile::award_public_xp;
use crate::models::views::*;
use crate::models::writing::*;
use vil::prelude::*;

// ── Writing Gym Progress ──

#[vil_handler]
pub async fn get_progress(
    ctx: ServiceCtx,
    claims: Claims,
) -> Result<VilResponse<Vec<WritingGymProgress>>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let rows = WritingGymProgress::find_all_where(state.pool.inner(), "user_id = ?", &[&claims.sub]).await?;
    Ok(VilResponse::ok(rows))
}

#[vil_handler]
pub async fn save_progress(
    ctx: ServiceCtx,
    claims: Claims,
    body: ShmSlice,
) -> Result<VilResponse<OkResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let req: SaveProgressRequest = body.json().map_err(|_| AppError::Validation("Invalid body".into()))?;

    let prog_id = uuid::Uuid::new_v4().to_string();
    let uid = claims.sub.clone();
    let level = req.level.clone();
    let skill_id = req.skill_id.clone();
    let history = req.history.clone();
    WritingGymProgress::q()
        .insert_columns(&["id", "user_id", "level", "skill_id", "exercises_completed", "stars_earned", "history"])
        .value(prog_id).value(uid).value(level)
        .value_opt_str(skill_id)
        .value(req.exercises_completed)
        .value(req.stars_earned)
        .value_opt_str(history)
        .on_conflict("user_id, level, skill_id")
        .do_update(&["exercises_completed", "stars_earned", "history"])
        .execute(state.pool.inner())
        .await?;

    // XP award for writing gym completion
    if req.stars_earned > 0 {
        let xp = req.stars_earned * 10;
        award_public_xp(&state.pool, &claims.sub, xp).await?;
    }

    Ok(VilResponse::ok(OkResponse { ok: true }))
}

// ── Writing Sessions (mason, logic_weaver, integrated, etc) ──

#[vil_handler]
pub async fn get_sessions(
    ctx: ServiceCtx,
    claims: Claims,
    Query(params): Query<SessionFilter>,
) -> Result<VilResponse<Vec<WritingSession>>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let level_val = params.level.as_deref().unwrap_or("mason").to_string();
    let rows = WritingSession::q()
        .select(&["*"])
        .where_eq("user_id", &claims.sub)
        .where_eq("level", &level_val)
        .where_raw("status = 'in_progress'")
        .order_by_desc("updated_at")
        .limit(5)
        .fetch_all::<WritingSession>(state.pool.inner())
        .await?;
    Ok(VilResponse::ok(rows))
}

#[vil_handler]
pub async fn save_session(
    ctx: ServiceCtx,
    claims: Claims,
    body: ShmSlice,
) -> Result<VilResponse<OkWithIdResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let req: SaveSessionRequest = body.json().map_err(|_| AppError::Validation("Invalid body".into()))?;
    let id = req.id.unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

    let uid = claims.sub.clone();
    let level = req.level.clone();
    let skill_id = req.skill_id.clone();
    let session_state = req.session_state.clone();
    let status = req.status.as_deref().unwrap_or("in_progress").to_string();
    let expires_at = req.expires_at.clone();
    WritingSession::q()
        .insert_columns(&["id", "user_id", "level", "skill_id", "session_state", "best_score", "status", "expires_at"])
        .value(id.clone()).value(uid).value(level)
        .value_opt_str(skill_id)
        .value_opt_str(session_state)
        .value_opt_i64(req.best_score)
        .value(status)
        .value_opt_str(expires_at)
        .on_conflict("id")
        .do_update(&["session_state", "best_score", "status"])
        .execute(state.pool.inner())
        .await?;

    Ok(VilResponse::ok(OkWithIdResponse { ok: true, id }))
}

// ── Exercise Pool ──

#[vil_handler]
pub async fn get_exercise(
    ctx: ServiceCtx,
    _claims: Claims,
    body: ShmSlice,
) -> Result<VilResponse<ExerciseResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let req: ExerciseRequest = body.json().map_err(|_| AppError::Validation("Invalid body".into()))?;

    // Try cached exercise pool first
    let cached = ExercisePoolItem::q()
        .select(&["id", "exercise_data"])
        .where_eq("level", &req.level)
        .where_eq("skill_id", &req.skill_id)
        .limit(1)
        .fetch_optional::<(String, String)>(state.pool.inner())
        .await?;

    if let Some((id, data)) = cached {
        // Pop from pool (consume)
        ExercisePoolItem::delete_where(state.pool.inner(), "id = ?", &[&id]).await?;

        let exercise: serde_json::Value = serde_json::from_str(&data).unwrap_or(serde_json::json!({}));
        return Ok(VilResponse::ok(ExerciseResponse {
            source: "pool".into(),
            exercise: Some(exercise),
            message: None,
        }));
    }

    // No cached exercise — return placeholder (AI generation would go here)
    Ok(VilResponse::ok(ExerciseResponse {
        source: "generate".into(),
        exercise: None,
        message: Some("No cached exercises. AI generation requires GROQ_API_KEY.".to_string()),
    }))
}

// ── Essay Evaluation (AI-powered) ──

#[vil_handler]
pub async fn evaluate_essay(
    ctx: ServiceCtx,
    claims: Claims,
    body: ShmSlice,
) -> Result<VilResponse<EvaluateResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let req: EvaluateEssayRequest = body.json().map_err(|_| AppError::Validation("Invalid body".into()))?;
    
    // Validate essay structure
    let mut warnings: Vec<String> = Vec::new();
    let mut errors: Vec<String> = Vec::new();

    let words: Vec<&str> = req.essay.split_whitespace().collect();
    let word_count = words.len();
    let min_words = if req.task_type == "Task 1" { 150 } else { 250 };

    if word_count < 10 {
        errors.push(format!("Essay is too short to be evaluated ({} words). Minimum required is 10 words.", word_count));
    } else if word_count < min_words {
        warnings.push(format!("Essay is under length: {} words (minimum: {}). This will reduce your score.", word_count, min_words));
    }

    let paragraphs: Vec<&str> = req.essay.split("\n\n").filter(|p| !p.trim().is_empty()).collect();
    if paragraphs.len() < 3 {
        warnings.push(format!("Only {} paragraphs (recommended: 3+)", paragraphs.len()));
    }

    let essay_lower = req.essay.to_lowercase();
    if req.task_type == "Task 1" {
        let keywords = ["overall", "in general", "generally", "overview"];
        if !keywords.iter().any(|kw| essay_lower.contains(kw)) {
            warnings.push("No clear overview detected. Task 1 requires an overview.".to_string());
        }
    } else if req.task_type == "Task 2" {
        let keywords = ["i believe", "i think", "in my opinion", "i agree", "this essay", "will argue", "my point of view"];
        if !keywords.iter().any(|kw| essay_lower.contains(kw)) {
            warnings.push("No clear thesis statement detected.".to_string());
        }
    }

    let sentences: Vec<&str> = req.essay.split(['.', '!', '?']).filter(|s| !s.trim().is_empty()).collect();
    let sentence_count = sentences.len();
    let average_sentence_length = if sentence_count > 0 { word_count as f64 / sentence_count as f64 } else { word_count as f64 };

    let is_valid = errors.is_empty();
    let validation_result = serde_json::json!({
        "isValid": is_valid,
        "warnings": warnings,
        "errors": errors,
        "stats": {
            "wordCount": word_count,
            "paragraphCount": paragraphs.len(),
            "sentenceCount": sentence_count,
            "averageSentenceLength": average_sentence_length
        }
    });

    if !is_valid {
        return Err(AppError::Validation(errors.join(" ")));
    }

    // VIL Guardrails — content safety on evaluation input
    {
        let toxicity = vil::ai::ToxicityChecker::with_defaults();
        if toxicity.score(&req.essay) > 0.7 {
            return Err(AppError::Validation("Essay contains inappropriate content.".into()));
        }
    }

    // Save submission
    let id = uuid::Uuid::new_v4().to_string();
    let uid = claims.sub.clone();
    let task_type = req.task_type.clone();
    let prompt = req.prompt.clone();
    let essay = req.essay.clone();
    WritingSubmission::q()
        .insert_columns(&["id", "user_id", "task_type", "prompt", "user_essay", "word_count", "time_spent_seconds"])
        .value(id.clone()).value(uid).value(task_type)
        .value_opt_str(prompt)
        .value(essay)
        .value(word_count as i64)
        .value_opt_i64(req.time_spent_seconds)
        .execute(state.pool.inner())
        .await?;

    // AI evaluation via Groq (if API key configured)
    if !state.config.groq_api_key.is_empty() {
        // VIL LLM — essay evaluation via OpenAI-compatible Groq provider
        use vil::ai::{ChatMessage as VilChat, OpenAiConfig, OpenAiProvider, LlmProvider};

        let system_prompt = format!(
            "You are an IELTS writing examiner. Evaluate the essay and return JSON with: \
             overall_score (0-9), task_response (0-100), coherence (0-100), \
             lexical_resource (0-100), grammar (0-100), suggestions (array of strings), \
             strengths (string), weaknesses (string). Task type: {}",
            req.task_type
        );
        let user_prompt = format!("Topic: {}\n\nEssay:\n{}", req.prompt.as_deref().unwrap_or("General"), req.essay);

        let provider = OpenAiProvider::new(
            OpenAiConfig::new(&state.config.groq_api_key, "llama-3.3-70b-versatile")
                .base_url("https://api.groq.com/openai/v1")
                .temperature(0.3)
                .max_tokens(1024),
        );

        let messages = vec![
            VilChat::system(system_prompt),
            VilChat::user(user_prompt),
        ];

        if let Ok(response) = provider.chat(&messages).await {
            let content = &response.content;
            let mut feedback: serde_json::Value = serde_json::from_str(content).unwrap_or_default();
            
            // Inject validation result into feedback for frontend convenience
            if let serde_json::Value::Object(ref mut map) = feedback {
                map.insert("validation_result".to_string(), validation_result.clone());
            }

            // Update submission with AI feedback
            WritingSubmission::q()
                .update()
                .set_optional("ai_feedback", Some(&serde_json::to_string(&feedback).unwrap_or_default()))
                .set_optional_i64("ai_score", feedback.get("overall_score").and_then(|v| v.as_i64()))
                .where_eq("id", &id)
                .execute(state.pool.inner())
                .await?;

            // Consume AI token
            let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
            let token_id = uuid::Uuid::new_v4().to_string();
            let token_uid = claims.sub.clone();
            let feature = "essay_eval".to_string();
            AiTokenUsage::q()
                .insert_columns(&["id", "user_id", "date", "tokens_used", "tokens_limit", "feature"])
                .value(token_id).value(token_uid).value(today)
                .value(3_i64).value(15_i64).value(feature)
                .on_conflict("user_id, date")
                .do_update_raw("tokens_used = tokens_used + 3")
                .execute(state.pool.inner())
                .await?;

            return Ok(VilResponse::ok(EvaluateResponse {
                id,
                word_count,
                feedback: Some(feedback),
                message: None,
                validation_result: Some(validation_result),
            }));
        }
    }

    // No AI key — return without feedback
    Ok(VilResponse::ok(EvaluateResponse {
        id,
        word_count,
        feedback: None,
        message: Some("Saved. AI evaluation unavailable (no API key).".to_string()),
        validation_result: Some(validation_result),
    }))
}

// ── Model Essays & Vocabulary ──

#[vil_handler]
pub async fn list_model_essays(
    ctx: ServiceCtx,
    _claims: Claims,
    Query(params): Query<ModelEssayFilter>,
) -> Result<VilResponse<Vec<ModelEssayRow>>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let task_type = params.task_type.as_deref().unwrap_or("%");
    let limit = params.limit.unwrap_or(20).min(50);

    let essays = ModelEssay::q()
        .select(&["id", "topic", "task_type", "word_count", "band_score", "category"])
        .where_raw_bind("task_type LIKE ?", task_type.to_string())
        .order_by_desc("band_score")
        .limit(limit)
        .fetch_all::<ModelEssayRow>(state.pool.inner())
        .await?;

    Ok(VilResponse::ok(essays))
}

#[vil_handler]
pub async fn get_vocabulary(
    ctx: ServiceCtx,
    claims: Claims,
) -> Result<VilResponse<VocabListResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let words = CollectedVocabulary::q()
        .select(&["id", "word", "definition", "cefr_level", "review_count"])
        .where_eq("user_id", &claims.sub)
        .order_by_asc("next_review_at")
        .limit(50)
        .fetch_all::<VocabRow>(state.pool.inner())
        .await?;

    let count = words.len();
    Ok(VilResponse::ok(VocabListResponse { words, count }))
}

#[vil_handler]
pub async fn add_vocabulary(
    ctx: ServiceCtx,
    claims: Claims,
    body: ShmSlice,
) -> Result<VilResponse<OkResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let req: AddVocabRequest = body.json().map_err(|_| AppError::Validation("Invalid body".into()))?;

    let vocab_id = uuid::Uuid::new_v4().to_string();
    let uid = claims.sub.clone();
    let word = req.word.clone();
    let definition = req.definition.clone();
    let cefr_level = req.cefr_level.clone();
    let example_sentence = req.example_sentence.clone();
    let source_essay_id = req.source_essay_id.clone();
    CollectedVocabulary::q()
        .insert_columns(&["id", "user_id", "word", "definition", "cefr_level", "example_sentence", "source_essay_id"])
        .value(vocab_id).value(uid).value(word)
        .value_opt_str(definition)
        .value_opt_str(cefr_level)
        .value_opt_str(example_sentence)
        .value_opt_str(source_essay_id)
        .execute(state.pool.inner())
        .await?;

    Ok(VilResponse::created(OkResponse { ok: true }))
}

// ── Devils Advocate ──

#[vil_handler]
pub async fn devils_advocate(
    ctx: ServiceCtx,
    claims: Claims,
    body: ShmSlice,
) -> Result<VilResponse<DevilsAdvocateResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let req: DevilsAdvocateRequest = body.json().map_err(|_| AppError::Validation("Invalid body".into()))?;
    let id = uuid::Uuid::new_v4().to_string();

    let da_uid = claims.sub.clone();
    let argument = req.user_argument.clone();
    DevilsAdvocateSession::q()
        .insert_columns(&["id", "user_id", "user_argument", "time_spent_seconds"])
        .value(id.clone()).value(da_uid).value(argument)
        .value_opt_i64(req.time_spent_seconds)
        .execute(state.pool.inner())
        .await?;

    // VIL LLM — devils advocate via Groq
    if !state.config.groq_api_key.is_empty() {
        use vil::ai::{ChatMessage as VilChat, OpenAiConfig, OpenAiProvider, LlmProvider};

        let provider = OpenAiProvider::new(
            OpenAiConfig::new(&state.config.groq_api_key, "llama-3.1-8b-instant")
                .base_url("https://api.groq.com/openai/v1")
                .temperature(0.5)
                .max_tokens(1024),
        );

        let messages = vec![
            VilChat::system("You are a devil's advocate. Challenge the user's argument with a strong counter-point. Return JSON: {counter_point, logical_fallacy_check, score (0-100), feedback, suggested_starters: []}"),
            VilChat::user(&req.user_argument),
        ];

        if let Ok(response) = provider.chat(&messages).await {
            let ai: serde_json::Value = serde_json::from_str(&response.content).unwrap_or_default();

            DevilsAdvocateSession::q()
                .update()
                .set_optional("counter_point", ai.get("counter_point").and_then(|v| v.as_str()))
                .set_optional_i64("score", ai.get("score").and_then(|v| v.as_i64()))
                .set_optional("feedback", ai.get("feedback").and_then(|v| v.as_str()))
                .where_eq("id", &id)
                .execute(state.pool.inner())
                .await?;

            return Ok(VilResponse::ok(DevilsAdvocateResponse { id, ai_response: Some(ai) }));
        }
    }

    Ok(VilResponse::ok(DevilsAdvocateResponse { id, ai_response: None }))
}

// ── Peer Review (already implemented above) ──

#[vil_handler]
pub async fn submit_essay(
    ctx: ServiceCtx,
    claims: Claims,
    body: ShmSlice,
) -> Result<VilResponse<PeerReviewSubmission>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let req: SubmitEssayRequest = body.json().map_err(|_| AppError::Validation("Invalid body".into()))?;

    // VIL Guardrails — content safety check
    {
        use vil::ai::{GuardrailsEngine, PiiDetector, ToxicityChecker};

        let engine = GuardrailsEngine::new();
        let _result = engine.check(&req.essay_content);

        // PII detection
        let pii = PiiDetector::new();
        let pii_matches = pii.detect(&req.essay_content);
        if !pii_matches.is_empty() {
            return Err(AppError::Validation(
                "Essay contains personal information (PII). Please remove before submitting.".into(),
            ));
        }

        // Toxicity check
        let toxicity = ToxicityChecker::with_defaults();
        let score = toxicity.score(&req.essay_content);
        if score > 0.7 {
            return Err(AppError::Validation(
                "Essay contains inappropriate content.".into(),
            ));
        }
    }

    let id = uuid::Uuid::new_v4().to_string();
    let word_count = req.essay_content.split_whitespace().count() as i64;

    let sub_uid = claims.sub.clone();
    let essay_content = req.essay_content.clone();
    let prompt = req.prompt.clone();
    let task_type = req.task_type.clone();
    let is_anon = if req.is_anonymous.unwrap_or(false) { 1i32 } else { 0i32 };
    let status = "pending".to_string();
    let mod_status = "approved".to_string();
    PeerReviewSubmission::q()
        .insert_columns(&["id", "user_id", "essay_content", "prompt", "task_type", "word_count", "is_anonymous", "status", "moderation_status"])
        .value(id.clone()).value(sub_uid).value(essay_content)
        .value_opt_str(prompt)
        .value(task_type).value(word_count).value(is_anon)
        .value(status).value(mod_status)
        .execute(state.pool.inner())
        .await?;

    let submission = PeerReviewSubmission::find_by_id(state.pool.inner(), &id)
        .await?
        .ok_or_else(|| AppError::NotFound("Submission not found".into()))?;

    Ok(VilResponse::created(submission))
}

#[vil_handler]
pub async fn review_queue(
    ctx: ServiceCtx,
    claims: Claims,
) -> Result<VilResponse<Vec<PeerReviewSubmission>>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let rows = PeerReviewSubmission::q()
        .select(&["*"])
        .where_raw("status = 'pending'")
        .where_raw("claimed_by IS NULL")
        .where_ne("user_id", &claims.sub)
        .order_by_asc("created_at")
        .limit(20)
        .fetch_all::<PeerReviewSubmission>(state.pool.inner())
        .await?;
    Ok(VilResponse::ok(rows))
}

#[vil_handler]
pub async fn submit_review(
    ctx: ServiceCtx,
    claims: Claims,
    body: ShmSlice,
) -> Result<VilResponse<ReviewResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let req: SubmitReviewRequest = body.json().map_err(|_| AppError::Validation("Invalid body".into()))?;
    let id = uuid::Uuid::new_v4().to_string();
    let band = (req.task_response_score + req.coherence_score + req.lexical_score + req.grammar_score) as f64 / 4.0;

    let review_uid = claims.sub.clone();
    let submission_id = req.submission_id.clone();
    let strengths = req.strengths.clone();
    let weaknesses = req.weaknesses.clone();
    let suggestions = req.suggestions.clone();
    let inline_corrections = req.inline_corrections.clone();
    PeerReview::q()
        .insert_columns(&["id", "submission_id", "reviewer_id", "task_response_score", "coherence_score", "lexical_score", "grammar_score", "overall_band", "strengths", "weaknesses", "suggestions", "inline_corrections", "time_spent_seconds"])
        .value(id.clone()).value(submission_id).value(review_uid)
        .value(req.task_response_score).value(req.coherence_score)
        .value(req.lexical_score).value(req.grammar_score)
        .value(band)
        .value_opt_str(strengths)
        .value_opt_str(weaknesses)
        .value_opt_str(suggestions)
        .value_opt_str(inline_corrections)
        .value_opt_i64(req.time_spent_seconds)
        .execute(state.pool.inner())
        .await?;

    PeerReviewSubmission::update_where(state.pool.inner(), "status = 'completed'", "id = ?", &[&req.submission_id]).await?;

    // XP for reviewer
    award_public_xp(&state.pool, &claims.sub, 25).await?;

    Ok(VilResponse::created(ReviewResponse { ok: true, id, overall_band: band }))
}
