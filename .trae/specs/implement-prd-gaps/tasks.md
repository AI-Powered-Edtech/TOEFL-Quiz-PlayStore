# Tasks - Implementasi Gaps PRD

## Phase 1: Infrastruktur Dasar & Auth (Gaps)
- [x] Task 1: Implementasi Offline Sync & Guest Conversion
  - [x] SubTask 1.1: Buat `offlineSyncService.ts` dengan IndexedDB (idb).
  - [x] SubTask 1.2: Tangkap *event* registrasi akun baru untuk memigrasikan data lokal Guest ke backend.
- [x] Task 2: AI Rate Limiting & Circuit Breaker
  - [x] SubTask 2.1: Implementasikan *exponential backoff* di `src/services/groq/client.ts`.
  - [x] SubTask 2.2: Buat UI *fallback* (Toast/Modal) saat AI sedang *cooldown* untuk memandu pengguna.

## Phase 2: Practice Hub & Core Training (Gaps)
- [x] Task 3: Penyempurnaan PDF to Quiz
  - [x] SubTask 3.1: Tambahkan validasi ukuran dan tipe file yang lebih ketat di frontend (maksimal ukuran dokumen 20MB dan format PDF valid).
  - [x] SubTask 3.2: Implementasikan *chunking* teks jika rentang halaman PDF terlalu panjang (mengantisipasi limit *context window* 8192 token).
- [x] Task 4: Fallback CEFR Speaking
  - [x] SubTask 4.1: Modifikasi `CefrSimulationView.tsx` untuk menampilkan *textarea* fungsional jika API `useSpeechRecognition` mengembalikan pesan *not supported* atau *permission denied*.

## Phase 3: Writing Gym & Essay Dojo (Gaps)
- [x] Task 5: State Persistence Writing Gym
  - [x] SubTask 5.1: Simpan *state* progres `ComplexityLadder` ke `localStorage` secara real-time.
  - [x] SubTask 5.2: Terapkan mekanisme restorasi *state* saat pengguna me-*refresh* komponen atau *tab* tertutup secara tidak sengaja.
- [x] Task 6: Stabilisasi Parsing JSON AI
  - [x] SubTask 6.1: Perkuat logika ekstraksi dan validasi di `jsonParser.ts` untuk menangani JSON terpotong (akibat limit token) atau struktur format Markdown dari LLM Groq.

## Phase 4: Social & Gamification (Gaps)
- [x] Task 7: Sinkronisasi Leaderboard Otomatis
  - [x] SubTask 7.1: Tambahkan mekanisme *polling* otomatis di `MasonLeaderboard.tsx` setiap 30-60 detik.
- [x] Task 8: Kalkulasi Score Oracle Latar Belakang
  - [x] SubTask 8.1: Optimalkan fungsi *fetch* prediksi skor agar dapat berjalan di *background thread* tanpa menyebabkan antarmuka utama (UI thread) menjadi *freeze* atau lambat.
