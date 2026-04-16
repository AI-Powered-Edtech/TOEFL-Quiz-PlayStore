# Production Checklist — TOEFL Quiz

Pre-launch checklist for operators. Tick items as you complete them. Run items top-to-bottom; later items depend on earlier ones.

> ⚠️ **Irrecoverable actions** are flagged. Read the full line before acting.

---

## 1. Secrets & Credentials

- [ ] **Rotate `GROQ_API_KEY`** — previous key leaked in git history (commit `d4f0488`). Go to https://console.groq.com → API Keys → Revoke old, create new.
- [ ] **Generate strong `JWT_SECRET`** (min 256-bit):
  ```bash
  openssl rand -base64 48
  ```
- [ ] **Generate `ADMIN_PASSCODE_HASH`** for admin PIN:
  ```bash
  cargo run --bin hash_passcode -- <PIN>
  ```
  (If the binary does not exist, write a small Rust script using `argon2` crate.)
- [ ] **Create Google Cloud project** → enable OAuth 2.0 → create Android OAuth client → copy client ID into `GOOGLE_OAUTH_CLIENT_ID`.
- [ ] **Create Firebase project** → download `google-services.json` → place in `frontend/android/app/`.
- [ ] **Create Sentry projects** (one for backend, one for frontend) → copy DSNs into `SENTRY_DSN` and `VITE_SENTRY_DSN`.

## 2. Infrastructure

- [ ] Provision VPS (Hetzner / DigitalOcean / Railway recommended). Minimum **2 GB RAM**, 2 vCPU, 40 GB disk.
- [ ] Register domain; point DNS A record to VPS IP.
- [ ] Install Docker + docker-compose on VPS:
  ```bash
  curl -fsSL https://get.docker.com | sh
  sudo apt-get install -y docker-compose-plugin
  ```
- [ ] Clone repo on VPS; copy `.env.example` → `.env.production`; fill real values.
- [ ] Bring up stack (see `DEPLOYMENT.md`):
  ```bash
  docker compose --env-file .env.production up -d
  ```
- [ ] Verify health:
  ```bash
  curl https://your-domain.com/health
  # Expect HTTP 200
  ```
- [ ] Provision B2 or S3 bucket for Litestream backups. Configure `LITESTREAM_*` env vars.
- [ ] **Test backup + restore procedure at least once** before launch. A backup you never restored is not a backup.

## 3. Android Build & Signing

- [ ] Generate release keystore:
  ```bash
  keytool -genkey -v \
    -keystore toefl-quiz.keystore \
    -alias toeflquiz \
    -keyalg RSA -keysize 4096 \
    -validity 9125
  ```
- [ ] ⚠️ **BACKUP keystore to 2+ secure locations** (password manager + offline drive). **Lost keystore = can never update the app on Play Store.** No recovery, no workaround.
- [ ] Create `frontend/android/keystore.properties` (gitignored) from `keystore.properties.example`.
- [ ] Test release build locally:
  ```bash
  cd frontend/android && ./gradlew bundleRelease
  ```

## 4. Google Play Console

- [ ] Register developer account — $25 one-time fee, Google identity verification required.
- [ ] Create app listing:
  - Name (≤30 chars)
  - Short description (≤80 chars) — EN + ID
  - Full description (≤4000 chars) — EN + ID
  - 2–8 screenshots, portrait, 1080×1920
  - Feature graphic 1024×500 PNG/JPG
  - App icon 512×512 PNG
- [ ] Content rating questionnaire — select **Educational**, target **13+**.
- [ ] **Data safety form** — declare: email, username, quiz answers, usage data. No selling. Purposes: account, analytics, functionality.
- [ ] Privacy Policy URL: `https://your-domain.com/privacy-policy.html`
- [ ] Terms of Service URL: `https://your-domain.com/terms-of-service.html`
- [ ] Account deletion URL: `https://your-domain.com/delete-account.html`
- [ ] Create 2 subscription products:
  - `basic_monthly` — Rp 49,000
  - `c2_monthly` — Rp 149,000
- [ ] Create **Service Account** (IAM → Service Accounts) for Play API access. Download JSON. Add `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` to GitHub repo secrets (for CI release).

## 5. Testing Phases

- [ ] Upload first AAB to **Internal Testing** track.
- [ ] Add 5–10 internal testers (team + trusted users).
- [ ] Validate: install, register, guest flow, quiz, subscription purchase (sandbox mode).
- [ ] Promote to **Closed Testing** (≤100 users).
- [ ] Wait 1 week; collect feedback; fix blockers.
- [ ] Promote to **Open Testing** (public opt-in).
- [ ] Wait 1–2 weeks. Monitor Sentry, crash rate, DAU.
- [ ] Submit for **Production** review → phased rollout **10% → 50% → 100%**.

## 6. Legal

- [ ] Have a lawyer review Terms of Service and Privacy Policy. The templates in `frontend/public/` are **NOT legal advice**.
- [ ] Register as **PSE Privat** at KOMINFO (Indonesia) if required for domestic distribution.
- [ ] **Tax registration (NPWP)** if selling subscriptions to Indonesian users.

## 7. Post-launch Monitoring

- [ ] Sentry alert rule configured for crash-free rate < 99%.
- [ ] Grafana (or equivalent) dashboard pulling `/metrics`.
- [ ] Uptime monitor (UptimeRobot, BetterStack, or similar) on `/health`, 1-minute interval.
- [ ] Scheduled weekly backup verification:
  ```bash
  litestream restore -o /tmp/verify.db s3://bucket/path
  sqlite3 /tmp/verify.db "PRAGMA integrity_check;"
  ```

---

## Before flipping to 100%

Double-check:
- [ ] `.env.production` has no placeholder values.
- [ ] Keystore is backed up in 2+ locations.
- [ ] Sentry is receiving real events from staging.
- [ ] You can restore from the latest Litestream snapshot.
- [ ] On-call rotation / contact method is decided.
