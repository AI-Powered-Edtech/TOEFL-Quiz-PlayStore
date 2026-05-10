import { RefreshCw, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'

import { apiV2 } from '../services/apiV2'

type Bucket = { band: string; learner_count: number }
type OracleSummary = {
    window: string
    buckets: Bucket[]
    row_learner_count: number
    computed_at: string
}

/**
 * Tiny social-proof banner powered by /api/v2/oracle/summary (VWFD).
 * Renders nothing on error, empty data, or while loading — fail-silent so the
 * dashboard never breaks if the companion runtime is down.
 *
 * UX: shows total learners tested in last 7 days + the most common CEFR band
 * landed at. Anonymous, cacheable, 1 fetch on mount.
 */
export default function LandingSocialProof() {
    const [data, setData] = useState<OracleSummary | null>(null)
    const [error, setError] = useState(false)
    const [loading, setLoading] = useState(true)

    const loadSummary = () => {
        setLoading(true)
        setError(false)
        apiV2
            .get<OracleSummary>('/api/v2/oracle/summary')
            .then((r) => {
                setData(r)
                setError(false)
            })
            .catch(() => {
                setData(null)
                setError(true)
            })
            .finally(() => setLoading(false))
    }

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        setError(false)
        apiV2
            .get<OracleSummary>('/api/v2/oracle/summary')
            .then((r) => {
                if (!cancelled) {
                    setData(r)
                    setError(false)
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setData(null)
                    setError(true)
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [])

    if (loading) return null

    if (error) {
        return (
            <div
                data-testid="landing-social-proof-fallback"
                role="status"
                aria-live="polite"
                className="mx-4 mt-1 mb-3 px-3 py-2 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-between gap-2 text-xs"
            >
                <p className="text-blue-900 leading-snug">
                    <span className="font-semibold">Ringkasan AI belum tersedia.</span> Komunitas dan latihan tetap bisa digunakan.
                </p>
                <button
                    type="button"
                    onClick={loadSummary}
                    className="shrink-0 inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 font-semibold text-blue-700 border border-blue-100"
                >
                    <RefreshCw className="w-3 h-3" />
                    Coba lagi
                </button>
            </div>
        )
    }

    if (!data || !Array.isArray(data.buckets) || data.buckets.length === 0) return null

    const total = data.buckets.reduce((s, b) => s + (Number(b.learner_count) || 0), 0)
    if (total === 0) return null

    const top = data.buckets.reduce(
        (a, b) => ((Number(b.learner_count) || 0) > (Number(a.learner_count) || 0) ? b : a),
        { band: '\u2014', learner_count: 0 } as Bucket
    )

    return (
        <div
            data-testid="landing-social-proof"
            className="mx-4 mt-1 mb-3 px-3 py-2 rounded-2xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-100 flex items-center gap-2 text-xs"
        >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <p className="text-amber-900 leading-snug">
                <span className="font-semibold">{total.toLocaleString('en-US')} learners</span> tested in the last 7 days — most landed at{' '}
                <span className="font-semibold">{top.band}</span>.
            </p>
        </div>
    )
}
