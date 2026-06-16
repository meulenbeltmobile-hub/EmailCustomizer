import { useState, useEffect } from 'react'
import { detectEmailSyntax, applySyntax, syntaxLegend } from '../utils/emailSyntax.js'
import { initials } from '../utils/helpers.js'
import { showToast } from '../components/Toast.jsx'

const LI_PEOPLE_URL = (c) => `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(c)}&origin=SWITCH_SEARCH_VERTICAL`

export default function AddModal({ open, onClose, onAdd, recipients, defaultCompany = '' }) {
  const [step, setStep] = useState('names') // 'names' | 'list'
  const [namesText, setNamesText] = useState('')
  const [syntaxInput, setSyntaxInput] = useState('')
  const [detected, setDetected] = useState(null)
  const [drafts, setDrafts] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setStep('names')
      setNamesText('')
      setError('')
      const pool = recipients.filter(r => r.email?.includes('@') && (!defaultCompany || r.company === defaultCompany))
      const result = detectEmailSyntax(pool.length ? pool : recipients.filter(r => r.email?.includes('@')))
      setDetected(result)
      setSyntaxInput(result ? result.pattern : '')
    }
  }, [open])

  const names = namesText.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 25)
  const rawCount = namesText.split('\n').filter(l => l.trim()).length
  const canGenerate = names.length > 0 && syntaxInput.trim()

  function previewEmail() {
    if (syntaxInput && names.length > 0) return 'Preview: ' + applySyntax(syntaxInput, names[0])
    return ''
  }

  function generate() {
    if (!syntaxInput.includes('@')) { setError('Syntax must include a domain (e.g. @company.com).'); return }
    setError('')
    setDrafts(names.map(name => ({ name, email: applySyntax(syntaxInput, name) })))
    setStep('list')
  }

  function confirm() {
    const added = []
    drafts.forEach(d => {
      if (!d.email.includes('@')) return
      if (!recipients.find(r => r.email === d.email)) added.push({ name: d.name, email: d.email, company: defaultCompany, sent: false })
    })
    onAdd(added)
    onClose()
    showToast(added.length + ' recipient(s) added', 'success')
  }

  function insertToken(token) {
    const el = document.getElementById('add-syntax-input')
    if (!el) { setSyntaxInput(syntaxInput + token); return }
    const s = el.selectionStart, e = el.selectionEnd
    const val = syntaxInput.slice(0, s) + token + syntaxInput.slice(e)
    setSyntaxInput(val)
    requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = s + token.length; el.focus() })
  }

  return (
    <div className={`modal-overlay${open ? ' open' : ''}`} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 580 }}>
        <p className="modal-title">Add recipients</p>
        <p className="modal-sub">Enter names (one per line). Email addresses will be generated from the detected syntax.</p>

        {step === 'names' && (
          <>
            <div className="field-group">
              <label className="field-label">Names <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--ink-3)' }}>— max 25</span></label>
              <textarea
                className="field-input"
                rows="6"
                placeholder={"Jean Dupont\nMarie Martin\nLuc Bernard"}
                value={namesText}
                onChange={e => setNamesText(e.target.value)}
                style={{ resize: 'vertical', lineHeight: 1.7, fontSize: 13 }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{Math.min(rawCount, 25)} / 25 names</span>
                {rawCount > 25 && <span style={{ fontSize: 11, color: 'var(--accent)' }}>Only first 25 will be used</span>}
              </div>
            </div>

            <div style={{ background: 'var(--paper-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Detected email syntax</span>
                {detected && <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>detected from {detected.confidence} email(s)</span>}
              </div>

              {!detected ? (
                <div style={{ fontSize: 13, color: 'var(--ink-3)', fontStyle: 'italic' }}>
                  Add existing recipients with emails first to auto-detect, or type a syntax below.
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <code style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--accent)', background: 'var(--accent-2)', padding: '3px 10px', borderRadius: 4 }}>{detected.pattern}</code>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 8 }}>How the syntax works:</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.7, fontFamily: 'var(--mono)' }} dangerouslySetInnerHTML={{ __html: syntaxLegend(detected.pattern) }} />
                </div>
              )}

              <div style={{ marginTop: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--ink-3)', display: 'block', marginBottom: 5 }}>Adjust syntax</label>
                <input
                  id="add-syntax-input"
                  className="field-input"
                  placeholder="e.g. {f}.{last}@company.com"
                  value={syntaxInput}
                  onChange={e => setSyntaxInput(e.target.value)}
                  style={{ fontFamily: 'var(--mono)', fontSize: 13 }}
                />
                <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {['{first}', '{f}', '{last}', '{l}', '{first}{last}'].map(t => (
                    <span key={t} className="ph-chip" onClick={() => insertToken(t)}><code>{t}</code></span>
                  ))}
                </div>
                {previewEmail() && <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 6, fontFamily: 'var(--mono)' }}>{previewEmail()}</div>}
              </div>
            </div>

            {error && <div style={{ color: 'var(--accent)', fontSize: 12, marginBottom: 8 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
              {defaultCompany && (
                <a
                  href={LI_PEOPLE_URL(defaultCompany)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', color: 'var(--ink)' }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="#0A66C2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                  Search LinkedIn
                </a>
              )}
              <button className="btn btn-primary" onClick={generate} disabled={!canGenerate}>Add →</button>
            </div>
          </>
        )}

        {step === 'list' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Generated list</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setStep('names')}>← Edit names</button>
            </div>
            <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5, marginBottom: '1rem' }}>
              {drafts.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--paper-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 10px' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--paper-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: 'var(--ink-2)', flexShrink: 0 }}>
                    {initials(d.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{d.name}</div>
                    <input
                      style={{ fontFamily: 'var(--mono)', fontSize: 11, background: 'transparent', border: 'none', borderBottom: '1px dashed var(--border)', color: 'var(--ink-3)', width: '100%', padding: '1px 0', outline: 'none' }}
                      value={d.email}
                      onChange={e => { const next = [...drafts]; next[i] = { ...next[i], email: e.target.value }; setDrafts(next) }}
                    />
                  </div>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setDrafts(drafts.filter((_, j) => j !== i))} title="Remove">
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg>
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn btn-accent" onClick={confirm}>Add to recipients</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
