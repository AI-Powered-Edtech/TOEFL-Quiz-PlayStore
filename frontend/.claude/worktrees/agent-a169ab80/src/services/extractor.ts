import { callGroq, cleanJson } from './groq/client';
import { z } from "zod";
import { retryWithBackoff, RetryOptions } from '../utils/retry';

const EXTRACTOR_RETRY_CONFIG: RetryOptions = {
    maxAttempts: 4,
    initialDelayMs: 2000,   // 2s
    maxDelayMs: 20000,      // 20s
    backoffMultiplier: 2.5  // 2s, 5s, 12s, 20s
};

// ============================================================================
// SCHEMA DEFINITION - Multi-Section Output
// ============================================================================

const QuestionSchema = z.object({
    number: z.string().optional(),
    prompt: z.string(),
    options: z.array(z.string()),
    predicted_answer: z.string().optional(),
    explanation: z.string().optional(),
    detected_section: z.enum(['structure', 'written', 'reading', 'listening']).optional()
}).passthrough();

const SegmentSchema = z.object({
    passage: z.string().optional(),
    questions: z.array(QuestionSchema)
}).passthrough();

// NEW: Multi-section grouped schema
export const MultiSectionExtractionSchema = z.object({
    sections: z.object({
        structure: z.array(SegmentSchema).default([]),
        written: z.array(SegmentSchema).default([]),
        reading: z.array(SegmentSchema).default([]),
        listening: z.array(SegmentSchema).default([])
    }),
    total_extracted: z.number(),
    extraction_confidence: z.number().min(0).max(1),
    extraction_failed: z.boolean().optional()
}).passthrough();

export type MultiSectionExtraction = z.infer<typeof MultiSectionExtractionSchema>;

// Backward compatibility - keep old schema
export const ToeflPageSchema = z.object({
    detected_section: z.enum(['structure', 'written', 'reading', 'listening']),
    segments: z.array(SegmentSchema)
}).passthrough();

export type ExtractedToeflData = z.infer<typeof ToeflPageSchema>;

// ============================================================================
// MODEL INITIALIZATION
// ============================================================================

// Model is now securely accessed via callGroq edge function proxy

// ============================================================================
// CHUNKING HELPERS
// ============================================================================

const CHUNK_SIZE = 25000;
const MAX_TOTAL_CHARS = 100000;

// Smart chunking that preserves question boundaries
const chunkText = (text: string, chunkSize: number = CHUNK_SIZE): string[] => {
    if (text.length <= chunkSize) return [text];

    const chunks: string[] = [];
    let remaining = text.length > MAX_TOTAL_CHARS
        ? text.substring(0, MAX_TOTAL_CHARS)
        : text;

    if (text.length > MAX_TOTAL_CHARS) {
        console.warn(`[Extractor] Text truncated from ${text.length} to ${MAX_TOTAL_CHARS} chars`);
    }

    while (remaining.length > 0) {
        if (remaining.length <= chunkSize) {
            chunks.push(remaining);
            break;
        }

        // Try to find question boundary markers
        const questionMarkers = [
            /\n\n\d+\./g,          // "1.", "2." at start of line
            /\n\n[A-D]\)/g,        // "(A)", "(B)" at start of line
            /\n\n---+\n/g          // Horizontal rule separator
        ];

        let breakPoint = -1;

        // Try each marker pattern
        for (const pattern of questionMarkers) {
            const matches = Array.from(remaining.matchAll(pattern));
            const validMatches = matches.filter(m => m.index && m.index < chunkSize && m.index > chunkSize / 2);
            if (validMatches.length > 0) {
                const lastMatch = validMatches[validMatches.length - 1];
                breakPoint = lastMatch.index!;
                break;
            }
        }

        // Fallback to paragraph/sentence breaks
        if (breakPoint === -1) {
            breakPoint = remaining.lastIndexOf('\n\n', chunkSize);
            if (breakPoint < chunkSize / 2) {
                breakPoint = remaining.lastIndexOf('\n', chunkSize);
            }
            if (breakPoint < chunkSize / 2) {
                breakPoint = remaining.lastIndexOf('. ', chunkSize);
            }
            if (breakPoint < chunkSize / 2) {
                breakPoint = chunkSize;
            }
        }

        chunks.push(remaining.substring(0, breakPoint));
        remaining = remaining.substring(breakPoint).trim();
    }

    console.log(`[Extractor] Split into ${chunks.length} chunks`);
    return chunks;
};

// ============================================================================
// EXTRACTION LOGIC
// ============================================================================

const extractChunk = async (chunkText: string, chunkIndex: number): Promise<MultiSectionExtraction | null> => {
    const prompt = `You are a TOEFL Document Parser in STRICT EXTRACTION MODE.

CRITICAL RULES:
1. ONLY extract questions that LITERALLY exist in the text
2. DO NOT create, invent, modify, or paraphrase questions
3. Copy text VERBATIM including all formatting

SECTION DETECTION (VERY IMPORTANT - detect per question):

**STRUCTURE (Skills 1-19)**: Fill-in-the-blank sentences with _____ 
- Example: "The company _____ its profits last year."
- Has OPTIONS like: (A) increased (B) increase (C) increasing (D) increases
- User selects ONE correct word/phrase to fill the blank

**WRITTEN EXPRESSION (Skills 20-60)**: Error identification - find the WRONG part
- Has numbered parts in the sentence: "(A) Despite of (B) the rain, (C) we went (D) outside."
- Or underlined/highlighted portions: "The child was playing (A) happy (B) in the (C) garden (D) alone."
- User identifies which part (A/B/C/D) contains the ERROR
- NO fill-in-blank, just identify the mistake
- If a question asks to find the error or incorrect part, it's WRITTEN

**READING (Skills 101+)**: Long passage followed by comprehension questions
**LISTENING (Skills 201+)**: Audio-based questions (mentions "you will hear")

SKILL CLASSIFICATION (classify each question to specific skill):
STRUCTURE (1-19):
1=Subject/Verb basics, 2=Object of preposition, 3=Appositives, 4=Present participle, 5=Past participle
6=Coordinate connectors, 7=Adverb time/cause, 8=Other adverb connectors, 9=Noun clause connectors, 10=Noun clause subjects
11=Adjective clause connectors, 12=Adjective clause subjects, 13=Reduced adjective, 14=Reduced adverb
15=Invert question words, 16=Invert place, 17=Invert negatives, 18=Invert conditionals, 19=Invert comparisons

WRITTEN (20-60):
20-23=Subject/verb agreement, 24-26=Parallel structure, 27-29=Comparatives
30-32=Verb forms (have+pp, be+ing, modal+base), 33-36=Verb use (tense, have/had, will/would)
37-38=Passive voice, 39-42=Nouns (singular/plural, countable), 43-45=Pronouns
46-48=Adjectives/adverbs, 49-51=More adjectives (-ly, predicate, -ed/-ing)
52-55=Articles (a/an/the), 56-57=Prepositions, 58-60=Usage (make/do, like/alike)

OUTPUT FORMAT:
{
  "sections": {
    "structure": [{ "passage": "", "questions": [...] }],
    "written": [{ "passage": "", "questions": [...] }],
    "reading": [{ "passage": "...", "questions": [...] }],
    "listening": [{ "passage": "", "questions": [...] }]
  },
  "total_extracted": <number>,
  "extraction_confidence": <0.0-1.0>,
  "extraction_failed": false
}

QUESTION FORMAT:
{
  "number": "1",
  "prompt": "EXACT question text from PDF",
  "options": ["A text", "B text", "C text", "D text"],
  "predicted_answer": "A",
  "explanation": "Brief explanation why this is correct/incorrect",
  "detected_section": "structure|written|reading|listening",
  "skill_id": <1-60 based on grammar concept tested>
}

CONFIDENCE SCORING:
- 1.0: Clear TOEFL questions with standard format
- 0.7: Questions found but format is non-standard
- 0.3: Text looks like questions but unclear
- 0.0: No questions found

If NO questions exist, return:
{
  "sections": {"structure": [], "written": [], "reading": [], "listening": []},
  "total_extracted": 0,
  "extraction_confidence": 0.0,
  "extraction_failed": true
}

OUTPUT ONLY VALID JSON - no markdown, no explanations.

CHUNK ${chunkIndex + 1} TEXT:
${chunkText}`;

    try {
        const content = await retryWithBackoff(
            () => callGroq([
                { role: "system", content: "You are a TOEFL Document Parser in STRICT EXTRACTION MODE." },
                { role: "user", content: prompt }
            ], 0.0, { jsonMode: true }),
            EXTRACTOR_RETRY_CONFIG
        );

        // Clean JSON from markdown
        const jsonStr = cleanJson(content);

        const parsed = JSON.parse(jsonStr);

        // Validate structure
        if (!parsed.sections) {
            console.warn(`[Extractor] Chunk ${chunkIndex + 1}: Missing 'sections' field`);
            return {
                sections: { structure: [], written: [], reading: [], listening: [] },
                total_extracted: 0,
                extraction_confidence: 0.0,
                extraction_failed: true
            };
        }

        // Ensure all sections exist
        const result: MultiSectionExtraction = {
            sections: {
                structure: parsed.sections.structure || [],
                written: parsed.sections.written || [],
                reading: parsed.sections.reading || [],
                listening: parsed.sections.listening || []
            },
            total_extracted: parsed.total_extracted || 0,
            extraction_confidence: parsed.extraction_confidence || 0.5,
            extraction_failed: parsed.extraction_failed || false
        };

        return result;

    } catch (error: any) {
        console.error(`[Extractor] Chunk ${chunkIndex + 1} failed:`, error.message);
        // Log first 500 chars of response for debugging
        if (error.message.includes('JSON')) {
            console.error('[Extractor] JSON parse error - likely malformed response');
        }
        return null;
    }
};

// ============================================================================
// MAIN EXTRACTION FUNCTIONS
// ============================================================================

/**
 * NEW: Extract with multi-section grouping
 * Uses Compound (agentic AI) as primary with LLM fallback
 */
export const extractMultiSection = async (rawPdfText: string, useCompound: boolean = false): Promise<MultiSectionExtraction | null> => {
    console.log(`[Extractor] Processing ${rawPdfText.length} chars (multi-section mode, compound: ${useCompound})`);

    // Try Compound first if enabled (better accuracy with web search + code)
    if (useCompound) {
        try {
            console.log('[Extractor] 🤖 Using Compound for extraction...');
            const { extractWithCompound } = await import('./groq/compoundClient');
            const compoundResult = await extractWithCompound(rawPdfText, {
                validateWithWeb: true,
                analyzeWithCode: true
            });

            // Parse Compound response
            const cleaned = compoundResult.content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
            const parsed = JSON.parse(cleaned);

            if (parsed.questions?.length > 0) {
                console.log(`[Extractor] ✅ Compound extracted ${parsed.questions.length} questions`);

                // Transform Compound format to MultiSectionExtraction
                const sections: MultiSectionExtraction['sections'] = {
                    structure: [],
                    written: [],
                    reading: [],
                    listening: []
                };

                // Group questions by section
                for (const q of parsed.questions) {
                    const section = q.section || 'structure';
                    if (!sections[section as keyof typeof sections]) continue;

                    sections[section as keyof typeof sections].push({
                        passage: q.stimulus?.text || '',
                        questions: [{
                            number: String(parsed.questions.indexOf(q) + 1),
                            prompt: q.prompt,
                            options: q.choices || [],
                            predicted_answer: q.correct_response?.[0] || 'A',
                            explanation: q.explanation || '',
                            detected_section: section,
                            skill_id: q.skill_id
                        }]
                    });
                }

                const totalExtracted = Object.values(sections)
                    .flat()
                    .reduce((sum, seg) => sum + seg.questions.length, 0);

                // Log section counts
                console.log(`[Extractor] 📊 Structure: ${sections.structure.length}, Written: ${sections.written.length}, Reading: ${sections.reading.length}, Listening: ${sections.listening.length}`);

                return {
                    sections,
                    total_extracted: totalExtracted,
                    extraction_confidence: 0.9, // Compound typically higher accuracy
                    extraction_failed: false
                };
            }
        } catch (error: any) {
            console.warn('[Extractor] ⚠️ Compound failed, falling back to LLM:', error.message);
        }
    }

    // Fallback: Standard LLM extraction
    const chunks = chunkText(rawPdfText);
    const results: MultiSectionExtraction[] = [];

    for (let i = 0; i < chunks.length; i++) {
        console.log(`🤖 Extracting chunk ${i + 1}/${chunks.length}...`);
        const result = await extractChunk(chunks[i], i);
        if (result && result.total_extracted > 0) {
            results.push(result);
        }

        if (i < chunks.length - 1) {
            await new Promise(r => setTimeout(r, 500));
        }
    }

    if (results.length === 0) {
        console.error("[Extractor] No questions extracted from any chunk");
        return {
            sections: { structure: [], written: [], reading: [], listening: [] },
            total_extracted: 0,
            extraction_confidence: 0.0,
            extraction_failed: true
        };
    }

    // Merge all chunks
    const merged: MultiSectionExtraction = {
        sections: {
            structure: results.flatMap(r => r.sections.structure),
            written: results.flatMap(r => r.sections.written),
            reading: results.flatMap(r => r.sections.reading),
            listening: results.flatMap(r => r.sections.listening)
        },
        total_extracted: results.reduce((sum, r) => sum + r.total_extracted, 0),
        extraction_confidence: results.reduce((sum, r) => sum + r.extraction_confidence, 0) / results.length,
        extraction_failed: false
    };

    console.log(`✅ Extracted ${merged.total_extracted} questions (confidence: ${merged.extraction_confidence.toFixed(2)})`);
    console.log(`   Structure: ${merged.sections.structure.flatMap(s => s.questions).length}`);
    console.log(`   Written: ${merged.sections.written.flatMap(s => s.questions).length}`);
    console.log(`   Reading: ${merged.sections.reading.flatMap(s => s.questions).length}`);
    console.log(`   Listening: ${merged.sections.listening.flatMap(s => s.questions).length}`);

    return merged;
};

/**
 * OLD: Keep for backward compatibility
 */
export const smartExtractTOEFL = async (rawPdfText: string): Promise<ExtractedToeflData | null> => {
    console.log(`[Extractor] Processing ${rawPdfText.length} chars (legacy mode)`);

    const chunks = chunkText(rawPdfText);
    const results: ExtractedToeflData[] = [];

    for (let i = 0; i < chunks.length; i++) {
        console.log(`🤖 Extracting chunk ${i + 1}/${chunks.length}...`);

        // Use simpler single-section extraction for backward compat
        const prompt = `Extract TOEFL questions EXACTLY as written. Return JSON:
{"detected_section": "structure|written|reading|listening", "segments": [{"passage": "...", "questions": [...]}]}

Text: ${chunks[i]}`;

        try {
            const content = await callGroq([
                { role: "user", content: prompt }
            ], 0.0, { jsonMode: true });

            const parsed = JSON.parse(cleanJson(content));
            if (parsed.segments?.length > 0) {
                results.push(parsed);
            }
        } catch (e) {
            console.warn(`Chunk ${i + 1} extraction failed`);
        }

        if (i < chunks.length - 1) {
            await new Promise(r => setTimeout(r, 500));
        }
    }

    if (results.length === 0) return null;

    return {
        detected_section: results[0].detected_section,
        segments: results.flatMap(r => r.segments)
    };
};
