import { Node } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';

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

function px(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n);
}

/* Column width is the published default: class "figure" only.
 * Center and full are the opt-in modifiers from the theme. */
function layoutOf(value) {
  if (value === 'center' || value === 'full') return value;
  return 'column';
}

function layoutFromDom(dom) {
  if (dom.classList.contains('figure--full')) return 'full';
  if (dom.classList.contains('figure--center')) return 'center';
  const data = dom.getAttribute('data-layout');
  if (data === 'full' || data === 'center') return data;
  return 'column';
}

function figureClass(layout, extra) {
  const name = layoutOf(layout);
  const parts = ['figure'];
  if (name === 'center') parts.push('figure--center');
  if (name === 'full') parts.push('figure--full');
  if (extra) parts.push(extra);
  return parts.join(' ');
}

function imgAttrs(attrs) {
  const img = {
    src: attrs.src || '',
    alt: attrs.alt || '',
    loading: 'lazy',
    decoding: 'async'
  };
  const width = px(attrs.width);
  const height = px(attrs.height);
  if (width) img.width = String(width);
  if (height) img.height = String(height);
  return img;
}

/* Figures serialize as HTML so width, height, lazy loading, and the layout
 * class survive markdown. A bare image with no caption still uses <figure>,
 * because the alt field and the layout controls live on that node. */
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
      layout: { default: 'column' },
      width: { default: 0 },
      height: { default: 0 },
      decorative: { default: false }
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
          return {
            src: img.getAttribute('src') || '',
            alt: img.getAttribute('alt') || '',
            caption: caption ? caption.textContent.trim() : '',
            layout: layoutFromDom(dom),
            width: px(img.getAttribute('width')),
            height: px(img.getAttribute('height')),
            decorative: dom.getAttribute('data-decorative') === 'true'
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
            layout: 'column',
            width: px(dom.getAttribute('width')),
            height: px(dom.getAttribute('height')),
            decorative: false
          };
        }
      }
    ];
  },
  renderHTML({ node }) {
    const layout = layoutOf(node.attrs.layout);
    const children = [['img', imgAttrs(node.attrs)]];
    if (node.attrs.caption) children.push(['figcaption', {}, node.attrs.caption]);
    const attrs = { class: figureClass(layout), 'data-layout': layout };
    if (node.attrs.decorative) attrs['data-decorative'] = 'true';
    return ['figure', attrs, ...children];
  },
  parseMarkdown(token, helpers) {
    return helpers.createNode('figure', {
      src: token.href || '',
      alt: token.text || '',
      caption: token.title || '',
      layout: 'column'
    });
  },
  renderMarkdown(node) {
    const attrs = node.attrs || {};
    const layout = layoutOf(attrs.layout);
    const width = px(attrs.width);
    const height = px(attrs.height);
    let img = '<img src="' + escapeAttr(attrs.src) + '" alt="' + escapeAttr(attrs.alt) + '"';
    if (width) img += ' width="' + width + '"';
    if (height) img += ' height="' + height + '"';
    img += ' loading="lazy" decoding="async">';
    const cap = String(attrs.caption || '').trim()
      ? '\n  <figcaption>' + escapeHtml(String(attrs.caption).trim()) + '</figcaption>'
      : '';
    const decorative = attrs.decorative ? ' data-decorative="true"' : '';
    return '<figure class="' + figureClass(layout) + '" data-layout="' + layout + '"' + decorative + '>\n  ' + img + cap + '\n</figure>';
  },
  addCommands() {
    return {
      insertFigure: (attrs) => ({ commands }) => commands.insertContent({ type: this.name, attrs })
    };
  },
  addNodeView() {
    return ({ node, editor, getPos }) => {
      const dom = document.createElement('figure');
      const img = document.createElement('img');
      img.draggable = false;
      img.loading = 'lazy';
      img.decoding = 'async';

      const caption = document.createElement('figcaption');
      caption.setAttribute('contenteditable', 'true');
      caption.setAttribute('data-placeholder', 'Caption');
      caption.spellcheck = true;

      const tools = document.createElement('div');
      tools.className = 'studio-figure__tools';

      const alt = document.createElement('input');
      alt.type = 'text';
      alt.className = 'studio-figure__alt';
      alt.setAttribute('aria-label', 'Alt text');
      alt.placeholder = 'Alt text';

      const decorative = document.createElement('button');
      decorative.type = 'button';
      decorative.className = 'studio-figure__decorative';
      decorative.textContent = 'Decorative';
      decorative.setAttribute('aria-label', 'Mark image as decorative');

      const altWarn = document.createElement('p');
      altWarn.className = 'studio-figure__hint';
      altWarn.textContent = 'Add alt text, or mark it decorative.';

      const hint = document.createElement('p');
      hint.className = 'studio-figure__hint';
      hint.textContent = 'Fills the column (~72ch). Prefer 3:2 or 16:9, long edge 1600–2400px.';

      function layoutButton(value, label) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'studio-figure__layout';
        button.dataset.layout = value;
        button.textContent = label;
        button.setAttribute('aria-label', label + ' width');
        button.addEventListener('mousedown', (event) => event.preventDefault());
        button.addEventListener('click', () => patch({ layout: value }));
        return button;
      }

      const column = layoutButton('column', 'Column');
      const center = layoutButton('center', 'Center');
      const full = layoutButton('full', 'Full');
      tools.append(alt, decorative, column, center, full, altWarn, hint);
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

      /* A click on the image should select the figure. ProseMirror skips
       * selectNode when the node is already selected, and the gap cursor
       * can claim the click when the hit position is beside the atom. */
      dom.addEventListener('mousedown', (event) => {
        if (event.button !== 0) return;
        if (caption.contains(event.target) || tools.contains(event.target)) return;
        const pos = getPos();
        if (typeof pos !== 'number') return;
        const sel = editor.state.selection;
        if (sel instanceof NodeSelection && sel.from === pos) return;
        event.preventDefault();
        editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, pos)));
      });
      decorative.addEventListener('mousedown', (event) => event.preventDefault());
      decorative.addEventListener('click', () => {
        const pos = getPos();
        const live = typeof pos === 'number' ? editor.state.doc.nodeAt(pos) : null;
        const on = !(live && live.attrs.decorative);
        patch(on ? { decorative: true, alt: '' } : { decorative: false });
      });
      caption.addEventListener('input', () => patch({ caption: caption.textContent || '' }));
      alt.addEventListener('input', () => patch({ alt: alt.value, decorative: false }));
      alt.addEventListener('keydown', (event) => event.stopPropagation());

      function paint(updated) {
        const nextLayout = layoutOf(updated.attrs.layout);
        /* Assigning className would drop ProseMirror's selected-node class,
         * and a later update would not put it back. Toggle layout only. */
        dom.classList.remove('figure--center', 'figure--full');
        dom.classList.add('figure', 'studio-figure');
        if (nextLayout === 'center') dom.classList.add('figure--center');
        if (nextLayout === 'full') dom.classList.add('figure--full');
        dom.setAttribute('data-layout', nextLayout);
        if (updated.attrs.decorative) dom.setAttribute('data-decorative', 'true');
        else dom.removeAttribute('data-decorative');
        if (img.getAttribute('src') !== (updated.attrs.src || '')) img.src = updated.attrs.src || '';
        img.alt = updated.attrs.alt || '';
        const width = px(updated.attrs.width);
        const height = px(updated.attrs.height);
        if (width) img.width = width;
        else img.removeAttribute('width');
        if (height) img.height = height;
        else img.removeAttribute('height');
        if (document.activeElement !== caption && caption.textContent !== (updated.attrs.caption || '')) {
          caption.textContent = updated.attrs.caption || '';
        }
        if (document.activeElement !== alt && alt.value !== (updated.attrs.alt || '')) {
          alt.value = updated.attrs.alt || '';
        }
        decorative.setAttribute('aria-pressed', updated.attrs.decorative ? 'true' : 'false');
        column.setAttribute('aria-pressed', nextLayout === 'column' ? 'true' : 'false');
        center.setAttribute('aria-pressed', nextLayout === 'center' ? 'true' : 'false');
        full.setAttribute('aria-pressed', nextLayout === 'full' ? 'true' : 'false');
        const needsAlt = !updated.attrs.decorative && !String(updated.attrs.alt || '').trim();
        altWarn.hidden = !needsAlt;
      }

      paint(node);

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
