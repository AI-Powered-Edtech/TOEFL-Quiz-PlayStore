import { IELTSAssessment } from '../types';

import { writingGymService } from './writingGymService';

interface EvaluationPass {
    band_score: number;
    breakdown: {
        task_response: number;
        coherence_cohesion: number;
        lexical_resource: number;
        grammatical_range: number;
    };
    confidence: number;
}

/**
 * Conducts multiple passes of the LLM evaluator to synthesize a
 * more robust and accurate IELTS structural score through averaging.
 */
export async function multiPassEvaluation(
    prompt: string,
    essay: string,
    taskType: 'Task 1' | 'Task 2',
    passes: number = 3
): Promise<IELTSAssessment> {
    const results: (IELTSAssessment & EvaluationPass)[] = [];

    for (let i = 0; i < passes; i++) {
        const result = await writingGymService.evaluateEssay(prompt, essay, taskType);

        // Inject confidence metric if absent
        if (!result.confidence) {
            result.confidence = 0.7; // default fallback
        }

        results.push(result as (IELTSAssessment & EvaluationPass));

        if (i < passes - 1) {
            // Gentle rate limiting between LLM passes
            await new Promise(resolve => setTimeout(resolve, 800));
        }
    }

    // Aggregate results based on weighted confidence
    const totalWeight = results.reduce((sum, r) => sum + r.confidence, 0);
    const aggregatedBand = results.reduce((sum, r) => sum + r.band_score * r.confidence, 0) / totalWeight;

    // Calculate variance for confidence adjustment
    const mean = results.reduce((sum, r) => sum + r.band_score, 0) / results.length;
    const variance = results.reduce((sum, r) => sum + Math.pow(r.band_score - mean, 2), 0) / results.length;

    return {
        ...results[0], // Use first pass for detailed linguistic feedback (grammar, indoglish)
        band_score: Math.round(aggregatedBand * 10) / 10,
        confidence: results[0].confidence, // Retain primary pass confidence
        evaluation_metadata: {
            passes_completed: results.length,
            score_variance: Math.round(variance * 100) / 100,
            method: 'multi_pass_aggregation'
        }
    } as IELTSAssessment;
}
