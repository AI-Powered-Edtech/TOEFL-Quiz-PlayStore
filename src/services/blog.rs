use crate::error::AppError;
use crate::middleware::admin::require_admin;
use crate::middleware::auth::Claims;
use crate::models::blog::BlogPost;
use crate::models::responses::*;
use crate::models::views::*;
use vil::prelude::*;

/// GET /api/blog/posts — list published posts
#[vil_handler]
pub async fn list_posts(
    ctx: ServiceCtx,
) -> Result<VilResponse<Vec<PostListRow>>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let posts = BlogPost::q()
        .select(&["id", "skill_id", "section", "title", "is_featured", "views_count"])
        .where_eq("status", "published")
        .order_by_asc("sort_order")
        .fetch_all::<PostListRow>(state.pool.inner()).await?;

    Ok(VilResponse::ok(posts))
}

/// GET /api/blog/posts/:skill_id — get single post by skill_id
#[vil_handler]
pub async fn get_post(
    ctx: ServiceCtx,
    Path(skill_id): Path<String>,
) -> Result<VilResponse<PostDetailRow>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    let mut post = BlogPost::q()
        .select(&["id", "section", "title", "content", "status", "views_count"])
        .where_eq("skill_id", &skill_id)
        .and_eq("status", "published")
        .fetch_optional::<PostDetailRow>(state.pool.inner()).await?
        .ok_or_else(|| AppError::NotFound("Post not found".into()))?;

    // Increment views
    BlogPost::update_where(state.pool.inner(), "views_count = views_count + 1", "skill_id = ?", &[&skill_id]).await?;

    post.views_count += 1;
    Ok(VilResponse::ok(post))
}

/// POST /api/admin/blog/posts — create/update blog post (admin only)
#[vil_handler]
pub async fn upsert_post(
    ctx: ServiceCtx,
    claims: Claims,
    body: ShmSlice,
) -> Result<VilResponse<OkResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    require_admin(&claims)?;
    let req: serde_json::Value = body.json().map_err(|_| AppError::Validation("Invalid body".into()))?;

    let skill_id = req["skill_id"].as_str().ok_or_else(|| AppError::Validation("skill_id required".into()))?;
    let title = req["title"].as_str().unwrap_or("");
    let content = req["content"].as_str().unwrap_or("");
    let section = req["section"].as_str().map(|s| s.to_string());
    let status = req["status"].as_str().unwrap_or("draft");
    let is_featured = if req["is_featured"].as_bool().unwrap_or(false) { 1i64 } else { 0i64 };

    BlogPost::q()
        .insert_columns(&["id", "skill_id", "section", "title", "content", "status", "is_featured"])
        .value(uuid::Uuid::new_v4().to_string())
        .value(skill_id.to_string())
        .value_opt_str(section)
        .value(title.to_string())
        .value(content.to_string())
        .value(status.to_string())
        .value(is_featured)
        .on_conflict("skill_id")
        .do_update(&["title", "content", "section", "status", "is_featured"])
        .execute(state.pool.inner()).await?;

    Ok(VilResponse::ok(OkResponse { ok: true }))
}

/// DELETE /api/admin/blog/posts/:skill_id — delete post (admin only)
#[vil_handler]
pub async fn delete_post(
    ctx: ServiceCtx,
    claims: Claims,
    Path(skill_id): Path<String>,
) -> Result<VilResponse<OkResponse>, AppError> {
    let state = ctx.state::<crate::AppState>().map_err(|_| AppError::Internal("state".into()))?;
    require_admin(&claims)?;
    BlogPost::delete_where(state.pool.inner(), "skill_id = ?", &[&skill_id]).await?;

    Ok(VilResponse::ok(OkResponse { ok: true }))
}
