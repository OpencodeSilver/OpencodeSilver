/**
 * Shared color transformation and theme manipulation utilities.
 * Math ported from the color engine (sRGB <-> OKLCH color space).
 */

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const hue = (v) => ((v % 360) + 360) % 360;

export function parseHex(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
  const a = h.length === 8 ? h.slice(6, 8) : null;
  const n = parseInt(h.slice(0, 6), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255, alpha: a };
}

export function toHex(r, g, b, alpha) {
  const c = (v) => Math.round(clamp(v, 0, 1) * 255).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}${alpha ?? ''}`;
}

export const srgbToLinear = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
export const linearToSrgb = (v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);

export function rgbToOklch(r, g, b) {
  const lr = srgbToLinear(r), lg = srgbToLinear(g), lb = srgbToLinear(b);
  const l_ = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m_ = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s_ = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
  const l = Math.cbrt(l_), m = Math.cbrt(m_), s = Math.cbrt(s_);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  let H = Math.atan2(bb, a) * (180 / Math.PI);
  if (H < 0) H += 360;
  return { l: L, c: Math.sqrt(a * a + bb * bb), h: H };
}

export function oklchToRgb({ l: L, c: C, h: H }) {
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l = L + 0.3963377774 * a + 0.2158037573 * b;
  const m = L - 0.1055613458 * a - 0.0638541728 * b;
  const s = L - 0.0894841775 * a - 1.291485548 * b;
  const l3 = l * l * l, m3 = m * m * m, s3 = s * s * s;
  return {
    r: linearToSrgb(4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3),
    g: linearToSrgb(-1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3),
    b: linearToSrgb(-0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3),
  };
}

export const inGamut = ({ r, g, b }) => r >= 0 && r <= 1 && g >= 0 && g <= 1 && b >= 0 && b <= 1;

export function fitOklch(o) {
  const base = { l: clamp(o.l, 0, 1), c: Math.max(0, o.c), h: hue(o.h) };
  if (inGamut(oklchToRgb(base))) return base;
  let c = base.c;
  for (let i = 0; i < 24; i++) {
    c *= 0.9;
    const next = { ...base, c };
    if (inGamut(oklchToRgb(next))) return next;
  }
  return { ...base, c: 0 };
}

export function oklchToHex(o, alpha) {
  const { r, g, b } = oklchToRgb(fitOklch(o));
  return toHex(r, g, b, alpha);
}

export const TARGETS = {
  dark: { l: 0.68, c: 0.135 },
  light: { l: 0.55, c: 0.145 },
};

export const STATUS_ROLES = ['error', 'warning', 'success', 'info'];
export const PR_ROLES = ['open', 'blocked', 'merged', 'closed'];
export const STATUS_BG_ALPHA = '20';
export const STATUS_BORDER_ALPHA = '50';

export const PRIMARY_OFFSETS = {
  dark: { hover: 0.05, active: 0.1, emphasis: 0.1 },
  light: { hover: -0.06, active: -0.11, emphasis: -0.06 },
};

export function harmonize(hex, target) {
  const { r, g, b, alpha } = parseHex(hex);
  const src = rgbToOklch(r, g, b);
  const out = { l: target.l, c: target.c, h: src.h };
  return { hex: oklchToHex(out, alpha), src, out };
}

export function atLightness(hex, l) {
  const { r, g, b } = parseHex(hex);
  const o = rgbToOklch(r, g, b);
  return oklchToHex({ l: clamp(l, 0, 1), c: o.c, h: o.h });
}

export function onColor(hex) {
  const { r, g, b } = parseHex(hex);
  const L = rgbToOklch(r, g, b).l;
  return L > 0.6 ? '#000000' : '#ffffff';
}

export function scaleChroma(hex, factor) {
  const { r, g, b, alpha } = parseHex(hex);
  const src = rgbToOklch(r, g, b);
  const out = { l: src.l, c: src.c * factor, h: src.h };
  return { hex: oklchToHex(out, alpha), src, out };
}
