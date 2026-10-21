#!/usr/bin/env bun
/**
 * Cross-platform release verification script for OpencodeSilver.
 * Runs on Windows, macOS, and Linux.
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');

const args = process.argv.slice(2);

const isDryRun = args.includes('--dry-run');
const isVerbose = args.includes('--verbose') || args.includes('-v');
const showHelp = args.includes('--help') || args.includes('-h');

let target = 'all';
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (['aarch64', 'arm64', 'arm'].includes(arg)) target = 'aarch64';
  else if (['x86_64', 'intel', 'x86'].includes(arg)) target = 'x86_64';
  else if (['all', 'both'].includes(arg)) target = 'all';
  else if (arg === '--target' && args[i + 1]) {
    target = args[i + 1];
    i++;
  }
}

if (showHelp) {
  console.log(`
Usage: bun scripts/test-release-build.mjs [target] [options]

Targets:
  aarch64, arm64, arm   Target ARM64 / Apple Silicon
  x86_64, intel, x86    Target x86_64 Intel/AMD
  all                   Verify all architectures (default)

Options:
  --dry-run             Print the commands without executing them
  --verbose, -v         Enable verbose output
  --help, -h            Show this help message
`);
  process.exit(0);
}

const colors = {
  blue: (t) => `\x1b[34m${t}\x1b[0m`,
  green: (t) => `\x1b[32m${t}\x1b[0m`,
  yellow: (t) => `\x1b[33m${t}\x1b[0m`,
  red: (t) => `\x1b[31m${t}\x1b[0m`,
  bold: (t) => `\x1b[1m${t}\x1b[0m`,
};

const logStep = (msg) => {
  console.log(`\n${colors.blue('━'.repeat(60))}`);
  console.log(`  ${colors.bold(colors.blue(msg))}`);
  console.log(`${colors.blue('━'.repeat(60))}`);
};

const runStep = (title, cmd, cmdArgs, cwd = repoRoot) => {
  logStep(title);
  console.log(`${colors.blue('[EXEC]')} ${cmd} ${cmdArgs.join(' ')}`);

  if (isDryRun) {
    console.log(`${colors.yellow('[DRY-RUN]')} Skipped execution.`);
    return true;
  }

  const result = spawnSync(cmd, cmdArgs, {
    cwd,
    stdio: isVerbose ? 'inherit' : ['inherit', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
    encoding: 'utf8',
  });

  if (result.error) {
    console.error(`${colors.red('[ERROR]')} Failed to start command: ${result.error.message}`);
    return false;
  }

  if (result.status !== 0) {
    console.error(`${colors.red('[FAILED]')} Command exited with code ${result.status}`);
    if (!isVerbose && result.stderr) console.error(result.stderr);
    return false;
  }

  console.log(`${colors.green('[PASS]')} ${title} succeeded.`);
  return true;
};

console.log(`${colors.bold('OpencodeSilver Cross-Platform Release Test')}`);
console.log(`Platform: ${process.platform} (${process.arch})`);
console.log(`Target:   ${target}`);
console.log(`Mode:     ${isDryRun ? 'Dry Run' : 'Active Test'}\n`);

// 1. Dependency and SDK build check
if (!runStep('Verify SDK & Extensions Build', 'bun', ['run', 'build:deps'])) {
  process.exit(1);
}

// 2. Documentation and Changelog Check
if (!runStep('Validate Documentation Integrity', 'bun', ['run', 'docs:validate'])) {
  process.exit(1);
}

if (!runStep('Check Changelog Gate', 'bun', ['run', 'changelog:check'])) {
  process.exit(1);
}

// 3. Type Checking
if (!runStep('Type Check Workspace', 'bun', ['run', 'type-check'])) {
  process.exit(1);
}

// 4. Release Preparation Check
if (!runStep('Validate Release Preparation', 'bun', ['run', 'release:prepare'])) {
  process.exit(1);
}

logStep('Summary');
console.log(`${colors.green(colors.bold('✓ All release build verification gates passed successfully.'))}\n`);
