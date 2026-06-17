import { useState, useEffect } from 'react'
import { applyTpl } from '../utils/helpers.js'

const PLACEHOLDERS = ['{{firstname}}', '{{lastname}}', '{{name}}', '{{email}}', '{{company}}']

export default function ViewCustomModal({ open, onClose, onSave, onOpenAll, customEmail, selectedRecipients = [] }) {
  const src = customEmail || { subject: '', body: '', name: '' }

  const [name, setName]       = useState(src.name || '')
  const [subject, setSubject] = useState(src.subject || '')
  const [body, setBody]       = useState(src.body || '')
  const [previewIdx, setPreviewIdx] = useState(-1)
  const [dirty, setDirty]     = useState(false)

  useEffect(() => {
    if (open) {
      setName(src.name || '')
      setSubject(src.subject || '')
      setBody(src.body || '')
      setPreviewIdx(-1)
      setDirty(false)
    }
  }, [open, customEmail])

  function edit(field, value) {
    if (field === 'subject') setSubject(value)
    if (field === 'body') setBody(value)
    if (field === 'name') setName(value)
    setDirty(true)
  }

  function insertPh(ph) {
    const ta = document.getElementById('vcm-body')
    if (!ta) return
    const start = ta.selectionStart
    const end   = ta.selectionEnd
    const next = body.slice(0, start) + ph + body.slice(end)
    setBody(next)
    setDirty(true)
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + ph.length, start + ph.length) }, 0)
  }

  const recipient = previewIdx >= 0 ? selectedRecipients[previewIdx] : null
  const previewSubject = recipient ? applyTpl(subject, recipient) : subject
  const previewBody    = recipient ? applyTpl(body, recipient) : body

  function save() {
    onSave({ name, subject, body })
    setDirty(false)
  }

  if (!open) return null

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 720, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexShrink: 0 }}>
          <p className="modal-title">Customized email</p>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose} title="Close">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg>
          </button>
        </div>

        {/* Template name */}
        <div style={{ marginBottom: 12, flexShrink: 0 }}>
          <label className="field-label" style={{ marginBottom: 4 }}>Template name</label>
          <input className="field-input" value={name} onChange={e => edit('name', e.target.value)} placeholder="e.g. Q3 outreach — logistics" style={{ fontSize: 13 }} />
        </div>

        {/* Insert placeholders */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12, padding: '7px 10px', background: 'var(--paper-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: 'var(--ink-3)', marginRight: 4, lineHeight: '22px' }}>Insert:</span>
          {PLACEHOLDERS.map(ph => (
            <span key={ph} className="ph-chip" onClick={() => insertPh(ph)} style={{ cursor: 'pointer' }}>{ph}</span>
          ))}
        </div>

        {/* Preview recipient selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexShrink: 0 }}>
          <label style={{ fontSize: 12, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>Preview for:</label>
          <select value={previewIdx} onChange={e => setPreviewIdx(+e.target.value)}
            style={{ fontSize: 13, fontFamily: 'var(--sans)', background: 'var(--paper-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '5px 10px', color: 'var(--ink)', flex: 1 }}>
            <option value={-1}>— raw template (with placeholders) —</option>
            {selectedRecipients.map((r, i) => (
              <option key={i} value={i}>{r.name}{r.email ? ' · ' + r.email : ''}</option>
            ))}
          </select>
        </div>

        {/* Subject */}
        <div style={{ marginBottom: 10, flexShrink: 0 }}>
          <label className="field-label" style={{ marginBottom: 4 }}>Subject</label>
          {recipient ? (
            <div style={{ padding: '8px 12px', background: 'var(--paper-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--ink)', minHeight: 36 }}>
              {previewSubject}
            </div>
          ) : (
            <input className="field-input" value={subject} onChange={e => edit('subject', e.target.value)} style={{ fontSize: 13 }} />
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, marginBottom: 12 }}>
          <label className="field-label" style={{ marginBottom: 4 }}>Body</label>
          {recipient ? (
            <div style={{ flex: 1, padding: '10px 12px', background: 'var(--paper-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--ink-2)', whiteSpace: 'pre-wrap', lineHeight: 1.8, overflowY: 'auto' }}
              dangerouslySetInnerHTML={{ __html: previewBody }} />
          ) : (
            <textarea id="vcm-body" value={body} onChange={e => edit('body', e.target.value)}
              style={{ flex: 1, resize: 'none', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'var(--sans)', fontSize: 13, lineHeight: 1.75, outline: 'none', minHeight: 220 }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'} />
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexShrink: 0 }}>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
          {dirty && (
            <button className="btn btn-ghost" onClick={save}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              Save
            </button>
          )}
          <button className="btn btn-primary" onClick={() => { onClose(); onOpenAll() }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 3h7v10H6M2 8h8M7 5l3 3-3 3"/></svg>
            Save all to Gmail Drafts
          </button>
        </div>

      </div>
    </div>
  )
}
