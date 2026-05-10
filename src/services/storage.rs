use crate::error::AppError;
use crate::middleware::auth::Claims;
use crate::models::responses::*;
use vil::prelude::*;

const DEFAULT_UPLOAD_DIR: &str = "uploads";
const MAX_FILE_SIZE: usize = 10 * 1024 * 1024; // 10MB

fn upload_dir() -> String {
    std::env::var("UPLOAD_DIR").unwrap_or_else(|_| DEFAULT_UPLOAD_DIR.to_string())
}

fn validate_filename(filename: &str) -> Result<(), AppError> {
    let safe = !filename.is_empty()
        && !filename.contains('/')
        && !filename.contains('\\')
        && !filename.contains("..")
        && filename.chars().all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '.'));
    if safe { Ok(()) } else { Err(AppError::Validation("Invalid filename".into())) }
}

fn detect_audio_type(bytes: &[u8]) -> Option<&'static str> {
    if bytes.len() >= 3 && bytes.starts_with(b"ID3") { return Some("mp3"); }
    if bytes.len() >= 2 && bytes[0] == 0xFF && (bytes[1] & 0xE0) == 0xE0 { return Some("mp3"); }
    if bytes.len() >= 12 && bytes.starts_with(b"RIFF") && &bytes[8..12] == b"WAVE" { return Some("wav"); }
    None
}

/// POST /api/storage/avatars — upload avatar image
#[vil_handler]
pub async fn upload_avatar(
    _ctx: ServiceCtx,
    claims: Claims,
    body: ShmSlice,
) -> Result<VilResponse<UploadResponse>, AppError> {
    let bytes = body.as_bytes();
    if bytes.len() > MAX_FILE_SIZE {
        return Err(AppError::Validation("File too large (max 10MB)".into()));
    }

    // Validate image magic bytes
    let content_type = detect_image_type(bytes)
        .ok_or_else(|| AppError::Validation("Invalid image format (PNG/JPG only)".into()))?;

    let ext = match content_type {
        "image/png" => "png",
        "image/jpeg" => "jpg",
        _ => "bin",
    };

    let dir = format!("{}/avatars", upload_dir());
    std::fs::create_dir_all(&dir).ok();
    let filename = format!("{}_{}.{}", claims.sub, chrono::Utc::now().timestamp(), ext);
    let path = format!("{dir}/{filename}");

    std::fs::write(&path, bytes)
        .map_err(|e| AppError::Internal(format!("Write failed: {e}")))?;

    let url = format!("/api/storage/avatars/{filename}");
    Ok(VilResponse::created(UploadResponse { ok: true, url, size: bytes.len() }))
}

/// POST /api/storage/audio — upload audio file
#[vil_handler]
pub async fn upload_audio(
    _ctx: ServiceCtx,
    _claims: Claims,
    body: ShmSlice,
) -> Result<VilResponse<UploadResponse>, AppError> {
    let bytes = body.as_bytes();
    if bytes.len() > MAX_FILE_SIZE {
        return Err(AppError::Validation("File too large (max 10MB)".into()));
    }

    let ext = detect_audio_type(bytes)
        .ok_or_else(|| AppError::Validation("Invalid audio format (MP3/WAV only)".into()))?;

    let dir = format!("{}/audio", upload_dir());
    std::fs::create_dir_all(&dir).ok();
    let filename = format!("{}.{}", uuid::Uuid::new_v4(), ext);
    let path = format!("{dir}/{filename}");

    std::fs::write(&path, bytes)
        .map_err(|e| AppError::Internal(format!("Write failed: {e}")))?;

    let url = format!("/api/storage/audio/{filename}");
    Ok(VilResponse::created(UploadResponse { ok: true, url, size: bytes.len() }))
}

/// GET /api/storage/avatars/:filename — serve avatar file
#[vil_handler]
pub async fn serve_avatar(
    Path(filename): Path<String>,
) -> Result<vil_server::axum::response::Response, AppError> {
    validate_filename(&filename)?;
    serve_file(&format!("{}/avatars/{filename}", upload_dir())).await
}

/// GET /api/storage/audio/:filename — serve audio file
#[vil_handler]
pub async fn serve_audio(
    Path(filename): Path<String>,
) -> Result<vil_server::axum::response::Response, AppError> {
    validate_filename(&filename)?;
    serve_file(&format!("{}/audio/{filename}", upload_dir())).await
}

async fn serve_file(path: &str) -> Result<vil_server::axum::response::Response, AppError> {
    let bytes = tokio::fs::read(path).await
        .map_err(|_| AppError::NotFound("File not found".into()))?;

    let content_type = if path.ends_with(".png") { "image/png" }
        else if path.ends_with(".jpg") || path.ends_with(".jpeg") { "image/jpeg" }
        else if path.ends_with(".mp3") { "audio/mpeg" }
        else if path.ends_with(".wav") { "audio/wav" }
        else { "application/octet-stream" };

    Ok(vil_server::axum::response::Response::builder()
        .header("Content-Type", content_type)
        .header("Cache-Control", "public, max-age=3600")
        .body(vil_server::axum::body::Body::from(bytes))
        .unwrap())
}

fn detect_image_type(bytes: &[u8]) -> Option<&'static str> {
    if bytes.len() < 4 { return None; }
    if bytes.starts_with(&[0x89, 0x50, 0x4E, 0x47]) { return Some("image/png"); }
    if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) { return Some("image/jpeg"); }
    None
}
