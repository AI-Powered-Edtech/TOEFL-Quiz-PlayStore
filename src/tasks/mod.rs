use std::sync::Arc;
use vil_db_sqlx::SqlxPool;

pub async fn run_periodic_tasks(pool: Arc<SqlxPool>) {
    let mut interval = tokio::time::interval(std::time::Duration::from_secs(1800)); // 30 min

    loop {
        interval.tick().await;

        if let Err(_e) = cleanup_expired_claims(&pool).await {
            vil_log::app_log!(Error, "task.cleanup_claims_failed", {});
        }

        if let Err(_e) = cleanup_old_logs(&pool).await {
            vil_log::app_log!(Error, "task.cleanup_logs_failed", {});
        }
    }
}

async fn cleanup_expired_claims(pool: &SqlxPool) -> Result<(), sqlx::Error> {
    let affected = pool.execute_raw(
        "UPDATE peer_review_submissions
         SET claimed_by = NULL, claimed_at = NULL, status = 'pending'
         WHERE status = 'in_review' AND claimed_at < datetime('now', '-30 minutes')",
    ).await?;

    if affected > 0 {
        vil_log::app_log!(Info, "task.claims_released", { count: affected });
    }
    Ok(())
}

async fn cleanup_old_logs(pool: &SqlxPool) -> Result<(), sqlx::Error> {
    pool.execute_raw(
        "DELETE FROM app_logs WHERE resolved = 1 AND created_at < datetime('now', '-30 days')",
    ).await?;
    Ok(())
}
