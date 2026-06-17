export default function ViewApproachModal({ open, onClose, approach = '' }) {
  if (!open) return null

  // Convert markdown-ish text to readable HTML sections
  function renderApproach(text) {
    const lines = text.split('\n')
    const out = []
    let i = 0
    while (i < lines.length) {
      const line = lines[i]
      if (line.startsWith('## ')) {
        out.push(
          <h3 key={i} style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', letterSpacing: '0.02em', margin: '20px 0 8px', paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
            {line.replace(/^## /, '')}
          </h3>
        )
      } else if (line.startsWith('# ')) {
        out.push(
          <h2 key={i} style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', margin: '0 0 14px' }}>
            {line.replace(/^# /, '')}
          </h2>
        )
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        const bullets = []
        while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
          bullets.push(<li key={i} style={{ marginBottom: 5 }}>{renderInline(lines[i].replace(/^[-*] /, ''))}</li>)
          i++
        }
        out.push(<ul key={`ul-${i}`} style={{ margin: '6px 0 10px 18px', padding: 0 }}>{bullets}</ul>)
        continue
      } else if (line.trim() === '') {
        // skip blank lines between sections
      } else {
        out.push(<p key={i} style={{ margin: '0 0 8px', lineHeight: 1.75 }}>{renderInline(line)}</p>)
      }
      i++
    }
    return out
  }

  function renderInline(text) {
    // bold **text**
    const parts = text.split(/(\*\*[^*]+\*\*)/)
    return parts.map((p, i) =>
      p.startsWith('**') && p.endsWith('**')
        ? <strong key={i}>{p.slice(2, -2)}</strong>
        : p
    )
  }

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 760, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
          <p className="modal-title">Sales approach</p>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg>
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.75 }}>
          {renderApproach(approach)}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, flexShrink: 0 }}>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
