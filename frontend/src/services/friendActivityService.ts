import { apiClient } from './apiClient';

export interface FriendActivity {
    id: string;
    friendId: string;
    friendName: string;
    friendAvatar?: string;
    activityType: 'quiz_completed' | 'level_up' | 'streak_milestone' | 'achievement' | 'writing_completed' | 'circle_joined';
    activityData: {
        score?: number;
        section?: string;
        level?: number;
        streak?: number;
        achievementId?: string;
        achievementName?: string;
        wordCount?: number;
        circleName?: string;
    };
    timestamp: string;
}

const ACTIVITY_KEY_PREFIX = 'friend_activities_';

const getActivityKey = (userId: string): string => `${ACTIVITY_KEY_PREFIX}${userId}`;

const getLocalActivities = (userId: string): FriendActivity[] => {
    try {
        const stored = localStorage.getItem(getActivityKey(userId));
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

const saveLocalActivities = (userId: string, activities: FriendActivity[]): void => {
    localStorage.setItem(getActivityKey(userId), JSON.stringify(activities));
};

export const friendActivityService = {

    async fetchFriendActivities(userId: string, friendIds: string[]): Promise<FriendActivity[]> {
        if (friendIds.length === 0) return [];

        try {
            const response = await apiClient.post<{ activities: FriendActivity[] }>('/api/social/friends/activities', {
                friend_ids: friendIds
            });

            if (response.data?.activities) {
                saveLocalActivities(userId, response.data.activities);
                return response.data.activities;
            }
        } catch (error) {
            console.warn('[FriendActivity] Fetch failed, using cached:', error);
        }

        return getLocalActivities(userId);
    },

    getLocalActivities(userId: string): FriendActivity[] {
        return getLocalActivities(userId).slice(0, 20);
    },

    addLocalActivity(userId: string, activity: FriendActivity): void {
        const activities = getLocalActivities(userId);
        activities.unshift(activity);
        
        if (activities.length > 50) {
            activities.splice(50);
        }
        
        saveLocalActivities(userId, activities);
    },

    async recordActivity(
        userId: string,
        activityType: FriendActivity['activityType'],
        activityData: FriendActivity['activityData']
    ): Promise<void> {
        const activity: FriendActivity = {
            id: crypto.randomUUID(),
            friendId: userId,
            friendName: 'You',
            activityType,
            activityData,
            timestamp: new Date().toISOString()
        };

        this.addLocalActivity(userId, activity);

        try {
            await apiClient.post('/api/social/activities', {
                activity_type: activityType,
                activity_data: activityData
            });
        } catch (error) {
            console.warn('[FriendActivity] Failed to sync to cloud:', error);
        }
    },

    getActivityMessage(activity: FriendActivity): string {
        const { activityType, activityData } = activity;

        switch (activityType) {
            case 'quiz_completed':
                return `completed a ${activityData.section} quiz with ${activityData.score}% accuracy`;
            case 'level_up':
                return `reached Level ${activityData.level}`;
            case 'streak_milestone':
                return `achieved a ${activityData.streak}-day streak`;
            case 'achievement':
                return `earned "${activityData.achievementName}" achievement`;
            case 'writing_completed':
                return `wrote ${activityData.wordCount} words in Writing Gym`;
            case 'circle_joined':
                return `joined "${activityData.circleName}" circle`;
            default:
                return 'did something awesome';
        }
    },

    getActivityIcon(activity: FriendActivity): string {
        switch (activity.activityType) {
            case 'quiz_completed':
                return '📝';
            case 'level_up':
                return '⬆️';
            case 'streak_milestone':
                return '🔥';
            case 'achievement':
                return '🏆';
            case 'writing_completed':
                return '✍️';
            case 'circle_joined':
                return '👥';
            default:
                return '⭐';
        }
    },

    formatTimeAgo(timestamp: string): string {
        const now = new Date();
        const activityTime = new Date(timestamp);
        const diffMs = now.getTime() - activityTime.getTime();
        
        const minutes = Math.floor(diffMs / 60000);
        const hours = Math.floor(diffMs / 3600000);
        const days = Math.floor(diffMs / 86400000);

        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        
        return activityTime.toLocaleDateString();
    }
};