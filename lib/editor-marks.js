/* Inline marks the visual editor writes, rendered by the same markdown
 * pipeline as every published page.
 *
 *   ~~strike~~  is already markdown-it
 *   ++underline++
 *   ==highlight==
 *   trailing {align=center|right|justify} on a paragraph or heading
 *
 * The marker is removed before heading ids are slugged, so it never
 * becomes part of a permalink.
 */

function paired(markerCode, tokenName, tag) {
  const ch = String.fromCharCode(markerCode);

  function tokenize(state, silent) {
    if (silent) return false;
    if (state.src.charCodeAt(state.pos) !== markerCode) return false;

    const scanned = state.scanDelims(state.pos, true);
    let len = scanned.length;
    if (len < 2) return false;

    if (len % 2) {
      const odd = state.push('text', '', 0);
      odd.content = ch;
      len--;
    }

    for (let i = 0; i < len; i += 2) {
      const token = state.push('text', '', 0);
      token.content = ch + ch;
      state.delimiters.push({
        marker: markerCode,
        length: 0,
        token: state.tokens.length - 1,
        end: -1,
        open: scanned.can_open,
        close: scanned.can_close
      });
    }

    state.pos += scanned.length;
    return true;
  }

  function postProcess(state, delimiters) {
    const lone = [];
    for (let i = 0; i < delimiters.length; i++) {
      const startDelim = delimiters[i];
      if (startDelim.marker !== markerCode || startDelim.end === -1) continue;
      const endDelim = delimiters[startDelim.end];

      const open = state.tokens[startDelim.token];
      open.type = tokenName + '_open';
      open.tag = tag;
      open.nesting = 1;
      open.markup = ch + ch;
      open.content = '';

      const close = state.tokens[endDelim.token];
      close.type = tokenName + '_close';
      close.tag = tag;
      close.nesting = -1;
      close.markup = ch + ch;
      close.content = '';

      const prev = state.tokens[endDelim.token - 1];
      if (prev && prev.type === 'text' && prev.content === ch) lone.push(endDelim.token - 1);
    }

    while (lone.length) {
      const i = lone.pop();
      let j = i + 1;
      while (j < state.tokens.length && state.tokens[j].type === tokenName + '_close') j++;
      j--;
      if (i !== j) {
        const token = state.tokens[j];
        state.tokens[j] = state.tokens[i];
        state.tokens[i] = token;
      }
    }
  }

  function post(state) {
    postProcess(state, state.delimiters);
    const meta = state.tokens_meta || [];
    for (let i = 0; i < meta.length; i++) {
      if (meta[i] && meta[i].delimiters) postProcess(state, meta[i].delimiters);
    }
  }

  return { tokenize, post };
}

const ALIGN_RE = /\{align=(center|right|justify)\}\s*$/;

function stripAlign(state) {
  const tokens = state.tokens;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type !== 'inline' || !token.children) continue;
    const children = token.children;
    for (let c = children.length - 1; c >= 0; c--) {
      const child = children[c];
      if (child.type === 'softbreak') continue;
      if (child.type !== 'text') break;
      const match = child.content.match(ALIGN_RE);
      if (!match) break;
      child.content = child.content.replace(/\s*\{align=(center|right|justify)\}\s*$/, '');
      token.content = String(token.content || '').replace(/\s*\{align=(center|right|justify)\}\s*$/, '');
      const open = tokens[i - 1];
      if (open && (open.type === 'paragraph_open' || open.type === 'heading_open')) {
        const style = 'text-align: ' + match[1];
        const prev = open.attrGet('style');
        open.attrSet('style', prev ? prev + '; ' + style : style);
      }
      if (!child.content) children.splice(c, 1);
      break;
    }
  }
}

function editorMarks(md) {
  const underline = paired(0x2B, 'u', 'u');
  const highlight = paired(0x3D, 'mark', 'mark');
  md.inline.ruler.after('strikethrough', 'underline', underline.tokenize);
  md.inline.ruler2.after('strikethrough', 'underline', underline.post);
  md.inline.ruler.after('underline', 'highlight', highlight.tokenize);
  md.inline.ruler2.after('underline', 'highlight', highlight.post);
  md.core.ruler.before('explicit-heading-id', 'text-align-marker', stripAlign);
}

module.exports = editorMarks;
