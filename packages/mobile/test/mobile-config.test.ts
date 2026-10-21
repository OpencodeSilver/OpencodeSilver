import { describe, expect, test } from 'bun:test';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import capacitorConfig from '../capacitor.config';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(currentDir, '..');

describe('@opencodesilver/mobile configuration & scripts', () => {
  test('capacitor config matches required mobile specification', () => {
    expect(capacitorConfig.appId).toBe('com.opencodesilver.app');
    expect(capacitorConfig.appName).toBe('OpencodeSilver');
    expect(capacitorConfig.webDir).toBe('dist');
    expect(capacitorConfig.android?.allowMixedContent).toBe(true);
    expect(capacitorConfig.plugins?.Keyboard?.resize).toBe('none');
    expect(capacitorConfig.plugins?.StatusBar?.overlaysWebView).toBe(true);
  });

  test('package.json contains all required lifecycle and mobile platform scripts', () => {
    const pkgPath = path.join(mobileRoot, 'package.json');
    expect(existsSync(pkgPath)).toBe(true);

    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    expect(pkg.name).toBe('@opencodesilver/mobile');
    expect(pkg.scripts).toBeDefined();
    expect(pkg.scripts.test).toBeDefined();
    expect(pkg.scripts.build).toBeDefined();
    expect(pkg.scripts['build:assets']).toBeDefined();
    expect(pkg.scripts.sync).toBeDefined();
    expect(pkg.scripts['build:android:debug']).toBeDefined();
    expect(pkg.scripts['build:ios:simulator']).toBeDefined();
    expect(pkg.scripts['type-check']).toBeDefined();
    expect(pkg.scripts.lint).toBeDefined();
  });

  test('all helper mobile scripts exist on disk', () => {
    const scriptsDir = path.join(mobileRoot, 'scripts');
    const requiredScripts = [
      'android-device.mjs',
      'ios-sim-build.mjs',
      'ios-sim-dev.mjs',
      'ios-sim.mjs',
      'prepare-web-assets.mjs',
      'with-mobile-env.mjs',
    ];

    for (const scriptName of requiredScripts) {
      const scriptPath = path.join(scriptsDir, scriptName);
      expect(existsSync(scriptPath)).toBe(true);
    }
  });

  test('with-mobile-env executes subcommands with proper fallback environment', () => {
    const scriptPath = path.join(mobileRoot, 'scripts', 'with-mobile-env.mjs');
    const result = execSync(`node "${scriptPath}" "node -e \\"console.log(process.env.DEVELOPER_DIR ? 'has-dev-dir' : 'none')\\""`, {
      encoding: 'utf8',
    });
    expect(result.trim()).toBe('has-dev-dir');
  });
});
