#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND="$ROOT/frontend"
MANIFEST="$FRONTEND/android/app/src/main/AndroidManifest.xml"
ENV_PROD="$FRONTEND/.env.production"

fail() { echo "release-gate: $*" >&2; exit 1; }

[[ -f "$ENV_PROD" ]] || fail "missing frontend/.env.production"
[[ -f "$MANIFEST" ]] || fail "missing AndroidManifest.xml"

if grep -Eq 'localhost|127\.0\.0\.1|dev-secret-change-me|change-me-in-production' "$ENV_PROD"; then
  fail "production env contains localhost/dev secret placeholder"
fi

grep -q 'VITE_API_URL=https://' "$ENV_PROD" || fail "VITE_API_URL must be https in production"
grep -q 'VITE_VWFD_URL=https://' "$ENV_PROD" || fail "VITE_VWFD_URL must be https in production"
grep -q 'android:allowBackup="false"' "$MANIFEST" || fail "android:allowBackup must be false for release"
grep -q 'android:usesCleartextTraffic="false"' "$MANIFEST" || fail "android:usesCleartextTraffic must be false for release"

(
  cd "$FRONTEND"
  npm run build
  npx cap sync android
  if [[ "${RUN_ANDROID_BUNDLE:-0}" == "1" ]]; then
    npm run android:bundle
  fi
)

echo "release-gate: ok"
