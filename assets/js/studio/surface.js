import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import { StudioMarkdown } from './markdown.js';
import { StudioHeading } from './heading.js';
import { StudioParagraph } from './paragraph.js';
import { StudioCode } from './code-block.js';
import { Figure } from './figure.js';
import { HtmlBlock } from './html-block.js';
import { StudioSuperscript, StudioSubscript } from './scripts.js';

export function looksLikeMarkdown(text) {
  const source = String(text || '').trim();
  if (!source) return false;
  return (
    /^#{1,6}\s/m.test(source) ||
    /^```/m.test(source) ||
    /^>\s/m.test(source) ||
    /^(\s*[-*+]|\s*\d+\.)\s/m.test(source) ||
    /!\[[^\]]*\]\([^)]+\)/.test(source) ||
    /\[[^\]]+\]\(https?:\/\/[^)]+\)/.test(source) ||
    /\*\*[^*]+\*\*/.test(source) ||
    /~~[^~]+~~/.test(source) ||
    /\+\+[^+]+\+\+/.test(source) ||
    /==[^=]+==/.test(source) ||
    /(^|\n)---\s*($|\n)/.test(source)
  );
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_EDGE = 4096;
const WARN_IMAGE_EDGE = 2400;

const EXT_TYPES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  gif: 'image/gif',
  avif: 'image/avif'
};

export function fileType(file) {
  let type = (file && file.type ? file.type : '').toLowerCase().split(';')[0].trim();
  if (type === 'image/jpg') type = 'image/jpeg';
  const known = type === 'image/jpeg' || type === 'image/png' || type === 'image/webp' || type === 'image/svg+xml' || type === 'image/gif' || type === 'image/avif';
  if (known) return type;
  const match = String((file && file.name) || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  if (match && EXT_TYPES[match[1]]) return EXT_TYPES[match[1]];
  return type;
}

export function imageFiles(list) {
  return [...(list || [])].filter((file) => {
    if (!file) return false;
    const type = fileType(file);
    if (type === 'image/jpeg' || type === 'image/png' || type === 'image/webp' || type === 'image/svg+xml') return true;
    return (type || '').startsWith('image/') || /\.(gif|avif|svg|jpe?g|png|webp)$/i.test(file.name || '');
  });
}

function measureImage(file) {
  const url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth || 0;
      const height = img.naturalHeight || 0;
      URL.revokeObjectURL(url);
      resolve({ width, height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image.'));
    };
    img.src = url;
  });
}

function imageWarning(size) {
  const edge = Math.max(size.width, size.height);
  const tall = size.width > 0 && size.height / size.width > 5 / 4;
  if (edge > WARN_IMAGE_EDGE && tall) {
    return 'Still added. It is over 2400px and taller than 4:5. About 1600–2400px, in 3:2 or 16:9, fills the column.';
  }
  if (edge > WARN_IMAGE_EDGE) {
    return 'Still added. The long edge is over 2400px. About 1600–2400px fills the column.';
  }
  if (tall) {
    return 'Still added. Taller than 4:5. A 3:2 or 16:9 landscape fits the column better.';
  }
  return '';
}

export function mountEditor(element, hooks) {
  const uploadImage = hooks.uploadImage;
  const onChange = hooks.onChange || function () {};
  const onWarn = hooks.onWarn || function () {};

  const editor = new Editor({
    element,
    extensions: [
      StarterKit.configure({
        heading: false,
        paragraph: false,
        codeBlock: false,
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { target: null, rel: null, class: null }
        }
      }),
      StudioParagraph,
      StudioHeading.configure({ levels: [2, 3] }),
      Highlight,
      StudioSuperscript,
      StudioSubscript,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify']
      }),
      StudioCode,
      Figure,
      HtmlBlock,
      Placeholder.configure({ placeholder: 'Start writing…' }),
      StudioMarkdown
    ],
    content: '<p></p>',
    onSelectionUpdate() {
      if (hooks.onSelection) hooks.onSelection();
    },
    editorProps: {
      attributes: { class: 'prose', spellcheck: 'true' },
      handlePaste(view, event) {
        const files = imageFiles(event.clipboardData && event.clipboardData.files);
        const text = event.clipboardData ? event.clipboardData.getData('text/plain') : '';
        const html = event.clipboardData ? event.clipboardData.getData('text/html') : '';
        if (files.length) {
          event.preventDefault();
          event.stopPropagation();
          insertFiles(files);
          return true;
        }
        if (text && text.trim().startsWith('<svg')) {
          event.preventDefault();
          insertFiles([new File([text], 'paste.svg', { type: 'image/svg+xml' })]);
          return true;
        }
        if (text && !html && looksLikeMarkdown(text)) {
          event.preventDefault();
          insertMarkdown(text);
          return true;
        }
        return false;
      },
      handleDrop(view, event) {
        const files = imageFiles(event.dataTransfer && event.dataTransfer.files);
        if (!files.length) return false;
        event.preventDefault();
        event.stopPropagation();
        insertFiles(files);
        return true;
      }
    },
    onUpdate() {
      onChange();
    }
  });

  function replaceSrc(from, to) {
    const { state } = editor;
    let tr = state.tr;
    let changed = false;
    state.doc.descendants((node, pos) => {
      if (node.type.name === 'figure' && node.attrs.src === from) {
        tr = tr.setNodeMarkup(pos, undefined, { ...node.attrs, src: to });
        changed = true;
      }
    });
    if (changed) editor.view.dispatch(tr);
  }

  function removeSrc(src) {
    const { state } = editor;
    let tr = state.tr;
    const cuts = [];
    state.doc.descendants((node, pos) => {
      if (node.type.name === 'figure' && node.attrs.src === src) cuts.push({ pos, size: node.nodeSize });
    });
    cuts.reverse().forEach((cut) => { tr = tr.delete(cut.pos, cut.pos + cut.size); });
    if (cuts.length) editor.view.dispatch(tr);
  }

  async function prepareImage(file) {
    const type = fileType(file);
    if (type !== 'image/jpeg' && type !== 'image/png' && type !== 'image/webp' && type !== 'image/svg+xml') {
      throw new Error('Use a JPEG, PNG, WebP, or an SVG diagram.');
    }
    if (file.size > MAX_IMAGE_BYTES) throw new Error('That image is over 5 MB.');
    if (type === 'image/svg+xml') return { width: 0, height: 0 };
    const size = await measureImage(file);
    const edge = Math.max(size.width, size.height);
    if (!edge) throw new Error('Could not read that image.');
    if (edge > MAX_IMAGE_EDGE) throw new Error('That image is over 4096px on the long edge.');
    const warning = imageWarning(size);
    if (warning) onWarn(warning);
    return size;
  }

  async function insertFiles(files) {
    for (const file of files) {
      let size;
      try {
        size = await prepareImage(file);
      } catch (error) {
        onChange(error);
        continue;
      }
      const preview = URL.createObjectURL(file);
      const alt = (file.name || '').replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
      editor.chain().focus().insertFigure({
        src: preview,
        alt: alt === 'paste' ? '' : alt,
        caption: '',
        layout: 'column',
        width: size.width || 0,
        height: size.height || 0,
        decorative: false
      }).run();
      try {
        const url = await uploadImage(file);
        replaceSrc(preview, url);
      } catch (error) {
        removeSrc(preview);
        onChange(error);
      } finally {
        URL.revokeObjectURL(preview);
      }
    }
  }

  function parsed(markdown) {
    const json = editor.markdown.parse(markdown || '');
    if (json && json.content && json.content.length) return json;
    return { type: 'doc', content: [{ type: 'paragraph' }] };
  }

  function insertMarkdown(text) {
    const json = parsed(text);
    editor.chain().focus().insertContent(json.content).run();
  }

  function setMarkdown(markdown, emitUpdate) {
    editor.commands.setContent(parsed(markdown), { emitUpdate: !!emitUpdate });
  }

  function getMarkdown() {
    return editor.getMarkdown();
  }

  async function persistLocalImages() {
    const pending = [];
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'figure' && /^(blob:|data:)/.test(node.attrs.src || '')) {
        pending.push(node.attrs.src);
      }
    });
    for (const src of pending) {
      const blob = await fetch(src).then((res) => res.blob());
      const type = blob.type || 'image/png';
      const ext = type.includes('svg') ? 'svg' : (type.split('/')[1] || 'png');
      const file = new File([blob], 'image.' + ext, { type });
      const url = await uploadImage(file);
      replaceSrc(src, url);
    }
  }

  return {
    editor,
    insertFiles,
    setMarkdown,
    getMarkdown,
    persistLocalImages,
    focus() { editor.commands.focus('end'); },
    destroy() { editor.destroy(); }
  };
}
