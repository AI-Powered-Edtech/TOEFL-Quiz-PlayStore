import React, { useCallback, useEffect, useState } from 'react';
import { adminService, type FeatureFlag } from '../../services/adminService';
import { showError, showSuccess } from '../../utils/toast';

export const FeatureFlagToggle: React.FC = () => {
    const [flags, setFlags] = useState<FeatureFlag[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [pendingId, setPendingId] = useState<string | null>(null);
    const [justUpdated, setJustUpdated] = useState<Record<string, number>>({});

    const fetchFlags = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await adminService.listFeatureFlags();
            setFlags(data);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load feature flags';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFlags();
    }, [fetchFlags]);

    const handleToggle = async (flag: FeatureFlag) => {
        const nextEnabled = !flag.enabled;
        setPendingId(flag.id);
        // optimistic update
        setFlags((prev) =>
            prev.map((f) =>
                f.id === flag.id ? { ...f, enabled: nextEnabled } : f,
            ),
        );
        try {
            await adminService.toggleFeatureFlag(flag.id, nextEnabled);
            setJustUpdated((prev) => ({ ...prev, [flag.id]: Date.now() }));
            showSuccess(
                `${flag.name} ${nextEnabled ? 'enabled' : 'disabled'}`,
            );
        } catch (err) {
            // rollback
            setFlags((prev) =>
                prev.map((f) =>
                    f.id === flag.id ? { ...f, enabled: flag.enabled } : f,
                ),
            );
            const message = err instanceof Error ? err.message : 'Failed to toggle flag';
            showError(message);
        } finally {
            setPendingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <p className="text-slate-500">Loading feature flags...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-4">
                <div className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 p-4 rounded-lg">
                    {error}
                </div>
                <button
                    onClick={fetchFlags}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (flags.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow p-12 text-center">
                <p className="text-slate-500 text-lg">No feature flags configured.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {flags.map((flag) => {
                const busy = pendingId === flag.id;
                const updatedStamp = justUpdated[flag.id];
                return (
                    <div
                        key={flag.id}
                        className="bg-white dark:bg-slate-900 rounded-xl shadow p-6 flex flex-col justify-between"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-lg truncate">{flag.name}</h3>
                                {flag.description && (
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                        {flag.description}
                                    </p>
                                )}
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={flag.enabled}
                                aria-label={`Toggle ${flag.name}`}
                                disabled={busy}
                                onClick={() => handleToggle(flag)}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                                    flag.enabled
                                        ? 'bg-indigo-600'
                                        : 'bg-slate-300 dark:bg-slate-700'
                                }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                        flag.enabled ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                />
                            </button>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                            <span>
                                Status:{' '}
                                <span
                                    className={
                                        flag.enabled
                                            ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                                            : 'text-slate-500 font-medium'
                                    }
                                >
                                    {flag.enabled ? 'On' : 'Off'}
                                </span>
                            </span>
                            {updatedStamp && (
                                <span className="text-indigo-600 dark:text-indigo-400">
                                    Updated just now
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default FeatureFlagToggle;
