/* Pull icon-button tokens and rules from component-kit.
   The kit is not an npm package, and src/global.css is a full page
   stylesheet, so the build reads that file at a pinned commit and keeps
   only the icon-button atom. */
const fs = require('fs');
const path = require('path');

const KIT_COMMIT = '35d55cebe216e31593f9a52a94ef25a44b7f599c';
const KIT_URL = 'https://raw.githubusercontent.com/krlmnz/component-kit/' + KIT_COMMIT + '/src/global.css';
const OUT = path.join(__dirname, '..', 'assets/css/component-kit-icon-btn.css');

const TOKENS = [
  '--icon-btn-size',
  '--control-height-touch',
  '--icon-btn-size-touch',
  '--icon-size-md'
];

const SELECTORS = [
  '.icon-btn',
  '.icon-btn:hover',
  '.icon-btn:focus-visible',
  '.icon-btn svg',
  '.icon-btn--touch',
  '.icon-btn--touch svg',
  '.btn--icon.btn--touch',
  '.btn--icon.btn--touch svg'
];

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function topLevelBlocks(css) {
  const blocks = [];
  let i = 0;
  while (i < css.length) {
    while (i < css.length && /\s/.test(css[i])) i += 1;
    if (i >= css.length) break;
    const start = css.indexOf('{', i);
    if (start === -1) break;
    let depth = 0;
    let end = -1;
    for (let j = start; j < css.length; j += 1) {
      if (css[j] === '{') depth += 1;
      else if (css[j] === '}') {
        depth -= 1;
        if (depth === 0) {
          end = j;
          break;
        }
      }
    }
    if (end === -1) throw new Error('Unclosed CSS block in component-kit global.css');
    blocks.push({
      selector: css.slice(i, start).trim(),
      body: css.slice(start + 1, end).trim()
    });
    i = end + 1;
  }
  return blocks;
}

function selectorParts(selector) {
  return selector.split(',').map((part) => part.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

function extract(css) {
  const blocks = topLevelBlocks(stripComments(css));
  const root = blocks.find((block) => block.selector === ':root');
  if (!root) throw new Error('component-kit global.css has no :root');
  const tokens = TOKENS.map((name) => {
    const match = root.body.match(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*:[^;]+;'));
    if (!match) throw new Error('component-kit is missing ' + name);
    return match[0].replace(/\s+/g, ' ').trim();
  });
  const wanted = new Set(SELECTORS);
  const rules = [];
  const seen = new Set();
  blocks.forEach((block) => {
    const parts = selectorParts(block.selector);
    if (!parts.length || !parts.every((part) => wanted.has(part))) return;
    parts.forEach((part) => seen.add(part));
    const selector = parts.join(',\n');
    rules.push(selector + ' {\n  ' + block.body.replace(/\s*\n\s*/g, '\n  ').trim() + '\n}');
  });
  SELECTORS.forEach((selector) => {
    if (!seen.has(selector)) throw new Error('component-kit is missing ' + selector);
  });
  return ':root {\n  ' + tokens.join('\n  ') + '\n}\n\n' + rules.join('\n\n') + '\n';
}

function write(css) {
  const next = extract(css);
  if (!fs.existsSync(OUT) || fs.readFileSync(OUT, 'utf8') !== next) {
    fs.writeFileSync(OUT, next);
  }
}

async function fetchKit() {
  const response = await fetch(KIT_URL);
  if (!response.ok) throw new Error('Could not read component-kit (' + response.status + ')');
  const css = await response.text();
  if (!css.includes('.icon-btn--touch')) throw new Error('component-kit global.css did not include .icon-btn--touch');
  write(css);
}

if (require.main === module) {
  fetchKit().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}

module.exports = { extract, KIT_COMMIT, KIT_URL, OUT };
