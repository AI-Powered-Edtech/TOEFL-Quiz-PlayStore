# Tasks
- [ ] Task 1: Inventarisasi komponen backoffice (frontend).
  - [ ] Identifikasi entry point admin dan bagaimana user mengaksesnya (routing/build).
  - [ ] Review implementasi UI Hub (list user, ubah role, ubah tier) dan dependency service-nya.
- [ ] Task 2: Inventarisasi endpoint backoffice (backend).
  - [ ] Petakan endpoint admin utama: `/api/admin/users`, `/api/admin/users/:id/tier`, `/api/admin/roles`, `/api/admin/audit-logs`, `/api/admin/verify-pin`.
  - [ ] Petakan endpoint admin monitoring: `/api/admin-monitoring/*`.
  - [ ] Petakan endpoint blog admin: `/api/blog/admin/posts`.
- [ ] Task 3: Gap analysis “siap produksi”.
  - [ ] Auth gate UI (AdminAuthGate) masih stub → perlu validasi role + UX fallback (unauthorized).
  - [ ] Konsistensi role assignment: frontend mengirim `role`, backend saat ini selalu set `admin` (tidak pakai `role` dari request).
  - [ ] Safety: perubahan `tier` memerlukan `super_admin` → UI perlu meng-handle error 403 dengan jelas.
  - [ ] Observability: audit logs pagination/filter (opsional) dan admin monitoring UI (opsional).
- [ ] Task 4: Rekomendasi prioritas implementasi (roadmap singkat).
  - [ ] P0: AdminAuthGate real (fetch profile/claims + redirect).
  - [ ] P0: Role/tier management flow yang konsisten (contract FE/BE selaras).
  - [ ] P1: Tambah halaman monitoring di backoffice (health/errors/flags/reports).
  - [ ] P1: Tambah UI audit log (search/pagination).

# Task Dependencies
- Task 3 depends on Task 1, Task 2
- Task 4 depends on Task 3
