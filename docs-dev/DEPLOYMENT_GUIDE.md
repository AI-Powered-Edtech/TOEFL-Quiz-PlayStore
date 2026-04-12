# Deployment Guide — TOEFL Quiz VIL Backend

**Untuk:** Ibrohim (developer)
**Disiapkan oleh:** Abraham (infra)
**Tanggal:** 3 April 2026

> Dokumen ini berisi langkah lengkap untuk deploy backend ke production.
> Ikuti urutan dari atas ke bawah. Centang setiap langkah yang sudah selesai.

---

## DAFTAR ISI

1. [Infisical: Setup Secrets](#1-infisical-setup-secrets)
2. [Proxmox: Buat LXC](#2-proxmox-buat-lxc)
3. [LXC: Setup Server](#3-lxc-setup-server)
4. [Build & Deploy Binary](#4-build--deploy-binary)
5. [Systemd Service](#5-systemd-service)
6. [Nginx Proxy Manager](#6-nginx-proxy-manager)
7. [Verify Production](#7-verify-production)
8. [Frontend Migration](#8-frontend-migration)
9. [Supabase Shutdown](#9-supabase-shutdown)

---

## 1. INFISICAL: SETUP SECRETS

### 1.1 Buka Infisical

- URL: **http://10.10.0.11:8080**
- Login dengan akun admin (tanya Abraham kalau belum punya)

### 1.2 Buat Project Baru

1. Klik **+ New Project**
2. Nama: `toefl-quiz`
3. Environment: buat 2 → `development` dan `production`

### 1.3 Isi Secrets (Environment: `production`)

Masukkan semua secrets di bawah. **Value yang bertanda ⚠️ harus diganti dengan value asli.**

#### Core (WAJIB — server tidak jalan tanpa ini)

| Key | Value | Catatan |
|-----|-------|---------|
| `DATABASE_URL` | `sqlite:/opt/toefl-quiz/data.db` | Path di LXC |
| `PORT` | `8082` | Port server |
| `JWT_SECRET` | ⚠️ *generate: `openssl rand -hex 32`* | Minimal 32 karakter random |
| `JWT_EXPIRY_SECS` | `900` | Access token = 15 menit |
| `JWT_REFRESH_EXPIRY_SECS` | `604800` | Refresh token = 7 hari |
| `GROQ_API_KEY` | ⚠️ *dari https://console.groq.com/keys* | Prefix `gsk_` |
| `GROQ_API_URL` | `https://api.groq.com/openai/v1/chat/completions` | Jangan diubah |

#### Auth & Admin

| Key | Value | Catatan |
|-----|-------|---------|
| `ADMIN_PASSCODE_HASH` | ⚠️ *generate pakai script di bawah* | Argon2id hash dari PIN admin |
| `GOOGLE_OAUTH_CLIENT_ID` | ⚠️ *dari Google Cloud Console* | Format: `xxxxx.apps.googleusercontent.com` |
| `GOOGLE_OAUTH_CLIENT_SECRET` | ⚠️ *dari Google Cloud Console* | Format: `GOCSPX-xxxxx` |

**Cara generate ADMIN_PASSCODE_HASH:**
```bash
# Jalankan di mesin development (perlu cargo)
cd new-toefl-quiz
cargo run --example hash_pin 2>/dev/null || \
  python3 -c "
import subprocess, json
# Atau generate manual:
# 1. Jalankan server
# 2. Register admin user
# 3. Hash PIN via endpoint
print('Set PIN via admin panel setelah deploy')
"
```

Atau generate setelah deploy — PIN bisa di-set via admin panel.

#### Push Notifications (FCM)

| Key | Value | Catatan |
|-----|-------|---------|
| `FCM_PROJECT_ID` | ⚠️ *dari Firebase Console → Project Settings* | Nama project Firebase |
| `FCM_SERVICE_ACCOUNT_KEY` | ⚠️ *dari Firebase Console → Service Accounts → Generate New Key* | **Paste seluruh JSON** (1 baris) |

> Kalau belum setup Firebase, skip dulu. Push notification tetap bisa diaktifkan nanti.

#### Alerting & Webhooks

| Key | Value | Catatan |
|-----|-------|---------|
| `SLACK_WEBHOOK_URL` | ⚠️ *dari Slack → Apps → Incoming Webhooks* | Untuk alert error/downtime |
| `DISCORD_WEBHOOK_URL` | ⚠️ *dari Discord → Server Settings → Integrations → Webhooks* | Untuk monitor-alerts |

> Kalau belum setup Slack/Discord, skip. Alert akan log ke stdout saja.

#### Payment — Creator Economy

| Key | Value | Catatan |
|-----|-------|---------|
| `MIDTRANS_SERVER_KEY` | ⚠️ *dari Midtrans Dashboard → Settings → Access Keys* | Sandbox: prefix `SB-Mid-server-` |
| `MIDTRANS_CLIENT_KEY` | ⚠️ *dari Midtrans Dashboard* | Sandbox: prefix `SB-Mid-client-` |
| `GOOGLE_PLAY_SERVICE_ACCOUNT` | ⚠️ *dari Google Play Console → API Access* | **Paste seluruh JSON** (untuk verify in-app purchase) |

> Creator economy belum aktif di production. Setup payment nanti saat fitur diaktifkan.

#### Monitoring & Server

| Key | Value | Catatan |
|-----|-------|---------|
| `SENTRY_DSN` | ⚠️ *dari Sentry → Project Settings → Client Keys* | Optional |
| `ALLOWED_ORIGINS` | `https://toeflquiz.vastar.ai,http://localhost:3000` | CORS whitelist, pisah koma |

### 1.4 Buat Machine Identity

1. Di Infisical, buka **Settings → Machine Identities**
2. Klik **+ Create Identity**
3. Nama: `toefl-quiz-backend`
4. Auth Method: **Universal Auth**
5. Role: **Viewer** (read-only cukup)
6. Scope: project `toefl-quiz`, environment `production`
7. **Catat** `Client ID` dan `Client Secret` — dibutuhkan di `.env` LXC

### 1.5 Isi Secrets (Environment: `development`)

Copy semua dari `production`, tapi ganti:

| Key | Value Development |
|-----|------------------|
| `DATABASE_URL` | `sqlite:data.db` |
| `PORT` | `8082` |
| `JWT_SECRET` | `dev-secret-change-me` |
| `GROQ_API_KEY` | ⚠️ *sama dengan production, atau buat key terpisah* |

---

## 2. PROXMOX: BUAT LXC

### 2.1 Spesifikasi LXC (Rekomendasi)

| Resource | Minimum | Rekomendasi | Catatan |
|----------|---------|-------------|---------|
| **CPU** | 1 core | **2 cores** | VIL server + SQLite + background tasks |
| **RAM** | 512 MB | **1 GB** | VIL SHM heap 64MB + SQLite cache + reqwest |
| **Disk** | 4 GB | **8 GB SSD** | Binary ~15MB + SQLite DB + uploads + logs |
| **Network** | vmbr2 | vmbr2 | **BUKAN vmbr0** |

> Untuk awal 2 core + 1GB RAM + 8GB SSD sudah lebih dari cukup.
> VIL binary RSS ~20-50MB. SQLite ringan. Bisa scale up nanti kalau user banyak.

### 2.2 Buat di Proxmox

1. Login Proxmox: **https://10.10.0.2:8006**
2. Klik **Create CT** (Container)
3. Settings:

| Field | Value |
|-------|-------|
| CT ID | (auto) |
| Hostname | `toefl-quiz` |
| Password | ⚠️ *set password root* |
| SSH Key | (kosong) |
| Template | `ubuntu-22.04-standard` |
| Disk | **8 GB** |
| CPU | **2 cores** |
| Memory | **1024 MB** (1 GB) |
| Swap | **512 MB** |
| Network: Bridge | **vmbr2** |
| Network: IPv4 | **10.10.0.14/24** |
| Network: Gateway | **10.10.0.1** |
| Firewall | **☐ uncheck** |
| Nesting | **☐ uncheck** (bukan Docker) |

4. Klik **Create** → **Start**

### 2.3 Verifikasi Network

```bash
# Dari Proxmox host atau pfSense
ping 10.10.0.14

# Dari LXC
pct enter <CT-ID>
ping 10.10.0.1     # gateway
ping 10.10.0.11    # infisical
ping 10.10.0.7     # onedev
```

---

## 3. LXC: SETUP SERVER

Login ke LXC:
```bash
ssh root@10.10.0.14
# Atau dari Proxmox: pct enter <CT-ID>
```

### 3.1 Update & Install Dependencies

```bash
apt update && apt upgrade -y
apt install -y curl ca-certificates
```

### 3.2 Setup Directory

```bash
# Buat user
useradd -r -s /bin/false toeflquiz

# Buat directory
mkdir -p /opt/toefl-quiz/uploads/avatars
mkdir -p /opt/toefl-quiz/uploads/audio
chown -R toeflquiz:toeflquiz /opt/toefl-quiz
```

### 3.3 Setup Hosts (untuk git.vastar.ai)

```bash
echo "10.10.0.7 git.vastar.ai" >> /etc/hosts
```

### 3.4 Setup .env (Infisical Bootstrap)

```bash
cat > /opt/toefl-quiz/.env << 'EOF'
# Infisical Machine Identity (dari langkah 1.4)
INFISICAL_CLIENT_ID=⚠️ ISI_DARI_INFISICAL
INFISICAL_CLIENT_SECRET=⚠️ ISI_DARI_INFISICAL
INFISICAL_PROJECT_ID=⚠️ ISI_DARI_INFISICAL
INFISICAL_ENVIRONMENT=production
INFISICAL_HOST=http://10.10.0.11:8080

# Override (sampai Infisical SDK diintegrasikan)
DATABASE_URL=sqlite:/opt/toefl-quiz/data.db
PORT=8082
JWT_SECRET=⚠️ ISI_DARI_INFISICAL
GROQ_API_KEY=⚠️ ISI_DARI_INFISICAL
GROQ_API_URL=https://api.groq.com/openai/v1/chat/completions
ADMIN_PASSCODE_HASH=
GOOGLE_OAUTH_CLIENT_ID=⚠️ ISI_DARI_INFISICAL
ALLOWED_ORIGINS=https://toeflquiz.vastar.ai,http://localhost:3000
EOF

chown toeflquiz:toeflquiz /opt/toefl-quiz/.env
chmod 600 /opt/toefl-quiz/.env
```

> **Penting:** Ganti semua ⚠️ dengan value dari Infisical.
> Setelah Infisical SDK diintegrasikan, `.env` cukup berisi INFISICAL_* saja.

---

## 4. BUILD & DEPLOY BINARY

### 4.1 Build di Mesin Development

```bash
cd ~/Aplikasi-Ibrohim/new-toefl-quiz

# Build release (optimized)
cargo build --release

# Cek binary size
ls -lh target/release/toefl-quiz-backend
# Expected: ~15-20 MB
```

### 4.2 Copy ke LXC

```bash
scp target/release/toefl-quiz-backend root@10.10.0.14:/opt/toefl-quiz/
ssh root@10.10.0.14 "chown toeflquiz:toeflquiz /opt/toefl-quiz/toefl-quiz-backend && chmod +x /opt/toefl-quiz/toefl-quiz-backend"
```

### 4.3 Test Manual

```bash
ssh root@10.10.0.14
su -s /bin/bash toeflquiz -c "cd /opt/toefl-quiz && ./toefl-quiz-backend"

# Di terminal lain:
curl http://10.10.0.14:8082/health
# → {"service":"vil-server","status":"healthy"}

curl -X POST http://10.10.0.14:8082/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"adminpass123","full_name":"Admin"}'
# → {"ok":true,"access_token":"...","profile":{...}}

# Ctrl+C untuk stop
```

---

## 5. SYSTEMD SERVICE

### 5.1 Buat Service File

```bash
cat > /etc/systemd/system/toefl-quiz.service << 'EOF'
[Unit]
Description=TOEFL Quiz VIL Backend
After=network.target

[Service]
Type=simple
User=toeflquiz
WorkingDirectory=/opt/toefl-quiz
ExecStart=/opt/toefl-quiz/toefl-quiz-backend
Restart=always
RestartSec=5
EnvironmentFile=/opt/toefl-quiz/.env
LimitNOFILE=65535

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/opt/toefl-quiz

[Install]
WantedBy=multi-user.target
EOF
```

### 5.2 Enable & Start

```bash
systemctl daemon-reload
systemctl enable toefl-quiz
systemctl start toefl-quiz
systemctl status toefl-quiz
```

### 5.3 Cek Logs

```bash
journalctl -u toefl-quiz -f
# Harus muncul: "VX — Process-Oriented Server (Tri-Lane)"
# Port: 8082, Services: 11, Endpoints: 68
```

### 5.4 Verify

```bash
curl http://localhost:8082/health
curl http://localhost:8082/info
curl http://localhost:8082/metrics | head -5
```

---

## 6. NGINX PROXY MANAGER

### 6.1 Public API

| Field | Value |
|-------|-------|
| Domain | `api.toeflquiz.vastar.ai` |
| Scheme | `http` |
| Forward Hostname | `10.10.0.14` |
| Forward Port | `8082` |
| SSL | **Let's Encrypt** |
| Force SSL | **✅ Yes** |
| HSTS | **✅ Yes** |

### 6.2 Observer Dashboard (Internal Only)

| Field | Value |
|-------|-------|
| Domain | `obs.toeflquiz.vastar.ai` |
| Scheme | `http` |
| Forward Hostname | `10.10.0.14` |
| Forward Port | `8082` |
| Location | `/_vil/dashboard/` |
| SSL | **Let's Encrypt** |
| Access | **pfSense rule → VPN only** |

### 6.3 pfSense DNS

Tambahkan di pfSense DNS Resolver (atau /etc/hosts di client):
```
10.10.0.14  api.toeflquiz.vastar.ai
10.10.0.14  obs.toeflquiz.vastar.ai
```

---

## 7. VERIFY PRODUCTION

Jalankan semua test ini dari mesin development (via VPN):

```bash
BASE="https://api.toeflquiz.vastar.ai"

# 1. Health
curl -s $BASE/health
# → {"service":"vil-server","status":"healthy"}

# 2. Register
curl -s -X POST $BASE/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"ibrohim","password":"securepass123","full_name":"Ibrohim"}'

# 3. Login
TOKEN=$(curl -s -X POST $BASE/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"ibrohim","password":"securepass123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# 4. Profile
curl -s $BASE/api/auth/profile -H "Authorization: Bearer $TOKEN"

# 5. Quiz
curl -s -X POST $BASE/api/quiz/results \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"section":"structure","score":80,"correct_count":8,"total_questions":10}'

# 6. Progress
curl -s $BASE/api/quiz/progress -H "Authorization: Bearer $TOKEN"

# 7. AI Token Usage
curl -s $BASE/api/ai/token-usage -H "Authorization: Bearer $TOKEN"
# → {"used":0,"limit":15,"remaining":15,"tier":"free"}

# 8. Observer Dashboard
open "https://obs.toeflquiz.vastar.ai/_vil/dashboard/"
```

---

## 8. FRONTEND MIGRATION

### 8.1 Update Frontend .env

File: `tupel-quis/.env`

```bash
# HAPUS (tidak dipakai lagi):
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_ANON_KEY=...
# VITE_ADMIN_PASSCODE_HASH=...

# TAMBAH:
VITE_API_URL=https://api.toeflquiz.vastar.ai
# Dev: VITE_API_URL=http://localhost:8082
```

### 8.2 Buat API Wrapper

Buat file baru: `tupel-quis/src/services/api.ts`

```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8082';

let accessToken: string | null = localStorage.getItem('access_token');
let refreshToken: string | null = localStorage.getItem('refresh_token');

export async function api(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let resp = await fetch(`${API_URL}${path}`, { ...options, headers });

  // Auto-refresh on 401
  if (resp.status === 401 && refreshToken) {
    const refreshResp = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (refreshResp.ok) {
      const data = await refreshResp.json();
      accessToken = data.access_token;
      localStorage.setItem('access_token', accessToken!);
      headers['Authorization'] = `Bearer ${accessToken}`;
      resp = await fetch(`${API_URL}${path}`, { ...options, headers });
    } else {
      clearTokens();
      window.location.href = '/login';
    }
  }

  return resp;
}

export function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}
```

### 8.3 Migrasi Per Service (Checklist)

Ganti setiap Supabase call ke API call. Kerjakan satu per satu, test setelah setiap perubahan.

#### Auth (`src/services/supabase.ts` → `api.ts`)

- [ ] `supabase.auth.signUp()` → `api('/api/auth/register', { method: 'POST', body: JSON.stringify({username, password, full_name}) })`
- [ ] `supabase.auth.signInWithPassword()` → `api('/api/auth/login', { method: 'POST', body: JSON.stringify({username, password}) })` → panggil `setTokens(data.access_token, data.refresh_token)`
- [ ] `supabase.auth.signOut()` → `clearTokens()`
- [ ] `supabase.auth.getSession()` → cek `localStorage.getItem('access_token')` ada atau tidak
- [ ] `supabase.auth.onAuthStateChange()` → tidak perlu, wrapper `api()` handle auto-refresh
- [ ] `supabase.from('profiles').select()` → `api('/api/auth/profile')`
- [ ] `supabase.from('profiles').update()` → `api('/api/auth/profile', { method: 'PATCH', body: JSON.stringify({...}) })`

#### Quiz (`src/services/questionBankService.ts`, `historyService.ts`)

- [ ] `supabase.from('question_bank').select()` → `api('/api/quiz/questions?section=...&skill_id=...')`
- [ ] `supabase.from('quiz_results').insert()` → `api('/api/quiz/results', { method: 'POST', body: JSON.stringify({...}) })`
- [ ] `supabase.from('quiz_results').select()` → `api('/api/quiz/history')`
- [ ] `calculateUserProgress()` → `api('/api/quiz/progress')`
- [ ] `supabase.rpc('increment_xp')` → **HAPUS** (otomatis di `/api/quiz/results`)

#### AI (`src/services/groq/client.ts`, `subscriptionService.ts`)

- [ ] `supabase.functions.invoke('groq-proxy')` → `api('/api/ai/generate', { method: 'POST', body: JSON.stringify({messages, model}) })`
- [ ] `getTokenUsage()` → `api('/api/ai/token-usage')`
- [ ] Client-side token budget check → **HAPUS** (backend enforce)
- [ ] Hapus `src/services/groq/` directory
- [ ] Hapus `@langchain/groq`, `@google/genai` dari `package.json`

#### Writing (`src/services/writingGymService.ts`, `essayEvaluationService.ts`)

- [ ] `supabase.from('writing_gym_progress')` → `api('/api/writing/progress')`
- [ ] `supabase.rpc('pop_exercise_from_pool')` → `api('/api/writing/exercise', { method: 'POST', body: JSON.stringify({level, skill_id}) })`
- [ ] Essay evaluation → `api('/api/writing/evaluate', { method: 'POST', body: JSON.stringify({essay, task_type, prompt}) })`
- [ ] `supabase.from('peer_review_submissions').insert()` → `api('/api/writing/peer-review/submissions', { method: 'POST', body: ... })`
- [ ] `supabase.from('peer_reviews').insert()` → `api('/api/writing/peer-review/reviews', { method: 'POST', body: ... })`

#### Social (`src/services/circleService.ts`, `friendService.ts`, `leaderboardService.ts`)

- [ ] `supabase.from('circles').insert()` → `api('/api/social/circles', { method: 'POST', body: ... })`
- [ ] `supabase.from('circle_messages')` → `api('/api/social/circles/{id}/messages')`
- [ ] `supabase.channel('circle_messages')` → polling `api('/api/social/circles/{id}/messages')` setiap 5 detik (WebSocket nanti)
- [ ] `supabase.from('friends')` → `api('/api/social/friends')`
- [ ] Leaderboard → `api('/api/social/leaderboard')`

#### Lainnya

- [ ] `supabase.storage.from('avatars').upload()` → `api('/api/storage/avatars', { method: 'POST', body: fileBlob, headers: {'Content-Type': 'application/octet-stream'} })`
- [ ] `supabase.from('app_logs').insert()` → `api('/api/monitoring/logs/batch', { method: 'POST', body: JSON.stringify([...]) })`

### 8.4 Hapus Supabase

Setelah SEMUA service sudah dimigrasi dan ditest:

```bash
cd tupel-quis

# Hapus dependencies
npm uninstall @supabase/supabase-js @langchain/groq @google/genai

# Hapus files
rm -rf supabase/
rm src/services/supabase.ts
rm -rf src/services/groq/

# Hapus env vars lama
# Edit .env, hapus VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY
```

### 8.5 Test Frontend

```bash
npm run dev
# Buka http://localhost:3000
# Test: register → login → quiz → progress → leaderboard
```

---

## 9. SUPABASE SHUTDOWN

**JANGAN shutdown Supabase sebelum semua frontend call sudah dimigrasi dan ditest.**

Checklist sebelum shutdown:

- [ ] Semua endpoint frontend sudah pakai `/api/*` (bukan Supabase)
- [ ] Data dari Supabase PostgreSQL sudah di-export (jika ada data production)
- [ ] E2E test pass di production
- [ ] User bisa register, login, quiz, leaderboard di production
- [ ] Admin panel berfungsi

Setelah yakin:
1. Supabase Dashboard → Project Settings → **Pause Project** (bisa di-resume)
2. Tunggu 1 minggu, kalau tidak ada issue → **Delete Project**

---

## TROUBLESHOOTING

### Server tidak start

```bash
journalctl -u toefl-quiz -n 50
# Cek: database path benar? .env lengkap? permission?
```

### Database error

```bash
# Cek file DB
ls -la /opt/toefl-quiz/data.db
# Harus owned by toeflquiz

# Cek integrity
sqlite3 /opt/toefl-quiz/data.db "PRAGMA integrity_check;"
```

### 502 Bad Gateway (Nginx)

```bash
# Cek server jalan
curl http://10.10.0.14:8082/health

# Cek systemd
systemctl status toefl-quiz
```

### Redeploy (update binary)

```bash
# Di mesin development
cargo build --release
scp target/release/toefl-quiz-backend root@10.10.0.14:/opt/toefl-quiz/
ssh root@10.10.0.14 "systemctl restart toefl-quiz"
```

---

## RINGKASAN TIMELINE

| Langkah | Waktu | Siapa |
|---------|-------|-------|
| 1. Infisical secrets | 30 menit | Ibrohim |
| 2. LXC creation | 10 menit | Abraham (atau Ibrohim via Proxmox) |
| 3. LXC setup | 15 menit | Ibrohim |
| 4. Build & deploy | 10 menit | Ibrohim |
| 5. Systemd + verify | 10 menit | Ibrohim |
| 6. Nginx | 10 menit | Abraham |
| 7. Verify production | 15 menit | Ibrohim |
| 8. Frontend migration | 2-3 hari | Ibrohim |
| 9. Supabase shutdown | 5 menit | Ibrohim (setelah 1 minggu) |

**Total setup (tanpa frontend migration): ~1.5 jam**
