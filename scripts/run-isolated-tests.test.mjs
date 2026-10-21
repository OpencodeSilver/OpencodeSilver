import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const runnerScript = path.join(here, 'run-isolated-tests.mjs');
const scriptContent = readFileSync(runnerScript, 'utf8');

test('run-isolated-tests includes vitest detection branch', () => {
  assert.match(scriptContent, /['"]vitest['"]/);
  assert.match(scriptContent, /label:\s*['"]vitest['"]/);
});

test('run-isolated-tests uses taskkill on Windows for reliable termination', () => {
  assert.match(scriptContent, /taskkill/);
  assert.match(scriptContent, /\/pid/);
  assert.match(scriptContent, /\/T/);
  assert.match(scriptContent, /\/F/);
});

test('run-isolated-tests preserves both head and tail of process output', () => {
  assert.match(scriptContent, /OUTPUT_HEAD_BYTES/);
  assert.match(scriptContent, /OUTPUT_TAIL_BYTES/);
  assert.match(scriptContent, /intermediate output dropped/);
});
