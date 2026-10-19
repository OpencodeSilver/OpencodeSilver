#!/usr/bin/env node
/**
 * Fast everyday launch: serve the production build (a handful of bundled
 * files) instead of the HMR dev server (thousands of on-demand modules).
 * Rebuilds the UI only when its sources are newer than the last build.
 *
 *   bun run app            build if needed, then serve on http://127.0.0.1:3000
 *   bun run app --rebuild  always rebuild first
 *   bun run app --port 4000
 */
import { spawnSync, spawn } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveBunExecutable } from './lib/bun-executable.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const webRoot = path.join(repoRoot, 'packages/web');
const builtIndex = path.join(webRoot, 'dist/index.html');
const sourceRoots = [path.join(repoRoot, 'packages/ui/src'), path.join(webRoot, 'src'), path.join(webRoot, 'index.html')];
const bun = resolveBunExecutable();

const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const port = portIndex >= 0 && args[portIndex + 1] ? args[portIndex + 1] : '3000';

/** Newest modification time under a file or folder (skipping tests). */
function newestMtime(target) {
  if (!existsSync(target)) return 0;
  const stat = statSync(target);
  if (!stat.isDirectory()) return stat.mtimeMs;
  let newest = 0;
  for (const entry of readdirSync(target, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '__tests__' || /\.test\.[jt]sx?$/.test(entry.name)) continue;
    newest = Math.max(newest, newestMtime(path.join(target, entry.name)));
  }
  return newest;
}

const builtAt = existsSync(builtIndex) ? statSync(builtIndex).mtimeMs : 0;
const sourcesAt = Math.max(...sourceRoots.map(newestMtime));
const needsBuild = args.includes('--rebuild') || builtAt === 0 || sourcesAt > builtAt;

if (needsBuild) {
  console.log('[app] Building the UI (only needed after code changes)…');
  const build = spawnSync(bun, ['run', '--cwd', 'packages/web', 'build'], { cwd: repoRoot, stdio: 'inherit' });
  if (build.status !== 0) {
    console.error('[app] Build failed.');
    process.exit(build.status ?? 1);
  }
} else {
  console.log('[app] UI build is up to date.');
}

console.log(`[app] Open http://127.0.0.1:${port}`);
const server = spawn(process.execPath, [path.join(webRoot, 'bin/cli.js'), 'serve', '--foreground', '--port', port], {
  cwd: webRoot,
  stdio: 'inherit',
  env: { ...process.env, OPENCODESILVER_RELAY_HOST: process.env.OPENCODESILVER_RELAY_HOST || 'off' },
});
server.on('exit', (code) => process.exit(code ?? 0));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.kill(signal));
