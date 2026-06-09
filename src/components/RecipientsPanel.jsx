import { useState, useEffect } from 'react'

export default function RecipientsPanel({ recipients, activeIndex, onRecipientsChange, onSelectRecipient, onAddClick, onImportClick, manualCompany, onManualCompanyChange, importHistory = [], onReImport, onDeleteHistory, onVisibleCountChange }) {
  const [companyFilter, setCompanyFilter] = useState('__ALL__')
  const [selected, setSelected] = useState(new Set())
  const [selectedHistoryId, setSelectedHistoryId] = useState('__NEW__')

  // Auto-select the most recent import when history updates
  useEffect(() => {
    if (importHistory.length > 0) setSelectedHistoryId(importHistory[0].id)
  }, [importHistory.length])

  /* ── company options from current recipients ── */
  const companies = [...new Set(recipients.map(r => r.company).filter(Boolean))].sort()
  const showFilter = companies.length > 0

  // Dropdown → Company field: when user picks a company in the filter, sync upward
  function handleFilterChange(val) {
    setCompanyFilter(val)
    if (val !== '__ALL__') onManualCompanyChange(val)
    else onManualCompanyChange('')
  }

  // Company field → Dropdown: when user types, find best match and auto-select it
  useEffect(() => {
    if (!showFilter) return
    const term = manualCompany.trim().toLowerCase()
    if (!term) { setCompanyFilter('__ALL__'); return }
    const exact   = companies.find(c => c.toLowerCase() === term)
    const partial = companies.find(c => c.toLowerCase().includes(term))
    const reverse = companies.find(c => term.includes(c.toLowerCase()))
    setCompanyFilter(exact || partial || reverse || '__ALL__')
  }, [manualCompany])

  /* ── filtered list ── */
  const visible = recipients
    .filter(r => companyFilter === '__ALL__' || r.company === companyFilter)

  useEffect(() => { onVisibleCountChange?.(visible.length, visible) }, [visible.length])

  /* ── keep activeIndex in sync when filter changes ── */
  const visibleActiveIdx = visible.findIndex(r => recipients.indexOf(r) === activeIndex)

  function toggleSelect(email) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(email) ? next.delete(email) : next.add(email)
      return next
    })
  }

  function deleteSelected() {
    const next = recipients.filter(r => !selected.has(r.email))
    onRecipientsChange(next)
    setSelected(new Set())
    onSelectRecipient(0)
  }

  return (
    <aside className="panel">

      {/* ── COMPANY ── */}
      <div style={{ padding: '0.75rem 1.25rem 0.625rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <label className="field-label" style={{ marginBottom: 5 }}>Company</label>
        <input
          className="field-input"
          value={manualCompany}
          onChange={e => onManualCompanyChange(e.target.value)}
          placeholder="e.g. Acme Corp"
          style={{ fontSize: 13 }}
        />
      </div>

      {/* ── IMPORT ── */}
      <div style={{ padding: '0.75rem 1.25rem 0.75rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: importHistory.length > 0 ? 8 : 0 }}>
          <span className="panel-title">Import</span>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              if (selectedHistoryId === '__NEW__') {
                onImportClick(manualCompany.trim())
              } else {
                const entry = importHistory.find(h => h.id === selectedHistoryId)
                if (entry) onReImport(entry.recipients)
              }
            }}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M2 10v3h12v-3M8 2v8M5 7l3 3 3-3"/>
            </svg>
            Import
          </button>
        </div>
        {importHistory.length > 0 && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <select
                value={selectedHistoryId}
                onChange={e => setSelectedHistoryId(e.target.value === '__NEW__' ? '__NEW__' : +e.target.value)}
                style={{
                  width: '100%', fontFamily: 'var(--sans)', fontSize: 12,
                  background: 'var(--paper-2)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', padding: '6px 26px 6px 9px',
                  color: 'var(--ink)', appearance: 'none', cursor: 'pointer',
                }}
              >
                {importHistory.map(h => (
                  <option key={h.id} value={h.id}>{h.filename}</option>
                ))}
                <option value="__NEW__">— Import new file…</option>
              </select>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="var(--ink-3)" strokeWidth="2" strokeLinecap="round" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <path d="M4 6l4 4 4-4"/>
              </svg>
            </div>
            {selectedHistoryId !== '__NEW__' && (
              <button
                className="btn btn-ghost btn-sm btn-icon"
                title="Remove from history"
                onClick={() => {
                  onDeleteHistory(selectedHistoryId)
                  setSelectedHistoryId(
                    importHistory.length > 1
                      ? importHistory.find(h => h.id !== selectedHistoryId)?.id ?? '__NEW__'
                      : '__NEW__'
                  )
                }}
                style={{ color: 'var(--accent)', flexShrink: 0 }}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="2 4 4 4 14 4"/><path d="M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M13 4l-1 9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2L3 4"/>
                </svg>
              </button>
            )}
          </div>
        )}
        {selectedHistoryId === '__NEW__' && manualCompany.trim() && (
          <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 5 }}>
            Will filter on <strong style={{ color: 'var(--ink-2)' }}>{manualCompany.trim()}</strong>
          </p>
        )}
      </div>

      {/* ── RECIPIENTS ── */}
      <div className="panel-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="panel-title">Recipients</span>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {selected.size > 0 && (
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)', fontSize: 11 }} onClick={deleteSelected} title="Delete selected">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="2 4 4 4 14 4"/><path d="M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M13 4l-1 9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2L3 4"/>
              </svg>
              Delete {selected.size}
            </button>
          )}
          <button className="btn btn-ghost btn-sm btn-icon" title="Add recipient" onClick={onAddClick}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M8 3v10M3 8h10"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="panel-body">
        {/* ── Company dropdown filter — only when imported recipients carry a company field ── */}
        {showFilter && (
          <div style={{ marginTop: 12, marginBottom: 4 }}>
            <label className="field-label" style={{ marginBottom: 5 }}>Filter by company</label>
            <div style={{ position: 'relative' }}>
              <select
                value={companyFilter}
                onChange={e => handleFilterChange(e.target.value)}
                style={{
                  width: '100%',
                  fontFamily: 'var(--sans)', fontSize: 13,
                  background: 'var(--paper-2)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', padding: '7px 28px 7px 10px',
                  color: 'var(--ink)', appearance: 'none', cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
              >
                <option value="__ALL__">All companies ({recipients.length})</option>
                {companies.map(co => (
                  <option key={co} value={co}>
                    {co} ({recipients.filter(r => r.company === co).length})
                  </option>
                ))}
              </select>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="var(--ink-3)" strokeWidth="2" strokeLinecap="round" style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <path d="M4 6l4 4 4-4"/>
              </svg>
            </div>
          </div>
        )}

        {/* ── recipient list ── */}
        <div className="recipient-list">
          {visible.length === 0 ? (
            <div className="empty-state">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <p>{recipients.length > 0 ? 'No recipients match this filter' : 'Import an Excel or CSV file\nor add recipients manually'}</p>
            </div>
          ) : visible.map((r, visIdx) => (
            <div
              key={r.email + visIdx}
              className="recipient-item"
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', cursor: 'default' }}
            >
              <input
                type="checkbox"
                checked={selected.has(r.email)}
                onChange={() => toggleSelect(r.email)}
                style={{ accentColor: 'var(--accent)', flexShrink: 0, cursor: 'pointer' }}
              />
              <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-2)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.email}
              </span>
              {r.sent && <div className="dot-sent" title="Draft saved" style={{ flexShrink: 0 }} />}
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
