// ═══════════════════════════════════════════════════════════════
// HIERARCHICAL SCALE GENERATOR — a taxonomy in, a legend out.
// Pure functions: no map, no DOM, no state.
//
// The cartographic rules this encodes, all four inherited from the
// habitat-legend work:
//
//   1. HUE CARRIES CATEGORY. Each top-level group owns one hue.
//      Members of a group vary in lightness, never in hue — that's
//      what makes "all the grasslands" readable as one family.
//   2. ORIENTATION CARRIES CATEGORY TOO. Each group gets its own
//      pattern axis, so the map survives grayscale print and the
//      legend never depends on color alone.
//   3. INTENSITY CARRIES RANK. Within a group, pattern density
//      climbs with the member index, matching the lightness ramp.
//   4. GROUPS SEPARATE IN LIGHTNESS, NOT JUST HUE. Under deuteranopia
//      hue separation collapses; a lightness offset per group is what
//      survives it. This is the rule that makes the CVD audit pass.
// ═══════════════════════════════════════════════════════════════
import { hexToOklch, oklchToHex, maxChroma } from './oklch.js';
import { ciede2000 } from './delta-e.js';
import { simulateCVD, CVD_TYPES } from './cvd.js';
import { PTN_DENSITY_STEPS } from './pattern-svg.js';

// Below this, two fills read as the same color at map scale.
export const DELTA_E_MIN = 11;
// Within a group we *want* closeness — but not collision.
export const DELTA_E_MIN_INTRA = 6;

// One pattern axis per group, ordered so adjacent groups get maximally
// different orientations (vertical → diagonal → horizontal → counter-diagonal)
// rather than two near-identical hatches side by side.
const GROUP_PATTERN_CYCLE = ['v-hatch', 'diag', 'h-hatch', 'diag-back', 'grid', 'dots', 'waves', 'crosshatch', 'chevron', 'stipple'];

// The habitat legend's BRAND +11 +21 +26 +21 +11 model is a *curve* — small
// steps at the ends, large through the middle. That curve exists to
// compensate for HSL, where equal lightness steps are not equal perceptual
// steps. In OKLab they already are, so applying the curve on top would
// re-introduce the very unevenness it was written to cancel: it bunches the
// two lightest members until they collide.
//
// The faithful translation of "evenly distinguishable steps" into a
// perceptual space is a straight line.
function lightnessRamp(i, n) {
  return n <= 1 ? 0.5 : i / (n - 1);
}

// Hue spacing. Even division of the wheel is the obvious move and *nearly*
// right: the eye resolves less difference across the green/cyan arc than
// across red/orange, so a mild redistribution helps. The warp must stay
// monotonic — a warp that isn't will fold two groups onto the same hue,
// which silently destroys group separation everywhere downstream.
const HUE_WARP = 0.35; // < 1 keeps t + (k/2π)·sin(2πt) monotonic

function distributeHues(baseHue, groupCount) {
  const hues = [];
  for (let i = 0; i < groupCount; i++) {
    const t = i / groupCount;
    const warped = t + (HUE_WARP / (2 * Math.PI)) * Math.sin(2 * Math.PI * t);
    hues.push((baseHue + warped * 360 + 360) % 360);
  }
  return hues;
}

/**
 * Generate a full legend from a brand color and a taxonomy.
 *
 * @param {string} brandHex        anchor color — group 0 is built on its hue
 * @param {Array}  taxonomy        [{ name, children: [string] }]
 * @param {object} opts
 * @param {boolean} opts.patterns  auto-assign pattern families (default true)
 * @returns {{groups: Array, flat: Array}}
 */
export function generateLegend(brandHex, taxonomy, opts = {}) {
  const usePatterns = opts.patterns !== false;
  const [baseL, baseC, baseH] = hexToOklch(brandHex);
  const hues = distributeHues(baseH, Math.max(1, taxonomy.length));

  const groups = taxonomy.map((group, gi) => {
    const hue = hues[gi];
    const members = group.children?.length ? group.children : [group.name];
    const n = members.length;

    // Rule 4: stagger each group's lightness band so groups stay apart once
    // hue is stripped away by a CVD simulation. The offsets follow the golden
    // ratio rather than a short cycle — consecutive groups (which are also
    // hue-adjacent, and so the most confusable) land far apart in lightness,
    // and the sequence never repeats however many groups there are.
    const GOLDEN = 0.6180339887498949;
    const groupOffset = (((gi * GOLDEN) % 1) - 0.5) * 2 * 0.11;

    const patternStyle = usePatterns
      ? GROUP_PATTERN_CYCLE[gi % GROUP_PATTERN_CYCLE.length]
      : null;

    const swatches = members.map((name, mi) => {
      const t = lightnessRamp(mi, n);
      // Each member needs ~0.06 of L to clear the intra-group threshold,
      // so the band grows with membership rather than being fixed — a
      // 2-member group shouldn't span the same range as a 6-member one.
      const band = clamp(0.09 * (n - 1), 0.10, 0.52);
      const L = clamp(0.88 - t * band + groupOffset, 0.16, 0.94);

      // Chroma tracks the brand's saturation but never exceeds what sRGB
      // holds at this L — otherwise light steps silently flatten to grey.
      const ceiling = maxChroma(L, hue);
      const C = Math.min(baseC * (0.78 + 0.34 * (1 - Math.abs(t - 0.5) * 2)), ceiling * 0.92);

      // Rule 3: density climbs with rank, mapped across the usable middle
      // of the ramp — the extremes are either invisible or solid mud.
      const densityStep = usePatterns
        ? Math.round(2 + (mi / Math.max(1, n - 1)) * (PTN_DENSITY_STEPS - 5))
        : null;

      return {
        id: `${gi}-${mi}`,
        name,
        group: group.name,
        groupIndex: gi,
        hex: oklchToHex(L, C, hue),
        oklch: [L, C, hue],
        pattern: usePatterns ? {
          style: patternStyle,
          densityStep,
          strokeWidth: 1.4,
          angle: 0,
          ink: 'auto',
        } : null,
      };
    });

    return { name: group.name, index: gi, hue, patternStyle, swatches };
  });

  return { groups, flat: groups.flatMap(g => g.swatches) };
}

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

/**
 * Audit a legend for accessibility. This is what the North Star metric
 * ("passes a colorblind check without manual rework") actually measures.
 *
 * @returns {{pass, deltaE, cvd: Array, cohesion, warnings: Array}}
 */
export function auditLegend(legend) {
  const flat = legend.flat;
  const hexes = flat.map(s => s.hex);
  const warnings = [];

  // Two different jobs, so two different thresholds. Colors in different
  // groups must be *clearly* different (DELTA_E_MIN) or the map misreads.
  // Colors inside one group must be only *just* different
  // (DELTA_E_MIN_INTRA) — pushing them further apart is what destroys the
  // family resemblance that makes a hierarchical legend scannable.
  const scan = (list) => {
    let inter = { min: Infinity, pair: null }, intra = { min: Infinity, pair: null };
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const d = ciede2000(list[i], list[j]);
        const same = flat[i].groupIndex === flat[j].groupIndex;
        const slot = same ? intra : inter;
        if (d < slot.min) { slot.min = d; slot.pair = [flat[i], flat[j]]; }
      }
    }
    return { inter, intra };
  };

  // ── normal vision ──
  const normal = scan(hexes);

  // ── each deficiency ──
  const cvd = CVD_TYPES.map(type => {
    const sim = hexes.map(h => simulateCVD(h, type.id));
    const { inter, intra } = scan(sim);
    return {
      type: type.id,
      label: type.label,
      hint: type.hint,
      min: inter.min,
      intraMin: intra.min,
      pass: inter.min >= DELTA_E_MIN,
      // Name the offending pair — "your scale fails" is useless alone.
      collision: inter.min < DELTA_E_MIN ? inter.pair : null,
    };
  });

  // ── group cohesion (acceptance criterion 3) ──
  // "Colors within a group are perceptually closer to each other than to
  // colors in other groups." Tested per swatch as a nearest-neighbour
  // question — is my closest relative a sibling? Comparing a group's
  // *widest* internal gap against its *closest* external one instead would
  // fail every large group by construction: six members necessarily span a
  // wide lightness range, and that span says nothing about whether the
  // group reads as a family.
  let cohesion = true;
  const strays = [];
  legend.groups.forEach(g => {
    if (g.swatches.length < 2) return;
    g.swatches.forEach(s => {
      const nearestSibling = Math.min(...g.swatches.filter(o => o !== s).map(o => ciede2000(s.hex, o.hex)));
      const nearestOutsider = Math.min(...flat.filter(o => o.groupIndex !== g.index).map(o => ciede2000(s.hex, o.hex)));
      if (nearestSibling > nearestOutsider) { cohesion = false; strays.push(`"${s.name}"`); }
    });
  });
  if (strays.length) {
    warnings.push(`${strays.slice(0, 3).join(', ')}${strays.length > 3 ? ` and ${strays.length - 3} more` : ''} sit closer to another group than to their own family.`);
  }

  const patternsOn = flat.some(s => s.pattern);

  // A dichromat sees roughly one chromatic axis plus lightness, so the whole
  // legend has to fit inside about 100 ΔE of range. Past ~9 categories no
  // arrangement of colors can hold DELTA_E_MIN between all of them — this is
  // a property of human vision, not of the generator. Saying so once is
  // useful; emitting a collision warning per pair is noise that implies a
  // fix exists.
  const colorOnlyCapacity = Math.floor(100 / DELTA_E_MIN);
  const overCapacity = flat.length > colorOnlyCapacity;

  const cvdFailing = cvd.filter(c => !c.pass);

  if (!cvdFailing.length) {
    // Nothing to say — the measured result is the answer, and a capacity
    // caveat here would contradict it.
  } else if (overCapacity) {
    warnings.push(
      `${flat.length} categories is past what color alone can carry — colorblind viewers can reliably separate about ${colorOnlyCapacity}. ` +
      (patternsOn
        ? 'Patterns are doing that work here, which is why the legend still passes. Keep them on.'
        : 'Turn patterns on: with color-only mode these categories are not distinguishable.')
    );
  } else {
    cvdFailing.filter(c => c.collision).forEach(c => {
      const [a, b] = c.collision;
      warnings.push(
        `Under ${c.label}, "${a.name}" and "${b.name}" collapse into the same color (ΔE ${c.min.toFixed(1)}, need ${DELTA_E_MIN}).` +
        (patternsOn ? ' Their patterns still separate them, but the color pass alone fails.' : ' Turn patterns on to separate them.')
      );
    });
  }

  if (normal.intra.min < DELTA_E_MIN_INTRA && normal.intra.pair) {
    const [a, b] = normal.intra.pair;
    warnings.push(`"${a.name}" and "${b.name}" are too close to tell apart even in full color (ΔE ${normal.intra.min.toFixed(1)}, need ${DELTA_E_MIN_INTRA}). That group has more members than its lightness range can hold.`);
  }

  const normalPass = normal.inter.min >= DELTA_E_MIN && normal.intra.min >= DELTA_E_MIN_INTRA;

  return {
    deltaE: normal.inter.min,
    intraDeltaE: normal.intra.min,
    normalPass,
    cvd,
    cohesion,
    colorOnlyCapacity,
    // Patterns rescue a failing color pass — that's the entire reason
    // orientation encodes category. Color-only mode has no such fallback.
    pass: normalPass && (patternsOn || cvd.every(c => c.pass)),
    colorOnlyPass: normalPass && cvd.every(c => c.pass),
    warnings,
  };
}

// ── DTCG export (PRD §5.1: "DTCG-style design tokens for the palette") ──
export function legendToTokens(legend, name = 'meridian') {
  const groups = {};
  legend.groups.forEach(g => {
    const key = slug(g.name);
    groups[key] = {};
    g.swatches.forEach((s, i) => {
      groups[key][slug(s.name) || String(i)] = {
        $type: 'color',
        $value: s.hex,
        $description: s.pattern
          ? `${s.name} — ${g.name}. Pattern: ${s.pattern.style} @ density ${s.pattern.densityStep}.`
          : `${s.name} — ${g.name}.`,
      };
    });
  });
  return { [slug(name)]: groups };
}

function slug(s) {
  return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
