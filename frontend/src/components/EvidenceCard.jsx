import React from 'react'

const riskColors = {
  critical: { main: '#dc2626', bg: '#fef2f2', border: '#fee2e2' },
  high: { main: '#ef4444', bg: '#fef2f2', border: '#fee2e2' },
  medium: { main: '#f97316', bg: '#fff7ed', border: '#fed7aa' },
  low: { main: '#f59e0b', bg: '#fffbeb', border: '#fef3c7' },
  safe: { main: '#10b981', bg: '#ecfdf5', border: '#d1fae5' },
}

const categorySeverity = {
  'OTP/PIN Request': 'critical',
  'Card Detail Phishing': 'critical',
  'Remote Access': 'critical',
  'Urgency/Threats': 'high',
  'Impersonation': 'high',
  'Fake KYC': 'high',
  'UPI/Payment Scam': 'high',
  'Prize/Job Scam': 'medium',
  'Suspicious Link': 'medium',
}

export default function EvidenceCard({ evidence, onHighlight }) {
  if (!evidence || evidence.length === 0) {
    return (
      <div className="evidence-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p>No suspicious indicators detected</p>
      </div>
    )
  }

  return (
    <div className="evidence-grid">
      {evidence.map((ev, idx) => {
        const severity = categorySeverity[ev.category] || 'medium'
        const color = riskColors[severity]
        return (
          <div
            key={`${ev.pattern_id}-${idx}`}
            className="evidence-card"
            style={{
              borderColor: color.border,
              background: color.bg,
            }}
            onClick={() => onHighlight?.(ev)}
          >
            <div className="evidence-header">
              <span
                className="evidence-badge"
                style={{ background: color.main }}
              >
                {severity.toUpperCase()}
              </span>
              <span className="evidence-category">{ev.category}</span>
            </div>
            <div className="evidence-text">
              <span className="matched-text">"{ev.matched_text}"</span>
            </div>
            <div className="evidence-explanation">{ev.explanation}</div>
            <div className="evidence-meta">
              <span className="evidence-weight" style={{ color: color.main }}>
                +{ev.weight} pts
              </span>
              <span className="evidence-language">
                {ev.language.toUpperCase()}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}