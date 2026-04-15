# Tasks

- [ ] Task 1: Stabilize quiz generation contract + secure query layer (BLOCKER)
  - [ ] Pastikan `POST /api/quiz/generate` mengembalikan typed JSON untuk `choices`, `correct_response`, `stimulus`, `metadata` (tanpa stringify).
  - [ ] Implementasikan `get_question_count` (COUNT dengan filter `section` opsional via parameterized bind).
  - [ ] Perbaiki `get_questions_paginated` agar filter `section` memakai parameterized bind (tanpa `format!`/string concatenation SQL).
  - [ ] Validasi: panggil endpoint generate dan pastikan `choices` adalah array pada response; jalankan test/query untuk memastikan filter `section` tidak rentan injection.

- [ ] Task 2: Konsistensi auth + state correctness di frontend (BLOCKER + MEDIUM)
  - [ ] `useAuthStore`: inisialisasi `isAuthenticated` dari secure storage abstraction (bukan localStorage hardcoded).
  - [ ] `apiClient` 401 handler: hapus token dari secure storage abstraction (bukan localStorage hardcoded).
  - [ ] `useAuth`: buat `progress` reaktif dengan selector subscription.
  - [ ] `useQuizStore.answer()`: tambah guard idempotency agar score tidak terhitung ganda.
  - [ ] Validasi: login/logout/re-login konsisten; simulasi 401 memastikan token bersih; double submit jawaban tidak menaikkan score dua kali.

- [ ] Task 3: Social backend parity + notification refresh (BLOCKER + HIGH)
  - [ ] Tambah endpoint backend yang hilang:
    - [ ] `DELETE /friends/:friend_id`
    - [ ] `POST /friends/respond`
    - [ ] `POST /notifications`
    - [ ] `GET /profile/:user_id`
    - [ ] `PATCH /profile/:user_id` (guard: hanya owner)
  - [ ] Register routing endpoint baru di `main.rs` (atau router utama yang dipakai).
  - [ ] Normalisasi shape Friend + Notification:
    - [ ] Tentukan strategi kompatibilitas: mapper frontend atau alias field backend (pilih yang paling kecil dampaknya).
    - [ ] Pastikan `id`/`friend_id` dan `read`/`is_read` kompatibel.
  - [ ] `useNotifications`: hapus subscribe Supabase channel stub dan ganti dengan polling `GET /api/social/notifications` (interval 30s, dengan cleanup).
  - [ ] Validasi: friend list render; add/remove/respond berjalan; notification badge/count berubah setelah polling.

- [ ] Task 4: Share report portable via backend persistence (BLOCKER)
  - [ ] Tambah migration + tabel `quiz_reports` (id, user_id, skill_id, section, score, correct_count, total_questions, breakdown JSON, created_at).
  - [ ] Tambah endpoint backend:
    - [ ] `POST /api/quiz/reports` untuk menyimpan report (auth required)
    - [ ] `GET /api/quiz/reports/:id` untuk mengambil report (public, tanpa auth)
  - [ ] Update frontend:
    - [ ] `reportService`: gunakan API untuk save/load report; localStorage hanya fallback offline (opsional).
    - [ ] Update share URL ke `/share/{reportId}` (dan pastikan halaman share fetch report dari backend).
  - [ ] Validasi: save report → buka link di incognito/device lain → report tampil.

- [ ] Task 5: Cleanup residu migrasi + contract hardening (HIGH)
  - [ ] Hapus seluruh dependency Supabase realtime yang tersisa di notification flow (import dan pemakaian stub).
  - [ ] Tambah mapper layer di service frontend:
    - [ ] Friend mapper (id ↔ friend_id, nested vs flatten profile)
    - [ ] Notification mapper (read ↔ is_read)
    - [ ] Question mapper (defensive parse bila backend masih mengirim JSON string pada field tertentu)
  - [ ] Tambah runtime contract validation untuk response API utama (Question/Friend/Notification/Report) dan integrasikan di service layer (fail-fast + error surfaced).
  - [ ] Update dokumentasi endpoint list agar sinkron dengan router backend.
  - [ ] Validasi: tidak ada call ke Supabase realtime; core flows (auth, quiz, social, share) jalan tanpa console error kontrak.

# Task Dependencies
- Task 2 bergantung pada hasil Task 1 hanya untuk validasi e2e quiz loop (bukan dependensi implementasi).
- Task 3 dapat dikerjakan paralel dengan Task 2 setelah Task 1 selesai.
- Task 4 independen dari Task 3, namun share page sebaiknya memanfaatkan contract hardening Task 5.
- Task 5 sebaiknya dilakukan setelah Task 2–4 agar mapping/validation sesuai shape final yang sudah diputuskan.

