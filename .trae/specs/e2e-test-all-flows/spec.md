# E2E Test All Flows Spec

## Why
Untuk memastikan wiring (konektivitas) antara frontend dan backend yang telah menggunakan VIL v0.2 terintegrasi dengan sempurna di semua fitur. Pengujian ini krusial untuk mencegah regresi, memvalidasi perbaikan terbaru, dan menjamin bahwa aplikasi secara keseluruhan siap untuk rilis production.

## What Changes
- Pembuatan skenario tes E2E komprehensif untuk seluruh flow aplikasi dari UI ke Database.
- Pengujian dan validasi modul Authentication (Register, Login, OAuth, Profile).
- Pengujian modul Quiz (Simulasi, History, Progress, Bank Soal).
- Pengujian modul Writing/AI (Generate, Evaluasi, Peer Review, TTS).
- Pengujian modul Social (Circles, Friends, Leaderboard, Predictions, Achievements).
- Pengujian modul Creator (Dashboard, Analytics, Content Upload).
- Pengujian modul Blog (List, Detail).
- Pengujian modul Admin (Monitoring, Audit, Role Management, Feature Flags).

## Impact
- Affected specs: QA E2E, Production Readiness, All Features.
- Affected code: Scripts pengujian (seperti Cypress/Playwright atau QA scripts), dan potensi perbaikan (hotfix) pada API response backend atau komponen fetch/axios di frontend jika ditemukan mismatch.

## ADDED Requirements
### Requirement: E2E Automation & Manual QA Validation
Sistem HARUS bisa diuji secara end-to-end (dari interaksi UI frontend hingga state di database backend) untuk seluruh fitur aplikasi.

#### Scenario: Success case
- **WHEN** skrip E2E atau skenario QA manual dieksekusi secara penuh.
- **THEN** seluruh flow utama menghasilkan status HTTP sukses (200/201), data tersimpan dengan benar di backend, dan UI frontend menampilkan data yang sesuai tanpa ada error di console maupun blank screen.