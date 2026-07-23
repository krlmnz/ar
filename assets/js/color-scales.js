/* ============================================================
   Color Scales tool — /tools/color-scales/
   Two brand colors blend into an 11-step base scale, which is
   sampled down to 5/7/9/11 steps and previewed against a bar
   chart and a heatmap that map real data values through it.
   Ported from https://codepen.io/krlmnz/pen/KwaBBMj — same
   color math and card/export behaviour, wired to this page's
   markup and the site's real dark-mode toggle.
============================================================ */
(function () {
  'use strict';

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  const root = $('.scale-tool');
  if (!root) return;

  /* ---------------------------------------------------------------
     Constants
  --------------------------------------------------------------- */
  const BRAND = [
    '#A7CADA', '#00A470', '#2592C2', '#434340', '#A77943',
    '#BACD2F', '#D556AA', '#F89B17', '#FCF9E8', '#FCFBA0',
    '#FF4E4F', '#FFE901', '#FFF8DC',
  ];
  const STEP_OPTIONS = [5, 7, 9, 11];
  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'];
  const BAR_VALS = [0.28, 0.65, 0.42, 0.87, 0.35, 0.78, 0.55, 0.19, 0.96, 0.48];
  const CHORO_VALS = [
    [0.08, 0.20, 0.38, 0.55, 0.70, 0.82],
    [0.18, 0.38, 0.60, 0.80, 0.90, 0.72],
    [0.28, 0.52, 0.75, 0.98, 0.84, 0.60],
    [0.15, 0.34, 0.54, 0.70, 0.60, 0.40],
    [0.06, 0.16, 0.30, 0.44, 0.34, 0.20],
  ];

  /* ---------------------------------------------------------------
     State
  --------------------------------------------------------------- */
  let globals = [];        // brand palette hexes
  let scales = [];         // [{ id, colorA, colorB, steps }]
  let idCtr = 0;
  let popCtx = null;       // { scaleId, endpoint: 'A'|'B' }
  let stepsLocked = true;
  let globalSteps = 11;

  /* ---------------------------------------------------------------
     Color math
  --------------------------------------------------------------- */
  function hexToRgb(hex) {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    const n = parseInt(hex, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function rgbToHex(r, g, b) {
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase();
  }

  function blendRgb(a, b, t) {
    return a.map((c, i) => Math.round((1 - t) * c + t * b[i]));
  }

  function parseColor(raw) {
    raw = raw.trim();
    if (/^[0-9A-Fa-f]{3}$/.test(raw)) raw = '#' + raw;
    if (/^[0-9A-Fa-f]{6}$/.test(raw)) raw = '#' + raw;
    if (/^#[0-9A-Fa-f]{3}$/.test(raw)) {
      const [, r, g, b] = raw.match(/^#(.)(.)(.)$/);
      return ('#' + r + r + g + g + b + b).toUpperCase();
    }
    if (/^#[0-9A-Fa-f]{6}$/.test(raw)) return raw.toUpperCase();
    const m = raw.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (m) return rgbToHex(+m[1], +m[2], +m[3]);
    try {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 1;
      const cx = cv.getContext('2d');
      cx.fillStyle = '#000'; cx.fillRect(0, 0, 1, 1);
      cx.fillStyle = raw; cx.fillRect(0, 0, 1, 1);
      const d = cx.getImageData(0, 0, 1, 1).data;
      if (d[0] === 0 && d[1] === 0 && d[2] === 0 && raw.toLowerCase() !== 'black') return null;
      return rgbToHex(d[0], d[1], d[2]);
    } catch (e) { return null; }
  }

  /* ---------------------------------------------------------------
     Scale math — blend two colors into an 11-step base, sample
     that down to the active step count (never regenerated fresh,
     so a scale's tone stays stable as you switch step counts).
  --------------------------------------------------------------- */
  function makeBlendScale(aHex, bHex) {
    const a = hexToRgb(aHex), b = hexToRgb(bHex);
    return Array.from({ length: 11 }, (_, i) => rgbToHex(...blendRgb(a, b, i / 10)));
  }

  function computeColors(sc) { return makeBlendScale(sc.colorA, sc.colorB || '#FFFFFF'); }

  function sampleColors(colors, n) {
    if (n >= colors.length) return colors;
    if (n === 1) return [colors[Math.floor(colors.length / 2)]];
    return Array.from({ length: n }, (_, i) => colors[Math.round((i * (colors.length - 1)) / (n - 1))]);
  }

  function getEffectiveSteps(sc) { return stepsLocked ? globalSteps : (sc.steps || 11); }
  function getSteps(sc) { return sampleColors(computeColors(sc), getEffectiveSteps(sc)); }
  function valueToColor(steps, v) { return steps[Math.round(Math.max(0, Math.min(1, v)) * (steps.length - 1))]; }

  /* ---------------------------------------------------------------
     Helpers
  --------------------------------------------------------------- */
  function shuffleArr(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pickRandom(arr, exclude) {
    const pool = arr.filter((c) => c !== exclude);
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : arr[0] || '#2592C2';
  }

  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function pickRandomSteps() { return STEP_OPTIONS[Math.floor(Math.random() * STEP_OPTIONS.length)]; }

  /* ---------------------------------------------------------------
     Scale state management
  --------------------------------------------------------------- */
  function createScale(colorA, colorB) {
    const pool = globals.length >= 2 ? globals : BRAND;
    const a = colorA || pickRandom(pool, null) || '#2592C2';
    const b = colorB || pickRandom(pool, a) || '#FF4E4F';
    return { id: ++idCtr, colorA: a, colorB: b, steps: pickRandomSteps() };
  }

  function addScale(colorA, colorB) {
    scales.unshift(createScale(colorA, colorB));
    renderScalesList();
  }

  function removeScale(id) {
    scales = scales.filter((s) => s.id !== id);
    renderScalesList();
  }

  function setScaleColor(id, endpoint, hex) {
    const sc = scales.find((s) => s.id === id);
    if (!sc) return;
    if (endpoint === 'A') sc.colorA = hex; else sc.colorB = hex;
    updateCard(id);
  }

  function setCardSteps(id, n) {
    const sc = scales.find((s) => s.id === id);
    if (!sc) return;
    sc.steps = n;
    updateCard(id);
  }

  function setGlobalSteps(n) {
    globalSteps = n;
    $$('#scGlobalStepOpts .sc-step-opt').forEach((btn) => {
      btn.classList.toggle('sc-active', Number(btn.dataset.n) === n);
    });
    if (stepsLocked) renderScalesList();
  }

  function toggleLock() {
    stepsLocked = !stepsLocked;
    const btn = $('#scLockBtn');
    btn.classList.toggle('sc-locked', stepsLocked);
    btn.title = stepsLocked ? 'Locked — steps apply to every scale' : 'Unlocked — set steps per scale';
    if (stepsLocked) scales.forEach((sc) => (sc.steps = globalSteps));
    renderScalesList();
  }

  /* ---------------------------------------------------------------
     Preview builders — map real data values through the scale
  --------------------------------------------------------------- */
  function buildBarSvg(sc) {
    const steps = getSteps(sc);
    const sorted = [...BAR_VALS].sort((a, b) => a - b);
    const w = 200, h = 72, pad = 1, barW = w / BAR_VALS.length;
    const bars = BAR_VALS.map((v, i) => {
      const rank = sorted.indexOf(v);
      const color = valueToColor(steps, rank / (BAR_VALS.length - 1));
      const bh = Math.max(4, v * h), x = i * barW + pad, y = h - bh;
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(barW - pad * 2).toFixed(1)}" height="${bh.toFixed(1)}" fill="${color}"/>`;
    }).join('');
    return `<svg class="sc-preview-svg" viewBox="0 0 ${w} ${h}" height="72" preserveAspectRatio="none">${bars}</svg>`;
  }

  function buildHeatmapSvg(sc) {
    const steps = getSteps(sc);
    const rows = CHORO_VALS.length, cols = CHORO_VALS[0].length;
    const w = 200, h = 72, cw = w / cols, ch = h / rows;
    const cells = CHORO_VALS.flatMap((row, ri) =>
      row.map((v, ci) => {
        const color = valueToColor(steps, v);
        return `<rect x="${(ci * cw).toFixed(1)}" y="${(ri * ch).toFixed(1)}" width="${Math.ceil(cw + 0.5)}" height="${Math.ceil(ch + 0.5)}" fill="${color}"/>`;
      })
    ).join('');
    return `<svg class="sc-preview-svg" viewBox="0 0 ${w} ${h}" height="72" preserveAspectRatio="none">${cells}</svg>`;
  }

  /* ---------------------------------------------------------------
     Export — all scales
  --------------------------------------------------------------- */
  function allScaleName(sc) {
    return `${sc.colorA.slice(1).toLowerCase()}-to-${(sc.colorB || 'FFFFFF').replace('#', '').toLowerCase()}`;
  }

  function allSvgString() {
    const SWATCH = 40, GAP = 12;
    let blocks = [], y = 0;
    scales.forEach((sc) => {
      const colors = getSteps(sc);
      blocks.push(colors.map((c, i) => `  <rect x="${i * SWATCH}" y="${y}" width="${SWATCH}" height="${SWATCH}" fill="${c}"/>`).join('\n'));
      y += SWATCH + GAP;
    });
    const maxW = Math.max(...scales.map((sc) => getSteps(sc).length)) * SWATCH;
    const totalH = y - GAP;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${maxW}" height="${totalH}" viewBox="0 0 ${maxW} ${totalH}">\n${blocks.join('\n')}\n</svg>`;
  }

  function allCssString() {
    const sections = scales.map((sc) => {
      const colors = getSteps(sc);
      const name = `scale-${allScaleName(sc)}`;
      return colors.map((c, i) => `  --${name}-${String(Math.round((i * 100) / (colors.length - 1))).padStart(3, '0')}: ${c};`).join('\n');
    });
    return `:root {\n  /* Color Scales — ${scales.length} scale${scales.length !== 1 ? 's' : ''} */\n\n${sections.join('\n\n')}\n}`;
  }

  function allFigmaTokens() {
    const tokens = {};
    scales.forEach((sc) => {
      const colors = getSteps(sc);
      const name = `scale/${allScaleName(sc)}`;
      colors.forEach((c, i) => {
        const step = String(Math.round((i * 100) / (colors.length - 1))).padStart(3, '0');
        tokens[`${name}/${step}`] = { $type: 'color', $value: c };
      });
    });
    return JSON.stringify(tokens, null, 2);
  }

  function allPromptText() {
    const header = `Color Scale System — ${scales.length} scale${scales.length !== 1 ? 's' : ''}\n${'─'.repeat(44)}`;
    const body = scales.map((sc, idx) => {
      const colors = getSteps(sc);
      const steps = colors.map((c, i) => `  ${String(Math.round((i * 100) / (colors.length - 1))).padStart(3)}%  ${c}`).join('\n');
      return `\nScale ${idx + 1}: ${sc.colorA} → ${sc.colorB || '#FFFFFF'} (${colors.length} steps)\n${steps}`;
    }).join('\n');
    return `${header}\n${body}`;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  function toast(msg) {
    const t = $('#scToast');
    t.textContent = msg;
    t.classList.add('sc-show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('sc-show'), 2200);
  }

  async function clipCopy(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) { return false; }
  }

  function flashBtn(key) {
    const btn = $(`.sc-utility-bar .sc-export-btn[data-key="${key}"]`);
    if (!btn) return;
    btn.classList.add('sc-copied');
    setTimeout(() => btn.classList.remove('sc-copied'), 1600);
  }

  async function exportAllSvg() {
    if (!scales.length) return toast('Add a scale first');
    await clipCopy(allSvgString());
    flashBtn('svg'); toast('SVG copied — paste into Figma or any editor');
  }
  async function exportAllCss() {
    if (!scales.length) return toast('Add a scale first');
    await clipCopy(allCssString());
    flashBtn('css'); toast('CSS copied');
  }
  async function exportAllFigma() {
    if (!scales.length) return toast('Add a scale first');
    await clipCopy(allFigmaTokens());
    flashBtn('figma'); toast('Figma tokens copied — use with Tokens Studio');
  }
  async function exportAllPrompt() {
    if (!scales.length) return toast('Add a scale first');
    await clipCopy(allPromptText());
    flashBtn('prompt'); toast('Copied for prompt');
  }
  function exportAllPng() {
    if (!scales.length) return toast('Add a scale first');
    const SWATCH = 80, GAP = 16;
    const maxCols = Math.max(...scales.map((sc) => getSteps(sc).length));
    const w = maxCols * SWATCH, h = scales.length * SWATCH + (scales.length - 1) * GAP;
    const cv = $('#scExportCanvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, w, h);
    scales.forEach((sc, si) => {
      const colors = getSteps(sc);
      const y = si * (SWATCH + GAP);
      colors.forEach((c, ci) => { ctx.fillStyle = c; ctx.fillRect(ci * SWATCH, y, SWATCH, SWATCH); });
    });
    cv.toBlob((blob) => { downloadBlob(blob, `color-scales-${scales.length}.png`); toast('PNG downloaded'); });
  }

  /* ---------------------------------------------------------------
     Render — scale card
  --------------------------------------------------------------- */
  function renderSwatches(sc) {
    return getSteps(sc).map((hex) => `
      <div class="sc-scale-step">
        <div class="sc-swatch" style="background:${hex}" data-hex="${hex}" title="Copy ${hex}">
          <div class="sc-copy-flash">Copied</div>
        </div>
        <div class="sc-swatch-hex">${hex}</div>
      </div>`).join('');
  }

  function cardInnerHtml(sc) {
    const effSteps = getEffectiveSteps(sc);
    const showCardSteps = !stepsLocked;
    const cardStepOpts = showCardSteps
      ? STEP_OPTIONS.map((n) => `<button class="sc-step-opt${n === effSteps ? ' sc-active' : ''}" data-n="${n}">${n}</button>`).join('')
      : '';

    return `
      <div class="sc-card-top">
        <div class="sc-card-top-left">
          <span class="sc-ctrl-label">From</span>
          <button class="sc-color-dot" style="background:${sc.colorA}" title="${sc.colorA}" data-id="${sc.id}" data-endpoint="A"></button>
          <span class="sc-ctrl-arrow">→</span>
          <button class="sc-color-dot" style="background:${sc.colorB || '#FFFFFF'}" title="${sc.colorB || '#FFFFFF'}" data-id="${sc.id}" data-endpoint="B"></button>
        </div>
        <div class="sc-card-top-right">
          <div class="sc-card-step-pills${showCardSteps ? ' sc-visible' : ''}">
            <span class="sc-card-step-label">Steps</span>
            <div class="sc-step-opts" data-id="${sc.id}">${cardStepOpts}</div>
          </div>
          <button class="sc-remove-card-btn" data-id="${sc.id}" title="Remove" aria-label="Remove scale">${xIconSvg()}</button>
        </div>
      </div>
      <div class="sc-scale-row">${renderSwatches(sc)}</div>
      <div class="sc-preview-section">
        <div class="sc-preview-pane">
          <span class="sc-preview-pane-label">Bar chart</span>
          ${buildBarSvg(sc)}
        </div>
        <div class="sc-preview-pane">
          <span class="sc-preview-pane-label">Heatmap</span>
          ${buildHeatmapSvg(sc)}
        </div>
      </div>`;
  }

  function xIconSvg() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  }

  function updateCard(id) {
    const el = document.getElementById('sc' + id);
    if (el) el.innerHTML = cardInnerHtml(scales.find((s) => s.id === id));
  }

  function renderScalesList() {
    const list = $('#scScalesList');
    if (!scales.length) {
      list.innerHTML = '<div class="sc-empty-state"><h3>No scales yet</h3><p>Add one, or shuffle to start.</p></div>';
      return;
    }
    list.innerHTML = scales.map((sc) => `<div class="sc-scale-card" id="sc${sc.id}" data-id="${sc.id}">${cardInnerHtml(sc)}</div>`).join('');
  }

  /* ---------------------------------------------------------------
     Brand palette
  --------------------------------------------------------------- */
  function renderPalette() {
    const grid = $('#scPaletteGrid');
    if (!globals.length) { grid.innerHTML = '<span class="sc-pal-empty">No colors yet.</span>'; return; }
    grid.innerHTML = globals.map((h) => `
      <div class="sc-pal-swatch" style="background:${h}" title="${h}" data-hex="${h}">
        <button class="sc-x-btn" aria-label="Remove ${h}">${xIconSvg().replace('width="16" height="16"', 'width="9" height="9"')}</button>
      </div>`).join('');
  }

  function removeGlobal(hex) {
    globals = globals.filter((c) => c.toUpperCase() !== hex.toUpperCase());
    renderPalette();
    if ($('#scColorPop').classList.contains('sc-is-open')) renderPopGrid();
  }

  function addGlobal(hex) {
    hex = hex.toUpperCase();
    if (!globals.includes(hex)) {
      globals.push(hex);
      renderPalette();
      if ($('#scColorPop').classList.contains('sc-is-open')) renderPopGrid();
    }
  }

  /* ---------------------------------------------------------------
     Color picker popover
  --------------------------------------------------------------- */
  function renderPopGrid() {
    const grid = $('#scPopGrid');
    const activeSc = popCtx ? scales.find((s) => s.id === popCtx.scaleId) : null;
    const activeHex = activeSc ? (popCtx.endpoint === 'A' ? activeSc.colorA : activeSc.colorB) : null;
    grid.innerHTML = globals.map((h) => `<div class="sc-pop-swatch${h === activeHex ? ' sc-selected' : ''}" style="background:${h}" title="${h}" data-hex="${h}"></div>`).join('');
  }

  function openPop(scaleId, endpoint, triggerEl) {
    const pop = $('#scColorPop');
    if (pop.classList.contains('sc-is-open') && popCtx && popCtx.scaleId === scaleId && popCtx.endpoint === endpoint) {
      closePop();
      return;
    }
    popCtx = { scaleId, endpoint };
    renderPopGrid();
    const rect = triggerEl.getBoundingClientRect();
    const popW = 196, popH = 210;
    let left = rect.left, top = rect.bottom + 6;
    if (left + popW > window.innerWidth - 8) left = window.innerWidth - popW - 8;
    if (left < 8) left = 8;
    if (top + popH > window.innerHeight - 8) top = rect.top - popH - 6;
    if (top < 8) top = 8;
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
    pop.classList.add('sc-is-open');
  }

  function closePop() {
    $('#scColorPop').classList.remove('sc-is-open');
    popCtx = null;
  }

  function pickColor(hex) {
    if (!popCtx) return;
    setScaleColor(popCtx.scaleId, popCtx.endpoint, hex);
    closePop();
  }

  /* ---------------------------------------------------------------
     Copy hex
  --------------------------------------------------------------- */
  function copyHex(hex, el) {
    navigator.clipboard.writeText(hex).catch(() => {});
    if (el) {
      el.classList.add('sc-flash');
      setTimeout(() => el.classList.remove('sc-flash'), 900);
    }
    toast(`Copied ${hex}`);
  }

  /* ---------------------------------------------------------------
     About overlay
  --------------------------------------------------------------- */
  function openAbout() { $('#scAboutOverlay').classList.add('sc-is-open'); document.body.style.overflow = 'hidden'; }
  function closeAbout() { $('#scAboutOverlay').classList.remove('sc-is-open'); document.body.style.overflow = ''; }

  function sendFeedback() {
    const textEl = $('#scFeedbackText');
    const text = textEl.value.trim();
    if (!text) { textEl.focus(); return; }
    const subject = encodeURIComponent('Color Scales — Feedback');
    const body = encodeURIComponent(text);
    window.open(`mailto:karoldmunoz@gmail.com?subject=${subject}&body=${body}`, '_self');
    const status = $('#scFeedbackStatus');
    status.textContent = 'Got it — email client opened';
    status.classList.add('sc-sent');
    setTimeout(() => { status.textContent = ''; status.classList.remove('sc-sent'); }, 4000);
  }

  /* ---------------------------------------------------------------
     Image color extraction
  --------------------------------------------------------------- */
  function extractColors(file) {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const cv = $('#scImgCanvas');
        const ctx = cv.getContext('2d');
        const MAX = 160;
        const s = Math.min(MAX / img.width, MAX / img.height, 1);
        cv.width = Math.round(img.width * s);
        cv.height = Math.round(img.height * s);
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
        const map = {};
        for (let i = 0; i < d.length; i += 12) {
          const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
          if (a < 128 || (r > 238 && g > 238 && b > 238) || (r < 18 && g < 18 && b < 18)) continue;
          const k = `${Math.round(r / 18) * 18},${Math.round(g / 18) * 18},${Math.round(b / 18) * 18}`;
          map[k] = (map[k] || 0) + 1;
        }
        const out = [];
        for (const [k] of Object.entries(map).sort((a, b) => b[1] - a[1])) {
          const [r, g, b] = k.split(',').map(Number);
          const hex = rgbToHex(r, g, b);
          if (!out.some((e) => { const [er, eg, eb] = hexToRgb(e); return Math.sqrt((r - er) ** 2 + (g - eg) ** 2 + (b - eb) ** 2) < 45; })) {
            out.push(hex);
            if (out.length >= 12) break;
          }
        }
        resolve(out);
      };
      img.onerror = () => resolve([]);
      img.src = url;
    });
  }

  /* ---------------------------------------------------------------
     Init
  --------------------------------------------------------------- */
  function initGlobals() {
    const count = randInt(3, 8);
    globals = shuffleArr(BRAND).slice(0, count);
    renderPalette();
  }

  function loadExamples() {
    scales = [];
    const pool = globals.length >= 2 ? globals : BRAND;
    const scaleCount = randInt(3, 6);
    for (let i = 0; i < scaleCount; i++) {
      const a = pickRandom(pool, null), b = pickRandom(pool, a);
      scales.push(createScale(a, b));
    }
    globalSteps = pickRandomSteps();
    $$('#scGlobalStepOpts .sc-step-opt').forEach((btn) => {
      btn.classList.toggle('sc-active', Number(btn.dataset.n) === globalSteps);
    });
    renderScalesList();
  }

  function shuffleScales() {
    const pool = globals.length >= 2 ? globals : BRAND;
    scales.forEach((sc) => {
      sc.colorA = pickRandom(pool, null);
      sc.colorB = pickRandom(pool, sc.colorA);
      if (!stepsLocked) sc.steps = pickRandomSteps();
    });
    renderScalesList();
  }

  /* ---------------------------------------------------------------
     Wiring
  --------------------------------------------------------------- */
  function init() {
    initGlobals();
    loadExamples();

    // Add color via input — supports multiple, space/comma separated
    const input = $('#scColorAddInput');
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const parts = input.value.split(/[\s,;]+/).filter(Boolean);
      let added = 0;
      parts.forEach((p) => { const h = parseColor(p); if (h) { addGlobal(h); added++; } });
      if (added) { input.value = ''; input.classList.remove('sc-err'); }
      else { input.classList.add('sc-err'); setTimeout(() => input.classList.remove('sc-err'), 900); }
    });

    // Palette: click to copy, hover-X to remove
    $('#scPaletteGrid').addEventListener('click', (e) => {
      const xBtn = e.target.closest('.sc-x-btn');
      const sw = e.target.closest('.sc-pal-swatch');
      if (xBtn && sw) { e.stopPropagation(); removeGlobal(sw.dataset.hex); return; }
      if (sw) copyHex(sw.dataset.hex, sw);
    });

    // Scale cards: delegate clicks (dots, swatches, step pills, remove)
    $('#scScalesList').addEventListener('click', (e) => {
      const dot = e.target.closest('.sc-color-dot');
      if (dot) { openPop(Number(dot.dataset.id), dot.dataset.endpoint, dot); return; }

      const swatch = e.target.closest('.sc-swatch');
      if (swatch) { copyHex(swatch.dataset.hex, swatch); return; }

      const removeBtn = e.target.closest('.sc-remove-card-btn');
      if (removeBtn) { removeScale(Number(removeBtn.dataset.id)); return; }

      const stepBtn = e.target.closest('.sc-step-opts[data-id] .sc-step-opt');
      if (stepBtn) { setCardSteps(Number(stepBtn.closest('.sc-step-opts').dataset.id), Number(stepBtn.dataset.n)); return; }
    });

    // Popover
    $('#scColorPop').addEventListener('click', (e) => e.stopPropagation());
    $('#scPopSpecials').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-hex]');
      if (btn) { e.stopPropagation(); pickColor(btn.dataset.hex); }
    });
    $('#scPopGrid').addEventListener('click', (e) => {
      const sw = e.target.closest('.sc-pop-swatch');
      if (sw) pickColor(sw.dataset.hex);
    });
    document.addEventListener('click', (e) => {
      const pop = $('#scColorPop');
      if (pop.classList.contains('sc-is-open') && !pop.contains(e.target) && !e.target.closest('.sc-color-dot')) closePop();
    });

    // Global step pills + lock
    $$('#scGlobalStepOpts .sc-step-opt').forEach((btn) => {
      btn.addEventListener('click', () => setGlobalSteps(Number(btn.dataset.n)));
    });
    $('#scLockBtn').addEventListener('click', toggleLock);

    // Shuffle (spins the icon, re-rolls every scale's colors) + New scale
    $('#scShuffleBtn').addEventListener('click', () => {
      const icon = $('.sc-shuffle-icon');
      icon.classList.add('sc-spinning');
      icon.addEventListener('animationend', () => icon.classList.remove('sc-spinning'), { once: true });
      shuffleScales();
    });
    $('#scAddScaleBtn').addEventListener('click', () => addScale());

    // Exports
    $('#scExportSvg').addEventListener('click', exportAllSvg);
    $('#scExportCss').addEventListener('click', exportAllCss);
    $('#scExportFigma').addEventListener('click', exportAllFigma);
    $('#scExportPrompt').addEventListener('click', exportAllPrompt);
    $('#scExportPng').addEventListener('click', exportAllPng);

    // About overlay
    $('#scAboutBtn').addEventListener('click', openAbout);
    $('#scAboutClose').addEventListener('click', closeAbout);
    $('#scAboutBackdrop').addEventListener('click', closeAbout);
    $('#scSendFeedback').addEventListener('click', sendFeedback);
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if ($('#scAboutOverlay').classList.contains('sc-is-open')) { closeAbout(); e.preventDefault(); }
      else closePop();
    });

    // Image upload — click and drag/drop
    const uploadBar = $('#scUploadBar');
    const imageInput = $('#scImageInput');
    const uploadLabel = $('#scUploadBarText');
    function resetLabel() { uploadLabel.textContent = 'Or drop an image to extract colors'; uploadLabel.classList.remove('sc-err-msg'); }

    async function handleFile(file) {
      if (!file) return;
      if (!ALLOWED_TYPES.includes(file.type)) {
        uploadLabel.textContent = 'Try a PNG, JPG, or SVG instead';
        uploadLabel.classList.add('sc-err-msg');
        setTimeout(resetLabel, 4000);
        return;
      }
      uploadLabel.textContent = 'Extracting…';
      uploadLabel.classList.remove('sc-err-msg');
      const colors = await extractColors(file);
      if (colors.length) {
        colors.forEach((h) => addGlobal(h));
        uploadLabel.textContent = `Added ${colors.length} color${colors.length !== 1 ? 's' : ''}`;
      } else {
        uploadLabel.textContent = 'No distinct colors found — try another image';
      }
      setTimeout(resetLabel, 2500);
    }

    imageInput.addEventListener('change', (e) => { handleFile(e.target.files[0]); e.target.value = ''; });
    ['dragenter', 'dragover'].forEach((evt) => uploadBar.addEventListener(evt, (e) => { e.preventDefault(); uploadBar.classList.add('sc-drag-over'); }));
    ['dragleave', 'drop'].forEach((evt) => uploadBar.addEventListener(evt, (e) => { e.preventDefault(); uploadBar.classList.remove('sc-drag-over'); }));
    uploadBar.addEventListener('drop', (e) => handleFile(e.dataTransfer.files[0]));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
