// ═══════════════════════════════════════════════════════════════
// TOAST — transient confirmation messages. Works on any page that
// has a #toast element.
// ═══════════════════════════════════════════════════════════════
import { $ } from '../core/dom.js';

let toastTimer;
export function toast(msg) {
  const el = $('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}
