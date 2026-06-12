export const GMAIL_USERS = [
  { name: 'Geert',  clientId: import.meta.env.VITE_GMAIL_CLIENT_ID_GEERT },
  { name: 'Andrew', clientId: import.meta.env.VITE_GMAIL_CLIENT_ID_ANDREW },
]

/* ── Load Google Identity Services script ── */
export function loadGIS() {
  return new Promise(resolve => {
    if (window.google?.accounts) { resolve(); return }
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.onload = resolve
    document.head.appendChild(s)
  })
}

/* ── Request OAuth token (opens Google popup) ── */
export async function requestGmailToken(clientId) {
  if (!clientId) throw new Error('Google Client ID is not configured. Check your environment variables.')
  await loadGIS()
  return new Promise((resolve, reject) => {
    // Timeout after 2 minutes
    const timer = setTimeout(() => reject(new Error('Login timed out — please try again')), 120_000)

    const done = (fn) => { clearTimeout(timer); fn() }

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: [
        'https://mail.google.com/',
        'https://www.googleapis.com/auth/userinfo.email'
      ].join(' '),
      callback: r => r.error
        ? done(() => reject(new Error(r.error)))
        : done(() => resolve(r)),
      error_callback: e => done(() => reject(new Error(
        e?.type === 'popup_closed' ? 'Login window was closed' :
        e?.type === 'popup_failed_to_open' ? 'Popup was blocked — allow popups for localhost' :
        e?.message || e?.type || 'Login cancelled'
      )))
    })
    client.requestAccessToken()
  })
}

/* ── Fetch connected account email ── */
export async function fetchGmailUser(token) {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` }
  })
  const d = await res.json()
  return d.email || ''
}

/* ── Fetch primary Gmail signature (HTML) ── */
export async function fetchGmailSignature(token) {
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/settings/sendAs', {
    headers: { Authorization: `Bearer ${token}` }
  })
  const d = await res.json()
  const primary = (d.sendAs || []).find(s => s.isPrimary)
  return primary?.signature || ''
}

/* ── Create a Gmail draft ── */
export async function createGmailDraft(token, { to, subject, htmlBody }) {
  // Build RFC 2822 message
  const msg = [
    `To: ${to}`,
    `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    htmlBody
  ].join('\r\n')

  // Base64url encode
  const encoded = btoa(unescape(encodeURIComponent(msg)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: { raw: encoded } })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `HTTP ${res.status}`)
  }
  return res.json()
}
