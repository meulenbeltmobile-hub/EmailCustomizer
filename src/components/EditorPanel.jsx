export default function EditorPanel({
  masterTemplate, templateExists,
  companyNewsItems,
  customEmail, customState,
  onCreateTemplate, onViewTemplate,
  onFetchNews, onViewNews,
  onGenerateCustom, onViewCustom,
}) {
  return (
    <section className="panel editor-panel" style={{ borderRight: 'none', overflowY: 'auto' }}>

      {/* Master Template */}
      <div className="panel-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="panel-title">Master Template</span>
      </div>

      <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
        {!templateExists ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" style={{ opacity: 0.2, flexShrink: 0 }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 1 }}>No template yet</p>
              <p style={{ fontSize: 12, color: 'var(--ink-3)' }}>Create a master email to send to all recipients.</p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={onCreateTemplate}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 3v10M3 8h10"/></svg>
              Create
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{masterTemplate.subject || '(no subject)'}</span>
                <span className="badge badge-green" style={{ flexShrink: 0 }}>✓ Saved</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {(masterTemplate.body || '').replace(/\n/g, ' ').slice(0, 120)}{(masterTemplate.body || '').length > 120 ? '…' : ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button className="btn btn-ghost btn-sm" onClick={onCreateTemplate}>Edit</button>
              <button className="btn btn-primary btn-sm" onClick={onViewTemplate}>View</button>
            </div>
          </div>
        )}
      </div>

      {/* Company Information */}
      <div className="panel-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 0 }}>
        <span className="panel-title">Company Information</span>
      </div>

      <div style={{ padding: '0.875rem 1.25rem' }}>
        {companyNewsItems.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" style={{ opacity: 0.2, flexShrink: 0 }}>
              <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v2"/>
              <path d="M2 16h10M2 20h6M2 12h12"/>
            </svg>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 1 }}>No news yet</p>
              <p style={{ fontSize: 12, color: 'var(--ink-3)' }}>Fetch company news to personalise your emails.</p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={onFetchNews}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 3v10M3 8h10"/></svg>
              Fetch news
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>Company</span>
                <span className="badge badge-green">✓ Saved</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{companyNewsItems.length} news item{companyNewsItems.length !== 1 ? 's' : ''} saved</div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button className="btn btn-ghost btn-sm" onClick={onFetchNews}>Edit</button>
              <button className="btn btn-primary btn-sm" onClick={onViewNews}>View news</button>
            </div>
          </div>
        )}
      </div>

      {/* Customized Email Template */}
      <div className="panel-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 0, borderTop: '1px solid var(--border)' }}>
        <span className="panel-title">Customized Email Template</span>
      </div>

      <div style={{ padding: '0.875rem 1.25rem' }}>
        {customState !== 'saved' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" style={{ opacity: 0.2, flexShrink: 0 }}>
              <path d="M12 20h9"/>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 1 }}>Not generated yet</p>
              <p style={{ fontSize: 12, color: 'var(--ink-3)' }}>Generate a personalized email using your template and company news.</p>
            </div>
            <button className="btn btn-accent btn-sm" onClick={onGenerateCustom}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
              </svg>
              Generate
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{customEmail.subject || '(no subject)'}</span>
                <span className="badge badge-green" style={{ flexShrink: 0 }}>✓ Ready</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {(customEmail.body || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120)}
                {(customEmail.body || '').length > 120 ? '…' : ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button className="btn btn-ghost btn-sm" onClick={onGenerateCustom}>Edit</button>
              <button className="btn btn-primary btn-sm" onClick={onViewCustom}>View</button>
            </div>
          </div>
        )}
      </div>

    </section>
  )
}
