# Plan: Migration Semua Supabase Services ke VIL API

## Tujuan
Menghapus semua referensi Supabase dari frontend services (kecuali Google OAuth login) dan menggantinya dengan VIL Backend API.

---

## Analisis Services yang Perlu Dimigrate

### Kategori Services (33 files):

| Kategori | Files | Priority |
|----------|-------|----------|
| **Quiz** | questionBankService, userQuestionHistoryService, todaysFocusService | HIGH |
| **Writing** | writingGymService, masonProgressService, writingGymProgressService, integratedWritingService, masonSessionService, devilsAdvocateService, band9LibraryService | HIGH |
| **Social** | circleService, friendService, leaderboardService, peerReviewService, notificationService | HIGH |
| **Admin** | adminService, auditService, moderationService | MEDIUM |
| **Storage** | audioStorageService, reportService | MEDIUM |
| **Learning** | qualificationService, oracleDataService, oracleService, errorJailService | MEDIUM |
| **Other** | blogService, purchaseService, offlineQueue, loggingService, metricsService, sessionPersistenceService, socialRateLimiter, essayMetricsService, featureFlagService | LOW |

---

## Langkah 1: Setup Base API Services (Baru)

- [ ] Update `services/apiClient.ts` - Tambah methods: upload, download, stream
- [ ] Create `services/admin.ts` - Wrapper untuk `/api/admin/*`
- [ ] Create `services/monitoring.ts` - Wrapper untuk `/api/monitoring/*`
- [ ] Create `services/storage.ts` - Wrapper untuk `/api/storage/*`

---

## Langkah 2: Migration Quiz Services (HIGH)

- [ ] **questionBankService.ts** - Ganti ke `services/quiz.ts` yang sudah ada
- [ ] **userQuestionHistoryService.ts** - Ganti ke `quizService` (via history)
- [ ] **todaysFocusService.ts** - Ganti ke quizService (progress/today's focus)

---

## Langkah 3: Migration Writing Services (HIGH)

- [ ] **writingGymService.ts** → `services/writing.ts` (sudah ada)
- [ ] **masonProgressService.ts** → `writingService.getProgress()`, `saveProgress()`
- [ ] **writingGymProgressService.ts** → `writingService` 
- [ ] **integratedWritingService.ts** → `writingService` (sessions/exercise)
- [   ] **masonSessionService.ts** → `writingService.saveSession()`
- [ ] **devilsAdvocateService.ts** → `writingService.devilsAdvocate()`
- [ ] **band9LibraryService.ts** → `writingService.listModelEssays()`

---

## Langkah 4: Migration Social Services (HIGH)

- [ ] **circleService.ts** → `services/social.ts` (sudah ada)
- [ ] **friendService.ts** → `socialService.addFriend()`, `listFriends()`
- [ ] **leaderboardService.ts** → `socialService.leaderboard()`
- [ ] **peerReviewService.ts** → `writingService` (peer-review endpoints)
- [ ] **notificationService.ts** → `socialService.getNotifications()`

---

## Langkah 5: Migration Admin Services (MEDIUM)

- [ ] **adminService.ts** - Create wrapper untuk `/api/admin/*`
- [ ] **auditService.ts** → adminService
- [ ] **moderationService.ts** → adminService

---

## Langkah 6: Migration Storage Services (MEDIUM)

- [ ] **audioStorageService.ts** → `services/storage.ts` (upload/download)
- [ ] **reportService.ts** → Quiz Report API

---

## Langkah 7: Migration Learning Services (MEDIUM)

- [ ] **qualificationService.ts** → `/api/monitoring/*` atau `/api/admin/*`
- [ ] **oracleDataService.ts** → `writingService.listModelEssays()`
- [ ] **oracleService.ts** → `aiService` (AI evaluation)
- [ ] **errorJailService.ts** → `/api/admin-monitoring/*`

---

## Langkah 8: Migration Other Services (LOW)

- [ ] **blogService.ts** → `services/blog.ts` (sudah ada, cek lagi)
- [ ] **purchaseService.ts** → Skip (nanti kalau perlu)
- [ ] **offlineQueue.ts** → Keep local-only (tidak perlu backend)
- [ ] **loggingService.ts** → Keep (local logging)
- [ ] **metricsService.ts** → Keep atau hapus (nanti aja)
- [ ] **sessionPersistenceService.ts** → Keep (local storage)
- [ ] **socialRateLimiter.ts** → Keep (local rate limiting)
- [ ] **essayMetricsService.ts** → Keep (local calculations)
- [ ] **featureFlagService.ts** → Keep (local only)

---

## Langkah 9: Update Import di Components

- [ ] Scan semua components yang import service lama
- [ ] Update import statements satu per satu
- [ ] Test setelah update

---

## Langkah 10: Testing End-to-End

- [ ] Test setiap feature yang dimigrate
- [ ] Fix bugs yang muncul
- [ ] Verify tidak ada Supabase calls lagi (kecuali Google OAuth)

---

## Prioritas Pengerjaan

```
Phase 1: Core Features (Quiz + Auth)
  - questionBankService
  - userQuestionHistoryService
  - todaysFocusService
  - Supabase cleanup di App.tsx

Phase 2: Writing (Paling kompleks)
  - Semua writing services
  - Session management
  - Progress tracking

Phase 3: Social
  - Circles, Friends, Leaderboard
  - Notifications
  - Peer Review

Phase 4: Admin & Storage
  - Admin dashboard
  - Audio storage
  - Reports

Phase 5: Leftovers
  - Feature flags
  - Metrics (optional)
  - Blog
```

---

## Catatan Penting

1. **Keep Google OAuth** - Jangan hapus social login
2. **Test incremental** - Setiap service migrate, langsung test
3. **Backup** - Simpan backup sebelum mass update
4. **Error handling** - Pastikan semua error di-handle dengan baik
5. **Offline support** - Pertahankan fitur offline yang sudah ada