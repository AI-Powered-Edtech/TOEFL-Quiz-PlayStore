import { CanonicalQuestionV1 } from "../../types";

export interface ValidationResult {
    isValid: boolean;
    reason?: string;
    sanitizedData?: Partial<CanonicalQuestionV1> & { choices: any[], stimulus: any };
}

export interface QuestionValidator {
    validate(q: any, parsedContext: { skillId: number; difficultyScore: number; metadata: any; stimulus: any }): ValidationResult;
}

export abstract class BaseValidator implements QuestionValidator {
    abstract validate(q: any, parsedContext: { skillId: number; difficultyScore: number; metadata: any; stimulus: any }): ValidationResult;

    protected reject(reason: string, prompt?: string): ValidationResult {
        console.warn(`[ACL] ❌ REJECTING question: ${reason}.`, prompt?.substring(0, 80));
        return { isValid: false, reason };
    }

    protected accept(data: Partial<CanonicalQuestionV1> & { choices: any[], stimulus: any }): ValidationResult {
        return { isValid: true, sanitizedData: data };
    }

    protected hasMinimumChoices(choices: any[], min: number = 4): boolean {
        return Array.isArray(choices) && choices.length >= min;
    }
}
