import { AdaptiveDifficulty, getAdaptiveDifficulty, getDifficultyRange } from '../types';

export interface UserPerformanceMetrics {
    totalQuestions: number;
    correctAnswers: number;
    accuracyBySection: Record<string, { correct: number; total: number }>;
    accuracyBySkill: Record<string, { correct: number; total: number }>;
    recentAccuracy: number[];
    averageResponseTime: number;
    lastUpdated: number;
}

export interface AdaptiveQuizConfig {
    initialDifficulty: AdaptiveDifficulty;
    minQuestionsForAdjustment: number;
    difficultyAdjustmentThreshold: number;
    maxDifficulty: AdaptiveDifficulty;
    minDifficulty: AdaptiveDifficulty;
}

const DEFAULT_CONFIG: AdaptiveQuizConfig = {
    initialDifficulty: 'medium',
    minQuestionsForAdjustment: 5,
    difficultyAdjustmentThreshold: 0.2,
    maxDifficulty: 'hard',
    minDifficulty: 'easy',
};

export class AdaptiveQuizEngine {
    private metrics: UserPerformanceMetrics;
    private config: AdaptiveQuizConfig;
    private currentDifficulty: AdaptiveDifficulty;

    constructor(config: Partial<AdaptiveQuizConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.currentDifficulty = this.config.initialDifficulty;
        this.metrics = {
            totalQuestions: 0,
            correctAnswers: 0,
            accuracyBySection: {},
            accuracyBySkill: {},
            recentAccuracy: [],
            averageResponseTime: 0,
            lastUpdated: Date.now(),
        };
    }

    loadFromStorage(userId: string): void {
        try {
            const stored = localStorage.getItem(`adaptive_metrics_${userId}`);
            if (stored) {
                this.metrics = JSON.parse(stored);
                this.currentDifficulty = this.calculateCurrentDifficulty();
            }
        } catch (e) {
            console.warn('[AdaptiveEngine] Failed to load metrics:', e);
        }
    }

    saveToStorage(userId: string): void {
        try {
            localStorage.setItem(`adaptive_metrics_${userId}`, JSON.stringify(this.metrics));
        } catch (e) {
            console.warn('[AdaptiveEngine] Failed to save metrics:', e);
        }
    }

    recordAnswer(params: {
        correct: boolean;
        section: string;
        skillId: string;
        responseTimeMs: number;
    }): void {
        const { correct, section, skillId, responseTimeMs } = params;

        this.metrics.totalQuestions++;
        if (correct) this.metrics.correctAnswers++;

        if (!this.metrics.accuracyBySection[section]) {
            this.metrics.accuracyBySection[section] = { correct: 0, total: 0 };
        }
        this.metrics.accuracyBySection[section].total++;
        if (correct) this.metrics.accuracyBySection[section].correct++;

        const skillKey = String(skillId);
        if (!this.metrics.accuracyBySkill[skillKey]) {
            this.metrics.accuracyBySkill[skillKey] = { correct: 0, total: 0 };
        }
        this.metrics.accuracyBySkill[skillKey].total++;
        if (correct) this.metrics.accuracyBySkill[skillKey].correct++;

        this.metrics.recentAccuracy.push(correct ? 1 : 0);
        if (this.metrics.recentAccuracy.length > 20) {
            this.metrics.recentAccuracy.shift();
        }

        const totalTime = this.metrics.averageResponseTime * (this.metrics.totalQuestions - 1);
        this.metrics.averageResponseTime = (totalTime + responseTimeMs) / this.metrics.totalQuestions;
        this.metrics.lastUpdated = Date.now();

        this.maybeAdjustDifficulty();
    }

    private maybeAdjustDifficulty(): void {
        if (this.metrics.recentAccuracy.length < this.config.minQuestionsForAdjustment) {
            return;
        }

        const recentCorrect = this.metrics.recentAccuracy.filter(c => c === 1).length;
        const recentAccuracy = recentCorrect / this.metrics.recentAccuracy.length;
        const threshold = this.config.difficultyAdjustmentThreshold;

        if (recentAccuracy > 0.75 + threshold && this.currentDifficulty !== this.config.maxDifficulty) {
            this.currentDifficulty = this.getNextDifficulty('hard');
            this.metrics.recentAccuracy = [];
        } else if (recentAccuracy < 0.45 - threshold && this.currentDifficulty !== this.config.minDifficulty) {
            this.currentDifficulty = this.getNextDifficulty('easy');
            this.metrics.recentAccuracy = [];
        }
    }

    private getNextDifficulty(direction: 'hard' | 'easy'): AdaptiveDifficulty {
        const levels: AdaptiveDifficulty[] = ['easy', 'medium', 'hard'];
        const currentIndex = levels.indexOf(this.currentDifficulty);
        
        if (direction === 'hard' && currentIndex < levels.length - 1) {
            return levels[currentIndex + 1];
        }
        if (direction === 'easy' && currentIndex > 0) {
            return levels[currentIndex - 1];
        }
        return this.currentDifficulty;
    }

    private calculateCurrentDifficulty(): AdaptiveDifficulty {
        if (this.metrics.totalQuestions < 3) {
            return this.config.initialDifficulty;
        }
        const overallAccuracy = this.metrics.correctAnswers / this.metrics.totalQuestions;
        return getAdaptiveDifficulty(overallAccuracy);
    }

    getCurrentDifficulty(): AdaptiveDifficulty {
        return this.currentDifficulty;
    }

    getDifficultyRange(): [number, number] {
        return getDifficultyRange(this.currentDifficulty);
    }

    getMetrics(): UserPerformanceMetrics {
        return { ...this.metrics };
    }

    getOverallAccuracy(): number {
        if (this.metrics.totalQuestions === 0) return 0;
        return this.metrics.correctAnswers / this.metrics.totalQuestions;
    }

    getSectionAccuracy(section: string): number {
        const sectionMetrics = this.metrics.accuracyBySection[section];
        if (!sectionMetrics || sectionMetrics.total === 0) return 0;
        return sectionMetrics.correct / sectionMetrics.total;
    }

    getWeakSections(): string[] {
        return Object.entries(this.metrics.accuracyBySection)
            .filter(([, metrics]) => metrics.total >= 3)
            .filter(([, metrics]) => metrics.correct / metrics.total < 0.5)
            .map(([section]) => section);
    }

    getStrongSections(): string[] {
        return Object.entries(this.metrics.accuracyBySection)
            .filter(([, metrics]) => metrics.total >= 3)
            .filter(([, metrics]) => metrics.correct / metrics.total >= 0.75)
            .map(([section]) => section);
    }

    getRecommendedDifficulty(): { difficulty: AdaptiveDifficulty; reason: string } {
        const weakSections = this.getWeakSections();
        const strongSections = this.getStrongSections();
        
        if (weakSections.length >= 2 && strongSections.length >= 1) {
            return {
                difficulty: 'medium',
                reason: 'Mixed performance: strengthen weak sections first',
            };
        }
        
        if (weakSections.length >= 3) {
            return {
                difficulty: 'easy',
                reason: 'Multiple weak sections: build foundation first',
            };
        }
        
        if (this.getOverallAccuracy() >= 0.8 && this.metrics.totalQuestions >= 10) {
            return {
                difficulty: 'hard',
                reason: 'Strong overall performance: challenge with harder questions',
            };
        }

        return {
            difficulty: this.currentDifficulty,
            reason: 'Continue current level for steady improvement',
        };
    }

    reset(): void {
        this.metrics = {
            totalQuestions: 0,
            correctAnswers: 0,
            accuracyBySection: {},
            accuracyBySkill: {},
            recentAccuracy: [],
            averageResponseTime: 0,
            lastUpdated: Date.now(),
        };
        this.currentDifficulty = this.config.initialDifficulty;
    }

    exportMetrics(): string {
        return JSON.stringify({
            metrics: this.metrics,
            currentDifficulty: this.currentDifficulty,
            config: this.config,
        }, null, 2);
    }

    importMetrics(data: string): boolean {
        try {
            const parsed = JSON.parse(data);
            this.metrics = parsed.metrics;
            this.currentDifficulty = parsed.currentDifficulty || this.config.initialDifficulty;
            return true;
        } catch {
            return false;
        }
    }
}

export const createAdaptiveEngine = (config?: Partial<AdaptiveQuizConfig>): AdaptiveQuizEngine => {
    return new AdaptiveQuizEngine(config);
};