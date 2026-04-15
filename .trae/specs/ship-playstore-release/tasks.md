# Tasks
- [x] Task 1: Android platform (Capacitor) siap build
  - [x] Generate `frontend/android/` via Capacitor dan pastikan `npx cap sync android` berhasil.
  - [x] Tambahkan script npm untuk build/sync/open Android.
  - [x] Pastikan `VITE_API_URL` dipakai untuk production (HTTPS) dan tidak ada `localhost` di release config.

- [x] Task 2: Fix token tier distribution (backend)
  - [x] Ubah `src/services/ai.rs` agar limit memakai `get_token_limit(tier)` (bukan hardcode 5000 untuk semua paid tier).
  - [x] Pastikan endpoint `GET /api/ai/token-usage` mengembalikan limit sesuai tier.

- [x] Task 3: Backend purchase verification endpoint (subscription entitlement)
  - [x] Tambah endpoint `POST /api/purchases/verify` (authenticated) yang menerima `{ product_id, purchase_token }`.
  - [x] Verifikasi ke Google Play Developer API menggunakan credential dari env (`GOOGLE_PLAY_SERVICE_ACCOUNT`).
  - [x] Update `profiles.subscription_tier` sesuai product dan masa aktif subscription.
  - [x] Return payload `{ ok, tier, expiry_date }` untuk dipakai frontend.

- [x] Task 4: Frontend purchase flow production-grade
  - [x] `purchaseService.ts`: ganti placeholder user `{ id: 'user_id' }` menjadi user dari auth store/service.
  - [x] `verifyAndActivate()` memanggil backend `/api/purchases/verify` dan mengaktifkan tier via response server.
  - [x] Pastikan restore purchases memanggil endpoint yang sama.

- [x] Task 5: Onboarding minimal per fitur + entry point
  - [x] Tambah modal onboarding (multi-step) untuk fitur inti: Practice/Quiz, Writing Gym/Essay Dojo, AI Chat, Subscription/Paywall.
  - [x] Simpan state onboarding selesai (per user/device) agar hanya muncul sekali.
  - [x] Tambah entry point “Lihat Tutorial” di Settings agar bisa dibuka ulang.

- [x] Task 6: Verifikasi end-to-end readiness (dev checklist)
  - [x] Web: paywall muncul saat token limit tercapai.
  - [x] Backend: token limit benar untuk free/basic/c2.
  - [x] Android: project `frontend/android/` sync berhasil dan konfigurasi release siap untuk `bundleRelease`.

# Task Dependencies
- Task 2 depends on Task 1 (opsional), bisa paralel
- Task 4 depends on Task 3
- Task 6 depends on Task 1, Task 2, Task 3, Task 4, Task 5
