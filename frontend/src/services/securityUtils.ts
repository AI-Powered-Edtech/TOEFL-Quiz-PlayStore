const ID_RE = /^[A-Za-z0-9_.-]{1,64}$/;
const USERNAME_RE = /^[A-Za-z0-9_-]{1,32}$/;

export function assertSafeId(value: string, label = 'id'): string {
  const v = String(value || '').trim();
  if (!ID_RE.test(v)) throw new Error(`Invalid ${label}`);
  return v;
}

export function assertSafeUsername(value: string, label = 'username'): string {
  const v = String(value || '').trim();
  if (!USERNAME_RE.test(v)) throw new Error(`Invalid ${label}`);
  return v;
}

export function sqlText(raw: unknown, max = 500): string {
  return String(raw ?? '')
    .replace(/[\r\n\t\u0000-\u001f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
    .replace(/'/g, "''");
}

export function sqlJson(raw: unknown, max = 5000): string {
  return sqlText(JSON.stringify(raw ?? {}), max);
}

export function safeInt(raw: unknown, fallback = 0, min = 0, max = 100000000): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

export function getActorId(fallback = 'admin-ui'): string {
  try {
    const raw = localStorage.getItem('access_token');
    const payload = raw?.split('.')[1] ? JSON.parse(atob(raw.split('.')[1])) : null;
    const id = payload?.sub || payload?.user_id || payload?.id;
    return id ? assertSafeId(String(id), 'actor_id') : fallback;
  } catch {
    return fallback;
  }
}
