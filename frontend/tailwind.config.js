/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./App.tsx",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
                serif: ['Merriweather', 'serif'],
                display: ['Lexend', 'sans-serif'],
            },
            colors: {
                primary: "#135bec",
                "primary-dark": "#0e45b5",
                "background-light": "#f8f9fa",
                "background-dark": "#101622",
                "surface-white": "#ffffff",
                surface: {
                    app: "var(--color-surface-app)",
                    card: "var(--color-surface-card)",
                    muted: "var(--color-surface-muted)",
                },
                content: {
                    primary: "var(--color-content-primary)",
                    secondary: "var(--color-content-secondary)",
                },
                semantic: {
                    brand: "var(--color-brand-primary)",
                    danger: "var(--color-danger)",
                    success: "var(--color-success)",
                    warning: "var(--color-warning)",
                },
                blue: {
                    soft: '#eff6ff',
                    primary: '#2563eb',
                    dark: '#1e40af',
                },
                orange: {
                    soft: '#fff7ed',
                    main: '#f97316',
                },
                bg: {
                    card: '#f8fafc',
                    main: '#ffffff',
                },
                border: {
                    light: '#e2e8f0',
                },
                text: {
                    primary: '#334155',
                    secondary: '#64748b',
                }
            },
            animation: {
                'blink': 'blink 1s step-end infinite',
                'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
            keyframes: {
                blink: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0' },
                },
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                }
            }
        },
    },
    plugins: [],
}
