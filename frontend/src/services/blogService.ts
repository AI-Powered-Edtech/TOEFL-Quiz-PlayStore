import api from './apiClient';
import { apiV2 } from './apiV2';
import { BlogPost, BLOG_POSTS } from '../data/blogPosts';


// Try the new declarative VWFD endpoint first; fall back to the imperative
// Rust handler if VWFD is unreachable or returns an error.
// UX impact: when VWFD is healthy, public blog list is served by the
// declarative runtime (cacheable, no JWT). When it is down, users still get
// the same data from the original /api/blog/posts handler — zero regression.
async function fetchBlogPostsList<T>(): Promise<T> {
    try {
        return await apiV2.get<T>('/api/v2/blog/posts');
    } catch (e) {
        // Falling back silently — surface the original error if fallback also fails.
        const r = await api.get<T>('/api/blog/posts');
        if (r.error) throw new Error(r.error.error || 'Failed to fetch blog posts');
        return (r.data as T);
    }
}

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

// Interfaces to match backend responses
export interface PostListRow {
    id: string;
    skill_id: string | null;
    section: string | null;
    title: string;
    is_featured: number;
    views_count: number;
}

export interface PostDetailRow {
    id: string;
    section: string | null;
    title: string;
    content: string;
    status: string;
    views_count: number;
}

// Helper to convert partial backend list row to Legacy BlogPost
function listRowToLegacy(row: PostListRow): BlogPost {
    const category = row.section === 'structure' ? 'Structure'
        : row.section === 'written' ? 'Written'
        : row.section === 'listening' ? 'Listening' : 'Reading';

    return {
        id: row.skill_id || row.id,
        title: row.title,
        excerpt: '', 
        content: '', 
        category: category as any,
        author: 'TOEFL Expert',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        readTime: '5 min',
        thumbnail: '',
        skillId: row.skill_id ? parseInt(row.skill_id.replace(/\\D/g, '')) || undefined : undefined
    };
}

// Helper to convert detailed backend row to Legacy BlogPost
function detailRowToLegacy(row: PostDetailRow, skillId?: string): BlogPost {
    const category = row.section === 'structure' ? 'Structure'
        : row.section === 'written' ? 'Written'
        : row.section === 'listening' ? 'Listening' : 'Reading';

    return {
        id: skillId || row.id,
        title: row.title,
        excerpt: row.content.substring(0, 100) + '...',
        content: row.content,
        category: category as any,
        author: 'TOEFL Expert',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        readTime: '5 min',
        thumbnail: '',
        skillId: skillId ? parseInt(skillId.replace(/\\D/g, '')) || undefined : undefined
    };
}

export async function fetchBlogPost(skillId: string): Promise<BlogPost | null> {
    try {
        const response = await api.get<PostDetailRow>(`/api/blog/posts/${skillId}`);
        if (response.data) {
            return detailRowToLegacy(response.data, skillId);
        }
        const localPost = BLOG_POSTS.find(p => p.id === skillId || p.skillId?.toString() === skillId);
        if (localPost) return localPost;
        return null;
    } catch (e) {
        console.error('[BlogService] Error fetching post', e);
        const localPost = BLOG_POSTS.find(p => p.id === skillId || p.skillId?.toString() === skillId);
        if (localPost) return localPost;
        return null;
    }
}

export async function fetchBlogPostsBySection(
    section: 'structure' | 'written' | 'listening' | 'reading'
): Promise<BlogPost[]> {
    try {
        const data = await fetchBlogPostsList<PostListRow[]>();
        const response = { data, error: null as any };
        if (response.data && response.data.length > 0) {
            return response.data
                .filter(p => p.section === section)
                .map(listRowToLegacy);
        }
        return BLOG_POSTS.filter(p => p.category.toLowerCase() === section.toLowerCase());
    } catch (e) {
        console.error('[BlogService] Error fetching posts by section', e);
        return BLOG_POSTS.filter(p => p.category.toLowerCase() === section.toLowerCase());
    }
}

export async function fetchFeaturedPosts(): Promise<BlogPost[]> {
    try {
        const data = await fetchBlogPostsList<PostListRow[]>();
        const response = { data, error: null as any };
        if (response.data && response.data.length > 0) {
            return response.data
                .filter(p => p.is_featured === 1)
                .map(listRowToLegacy);
        }
        return BLOG_POSTS;
    } catch (e) {
        console.error('[BlogService] Error fetching featured posts', e);
        return BLOG_POSTS;
    }
}

export async function incrementBlogPostViews(skillId: string): Promise<void> {
    console.log('[BlogService] View increment handled by backend on fetch');
}

export async function adminFetchAllPosts(): Promise<BlogPostDB[]> {
    try {
        const data = await fetchBlogPostsList<PostListRow[]>();
        const response = { data, error: null as any };
        if (response.data) {
            return response.data.map(p => ({
                id: p.id,
                skill_id: p.skill_id || '',
                section: (p.section as any) || 'structure',
                title: p.title,
                excerpt: null,
                content: '',
                author: 'Admin',
                thumbnail_url: null,
                read_time: '5 min',
                status: 'published',
                is_featured: p.is_featured === 1,
                sort_order: 0,
                views_count: p.views_count,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                published_at: new Date().toISOString()
            }));
        }
        return [];
    } catch (e) {
        console.error('[BlogService] Error fetching all posts', e);
        return [];
    }
}

export async function adminUpsertBlogPost(post: BlogPostUpsert): Promise<BlogPostDB> {
    try {
        await api.post('/api/blog/admin/posts', post);
        
        return {
            id: post.skill_id,
            skill_id: post.skill_id,
            section: post.section,
            title: post.title,
            excerpt: post.excerpt || null,
            content: post.content,
            author: post.author || 'Admin',
            thumbnail_url: post.thumbnail_url || null,
            read_time: post.read_time || '5 min',
            status: post.status || 'published',
            is_featured: post.is_featured || false,
            sort_order: post.sort_order || 0,
            views_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            published_at: new Date().toISOString(),
            quiz_data: post.quiz_data,
            highlight_phrase: post.highlight_phrase || null
        };
    } catch (e) {
        console.error('[BlogService] Error upserting post', e);
        throw e;
    }
}

export async function adminDeleteBlogPost(skillId: string): Promise<void> {
    try {
        await api.delete(`/api/blog/admin/posts/${skillId}`);
    } catch (e) {
        console.error('[BlogService] Error deleting post', e);
        throw e;
    }
}
