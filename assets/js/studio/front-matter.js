/* Front matter stays the source of truth. The visual editor only rewrites
 * the fields it owns (title, subtitle, series, layout, published). */

export function splitFrontMatter(text) {
  const source = String(text || '');
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { front: '', body: source };
  return { front: match[1], body: source.slice(match[0].length) };
}

export function frontValue(front, key) {
  const match = String(front || '').match(new RegExp('^' + key + ':\\s*(.*)$', 'm'));
  if (!match) return '';
  return match[1].trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
}

export function quote(value) {
  const text = String(value ?? '');
  if (!text) return '""';
  if (/[:#\n"'&]/.test(text) || text !== text.trim()) return JSON.stringify(text);
  return text;
}

export function setField(front, key, value) {
  const line = key + ': ' + value;
  const re = new RegExp('^' + key + ':[^\\n]*$', 'm');
  if (re.test(front)) return front.replace(re, line);
  return front ? front.replace(/\s*$/, '') + '\n' + line : line;
}

export function compose(front, body) {
  const cleaned = String(body || '').replace(/^\n+/, '').replace(/\s+$/, '');
  const matter = String(front || '').replace(/\s*$/, '');
  return '---\n' + matter + '\n---\n\n' + (cleaned ? cleaned + '\n' : '');
}

export function kindFromLayout(layout) {
  const match = String(layout || '').match(/layouts\/([a-z0-9-]+)\.njk/);
  return match ? match[1] : '';
}

export function publishedFlag(front) {
  return /^published:\s*true\s*$/m.test(front || '');
}
