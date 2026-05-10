import { motion, useScroll, useSpring, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock, User, Share2, Bookmark, Flame, ChevronRight, Play, X, BookOpen, AlertCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { BlogPost } from '../../data/blogPosts';
import { useAuth } from '../../hooks/useAuth';
import { fetchBlogPost, incrementBlogPostViews } from '../../services/blogService';
import { AppView, SectionType } from '../../types';
import { SkillSelector } from '../SkillSelector';

interface BlogPostViewProps {
    onNavigate: (view: AppView, params?: any) => void;
    onBack: () => void;
    onStartSkill?: (skillIdOrTopic: string | number, sectionVal?: SectionType) => void;
    postId?: string;
}

const bookmarkKey = (userId: string) => `blog_bookmarks_${userId}`;
const readKey = (userId: string) => `blog_read_${userId}`;

export const BlogPostView: React.FC<BlogPostViewProps> = ({ onNavigate, onBack, onStartSkill, postId }) => {
    const { user } = useAuth();
    const [post, setPost] = useState<BlogPost | null>(null);
    const [loadingPost, setLoadingPost] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [showSkillPicker, setShowSkillPicker] = useState(false);
    const progressStyle = { scaleX };
    const overlayHidden = { opacity: 0 };
    const overlayVisible = { opacity: 1 };
    const sheetHidden = { y: 80 };
    const sheetVisible = { y: 0 };

    const renderContent = (content: string) => content.split('\n').map((line, index) => {
        if (line.startsWith('# ')) return <h1 key={index} className="text-3xl font-black text-slate-900 mt-8 mb-4 leading-tight">{line.replace('# ', '')}</h1>;
        if (line.startsWith('## ')) return <h2 key={index} className="text-2xl font-bold text-slate-900 mt-8 mb-4">{line.replace('## ', '')}</h2>;
        if (line.startsWith('### ')) return <h3 key={index} className="text-xl font-bold text-slate-800 mt-6 mb-3">{line.replace('### ', '')}</h3>;
        if (line.startsWith('- ')) return <div key={index} className="flex gap-3 mb-2 ml-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2.5 shrink-0" /><p className="text-slate-600 leading-relaxed">{line.replace('- ', '')}</p></div>;
        if (line.trim() === '') return <div key={index} className="h-4" />;
        let formattedLine: React.ReactNode = line;
        if (line.includes('**')) {
            const parts = line.split('**');
            formattedLine = parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="text-slate-900 font-bold">{part}</strong> : part);
        }
        return <p key={index} className="text-slate-600 leading-relaxed mb-4 text-lg">{formattedLine}</p>;
    });

    useEffect(() => {
        let cancelled = false;
        setLoadingPost(true);
        setError(null);

        if (!postId) {
            setPost(null);
            setLoadingPost(false);
            return () => { cancelled = true; };
        }

        fetchBlogPost(postId)
            .then((data) => { if (!cancelled) setPost(data); })
            .catch(() => { if (!cancelled) setError('Unable to load this lesson.'); })
            .finally(() => { if (!cancelled) setLoadingPost(false); });
        incrementBlogPostViews(postId).catch(() => undefined);

        return () => { cancelled = true; };
    }, [postId]);

    useEffect(() => {
        window.scrollTo(0, 0);
        if (!postId || !user?.id) return;
        const bookmarks = JSON.parse(localStorage.getItem(bookmarkKey(user.id)) || '[]') as string[];
        setIsBookmarked(bookmarks.includes(postId));
    }, [postId, user?.id]);

    useEffect(() => {
        if (!post || !postId || !user?.id) return;
        const read = new Set<string>(JSON.parse(localStorage.getItem(readKey(user.id)) || '[]'));
        read.add(postId);
        localStorage.setItem(readKey(user.id), JSON.stringify([...read]));
    }, [post, postId, user?.id]);

    const toggleBookmark = () => {
        if (!postId || !user?.id) {
            setNotice('Sign in to save lessons.');
            return;
        }
        const bookmarks = new Set<string>(JSON.parse(localStorage.getItem(bookmarkKey(user.id)) || '[]'));
        if (bookmarks.has(postId)) bookmarks.delete(postId); else bookmarks.add(postId);
        localStorage.setItem(bookmarkKey(user.id), JSON.stringify([...bookmarks]));
        setIsBookmarked(bookmarks.has(postId));
        setNotice(bookmarks.has(postId) ? 'Lesson saved.' : 'Lesson removed from saved list.');
    };

    const handleShare = async () => {
        const text = post ? `${post.title} — TOEFL Quiz AI` : 'TOEFL Quiz AI lesson';
        const url = window.location.href;
        if (navigator.share) {
            await navigator.share({ title: text, url }).catch(() => undefined);
        } else {
            await navigator.clipboard?.writeText(url).catch(() => undefined);
            setNotice('Lesson link copied.');
        }
    };

    const handleSelectSkill = (skill: any) => {
        setShowSkillPicker(false);
        if (onStartSkill) onStartSkill(skill.id || skill.name, skill.section as SectionType);
    };

    if (loadingPost) {
        return (
            <div className="flex flex-col min-h-full bg-white items-center justify-center">
                <BookOpen className="w-8 h-8 text-blue-500 animate-pulse mb-3" />
                <p className="text-slate-500">Loading TOEFL lesson...</p>
            </div>
        );
    }

    if (!post || error) {
        return (
            <div className="flex flex-col min-h-full bg-white">
                <div className="px-4 py-4 border-b border-slate-100">
                    <button onClick={onBack} className="p-2 hover:bg-slate-50 rounded-xl"><ArrowLeft className="w-6 h-6 text-slate-600" /></button>
                </div>
                <div className="flex-1 flex items-center justify-center p-6 text-center">
                    <div className="max-w-sm">
                        <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-50 border border-amber-100 flex items-center justify-center mb-5"><AlertCircle className="w-10 h-10 text-amber-500" /></div>
                        <h2 className="text-2xl font-black text-slate-900 mb-2">Lesson not available yet</h2>
                        <p className="text-slate-500 mb-6">Choose another TOEFL lesson or practice the skill directly while this article is being prepared.</p>
                        <div className="grid gap-3">
                            <button onClick={() => onNavigate(AppView.BLOG)} className="w-full rounded-2xl bg-blue-600 px-5 py-3.5 text-white font-bold">Browse Blog</button>
                            <button onClick={() => onNavigate(AppView.BLOG_SKILL_PICKER, { selectedSkillCategory: 'STRUCTURE' })} className="w-full rounded-2xl border border-slate-200 px-5 py-3.5 text-slate-700 font-bold">Open Skill Library</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-full bg-white relative">
            <motion.div className="fixed top-0 left-0 right-0 h-1.5 bg-blue-600 origin-left z-50 rounded-r-full" style={progressStyle}  />
            <div className="px-4 py-4 flex items-center justify-between border-b border-slate-100 sticky top-0 bg-white/80 backdrop-blur-md z-40">
                <button onClick={onBack} className="p-2 hover:bg-slate-50 rounded-xl transition-colors"><ArrowLeft className="w-6 h-6 text-slate-600" /></button>
                <div className="flex gap-2">
                    <button onClick={toggleBookmark} className={`p-2 rounded-xl transition-all ${isBookmarked ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-50 text-slate-400'}`} aria-label="Save lesson"><Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} /></button>
                    <button onClick={handleShare} className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400" aria-label="Share lesson"><Share2 className="w-5 h-5" /></button>
                </div>
            </div>

            {notice && <div role="status" aria-live="polite" className="mx-5 mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{notice}</div>}

            <div className="w-full h-64 md:h-96 relative overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600">
                {post.thumbnail && !post.thumbnail.startsWith('bg-') && <img src={post.thumbnail} alt={post.title} className="w-full h-full object-cover" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                    <span className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg mb-3 inline-block">{post.category}</span>
                    <h1 className="text-2xl md:text-4xl font-black text-white leading-tight">{post.title}</h1>
                </div>
            </div>

            <div className="px-6 py-6 border-b border-slate-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200"><User className="w-5 h-5 text-slate-400" /></div>
                        <div><p className="text-sm font-bold text-slate-900">{post.author}</p><p className="text-xs text-slate-400 font-medium">{post.date} • {post.readTime} read</p></div>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-full text-xs font-bold ring-1 ring-orange-100"><Flame className="w-3.5 h-3.5 fill-current" /><span>TOEFL Skill</span></div>
                </div>
            </div>

            <article className="px-6 py-8 md:max-w-2xl md:mx-auto">{renderContent(post.content)}</article>

            <div className="px-6 py-12 bg-slate-50 mt-8 mb-24 border-t border-slate-100">
                <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-blue-900/5 border border-white">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-200"><Play className="w-8 h-8 text-white fill-current ml-1" /></div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2">Put it into practice!</h3>
                    <p className="text-slate-500 mb-8 leading-relaxed">The best way to master {post.category.toLowerCase()} is active repetition. Start a short TOEFL practice session now.</p>
                    <button onClick={() => setShowSkillPicker(true)} className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-slate-200 mb-3 cursor-pointer"><span>Start Practice Session</span><ChevronRight className="w-5 h-5" /></button>
                    <button onClick={() => onNavigate(AppView.BLOG_SKILL_PICKER, { selectedSkillCategory: post.category.toUpperCase() })} className="w-full py-3 border border-slate-200 text-slate-700 rounded-2xl font-bold">Choose another skill</button>
                </div>
            </div>

            <AnimatePresence>
                {showSkillPicker && (
                    <motion.div
                        initial={overlayHidden} 
                        animate={overlayVisible} 
                        exit={overlayHidden} 
                        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                        onClick={() => setShowSkillPicker(false)}
                    >
                        <motion.div
                            initial={sheetHidden} 
                            animate={sheetVisible} 
                            exit={sheetHidden} 
                            className="bg-white w-full max-w-2xl rounded-t-[32px] sm:rounded-[32px] max-h-[85vh] overflow-hidden flex flex-col shadow-2xl relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white z-10 sticky top-0">
                                <div><h3 className="text-xl font-bold text-slate-900">Choose a Skill</h3><p className="text-sm text-slate-500 mt-1">Select a specific skill to practice what you learned.</p></div>
                                <button onClick={() => setShowSkillPicker(false)} className="p-2 h-10 w-10 flex items-center justify-center text-slate-400 hover:bg-slate-100 rounded-full transition-colors shrink-0"><X className="w-6 h-6" /></button>
                            </div>
                            <div className="p-6 overflow-y-auto custom-scrollbar bg-slate-50 flex-1">
                                <SkillSelector onSelectSkill={handleSelectSkill} userId={user?.id} initialSection={post.category === 'Structure' || post.category === 'Written' ? 'STRUCTURE' : (post.category === 'Reading' ? 'READING' : 'LISTENING')} />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
