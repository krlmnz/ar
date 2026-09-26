#!/usr/bin/env node
/* Scaffold a new page from a starter.
 *
 *   npm run new -- place "Termas de Chillán"
 *   npm run new -- dispatch "Dinner at ten"
 *   npm run new -- story "The hill, then the sea"
 *
 * Creates the file in the right folder with a slug, today's date, and the
 * front matter that layout actually reads. Never overwrites. New pages start
 * as published: false.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const TEMPLATES = require('../_data/templates');

const ROOT = path.join(__dirname, '..');
const STARTERS = path.join(ROOT, '_starters');

const KINDS = Object.fromEntries(TEMPLATES.map((t) => [t.id, t]));

const slugify = (s) => s
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/[^\w\s-]/g, '')
  .trim()
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-');

function usage(msg) {
  if (msg) console.error(`\n  ${msg}\n`);
  console.error('  Usage:  npm run new -- <kind> "<Title>"\n');
  console.error('  Kinds:');
  TEMPLATES.forEach((t) => {
    const tag = t.advanced ? '  (advanced)' : '';
    console.error(`    ${t.id.padEnd(12)} ${t.title}${tag}`);
  });
  console.error('\n  Example: npm run new -- place "Termas de Chillán"\n');
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

const url = spec.dir ? `/places/${slug}/` : `/${slug}/`;
console.log(`
  Created  ${path.relative(ROOT, target)}
  Preview  http://localhost:8080${url}   (npm start)

  published is false, so this page stays out of listings, maps, and the sitemap
  until you flip it. The comments in the file explain every field.
`);
