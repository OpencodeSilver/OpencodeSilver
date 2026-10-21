import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import yaml from 'yaml';

const workflowPath = fileURLToPath(new URL('../.github/workflows/build-all.yml', import.meta.url));
const workflow = yaml.parse(fs.readFileSync(workflowPath, 'utf8'));

test('release waits for every platform build before publishing', () => {
  const release = workflow.jobs.release;
  assert.ok(release, 'release job must exist');
  const needs = Array.isArray(release.needs) ? release.needs : [release.needs];
  for (const job of ['build-vscode', 'build-desktop', 'build-android']) {
    assert.ok(needs.includes(job), `release must depend on ${job}`);
  }
});

test('release only runs for version tags or an explicit dispatch', () => {
  const release = workflow.jobs.release;
  // The YAML parser unwraps ${{ }} around expressions.
  assert.equal(
    release.if,
    "startsWith(github.ref, 'refs/tags/v') || github.event.inputs.publish_release == 'true'",
  );
});

test('every build job builds the core engine before packaging', () => {
  for (const jobName of ['build-vscode', 'build-desktop', 'build-android']) {
    const job = workflow.jobs[jobName];
    assert.ok(job, `${jobName} job must exist`);
    const steps = job.steps || [];
    const buildsCore = steps.some((step) => String(step.run || '').includes('packages/core build'));
    assert.ok(buildsCore, `${jobName} must build packages/core before packaging`);
  }
});

test('desktop build verifies the core engine landed inside app.asar', () => {
  const steps = workflow.jobs['build-desktop'].steps || [];
  const verify = steps.find((step) => String(step.name || '').includes('Verify Core Engine'));
  assert.ok(verify, 'desktop build must verify @opencodesilver/core inside app.asar');
  assert.match(String(verify.run), /@opencodesilver\/core\/dist\/index\.js/);
});
