import React, { useEffect, useState } from 'react';
import { Database, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { CanonicalQuestionV1 } from '../../types';
import { fetchAdminQuestionsV2, upsertAdminQuestionV2, deleteAdminQuestionV2 } from '../../services/questionBankAdminV2';
import { requireAdminPin } from '../../services/adminPinService';

const blank = (): Partial<CanonicalQuestionV1> => ({ skill_id: 1, section: 'structure', interaction: 'fill_blank', prompt: '', choices: [], correct_response: [''], cefr_target: 'B1', difficulty_score: 50, stimulus: {}, metadata: { source: 'db' } });

export const QuestionBankAdminTab: React.FC = () => {
  const [rows, setRows] = useState<CanonicalQuestionV1[]>([]);
  const [form, setForm] = useState<Partial<CanonicalQuestionV1>>(blank());
  const [busy, setBusy] = useState(false);
  const load = async () => { setBusy(true); try { setRows(await fetchAdminQuestionsV2()); } finally { setBusy(false); } };
  useEffect(() => { load(); }, []);
  const save = async () => { setBusy(true); try { await upsertAdminQuestionV2(form); setForm(blank()); await load(); } finally { setBusy(false); } };
  const del = async (id?: string) => { if (!id || !(await requireAdminPin('delete question'))) return; setBusy(true); try { await deleteAdminQuestionV2(id); await load(); } finally { setBusy(false); } };
  return <div className="space-y-4">
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow p-5"><div className="flex justify-between"><div className="flex gap-2"><Database className="w-5 h-5 text-blue-600"/><div><h3 className="font-bold">Question Bank CRUD Admin</h3><p className="text-xs text-slate-500">DB v2 authoring; IndexedDB bank tetap fallback offline.</p></div></div><button onClick={load} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg flex gap-2 text-sm"><RefreshCw className={`w-4 h-4 ${busy?'animate-spin':''}`}/>Refresh</button></div>
      <div className="grid md:grid-cols-4 gap-3 mt-4"><input type="number" value={form.skill_id || 1} onChange={e=>setForm({...form, skill_id:Number(e.target.value)})} className="p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"/><select value={form.section} onChange={e=>setForm({...form, section:e.target.value as any})} className="p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"><option value="structure">structure</option><option value="written">written</option><option value="reading">reading</option><option value="listening">listening</option></select><select value={form.interaction} onChange={e=>setForm({...form, interaction:e.target.value as any})} className="p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"><option value="fill_blank">fill_blank</option><option value="identify_error">identify_error</option><option value="multiple_choice">multiple_choice</option></select><input type="number" value={form.difficulty_score || 50} onChange={e=>setForm({...form, difficulty_score:Number(e.target.value)})} className="p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"/></div>
      <textarea value={form.prompt || ''} onChange={e=>setForm({...form, prompt:e.target.value})} placeholder="Prompt" className="mt-3 w-full p-3 border rounded-lg min-h-[90px] dark:bg-slate-800 dark:border-slate-700"/>
      <div className="grid md:grid-cols-2 gap-3 mt-3"><input value={(form.choices || []).join('|')} onChange={e=>setForm({...form, choices:e.target.value.split('|').filter(Boolean)})} placeholder="Choices separated by |" className="p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"/><input value={(form.correct_response || []).join('|')} onChange={e=>setForm({...form, correct_response:e.target.value.split('|').filter(Boolean)})} placeholder="Correct response" className="p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"/></div>
      <button onClick={save} disabled={busy || !form.prompt} className="mt-3 bg-blue-600 text-white font-bold px-4 py-2 rounded-lg flex gap-2 disabled:opacity-50"><Plus className="w-4 h-4"/>Save Question</button>
    </div>
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow overflow-hidden"><div className="p-4 font-bold border-b dark:border-slate-800">Latest DB Questions ({rows.length})</div>{rows.map(q=><div key={q.id} className="p-4 border-b dark:border-slate-800 flex justify-between gap-4"><div><div className="text-xs font-bold text-blue-600">{q.section} · skill {q.skill_id} · {q.cefr_target}</div><div className="font-medium line-clamp-2">{q.prompt}</div></div><button onClick={()=>del(q.id)} className="text-red-600 p-2"><Trash2 className="w-4 h-4"/></button></div>)}</div>
  </div>;
};
