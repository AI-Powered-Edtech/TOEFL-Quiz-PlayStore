# Architectural Refactor (Backend-Heavy) Spec

## Why
Transform the architecture to be "Backend-Heavy" (complex logic in Rust) and "Frontend-Light" (React as a high-performance presentation and caching layer), aiming for a 10/10 Production Readiness score for all features. This ensures better security, performance, and maintainability by moving complex calculations, state tracking, and direct data mutations to the Rust backend while leveraging Optimistic UI and IndexedDB on the frontend.

## What Changes
- Migrate Peer Review storage from LocalStorage to Rust backend, implementing a write-behind cache via `offlineQueueService`.
- Move Score Oracle statistical probability algorithms from the React frontend to the Rust backend.
- Migrate the Adaptive Quiz Engine's UserPerformanceMetrics tracking and difficulty calculation to the Rust backend.
- Implement PKCE for OAuth for enhanced security.
- **BREAKING**: LocalStorage will no longer be the primary source of truth for peer reviews.

## Impact
- Affected specs: Peer Review, Oracle Scoring, Adaptive Quiz, Authentication.
- Affected code: `frontend/src/services/peerReviewService.ts`, `frontend/src/services/oracleScoringEngine.ts`, `frontend/src/services/adaptiveQuizEngine.ts`, `frontend/src/services/auth.ts`, `src/models/writing.rs`, `src/services/oracle.rs`, `src/services/quiz.rs`, `src/services/oauth.rs`.

## ADDED Requirements
### Requirement: Backend-Heavy Logic & PKCE Auth
The system SHALL process all score oracle predictions, adaptive quiz difficulty calculations, and peer review storage on the Rust backend, and SHALL utilize PKCE for OAuth authentication.

#### Scenario: Success case
- **WHEN** a user interacts with the app (submits review, answers quiz, logs in).
- **THEN** the frontend performs an optimistic update using local caching/queueing, and the Rust backend securely processes the underlying logic, maintains state, and verifies PKCE challenges.
