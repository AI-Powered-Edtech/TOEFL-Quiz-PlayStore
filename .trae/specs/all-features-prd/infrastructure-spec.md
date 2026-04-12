# Infrastructure Spec

## Why
Infrastruktur memastikan aplikasi bekerja dengan baik secara offline, memiliki caching yang efisien, dan monitoring yang tepat untuk production.

## What Changes
- Offline Support (IndexedDB)
- Audio Cache
- Monitoring & Analytics
- Rate Limiting

## Impact
- Affected specs: All features (reliability)
- Affected code: `frontend/src/services/offlineQueue.ts`, `frontend/src/services/audioCacheService.ts`

---

## ADDED Requirements

### Requirement: Offline Support
Aplikasi harus berfungsi dengan baik dalam kondisi offline.

#### Offline Features
1. **Question Bank** - Quiz bisa dilakukan offline
2. **Progress Tracking** - Simpan progress locally
3. **Queue Actions** - Queue untuk sync saat online

#### Scenario: Offline Quiz
- **GIVEN** no network
- **WHEN** user starts quiz
- **THEN** questions from cache loaded
- **AND** "Offline mode" indicator

#### Scenario: Queue Actions
- **GIVEN** offline and performs action
- **WHEN** action queued
- **THEN** saved to offline queue
- **AND** synced when online

#### Scenario: Network Restored
- **GIVEN** network returns
- **WHEN** connectivity detected
- **THEN** queue synced automatically
- **AND** user notified

### Requirement: Audio Cache
Audio listening harus di-cache untuk akses offline.

#### Cache Strategy
1. Most recent first
2. Max size limit reached → LRU eviction
3. Preload on WiFi only

#### Scenario: Audio Offline
- **GIVEN** audio cached previously
- **WHEN** offline and plays
- **THEN** plays from cache
- **AND** no network needed

### Requirement: Monitoring
Aplikasi harus track performance metrics.

#### Metrics to Track
1. **Page Load Time** - Core Web Vitals
2. **Error Rate** - JS errors, API failures
3. **Feature Usage** - Which features used
4. **User Flow** - Navigation patterns

#### Performance Targets (Industry Standard)
| Metric | Target | Threshold |
|--------|-------|-----------|
| LCP | <2.5s | Good |
| FID | <100ms | Good |
| CLS | <0.1 | Good |
| TTFB | <3s | Acceptable |

### Requirement: Rate Limiting
API calls harus di-rate limit untuk stability.

#### Rate Limits
1. **AI Generation** - 10/min (Groq limits)
2. **Quiz Start** - 5/min
3. **Session Refresh** - 1/min

#### Scenario: Rate Limited
- **GIVEN** exceeds rate limit
- **WHEN** makes request
- **THEN** 429 returned
- **AND** retry after countdown

---

## IndexedDB Schema

### Stores
1. **questions** - Question bank
2. **progress** - User progress
3. **offline_queue** - Pending actions
4. **audio_cache** - Audio files
5. **user_cache** - User data

### Sync Strategy
1. Load from IndexedDB first
2. Check network, fetch updates
3. Merge (server wins on conflict)
4. Write merged to IndexedDB

---

## Monitoring Events

### Performance Events
- `performance_lcp` - Largest Contentful Paint
- `performance_fid` - First Input Delay
- `performance_cls` - Cumulative Layout Shift
- `performance_ttfb` - Time to First Byte

### Error Events
- `error_js` - JavaScript error
- `error_api` - API error
- `error_audio` - Audio load error
- `error_network` - Network error

### Usage Events
- `usage_feature_enter` - Feature used
- `usage_time_spent` - Time in feature
- ` usage_session` - Session start/end

---

## Analytics Targets

### Key Metrics
- DAU/MAU ratio: >20%
- Day 1 retention: >40%
- Day 7 retention: >20%
- Day 30 retention: >10%

### Feature Adoption
- Quiz completion: >60%
- Writing Gym attempted: >30%
- Peer Review used: >15%
- Social connected: >10%

---

## Security Requirements

### Data Security
1. No PII in analytics
2. Tokens in httpOnly
3. Secure localStorage
4. Clear guest data on logout

### Privacy
1. Guest data stays local
2. Opt-out from analytics
3. GDPR compliant
4. Delete account = delete data