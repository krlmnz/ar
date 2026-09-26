/* The two post templates. scripts/new.js and the studio both read this.
 *
 * guide — left contents rail, built from headings.
 * center — one column, no rail.
 */
module.exports = [
  {
    id: 'guide',
    title: 'Field guide',
    when: 'A post with a contents rail on the left. Each heading becomes a link.',
    order: 1,
    starter: 'guide.md',
    out: 'content',
    layout: 'layouts/guide.njk'
  },
  {
    id: 'center',
    title: 'Essay',
    when: 'One column. No left navigation. A title, then the writing.',
    order: 2,
    starter: 'center.md',
    out: 'content',
    layout: 'layouts/center.njk'
  }
];
