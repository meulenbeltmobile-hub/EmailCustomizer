import { useState, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { showToast } from '../components/Toast.jsx'

/* ── helpers ── */
function norm(s) { return (s || '').toString().toLowerCase().replace(/[\s_\-.']/g, '') }

function detectColumns(headers) {
  const find = (...keys) => headers.findIndex(h => keys.some(k => norm(h) === norm(k)))
  return {
    firstname: find('firstname', 'first name', 'first', 'prenom', 'prénom', 'givenname', 'voornaam'),
    lastname:  find('lastname', 'last name', 'last', 'surname', 'nom', 'familyname', 'achternaam'),
    name:      find('name', 'fullname', 'full name', 'nom complet', 'naam'),
    email:     find('email', 'e-mail', 'emailaddress', 'mail', 'emailadres'),
    company:   find('company', 'organisation', 'organization', 'bedrijf', 'entreprise', 'firm', 'account'),
  }
}

function buildRecipients(rows, cols) {
  return rows.map(row => {
    const get = i => (i >= 0 ? (row[i] ?? '').toString().trim() : '')
    const first   = get(cols.firstname)
    const last    = get(cols.lastname)
    const name    = get(cols.name) || [first, last].filter(Boolean).join(' ') || get(cols.email)
    const email   = get(cols.email)
    const company = get(cols.company)
    return { name, email, company, sent: false }
  }).filter(r => r.email && r.email.includes('@') && r.name)
}

function bestMatch(companies, term) {
  if (!term || !companies.length) return companies.length === 1 ? companies[0] : '__ALL__'
  const t = norm(term)
  return (
    companies.find(c => norm(c) === t) ||          // exact (normalised)
    companies.find(c => norm(c).includes(t)) ||    // partial
    companies.find(c => t.includes(norm(c))) ||    // reversed partial
    (companies.length === 1 ? companies[0] : '__ALL__')
  )
}

/* ════════════════════════════════════════════ */
export default function ImportModal({ open, onClose, onImport, prefilterCompany = '' }) {
  const [step, setStep]             = useState('upload')  // 'upload' | 'parsing' | 'filter'
  const [error, setError]           = useState('')
  const [allRows, setAllRows]       = useState([])
  const [companies, setCompanies]   = useState([])
  const [selCompany, setSelCompany] = useState('__ALL__')
  const [filename, setFilename]     = useState('')
  const fileRef    = useRef(null)
  const pendingBuf = useRef(null)   // holds ArrayBuffer/text between setState and setTimeout

  /* reset when modal closes */
  useEffect(() => { if (!open) { setStep('upload'); setError(''); setAllRows([]); setCompanies([]); setSelCompany('__ALL__'); setFilename('') } }, [open])

  function handleClose() { onClose() }

  /* ── step 1: read file → show spinner → parse ── */
  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setError('')

    const reader = new FileReader()
    const isCSV  = file.name.toLowerCase().endsWith('.csv')
    setFilename(file.name)

    reader.onload = ev => {
      pendingBuf.current = { data: ev.target.result, isCSV }
      setStep('parsing')                  // renders spinner first …
    }

    isCSV ? reader.readAsText(file) : reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  /* ── step 2: when 'parsing' renders, actually do the work ── */
  useEffect(() => {
    if (step !== 'parsing' || !pendingBuf.current) return
    const { data, isCSV } = pendingBuf.current
    pendingBuf.current = null

    // Defer so React can paint the spinner before the heavy sync work
    const tid = setTimeout(() => {
      try {
        isCSV ? parseCSV(data) : parseXLSX(data)
      } catch (err) {
        setError('Could not read the file: ' + err.message)
        setStep('upload')
      }
    }, 30)

    return () => clearTimeout(tid)
  }, [step])

  function parseXLSX(buffer) {
    const wb   = XLSX.read(buffer, { type: 'array' })
    const ws   = wb.Sheets[wb.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
    if (data.length < 2) { setError('Sheet appears empty.'); setStep('upload'); return }
    const [headers, ...dataRows] = data
    const cols = detectColumns(headers)
    if (cols.email === -1) { setError('Could not find an Email column — make sure one column is named "Email".'); setStep('upload'); return }
    afterParse(dataRows, cols)
  }

  function parseCSV(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length < 2) { setError('CSV must have a header row and at least one data row.'); setStep('upload'); return }
    const headers  = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim())
    const dataRows = lines.slice(1).map(l => l.split(',').map(c => c.replace(/^"|"$/g, '').trim()))
    const cols = detectColumns(headers)
    if (cols.email === -1) { setError('No email column found.'); setStep('upload'); return }
    afterParse(dataRows, cols)
  }

  function afterParse(dataRows, cols) {
    const parsed  = buildRecipients(dataRows, cols)
    if (!parsed.length) { setError('No valid email addresses found in the file.'); setStep('upload'); return }
    const unique  = [...new Set(parsed.map(r => r.company).filter(Boolean))].sort()
    const autoSel = bestMatch(unique, prefilterCompany)
    setAllRows(parsed)
    setCompanies(unique)
    setSelCompany(autoSel)
    setStep('filter')
  }

  /* ── derived ── */
  const filtered = selCompany === '__ALL__' ? allRows : allRows.filter(r => r.company === selCompany)

  function confirm() {
    onImport(filtered, filename)
    showToast(filtered.length + ' recipient(s) imported', 'success')
    handleClose()
  }

  /* ════ render ════ */
  return (
    <div className={`modal-overlay${open ? ' open' : ''}`} onClick={e => e.target === e.currentTarget && handleClose()}>
      <div className="modal" style={{ width: 540 }}>

        {/* ── UPLOAD ── */}
        {step === 'upload' && <>
          <p className="modal-title">Import recipients</p>
          <p className="modal-sub">
            Upload an <strong>Excel (.xlsx)</strong> or <strong>CSV</strong> file.<br />
            <span style={{ fontSize: 11, fontFamily: 'var(--mono)' }}>Firstname · Lastname · Email · Company</span>
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}> — and variations</span>
          </p>

          <div
            style={{ border: '2px dashed var(--border)', borderRadius: 'var(--radius-lg)', padding: '2rem', textAlign: 'center', cursor: 'pointer', background: 'var(--paper-2)', transition: 'border-color 0.15s' }}
            onClick={() => fileRef.current?.click()}
            onDragOver={e  => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--accent)' }}
            onDragLeave={e => { e.currentTarget.style.borderColor = '' }}
            onDrop={e => {
              e.preventDefault(); e.currentTarget.style.borderColor = ''
              const f = e.dataTransfer.files[0]
              if (f) { const dt = new DataTransfer(); dt.items.add(f); fileRef.current.files = dt.files; handleFile({ target: fileRef.current }) }
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="1.4" strokeLinecap="round" style={{ margin: '0 auto 10px', display: 'block' }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <path d="M12 18v-6M9 15l3-3 3 3"/>
            </svg>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 4 }}>Click to browse or drag &amp; drop</p>
            <p style={{ fontSize: 11, color: 'var(--ink-3)' }}>.xlsx · .xls · .csv</p>
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleFile} />

          {prefilterCompany && (
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              Will auto-select <strong style={{ color: 'var(--ink-2)' }}>{prefilterCompany}</strong>
            </div>
          )}
          {error && <div style={{ color: 'var(--accent)', fontSize: 12, marginTop: 8 }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button className="btn btn-ghost" onClick={handleClose}>Cancel</button>
          </div>
        </>}

        {/* ── PARSING SPINNER ── */}
        {step === 'parsing' && (
          <div style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
            <span className="spinner" style={{ width: 28, height: 28, borderWidth: 3, display: 'inline-block', marginBottom: 16 }} />
            <p style={{ fontSize: 14, color: 'var(--ink-2)', fontWeight: 500 }}>Reading file…</p>
            <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>This may take a moment for large files.</p>
          </div>
        )}

        {/* ── FILTER + PREVIEW ── */}
        {step === 'filter' && <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <p className="modal-title">Select company</p>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={handleClose} title="Close">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg>
            </button>
          </div>
          <p className="modal-sub">Choose which company to import. The preview updates as you select.</p>

          <div style={{ marginBottom: '1rem' }}>
            <label className="field-label" style={{ marginBottom: 6 }}>Company</label>
            {companies.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--ink-3)', fontStyle: 'italic', padding: '8px 0' }}>
                No Company column detected — all {allRows.length} contacts will be imported.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 220, overflowY: 'auto', paddingRight: 2 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--paper-2)', border: `1px solid ${selCompany === '__ALL__' ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius)', cursor: 'pointer', flexShrink: 0 }}>
                  <input type="radio" name="co" checked={selCompany === '__ALL__'} onChange={() => setSelCompany('__ALL__')} style={{ accentColor: 'var(--accent)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>All companies</span>
                  <span className="badge badge-neutral">{allRows.length}</span>
                </label>
                {companies.map(co => (
                  <label key={co} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: selCompany === co ? 'var(--accent-2)' : 'var(--paper-2)', border: `1px solid ${selCompany === co ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius)', cursor: 'pointer', flexShrink: 0 }}>
                    <input type="radio" name="co" checked={selCompany === co} onChange={() => setSelCompany(co)} style={{ accentColor: 'var(--accent)', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{co}</span>
                    <span className="badge badge-neutral">{allRows.filter(r => r.company === co).length}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* preview */}
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>
            Preview — {filtered.length} recipient{filtered.length !== 1 ? 's' : ''}
          </div>
          <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: '1rem' }}>
            {filtered.slice(0, 50).map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', background: 'var(--paper-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--paper-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: 'var(--ink-2)', flexShrink: 0 }}>
                  {(r.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>{r.name}</span>
                  {r.company && selCompany === '__ALL__' && <span style={{ fontSize: 11, color: 'var(--ink-3)', marginLeft: 6 }}>· {r.company}</span>}
                </div>
                <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink-3)', fontSize: 11, flexShrink: 0 }}>{r.email}</span>
              </div>
            ))}
            {filtered.length > 50 && <div style={{ fontSize: 12, color: 'var(--ink-3)', textAlign: 'center', padding: '4px 0' }}>…and {filtered.length - 50} more</div>}
            {filtered.length === 0 && <div style={{ fontSize: 13, color: 'var(--ink-3)', textAlign: 'center', padding: '1rem 0' }}>No recipients for this selection.</div>}
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setStep('upload')}>← Back</button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" onClick={handleClose}>Cancel</button>
              <button className="btn btn-accent" onClick={confirm} disabled={filtered.length === 0}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 10v3h12v-3M8 2v8M5 7l3 3 3-3"/></svg>
                Import {filtered.length} recipient{filtered.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </>}

      </div>
    </div>
  )
}
