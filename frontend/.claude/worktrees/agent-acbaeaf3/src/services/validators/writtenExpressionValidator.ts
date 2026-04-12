import { BaseValidator, ValidationResult } from "./baseValidator";

export class WrittenExpressionValidator extends BaseValidator {
    validate(q: any, { skillId, difficultyScore, metadata, stimulus }: any): ValidationResult {
        let choices = q.choices;
        if (!choices || choices.length !== 4) {
            choices = ['A', 'B', 'C', 'D'];
        }

        let correctResponse = q.correct_response || [];
        if (correctResponse.length > 0) {
            const rawAnswer = correctResponse[0];
            const validLabels = ['A', 'B', 'C', 'D'];

            if (!validLabels.includes(rawAnswer)) {
                const foundIndex = choices.findIndex((c: string) =>
                    c.toLowerCase().trim() === rawAnswer.toLowerCase().trim()
                );

                if (foundIndex !== -1) {
                    correctResponse = [validLabels[foundIndex]];
                } else {
                    console.warn(`[ACL] Failed to map answer "\${rawAnswer}" to choices. Defaulting to 'A'.`);
                    correctResponse = ['A'];
                }
            }
        } else {
            correctResponse = ['A'];
        }

        return this.accept({
            skill_id: skillId,
            section: 'written',
            interaction: 'identify_error',
            prompt: q.prompt,
            choices: choices,
            correct_response: correctResponse,
            cefr_target: q.cefr_target || 'B2',
            difficulty_score: difficultyScore,
            stimulus: stimulus,
            metadata
        });
    }
}
