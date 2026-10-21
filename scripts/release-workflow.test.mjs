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

test('release workflow does not hardcode stale version numbers in release assets', () => {
  const content = fs.readFileSync(workflowPath, 'utf8');
  assert.doesNotMatch(content, /OpencodeSilver-3\.0\.0-android-debug\.apk/, 'APK name must not hardcode 3.0.0');
  assert.doesNotMatch(content, /OpencodeSilver-3\.0\.0-win-x64\.exe/, 'Release body must not hardcode 3.0.0');
});

test('android apk rename extracts version dynamically from package.json', () => {
  const steps = workflow.jobs['build-android'].steps || [];
  const renameStep = steps.find((step) => String(step.name || '').includes('Rename APK'));
  assert.ok(renameStep, 'build-android must have Rename APK step');
  assert.match(String(renameStep.run), /package\.json/, 'Must extract version from package.json');
  assert.match(String(renameStep.run), /\$\{VERSION\}/, 'Must use dynamic ${VERSION} in APK destination');
});

test('release job sets RELEASE_VERSION and uses it across binary names', () => {
  const steps = workflow.jobs.release.steps || [];
  const prepStep = steps.find((step) => String(step.name || '').includes('Prepare Release Assets'));
  assert.ok(prepStep, 'release must have Prepare Release Assets step');
  assert.match(String(prepStep.run), /RELEASE_VERSION/, 'Must set RELEASE_VERSION env var');

  const releaseStep = steps.find((step) => String(step.name || '').includes('Create GitHub Release'));
  assert.ok(releaseStep, 'release must have Create GitHub Release step');
  assert.match(String(releaseStep.with?.body || ''), /\$\{\{ env\.RELEASE_VERSION \}\}/, 'Release body must use env.RELEASE_VERSION');
});

test('release job generates SHA-256 checksums and SBOM for integrity verification', () => {
  const steps = workflow.jobs.release.steps || [];
  const prepStep = steps.find((step) => String(step.name || '').includes('Prepare Release Assets'));
  assert.ok(prepStep, 'release must have Prepare Release Assets step');
  assert.match(String(prepStep.run), /sha256sum \* > SHA256SUMS\.txt/, 'Must generate SHA256SUMS.txt');

  const sbomStep = steps.find((step) => String(step.name || '').includes('SBOM'));
  assert.ok(sbomStep, 'release must have SBOM generation step');
  assert.match(String(sbomStep.run), /@cyclonedx\/cyclonedx-npm/, 'Must generate CycloneDX SBOM');

  const releaseStep = steps.find((step) => String(step.name || '').includes('Create GitHub Release'));
  assert.match(String(releaseStep.with?.body || ''), /SHA256SUMS\.txt/, 'Release body must reference SHA256SUMS.txt');
  assert.match(String(releaseStep.with?.body || ''), /CODE_SIGNING\.md/, 'Release body must reference CODE_SIGNING.md');
});
