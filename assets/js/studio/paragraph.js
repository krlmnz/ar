import Paragraph from '@tiptap/extension-paragraph';
import { applyAlign, withAlign } from './align.js';

export const StudioParagraph = Paragraph.extend({
  parseMarkdown(token, helpers) {
    return applyAlign(Paragraph.config.parseMarkdown.call(this, token, helpers));
  },

  renderMarkdown(node, helpers, ctx) {
    return withAlign(Paragraph.config.renderMarkdown.call(this, node, helpers, ctx), node);
  }
});
