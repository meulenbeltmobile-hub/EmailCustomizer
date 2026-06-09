import { useState, useEffect, useRef } from 'react'
import { insertAtCursor, applyTpl } from '../utils/helpers.js'
import { showToast } from '../components/Toast.jsx'

export default function TemplateModal({ open, onClose, onSave, masterTemplate, recipients, savedTemplates = [], onSaveToLibrary = () => {}, onDeleteFromLibrary = () => {} }) {
  const [subject, setSubject]               = useState('')
  const [body, setBody]                     = useState('')
  const [templateName, setTemplateName]     = useState('')
  const [sampleVisible, setSampleVisible]   = useState(false)
  const [sampleRecipientIdx, setSampleRecipientIdx] = useState(0)
  const [libraryOpen, setLibraryOpen]       = useState(false)
  const subjectRef = useRef(null)
  const bodyRef    = useRef(null)

  useEffect(() => {
    if (open) {
      setSubject(masterTemplate.subject)
      setBody(masterTemplate.body)
      setTemplateName(masterTemplate.name || '')
      setSampleVisible(false)
      setLibraryOpen(savedTemplates.length > 0)
    }
  }, [open])

  function insertPh(target, ph) {
    if (target === 'modal-subject') insertAtCursor(subjectRef, setSubject, ph)
    else insertAtCursor(bodyRef, setBody, ph)
  }

  function loadTemplate(tpl) {
    setSubject(tpl.subject)
    setBody(tpl.body)
    setTemplateName(tpl.name)
    setLibraryOpen(false)
    showToast(`Editing "${tpl.name}"`, 'success')
  }

  function newTemplate() {
    setSubject('')
    setBody('')
    setTemplateName('')
    setSampleVisible(false)
    showToast('Started new template', 'success')
  }

  function save() {
    const name = templateName.trim()
    const id = masterTemplate.id || Date.now()
    onSave({ subject, body, name, id })
    if (name) onSaveToLibrary({ id, name, subject, body })
    onClose()
    showToast(name ? `"${name}" saved` : 'Template saved', 'success')
  }

  const sampleRecipient = recipients[sampleRecipientIdx] || null

  return (
    <div className={`modal-overlay${open ? ' open' : ''}`} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 700, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <p className="modal-title" style={{ margin: 0 }}>
              {templateName ? `Editing: ${templateName}` : subject || body ? 'Editing: (unnamed)' : 'New template'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button className="btn btn-ghost btn-sm" onClick={newTemplate} title="Clear editor and start a new blank template">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 3v10M3 8h10"/></svg>
              New template
            </button>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose} title="Close">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg>
            </button>
          </div>
        </div>
        <p className="modal-sub">Write your master email. Use placeholders to personalise per recipient. Load a saved template to edit it, or click <strong>New template</strong> to start fresh.</p>

        {/* ── Saved templates accordion ── */}
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: 12, overflow: 'hidden', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setLibraryOpen(v => !v)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', background: 'var(--paper-2)', border: 'none', cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--ink-2)', fontWeight: 500 }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              Saved templates
              {savedTemplates.length > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--paper-3)', color: 'var(--ink-3)', borderRadius: 99, padding: '1px 7px' }}>{savedTemplates.length}</span>
              )}
            </span>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ transform: libraryOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <path d="M4 6l4 4 4-4"/>
            </svg>
          </button>
          {libraryOpen && (
            <div style={{ maxHeight: 140, overflowY: 'auto', background: 'var(--paper)' }}>
              {savedTemplates.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--ink-3)', padding: '12px 14px', textAlign: 'center' }}>No saved templates yet. Save one below.</p>
              ) : savedTemplates.map(tpl => (
                <div key={tpl.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid var(--border)', background: 'var(--paper)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tpl.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tpl.subject}</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => loadTemplate(tpl)} style={{ fontSize: 11, flexShrink: 0 }} title="Load this template into the editor">
                    Edit
                  </button>
                  <button
                    className="btn btn-ghost btn-sm btn-icon"
                    onClick={() => { onDeleteFromLibrary(tpl.id); showToast(`"${tpl.name}" deleted`, 'success') }}
                    title="Delete from library"
                    style={{ color: 'var(--ink-3)', flexShrink: 0 }}
                  >
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="2 4 4 4 14 4"/><path d="M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M13 4l-1 9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2L3 4"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Template name */}
        <div className="field-group" style={{ marginBottom: 10, flexShrink: 0 }}>
          <label className="field-label">Template name <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>(optional — used for the library)</span></label>
          <input className="field-input" value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="e.g. Cold outreach — logistics" style={{ fontSize: 13 }} />
        </div>

        {/* Placeholder chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12, padding: '9px 12px', background: 'var(--paper-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: 'var(--ink-3)', marginRight: 4, lineHeight: '24px' }}>Insert:</span>
          {[['modal-subject','{{company}}'],['modal-body','{{name}}'],['modal-body','{{firstname}}'],['modal-body','{{lastname}}'],['modal-body','{{email}}'],['modal-body','{{company}}']].map(([field, ph]) => (
            <span key={field+ph} className="ph-chip" onClick={() => insertPh(field, ph)}>
              {ph}{field === 'modal-subject' ? ' → subject' : ' → body'}
            </span>
          ))}
        </div>

        {/* Subject */}
        <div className="field-group" style={{ marginBottom: 10, flexShrink: 0 }}>
          <label className="field-label">Subject line</label>
          <input ref={subjectRef} className="field-input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. An invitation for {{firstname}}" />
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, marginBottom: 12 }}>
          <label className="field-label" style={{ marginBottom: 6 }}>Email body</label>
          <textarea ref={bodyRef} className="field-textarea" value={body} onChange={e => setBody(e.target.value)} style={{ flex: 1, minHeight: 0, resize: 'none' }} placeholder={"Dear {{firstname}},\n\n…"} />
        </div>

        {/* Sample render */}
        {sampleVisible && (
          <div style={{ background: 'var(--paper-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 12, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Sample render</span>
              <select value={sampleRecipientIdx} onChange={e => setSampleRecipientIdx(+e.target.value)} style={{ fontSize: 12, fontFamily: 'var(--sans)', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 6px', color: 'var(--ink-2)' }}>
                {recipients.length === 0 ? <option>No recipients yet</option> : recipients.map((r, i) => <option key={i} value={i}>{r.name}</option>)}
              </select>
            </div>
            <div style={{ fontWeight: 500, color: 'var(--ink)', marginBottom: 4, fontSize: 13 }}>{sampleRecipient ? applyTpl(subject, sampleRecipient) : subject}</div>
            <div style={{ color: 'var(--ink-2)', whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: 13 }}>{sampleRecipient ? applyTpl(body, sampleRecipient) : body}</div>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setSampleVisible(v => !v)}>
            {sampleVisible ? 'Hide sample render' : 'Show sample render'}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={save}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
