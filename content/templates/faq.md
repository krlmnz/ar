---
layout: layouts/faq.njk
order: 3
title: FAQ
overline: Page template
subtitle: Questions and answers, with search-engine structured data for free.
summary: Accordion — expandable questions, no JavaScript, plus FAQPage markup.
faqs:
  - q: Do I need cash in Chile?
    a: Some. Cards work nearly everywhere in Santiago, but markets, small towns and hot springs are cash-only.
  - q: Is the tap water safe?
    a: Yes in Santiago and most cities. It's heavily mineralised, so it may taste different to you.
  - q: How far in advance should I book Termas Geométricas?
    a: A few days in summer. It sells out on weekends.
---

Write an intro here if the page needs one, then list the questions in front
matter. The template renders them and also emits `schema.org/FAQPage` structured
data, so search engines can show the answers directly.

## Front matter

```yaml
layout: layouts/faq.njk    # required
title: Before you go       # required
overline: FAQ              # optional
subtitle: One line          # optional
faqs:                      # optional
  - q: The question        #   required per entry
    a: The answer.         #   required per entry
```

The JSON-LD block is only emitted when `faqs` is present.
