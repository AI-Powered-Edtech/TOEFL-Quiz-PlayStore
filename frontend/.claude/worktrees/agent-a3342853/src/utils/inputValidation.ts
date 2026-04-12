/**
 * Input Validation and Sanitization Utilities
 * 
 * Provides validation and sanitization for Social Hub inputs:
 * - Chat messages
 * - Circle names and descriptions
 * - Friend codes
 * - User-generated content
 */

// Forbidden patterns for XSS prevention
const FORBIDDEN_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /data:/gi,
    /vbscript:/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /<form/gi,
    /expression\s*\(/gi,
];

// Allowed HTML tags (none for chat messages, limited for descriptions)
const ALLOWED_TAGS: Record<string, string[]> = {
    none: [],
    limited: ['b', 'i', 'u', 'strong', 'em', 'br', 'p'],
};

// Maximum lengths for various inputs
export const MAX_LENGTHS = {
    circleName: 50,
    circleDescription: 500,
    chatMessage: 1000,
    friendCode: 8,
    userName: 100,
} as const;

// Minimum lengths
export const MIN_LENGTHS = {
    circleName: 3,
    chatMessage: 1,
    friendCode: 8,
} as const;

/**
 * Validation result
 */
export interface ValidationResult {
    valid: boolean;
    error?: string;
    sanitized?: string;
}

/**
 * Sanitize text by removing/escaping dangerous content
 */
export function sanitizeText(
    input: string,
    options: {
        maxLength?: number;
        allowHtml?: boolean;
        allowedTags?: string[];
    } = {}
): string {
    const {
        maxLength = MAX_LENGTHS.chatMessage,
        allowHtml = false,
        allowedTags = []
    } = options;

    let sanitized = input;

    // Trim whitespace
    sanitized = sanitized.trim();

    // Check length
    if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength);
    }

    // Remove forbidden patterns
    for (const pattern of FORBIDDEN_PATTERNS) {
        sanitized = sanitized.replace(pattern, '');
    }

    // Handle HTML
    if (!allowHtml) {
        // Escape all HTML
        sanitized = escapeHtml(sanitized);
    } else if (allowedTags.length > 0) {
        // Strip all tags except allowed ones
        sanitized = stripTags(sanitized, allowedTags);
    }

    // Remove null bytes and other control characters
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Normalize unicode (prevent unicode attacks)
    sanitized = sanitized.normalize('NFC');

    return sanitized;
}

/**
 * Escape HTML entities
 */
export function escapeHtml(input: string): string {
    const htmlEntities: Record<string, string> = {
        '&': '&',
        '<': '<',
        '>': '>',
        '"': '"',
        "'": '&#x27;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;',
    };

    return input.replace(/[&<>"'`=/]/g, (char) => htmlEntities[char] || char);
}

/**
 * Strip HTML tags except allowed ones
 */
export function stripTags(input: string, allowedTags: string[]): string {
    const allowedPattern = allowedTags.join('|');
    const pattern = new RegExp(
        `<(?!\\/?(?:${allowedPattern})\\b)[^>]+>`,
        'gi'
    );
    return input.replace(pattern, '');
}

/**
 * Validate chat message
 */
export function validateChatMessage(message: string): ValidationResult {
    // Check if empty
    if (!message || message.trim().length === 0) {
        return { valid: false, error: 'Message cannot be empty' };
    }

    // Check minimum length
    if (message.trim().length < MIN_LENGTHS.chatMessage) {
        return { valid: false, error: 'Message is too short' };
    }

    // Check maximum length
    if (message.length > MAX_LENGTHS.chatMessage) {
        return {
            valid: false,
            error: `Message exceeds maximum length of ${MAX_LENGTHS.chatMessage} characters`
        };
    }

    // Check for forbidden patterns
    for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(message)) {
            return { valid: false, error: 'Message contains forbidden content' };
        }
    }

    // Check for excessive repetition (spam prevention)
    if (hasExcessiveRepetition(message)) {
        return { valid: false, error: 'Message appears to be spam' };
    }

    // Check for excessive caps
    if (hasExcessiveCaps(message)) {
        return { valid: false, error: 'Please reduce the use of capital letters' };
    }

    return {
        valid: true,
        sanitized: sanitizeText(message, { maxLength: MAX_LENGTHS.chatMessage })
    };
}

/**
 * Validate circle name
 */
export function validateCircleName(name: string): ValidationResult {
    // Check if empty
    if (!name || name.trim().length === 0) {
        return { valid: false, error: 'Circle name is required' };
    }

    // Check minimum length
    if (name.trim().length < MIN_LENGTHS.circleName) {
        return {
            valid: false,
            error: `Circle name must be at least ${MIN_LENGTHS.circleName} characters`
        };
    }

    // Check maximum length
    if (name.length > MAX_LENGTHS.circleName) {
        return {
            valid: false,
            error: `Circle name cannot exceed ${MAX_LENGTHS.circleName} characters`
        };
    }

    // Check for forbidden patterns
    for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(name)) {
            return { valid: false, error: 'Circle name contains forbidden content' };
        }
    }

    // Check for valid characters (alphanumeric, spaces, basic punctuation)
    const validNamePattern = /^[a-zA-Z0-9\s\-_.,!?'"()]+$/;
    if (!validNamePattern.test(name)) {
        return {
            valid: false,
            error: 'Circle name can only contain letters, numbers, spaces, and basic punctuation'
        };
    }

    return {
        valid: true,
        sanitized: sanitizeText(name, { maxLength: MAX_LENGTHS.circleName })
    };
}

/**
 * Validate circle description
 */
export function validateCircleDescription(description: string): ValidationResult {
    // Description is optional
    if (!description || description.trim().length === 0) {
        return { valid: true, sanitized: '' };
    }

    // Check maximum length
    if (description.length > MAX_LENGTHS.circleDescription) {
        return {
            valid: false,
            error: `Description cannot exceed ${MAX_LENGTHS.circleDescription} characters`
        };
    }

    // Check for forbidden patterns
    for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(description)) {
            return { valid: false, error: 'Description contains forbidden content' };
        }
    }

    return {
        valid: true,
        sanitized: sanitizeText(description, {
            maxLength: MAX_LENGTHS.circleDescription,
            allowHtml: true,
            allowedTags: ALLOWED_TAGS.limited
        })
    };
}

/**
 * Validate friend code format
 */
export function validateFriendCode(code: string): ValidationResult {
    // Normalize
    const normalized = code.toUpperCase().trim();

    // Check length
    if (normalized.length !== MIN_LENGTHS.friendCode) {
        return {
            valid: false,
            error: `Friend code must be ${MIN_LENGTHS.friendCode} characters`
        };
    }

    // Check format (only allowed characters)
    const validCodePattern = /^[A-HJ-NP-Z2-9]+$/; // Excludes I, O, 0, 1
    if (!validCodePattern.test(normalized)) {
        return {
            valid: false,
            error: 'Invalid friend code format'
        };
    }

    return { valid: true, sanitized: normalized };
}

/**
 * Validate circle join code
 */
export function validateCircleCode(code: string): ValidationResult {
    // Normalize
    const normalized = code.toUpperCase().trim();

    // Check length (6 characters)
    if (normalized.length !== 6) {
        return {
            valid: false,
            error: 'Circle code must be 6 characters'
        };
    }

    // Check format (alphanumeric)
    const validCodePattern = /^[A-Z0-9]+$/;
    if (!validCodePattern.test(normalized)) {
        return {
            valid: false,
            error: 'Invalid circle code format'
        };
    }

    return { valid: true, sanitized: normalized };
}

/**
 * Check for excessive character repetition (spam detection)
 */
function hasExcessiveRepetition(text: string): boolean {
    // Check for repeated characters (e.g., "aaaaaa")
    if (/(.)\1{10,}/.test(text)) {
        return true;
    }

    // Check for repeated words (e.g., "hello hello hello hello")
    const words = text.toLowerCase().split(/\s+/);
    const wordCounts = new Map<string, number>();
    
    for (const word of words) {
        if (word.length > 2) {
            wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
            if ((wordCounts.get(word) || 0) > 5) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Check for excessive capital letters
 */
function hasExcessiveCaps(text: string): boolean {
    const letters = text.replace(/[^a-zA-Z]/g, '');
    if (letters.length < 10) return false;

    const capsCount = (text.match(/[A-Z]/g) || []).length;
    const capsRatio = capsCount / letters.length;

    return capsRatio > 0.7 && letters.length > 20;
}

/**
 * Validate user display name
 */
export function validateUserName(name: string): ValidationResult {
    // Check if empty
    if (!name || name.trim().length === 0) {
        return { valid: false, error: 'Name is required' };
    }

    // Check maximum length
    if (name.length > MAX_LENGTHS.userName) {
        return {
            valid: false,
            error: `Name cannot exceed ${MAX_LENGTHS.userName} characters`
        };
    }

    // Check for forbidden patterns
    for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(name)) {
            return { valid: false, error: 'Name contains forbidden content' };
        }
    }

    // Check for valid characters
    const validNamePattern = /^[\p{L}\p{N}\s\-_.,'"()]+$/u;
    if (!validNamePattern.test(name)) {
        return {
            valid: false,
            error: 'Name contains invalid characters'
        };
    }

    return {
        valid: true,
        sanitized: sanitizeText(name, { maxLength: MAX_LENGTHS.userName })
    };
}

/**
 * Validate URL (for avatar URLs, etc.)
 */
export function validateUrl(url: string, allowedDomains?: string[]): ValidationResult {
    try {
        const parsed = new URL(url);

        // Only allow https
        if (parsed.protocol !== 'https:') {
            return { valid: false, error: 'Only HTTPS URLs are allowed' };
        }

        // Check domain whitelist if provided
        if (allowedDomains && allowedDomains.length > 0) {
            const isAllowed = allowedDomains.some(
                domain => parsed.hostname.endsWith(domain)
            );
            if (!isAllowed) {
                return { valid: false, error: 'URL domain not allowed' };
            }
        }

        return { valid: true, sanitized: url };
    } catch {
        return { valid: false, error: 'Invalid URL format' };
    }
}

/**
 * Batch validate multiple fields
 */
export function validateFields(
    fields: Record<string, { value: string; validator: (v: string) => ValidationResult }>
): { valid: boolean; errors: Record<string, string>; sanitized: Record<string, string> } {
    const errors: Record<string, string> = {};
    const sanitized: Record<string, string> = {};
    let allValid = true;

    for (const [fieldName, { value, validator }] of Object.entries(fields)) {
        const result = validator(value);
        if (!result.valid) {
            allValid = false;
            errors[fieldName] = result.error || 'Invalid value';
        } else {
            sanitized[fieldName] = result.sanitized || value;
        }
    }

    return { valid: allValid, errors, sanitized };
}
