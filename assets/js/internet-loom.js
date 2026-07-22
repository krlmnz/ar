/* ============================================================
   Internet Loom — /tools/internet-loom/
   A weaving-draft grid: click cells to raise a thread over the
   ground, click the round heddle dots on the selvedges to lift
   a whole warp column or weft row, or start from a classic
   weave structure. Ported from the standalone "Loom 25" app
   (canvas.js + events.js + patterns.js + utils.js) and rebuilt
   on the site's tokens. The original double-bound every canvas
   handler across two files and kept undo history across grid
   resizes; this port is a single module and resets history
   whenever the grid dimensions change.
============================================================ */
(function () {
  'use strict';

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  const root = $('.loom-tool');
  if (!root) return;

  /* ---------------------------------------------------------------
     Threads. Hues are the Andean brand set from map-tokens.css —
     hardcoded here because that stylesheet doesn't load on this
     page, and a thread color is data, not chrome (it must not
     flip with the theme).
  --------------------------------------------------------------- */
  const PALETTES = [
    {
      name: 'Andean',
      colors: ['#D7561D', '#1A97A9', '#A87B12', '#2B498D', '#34935C',
               '#D556AA', '#747A4C', '#8E558D', '#CD351D', '#5C508D'],
    },
    {
      name: 'Undyed wool',
      colors: ['#F5EFE3', '#E0D5C0', '#C0AA88', '#8F7355', '#6B5138',
               '#4A3826', '#8C8880', '#55524C', '#2B2926', '#171614'],
    },
  ];

  /* ---------------------------------------------------------------
     Weave structures — same functions as the original patterns.js,
     with the three "Untitled" drafts given their real names.
     1 = warp up (selected thread), 0 = ground.
  --------------------------------------------------------------- */
  const WEAVES = [
    { key: 'plain', name: 'Plain', fn: (n) => build(n, (i, j) => (i + j) % 2 === 0) },
    { key: 'basket', name: 'Basket', fn: (n) => build(n, (i, j) => (((i / 2) | 0) + ((j / 2) | 0)) % 2 === 0) },
    { key: 'twill', name: 'Twill', fn: (n) => build(n, (i, j) => (i + j) % n < n / 2) },
    { key: 'satin', name: 'Satin', fn: (n) => build(n, (i, j) => (i * 2 + j * 3) % n < n / 2) },
    { key: 'honeycomb', name: 'Honeycomb', fn: (n) => build(n, (i, j) => (i ^ j) % n < n / 2) },
    { key: 'huckaback', name: 'Huckaback', fn: (n) => build(n, (i, j) => !!((i % 2) ^ (j % 2))) },
    { key: 'mock-leno', name: 'Mock leno', fn: (n) => build(n, (i, j) => !!((((i / 2) | 0) % 2 === 0) ^ (((j / 2) | 0) % 2 === 0)) ) },
  ];

  function build(n, test) {
    return Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => (test(i, j) ? 1 : 0)));
  }

  /* ---------------------------------------------------------------
     State. Empty cells are null (the ground), so the ground can
     follow the theme; the original stored the literal string
     'white', which is why it had no dark mode.
  --------------------------------------------------------------- */
  const GRID_SIZES = [8, 12, 16, 20];
  const HISTORY_CAP = 100;
  const CANVAS_MAX = 512;

  let gridSize = 16;
  let grid = emptyGrid(gridSize);
  let selectedColor = PALETTES[0].colors[0];
  let history = [];
  let historyIndex = -1;
  let cellSize = 0; // CSS px

  const canvas = $('#lmCanvas');
  const ctx = canvas.getContext('2d');
  const stage = $('#lmStage');

  function emptyGrid(n) {
    return Array.from({ length: n }, () => Array(n).fill(null));
  }

  const cssVar = (name) => getComputedStyle(root).getPropertyValue(name).trim();

  /* ---------------------------------------------------------------
     Rendering — DPR-aware so the grid stays crisp on retina.
  --------------------------------------------------------------- */
  function resizeCanvas() {
    // The plate's own padding is the room the heddle dots hang in,
    // so measure the content box rather than guessing an inset.
    const plate = stage.parentElement;
    const pad = getComputedStyle(plate);
    const avail = plate.clientWidth -
      parseFloat(pad.paddingLeft) - parseFloat(pad.paddingRight);
    const size = Math.max(200, Math.min(avail, CANVAS_MAX));
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cellSize = size / gridSize;
    buildHeddles(size);
    drawGrid();
  }

  function drawGrid() {
    const size = canvas.width / (window.devicePixelRatio || 1);
    const ground = cssVar('--surface');
    const line = cssVar('--border');
    ctx.clearRect(0, 0, size, size);
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        ctx.fillStyle = grid[row][col] || ground;
        ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
      }
    }
    ctx.strokeStyle = line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = 1; k < gridSize; k++) {
      ctx.moveTo(k * cellSize, 0);
      ctx.lineTo(k * cellSize, size);
      ctx.moveTo(0, k * cellSize);
      ctx.lineTo(size, k * cellSize);
    }
    ctx.stroke();
  }

  /* ---------------------------------------------------------------
     Heddle dots — a button per thread on all four selvedges.
     Clicking one lifts (fills) its whole warp column or weft row;
     clicking again when the line is already that color lowers it.
  --------------------------------------------------------------- */
  function buildHeddles(size) {
    $$('.lm-heddle', stage).forEach((el) => el.remove());
    const DOT = 14;
    const GAP = 8;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < gridSize; i++) {
      const center = i * cellSize + cellSize / 2 - DOT / 2 + 2; // +2 = canvas border
      const spots = [
        { left: center, top: -DOT - GAP, label: 'warp column ' + (i + 1), line: 'col' },
        { left: center, top: size + 4 + GAP, label: 'warp column ' + (i + 1), line: 'col' },
        { top: center, left: -DOT - GAP, label: 'weft row ' + (i + 1), line: 'row' },
        { top: center, left: size + 4 + GAP, label: 'weft row ' + (i + 1), line: 'row' },
      ];
      spots.forEach((s) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'lm-heddle';
        b.style.left = s.left + 'px';
        b.style.top = s.top + 'px';
        b.setAttribute('aria-label', 'Weave ' + s.label);
        b.addEventListener('click', () => fillLine(s.line, i));
        frag.appendChild(b);
      });
    }
    stage.appendChild(frag);
  }

  function fillLine(axis, index) {
    const cells = [];
    for (let k = 0; k < gridSize; k++) {
      cells.push(axis === 'row' ? [index, k] : [k, index]);
    }
    const allSet = cells.every(([r, c]) => grid[r][c] === selectedColor);
    cells.forEach(([r, c]) => { grid[r][c] = allSet ? null : selectedColor; });
    drawGrid();
    saveHistory();
    announce((allSet ? 'Lowered ' : 'Lifted ') + (axis === 'row' ? 'weft row ' : 'warp column ') + (index + 1));
  }

  /* ---------------------------------------------------------------
     Cell painting — pointer-based so a drag weaves a run of
     cells in one stroke (one history entry per stroke). Starting
     on a cell that already holds the selected thread turns the
     stroke into an eraser, so re-clicking unweaves.
  --------------------------------------------------------------- */
  let stroke = null; // { erase, changed }

  function cellAt(event) {
    const rect = canvas.getBoundingClientRect();
    const col = Math.floor((event.clientX - rect.left) / cellSize);
    const row = Math.floor((event.clientY - rect.top) / cellSize);
    if (row < 0 || col < 0 || row >= gridSize || col >= gridSize) return null;
    return [row, col];
  }

  canvas.addEventListener('pointerdown', (e) => {
    const cell = cellAt(e);
    if (!cell) return;
    canvas.setPointerCapture(e.pointerId);
    stroke = { erase: grid[cell[0]][cell[1]] === selectedColor, changed: false };
    paintCell(cell);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!stroke) return;
    const cell = cellAt(e);
    if (cell) paintCell(cell);
  });
  ['pointerup', 'pointercancel'].forEach((type) =>
    canvas.addEventListener(type, () => {
      if (stroke && stroke.changed) saveHistory();
      stroke = null;
    }));

  function paintCell([row, col]) {
    const next = stroke.erase ? null : selectedColor;
    if (grid[row][col] === next) return;
    grid[row][col] = next;
    stroke.changed = true;
    drawGrid();
  }

  /* ---------------------------------------------------------------
     History. Reset on grid-size change — the original kept it,
     so undo after a resize restored a wrong-sized grid.
  --------------------------------------------------------------- */
  const undoBtn = $('#lmUndo');
  const redoBtn = $('#lmRedo');

  function snapshot() { return grid.map((row) => row.slice()); }

  function saveHistory() {
    history = history.slice(0, historyIndex + 1);
    history.push(snapshot());
    if (history.length > HISTORY_CAP) history.shift();
    historyIndex = history.length - 1;
    syncHistoryButtons();
  }

  function restore(index) {
    historyIndex = index;
    grid = history[index].map((row) => row.slice());
    drawGrid();
    syncHistoryButtons();
  }

  function syncHistoryButtons() {
    undoBtn.disabled = historyIndex <= 0;
    redoBtn.disabled = historyIndex >= history.length - 1;
  }

  undoBtn.addEventListener('click', () => { if (historyIndex > 0) restore(historyIndex - 1); });
  redoBtn.addEventListener('click', () => { if (historyIndex < history.length - 1) restore(historyIndex + 1); });

  $('#lmClear').addEventListener('click', () => {
    grid = emptyGrid(gridSize);
    drawGrid();
    saveHistory();
    announce('Cleared the loom');
  });

  /* ---------------------------------------------------------------
     Grid size
  --------------------------------------------------------------- */
  const sizeSeg = $('#lmSizeSeg');
  GRID_SIZES.forEach((n) => {
    const b = document.createElement('button');
    b.type = 'button';
    // The site's .btn; selected is .btn--filled, an inversion, not a hue.
    b.className = 'btn' + (n === gridSize ? ' btn--filled' : '');
    b.textContent = n + '×' + n;
    b.addEventListener('click', () => {
      if (n === gridSize) return;
      gridSize = n;
      grid = emptyGrid(n);
      history = [];
      historyIndex = -1;
      $$('.btn', sizeSeg).forEach((el) => el.classList.toggle('btn--filled', el === b));
      resizeCanvas();
      saveHistory();
      announce('New ' + n + ' by ' + n + ' loom');
    });
    sizeSeg.appendChild(b);
  });

  /* ---------------------------------------------------------------
     Weave structure buttons, with previews generated from the
     same functions that apply them — the original shipped static
     thumbnails, three of which pointed at the wrong file.
  --------------------------------------------------------------- */
  const weaveList = $('#lmWeaves');
  WEAVES.forEach((w) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'lm-weave-btn';
    b.innerHTML = '<span class="lm-weave-preview" aria-hidden="true">' + previewSVG(w.fn) + '</span>' + w.name;
    b.addEventListener('click', () => {
      const pattern = w.fn(gridSize);
      grid = pattern.map((row) => row.map((v) => (v ? selectedColor : null)));
      $$('.lm-weave-btn', weaveList).forEach((el) => el.classList.toggle('lm-active', el === b));
      drawGrid();
      saveHistory();
      announce(w.name + ' weave applied');
    });
    weaveList.appendChild(b);
  });

  function previewSVG(fn) {
    const n = 8;
    let rects = '';
    fn(n).forEach((row, i) => row.forEach((v, j) => {
      if (v) rects += '<rect x="' + j + '" y="' + i + '" width="1" height="1"/>';
    }));
    return '<svg viewBox="0 0 8 8" fill="currentColor" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">' + rects + '</svg>';
  }

  /* ---------------------------------------------------------------
     Thread swatches + custom picker
  --------------------------------------------------------------- */
  const paletteHost = $('#lmPalettes');
  const picker = $('#lmPicker');

  PALETTES.forEach((pal) => {
    const wrap = document.createElement('div');
    wrap.className = 'lm-palette';
    const label = document.createElement('div');
    label.className = 'tool-swatch-name lm-palette-name';
    label.textContent = pal.name;
    const gridEl = document.createElement('div');
    gridEl.className = 'lm-swatch-grid';
    pal.colors.forEach((hex) => {
      const s = document.createElement('button');
      s.type = 'button';
      s.className = 'lm-swatch';
      s.style.background = hex;
      s.dataset.hex = hex;
      s.setAttribute('aria-label', 'Thread color ' + hex);
      s.addEventListener('click', () => selectColor(hex, s));
      gridEl.appendChild(s);
    });
    wrap.appendChild(label);
    wrap.appendChild(gridEl);
    paletteHost.appendChild(wrap);
  });

  function selectColor(hex, swatchEl) {
    selectedColor = hex;
    picker.value = hex;
    $$('.lm-swatch', paletteHost).forEach((el) => el.classList.toggle('lm-active', el === swatchEl));
  }

  picker.addEventListener('input', () => {
    selectedColor = picker.value;
    $$('.lm-swatch', paletteHost).forEach((el) => el.classList.remove('lm-active'));
  });

  /* ---------------------------------------------------------------
     Export. Ground cells resolve to the current theme's surface
     color at export time so the file matches what's on screen.
  --------------------------------------------------------------- */
  const EXPORT_CELL = 32;

  $('#lmExportSvg').addEventListener('click', () => {
    const size = gridSize * EXPORT_CELL;
    const ground = cssVar('--surface');
    let out = '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size +
      '" viewBox="0 0 ' + size + ' ' + size + '"><rect width="' + size + '" height="' + size + '" fill="' + ground + '"/>';
    grid.forEach((row, i) => row.forEach((color, j) => {
      if (color) out += '<rect x="' + (j * EXPORT_CELL) + '" y="' + (i * EXPORT_CELL) +
        '" width="' + EXPORT_CELL + '" height="' + EXPORT_CELL + '" fill="' + color + '"/>';
    }));
    out += '</svg>';
    download(new Blob([out], { type: 'image/svg+xml;charset=utf-8' }), 'internet-loom.svg');
  });

  $('#lmExportPng').addEventListener('click', () => {
    const size = gridSize * EXPORT_CELL;
    const off = document.createElement('canvas');
    off.width = size;
    off.height = size;
    const octx = off.getContext('2d');
    octx.fillStyle = cssVar('--surface');
    octx.fillRect(0, 0, size, size);
    grid.forEach((row, i) => row.forEach((color, j) => {
      if (color) {
        octx.fillStyle = color;
        octx.fillRect(j * EXPORT_CELL, i * EXPORT_CELL, EXPORT_CELL, EXPORT_CELL);
      }
    }));
    off.toBlob((blob) => download(blob, 'internet-loom.png'), 'image/png');
  });

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  /* ---------------------------------------------------------------
     Wiring
  --------------------------------------------------------------- */
  const status = $('#lmStatus');
  function announce(text) { status.textContent = text; }

  // The ground and grid lines are theme tokens — repaint when the
  // site's theme toggle flips data-theme on <html>.
  new MutationObserver(drawGrid)
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeCanvas, 100);
  });

  selectColor(selectedColor, $('.lm-swatch', paletteHost));
  resizeCanvas();
  saveHistory();
})();
