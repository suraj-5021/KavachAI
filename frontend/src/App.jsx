import React, { useState, useEffect } from 'react'
import RiskGauge from './components/RiskGauge'
import EvidenceCard from './components/EvidenceCard'
import TranscriptViewer from './components/TranscriptViewer'
import SecurityCopilot from './components/SecurityCopilot'
import HistoryView from './components/HistoryView'
import ScamLibraryView from './components/ScamLibraryView'
import InsightsView from './components/InsightsView'
import './styles/global.css'

const API_BASE = 'http://127.0.0.1:8000'

function App() {
  const [activeView, setActiveView] = useState('dashboard') // dashboard | analyze | results | technical | history | library | insights
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [backendHealth, setBackendHealth] = useState(null)
  const [highlightedEvidence, setHighlightedEvidence] = useState(null)

  // Check backend health on mount
  useEffect(() => {
    checkBackendHealth()
  }, [])

  const checkBackendHealth = async () => {
    try {
      const response = await fetch(`${API_BASE}/health`)
      if (response.ok) {
        const data = await response.json()
        setBackendHealth(data)
      }
    } catch (err) {
      console.error('Backend health check failed:', err)
    }
  }

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError(null)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragging(true)
  }

  const handleDragLeave = () => {
    setDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      setFile(droppedFile)
      setError(null)
    }
  }

  const handleAnalyze = async () => {
    if (!file) return

    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Analysis failed: ${response.statusText}`)
      }

      const data = await response.json()
      setResults(data)
      setActiveView('results')

      // Save to history
      saveToHistory(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setResults(null)
    setError(null)
    setActiveView('analyze')
  }

  const handleDeleteSession = async () => {
    if (!results?.session_id) return

    try {
      await fetch(`${API_BASE}/session/${results.session_id}`, {
        method: 'DELETE',
      })
      handleReset()
    } catch (err) {
      console.error('Delete session failed:', err)
    }
  }

  const saveToHistory = (analysisData) => {
    try {
      const history = JSON.parse(localStorage.getItem('kavachai_history') || '[]')
      const entry = {
        id: analysisData.session_id,
        session_id: analysisData.session_id,
        timestamp: Date.now(),
        risk_level: analysisData.risk_level,
        risk_score: analysisData.risk_score,
        duration: analysisData.audio_duration_sec,
        audio_duration_sec: analysisData.audio_duration_sec,
        evidence_count: analysisData.evidence ? analysisData.evidence.length : 0,
        evidence: analysisData.evidence || [],
        categories_triggered: analysisData.categories_triggered || [],
        guidance: analysisData.guidance || [],
        language: analysisData.language || 'auto',
        transcript: analysisData.transcript || '',
        confidence_note: analysisData.confidence_note || '',
        technical_info: analysisData.technical_info || null,
        latency_ms: analysisData.latency_ms || 0,
      }
      history.unshift(entry)
      // Keep only last 50 entries
      localStorage.setItem('kavachai_history', JSON.stringify(history.slice(0, 50)))
    } catch (err) {
      console.error('Failed to save to history:', err)
    }
  }

  const handleSelectAnalysis = (item) => {
    setResults({
      session_id: item.session_id || item.id || '',
      transcript: item.transcript || '',
      language: item.language || 'auto',
      audio_duration_sec: item.audio_duration_sec ?? item.duration ?? 0,
      risk_score: item.risk_score ?? 0,
      risk_level: item.risk_level || 'safe',
      evidence: item.evidence || [],
      categories_triggered: item.categories_triggered || [],
      guidance: item.guidance || [],
      confidence_note: item.confidence_note || '',
      technical_info: item.technical_info || {
        model: 'whisper-base',
        provider: 'CPU fallback',
        transcribe_latency_ms: 0,
        total_latency_ms: 0,
        audio_duration_sec: item.audio_duration_sec ?? item.duration ?? 0,
      },
      latency_ms: item.latency_ms ?? 0,
    })
    setActiveView('results')
  }

  const handleClearHistory = () => {
    // History cleared - no specific action needed, HistoryView handles it
  }

  const getHistory = () => {
    try {
      return JSON.parse(localStorage.getItem('kavachai_history') || '[]')
    } catch {
      return []
    }
  }

  const getRiskDescription = (level, score) => {
    if (level === 'safe') return 'No suspicious scam indicators detected'
    if (level === 'low') return 'Minimal risk indicators present'
    if (level === 'medium') return 'Some suspicious patterns detected'
    if (level === 'high') return 'Multiple scam indicators found'
    if (level === 'critical') return 'High-confidence scam call detected'
    return 'Analysis complete'
  }

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    return date.toLocaleDateString()
  }

  return (
    <div className="app-container">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="navbar-content">
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="navbar-brand">
            <svg className="brand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="brand-name">KavachAI</span>
          </div>
          <div className="navbar-status">
            <span className={`status-indicator ${backendHealth?.model_loaded ? 'active' : 'inactive'}`}>
              <span className="status-dot"></span>
              <span className="status-text">Local Processing</span>
            </span>
          </div>
        </div>
      </nav>

      <div className="app-layout">
        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <nav className="sidebar-nav">
            <button
              className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveView('dashboard')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>Dashboard</span>
            </button>
            <button
              className={`nav-item ${activeView === 'analyze' ? 'active' : ''}`}
              onClick={() => setActiveView('analyze')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <span>Analyze Call</span>
            </button>
            <button
              className={`nav-item ${activeView === 'history' ? 'active' : ''}`}
              onClick={() => setActiveView('history')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>History</span>
            </button>
            <button
              className={`nav-item ${activeView === 'library' ? 'active' : ''}`}
              onClick={() => setActiveView('library')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span>Scam Library</span>
            </button>
            <button
              className={`nav-item ${activeView === 'insights' ? 'active' : ''}`}
              onClick={() => setActiveView('insights')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Insights</span>
            </button>
            <button
              className={`nav-item ${activeView === 'privacy' ? 'active' : ''}`}
              onClick={() => setActiveView('privacy')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Privacy</span>
            </button>
          </nav>
          <div className="sidebar-footer">
            <div className="system-status">
              <div className="status-header">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>System Status</span>
              </div>
              <div className="status-items">
                <div className="status-item">
                  <span className={`status-dot ${backendHealth?.status === 'ok' ? 'active' : 'inactive'}`}></span>
                  <span>Backend {backendHealth?.status === 'ok' ? 'Online' : 'Offline'}</span>
                </div>
                <div className="status-item">
                  <span className={`status-dot ${backendHealth?.model_loaded ? 'active' : 'inactive'}`}></span>
                  <span>Whisper {backendHealth?.model_loaded ? 'Loaded' : 'Loading'}</span>
                </div>
                <div className="status-item">
                  <span className="status-dot active"></span>
                  <span>Local Processing</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          {error && (
            <div className="alert alert-error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <strong>Analysis Error</strong>
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* Dashboard View */}
          {activeView === 'dashboard' && (
            <div className="dashboard-view">
              <header className="view-header">
                <div>
                  <h1>Welcome to KavachAI</h1>
                  <p className="subtitle">Your conversation. Your device. Your protection.</p>
                </div>
              </header>

              <div className="dashboard-grid">
                {/* Protection Status */}
                <div className="dashboard-card card-primary">
                  <div className="card-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                    </svg>
                  </div>
                  <div className="card-content">
                    <h2>Protected</h2>
                    <p>Local AI security active</p>
                    <div className="card-badges">
                      <span className="badge badge-success">On-Device</span>
                      <span className="badge badge-info">No Cloud</span>
                    </div>
                  </div>
                </div>

                {/* Quick Action */}
                <div className="dashboard-card card-action" onClick={() => setActiveView('analyze')}>
                  <div className="card-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <div className="card-content">
                    <h2>Analyze a Conversation</h2>
                    <p>Upload audio to detect scam patterns</p>
                    <button className="btn-cta">
                      Start Analysis →
                    </button>
                  </div>
                </div>

                {/* Recent Analysis */}
                {(() => {
                  const history = getHistory()
                  const latest = history[0]
                  return latest ? (
                    <div
                      className="dashboard-card card-recent"
                      onClick={() => handleSelectAnalysis(latest)}
                      style={{ cursor: 'pointer' }}
                      title="Click to view full analysis"
                    >
                      <div className="card-header-flex">
                        <h3>Last Analysis</h3>
                        <span className="view-link">View Analysis →</span>
                      </div>
                      <div className={`risk-badge-inline risk-${latest.risk_level}`}>
                        {latest.risk_level.toUpperCase()}
                      </div>
                      <div className="recent-score">{latest.risk_score}/100</div>
                      <div className="recent-meta">
                        <span>{latest.evidence_count} signals</span>
                        <span>•</span>
                        <span>{latest.duration}s audio</span>
                        <span>•</span>
                        <span>{formatTimestamp(latest.timestamp)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="dashboard-card card-empty">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p>No analysis history yet</p>
                    </div>
                  )
                })()}

                {/* Privacy Center */}
                <div className="dashboard-card card-privacy">
                  <h3>Privacy Center</h3>
                  <div className="privacy-list">
                    <div className="privacy-item">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Audio processed locally</span>
                    </div>
                    <div className="privacy-item">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>No cloud transcription</span>
                    </div>
                    <div className="privacy-item">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Local risk analysis</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Analyze View */}
          {activeView === 'analyze' && !loading && !results && (
            <div className="analyze-view">
              <header className="view-header">
                <h1>Analyze a Conversation</h1>
                <p className="subtitle">Upload an audio recording to detect potential scam indicators</p>
              </header>

              <div
                className={`upload-zone ${dragging ? 'dragging' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-input').click()}
              >
                <div className="upload-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <h2>Drop an audio recording here</h2>
                <p>or choose a file from your device</p>
                <button className="btn-secondary" onClick={(e) => {
                  e.stopPropagation()
                  document.getElementById('file-input').click()
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Choose Audio
                </button>
                <div className="upload-formats">
                  <span>WAV</span>
                  <span>•</span>
                  <span>MP3</span>
                  <span>•</span>
                  <span>M4A</span>
                </div>
                <input
                  id="file-input"
                  type="file"
                  accept="audio/*"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </div>

              {file && (
                <div className="file-selected-card">
                  <div className="file-info">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    <div>
                      <p className="file-name">{file.name}</p>
                      <p className="file-size">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button className="btn-primary btn-large" onClick={handleAnalyze}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Analyze Audio
                  </button>
                </div>
              )}

              <div className="privacy-assurance">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Processed locally on your device</span>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="loading-view">
              <div className="loading-card">
                <div className="loading-spinner-wrapper">
                  <svg className="loading-spinner" viewBox="0 0 50 50">
                    <circle className="spinner-track" cx="25" cy="25" r="20" fill="none" strokeWidth="4"></circle>
                    <circle className="spinner-head" cx="25" cy="25" r="20" fill="none" strokeWidth="4"></circle>
                  </svg>
                </div>
                <h2>Analyzing Conversation</h2>
                <p>Processing audio locally on your device</p>
                <div className="loading-steps">
                  <div className="loading-step">
                    <div className="step-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </div>
                    <span>Speech Recognition</span>
                  </div>
                  <div className="loading-step">
                    <div className="step-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <span>Security Analysis</span>
                  </div>
                  <div className="loading-step">
                    <div className="step-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <span>Risk Assessment</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Results View */}
          {activeView === 'results' && results && (
            <div className="results-view">
              <div className="results-header">
                <h1>Security Assessment</h1>
                <div className="results-actions">
                  <button className="btn-secondary" onClick={handleReset}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Analyze Another
                  </button>
                  <button className="btn-secondary" onClick={() => setActiveView('technical')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Technical Proof
                  </button>
                </div>
              </div>

              <div className="risk-overview-section">
                <RiskGauge
                  score={results.risk_score}
                  riskLevel={results.risk_level}
                  label={getRiskDescription(results.risk_level, results.risk_score)}
                  size={240}
                  animated={true}
                />
                <div className="risk-meta-info">
                  <div className="meta-stat">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{results.audio_duration_sec}s audio</span>
                  </div>
                  <div className="meta-stat">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>Processed locally</span>
                  </div>
                </div>
              </div>

              <div className="results-content">
                {/* Evidence Section */}
                <section className="result-section">
                  <div className="section-header">
                    <h2>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Why This Was Flagged
                    </h2>
                    {results.evidence.length > 0 && (
                      <span className="badge badge-count">{results.evidence.length} signals</span>
                    )}
                  </div>
                  <EvidenceCard
                    evidence={results.evidence}
                    onHighlight={setHighlightedEvidence}
                  />
                </section>

                {/* Transcript Section */}
                <section className="result-section">
                  <TranscriptViewer
                    transcript={results.transcript}
                    evidence={results.evidence}
                    language={results.language}
                    duration={results.audio_duration_sec}
                    onHighlight={setHighlightedEvidence}
                  />
                </section>

                {/* Security Copilot Section */}
                <section className="result-section">
                  <SecurityCopilot results={results} />
                </section>

                {/* Guidance Section */}
                {results.guidance && results.guidance.length > 0 && (
                  <section className="result-section">
                    <div className="section-header">
                      <h2>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        What Should You Do?
                      </h2>
                    </div>
                    <div className="guidance-grid">
                      {results.guidance.map((g, idx) => (
                        <div key={idx} className="guidance-item">
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p>{g}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Confidence Note */}
                {results.confidence_note && (
                  <div className="info-banner">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p>{results.confidence_note}</p>
                  </div>
                )}

                {/* Delete Session */}
                <div className="result-actions">
                  <button className="btn-danger" onClick={handleDeleteSession}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete Session
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Technical Proof View */}
          {activeView === 'technical' && results && (
            <div className="technical-view">
              <div className="results-header">
                <div>
                  <h1>Technical Proof</h1>
                  <p className="subtitle">Real-time execution telemetry and runtime environment verification</p>
                </div>
                <button className="btn-secondary" onClick={() => setActiveView('results')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Results
                </button>
              </div>

              <div className="technical-grid">
                <div className="tech-card">
                  <div className="tech-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                  </div>
                  <div className="tech-label">AI Model & Size</div>
                  <div className="tech-value">{results.technical_info.model} ({results.technical_info.model_format || 'ONNX'}, {results.technical_info.model_size_mb || 666.3} MB)</div>
                </div>
                <div className="tech-card">
                  <div className="tech-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="tech-label">Execution Provider</div>
                  <div className="tech-value">{results.technical_info.active_provider || 'CPUExecutionProvider'} ({results.technical_info.provider || 'CPU fallback'})</div>
                </div>
                <div className="tech-card">
                  <div className="tech-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div className="tech-label">NPU Active</div>
                  <div className="tech-value">{results.technical_info.is_npu ? 'true (Active)' : 'false (CPU Execution)'}</div>
                </div>
                <div className="tech-card">
                  <div className="tech-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <div className="tech-label">Audio Duration</div>
                  <div className="tech-value">{results.technical_info.audio_duration_sec}s</div>
                </div>
                <div className="tech-card">
                  <div className="tech-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="tech-label">Transcription Latency</div>
                  <div className="tech-value">{results.technical_info.transcribe_latency_ms}ms</div>
                </div>
                <div className="tech-card">
                  <div className="tech-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="tech-label">Total Latency</div>
                  <div className="tech-value">{results.technical_info.total_latency_ms}ms</div>
                </div>
                <div className="tech-card">
                  <div className="tech-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div className="tech-label">Real-Time Factor (RTF)</div>
                  <div className="tech-value">{results.technical_info.rtf !== undefined ? results.technical_info.rtf : ((results.technical_info.transcribe_latency_ms / 1000) / Math.max(results.technical_info.audio_duration_sec, 0.001)).toFixed(3)}</div>
                </div>
                <div className="tech-card">
                  <div className="tech-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="tech-label">Host Hardware & OS</div>
                  <div className="tech-value" style={{ fontSize: '0.95rem', wordBreak: 'break-word' }}>{results.technical_info.processor || results.technical_info.platform || 'x86_64'}</div>
                </div>
                <div className="tech-card">
                  <div className="tech-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </div>
                  <div className="tech-label">ONNX EP Chain</div>
                  <div className="tech-value" style={{ fontSize: '0.95rem' }}>{(results.technical_info.available_providers || ['CPUExecutionProvider']).join(', ')}</div>
                </div>
              </div>

              <div className="pipeline-section">
                <h2>Snapdragon Deployment Readiness</h2>
                <div className="info-banner" style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p><strong>Deployment Status:</strong> Snapdragon QNN deployment prepared — hardware validation pending. Current hardware running on CPUExecutionProvider (CPU fallback).</p>
                </div>

                <h2>On-Device AI Pipeline</h2>
                <div className="pipeline-flow">
                  <div className="pipeline-step">
                    <div className="pipeline-icon">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </div>
                    <span>Audio Input</span>
                    <div className="pipeline-status">✓</div>
                  </div>
                  <div className="pipeline-arrow">→</div>
                  <div className="pipeline-step">
                    <div className="pipeline-icon">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                      </svg>
                    </div>
                    <span>Whisper ONNX</span>
                    <div className="pipeline-status">✓</div>
                  </div>
                  <div className="pipeline-arrow">→</div>
                  <div className="pipeline-step">
                    <div className="pipeline-icon">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <span>Scam Analysis</span>
                    <div className="pipeline-status">✓</div>
                  </div>
                  <div className="pipeline-arrow">→</div>
                  <div className="pipeline-step">
                    <div className="pipeline-icon">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <span>Risk Score</span>
                    <div className="pipeline-status">✓</div>
                  </div>
                </div>
                <div className="pipeline-note">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <p>All processing stages execute locally on device. No cloud transmission.</p>
                </div>
              </div>
            </div>
          )}

          {/* Privacy View */}
          {activeView === 'privacy' && (
            <div className="privacy-view">
              <header className="view-header">
                <h1>Privacy Center</h1>
                <p className="subtitle">Your data stays on your device</p>
              </header>

              <div className="privacy-grid">
                <div className="privacy-card-large">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <h3>Local Processing</h3>
                  <p>Audio and analysis remain on your device. No uploads to external servers.</p>
                </div>
                <div className="privacy-card-large">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                  <h3>No Cloud Transcription</h3>
                  <p>Speech recognition runs locally via Whisper ONNX. No external transcription service.</p>
                </div>
                <div className="privacy-card-large">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <h3>Local AI</h3>
                  <p>Inference runs using configured local runtime (ONNX Runtime).</p>
                </div>
              </div>

              <div className="privacy-section">
                <h2>How KavachAI Works</h2>
                <div className="privacy-flow">
                  <div className="flow-step">
                    <div className="flow-number">1</div>
                    <div className="flow-content">
                      <h4>Audio Upload</h4>
                      <p>Your audio file is loaded into memory locally</p>
                    </div>
                  </div>
                  <div className="flow-step">
                    <div className="flow-number">2</div>
                    <div className="flow-content">
                      <h4>Local Whisper</h4>
                      <p>Speech-to-text conversion using Whisper ONNX on your device</p>
                    </div>
                  </div>
                  <div className="flow-step">
                    <div className="flow-number">3</div>
                    <div className="flow-content">
                      <h4>Pattern Analysis</h4>
                      <p>Deterministic rule-based scam detection locally</p>
                    </div>
                  </div>
                  <div className="flow-step">
                    <div className="flow-number">4</div>
                    <div className="flow-content">
                      <h4>Risk Assessment</h4>
                      <p>Score calculated and displayed with evidence</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* History View */}
          {activeView === 'history' && (
            <HistoryView
              onSelectAnalysis={handleSelectAnalysis}
              onClearHistory={handleClearHistory}
            />
          )}

          {/* Scam Library View */}
          {activeView === 'library' && (
            <ScamLibraryView />
          )}

          {/* Insights View */}
          {activeView === 'insights' && (
            <InsightsView />
          )}
        </main>
      </div>
    </div>
  )
}

export default App
