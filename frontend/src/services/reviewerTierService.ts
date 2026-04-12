import { ReviewerStats, PeerReviewSubmission } from '../types';

export type ReviewerTier = 'Novice' | 'Helper' | 'Mentor' | 'Expert' | 'Master';

export interface TierConfig {
    tier: ReviewerTier;
    minReviews: number;
    minAvgHelpfulness: number;
    xpMultiplier: number;
    badge: string;
    color: string;
}

export const TIER_CONFIG: Record<ReviewerTier, TierConfig> = {
    Novice: {
        tier: 'Novice',
        minReviews: 0,
        minAvgHelpfulness: 0,
        xpMultiplier: 1.0,
        badge: '🌱',
        color: '#22c55e',
    },
    Helper: {
        tier: 'Helper',
        minReviews: 10,
        minAvgHelpfulness: 3.5,
        xpMultiplier: 1.25,
        badge: '🤝',
        color: '#3b82f6',
    },
    Mentor: {
        tier: 'Mentor',
        minReviews: 30,
        minAvgHelpfulness: 4.0,
        xpMultiplier: 1.5,
        badge: '📚',
        color: '#8b5cf6',
    },
    Expert: {
        tier: 'Expert',
        minReviews: 75,
        minAvgHelpfulness: 4.3,
        xpMultiplier: 1.75,
        badge: '⭐',
        color: '#f59e0b',
    },
    Master: {
        tier: 'Master',
        minReviews: 150,
        minAvgHelpfulness: 4.5,
        xpMultiplier: 2.0,
        badge: '🏆',
        color: '#ef4444',
    },
};

export const BASE_XP_PER_REVIEW = 50;

export const calculateTier = (stats: ReviewerStats): ReviewerTier => {
    if (stats.total_reviews >= TIER_CONFIG.Master.minReviews && 
        stats.avg_helpfulness >= TIER_CONFIG.Master.minAvgHelpfulness) {
        return 'Master';
    }
    if (stats.total_reviews >= TIER_CONFIG.Expert.minReviews && 
        stats.avg_helpfulness >= TIER_CONFIG.Expert.minAvgHelpfulness) {
        return 'Expert';
    }
    if (stats.total_reviews >= TIER_CONFIG.Mentor.minReviews && 
        stats.avg_helpfulness >= TIER_CONFIG.Mentor.minAvgHelpfulness) {
        return 'Mentor';
    }
    if (stats.total_reviews >= TIER_CONFIG.Helper.minReviews && 
        stats.avg_helpfulness >= TIER_CONFIG.Helper.minAvgHelpfulness) {
        return 'Helper';
    }
    return 'Novice';
};

export const calculateXP = (
    stats: ReviewerStats,
    timeSpentSeconds: number,
    qualityRating?: number
): number => {
    const tier = calculateTier(stats);
    const tierConfig = TIER_CONFIG[tier];
    
    let xp = BASE_XP_PER_REVIEW * tierConfig.xpMultiplier;
    
    const timeBonus = Math.min(Math.floor(timeSpentSeconds / 60), 20);
    xp += timeBonus;
    
    if (qualityRating && qualityRating >= 4) {
        xp += Math.floor(qualityRating * 5);
    }

    return Math.floor(xp);
};

export const getTierProgress = (stats: ReviewerStats): {
    currentTier: ReviewerTier;
    nextTier: ReviewerTier | null;
    reviewsToNext: number;
    helpfulnessToNext: number;
    progressPercent: number;
} => {
    const currentTier = calculateTier(stats);
    const tierOrder: ReviewerTier[] = ['Novice', 'Helper', 'Mentor', 'Expert', 'Master'];
    const currentIndex = tierOrder.indexOf(currentTier);
    
    let nextTier: ReviewerTier | null = null;
    let reviewsToNext = 0;
    let helpfulnessToNext = 0;
    
    if (currentIndex < tierOrder.length - 1) {
        nextTier = tierOrder[currentIndex + 1];
        const nextConfig = TIER_CONFIG[nextTier];
        
        if (nextConfig.minReviews > stats.total_reviews) {
            reviewsToNext = nextConfig.minReviews - stats.total_reviews;
        }
        
        if (nextConfig.minAvgHelpfulness > stats.avg_helpfulness) {
            helpfulnessToNext = parseFloat((nextConfig.minAvgHelpfulness - stats.avg_helpfulness).toFixed(1));
        }
    }

    const currentConfig = TIER_CONFIG[currentTier];
    const maxReviews = nextTier ? TIER_CONFIG[nextTier].minReviews - currentConfig.minReviews : 100;
    const reviewsProgress = Math.min(stats.total_reviews - currentConfig.minReviews, maxReviews);
    const progressPercent = Math.min(100, Math.floor((reviewsProgress / Math.max(1, maxReviews)) * 100));

    return {
        currentTier,
        nextTier,
        reviewsToNext,
        helpfulnessToNext,
        progressPercent,
    };
};

export interface SkillMatch {
    skill: string;
    matchScore: number;
    priority: 'high' | 'medium' | 'low';
}

export const calculateSkillMatch = (
    submission: PeerReviewSubmission,
    reviewerSkills: string[]
): SkillMatch[] => {
    const submissionText = (submission.prompt || '').toLowerCase() + ' ' + 
                          submission.essay_content.toLowerCase();
    
    const skillKeywords: Record<string, string[]> = {
        'Grammar': ['grammar', 'verb', 'tense', 'subject', 'verb', 'agreement'],
        'Vocabulary': ['vocabulary', 'word', 'lexical', 'synonym', 'word choice'],
        'Coherence': ['coherence', 'cohesion', 'flow', 'connect', 'transition'],
        'Task Achievement': ['task', 'achievement', 'response', 'prompt', 'requirement'],
        'Reading': ['read', 'passage', 'comprehension', 'identify'],
        'Listening': ['listen', 'audio', 'hear', 'sound'],
    };

    const matches: SkillMatch[] = [];
    
    for (const [skill, keywords] of Object.entries(skillKeywords)) {
        const keywordCount = keywords.filter(k => submissionText.includes(k)).length;
        const matchScore = keywordCount / keywords.length;
        
        if (matchScore > 0) {
            matches.push({
                skill,
                matchScore,
                priority: matchScore > 0.5 ? 'high' : matchScore > 0.25 ? 'medium' : 'low',
            });
        }
    }

    return matches.sort((a, b) => b.matchScore - a.matchScore);
};

export const matchByBand = (
    submissionTargetBand: number,
    reviewerBand: number,
    tolerance: number = 1.0
): boolean => {
    return Math.abs(submissionTargetBand - reviewerBand) <= tolerance;
};

export const getRecommendedSubmissions = (
    submissions: PeerReviewSubmission[],
    reviewerStats: ReviewerStats,
    filters?: {
        taskType?: 'Task 1' | 'Task 2';
        preferredSkills?: string[];
    }
): PeerReviewSubmission[] => {
    const reviewerTier = calculateTier(reviewerStats);
    const tierConfig = TIER_CONFIG[reviewerTier];
    
    const scored = submissions.map(submission => {
        let score = 50;
        
        const wordCountScore = submission.word_count >= 150 && submission.word_count <= 400 ? 20 : 10;
        score += wordCountScore;
        
        const estimatedBand = Math.floor(submission.word_count / 30);
        if (matchByBand(estimatedBand, reviewerStats.avg_helpfulness * 2)) {
            score += 15;
        }

        return { submission, score };
    });

    return scored
        .sort((a, b) => b.score - a.score)
        .map(s => s.submission);
};

export const getTierBenefits = (tier: ReviewerTier): string[] => {
    const config = TIER_CONFIG[tier];
    const benefits = [
        `${config.xpMultiplier}x XP per review`,
    ];

    switch (tier) {
        case 'Helper':
            benefits.push('Priority in review queue', 'Access to harder essays');
            break;
        case 'Mentor':
            benefits.push('Badge on profile', 'Can mentor new reviewers');
            break;
        case 'Expert':
            benefits.push('Featured reviewer', 'Early access to new features');
            break;
        case 'Master':
            benefits.push('Exclusive Master badge', 'Monthly rewards', 'Priority support');
            break;
    }

    return benefits;
};