import { TOEFL_STRUCTURE_SKILLS, TOEFL_LISTENING_SKILLS, TOEFL_READING_SKILLS } from "../../data/skills";
import { SectionType, Skill } from "../../types";

export const isLikelyQuestion = (text: string): boolean => {
    const hasOptionTags = /\([A-D]\)/i.test(text) || /[A-D]\.\s/.test(text);
    const isShortAndQuestion = text.length < 300 && text.includes('?') && (text.match(/\./g) || []).length < 3;
    return hasOptionTags || isShortAndQuestion;
};

export const getTargetSkill = (topic: string, section: SectionType): Skill | null => {
    let skillList: Skill[] = [];
    if (section === 'STRUCTURE') skillList = TOEFL_STRUCTURE_SKILLS;
    else if (section === 'LISTENING') skillList = TOEFL_LISTENING_SKILLS;
    else skillList = TOEFL_READING_SKILLS;

    const exactMatch = skillList.find(s => s.name.toLowerCase().includes(topic.toLowerCase()));
    if (exactMatch) return exactMatch;

    const genericKeywords = ['structure', 'grammar', 'toefl', 'reading', 'listening', 'practice'];
    const isGeneric = genericKeywords.some(k => topic.toLowerCase() === k || topic.toLowerCase() === `toefl ${k}`);

    if (isGeneric) {
        const randomIndex = Math.floor(Math.random() * skillList.length);
        return skillList[randomIndex];
    }
    return null;
};
