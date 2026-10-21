import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { resolveReleaseAssetPath } from './upload-release.mjs';
import { resolveAppFontEffectsFiles, patchThemeNamesInFiles } from './update-theme-names.mjs';
import { resolveBundleChunkFiles, patchTitlesInBundle } from './update-title-in-bundle.mjs';

test('resolveReleaseAssetPath uses package.json version and detects release binaries', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const res = resolveReleaseAssetPath();
  assert.equal(res.version, pkg.version);
  assert.ok(!res.fileName.includes('2.4.0'), 'Must not hardcode version 2.4.0');
  assert.equal(res.fileName, `OpencodeSilver-${pkg.version}-win-x64.exe`);
});

test('resolveAppFontEffectsFiles dynamically detects chunks with arbitrary hashes', () => {
  const tmpDir = path.join(os.tmpdir(), `theme_test_${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    const randomHashChunk = 'useAppFontEffects-random99XyZ.js';
    const filePath = path.join(tmpDir, randomHashChunk);
    fs.writeFileSync(filePath, 'id:"opencodesilver-dark",name:"OpencodeSilver"', 'utf8');

    const detected = resolveAppFontEffectsFiles([tmpDir]);
    assert.equal(detected.length, 1);
    assert.equal(detected[0], filePath);

    const patched = patchThemeNamesInFiles([filePath]);
    assert.equal(typeof patched, 'number');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('resolveBundleChunkFiles dynamically detects chunks and replaces bundle title', () => {
  const tmpDir = path.join(os.tmpdir(), `title_test_${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    const randomHashChunk = 'useAppFontEffects-abc12345.js';
    const filePath = path.join(tmpDir, randomHashChunk);
    fs.writeFileSync(filePath, 'var test = 1; FXe="OpencodeSilver";', 'utf8');

    const detected = resolveBundleChunkFiles([tmpDir]);
    assert.equal(detected.length, 1);
    assert.equal(detected[0], filePath);

    const patched = patchTitlesInBundle([filePath]);
    assert.equal(patched, 1);

    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('FXe="opencodesilver"'));
    assert.ok(!content.includes('FXe="OpencodeSilver"'));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
