import React from 'react'

export default function RiskGauge({ score, riskLevel, label, size = 220, animated = true }) {
  const riskColors = {
    safe: { main: '#10b981', light: '#ecfdf5', gradient: 'from-emerald-500 to-green-600' },
    low: { main: '#f59e0b', light: '#fffbeb', gradient: 'from-amber-400 to-yellow-600' },
    medium: { main: '#f97316', light: '#fff7ed', gradient: 'from-orange-500 to-orange-700' },
    high: { main: '#ef4444', light: '#fef2f2', gradient: 'from-red-500 to-red-700' },
    critical: { main: '#dc2626', light: '#fef2f2', gradient: 'from-red-600 to-red-900' },
  }

  const color = riskColors[riskLevel] || riskColors.safe
  const circumference = 2 * Math.PI * 80
  const progress = Math.max(0, Math.min(1, score / 100))
  const strokeDashoffset = circumference * (1 - progress)

  const riskLabels = {
    safe: 'SAFE',
    low: 'CAUTION',
    medium: 'SUSPICIOUS',
    high: 'HIGH RISK',
    critical: 'CRITICAL',
  }

  const riskIcons = {
    safe: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="risk-icon">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    low: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="risk-icon">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    medium: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="risk-icon">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    high: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="risk-icon">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    critical: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="risk-icon">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
  }

  const scale = size / 220

  return (
    <div className="risk-gauge-container" style={{ width: size, height: size }}>
      <svg className="risk-gauge" viewBox="0 0 200 200" style={{ transform: `scale(${scale})` }}>
        <defs>
          <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color.main} />
            <stop offset="100%" stopColor={color.main} stopOpacity="0.6" />
          </linearGradient>
        </defs>
        <circle className="gauge-bg" cx="100" cy="100" r="80" fill="none" strokeWidth="16" stroke="#1e293b" />
        <circle
          className="gauge-fill"
          cx="100"
          cy="100"
          r="80"
          fill="none"
          strokeWidth="16"
          stroke="url(#gauge-gradient)"
          strokeDasharray={circumference}
          strokeDashoffset={animated ? strokeDashoffset : circumference}
          strokeLinecap="round"
          style={{
            transition: animated ? 'stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
            transform: 'rotate(-90deg)',
            transformOrigin: '100px 100px',
          }}
        />
      </svg>
      <div className="gauge-content" style={{ transform: `scale(${scale})` }}>
        {riskIcons[riskLevel]}
        <div className="risk-label" style={{ color: color.main }}>
          {riskLabels[riskLevel]}
        </div>
        <div className="risk-score" style={{ color: color.main }}>
          {score}<span className="score-max">/100</span>
        </div>
        {label && <p className="risk-description">{label}</p>}
      </div>
    </div>
  )
}