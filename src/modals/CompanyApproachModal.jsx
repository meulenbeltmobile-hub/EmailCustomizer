import { useState, useEffect } from 'react'
import { showToast } from '../components/Toast.jsx'
import { loadApproachPromptsFromSheet, saveApproachPromptsToSheet, saveApproachToSheet } from '../utils/sheetsApi.js'

const DEFAULT_PROMPT = `You are an expert B2B sales strategist specializing in the global logistics and supply chain industry.

Company to analyze:
{{company}}

Task:
Using web search, research {{company}} in depth. Focus on:
- Their core business, services, and markets
- Recent news, challenges, investments, and strategic moves (last 90 days where possible, but also broader context)
- Key decision-makers and organizational structure
- Technology stack and digital maturity
- Competitors and market positioning
- Known pain points or business pressures

Search and language rules:
- If the company appears non-English, search in both English and the local language
- Add logistics/supply chain keywords to disambiguate
- Translate all findings to English

Output a comprehensive plain-text research summary covering all findings. Do not output JSON.`

function resolvePrompt(template, name) {
  const today = new Date().toISOString().slice(0, 10)
  return template
    .replace(/\{\{company\}\}/g, name)
    .replace(/\{\{today\}\}/g, today)
}

export default function CompanyApproachModal({ open, onClose, onSave, onOpen, savedApproach = '', initialCompany = '', gmailToken = null }) {
  const [companyName, setCompanyName] = useState('')
  const [apiKey, setApiKey]           = useState(import.meta.env.VITE_GEMINI_API_KEY || '')
  const [model, setModel]             = useState('gemini-3.5-flash-high')
  const [showKey, setShowKey]         = useState(false)
  const [running, setRunning]         = useState(false)
  const [runStatus, setRunStatus]     = useState('')

  // Structured output
  const [summary, setSummary]           = useState('')
  const [propositions, setPropositions] = useState([]) // [{id, text, checked}]

  const [promptTemplate, setPromptTemplate] = useState(() => {
    try { return localStorage.getItem('ec_approachPrompt') || DEFAULT_PROMPT } catch { return DEFAULT_PROMPT }
  })
  const [promptName, setPromptName]     = useState(() => {
    try { return localStorage.getItem('ec_approachPromptName') || '' } catch { return '' }
  })
  const [promptOpen, setPromptOpen]     = useState(false)
  const [libraryOpen, setLibraryOpen]   = useState(false)
  const [savedPrompts, setSavedPrompts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ec_approachSavedPrompts')) || [] } catch { return [] }
  })

  useEffect(() => { localStorage.setItem('ec_approachSavedPrompts', JSON.stringify(savedPrompts)) }, [savedPrompts])
  useEffect(() => { localStorage.setItem('ec_approachPrompt', promptTemplate) }, [promptTemplate])
  useEffect(() => { localStorage.setItem('ec_approachPromptName', promptName) }, [promptName])

  useEffect(() => {
    if (open) {
      setCompanyName(initialCompany)
      setRunStatus('')
      // Parse savedApproach back into summary + propositions + manual note if available
      if (savedApproach) {
        const summaryMatch = savedApproach.match(/## Strategic Summary\n([\s\S]*?)(?=\n## |$)/)
        const propSection  = savedApproach.match(/## Value Propositions\n([\s\S]*?)(?=\n## |$)/)
        const notesMatch   = savedApproach.match(/## Additional Notes\n([\s\S]*)$/)
        if (summaryMatch || propSection) {
          setSummary(summaryMatch ? summaryMatch[1].trim() : '')
          const props = propSection
            ? propSection[1].split('\n').filter(l => l.startsWith('- ')).map((l, i) => ({ id: i, text: l.slice(2).trim(), checked: true }))
            : []
          setPropositions(props)
        } else {
          setSummary(savedApproach)
          setPropositions([])
        }
        if (notesMatch) {
          setManualNote(notesMatch[1].trim())
          setManualNoteChecked(true)
        } else {
          setManualNote('')
          setManualNoteChecked(false)
        }
      } else {
        setSummary('')
        setPropositions([])
        setManualNote('')
        setManualNoteChecked(false)
      }
    }
  }, [open])

  function loadPrompt(p) {
    setPromptTemplate(p.text); setPromptName(p.name)
    setLibraryOpen(false); setPromptOpen(true)
    showToast(`Loaded "${p.name}"`, 'success')
  }

  function savePrompt() {
    const name = promptName.trim()
    if (!name) { showToast('Enter a prompt name first', 'error'); return }
    const existing = savedPrompts.find(p => p.name === name)
    let updated
    if (existing) {
      updated = savedPrompts.map(p => p.name === name ? { ...p, text: promptTemplate } : p)
      showToast(`"${name}" updated`, 'success')
    } else {
      updated = [...savedPrompts, { id: Date.now(), name, text: promptTemplate }]
      showToast(`"${name}" saved`, 'success')
    }
    setSavedPrompts(updated)
    if (gmailToken && import.meta.env.VITE_SHEETS_ID) {
      saveApproachPromptsToSheet(gmailToken, updated).catch(() => {})
    }
  }

  function deletePrompt(id) {
    const updated = savedPrompts.filter(p => p.id !== id)
    setSavedPrompts(updated)
    if (gmailToken && import.meta.env.VITE_SHEETS_ID) {
      saveApproachPromptsToSheet(gmailToken, updated).catch(() => {})
    }
  }

  async function syncPromptsFromSheet() {
    if (!gmailToken || !import.meta.env.VITE_SHEETS_ID) return
    try {
      const remote = await loadApproachPromptsFromSheet(gmailToken)
      if (remote.length > 0) { setSavedPrompts(remote); showToast(`${remote.length} prompt(s) loaded from Sheet`, 'success') }
    } catch (e) { showToast('Sync failed: ' + e.message, 'error') }
  }

  async function pushPromptsToSheet() {
    if (!gmailToken || !import.meta.env.VITE_SHEETS_ID) return
    try { await saveApproachPromptsToSheet(gmailToken, savedPrompts); showToast('Prompts backed up to Sheet', 'success') }
    catch (e) { showToast('Push failed: ' + e.message, 'error') }
  }

  async function callGemini(prompt, useSearch) {
    const thinkingLevel = model === 'gemini-3.5-flash-high' ? 'high' : 'medium'
    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 8192, thinkingConfig: { thinkingLevel } }
    }
    if (useSearch) body.tools = [{ google_search: {} }]
    const res  = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey.trim()}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    )
    const data = await res.json()
    if (data.error) throw new Error(data.error.message)
    return (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('')
  }

  async function run() {
    if (!companyName.trim()) { showToast('Please enter a company name first', 'error'); return }
    if (!apiKey.trim())      { showToast('Please enter your Gemini API key', 'error'); return }
    setRunning(true); setSummary(''); setPropositions([])
    setRunStatus('Researching company…')
    const name = companyName.trim()
    try {
      const rawText = await callGemini(resolvePrompt(promptTemplate, name), true)

      setRunStatus('Generating sales approach…')
      const formatPrompt = `You are an expert B2B sales strategist specializing in logistics and supply chain.

Based on the research below about ${name}, produce a structured sales approach in JSON.

Output ONLY a raw JSON object (no markdown fences, no explanation):
{
  "strategic_summary": "3-5 sentence overview: who they are, key commercial signals, and why now is a good time to reach out",
  "value_propositions": [
    "Specific, actionable value proposition 1 tailored to their situation",
    "Specific, actionable value proposition 2",
    "Specific, actionable value proposition 3",
    "Specific, actionable value proposition 4",
    "Specific, actionable value proposition 5"
  ]
}

Rules:
- strategic_summary: concise, fact-based, references actual findings
- value_propositions: 4-6 items, each one concrete and tied to a real signal or pain point from the research
- Do NOT invent facts

Research:
${rawText}`

      const jsonText = await callGemini(formatPrompt, false)
      const match = jsonText.replace(/```json|```/g, '').match(/\{[\s\S]*\}/)
      if (!match) throw new Error('No JSON found in response')
      const parsed = JSON.parse(match[0])
      setSummary(parsed.strategic_summary || '')
      setPropositions((parsed.value_propositions || []).map((text, i) => ({ id: i, text, checked: true })))
      setRunStatus('')
    } catch (e) {
      setRunStatus('Error — ' + (e.message || 'check your key and try again.'))
      console.error(e)
    }
    setRunning(false)
  }

  function toggleProp(id) {
    setPropositions(prev => prev.map(p => p.id === id ? { ...p, checked: !p.checked } : p))
  }

  const [manualNote, setManualNote]         = useState('')
  const [manualNoteChecked, setManualNoteChecked] = useState(false)

  const checkedCount = propositions.filter(p => p.checked).length + (manualNoteChecked && manualNote.trim() ? 1 : 0)

  function save() {
    const checkedProps = propositions.filter(p => p.checked)
    const parts = ['## Strategic Summary', summary]
    if (checkedProps.length) parts.push('\n## Value Propositions', ...checkedProps.map(p => `- ${p.text}`))
    if (manualNoteChecked && manualNote.trim()) parts.push('\n## Additional Notes', manualNote.trim())
    const text = parts.join('\n')
    onSave(text, companyName.trim())
    onClose()
    showToast('Sales approach saved', 'success')
    if (gmailToken && import.meta.env.VITE_SHEETS_ID) {
      saveApproachToSheet(gmailToken, text).catch(() => {})
    }
  }

  const hasOutput = summary || propositions.length > 0

  return (
    <div className={`modal-overlay${open ? ' open' : ''}`} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 780, maxHeight: '94vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexShrink: 0 }}>
          <p className="modal-title">Company approach</p>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg>
          </button>
        </div>
        <p className="modal-sub">Research the company and generate a tailored sales approach using Gemini + Google Search.</p>

        {/* Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12, flexShrink: 0 }}>

          {/* Company name */}
          <div>
            <label className="field-label" style={{ marginBottom: 4 }}>Company name</label>
            <input className="field-input" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. Kuehne+Nagel" style={{ fontSize: 13 }} />
          </div>

          {/* Prompt accordion */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--paper-2)', borderBottom: promptOpen ? '1px solid var(--border)' : 'none' }}>
              <button type="button" onClick={() => setPromptOpen(v => !v)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--ink-2)', fontWeight: 500 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                  Approach prompt
                  {promptName && <span style={{ fontWeight: 400, color: 'var(--ink-3)', fontSize: 11 }}>— {promptName}</span>}
                </span>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                  style={{ transform: promptOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                  <path d="M4 6l4 4 4-4"/>
                </svg>
              </button>
              <button type="button" onClick={() => setLibraryOpen(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 10px', background: 'none', border: 'none', borderLeft: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--ink-3)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                Saved
                {savedPrompts.length > 0 && <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--paper-3)', color: 'var(--ink-3)', borderRadius: 99, padding: '1px 6px' }}>{savedPrompts.length}</span>}
              </button>
            </div>

            {libraryOpen && (
              <div style={{ background: 'var(--paper)', borderBottom: '1px solid var(--border)', maxHeight: 160, overflowY: 'auto' }}>
                {import.meta.env.VITE_SHEETS_ID && (
                  <div style={{ display: 'flex', gap: 4, padding: '6px 10px', borderBottom: '1px solid var(--border)', background: 'var(--paper-2)' }}>
                    <button className="btn btn-ghost btn-sm" onClick={syncPromptsFromSheet} disabled={!gmailToken} style={{ fontSize: 11 }}>Pull from Sheet</button>
                    <button className="btn btn-ghost btn-sm" onClick={pushPromptsToSheet} disabled={!gmailToken} style={{ fontSize: 11 }}>Push to Sheet</button>
                  </div>
                )}
                {savedPrompts.length === 0
                  ? <p style={{ fontSize: 12, color: 'var(--ink-3)', padding: '10px 14px', textAlign: 'center' }}>No saved prompts yet.</p>
                  : savedPrompts.map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                      <button className="btn btn-ghost btn-sm" onClick={() => loadPrompt(p)} style={{ fontSize: 11, flexShrink: 0 }}>Load</button>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { deletePrompt(p.id); showToast(`"${p.name}" deleted`) }} style={{ color: 'var(--ink-3)', flexShrink: 0 }}>
                        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <polyline points="2 4 4 4 14 4"/><path d="M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M13 4l-1 9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2L3 4"/>
                        </svg>
                      </button>
                    </div>
                  ))}
              </div>
            )}

            {promptOpen && (
              <div style={{ background: 'var(--paper)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <textarea value={promptTemplate} onChange={e => setPromptTemplate(e.target.value)}
                  style={{ width: '100%', minHeight: 200, maxHeight: 320, fontFamily: 'var(--mono)', fontSize: 11, lineHeight: 1.7, color: 'var(--ink-2)', background: 'var(--paper-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 10px', resize: 'vertical', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: 'var(--ink-3)', flex: 1 }}>
                    Tokens: <code style={{ fontFamily: 'var(--mono)' }}>{'{{company}}'}</code> · <code style={{ fontFamily: 'var(--mono)' }}>{'{{today}}'}</code>
                  </span>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setPromptTemplate(DEFAULT_PROMPT); showToast('Reset to default') }} style={{ fontSize: 11 }}>Reset</button>
                  <input className="field-input" value={promptName} onChange={e => setPromptName(e.target.value)} placeholder="Prompt name…" style={{ fontSize: 12, width: 150, padding: '4px 8px' }} />
                  <button className="btn btn-ghost btn-sm" onClick={savePrompt} style={{ fontSize: 11 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                    Save prompt
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* API key + model + Run */}
          <div>
            <label className="field-label" style={{ marginBottom: 4 }}>Gemini API key</label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <select value={model} onChange={e => setModel(e.target.value)}
                  style={{ fontFamily: 'var(--sans)', fontSize: 12, background: 'var(--paper-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 24px 7px 9px', color: 'var(--ink)', appearance: 'none', cursor: 'pointer' }}>
                  <option value="gemini-3.5-flash-medium">3.5 Flash Medium</option>
                  <option value="gemini-3.5-flash-high">3.5 Flash High</option>
                </select>
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="var(--ink-3)" strokeWidth="2" strokeLinecap="round" style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><path d="M4 6l4 4 4-4"/></svg>
              </div>
              <div style={{ position: 'relative', flex: 1 }}>
                <input className="field-input" type={showKey ? 'text' : 'password'} value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="AIza…"
                  style={{ fontSize: 13, fontFamily: 'var(--mono)', paddingRight: 36 }} />
                <button onClick={() => setShowKey(v => !v)}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    {showKey
                      ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>
                      : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
                  </svg>
                </button>
              </div>
              <button className="btn btn-accent btn-sm" onClick={run} disabled={running}>
                {running ? <span className="spinner" style={{ width: 11, height: 11 }} /> : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>}
                {running ? 'Running…' : 'Run'}
              </button>
            </div>
            {runStatus && <div style={{ fontSize: 12, color: runStatus.startsWith('Error') ? 'var(--accent)' : 'var(--ink-3)', marginTop: 5, display: 'flex', alignItems: 'center', gap: 6 }}>{running && <span className="spinner" style={{ width: 10, height: 10 }} />}{runStatus}</div>}
          </div>
        </div>

        {/* Output */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {!hasOutput ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, color: 'var(--ink-3)', textAlign: 'center', padding: '1.5rem', background: 'var(--paper-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ opacity: 0.3 }}><path d="M2 20h.01"/><path d="M7 20v-4"/><path d="M12 20v-8"/><path d="M17 20V8"/><path d="M22 4v16"/></svg>
              <p style={{ fontSize: 13 }}>Enter a company name and click Run to generate a sales approach.</p>
            </div>
          ) : (
            <>
              {/* Strategic summary */}
              {summary && (
                <div style={{ background: 'var(--paper-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px', flexShrink: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 7 }}>Strategic summary</div>
                  <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.75, margin: 0 }}>{summary}</p>
                </div>
              )}

              {/* Value propositions */}
              {propositions.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--ink-3)', flexShrink: 0 }}>Value propositions — tick to keep</div>
                  {propositions.map(p => (
                    <label key={p.id} onClick={() => toggleProp(p.id)}
                      style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: p.checked ? 'var(--paper-2)' : 'var(--paper)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 12px', cursor: 'pointer', flexShrink: 0 }}>
                      <input type="checkbox" checked={p.checked} onChange={() => toggleProp(p.id)} onClick={e => e.stopPropagation()}
                        style={{ marginTop: 2, flexShrink: 0, accentColor: 'var(--accent)', width: 15, height: 15, cursor: 'pointer' }} />
                      <span style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.65 }}>{p.text}</span>
                    </label>
                  ))}
                </>
              )}

            </>
          )}
        </div>

        {/* Manual note — always visible above footer when there is output */}
        {hasOutput && (
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', flexShrink: 0, marginBottom: 12 }}>
            <label style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '9px 12px', cursor: 'pointer', background: manualNoteChecked ? 'var(--paper-2)' : 'var(--paper)' }}
              onClick={() => setManualNoteChecked(v => !v)}>
              <input type="checkbox" checked={manualNoteChecked} onChange={() => setManualNoteChecked(v => !v)} onClick={e => e.stopPropagation()}
                style={{ flexShrink: 0, accentColor: 'var(--accent)', width: 15, height: 15, cursor: 'pointer' }} />
              <span style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500 }}>Add manual note</span>
            </label>
            {manualNoteChecked && (
              <textarea
                value={manualNote}
                onChange={e => setManualNote(e.target.value)}
                placeholder="Describe your desired approach, specific angles, or any context to include…"
                style={{ width: '100%', minHeight: 90, fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--ink)', background: 'var(--paper)', border: 'none', borderTop: '1px solid var(--border)', padding: '10px 12px', resize: 'vertical', boxSizing: 'border-box', outline: 'none', lineHeight: 1.6 }}
              />
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
            {propositions.length > 0 ? `${checkedCount} of ${propositions.length} selected` : ''}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={!hasOutput}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              Save {checkedCount > 0 ? checkedCount : ''} item{checkedCount !== 1 ? 's' : ''}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
