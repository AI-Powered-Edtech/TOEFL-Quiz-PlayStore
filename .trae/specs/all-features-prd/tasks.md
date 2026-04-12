# Tasks - Implementation Plan Production Readiness

## Progress Overview
- [x] Task 1-3: Setup dan Riset (Selesai)
- [x] Task 4-14: Spec Files (Selesai: 11 spec + spec.md + IMPLEMENTATION_PLAN.md + IMPLEMENTATION_TASKS.md + PRODUCTION_READINESS_CHECKLIST.md)
- [ ] Task 15: Implementasi Phase 1 (In Progress)
- [ ] Task 16: Implementasi Phase 2
- [ ] Task 17: Implementasi Phase 3
- [ ] Task 18: Implementasi Phase 4

---

## Phase 1: Critical Infrastructure (Week 1-2)

### Task 15: Auth & User Management Implementation
- [ ] SubTask 15.1: Enhance OAuth Security (PKCE, token rotation)
  - Implement PKCE for authorization flow
  - Add state parameter validation
  - Implement token rotation on refresh
  - Add secure token storage
- [ ] SubTask 15.2: Guest Policy Implementation
  - Implement daily quiz limit (5/day for guest)
  - Implement hearts system (3 regenerate 1/24hr)
  - Create paywall sheet component
  - Add guest-to-registered conversion flow
- [ ] SubTask 15.3: Analytics Events
  - Track auth_google_login_start, success, error
  - Track auth_guest_conversion, logout
- [ ] SubTask 15.4: Guest Mode Security
  - Guest ID stored locally only
  - Guest progress in IndexedDB
  - Clear guest data on conversion/logout

### Task 16: Offline Support & Caching Implementation
- [ ] SubTask 16.1: IndexedDB for questions
- [ ] SubTask 16.2: Offline quiz capability
- [ ] SubTask 16.3: Sync queue
- [ ] SubTask 16.4: Audio cache (LRU, size limits)
- [ ] SubTask 16.5: Rate limiting (AI: 10/min)

### Task 17: Monitoring & Analytics Implementation
- [ ] SubTask 17.1: Core Web Vitals (LCP, FID, CLS)
- [ ] SubTask 17.2: Error tracking
- [ ] SubTask 17.3: Feature usage tracking

---

## Phase 2: Core Features (Week 2-4)

### Task 18: Quiz System Implementation
- [ ] SubTask 18.1: Enhance Quiz Engines
  - Adaptive difficulty based on performance
  - CEFR level mapping (A2-C1)
  - Question usage tracking
- [ ] SubTask 18.2: AI Question Generator
  - Hybrid mode (bank + AI)
  - Circuit breaker for API failures
  - Rate limiting (10/min)
- [ ] SubTask 18.3: Question Bank
  - IndexedDB storage
  - Cross-device sync
  - Cache management
- [ ] SubTask 18.4: Timer Implementation
  - Web Worker for accuracy
  - Background tab handling
  - Persist to localStorage
- [ ] SubTask 18.5: Question Types
  - Multiple choice, fill blank, drag-drop, error identification

### Task 19: Simulation Implementation
- [ ] SubTask 19.1: Full IBT Simulation
  - Section order: Reading → Listening → Structure+Written
  - Timers: 55min / 40min / 25min
  - Section transitions
- [ ] SubTask 19.2: Custom Simulation
  - Configurable question counts (10-50)
  - Custom timers
- [ ] SubTask 19.3: CEFR Simulation
  - Level-based questions
  - Difficulty mapping
- [ ] SubTask 19.4: Timer Accuracy
  - Web Worker implementation
  - Background handling

### Task 20: Writing Gym Implementation
- [ ] SubTask 20.1: Mason Level (drag-drop, stars)
- [ ] SubTask 20.2: Logic Weaver Level (connectors)
- [ ] SubTask 20.3: IELTS Paragraph Builder
- [ ] SubTask 20.4: IELTS Writing Simulation
  - Task 1 (20 min), Task 2 (40 min)
  - Real-time word count
- [ ] SubTask 20.5: Integrated Writing (TOEFL)
- [ ] SubTask 20.6: Academic Discussion (IELTS)
- [ ] SubTask 20.7: Complexity Ladder
- [ ] SubTask 20.8: Devil's Advocate
- [ ] SubTask 20.9: IELTS Rubric Evaluation
  - 4-band: Task Response, Coherence, Lexical, Grammar
  - Band 1-9 scoring

---

## Phase 3: Community & Content (Week 4-6)

### Task 21: Peer Review Implementation
- [ ] SubTask 21.1: Essay Submission Queue
  - 24-hour expiry
  - Word count validation
- [ ] SubTask 21.2: Review Claim System
  - Max 3 active claims
  - 1-hour time limit
- [ ] SubTask 21.3: Review Interface
  - 4 rubric scores
  - Inline corrections
  - DES format final comment
- [ ] SubTask 21.4: Tier System
  - Novice (0-9), Helper (10-49), Mentor (50-199), Expert (200-499), Master (500+)
- [ ] SubTask 21.5: Quality Tracking

### Task 22: Band 9 Library Implementation
- [ ] SubTask 22.1: Essay Collection
  - Browse by category, filter by band
  - Search
- [ ] SubTask 22.2: Essay Reader
  - Vocabulary highlighting
  - Save to collection

### Task 23: Blog & Skills Implementation
- [ ] SubTask 23.1: Blog System
  - Categories: Structure, Listening, Reading, Writing
- [ ] SubTask 23.2: Skill Modules
  - CEFR levels, progress tracking
- [ ] SubTask 23.3: AI Chat (Socratic)

---

## Phase 4: Engagement (Week 6-8)

### Task 24: Social Features Implementation
- [ ] SubTask 24.1: Friend System
  - Send/Accept/Reject requests
  - View friend progress
- [ ] SubTask 24.2: Circle System
  - Create with code, join with code
  - Circle chat
  - Group leaderboard
- [ ] SubTask 24.3: Leaderboard
  - Global, Mason, Circle, Weekly

### Task 25: Score Oracle & Learning Path Implementation
- [ ] SubTask 25.1: Score Prediction
  - TOEFL PBT, iBT, ITP
  - IELTS
- [ ] SubTask 25.2: Confidence Levels
  - Low (<5), Medium (5-20), High (>20)
- [ ] SubTask 25.3: Section Breakdown
- [ ] SubTask 25.4: Learning Path
- [ ] SubTask 25.5: Today's Focus

---

## Task Dependencies

### Phase 1
- Task 15.1 → Task 15.2 (auth before guest policy)
- Task 16.1 → Task 16.2 (IndexedDB before offline quiz)

### Phase 2
- Task 18.1 → Task 18.2 (engines before AI generator)
- Task 18.4 → Task 19.4 (timer shared)
- Task 20.1-20.8 → Task 20.9 (levels before rubric)

### Phase 3
- Task 21.1 → Task 21.2 (submission before claim)
- Task 21.3 → Task 21.4 (interface before tiers)

### Phase 4
- Task 24.1 → Task 24.2 (friends before circles)
- Task 25.1 → Task 25.2 → Task 25.3 (prediction sequence)

---

## Parallelizable Tasks (Can Run Together)

### Phase 1
- SubTask 15.2, 15.3, 15.4 (after SubTask 15.1)
- SubTask 16.1, 16.2, 16.3 (parallel)
- SubTask 16.4, 16.5 (parallel)

### Phase 2
- SubTask 18.2, 18.3, 18.4 (parallel after 18.1)
- SubTask 19.1, 19.2, 19.3 (parallel)
- SubTask 20.1-20.8 (parallel - independent levels)

### Phase 3
- SubTask 21.x, 22.x, 23.x (parallel)

### Phase 4
- SubTask 24.x (parallel)
- SubTask 25.4, 25.5 (parallel after 25.3)