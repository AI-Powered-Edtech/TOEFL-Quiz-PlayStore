# Play Store Listing — TOEFL Quiz

> Draft v1 untuk Google Play Console. Sesuaikan sebelum submit.

## App identity
- **Package name**: `com.toeflquiz.app`
- **App name (≤30 char)**: `TOEFL Quiz — AI Practice`
- **Default language**: Bahasa Indonesia (id-ID); add English (US) as additional locale.
- **Category**: Education
- **Tags**: TOEFL, English Test, AI Tutor, Practice Quiz

## Short description (≤80 char)
- **ID**: `Latih TOEFL dengan kuis AI adaptif, feedback instan, dan progress lengkap.`
- **EN**: `Practice TOEFL with adaptive AI quizzes, instant feedback, and full progress.`

## Full description (≤4000 char)

### EN
Master the TOEFL with TOEFL Quiz — your AI-powered practice partner. Built for serious test-takers who want measurable progress, not just flashcards.

**What you get**
- Adaptive quizzes for Listening, Structure, and Reading sections
- AI essay evaluation with rubric-based feedback (Writing Gym + Essay Dojo)
- Vocabulary trainer with spaced repetition
- Daily AI bites from verified creators
- Peer review for writing submissions
- Progress tracking with XP, streaks, and CEFR level estimate
- Leaderboards and study circles to stay accountable

**Why students choose us**
- Server-side AI token budget — fair and transparent usage limits
- Real TOEFL-style passages and questions, regularly updated
- Free tier with 15 AI calls/day, premium tiers for unlimited practice
- Works offline for saved passages and prior results

**Plans**
- **Free** — 15 AI calls/day, full quiz access
- **Basic (Rp 16.500/mo)** — 500 AI calls/day, vocabulary trainer, peer review
- **C2 Pro (Rp 165.000/mo)** — 5.000 AI calls/day, priority AI, all features unlocked

Ready to push your TOEFL score higher? Install TOEFL Quiz and start your next practice session in under 30 seconds.

### ID
Kuasai TOEFL bareng TOEFL Quiz — partner latihan berbasis AI buat kamu yang serius mau naik skor, bukan sekadar hafalan.

**Apa yang kamu dapat**
- Kuis adaptif untuk Listening, Structure, dan Reading
- Penilaian esai AI dengan feedback berbasis rubrik (Writing Gym + Essay Dojo)
- Vocabulary trainer dengan spaced repetition
- Daily AI bites dari creator terverifikasi
- Peer review untuk submission writing
- Tracking progress lengkap: XP, streak, estimasi level CEFR
- Leaderboard + study circle biar tetap konsisten

**Kenapa pilih kami**
- Token AI dihitung di server — limit harian transparan dan adil
- Soal & passage gaya TOEFL asli, update rutin
- Tier gratis 15 AI call/hari, premium untuk latihan tanpa batas
- Tetap jalan offline untuk passage tersimpan dan hasil lampau

**Paket**
- **Free** — 15 AI call/hari, akses semua kuis
- **Basic (Rp 16.500/bulan)** — 500 AI call/hari, vocab trainer, peer review
- **C2 Pro (Rp 165.000/bulan)** — 5.000 AI call/hari, AI prioritas, semua fitur

Siap naikkan skor TOEFL? Install TOEFL Quiz dan mulai sesi latihan dalam 30 detik.

## Graphic assets (REQUIRED)
| Asset | Spec | Status |
|---|---|---|
| App icon | 512×512 PNG, 32-bit, no alpha | ⚠️ verify from `public/icon-512.png` |
| Feature graphic | 1024×500 PNG/JPG | ⚠️ design needed (cek `public/banner.png`) |
| Phone screenshots | 2–8 images, 16:9 or 9:16, min 320px, max 3840px | ⚠️ capture from device |
| 7" tablet (optional) | up to 8 | optional |
| 10" tablet (optional) | up to 8 | optional |
| Promo video (optional) | YouTube URL | optional |

## Privacy & policy
- **Privacy Policy URL**: must be a public HTTPS URL. Host `frontend/public/privacy-policy.html` at e.g. `https://toeflquiz.vastar.ai/privacy-policy`.
- **Account deletion URL**: required if app has user accounts → host an in-app + web flow.

## Data Safety form (Play Console)
Declare these data types collected and how:

| Data type | Collected | Shared | Purpose | Optional? |
|---|---|---|---|---|
| Name | Yes | No | Account, personalization | Yes (full_name) |
| Email address | Yes (Google OAuth) | No | Account, auth | No |
| User IDs | Yes | No | Account, analytics | No |
| App activity (in-app actions) | Yes | No | Analytics, app functionality | No |
| App performance (crash logs, diagnostics) | Yes (Sentry) | Yes (Sentry as processor) | Crash reporting | Yes |
| Photos (avatar) | Yes | No | Personalization | Yes |
| Audio (TTS uploads) | Yes | No | App functionality | Yes |
| Purchase history | Yes (Play Billing) | No | App functionality | No |
| Device or other IDs | Yes (FCM token) | No | Push notifications | Yes |

**Security practices**
- Data encrypted in transit (HTTPS) ✅
- User can request data deletion ✅ (build endpoint if missing)
- Independent security review: not yet (set to No)
- Data encrypted at rest (server-side SQLite + Argon2id passwords) ✅

## Content rating
- IARC questionnaire → expected: **Everyone / 3+** (educational app, no violence/gambling/profanity).
- Make sure user-generated content (writing submissions, peer review chat) has moderation: report flow already exists in `services/admin_monitoring.rs` and `services/monitoring.rs`. Document this in IARC "User-generated content" section.

## Target audience
- Primary: 18+ (TOEFL test-takers)
- If you target 13–17 also, you must comply with Families Policy (no behavioral ads, etc.)

## Ads
- App contains ads: **No**

## In-app purchases
- Yes: Subscription tiers (Basic Rp 16.500/mo, C2 Pro Rp 165.000/mo).
- Use Google Play Billing only (already wired via `@capgo/native-purchases`).
- Backend verification: `POST /api/purchases/verify` with `GOOGLE_PLAY_SERVICE_ACCOUNT` env credentials ✅ (per ship-playstore-release spec).

## Pre-launch report
- After uploading first AAB, Play Console runs an automated pre-launch test on real devices. Review crashes/perf issues before promoting to Production.

## Release tracks (recommended order)
1. **Internal testing** — your team only, fastest review (~hours).
2. **Closed testing (Alpha)** — invite list of beta users (50–100).
3. **Open testing (Beta)** — public opt-in.
4. **Production** — full rollout (start with 10% staged rollout).

## Submission checklist
- [ ] AAB built and signed with upload keystore
- [ ] Privacy Policy URL live (HTTPS)
- [ ] App icon 512×512 (no alpha)
- [ ] Feature graphic 1024×500
- [ ] At least 2 phone screenshots
- [ ] Short + full description (ID + EN)
- [ ] Data Safety form completed
- [ ] Content Rating questionnaire submitted
- [ ] Target audience set
- [ ] In-app products created in Play Console (matching backend product IDs)
- [ ] Test purchase verified end-to-end (sandbox → entitlement → backend update)
- [ ] Account deletion path documented
