/**
 * Integrated Writing Prompts
 * AI prompts for TOEFL Integrated Writing Task 1
 */

/**
 * Generates a complete Integrated Writing task with reading passage and lecture transcript
 */
export const getIntegratedWritingTaskPrompt = (category?: string) => `You are an expert TOEFL test content creator. Generate a complete Integrated Writing task.

${category ? `Topic Category: ${category}` : 'Choose any academic topic category (science, social, environment, education, business).'}

Generate a task with:
1. A reading passage (250-300 words) that presents 3 key arguments/points
2. A lecture transcript (180-220 words) that challenges/contradicts each of the 3 reading points

CRITICAL REQUIREMENTS:
- The lecture must OPPOSE or CAST DOUBT on each reading point
- Use academic vocabulary appropriate for TOEFL
- Make the relationship between reading and lecture clear but not obvious
- Include natural speaker markers in the lecture (e.g., "Now, the reading claims...")

Return ONLY valid JSON in this exact format:
{
  "topic": "Brief topic title",
  "category": "science|social|environment|education|business",
  "reading_passage": {
    "title": "Reading passage title",
    "content": "Full reading passage text...",
    "word_count": 280,
    "key_points": ["Point 1 summary", "Point 2 summary", "Point 3 summary"]
  },
  "lecture": {
    "transcript": "Full lecture transcript...",
    "key_counterpoints": ["Counter to point 1", "Counter to point 2", "Counter to point 3"]
  },
  "sample_response": "A model 5-score response summarizing how the lecture casts doubt on the reading... (200-250 words)",
  "difficulty": 3
}`;

/**
 * Evaluates an integrated writing essay based on TOEFL rubric
 */
export const getIntegratedWritingEvaluationPrompt = (
  readingPassage: string,
  lectureTranscript: string,
  userEssay: string
) => `You are an expert TOEFL iBT Writing evaluator. Evaluate this Integrated Writing response.

## Reading Passage:
${readingPassage}

## Lecture Transcript:
${lectureTranscript}

## Student's Essay:
${userEssay}

Evaluate using the OFFICIAL TOEFL iBT Integrated Writing Rubric (0-5 scale):

SCORE 5: Successfully selects important information from lecture and coherently presents it in relation to the reading. Well organized. Minor language errors don't affect meaning.

SCORE 4: Good at selecting important info. May have minor omissions or inaccuracies. Generally well organized. Some noticeable language errors.

SCORE 3: Contains some important information but may be incomplete or inaccurate. Connection between reading and lecture may not be clear. Language errors may obscure meaning.

SCORE 2: Contains some relevant information but significant inaccuracies or omissions. Vague connections. Language errors frequently obscure meaning.

SCORE 1: Minimal information. Many inaccuracies. Language difficulties severely obscure meaning.

SCORE 0: Off-topic, in wrong language, or blank.

Return ONLY valid JSON:
{
  "overall_score": 4,
  "task_development": 4,
  "organization": 4,
  "language_use": 3.5,
  "strengths": [
    "Clear identification of the main counterarguments",
    "Good use of transition phrases"
  ],
  "improvements": [
    {
      "original": "The professor say that...",
      "improved": "The professor argues that...",
      "explanation": "Use 'argues' instead of 'say' for more academic register, and fix subject-verb agreement"
    },
    {
      "original": "This is contradict the reading.",
      "improved": "This contradicts the reading passage.",
      "explanation": "Fix verb form and add noun for clarity"
    }
  ]
}`;

/**
 * Compares user essay with a sample response for learning insights
 */
export const getComparativeAnalysisPrompt = (
  userEssay: string,
  sampleResponse: string,
  userScore: number
) => `You are an expert TOEFL writing coach. Compare this student's essay with a model Score-5 response.

## Student Essay (Score: ${userScore}/5):
${userEssay}

## Model Response (Score: 5/5):
${sampleResponse}

Provide a detailed comparison to help the student understand the gap and improve. Focus on actionable insights.

Return ONLY valid JSON:
{
    "structure_comparison": {
        "user_approach": "How the student organized their essay",
        "model_approach": "How the model response is organized",
        "key_difference": "Main structural difference",
        "tip": "One actionable improvement"
    },
    "content_coverage": {
        "user_points": ["Points the student covered"],
        "model_points": ["Points the model covered"],
        "missing_from_user": ["Important points the student missed"],
        "strength": "What the student did well"
    },
    "language_quality": {
        "user_highlights": ["Good phrases from the student's essay"],
        "model_highlights": ["Strong phrases from the model to learn"],
        "upgrades": [
            {
                "original": "Student's phrase",
                "improved": "Better academic version",
                "why": "Brief explanation"
            }
        ]
    },
    "overall_gap_analysis": "2-3 sentence summary of main differences and how to close the gap"
}`;
