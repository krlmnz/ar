#!/usr/bin/env node
/* ============================================================
   TOKEN GATE — Andean Road
   ------------------------------------------------------------
   assets/css/andean.css is the hand-authored source of truth
   now. The old job of this script — solving a neutral ramp and
   splicing generated values into tokens.css — is retired with
   that file: a designed export has nothing to emit into. What
   a hand-authored palette CAN lose silently is integrity, so
   the deploy gate guards that instead:

     1. Structure — the light scheme and the dark scheme must
        declare the SAME set of --color-* names, and every value
        must parse as a colour. A token defined in one scheme
        only falls back invisibly in the other and ships as a
        white-on-white bug, never a build error.
     2. Contrast — every fg/bg pairing a component actually
        renders (tokens.config.json `pairings`) is measured with
        color-engine's WCAG math in both schemes against the
        floors in the config. Pairings the export already ships
        under the line are pinned in `knownBelowFloor` at their
        measured ratio, so the gate catches REGRESSION without
        failing on day one.

     node scripts/build-tokens.js           # audit + refresh artifacts
     node scripts/build-tokens.js --check   # verify only, writes nothing

   Write mode refreshes scripts/tokens.audit.json and the two
   GENERATED tables in DESIGN-SYSTEM.md. --check verifies
   andean.css alone — stale artifacts never fail the deploy;
   `npm run tokens` is what refreshes them.

   Exits non-zero on any structural issue or contrast
   regression, and writes nothing in that case.
============================================================ */

const fs = require("fs");
const path = require("path");
const E = require("./color-engine.js");

const ROOT = path.join(__dirname, "..");
const CONFIG = path.join(__dirname, "tokens.config.json");
const AUDIT = path.join(__dirname, "tokens.audit.json");
const DOC = path.join(ROOT, "DESIGN-SYSTEM.md");

const checkOnly = process.argv.includes("--check");
const cfg = JSON.parse(fs.readFileSync(CONFIG, "utf8"));
const SOURCE = path.join(ROOT, cfg.source);

/* ------------------------------------------------------------
   Parse andean.css into the two schemes.

   A tolerant brace-walk, not a CSS parser: track the selector
   stack, and when a block closes, harvest its --color-*
   declarations. This survives the file's real shape — MULTIPLE
   [data-theme="andean"] blocks (colour, type, primitives), the
   dark block's compound selector, and the @media wrappers —
   where "grab the first block" would not. Later declarations
   overwrite earlier ones, same as the cascade.
------------------------------------------------------------ */
function readSchemes(css) {
  /* Comments may contain braces or stray `--x: y;` examples —
     strip them before walking so prose can't become tokens. */
  const src = css.replace(/\/\*[\s\S]*?\*\//g, " ");
  const light = {};
  const dark = {};
  const stack = [];
  let buf = "";

  const harvest = (text, ctx) => {
    const inMedia = ctx.some((s) => s.startsWith("@"));
    const isAndean = ctx.some((s) => s.includes('[data-theme="andean"]'));
    const isDark = ctx.some((s) => s.includes('data-colorscheme="dark"'));
    if (!isAndean) return;
    /* Media blocks are responsive TYPE overrides; a colour that
       changed with viewport width would dodge the audit, so only
       non-media blocks count as the light scheme. */
    const target = isDark ? dark : inMedia ? null : light;
    if (!target) return;
    for (const m of text.matchAll(/--(color-[\w-]+)\s*:\s*([^;]+?)\s*(?:;|$)/gm)) {
      target["--" + m[1]] = m[2].trim();
    }
  };

  for (const ch of src) {
    if (ch === "{") {
      stack.push(buf.trim());
      buf = "";
    } else if (ch === "}") {
      harvest(buf, stack);
      buf = "";
      stack.pop();
    } else {
      buf += ch;
    }
  }
  return { light, dark };
}

/* hex 3/6/8-digit, rgb(), rgba(). Returns { rgb:[r,g,b], alpha }
   or null — null is a structural failure, not a skip. */
function parseColor(v) {
  v = String(v).trim();
  let m = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (m) {
    let h = m[1];
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const alpha = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    const n = parseInt(h.slice(0, 6), 16);
    return { rgb: [(n >> 16) & 255, (n >> 8) & 255, n & 255], alpha };
  }
  m = v.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i);
  if (m) return { rgb: [+m[1], +m[2], +m[3]], alpha: m[4] === undefined ? 1 : +m[4] };
  return null;
}

const css = fs.readFileSync(SOURCE, "utf8");
const { light, dark } = readSchemes(css);

/* ------------------------------------------------------------
   Structural audit.
------------------------------------------------------------ */
const issues = [];
const warnings = [];

if (!Object.keys(light).length) {
  issues.push(`${cfg.source}: no --color-* declarations found in the light scheme.`);
}
if (!Object.keys(dark).length) {
  issues.push(`${cfg.source}: no --color-* declarations found under [data-colorscheme="dark"].`);
}
for (const k of Object.keys(light)) {
  if (!(k in dark)) issues.push(`${k} is defined for light only — dark would inherit or fall back invisibly.`);
}
for (const k of Object.keys(dark)) {
  if (!(k in light)) issues.push(`${k} is defined for dark only — light would inherit or fall back invisibly.`);
}
for (const [mode, map] of [["light", light], ["dark", dark]]) {
  for (const [k, v] of Object.entries(map)) {
    if (!parseColor(v)) issues.push(`${mode} ${k}: "${v}" does not parse as a colour.`);
  }
}

/* ------------------------------------------------------------
   Contrast audit — every pairing a component actually renders,
   in both schemes. Floors sit at the WCAG line; pairings the
   export ships below it are pinned in knownBelowFloor so the
   gate fires on regression, not on history.
------------------------------------------------------------ */
const allow = cfg.knownBelowFloor || [];
const allowUsed = new Set();
const findAllow = (mode, fg, bg) =>
  allow.find((e) => e.mode === mode && e.fg === fg && e.bg === bg);

const rows = [];
for (const [mode, map] of [["light", light], ["dark", dark]]) {
  for (const p of cfg.pairings) {
    const fgName = "--color-" + p.fg;
    const bgName = "--color-" + p.bg;
    const pair = `${p.fg} on ${p.bg}`;
    if (!(fgName in map) || !(bgName in map)) {
      issues.push(`${mode}: pairing "${pair}" references a token missing from ${cfg.source}.`);
      continue;
    }
    const fgc = parseColor(map[fgName]);
    const bgc = parseColor(map[bgName]);
    if (!fgc || !bgc) continue; /* already reported as a parse issue */

    if (fgc.alpha < 1 || bgc.alpha < 1) {
      /* An alpha colour composites over whatever sits underneath, so a
         single ratio would be a guess about context. No audited pairing
         uses alpha today; if one appears it is skipped LOUDLY here
         rather than measured wrong. (Compositing over an assumed
         background was considered and rejected — the real background is
         context-dependent.) */
      rows.push({ mode, pair, fg: map[fgName], bg: map[bgName], ratio: null, need: null, pass: true, skipped: "alpha colour — not measurable out of context" });
      continue;
    }

    const ratio = Math.round(E.contrast(fgc.rgb, bgc.rgb) * 100) / 100;

    if (p.informational) {
      rows.push({ mode, pair, fg: map[fgName], bg: map[bgName], ratio, need: null, pass: true, informational: true });
      continue;
    }

    const need = cfg.floors[p.floor];
    if (need === undefined) {
      issues.push(`pairing "${pair}": unknown floor "${p.floor}" (have: ${Object.keys(cfg.floors).join(", ")}).`);
      continue;
    }

    const pin = findAllow(mode, p.fg, p.bg);
    let pass = ratio >= need;
    let allowlisted = false;
    if (pin) {
      allowUsed.add(pin);
      if (pass) {
        warnings.push(`knownBelowFloor entry ${mode} "${pair}" is stale — it now clears its floor (${ratio}:1 ≥ ${need}). Remove it.`);
      } else {
        allowlisted = true;
        /* 0.005 absorbs the 2-decimal rounding of the recorded value —
           anything lower than that is a real regression. */
        pass = ratio >= pin.measured - 0.005;
      }
    }
    rows.push({ mode, pair, fg: map[fgName], bg: map[bgName], ratio, need, pass, ...(allowlisted && { allowlisted: pin.measured }) });
  }
}
for (const e of allow) {
  if (!allowUsed.has(e)) {
    warnings.push(`knownBelowFloor entry ${e.mode} "${e.fg} on ${e.bg}" matches no configured pairing — dead weight or a typo.`);
  }
}

/* ------------------------------------------------------------
   Report, old table style.
------------------------------------------------------------ */
const fail = rows.filter((r) => !r.pass);
const line = (r) => {
  if (r.skipped) return `  SKIP      —:1 (${r.skipped})  ${r.mode.padEnd(5)}  ${r.pair}`;
  const tag = r.informational ? "INFO" : r.pass ? "PASS" : "FAIL";
  const need = r.informational
    ? "no floor"
    : r.allowlisted !== undefined
      ? `pinned ${r.allowlisted}, WCAG ${r.need}`
      : `needs ${r.need}`;
  return `  ${tag} ${String(r.ratio).padStart(6)}:1 (${need})  ${r.mode.padEnd(5)}  ${r.pair}`;
};

console.log(`\nSource ${cfg.source} · ${Object.keys(light).length} colour tokens per scheme`);
rows.forEach((r) => console.log(line(r)));
console.log(`\n${rows.length} pairings checked · ${fail.length} failure${fail.length === 1 ? "" : "s"}\n`);

warnings.forEach((w) => console.warn("Warning: " + w));

if (issues.length) {
  console.error("andean.css failed the structural audit:");
  issues.forEach((s) => console.error("  · " + s));
  console.error("\nNothing written.");
  process.exit(1);
}
if (fail.length) {
  console.error("Contrast audit FAILED — a pairing regressed below its floor (or its pinned value). Nothing written.");
  process.exit(1);
}

if (checkOnly) {
  console.log("Audit passed · andean.css is structurally sound and contrast holds (nothing written).");
  console.log("Note: tokens.audit.json and the DESIGN-SYSTEM.md tables are write-mode artifacts — staleness never fails --check; refresh them with `npm run tokens`.");
  process.exit(0);
}

/* ------------------------------------------------------------
   Write mode: the audit receipt + the spec's colour tables.

   The tables were hand-maintained once and drifted (20 of 22
   hexes stale at one point) — a table nobody can forget to
   update is the only kind that stays true, so they are still
   generated from the same measurements the gate enforces.
------------------------------------------------------------ */

/* The receipt records only the roles the audit touches — the full
   180-token dump is what andean.css itself is for. */
const auditedRoles = [...new Set(cfg.pairings.flatMap((p) => [p.fg, p.bg]))];
const roleMap = (map) =>
  Object.fromEntries(auditedRoles.map((r) => [r, map["--color-" + r]]));

fs.writeFileSync(
  AUDIT,
  JSON.stringify(
    { config: cfg, light: roleMap(light), dark: roleMap(dark), rows, issues },
    null,
    2
  ) + "\n"
);

/* The core roles a page is composed from — the vocabulary the spec
   teaches first. State roles (hover/active/visited/…) live next to
   their base token in andean.css and are not repeated here. */
const CORE_ROLES = [
  ["--color-page-background-primary", "Page background"],
  ["--color-page-background-secondary", "Alternate page wash (app canvas, banded sections)"],
  ["--color-page-background-tertiary", "Deep-set page regions"],
  ["--color-container-background-primary", "Cards, panels, elevated surfaces"],
  ["--color-container-background-secondary", "Nested surfaces inside cards"],
  ["--color-container-background-tertiary", "Tinted blocks, code backgrounds"],
  ["--color-text-primary", "Primary text, headlines"],
  ["--color-text-secondary", "Secondary text, descriptions"],
  ["--color-text-tertiary", "Overlines, captions, meta"],
  ["--color-link-text", "Links (hover/active/visited have their own tokens)"],
  ["--color-action-standard", "Filled actions — pair with --color-text-complementary"],
  ["--color-focus-indicator", "Focus rings, 2px"],
];

const docSemantic = [
  "| Token | Light | Dark | Usage |",
  "|---|---|---|---|",
  ...CORE_ROLES.map(([k, usage]) => `| \`${k}\` | ${light[k]} | ${dark[k]} | ${usage} |`),
].join("\n");

/* Worst case per foreground, per scheme, over every surface that
   foreground is audited against. */
const fgOrder = [...new Set(cfg.pairings.map((p) => p.fg))];
const FG_LABEL = {
  "text-complementary": "`--color-text-complementary` (on action-standard)",
  "input-placeholder": "`--color-input-placeholder` (on its input)",
};
const worstOf = (mode, fg) => {
  const mine = rows.filter((r) => r.mode === mode && r.pair.startsWith(fg + " on ") && r.ratio !== null);
  const worst = mine.reduce((a, r) => (r.ratio < a.ratio ? r : a));
  return { ratio: worst.ratio, pinned: worst.allowlisted !== undefined };
};
let anyPinned = false;
const docContrast = [
  "| Foreground | Light (worst) | Dark (worst) | Floor |",
  "|---|---|---|---|",
  ...fgOrder.map((fg) => {
    const p = cfg.pairings.find((x) => x.fg === fg);
    const l = worstOf("light", fg);
    const d = worstOf("dark", fg);
    anyPinned = anyPinned || l.pinned || d.pinned;
    const floor = p.informational ? "— (informational)" : `${cfg.floors[p.floor].toFixed(1)}:1`;
    const cell = (w) => `${w.ratio.toFixed(2)}:1${w.pinned ? "\\*" : ""}`;
    return `| ${FG_LABEL[fg] || `\`--color-${fg}\``} | ${cell(l)} | ${cell(d)} | ${floor} |`;
  }),
  ...(anyPinned
    ? ["", "\\* ships below the WCAG floor — pinned in `tokens.config.json` `knownBelowFloor`; the gate fails only on further regression."]
    : []),
].join("\n");

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

console.log("Wrote scripts/tokens.audit.json + DESIGN-SYSTEM.md §4 (andean.css untouched — it is the source).");
