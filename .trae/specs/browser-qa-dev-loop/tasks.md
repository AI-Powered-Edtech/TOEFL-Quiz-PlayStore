# Tasks: Browser QA Dev Loop

- [x] **Task 1: Setup Lingkungan Lokal & Akses Browser**
  - Pastikan backend (API) dan frontend berjalan di background (misal: port 8082 dan 4173/5175).
  - Buka browser agent (`browser_navigate`) ke URL frontend (localhost).

- [x] **Task 2: QA Loop - Auth & Profile**
  - Navigasi ke halaman Profile / Login.
  - Periksa *console messages* untuk mendeteksi error.
  - Ambil snapshot dan klik/berinteraksi di elemen-elemen profil atau otentikasi.

- [x] **Task 3: QA Loop - Practice & Quiz**
  - Navigasi ke halaman Practice / Quiz (misal: "Start session").
  - Pastikan opsi A, B, C, D dan fungsi "Review" atau "Explanation" dapat diklik.
  - Cek jika ada *Protocol error* pada *box model* dan catat.

- [x] **Task 4: QA Loop - Writing Gym & Essay Dojo**
  - Buka halaman Writing Gym dan pilih fitur "The Mason" atau "Essay Dojo".
  - Verifikasi elemen *premium wall* atau editor tulisan merender dengan tepat.
  - Validasi navigasi kembali ke menu utama.

- [x] **Task 5: QA Loop - Social & Blog**
  - Navigasi ke "Social Hub" dan cek tab "Circles", "Friends", "Leaderboards".
  - Navigasi ke "Blog" dan klik salah satu post (misal: "Skill 1").
  - Pastikan rendering teks dan *layouting* sukses melalui *browser snapshot*.

- [x] **Task 6: Laporan Hasil QA**
  - Buat *summary* laporan untuk status console error dan *success rate* interaksi browser agent di atas.