import { useState, useEffect, useRef } from 'react'
import { showToast } from '../components/Toast.jsx'

const TOOLS = [
  { cmd: 'bold',        icon: <strong style={{ fontSize: 13 }}>B</strong>,          title: 'Bold (Ctrl+B)' },
  { cmd: 'italic',      icon: <em style={{ fontSize: 13 }}>I</em>,                  title: 'Italic (Ctrl+I)' },
  { cmd: 'underline',   icon: <u style={{ fontSize: 13 }}>U</u>,                    title: 'Underline (Ctrl+U)' },
  { sep: true },
  { cmd: 'insertUnorderedList', icon: <BulletsIcon />, title: 'Bullet list' },
  { cmd: 'insertOrderedList',   icon: <NumbersIcon />, title: 'Numbered list' },
  { sep: true },
  { cmd: 'indent',   icon: <IndentIcon />,   title: 'Indent' },
  { cmd: 'outdent',  icon: <OutdentIcon />,  title: 'Outdent' },
  { sep: true },
  { cmd: 'removeFormat', icon: <ClearIcon />, title: 'Clear formatting' },
]

function BulletsIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/></svg>
}
function NumbersIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>
}
function IndentIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/><polyline points="7 10 11 12 7 14"/><line x1="11" y1="12" x2="21" y2="12"/></svg>
}
function OutdentIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/><polyline points="11 10 7 12 11 14"/><line x1="7" y1="12" x2="21" y2="12"/></svg>
}
function ClearIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18"/><path d="M4 20h7"/><path d="M11 4l5 5-8 8H3v-5z"/></svg>
}

export default function EditCustomModal({ open, onClose, onSave, customEmail }) {
  const [subject, setSubject] = useState('')
  const editorRef = useRef(null)
  const subjectRef = useRef(null)

  useEffect(() => {
    if (open && editorRef.current) {
      setSubject(customEmail.subject)
      // Set HTML content; if plain text, convert newlines to <br>
      const html = customEmail.body || ''
      editorRef.current.innerHTML = html.includes('<') ? html : html.replace(/\n/g, '<br>')
    }
  }, [open])

  function exec(cmd) {
    document.execCommand(cmd, false, null)
    editorRef.current?.focus()
  }

  function insertPlaceholder(ph) {
    editorRef.current?.focus()
    document.execCommand('insertText', false, ph)
  }

  function save() {
    const html = editorRef.current?.innerHTML || ''
    onSave({ subject, body: html })
    onClose()
    showToast('Customized email saved', 'success')
  }

  return (
    <div className={`modal-overlay${open ? ' open' : ''}`} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 700, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexShrink: 0 }}>
          <p className="modal-title">Edit customized email</p>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose} title="Close">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg>
          </button>
        </div>
        <p className="modal-sub">Refine the generated email. Rich text formatting is preserved when saving to Gmail Drafts.</p>

        {/* Placeholder chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10, padding: '8px 12px', background: 'var(--paper-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: 'var(--ink-3)', marginRight: 4, lineHeight: '24px' }}>Insert:</span>
          {['{{firstname}}', '{{lastname}}', '{{name}}', '{{email}}', '{{company}}'].map(ph => (
            <span key={ph} className="ph-chip" onClick={() => insertPlaceholder(ph)}>{ph}</span>
          ))}
        </div>

        {/* Subject */}
        <div className="field-group" style={{ marginBottom: 10, flexShrink: 0 }}>
          <label className="field-label">Subject</label>
          <input ref={subjectRef} className="field-input" value={subject} onChange={e => setSubject(e.target.value)} style={{ fontSize: 14 }} />
        </div>

        {/* Rich text editor */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, marginBottom: 12 }}>
          <label className="field-label" style={{ marginBottom: 6 }}>Body</label>

          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '5px 8px', background: 'var(--paper-2)', border: '1px solid var(--border)', borderBottom: 'none', borderRadius: 'var(--radius) var(--radius) 0 0', flexShrink: 0, flexWrap: 'wrap' }}>
            {TOOLS.map((t, i) =>
              t.sep
                ? <div key={i} style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 3px' }} />
                : <button key={t.cmd} type="button" title={t.title} onMouseDown={e => { e.preventDefault(); exec(t.cmd) }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 26, border: 'none', background: 'none', borderRadius: 4, cursor: 'pointer', color: 'var(--ink-2)', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--paper-3)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    {t.icon}
                  </button>
            )}
          </div>

          {/* Editable area */}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            style={{
              flex: 1, minHeight: 280, padding: '12px 14px',
              border: '1px solid var(--border)', borderRadius: '0 0 var(--radius) var(--radius)',
              background: 'var(--paper)', color: 'var(--ink)',
              fontFamily: 'var(--sans)', fontSize: 13, lineHeight: 1.75,
              overflowY: 'auto', outline: 'none',
            }}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
          />
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexShrink: 0 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>Save changes</button>
        </div>
      </div>
    </div>
  )
}
