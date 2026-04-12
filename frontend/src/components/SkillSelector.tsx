
import { BookOpen, Headphones, Book, ChevronDown, ChevronRight, PlayCircle, Play } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { TOEFL_STRUCTURE_SKILLS, TOEFL_LISTENING_SKILLS, TOEFL_READING_SKILLS } from '../data/skills';
import { supabase } from '../services/supabase';
import { Skill, SectionType } from '../types';

interface SkillSelectorProps {
  onSelectSkill: (skill: Skill) => void;
  isLoading?: boolean;
  hideHeader?: boolean;
  initialSection?: SectionType;
  userId?: string;
}

// Per-skill stats from quiz_results
interface SkillStats {
  accuracy: number; // 0-100
  quizCount: number;
  totalCorrect: number;
  totalQuestions: number;
}

// Circular Progress Ring Component
const CircularProgress: React.FC<{ percentage: number; size?: number; strokeWidth?: number }> = ({
  percentage,
  size = 56,
  strokeWidth = 5
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const center = size / 2;

  // Color based on percentage
  const getColor = (pct: number) => {
    if (pct >= 80) return '#22c55e'; // green
    if (pct >= 50) return '#f59e0b'; // amber/yellow
    if (pct > 0) return '#f97316';   // orange
    return '#e2e8f0';                // slate-200 (no data)
  };

  const color = getColor(percentage);

  return (
    <svg width={size} height={size} className="transform -rotate-90 flex-shrink-0">
      {/* Background circle */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth={strokeWidth}
      />
      {/* Progress arc */}
      {percentage > 0 && (
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      )}
      {/* Center text */}
      <text
        x={center}
        y={center}
        textAnchor="middle"
        dominantBaseline="central"
        className="transform rotate-90 origin-center"
        fill="#334155"
        fontSize={percentage > 0 ? "13" : "11"}
        fontWeight="800"
      >
        {percentage > 0 ? `${Math.round(percentage)}%` : '—'}
      </text>
    </svg>
  );
};

export const SkillSelector: React.FC<SkillSelectorProps> = ({ onSelectSkill, isLoading, hideHeader, initialSection, userId }) => {
  const [activeSection, setActiveSection] = useState<SectionType>(initialSection || 'STRUCTURE');

  // Track active category index PER PART. 
  // Key: Part Name, Value: Index of the selected category in that part
  const [activeCategoryIndices, setActiveCategoryIndices] = useState<Record<string, number>>({});

  // Per-skill stats
  const [skillStatsMap, setSkillStatsMap] = useState<Record<number, SkillStats>>({});

  let currentSkills: Skill[] = [];
  if (activeSection === 'STRUCTURE') currentSkills = TOEFL_STRUCTURE_SKILLS;
  else if (activeSection === 'LISTENING') currentSkills = TOEFL_LISTENING_SKILLS;
  else currentSkills = TOEFL_READING_SKILLS;

  const getCleanCategoryName = (categoryName: string) => {
    // Remove "I. ", "II. ", etc. or "Part A: "
    return categoryName
      .replace(/^[IVX]+\.\s+/, '')
      .replace(/^Part\s+[A-Z][:\.]\s+/, '');
  };

  // Extract numeric skill ID from string like "S01" -> 1
  const getNumericSkillId = (skill: Skill): number => {
    const match = skill.id.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  // Map SectionType to DB section values
  const getSectionFilter = (section: SectionType): string[] => {
    switch (section) {
      case 'STRUCTURE': return ['structure', 'written'];
      case 'LISTENING': return ['listening'];
      case 'READING': return ['reading'];
      default: return ['structure'];
    }
  };

  // Fetch per-skill stats from local storage, filtered by active section
  useEffect(() => {
    const fetchSkillStats = async () => {
      try {
        const sectionValues = getSectionFilter(activeSection);
        const history = JSON.parse(localStorage.getItem('quiz_history') || '[]');
        
        const statsMap: Record<number, SkillStats> = {};
        
        for (const entry of history) {
          if (!sectionValues.includes(entry.section)) continue;
          const skillId = entry.skill_id;
          if (!skillId) continue;
          
          if (!statsMap[skillId]) {
            statsMap[skillId] = { accuracy: 0, quizCount: 0, totalCorrect: 0, totalQuestions: 0 };
          }
          statsMap[skillId].quizCount += 1;
          statsMap[skillId].totalCorrect += (entry.is_correct ? 1 : 0);
          statsMap[skillId].totalQuestions += 1;
        }

        Object.values(statsMap).forEach(stats => {
          stats.accuracy = stats.totalQuestions > 0
            ? Math.round((stats.totalCorrect / stats.totalQuestions) * 100)
            : 0;
        });

        setSkillStatsMap(statsMap);
      } catch (err) {
        console.error('[SkillSelector] Error fetching stats:', err);
      }
    };

    fetchSkillStats();
  }, [userId, activeSection]);

  // Group by Part first
  const groupedByPart = currentSkills.reduce((acc, skill) => {
    const part = skill.part || 'Main';
    if (!acc[part]) {
      acc[part] = { skills: [], categories: {}, categoryNames: [] };
    }
    acc[part].skills.push(skill);

    if (!acc[part].categories[skill.category]) {
      acc[part].categories[skill.category] = [];
      acc[part].categoryNames.push(skill.category);
    }
    acc[part].categories[skill.category].push(skill);
    return acc;
  }, {} as Record<string, {
    skills: Skill[],
    categories: Record<string, Skill[]>,
    categoryNames: string[]
  }>);

  // Initialize active indices when section changes or on mount
  useEffect(() => {
    const initialIndices: Record<string, number> = {};
    Object.keys(groupedByPart).forEach(key => {
      initialIndices[key] = 0;
    });
    setActiveCategoryIndices(initialIndices);
  }, [activeSection]);


  const getThemeColors = (section: SectionType) => {
    return {
      primary: 'text-slate-700',
      bg: 'bg-blue-50',
      border: 'border-slate-200',
      wrapper: 'bg-white',
      button: 'bg-blue-600 hover:bg-blue-700',
      lightBtn: 'bg-blue-50 text-slate-700',
      ring: 'ring-slate-200'
    };
  };

  const theme = getThemeColors(activeSection);

  // Get clean skill name (remove "Skill N: " prefix)
  const getCleanSkillName = (skill: Skill): string => {
    if (skill.name.includes(':')) {
      return skill.name.split(':')[1].trim();
    }
    return skill.name;
  };

  return (
    <div className="space-y-4 animate-fade-in max-w-5xl mx-auto pb-8">
      {!hideHeader && (
        <div className="text-left space-y-3 mb-4">
          <div className="flex items-center space-x-2 text-slate-800">
            <BookOpen className="w-4 h-4" />
            <h2 className="text-base font-bold">Learning Path</h2>
          </div>

          <div className="flex md:inline-flex bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
            {(['STRUCTURE', 'LISTENING', 'READING'] as SectionType[]).map((sec) => (
              <button
                key={sec}
                onClick={() => setActiveSection(sec)}
                className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeSection === sec
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                {sec.charAt(0) + sec.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      )}
      {hideHeader && (
        <div className="flex md:inline-flex bg-white border border-slate-200 p-1 rounded-xl shadow-sm mb-4 w-full md:w-auto">
          {(['STRUCTURE', 'LISTENING', 'READING'] as SectionType[]).map((sec) => (
            <button
              key={sec}
              onClick={() => setActiveSection(sec)}
              className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeSection === sec
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              {sec.charAt(0) + sec.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      )}

      {Object.entries(groupedByPart).map(([partName, data], partIndex) => {
        const activeIndex = activeCategoryIndices[partName] || 0;
        const activeCategoryName = data.categoryNames[activeIndex];
        const activeSkills = data.categories[activeCategoryName] || [];
        const cleanActiveName = activeCategoryName ? getCleanCategoryName(activeCategoryName) : '';

        return (
          <div key={partName} className="space-y-6">
            {/* PART HEADER */}
            <div className="flex items-center gap-4">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{partName}</h2>
              <div className="h-px bg-slate-200 flex-grow"></div>
            </div>

            {/* MODULE SELECTOR GRID */}
            <div className="bg-white rounded-[24px] border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Book className={`w-5 h-5 text-blue-600`} />
                  <span className="font-bold text-slate-800">
                    {data.skills.length} SKILLS
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Select Module
                </div>
              </div>

              {/* Grid of CATEGORIES (Modules) */}
              <div className="flex flex-wrap gap-2">
                {data.categoryNames.map((catName, idx) => {
                  const isActive = idx === activeIndex;
                  const displayNum = (idx + 1).toString().padStart(2, '0');

                  return (
                    <button
                      key={catName}
                      onClick={() => setActiveCategoryIndices(prev => ({
                        ...prev,
                        [partName]: prev[partName] === idx ? -1 : idx
                      }))}
                      className={`
                             w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold transition-all border
                             ${isActive
                          ? `bg-blue-600 text-white border-transparent shadow-md transform scale-105`
                          : `bg-slate-50 text-slate-400 border-slate-100 hover:border-blue-200 hover:text-blue-600 hover:bg-blue-50`}
                           `}
                    >
                      {displayNum}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ACTIVE CATEGORY CARD */}
            {activeSkills.length > 0 && (
              <div className="space-y-3 animate-fade-in-up">
                {/* Category Header */}
                <div className="flex items-center gap-3 px-1">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm border border-blue-100">
                    {(activeIndex + 1).toString().padStart(2, '0')}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">{cleanActiveName}</h3>
                    <p className="text-[11px] text-slate-400 font-medium">{activeSkills.length} skills in this module</p>
                  </div>
                </div>

                {/* Redesigned Skill Cards */}
                <div className="space-y-2.5">
                  {activeSkills.map((skill) => {
                    const numericId = getNumericSkillId(skill);
                    const stats = skillStatsMap[numericId];
                    const accuracy = stats?.accuracy || 0;
                    const quizCount = stats?.quizCount || 0;

                    return (
                      <button
                        key={skill.id}
                        onClick={() => !isLoading && onSelectSkill(skill)}
                        className="w-full bg-[#F0F2F5] hover:bg-[#E8EBF0] rounded-2xl p-4 flex items-center gap-4 transition-all duration-200 active:scale-[0.98] group"
                      >
                        {/* Circular Progress Ring */}
                        <CircularProgress percentage={accuracy} size={56} strokeWidth={5} />

                        {/* Skill Info */}
                        <div className="flex-1 min-w-0 text-left">
                          <h4 className="text-[15px] font-bold text-slate-800 leading-tight truncate">
                            {getCleanSkillName(skill)}
                          </h4>
                          <p className="text-[13px] text-slate-500 font-medium mt-0.5">
                            {quizCount} Quiz{quizCount !== 1 ? '' : ''}
                          </p>
                        </div>

                        {/* Play Button */}
                        <div className="w-11 h-11 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-md group-hover:bg-blue-700 transition-colors group-hover:shadow-lg">
                          <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
