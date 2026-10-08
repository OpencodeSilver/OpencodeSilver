import { describe, expect, test } from 'bun:test';

// The old-brand key is load-bearing: it is the only handle on a persisted blob
// that the current version deliberately no longer writes but must still clear.
// A rename sweeping this identifier to the new brand silently disables the
// cleanup, so the key is pinned here by value rather than asserted incidentally
// through the module's behaviour.
const LEGACY_PERSISTED_KEY = 'openchamber.mobile.connectLog.v1';

const createLocalStorageStub = (onRemove?: () => void) => {
  const store = new Map<string, string>();
  return {
    store,
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { onRemove?.(); store.delete(key); },
  };
};

type LocalStorageStub = ReturnType<typeof createLocalStorageStub>;

const loadModuleFresh = async (storage: LocalStorageStub | { removeItem: (key: string) => void }) => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage: storage },
  });
  // The module clears the legacy key at import time, so each case needs a
  // freshly evaluated copy.
  await import(`./mobileConnectionDebug.ts?case=${Math.random()}`);
};

describe('mobileConnectionDebug legacy cleanup', () => {
  test('removes the persisted trail left by versions that wrote it', async () => {
    const storage = createLocalStorageStub();
    storage.setItem(LEGACY_PERSISTED_KEY, JSON.stringify([{ at: 1, step: 'old', detail: '{}' }]));

    await loadModuleFresh(storage);

    expect(storage.getItem(LEGACY_PERSISTED_KEY)).toBeNull();
  });

  test('leaves unrelated storage alone', async () => {
    const storage = createLocalStorageStub();
    storage.setItem('opencodesilver.mobile.connections.v1', 'keep-me');

    await loadModuleFresh(storage);

    expect(storage.getItem('opencodesilver.mobile.connections.v1')).toBe('keep-me');
  });

  test('still loads when storage denies access', async () => {
    // Importing must not reject: this module runs on app boot, so a throw over a
    // debug-only cleanup would take the whole surface down.
    const storage = createLocalStorageStub(() => { throw new Error('storage denied'); });

    await loadModuleFresh(storage);

    expect(true).toBe(true);
  });
});