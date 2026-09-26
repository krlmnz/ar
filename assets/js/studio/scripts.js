import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';

/* These marks have no markdown spelling. HTML is already allowed on the site,
 * and the editor's HTML parser turns the tags back into marks. */
function htmlMark(tag) {
  return {
    renderMarkdown(node, helpers) {
      return '<' + tag + '>' + helpers.renderChildren(node) + '</' + tag + '>';
    }
  };
}

export const StudioSuperscript = Superscript.extend(Object.assign({
  excludes: '_ subscript'
}, htmlMark('sup')));

export const StudioSubscript = Subscript.extend(Object.assign({
  excludes: '_ superscript'
}, htmlMark('sub')));
