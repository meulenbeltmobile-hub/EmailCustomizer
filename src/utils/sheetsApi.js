const SHEET_ID   = import.meta.env.VITE_SHEETS_ID
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

async function ensureHeaders(token, sheet, headers) {
  const data = await api(token, `/values/${sheet}!A1:${String.fromCharCode(64 + headers.length)}1`)
  const row  = (data.values || [])[0] || []
  if (!row.includes(headers[0])) {
    await api(token, `/values/${sheet}!A1:${String.fromCharCode(64 + headers.length)}1?valueInputOption=RAW`, 'PUT', {
      range: `${sheet}!A1:${String.fromCharCode(64 + headers.length)}1`,
      majorDimension: 'ROWS',
      values: [headers]
    })
  }
}

/* ── Templates ── */

export async function loadTemplatesFromSheet(token) {
  if (!SHEET_ID) throw new Error('VITE_SHEETS_ID is not configured')
  const data = await api(token, `/values/Templates!A2:D`)
  return (data.values || [])
    .filter(r => r[0] && r[1])
    .map(r => ({ id: +r[0] || Date.now(), name: r[1] || '', subject: r[2] || '', body: r[3] || '' }))
}

export async function saveTemplatesToSheet(token, templates) {
  if (!SHEET_ID) throw new Error('VITE_SHEETS_ID is not configured')
  await ensureHeaders(token, 'Templates', ['id', 'name', 'subject', 'body'])
  await api(token, `/values/Templates!A2:D:clear`, 'POST')
  if (templates.length === 0) return
  await api(token, `/values/Templates!A2:D?valueInputOption=RAW`, 'PUT', {
    range: `Templates!A2:D`,
    majorDimension: 'ROWS',
    values: templates.map(t => [t.id, t.name, t.subject, t.body])
  })
}

/* ── Prompts ── */

export async function loadPromptsFromSheet(token, type) {
  if (!SHEET_ID) throw new Error('VITE_SHEETS_ID is not configured')
  const data = await api(token, `/values/Prompts!A2:D`)
  return (data.values || [])
    .filter(r => r[0] === type && r[1] && r[2])
    .map(r => ({ id: +r[1] || Date.now(), name: r[2] || '', text: r[3] || '' }))
}

export async function savePromptsToSheet(token, type, prompts) {
  if (!SHEET_ID) throw new Error('VITE_SHEETS_ID is not configured')
  await ensureHeaders(token, 'Prompts', ['type', 'id', 'name', 'text'])
  // Load all rows, replace rows for this type, rewrite everything
  const data = await api(token, `/values/Prompts!A2:D`)
  const otherRows = (data.values || []).filter(r => r[0] !== type)
  const newRows   = prompts.map(p => [type, p.id, p.name, p.text])
  const allRows   = [...otherRows, ...newRows]
  await api(token, `/values/Prompts!A2:D:clear`, 'POST')
  if (allRows.length === 0) return
  await api(token, `/values/Prompts!A2:D?valueInputOption=RAW`, 'PUT', {
    range: `Prompts!A2:D`,
    majorDimension: 'ROWS',
    values: allRows
  })
}
