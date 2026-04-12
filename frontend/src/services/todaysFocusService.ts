/**
 * Today's Focus Service
 * Automatically recommends the user's weakest skill based on quiz accuracy.
 */

import { TOEFL_STRUCTURE_SKILLS, TOEFL_LISTENING_SKILLS, TOEFL_READING_SKILLS } from '../data/skills';
import { Skill, SectionType, TodaysFocusResult } from '../types';

const ALL_SKILLS: Skill[] = [
    ...TOEFL_STRUCTURE_SKILLS,
    ...TOEFL_LISTENING_SKILLS,
    ...TOEFL_READING_SKILLS
];

function getSectionType(section: string): SectionType {
    const normalized = section.toLowerCase();
    if (normalized === 'listening') return 'LISTENING';
    if (normalized === 'reading') return 'READING';
    return 'STRUCTURE';
}

function getSkillByNumericId(numericId: number): Skill | null {
    const skillId = numericId.toString().padStart(2, '0');
    const prefixedId = `S${skillId}`;
    return ALL_SKILLS.find(s => s.id === prefixedId) || null;
}

export const TodaysFocusService = {

    async getTodaysFocus(userId: string): Promise<TodaysFocusResult> {
        const quizHistory = JSON.parse(localStorage.getItem(`quiz_history_${userId}`) || '[]');

        if (quizHistory.length === 0) {
            return this.getDefaultFocus();
        }

        const stats = this.calculateSkillStats(quizHistory);
        const weakest = this.findWeakestSkill(stats);
        const improvement = this.calculateImprovement(quizHistory);

        return {
            skill: weakest,
            section: getSectionType(weakest?.section || 'structure') as SectionType,
            reason: `Your accuracy in ${weakest?.name || 'this skill'} is ${weakest?.accuracy || 0}% - the lowest among all skills`,
            suggestedQuestions: 10,
            improvement_trend: improvement,
        };
    },

    calculateSkillStats(quizHistory: any[]): Map<number, any> {
        const stats = new Map<number, any>();

        for (const entry of quizHistory) {
            const skillId = entry.skill_id;
            if (!stats.has(skillId)) {
                stats.set(skillId, {
                    skill_id: skillId,
                    accuracy: 0,
                    quizCount: 0,
                    totalCorrect: 0,
                    totalQuestions: 0,
                    section: entry.section
                });
            }

            const current = stats.get(skillId)!;
            current.totalQuestions++;
            if (entry.is_correct) current.totalCorrect++;
            current.quizCount = current.totalQuestions;
            current.accuracy = (current.totalCorrect / current.totalQuestions) * 100;
        }

        return stats;
    },

    findWeakestSkill(stats: Map<number, any>): Skill & { accuracy: number } {
        let weakestId = 0;
        let lowestAccuracy = Infinity;

        for (const [skillId, stat] of stats) {
            if (stat.accuracy < lowestAccuracy && stat.quizCount >= 3) {
                lowestAccuracy = stat.accuracy;
                weakestId = skillId;
            }
        }

        const skill = getSkillByNumericId(weakestId);
        if (!skill) {
            return { ...ALL_SKILLS[0], accuracy: 100 };
        }

        return {
            ...skill,
            accuracy: lowestAccuracy === Infinity ? 100 : lowestAccuracy
        };
    },

    calculateImprovement(quizHistory: any[]): 'improving' | 'stable' | 'declining' {
        if (quizHistory.length < 5) return 'stable';

        const recent = quizHistory.slice(-10);
        const older = quizHistory.slice(-20, -10);

        if (older.length === 0) return 'stable';

        const recentRate = recent.filter(h => h.is_correct).length / recent.length;
        const olderRate = older.filter(h => h.is_correct).length / older.length;

        if (recentRate > olderRate + 0.1) return 'improving';
        if (recentRate < olderRate - 0.1) return 'declining';
        return 'stable';
    },

    getDefaultFocus(): TodaysFocusResult {
        return {
            skill: ALL_SKILLS[0],
            section: 'STRUCTURE' as SectionType,
            reason: 'Start with Structure to build a strong foundation for TOEFL',
            suggestedQuestions: 10,
            improvement_trend: 'new',
        };
    },

    async getRecommendedSkill(userId: string): Promise<TodaysFocusResult> {
        return this.getTodaysFocus(userId);
    }
};
