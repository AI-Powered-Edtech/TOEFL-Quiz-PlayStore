import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode || 'test', process.cwd(), 'VITE_');

    return {
        plugins: [react()],
        define: {
            'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
            'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
        },
        test: {
            globals: true,
            environment: 'node',
            include: [
                'tests/**/*.test.ts',
                'tests/**/*.test.tsx',
            ],
            testTimeout: 15000,
            isolate: true,
            coverage: {
                provider: 'v8',
                include: ['src/services/**', 'src/utils/**', 'src/data/**'],
                reporter: ['text', 'text-summary', 'html'],
            },
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },
    };
});
