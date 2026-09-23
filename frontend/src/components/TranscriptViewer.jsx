import React, { useState, useMemo } from 'react'

export default function TranscriptViewer({ transcript, evidence, language, duration, onHighlight }) {
  const [expanded, setExpanded] = useState(true)
  const [highlightedEvidence, setHighlightedEvidence] = useState(null)

  // Create highlighted transcript by matching evidence positions
  const highlightedTranscript = useMemo(() => {
    if (!transcript || !evidence || evidence.length === 0) {
      return [{ text: transcript, highlight: null }]
    }

    // Sort evidence by position
    const sortedEvidence = [...evidence].sort((a, b) => a.position - b.position)

    const segments = []
    let lastIndex = 0

    sortedEvidence.forEach((ev) => {
      const start = Math.max(0, ev.position)
      const end = Math.min(transcript.length, ev.position + ev.matched_text.length)

      // Add text before match
      if (start > lastIndex) {
        segments.push({
          text: transcript.slice(lastIndex, start),
          highlight: null,
        })
      }

      // Add matched text
      segments.push({
        text: transcript.slice(start, end),
        highlight: ev,
      })

      lastIndex = end
    })

    // Add remaining text
    if (lastIndex < transcript.length) {
      segments.push({
        text: transcript.slice(lastIndex),
        highlight: null,
      })
    }

    return segments
  }, [transcript, evidence])

  const handleSegmentClick = (ev) => {
    if (ev) {
      setHighlightedEvidence(ev)
      onHighlight?.(ev)
    }
  }

  const riskColors = {
    critical: '#dc2626',
    high: '#ef4444',
    medium: '#f97316',
    low: '#f59e0b',
    safe: '#10b981',
  }

  const getSeverity = (category) => {
    const mapping = {
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
    return mapping[category] || 'medium'
  }

  return (
    <div className="transcript-viewer">
      <div className="transcript-header">
        <div className="transcript-header-left">
          <button
            className={`expand-toggle ${expanded ? 'expanded' : ''}`}
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? 'Collapse transcript' : 'Expand transcript'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div>
            <h3>Conversation Intelligence</h3>
            <p className="transcript-subtitle">AI-extracted conversation</p>
          </div>
        </div>
        <div className="transcript-meta">
          <span className="meta-chip">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
            {language}
          </span>
          <span className="meta-chip">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {duration}s
          </span>
        </div>
      </div>

      {expanded && (
        <>
          <div className="transcript-content">
            {highlightedTranscript.map((segment, idx) => (
              <span
                key={idx}
                className={segment.highlight ? 'transcript-highlight' : ''}
                style={{
                  backgroundColor: segment.highlight
                    ? riskColors[getSeverity(segment.highlight.category)] + '20'
                    : 'transparent',
                  borderColor: segment.highlight
                    ? riskColors[getSeverity(segment.highlight.category)]
                    : 'transparent',
                }}
                onClick={() => handleSegmentClick(segment.highlight)}
              >
                {segment.text}
              </span>
            ))}
          </div>

          {highlightedEvidence && (
            <div className="evidence-tooltip">
              <div className="tooltip-header">
                <span
                  className="tooltip-badge"
                  style={{ background: riskColors[getSeverity(highlightedEvidence.category)] }}
                >
                  {getSeverity(highlightedEvidence.category).toUpperCase()}
                </span>
                <button
                  className="tooltip-close"
                  onClick={() => setHighlightedEvidence(null)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="tooltip-text">{highlightedEvidence.explanation}</p>
              <div className="tooltip-meta">
                <span>Weight: +{highlightedEvidence.weight} pts</span>
                <span>Category: {highlightedEvidence.category}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}