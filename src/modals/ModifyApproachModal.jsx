import { useState, useEffect } from 'react'
import { showToast } from '../components/Toast.jsx'

export default function ModifyApproachModal({ open, onClose, onSave, approach = '' }) {
  const [text, setText] = useState('')

  useEffect(() => {
    if (open) setText(approach)
  }, [open, approach])

  function save() {
    onSave(text)
    onClose()
    showToast('Approach updated', 'success')
  }

  return (
    <div className={`modal-overlay${open ? ' open' : ''}`} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 860, maxHeight: '94vh', display: 'flex', flexDirection: 'column' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexShrink: 0 }}>
          <p className="modal-title">Modify approach</p>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg>
          </button>
        </div>
        <p className="modal-sub" style={{ marginBottom: 14 }}>Review and edit the sales approach text below.</p>

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          style={{
            flex: 1,
            minHeight: 420,
            fontFamily: 'var(--sans)',
            fontSize: 13,
            lineHeight: 1.8,
            color: 'var(--ink)',
            background: 'var(--paper-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '14px 16px',
            resize: 'vertical',
            boxSizing: 'border-box',
            width: '100%',
            marginBottom: 14
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            Save changes
          </button>
        </div>
      </div>
    </div>
  )
}
