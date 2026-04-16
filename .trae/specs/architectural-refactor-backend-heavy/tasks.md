# Tasks
- [x] Task 1: Peer Review Migration (Kill LocalStorage)
  - [x] SubTask 1.1: Refactor `frontend/src/services/peerReviewService.ts` to remove direct `localStorage.setItem` for primary data.
  - [x] SubTask 1.2: Replace localStorage operations with API calls to the Rust backend (e.g., `apiClient.get('/api/peer-review/submissions')`).
  - [x] SubTask 1.3: Implement write-behind cache using `offlineQueueService` for optimistic UI updates.
  - [x] SubTask 1.4: Validate with `cargo check` and frontend linting.
- [x] Task 2: Score Oracle Logic Shift
  - [x] SubTask 2.1: Create/update `src/services/oracle.rs` with statistical probability algorithms from `oracleScoringEngine.ts`.
  - [x] SubTask 2.2: Expose a GET endpoint (`/api/oracle/predict`) in the backend.
  - [x] SubTask 2.3: Refactor `frontend/src/services/oracleService.ts` to call the new Rust endpoint and cache the result locally.
  - [x] SubTask 2.4: Delete complex calculation logic from the frontend.
- [x] Task 3: Adaptive Quiz Engine Backend Migration
  - [x] SubTask 3.1: Move `UserPerformanceMetrics` tracking and difficulty logic into `src/services/quiz.rs`.
  - [x] SubTask 3.2: Update frontend Quiz engines to use the API response for `next_difficulty_level` or `CanonicalQuestionV1`.
  - [x] SubTask 3.3: Ensure frontend still preloads audio/assets asynchronously for instant transitions.
- [x] Task 4: Auth PKCE Implementation
  - [x] SubTask 4.1: Implement frontend standard PKCE (generate `code_verifier` and `code_challenge`, send challenge).
  - [x] SubTask 4.2: Update frontend callback to send `code_verifier` to exchange for tokens.
  - [x] SubTask 4.3: Modify Rust backend `src/services/oauth.rs` to store and validate `code_challenge` against `code_verifier`.
- [x] Task 5: System-wide Verification
  - [x] SubTask 5.1: Run `cargo clippy --all-targets` and fix ALL warnings related to changes.
  - [x] SubTask 5.2: Run `cargo test --test e2e` to ensure backend endpoints function correctly.
  - [x] SubTask 5.3: Run `npm run typecheck` in `frontend/` to ensure TS interfaces match.
  - [x] SubTask 5.4: Ensure all E2E bypasses in `useGuestPolicy.tsx` (and similar files) are intact.

# Task Dependencies
- [Task 5] depends on [Task 1, Task 2, Task 3, Task 4]
