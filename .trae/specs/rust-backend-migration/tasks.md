# Tasks: Rust Backend Logic Migration

- [x] **Task 1: Audit & Identifikasi Logika Berat**
  - Analisis *file* di direktori `frontend/src/services/` (khususnya folder `groq`, `essayValidationService.ts`, dan *score calculation*).
  - Catat struktur *input/output* untuk dijadikan *contract* (DTO) di Rust.

- [x] **Task 2: Refactoring Endpoint AI di Rust Backend**
  - Buat atau modifikasi modul di `src/services/ai.rs`, `src/services/quiz.rs`, dan `src/services/writing.rs` untuk mengambil alih tugas *prompt building* (seperti `reading.ts`, `written.ts`).
  - Tambahkan kemampuan *parsing* dan validasi *JSON response* dari LLM secara *native* di Rust menggunakan `serde`.

- [x] **Task 3: Refactoring Essay Grading & Score Oracle**
  - Pindahkan logika validasi *essay* (*grammar check*, perhitungan kata, CEFR grading) ke *backend*.
  - Pindahkan komputasi rumit untuk *Estimated TOEFL Score* ke layanan *backend* (mengambil histori langsung dari DB `sqlite`).

- [x] **Task 4: Migrasi Frontend (Thin Client)**
  - Ubah servis di React (`quizGenerator.ts`, `essayValidationService.ts`) agar tidak lagi memproses *prompt* AI.
  - Ganti *logic* tersebut dengan *fetch* API (`POST /api/quiz/generate`, `POST /api/writing/evaluate`, dll.) yang memanggil *backend* VIL Rust.

- [x] **Task 5: Pengujian Integrasi E2E**
  - Jalankan kuis *Structure* dan tes fitur *Writing Gym/Essay Dojo* untuk memverifikasi bahwa alur data dari UI -> Rust Backend -> LLM -> UI berjalan tanpa *error* atau regresi.
  - Uji perbandingan kecepatan (respons *latency* dan *bundle size*) sebelum dan sesudah migrasi.

- [x] **Task 6: Finalisasi Laporan Performa & Persentase Bahasa**
  - Buat *report* akhir mengenai stabilitas dan pergeseran dominasi bahasa pemrograman (peningkatan porsi kode Rust di *backend*).