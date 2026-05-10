import { Flag, RefreshCw, AlertCircle, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';

import { fetchPendingReportsV2, PendingModerationReport, resolveReportV2 } from '../../services/moderationApiV2';
import { requireAdminPin } from '../../services/adminPinService';

const REASON_COLORS: Record<string, string> = {
    spam: 'bg-amber-100 text-amber-700 border-amber-200',
    inappropriate: 'bg-red-100 text-red-700 border-red-200',
    offensive: 'bg-rose-100 text-rose-700 border-rose-200',
    plagiarism: 'bg-purple-100 text-purple-700 border-purple-200',
    low_quality: 'bg-slate-100 text-slate-700 border-slate-200',
    incorrect_scoring: 'bg-blue-100 text-blue-700 border-blue-200',
    other: 'bg-slate-100 text-slate-700 border-slate-200',
};

const formatDate = (iso: string): string => {
    try {
        const d = new Date(iso.replace(' ', 'T') + 'Z');
        if (Number.isNaN(d.getTime())) return iso;
        return d.toLocaleString();
    } catch {
        return iso;
    }
};

export const ModerationQueueTab: React.FC = () => {
    const [reports, setReports] = useState<PendingModerationReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [actingId, setActingId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const r = await fetchPendingReportsV2();
            setReports(r);
        } catch (e: any) {
            setError(String(e?.message || e));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const resolve = async (id: string, status: 'resolved' | 'dismissed') => {
        const ok = await requireAdminPin(`${status} moderation report`);
        if (!ok) return;
        const note = window.prompt('Resolution note (optional):', status === 'resolved' ? 'Action taken' : 'Dismissed as not actionable') || '';
        setActingId(id);
        setError(null);
        try {
            await resolveReportV2(id, status, note);
            await load();
        } catch (e: any) {
            setError(String(e?.message || e));
        } finally {
            setActingId(null);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b dark:border-slate-700">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                        <Flag className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-white">Pending Moderation Queue</h3>
                        <p className="text-xs text-slate-500">{loading ? 'Loading\u2026' : `${reports.length} pending report(s)`}</p>
                    </div>
                </div>
                <button
                    onClick={load}
                    disabled={loading}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-sm rounded-lg flex items-center gap-2 disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {loading && reports.length === 0 && (
                <div className="p-12 text-center">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
                    <p className="text-sm text-slate-500">Loading reports\u2026</p>
                </div>
            )}

            {!loading && error && (
                <div className="p-6 bg-red-50 dark:bg-red-950 border-l-4 border-red-500 m-4 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-red-800 dark:text-red-200">Failed to load moderation queue</p>
                        <p className="text-xs text-red-600 dark:text-red-300 mt-1 break-words">{error}</p>
                    </div>
                </div>
            )}

            {!loading && !error && reports.length === 0 && (
                <div className="p-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-4">
                        <Flag className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">No pending reports</h3>
                    <p className="text-sm text-slate-500">The moderation queue is clear.</p>
                </div>
            )}

            {reports.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-100 dark:bg-slate-800 border-b dark:border-slate-700">
                                <th className="p-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Reason</th>
                                <th className="p-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Target</th>
                                <th className="p-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Description</th>
                                <th className="p-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Reporter</th>
                                <th className="p-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">When</th>
                                <th className="p-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reports.map((r) => (
                                <tr key={r.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="p-3">
                                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${REASON_COLORS[r.reason] || REASON_COLORS.other}`}>
                                            {r.reason}
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        <div className="text-xs text-slate-500 uppercase font-bold">{r.content_type}</div>
                                        <div className="text-sm font-mono text-slate-800 dark:text-slate-200 truncate max-w-[200px]">{r.content_id}</div>
                                    </td>
                                    <td className="p-3 text-sm text-slate-600 dark:text-slate-300 max-w-[280px] truncate" title={r.description || ''}>
                                        {r.description || <span className="text-slate-400 italic">no description</span>}
                                    </td>
                                    <td className="p-3 text-xs font-mono text-slate-500 truncate max-w-[140px]">{r.reporter_id}</td>
                                    <td className="p-3 text-xs text-slate-500 whitespace-nowrap">{formatDate(r.created_at)}</td>
                                    <td className="p-3 text-right whitespace-nowrap">
                                        <button disabled={actingId === r.id} onClick={() => resolve(r.id, 'resolved')} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 mr-2"><CheckCircle2 className="w-3 h-3"/>Resolve</button>
                                        <button disabled={actingId === r.id} onClick={() => resolve(r.id, 'dismissed')} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50"><XCircle className="w-3 h-3"/>Dismiss</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
