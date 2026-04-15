pub const BASE_SCHEMA: &str = r#"
SCHEMA:
{
  "skill_id": number,
  "section": "structure" | "written" | "reading" | "listening",
  "skill_type": "structure" | "written" | "reading" | "listening",
  "interaction": "fill_blank" | "identify_error" | "multiple_choice",
  "stimulus": { "text": "string" },
  "prompt": "string",
  "choices": ["string", "string", "string", "string"],
  "correct_response": ["string"],
  "cefr_target": "A2" | "B1" | "B2" | "C1",
  "difficulty_score": number,
  "metadata": { "explanation": "string" }
}
"#;

pub const COMMON_RULES: &str = r#"
RULES:
1. No markdown. No preamble. No trailing text. Output ONLY valid JSON.
2. ALWAYS Provide EXACTLY 4 UNIQUE choices. NO DUPLICATE OPTIONS ALLOWED.
3. All choices must be distinct and different from each other.
4. JSON MUST be perfectly valid.
"#;

pub const QUALITY_MANDATE: &str = r#"
QUALITY RULES (MANDATORY):
1. Academic English only. Complex sentences (subordinate clauses, participial phrases). CEFR B2-C1 vocabulary.
2. All 4 choices must be plausible, same word form. No absurd distractors.
3. Explanations: cite the grammar rule + explain why the answer is correct (min 2 sentences).
4. FOLLOW ALL FORMAT INSTRUCTIONS IN THE STYLE SECTION EXACTLY.
"#;

pub const BASE_SYSTEM_PROMPT: &str = r#"
You are a Strict TOEFL PBT Question Generator API.
You MUST follow the specific grammar instructions in the 'Context' field above ALL else.
You MUST output a raw JSON Object containing exactly one key: "questions", which is an array of objects.
"#;

pub const STRUCTURE_PROMPT: &str = r#"
SECTION: STRUCTURE (Sentence Completion / Fill-in-the-Blank)
interaction: fill_blank

=== FORMAT ===
- The "prompt" MUST be ONE complete academic sentence with exactly ONE blank: _______
- The blank replaces a grammatically critical word or phrase.
- Do NOT use {A}/{B}/{C}/{D} tags.
- "choices" MUST contain EXACTLY 4 UNIQUE options.
"#;

pub const WRITTEN_PROMPT: &str = r#"
SECTION: WRITTEN EXPRESSION (Error Identification)
interaction: identify_error

=== FORMAT (ABSOLUTELY CRITICAL) ===
1. "prompt" MUST contain the FULL sentence with EXACTLY FOUR tags: {A}word(s){/A}, {B}word(s){/B}, {C}word(s){/C}, {D}word(s){/D}.
2. EXACTLY one tagged portion contains a grammatical error.
3. "interaction" MUST be "identify_error".
4. "choices" MUST be exactly ["A", "B", "C", "D"].
5. "correct_response" MUST be exactly ["A"], ["B"], ["C"], or ["D"].
"#;

pub const READING_PROMPT: &str = r#"
CRITICAL: Generate AUTHENTIC TOEFL Reading Comprehension questions based on academic passages.
- Academic topic: history, science, social studies, arts, technology, environment, economics
- Length: 200-350 words
- College-level vocabulary (CEFR B2-C1)
- Include a "stimulus": { "text": "passage content..." }
"#;

pub const LISTENING_PROMPT: &str = r#"
SECTION: LISTENING COMPREHENSION
interaction: multiple_choice

=== GENERAL FORMAT ===
- Generate a dialogue/lecture transcript in stimulus.text
- Speaker tags: [M] for Man, [W] for Woman
- Format: [M]spoken text[/M] [W]spoken text[/W]
- MUST test IMPLICIT meaning: idioms, suggestions, implications, attitudes
"#;

pub fn get_system_prompt(section: &str) -> String {
    let specific_prompt = match section.to_uppercase().as_str() {
        "READING" => READING_PROMPT,
        "LISTENING" => LISTENING_PROMPT,
        "WRITTEN" => WRITTEN_PROMPT,
        _ => STRUCTURE_PROMPT, // default to structure
    };

    format!(
        "{}\n{}\n{}\n{}\n{}",
        BASE_SYSTEM_PROMPT, BASE_SCHEMA, COMMON_RULES, QUALITY_MANDATE, specific_prompt
    )
}
