# Tasks: Persona-Based Browser Testing

- [x] **Task 1: Setup Environment Variables**
  - Tambahkan `GROQ_API_KEY=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` ke file `.env` dan `.env.example`.
  - Jalankan ulang (restart) server *backend* `vil run` atau `cargo run` dan *frontend* (`npm run dev`) secara paralel.

- [x] **Task 2: QA Loop - Auth, Profile & Dashboard**
  - Akses `http://localhost:5173/` menggunakan *browser agent*.
  - Menilai apakah *landing page*, *onboarding*, dan *dashboard* (Profile) sudah intuitif untuk *persona user* pelajar TOEFL.

- [x] **Task 3: QA Loop - Practice & Quiz (Generasi AI)**
  - Menuju "Practice" dan memilih satu "Skill" untuk memulai sesi simulasi.
  - Memverifikasi soal yang berhasil digenerasi oleh AI Groq (*no generation error*).
  - Berinteraksi dengan pilihan jawaban (A, B, C, D) dan mengecek fungsionalitas "Explanation".
  - Evaluasi *UX flow* dalam menjawab soal dari perspektif pelajar.

- [x] **Task 4: QA Loop - Writing Gym & Essay Dojo**
  - Mengakses Writing Gym (contoh: *The Mason* atau *Logic Weaver*).
  - Melakukan simulasi menyusun/menulis teks pendek (jika didukung) atau berinteraksi dengan AI untuk mendapatkan respons *grading* atau *hint*.

- [x] **Task 5: Laporan Evaluasi UX Best Practice**
  - Menyusun laporan kesimpulan:
    - Apakah fungsionalitas utama berjalan lancar.
    - Apakah aplikasi secara keseluruhan *best practice* (intuitif, cepat, responsif, minim kebingungan).