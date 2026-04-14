# Tasks: End-to-End Testing Semua Flow

- [x] **Task 1: Setup Lingkungan E2E**
  - Pastikan database dalam keadaan bersih (seeded/reset) sebelum tes.
  - Jalankan server backend (`vil run` atau `cargo run`) dan frontend secara paralel.

- [x] **Task 2: Tes Flow Authentication & User**
  - Registrasi user baru dari UI, login, dan validasi penyimpanan JWT token.
  - Update profile dan akses data profil terbaru.
  - Validasi integrasi OAuth (jika tersedia di UI).

- [x] **Task 3: Tes Flow Quiz & Bank Soal**
  - User memulai simulasi quiz, menjawab soal, submit jawaban, dan melihat skor (History & Progress).
  - Admin/Creator dapat menambah, mengubah, atau menghapus soal di Bank Soal melalui UI.

- [x] **Task 4: Tes Flow Writing & AI**
  - User menggunakan AI Generator (memastikan proxy Groq berjalan mulus via `vil::ai`).
  - User men-submit essay, menerima evaluasi/scoring AI, lalu masuk ke queue Peer Review.
  - User mengujicoba TTS dan Devils Advocate.

- [x] **Task 5: Tes Flow Social & Gamification**
  - User membuat/bergabung dengan Circle, lalu mengirim pesan di Circle.
  - User menambah teman, mengecek leaderboard, membuat prediksi, dan melihat notifikasi (serta tandai sudah dibaca).

- [x] **Task 6: Tes Flow Creator & Blog**
  - Creator dapat login/register sebagai creator, lalu mengecek statistik dashboard (Daily Bites, Earnings).
  - User melihat daftar Blog/Materi dan membuka halaman detailnya tanpa error.

- [x] **Task 7: Tes Flow Admin Monitoring**
  - Admin login dan mengecek system health, audit logs, recent errors, dan list user.
  - Admin dapat mengatur Feature Flags (toggle enable/disable).
  - Menyelesaikan *content report* dari user.

- [x] **Task 8: Perbaikan Bug (Bila Ada)**
  - Identifikasi kegagalan *wiring* antara frontend & backend selama E2E testing.
  - Lakukan perbaikan pada kode frontend (fetch/axios mapping) atau backend (response model format) jika ada ketidaksesuaian kontrak data.