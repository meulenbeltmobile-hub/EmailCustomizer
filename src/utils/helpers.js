export function escHtml(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function initials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export function applyTpl(tpl, r) {
  if (!r) return tpl;
  const first = r.name.split(' ')[0];
  const last = r.name.split(' ').slice(1).join(' ');
  return tpl
    .replace(/\{\{name\}\}/g, r.name)
    .replace(/\{\{firstname\}\}/g, first)
    .replace(/\{\{lastname\}\}/g, last)
    .replace(/\{\{email\}\}/g, r.email)
    .replace(/\{\{company\}\}/g, r.company || '');
}

export function parseLines(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const parsed = [];
  let error = '';
  for (const line of lines) {
    let m;
    if ((m = line.match(/^([^<,]+)<([^>]+)>/))) {
      parsed.push({ name: m[1].trim(), email: m[2].trim(), sent: false });
    } else if ((m = line.match(/^(.+?),\s*(\S+@\S+)/))) {
      parsed.push({ name: m[1].trim(), email: m[2].trim(), sent: false });
    } else if ((m = line.match(/^(\S+@\S+)/))) {
      parsed.push({ name: m[1], email: m[1], sent: false });
    } else if (line) {
      error = `Skipped unrecognized line: "${line}"`;
    }
  }
  return { parsed, error };
}

export function insertAtCursor(ref, setter, ph) {
  const el = ref.current;
  if (!el) return;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const newValue = el.value.slice(0, start) + ph + el.value.slice(end);
  setter(newValue);
  requestAnimationFrame(() => {
    el.selectionStart = el.selectionEnd = start + ph.length;
    el.focus();
  });
}
