

import { QUESTION_BANK } from "../data/staticDatabase";
import { QuizData, CanonicalQuestionV1, Passage } from "../types";
import { supabase } from "./supabase";
import { ReadingValidator, ListeningValidator, StructureValidator, WrittenExpressionValidator } from "./validators";


const USER_BANK_KEY = 'streamquiz_user_bank_v1';

// ========================================
// PASSAGE SERVICE FUNCTIONS
// ========================================

/**
 * Save a passage to the database
 * Returns passage ID for linking to questions
 * Deduplicates by checking if passage text already exists
 */
export const savePassage = async (passageText: string, metadata?: {
    title?: string;
    topic?: string;
    cefr_level?: string;
}): Promise<string | null> => {
    if (!passageText || passageText.length < 80) {
        console.warn('[PassageService] Passage text too short, skipping save');
        return null;
    }

    // Check if passage already exists (deduplication)
    const { data: existing, error: searchError } = await supabase
        .from('passages')
        .select('id')
        .eq('text', passageText)
        .maybeSingle();

    if (searchError) {
        console.error('[PassageService] Error checking for existing passage:', searchError);
    }

    if (existing) {
        console.log('[PassageService] Passage already exists, reusing ID:', existing.id);
        return existing.id; // Return existing passage ID
    }

    // Insert new passage
    const wordCount = passageText.split(/\s+/).filter(w => w.length > 0).length;

    const { data, error } = await supabase
        .from('passages')
        .insert([{
            text: passageText,
            title: metadata?.title,
            topic: metadata?.topic,
            word_count: wordCount,
            cefr_level: metadata?.cefr_level || 'B2',
            section: 'reading',
            created_at: new Date().toISOString(),
            metadata: {}
        }])
        .select('id')
        .single();

    if (error) {
        console.error('[PassageService] Failed to save passage:', error);
        return null;
    }

    console.log('[PassageService] Saved new passage with ID:', data.id);
    return data.id;
};

/**
 * Fetch passage by ID
 */
export const getPassageById = async (passageId: string): Promise<Passage | null> => {
    const { data, error } = await supabase
        .from('passages')
        .select('*')
        .eq('id', passageId)
        .single();

    if (error) {
        console.error('[PassageService] Failed to fetch passage:', error);
        return null;
    }

    return data as Passage;
};

// --- LOCAL STORAGE FALLBACK ---
const getLocalUserBank = (): QuizData[] => {
    try {
        const stored = localStorage.getItem(USER_BANK_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
};

const saveToLocalUserBank = (newQuestions: QuizData[]) => {
    const current = getLocalUserBank();
    const uniqueNew = newQuestions.filter(nq =>
        !current.some(ex => ex.prompt === nq.prompt)
    );
    const updated = [...current, ...uniqueNew];
    localStorage.setItem(USER_BANK_KEY, JSON.stringify(updated));
    return uniqueNew.length;
};

// --- PHASE 2 ANTI-CORRUPTION LAYER (ACL) ---
// This ensures that whatever AI generates, we ONLY save valid Phase 2 data to DB
// Returns null if question fails quality gate (reject instead of patch)
const enforcePhase2Rules = (q: any): (Partial<CanonicalQuestionV1> & { choices: any[], stimulus: any }) | null => {
    let skillId = 0;
    if (typeof q.skill_id === 'number' && !isNaN(q.skill_id)) {
        skillId = Math.floor(q.skill_id);
    } else if (typeof q.skill_id === 'string') {
        const parsed = parseInt(q.skill_id.replace(/\\D/g, ''), 10);
        skillId = isNaN(parsed) ? 0 : parsed;
    }

    let difficultyScore = 50;
    if (typeof q.difficulty_score === 'number' && !isNaN(q.difficulty_score)) {
        difficultyScore = Math.floor(q.difficulty_score);
    } else if (typeof q.difficulty_score === 'string') {
        const parsed = parseInt(q.difficulty_score, 10);
        difficultyScore = isNaN(parsed) ? 50 : parsed;
    }
    difficultyScore = Math.max(1, Math.min(100, difficultyScore));

    const metadata = {
        source: (q.metadata?.source === 'pdf' ? 'pdf' : 'db') as 'pdf' | 'db',
        explanation: q.metadata?.explanation || "Explanation available in full review.",
        pattern_tip: q.metadata?.pattern_tip,
        referenced_text: q.metadata?.referenced_text,
        hints: q.metadata?.hints || [],
        cefr_compliant: true,
        qti_compliant: true
    };

    let stimulus = q.stimulus || {};
    if (!stimulus.text && q.metadata?.passage_text) {
        stimulus = { ...stimulus, text: q.metadata.passage_text, type: 'text' };
    }

    const context = { skillId, difficultyScore, metadata, stimulus };

    if (q.skill_type === 'reading' || q.section === 'reading' || q.section === 'READING') {
        const result = new ReadingValidator().validate(q, context);
        return result.isValid ? (result.sanitizedData as any) : null;
    }

    if (q.skill_type === 'listening' || q.section === 'listening' || q.section === 'LISTENING') {
        const result = new ListeningValidator().validate(q, context);
        return result.isValid ? (result.sanitizedData as any) : null;
    }

    if ((skillId >= 1 && skillId <= 19) || (q.section === 'structure' && !q.prompt?.includes('{A}'))) {
        const result = new StructureValidator().validate(q, context);
        return result.isValid ? (result.sanitizedData as any) : null;
    }

    if ((skillId >= 20 && skillId <= 60) || (q.section === 'written' || q.interaction === 'identify_error' || q.prompt?.includes('{A}'))) {
        const result = new WrittenExpressionValidator().validate(q, context);
        return result.isValid ? (result.sanitizedData as any) : null;
    }

    // Fallback for unknown (treat as Structure MC)
    const choices = [...(q.choices || [])];
    if (choices.length < 4) {
        console.warn(`[ACL] ❌ REJECTING unknown-type question: only ${choices.length} choices.`, q.prompt?.substring(0, 80));
        return null;
    }

    return {
        skill_id: skillId,
        section: 'structure',
        interaction: 'multiple_choice',
        prompt: q.prompt,
        choices: choices,
        correct_response: q.correct_response || [],
        cefr_target: q.cefr_target || 'B2',
        difficulty_score: 50,
        stimulus: stimulus,
        metadata
    };
};


// --- CORE FUNCTIONS ---

export const importQuestionsToBank = async (rawQuestions: QuizData[]): Promise<{ added: number, total: number, savedQuestions: any[] }> => {
    console.log(`[BankService] Importing ${rawQuestions.length} questions to Phase 2 DB...`);

    // 1. Classify (Ensure ID exists)
    const { classifyQuestionsBatch } = await import('./groq/generators');
    const classifiedQuestions = await classifyQuestionsBatch(rawQuestions);

    // LOG: Skill distribution summary
    const skillDistribution: Record<string, number> = {};
    const sectionDistribution: Record<string, number> = {};
    for (const q of classifiedQuestions) {
        const skillKey = `Skill ${q.skill_id || 'unknown'}`;
        const sectionKey = q.section || 'unknown';
        skillDistribution[skillKey] = (skillDistribution[skillKey] || 0) + 1;
        sectionDistribution[sectionKey] = (sectionDistribution[sectionKey] || 0) + 1;
    }
    console.log(`[BankService] 📊 Section Distribution:`, sectionDistribution);
    console.log(`[BankService] 📊 Skill Distribution:`, skillDistribution);

    // 2. Anti-Corruption Layer: Enforce Phase 2 Rules + Save Passages
    const dbPayloads = [];
    const needsExplanation: string[] = []; // Track questions needing AI explanation

    for (const q of classifiedQuestions) {
        const sanitized = enforcePhase2Rules(q);

        // Skip if ACL rejected the question (returns null)
        if (!sanitized) {
            continue;
        }

        let passageId = null;
        let stimulus = sanitized.stimulus;

        // For reading questions, save passage separately
        if (sanitized.section === 'reading' && sanitized.stimulus?.text) {
            passageId = await savePassage(
                sanitized.stimulus.text,
                {
                    cefr_level: sanitized.cefr_target
                }
            );

            // Update stimulus to include passage_id and remove text
            stimulus = {
                ...sanitized.stimulus,
                passage_id: passageId,
                text: undefined // Remove text, use passage_id instead
            };
        }

        // Check if needs explanation generation
        const explanation = sanitized.metadata?.explanation || '';
        const needsExplanationGen = !explanation ||
            explanation === 'Extracted from PDF' ||
            explanation.length < 20;

        dbPayloads.push({
            skill_id: sanitized.skill_id,
            section: sanitized.section,
            interaction: sanitized.interaction,
            prompt: sanitized.prompt,
            choices: sanitized.choices, // JSONB auto-conversion
            correct_response: sanitized.correct_response, // JSONB auto-conversion
            cefr_target: sanitized.cefr_target,
            difficulty_score: sanitized.difficulty_score,
            stimulus: stimulus, // JSONB (with passage_id for reading)
            metadata: {
                ...sanitized.metadata,
                needs_explanation: needsExplanationGen
            }, // JSONB
            created_at: new Date().toISOString()
        });
    }

    // 3. Save to Supabase (Table: question_bank)
    const { data, error } = await supabase
        .from('question_bank')
        .insert(dbPayloads)
        .select('id, skill_id, section, interaction, stimulus, metadata, created_at');

    if (error) {
        console.error('[BankService] Failed to save to question_bank.', error);
        // Fallback to local
        const count = saveToLocalUserBank(classifiedQuestions);
        return { added: count, total: classifiedQuestions.length, savedQuestions: [] };
    }

    console.log(`[BankService] ✅ Successfully added ${data?.length} questions to question_bank.`);

    // 4. Background tasks
    if (data && data.length > 0) {
        // 4a. Track listening questions for audio
        const listeningQuestions = data.filter((q: any) => q.section === 'listening');
        if (listeningQuestions.length > 0) {
            console.log(`[BankService] 🎧 ${listeningQuestions.length} listening questions saved. Audio on playback.`);
        }

        // 4b. Queue explanation generation for PDF-extracted questions
        const questionsNeedingExplanation = data.filter((q: any) => q.metadata?.needs_explanation);
        if (questionsNeedingExplanation.length > 0) {
            console.log(`[BankService] 📝 Queuing ${questionsNeedingExplanation.length} questions for AI explanation generation...`);
            // Fire and forget - generate explanations in background
            generateExplanationsInBackground(questionsNeedingExplanation.map((q: any) => q.id));
        }
    }

    return { added: data?.length || 0, total: classifiedQuestions.length, savedQuestions: data || [] };
};

// Background explanation generator
const generateExplanationsInBackground = async (questionIds: string[]) => {
    // Don't await - run in background
    setTimeout(async () => {
        console.log(`[BankService] 🤖 Starting background explanation generation for ${questionIds.length} questions...`);

        for (const id of questionIds) {
            try {
                // Fetch question
                const { data: q } = await supabase
                    .from('question_bank')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (!q) continue;

                // Generate explanation using Groq
                const prompt = `Generate a brief, educational explanation (2-3 sentences) for this TOEFL ${q.section} question.
Question: ${q.prompt}
Options: ${JSON.stringify(q.choices)}
Correct Answer: ${q.correct_response?.[0] || 'A'}

Explain WHY the correct answer is right and briefly mention why common wrong answers are wrong.`;

                // Use callGroq directly
                const { callGroq } = await import('./groq/client');
                const response = await callGroq([{ role: 'user', content: prompt }], 0.3);
                const explanation = (response as string).trim();

                // Update in DB
                await supabase
                    .from('question_bank')
                    .update({
                        metadata: {
                            ...q.metadata,
                            explanation,
                            needs_explanation: false
                        }
                    })
                    .eq('id', id);

                console.log(`[BankService] ✅ Generated explanation for question ${id.slice(0, 8)}...`);

                // Rate limit
                await new Promise(r => setTimeout(r, 300));
            } catch (err) {
                console.warn(`[BankService] ⚠️ Failed to generate explanation for ${id}:`, err);
            }
        }

        console.log(`[BankService] 🎉 Background explanation generation complete!`);
    }, 100);
}

/**
 * UNIFIED RETRIEVAL (PHASE 2 COMPATIBLE)
 */
export const getUnifiedQuestionsBySkill = async (skillId: string, limit: number = 10): Promise<QuizData[]> => {
    const numericId = parseInt(skillId.replace(/\D/g, ''), 10);

    let finalQuestions: QuizData[] = [];

    // --- 1. QUERY SUPABASE (question_bank) ---
    try {
        const { data, error } = await supabase
            .from('question_bank')
            .select('*')
            .eq('skill_id', numericId)
            .neq('metadata->>source', 'pdf')
            .limit(50);

        if (!error && data && data.length > 0) {
            // Fetch passages for reading questions that have passage_id
            const passageIds = data
                .filter((d: any) => d.stimulus?.passage_id)
                .map((d: any) => d.stimulus.passage_id);

            const passagesMap = new Map<string, any>();

            if (passageIds.length > 0) {
                const { data: passages, error: passageError } = await supabase
                    .from('passages')
                    .select('*')
                    .in('id', passageIds);

                if (!passageError && passages) {
                    console.log(`[BankService] Fetched ${passages.length} passages for ${passageIds.length} passage IDs`);
                    passages.forEach((p: any) => passagesMap.set(p.id, p));
                } else {
                    console.error('[BankService] Failed to fetch passages:', passageError);
                }
            }

            // MAP DB RESULT BACK TO UI INTERFACE
            const dbQuestions: QuizData[] = data.map((d: any) => {
                const mapped = mapDbToQuizData(d);
                if (d.stimulus?.passage_id) {
                    const passage = passagesMap.get(d.stimulus.passage_id);
                    if (passage) {
                        mapped.stimulus = { ...mapped.stimulus, text: passage.text };
                    }
                }

                // FIX: Restore choices for structure questions with empty array
                if (mapped.section === 'structure' && mapped.interaction === 'fill_blank' && mapped.choices.length === 0) {
                    const correctAnswer = (mapped.correct_response || [])[0] || 'the answer';
                    mapped.choices = [correctAnswer, 'option B', 'option C', 'option D'];
                }

                return mapped;
            });

            finalQuestions = [...finalQuestions, ...dbQuestions];
        }
    } catch (e) {
        console.error("[BankService] Supabase Query Failed", e);
    }

    // --- 2. FALLBACK TO STATIC BANK (IF NEEDED) ---
    // Note: Static bank items need to be coerced to new type if used
    if (finalQuestions.length < 5) {
        const staticQs = QUESTION_BANK.filter(q => q.skill_id === numericId).map(q => {
            // Quick patch for static items to match new V1 interface
            return {
                ...q,
                section: (q.skill_type || 'structure') as any,
                interaction: (q.interaction || 'multiple_choice') as any,
                stimulus: q.stimulus || { text: (q.metadata as any)?.passage_text }
            } as QuizData;
        });

        finalQuestions = [...finalQuestions, ...staticQs];
    }

    // --- 3. SHUFFLE & SLICE ---
    const unique = Array.from(new Map(finalQuestions.map(item => [item.prompt, item])).values());

    return unique.sort(() => 0.5 - Math.random()).slice(0, limit);
};

export const getUserBankCount = async (): Promise<number> => {
    const { count, error } = await supabase
        .from('question_bank')
        .select('*', { count: 'exact', head: true });

    if (error) return 0;
    return count || 0;
};

// --- NEW CRUD OPERATIONS ---

/**
 * Helper: Map DB row to QuizData interface
 */
const mapDbToQuizData = (d: any): QuizData => ({
    id: d.id,
    skill_id: d.skill_id,
    section: d.section,
    interaction: d.interaction,
    skill_type: d.section, // Legacy support
    prompt: d.prompt,
    choices: d.choices || [],
    correct_response: d.correct_response || [],
    cefr_target: d.cefr_target,
    difficulty_score: d.difficulty_score,
    stimulus: d.stimulus || {},
    metadata: {
        source: 'db',
        explanation: d.metadata?.explanation || "",
        pattern_tip: d.metadata?.pattern_tip,
        referenced_text: d.metadata?.referenced_text,
        hints: d.metadata?.hints || [],
        qti_compliant: true,
        cefr_compliant: true,
    }
});

/**
 * Get all questions with pagination and optional section filter
 * Supports filtering already answered questions with probability-based inclusion
 */
export const getAllQuestions = async (
    page: number = 1,
    limit: number = 20,
    section?: string,
    excludeQuestionIds?: string[],
    includeAnsweredProbability?: number // 0 = exclude all, 0.1 = 10% chance
): Promise<{ questions: QuizData[], total: number }> => {
    const offset = (page - 1) * limit;

    let query = supabase
        .from('question_bank')
        .select('*', { count: 'exact' })
        .neq('metadata->>source', 'pdf')
        .order('created_at', { ascending: false });

    if (section && section !== 'all') {
        query = query.eq('section', section);
    }

    // Filter out already answered questions (jika ada)
    if (excludeQuestionIds && excludeQuestionIds.length > 0) {
        // Jika pakai probability, random filter
        if (includeAnsweredProbability && includeAnsweredProbability > 0) {
            // Keep some answered questions based on probability
            const keepAnswered = excludeQuestionIds.filter(
                () => Math.random() < includeAnsweredProbability
            );
            const actualExclude = excludeQuestionIds.filter(
                id => !keepAnswered.includes(id)
            );
            if (actualExclude.length > 0) {
                query = query.not('id', 'in', `(${actualExclude.join(',')})`);
            }
            console.log(`[BankService] Filtering: ${actualExclude.length}/${excludeQuestionIds.length} answered questions excluded (${keepAnswered.length} kept with ${includeAnsweredProbability * 100}% probability)`);
        } else {
            // Exclude all answered questions
            query = query.not('id', 'in', `(${excludeQuestionIds.join(',')})`);
            console.log(`[BankService] Filtering: ${excludeQuestionIds.length} answered questions excluded (100%)`);
        }
    }

    // Apply pagination after filtering
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
        console.error('[BankService] Failed to fetch all questions:', error);
        throw error;
    }

    // Fetch passages for reading questions that have passage_id
    const passageIds = (data || [])
        .filter((d: any) => d.stimulus?.passage_id)
        .map((d: any) => d.stimulus.passage_id);

    const passagesMap = new Map<string, any>();

    if (passageIds.length > 0) {
        const { data: passages, error: passageError } = await supabase
            .from('passages')
            .select('*')
            .in('id', passageIds);

        if (!passageError && passages) {
            passages.forEach((p: any) => passagesMap.set(p.id, p));
        }
    }

    // Map questions and reconstruct passages
    const mappedQuestions = (data || []).map((d: any) => {
        let stimulus = d.stimulus || {};

        // Reconstruct passage text if passage_id exists
        if (d.stimulus?.passage_id) {
            const passage = passagesMap.get(d.stimulus.passage_id);
            if (passage) {
                stimulus = {
                    ...d.stimulus,
                    text: passage.text
                };
            }
        }

        // FIX: Skip structure questions that have empty or placeholder choices
        const choices = d.choices || [];
        if (d.section === 'structure' && d.interaction === 'fill_blank') {
            const hasPlaceholders = choices.some((c: string) =>
                c === 'option B' || c === 'option C' || c === 'option D' || c === 'Option N/A'
            );
            if (choices.length < 4 || hasPlaceholders) {
                console.warn(`[BankService] Skipping structure question ${d.id} - invalid choices:`, choices);
                return null; // Will be filtered out
            }
        }

        return {
            id: d.id,
            skill_id: d.skill_id,
            section: d.section,
            skill_type: d.section,
            interaction: d.interaction,
            prompt: d.prompt,
            choices: choices,
            correct_response: d.correct_response || [],
            cefr_target: d.cefr_target,
            difficulty_score: d.difficulty_score,
            stimulus: stimulus,
            metadata: {
                source: 'db' as const,
                explanation: d.metadata?.explanation || "",
                pattern_tip: d.metadata?.pattern_tip,
                referenced_text: d.metadata?.referenced_text,
                hints: d.metadata?.hints || [],
                qti_compliant: true,
                cefr_compliant: true,
            }
        };
    }).filter((q: any) => q !== null) as QuizData[];

    return {
        questions: mappedQuestions,
        total: count || 0
    };
};


/**
 * Get random questions for simulation with proper exclusion
 * Uses Postgres random() for truly random ordering
 * Excludes already answered questions with probability-based inclusion
 */
export const getRandomQuestionsForSimulation = async (
    section: string,
    limit: number,
    excludeQuestionIds: string[] = [],
    includeAnsweredProbability: number = 0.1 // Default 10%
): Promise<QuizData[]> => {
    console.log(`[BankService] Getting ${limit} random ${section} questions...`);
    console.log(`[BankService] Excluding ${excludeQuestionIds.length} answered questions (${(includeAnsweredProbability * 100).toFixed(0)}% may return)`);

    // Determine which answered questions to actually exclude based on probability
    const actualExcludeIds: string[] = [];
    const keptIds: string[] = [];

    if (excludeQuestionIds.length > 0) {
        for (const id of excludeQuestionIds) {
            if (Math.random() < includeAnsweredProbability) {
                keptIds.push(id); // 10% chance to keep
            } else {
                actualExcludeIds.push(id); // 90% chance to exclude
            }
        }
        console.log(`[BankService] Probability filter: ${actualExcludeIds.length} excluded, ${keptIds.length} kept (10% chance)`);
    }

    // Use RPC call to get random questions with exclusion
    // First, build the query
    let query = supabase
        .from('question_bank')
        .select('*')
        .eq('section', section)
        .neq('metadata->>source', 'pdf');

    // Exclude answered questions (those not kept by probability)
    if (actualExcludeIds.length > 0) {
        // Supabase doesn't support NOT IN directly with arrays, use filter
        query = query.not('id', 'in', `(${actualExcludeIds.join(',')})`);
    }

    // Fetch more than needed to allow for shuffling
    const { data, error } = await query.limit(limit * 3);

    if (error) {
        console.error('[BankService] Failed to fetch questions:', error);
        throw error;
    }

    if (!data || data.length === 0) {
        console.warn(`[BankService] No questions found for section ${section}`);
        return [];
    }

    console.log(`[BankService] Fetched ${data.length} questions from database`);

    // Shuffle using Fisher-Yates algorithm for true randomness
    const shuffled = [...data];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Take only what we need
    const selected = shuffled.slice(0, limit);

    // Fetch passages for reading questions that have passage_id
    const passageIds = selected
        .filter((d: any) => d.stimulus?.passage_id)
        .map((d: any) => d.stimulus.passage_id);

    const passagesMap = new Map<string, any>();

    if (passageIds.length > 0) {
        const { data: passages, error: passageError } = await supabase
            .from('passages')
            .select('*')
            .in('id', passageIds);

        if (!passageError && passages) {
            passages.forEach((p: any) => passagesMap.set(p.id, p));
        }
    }

    // Map questions
    const mappedQuestions = selected.map((d: any) => {
        let stimulus = d.stimulus || {};

        // Reconstruct passage text if passage_id exists
        if (d.stimulus?.passage_id) {
            const passage = passagesMap.get(d.stimulus.passage_id);
            if (passage) {
                stimulus = {
                    ...d.stimulus,
                    text: passage.text
                };
            }
        }

        // FIX: Ensure choices are valid (not placeholders)
        const choices = d.choices || [];
        const hasPlaceholders = choices.some((c: string) =>
            c === 'option B' || c === 'option C' || c === 'option D' || c === 'Option N/A'
        );

        if (hasPlaceholders) {
            console.warn(`[BankService] Question ${d.id} has placeholder choices, skipping`);
            return null; // Will be filtered out
        }

        return {
            id: d.id,
            skill_id: d.skill_id,
            section: d.section,
            skill_type: d.section,
            interaction: d.interaction,
            prompt: d.prompt,
            choices: choices,
            correct_response: d.correct_response || [],
            cefr_target: d.cefr_target,
            difficulty_score: d.difficulty_score,
            stimulus: stimulus,
            metadata: {
                source: 'db' as const,
                explanation: d.metadata?.explanation || "",
                pattern_tip: d.metadata?.pattern_tip,
                referenced_text: d.metadata?.referenced_text,
                hints: d.metadata?.hints || [],
                qti_compliant: true,
                cefr_compliant: true,
            }
        };
    }).filter(q => q !== null) as QuizData[];

    console.log(`[BankService] Returning ${mappedQuestions.length} valid questions for ${section}`);
    return mappedQuestions;
};


/**
 * Create new question in database
 */
export const createQuestion = async (
    question: Partial<QuizData>
): Promise<QuizData> => {
    const sanitized = enforcePhase2Rules(question);

    // Handle ACL rejection
    if (!sanitized) {
        throw new Error('[BankService] Question rejected by ACL quality gate');
    }

    const payload = {
        skill_id: sanitized.skill_id,
        section: sanitized.section,
        interaction: sanitized.interaction,
        prompt: sanitized.prompt,
        choices: sanitized.choices,
        correct_response: sanitized.correct_response,
        cefr_target: sanitized.cefr_target,
        difficulty_score: sanitized.difficulty_score,
        stimulus: sanitized.stimulus,
        metadata: sanitized.metadata,
        created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
        .from('question_bank')
        .insert([payload])
        .select()
        .single();

    if (error) {
        console.error('[BankService] Failed to create question:', error);
        throw error;
    }

    return mapDbToQuizData(data);
};

/**
 * Update existing question
 */
export const updateQuestion = async (
    id: string,
    updates: Partial<QuizData>
): Promise<QuizData> => {
    const sanitized = enforcePhase2Rules(updates);

    // Handle ACL rejection
    if (!sanitized) {
        throw new Error('[BankService] Update rejected by ACL quality gate');
    }

    const payload: any = {};
    if (sanitized.skill_id !== undefined) payload.skill_id = sanitized.skill_id;
    if (sanitized.section !== undefined) payload.section = sanitized.section;
    if (sanitized.interaction !== undefined) payload.interaction = sanitized.interaction;
    if (sanitized.prompt !== undefined) payload.prompt = sanitized.prompt;
    if (sanitized.choices !== undefined) payload.choices = sanitized.choices;
    if (sanitized.correct_response !== undefined) payload.correct_response = sanitized.correct_response;
    if (sanitized.cefr_target !== undefined) payload.cefr_target = sanitized.cefr_target;
    if (sanitized.difficulty_score !== undefined) payload.difficulty_score = sanitized.difficulty_score;
    if (sanitized.stimulus !== undefined) payload.stimulus = sanitized.stimulus;
    if (sanitized.metadata !== undefined) payload.metadata = sanitized.metadata;

    const { data, error } = await supabase
        .from('question_bank')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('[BankService] Failed to update question:', error);
        throw error;
    }

    return mapDbToQuizData(data);
};

/**
 * Delete question from database
 */
export const deleteQuestion = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('question_bank')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('[BankService] Failed to delete question:', error);
        throw error;
    }
};

/**
 * Regenerate AI distractors for structure questions with placeholder choices
 * This updates existing database records with proper AI-generated distractors
 */
export const regenerateStructureDistractors = async (): Promise<{ updated: number, failed: number }> => {
    // Dynamically import to avoid circular dependency
    const { generateDistractors } = await import('./groq/generators');

    // Find structure questions with placeholder choices
    const { data, error } = await supabase
        .from('question_bank')
        .select('id, prompt, choices, correct_response')
        .eq('section', 'structure')
        .eq('interaction', 'fill_blank');

    if (error || !data) {
        console.error('[BankService] Failed to fetch structure questions:', error);
        return { updated: 0, failed: 0 };
    }

    // Filter questions that have placeholder choices
    const needsUpdate = data.filter((q: any) => {
        const choices = q.choices || [];
        return choices.some((c: string) =>
            c === 'alternative option' ||
            c === 'another choice' ||
            c === 'different answer' ||
            c?.startsWith('option ')
        );
    });

    console.log(`[BankService] Found ${needsUpdate.length} structure questions needing distractor update`);

    let updated = 0;
    let failed = 0;

    for (const q of needsUpdate) {
        try {
            const correctAnswer = (q.correct_response || [])[0] || 'answer';
            const newChoices = await generateDistractors(q.prompt, correctAnswer);

            const { error: updateError } = await supabase
                .from('question_bank')
                .update({ choices: newChoices })
                .eq('id', q.id);

            if (updateError) {
                console.error(`[BankService] Failed to update ${q.id}:`, updateError);
                failed++;
            } else {
                console.log(`[BankService] Updated distractors for ${q.id}`);
                updated++;
            }

            // Rate limit: small delay between API calls
            await new Promise(resolve => setTimeout(resolve, 300));
        } catch (e) {
            console.error(`[BankService] Error processing ${q.id}:`, e);
            failed++;
        }
    }

    return { updated, failed };
};
