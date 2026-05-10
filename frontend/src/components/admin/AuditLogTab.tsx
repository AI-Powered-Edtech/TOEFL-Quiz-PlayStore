import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, ShieldCheck, AlertCircle } from 'lucide-react';
import { auditService, AuditLogEntry } from '../../services/auditService';

const formatDate = (iso: string) => {
  const d = new Date(String(iso).replace(' ', 'T') + 'Z');
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
};

export const AuditLogTab: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setLogs(await auditService.getLogs(150)); } catch (e: any) { setError(e?.message || 'Failed to load audit logs'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  return <div className="bg-white dark:bg-slate-900 rounded-xl shadow overflow-hidden">
    <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center">
      <div className="flex items-center gap-3"><ShieldCheck className="w-5 h-5 text-indigo-600"/><div><h3 className="font-bold">Audit Log Viewer</h3><p className="text-xs text-slate-500">Admin trail untuk role, tier, payout, moderation, dan delete.</p></div></div>
      <button onClick={load} disabled={loading} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm flex items-center gap-2"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}/>Refresh</button>
    </div>
    {error && <div className="m-4 p-4 rounded-lg bg-red-50 text-red-700 flex gap-2"><AlertCircle className="w-5 h-5"/>{error}</div>}
    {!loading && logs.length === 0 && <div className="p-10 text-center text-slate-500">Belum ada audit log.</div>}
    {logs.length > 0 && <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="bg-slate-100 dark:bg-slate-800"><th className="p-3">Time</th><th className="p-3">Actor</th><th className="p-3">Action</th><th className="p-3">Target</th><th className="p-3">Metadata</th></tr></thead><tbody>{logs.map(l => <tr key={l.id} className="border-t dark:border-slate-700"><td className="p-3 text-xs whitespace-nowrap">{formatDate(l.created_at)}</td><td className="p-3 text-xs font-mono">{l.actor_id}</td><td className="p-3 text-sm font-bold text-indigo-700 dark:text-indigo-300">{l.action}</td><td className="p-3 text-xs"><span className="font-semibold">{l.target_type}</span><br/><span className="font-mono text-slate-500">{l.target_id || '-'}</span></td><td className="p-3 text-xs max-w-[320px] truncate" title={l.metadata || ''}>{l.metadata || '-'}</td></tr>)}</tbody></table></div>}
  </div>;
};
