use crate::error::AppError;
use crate::middleware::auth::Claims;
use crate::models::profile::Profile;
use crate::models::quiz::*;
use crate::models::responses::*;
use vil_orm::vil_args;
use vil::prelude::*;
use crate::services::quiz_prompts::get_system_prompt;
use vil::ai::{ChatMessage as VilChat, LlmProvider, OpenAiConfig, OpenAiProvider};
use serde_json::Value;

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

    // Update UserPerformanceMetrics
    let mut row = UserPerformanceMetrics::find_where(
        state.pool.inner(),
        "user_id = ?",
        &[&claims.sub],
    )
    .await?
    .unwrap_or_else(|| UserPerformanceMetrics {
        id: uuid::Uuid::new_v4().to_string(),
        user_id: claims.sub.clone(),
        total_questions: 0,
        correct_answers: 0,
        accuracy_by_section: "{}".to_string(),
        accuracy_by_skill: "{}".to_string(),
        recent_accuracy: "[]".to_string(),
        average_response_time: 0.0,
        current_difficulty: "medium".to_string(),
        last_updated: chrono::Utc::now().timestamp_millis(),
    });

    let mut accuracy_by_section: std::collections::HashMap<String, SectionAccuracy> = serde_json::from_str(&row.accuracy_by_section).unwrap_or_default();
    let mut accuracy_by_skill: std::collections::HashMap<String, SectionAccuracy> = serde_json::from_str(&row.accuracy_by_skill).unwrap_or_default();
    let mut recent_accuracy: Vec<i64> = serde_json::from_str(&row.recent_accuracy).unwrap_or_default();

    row.total_questions += req.total_questions;
    row.correct_answers += req.correct_count;

    let section_entry = accuracy_by_section.entry(req.section.clone()).or_insert(SectionAccuracy { correct: 0, total: 0 });
    section_entry.total += req.total_questions;
    section_entry.correct += req.correct_count;

    if let Some(skill) = &req.skill_id {
        let skill_entry = accuracy_by_skill.entry(skill.clone()).or_insert(SectionAccuracy { correct: 0, total: 0 });
        skill_entry.total += req.total_questions;
        skill_entry.correct += req.correct_count;
    }

    recent_accuracy.extend(std::iter::repeat_n(1, req.correct_count as usize));
    recent_accuracy.extend(std::iter::repeat_n(0, (req.total_questions - req.correct_count) as usize));
    while recent_accuracy.len() > 20 {
        recent_accuracy.remove(0);
    }

    // Adjust difficulty
    if recent_accuracy.len() >= 5 {
        let recent_correct: i64 = recent_accuracy.iter().sum();
        let accuracy = recent_correct as f64 / recent_accuracy.len() as f64;
        let threshold = 0.2;

        if accuracy > 0.75 + threshold && row.current_difficulty != "hard" {
            row.current_difficulty = if row.current_difficulty == "easy" { "medium".to_string() } else { "hard".to_string() };
            recent_accuracy.clear();
        } else if accuracy < 0.45 - threshold && row.current_difficulty != "easy" {
            row.current_difficulty = if row.current_difficulty == "hard" { "medium".to_string() } else { "easy".to_string() };
            recent_accuracy.clear();
        }
    }

    row.accuracy_by_section = serde_json::to_string(&accuracy_by_section).unwrap_or_else(|_| "{}".to_string());
    row.accuracy_by_skill = serde_json::to_string(&accuracy_by_skill).unwrap_or_else(|_| "{}".to_string());
    row.recent_accuracy = serde_json::to_string(&recent_accuracy).unwrap_or_else(|_| "[]".to_string());
    row.last_updated = chrono::Utc::now().timestamp_millis();

    if row.total_questions == req.total_questions {
        sqlx::query(
            "INSERT INTO user_performance_metrics (id, user_id, total_questions, correct_answers, accuracy_by_section, accuracy_by_skill, recent_accuracy, average_response_time, current_difficulty, last_updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&row.id).bind(&row.user_id).bind(row.total_questions).bind(row.correct_answers)
        .bind(&row.accuracy_by_section).bind(&row.accuracy_by_skill).bind(&row.recent_accuracy)
        .bind(row.average_response_time).bind(&row.current_difficulty).bind(row.last_updated)
        .execute(state.pool.inner()).await.map_err(|e| AppError::Internal(e.to_string()))?;
    } else {
        sqlx::query(
            "UPDATE user_performance_metrics SET total_questions = ?, correct_answers = ?, accuracy_by_section = ?, accuracy_by_skill = ?, recent_accuracy = ?, average_response_time = ?, current_difficulty = ?, last_updated = ? WHERE id = ?"
        )
        .bind(row.total_questions).bind(row.correct_answers).bind(&row.accuracy_by_section).bind(&row.accuracy_by_skill)
        .bind(&row.recent_accuracy).bind(row.average_response_time).bind(&row.current_difficulty).bind(row.last_updated).bind(&row.id)
        .execute(state.pool.inner()).await.map_err(|e| AppError::Internal(e.to_string()))?;
    }

    Ok(VilResponse::created(SaveResultResponse {
        ok: true,
        id,
        xp_earned: xp,
        next_difficulty_level: Some(row.current_difficulty),
    }))
}

#[derive(Debug, Deserialize)]
pub struct SaveQuizReportRequest {
    pub skill_id: Option<String>,
    pub section: Option<String>,
    pub student_name: String,
    pub quiz_topic: String,
    pub score: i64,
    pub correct_count: i64,
    pub total_questions: i64,
    pub answers_snapshot: serde_json::Value,
}

#[vil_handler]
pub async fn save_report(
    ctx: ServiceCtx,
    claims: Claims,
    body: ShmSlice,
) -> Result<VilResponse<OkWithIdResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let req: SaveQuizReportRequest = body.json().map_err(|_| AppError::Validation("Invalid body".into()))?;

    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let answers_json = serde_json::to_string(&req.answers_snapshot).map_err(|_| AppError::Validation("Invalid answers_snapshot".into()))?;

    sqlx::query(
        "INSERT INTO quiz_reports (id, user_id, skill_id, section, student_name, quiz_topic, score, correct_count, total_questions, answers_snapshot, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&claims.sub)
    .bind(&req.skill_id)
    .bind(&req.section)
    .bind(&req.student_name)
    .bind(&req.quiz_topic)
    .bind(req.score)
    .bind(req.correct_count)
    .bind(req.total_questions)
    .bind(answers_json)
    .bind(now)
    .execute(state.pool.inner())
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(VilResponse::created(OkWithIdResponse { ok: true, id }))
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct QuizReportRow {
    pub id: String,
    pub student_name: String,
    pub quiz_topic: String,
    pub score: i64,
    pub total_questions: i64,
    pub correct_count: i64,
    pub created_at: String,
    pub answers_snapshot: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuizReportResponse {
    pub id: String,
    pub student_name: String,
    pub quiz_topic: String,
    pub score: i64,
    pub total_questions: i64,
    pub correct_count: i64,
    pub created_at: String,
    pub answers_snapshot: serde_json::Value,
}

#[vil_handler]
pub async fn get_report(
    ctx: ServiceCtx,
    _claims: Option<Claims>,
    Path(report_id): Path<String>,
) -> Result<VilResponse<QuizReportResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;

    let row: Option<QuizReportRow> = sqlx::query_as(
        "SELECT id, student_name, quiz_topic, score, total_questions, correct_count, created_at, answers_snapshot FROM quiz_reports WHERE id = ?",
    )
    .bind(&report_id)
    .fetch_optional(state.pool.inner())
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?;

    let row = row.ok_or_else(|| AppError::NotFound("Report not found".into()))?;
    let answers_snapshot: serde_json::Value = serde_json::from_str(&row.answers_snapshot).unwrap_or(serde_json::Value::Null);

    Ok(VilResponse::ok(QuizReportResponse {
        id: row.id,
        student_name: row.student_name,
        quiz_topic: row.quiz_topic,
        score: row.score,
        total_questions: row.total_questions,
        correct_count: row.correct_count,
        created_at: row.created_at,
        answers_snapshot,
    }))
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

#[derive(Debug, Deserialize)]
pub struct QuestionCountParams {
    pub section: Option<String>,
}

#[vil_handler]
pub async fn get_question_count(
    ctx: ServiceCtx,
    Query(params): Query<QuestionCountParams>,
) -> Result<VilResponse<QuestionCountResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;

    let res = match params.section {
        Some(section) => {
            sqlx::query_as::<_, QuestionCountResponse>(
                "SELECT CAST(COUNT(*) AS INTEGER) AS count FROM question_bank WHERE section = ?",
            )
            .bind(section)
            .fetch_one(state.pool.inner())
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?
        }
        None => {
            sqlx::query_as::<_, QuestionCountResponse>(
                "SELECT CAST(COUNT(*) AS INTEGER) AS count FROM question_bank",
            )
            .fetch_one(state.pool.inner())
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?
        }
    };

    Ok(VilResponse::ok(res))
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
    let limit = params.limit.unwrap_or(20).min(100);
    let page = params.page.unwrap_or(1).max(1);
    let offset = (page - 1) * limit;

    let (total, questions) = match params.section {
        Some(section) => {
            let total: (i64,) = sqlx::query_as(
                "SELECT CAST(COUNT(*) AS INTEGER) FROM question_bank WHERE section = ?",
            )
            .bind(&section)
            .fetch_one(state.pool.inner())
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

            let questions: Vec<Question> = sqlx::query_as(
                "SELECT id, skill_id, section, interaction, stimulus, prompt, choices, correct_response, cefr_target, difficulty_score, passage_id, metadata, created_at FROM question_bank WHERE section = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
            )
            .bind(section)
            .bind(limit)
            .bind(offset)
            .fetch_all(state.pool.inner())
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

            (total.0, questions)
        }
        None => {
            let total: (i64,) = sqlx::query_as("SELECT CAST(COUNT(*) AS INTEGER) FROM question_bank")
                .fetch_one(state.pool.inner())
                .await
                .map_err(|e| AppError::Internal(e.to_string()))?;

            let questions: Vec<Question> = sqlx::query_as(
                "SELECT id, skill_id, section, interaction, stimulus, prompt, choices, correct_response, cefr_target, difficulty_score, passage_id, metadata, created_at FROM question_bank ORDER BY created_at DESC LIMIT ? OFFSET ?",
            )
            .bind(limit)
            .bind(offset)
            .fetch_all(state.pool.inner())
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

            (total.0, questions)
        }
    };

    Ok(VilResponse::ok(QuestionListResponse {
        questions,
        total,
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
    let limit = params.limit.unwrap_or(50);

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

#[vil_handler]
pub async fn generate_quiz(
    ctx: ServiceCtx,
    _claims: Option<Claims>,
    body: ShmSlice,
) -> Result<VilResponse<QuizGenerateResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let req: QuizGenerateRequest = body.json().map_err(|_| AppError::Validation("Invalid body".into()))?;

    let count = req.count.unwrap_or(5);
    let skill_id = req.skill_id_override.unwrap_or(1);
    let section = req.section.to_lowercase();

    let offline_questions = || -> Vec<GeneratedQuestion> {
        let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
        let topic = req.topic.trim();
        let base_meta = serde_json::json!({ "source": "ai", "offline": true });

        match section.as_str() {
            "written" => (0..count)
                .map(|i| GeneratedQuestion {
                    id: uuid::Uuid::new_v4().to_string(),
                    skill_id: skill_id.clamp(20, 60),
                    section: "written".to_string(),
                    interaction: "identify_error".to_string(),
                    stimulus: None,
                    prompt: format!(
                        "In the following sentence about {topic}, identify the underlined error: \
{{A}}The report{{/A}} {{B}}were{{/B}} {{C}}completed{{/C}} {{D}}on time{{/D}}. (Item {})",
                        i + 1
                    ),
                    choices: Some(vec!["A".to_string(), "B".to_string(), "C".to_string(), "D".to_string()]),
                    correct_response: Some(vec!["B".to_string()]),
                    cefr_target: Some("B1".to_string()),
                    difficulty_score: Some(50),
                    passage_id: None,
                    metadata: Some(base_meta.clone()),
                    created_at: now.clone(),
                })
                .collect(),
            "reading" => {
                let passage = format!(
                    "Reading passage (offline) about {topic}: {topic} is an important academic subject. \
This passage is generated as an offline fallback for QA testing when AI services are unavailable. \
It provides enough length to satisfy client-side validation and allows multiple-choice questions to load properly. \
Students can practice identifying main ideas, details, and inferences based on the passage content."
                );

                (0..count)
                    .map(|i| GeneratedQuestion {
                        id: uuid::Uuid::new_v4().to_string(),
                        skill_id: skill_id.max(101),
                        section: "reading".to_string(),
                        interaction: "multiple_choice".to_string(),
                        stimulus: Some(serde_json::json!({ "text": passage })),
                        prompt: format!("What is the main purpose of the passage? (Item {})", i + 1),
                        choices: Some(vec![
                            "To explain a study topic".to_string(),
                            "To advertise a product".to_string(),
                            "To describe a fictional story".to_string(),
                            "To list unrelated words".to_string(),
                        ]),
                        correct_response: Some(vec!["To explain a study topic".to_string()]),
                        cefr_target: Some("B1".to_string()),
                        difficulty_score: Some(50),
                        passage_id: None,
                        metadata: Some(base_meta.clone()),
                        created_at: now.clone(),
                    })
                    .collect()
            }
            "listening" => (0..count)
                .map(|i| GeneratedQuestion {
                    id: uuid::Uuid::new_v4().to_string(),
                    skill_id: skill_id.max(201),
                    section: "listening".to_string(),
                    interaction: "multiple_choice".to_string(),
                    stimulus: Some(serde_json::json!({
                        "text": format!("Listening transcript (offline) about {topic}: The professor discusses key points related to {topic} in a short lecture.")
                    })),
                    prompt: format!("What is the lecture mainly about? (Item {})", i + 1),
                    choices: Some(vec![
                        format!("{topic} basics"),
                        "Cooking techniques".to_string(),
                        "Sports results".to_string(),
                        "Fashion trends".to_string(),
                    ]),
                    correct_response: Some(vec![format!("{topic} basics")]),
                    cefr_target: Some("B1".to_string()),
                    difficulty_score: Some(50),
                    passage_id: None,
                    metadata: Some(base_meta.clone()),
                    created_at: now.clone(),
                })
                .collect(),
            _ => (0..count)
                .map(|i| GeneratedQuestion {
                    id: uuid::Uuid::new_v4().to_string(),
                    skill_id: skill_id.clamp(1, 19),
                    section: "structure".to_string(),
                    interaction: "fill_blank".to_string(),
                    stimulus: None,
                    prompt: format!(
                        "Choose the best word to complete the sentence about {topic}: Students _____ to practice every day. (Item {})",
                        i + 1
                    ),
                    choices: Some(vec![
                        "go".to_string(),
                        "goes".to_string(),
                        "going".to_string(),
                        "gone".to_string(),
                    ]),
                    correct_response: Some(vec!["go".to_string()]),
                    cefr_target: Some("B1".to_string()),
                    difficulty_score: Some(50),
                    passage_id: None,
                    metadata: Some(base_meta.clone()),
                    created_at: now.clone(),
                })
                .collect(),
        }
    };

    if state.config.groq_api_key.is_empty() {
        return Ok(VilResponse::ok(QuizGenerateResponse { questions: offline_questions() }));
    }
    let system_prompt = get_system_prompt(&req.section);
    let user_prompt = format!("Generate {} UNIQUE questions for Skill ID {}. Topic: {}.", count, skill_id, req.topic);

    let provider = OpenAiProvider::new(
        OpenAiConfig::new(&state.config.groq_api_key, "llama-3.3-70b-versatile")
            .base_url("https://api.groq.com/openai/v1")
            .temperature(0.5)
            .max_tokens(4096),
    );

    let messages = vec![
        VilChat::system(&system_prompt),
        VilChat::user(&user_prompt),
    ];

    let response = match provider.chat(&messages).await {
        Ok(r) => r,
        Err(_) => {
            return Ok(VilResponse::ok(QuizGenerateResponse { questions: offline_questions() }));
        }
    };

    let content = response.content;
    // Extract JSON from possible markdown response
    let json_str = if content.contains("```json") {
        let parts: Vec<&str> = content.split("```json").collect();
        if parts.len() > 1 {
            let inner_parts: Vec<&str> = parts[1].split("```").collect();
            inner_parts[0].trim()
        } else {
            content.trim()
        }
    } else {
        content.trim()
    };

    let parsed: Value = serde_json::from_str(json_str).map_err(|_| AppError::Validation("Failed to parse LLM JSON".into()))?;
    
    let questions_val = if let Some(q) = parsed.get("questions") {
        q.clone()
    } else if parsed.is_array() {
        parsed
    } else {
        Value::Array(vec![])
    };

    let mut questions = Vec::new();
    if let Value::Array(arr) = questions_val {
        for mut q_val in arr {
            if let Some(obj) = q_val.as_object_mut() {
                obj.insert("id".to_string(), Value::String(uuid::Uuid::new_v4().to_string()));
                obj.insert(
                    "created_at".to_string(),
                    Value::String(chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string()),
                );

                for key in ["choices", "correct_response", "stimulus", "metadata"] {
                    if let Some(Value::String(s)) = obj.get(key) {
                        if let Ok(v) = serde_json::from_str::<Value>(s) {
                            obj.insert(key.to_string(), v);
                        }
                    }
                }

                if !obj.contains_key("skill_id") {
                    obj.insert("skill_id".to_string(), Value::Number(serde_json::Number::from(skill_id)));
                }
                if !obj.contains_key("section") {
                    obj.insert("section".to_string(), Value::String(req.section.to_lowercase()));
                } else if let Some(Value::String(s)) = obj.get("section") {
                    obj.insert("section".to_string(), Value::String(s.to_lowercase()));
                }
                if !obj.contains_key("interaction") {
                    obj.insert("interaction".to_string(), Value::String("multiple_choice".to_string()));
                }
                if !obj.contains_key("prompt") {
                    obj.insert("prompt".to_string(), Value::String("".to_string()));
                }
                if !obj.contains_key("stimulus") {
                    obj.insert("stimulus".to_string(), Value::Object(serde_json::Map::new()));
                }
                if !obj.contains_key("metadata") {
                    obj.insert("metadata".to_string(), serde_json::json!({ "source": "ai" }));
                } else if let Some(Value::Object(m)) = obj.get_mut("metadata") {
                    if !m.contains_key("source") {
                        m.insert("source".to_string(), Value::String("ai".to_string()));
                    }
                }
                if !obj.contains_key("cefr_target") {
                    obj.insert("cefr_target".to_string(), Value::String("B2".to_string()));
                }
                if !obj.contains_key("difficulty_score") {
                    obj.insert("difficulty_score".to_string(), Value::Number(serde_json::Number::from(50)));
                }
            }

            let q = serde_json::from_value::<GeneratedQuestion>(q_val)
                .map_err(|e| AppError::Validation(format!("Invalid question format: {}", e)))?;
            questions.push(q);
        }
    }

    if questions.is_empty() {
        return Err(AppError::Validation("No questions generated".into()));
    }

    Ok(VilResponse::ok(QuizGenerateResponse { questions }))
}

#[vil_handler]
pub async fn get_adaptive_metrics(
    ctx: ServiceCtx,
    claims: Claims,
) -> Result<VilResponse<AdaptiveMetricsResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;

    let row: Option<UserPerformanceMetrics> = UserPerformanceMetrics::find_where(
        state.pool.inner(),
        "user_id = ?",
        &[&claims.sub],
    )
    .await?;

    match row {
        Some(m) => {
            let accuracy_by_section: std::collections::HashMap<String, SectionAccuracy> = serde_json::from_str(&m.accuracy_by_section).unwrap_or_default();
            let accuracy_by_skill: std::collections::HashMap<String, SectionAccuracy> = serde_json::from_str(&m.accuracy_by_skill).unwrap_or_default();
            let recent_accuracy: Vec<i64> = serde_json::from_str(&m.recent_accuracy).unwrap_or_default();

            Ok(VilResponse::ok(AdaptiveMetricsResponse {
                total_questions: m.total_questions,
                correct_answers: m.correct_answers,
                accuracy_by_section,
                accuracy_by_skill,
                recent_accuracy,
                average_response_time: m.average_response_time,
                last_updated: m.last_updated,
                current_difficulty: m.current_difficulty,
            }))
        }
        None => {
            Ok(VilResponse::ok(AdaptiveMetricsResponse {
                total_questions: 0,
                correct_answers: 0,
                accuracy_by_section: std::collections::HashMap::new(),
                accuracy_by_skill: std::collections::HashMap::new(),
                recent_accuracy: vec![],
                average_response_time: 0.0,
                last_updated: chrono::Utc::now().timestamp_millis(),
                current_difficulty: "medium".to_string(),
            }))
        }
    }
}

#[vil_handler]
pub async fn record_answer(
    ctx: ServiceCtx,
    claims: Claims,
    body: ShmSlice,
) -> Result<VilResponse<AdaptiveMetricsResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let req: RecordAnswerRequest = body.json().map_err(|_| AppError::Validation("Invalid body".into()))?;

    let mut row: UserPerformanceMetrics = UserPerformanceMetrics::find_where(
        state.pool.inner(),
        "user_id = ?",
        &[&claims.sub],
    )
    .await?
    .unwrap_or_else(|| UserPerformanceMetrics {
        id: uuid::Uuid::new_v4().to_string(),
        user_id: claims.sub.clone(),
        total_questions: 0,
        correct_answers: 0,
        accuracy_by_section: "{}".to_string(),
        accuracy_by_skill: "{}".to_string(),
        recent_accuracy: "[]".to_string(),
        average_response_time: 0.0,
        current_difficulty: "medium".to_string(),
        last_updated: chrono::Utc::now().timestamp_millis(),
    });

    let mut accuracy_by_section: std::collections::HashMap<String, SectionAccuracy> = serde_json::from_str(&row.accuracy_by_section).unwrap_or_default();
    let mut accuracy_by_skill: std::collections::HashMap<String, SectionAccuracy> = serde_json::from_str(&row.accuracy_by_skill).unwrap_or_default();
    let mut recent_accuracy: Vec<i64> = serde_json::from_str(&row.recent_accuracy).unwrap_or_default();

    row.total_questions += 1;
    if req.correct {
        row.correct_answers += 1;
    }

    let section_entry = accuracy_by_section.entry(req.section.clone()).or_insert(SectionAccuracy { correct: 0, total: 0 });
    section_entry.total += 1;
    if req.correct {
        section_entry.correct += 1;
    }

    let skill_entry = accuracy_by_skill.entry(req.skill_id.clone()).or_insert(SectionAccuracy { correct: 0, total: 0 });
    skill_entry.total += 1;
    if req.correct {
        skill_entry.correct += 1;
    }

    recent_accuracy.push(if req.correct { 1 } else { 0 });
    if recent_accuracy.len() > 20 {
        recent_accuracy.remove(0);
    }

    let total_time = row.average_response_time * (row.total_questions - 1) as f64;
    row.average_response_time = (total_time + req.response_time_ms as f64) / row.total_questions as f64;
    row.last_updated = chrono::Utc::now().timestamp_millis();

    // Adjust difficulty
    if recent_accuracy.len() >= 5 {
        let recent_correct: i64 = recent_accuracy.iter().sum();
        let accuracy = recent_correct as f64 / recent_accuracy.len() as f64;
        let threshold = 0.2;

        if accuracy > 0.75 + threshold && row.current_difficulty != "hard" {
            row.current_difficulty = if row.current_difficulty == "easy" { "medium".to_string() } else { "hard".to_string() };
            recent_accuracy.clear();
        } else if accuracy < 0.45 - threshold && row.current_difficulty != "easy" {
            row.current_difficulty = if row.current_difficulty == "hard" { "medium".to_string() } else { "easy".to_string() };
            recent_accuracy.clear();
        }
    }

    row.accuracy_by_section = serde_json::to_string(&accuracy_by_section).unwrap_or_else(|_| "{}".to_string());
    row.accuracy_by_skill = serde_json::to_string(&accuracy_by_skill).unwrap_or_else(|_| "{}".to_string());
    row.recent_accuracy = serde_json::to_string(&recent_accuracy).unwrap_or_else(|_| "[]".to_string());

    if row.total_questions == 1 {
        // Insert
        sqlx::query(
            "INSERT INTO user_performance_metrics (id, user_id, total_questions, correct_answers, accuracy_by_section, accuracy_by_skill, recent_accuracy, average_response_time, current_difficulty, last_updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&row.id)
        .bind(&row.user_id)
        .bind(row.total_questions)
        .bind(row.correct_answers)
        .bind(&row.accuracy_by_section)
        .bind(&row.accuracy_by_skill)
        .bind(&row.recent_accuracy)
        .bind(row.average_response_time)
        .bind(&row.current_difficulty)
        .bind(row.last_updated)
        .execute(state.pool.inner())
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;
    } else {
        // Update
        sqlx::query(
            "UPDATE user_performance_metrics SET total_questions = ?, correct_answers = ?, accuracy_by_section = ?, accuracy_by_skill = ?, recent_accuracy = ?, average_response_time = ?, current_difficulty = ?, last_updated = ? WHERE id = ?"
        )
        .bind(row.total_questions)
        .bind(row.correct_answers)
        .bind(&row.accuracy_by_section)
        .bind(&row.accuracy_by_skill)
        .bind(&row.recent_accuracy)
        .bind(row.average_response_time)
        .bind(&row.current_difficulty)
        .bind(row.last_updated)
        .bind(&row.id)
        .execute(state.pool.inner())
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;
    }

    Ok(VilResponse::ok(AdaptiveMetricsResponse {
        total_questions: row.total_questions,
        correct_answers: row.correct_answers,
        accuracy_by_section,
        accuracy_by_skill,
        recent_accuracy,
        average_response_time: row.average_response_time,
        last_updated: row.last_updated,
        current_difficulty: row.current_difficulty,
    }))
}
