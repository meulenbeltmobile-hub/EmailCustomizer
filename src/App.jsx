import { useState, useEffect } from 'react'
import { useToast, ToastContainer, showToast } from './components/Toast.jsx'
import Topbar from './components/Topbar.jsx'
import RecipientsPanel from './components/RecipientsPanel.jsx'
import EditorPanel from './components/EditorPanel.jsx'
import ImportModal from './modals/ImportModal.jsx'
import AddModal from './modals/AddModal.jsx'
import TemplateModal from './modals/TemplateModal.jsx'
import ViewModal from './modals/ViewModal.jsx'
import CompanyModal from './modals/CompanyModal.jsx'
import ViewNewsModal from './modals/ViewNewsModal.jsx'
import CustomEmailModal from './modals/CustomEmailModal.jsx'
import ViewCustomModal from './modals/ViewCustomModal.jsx'
import CompanyApproachModal from './modals/CompanyApproachModal.jsx'
import ModifyApproachModal from './modals/ModifyApproachModal.jsx'
import ViewApproachModal from './modals/ViewApproachModal.jsx'
import ConfigModal from './modals/ConfigModal.jsx'
import { applyTpl } from './utils/helpers.js'
import { createGmailDraft } from './utils/gmailApi.js'

export default function App() {
  const { toasts, addToast } = useToast()

  // Recipients
  const [recipients, setRecipients] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('ec_recipients')) || []
      return saved.map(r => ({ ...r, sent: false }))
    } catch { return [] }
  })
  const [activeIndex, setActiveIndex] = useState(0)

  // Master template
  const [masterTemplate, setMasterTemplate] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ec_masterTemplate')) || { subject: '', body: '', name: '', id: null } }
    catch { return { subject: '', body: '', name: '', id: null } }
  })
  const [savedTemplates, setSavedTemplates] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ec_savedTemplates')) || [] }
    catch { return [] }
  })
  const templateExists = !!(masterTemplate.subject || masterTemplate.body)

  // Company news
  const [companyNewsItems, setCompanyNewsItems] = useState([])

  // Company approach
  const [companyApproach, setCompanyApproach] = useState(() => {
    try { return localStorage.getItem('ec_companyApproach') || '' } catch { return '' }
  })
  const approachState = companyApproach ? 'saved' : 'empty'

  // Custom email
  const [customEmail, setCustomEmail] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ec_customEmail')) || { subject: '', body: '' } } catch { return { subject: '', body: '' } }
  })
  const [customState, setCustomState] = useState(() => {
    try { return localStorage.getItem('ec_customState') || 'empty' } catch { return 'empty' }
  })

  // Gmail OAuth
  const [gmailAuth, setGmailAuth] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('ec_gmailAuth')) || null } catch { return null }
  })
  function handleGmailConnect(auth) {
    setGmailAuth(auth)
    sessionStorage.setItem('ec_gmailAuth', JSON.stringify(auth))
  }
  function handleGmailDisconnect() {
    setGmailAuth(null)
    sessionStorage.removeItem('ec_gmailAuth')
    showToast('Gmail disconnected')
  }
  function getValidToken() {
    if (!gmailAuth) return null
    if (Date.now() > gmailAuth.expiresAt) { handleGmailDisconnect(); return null }
    return gmailAuth.token
  }

  // Company name
  const [manualCompany, setManualCompany] = useState('')
  const [visibleRecipientCount, setVisibleRecipientCount] = useState(0)
  const [visibleRecipients, setVisibleRecipients] = useState([])
  const [selectedRecipients, setSelectedRecipients] = useState([])

  // Import history
  const [importHistory, setImportHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ec_importHistory')) || [] } catch { return [] }
  })

  // Persist
  useEffect(() => { localStorage.setItem('ec_recipients', JSON.stringify(recipients)) }, [recipients])
  useEffect(() => { localStorage.setItem('ec_masterTemplate', JSON.stringify(masterTemplate)) }, [masterTemplate])
  useEffect(() => { localStorage.setItem('ec_savedTemplates', JSON.stringify(savedTemplates)) }, [savedTemplates])
  useEffect(() => { localStorage.setItem('ec_importHistory', JSON.stringify(importHistory)) }, [importHistory])
  useEffect(() => { localStorage.setItem('ec_companyApproach', companyApproach) }, [companyApproach])
  useEffect(() => { localStorage.setItem('ec_customEmail', JSON.stringify(customEmail)) }, [customEmail])
  useEffect(() => { localStorage.setItem('ec_customState', customState) }, [customState])

  // Modals
  const [modals, setModals] = useState({ import: false, add: false, template: false, view: false, company: false, viewNews: false, companyApproach: false, modifyApproach: false, viewApproach: false, customEmail: false, viewCustom: false, config: false })
  const [viewApproachText, setViewApproachText] = useState('')
  const [viewCustomDraft, setViewCustomDraft] = useState(null)
  const [importPrefilter, setImportPrefilter] = useState('')
  function openModal(name) { setModals(m => ({ ...m, [name]: true })) }
  function closeModal(name) { setModals(m => ({ ...m, [name]: false })) }

  function openImport(prefilterCompany = '') {
    setImportPrefilter(prefilterCompany)
    openModal('import')
  }

  function selectRecipient(i) {
    setActiveIndex(Math.max(0, Math.min(i, recipients.length - 1)))
  }

  function handleAddRecipients(added) {
    setRecipients(prev => [...prev, ...added])
  }

  function handleImport(imported, filename) {
    setRecipients(imported.map(r => ({ ...r, sent: false })))
    if (filename) {
      setImportHistory(prev => {
        const filtered = prev.filter(h => h.filename !== filename)
        return [{ id: Date.now(), filename, recipients: imported }, ...filtered]
      })
    }
  }

  async function saveAllToGmailDrafts() {
    const toSend = visibleRecipients.length ? visibleRecipients : recipients
    if (!toSend.length) return
    const unsent = toSend.filter(r => !r.sent)
    if (!unsent.length) { showToast('All emails already drafted this session', 'info'); return }

    const token = getValidToken()
    if (!token) {
      showToast('Please connect your Gmail account in Settings (⚙)', 'error')
      return
    }

    showToast(`Saving ${unsent.length} draft(s) to Gmail…`)
    let sent = 0, failed = 0
    for (const r of unsent) {
      try {
        const tpl = customState === 'saved' ? customEmail : masterTemplate
        const subject = applyTpl(tpl.subject, r)
        const rawBody = applyTpl(tpl.body, r)
        const htmlBody = tpl.body?.includes('<') ? rawBody : rawBody.replace(/\n/g, '<br>')
        const signature = gmailAuth.signature
        const fullBody = signature ? `${htmlBody}<br><br><div>${signature}</div>` : htmlBody
        await createGmailDraft(token, { to: r.email, subject, htmlBody: fullBody })
        setRecipients(prev => prev.map(x => x.email === r.email ? { ...x, sent: true } : x))
        sent++
      } catch (e) {
        console.error('Failed to draft for', r.email, e)
        failed++
        if (sent === 0 && failed === 1) showToast('Gmail error: ' + e.message, 'error')
      }
    }
    showToast(failed ? `${sent} drafted, ${failed} failed` : `${sent} draft(s) saved to Gmail ✓`, failed ? 'error' : 'success')
  }

  function handleSaveCustomEmail({ subject, body, name }) {
    setCustomEmail({ subject, body, name: name || '' })
    setCustomState('saved')
  }

  return (
    <>
      <Topbar
        recipientCount={visibleRecipientCount}
        totalRecipientCount={recipients.length}
        hasRecipients={recipients.length > 0}
        onOpenAll={saveAllToGmailDrafts}
        onConfig={() => openModal('config')}
        configConnected={!!gmailAuth?.token}
        gmailConnected={!!gmailAuth?.token}
        gmailEmail={gmailAuth?.email || ''}
      />

      <main className="layout">
        <RecipientsPanel
          recipients={recipients}
          activeIndex={activeIndex}
          onRecipientsChange={setRecipients}
          onSelectRecipient={selectRecipient}
          onAddClick={(company) => { setManualCompany(company || manualCompany); openModal('add') }}
          onImportClick={openImport}
          manualCompany={manualCompany}
          onManualCompanyChange={setManualCompany}
          importHistory={importHistory}
          onReImport={imported => handleImport(imported)}
          onDeleteHistory={id => setImportHistory(prev => prev.filter(h => h.id !== id))}
          onVisibleCountChange={(count, list) => { setVisibleRecipientCount(count); setVisibleRecipients(list) }}
          onSelectedChange={setSelectedRecipients}
        />
        <EditorPanel
          masterTemplate={masterTemplate}
          templateExists={templateExists}
          companyNewsItems={companyNewsItems}
          companyApproach={companyApproach}
          approachState={approachState}
          customEmail={customEmail}
          customState={customState}
          activeCompany={manualCompany}
          onCreateTemplate={() => openModal('template')}
          onViewTemplate={() => openModal('view')}
          onFetchNews={() => openModal('company')}
          onViewNews={() => openModal('viewNews')}
          onAnalyzeApproach={() => openModal('companyApproach')}
          onModifyApproach={() => openModal('modifyApproach')}
          onGenerateCustom={() => openModal('customEmail')}
          onViewCustom={() => openModal('viewCustom')}
        />
      </main>

      <ImportModal open={modals.import} onClose={() => closeModal('import')} onImport={handleImport} prefilterCompany={importPrefilter} />
      <AddModal open={modals.add} onClose={() => closeModal('add')} onAdd={handleAddRecipients} recipients={recipients} defaultCompany={manualCompany} />
      <TemplateModal
        open={modals.template}
        onClose={() => closeModal('template')}
        onSave={setMasterTemplate}
        masterTemplate={masterTemplate}
        recipients={recipients}
        savedTemplates={savedTemplates}
        onSaveToLibrary={tpl => setSavedTemplates(prev => { const idx = prev.findIndex(t => t.id === tpl.id); return idx >= 0 ? prev.map((t, i) => i === idx ? tpl : t) : [...prev, tpl] })}
        onDeleteFromLibrary={id => setSavedTemplates(prev => prev.filter(t => t.id !== id))}
        onSyncFromSheet={remote => setSavedTemplates(remote)}
        gmailToken={gmailAuth?.token || null}
      />
      <ViewModal open={modals.view} onClose={() => closeModal('view')} onEdit={() => openModal('template')} masterTemplate={masterTemplate} />
      <CompanyModal open={modals.company} onClose={() => closeModal('company')} onSave={setCompanyNewsItems} savedItems={companyNewsItems} initialCompany={manualCompany} gmailToken={gmailAuth?.token || null} />
      <ViewNewsModal open={modals.viewNews} onClose={() => closeModal('viewNews')} newsItems={companyNewsItems} />
      <CompanyApproachModal
        open={modals.companyApproach}
        onClose={() => closeModal('companyApproach')}
        onSave={text => { setCompanyApproach(text); closeModal('companyApproach') }}
        onOpen={text => { setViewApproachText(text); openModal('viewApproach') }}
        savedApproach={companyApproach}
        initialCompany={manualCompany}
        gmailToken={gmailAuth?.token || null}
      />
      <ViewApproachModal
        open={modals.viewApproach}
        onClose={() => closeModal('viewApproach')}
        approach={viewApproachText}
      />
      <ModifyApproachModal
        open={modals.modifyApproach}
        onClose={() => closeModal('modifyApproach')}
        onSave={setCompanyApproach}
        approach={companyApproach}
      />
      <CustomEmailModal
        open={modals.customEmail}
        onClose={() => closeModal('customEmail')}
        onSave={handleSaveCustomEmail}
        onView={draft => { setViewCustomDraft(draft); openModal('viewCustom') }}
        masterTemplate={masterTemplate}
        companyNewsItems={companyNewsItems}
        companyApproach={companyApproach}
        customEmail={customEmail}
        selectedRecipients={selectedRecipients}
        gmailToken={gmailAuth?.token || null}
      />
      <ViewCustomModal
        open={modals.viewCustom}
        onClose={() => closeModal('viewCustom')}
        onSave={updated => { handleSaveCustomEmail(updated); setViewCustomDraft(null) }}
        onOpenAll={saveAllToGmailDrafts}
        customEmail={viewCustomDraft || customEmail}
        selectedRecipients={selectedRecipients}
      />
      <ConfigModal open={modals.config} onClose={() => closeModal('config')} gmailAuth={gmailAuth} onGmailConnect={handleGmailConnect} onGmailDisconnect={handleGmailDisconnect} />

      <ToastContainer toasts={toasts} />
    </>
  )
}
