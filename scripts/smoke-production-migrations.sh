#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIG_DIR="$ROOT/migrations/production"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

fresh="$TMP_DIR/fresh.db"
existing="$TMP_DIR/existing.db"

apply_all() {
  local db="$1"
  for f in "$MIG_DIR"/*.sql; do
    sqlite3 "$db" < "$f"
  done
}

assert_table() {
  local db="$1" table="$2"
  local count
  count=$(sqlite3 "$db" "SELECT ('' || COUNT(*)) AS x FROM sqlite_master WHERE type='table' AND name='$table';")
  if [[ "$count" != "1" ]]; then
    echo "missing table $table in $db" >&2
    return 1
  fi
}

apply_all "$fresh"
cp "$ROOT/data.db" "$existing"
apply_all "$existing"

required=(
  profiles app_logs blog_posts cefr_results peer_review_submissions
  moderation_reports audit_logs creator_profiles creator_revenue_events creator_payouts
  question_bank_admin user_media_assets circle_messages_v2 oracle_prediction_history purchase_entitlements accounts friend_codes admin_users
)

for db in "$fresh" "$existing"; do
  for t in "${required[@]}"; do
    assert_table "$db" "$t"
  done
  sqlite3 "$db" "PRAGMA table_info(profiles);" | grep -q '^5|is_public|INTEGER'
  sqlite3 "$db" "SELECT ('' || COUNT(*)) AS x FROM profiles;" >/dev/null
  echo "ok: $(basename "$db") tables=${#required[@]}"
done
