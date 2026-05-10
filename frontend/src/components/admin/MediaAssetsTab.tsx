import React, { useRef, useState } from 'react';
import { Music, Upload } from 'lucide-react';
import { listMediaAssets, registerMediaAsset, MediaAsset } from '../../services/mediaRegistryService';
import { getActorId } from '../../services/securityUtils';

export const MediaAssetsTab: React.FC = () => {
  const [type, setType] = useState<'avatar'|'audio'>('audio');
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('Listening asset');
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const owner = getActorId('guest');
  const load = async () => setAssets(await listMediaAssets(owner, type));
  const save = async (nextUrl = url, mime = type === 'audio' ? 'audio/mpeg' : 'image/*') => { setBusy(true); try { await registerMediaAsset({ owner_id: owner, asset_type: type, url: nextUrl, label, mime_type: mime }); setMsg('Registered. UX note: ini registry URL/data URL, bukan object storage production.'); setUrl(''); await load(); } catch (e:any) { setMsg(e?.message || 'Failed'); } finally { setBusy(false); } };
  const handleFile = async (file?: File) => {
    if (!file) return;
    const max = type === 'audio' ? 2_000_000 : 750_000;
    if (file.size > max) { setMsg(`File terlalu besar. Batas ${type === 'audio' ? '2 MB' : '750 KB'} untuk mobile UX.`); return; }
    if (type === 'audio' && !file.type.startsWith('audio/')) { setMsg('Pilih file audio.'); return; }
    if (type === 'avatar' && !file.type.startsWith('image/')) { setMsg('Pilih file image.'); return; }
    const dataUrl = await new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result || '')); r.onerror = () => reject(r.error); r.readAsDataURL(file); });
    await save(dataUrl, file.type);
  };
  return <div className="bg-white dark:bg-slate-900 rounded-xl shadow p-5">
    <div className="flex gap-3 mb-4"><Music className="w-5 h-5 text-pink-600"/><div><h3 className="font-bold">Avatar & Audio Upload Registry</h3><p className="text-xs text-slate-500">MVP aman: register URL/data URL. Storage binary penuh masih perlu endpoint storage/Rust.</p></div></div>
    <div className="grid md:grid-cols-4 gap-3"><select value={type} onChange={e=>setType(e.target.value as any)} className="p-2 border rounded-lg dark:bg-slate-800"><option value="audio">audio</option><option value="avatar">avatar</option></select><input value={label} onChange={e=>setLabel(e.target.value)} className="p-2 border rounded-lg dark:bg-slate-800"/><input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://... or data:audio/..." className="md:col-span-2 p-2 border rounded-lg dark:bg-slate-800"/></div>
    <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => save()} disabled={busy || !url} className="bg-pink-600 text-white font-bold px-4 py-2 rounded-lg flex gap-2 disabled:opacity-50"><Upload className="w-4 h-4"/>Register URL</button><input ref={fileRef} type="file" accept={type === 'audio' ? 'audio/*' : 'image/*'} className="hidden" onChange={(e)=>handleFile(e.target.files?.[0])}/><button onClick={() => fileRef.current?.click()} disabled={busy} className="bg-slate-100 dark:bg-slate-800 font-bold px-4 py-2 rounded-lg">Use local file</button></div>{msg && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{msg}</p>}
    <button onClick={load} className="mt-5 text-sm underline">Load assets</button><div className="mt-3 space-y-2">{assets.map(a=><div key={a.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm"><b>{a.label || a.asset_type}</b><div className="truncate text-xs text-slate-500">{a.url}</div></div>)}</div>
  </div>;
};
