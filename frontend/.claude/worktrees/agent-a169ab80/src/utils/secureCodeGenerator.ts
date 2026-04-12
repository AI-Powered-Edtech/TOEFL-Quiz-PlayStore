/**
 * Secure Code Generation Utilities
 * 
 * Provides cryptographically secure code generation for:
 * - Circle join codes (6 characters)
 * - Friend codes (8 characters)
 * - Other unique identifiers
 */

// Character sets for code generation
const CODE_CHARS = {
    // Alphanumeric excluding ambiguous characters (0/O, 1/I)
    unambiguous: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
    // Full alphanumeric (for less critical codes)
    alphanumeric: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    // Numbers only
    numeric: '0123456789',
    // Hexadecimal
    hex: '0123456789ABCDEF',
};

/**
 * Generate a cryptographically secure random string
 * 
 * Uses Web Crypto API (crypto.getRandomValues) which is
 * cryptographically secure and available in all modern browsers.
 */
export function generateSecureRandomString(
    length: number,
    charset: keyof typeof CODE_CHARS = 'unambiguous'
): string {
    const chars = CODE_CHARS[charset];
    const charsLength = chars.length;
    
    // Create a Uint8Array to hold random values
    const randomValues = new Uint8Array(length);
    
    // Fill with cryptographically secure random values
    crypto.getRandomValues(randomValues);
    
    // Map each random value to a character from the charset
    let result = '';
    for (let i = 0; i < length; i++) {
        // Use modulo to map the random byte to a character index
        // Note: This introduces slight bias, but acceptable for our use case
        result += chars[randomValues[i] % charsLength];
    }
    
    return result;
}

/**
 * Generate a secure circle join code
 * 
 * Format: 6 uppercase alphanumeric characters
 * Example: "A7X9B2"
 */
export function generateCircleCode(): string {
    return generateSecureRandomString(6, 'unambiguous');
}

/**
 * Generate a secure friend code
 * 
 * Format: 8 uppercase alphanumeric characters (excluding ambiguous)
 * Example: "A7X9B2M4"
 */
export function generateFriendCode(): string {
    return generateSecureRandomString(8, 'unambiguous');
}

/**
 * Generate a unique ID with a prefix
 * 
 * Format: PREFIX_RANDOM
 * Example: "CIRCLE_A7X9B2M4"
 */
export function generatePrefixedId(prefix: string, length: number = 8): string {
    const code = generateSecureRandomString(length, 'alphanumeric');
    return `${prefix}_${code}`;
}

/**
 * Generate a short-lived token
 * 
 * Format: 16 alphanumeric characters
 * Used for temporary tokens, verification codes, etc.
 */
export function generateToken(): string {
    return generateSecureRandomString(16, 'alphanumeric');
}

/**
 * Generate a numeric verification code
 * 
 * Format: 6 digits
 * Used for OTP, verification codes, etc.
 */
export function generateVerificationCode(): string {
    return generateSecureRandomString(6, 'numeric');
}

/**
 * Generate a unique filename
 * 
 * Format: TIMESTAMP_RANDOM.originalExtension
 * Example: "1708123456789_A7X9B2M4.jpg"
 */
export function generateUniqueFilename(originalFilename: string): string {
    const timestamp = Date.now();
    const randomPart = generateSecureRandomString(8, 'alphanumeric');
    const extension = originalFilename.split('.').pop() || '';
    return `${timestamp}_${randomPart}.${extension}`;
}

/**
 * Generate a secure session ID
 * 
 * Format: 32 hexadecimal characters
 * Example: "A7X9B2M4C5D6E7F8"
 */
export function generateSessionId(): string {
    return generateSecureRandomString(32, 'hex');
}

/**
 * Check if a code has sufficient entropy
 * 
 * Used to validate that generated codes are not too predictable
 */
export function calculateEntropy(code: string): number {
    const uniqueChars = new Set(code.split('')).size;
    const length = code.length;
    // Entropy in bits
    return length * Math.log2(uniqueChars);
}

/**
 * Validate that a code meets minimum entropy requirements
 */
export function hasMinimumEntropy(code: string, minBits: number = 30): boolean {
    return calculateEntropy(code) >= minBits;
}

/**
 * Generate multiple unique codes
 * 
 * Useful for batch generation with collision prevention
 */
export function generateUniqueCodes(
    count: number,
    length: number = 6,
    charset: keyof typeof CODE_CHARS = 'unambiguous'
): string[] {
    const codes = new Set<string>();
    
    while (codes.size < count) {
        const code = generateSecureRandomString(length, charset);
        codes.add(code);
    }
    
    return Array.from(codes);
}

/**
 * Generate a code with checksum
 * 
 * Adds a verification digit to detect typos
 */
export function generateCodeWithChecksum(
    length: number = 7,
    charset: keyof typeof CODE_CHARS = 'unambiguous'
): string {
    const code = generateSecureRandomString(length, charset);
    const checksum = calculateChecksum(code);
    return `${code}${checksum}`;
}

/**
 * Verify a code with checksum
 */
export function verifyCodeWithChecksum(codeWithChecksum: string): boolean {
    if (codeWithChecksum.length < 2) return false;
    
    const code = codeWithChecksum.slice(0, -1);
    const providedChecksum = codeWithChecksum.slice(-1);
    const expectedChecksum = calculateChecksum(code);
    
    return providedChecksum === expectedChecksum;
}

/**
 * Calculate a simple checksum character
 */
function calculateChecksum(code: string): string {
    const chars = CODE_CHARS.unambiguous;
    let sum = 0;
    
    for (let i = 0; i < code.length; i++) {
        const charIndex = chars.indexOf(code[i].toUpperCase());
        if (charIndex >= 0) {
            sum += charIndex * (i + 1);
        }
    }
    
    return chars[sum % chars.length];
}

/**
 * Generate a time-based code
 * 
 * Includes a time component for expiration capability
 * Format: TIME(4 chars) + RANDOM(4 chars)
 */
export function generateTimeBasedCode(expireAfterMs: number = 3600000): {
    code: string;
    expiresAt: number;
} {
    // Encode current time as 4 hex characters (16 bits of precision)
    const now = Date.now();
    const timeComponent = Math.floor(now / 60000) % 65536; // Minutes modulo 65536
    const timeHex = timeComponent.toString(16).toUpperCase().padStart(4, '0');
    
    // Generate random component
    const randomComponent = generateSecureRandomString(4, 'alphanumeric');
    
    return {
        code: `${timeHex}${randomComponent}`,
        expiresAt: now + expireAfterMs
    };
}

/**
 * Verify a time-based code
 */
export function verifyTimeBasedCode(
    code: string,
    toleranceMs: number = 3600000
): { valid: boolean; expired: boolean } {
    if (code.length !== 8) {
        return { valid: false, expired: false };
    }
    
    const timeHex = code.slice(0, 4);
    const timeValue = parseInt(timeHex, 16);
    
    if (isNaN(timeValue)) {
        return { valid: false, expired: false };
    }
    
    // Calculate the time window
    const now = Date.now();
    const currentMinutes = Math.floor(now / 60000) % 65536;
    
    // Check if the code is within tolerance
    const diff = Math.abs(currentMinutes - timeValue);
    const expired = diff * 60000 > toleranceMs;
    
    return { valid: !expired, expired };
}

// Export character sets for custom use
export { CODE_CHARS };
