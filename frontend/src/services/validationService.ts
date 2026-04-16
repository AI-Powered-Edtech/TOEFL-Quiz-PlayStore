import { ValidationError } from '../types/service-types';
import { CanonicalQuestionV1, QuizData, SectionType } from '../types';

interface ValidationResult<T> {
  isValid: boolean;
  errors: Record<keyof T, string>;
  error: ValidationError | null;
}

const authSchemas = {
  username: (v: string) => v.length >= 3 && v.length <= 30 && /^[a-zA-Z0-9_]+$/.test(v),
  password: (v: string) => v.length >= 6,
  email: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
};

const socialSchemas = {
  circleName: (v: string) => v.length >= 3 && v.length <= 50,
  message: (v: string) => v.length >= 1 && v.length <= 500,
  friendCode: (v: string) => /^[A-Z0-9]{6,12}$/.test(v),
};

const writingSchemas = {
  essayText: (v: string) => v.length >= 50 && v.length <= 3000,
  title: (v: string) => v.length >= 3 && v.length <= 100,
};

function validate<T>(
  schema: Record<keyof T, (v: unknown) => boolean>,
  data: T
): ValidationResult<T> {
  const errors: Record<keyof T, string> = {} as Record<keyof T, string>;
  let isValid = true;

  for (const key in schema) {
    const validator = schema[key];
    const value = data[key];

    if (!validator(value)) {
      isValid = false;
      errors[key] = `Invalid ${String(key)}`;
    }
  }

  const error = isValid
    ? null
    : new ValidationError('Validation failed', errors as Record<string, string>);

  return {
    isValid,
    errors,
    error,
  };
}

function validateField(
  value: unknown,
  validator: (v: unknown) => boolean
): string | null {
  return validator(value) ? null : 'Invalid value';
}

function validateAuth(
  data: { username: string; password: string; email?: string }
): ValidationError | null {
  const errors: Record<string, string> = {};

  if (!authSchemas.username(data.username)) {
    errors.username = 'Username must be 3-30 characters and contain only letters, numbers, and underscores';
  }

  if (!authSchemas.password(data.password)) {
    errors.password = 'Password must be at least 6 characters';
  }

  if (data.email !== undefined && !authSchemas.email(data.email)) {
    errors.email = 'Invalid email format';
  }

  return Object.keys(errors).length > 0
    ? new ValidationError('Auth validation failed', errors)
    : null;
}

function validateSocial(
  data: { circleName?: string; message?: string; friendCode?: string }
): ValidationError | null {
  const errors: Record<string, string> = {};

  if (data.circleName !== undefined && !socialSchemas.circleName(data.circleName)) {
    errors.circleName = 'Circle name must be 3-50 characters';
  }

  if (data.message !== undefined && !socialSchemas.message(data.message)) {
    errors.message = 'Message must be 1-500 characters';
  }

  if (data.friendCode !== undefined && !socialSchemas.friendCode(data.friendCode)) {
    errors.friendCode = 'Friend code must be 6-12 uppercase letters and numbers';
  }

  return Object.keys(errors).length > 0
    ? new ValidationError('Social validation failed', errors)
    : null;
}

function validateWriting(
  data: { essayText?: string; title?: string }
): ValidationError | null {
  const errors: Record<string, string> = {};

  if (data.essayText !== undefined && !writingSchemas.essayText(data.essayText)) {
    errors.essayText = 'Essay must be 50-3000 characters';
  }

  if (data.title !== undefined && !writingSchemas.title(data.title)) {
    errors.title = 'Title must be 3-100 characters';
  }

  return Object.keys(errors).length > 0
    ? new ValidationError('Writing validation failed', errors)
    : null;
}

export {
  authSchemas,
  socialSchemas,
  writingSchemas,
  validate,
  validateField,
  validateAuth,
  validateSocial,
  validateWriting,
};

export function validateCanonicalQuestion(q: any): q is CanonicalQuestionV1 {
  if (!q || typeof q !== 'object') return false;
  if (typeof q.skill_id !== 'number') return false;
  if (!['structure', 'written', 'reading', 'listening'].includes(q.section)) return false;
  if (!['fill_blank', 'identify_error', 'multiple_choice'].includes(q.interaction)) return false;
  if (!q.stimulus || typeof q.stimulus !== 'object') return false;
  if (typeof q.prompt !== 'string') return false;
  if (!Array.isArray(q.choices)) return false;
  if (!Array.isArray(q.correct_response)) return false;
  if (!['A2', 'B1', 'B2', 'C1'].includes(q.cefr_target)) return false;
  if (typeof q.difficulty_score !== 'number') return false;
  if (!q.metadata || typeof q.metadata !== 'object') return false;
  if (!['ai', 'db', 'pdf'].includes(q.metadata.source)) return false;
  return true;
}

export function validateQuestionStrictly(
  q: any,
  skillId: string,
  section: SectionType
): q is QuizData {
  if (!validateCanonicalQuestion(q)) return false;

  const numericSkillId = parseInt(skillId.replace(/\D/g, ''), 10);
  if (Number.isFinite(numericSkillId) && q.skill_id !== numericSkillId) return false;

  const expectedSection =
    section === 'LISTENING'
      ? 'listening'
      : section === 'READING'
        ? 'reading'
        : section === 'WRITTEN'
          ? 'written'
          : 'structure';

  return q.section === expectedSection;
}

export type { ValidationResult };
