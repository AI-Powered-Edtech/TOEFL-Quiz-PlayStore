interface SkillDef {
    id: string;
    name: string;
    category: string;
    description: string;
    difficulty: number;
}

export interface LearningPathRecommendation {
    skill: SkillDef;
    reason: string;
    priority: 'high' | 'medium' | 'low';
    estimatedMinutes: number;
}

interface UserSkillProgress {
    skillId: string;
    stars: number;
    bestScore?: number;
    exercisesCompleted?: number;
}

interface UserWeakArea {
    section: string;
    score: number;
    questionCount: number;
}

const DEFAULT_SKILLS: SkillDef[] = [
    { id: 'S01', name: 'Question Types', category: 'listening', description: 'Question Types', difficulty: 1 },
    { id: 'S02', name: 'Note Taking', category: 'listening', description: 'Note Taking', difficulty: 2 },
    { id: 'S03', name: 'Inference', category: 'listening', description: 'Inference', difficulty: 3 },
    { id: 'S04', name: 'Main Idea', category: 'listening', description: 'Main Idea', difficulty: 2 },
    { id: 'S05', name: 'Detail Recall', category: 'listening', description: 'Detail Recall', difficulty: 1 },
    { id: 'S06', name: 'Vocabulary Context', category: 'reading', description: 'Vocabulary Context', difficulty: 1 },
    { id: 'S07', name: 'Sentence Simplification', category: 'reading', description: 'Sentence Simplification', difficulty: 2 },
    { id: 'S08', name: 'Inference Reading', category: 'reading', description: 'Inference Reading', difficulty: 3 },
    { id: 'S09', name: 'Prose Summary', category: 'reading', description: 'Prose Summary', difficulty: 3 },
    { id: 'S10', name: 'Insert Text', category: 'reading', description: 'Insert Text', difficulty: 2 },
    { id: 'S11', name: 'Grammar Fundamentals', category: 'writing', description: 'Grammar Fundamentals', difficulty: 1 },
    { id: 'S12', name: 'Error Identification', category: 'writing', description: 'Error Identification', difficulty: 2 },
    { id: 'S13', name: 'Informal Writing', category: 'writing', description: 'Informal Writing', difficulty: 2 },
    { id: 'S14', name: 'Academic Writing', category: 'writing', description: 'Academic Writing', difficulty: 3 },
    { id: 'S15', name: 'Integrated Task', category: 'speaking', description: 'Integrated Task', difficulty: 3 },
    { id: 'S16', name: 'Independent Task', category: 'speaking', description: 'Independent Task', difficulty: 3 },
];

const SECTION_ORDER: Record<string, number> = {
    listening: 1,
    reading: 2,
    writing: 3,
    speaking: 4,
};

export const learningPathService = {

    getDefaultSkills(): SkillDef[] {
        return DEFAULT_SKILLS;
    },

    getRecommendedSkills(
        userProgress: UserSkillProgress[],
        weakAreas: UserWeakArea[],
        currentBandScore: number
    ): LearningPathRecommendation[] {
        const recommendations: LearningPathRecommendation[] = [];

        const masteredSkills = new Set(
            userProgress.filter(p => p.stars >= 3).map(p => p.skillId)
        );

        const inProgressSkills = new Set(
            userProgress.filter(p => p.stars > 0 && p.stars < 3).map(p => p.skillId)
        );

        const weakSections = new Set(
            weakAreas
                .filter(w => w.score < 60)
                .map(w => w.section)
        );

        for (const skill of DEFAULT_SKILLS) {
            if (masteredSkills.has(skill.id)) continue;

            let priority: 'high' | 'medium' | 'low' = 'low';
            let reason = '';
            let estimatedMinutes = 15 + (skill.difficulty * 5);

            if (weakSections.has(skill.category)) {
                priority = 'high';
                reason = `Strengthen your weak area in ${skill.category}`;
            } else if (inProgressSkills.has(skill.id)) {
                priority = 'medium';
                const progress = userProgress.find(p => p.skillId === skill.id);
                reason = progress?.bestScore 
                    ? `Continue practicing (best: ${progress.bestScore}%)`
                    : 'Continue where you left off';
                estimatedMinutes = 10;
            } else if (currentBandScore < 60 && skill.difficulty <= 2) {
                priority = 'medium';
                reason = 'Recommended for your current level';
            } else if (currentBandScore >= 80 && skill.difficulty === 3) {
                priority = 'medium';
                reason = 'Challenge yourself at your level';
            } else {
                reason = 'Available skill to learn';
            }

            recommendations.push({
                skill: {
                    id: skill.id,
                    name: skill.name,
                    description: skill.description,
                    category: skill.category,
                    difficulty: skill.difficulty,
                },
                reason,
                priority,
                estimatedMinutes,
            });
        }

        recommendations.sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            }
            if (a.skill.category !== b.skill.category) {
                return (SECTION_ORDER[a.skill.category] || 5) - (SECTION_ORDER[b.skill.category] || 5);
            }
            return 0;
        });

        return recommendations;
    },

    getNextRecommendedSkill(
        userProgress: UserSkillProgress[],
        weakAreas: UserWeakArea[],
        currentBandScore: number
    ): LearningPathRecommendation | null {
        const all = this.getRecommendedSkills(userProgress, weakAreas, currentBandScore);
        return all.length > 0 ? all[0] : null;
    },

    estimateTimeToNextBand(
        currentBandScore: number,
        targetBandScore: number,
        completedSkills: number,
        totalSkills: number
    ): { days: number; hours: number } {
        const bandGap = targetBandScore - currentBandScore;
        if (bandGap <= 0) return { days: 0, hours: 0 };

        const avgPointsPerSkill = 100 / totalSkills;
        const skillsNeeded = Math.ceil(bandGap / avgPointsPerSkill);
        
        const remainingSkills = Math.max(0, skillsNeeded - completedSkills);
        const avgMinutesPerSkill = 20;
        
        const totalMinutes = remainingSkills * avgMinutesPerSkill;
        const days = Math.ceil(totalMinutes / 45);
        const hours = Math.ceil(totalMinutes / 60);

        return { days, hours };
    },

    getPathSummary(
        userProgress: UserSkillProgress[],
        totalSkills: number
    ): {
        mastered: number;
        inProgress: number;
        notStarted: number;
        completionPercentage: number;
    } {
        const mastered = userProgress.filter(p => p.stars >= 3).length;
        const inProgress = userProgress.filter(p => p.stars > 0 && p.stars < 3).length;
        const notStarted = totalSkills - mastered - inProgress;
        const completionPercentage = Math.round((mastered / totalSkills) * 100);

        return {
            mastered,
            inProgress,
            notStarted,
            completionPercentage,
        };
    },
};