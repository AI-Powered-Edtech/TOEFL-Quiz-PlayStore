import { BaseValidator, ValidationResult } from "./baseValidator";

export class ReadingValidator extends BaseValidator {
    validate(q: any, { skillId, difficultyScore, metadata, stimulus }: any): ValidationResult {
        const minLength = 80;
        const currentText = stimulus.text || "";

        if (currentText.length < minLength) {
            return this.reject(`passage too short (${currentText.length} chars, need ${minLength}+)`, q.prompt);
        }

        const choices = [...(q.choices || [])];
        if (!this.hasMinimumChoices(choices)) {
            return this.reject(`only ${choices.length} choices`, q.prompt);
        }

        return this.accept({
            skill_id: skillId || 101, // Default generic reading ID
            section: 'reading',
            interaction: 'multiple_choice',
            prompt: q.prompt,
            choices: choices,
            correct_response: q.correct_response || [],
            cefr_target: q.cefr_target || 'B2',
            difficulty_score: difficultyScore,
            stimulus: stimulus,
            metadata
        });
    }
}
