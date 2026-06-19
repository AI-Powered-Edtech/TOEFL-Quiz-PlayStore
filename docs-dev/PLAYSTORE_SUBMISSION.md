# Google Play Store — First Submission Walkthrough

Step-by-step guide for the operator's first submission of TOEFL Quiz. Each step has concrete choices to make.

---

## 1. Prepare store assets

Place final assets in `frontend/store-assets/` (gitignored or tracked as you prefer):

| Asset | Spec | Notes |
|---|---|---|
| App icon | 512×512 PNG, no alpha | Match in-app icon |
| Screenshots (phone) | 1080×1920 portrait, 2–8 images | Show: home, quiz, result, profile |
| Screenshots (tablet, optional) | 1920×1080 landscape | Only if targeting tablets |
| Feature graphic | 1024×500 PNG/JPG | Shown at top of listing |
| Promo video (optional) | YouTube URL | 30s preferred, ≤2 min |

Screenshots should show real UI (not mockups) with sample data. Avoid placeholder text.

---

## 2. Write descriptions (EN + ID)

**Short description** — ≤80 chars. Hook in one line. Example:

> Practice TOEFL ITP with AI-powered feedback and daily mock tests.

**Full description** — ≤4000 chars. Recommended structure:

1. One-paragraph summary.
2. Key features (bulleted).
3. Who it's for.
4. Subscription tiers (required by Play if you offer IAP).
5. Link to Privacy Policy and Terms.
6. Support contact.

Provide both English and Bahasa Indonesia versions under the **Localizations** section of the Play Console listing.

---

## 3. Data safety form

Declare every data type you collect. For TOEFL Quiz:

| Data type | Collected? | Shared? | Purpose | Optional? |
|---|---|---|---|---|
| Email address | Yes | No | Account, account recovery | Required |
| Name (username) | Yes | No | Account, user-to-user feature | Required |
| User-generated content (essay, quiz answers) | Yes | No | App functionality | Required |
| App interactions | Yes | No | Analytics | Required |
| Crash logs | Yes | No (Sentry is a processor, not a 3rd-party sale) | Diagnostics | Required |
| Device IDs | Yes | No | Analytics, anti-abuse | Required |
| Payment info | No (Google handles) | — | — | — |
| Location | No | — | — | — |

Answer **No** to: "Is all user data encrypted in transit?" → ⚠️ actually answer **Yes** (HTTPS/TLS). Answer **Yes** to: "Do you provide a way for users to request data deletion?" (link to `/delete-account.html`).

---

## 4. Content rating questionnaire

Suggested answers for a TOEFL prep app:

- Category: **Reference, News, or Educational**
- Violence: **None**
- Sexuality: **None**
- Language: **None**
- Controlled substances: **None**
- Gambling: **None**
- User interactions: **Yes** (peer review / messages) → discloses user-to-user communication
- Shares user location: **No**
- Digital purchases: **Yes** (subscriptions)

Expected rating: **Everyone** or **Everyone 10+**.

---

## 5. Pricing & distribution

- Free with in-app purchases (subscriptions).
- Target countries — **start narrow**: Indonesia (ID), Singapore (SG), Malaysia (MY), Philippines (PH). Expand after 1–2 months of stable data.
- Contains ads: **No** (unless you add them).

---

## 6. Upload AAB & testing tracks

1. **Internal Testing** first. Upload AAB, add 5–10 testers by email. Share opt-in link.
2. After 3–5 days of internal validation, promote the same build to **Closed Testing** (up to 100 testers).
3. Run Closed Testing for **1 week minimum** — Google tracks stability metrics per track.
4. **Open Testing** (public opt-in) for 1–2 weeks. This is your beta.
5. Submit for **Production** review.

Google's **14-day closed-testing requirement** applies to new personal developer accounts; check current policy in Play Console before timing the launch.

---

## 7. Review period

- First submission: typically **3–7 days**, occasionally longer.
- Subsequent updates: typically **1–2 days**.
- Rejection reasons to avoid:
  - Missing / non-working Privacy Policy URL.
  - Data safety form mismatches actual collection.
  - Broken account deletion flow.
  - Screenshots do not match app UI.

---

## 8. Post-review rollout

1. Write a short **release note** (≤500 chars) — user-facing changelog.
2. Use **phased rollout**:
   - Day 1: **10%** of users.
   - Day 3 (if crash-free rate ≥99%): **50%**.
   - Day 7: **100%**.
3. Monitor Sentry + Play Console vitals **daily** for the first 2 weeks.
4. If crash rate spikes above **1%**, halt rollout immediately (Play Console → Production → Halt rollout).

---

## Quick reference — what Play will ask for

- [ ] AAB signed with release keystore
- [ ] App icon 512×512
- [ ] Feature graphic 1024×500
- [ ] 2–8 phone screenshots
- [ ] Short + full description (EN + ID)
- [ ] Privacy Policy URL
- [ ] Terms of Service URL
- [ ] Account deletion URL
- [ ] Data safety form completed
- [ ] Content rating questionnaire completed
- [ ] Target audience (age) declared
- [ ] Subscription products set up (if offering IAP)
- [ ] Test account credentials (for review team)
