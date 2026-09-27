/* Pull atoms from component-kit global.css.
   The kit is not an npm package, and that file is a full page stylesheet
   (reset, fonts, and its own --bg/--text), so the build keeps the atoms
   Studio uses: icon buttons, status tokens, alert, field, toast, danger,
   selection, and the kit :focus-visible rule. Night and signal are this
   site's dark themes; they reuse the kit [data-theme="dark"] status tokens
   verbatim.
   Pinned to component-kit PR #10 (cursor/status-focus-tokens-63a0) until
   that lands on kit main. --focus-ring and --selected-ring stay this
   site's tokens: published chrome already uses them, and Studio shell
   focus is quieted in studio.css rather than framed by :focus-visible. */
const fs = require('fs');
const path = require('path');

const KIT_COMMIT = 'ca353121fcd90087e561c218a11b86bc9a8b648d';
const KIT_URL = 'https://raw.githubusercontent.com/krlmnz/component-kit/' + KIT_COMMIT + '/src/global.css';
const OUT = path.join(__dirname, '..', 'assets/css/component-kit-icon-btn.css');

const TOKENS = [
  '--icon-btn-size',
  '--control-height-touch',
  '--icon-btn-size-touch',
  '--icon-size-md',
  '--success',
  '--success-text',
  '--success-soft',
  '--success-wash',
  '--warn',
  '--warn-text',
  '--warn-soft',
  '--warn-wash',
  '--error',
  '--error-text',
  '--error-soft',
  '--error-wash',
  '--info',
  '--info-text',
  '--info-soft',
  '--info-wash',
  '--info-border',
  '--success-border',
  '--warn-border',
  '--error-border',
  '--focus-color',
  '--focus-outline',
  '--error-outline',
  '--error-ring',
  '--selection-bg',
  '--selection-text'
];

/* Kit geometry for this name differs from the site ring. Keep the kit
   value inside Studio; published chrome keeps tokens.css. */
const STUDIO_TOKENS = [
  '--focus-ring'
];

const DARK_TOKENS = [
  '--success',
  '--success-text',
  '--warn',
  '--warn-text',
  '--error',
  '--error-text',
  '--error-soft',
  '--info',
  '--info-text',
  '--info-soft',
  '--info-wash',
  '--focus-color'
];

const SELECTORS = [
  '.icon-btn',
  '.icon-btn:hover',
  '.icon-btn:focus-visible',
  '.icon-btn svg',
  '.icon-btn--touch',
  '.icon-btn--touch svg',
  '.btn--icon.btn--touch',
  '.btn--icon.btn--touch svg',
  '.btn--danger',
  '.btn--danger:hover:not(:disabled)',
  '.field',
  '.field__label',
  '.field__label .req',
  '.field__hint',
  '.field__error',
  '.input',
  '.select',
  '.textarea',
  '.input:hover',
  '.select:hover',
  '.textarea:hover',
  '.input:focus',
  '.select:focus',
  '.textarea:focus',
  '.input:focus-visible',
  '.select:focus-visible',
  '.textarea:focus-visible',
  '.input::placeholder',
  '.textarea::placeholder',
  '.field--invalid .input',
  '.field--invalid .select',
  '.field--invalid .textarea',
  '.field--invalid .input:focus',
  '.field--invalid .input:focus-visible',
  '.field--invalid .select:focus',
  '.field--invalid .select:focus-visible',
  '.field--invalid .textarea:focus',
  '.field--invalid .textarea:focus-visible',
  '.menu-list__item--danger',
  '.menu-list__item--danger svg',
  '.alert',
  '.alert__icon',
  '.alert__body',
  '.alert__title',
  '.alert--info',
  '.alert--success',
  '.alert--warn',
  '.alert--error',
  '.toast',
  '.toast__icon',
  '.toast--success .toast__icon',
  '.toast--error .toast__icon',
  '.toast__body',
  '.toast__title',
  '.toast__dismiss',
  '.toast__dismiss:hover',
  '.toast__dismiss svg',
  '.tile--selected',
  '.visually-hidden',
  ':focus-visible',
  '::selection',
  '::-moz-selection'
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

function tokenDecls(body, names) {
  return names.map((name) => {
    const match = body.match(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*:[^;]+;'));
    if (!match) throw new Error('component-kit is missing ' + name);
    return match[0].replace(/\s+/g, ' ').trim();
  });
}

function extract(css) {
  const blocks = topLevelBlocks(stripComments(css));
  const root = blocks.find((block) => block.selector === ':root');
  const dark = blocks.find((block) => block.selector === '[data-theme="dark"]');
  if (!root) throw new Error('component-kit global.css has no :root');
  if (!dark) throw new Error('component-kit global.css has no [data-theme="dark"]');
  const tokens = tokenDecls(root.body, TOKENS);
  const studioTokens = tokenDecls(root.body, STUDIO_TOKENS);
  const darkTokens = tokenDecls(dark.body, DARK_TOKENS);
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
  return [
    ':root {\n  ' + tokens.join('\n  ') + '\n}',
    '#studio {\n  ' + studioTokens.join('\n  ') + '\n}',
    '[data-theme="dark"],\nhtml[data-theme="night"],\nhtml[data-theme="signal"] {\n  ' + darkTokens.join('\n  ') + '\n}',
    rules.join('\n\n')
  ].join('\n\n') + '\n';
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
