/**
 * @deprecated Use socialService from './social.ts' instead.
 */
import { validateFriendCode } from '../utils/inputValidation';
import { generateFriendCode } from '../utils/secureCodeGenerator';

import { socialRateLimiter, RateLimitError } from './socialRateLimiter';
import { apiClient } from './apiClient';

export interface Friend {
    id: string;
    friendId: string;
    name: string;
    avatarUrl?: string;
    friendCode?: string;
    totalXp: number;
    addedAt: string;
}

export class FriendError extends Error {
    constructor(
        message: string,
        public code: FriendErrorCode,
        public details?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'FriendError';
    }
}

export type FriendErrorCode =
    | 'UNAUTHORIZED'
    | 'INVALID_CODE'
    | 'CODE_NOT_FOUND'
    | 'ALREADY_FRIENDS'
    | 'SELF_ADD'
    | 'RATE_LIMITED'
    | 'DATABASE_ERROR';

function generateCode(): string {
    return generateFriendCode();
}

const FRIENDS_KEY_PREFIX = 'friends_';

const getFriendsKey = (userId: string): string => `${FRIENDS_KEY_PREFIX}${userId}`;

const getLocalFriends = (userId: string): Friend[] => {
    try {
        const stored = localStorage.getItem(getFriendsKey(userId));
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

const saveLocalFriends = (userId: string, friends: Friend[]): void => {
    localStorage.setItem(getFriendsKey(userId), JSON.stringify(friends));
};

export const friendService = {

    async getOrCreateFriendCode(userId: string): Promise<string | null> {
        try {
            const response = await apiClient.get<{ friend_code: string | null }>(`/api/profile/${userId}`);
            
            if (response.data?.friend_code) {
                return response.data.friend_code;
            }

            const code = generateCode();
            const updateResponse = await apiClient.patch(`/api/profile/${userId}`, {
                friend_code: code
            });

            if (updateResponse.error) {
                console.error('[FriendService] Failed to save code:', updateResponse.error);
                return null;
            }

            return code;
        } catch (err) {
            console.error('[FriendService] Error getting/creating friend code:', err);
            return null;
        }
    },

    async addFriendByCode(code: string): Promise<{ success: boolean; error?: string }> {
        try {
            const authResponse = await apiClient.get<{ user: { id: string } | null }>('/api/auth/profile');
            const myId = authResponse.data?.user?.id;

            if (!myId) {
                return { success: false, error: 'You must be signed in.' };
            }

            try {
                await socialRateLimiter.enforce('friendRequest', myId);
            } catch (error) {
                if (error instanceof RateLimitError) {
                    const retrySeconds = error.info.retryAfter || 60;
                    return {
                        success: false,
                        error: `Too many friend requests. Please wait ${Math.ceil(retrySeconds / 60)} minutes.`
                    };
                }
                throw error;
            }

            const normalizedCode = code.toUpperCase().trim();
            const validation = validateFriendCode(normalizedCode);

            if (!validation.valid) {
                return { success: false, error: validation.error || 'Invalid friend code format.' };
            }

            const profileResponse = await apiClient.get<{ id: string; full_name: string }>(`/api/profile/code/${normalizedCode}`);

            if (profileResponse.error || !profileResponse.data) {
                return { success: false, error: 'Friend code not found. Please check and try again.' };
            }

            const target = profileResponse.data;

            if (myId === target.id) {
                return { success: false, error: "You can't add yourself!" };
            }

            const friends = getLocalFriends(myId);
            const alreadyFriends = friends.some(f => f.friendId === target.id);

            if (alreadyFriends) {
                return { success: false, error: `${target.full_name || 'This user'} is already your friend!` };
            }

            const newFriend: Friend = {
                id: crypto.randomUUID(),
                friendId: target.id,
                name: target.full_name || 'Anonymous',
                totalXp: 0,
                addedAt: new Date().toISOString()
            };

            friends.push(newFriend);
            saveLocalFriends(myId, friends);

            return { success: true };
        } catch (err) {
            console.error('[FriendService] Add friend error:', err);
            return { success: false, error: 'Failed to add friend. Try again.' };
        }
    },

    async getFriends(userId: string): Promise<Friend[]> {
        const friends = getLocalFriends(userId);
        return friends.sort((a, b) => b.totalXp - a.totalXp);
    },

    async removeFriend(friendId: string): Promise<boolean> {
        try {
            const authResponse = await apiClient.get<{ user: { id: string } | null }>('/api/auth/profile');
            const myId = authResponse.data?.user?.id;

            if (!myId) return false;

            const friends = getLocalFriends(myId);
            const filtered = friends.filter(f => f.friendId !== friendId);
            saveLocalFriends(myId, filtered);

            return true;
        } catch (err) {
            console.error('[FriendService] Remove friend error:', err);
            return false;
        }
    },

    async respondToRequest(requesterId: string, accept: boolean): Promise<boolean> {
        if (!accept) return true;

        try {
            const authResponse = await apiClient.get<{ user: { id: string } | null }>('/api/auth/profile');
            const myId = authResponse.data?.user?.id;

            if (!myId) return false;

            const friends = getLocalFriends(myId);
            const alreadyFriends = friends.some(f => f.friendId === requesterId);

            if (!alreadyFriends) {
                friends.push({
                    id: crypto.randomUUID(),
                    friendId: requesterId,
                    name: 'New Friend',
                    totalXp: 0,
                    addedAt: new Date().toISOString()
                });
                saveLocalFriends(myId, friends);
            }

            return true;
        } catch (err) {
            console.error('[FriendService] Respond to request error:', err);
            return false;
        }
    }
};
