import { useEffect, useState } from 'react'
import { apiV2 } from '../../services/apiV2'

type Status = { ok: boolean; latencyMs: number; version?: string } | null

export default function VwfdHealthCard() {
  const [status, setStatus] = useState<Status>(null)
  const [polling, setPolling] = useState(false)

  const poll = async () => {
    setPolling(true)
    try { setStatus(await apiV2.ping()) } finally { setPolling(false) }
  }

  useEffect(() => {
    poll()
    const t = setInterval(poll, 30_000)
    return () => clearInterval(t)
  }, [])

  const dot = status?.ok ? 'bg-emerald-500' : status === null ? 'bg-slate-400' : 'bg-rose-500'
  const label = status?.ok ? 'Healthy' : status === null ? 'Checking…' : 'Down'

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${dot} ${polling ? 'animate-pulse' : ''}`} />
          <h3 className="text-sm font-semibold text-slate-800">VWFD runtime</h3>
        </div>
        <button
          onClick={poll}
          className="text-xs text-teal-600 hover:text-teal-800 disabled:opacity-50"
          disabled={polling}
        >
          Refresh
        </button>
      </div>
      <dl className="mt-3 space-y-1 text-xs text-slate-600">
        <div className="flex justify-between"><dt>Status</dt><dd className="font-medium">{label}</dd></div>
        <div className="flex justify-between"><dt>Latency</dt><dd>{status ? `${status.latencyMs} ms` : '—'}</dd></div>
        <div className="flex justify-between"><dt>Version</dt><dd>{status?.version || '—'}</dd></div>
        <div className="flex justify-between"><dt>Endpoint</dt><dd className="truncate max-w-[12rem]">/api/v2/health</dd></div>
      </dl>
      <p className="mt-3 text-[11px] leading-snug text-slate-500">
        This pings the workflow-pattern companion runtime. If it’s down, public read-only endpoints (blog list, public leaderboard, oracle summary) fall back to the main backend automatically.
      </p>
    </div>
  )
}
