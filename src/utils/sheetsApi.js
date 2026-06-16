const SHEET_ID = import.meta.env.VITE_SHEETS_ID
const BASE     = 'https://sheets.googleapis.com/v4/spreadsheets'

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
  const col  = String.fromCharCode(64 + headers.length)
  const data = await api(token, `/values/${sheet}!A1:${col}1`)
  const row  = (data.values || [])[0] || []
  if (!row.includes(headers[0])) {
    await api(token, `/values/${sheet}!A1:${col}1?valueInputOption=RAW`, 'PUT', {
      range: `${sheet}!A1:${col}1`,
      majorDimension: 'ROWS',
      values: [headers]
    })
  }
}

/* ── Master template (tab: "Template", single data row) ── */

export async function loadMasterTemplateFromSheet(token) {
  if (!SHEET_ID) throw new Error('VITE_SHEETS_ID is not configured')
  const data = await api(token, `/values/Template!A2:C2`)
  const row  = (data.values || [])[0]
  if (!row) return null
  return { name: row[0] || '', subject: row[1] || '', body: row[2] || '' }
}

export async function saveMasterTemplateToSheet(token, template) {
  if (!SHEET_ID) throw new Error('VITE_SHEETS_ID is not configured')
  await ensureHeaders(token, 'Template', ['name', 'subject', 'body'])
  await api(token, `/values/Template!A2:C2?valueInputOption=RAW`, 'PUT', {
    range: 'Template!A2:C2',
    majorDimension: 'ROWS',
    values: [[template.name || '', template.subject || '', template.body || '']]
  })
}

/* ── News prompts (tab: "NewsPrompts") ── */

export async function loadNewsPromptsFromSheet(token) {
  if (!SHEET_ID) throw new Error('VITE_SHEETS_ID is not configured')
  const data = await api(token, `/values/NewsPrompts!A2:C`)
  return (data.values || [])
    .filter(r => r[1])
    .map(r => ({ id: +r[0] || Date.now(), name: r[1] || '', text: r[2] || '' }))
}

export async function saveNewsPromptsToSheet(token, prompts) {
  if (!SHEET_ID) throw new Error('VITE_SHEETS_ID is not configured')
  await ensureHeaders(token, 'NewsPrompts', ['id', 'name', 'text'])
  await api(token, `/values/NewsPrompts!A2:C:clear`, 'POST')
  if (prompts.length === 0) return
  await api(token, `/values/NewsPrompts!A2:C?valueInputOption=RAW`, 'PUT', {
    range: 'NewsPrompts!A2:C',
    majorDimension: 'ROWS',
    values: prompts.map(p => [p.id, p.name, p.text])
  })
}

/* ── Approach prompts (tab: "ApproachPrompts") ── */

export async function loadApproachPromptsFromSheet(token) {
  if (!SHEET_ID) throw new Error('VITE_SHEETS_ID is not configured')
  const data = await api(token, `/values/ApproachPrompts!A2:C`)
  return (data.values || [])
    .filter(r => r[1])
    .map(r => ({ id: +r[0] || Date.now(), name: r[1] || '', text: r[2] || '' }))
}

export async function saveApproachPromptsToSheet(token, prompts) {
  if (!SHEET_ID) throw new Error('VITE_SHEETS_ID is not configured')
  await ensureHeaders(token, 'ApproachPrompts', ['id', 'name', 'text'])
  await api(token, `/values/ApproachPrompts!A2:C:clear`, 'POST')
  if (prompts.length === 0) return
  await api(token, `/values/ApproachPrompts!A2:C?valueInputOption=RAW`, 'PUT', {
    range: 'ApproachPrompts!A2:C',
    majorDimension: 'ROWS',
    values: prompts.map(p => [p.id, p.name, p.text])
  })
}

/* ── Generation prompts (tab: "GenPrompts") ── */

export async function loadGenPromptsFromSheet(token) {
  if (!SHEET_ID) throw new Error('VITE_SHEETS_ID is not configured')
  const data = await api(token, `/values/GenPrompts!A2:C`)
  return (data.values || [])
    .filter(r => r[1])
    .map(r => ({ id: +r[0] || Date.now(), name: r[1] || '', text: r[2] || '' }))
}

export async function saveGenPromptsToSheet(token, prompts) {
  if (!SHEET_ID) throw new Error('VITE_SHEETS_ID is not configured')
  await ensureHeaders(token, 'GenPrompts', ['id', 'name', 'text'])
  await api(token, `/values/GenPrompts!A2:C:clear`, 'POST')
  if (prompts.length === 0) return
  await api(token, `/values/GenPrompts!A2:C?valueInputOption=RAW`, 'PUT', {
    range: 'GenPrompts!A2:C',
    majorDimension: 'ROWS',
    values: prompts.map(p => [p.id, p.name, p.text])
  })
}
