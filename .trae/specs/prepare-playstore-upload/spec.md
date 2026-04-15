# Persiapan Upload ke Play Store Spec

## Why
Aplikasi frontend sudah memiliki dependensi Capacitor (Android/iOS) dan konfigurasi dasar ([capacitor.config.ts](file:///workspace/frontend/capacitor.config.ts)), namun project platform Android (Gradle) belum ada di repo. Dibutuhkan pekerjaan persiapan agar aplikasi dapat dibuild menjadi Android App Bundle (AAB) yang signed, memenuhi persyaratan Google Play (target SDK, privacy, data safety), dan siap diupload ke Play Console.

## What Changes
- Menyiapkan project Android Capacitor (generate folder `android/` via Capacitor) dan memastikan build menghasilkan **AAB**.
- Menetapkan identitas aplikasi Android yang stabil: `applicationId`, `versionName`, `versionCode`, `appName`.
- Menyiapkan ikon/splash screen sesuai ukuran Play Store, serta metadata listing (privacy policy, data safety, screenshots).
- Memastikan konfigurasi security & networking: HTTPS-only, domain backend production, CORS sesuai.
- Menyiapkan signing key (keystore) dan pipeline build release yang repeatable untuk upload.

## Impact
- Affected specs: Production Readiness, Security, Mobile Distribution.
- Affected code:
  - Frontend Capacitor config: [capacitor.config.ts](file:///workspace/frontend/capacitor.config.ts)
  - Frontend build & env: [package.json](file:///workspace/frontend/package.json)
  - Backend prod endpoints/CORS (untuk mobile): [DEPLOYMENT_GUIDE.md](file:///workspace/docs-dev/DEPLOYMENT_GUIDE.md)

## ADDED Requirements
### Requirement: Android Release Build (AAB)
Sistem SHALL dapat menghasilkan Android App Bundle (AAB) signed untuk release di Play Store.

#### Scenario: Success case
- **WHEN** developer menjalankan build release Android
- **THEN** build menghasilkan file `.aab` yang valid, signed, dan dapat di-upload ke Google Play Console tanpa error.

### Requirement: Play Store Compliance Pack
Sistem SHALL menyiapkan kelengkapan compliance Play Store (privacy policy, data safety, content rating, target audience).

#### Scenario: Success case
- **WHEN** developer mengisi form Play Console
- **THEN** seluruh field wajib dapat diisi berdasarkan artefak yang disiapkan dan tidak ada blocker policy.

## MODIFIED Requirements
### Requirement: API Base URL Production (Mobile)
Frontend mobile SHALL menggunakan base URL backend production (HTTPS) dan tidak pernah mengandalkan `localhost`.

#### Scenario: Success case
- **WHEN** aplikasi Android dijalankan di device
- **THEN** request API menuju domain production (mis. `https://api.toeflquiz.vastar.ai`) dan seluruh fitur utama (auth, quiz, backoffice) berjalan.

## REMOVED Requirements
### Requirement: Debuggable WebView di Production
**Reason**: Google Play review dan security baseline mengharuskan release build tidak membuka debugging WebView.
**Migration**: Sudah disiapkan di [capacitor.config.ts](file:///workspace/frontend/capacitor.config.ts#L7-L13) (`webContentsDebuggingEnabled: false`).
