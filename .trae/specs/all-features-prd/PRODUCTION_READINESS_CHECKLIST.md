# Production Readiness Checklist

## Phase 1: Critical Infrastructure (Week 1-2)

### Auth & User Management
- [ ] Task 1.1: PKCE implementation
- [ ] Task 1.2: State parameter validation
- [ ] Task 1.3: Token rotation
- [ ] Task 1.4: Secure token storage
- [ ] Task 1.5: Daily quiz limit (5/day)
- [ ] Task 1.6: Hearts system (3 regenerate 1/24hr)
- [ ] Task 1.7: Paywall sheet component
- [ ] Task 1.8: Guest-to-registered conversion
- [ ] Task 1.9: Auth analytics events

### Offline Support & Caching
- [ ] Task 2.1: IndexedDB for questions
- [ ] Task 2.2: Offline quiz capability
- [ ] Task 2.3: Sync queue
- [ ] Task 2.4: Auto-sync on reconnect
- [ ] Task 2.5: Audio cache (LRU, size limits)

### Monitoring & Analytics
- [ ] Task 3.1: Core Web Vitals tracking
- [ ] Task 3.2: Error tracking
- [ ] Task 3.3: Feature usage tracking
- [ ] Task 3.4: Rate limiting implementation

---

## Phase 2: Core Features (Week 2-4)

### Quiz System
- [ ] Task 4.1: Adaptive difficulty
- [ ] Task 4.2: CEFR level mapping
- [ ] Task 4.3: AI question generator (hybrid)
- [ ] Task 4.4: Circuit breaker
- [ ] Task 4.5: Question bank sync
- [ ] Task 4.6: Timer (Web Worker)
- [ ] Task 4.7: All question types

### Simulation
- [ ] Task 5.1: Full IBT (section order)
- [ ] Task 5.2: Custom configuration
- [ ] Task 5.3: CEFR simulation
- [ ] Task 5.4: Background timer handling

### Writing Gym
- [ ] Task 6.1: Mason Level stars
- [ ] Task 6.2: Logic Weaver
- [ ] Task 6.3: IELTS Paragraph Builder
- [ ] Task 6.4: IELTS Task 1 & 2
- [ ] Task 6.5: Integrated Writing
- [ ] Task 6.6: Academic Discussion
- [ ] Task 6.7: Complexity Ladder
- [ ] Task 6.8: Devil's Advocate
- [ ] Task 6.9: 4-band rubric evaluation

---

## Phase 3: Community & Content (Week 4-6)

### Peer Review
- [ ] Task 7.1: Queue with expiry
- [ ] Task 7.2: Claim system (3 limit)
- [ ] Task 7.3: Review interface (4 rubrics)
- [ ] Task 7.4: Tier system (5 tiers)
- [ ] Task 7.5: Quality tracking

### Band 9 Library
- [ ] Task 8.1: Essay browse/filter
- [ ] Task 8.2: Reader with annotations
- [ ] Task 8.3: Band distribution

### Blog & Skills
- [ ] Task 9.1: Blog categories
- [ ] Task 9.2: Skill modules
- [ ] Task 9.3: AI chat

---

## Phase 4: Engagement (Week 6-8)

### Social Features
- [ ] Task 10.1: Friend system
- [ ] Task 10.2: Circle system
- [ ] Task 10.3: Leaderboards
- [ ] Task 10.4: Privacy settings

### Score Oracle & Learning Path
- [ ] Task 11.1: All test predictions
- [ ] Task 11.2: Confidence levels
- [ ] Task 11.3: Breakdown
- [ ] Task 11.4: Learning path
- [ ] Task 11.5: Today's focus

---

## Verification Checkpoints

### Security
- [ ] OAuth PKCE verified
- [ ] Token rotation works
- [ ] Guest data isolated
- [ ] No PII in analytics

### Performance (verified with lighthouse)
- [ ] LCP <2.5s
- [ ] FID <100ms
- [ ] CLS <0.1
- [ ] Question load <100ms
- [ ] AI generation <30s

### Reliability
- [ ] Offline quiz works
- [ ] Timer accurate (background)
- [ ] Error recovery works
- [ ] Rate limiting triggered

### Analytics
- [ ] All auth events tracked
- [ ] Quiz events tracked
- [ ] Writing events tracked
- [ ] Performance metrics tracked

### UX
- [ ] Paywall sheet works
- [ ] Hearts display red when <2
- [ ] Timer warnings at 5min, 1min
- [ ] Review mode functional