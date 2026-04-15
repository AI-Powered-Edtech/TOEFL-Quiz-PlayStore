# Implement Backoffice Production Readiness Spec

## Why
Progres implementasi Backoffice saat ini sudah mencapai tahap *minimal workable*, namun masih terdapat celah keamanan dan fungsionalitas yang menghalanginya untuk mencapai *100% production readiness*. Celah terbesar adalah `AdminAuthGate` di frontend yang masih berupa *stub* (tidak melakukan validasi *role* pengguna), serta inkonsistensi pada *role assignment* dan penanganan *error* 403 (kebutuhan akses *super_admin*). 

## What Changes
- Mengimplementasikan logika validasi *role* yang nyata pada `AdminAuthGate.tsx`. Jika pengguna bukan *admin* atau *super_admin*, mereka akan diarahkan (*redirect*) keluar atau ditampilkan pesan *Unauthorized*.
- Memperbaiki kontrak *role assignment* antara frontend dan backend agar peran yang dikirim dari antarmuka (misalnya `admin` atau `super_admin`) diproses dengan benar oleh backend `src/services/admin.rs`.
- Menyempurnakan UX (User Experience) penanganan *error* pada `BackofficeHub.tsx`, khususnya untuk menangkap status 403 (Forbidden) saat seorang admin biasa mencoba mengubah *tier* yang membutuhkan *role super_admin*.
- Menambahkan tab/halaman sederhana di Backoffice untuk melihat *System Health* dan *Recent Errors* yang datanya diambil dari endpoint `/api/admin/monitoring/health` dan `/api/admin/monitoring/errors`.

## Impact
- Affected specs: Security, RBAC (Role-Based Access Control), Admin/Backoffice, Monitoring.
- Affected code:
  - Frontend: `frontend/src/components/admin/AdminAuthGate.tsx`, `frontend/src/components/admin/BackofficeHub.tsx`, `frontend/src/components/admin/SystemHealth.tsx` (baru).
  - Backend: `src/services/admin.rs`.

## ADDED Requirements
### Requirement: Real Admin Auth Gate
Sistem HARUS secara aktif memblokir akses ke antarmuka Backoffice jika pengguna belum *login* atau tidak memiliki *role* `admin` / `super_admin`.

#### Scenario: Success case
- **WHEN** pengguna biasa (role `user`) mencoba mengakses halaman `/admin`
- **THEN** komponen `AdminAuthGate` mendeteksi peran tersebut melalui profil API dan langsung menampilkan layar penolakan akses (Unauthorized) atau mengarahkannya ke halaman utama.

### Requirement: System Health Monitoring UI
Sistem HARUS menyediakan antarmuka bagi admin untuk memantau kesehatan sistem secara *real-time*.

#### Scenario: Success case
- **WHEN** Admin membuka tab "System Health" di Backoffice
- **THEN** UI memanggil endpoint monitoring Rust dan menampilkan jumlah pengguna aktif, jumlah *error* sejam terakhir, dan *warnings*.

## MODIFIED Requirements
### Requirement: Role Assignment Contract
Logika *assign_role* di backend HARUS menghormati parameter `role` yang dikirim dari *payload* frontend.

**Reason**: Saat ini backend memaksakan nilai *hardcoded* `"admin"` saat menambahkan *role*.
**Migration**: Modifikasi fungsi `assign_role` di `src/services/admin.rs` agar mengambil nilai `req.role`.