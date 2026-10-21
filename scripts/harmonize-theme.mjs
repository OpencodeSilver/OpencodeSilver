#!/usr/bin/env node
/**
 * harmonize-theme.mjs
 *
 * Aligns a theme's accent palette in OKLCH space so every accent shares one
 * saturation (chroma) and one brightness (lightness) target while keeping its
 * own hue. This is how you make colors borrowed from different themes feel like
 * one family — e.g. pulling Flexoki's punchy status hues down to Vitesse's
 * calmer saturation.
 *
 * It only touches the accent roles listed in ACCENT_ROLES (primary / status /
 * pr). Surfaces, borders, text, and syntax are left untouched — syntax is
 * usually already the reference you are matching to.
 *
 * Pipeline per color:  hex -> linear sRGB -> OKLab -> OKLCH
 *   -> set L = target.l, C = target.c, keep H
 *   -> gamut-fit (reduce C until it fits sRGB) -> hex (alpha preserved)
 *
 * Usage:
 *   node scripts/harmonize-theme.mjs <theme.json>              # dry-run table
 *   node scripts/harmonize-theme.mjs <theme.json> --write      # rewrite in place
 *   node scripts/harmonize-theme.mjs <theme.json> --out=x.json
 *   Overrides: --l=0.70 --c=0.085   (defaults are chosen per light/dark variant)
 *
 * No dependencies; math ported from the OpenCode desktop color engine.
 */
import fs from 'node:fs';
import {
  clamp,
  hue,
  parseHex,
  toHex,
  srgbToLinear,
  linearToSrgb,
  rgbToOklch,
  oklchToRgb,
  inGamut,
  fitOklch,
  oklchToHex,
  TARGETS,
  STATUS_ROLES,
  PR_ROLES,
  STATUS_BG_ALPHA,
  STATUS_BORDER_ALPHA,
  PRIMARY_OFFSETS,
  harmonize,
  atLightness,
  onColor,
  scaleChroma,
} from './lib/theme-utils.mjs';

// Syntax token colors are boosted, but not the code panel background, the
// default text color, or the deliberately-muted local-variable tone.
const SYNTAX_SKIP_BASE = new Set(['background', 'foreground']);
const SYNTAX_SKIP_TOKENS = new Set(['variableLocal']);

function saturateSyntax(theme, factor) {
  const syntax = theme.colors?.syntax;
  const rows = [];
  const bump = (bag, skip, prefix) => {
    if (!bag) return;
    for (const [key, val] of Object.entries(bag)) {
      if (typeof val !== 'string' || skip.has(key)) continue;
      const { hex, src, out } = scaleChroma(val, factor);
      bag[key] = hex;
      rows.push([`${prefix}.${key}`, val, hex, src, out]);
    }
  };
  bump(syntax?.base, SYNTAX_SKIP_BASE, 'base');
  bump(syntax?.tokens, SYNTAX_SKIP_TOKENS, 'tokens');
  return rows;
}

function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--'));
  if (!file) {
    console.error(
      'usage: node scripts/harmonize-theme.mjs <theme.json> [--write] [--out=path] [--l=..] [--c=..]\n' +
        '       node scripts/harmonize-theme.mjs <theme.json> --syntax[=factor] [--write]  (boost syntax saturation only)',
    );
    process.exit(1);
  }
  const write = args.includes('--write');
  const outArg = args.find((a) => a.startsWith('--out='));
  const lArg = args.find((a) => a.startsWith('--l='));
  const cArg = args.find((a) => a.startsWith('--c='));

  const theme = JSON.parse(fs.readFileSync(file, 'utf8'));
  const variant = theme.metadata?.variant === 'light' ? 'light' : 'dark';
  const target = { ...TARGETS[variant] };
  if (lArg) target.l = parseFloat(lArg.split('=')[1]);
  if (cArg) target.c = parseFloat(cArg.split('=')[1]);

  // --- syntax-only mode: boost token saturation, leave accents untouched ---
  const synArg = args.find((a) => a === '--syntax' || a.startsWith('--syntax='));
  if (synArg) {
    const factor = synArg.includes('=') ? parseFloat(synArg.split('=')[1]) : 1.3;
    const rows = saturateSyntax(theme, factor);
    console.log(`\n${file}  (syntax saturation ×${factor}, variant: ${variant})\n`);
    console.log('  token                before   ->  after     C (chroma)');
    for (const [name, before, after, src, out] of rows) {
      console.log(
        `  ${name.padEnd(20)} ${before.slice(0, 7)} -> ${after.slice(0, 7)}   ${src.c.toFixed(3)}→${out.c.toFixed(3)}`,
      );
    }
    const outPath = outArg ? outArg.split('=')[1] : file;
    if (write || outArg) {
      fs.writeFileSync(outPath, JSON.stringify(theme, null, 2) + '\n');
      console.log(`\nwrote ${outPath}`);
    } else {
      console.log('\n(dry run — pass --write to save)');
    }
    return;
  }

  const rows = [];
  const record = (name, before, after, src, out) => rows.push([name, before, after, src, out]);

  // --- primary: harmonize base, derive interaction shades from it ----------
  const primary = theme.colors?.primary;
  if (primary && typeof primary.base === 'string') {
    const { hex, src, out } = harmonize(primary.base, target);
    record('primary.base', primary.base, hex, src, out);
    primary.base = hex;
    const off = PRIMARY_OFFSETS[variant];
    if ('hover' in primary) primary.hover = atLightness(hex, target.l + off.hover);
    if ('active' in primary) primary.active = atLightness(hex, target.l + off.active);
    if ('emphasis' in primary) primary.emphasis = atLightness(hex, target.l + off.emphasis);
    if ('muted' in primary) primary.muted = hex.slice(0, 7) + '80';
    if ('foreground' in primary) primary.foreground = onColor(hex);

    // Wire the interactive focus/selection accent to the harmonized primary.
    const inter = theme.colors?.interactive;
    if (inter) {
      if ('borderFocus' in inter) inter.borderFocus = hex;
      if ('focus' in inter) inter.focus = hex;
      if ('focusRing' in inter) inter.focusRing = hex.slice(0, 7) + '55';
      if ('selection' in inter) inter.selection = hex.slice(0, 7) + '2b';
    }
  }

  // --- status: harmonize base, re-derive tints + on-fill text --------------
  const status = theme.colors?.status;
  if (status) {
    for (const key of STATUS_ROLES) {
      if (typeof status[key] !== 'string') continue;
      const { hex, src, out } = harmonize(status[key], target);
      record(`status.${key}`, status[key], hex, src, out);
      status[key] = hex;
      const bare = hex.slice(0, 7);
      if (`${key}Background` in status) status[`${key}Background`] = bare + STATUS_BG_ALPHA;
      if (`${key}Border` in status) status[`${key}Border`] = bare + STATUS_BORDER_ALPHA;
      if (`${key}Foreground` in status) status[`${key}Foreground`] = onColor(hex);
    }
  }

  // --- pr: harmonize the hued roles ----------------------------------------
  const pr = theme.colors?.pr;
  if (pr) {
    for (const key of PR_ROLES) {
      if (typeof pr[key] !== 'string') continue;
      const { hex, src, out } = harmonize(pr[key], target);
      record(`pr.${key}`, pr[key], hex, src, out);
      pr[key] = hex;
    }
  }

  console.log(`\n${file}  (variant: ${variant}, target L=${target.l} C=${target.c})\n`);
  console.log('  token                before   ->  after     ΔC (chroma)');
  for (const [name, before, after, src, out] of rows) {
    console.log(
      `  ${name.padEnd(20)} ${before.slice(0, 7)} -> ${after.slice(0, 7)}   ` +
        `${src.c.toFixed(3)}→${out.c.toFixed(3)}  L ${src.l.toFixed(2)}→${out.l.toFixed(2)}  H${Math.round(src.h)}`,
    );
  }

  const outPath = outArg ? outArg.split('=')[1] : file;
  if (write || outArg) {
    fs.writeFileSync(outPath, JSON.stringify(theme, null, 2) + '\n');
    console.log(`\nwrote ${outPath}`);
  } else {
    console.log('\n(dry run — pass --write to save, or --out=path)');
  }
}

main();
