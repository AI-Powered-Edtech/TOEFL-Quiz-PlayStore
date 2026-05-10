import { Search, Sparkles, ChevronRight, PenTool, BookOpen, Headphones, Book, Clock, X } from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';

import { useAuth } from '../../hooks/useAuth';
import { AppView, SectionType } from '../../types';
import { fetchFeaturedPosts, fetchAllBlogPosts } from '../../services/blogService';
import { BlogPost } from '../../data/blogPosts';

interface BlogListingViewProps {
    onNavigate: (view: AppView, params?: any) => void;
}

const sectionToApi = (category: SectionType) => category;

export const BlogListingView: React.FC<BlogListingViewProps> = ({ onNavigate }) => {
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [featuredPosts, setFeaturedPosts] = useState<BlogPost[]>([]);
    const [allPosts, setAllPosts] = useState<BlogPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [categoryProgress, setCategoryProgress] = useState({
        STRUCTURE: { completed: 0, total: 60 },
        WRITTEN: { completed: 0, total: 40 },
        LISTENING: { completed: 0, total: 30 },
        READING: { completed: 0, total: 10 },
    });

    useEffect(() => {
        let isMounted = true;
        setIsLoading(true);
        Promise.all([fetchFeaturedPosts(), fetchAllBlogPosts()])
            .then(([featured, all]) => {
                if (!isMounted) return;
                setFeaturedPosts(featured);
                setAllPosts(all);
            })
            .finally(() => { if (isMounted) setIsLoading(false); });
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
            } catch {
                // Local progress is optional; leave defaults if unavailable.
            }
        };
        fetchProgress();
    }, [user]);

    const searchResults = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return [];
        return allPosts.filter(post => [post.title, post.excerpt, post.category, post.id, String(post.skillId || '')]
            .some(value => value.toLowerCase().includes(q)));
    }, [searchQuery, allPosts]);

    const handleCategoryClick = (category: SectionType) => {
        onNavigate(AppView.BLOG_SKILL_PICKER, { selectedSkillCategory: sectionToApi(category) });
    };

    const renderPostCard = (post: BlogPost, idx: number, compact = false) => (
        <button
            key={post.id}
            onClick={() => onNavigate(AppView.BLOG_POST, { postId: post.id })}
            className={compact
                ? 'w-full border border-slate-100 rounded-2xl p-4 flex items-center gap-4 bg-white shadow-sm cursor-pointer hover:bg-slate-50 active:scale-[0.98] transition-all text-left'
                : 'snap-center shrink-0 w-[240px] md:w-[280px] bg-white border border-slate-100 rounded-[28px] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] cursor-pointer active:scale-95 transition-transform text-left'}
        >
            {compact ? (
                <>
                    <div className={`w-14 h-14 ${idx % 2 === 0 ? 'bg-indigo-400' : 'bg-teal-400'} rounded-xl flex items-center justify-center shrink-0`}>
                        <Book className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 text-[15px] mb-1 line-clamp-1">{post.title}</h3>
                        <p className="text-xs text-slate-500 font-medium">{post.readTime} • {post.category}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300" />
                </>
            ) : (
                <>
                    <div className={`h-[140px] ${idx % 2 === 0 ? 'bg-blue-500' : 'bg-emerald-400'} p-4 relative`}>
                        <div className="absolute top-4 left-4 bg-white/95 text-slate-900 text-xs font-bold px-3 py-1.5 rounded-full">{post.category || 'TOEFL'}</div>
                        <div className="absolute bottom-4 right-4 bg-black/20 text-white backdrop-blur-md text-xs font-bold px-2 py-1 flex items-center gap-1 rounded-lg"><Clock className="w-3 h-3" /> {post.readTime}</div>
                    </div>
                    <div className="p-5">
                        <h3 className="font-bold text-slate-900 text-lg font-serif leading-tight mb-2 line-clamp-2">{post.title}</h3>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">{post.excerpt || 'Learn strategies to improve your TOEFL score on this topic.'}</p>
                        <span className={`text-xs font-bold ${idx % 2 === 0 ? 'text-blue-600' : 'text-emerald-600'} flex items-center gap-1`}><div className={`w-1.5 h-1.5 rounded-full ${idx % 2 === 0 ? 'bg-blue-600' : 'bg-emerald-600'}`} /> Lesson</span>
                    </div>
                </>
            )}
        </button>
    );

    return (
        <div className="flex flex-col min-h-screen bg-white pb-24">
            <div className="pt-8 px-5 pb-4 sticky top-0 bg-white/90 backdrop-blur-md z-40">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search skills, lessons..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-100/80 text-slate-700 py-3.5 pl-11 pr-11 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium placeholder-slate-400"
                    />
                    {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400"><X className="w-4 h-4" /></button>}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden">
                {searchQuery.trim() ? (
                    <div className="px-5 mt-4">
                        <h2 className="text-[22px] font-black font-serif text-slate-900 mb-4">Search results</h2>
                        {searchResults.length > 0 ? (
                            <div className="space-y-3">{searchResults.map((post, idx) => renderPostCard(post, idx, true))}</div>
                        ) : (
                            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                                <Search className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                                <h3 className="font-bold text-slate-800 mb-1">No lesson found</h3>
                                <p className="text-sm text-slate-500 mb-4">Try another keyword or browse the TOEFL skill library.</p>
                                <button onClick={() => setSearchQuery('')} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold">Browse skills</button>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="px-5 mt-4">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-[22px] font-black font-serif text-slate-900 flex items-center gap-2">Featured <Sparkles className="w-5 h-5 text-amber-400 fill-amber-400" /></h2>
                                <button onClick={() => setSearchQuery(' ')} className="text-blue-600 font-bold text-sm flex items-center gap-0.5 hover:text-blue-700">See all <ChevronRight className="w-4 h-4" /></button>
                            </div>
                            <div className="flex gap-4 overflow-x-auto pb-6 -mx-5 px-5 custom-scrollbar snap-x">
                                {isLoading ? <p className="text-sm text-slate-400 font-medium">Loading TOEFL lessons...</p> : featuredPosts.length === 0 ? <p className="text-sm text-slate-400 font-medium">No featured lessons found.</p> : featuredPosts.map((post, idx) => renderPostCard(post, idx))}
                            </div>
                        </div>

                        <div className="px-5 mt-2">
                            <h2 className="text-[22px] font-black font-serif text-slate-900 mb-5">Skill categories</h2>
                            <div className="grid grid-cols-2 gap-4">
                                {([
                                    ['STRUCTURE', 'Structure', PenTool, 'blue', 'grammar'],
                                    ['WRITTEN', 'Written', PenTool, 'fuchsia', 'error ID'],
                                    ['LISTENING', 'Listening', Headphones, 'emerald', 'comprehension'],
                                    ['READING', 'Reading', BookOpen, 'orange', 'vocabulary'],
                                ] as const).map(([key, title, Icon, color, desc]) => {
                                    const progress = categoryProgress[key];
                                    const pct = Math.min(100, (progress.completed / progress.total) * 100);
                                    return (
                                        <button key={key} onClick={() => handleCategoryClick(key as SectionType)} className="border border-slate-100 rounded-3xl p-4 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer active:scale-95 text-left">
                                            <div className="flex items-center gap-3 mb-4"><div className={`w-10 h-10 rounded-full bg-${color}-50 flex items-center justify-center`}><Icon className={`w-5 h-5 text-${color}-600`} /></div><h3 className="font-bold text-slate-900">{title}</h3></div>
                                            <div className="mb-3"><div className="flex justify-between text-xs font-bold text-slate-500 mb-1.5"><span>Progress</span><span className={`text-${color}-600`}>{progress.completed}/{progress.total}</span></div><div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden"><div className={`h-full bg-${color}-500 rounded-full`} style={{ width: `${pct}%` }} /></div></div>
                                            <p className="text-[10px] sm:text-xs text-slate-500 font-medium">{progress.total} skills • {desc}</p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="px-5 mt-10 mb-8">
                            <h2 className="text-[22px] font-black font-serif text-slate-900 mb-4">Recommended</h2>
                            <div className="space-y-3">{featuredPosts.slice(0, 2).map((post, idx) => renderPostCard(post, idx, true))}</div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
