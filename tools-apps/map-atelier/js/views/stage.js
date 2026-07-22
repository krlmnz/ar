// ═══════════════════════════════════════════════════════════════
// MAP STAGE — the markup every page shares.
//
// The editor, the preview and the guest view all render the same
// map surface: the Mapbox canvas, the palette dock, the place
// details panel, the color library flyout and the guest hero.
// They differ only in which parts CSS reveals (body.editor /
// body.preview / body.guest), so the markup lives here once and
// each page injects it instead of keeping its own copy.
//
// Every feature module still reaches its nodes by id, so this must
// run before any feature `init()`.
// ═══════════════════════════════════════════════════════════════
import { EDITOR_PAGE } from '../config.js';

export const STAGE_HTML = `
<div id="map">
  <div id="mapbox"></div>

  <!-- palette dock — the one exposed piece of the theme system -->
  <div id="palette-dock">
    <button id="palette-dock-thumb" aria-haspopup="dialog" title="Change the map palette"></button>
    <div class="pd-meta">
      <div class="pd-kicker">Palette</div>
      <div class="pd-name" id="pd-name">—</div>
    </div>
    <button class="pd-shuffle" id="btn-shuffle-palette" title="Shuffle palette" aria-label="Shuffle to a different palette">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>
    </button>
  </div>

  <!-- place details -->
  <div id="place-panel" role="dialog" aria-labelledby="pp-name">
    <div class="pp-head">
      <div class="pp-pin" id="pp-pin"></div>
      <div class="pp-head-info">
        <div class="pp-kicker">Place</div>
        <input id="pp-name" aria-label="Place name">
      </div>
      <button class="icon-x" id="pp-close" aria-label="Close">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
    </div>
    <div class="pp-block">
      <div class="field-label">Your story here</div>
      <textarea class="text-input" id="pp-note" rows="6" placeholder="Why this place is on the map — what happened here, what to order, what to skip…"></textarea>
    </div>
    <!-- Icon and background are one decision — what the pin looks like — so
         they share a group rather than reading as two unrelated blocks. -->
    <div class="pp-block pp-pin-group">
      <div class="field-label">Pin</div>
      <div class="pp-sublabel">Icon</div>
      <div class="icon-grid" id="pp-icons"></div>
      <div class="pp-sublabel">Background</div>
      <div class="pin-colors" id="pp-colors"></div>
    </div>
    <div class="pp-foot">
      <button class="btn danger" id="pp-delete">Remove</button>
      <button class="btn primary" id="pp-done">Done</button>
    </div>
  </div>


  <!-- layer styling — opens when a row in the rail's layer stack is picked.
       Same furniture as #place-panel: pick a thing on the left, style it here. -->
  <div id="layer-panel" role="dialog" aria-labelledby="lp-name">
    <div class="pp-head">
      <div class="pp-pin" id="lp-swatch" aria-hidden="true"></div>
      <div class="pp-head-info">
        <div class="pp-kicker">Map layer</div>
        <div class="mlp-name" id="lp-name">—</div>
      </div>
      <button class="icon-x" id="lp-close" aria-label="Close">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
    </div>
    <!-- FILL / BASE COLOR -->
    <div class="pp-block">
      <div class="field-label">
        <span>Color</span>
        <button class="link-btn" id="open-library" title="Browse the Pantone library">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.2"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/></svg>
          Library
        </button>
      </div>
      <div class="current-swatch-row">
        <button id="cur-swatch" title="Open the color library"></button>
        <div class="value-field">
          <span class="value-prefix">#</span>
          <input id="hex-input" spellcheck="false" aria-label="Hex value" maxlength="7">
        </div>
        <div class="value-field compact">
          <input id="opacity-input" spellcheck="false" inputmode="numeric" aria-label="Opacity percent" maxlength="3">
          <span class="value-suffix">%</span>
        </div>
        <input type="color" id="native-picker" style="width:0;height:0;opacity:0;border:none;padding:0">
      </div>
    </div>

    <!-- LINE (line layers only) -->
    <div class="pp-block" id="mlp-line-block">
      <div class="field-label">Line</div>
      <div class="slider-row">
        <label for="line-width">Width</label>
        <input type="range" id="line-width" min="1" max="24" step="1">
        <span class="val" id="line-width-val"></span>
      </div>
      <div style="margin-top: var(--s1)">
        <div class="field-label">Dash</div>
        <div class="seg-chips" id="line-styles"></div>
      </div>
    </div>

    <!-- BORDER (polygon layers only) -->
    <div class="pp-block" id="mlp-border-block">
      <div class="field-label">Border</div>
      <div class="current-swatch-row">
        <button id="border-swatch" title="Border color"></button>
        <div class="value-field">
          <span class="value-prefix">#</span>
          <input id="border-hex" spellcheck="false" aria-label="Border color hex" maxlength="7">
        </div>
        <div class="value-field compact">
          <input id="border-width" spellcheck="false" inputmode="numeric" aria-label="Border width in pixels" maxlength="2">
          <span class="value-suffix">px</span>
        </div>
        <input type="color" id="border-picker" style="width:0;height:0;opacity:0;border:none;padding:0">
      </div>
    </div>

    <!-- PATTERN (polygon layers only) -->
    <div class="pp-block" id="mlp-pattern-block">
      <div class="field-label">
        <span>Pattern</span>
        <span class="field-hint" id="ptn-axis"></span>
      </div>
      <div id="pattern-groups"></div>
      <div id="ptn-controls" style="display:none">
        <div class="ramp-block">
          <div class="ramp-head"><span>Density</span><span class="ramp-val" id="ptn-density-val"></span></div>
          <div class="ramp" id="ptn-density-ramp"></div>
        </div>
        <div class="ramp-block">
          <div class="ramp-head"><span>Weight</span><span class="ramp-val" id="ptn-weight-val"></span></div>
          <div class="ramp" id="ptn-weight-ramp"></div>
        </div>
        <div class="ramp-block">
          <div class="ramp-head">
            <span>Ink</span>
            <button class="link-btn" id="open-library-ink" title="Browse the Pantone library">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.2"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/></svg>
              Library
            </button>
          </div>
          <div class="chips" id="ptn-inks"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- color library (opens beside the map rail) -->
  <div id="color-library" role="region" aria-labelledby="cl-slot">
    <div class="cl-head">
      <div id="cl-cur-swatch" aria-hidden="true"></div>
      <div class="cl-head-info">
        <div class="cl-kicker" id="cl-slot">Fill</div>
        <div class="cl-cur-name" id="cl-cur-name">—</div>
        <div class="cl-cur-code" id="cl-cur-code">—</div>
      </div>
      <button class="icon-x" id="cl-close" aria-label="Close">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
    </div>
    <div class="cl-filters">
      <div class="cl-search-wrap">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input class="text-input" id="cl-search" placeholder="Search name, code or hex…" autocomplete="off" spellcheck="false">
        <button class="cl-clear" id="cl-clear" aria-label="Clear search" hidden>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>
      <div class="cl-hues" id="cl-hues"></div>
      <div class="cl-bands">
        <div class="cl-band" id="cl-tone"  data-axis="tone"></div>
        <div class="cl-band" id="cl-value" data-axis="value"></div>
      </div>
    </div>
    <div class="cl-body" id="cl-body"></div>
    <div class="cl-contrast" id="cl-contrast" role="status" aria-live="polite"></div>
    <div id="cl-status" class="sr-only" role="status" aria-live="polite"></div>
  </div>

  <!-- guest hero -->
  <div id="guest-hero">
    <div class="gh-eyebrow">✦ A map worth looking at</div>
    <div class="gh-title" id="gh-title"></div>
    <div class="gh-desc" id="gh-desc"></div>
    <div class="gh-meta"><span id="gh-meta-places"></span><span>·</span><span id="gh-meta-pal"></span></div>
    <button class="btn gh-list-toggle" id="gh-list-toggle">Explore the places</button>
    <div id="guest-list"></div>
  </div>
  <a id="guest-badge" href="${EDITOR_PAGE}?new=1" title="Make your own story map">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20.5C12 20.5 4 15.3 4 9.9 4 7.2 6.1 5.2 8.6 5.2c1.4 0 2.7.7 3.4 1.8.7-1.1 2-1.8 3.4-1.8 2.5 0 4.6 2 4.6 4.7 0 5.4-8 10.6-8 10.6Z"/></svg>
  Made with the Map Atelier — create your own</a>
</div>`;

// The palette modal is editor-only chrome, but design.js binds to it
// unconditionally, so every page gets it and CSS decides who sees it.
export const PALETTE_MODAL_HTML = `
<div id="palette-overlay" role="dialog" aria-modal="true" aria-labelledby="palette-modal-title">
  <div class="palette-modal-card">
    <button class="icon-x palette-close" id="palette-close" aria-label="Close">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
    </button>
    <div class="share-kicker">Map palette</div>
    <div class="share-title" id="palette-modal-title">Pick a template</div>
    <p class="share-sub">Every color is a real Pantone swatch, and every palette clears WCAG AA for label contrast. Pick one, then fine-tune any layer on the left.</p>
    <div class="palette-grid" id="palette-grid"></div>
  </div>
</div>`;

export const SHARE_MODAL_HTML = `
<div id="share-overlay" role="dialog" aria-modal="true" aria-labelledby="share-title-line">
  <div class="share-card">
    <button class="icon-x share-close" id="share-close" aria-label="Close">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
    </button>
    <div class="share-kicker">✦ Your map is live</div>
    <div class="share-title" id="share-title-line">Send it to anyone</div>
    <p class="share-sub">Anyone with this link sees your map exactly as you designed it — colors, patterns, pins and notes. No app, no sign-in.</p>
    <div class="share-stats" id="share-stats"></div>
    <div class="share-link-row">
      <input id="share-link" readonly>
      <button class="btn primary" id="share-copy">Copy link</button>
    </div>
    <div class="share-row2">
      <button class="btn" id="share-open">Open guest view ↗</button>
      <a class="btn" id="share-wa" target="_blank" rel="noopener">Share on WhatsApp</a>
    </div>
  </div>
</div>`;

export const TOAST_HTML = `<div id="toast" role="status" aria-live="polite"></div>`;

// Mount the shared furniture into a host element. Pages call this
// once, before any feature init, and then add only their own chrome.
export function mountStage(hostId = 'stage') {
  const host = document.getElementById(hostId);
  if (!host) throw new Error(`mountStage: #${hostId} not found`);
  host.insertAdjacentHTML('beforeend', STAGE_HTML);
  document.body.insertAdjacentHTML('beforeend', PALETTE_MODAL_HTML + SHARE_MODAL_HTML + TOAST_HTML);
}
