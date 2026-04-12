# Production Readiness 10/10 - Task List

## Task Group 1: Core Infrastructure (Foundation)

### Task 1.1: Create Service State Types
**Description**: Implement standardized ServiceState pattern dan ServiceError types
**Files**: `frontend/src/types/service-types.ts` (NEW)
**Dependencies**: None

- [ ] SubTask 1.1.1: Create ServiceState<T> interface dengan data, loading, error, lastUpdated
- [ ] SubTask 1.1.2: Create ServiceError interface dengan code, message, retryable, timestamp
- [ ] SubTask 1.1.3: Create asyncService wrapper function
- [ ] SubTask 1.1.4: Export types untuk use di semua services

### Task 1.2: Create Offline Queue Service
**Description**: Implement IndexedDB-based offline queue untuk operations
**Files**: `frontend/src/services/offlineQueueService.ts` (NEW)
**Dependencies**: Task 1.1

- [ ] SubTask 1.2.1: Create IndexedDB schema untuk queued operations
- [ ] SubTask 1.2.2: Implement enqueue dengan priority support
- [ ] SubTask 1.2.3: Implement dequeue dengan FIFO
- [ ] SubTask 1.2.4: Implement retry dengan exponential backoff
- [ ] SubTask 1.2.5: Implement sync manager dengan online/offline detection

### Task 1.3: Create API Client with Timeout & Retry
**Description**: Enhance apiClient dengan timeout, retry, dan error handling
**Files**: `frontend/src/services/apiClient.ts` (MODIFY)
**Dependencies**: Task 1.1

- [ ] SubTask 1.3.1: Add timeout wrapper function
- [ ] SubTask 1.3.2: Add retry with exponential backoff
- [ ] SubTask 1.3.3: Add ServiceError transformation
- [ ] SubTask 1.3.4: Add request deduplication for concurrent requests

### Task 1.4: Create Promise Mutex Utility
**Description**: Implement mutex untuk race condition prevention
**Files**: `frontend/src/utils/promiseMutex.ts` (NEW)
**Dependencies**: None

- [ ] SubTask 1.4.1: Create Mutex class dengan acquire/release
- [ ] SubTask 1.4.2: Implement runExclusive untuk serialized execution
- [ ] SubTask 1.4.3: Create service-specific mutex registry

---

## Task Group 2: Security Hardening

### Task 2.1: Secure Token Storage
**Description**: Implement secure token storage dengan production/dev distinction
**Files**: `frontend/src/services/auth.ts`, `frontend/src/utils/secureStorage.ts` (NEW)
**Dependencies**: Task 1.1

- [ ] SubTask 2.1.1: Create SecureStorage utility dengan encryption support
- [ ] SubTask 2.1.2: Add production check untuk httpOnly cookie
- [ ] SubTask 2.1.3: Update auth.ts untuk use SecureStorage
- [ ] SubTask 2.1.4: Add token refresh dengan rotation

### Task 2.2: Guest Device ID Security
**Description**: Replace predictable device ID dengan cryptographic UUID
**Files**: `frontend/src/hooks/useFreePlanHearts.ts` (MODIFY)
**Dependencies**: Task 1.1

- [ ] SubTask 2.2.1: Replace guest ID generation dengan crypto.randomUUID()
- [ ] SubTask 2.2.2: Add device fingerprint validation
- [ ] SubTask 2.2.3: Add tampering detection untuk timestamp manipulation

### Task 2.3: Input Validation Service
**Description**: Create centralized input validation untuk semua user inputs
**Files**: `frontend/src/services/validationService.ts` (NEW)
**Dependencies**: Task 1.1

- [ ] SubTask 2.3.1: Create validation schemas untuk common types
- [ ] SubTask 2.3.2: Implement validate() function dengan Zod-like API
- [ ] SubTask 2.3.3: Add validation helpers untuk auth, social, writing inputs

---

## Task Group 3: Phase 1 Enhancements

### Task 3.1: Auth Service Enhancement
**Description**: Add loading states, timeout, retry ke auth.ts
**Files**: `frontend/src/services/auth.ts` (MODIFY)
**Dependencies**: Task 1.1, Task 1.3, Task 2.1, Task 2.3

- [ ] SubTask 3.1.1: Add loading state tracking untuk login/register
- [ ] SubTask 3.1.2: Add timeout untuk OAuth flow
- [ ] SubTask 3.1.3: Add retry untuk transient auth failures
- [ ] SubTask 3.1.4: Add validation dengan validationService

### Task 3.2: Guest Policy Enhancement
**Description**: Add cloud sync, cross-tab sync, anti-abuse ke useFreePlanHearts
**Files**: `frontend/src/hooks/useFreePlanHearts.ts` (MODIFY)
**Dependencies**: Task 1.1, Task 1.2, Task 2.2

- [ ] SubTask 3.2.1: Add BroadcastChannel untuk cross-tab sync
- [ ] SubTask 3.2.2: Implement cloud sync dengan conflict resolution
- [ ] SubTask 3.2.3: Add retry queue untuk failed syncs

### Task 3.3: Analytics Enhancement
**Description**: Add offline queue, deduplication, batch processing
**Files**: `frontend/src/utils/analytics.ts` (MODIFY)
**Dependencies**: Task 1.1, Task 1.2

- [ ] SubTask 3.3.1: Add IndexedDB queue untuk offline events
- [ ] SubTask 3.3.2: Add event deduplication via hash
- [ ] SubTask 3.3.3: Add batch processing untuk multiple events
- [ ] SubTask 3.3.4: Standardize return types

### Task 3.4: RateLimiter Enhancement
**Description**: Add client-side caching dan distributed sync options
**Files**: `frontend/src/utils/RateLimiter.ts` (MODIFY)
**Dependencies**: Task 1.3

- [ ] SubTask 3.4.1: Add client-side cache dengan TTL
- [ ] SubTask 3.4.2: Add fail-closed option untuk sensitive endpoints

---

## Task Group 4: Phase 2 Enhancements

### Task 4.1: useQuiz Enhancement
**Description**: Add input validation, loading states, offline support
**Files**: `frontend/src/hooks/useQuiz.ts` (MODIFY)
**Dependencies**: Task 1.1, Task 1.3, Task 2.3

- [ ] SubTask 4.1.1: Add validation untuk choiceIndex bounds
- [ ] SubTask 4.1.2: Add loading state untuk initializeQuiz
- [ ] SubTask 4.1.3: Add corrupted data fallback dengan recovery

### Task 4.2: useMasonGame Enhancement
**Description**: Fix abandonSession error handling, add timeout to prefetch
**Files**: `frontend/src/hooks/useMasonGame.ts` (MODIFY)
**Dependencies**: Task 1.1, Task 1.3

- [ ] SubTask 4.2.1: Add await dan error handling untuk abandonSession
- [ ] SubTask 4.2.2: Add timeout untuk prefetch failures
- [ ] SubTask 4.2.3: Add loading state untuk loadNewExercise

### Task 4.3: writingGymService Enhancement
**Description**: Add timeout, retry, replace 'as any' types
**Files**: `frontend/src/services/writingGymService.ts` (MODIFY)
**Dependencies**: Task 1.1, Task 1.3

- [ ] SubTask 4.3.1: Add timeout untuk AI generation calls
- [ ] SubTask 4.3.2: Replace 'as any' dengan proper type guards
- [ ] SubTask 4.3.3: Add proper error class dengan error codes

### Task 4.4: useCefrTest Enhancement
**Description**: Fix silent error swallowing, add timeout, improve type safety
**Files**: `frontend/src/hooks/cefr/useCefrTest.ts` (MODIFY)
**Dependencies**: Task 1.1, Task 1.3, Task 2.3

- [ ] SubTask 4.4.1: Replace empty catch blocks dengan proper logging
- [ ] SubTask 4.4.2: Add timeout untuk AI generation
- [ ] SubTask 4.4.3: Add retry logic untuk transient failures
- [ ] SubTask 4.4.4: Replace 'any' types dengan proper discriminated unions

---

## Task Group 5: Phase 3 Enhancements

### Task 5.1: peerReviewQueueService Enhancement
**Description**: Add server sync, error handling, race condition prevention
**Files**: `frontend/src/services/peerReviewQueueService.ts` (MODIFY)
**Dependencies**: Task 1.1, Task 1.2, Task 1.4

- [ ] SubTask 5.1.1: Replace 'any' types dengan proper types
- [ ] SubTask 5.1.2: Add server sync untuk queue operations
- [ ] SubTask 5.1.3: Add mutex untuk concurrent operations
- [ ] SubTask 5.1.4: Add proper error handling dan logging

### Task 5.2: band9CollectionService Enhancement
**Description**: Add pagination validation, cloud sync
**Files**: `frontend/src/services/band9CollectionService.ts` (MODIFY)
**Dependencies**: Task 1.1, Task 2.3

- [ ] SubTask 5.2.1: Add validation untuk pagination bounds
- [ ] SubTask 5.2.2: Add cloud sync untuk saved essays
- [ ] SubTask 5.2.3: Add vocabulary item validation

### Task 5.3: socraticPromptingService Enhancement
**Description**: Add timeout, retry, validation, offline fallback
**Files**: `frontend/src/services/socraticPromptingService.ts` (MODIFY)
**Dependencies**: Task 1.1, Task 1.3, Task 2.3

- [ ] SubTask 5.3.1: Add timeout untuk LLM API calls
- [ ] SubTask 5.3.2: Add input validation untuk prompts
- [ ] SubTask 5.3.3: Add offline fallback dengan cached responses
- [ ] SubTask 5.3.4: Add retry untuk transient failures

### Task 5.4: reviewerTierService Enhancement
**Description**: Add input validation dan error handling
**Files**: `frontend/src/services/reviewerTierService.ts` (MODIFY)
**Dependencies**: Task 1.1, Task 2.3

- [ ] SubTask 5.4.1: Add input validation untuk stats
- [ ] SubTask 5.4.2: Add error handling untuk NaN/invalid values
- [ ] SubTask 5.4.3: Add proper error types

---

## Task Group 6: Phase 4 Enhancements

### Task 6.1: social.ts Enhancement
**Description**: Add loading states, error handling, input validation
**Files**: `frontend/src/services/social.ts` (MODIFY)
**Dependencies**: Task 1.1, Task 1.3, Task 1.4, Task 2.3

- [ ] SubTask 6.1.1: Add loading state tracking
- [ ] SubTask 6.1.2: Add try-catch untuk all operations
- [ ] SubTask 6.1.3: Add input validation untuk circle/message
- [ ] SubTask 6.1.4: Add request deduplication

### Task 6.2: friendService Enhancement
**Description**: Add server sync, loading states, race condition prevention
**Files**: `frontend/src/services/friendService.ts` (MODIFY)
**Dependencies**: Task 1.1, Task 1.2, Task 1.4

- [ ] SubTask 6.2.1: Add loading state tracking
- [ ] SubTask 6.2.2: Implement bidirectional sync (local <-> server)
- [ ] SubTask 6.2.3: Add mutex untuk concurrent operations
- [ ] SubTask 6.2.4: Add proper error return untuk failures

### Task 6.3: oracleService Enhancement
**Description**: Add timeout, error handling, race condition prevention
**Files**: `frontend/src/services/oracleService.ts` (MODIFY)
**Dependencies**: Task 1.1, Task 1.3, Task 1.4

- [ ] SubTask 6.3.1: Add timeout untuk recalculatePrediction
- [ ] SubTask 6.3.2: Add mutex untuk concurrent predictions
- [ ] SubTask 6.3.3: Add proper error types dan handling
- [ ] SubTask 6.3.4: Add loading state untuk async operations

### Task 6.4: notificationService Enhancement
**Description**: Add server sync, loading states, race condition prevention
**Files**: `frontend/src/services/notificationService.ts` (MODIFY)
**Dependencies**: Task 1.1, Task 1.2, Task 1.4

- [ ] SubTask 6.4.1: Add server sync untuk notifications
- [ ] SubTask 6.4.2: Add loading state untuk markAsRead
- [ ] SubTask 6.4.3: Add mutex untuk concurrent operations
- [ ] SubTask 6.4.4: Add proper error handling

### Task 6.5: learningPathService Enhancement
**Description**: Add input validation guards untuk edge cases
**Files**: `frontend/src/services/learningPathService.ts` (MODIFY)
**Dependencies**: Task 1.1, Task 2.3

- [ ] SubTask 6.5.1: Add input validation guards
- [ ] SubTask 6.5.2: Add null/undefined checks untuk arrays
- [ ] SubTask 6.5.3: Add division by zero protection

---

## Task Group 7: Integration & Testing

### Task 7.1: Service Integration Points
**Description**: Update semua services untuk use new infrastructure
**Dependencies**: Task 1.1, 1.2, 1.3, 1.4, 2.x, 3.x, 4.x, 5.x, 6.x complete

- [ ] SubTask 7.1.1: Update imports di semua services
- [ ] SubTask 7.1.2: Verify all services use standardized patterns
- [ ] SubTask 7.1.3: Update type exports

### Task 7.2: TypeScript Verification
**Description**: Run TypeScript compiler dan fix all errors
**Dependencies**: All previous tasks complete

- [ ] SubTask 7.2.1: Run npx tsc --noEmit
- [ ] SubTask 7.2.2: Fix all type errors
- [ ] SubTask 7.2.3: Verify no 'any' types remaining

### Task 7.3: Final Production Checklist
**Description**: Verify all requirements dari spec.md
**Dependencies**: Task 7.1, 7.2 complete

- [ ] SubTask 7.3.1: Verify Secure Token Storage
- [ ] SubTask 7.3.2: Verify Loading State Pattern
- [ ] SubTask 7.3.3: Verify Offline Queue System
- [ ] SubTask 7.3.4: Verify Race Condition Prevention
- [ ] SubTask 7.3.5: Verify Timeout Handling
- [ ] SubTask 7.3.6: Verify Input Validation
- [ ] SubTask 7.3.7: Verify Error Recovery

---

## Task Dependencies

```
Task 1.1 ──┬──> Task 1.2 ───> Task 1.3 ───> Task 1.4
           │                     │
           └─────────────────────┴──> Task 2.1, 2.2, 2.3
                                       │
           ┌───────────────────────────┴───────────────┐
           │                                       │
      Task 3.1 ──────┬───> Task 3.2 ──> Task 3.3 ──> Task 3.4
                     │           │
      Task 4.1 ─────┴────────────┴───> Task 4.2 ──> Task 4.3 ──> Task 4.4
                     │
      Task 5.1 ─────┴────────────┴───> Task 5.2 ──> Task 5.3 ──> Task 5.4
                     │
      Task 6.1 ─────┴────────────┴───> Task 6.2 ──> Task 6.3 ──> Task 6.4 ──> Task 6.5
                     │
               Task 7.1 ──> Task 7.2 ──> Task 7.3
```

---

## Priority Order

1. **Critical Path** (Block everything):
   - Task 1.1 (Types), Task 1.2 (Offline Queue), Task 1.3 (API Client), Task 1.4 (Mutex)

2. **Security** (Week 1):
   - Task 2.1 (Token Storage), Task 2.2 (Device ID), Task 2.3 (Validation)

3. **Phase Implementations** (Week 2-4):
   - Task Group 3 (Phase 1), Task Group 4 (Phase 2), Task Group 5 (Phase 3), Task Group 6 (Phase 4)

4. **Finalization** (Week 5):
   - Task Group 7 (Integration & Testing)
