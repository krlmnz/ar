import { Node } from '@tiptap/core';
import { sanitizeHtml } from './sanitize.js';

/* Block HTML the article already uses (plain-language boxes, callouts) stays
 * in the file. The visual editor shows it; markdown mode is how you edit it. */
export const HtmlBlock = Node.create({
  name: 'htmlBlock',
  group: 'block',
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      source: { default: '' }
    };
  },
  parseHTML() {
    return [{
      tag: 'div',
      priority: 40,
      getAttrs(dom) {
        return { source: dom.outerHTML };
      }
    }];
  },
  renderHTML({ node }) {
    return ['div', { 'data-html-block': 'true', 'data-source': node.attrs.source || '' }];
  },
  renderMarkdown(node) {
    return (node.attrs && node.attrs.source) || '';
  },
  addNodeView() {
    return ({ node }) => {
      let source = node.attrs.source || '';
      const dom = document.createElement('div');
      dom.className = 'studio-html';
      dom.setAttribute('contenteditable', 'false');
      dom.innerHTML = sanitizeHtml(source);
      return {
        dom,
        update(updated) {
          if (updated.type.name !== 'htmlBlock') return false;
          if (updated.attrs.source !== source) {
            source = updated.attrs.source || '';
            dom.innerHTML = sanitizeHtml(source);
          }
          return true;
        },
        stopEvent() {
          return true;
        }
      };
    };
  }
});
