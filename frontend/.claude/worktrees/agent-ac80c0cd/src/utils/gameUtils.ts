/**
 * Game utility functions for MasonLevel
 */

/**
 * Calculate total score based on time, combo, streak, and base points
 */
export const calculateScore = (
    timeRemaining: number,
    combo: number,
    streakBonus: number,
    baseScore: number
): number => {
    const timeBonus = Math.floor(timeRemaining * 10);
    const comboBonus = combo * 50;
    const streakMultiplier = streakBonus;

    return Math.floor((baseScore + timeBonus + comboBonus) * streakMultiplier);
};

/**
 * Format seconds into MM:SS format
 */
export const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Get color class based on difficulty level
 */
export const getDifficultyColor = (
    difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert'
): string => {
    const colors = {
        beginner: 'text-green-600 bg-green-50',
        intermediate: 'text-blue-600 bg-blue-50',
        advanced: 'text-purple-600 bg-purple-50',
        expert: 'text-red-600 bg-red-50'
    };

    return colors[difficulty] || colors.intermediate;
};

/**
 * Shuffle array using Fisher-Yates algorithm
 */
export const shuffleArray = <T>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

/**
 * Get congratulatory message based on score
 */
export const getCongratulationMessage = (score: number): string => {
    if (score >= 2000) return 'Outstanding! 🌟';
    if (score >= 1500) return 'Excellent Work! 🎉';
    if (score >= 1000) return 'Great Job! 👏';
    if (score >= 500) return 'Well Done! ✨';
    return 'Good Effort! 💪';
};
