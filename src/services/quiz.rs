use crate::error::AppError;
use crate::middleware::auth::Claims;
use crate::models::profile::Profile;
use crate::models::quiz::*;
use crate::models::responses::*;
use vil_orm::vil_args;
use vil::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuestionListResponse {
    pub questions: Vec<Question>,
    pub total: i64,
}

#[vil_handler]
pub async fn list_questions(
    ctx: ServiceCtx,
    _claims: Claims,
    Query(filter): Query<QuestionFilter>,
) -> Result<VilResponse<Vec<Question>>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let limit = filter.limit.unwrap_or(20).min(100);

    let mut q = Question::q().select(&["*"]);
    if let Some(ref s) = filter.section {
        q = q.where_eq("section", s);
    }
    if let Some(sid) = filter.skill_id {
        q = q.where_eq_val("skill_id", sid);
    }
    if let Some(ref c) = filter.cefr {
        q = q.where_eq("cefr_target", c);
    }
    q = q.limit(limit);

    let questions = q.fetch_all::<Question>(state.pool.inner()).await?;
    Ok(VilResponse::ok(questions))
}

#[vil_handler]
pub async fn simulation(
    ctx: ServiceCtx,
    _claims: Claims,
    Query(filter): Query<QuestionFilter>,
) -> Result<VilResponse<Vec<Question>>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let limit = filter.limit.unwrap_or(30).min(50);
    let questions = Question::q()
        .select(&["*"])
        .order_by_raw("RANDOM()")
        .limit(limit)
        .fetch_all::<Question>(state.pool.inner())
        .await?;

    Ok(VilResponse::ok(questions))
}

#[vil_handler]
pub async fn save_result(
    ctx: ServiceCtx,
    claims: Claims,
    body: ShmSlice,
) -> Result<VilResponse<SaveResultResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let req: SaveResultRequest = body.json().map_err(|_| AppError::Validation("Invalid body".into()))?;
    let id = uuid::Uuid::new_v4().to_string();
    let xp = (req.correct_count as f64 / req.total_questions.max(1) as f64 * 100.0) as i64;
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    QuizResult::q()
        .insert_columns(&["id", "user_id", "date", "skill_id", "section", "score", "correct_count", "total_questions", "xp_earned"])
        .value(id.clone())
        .value(claims.sub.clone())
        .value(now)
        .value_opt_str(req.skill_id.clone())
        .value(req.section.clone())
        .value(req.score)
        .value(req.correct_count)
        .value(req.total_questions)
        .value(xp)
        .execute(state.pool.inner())
        .await?;

    let user_id = claims.sub.clone();
    Profile::update_v(
        state.pool.inner(),
        "xp = xp + ?",
        "id = ?",
        vil_args![xp, user_id],
    )
    .await?;

    Ok(VilResponse::created(SaveResultResponse { ok: true, id, xp_earned: xp }))
}

#[vil_handler]
pub async fn history(
    ctx: ServiceCtx,
    claims: Claims,
) -> Result<VilResponse<Vec<QuizResult>>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let results = QuizResult::find_all_where(
        state.pool.inner(),
        "user_id = ? ORDER BY date DESC LIMIT 100",
        &[&claims.sub],
    )
    .await?;
    Ok(VilResponse::ok(results))
}

#[vil_handler]
pub async fn progress(
    ctx: ServiceCtx,
    claims: Claims,
) -> Result<VilResponse<ProgressResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let row = QuizResult::q()
        .select_expr("COUNT(*), COALESCE(SUM(correct_count),0), COALESCE(SUM(xp_earned),0), COUNT(DISTINCT skill_id)")
        .where_eq("user_id", &claims.sub)
        .fetch_one::<(i64, i64, i64, i64)>(state.pool.inner())
        .await
        .unwrap_or((0, 0, 0, 0));

    Ok(VilResponse::ok(ProgressResponse {
        total_quizzes: row.0,
        total_correct: row.1,
        total_xp: row.2,
        unique_skills: row.3,
        level: (row.2 / 500) + 1,
    }))
}

// ── Passage Endpoints ──

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PassageResponse {
    pub id: String,
    pub topic: Option<String>,
    pub content: String,
    pub source: Option<String>,
    pub difficulty: Option<String>,
    pub word_count: Option<i64>,
    pub created_at: String,
}

#[vil_handler]
pub async fn get_passage(
    ctx: ServiceCtx,
    Path(passage_id): Path<String>,
) -> Result<VilResponse<PassageResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    
    let passage: Option<PassageResponse> = sqlx::query_as(
        "SELECT id, topic, content, source, difficulty, word_count, created_at FROM passages WHERE id = ?"
    )
    .bind(&passage_id)
    .fetch_optional(state.pool.inner())
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?;
    
    match passage {
        Some(p) => Ok(VilResponse::ok(p)),
        None => Err(AppError::NotFound("Passage not found".into())),
    }
}

#[vil_handler]
pub async fn save_passage(
    ctx: ServiceCtx,
    body: ShmSlice,
) -> Result<VilResponse<PassageResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let req: PassageCreateRequest = body.json().map_err(|_| AppError::Validation("Invalid body".into()))?;

    let word_count = req.content.split_whitespace().count() as i64;
    let id = uuid::Uuid::new_v4().to_string();

    sqlx::query(
        "INSERT INTO passages (id, topic, content, source, difficulty, word_count) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(&req.topic)
    .bind(&req.content)
    .bind(&req.source)
    .bind(&req.difficulty)
    .bind(word_count)
    .execute(state.pool.inner())
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?;

    let passage: PassageResponse = sqlx::query_as(
        "SELECT id, topic, content, source, difficulty, word_count, created_at FROM passages WHERE id = ?"
    )
    .bind(&id)
    .fetch_one(state.pool.inner())
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(VilResponse::created(passage))
}

// ── Question Bank CRUD Endpoints ──

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct QuestionCountResponse {
    pub count: i64,
}

#[vil_handler]
pub async fn get_question_count(
    _ctx: ServiceCtx,
) -> Result<VilResponse<QuestionCountResponse>, AppError> {
    Err(AppError::Internal("Not implemented".into()))
}

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub page: Option<i64>,
    pub limit: Option<i64>,
    pub section: Option<String>,
}

#[vil_handler]
pub async fn get_questions_paginated(
    ctx: ServiceCtx,
    Query(params): Query<PaginationParams>,
) -> Result<VilResponse<QuestionListResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let limit = params.limit.unwrap_or(20).min(100) as i64;
    let page = params.page.unwrap_or(1).max(1);
    let offset = (page - 1) * limit;

    let section_filter = params.section.as_ref()
        .map(|s| format!("WHERE section = '{}'", s))
        .unwrap_or_default();

    let count_query = format!("SELECT COUNT(*) FROM question_bank {}", section_filter);
    let count: (i64,) = sqlx::query_as(&count_query)
        .fetch_one(state.pool.inner())
        .await
        .unwrap_or((0,));

    let data_query = format!(
        "SELECT id, skill_id, section, interaction, stimulus, prompt, choices, correct_response, cefr_target, difficulty_score, passage_id, metadata, created_at FROM question_bank {} ORDER BY created_at DESC LIMIT {} OFFSET {}",
        section_filter, limit, offset
    );

    let questions: Vec<Question> = sqlx::query_as(&data_query)
        .fetch_all(state.pool.inner())
        .await
        .unwrap_or_default();

    Ok(VilResponse::ok(QuestionListResponse {
        questions,
        total: count.0,
    }))
}

#[derive(Debug, Deserialize)]
pub struct SkillParams {
    pub skill_id: i64,
    pub limit: Option<i64>,
}

#[vil_handler]
pub async fn get_questions_by_skill(
    ctx: ServiceCtx,
    Query(params): Query<SkillParams>,
) -> Result<VilResponse<Vec<Question>>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let limit = params.limit.unwrap_or(50) as i64;

    let questions: Vec<Question> = sqlx::query_as(
        "SELECT id, skill_id, section, interaction, stimulus, prompt, choices, correct_response, cefr_target, difficulty_score, passage_id, metadata, created_at FROM question_bank WHERE skill_id = ? LIMIT ?"
    )
    .bind(params.skill_id)
    .bind(limit)
    .fetch_all(state.pool.inner())
    .await
    .unwrap_or_default();

    Ok(VilResponse::ok(questions))
}

#[vil_handler]
pub async fn get_question(
    ctx: ServiceCtx,
    Path(id): Path<String>,
) -> Result<VilResponse<Question>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    
    let question: Option<Question> = sqlx::query_as(
        "SELECT id, skill_id, section, interaction, stimulus, prompt, choices, correct_response, cefr_target, difficulty_score, passage_id, metadata, created_at FROM question_bank WHERE id = ?"
    )
    .bind(&id)
    .fetch_optional(state.pool.inner())
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?;
    
    match question {
        Some(q) => Ok(VilResponse::ok(q)),
        None => Err(AppError::NotFound("Question not found".into())),
    }
}

#[vil_handler]
pub async fn create_question(
    ctx: ServiceCtx,
    body: ShmSlice,
) -> Result<VilResponse<Question>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let req: QuestionCreateRequest = body.json().map_err(|_| AppError::Validation("Invalid body".into()))?;

    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    let choices_json = req.choices.as_ref().map(|c| serde_json::to_string(c).unwrap_or_default());
    let correct_json = req.correct_response.as_ref().map(|c| serde_json::to_string(c).unwrap_or_default());
    let cefr = req.cefr_target.unwrap_or_else(|| "B2".to_string());
    let difficulty = req.difficulty_score.unwrap_or(50);

    sqlx::query(
        "INSERT INTO question_bank (id, skill_id, section, interaction, prompt, choices, correct_response, cefr_target, difficulty_score, passage_id, stimulus, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(req.skill_id)
    .bind(&req.section)
    .bind(&req.interaction)
    .bind(&req.prompt)
    .bind(&choices_json)
    .bind(&correct_json)
    .bind(&cefr)
    .bind(difficulty)
    .bind(&req.passage_id)
    .bind(&req.stimulus)
    .bind(&req.metadata)
    .bind(&now)
    .execute(state.pool.inner())
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?;

    let question: Question = sqlx::query_as(
        "SELECT id, skill_id, section, interaction, stimulus, prompt, choices, correct_response, cefr_target, difficulty_score, passage_id, metadata, created_at FROM question_bank WHERE id = ?"
    )
    .bind(&id)
    .fetch_one(state.pool.inner())
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(VilResponse::created(question))
}

#[vil_handler]
pub async fn update_question(
    ctx: ServiceCtx,
    Path(id): Path<String>,
    body: ShmSlice,
) -> Result<VilResponse<Question>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let req: QuestionUpdateRequest = body.json().map_err(|_| AppError::Validation("Invalid body".into()))?;

    let existing: Option<Question> = sqlx::query_as(
        "SELECT id, skill_id, section, interaction, stimulus, prompt, choices, correct_response, cefr_target, difficulty_score, passage_id, metadata, created_at FROM question_bank WHERE id = ?"
    )
    .bind(&id)
    .fetch_optional(state.pool.inner())
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?;

    let existing = match existing {
        Some(q) => q,
        None => return Err(AppError::NotFound("Question not found".into())),
    };

    let skill_id = req.skill_id.unwrap_or(existing.skill_id);
    let section = req.section.unwrap_or(existing.section);
    let interaction = req.interaction.unwrap_or(existing.interaction);
    let prompt = req.prompt.unwrap_or(existing.prompt);
    let cefr = req.cefr_target.or(existing.cefr_target);
    let difficulty = req.difficulty_score.or(existing.difficulty_score);
    let passage_id = req.passage_id.or(existing.passage_id);
    let stimulus = req.stimulus.or(existing.stimulus);
    let metadata = req.metadata.or(existing.metadata);

    let choices_json = req.choices.as_ref()
        .map(|c| serde_json::to_string(c).unwrap_or_default())
        .or(existing.choices);

    let correct_json = req.correct_response.as_ref()
        .map(|c| serde_json::to_string(c).unwrap_or_default())
        .or(existing.correct_response);

    sqlx::query(
        "UPDATE question_bank SET skill_id = ?, section = ?, interaction = ?, prompt = ?, choices = ?, correct_response = ?, cefr_target = ?, difficulty_score = ?, passage_id = ?, stimulus = ?, metadata = ? WHERE id = ?"
    )
    .bind(skill_id)
    .bind(&section)
    .bind(&interaction)
    .bind(&prompt)
    .bind(&choices_json)
    .bind(&correct_json)
    .bind(&cefr)
    .bind(difficulty)
    .bind(&passage_id)
    .bind(&stimulus)
    .bind(&metadata)
    .bind(&id)
    .execute(state.pool.inner())
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?;

    let question: Question = sqlx::query_as(
        "SELECT id, skill_id, section, interaction, stimulus, prompt, choices, correct_response, cefr_target, difficulty_score, passage_id, metadata, created_at FROM question_bank WHERE id = ?"
    )
    .bind(&id)
    .fetch_one(state.pool.inner())
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(VilResponse::ok(question))
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DeleteResponse {
    pub ok: bool,
}

#[vil_handler]
pub async fn delete_question(
    ctx: ServiceCtx,
    Path(id): Path<String>,
) -> Result<VilResponse<DeleteResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;

    let result = sqlx::query("DELETE FROM question_bank WHERE id = ?")
        .bind(&id)
        .execute(state.pool.inner())
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Question not found".into()));
    }

    Ok(VilResponse::ok(DeleteResponse { ok: true }))
}
