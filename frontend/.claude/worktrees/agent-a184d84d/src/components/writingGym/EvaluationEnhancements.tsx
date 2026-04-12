import React from 'react';

// ===== CONFIDENCE BADGE =====

interface ConfidenceBadgeProps {
    confidence: number;
}

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
    const percentage = Math.round(confidence * 100);
    const label = confidence >= 0.85 ? 'High' : confidence >= 0.7 ? 'Medium' : 'Low';

    const colors = {
        High: { bg: 'rgba(34, 197, 94, 0.15)', text: '#16a34a', border: 'rgba(34, 197, 94, 0.3)' },
        Medium: { bg: 'rgba(234, 179, 8, 0.15)', text: '#ca8a04', border: 'rgba(234, 179, 8, 0.3)' },
        Low: { bg: 'rgba(239, 68, 68, 0.15)', text: '#dc2626', border: 'rgba(239, 68, 68, 0.3)' },
    };

    const style = colors[label];

    return (
        <div
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: style.bg,
                color: style.text,
                border: `1px solid ${style.border}`,
            }}
        >
            <span style={{ fontSize: '10px' }}>🎯</span>
            AI Confidence: {label} ({percentage}%)
        </div>
    );
}

// ===== GRAMMAR ERROR LIST =====

interface GrammarError {
    category: string;
    fragment: string;
    correction: string;
    severity: string;
    explanation: string;
}

interface GrammarErrorListProps {
    errors: GrammarError[];
}

export function GrammarErrorList({ errors }: GrammarErrorListProps) {
    if (!errors || errors.length === 0) return null;

    const severityColors: Record<string, { bg: string; border: string; icon: string }> = {
        high: { bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.2)', icon: '🔴' },
        medium: { bg: 'rgba(234, 179, 8, 0.08)', border: 'rgba(234, 179, 8, 0.2)', icon: '🟡' },
        low: { bg: 'rgba(156, 163, 175, 0.08)', border: 'rgba(156, 163, 175, 0.2)', icon: '⚪' },
    };

    return (
        <div style={{ marginTop: '16px' }}>
            <h4
                style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#1f2937',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                }}
            >
                📝 Grammar Issues ({errors.length})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {errors.map((error, i) => {
                    const sev = severityColors[error.severity] || severityColors.low;
                    return (
                        <div
                            key={i}
                            style={{
                                padding: '12px',
                                borderRadius: '10px',
                                backgroundColor: sev.bg,
                                border: `1px solid ${sev.border}`,
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span>{sev.icon}</span>
                                <span style={{ color: '#dc2626', textDecoration: 'line-through', fontSize: '13px' }}>
                                    {error.fragment}
                                </span>
                                <span style={{ color: '#9ca3af' }}>→</span>
                                <span style={{ color: '#16a34a', fontWeight: 600, fontSize: '13px' }}>
                                    {error.correction}
                                </span>
                            </div>
                            <p style={{ margin: '4px 0 0 24px', fontSize: '12px', color: '#6b7280' }}>
                                {error.explanation}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ===== GRAMMAR SUMMARY =====

interface GrammarSummaryProps {
    summary: {
        total_errors: number;
        by_category: Record<string, number>;
        by_severity: Record<string, number>;
        most_frequent_error: string;
    };
}

export function GrammarSummary({ summary }: GrammarSummaryProps) {
    if (!summary) return null;

    return (
        <div
            style={{
                marginTop: '12px',
                padding: '12px 16px',
                borderRadius: '10px',
                backgroundColor: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
            }}
        >
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#4f46e5', margin: '0 0 8px 0' }}>
                📊 Grammar Summary
            </h4>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12px', color: '#374151' }}>
                <div>
                    <strong>Total:</strong> {summary.total_errors} errors
                </div>
                <div>
                    <strong>Most Frequent:</strong> {summary.most_frequent_error}
                </div>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                {Object.entries(summary.by_category).map(([cat, count]) => (
                    <span
                        key={cat}
                        style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            fontSize: '11px',
                            backgroundColor: 'rgba(99, 102, 241, 0.15)',
                            color: '#4f46e5',
                        }}
                    >
                        {cat}: {count}
                    </span>
                ))}
            </div>
        </div>
    );
}

// ===== INDOGLISH WARNINGS =====

interface IndoglishWarning {
    fragment: string;
    correction: string;
    explanation: string;
}

interface IndoglishWarningsProps {
    issues: IndoglishWarning[];
}

export function IndoglishWarnings({ issues }: IndoglishWarningsProps) {
    if (!issues || issues.length === 0) return null;

    return (
        <div
            style={{
                marginTop: '16px',
                padding: '16px',
                borderRadius: '12px',
                backgroundColor: 'rgba(249, 115, 22, 0.08)',
                border: '1px solid rgba(249, 115, 22, 0.2)',
            }}
        >
            <h4
                style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#c2410c',
                    margin: '0 0 8px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                }}
            >
                🇮🇩 Indonesian-English Interference ({issues.length})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {issues.map((issue, i) => (
                    <div key={i} style={{ fontSize: '13px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ textDecoration: 'line-through', color: '#c2410c' }}>
                                {issue.fragment}
                            </span>
                            <span style={{ color: '#9ca3af' }}>→</span>
                            <span style={{ color: '#16a34a', fontWeight: 600 }}>{issue.correction}</span>
                        </div>
                        <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#ea580c' }}>
                            {issue.explanation}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ===== PROGRESS INDICATOR =====

interface EssayProgressBadgeProps {
    trend: 'improving' | 'declining' | 'stable' | 'new';
    improvement: number | null;
}

export function EssayProgressBadge({ trend, improvement }: EssayProgressBadgeProps) {
    const config = {
        improving: { icon: '📈', label: 'Improving', color: '#16a34a', bg: 'rgba(34, 197, 94, 0.1)' },
        declining: { icon: '📉', label: 'Declining', color: '#dc2626', bg: 'rgba(239, 68, 68, 0.1)' },
        stable: { icon: '➡️', label: 'Stable', color: '#ca8a04', bg: 'rgba(234, 179, 8, 0.1)' },
        new: { icon: '🆕', label: 'First Submission', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)' },
    };

    const c = config[trend];

    return (
        <div
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: c.bg,
                color: c.color,
            }}
        >
            <span>{c.icon}</span>
            {c.label}
            {improvement !== null && ` (${improvement > 0 ? '+' : ''}${improvement})`}
        </div>
    );
}
