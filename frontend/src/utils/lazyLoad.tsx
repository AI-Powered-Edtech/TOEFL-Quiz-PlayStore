// Lazy Load Utility
// Wraps React.lazy with Suspense for consistent loading states

import React, { lazy, Suspense, ComponentType } from 'react';

interface LazyLoadOptions {
    fallback?: React.ReactNode;
    delay?: number; // Minimum loading time (prevents flash)
}

/**
 * Lazy load a component with automatic Suspense wrapper
 * 
 * @example
 * const MasonLevel = lazyLoad(() => import('./MasonLevel'));
 */
export function lazyLoad<T extends ComponentType<any>>(
    factory: () => Promise<{ default: T }>,
    options: LazyLoadOptions = {}
): T {
    const {
        fallback = <LoadingFallback />,
        delay = 200 // 200ms min loading to prevent flash
    } = options;

    // Add minimum delay to prevent loading flash
    const delayedFactory = async (): Promise<{ default: React.ComponentType<unknown> }> => {
        const start = Date.now();
        const module = await factory();
        const elapsed = Date.now() - start;
        if (elapsed < delay) {
            await new Promise((resolve) => setTimeout(resolve, delay - elapsed));
        }
        return module as { default: React.ComponentType<unknown> };
    };

    const LazyComponent = lazy(delayedFactory);

    return ((props: React.ComponentProps<T>) => (
        <Suspense fallback={fallback}>
            <LazyComponent {...props} />
        </Suspense>
    )) as T;
}

/**
 * Default loading fallback component
 */
function LoadingFallback() {
    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
                <p className="text-sm text-slate-500">Loading...</p>
            </div>
        </div>
    );
}

/**
 * Preload a lazy component (useful for prefetching)
 * 
 * @example
 * const MasonLevel = lazyLoad(() => import('./MasonLevel'));
 * preloadComponent(() => import('./MasonLevel')); // Prefetch on hover
 */
export function loadComponent(
    importFn: () => Promise<{ default: React.ComponentType<Record<string, unknown>> }>
) {
    return importFn();
}
