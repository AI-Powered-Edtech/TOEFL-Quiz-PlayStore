import { BaseValidator, ValidationResult } from "./baseValidator";

export class StructureValidator extends BaseValidator {
    validate(q: any, { skillId, difficultyScore, metadata, stimulus }: any): ValidationResult {
        let prompt = q.prompt || "";
        if (!prompt.includes("___")) {
            return this.reject(`missing blank`, q.prompt);
        }

        const choices = [...(q.choices || [])];
        if (!this.hasMinimumChoices(choices)) {
            return this.reject(`only ${choices.length} choices`, q.prompt);
        }

        return this.accept({
            skill_id: skillId,
            section: 'structure',
            interaction: 'fill_blank',
            prompt: prompt,
            choices: choices,
            correct_response: q.correct_response || [],
            cefr_target: q.cefr_target || 'B2',
            difficulty_score: difficultyScore,
            stimulus: stimulus,
            metadata
        });
    }
}
