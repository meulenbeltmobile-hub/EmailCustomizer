import { useState, useEffect } from 'react'
import { showToast } from '../components/Toast.jsx'

/* ── Default prompt template — uses {{company}}, {{lookback}}, {{since}}, {{today}} ── */
const DEFAULT_PROMPT_TEMPLATE = `You are a Senior Business Intelligence Analyst specializing in commercial prospecting for the global logistics and supply chain industry.

Your goal is to identify whether the company provided by the user shows recent commercial trigger signals that could justify sales outreach, account prioritization, partnership discussion, or CRM enrichment.

Company to analyze:
{{company}}

Task:
Conduct a web search specifically for this logistics company. Search across:
- Official company websites, newsrooms, press releases, blogs, and career pages
- Financial and business news sources such as Bloomberg, Reuters, Financial Times, Les Echos, Handelsblatt, etc.
- Logistics and transport industry publications such as The Loadstar, Journal of Commerce, FreightWaves, Transport Intelligence, Supply Chain Dive, Supply Chain Movement, etc.
- Local or regional business and logistics media
- Technology, SaaS, automation, AI, digital transformation, warehouse management, transport management, and supply chain software publications when relevant
- LinkedIn company pages, LinkedIn posts from the company, executive announcements, employee posts when publicly accessible, and LinkedIn job postings when they reveal expansion, operational pressure, technology adoption, transformation, transport planning, or organizational change
- Public job postings or hiring signals when they reveal expansion, operational pressure, technology adoption, or organizational change

Search and language rules:
1. Multilingual search:
   If the company name appears to be non-English, search both in English and in the company's local language.
   Examples:
   - For a German company: search "[company name] logistics", "[company name] transport", "[company name] Logistik"
   - For a Turkish company: search "[company name] logistics", "[company name] transport", "[company name] taşımacılık"
   - For a French company: search "[company name] logistics", "[company name] transport", "[company name] logistique"
   - For a Polish company: search "[company name] logistics", "[company name] transport", "[company name] logistyka"

2. English-only output:
   Regardless of the source language, translate all findings and provide the final response strictly in English.

3. Disambiguation:
   Add keywords such as "logistics", "transport", "freight", "forwarding", "supply chain", "warehouse", "shipping", "last mile", "parcel", "3PL", or "contract logistics" to avoid confusing the target with unrelated companies sharing the same name.

Date constraint:
Only include updates that occurred within the last {{lookback}} days from today (since {{since}}).

Negative result rule:
If no high-signal information is found for the logistics entity within the last {{lookback}} days, still return the company name and set:
"nothing_found": true

Prioritize the following commercial prospecting signals:

1. Growth, expansion, or capacity increase
   Examples:
   - New warehouses, depots, hubs, or fulfillment centers
   - New freight routes, geographies, countries, or service lines
   - Fleet expansion, electrification, or equipment investment
   - New customer contracts or contract renewals
   - Growth in e-commerce, last-mile, cold chain, healthcare logistics, or cross-border logistics

2. Digitalization, automation, or technology adoption
   Examples:
   - TMS, WMS, OMS, visibility platform, route optimization, yard management, or control tower initiatives
   - AI, automation, robotics, IoT, telematics, data analytics, or predictive planning projects
   - Digital forwarding initiatives
   - Customer portal, track-and-trace, API, EDI, or real-time visibility improvements
   - Cybersecurity, data, or IT modernization programs

3. Operational pain or business pressure
   Examples:
   - Delivery performance issues
   - Labor shortages or hiring surges
   - Cost pressure, margin pressure, fuel cost exposure, or productivity challenges
   - Customs, compliance, or cross-border complexity
   - Warehouse congestion, network redesign, or service quality issues
   - Safety incidents, environmental compliance pressure, or operational disruptions

4. Leadership, organization, or strategy changes
   Examples:
   - CEO, CFO, COO, CIO, CTO, CDO, supply chain, operations, or transformation leadership changes
   - New strategic plan
   - Restructuring, reorganization, integration, or transformation program
   - New sustainability, digital, customer experience, or operational excellence roadmap

5. Financial or corporate activity
   Examples:
   - Funding rounds
   - M&A activity
   - Acquisition rumors
   - Debt restructuring
   - Revenue or profit announcements
   - Bankruptcy, insolvency, or turnaround signals

6. Risk or regulatory trigger
   Examples:
   - Sanctions
   - Compliance issues
   - Customs problems
   - Labor disputes
   - Environmental regulation impact
   - Safety incidents
   - Legal disputes

Scoring rules:

- prospecting_signal_strength:
  - "High": multiple strong and recent signals suggesting an active commercial opportunity, urgent business need, expansion, transformation, or operational pressure
  - "Medium": at least one meaningful signal that could support targeted sales outreach
  - "Low": minor update with limited commercial relevance
  - "None": no meaningful prospecting signal found

- sales_relevance_score:
  Use a score from 1 to 10:
  - 1-3: low commercial relevance or weak reason to reach out
  - 4-6: moderate commercial relevance; useful for CRM enrichment or low-priority outreach
  - 7-8: strong commercial relevance; good reason for targeted outreach
  - 9-10: very strong commercial trigger; likely timely and actionable sales opportunity

For each update, infer the likely sales relevance. Be explicit about the commercial logic, but do not invent facts not supported by the sources.

Output requirements:
Return strictly valid JSON.
Do not include prose.
Do not include markdown.
Do not include explanations outside the JSON.

Use this JSON schema:

{
  "company_name": "{{company}}",
  "report_date": "{{today}}",
  "prospecting_signal_strength": "High|Medium|Low|None",
  "top_updates": [
    {
      "title": "Clear, descriptive title",
      "summary": "Detailed English summary explaining what happened and why it matters for commercial prospecting.",
      "category": "Expansion|Digitalization|Automation|Technology|Partnership|Funding|Leadership|Regulatory|M&A|Financial|Operational|Hiring|Sustainability|Risk|Other",
      "date": "YYYY-MM-DD",
      "source_name": "Source name",
      "source_url": "URL",
      "commercial_trigger": "The concrete reason this news could justify outreach.",
      "likely_pain_point": "The likely business pain or need suggested by the update, if any.",
      "suggested_sales_angle": "A concise sales angle or message theme that could be used for outreach.",
      "recommended_persona": "Most relevant target persona, such as COO, Operations Director, CIO, CTO, Supply Chain Director, Transport Director, Warehouse Director, Sustainability Director, or CEO.",
      "sales_relevance_score": 1
    }
  ],
  "recommended_next_action": "Prioritize outreach|Add to nurture|Monitor only|No action",
  "nothing_found": false
}

Important:
If nothing relevant is found, return:
{
  "company_name": "{{company}}",
  "report_date": "{{today}}",
  "prospecting_signal_strength": "None",
  "top_updates": [],
  "recommended_next_action": "No action",
  "nothing_found": true
}`

function resolvePrompt(template, name, days) {
  const today = new Date().toISOString().split('T')[0]
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  return template
    .replace(/\{\{company\}\}/g, name)
    .replace(/\{\{lookback\}\}/g, days)
    .replace(/\{\{since\}\}/g, since)
    .replace(/\{\{today\}\}/g, today)
}

export default function CompanyModal({ open, onClose, onSave, savedItems, initialCompany = '' }) {
  const [companyName, setCompanyName]   = useState('')
  const [lookbackDays, setLookbackDays] = useState(14)
  const [apiKey, setApiKey]             = useState(import.meta.env.VITE_GEMINI_API_KEY || '')
  const [model, setModel]               = useState('gemini-3.5-flash')
  const [showKey, setShowKey]           = useState(false)
  const [pending, setPending]           = useState([])
  const [running, setRunning]           = useState(false)
  const [runStatus, setRunStatus]       = useState('')
  const [signalStrength, setSignalStrength] = useState('')

  // Prompt editor — persisted so the active prompt survives page refresh
  const [promptTemplate, setPromptTemplate] = useState(() => {
    try { return localStorage.getItem('ec_activePrompt') || DEFAULT_PROMPT_TEMPLATE } catch { return DEFAULT_PROMPT_TEMPLATE }
  })
  const [promptName, setPromptName] = useState(() => {
    try { return localStorage.getItem('ec_activePromptName') || '' } catch { return '' }
  })
  const [promptOpen, setPromptOpen]         = useState(false)
  const [libraryOpen, setLibraryOpen]       = useState(false)
  const [savedPrompts, setSavedPrompts]     = useState(() => {
    try { return JSON.parse(localStorage.getItem('ec_savedPrompts')) || [] } catch { return [] }
  })

  useEffect(() => {
    localStorage.setItem('ec_savedPrompts', JSON.stringify(savedPrompts))
  }, [savedPrompts])

  useEffect(() => {
    localStorage.setItem('ec_activePrompt', promptTemplate)
  }, [promptTemplate])

  useEffect(() => {
    localStorage.setItem('ec_activePromptName', promptName)
  }, [promptName])

  useEffect(() => {
    if (open) {
      setCompanyName(initialCompany)
      setPending(savedItems.map(i => ({ ...i, checked: true })))
      setRunStatus('')
      setSignalStrength('')
    }
  }, [open])

  const checkedCount = pending.filter(i => i.checked).length

  function toggleItem(id) {
    setPending(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i))
  }

  function loadPrompt(p) {
    setPromptTemplate(p.text)
    setPromptName(p.name)
    setLibraryOpen(false)
    setPromptOpen(true)
    showToast(`Loaded "${p.name}"`, 'success')
  }

  function savePrompt() {
    const name = promptName.trim()
    if (!name) { showToast('Enter a prompt name first', 'error'); return }
    const existing = savedPrompts.find(p => p.name === name)
    if (existing) {
      setSavedPrompts(prev => prev.map(p => p.name === name ? { ...p, text: promptTemplate } : p))
      showToast(`"${name}" updated`, 'success')
    } else {
      setSavedPrompts(prev => [...prev, { id: Date.now(), name, text: promptTemplate }])
      showToast(`"${name}" saved`, 'success')
    }
  }

  function deletePrompt(id) {
    setSavedPrompts(prev => prev.filter(p => p.id !== id))
  }

  async function runNewsPrompt() {
    if (!companyName.trim()) { showToast('Please enter a company name first', 'error'); return }
    if (!apiKey.trim())      { showToast('Please enter your Gemini API key', 'error'); return }
    setRunning(true)
    setRunStatus('Searching…')
    setSignalStrength('')
    const name     = companyName.trim()
    const resolved = resolvePrompt(promptTemplate, name, lookbackDays)
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: resolved }] }],
            tools: [{ google_search: {} }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 8192 }
          })
        }
      )
      const data = await res.json()
      if (data.error) throw new Error(data.error.message)
      const text   = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('')
      const clean = text.replace(/```json|```/g, '').trim()
      const match = clean.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('No JSON found in response')
      const parsed = JSON.parse(match[0])

      if (parsed.nothing_found) {
        setPending([])
        setRunStatus('No significant signals found in the last 90 days.')
      } else {
        const updates = parsed.top_updates || []
        setPending(updates.map((item, i) => ({
          id: Date.now() + i,
          title:   item.title,
          date:    item.date,
          summary: item.summary,
          source:  item.source_name,
          source_url: item.source_url,
          commercial_trigger:    item.commercial_trigger,
          likely_pain_point:     item.likely_pain_point,
          suggested_sales_angle: item.suggested_sales_angle,
          recommended_persona:   item.recommended_persona,
          sales_relevance_score: item.sales_relevance_score,
          category: item.category,
          checked: true
        })))
        setSignalStrength(parsed.prospecting_signal_strength || '')
        setRunStatus('')
      }
    } catch (e) {
      setRunStatus('Error — ' + (e.message || 'check your key and try again.'))
      console.error(e)
    }
    setRunning(false)
  }

  function save() {
    onSave(pending.filter(i => i.checked).map(({ checked, ...rest }) => rest))
    onClose()
    showToast(checkedCount + ' news item(s) saved', 'success')
  }

  const signalColor = { High: '#2d6a4f', Medium: '#b45309', Low: 'var(--ink-3)', None: 'var(--ink-3)' }
  const signalBg    = { High: '#d8f3dc',  Medium: '#fef3c7',  Low: 'var(--paper-2)', None: 'var(--paper-2)' }

  return (
    <div className={`modal-overlay${open ? ' open' : ''}`} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 720, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexShrink: 0 }}>
          <p className="modal-title">Company intelligence</p>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose} title="Close">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg>
          </button>
        </div>
        <p className="modal-sub">Fetch recent commercial trigger signals using Gemini + Google Search. Tick the items you want to keep.</p>

        {/* ── inputs ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12, flexShrink: 0 }}>

          {/* Company + Lookback */}
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label className="field-label" style={{ marginBottom: 4 }}>Company name</label>
              <input className="field-input" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. Kuehne+Nagel" style={{ fontSize: 13 }} />
            </div>
            <div style={{ width: 130, flexShrink: 0 }}>
              <label className="field-label" style={{ marginBottom: 4 }}>Lookback window</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input className="field-input" type="number" min="1" max="365" value={lookbackDays}
                  onChange={e => setLookbackDays(Math.max(1, Math.min(365, +e.target.value || 14)))}
                  style={{ fontSize: 13, textAlign: 'right', width: '100%' }} />
                <span style={{ fontSize: 12, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>days</span>
              </div>
            </div>
          </div>

          {/* ── Prompt editor accordion ── */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--paper-2)', borderBottom: promptOpen ? '1px solid var(--border)' : 'none' }}>
              <button type="button" onClick={() => setPromptOpen(v => !v)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--ink-2)', fontWeight: 500 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                  Intelligence prompt
                  {promptName && <span style={{ fontWeight: 400, color: 'var(--ink-3)', fontSize: 11 }}>— {promptName}</span>}
                </span>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                  style={{ transform: promptOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                  <path d="M4 6l4 4 4-4"/>
                </svg>
              </button>
              {/* Saved prompts library toggle */}
              <button type="button" onClick={() => setLibraryOpen(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 10px', background: 'none', border: 'none', borderLeft: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--ink-3)', fontWeight: 500, whiteSpace: 'nowrap' }}
                title="Saved prompts">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                Saved
                {savedPrompts.length > 0 && <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--paper-3)', color: 'var(--ink-3)', borderRadius: 99, padding: '1px 6px' }}>{savedPrompts.length}</span>}
              </button>
            </div>

            {/* Saved prompts library */}
            {libraryOpen && (
              <div style={{ background: 'var(--paper)', borderBottom: '1px solid var(--border)', maxHeight: 160, overflowY: 'auto' }}>
                {savedPrompts.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--ink-3)', padding: '10px 14px', textAlign: 'center' }}>No saved prompts yet.</p>
                ) : savedPrompts.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => loadPrompt(p)} style={{ fontSize: 11, flexShrink: 0 }}>Load</button>
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { deletePrompt(p.id); showToast(`"${p.name}" deleted`) }} title="Delete" style={{ color: 'var(--ink-3)', flexShrink: 0 }}>
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="2 4 4 4 14 4"/><path d="M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M13 4l-1 9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2L3 4"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Editable textarea */}
            {promptOpen && (
              <div style={{ background: 'var(--paper)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <textarea
                  value={promptTemplate}
                  onChange={e => setPromptTemplate(e.target.value)}
                  style={{ width: '100%', minHeight: 300, maxHeight: 420, fontFamily: 'var(--mono)', fontSize: 11, lineHeight: 1.7, color: 'var(--ink-2)', background: 'var(--paper-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 10px', resize: 'vertical', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: 'var(--ink-3)', flex: 1 }}>
                    Tokens: <code style={{ fontFamily: 'var(--mono)' }}>{'{{company}}'}</code> · <code style={{ fontFamily: 'var(--mono)' }}>{'{{lookback}}'}</code> · <code style={{ fontFamily: 'var(--mono)' }}>{'{{since}}'}</code> · <code style={{ fontFamily: 'var(--mono)' }}>{'{{today}}'}</code>
                  </span>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setPromptTemplate(DEFAULT_PROMPT_TEMPLATE); showToast('Reset to default') }} style={{ fontSize: 11 }}>Reset</button>
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
                  style={{ fontFamily: 'var(--sans)', fontSize: 12, background: 'var(--paper-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 24px 7px 9px', color: 'var(--ink)', appearance: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
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
                <input className="field-input" type={showKey ? 'text' : 'password'} value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="AIza…"
                  style={{ fontSize: 13, fontFamily: 'var(--mono)', paddingRight: 36 }} />
                <button onClick={() => setShowKey(v => !v)} title="Show/hide key"
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 0, lineHeight: 1 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    {showKey
                      ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>
                      : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
                  </svg>
                </button>
              </div>
              <button className="btn btn-accent btn-sm" onClick={runNewsPrompt} disabled={running}>
                {running ? <span className="spinner" style={{ width: 11, height: 11 }} /> : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>}
                {running ? 'Searching…' : 'Run'}
              </button>
            </div>
            {runStatus && <div style={{ fontSize: 12, color: runStatus.startsWith('Error') ? 'var(--accent)' : 'var(--ink-3)', marginTop: 5 }}>{runStatus}</div>}
          </div>
        </div>

        {/* Signal strength badge */}
        {signalStrength && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Prospecting signal:</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 99, background: signalBg[signalStrength] || 'var(--paper-2)', color: signalColor[signalStrength] || 'var(--ink-2)' }}>{signalStrength}</span>
          </div>
        )}

        {pending.length > 0 && (
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8, flexShrink: 0 }}>Signal updates — tick to keep</div>
        )}

        {/* Results */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 12 }}>
          {pending.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, color: 'var(--ink-3)', textAlign: 'center', padding: '1.5rem', background: 'var(--paper-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ opacity: 0.3 }}><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v2"/><path d="M2 16h10M2 20h6M2 12h12"/></svg>
              <p style={{ fontSize: 13 }}>Enter a company name and run to fetch intelligence signals.</p>
            </div>
          ) : pending.map(item => (
            <label key={item.id} onClick={() => toggleItem(item.id)} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: item.checked ? 'var(--paper-2)' : 'var(--paper)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 12px', cursor: 'pointer' }}>
              <input type="checkbox" checked={item.checked} onChange={() => toggleItem(item.id)} onClick={e => e.stopPropagation()} style={{ marginTop: 3, flexShrink: 0, accentColor: 'var(--accent)', width: 15, height: 15, cursor: 'pointer' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{item.title}</span>
                  {item.date && <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--mono)' }}>{item.date}</span>}
                  {item.category && <span className="badge badge-neutral" style={{ fontSize: 10 }}>{item.category}</span>}
                  {item.source && <a href={item.source_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 10, color: 'var(--accent)', textDecoration: 'none' }}>{item.source} ↗</a>}
                  {item.sales_relevance_score && (
                    <span style={{ fontSize: 10, fontWeight: 700, marginLeft: 'auto', color: item.sales_relevance_score >= 7 ? '#2d6a4f' : item.sales_relevance_score >= 4 ? '#b45309' : 'var(--ink-3)' }}>Score {item.sales_relevance_score}/10</span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.65, margin: '0 0 6px' }}>{item.summary}</p>
                {item.commercial_trigger && <p style={{ fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.5, margin: '0 0 2px' }}><strong style={{ color: 'var(--ink-2)' }}>Trigger:</strong> {item.commercial_trigger}</p>}
                {item.suggested_sales_angle && <p style={{ fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.5, margin: 0 }}><strong style={{ color: 'var(--ink-2)' }}>Angle:</strong> {item.suggested_sales_angle}{item.recommended_persona && <span> · <em>{item.recommended_persona}</em></span>}</p>}
              </div>
            </label>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{pending.length > 0 ? `${checkedCount} of ${pending.length} selected` : ''}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={checkedCount === 0}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              Save {checkedCount > 0 ? checkedCount : ''} item{checkedCount !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
