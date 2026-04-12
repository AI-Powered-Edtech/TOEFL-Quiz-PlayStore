# Auth & User Management Spec

## Why
Pengguna membutuhkan sistem autentikasi yang aman dan pengalaman pengguna guest yang membatasi akses sambil tetap menyediakan jalur upgrade ke akun penuh.Guest policy perlu memberikan pengalaman yang berbeda dari pengguna terdaftar untuk mendorong konversi.

## What Changes
- Implementasi Supabase Auth dengan Google OAuth
- Guest mode dengan batasan yang jelas (daily quiz limit, hearts system)
- Paywall sheet untuk akses premium
- User profile management

## Impact
- Affected specs: All features (gateway)
- Affected code: `frontend/src/services/auth.ts`, `frontend/src/hooks/useGuestPolicy.tsx`

---

## ADDED Requirements

### Requirement: Google OAuth Authentication
The system SHALL provide secure authentication via Google OAuth 2.0 using Supabase Auth.

#### Scenario: Successful Google Login
- **GIVEN** user has valid Google account
- **WHEN** user clicks "Login with Google" and completes OAuth flow
- **THEN** user is authenticated and redirected to dashboard
- **AND** user profile is created/updated in database

#### Scenario: OAuth Failure
- **GIVEN** OAuth flow fails (cancelled, error)
- **WHEN** user is redirected back to app
- **THEN** user sees error toast with retry option
- **AND** remains on current page

### Requirement: Guest User Mode
The system SHALL allow limited access without registration, with clear limitations to encourage conversion.

#### Scenario: Guest Quiz Limit
- **GIVEN** guest user has reached daily quiz limit (5 quizzes)
- **WHEN** guest tries to start new quiz
- **THEN** paywall sheet is displayed
- **AND** "Sign up to continue" CTA is prominent

#### Scenario: Guest Hearts System
- **GIVEN** guest user with 0 hearts remaining
- **WHEN** guest answers incorrectly on quiz
- **AND** no hearts to use as lifeline
- **THEN** session ends with option to upgrade or wait for heart regenerate (24 jam)

#### Scenario: Guest to Registered Conversion
- **GIVEN** guest user wants full access
- **WHEN** guest clicks "Sign up with Google"
- **THEN** OAuth flow initiates
- **AND** guest progress is migrated to registered account

### Requirement: User Profile Management
The system SHALL allow users to view and update their profile information.

#### Scenario: Update Display Name
- **GIVEN** authenticated user
- **WHEN** user updates display name in settings
- **THEN** name is updated across all surfaces
- **AND** change reflects in leaderboard, comments

#### Scenario: Update Avatar
- **GIVEN** authenticated user
- **WHEN** user updates avatar (Google profile image)
- **THEN** avatar syncs from Google
- **OR** user uploads custom avatar

---

## MODIFIED Requirements

### Requirement: Session Persistence
User sessions SHALL persist across app restarts using secure token storage.

#### Scenario: Auto Re-authentication
- **GIVEN** valid refresh token exists
- **WHEN** app launches
- **THEN** user is automatically authenticated
- **AND** previous session is restored

### Requirement: Logout
The system SHALL provide secure logout that clears all session data.

#### Scenario: Complete Logout
- **GIVEN** authenticated user
- **WHEN** user clicks logout
- **THEN** all tokens are cleared
- **AND** user is redirected to splash/guest view

---

## Guest Policy Details

### Daily Limits (Production Best Practice)
| Feature | Guest Limit | Registered Limit |
|---------|------------|-------------------|
| Quiz/day | 5 | Unlimited |
| Hearts | 3 (regenerate 1/24hr) | 10 (regenerate 1/24hr) |
| Essay Submissions | 1 | Unlimited |
| Peer Reviews | 0 | 3/day |
| AI Feedback | 2 | Unlimited |

### Paywall Enforcement
- Heart count displayed prominently (red when <2)
- Quiz attempt blocked with smooth paywall sheet
- Premium features show lock icon with upgrade CTA

---

## Security Requirements (Best Practice)

### OAuth Security
1. Use PKCE (Proof Key for Code Exchange) for authorization flow
2. Validate state parameter to prevent CSRF
3. Store tokens in secure, httpOnly cookies
4. Implement token rotation on refresh
5. Clear all sensitive data on logout

### Guest Mode Security
1. Guest ID stored locally (not in cookies for privacy)
2. Guest progress stays local (IndexedDB)
3. Clear guest data on conversion or logout
4. No personal data collected from guests

---

## Analytics & Monitoring

### Auth Events to Track
- `auth_google_login_start` - OAuth flow initiated
- `auth_google_login_success` - Successful login
- `auth_google_login_error` - Login failed
- `auth_guest_conversion` - Guest became registered user
- `auth_logout` - User logged out
- `auth_session_expired` - Session expired

### Conversion Metrics
- Guest → Registered conversion rate target: 15%
- Daily active guest to registered: target 5%
- Avg time to conversion: target <7 days