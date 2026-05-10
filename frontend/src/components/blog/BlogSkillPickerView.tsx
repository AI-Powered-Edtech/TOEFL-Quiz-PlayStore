import { motion } from 'framer-motion';
import { ArrowLeft, Check, Lock, Play, Lightbulb, ChevronRight, Search, CheckCircle2 } from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';

import { TOEFL_STRUCTURE_SKILLS, TOEFL_LISTENING_SKILLS, TOEFL_READING_SKILLS } from '../../data/skills';
import { useAuth } from '../../hooks/useAuth';
import { AppView, SectionType, Skill } from '../../types';
import { hasBlogPostForSkill } from '../../services/blogService';

// Combine all skills for easy lookup
const ALL_SKILLS = [...TOEFL_STRUCTURE_SKILLS, ...TOEFL_LISTENING_SKILLS, ...TOEFL_READING_SKILLS];

interface BlogSkillPickerViewProps {
    section: SectionType | null;
    onNavigate: (view: AppView, params?: any) => void;
    onBack: () => void;
}

export const BlogSkillPickerView: React.FC<BlogSkillPickerViewProps> = ({ section, onNavigate, onBack }) => {
    const { user } = useAuth();
    const [completedSkills, setCompletedSkills] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [availablePosts, setAvailablePosts] = useState<Set<string>>(new Set());

    // Determine the skills for the current section
    const sectionSkills = useMemo(() => {
        if (section === 'STRUCTURE') return TOEFL_STRUCTURE_SKILLS.filter(s => s.part === 'Structure');
        if (section === 'WRITTEN') return TOEFL_STRUCTURE_SKILLS.filter(s => s.part === 'Written Expression');
        if (section === 'LISTENING') return TOEFL_LISTENING_SKILLS;
        if (section === 'READING') return TOEFL_READING_SKILLS;
        return [];
    }, [section]);

    useEffect(() => {
        const fetchProgress = async () => {
            if (!user) return;
            try {
                const history = JSON.parse(localStorage.getItem(`quiz_history_${user.id}`) || '[]');
                const completed = new Set<string>();
                for (const entry of history) {
                    if (entry.skill_id) completed.add(String(entry.skill_id));
                }
                setCompletedSkills(completed);
            } catch (err) {
                console.error("Failed to load skill progress", err);
            }
        };
        fetchProgress();
    }, [user]);

    useEffect(() => {
        let mounted = true;
        Promise.all(sectionSkills.map(async (skill) => [skill.id, await hasBlogPostForSkill(skill.id)] as const))
            .then(rows => {
                if (!mounted) return;
                setAvailablePosts(new Set(rows.filter(([, available]) => available).map(([id]) => id)));
            })
            .catch(() => { if (mounted) setAvailablePosts(new Set()); });
        return () => { mounted = false; };
    }, [sectionSkills]);

    const handleSelectSkill = (skill: Skill) => {
        onNavigate(AppView.BLOG_POST, { postId: skill.id });
    };

    // Derived progress
    const totalSkills = sectionSkills.length;
    const completedCount = sectionSkills.filter(s => completedSkills.has(s.id)).length;
    // Determine the "Current" skill (first uncompleted)
    const currentSkillIndex = sectionSkills.findIndex(s => !completedSkills.has(s.id));
    const currentSkill = currentSkillIndex !== -1 ? sectionSkills[currentSkillIndex] : null;

    // Filter skills by search query (only relevant for List view but good to have)
    const filteredSkills = sectionSkills.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Group skills by category for List View
    const groupedSkills = useMemo(() => {
        const groups: { [key: string]: Skill[] } = {};
        filteredSkills.forEach(skill => {
            // Simplify category name by removing Roman numerals like "V. Subject/Verb Agreement" -> "SUBJECT/VERB AGREEMENT"
            const catName = skill.category?.replace(/^[I|V|X]+\.\s*/, '').toUpperCase() || 'OTHER';
            if (!groups[catName]) groups[catName] = [];
            groups[catName].push(skill);
        });
        return groups;
    }, [filteredSkills]);

    // UI Formatting Helpers
    const getSkillNumber = (skill: Skill) => {
        const match = skill.name.match(/Skill\s+(\d+)/i);
        return match ? parseInt(match[1], 10) : parseInt(skill.id.replace(/[^0-9]/g, ''), 10);
    };
    const getSkillShortName = (skill: Skill) => skill.name.split(':')[1]?.trim() || skill.name;

    // Grid View for Structure
    if (section === 'STRUCTURE') {
        return (
            <div className="flex flex-col min-h-screen bg-white">
                {/* Header */}
                <div className="flex items-center gap-4 px-5 pt-12 pb-4 bg-white sticky top-0 z-40">
                    <button onClick={onBack} className="p-2 -ml-2 text-slate-600 active:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-xl font-bold font-serif text-slate-900 leading-tight">Structure Skills</h1>
                        <p className="text-xs text-slate-500 mt-0.5">Select a skill to read or practice</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center overflow-hidden border border-blue-100">
                        {/* Avatar placeholder */}
                        <div className="w-5 h-5 text-blue-400">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-5 pb-12 custom-scrollbar">
                    {/* Progress Bar */}
                    <div className="mb-8 mt-2">
                        <div className="flex justify-between items-end mb-2">
                            <span className="font-bold text-slate-800 text-[15px]">Your Progress</span>
                            <span className="font-bold text-blue-600 text-[15px]">{completedCount}/{totalSkills}</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${(completedCount / totalSkills) * 100}%` }} />
                        </div>
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-4 gap-3 sm:gap-4 mb-10">
                        {sectionSkills.map((skill, index) => {
                            const num = getSkillNumber(skill);
                            const isCompleted = completedSkills.has(skill.id);
                            const isCurrent = skill.id === currentSkill?.id;
                            const isLocked = !isCompleted && !isCurrent;

                            return (
                                <button
                                    key={skill.id}
                                    onClick={() => handleSelectSkill(skill)}
                                    className={`relative aspect-square rounded-[20px] flex flex-col items-center justify-center border transition-all ${isCurrent
                                        ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-600/30 scale-105 z-10'
                                        : isCompleted
                                            ? 'bg-white border-blue-100 shadow-sm hover:border-blue-300'
                                            : 'bg-white border-slate-100 opacity-60'
                                        }`}
                                >
                                    {isCompleted && !isCurrent && (
                                        <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-0.5">
                                            <Check className="w-3 h-3" strokeWidth={3} />
                                        </div>
                                    )}
                                    <span className={`text-2xl font-black font-serif ${isCurrent ? 'text-white' : isCompleted ? 'text-slate-900' : 'text-slate-300'
                                        }`}>
                                        {num}
                                    </span>
                                    <span className={`text-[9px] font-bold tracking-widest mt-0.5 ${isCurrent ? 'text-blue-100' : isCompleted ? 'text-slate-400' : 'text-slate-300'
                                        }`}>
                                        {isCurrent ? 'START' : 'SKILL'}
                                    </span>
                                </button>
                            );
                        })
                        }
                    </div >

                    {/* Pro Tip */}
                    < div className="bg-blue-50/50 border border-blue-100 rounded-3xl p-5 flex gap-4" >
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
                            <Lightbulb className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 text-[15px] mb-1.5">Pro Tip</h4>
                            <p className="text-sm text-slate-600 leading-relaxed font-medium">
                                Structure skills are best learned in order. Master "Subjects and Verbs" before moving to "Objects of Prepositions".
                            </p>
                        </div>
                    </div >
                </div >
            </div >
        );
    }

    // List View for other sections (e.g. Written Expression)
    // Map section name nicely
    const sectionTitle = section === 'WRITTEN' ? 'Written Expression' :
        section === 'LISTENING' ? 'Listening Comprehension' :
            section === 'READING' ? 'Reading Comprehension' : 'Skills';

    return (
        <div className="flex flex-col min-h-screen bg-white">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-12 pb-4 bg-white sticky top-0 z-40">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 -ml-2 text-slate-600 active:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold font-serif text-slate-900 leading-tight">{sectionTitle}</h1>
                        <div className="flex items-center gap-3 mt-1.5">
                            <div className="h-1 w-24 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-fuchsia-500 rounded-full transition-all duration-500" style={{ width: `${(completedCount / totalSkills) * 100}%` }} />
                            </div>
                            <span className="text-xs text-slate-500 font-medium">{completedCount} of {totalSkills} completed</span>
                        </div>
                    </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-fuchsia-50 flex items-center justify-center border border-fuchsia-100">
                    <Search className="w-5 h-5 text-fuchsia-600" />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-12 custom-scrollbar">
                {/* Search Bar */}
                <div className="relative mb-6">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Search className="w-4 h-4 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search skills (e.g. 'Inversion')"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-50 text-slate-700 py-3 pl-10 pr-4 rounded-xl outline-none focus:ring-2 focus:ring-fuchsia-500/50 transition-all text-sm font-medium placeholder-slate-400 border border-slate-100"
                    />
                </div>

                {/* Grouped Skills */}
                <div className="space-y-8">
                    {Object.entries(groupedSkills).map(([category, skills]) => (
                        <div key={category}>
                            <h3 className="text-xs font-bold text-slate-400 tracking-wider mb-3">{category}</h3>
                            <div className="space-y-3">
                                {skills.map((skill) => {
                                    const numStr = skill.name.match(/Skill\s+(\d+)/i)?.[1] || skill.id.replace(/[^0-9]/g, '');
                                    const num = parseInt(numStr, 10);
                                    const shortName = getSkillShortName(skill);
                                    const isCompleted = completedSkills.has(skill.id);
                                    const isCurrent = skill.id === currentSkill?.id;
                                    const isLocked = !isCompleted && !isCurrent;

                                    if (isCurrent) {
                                        // Current Skill Style
                                        return (
                                            <button
                                                key={skill.id}
                                                onClick={() => handleSelectSkill(skill)}
                                                className="w-full text-left bg-white border border-slate-100 border-l-[3px] border-l-fuchsia-500 rounded-2xl p-4 flex items-center gap-4 shadow-md shadow-fuchsia-900/5 active:scale-[0.98] transition-all"
                                            >
                                                <div className="w-11 h-11 rounded-full bg-fuchsia-100 flex items-center justify-center shrink-0 relative">
                                                    <Play className="w-5 h-5 text-fuchsia-600 fill-fuchsia-600 ml-0.5" />
                                                    <div className="absolute top-0 right-0 w-3 h-3 bg-fuchsia-500 rounded-full border-2 border-white" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[10px] font-bold text-fuchsia-600 bg-fuchsia-50 px-2 py-0.5 rounded-md">Skill {num}</span>
                                                        <span className="text-[10px] font-bold text-fuchsia-500 uppercase tracking-wide">Current Skill</span>
                                                    </div>
                                                    <h4 className="font-bold font-serif text-slate-900 text-[15px] truncate">{shortName}</h4>
                                                </div>
                                                <ChevronRight className="w-5 h-5 text-fuchsia-400" />
                                            </button>
                                        );
                                    }

                                    if (isCompleted) {
                                        // Completed Style
                                        return (
                                            <button
                                                key={skill.id}
                                                onClick={() => handleSelectSkill(skill)}
                                                className="w-full text-left bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-4 active:scale-[0.98] transition-all"
                                            >
                                                <div className="w-11 h-11 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                                                    <Check className="w-5 h-5 text-emerald-500" strokeWidth={2.5} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[10px] font-bold text-fuchsia-500 bg-fuchsia-50 px-2 py-0.5 rounded-md">Skill {num}</span>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Completed</span>
                                                    </div>
                                                    <h4 className="font-bold font-serif text-slate-900 text-[15px] truncate">{shortName}</h4>
                                                </div>
                                                <ChevronRight className="w-5 h-5 text-slate-300 opacity-50" />
                                            </button>
                                        );
                                    }

                                    // Locked Style
                                    return (
                                        <button
                                            key={skill.id}
                                            onClick={() => handleSelectSkill(skill)}
                                            className="w-full text-left bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-4 opacity-90 active:scale-[0.98] transition-all"
                                        >
                                            <div className="w-11 h-11 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                                                <Lock className="w-4 h-4 text-slate-300" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">Skill {num}</span>
                                                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wide">Practice only</span>
                                                </div>
                                                <h4 className="font-bold font-serif text-slate-400 text-[15px] truncate">{shortName}</h4>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
