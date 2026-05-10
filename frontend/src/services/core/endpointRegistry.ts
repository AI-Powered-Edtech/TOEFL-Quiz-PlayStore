export type EndpointOwner = 'rust-8082' | 'vwfd-8083' | 'external' | 'static' | 'dev-only';
export type EndpointMaturity = 'canonical-server-backed' | 'offline-cache-only' | 'dev-only' | 'legacy-adapter' | 'deprecated-remove' | 'static-content' | 'test-only';

export interface EndpointContract {
  id: string;
  owner: EndpointOwner;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'HEAD';
  path: string;
  maturity: EndpointMaturity;
  notes?: string;
}

const env = (import.meta as any).env || {};

export const API_BASE_URL = env.VITE_API_URL || '';
export const VWFD_BASE_URL = env.VITE_VWFD_URL || API_BASE_URL || '';
export const TTS_BASE_URL = env.VITE_TTS_URL || '';

export const endpointContracts: EndpointContract[] = [
  { id: 'auth.profile', owner: 'rust-8082', method: 'GET', path: '/api/auth/profile', maturity: 'canonical-server-backed' },
  { id: 'auth.login', owner: 'rust-8082', method: 'POST', path: '/api/auth/login', maturity: 'canonical-server-backed' },
  { id: 'auth.register', owner: 'rust-8082', method: 'POST', path: '/api/auth/register', maturity: 'canonical-server-backed' },
  { id: 'auth.oauth.init', owner: 'rust-8082', method: 'POST', path: '/api/auth/oauth/init', maturity: 'canonical-server-backed' },
  { id: 'auth.oauth.callback', owner: 'rust-8082', method: 'POST', path: '/api/auth/oauth/callback', maturity: 'canonical-server-backed' },
  { id: 'quiz.results', owner: 'rust-8082', method: 'POST', path: '/api/quiz/results', maturity: 'canonical-server-backed' },
  { id: 'quiz.progress', owner: 'rust-8082', method: 'GET', path: '/api/quiz/progress', maturity: 'canonical-server-backed' },
  { id: 'writing.sessions', owner: 'rust-8082', method: 'GET', path: '/api/writing/sessions', maturity: 'canonical-server-backed' },
  { id: 'storage.avatars', owner: 'rust-8082', method: 'POST', path: '/api/storage/avatars', maturity: 'canonical-server-backed' },
  { id: 'storage.audio', owner: 'rust-8082', method: 'POST', path: '/api/storage/audio', maturity: 'canonical-server-backed' },
  { id: 'vwfd.health', owner: 'vwfd-8083', method: 'GET', path: '/api/v2/health', maturity: 'canonical-server-backed' },
  { id: 'vwfd.audit.log', owner: 'vwfd-8083', method: 'POST', path: '/api/v2/admin/audit/log', maturity: 'legacy-adapter', notes: 'Admin utility/audit append, not auth core.' },
  { id: 'vwfd.media.register', owner: 'vwfd-8083', method: 'POST', path: '/api/v2/media/assets/register', maturity: 'legacy-adapter', notes: 'Registry only until real storage is canonical.' },
  { id: 'dev.kitten-tts', owner: 'dev-only', method: 'POST', path: '/generate', maturity: 'dev-only', notes: 'Only enabled when VITE_TTS_URL is set or local dev flag is active.' },
];

export function resolveBaseUrl(owner: EndpointOwner): string {
  if (owner === 'vwfd-8083') return VWFD_BASE_URL;
  if (owner === 'rust-8082') return API_BASE_URL;
  if (owner === 'dev-only') return TTS_BASE_URL;
  return '';
}

export function findEndpointContract(method: string, path: string): EndpointContract | undefined {
  return endpointContracts.find((e) => e.method === method.toUpperCase() && e.path === path);
}
