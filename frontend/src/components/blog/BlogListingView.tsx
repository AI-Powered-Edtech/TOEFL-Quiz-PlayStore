import { motion } from 'framer-motion';
import { Search, Sparkles, Star, ChevronRight, PenTool, BookOpen, Headphones, Book, Clock } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase';
import { AppView, SectionType } from '../../types';
import { fetchFeaturedPosts, fetchBlogPostsBySection } from '../../services/blogService';
import { BlogPost } from '../../data/blogPosts';

interface BlogListingViewProps {
    onNavigate: (view: AppView, params?: any) => void;
}

export const BlogListingView: React.FC<BlogListingViewProps> = ({ onNavigate }) => {
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [featuredPosts, setFeaturedPosts] = useState<BlogPost[]>([]);
    const [categoryProgress, setCategoryProgress] = useState({
        STRUCTURE: { completed: 10, total: 19 },
        WRITTEN: { completed: 5, total: 41 },
        LISTENING: { completed: 20, total: 27 },
        READING: { completed: 1, total: 6 },
    });

    useEffect(() => {
        let isMounted = true;
        fetchFeaturedPosts().then(posts => {
            if (isMounted) setFeaturedPosts(posts);
        }).catch(console.error);
        return () => { isMounted = false; };
    }, []);

    useEffect(() => {
        const fetchProgress = async () => {
            if (!user) return;
            try {
                const history = JSON.parse(localStorage.getItem(`quiz_history_${user.id}`) || '[]');
                
                const completedSkills: Record<string, Set<number>> = {};
                
                for (const row of history) {
                    if (!row.skill_id) continue;
                    const sec = (row.section || 'structure').toUpperCase();
                    const mappedSec = sec === 'WRITTEN' ? 'WRITTEN' : (sec === 'STRUCTURE' ? 'STRUCTURE' : (sec === 'LISTENING' ? 'LISTENING' : 'READING'));
                    
                    if (!completedSkills[mappedSec]) completedSkills[mappedSec] = new Set();
                    completedSkills[mappedSec].add(row.skill_id);
                }

                setCategoryProgress(prev => ({
                    STRUCTURE: { ...prev.STRUCTURE, completed: completedSkills['STRUCTURE']?.size || prev.STRUCTURE.completed },
                    WRITTEN: { ...prev.WRITTEN, completed: completedSkills['WRITTEN']?.size || prev.WRITTEN.completed },
                    LISTENING: { ...prev.LISTENING, completed: completedSkills['LISTENING']?.size || prev.LISTENING.completed },
                    READING: { ...prev.READING, completed: completedSkills['READING']?.size || prev.READING.completed },
                }));

            } catch (err) {
                console.error("Failed to load progress", err);
            }
        };
        fetchProgress();
    }, [user]);

    const handleCategoryClick = (category: SectionType) => {
        if (category === 'STRUCTURE' || category === 'WRITTEN') {
            onNavigate(AppView.SKILL_MODULE_LIST);
        } else {
            onNavigate(AppView.BLOG_SKILL_PICKER, { selectedSkillCategory: category });
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-white pb-24">

            {/* Header & Search */}
            <div className="pt-8 px-5 pb-4 sticky top-0 bg-white/90 backdrop-blur-md z-40">
                <div className="relative">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Search className="w-5 h-5 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search skills, lessons..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-100/80 text-slate-700 py-3.5 pl-11 pr-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium placeholder-slate-400"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden">
                {/* Featured Section */}
                <div className="px-5 mt-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-[22px] font-black font-serif text-slate-900 flex items-center gap-2">
                            Featured <Sparkles className="w-5 h-5 text-amber-400 fill-amber-400" />
                        </h2>
                        <button className="text-blue-600 font-bold text-sm flex items-center gap-0.5 hover:text-blue-700">
                            See all <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex gap-4 overflow-x-auto pb-6 -mx-5 px-5 custom-scrollbar snap-x">
                        {featuredPosts.length === 0 ? (
                            <p className="text-sm text-slate-400 font-medium">No featured skills found.</p>
                        ) : (
                            featuredPosts.map((post, idx) => (
                                <div
                                    key={post.id}
                                    onClick={() => onNavigate(AppView.BLOG_POST, { postId: post.id })}
                                    className="snap-center shrink-0 w-[240px] md:w-[280px] bg-white border border-slate-100 rounded-[28px] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] cursor-pointer active:scale-95 transition-transform"
                                >
                                    <div className={`h-[140px] ${idx % 2 === 0 ? 'bg-blue-500' : 'bg-emerald-400'} p-4 relative`}>
                                        <div className="absolute top-4 left-4 bg-white/95 text-slate-900 text-xs font-bold px-3 py-1.5 rounded-full">
                                            {post.category || 'TOEFL'}
                                        </div>
                                        <div className="absolute bottom-4 right-4 bg-black/20 text-white backdrop-blur-md text-xs font-bold px-2 py-1 flex items-center gap-1 rounded-lg">
                                            <Clock className="w-3 h-3" /> {post.readTime}
                                        </div>
                                    </div>
                                    <div className="p-5">
                                        <h3 className="font-bold text-slate-900 text-lg font-serif leading-tight mb-2 line-clamp-2">{post.title}</h3>
                                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
                                            {post.excerpt || 'Learn strategies to improve your score on this topic.'}
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <span className={`text-xs font-bold ${idx % 2 === 0 ? 'text-blue-600' : 'text-emerald-600'} flex items-center gap-1`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${idx % 2 === 0 ? 'bg-blue-600' : 'bg-emerald-600'}`} /> Core Skill
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Categories */}
                <div className="px-5 mt-2">
                    <h2 className="text-[22px] font-black font-serif text-slate-900 mb-5">Skill categories</h2>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Structure */}
                        <div
                            onClick={() => handleCategoryClick('STRUCTURE')}
                            className="border border-slate-100 rounded-3xl p-4 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer active:scale-95"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                                    <PenTool className="w-5 h-5 text-blue-600" />
                                </div>
                                <h3 className="font-bold text-slate-900">Structure</h3>
                            </div>
                            <div className="mb-3">
                                <div className="flex justify-between text-xs font-bold text-slate-500 mb-1.5">
                                    <span>Progress</span>
                                    <span className="text-blue-600">{categoryProgress.STRUCTURE.completed}/{categoryProgress.STRUCTURE.total}</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${(categoryProgress.STRUCTURE.completed / categoryProgress.STRUCTURE.total) * 100}%` }} />
                                </div>
                            </div>
                            <p className="text-[10px] sm:text-xs text-slate-500 font-medium">19 skills • grammar</p>
                        </div>

                        {/* Written */}
                        <div
                            onClick={() => handleCategoryClick('WRITTEN')}
                            className="border border-slate-100 rounded-3xl p-4 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer active:scale-95"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-fuchsia-50 flex items-center justify-center">
                                    <PenTool className="w-5 h-5 text-fuchsia-600" />
                                </div>
                                <h3 className="font-bold text-slate-900">Written</h3>
                            </div>
                            <div className="mb-3">
                                <div className="flex justify-between text-xs font-bold text-slate-500 mb-1.5">
                                    <span>Progress</span>
                                    <span className="text-fuchsia-600">{categoryProgress.WRITTEN.completed}/{categoryProgress.WRITTEN.total}</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-fuchsia-500 rounded-full" style={{ width: `${(categoryProgress.WRITTEN.completed / categoryProgress.WRITTEN.total) * 100}%` }} />
                                </div>
                            </div>
                            <p className="text-[10px] sm:text-xs text-slate-500 font-medium">41 skills • error ID</p>
                        </div>

                        {/* Listening */}
                        <div
                            onClick={() => handleCategoryClick('LISTENING')}
                            className="border border-slate-100 rounded-3xl p-4 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer active:scale-95"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                                    <Headphones className="w-5 h-5 text-emerald-600" />
                                </div>
                                <h3 className="font-bold text-slate-900">Listening</h3>
                            </div>
                            <div className="mb-3">
                                <div className="flex justify-between text-xs font-bold text-slate-500 mb-1.5">
                                    <span>Progress</span>
                                    <span className="text-emerald-600">{categoryProgress.LISTENING.completed}/{categoryProgress.LISTENING.total}</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(categoryProgress.LISTENING.completed / categoryProgress.LISTENING.total) * 100}%` }} />
                                </div>
                            </div>
                            <p className="text-[10px] sm:text-xs text-slate-500 font-medium">27 skills • comprehension</p>
                        </div>

                        {/* Reading */}
                        <div
                            onClick={() => handleCategoryClick('READING')}
                            className="border border-slate-100 rounded-3xl p-4 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer active:scale-95"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
                                    <BookOpen className="w-5 h-5 text-orange-600" />
                                </div>
                                <h3 className="font-bold text-slate-900">Reading</h3>
                            </div>
                            <div className="mb-3">
                                <div className="flex justify-between text-xs font-bold text-slate-500 mb-1.5">
                                    <span>Progress</span>
                                    <span className="text-orange-600">{categoryProgress.READING.completed}/{categoryProgress.READING.total}</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(categoryProgress.READING.completed / categoryProgress.READING.total) * 100}%` }} />
                                </div>
                            </div>
                            <p className="text-[10px] sm:text-xs text-slate-500 font-medium">6 skills • vocabulary</p>
                        </div>
                    </div>
                </div>

                {/* Recommended Section */}
                <div className="px-5 mt-10 mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-[22px] font-black font-serif text-slate-900">Recommended</h2>
                        <button className="text-blue-600 font-bold text-sm hover:text-blue-700">More</button>
                    </div>

                    <div className="space-y-3">
                        <div
                            onClick={() => onNavigate(AppView.BLOG_POST, { postId: 'idioms-toefl-guide' })}
                            className="border border-slate-100 rounded-2xl p-4 flex items-center gap-4 bg-white shadow-sm cursor-pointer hover:bg-slate-50 active:scale-[0.98] transition-all"
                        >
                            <div className="w-14 h-14 bg-indigo-400 rounded-xl flex items-center justify-center shrink-0">
                                <Book className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-slate-900 text-[15px] mb-1">Idioms for TOEFL</h3>
                                <p className="text-xs text-slate-500 font-medium">15 min • 5 lessons</p>
                            </div>
                        </div>

                        <div
                            onClick={() => onNavigate(AppView.BLOG_POST, { postId: 'lecture-breakdown' })}
                            className="border border-slate-100 rounded-2xl p-4 flex items-center gap-4 bg-white shadow-sm cursor-pointer hover:bg-slate-50 active:scale-[0.98] transition-all"
                        >
                            <div className="w-14 h-14 bg-teal-400 rounded-xl flex items-center justify-center shrink-0">
                                <Headphones className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-slate-900 text-[15px] mb-1">Lecture Breakdown</h3>
                                <p className="text-xs text-slate-500 font-medium">20 min • 3 lessons</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
