use crate::error::AppError;
use crate::middleware::auth::Claims;
use crate::models::profile::Profile;
use crate::models::responses::*;
use crate::models::social::*;
use crate::models::views::*;
use serde::{Deserialize, Serialize};
use vil_orm::vil_args;
use vil::prelude::*;

#[vil_handler]
pub async fn create_circle(
    ctx: ServiceCtx,
    claims: Claims,
    body: ShmSlice,
) -> Result<VilResponse<Circle>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let req: CreateCircleRequest = body.json().map_err(|_| AppError::Validation("Invalid body".into()))?;
    let id = uuid::Uuid::new_v4().to_string();
    let code: String = (0..6).map(|_| {
        let idx = rand::random::<usize>() % 36;
        if idx < 10 { (b'0' + idx as u8) as char } else { (b'A' + (idx - 10) as u8) as char }
    }).collect();

    let name = req.name.clone();
    let desc = req.description.clone();
    let creator = claims.sub.clone();
    let is_pub = if req.is_public.unwrap_or(true) { 1i32 } else { 0i32 };
    Circle::q()
        .insert_columns(&["id", "code", "name", "description", "creator_id", "is_public"])
        .value(id.clone()).value(code).value(name)
        .value_opt_str(desc)
        .value(creator).value(is_pub)
        .execute(state.pool.inner()).await?;

    let member_id = uuid::Uuid::new_v4().to_string();
    let id_c = id.clone();
    let sub_c = claims.sub.clone();
    let role = "admin".to_string();
    CircleMember::insert(state.pool.inner(), &["id", "circle_id", "user_id", "role"], vil_args![member_id, id_c, sub_c, role]).await?;

    let circle = Circle::find_by_id(state.pool.inner(), &id)
        .await?
        .ok_or_else(|| AppError::NotFound("Circle not found".into()))?;
    Ok(VilResponse::created(circle))
}

#[vil_handler]
pub async fn join_circle(
    ctx: ServiceCtx,
    claims: Claims,
    body: ShmSlice,
) -> Result<VilResponse<CircleJoinResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let req: JoinCircleRequest = body.json().map_err(|_| AppError::Validation("Invalid body".into()))?;
    let circle = Circle::find_where(state.pool.inner(), "code = ?", &[&req.code])
        .await?
        .ok_or_else(|| AppError::NotFound("Circle not found".into()))?;

    let member_id = uuid::Uuid::new_v4().to_string();
    let cid = circle.id.clone();
    let uid = claims.sub.clone();
    let role = "member".to_string();
    CircleMember::q()
        .insert_columns(&["id", "circle_id", "user_id", "role"])
        .value(member_id).value(cid).value(uid).value(role)
        .on_conflict_nothing("circle_id, user_id")
        .execute(state.pool.inner()).await?;

    Ok(VilResponse::ok(CircleJoinResponse { ok: true, circle_id: circle.id }))
}

#[vil_handler]
pub async fn my_circles(
    ctx: ServiceCtx,
    claims: Claims,
) -> Result<VilResponse<Vec<Circle>>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let circles = Circle::q()
        .select(&["c.*"])
        .alias("c")
        .join("circle_members cm", "c.id = cm.circle_id")
        .where_eq("cm.user_id", &claims.sub)
        .fetch_all::<Circle>(state.pool.inner()).await?;
    Ok(VilResponse::ok(circles))
}

#[vil_handler]
pub async fn add_friend(
    ctx: ServiceCtx,
    claims: Claims,
    body: ShmSlice,
) -> Result<VilResponse<OkResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let req: AddFriendRequest = body.json().map_err(|_| AppError::Validation("Invalid body".into()))?;
    let friend: (String,) = Profile::select_one(state.pool.inner(), &["id"], "friend_code = ?", &[&req.friend_code])
        .await?
        .ok_or_else(|| AppError::NotFound("Friend code not found".into()))?;

    if friend.0 == claims.sub {
        return Err(AppError::Validation("Cannot add yourself".into()));
    }

    // Bilateral friendship
    for (a, b) in [(&claims.sub, &friend.0), (&friend.0, &claims.sub)] {
        let fid = uuid::Uuid::new_v4().to_string();
        let uid = a.clone();
        let friend_id = b.clone();
        Friend::q()
            .insert_columns(&["id", "user_id", "friend_id"])
            .value(fid).value(uid).value(friend_id)
            .on_conflict_nothing("user_id, friend_id")
            .execute(state.pool.inner()).await?;
    }

    Ok(VilResponse::ok(OkResponse { ok: true }))
}

#[vil_handler]
pub async fn list_friends(
    ctx: ServiceCtx,
    claims: Claims,
) -> Result<VilResponse<Vec<FriendApiRow>>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let rows: Vec<FriendJoinRow> = sqlx::query_as(
        "SELECT f.id, f.user_id, f.friend_id, f.created_at, p.full_name, p.avatar_url, p.xp \
         FROM friends f \
         JOIN profiles p ON p.id = f.friend_id \
         WHERE f.user_id = ? \
         ORDER BY f.created_at DESC",
    )
    .bind(&claims.sub)
    .fetch_all(state.pool.inner())
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?;

    let friends = rows
        .into_iter()
        .map(|r| FriendApiRow {
            id: r.id,
            user_id: r.user_id,
            friend_id: r.friend_id,
            profile: Some(FriendProfile {
                full_name: r.full_name,
                avatar_url: r.avatar_url,
                xp: Some(r.xp),
            }),
            created_at: r.created_at,
        })
        .collect();

    Ok(VilResponse::ok(friends))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FriendProfile {
    pub full_name: Option<String>,
    pub avatar_url: Option<String>,
    pub xp: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FriendApiRow {
    pub id: String,
    pub user_id: String,
    pub friend_id: String,
    pub profile: Option<FriendProfile>,
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct FriendJoinRow {
    pub id: String,
    pub user_id: String,
    pub friend_id: String,
    pub created_at: Option<String>,
    pub full_name: Option<String>,
    pub avatar_url: Option<String>,
    pub xp: i64,
}

#[vil_handler]
pub async fn remove_friend(
    ctx: ServiceCtx,
    claims: Claims,
    Path(friend_id): Path<String>,
) -> Result<VilResponse<OkResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    sqlx::query("DELETE FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)")
        .bind(&claims.sub)
        .bind(&friend_id)
        .bind(&friend_id)
        .bind(&claims.sub)
        .execute(state.pool.inner())
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(VilResponse::ok(OkResponse { ok: true }))
}

#[derive(Debug, Deserialize)]
pub struct RespondFriendRequest {
    pub requester_id: String,
    pub accept: bool,
}

#[vil_handler]
pub async fn respond_friend_request(
    ctx: ServiceCtx,
    claims: Claims,
    body: ShmSlice,
) -> Result<VilResponse<OkResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let req: RespondFriendRequest = body.json().map_err(|_| AppError::Validation("Invalid body".into()))?;

    if req.requester_id == claims.sub {
        return Err(AppError::Validation("Cannot respond to yourself".into()));
    }

    if !req.accept {
        return Ok(VilResponse::ok(OkResponse { ok: true }));
    }

    let exists: Option<(String,)> = Profile::select_one(state.pool.inner(), &["id"], "id = ?", &[&req.requester_id]).await?;
    if exists.is_none() {
        return Err(AppError::NotFound("Requester not found".into()));
    }

    for (a, b) in [(&claims.sub, &req.requester_id), (&req.requester_id, &claims.sub)] {
        let fid = uuid::Uuid::new_v4().to_string();
        let uid = a.clone();
        let friend_id = b.clone();
        Friend::q()
            .insert_columns(&["id", "user_id", "friend_id"])
            .value(fid).value(uid).value(friend_id)
            .on_conflict_nothing("user_id, friend_id")
            .execute(state.pool.inner()).await?;
    }

    Ok(VilResponse::ok(OkResponse { ok: true }))
}

#[vil_handler]
pub async fn leaderboard(
    ctx: ServiceCtx,
    _claims: Claims,
) -> Result<VilResponse<Vec<LeaderboardEntry>>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let entries = Profile::q()
        .select_expr("ROW_NUMBER() OVER (ORDER BY xp DESC) as rank, id as user_id, full_name, avatar_url, xp")
        .order_by_desc("xp")
        .limit(50)
        .fetch_all::<LeaderboardEntry>(state.pool.inner()).await?;
    Ok(VilResponse::ok(entries))
}

// ── Circle Messages ──

#[vil_handler]
pub async fn send_message(
    ctx: ServiceCtx,
    claims: Claims,
    Path(circle_id): Path<String>,
    body: ShmSlice,
) -> Result<VilResponse<MessageCreatedResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let req: SendMessageRequest = body.json().map_err(|_| AppError::Validation("Invalid body".into()))?;

    // Verify membership
    let member: Option<(String,)> = CircleMember::select_one(state.pool.inner(), &["role"], "circle_id = ? AND user_id = ?", &[&circle_id, &claims.sub]).await?;

    if member.is_none() {
        return Err(AppError::Forbidden("Not a member of this circle".into()));
    }

    let id = uuid::Uuid::new_v4().to_string();
    let id_c = id.clone();
    let cid_c = circle_id.clone();
    let sub_c = claims.sub.clone();
    let content_c = req.content.clone();
    CircleMessage::insert(state.pool.inner(), &["id", "circle_id", "user_id", "content", "is_system"], vil_args![id_c, cid_c, sub_c, content_c, 0_i64]).await?;

    Ok(VilResponse::created(MessageCreatedResponse { ok: true, id }))
}

#[vil_handler]
pub async fn get_messages(
    ctx: ServiceCtx,
    _claims: Claims,
    Path(circle_id): Path<String>,
) -> Result<VilResponse<Vec<MessageRow>>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let msgs = CircleMessage::q()
        .select(&["id", "user_id", "content", "is_system", "created_at"])
        .where_eq("circle_id", &circle_id)
        .order_by_desc("created_at")
        .limit(50)
        .fetch_all::<MessageRow>(state.pool.inner()).await?;

    Ok(VilResponse::ok(msgs))
}

// ── Oracle Predictions ──

#[vil_handler]
pub async fn get_predictions(
    ctx: ServiceCtx,
    claims: Claims,
) -> Result<VilResponse<Vec<PredictionRow>>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let preds = Prediction::q()
        .select(&["id", "prediction_type", "predicted_value", "confidence", "is_current", "created_at"])
        .where_eq("user_id", &claims.sub)
        .where_raw("is_current = 1")
        .fetch_all::<PredictionRow>(state.pool.inner()).await?;

    Ok(VilResponse::ok(preds))
}

#[vil_handler]
pub async fn save_prediction(
    ctx: ServiceCtx,
    claims: Claims,
    body: ShmSlice,
) -> Result<VilResponse<OkWithIdResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let req: SavePredictionRequest = body.json().map_err(|_| AppError::Validation("Invalid body".into()))?;

    // Mark old predictions as not current
    Prediction::update_where(state.pool.inner(), "is_current = 0", "user_id = ? AND prediction_type = ?", &[&claims.sub, &req.prediction_type]).await?;

    let id = uuid::Uuid::new_v4().to_string();
    let uid = claims.sub.clone();
    let ptype = req.prediction_type.clone();
    let breakdown = req.breakdown.clone();
    Prediction::q()
        .insert_columns(&["id", "user_id", "prediction_type", "predicted_value", "confidence", "breakdown", "is_current"])
        .value(id.clone()).value(uid).value(ptype)
        .value_opt_f64(req.predicted_value)
        .value_opt_f64(req.confidence)
        .value_opt_str(breakdown)
        .value(1_i64)
        .execute(state.pool.inner()).await?;

    Ok(VilResponse::created(OkWithIdResponse { ok: true, id }))
}

// ── Achievements ──

#[vil_handler]
pub async fn get_achievements(
    ctx: ServiceCtx,
    claims: Claims,
) -> Result<VilResponse<Vec<AchievementRow>>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let achievements = UserAchievement::q()
        .select(&["id", "achievement_id", "feature", "xp_earned", "created_at"])
        .where_eq("user_id", &claims.sub)
        .order_by_desc("created_at")
        .fetch_all::<AchievementRow>(state.pool.inner()).await?;

    Ok(VilResponse::ok(achievements))
}

// ── Notifications ──

#[vil_handler]
pub async fn get_notifications(
    ctx: ServiceCtx,
    claims: Claims,
) -> Result<VilResponse<Vec<NotificationApiRow>>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let rows: Vec<NotificationRow> = Notification::q()
        .select(&["id", "type", "message", "read", "created_at"])
        .where_eq("user_id", &claims.sub)
        .order_by_desc("created_at")
        .limit(50)
        .fetch_all::<NotificationRow>(state.pool.inner()).await?;

    let notifs = rows
        .into_iter()
        .map(|r| {
            let notif_type = r.notif_type;
            let title = notif_type.replace('_', " ");
            NotificationApiRow {
                id: r.id,
                user_id: claims.sub.clone(),
                notif_type,
                title,
                message: r.message,
                is_read: r.read != 0,
                created_at: r.created_at,
                data: None,
            }
        })
        .collect();

    Ok(VilResponse::ok(notifs))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationApiRow {
    pub id: String,
    pub user_id: String,
    #[serde(rename = "type")]
    pub notif_type: String,
    pub title: String,
    pub message: String,
    pub is_read: bool,
    pub created_at: String,
    pub data: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct CreateNotificationRequest {
    #[serde(rename = "type")]
    pub notif_type: String,
    pub message: String,
}

#[vil_handler]
pub async fn create_notification(
    ctx: ServiceCtx,
    claims: Claims,
    body: ShmSlice,
) -> Result<VilResponse<OkWithIdResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let req: CreateNotificationRequest = body.json().map_err(|_| AppError::Validation("Invalid body".into()))?;

    let id = uuid::Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO notifications (id, user_id, type, message, read, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))")
        .bind(&id)
        .bind(&claims.sub)
        .bind(&req.notif_type)
        .bind(&req.message)
        .bind(0_i64)
        .execute(state.pool.inner())
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(VilResponse::created(OkWithIdResponse { ok: true, id }))
}

#[vil_handler]
pub async fn mark_notification_read(
    ctx: ServiceCtx,
    claims: Claims,
    Path(notif_id): Path<String>,
) -> Result<VilResponse<OkResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    Notification::update_where(state.pool.inner(), "read = 1", "id = ? AND user_id = ?", &[&notif_id, &claims.sub]).await?;
    Ok(VilResponse::ok(OkResponse { ok: true }))
}
