import { useState } from 'react'

export default function Topbar({ recipientCount, totalRecipientCount, hasRecipients, onOpenAll, onConfig, configConnected, gmailConnected, gmailEmail }) {
  const [sending, setSending] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const isFiltered = totalRecipientCount > 0 && recipientCount !== totalRecipientCount

  function handleOpenAll() {
    if (recipientCount > 10) {
      setShowWarning(true)
      return
    }
    launch()
  }

  function launch() {
    setShowWarning(false)
    setSending(true)
    onOpenAll().finally(() => setSending(false))
  }

  return (
    <>
      <header className="topbar">
        <div className="logo">
          <span className="logo-dot" />
          EmailCustomizer
        </div>
        <div className="topbar-actions">
          <span className="badge badge-neutral" title={isFiltered ? `${totalRecipientCount} total` : ''}>
            {recipientCount}{isFiltered ? <span style={{ opacity: 0.5, fontWeight: 400 }}> / {totalRecipientCount}</span> : null} recipient{recipientCount !== 1 ? 's' : ''}
          </span>
          {sending
            ? <button className="btn btn-ghost btn-sm" disabled style={{ color: 'var(--ink-3)' }}>
                <span className="spinner" style={{ width: 11, height: 11 }} /> Saving drafts…
              </button>
            : <button className="btn btn-primary btn-sm" onClick={handleOpenAll} disabled={!hasRecipients}>
                Save all to Gmail Drafts
              </button>
          }
          <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 2px' }} />
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onConfig} title="Gmail configuration" style={{ position: 'relative' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            {configConnected && (
              <span style={{ position: 'absolute', top: 5, right: 5, width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', border: '1.5px solid var(--paper)' }} />
            )}
          </button>
          {gmailConnected && (
            <span style={{ fontSize: 11, color: 'var(--ink-3)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={gmailEmail}>
              <span style={{ fontWeight: 600, color: 'var(--ink-2)' }}>{gmailEmail?.split('@')[0]}</span>
              <span style={{ opacity: 0.6 }}>@{gmailEmail?.split('@')[1]}</span>
            </span>
          )}
        </div>
      </header>

      {/* Warning dialog */}
      {showWarning && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px 28px', width: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink)', margin: 0 }}>Large batch</p>
            </div>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: 20 }}>
              You are about to save <strong>{recipientCount} Gmail drafts</strong>. This may take a few seconds. Continue?
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setShowWarning(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={launch}>
                Save {recipientCount} drafts
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
