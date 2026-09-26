import CodeBlock from '@tiptap/extension-code-block';

/* Fenced code, plus a light copy control that matches the reader-facing one. */
export const StudioCode = CodeBlock.extend({
  addNodeView() {
    return ({ node, editor, getPos }) => {
      const dom = document.createElement('div');
      dom.className = 'studio-code';

      const bar = document.createElement('div');
      bar.className = 'studio-code__bar';

      const lang = document.createElement('input');
      lang.type = 'text';
      lang.className = 'studio-code__lang';
      lang.setAttribute('aria-label', 'Code language');
      lang.placeholder = 'Language';
      lang.spellcheck = false;
      lang.value = node.attrs.language || '';

      const copy = document.createElement('button');
      copy.type = 'button';
      copy.className = 'copy';
      copy.textContent = 'Copy';

      bar.append(lang, copy);

      const pre = document.createElement('pre');
      const code = document.createElement('code');
      if (node.attrs.language) code.className = 'language-' + node.attrs.language;
      pre.append(code);
      dom.append(bar, pre);

      function writeLanguage() {
        const pos = getPos();
        if (typeof pos !== 'number') return;
        const current = editor.state.doc.nodeAt(pos);
        if (!current) return;
        const value = lang.value.trim();
        if ((current.attrs.language || '') === value) return;
        editor.view.dispatch(editor.view.state.tr.setNodeMarkup(pos, undefined, {
          ...current.attrs,
          language: value || null
        }));
      }

      lang.addEventListener('change', writeLanguage);
      lang.addEventListener('blur', writeLanguage);
      lang.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          writeLanguage();
        }
        event.stopPropagation();
      });

      copy.addEventListener('mousedown', (event) => event.preventDefault());
      copy.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(code.innerText);
          copy.textContent = 'Copied';
          window.setTimeout(() => { copy.textContent = 'Copy'; }, 1200);
        } catch (e) {
          copy.textContent = 'Select text';
        }
      });

      return {
        dom,
        contentDOM: code,
        update(updated) {
          if (updated.type.name !== 'codeBlock') return false;
          if (document.activeElement !== lang && lang.value !== (updated.attrs.language || '')) {
            lang.value = updated.attrs.language || '';
          }
          code.className = updated.attrs.language ? 'language-' + updated.attrs.language : '';
          return true;
        },
        stopEvent(event) {
          return bar.contains(event.target);
        },
        ignoreMutation(mutation) {
          return bar.contains(mutation.target);
        }
      };
    };
  }
});
