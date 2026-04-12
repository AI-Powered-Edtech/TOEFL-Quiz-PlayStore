// Stub Supabase client - Supabase has been removed from this project
// All data operations now use VIL API and localStorage

export const uploadAvatar = async (
    _userId: string,
    _file: File
): Promise<{ url: string; error?: string } | null> => {
    console.log('[SupabaseStub] uploadAvatar called - storage not available');
    return { url: '', error: 'Storage not available' };
};

export const supabase = {
    auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        getUser: async () => ({ data: { user: null }, error: null }),
        signInWithPassword: async () => ({ data: { session: null, user: null }, error: { message: 'Supabase removed' } }),
        signUp: async () => ({ data: { session: null, user: null }, error: { message: 'Supabase removed' } }),
        signOut: async () => ({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: (_table?: string) => ({
        select: (_columns?: string) => ({ 
            data: [] as any[], 
            error: { message: 'Supabase removed', code: 'SUPABASE_REMOVED' }, 
            eq: (_column: string, _value: any) => ({ 
                data: null as any, 
                error: { message: 'Supabase removed', code: 'SUPABASE_REMOVED' },
                single: () => ({ data: null as any, error: { message: 'Supabase removed', code: 'SUPABASE_REMOVED' } }),
                order: (_column: string, _options?: { ascending: boolean }) => ({ 
                    data: null as any, 
                    error: { message: 'Supabase removed', code: 'SUPABASE_REMOVED' },
                    select: (_cols?: string) => ({ 
                        data: null as any, 
                        error: { message: 'Supabase removed', code: 'SUPABASE_REMOVED' },
                        single: () => ({ data: null as any, error: { message: 'Supabase removed', code: 'SUPABASE_REMOVED' } }),
                    }),
                    limit: (_count: number) => ({
                        data: null as any,
                        error: { message: 'Supabase removed', code: 'SUPABASE_REMOVED' },
                    }),
                }),
                limit: (_count: number) => ({
                    data: null as any,
                    error: { message: 'Supabase removed', code: 'SUPABASE_REMOVED' },
                }),
                eq: (_col: string, _val: any) => ({
                    data: null as any,
                    error: { message: 'Supabase removed', code: 'SUPABASE_REMOVED' },
                    single: () => ({ data: null as any, error: { message: 'Supabase removed', code: 'SUPABASE_REMOVED' } }),
                }),
            }),
            order: (_column: string, _options?: { ascending: boolean }) => ({ 
                data: [] as any[], 
                error: { message: 'Supabase removed', code: 'SUPABASE_REMOVED' },
                in: (_column: string, _values: any[]) => ({
                    data: null,
                    error: { message: 'Supabase removed', code: 'SUPABASE_REMOVED' },
                    select: () => ({
                        data: null,
                        error: { message: 'Supabase removed', code: 'SUPABASE_REMOVED' },
                    }),
                    eq: (_col: string, _val: any) => ({
                        data: null,
                        error: { message: 'Supabase removed', code: 'SUPABASE_REMOVED' },
                    }),
                }),
                limit: (_count: number) => ({
                    data: [] as any[],
                    error: { message: 'Supabase removed', code: 'SUPABASE_REMOVED' },
                    single: () => ({ data: null, error: { message: 'Supabase removed', code: 'SUPABASE_REMOVED' } }),
                }),
                eq: (_column: string, _value: any) => ({
                    data: null,
                    error: { message: 'Supabase removed', code: 'SUPABASE_REMOVED' },
                    select: () => ({
                        data: null,
                        error: { message: 'Supabase removed', code: 'SUPABASE_REMOVED' },
                        single: () => ({ data: null, error: { message: 'Supabase removed', code: 'SUPABASE_REMOVED' } }),
                    }),
                    update: (_data: any) => ({
                        data: null,
                        error: { message: 'Supabase removed', code: 'SUPABASE_REMOVED' },
                    }),
                }),
                select: () => ({
                    data: null,
                    error: { message: 'Supabase removed', code: 'SUPABASE_REMOVED' },
                    single: () => ({ data: null, error: { message: 'Supabase removed', code: 'SUPABASE_REMOVED' } }),
                    limit: (_count: number) => ({
                        data: null,
                        error: { message: 'Supabase removed', code: 'SUPABASE_REMOVED' },
                        single: () => ({ data: null, error: { message: 'Supabase removed', code: 'SUPABASE_REMOVED' } }),
                    }),
                    upsert: (_upsertData?: any) => ({ data: null, error: { message: 'Supabase removed', code: 'SUPABASE_REMOVED' } }),
                }),
                upsert: (_upsertData?: any, _options?: any) => ({ data: null, error: { message: 'Supabase removed', code: 'SUPABASE_REMOVED' } }),
            }),
            limit: (_count: number) => ({
                data: [] as any[],
                error: { message: 'Supabase removed', code: 'SUPABASE_REMOVED' },
            }),
        }),
        insert: (_data?: any) => ({ 
            data: null as any, 
            error: { message: 'Supabase removed', code: 'SUPABASE_REMOVED' },
            select: (_cols?: string) => ({ 
                data: null as any, 
                error: { message: 'Supabase removed', code: 'SUPABASE_REMOVED' },
                single: () => ({ data: null as any, error: { message: 'Supabase removed', code: 'SUPABASE_REMOVED' } }),
            }),
            upsert: (_upsertData?: any, _options?: any) => ({ data: null as any, error: { message: 'Supabase removed', code: 'SUPABASE_REMOVED' } }),
        }),
        update: (_data?: any) => ({ 
            data: null, 
            error: { message: 'Supabase removed', code: 'SUPABASE_REMOVED' }, 
            eq: (_column: string, _value: any) => ({ 
                data: null, 
                error: { message: 'Supabase removed', code: 'SUPABASE_REMOVED' },
                order: (_col: string, _opts?: { ascending: boolean }) => ({
                    data: null,
                    error: { message: 'Supabase removed', code: 'SUPABASE_REMOVED' },
                }),
                upsert: (_upsertData?: any) => ({ data: null, error: { message: 'Supabase removed', code: 'SUPABASE_REMOVED' } }),
            }),
            upsert: (_upsertData?: any) => ({ data: null, error: { message: 'Supabase removed', code: 'SUPABASE_REMOVED' } }),
        }),
        upsert: (_data?: any, _options?: any) => ({ data: null, error: { message: 'Supabase removed', code: 'SUPABASE_REMOVED' } }),
        delete: () => ({ 
            data: null, 
            error: { message: 'Supabase removed', code: 'SUPABASE_REMOVED' }, 
            eq: (_column: string, _value: any) => ({ 
                data: null, 
                error: { message: 'Supabase removed', code: 'SUPABASE_REMOVED' },
            }),
        }),
    }),
    storage: {
        from: () => ({
            upload: async (_path: string, _file: any) => ({ data: null, error: { message: 'Supabase storage removed', code: 'SUPABASE_REMOVED' } }),
            download: async (_path: string) => ({ data: null, error: { message: 'Supabase storage removed', code: 'SUPABASE_REMOVED' } }),
            remove: async (_paths: string[]) => ({ data: null, error: { message: 'Supabase storage removed', code: 'SUPABASE_REMOVED' } }),
            getPublicUrl: (_path: string) => ({ data: { publicUrl: '' } }),
        }),
    },
    channel: (_name: string) => ({
        on: (_event: string, _config: any, _callback?: any) => ({
            subscribe: (_callback?: (status: string) => void) => ({ 
                status: 'ok',
                unsubscribe: () => {} 
            }), 
        }),
        subscribe: (_callback?: (status: string) => void) => ({ 
            status: 'ok',
            unsubscribe: () => {} 
        }), 
        unsubscribe: () => {},
    }),
    removeChannel: (_channel: any) => {},
};

export default supabase;
