import { Circle, CircleMember } from '../types';
import {
    validateCircleName,
    validateCircleDescription,
    validateCircleCode,
    validateChatMessage,
} from '../utils/inputValidation';
import { generateCircleCode } from '../utils/secureCodeGenerator';

import { socialRateLimiter } from './socialRateLimiter';
import { listCircleMessagesV2, sendCircleMessageV2, CircleMessageV2 } from './circleMessagesV2';

export class CircleError extends Error {
    constructor(message: string, public code: string) {
        super(message);
        this.name = 'CircleError';
    }
}

const CIRCLES_KEY = 'circles_data';
const MEMBERS_KEY = 'circle_members_';
const MESSAGES_KEY = 'circle_messages_';

const getCircles = (): Circle[] => {
    try {
        const stored = localStorage.getItem(CIRCLES_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch { return []; }
};

const saveCircles = (circles: Circle[]): void => {
    localStorage.setItem(CIRCLES_KEY, JSON.stringify(circles));
};

const getMembersKey = (circleId: string): string => `${MEMBERS_KEY}${circleId}`;
const getMessagesKey = (circleId: string): string => `${MESSAGES_KEY}${circleId}`;

const getUserId = (): string | null => {
    try {
        const stored = localStorage.getItem('user_id');
        return stored;
    } catch { return null; }
};

const mapV2Message = (m: CircleMessageV2): any => ({
    id: m.id,
    circleId: m.circle_id,
    userId: m.sender_id,
    content: m.message,
    isSystem: m.sender_id === 'system',
    createdAt: m.created_at,
    senderName: m.sender_id === 'system' ? 'System' : (m.sender_id === getUserId() ? 'You' : m.sender_id),
    senderAvatar: null,
});

const mergeMessages = (local: any[], remote: any[]): any[] => {
    const byId = new Map<string, any>();
    [...local, ...remote].forEach((m) => byId.set(String(m.id), m));
    return Array.from(byId.values()).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
};


export const circleService = {

    async createCircle(name: string, description?: string): Promise<Circle | null> {
        const userId = getUserId();
        if (!userId) throw new CircleError('User not authenticated', 'UNAUTHORIZED');

        await socialRateLimiter.enforce('circleCreation', userId);

        const nameValidation = validateCircleName(name);
        if (!nameValidation.valid) {
            throw new CircleError(nameValidation.error || 'Invalid circle name', 'VALIDATION_ERROR');
        }

        const descValidation = validateCircleDescription(description || '');
        if (!descValidation.valid) {
            throw new CircleError(descValidation.error || 'Invalid description', 'VALIDATION_ERROR');
        }

        const code = generateCircleCode();
        const circles = getCircles();

        const newCircle: Circle = {
            id: crypto.randomUUID(),
            name: nameValidation.sanitized!,
            code,
            description: descValidation.sanitized,
            created_by: userId,
            created_at: new Date().toISOString(),
            current_user_role: 'admin',
            member_count: 1,
            weekly_xp: 0
        };

        circles.push(newCircle);
        saveCircles(circles);

        const membersKey = getMembersKey(newCircle.id);
        localStorage.setItem(membersKey, JSON.stringify([{
            circle_id: newCircle.id,
            user_id: userId,
            role: 'admin',
            joined_at: new Date().toISOString(),
            profile: { full_name: 'You', avatar_url: '', xp: 0, level: 1 }
        }]));

        await this.sendSystemMessage(newCircle.id, `Circle "${name}" was created.`);

        return newCircle;
    },

    async joinCircle(code: string): Promise<Circle | null> {
        const userId = getUserId();
        if (!userId) throw new CircleError('User not authenticated', 'UNAUTHORIZED');

        await socialRateLimiter.enforce('circleJoin', userId);

        const codeValidation = validateCircleCode(code);
        if (!codeValidation.valid) {
            throw new CircleError(codeValidation.error || 'Invalid code format', 'VALIDATION_ERROR');
        }

        const circles = getCircles();
        const circle = circles.find(c => c.code === codeValidation.sanitized);

        if (!circle) throw new CircleError('Circle not found', 'NOT_FOUND');

        const membersKey = getMembersKey(circle.id);
        const members: CircleMember[] = JSON.parse(localStorage.getItem(membersKey) || '[]');

        if (members.some(m => m.user_id === userId)) {
            throw new CircleError('Already a member of this circle', 'ALREADY_MEMBER');
        }

        members.push({
            circle_id: circle.id,
            user_id: userId,
            role: 'member',
            joined_at: new Date().toISOString(),
            profile: { full_name: 'You', avatar_url: '', xp: 0, level: 1 }
        });

        localStorage.setItem(membersKey, JSON.stringify(members));

        circle.member_count = members.length;
        saveCircles(circles);

        await this.sendSystemMessage(circle.id, `Someone joined the circle.`);

        return circle;
    },

    async getUserCircles(): Promise<Circle[]> {
        const userId = getUserId();
        if (!userId) return [];

        const circles = getCircles();
        const userCircles: Circle[] = [];

        for (const circle of circles) {
            const membersKey = getMembersKey(circle.id);
            const members: CircleMember[] = JSON.parse(localStorage.getItem(membersKey) || '[]');
            const membership = members.find(m => m.user_id === userId);

            if (membership) {
                userCircles.push({
                    ...circle,
                    current_user_role: membership.role,
                    member_count: members.length
                });
            }
        }

        return userCircles;
    },

    async leaveCircle(circleId: string): Promise<void> {
        const userId = getUserId();
        if (!userId) return;

        const membersKey = getMembersKey(circleId);
        let members: CircleMember[] = JSON.parse(localStorage.getItem(membersKey) || '[]');
        members = members.filter(m => m.user_id !== userId);
        localStorage.setItem(membersKey, JSON.stringify(members));

        const circles = getCircles();
        const circle = circles.find(c => c.id === circleId);
        if (circle) {
            circle.member_count = members.length;
            saveCircles(circles);
        }

        await this.sendSystemMessage(circleId, `Someone left the circle.`);
    },

    async getCircleMembers(circleId: string, _page: number = 1, _limit: number = 20): Promise<CircleMember[]> {
        const membersKey = getMembersKey(circleId);
        return JSON.parse(localStorage.getItem(membersKey) || '[]');
    },

    async getCircleLeaderboard(circleId: string, _page: number = 1, _limit: number = 10): Promise<any[]> {
        const membersKey = getMembersKey(circleId);
        const members: CircleMember[] = JSON.parse(localStorage.getItem(membersKey) || '[]');
        return members
            .map(m => m.profile)
            .filter(p => p)
            .sort((a, b) => (b?.xp || 0) - (a?.xp || 0));
    },

    async sendMessage(circleId: string, content: string): Promise<any> {
        const userId = getUserId();
        if (!userId) throw new CircleError('Not authenticated', 'UNAUTHORIZED');

        await socialRateLimiter.enforce('messageSend', userId);

        const messageValidation = validateChatMessage(content);
        if (!messageValidation.valid) {
            throw new CircleError(messageValidation.error || 'Invalid message', 'VALIDATION_ERROR');
        }

        const messagesKey = getMessagesKey(circleId);
        const messages: any[] = JSON.parse(localStorage.getItem(messagesKey) || '[]');

        const message = {
            id: crypto.randomUUID(),
            circleId,
            userId,
            content: messageValidation.sanitized,
            isSystem: false,
            createdAt: new Date().toISOString(),
            senderName: 'You',
            senderAvatar: null
        };

        messages.push(message);
        localStorage.setItem(messagesKey, JSON.stringify(messages));
        sendCircleMessageV2(circleId, userId, messageValidation.sanitized || content).catch((e) => {
            console.warn('[Circle] v2 send failed, kept local message:', e);
        });

        return message;
    },

    async sendSystemMessage(circleId: string, content: string): Promise<void> {
        const messagesKey = getMessagesKey(circleId);
        const messages: any[] = JSON.parse(localStorage.getItem(messagesKey) || '[]');

        messages.push({
            id: crypto.randomUUID(),
            circleId,
            userId: 'system',
            content,
            isSystem: true,
            createdAt: new Date().toISOString(),
            senderName: 'System',
            senderAvatar: null
        });

        localStorage.setItem(messagesKey, JSON.stringify(messages));
    },

    async getMessages(circleId: string, limit = 50): Promise<any[]> {
        const messagesKey = getMessagesKey(circleId);
        const local: any[] = JSON.parse(localStorage.getItem(messagesKey) || '[]');
        try {
            const remote = (await listCircleMessagesV2(circleId)).map(mapV2Message);
            const merged = mergeMessages(local, remote).slice(-Math.max(limit, 100));
            localStorage.setItem(messagesKey, JSON.stringify(merged));
            return merged.slice(-limit);
        } catch (e) {
            console.warn('[Circle] v2 messages fetch failed, using local fallback:', e);
            return local.slice(-limit);
        }
    },

    async deleteMessage(messageId: string): Promise<void> {
        const circles = getCircles();
        for (const circle of circles) {
            const messagesKey = getMessagesKey(circle.id);
            const messages: any[] = JSON.parse(localStorage.getItem(messagesKey) || '[]');
            const filtered = messages.filter(m => m.id !== messageId);
            if (filtered.length !== messages.length) {
                localStorage.setItem(messagesKey, JSON.stringify(filtered));
                return;
            }
        }
    },

    async updateCircle(circleId: string, updates: { name?: string; description?: string; chat_mode?: 'everyone' | 'admin_only' }): Promise<void> {
        const circles = getCircles();
        const circle = circles.find(c => c.id === circleId);
        if (circle) {
            if (updates.name) circle.name = updates.name;
            if (updates.description !== undefined) circle.description = updates.description;
            if (updates.chat_mode) circle.chat_mode = updates.chat_mode;
            saveCircles(circles);
        }
    },

    async deleteCircle(circleId: string): Promise<void> {
        const circles = getCircles();
        const filtered = circles.filter(c => c.id !== circleId);
        saveCircles(filtered);
        localStorage.removeItem(getMembersKey(circleId));
        localStorage.removeItem(getMessagesKey(circleId));
    },

    subscribeToMessages(circleId: string, callback: (message: any) => void): { unsubscribe: () => void } {
        let lastSeen = new Set<string>();
        this.getMessages(circleId, 100).then((messages) => {
            lastSeen = new Set(messages.map((m: any) => String(m.id)));
        }).catch(() => {});
        const timer = window.setInterval(async () => {
            try {
                const messages = await this.getMessages(circleId, 100);
                for (const m of messages) {
                    const id = String(m.id);
                    if (!lastSeen.has(id)) {
                        lastSeen.add(id);
                        callback(m);
                    }
                }
            } catch { /* polling fallback is best-effort */ }
        }, 7000);
        return { unsubscribe: () => window.clearInterval(timer) };
    },

    async promoteMember(circleId: string, targetUserId: string): Promise<void> {
        const membersKey = getMembersKey(circleId);
        const members: CircleMember[] = JSON.parse(localStorage.getItem(membersKey) || '[]');
        const member = members.find(m => m.user_id === targetUserId);
        if (member) {
            member.role = 'admin';
            localStorage.setItem(membersKey, JSON.stringify(members));
            await this.sendSystemMessage(circleId, `A member was promoted to Admin.`);
        }
    },

    async demoteMember(circleId: string, targetUserId: string): Promise<void> {
        const membersKey = getMembersKey(circleId);
        const members: CircleMember[] = JSON.parse(localStorage.getItem(membersKey) || '[]');
        const member = members.find(m => m.user_id === targetUserId);
        if (member) {
            member.role = 'member';
            localStorage.setItem(membersKey, JSON.stringify(members));
            await this.sendSystemMessage(circleId, `An admin was demoted to member.`);
        }
    },

    async removeMember(circleId: string, targetUserId: string): Promise<void> {
        const membersKey = getMembersKey(circleId);
        let members: CircleMember[] = JSON.parse(localStorage.getItem(membersKey) || '[]');
        members = members.filter(m => m.user_id !== targetUserId);
        localStorage.setItem(membersKey, JSON.stringify(members));
        await this.sendSystemMessage(circleId, `A member was removed from the circle.`);
    },

    getChatMode(_circleId: string): 'everyone' | 'admin_only' {
        return 'everyone';
    }
};
