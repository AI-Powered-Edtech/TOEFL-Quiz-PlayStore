// Feature Flag Guard Component
// Wraps features behind feature flags with loading and fallback states

import React, { useEffect, useState } from 'react';

import { useAuth } from '../hooks/useAuth';
import { featureFlagService } from '../services/featureFlagService';

interface FeatureFlagGuardProps {
    flagName: string;
    children: React.ReactNode;
    fallback?: React.ReactNode;
    loadingFallback?: React.ReactNode;
}

export function FeatureFlagGuard({
    flagName,
    children,
    fallback,
    loadingFallback
}: FeatureFlagGuardProps) {
    const { user } = useAuth();
    const [isEnabled, setIsEnabled] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        async function checkFlag() {
            try {
                const enabled = await featureFlagService.isEnabled(flagName, user?.id);
                if (mounted) {
                    setIsEnabled(enabled);
                    setIsLoading(false);
                }
            } catch (error) {
                console.error('[FeatureFlagGuard] Error checking flag:', error);
                if (mounted) {
                    setIsEnabled(false);
                    setIsLoading(false);
                }
            }
        }

        checkFlag();

        return () => {
            mounted = false;
        };
    }, [flagName, user?.id]);

    if (isLoading) {
        return loadingFallback || (
            <div className="flex items-center justify-center min-h-[200px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!isEnabled) {
        return fallback || (
            <div className="flex flex-col items-center justify-center min-h-[400px] p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
                <div className="text-6xl mb-4">🚧</div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Coming Soon!</h2>
                <p className="text-slate-600 text-center max-w-md">
                    This feature is currently being rolled out to users.
                    Check back soon to try it out!
                </p>
            </div>
        );
    }

    return <>{children}</>;
}
