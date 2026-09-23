import React, { useState } from 'react'

const RISK_ICONS = {
  safe: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  low: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
  medium: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
  high: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  critical: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>,
}

export default function SecurityCopilot({ results }) {
  const [activeQuestion, setActiveQuestion] = useState('why-flagged')
  const [expanded, setExpanded] = useState(true)

  if (!results) return null

  const riskLevel = results.risk_level || 'safe'
  const score = results.risk_score || 0
  const evidence = Array.isArray(results.evidence) ? results.evidence : []
  const categories = Array.isArray(results.categories_triggered) ? results.categories_triggered : []
  const guidance = Array.isArray(results.guidance) ? results.guidance : []

  const questions = [
    {
      id: 'why-flagged',
      label: 'Why was this flagged?',
      answer: () => {
        if (riskLevel === 'safe') {
          return 'This conversation was not flagged. No known scam patterns were detected in the transcript.'
        }
        const catDesc = categories.length > 0 ? categories.map(c => `• ${c}`).join('\n') : '• Suspicious call pattern'
        return `This call was flagged as **${riskLevel.toUpperCase()}** (${score}/100) because the following scam indicators were detected:\n\n${catDesc}\n\nEach indicator corresponds to a deterministic rule matched in the transcript with a specific weight contributing to the total score.`
      }
    },
    {
      id: 'what-obtain',
      label: 'What did the caller try to obtain?',
      answer: () => {
        if (evidence.length === 0) {
          return 'No specific data extraction attempts were detected.'
        }
        const explanations = {
          'OTP/PIN Request': 'Your OTP, PIN, or authentication password',
          'Card Detail Phishing': 'Your debit/credit card number, CVV, or banking credentials',
          'Remote Access': 'Control of your device via remote access software (AnyDesk/TeamViewer)',
          'UPI/Payment Scam': 'Money transfers or fraudulent UPI collect approvals',
          'Fake KYC': 'Your Aadhaar, PAN, or identity documents',
          'Impersonation': 'Your trust by pretending to be an authority or bank official',
          'Urgency/Threats': 'Coercion to take rushed action without independent verification',
          'Prize/Job Scam': 'Upfront fees for non-existent rewards or work-from-home tasks',
          'Suspicious Link': 'Clicking phishing links or installing untrusted APKs'
        }
        const seen = new Set()
        const targets = []
        evidence.forEach(e => {
          const desc = explanations[e.category] || e.category
          if (!seen.has(desc)) {
            seen.add(desc)
            targets.push(desc)
          }
        })
        return `Based on the detected patterns, the caller appeared to be trying to obtain:\n\n${targets.map(t => `• ${t}`).join('\n')}`
      }
    },
    {
      id: 'what-do',
      label: 'What should I do now?',
      answer: () => {
        if (riskLevel === 'safe') {
          return 'No immediate action required. This conversation appears legitimate. As always, verify any unexpected financial requests independently through official channels.'
        }
        const actions = guidance.length > 0
          ? guidance.map((g, i) => `${i + 1}. ${g}`).join('\n')
          : '1. Hang up immediately\n2. Do not share any personal or banking credentials\n3. Contact the organization directly using official contact details\n4. Report the call at cybercrime.gov.in or call 1930'
        return `**Immediate recommended actions:**\n\n${actions}`
      }
    },
    {
      id: 'definitely-scam',
      label: 'Is this definitely a scam?',
      answer: () => {
        if (riskLevel === 'safe') {
          return 'The analysis found no scam indicators, but this does not guarantee the call was completely benign. Always exercise normal caution.'
        }
        const confidence = results.confidence_note ? `\n\n**Note:** ${results.confidence_note}` : ''
        return `**This analysis is a risk indicator, not a definitive legal verdict.**\n\nThe risk engine uses deterministic pattern matching against known scam tactics. A high score means the conversation contains language patterns strongly associated with scams, but:\n\n• Legitimate calls may occasionally trigger patterns (false positives)\n• Novel scam tactics may not be in our pattern database (false negatives)\n• Context matters — the same phrase could be legitimate in a different situation\n\n${confidence}\n\n**Always verify independently** by calling the official number on your card, statement, or the organization's verified website.`
      }
    },
    {
      id: 'protect-self',
      label: 'How can I protect myself?',
      answer: () => {
        return `**General protection measures:**\n\n• **Never share OTP, PIN, CVV, or passwords** — no legitimate bank asks for these\n• **Never install remote access apps** (AnyDesk, TeamViewer) at a caller's request\n• **Never send money to "receive" a refund or prize**\n• **Verify independently** — hang up and call the official number on your card\n• **Report suspicious calls** at cybercrime.gov.in or call 1930\n\n**For this specific call type:**\n${getSpecificAdvice(categories)}`
      }
    }
  ]

  function getSpecificAdvice(cats) {
    const advice = {
      'OTP/PIN Request': 'If you shared an OTP, immediately change your banking password and contact your bank\nMonitor your accounts for unauthorized transactions',
      'Card Detail Phishing': 'Block your card immediately via your bank app\nRequest a new card with new numbers',
      'Remote Access': 'Uninstall the remote access software immediately\nRun a security scan on your device\nChange all passwords from a clean device',
      'UPI/Payment Scam': 'Do not approve any unknown UPI collect requests\nIf money was sent, contact your bank and UPI app support immediately',
      'Fake KYC': 'KYC is only done in-branch or inside official banking apps\nNever send document photos to unknown callers',
      'Impersonation': 'Government agencies send official notices by post, not random calls\nCall the official helpline to verify any claim',
    }
    const catList = Array.isArray(cats) ? cats : []
    const lines = catList.flatMap(c => advice[c]?.split('\n') || []).filter(Boolean)
    if (lines.length > 0) {
      return lines.map(a => `• ${a}`).join('\n')
    }
    return '• Apply the general defensive protocols above'
  }

  if (!expanded) {
    return (
      <div className="copilot-collapsed" onClick={() => setExpanded(true)}>
        <div className="copilot-avatar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div className="copilot-text">
          <strong>Security Copilot</strong>
          <span>Deterministic local security assistant · Click to expand</span>
        </div>
      </div>
    )
  }

  const selectedQuestion = questions.find(q => q.id === activeQuestion) || questions[0]

  return (
    <div className="copilot-expanded">
      <div className="copilot-header">
        <div className="copilot-identity">
          <div className="copilot-avatar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <strong>Security Copilot</strong>
            <span className="copilot-subtitle">Rule-based on-device assistant</span>
          </div>
        </div>
        <button className="copilot-close" onClick={() => setExpanded(false)} aria-label="Minimize Copilot">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="copilot-summary">
        <div className={`risk-pill risk-${riskLevel}`}>
          {RISK_ICONS[riskLevel] || RISK_ICONS.safe}
          <span>{riskLevel.toUpperCase()} · {score}/100</span>
        </div>
        <div className="copilot-context">
          <span>{evidence.length} evidence signal{evidence.length !== 1 ? 's' : ''}</span>
          <span>•</span>
          <span>{categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}</span>
          <span>•</span>
          <span className="copilot-badge-local">Deterministic Engine</span>
        </div>
      </div>

      <div className="copilot-questions">
        {questions.map(q => (
          <button
            key={q.id}
            className={`copilot-question ${activeQuestion === q.id ? 'active' : ''}`}
            onClick={() => setActiveQuestion(activeQuestion === q.id ? null : q.id)}
          >
            <span className="question-label">{q.label}</span>
            <svg className={`chevron ${activeQuestion === q.id ? 'open' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        ))}
      </div>

      {activeQuestion && selectedQuestion && (
        <div className="copilot-answer">
          <div className="answer-content">
            {selectedQuestion.answer().split('\n').map((line, i) => (
              <p key={i} className={line.startsWith('•') || line.match(/^\d+\./) ? 'answer-bullet' : 'answer-text'}>
                {line}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
