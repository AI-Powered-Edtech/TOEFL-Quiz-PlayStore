# Checklist: Rust Backend Logic Migration

- [x] Seluruh logika pembuatan *prompt* AI (misalnya `prompts/reading.ts`, `prompts/written.ts`) berhasil dipindahkan ke *backend* VIL Rust.
- [x] *Endpoint* Rust baru dibuat untuk menghasilkan soal kuis secara utuh.
- [x] Logika *Essay validation* dan penilaian (*grammar, vocabulary, CEFR level*) dienkapsulasi dan diproses di server (Rust).
- [x] *Score calculation* (penentuan *Estimated TOEFL Score*) dihitung di *backend* menggunakan histori data pengguna di *database*.
- [x] Aplikasi Frontend (React/TypeScript) tidak lagi memanggil API LLM (Groq) secara langsung.
- [x] Aplikasi berjalan normal tanpa regresi fungsionalitas setelah migrasi.
- [x] *Bundle size* JavaScript menurun atau waktu respons *frontend* meningkat karena pengurangan pustaka berat.
- [x] Laporan performa akhir selesai dibuat, mendokumentasikan migrasi sebagai *best practice*.