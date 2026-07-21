---
layout: layouts/simple.njk
order: 6
title: Simple
overline: Page template
subtitle: One column of prose. About, colophon, thanks, legal.
summary: Centred single column — the narrowest, quietest option.
---

The plainest option: a masthead and one column. No structured front matter
beyond the title and an optional overline and subtitle.

Use it for the pages that are just words — an about page, a colophon, a
thank-you note, terms. If you find yourself adding structure to it, one of the
other five templates probably fits better.

## Front matter

```yaml
layout: layouts/simple.njk   # required
title: About                 # required
overline: Colophon           # optional
subtitle: One line           # optional
```

That's the whole surface area. Everything else is markdown.
