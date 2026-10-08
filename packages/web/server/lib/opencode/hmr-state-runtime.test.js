import { describe, expect, it } from 'vitest';

import { createHmrStateRuntime } from './hmr-state-runtime.js';

const createRuntime = (env = {}) => createHmrStateRuntime({
  globalThisLike: {},
  os: { homedir: () => '/Users/example' },
  processLike: { env },
  stateKey: '__testHmrState',
});

describe('hmr state runtime', () => {
  it('uses configured OpenCode cwd when provided', () => {
    const runtime = createRuntime({ OPENCODESILVER_OPENCODE_CWD: '/tmp/opencodesilver-data' });

    expect(runtime.getOrCreateHmrState().openCodeWorkingDirectory).toBe('/tmp/opencodesilver-data');
  });

  it('falls back to home directory without configured OpenCode cwd', () => {
    const runtime = createRuntime();

    expect(runtime.getOrCreateHmrState().openCodeWorkingDirectory).toBe('/Users/example');
  });
});
