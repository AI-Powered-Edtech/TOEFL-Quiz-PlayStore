import { jsonrepair } from 'jsonrepair';

/**
 * Enhanced JSON parser that handles truncated JSON (due to token limits)
 * and cleans up Markdown formatting often returned by LLMs.
 */
export const parseJsonSafely = (rawContent: string): any => {
    if (!rawContent || typeof rawContent !== 'string') return {};

    // 1. Clean Markdown and thinking blocks
    let cleaned = rawContent
        .replace(/<think>[\s\S]*?<\/think>/g, '')
        .replace(/<thought>[\s\S]*?<\/thought>/g, '')
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();

    // 2. Try to extract the JSON part if there is surrounding text
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    
    let startIndex = -1;
    let isArray = false;

    if (firstBrace !== -1 && firstBracket !== -1) {
        if (firstBrace < firstBracket) {
            startIndex = firstBrace;
            isArray = false;
        } else {
            startIndex = firstBracket;
            isArray = true;
        }
    } else if (firstBrace !== -1) {
        startIndex = firstBrace;
        isArray = false;
    } else if (firstBracket !== -1) {
        startIndex = firstBracket;
        isArray = true;
    }

    if (startIndex !== -1) {
        const lastIndex = isArray ? cleaned.lastIndexOf(']') : cleaned.lastIndexOf('}');
        if (lastIndex !== -1 && lastIndex >= startIndex) {
            cleaned = cleaned.substring(startIndex, lastIndex + 1);
        } else {
            cleaned = cleaned.substring(startIndex);
        }
    }

    // 3. Try standard parse first
    try {
        return JSON.parse(cleaned);
    } catch (e1) {
        // 4. Try jsonrepair for truncated or malformed JSON
        try {
            const repaired = jsonrepair(cleaned);
            return JSON.parse(repaired);
        } catch (e2) {
            // 5. Fallback: aggressive extraction
            // Sometimes the JSON is so broken jsonrepair fails. 
            // We can try to find the last valid closing brace/bracket and parse that.
            try {
                const lastBrace = cleaned.lastIndexOf('}');
                const lastBracket = cleaned.lastIndexOf(']');
                const endIndex = Math.max(lastBrace, lastBracket);
                
                if (endIndex !== -1) {
                    const truncated = cleaned.substring(0, endIndex + 1);
                    const repaired2 = jsonrepair(truncated);
                    return JSON.parse(repaired2);
                }
            } catch (e3) {
                console.error('[jsonParser] All parsing attempts failed. Raw:', rawContent.substring(0, 100));
            }
            
            // If everything fails, return an empty object/array to prevent app crashes
            return cleaned.trim().startsWith('[') ? [] : {};
        }
    }
};
