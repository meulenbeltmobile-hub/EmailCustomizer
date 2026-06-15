import { useState, useEffect, useRef } from 'react'
import { showToast } from '../components/Toast.jsx'
import { loadGenPromptsFromSheet, saveGenPromptsToSheet } from '../utils/sheetsApi.js'

const DEFAULT_PROMPT = `You are an expert B2B sales copywriter specialising in logistics and supply chain solutions.

Using the master email template and the company intelligence items provided below, write a personalised outreach email that:

1. Keeps the structure and tone of the master template
2. Naturally weaves in 1–2 of the most relevant news items as conversation starters or proof of relevance (use the commercial_trigger and suggested_sales_angle fields to guide this)
3. Makes the recipient feel the email was written specifically for their company — not a generic blast
4. Stays concise: no more than 150 words in the body
5. Ends with a clear, low-friction call to action (e.g. a 20-minute call, a short demo)

Constraints:
- Do NOT invent facts — only use what the intelligence items contain
- Keep all {{placeholders}} from the master template exactly as-is ({{firstname}}, {{name}}, {{lastname}}, {{email}}, {{company}})
- Output ONLY a raw JSON object (no markdown, no explanation): {"subject":"...","body":"..."}`

const TOOLS = [
  { cmd: 'bold',               label: <strong style={{ fontSize: 12 }}>B</strong>,   title: 'Bold' },
  { cmd: 'italic',             label: <em style={{ fontSize: 12 }}>I</em>,            title: 'Italic' },
  { cmd: 'underline',         label: <u style={{ fontSize: 12 }}>U</u>,              title: 'Underline' },
  { sep: true },
  { cmd: 'insertUnorderedList', label: <ListIcon />, title: 'Bullet list' },
  { cmd: 'insertOrderedList',   label: <NumIcon />,  title: 'Numbered list' },
  { sep: true },
  { cmd: 'removeFormat', label: <ClearIcon />, title: 'Clear formatting' },
]

function ListIcon()  { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/></svg> }
function NumIcon()   { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg> }
function ClearIcon() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18"/><path d="M4 20h7"/><path d="M11 4l5 5-8 8H3v-5z"/></svg> }

export default function CustomEmailModal({ open, onClose, onSave, masterTemplate, companyNewsItems, customEmail, gmailToken = null }) {
  const [apiKey, setApiKey]   = useState(import.meta.env.VITE_GEMINI_API_KEY || '')
  const [model, setModel]     = useState('gemini-2.5-flash')
  const [showKey, setShowKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const [status, setStatus]   = useState('')

  // Prompt library
  const [prompt, setPrompt] = useState(() => {
    try { return localStorage.getItem('ec_genActivePrompt') || DEFAULT_PROMPT } catch { return DEFAULT_PROMPT }
  })
  const [promptName, setPromptName] = useState(() => {
    try { return localStorage.getItem('ec_genActivePromptName') || '' } catch { return '' }
  })
  const [promptOpen, setPromptOpen]     = useState(false)
  const [libraryOpen, setLibraryOpen]   = useState(false)
  const [savedPrompts, setSavedPrompts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ec_genSavedPrompts')) || [] } catch { return [] }
  })

  // Result editing
  const [subject, setSubject] = useState('')
  const [hasResult, setHasResult] = useState(false)
  const editorRef   = useRef(null)
  const subjectRef  = useRef(null)

  useEffect(() => { localStorage.setItem('ec_genSavedPrompts', JSON.stringify(savedPrompts)) }, [savedPrompts])
  useEffect(() => { localStorage.setItem('ec_genActivePrompt', prompt) }, [prompt])
  useEffect(() => { localStorage.setItem('ec_genActivePromptName', promptName) }, [promptName])

  useEffect(() => {
    if (open) {
      setStatus('')
      setLoading(false)
      setPromptOpen(false)
      setLibraryOpen(false)
      // Populate editor with existing saved email if present
      if (customEmail?.subject || customEmail?.body) {
        setSubject(customEmail.subject || '')
        setHasResult(true)
        setTimeout(() => {
          if (editorRef.current) {
            const html = customEmail.body || ''
            editorRef.current.innerHTML = html.includes('<') ? html : html.replace(/\n/g, '<br>')
          }
        }, 0)
      } else {
        setSubject('')
        setHasResult(false)
        if (editorRef.current) editorRef.current.innerHTML = ''
      }
      if (gmailToken && import.meta.env.VITE_SHEETS_ID) syncPromptsFromSheet()
    }
  }, [open])

  async function syncPromptsFromSheet() {
    try {
      const remote = await loadGenPromptsFromSheet(gmailToken)
      if (remote.length > 0) setSavedPrompts(remote)
    } catch (e) { console.error('Prompt sync:', e.message) }
  }

  async function pushPromptsToSheet(prompts) {
    if (!gmailToken || !import.meta.env.VITE_SHEETS_ID) return
    try { await saveGenPromptsToSheet(gmailToken, prompts) }
    catch (e) { console.error('Prompt push:', e.message) }
  }

  function loadPrompt(p) {
    setPrompt(p.text)
    setPromptName(p.name)
    setLibraryOpen(false)
    setPromptOpen(true)
    showToast(`Loaded "${p.name}"`, 'success')
  }

  function savePrompt() {
    const name = promptName.trim()
    if (!name) { showToast('Enter a prompt name first', 'error'); return }
    const existing = savedPrompts.find(p => p.name === name)
    let updated
    if (existing) {
      updated = savedPrompts.map(p => p.name === name ? { ...p, text: prompt } : p)
      showToast(`"${name}" updated`, 'success')
    } else {
      updated = [...savedPrompts, { id: Date.now(), name, text: prompt }]
      showToast(`"${name}" saved`, 'success')
    }
    setSavedPrompts(updated)
    pushPromptsToSheet(updated)
  }

  function deletePrompt(id) {
    const updated = savedPrompts.filter(p => p.id !== id)
    setSavedPrompts(updated)
    pushPromptsToSheet(updated)
  }

  async function generate() {
    if (!prompt.trim()) { showToast('Please enter a prompt', 'error'); return }
    if (!apiKey.trim()) { showToast('Please enter your Gemini API key', 'error'); return }
    if (!masterTemplate.subject && !masterTemplate.body) { showToast('Create a master template first', 'error'); return }

    setLoading(true)
    setStatus('Generating…')

    const newsContext = companyNewsItems.length
      ? '\n\nCompany intelligence items:\n' + companyNewsItems.map((n, i) =>
          `${i + 1}. [${n.category || 'Update'}] ${n.title} (${n.date || ''})` +
          `\n   Summary: ${n.summary}` +
          (n.commercial_trigger ? `\n   Commercial trigger: ${n.commercial_trigger}` : '') +
          (n.suggested_sales_angle ? `\n   Sales angle: ${n.suggested_sales_angle}` : '')
        ).join('\n\n')
      : '\n\n(No company intelligence items available — generate from the master template only.)'

    const fullPrompt =
      prompt.trim() +
      `\n\nMaster template subject: ${masterTemplate.subject}` +
      `\nMaster template body:\n${masterTemplate.body}` +
      newsContext

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
            generationConfig: { maxOutputTokens: 4096, responseMimeType: 'application/json' }
          })
        }
      )
      const data = await res.json()
      if (data.error) throw new Error(data.error.message)
      const text  = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('')
      const match = text.replace(/```json|```/g, '').match(/\{[\s\S]*\}/)
      if (!match) throw new Error('No JSON found in response')
      const parsed = JSON.parse(match[0])
      setSubject(parsed.subject || '')
      const html = (parsed.body || '').includes('<') ? parsed.body : (parsed.body || '').replace(/\n/g, '<br>')
      if (editorRef.current) editorRef.current.innerHTML = html
      setHasResult(true)
      setStatus('')
      showToast('Email generated — review and save', 'success')
    } catch (e) {
      setStatus('Error — ' + (e.message || 'check your key and try again.'))
    }
    setLoading(false)
  }

  function exec(cmd) {
    document.execCommand(cmd, false, null)
    editorRef.current?.focus()
  }

  function insertPh(ph) {
    editorRef.current?.focus()
    document.execCommand('insertText', false, ph)
  }

  function save() {
    const body = editorRef.current?.innerHTML || ''
    onSave({ subject, body })
    onClose()
    showToast('Customized email saved', 'success')
  }

  return (
    <div className={`modal-overlay${open ? ' open' : ''}`} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 700, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexShrink: 0 }}>
          <p className="modal-title">Customized email</p>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose} title="Close">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg>
          </button>
        </div>
        <p className="modal-sub">Generate a personalised email from your template and company news, then edit before saving.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>

          {/* ── Prompt accordion ── */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--paper-2)', borderBottom: promptOpen ? '1px solid var(--border)' : 'none' }}>
              <button type="button" onClick={() => setPromptOpen(v => !v)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--ink-2)', fontWeight: 500 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                  Generation prompt
                  {promptName && <span style={{ fontWeight: 400, color: 'var(--ink-3)', fontSize: 11 }}>— {promptName}</span>}
                </span>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ transform: promptOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><path d="M4 6l4 4 4-4"/></svg>
              </button>
              <button type="button" onClick={() => setLibraryOpen(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 10px', background: 'none', border: 'none', borderLeft: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--ink-3)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                Saved
                {savedPrompts.length > 0 && <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--paper-3)', color: 'var(--ink-3)', borderRadius: 99, padding: '1px 6px' }}>{savedPrompts.length}</span>}
              </button>
            </div>
            {libraryOpen && (
              <div style={{ background: 'var(--paper)', borderBottom: '1px solid var(--border)', maxHeight: 150, overflowY: 'auto' }}>
                {savedPrompts.length === 0
                  ? <p style={{ fontSize: 12, color: 'var(--ink-3)', padding: '10px 14px', textAlign: 'center' }}>No saved prompts yet.</p>
                  : savedPrompts.map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                      <button className="btn btn-ghost btn-sm" onClick={() => loadPrompt(p)} style={{ fontSize: 11, flexShrink: 0 }}>Load</button>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { deletePrompt(p.id); showToast(`"${p.name}" deleted`) }} title="Delete" style={{ color: 'var(--ink-3)', flexShrink: 0 }}>
                        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="2 4 4 4 14 4"/><path d="M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M13 4l-1 9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2L3 4"/></svg>
                      </button>
                    </div>
                  ))}
              </div>
            )}
            {promptOpen && (
              <div style={{ background: 'var(--paper)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
                  style={{ width: '100%', minHeight: 180, maxHeight: 300, fontFamily: 'var(--mono)', fontSize: 11, lineHeight: 1.7, color: 'var(--ink-2)', background: 'var(--paper-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 10px', resize: 'vertical', boxSizing: 'border-box' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setPrompt(DEFAULT_PROMPT); showToast('Reset to default') }} style={{ fontSize: 11 }}>Reset</button>
                  <input className="field-input" value={promptName} onChange={e => setPromptName(e.target.value)} placeholder="Prompt name…" style={{ fontSize: 12, width: 150, padding: '4px 8px', marginLeft: 'auto' }} />
                  <button className="btn btn-ghost btn-sm" onClick={savePrompt} style={{ fontSize: 11 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                    Save prompt
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Context + API key + Generate */}
          <div style={{ fontSize: 11, color: 'var(--ink-3)', background: 'var(--paper-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 10px', display: 'flex', gap: 16 }}>
            <span>Template: <strong style={{ color: masterTemplate.subject || masterTemplate.body ? 'var(--ink-2)' : 'var(--accent)' }}>{masterTemplate.subject || masterTemplate.body ? '✓ loaded' : '✗ missing'}</strong></span>
            <span>News items: <strong style={{ color: companyNewsItems.length ? 'var(--ink-2)' : 'var(--ink-3)' }}>{companyNewsItems.length > 0 ? `${companyNewsItems.length} loaded` : 'none'}</strong></span>
          </div>

          <div>
            <label className="field-label" style={{ marginBottom: 4 }}>Gemini API key</label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <select value={model} onChange={e => setModel(e.target.value)}
                  style={{ fontFamily: 'var(--sans)', fontSize: 12, background: 'var(--paper-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 24px 7px 9px', color: 'var(--ink)', appearance: 'none', cursor: 'pointer' }}>
                  <option value="gemini-2.5-flash">2.5 Flash</option>
                  <option value="gemini-2.5-pro">2.5 Pro</option>
                  <option value="gemini-2.0-flash">2.0 Flash</option>
                  <option value="gemini-1.5-flash">1.5 Flash</option>
                  <option value="gemini-1.5-pro">1.5 Pro</option>
                </select>
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="var(--ink-3)" strokeWidth="2" strokeLinecap="round" style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><path d="M4 6l4 4 4-4"/></svg>
              </div>
              <div style={{ position: 'relative', flex: 1 }}>
                <input className="field-input" type={showKey ? 'text' : 'password'} value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="AIza…" style={{ fontSize: 13, fontFamily: 'var(--mono)', paddingRight: 36 }} />
                <button onClick={() => setShowKey(v => !v)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 0, lineHeight: 1 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    {showKey ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>
                      : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
                  </svg>
                </button>
              </div>
              <button className="btn btn-accent btn-sm" onClick={generate} disabled={loading} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                {loading ? <span className="spinner" style={{ width: 11, height: 11 }} /> : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>}
                {loading ? 'Generating…' : 'Generate'}
              </button>
            </div>
            {status && <div style={{ fontSize: 12, color: status.startsWith('Error') ? 'var(--accent)' : 'var(--ink-3)', marginTop: 5, display: 'flex', alignItems: 'center', gap: 6 }}>{loading && <span className="spinner" style={{ width: 10, height: 10 }} />}{status}</div>}
          </div>
        </div>

        {/* ── Result editor ── */}
        {hasResult && (
          <>
            <div style={{ borderTop: '1px solid var(--border)', margin: '12px 0 10px', flexShrink: 0 }} />

            {/* Placeholder chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10, padding: '7px 10px', background: 'var(--paper-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', flexShrink: 0 }}>
              <span style={{ fontSize: 11, color: 'var(--ink-3)', marginRight: 4, lineHeight: '22px' }}>Insert:</span>
              {['{{firstname}}', '{{lastname}}', '{{name}}', '{{email}}', '{{company}}'].map(ph => (
                <span key={ph} className="ph-chip" onClick={() => insertPh(ph)}>{ph}</span>
              ))}
            </div>

            {/* Subject */}
            <div style={{ marginBottom: 10, flexShrink: 0 }}>
              <label className="field-label" style={{ marginBottom: 4 }}>Subject</label>
              <input ref={subjectRef} className="field-input" value={subject} onChange={e => setSubject(e.target.value)} style={{ fontSize: 13 }} />
            </div>

            {/* Rich text body */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, marginBottom: 12 }}>
              <label className="field-label" style={{ marginBottom: 6 }}>Body</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '5px 8px', background: 'var(--paper-2)', border: '1px solid var(--border)', borderBottom: 'none', borderRadius: 'var(--radius) var(--radius) 0 0', flexShrink: 0, flexWrap: 'wrap' }}>
                {TOOLS.map((t, i) => t.sep
                  ? <div key={i} style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 3px' }} />
                  : <button key={t.cmd} type="button" title={t.title} onMouseDown={e => { e.preventDefault(); exec(t.cmd) }}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 24, border: 'none', background: 'none', borderRadius: 4, cursor: 'pointer', color: 'var(--ink-2)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--paper-3)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      {t.label}
                    </button>
                )}
              </div>
              <div ref={editorRef} contentEditable suppressContentEditableWarning
                style={{ flex: 1, minHeight: 180, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '0 0 var(--radius) var(--radius)', background: 'var(--paper)', color: 'var(--ink)', fontFamily: 'var(--sans)', fontSize: 13, lineHeight: 1.75, overflowY: 'auto', outline: 'none' }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
            </div>
          </>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: hasResult ? 0 : '0.75rem', flexShrink: 0 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          {hasResult && (
            <button className="btn btn-primary" onClick={save}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              Save
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
