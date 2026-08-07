import { useState } from 'react'
import { scanBounces, scanLeftCompany } from '../utils/gmailSearch.js'

const PERIODS = [
  { label: '1 month',  value: 1 },
  { label: '3 months', value: 3 },
  { label: '6 months', value: 6 },
  { label: '1 year',   value: 12 },
]

function formatDate(raw) {
  if (!raw) return ''
  try { return new Date(raw).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return raw }
}

function ResultRow({ icon, email, subject, date, snippet }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px', background: 'var(--paper-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: 5 }}>
      <div style={{ flexShrink: 0, marginTop: 2 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', fontFamily: 'var(--mono)' }}>{email}</div>
        {subject && <div style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subject}</div>}
        {snippet && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{snippet}</div>}
      </div>
      {date && <div style={{ fontSize: 11, color: 'var(--ink-3)', flexShrink: 0, whiteSpace: 'nowrap' }}>{formatDate(date)}</div>}
    </div>
  )
}

function SectionHeader({ label, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>
      {label}
      <span style={{ background: count ? 'var(--accent-2)' : 'var(--paper-3)', color: count ? 'var(--accent)' : 'var(--ink-3)', borderRadius: 99, padding: '1px 8px', fontSize: 10, fontWeight: 700 }}>{count}</span>
    </div>
  )
}

export default function EmailErrorModal({ open, onClose, gmailToken }) {
  const [months, setMonths]         = useState(3)
  const [scanning, setScanning]     = useState(false)
  const [progress, setProgress]     = useState('')
  const [bounces, setBounces]       = useState(null)
  const [leftCompany, setLeftCompany] = useState(null)
  const [error, setError]           = useState('')

  async function scan() {
    setScanning(true)
    setError('')
    setBounces(null)
    setLeftCompany(null)
    try {
      const b = await scanBounces(gmailToken, months, setProgress)
      setBounces(b)
      const l = await scanLeftCompany(gmailToken, months, setProgress)
      setLeftCompany(l)
    } catch (e) {
      setError('Scan failed: ' + e.message)
    }
    setProgress('')
    setScanning(false)
  }

  function downloadCSV() {
    const rows = [
      ['Email', 'Type', 'Date', 'Subject', 'Snippet'],
      ...(bounces || []).map(r => [r.email, 'Delivery failed', r.date, r.subject, r.snippet]),
      ...(leftCompany || []).map(r => [r.email, 'Left company', r.date, r.subject, r.snippet]),
    ].map(row => row.map(v => `"${(v || '').replace(/"/g, '""')}"`).join(','))
    const csv = rows.join('\n')
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
      download: `email-errors-${new Date().toISOString().slice(0, 10)}.csv`,
    })
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const hasResults = bounces !== null || leftCompany !== null
  const totalFound = (bounces?.length || 0) + (leftCompany?.length || 0)

  const iconBounce = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
  const iconLeft = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2" strokeLinecap="round">
      <path d="M17 16l4-4-4-4"/><path d="M21 12H9"/>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    </svg>
  )

  if (!open) return null

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 620, maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexShrink: 0 }}>
          <p className="modal-title">Check email errors</p>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose} title="Close">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg>
          </button>
        </div>
        <p className="modal-sub">Scan your Gmail inbox for bounced emails and replies indicating someone has left their company.</p>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexShrink: 0 }}>
          <label style={{ fontSize: 12, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>Scan period:</label>
          <select value={months} onChange={e => setMonths(+e.target.value)} disabled={scanning}
            style={{ fontSize: 13, fontFamily: 'var(--sans)', background: 'var(--paper-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '5px 10px', color: 'var(--ink)' }}>
            {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" onClick={scan} disabled={scanning} style={{ marginLeft: 'auto' }}>
            {scanning
              ? <><span className="spinner" style={{ width: 11, height: 11 }} /> Scanning…</>
              : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Scan inbox</>}
          </button>
        </div>

        {/* Progress */}
        {progress && (
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 10, fontStyle: 'italic', flexShrink: 0 }}>{progress}</div>
        )}

        {/* Error */}
        {error && (
          <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 10, flexShrink: 0 }}>{error}</div>
        )}

        {/* Results */}
        {hasResults && (
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>

            {/* Delivery failures */}
            <div style={{ marginBottom: 18 }}>
              <SectionHeader label="Delivery failures" count={bounces?.length || 0} />
              {bounces?.length === 0
                ? <div style={{ fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic', padding: '4px 0 8px' }}>No delivery failures detected in this period.</div>
                : bounces.map((r, i) => <ResultRow key={i} icon={iconBounce} {...r} />)
              }
            </div>

            {/* Left company */}
            <div>
              <SectionHeader label="Left company" count={leftCompany?.length || 0} />
              {leftCompany?.length === 0
                ? <div style={{ fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic', padding: '4px 0 8px' }}>No "left company" messages detected in this period.</div>
                : leftCompany.map((r, i) => <ResultRow key={i} icon={iconLeft} {...r} />)
              }
            </div>
          </div>
        )}

        {/* Empty state before scan */}
        {!hasResults && !scanning && !error && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)', gap: 8, paddingBottom: 24 }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" style={{ opacity: 0.25 }}>
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <p style={{ fontSize: 13 }}>Select a period and click <strong>Scan inbox</strong> to begin.</p>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexShrink: 0, paddingTop: hasResults ? 12 : 0, borderTop: hasResults ? '1px solid var(--border)' : 'none', marginTop: hasResults ? 8 : 0 }}>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
          {hasResults && totalFound > 0 && (
            <button className="btn btn-primary" onClick={downloadCSV}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M2 10v3h12v-3M8 2v8M5 7l3 3 3-3"/>
              </svg>
              Download CSV ({totalFound})
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
