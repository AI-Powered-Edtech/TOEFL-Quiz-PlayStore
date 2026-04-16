# Tasks

- [x] Task 1: Siapkan environment QA (backend + frontend)
  - [x] Jalankan backend dengan `DATABASE_URL="sqlite:data.db" JWT_SECRET="qa-test-secret" PORT=8082 cargo run`
  - [x] Jalankan frontend dengan `cd frontend && npm run dev` dan pastikan URL dapat diakses
  - [x] Konfirmasi endpoint API dasar dapat diakses dari frontend (tanpa auth dan dengan auth)

- [x] Task 2: Buat format laporan hasil QA 13 flow
  - [x] Buat file laporan QA (misal: `qa_report.md`) yang berisi 13 entri flow mengikuti format di dokumen QA
  - [x] Siapkan struktur folder untuk menyimpan screenshot issue (misal: `screenshots/`)

- [x] Task 3: Jalankan FLOW 1–13 menggunakan browser tool dan catat hasil
  - [x] FLOW 1: Auth (Register, Logout, Login, Wrong Password, Akses tanpa auth)
  - [x] FLOW 2: Dashboard
  - [x] FLOW 3: Quiz — Core Learning Loop (Start, Answer, Navigation, Mark, Finish, Share, History, Multi-section)
  - [x] FLOW 4: Simulation
  - [x] FLOW 5: Writing Gym (Hub, Mason, Too Short, Vocabulary, Devil’s Advocate, Library, Peer Review)
  - [x] FLOW 6: Social Hub (Circles, Friend Code, Leaderboard, Notifications)
  - [x] FLOW 7: Profile & Settings (View, Edit, Avatar Upload, Dark Mode & toggles)
  - [x] FLOW 8: Blog
  - [x] FLOW 9: Oracle / Analytics
  - [x] FLOW 10: Offline Behavior (DevTools offline mode; fallback jika tidak memungkinkan via tool)
  - [x] FLOW 11: Error Jail (fallback ke verifikasi UI discovery jika feature tidak ada)
  - [x] FLOW 12: Subscription / Paywall
  - [x] FLOW 13: Native Navigation (Back button)
  - [x] Untuk setiap issue: simpan screenshot + catat console errors/network errors yang relevan

- [x] Task 4: Fix semua issue yang ditemukan (iterasi 1)
  - [x] Buat daftar issue dari `qa_report.md` yang statusnya PARTIAL/FAIL
  - [x] Implementasi perbaikan dengan perubahan minimal, mengikuti pola codebase
  - [x] Tambahkan/ubah test bila ada framework yang sudah tersedia (opsional, prioritas ke regression e2e manual)

- [x] Task 5: Re-test seluruh FLOW 1–13 menggunakan browser tool (iterasi 1)
  - [x] Update status PASS/PARTIAL/FAIL di `qa_report.md`
  - [x] Ambil screenshot untuk issue yang masih tersisa atau regresi baru

- [ ] Task 6: Ulangi siklus fix → re-test sampai diminta berhenti
  - [ ] Jika masih ada PARTIAL/FAIL, ulangi Task 4 dan Task 5 (buat entri iterasi berikutnya di laporan)

# Task Dependencies
- Task 3 depends on Task 1
- Task 4 depends on Task 3
- Task 5 depends on Task 4
