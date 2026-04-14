# Tasks

## Phase 1: Force Functional AI (Disable Mocks & Dev Mode)
- [ ] Task 1.1: Menonaktifkan *mock logic* di `src/services/ai.rs` atau `src/services/groq/client.ts` untuk memastikan permintaan selalu dikirim ke Groq API.
- [ ] Task 1.2: Memeriksa dan memodifikasi komponen pembatas akses ("Guest Limit Reached") untuk memperbolehkan mode pengembang (*Dev Mode*) beroperasi tanpa kuota.

## Phase 2: Fix Quiz Reading Output
- [ ] Task 2.1: Menyelaraskan *prompt* AI untuk kategori `READING` agar selalu mengembalikan JSON berstruktur yang berisi teks utama (*passage*) dan kumpulan pertanyaan (`stimulus`, `choices`, `correct_response`).
- [ ] Task 2.2: Memastikan `jsonParser` (atau utilitas *parsing* AI) mem-*parse* blok JSON *Reading* dengan stabil, mengatasi teks "gajelas" (seperti halusinasi Markdown) yang muncul pada UI.

## Phase 3: Correct Skill Routing & UI Mapping
- [ ] Task 3.1: Memperbaiki logika filter/routing di komponen *Quiz Generator* atau antarmuka kuis untuk memastikan pemilihan `Written Expression` memicu jenis interaksi `error_recognition` atau komponen UI yang tepat.
- [ ] Task 3.2: Menghapus rujukan komponen *Structure* yang *hardcoded* jika pengguna memilih jenis keterampilan yang lain.

## Phase 4: Data Persistence (Question Bank & Error Jail)
- [ ] Task 4.1: Menghubungkan fungsi setelah `generate` soal (misal di *store* Zustand/Redux atau hook lokal) agar menyimpan *payload* soal ke IndexedDB/Local Storage.
- [ ] Task 4.2: Memperbarui antarmuka `QuestionBank.tsx` agar memuat data soal dari *storage* tersebut.
- [ ] Task 4.3: Menyimpan jawaban salah (*incorrect responses*) ke *storage* agar komponen `ErrorJail.tsx` menampilkan histori soal yang perlu diperbaiki alih-alih layar kosong.

## Phase 5: Blog & Placeholder Removal
- [ ] Task 5.1: Menginisialisasi fungsionalitas dasar `Blog.tsx` dengan memuat daftar artikel lokal atau dari basis data *dummy* awal (JSON/Markdown) agar tampilan tidak kosong.
- [ ] Task 5.2: Membersihkan seluruh tampilan UI terkait "dummy/mock" lainnya jika pengguna secara eksplisit berada dalam *Dev Mode* dengan Groq API key valid.

# Task Dependencies
- [Task 2.1] depends on [Task 1.1]
- [Task 4.2] depends on [Task 4.1]
- [Task 4.3] depends on [Task 4.1]
