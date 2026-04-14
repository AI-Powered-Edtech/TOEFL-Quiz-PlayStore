# QA E2E Subscription & Backoffice Spec

## Why
Sistem saat ini menggunakan *hardcode* untuk akses *tier* tertinggi (C2 Pro) demi keperluan *development*. Hal ini membuat pengujian *paywall* dan manajemen token tidak dapat dilakukan secara *end-to-end* (E2E). Selain itu, fitur *backoffice* di backend sudah ada namun frontend-nya masih berupa *stub*, sehingga perlu dihubungkan agar bisa diuji alurnya oleh *browser agent* untuk menjalankan siklus QA.

## What Changes
- Menghapus *hardcode* *tier* langganan pada `useSubscription.ts`, `subscriptionService.ts`, dan backend `ai.rs`.
- Membuat *seeding script* atau endpoint khusus untuk memfasilitasi pembuatan akun Dev Premium (C2) dan akun Dev Free.
- Membangun UI minimal pada `BackofficeHub.tsx` untuk menampilkan daftar pengguna dan manajemen *role* agar bisa diakses oleh *browser agent*.
- Memastikan logika pemotongan token AI dan limitasi *paywall* berjalan sesuai paket (*tier*) pengguna.

## Impact
- Affected specs: Auth, Subscription, Admin/Backoffice, AI Generation.
- Affected code: `frontend/src/hooks/useSubscription.ts`, `src/services/ai.rs`, `frontend/src/components/admin/BackofficeHub.tsx`.

## ADDED Requirements
### Requirement: Pengujian Paywall dan Token
Sistem SHALL memberlakukan batasan token yang ketat berdasarkan *tier* pengguna yang valid di database, serta menampilkan *paywall* bagi pengguna *Free* yang kehabisan token.

#### Scenario: Akses Premium vs Free
- **WHEN** akun Dev Free kehabisan token AI
- **THEN** sistem menolak *request* dan frontend menampilkan *paywall*.
- **WHEN** akun Dev Premium melakukan *request* AI
- **THEN** sistem mengizinkan *request* dan memotong token sesuai batas premium.

### Requirement: UI Backoffice Minimal
Sistem SHALL menyediakan antarmuka admin yang fungsional untuk melihat daftar pengguna dan mengubah status/tier mereka.

#### Scenario: Manajemen Pengguna
- **WHEN** Admin mengakses halaman Backoffice
- **THEN** Admin dapat melihat daftar pengguna dan memodifikasi akses mereka.
