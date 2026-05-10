import { registerMediaAsset } from './mediaRegistryService';
import { API_BASE_URL } from './core/endpointRegistry';
import { httpRequest } from './core/httpClient';
import { TIMEOUTS } from './core/retryPolicy';
const MAX_AVATAR_BYTES = 750_000;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Read failed'));
    reader.readAsDataURL(file);
  });
}

export const uploadAvatar = async (_userId: string, file: File): Promise<{ url: string; error?: string } | null> => {
  try {
    if (!file.type.startsWith('image/')) return { url: '', error: 'Avatar must be an image.' };
    if (file.size > MAX_AVATAR_BYTES) return { url: '', error: 'Avatar max 750 KB untuk menjaga performa mobile.' };

    const bytes = await file.arrayBuffer();

    try {
      const data = await httpRequest<{ ok?: boolean; url?: string }>({
        baseUrl: API_BASE_URL,
        path: '/api/storage/avatars',
        method: 'POST',
        body: bytes,
        timeoutMs: TIMEOUTS.upload,
        responseType: 'json',
        retry: false,
      });
      if (data?.url) return { url: data.url, error: data.ok === false ? 'Upload failed' : undefined };
    } catch { /* storage endpoint may not exist; use safe local fallback */ }

    const dataUrl = await fileToDataUrl(file);
    await registerMediaAsset({ owner_id: _userId || 'guest', asset_type: 'avatar', url: dataUrl, label: file.name, mime_type: file.type });
    return { url: dataUrl, error: 'Storage endpoint belum aktif; avatar disimpan sebagai data URL dan diregister ke v2 registry.' };
  } catch (e) {
    return { url: '', error: e instanceof Error ? e.message : 'Upload failed' };
  }
};
