/* The twelve public templates. scripts/new.js and /templates/ both read this.
 *
 * `out` + `dir` tell `npm run new` where the file goes.
 * dir: true → <out>/<slug>/index.md (places). Otherwise <out>/<slug>.md.
 */
module.exports = [
  {
    id: 'guide',
    title: 'Field guide',
    when: 'A long explainer people jump around in. Left contents rail, optional cover.',
    order: 1,
    starter: 'guide.md',
    out: 'content',
    layout: 'layouts/guide.njk'
  },
  {
    id: 'reference',
    title: 'Reference',
    when: 'A deep essay. No sidebar — hierarchy comes from type, space, quotes, and lists.',
    order: 2,
    starter: 'reference.md',
    out: 'content',
    layout: 'layouts/reference.njk'
  },
  {
    id: 'center',
    title: 'Center',
    when: 'The lowest-friction page. A title and a calm centered column.',
    order: 3,
    starter: 'center.md',
    out: 'content',
    layout: 'layouts/center.njk'
  },
  {
    id: 'dispatch',
    title: 'Dispatch',
    when: 'A magazine article. Overline, big title, standfirst, byline, and a larger lead.',
    order: 4,
    starter: 'dispatch.md',
    out: 'content',
    layout: 'layouts/dispatch.njk'
  },
  {
    id: 'place',
    title: 'Place',
    when: 'A destination. Facts, a map pin, and short prose. Shows up in Places and on maps once published.',
    order: 5,
    starter: 'place.md',
    out: 'content/places',
    dir: true,
    layout: 'layouts/place.njk'
  },
  {
    id: 'practical',
    title: 'Practical',
    when: 'A checklist. Numbered steps, a tip, and an optional list of what you need.',
    order: 6,
    starter: 'practical.md',
    out: 'content',
    layout: 'layouts/practical.njk'
  },
  {
    id: 'faq',
    title: 'FAQ',
    when: 'Questions people scan. Each heading becomes a question.',
    order: 7,
    starter: 'faq.md',
    out: 'content',
    layout: 'layouts/faq.njk'
  },
  {
    id: 'gallery',
    title: 'Gallery',
    when: 'Images with captions, and a short intro if you want one.',
    order: 8,
    starter: 'gallery.md',
    out: 'content',
    layout: 'layouts/gallery.njk'
  },
  {
    id: 'itinerary',
    title: 'Itinerary',
    when: 'Day by day. Each “Day N” heading becomes a stop on a timeline.',
    order: 9,
    starter: 'itinerary.md',
    out: 'content',
    layout: 'layouts/itinerary.njk'
  },
  {
    id: 'route',
    title: 'Route',
    when: 'A map and an ordered list of stops, with a short intro under the line.',
    order: 10,
    starter: 'route.md',
    out: 'content',
    layout: 'layouts/route.njk'
  },
  {
    id: 'story',
    title: 'Story',
    when: 'Advanced. A scrolly map: each step has text and a camera.',
    order: 11,
    advanced: true,
    starter: 'story.md',
    out: 'content',
    layout: 'layouts/story.njk'
  },
  {
    id: 'browse',
    title: 'Browse',
    when: 'A split index. Cards for places or other pages — a hub, not a long essay.',
    order: 12,
    starter: 'browse.md',
    out: 'content',
    layout: 'layouts/browse.njk'
  }
];
