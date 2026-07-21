---
layout: layouts/gallery.njk
order: 5
title: Gallery
overline: Page template
subtitle: Image-led — a photo essay, a place portfolio, a look-book.
summary: Figure grid — a full-width opener, then tiles that reflow.
figures:
  - alt: Red wooden walkway winding through steam at Termas Geométricas
    caption: Termas Geométricas — the walkway does most of the work.
  - alt: Vineyard rows in the Casablanca Valley
    caption: Casablanca Valley, mid-morning.
  - alt: Volcán Villarrica smoking at dawn
    caption: Villarrica, from the road out of Pucón.
---

For pages where the pictures are the point. Add a `src` to each figure once you
have photography; until then each one renders a labelled placeholder at the right
aspect ratio, so you can lay the page out before the shoot.

Images are lazy-loaded and the grid reflows on its own — no breakpoints to set.

## Front matter

```yaml
layout: layouts/gallery.njk     # required
title: The Lake District        # required
overline: Photo essay           # optional
subtitle: One line              # optional
figures:                        # optional
  - src: /assets/img/pucon.jpg  #   optional — omit for a placeholder
    alt: What the photo shows   #   required for accessibility
    caption: Shown beneath.     #   optional
```

`alt` describes the image for screen readers; `caption` is visible text. Write
both — they do different jobs.
