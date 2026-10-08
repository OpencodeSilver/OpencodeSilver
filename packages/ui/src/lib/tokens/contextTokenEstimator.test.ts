import { describe, expect, test } from 'bun:test';
import {
  estimateTokenCount,
  formatTokenDisplay,
  evaluateContextSaturation,
} from './contextTokenEstimator';

describe('contextTokenEstimator', () => {
  test('estimates tokens correctly for standard English code and text', () => {
    const text = 'function helloWorld() { console.log("Hello, world!"); }';
    const tokens = estimateTokenCount(text);
    expect(tokens).toBeGreaterThan(10);
    expect(tokens).toBeLessThan(30);
  });

  test('adjusts token density for non-latin / Arabic text', () => {
    const arabicText = 'مرحبا بك في مشروع أوبن كود سيلفر الرائع لتطوير البرمجيات بالذكاء الاصطناعي';
    const tokens = estimateTokenCount(arabicText);
    expect(tokens).toBeGreaterThan(25);
  });

  test('formats token count numbers accurately', () => {
    expect(formatTokenDisplay(500)).toBe('500');
    expect(formatTokenDisplay(1250)).toBe('1.3k');
    expect(formatTokenDisplay(45000)).toBe('45k');
    expect(formatTokenDisplay(1500000)).toBe('1.50M');
  });

  test('evaluates context saturation states', () => {
    const optimal = evaluateContextSaturation(20_000, 128_000);
    expect(optimal.status).toBe('optimal');
    expect(optimal.percentageUsed).toBe(16);

    const moderate = evaluateContextSaturation(80_000, 128_000);
    expect(moderate.status).toBe('moderate');
    expect(moderate.percentageUsed).toBe(63);

    const nearLimit = evaluateContextSaturation(115_000, 128_000);
    expect(nearLimit.status).toBe('near-limit');
    expect(nearLimit.percentageUsed).toBe(90);

    const exceeded = evaluateContextSaturation(135_000, 128_000);
    expect(exceeded.status).toBe('exceeded');
    expect(exceeded.percentageUsed).toBe(100);
  });
});
