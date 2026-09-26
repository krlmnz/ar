export function hexToRgb(hex) {
  const h = String(hex || '').replace('#', '').trim();
  if (h.length !== 6) return null;
  const n = parseInt(h, 16);
  if (!Number.isFinite(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function luminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 1;
  return (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
}

export function isDark(hex) {
  return luminance(hex) < 0.45;
}

export function mix(hex, toward, t) {
  const a = hexToRgb(hex);
  const b = hexToRgb(toward);
  if (!a || !b) return hex;
  const k = Math.max(0, Math.min(1, t));
  const ch = (x, y) => Math.round(x + (y - x) * k);
  const n = (ch(a.r, b.r) << 16) | (ch(a.g, b.g) << 8) | ch(a.b, b.b);
  return '#' + n.toString(16).padStart(6, '0');
}

export function darken(hex, t) {
  return mix(hex, '#000000', t);
}

export function inkOn(hex) {
  return isDark(hex) ? '#ffffff' : '#1a1a1a';
}
