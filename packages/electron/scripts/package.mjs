import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { resolveTargetArchitecture } from './target-architecture.mjs';

const env = { ...process.env };
const builderArgs = process.argv.slice(2);
const targetArchitecture = resolveTargetArchitecture({ environment: env, builderArgs });

if ((process.platform === 'win32' || process.platform === 'darwin') && !env.CSC_LINK && !env.WINDOWS_CSC_LINK) {
  env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';
  console.log(`[electron] ${process.platform} code signing disabled; building unsigned package.`);
}

if (process.platform === 'win32' && !env.ELECTRON_BUILDER_RCEDIT_PATH) {
  const rceditDir = path.resolve('scripts/bin');
  if (fs.existsSync(rceditDir)) {
    env.ELECTRON_BUILDER_RCEDIT_PATH = rceditDir;
    console.log(`[electron] Using local RCEdit path: ${rceditDir}`);
  }
}

const bunBinaryCandidates = [
  process.env.npm_execpath,
  process.env.BUN_INSTALL ? path.join(process.env.BUN_INSTALL, 'bin', process.platform === 'win32' ? 'bun.exe' : 'bun') : null,
  process.platform === 'win32' ? 'bun.exe' : 'bun',
].filter(Boolean);

const bunBinary = bunBinaryCandidates.find((candidate) => {
  if (path.basename(candidate).toLowerCase().startsWith('bun')) {
    return candidate === 'bun' || candidate === 'bun.exe' || fs.existsSync(candidate);
  }
  return false;
}) || (process.platform === 'win32' ? 'bun.exe' : 'bun');

if ((process.platform === 'linux' || process.platform === 'darwin') && !builderArgs.some((argument) => (
  argument === '--x64' || argument === '--arm64' || argument === '--arch' || argument.startsWith('--arch=')
))) {
  builderArgs.push(`--${targetArchitecture.electronBuilder}`);
}

// Never publish from the `package` script: update metadata (latest.yml, blockmap)
// is still generated here, but uploading is done by the release pipeline
// (softprops/action-gh-release) so there is exactly one publisher.
if (!builderArgs.some((argument) => argument === '--publish' || argument.startsWith('--publish='))) {
  builderArgs.push('--publish', 'never');
}

const child = spawn(bunBinary, ['x', 'electron-builder', ...builderArgs], {
  env,
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

child.on('error', (error) => {
  console.error('[electron] failed to start electron-builder:', error);
  process.exit(1);
});
