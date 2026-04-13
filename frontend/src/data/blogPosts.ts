export interface BlogPost {
    id: string;
    title: string;
    excerpt: string;
    content: string;
    category: 'Structure' | 'Written' | 'Listening' | 'Reading';
    author: string;
    date: string;
    readTime: string;
    thumbnail: string;
    skillId?: number; // Related skill for CTA
}

export const BLOG_POSTS: BlogPost[] = [];
