# QA Report — Browser QA 13 Flow (Iterasi 1)

Setup:
- Backend: `http://localhost:8082` (health: `GET /health` = 200)
- Frontend: `http://localhost:5173`

Legenda:
- Status: PASS / PARTIAL / FAIL
- Screenshot: path file di folder `screenshots/` (jika ada)

---

FLOW 1 — Auth
Status: PASS
Screenshot:
Console errors:
Notes: Username/password register + login tersedia via Profile Settings → “Login / Register (Username)”. Logout via tombol “Sign Out” di Profile berhasil kembali ke state guest.

FLOW 2 — Dashboard
Status: PARTIAL
Screenshot:
Console errors: [FeatureFlags] Error fetching flags: {}
Notes: Dashboard/landing tampil dan navigasi bottom tab berfungsi, tapi ada console error merah dan URL tetap /login.

FLOW 3 — Quiz — Core Learning Loop
Status: PASS
Screenshot:
Console errors:
Notes: Start session membuka quiz. Jika AI key tidak tersedia, backend mengembalikan offline fallback questions yang lolos validasi UI (Structure fill_blank, Written identify_error, Reading stimulus, Listening transcript).

FLOW 4 — Simulation
Status: PARTIAL
Screenshot: screenshots/flow4_full_simulation_paywall.png
Console errors:
Notes: Full Simulation membuka halaman konfigurasi, namun CTA yang muncul adalah paywall “Upgrade untuk Full Simulation” (tidak ada tombol Start Simulation untuk free user).

FLOW 5 — Writing Gym
Status: PARTIAL
Screenshot: screenshots/flow5_essay_dojo_no_actions.png; screenshots/flow5_essay_dojo_no_actions.png
Console errors: [WritingGym] Generation failed: {}; [LogicWeaver] Exercise generation failed ... Groq API Error
Notes: Writing Gym hub terbuka dan “The Mason” menampilkan exercise, tetapi Essay Dojo hanya menampilkan section tanpa tombol aksi untuk memulai latihan / submit essay.

FLOW 6 — Social Hub
Status: PARTIAL
Screenshot: screenshots/flow6_leaderboard_empty_no_state.png; screenshots/flow6_circles_requires_sign_in.png
Console errors:
Notes: Endpoint leaderboard sudah tidak 404 (path diarahkan ke /api/social/leaderboard). Friends/Add Friend sekarang menampilkan error jika user belum sign-in.

FLOW 7 — Profile & Settings
Status: PARTIAL
Screenshot:
Console errors:
Notes: Dark mode toggle berfungsi (Dark→Light). Settings page ada toggle Notifications/Sound. Namun tidak ditemukan UI edit profile, avatar upload, dan logout efektif (Sign Out tidak terlihat mengubah session).

FLOW 8 — Blog
Status: PASS
Screenshot:
Console errors:
Notes: Blog list tampil dan post dapat dibuka (contoh “Skill 1...”) lalu kembali ke list.

FLOW 9 — Oracle / Analytics
Status: PASS
Screenshot:
Console errors:
Notes: Score Oracle dapat dibuka dan menampilkan pilihan test + tombol “Start Practicing”.

FLOW 10 — Offline Behavior
Status: PARTIAL
Screenshot:
Console errors:
Notes: Tidak dapat mensimulasikan DevTools “Offline” via browser tool; perlu verifikasi manual atau tambahkan debug toggle untuk QA.

FLOW 11 — Error Jail
Status: PASS
Screenshot:
Console errors:
Notes: Error Jail dapat dibuka dan menampilkan empty state “Clean Record” + tombol Return to Dashboard.

FLOW 12 — Subscription / Paywall
Status: PASS
Screenshot: screenshots/flow4_full_simulation_paywall.png
Console errors:
Notes: Akses Full Simulation memunculkan paywall upgrade untuk free user.

FLOW 13 — Native Navigation (Back Button)
Status: PARTIAL
Screenshot:
Console errors:
Notes: browser back navigation mengembalikan ke halaman sebelumnya, namun belum bisa validasi konfirmasi “leave quiz?” karena quiz tidak berhasil dijalankan.
