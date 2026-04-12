/**
 * Accessibility Utilities and Hooks
 * Provides keyboard navigation, focus management, and ARIA helpers
 */

import React, { useEffect, useCallback, useRef, useState } from 'react';

// ==================== Keyboard Navigation Hook ====================

interface KeyboardNavigationOptions<T> {
    items: T[];
    onSelect: (item: T, index: number) => void;
    onEscape?: () => void;
    initialIndex?: number;
    loop?: boolean;
    orientation?: 'horizontal' | 'vertical' | 'grid';
    columns?: number; // For grid orientation
}

/**
 * Hook for keyboard navigation through a list of items
 */
export const useKeyboardNavigation = <T,>({
    items,
    onSelect,
    onEscape,
    initialIndex = 0,
    loop = true,
    orientation = 'vertical',
    columns = 1
}: KeyboardNavigationOptions<T>) => {
    const [focusedIndex, setFocusedIndex] = useState(initialIndex);
    const focusedRef = useRef<HTMLElement | null>(null);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        switch (e.key) {
            case 'ArrowUp':
                if (orientation === 'vertical' || orientation === 'grid') {
                    e.preventDefault();
                    setFocusedIndex(prev => {
                        const newIndex = prev - (orientation === 'grid' ? columns : 1);
                        if (newIndex < 0) {
                            return loop ? items.length - 1 : 0;
                        }
                        return newIndex;
                    });
                }
                break;

            case 'ArrowDown':
                if (orientation === 'vertical' || orientation === 'grid') {
                    e.preventDefault();
                    setFocusedIndex(prev => {
                        const newIndex = prev + (orientation === 'grid' ? columns : 1);
                        if (newIndex >= items.length) {
                            return loop ? 0 : items.length - 1;
                        }
                        return newIndex;
                    });
                }
                break;

            case 'ArrowLeft':
                if (orientation === 'horizontal' || orientation === 'grid') {
                    e.preventDefault();
                    setFocusedIndex(prev => {
                        const newIndex = prev - 1;
                        if (newIndex < 0) {
                            return loop ? items.length - 1 : 0;
                        }
                        return newIndex;
                    });
                }
                break;

            case 'ArrowRight':
                if (orientation === 'horizontal' || orientation === 'grid') {
                    e.preventDefault();
                    setFocusedIndex(prev => {
                        const newIndex = prev + 1;
                        if (newIndex >= items.length) {
                            return loop ? 0 : items.length - 1;
                        }
                        return newIndex;
                    });
                }
                break;

            case 'Home':
                e.preventDefault();
                setFocusedIndex(0);
                break;

            case 'End':
                e.preventDefault();
                setFocusedIndex(items.length - 1);
                break;

            case 'Enter':
            case ' ':
                e.preventDefault();
                if (items[focusedIndex]) {
                    onSelect(items[focusedIndex], focusedIndex);
                }
                break;

            case 'Escape':
                e.preventDefault();
                onEscape?.();
                break;
        }
    }, [items, focusedIndex, onSelect, onEscape, loop, orientation, columns]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // Focus the element when index changes
    useEffect(() => {
        if (focusedRef.current) {
            focusedRef.current.focus();
        }
    }, [focusedIndex]);

    const setFocusedRef = useCallback((el: HTMLElement | null) => {
        focusedRef.current = el;
    }, []);

    return {
        focusedIndex,
        setFocusedIndex,
        focusedRef: setFocusedRef,
        getAriaAttributes: (index: number) => ({
            role: 'option',
            'aria-selected': index === focusedIndex,
            tabIndex: index === focusedIndex ? 0 : -1
        })
    };
};

// ==================== Focus Trap Hook ====================

/**
 * Hook to trap focus within a container (for modals, dialogs)
 */
export const useFocusTrap = (isActive: boolean) => {
    const containerRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (!isActive || !containerRef.current) return;

        const container = containerRef.current;
        const focusableElements = container.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        // Focus first element when trap activates
        firstElement?.focus();

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;

            if (e.shiftKey) {
                // Shift + Tab
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement?.focus();
                }
            } else {
                // Tab
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement?.focus();
                }
            }
        };

        container.addEventListener('keydown', handleKeyDown);
        return () => container.removeEventListener('keydown', handleKeyDown);
    }, [isActive]);

    return containerRef;
};

// ==================== Focus Management Hook ====================

/**
 * Hook to manage focus and restore it when component unmounts
 */
export const useFocusManager = () => {
    const previousFocus = useRef<HTMLElement | null>(null);

    const saveFocus = useCallback(() => {
        previousFocus.current = document.activeElement as HTMLElement;
    }, []);

    const restoreFocus = useCallback(() => {
        if (previousFocus.current && typeof previousFocus.current.focus === 'function') {
            previousFocus.current.focus();
        }
    }, []);

    const setFocus = useCallback((element: HTMLElement | null) => {
        if (element && typeof element.focus === 'function') {
            element.focus();
        }
    }, []);

    return { saveFocus, restoreFocus, setFocus };
};

// ==================== Screen Reader Announcements Hook ====================

/**
 * Hook to announce messages to screen readers
 */
export const useScreenReader = () => {
    const announceRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        // Create announcement element if it doesn't exist
        let announcer = document.getElementById('sr-announcer') as HTMLDivElement;
        
        if (!announcer) {
            announcer = document.createElement('div');
            announcer.id = 'sr-announcer';
            announcer.setAttribute('aria-live', 'polite');
            announcer.setAttribute('aria-atomic', 'true');
            announcer.className = 'sr-only';
            announcer.style.cssText = `
                position: absolute;
                width: 1px;
                height: 1px;
                padding: 0;
                margin: -1px;
                overflow: hidden;
                clip: rect(0, 0, 0, 0);
                white-space: nowrap;
                border: 0;
            `;
            document.body.appendChild(announcer);
        }

        announceRef.current = announcer;

        return () => {
            // Don't remove the announcer on unmount, it's shared
        };
    }, []);

    const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
        if (!announceRef.current) return;

        announceRef.current.setAttribute('aria-live', priority);
        announceRef.current.textContent = '';
        
        // Use timeout to ensure screen readers pick up the change
        setTimeout(() => {
            if (announceRef.current) {
                announceRef.current.textContent = message;
            }
        }, 100);
    }, []);

    return { announce };
};

// ==================== Reduced Motion Hook ====================

/**
 * Hook to detect user's reduced motion preference
 */
export const useReducedMotion = () => {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReducedMotion(mediaQuery.matches);

        const handler = (e: MediaQueryListEvent) => {
            setPrefersReducedMotion(e.matches);
        };

        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    return prefersReducedMotion;
};

// ==================== Skip Link Component ====================

interface SkipLinkProps {
    targetId: string;
    label?: string;
}

/**
 * Skip link component for keyboard users
 */
export const SkipLink: React.FC<SkipLinkProps> = ({ 
    targetId, 
    label = 'Skip to main content' 
}) => {
    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        const target = document.getElementById(targetId);
        if (target) {
            target.tabIndex = -1;
            target.focus();
        }
    };

    return (
        <a
            href={`#${targetId}`}
            onClick={handleClick}
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-indigo-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg"
        >
            {label}
        </a>
    );
};

// ==================== Visually Hidden Component ====================

/**
 * Component that hides content visually but keeps it accessible
 */
export const VisuallyHidden: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <span className="sr-only">
            {children}
        </span>
    );
};

// ==================== ARIA Helpers ====================

/**
 * Generate ARIA attributes for common patterns
 */
export const ariaHelpers = {
    /**
     * ARIA attributes for a button that expands/collapses content
     */
    expandable: (isExpanded: boolean, controlsId: string) => ({
        'aria-expanded': isExpanded,
        'aria-controls': controlsId
    }),

    /**
     * ARIA attributes for a tab
     */
    tab: (isSelected: boolean, panelId: string) => ({
        role: 'tab',
        'aria-selected': isSelected,
        'aria-controls': panelId,
        tabIndex: isSelected ? 0 : -1
    }),

    /**
     * ARIA attributes for a tab panel
     */
    tabPanel: (id: string, labelledBy: string) => ({
        role: 'tabpanel',
        id,
        'aria-labelledby': labelledBy,
        tabIndex: 0
    }),

    /**
     * ARIA attributes for a menu item
     */
    menuItem: (isCurrent?: boolean) => ({
        role: 'menuitem',
        ...(isCurrent && { 'aria-current': 'page' as const })
    }),

    /**
     * ARIA attributes for a dialog/modal
     */
    dialog: (labelId: string, descriptionId?: string) => ({
        role: 'dialog',
        'aria-modal': true,
        'aria-labelledby': labelId,
        ...(descriptionId && { 'aria-describedby': descriptionId })
    }),

    /**
     * ARIA attributes for a progress bar
     */
    progress: (value: number, min: number, max: number) => ({
        role: 'progressbar',
        'aria-valuenow': value,
        'aria-valuemin': min,
        'aria-valuemax': max,
        'aria-valuetext': `${Math.round((value / max) * 100)}%`
    }),

    /**
     * ARIA attributes for a live region
     */
    liveRegion: (priority: 'polite' | 'assertive' = 'polite') => ({
        'aria-live': priority,
        'aria-atomic': true
    })
};

// ==================== Accessibility Check Utility ====================

/**
 * Check for common accessibility issues
 */
export const checkAccessibility = (container: HTMLElement): string[] => {
    const issues: string[] = [];

    // Check for images without alt text
    const imagesWithoutAlt = container.querySelectorAll('img:not([alt])');
    if (imagesWithoutAlt.length > 0) {
        issues.push(`${imagesWithoutAlt.length} images missing alt text`);
    }

    // Check for buttons without accessible names
    const buttonsWithoutName = container.querySelectorAll('button:not([aria-label]):not(:has(*))');
    if (buttonsWithoutName.length > 0) {
        issues.push(`${buttonsWithoutName.length} buttons without accessible names`);
    }

    // Check for links without accessible names
    const linksWithoutName = container.querySelectorAll('a:not([aria-label]):empty');
    if (linksWithoutName.length > 0) {
        issues.push(`${linksWithoutName.length} links without accessible names`);
    }

    // Check for form inputs without labels
    const inputsWithoutLabels = container.querySelectorAll('input:not([aria-label]):not([id])');
    if (inputsWithoutLabels.length > 0) {
        issues.push(`${inputsWithoutLabels.length} inputs without labels`);
    }

    // Check for insufficient color contrast (basic check)
    // This would require a more sophisticated algorithm for accurate results

    return issues;
};

export default {
    useKeyboardNavigation,
    useFocusTrap,
    useFocusManager,
    useScreenReader,
    useReducedMotion,
    SkipLink,
    VisuallyHidden,
    ariaHelpers,
    checkAccessibility
};
