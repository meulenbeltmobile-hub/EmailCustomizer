import { useState } from 'react'
import { applyTpl } from '../utils/helpers.js'

export default function ViewCustomModal({ open, onClose, onEdit, onOpenAll, customEmail, recipients }) {
  const [selectedIdx, setSelectedIdx] = useState(-1)

  const recipient = selectedIdx >= 0 ? recipients[selectedIdx] : null
  const subject = recipient ? applyTpl(customEmail.subject, recipient) : customEmail.subject
  const body = recipient ? applyTpl(customEmail.body, recipient) : customEmail.body

  return (
    <div className={`modal-overlay${open ? ' open' : ''}`} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 640, maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexShrink: 0 }}>
          <p className="modal-title">Customized email</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => { onClose(); onEdit() }}>Edit</button>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose} title="Close">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg>
            </button>
          </div>
        </div>
        <p className="modal-sub" style={{ marginBottom: 12 }}>Your personalized template ready to use. Switch to a recipient below to preview their version.</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexShrink: 0 }}>
          <label style={{ fontSize: 12, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>Preview for:</label>
          <select value={selectedIdx} onChange={e => setSelectedIdx(+e.target.value)} style={{ fontSize: 13, fontFamily: 'var(--sans)', background: 'var(--paper-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '5px 10px', color: 'var(--ink)', flex: 1 }}>
            <option value={-1}>— raw template (with placeholders) —</option>
            {recipients.map((r, i) => <option key={i} value={i}>{r.name}{r.email ? ' · ' + r.email : ''}</option>)}
          </select>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ background: 'var(--paper-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 4 }}>Subject</div>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>{subject}</div>
          </div>
          <div style={{ background: 'var(--paper-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6 }}>Body</div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{body}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12, flexShrink: 0 }}>
          <button className="btn btn-primary" onClick={() => { onClose(); onOpenAll() }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 3h7v10H6M2 8h8M7 5l3 3-3 3"/></svg>
            Save all to Gmail Drafts
          </button>
        </div>
      </div>
    </div>
  )
}
