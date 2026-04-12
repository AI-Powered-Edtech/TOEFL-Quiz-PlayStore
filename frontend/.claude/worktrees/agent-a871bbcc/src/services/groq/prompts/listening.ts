export const LISTENING_PROMPT = `
SECTION: LISTENING COMPREHENSION
interaction: multiple_choice

=== GENERAL FORMAT ===
- Generate a dialogue/lecture transcript in stimulus.text
- Speaker tags: [M] for Man, [W] for Woman (Part A & B)
- Format: [M]spoken text[/M] [W]spoken text[/W]
- NEVER write "Man:" or "Woman:" — only use [M][W] tags
- Tags will be read by different TTS voices automatically

⚠️ MANDATORY RULE FOR PART A & B:
- MUST be exactly 2 people: ONE MAN [M] and ONE WOMAN [W]
- ALWAYS alternate speakers: [M]...[/M] [W]...[/W] [M]...[/M]
- NEVER use same speaker twice consecutively

=== PART A (Skills L01-L17): Short Conversations ===
- 2-3 exchanges, strictly alternating [M] and [W]
- MUST test IMPLICIT meaning: idioms, suggestions, implications, attitudes
- Questions should ask about what is IMPLIED, not what is literally said
- Use natural spoken English with contractions, hedging, indirect speech

PART A EXAMPLE:
{
  "stimulus": { "text": "[M]I can't believe Professor Adams postponed the midterm again.[/M] [W]Well, at least it gives us more time to go over the material.[/W]" },
  "prompt": "What does the woman imply?",
  "choices": ["She is upset about the postponement", "She sees an advantage in the delay", "She wants to talk to Professor Adams", "She has already finished studying"],
  "correct_response": ["She sees an advantage in the delay"],
  "skill_id": 201,
  "explanation": "The woman says 'at least it gives us more time,' which implies she sees a positive side to the postponement, even though the man is frustrated."
}

=== PART B (Skills L18-L22): Long Conversations ===
- 6-8 exchanges, strictly alternating [M] and [W]
- Total dialogue: 200-250 words minimum
- Campus settings: library, registrar, academic advisor, dormitory, bookstore, financial aid office
- Topics: course registration, housing, study groups, academic policies, campus events
- Include SPECIFIC details: course numbers, building names, dates, requirements

PART B EXAMPLE OPENING:
"[M]Excuse me, I'm trying to register for Biology 201, but the system says there's a prerequisite I haven't completed.[/M] [W]Let me take a look at your transcript. It seems you took General Biology at your previous university, but the credit hasn't been transferred yet.[/W] [M]Is there a way to expedite that process? The registration deadline is this Friday.[/M] [W]You'll need to submit an official transcript request and a course equivalency form to the Registrar's Office in Hamilton Hall.[/W]..."

=== PART C (Skills L23-L27): Academic Lectures ===
- 300-400 word academic lecture — single speaker (professor)
- NO speaker tags — continuous prose
- Topics: biology, psychology, art history, geology, astronomy, sociology, linguistics
- Include: thesis statement, supporting examples, specific facts/dates/names
- Tone: informative, structured, as if spoken in a university lecture hall

PART C QUESTION TYPES:
- Main idea/purpose of the lecture
- Specific detail recall
- Inference from examples
- Organization/structure of the talk
- Speaker's attitude or emphasis
`;

export const getListeningPromptForSkill = (skillId: string): string => {
    const skillNum = parseInt(skillId.replace('L', ''), 10);

    if (skillNum >= 1 && skillNum <= 17) {
        return `${LISTENING_PROMPT}

TARGET: Part A Short Conversation (Skill ${skillNum})
Generate a SHORT 2-3 exchange conversation using [M] and [W] tags.
The conversation should test IMPLICIT meaning — what is suggested, implied, or indirectly communicated.
Focus on: idioms, suggestions, attitudes, indirect speech acts, tone.
Keep it brief - this is a short dialogue comprehension question.
NEVER ask a question whose answer is directly stated in the dialogue.`;
    }

    if (skillNum >= 18 && skillNum <= 22) {
        return `${LISTENING_PROMPT}

TARGET: Part B Long Conversation (Skill ${skillNum})
Generate a LONGER 6-8 exchange campus conversation using [M] and [W] tags.
Setting: University campus (registrar, library, advisor office, financial aid, housing).
MINIMUM 200-250 words total dialogue.
Include SPECIFIC details: course names, building names, deadlines, requirements.
Generate 2-3 comprehension questions covering: main topic, specific details, and speaker intent.`;
    }

    if (skillNum >= 23 && skillNum <= 27) {
        return `${LISTENING_PROMPT}

TARGET: Part C Academic Lecture (Skill ${skillNum})
Generate a 300-400 word academic lecture as stimulus.text.
NO speaker tags — this is a single-speaker lecture.
Topic should be from: biology, psychology, art history, geology, astronomy, sociology, linguistics.
Structure: opening thesis → 2-3 supporting points with examples → brief conclusion.
Include specific names, dates, and facts that can be asked about.
Generate 3-4 comprehension questions covering: main idea, details, inference, and organization.`;
    }

    return LISTENING_PROMPT;
};
