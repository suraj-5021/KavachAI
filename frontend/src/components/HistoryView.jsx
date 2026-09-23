import React, { useState } from 'react'

const RISK_COLORS = {
  safe: '#10b981',
  low: '#f59e0b',
  medium: '#f97316',
  high: '#ef4444',
  critical: '#dc2626',
}

export default function HistoryView({ onSelectAnalysis, onClearHistory }) {
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('kavachai_history') || '[]')
    } catch {
      return []
    }
  })
  const [confirmClear, setConfirmClear] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const handleClear = () => {
    localStorage.removeItem('kavachai_history')
    setHistory([])
    setConfirmClear(false)
    onClearHistory?.()
  }

  const filteredHistory = history.filter(item => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      item.risk_level?.toLowerCase().includes(term) ||
      item.transcript?.toLowerCase().includes(term) ||
      String(item.risk_score).includes(term) ||
      (item.categories_triggered && item.categories_triggered.some(c => c.toLowerCase().includes(term)))
    )
  })

  const formatDate = (timestamp) => {
    const d = new Date(timestamp)
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="history-view">
      <header className="view-header">
        <div className="view-header-row">
          <div>
            <h1>Analysis History</h1>
            <p className="subtitle">Locally stored conversation scan records ({history.length} total)</p>
          </div>
          {history.length > 0 && (
            <div className="header-actions">
              <button
                className="btn-danger"
                onClick={() => setConfirmClear(true)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear History
              </button>
            </div>
          )}
        </div>
      </header>

      {history.length > 0 && (
        <div className="history-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by risk level, score, transcript text..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="search-clear" onClick={() => setSearchTerm('')}>×</button>
          )}
        </div>
      )}

      {history.length === 0 ? (
        <div className="history-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <h3>No Analysis History</h3>
          <p>Scanned conversations will be stored locally on your device.</p>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="history-empty">
          <p>No matching history entries found for "{searchTerm}"</p>
        </div>
      ) : (
        <div className="history-list">
          {filteredHistory.map((item, idx) => (
            <div
              key={item.id || idx}
              className="history-card"
              onClick={() => onSelectAnalysis?.(item)}
            >
              <div className="history-card-header">
                <span
                  className="risk-badge"
                  style={{
                    backgroundColor: (RISK_COLORS[item.risk_level] || '#64748b') + '20',
                    color: RISK_COLORS[item.risk_level] || '#64748b',
                    borderColor: RISK_COLORS[item.risk_level] || '#64748b'
                  }}
                >
                  {item.risk_level?.toUpperCase()}
                </span>
                <span className="history-score" style={{ color: RISK_COLORS[item.risk_level] }}>
                  {item.risk_score}/100
                </span>
                <span className="history-date">{formatDate(item.timestamp)}</span>
              </div>

              {item.transcript && (
                <p className="history-transcript-preview">
                  "{item.transcript}"
                </p>
              )}

              <div className="history-card-footer">
                <span className="history-meta">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {item.duration || 0}s duration
                </span>
                <span className="history-meta">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {item.evidence_count || 0} signals
                </span>
                <span className="history-action-link">View Analysis →</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmClear && (
        <div className="modal-overlay" onClick={() => setConfirmClear(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3>Clear All History?</h3>
            </div>
            <p>This will permanently erase all local analysis scan records from this browser. This cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setConfirmClear(false)}>Cancel</button>
              <button className="btn-danger" onClick={handleClear}>Clear All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
