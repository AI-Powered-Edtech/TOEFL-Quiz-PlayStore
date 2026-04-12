import { supabase } from './supabase';
import { BLOG_POSTS, BlogPost } from '../data/blogPosts';

export interface InteractiveExample {
    question: string;
    options: { id: string; text: string; isCorrect: boolean }[];
    explanation: string;
}

export interface BlogPostDB {
    id: string;
    skill_id: string;
    section: 'structure' | 'written' | 'listening' | 'reading';
    title: string;
    excerpt: string | null;
    content: string;
    author: string;
    thumbnail_url: string | null;
    read_time: string;
    status: 'draft' | 'published' | 'archived';
    is_featured: boolean;
    sort_order: number;
    views_count: number;
    created_at: string;
    updated_at: string;
    published_at: string | null;
    quiz_data?: InteractiveExample;
    highlight_phrase?: string | null;
}

export interface BlogPostUpsert {
    skill_id: string;
    section: 'structure' | 'written' | 'listening' | 'reading';
    title: string;
    excerpt?: string;
    content: string;
    author?: string;
    thumbnail_url?: string;
    read_time?: string;
    status?: 'draft' | 'published' | 'archived';
    is_featured?: boolean;
    sort_order?: number;
    quiz_data?: InteractiveExample;
    highlight_phrase?: string | null;
}

// Convert DB row to frontend BlogPost format
function dbToLegacy(db: BlogPostDB): BlogPost & { quizData?: InteractiveExample, highlightPhrase?: string } {
    return {
        id: db.skill_id,
        title: db.title,
        excerpt: db.excerpt || '',
        content: db.content,
        category: (db.section === 'structure' ? 'Structure'
            : db.section === 'written' ? 'Written'
                : db.section === 'listening' ? 'Listening' : 'Reading') as any,
        author: db.author,
        date: db.published_at
            ? new Date(db.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : '',
        readTime: db.read_time,
        thumbnail: db.thumbnail_url || '',
        quizData: db.quiz_data,
        highlightPhrase: db.highlight_phrase || undefined
    };
}

/**
 * Fetch a single blog post by its skill_id.
 */
export async function fetchBlogPost(skillId: string): Promise<BlogPost | null> {
    try {
        const { data, error } = await supabase
            .from('blog_posts')
            .select('*')
            .eq('skill_id', skillId)
            .eq('status', 'published')
            .single(); // Expecting a single result

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "No rows found"
        if (data) return dbToLegacy(data as BlogPostDB);
    } catch (err) {
        console.error(`[blogService] Failed to fetch blog post with skillId ${skillId}:`, err);
    }
    return null;
}

/**
 * Fetch all published posts for a given section.
 */
export async function fetchBlogPostsBySection(
    section: 'structure' | 'written' | 'listening' | 'reading'
): Promise<BlogPost[]> {
    try {
        const { data, error } = await supabase
            .from('blog_posts')
            .select('*')
            .eq('section', section)
            .eq('status', 'published')
            .order('sort_order', { ascending: true });

        if (error) throw error;
        if (data && data.length > 0) return (data as BlogPostDB[]).map(dbToLegacy);
    } catch (err) {
        console.warn('[blogService] DB fetch failed, using fallback:', err);
    }
    // Fallback
    const cat = section === 'structure' ? 'Structure'
        : section === 'written' ? 'Written'
            : section === 'listening' ? 'Listening' : 'Reading';
    return BLOG_POSTS.filter(p => p.category === cat);
}

/**
 * Fetch featured posts.
 */
export async function fetchFeaturedPosts(): Promise<BlogPost[]> {
    try {
        const { data, error } = await supabase
            .from('blog_posts')
            .select('*')
            .eq('status', 'published')
            .eq('is_featured', true)
            .order('sort_order', { ascending: true })
            .limit(5);

        if (error) throw error;
        if (data && data.length > 0) return (data as BlogPostDB[]).map(dbToLegacy);
    } catch (err) {
        console.warn('[blogService] DB fetch failed, using fallback:', err);
    }
    return BLOG_POSTS.slice(0, 2);
}

/**
 * Increment view counter for a post.
 */
export async function incrementBlogPostViews(skillId: string): Promise<void> {
    try {
        await supabase.rpc('increment_blog_post_views', { p_skill_id: skillId });
    } catch (_) {
        // non-critical
    }
}

// ─── Admin Functions ──────────────────────────────────────────────

/**
 * Fetch ALL posts (including drafts) for admin use.
 */
export async function adminFetchAllPosts(): Promise<BlogPostDB[]> {
    const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('section', { ascending: true })
        .order('sort_order', { ascending: true });

    if (error) throw error;
    return (data || []) as BlogPostDB[];
}

/**
 * Upsert a blog post (admin).
 */
export async function adminUpsertBlogPost(post: BlogPostUpsert): Promise<BlogPostDB> {
    const payload = {
        ...post,
        published_at: post.status === 'published' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
        .from('blog_posts')
        .upsert(payload, { onConflict: 'skill_id' })
        .select()
        .single();

    if (error) throw error;
    return data as BlogPostDB;
}

/**
 * Delete a blog post (admin).
 */
export async function adminDeleteBlogPost(skillId: string): Promise<void> {
    const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('skill_id', skillId);

    if (error) throw error;
}
