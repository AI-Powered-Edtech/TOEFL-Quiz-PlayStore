#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
DB="${1:-data.db}"
[[ -f "$DB" ]] || { echo "missing DB: $DB" >&2; exit 1; }

echo "=== live profiles schema: $DB ==="
sqlite3 "$DB" "PRAGMA table_info(profiles);"

echo "=== Rust profile assumptions ==="
grep -RInE "Profile::|profiles|subscription_tier|password_hash|full_name|bio|friend_code|hearts_count|\bxp\b|created_at|updated_at|peer_review_prefs" src --include='*.rs' \
  | grep -E "src/services|src/models|src/bin" \
  | sed -n '1,260p'

echo "=== verdict ==="
if sqlite3 "$DB" "PRAGMA table_info(profiles);" | grep -q '|subscription_tier|'; then
  echo "profiles has rich auth columns"
else
  echo "profiles is live VWFD 6-column shape; Rust auth/profile/social/admin paths that expect rich columns are not safe against this DB."
fi
