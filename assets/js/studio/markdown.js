import { Markdown } from '@tiptap/markdown';

/* @tiptap/markdown 3.31.3 registers setContent and insertContent with an
 * unbound `commands` reference, so those overrides throw. The parser and
 * serializer still come from the extension. Core keeps the real commands. */
export const StudioMarkdown = Markdown.extend({
  addCommands() {
    return {};
  }
});
