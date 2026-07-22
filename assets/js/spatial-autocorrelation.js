/* ============================================================
   Spatial Autocorrelation — /tools/spatial-autocorrelation/
   ------------------------------------------------------------
   Gaussian-random-field simulator plus the static figures
   (regimes, LISA, weaves, palettes). Everything is drawn from a
   seeded PRNG so the page renders the same on every visit; the
   colors are ColorBrewer values shared with the CSS and are
   intentionally identical in light and dark theme.
============================================================ */
(function () {
  'use strict';

  // ── Seeded PRNG (mulberry32) for reproducibility ──────────────────
  function mulberry32(seed) {
    let t = seed >>> 0;
    return function () {
      t = (t + 0x6D2B79F5) >>> 0;
      let r = t;
      r = Math.imul(r ^ (r >>> 15), r | 1);
      r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gaussian(rng) {
    // Box-Muller
    const u = Math.max(rng(), 1e-12);
    const v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  // ── RdBu diverging palette (ColorBrewer-derived) ──────────────────
  const RdBu11 = [
    [103, 0, 31], [178, 24, 43], [214, 96, 77], [244, 165, 130], [253, 219, 199],
    [247, 247, 247],
    [209, 229, 240], [146, 197, 222], [67, 147, 195], [33, 102, 172], [5, 48, 97]
  ];
  function rdbu(t) {
    // t in [0,1]; flipped so t=1 is high (red) — high values read warm.
    t = 1 - t;
    const idx = t * (RdBu11.length - 1);
    const i = Math.floor(idx);
    const f = idx - i;
    const a = RdBu11[i], b = RdBu11[Math.min(i + 1, RdBu11.length - 1)];
    return [
      Math.round(a[0] + (b[0] - a[0]) * f),
      Math.round(a[1] + (b[1] - a[1]) * f),
      Math.round(a[2] + (b[2] - a[2]) * f),
    ];
  }

  // ── Field generation: Gaussian random field via box-blur ──────────
  function generateField(n, rho, seed) {
    const rng = mulberry32(seed);
    let f = new Float32Array(n * n);
    for (let i = 0; i < n * n; i++) f[i] = gaussian(rng);

    if (rho > 0) {
      // Smooth toward neighbors — clustering
      const passes = Math.max(1, Math.round(rho * 12));
      for (let p = 0; p < passes; p++) f = boxBlur(f, n);
      normalize(f);
    } else if (rho < 0) {
      // Anti-smooth: subtract local mean to create dispersion / weave
      const strength = -rho;
      const blurred = boxBlur(f.slice(), n);
      for (let i = 0; i < f.length; i++) {
        f[i] = f[i] - strength * blurred[i] * 0.9;
      }
      // Push toward checkerboard at extreme negative
      if (strength > 0.7) {
        const k = (strength - 0.7) / 0.3;
        for (let y = 0; y < n; y++) {
          for (let x = 0; x < n; x++) {
            const checker = ((x + y) % 2 === 0) ? 1 : -1;
            f[y * n + x] = f[y * n + x] * (1 - k) + checker * k * 2;
          }
        }
      }
      normalize(f);
    } else {
      normalize(f);
    }
    return f;
  }
  function boxBlur(arr, n) {
    const out = new Float32Array(n * n);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        let s = 0, c = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const xi = x + dx, yi = y + dy;
            if (xi >= 0 && xi < n && yi >= 0 && yi < n) {
              s += arr[yi * n + xi]; c++;
            }
          }
        }
        out[y * n + x] = s / c;
      }
    }
    return out;
  }
  function normalize(arr) {
    let min = Infinity, max = -Infinity;
    for (const v of arr) { if (v < min) min = v; if (v > max) max = v; }
    const range = max - min || 1;
    for (let i = 0; i < arr.length; i++) arr[i] = (arr[i] - min) / range;
  }

  // ── Moran's I (queen contiguity, row-standardized) ────────────────
  function moransI(field, n) {
    let mean = 0;
    for (const v of field) mean += v;
    mean /= field.length;

    let numerator = 0, denom = 0, W = 0;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const i = y * n + x;
        const xi = field[i] - mean;
        denom += xi * xi;
        let neighborSum = 0, neighborCount = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const xn = x + dx, yn = y + dy;
            if (xn >= 0 && xn < n && yn >= 0 && yn < n) {
              neighborSum += (field[yn * n + xn] - mean);
              neighborCount++;
            }
          }
        }
        if (neighborCount > 0) {
          numerator += xi * (neighborSum / neighborCount);
          W += 1;
        }
      }
    }
    return (field.length / W) * (numerator / denom);
  }

  // ── Render a field onto a canvas using RdBu ───────────────────────
  function renderField(canvas, field, n) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const cw = W / n, ch = H / n;
    ctx.clearRect(0, 0, W, H);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const v = field[y * n + x];
        const rgb = rdbu(v);
        ctx.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
        ctx.fillRect(x * cw, y * ch, cw + 1, ch + 1);
      }
    }
  }

  // ── Main simulation ───────────────────────────────────────────────
  const simCanvas = document.getElementById('simField');
  const rhoIn = document.getElementById('rho');
  const seedIn = document.getElementById('seed');
  const resIn = document.getElementById('res');
  const rhoVal = document.getElementById('rhoVal');
  const seedVal = document.getElementById('seedVal');
  const resVal = document.getElementById('resVal');
  const moranOut = document.getElementById('moranOut');
  const regimeOut = document.getElementById('regimeOut');

  function updateSim() {
    const rho = parseFloat(rhoIn.value);
    const seed = parseInt(seedIn.value, 10);
    const res = parseInt(resIn.value, 10);
    rhoVal.textContent = (rho >= 0 ? '+' : '') + rho.toFixed(2);
    seedVal.textContent = seed;
    resVal.textContent = res;

    const field = generateField(res, rho, seed);
    renderField(simCanvas, field, res);

    const I = moransI(field, res);
    moranOut.textContent = (I >= 0 ? '+' : '') + I.toFixed(3);

    let regime;
    if (I > 0.5) regime = 'strong clustering';
    else if (I > 0.15) regime = 'moderate clustering';
    else if (I > -0.15) regime = 'near random';
    else if (I > -0.5) regime = 'moderate dispersion';
    else regime = 'strong dispersion';
    regimeOut.textContent = regime;
  }
  rhoIn.addEventListener('input', updateSim);
  seedIn.addEventListener('input', updateSim);
  resIn.addEventListener('input', updateSim);
  document.getElementById('randomBtn').addEventListener('click', () => {
    seedIn.value = Math.floor(Math.random() * 999) + 1;
    updateSim();
  });
  document.getElementById('resetBtn').addEventListener('click', () => {
    rhoIn.value = 0.6; seedIn.value = 42; resIn.value = 64;
    updateSim();
  });
  updateSim();

  // ── Three-regime patterns ─────────────────────────────────────────
  (function () {
    const n = 18;
    renderField(document.getElementById('p1'), generateField(n, 0.85, 7), n);
    renderField(document.getElementById('p2'), generateField(n, 0, 13), n);
    renderField(document.getElementById('p3'), generateField(n, -0.95, 21), n);
  })();

  // ── LISA cluster map ──────────────────────────────────────────────
  (function () {
    const canvas = document.getElementById('lisaMap');
    const ctx = canvas.getContext('2d');
    const n = 20;
    const field = generateField(n, 0.7, 99);

    let mean = 0;
    for (const v of field) mean += v;
    mean /= field.length;

    function neighborMean(field, n, x, y) {
      let s = 0, c = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const xi = x + dx, yi = y + dy;
          if (xi >= 0 && xi < n && yi >= 0 && yi < n) {
            s += field[yi * n + xi]; c++;
          }
        }
      }
      return s / c;
    }

    const W = canvas.width, H = canvas.height;
    const cw = W / n, ch = H / n;
    ctx.clearRect(0, 0, W, H);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const v = field[y * n + x];
        const nm = neighborMean(field, n, x, y);
        const dv = v - mean, dn = nm - mean;
        // require both to be sufficiently far from mean
        const sig = Math.abs(dv) > 0.12 && Math.abs(dn) > 0.08;
        let color = '#eeeeee';
        if (sig) {
          if (dv > 0 && dn > 0) color = '#d7191c';       // HH
          else if (dv < 0 && dn < 0) color = '#2c7bb6';  // LL
          else if (dv > 0 && dn < 0) color = '#fdae61';  // HL
          else if (dv < 0 && dn > 0) color = '#abd9e9';  // LH
        }
        ctx.fillStyle = color;
        ctx.fillRect(x * cw, y * ch, cw + 1, ch + 1);
      }
    }
    // subtle grid
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1;
    for (let i = 0; i <= n; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cw, 0); ctx.lineTo(i * cw, H); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * ch); ctx.lineTo(W, i * ch); ctx.stroke();
    }
  })();

  // ── Three weave patterns ──────────────────────────────────────────
  function paintLisaWeave(canvas) {
    const ctx = canvas.getContext('2d');
    const n = 14;
    const W = canvas.width, H = canvas.height;
    const cw = W / n, ch = H / n;
    const rng = mulberry32(42);
    const palette = ['#d7191c', '#fdae61', '#abd9e9', '#2c7bb6', '#eeeeee'];
    // generate clustered class labels
    const labels = new Array(n * n);
    for (let i = 0; i < labels.length; i++) labels[i] = Math.floor(rng() * 5);
    // smooth a few times
    for (let p = 0; p < 4; p++) {
      const newL = labels.slice();
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          const counts = [0, 0, 0, 0, 0];
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const xi = x + dx, yi = y + dy;
              if (xi >= 0 && xi < n && yi >= 0 && yi < n) {
                counts[labels[yi * n + xi]]++;
              }
            }
          }
          let best = 0, bestC = -1;
          for (let k = 0; k < 5; k++) if (counts[k] > bestC) { bestC = counts[k]; best = k; }
          newL[y * n + x] = best;
        }
      }
      for (let i = 0; i < labels.length; i++) labels[i] = newL[i];
    }
    ctx.clearRect(0, 0, W, H);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        ctx.fillStyle = palette[labels[y * n + x]];
        ctx.fillRect(x * cw, y * ch, cw + 1, ch + 1);
      }
    }
  }

  function paintBivariate(canvas) {
    const ctx = canvas.getContext('2d');
    const n = 14;
    const W = canvas.width, H = canvas.height;
    const cw = W / n, ch = H / n;
    // 3x3 bivariate palette (Joshua Stevens style, blue-pink)
    const bv = [
      '#e8e8e8', '#ace4e4', '#5ac8c8',
      '#dfb0d6', '#a5add3', '#5698b9',
      '#be64ac', '#8c62aa', '#3b4994'
    ];
    // generate two smooth fields
    const a = generateField(n, 0.7, 11);
    const b = generateField(n, 0.7, 88);
    ctx.clearRect(0, 0, W, H);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const av = a[y * n + x], bv2 = b[y * n + x];
        const ai = av < 0.33 ? 0 : av < 0.66 ? 1 : 2;
        const bi = bv2 < 0.33 ? 0 : bv2 < 0.66 ? 1 : 2;
        ctx.fillStyle = bv[bi * 3 + ai];
        ctx.fillRect(x * cw, y * ch, cw + 1, ch + 1);
      }
    }
  }

  function paintCheckerboard(canvas) {
    const ctx = canvas.getContext('2d');
    const n = 14;
    const W = canvas.width, H = canvas.height;
    const cw = W / n, ch = H / n;
    const rng = mulberry32(7);
    ctx.clearRect(0, 0, W, H);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const checker = (x + y) % 2 === 0;
        const base = checker ? [33, 102, 172] : [178, 24, 43];
        const jitter = (rng() - 0.5) * 30;
        ctx.fillStyle = `rgb(${base[0] + jitter},${base[1] + jitter},${base[2] + jitter})`;
        ctx.fillRect(x * cw, y * ch, cw + 1, ch + 1);
      }
    }
  }

  paintLisaWeave(document.getElementById('weave1'));
  paintBivariate(document.getElementById('weave2'));
  paintCheckerboard(document.getElementById('weave3'));

  // ── Palettes ──────────────────────────────────────────────────────
  function paintPalette(el, colors) {
    el.innerHTML = '';
    colors.forEach(c => {
      const d = document.createElement('div');
      d.style.flex = '1';
      d.style.background = c;
      el.appendChild(d);
    });
  }
  paintPalette(document.getElementById('palSeq'),
    ['#ffffd9', '#edf8b1', '#c7e9b4', '#7fcdbb', '#41b6c4', '#1d91c0', '#225ea8', '#0c2c84']);
  paintPalette(document.getElementById('palDiv'),
    ['#67001f', '#b2182b', '#d6604d', '#f4a582', '#fddbc7', '#f7f7f7', '#d1e5f0', '#92c5de', '#4393c3', '#2166ac', '#053061']);
  paintPalette(document.getElementById('palQual'),
    ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#ffff33', '#a65628', '#f781bf']);

  // ── Copy buttons ──────────────────────────────────────────────────
  document.querySelectorAll('.tool-copy').forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.parentElement.innerText.replace(/^Copy\n/, '');
      navigator.clipboard.writeText(code).then(() => {
        const orig = btn.textContent;
        btn.textContent = 'Copied';
        setTimeout(() => { btn.textContent = orig; }, 1500);
      });
    });
  });
})();
