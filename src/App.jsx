import { useState, useEffect, useRef } from 'react'
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
import CustomGenerateModal from './modals/CustomGenerateModal.jsx'
import ViewCustomModal from './modals/ViewCustomModal.jsx'
import EditCustomModal from './modals/EditCustomModal.jsx'
import ConfigModal from './modals/ConfigModal.jsx'
import { applyTpl, insertAtCursor } from './utils/helpers.js'
import { createGmailDraft } from './utils/gmailApi.js'

export default function App() {
  const { toasts, addToast } = useToast()

  // Recipients
  const [recipients, setRecipients] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('ec_recipients')) || []
      return saved.map(r => ({ ...r, sent: false })) // reset sent flag each session
    } catch { return [] }
  })
  const [activeIndex, setActiveIndex] = useState(0)

  // Master template — persisted to localStorage
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

  // Custom email — persisted to localStorage
  const [customEmail, setCustomEmail] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ec_customEmail')) || { subject: '', body: '' } } catch { return { subject: '', body: '' } }
  })
  const [customState, setCustomState] = useState(() => {
    try { return localStorage.getItem('ec_customState') || 'empty' } catch { return 'empty' }
  })
  const [customSubject, setCustomSubject] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ec_customEmail'))?.subject || '' } catch { return '' }
  })
  const [customBody, setCustomBody] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ec_customEmail'))?.body || '' } catch { return '' }
  })
  const customSubjectRef = useRef(null)
  const customBodyRef = useRef(null)

  // Gmail OAuth auth — stored in sessionStorage (clears on tab close)
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

  // Company name (shared between sidebar and modals)
  const [manualCompany, setManualCompany] = useState('')
  const [visibleRecipientCount, setVisibleRecipientCount] = useState(0)
  const [visibleRecipients, setVisibleRecipients] = useState([])

  // Import history: [{ id, filename, recipients }]
  const [importHistory, setImportHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ec_importHistory')) || [] } catch { return [] }
  })

  // Persist state to localStorage
  useEffect(() => { localStorage.setItem('ec_recipients', JSON.stringify(recipients)) }, [recipients])
  useEffect(() => { localStorage.setItem('ec_masterTemplate', JSON.stringify(masterTemplate)) }, [masterTemplate])
  useEffect(() => { localStorage.setItem('ec_savedTemplates', JSON.stringify(savedTemplates)) }, [savedTemplates])
  useEffect(() => { localStorage.setItem('ec_importHistory', JSON.stringify(importHistory)) }, [importHistory])
  useEffect(() => { localStorage.setItem('ec_customEmail', JSON.stringify(customEmail)) }, [customEmail])
  useEffect(() => { localStorage.setItem('ec_customState', customState) }, [customState])

  // Modals
  const [modals, setModals] = useState({ import: false, add: false, template: false, view: false, company: false, viewNews: false, customGenerate: false, viewCustom: false, editCustom: false, config: false })
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

  function handleGeneratedCustom(subject, body) {
    setCustomSubject(subject)
    setCustomBody(body)
    setCustomState('editing')
  }

  function saveCustomEmail() {
    setCustomEmail({ subject: customSubject, body: customBody })
    setCustomState('saved')
    showToast('Customized email saved', 'success')
  }

  function editCustomEmail() {
    setCustomSubject(customEmail.subject)
    setCustomBody(customEmail.body)
    setCustomState('editing')
  }

  function handleInsertCustomPh(field, ph) {
    if (field === 'custom-subject') insertAtCursor(customSubjectRef, setCustomSubject, ph)
    else insertAtCursor(customBodyRef, setCustomBody, ph)
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
          onAddClick={() => openModal('add')}
          onImportClick={openImport}
          manualCompany={manualCompany}
          onManualCompanyChange={setManualCompany}
          importHistory={importHistory}
          onReImport={imported => handleImport(imported)}
          onDeleteHistory={id => setImportHistory(prev => prev.filter(h => h.id !== id))}
          onVisibleCountChange={(count, list) => { setVisibleRecipientCount(count); setVisibleRecipients(list) }}
        />
        <EditorPanel
          masterTemplate={masterTemplate}
          templateExists={templateExists}
          companyNewsItems={companyNewsItems}
          customEmail={customEmail}
          customState={customState}
          onCreateTemplate={() => openModal('template')}
          onViewTemplate={() => openModal('view')}
          onFetchNews={() => openModal('company')}
          onViewNews={() => openModal('viewNews')}
          onGenerateCustom={() => openModal('customGenerate')}
          onViewCustom={() => openModal('viewCustom')}
          onEditCustom={editCustomEmail}
          onSaveCustom={saveCustomEmail}
          customSubject={customSubject}
          customBody={customBody}
          onCustomSubjectChange={setCustomSubject}
          onCustomBodyChange={setCustomBody}
          customSubjectRef={customSubjectRef}
          customBodyRef={customBodyRef}
          onInsertCustomPh={handleInsertCustomPh}
          onRegenerateCustom={() => openModal('customGenerate')}
        />
      </main>

      <ImportModal open={modals.import} onClose={() => closeModal('import')} onImport={handleImport} prefilterCompany={importPrefilter} />
      <AddModal open={modals.add} onClose={() => closeModal('add')} onAdd={handleAddRecipients} recipients={recipients} />
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
      <CompanyModal open={modals.company} onClose={() => closeModal('company')} onSave={setCompanyNewsItems} savedItems={companyNewsItems} initialCompany={manualCompany} />
      <ViewNewsModal open={modals.viewNews} onClose={() => closeModal('viewNews')} newsItems={companyNewsItems} />
      <CustomGenerateModal open={modals.customGenerate} onClose={() => closeModal('customGenerate')} onGenerated={handleGeneratedCustom} masterTemplate={masterTemplate} companyNewsItems={companyNewsItems} />
      <ViewCustomModal open={modals.viewCustom} onClose={() => closeModal('viewCustom')} onEdit={() => openModal('editCustom')} onOpenAll={saveAllToGmailDrafts} customEmail={customEmail} recipients={recipients} />
      <EditCustomModal open={modals.editCustom} onClose={() => closeModal('editCustom')} onSave={tpl => { setCustomEmail(tpl); setCustomState('saved') }} customEmail={customEmail} />
      <ConfigModal open={modals.config} onClose={() => closeModal('config')} gmailAuth={gmailAuth} onGmailConnect={handleGmailConnect} onGmailDisconnect={handleGmailDisconnect} />

      <ToastContainer toasts={toasts} />
    </>
  )
}
