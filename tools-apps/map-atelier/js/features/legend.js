// ═══════════════════════════════════════════════════════════════
// LEGEND BUILDER — the cartographic-first pane. A taxonomy and a
// brand color go in; a hierarchical, pattern-paired, audited legend
// comes out.
//
// The generator (core/scale.js) is pure and deterministic, so state
// stores the *inputs* — brand, taxonomy, patterns on/off — and never
// the generated swatches. Regenerating is cheap, the share URL stays
// short, and a legend can never drift out of sync with the rules
// that produced it.
//
// The accessibility audit is not a validation step at the end. It
// re-runs on every edit and is visible the whole time, because a
// legend that fails is a legend you want to know about while you can
// still change the taxonomy — not after you've built the map.
// ═══════════════════════════════════════════════════════════════
import { generateLegend, auditLegend, legendToTokens } from '../core/scale.js';
import { simulateCVD } from '../core/cvd.js';
import { patternInkColor } from '../core/color.js';
import { ptnPreviewURL } from '../core/pattern-svg.js';
import { setLayerColor } from './map.js';
import { ptnComposite } from './patterns-engine.js';
import { LAYERS } from '../data/map-layers.js';
import { S, persist } from '../store/state.js';
import { $, esc } from '../core/dom.js';
import { bus } from '../core/bus.js';
import { toast } from './toast.js';

// Which simulation the swatches are currently shown through.
// '' = normal vision.
let sim = '';
let cache = null; // { legend, audit } — invalidated on every input change

// Empty-state default. "Neutral" has to mean restrained, not achromatic:
// a true grey has almost no chroma (~0.009), and every hue derived from it
// lands on top of every other, so the audit fails before the user has done
// anything wrong. This slate reads as unbranded but carries enough chroma
// to generate a legend that genuinely passes.
const NEUTRAL_BRAND = '#5B7C99';

function legendState() {
  if (!S.legend) S.legend = { brand: '', taxonomy: [], patterns: true };
  return S.legend;
}

function compute() {
  const ls = legendState();
  if (!ls.taxonomy.length) return (cache = null);
  const legend = generateLegend(ls.brand || NEUTRAL_BRAND, ls.taxonomy, { patterns: ls.patterns });
  cache = { legend, audit: auditLegend(legend) };
  return cache;
}

// ── swatch rendering ───────────────────────────────────────────
function shown(hex) {
  return sim ? simulateCVD(hex, sim) : hex;
}

function swatchStyle(sw) {
  const fill = shown(sw.hex);
  if (!sw.pattern) return `background:${fill}`;
  // The pattern preview is tinted with the swatch's own ink so the
  // legend chip matches what the map will actually paint.
  const ink = shown(patternInkColor(sw.hex));
  const url = ptnPreviewURL({ ...sw.pattern, strokeColor: ink, backgroundColor: null });
  return `background-color:${fill};background-image:${url};background-size:22px 22px`;
}

function renderSwatches() {
  const host = $('lg-swatches');
  if (!host) return;
  if (!cache) {
    host.innerHTML = `<div class="lg-empty">
      Add a category group to generate a legend. Every swatch gets a color
      <em>and</em> a pattern, so the map still reads in grayscale.
    </div>`;
    return;
  }
  const prompt = legendState().brand ? '' : `<div class="lg-prompt">
    Showing a neutral default. Set a brand color above to build the scale on your own hue.
  </div>`;

  host.innerHTML = prompt + cache.legend.groups.map(g => `
    <div class="lg-group">
      <div class="lg-group-head">
        <span class="lg-group-name">${esc(g.name)}</span>
        <span class="lg-group-meta">${g.swatches.length} · ${esc(g.patternStyle || 'color only')}</span>
      </div>
      ${g.swatches.map(sw => `
        <div class="lg-row">
          <span class="lg-chip" style="${swatchStyle(sw)}"></span>
          <span class="lg-name">${esc(sw.name)}</span>
          <code class="lg-hex">${shown(sw.hex)}</code>
        </div>`).join('')}
    </div>`).join('');
}

// ── audit readout ──────────────────────────────────────────────
function renderAudit() {
  const host = $('lg-audit');
  if (!host) return;
  if (!cache) { host.innerHTML = ''; return; }
  const a = cache.audit;

  const badge = a.pass
    ? `<span class="lg-badge pass">Accessible</span>`
    : `<span class="lg-badge fail">Needs work</span>`;

  const rows = a.cvd.map(c => `
    <button class="lg-cvd${sim === c.type ? ' on' : ''}" data-sim="${c.type}"
            title="${esc(c.hint)} — click to preview">
      <span class="lg-cvd-dot ${c.pass ? 'ok' : 'no'}"></span>
      <span class="lg-cvd-label">${esc(c.label)}</span>
      <span class="lg-cvd-de">ΔE ${c.min.toFixed(1)}</span>
    </button>`).join('');

  host.innerHTML = `
    <div class="lg-audit-head">
      ${badge}
      <span class="lg-audit-sum">${cache.legend.flat.length} categories · min ΔE ${a.deltaE.toFixed(1)}</span>
    </div>
    <div class="lg-cvd-grid">
      <button class="lg-cvd${sim === '' ? ' on' : ''}" data-sim="">
        <span class="lg-cvd-dot ${a.normalPass ? 'ok' : 'no'}"></span>
        <span class="lg-cvd-label">Full color</span>
        <span class="lg-cvd-de">ΔE ${a.deltaE.toFixed(1)}</span>
      </button>
      ${rows}
    </div>
    ${a.warnings.length ? `<ul class="lg-warnings">${a.warnings.map(w => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}
  `;

  host.querySelectorAll('[data-sim]').forEach(b => {
    b.onclick = () => { sim = b.dataset.sim; renderAudit(); renderSwatches(); };
  });
}

// ── taxonomy editor ────────────────────────────────────────────
function renderTaxonomy() {
  const host = $('lg-taxonomy');
  if (!host) return;
  const ls = legendState();

  host.innerHTML = ls.taxonomy.map((g, gi) => `
    <div class="lg-tax-group" data-g="${gi}">
      <div class="lg-tax-head">
        <input class="lg-tax-name" data-g="${gi}" value="${esc(g.name)}"
               placeholder="Group name" aria-label="Group ${gi + 1} name">
        <button class="lg-x" data-del-group="${gi}" aria-label="Remove ${esc(g.name)}">×</button>
      </div>
      ${(g.children || []).map((c, ci) => `
        <div class="lg-tax-child">
          <input class="lg-tax-cname" data-g="${gi}" data-c="${ci}" value="${esc(c)}"
                 placeholder="Category" aria-label="Category ${ci + 1} in ${esc(g.name)}">
          <button class="lg-x" data-del-child="${gi}:${ci}" aria-label="Remove ${esc(c)}">×</button>
        </div>`).join('')}
      <button class="lg-add-child" data-add-child="${gi}">+ category</button>
    </div>`).join('');

  // group rename
  host.querySelectorAll('.lg-tax-name').forEach(inp => {
    inp.oninput = () => { ls.taxonomy[+inp.dataset.g].name = inp.value; commit({ keepFocus: true }); };
  });
  // member rename
  host.querySelectorAll('.lg-tax-cname').forEach(inp => {
    inp.oninput = () => { ls.taxonomy[+inp.dataset.g].children[+inp.dataset.c] = inp.value; commit({ keepFocus: true }); };
  });
  host.querySelectorAll('[data-add-child]').forEach(b => {
    b.onclick = () => {
      const g = ls.taxonomy[+b.dataset.addChild];
      (g.children ||= []).push(`Category ${g.children.length + 1}`);
      commit();
    };
  });
  host.querySelectorAll('[data-del-group]').forEach(b => {
    b.onclick = () => { ls.taxonomy.splice(+b.dataset.delGroup, 1); commit(); };
  });
  host.querySelectorAll('[data-del-child]').forEach(b => {
    b.onclick = () => {
      const [gi, ci] = b.dataset.delChild.split(':').map(Number);
      ls.taxonomy[gi].children.splice(ci, 1);
      commit();
    };
  });
}

// Re-render everything downstream of an input change. Typing in a name
// field must not blow away the caret, so the taxonomy DOM is left alone
// when the edit came from inside it.
function commit({ keepFocus = false } = {}) {
  compute();
  if (!keepFocus) renderTaxonomy();
  renderAudit();
  renderSwatches();
  persist();
}

// ── apply to the map ───────────────────────────────────────────
// v1 proving ground: the legend paints the basemap's own surfaces, which
// is enough to show the color+pattern system rendering at real map scale
// and at real zoom. User-drawn polygons are a separate data model and a
// separate piece of work.
function applyToMap() {
  if (!cache) return;
  const targets = LAYERS.filter(l => l.type !== 'line');
  const groups = cache.legend.groups;
  if (!groups.length) return;

  // One representative per *group*, not the first N swatches. Walking the
  // flat list would hand all four surfaces colors from group 0 — four
  // near-identical tints of one hue, which shows off none of the system.
  // Taking a mid-ranked member from each group in turn puts a different
  // hue and a different pattern axis on every surface.
  targets.forEach((layer, i) => {
    const g = groups[i % groups.length];
    const sw = g.swatches[Math.floor(g.swatches.length / 2)];
    setLayerColor(layer.id, sw.hex);
    if (layer.canPattern && sw.pattern) {
      S.patterns[layer.id] = { ...sw.pattern };
      ptnComposite(layer.id);
    }
  });
  persist();
  toast(`Legend applied to ${targets.length} map surfaces`);
}

// ── export ─────────────────────────────────────────────────────
function exportTokens() {
  if (!cache) return;
  const tokens = legendToTokens(cache.legend, S.title || 'meridian');
  const blob = new Blob([JSON.stringify(tokens, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(S.title || 'meridian').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-tokens.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Design tokens exported');
}

// ── init ───────────────────────────────────────────────────────
export function init() {
  const brand = $('lg-brand'), hex = $('lg-brand-hex');

  const setBrand = (v) => {
    if (!/^#[0-9a-f]{6}$/i.test(v)) return;
    legendState().brand = v;
    if (brand) brand.value = v;
    if (hex && hex.value.toLowerCase() !== v.toLowerCase()) hex.value = v;
    commit({ keepFocus: true });
  };

  brand?.addEventListener('input', () => setBrand(brand.value));
  hex?.addEventListener('input', () => setBrand(hex.value.trim()));

  $('lg-add-group')?.addEventListener('click', () => {
    const t = legendState().taxonomy;
    t.push({ name: `Group ${t.length + 1}`, children: ['Category 1', 'Category 2'] });
    commit();
  });

  $('lg-patterns')?.addEventListener('change', (e) => {
    legendState().patterns = e.target.checked;
    commit();
  });

  $('lg-apply')?.addEventListener('click', applyToMap);
  $('lg-export')?.addEventListener('click', exportTokens);

  bus.on('state:replaced', render);
  render();
}

function render() {
  const ls = legendState();
  const brand = $('lg-brand'), hex = $('lg-brand-hex'), ptn = $('lg-patterns');
  if (brand) brand.value = ls.brand || NEUTRAL_BRAND;
  if (hex) hex.value = ls.brand || '';
  if (ptn) ptn.checked = ls.patterns !== false;
  compute();
  renderTaxonomy();
  renderAudit();
  renderSwatches();
}
