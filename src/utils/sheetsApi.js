const SHEET_ID   = import.meta.env.VITE_SHEETS_ID
const SHEET_NAME = 'Templates'
const BASE       = 'https://sheets.googleapis.com/v4/spreadsheets'

async function api(token, path, method = 'GET', body) {
  const res = await fetch(`${BASE}/${SHEET_ID}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data
}

/* ── Ensure header row exists ── */
async function ensureHeaders(token) {
  const data = await api(token, `/values/${SHEET_NAME}!A1:D1`)
  const row  = (data.values || [])[0] || []
  if (!row.includes('id')) {
    await api(token, `/values/${SHEET_NAME}!A1:D1?valueInputOption=RAW`, 'PUT', {
      range: `${SHEET_NAME}!A1:D1`,
      majorDimension: 'ROWS',
      values: [['id', 'name', 'subject', 'body']]
    })
  }
}

export async function loadTemplatesFromSheet(token) {
  if (!SHEET_ID) throw new Error('VITE_SHEETS_ID is not configured')
  const data = await api(token, `/values/${SHEET_NAME}!A2:D`)
  return (data.values || [])
    .filter(r => r[0] && r[1])
    .map(r => ({ id: +r[0] || Date.now(), name: r[1] || '', subject: r[2] || '', body: r[3] || '' }))
}

export async function saveTemplatesToSheet(token, templates) {
  if (!SHEET_ID) throw new Error('VITE_SHEETS_ID is not configured')
  await ensureHeaders(token)
  // Clear data rows then rewrite
  await api(token, `/values/${SHEET_NAME}!A2:D:clear`, 'POST')
  if (templates.length === 0) return
  await api(token, `/values/${SHEET_NAME}!A2:D?valueInputOption=RAW`, 'PUT', {
    range: `${SHEET_NAME}!A2:D`,
    majorDimension: 'ROWS',
    values: templates.map(t => [t.id, t.name, t.subject, t.body])
  })
}
