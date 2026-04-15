# Ship Play Store Release Spec

## Why
Targetnya adalah rilis Android yang benar-benar siap produksi: tim Anda cukup menjalankan build release dan meng-upload AAB ke Play Console tanpa perlu “patch manual” terkait onboarding, paywall/subscription, dan distribusi token AI.

Saat ini sudah ada fondasi (Capacitor deps + paywall UI + backend token budget), tetapi ada gap kritis untuk production:
- Android platform project belum ada (`frontend/android/`).
- Flow subscription belum production-grade (receipt verification server-side belum ada; user ID masih placeholder).
- Distribusi token AI tier `basic` vs `c2` belum konsisten di backend.
- Onboarding “per fitur” belum ada (hanya ada onboarding di beberapa modul spesifik).

## What Changes
- Menyiapkan build pipeline Android Capacitor sampai bisa menghasilkan AAB release signed.
- Menutup gap subscription agar sesuai praktik terbaik Play Billing:
  - Verifikasi purchase token di backend menggunakan Google Play Developer API.
  - Aktivasi tier server-side dan restore entitlement yang benar.
  - Frontend purchase flow menggunakan user nyata dari auth (bukan placeholder).
- Menyamakan distribusi token AI per tier (free/basic/c2) dan memastikan enforcement server-side tetap menjadi sumber kebenaran.
- Menambahkan onboarding minimal (1x) yang menjelaskan fitur inti + “cara upgrade”.

## Impact
- Affected specs: Mobile Distribution, Subscription/Paywall, AI Token Budget, Onboarding.
- Affected code:
  - Frontend: `frontend/src/services/purchaseService.ts`, `frontend/src/services/subscriptionService.ts`, `frontend/src/hooks/useSubscription.ts`, komponen paywall/onboarding.
  - Backend: `src/services/ai.rs`, service baru untuk verifikasi purchase.
  - Mobile: `frontend/capacitor.config.ts` dan folder platform `frontend/android/`.

## ADDED Requirements
### Requirement: AAB Release Output
Sistem SHALL dapat menghasilkan file `.aab` signed dari repo ini.

#### Scenario: Success case
- **WHEN** tim menjalankan perintah build release Android
- **THEN** `.aab` terbentuk dan dapat diupload ke Play Console (internal testing) tanpa error.

### Requirement: Server-Side Entitlement (Subscription)
Sistem SHALL memverifikasi purchase token subscription di backend dan mengaktifkan entitlement tier di server.

#### Scenario: Purchase verify success
- **WHEN** user menyelesaikan pembelian subscription di Android
- **THEN** frontend mengirim `purchaseToken + productId` ke backend, backend memverifikasi ke Google Play, lalu meng-update `profiles.subscription_tier`.

### Requirement: Tier Token Distribution
Sistem SHALL menerapkan limit token harian berdasarkan tier:
- `free`: 15
- `basic`: 500
- `c2`: 5000

#### Scenario: Token usage
- **WHEN** user memakai AI melebihi limit harian
- **THEN** backend menolak dengan error token limit dan frontend menampilkan paywall/upgrade.

### Requirement: Minimal Feature Onboarding
Sistem SHALL menampilkan onboarding minimal sekali (first-run) untuk menjelaskan fitur utama dan cara upgrade.

#### Scenario: First run
- **WHEN** user membuka aplikasi pertama kali
- **THEN** modal onboarding tampil dan state tersimpan agar tidak muncul lagi (per user/device).

## MODIFIED Requirements
### Requirement: Purchase Flow Uses Real User Identity
Flow purchase SHALL menggunakan user id asli dari sistem auth (JWT/profile), bukan placeholder.

## REMOVED Requirements
### Requirement: Client-Side “Simulated Verification”
**Reason**: Tidak valid untuk produksi dan melanggar prinsip entitlement berbasis server.
**Migration**: `purchaseService.verifyAndActivate()` harus memanggil endpoint backend verifikasi purchase.
