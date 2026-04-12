// Integrated Writing Achievements & XP System
import { Achievement } from '../components/peerReview/AchievementNotification';

export interface IWUserStats {
    totalCompleted: number;
    lastScore: number;
    highestScore: number;
    streak: number;
    uniqueTopics: number;
    averageScore: number;
    timeRemaining: number; // seconds left on last submission
    unlockedAchievements: string[];
}

interface IWAchievementDefinition extends Omit<Achievement, 'id'> {
    id: string;
    condition: (stats: IWUserStats) => boolean;
}

export const IW_ACHIEVEMENTS: Record<string, IWAchievementDefinition> = {
    FIRST_ESSAY: {
        id: 'iw_first_essay',
        type: 'milestone',
        title: '🎉 First Steps',
        message: 'Completed your first Integrated Writing task!',
        xp: 50,
        condition: (stats) => stats.totalCompleted === 1
    },
    PERFECT_SCORE: {
        id: 'iw_perfect',
        type: 'tier',
        title: '⭐ Perfect Score',
        message: 'Achieved a 5/5 score! Outstanding work!',
        xp: 100,
        condition: (stats) => stats.lastScore === 5
    },
    STRONG_PERFORMER: {
        id: 'iw_strong',
        type: 'tier',
        title: '💪 Strong Performer',
        message: 'Scored 4/5 or higher! Keep it up!',
        xp: 50,
        condition: (stats) => stats.lastScore >= 4
    },
    ON_FIRE: {
        id: 'iw_streak_3',
        type: 'streak',
        title: '🔥 On Fire',
        message: 'Completed 3 tasks in a row!',
        xp: 75,
        condition: (stats) => stats.streak >= 3
    },
    UNSTOPPABLE: {
        id: 'iw_streak_5',
        type: 'streak',
        title: '🚀 Unstoppable',
        message: 'Completed 5 tasks in a row! Amazing dedication!',
        xp: 150,
        condition: (stats) => stats.streak >= 5
    },
    SCHOLAR: {
        id: 'iw_scholar',
        type: 'milestone',
        title: '📚 Scholar',
        message: 'Completed 10 different topics!',
        xp: 150,
        condition: (stats) => stats.uniqueTopics >= 10
    },
    SPEED_WRITER: {
        id: 'iw_speed',
        type: 'milestone',
        title: '⚡ Speed Writer',
        message: 'Finished with 5+ minutes remaining!',
        xp: 50,
        condition: (stats) => stats.timeRemaining >= 300
    },
    RISING_STAR: {
        id: 'iw_rising',
        type: 'tier',
        title: '🌟 Rising Star',
        message: 'Your average score is 4.0 or higher!',
        xp: 100,
        condition: (stats) => stats.averageScore >= 4.0 && stats.totalCompleted >= 3
    },
    DEDICATED: {
        id: 'iw_dedicated',
        type: 'milestone',
        title: '🎯 Dedicated Learner',
        message: 'Completed 5 Integrated Writing tasks!',
        xp: 100,
        condition: (stats) => stats.totalCompleted >= 5
    },
    MASTER: {
        id: 'iw_master',
        type: 'milestone',
        title: '👑 Integrated Writing Master',
        message: 'Completed 20 tasks! You\'re a true expert!',
        xp: 300,
        condition: (stats) => stats.totalCompleted >= 20
    }
};

// XP rewards for various actions
export const IW_XP_REWARDS = {
    COMPLETE_TASK: 25,
    SCORE_BONUS: {
        1: 0,
        2: 5,
        3: 10,
        4: 20,
        5: 50
    },
    STREAK_BONUS: 10, // per streak count
    FIRST_OF_DAY: 15
};

// Calculate total XP earned for a session
export function calculateSessionXP(
    score: number,
    streak: number,
    isFirstOfDay: boolean
): number {
    let xp = IW_XP_REWARDS.COMPLETE_TASK;
    xp += IW_XP_REWARDS.SCORE_BONUS[score as keyof typeof IW_XP_REWARDS.SCORE_BONUS] || 0;
    xp += streak * IW_XP_REWARDS.STREAK_BONUS;
    if (isFirstOfDay) xp += IW_XP_REWARDS.FIRST_OF_DAY;
    return xp;
}
