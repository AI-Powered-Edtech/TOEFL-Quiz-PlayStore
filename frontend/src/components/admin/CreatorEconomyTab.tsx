import React, { useEffect, useState } from 'react';
import { Crown, RefreshCw, Wallet, AlertCircle } from 'lucide-react';
import creatorService, { CreatorDashboard } from '../../services/creator';
import { requireAdminPin } from '../../services/adminPinService';
import { getActorId } from '../../services/securityUtils';

export const CreatorEconomyTab: React.FC = () => {
  const [displayName, setDisplayName] = useState('Creator Profile');
  const [amount, setAmount] = useState(10000);
  const [dash, setDash] = useState<CreatorDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmPayout, setConfirmPayout] = useState(false);
  const load = async () => { setBusy(true); setError(null); try { setDash(await creatorService.getDashboard(getActorId('guest'))); } catch (e: any) { setError(e?.message || 'Failed'); } finally { setBusy(false); } };
  useEffect(() => { load(); }, []);
  const register = async () => { setBusy(true); const r = await creatorService.register(displayName); setBusy(false); if (!r.ok) setError(r.error || 'Register failed'); await load(); };
  const payout = async () => { setConfirmPayout(true); };
  const confirmPayoutRequest = async () => { setConfirmPayout(false); if (!(await requireAdminPin('request payout kreator'))) return; setBusy(true); const r = await creatorService.requestPayout(amount); setBusy(false); if (!r.ok) setError(r.error || r.status || 'Payout failed'); await load(); };
  const profile = dash?.profile;
  return <div className="space-y-4">
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow p-5 border dark:border-slate-800">
      <div className="flex justify-between items-start gap-4"><div className="flex gap-3"><Crown className="w-6 h-6 text-amber-500"/><div><h3 className="font-bold">Creator Economy</h3><p className="text-xs text-slate-500">Revenue share 70/30, payout request internal, dan dashboard kreator minimal. Transfer real belum aktif sampai payment provider tersambung.</p></div></div><button onClick={load} className="text-sm flex gap-2 items-center px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800"><RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`}/>Refresh</button></div>
      {error && <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg flex gap-2 text-sm"><AlertCircle className="w-4 h-4"/>{error}</div>}
      <div className="grid md:grid-cols-3 gap-3 mt-5">
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-100"><div className="text-xs text-amber-700 font-bold uppercase">Status</div><div className="text-xl font-black">{profile?.status || 'not registered'}</div></div>
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100"><div className="text-xs text-emerald-700 font-bold uppercase">Total Earnings</div><div className="text-xl font-black">Rp {(profile?.total_earnings || 0).toLocaleString('id-ID')}</div></div>
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-100"><div className="text-xs text-blue-700 font-bold uppercase">Share</div><div className="text-xl font-black">{((profile?.revenue_share_bps || 7000)/100).toFixed(0)}%</div></div>
      </div>
    </div>
    <div className="grid md:grid-cols-2 gap-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow p-5"><h4 className="font-bold mb-3">Register / Update Creator</h4><input value={displayName} onChange={e=>setDisplayName(e.target.value)} className="w-full p-3 rounded-lg border dark:bg-slate-800 dark:border-slate-700"/><button onClick={register} disabled={busy} className="mt-3 w-full bg-amber-500 text-white font-bold py-2.5 rounded-lg">Save Creator</button></div>
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow p-5"><h4 className="font-bold mb-3 flex gap-2"><Wallet className="w-5 h-5"/>Request Payout</h4><input type="number" value={amount} onChange={e=>setAmount(Number(e.target.value))} className="w-full p-3 rounded-lg border dark:bg-slate-800 dark:border-slate-700"/><button onClick={payout} disabled={busy || !profile} className="mt-3 w-full bg-emerald-600 text-white font-bold py-2.5 rounded-lg disabled:opacity-50">Create Internal Request with PIN</button><p className="mt-2 text-[11px] text-slate-500">UX disclosure: belum ada transfer otomatis; admin perlu proses manual.</p></div>
    </div>
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow overflow-hidden"><div className="p-4 font-bold border-b dark:border-slate-800">Payouts</div>{!dash?.payouts?.length ? <div className="p-6 text-slate-500 text-sm">No payout rows.</div> : dash.payouts.map(p=><div key={p.id} className="p-4 border-b dark:border-slate-800 flex justify-between"><span className="font-mono text-xs">{p.id}</span><span>Rp {Number(p.amount).toLocaleString('id-ID')}</span><span className="font-bold">{p.status}</span></div>)}</div>
    {confirmPayout && <div className="fixed inset-0 z-50 bg-slate-950/40 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="payout-confirm-title"><div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 p-5 shadow-2xl border dark:border-slate-800"><h3 id="payout-confirm-title" className="text-lg font-bold mb-2">Create internal payout request?</h3><p className="text-sm text-slate-500 mb-5">This only creates an internal request. Real transfer still needs manual payment-provider processing.</p><div className="flex gap-3"><button onClick={()=>setConfirmPayout(false)} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold">Cancel</button><button onClick={confirmPayoutRequest} className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white">Create</button></div></div></div>}
  </div>;
};
