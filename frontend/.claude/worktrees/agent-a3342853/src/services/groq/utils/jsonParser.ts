import { jsonrepair } from 'jsonrepair';

export const parseJsonSafely = (cleanedContent: string): any => {
    try {
        return JSON.parse(jsonrepair(cleanedContent));
    } catch (e) {
        return JSON.parse(cleanedContent);
    }
};
