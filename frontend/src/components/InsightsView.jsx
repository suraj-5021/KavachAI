import React, { useMemo } from 'react'

export default function InsightsView() {
  const history = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('kavachai_history') || '[]')
    } catch {
      return []
    }
  }, [])

  const stats = useMemo(() => {
    if (!history || history.length === 0) return null

    const total = history.length
    const safeCount = history.filter(h => h.risk_level === 'safe').length
    const lowCount = history.filter(h => h.risk_level === 'low').length
    const mediumCount = history.filter(h => h.risk_level === 'medium').length
    const highCount = history.filter(h => h.risk_level === 'high').length
    const criticalCount = history.filter(h => h.risk_level === 'critical').length
    const flaggedCount = total - safeCount

    const avgScore = Math.round(history.reduce((acc, h) => acc + (h.risk_score || 0), 0) / total)
    const avgDuration = (history.reduce((acc, h) => acc + (h.audio_duration_sec || h.duration || 0), 0) / total).toFixed(1)
    const totalSignals = history.reduce((acc, h) => acc + (h.evidence_count || (h.evidence ? h.evidence.length : 0)), 0)

    // Category frequency
    const categoryCounts = {}
    history.forEach(h => {
      if (h.categories_triggered && Array.isArray(h.categories_triggered)) {
        h.categories_triggered.forEach(cat => {
          categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
        })
      }
    })

    const sortedCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])

    return {
      total,
      safeCount,
      lowCount,
      mediumCount,
      highCount,
      criticalCount,
      flaggedCount,
      avgScore,
      avgDuration,
      totalSignals,
      sortedCategories,
    }
  }, [history])

  if (!stats) {
    return (
      <div className="insights-view">
        <header className="view-header">
          <h1>Security Insights</h1>
          <p className="subtitle">Real-time metrics computed exclusively from your local analysis history</p>
        </header>

        <div className="insights-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3>No Analysis History Yet</h3>
          <p>Analyze audio conversations to generate local threat metrics and patterns.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="insights-view">
      <header className="view-header">
        <h1>Security Insights</h1>
        <p className="subtitle">Metrics aggregated from {stats.total} on-device scan{stats.total > 1 ? 's' : ''}</p>
      </header>

      <div className="insights-grid">
        <div className="insight-card stat-total">
          <span className="stat-label">Total Analyses</span>
          <span className="stat-value">{stats.total}</span>
          <span className="stat-sub">Processed locally on device</span>
        </div>

        <div className="insight-card stat-flagged">
          <span className="stat-label">Flagged / Suspicious</span>
          <span className="stat-value" style={{ color: '#ef4444' }}>{stats.flaggedCount}</span>
          <span className="stat-sub">{stats.total > 0 ? Math.round((stats.flaggedCount / stats.total) * 100) : 0}% of scanned calls</span>
        </div>

        <div className="insight-card stat-safe">
          <span className="stat-label">Safe Conversations</span>
          <span className="stat-value" style={{ color: '#10b981' }}>{stats.safeCount}</span>
          <span className="stat-sub">{stats.total > 0 ? Math.round((stats.safeCount / stats.total) * 100) : 0}% safe calls</span>
        </div>

        <div className="insight-card stat-avg">
          <span className="stat-label">Average Risk Score</span>
          <span className="stat-value">{stats.avgScore} <span className="stat-denom">/100</span></span>
          <span className="stat-sub">Across all recorded scans</span>
        </div>
      </div>

      <div className="insights-breakdown-grid">
        <div className="insight-panel">
          <h3>Risk Level Distribution</h3>
          <div className="distribution-bars">
            <div className="dist-row">
              <span className="dist-label">Safe (0)</span>
              <div className="dist-bar-track">
                <div
                  className="dist-bar-fill"
                  style={{ width: `${(stats.safeCount / stats.total) * 100}%`, background: '#10b981' }}
                />
              </div>
              <span className="dist-count">{stats.safeCount}</span>
            </div>
            <div className="dist-row">
              <span className="dist-label">Low (1–15)</span>
              <div className="dist-bar-track">
                <div
                  className="dist-bar-fill"
                  style={{ width: `${(stats.lowCount / stats.total) * 100}%`, background: '#f59e0b' }}
                />
              </div>
              <span className="dist-count">{stats.lowCount}</span>
            </div>
            <div className="dist-row">
              <span className="dist-label">Medium (16–40)</span>
              <div className="dist-bar-track">
                <div
                  className="dist-bar-fill"
                  style={{ width: `${(stats.mediumCount / stats.total) * 100}%`, background: '#f97316' }}
                />
              </div>
              <span className="dist-count">{stats.mediumCount}</span>
            </div>
            <div className="dist-row">
              <span className="dist-label">High (41–70)</span>
              <div className="dist-bar-track">
                <div
                  className="dist-bar-fill"
                  style={{ width: `${(stats.highCount / stats.total) * 100}%`, background: '#ef4444' }}
                />
              </div>
              <span className="dist-count">{stats.highCount}</span>
            </div>
            <div className="dist-row">
              <span className="dist-label">Critical (71–100)</span>
              <div className="dist-bar-track">
                <div
                  className="dist-bar-fill"
                  style={{ width: `${(stats.criticalCount / stats.total) * 100}%`, background: '#dc2626' }}
                />
              </div>
              <span className="dist-count">{stats.criticalCount}</span>
            </div>
          </div>
        </div>

        <div className="insight-panel">
          <h3>Detected Threat Categories</h3>
          {stats.sortedCategories.length === 0 ? (
            <p className="no-data-msg">No threat categories recorded in local history yet.</p>
          ) : (
            <div className="category-freq-list">
              {stats.sortedCategories.map(([category, count]) => (
                <div key={category} className="category-freq-item">
                  <span className="cat-name">{category}</span>
                  <span className="cat-hits">{count} hit{count > 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
