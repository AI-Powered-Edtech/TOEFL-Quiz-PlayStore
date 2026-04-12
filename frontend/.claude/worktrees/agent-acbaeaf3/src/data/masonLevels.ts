/**
 * Mason 50-Level Progression System
 * Maps 50 levels to 25 grammar skills for guaranteed mastery
 * Each skill is practiced twice: intro (normal) and mastery (hard)
 */

import { MASON_SKILLS, MasonSkill } from './masonSkills';

export type LevelDifficulty = 'normal' | 'hard';
export type LevelTier = 'beginner' | 'intermediate' | 'advanced';

export interface MasonLevel {
    levelNum: number;          // 1-50
    skillId: string;           // S1, S2, etc.
    skillName: string;         // Full skill name
    isIntro: boolean;          // true = first encounter, false = mastery
    difficulty: LevelDifficulty;
    tier: LevelTier;
    xpReward: number;          // Base XP for completion
    bonusXp: number;           // Extra XP for 3 stars
    unlockRequirement: number; // Previous level needed to unlock
}

// XP rewards per tier
const XP_CONFIG = {
    beginner: { base: 25, bonus: 15 },
    intermediate: { base: 50, bonus: 30 },
    advanced: { base: 75, bonus: 45 }
};

// Calculate tier based on skill index
function getTierFromSkillIndex(skillIndex: number): LevelTier {
    if (skillIndex < 8) return 'beginner';      // S1-S8
    if (skillIndex < 16) return 'intermediate'; // S9-S16
    return 'advanced';                           // S17-S25
}

/**
 * Generate all 50 levels mapping to 25 skills
 * Level 1-2 → S1, Level 3-4 → S2, ..., Level 49-50 → S25
 */
function generateLevels(): MasonLevel[] {
    const levels: MasonLevel[] = [];

    for (let levelNum = 1; levelNum <= 50; levelNum++) {
        const skillIndex = Math.floor((levelNum - 1) / 2); // 0-24
        const skill = MASON_SKILLS[skillIndex];

        if (!skill) continue;

        const isIntro = levelNum % 2 === 1; // Odd levels are intro
        const tier = getTierFromSkillIndex(skillIndex);
        const xpConfig = XP_CONFIG[tier];

        levels.push({
            levelNum,
            skillId: skill.id,
            skillName: skill.name,
            isIntro,
            difficulty: isIntro ? 'normal' : 'hard',
            tier,
            xpReward: xpConfig.base,
            bonusXp: xpConfig.bonus,
            unlockRequirement: levelNum - 1 // Must complete previous level
        });
    }

    return levels;
}

// Pre-generated level data
export const MASON_LEVELS: MasonLevel[] = generateLevels();

/**
 * Get level by number (1-50)
 */
export function getLevelByNumber(levelNum: number): MasonLevel | undefined {
    return MASON_LEVELS.find(l => l.levelNum === levelNum);
}

/**
 * Get next level after current
 */
export function getNextLevel(currentLevelNum: number): MasonLevel | undefined {
    if (currentLevelNum >= 50) return undefined;
    return getLevelByNumber(currentLevelNum + 1);
}

/**
 * Get all levels for a specific skill
 */
export function getLevelsForSkill(skillId: string): MasonLevel[] {
    return MASON_LEVELS.filter(l => l.skillId === skillId);
}

/**
 * Get skill from level number
 */
export function getSkillFromLevel(levelNum: number): MasonSkill | undefined {
    const level = getLevelByNumber(levelNum);
    if (!level) return undefined;
    return MASON_SKILLS.find(s => s.id === level.skillId);
}

/**
 * Calculate total XP for completing a level
 * @param levelNum - The level number
 * @param stars - Stars earned (0-3)
 */
export function calculateLevelXp(levelNum: number, stars: number): number {
    const level = getLevelByNumber(levelNum);
    if (!level) return 0;

    let xp = level.xpReward;
    if (stars === 3) {
        xp += level.bonusXp;
    }
    return xp;
}

/**
 * Get levels grouped by tier for skill map display
 */
export function getLevelsByTier(): Record<LevelTier, MasonLevel[]> {
    return {
        beginner: MASON_LEVELS.filter(l => l.tier === 'beginner'),
        intermediate: MASON_LEVELS.filter(l => l.tier === 'intermediate'),
        advanced: MASON_LEVELS.filter(l => l.tier === 'advanced')
    };
}

/**
 * Get progress summary for skill map
 */
export function calculateMasonProgress(completedLevels: number[]): {
    total: number;
    completed: number;
    percentage: number;
    currentTier: LevelTier;
} {
    const completed = completedLevels.length;
    const total = 50;
    const percentage = Math.round((completed / total) * 100);

    let currentTier: LevelTier = 'beginner';
    const maxCompleted = Math.max(...completedLevels, 0);
    if (maxCompleted > 32) currentTier = 'advanced';
    else if (maxCompleted > 16) currentTier = 'intermediate';

    return { total, completed, percentage, currentTier };
}
