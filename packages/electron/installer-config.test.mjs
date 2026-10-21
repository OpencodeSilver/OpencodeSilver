import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('Electron NSIS configuration enables wizard installer (Next, Next, Finish)', () => {
  const pkgPath = path.resolve(__dirname, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  assert.equal(pkg.build?.nsis?.oneClick, false, 'oneClick must be false for assisted wizard installation');
  assert.equal(pkg.build?.nsis?.allowToChangeInstallationDirectory, true, 'allowToChangeInstallationDirectory must be true');
  assert.equal(pkg.build?.nsis?.runAfterFinish, true, 'runAfterFinish must be true to launch on Finish');
  assert.equal(pkg.build?.nsis?.createDesktopShortcut, 'always', 'createDesktopShortcut must be always');
  assert.equal(pkg.build?.nsis?.createStartMenuShortcut, true, 'createStartMenuShortcut must be true');
  assert.equal(pkg.build?.nsis?.include, 'resources/installer.nsh', 'custom installer hook script must be included');
});

test('installer.nsh terminates all OpencodeSilver and opencode processes and cleans old files', () => {
  const nshPath = path.resolve(__dirname, 'resources/installer.nsh');
  const nsh = fs.readFileSync(nshPath, 'utf8');

  // Must terminate opencodesilver and opencode
  assert.match(nsh, /taskkill.*opencodesilver\.exe/i);
  assert.match(nsh, /taskkill.*opencode\.exe/i);

  // Must include clean old installation macro
  assert.match(nsh, /!macro _ocsCleanOldInstallation/);
  assert.match(nsh, /Delete "\$INSTDIR\\opencodesilver\.exe"/);
  assert.match(nsh, /RMDir \/r "\$INSTDIR\\resources"/);

  // Must include customCheckAppRunning
  assert.match(nsh, /!macro customCheckAppRunning/);
});
