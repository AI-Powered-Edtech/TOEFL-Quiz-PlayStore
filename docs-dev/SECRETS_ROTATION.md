# Secrets Rotation Runbook

Per-secret rotation procedures. Follow the steps in order. Each rotation assumes you have SSH access to the VPS and permission to update `.env.production`.

> ⚠️ Some secrets **cannot be rotated** without breaking the app. Those are called out below.

---

## GROQ_API_KEY

**Impact if leaked:** attacker can burn your Groq credits.

**Rotation steps:**
1. Log in to https://console.groq.com → API Keys.
2. Click **Create API Key**, copy new value.
3. Edit `.env.production` on VPS, set `GROQ_API_KEY=<new>`.
4. Rolling restart the backend:
   ```bash
   docker compose --env-file .env.production up -d --no-deps backend
   ```
5. Confirm AI calls still work (hit `/api/ai/token-usage` with a test user).
6. Revoke the old key in Groq console.

**Cadence:** every 90 days, or immediately on suspected compromise.

---

## JWT_SECRET

**Impact if rotated:** ⚠️ **all existing user sessions are invalidated.** Every user must log in again.

**Rotation steps:**
1. Announce a **scheduled maintenance window** (~5 minutes).
2. Generate a new secret:
   ```bash
   openssl rand -base64 48
   ```
3. Update `.env.production` with new value.
4. Restart backend:
   ```bash
   docker compose --env-file .env.production up -d --no-deps backend
   ```
5. Frontend will get 401 on next request → redirect to login (already wired).

**Cadence:** only on compromise or once a year. Do **not** rotate casually.

---

## ADMIN_PASSCODE_HASH

**Impact if leaked:** attacker with DB access can brute-force the PIN.

**Rotation steps:**
1. Generate new hash:
   ```bash
   cargo run --bin hash_passcode -- <NEW_PIN>
   ```
2. Update `.env.production` with new hash.
3. Restart backend.
4. Test admin login with the new PIN.

**Cadence:** every 6 months, or on team change.

---

## Keystore password (Android signing)

**Impact if lost:** ⚠️ **you cannot rotate the keystore itself** — Play Store rejects apps signed by a different key. If the keystore **file** is lost, you must publish a new app (new package name, no update path).

**Guidance:** accept the risk. Do not rotate. Instead:
- Store keystore in 2+ secure locations (password manager + offline encrypted drive).
- Restrict access to a minimal set of operators.
- If the password alone is suspected leaked (keystore file still in your possession), use `keytool -storepasswd` to change it — note Play App Signing may mitigate this; check your account's signing mode before relying on that.

---

## Google OAuth client secret

**Impact if leaked:** attacker can impersonate your OAuth client (limited — Android clients use package + SHA, not a secret).

**Rotation steps:**
1. Go to https://console.cloud.google.com → APIs & Services → Credentials.
2. Click OAuth 2.0 Client → **Reset secret** (web client) or regenerate (Android).
3. Download new client config; update `GOOGLE_OAUTH_CLIENT_ID` and any secret var in `.env.production`.
4. Restart backend.
5. For Android: rebuild AAB with updated config if the client ID changed.

**Cadence:** yearly, or on suspected compromise.

---

## Google Play Service Account

**Impact if leaked:** attacker can upload releases, modify listing, read financial data.

**Rotation steps:**
1. Go to https://console.cloud.google.com → IAM → Service Accounts.
2. Select the Play API service account → **Keys** → **Add Key → Create new key** (JSON).
3. Update the `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` GitHub secret with the new JSON.
4. Delete the old key from the service account.
5. Trigger a dry-run release workflow to confirm it still works.

**Cadence:** every 6 months per compliance guidance.

---

## Firebase service account

**Impact if leaked:** attacker can send push notifications, read analytics, modify Firebase resources.

**Rotation steps:**
1. Firebase Console → Project Settings → Service Accounts → **Generate new private key**.
2. Update the corresponding env var or secret manager entry.
3. Restart any service that uses it.
4. Revoke the old key in Cloud Console.

**Cadence:** every 6 months.

---

## Litestream S3 / B2 keys

**Impact if leaked:** attacker can read or delete your database backups.

**Rotation steps:**
1. Create a new key pair in B2 (Application Keys) or AWS IAM.
2. Update `LITESTREAM_ACCESS_KEY_ID` and `LITESTREAM_SECRET_ACCESS_KEY` in `.env.production`.
3. Restart litestream container:
   ```bash
   docker compose --env-file .env.production up -d --no-deps litestream
   ```
4. Check logs for successful snapshot within 1 minute:
   ```bash
   docker compose logs litestream --tail 50
   ```
5. Revoke the old key.

**Cadence:** every 90 days.

---

## Sentry DSNs

**Impact if leaked:** attacker can send garbage events (quota exhaustion). DSNs are not sensitive per se.

**Rotation steps:** In Sentry → Project Settings → Client Keys (DSN) → revoke + create new. Update env vars. Restart.

**Cadence:** only on abuse.

---

## Rotation summary table

| Secret | Cadence | Downtime? |
|---|---|---|
| GROQ_API_KEY | 90 days | None (rolling) |
| JWT_SECRET | Yearly / on compromise | ⚠️ All sessions logged out |
| ADMIN_PASSCODE_HASH | 6 months | None |
| Keystore password | **Do not rotate** | N/A |
| Google OAuth | Yearly | Rebuild AAB if client ID changes |
| Play Service Account | 6 months | None |
| Firebase SA | 6 months | None |
| Litestream keys | 90 days | None |
| Sentry DSNs | On abuse | None |
