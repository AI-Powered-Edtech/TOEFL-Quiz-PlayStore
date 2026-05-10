import { apiV2 } from './apiV2';
import { assertSafeId, safeInt, sqlText } from './securityUtils';

export type MediaAssetType = 'avatar' | 'audio';
export interface MediaAsset { id: string; owner_id: string; asset_type: MediaAssetType; url: string; label: string | null; mime_type: string | null; created_at: string; }

const URL_RE = /^(https?:\/\/|data:image\/|data:audio\/|file:\/\/)/;

export async function registerMediaAsset(input: { owner_id: string; asset_type: MediaAssetType; url: string; label?: string; mime_type?: string }): Promise<boolean> {
  const url = String(input.url || '').trim().slice(0, 2000);
  if (!URL_RE.test(url)) throw new Error('Invalid media URL. Binary upload still needs storage endpoint; use an https/data/file URL for now.');
  const res = await apiV2.post<{ ok: boolean; rows_affected: number }>('/api/v2/media/assets/register', {
    owner_id: assertSafeId(input.owner_id, 'owner_id'),
    asset_type: input.asset_type,
    url: sqlText(url, 2000),
    label: sqlText(input.label || '', 120),
    mime_type: sqlText(input.mime_type || '', 80),
  });
  return !!res.ok;
}

export async function listMediaAssets(owner_id: string, asset_type: MediaAssetType): Promise<MediaAsset[]> {
  const res = await apiV2.post<{ assets: MediaAsset[]; count: number }>('/api/v2/media/assets/list', { owner_id: assertSafeId(owner_id, 'owner_id'), asset_type });
  return Array.isArray(res.assets) ? res.assets : [];
}
