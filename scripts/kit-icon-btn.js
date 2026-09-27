/* Pull atoms from component-kit global.css.
   The kit is not an npm package, and that file is a full page stylesheet
   (reset, fonts, and its own --bg/--text), so the build keeps the atoms
   Studio uses: icon buttons, status tokens, alert, field, toast, danger,
   the kit :focus-visible rule, and the quiet .map-viewport.
   Pinned to component-kit PR #13 (cursor/studio-writer-themes-80a8) until
   that lands on kit main. That tip predates the status-focus token names
   from kit #10, so this extract follows the tokens that file actually
   defines. --focus-ring stays scoped to #studio. Published chrome keeps
   this site's ring. Studio shell focus is quieted in studio.css.
   map-style.js is fetched from the same commit and is not a second pin. */
const fs = require('fs');
const path = require('path');

const KIT_COMMIT = '09d6a82fa05c2007e3b223e5d9eb0539e079ac86';
const KIT_ROOT = 'https://raw.githubusercontent.com/krlmnz/component-kit/' + KIT_COMMIT;
const KIT_URL = KIT_ROOT + '/src/global.css';
const MAP_STYLE_URL = KIT_ROOT + '/map-style.js';
const OUT = path.join(__dirname, '..', 'assets/css/component-kit-icon-btn.css');
const MAP_STYLE_OUT = path.join(__dirname, '..', 'assets/js/kit-map-style.js');

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
  '--info',
  '--info-text',
  '--info-soft',
  '--info-wash',
  '--error-ring'
];

const MAP_TOKENS = [
  '--map-land',
  '--map-water',
  '--map-park',
  '--map-wood',
  '--map-beach',
  '--map-scrub',
  '--map-glacier',
  '--map-road',
  '--map-road-casing',
  '--map-building',
  '--map-hillshade',
  '--map-hillshade-opacity',
  '--map-label'
];

const THEME_STATUS = [
  '--success',
  '--success-text',
  '--success-soft',
  '--warn',
  '--warn-text',
  '--warn-soft',
  '--error',
  '--error-text',
  '--error-soft',
  '--info',
  '--info-text',
  '--info-soft',
  '--info-wash'
];

const THEME_IDS = ['night', 'note', 'signal', 'news', 'draft'];

/* Kit geometry for this name differs from the site ring. Keep the kit
   value inside Studio; published chrome keeps tokens.css. */
const STUDIO_TOKENS = [
  '--focus-ring'
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
  '.map-viewport',
  '.map-viewport:fullscreen',
  '.map-viewport__canvas',
  '.map-viewport .maplibregl-map',
  '.map-viewport .maplibregl-ctrl-logo',
  '.map-viewport .maplibregl-ctrl-group',
  '.map-viewport .maplibregl-ctrl-attrib',
  '.map-viewport .maplibregl-ctrl-attrib a',
  '.map-viewport .maplibregl-ctrl-attrib.maplibregl-compact',
  '.map-viewport .maplibregl-ctrl-attrib.maplibregl-compact .maplibregl-ctrl-attrib-inner',
  '.map-viewport .maplibregl-ctrl-attrib.maplibregl-compact .maplibregl-ctrl-attrib-button'
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

function presentDecls(body, names) {
  const found = names.filter((name) => new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*:').test(body));
  return found.length ? tokenDecls(body, found) : [];
}

function themeRule(blocks, id) {
  const block = blocks.find((item) => item.selector === '[data-theme="' + id + '"]');
  if (!block) throw new Error('component-kit global.css has no [data-theme="' + id + '"]');
  const decls = tokenDecls(block.body, MAP_TOKENS).concat(presentDecls(block.body, THEME_STATUS));
  return 'html[data-theme="' + id + '"] {\n  ' + decls.join('\n  ') + '\n}';
}

function extract(css) {
  const blocks = topLevelBlocks(stripComments(css));
  const root = blocks.find((block) => block.selector === ':root');
  if (!root) throw new Error('component-kit global.css has no :root');
  const tokens = tokenDecls(root.body, TOKENS.concat(MAP_TOKENS));
  const studioTokens = tokenDecls(root.body, STUDIO_TOKENS);
  const themeRules = THEME_IDS.map((id) => themeRule(blocks, id));
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
    themeRules.join('\n\n'),
    rules.join('\n\n')
  ].join('\n\n') + '\n';
}

function write(css) {
  const next = extract(css);
  if (!fs.existsSync(OUT) || fs.readFileSync(OUT, 'utf8') !== next) {
    fs.writeFileSync(OUT, next);
  }
}

function writeStyle(source) {
  if (!source.includes('KitMapStyle')) throw new Error('component-kit map-style.js did not include KitMapStyle');
  if (!fs.existsSync(MAP_STYLE_OUT) || fs.readFileSync(MAP_STYLE_OUT, 'utf8') !== source) {
    fs.writeFileSync(MAP_STYLE_OUT, source);
  }
}

async function fetchKit() {
  const response = await fetch(KIT_URL);
  if (!response.ok) throw new Error('Could not read component-kit (' + response.status + ')');
  const css = await response.text();
  if (!css.includes('.icon-btn--touch')) throw new Error('component-kit global.css did not include .icon-btn--touch');
  if (!css.includes('.map-viewport')) throw new Error('component-kit global.css did not include .map-viewport');
  write(css);
  const style = await fetch(MAP_STYLE_URL);
  if (!style.ok) throw new Error('Could not read component-kit map-style.js (' + style.status + ')');
  writeStyle(await style.text());
}

if (require.main === module) {
  fetchKit().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}

module.exports = { extract, KIT_COMMIT, KIT_URL, MAP_STYLE_URL, OUT, MAP_STYLE_OUT };
