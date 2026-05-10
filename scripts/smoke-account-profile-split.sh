#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIG_DIR="$ROOT/migrations/production"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
DB="$TMP_DIR/account-profile.db"

for f in "$MIG_DIR"/*.sql; do
  sqlite3 "$DB" < "$f"
done

ACCOUNT_ID="acct-smoke-1"
sqlite3 "$DB" "INSERT INTO accounts (id, username, full_name, password_hash, subscription_tier) VALUES ('$ACCOUNT_ID', 'smoke_user', 'Smoke User', 'hash', 'free');"
sqlite3 "$DB" "INSERT INTO profiles (username, avatar_url, total_xp, current_streak, is_public) VALUES ('smoke_user', NULL, 0, 0, 1);"
PUBLIC_ID="$(sqlite3 "$DB" "SELECT id FROM profiles WHERE username = 'smoke_user' ORDER BY id DESC LIMIT 1;")"
sqlite3 "$DB" "UPDATE accounts SET public_profile_id = $PUBLIC_ID WHERE id = '$ACCOUNT_ID';"
sqlite3 "$DB" "INSERT INTO friend_codes (account_id, code) VALUES ('$ACCOUNT_ID', 'SMOKE123');"
sqlite3 "$DB" "UPDATE profiles SET total_xp = COALESCE(total_xp, 0) + 125 WHERE id = (SELECT public_profile_id FROM accounts WHERE id = '$ACCOUNT_ID');"
XP="$(sqlite3 "$DB" "SELECT ('' || total_xp) FROM profiles WHERE id = $PUBLIC_ID;")"
[[ "$XP" == "125" ]] || { echo "xp smoke failed: $XP" >&2; exit 1; }
CODE_ACCOUNT="$(sqlite3 "$DB" "SELECT account_id FROM friend_codes WHERE code = 'SMOKE123';")"
[[ "$CODE_ACCOUNT" == "$ACCOUNT_ID" ]] || { echo "friend code smoke failed" >&2; exit 1; }
LEADER="$(sqlite3 "$DB" "SELECT COALESCE(ac.full_name, p.username) || ':' || COALESCE(p.total_xp, 0) FROM profiles p LEFT JOIN accounts ac ON ac.public_profile_id = p.id ORDER BY COALESCE(p.total_xp,0) DESC LIMIT 1;")"
[[ "$LEADER" == "Smoke User:125" ]] || { echo "leaderboard smoke failed: $LEADER" >&2; exit 1; }
sqlite3 "$DB" "DELETE FROM accounts WHERE id = '$ACCOUNT_ID'; DELETE FROM profiles WHERE id = $PUBLIC_ID; DELETE FROM friend_codes WHERE account_id = '$ACCOUNT_ID';"
LEFT="$(sqlite3 "$DB" "SELECT ('' || COUNT(*)) FROM accounts WHERE id = '$ACCOUNT_ID';")"
[[ "$LEFT" == "0" ]] || { echo "delete smoke failed" >&2; exit 1; }
echo "ok: account/profile split smoke"
