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

export async function fetchBlogPost(skillId: string): Promise<BlogPost | null> {
    const cat = skillId.startsWith('S') ? 'Structure' 
        : skillId.startsWith('L') ? 'Listening' 
        : skillId.startsWith('R') ? 'Reading' 
        : 'Written';
    return BLOG_POSTS.find(p => p.id === skillId || (p.category as string) === cat) || null;
}

export async function fetchBlogPostsBySection(
    section: 'structure' | 'written' | 'listening' | 'reading'
): Promise<BlogPost[]> {
    const cat = section === 'structure' ? 'Structure'
        : section === 'written' ? 'Written'
            : section === 'listening' ? 'Listening' : 'Reading';
    return BLOG_POSTS.filter(p => p.category === cat);
}

export async function fetchFeaturedPosts(): Promise<BlogPost[]> {
    return BLOG_POSTS.slice(0, 2);
}

export async function incrementBlogPostViews(skillId: string): Promise<void> {
    console.log('[BlogService] View increment skipped - using static data');
}

export async function adminFetchAllPosts(): Promise<BlogPostDB[]> {
    return [];
}

export async function adminUpsertBlogPost(post: BlogPostUpsert): Promise<BlogPostDB> {
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
}

export async function adminDeleteBlogPost(skillId: string): Promise<void> {
    console.log('[BlogService] Delete skipped - using static data');
}
