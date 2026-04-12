import { useCallback } from 'react';

import { useNavigationStore } from '../stores/useNavigationStore';
import { AppView } from '../types';

/**
 * Returns a consistent back navigation function.
 * Navigates to the provided `defaultTarget`, or falls back to `gymBackTarget`
 * for Writing Gym screens, or to `AppView.DASHBOARD` as the final fallback.
 *
 * Usage:
 *   const goBack = useBackNavigation(AppView.WRITING_GYM_HUB);
 *   <button onClick={goBack}>Back</button>
 */
export const useBackNavigation = (defaultTarget?: AppView) => {
    const { setCurrentView, gymBackTarget } = useNavigationStore();

    return useCallback(() => {
        if (defaultTarget) {
            setCurrentView(defaultTarget);
        } else {
            // Gym-aware fallback
            setCurrentView(gymBackTarget ?? AppView.DASHBOARD);
        }
    }, [defaultTarget, gymBackTarget, setCurrentView]);
};
