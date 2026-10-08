import { describe, expect, test } from 'bun:test';

import {
  compareOpencodeSilverVersions,
  hostMeetsOpencodeSilverEngine,
  opencodeSilverEngineMinimum,
  parseOpencodeSilverVersion,
} from './host-version.ts';

describe('opencodeSilver host version', () => {
  test('parses core semver', () => {
    expect(parseOpencodeSilverVersion('1.22.0')).toEqual({ major: 1, minor: 22, patch: 0 });
    expect(parseOpencodeSilverVersion('v1.22.0-beta.1')).toEqual({ major: 1, minor: 22, patch: 0 });
    expect(parseOpencodeSilverVersion('junk')).toBeNull();
  });

  test('compares versions', () => {
    expect(compareOpencodeSilverVersions('1.22.0', '1.21.9')).toBeGreaterThan(0);
    expect(compareOpencodeSilverVersions('1.22.0', '1.22.0')).toBe(0);
    expect(compareOpencodeSilverVersions('1.21.0', '1.22.0')).toBeLessThan(0);
  });

  test('normalizes engines.opencodesilver floors', () => {
    expect(opencodeSilverEngineMinimum('1.22.0')).toBe('1.22.0');
    expect(opencodeSilverEngineMinimum('>=1.22.0')).toBe('1.22.0');
    expect(opencodeSilverEngineMinimum('^1.22.0')).toBeNull();
  });

  test('checks host against engines.opencodesilver', () => {
    expect(hostMeetsOpencodeSilverEngine('1.22.0', '>=1.22.0')).toBe(true);
    expect(hostMeetsOpencodeSilverEngine('1.22.0', '1.22.0')).toBe(true);
    expect(hostMeetsOpencodeSilverEngine('1.21.9', '>=1.22.0')).toBe(false);
    expect(hostMeetsOpencodeSilverEngine('unknown', '>=1.22.0')).toBe(false);
  });
});
