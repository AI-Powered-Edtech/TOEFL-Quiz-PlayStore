import { BaseValidator, ValidationResult } from "./baseValidator";

export class ListeningValidator extends BaseValidator {
    validate(q: any, { skillId, difficultyScore, metadata, stimulus }: any): ValidationResult {
        if (!stimulus.audio_url) {
            return this.reject(`missing audio_url`, q.prompt);
        }

        const choices = [...(q.choices || [])];
        if (!this.hasMinimumChoices(choices)) {
            return this.reject(`only ${choices.length} choices`, q.prompt);
        }

        return this.accept({
            skill_id: skillId || 201, // Default generic listening ID
            section: 'listening',
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
