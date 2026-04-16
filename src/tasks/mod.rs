use std::sync::Arc;
use vil::vil_db_sqlx::SqlxPool;

pub async fn run_periodic_tasks(pool: Arc<SqlxPool>) {
    let mut interval = tokio::time::interval(std::time::Duration::from_secs(1800)); // 30 min
    let mut hourly_counter: u32 = 0;

    loop {
        interval.tick().await;

        if let Err(_e) = cleanup_expired_claims(&pool).await {
            vil::prelude::vil_log::app_log!(Error, "task.cleanup_claims_failed", {});
        }

        if let Err(_e) = cleanup_old_logs(&pool).await {
            vil::prelude::vil_log::app_log!(Error, "task.cleanup_logs_failed", {});
        }

        // Hourly cadence on a 30-min base interval.
        hourly_counter = hourly_counter.wrapping_add(1);
        if hourly_counter % 2 == 0 {
            if let Err(_e) = expire_subscriptions_task(&pool).await {
                vil::prelude::vil_log::app_log!(Error, "task.expire_subscriptions_failed", {});
            }
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
        vil::prelude::vil_log::app_log!(Info, "task.claims_released", { count: affected });
    }
    Ok(())
}

async fn cleanup_old_logs(pool: &SqlxPool) -> Result<(), sqlx::Error> {
    pool.execute_raw(
        "DELETE FROM app_logs WHERE resolved = 1 AND created_at < datetime('now', '-30 days')",
    ).await?;
    Ok(())
}

async fn expire_subscriptions_task(pool: &SqlxPool) -> Result<(), sqlx::Error> {
    let downgraded = pool
        .execute_raw(
            "UPDATE profiles
             SET subscription_tier = 'free'
             WHERE id IN (
               SELECT user_id FROM subscriptions
               WHERE expires_at IS NOT NULL
                 AND expires_at < datetime('now')
                 AND status = 'active'
             )",
        )
        .await?;

    pool.execute_raw(
        "UPDATE subscriptions
         SET status = 'expired'
         WHERE expires_at IS NOT NULL
           AND expires_at < datetime('now')
           AND status = 'active'",
    )
    .await?;

    if downgraded > 0 {
        vil::prelude::vil_log::app_log!(Info, "task.subscriptions_expired", { count: downgraded });
    }
    Ok(())
}
