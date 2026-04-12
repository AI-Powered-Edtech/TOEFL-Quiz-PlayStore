/**
 * Utility functions for Mason Level game mechanics
 */

/**
 * Calculate stars earned based on performance
 * @param score - Final score
 * @param timeMs - Time taken in milliseconds
 * @param attempts - Number of attempts
 * @param maxTime - Maximum time allowed
 * @returns Stars earned (0-3)
 */
export function calculateStars(
    score: number,
    timeMs: number,
    attempts: number,
    maxTime: number
): 0 | 1 | 2 | 3 {
    // Failed - no stars
    if (score <= 0) return 0;

    // Perfect performance - 3 stars
    // First try, completed in less than 25% of max time
    if (attempts === 1 && timeMs < maxTime * 0.25) {
        return 3;
    }

    // Great performance - 2 stars
    // Max 2 attempts, completed in less than 50% of max time
    if (attempts <= 2 && timeMs < maxTime * 0.5) {
        return 2;
    }

    // Good performance - 1 star
    // Completed successfully
    return 1;
}

/**
 * Calculate power-up cost based on current count
 * @param currentCount - Current power-up count
 * @returns XP cost to purchase one more
 */
export function getPowerUpCost(currentCount: number): number {
    // Progressive pricing: 50, 75, 100, 125, 150...
    return 50 + (currentCount * 25);
}

/**
 * Check if user should earn a power-up milestone reward
 * @param totalCompleted - Total exercises completed
 * @returns Power-up type to award, or null
 */
export function checkPowerUpMilestone(
    totalCompleted: number
): 'reveal' | 'freeze' | 'shuffle' | 'hint' | null {
    // Every 5 completions
    if (totalCompleted % 5 === 0) {
        const cycle = (totalCompleted / 5) % 4;
        const powerUps: ('reveal' | 'freeze' | 'shuffle' | 'hint')[] = ['hint', 'reveal', 'shuffle', 'freeze'];
        return powerUps[cycle];
    }
    return null;
}

/**
 * Format time in MM:SS format
 * @param ms - Time in milliseconds
 * @returns Formatted string
 */
export function formatTimeMs(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Calculate score breakdown
 * @param baseScore - Base score from correct answer
 * @param timeBonus - Bonus from time remaining
 * @param comboBonus - Bonus from combo multiplier
 * @param streakBonus - Bonus from streak multiplier
 * @returns Score breakdown object
 */
export function calculateScoreBreakdown(
    baseScore: number,
    timeBonus: number,
    comboBonus: number,
    streakBonus: number
) {
    return {
        base: baseScore,
        time: timeBonus,
        combo: comboBonus,
        streak: streakBonus,
        total: baseScore + timeBonus + comboBonus + streakBonus
    };
}

/**
 * Get congratulation message based on stars
 * @param stars - Stars earned
 * @returns Congratulation message
 */
export function getStarMessage(stars: 0 | 1 | 2 | 3): string {
    switch (stars) {
        case 3:
            return '🌟 Perfect! Flawless Construction!';
        case 2:
            return '⭐ Great Work! Solid Structure!';
        case 1:
            return '✨ Good Job! Keep Practicing!';
        default:
            return '💪 Try Again! You Can Do It!';
    }
}

/**
 * Check if skill is unlocked based on progress
 * @param skillUnlockAt - Number of skills required to unlock
 * @param completedSkills - Array of completed skill IDs
 * @returns Whether skill is unlocked
 */
export function isSkillUnlocked(skillUnlockAt: number, completedSkills: string[]): boolean {
    return completedSkills.length >= skillUnlockAt;
}

/**
 * Get color class for syntax highlighting based on role
 * @param role - Grammar role (subject, verb, object, etc.)
 * @returns Tailwind CSS class for background color
 */
export function getSyntaxColor(role?: string): string {
    switch (role) {
        case 'subject': return 'bg-blue-500';
        case 'verb': return 'bg-red-500';
        case 'object': return 'bg-green-500';
        default: return 'bg-slate-500';
    }
}

export const normalizeSentence = (s: string) => {
    return s.toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/\s+([.,!?;:'])/g, '$1')
        .replace(/([.,!?;:'])\s+/g, '$1 ')
        .replace(/\s+/g, ' ')
        .trim();
};
