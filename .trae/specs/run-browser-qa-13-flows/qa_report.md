# QA Report — Browser QA 13 Flow (Iterasi 1)

Setup:
- Backend: `http://localhost:8082` (health: `GET /health` = 200)
- Frontend: `http://localhost:5173`

Legenda:
- Status: PASS / PARTIAL / FAIL
- Screenshot: path file di folder `screenshots/` (jika ada)

---

FLOW 1 — Auth
Status: FAIL
Screenshot: screenshots/flow1_featureflags_error.png
Console errors: [FeatureFlags] Error fetching flags: {}; Auth flow UI username/password tidak ada
Notes: Dokumen QA meminta register/login username+password (qa_tester) dan logout; UI saat ini default guest_login + hanya terlihat tombol Login with Google di Profile Settings, route /login tidak menampilkan form.

FLOW 2 — Dashboard
Status: PARTIAL
Screenshot:
Console errors: [FeatureFlags] Error fetching flags: {}
Notes: Dashboard/landing tampil dan navigasi bottom tab berfungsi, tapi ada console error merah dan URL tetap /login.

FLOW 3 — Quiz — Core Learning Loop
Status: FAIL
Screenshot: screenshots/flow3_rust_backend_generation_failed.png
Console errors: Rust Backend Generation Failed: {}; [AIProvider] Generation failed: {}; [App] Failed to start skill: {}
Notes: Start session untuk skill dari Learning Path tidak dapat membuka quiz karena generation via Rust API gagal.

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
Console errors: Failed to fetch leaderboard: HTTP 404: Not Found
Notes: Friends tab punya input friend code, tapi submit code invalid tidak menampilkan error/toast. Circles “Create Circle” terkunci “Sign in to Create”.

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
