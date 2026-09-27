import { Node } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';

function escapeAttr(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function layoutOf(value) {
  return value === 'full' ? 'full' : 'center';
}

function newMapId() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return 'map-' + Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/* Inline map. The file stores mapId and layout only. Places, routes, and
   cards stay with Map Editor behind that id. */
export const MapEmbed = Node.create({
  name: 'mapEmbed',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      mapId: { default: '' },
      layout: { default: 'center' }
    };
  },
  parseHTML() {
    return [{
      tag: 'div.map-viewport[data-map-id]',
      priority: 80,
      getAttrs(dom) {
        const mapId = dom.getAttribute('data-map-id') || '';
        if (!mapId) return false;
        return { mapId: mapId, layout: layoutOf(dom.getAttribute('data-layout')) };
      }
    }];
  },
  renderHTML({ node }) {
    const layout = layoutOf(node.attrs.layout);
    return ['div', {
      class: 'map-viewport',
      'data-map-id': node.attrs.mapId || '',
      'data-layout': layout
    }, ['div', {
      class: 'map-viewport__canvas',
      role: 'application',
      'aria-label': 'Map'
    }]];
  },
  renderMarkdown(node) {
    const attrs = node.attrs || {};
    const layout = layoutOf(attrs.layout);
    const mapId = escapeAttr(attrs.mapId);
    return '<div class="map-viewport" data-map-id="' + mapId + '" data-layout="' + layout + '">\n  <div class="map-viewport__canvas" role="application" aria-label="Map"></div>\n</div>';
  },
  addCommands() {
    return {
      insertMap: () => ({ commands }) => commands.insertContent({
        type: this.name,
        attrs: { mapId: newMapId(), layout: 'center' }
      })
    };
  },
  addNodeView() {
    return ({ node, editor, getPos }) => {
      const dom = document.createElement('div');
      dom.className = 'studio-map';
      dom.setAttribute('contenteditable', 'false');

      const viewport = document.createElement('div');
      viewport.className = 'map-viewport';
      const canvas = document.createElement('div');
      canvas.className = 'map-viewport__canvas';
      canvas.setAttribute('role', 'application');
      canvas.setAttribute('aria-label', 'Map');
      viewport.append(canvas);

      const tools = document.createElement('div');
      tools.className = 'studio-figure__tools';

      function layoutButton(value, label) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'studio-figure__layout';
        button.textContent = label;
        button.setAttribute('aria-label', label + ' width');
        button.addEventListener('mousedown', (event) => event.preventDefault());
        button.addEventListener('click', () => patch({ layout: value }));
        return button;
      }

      const center = layoutButton('center', 'Center');
      const full = layoutButton('full', 'Full');
      tools.append(center, full);
      /* Open in Map Editor stays off until a real editor base exists
         in this repo or in env. Do not invent a product URL. */
      dom.append(viewport, tools);

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

      dom.addEventListener('mousedown', (event) => {
        if (event.button !== 0) return;
        if (tools.contains(event.target)) return;
        const pos = getPos();
        if (typeof pos !== 'number') return;
        const sel = editor.state.selection;
        if (sel instanceof NodeSelection && sel.from === pos) return;
        event.preventDefault();
        editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, pos)));
      });

      function paint(updated) {
        const layout = layoutOf(updated.attrs.layout);
        const mapId = updated.attrs.mapId || '';
        dom.setAttribute('data-layout', layout);
        viewport.setAttribute('data-map-id', mapId);
        viewport.setAttribute('data-layout', layout);
        center.setAttribute('aria-pressed', layout === 'center' ? 'true' : 'false');
        full.setAttribute('aria-pressed', layout === 'full' ? 'true' : 'false');
        if (window.AndeanKitMap) {
          window.AndeanKitMap.mount(canvas);
          window.AndeanKitMap.resize(canvas);
        }
      }

      paint(node);
      return {
        dom,
        update(updated) {
          if (updated.type.name !== 'mapEmbed') return false;
          paint(updated);
          return true;
        },
        destroy() {
          if (window.AndeanKitMap) window.AndeanKitMap.unmount(canvas);
        },
        stopEvent(event) {
          return tools.contains(event.target);
        }
      };
    };
  }
});
