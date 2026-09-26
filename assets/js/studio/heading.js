import Heading from '@tiptap/extension-heading';

/* The document title is the page's h1. Body headings stay h2 and h3 so the
 * writing surface matches a published essay. Deeper pasted headings fold up. */
export const StudioHeading = Heading.extend({
  parseMarkdown(token, helpers) {
    let level = token.depth || 2;
    if (level < 2) level = 2;
    if (level > 3) level = 3;
    return helpers.createNode('heading', { level }, helpers.parseInline(token.tokens || []));
  }
});
