import { Node } from '@tiptap/core';

function escapeAttr(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function layoutOf(value) {
  return value === 'full' ? 'full' : 'center';
}

/* Images persist as markdown when they are plain, and as a figure when they
 * have a caption or a full-width layout. Eleventy already allows HTML. */
export const Figure = Node.create({
  name: 'figure',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,
  markdownTokenName: 'image',
  addAttributes() {
    return {
      src: { default: '' },
      alt: { default: '' },
      caption: { default: '' },
      layout: { default: 'center' }
    };
  },
  parseHTML() {
    return [
      {
        tag: 'figure',
        priority: 70,
        getAttrs(dom) {
          const img = dom.querySelector('img');
          if (!img) return false;
          const caption = dom.querySelector('figcaption');
          const layout = dom.getAttribute('data-layout') || (dom.classList.contains('figure--full') ? 'full' : 'center');
          return {
            src: img.getAttribute('src') || '',
            alt: img.getAttribute('alt') || '',
            caption: caption ? caption.textContent.trim() : '',
            layout: layoutOf(layout)
          };
        }
      },
      {
        tag: 'img[src]',
        priority: 40,
        getAttrs(dom) {
          if (dom.closest('figure')) return false;
          return {
            src: dom.getAttribute('src') || '',
            alt: dom.getAttribute('alt') || '',
            caption: dom.getAttribute('title') || '',
            layout: 'center'
          };
        }
      }
    ];
  },
  renderHTML({ node }) {
    const layout = layoutOf(node.attrs.layout);
    const children = [['img', { src: node.attrs.src || '', alt: node.attrs.alt || '' }]];
    if (node.attrs.caption) children.push(['figcaption', {}, node.attrs.caption]);
    return ['figure', { class: 'figure figure--' + layout, 'data-layout': layout }, ...children];
  },
  parseMarkdown(token, helpers) {
    return helpers.createNode('figure', {
      src: token.href || '',
      alt: token.text || '',
      caption: token.title || '',
      layout: 'center'
    });
  },
  renderMarkdown(node) {
    const attrs = node.attrs || {};
    const src = attrs.src || '';
    const alt = String(attrs.alt || '').replace(/[\[\]]/g, '');
    const caption = String(attrs.caption || '').trim();
    const layout = layoutOf(attrs.layout);
    if (!caption && layout !== 'full') return '![' + alt + '](' + src + ')';
    const cap = caption ? '\n  <figcaption>' + escapeHtml(caption) + '</figcaption>' : '';
    return '<figure class="figure figure--' + layout + '" data-layout="' + layout + '">\n  <img src="' + escapeAttr(src) + '" alt="' + escapeAttr(alt) + '">' + cap + '\n</figure>';
  },
  addCommands() {
    return {
      insertFigure: (attrs) => ({ commands }) => commands.insertContent({ type: this.name, attrs })
    };
  },
  addNodeView() {
    return ({ node, editor, getPos }) => {
      const dom = document.createElement('figure');
      const layout = layoutOf(node.attrs.layout);
      dom.className = 'figure figure--' + layout + ' studio-figure';
      dom.setAttribute('data-layout', layout);

      const img = document.createElement('img');
      img.src = node.attrs.src || '';
      img.alt = node.attrs.alt || '';
      img.draggable = false;

      const caption = document.createElement('figcaption');
      caption.setAttribute('contenteditable', 'true');
      caption.setAttribute('data-placeholder', 'Caption');
      caption.spellcheck = true;
      caption.textContent = node.attrs.caption || '';

      const tools = document.createElement('div');
      tools.className = 'studio-figure__tools';

      const alt = document.createElement('input');
      alt.type = 'text';
      alt.className = 'studio-figure__alt';
      alt.setAttribute('aria-label', 'Alt text');
      alt.placeholder = 'Alt text';
      alt.value = node.attrs.alt || '';

      function layoutButton(value, label) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'studio-figure__layout';
        button.dataset.layout = value;
        button.textContent = label;
        button.setAttribute('aria-label', label + ' image');
        button.setAttribute('aria-pressed', layoutOf(node.attrs.layout) === value ? 'true' : 'false');
        button.addEventListener('mousedown', (event) => event.preventDefault());
        button.addEventListener('click', () => patch({ layout: value }));
        return button;
      }

      const center = layoutButton('center', 'Center');
      const full = layoutButton('full', 'Full');
      tools.append(alt, center, full);
      dom.append(img, caption, tools);

      function patch(next) {
        const pos = getPos();
        if (typeof pos !== 'number') return;
        const live = editor.state.doc.nodeAt(pos);
        if (!live) return;
        editor.view.dispatch(editor.view.state.tr.setNodeMarkup(pos, undefined, {
          ...live.attrs,
          ...next
        }));
      }

      caption.addEventListener('input', () => patch({ caption: caption.textContent || '' }));
      alt.addEventListener('input', () => patch({ alt: alt.value }));
      alt.addEventListener('keydown', (event) => event.stopPropagation());

      function paint(updated) {
        const nextLayout = layoutOf(updated.attrs.layout);
        dom.className = 'figure figure--' + nextLayout + ' studio-figure';
        dom.setAttribute('data-layout', nextLayout);
        if (img.getAttribute('src') !== (updated.attrs.src || '')) img.src = updated.attrs.src || '';
        img.alt = updated.attrs.alt || '';
        if (document.activeElement !== caption && caption.textContent !== (updated.attrs.caption || '')) {
          caption.textContent = updated.attrs.caption || '';
        }
        if (document.activeElement !== alt && alt.value !== (updated.attrs.alt || '')) {
          alt.value = updated.attrs.alt || '';
        }
        center.setAttribute('aria-pressed', nextLayout === 'center' ? 'true' : 'false');
        full.setAttribute('aria-pressed', nextLayout === 'full' ? 'true' : 'false');
      }

      return {
        dom,
        update(updated) {
          if (updated.type.name !== 'figure') return false;
          paint(updated);
          return true;
        },
        stopEvent(event) {
          return caption.contains(event.target) || tools.contains(event.target);
        },
        ignoreMutation(mutation) {
          return caption.contains(mutation.target) || tools.contains(mutation.target) || mutation.target === caption;
        },
        selectNode() {
          dom.classList.add('is-selected');
        },
        deselectNode() {
          dom.classList.remove('is-selected');
        }
      };
    };
  }
});
