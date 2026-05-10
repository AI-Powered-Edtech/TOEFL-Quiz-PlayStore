#!/usr/bin/env bash
# Generate a Play Store upload keystore. Run ONCE, store the resulting .jks
# OUTSIDE git (e.g. ~/.android-keys/toefl-quiz-upload.jks) and back it up.
# Losing this keystore = you can never update the app on Play Store.
#
# Usage: ./generate-keystore.sh /absolute/path/to/output.jks
set -euo pipefail
OUT="${1:-$HOME/.android-keys/toefl-quiz-upload.jks}"
ALIAS="${KEY_ALIAS:-toeflquiz}"
mkdir -p "$(dirname "$OUT")"
if [ -f "$OUT" ]; then
  echo "Keystore already exists at $OUT — refusing to overwrite."
  exit 1
fi
read -r -s -p "Keystore password (min 6 chars): " STORE_PW; echo
read -r -s -p "Key password (press enter to reuse store password): " KEY_PW; echo
[ -z "$KEY_PW" ] && KEY_PW="$STORE_PW"
read -r -p "Common Name (your name or org, e.g. 'Boim Dwi'): " CN
read -r -p "Organization (e.g. 'Vastar'): " O
read -r -p "City (e.g. 'Jakarta'): " L
read -r -p "State (e.g. 'DKI Jakarta'): " ST
read -r -p "Country code (e.g. 'ID'): " C
keytool -genkey -v \
  -keystore "$OUT" \
  -storepass "$STORE_PW" \
  -keypass "$KEY_PW" \
  -alias "$ALIAS" \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=$CN, O=$O, L=$L, ST=$ST, C=$C"
echo
echo "Keystore created at: $OUT"
echo "Alias: $ALIAS"
echo
echo "Next: copy frontend/android/release-artifacts/keystore.properties.example"
echo "      to frontend/android/keystore.properties and fill in your paths/passwords."
