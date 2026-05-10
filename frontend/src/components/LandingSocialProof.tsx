import { Sparkles } from 'lucide-react'
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

    useEffect(() => {
        let cancelled = false
        apiV2
            .get<OracleSummary>('/api/v2/oracle/summary')
            .then((r) => {
                if (!cancelled) setData(r)
            })
            .catch(() => {
                if (!cancelled) setData(null)
            })
        return () => {
            cancelled = true
        }
    }, [])

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
