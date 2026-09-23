import React, { useState } from 'react'
import { SCAM_LIBRARY } from '../data/scamLibraryData'

const SEVERITY_COLORS = {
  Critical: '#dc2626',
  High: '#ef4444',
  Medium: '#f97316',
  Low: '#f59e0b',
}

export default function ScamLibraryView() {
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('all')

  const categories = ['all', 'Credentials', 'Extortion', 'Identity Phishing', 'Malware / Device Control', 'Financial Fraud', 'Advance Fee', 'Employment Fraud']

  const filteredScams = SCAM_LIBRARY.filter(scam => {
    const matchesCategory = activeTab === 'all' || scam.category.toLowerCase().includes(activeTab.toLowerCase())
    const matchesSearch = !searchTerm || (
      scam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scam.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scam.redFlags.some(f => f.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    return matchesCategory && matchesSearch
  })

  return (
    <div className="scam-library-view">
      <header className="view-header">
        <h1>Scam Knowledge Center</h1>
        <p className="subtitle">Reference database of social engineering patterns, red flags, and defensive protocols</p>
      </header>

      <div className="library-controls">
        <div className="library-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search scam types, red flag phrases, tactics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="search-clear" onClick={() => setSearchTerm('')}>×</button>
          )}
        </div>

        <div className="library-filter-tabs">
          {['all', 'Credentials', 'Financial Fraud', 'Extortion', 'Identity Phishing'].map(cat => (
            <button
              key={cat}
              className={`filter-tab ${activeTab === cat ? 'active' : ''}`}
              onClick={() => setActiveTab(cat)}
            >
              {cat === 'all' ? 'All Guides (10)' : cat}
            </button>
          ))}
        </div>
      </div>

      <div className="scam-grid">
        {filteredScams.map(scam => (
          <div
            key={scam.id}
            className={`scam-card ${selectedCategory?.id === scam.id ? 'expanded' : ''}`}
            onClick={() => setSelectedCategory(selectedCategory?.id === scam.id ? null : scam)}
          >
            <div className="scam-card-top">
              <div className="scam-card-badges">
                <span
                  className="severity-badge"
                  style={{
                    backgroundColor: (SEVERITY_COLORS[scam.severity] || '#64748b') + '20',
                    color: SEVERITY_COLORS[scam.severity] || '#64748b',
                    borderColor: SEVERITY_COLORS[scam.severity] || '#64748b'
                  }}
                >
                  {scam.severity.toUpperCase()}
                </span>
                <span className="category-tag">{scam.category}</span>
              </div>
              <svg
                className={`expand-chevron ${selectedCategory?.id === scam.id ? 'open' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            <h3 className="scam-title">{scam.title}</h3>
            <p className="scam-summary">{scam.summary}</p>

            {selectedCategory?.id === scam.id && (
              <div className="scam-detail" onClick={(e) => e.stopPropagation()}>
                <div className="scam-section">
                  <h4>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Common Warning Signs & Red Flags
                  </h4>
                  <ul className="scam-bullets red-bullets">
                    {scam.redFlags.map((flag, idx) => (
                      <li key={idx}>{flag}</li>
                    ))}
                  </ul>
                </div>

                <div className="scam-section">
                  <h4>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    What Scammers Try to Extract
                  </h4>
                  <div className="not-share-tags">
                    {scam.whatNotToShare.map((item, idx) => (
                      <span key={idx} className="not-share-tag">{item}</span>
                    ))}
                  </div>
                </div>

                <div className="scam-section">
                  <h4>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Defensive Actions & Next Steps
                  </h4>
                  <ul className="scam-bullets green-bullets">
                    {scam.defensiveActions.map((action, idx) => (
                      <li key={idx}>{action}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
