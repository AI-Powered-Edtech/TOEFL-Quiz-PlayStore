import { callGroq, cleanJson } from './client';
import { parseJsonSafely } from './utils/jsonParser';

/**
 * Generate Writing Gym exercise using AI
 * Supports Mason, Logic Weaver, and IELTS Paragraph levels
 */
export const generateWritingGymExercise = async (
    level: 'mason' | 'logic_weaver' | 'ielts_paragraph',
    difficulty: 'beginner' | 'intermediate' | 'advanced' = 'intermediate',
    skillId?: string,
    topic?: string
): Promise<any> => {
    // API key is handled by Edge Function

    const { MASON_PROMPT, LOGIC_WEAVER_PROMPT, WRITING_GYM_SYSTEM_PROMPT } = await import('./prompts/writingGym');

    // Extract numeric level from skillId (e.g., "S5" -> 5)
    // Note: This levelNumber is mostly for tracking, we now use specific skill content
    const levelNumber = skillId ? parseInt(skillId.replace(/\D/g, ''), 10) : 1;

    // Add uniqueness seed based on timestamp
    const uniqueSeed = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);

    let userPrompt = '';

    if (level === 'mason') {
        // Random topic seed for variety (like Logic Weaver)
        const masonTopics = [
            'Climate Science', 'Artificial Intelligence', 'Marine Biology', 'Space Exploration',
            'Psychology', 'Ancient History', 'Renewable Energy', 'Urban Planning',
            'Nutrition Science', 'Genetic Engineering', 'Digital Privacy', 'Economic Policy',
            'Volcanic Geology', 'Endangered Species', 'Quantum Physics', 'Cultural Anthropology',
            'Cognitive Development', 'Sustainable Agriculture', 'Neuroscience', 'Archaeology'
        ];
        const randomMasonTopic = masonTopics[Math.floor(Math.random() * masonTopics.length)];

        userPrompt = `${MASON_PROMPT}\n\nSkill Level: ${levelNumber}/50\nDifficulty: ${difficulty}\nMANDATORY TOPIC: ${randomMasonTopic} (you MUST create a sentence about this specific topic)\n${topic ? `Additional context: ${topic}` : ''}\nUniqueness Seed: ${uniqueSeed} (use this to ensure unique content each time)\n\nCRITICAL: Generate a COMPLETELY NEW sentence about "${randomMasonTopic}". Do NOT reuse any previous sentences.`;
    } else if (level === 'logic_weaver') {
        // Enhance with skill-specific connector context
        let skillContext = "";
        let relationshipFocus = "";
        let skillSpecificPrompt = "";

        if (skillId) {
            // Import per-skill prompt
            const { getLogicWeaverSkillPrompt } = await import('./prompts/logicWeaverLevels');
            skillSpecificPrompt = getLogicWeaverSkillPrompt(skillId);
            const { getLogicWeaverSkill } = await import('../../data/logicWeaverSkills');
            const skill = getLogicWeaverSkill(skillId);
            if (skill) {
                skillContext = `TARGET SKILL: "${skill.name}"\nDESCRIPTION: ${skill.description}\nREQUIRED CONNECTORS: ${skill.connectors.join(', ')}\nDIFFICULTY: ${skill.difficulty}`;
                // Map skill to relationship focus
                const relationshipMap: Record<string, string> = {
                    'Cause & Effect I': 'cause_effect',
                    'Cause & Effect II': 'cause_effect',
                    'Contrast I': 'contrast',
                    'Contrast II': 'contrast',
                    'Addition I': 'addition',
                    'Sequence': 'sequence',
                    'Example': 'example',
                    'Condition I': 'condition',
                    'Clarification': 'clarification',
                    'Emphasis': 'emphasis',
                    'Comparison': 'comparison',
                    'Purpose': 'purpose',
                    'Complex Condition': 'condition',
                    'Concession': 'concession',
                    'Summary': 'summary',
                    'Alternative': 'alternative'
                };
                relationshipFocus = relationshipMap[skill.name] || 'contrast';
            }
        }

        // Random topic seed from list of 20 topics
        const topicSeeds = [
            'Climate Science', 'Technology', 'Education', 'Economics', 'Health',
            'Psychology', 'Biology', 'Physics', 'Sociology', 'History',
            'Linguistics', 'Art & Culture', 'Law & Ethics', 'Urban Planning',
            'Environmental Policy', 'Business', 'Philosophy', 'Anthropology',
            'Astronomy', 'Marine Science'
        ];
        const randomTopic = topicSeeds[Math.floor(Math.random() * topicSeeds.length)];

        userPrompt = `${LOGIC_WEAVER_PROMPT}\n\n${skillContext}\n\nRELATIONSHIP FOCUS: ${relationshipFocus || 'any'}\nSUGGESTED TOPIC: ${topic || randomTopic}\nSkill Level: ${levelNumber}/50\nDifficulty: ${difficulty}\nUniqueness Seed: ${uniqueSeed}\n\n${skillSpecificPrompt}\n\nCRITICAL: Generate content about "${topic || randomTopic}" using the "${relationshipFocus || 'contrast'}" relationship type. Make sure the correct_connector is from the required connectors list if provided.`;
    } else if (level === 'ielts_paragraph') {
        const IELTS_PARAGRAPH_PROMPT = `
        You are an IELTS Writing Task 2 Examiner.
        Generate a "Paragraph Builder" exercise.
        
        GOAL:
        Create a 3-step exercise where the user builds a high-scoring body paragraph.
        
        STRUCTURE:
        1. Task Prompt: A short IELTS Task 2 topic statement.
        2. Steps: EXACTLY 3 steps (Topic Sentence, Supporting Detail, Example).
        3. Options: EXACTLY 3 options per step (Band 9, Band 8, Band 7).
        
        CRITICAL RULES:
        - NEVER return an empty options array.
        - NEVER truncate the JSON.
        - Ensure "id", "text", "band_level", and "feedback" are present for EVERY option.
        - "band_level" must be 9, 8, or 7.
        - LENGTH RULE: All options MUST be of similar length (within 10-15%). The difference should be in VOCABULARY and GRAMMAR, not length.
        - Band 9: Sophisticated vocabulary, complex structure, precise tone.
        - Band 8: Strong vocabulary, clear structure, minor missed opportunities for sophistication.
        - Band 7: Good vocabulary, clear meaning, slightly simpler or repetitive structure.
        
        EXAMPLE OUTPUT SCHEMA:
        {
          "task_prompt": "Topic statement...",
          "steps": [
            {
              "step_type": "Topic Sentence",
              "options": [
                { "id": "A", "text": "Complex sentence...", "band_level": 9, "feedback": "Sophisticated." },
                { "id": "B", "text": "Strong sentence...", "band_level": 8, "feedback": "Strong but standard." },
                { "id": "C", "text": "Good sentence...", "band_level": 7, "feedback": "Clear but simple." }
              ]
            }
            // ... exactly 3 steps total
          ]
        }
        
        Return ONLY valid JSON.
        `;

        userPrompt = `${IELTS_PARAGRAPH_PROMPT}\n\nTopic: ${topic || 'Random Academic Topic'}\nUniqueness Seed: ${uniqueSeed}\nGenerate the exercise now.`;
    }

    let content = "";
    try {
        content = await callGroq([
            { role: "system", content: WRITING_GYM_SYSTEM_PROMPT },
            { role: "user", content: userPrompt }
        ], 0.8, { jsonMode: true }); // Higher temperature for variety

        const cleaned = cleanJson(content);
        const parsed = parseJsonSafely(cleaned);

        // Validate Logic Weaver response
        if (level === 'logic_weaver') {
            // Normalize flat structure if needed
            if (parsed.main_clause && parsed.subordinate_clause && !parsed.clauses) {
                parsed.clauses = {
                    main: parsed.main_clause,
                    subordinate: parsed.subordinate_clause
                };
            }

            if (!parsed.clauses || !parsed.clauses.main || !parsed.clauses.subordinate || (!parsed.options && !parsed.connectors)) {
                throw new Error("Invalid Logic Weaver generation: Missing clauses or options");
            }

            // Normalize options
            if (!parsed.options && parsed.connectors) {
                parsed.options = parsed.connectors;
            }
            
            // Normalize correct answer
            if (!parsed.correct_answer && parsed.correct_connector) {
                parsed.correct_answer = parsed.correct_connector;
            }
        }

        return parsed;
    } catch (e) {
        console.error("[WritingGym] Generation failed:", e);
        console.error("[WritingGym] Raw Content:", content);
        throw e;
    }
};
