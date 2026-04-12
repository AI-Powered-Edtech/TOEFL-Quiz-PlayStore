/**
 * Today's Focus Service
 * 
 * Automatically recommends the user's weakest skill based on quiz accuracy.
 * Uses data from quiz_results to identify areas needing improvement.
 */

import { supabase } from './supabase';
import { Skill, SectionType, TodaysFocusResult } from '../types';
import { TOEFL_STRUCTURE_SKILLS, TOEFL_LISTENING_SKILLS, TOEFL_READING_SKILLS } from '../data/skills';

// Per-skill stats from quiz_results
interface SkillStats {
  accuracy: number; // 0-100
  quizCount: number;
  totalCorrect: number;
  totalQuestions: number;
  skillId: number;
  section: string;
}

// All skills combined for lookup
const ALL_SKILLS: Skill[] = [
  ...TOEFL_STRUCTURE_SKILLS,
  ...TOEFL_LISTENING_SKILLS,
  ...TOEFL_READING_SKILLS
];

/**
 * Get section type from database section string
 */
function getSectionType(section: string): SectionType {
  const normalized = section.toLowerCase();
  if (normalized === 'listening') return 'LISTENING';
  if (normalized === 'reading') return 'READING';
  return 'STRUCTURE'; // includes 'structure' and 'written'
}

/**
 * Get skill by numeric ID
 */
function getSkillByNumericId(numericId: number): Skill | null {
  const skillId = numericId.toString().padStart(2, '0');
  const prefixedId = `S${skillId}`;
  return ALL_SKILLS.find(s => s.id === prefixedId) || null;
}

/**
 * Get default skill for new users (first Structure skill)
 */
function getDefaultSkill(): TodaysFocusResult {
  const defaultSkill = TOEFL_STRUCTURE_SKILLS[0];
  return {
    skill: defaultSkill,
    accuracy: 0,
    quizCount: 0,
    section: 'STRUCTURE',
    message: 'Start your learning journey'
  };
}

/**
 * Generate a motivational message based on accuracy
 */
function generateMessage(accuracy: number, skillName: string): string {
  if (accuracy === 0) {
    return 'Start your learning journey';
  } else if (accuracy < 40) {
    return 'Focus area: needs practice';
  } else if (accuracy < 60) {
    return 'Keep practicing to improve';
  } else if (accuracy < 80) {
    return 'Almost there! Push through';
  } else {
    return 'Great progress! Maintain it';
  }
}

export const TodaysFocusService = {
  /**
   * Get the recommended skill for Today's Focus
   * Returns the skill with lowest accuracy that has been attempted
   */
  async getRecommendedSkill(userId?: string): Promise<TodaysFocusResult> {
    try {
      // Build query for quiz_results
      let query = supabase
        .from('quiz_results')
        .select('skill_id, correct_count, total_questions, section')
        .not('skill_id', 'is', null);

      // Filter by user if provided (not guest)
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        // Ignore AbortError caused by React Strict Mode or navigation
        if (error?.name !== 'AbortError' && !error?.message?.includes('Fetch is aborted')) {
          console.warn('[TodaysFocusService] Failed to fetch skill stats:', error);
        }
        return getDefaultSkill();
      }

      // No quiz history
      if (!data || data.length === 0) {
        return getDefaultSkill();
      }

      // Aggregate stats per skill_id
      const statsMap: Record<number, SkillStats> = {};

      data.forEach((row: any) => {
        if (row.skill_id == null) return;

        const skillId = Number(row.skill_id);

        if (!statsMap[skillId]) {
          statsMap[skillId] = {
            accuracy: 0,
            quizCount: 0,
            totalCorrect: 0,
            totalQuestions: 0,
            skillId,
            section: row.section || 'structure'
          };
        }

        statsMap[skillId].quizCount += 1;
        statsMap[skillId].totalCorrect += (row.correct_count || 0);
        statsMap[skillId].totalQuestions += (row.total_questions || 0);
      });

      // Calculate accuracy for each skill
      Object.values(statsMap).forEach(stats => {
        stats.accuracy = stats.totalQuestions > 0
          ? Math.round((stats.totalCorrect / stats.totalQuestions) * 100)
          : 0;
      });

      // Find skill with lowest accuracy (that has been attempted)
      const statsArray = Object.values(statsMap);

      if (statsArray.length === 0) {
        return getDefaultSkill();
      }

      // Sort by accuracy ascending
      statsArray.sort((a, b) => a.accuracy - b.accuracy);

      // Get the weakest skill
      const weakestStats = statsArray[0];
      const skill = getSkillByNumericId(weakestStats.skillId);

      if (!skill) {
        // Suppress warning if skill is genuinely not found (e.g. invalid historic data)
        return getDefaultSkill();
      }

      const section = getSectionType(weakestStats.section);
      const cleanSkillName = skill.name.includes(':')
        ? skill.name.split(':')[1].trim()
        : skill.name;

      return {
        skill,
        accuracy: weakestStats.accuracy,
        quizCount: weakestStats.quizCount,
        section,
        message: generateMessage(weakestStats.accuracy, cleanSkillName)
      };

    } catch (err) {
      console.error('[TodaysFocusService] Error getting recommendation:', err);
      return getDefaultSkill();
    }
  },

  /**
   * Get skill stats for a specific section (for future use)
   */
  async getSectionStats(userId: string, section: SectionType): Promise<SkillStats[]> {
    const sectionFilter = section === 'STRUCTURE'
      ? ['structure', 'written']
      : [section.toLowerCase()];

    let query = supabase
      .from('quiz_results')
      .select('skill_id, correct_count, total_questions, section')
      .in('section', sectionFilter);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error || !data) {
      return [];
    }

    const statsMap: Record<number, SkillStats> = {};

    data.forEach((row: any) => {
      if (row.skill_id == null) return;

      const skillId = Number(row.skill_id);

      if (!statsMap[skillId]) {
        statsMap[skillId] = {
          accuracy: 0,
          quizCount: 0,
          totalCorrect: 0,
          totalQuestions: 0,
          skillId,
          section: row.section
        };
      }

      statsMap[skillId].quizCount += 1;
      statsMap[skillId].totalCorrect += (row.correct_count || 0);
      statsMap[skillId].totalQuestions += (row.total_questions || 0);
    });

    Object.values(statsMap).forEach(stats => {
      stats.accuracy = stats.totalQuestions > 0
        ? Math.round((stats.totalCorrect / stats.totalQuestions) * 100)
        : 0;
    });

    return Object.values(statsMap);
  }
};
