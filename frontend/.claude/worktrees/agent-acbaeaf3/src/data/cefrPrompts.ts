/**
 * CEFR Test Generation Prompts
 * 
 * This file contains all AI prompts used for generating CEFR test content.
 * Extracted from CefrSimulationView.tsx for maintainability.
 */

// === Reading Section Prompts ===

export const READING_PROMPT = `You are generating a challenging CEFR Reading test at B1-C1 level. Return ONLY valid JSON.

{
  "part1": [
    { "id": "r1_1", "text": "The committee insisted that the proposal ___ reviewed before the deadline.", "options": ["be", "is", "was", "will be"], "correctAnswer": "be" },
    { "id": "r1_2", "text": "Had the government ___ earlier, the economic crisis might have been averted.", "options": ["intervened", "intervene", "intervening", "to intervene"], "correctAnswer": "intervened" }
  ],
  "part2": {
    "passage": "A B2-level passage of at least 300 words about a real-world topic (urbanization, psychology, economics, etc.)...",
    "questions": [
      { "id": "r2_1", "text": "What can be inferred from the third paragraph?", "options": ["Option A", "Option B", "Option C", "Option D"], "correctAnswer": "Option A" }
    ]
  },
  "part3": {
    "passage": "A C1-level academic passage of at least 400 words about a complex topic (neuroscience, philosophy, environmental policy, etc.)...",
    "questions": [
      { "id": "r3_1", "text": "Which of the following best captures the author's underlying argument?", "options": ["Option A", "Option B", "Option C", "Option D"], "correctAnswer": "Option B" }
    ]
  }
}

DIFFICULTY REQUIREMENTS:
- part1: 10 fill-in-the-blank questions at B1-C1 grammar level (id "r1_1" to "r1_10"). Test: subjunctive mood, mixed conditionals, phrasal verbs, collocations, relative clauses, inversion, causative structures. NOT simple present tense or basic vocabulary. Each must have "id", "text" (with ___), "options" (4 strings), "correctAnswer".
- part2: A passage of at least 300 words at B2 level + 5 comprehension questions (id "r2_1" to "r2_5"). Questions should test inference, author's purpose, vocabulary in context, and paraphrasing — NOT simple fact recall.
- part3: An academic passage of at least 400 words at C1 level + 5 comprehension questions (id "r3_1" to "r3_5"). Questions should test critical reasoning, distinguishing arguments, evaluating evidence, and understanding rhetorical structure.
- Every question MUST have "id", "text", "options" (array of 4), "correctAnswer".
- All passages must be COMPLETE text, never placeholders.`;

// === Listening Section Prompts ===

export interface ListeningClipSpec {
    id: string;
    difficulty: string;
    num: number;
    questions: number;
    desc: string;
}

export const LISTENING_CLIP_SPECS: ListeningClipSpec[] = [
    {
        id: 'clip1', difficulty: 'B1', num: 1, questions: 5,
        desc: 'A service encounter dialogue (e.g. hotel, restaurant, travel agency). Two speakers [M] and [W]. At least 200 words. Realistic and detailed conversation with specific names, numbers, and details.',
    },
    {
        id: 'clip2', difficulty: 'B2', num: 2, questions: 5,
        desc: 'A radio interview or podcast discussion about technology, education, or urban planning. Two speakers [M] and [W]. At least 300 words. Include expert opinions, statistics, and specific examples.',
    },
    {
        id: 'clip3', difficulty: 'B2', num: 3, questions: 6,
        desc: 'A university lecture excerpt about psychology, environmental science, or history. Single speaker monologue (no tags). At least 350 words. Include academic vocabulary, cause-and-effect reasoning, and references to studies.',
    },
    {
        id: 'clip4', difficulty: 'C1', num: 4, questions: 6,
        desc: 'An extended academic lecture or panel debate about economic policy, medical ethics, or AI regulation. At least 450 words. Dense content with technical vocabulary, counterarguments, and nuanced reasoning. Can use [M] and [W] for panel format.',
    },
];

export const generateListeningPrompt = (spec: ListeningClipSpec): string => {
    const difficultyFocus = spec.difficulty === 'B1' 
        ? 'main ideas, specific details, and speaker intent' 
        : spec.difficulty === 'B2' 
            ? 'inference, paraphrasing, tone, and implied meaning' 
            : 'distinguishing viewpoints, rhetorical devices, counterarguments, and speaker purpose';

    return `Generate ONE listening comprehension clip. Return ONLY valid JSON (a single object, NOT an array).

CRITICAL RULES:
1. "audioScript" must be ONE SINGLE CONTINUOUS STRING. No arrays, no newlines.
2. Every "options" array must contain 4 FULL DESCRIPTIVE ANSWER TEXTS — NOT single letters like "A","B","C","D".
3. Write the COMPLETE audioScript, never use "..." or placeholders.

The clip:
- ID: "${spec.id}"
- Difficulty: ${spec.difficulty}
- Description: ${spec.desc}
- Generate exactly ${spec.questions} questions that test ${difficultyFocus}

Return this EXACT structure:
{
  "id": "${spec.id}",
  "difficulty": "${spec.difficulty}",
  "context": "Short context description",
  "audioScript": "The full dialogue or monologue text as ONE continuous string...",
  "questions": [
    { "id": "${spec.id}_q1", "text": "Why does the woman want to change her booking?", "options": ["She needs a larger room for a meeting", "Her flight was rescheduled to a later date", "The hotel made an error with her reservation", "She received a discount for a different room type"], "correctAnswer": "Her flight was rescheduled to a later date" },
    { "id": "${spec.id}_q2", "text": "What does the man suggest as an alternative?", "options": ["Booking a room at a nearby hotel", "Upgrading to a suite at no extra cost", "Extending the checkout time by two hours", "Moving to a superior room with a city view"], "correctAnswer": "Moving to a superior room with a city view" }
  ]
}

IMPORTANT: Each option must be a COMPLETE SENTENCE OR PHRASE describing the answer, NOT just a letter. Options like "A", "B", "C", "D" are WRONG.`;
};

// === Writing Section Prompts ===

export const WRITING_PROMPT = `You are generating CEFR Writing test prompts. Return ONLY valid JSON.

IMPORTANT: Each value (part1, part2, part3, part4) MUST be a plain STRING — NOT an object, NOT nested.

Return EXACTLY this structure:
{
  "part1": "You received an email from a friend asking about your weekend plans. Write a reply of 80-100 words. You should: describe what you plan to do, invite your friend to join you, and suggest a time and place to meet.",
  "part2": "You recently purchased a product online that arrived damaged. Write a formal letter of complaint to the company (120-150 words). Include: a description of what you ordered, an explanation of the damage, and what action you expect them to take.",
  "part3": "Some people believe that social media has more negative effects than positive ones on society. Write a discussion essay of 200-250 words presenting both sides of the argument and giving your own opinion. Support your points with examples.",
  "part4": "Many universities now offer fully online degree programs. To what extent do you think online education can replace traditional classroom learning? Write an argumentative essay of 250-300 words discussing the advantages and disadvantages. Give your own conclusion."
}

RULES:
- part1, part2, part3, part4 must each be a SINGLE STRING value.
- Do NOT wrap them in objects like {"prompt": "..."}.
- Do NOT use any key names other than part1, part2, part3, part4.
- Generate DIFFERENT topics from the examples above.
- Make each prompt detailed with clear word count targets and specific instructions.`;

// === Speaking Section Prompts ===

export const SPEAKING_PROMPT = `You are generating CEFR Speaking test prompts. Return ONLY valid JSON.

Parts 1-2 are SHADOWING exercises: provide a short audio script that the student must listen to and repeat aloud.
Parts 3-4 are FREE RESPONSE: provide a discussion prompt the student speaks about freely.

Each part has a "prompt" field and a "type" field ("shadowing" or "free_response").

{
  "part1": { "type": "shadowing", "prompt": "The city council has announced plans to convert three downtown parking lots into green spaces. Residents have expressed mixed reactions, with some welcoming the environmental benefits while others worry about reduced parking availability. The project is expected to be completed by next spring." },
  "part2": { "type": "shadowing", "prompt": "Recent studies suggest that exposure to natural environments can significantly reduce cortisol levels and improve cognitive function. Researchers at Stanford University found that participants who walked through forested areas showed a twenty percent decrease in anxiety symptoms compared to those who walked along busy urban streets." },
  "part3": { "type": "free_response", "prompt": "Let's discuss tourism and travel. Do you think international tourism benefits local communities? What are some negative effects of mass tourism? How can governments balance tourism with environmental protection? Share your views." },
  "part4": { "type": "free_response", "prompt": "Consider the topic of cultural globalization. Some argue that globalization leads to cultural homogenization, while others believe it promotes cultural exchange. What is your perspective? Discuss the advantages and disadvantages, using specific examples to support your argument." }
}

Rules:
- part1 & part2 (shadowing): Write a clear, natural-sounding passage of 40-60 words at B1-B2 level. Use varied vocabulary and complex sentences worth repeating.
- part3 & part4 (free_response): Write detailed prompts with sub-questions to guide 1-2 minutes of speaking.
- ALL parts must have "type" and "prompt" fields.`;

// === Grading Prompts ===

export const generateGradingPrompt = (
    writingData: any,
    writingAnswers: Record<string, string>,
    writingMeta: Record<string, any>,
    speakingTranscripts: Record<string, string>,
    speakingMeta: Record<string, any>,
    readingCorrect: number,
    readingTotal: number,
    listeningCorrect: number,
    listeningTotal: number
): string => {
    return `You are a STRICT, CALIBRATED CEFR English examiner. Grade the writing and speaking below using the ANALYTIC RUBRIC.

=== WRITING SUBMISSIONS ===
Prompts: ${JSON.stringify(writingData)}
Answers: ${JSON.stringify(writingAnswers)}
Structure Analysis: ${JSON.stringify(writingMeta)}

=== SPEAKING TRANSCRIPTS ===
${JSON.stringify(speakingTranscripts)}
Structure Analysis: ${JSON.stringify(speakingMeta)}

=== ANALYTIC RUBRIC (score each 0-100) ===
Each section is graded on THREE criteria, then averaged:

1. **Grammar & Vocabulary** (0-100):
   - 0-15: No coherent language / gibberish / empty
   - 16-30: Only isolated words or fragments, pervasive errors
   - 31-45: Simple sentences with frequent errors (A2)
   - 46-55: Limited range, repetitive vocabulary, regular errors (B1)
   - 56-70: Good range, occasional errors, some complex structures (B2)
   - 71-85: Wide range, rare errors, natural collocations (C1)
   - 86-100: Near-native precision, sophisticated vocabulary (C2)

2. **Coherence & Cohesion** (0-100):
   - 0-15: No logical structure
   - 16-30: Random sentences, no linking
   - 31-45: Basic ordering but weak transitions
   - 46-55: Some logical flow, basic connectors (however, because)
   - 56-70: Clear paragraphing, varied linking devices
   - 71-85: Well-organized with sophisticated discourse markers
   - 86-100: Masterful flow, seamless argumentation

3. **Task Response** (0-100):
   - 0-15: Did not address the prompt at all / empty
   - 16-30: Barely addresses the topic
   - 31-45: Partially addresses the prompt, missing key requirements
   - 46-55: Addresses the main topic but lacks depth
   - 56-70: Fully addresses the prompt with supporting details
   - 71-85: Thorough response with well-developed arguments
   - 86-100: Exceptional depth, nuance, and critical thinking

=== FEW-SHOT CALIBRATION EXAMPLES ===
Use these reference points to calibrate your scores:

Example A (A2, score ~35): "I think internet is good. People use internet every day. It help us find information. But sometime bad things happen. Children see bad thing. So internet is good and bad." → Grammar: 30, Coherence: 35, Task: 40

Example B (B1, score ~48): "In my opinion, social media has both advantages and disadvantages. On the one hand, it helps people to communicate with friends. However, many people spend too much time on it. Furthermore, there is the problem of privacy. In conclusion, we should use social media carefully." → Grammar: 50, Coherence: 50, Task: 45

Example C (B2, score ~58): "The proliferation of social media platforms has significantly altered how we interact. While proponents argue that these tools democratize information, critics point to growing evidence of mental health impacts, particularly among adolescents. Studies by the University of Pennsylvania have demonstrated a correlation between heavy social media use and increased anxiety. Nevertheless, it would be reductive to dismiss these platforms entirely, as they serve crucial roles in community building and civic engagement." → Grammar: 62, Coherence: 58, Task: 55

Example D (C1, score ~68): "The assertion that artificial intelligence will inevitably supplant human workers oversimplifies what is fundamentally a nuanced economic transformation. Historical precedent suggests that technological disruption, while displacing certain roles, simultaneously catalyzes the emergence of previously inconceivable occupations. The salient question is not whether displacement will occur — it demonstrably will — but rather whether educational institutions can adapt with sufficient agility to equip workers with the metacognitive skills required for perpetual professional reinvention." → Grammar: 72, Coherence: 68, Task: 65

=== FORCED JUSTIFICATION FORMAT ===
You MUST follow this exact process for EACH section:

Return ONLY this JSON:
{
  "writingAnalysis": {
    "errors_found": ["list specific grammar/vocab errors found"],
    "grammar_vocabulary": 0,
    "coherence_cohesion": 0,
    "task_response": 0,
    "justification": "One sentence explaining why this score and not higher/lower"
  },
  "speakingAnalysis": {
    "errors_found": ["list specific errors in transcript"],
    "grammar_vocabulary": 0,
    "coherence_cohesion": 0,
    "task_response": 0,
    "justification": "One sentence explaining why this score and not higher/lower"
  },
  "writingScore": 0,
  "speakingScore": 0,
  "feedback": {
    "reading": "Brief feedback on reading (${readingCorrect}/${readingTotal} correct)...",
    "listening": "Brief feedback on listening (${listeningCorrect}/${listeningTotal} correct)...",
    "writing": "Specific constructive feedback mentioning actual errors...",
    "speaking": "Specific constructive feedback on fluency and grammar..."
  }
}

CRITICAL RULES:
- writingScore = average of writingAnalysis.(grammar_vocabulary + coherence_cohesion + task_response) / 3, ROUNDED
- speakingScore = average of speakingAnalysis.(grammar_vocabulary + coherence_cohesion + task_response) / 3, ROUNDED
- If a response has fewer than 20 words, ALL criteria for that section ≤ 15
- You MUST list at least 2 specific errors per section, or state "No errors found" only for C2-level writing
- NEVER give scores above 70 unless the writing genuinely demonstrates C1+ proficiency`;
};
