import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  clamp,
  hue,
  parseHex,
  toHex,
  rgbToOklch,
  oklchToRgb,
  oklchToHex,
  harmonize,
  atLightness,
  onColor,
  scaleChroma,
  TARGETS,
} from './theme-utils.mjs';

describe('theme-utils', () => {
  it('clamps values correctly', () => {
    assert.equal(clamp(5, 0, 10), 5);
    assert.equal(clamp(-1, 0, 10), 0);
    assert.equal(clamp(15, 0, 10), 10);
  });

  it('normalizes hue within [0, 360)', () => {
    assert.equal(hue(0), 0);
    assert.equal(hue(360), 0);
    assert.equal(hue(-30), 330);
    assert.equal(hue(390), 30);
  });

  it('parses and formats hex colors with and without alpha', () => {
    const white = parseHex('#ffffff');
    assert.equal(white.r, 1);
    assert.equal(white.g, 1);
    assert.equal(white.b, 1);
    assert.equal(white.alpha, null);

    const withAlpha = parseHex('#11223380');
    assert.equal(withAlpha.alpha, '80');

    assert.equal(toHex(1, 1, 1), '#ffffff');
    assert.equal(toHex(1, 1, 1, '80'), '#ffffff80');
  });

  it('converts between RGB and OKLCH reversibly', () => {
    const red = { r: 1, g: 0, b: 0 };
    const oklch = rgbToOklch(red.r, red.g, red.b);
    assert.ok(oklch.l > 0 && oklch.c > 0);
    const back = oklchToRgb(oklch);
    assert.ok(Math.abs(back.r - red.r) < 0.01);
    assert.ok(Math.abs(back.g - red.g) < 0.01);
    assert.ok(Math.abs(back.b - red.b) < 0.01);
  });

  it('harmonizes colors towards target lightness and chroma', () => {
    const result = harmonize('#e06c75', TARGETS.dark);
    assert.ok(result.hex.startsWith('#'));
    assert.equal(result.out.l, TARGETS.dark.l);
    assert.equal(result.out.c, TARGETS.dark.c);
  });

  it('adjusts lightness and calculates readable text on solid fills', () => {
    const light = atLightness('#333333', 0.9);
    assert.ok(light.startsWith('#'));
    assert.equal(onColor('#ffffff'), '#000000');
    assert.equal(onColor('#000000'), '#ffffff');
  });

  it('scales chroma for syntax boost', () => {
    const boosted = scaleChroma('#88aa99', 1.5);
    assert.ok(boosted.hex.startsWith('#'));
  });
});
