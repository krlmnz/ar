// ═══════════════════════════════════════════════════════════════
// PANTONE ENGINE — swatch lookups and perceptual matching over the
// 2,310-color library (color math in 0–1 s/l space, from the
// Pantone Library engine). The raw data lives in pantone-data.js.
// ═══════════════════════════════════════════════════════════════
import { PANTONE_DATA } from './pantone-data.js';

function pHexToRgb(h){ return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]; }
function pRgbToHsl(r,g,b){
  r/=255; g/=255; b/=255;
  const max=Math.max(r,g,b), min=Math.min(r,g,b);
  let h=0, s=0, l=(max+min)/2;
  const d=max-min;
  if(d){
    s = l>0.5 ? d/(2-max-min) : d/(max+min);
    switch(max){
      case r: h=(g-b)/d + (g<b?6:0); break;
      case g: h=(b-r)/d + 2; break;
      case b: h=(r-g)/d + 4; break;
    }
    h/=6;
  }
  return [h*360, s, l];
}

export const PCOLORS = Object.entries(PANTONE_DATA).map(([code,v])=>{
  const [r,g,b] = pHexToRgb(v.hex);
  const [h,s,l] = pRgbToHsl(r,g,b);
  return { code, name: v.name, hex: v.hex, h, s, l, display: v.name.replace(/-/g,' ') };
});

export function P(code){ const v = PANTONE_DATA[code]; return v ? '#'+v.hex : '#cccccc'; }

function pantoneDistance(t, c, hueWeight){
  let dh = Math.abs(t.h - c.h); if (dh > 180) dh = 360 - dh;
  const dhN = dh/180;
  const ds = Math.abs(t.s - c.s);
  const dl = Math.abs(t.l - c.l);
  return hueWeight*dhN*dhN + 1.0*ds*ds + 1.1*dl*dl;
}

const nearCache = {};
export function nearestPantoneToHex(hex){
  const key = hex.toLowerCase();
  if (nearCache[key]) return nearCache[key];
  const [r,g,b] = pHexToRgb(key.replace('#',''));
  const [h,s,l] = pRgbToHsl(r,g,b);
  let best=null, bestD=Infinity;
  for(const c of PCOLORS){
    const d = pantoneDistance({h,s,l}, c, 1.6);
    if(d<bestD){ bestD=d; best=c; }
  }
  nearCache[key] = best;
  return best;
}
