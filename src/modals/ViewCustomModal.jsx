import { useState, useEffect, useRef } from 'react'
import { applyTpl } from '../utils/helpers.js'

const SUBJECT_PHS = [{ label: '{{company}}', ph: '{{company}}' }]
const BODY_PHS = [
  { label: '{{firstname}}', ph: '{{firstname}}' },
  { label: '{{lastname}}',  ph: '{{lastname}}' },
  { label: '{{name}}',      ph: '{{name}}' },
  { label: '{{email}}',     ph: '{{email}}' },
  { label: '{{company}}',   ph: '{{company}}' },
]
const FONTS = ['Arial', 'Calibri']
const SIZES = ['9', '10', '11', '12']

export default function ViewCustomModal({ open, onClose, onSave, customEmail, recipients = [] }) {
  const src = customEmail || { subject: '', body: '' }

  const [subject, setSubject] = useState(src.subject || '')
  const [bodyHtml, setBodyHtml] = useState(src.body || '')
  const [previewIdx, setPreviewIdx] = useState(-1)
  const [dirty, setDirty]       = useState(false)
  const [font, setFont]         = useState('Calibri')
  const [fontSize, setFontSize] = useState('11')
  const [translating, setTranslating] = useState(false)
  const editorRef = useRef(null)

  useEffect(() => {
    if (open) {
      setSubject(src.subject || '')
      setBodyHtml(src.body || '')
      setPreviewIdx(-1)
      setDirty(false)
      if (editorRef.current) {
        editorRef.current.innerHTML = src.body || ''
      }
    }
  }, [open, customEmail])

  // Restore editor content when switching back from preview to raw template
  const recipient = previewIdx >= 0 ? recipients[previewIdx] : null
  useEffect(() => {
    if (!recipient && editorRef.current) {
      editorRef.current.innerHTML = bodyHtml
    }
  }, [recipient])

  // Apply font/size to new text in editor
  useEffect(() => {
    if (!editorRef.current) return
    editorRef.current.style.fontFamily = font
    editorRef.current.style.fontSize = fontSize + 'pt'
  }, [font, fontSize])

  function exec(cmd, value) {
    editorRef.current?.focus()
    document.execCommand(cmd, false, value ?? null)
    setDirty(true)
  }

  function insertPhSubject(ph) {
    const inp = document.getElementById('vcm-subject')
    if (!inp) return
    const s = inp.selectionStart, e = inp.selectionEnd
    const next = subject.slice(0, s) + ph + subject.slice(e)
    setSubject(next)
    setDirty(true)
    setTimeout(() => { inp.focus(); inp.setSelectionRange(s + ph.length, s + ph.length) }, 0)
  }

  function insertPhBody(ph) {
    editorRef.current?.focus()
    document.execCommand('insertText', false, ph)
    setDirty(true)
  }

  const previewSubject = recipient ? applyTpl(subject, recipient) : null
  const previewBody    = recipient ? applyTpl(bodyHtml, recipient) : null

  function save() {
    onSave({ subject, body: bodyHtml })
    setDirty(false)
    onClose()
  }

  if (!open) return null

  async function translateToFrench() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey) { alert('Gemini API key not configured'); return }
    setTranslating(true)
    try {
      const prompt = `Translate the following email subject and HTML body to French.
- Preserve all HTML tags exactly as-is
- Preserve all placeholders like {{firstname}}, {{lastname}}, {{name}}, {{email}}, {{company}} exactly as-is — do NOT translate them
- Output ONLY a raw JSON object, no markdown fences:
{"subject": "...", "body": "..."}

Subject: ${subject}

Body:
${bodyHtml}`

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2 } }) }
      )
      const data = await res.json()
      if (data.error) throw new Error(data.error.message)
      const raw = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('')
      const match = raw.replace(/```json|```/g, '').match(/\{[\s\S]*\}/)
      if (!match) throw new Error('No JSON in response')
      const parsed = JSON.parse(match[0])
      setSubject(parsed.subject || subject)
      const newBody = parsed.body || bodyHtml
      setBodyHtml(newBody)
      if (editorRef.current) editorRef.current.innerHTML = newBody
      setDirty(true)
    } catch (e) {
      alert('Translation failed: ' + e.message)
    }
    setTranslating(false)
  }

  const toolbarBtn = (label, title, action) => (
    <button type="button" title={title} onMouseDown={e => { e.preventDefault(); action() }}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 26, height: 24, border: 'none', background: 'none', borderRadius: 4, cursor: 'pointer', color: 'var(--ink-2)', padding: '0 4px', fontSize: 12 }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--paper-3)'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
      {label}
    </button>
  )

  const sep = () => <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 3px', flexShrink: 0 }} />

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 760, maxHeight: '93vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexShrink: 0 }}>
          <p className="modal-title">Customized email</p>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose} title="Close">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg>
          </button>
        </div>

        {/* Insert placeholders */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 5, marginBottom: 12, padding: '6px 10px', background: 'var(--paper-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: 'var(--ink-3)', lineHeight: '22px', marginRight: 2 }}>Subject:</span>
          {SUBJECT_PHS.map(({ label, ph }) => (
            <span key={ph} className="ph-chip" onClick={() => insertPhSubject(ph)} style={{ cursor: 'pointer' }}>{label}</span>
          ))}
          <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 6px' }} />
          <span style={{ fontSize: 11, color: 'var(--ink-3)', lineHeight: '22px', marginRight: 2 }}>Body:</span>
          {BODY_PHS.map(({ label, ph }) => (
            <span key={ph + 'b'} className="ph-chip" onClick={() => insertPhBody(ph)} style={{ cursor: 'pointer' }}>{label}</span>
          ))}
        </div>

        {/* Preview recipient selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexShrink: 0 }}>
          <label style={{ fontSize: 12, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>Preview for:</label>
          <select value={previewIdx} onChange={e => setPreviewIdx(+e.target.value)}
            style={{ fontSize: 13, fontFamily: 'var(--sans)', background: 'var(--paper-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '5px 10px', color: 'var(--ink)', flex: 1 }}>
            <option value={-1}>— raw template (with placeholders) —</option>
            {recipients.map((r, i) => (
              <option key={i} value={i}>{r.name || r.email}{r.name && r.email ? ' · ' + r.email : ''}</option>
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
            <input id="vcm-subject" className="field-input" value={subject}
              onChange={e => { setSubject(e.target.value); setDirty(true) }}
              style={{ fontSize: 13 }} />
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, marginBottom: 12 }}>
          <label className="field-label" style={{ marginBottom: 4 }}>Body</label>

          {/* Toolbar */}
          {!recipient && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '4px 8px', background: 'var(--paper-2)', border: '1px solid var(--border)', borderBottom: 'none', borderRadius: 'var(--radius) var(--radius) 0 0', flexShrink: 0, flexWrap: 'wrap' }}>
              {/* Font family */}
              <select value={font} onChange={e => { setFont(e.target.value); exec('fontName', e.target.value) }}
                style={{ fontSize: 12, fontFamily: 'var(--sans)', background: 'none', border: 'none', color: 'var(--ink)', cursor: 'pointer', height: 24, padding: '0 2px' }}>
                {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              {sep()}
              {/* Font size */}
              <select value={fontSize} onChange={e => { setFontSize(e.target.value); exec('fontSize', { '9':'1','10':'2','11':'3','12':'4' }[e.target.value] || '3') }}
                style={{ fontSize: 12, fontFamily: 'var(--sans)', background: 'none', border: 'none', color: 'var(--ink)', cursor: 'pointer', height: 24, width: 38, padding: '0 2px' }}>
                {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {sep()}
              {toolbarBtn(<strong style={{ fontSize: 13 }}>B</strong>, 'Bold', () => exec('bold'))}
              {toolbarBtn(<em style={{ fontSize: 13 }}>I</em>, 'Italic', () => exec('italic'))}
              {toolbarBtn(<u style={{ fontSize: 13 }}>U</u>, 'Underline', () => exec('underline'))}
              {sep()}
              {toolbarBtn(
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/></svg>,
                'Bullet list', () => exec('insertUnorderedList')
              )}
              {toolbarBtn(
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>,
                'Numbered list', () => exec('insertOrderedList')
              )}
            </div>
          )}

          {/* Editor / preview */}
          {recipient ? (
            <div style={{ flex: 1, padding: '14px 16px', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: fontSize + 'pt', fontFamily: font, color: 'var(--ink)', lineHeight: 1.8, overflowY: 'auto' }}
              dangerouslySetInnerHTML={{ __html: previewBody }} />
          ) : (
            <div ref={editorRef} contentEditable suppressContentEditableWarning className="rich-editor"
              style={{ flex: 1, minHeight: 220, padding: '14px 16px', border: '1px solid var(--border)', borderRadius: '0 0 var(--radius) var(--radius)', background: 'var(--paper)', color: 'var(--ink)', fontFamily: font, fontSize: fontSize + 'pt', lineHeight: 1.8, overflowY: 'auto', outline: 'none' }}
              onInput={e => { setDirty(true); setBodyHtml(e.currentTarget.innerHTML) }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexShrink: 0, alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={translateToFrench} disabled={translating || !!recipient} title={recipient ? 'Switch to raw template view to translate' : 'Translate to French'} style={{ marginRight: 'auto', fontSize: 12 }}>
            {translating ? <><span className="spinner" style={{ width: 10, height: 10 }} /> Translating…</> : '🇫🇷 Translate to French'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={save} disabled={!dirty}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            Save
          </button>
        </div>

      </div>
    </div>
  )
}
