-- Track active/expired state so the hourly cron can downgrade tiers.
ALTER TABLE subscriptions ADD COLUMN status TEXT DEFAULT 'active';
