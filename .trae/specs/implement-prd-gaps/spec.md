# Implementasi Gaps PRD vs Codebase Spec

## Why
Setelah menyusun 5 PRD komprehensif untuk seluruh fitur aplikasi (Dashboard, Practice Hub, Writing Gym, Essay Dojo, Social/Gamification), ditemukan beberapa kesenjangan (gaps) antara spesifikasi ideal di PRD dengan implementasi aktual di codebase saat ini. Rencana ini bertujuan untuk menutup gaps tersebut secara sistematis agar aplikasi sepenuhnya *production-ready* sesuai PRD.

## What Changes
- Mengimplementasikan sinkronisasi *offline-to-online* menggunakan IndexedDB untuk pengguna Guest.
- Menambahkan mekanisme penanganan *Rate Limit* dan *Exponential Backoff* yang lebih tangguh pada fitur PDF to Quiz dan CEFR Grading.
- Mengintegrasikan *fallback* Textarea yang persisten jika API *Speech Recognition* gagal di browser tertentu pada simulasi CEFR.
- Menyempurnakan penyimpanan *state* pada komponen Writing Gym (*Complexity Ladder*, dll.) agar progres tidak hilang saat *refresh*.
- Memperbaiki algoritma sinkronisasi pada *Peer Review* dan *Leaderboard* agar mendukung pembaruan data secara *real-time* atau *polling* efisien.
- Menangani *edge cases* JSON parsing yang tidak valid dari respons LLM (Groq) secara komprehensif.

## Impact
- Affected specs: Seluruh PRD di `.trae/specs/all-features-prd/`
- Affected code: `src/services/auth.ts`, `src/services/pdfService.ts`, `src/components/CefrSimulationView.tsx`, `src/components/writingGym/*`, `src/components/SocialHub.tsx`

## ADDED Requirements
### Requirement: Robust Offline Sync
Sistem HARUS menyimpan progres belajar pengguna Guest di IndexedDB dan mensinkronisasikannya ke backend secara otomatis saat koneksi internet kembali atau saat pengguna memutuskan untuk melakukan registrasi akun (Konversi Guest ke Akun).

### Requirement: AI Rate Limit Handling
Sistem HARUS memiliki *circuit breaker* dan *exponential backoff* otomatis ketika API Groq mengembalikan status 429 (Too Many Requests), serta memberikan notifikasi antarmuka pengguna (UX) yang ramah tanpa menyebabkan aplikasi *crash*.

## MODIFIED Requirements
### Requirement: CEFR Speaking Fallback
Jika `webkitSpeechRecognition` tidak tersedia atau izin mikrofon ditolak oleh browser, sistem tidak hanya menampilkan peringatan, tetapi HARUS menyediakan komponen *textarea* alternatif secara otomatis yang fungsional, dan hasilnya tetap dapat dinilai oleh AI sebagai respons teks.

## REMOVED Requirements
### Requirement: Polling Manual
**Reason**: Meminta pengguna melakukan *refresh* manual untuk memperbarui *Leaderboard* mengurangi keterlibatan (engagement).
**Migration**: Akan diganti dengan mekanisme *polling* otomatis di latar belakang (misal: setiap 30 detik) atau menggunakan *WebSocket* jika infrastruktur mendukung.
