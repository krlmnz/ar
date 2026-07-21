#!/usr/bin/env node
/* ============================================================
   BUILD COLOUR TOKENS — Andean Road
   ------------------------------------------------------------
   Solves the site's existing colour tokens against the surfaces
   they ACTUALLY render on, then splices them into tokens.css
   between the GENERATED:COLOUR markers.

   The token NAMES are unchanged on purpose. Components keep
   consuming --bg / --text / --text-2 / --border exactly as
   before; only the values become solved and audited. That is
   what makes this safe to land in one commit — see
   DESIGN-SYSTEM.md §10 on why renaming a shared scale is not.

     node scripts/build-tokens.js
     node scripts/build-tokens.js --check   # audit only, writes nothing

   Exits non-zero if any pairing misses its floor, and writes
   nothing in that case.
============================================================ */

const fs = require("fs");
const path = require("path");
const E = require("./color-engine.js");

const ROOT = path.join(__dirname, "..");
const CONFIG = path.join(__dirname, "tokens.config.json");
const TARGET = path.join(ROOT, "assets", "css", "tokens.css");
const AUDIT = path.join(__dirname, "tokens.audit.json");

const checkOnly = process.argv.includes("--check");
const cfg = JSON.parse(fs.readFileSync(CONFIG, "utf8"));

/* ------------------------------------------------------------
   The ramp.

   One extra rung past the stock contract: the site's dark page
   is #111416 (~19:1), darker than the stock 950 rung. Without
   it the dark theme would visibly lift, which is a design
   change nobody asked for.
------------------------------------------------------------ */
const CONTRACT = [
  ...E.RAMP_CONTRACT,
  /* Two rungs the stock contract has no room for. Between 600 (4.15:1
     worst-case here) and 700 (6.44:1) there is nothing, so the muted
     text levels would have to jump to near-ink to clear their floor —
     passing WCAG by destroying the tonal hierarchy. These sit where
     this design actually needs them. Targets are quoted on white; the
     worst real surface runs ~7% lower, which is the headroom. */
  { step: "610", onLight: 5.15, floor: 5.0 },
  { step: "650", onLight: 6.10, floor: 5.9 },
  { step: "975", onLight: 19.0 },
].sort((a, b) => a.onLight - b.onLight);

/* The ramp is solved against #FFFFFF, so its rung labels are nominal —
   "600" means 4.6:1 on white, not on this page. Rebuilding the ramp
   against its own step-50 is NOT the fix: it drags every rung darker
   and the surface drifts out from under the design. Instead the rung
   labels stay nominal and every foreground below is chosen by
   measuring against the real surfaces (see solveOn). That is what
   README §10 gotcha 1 is actually asking for. */
const ramp = E.makeNeutralRamp(cfg.neutralSource, {
  neutralTint: cfg.neutralTint,
  contract: CONTRACT,
});
const step = Object.fromEntries(ramp.steps.map((s) => [s.step, s.hex]));

/* Return the first rung that satisfies `target` against EVERY surface
   it can land on. Solving against only --bg is not enough: the same
   text also sits on --surface (cards) and on --accent-soft (row hover),
   and in dark mode those are LIGHTER than the page, so the page is the
   easy case, not the worst one. Staying on-ramp keeps the palette
   coherent — we never invent a one-off hex to patch a contrast hole. */
function solveOn(surfaceHexes, target, { fromDark }) {
  const bgs = surfaceHexes.map(E.hexToRgb);
  const order = fromDark ? [...ramp.steps].reverse() : ramp.steps;
  for (const s of order) {
    if (bgs.every((bg) => E.contrast(s.rgb, bg) >= target)) return s.hex;
  }
  return (fromDark ? ramp.steps[0] : ramp.steps[ramp.steps.length - 1]).hex;
}

const T = cfg.contrastTargets;

/* ------------------------------------------------------------
   Roles, per theme. Surfaces are declared; every foreground is
   solved against the surface it sits on.
------------------------------------------------------------ */
function build(mode) {
  const dark = mode === "dark";
  const bg = dark ? step["975"] : step["50"];
  const surface = dark ? step["900"] : "#FFFFFF";
  // --accent-soft is a hover BACKGROUND behind body text
  // (main.css:692, 876, 1589, 1929, 1944 …), so text has to stay
  // legible on it — it is audited as a surface, not as decoration.
  const accentSoft = dark ? step["900"] : step["100"];

  const fromDark = dark;
  const surfaces = [bg, surface, accentSoft];
  const order = fromDark ? [...ramp.steps].reverse() : ramp.steps;

  /* Solve weakest first, then walk outward, forcing each level to a
     distinct rung. Two "levels" resolving to the same hex would
     silently flatten the three-tier hierarchy the type system leans
     on — it passes contrast and still destroys the design. */
  const text3 = solveOn(surfaces, T.text3, { fromDark });
  const next = (from) => {
    const i = order.findIndex((s) => s.hex === from);
    /* At the end of the ramp there is no next rung. Returning `from`
       would make the nudge a silent no-op and let two levels ship
       identical, so this has to fail loudly instead. */
    if (i < 0 || i + 1 >= order.length) {
      structural.push(
        `${mode}: no rung beyond ${from} — targets are too close to the end of the ramp. ` +
        `Lower a contrastTarget or add a rung to CONTRACT.`
      );
      return from;
    }
    return order[i + 1].hex;
  };
  let text2 = solveOn(surfaces, T.text2, { fromDark });
  if (text2 === text3) text2 = next(text3);
  let text = solveOn(surfaces, T.text, { fromDark });
  if (text === text2) text = next(text2);

  /* The nudge above is pairwise, so it cannot see text↔text-3, and the
     contrast audit only ever compares a foreground to a SURFACE — never
     to another foreground. Without this, an ordered-but-close set of
     targets (e.g. 5.2 / 5.1 / 5.0) emits three levels that are
     duplicated or inverted, and every audit row still says PASS.
     The hierarchy is part of the contract, so assert it. */
  const worst = (hex) =>
    Math.min(...surfaces.map((s) => E.contrast(E.hexToRgb(hex), E.hexToRgb(s))));
  const tiers = [["text", text], ["text-2", text2], ["text-3", text3]];
  for (let i = 0; i < tiers.length - 1; i++) {
    const [an, av] = tiers[i];
    const [bn, bv] = tiers[i + 1];
    if (av === bv) {
      structural.push(`${mode}: --${an} and --${bn} both resolved to ${av}.`);
    } else if (worst(av) <= worst(bv)) {
      structural.push(
        `${mode}: --${an} (${worst(av).toFixed(2)}:1) is not stronger than ` +
        `--${bn} (${worst(bv).toFixed(2)}:1) — the tonal hierarchy is inverted.`
      );
    }
  }

  return {
    "bg": bg,
    "surface": surface,
    "text": text,
    "text-2": text2,
    "text-3": text3,
    "border": dark ? step["700"] : step["200"],
    "border-subtle": dark ? step["900"] : step["100"],
    "accent-hover": dark ? step["400"] : step["700"],
    "accent-soft": accentSoft,
  };
}

/* Structural problems the contrast audit is blind to — collapsed or
   inverted text tiers. Collected during build(), enforced below. */
const structural = [];

const light = build("light");
const darkT = build("dark");

/* ------------------------------------------------------------
   Audit — every pairing a component actually renders.
------------------------------------------------------------ */
const SURFACES = ["bg", "surface", "accent-soft"];
const FOREGROUNDS = [["text", T.text], ["text-2", T.text2], ["text-3", T.text3]];

const rows = [];
for (const [mode, tk] of [["light", light], ["dark", darkT]]) {
  for (const surf of SURFACES) {
    for (const [fg, need] of FOREGROUNDS) {
      const ratio = E.contrast(E.hexToRgb(tk[fg]), E.hexToRgb(tk[surf]));
      rows.push({
        mode, pair: `${fg} on ${surf}`, fg: tk[fg], bg: tk[surf],
        ratio: Math.round(ratio * 100) / 100,
        need, pass: ratio >= need,
      });
    }
  }
}

const fail = rows.filter((r) => !r.pass);
const line = (r) =>
  `  ${r.pass ? "PASS" : "FAIL"} ${String(r.ratio).padStart(6)}:1 ` +
  `(needs ${r.need})  ${r.mode.padEnd(5)}  ${r.pair}`;

console.log(`\nNeutral source ${cfg.neutralSource} · tint ${cfg.neutralTint}`);
rows.forEach((r) => console.log(line(r)));
console.log(`\n${rows.length} pairings checked · ${fail.length} failure${fail.length === 1 ? "" : "s"}\n`);

if (structural.length) {
  console.error("Token hierarchy is broken:");
  structural.forEach((s) => console.error("  · " + s));
  console.error("\ntokens.css not written.");
  process.exit(1);
}
if (fail.length) {
  console.error("Contrast audit FAILED. tokens.css not written.");
  process.exit(1);
}

/* ------------------------------------------------------------
   Emit + splice.
------------------------------------------------------------ */
const stamp = "Generated by scripts/build-tokens.js — edit scripts/tokens.config.json, not this block.";

/* No primitives are emitted. The solved ramp exists inside this script
   and is recorded in tokens.audit.json, but nothing in the CSS referenced
   a --gray-* rung, and shipping a palette nobody consumes is just weight.
   It was also a hazard: primitives do not flip between themes, so the two
   rules that did use one (`background: var(--gray-100)` on .map-container
   and .placeholder-img) rendered near-white in dark mode. They now use
   --accent-soft, which is the same colour in light and correct in dark. */
const lightBlock =
`  /* ${stamp} */
${Object.entries(light).map(([k, v]) => `  --${k}: ${v};`).join("\n")}`;

const darkBlock =
`  /* ${stamp} */
${Object.entries(darkT).map(([k, v]) => `  --${k}: ${v};`).join("\n")}`;

/* Read the real file in BOTH modes. --check used to audit only the
   freshly-solved values in memory and exit before ever opening
   tokens.css, which meant it passed on a file that had been hand-edited
   to 1.11:1 body text — or deleted outright. The block is stamped
   "do not edit"; this is what makes that stamp true. */
const current = fs.readFileSync(TARGET, "utf8");

const splice = (src, name, body) => {
  const start = `/* GENERATED:${name}:START */`;
  const end = `/* GENERATED:${name}:END */`;
  const nStart = src.split(start).length - 1;
  const nEnd = src.split(end).length - 1;
  if (nStart !== 1 || nEnd !== 1) {
    console.error(
      `Marker GENERATED:${name} appears ${nStart}×START / ${nEnd}×END in tokens.css ` +
      `(expected exactly one of each) — aborting rather than guessing.`
    );
    process.exit(1);
  }
  const re = new RegExp(
    `(${start.replace(/[*/]/g, "\\$&")})[\\s\\S]*?(  ${end.replace(/[*/]/g, "\\$&")})`
  );
  return src.replace(re, `$1\n${body}\n$2`);
};

let css = splice(current, "COLOUR-LIGHT", lightBlock);
css = splice(css, "COLOUR-DARK", darkBlock);

if (checkOnly) {
  if (css !== current) {
    console.error(
      "assets/css/tokens.css does not match what the config produces.\n" +
      "It has been hand-edited, or the config changed without a rebuild.\n" +
      "Run `npm run tokens` and commit the result."
    );
    process.exit(1);
  }
  console.log("Audit passed · tokens.css matches the config (nothing written).");
  process.exit(0);
}

fs.writeFileSync(TARGET, css);
fs.writeFileSync(AUDIT, JSON.stringify({ config: cfg, ramp: step, light, dark: darkT, rows, structural }, null, 2) + "\n");

/* ------------------------------------------------------------
   The spec's colour tables, generated from the same solve.

   These were hand-maintained and had drifted: 20 of 22 hexes were
   stale, one cell read "—" for a token that had a value, and a
   documented ratio (15.9:1) had never matched the CSS it described
   (17.70:1). A table nobody can forget to update is the only kind
   that stays true.
------------------------------------------------------------ */
const USAGE = {
  "bg": "Page background", "surface": "Cards, elevated surfaces",
  "text": "Primary text, headlines", "text-2": "Secondary text, descriptions",
  "text-3": "Overlines, captions, meta", "border": "Borders, dividers",
  "border-subtle": "Barely-visible separators",
  "accent-hover": "Hover state", "accent-soft": "Tinted backgrounds, row hover",
};

const worstOf = (mode, name) => {
  const tk = mode === "dark" ? darkT : light;
  return Math.min(...SURFACES.map((s) => E.contrast(E.hexToRgb(tk[name]), E.hexToRgb(tk[s]))));
};

const docSemantic = [
  "| Token | Light | Dark | Usage |", "|---|---|---|---|",
  ...Object.keys(light).map((k) => `| \`--${k}\` | ${light[k]} | ${darkT[k]} | ${USAGE[k] || ""} |`),
].join("\n");

const docContrast = [
  "| | Light | Dark | Floor |", "|---|---|---|---|",
  ...[["text", T.text], ["text-2", T.text2], ["text-3", T.text3]].map(
    ([k, need]) => `| \`--${k}\` | ${worstOf("light", k).toFixed(2)}:1 | ${worstOf("dark", k).toFixed(2)}:1 | ${need.toFixed(1)}:1 |`
  ),
].join("\n");

const DOC = path.join(ROOT, "DESIGN-SYSTEM.md");
let doc = fs.readFileSync(DOC, "utf8");
const spliceDoc = (src, name, body) => {
  const s = `<!-- GENERATED:${name}:START -->`;
  const e = `<!-- GENERATED:${name}:END -->`;
  if (src.split(s).length - 1 !== 1 || src.split(e).length - 1 !== 1) {
    console.error(`Marker GENERATED:${name} malformed in DESIGN-SYSTEM.md — aborting.`);
    process.exit(1);
  }
  return src.replace(
    new RegExp(`(${s.replace(/[-!<>/]/g, "\\$&")})[\\s\\S]*?(${e.replace(/[-!<>/]/g, "\\$&")})`),
    `$1\n${body}\n$2`
  );
};
doc = spliceDoc(doc, "DOC-SEMANTIC", docSemantic);
doc = spliceDoc(doc, "DOC-CONTRAST", docContrast);
fs.writeFileSync(DOC, doc);

console.log("Wrote assets/css/tokens.css + scripts/tokens.audit.json + DESIGN-SYSTEM.md §4");
