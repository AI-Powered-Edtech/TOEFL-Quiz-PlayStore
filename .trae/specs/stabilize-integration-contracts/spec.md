# Integration Fix & Contract Stabilization Spec

## Why
Repo sedang berada di fase migrasi parsial dari arsitektur lama (localStorage/Supabase) menuju backend VIL Rust. Saat ini ada beberapa mismatch contract dan residu migrasi yang membuat core flow gagal di runtime (quiz kosong, social error, auth state inkonsisten, share report tidak portable).

## What Changes
- Menstabilkan contract response `POST /api/quiz/generate` agar field JSON tidak di-stringify lagi ketika dikirim ke frontend.
- Mengimplementasikan `get_question_count` dan memperbaiki query pagination agar aman dari SQL injection.
- Menyatukan sumber kebenaran token auth di frontend (useAuthStore + apiClient) agar kompatibel dengan mode production (cookie/secure storage).
- Menambahkan guard idempotency pada scoring `answer()` di quiz store.
- Menutup gap parity social: menambahkan 5 endpoint yang dipanggil frontend namun belum ada di backend, serta menormalkan shape response friend dan notification.
- Mengganti realtime notification stub (Supabase channel no-op) dengan polling sederhana ke backend.
- Memindahkan quiz report dari localStorage ke backend persistence agar share link portable lintas device/browser.
- Menambahkan layer defensive mapping + contract validation di frontend untuk mencegah regressi mismatch shape saat migrasi bertahap.

## Impact
- Affected specs: quiz generation, auth/session, social graph, notifications, report sharing, API contract validation.
- Affected code:
  - Backend: `src/services/quiz.rs`, `src/services/social.rs`, `src/services/auth.rs` (atau modul profile), `src/main.rs`, migration DB, model terkait quiz/social.
  - Frontend: `frontend/src/services/apiClient.ts`, `frontend/src/stores/useAuthStore.ts`, `frontend/src/hooks/useAuth.ts`, `frontend/src/stores/useQuizStore.ts`, `frontend/src/services/social.ts`, `frontend/src/hooks/useNotifications.ts`, `frontend/src/services/reportService.ts`, `frontend/src/App.tsx`, folder contract/mapper baru.

## ADDED Requirements

### Requirement: Quiz Generate Contract Stabil
The system SHALL mengembalikan field `choices`, `correct_response`, `stimulus`, dan `metadata` sebagai JSON typed value (array/object/string sesuai schema), bukan JSON-stringified payload.

#### Scenario: Success case
- **WHEN** user memanggil `POST /api/quiz/generate`
- **THEN** `choices` adalah array (contoh `["A","B","C","D"]`) dan `metadata` adalah object JSON, bukan string berisi JSON.

### Requirement: Question Count Endpoint Berfungsi
The system SHALL menyediakan jumlah pertanyaan di question bank melalui `get_question_count` dengan filter opsional `section` menggunakan parameterized query.

#### Scenario: Success case
- **WHEN** client meminta jumlah pertanyaan untuk section tertentu
- **THEN** backend mengembalikan angka count yang benar tanpa string formatting SQL.

### Requirement: Pagination Query Aman
The system SHALL menggunakan parameterized binds untuk filter `section` pada `get_questions_paginated` untuk mencegah SQL injection.

#### Scenario: Success case
- **WHEN** client memanggil pagination dengan `section` yang mengandung karakter khusus
- **THEN** query tetap aman dan hasilnya konsisten (tanpa eksekusi SQL tak terduga).

### Requirement: Auth Token Source of Truth Konsisten
The system SHALL menggunakan mekanisme storage yang sama untuk membaca dan menghapus token (secure storage/cookie abstraction) pada `useAuthStore` dan `apiClient` sehingga state `isAuthenticated` konsisten di dev dan production.

#### Scenario: Success case
- **WHEN** token expired dan backend mengembalikan 401
- **THEN** client menghapus token dari secure storage dan memaksa state auth menjadi unauthenticated tanpa stale token.

### Requirement: Progress Auth Reaktif
The system SHALL mengekspos `progress` dari auth store secara reaktif sehingga UI memperbarui state saat progress berubah.

#### Scenario: Success case
- **WHEN** progress berubah di store
- **THEN** komponen yang subscribe ikut re-render (tanpa akses langsung `getState()`).

### Requirement: Quiz Answer Idempotent
The system SHALL memastikan pemanggilan `answer()` berulang untuk question index yang sama tidak mengubah score lebih dari sekali.

#### Scenario: Success case
- **WHEN** user mengirim jawaban dua kali untuk soal yang sama (double click / retry)
- **THEN** score dan state correctness tidak terhitung ganda.

### Requirement: Social Endpoint Parity
The system SHALL menyediakan endpoint backend yang dibutuhkan frontend untuk social flow:
- `DELETE /friends/:friend_id`
- `POST /friends/respond`
- `POST /notifications`
- `GET /profile/:user_id`
- `PATCH /profile/:user_id` (hanya untuk pemilik profile)

#### Scenario: Success case
- **WHEN** user menghapus teman, merespons friend request, dan melihat profile
- **THEN** backend merespons 200/204 dengan payload sesuai contract yang dipakai frontend.

### Requirement: Social Shape Stabil (Friend + Notification)
The system SHALL menyediakan shape response yang kompatibel dengan frontend untuk:
- Friend: konsistensi identifier (`id` vs `friend_id`) dan struktur profile (nested vs flatten) melalui mapping/alias yang eksplisit.
- Notification: konsistensi status baca (`read` vs `is_read`) melalui mapping/alias yang eksplisit.

#### Scenario: Success case
- **WHEN** frontend memuat daftar friend dan notification
- **THEN** UI tidak error karena mismatch field name.

### Requirement: Notifications Tanpa Supabase Realtime
The system SHALL menyediakan mekanisme refresh notification tanpa ketergantungan pada Supabase realtime yang saat ini stub, minimal menggunakan polling periodik ke endpoint backend.

#### Scenario: Success case
- **WHEN** ada notification baru dibuat
- **THEN** UI menampilkan badge/update setelah interval polling berikutnya.

### Requirement: Share Report Portable Lintas Device
The system SHALL menyimpan quiz report ke backend dan menghasilkan report ID yang dapat dipakai sebagai share link sehingga report dapat dibuka di browser/device lain.

#### Scenario: Success case
- **WHEN** user menyelesaikan quiz dan menekan share
- **THEN** user mendapatkan URL `/share/{reportId}` dan report dapat dimuat oleh user lain tanpa mengakses localStorage pengirim.

## MODIFIED Requirements

### Requirement: Report Storage
Sebelumnya report hanya disimpan di localStorage. Sistem kini SHALL memprioritaskan backend persistence; localStorage hanya sebagai fallback offline (opsional) tanpa menjadi sumber share link.

### Requirement: Client-side Contract Handling
Service layer frontend kini SHALL memetakan dan memvalidasi response backend (defensive) untuk memastikan migrasi bertahap tidak membuat runtime crash/queue quiz kosong.

## REMOVED Requirements

### Requirement: Supabase Realtime Notifications
**Reason**: Implementasi saat ini adalah stub no-op dan tidak memberikan realtime.
**Migration**: Ganti dengan polling backend (minimum viable). SSE/websocket dapat ditambahkan kemudian bila backend siap.

