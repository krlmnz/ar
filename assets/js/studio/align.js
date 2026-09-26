/* Alignment has no markdown syntax. A trailing {align=center|right|justify}
 * marker round-trips through the editor, and the site's markdown renderer
 * turns it into text-align. Left is the default and is not written out. */

const ALIGN_RE = /\s*\{align=(center|right|justify)\}\s*$/;

export function applyAlign(node) {
  if (!node || Array.isArray(node) || !Array.isArray(node.content) || !node.content.length) return node;
  const content = node.content.slice();
  const last = content[content.length - 1];
  if (!last || last.type !== 'text' || typeof last.text !== 'string') return node;
  const match = last.text.match(ALIGN_RE);
  if (!match) return node;
  const text = last.text.replace(ALIGN_RE, '');
  if (text) content[content.length - 1] = Object.assign({}, last, { text });
  else content.pop();
  return Object.assign({}, node, {
    attrs: Object.assign({}, node.attrs, { textAlign: match[1] }),
    content
  });
}

export function withAlign(body, node) {
  if (!body || body === '&nbsp;' || body === '\u00A0') return body;
  const align = node && node.attrs && node.attrs.textAlign;
  if (align !== 'center' && align !== 'right' && align !== 'justify') return body;
  return body.replace(/\s+$/, '') + ' {align=' + align + '}';
}
