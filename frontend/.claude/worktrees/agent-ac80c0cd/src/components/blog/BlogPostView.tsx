import React, { useEffect, useState } from 'react';
import { motion, useScroll, useSpring, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock, User, Share2, Bookmark, Flame, ChevronRight, Play, X } from 'lucide-react';
import { AppView, SectionType } from '../../types';
import { BLOG_POSTS, BlogPost } from '../../data/blogPosts';
import { fetchBlogPost, incrementBlogPostViews } from '../../services/blogService';
import { SkillSelector } from '../SkillSelector';
import { useAuth } from '../../hooks/useAuth';

interface BlogPostViewProps {
    onNavigate: (view: AppView, params?: any) => void;
    onBack: () => void;
    onStartSkill?: (skillIdOrTopic: string | number, sectionVal?: SectionType) => void;
    postId?: string;
}

export const BlogPostView: React.FC<BlogPostViewProps> = ({ onNavigate, onBack, onStartSkill, postId }) => {
    const staticPost = BLOG_POSTS.find(p => p.id === postId) || BLOG_POSTS[0];
    const { user } = useAuth();
    const [post, setPost] = useState(staticPost);
    const [loadingPost, setLoadingPost] = useState(true);
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    const [isBookmarked, setIsBookmarked] = useState(false);
    const [showSkillPicker, setShowSkillPicker] = useState(false);

    // Simple Markdown-to-JSX Parser
    const renderContent = (content: string) => {
        return content.split('\n').map((line, index) => {
            if (line.startsWith('# ')) {
                return <h1 key={index} className="text-3xl font-black text-slate-900 mt-8 mb-4 leading-tight">{line.replace('# ', '')}</h1>;
            }
            if (line.startsWith('## ')) {
                return <h2 key={index} className="text-2xl font-bold text-slate-900 mt-8 mb-4">{line.replace('## ', '')}</h2>;
            }
            if (line.startsWith('### ')) {
                return <h3 key={index} className="text-xl font-bold text-slate-800 mt-6 mb-3">{line.replace('### ', '')}</h3>;
            }
            if (line.startsWith('- ')) {
                return (
                    <div key={index} className="flex gap-3 mb-2 ml-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2.5 shrink-0" />
                        <p className="text-slate-600 leading-relaxed">{line.replace('- ', '')}</p>
                    </div>
                );
            }
            if (line.trim() === '') return <div key={index} className="h-4" />;

            // Handle bold and italics simply
            let formattedLine: React.ReactNode = line;
            if (line.includes('**')) {
                const parts = line.split('**');
                formattedLine = parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="text-slate-900 font-bold">{part}</strong> : part);
            }

            return <p key={index} className="text-slate-600 leading-relaxed mb-4 text-lg">{formattedLine}</p>;
        });
    };

    useEffect(() => {
        let cancelled = false;
        setLoadingPost(true);
        fetchBlogPost(postId || '')
            .then(data => { if (!cancelled && data) setPost(data); })
            .catch(() => { })
            .finally(() => { if (!cancelled) setLoadingPost(false); });
        // Track views (non-critical)
        if (postId) incrementBlogPostViews(postId).catch(() => { });
        return () => { cancelled = true; };
    }, [postId]);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [postId]);

    const handleSelectSkill = (skill: any) => {
        if (onStartSkill) {
            onStartSkill(skill.name, skill.section as SectionType);
        }
    };

    return (
        <div className="flex flex-col min-h-full bg-white relative">
            {/* Reading Progress Bar */}
            <motion.div
                className="fixed top-0 left-0 right-0 h-1.5 bg-blue-600 origin-left z-50 rounded-r-full"
                style={{ scaleX }}
            />

            {/* Header / Nav */}
            <div className="px-4 py-4 flex items-center justify-between border-b border-slate-100 sticky top-0 bg-white/80 backdrop-blur-md z-40">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-slate-50 rounded-xl transition-colors"
                >
                    <ArrowLeft className="w-6 h-6 text-slate-600" />
                </button>

                <div className="flex gap-2">
                    <button
                        onClick={() => setIsBookmarked(!isBookmarked)}
                        className={`p-2 rounded-xl transition-all ${isBookmarked ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-50 text-slate-400'}`}
                    >
                        <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} />
                    </button>
                    <button className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400">
                        <Share2 className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Hero Image */}
            <div className="w-full h-64 md:h-96 relative overflow-hidden">
                <img
                    src={post.thumbnail}
                    alt={post.title}
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                    <span className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg mb-3 inline-block">
                        {post.category}
                    </span>
                    <h1 className="text-2xl md:text-4xl font-black text-white leading-tight">
                        {post.title}
                    </h1>
                </div>
            </div>

            {/* Post Meta */}
            <div className="px-6 py-6 border-b border-slate-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200">
                            <User className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-900">{post.author}</p>
                            <p className="text-xs text-slate-400 font-medium">{post.date} • {post.readTime} read</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-full text-xs font-bold ring-1 ring-orange-100">
                        <Flame className="w-3.5 h-3.5 fill-current" />
                        <span>Trending</span>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <article className="px-6 py-8 md:max-w-2xl md:mx-auto">
                {renderContent(post.content)}
            </article>

            {/* CTA Section */}
            <div className="px-6 py-12 bg-slate-50 mt-8 mb-24 border-t border-slate-100">
                <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-blue-900/5 border border-white">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-200">
                        <Play className="w-8 h-8 text-white fill-current ml-1" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2">Put it into practice!</h3>
                    <p className="text-slate-500 mb-8 leading-relaxed">
                        The best way to master {post.category.toLowerCase()} is through active repetition. Try a quick quiz now!
                    </p>
                    <button
                        onClick={() => setShowSkillPicker(true)}
                        className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-slate-200 mb-3 cursor-pointer"
                    >
                        <span>Start Practice Session</span>
                        <ChevronRight className="w-5 h-5" />
                    </button>
                    <p className="text-center text-xs text-slate-400 font-bold uppercase tracking-widest">
                        +50 XP for Completion
                    </p>
                </div>
            </div>

            {/* Skill Picker Modal Overlay */}
            <AnimatePresence>
                {showSkillPicker && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                        onClick={() => setShowSkillPicker(false)}
                    >
                        <motion.div
                            initial={{ y: "100%", opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: "100%", opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="bg-white w-full max-w-2xl rounded-t-[32px] sm:rounded-[32px] max-h-[85vh] overflow-hidden flex flex-col shadow-2xl relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white z-10 sticky top-0">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900">Choose a Skill</h3>
                                    <p className="text-sm text-slate-500 mt-1">Select a specific skill to practice what you learned.</p>
                                </div>
                                <button
                                    onClick={() => setShowSkillPicker(false)}
                                    className="p-2 h-10 w-10 flex items-center justify-center text-slate-400 hover:bg-slate-100 rounded-full transition-colors shrink-0"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Skill Selector Body */}
                            <div className="p-6 overflow-y-auto custom-scrollbar bg-slate-50 flex-1">
                                <SkillSelector
                                    onSelectSkill={handleSelectSkill}
                                    userId={user?.id}
                                    initialSection={post.category === 'Structure' || post.category === 'Written' ? 'STRUCTURE' : (post.category === 'Reading' ? 'READING' : 'LISTENING')}
                                />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
