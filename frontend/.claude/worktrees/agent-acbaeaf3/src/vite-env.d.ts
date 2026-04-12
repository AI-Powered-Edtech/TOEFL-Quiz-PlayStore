/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL?: string;
    readonly VITE_SUPABASE_ANON_KEY?: string;
    readonly VITE_YOUTUBE_API_KEY?: string;
    // GROQ_API_KEY is no longer exposed to frontend (secured in Edge Function)
    // add more env variables as needed
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
