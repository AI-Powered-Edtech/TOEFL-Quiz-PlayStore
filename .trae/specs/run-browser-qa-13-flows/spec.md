# Browser QA 13 Flow Loop Spec

## Why
Untuk memastikan seluruh flow utama aplikasi TOEFL Quiz berjalan sesuai ekspektasi UI/UX dan integrasi API melalui pengujian end-to-end menggunakan browser tool, serta memperbaiki issue sampai semua flow stabil.

## What Changes
- Menjalankan backend dan frontend lokal sesuai konfigurasi QA.
- Menjalankan seluruh 13 flow QA sesuai [BROWSER_QA_SPEC.md](file:///workspace/docs-dev/BROWSER_QA_SPEC.md) menggunakan browser tool.
- Mencatat hasil setiap flow dengan status PASS / PARTIAL / FAIL dan detail issue (console errors, langkah reproduksi).
- Mengambil screenshot untuk setiap issue yang ditemukan.
- Memperbaiki semua issue yang ditemukan, lalu mengulang test seluruh flow.
- Mengulang siklus test → fix → re-test sampai diminta berhenti.

## Impact
- Affected specs: Quality Assurance, E2E Browser Testing, UI/UX Regression.
- Affected code: Frontend (UI state, routing, handling error/loading/empty state), Backend (API contract, auth/session, persistence).

## ADDED Requirements
### Requirement: QA Environment Startup
Sistem QA HARUS dapat dijalankan secara lokal dengan konfigurasi berikut:
- Backend: `DATABASE_URL="sqlite:data.db" JWT_SECRET="qa-test-secret" PORT=8082 cargo run`
- Frontend: `cd frontend && npm run dev` dan dapat diakses di `http://localhost:5173`

#### Scenario: Success case
- **WHEN** backend dan frontend dijalankan sesuai setup
- **THEN** frontend dapat memuat halaman awal tanpa error fatal dan request API dasar dapat dilakukan

### Requirement: Execute 13 QA Flows via Browser Tool
Sistem HARUS dapat menjalankan dan memverifikasi seluruh 13 flow QA sesuai dokumen QA dengan interaksi browser tool (navigate, click, type, screenshot, console log inspection).

#### Scenario: Success case
- **WHEN** browser tool menjalankan FLOW 1 sampai FLOW 13 sesuai langkah pada dokumen QA
- **THEN** setiap flow memiliki hasil PASS/PARTIAL/FAIL dengan bukti observasi (notes) dan data pendukung (console errors bila ada)

### Requirement: Evidence for Issues
Sistem HARUS menyimpan bukti untuk setiap issue yang ditemukan.

#### Scenario: Success case
- **WHEN** ditemukan issue (UI broken, crash, console error merah, API error, navigasi buntu, data tidak muncul)
- **THEN** diambil screenshot yang menunjukkan kondisi issue dan dicatat langkah reproduksinya, termasuk console/network error yang relevan

### Requirement: Iterative Fix-and-Retest Loop
Sistem HARUS mendukung siklus perbaikan berulang untuk mencapai kondisi semua flow PASS.

#### Scenario: Success case
- **WHEN** issue diperbaiki
- **THEN** seluruh 13 flow dijalankan ulang dan hasilnya diperbarui, tanpa regresi pada flow yang sebelumnya PASS

## MODIFIED Requirements
N/A

## REMOVED Requirements
N/A
