
import { LISTENING_RULES } from './listening';
import { READING_RULES } from './reading';
import { STRUCTURE_RULES } from './structure';
import { WRITTEN_RULES } from './written';

export const getSkillRule = (skillId: number | string, section: string = 'STRUCTURE'): string => {
    const numericId = typeof skillId === 'string' ? parseInt(skillId.replace(/\D/g, ''), 10) : skillId;
    const sec = section.toUpperCase();

    if (sec === 'LISTENING') {
        return LISTENING_RULES[numericId] || "";
    }
    if (sec === 'READING') {
        return READING_RULES[numericId] || "";
    }

    // Default to Structure/Written for STRUCTURE or WRITTEN sections
    if (STRUCTURE_RULES[numericId]) return STRUCTURE_RULES[numericId];
    if (WRITTEN_RULES[numericId]) return WRITTEN_RULES[numericId];

    return "";
};
