// ═══════════════════════════════════════════════════════════════
// COLOR MATH (0–100 s/l space, from the Map Theme Builder)
// Pure functions only — no DOM, no state.
// ═══════════════════════════════════════════════════════════════
export function hexToHsl(hex) {
  const r = parseInt(hex.slice(1,3),16)/255;
  const g = parseInt(hex.slice(3,5),16)/255;
  const b = parseInt(hex.slice(5,7),16)/255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h, s, l = (max+min)/2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d/(2-max-min) : d/(max+min);
    switch(max){
      case r: h=(g-b)/d+(g<b?6:0); break;
      case g: h=(b-r)/d+2; break;
      case b: h=(r-g)/d+4; break;
    }
    h /= 6;
  }
  return [h*360, s*100, l*100];
}

export function hslToHex(h, s, l) {
  h/=360; s/=100; l/=100;
  let r,g,b;
  if(s===0){ r=g=b=l; }
  else {
    const q = l<0.5 ? l*(1+s) : l+s-l*s;
    const p = 2*l-q;
    const hue2rgb = (p,q,t) => {
      if(t<0) t+=1; if(t>1) t-=1;
      if(t<1/6) return p+(q-p)*6*t;
      if(t<1/2) return q;
      if(t<2/3) return p+(q-p)*(2/3-t)*6;
      return p;
    };
    r=hue2rgb(p,q,h+1/3); g=hue2rgb(p,q,h); b=hue2rgb(p,q,h-1/3);
  }
  return '#'+[r,g,b].map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join('');
}

function perceptualCurve(i, n) {
  const x = i/(n-1);
  return x < 0.5 ? 2*x*x : 1 - Math.pow(-2*x+2,2)/2;
}

export function generateScale(baseHex, steps = 12) {
  const [h, s] = hexToHsl(baseHex);
  const colors = [];
  const maxL = 96, minL = 18;
  for (let i = 0; i < steps; i++) {
    const t = perceptualCurve(i, steps);
    colors.push(hslToHex(h, s, maxL - (maxL - minL) * t));
  }
  return colors;
}

export function patternInkColor(baseHex) {
  const [h, s, l] = hexToHsl(baseHex);
  return l > 55 ? hslToHex(h, Math.min(s + 6, 60), Math.max(l - 42, 10))
                : hslToHex(h, Math.min(s + 6, 60), Math.min(l + 46, 92));
}

export function ensureHashHex(hex) {
  if (!hex || !hex.startsWith('#')) return '#000000';
  return hex.length === 7 ? hex : '#000000';
}
