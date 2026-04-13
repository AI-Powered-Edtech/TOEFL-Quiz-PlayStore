# Checklist - Implementasi Gaps PRD

## Phase 1: Infrastruktur Dasar
- [x] Progres Guest tersimpan di IndexedDB saat mode offline.
- [x] Data Guest berhasil dimigrasikan ke backend tanpa duplikasi saat registrasi.
- [x] Error HTTP 429 (Rate Limit) dari Groq AI ditangani dengan *exponential backoff* dan pengguna diberi tahu lewat *toast notification*.

## Phase 2: Practice Hub
- [x] PDF berhalaman banyak dan berukuran besar diproses secara *chunking* atau ditolak jika lebih dari batas 20MB.
- [x] Mode *Speaking* di CEFR secara otomatis menampilkan *textarea* fungsional jika mikrofon tidak didukung atau ditolak.

## Phase 3: Writing Gym
- [x] Me-*refresh* halaman di tengah pengerjaan *Complexity Ladder* tidak mereset progres pengguna ke awal.
- [x] Respons AI yang bukan JSON valid atau terpotong (akibat batas token) ditangani dengan anggun (muncul pesan *error* ramah, aplikasi tidak menjadi *white screen*).

## Phase 4: Social & Gamification
- [x] *Leaderboard* ter-update secara berkala (tiap 30-60 detik) tanpa perlu pengguna me-*refresh* halaman manual.
- [x] *Score Oracle* merender *loading state* (animasi atau skeleton) dengan benar saat kalkulasi data performa yang besar, dan antarmuka tetap responsif.
