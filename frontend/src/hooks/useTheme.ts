import { useState, useEffect } from 'react';

const getStoredTheme = (): 'dark' | 'light' | null => {
  try {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || saved === 'light' ? saved : null;
  } catch {
    return null;
  }
};

const getSystemPrefersDark = (): boolean => {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
};

export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    const saved = getStoredTheme();
    if (saved) return saved === 'dark';
    return getSystemPrefersDark();
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.toggle('dark', isDark);

    try {
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    } catch {
      // Storage can be unavailable in restricted WebViews; theme should not block rendering.
    }
  }, [isDark]);

  useEffect(() => {
    if (getStoredTheme()) return;

    let mediaQuery: MediaQueryList;
    try {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    } catch {
      return;
    }

    const handler = (event: MediaQueryListEvent) => setIsDark(event.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return { isDark, toggleDark: () => setIsDark((value) => !value) };
}
