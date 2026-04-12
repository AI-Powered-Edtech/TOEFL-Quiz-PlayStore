/**
 * Content Moderation Utilities
 * Provides spam detection, profanity filtering, and content validation
 */

// Common spam patterns
const SPAM_PATTERNS = [
    /(?:buy|purchase|order)\s+(?:now|today|here)/gi,
    /(?:click|visit|check)\s+(?:here|this|link)/gi,
    /(?:free|discount|offer|deal)\s+(?:now|today)/gi,
    /(?:www\.|https?:\/\/)[^\s]+/gi,
    /(.)\1{4,}/g, // Repeated characters (e.g., "aaaaa")
    /\b(?:viagra|casino|lottery|winner|congratulations)\b/gi,
];

// Profanity list (basic - should be expanded in production)
const PROFANITY_LIST = [
    'fuck', 'shit', 'damn', 'ass', 'bitch', 'bastard',
    'crap', 'dick', 'piss', 'whore', 'slut'
];

// IELTS/TOEFL relevant stop words for quality check
const QUALITY_INDICATORS = {
    goodConnectors: ['however', 'moreover', 'furthermore', 'therefore', 'consequently', 'nevertheless', 'nonetheless', 'additionally', 'similarly', 'in contrast'],
    academicVocab: ['demonstrate', 'illustrate', 'significant', 'substantial', 'considerable', 'evident', 'apparent', 'crucial', 'essential', 'fundamental'],
    essayStructure: ['introduction', 'conclusion', 'firstly', 'secondly', 'finally', 'in conclusion', 'to summarize', 'in summary'],
};

export interface ModerationResult {
    isApproved: boolean;
    flags: ModerationFlag[];
    score: number; // 0-100, higher is better
    suggestions: string[];
}

export interface ModerationFlag {
    type: 'spam' | 'profanity' | 'quality' | 'length' | 'structure';
    severity: 'low' | 'medium' | 'high';
    message: string;
    details?: string;
}

/**
 * Main moderation function - checks all aspects of content
 */
export function moderateContent(content: string, type: 'essay' | 'feedback' | 'prompt'): ModerationResult {
    const flags: ModerationFlag[] = [];
    let score = 100;
    const suggestions: string[] = [];

    // 1. Spam check
    const spamResult = checkSpam(content);
    if (spamResult.detected) {
        flags.push({
            type: 'spam',
            severity: 'high',
            message: 'Potential spam content detected',
            details: `Found ${spamResult.matches} spam indicators`
        });
        score -= 30;
    }

    // 2. Profanity check
    const profanityResult = checkProfanity(content);
    if (profanityResult.detected) {
        flags.push({
            type: 'profanity',
            severity: profanityResult.count > 2 ? 'high' : 'medium',
            message: 'Inappropriate language detected',
            details: `Found ${profanityResult.count} instance(s)`
        });
        score -= profanityResult.count * 10;
    }

    // 3. Length check
    const lengthResult = checkLength(content, type);
    if (!lengthResult.valid) {
        flags.push({
            type: 'length',
            severity: 'medium',
            message: lengthResult.message,
        });
        score -= 15;
    }

    // 4. Quality check (for essays)
    if (type === 'essay') {
        const qualityResult = checkEssayQuality(content);
        if (qualityResult.issues.length > 0) {
            qualityResult.issues.forEach(issue => {
                flags.push({
                    type: 'quality',
                    severity: 'low',
                    message: issue,
                });
            });
            score -= qualityResult.issues.length * 5;
        }
        suggestions.push(...qualityResult.suggestions);
    }

    // Ensure score doesn't go below 0
    score = Math.max(0, score);

    return {
        isApproved: score >= 50 && !flags.some(f => f.severity === 'high'),
        flags,
        score,
        suggestions
    };
}

/**
 * Check for spam patterns
 */
function checkSpam(content: string): { detected: boolean; matches: number } {
    let matches = 0;
    
    SPAM_PATTERNS.forEach(pattern => {
        const found = content.match(pattern);
        if (found) {
            matches += found.length;
        }
    });

    return {
        detected: matches > 0,
        matches
    };
}

/**
 * Check for profanity
 */
function checkProfanity(content: string): { detected: boolean; count: number; words: string[] } {
    const lowerContent = content.toLowerCase();
    const foundWords: string[] = [];
    
    PROFANITY_LIST.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        if (regex.test(lowerContent)) {
            foundWords.push(word);
        }
    });

    return {
        detected: foundWords.length > 0,
        count: foundWords.length,
        words: [...new Set(foundWords)]
    };
}

/**
 * Check content length requirements
 */
function checkLength(content: string, type: 'essay' | 'feedback' | 'prompt'): { valid: boolean; message: string } {
    const wordCount = content.trim().split(/\s+/).filter(w => w.length > 0).length;
    
    const requirements = {
        essay: { min: 150, max: 1000, name: 'Essay' },
        feedback: { min: 50, max: 2000, name: 'Feedback' },
        prompt: { min: 10, max: 500, name: 'Prompt' }
    };

    const req = requirements[type];
    
    if (wordCount < req.min) {
        return {
            valid: false,
            message: `${req.name} must be at least ${req.min} words (currently ${wordCount})`
        };
    }
    
    if (wordCount > req.max) {
        return {
            valid: false,
            message: `${req.name} exceeds maximum of ${req.max} words (currently ${wordCount})`
        };
    }

    return { valid: true, message: '' };
}

/**
 * Check essay quality indicators
 */
function checkEssayQuality(content: string): { issues: string[]; suggestions: string[] } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    const lowerContent = content.toLowerCase();

    // Check for paragraph structure
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0);
    if (paragraphs.length < 3) {
        issues.push('Essay should have at least 3 paragraphs (introduction, body, conclusion)');
    }

    // Check for connecting words
    const connectorCount = QUALITY_INDICATORS.goodConnectors.filter(
        word => lowerContent.includes(word)
    ).length;
    if (connectorCount < 2) {
        suggestions.push('Consider using more connecting words (e.g., "however", "moreover", "therefore")');
    }

    // Check for academic vocabulary
    const academicCount = QUALITY_INDICATORS.academicVocab.filter(
        word => lowerContent.includes(word)
    ).length;
    if (academicCount < 3) {
        suggestions.push('Try incorporating more academic vocabulary to strengthen your essay');
    }

    // Check for essay structure indicators
    const hasIntroduction = QUALITY_INDICATORS.essayStructure.some(
        word => lowerContent.includes(word) && lowerContent.indexOf(word) < 100
    );
    const hasConclusion = lowerContent.includes('in conclusion') || 
                          lowerContent.includes('to summarize') || 
                          lowerContent.includes('in summary') ||
                          lowerContent.includes('to conclude');
    
    if (!hasConclusion && paragraphs.length >= 3) {
        suggestions.push('Consider adding a clear conclusion phrase (e.g., "In conclusion,")');
    }

    // Check for repetitive words
    const words = lowerContent.match(/\b[a-z]+\b/g) || [];
    const wordFrequency: Record<string, number> = {};
    words.forEach(word => {
        if (word.length > 3) { // Only check words longer than 3 chars
            wordFrequency[word] = (wordFrequency[word] || 0) + 1;
        }
    });
    
    const repetitiveWords = Object.entries(wordFrequency)
        .filter(([_, count]) => count > 5)
        .map(([word]) => word);
    
    if (repetitiveWords.length > 0) {
        suggestions.push(`Consider using synonyms for frequently used words: ${repetitiveWords.slice(0, 3).join(', ')}`);
    }

    return { issues, suggestions };
}

/**
 * Sanitize content for safe display
 */
export function sanitizeContent(content: string): string {
    return content
        // Remove potential XSS vectors
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/on\w+="[^"]*"/gi, '')
        .replace(/on\w+='[^']*'/gi, '')
        // Normalize whitespace
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Generate content hash for deduplication
 */
export function generateContentHash(content: string): string {
    // Simple hash function for deduplication
    let hash = 0;
    const normalized = content.toLowerCase().replace(/\s+/g, ' ');
    
    for (let i = 0; i < normalized.length; i++) {
        const char = normalized.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    
    return Math.abs(hash).toString(16);
}

/**
 * Check if content is duplicate (similar to existing content)
 */
export function checkDuplicate(content: string, existingHashes: string[]): boolean {
    const hash = generateContentHash(content);
    return existingHashes.includes(hash);
}

/**
 * Extract topics/tags from essay content
 */
export function extractTopics(content: string): string[] {
    const topics: string[] = [];
    const lowerContent = content.toLowerCase();

    // Common IELTS/TOEFL topics
    const topicKeywords: Record<string, string[]> = {
        'Education': ['school', 'university', 'student', 'teacher', 'learning', 'education', 'academic'],
        'Technology': ['technology', 'internet', 'computer', 'digital', 'online', 'software', 'ai'],
        'Environment': ['environment', 'climate', 'pollution', 'global warming', 'sustainable', 'green'],
        'Health': ['health', 'medical', 'hospital', 'disease', 'exercise', 'diet', 'mental health'],
        'Work': ['job', 'career', 'work', 'employment', 'salary', 'workplace', 'profession'],
        'Society': ['society', 'community', 'social', 'culture', 'tradition', 'modern'],
        'Government': ['government', 'policy', 'law', 'tax', 'public', 'political'],
        'Transport': ['transport', 'car', 'public transport', 'traffic', 'commute', 'vehicle'],
        'Family': ['family', 'parent', 'child', 'marriage', 'relationship', 'home'],
        'Opinion': ['agree', 'disagree', 'believe', 'think', 'opinion', 'view'],
    };

    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
        const matchCount = keywords.filter(kw => lowerContent.includes(kw)).length;
        if (matchCount >= 2) {
            topics.push(topic);
        }
    });

    return topics.slice(0, 3); // Return top 3 topics
}

/**
 * Estimate difficulty level based on content
 */
export function estimateDifficulty(content: string): 'beginner' | 'intermediate' | 'advanced' {
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
    const lowerContent = content.toLowerCase();
    
    // Count academic vocabulary
    const academicCount = QUALITY_INDICATORS.academicVocab.filter(
        word => lowerContent.includes(word)
    ).length;
    
    // Count complex sentence structures (approximation)
    const complexStructures = (content.match(/[;,:]/g) || []).length;
    
    // Calculate complexity score
    let score = 0;
    if (wordCount > 300) score += 2;
    else if (wordCount > 200) score += 1;
    
    if (academicCount > 5) score += 2;
    else if (academicCount > 2) score += 1;
    
    if (complexStructures > 10) score += 2;
    else if (complexStructures > 5) score += 1;

    if (score >= 4) return 'advanced';
    if (score >= 2) return 'intermediate';
    return 'beginner';
}
