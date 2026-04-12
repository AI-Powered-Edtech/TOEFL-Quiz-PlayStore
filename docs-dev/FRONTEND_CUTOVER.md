# Frontend Cutover Guide

## Langkah Migrasi Frontend (tupel-quis → new-toefl-quiz backend)

### 1. Update .env Frontend

```
# Hapus
VITE_SUPABASE_URL=xxx
VITE_SUPABASE_ANON_KEY=xxx
VITE_ADMIN_PASSCODE_HASH=xxx

# Tambah
VITE_API_URL=http://localhost:8082   # dev
# VITE_API_URL=https://api.toeflquiz.vastar.ai  # production
```

### 2. Buat API Wrapper (`src/services/api.ts`)

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

  const resp = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (resp.status === 401 && refreshToken) {
    // Auto-refresh
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
      return fetch(`${API_URL}${path}`, { ...options, headers });
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

### 3. Mapping Supabase → API Calls

| Supabase (lama) | API (baru) |
|-----------------|-----------|
| `supabase.auth.signInWithPassword()` | `POST /api/auth/login` |
| `supabase.auth.signUp()` | `POST /api/auth/register` |
| `supabase.auth.signOut()` | `clearTokens()` (client-side) |
| `supabase.auth.getSession()` | Token di localStorage |
| `supabase.auth.onAuthStateChange()` | Cek token expiry di wrapper |
| `supabase.from('profiles').select()` | `GET /api/auth/profile` |
| `supabase.from('profiles').update()` | `PATCH /api/auth/profile` |
| `supabase.from('question_bank').select()` | `GET /api/quiz/questions` |
| `supabase.from('quiz_results').insert()` | `POST /api/quiz/results` |
| `supabase.from('quiz_results').select()` | `GET /api/quiz/history` |
| `supabase.rpc('increment_xp')` | Otomatis di `POST /api/quiz/results` |
| `supabase.rpc('check_and_consume_rate_limit')` | Backend enforce otomatis |
| `supabase.functions.invoke('groq-proxy')` | `POST /api/ai/generate` |
| `supabase.from('writing_gym_progress')` | `GET/POST /api/writing/progress` |
| `supabase.from('peer_review_submissions')` | `POST /api/writing/peer-review/submissions` |
| `supabase.from('friends')` | `GET /api/social/friends` |
| `supabase.from('circles')` | `GET /api/social/circles/mine` |
| `supabase.channel('circle_messages')` | `GET /api/social/circles/:id/messages` (polling, atau WebSocket nanti) |
| `supabase.storage.from('avatars').upload()` | `POST /api/storage/avatars` |

### 4. Hapus Dependencies

```bash
npm uninstall @supabase/supabase-js @langchain/groq @google/genai
```

### 5. Hapus Files

```
rm -rf supabase/
rm src/services/supabase.ts
rm -rf src/services/groq/
```

### 6. Endpoint Lengkap (54+16 = 70 endpoints)

**Auth (5):** register, login, refresh, profile GET/PATCH
**Admin (5):** users, roles, verify-pin, audit-logs
**Quiz (5):** questions, simulation, results, history, progress
**AI (3):** generate, tts, token-usage
**Writing (13):** progress, sessions, exercise, evaluate, model-essays, vocabulary, devils-advocate, peer-review/*
**Social (13):** circles/*, friends/*, leaderboard, predictions, achievements, notifications
**Creator (8):** register, profile, bites, view, tip, payouts, stats
**Monitoring (2):** logs/batch, metrics/batch
**Storage (4):** avatars upload/serve, audio upload/serve
**Blog (4):** posts list/get, admin posts create/delete
**Admin Monitoring (6):** health, errors, feature-flags, moderation/reports

**VIL Built-in:** /health, /ready, /metrics, /info, /_vil/dashboard/
