#!/usr/bin/env node
/* Scaffold a new page from a starter.
 *
 *   npm run new -- place "Termas de Chillán"
 *   npm run new -- article "Why Chileans eat at eleven"
 *   npm run new -- story "The Potters of Pomaire"
 *
 * Creates the file in the right folder with a slug, today's date, and the
 * front matter that layout actually reads. Never overwrites.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const STARTERS = path.join(ROOT, '_starters');

// kind -> where it goes. `dir: true` means content/<folder>/<slug>/index.md
const KINDS = {
  place:        { starter: 'place.md',            out: 'content/places',    dir: true },
  guide:        { starter: 'guide.md',            out: 'content/guides' },
  practical:    { starter: 'practical.md',        out: 'content/practical' },
  article:      { starter: 'article.md',          out: 'content' },
  manual:       { starter: 'manual.md',           out: 'content' },
  itinerary:    { starter: 'itinerary.md',        out: 'content' },
  faq:          { starter: 'faq.md',              out: 'content' },
  reference:    { starter: 'reference.md',        out: 'content' },
  gallery:      { starter: 'gallery.md',          out: 'content' },
  simple:       { starter: 'simple.md',           out: 'content' },
  story:        { starter: 'map-story.md',        out: 'content' },
  route:        { starter: 'map-route.md',        out: 'content' },
  neighborhood: { starter: 'map-neighborhood.md', out: 'content' },
  area:         { starter: 'map-area.md',         out: 'content' },
  browse:       { starter: 'map-split.md',        out: 'content' }
};

const slugify = (s) => s
  .normalize('NFD').replace(/[̀-ͯ]/g, '')   // Pucón -> Pucon
  .toLowerCase()
  .replace(/[^\w\s-]/g, '')
  .trim()
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-');

function usage(msg) {
  if (msg) console.error(`\n  ${msg}\n`);
  console.error('  Usage:  npm run new -- <kind> "<Title>"\n');
  console.error('  Kinds:  ' + Object.keys(KINDS).join(', ') + '\n');
  console.error('  Example: npm run new -- place "Termas de Chillán"\n');
  process.exit(1);
}

const [kind, ...rest] = process.argv.slice(2);
const title = rest.join(' ').trim();

if (!kind) usage('Which kind of page?');
if (!KINDS[kind]) usage(`Unknown kind "${kind}".`);
if (!title) usage('Give it a title, in quotes.');

const spec = KINDS[kind];
const slug = slugify(title);
if (!slug) usage('That title produces an empty slug — try plainer characters.');

const starterPath = path.join(STARTERS, spec.starter);
if (!fs.existsSync(starterPath)) {
  console.error(`\n  Missing starter: _starters/${spec.starter}\n`);
  process.exit(1);
}

const target = spec.dir
  ? path.join(ROOT, spec.out, slug, 'index.md')
  : path.join(ROOT, spec.out, `${slug}.md`);

if (fs.existsSync(target)) {
  console.error(`\n  Already exists: ${path.relative(ROOT, target)}\n  Nothing written.\n`);
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const body = fs.readFileSync(starterPath, 'utf8')
  .replace(/__TITLE__/g, title.replace(/"/g, '\\"'))
  .replace(/__SLUG__/g, slug)
  .replace(/__DATE__/g, today);

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, body);

const url = spec.dir ? `/${path.basename(spec.out)}/${slug}/` : `/${slug}/`;
console.log(`
  Created  ${path.relative(ROOT, target)}
  Preview  http://localhost:8080${url}   (npm start)

  The file has comments explaining every field. Delete the ones you don't need —
  every optional field disappears cleanly when omitted.
`);
