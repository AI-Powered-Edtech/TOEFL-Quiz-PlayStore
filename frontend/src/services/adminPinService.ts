const DEFAULT_DEV_PIN = '2468';
const SESSION_KEY = 'toefl_admin_pin_ok_until';

export function isAdminPinVerified(): boolean {
  const until = Number(sessionStorage.getItem(SESSION_KEY) || '0');
  return Number.isFinite(until) && Date.now() < until;
}

export function verifyAdminPin(pin: string): boolean {
  const expected = String((import.meta as any).env?.VITE_ADMIN_PIN || DEFAULT_DEV_PIN);
  const ok = String(pin || '') === expected;
  if (ok) sessionStorage.setItem(SESSION_KEY, String(Date.now() + 10 * 60 * 1000));
  return ok;
}

export async function requireAdminPin(reason = 'aksi admin destruktif'): Promise<boolean> {
  if (isAdminPinVerified()) return true;
  const pin = window.prompt(`Masukkan Admin PIN untuk ${reason}.`);
  return verifyAdminPin(pin || '');
}

export function clearAdminPin(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
