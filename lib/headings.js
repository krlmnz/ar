/* Optional explicit heading ids.
 *
 *   ## The land (#land)
 *
 * The marker is (#id), not {#id}: markdown is rendered with Nunjucks first,
 * and {# starts a Nunjucks comment. The marker is stripped before
 * markdown-it-anchor slugs the text, then the id and permalink href are
 * written after the anchor plugin runs.
 */
function explicitHeadingIds(md) {
  md.core.ruler.before('anchor', 'explicit-heading-id', (state) => {
    const tokens = state.tokens;
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.type !== 'heading_open') continue;
      const inline = tokens[i + 1];
      if (!inline || inline.type !== 'inline' || !inline.children) continue;

      const text = inline.children
        .filter((t) => t.type === 'text' || t.type === 'code_inline')
        .map((t) => t.content)
        .join('');
      const match = text.match(/\(#([A-Za-z0-9_-]+)\)\s*$/);
      if (!match) continue;

      token.meta = token.meta || {};
      token.meta.explicitId = match[1];
      inline.content = inline.content.replace(/\s*\(#[A-Za-z0-9_-]+\)\s*$/, '');

      for (let c = inline.children.length - 1; c >= 0; c--) {
        const child = inline.children[c];
        if (child.type === 'text' && child.content.includes('(#')) {
          child.content = child.content.replace(/\s*\(#[A-Za-z0-9_-]+\)\s*$/, '');
          break;
        }
      }
    }
  });

  md.core.ruler.after('anchor', 'apply-explicit-heading-id', (state) => {
    const tokens = state.tokens;
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.type !== 'heading_open' || !token.meta || !token.meta.explicitId) continue;
      token.attrSet('id', token.meta.explicitId);
      const inline = tokens[i + 1];
      if (!inline || !inline.children) continue;
      inline.children.forEach((child) => {
        if (child.type === 'link_open') {
          const href = child.attrGet('href');
          if (href && href.charAt(0) === '#') child.attrSet('href', '#' + token.meta.explicitId);
        }
      });
    }
  });
}

module.exports = explicitHeadingIds;
