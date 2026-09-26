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

function imageFiles(list) {
  return [...(list || [])].filter((file) => {
    if (!file) return false;
    if ((file.type || '').startsWith('image/')) return true;
    return /\.svg$/i.test(file.name || '');
  });
}

export function mountEditor(element, hooks) {
  const uploadImage = hooks.uploadImage;
  const onChange = hooks.onChange || function () {};

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

  async function insertFiles(files) {
    for (const file of files) {
      const preview = URL.createObjectURL(file);
      const alt = (file.name || '').replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
      editor.chain().focus().insertFigure({
        src: preview,
        alt: alt === 'paste' ? '' : alt,
        caption: '',
        layout: 'center'
      }).run();
      try {
        const url = await uploadImage(file);
        replaceSrc(preview, url);
        URL.revokeObjectURL(preview);
      } catch (error) {
        onChange(error);
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
