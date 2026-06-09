import { useState, useEffect } from 'react'
import { showToast } from '../components/Toast.jsx'

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

export default function CustomGenerateModal({ open, onClose, onGenerated, masterTemplate, companyNewsItems }) {
  const [prompt, setPrompt]   = useState(DEFAULT_PROMPT)
  const [apiKey, setApiKey]   = useState(import.meta.env.VITE_GEMINI_API_KEY || '')
  const [model, setModel]     = useState('gemini-3.5-flash')
  const [showKey, setShowKey] = useState(false)
  const [status, setStatus]   = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) { setStatus(''); setLoading(false) }
  }, [open])

  async function generate() {
    if (!prompt.trim()) { showToast('Please enter a prompt', 'error'); return }
    if (!apiKey.trim()) { showToast('Please enter your API key', 'error'); return }
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
      onGenerated(parsed.subject || '', parsed.body || '')
      onClose()
      showToast('Email generated — review and save', 'success')
      setStatus('')
    } catch (e) {
      setStatus('Error — ' + (e.message || 'check your key and try again.'))
      console.error(e)
    }
    setLoading(false)
  }

  return (
    <div className={`modal-overlay${open ? ' open' : ''}`} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 580, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexShrink: 0 }}>
          <p className="modal-title">Generate customized email</p>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose} title="Close">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg>
          </button>
        </div>
        <p className="modal-sub">Edit the prompt if needed, then generate. The result will appear in the panel for review and editing.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minHeight: 0 }}>

          {/* Prompt */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <label className="field-label">Prompt</label>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}
                onClick={() => setPrompt(DEFAULT_PROMPT)}>
                Reset
              </button>
            </div>
            <textarea className="field-input" value={prompt} onChange={e => setPrompt(e.target.value)}
              style={{ flex: 1, minHeight: 220, fontSize: 12, resize: 'vertical', lineHeight: 1.65, fontFamily: 'var(--sans)' }} />
          </div>

          {/* Context summary */}
          <div style={{ fontSize: 11, color: 'var(--ink-3)', background: 'var(--paper-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 10px', display: 'flex', gap: 16, flexShrink: 0 }}>
            <span>Template: <strong style={{ color: masterTemplate.subject || masterTemplate.body ? 'var(--ink-2)' : 'var(--accent)' }}>{masterTemplate.subject || masterTemplate.body ? '✓ loaded' : '✗ missing'}</strong></span>
            <span>News items: <strong style={{ color: companyNewsItems.length ? 'var(--ink-2)' : 'var(--ink-3)' }}>{companyNewsItems.length > 0 ? `${companyNewsItems.length} loaded` : 'none'}</strong></span>
          </div>

          {/* API key + model */}
          <div style={{ flexShrink: 0 }}>
            <label className="field-label" style={{ marginBottom: 4 }}>Gemini API key</label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <select value={model} onChange={e => setModel(e.target.value)}
                  style={{ fontFamily: 'var(--sans)', fontSize: 12, background: 'var(--paper-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 24px 7px 9px', color: 'var(--ink)', appearance: 'none', cursor: 'pointer' }}>
                  <option value="gemini-3.5-flash">3.5 Flash</option>
                  <option value="gemini-2.5-flash">2.5 Flash</option>
                  <option value="gemini-2.5-pro">2.5 Pro</option>
                  <option value="gemini-2.0-flash">2.0 Flash</option>
                  <option value="gemini-1.5-flash">1.5 Flash</option>
                  <option value="gemini-1.5-pro">1.5 Pro</option>
                </select>
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="var(--ink-3)" strokeWidth="2" strokeLinecap="round" style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><path d="M4 6l4 4 4-4"/></svg>
              </div>
              <div style={{ position: 'relative', flex: 1 }}>
                <input className="field-input" type={showKey ? 'text' : 'password'} value={apiKey}
                  onChange={e => setApiKey(e.target.value)} placeholder="AIza…"
                  style={{ fontSize: 13, fontFamily: 'var(--mono)', paddingRight: 36 }} />
                <button onClick={() => setShowKey(v => !v)} title="Show/hide"
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 0, lineHeight: 1 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    {showKey
                      ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>
                      : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {status && (
            <div style={{ fontSize: 12, color: status.startsWith('Error') ? 'var(--accent)' : 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {loading && <span className="spinner" style={{ width: 10, height: 10 }} />}
              {status}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '1rem', flexShrink: 0 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-accent" onClick={generate} disabled={loading}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
            {loading ? 'Generating…' : 'Generate'}
          </button>
        </div>
      </div>
    </div>
  )
}
