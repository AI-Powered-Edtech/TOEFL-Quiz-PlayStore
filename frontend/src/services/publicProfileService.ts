import { apiV2 } from './apiV2';

export interface PublicProfile {
    id: number | string;
    username: string;
    avatar_url: string | null;
    total_xp: number;
    current_streak: number;
    is_public: number;
}

interface PublicProfileResponse {
    profile: PublicProfile[];
    found: number;
    queried_at: string;
}

const USERNAME_RE = /^[a-zA-Z0-9_-]{1,32}$/;

export class PublicProfileLookupError extends Error {}

/**
 * Validates the username against a strict allow-list before hitting the
 * /api/v2/social/profile/public endpoint. The backend YAML uses vil-expr
 * string concat to build SQL, so this client-side regex is the primary
 * SQL-injection guard.
 */
export async function lookupPublicProfile(username: string): Promise<PublicProfile | null> {
    const trimmed = (username || '').trim();
    if (!USERNAME_RE.test(trimmed)) {
        throw new PublicProfileLookupError(`Invalid username format: "${trimmed}"`);
    }
    const res = await apiV2.post<PublicProfileResponse>('/api/v2/social/profile/public', { username: trimmed });
    if (!res || !Array.isArray(res.profile) || res.profile.length === 0) return null;
    return res.profile[0];
}

export function sanitizeUsernameOrNull(raw: string | null | undefined): string | null {
    if (!raw) return null;
    const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);
    return cleaned.length > 0 ? cleaned : null;
}
