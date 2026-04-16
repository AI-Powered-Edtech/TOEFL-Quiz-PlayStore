import React, { useCallback, useEffect, useState } from 'react';
import {
    adminService,
    type ContentReport,
    type ModerationAction,
} from '../../services/adminService';
import { showError, showSuccess } from '../../utils/toast';

const contentTypeBadgeClasses: Record<string, string> = {
    user: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    essay: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    bio: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    message: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const defaultBadge =
    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';

const formatDate = (value: string): string => {
    try {
        return new Date(value).toLocaleString();
    } catch {
        return value;
    }
};

export const ModerationQueue: React.FC = () => {
    const [reports, setReports] = useState<ContentReport[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [pendingId, setPendingId] = useState<string | null>(null);

    const fetchReports = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await adminService.listReports();
            setReports(data);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load reports';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    const handleAction = async (id: string, action: ModerationAction) => {
        setPendingId(id);
        // optimistic: remove from list
        const previous = reports;
        setReports((prev) => prev.filter((r) => r.id !== id));
        try {
            await adminService.resolveReport(id, action);
            showSuccess(
                action === 'approve'
                    ? 'Report resolved — content kept'
                    : 'Report resolved — content flagged for removal',
            );
        } catch (err) {
            // rollback
            setReports(previous);
            const message = err instanceof Error ? err.message : 'Failed to resolve report';
            showError(message);
        } finally {
            setPendingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <p className="text-slate-500">Loading moderation queue...</p>
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
                    onClick={fetchReports}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (reports.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow p-12 text-center">
                <p className="text-slate-500 text-lg">No reports pending review.</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800 border-b dark:border-slate-700">
                            <th className="p-4 font-semibold text-sm">Report ID</th>
                            <th className="p-4 font-semibold text-sm">Type</th>
                            <th className="p-4 font-semibold text-sm">Reporter</th>
                            <th className="p-4 font-semibold text-sm">Reason</th>
                            <th className="p-4 font-semibold text-sm">Created</th>
                            <th className="p-4 font-semibold text-sm text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reports.map((report) => {
                            const busy = pendingId === report.id;
                            const badgeClass =
                                contentTypeBadgeClasses[report.content_type] || defaultBadge;
                            return (
                                <tr
                                    key={report.id}
                                    className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                >
                                    <td className="p-4 text-sm font-mono text-slate-500">
                                        {report.id.substring(0, 8)}...
                                    </td>
                                    <td className="p-4">
                                        <span
                                            className={`px-2 py-1 rounded-full text-xs font-medium ${badgeClass}`}
                                        >
                                            {report.content_type}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm font-mono text-slate-500">
                                        {report.reporter_id
                                            ? report.reporter_id.substring(0, 8) + '...'
                                            : '-'}
                                    </td>
                                    <td className="p-4 text-sm">
                                        <div className="font-medium">{report.reason}</div>
                                        {report.details && (
                                            <div className="text-xs text-slate-500 mt-1 line-clamp-2">
                                                {report.details}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4 text-sm text-slate-500 whitespace-nowrap">
                                        {formatDate(report.created_at)}
                                    </td>
                                    <td className="p-4 text-right space-x-2 whitespace-nowrap">
                                        <button
                                            onClick={() => handleAction(report.id, 'approve')}
                                            disabled={busy}
                                            className="px-3 py-1 text-sm bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => handleAction(report.id, 'reject')}
                                            disabled={busy}
                                            className="px-3 py-1 text-sm bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Reject
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ModerationQueue;
