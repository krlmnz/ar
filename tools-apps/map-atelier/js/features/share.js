// ═══════════════════════════════════════════════════════════════
// SHARE — the publish modal (link, copy, WhatsApp, guest view),
// plus the jump into the preview page.
//
// Preview used to be a class on <body>. It is a page now
// (preview.html), which means what you preview is what you would
// actually ship: the same file the guest view is built from, loaded
// clean, rather than the editor pretending to be it.
// ═══════════════════════════════════════════════════════════════
import { S, currentPalette, session, flushPersist } from '../store/state.js';
import { buildShareURL } from '../store/share-codec.js';
import { PREVIEW_PAGE } from '../config.js';
import { $, esc } from '../core/dom.js';
import { bus, ESC } from '../core/bus.js';
import { toast } from './toast.js';

let shareOpener = null;

// The topbar only exists on the editor; guarding here keeps the modal
// usable on every page that mounts it.
function setInert(on) {
  const bar = document.getElementById('topbar');
  if (bar) bar.inert = on;
  $('stage').inert = on;
}

export function openShare() {
  if (!S.places.length) { toast('Add at least one place before sharing 📍'); bus.emit('pane:switch', 'places'); return; }
  // a modal dismisses the transient map UI behind it (click-to-drop mode, the
  // place panel), so a later Escape peels back one layer at a time
  bus.emit('addmode:set', false);
  bus.emit('ui:dismiss-transient');
  const url = buildShareURL(S);
  $('share-link').value = url;
  $('share-title-line').textContent = `“${S.title || 'Your map'}” is ready to share`;
  const pal = currentPalette();
  const patternCount = Object.values(S.patterns).filter(Boolean).length;
  $('share-stats').innerHTML = `
    <span class="share-stat"><span class="dot" style="background:${S.accent}"></span>${S.places.length} place${S.places.length !== 1 ? 's' : ''}</span>
    <span class="share-stat"><span class="dot" style="background:${S.colors.water}"></span>${esc(pal.name)} palette</span>
    <span class="share-stat">${patternCount} pattern${patternCount !== 1 ? 's' : ''}</span>`;
  const waText = encodeURIComponent(`${S.title || 'Your map'} — a map worth looking at ${url}`);
  $('share-wa').href = `https://wa.me/?text=${waText}`;
  shareOpener = document.activeElement;
  $('share-overlay').classList.add('open');
  setInert(true);
  setTimeout(() => $('share-copy').focus(), 0);
}

function closeShare() {
  setInert(false);
  if (shareOpener && shareOpener.isConnected) shareOpener.focus();
  shareOpener = null;
  $('share-overlay').classList.remove('open');
}

// Navigating away drops the debounced write window, so flush first or the
// last few edits never make it into the doc preview.html is about to read.
function openPreview() {
  flushPersist();
  location.href = session.projectId ? `${PREVIEW_PAGE}?id=${session.projectId}` : PREVIEW_PAGE;
}

// ── wiring ─────────────────────────────────────────────────────
export function init() {
  document.getElementById('btn-preview')?.addEventListener('click', openPreview);

  $('btn-share') && $('btn-share').addEventListener('click', openShare);
  $('share-close').addEventListener('click', closeShare);
  $('share-overlay').addEventListener('click', e => {
    if (e.target === $('share-overlay')) closeShare();
  });
  $('share-copy').addEventListener('click', () => {
    navigator.clipboard.writeText($('share-link').value)
      .then(() => toast('Link copied — send it to anyone'))
      .catch(() => {
        $('share-link').select();
        document.execCommand('copy');
        toast('Link copied');
      });
  });
  $('share-open').addEventListener('click', () => {
    window.open($('share-link').value, '_blank');
  });

  bus.on('share:open', openShare);
  bus.on('preview:open', openPreview);
  bus.on('ui:escape', ctx => {
    if (ctx.handled) return;
    if ($('share-overlay').classList.contains('open')) { closeShare(); ctx.handled = true; }
  }, { priority: ESC.SHARE });
}
