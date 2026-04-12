/**
 * Score Oracle - Scoring Engine
 * 
 * Strategy: Calculate TOEFL PBT score from quiz data, then convert to IBT, ITP, and IELTS
 * using standard published conversion tables.
 * 
 * Sources:
 * - PBT→IBT: ETS official concordance table (2005 field study)
 * - PBT→IELTS: Compiled from ETS/British Council/IDP equivalency resources
 * - PBT≈ITP: Same scale (310-677), ITP Level 1 is equivalent
 */

import { AggregatedOracleData } from '../types';

// ======================== RESULT TYPES ========================

export interface ScoreResults {
    pbt: { total: number; listening: number; structure_written: number; reading: number };
    ibt: { total: number; reading: number; listening: number; speaking: number; writing: number };
    itp: { total: number; listening: number; structure_written: number; reading: number };
    ielts: { overall: number; listening: number; reading: number; writing: number; speaking: number };
}

export type ConfidenceLevel = 'low' | 'medium' | 'high';

// ======================== CONVERSION TABLES ========================

/**
 * PBT → iBT conversion (ETS official concordance)
 * Each entry: [pbt_score, ibt_score]
 * Source: ETS Score Comparison Tables
 */
const PBT_TO_IBT: [number, number][] = [
    [677, 120], [670, 119], [660, 117], [650, 114],
    [640, 111], [637, 110], [630, 109], [623, 106],
    [620, 105], [617, 103], [613, 102], [610, 101],
    [607, 100], [603, 100], [600, 100], [597, 98],
    [590, 96], [587, 95], [580, 93], [577, 91],
    [573, 90], [570, 89], [567, 88], [563, 86],
    [560, 85], [557, 84], [553, 83], [550, 80],
    [547, 79], [543, 78], [540, 76], [537, 75],
    [533, 74], [530, 72], [527, 71], [523, 70],
    [520, 68], [517, 67], [513, 65], [510, 64],
    [507, 63], [503, 61], [500, 60], [497, 59],
    [493, 57], [490, 56], [487, 55], [483, 53],
    [480, 52], [477, 51], [473, 49], [470, 48],
    [467, 47], [463, 45], [460, 44], [457, 43],
    [453, 41], [450, 40], [447, 39], [443, 38],
    [440, 37], [437, 36], [433, 35], [430, 34],
    [423, 32], [420, 31], [417, 30], [410, 29],
    [403, 27], [400, 26], [397, 25], [390, 23],
    [387, 22], [380, 21], [377, 20], [370, 19],
    [363, 18], [357, 17], [350, 15], [343, 14],
    [337, 13], [333, 12], [330, 11], [323, 10],
    [317, 9], [310, 8],
];

/**
 * PBT → IELTS conversion (compiled from official equivalency tables)
 * Each entry: [pbt_score, ielts_band]
 */
const PBT_TO_IELTS: [number, number][] = [
    [677, 9.0], [670, 9.0], [660, 9.0], [650, 9.0], [640, 9.0], [630, 9.0],
    [620, 8.5], [613, 8.5], [610, 8.5], [603, 8.5],
    [600, 8.0], [593, 8.0], [590, 8.0], [580, 8.0],
    [577, 7.5], [570, 7.5], [567, 7.5], [563, 7.5], [560, 7.5], [553, 7.5],
    [550, 7.0], [543, 7.0], [540, 7.0], [537, 7.0], [530, 7.0],
    [527, 6.5], [523, 6.5], [520, 6.5], [517, 6.5], [513, 6.5], [510, 6.5], [507, 6.5], [503, 6.5],
    [500, 6.0], [497, 6.0], [493, 6.0], [490, 6.0], [487, 6.0], [483, 6.0], [480, 6.0], [477, 6.0],
    [473, 5.5], [470, 5.5], [467, 5.5], [463, 5.5], [460, 5.5], [457, 5.5], [453, 5.5], [450, 5.5],
    [447, 5.0], [443, 5.0], [440, 5.0], [437, 5.0], [433, 5.0], [430, 5.0], [423, 5.0],
    [420, 4.5], [417, 4.5], [413, 4.5], [410, 4.5], [403, 4.5],
    [400, 4.0], [397, 4.0], [393, 4.0], [390, 4.0], [387, 4.0],
    [383, 3.5], [380, 3.5], [377, 3.5], [373, 3.5], [370, 3.5], [363, 3.5],
    [360, 3.0], [357, 3.0], [353, 3.0], [350, 3.0], [347, 3.0], [343, 3.0], [340, 3.0],
    [337, 2.5], [333, 2.5], [330, 2.5],
    [323, 2.0], [317, 2.0], [310, 2.0],
];

// ======================== HELPERS ========================

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const safeDivide = (a: number, b: number) => (b === 0 ? 0 : a / b);
const roundToHalfBand = (score: number): number => Math.round(score * 2) / 2;

/** Interpolate from a sorted-desc conversion table */
function lookupConversion(table: [number, number][], pbtScore: number): number {
    if (pbtScore >= table[0][0]) return table[0][1];
    if (pbtScore <= table[table.length - 1][0]) return table[table.length - 1][1];

    for (let i = 0; i < table.length - 1; i++) {
        const [highPbt, highVal] = table[i];
        const [lowPbt, lowVal] = table[i + 1];
        if (pbtScore >= lowPbt && pbtScore <= highPbt) {
            // Linear interpolation
            const ratio = (pbtScore - lowPbt) / (highPbt - lowPbt);
            return lowVal + ratio * (highVal - lowVal);
        }
    }
    return table[table.length - 1][1];
}

// ======================== PBT CALCULATOR (PRIMARY) ========================

/**
 * Calculate TOEFL PBT score (310-677) from quiz data
 * 3 sections, each scaled 31-68, total = (sum of scaled) * 10 / 3
 */
function calculatePBT(data: AggregatedOracleData) {
    const listeningAcc = safeDivide(data.quizzes.listening.correct, data.quizzes.listening.total);
    const structureCorrect = data.quizzes.structure.correct + data.quizzes.written.correct;
    const structureTotal = data.quizzes.structure.total + data.quizzes.written.total;
    const structureAcc = safeDivide(structureCorrect, structureTotal);
    const readingAcc = safeDivide(data.quizzes.reading.correct, data.quizzes.reading.total);

    // Scale each section 31-68 (PBT scaled score range)
    const listeningScaled = Math.round(31 + listeningAcc * 37);
    const structureScaled = Math.round(31 + structureAcc * 37);
    const readingScaled = Math.round(31 + readingAcc * 36); // reading max is 67

    // PBT total = average of 3 section scores × 10
    const total = clamp(
        Math.round(((listeningScaled + structureScaled + readingScaled) / 3) * 10),
        310, 677
    );

    return {
        total,
        listening: listeningScaled,
        structure_written: structureScaled,
        reading: readingScaled,
    };
}

// ======================== CONVERSIONS ========================

/** Convert PBT total to IBT total (0-120) */
function convertPBTtoIBT(pbtTotal: number): number {
    return Math.round(lookupConversion(PBT_TO_IBT, pbtTotal));
}

/** Convert PBT total to IELTS band (0.0-9.0) */
function convertPBTtoIELTS(pbtTotal: number): number {
    return roundToHalfBand(lookupConversion(PBT_TO_IELTS, pbtTotal));
}

/**
 * Distribute IBT total across 4 sections proportionally
 * Uses PBT section ratios to estimate IBT section scores (each 0-30)
 */
function distributeIBTSections(
    ibtTotal: number,
    pbt: { listening: number; structure_written: number; reading: number }
): { reading: number; listening: number; speaking: number; writing: number } {
    const pbtSum = pbt.listening + pbt.structure_written + pbt.reading;
    if (pbtSum === 0) return { reading: 0, listening: 0, speaking: 0, writing: 0 };

    // Map PBT sections to IBT sections:
    // - listening → listening
    // - reading → reading
    // - structure_written → split into writing & speaking (proxy)
    const listenRatio = pbt.listening / pbtSum;
    const readRatio = pbt.reading / pbtSum;
    const structRatio = pbt.structure_written / pbtSum;

    // Rationale for 4/3 multiplier:
    // PBT has 3 sections, but IBT has 4 sections. To project scores onto the 120-point
    // IBT scale (4 sections × 30 points) based on proportions from a 3-section
    // test architecture, we scale the ratio by 4/3 to normalize the weighting.
    const listening = clamp(Math.round(ibtTotal * listenRatio * (4 / 3)), 0, 30);
    const reading = clamp(Math.round(ibtTotal * readRatio * (4 / 3)), 0, 30);

    // Structure/Written performance is split between Writing and Speaking
    // 55% assigned to Writing (more heavily grammar/structure based in this proxy)
    const writing = clamp(Math.round(ibtTotal * structRatio * (4 / 3) * 0.55), 0, 30);

    // The remaining points form the Speaking score projection
    const speaking = clamp(ibtTotal - listening - reading - writing, 0, 30);

    return { reading, listening, speaking, writing };
}

/**
 * Distribute IELTS overall across 4 sections proportionally
 * Uses PBT section ratios as proxies
 */
function distributeIELTSSections(
    overall: number,
    pbt: { listening: number; structure_written: number; reading: number }
): { listening: number; reading: number; writing: number; speaking: number } {
    const pbtSum = pbt.listening + pbt.structure_written + pbt.reading;
    if (pbtSum === 0) return { listening: 4, reading: 4, writing: 4, speaking: 4 };

    const listenRatio = pbt.listening / pbtSum;
    const readRatio = pbt.reading / pbtSum;
    const structRatio = pbt.structure_written / pbtSum;

    // Bands tend to cluster near overall, so use weighted blend
    const listening = roundToHalfBand(clamp(overall * (0.4 + listenRatio * 0.6 * 3), 2, 9));
    const reading = roundToHalfBand(clamp(overall * (0.4 + readRatio * 0.6 * 3), 2, 9));
    const writing = roundToHalfBand(clamp(overall * (0.4 + structRatio * 0.3 * 3), 2, 9));
    const speaking = roundToHalfBand(clamp(overall * (0.4 + structRatio * 0.3 * 3), 2, 9));

    return { listening, reading, writing, speaking };
}

// ======================== MAIN SCORING FUNCTION ========================

export function calculateAllScores(data: AggregatedOracleData): ScoreResults {
    // Step 1: Calculate PBT (primary score)
    const pbt = calculatePBT(data);

    // Step 2: Convert PBT → IBT
    const ibtTotal = convertPBTtoIBT(pbt.total);
    const ibtSections = distributeIBTSections(ibtTotal, pbt);

    // Step 3: ITP = same as PBT (same scale, same test format)
    const itp = { ...pbt };

    // Step 4: Convert PBT → IELTS
    const ieltsOverall = convertPBTtoIELTS(pbt.total);
    const ieltsSections = distributeIELTSSections(ieltsOverall, pbt);

    return {
        pbt: {
            total: pbt.total,
            listening: pbt.listening * 10, // display as scaled × 10
            structure_written: pbt.structure_written * 10,
            reading: pbt.reading * 10,
        },
        ibt: {
            total: ibtTotal,
            ...ibtSections,
        },
        itp: {
            total: itp.total,
            listening: itp.listening * 10,
            structure_written: itp.structure_written * 10,
            reading: itp.reading * 10,
        },
        ielts: {
            overall: ieltsOverall,
            ...ieltsSections,
        },
    };
}

// ======================== CONFIDENCE ========================

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

// ======================== RECOMMENDATIONS ========================

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
