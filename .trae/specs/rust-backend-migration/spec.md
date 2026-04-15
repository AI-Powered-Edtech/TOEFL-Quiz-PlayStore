# Rust Backend Logic Migration Spec

## Why
Saat ini kode aplikasi lebih condong ke TypeScript (~97%) karena banyak *business logic* (seperti *prompt generation* AI, validasi *essay*, komputasi skor/Oracle, dan *grading*) dikelola di sisi *frontend* (`src/services/groq/*`). 
**Apakah ini bisa dimigrasi dan apakah ini best practice?** Ya, sangat bisa dan ini adalah **Best Practice Mutlak**. 
Memindahkan *heavy computation* dan orkestrasi AI ke backend (VIL Rust) memiliki keuntungan:
1. **Performa & Bundle Size**: Mengurangi beban pemrosesan *client-device* dan mengecilkan ukuran *bundle* JS (mempercepat *Initial Load Time*).
2. **Keamanan (Security)**: Menyembunyikan struktur *prompt* AI rahasia, *scoring logic*, dan akses API secara total dari sisi publik.
3. **Skalabilitas**: Rust berjalan secara *multi-threaded* dengan efisiensi memori yang ekstrem. *Frontend* cukup menjadi *thin client* (hanya mengatur UI/UX dan *state* ringan).

## What Changes
- [ ] Memindahkan seluruh modul *prompt generation* (`frontend/src/services/groq/prompts/*`) ke VIL Rust backend.
- [ ] Memigrasi logika evaluasi tulisan (*essay grading/validation*) dari *frontend* ke *endpoint* API Rust.
- [ ] Memigrasi algoritma *Score Oracle* dan pengolahan *history* ke *backend*.
- [ ] Melakukan *refactoring* pada servis *frontend* agar hanya bertugas melakukan HTTP Request (`fetch` atau `axios`) ke *backend*.
- **BREAKING**: Klien (browser) tidak lagi melakukan kontak langsung dengan model AI atau memproses struktur data JSON besar secara mandiri.

## Impact
- Affected specs: Performance Optimization, Security Architecture, Frontend-Backend Contract.
- Affected code: `frontend/src/services/`, `src/services/` (Rust), `src/models/` (Rust).

## ADDED Requirements
### Requirement: Server-Side AI Orchestration
Sistem HARUS memproses seluruh generasi kuis, evaluasi teks, dan kalkulasi skor di sisi server (Rust).

#### Scenario: Success case
- **WHEN** user meminta kuis baru atau mengirim *essay* untuk dinilai.
- **THEN** *frontend* mengirimkan *request* ringan ke *backend*. *Backend* Rust mengelola panggilan ke LLM (Groq), memvalidasi JSON, menghitung skor, dan mengembalikan hasil akhir (*final response*) yang siap *render* ke *frontend*.