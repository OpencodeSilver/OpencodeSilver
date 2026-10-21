#!/usr/bin/env bun
// Rebuilds every checked-in SDK example bundle whose artifact no longer matches
// its source (the same check scripts/examples.test.ts performs), leaving
// already-matching bundles untouched.
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import path from 'node:path';

const examples = new URL('../examples/', import.meta.url);
const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const bundler = fileURLToPath(new URL('./bundle-guest.ts', import.meta.url));

const entries: Array<[string, boolean]> = [
  ['hello-kit/panel/main', false],
  ['hello-kit/background/main', false],
  ['github-token/panel/main', false],
  ['config-editor/panel/main', false],
  ['service-echo/panel/main', false],
  ['service-echo/service/main', true],
  ['browser-provider-stub/service/main', true],
  ['browser-provider-stub/panel/main', false],
  ['tools-only/mcp', true],
  ['tasks-demo/panel/main', false],
  ['tasks-demo/panel/attach', false],
  ['tasks-demo/panel/page', false],
  ['git-graph-status/status/main', false],
  ['git-graph-status/service/main', true],
  ['checklist-editor/editor/main', false],
];

const normalize = (source: string) => source.replace(/^\/\/ (?:packages\/sdk\/)?examples\//gm, '// examples/');

let stale = 0;
const temporary = await mkdtemp(path.join(tmpdir(), 'oc-example-rebuild-'));
try {
for (const [entry, node] of entries) {
  const outFile = path.join(temporary, 'bundle.js');
  const result = spawnSync('bun', [bundler, ...(node ? ['--node'] : []), fileURLToPath(new URL(`${entry}.ts`, examples)), outFile], {
    cwd: repoRoot, env: { ...process.env }, encoding: 'utf8',
  });
  if (result.status !== 0) {
    console.error(`BUILD FAILED ${entry}: ${result.stderr}`);
    process.exit(1);
  }
  const built = normalize(await readFile(outFile, 'utf8'));
  const checkedIn = normalize(await readFile(new URL(`${entry}.js`, examples), 'utf8'));
  if (Bun.hash(built) === Bun.hash(checkedIn)) {
    console.log(`ok      ${entry}`);
  } else {
    await writeFile(new URL(`${entry}.js`, examples), built);
    console.log(`rebuilt ${entry}`);
    stale += 1;
  }
}
} finally {
  await rm(temporary, { recursive: true, force: true });
}
console.log(`${stale} bundle(s) rebuilt out of ${entries.length}`);
