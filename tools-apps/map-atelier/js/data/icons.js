// ═══════════════════════════════════════════════════════════════
// ICONS — the couple's marks (pin glyphs). Add a new icon here and
// it appears everywhere: pickers, pins, lists, popups.
// ═══════════════════════════════════════════════════════════════
export const ICONS = {
  heart:   '<path d="M12 20.5C12 20.5 4 15.3 4 9.9 4 7.2 6.1 5.2 8.6 5.2c1.4 0 2.7.7 3.4 1.8.7-1.1 2-1.8 3.4-1.8 2.5 0 4.6 2 4.6 4.7 0 5.4-8 10.6-8 10.6Z"/>',
  rings:   '<circle cx="9" cy="14.5" r="4.5"/><circle cx="15" cy="14.5" r="4.5"/><path d="m15 3.2 2.1 2.3-2.1 2.3-2.1-2.3z"/>',
  gem:     '<path d="M7 4h10l3.5 5L12 20.5 3.5 9Z"/><path d="M3.5 9h17M7 4l5 5 5-5M12 9l-3 11M12 9l3 11"/>',
  sparkle: '<path d="M12 4l1.7 4.8 4.8 1.7-4.8 1.7L12 17l-1.7-4.8L5.5 10.5l4.8-1.7Z"/><path d="m18.5 16.2.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7Z"/>',
  star:    '<path d="m12 3.5 2.5 5.2 5.7.8-4.1 4 1 5.7L12 16.5l-5.1 2.7 1-5.7-4.1-4 5.7-.8Z"/>',
  church:  '<path d="M12 3v4M10 5h4"/><path d="M6.5 21v-8.2L12 8.5l5.5 4.3V21"/><path d="M10.2 21v-3.6a1.8 1.8 0 0 1 3.6 0V21"/><path d="M4 21h16"/>',
  wine:    '<path d="M7.5 3h9l-.7 5.4a3.9 3.9 0 0 1-7.6 0Z"/><path d="M12 12.5V19M8.5 21h7"/>',
  cocktail:'<path d="M4.5 4h15L12 12.5Z"/><path d="M12 12.5V19M8 21h8M7.2 7h9.6"/>',
  dining:  '<path d="M7 3v5a2.5 2.5 0 0 0 5 0V3M9.5 3v18"/><path d="M16.5 3c-1.7 3.2-1.7 7 0 9.3V21"/>',
  coffee:  '<path d="M4.5 9h11v4.5a5 5 0 0 1-10 0Z"/><path d="M15.5 10h1.7a2.4 2.4 0 0 1 0 4.8h-2M8 3.5v2M12 3.5v2"/>',
  cake:    '<path d="M5.5 20.5h13M6.5 20.5v-6h11v6"/><path d="M6.5 16.8c1.4 1.1 2.8 1.1 3.7 0 1.1 1.1 2.5 1.1 3.6 0 .9 1.1 2.3 1.1 3.7 0"/><path d="M9.5 14.5v-3h5v3M12 11.5V9"/><circle cx="12" cy="7" r=".9"/>',
  camera:  '<path d="M4 8.5h3.2L9 5.8h6l1.8 2.7H20V19H4Z"/><circle cx="12" cy="13.5" r="3.2"/>',
  music:   '<path d="M9.5 17.5V6.2L19 4.2v11.3"/><circle cx="7" cy="17.5" r="2.5"/><circle cx="16.5" cy="15.5" r="2.5"/>',
  book:    '<path d="M12 6.3C10 4.9 7.6 4.4 4 4.4v13.8c3.6 0 6 .5 8 1.9 2-1.4 4.4-1.9 8-1.9V4.4c-3.6 0-6 .5-8 1.9Z"/><path d="M12 6.3v13.8"/>',
  mountain:'<path d="m3 19.5 7-12.5 4.5 8 2.5-4 4 8.5Z"/><path d="m8.2 10.7 1.8 1.6 1.7-1.6"/>',
  wave:    '<path d="M3 10.5c2-2.2 4-2.2 6 0s4 2.2 6 0 4-2.2 6 0"/><path d="M3 16c2-2.2 4-2.2 6 0s4 2.2 6 0 4-2.2 6 0"/>',
  spa:     '<path d="M5.5 14.5h13a6.5 6.5 0 0 1-13 0Z"/><path d="M8.5 4c-1 1.4.9 2.4 0 3.8M12 4c-1 1.4.9 2.4 0 3.8M15.5 4c-1 1.4.9 2.4 0 3.8"/>',
  plane:   '<path d="M21 3.5 3.5 10.6l5.8 2.4L11.5 20.5 14.3 14 21 3.5Z"/><path d="m9.3 13 11.7-9.5"/>',
  home:    '<path d="m4 11.5 8-7 8 7"/><path d="M6.3 9.5V20h11.4V9.5"/><path d="M10 20v-4.8h4V20"/>',
  flower:  '<circle cx="12" cy="12" r="2.1"/><circle cx="12" cy="6.6" r="2.6"/><circle cx="17 " cy="9.4" r="2.6"/><circle cx="15.7" cy="15.1" r="2.6"/><circle cx="8.3" cy="15.1" r="2.6"/><circle cx="7" cy="9.4" r="2.6"/>',
};

export function iconSVG(id, size = 16, sw = 1.8) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${ICONS[id] || ICONS.heart}</svg>`;
}
