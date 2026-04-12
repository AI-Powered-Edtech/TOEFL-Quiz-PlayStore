use crate::error::AppError;
use crate::middleware::auth::Claims;
use crate::models::creator::*;
use crate::models::responses::*;
use crate::models::views::*;
use vil_orm::vil_args;
use vil_server::prelude::*;

#[vil_handler]
pub async fn register_creator(
    ctx: ServiceCtx,
    claims: Claims,
    body: ShmSlice,
) -> Result<VilResponse<CreatorRegResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let req: RegisterCreatorRequest = body.json().map_err(|_| AppError::Validation("Invalid body".into()))?;
    let id = uuid::Uuid::new_v4().to_string();

    // Check if already registered — select only id, not SELECT *
    let exists: Option<(String,)> = Creator::select_one(state.pool.inner(), &["id"], "user_id = ?", &[&claims.sub]).await?;

    if exists.is_some() {
        return Err(AppError::Validation("Already registered as creator".into()));
    }

    let id_owned = id.clone();
    let user_id = claims.sub.clone();
    let display_name = req.display_name.clone();
    let status = "pending".to_string();
    Creator::insert(state.pool.inner(), &["id", "user_id", "display_name", "status"], vil_args![id_owned, user_id, display_name, status]).await?;

    Ok(VilResponse::created(CreatorRegResponse {
        ok: true,
        creator_id: id,
        status: "pending".to_string(),
    }))
}

#[vil_handler]
pub async fn get_creator_profile(
    ctx: ServiceCtx,
    claims: Claims,
) -> Result<VilResponse<CreatorOverviewRow>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let creator = Creator::q()
        .select(&["id", "display_name", "is_verified", "total_earnings", "status", "created_at"])
        .where_eq("user_id", &claims.sub)
        .fetch_optional::<CreatorOverviewRow>(state.pool.inner()).await?
        .ok_or_else(|| AppError::NotFound("Not a registered creator".into()))?;

    Ok(VilResponse::ok(creator))
}

#[vil_handler]
pub async fn create_bite(
    ctx: ServiceCtx,
    claims: Claims,
    body: ShmSlice,
) -> Result<VilResponse<OkWithIdResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let req: CreateBiteRequest = body.json().map_err(|_| AppError::Validation("Invalid body".into()))?;

    // Get creator_id from JWT user — select only id
    let creator: (String,) = Creator::select_one(state.pool.inner(), &["id"], "user_id = ? AND status = 'approved'", &[&claims.sub])
        .await?
        .ok_or_else(|| AppError::Forbidden("Not an approved creator".into()))?;

    let id = uuid::Uuid::new_v4().to_string();
    DailyBite::q()
        .insert_columns(&["id", "creator_id", "youtube_video_id", "title", "category", "section", "status"])
        .value(id.clone())
        .value(creator.0.clone())
        .value(req.youtube_video_id.clone())
        .value(req.title.clone())
        .value(req.category.clone())
        .value_opt_str(req.section.clone())
        .value("pending".to_string())
        .execute(state.pool.inner()).await?;

    Ok(VilResponse::created(OkWithIdResponse { ok: true, id }))
}

#[vil_handler]
pub async fn list_bites(
    ctx: ServiceCtx,
    _claims: Claims,
    Query(params): Query<BiteFilter>,
) -> Result<VilResponse<Vec<BiteRow>>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let status = params.status.as_deref().unwrap_or("published");
    let limit = params.limit.unwrap_or(20).min(50);

    let bites = DailyBite::q()
        .select(&["id", "youtube_video_id", "title", "category", "COALESCE(section,'') as section", "views_count", "likes_count", "status"])
        .where_eq("status", status)
        .order_by_desc("created_at")
        .limit(limit)
        .fetch_all::<BiteRow>(state.pool.inner()).await?;

    Ok(VilResponse::ok(bites))
}

#[vil_handler]
pub async fn record_view(
    ctx: ServiceCtx,
    claims: Claims,
    Path(bite_id): Path<String>,
) -> Result<VilResponse<OkResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    // Record interaction
    let inter_id = uuid::Uuid::new_v4().to_string();
    let bite_id_c = bite_id.clone();
    let user_id = claims.sub.clone();
    let itype = "view".to_string();
    BiteInteraction::insert(state.pool.inner(), &["id", "bite_id", "user_id", "interaction_type"], vil_args![inter_id, bite_id_c, user_id, itype]).await?;

    // Increment view count
    DailyBite::update_where(state.pool.inner(), "views_count = views_count + 1", "id = ?", &[&bite_id]).await?;

    // Rp 10 per view → creator earnings
    let creator: Option<(String,)> = DailyBite::select_one(state.pool.inner(), &["creator_id"], "id = ?", &[&bite_id]).await?;

    if let Some((creator_id,)) = creator {
        let earn_id = uuid::Uuid::new_v4().to_string();
        let cid = creator_id.clone();
        let bid = bite_id.clone();
        let etype = "view".to_string();
        CreatorEarning::insert(state.pool.inner(), &["id", "creator_id", "bite_id", "amount", "earning_type"], vil_args![earn_id, cid, bid, 10.0_f64, etype]).await?;

        Creator::update_where(state.pool.inner(), "total_earnings = total_earnings + 10.0", "id = ?", &[&creator_id]).await?;
    }

    Ok(VilResponse::ok(OkResponse { ok: true }))
}

#[vil_handler]
pub async fn process_tip(
    ctx: ServiceCtx,
    claims: Claims,
    Path(bite_id): Path<String>,
    body: ShmSlice,
) -> Result<VilResponse<TipResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let req: TipRequest = body.json().map_err(|_| AppError::Validation("Invalid body".into()))?;

    if req.amount <= 0.0 {
        return Err(AppError::Validation("Tip amount must be positive".into()));
    }

    // Idempotency check
    let existing: Option<(String,)> = Transaction::select_one(state.pool.inner(), &["id"], "order_id = ?", &[&req.order_id]).await?;

    if let Some((tx_id,)) = existing {
        return Ok(VilResponse::ok(TipResponse {
            ok: true,
            transaction_id: tx_id,
            amount: req.amount,
            platform_fee: req.amount * 0.15,
            creator_amount: req.amount * 0.85,
            duplicate: Some(true),
        }));
    }

    let creator: Option<(String,)> = DailyBite::select_one(state.pool.inner(), &["creator_id"], "id = ?", &[&bite_id]).await?;
    let creator = creator
        .ok_or_else(|| AppError::NotFound("Bite not found".into()))?;

    let platform_fee = req.amount * 0.15;
    let creator_amount = req.amount - platform_fee;
    let tx_id = uuid::Uuid::new_v4().to_string();

    // Create transaction
    let tx_id_c = tx_id.clone();
    let ttype = "tip".to_string();
    let order_id = req.order_id.clone();
    let from_user = claims.sub.clone();
    let to_creator = creator.0.clone();
    let bid = bite_id.clone();
    let status = "completed".to_string();
    let amount_f = req.amount as f64;
    let pfee_f = platform_fee as f64;
    let camount_f = creator_amount as f64;
    Transaction::insert(state.pool.inner(), &["id", "type", "order_id", "from_user_id", "to_creator_id", "bite_id", "amount", "platform_fee", "creator_amount", "status"], vil_args![tx_id_c, ttype, order_id, from_user, to_creator, bid, amount_f, pfee_f, camount_f, status]).await?;

    // Creator earnings
    let earn_id = uuid::Uuid::new_v4().to_string();
    let earn_cid = creator.0.clone();
    let earn_bid = bite_id.clone();
    let earn_txid = tx_id.clone();
    let earn_type = "tip".to_string();
    let earn_amount = creator_amount as f64;
    CreatorEarning::insert(state.pool.inner(), &["id", "creator_id", "bite_id", "transaction_id", "amount", "earning_type"], vil_args![earn_id, earn_cid, earn_bid, earn_txid, earn_amount, earn_type]).await?;

    let creator_id_owned = creator.0.clone();
    Creator::update_v(state.pool.inner(), "total_earnings = total_earnings + ?", "id = ?", vil_args![creator_amount, creator_id_owned]).await?;

    Ok(VilResponse::created(TipResponse {
        ok: true,
        transaction_id: tx_id,
        amount: req.amount,
        platform_fee,
        creator_amount,
        duplicate: None,
    }))
}

#[vil_handler]
pub async fn request_payout(
    ctx: ServiceCtx,
    claims: Claims,
    body: ShmSlice,
) -> Result<VilResponse<PayoutResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let req: PayoutRequest = body.json().map_err(|_| AppError::Validation("Invalid body".into()))?;

    let creator: (String, f64) = Creator::select_one(state.pool.inner(), &["id", "total_earnings"], "user_id = ?", &[&claims.sub])
        .await?
        .ok_or_else(|| AppError::NotFound("Not a creator".into()))?;

    // Check pending (unpaid) balance
    let cid = creator.0.clone();
    let unpaid_val: f64 = CreatorEarning::scalar_v(state.pool.inner(), "COALESCE(CAST(SUM(amount) AS REAL), 0.0)", "creator_id = ? AND is_paid = 0", vil_args![cid]).await.unwrap_or(0.0);
    let unpaid = (unpaid_val,);

    if unpaid.0 < req.amount {
        return Err(AppError::Validation(format!("Insufficient balance: {} available", unpaid.0)));
    }

    let tx_id = uuid::Uuid::new_v4().to_string();
    Transaction::q()
        .insert_columns(&["id", "type", "from_user_id", "to_creator_id", "amount", "status", "metadata"])
        .value(tx_id.clone())
        .value("payout".to_string())
        .value(claims.sub.clone())
        .value(creator.0.clone())
        .value(req.amount)
        .value("pending".to_string())
        .value_opt_str(req.payout_method.clone())
        .execute(state.pool.inner()).await?;

    Ok(VilResponse::created(PayoutResponse {
        ok: true,
        payout_id: tx_id,
        amount: req.amount,
        status: "pending".to_string(),
    }))
}

#[vil_handler]
pub async fn creator_stats(
    ctx: ServiceCtx,
    claims: Claims,
) -> Result<VilResponse<CreatorStatsResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let creator: (String,) = Creator::select_one(state.pool.inner(), &["id"], "user_id = ?", &[&claims.sub])
        .await?
        .ok_or_else(|| AppError::NotFound("Not a creator".into()))?;

    let cid = creator.0.clone();
    let total_views: i64 = DailyBite::scalar_v(state.pool.inner(), "COALESCE(CAST(SUM(views_count) AS INTEGER), 0)", "creator_id = ?", vil_args![cid]).await.unwrap_or(0);

    let cid_earn = creator.0.clone();
    let total_earnings: f64 = CreatorEarning::scalar_v(state.pool.inner(), "COALESCE(CAST(SUM(amount) AS REAL), 0.0)", "creator_id = ?", vil_args![cid_earn]).await.unwrap_or(0.0);

    let cid_pend = creator.0.clone();
    let pending_earnings: f64 = CreatorEarning::scalar_v(state.pool.inner(), "COALESCE(CAST(SUM(amount) AS REAL), 0.0)", "creator_id = ? AND is_paid = 0", vil_args![cid_pend]).await.unwrap_or(0.0);

    let cid2 = creator.0.clone();
    let total_bites: i64 = DailyBite::scalar_v(state.pool.inner(), "CAST(COUNT(*) AS INTEGER)", "creator_id = ?", vil_args![cid2]).await.unwrap_or(0);

    Ok(VilResponse::ok(CreatorStatsResponse {
        total_views,
        total_earnings,
        pending_earnings,
        total_bites,
    }))
}
