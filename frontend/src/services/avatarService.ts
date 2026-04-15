import { secureStorage } from '../utils/secureStorage';

const API_BASE = import.meta.env.VITE_API_URL || '';

export const uploadAvatar = async (
  _userId: string,
  file: File
): Promise<{ url: string; error?: string } | null> => {
  try {
    const token = secureStorage.getItem('access_token');
    const url = `${API_BASE}/api/storage/avatars`;
    const bytes = await file.arrayBuffer();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: bytes,
    });

    if (!response.ok) {
      let detail = '';
      try {
        const data = await response.json();
        detail = data?.error || data?.message || '';
      } catch {
      }
      return { url: '', error: detail || `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { url: data.url || '', error: data.ok ? undefined : 'Upload failed' };
  } catch (e) {
    return { url: '', error: e instanceof Error ? e.message : 'Upload failed' };
  }
};

