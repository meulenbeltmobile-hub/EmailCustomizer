export function detectEmailSyntax(emailList) {
  const samples = emailList.filter(r => r.name && r.name.includes(' ') && r.email && r.email.includes('@'));
  if (!samples.length) return null;

  const domain = samples[0].email.split('@')[1];
  const results = [];

  for (const r of samples) {
    const first = r.name.split(' ')[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const last = r.name.split(' ').slice(1).join('').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const f = first[0];
    const local = r.email.split('@')[0].toLowerCase();

    const patterns = [
      { tpl: '{f}.{last}',    val: f + '.' + last },
      { tpl: '{first}.{last}',val: first + '.' + last },
      { tpl: '{first}{last}', val: first + last },
      { tpl: '{f}{last}',     val: f + last },
      { tpl: '{first}',       val: first },
      { tpl: '{last}.{first}',val: last + '.' + first },
      { tpl: '{last}{f}',     val: last + f },
      { tpl: '{first}_{last}',val: first + '_' + last },
      { tpl: '{f}_{last}',    val: f + '_' + last },
    ];
    for (const p of patterns) {
      if (local === p.val) { results.push(p.tpl); break; }
    }
  }

  if (!results.length) return null;
  const freq = {};
  results.forEach(p => (freq[p] = (freq[p] || 0) + 1));
  const best = Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
  return { pattern: best + '@' + domain, domain, confidence: results.length };
}

export function syntaxLegend(pattern) {
  const map = {
    '{first}': 'full firstname',
    '{last}':  'full lastname',
    '{f}':     '1st letter of firstname',
    '{l}':     '1st letter of lastname',
  };
  return Object.entries(map)
    .filter(([k]) => pattern.includes(k))
    .map(([k, v]) => `<span style="color:var(--accent)">${k}</span> = ${v}`)
    .join('  ·  ');
}

export function applySyntax(pattern, name) {
  const parts = name.trim().split(/\s+/);
  const first = (parts[0] || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const last  = parts.slice(1).join('').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const f = first[0] || '';
  const l = last[0] || '';
  return pattern
    .replace(/\{first\}/g, first)
    .replace(/\{last\}/g,  last)
    .replace(/\{f\}/g,     f)
    .replace(/\{l\}/g,     l);
}
