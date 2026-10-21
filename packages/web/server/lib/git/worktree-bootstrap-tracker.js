import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const fsp = fs.promises;

export const worktreeBootstrapState = new Map();
export const activeWorktreeBootstrapTasks = new Map();

export const WORKTREE_BOOTSTRAP_PENDING = 'pending';
export const WORKTREE_BOOTSTRAP_READY = 'ready';
export const WORKTREE_BOOTSTRAP_FAILED = 'failed';
export const WORKTREE_BOOTSTRAP_PHASE_DIRECTORY_CREATED = 'directory-created';
export const WORKTREE_BOOTSTRAP_PHASE_GIT_READY = 'git-ready';
export const WORKTREE_BOOTSTRAP_PHASE_SETUP_READY = 'setup-ready';
export const WORKTREE_BOOTSTRAP_RECOVERY_ERROR =
  'Worktree bootstrap completion is unknown. Inspect the checkout and repair setup before use.';

export const normalizeDirectoryPath = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }

  if (trimmed === '~') {
    return os.homedir();
  }

  if (trimmed.startsWith('~/') || trimmed.startsWith('~\\')) {
    return path.join(os.homedir(), trimmed.slice(2));
  }

  return trimmed;
};

export const canonicalPath = async (input) => {
  const absolutePath = path.resolve(input);
  const realPath = await fsp.realpath(absolutePath).catch(() => absolutePath);
  const normalized = path.normalize(realPath);
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
};

export const toBootstrapStateKey = (directory) => {
  const normalized = normalizeDirectoryPath(directory);
  if (!normalized) {
    return '';
  }
  return path.resolve(normalized);
};

export const toCanonicalBootstrapStateKey = async (directory) => {
  const key = toBootstrapStateKey(directory);
  if (!key) {
    return '';
  }
  return canonicalPath(key);
};

export const createWorktreeBootstrapState = (status, phase, error = null, hydration, errorCode) => {
  const safeError = typeof error === 'string'
    ? error.trim().replace(/[\0\r\n]+/g, ' ').replace(/\s+/g, ' ').slice(0, 4096)
    : '';
  const state = {
    status,
    phase,
    error: safeError || null,
    updatedAt: Date.now(),
  };
  if (hydration) state.hydration = hydration;
  if (errorCode) state.errorCode = errorCode;
  return state;
};

export const setWorktreeBootstrapState = async (
  directory,
  status,
  phase,
  error = null,
  hydration,
  errorCode,
  bootstrapStore,
) => {
  const key = await toCanonicalBootstrapStateKey(directory);
  if (!key) {
    return null;
  }
  let state = createWorktreeBootstrapState(status, phase, error, hydration, errorCode);
  worktreeBootstrapState.set(key, state);
  if (bootstrapStore) {
    try {
      state = await bootstrapStore.write(key, state);
      worktreeBootstrapState.set(key, state);
    } catch (cause) {
      const blocker = createWorktreeBootstrapState(
        WORKTREE_BOOTSTRAP_FAILED,
        phase === WORKTREE_BOOTSTRAP_PHASE_SETUP_READY ? WORKTREE_BOOTSTRAP_PHASE_GIT_READY : phase,
        WORKTREE_BOOTSTRAP_RECOVERY_ERROR,
        undefined,
        'UNKNOWN',
      );
      worktreeBootstrapState.set(key, blocker);
      throw Object.assign(new Error(WORKTREE_BOOTSTRAP_RECOVERY_ERROR, { cause }), {
        code: 'WORKTREE_BOOTSTRAP_PERSISTENCE_FAILED',
        bootstrapStatus: blocker,
      });
    }
  }
  return state;
};

export const clearWorktreeBootstrapState = async (directory, bootstrapStore) => {
  const key = await toCanonicalBootstrapStateKey(directory);
  if (!key) {
    return;
  }
  if (bootstrapStore) await bootstrapStore.remove(key);
  worktreeBootstrapState.delete(key);
};

export const trackWorktreeBootstrapTask = (directory, task) => {
  const key = toBootstrapStateKey(directory);
  if (!key) {
    return task;
  }

  let tasks = activeWorktreeBootstrapTasks.get(key);
  if (!tasks) {
    tasks = new Set();
    activeWorktreeBootstrapTasks.set(key, tasks);
  }
  tasks.add(task);
  const clearTask = () => {
    tasks.delete(task);
    if (tasks.size === 0 && activeWorktreeBootstrapTasks.get(key) === tasks) {
      activeWorktreeBootstrapTasks.delete(key);
    }
  };
  void task.then(clearTask, clearTask);
  return task;
};

export const waitForActiveWorktreeBootstrap = async (directory) => {
  const key = toBootstrapStateKey(directory);
  if (!key) {
    return;
  }

  while (true) {
    let tasks = activeWorktreeBootstrapTasks.get(key);
    if (!tasks) {
      const targetCanonical = await canonicalPath(key);
      for (const [trackedKey, trackedTasks] of activeWorktreeBootstrapTasks) {
        if (await canonicalPath(trackedKey) === targetCanonical) {
          tasks = trackedTasks;
          break;
        }
      }
    }
    if (!tasks) {
      return;
    }
    await Promise.allSettled([...tasks]);
  }
};

export const hasActiveWorktreeBootstrap = async (directory) => {
  const key = toBootstrapStateKey(directory);
  if (!key) {
    return false;
  }
  if (activeWorktreeBootstrapTasks.has(key)) {
    return true;
  }
  const canonicalKey = await toCanonicalBootstrapStateKey(key);
  for (const trackedKey of activeWorktreeBootstrapTasks.keys()) {
    if (await toCanonicalBootstrapStateKey(trackedKey) === canonicalKey) {
      return true;
    }
  }
  return false;
};
