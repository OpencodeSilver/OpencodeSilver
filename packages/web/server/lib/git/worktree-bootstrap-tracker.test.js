import { describe, it, beforeEach } from 'vitest';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import {
  worktreeBootstrapState,
  activeWorktreeBootstrapTasks,
  WORKTREE_BOOTSTRAP_PENDING,
  WORKTREE_BOOTSTRAP_READY,
  WORKTREE_BOOTSTRAP_FAILED,
  WORKTREE_BOOTSTRAP_PHASE_DIRECTORY_CREATED,
  WORKTREE_BOOTSTRAP_PHASE_GIT_READY,
  normalizeDirectoryPath,
  canonicalPath,
  toBootstrapStateKey,
  createWorktreeBootstrapState,
  setWorktreeBootstrapState,
  clearWorktreeBootstrapState,
  trackWorktreeBootstrapTask,
  hasActiveWorktreeBootstrap,
  waitForActiveWorktreeBootstrap,
} from './worktree-bootstrap-tracker.js';

describe('worktree-bootstrap-tracker', () => {
  beforeEach(() => {
    worktreeBootstrapState.clear();
    activeWorktreeBootstrapTasks.clear();
  });

  it('normalizes directory paths including home directory tilde expansion', () => {
    assert.equal(normalizeDirectoryPath(''), '');
    assert.equal(normalizeDirectoryPath('~'), os.homedir());
    assert.equal(normalizeDirectoryPath('~/project'), path.join(os.homedir(), 'project'));
    assert.equal(normalizeDirectoryPath('/some/path'), '/some/path');
  });

  it('generates canonical path keys reliably', async () => {
    const key = await canonicalPath(process.cwd());
    assert.ok(typeof key === 'string' && key.length > 0);
  });

  it('creates and updates worktree bootstrap states in-memory', async () => {
    const dir = path.join(os.tmpdir(), 'test-wt-' + Date.now());
    const state = await setWorktreeBootstrapState(
      dir,
      WORKTREE_BOOTSTRAP_PENDING,
      WORKTREE_BOOTSTRAP_PHASE_DIRECTORY_CREATED,
    );
    assert.equal(state.status, WORKTREE_BOOTSTRAP_PENDING);
    assert.equal(state.phase, WORKTREE_BOOTSTRAP_PHASE_DIRECTORY_CREATED);

    const hasState = worktreeBootstrapState.size;
    assert.equal(hasState, 1);

    await clearWorktreeBootstrapState(dir);
    assert.equal(worktreeBootstrapState.size, 0);
  });

  it('tracks active bootstrap tasks and detects active tasks correctly', async () => {
    const dir = path.join(os.tmpdir(), 'test-task-' + Date.now());
    let resolveTask;
    const taskPromise = new Promise((resolve) => {
      resolveTask = resolve;
    });

    trackWorktreeBootstrapTask(dir, taskPromise);
    assert.equal(await hasActiveWorktreeBootstrap(dir), true);

    resolveTask();
    await taskPromise;
    // Allow microtask drain
    await new Promise((r) => setImmediate(r));
    assert.equal(await hasActiveWorktreeBootstrap(dir), false);
  });
});
