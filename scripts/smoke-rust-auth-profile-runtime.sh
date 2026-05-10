#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'set +e; [[ -n "${SERVER_PID:-}" ]] && kill "$SERVER_PID" 2>/dev/null; rm -rf "$TMP_DIR"' EXIT
DB="$TMP_DIR/runtime-smoke.db"
LOG="$TMP_DIR/rust-8082.log"
PORT="${RUNTIME_SMOKE_PORT:-18082}"
BASE="http://127.0.0.1:$PORT/api"
cp "$ROOT/data.db" "$DB"
"$ROOT/scripts/apply-production-migrations-safe.sh" "$DB" --dry-run >/dev/null
# Apply to the temp DB itself after dry-run verification.
for f in "$ROOT/migrations/production"/*.sql; do sqlite3 "$DB" < "$f"; done

JWT_SECRET="runtime-smoke-secret-runtime-smoke-secret-123456" \
DATABASE_URL="sqlite://$DB" \
PORT="$PORT" \
GROQ_API_KEY="" \
APP_ENV="development" \
SKIP_LEGACY_MIGRATIONS="1" \
nohup "$ROOT/target/debug/toefl-quiz-backend" > "$LOG" 2>&1 &
SERVER_PID=$!

for i in $(seq 1 45); do
  if curl -fsS "$BASE/social/leaderboard" >/dev/null 2>&1; then break; fi
  sleep 1
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "server exited early" >&2
    cat "$LOG" >&2
    exit 1
  fi
  if [[ "$i" == "45" ]]; then
    echo "server did not become ready" >&2
    cat "$LOG" >&2
    exit 1
  fi
done

USER="smoke_$(date +%s)_$RANDOM"
PASS="Password123!"
REG_BODY="{\"username\":\"$USER\",\"password\":\"$PASS\",\"full_name\":\"Runtime Smoke\"}"
REG="$(curl -fsS -X POST "$BASE/auth/register" -H 'Content-Type: application/json' -d "$REG_BODY")"
TOKEN="$(printf '%s' "$REG" | python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])')"
USER_ID="$(printf '%s' "$REG" | python3 -c 'import json,sys; print(json.load(sys.stdin)["profile"]["id"])')"
[[ -n "$TOKEN" && -n "$USER_ID" ]]
LOGIN="$(curl -fsS -X POST "$BASE/auth/login" -H 'Content-Type: application/json' -d "{\"username\":\"$USER\",\"password\":\"$PASS\"}")"
printf '%s' "$LOGIN" | python3 -c 'import json,sys; assert json.load(sys.stdin)["ok"] is True'
PROFILE="$(curl -fsS "$BASE/auth/profile" -H "Authorization: Bearer $TOKEN")"
printf '%s' "$PROFILE" | python3 -c 'import json,sys; p=json.load(sys.stdin); assert p["username"]; assert "total_xp" in p or "xp" in p'
PATCHED="$(curl -fsS -X PATCH "$BASE/auth/profile" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"bio":"runtime smoke bio"}')"
printf '%s' "$PATCHED" | python3 -c 'import json,sys; assert json.load(sys.stdin)["bio"] == "runtime smoke bio"'
PUBLIC="$(curl -fsS "$BASE/profile/$USER_ID")"
printf '%s' "$PUBLIC" | python3 -c 'import json,sys; p=json.load(sys.stdin); assert p["id"]; assert "friend_code" in p'
CODE_JSON="$(curl -fsS "$BASE/social/friends/code" -H "Authorization: Bearer $TOKEN")"
printf '%s' "$CODE_JSON" | python3 -c 'import json,sys; p=json.load(sys.stdin); assert p["ok"] is True; assert len(p["friend_code"]) >= 6'
LEADER="$(curl -fsS "$BASE/social/leaderboard")"
printf '%s' "$LEADER" | python3 -c 'import json,sys; assert isinstance(json.load(sys.stdin), list)'
DEL="$(curl -fsS -X DELETE "$BASE/auth/account" -H "Authorization: Bearer $TOKEN")"
printf '%s' "$DEL" | python3 -c 'import json,sys; assert json.load(sys.stdin)["ok"] is True'
LEFT="$(sqlite3 "$DB" "SELECT ('' || COUNT(*)) FROM accounts WHERE id='$USER_ID';")"
[[ "$LEFT" == "0" ]] || { echo "delete did not remove account" >&2; exit 1; }
echo "ok: rust auth/profile runtime smoke"
