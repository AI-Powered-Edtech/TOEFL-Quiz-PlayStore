#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_PATH="${1:-$ROOT/data.db}"
MODE="${2:---dry-run}"
MIG_DIR="$ROOT/migrations/production"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

if [[ ! -f "$DB_PATH" ]]; then
  echo "database not found: $DB_PATH" >&2
  exit 1
fi

apply_all() {
  local db="$1"
  for f in "$MIG_DIR"/*.sql; do
    sqlite3 "$db" < "$f"
  done
}

verify_db() {
  local db="$1"
  local required=(profiles purchase_entitlements accounts friend_codes)
  for t in "${required[@]}"; do
    local c
    c="$(sqlite3 "$db" "SELECT ('' || COUNT(*)) FROM sqlite_master WHERE type='table' AND name='$t';")"
    [[ "$c" == "1" ]] || { echo "missing table $t" >&2; return 1; }
  done
  local profile_cols
  profile_cols="$(sqlite3 "$db" "SELECT group_concat(name, ',') FROM pragma_table_info('profiles');")"
  [[ "$profile_cols" == "id,username,avatar_url,total_xp,current_streak,is_public" ]] || {
    echo "profiles schema drift: $profile_cols" >&2
    return 1
  }
  sqlite3 "$db" "SELECT ('' || COUNT(*)) FROM profiles;" >/dev/null
}

if [[ "$MODE" == "--apply-live" ]]; then
  BACKUP="$DB_PATH.backup.$TS"
  cp "$DB_PATH" "$BACKUP"
  echo "backup=$BACKUP"
  apply_all "$DB_PATH"
  verify_db "$DB_PATH"
  echo "ok: live migrations applied safely"
else
  COPY="$TMP_DIR/$(basename "$DB_PATH").dry-run.db"
  cp "$DB_PATH" "$COPY"
  apply_all "$COPY"
  verify_db "$COPY"
  echo "ok: dry-run migrations verified on copy"
fi
