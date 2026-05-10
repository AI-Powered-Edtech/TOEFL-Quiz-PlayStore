export type OfflinePolicy = 'fail-fast' | 'allow-cache' | 'queue-draft' | 'network-probe';

export function isProbablyOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

export function assertOnline(policy: OfflinePolicy = 'fail-fast'): void {
  if (policy === 'network-probe' || policy === 'allow-cache' || policy === 'queue-draft') return;
  if (isProbablyOffline()) {
    throw new DOMException('Device is offline', 'NetworkError');
  }
}
