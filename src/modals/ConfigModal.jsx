import { useState, useEffect } from 'react'
import { showToast } from '../components/Toast.jsx'
import { requestGmailToken, fetchGmailUser, fetchGmailSignature, GMAIL_USERS } from '../utils/gmailApi.js'

export default function ConfigModal({ open, onClose, gmailAuth, onGmailConnect, onGmailDisconnect }) {
  const [connecting, setConnecting] = useState(false)
  const [selectedUser, setSelectedUser] = useState(GMAIL_USERS[0].name)

  useEffect(() => {
    if (open) setConnecting(false)
  }, [open])

  return (
    <div className={`modal-overlay${open ? ' open' : ''}`} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 480 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <p className="modal-title">Gmail configuration</p>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose} title="Close">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg>
          </button>
        </div>
        <p className="modal-sub">Connect your Gmail account to save emails directly to your Drafts folder with your signature applied.</p>

        {/* Gmail OAuth connect */}
        <div style={{ marginBottom: '1rem', padding: '14px 16px', background: 'var(--paper-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 12 }}>Gmail account</div>

          {/* User selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--ink-3)', flexShrink: 0 }}>User:</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {GMAIL_USERS.map(u => (
                <button key={u.name} type="button"
                  onClick={() => { setSelectedUser(u.name); if (gmailAuth) onGmailDisconnect() }}
                  style={{ fontSize: 12, fontWeight: selectedUser === u.name ? 600 : 400, padding: '4px 14px', borderRadius: 99, border: `1px solid ${selectedUser === u.name ? 'var(--accent)' : 'var(--border)'}`, background: selectedUser === u.name ? 'var(--accent)' : 'var(--paper)', color: selectedUser === u.name ? '#fff' : 'var(--ink-2)', cursor: 'pointer', transition: 'all 0.12s' }}>
                  {u.name}
                </button>
              ))}
            </div>
          </div>

          {gmailAuth?.token ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--ink)', flex: 1 }}>{gmailAuth.email}</span>
              {gmailAuth.signature && (
                <span style={{ fontSize: 11, color: 'var(--ink-3)', background: 'var(--paper-3)', padding: '2px 8px', borderRadius: 99 }}>Signature loaded</span>
              )}
              <button className="btn btn-ghost btn-sm" onClick={onGmailDisconnect} style={{ fontSize: 11 }}>Disconnect</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--ink-3)', flex: 1 }}>Not connected — connect your account to save drafts</span>
              <button className="btn btn-primary btn-sm" onClick={async () => {
                setConnecting(true)
                try {
                  const user = GMAIL_USERS.find(u => u.name === selectedUser)
                  const r = await requestGmailToken(user.clientId)
                  const email = await fetchGmailUser(r.access_token)
                  const signature = await fetchGmailSignature(r.access_token)
                  onGmailConnect({ token: r.access_token, email, signature, userName: selectedUser, expiresAt: Date.now() + (r.expires_in || 3600) * 1000 })
                  showToast(`Connected as ${email}`, 'success')
                } catch (e) {
                  showToast('Connection failed: ' + e.message, 'error')
                }
                setConnecting(false)
              }} disabled={connecting}>
                {connecting
                  ? <><span className="spinner" style={{ width: 11, height: 11 }} /> Connecting…</>
                  : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg> Connect Gmail</>}
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}
