const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'

async function gGet(token, path) {
  const res = await fetch(`${GMAIL_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) throw new Error(`Gmail API error ${res.status}`)
  return res.json()
}

async function searchMessages(token, query, maxResults = 50) {
  const params = new URLSearchParams({ q: query, maxResults })
  const data = await gGet(token, `/messages?${params}`)
  return (data.messages || []).map(m => m.id)
}

function getHeader(headers = [], name) {
  return headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || ''
}

function extractEmail(str) {
  if (!str) return null
  const angle = str.match(/<([^>]+@[^>]+)>/)
  if (angle) return angle[1].toLowerCase().trim()
  const plain = str.match(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/)
  return plain ? plain[1].toLowerCase().trim() : null
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function scanBounces(token, months, onProgress) {
  const period = months >= 12 ? `${Math.round(months / 12)}y` : `${months}m`
  const query = [
    'from:postmaster',
    'from:mailer-daemon',
    'subject:"delivery status notification"',
    'subject:"undeliverable"',
    'subject:"delivery failed"',
    'subject:"mail delivery failed"',
    'subject:"returned mail"',
    'subject:"failure notice"',
    'subject:"non-delivery report"',
  ].join(' OR ') + ` newer_than:${period}`

  onProgress('Searching for delivery failure messages…')
  const ids = await searchMessages(token, `(${query})`, 50)
  if (!ids.length) return []

  onProgress(`Found ${ids.length} candidate(s) — analysing…`)
  const results = []
  const seen = new Set()

  // metadata only — format=full downloads entire emails incl. attachments and can crash
  const qparts = 'format=metadata&metadataHeaders=X-Failed-Recipients&metadataHeaders=From&metadataHeaders=Date&metadataHeaders=Subject'

  for (let i = 0; i < ids.length; i += 10) {
    const batch = ids.slice(i, i + 10)
    // .catch(() => null) isolates individual message failures so one bad message
    // doesn't abort the entire batch
    const messages = await Promise.all(
      batch.map(id => gGet(token, `/messages/${id}?${qparts}`).catch(() => null))
    )

    for (const msg of messages) {
      if (!msg) continue
      const headers = msg.payload?.headers || []
      let email = null

      // X-Failed-Recipients is the most reliable indicator and is available in metadata
      const failed = getHeader(headers, 'X-Failed-Recipients')
      if (failed) email = extractEmail(failed)

      // Fallback: first email address found in the snippet
      if (!email) {
        const m = (msg.snippet || '').match(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/)
        if (m) email = m[1].toLowerCase()
      }

      if (email && !seen.has(email)) {
        seen.add(email)
        results.push({
          email,
          type: 'bounce',
          date: getHeader(headers, 'Date'),
          subject: getHeader(headers, 'Subject'),
          snippet: msg.snippet || '',
        })
      }
    }
    onProgress(`Analysed ${Math.min(i + 10, ids.length)} / ${ids.length} delivery messages…`)
  }
  return results
}

export async function scanLeftCompany(token, months, onProgress) {
  const period = months >= 12 ? `${Math.round(months / 12)}y` : `${months}m`
  const keywords = [
    '"no longer with"',
    '"left the company"',
    '"has left"',
    '"no longer employed"',
    '"left our organization"',
    '"left our organisation"',
    '"left our team"',
    '"no longer at"',
    '"is no longer"',
    '"has departed"',
  ].join(' OR ')
  const query = `(${keywords}) is:inbox -from:me -from:postmaster -from:mailer-daemon newer_than:${period}`

  onProgress('Searching for "left company" replies…')
  const ids = await searchMessages(token, query, 30)
  if (!ids.length) return []

  onProgress(`Found ${ids.length} candidate(s) — analysing…`)
  const results = []
  const seen = new Set()

  const qparts = 'format=metadata&metadataHeaders=From&metadataHeaders=Date&metadataHeaders=Subject'

  for (let i = 0; i < ids.length; i += 10) {
    const batch = ids.slice(i, i + 10)
    const messages = await Promise.all(
      batch.map(id => gGet(token, `/messages/${id}?${qparts}`).catch(() => null))
    )

    for (const msg of messages) {
      if (!msg) continue
      const headers = msg.payload?.headers || []
      const from = getHeader(headers, 'From')
      const email = extractEmail(from)
      if (email && !seen.has(email)) {
        seen.add(email)
        results.push({
          email,
          type: 'leftcompany',
          date: getHeader(headers, 'Date'),
          subject: getHeader(headers, 'Subject'),
          snippet: msg.snippet || '',
        })
      }
    }
    onProgress(`Analysed ${Math.min(i + 10, ids.length)} / ${ids.length} messages…`)
  }
  return results
}
