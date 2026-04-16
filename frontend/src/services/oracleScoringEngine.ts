import { AggregatedOracleData } from '../types';

export type ConfidenceLevel = 'low' | 'medium' | 'high';

const safeDivide = (a: number, b: number) => (b === 0 ? 0 : a / b);

export function calculateConfidence(data: AggregatedOracleData): ConfidenceLevel {
    const hasListening = data.quizzes.listening.total >= 20;
    const hasReading = data.quizzes.reading.total >= 20;
    const hasStructure = (data.quizzes.structure.total + data.quizzes.written.total) >= 10;
    const hasWritingData = data.essays.total_submissions >= 3;
    const hasGymData = data.writingGym.total_exercises >= 10;

    if (data.totalActivities >= 100 && hasListening && hasReading && hasStructure && hasWritingData && hasGymData) {
        return 'high';
    }
    if (data.totalActivities >= 50 && hasListening && hasReading) {
        return 'medium';
    }
    return 'low';
}

export interface GeneratedRecommendation {
    recommendation_type: 'weak_skill' | 'practice_more' | 'ready_for_test';
    section: string;
    message: string;
    priority: number;
}

export function generateRecommendations(data: AggregatedOracleData, ieltsOverall: number, confidence: ConfidenceLevel): GeneratedRecommendation[] {
    const recs: GeneratedRecommendation[] = [];

    const sections: { section: string; accuracy: number; total: number }[] = [
        { section: 'listening', accuracy: safeDivide(data.quizzes.listening.correct, data.quizzes.listening.total), total: data.quizzes.listening.total },
        { section: 'reading', accuracy: safeDivide(data.quizzes.reading.correct, data.quizzes.reading.total), total: data.quizzes.reading.total },
        { section: 'structure', accuracy: safeDivide(data.quizzes.structure.correct + data.quizzes.written.correct, data.quizzes.structure.total + data.quizzes.written.total), total: data.quizzes.structure.total + data.quizzes.written.total },
    ];

    for (const s of sections) {
        const label = s.section.charAt(0).toUpperCase() + s.section.slice(1);
        if (s.total >= 5 && s.accuracy < 0.60) {
            recs.push({
                recommendation_type: 'weak_skill',
                section: s.section,
                message: `Your ${label} accuracy is ${Math.round(s.accuracy * 100)}%. Focus on this area to boost your overall score.`,
                priority: 9,
            });
        } else if (s.total >= 5 && s.accuracy < 0.70) {
            recs.push({
                recommendation_type: 'weak_skill',
                section: s.section,
                message: `Your ${label} section is at ${Math.round(s.accuracy * 100)}%. A few more practice sessions can push it above 70%.`,
                priority: 7,
            });
        }
        if (s.total < 20) {
            recs.push({
                recommendation_type: 'practice_more',
                section: s.section,
                message: `Complete ${20 - s.total} more ${label} quizzes to increase prediction accuracy.`,
                priority: 6,
            });
        }
    }

    if (data.essays.total_submissions < 5) {
        recs.push({
            recommendation_type: 'practice_more',
            section: 'writing',
            message: `Submit ${5 - data.essays.total_submissions} more essays to improve Writing score confidence.`,
            priority: 5,
        });
    }

    if (confidence === 'high' && ieltsOverall >= 6.5) {
        recs.push({
            recommendation_type: 'ready_for_test',
            section: 'ielts',
            message: `Your predicted IELTS band is ${ieltsOverall} with High confidence. You're ready!`,
            priority: 3,
        });
    }

    recs.sort((a, b) => b.priority - a.priority);
    return recs.slice(0, 5);
}
