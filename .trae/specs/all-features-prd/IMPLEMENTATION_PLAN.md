# Implementation Plan - Production Readiness

## Overview
Plan implementasi untuk membuat codebase sesuai spec dan 100% production-ready untuk semua 11 fitur utama.

## Priority Phases

### Phase 1: Critical Infrastructure (Week 1-2)
1. Auth & User Management
2. Offline Support & Caching
3. Monitoring & Analytics

### Phase 2: Core Features (Week 2-4)
4. Quiz System
5. Simulation
6. Writing Gym

### Phase 3: Community & Content (Week 4-6)
7. Peer Review
8. Band 9 Library
9. Blog & Skills

### Phase 4: Engagement (Week 6-8)
10. Social Features
11. Score Oracle & Learning Path

---

## SPEC 1: Auth & User Management

### Current State
- File: `frontend/src/services/auth.ts` (exists)
- File: `frontend/src/hooks/useGuestPolicy.tsx` (need verify)

### Implementation Tasks

#### Task 1.1: Enhance OAuth Security
- [ ] Implement PKCE for authorization flow
- [ ] Add state parameter validation
- [ ] Implement token rotation
- [ ] Add secure token storage (httpOnly in production)
- [ ] Location: `frontend/src/services/auth.ts`

#### Task 1.2: Guest Policy Implementation
- [ ] Implement daily quiz limit (5/day)
- [ ] Implement hearts system (3 for guest, regenerate 1/24hr)
- [ ] Implement paywall sheet component
- [ ] Add guest-to-registered conversion flow
- [ ] Location: `frontend/src/hooks/useGuestPolicy.tsx`, new components

#### Task 1.3: Analytics Events
- [ ] Track auth events: google_login_start, google_login_success, google_login_error
- [ ] Track guest_conversion, logout, session_expired
- [ ] Location: `frontend/src/services/metricsService.ts`

#### Task 1.4: Guest Mode Security
- [ ] Guest ID stored locally only
- [ ] Guest progress in IndexedDB only
- [ ] Clear guest data on conversion/logout
- [ ] No PII from guests

### Files to Create/Modify
```typescript
// New files needed:
frontend/src/hooks/useGuestPolicy.tsx    (enhance)
frontend/src/components/paywall/Sheet.tsx   (new)
frontend/src/components/paywall/HeartsDisplay.tsx (new)

// Modified files:
frontend/src/services/auth.ts             (enhance PKCE)
frontend/src/services/metricsService.ts   (add events)
```

---

## SPEC 2: Quiz System

### Current State
- Files: `readingQuizEngine.ts`, `listeningQuizEngine.ts`, `structureQuizEngine.ts`, `writtenQuizEngine.ts` (exists, need verify spec compliance)
- File: `questionBankService.ts` (exists)
- Quiz Views: `QuizViewReading.tsx`, etc. (exists)

### Implementation Tasks

#### Task 2.1: Enhance Quiz Engines
- [ ] Add adaptive difficulty based on user performance
- [ ] Implement CEFR level mapping (A2-C1)
- [ ] Add question usage tracking
- [ ] Add difficulty adjustment logic

#### Task 2.2: AI Question Generator (Hybrid Mode)
- [ ] Implement fallback when bank <50% questions
- [ ] Implement circuit breaker for API failures
- [ ] Add rate limiting (10/min for AI)
- [ ] Implement failure recovery

#### Task 2.3: Question Bank (IndexedDB)
- [ ] Offline quiz capability
- [ ] Cross-device sync
- [ ] Cache management
- [ ] Question schema validation

#### Task 2.4: Timer Implementation
- [ ] Web Worker for timer accuracy
- [ ] Background tab handling
- [ ] Persist to localStorage
- [ ] Alert at 5min, 1min remaining

#### Task 2.5: Question Types
- [ ] Multiple choice (4 options)
- [ ] Fill in the blank
- [ ] Drag and drop
- [ ] Error identification
- [ ] True/False/Not Given

### Files to Create/Modify
```typescript
// Modified files:
frontend/src/services/groq/readingQuizEngine.ts   (enhance)
frontend/src/services/groq/listeningQuizEngine.ts  (enhance)
frontend/src/services/groq/structureQuizEngine.ts (enhance)
frontend/src/services/groq/writtenQuizEngine.ts (enhance)
frontend/src/services/questionBankService.ts  (enhance sync)

// New files:
frontend/src/utils/timerWorker.ts          (Web Worker)
frontend/src/utils/adaptiveDifficulty.ts    (new)
```

---

## SPEC 3: Writing Gym

### Current State
- Components: `MasonLevel.tsx`, `IELTSWritingSim.tsx`, `IntegratedWritingTask.tsx`, etc. (exists)
- Service: `writingGymProgressService.ts` (exists)

### Implementation Tasks

#### Task 3.1: Mason Level (Sentence Building)
- [ ] Drag-drop word ordering
- [ ] Puzzle fit mode
- [ ] Error fix mode
- [ ] 3-star rating system

#### Task 3.2: Logic Weaver Level
- [ ] Connector selection
- [ ] Subordinate clauses practice
- [ ] Multiple blank handling

#### Task 3.3: IELTS Paragraph Builder
- [ ] Step-by-step guidance
- [ ] Band level feedback
- [ ] Step progression

#### Task 3.4: IELTS Writing Simulation
- [ ] Task 1 (Data Description) - 20 min timer
- [ ] Task 2 (Essay) - 40 min timer
- [ ] Real-time word count
- [ ] AI evaluation (4-band rubric)

#### Task 3.5: Integrated Writing (TOEFL)
- [ ] Reading phase with notes
- [ ] Listening phase with notes
- [ ] Writing response

#### Task 3.6: Academic Discussion (IELTS)
- [ ] Professor prompt display
- [ ] Student response analysis
- [ ] Own response writing

#### Task 3.7: Complexity Ladder
- [ ] Simple→Complex transformation
- [ ] History tracking
- [ ] AI feedback

#### Task 3.8: Devil's Advocate
- [ ] Counter-point detection
- [ ] Logical fallacy check
- [ ] Defense writing

#### Task 3.9: IELTS Rubric Evaluation
- [ ] Implement 4-band rubric:
  - Task Response (25%)
  - Coherence & Cohesion (25%)
  - Lexical Resource (25%)
  - Grammatical Range (25%)
- [ ] Band 1-9 scoring

### Files to Create/Modify
```typescript
// Enhanced files:
frontend/src/components/writingGym/MasonLevel.tsx
frontend/src/components/writingGym/LogicWeaverLevel.tsx
frontend/src/components/writingGym/IELTSWritingSim.tsx
frontend/src/components/writingGym/IntegratedWritingTask.tsx
frontend/src/components/writingGym/AcademicDiscussionTask.tsx
frontend/src/components/writingGym/ComplexityLadder.tsx
frontend/src/components/writingGym/DevilsAdvocateLevel.tsx

// New services:
frontend/src/services/ieltsRubricService.ts   (new)
```

---

## SPEC 4: Peer Review

### Current State
- Service: `peerReviewService.ts` (exists)
- Components: `ReviewInterface.tsx`, `EssaySubmissionForm.tsx` (exists)

### Implementation Tasks

#### Task 4.1: Essay Submission Queue
- [ ] 24-hour expiry
- [ ] Word count validation (150/250 min)
- [ ] Queue position display

#### Task 4.2: Review Claim System
- [ ] Max 3 active claims
- [ ] 1-hour time limit
- [ ] Automatic release on expiry

#### Task 4.3: Review Interface
- [ ] 4 rubric scores (TR, CC, LR, GRA)
- [ ] Overall band
- [ ] Inline corrections
- [ ] Strengths/Weaknesses
- [ ] Final comment (DES format)

#### Task 4.4: Tier System
- [ ] Implement 5 tiers:
  - Novice (0-9)
  - Helper (10-49) - +10% XP
  - Mentor (50-199) - +25% XP
  - Expert (200-499) - +50% XP
  - Master (500+) - +100% XP

#### Task 4.5: Quality Tracking
- [ ] Helpfulness rating (1-5)
- [ ] Poor quality flagging
- [ ] Second review assignment

### Files to Create/Modify
```typescript
// Enhanced files:
frontend/src/services/peerReviewService.ts
frontend/src/components/peerReview/ReviewInterface.tsx
frontend/src/components/peerReview/EssaySubmissionForm.tsx
frontend/src/components/peerReview/ReviewerTierBadge.tsx (new)
```

---

## SPEC 5: Simulation

### Current State
- Component: `SimulationView.tsx` (exists)
- Component: `CefrSimulationView.tsx` (exists)

### Implementation Tasks

#### Task 5.1: Full IBT Simulation
- [ ] Section order: Reading → Listening → Structure+Written
- [ ] Timers: 55min / 40min / 25min
- [ ] Section transitions
- [ ] Break between sections

#### Task 5.2: Custom Simulation
- [ ] Configurable question counts (10-50)
- [ ] Custom timers
- [ ] Section selection

#### Task 5.3: CEFR Simulation
- [ ] Level-based questions (A2-C1)
- [ ] Difficulty mapping
- [ ] Level progression

#### Task 5.4: Timer Accuracy
- [ ] Web Worker implementation
- [ ] Background handling
- [ ] Refresh recovery
- [ ] Warning sounds

### Files to Create/Modify
```typescript
// Enhanced files:
frontend/src/components/SimulationView.tsx
frontend/src/components/CefrSimulationView.tsx

// New:
frontend/src/utils/simulationTimer.ts
```

---

## SPEC 6: Score Oracle

### Current State
- Component: `ScoreOracleView.tsx` (exists)
- Service: `oracleDataService.ts` (exists)
- Service: `oracleService.ts` (exists)

### Implementation Tasks

#### Task 6.1: Prediction Algorithm
- [ ] TOEFL PBT (310-677)
- [ ] TOEFL iBT (0-120)
- [ ] TOEFL ITP (210-677)
- [ ] IELTS (1-9)

#### Task 6.2: Confidence Levels
- [ ] Low (<5 data points)
- [ ] Medium (5-20)
- [ ] High (>20)

#### Task 6.3: Section Breakdown
- [ ] Per-section predictions
- [ ] Weak area identification
- [ ] Recommendations

### Files to Create/Modify
```typescript
// Enhanced files:
frontend/src/components/ScoreOracleView.tsx
frontend/src/services/oracleDataService.ts
frontend/src/services/oracleScoringEngine.ts
```

---

## SPEC 7: Band 9 Library

### Current State
- Component: `Band9LibraryHub.tsx` (exists)
- Service: `band9LibraryService.ts` (exists)

### Implementation Tasks

#### Task 7.1: Essay Collection
- [ ] Browse by category
- [ ] Filter by band score
- [ ] Search
- [ ] Annotations

#### Task 7.2: Essay Reader
- [ ] Vocabulary highlighting
- [ ] Click for definition
- [ ] Save to collection

#### Task 7.3: Band Distribution
- [ ] Band 9: 10%
- [ ] Band 8: 20%
- [ ] Band 7: 30%
- [ ] Band 6: 40%

### Files to Create/Modify
```typescript
// Enhanced files:
frontend/src/components/writingGym/band9Library/EssayReader.tsx
frontend/src/components/writingGym/band9Library/EssayBrowser.tsx
frontend/src/services/band9LibraryService.ts
```

---

## SPEC 8: Social Features

### Current State
- Service: `friendService.ts`, `circleService.ts` (exists)
- Component: `SocialHub.tsx`, `LeaderboardView.tsx` (exists)

### Implementation Tasks

#### Task 8.1: Friend System
- [ ] Send/Accept/Reject requests
- [ ] View friend progress
- [ ] Activity feed
- [ ] Unfriend

#### Task 8.2: Circle System
- [ ] Create circle with code
- [ ] Join with code
- [ ] Circle chat
- [ ] Group leaderboard

#### Task 8.3: Leaderboard
- [ ] Global leaderboard
- [ ] Mason-specific
- [ ] Circle-specific
- [ ] Weekly

#### Task 8.4: Privacy
- [ ] Profile visibility settings
- [ ] Leaderboard opt-out
- [ ] Block user

### Files to Create/Modify
```typescript
// Enhanced files:
frontend/src/services/friendService.ts
frontend/src/services/circleService.ts
frontend/src/services/leaderboardService.ts
```

---

## SPEC 9: Blog & Skills

### Current State
- Components: `BlogListingView.tsx`, `BlogPostView.tsx` (exists)
- Components: `SkillModuleList.tsx`, `SkillModuleReader.tsx` (exists)
- Service: `blogService.ts` (exists)

### Implementation Tasks

#### Task 9.1: Blog System
- [ ] Categories: Structure, Listening, Reading, Writing
- [ ] Listing by category
- [ ] Article search
- [ ] Bookmark

#### Task 9.2: Skill Modules
- [ ] Browse by category
- [ ] CEFR level (A2-C1)
- [ ] Progress tracking
- [ ] Practice links

#### Task 9.3: AI Chat
- [ ] Socratic prompting
- [ ] Context-aware responses
- [ ] Link to content

### Files to Create/Modify
```typescript
// Enhanced files:
frontend/src/components/blog/BlogListingView.tsx
frontend/src/components/blog/BlogPostView.tsx
frontend/src/components/modules/SkillModuleList.tsx
frontend/src/components/modules/SkillModuleReader.tsx
```

---

## SPEC 10: Infrastructure

### Current State
- Service: `offlineQueue.ts` (exists)
- Service: `audioCacheService.ts` (exists)

### Implementation Tasks

#### Task 10.1: Offline Support
- [ ] IndexedDB for questions
- [ ] Offline quiz
- [ ] Sync queue
- [ ] Auto-sync on reconnect

#### Task 10.2: Audio Cache
- [ ] LRU eviction
- [ ] Size limits
- [ ] Preload on WiFi

#### Task 10.3: Monitoring
- [ ] Core Web Vitals (LCP, FID, CLS)
- [ ] Error tracking
- [ ] Feature usage
- [ ] Performance targets:
  - LCP <2.5s
  - FID <100ms
  - CLS <0.1

#### Task 10.4: Rate Limiting
- [ ] AI Generation: 10/min
- [ ] Quiz Start: 5/min
- [ ] Circuit breaker

### Files to Create/Modify
```typescript
// Enhanced files:
frontend/src/services/offlineQueue.ts
frontend/src/services/audioCacheService.ts
frontend/src/services/metricsService.ts

// New:
frontend/src/utils/rateLimiter.ts
```

---

## SPEC 11: Learning Path

### Current State
- Component: `LearningPath.tsx` (exists)
- Service: `todaysFocusService.ts` (exists)

### Implementation Tasks

#### Task 11.1: Learning Path
- [ ] AI-generated recommendations
- [ ] Weak area identification
- [ ] Progress tracking

#### Task 11.2: Today's Focus
- [ ] Daily main recommendation
- [ ] Time estimation
- [ ] Quick action button

### Files to Create/Modify
```typescript
// Enhanced files:
frontend/src/components/LearningPath.tsx
frontend/src/services/todaysFocusService.ts
```

---

## Production Readiness Checklist

### Security
- [ ] OAuth PKCE implementation
- [ ] Token rotation
- [ ] Secure storage (production)
- [ ] Guest data isolation

### Performance
- [ ] LCP <2.5s
- [ ] FID <100ms
- [ ] CLS <0.1
- [ ] Question load <100ms
- [ ] AI timeout 30s

### Reliability
- [ ] Offline quiz capability
- [ ] Timer accuracy (Web Worker)
- [ ] Error recovery
- [ ] Rate limiting

### Analytics
- [ ] All auth events tracked
- [ ] Quiz events tracked
- [ ] Writing events tracked
- [ ] Performance metrics tracked

### UX
- [ ] Paywall sheet implemented
- [ ] Hearts display
- [ ] Timer warnings
- [ ] Review mode

---

## Timeline Estimate

| Phase | Week | Focus | Key Deliverables |
|-------|------|-------|-----------------|
| 1 | 1-2 | Infrastructure | Auth+, Offline+, Monitoring+ |
| 2 | 2-4 | Core Features | Quiz+, Simulation+, Writing Gym+ |
| 3 | 4-6 | Community | Peer Review+, Band 9+, Blog+ |
| 4 | 6-8 | Engagement | Social+, Oracle+, Learning Path+ |

## Dependencies

- Task 1.1 before Task 1.2
- Task 2.1 before Task 2.2
- Task 6.1 before Task 6.2
- Task 10.1 before Quiz offline tasks
- Task 3.1-3.8 before Task 3.9 (rubric needs all levels)