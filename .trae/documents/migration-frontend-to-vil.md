# Plan: Migration Frontend TOEFL Quiz ke VIL Backend

## Tujuan
Memindahkan frontend dari `/home/rog/Documents/toeflquiz` ke `/home/rog/Documents/TOEFL-Quiz` dan mengintegrasikan dengan VIL Backend Rust.

---

## Langkah 1: Setup Project Structure

- [ ] Buat folder `frontend/` di dalam project VIL
- [ ] Copy `package.json` dari toeflquiz
- [ ] Copy `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`
- [ ] Copy folder `src/` (components, hooks, stores, types, data, utils, config)
- [ ] Copy folder `public/`, `index.html`
- [ ] Hapus dependencies Supabase dari package.json:
  - `@supabase/supabase-js`
  - `@capgo/capacitor-social-login` (opsional)
- [ ] Install dependencies: `npm install`

---

## Langkah 2: Buat API Client Layer

- [ ] Buat `frontend/src/services/apiClient.ts`
  - Base URL dari env: `VITE_API_URL` (default: `http://localhost:8082`)
  - Fetch wrapper dengan auth headers (JWT dari localStorage)
  - Helper methods: `get()`, `post()`, `patch()`, `delete()`
  - Error handling terpusat
  - Type generic responses

- [ ] Buat `frontend/src/services/auth.ts`
  - Wrapper untuk `/api/auth/*` endpoints
  - Login, register, refresh token, profile
  - Simpan JWT di localStorage

- [ ] Buat `frontend/src/stores/authStore.ts` (Zustand)
  - State: user, token, isAuthenticated
  - Actions: login, logout, refreshProfile

---

## Langkah 3: Migration Services (Per Domain)

### 3.1 Quiz Services
- [ ] `src/services/quizRepository.ts` → pake `apiClient`
- [ ] `src/services/questionBankService.ts`
- [ ] `src/services/historyService.ts`
- [ ] `src/services/pdfQuizService.ts`

### 3.2 AI Services
- [ ] `src/services/aiProvider.ts`
- [ ] `src/services/essayEvaluationService.ts`
- [ ] `src/services/groq/client.ts` → `/api/ai/generate`

### 3.3 Writing Services
- [ ] `src/services/writingGymService.ts`
- [ ] `src/services/writingGymProgressService.ts`
- [ ] `src/services/peerReviewService.ts`

### 3.4 Social Services
- [ ] `src/services/circleService.ts`
- [ ] `src/services/friendService.ts`
- [ ] `src/services/leaderboardService.ts`
- [ ] `src/services/notificationService.ts`

### 3.5 Creator Services
- [ ] `src/services/creatorService.ts` → `/api/creator/*`

### 3.6 Other Services
- [ ] `src/services/blogService.ts`
- [ ] `src/services/subscriptionService.ts`
- [ ] `src/services/storageService.ts`
- [ ] `src/services/featureFlagService.ts`

---

## Langkah 4: Fix Hooks

- [ ] `src/hooks/useAuth.ts` → pakai authStore + API
- [ ] `src/hooks/useSubscription.ts`
- [ ] `src/hooks/useFreePlanHearts.ts`

---

## Langkah 5: Fix Components (Jika Error)

- [ ] `AppRouter.tsx` → cek routing
- [ ] `Dashboard.tsx` → test data loading
- [ ] `QuizView*.tsx` → test quiz flow
- [ ] `Profile.tsx` → test profile update
- [ ] `PaywallSheet.tsx` → test subscription

---

## Langkah 6: Environment Setup

- [ ] Buat `frontend/.env`:
  ```
  VITE_API_URL=http://localhost:8082
  ```
- [ ] Buat `frontend/.env.example`

---

## Langkah 7: Testing

- [ ] Run backend: `cargo run` (port 8082)
- [ ] Run frontend: `npm run dev` (port 5173)
- [ ] Test auth flow (register, login)
- [ ] Test quiz simulation
- [ ] Test AI essay evaluation
- [ ] Test social features

---

## Urutan Pengerjaan

```
1. Setup project (1-2 jam)
   ↓
2. API Client + Auth Store (2-3 jam)
   ↓
3. Quiz services (2-3 jam)
   ↓
4. AI services (2-3 jam)
   ↓
5. Writing services (2-3 jam)
   ↓
6. Social services (2-3 jam)
   ↓
7. Other services + hooks (2-3 jam)
   ↓
8. Component fixes + testing (3-4 jam)
```

**Estimasi Total: ~16-20 jam** (bisa lebih cepat atau lambat tergantung kompleksitas)

---

## Catatan Penting

- Backup dulu sebelum mulai
- Test per-domain sebelum lanjut ke domain berikutnya
- Gunakan browser DevTools Network tab untuk debug
- Error pertama = kemungkinan missing types atau wrong API response format
